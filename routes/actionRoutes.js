// routes/actionRoutes.js
const express = require("express");
const router = express.Router();

const actionController = require("../controllers/actionController");
const adminController = require("../controllers/adminController");
const masterController = require("../controllers/masterController");
const b2bController = require("../controllers/b2bController");
const { requireAuth, requireRole } = require("../middleware/auth");

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Orders
router.post("/orders/create", requireAuth, requireRole("ADMIN", "SHOP"), wrap(actionController.createOrder));
router.post("/orders/:id/advance", requireAuth, requireRole("ADMIN"), wrap(actionController.advanceOrder));
router.post("/orders/:id/approve", requireAuth, requireRole("ADMIN"), wrap(actionController.approveOrder));
router.post("/orders/:id/deliver", requireAuth, requireRole("ADMIN"), wrap(actionController.deliverOrder));
router.post("/orders/:id/delete", requireAuth, requireRole("ADMIN"), wrap(actionController.deleteOrder));

// Inventory (Admin)
router.post("/inventory/apply", requireAuth, requireRole("ADMIN"), wrap(actionController.applyInventoryChange));

// Batches (Admin)
router.post("/batches/create", requireAuth, requireRole("ADMIN"), wrap(actionController.createBatch));
router.post("/batches/:id/advance", requireAuth, requireRole("ADMIN"), wrap(actionController.advanceBatch));
router.post("/batches/:id/delete", requireAuth, requireRole("ADMIN"), wrap(actionController.deleteBatch));

// Users (Admin)
router.post("/users/create", requireAuth, requireRole("ADMIN"), wrap(adminController.createUser));
router.post("/users/delete", requireAuth, requireRole("ADMIN"), wrap(adminController.deleteUser));
router.post("/users/reset-password", requireAuth, requireRole("ADMIN"), wrap(adminController.resetPassword));

// Masters (Admin)
router.post("/masters/coffee/create", requireAuth, requireRole("ADMIN"), wrap(masterController.createCoffee));
router.post("/masters/coffee/update", requireAuth, requireRole("ADMIN"), wrap(masterController.updateCoffee));
router.post("/masters/coffee/delete", requireAuth, requireRole("ADMIN"), wrap(masterController.deleteCoffee));

router.post("/masters/shop/create", requireAuth, requireRole("ADMIN"), wrap(masterController.createShop));
router.post("/masters/shop/update", requireAuth, requireRole("ADMIN"), wrap(masterController.updateShop));
router.post("/masters/shop/delete", requireAuth, requireRole("ADMIN"), wrap(masterController.deleteShop));

// B2B Customers (Admin)
router.post("/b2b/create", requireAuth, requireRole("ADMIN"), wrap(b2bController.create));
router.post("/b2b/update", requireAuth, requireRole("ADMIN"), wrap(b2bController.update));
router.post("/b2b/delete", requireAuth, requireRole("ADMIN"), wrap(b2bController.remove));

module.exports = router;
