// routes/pageRoutes.js
const express = require("express");
const router = express.Router();
const pageController = require("../controllers/pageController");

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

router.get("/", wrap(pageController.renderHome));
router.get("/dashboard", wrap(pageController.renderDashboard));

router.get("/orders", wrap(pageController.renderOrders));
router.get("/production", wrap(pageController.renderProduction));
router.get("/inventory", wrap(pageController.renderInventory));

router.get("/analytics", wrap(pageController.renderAnalytics));
router.get("/settings", wrap(pageController.renderSettings));
router.get("/activity", wrap(pageController.renderActivity));

module.exports = router;
