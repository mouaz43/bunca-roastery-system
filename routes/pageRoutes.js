// routes/pageRoutes.js
const express = require("express");
const router = express.Router();

const pageController = require("../controllers/pageController");
const authController = require("../controllers/authController");
const { requireAuth, requireRole } = require("../middleware/auth");

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Auth
router.get("/login", wrap(authController.renderLogin));
router.post("/login", wrap(authController.login));
router.post("/logout", wrap(authController.logout));

// Default
router.get("/", (req, res) => res.redirect("/dashboard"));

// Shared: Admin + Shop
router.get("/dashboard", requireAuth, requireRole("ADMIN", "SHOP"), wrap(pageController.renderDashboard));
router.get("/orders", requireAuth, requireRole("ADMIN", "SHOP"), wrap(pageController.renderOrders));
router.get("/inventory", requireAuth, requireRole("ADMIN", "SHOP"), wrap(pageController.renderInventory)); // Shop read-only (we enforce in actions)

// Admin only
router.get("/production", requireAuth, requireRole("ADMIN"), wrap(pageController.renderProduction));
router.get("/analytics", requireAuth, requireRole("ADMIN"), wrap(pageController.renderAnalytics));
router.get("/settings", requireAuth, requireRole("ADMIN"), wrap(pageController.renderSettings));
router.get("/activity", requireAuth, requireRole("ADMIN"), wrap(pageController.renderActivity));

module.exports = router;
