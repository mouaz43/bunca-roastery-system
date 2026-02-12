// controllers/actionController.js
const store = require("../data/store");

function parseFloatSafe(v) {
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

exports.createOrder = (req, res) => {
  const channel = req.body.channel;
  const shopId = req.body.shopId || null;
  const customerName = req.body.customerName || null;
  const deliveryDate = req.body.deliveryDate;
  const note = req.body.note || "";

  const item1CoffeeId = req.body.item1CoffeeId;
  const item1Kg = parseFloatSafe(req.body.item1Kg);

  const item2CoffeeId = req.body.item2CoffeeId;
  const item2Kg = parseFloatSafe(req.body.item2Kg);

  const coffees = store.COFFEES;

  const items = [];
  if (item1CoffeeId && item1Kg > 0) {
    const c = coffees.find(x => x.id === item1CoffeeId);
    items.push({ coffeeId: item1CoffeeId, coffeeName: c ? c.name : item1CoffeeId, kg: item1Kg });
  }
  if (item2CoffeeId && item2Kg > 0) {
    const c = coffees.find(x => x.id === item2CoffeeId);
    items.push({ coffeeId: item2CoffeeId, coffeeName: c ? c.name : item2CoffeeId, kg: item2Kg });
  }

  store.createOrder({
    channel,
    shopId,
    customerName: channel === "B2B" ? customerName : null,
    deliveryDate,
    items,
    note,
    status: "EINGEGANGEN"
  });

  res.redirect("/orders");
};

exports.advanceOrder = (req, res) => {
  const id = req.params.id;
  const order = store.getOrderById(id);
  if (!order) return res.redirect("/orders");

  const statuses = store.ORDER_STATUS;
  const idx = statuses.indexOf(order.status);

  if (idx >= 0 && idx < statuses.length - 1) {
    const next = statuses[idx + 1];
    store.setOrderStatus(id, next);
  }

  res.redirect("/orders");
};

exports.deleteOrder = (req, res) => {
  const id = req.params.id;
  store.deleteOrder(id);
  res.redirect("/orders");
};

exports.applyInventoryChange = (req, res) => {
  const type = req.body.type;
  const coffeeId = req.body.coffeeId;
  const deltaKg = parseFloatSafe(req.body.deltaKg);
  const note = req.body.note || "";

  store.applyInventoryChange({ type, coffeeId, deltaKg, note });
  res.redirect("/inventory");
};
