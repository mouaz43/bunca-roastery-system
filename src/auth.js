const bcrypt = require("bcryptjs");
const { db } = require("./db");

function getUserByUsername(username) {
  return db.prepare("SELECT * FROM users WHERE username=?").get(username);
}

function authenticate(username, password) {
  const user = getUserByUsername(username);
  if (!user) return null;
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return null;
  return { id: user.id, username: user.username, role: user.role, displayName: user.display_name || user.username };
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function requireRole(roles) {
  const set = new Set(roles);
  return (req, res, next) => {
    const u = req.session.user;
    if (!u) return res.redirect("/login");
    if (!set.has(u.role)) return res.status(403).send("Zugriff verweigert.");
    next();
  };
}

module.exports = { authenticate, requireAuth, requireRole };
