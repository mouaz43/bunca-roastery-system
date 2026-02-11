const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "..", "db", "app.db");
const db = new Database(dbPath);

function migrate() {
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('branch','b2b','admin')),
      display_name TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coffees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      channel TEXT NOT NULL CHECK(channel IN ('branch','b2b')),
      status TEXT NOT NULL DEFAULT 'offen' CHECK(status IN ('offen','in_arbeit','versandt','abgeschlossen')),
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      coffee_id INTEGER NOT NULL,
      size TEXT NOT NULL CHECK(size IN ('1kg','5kg','11kg')),
      qty INTEGER NOT NULL CHECK(qty > 0),
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(coffee_id) REFERENCES coffees(id)
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coffee_id INTEGER NOT NULL,
      min_qty INTEGER NOT NULL DEFAULT 0,
      current_qty INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(coffee_id) REFERENCES coffees(id)
    );
  `);

  // seed coffees if empty
  const coffeeCount = db.prepare("SELECT COUNT(*) AS c FROM coffees").get().c;
  if (coffeeCount === 0) {
    const ins = db.prepare("INSERT INTO coffees (name, active) VALUES (?,1)");
    ["House Blend", "Espresso", "Filter", "Decaf"].forEach(n => ins.run(n));
  }

  // ensure inventory rows exist for each coffee
  const coffeeIds = db.prepare("SELECT id FROM coffees").all();
  const invExists = db.prepare("SELECT COUNT(*) AS c FROM inventory WHERE coffee_id=?");
  const invInsert = db.prepare("INSERT INTO inventory (coffee_id, min_qty, current_qty) VALUES (?, 0, 0)");
  for (const c of coffeeIds) {
    if (invExists.get(c.id).c === 0) invInsert.run(c.id);
  }

  // seed admin if missing
  const admin = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
  if (!admin) {
    const username = "admin";
    const password = "admin123"; // change immediately after first login
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      "INSERT INTO users (username, password_hash, role, display_name) VALUES (?,?,?,?)"
    ).run(username, hash, "admin", "Admin");
    console.log("✅ Seeded admin user: admin / admin123 (CHANGE IT!)");
  }
}

module.exports = { db, migrate };
