// controllers/actionController.js
const store = require("../data/store");

function num(v) {
  const n = Number.parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function cleanText(v) {
  return String(v || "").trim();
}

exports.createOrder = (req, res) => {
  const channel = cleanText(req.body.channel) || "FILIALE";
  const shopId = cleanText(req.body.shopId) || null;
  const customerName = cleanText(req.body.customerName) || null;
  const deliveryDate = cleanText(req.body.deliveryDate) || new Date().toISOString().slice(0, 10);
  const note = cleanText(req.body.note);

  // Items: allow up to 8 lines from UI (we will expand later)
  const items = [];
  for (let i = 1; i <= 8; i++) {
    const coffeeId = cleanText(req.body[`item${i}CoffeeId`]);
    const kg = num(req.body[`item${i}Kg`]);
    if (!coffeeId || kg <= 0) continue;

    const coffee = store.COFFEES.find(c => c.id === coffeeId);
    items.push({
      coffeeId,
      coffeeName: coffee ? coffee.name : coffeeId,
      kg
    });
  }

  // Safety: if no items, create with empty but keep it visible (later we enforce)
  store.createOrder({
    channel,
    shopId: channel === "FILIALE" ? shopId : null,
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
    store.setOrderStatus(id, statuses[idx + 1]);
  }
  res.redirect("/orders");
};

exports.approveOrder = (req, res) => {
  const id = req.params.id;
  const order = store.getOrderById(id);
  if (!order) return res.redirect("/orders");

  // Force to FREIGEGEBEN
  store.setOrderStatus(id, "FREIGEGEBEN");
  res.redirect("/orders");
};

exports.deleteOrder = (req, res) => {
  const id = req.params.id;
  store.deleteOrder(id);
  res.redirect("/orders");
};

exports.applyInventoryChange = (req, res) => {
  const type = cleanText(req.body.type); // GREEN or ROASTED
  const coffeeId = cleanText(req.body.coffeeId);
  const deltaKg = num(req.body.deltaKg);

  store.applyInventoryChange({
    type,
    coffeeId,
    deltaKg,
    note: cleanText(req.body.note)
  });

  res.redirect("/inventory");
};
