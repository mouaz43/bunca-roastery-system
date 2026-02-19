// routes/actionRoutes.js
const express = require("express");
const router = express.Router();
const actionController = require("../controllers/actionController");

// Orders
router.post("/orders/create", actionController.createOrder);
router.post("/orders/:id/advance", actionController.advanceOrder);
router.post("/orders/:id/delete", actionController.deleteOrder);
router.post("/orders/:id/approve", actionController.approveOrder); // optional direct approve

// Inventory
router.post("/inventory/apply", actionController.applyInventoryChange);

module.exports = router;
