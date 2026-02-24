// routes/pageRoutes.js
const express = require("express");
const router = express.Router();

const pageController = require("../controllers/pageController");
const inventoryController = require("../controllers/inventoryController");
const pdfController = require("../controllers/pdfController");
const { requireAuth, requireRole } = require("../middleware/auth");

const safe = (handler, name) => {
  if (typeof handler !== "function") {
    return (req, res) => {
      res.status(500).send(`
        <h1>Route-Fehler</h1>
        <p>Handler <b>${name}</b> ist nicht definiert oder kein Function.</p>
        <p>Bitte prüfe Datei/Export.</p>
      `);
    };
  }
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
};

router.get("/", (req, res) => {
  if (req.session && req.session.user) return res.redirect("/dashboard");
  return res.redirect("/login");
});

router.get("/login", safe(pageController.renderLogin || pageController.login || pageController.getLogin, "pageController.renderLogin"));
router.post("/login", safe(pageController.handleLogin || pageController.postLogin || pageController.loginPost, "pageController.handleLogin"));
router.post("/logout", safe(pageController.handleLogout || pageController.logout || pageController.postLogout, "pageController.handleLogout"));

router.get("/dashboard", requireAuth, safe(pageController.renderDashboard || pageController.dashboard, "pageController.renderDashboard"));
router.get("/orders", requireAuth, safe(pageController.renderOrders || pageController.orders, "pageController.renderOrders"));

router.get("/production", requireAuth, requireRole("ADMIN"), safe(pageController.renderProduction || pageController.production, "pageController.renderProduction"));
router.get("/analytics", requireAuth, requireRole("ADMIN"), safe(pageController.renderAnalytics || pageController.analytics, "pageController.renderAnalytics"));
router.get("/settings", requireAuth, requireRole("ADMIN"), safe(pageController.renderSettings || pageController.settings, "pageController.renderSettings"));
router.get("/activity", requireAuth, requireRole("ADMIN"), safe(pageController.renderActivity || pageController.activity, "pageController.renderActivity"));

// Inventory
router.get("/inventory", requireAuth, requireRole("ADMIN"), safe(inventoryController.renderInventory, "inventoryController.renderInventory"));

// PDF
router.get("/orders/:id/pdf", requireAuth, safe(pdfController.orderPdf, "pdfController.orderPdf"));

module.exports = router;
