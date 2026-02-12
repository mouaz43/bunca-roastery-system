// routes/actionRoutes.js
// POST Aktionen für UI Workflows (Bestellungen, Lager, etc.)

const express = require("express");
const router = express.Router();

const actionController = require("../controllers/actionController");

// Orders
router.post("/orders/create", actionController.createOrder);
router.post("/orders/:id/advance", actionController.advanceOrder);
router.post("/orders/:id/delete", actionController.deleteOrder);

// Inventory
router.post("/inventory/apply", actionController.applyInventoryChange);

module.exports = router;
