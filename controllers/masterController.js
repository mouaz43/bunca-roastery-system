// controllers/masterController.js
const store = require("../data/store");

function clean(v) { return String(v ?? "").trim(); }
function num(v, fallback = 1) {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function red(res, params) {
  const qs = new URLSearchParams(params).toString();
  return res.redirect("/settings" + (qs ? `?${qs}` : ""));
}
function ok(res, msg, extra = {}) { return red(res, { master_ok: msg, ...extra }); }
function err(res, msg, extra = {}) { return red(res, { master_error: msg, ...extra }); }

exports.createCoffee = async (req, res) => {
  const id = clean(req.body.id).toUpperCase();
  const name = clean(req.body.name);
  const packDefaultKg = num(req.body.packDefaultKg, 1);

  try {
    await store.createCoffee({ id, name, packDefaultKg });
    await store.refreshMasters();
    return ok(res, "Kaffeesorte erstellt.", { tab: "coffee", coffee: id });
  } catch (e) {
    console.error("MASTER createCoffee failed:", e);
    return err(res, e.message || "Fehler beim Erstellen.", { tab: "coffee", coffee: id });
  }
};

exports.updateCoffee = async (req, res) => {
  const id = clean(req.body.id);
  const name = clean(req.body.name);
  const packDefaultKg = num(req.body.packDefaultKg, 1);

  try {
    await store.updateCoffee({ id, name, packDefaultKg });
    await store.refreshMasters();
    return ok(res, "Kaffeesorte gespeichert.", { tab: "coffee", coffee: id });
  } catch (e) {
    console.error("MASTER updateCoffee failed:", e);
    return err(res, e.message || "Fehler beim Speichern.", { tab: "coffee", coffee: id });
  }
};

exports.archiveCoffee = async (req, res) => {
  const id = clean(req.body.id);
  try {
    await store.setCoffeeActive(id, false);
    await store.refreshMasters();
    return ok(res, "Kaffeesorte archiviert.", { tab: "coffee", coffee: id, showArchive: "1" });
  } catch (e) {
    console.error("MASTER archiveCoffee failed:", e);
    return err(res, e.message || "Fehler beim Archivieren.", { tab: "coffee", coffee: id });
  }
};

exports.restoreCoffee = async (req, res) => {
  const id = clean(req.body.id);
  try {
    await store.setCoffeeActive(id, true);
    await store.refreshMasters();
    return ok(res, "Kaffeesorte wiederhergestellt.", { tab: "coffee", coffee: id });
  } catch (e) {
    console.error("MASTER restoreCoffee failed:", e);
    return err(res, e.message || "Fehler beim Wiederherstellen.", { tab: "coffee", coffee: id });
  }
};

exports.deleteCoffee = async (req, res) => {
  const id = clean(req.body.id);
  try {
    // still supported: will delete if unused, archive if used
    await store.deleteCoffee(id);
    await store.refreshMasters();
    return ok(res, "Aktion ausgeführt (gelöscht oder archiviert).", { tab: "coffee", showArchive: "1" });
  } catch (e) {
    console.error("MASTER deleteCoffee failed:", e);
    return err(res, e.message || "Fehler.", { tab: "coffee", coffee: id, showArchive: "1" });
  }
};

exports.createShop = async (req, res) => {
  const id = clean(req.body.id).toUpperCase();
  const name = clean(req.body.name);

  try {
    await store.createShop({ id, name });
    await store.refreshMasters();
    return ok(res, "Filiale erstellt.", { tab: "shop", shop: id });
  } catch (e) {
    console.error("MASTER createShop failed:", e);
    return err(res, e.message || "Fehler beim Erstellen.", { tab: "shop", shop: id });
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
    console.error("MASTER updateShop failed:", e);
    return err(res, e.message || "Fehler beim Speichern.", { tab: "shop", shop: id });
  }
};

exports.archiveShop = async (req, res) => {
  const id = clean(req.body.id);
  try {
    await store.setShopActive(id, false);
    await store.refreshMasters();
    return ok(res, "Filiale archiviert.", { tab: "shop", shop: id, showArchive: "1" });
  } catch (e) {
    console.error("MASTER archiveShop failed:", e);
    return err(res, e.message || "Fehler beim Archivieren.", { tab: "shop", shop: id });
  }
};

exports.restoreShop = async (req, res) => {
  const id = clean(req.body.id);
  try {
    await store.setShopActive(id, true);
    await store.refreshMasters();
    return ok(res, "Filiale wiederhergestellt.", { tab: "shop", shop: id });
  } catch (e) {
    console.error("MASTER restoreShop failed:", e);
    return err(res, e.message || "Fehler beim Wiederherstellen.", { tab: "shop", shop: id });
  }
};

exports.deleteShop = async (req, res) => {
  const id = clean(req.body.id);
  try {
    await store.deleteShop(id);
    await store.refreshMasters();
    return ok(res, "Aktion ausgeführt (gelöscht oder archiviert).", { tab: "shop", showArchive: "1" });
  } catch (e) {
    console.error("MASTER deleteShop failed:", e);
    return err(res, e.message || "Fehler.", { tab: "shop", shop: id, showArchive: "1" });
  }
};
