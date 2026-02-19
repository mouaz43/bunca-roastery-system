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
    let coffeeName = item1CoffeeId;
    for (let i = 0; i < coffees.length; i++) {
      if (coffees[i].id === item1CoffeeId) {
        coffeeName = coffees[i].name;
        break;
      }
    }
    items.push({ coffeeId: item1CoffeeId, coffeeName: coffeeName, kg: item1Kg });
  }

  if (item2CoffeeId && item2Kg > 0) {
    let coffeeName = item2CoffeeId;
    for (let i = 0; i < coffees.length; i++) {
      if (coffees[i].id === item2CoffeeId) {
        coffeeName = coffees[i].name;
        break;
      }
    }
    items.push({ coffeeId: item2CoffeeId, coffeeName: coffeeName, kg: item2Kg });
  }

  store.createOrder({
    channel: channel,
    shopId: channel === "FILIALE" ? shopId : null,
    customerName: channel === "B2B" ? customerName : null,
    deliveryDate: deliveryDate,
    items: items,
    note: note,
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

  store.applyInventoryChange({
    type: type,
    coffeeId: coffeeId,
    deltaKg: deltaKg,
    note: note
  });

  res.redirect("/inventory");
};
