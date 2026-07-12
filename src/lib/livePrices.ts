import type { Offer } from '../types'

/**
 * Echte Flugpreise aus public/live-prices.json (täglich per GitHub Actions
 * von der Travelpayouts/Aviasales-API geladen). Fehlt die Datei oder ist sie
 * leer, bleiben die Richtwerte aus den Angebotsdaten aktiv.
 */

export interface LivePriceData {
  updatedAt: string | null
  currency: string
  flights: Record<string, { origin: string; price: number }>
}

export const EMPTY_LIVE_PRICES: LivePriceData = { updatedAt: null, currency: 'EUR', flights: {} }

/** Unbekannte/kaputte JSON-Struktur defensiv normalisieren. */
export function normalizeLivePrices(json: unknown): LivePriceData {
  if (typeof json !== 'object' || json === null) return EMPTY_LIVE_PRICES
  const data = json as Partial<LivePriceData>
  const flights: LivePriceData['flights'] = {}
  if (typeof data.flights === 'object' && data.flights !== null) {
    for (const [id, entry] of Object.entries(data.flights)) {
      if (entry && typeof entry.price === 'number' && entry.price > 0) {
        flights[id] = { origin: String(entry.origin ?? ''), price: entry.price }
      }
    }
  }
  return {
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    currency: typeof data.currency === 'string' ? data.currency : 'EUR',
    flights,
  }
}

/** Live-Preise auf die Angebote anwenden (nur wo eine Fluganreise existiert). */
export function applyLivePrices(offers: Offer[], data: LivePriceData): Offer[] {
  return offers.map((offer) => {
    const live = data.flights[offer.id]
    if (!live || offer.flightPricePerPerson === null) return offer
    return { ...offer, flightPricePerPerson: Math.round(live.price), livePrice: true }
  })
}

export async function fetchLivePrices(): Promise<LivePriceData> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}live-prices.json`)
    if (!response.ok) return EMPTY_LIVE_PRICES
    return normalizeLivePrices(await response.json())
  } catch {
    return EMPTY_LIVE_PRICES
  }
}
