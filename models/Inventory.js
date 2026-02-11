// models/Inventory.js
// Inventory-Modell für das Bunca Roastery System
// Repräsentiert den Lagerbestand für Rohkaffee, gerösteten Kaffee und Verpackungsmaterial.
class Inventory {
  constructor(id, coffeeId, greenBeans = 0, roastedBeans = 0, packaging = 0) {
    this.id = id; // eindeutige Inventar-ID
    this.coffeeId = coffeeId; // Referenz auf Coffee-Modell
    this.greenBeans = greenBeans; // Menge an Rohkaffee (kg)
    this.roastedBeans = roastedBeans; // Menge an geröstetem Kaffee (kg)
    this.packaging = packaging; // Anzahl Verpackungseinheiten
  }
}
module.exports = Inventory;
