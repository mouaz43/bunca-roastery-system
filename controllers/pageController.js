// controllers/pageController.js
const store = require("../data/store");

function baseViewData(activeNav, pageTitle, pageSubtitle) {
  return {
    title: pageTitle,
    pageTitle: pageTitle,
    pageSubtitle: pageSubtitle,
    activeNav: activeNav,
    user: { role: "Admin", location: "Frankfurt" },
    systemStatus: { variant: "ok", text: "Betrieb normal" }
  };
}

exports.renderHome = (req, res) => {
  const orders = store.listOrders();
  const openCount = orders.filter(o => o.status !== "AUSGELIEFERT").length;

  res.render("home", Object.assign(baseViewData("dashboard", "Start", "Schneller Überblick und Navigation"), {
    openCount: openCount,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Nutzen Sie die Navigation links, um Bestellungen, Produktion, Lager und Analysen schnell zu erreichen.",
      "Aktuell sind " + openCount + " Bestellungen aktiv (noch nicht ausgeliefert)."
    ],
    hintMeta: { left: "Tipp: Bestellungen zuerst prüfen", right: "Status: Live Dummy-Daten" }
  }));
};

exports.renderDashboard = (req, res) => {
  const orders = store.listOrders();
  const incoming = orders.filter(o => o.status === "EINGEGANGEN").length;
  const approved = orders.filter(o => o.status === "FREIGEGEBEN").length;

  const roastDemand = store.computeRoastDemand();
  const topDemand = roastDemand.length ? (roastDemand[0].coffeeName + ": " + roastDemand[0].kg + " kg") : "Keine freigegebenen Mengen";

  res.render("dashboard", Object.assign(baseViewData("dashboard", "Dashboard", "Bestellungen, Produktion und Lager auf einen Blick"), {
    incoming: incoming,
    approved: approved,
    topDemand: topDemand,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Prüfen Sie eingegangene Bestellungen und geben Sie nur korrekt geprüfte Mengen frei.",
      "Höchster aktueller Produktionsbedarf: " + topDemand + "."
    ],
    hintMeta: { left: "Empfehlung: täglicher Check", right: "Status: Live Dummy-Daten" }
  }));
};

exports.renderOrders = (req, res) => {
  const orders = store.listOrders();

  res.render("orders", Object.assign(baseViewData("orders", "Bestellungen", "Filialen und B2B Bestellungen verwalten"), {
    orders: orders,
    shops: store.SHOPS,
    coffees: store.COFFEES,
    statuses: store.ORDER_STATUS,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Erfassen Sie neue Bestellungen und prüfen Sie Status, Termin und Mengen.",
      "Freigeben bedeutet: Diese Mengen werden in der Produktion berücksichtigt."
    ],
    hintMeta: { left: "Regel: Erst prüfen, dann freigeben", right: "Status: Live Dummy-Daten" }
  }));
};

exports.renderProduction = (req, res) => {
  const roastDemand = store.computeRoastDemand();
  const inv = store.getInventory();

  res.render("production", Object.assign(baseViewData("production", "Produktion", "Produktionsbedarf aus freigegebenen Bestellungen"), {
    roastDemand: roastDemand,
    inventory: inv,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Diese Seite zeigt den aggregierten Röstbedarf basierend auf freigegebenen Bestellungen.",
      "Nutzen Sie die Werte, um Chargen effizient zu planen."
    ],
    hintMeta: { left: "Hinweis: Nur freigegebene Bestellungen zählen", right: "Lagerstand: " + inv.updatedAt.slice(0, 10) }
  }));
};

exports.renderInventory = (req, res) => {
  const inv = store.getInventory();

  res.render("inventory", Object.assign(baseViewData("inventory", "Lager", "Rohkaffee, Röstkaffee und Verpackung verwalten"), {
    inventory: inv,
    coffees: store.COFFEES,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Pflegen Sie Bestände regelmäßig. So vermeiden Sie Notfallbestellungen.",
      "Bestandsänderungen werden später automatisch protokolliert."
    ],
    hintMeta: { left: "Ziel: proaktiv statt reaktiv", right: "Letzte Änderung: " + inv.updatedAt.slice(0, 19).replace("T", " ") }
  }));
};

exports.renderAnalytics = (req, res) => {
  const orders = store.listOrders();
  const totalOrders = orders.length;
  const delivered = orders.filter(o => o.status === "AUSGELIEFERT").length;

  res.render("analytics", Object.assign(baseViewData("analytics", "Analysen", "Kennzahlen auf Basis der vorhandenen Daten"), {
    totalOrders: totalOrders,
    delivered: delivered,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Analysen helfen bei Planung und Einkauf. Hier entstehen später Trends und Warnungen.",
      "Aktuell: " + totalOrders + " Bestellungen gesamt, " + delivered + " ausgeliefert."
    ],
    hintMeta: { left: "Tipp: Wochenvergleich nutzen", right: "Status: Live Dummy-Daten" }
  }));
};

exports.renderSettings = (req, res) => {
  res.render("settings", Object.assign(baseViewData("settings", "Einstellungen", "Stammdaten und Systemparameter"), {
    coffees: store.COFFEES,
    shops: store.SHOPS,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Hier pflegen Sie Sorten, Filialen und später Rollen und Schwellenwerte.",
      "Änderungen wirken sich direkt auf Bestellungen und Planung aus."
    ],
    hintMeta: { left: "Achtung: Änderungen bewusst durchführen", right: "Status: Live Dummy-Daten" }
  }));
};
