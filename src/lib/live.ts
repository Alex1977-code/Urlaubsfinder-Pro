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

/** Overpass-QL: alle Hotels (Nodes, Ways, Relations) im Umkreis. */
export function overpassQuery(lat: number, lon: number, radiusM: number): string {
  return `[out:json][timeout:25];nwr["tourism"="hotel"](around:${radiusM},${Number(lat.toFixed(5))},${Number(lon.toFixed(5))});out center tags;`
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

/** Overpass-Antwort in eine sortierte Hotel-Liste umwandeln. */
export function parseOverpassHotels(
  json: { elements?: OverpassElement[] },
  centerLat: number,
  centerLon: number,
): LiveHotel[] {
  const hotels: LiveHotel[] = []
  for (const el of json.elements ?? []) {
    const tags = el.tags ?? {}
    const name = tags.name
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (!name || lat === undefined || lon === undefined) continue
    const stars = tags.stars ? Number.parseFloat(tags.stars) : null
    const addressParts = [
      [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
      tags['addr:city'],
    ].filter(Boolean)
    hotels.push({
      id: `${el.type}/${el.id}`,
      name,
      stars: stars !== null && Number.isFinite(stars) ? stars : null,
      lat,
      lon,
      distanceKm: haversineKm(centerLat, centerLon, lat, lon),
      website: tags.website ?? tags['contact:website'] ?? null,
      address: addressParts.length > 0 ? addressParts.join(', ') : null,
    })
  }
  return hotels.sort((a, b) => a.distanceKm - b.distanceKm)
}
