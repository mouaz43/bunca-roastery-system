const path = require("path");
const express = require("express");
const expressLayouts = require("express-ejs-layouts");

const pageRoutes = require("./routes/pageRoutes");
const actionRoutes = require("./routes/actionRoutes");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(expressLayouts);
app.set("layout", "partials/layout");

app.use("/", pageRoutes);
app.use("/actions", actionRoutes);

app.use((req, res) => res.status(404).send("Seite nicht gefunden."));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bunca Roastery System läuft auf Port ${PORT}`));
