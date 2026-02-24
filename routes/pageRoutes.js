// routes/pageRoutes.js
const express = require("express");
const router = express.Router();

const pageController = require("../controllers/pageController");
const inventoryController = require("../controllers/inventoryController");
const pdfController = require("../controllers/pdfController");
const { requireAuth, requireRole } = require("../middleware/auth");

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Root: send to dashboard if logged in, otherwise login
router.get("/", (req, res) => {
  if (req.session && req.session.user) return res.redirect("/dashboard");
  return res.redirect("/login");
});

// Login / Logout
router.get("/login", wrap(pageController.renderLogin));
router.post("/login", wrap(pageController.handleLogin));
router.post("/logout", wrap(pageController.handleLogout));

// Main pages
router.get("/dashboard", requireAuth, wrap(pageController.renderDashboard));
router.get("/orders", requireAuth, wrap(pageController.renderOrders));
router.get("/production", requireAuth, requireRole("ADMIN"), wrap(pageController.renderProduction));
router.get("/analytics", requireAuth, requireRole("ADMIN"), wrap(pageController.renderAnalytics));
router.get("/settings", requireAuth, requireRole("ADMIN"), wrap(pageController.renderSettings));
router.get("/activity", requireAuth, requireRole("ADMIN"), wrap(pageController.renderActivity));

// Inventory (Admin only) — now via inventoryController
router.get("/inventory", requireAuth, requireRole("ADMIN"), wrap(inventoryController.renderInventory));

// PDF (Order)
router.get("/orders/:id/pdf", requireAuth, wrap(pdfController.orderPdf));

module.exports = router;
