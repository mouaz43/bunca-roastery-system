// controllers/productionController.js
// Dieser Controller verwaltet die Logik für die Produktionsplanung und das Erstellen von Röstchargen.

// Übersicht über die Produktionsplanung (Platzhalterfunktion)
exports.getProductionOverview = (req, res) => {
  // Hier würde man normalerweise die geplanten und laufenden Röstungen aus der Datenbank abrufen.
  res.json({ nachricht: 'Produktionsübersicht wird hier angezeigt.' });
};

// Erstellen einer neuen Röstcharge (Platzhalterfunktion)
exports.createBatch = (req, res) => {
  // Hier würde man normalerweise eine neue Röstcharge in der Datenbank anlegen.
  res.json({ nachricht: 'Neue Röstcharge wurde erstellt.' });
};
