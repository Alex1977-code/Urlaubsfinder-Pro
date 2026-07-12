import type { Offer, TripParams } from '../types'
import { returnDate } from './trip'

/**
 * Externe Links zu echten, aktuellen Angeboten. Die Demo-Daten nennen echte
 * Hotels – über diese Links landet man direkt bei buchbaren Preisen.
 * Reisedatum, Dauer und Reisende aus der Suche werden mitgegeben.
 */

/** Booking.com-Suche für das Hotel, inkl. Zeitraum und Reisenden. */
export function bookingUrl(offer: Offer, trip?: TripParams): string {
  const query = `${offer.name}, ${offer.destination}`
  let url = `https://www.booking.com/searchresults.de.html?ss=${encodeURIComponent(query)}`
  if (trip) {
    if (trip.departureDate) {
      url += `&checkin=${trip.departureDate}&checkout=${returnDate(trip)}`
    }
    url += `&group_adults=${trip.adults}&no_rooms=1&group_children=${trip.childAges.length}`
    for (const age of trip.childAges) {
      url += `&age=${age}`
    }
  }
  return url
}

/**
 * Google-Flights-Suche zum Ziel-Flughafen, inkl. Hin- und Rückflugdatum.
 * null, wenn das Angebot keine Fluganreise hat.
 */
export function flightsUrl(offer: Offer, from?: string, trip?: TripParams): string | null {
  if (!offer.destinationAirport) return null
  const departure = from && offer.departureAirports.includes(from) ? from : offer.departureAirports[0]
  if (!departure) return null
  let query = `Flights from ${departure} to ${offer.destinationAirport}`
  if (trip?.departureDate) {
    query += ` on ${trip.departureDate} through ${returnDate(trip)}`
  }
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`
}

/** Google-Maps-Suche für die Lage des Hotels. */
export function mapsUrl(offer: Offer): string {
  const query = `${offer.name} ${offer.destination}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
