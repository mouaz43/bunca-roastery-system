// controllers/actionController.js
const store = require("../data/store");

function num(v) {
  const n = Number.parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}
function cleanText(v) {
  return String(v ?? "").trim();
}

function parseDateToISO(input) {
  const s = cleanText(input);
  if (!s) return new Date().toISOString().slice(0, 10);

  // If already ISO: 2026-02-20
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // German: 20.02.2026 or 20/02/2026 or 20-02-2026
  const m = s.match(/^(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, "0");
    const mm = m[2].padStart(2, "0");
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // Fallback: try Date parsing (last resort)
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  // If invalid, use today (and later we can show a nice validation message)
  return new Date().toISOString().slice(0, 10);
}

function errorRedirect(res, path, msg) {
  const qs = msg ? `?error=${encodeURIComponent(msg)}` : "";
  return res.redirect(path + qs);
}

// ORDERS
exports.createOrder = async (req, res) => {
  const channel = cleanText(req.body.channel) || "FILIALE";
  const shopId = cleanText(req.body.shopId) || null;
  const customerName = cleanText(req.body.customerName) || null;

  const deliveryDate = parseDateToISO(req.body.deliveryDate);
  const note = cleanText(req.body.note);

  const items = [];
  for (let i = 1; i <= 8; i++) {
    const coffeeId = cleanText(req.body[`item${i}CoffeeId`]);
    const kg = num(req.body[`item${i}Kg`]);
    if (!coffeeId || kg <= 0) continue;

    const coffee = store.COFFEES.find(c => c.id === coffeeId);
    items.push({ coffeeId, coffeeName: coffee ? coffee.name : coffeeId, kg });
  }

  if (!items.length) {
    return errorRedirect(res, "/orders", "Bestellung muss mindestens 1 Position enthalten.");
  }

  if (channel === "FILIALE" && !shopId) {
    return errorRedirect(res, "/orders", "Bitte Filiale auswählen.");
  }
  if (channel === "B2B" && !customerName) {
    return errorRedirect(res, "/orders", "Bitte B2B Kundenname eintragen.");
  }

  await store.createOrder({
    channel,
    shopId: channel === "FILIALE" ? shopId : null,
    customerName: channel === "B2B" ? customerName : null,
    deliveryDate,
    items,
    note,
    status: "EINGEGANGEN"
  });

  res.redirect("/orders");
};

exports.advanceOrder = async (req, res) => {
  const id = req.params.id;
  const order = await store.getOrderById(id);
  if (!order) return res.redirect("/orders");

  const statuses = store.ORDER_STATUS;
  const idx = statuses.indexOf(order.status);

  if (idx < 0) return errorRedirect(res, "/orders", "Unbekannter Status.");
  if (idx >= statuses.length - 1) return errorRedirect(res, "/orders", "Bestellung ist bereits abgeschlossen.");

  const next = statuses[idx + 1];
  if (next === "IN_PRODUKTION" && order.status !== "FREIGEGEBEN") {
    return errorRedirect(res, "/orders", "Nur freigegebene Bestellungen können in Produktion gehen.");
  }

  await store.setOrderStatus(id, next);
  res.redirect("/orders");
};

exports.approveOrder = async (req, res) => {
  const id = req.params.id;
  const order = await store.getOrderById(id);
  if (!order) return res.redirect("/orders");

  if (order.status === "AUSGELIEFERT") return errorRedirect(res, "/orders", "Bereits ausgeliefert.");
  if (order.status !== "EINGEGANGEN" && order.status !== "ENTWURF") {
    return errorRedirect(res, "/orders", "Freigabe ist nur aus Entwurf oder Eingegangen erlaubt.");
  }

  await store.setOrderStatus(id, "FREIGEGEBEN");
  res.redirect("/orders");
};

exports.deleteOrder = async (req, res) => {
  await store.deleteOrder(req.params.id);
  res.redirect("/orders");
};

exports.deliverOrder = async (req, res) => {
  const id = req.params.id;
  const order = await store.getOrderById(id);
  if (!order) return res.redirect("/orders");

  if (order.status === "AUSGELIEFERT") return errorRedirect(res, "/orders", "Bereits ausgeliefert.");

  const ok = await store.consumeRoastedForOrder(order);
  if (!ok.ok) return errorRedirect(res, "/orders", `Nicht genug Röstkaffee: ${ok.reason}`);

  await store.setOrderStatus(id, "AUSGELIEFERT");
  res.redirect("/orders");
};

// INVENTORY
exports.applyInventoryChange = async (req, res) => {
  const type = cleanText(req.body.type);
  const coffeeId = cleanText(req.body.coffeeId);
  const deltaKg = num(req.body.deltaKg);

  if (!coffeeId) return errorRedirect(res, "/inventory", "Bitte Sorte wählen.");
  if (!Number.isFinite(deltaKg) || deltaKg === 0) return errorRedirect(res, "/inventory", "Bitte Menge eingeben.");

  await store.applyInventoryChange({
    type,
    coffeeId,
    deltaKg,
    note: cleanText(req.body.note)
  });

  res.redirect("/inventory");
};

// BATCHES
exports.createBatch = async (req, res) => {
  const coffeeId = cleanText(req.body.coffeeId);
  const kg = num(req.body.kg);
  const note = cleanText(req.body.note);

  if (!coffeeId || kg <= 0) return errorRedirect(res, "/production", "Bitte Sorte und kg eingeben.");

  const coffee = store.COFFEES.find(c => c.id === coffeeId);
  await store.createBatch({
    coffeeId,
    coffeeName: coffee ? coffee.name : coffeeId,
    kg,
    status: "GEPLANT",
    note
  });

  res.redirect("/production");
};

exports.advanceBatch = async (req, res) => {
  await store.advanceBatch(req.params.id);
  res.redirect("/production");
};

exports.deleteBatch = async (req, res) => {
  await store.deleteBatch(req.params.id);
  res.redirect("/production");
};
