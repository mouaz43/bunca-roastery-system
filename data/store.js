// data/store.js
const { randomUUID } = require("crypto");

function nowISO() {
  return new Date().toISOString();
}

const ORDER_STATUS = [
  "ENTWURF",
  "EINGEGANGEN",
  "FREIGEGEBEN",
  "IN_PRODUKTION",
  "VERPACKT",
  "AUSGELIEFERT"
];

const BATCH_STATUS = [
  "GEPLANT",
  "GEROESTET",
  "ABGEKUEHLT",
  "VERPACKT",
  "BEREIT",
  "AUSGELIEFERT"
];

const SHOPS = [
  { id: "city", name: "Bunca City" },
  { id: "berger", name: "Bunca Berger Straße" },
  { id: "grueneburgweg", name: "Bunca Grüneburgweg" }
];

const COFFEES = [
  { id: "bombora", name: "Bombora", packDefaultKg: 1 },
  { id: "fiver", name: "Fiver", packDefaultKg: 1 },
  { id: "ethiopia", name: "Ethiopia", packDefaultKg: 1 },
  { id: "brazil", name: "Brazil", packDefaultKg: 1 }
];

let orders = [
  {
    id: randomUUID(),
    channel: "FILIALE",
    customerName: null,
    shopId: "city",
    deliveryDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    status: "EINGEGANGEN",
    createdAt: nowISO(),
    items: [
      { coffeeId: "bombora", coffeeName: "Bombora", kg: 8 },
      { coffeeId: "fiver", coffeeName: "Fiver", kg: 5 }
    ],
    note: "Bitte bis mittags liefern."
  },
  {
    id: randomUUID(),
    channel: "B2B",
    customerName: "Kunde Muster GmbH",
    shopId: null,
    deliveryDate: new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10),
    status: "FREIGEGEBEN",
    createdAt: nowISO(),
    items: [{ coffeeId: "bombora", coffeeName: "Bombora", kg: 22 }],
    note: "22kg als 2x 11kg."
  }
];

let inventory = {
  greenBeansKg: {
    bombora: 120,
    fiver: 80,
    ethiopia: 60,
    brazil: 90
  },
  roastedKg: {
    bombora: 18,
    fiver: 10,
    ethiopia: 7,
    brazil: 12
  },
  packagingUnits: {
    bag_250g: 1200,
    bag_1kg: 500,
    bag_11kg: 60
  },
  updatedAt: nowISO()
};

// NEW: Batches
let batches = [
  {
    id: randomUUID(),
    coffeeId: "bombora",
    coffeeName: "Bombora",
    kg: 12,
    status: "GEPLANT",
    createdAt: nowISO(),
    note: "Startcharge"
  }
];

// NEW: Activity log (audit)
let activity = [];

function log(action, meta) {
  activity.unshift({
    id: randomUUID(),
    at: nowISO(),
    action,
    meta: meta || {}
  });
  if (activity.length > 250) activity = activity.slice(0, 250);
}

function listOrders() {
  return orders.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function getOrderById(id) {
  return orders.find(o => o.id === id) || null;
}

function createOrder(payload) {
  const id = randomUUID();
  const order = {
    id,
    channel: payload.channel,
    customerName: payload.customerName || null,
    shopId: payload.shopId || null,
    deliveryDate: payload.deliveryDate,
    status: payload.status || "EINGEGANGEN",
    createdAt: nowISO(),
    items: payload.items || [],
    note: payload.note || ""
  };
  orders.push(order);
  log("ORDER_CREATE", { orderId: id, channel: order.channel, deliveryDate: order.deliveryDate });
  return order;
}

function setOrderStatus(id, nextStatus) {
  const order = getOrderById(id);
  if (!order) return null;
  const prev = order.status;
  order.status = nextStatus;
  log("ORDER_STATUS", { orderId: id, from: prev, to: nextStatus });
  return order;
}

function deleteOrder(id) {
  const before = orders.length;
  orders = orders.filter(o => o.id !== id);
  const changed = orders.length !== before;
  if (changed) log("ORDER_DELETE", { orderId: id });
  return changed;
}

function getInventory() {
  return inventory;
}

function applyInventoryChange(change) {
  const type = change.type;
  const coffeeId = change.coffeeId;
  const deltaKg = change.deltaKg;

  if (!coffeeId) return false;
  if (typeof deltaKg !== "number" || !isFinite(deltaKg)) return false;

  if (type === "GREEN") {
    const current = inventory.greenBeansKg[coffeeId] || 0;
    inventory.greenBeansKg[coffeeId] = Math.max(0, current + deltaKg);
  } else if (type === "ROASTED") {
    const current = inventory.roastedKg[coffeeId] || 0;
    inventory.roastedKg[coffeeId] = Math.max(0, current + deltaKg);
  } else {
    return false;
  }

  inventory.updatedAt = nowISO();
  log("INVENTORY_CHANGE", { type, coffeeId, deltaKg, note: change.note || "" });
  return true;
}

// Demand from orders (freigegeben/produktion/verpackt)
function computeRoastDemand() {
  const eligible = { FREIGEGEBEN: true, IN_PRODUKTION: true, VERPACKT: true };
  const totals = {};

  for (const o of orders) {
    if (!eligible[o.status]) continue;
    for (const it of (o.items || [])) {
      const kg = Number(it.kg) || 0;
      totals[it.coffeeId] = (totals[it.coffeeId] || 0) + kg;
    }
  }

  const result = [];
  for (const coffeeId of Object.keys(totals)) {
    const coffee = COFFEES.find(c => c.id === coffeeId);
    result.push({ coffeeId, coffeeName: coffee ? coffee.name : coffeeId, kg: totals[coffeeId] });
  }

  result.sort((a, b) => b.kg - a.kg);
  return result;
}

// NEW: batches
function listBatches() {
  return batches.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

function getBatchById(id) {
  return batches.find(b => b.id === id) || null;
}

function createBatch(payload) {
  const id = randomUUID();
  const batch = {
    id,
    coffeeId: payload.coffeeId,
    coffeeName: payload.coffeeName,
    kg: payload.kg,
    status: payload.status || "GEPLANT",
    createdAt: nowISO(),
    note: payload.note || ""
  };
  batches.push(batch);
  log("BATCH_CREATE", { batchId: id, coffeeId: batch.coffeeId, kg: batch.kg });
  return batch;
}

function advanceBatch(id) {
  const batch = getBatchById(id);
  if (!batch) return null;

  const idx = BATCH_STATUS.indexOf(batch.status);
  if (idx >= 0 && idx < BATCH_STATUS.length - 1) {
    const prev = batch.status;
    batch.status = BATCH_STATUS[idx + 1];
    log("BATCH_STATUS", { batchId: id, from: prev, to: batch.status });

    // Simple stock movement rules (can refine later):
    // When batch becomes GEROESTET -> consume green, add roasted (same kg).
    if (batch.status === "GEROESTET") {
      inventory.greenBeansKg[batch.coffeeId] = Math.max(0, (inventory.greenBeansKg[batch.coffeeId] || 0) - batch.kg);
      inventory.roastedKg[batch.coffeeId] = Math.max(0, (inventory.roastedKg[batch.coffeeId] || 0) + batch.kg);
      inventory.updatedAt = nowISO();
      log("INVENTORY_MOVE", { from: "GREEN", to: "ROASTED", coffeeId: batch.coffeeId, kg: batch.kg, batchId: id });
    }
  }

  return batch;
}

function deleteBatch(id) {
  const before = batches.length;
  batches = batches.filter(b => b.id !== id);
  const changed = batches.length !== before;
  if (changed) log("BATCH_DELETE", { batchId: id });
  return changed;
}

function listActivity() {
  return activity.slice(0, 250);
}

module.exports = {
  ORDER_STATUS,
  BATCH_STATUS,
  SHOPS,
  COFFEES,

  listOrders,
  getOrderById,
  createOrder,
  setOrderStatus,
  deleteOrder,

  getInventory,
  applyInventoryChange,

  computeRoastDemand,

  listBatches,
  getBatchById,
  createBatch,
  advanceBatch,
  deleteBatch,

  listActivity
};
