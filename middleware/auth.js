// middleware/auth.js
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect("/login");
}

function requireRole(...roles) {
  return (req, res, next) => {
    const u = req.session && req.session.user;
    if (!u) return res.redirect("/login");
    if (roles.includes(u.role)) return next();
    return res.status(403).send("Kein Zugriff.");
  };
}

function injectUser(req, res, next) {
  res.locals.currentUser = (req.session && req.session.user) ? req.session.user : null;
  next();
}

module.exports = { requireAuth, requireRole, injectUser };
