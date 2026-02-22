// controllers/masterController.js
const store = require("../data/store");

function clean(v) {
  return String(v ?? "").trim();
}

function red(res, params) {
  const qs = new URLSearchParams(params).toString();
  return res.redirect("/settings" + (qs ? `?${qs}` : ""));
}

function ok(res, msg, extra = {}) {
  return red(res, { master_ok: msg, ...extra });
}
function err(res, msg, extra = {}) {
  return red(res, { master_error: msg, ...extra });
}

exports.createCoffee = async (req, res) => {
  const id = clean(req.body.id);
  const name = clean(req.body.name);
  const packDefaultKg = Number(clean(req.body.packDefaultKg || "1")) || 1;

  try {
    await store.createCoffee({ id, name, packDefaultKg });
    await store.refreshMasters();
    return ok(res, "Kaffeesorte erstellt.", { tab: "coffee", coffee: id });
  } catch (e) {
    return err(res, e.message || "Fehler beim Erstellen.", { tab: "coffee", coffee: id || "" });
  }
};

exports.updateCoffee = async (req, res) => {
  const id = clean(req.body.id);
  const name = clean(req.body.name);
  const packDefaultKg = Number(clean(req.body.packDefaultKg || "1")) || 1;

  try {
    await store.updateCoffee({ id, name, packDefaultKg });
    await store.refreshMasters();
    return ok(res, "Kaffeesorte gespeichert.", { tab: "coffee", coffee: id });
  } catch (e) {
    return err(res, e.message || "Fehler beim Speichern.", { tab: "coffee", coffee: id });
  }
};

exports.deleteCoffee = async (req, res) => {
  const id = clean(req.body.id);
  try {
    await store.deleteCoffee(id);
    await store.refreshMasters();
    return ok(res, "Kaffeesorte gelöscht.", { tab: "coffee" });
  } catch (e) {
    return err(res, e.message || "Fehler beim Löschen.", { tab: "coffee", coffee: id });
  }
};

exports.createShop = async (req, res) => {
  const id = clean(req.body.id);
  const name = clean(req.body.name);

  try {
    await store.createShop({ id, name });
    await store.refreshMasters();
    return ok(res, "Filiale erstellt.", { tab: "shop", shop: id });
  } catch (e) {
    return err(res, e.message || "Fehler beim Erstellen.", { tab: "shop", shop: id || "" });
  }
};

exports.updateShop = async (req, res) => {
  const id = clean(req.body.id);
  const name = clean(req.body.name);

  try {
    await store.updateShop({ id, name });
    await store.refreshMasters();
    return ok(res, "Filiale gespeichert.", { tab: "shop", shop: id });
  } catch (e) {
    return err(res, e.message || "Fehler beim Speichern.", { tab: "shop", shop: id });
  }
};

exports.deleteShop = async (req, res) => {
  const id = clean(req.body.id);
  try {
    await store.deleteShop(id);
    await store.refreshMasters();
    return ok(res, "Filiale gelöscht.", { tab: "shop" });
  } catch (e) {
    return err(res, e.message || "Fehler beim Löschen.", { tab: "shop", shop: id });
  }
};
