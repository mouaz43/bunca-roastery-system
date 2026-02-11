// routes/analyticsRoutes.js
// Routen für Analysen und Auswertungen im Bunca Roastery System
const express = require('express');
const router = express.Router();

// GET /analytics - liefert Kennzahlen und Analysen (Platzhalter)
router.get('/', (req, res) => {
  res.json({ message: 'Analytics-Übersicht – Kennzahlen zu Kaffeeverbrauch, Bestellungen und Produktion' });
});

module.exports = router;
