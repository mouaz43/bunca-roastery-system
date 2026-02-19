// server.js
const path = require("path");
const express = require("express");
const expressLayouts = require("express-ejs-layouts");

const pageRoutes = require("./routes/pageRoutes");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// IMPORTANT: serve /public so /css/app.css works
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Layout wrapper
app.use(expressLayouts);
app.set("layout", "partials/layout");

// Pages
app.use("/", pageRoutes);

// 404
app.use((req, res) => {
  res.status(404).send("Seite nicht gefunden.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bunca Roastery System läuft auf Port ${PORT}`);
});
