// controllers/b2bController.js
const { randomUUID } = require("crypto");
const db = require("../db");

function clean(v) { return String(v ?? "").trim(); }
function red(res, params) {
  const qs = new URLSearchParams(params).toString();
  return res.redirect("/settings" + (qs ? `?${qs}` : ""));
}
function ok(res, msg) { return red(res, { tab: "b2b", b2b_ok: msg }); }
function err(res, msg) { return red(res, { tab: "b2b", b2b_error: msg }); }

exports.list = async () => {
  const r = await db.query(`SELECT * FROM b2b_customers ORDER BY created_at DESC`);
  return r.rows.map(x => ({
    id: x.id,
    name: x.name,
    email: x.email || "",
    phone: x.phone || "",
    address: x.address || "",
    note: x.note || "",
    createdAt: x.created_at ? x.created_at.toISOString() : null
  }));
};

exports.create = async (req, res) => {
  const name = clean(req.body.name);
  if (!name) return err(res, "Name ist Pflicht.");
  await db.query(
    `INSERT INTO b2b_customers (id, name, email, phone, address, note)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [randomUUID(), name, clean(req.body.email), clean(req.body.phone), clean(req.body.address), clean(req.body.note)]
  );
  return ok(res, "B2B Kunde erstellt.");
};

exports.update = async (req, res) => {
  const id = clean(req.body.id);
  const name = clean(req.body.name);
  if (!id) return err(res, "ID fehlt.");
  if (!name) return err(res, "Name ist Pflicht.");
  await db.query(
    `UPDATE b2b_customers SET name=$1, email=$2, phone=$3, address=$4, note=$5 WHERE id=$6`,
    [name, clean(req.body.email), clean(req.body.phone), clean(req.body.address), clean(req.body.note), id]
  );
  return ok(res, "B2B Kunde gespeichert.");
};

exports.remove = async (req, res) => {
  const id = clean(req.body.id);
  if (!id) return err(res, "ID fehlt.");
  await db.query(`DELETE FROM b2b_customers WHERE id=$1`, [id]);
  return ok(res, "B2B Kunde gelöscht.");
};
