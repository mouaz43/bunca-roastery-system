// server.js
const path = require("path");
const express = require("express");
const expressLayouts = require("express-ejs-layouts");

const pageRoutes = require("./routes/pageRoutes");
const actionRoutes = require("./routes/actionRoutes");
const store = require("./data/store");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "partials/layout");

// Always refresh masters so UI always has coffees/shops even after restarts
app.use(async (req, res, next) => {
  try {
    await store.refreshMasters();
    next();
  } catch (e) {
    next(e);
  }
});

app.use("/", pageRoutes);
app.use("/actions", actionRoutes);

// 404
app.use((req, res) => res.status(404).send("Seite nicht gefunden."));

// Global error handler (prevents crashes -> avoids 502)
app.use((err, req, res, next) => {
  console.error("APP ERROR:", err);

  // If headers already sent, delegate
  if (res.headersSent) return next(err);

  // Render a simple emergency page
  res.status(500).send(`
    <html>
      <head><meta charset="utf-8"><title>Fehler</title></head>
      <body style="font-family: system-ui; padding: 24px;">
        <h1>Interner Fehler</h1>
        <p>Die Anwendung hat einen Fehler geworfen. Bitte kopieren Sie den Text unten und schicken Sie ihn mir.</p>
        <pre style="background:#111; color:#0f0; padding:12px; border-radius:8px; overflow:auto;">${String(err && err.stack ? err.stack : err)}</pre>
        <p><a href="/dashboard">Zurück zum Dashboard</a></p>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;

async function boot() {
  // This ensures masters load once at boot too
  await store.refreshMasters();
  app.listen(PORT, () => console.log(`Bunca Roastery System läuft auf Port ${PORT}`));
}

boot().catch((e) => {
  console.error("Boot failed:", e);
  process.exit(1);
});
