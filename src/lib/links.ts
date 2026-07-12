import type { Offer, TripParams } from '../types'
import { allChildAges, returnDate, totalAdults } from './trip'

/**
 * Externe Links zu echten, aktuellen Angeboten. Die Demo-Daten nennen echte
 * Hotels – über diese Links landet man direkt bei buchbaren Preisen.
 * Reisedatum, Dauer und Reisende aus der Suche werden mitgegeben.
 */

function tripQueryParams(trip?: TripParams): string {
  if (!trip) return ''
  let params = ''
  if (trip.departureDate) {
    params += `&checkin=${trip.departureDate}&checkout=${returnDate(trip)}`
  }
  const childAges = allChildAges(trip)
  params += `&group_adults=${totalAdults(trip)}&no_rooms=${trip.rooms.length}&group_children=${childAges.length}`
  for (const age of childAges) {
    params += `&age=${age}`
  }
  return params
}

/** Booking.com-Suche für einen beliebigen Suchbegriff, inkl. Zeitraum und Reisenden. */
export function bookingSearchUrl(query: string, trip?: TripParams): string {
  return `https://www.booking.com/searchresults.de.html?ss=${encodeURIComponent(query)}${tripQueryParams(trip)}`
}

/** Booking.com-Suche für das Hotel eines Angebots. */
export function bookingUrl(offer: Offer, trip?: TripParams): string {
  return bookingSearchUrl(`${offer.name}, ${offer.destination}`, trip)
}

/** Google-Flights-Suche zu einem beliebigen Ziel (IATA-Code oder Ortsname). */
export function flightsSearchUrl(destination: string, from: string, trip?: TripParams): string {
  let query = `Flights from ${from} to ${destination}`
  if (trip?.departureDate) {
    query += ` on ${trip.departureDate} through ${returnDate(trip)}`
  }
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`
}

/**
 * Google-Flights-Suche zum Ziel-Flughafen eines Angebots, inkl. Hin- und
 * Rückflugdatum. null, wenn das Angebot keine Fluganreise hat.
 */
export function flightsUrl(offer: Offer, from?: string, trip?: TripParams): string | null {
  if (!offer.destinationAirport) return null
  const departure = from && offer.departureAirports.includes(from) ? from : offer.departureAirports[0]
  if (!departure) return null
  return flightsSearchUrl(offer.destinationAirport, departure, trip)
}

/** Google-Maps-Suche für die Lage des Hotels. */
export function mapsUrl(offer: Offer): string {
  const query = `${offer.name} ${offer.destination}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}
