const express = require('express');
const path = require('path');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const { getPool, initDB } = require('./config/db');
const { upload } = require('./config/s3');
const { getRedis } = require('./config/redis');
const { sendOrderToQueue } = require('./config/sqs');

const app = express();
const port = process.env.PORT || 80;

// Trust proxy for ALB
app.set('trust proxy', true);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'adipurna-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 3600000 }
}));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize DB & Table
initDB();

// Health Check ALB/ELB
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  };
  try {
    await getPool().query('SELECT 1');
    health.services.database = 'up';
  } catch (e) {
    health.services.database = 'down';
    health.status = 'degraded';
  }
  try {
    const redis = getRedis();
    await redis.ping();
    health.services.redis = 'up';
  } catch (e) {
    health.services.redis = 'down';
    health.status = 'degraded';
  }
  health.services.s3 = process.env.S3_BUCKET_NAME ? 'configured' : 'not configured';
  health.services.sqs = process.env.SQS_QUEUE_URL ? 'configured' : 'not configured';
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// BUYER - CATALOG
app.get('/', async (req, res) => {
  try {
    const redis = getRedis();
    const cacheKey = 'products:all';
    const cached = await redis.get(cacheKey);
    if (cached) {
      const products = JSON.parse(cached);
      return res.render('index', { products, msg: req.query.msg || null });
    }
    const result = await getPool().query('SELECT * FROM products ORDER BY id DESC');
    await redis.setex(cacheKey, 300, JSON.stringify(result.rows));
    res.render('index', { products: result.rows, msg: req.query.msg || null });
  } catch (err) {
    console.error(err);
    try {
      const result = await getPool().query('SELECT * FROM products ORDER BY id DESC');
      res.render('index', { products: result.rows, msg: req.query.msg || null });
    } catch (e) {
      res.status(500).send('Failed to load catalog');
    }
  }
});

// Cart
app.get('/cart', (req, res) => {
  if (!req.session.cart) req.session.cart = [];
  res.render('cart', { cart: req.session.cart });
});

app.post('/cart/add/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await getPool().query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.redirect('/');
    if (!req.session.cart) req.session.cart = [];
    const existing = req.session.cart.find(item => item.id == id);
    if (existing) {
      existing.quantity += 1;
    } else {
      req.session.cart.push({ ...result.rows[0], quantity: 1 });
    }
    res.redirect('/cart');
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

app.post('/cart/remove/:id', (req, res) => {
  if (!req.session.cart) req.session.cart = [];
  req.session.cart = req.session.cart.filter(item => item.id != req.params.id);
  res.redirect('/cart');
});

app.get('/checkout', (req, res) => {
  if (!req.session.cart || req.session.cart.length === 0) return res.redirect('/cart');
  const total = req.session.cart.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
  res.render('checkout', { cart: req.session.cart, total });
});

app.post('/checkout', async (req, res) => {
  if (!req.session.cart || req.session.cart.length === 0) return res.redirect('/cart');
  const { customer_name, customer_email } = req.body;
  try {
    const total = req.session.cart.reduce((sum, item) => sum + (item.harga * item.quantity), 0);
    const orderResult = await getPool().query(
      'INSERT INTO orders (customer_name, customer_email, total_amount, status) VALUES ($1, $2, $3, $4) RETURNING id',
      [customer_name, customer_email, total, 'pending']
    );
    const orderId = orderResult.rows[0].id;
    for (const item of req.session.cart) {
      await getPool().query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [orderId, item.id, item.quantity, item.harga]
      );
      await getPool().query('UPDATE products SET stok = stok - $1 WHERE id = $2', [item.quantity, item.id]);
    }
    await sendOrderToQueue({ orderId, customer_name, customer_email, total, items: req.session.cart, timestamp: new Date().toISOString() });
    const redis = getRedis();
    await redis.del('products:all');
    req.session.cart = [];
    res.redirect('/?msg=Order placed successfully! Order ID: ' + orderId);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to process checkout');
  }
});

// BUYER - ORDER
app.post('/order/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const checkProduct = await getPool().query('SELECT stok FROM products WHERE id = $1', [id]);
    if (checkProduct.rows.length === 0) {
      return res.redirect('/?msg=Product not found');
    }

    const currentStock = checkProduct.rows[0].stok;
    if (currentStock <= 0) {
      return res.redirect('/?msg=Product stock is out');
    }

    await getPool().query('UPDATE products SET stok = stok - 1 WHERE id = $1', [id]);
    const redis = getRedis();
    await redis.del('products:all');
    res.redirect('/?msg=Purchase successful!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to process order');
  }
});

// ADMIN - READ
app.get('/admin', async (req, res) => {
  try {
    const result = await getPool().query('SELECT * FROM products ORDER BY id DESC');
    const orderCount = await getPool().query('SELECT COUNT(*) FROM orders');
    const revenue = await getPool().query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'cancelled'");
    res.render('admin', { products: result.rows, stats: { orders: orderCount.rows[0].count, revenue: revenue.rows[0].total } });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load admin page');
  }
});

app.get('/admin/orders', async (req, res) => {
  try {
    const result = await getPool().query('SELECT * FROM orders ORDER BY created_at DESC');
    res.render('admin_orders', { orders: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load orders');
  }
});

// ADMIN - CREATE
app.post('/admin/products', upload.single('foto'), async (req, res) => {
  const { nama_produk, harga, stok } = req.body;
  const foto_url = req.file ? (req.file.location || req.file.url || null) : null;

  try {
    await getPool().query(
      'INSERT INTO products (nama_produk, harga, stok, foto_url) VALUES ($1, $2, $3, $4)',
      [nama_produk, harga, stok, foto_url]
    );
    const redis = getRedis();
    await redis.del('products:all');
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to save product');
  }
});

// ADMIN - UPDATE
app.post('/admin/products/update/:id', upload.single('foto'), async (req, res) => {
  const { id } = req.params;
  const { nama_produk, harga, stok } = req.body;

  try {
    if (req.file) {
      const foto_url = req.file.location || req.file.url;
      await getPool().query(
        'UPDATE products SET nama_produk = $1, harga = $2, stok = $3, foto_url = $4 WHERE id = $5',
        [nama_produk, harga, stok, foto_url, id]
      );
    } else {
      await getPool().query(
        'UPDATE products SET nama_produk = $1, harga = $2, stok = $3 WHERE id = $4',
        [nama_produk, harga, stok, id]
      );
    }
    const redis = getRedis();
    await redis.del('products:all');
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to update product');
  }
});

// ADMIN - DELETE
app.post('/admin/products/delete/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await getPool().query('DELETE FROM products WHERE id = $1', [id]);
    const redis = getRedis();
    await redis.del('products:all');
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete product');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

