import { describe, expect, it } from 'vitest'
import { bookingSearchUrl, bookingUrl, flightsSearchUrl, flightsUrl, mapsUrl } from './links'
import { DEFAULT_TRIP } from './trip'
import { OFFERS } from '../data/offers'

const offer = OFFERS.find((o) => o.id === 'mallorca-playa-esperanza')!
const bergHotel = OFFERS.find((o) => o.id === 'tirol-alpenresort')!

const trip = {
  ...DEFAULT_TRIP,
  departureDate: '2026-08-15',
  nights: 7,
  rooms: [{ adults: 2, childAges: [7, 10] }],
}

describe('bookingUrl', () => {
  it('verlinkt die Booking.com-Suche mit Hotelname und Ort (URL-kodiert)', () => {
    const url = bookingUrl(offer)
    expect(url).toContain('booking.com/searchresults.de.html?ss=')
    expect(url).toContain(encodeURIComponent('Iberostar Playa Esperanza, Playa de Muro'))
  })

  it('übergibt Zeitraum, Erwachsene und Kinder mit Alter', () => {
    const url = bookingUrl(offer, trip)
    expect(url).toContain('checkin=2026-08-15')
    expect(url).toContain('checkout=2026-08-22')
    expect(url).toContain('group_adults=2')
    expect(url).toContain('group_children=2')
    expect(url).toContain('age=7')
    expect(url).toContain('age=10')
  })

  it('lässt Zeitraum weg, wenn kein Datum gewählt ist', () => {
    const url = bookingUrl(offer, { ...trip, departureDate: null })
    expect(url).not.toContain('checkin=')
    expect(url).toContain('group_adults=2')
  })

  it('überträgt mehrere Zimmer mit Gesamt-Reisenden', () => {
    const url = bookingUrl(offer, {
      ...trip,
      rooms: [
        { adults: 2, childAges: [] },
        { adults: 1, childAges: [7] },
      ],
    })
    expect(url).toContain('no_rooms=2')
    expect(url).toContain('group_adults=3')
    expect(url).toContain('group_children=1')
  })
})

describe('flightsUrl', () => {
  it('nutzt den bevorzugten Abflughafen, wenn das Angebot ihn anbietet', () => {
    expect(flightsUrl(offer, 'MUC')).toContain(encodeURIComponent('from MUC to PMI'))
  })

  it('fällt auf den ersten Abflughafen zurück, wenn der bevorzugte nicht angeboten wird', () => {
    expect(flightsUrl(offer, 'XXX')).toContain(encodeURIComponent('from FRA to PMI'))
    expect(flightsUrl(offer)).toContain(encodeURIComponent('from FRA to PMI'))
  })

  it('liefert null für Angebote ohne Fluganreise', () => {
    expect(flightsUrl(bergHotel)).toBeNull()
  })

  it('übergibt Hin- und Rückflugdatum aus den Reisedaten', () => {
    const url = flightsUrl(offer, 'FRA', trip)
    expect(decodeURIComponent(url!)).toContain('on 2026-08-15 through 2026-08-22')
  })

  it('verlinkt ohne Reisedatum den Termin des Live-Preises', () => {
    const liveOffer = {
      ...offer,
      livePrice: true,
      livePriceInfo: { month: '2026-09', departureAt: '2026-09-12', returnAt: '2026-09-19' },
    }
    const url = flightsUrl(liveOffer, 'FRA', { ...trip, departureDate: null })
    expect(decodeURIComponent(url!)).toContain('on 2026-09-12 through 2026-09-19')
    // Gewähltes Reisedatum hat Vorrang vor dem Live-Termin
    const withDate = flightsUrl(liveOffer, 'FRA', trip)
    expect(decodeURIComponent(withDate!)).toContain('on 2026-08-15 through 2026-08-22')
  })
})

describe('generische Suchlinks (Live-Suche)', () => {
  it('bookingSearchUrl nimmt beliebige Suchbegriffe samt Reisedaten', () => {
    const url = bookingSearchUrl('Hotel Sol, Alcúdia', trip)
    expect(url).toContain(encodeURIComponent('Hotel Sol, Alcúdia'))
    expect(url).toContain('checkin=2026-08-15')
  })

  it('flightsSearchUrl funktioniert mit Ortsnamen', () => {
    const url = flightsSearchUrl('Punta Cana', 'MUC', trip)
    expect(decodeURIComponent(url)).toContain('from MUC to Punta Cana on 2026-08-15')
  })
})

describe('mapsUrl', () => {
  it('verlinkt die Google-Maps-Suche für das Hotel', () => {
    expect(mapsUrl(offer)).toContain('google.com/maps/search')
    expect(mapsUrl(offer)).toContain(encodeURIComponent('Iberostar Playa Esperanza Playa de Muro'))
  })
})

describe('Datenqualität der Angebote', () => {
  it('jedes Angebot mit Flug-Reiseart hat Ziel-Flughafen und Abflughäfen', () => {
    for (const o of OFFERS) {
      const hasFlight = o.travelTypes.includes('flight') || o.travelTypes.includes('package')
      if (hasFlight && o.departureAirports.length > 0) {
        expect(o.destinationAirport, o.id).not.toBeNull()
      }
    }
  })
})
