// routes/actionRoutes.js
const express = require("express");
const router = express.Router();

const actionController = require("../controllers/actionController");
const adminController = require("../controllers/adminController");
const masterController = require("../controllers/masterController");
const receiptController = require("../controllers/receiptController");
const { requireAuth, requireRole } = require("../middleware/auth");

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Orders
router.post("/orders/create", requireAuth, requireRole("ADMIN", "SHOP"), wrap(actionController.createOrder));
router.post("/orders/:id/advance", requireAuth, requireRole("ADMIN"), wrap(actionController.advanceOrder));
router.post("/orders/:id/approve", requireAuth, requireRole("ADMIN"), wrap(actionController.approveOrder));
router.post("/orders/:id/deliver", requireAuth, requireRole("ADMIN"), wrap(actionController.deliverOrder));
router.post("/orders/:id/delete", requireAuth, requireRole("ADMIN"), wrap(actionController.deleteOrder));

// Inventory (Admin only) - new Wareneingang
router.post("/inventory/receipt", requireAuth, requireRole("ADMIN"), wrap(receiptController.createReceipt));

// Inventory generic (Admin only) - keep if you still use it somewhere
router.post("/inventory/apply", requireAuth, requireRole("ADMIN"), wrap(actionController.applyInventoryChange));

// Batches (Admin only)
router.post("/batches/create", requireAuth, requireRole("ADMIN"), wrap(actionController.createBatch));
router.post("/batches/:id/advance", requireAuth, requireRole("ADMIN"), wrap(actionController.advanceBatch));
router.post("/batches/:id/delete", requireAuth, requireRole("ADMIN"), wrap(actionController.deleteBatch));

// Users (Admin only)
router.post("/users/create", requireAuth, requireRole("ADMIN"), wrap(adminController.createUser));

// Master data (Admin only)
router.post("/masters/coffee/create", requireAuth, requireRole("ADMIN"), wrap(masterController.createCoffee));
router.post("/masters/coffee/update", requireAuth, requireRole("ADMIN"), wrap(masterController.updateCoffee));
router.post("/masters/coffee/delete", requireAuth, requireRole("ADMIN"), wrap(masterController.deleteCoffee));

router.post("/masters/shop/create", requireAuth, requireRole("ADMIN"), wrap(masterController.createShop));
router.post("/masters/shop/update", requireAuth, requireRole("ADMIN"), wrap(masterController.updateShop));
router.post("/masters/shop/delete", requireAuth, requireRole("ADMIN"), wrap(masterController.deleteShop));

module.exports = router;
