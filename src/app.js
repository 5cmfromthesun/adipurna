const express = require('express');
const path = require('path');
const { getPool, initDB } = require('./config/db');
const { upload } = require('./config/s3');

const app = express();
const port = process.env.PORT || 80;

// Trust proxy for ALB
app.set('trust proxy', true);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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

// BUYER - CATALOG
app.get('/', async (req, res) => {
  try {
    const result = await getPool().query('SELECT * FROM products ORDER BY id DESC');
    res.render('index', { products: result.rows, msg: req.query.msg || null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load catalog');
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
    res.render('admin', { products: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load admin page');
  }
});

// ADMIN - CREATE
app.post('/admin/products', upload.single('foto'), async (req, res) => {
  const { nama_produk, harga, stok } = req.body;
  const foto_url = req.file ? (req.file.location || req.file.url) : null;

  try {
    await getPool().query(
      'INSERT INTO products (nama_produk, harga, stok, foto_url) VALUES ($1, $2, $3, $4)',
      [nama_produk, harga, stok, foto_url]
    );
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
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete product');
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
