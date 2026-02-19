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

exports.renderHome = (req, res) => {
  res.render("home", Object.assign(base("dashboard", "Start", "Schneller Einstieg"), {
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Starten Sie bei Bestellungen. Freigaben erzeugen Produktionsbedarf.",
      "Lager ist der Sicherheitsgurt: Bestände regelmäßig pflegen."
    ],
    hintMeta: { left: "Workflow", right: "Status: Live" }
  }));
};

exports.renderDashboard = (req, res) => {
  const orders = store.listOrders();
  const inv = store.getInventory();
  const demand = store.computeRoastDemand();
  const batches = store.listBatches();

  res.render("dashboard", Object.assign(base("dashboard", "Dashboard", "Übersicht und Schnellaktionen"), {
    ordersCount: orders.length,
    demandCount: demand.length,
    batchCount: batches.length,
    inventoryUpdatedAt: inv.updatedAt,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Wenn etwas dringend ist: zuerst Bestellungen, dann Produktion, dann Lager.",
      "Diese Seite wird später automatisch priorisieren und warnen."
    ],
    hintMeta: { left: "Aktuell Dummy-Store", right: "Nächster Schritt: DB" }
  }));
};

exports.renderOrders = (req, res) => {
  const orders = store.listOrders();
  res.render("orders", Object.assign(base("orders", "Bestellungen", "Filiale und B2B Bestellungen verwalten"), {
    orders,
    shops: store.SHOPS,
    coffees: store.COFFEES,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "EINGEGANGEN bedeutet: prüfen. FREIGEGEBEN bedeutet: zählt für Produktion.",
      "Weiter bewegt die Bestellung Schritt für Schritt durch den Workflow."
    ],
    hintMeta: { left: "Regel: erst prüfen, dann freigeben", right: "Status aktiv" }
  }));
};

exports.renderProduction = (req, res) => {
  const inv = store.getInventory();
  const roastDemand = store.computeRoastDemand();
  const batches = store.listBatches();

  res.render("production", Object.assign(base("production", "Produktion", "Bedarf, Lagerabgleich und Chargen"), {
    inventory: inv,
    roastDemand,
    batches,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Bedarf basiert auf FREIGEGEBEN, IN_PRODUKTION und VERPACKT.",
      "Wenn eine Charge “Geröstet” wird, bewegen sich Bestände automatisch."
    ],
    hintMeta: { left: "Plan zuerst, dann rösten", right: "Letztes Lagerupdate: " + String(inv.updatedAt).slice(0, 10) }
  }));
};

exports.renderInventory = (req, res) => {
  const inv = store.getInventory();
  res.render("inventory", Object.assign(base("inventory", "Lager", "Bestände verwalten und Engpässe vermeiden"), {
    inventory: inv,
    coffees: store.COFFEES,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Pflegen Sie Bestände nach Lieferung, Produktion und Auslieferung.",
      "Später wird jede Änderung automatisch protokolliert."
    ],
    hintMeta: { left: "Ziel: keine Engpässe", right: "Letzte Änderung: " + String(inv.updatedAt).slice(0, 19).replace("T", " ") }
  }));
};

exports.renderAnalytics = (req, res) => {
  res.render("analytics", Object.assign(base("analytics", "Analysen", "KPIs und Berichte"), {
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Analysen zeigen nur das, was Entscheidungen erleichtert.",
      "Charts kommen, sobald Daten stabil sind."
    ],
    hintMeta: { left: "UI fertig", right: "Logik folgt" }
  }));
};

exports.renderSettings = (req, res) => {
  res.render("settings", Object.assign(base("settings", "Einstellungen", "Stammdaten und Regeln"), {
    coffees: store.COFFEES,
    shops: store.SHOPS,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Hier werden später Sorten, Filialen und Mindestbestände wirklich gespeichert.",
      "Nach DB-Migration wird das live editierbar."
    ],
    hintMeta: { left: "Admin Bereich", right: "Status: UI ready" }
  }));
};
