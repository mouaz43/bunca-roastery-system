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
    hintMeta: { left: "Persistente Daten", right: "Letztes Update: " + String(inv.updatedAt).slice(0, 19).replace("T", " ") }
  }));
};

exports.renderOrders = async (req, res) => {
  const orders = await store.listOrders();

  res.render("orders", Object.assign(base("orders", "Bestellungen", "Filiale und B2B Bestellungen verwalten"), {
    orders,
    shops: store.SHOPS,
    coffees: store.COFFEES,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Mindestens 1 Position pro Bestellung.",
      "Freigeben = zählt für Produktion. Ausliefern = zieht Röstkaffee ab."
    ],
    hintMeta: { left: "DB aktiv", right: "Bestellungen: " + orders.length }
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
      "Rohkaffee = grün. Röstkaffee = fertig zum Verpacken/Ausliefern.",
      "Jede Änderung wird in Aktivität protokolliert."
    ],
    hintMeta: { left: "DB aktiv", right: "Update: " + String(inv.updatedAt).slice(0, 19).replace("T", " ") }
  }));
};

exports.renderAnalytics = async (req, res) => {
  res.render("analytics", Object.assign(base("analytics", "Analysen", "KPIs und Berichte"), {
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Analysen kommen als nächstes: Bedarf, Engpässe, Auslieferungen.",
      "Jetzt stabilisieren wir erst den Workflow."
    ],
    hintMeta: { left: "DB aktiv", right: "Nächster Schritt: Filter" }
  }));
};

exports.renderSettings = async (req, res) => {
  res.render("settings", Object.assign(base("settings", "Einstellungen", "Stammdaten und Regeln"), {
    coffees: store.COFFEES,
    shops: store.SHOPS,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Stammdaten kommen als DB-Editor als nächstes.",
      "Aktuell sind Sorten/Filialen per Seed gesetzt."
    ],
    hintMeta: { left: "Admin", right: "DB aktiv" }
  }));
};

exports.renderActivity = async (req, res) => {
  const activity = await store.listActivity();
  res.render("activity", Object.assign(base("activity", "Aktivität", "Protokoll aller Aktionen"), {
    activity,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Audit Log: jede Aktion mit Zeit und Details.",
      "Das ist die Fehler-Superkraft des Systems."
    ],
    hintMeta: { left: "Audit", right: "Einträge: " + activity.length }
  }));
};
