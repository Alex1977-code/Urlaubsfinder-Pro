import { describe, expect, it } from 'vitest'
import type { Filters, Offer } from '../types'
import {
  DEFAULT_FILTERS,
  PRICE_CAP,
  applyFilters,
  countActiveFilters,
  matchesFilters,
  sortOffers,
} from './filter'
import { perPersonPrice } from './trip'
import { OFFERS } from '../data/offers'

const baseOffer: Offer = {
  id: 'test',
  name: 'Testhotel Sonnenschein',
  destination: 'Teststrand',
  region: 'Testland · Küste',
  travelTypes: ['package', 'hotel'],
  hotelPricePerPerson: 620,
  flightPricePerPerson: 180,
  hotelStars: 4,
  rating: 8.5,
  reviewCount: 100,
  beachDistanceM: 150,
  familyHotel: true,
  flightHours: 3,
  paperInToilet: true,
  lgbtqFriendly: true,
  veganFriendly: false,
  sunHoursPerDay: 10,
  scores: {
    entertainment: 7,
    beach: 8,
    mountains: 4,
    excursions: 6,
    shopping: 5,
    food: 9,
    relaxation: 8,
  },
  amenities: { pool: true, whirlpool: false, spa: true, parking: true },
  departureAirports: ['FRA', 'MUC'],
  destinationAirport: 'PMI',
  board: 'All Inclusive',
  photoFile: null,
  gradient: '',
  emoji: '🧪',
}

function filters(overrides: Partial<Filters> = {}): Filters {
  return { ...DEFAULT_FILTERS, ...overrides }
}

describe('matchesFilters', () => {
  it('akzeptiert ein Angebot mit Standardfiltern', () => {
    expect(matchesFilters(baseOffer, filters())).toBe(true)
  })

  it('filtert nach Reiseart', () => {
    expect(matchesFilters(baseOffer, filters({ travelType: 'flight' }))).toBe(false)
    expect(matchesFilters(baseOffer, filters({ travelType: 'hotel' }))).toBe(true)
    expect(matchesFilters(baseOffer, filters({ travelType: 'all' }))).toBe(true)
  })

  it('filtert nach maximalem Preis je Reiseart, Preis-Obergrenze bedeutet egal', () => {
    // Pauschalreise: Hotel 620 + Flug 180 = 800
    expect(matchesFilters(baseOffer, filters({ maxPrice: 700 }))).toBe(false)
    expect(matchesFilters(baseOffer, filters({ maxPrice: 800 }))).toBe(true)
    // Nur Hotel: 620 liegt unter 700
    expect(matchesFilters(baseOffer, filters({ travelType: 'hotel', maxPrice: 700 }))).toBe(true)
    expect(matchesFilters({ ...baseOffer, hotelPricePerPerson: 99999 }, filters({ maxPrice: PRICE_CAP }))).toBe(true)
  })

  it('filtert nach Sternen und Bewertung', () => {
    expect(matchesFilters(baseOffer, filters({ minStars: 5 }))).toBe(false)
    expect(matchesFilters(baseOffer, filters({ minStars: 4 }))).toBe(true)
    expect(matchesFilters(baseOffer, filters({ minRating: 9 }))).toBe(false)
    expect(matchesFilters(baseOffer, filters({ minRating: 8.5 }))).toBe(true)
  })

  it('filtert nach maximaler Flugzeit', () => {
    expect(matchesFilters(baseOffer, filters({ maxFlightHours: 2 }))).toBe(false)
    expect(matchesFilters(baseOffer, filters({ maxFlightHours: 3 }))).toBe(true)
    expect(matchesFilters(baseOffer, filters({ maxFlightHours: null }))).toBe(true)
  })

  it('filtert nach Strandnähe und schließt Angebote ohne Strand aus', () => {
    expect(matchesFilters(baseOffer, filters({ maxBeachDistance: 100 }))).toBe(false)
    expect(matchesFilters(baseOffer, filters({ maxBeachDistance: 300 }))).toBe(true)
    const bergHotel = { ...baseOffer, beachDistanceM: null }
    expect(matchesFilters(bergHotel, filters({ maxBeachDistance: 2000 }))).toBe(false)
    expect(matchesFilters(bergHotel, filters({ maxBeachDistance: null }))).toBe(true)
  })

  it('filtert nach Papier-in-Toilette-Regel', () => {
    expect(matchesFilters(baseOffer, filters({ paperInToilet: true }))).toBe(true)
    const eimerHotel = { ...baseOffer, paperInToilet: false }
    expect(matchesFilters(eimerHotel, filters({ paperInToilet: true }))).toBe(false)
    expect(matchesFilters(eimerHotel, filters({ paperInToilet: false }))).toBe(true)
  })

  it('filtert nach Verpflegung (Mehrfachauswahl, leer = egal)', () => {
    expect(matchesFilters(baseOffer, filters({ boards: [] }))).toBe(true)
    expect(matchesFilters(baseOffer, filters({ boards: ['All Inclusive'] }))).toBe(true)
    expect(matchesFilters(baseOffer, filters({ boards: ['Frühstück', 'Halbpension'] }))).toBe(false)
  })

  it('filtert nach LGBTQI+- und Vegan-Freundlichkeit', () => {
    expect(matchesFilters(baseOffer, filters({ lgbtqFriendly: true }))).toBe(true)
    expect(matchesFilters({ ...baseOffer, lgbtqFriendly: false }, filters({ lgbtqFriendly: true }))).toBe(false)
    expect(matchesFilters(baseOffer, filters({ veganFriendly: true }))).toBe(false)
    expect(matchesFilters({ ...baseOffer, veganFriendly: true }, filters({ veganFriendly: true }))).toBe(true)
  })

  it('filtert nach Ausstattung (Pool, Whirlpool, Spa, Parkplätze, Familienhotel)', () => {
    expect(matchesFilters(baseOffer, filters({ pool: true, spa: true, parking: true, familyOnly: true }))).toBe(true)
    expect(matchesFilters(baseOffer, filters({ whirlpool: true }))).toBe(false)
  })

  it('filtert nach Abflughafen', () => {
    expect(matchesFilters(baseOffer, filters({ airports: ['MUC'] }))).toBe(true)
    expect(matchesFilters(baseOffer, filters({ airports: ['HAM'] }))).toBe(false)
    expect(matchesFilters(baseOffer, filters({ airports: [] }))).toBe(true)
  })

  it('filtert nach Sonnenstunden', () => {
    expect(matchesFilters(baseOffer, filters({ minSunHours: 11 }))).toBe(false)
    expect(matchesFilters(baseOffer, filters({ minSunHours: 10 }))).toBe(true)
  })

  it('filtert nach Anspruchsstufen der Erlebnis-Kriterien', () => {
    expect(matchesFilters(baseOffer, filters({ scoreLevels: { ...DEFAULT_FILTERS.scoreLevels, food: 'excellent' } }))).toBe(true)
    expect(matchesFilters(baseOffer, filters({ scoreLevels: { ...DEFAULT_FILTERS.scoreLevels, mountains: 'good' } }))).toBe(false)
    expect(matchesFilters(baseOffer, filters({ scoreLevels: { ...DEFAULT_FILTERS.scoreLevels, excursions: 'good' } }))).toBe(true)
  })

  it('sucht in Name, Ort und Region (alle Wörter müssen vorkommen)', () => {
    expect(matchesFilters(baseOffer, filters({ query: 'sonnenschein' }))).toBe(true)
    expect(matchesFilters(baseOffer, filters({ query: 'testland küste' }))).toBe(true)
    expect(matchesFilters(baseOffer, filters({ query: 'mallorca' }))).toBe(false)
  })
})

describe('sortOffers', () => {
  const cheap = { ...baseOffer, id: 'cheap', hotelPricePerPerson: 220, rating: 7.5, hotelStars: 3 }
  const pricey = { ...baseOffer, id: 'pricey', hotelPricePerPerson: 1320, rating: 9.5, hotelStars: 5 }

  it('sortiert nach Preis auf- und absteigend', () => {
    expect(sortOffers([pricey, cheap], 'priceAsc', filters()).map((o) => o.id)).toEqual(['cheap', 'pricey'])
    expect(sortOffers([cheap, pricey], 'priceDesc', filters()).map((o) => o.id)).toEqual(['pricey', 'cheap'])
  })

  it('sortiert nach Bewertung und Sternen', () => {
    expect(sortOffers([cheap, pricey], 'rating', filters())[0].id).toBe('pricey')
    expect(sortOffers([cheap, pricey], 'stars', filters())[0].id).toBe('pricey')
  })

  it('verändert das Original-Array nicht', () => {
    const input = [pricey, cheap]
    sortOffers(input, 'priceAsc', filters())
    expect(input.map((o) => o.id)).toEqual(['pricey', 'cheap'])
  })
})

describe('applyFilters mit echten Beispieldaten', () => {
  it('liefert mit Standardfiltern Ergebnisse', () => {
    expect(applyFilters(OFFERS, filters(), 'recommended').length).toBeGreaterThan(0)
  })

  it('kombiniert mehrere Kriterien korrekt', () => {
    const result = applyFilters(
      OFFERS,
      filters({
        maxPrice: 900,
        minStars: 4,
        familyOnly: true,
        maxBeachDistance: 300,
        maxFlightHours: 5,
      }),
      'priceAsc',
    )
    expect(result.length).toBeGreaterThan(0)
    for (const offer of result) {
      expect(perPersonPrice(offer, 'package')).toBeLessThanOrEqual(900)
      expect(offer.hotelStars).toBeGreaterThanOrEqual(4)
      expect(offer.familyHotel).toBe(true)
      expect(offer.beachDistanceM).not.toBeNull()
      expect(offer.beachDistanceM!).toBeLessThanOrEqual(300)
      expect(offer.flightHours).toBeLessThanOrEqual(5)
    }
    // aufsteigend sortiert
    const prices = result.map((o) => perPersonPrice(o, 'package'))
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('alle Beispieldaten haben plausible Werte', () => {
    for (const offer of OFFERS) {
      expect(offer.hotelStars).toBeGreaterThanOrEqual(1)
      expect(offer.hotelStars).toBeLessThanOrEqual(5)
      expect(offer.rating).toBeGreaterThanOrEqual(0)
      expect(offer.rating).toBeLessThanOrEqual(10)
      for (const value of Object.values(offer.scores)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(10)
      }
    }
  })
})

describe('countActiveFilters', () => {
  it('zählt Standardfilter als 0', () => {
    expect(countActiveFilters(filters())).toBe(0)
  })

  it('zählt gesetzte Filter einzeln', () => {
    const f = filters({
      maxPrice: 1000,
      minStars: 4,
      paperInToilet: true,
      airports: ['FRA'],
      scoreLevels: { ...DEFAULT_FILTERS.scoreLevels, beach: 'excellent', food: 'good' },
    })
    expect(countActiveFilters(f)).toBe(6)
  })
})
