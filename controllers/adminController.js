// controllers/adminController.js
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const db = require("../db");

function clean(v) {
  return String(v ?? "").trim();
}

function red(res, params) {
  const qs = new URLSearchParams(params).toString();
  return res.redirect("/settings" + (qs ? `?${qs}` : ""));
}
function ok(res, msg, extra = {}) {
  return red(res, { tab: "users", user_ok: msg, ...extra });
}
function err(res, msg, extra = {}) {
  return red(res, { tab: "users", user_error: msg, ...extra });
}

function makeTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function countAdmins() {
  const r = await db.query(`SELECT COUNT(*)::int AS n FROM users WHERE role='ADMIN'`);
  return r.rows.length ? Number(r.rows[0].n) : 0;
}

exports.listUsers = async () => {
  const res = await db.query(
    `SELECT id, email, name, role, shop_id, created_at
     FROM users
     ORDER BY role DESC, name ASC`
  );
  return res.rows.map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    shopId: u.shop_id,
    createdAt: u.created_at ? u.created_at.toISOString() : null
  }));
};

exports.createUser = async (req, res) => {
  const name = clean(req.body.name);
  const email = clean(req.body.email).toLowerCase();
  const role = clean(req.body.role);
  const shopId = clean(req.body.shopId) || null;
  const password = clean(req.body.password);

  if (!name || !email || !role || !password) return err(res, "Bitte alle Pflichtfelder ausfüllen.");
  if (!["ADMIN", "SHOP"].includes(role)) return err(res, "Ungültige Rolle.");

  if (role === "SHOP" && !shopId) return err(res, "Für Filiale bitte Shop auswählen.");

  const existing = await db.query("SELECT id FROM users WHERE email=$1", [email]);
  if (existing.rows.length) return err(res, "E-Mail existiert bereits.");

  const hash = await bcrypt.hash(password, 12);

  await db.query(
    `INSERT INTO users (id, email, name, role, shop_id, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), email, name, role, shopId, hash]
  );

  return ok(res, "Benutzer erstellt.");
};

exports.deleteUser = async (req, res) => {
  const id = clean(req.body.id);
  if (!id) return err(res, "User ID fehlt.");

  const target = await db.query(`SELECT role, email FROM users WHERE id=$1`, [id]);
  if (!target.rows.length) return err(res, "Benutzer nicht gefunden.");

  if (target.rows[0].role === "ADMIN") {
    const admins = await countAdmins();
    if (admins <= 1) return err(res, "Letzter Admin kann nicht gelöscht werden.");
  }

  await db.query(`DELETE FROM users WHERE id=$1`, [id]);
  return ok(res, "Benutzer gelöscht.");
};

exports.resetPassword = async (req, res) => {
  const id = clean(req.body.id);
  if (!id) return err(res, "User ID fehlt.");

  const target = await db.query(`SELECT email FROM users WHERE id=$1`, [id]);
  if (!target.rows.length) return err(res, "Benutzer nicht gefunden.");

  const temp = makeTempPassword();
  const hash = await bcrypt.hash(temp, 12);

  await db.query(`UPDATE users SET password_hash=$1 WHERE id=$2`, [hash, id]);
  return ok(res, `Passwort zurückgesetzt. Temporäres Passwort für ${target.rows[0].email}: ${temp}`);
};
