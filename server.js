// server.js — Bunca Roastery System
// Grundstruktur (Skeleton), noch keine Business-Logik

const express = require('express');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

/* -------------------- Basis Middleware -------------------- */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    store: new SQLiteStore({
      db: 'sessions.db',
      dir: './data'
    }),
    secret: process.env.SESSION_SECRET || 'bunca-roastery-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 2 // 2 Stunden
    }
  })
);

/* -------------------- View Engine -------------------- */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* -------------------- Static Files -------------------- */
app.use(express.static(path.join(__dirname, 'public')));

/* -------------------- Platzhalter Routen -------------------- */

// Login / Logout
app.get('/login', (req, res) => {
  res.send('Login-Seite (kommt als View)');
});

app.post('/login', (req, res) => {
  res.send('Login-Logik kommt später');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Benutzerbereich
app.get('/', (req, res) => {
  res.send('User Dashboard');
});

// Adminbereich
app.get('/admin', (req, res) => {
  res.send('Admin Dashboard');
});

/* -------------------- Server Start -------------------- */
app.listen(PORT, () => {
  console.log(`🔥 Bunca Roastery läuft auf Port ${PORT}`);
});
