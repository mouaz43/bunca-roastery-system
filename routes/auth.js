const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../db");

const router = express.Router();

router.get("/login", (req, res) => {
  if (req.session?.user) {
    return res.redirect(req.session.user.role === "admin" ? "/admin" : "/shop");
  }
  res.render("login", { title: "Login", error: null });
});

router.post("/login", async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const password = req.body.password || "";

  if (!email || !password) {
    return res.status(400).render("login", { title: "Login", error: "Missing email or password." });
  }

  try {
    const result = await query(
      `SELECT u.id, u.email, u.password_hash, u.role, u.shop_id, u.is_active,
              s.name AS shop_name, s.code AS shop_code
       FROM users u
       LEFT JOIN shops s ON s.id = u.shop_id
       WHERE u.email = $1`,
      [email]
    );

    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).render("login", { title: "Login", error: "Invalid credentials." });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).render("login", { title: "Login", error: "Invalid credentials." });
    }

    req.session.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shop_id,
      shopName: user.shop_name || null,
      shopCode: user.shop_code || null
    };

    return res.redirect(user.role === "admin" ? "/admin" : "/shop");
  } catch (err) {
    console.error(err);
    return res.status(500).render("login", { title: "Login", error: "Server error. Try again." });
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

module.exports = router;
