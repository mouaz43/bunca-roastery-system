// scripts/dbInit.js
const bcrypt = require("bcryptjs");
const db = require("../db");
const { randomUUID } = require("crypto");

function env(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

async function ensureTable(sql) {
  await db.query(sql);
}

async function upsertCoffee(id, name, packDefaultKg = 1) {
  await db.query(
    `INSERT INTO coffees (id, name, pack_default_kg)
     VALUES ($1,$2,$3)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, pack_default_kg = EXCLUDED.pack_default_kg`,
    [id, name, packDefaultKg]
  );
}

async function upsertShop(id, name) {
  await db.query(
    `INSERT INTO shops (id, name)
     VALUES ($1,$2)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
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
  // Core tables
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS coffees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pack_default_kg NUMERIC DEFAULT 1
    );
  `);

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS inventory (
      coffee_id TEXT PRIMARY KEY REFERENCES coffees(id) ON DELETE CASCADE,
      green_kg NUMERIC NOT NULL DEFAULT 0,
      roasted_kg NUMERIC NOT NULL DEFAULT 0
    );
  `);

  await ensureTable(`
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

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY,
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      coffee_id TEXT NOT NULL REFERENCES coffees(id),
      coffee_name TEXT NOT NULL,
      kg NUMERIC NOT NULL
    );
  `);

  await ensureTable(`
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

  await ensureTable(`
    CREATE TABLE IF NOT EXISTS activity (
      id UUID PRIMARY KEY,
      at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      action TEXT NOT NULL,
      meta JSONB NOT NULL DEFAULT '{}'::jsonb
    );
  `);

  // Auth tables
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL, -- ADMIN | SHOP | B2B
      shop_id TEXT NULL REFERENCES shops(id),
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Session table for connect-pg-simple
  await ensureTable(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    )
    WITH (OIDS=FALSE);
  `);

  await ensureTable(`
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
  `).catch(() => {});

  await ensureTable(`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `);

  // Seed master data (edit later in Settings UI)
  await upsertShop("CITY", "City");
  await upsertShop("BERGER", "Berger Straße");
  await upsertShop("GRUEN", "Grüneburgweg");

  await upsertCoffee("ESPRESSO", "Espresso Blend", 1);
  await upsertCoffee("FILTER", "Filter Blend", 1);
  await upsertCoffee("DECAF", "Decaf", 1);

  // Ensure inventory rows exist
  const coffees = await db.query(`SELECT id FROM coffees`);
  for (const r of coffees.rows) await upsertInventory(r.id);

  // Seed users
  const adminEmail = env("ADMIN_EMAIL", "admin@bunca.local");
  const adminPass = env("ADMIN_PASSWORD", "Admin123!");
  await upsertUser({
    email: adminEmail,
    name: "Admin",
    role: "ADMIN",
    shopId: null,
    password: adminPass
  });

  // Shop users (one per shop)
  const shopPass = env("SHOP_PASSWORD", "Shop123!");
  await upsertUser({ email: "city@bunca.local", name: "City", role: "SHOP", shopId: "CITY", password: shopPass });
  await upsertUser({ email: "berger@bunca.local", name: "Berger Straße", role: "SHOP", shopId: "BERGER", password: shopPass });
  await upsertUser({ email: "gruen@bunca.local", name: "Grüneburgweg", role: "SHOP", shopId: "GRUEN", password: shopPass });

  console.log("DB init done.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("DB init failed:", e);
  process.exit(1);
});
