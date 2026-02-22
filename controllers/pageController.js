// controllers/pageController.js
const bcrypt = require("bcryptjs");
const store = require("../data/store");
const db = require("../db");
const adminController = require("./adminController");
let b2bController = null;
try { b2bController = require("./b2bController"); } catch (_) { b2bController = null; }

function base(activeNav, title, subtitle) {
  return {
    title,
    pageTitle: title,
    pageSubtitle: subtitle,
    activeNav,
    systemStatus: { variant: "ok", text: "Betrieb normal" }
  };
}

function q(req, key, fallback = "") {
  const v = req.query && req.query[key] !== undefined ? String(req.query[key]) : "";
  return v.trim() || fallback;
}

function getUser(req) {
  return req.session && req.session.user ? req.session.user : null;
}

function isAdmin(req) {
  const u = getUser(req);
  return !!u && u.role === "ADMIN";
}

function isShop(req) {
  const u = getUser(req);
  return !!u && u.role === "SHOP";
}

function getShopId(req) {
  const u = getUser(req);
  return u ? u.shopId : null;
}

function countByStatus(orders) {
  const statuses = ["EINGEGANGEN", "FREIGEGEBEN", "IN_PRODUKTION", "VERPACKT", "AUSGELIEFERT"];
  const counts = {};
  for (const s of statuses) counts[s] = 0;
  for (const o of orders || []) {
    const st = String(o.status || "");
    if (counts[st] !== undefined) counts[st] += 1;
  }
  return counts;
}

function nextDeliveryDate(orders) {
  const open = (orders || []).filter(o => String(o.status) !== "AUSGELIEFERT" && o.deliveryDate);
  if (!open.length) return null;
  open.sort((a, b) => String(a.deliveryDate).localeCompare(String(b.deliveryDate)));
  return open[0].deliveryDate;
}

function sortOrdersSmart(list) {
  const rank = (st) => {
    if (st === "EINGEGANGEN") return 1;
    if (st === "FREIGEGEBEN") return 2;
    if (st === "IN_PRODUKTION") return 3;
    if (st === "VERPACKT") return 4;
    if (st === "AUSGELIEFERT") return 9;
    return 8;
  };

  return [...(list || [])].sort((a, b) => {
    const ra = rank(String(a.status || ""));
    const rb = rank(String(b.status || ""));
    if (ra !== rb) return ra - rb;

    const da = String(a.deliveryDate || "9999-99-99");
    const db = String(b.deliveryDate || "9999-99-99");
    if (da !== db) return da.localeCompare(db);

    const ca = new Date(a.createdAt || 0).getTime();
    const cb = new Date(b.createdAt || 0).getTime();
    return cb - ca;
  });
}

/* =========================
   AUTH PAGES
========================= */
exports.renderLogin = async (req, res) => {
  const msg = q(req, "msg", "");
  res.render("login", Object.assign(base("login", "Anmelden", "Bitte melden Sie sich an."), {
    msg
  }));
};

exports.handleLogin = async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "").trim();

  if (!email || !password) return res.redirect("/login?msg=" + encodeURIComponent("Bitte E-Mail und Passwort eingeben."));

  const r = await db.query(
    `SELECT id, email, name, role, shop_id, password_hash
     FROM users
     WHERE email=$1
     LIMIT 1`,
    [email]
  );

  if (!r.rows.length) return res.redirect("/login?msg=" + encodeURIComponent("Benutzer nicht gefunden."));

  const u = r.rows[0];
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.redirect("/login?msg=" + encodeURIComponent("Falsches Passwort."));

  // Session user object used by middleware/auth + UI
  req.session.user = {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    shopId: u.shop_id
  };

  return res.redirect("/dashboard");
};

exports.handleLogout = async (req, res) => {
  req.session.destroy(() => res.redirect("/login?msg=" + encodeURIComponent("Abgemeldet.")));
};

/* =========================
   DASHBOARD
========================= */
exports.renderDashboard = async (req, res) => {
  const shopMode = isShop(req);
  const shopId = getShopId(req);

  const allOrders = await store.listOrders();
  const inv = await store.getInventory();

  const orders = shopMode
    ? allOrders.filter(o => o.channel === "FILIALE" && String(o.shopId || "") === String(shopId || ""))
    : allOrders;

  let demandCount = 0;
  let batchCount = 0;
  let activityCount = 0;

  if (!shopMode) {
    const demand = await store.computeRoastDemand();
    const batches = await store.listBatches();
    const activity = await store.listActivity();
    demandCount = demand.length;
    batchCount = batches.length;
    activityCount = activity.length;
  }

  const shopStatusCounts = shopMode ? countByStatus(orders) : null;
  const shopNextDelivery = shopMode ? nextDeliveryDate(orders) : null;

  res.render("dashboard", Object.assign(base("dashboard", "Dashboard", shopMode ? "Filial-Übersicht" : "Übersicht und Schnellaktionen"), {
    ordersCount: orders.length,
    demandCount,
    batchCount,
    activityCount,
    inventoryUpdatedAt: inv.updatedAt,

    shopMode,
    shopId,
    shopStatusCounts,
    shopNextDelivery,

    hintTitle: "Seitenhinweis",
    hintLines: shopMode
      ? [
          "Sie sehen nur Bestellungen Ihrer Filiale.",
          "Sie können Bestellungen anlegen und den Status verfolgen.",
          "Freigabe, Produktion und Auslieferung übernimmt die Rösterei."
        ]
      : [
          "Wenn etwas dringend ist: Bestellungen → Produktion → Lager.",
          "Aktivität zeigt jede Änderung."
        ]
  }));
};

/* =========================
   ORDERS
========================= */
exports.renderOrders = async (req, res) => {
  const shopMode = isShop(req);
  const shopId = getShopId(req);

  const all = await store.listOrders();

  const search = q(req, "q", "");
  const status = q(req, "status", "ALL");
  const channel = q(req, "channel", "ALL");
  const shop = q(req, "shop", "ALL");
  const range = q(req, "range", "30");

  const days = Number(range);
  const since = Number.isFinite(days) ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;

  let orders = all;

  if (shopMode) {
    orders = orders.filter(o => o.channel === "FILIALE" && String(o.shopId || "") === String(shopId || ""));
  }

  orders = orders.filter(o => {
    if (since && new Date(o.createdAt).getTime() < since) return false;
    if (status !== "ALL" && o.status !== status) return false;

    if (!shopMode && channel !== "ALL" && o.channel !== channel) return false;
    if (!shopMode && shop !== "ALL" && String(o.shopId || "") !== String(shop)) return false;

    if (search) {
      const s = search.toLowerCase();
      const hay = [
        o.id, o.status, o.channel, o.shopId, o.customerName, o.deliveryDate, o.note,
        ...(o.items || []).map(it => it.coffeeName)
      ].join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  orders = sortOrdersSmart(orders);

  res.render("orders", Object.assign(base("orders", "Bestellungen", shopMode ? "Nur Ihre Filiale" : "Filiale und B2B Bestellungen verwalten"), {
    orders,
    shops: store.SHOPS,
    coffees: store.COFFEES,
    filters: {
      search,
      status,
      channel: shopMode ? "FILIALE" : channel,
      shop: shopMode ? String(shopId || "ALL") : shop,
      range
    },
    hintTitle: "Seitenhinweis",
    hintLines: shopMode
      ? [
          "Sie können Bestellungen nur für Ihre Filiale anlegen.",
          "Statusverfolgung ist für Filialen sichtbar.",
          "Freigabe und Auslieferung übernimmt die Rösterei."
        ]
      : [
          "Freigeben = zählt für Produktion.",
          "Ausliefern = zieht Röstkaffee ab."
        ]
  }));
};

/* =========================
   ADMIN PAGES
========================= */
exports.renderProduction = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Nicht erlaubt.");

  const inv = await store.getInventory();
  const roastDemand = await store.computeRoastDemand();
  const batches = await store.listBatches();

  res.render("production", Object.assign(base("production", "Produktion", "Bedarf, Lagerabgleich und Chargen"), {
    inventory: inv,
    roastDemand,
    batches
  }));
};

exports.renderInventory = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Nicht erlaubt.");

  const inv = await store.getInventory();
  res.render("inventory", Object.assign(base("inventory", "Lager", "Bestände verwalten und Engpässe vermeiden"), {
    inventory: inv,
    coffees: store.COFFEES
  }));
};

exports.renderAnalytics = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Nicht erlaubt.");
  res.render("analytics", Object.assign(base("analytics", "Analysen", "KPIs und Berichte"), {}));
};

exports.renderActivity = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Nicht erlaubt.");
  const activity = await store.listActivity();
  res.render("activity", Object.assign(base("activity", "Aktivität", "Protokoll aller Aktionen"), {
    activity,
    query: req.query
  }));
};

/* =========================
   SETTINGS (ADMIN)
========================= */
exports.renderSettings = async (req, res) => {
  if (!isAdmin(req)) return res.status(403).send("Nicht erlaubt.");

  const users = await adminController.listUsers();
  const b2b = b2bController ? await b2bController.list() : [];

  res.render("settings", Object.assign(base("settings", "Einstellungen", "Stammdaten und Benutzerverwaltung"), {
    coffees: store.COFFEES,
    shops: store.SHOPS,
    users,
    b2b,
    query: req.query
  }));
};
