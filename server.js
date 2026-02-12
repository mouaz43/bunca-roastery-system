// server.js
// Bunca Roastery System - Express App (EJS UI + API Skeleton)

const path = require("path");
const express = require("express");
const expressLayouts = require("express-ejs-layouts");

const pageRoutes = require("./routes/pageRoutes");

// Später: API routes (bestehen schon als Platzhalter)
const orderRoutes = require("./routes/orderRoutes");
const productionRoutes = require("./routes/productionRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();

// Basic middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(path.join(__dirname, "public")));

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Layouts
app.use(expressLayouts);
app.set("layout", "partials/layout");

// UI pages
app.use("/", pageRoutes);

// API placeholders
app.use("/api/orders", orderRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/analytics", analyticsRoutes);

// 404
app.use((req, res) => {
  res.status(404).send("Seite nicht gefunden.");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bunca Roastery System läuft auf Port ${PORT}`);
});
