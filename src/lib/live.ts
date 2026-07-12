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

export const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

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
