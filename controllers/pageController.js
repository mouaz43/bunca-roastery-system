// controllers/pageController.js
const store = require("../data/store");

function base(activeNav, title, subtitle) {
  return {
    title,
    pageTitle: title,
    pageSubtitle: subtitle,
    activeNav,
    user: { role: "Admin", location: "Frankfurt" },
    systemStatus: { variant: "ok", text: "Betrieb normal" }
  };
}

function q(req, key, fallback = "") {
  const v = req.query && req.query[key] !== undefined ? String(req.query[key]) : "";
  return v.trim() || fallback;
}

exports.renderHome = async (req, res) => {
  res.render("home", Object.assign(base("dashboard", "Start", "Schneller Einstieg"), {
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Starten Sie bei Bestellungen. Freigaben erzeugen Produktionsbedarf.",
      "Lager regelmäßig pflegen, damit Auslieferungen funktionieren."
    ],
    hintMeta: { left: "Workflow", right: "DB: aktiv" }
  }));
};

exports.renderDashboard = async (req, res) => {
  const orders = await store.listOrders();
  const inv = await store.getInventory();
  const demand = await store.computeRoastDemand();
  const batches = await store.listBatches();
  const activity = await store.listActivity();

  res.render("dashboard", Object.assign(base("dashboard", "Dashboard", "Übersicht und Schnellaktionen"), {
    ordersCount: orders.length,
    demandCount: demand.length,
    batchCount: batches.length,
    activityCount: activity.length,
    inventoryUpdatedAt: inv.updatedAt,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Wenn etwas dringend ist: Bestellungen → Produktion → Lager.",
      "Wenn etwas komisch ist: Aktivität zeigt jede Änderung."
    ],
    hintMeta: { left: "Persistente Daten", right: "Update: " + String(inv.updatedAt).slice(0, 19).replace("T", " ") }
  }));
};

exports.renderOrders = async (req, res) => {
  const all = await store.listOrders();

  const search = q(req, "q", "");
  const status = q(req, "status", "ALL");
  const channel = q(req, "channel", "ALL");
  const shop = q(req, "shop", "ALL");
  const range = q(req, "range", "30"); // days

  const days = Number(range);
  const since = Number.isFinite(days) ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;

  let orders = all.filter(o => {
    if (since && new Date(o.createdAt).getTime() < since) return false;
    if (status !== "ALL" && o.status !== status) return false;
    if (channel !== "ALL" && o.channel !== channel) return false;
    if (shop !== "ALL" && (o.shopId || "") !== shop) return false;

    if (search) {
      const s = search.toLowerCase();
      const hay = [
        o.id,
        o.status,
        o.channel,
        o.shopId,
        o.customerName,
        o.deliveryDate,
        o.note,
        ...(o.items || []).map(it => it.coffeeName)
      ].join(" ").toLowerCase();
      if (!hay.includes(s)) return false;
    }
    return true;
  });

  res.render("orders", Object.assign(base("orders", "Bestellungen", "Filiale und B2B Bestellungen verwalten"), {
    orders,
    shops: store.SHOPS,
    coffees: store.COFFEES,
    filters: { search, status, channel, shop, range },
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Mindestens 1 Position pro Bestellung.",
      "Freigeben = zählt für Produktion. Ausliefern = zieht Röstkaffee ab."
    ],
    hintMeta: { left: "Filter aktiv", right: "Treffer: " + orders.length }
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
    hintMeta: { left: "DB aktiv", right: "Chargen: " + batches.length }
  }));
};

exports.renderInventory = async (req, res) => {
  const inv = await store.getInventory();

  res.render("inventory", Object.assign(base("inventory", "Lager", "Bestände verwalten und Engpässe vermeiden"), {
    inventory: inv,
    coffees: store.COFFEES,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Rohkaffee = grün. Röstkaffee = fertig.",
      "Jede Änderung wird in Aktivität protokolliert."
    ],
    hintMeta: { left: "DB aktiv", right: "Update: " + String(inv.updatedAt).slice(0, 19).replace("T", " ") }
  }));
};

exports.renderAnalytics = async (req, res) => {
  res.render("analytics", Object.assign(base("analytics", "Analysen", "KPIs und Berichte"), {
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Als nächstes: Engpässe, Forecast, Shop-Vergleich.",
      "Jetzt bauen wir Filter + Rollen."
    ],
    hintMeta: { left: "DB aktiv", right: "Nächster Schritt: Login" }
  }));
};

exports.renderSettings = async (req, res) => {
  res.render("settings", Object.assign(base("settings", "Einstellungen", "Stammdaten und Regeln"), {
    coffees: store.COFFEES,
    shops: store.SHOPS,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Stammdaten werden als DB-Editor erweitert.",
      "Aktuell sind Sorten/Filialen per Seed gesetzt."
    ],
    hintMeta: { left: "Admin", right: "DB aktiv" }
  }));
};

exports.renderActivity = async (req, res) => {
  const all = await store.listActivity();

  const search = q(req, "q", "");
  const area = q(req, "area", "ALL"); // ORDERS / INVENTORY / BATCHES
  const range = q(req, "range", "7"); // days

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
      "Nutzen Sie Filter, um schnell Fehlerquellen zu finden."
    ],
    hintMeta: { left: "Filter aktiv", right: "Treffer: " + activity.length }
  }));
};
