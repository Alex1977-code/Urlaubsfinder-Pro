/**
 * Live-Hotelsuche über offene Daten: Nominatim (Geokodierung) und die
 * Overpass-API von OpenStreetMap (alle erfassten Hotels im Umkreis).
 * Beide Dienste sind frei, schlüssellos und CORS-freundlich.
 */

export interface LiveHotel {
  id: string
  name: string
  /** Sterne laut OSM-Tag "stars", null wenn nicht erfasst */
  stars: number | null
  lat: number
  lon: number
  distanceKm: number
  /** Entfernung zum nächsten OSM-Strand in Metern, null wenn keiner erfasst */
  beachDistanceM: number | null
  website: string | null
  address: string | null
}

export interface LivePlace {
  name: string
  lat: number
  lon: number
}

export function nominatimUrl(query: string): string {
  return `https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=de&q=${encodeURIComponent(query)}`
}

/** Öffentliche Overpass-Server; bei Überlastung wird der nächste probiert. */
export const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

/**
 * Grobe Flugzeit-Schätzung: Luftlinie bei ~800 km/h Reisegeschwindigkeit
 * plus pauschal 30 Minuten für Start und Landung.
 */
export function estimatedFlightHours(distanceKm: number): number {
  return Math.round((0.5 + distanceKm / 800) * 10) / 10
}

/**
 * Grobe Flugpreis-Schätzung (hin & zurück, pro Person) nach Distanz,
 * kalibriert an den echten Preisen der Katalog-Routen.
 */
export function estimateFlightPrice(distanceKm: number): number {
  return Math.round(60 + 0.07 * distanceKm)
}

/**
 * Hotelpreis-Schätzung pro Person und Woche nach Hotelkategorie,
 * abgeleitet aus den Durchschnittswerten des Angebotskatalogs.
 */
export function estimateHotelWeekPrice(stars: number | null): number {
  if (stars === null) return 450
  if (stars >= 5) return 900
  if (stars >= 4) return 550
  return 350
}

/** Nächstgelegener bekannter Ziel-Flughafen im Umkreis, sonst null. */
export function nearestKnownAirport(
  lat: number,
  lon: number,
  airports: Record<string, { lat: number; lon: number }>,
  maxKm = 150,
): { code: string; distanceKm: number } | null {
  let best: { code: string; distanceKm: number } | null = null
  for (const [code, position] of Object.entries(airports)) {
    const distanceKm = haversineKm(lat, lon, position.lat, position.lon)
    if (distanceKm <= maxKm && (!best || distanceKm < best.distanceKm)) {
      best = { code, distanceKm }
    }
  }
  return best
}

/** Verständliche Meldung für typische Overpass-Fehler. */
export function friendlyOverpassError(detail: string): string {
  if (detail.includes('429')) {
    return 'Der OpenStreetMap-Server ist gerade ausgelastet (zu viele Anfragen kurz hintereinander). Bitte einen Moment warten und erneut suchen.'
  }
  if (detail.includes('504') || detail.toLowerCase().includes('timeout')) {
    return 'Die Hotelabfrage hat zu lange gedauert – bitte den Umkreis verkleinern oder erneut versuchen.'
  }
  return `Hotelabfrage fehlgeschlagen (${detail}). Bitte später erneut versuchen.`
}

/**
 * Overpass-QL: alle Hotels im Umkreis plus Strände (etwas größerer Radius,
 * damit auch Hotels am Rand ihren nächsten Strand finden).
 */
export function overpassQuery(lat: number, lon: number, radiusM: number): string {
  const la = Number(lat.toFixed(5))
  const lo = Number(lon.toFixed(5))
  return (
    `[out:json][timeout:30];(` +
    `nwr["tourism"="hotel"](around:${radiusM},${la},${lo});` +
    `nwr["natural"="beach"](around:${radiusM + 2000},${la},${lo});` +
    `);out center tags;`
  )
}

/** Großkreis-Entfernung in Kilometern. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Hotelkategorie-Filter für Live-Ergebnisse. OpenStreetMap kennt für viele
 * Hotels keine Sterne – solche Einträge werden über includeUnrated gesteuert.
 */
export function filterByStars(
  hotels: LiveHotel[],
  minStars: number,
  includeUnrated: boolean,
): LiveHotel[] {
  if (minStars <= 0) return hotels
  return hotels.filter(
    (hotel) =>
      (hotel.stars !== null && hotel.stars >= minStars) ||
      (includeUnrated && hotel.stars === null),
  )
}

interface OverpassElement {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

/**
 * Overpass-Antwort in eine sortierte Hotel-Liste umwandeln. Strände aus
 * derselben Antwort liefern die Strand-Entfernung je Hotel.
 */
export function parseOverpassHotels(
  json: { elements?: OverpassElement[] },
  centerLat: number,
  centerLon: number,
): LiveHotel[] {
  const hotels: LiveHotel[] = []
  const beaches: { lat: number; lon: number }[] = []

  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {}
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat === undefined || lon === undefined) continue
    if (tags.natural === 'beach') {
      beaches.push({ lat, lon })
      continue
    }
    if (tags.tourism !== 'hotel' || !tags.name) continue
    const stars = tags.stars ? Number.parseFloat(tags.stars) : null
    const addressParts = [
      [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
      tags['addr:city'],
    ].filter(Boolean)
    hotels.push({
      id: `${el.type}/${el.id}`,
      name: tags.name,
      stars: stars !== null && Number.isFinite(stars) ? stars : null,
      lat,
      lon,
      distanceKm: haversineKm(centerLat, centerLon, lat, lon),
      beachDistanceM: null,
      website: tags.website ?? tags['contact:website'] ?? null,
      address: addressParts.length > 0 ? addressParts.join(', ') : null,
    })
  }

  if (beaches.length > 0) {
    for (const hotel of hotels) {
      const nearest = Math.min(
        ...beaches.map((beach) => haversineKm(hotel.lat, hotel.lon, beach.lat, beach.lon)),
      )
      hotel.beachDistanceM = Math.round(nearest * 1000)
    }
  }

  return hotels.sort((a, b) => a.distanceKm - b.distanceKm)
}

/** Strandnähe-Filter: null = egal; sonst nur Hotels mit erfasstem Strand im Limit. */
export function filterByBeach(hotels: LiveHotel[], maxBeachDistance: number | null): LiveHotel[] {
  if (maxBeachDistance === null) return hotels
  return hotels.filter(
    (hotel) => hotel.beachDistanceM !== null && hotel.beachDistanceM <= maxBeachDistance,
  )
}
