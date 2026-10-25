const { Pool } = require('pg');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

let pool = null;

const shouldUseSSL = (host) => {
  if (process.env.DB_SSL === 'true') return true;
  if (process.env.DB_SSL === 'false') return false;
  if (process.env.NODE_ENV === 'production') return true;
  if (host && host.includes('rds.amazonaws.com')) return true;
  return false;
};

// Fetch DB config from various sources (Secrets Manager, env vars, etc.)
const getDatabaseConfig = async () => {
  // 1. DATABASE_URL (common for PaaS/containers)
  if (process.env.DATABASE_URL) {
    const config = {
      connectionString: process.env.DATABASE_URL,
    };
    if (shouldUseSSL()) {
      config.ssl = { rejectUnauthorized: false };
    }
    return config;
  }

  // 2. DB_SECRET as JSON (can be injected directly as env var)
  if (process.env.DB_SECRET) {
    try {
      const secret = JSON.parse(process.env.DB_SECRET);
      const host = secret.DB_HOST || secret.host || process.env.DB_HOST;
      const config = {
        host,
        port: secret.DB_PORT || secret.port || process.env.DB_PORT || 5432,
        user: secret.DB_USER || secret.username || secret.user || process.env.DB_USER,
        password: secret.DB_PASSWORD || secret.password || process.env.DB_PASSWORD,
        database: secret.DB_NAME || secret.dbname || secret.database || process.env.DB_NAME || 'tokodb',
      };
      if (shouldUseSSL(host)) {
        config.ssl = { rejectUnauthorized: false };
      }
      return config;
    } catch (err) {
      console.error('Failed to parse DB_SECRET:', err.message);
    }
  }

  // 3. If SECRET_NAME is defined, fetch from AWS Secrets Manager
  if (process.env.SECRET_NAME) {
    try {
      console.log(`Fetching credentials from AWS Secrets Manager (${process.env.SECRET_NAME})...`);
      const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
      const command = new GetSecretValueCommand({ SecretId: process.env.SECRET_NAME });
      const response = await client.send(command);

      if (response.SecretString) {
        const secret = JSON.parse(response.SecretString);
        const host = secret.DB_HOST || secret.host || process.env.DB_HOST;
        const config = {
          host,
          port: secret.DB_PORT || secret.port || process.env.DB_PORT || 5432,
          user: secret.DB_USER || secret.username || secret.user || process.env.DB_USER,
          password: secret.DB_PASSWORD || secret.password || process.env.DB_PASSWORD,
          database: secret.DB_NAME || secret.dbname || secret.database || process.env.DB_NAME || 'tokodb',
        };
        if (shouldUseSSL(host)) {
          config.ssl = { rejectUnauthorized: false };
        }
        return config;
      }
    } catch (err) {
      console.error('Failed to fetch secret from Secrets Manager, falling back to environment variables:', err.message);
    }
  }

  // 4. Fallback to Environment Variables (for local Docker Compose/manual setup)
  const host = process.env.DB_HOST;
  const config = {
    host,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'tokodb',
  };
  if (shouldUseSSL(host)) {
    config.ssl = { rejectUnauthorized: false };
  }
  return config;
};

const getPool = () => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initDB() first.');
  }
  return pool;
};

const initDB = async (retries = 10, delay = 5000) => {
  const dbConfig = await getDatabaseConfig();
  pool = new Pool(dbConfig);

  const queryText = `
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      nama_produk VARCHAR(100) NOT NULL,
      harga NUMERIC NOT NULL,
      stok INTEGER NOT NULL,
      foto_url TEXT
    );
  `;

  for (let i = 0; i < retries; i++) {
    try {
      await pool.query(queryText);
      console.log('Products table is ready.');
      return;
    } catch (err) {
      console.log(`[Attempt ${i + 1}/${retries}] Database not ready yet, retrying in ${delay / 1000}s...`);
      if (i === retries - 1) {
        console.error('Failed to initialize database:', err);
      } else {
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
};

module.exports = { getPool, initDB };
