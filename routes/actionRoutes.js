// routes/actionRoutes.js
const express = require("express");
const router = express.Router();
const actionController = require("../controllers/actionController");

// Orders
router.post("/orders/create", actionController.createOrder);
router.post("/orders/:id/advance", actionController.advanceOrder);
router.post("/orders/:id/delete", actionController.deleteOrder);
router.post("/orders/:id/approve", actionController.approveOrder);

// Inventory
router.post("/inventory/apply", actionController.applyInventoryChange);

// Batches
router.post("/batches/create", actionController.createBatch);
router.post("/batches/:id/advance", actionController.advanceBatch);
router.post("/batches/:id/delete", actionController.deleteBatch);

module.exports = router;
