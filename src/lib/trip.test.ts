import { describe, expect, it } from 'vitest'
import type { TripParams } from '../types'
import {
  BAGGAGE_FEE,
  DEFAULT_TRIP,
  addDays,
  payingTravellers,
  perPersonPrice,
  personFactor,
  returnDate,
  totalPrice,
  travellersLabel,
  tripSummary,
} from './trip'
import { OFFERS } from '../data/offers'

const flugHotel = OFFERS.find((o) => o.id === 'mallorca-playa-esperanza')! // Hotel 620 € + Flug 169 €
const bergHotel = OFFERS.find((o) => o.id === 'tirol-alpenresort')! // 990 €, kein Flug

function trip(overrides: Partial<TripParams> = {}): TripParams {
  return { ...DEFAULT_TRIP, ...overrides }
}

describe('personFactor', () => {
  it('Erwachsene zahlen voll', () => {
    expect(personFactor(trip({ adults: 2, childAges: [] }))).toBe(2)
  })

  it('Kleinkinder unter 2 reisen frei, Kinder 2–11 zahlen 70 %, ab 12 voll', () => {
    expect(personFactor(trip({ adults: 2, childAges: [1] }))).toBe(2)
    expect(personFactor(trip({ adults: 2, childAges: [7] }))).toBe(2.7)
    expect(personFactor(trip({ adults: 2, childAges: [14] }))).toBe(3)
    expect(personFactor(trip({ adults: 1, childAges: [1, 7, 14] }))).toBe(2.7)
  })
})

describe('perPersonPrice', () => {
  it('rechnet je Reiseart: Paket = Hotel + Flug, sonst nur der jeweilige Anteil', () => {
    expect(perPersonPrice(flugHotel, 'package')).toBe(789)
    expect(perPersonPrice(flugHotel, 'all')).toBe(789)
    expect(perPersonPrice(flugHotel, 'hotel')).toBe(620)
    expect(perPersonPrice(flugHotel, 'flight')).toBe(169)
    expect(perPersonPrice(bergHotel, 'hotel')).toBe(990)
  })
})

describe('totalPrice', () => {
  it('skaliert nur den Hotelanteil mit der Reisedauer, der Flug fällt einmalig an', () => {
    const oneWeek = totalPrice(flugHotel, trip({ nights: 7, adults: 1, baggage: false }), 'package')
    const twoWeeks = totalPrice(flugHotel, trip({ nights: 14, adults: 1, baggage: false }), 'package')
    expect(oneWeek).toBe(620 + 169)
    expect(twoWeeks).toBe(620 * 2 + 169)
    // Nur Hotel: ohne Fluganteil
    expect(totalPrice(flugHotel, trip({ nights: 7, adults: 1, baggage: false }), 'hotel')).toBe(620)
    // Nur Flug: unabhängig von der Dauer
    expect(totalPrice(flugHotel, trip({ nights: 14, adults: 1, baggage: false }), 'flight')).toBe(169)
  })

  it('addiert Gepäck nur bei Fluganreise und nur für Personen ab 2 Jahren', () => {
    const ohne = totalPrice(flugHotel, trip({ adults: 2, childAges: [1], baggage: false }), 'package')
    const mit = totalPrice(flugHotel, trip({ adults: 2, childAges: [1], baggage: true }), 'package')
    expect(mit - ohne).toBe(BAGGAGE_FEE * 2)
    // Hotel ohne Flug: Gepäck ändert nichts
    expect(totalPrice(bergHotel, trip({ baggage: true }), 'package')).toBe(
      totalPrice(bergHotel, trip({ baggage: false }), 'package'),
    )
    // Reiseart "Nur Hotel": Gepäck ändert nichts
    expect(totalPrice(flugHotel, trip({ baggage: true }), 'hotel')).toBe(
      totalPrice(flugHotel, trip({ baggage: false }), 'hotel'),
    )
  })

  it('payingTravellers zählt alle außer Kleinkindern', () => {
    expect(payingTravellers(trip({ adults: 2, childAges: [1, 7] }))).toBe(3)
  })
})

describe('Datums-Helfer', () => {
  it('addDays verschiebt korrekt über Monatsgrenzen', () => {
    expect(addDays('2026-08-28', 7)).toBe('2026-09-04')
  })

  it('returnDate = Abreise + Nächte, null ohne Datum', () => {
    expect(returnDate(trip({ departureDate: '2026-08-15', nights: 7 }))).toBe('2026-08-22')
    expect(returnDate(trip({ departureDate: null }))).toBeNull()
  })
})

describe('Beschriftungen', () => {
  it('travellersLabel nennt Kinder mit Alter', () => {
    expect(travellersLabel(trip({ adults: 2, childAges: [] }))).toBe('2 Erw.')
    expect(travellersLabel(trip({ adults: 2, childAges: [7] }))).toBe('2 Erw. · 1 Kind (7 J.)')
    expect(travellersLabel(trip({ adults: 1, childAges: [3, 9] }))).toBe('1 Erw. · 2 Kinder (3, 9 J.)')
  })

  it('tripSummary enthält Datum mit Flexibilität, Dauer, Reisende und Gepäck', () => {
    const summary = tripSummary(
      trip({ departureDate: '2026-08-15', flexibility: 'plus3', nights: 7, adults: 2, childAges: [7], baggage: true }),
      true,
    )
    expect(summary).toContain('15.08.2026')
    expect(summary).toContain('± 3 Tage')
    expect(summary).toContain('1 Woche')
    expect(summary).toContain('1 Kind (7 J.)')
    expect(summary).toContain('inkl. Aufgabegepäck')
  })
})
