// routes/productionRoutes.js
// Routen für die Produktionsplanung und -übersicht im Bunca Roastery System
const express = require('express');
const router = express.Router();

// GET /production - liefert eine Liste der geplanten und laufenden Röstungen (Platzhalter)
router.get('/', (req, res) => {
  res.json({ message: 'Produktionsübersicht – Liste der geplanten und laufenden Röstungen' });
});

// POST /production - erstellt eine neue Produktionscharge (Platzhalter)
router.post('/', (req, res) => {
  res.json({ message: 'Neue Produktionscharge erstellt (Platzhalter)' });
});

module.exports = router;
