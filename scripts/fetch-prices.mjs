/**
 * Holt echte günstigste Flugpreise (hin & zurück, pro Person) von der
 * Travelpayouts-Daten-API (Aviasales) für alle Angebote mit Fluganreise –
 * je Route den günstigsten Preis pro Monat für die nächsten 6 Monate –
 * und schreibt sie nach public/live-prices.json.
 *
 * Läuft im Deploy-Workflow mit dem Repository-Secret TRAVELPAYOUTS_TOKEN.
 * Ohne Token oder bei API-Fehlern entsteht eine leere Preisdatei und der
 * Build läuft normal weiter (die App zeigt dann die Richtwerte).
 *
 * Aufruf: node --experimental-strip-types scripts/fetch-prices.mjs
 */
import { writeFileSync } from 'node:fs'
import { OFFERS } from '../src/data/offers.ts'

const OUTPUT = new URL('../public/live-prices.json', import.meta.url)
const MONTHS_AHEAD = 6
const token = process.env.TRAVELPAYOUTS_TOKEN

const result = {
  updatedAt: new Date().toISOString(),
  currency: 'EUR',
  source: 'Travelpayouts/Aviasales',
  flights: {},
}

function write() {
  writeFileSync(OUTPUT, JSON.stringify(result, null, 2) + '\n')
}

if (!token) {
  result.updatedAt = null
  write()
  console.warn('TRAVELPAYOUTS_TOKEN fehlt – leere Preisdatei geschrieben (Richtwerte bleiben aktiv).')
  process.exit(0)
}

/** Monat als yyyy-mm, n Monate ab heute. */
function monthKey(offset) {
  const date = new Date()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + offset)
  return date.toISOString().slice(0, 7)
}

const routes = OFFERS.filter(
  (offer) => offer.destinationAirport !== null && offer.departureAirports.length > 0,
)

let fetched = 0
for (const offer of routes) {
  const origin = offer.departureAirports.includes('FRA') ? 'FRA' : offer.departureAirports[0]
  const months = {}
  let best = null

  for (let offset = 0; offset < MONTHS_AHEAD; offset++) {
    const month = monthKey(offset)
    const url =
      `https://api.travelpayouts.com/v1/prices/cheap` +
      `?origin=${origin}&destination=${offer.destinationAirport}` +
      `&depart_date=${month}&return_date=${month}&currency=eur`
    try {
      const response = await fetch(url, { headers: { 'X-Access-Token': token } })
      if (!response.ok) continue
      const json = await response.json()
      const tickets = Object.values(json.data?.[offer.destinationAirport] ?? {})
      if (tickets.length === 0) continue
      const cheapest = tickets.reduce((a, b) => (a.price <= b.price ? a : b))
      const entry = {
        price: Math.round(cheapest.price),
        departureAt: cheapest.departure_at ? cheapest.departure_at.slice(0, 10) : null,
        returnAt: cheapest.return_at ? cheapest.return_at.slice(0, 10) : null,
      }
      months[month] = entry
      if (!best || entry.price < best.price) best = { month, ...entry }
    } catch (error) {
      console.warn(`${offer.id} ${month}: ${error.message}`)
    }
    // API schonen (Rate-Limit)
    await new Promise((resolve) => setTimeout(resolve, 150))
  }

  if (best) {
    result.flights[offer.id] = {
      origin,
      price: best.price,
      month: best.month,
      departureAt: best.departureAt,
      returnAt: best.returnAt,
      months,
    }
    fetched++
  } else {
    console.warn(`${offer.id}: keine Preise für ${origin}->${offer.destinationAirport}`)
  }
}

write()
console.log(`Fertig: ${fetched}/${routes.length} Routen mit Live-Preisen (je bis zu ${MONTHS_AHEAD} Monate).`)
