import type { Offer } from '../types'

/**
 * Externe Links zu echten, aktuellen Angeboten. Die Demo-Daten nennen echte
 * Hotels – über diese Links landet man direkt bei buchbaren Preisen.
 */

/** Booking.com-Suche für das Hotel. */
export function bookingUrl(offer: Offer): string {
  const query = `${offer.name}, ${offer.destination}`
  return `https://www.booking.com/searchresults.de.html?ss=${encodeURIComponent(query)}`
}

/**
 * Google-Flights-Suche zum Ziel-Flughafen.
 * null, wenn das Angebot keine Fluganreise hat.
 */
export function flightsUrl(offer: Offer, from?: string): string | null {
  if (!offer.destinationAirport) return null
  const departure = from && offer.departureAirports.includes(from) ? from : offer.departureAirports[0]
  if (!departure) return null
  const query = `Flights from ${departure} to ${offer.destinationAirport}`
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`
}

/** Google-Maps-Suche für die Lage des Hotels. */
export function mapsUrl(offer: Offer): string {
  const query = `${offer.name} ${offer.destination}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
