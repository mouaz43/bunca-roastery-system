// controllers/pageController.js
const store = require("../data/store");
const adminController = require("../controllers/adminController");
const b2bController = require("../controllers/b2bController");

function base(activeNav, title, subtitle) {
  return { title, pageTitle: title, pageSubtitle: subtitle, activeNav, systemStatus: { variant: "ok", text: "Betrieb normal" } };
}

exports.renderSettings = async (req, res) => {
  const users = await adminController.listUsers();
  const b2b = await b2bController.list();

  res.render("settings", Object.assign(base("settings", "Einstellungen", "Stammdaten und Benutzerverwaltung"), {
    coffees: store.COFFEES,
    shops: store.SHOPS,
    users,
    b2b,
    query: req.query
  }));
};
