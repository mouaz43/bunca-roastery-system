// controllers/actionController.js
const store = require("../data/store");

function clean(v) { return String(v ?? "").trim(); }
function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function isISODate(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}

function redirectBack(req, res, fallback = "/orders") {
  const r = req.get("referer");
  return res.redirect(r || fallback);
}

// Accept either:
// - req.body.payload JSON (recommended from new UI)
// - or legacy form fields (best effort)
function parseOrderPayload(req) {
  if (req.body && req.body.payload) {
    try {
      const p = JSON.parse(req.body.payload);
      return p && typeof p === "object" ? p : null;
    } catch (e) {
      return null;
    }
  }

  // Legacy fallback (if you had old forms)
  const channel = clean(req.body.channel) || "FILIALE";
  const shopId = clean(req.body.shopId) || null;
  const customerName = clean(req.body.customerName) || null;
  const deliveryDate = clean(req.body.deliveryDate);
  const note = clean(req.body.note);

  // Attempt items arrays
  const coffeeIdArr = [].concat(req.body.coffeeId || req.body.coffeeIds || []);
  const kgArr = [].concat(req.body.kg || req.body.kgs || []);
  const coffeeNameArr = [].concat(req.body.coffeeName || req.body.coffeeNames || []);

  const items = [];
  for (let i = 0; i < Math.max(coffeeIdArr.length, kgArr.length); i++) {
    const coffeeId = clean(coffeeIdArr[i]);
    const kg = toNum(kgArr[i], NaN);
    const coffeeName = clean(coffeeNameArr[i]);
    if (!coffeeId || !Number.isFinite(kg) || kg <= 0) continue;
    items.push({ coffeeId, coffeeName: coffeeName || coffeeId, kg });
  }

  return { channel, shopId, customerName, deliveryDate, note, items };
}

function requireShopScope(req, payload) {
  const u = req.session && req.session.user;
  if (!u) return { ok: false, msg: "Nicht eingeloggt." };

  // Shop user can only create FILIALE orders for own shopId
  if (u.role === "SHOP") {
    if (payload.channel !== "FILIALE") return { ok: false, msg: "Filialen dürfen nur Filial-Bestellungen anlegen." };
    if (!u.shopId) return { ok: false, msg: "ShopId fehlt im Account." };
    payload.shopId = u.shopId;
  }

  // Admin can create anything, but must have correct fields
  return { ok: true };
}

exports.createOrder = async (req, res) => {
  const payload = parseOrderPayload(req);
  if (!payload) return res.redirect("/orders?err=" + encodeURIComponent("Ungültige Nutzdaten (payload)."));

  payload.channel = clean(payload.channel || "FILIALE").toUpperCase();

  // Normalize channel names
  if (payload.channel === "B2B" || payload.channel === "B2BCUSTOMER") payload.channel = "B2B";
  if (payload.channel === "FILIALE" || payload.channel === "SHOP") payload.channel = "FILIALE";

  payload.shopId = clean(payload.shopId) || null;
  payload.customerName = clean(payload.customerName) || null;
  payload.deliveryDate = clean(payload.deliveryDate);
  payload.note = clean(payload.note);

  payload.items = Array.isArray(payload.items) ? payload.items : [];
  payload.items = payload.items
    .map(it => ({
      coffeeId: clean(it.coffeeId),
      coffeeName: clean(it.coffeeName),
      kg: toNum(it.kg, NaN)
    }))
    .filter(it => it.coffeeId && it.coffeeName && Number.isFinite(it.kg) && it.kg > 0);

  const scope = requireShopScope(req, payload);
  if (!scope.ok) return res.redirect("/orders?err=" + encodeURIComponent(scope.msg));

  // Validate
  if (!["FILIALE", "B2B"].includes(payload.channel)) {
    return res.redirect("/orders?err=" + encodeURIComponent("Ungültiger Kanal."));
  }

  if (payload.channel === "FILIALE" && !payload.shopId) {
    return res.redirect("/orders?err=" + encodeURIComponent("Für Filial-Bestellung ist Filiale Pflicht."));
  }

  if (payload.channel === "B2B" && !payload.customerName) {
    return res.redirect("/orders?err=" + encodeURIComponent("Für B2B ist Kunde/Name Pflicht."));
  }

  if (!payload.deliveryDate || !isISODate(payload.deliveryDate)) {
    return res.redirect("/orders?err=" + encodeURIComponent("Lieferdatum muss im Format YYYY-MM-DD sein."));
  }

  if (!payload.items.length) {
    return res.redirect("/orders?err=" + encodeURIComponent("Bitte mindestens 1 Position hinzufügen."));
  }

  // Default status
  payload.status = "EINGEGANGEN";

  const id = await store.createOrder(payload);
  return res.redirect("/orders?ok=" + encodeURIComponent("Bestellung erstellt.") + "&order=" + encodeURIComponent(id));
};

exports.approveOrder = async (req, res) => {
  const id = clean(req.params.id);
  if (!id) return redirectBack(req, res);
  await store.setOrderStatus(id, "FREIGEGEBEN");
  return redirectBack(req, res, "/orders?order=" + encodeURIComponent(id));
};

exports.advanceOrder = async (req, res) => {
  const id = clean(req.params.id);
  if (!id) return redirectBack(req, res);

  const o = await store.getOrderById(id);
  if (!o) return redirectBack(req, res);

  const flow = ["EINGEGANGEN", "FREIGEGEBEN", "IN_PRODUKTION", "VERPACKT", "AUSGELIEFERT"];
  const idx = flow.indexOf(String(o.status || ""));
  const next = idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : flow[flow.length - 1];

  if (next === "AUSGELIEFERT") {
    const resConsume = await store.consumeRoastedForOrder(o);
    if (!resConsume.ok) {
      return res.redirect("/orders?order=" + encodeURIComponent(id) + "&err=" + encodeURIComponent("Nicht genug Röstkaffee: " + resConsume.reason));
    }
  }

  await store.setOrderStatus(id, next);
  return redirectBack(req, res, "/orders?order=" + encodeURIComponent(id));
};

exports.deliverOrder = async (req, res) => {
  const id = clean(req.params.id);
  if (!id) return redirectBack(req, res);

  const o = await store.getOrderById(id);
  if (!o) return redirectBack(req, res);

  const resConsume = await store.consumeRoastedForOrder(o);
  if (!resConsume.ok) {
    return res.redirect("/orders?order=" + encodeURIComponent(id) + "&err=" + encodeURIComponent("Nicht genug Röstkaffee: " + resConsume.reason));
  }

  await store.setOrderStatus(id, "AUSGELIEFERT");
  return redirectBack(req, res, "/orders?order=" + encodeURIComponent(id));
};

exports.deleteOrder = async (req, res) => {
  const id = clean(req.params.id);
  if (!id) return redirectBack(req, res);
  await store.deleteOrder(id);
  return res.redirect("/orders?ok=" + encodeURIComponent("Bestellung gelöscht."));
};

// Existing endpoints used elsewhere (keep)
exports.applyInventoryChange = async (req, res) => {
  const ok = await store.applyInventoryChange({
    type: clean(req.body.type),
    coffeeId: clean(req.body.coffeeId),
    deltaKg: clean(req.body.deltaKg),
    note: clean(req.body.note)
  });
  return res.redirect("/inventory?ok=" + encodeURIComponent(ok ? "Gespeichert" : "Fehler"));
};

exports.createBatch = async (req, res) => {
  await store.createBatch({
    coffeeId: clean(req.body.coffeeId),
    coffeeName: clean(req.body.coffeeName),
    kg: toNum(req.body.kg, 0),
    status: clean(req.body.status),
    note: clean(req.body.note)
  });
  return res.redirect("/production?ok=" + encodeURIComponent("Charge erstellt."));
};

exports.advanceBatch = async (req, res) => {
  await store.advanceBatch(clean(req.params.id));
  return res.redirect("/production?ok=" + encodeURIComponent("Charge aktualisiert."));
};

exports.deleteBatch = async (req, res) => {
  await store.deleteBatch(clean(req.params.id));
  return res.redirect("/production?ok=" + encodeURIComponent("Charge gelöscht."));
};
