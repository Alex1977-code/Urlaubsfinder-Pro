import { describe, expect, it } from 'vitest'
import { EMPTY_LIVE_PRICES, applyLivePrices, normalizeLivePrices } from './livePrices'
import { OFFERS } from '../data/offers'

describe('normalizeLivePrices', () => {
  it('übernimmt gültige Einträge und verwirft kaputte', () => {
    const data = normalizeLivePrices({
      updatedAt: '2026-07-12T04:23:00Z',
      currency: 'EUR',
      flights: {
        'mallorca-playa-esperanza': { origin: 'FRA', price: 142 },
        kaputt: { origin: 'FRA', price: -5 },
        auchKaputt: { origin: 'FRA' },
      },
    })
    expect(data.updatedAt).toBe('2026-07-12T04:23:00Z')
    expect(Object.keys(data.flights)).toEqual(['mallorca-playa-esperanza'])
  })

  it('liefert leere Daten bei ungültigem JSON', () => {
    expect(normalizeLivePrices(null)).toEqual(EMPTY_LIVE_PRICES)
    expect(normalizeLivePrices('quatsch')).toEqual(EMPTY_LIVE_PRICES)
    expect(normalizeLivePrices({ flights: 'nope' }).flights).toEqual({})
  })
})

describe('applyLivePrices', () => {
  const mallorca = OFFERS.find((o) => o.id === 'mallorca-playa-esperanza')!
  const tirol = OFFERS.find((o) => o.id === 'tirol-alpenresort')! // ohne Flug

  it('überschreibt den Flugpreis und markiert ihn als live', () => {
    const offers = applyLivePrices(OFFERS, {
      updatedAt: 'x',
      currency: 'EUR',
      flights: { 'mallorca-playa-esperanza': { origin: 'FRA', price: 141.6 } },
    })
    const updated = offers.find((o) => o.id === mallorca.id)!
    expect(updated.flightPricePerPerson).toBe(142)
    expect(updated.livePrice).toBe(true)
    // Hotelpreis bleibt unangetastet
    expect(updated.hotelPricePerPerson).toBe(mallorca.hotelPricePerPerson)
  })

  it('lässt Angebote ohne Fluganreise und ohne Live-Preis unverändert', () => {
    const offers = applyLivePrices(OFFERS, {
      updatedAt: 'x',
      currency: 'EUR',
      flights: { 'tirol-alpenresort': { origin: 'FRA', price: 99 } },
    })
    expect(offers.find((o) => o.id === tirol.id)).toEqual(tirol)
    expect(offers.find((o) => o.id === 'kreta-blue-palace')!.livePrice).toBeUndefined()
  })

  it('mit leeren Daten bleiben alle Angebote identisch', () => {
    expect(applyLivePrices(OFFERS, EMPTY_LIVE_PRICES)).toEqual(OFFERS)
  })
})
