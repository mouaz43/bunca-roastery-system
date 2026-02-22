// controllers/masterController.js
const store = require("../data/store");

function clean(v) {
  return String(v ?? "").trim();
}

exports.createCoffee = async (req, res) => {
  const id = clean(req.body.id);
  const name = clean(req.body.name);
  const pack = clean(req.body.packDefaultKg || "1");

  if (!id || !name) return res.redirect("/settings?master_error=" + encodeURIComponent("Coffee: ID und Name sind Pflicht."));
  await store.createCoffee({ id, name, packDefaultKg: Number(pack) || 1 });
  await store.refreshMasters();
  return res.redirect("/settings?master_ok=" + encodeURIComponent("Kaffeesorte erstellt."));
};

exports.updateCoffee = async (req, res) => {
  const id = clean(req.body.id);
  const name = clean(req.body.name);
  const pack = clean(req.body.packDefaultKg || "1");

  if (!id) return res.redirect("/settings?master_error=" + encodeURIComponent("Coffee: ID fehlt."));
  await store.updateCoffee({ id, name, packDefaultKg: Number(pack) || 1 });
  await store.refreshMasters();
  return res.redirect("/settings?master_ok=" + encodeURIComponent("Kaffeesorte aktualisiert."));
};

exports.deleteCoffee = async (req, res) => {
  const id = clean(req.body.id);
  if (!id) return res.redirect("/settings?master_error=" + encodeURIComponent("Coffee: ID fehlt."));
  await store.deleteCoffee(id);
  await store.refreshMasters();
  return res.redirect("/settings?master_ok=" + encodeURIComponent("Kaffeesorte gelöscht."));
};

exports.createShop = async (req, res) => {
  const id = clean(req.body.id);
  const name = clean(req.body.name);
  if (!id || !name) return res.redirect("/settings?master_error=" + encodeURIComponent("Shop: ID und Name sind Pflicht."));
  await store.createShop({ id, name });
  await store.refreshMasters();
  return res.redirect("/settings?master_ok=" + encodeURIComponent("Filiale erstellt."));
};

exports.updateShop = async (req, res) => {
  const id = clean(req.body.id);
  const name = clean(req.body.name);
  if (!id || !name) return res.redirect("/settings?master_error=" + encodeURIComponent("Shop: ID und Name sind Pflicht."));
  await store.updateShop({ id, name });
  await store.refreshMasters();
  return res.redirect("/settings?master_ok=" + encodeURIComponent("Filiale aktualisiert."));
};

exports.deleteShop = async (req, res) => {
  const id = clean(req.body.id);
  if (!id) return res.redirect("/settings?master_error=" + encodeURIComponent("Shop: ID fehlt."));
  await store.deleteShop(id);
  await store.refreshMasters();
  return res.redirect("/settings?master_ok=" + encodeURIComponent("Filiale gelöscht."));
};
