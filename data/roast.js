// data/roast.js
const { randomUUID } = require("crypto");
const db = require("../db");

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

async function logActivity(action, meta) {
  await db.query(
    `INSERT INTO activity (id, action, meta) VALUES ($1,$2,$3::jsonb)`,
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

async function getGreenAvailable(coffeeId) {
  const res = await db.query(`SELECT green_kg FROM inventory WHERE coffee_id=$1`, [coffeeId]);
  if (!res.rows.length) return 0;
  return num(res.rows[0].green_kg);
}

async function createRoast({
  coffeeId,
  coffeeName,
  greenKg,
  yieldPct,
  note,
  actorEmail
}) {
  const g = num(greenKg);
  const y = clamp(num(yieldPct), 50, 100); // realistischer Bereich
  if (!coffeeId) throw new Error("Sorte fehlt.");
  if (!Number.isFinite(g) || g <= 0) throw new Error("Roh kg muss > 0 sein.");

  await ensureInventoryRow(coffeeId);

  const available = await getGreenAvailable(coffeeId);
  if (available < g) {
    throw new Error(`Nicht genug Rohkaffee. Verfügbar: ${available.toFixed(1)} kg`);
  }

  const roastedKg = num((g * y) / 100);
  if (roastedKg <= 0) throw new Error("Röst kg ist ungültig.");

  const id = randomUUID();

  // Speichere Details im note-Feld als JSON (für PDF später)
  const payload = {
    greenKg: g,
    yieldPct: y,
    roastedKg: roastedKg,
    note: String(note || "")
  };

  await db.query(
    `INSERT INTO batches (id, coffee_id, coffee_name, kg, status, note)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, coffeeId, coffeeName || coffeeId, roastedKg, "GEROESTET", JSON.stringify(payload)]
  );

  // Lagerbewegung: Roh runter, Röst hoch
  await db.query(
    `UPDATE inventory
     SET green_kg = GREATEST(0, green_kg - $1),
         roasted_kg = GREATEST(0, roasted_kg + $2)
     WHERE coffee_id = $3`,
    [g, roastedKg, coffeeId]
  );

  await logActivity("ROAST_CREATE", {
    batchId: id,
    coffeeId,
    coffeeName: coffeeName || coffeeId,
    greenKg: g,
    yieldPct: y,
    roastedKg,
    note: String(note || ""),
    actorEmail: actorEmail || ""
  });

  await logActivity("INVENTORY_MOVE", {
    from: "GREEN",
    to: "ROASTED",
    coffeeId,
    kg: roastedKg,
    greenConsumedKg: g,
    batchId: id
  });

  return id;
}

async function getBatchById(batchId) {
  const res = await db.query(`SELECT * FROM batches WHERE id=$1`, [batchId]);
  if (!res.rows.length) return null;
  const b = res.rows[0];

  let meta = {};
  try {
    meta = JSON.parse(b.note || "{}");
  } catch {
    meta = { note: b.note || "" };
  }

  return {
    id: b.id,
    coffeeId: b.coffee_id,
    coffeeName: b.coffee_name,
    roastedKg: num(b.kg),
    status: b.status,
    createdAt: b.created_at.toISOString(),
    meta
  };
}

module.exports = { createRoast, getBatchById };
