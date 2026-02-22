// routes/pageRoutes.js
const express = require("express");
const router = express.Router();

const pageController = require("../controllers/pageController");
const { requireAuth } = require("../middleware/auth");

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// simple role guards (NO dependency on requireRole implementation)
function requireAdmin(req, res, next) {
  const u = req.session && req.session.user;
  if (!u) return res.redirect("/login");
  if (u.role !== "ADMIN") return res.status(403).send("Nicht erlaubt.");
  next();
}

function requireAdminOrShop(req, res, next) {
  const u = req.session && req.session.user;
  if (!u) return res.redirect("/login");
  if (u.role !== "ADMIN" && u.role !== "SHOP") return res.status(403).send("Nicht erlaubt.");
  next();
}

// Public
router.get("/", (req, res) => res.redirect("/dashboard"));
router.get("/login", wrap(pageController.renderLogin));
router.post("/login", wrap(pageController.handleLogin));
router.post("/logout", wrap(pageController.handleLogout));

// App
router.get("/dashboard", requireAuth, wrap(pageController.renderDashboard));

// Orders: shops can view + create, admin can do all actions via /actions
router.get("/orders", requireAuth, wrap(pageController.renderOrders));

// Admin-only pages
router.get("/production", requireAuth, requireAdmin, wrap(pageController.renderProduction));
router.get("/inventory", requireAuth, requireAdmin, wrap(pageController.renderInventory));
router.get("/analytics", requireAuth, requireAdmin, wrap(pageController.renderAnalytics));
router.get("/activity", requireAuth, requireAdmin, wrap(pageController.renderActivity));
router.get("/settings", requireAuth, requireAdmin, wrap(pageController.renderSettings));

module.exports = router;
