/**
 * Holt echte günstigste Flugpreise (hin & zurück, pro Person) von der
 * Travelpayouts-Daten-API (Aviasales) für alle Angebote mit Fluganreise
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

const routes = OFFERS.filter(
  (offer) => offer.destinationAirport !== null && offer.departureAirports.length > 0,
)

let fetched = 0
for (const offer of routes) {
  const origin = offer.departureAirports.includes('FRA') ? 'FRA' : offer.departureAirports[0]
  const url =
    `https://api.travelpayouts.com/v1/prices/cheap` +
    `?origin=${origin}&destination=${offer.destinationAirport}&currency=eur`
  try {
    const response = await fetch(url, { headers: { 'X-Access-Token': token } })
    if (!response.ok) {
      console.warn(`${offer.id}: HTTP ${response.status}`)
      continue
    }
    const json = await response.json()
    const tickets = Object.values(json.data?.[offer.destinationAirport] ?? {})
    if (tickets.length === 0) {
      console.warn(`${offer.id}: keine Preise für ${origin}->${offer.destinationAirport}`)
      continue
    }
    const price = Math.min(...tickets.map((ticket) => ticket.price))
    result.flights[offer.id] = { origin, price: Math.round(price) }
    fetched++
  } catch (error) {
    console.warn(`${offer.id}: ${error.message}`)
  }
  // API schonen (Rate-Limit)
  await new Promise((resolve) => setTimeout(resolve, 250))
}

write()
console.log(`Fertig: ${fetched}/${routes.length} Routen mit Live-Preisen.`)
