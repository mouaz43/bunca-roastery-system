// controllers/pdfController.js
const PDFDocument = require("pdfkit");
const store = require("../data/store");
const receipts = require("../data/receipts");
const roast = require("../data/roast");

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function fmtDateTime(iso) { try { return String(iso).slice(0,19).replace("T"," "); } catch { return String(iso||""); } }
function fmtDate(iso) { try { return String(iso).slice(0,10); } catch { return String(iso||""); } }

function statusLabel(st) {
  if (st === "ENTWURF") return "Entwurf";
  if (st === "EINGEGANGEN") return "Eingegangen";
  if (st === "FREIGEGEBEN") return "Freigegeben";
  if (st === "IN_PRODUKTION") return "In Produktion";
  if (st === "VERPACKT") return "Verpackt";
  if (st === "AUSGELIEFERT") return "Ausgeliefert";
  return st || "-";
}
function channelLabel(ch) { return ch === "B2B" ? "B2B" : "Filiale"; }
function getShopName(shopId) {
  const s = (store.SHOPS || []).find((x) => String(x.id) === String(shopId));
  return s ? s.name : (shopId || "-");
}
function canViewOrder(req, order) {
  const user = req.user || req.session?.user || null;
  if (!user) return false;
  const role = String(user.role || "").toUpperCase();
  if (role === "ADMIN") return true;
  if (role === "SHOP") {
    const myShopId = user.shopId || user.shop_id || "";
    return String(order.shopId) === String(myShopId);
  }
  return false;
}

function pdfHeader(doc, title) {
  doc.font("Helvetica-Bold").fontSize(18).text("Bunca Rösterei", { continued: true });
  doc.font("Helvetica").fontSize(10).text("  Produktions- & Bestellsystem");
  doc.moveDown(0.6);

  doc.font("Helvetica-Bold").fontSize(16).text(title);
  doc.moveDown(0.4);
  doc.font("Helvetica").fontSize(10).fillColor("#333");
}

exports.orderPdf = async (req, res) => {
  const orderId = req.params.id;
  const order = await store.getOrderById(orderId);
  if (!order) return res.status(404).send("Bestellung nicht gefunden.");
  if (!canViewOrder(req, order)) return res.status(403).send("Keine Berechtigung.");

  const title =
    order.channel === "B2B"
      ? `B2B Bestellung – ${order.customerName || "Kunde"}`
      : `Filialbestellung – ${getShopName(order.shopId)}`;

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="bestellung-${order.id}.pdf"`);
  doc.pipe(res);

  pdfHeader(doc, title);

  doc.text(`Bestell-ID: ${order.id}`);
  doc.text(`Kanal: ${channelLabel(order.channel)}`);
  doc.text(`Status: ${statusLabel(order.status)}`);
  doc.text(`Lieferdatum: ${fmtDate(order.deliveryDate)}`);

  if (order.channel === "B2B") doc.text(`B2B Kunde: ${order.customerName || "-"}`);
  else doc.text(`Filiale: ${getShopName(order.shopId)} (${order.shopId || "-"})`);

  if (order.note) {
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").text("Notiz:");
    doc.font("Helvetica").text(order.note);
  }

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(12).text("Positionen");
  doc.moveDown(0.4);

  const x1 = doc.x;
  const xCoffee = x1;
  const xKg = 460;
  let y = doc.y;

  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("Sorte", xCoffee, y);
  doc.text("kg", xKg, y, { width: 60, align: "right" });
  y += 16;
  doc.moveTo(x1, y).lineTo(555, y).strokeColor("#cccccc").stroke();
  y += 10;

  doc.font("Helvetica").fontSize(10).fillColor("#111");

  let total = 0;
  for (const it of (order.items || [])) {
    const name = it.coffeeName || it.coffeeId || "-";
    const kg = num(it.kg);
    total += kg;

    if (y > 760) { doc.addPage(); y = doc.y; }
    doc.text(name, xCoffee, y, { width: 420 });
    doc.text(kg.toFixed(1), xKg, y, { width: 60, align: "right" });
    y += 18;
  }

  doc.moveDown(1);
  doc.strokeColor("#cccccc");
  doc.moveTo(x1, y).lineTo(555, y).stroke();
  y += 10;

  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("Gesamt", xCoffee, y);
  doc.text(total.toFixed(1) + " kg", xKg, y, { width: 60, align: "right" });

  doc.fillColor("#666").font("Helvetica").fontSize(9);
  doc.moveDown(2);
  doc.text("Hinweis: Freigabe zählt für Produktionsbedarf. Ausliefern zieht Röstkaffee ab.");
  doc.end();
};

exports.lieferscheinPdf = async (req, res) => {
  const orderId = req.params.id;
  const order = await store.getOrderById(orderId);
  if (!order) return res.status(404).send("Bestellung nicht gefunden.");
  if (!canViewOrder(req, order)) return res.status(403).send("Keine Berechtigung.");

  const who =
    order.channel === "B2B"
      ? (order.customerName || "B2B Kunde")
      : `${getShopName(order.shopId)} (${order.shopId || "-"})`;

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="lieferschein-${order.id}.pdf"`);
  doc.pipe(res);

  pdfHeader(doc, "Lieferschein");

  doc.text(`Lieferschein zu Bestellung: ${order.id}`);
  doc.text(`Kanal: ${channelLabel(order.channel)}`);
  doc.text(`Empfänger: ${who}`);
  doc.text(`Lieferdatum: ${fmtDate(order.deliveryDate)}`);
  doc.text(`Status: ${statusLabel(order.status)}`);
  doc.text(`Gedruckt: ${fmtDateTime(new Date().toISOString())}`);

  if (order.note) {
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").text("Hinweis/Notiz:");
    doc.font("Helvetica").text(order.note);
  }

  doc.moveDown(1);
  doc.font("Helvetica-Bold").fontSize(12).text("Gelieferte Positionen");
  doc.moveDown(0.4);

  const x1 = doc.x;
  const xCoffee = x1;
  const xKg = 460;
  let y = doc.y;

  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("Sorte", xCoffee, y);
  doc.text("kg", xKg, y, { width: 60, align: "right" });
  y += 16;
  doc.moveTo(x1, y).lineTo(555, y).strokeColor("#cccccc").stroke();
  y += 10;

  doc.font("Helvetica").fontSize(10).fillColor("#111");

  let total = 0;
  for (const it of (order.items || [])) {
    const name = it.coffeeName || it.coffeeId || "-";
    const kg = num(it.kg);
    total += kg;

    if (y > 740) { doc.addPage(); y = doc.y; }
    doc.text(name, xCoffee, y, { width: 420 });
    doc.text(kg.toFixed(1), xKg, y, { width: 60, align: "right" });
    y += 18;
  }

  doc.moveDown(1);
  doc.strokeColor("#cccccc");
  doc.moveTo(x1, y).lineTo(555, y).stroke();
  y += 10;

  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("Gesamt", xCoffee, y);
  doc.text(total.toFixed(1) + " kg", xKg, y, { width: 60, align: "right" });

  doc.moveDown(2);
  doc.fillColor("#666").font("Helvetica").fontSize(10);
  doc.text("Unterschrift Empfänger:", 40, doc.y);
  doc.moveDown(2);
  doc.strokeColor("#999999").moveTo(40, doc.y).lineTo(260, doc.y).stroke();

  doc.end();
};

exports.receiptPdf = async (req, res) => {
  const id = req.params.id;
  const r = await receipts.getReceiptById(id);
  if (!r) return res.status(404).send("Wareneingang nicht gefunden.");

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="wareneingang-${r.id}.pdf"`);
  doc.pipe(res);

  pdfHeader(doc, "Wareneingang (Rohkaffee)");

  doc.text(`Beleg-ID: ${r.id}`);
  doc.text(`Zeit: ${fmtDateTime(r.at)}`);
  doc.text(`Sorte: ${r.coffeeName} (${r.coffeeId})`);
  doc.text(`Menge: ${num(r.kg).toFixed(1)} kg`);
  if (r.actorEmail) doc.text(`Erfasst von: ${r.actorEmail}`);

  if (r.note) {
    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").text("Notiz:");
    doc.font("Helvetica").text(r.note);
  }

  doc.moveDown(2);
  doc.strokeColor("#cccccc").moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(1.2);

  doc.font("Helvetica").fontSize(10).fillColor("#666");
  doc.text("Unterschrift / Kontrolle:", 40, doc.y);
  doc.moveDown(2);
  doc.strokeColor("#999999").moveTo(40, doc.y).lineTo(250, doc.y).stroke();

  doc.end();
};

exports.roastPdf = async (req, res) => {
  const id = req.params.id;
  const b = await roast.getBatchById(id);
  if (!b) return res.status(404).send("Röstcharge nicht gefunden.");

  const meta = b.meta || {};
  const greenKg = num(meta.greenKg);
  const yieldPct = num(meta.yieldPct);
  const roastedKg = num(meta.roastedKg || b.roastedKg);
  const note = String(meta.note || "");

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="roestprotokoll-${b.id}.pdf"`);
  doc.pipe(res);

  pdfHeader(doc, "Röstprotokoll");

  doc.text(`Charge-ID: ${b.id}`);
  doc.text(`Zeit: ${fmtDateTime(b.createdAt)}`);
  doc.text(`Sorte: ${b.coffeeName} (${b.coffeeId})`);
  doc.text(`Rohkaffee eingesetzt: ${greenKg.toFixed(1)} kg`);
  doc.text(`Yield: ${yieldPct.toFixed(0)} %`);
  doc.text(`Röstkaffee Ergebnis: ${roastedKg.toFixed(1)} kg`);
  doc.text(`Status: ${b.status}`);

  if (note) {
    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").text("Notiz:");
    doc.font("Helvetica").text(note);
  }

  doc.moveDown(2);
  doc.strokeColor("#cccccc").moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(1.2);

  doc.font("Helvetica").fontSize(10).fillColor("#666");
  doc.text("Freigabe / Unterschrift:", 40, doc.y);
  doc.moveDown(2);
  doc.strokeColor("#999999").moveTo(40, doc.y).lineTo(250, doc.y).stroke();

  doc.end();
};
