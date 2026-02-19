// data/store.js
const { randomUUID } = require("crypto");
const db = require("../db");

const ORDER_STATUS = ["ENTWURF","EINGEGANGEN","FREIGEGEBEN","IN_PRODUKTION","VERPACKT","AUSGELIEFERT"];
const BATCH_STATUS = ["GEPLANT","GEROESTET","ABGEKUEHLT","VERPACKT","BEREIT","AUSGELIEFERT"];

let COFFEES = [];
let SHOPS = [];

async function refreshMasters() {
  const coffees = await db.query(`SELECT id, name, pack_default_kg FROM coffees ORDER BY name ASC`);
  COFFEES = coffees.rows.map(r => ({ id: r.id, name: r.name, packDefaultKg: Number(r.pack_default_kg || 1) }));

  const shops = await db.query(`SELECT id, name FROM shops ORDER BY name ASC`);
  SHOPS = shops.rows.map(r => ({ id: r.id, name: r.name }));
}

async function log(action, meta) {
  await db.query(
    `INSERT INTO activity (id, action, meta) VALUES ($1, $2, $3::jsonb)`,
    [randomUUID(), action, JSON.stringify(meta || {})]
  );
}

async function listOrders() {
  const res = await db.query(`SELECT * FROM orders ORDER BY created_at DESC`);
  const rows = res.rows;
  if (!rows.length) return [];

  const ids = rows.map(r => r.id);
  const itemsRes = await db.query(
    `SELECT order_id, coffee_id, coffee_name, kg
     FROM order_items
     WHERE order_id = ANY($1::uuid[])
     ORDER BY coffee_name ASC`,
    [ids]
  );

  const itemsByOrder = {};
  for (const it of itemsRes.rows) {
    if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = [];
    itemsByOrder[it.order_id].push({
      coffeeId: it.coffee_id,
      coffeeName: it.coffee_name,
      kg: Number(it.kg)
    });
  }

  return rows.map(o => ({
    id: o.id,
    channel: o.channel,
    shopId: o.shop_id,
    customerName: o.customer_name,
    deliveryDate: String(o.delivery_date).slice(0, 10),
    status: o.status,
    note: o.note || "",
    createdAt: o.created_at.toISOString(),
    items: itemsByOrder[o.id] || []
  }));
}

async function getOrderById(id) {
  const res = await db.query(`SELECT * FROM orders WHERE id = $1`, [id]);
  if (!res.rows.length) return null;
  const o = res.rows[0];

  const itemsRes = await db.query(
    `SELECT coffee_id, coffee_name, kg
     FROM order_items
     WHERE order_id = $1
     ORDER BY coffee_name ASC`,
    [id]
  );

  return {
    id: o.id,
    channel: o.channel,
    shopId: o.shop_id,
    customerName: o.customer_name,
    deliveryDate: String(o.delivery_date).slice(0, 10),
    status: o.status,
    note: o.note || "",
    createdAt: o.created_at.toISOString(),
    items: itemsRes.rows.map(x => ({ coffeeId: x.coffee_id, coffeeName: x.coffee_name, kg: Number(x.kg) }))
  };
}

async function createOrder(payload) {
  const id = randomUUID();
  await db.query(
    `INSERT INTO orders (id, channel, shop_id, customer_name, delivery_date, status, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, payload.channel, payload.shopId || null, payload.customerName || null, payload.deliveryDate, payload.status || "EINGEGANGEN", payload.note || ""]
  );

  for (const it of payload.items || []) {
    await db.query(
      `INSERT INTO order_items (id, order_id, coffee_id, coffee_name, kg)
       VALUES ($1,$2,$3,$4,$5)`,
      [randomUUID(), id, it.coffeeId, it.coffeeName, it.kg]
    );
  }

  await log("ORDER_CREATE", { orderId: id, channel: payload.channel, deliveryDate: payload.deliveryDate });
  return id;
}

async function setOrderStatus(id, nextStatus) {
  const before = await getOrderById(id);
  if (!before) return null;
  await db.query(`UPDATE orders SET status = $1 WHERE id = $2`, [nextStatus, id]);
  await log("ORDER_STATUS", { orderId: id, from: before.status, to: nextStatus });
  return true;
}

async function deleteOrder(id) {
  const res = await db.query(`DELETE FROM orders WHERE id = $1`, [id]);
  if (res.rowCount) await log("ORDER_DELETE", { orderId: id });
  return !!res.rowCount;
}

async function getInventory() {
  const invRes = await db.query(`SELECT coffee_id, green_kg, roasted_kg FROM inventory ORDER BY coffee_id ASC`);
  const greenBeansKg = {};
  const roastedKg = {};
  for (const r of invRes.rows) {
    greenBeansKg[r.coffee_id] = Number(r.green_kg);
    roastedKg[r.coffee_id] = Number(r.roasted_kg);
  }
  const upd = await db.query(`SELECT at FROM activity ORDER BY at DESC LIMIT 1`);
  const updatedAt = upd.rows.length ? upd.rows[0].at.toISOString() : new Date().toISOString();
  return { greenBeansKg, roastedKg, packagingUnits: {}, updatedAt };
}

async function applyInventoryChange(change) {
  const type = change.type;
  const coffeeId = change.coffeeId;
  const deltaKg = Number(change.deltaKg);
  if (!coffeeId || !Number.isFinite(deltaKg)) return false;

  if (type === "GREEN") {
    await db.query(`UPDATE inventory SET green_kg = GREATEST(0, green_kg + $1) WHERE coffee_id = $2`, [deltaKg, coffeeId]);
  } else if (type === "ROASTED") {
    await db.query(`UPDATE inventory SET roasted_kg = GREATEST(0, roasted_kg + $1) WHERE coffee_id = $2`, [deltaKg, coffeeId]);
  } else return false;

  await log("INVENTORY_CHANGE", { type, coffeeId, deltaKg, note: change.note || "" });
  return true;
}

async function computeRoastDemand() {
  const eligible = ["FREIGEGEBEN", "IN_PRODUKTION", "VERPACKT"];
  const res = await db.query(
    `SELECT oi.coffee_id, oi.coffee_name, SUM(oi.kg)::numeric AS kg
     FROM orders o
     JOIN order_items oi ON oi.order_id = o.id
     WHERE o.status = ANY($1::text[])
     GROUP BY oi.coffee_id, oi.coffee_name
     ORDER BY SUM(oi.kg) DESC`,
    [eligible]
  );
  return res.rows.map(r => ({ coffeeId: r.coffee_id, coffeeName: r.coffee_name, kg: Number(r.kg) }));
}

// NEW: Consume roasted stock for an order atomically-ish (simple, single process)
async function consumeRoastedForOrder(order) {
  const inv = await getInventory();

  for (const it of order.items || []) {
    const available = inv.roastedKg[it.coffeeId] || 0;
    if (available < it.kg) {
      return { ok: false, reason: `${it.coffeeName}: verfügbar ${available}kg, benötigt ${it.kg}kg` };
    }
  }

  for (const it of order.items || []) {
    await db.query(
      `UPDATE inventory
       SET roasted_kg = GREATEST(0, roasted_kg - $1)
       WHERE coffee_id = $2`,
      [Number(it.kg), it.coffeeId]
    );
    await log("INVENTORY_MOVE", { from: "ROASTED", to: "DELIVERED", coffeeId: it.coffeeId, kg: Number(it.kg), orderId: order.id });
  }

  await log("ORDER_DELIVER", { orderId: order.id });
  return { ok: true };
}

async function listBatches() {
  const res = await db.query(`SELECT * FROM batches ORDER BY created_at DESC`);
  return res.rows.map(b => ({
    id: b.id,
    coffeeId: b.coffee_id,
    coffeeName: b.coffee_name,
    kg: Number(b.kg),
    status: b.status,
    note: b.note || "",
    createdAt: b.created_at.toISOString()
  }));
}

async function createBatch(payload) {
  const id = randomUUID();
  await db.query(
    `INSERT INTO batches (id, coffee_id, coffee_name, kg, status, note)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, payload.coffeeId, payload.coffeeName, payload.kg, payload.status || "GEPLANT", payload.note || ""]
  );
  await log("BATCH_CREATE", { batchId: id, coffeeId: payload.coffeeId, kg: payload.kg });
  return id;
}

async function advanceBatch(id) {
  const res = await db.query(`SELECT * FROM batches WHERE id = $1`, [id]);
  if (!res.rows.length) return null;

  const batch = res.rows[0];
  const idx = BATCH_STATUS.indexOf(batch.status);
  if (idx < 0 || idx >= BATCH_STATUS.length - 1) return true;

  const next = BATCH_STATUS[idx + 1];
  await db.query(`UPDATE batches SET status = $1 WHERE id = $2`, [next, id]);
  await log("BATCH_STATUS", { batchId: id, from: batch.status, to: next });

  // Movement when roasted
  if (next === "GEROESTET") {
    await db.query(
      `UPDATE inventory
       SET green_kg = GREATEST(0, green_kg - $1),
           roasted_kg = GREATEST(0, roasted_kg + $1)
       WHERE coffee_id = $2`,
      [Number(batch.kg), batch.coffee_id]
    );
    await log("INVENTORY_MOVE", { from: "GREEN", to: "ROASTED", coffeeId: batch.coffee_id, kg: Number(batch.kg), batchId: id });
  }

  // Movement when batch delivered: roasted decreases
  if (next === "AUSGELIEFERT") {
    await db.query(
      `UPDATE inventory
       SET roasted_kg = GREATEST(0, roasted_kg - $1)
       WHERE coffee_id = $2`,
      [Number(batch.kg), batch.coffee_id]
    );
    await log("INVENTORY_MOVE", { from: "ROASTED", to: "BATCH_DELIVERED", coffeeId: batch.coffee_id, kg: Number(batch.kg), batchId: id });
  }

  return true;
}

async function deleteBatch(id) {
  const del = await db.query(`DELETE FROM batches WHERE id = $1`, [id]);
  if (del.rowCount) await log("BATCH_DELETE", { batchId: id });
  return !!del.rowCount;
}

async function listActivity() {
  const res = await db.query(`SELECT * FROM activity ORDER BY at DESC LIMIT 250`);
  return res.rows.map(a => ({ id: a.id, at: a.at.toISOString(), action: a.action, meta: a.meta }));
}

module.exports = {
  ORDER_STATUS,
  BATCH_STATUS,
  get COFFEES() { return COFFEES; },
  get SHOPS() { return SHOPS; },
  refreshMasters,

  listOrders,
  getOrderById,
  createOrder,
  setOrderStatus,
  deleteOrder,

  getInventory,
  applyInventoryChange,

  computeRoastDemand,

  consumeRoastedForOrder,

  listBatches,
  createBatch,
  advanceBatch,
  deleteBatch,

  listActivity
};
