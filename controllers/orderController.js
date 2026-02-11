// controllers/orderController.js
// Dieser Controller enthält Logik für das Abrufen und Erstellen von Bestellungen.

// Rückgabe aller Bestellungen (Platzhalterfunktion)
exports.getOrders = (req, res) => {
  // Hier würde man normalerweise Datenbankabfragen ausführen, um Bestellungen abzurufen.
  res.json({ nachricht: 'Bestellübersicht wird hier zur Verfügung gestellt.' });
};

// Erstellen einer neuen Bestellung (Platzhalterfunktion)
exports.createOrder = (req, res) => {
  // Hier würde man normalerweise die Bestellung in der Datenbank speichern.
  res.json({ nachricht: 'Neue Bestellung wurde erstellt.' });
};
