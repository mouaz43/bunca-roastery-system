// controllers/masterController.js
const store = require("../data/store");

function clean(v) { return String(v ?? "").trim(); }

function redirectErr(res, msg) {
  return res.redirect("/settings?master_error=" + encodeURIComponent(msg));
}
function redirectOk(res, msg) {
  return res.redirect("/settings?master_ok=" + encodeURIComponent(msg));
}

exports.createCoffee = async (req, res) => {
  try {
    await store.createCoffee({
      id: clean(req.body.id),
      name: clean(req.body.name),
      packDefaultKg: Number(clean(req.body.packDefaultKg || "1")) || 1
    });
    await store.refreshMasters();
    return redirectOk(res, "Kaffeesorte erstellt.");
  } catch (e) {
    return redirectErr(res, e.message || "Fehler beim Erstellen.");
  }
};

exports.updateCoffee = async (req, res) => {
  try {
    await store.updateCoffee({
      id: clean(req.body.id),
      name: clean(req.body.name),
      packDefaultKg: Number(clean(req.body.packDefaultKg || "1")) || 1
    });
    await store.refreshMasters();
    return redirectOk(res, "Kaffeesorte aktualisiert.");
  } catch (e) {
    return redirectErr(res, e.message || "Fehler beim Aktualisieren.");
  }
};

exports.deleteCoffee = async (req, res) => {
  try {
    await store.deleteCoffee(clean(req.body.id));
    await store.refreshMasters();
    return redirectOk(res, "Kaffeesorte gelöscht.");
  } catch (e) {
    return redirectErr(res, e.message || "Fehler beim Löschen.");
  }
};

exports.createShop = async (req, res) => {
  try {
    await store.createShop({ id: clean(req.body.id), name: clean(req.body.name) });
    await store.refreshMasters();
    return redirectOk(res, "Filiale erstellt.");
  } catch (e) {
    return redirectErr(res, e.message || "Fehler beim Erstellen.");
  }
};

exports.updateShop = async (req, res) => {
  try {
    await store.updateShop({ id: clean(req.body.id), name: clean(req.body.name) });
    await store.refreshMasters();
    return redirectOk(res, "Filiale aktualisiert.");
  } catch (e) {
    return redirectErr(res, e.message || "Fehler beim Aktualisieren.");
  }
};

exports.deleteShop = async (req, res) => {
  try {
    await store.deleteShop(clean(req.body.id));
    await store.refreshMasters();
    return redirectOk(res, "Filiale gelöscht.");
  } catch (e) {
    return redirectErr(res, e.message || "Fehler beim Löschen.");
  }
};
