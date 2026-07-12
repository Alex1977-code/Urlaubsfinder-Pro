import type { Flexibility, Offer, TripParams } from '../types'

export const DEFAULT_TRIP: TripParams = {
  departureDate: null,
  flexibility: 'exact',
  nights: 7,
  adults: 2,
  childAges: [],
  baggage: true,
}

export const FLEX_LABELS: Record<Flexibility, string> = {
  exact: 'genau',
  plus3: '± 3 Tage',
  plus7: '± 1 Woche',
}

export const NIGHT_OPTIONS = [
  { value: 4, label: '4 Nächte (Kurztrip)' },
  { value: 5, label: '5 Nächte' },
  { value: 7, label: '1 Woche' },
  { value: 10, label: '10 Nächte' },
  { value: 14, label: '2 Wochen' },
  { value: 21, label: '3 Wochen' },
]

/** Aufgabegepäck pro zahlender Person und Strecke (Richtwert). */
export const BAGGAGE_FEE = 39

/**
 * Preisfaktor der Reisenden: Erwachsene zahlen voll, Kinder unter 2 Jahren
 * reisen frei, Kinder von 2–11 zahlen 70 %, ab 12 den vollen Preis.
 */
export function personFactor(trip: TripParams): number {
  return (
    trip.adults +
    trip.childAges.reduce((sum, age) => sum + (age < 2 ? 0 : age < 12 ? 0.7 : 1), 0)
  )
}

/** Anzahl Personen, für die Gepäck anfällt (alle außer Kleinkinder unter 2). */
export function payingTravellers(trip: TripParams): number {
  return trip.adults + trip.childAges.filter((age) => age >= 2).length
}

/**
 * Gesamtpreis-Richtwert: Basispreis gilt pro Person für eine Woche und wird
 * auf Reisedauer und Reisende hochgerechnet; Gepäck nur bei Fluganreise.
 */
export function totalPrice(offer: Offer, trip: TripParams): number {
  const base = offer.pricePerPerson * (trip.nights / 7) * personFactor(trip)
  const baggage =
    trip.baggage && offer.destinationAirport ? BAGGAGE_FEE * payingTravellers(trip) : 0
  return Math.round(base + baggage)
}

/** ISO-Datum um n Tage verschieben. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Rückreisedatum aus Abreise + Dauer, null ohne Abreisedatum. */
export function returnDate(trip: TripParams): string | null {
  return trip.departureDate ? addDays(trip.departureDate, trip.nights) : null
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Kurzform der Reisenden, z. B. "2 Erw. · 1 Kind (7 J.)". */
export function travellersLabel(trip: TripParams): string {
  const parts = [`${trip.adults} Erw.`]
  if (trip.childAges.length === 1) {
    parts.push(`1 Kind (${trip.childAges[0]} J.)`)
  } else if (trip.childAges.length > 1) {
    parts.push(`${trip.childAges.length} Kinder (${trip.childAges.map((a) => `${a}`).join(', ')} J.)`)
  }
  return parts.join(' · ')
}

/** Zusammenfassung der Reisedaten für die Ergebnis-Überschrift. */
export function tripSummary(trip: TripParams, withBaggage: boolean): string {
  const parts: string[] = []
  if (trip.departureDate) {
    const flex = trip.flexibility === 'exact' ? '' : ` (${FLEX_LABELS[trip.flexibility]})`
    parts.push(`ab ${formatDate(trip.departureDate)}${flex}`)
  }
  const nightsOption = NIGHT_OPTIONS.find((option) => option.value === trip.nights)
  parts.push(nightsOption ? nightsOption.label : `${trip.nights} Nächte`)
  parts.push(travellersLabel(trip))
  if (withBaggage) {
    parts.push(trip.baggage ? 'inkl. Aufgabegepäck' : 'nur Handgepäck')
  }
  return parts.join(' · ')
}
