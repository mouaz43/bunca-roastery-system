/**
 * Modell für Kaffeesorten.
 * Attribute:
 * - id: eindeutige Kennung
 * - name: Name der Kaffeemischung
 * - origin: Herkunftsland/-region
 * - roastProfile: Beschreibung des Röstprofils
 */
class Coffee {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.origin = data.origin;
    this.roastProfile = data.roastProfile;
  }
}

module.exports = Coffee;
