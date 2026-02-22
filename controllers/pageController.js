// controllers/pageController.js
const store = require("../data/store");

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

function isShop(req) {
  const u = req.session && req.session.user;
  return u && u.role === "SHOP";
}

function getShopId(req) {
  const u = req.session && req.session.user;
  return u ? u.shopId : null;
}

exports.renderDashboard = async (req, res) => {
  const shopMode = isShop(req);
  const shopId = getShopId(req);

  // Pull data
  const allOrders = await store.listOrders();
  const inv = await store.getInventory();

  // Filter orders for shop users
  const orders = shopMode
    ? allOrders.filter(o => o.channel === "FILIALE" && String(o.shopId || "") === String(shopId || ""))
    : allOrders;

  // Admin-only metrics: demand/batches/activity
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

  res.render("dashboard", Object.assign(base("dashboard", "Dashboard", shopMode ? "Filial-Übersicht" : "Übersicht und Schnellaktionen"), {
    ordersCount: orders.length,
    demandCount,
    batchCount,
    activityCount,
    inventoryUpdatedAt: inv.updatedAt,
    hintTitle: "Seitenhinweis",
    hintLines: shopMode
      ? [
          "Sie sehen nur Bestellungen Ihrer Filiale.",
          "Neue Bestellung anlegen → Rösterei gibt frei und plant Produktion."
        ]
      : [
          "Wenn etwas dringend ist: Bestellungen → Produktion → Lager.",
          "Aktivität zeigt jede Änderung."
        ],
    hintMeta: { left: shopMode ? "Rolle: Filiale" : "Rolle: Admin", right: "Update: " + String(inv.updatedAt).slice(0, 19).replace("T", " ") }
  }));
};

exports.renderOrders = async (req, res) => {
  const shopMode = isShop(req);
  const shopId = getShopId(req);

  const all = await store.listOrders();

  // Filters
  const search = q(req, "q", "");
  const status = q(req, "status", "ALL");
  const channel = q(req, "channel", "ALL");
  const shop = q(req, "shop", "ALL");
  const range = q(req, "range", "30");

  const days = Number(range);
  const since = Number.isFinite(days) ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;

  let orders = all;

  // Hard filter for Shop role
  if (shopMode) {
    orders = orders.filter(o => o.channel === "FILIALE" && String(o.shopId || "") === String(shopId || ""));
  }

  // Apply UI filters (admin + shop)
  orders = orders.filter(o => {
    if (since && new Date(o.createdAt).getTime() < since) return false;
    if (status !== "ALL" && o.status !== status) return false;

    // Shop users always FILIALE; channel filter should not reveal others
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

  res.render("orders", Object.assign(base("orders", "Bestellungen", shopMode ? "Nur Ihre Filiale" : "Filiale und B2B Bestellungen verwalten"), {
    orders,
    shops: store.SHOPS,
    coffees: store.COFFEES,
    filters: { search, status, channel: shopMode ? "FILIALE" : channel, shop: shopMode ? String(shopId || "ALL") : shop, range },
    hintTitle: "Seitenhinweis",
    hintLines: shopMode
      ? [
          "Sie können nur Bestellungen für Ihre Filiale anlegen.",
          "Freigabe und Auslieferung macht die Rösterei."
        ]
      : [
          "Freigeben = zählt für Produktion. Ausliefern = zieht Röstkaffee ab.",
          "Nutzen Sie Filter für schnelle Übersicht."
        ],
    hintMeta: { left: shopMode ? ("Filiale: " + shopId) : "Admin", right: "Treffer: " + orders.length }
  }));
};

exports.renderProduction = async (req, res) => {
  const inv = await store.getInventory();
  const roastDemand = await store.computeRoastDemand();
  const batches = await store.listBatches();

  res.render("production", Object.assign(base("production", "Produktion", "Bedarf, Lagerabgleich und Chargen"), {
    inventory: inv,
    roastDemand,
    batches,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Charge ‘Geröstet’ bewegt Rohkaffee → Röstkaffee.",
      "Charge ‘Ausgeliefert’ reduziert Röstkaffee."
    ],
    hintMeta: { left: "Admin", right: "Chargen: " + batches.length }
  }));
};

exports.renderInventory = async (req, res) => {
  const inv = await store.getInventory();
  const shopMode = isShop(req);

  res.render("inventory", Object.assign(base("inventory", "Lager", shopMode ? "Ansicht (nur Lesen)" : "Bestände verwalten und Engpässe vermeiden"), {
    inventory: inv,
    coffees: store.COFFEES,
    hintTitle: "Seitenhinweis",
    hintLines: shopMode
      ? [
          "Filialen können Lager nur ansehen.",
          "Bestandsänderungen macht die Rösterei (Admin)."
        ]
      : [
          "Rohkaffee = grün. Röstkaffee = fertig.",
          "Jede Änderung wird in Aktivität protokolliert."
        ],
    hintMeta: { left: shopMode ? "Rolle: Filiale" : "Rolle: Admin", right: "Update: " + String(inv.updatedAt).slice(0, 19).replace("T", " ") }
  }));
};

exports.renderAnalytics = async (req, res) => {
  res.render("analytics", Object.assign(base("analytics", "Analysen", "KPIs und Berichte"), {
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Reports werden als echte KPI-Queries umgesetzt.",
      "Ziel: Entscheidungen schneller treffen."
    ],
    hintMeta: { left: "Admin", right: "Roadmap aktiv" }
  }));
};

exports.renderSettings = async (req, res) => {
  res.render("settings", Object.assign(base("settings", "Einstellungen", "Stammdaten und Regeln"), {
    coffees: store.COFFEES,
    shops: store.SHOPS,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Hier werden Sorten, Filialen und Regeln verwaltet.",
      "Als nächstes: Benutzerverwaltung und Mindestbestände."
    ],
    hintMeta: { left: "Admin", right: "Stammdaten" }
  }));
};

exports.renderActivity = async (req, res) => {
  const all = await store.listActivity();

  const search = q(req, "q", "");
  const area = q(req, "area", "ALL");
  const range = q(req, "range", "7");

  const days = Number(range);
  const since = Number.isFinite(days) ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;

  const activity = all.filter(a => {
    if (since && new Date(a.at).getTime() < since) return false;

    const act = String(a.action || "");
    const meta = JSON.stringify(a.meta || {});

    if (area !== "ALL") {
      if (area === "ORDERS" && !(act.startsWith("ORDER"))) return false;
      if (area === "INVENTORY" && !(act.startsWith("INVENTORY"))) return false;
      if (area === "BATCHES" && !(act.startsWith("BATCH"))) return false;
    }

    if (search) {
      const s = search.toLowerCase();
      const hay = (act + " " + meta).toLowerCase();
      if (!hay.includes(s)) return false;
    }

    return true;
  });

  res.render("activity", Object.assign(base("activity", "Aktivität", "Protokoll aller Aktionen"), {
    activity,
    filters: { search, area, range },
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Audit Log: jede Aktion mit Zeit und Details.",
      "Nutzen Sie Filter, um schnell Vorgänge zu finden."
    ],
    hintMeta: { left: "Admin", right: "Treffer: " + activity.length }
  }));
};
