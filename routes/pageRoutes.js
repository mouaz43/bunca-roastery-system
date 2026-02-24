// routes/pageRoutes.js
const express = require("express");
const router = express.Router();

const pageController = require("../controllers/pageController");
const inventoryController = require("../controllers/inventoryController");
const pdfController = require("../controllers/pdfController");
const { requireAuth, requireRole } = require("../middleware/auth");

// Safe wrapper: avoids "fn is not a function" crashes
const safe = (handler, name) => {
  if (typeof handler !== "function") {
    return (req, res) => {
      res.status(500).send(`
        <html><head><meta charset="utf-8"><title>Route-Fehler</title></head>
        <body style="font-family:system-ui;padding:24px;">
          <h1>Route-Fehler</h1>
          <p>Handler <b>${name}</b> ist nicht definiert oder kein Function.</p>
          <p>Prüfen: Datei existiert, Export stimmt, Schreibweise stimmt (case-sensitive).</p>
          <p><a href="/dashboard">Zurück zum Dashboard</a></p>
        </body></html>
      `);
    };
  }
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
};

// Root
router.get("/", (req, res) => {
  if (req.session && req.session.user) return res.redirect("/dashboard");
  return res.redirect("/login");
});

// Login / Logout
router.get(
  "/login",
  safe(pageController.renderLogin || pageController.login || pageController.getLogin, "pageController.renderLogin")
);
router.post(
  "/login",
  safe(pageController.handleLogin || pageController.postLogin || pageController.loginPost, "pageController.handleLogin")
);
router.post(
  "/logout",
  safe(pageController.handleLogout || pageController.logout || pageController.postLogout, "pageController.handleLogout")
);

// Main pages
router.get("/dashboard", requireAuth, safe(pageController.renderDashboard || pageController.dashboard, "pageController.renderDashboard"));
router.get("/orders", requireAuth, safe(pageController.renderOrders || pageController.orders, "pageController.renderOrders"));
router.get("/production", requireAuth, requireRole("ADMIN"), safe(pageController.renderProduction || pageController.production, "pageController.renderProduction"));
router.get("/inventory", requireAuth, requireRole("ADMIN"), safe(inventoryController.renderInventory, "inventoryController.renderInventory"));
router.get("/analytics", requireAuth, requireRole("ADMIN"), safe(pageController.renderAnalytics || pageController.analytics, "pageController.renderAnalytics"));
router.get("/settings", requireAuth, requireRole("ADMIN"), safe(pageController.renderSettings || pageController.settings, "pageController.renderSettings"));
router.get("/activity", requireAuth, requireRole("ADMIN"), safe(pageController.renderActivity || pageController.activity, "pageController.renderActivity"));

// PDFs
router.get("/orders/:id/pdf", requireAuth, safe(pdfController.orderPdf, "pdfController.orderPdf"));
router.get("/orders/:id/lieferschein.pdf", requireAuth, safe(pdfController.lieferscheinPdf, "pdfController.lieferscheinPdf"));
router.get("/inventory/receipts/:id/pdf", requireAuth, requireRole("ADMIN"), safe(pdfController.receiptPdf, "pdfController.receiptPdf"));
router.get("/production/batches/:id/pdf", requireAuth, requireRole("ADMIN"), safe(pdfController.roastPdf, "pdfController.roastPdf"));

module.exports = router;
