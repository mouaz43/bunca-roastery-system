// scripts/dbInit.js
const { query, pool } = require("../db");

async function run() {
  await query(`
    CREATE TABLE IF NOT EXISTS coffees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pack_default_kg NUMERIC DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY,
      channel TEXT NOT NULL,
      shop_id TEXT NULL,
      customer_name TEXT NULL,
      delivery_date DATE NOT NULL,
      status TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY,
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      coffee_id TEXT NOT NULL REFERENCES coffees(id),
      coffee_name TEXT NOT NULL,
      kg NUMERIC NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      coffee_id TEXT PRIMARY KEY REFERENCES coffees(id),
      green_kg NUMERIC NOT NULL DEFAULT 0,
      roasted_kg NUMERIC NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS batches (
      id UUID PRIMARY KEY,
      coffee_id TEXT NOT NULL REFERENCES coffees(id),
      coffee_name TEXT NOT NULL,
      kg NUMERIC NOT NULL,
      status TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS activity (
      id UUID PRIMARY KEY,
      at TIMESTAMP NOT NULL DEFAULT NOW(),
      action TEXT NOT NULL,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `);

  // Seed coffees if empty
  const coffeesCount = await query(`SELECT COUNT(*)::int AS c FROM coffees`);
  if (coffeesCount.rows[0].c === 0) {
    await query(`
      INSERT INTO coffees (id, name, pack_default_kg) VALUES
      ('bombora','Bombora',1),
      ('fiver','Fiver',1),
      ('ethiopia','Ethiopia',1),
      ('brazil','Brazil',1)
    `);
  }

  // Seed shops if empty
  const shopsCount = await query(`SELECT COUNT(*)::int AS c FROM shops`);
  if (shopsCount.rows[0].c === 0) {
    await query(`
      INSERT INTO shops (id, name) VALUES
      ('city','Bunca City'),
      ('berger','Bunca Berger Straße'),
      ('grueneburgweg','Bunca Grüneburgweg')
    `);
  }

  // Seed inventory rows for all coffees if missing
  await query(`
    INSERT INTO inventory (coffee_id, green_kg, roasted_kg)
    SELECT c.id, 0, 0
    FROM coffees c
    ON CONFLICT (coffee_id) DO NOTHING
  `);

  console.log("DB init done.");
}

run()
  .catch((e) => {
    console.error("DB init failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
