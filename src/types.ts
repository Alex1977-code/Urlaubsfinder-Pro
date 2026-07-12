/** Art der Reise, die gesucht wird. */
export type TravelType = 'package' | 'hotel' | 'flight'

/** Bewertbare Standort- und Erlebnis-Kriterien (Skala 0–10). */
export type ScoreKey =
  | 'entertainment' // Unterhaltung / Animation / Nachtleben
  | 'beach' // Strandqualität
  | 'mountains' // Berge / Natur / Wandern
  | 'excursions' // Ausflugsmöglichkeiten
  | 'shopping' // Einkaufsmöglichkeiten
  | 'food' // Essensqualität
  | 'relaxation' // Erholungsfaktor

export interface Offer {
  id: string
  /** Hotelname */
  name: string
  /** Ort, z. B. "Playa de Palma" */
  destination: string
  /** Land / Region, z. B. "Spanien · Mallorca" */
  region: string
  travelTypes: TravelType[]
  /** Hotelpreis pro Person und Woche in Euro */
  hotelPricePerPerson: number
  /** Flugpreis pro Person (hin & zurück), null = keine Fluganreise */
  flightPricePerPerson: number | null
  /** true, wenn der Flugpreis live von der Preis-API stammt */
  livePrice?: boolean
  /** Termin, für den der Live-Flugpreis gefunden wurde */
  livePriceInfo?: {
    month: string | null
    departureAt: string | null
    returnAt: string | null
  }
  /** Hotelkategorie 1–5 Sterne */
  hotelStars: number
  /** Gästebewertung 0–10 */
  rating: number
  reviewCount: number
  /** Entfernung zum Strand in Metern, null = kein Strand in der Nähe */
  beachDistanceM: number | null
  familyHotel: boolean
  /** Flugzeit ab Deutschland in Stunden */
  flightHours: number
  /** Darf Toilettenpapier in die Toilette geworfen werden? */
  paperInToilet: boolean
  /** Durchschnittliche Sonnenstunden pro Tag in der Saison */
  sunHoursPerDay: number
  scores: Record<ScoreKey, number>
  amenities: {
    pool: boolean
    whirlpool: boolean
    spa: boolean
    parking: boolean
  }
  /** Mögliche Abflughäfen (IATA-Codes) */
  departureAirports: string[]
  /** Ziel-Flughafen (IATA), null wenn keine Fluganreise */
  destinationAirport: string | null
  /** Verpflegung, z. B. "All Inclusive" */
  board: string
  /** Hotelfoto: Dateiname auf Wikimedia Commons (ohne "File:"-Präfix), null = kein Foto */
  photoFile: string | null
  /** Tailwind-Gradient als Fallback, wenn kein Foto verfügbar ist */
  gradient: string
  /** Symbol für das Reiseziel (Fallback ohne Foto) */
  emoji: string
}

/** Mindest-Anspruch an ein Score-Kriterium. */
export type ScoreLevel = 'any' | 'good' | 'excellent'

export interface Filters {
  travelType: TravelType | 'all'
  query: string
  maxPrice: number
  minStars: number
  minRating: number
  /** null = egal */
  maxFlightHours: number | null
  /** null = egal */
  maxBeachDistance: number | null
  familyOnly: boolean
  paperInToilet: boolean
  pool: boolean
  whirlpool: boolean
  spa: boolean
  parking: boolean
  /** leer = alle Abflughäfen */
  airports: string[]
  minSunHours: number
  scoreLevels: Record<ScoreKey, ScoreLevel>
}

export type SortKey = 'recommended' | 'priceAsc' | 'priceDesc' | 'rating' | 'stars'

/** Flexibilität des Reisedatums („ungefähr“). */
export type Flexibility = 'exact' | 'plus3' | 'plus7'

/** Belegung eines Zimmers. */
export interface RoomOccupancy {
  adults: number
  /** Alter der Kinder in diesem Zimmer (0–17) */
  childAges: number[]
}

/** Reisedaten der Suche: Zeitraum, Zimmer mit Reisenden, Gepäck. */
export interface TripParams {
  /** Abreisedatum (ISO yyyy-mm-dd), null = noch offen */
  departureDate: string | null
  flexibility: Flexibility
  /** Reisedauer in Nächten */
  nights: number
  /** Zimmer mit Aufteilung der Reisenden */
  rooms: RoomOccupancy[]
  /** Flug mit Aufgabegepäck? */
  baggage: boolean
}
