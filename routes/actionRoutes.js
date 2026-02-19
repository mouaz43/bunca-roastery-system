// routes/actionRoutes.js
const express = require("express");
const router = express.Router();
const actionController = require("../controllers/actionController");

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Orders
router.post("/orders/create", wrap(actionController.createOrder));
router.post("/orders/:id/advance", wrap(actionController.advanceOrder));
router.post("/orders/:id/approve", wrap(actionController.approveOrder));
router.post("/orders/:id/deliver", wrap(actionController.deliverOrder));
router.post("/orders/:id/delete", wrap(actionController.deleteOrder));

// Inventory
router.post("/inventory/apply", wrap(actionController.applyInventoryChange));

// Batches
router.post("/batches/create", wrap(actionController.createBatch));
router.post("/batches/:id/advance", wrap(actionController.advanceBatch));
router.post("/batches/:id/delete", wrap(actionController.deleteBatch));

module.exports = router;
