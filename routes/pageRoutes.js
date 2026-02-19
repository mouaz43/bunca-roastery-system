// routes/pageRoutes.js
const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pageController");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// auth
router.get("/login", wrap(authController.renderLogin));
router.post("/login", wrap(authController.login));
router.post("/logout", wrap(authController.logout));

// protected pages
router.get("/", (req, res) => res.redirect("/dashboard"));
router.get("/dashboard", requireAuth, wrap(pageController.renderDashboard));
router.get("/orders", requireAuth, wrap(pageController.renderOrders));
router.get("/production", requireAuth, wrap(pageController.renderProduction));
router.get("/inventory", requireAuth, wrap(pageController.renderInventory));
router.get("/analytics", requireAuth, wrap(pageController.renderAnalytics));
router.get("/settings", requireAuth, wrap(pageController.renderSettings));
router.get("/activity", requireAuth, wrap(pageController.renderActivity));

module.exports = router;
