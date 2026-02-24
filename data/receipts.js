// data/receipts.js
const { randomUUID } = require("crypto");
const db = require("../db");

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function logActivity(action, meta) {
  await db.query(
    `INSERT INTO activity (id, action, meta) VALUES ($1,$2,$3::jsonb)`,
    [randomUUID(), action, JSON.stringify(meta || {})]
  );
}

async function createReceipt({ coffeeId, coffeeName, kg, note, actorEmail }) {
  const id = randomUUID();
  const amount = num(kg);

  if (!coffeeId) throw new Error("Sorte fehlt.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("kg muss > 0 sein.");

  // 1) Save receipt
  await db.query(
    `INSERT INTO inventory_receipts (id, coffee_id, coffee_name, kg, note, actor_email)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, coffeeId, coffeeName || coffeeId, amount, note || "", actorEmail || ""]
  );

  // 2) Apply inventory change (GREEN +kg)
  await db.query(
    `UPDATE inventory SET green_kg = GREATEST(0, green_kg + $1) WHERE coffee_id = $2`,
    [amount, coffeeId]
  );

  // 3) Log activity
  await logActivity("INVENTORY_RECEIPT", { receiptId: id, coffeeId, kg: amount, note: note || "" });

  return id;
}

async function getReceiptById(id) {
  const res = await db.query(`SELECT * FROM inventory_receipts WHERE id=$1`, [id]);
  if (!res.rows.length) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    at: r.at.toISOString(),
    coffeeId: r.coffee_id,
    coffeeName: r.coffee_name,
    kg: Number(r.kg),
    note: r.note || "",
    actorEmail: r.actor_email || ""
  };
}

module.exports = { createReceipt, getReceiptById };
