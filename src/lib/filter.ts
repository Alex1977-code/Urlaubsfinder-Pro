import type { Filters, Offer, ScoreKey, ScoreLevel, SortKey } from '../types'
import { perPersonPrice } from './trip'

export const SCORE_LABELS: Record<ScoreKey, string> = {
  entertainment: 'Unterhaltung',
  beach: 'Strand',
  mountains: 'Berge',
  excursions: 'Ausflugsmöglichkeiten',
  shopping: 'Einkaufsmöglichkeiten',
  food: 'Essensqualität',
  relaxation: 'Erholungsfaktor',
}

export const SCORE_KEYS = Object.keys(SCORE_LABELS) as ScoreKey[]

/** Obergrenze des Preis-Reglers; entspricht "beliebig teuer". */
export const PRICE_CAP = 2500

/** Mindest-Score, den eine Anspruchsstufe verlangt. */
export const LEVEL_THRESHOLD: Record<Exclude<ScoreLevel, 'any'>, number> = {
  good: 6,
  excellent: 8,
}

export const DEFAULT_FILTERS: Filters = {
  travelType: 'package',
  query: '',
  maxPrice: PRICE_CAP,
  minStars: 0,
  minRating: 0,
  maxFlightHours: null,
  maxBeachDistance: null,
  familyOnly: false,
  paperInToilet: false,
  pool: false,
  whirlpool: false,
  spa: false,
  parking: false,
  airports: [],
  minSunHours: 0,
  scoreLevels: {
    entertainment: 'any',
    beach: 'any',
    mountains: 'any',
    excursions: 'any',
    shopping: 'any',
    food: 'any',
    relaxation: 'any',
  },
}

function matchesQuery(offer: Offer, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = `${offer.name} ${offer.destination} ${offer.region}`.toLowerCase()
  return q.split(/\s+/).every((word) => haystack.includes(word))
}

export function matchesFilters(offer: Offer, f: Filters): boolean {
  if (f.travelType !== 'all' && !offer.travelTypes.includes(f.travelType)) return false
  if (!matchesQuery(offer, f.query)) return false
  if (f.maxPrice < PRICE_CAP && perPersonPrice(offer, f.travelType) > f.maxPrice) return false
  if (offer.hotelStars < f.minStars) return false
  if (offer.rating < f.minRating) return false
  if (f.maxFlightHours !== null && offer.flightHours > f.maxFlightHours) return false
  if (f.maxBeachDistance !== null) {
    if (offer.beachDistanceM === null || offer.beachDistanceM > f.maxBeachDistance) return false
  }
  if (f.familyOnly && !offer.familyHotel) return false
  if (f.paperInToilet && !offer.paperInToilet) return false
  if (f.pool && !offer.amenities.pool) return false
  if (f.whirlpool && !offer.amenities.whirlpool) return false
  if (f.spa && !offer.amenities.spa) return false
  if (f.parking && !offer.amenities.parking) return false
  if (f.airports.length > 0) {
    // Angebote ohne Anreiseflug (z. B. Auto-Anreise) bleiben bei Flughafen-Filter außen vor.
    if (!offer.departureAirports.some((a) => f.airports.includes(a))) return false
  }
  if (offer.sunHoursPerDay < f.minSunHours) return false
  for (const key of SCORE_KEYS) {
    const level = f.scoreLevels[key]
    if (level !== 'any' && offer.scores[key] < LEVEL_THRESHOLD[level]) return false
  }
  return true
}

/**
 * Empfehlungs-Score: Gästebewertung plus Bonus für Kriterien, die dem
 * Nutzer wichtig sind (gewählte Anspruchsstufen), leicht gedämpft durch
 * den Preis, damit "empfohlen" nicht einfach "am teuersten" bedeutet.
 */
export function recommendationScore(offer: Offer, f: Filters): number {
  let score = offer.rating * 10

  const chosen = SCORE_KEYS.filter((key) => f.scoreLevels[key] !== 'any')
  if (chosen.length > 0) {
    const avg = chosen.reduce((sum, key) => sum + offer.scores[key], 0) / chosen.length
    score += avg * 6
  }

  score -= perPersonPrice(offer, f.travelType) / 100
  return score
}

export function sortOffers(offers: Offer[], sort: SortKey, f: Filters): Offer[] {
  const sorted = [...offers]
  const price = (offer: Offer) => perPersonPrice(offer, f.travelType)
  switch (sort) {
    case 'priceAsc':
      sorted.sort((a, b) => price(a) - price(b))
      break
    case 'priceDesc':
      sorted.sort((a, b) => price(b) - price(a))
      break
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating)
      break
    case 'stars':
      sorted.sort((a, b) => b.hotelStars - a.hotelStars || b.rating - a.rating)
      break
    case 'recommended':
      sorted.sort((a, b) => recommendationScore(b, f) - recommendationScore(a, f))
      break
  }
  return sorted
}

export function applyFilters(offers: Offer[], f: Filters, sort: SortKey): Offer[] {
  return sortOffers(
    offers.filter((offer) => matchesFilters(offer, f)),
    sort,
    f,
  )
}

/** Anzahl der aktiven Filter (für den "Filter zurücksetzen"-Hinweis). */
export function countActiveFilters(f: Filters): number {
  let count = 0
  if (f.maxPrice < PRICE_CAP) count++
  if (f.minStars > 0) count++
  if (f.minRating > 0) count++
  if (f.maxFlightHours !== null) count++
  if (f.maxBeachDistance !== null) count++
  if (f.familyOnly) count++
  if (f.paperInToilet) count++
  if (f.pool) count++
  if (f.whirlpool) count++
  if (f.spa) count++
  if (f.parking) count++
  if (f.airports.length > 0) count++
  if (f.minSunHours > 0) count++
  count += SCORE_KEYS.filter((key) => f.scoreLevels[key] !== 'any').length
  return count
}
