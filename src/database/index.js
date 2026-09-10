const mongoose = require('mongoose');
const { Pool } = require('pg');

let mongoConnection = null;
let pgConnection = null;

async function initializeDatabase() {
  try {
    // Initialize MongoDB
    if (process.env.MONGODB_URI) {
      mongoConnection = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('✅ MongoDB connected');
    }

    // Initialize PostgreSQL
    if (process.env.DATABASE_URL) {
      pgConnection = new Pool({
        connectionString: process.env.DATABASE_URL
      });
      
      const client = await pgConnection.connect();
      console.log('✅ PostgreSQL connected');
      client.release();
      
      // Create tables if they don't exist
      await createTables();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

async function createTables() {
  const queries = [
    `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        username VARCHAR(255),
        wallet_address VARCHAR(255),
        wallet_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        plan_id INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        username VARCHAR(255),
        password VARCHAR(255),
        server VARCHAR(255),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        features TEXT,
        duration_days INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'TON',
        tx_hash VARCHAR(255) UNIQUE,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP
      )
    `,
    `
      CREATE TABLE IF NOT EXISTS payment_invoices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        plan_id INTEGER NOT NULL,
        ton_address VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  ];

  for (const query of queries) {
    try {
      await pgConnection.query(query);
    } catch (error) {
      console.error('Error creating table:', error);
    }
  }
}

async function closeConnections() {
  if (mongoConnection) {
    await mongoConnection.disconnect();
  }
  if (pgConnection) {
    await pgConnection.end();
  }
}

module.exports = {
  initializeDatabase,
  closeConnections,
  mongoConnection,
  pgConnection
};
