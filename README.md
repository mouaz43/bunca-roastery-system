# Bunca Roastery System ☕🔥

Zentrales Bestell-, Produktions- und Lagerverwaltungssystem für die **Bunca Rösterei**.

Dieses System verbindet:
- mehrere **Bunca Cafés (Filialen)**
- **B2B-Kunden**
- eine **zentrale Rösterei**
in einer klaren, einfachen und skalierbaren Web-App.

---

## 🎯 Ziel des Systems

- Filialen geben **Kaffeebestellungen** auf
- Filialen melden ihren **aktuellen Lagerbestand**
- B2B-Kunden bestellen direkt bei der Rösterei
- Die Rösterei sieht **alle Bestellungen gebündelt**
- Automatische **Produktionsplanung** pro Kaffeesorte
- Klare **Statusverfolgung** jeder Bestellung
- Saubere Trennung zwischen **Benutzerbereich** und **Adminbereich**

---

## 👥 Benutzerrollen

### 🧑‍🍳 Filial-Benutzer
- Login
- Bestellung aufgeben
- Lagerbestand eingeben
- Eigene Bestellungen einsehen
- PDF-Bestellbelege herunterladen
- Bestellstatus sehen:
  - Offen
  - In Arbeit
  - Versandt
  - Abgeschlossen

### 🏢 B2B-Kunde
- Login
- Kaffee bestellen (z. B. 1kg / 5kg / 11kg)
- Eigene Bestellungen & PDFs sehen
- Bestellstatus verfolgen

### 🛠️ Admin (Rösterei)
- Volle Kontrolle über das System
- Benutzer & Rollen verwalten
- Kaffeesorten anlegen & bearbeiten
- Lager & Mindestbestände steuern
- Alle Bestellungen sehen (Filialen + B2B)
- Produktionsplanung:
  - Wie viel pro Sorte geröstet werden muss
- Bestellstatus ändern
- Reports & Übersicht

---

## 🧭 Seitenstruktur (UI)

### Öffentlicher Bereich
- Login

### Benutzerbereich
- Dashboard
- Neue Bestellung
- Meine Bestellungen
- Bestellung ansehen (PDF)
- Profil

### Adminbereich
- Admin Dashboard
- Bestellungen
- Produktion
- Kaffeesorten
- Lagerverwaltung
- Benutzerverwaltung
- Reports

Navigation erfolgt über ein **festes Menü** (Sidebar / Hamburger Menü).
Seitenwechsel sind **weich und schnell**, ohne visuelles Chaos.

---

## 🎨 UX / UI Prinzipien

- Deutsch als Systemsprache
- Ruhiges Design (Bunca-Farben)
- Große Buttons für Tablets
- Klare Status-Badges
- Kein Überladen
- Fokus auf Alltagstauglichkeit
- Funktioniert perfekt auf:
  - Tablet (Filialen)
  - Desktop (Rösterei)

---

## 🧱 Technische Basis (geplant)

- Node.js + Express
- EJS Views
- SQLite (lokal & Render-kompatibel)
- Session-Login
- PDF-Generierung
- Hosting: Render
- Repository: GitHub

---

## 🚀 Projektstatus

🟢 **Planungsphase**  
➡️ Als Nächstes:
- Grundstruktur der App
- Ordnerstruktur
- Server-Entry-Point

---

Bunca Roastery System  
Built for real coffee operations, not theory.
