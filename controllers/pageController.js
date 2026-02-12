// controllers/pageController.js
const store = require("../data/store");

function baseViewData({ activeNav, pageTitle, pageSubtitle }) {
  return {
    title: pageTitle,
    pageTitle,
    pageSubtitle,
    activeNav,
    user: { role: "Admin", location: "Frankfurt" },
    systemStatus: { variant: "ok", text: "Betrieb normal" }
  };
}

function buildHintMeta(left, right) {
  return { left, right };
}

exports.renderHome = (req, res) => {
  const orders = store.listOrders();
  const openCount = orders.filter(o => o.status !== "AUSGELIEFERT").length;

  const data = {
    ...baseViewData({
      activeNav: "dashboard",
      pageTitle: "Start",
      pageSubtitle: "Schneller Überblick und Navigation"
    }),
    orders,
    openCount,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Nutzen Sie die Navigation links, um Bestellungen, Produktion, Lager und Analysen schnell zu erreichen.",
      `Aktuell sind ${openCount} Bestellungen aktiv (noch nicht ausgeliefert).`
    ],
    hintMeta: buildHintMeta("Tipp: Bestellungen zuerst prüfen", "Status: Live Dummy-Daten")
  };

  res.render("home", data);
};

exports.renderDashboard = (req, res) => {
  const orders = store.listOrders();
  const incoming = orders.filter(o => o.status === "EINGEGANGEN").length;
  const approved = orders.filter(o => o.status === "FREIGEGEBEN").length;

  const roastDemand = store.computeRoastDemand();
  const topDemand = roastDemand[0] ? `${roastDemand[0].coffeeName}: ${roastDemand[0].kg} kg` : "Keine freigegebenen Mengen";

  const data = {
    ...baseViewData({
      activeNav: "dashboard",
      pageTitle: "Dashboard",
      pageSubtitle: "Bestellungen, Produktion und Lager auf einen Blick"
    }),
    incoming,
    approved,
    topDemand,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Prüfen Sie eingegangene Bestellungen und geben Sie nur korrekt geprüfte Mengen frei.",
      `Höchster aktueller Produktionsbedarf: ${topDemand}.`
    ],
    hintMeta: buildHintMeta("Empfehlung: täglicher Check", "Status: Live Dummy-Daten")
  };

  res.render("dashboard", data);
};

exports.renderOrders = (req, res) => {
  const orders = store.listOrders();

  const data = {
    ...baseViewData({
      activeNav: "orders",
      pageTitle: "Bestellungen",
      pageSubtitle: "Filialen und B2B Bestellungen verwalten"
    }),
    orders,
    shops: store.SHOPS,
    coffees: store.COFFEES,
    statuses: store.ORDER_STATUS,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Erfassen Sie neue Bestellungen und prüfen Sie Status, Termin und Mengen.",
      "Freigeben bedeutet: Diese Mengen werden in der Produktion berücksichtigt."
    ],
    hintMeta: buildHintMeta("Regel: Erst prüfen, dann freigeben", "Status: Live Dummy-Daten")
  };

  res.render("orders", data);
};

exports.renderProduction = (req, res) => {
  const roastDemand = store.computeRoastDemand();
  const inv = store.getInventory();

  const data = {
    ...baseViewData({
      activeNav: "production",
      pageTitle: "Produktion",
      pageSubtitle: "Produktionsbedarf aus freigegebenen Bestellungen"
    }),
    roastDemand,
    inventory: inv,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Diese Seite zeigt den aggregierten Röstbedarf basierend auf freigegebenen Bestellungen.",
      "Nutzen Sie die Werte, um Chargen effizient zu planen."
    ],
    hintMeta: buildHintMeta("Hinweis: Nur freigegebene Bestellungen zählen", `Lagerstand aktualisiert: ${inv.updatedAt.slice(0, 10)}`)
  };

  res.render("production", data);
};

exports.renderInventory = (req, res) => {
  const inv = store.getInventory();

  const data = {
    ...baseViewData({
      activeNav: "inventory",
      pageTitle: "Lager",
      pageSubtitle: "Rohkaffee, Röstkaffee und Verpackung verwalten"
    }),
    inventory: inv,
    coffees: store.COFFEES,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Pflegen Sie Bestände regelmäßig. So vermeiden Sie Notfallbestellungen.",
      "Bestandsänderungen werden später automatisch protokolliert."
    ],
    hintMeta: buildHintMeta("Ziel: proaktiv statt reaktiv", `Letzte Änderung: ${inv.updatedAt.slice(0, 19).replace("T"," ")}`)
  };

  res.render("inventory", data);
};

exports.renderAnalytics = (req, res) => {
  const orders = store.listOrders();
  const totalOrders = orders.length;
  const delivered = orders.filter(o => o.status === "AUSGELIEFERT").length;

  const data = {
    ...baseViewData({
      activeNav: "analytics",
      pageTitle: "Analysen",
      pageSubtitle: "Kennzahlen auf Basis der vorhandenen Daten"
    }),
    totalOrders,
    delivered,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Analysen helfen bei Planung und Einkauf. Hier entstehen später Trends und Warnungen.",
      `Aktuell: ${totalOrders} Bestellungen gesamt, ${delivered} ausgeliefert.`
    ],
    hintMeta: buildHintMeta("Tipp: Wochenvergleich nutzen", "Status: Live Dummy-Daten")
  };

  res.render("analytics", data);
};

exports.renderSettings = (req, res) => {
  const data = {
    ...baseViewData({
      activeNav: "settings",
      pageTitle: "Einstellungen",
      pageSubtitle: "Stammdaten und Systemparameter"
    }),
    coffees: store.COFFEES,
    shops: store.SHOPS,
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Hier pflegen Sie Sorten, Filialen und später Rollen und Schwellenwerte.",
      "Änderungen wirken sich direkt auf Bestellungen und Planung aus."
    ],
    hintMeta: buildHintMeta("Achtung: Änderungen bewusst durchführen", "Status: Live Dummy-Daten")
  };

  res.render("settings", data);
};
