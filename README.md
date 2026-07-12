# 🌴 Urlaubsfinder Pro

Professionelle Web-App zum Finden von Urlaubsreisen – Pauschalreise, nur Hotel oder nur Flug – mit den Kriterien, die wirklich zählen.

**➡️ Live ausprobieren: [alex1977-code.github.io/Urlaubsfinder-Pro](https://alex1977-code.github.io/Urlaubsfinder-Pro/)**

Die Seite wird bei jedem Push automatisch per GitHub Actions gebaut und auf GitHub Pages veröffentlicht (siehe `.github/workflows/deploy.yml`).

## Features

**Reiseart:** Pauschalreise · Nur Hotel · Nur Flug

**Suchkriterien & Filter:**

| Kriterium | Umsetzung |
| --- | --- |
| Preis | Schieberegler „Max. Preis pro Person“ |
| Hotelsterne | Mindest-Kategorie (3★+, 4★+, 5★) |
| Bewertungen | Mindest-Gästebewertung (0–10) inkl. Anzahl Bewertungen |
| Strandnähe | Maximale Entfernung zum Strand (100 m – 2 km) |
| Familienhotel | Filter „Familienhotel“ |
| Max. Flugzeit | Schieberegler in Stunden |
| 🚽 Papier in Toilette | Filter „Papier darf in die Toilette“ – wird pro Hotel ausgewiesen |
| Unterhaltung | Anspruchsstufe Egal / Gut / Top |
| Strand | Anspruchsstufe Egal / Gut / Top |
| Berge | Anspruchsstufe Egal / Gut / Top |
| Ausflugsmöglichkeiten | Anspruchsstufe Egal / Gut / Top |
| Einkaufsmöglichkeiten | Anspruchsstufe Egal / Gut / Top |
| Essensqualität | Anspruchsstufe Egal / Gut / Top |
| Erholungsfaktor | Anspruchsstufe Egal / Gut / Top |
| Parkplätze | Ausstattungsfilter |
| Spa & Wellness | Ausstattungsfilter |
| Pool / Whirlpool | Ausstattungsfilter |
| Sonnenfaktor | Mindest-Sonnenstunden pro Tag |
| Abflughafen | Auswahl aus 10 deutschen Flughäfen |

**Weitere Funktionen:** Volltextsuche (Ziel, Region, Hotelname), Sortierung (Empfehlung, Preis, Bewertung, Kategorie), aktive Filter zählen & zurücksetzen, responsives Design (Filter auf Mobilgeräten einklappbar), leerer Zustand mit Reset.

## Tech-Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) (strict)
- [Vite 7](https://vite.dev) als Build-Tool
- [Tailwind CSS 4](https://tailwindcss.com) für das Styling
- [Vitest](https://vitest.dev) für Unit-Tests der Filter-Engine

## Entwicklung

```bash
npm install       # Abhängigkeiten installieren
npm run dev       # Dev-Server starten (http://localhost:5173)
npm run build     # Produktions-Build (inkl. Typprüfung)
npm run preview   # Produktions-Build lokal testen
npm test          # Unit-Tests ausführen
```

## Architektur

```
src/
├── types.ts              # Datenmodell (Offer, Filters, ScoreKey, …)
├── data/
│   ├── offers.ts         # Beispiel-Angebote (in Produktion: Buchungs-API)
│   └── airports.ts       # Wählbare Abflughäfen
├── lib/
│   ├── filter.ts         # Filter-Engine, Sortierung, Empfehlungs-Score
│   ├── filter.test.ts    # Unit-Tests
│   └── format.ts         # Formatierung (Preis, Flugzeit, Strandentfernung)
├── components/
│   ├── SearchBar.tsx     # Reiseart + Volltextsuche
│   ├── FilterSidebar.tsx # Alle Filterkriterien
│   ├── OfferCard.tsx     # Ergebnis-Karte
│   └── ui.tsx            # Wiederverwendbare Bausteine
└── App.tsx               # Layout & State
```

Die Angebotsdaten sind aktuell Beispieldaten (`src/data/offers.ts`). Die Filter-Engine ist davon entkoppelt und kann unverändert an eine echte Buchungs-API (z. B. Amadeus, Peakwork) angeschlossen werden.
