// controllers/pageController.js
// Render-Controller für alle UI-Seiten.
// Jede Seite bekommt:
// - title, pageTitle, pageSubtitle
// - activeNav (für Sidebar Highlight)
// - hintTitle, hintLines, hintMeta (Seitenhinweis unten)
// - systemStatus (Status Pill in Sidebar)

function baseViewData({ activeNav, pageTitle, pageSubtitle }) {
  return {
    title: pageTitle,
    pageTitle,
    pageSubtitle,
    activeNav,
    user: { role: "Admin", location: "Frankfurt" },

    systemStatus: {
      variant: "ok",
      text: "Betrieb normal"
    }
  };
}

exports.renderHome = (req, res) => {
  const data = {
    ...baseViewData({
      activeNav: "dashboard",
      pageTitle: "Start",
      pageSubtitle: "Schneller Überblick und Navigation"
    }),
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Diese Startseite bietet einen schnellen Einstieg in Bestellungen, Produktion, Lager und Analysen.",
      "Nutzen Sie die Navigation links, um direkt zum gewünschten Bereich zu wechseln."
    ],
    hintMeta: { left: "Tipp: Cmd K für Aktionen später", right: "Stand: Platzhalter UI" }
  };

  res.render("home", data);
};

exports.renderDashboard = (req, res) => {
  const data = {
    ...baseViewData({
      activeNav: "dashboard",
      pageTitle: "Dashboard",
      pageSubtitle: "Bestellungen, Produktion und Lager auf einen Blick"
    }),
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Prüfen Sie zuerst die Auslastung und kritische Bestände, bevor Sie Produktionen freigeben.",
      "Auffälligkeiten in Bestellungen sollten vor der Planung geklärt werden."
    ],
    hintMeta: { left: "Empfehlung: Täglicher Check", right: "Status: Entwurf" }
  };

  res.render("dashboard", data);
};

exports.renderOrders = (req, res) => {
  const data = {
    ...baseViewData({
      activeNav: "orders",
      pageTitle: "Bestellungen",
      pageSubtitle: "Filialen und B2B Bestellungen verwalten"
    }),
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Hier erfassen und prüfen Sie Bestellungen von Filialen und B2B-Kunden.",
      "Achten Sie auf Termin, Packgröße und Status, bevor Sie die Produktion planen."
    ],
    hintMeta: { left: "Regel: Erst prüfen, dann freigeben", right: "Status: Platzhalter" }
  };

  res.render("orders", data);
};

exports.renderProduction = (req, res) => {
  const data = {
    ...baseViewData({
      activeNav: "production",
      pageTitle: "Produktion",
      pageSubtitle: "Röstchargen planen, verfolgen und abschließen"
    }),
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Diese Seite zeigt geplante und laufende Chargen inklusive Status.",
      "Nach Freigabe einer Charge sollten Änderungen nur kontrolliert erfolgen."
    ],
    hintMeta: { left: "Hinweis: Chargen können gelockt werden", right: "Status: Platzhalter" }
  };

  res.render("production", data);
};

exports.renderInventory = (req, res) => {
  const data = {
    ...baseViewData({
      activeNav: "inventory",
      pageTitle: "Lager",
      pageSubtitle: "Rohkaffee, Röstkaffee und Verpackung im Blick"
    }),
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Pflegen Sie Bestände regelmäßig, um Fehlmengen und Notfallbestellungen zu vermeiden.",
      "Mindestbestände werden später automatisch als Warnung angezeigt."
    ],
    hintMeta: { left: "Ziel: Proaktiv statt reaktiv", right: "Status: Platzhalter" }
  };

  res.render("inventory", data);
};

exports.renderAnalytics = (req, res) => {
  const data = {
    ...baseViewData({
      activeNav: "analytics",
      pageTitle: "Analysen",
      pageSubtitle: "Verbrauch, Trends und Produktionseffizienz"
    }),
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Analysen helfen bei der Planung: Trends, Ausreißer und Yield-Abweichungen erkennen.",
      "Nutzen Sie die Daten, um Kapazität und Einkauf besser zu steuern."
    ],
    hintMeta: { left: "Tipp: Wochenvergleich nutzen", right: "Status: Platzhalter" }
  };

  res.render("analytics", data);
};

exports.renderSettings = (req, res) => {
  const data = {
    ...baseViewData({
      activeNav: "settings",
      pageTitle: "Einstellungen",
      pageSubtitle: "Kaffeesorten, Rollen und Systemparameter"
    }),
    hintTitle: "Seitenhinweis",
    hintLines: [
      "Hier pflegen Sie Stammdaten wie Sorten, Packgrößen und Benutzerrollen.",
      "Änderungen wirken sich auf Bestellungen, Produktion und Lagerlogik aus."
    ],
    hintMeta: { left: "Achtung: Änderungen bewusst durchführen", right: "Status: Platzhalter" }
  };

  res.render("settings", data);
};
