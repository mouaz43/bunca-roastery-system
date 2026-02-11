require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");

const { db, migrate } = require("./src/db");
const { authenticate, requireAuth, requireRole } = require("./src/auth");
const { buildNav } = require("./src/nav");

migrate();

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false
  })
);

// Make session user available in views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// --- AUTH ROUTES ---
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  return res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login", { title: "Login", subtitle: "Bestellsystem", error: null, nav: [] });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = authenticate(username, password);
  if (!user) {
    return res.status(401).render("login", {
      title: "Login",
      subtitle: "Bestellsystem",
      error: "Login fehlgeschlagen. Bitte prüfen.",
      nav: []
    });
  }
  req.session.user = user;
  res.redirect("/dashboard");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// --- USER AREA ---
app.get("/dashboard", requireAuth, (req, res) => {
  const u = req.session.user;
  const nav = buildNav(req.path, u.role);

  // quick stats
  const myOrders = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE user_id=?").get(u.id).c;
  const openOrders = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE user_id=? AND status IN ('offen','in_arbeit')")
    .get(u.id).c;

  res.render("dashboard", {
    title: "Dashboard",
    subtitle: "Übersicht",
    nav,
    userLabel: `${u.displayName} (${u.role})`,
    stats: { myOrders, openOrders }
  });
});

app.get("/orders/new", requireAuth, (req, res) => {
  const u = req.session.user;
  const nav = buildNav(req.path, u.role);

  const coffees = db.prepare("SELECT id, name FROM coffees WHERE active=1 ORDER BY name").all();

  res.render("orders_new", {
    title: "Neue Bestellung",
    subtitle: "Bestellung anlegen",
    nav,
    userLabel: `${u.displayName} (${u.role})`,
    coffees,
    error: null,
    ok: null
  });
});

app.post("/orders/new", requireAuth, (req, res) => {
  const u = req.session.user;
  const nav = buildNav("/orders/new", u.role);

  const coffees = db.prepare("SELECT id, name FROM coffees WHERE active=1 ORDER BY name").all();

  const { note, coffee_id, size, qty } = req.body;
  const qtyNum = Number(qty);

  if (!coffee_id || !size || !qtyNum || qtyNum <= 0) {
    return res.render("orders_new", {
      title: "Neue Bestellung",
      subtitle: "Bestellung anlegen",
      nav,
      userLabel: `${u.displayName} (${u.role})`,
      coffees,
      error: "Bitte alle Felder korrekt ausfüllen.",
      ok: null
    });
  }

  const channel = u.role === "b2b" ? "b2b" : "branch";

  const insertOrder = db.prepare("INSERT INTO orders (user_id, channel, note) VALUES (?,?,?)");
  const info = insertOrder.run(u.id, channel, note || null);

  db.prepare("INSERT INTO order_items (order_id, coffee_id, size, qty) VALUES (?,?,?,?)")
    .run(info.lastInsertRowid, Number(coffee_id), size, qtyNum);

  return res.render("orders_new", {
    title: "Neue Bestellung",
    subtitle: "Bestellung anlegen",
    nav,
    userLabel: `${u.displayName} (${u.role})`,
    coffees,
    error: null,
    ok: "✅ Bestellung wurde gespeichert."
  });
});

app.get("/orders/mine", requireAuth, (req, res) => {
  const u = req.session.user;
  const nav = buildNav(req.path, u.role);

  const rows = db.prepare(`
    SELECT
      o.id,
      o.status,
      o.created_at,
      o.note,
      c.name AS coffee_name,
      i.size,
      i.qty
    FROM orders o
    JOIN order_items i ON i.order_id = o.id
    JOIN coffees c ON c.id = i.coffee_id
    WHERE o.user_id=?
    ORDER BY o.id DESC
    LIMIT 50
  `).all(u.id);

  res.render("orders_mine", {
    title: "Meine Bestellungen",
    subtitle: "Letzte 50",
    nav,
    userLabel: `${u.displayName} (${u.role})`,
    rows
  });
});

// --- ADMIN AREA ---
app.get("/admin", requireRole(["admin"]), (req, res) => {
  const u = req.session.user;
  const nav = buildNav("/admin", u.role);

  const totals = {
    users: db.prepare("SELECT COUNT(*) AS c FROM users").get().c,
    orders: db.prepare("SELECT COUNT(*) AS c FROM orders").get().c,
    open: db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status IN ('offen','in_arbeit')").get().c
  };

  res.render("admin/dashboard", {
    title: "Admin Dashboard",
    subtitle: "Rösterei",
    nav,
    userLabel: `${u.displayName} (${u.role})`,
    totals
  });
});

app.get("/admin/coffees", requireRole(["admin"]), (req, res) => {
  const u = req.session.user;
  const nav = buildNav("/admin/coffees", u.role);

  const coffees = db.prepare("SELECT * FROM coffees ORDER BY id DESC").all();
  res.render("admin/coffees", {
    title: "Kaffeesorten",
    subtitle: "Verwalten",
    nav,
    userLabel: `${u.displayName} (${u.role})`,
    coffees
  });
});

app.post("/admin/coffees", requireRole(["admin"]), (req, res) => {
  const { name } = req.body;
  if (name && name.trim().length >= 2) {
    db.prepare("INSERT INTO coffees (name, active) VALUES (?,1)").run(name.trim());
    const coffeeId = db.prepare("SELECT last_insert_rowid() AS id").get().id;
    db.prepare("INSERT INTO inventory (coffee_id, min_qty, current_qty) VALUES (?,0,0)").run(coffeeId);
  }
  res.redirect("/admin/coffees");
});

app.post("/admin/coffees/toggle", requireRole(["admin"]), (req, res) => {
  const id = Number(req.body.id);
  const row = db.prepare("SELECT active FROM coffees WHERE id=?").get(id);
  if (row) db.prepare("UPDATE coffees SET active=? WHERE id=?").run(row.active ? 0 : 1, id);
  res.redirect("/admin/coffees");
});

app.get("/admin/users", requireRole(["admin"]), (req, res) => {
  const u = req.session.user;
  const nav = buildNav("/admin/users", u.role);

  const users = db.prepare("SELECT id, username, role, display_name, created_at FROM users ORDER BY id DESC").all();
  res.render("admin/users", {
    title: "Benutzer",
    subtitle: "Verwalten",
    nav,
    userLabel: `${u.displayName} (${u.role})`,
    users
  });
});

app.post("/admin/users", requireRole(["admin"]), (req, res) => {
  const bcrypt = require("bcryptjs");
  const { username, password, role, display_name } = req.body;
  if (!username || !password || !role) return res.redirect("/admin/users");

  const hash = bcrypt.hashSync(password, 10);
  try {
    db.prepare("INSERT INTO users (username, password_hash, role, display_name) VALUES (?,?,?,?)")
      .run(username.trim(), hash, role, display_name?.trim() || null);
  } catch (e) {
    // ignore duplicate user errors silently for MVP
  }
  res.redirect("/admin/users");
});

app.listen(PORT, () => {
  console.log(`✅ Bunca app running on http://localhost:${PORT}`);
});
