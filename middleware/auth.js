function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect("/login");
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) return res.redirect("/login");
    if (req.session.user.role !== role) return res.status(403).send("Forbidden");
    next();
  };
}

function setLocals(req, res, next) {
  res.locals.currentUser = req.session?.user || null;
  next();
}

module.exports = { requireAuth, requireRole, setLocals };
