// controllers/receiptController.js
const store = require("../data/store");
const receipts = require("../data/receipts");

function clean(v) { return String(v ?? "").trim(); }

exports.createReceipt = async (req, res) => {
  try {
    const coffeeId = clean(req.body.coffeeId);
    const kg = Number(clean(req.body.deltaKg));
    const note = clean(req.body.note);

    const coffee = (store.COFFEES || []).find(c => String(c.id) === String(coffeeId));
    const coffeeName = coffee ? coffee.name : coffeeId;

    const actorEmail = (req.user && req.user.email) || (req.session && req.session.user && req.session.user.email) || "";

    const receiptId = await receipts.createReceipt({ coffeeId, coffeeName, kg, note, actorEmail });

    await store.refreshMasters();
    return res.redirect("/inventory?receipt_ok=Wareneingang%20gespeichert&receipt_id=" + encodeURIComponent(receiptId));
  } catch (e) {
    return res.redirect("/inventory?receipt_error=" + encodeURIComponent(e.message || "Fehler beim Wareneingang."));
  }
};
