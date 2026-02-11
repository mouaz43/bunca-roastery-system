// routes/inventoryRoutes.js
// Routen für die Lagerverwaltung im Bunca Roastery System
const express = require('express');
const router = express.Router();

// GET /inventory - liefert eine Übersicht des aktuellen Bestands (Platzhalter)
router.get('/', (req, res) => {
  res.json({ message: 'Lagerübersicht – aktueller Bestand an Rohkaffee, geröstetem Kaffee und Verpackung' });
});

// POST /inventory/update - aktualisiert Bestandsmengen (Platzhalter)
router.post('/update', (req, res) => {
  res.json({ message: 'Bestand aktualisiert (Platzhalter)' });
});

module.exports = router;
