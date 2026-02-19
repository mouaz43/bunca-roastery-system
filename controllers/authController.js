// controllers/authController.js
const bcrypt = require("bcryptjs");
const db = require("../db");

function clean(v){ return String(v ?? "").trim(); }

exports.renderLogin = async (req, res) => {
  const error = clean(req.query.error);
  res.render("login", { layout: false, error });
};

exports.login = async (req, res) => {
  const email = clean(req.body.email).toLowerCase();
  const password = clean(req.body.password);

  if (!email || !password) return res.redirect("/login?error=" + encodeURIComponent("Bitte E-Mail und Passwort eingeben."));

  const ures = await db.query(
    `SELECT id, email, name, role, shop_id, password_hash FROM users WHERE email=$1`,
    [email]
  );
  if (!ures.rows.length) return res.redirect("/login?error=" + encodeURIComponent("Login fehlgeschlagen."));

  const u = ures.rows[0];
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.redirect("/login?error=" + encodeURIComponent("Login fehlgeschlagen."));

  req.session.user = {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    shopId: u.shop_id
  };

  res.redirect("/dashboard");
};

exports.logout = async (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
};
