import type { Offer } from '../types'

/**
 * Echte Flugpreise aus public/live-prices.json (täglich per GitHub Actions
 * von der Travelpayouts/Aviasales-API geladen, günstigster Preis je Monat).
 * Fehlt die Datei oder ist sie leer, bleiben die Richtwerte aktiv.
 */

export interface LiveMonthPrice {
  price: number
  departureAt: string | null
  returnAt: string | null
}

export interface LiveFlightEntry extends LiveMonthPrice {
  origin: string
  month: string | null
  months: Record<string, LiveMonthPrice>
}

export interface LivePriceData {
  updatedAt: string | null
  currency: string
  flights: Record<string, LiveFlightEntry>
}

export const EMPTY_LIVE_PRICES: LivePriceData = { updatedAt: null, currency: 'EUR', flights: {} }

function normalizeMonthPrice(entry: unknown): LiveMonthPrice | null {
  if (typeof entry !== 'object' || entry === null) return null
  const data = entry as Partial<LiveMonthPrice>
  if (typeof data.price !== 'number' || data.price <= 0) return null
  return {
    price: data.price,
    departureAt: typeof data.departureAt === 'string' ? data.departureAt : null,
    returnAt: typeof data.returnAt === 'string' ? data.returnAt : null,
  }
}

/** Unbekannte/kaputte JSON-Struktur defensiv normalisieren. */
export function normalizeLivePrices(json: unknown): LivePriceData {
  if (typeof json !== 'object' || json === null) return EMPTY_LIVE_PRICES
  const data = json as Partial<LivePriceData>
  const flights: LivePriceData['flights'] = {}
  if (typeof data.flights === 'object' && data.flights !== null) {
    for (const [id, entry] of Object.entries(data.flights)) {
      const base = normalizeMonthPrice(entry)
      if (!base) continue
      const raw = entry as Partial<LiveFlightEntry>
      const months: Record<string, LiveMonthPrice> = {}
      if (typeof raw.months === 'object' && raw.months !== null) {
        for (const [month, monthEntry] of Object.entries(raw.months)) {
          const normalized = normalizeMonthPrice(monthEntry)
          if (normalized) months[month] = normalized
        }
      }
      flights[id] = {
        ...base,
        origin: String(raw.origin ?? ''),
        month: typeof raw.month === 'string' ? raw.month : null,
        months,
      }
    }
  }
  return {
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    currency: typeof data.currency === 'string' ? data.currency : 'EUR',
    flights,
  }
}

/**
 * Live-Preise auf die Angebote anwenden. Ist ein Reisemonat gewählt und für
 * ihn ein Monatspreis vorhanden, gilt dieser – sonst der günstigste Termin.
 */
export function applyLivePrices(
  offers: Offer[],
  data: LivePriceData,
  departureMonth: string | null = null,
): Offer[] {
  return offers.map((offer) => {
    const live = data.flights[offer.id]
    if (!live || offer.flightPricePerPerson === null) return offer
    const monthMatch = departureMonth ? live.months[departureMonth] : undefined
    const chosen = monthMatch ?? live
    return {
      ...offer,
      flightPricePerPerson: Math.round(chosen.price),
      livePrice: true,
      livePriceInfo: {
        month: monthMatch ? departureMonth : live.month,
        departureAt: chosen.departureAt,
        returnAt: chosen.returnAt,
      },
    }
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
