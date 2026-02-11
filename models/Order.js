// models/Order.js
// Bestellung Modell für das Bunca Roastery System
// Repräsentiert eine Bestellung eines Shops oder B2B-Kunden mit Positionen und Status.

class Order {
  constructor(id, shopId, items = [], status = 'offen', createdAt = new Date()) {
    this.id = id; // eindeutige ID der Bestellung
    this.shopId = shopId; // ID des Shops oder Kunden, der die Bestellung aufgegeben hat
    this.items = items; // Array mit Bestellpositionen { coffeeId, quantity }
    this.status = status; // Status der Bestellung (offen, in Produktion, abgeschlossen)
    this.createdAt = createdAt; // Datum der Erstellung der Bestellung
  }
}

module.exports = Order;
