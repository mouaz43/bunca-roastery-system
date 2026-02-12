// routes/pageRoutes.js
// UI-Seiten-Routing (EJS Rendering)

const express = require("express");
const router = express.Router();

const pageController = require("../controllers/pageController");

router.get("/", pageController.renderHome);
router.get("/dashboard", pageController.renderDashboard);
router.get("/orders", pageController.renderOrders);
router.get("/production", pageController.renderProduction);
router.get("/inventory", pageController.renderInventory);
router.get("/analytics", pageController.renderAnalytics);
router.get("/settings", pageController.renderSettings);

module.exports = router;
