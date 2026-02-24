// controllers/pdfController.js
const PDFDocument = require("pdfkit");
const store = require("../data/store");

function fmtDate(d) {
  if (!d) return "-";
  return String(d).slice(0, 10);
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function calcTotalKg(items) {
  return (items || []).reduce((s, it) => s + Number(it.kg || 0), 0);
}

function requireOrderAccess(req, order) {
  const u = req.session && req.session.user;
  if (!u) return false;
  if (u.role === "ADMIN") return true;
  if (u.role === "SHOP") {
    return order.channel === "FILIALE" && String(order.shopId || "") === String(u.shopId || "");
  }
  // B2B could be added later
  return false;
}

exports.orderPdf = async (req, res) => {
  const id = String(req.params.id || "").trim();
  const order = await store.getOrderById(id);
  if (!order) return res.status(404).send("Bestellung nicht gefunden.");

  if (!requireOrderAccess(req, order)) {
    return res.status(403).send("Kein Zugriff.");
  }

  // Resolve names
  const shopName = (store.SHOPS || []).find(s => String(s.id) === String(order.shopId))?.name || order.shopId || "-";
  const who = order.channel === "B2B" ? (order.customerName || "B2B Kunde") : shopName;
  const totalKg = calcTotalKg(order.items);
  const stamp = nowStamp();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="bunca-bestellung-${id}.pdf"`);

  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    info: {
      Title: `Bunca Bestellung ${id}`,
      Author: "Bunca Roastery System"
    }
  });

  doc.pipe(res);

  // Colors (match your beige/brown)
  const cText = "#2B1E12";
  const cMuted = "#6C5A46";
  const cLine = "#E7D9C7";
  const cAccent = "#C8A36A";
  const cPanel = "#FBF6EF";

  const pageW = doc.page.width;
  const contentW = pageW - doc.page.margins.left - doc.page.margins.right;

  // Header panel
  const x = doc.page.margins.left;
  let y = doc.page.margins.top;

  doc.roundedRect(x, y, contentW, 92, 14).fill(cPanel);
  doc.fillColor(cText);

  doc.fontSize(20).font("Helvetica-Bold").text("Bunca Rösterei", x + 18, y + 16);
  doc.fontSize(12).font("Helvetica").fillColor(cMuted).text("Produktions- und Bestellsystem · Bestellbeleg", x + 18, y + 42);

  // Right badge
  const badgeW = 160;
  doc.roundedRect(x + contentW - badgeW - 18, y + 18, badgeW, 34, 10).fill(cAccent);
  doc.fillColor("#ffffff").fontSize(12).font("Helvetica-Bold")
    .text(order.channel === "B2B" ? "B2B" : "FILIALE", x + contentW - badgeW - 18, y + 28, { width: badgeW, align: "center" });

  y += 110;

  // Meta block
  doc.fillColor(cText).fontSize(12).font("Helvetica-Bold").text("Bestelldaten", x, y);
  y += 14;
  doc.moveTo(x, y).lineTo(x + contentW, y).lineWidth(1).strokeColor(cLine).stroke();
  y += 14;

  const leftColW = Math.floor(contentW * 0.55);
  const rightColW = contentW - leftColW;

  const metaLeft = [
    ["Bestellnummer", order.id],
    ["Kanal", order.channel],
    [order.channel === "B2B" ? "Kunde" : "Filiale", who],
    ["Lieferdatum", fmtDate(order.deliveryDate)]
  ];

  const metaRight = [
    ["Status", order.status],
    ["Erstellt", fmtDate(order.createdAt)],
    ["Gedruckt", stamp]
  ];

  function drawKV(list, xx, yy, colW) {
    let cy = yy;
    list.forEach(([k, v]) => {
      doc.fillColor(cMuted).font("Helvetica").fontSize(10).text(k, xx, cy);
      doc.fillColor(cText).font("Helvetica-Bold").fontSize(11).text(String(v ?? "-"), xx, cy + 12, { width: colW });
      cy += 34;
    });
    return cy;
  }

  const yLeftEnd = drawKV(metaLeft, x, y, leftColW - 10);
  drawKV(metaRight, x + leftColW + 20, y, rightColW - 10);

  y = Math.max(yLeftEnd, y + metaRight.length * 34) + 6;

  // Note
  if (order.note && String(order.note).trim()) {
    doc.roundedRect(x, y, contentW, 54, 12).strokeColor(cLine).lineWidth(1).stroke();
    doc.fillColor(cMuted).font("Helvetica").fontSize(10).text("Notiz", x + 14, y + 12);
    doc.fillColor(cText).font("Helvetica").fontSize(11).text(String(order.note), x + 14, y + 26, { width: contentW - 28 });
    y += 70;
  } else {
    y += 8;
  }

  // Items table
  doc.fillColor(cText).font("Helvetica-Bold").fontSize(12).text("Positionen", x, y);
  y += 14;
  doc.moveTo(x, y).lineTo(x + contentW, y).lineWidth(1).strokeColor(cLine).stroke();
  y += 12;

  const col1 = Math.floor(contentW * 0.62);
  const col2 = Math.floor(contentW * 0.18);
  const col3 = contentW - col1 - col2;

  // table header
  doc.fillColor(cMuted).font("Helvetica-Bold").fontSize(10);
  doc.text("Sorte", x, y, { width: col1 });
  doc.text("ID", x + col1, y, { width: col2 });
  doc.text("kg", x + col1 + col2, y, { width: col3, align: "right" });
  y += 18;
  doc.moveTo(x, y).lineTo(x + contentW, y).lineWidth(1).strokeColor(cLine).stroke();
  y += 10;

  doc.fillColor(cText).font("Helvetica").fontSize(11);

  (order.items || []).forEach((it) => {
    const rowH = 22;
    if (y + rowH > doc.page.height - doc.page.margins.bottom - 70) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    doc.text(String(it.coffeeName || "-"), x, y, { width: col1 });
    doc.fillColor(cMuted).text(String(it.coffeeId || "-"), x + col1, y, { width: col2 });
    doc.fillColor(cText).text(String(it.kg ?? 0), x + col1 + col2, y, { width: col3, align: "right" });
    y += rowH;
    doc.moveTo(x, y).lineTo(x + contentW, y).lineWidth(0.5).strokeColor("#EFE6DA").stroke();
    y += 6;
  });

  // Total
  y += 8;
  doc.roundedRect(x, y, contentW, 44, 12).fill(cPanel);
  doc.fillColor(cMuted).font("Helvetica-Bold").fontSize(10).text("Summe", x + 14, y + 14);
  doc.fillColor(cText).font("Helvetica-Bold").fontSize(14).text(`${totalKg.toFixed(1)} kg`, x, y + 12, { width: contentW - 14, align: "right" });

  y += 60;

  // Footer
  doc.fillColor(cMuted).font("Helvetica").fontSize(9)
    .text("Hinweis: Dieser Beleg wird automatisch vom Bunca Roastery System erstellt.", x, doc.page.height - doc.page.margins.bottom - 24, { width: contentW });

  doc.end();
};
