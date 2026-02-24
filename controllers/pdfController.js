// controllers/pdfController.js
const PDFDocument = require("pdfkit");
const store = require("../data/store");

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtDate(iso) {
  try {
    return String(iso).slice(0, 10);
  } catch {
    return String(iso || "");
  }
}

function statusLabel(st) {
  if (st === "ENTWURF") return "Entwurf";
  if (st === "EINGEGANGEN") return "Eingegangen";
  if (st === "FREIGEGEBEN") return "Freigegeben";
  if (st === "IN_PRODUKTION") return "In Produktion";
  if (st === "VERPACKT") return "Verpackt";
  if (st === "AUSGELIEFERT") return "Ausgeliefert";
  return st || "-";
}

function channelLabel(ch) {
  return ch === "B2B" ? "B2B" : "Filiale";
}

function getShopName(shopId) {
  const s = (store.SHOPS || []).find((x) => String(x.id) === String(shopId));
  return s ? s.name : (shopId || "-");
}

function requireCanViewOrder(req, order) {
  const user = req.user || req.session?.user || null;
  if (!user) return false;

  const role = String(user.role || "").toUpperCase();
  if (role === "ADMIN") return true;

  if (role === "SHOP") {
    // Shop darf nur eigene Filiale sehen/printen
    const myShopId = user.shopId || user.shop_id || "";
    return String(order.shopId) === String(myShopId);
  }

  return false;
}

exports.orderPdf = async (req, res) => {
  const orderId = req.params.id;
  const order = await store.getOrderById(orderId);

  if (!order) {
    return res.status(404).send("Bestellung nicht gefunden.");
  }

  if (!requireCanViewOrder(req, order)) {
    return res.status(403).send("Keine Berechtigung.");
  }

  const title =
    order.channel === "B2B"
      ? `B2B Bestellung – ${order.customerName || "Kunde"}`
      : `Filialbestellung – ${getShopName(order.shopId)}`;

  const doc = new PDFDocument({ size: "A4", margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="bestellung-${order.id}.pdf"`
  );

  doc.pipe(res);

  // ===== Header =====
  doc.font("Helvetica-Bold").fontSize(18).text("Bunca Rösterei", { continued: true });
  doc.font("Helvetica").fontSize(10).text("  Produktions- & Bestellsystem");
  doc.moveDown(0.6);

  doc.font("Helvetica-Bold").fontSize(16).text(title);
  doc.moveDown(0.4);

  doc.font("Helvetica").fontSize(10).fillColor("#333");
  doc.text(`Bestell-ID: ${order.id}`);
  doc.text(`Kanal: ${channelLabel(order.channel)}`);
  doc.text(`Status: ${statusLabel(order.status)}`);
  doc.text(`Lieferdatum: ${fmtDate(order.deliveryDate)}`);

  if (order.channel === "B2B") {
    doc.text(`B2B Kunde: ${order.customerName || "-"}`);
  } else {
    doc.text(`Filiale: ${getShopName(order.shopId)} (${order.shopId || "-"})`);
  }

  if (order.note) {
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").text("Notiz:");
    doc.font("Helvetica").text(order.note);
  }

  doc.moveDown(1);

  // ===== Tabelle Positionen =====
  doc.font("Helvetica-Bold").fontSize(12).text("Positionen");
  doc.moveDown(0.4);

  const x1 = doc.x;
  const xCoffee = x1;
  const xKg = 460;
  let y = doc.y;

  // table header
  doc.font("Helvetica-Bold").fontSize(10);
  doc.text("Sorte", xCoffee, y);
  doc.text("kg", xKg, y, { width: 60, align: "right" });
  y += 16;

  doc.moveTo(x1, y).lineTo(555, y).strokeColor("#cccccc").stroke();
  y += 10;

  doc.font("Helvetica").fontSize(10).fillColor("#111");

  let total = 0;
  const items = order.items || [];

  for (const it of items) {
    const name = it.coffeeName || it.coffeeId || "-";
    const kg = num(it.kg);
    total += kg;

    // page break safety
    if (y > 760) {
      doc.addPage();
      y = doc.y;
    }

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

  // ===== Footer =====
  doc.fillColor("#666").font("Helvetica").fontSize(9);
  doc.moveDown(2);
  doc.text("Hinweis: Freigabe zählt für Produktionsbedarf. Ausliefern zieht Röstkaffee ab.", {
    align: "left"
  });

  doc.end();
};
