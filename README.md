# Bunca Roastery System  

Dieses Repository enthält den Quellcode für das interne Produktions ‑ und Bestellsystem der Bunca Rösterei. Das System ist eine maßgeschneiderte Softwarelösung zur Verwaltung der Bestellungen von Filialen und B2B ‑ Kunden, zur Planung der Röstproduktion, zur Lagerverwaltung und zur Analyse der Unternehmensdaten.  

## Philosophie  

Das System reduziert manuelle Prozesse (z.  B. WhatsApp ‑ Bestellungen), verhindert Fehler bei der Mengenplanung und ermöglicht datengetriebene Entscheidungen. Es ist vollständig auf Deutsch gehalten und nutzt klare, präzise Formulierungen ohne Emojis.  

## Hauptbereiche  

- **Dashboard:** Überblick über Bestellungen, Produktionslast, Lagerbestand und Prognosen. Statusanzeigen werden als farbige Badges dargestellt („Operational“, „Attention“, „Action Required“).  
- **Bestellungen:** Filialen und B2B ‑ Kunden können schnell Bestellungen erfassen. Das System schlägt Mengen anhand historischer Daten vor und zeigt Kennzahlen wie den Durchschnittsverbrauch der letzten vier Wochen.  
- **Produktion:** Kanban ‑ und Kalenderansichten zum Planen und Nachverfolgen von Röstchargen mit Statusstufen (Geplant, Rösten, Kühlen, Verpackt, Ausgeliefert). Chargen können nach Freigabe gesperrt werden.  
- **Lager:** Verwaltung der Lagerbestände für Rohkaffee, gerösteten Kaffee und Verpackungsmaterialien. Warnungen, wenn Bestände unter Sicherheitsniveau fallen, sowie Prognosen zur Restreichweite.  
- **Analysen:** Auswertungen zur Kaffee ‑ Popularität, zum Vergleich der Filialverbräuche, zum Verhältnis B2B/Umsatz, zu Röstverlusten usw.  

## Struktur  

Die Anwendung ist modular aufgebaut. Wichtige Ordner:  

- `server.js` – Einstiegspunkt für den Express ‑ Server.  
- `config/` – Datenbank ‑ und sonstige Konfigurationen.  
- `models/` – Datenmodelle (z.  B. Kaffee, Bestellung, Kunde).  
- `routes/` – API ‑ Routen für Bestellungen, Produktion, Lager etc.  
- `controllers/` – Geschäftslogik für jede Route.  
- `views/` – Templatedateien (falls serverseitiges Rendering genutzt wird).  
- `public/` – Statische Ressourcen wie CSS und clientseitige Skripte.  
- `middleware/` – Middleware wie Authentifizierung und Fehlerbehandlung.  
- `utils/` – Hilfsfunktionen (z.  B. Prognoseberechnungen).  

## Sprachen & Technologien  

- Backend: Node.js mit Express.  
- Datenbank: PostgreSQL.  
- Frontend: React (alternativ EJS) mit deutschsprachiger Oberfläche; mobiles und Tablet ‑ optimiertes Design.  
- Authentifizierung mit Rollen (Superadmin, Rösterei ‑ Mitarbeiter, Filialleiter, B2B ‑ Kunde).  

## Seitenhinweise  

Jede Seite enthält unten einen Kontextbereich („Seitenhinweis“), der erklärt, was auf der Seite möglich ist, warum diese Funktionen wichtig sind und welche Auswirkungen Aktionen haben. Diese Hinweise können dynamische Daten enthalten (z.  B. „Der aktuelle Rohkaffee ‑ Bestand deckt den Bedarf für 11 Tage.“).  

---  

Dieses Repository befindet sich in der Entwicklung. Weitere Dateien und Implementierungen werden in den entsprechenden Ordnern erstellt.
