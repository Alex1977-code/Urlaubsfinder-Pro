# 🌴 Urlaubsfinder Pro

Professionelle Web-App zum Finden von Urlaubsreisen – Pauschalreise, nur Hotel oder nur Flug – mit den Kriterien, die wirklich zählen.

**➡️ Live ausprobieren: [alex1977-code.github.io/Urlaubsfinder-Pro](https://alex1977-code.github.io/Urlaubsfinder-Pro/)**

Die Seite wird bei jedem Push automatisch per GitHub Actions gebaut und auf GitHub Pages veröffentlicht (siehe `.github/workflows/deploy.yml`).

## Features

**Reiseart:** Pauschalreise · Nur Hotel · Nur Flug

**Reisedaten:** Reisedatum mit „ungefähr“-Flexibilität (genau, ± 3 Tage, ± 1 Woche) · Dauer (4 Nächte bis 3 Wochen) · Reisende (Erwachsene + Kinder mit Altersangabe; unter 2 J. frei, 2–11 J. 70 %) · Flug mit Aufgabegepäck oder nur Handgepäck. Alle Angaben fließen in den Gesamtpreis und in die Buchungslinks ein (Booking.com erhält Check-in/Check-out und Reisende, Google Flights die Flugdaten).

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

**Weitere Funktionen:** Volltextsuche (Ziel, Region, Hotelname – optional, ohne Eingabe werden alle Angebote gezeigt), Sortierung (Empfehlung, Preis, Bewertung, Kategorie), aktive Filter zählen & zurücksetzen, responsives Design (Filter auf Mobilgeräten einklappbar), leerer Zustand mit Reset.

**✈️ Echte Flugpreise:** Ein täglicher GitHub-Actions-Lauf (04:23 UTC) holt über die Travelpayouts/Aviasales-Daten-API die günstigsten realen Flugpreise für alle Ziele (Repository-Secret `TRAVELPAYOUTS_TOKEN`, siehe `scripts/fetch-prices.mjs`) und legt sie als `live-prices.json` in den Build. Die App überblendet damit die Richtwerte und kennzeichnet sie mit einem LIVE-Badge; ohne Token/Daten bleiben die Richtwerte aktiv.

**🌐 Live-Suche (alle Hotels):** Neben den 40 kuratierten Angeboten fragt die Live-Suche in Echtzeit **alle in OpenStreetMap erfassten Hotels** eines beliebigen Ziels weltweit ab (Geokodierung über Nominatim, Hotels über die Overpass-API – schlüssellos und kostenlos). Jedes gefundene Hotel verlinkt auf aktuelle Preise bei Booking.com (mit Reisedaten) sowie Karte und Website; dazu ein Google-Flights-Link für Flugangebote zum gesuchten Ziel.

**Detailansicht mit echten Angeboten:** „Zum Angebot“ öffnet eine Detailansicht mit allen Kriterien und Links zu tagesaktuellen, buchbaren Angeboten – Hotelpreise auf Booking.com, Flugsuche über Google Flights (berücksichtigt den gewählten Abflughafen) und Lage auf Google Maps. Die Hotels in den Beispieldaten sind echte Hotels.

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
│   ├── trip.ts           # Reisedaten: Dauer, Reisende, Gepäck, Gesamtpreis
│   ├── links.ts          # Links zu echten Angeboten (Booking.com, Google Flights)
│   ├── live.ts           # Live-Hotelsuche (Nominatim + Overpass/OpenStreetMap)
│   ├── images.ts         # Hotelfotos von Wikimedia Commons
│   ├── format.ts         # Formatierung (Preis, Flugzeit, Strandentfernung)
│   └── *.test.ts         # Unit-Tests
├── components/
│   ├── SearchBar.tsx     # Reiseart + Volltextsuche
│   ├── FilterSidebar.tsx # Alle Filterkriterien
│   ├── OfferCard.tsx     # Ergebnis-Karte
│   ├── OfferDetailDialog.tsx # Detailansicht mit Buchungslinks
│   └── ui.tsx            # Wiederverwendbare Bausteine
└── App.tsx               # Layout & State
```

Die Angebotsdaten sind aktuell Beispieldaten (`src/data/offers.ts`). Die Filter-Engine ist davon entkoppelt und kann unverändert an eine echte Buchungs-API (z. B. Amadeus, Peakwork) angeschlossen werden.
