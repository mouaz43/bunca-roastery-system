// server.js
const path = require("path");
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);

const pageRoutes = require("./routes/pageRoutes");
const actionRoutes = require("./routes/actionRoutes");
const store = require("./data/store");
const { pool } = require("./db");
const { injectUser } = require("./middleware/auth");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// No-cache for CSS/JS on Render (helps a lot)
app.use((req, res, next) => {
  if (req.path.endsWith(".css") || req.path.endsWith(".js")) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
  }
  next();
});

// Static files
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "partials/layout");

// Debug route: confirms if CSS is served correctly
app.get("/__csscheck", (req, res) => {
  res.type("html").send(`
    <html>
      <head>
        <meta charset="utf-8" />
        <link rel="stylesheet" href="/app.css?v=${Date.now()}" />
      </head>
      <body style="padding:20px;">
        <h1>CSS Check</h1>
        <p>Wenn das hier "Card" schön aussieht, dann lädt CSS korrekt.</p>
        <div class="card">
          <h2>Card Test</h2>
          <p class="small-note">Wenn du hier dunkles Design siehst = OK.</p>
          <button class="btn btn-primary" type="button">Button Test</button>
        </div>
      </body>
    </html>
  `);
});

// Sessions (stored in Postgres)
app.use(
  session({
    store: new pgSession({ pool, tableName: "session" }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    }
  })
);

// Expose current user to EJS
app.use(injectUser);

// Always refresh master lists for UI
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

app.use((req, res) => res.status(404).send("Seite nicht gefunden."));

app.use((err, req, res, next) => {
  console.error("APP ERROR:", err);
  if (res.headersSent) return next(err);
  res.status(500).send(`
    <html><head><meta charset="utf-8"><title>Fehler</title></head>
    <body style="font-family: system-ui; padding: 24px;">
      <h1>Interner Fehler</h1>
      <p>Bitte kopieren Sie den Text unten und schicken Sie ihn mir.</p>
      <pre style="background:#111; color:#0f0; padding:12px; border-radius:8px; overflow:auto;">${String(
        err && err.stack ? err.stack : err
      )}</pre>
      <p><a href="/dashboard">Zurück zum Dashboard</a></p>
    </body></html>
  `);
});

const PORT = process.env.PORT || 3000;

async function boot() {
  await store.refreshMasters();
  app.listen(PORT, () => console.log(`Bunca Roastery System läuft auf Port ${PORT}`));
}

boot().catch((e) => {
  console.error("Boot failed:", e);
  process.exit(1);
});
