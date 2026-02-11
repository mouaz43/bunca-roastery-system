// models/Shop.js
// Shop-Modell für das Bunca Roastery System
// Repräsentiert eine Filiale oder einen B2B-Kunden, der Bestellungen aufgibt.

class Shop {
  constructor(id, name, address = '', contact = '') {
    this.id = id; // eindeutige Shop-ID
    this.name = name; // Name des Shops
    this.address = address; // Adresse des Shops
    this.contact = contact; // Kontaktinformation (z. B. Telefonnummer oder E-Mail)
  }
}

module.exports = Shop;
