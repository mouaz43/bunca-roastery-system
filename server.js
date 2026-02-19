// server.js
const path = require("path");
const express = require("express");
const expressLayouts = require("express-ejs-layouts");

const pageRoutes = require("./routes/pageRoutes");
const actionRoutes = require("./routes/actionRoutes");

// Optional API placeholders (safe if they exist)
let orderRoutes, productionRoutes, inventoryRoutes, analyticsRoutes;
try { orderRoutes = require("./routes/orderRoutes"); } catch (e) {}
try { productionRoutes = require("./routes/productionRoutes"); } catch (e) {}
try { inventoryRoutes = require("./routes/inventoryRoutes"); } catch (e) {}
try { analyticsRoutes = require("./routes/analyticsRoutes"); } catch (e) {}

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(expressLayouts);
app.set("layout", "partials/layout");

// UI pages
app.use("/", pageRoutes);

// UI actions (POST)
app.use("/actions", actionRoutes);

// API placeholders (only mount if present)
if (orderRoutes) app.use("/api/orders", orderRoutes);
if (productionRoutes) app.use("/api/production", productionRoutes);
if (inventoryRoutes) app.use("/api/inventory", inventoryRoutes);
if (analyticsRoutes) app.use("/api/analytics", analyticsRoutes);

app.use((req, res) => {
  res.status(404).send("Seite nicht gefunden.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bunca Roastery System läuft auf Port ${PORT}`);
});
