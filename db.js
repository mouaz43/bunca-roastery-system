// db.js
const { Pool } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Add it in Render → Web Service → Environment. " +
    "Use the Render Postgres INTERNAL DATABASE URL."
  );
}

// For Render: External URL typically requires SSL.
// Internal URL may work without SSL, but SSL-on is also fine in most setups.
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
