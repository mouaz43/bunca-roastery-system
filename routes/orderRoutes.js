const express = require('express');
const router = express.Router();

// GET all orders
router.get('/', (req, res) => {
  // TODO: Integrate controller logic to fetch orders
  res.json({ message: 'Liste aller Bestellungen (Platzhalter).' });
});

// POST a new order
router.post('/', (req, res) => {
  // TODO: Integrate controller logic to create an order
  res.json({ message: 'Bestellung erstellt (Platzhalter).' });
});

module.exports = router;
