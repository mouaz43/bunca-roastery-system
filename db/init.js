const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");

const DB_PATH = path.join(__dirname, "database.sqlite");

function openDb() {
  return new sqlite3.Database(DB_PATH);
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function init() {
  const db = openDb();

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('branch','b2b','admin')),
      label TEXT NOT NULL
    )`
  );

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      items_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Offen' CHECK(status IN ('Offen','In Arbeit','Versandt','Abgeschlossen')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`
  );

  // Seed users if not exists
  const admin = await get(db, "SELECT id FROM users WHERE username = ?", ["admin"]);
  if (!admin) {
    const adminHash = await bcrypt.hash("admin123", 10);
    await run(db, "INSERT INTO users (username, password_hash, role, label) VALUES (?,?,?,?)", [
      "admin",
      adminHash,
      "admin",
      "Admin (Rösterei)"
    ]);
  }

  const branch = await get(db, "SELECT id FROM users WHERE username = ?", ["filiale1"]);
  if (!branch) {
    const branchHash = await bcrypt.hash("filiale123", 10);
    await run(db, "INSERT INTO users (username, password_hash, role, label) VALUES (?,?,?,?)", [
      "filiale1",
      branchHash,
      "branch",
      "Filiale 1"
    ]);
  }

  const b2b = await get(db, "SELECT id FROM users WHERE username = ?", ["b2b1"]);
  if (!b2b) {
    const b2bHash = await bcrypt.hash("b2b123", 10);
    await run(db, "INSERT INTO users (username, password_hash, role, label) VALUES (?,?,?,?)", [
      "b2b1",
      b2bHash,
      "b2b",
      "B2B Kunde 1"
    ]);
  }

  db.close();
}

module.exports = { DB_PATH, openDb, init };
