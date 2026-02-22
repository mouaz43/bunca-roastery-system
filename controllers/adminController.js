// controllers/adminController.js
const bcrypt = require("bcryptjs");
const { randomUUID } = require("crypto");
const db = require("../db");

function clean(v) {
  return String(v ?? "").trim();
}

exports.createUser = async (req, res) => {
  const name = clean(req.body.name);
  const email = clean(req.body.email).toLowerCase();
  const role = clean(req.body.role); // ADMIN | SHOP
  const shopId = clean(req.body.shopId) || null;
  const password = clean(req.body.password);

  if (!name || !email || !role || !password) {
    return res.redirect("/settings?user_error=" + encodeURIComponent("Bitte alle Pflichtfelder ausfüllen."));
  }

  if (role === "SHOP" && !shopId) {
    return res.redirect("/settings?user_error=" + encodeURIComponent("Für Filiale bitte Shop auswählen."));
  }

  // Check duplicate email
  const existing = await db.query("SELECT id FROM users WHERE email=$1", [email]);
  if (existing.rows.length) {
    return res.redirect("/settings?user_error=" + encodeURIComponent("E-Mail existiert bereits."));
  }

  const hash = await bcrypt.hash(password, 12);

  await db.query(
    `INSERT INTO users (id, email, name, role, shop_id, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), email, name, role, shopId, hash]
  );

  return res.redirect("/settings?user_ok=" + encodeURIComponent("Benutzer erstellt."));
};
