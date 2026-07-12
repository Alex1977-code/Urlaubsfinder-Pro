import { describe, expect, it } from 'vitest'
import {
  estimateFlightPrice,
  estimateHotelWeekPrice,
  estimatedFlightHours,
  nearestKnownAirport,
  filterByBeach,
  filterByStars,
  friendlyOverpassError,
  haversineKm,
  nominatimUrl,
  overpassQuery,
  parseOverpassHotels,
} from './live'
import { AIRPORTS } from '../data/airports'
import { DESTINATION_AIRPORTS } from '../data/destinationAirports'

describe('nominatimUrl', () => {
  it('kodiert die Suchanfrage', () => {
    expect(nominatimUrl('Playa de Palma, Mallorca')).toContain(
      'q=Playa%20de%20Palma%2C%20Mallorca',
    )
  })
})

describe('overpassQuery', () => {
  it('fragt Hotels und Strände im Umkreis ab', () => {
    const query = overpassQuery(39.5, 2.75, 10000)
    expect(query).toContain('nwr["tourism"="hotel"](around:10000,39.5,2.75)')
    expect(query).toContain('nwr["natural"="beach"](around:12000,39.5,2.75)')
    expect(query).toContain('out center tags')
  })
})

describe('haversineKm', () => {
  it('berechnet plausible Entfernungen', () => {
    // Frankfurt -> München: ca. 300 km Luftlinie
    const km = haversineKm(50.11, 8.68, 48.14, 11.58)
    expect(km).toBeGreaterThan(290)
    expect(km).toBeLessThan(320)
    expect(haversineKm(39.5, 2.75, 39.5, 2.75)).toBe(0)
  })
})

describe('parseOverpassHotels', () => {
  const json: Parameters<typeof parseOverpassHotels>[0] = {
    elements: [
      {
        type: 'node',
        id: 1,
        lat: 39.51,
        lon: 2.76,
        tags: {
          tourism: 'hotel',
          name: 'Hotel Playa',
          stars: '4',
          'addr:street': 'Carrer del Mar',
          'addr:housenumber': '5',
          'addr:city': 'Palma',
          website: 'https://hotel-playa.example',
        },
      },
      // Way mit center statt lat/lon
      {
        type: 'way',
        id: 2,
        center: { lat: 39.52, lon: 2.77 },
        tags: { tourism: 'hotel', name: 'Hotel Sol' },
      },
      // Ohne Namen: wird übersprungen
      { type: 'node', id: 3, lat: 39.5, lon: 2.75, tags: { tourism: 'hotel', stars: '3' } },
      // Ungültige Sterne: null
      {
        type: 'node',
        id: 4,
        lat: 39.505,
        lon: 2.755,
        tags: { tourism: 'hotel', name: 'Pension Mar', stars: 'x' },
      },
      // Strand direkt neben Hotel Playa
      { type: 'node', id: 5, lat: 39.511, lon: 2.76, tags: { natural: 'beach' } },
    ],
  }

  it('extrahiert Hotels, sortiert nach Entfernung und überspringt namenlose Einträge', () => {
    const hotels = parseOverpassHotels(json, 39.5, 2.75)
    expect(hotels.map((h) => h.name)).toEqual(['Pension Mar', 'Hotel Playa', 'Hotel Sol'])
    const playa = hotels.find((h) => h.name === 'Hotel Playa')!
    expect(playa.stars).toBe(4)
    expect(playa.address).toBe('Carrer del Mar 5, Palma')
    expect(playa.website).toBe('https://hotel-playa.example')
    expect(hotels.find((h) => h.name === 'Pension Mar')!.stars).toBeNull()
    expect(hotels[0].distanceKm).toBeLessThan(hotels[2].distanceKm)
  })

  it('berechnet die Strand-Entfernung je Hotel aus den Strand-Elementen', () => {
    const hotels = parseOverpassHotels(json, 39.5, 2.75)
    const playa = hotels.find((h) => h.name === 'Hotel Playa')!
    expect(playa.beachDistanceM).not.toBeNull()
    expect(playa.beachDistanceM!).toBeLessThan(200)
    // Ohne Strände in der Antwort bleibt die Entfernung null
    const ohneStrand = parseOverpassHotels(
      { elements: json.elements!.filter((el) => el.tags?.natural !== 'beach') },
      39.5,
      2.75,
    )
    expect(ohneStrand.find((h) => h.name === 'Hotel Playa')!.beachDistanceM).toBeNull()
  })

  it('kommt mit leeren Antworten zurecht', () => {
    expect(parseOverpassHotels({}, 0, 0)).toEqual([])
  })
})

describe('filterByBeach', () => {
  const base = { id: 'x', name: 'X', stars: null, lat: 0, lon: 0, distanceKm: 0, website: null, address: null }
  const hotels = [
    { ...base, id: 'nah', beachDistanceM: 80 },
    { ...base, id: 'fern', beachDistanceM: 1500 },
    { ...base, id: 'unbekannt', beachDistanceM: null },
  ]

  it('lässt ohne Limit alles durch und filtert sonst streng', () => {
    expect(filterByBeach(hotels, null)).toHaveLength(3)
    expect(filterByBeach(hotels, 300).map((h) => h.id)).toEqual(['nah'])
    expect(filterByBeach(hotels, 2000).map((h) => h.id)).toEqual(['nah', 'fern'])
  })
})

describe('filterByStars', () => {
  const hotels = [
    { id: 'a', name: 'A', stars: 5, lat: 0, lon: 0, distanceKm: 0, beachDistanceM: null, website: null, address: null },
    { id: 'b', name: 'B', stars: 3, lat: 0, lon: 0, distanceKm: 0, beachDistanceM: null, website: null, address: null },
    { id: 'c', name: 'C', stars: null, lat: 0, lon: 0, distanceKm: 0, beachDistanceM: null, website: null, address: null },
  ]

  it('lässt ohne Mindest-Sterne alles durch', () => {
    expect(filterByStars(hotels, 0, false)).toHaveLength(3)
  })

  it('filtert nach Mindest-Sternen, Hotels ohne Angabe optional', () => {
    expect(filterByStars(hotels, 4, false).map((h) => h.id)).toEqual(['a'])
    expect(filterByStars(hotels, 4, true).map((h) => h.id)).toEqual(['a', 'c'])
    expect(filterByStars(hotels, 3, false).map((h) => h.id)).toEqual(['a', 'b'])
  })
})

describe('estimatedFlightHours', () => {
  it('liefert plausible Flugzeiten (FRA -> Mallorca ca. 2 Std.)', () => {
    const fra = AIRPORTS.find((a) => a.code === 'FRA')!
    const hours = estimatedFlightHours(haversineKm(fra.lat, fra.lon, 39.55, 2.74))
    expect(hours).toBeGreaterThan(1.7)
    expect(hours).toBeLessThan(2.5)
  })

  it('enthält den Pauschalaufschlag für Start und Landung', () => {
    expect(estimatedFlightHours(0)).toBe(0.5)
    expect(estimatedFlightHours(800)).toBe(1.5)
  })
})

describe('friendlyOverpassError', () => {
  it('erklärt Rate-Limit und Timeout verständlich', () => {
    expect(friendlyOverpassError('HTTP 429')).toContain('ausgelastet')
    expect(friendlyOverpassError('HTTP 504')).toContain('Umkreis verkleinern')
    expect(friendlyOverpassError('HTTP 500')).toContain('HTTP 500')
  })
})

describe('Preis-Schätzer der Live-Suche', () => {
  it('estimateFlightPrice liegt nahe an echten Routenpreisen', () => {
    expect(estimateFlightPrice(1250)).toBeGreaterThan(120) // FRA-PMI real ~169
    expect(estimateFlightPrice(1250)).toBeLessThan(200)
    expect(estimateFlightPrice(4800)).toBeGreaterThan(300) // FRA-DXB real ~389
    expect(estimateFlightPrice(4800)).toBeLessThan(450)
  })

  it('estimateHotelWeekPrice staffelt nach Kategorie', () => {
    expect(estimateHotelWeekPrice(5)).toBe(900)
    expect(estimateHotelWeekPrice(4)).toBe(550)
    expect(estimateHotelWeekPrice(3)).toBe(350)
    expect(estimateHotelWeekPrice(null)).toBe(450)
  })

  it('nearestKnownAirport findet PMI für Alcúdia und nichts mitten im Ozean', () => {
    const alcudia = nearestKnownAirport(39.79, 3.12, DESTINATION_AIRPORTS)
    expect(alcudia?.code).toBe('PMI')
    expect(nearestKnownAirport(0, -40, DESTINATION_AIRPORTS)).toBeNull()
  })
})
