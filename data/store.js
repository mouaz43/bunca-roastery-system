// data/store.js
const { randomUUID } = require("crypto");
const db = require("../db");

const ORDER_STATUS = ["ENTWURF","EINGEGANGEN","FREIGEGEBEN","IN_PRODUKTION","VERPACKT","AUSGELIEFERT"];
const BATCH_STATUS = ["GEPLANT","GEROESTET","ABGEKUEHLT","VERPACKT","BEREIT","AUSGELIEFERT"];

let COFFEES = []; // active UI list
let SHOPS = [];   // active UI list

/* =========================
   HELPERS
========================= */
function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clean(v) {
  return String(v ?? "").trim();
}

async function log(action, meta) {
  await db.query(
    `INSERT INTO activity (id, action, meta) VALUES ($1, $2, $3::jsonb)`,
    [randomUUID(), action, JSON.stringify(meta || {})]
  );
}

async function ensureInventoryRow(coffeeId) {
  await db.query(
    `INSERT INTO inventory (coffee_id, green_kg, roasted_kg)
     VALUES ($1, 0, 0)
     ON CONFLICT (coffee_id) DO NOTHING`,
    [coffeeId]
  );
}

/* =========================
   MASTERS CACHE (ACTIVE)
========================= */
async function refreshMasters() {
  const coffees = await db.query(
    `SELECT id, name, pack_default_kg
     FROM coffees
     WHERE COALESCE(is_active, TRUE) = TRUE
     ORDER BY name ASC`
  );
  COFFEES = coffees.rows.map(r => ({
    id: r.id,
    name: r.name,
    packDefaultKg: toNum(r.pack_default_kg, 1) || 1
  }));

  const shops = await db.query(
    `SELECT id, name
     FROM shops
     WHERE COALESCE(is_active, TRUE) = TRUE
     ORDER BY name ASC`
  );
  SHOPS = shops.rows.map(r => ({ id: r.id, name: r.name }));
}

/* =========================
   ADMIN LISTS (ALL)
========================= */
async function listAllCoffees() {
  const res = await db.query(
    `SELECT id, name, pack_default_kg, COALESCE(is_active, TRUE) AS is_active
     FROM coffees
     ORDER BY COALESCE(is_active, TRUE) DESC, name ASC`
  );
  return res.rows.map(r => ({
    id: r.id,
    name: r.name,
    packDefaultKg: toNum(r.pack_default_kg, 1) || 1,
    isActive: !!r.is_active
  }));
}

async function listAllShops() {
  const res = await db.query(
    `SELECT id, name, COALESCE(is_active, TRUE) AS is_active
     FROM shops
     ORDER BY COALESCE(is_active, TRUE) DESC, name ASC`
  );
  return res.rows.map(r => ({
    id: r.id,
    name: r.name,
    isActive: !!r.is_active
  }));
}

/* =========================
   COFFEES CRUD (HARD DELETE)
========================= */
async function createCoffee({ id, name, packDefaultKg = 1 }) {
  const coffeeId = clean(id);
  const coffeeName = clean(name);
  const pack = toNum(packDefaultKg, 1) || 1;

  if (!coffeeId || !coffeeName) throw new Error("Coffee benötigt ID und Name.");

  await db.query(
    `INSERT INTO coffees (id, name, pack_default_kg, is_active)
     VALUES ($1,$2,$3, TRUE)`,
    [coffeeId, coffeeName, pack]
  );

  await ensureInventoryRow(coffeeId);
  await log("MASTER_COFFEE_CREATE", { coffeeId, name: coffeeName, packDefaultKg: pack });
  return true;
}

async function updateCoffee({ id, name, packDefaultKg = 1 }) {
  const coffeeId = clean(id);
  const coffeeName = clean(name);
  const pack = toNum(packDefaultKg, 1) || 1;

  if (!coffeeId) throw new Error("Coffee ID fehlt.");
  if (!coffeeName) throw new Error("Coffee Name fehlt.");

  await db.query(
    `UPDATE coffees
     SET name=$1, pack_default_kg=$2
     WHERE id=$3`,
    [coffeeName, pack, coffeeId]
  );

  // Keep order display consistent
  await db.query(
    `UPDATE order_items SET coffee_name=$1 WHERE coffee_id=$2`,
    [coffeeName, coffeeId]
  );

  await log("MASTER_COFFEE_UPDATE", { coffeeId, name: coffeeName, packDefaultKg: pack });
  return true;
}

async function setCoffeeActive(coffeeId, isActive) {
  const id = clean(coffeeId);
  if (!id) throw new Error("Coffee ID fehlt.");
  await db.query(`UPDATE coffees SET is_active=$1 WHERE id=$2`, [!!isActive, id]);
  await log("MASTER_COFFEE_ACTIVE_SET", { coffeeId: id, isActive: !!isActive });
  return true;
}

/**
 * HARD DELETE COFFEE
 * This will remove ALL related data so that FK constraints do not block deletion.
 * This is intentionally destructive and matches "delete whatever I want".
 */
async function deleteCoffee(coffeeId) {
  const id = clean(coffeeId);
  if (!id) throw new Error("Coffee ID fehlt.");

  await db.query("BEGIN");
  try {
    // Remove dependent rows first (avoid FK blocks)
    await db.query(`DELETE FROM order_items WHERE coffee_id=$1`, [id]);
    await db.query(`DELETE FROM batches WHERE coffee_id=$1`, [id]);
    await db.query(`DELETE FROM inventory WHERE coffee_id=$1`, [id]);

    // Now delete the coffee itself
    const del = await db.query(`DELETE FROM coffees WHERE id=$1`, [id]);

    await log("MASTER_COFFEE_HARD_DELETE", { coffeeId: id, deleted: del.rowCount });
    await db.query("COMMIT");
    return true;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }
}

/* =========================
   SHOPS CRUD (HARD DELETE)
========================= */
async function createShop({ id, name }) {
  const shopId = clean(id);
  const shopName = clean(name);
  if (!shopId || !shopName) throw new Error("Filiale benötigt ID und Name.");

  await db.query(
    `INSERT INTO shops (id, name, is_active)
     VALUES ($1,$2, TRUE)`,
    [shopId, shopName]
  );

  await log("MASTER_SHOP_CREATE", { shopId, name: shopName });
  return true;
}

async function updateShop({ id, name }) {
  const shopId = clean(id);
  const shopName = clean(name);
  if (!shopId || !shopName) throw new Error("Filiale benötigt ID und Name.");

  await db.query(`UPDATE shops SET name=$1 WHERE id=$2`, [shopName, shopId]);
  await log("MASTER_SHOP_UPDATE", { shopId, name: shopName });
  return true;
}

async function setShopActive(shopId, isActive) {
  const id = clean(shopId);
  if (!id) throw new Error("Shop ID fehlt.");
  await db.query(`UPDATE shops SET is_active=$1 WHERE id=$2`, [!!isActive, id]);
  await log("MASTER_SHOP_ACTIVE_SET", { shopId: id, isActive: !!isActive });
  return true;
}

/**
 * HARD DELETE SHOP
 * Option A (implemented): delete all orders of that shop (and order_items cascade),
 * set users.shop_id to NULL (so users can be reassigned), then delete the shop.
 * If you prefer deleting users too, tell me and I'll switch to that.
 */
async function deleteShop(shopId) {
  const id = clean(shopId);
  if (!id) throw new Error("Shop ID fehlt.");

  await db.query("BEGIN");
  try {
    // Delete orders of this shop (order_items will cascade)
    await db.query(`DELETE FROM orders WHERE shop_id=$1`, [id]);

    // Detach users from this shop (keep accounts, or reassign later)
    await db.query(`UPDATE users SET shop_id = NULL WHERE shop_id=$1`, [id]);

    // Now delete shop
    const del = await db.query(`DELETE FROM shops WHERE id=$1`, [id]);

    await log("MASTER_SHOP_HARD_DELETE", { shopId: id, deleted: del.rowCount });
    await db.query("COMMIT");
    return true;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  }
}

/* =========================
   ORDERS
========================= */
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
      kg: toNum(it.kg, 0)
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
    items: itemsRes.rows.map(x => ({
      coffeeId: x.coffee_id,
      coffeeName: x.coffee_name,
      kg: toNum(x.kg, 0)
    }))
  };
}

async function createOrder(payload) {
  const id = randomUUID();

  await db.query(
    `INSERT INTO orders (id, channel, shop_id, customer_name, delivery_date, status, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      id,
      payload.channel,
      payload.shopId || null,
      payload.customerName || null,
      payload.deliveryDate,
      payload.status || "EINGEGANGEN",
      payload.note || ""
    ]
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

/* =========================
   INVENTORY
========================= */
async function getInventory() {
  const invRes = await db.query(`SELECT coffee_id, green_kg, roasted_kg FROM inventory ORDER BY coffee_id ASC`);
  const greenBeansKg = {};
  const roastedKg = {};

  for (const r of invRes.rows) {
    greenBeansKg[r.coffee_id] = toNum(r.green_kg, 0);
    roastedKg[r.coffee_id] = toNum(r.roasted_kg, 0);
  }

  const upd = await db.query(`SELECT at FROM activity ORDER BY at DESC LIMIT 1`);
  const updatedAt = upd.rows.length ? upd.rows[0].at.toISOString() : new Date().toISOString();
  return { greenBeansKg, roastedKg, packagingUnits: {}, updatedAt };
}

async function applyInventoryChange(change) {
  const type = change.type;
  const coffeeId = change.coffeeId;
  const deltaKg = toNum(change.deltaKg, NaN);
  if (!coffeeId || !Number.isFinite(deltaKg)) return false;

  if (type === "GREEN") {
    await db.query(`UPDATE inventory SET green_kg = GREATEST(0, green_kg + $1) WHERE coffee_id = $2`, [deltaKg, coffeeId]);
  } else if (type === "ROASTED") {
    await db.query(`UPDATE inventory SET roasted_kg = GREATEST(0, roasted_kg + $1) WHERE coffee_id = $2`, [deltaKg, coffeeId]);
  } else return false;

  await log("INVENTORY_CHANGE", { type, coffeeId, deltaKg, note: change.note || "" });
  return true;
}

/* =========================
   PRODUCTION / DEMAND
========================= */
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
  return res.rows.map(r => ({
    coffeeId: r.coffee_id,
    coffeeName: r.coffee_name,
    kg: toNum(r.kg, 0)
  }));
}

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
      [toNum(it.kg, 0), it.coffeeId]
    );
    await log("INVENTORY_MOVE", { from: "ROASTED", to: "DELIVERED", coffeeId: it.coffeeId, kg: toNum(it.kg, 0), orderId: order.id });
  }

  await log("ORDER_DELIVER", { orderId: order.id });
  return { ok: true };
}

/* =========================
   BATCHES
========================= */
async function listBatches() {
  const res = await db.query(`SELECT * FROM batches ORDER BY created_at DESC`);
  return res.rows.map(b => ({
    id: b.id,
    coffeeId: b.coffee_id,
    coffeeName: b.coffee_name,
    kg: toNum(b.kg, 0),
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

  if (next === "GEROESTET") {
    await db.query(
      `UPDATE inventory
       SET green_kg = GREATEST(0, green_kg - $1),
           roasted_kg = GREATEST(0, roasted_kg + $1)
       WHERE coffee_id = $2`,
      [toNum(batch.kg, 0), batch.coffee_id]
    );
    await log("INVENTORY_MOVE", { from: "GREEN", to: "ROASTED", coffeeId: batch.coffee_id, kg: toNum(batch.kg, 0), batchId: id });
  }

  if (next === "AUSGELIEFERT") {
    await db.query(
      `UPDATE inventory
       SET roasted_kg = GREATEST(0, roasted_kg - $1)
       WHERE coffee_id = $2`,
      [toNum(batch.kg, 0), batch.coffee_id]
    );
    await log("INVENTORY_MOVE", { from: "ROASTED", to: "BATCH_DELIVERED", coffeeId: batch.coffee_id, kg: toNum(batch.kg, 0), batchId: id });
  }

  return true;
}

async function deleteBatch(id) {
  const del = await db.query(`DELETE FROM batches WHERE id = $1`, [id]);
  if (del.rowCount) await log("BATCH_DELETE", { batchId: id });
  return !!del.rowCount;
}

/* =========================
   ACTIVITY
========================= */
async function listActivity() {
  const res = await db.query(`SELECT * FROM activity ORDER BY at DESC LIMIT 250`);
  return res.rows.map(a => ({
    id: a.id,
    at: a.at.toISOString(),
    action: a.action,
    meta: a.meta
  }));
}

module.exports = {
  ORDER_STATUS,
  BATCH_STATUS,

  get COFFEES() { return COFFEES; },
  get SHOPS() { return SHOPS; },
  refreshMasters,

  // Admin master data
  listAllCoffees,
  listAllShops,
  createCoffee,
  updateCoffee,
  deleteCoffee,
  setCoffeeActive,
  createShop,
  updateShop,
  deleteShop,
  setShopActive,

  // Orders
  listOrders,
  getOrderById,
  createOrder,
  setOrderStatus,
  deleteOrder,

  // Inventory
  getInventory,
  applyInventoryChange,

  // Production
  computeRoastDemand,
  consumeRoastedForOrder,

  // Batches
  listBatches,
  createBatch,
  advanceBatch,
  deleteBatch,

  // Activity
  listActivity
};
