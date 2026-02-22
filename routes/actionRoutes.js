// routes/actionRoutes.js
const express = require("express");
const router = express.Router();

const actionController = require("../controllers/actionController");
const adminController = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/auth");

const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Orders
router.post("/orders/create", requireAuth, requireRole("ADMIN", "SHOP"), wrap(actionController.createOrder));
router.post("/orders/:id/advance", requireAuth, requireRole("ADMIN"), wrap(actionController.advanceOrder));
router.post("/orders/:id/approve", requireAuth, requireRole("ADMIN"), wrap(actionController.approveOrder));
router.post("/orders/:id/deliver", requireAuth, requireRole("ADMIN"), wrap(actionController.deliverOrder));
router.post("/orders/:id/delete", requireAuth, requireRole("ADMIN"), wrap(actionController.deleteOrder));

// Inventory (Admin only)
router.post("/inventory/apply", requireAuth, requireRole("ADMIN"), wrap(actionController.applyInventoryChange));

// Batches (Admin only)
router.post("/batches/create", requireAuth, requireRole("ADMIN"), wrap(actionController.createBatch));
router.post("/batches/:id/advance", requireAuth, requireRole("ADMIN"), wrap(actionController.advanceBatch));
router.post("/batches/:id/delete", requireAuth, requireRole("ADMIN"), wrap(actionController.deleteBatch));

// Users (Admin only)
router.post("/users/create", requireAuth, requireRole("ADMIN"), wrap(adminController.createUser));

module.exports = router;
