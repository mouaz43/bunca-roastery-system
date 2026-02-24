// controllers/inventoryController.js
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

function fmtTs(iso) {
  try {
    return String(iso).slice(0, 19).replace("T", " ");
  } catch {
    return String(iso || "");
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isInventoryAction(a) {
  const act = String(a.action || "");
  // we keep it broad so it works with your current logs
  return act.includes("INVENTORY") || act.includes("LAGER") || act.includes("STOCK");
}

exports.renderInventory = async (req, res) => {
  const inv = await store.getInventory();
  const coffees = store.COFFEES || [];

  const allActivity = await store.listActivity();
  const moves = (allActivity || [])
    .filter(isInventoryAction)
    .slice(0, 10)
    .map((a) => ({
      at: fmtTs(a.at),
      action: a.action,
      meta: a.meta || {}
    }));

  const TH_GREEN = 10;
  const TH_ROASTED = 5;

  const cards = coffees.map((c) => {
    const green = num(inv.greenBeansKg?.[c.id]);
    const roasted = num(inv.roastedKg?.[c.id]);

    let level = "ok";
    if (green === 0 && roasted === 0) level = "low";
    else if (green < TH_GREEN || roasted < TH_ROASTED) level = "warn";

    return {
      id: c.id,
      name: c.name,
      packDefaultKg: num(c.packDefaultKg || 1) || 1,
      green,
      roasted,
      level
    };
  });

  res.render(
    "inventory",
    Object.assign(base("inventory", "Lager", "Übersicht, Wareneingang und Korrekturen"), {
      inventory: inv,
      cards,
      moves,
      updatedAt: fmtTs(inv.updatedAt)
    })
  );
};
