// routes/pageRoutes.js
const express = require("express");
const router = express.Router();

const pageController = require("../controllers/pageController");
const pdfController = require("../controllers/pdfController");
const { requireAuth, requireRole } = require("../middleware/auth");

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Auth / login
router.get("/", wrap(pageController.renderHome));
router.get("/login", wrap(pageController.renderLogin));
router.post("/login", wrap(pageController.handleLogin));
router.post("/logout", wrap(pageController.handleLogout));

// Pages
router.get("/dashboard", requireAuth, wrap(pageController.renderDashboard));
router.get("/orders", requireAuth, wrap(pageController.renderOrders));
router.get("/production", requireAuth, requireRole("ADMIN"), wrap(pageController.renderProduction));
router.get("/inventory", requireAuth, wrap(pageController.renderInventory));
router.get("/analytics", requireAuth, requireRole("ADMIN"), wrap(pageController.renderAnalytics));
router.get("/settings", requireAuth, requireRole("ADMIN"), wrap(pageController.renderSettings));
router.get("/activity", requireAuth, requireRole("ADMIN"), wrap(pageController.renderActivity));

// PDF (Order)
router.get("/orders/:id/pdf", requireAuth, wrap(pdfController.orderPdf));

module.exports = router;
