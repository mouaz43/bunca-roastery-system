// models/Batch.js
// Batch-Modell für das Bunca Roastery System
// Repräsentiert eine Röstcharge mit Datum, Kaffee, Menge und Status.
class Batch {
  constructor(id, coffeeId, quantity = 0, roastDate = new Date(), status = 'geplant') {
    this.id = id; // eindeutige Chargen-ID
    this.coffeeId = coffeeId; // Referenz auf Coffee-Modell
    this.quantity = quantity; // Menge in kg
    this.roastDate = roastDate; // Datum der Röstung
    this.status = status; // Status der Charge (geplant, geröstet, verpackt)
  }
}
module.exports = Batch;
