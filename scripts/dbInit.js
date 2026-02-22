// scripts/dbInit.js
const bcrypt = require("bcryptjs");
const db = require("../db");
const { randomUUID } = require("crypto");

function env(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

async function ensure(sql) { await db.query(sql); }

async function upsertCoffee(id, name, packDefaultKg = 1) {
  await db.query(
    `INSERT INTO coffees (id, name, pack_default_kg, is_active)
     VALUES ($1,$2,$3, TRUE)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, pack_default_kg=EXCLUDED.pack_default_kg`,
    [id, name, packDefaultKg]
  );
}

async function upsertShop(id, name) {
  await db.query(
    `INSERT INTO shops (id, name, is_active)
     VALUES ($1,$2, TRUE)
     ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`,
    [id, name]
  );
}

async function upsertInventory(coffeeId) {
  await db.query(
    `INSERT INTO inventory (coffee_id, green_kg, roasted_kg)
     VALUES ($1, 0, 0)
     ON CONFLICT (coffee_id) DO NOTHING`,
    [coffeeId]
  );
}

async function upsertUser({ email, name, role, shopId, password }) {
  const existing = await db.query(`SELECT id FROM users WHERE email=$1`, [email]);
  if (existing.rows.length) return;

  const hash = await bcrypt.hash(password, 12);
  await db.query(
    `INSERT INTO users (id, email, name, role, shop_id, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), email, name, role, shopId || null, hash]
  );
}

async function main() {
  await ensure(`
    CREATE TABLE IF NOT EXISTS coffees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pack_default_kg NUMERIC DEFAULT 1,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  await ensure(`
    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    );
  `);

  await ensure(`
    CREATE TABLE IF NOT EXISTS inventory (
      coffee_id TEXT PRIMARY KEY REFERENCES coffees(id) ON DELETE CASCADE,
      green_kg NUMERIC NOT NULL DEFAULT 0,
      roasted_kg NUMERIC NOT NULL DEFAULT 0
    );
  `);

  await ensure(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY,
      channel TEXT NOT NULL,
      shop_id TEXT NULL REFERENCES shops(id),
      customer_name TEXT NULL,
      delivery_date DATE NOT NULL,
      status TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await ensure(`
    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY,
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      coffee_id TEXT NOT NULL REFERENCES coffees(id),
      coffee_name TEXT NOT NULL,
      kg NUMERIC NOT NULL
    );
  `);

  await ensure(`
    CREATE TABLE IF NOT EXISTS batches (
      id UUID PRIMARY KEY,
      coffee_id TEXT NOT NULL REFERENCES coffees(id),
      coffee_name TEXT NOT NULL,
      kg NUMERIC NOT NULL,
      status TEXT NOT NULL,
      note TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await ensure(`
    CREATE TABLE IF NOT EXISTS activity (
      id UUID PRIMARY KEY,
      at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      action TEXT NOT NULL,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `);

  await ensure(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      shop_id TEXT NULL REFERENCES shops(id),
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await ensure(`
    CREATE TABLE IF NOT EXISTS b2b_customers (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Session
  await ensure(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    )
    WITH (OIDS=FALSE);
  `);
  await ensure(`ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");`).catch(() => {});
  await ensure(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");`);

  // Seed
  await upsertShop("CITY", "City");
  await upsertShop("BERGER", "Berger Straße");
  await upsertShop("GRUEN", "Grüneburgweg");

  await upsertCoffee("ESPRESSO", "Espresso Blend", 1);
  await upsertCoffee("FILTER", "Filter Blend", 1);
  await upsertCoffee("DECAF", "Decaf", 1);

  const coffees = await db.query(`SELECT id FROM coffees`);
  for (const r of coffees.rows) await upsertInventory(r.id);

  const adminEmail = env("ADMIN_EMAIL", "admin@bunca.local");
  const adminPass = env("ADMIN_PASSWORD", "Admin123!");
  await upsertUser({ email: adminEmail, name: "Admin", role: "ADMIN", shopId: null, password: adminPass });

  console.log("DB init done.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("DB init failed:", e);
  process.exit(1);
});
