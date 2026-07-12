import { describe, expect, it } from 'vitest'
import { EMPTY_LIVE_PRICES, applyLivePrices, normalizeLivePrices } from './livePrices'
import { OFFERS } from '../data/offers'

const entry = {
  origin: 'FRA',
  price: 142,
  month: '2026-09',
  departureAt: '2026-09-12',
  returnAt: '2026-09-19',
  months: {
    '2026-08': { price: 189, departureAt: '2026-08-15', returnAt: '2026-08-22' },
    '2026-09': { price: 142, departureAt: '2026-09-12', returnAt: '2026-09-19' },
  },
}

describe('normalizeLivePrices', () => {
  it('übernimmt gültige Einträge samt Monatspreisen und verwirft kaputte', () => {
    const data = normalizeLivePrices({
      updatedAt: '2026-07-12T04:23:00Z',
      currency: 'EUR',
      flights: {
        'mallorca-playa-esperanza': entry,
        kaputt: { origin: 'FRA', price: -5 },
      },
    })
    expect(Object.keys(data.flights)).toEqual(['mallorca-playa-esperanza'])
    const flight = data.flights['mallorca-playa-esperanza']
    expect(flight.months['2026-08'].price).toBe(189)
    expect(flight.departureAt).toBe('2026-09-12')
  })

  it('liefert leere Daten bei ungültigem JSON', () => {
    expect(normalizeLivePrices(null)).toEqual(EMPTY_LIVE_PRICES)
    expect(normalizeLivePrices('quatsch')).toEqual(EMPTY_LIVE_PRICES)
    expect(normalizeLivePrices({ flights: 'nope' }).flights).toEqual({})
  })
})

describe('applyLivePrices', () => {
  const data = {
    updatedAt: 'x',
    currency: 'EUR',
    flights: { 'mallorca-playa-esperanza': entry },
  }
  const mallorca = OFFERS.find((o) => o.id === 'mallorca-playa-esperanza')!

  it('nutzt ohne Reisemonat den günstigsten Termin', () => {
    const updated = applyLivePrices(OFFERS, data).find((o) => o.id === mallorca.id)!
    expect(updated.flightPricePerPerson).toBe(142)
    expect(updated.livePrice).toBe(true)
    expect(updated.livePriceInfo?.departureAt).toBe('2026-09-12')
    expect(updated.hotelPricePerPerson).toBe(mallorca.hotelPricePerPerson)
  })

  it('nutzt den Monatspreis, wenn ein Reisemonat gewählt ist', () => {
    const updated = applyLivePrices(OFFERS, data, '2026-08').find((o) => o.id === mallorca.id)!
    expect(updated.flightPricePerPerson).toBe(189)
    expect(updated.livePriceInfo?.month).toBe('2026-08')
  })

  it('fällt auf den günstigsten Termin zurück, wenn der Monat fehlt', () => {
    const updated = applyLivePrices(OFFERS, data, '2027-01').find((o) => o.id === mallorca.id)!
    expect(updated.flightPricePerPerson).toBe(142)
  })

  it('lässt Angebote ohne Fluganreise und ohne Live-Preis unverändert', () => {
    const tirol = OFFERS.find((o) => o.id === 'tirol-alpenresort')!
    const offers = applyLivePrices(OFFERS, {
      updatedAt: 'x',
      currency: 'EUR',
      flights: { 'tirol-alpenresort': { ...entry } },
    })
    expect(offers.find((o) => o.id === tirol.id)).toEqual(tirol)
  })

  it('mit leeren Daten bleiben alle Angebote identisch', () => {
    expect(applyLivePrices(OFFERS, EMPTY_LIVE_PRICES)).toEqual(OFFERS)
  })
})
