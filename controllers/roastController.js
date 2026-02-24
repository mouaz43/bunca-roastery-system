// controllers/roastController.js
const store = require("../data/store");
const roast = require("../data/roast");

function clean(v) { return String(v ?? "").trim(); }

exports.createRoast = async (req, res) => {
  try {
    const coffeeId = clean(req.body.coffeeId);
    const greenKg = Number(clean(req.body.greenKg));
    const yieldPct = Number(clean(req.body.yieldPct || "85"));
    const note = clean(req.body.note);

    const coffee = (store.COFFEES || []).find(c => String(c.id) === String(coffeeId));
    const coffeeName = coffee ? coffee.name : coffeeId;

    const actorEmail = (req.user && req.user.email) || (req.session?.user?.email) || "";

    const batchId = await roast.createRoast({
      coffeeId,
      coffeeName,
      greenKg,
      yieldPct,
      note,
      actorEmail
    });

    await store.refreshMasters();
    return res.redirect("/production?roast_ok=Röstung%20gespeichert&batch_id=" + encodeURIComponent(batchId));
  } catch (e) {
    return res.redirect("/production?roast_error=" + encodeURIComponent(e.message || "Fehler beim Rösten."));
  }
};
