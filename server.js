require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const PDFDocument = require("pdfkit");

const { DB_PATH, openDb, init } = require("./db/init");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true }
  })
);

// --- DB init on boot
init().catch((e) => {
  console.error("DB init failed:", e);
  process.exit(1);
});

// --- helpers
function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}
function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  if (req.session.user.role !== "admin") return res.status(403).send("Nicht erlaubt.");
  next();
}

function buildNav(user) {
  if (!user) return [];

  const isAdmin = user.role === "admin";

  if (isAdmin) {
    return [
      { href: "/admin", label: "Admin Dashboard", icon: "🛠️", active: false },
      { href: "/admin/orders", label: "Bestellungen", icon: "📦", active: false }
    ];
  }

  return [
    { href: "/dashboard", label: "Dashboard", icon: "🏠", active: false },
    { href: "/orders/new", label: "Neue Bestellung", icon: "➕", active: false },
    { href: "/orders", label: "Meine Bestellungen", icon: "📦", active: false }
  ];
}

function renderWithLayout(res, view, params) {
  res.render(view, params, (err, html) => {
    if (err) return res.status(500).send(err.message);
    res.render("layout", { ...params, body: html });
  });
}

function setActiveNav(nav, href) {
  return nav.map((n) => ({ ...n, active: n.href === href }));
}

// --- routes
app.get("/", (req, res) => {
  if (req.session.user) return res.redirect("/dashboard");
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  const nav = [];
  renderWithLayout(res, "login", {
    title: "Login",
    subtitle: "Bestellsystem",
    nav,
    userLabel: null,
    error: null
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const db = openDb();

  try {
    const user = await dbGet(db, "SELECT * FROM users WHERE username = ?", [username]);
    if (!user) {
      const nav = [];
      return renderWithLayout(res, "login", {
        title: "Login",
        subtitle: "Bestellsystem",
        nav,
        userLabel: null,
        error: "Benutzername oder Passwort ist falsch."
      });
    }

    const ok = await bcrypt.compare(password || "", user.password_hash);
    if (!ok) {
      const nav = [];
      return renderWithLayout(res, "login", {
        title: "Login",
        subtitle: "Bestellsystem",
        nav,
        userLabel: null,
        error: "Benutzername oder Passwort ist falsch."
      });
    }

    req.session.user = { id: user.id, role: user.role, label: user.label, username: user.username };

    if (user.role === "admin") return res.redirect("/admin");
    return res.redirect("/dashboard");
  } catch (e) {
    return res.status(500).send(e.message);
  } finally {
    db.close();
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// User dashboard
app.get("/dashboard", requireAuth, (req, res) => {
  const user = req.session.user;
  if (user.role === "admin") return res.redirect("/admin");

  const nav = setActiveNav(buildNav(user), "/dashboard");

  renderWithLayout(res, "dashboard", {
    title: "Dashboard",
    subtitle: "Benutzerbereich",
    nav,
    userLabel: user.label,
    role: user.role
  });
});

// Create new order
app.get("/orders/new", requireAuth, (req, res) => {
  const user = req.session.user;
  if (user.role === "admin") return res.redirect("/admin");

  const nav = setActiveNav(buildNav(user), "/orders/new");

  renderWithLayout(res, "dashboard", {
    title: "Neue Bestellung",
    subtitle: "Benutzerbereich",
    nav,
    userLabel: user.label,
    role: user.role,
    page: "new-order",
    error: null,
    success: null
  });
});

app.post("/orders/new", requireAuth, async (req, res) => {
  const user = req.session.user;
  if (user.role === "admin") return res.status(400).send("Admin kann hier nicht bestellen.");

  const { customer_name, items } = req.body;

  // items comes as JSON string from form
  let parsedItems = [];
  try {
    parsedItems = JSON.parse(items || "[]");
    if (!Array.isArray(parsedItems) || parsedItems.length === 0) throw new Error("empty");
  } catch {
    const nav = setActiveNav(buildNav(user), "/orders/new");
    return renderWithLayout(res, "dashboard", {
      title: "Neue Bestellung",
      subtitle: "Benutzerbereich",
      nav,
      userLabel: user.label,
      role: user.role,
      page: "new-order",
      error: "Bitte mindestens 1 Artikel hinzufügen.",
      success: null
    });
  }

  const db = openDb();
  try {
    await dbRun(
      db,
      "INSERT INTO orders (user_id, customer_name, items_json, status) VALUES (?,?,?,?)",
      [user.id, customer_name || user.label, JSON.stringify(parsedItems), "Offen"]
    );

    return res.redirect("/orders");
  } catch (e) {
    return res.status(500).send(e.message);
  } finally {
    db.close();
  }
});

// List my orders
app.get("/orders", requireAuth, async (req, res) => {
  const user = req.session.user;
  if (user.role === "admin") return res.redirect("/admin/orders");

  const nav = setActiveNav(buildNav(user), "/orders");

  const db = openDb();
  try {
    const orders = await dbAll(
      db,
      "SELECT id, customer_name, status, created_at FROM orders WHERE user_id = ? ORDER BY id DESC",
      [user.id]
    );

    renderWithLayout(res, "dashboard", {
      title: "Meine Bestellungen",
      subtitle: "Benutzerbereich",
      nav,
      userLabel: user.label,
      role: user.role,
      page: "orders",
      orders
    });
  } catch (e) {
    res.status(500).send(e.message);
  } finally {
    db.close();
  }
});

// Order PDF (user or admin)
app.get("/orders/:id/pdf", requireAuth, async (req, res) => {
  const user = req.session.user;
  const orderId = Number(req.params.id);
  const db = openDb();

  try {
    const order = await dbGet(db, "SELECT * FROM orders WHERE id = ?", [orderId]);
    if (!order) return res.status(404).send("Bestellung nicht gefunden.");

    // authorization: owner or admin
    if (user.role !== "admin" && order.user_id !== user.id) return res.status(403).send("Nicht erlaubt.");

    const items = JSON.parse(order.items_json || "[]");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="bestellung-${order.id}.pdf"`);

    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res);

    doc.fontSize(18).text("Bunca Rösterei – Bestellbeleg", { bold: true });
    doc.moveDown(0.5);

    doc.fontSize(11).text(`Bestellung #: ${order.id}`);
    doc.text(`Kunde: ${order.customer_name}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Datum: ${order.created_at}`);
    doc.moveDown();

    doc.fontSize(12).text("Artikel:");
    doc.moveDown(0.25);

    items.forEach((it, idx) => {
      doc.fontSize(11).text(`${idx + 1}. ${it.name} — ${it.qty} × ${it.unit || ""}`.trim());
    });

    doc.moveDown();
    doc.fontSize(10).text("Danke – Bunca Rösterei ☕");

    doc.end();
  } catch (e) {
    res.status(500).send(e.message);
  } finally {
    db.close();
  }
});

// --- Admin
app.get("/admin", requireAdmin, async (req, res) => {
  const user = req.session.user;
  const nav = setActiveNav(buildNav(user), "/admin");

  renderWithLayout(res, "admin/dashboard", {
    title: "Admin Dashboard",
    subtitle: "Rösterei",
    nav,
    userLabel: user.label
  });
});

app.get("/admin/orders", requireAdmin, async (req, res) => {
  const user = req.session.user;
  const nav = setActiveNav(buildNav(user), "/admin/orders");

  const db = openDb();
  try {
    const orders = await dbAll(
      db,
      `SELECT o.id, o.customer_name, o.status, o.created_at, u.label as user_label
       FROM orders o
       JOIN users u ON u.id = o.user_id
       ORDER BY o.id DESC`
    );

    renderWithLayout(res, "admin/dashboard", {
      title: "Bestellungen",
      subtitle: "Rösterei",
      nav,
      userLabel: user.label,
      page: "orders",
      orders
    });
  } catch (e) {
    res.status(500).send(e.message);
  } finally {
    db.close();
  }
});

app.post("/admin/orders/:id/status", requireAdmin, async (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;
  const allowed = new Set(["Offen", "In Arbeit", "Versandt", "Abgeschlossen"]);
  if (!allowed.has(status)) return res.status(400).send("Ungültiger Status.");

  const db = openDb();
  try {
    await dbRun(db, "UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
    res.redirect("/admin/orders");
  } catch (e) {
    res.status(500).send(e.message);
  } finally {
    db.close();
  }
});

// --- start
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => console.log(`Bunca Roastery running on :${PORT}`));
