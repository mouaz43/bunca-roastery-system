// data/store.js
// In-Memory Datenstore (Übergang bis PostgreSQL aktiv ist).
// Vorteil: Wir können UI und Logik fertig bauen, bevor die Datenbank kommt.

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

// Beispiel-Bestellungen
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
    items: [
      { coffeeId: "bombora", coffeeName: "Bombora", kg: 22 }
    ],
    note: "22kg als 2x 11kg."
  }
];

// Lager (einfach)
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

function listOrders() {
  return [...orders].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
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
  return order;
}

function setOrderStatus(id, nextStatus) {
  const order = getOrderById(id);
  if (!order) return null;
  order.status = nextStatus;
  return order;
}

function deleteOrder(id) {
  const before = orders.length;
  orders = orders.filter(o => o.id !== id);
  return orders.length !== before;
}

function getInventory() {
  return inventory;
}

function applyInventoryChange({ type, coffeeId, deltaKg, note }) {
  // type: "GREEN" oder "ROASTED"
  if (!coffeeId || typeof deltaKg !== "number") return false;

  if (type === "GREEN") {
    const current = inventory.greenBeansKg[coffeeId] || 0;
    inventory.greenBeansKg[coffeeId] = Math.max(0, current + deltaKg);
  }

  if (type === "ROASTED") {
    const current = inventory.roastedKg[coffeeId] || 0;
    inventory.roastedKg[coffeeId] = Math.max(0, current + deltaKg);
  }

  inventory.updatedAt = nowISO();
  return true;
}

function computeRoastDemand() {
  // Summe der kg pro Sorte aus Bestellungen, die FREIGEGEBEN oder höher sind,
  // aber noch nicht AUSGELIEFERT.
  const eligible = new Set(["FREIGEGEBEN", "IN_PRODUKTION", "VERPACKT"]);
  const totals = {};

  for (const o of orders) {
    if (!eligible.has(o.status)) continue;
    for (const it of o.items) {
      totals[it.coffeeId] = (totals[it.coffeeId] || 0) + (Number(it.kg) || 0);
    }
  }

  // sortiert als Array zurückgeben
  return Object.entries(totals)
    .map(([coffeeId, kg]) => {
      const c = COFFEES.find(x => x.id === coffeeId);
      return { coffeeId, coffeeName: c ? c.name : coffeeId, kg };
    })
    .sort((a, b) => b.kg - a.kg);
}

module.exports = {
  ORDER_STATUS,
  SHOPS,
  COFFEES,
  listOrders,
  getOrderById,
  createOrder,
  setOrderStatus,
  deleteOrder,
  getInventory,
  applyInventoryChange,
  computeRoastDemand
};
