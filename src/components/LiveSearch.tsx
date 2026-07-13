import { useEffect, useRef, useState } from 'react'
import type { Filters, Offer, TripParams } from '../types'
import { AIRPORTS, airportLabel } from '../data/airports'
import { DESTINATION_AIRPORTS } from '../data/destinationAirports'
import { formatBeachDistance, formatFlightHours, formatPrice } from '../lib/format'
import { bookingSearchUrl, flightsSearchUrl } from '../lib/links'
import { BAGGAGE_FEE, payingTravellers, personFactor, travellersLabel } from '../lib/trip'
import {
  OVERPASS_URLS,
  estimateFlightPrice,
  estimateHotelWeekPrice,
  estimatedFlightHours,
  filterByBeach,
  filterByStars,
  friendlyOverpassError,
  haversineKm,
  nearestKnownAirport,
  nominatimUrl,
  overpassQuery,
  parseOverpassHotels,
  reachableDestinations,
  type LiveHotel,
  type LivePlace,
} from '../lib/live'

/** Automatischer Suchbereich um den Zielort; wird bei 0 Treffern erweitert. */
const BASE_RADIUS = 15000
const EXTENDED_RADIUS = 40000

const MAX_SHOWN = 60

type Status = 'idle' | 'loading' | 'done' | 'error' | 'destinations'

type LiveSort = 'distance' | 'priceAsc' | 'stars' | 'beach'

const LIVE_SORT_OPTIONS: { value: LiveSort; label: string }[] = [
  { value: 'distance', label: 'Empfehlung (Nähe zum Zentrum)' },
  { value: 'priceAsc', label: 'Preis aufsteigend' },
  { value: 'stars', label: 'Hotelkategorie' },
  { value: 'beach', label: 'Strandnähe' },
]

function StarsInline({ stars }: { stars: number }) {
  return <span className="text-amber-400">{'★'.repeat(Math.round(stars))}</span>
}

export function LiveSearch({
  trip,
  filters,
  offers,
  query,
  searchTrigger,
  onQueryChange,
}: {
  trip: TripParams
  /** Die Filter der Seitenleiste; angewendet werden Sterne, Flugzeit, Strandnähe, Abflughafen */
  filters: Filters
  /** Angebotskatalog mit Live-Flugpreisen (für echte Flugpreise bekannter Routen) */
  offers: Offer[]
  /** Suchbegriff aus der gemeinsamen Suchmaske */
  query: string
  /** Zähler: jede Erhöhung startet eine Suche (aus der gemeinsamen Suchmaske) */
  searchTrigger: number
  /** Suchfeld der gemeinsamen Maske aktualisieren (z. B. bei Ziel-Klick) */
  onQueryChange: (query: string) => void
}) {
  const [usedRadius, setUsedRadius] = useState(BASE_RADIUS)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [place, setPlace] = useState<LivePlace | null>(null)
  const [hotels, setHotels] = useState<LiveHotel[]>([])
  const [includeUnrated, setIncludeUnrated] = useState(false)
  const [sort, setSort] = useState<LiveSort>('distance')
  const abortRef = useRef<AbortController | null>(null)

  // Abflughafen aus der Seitenleiste, Standard: Frankfurt
  const from = filters.airports[0] ?? 'FRA'
  const fromAirport = AIRPORTS.find((airport) => airport.code === from)

  // Abgeleitet aus Ziel + Abflughafen (reagiert sofort auf Wechsel, ohne neue Abfrage)
  const airDistanceKm =
    place && fromAirport ? haversineKm(fromAirport.lat, fromAirport.lon, place.lat, place.lon) : null
  const flightHours = airDistanceKm !== null ? estimatedFlightHours(airDistanceKm) : null

  // Echter Live-Flugpreis, wenn das Ziel nahe einer bekannten Route liegt – sonst Distanz-Schätzung
  const nearestAirport = place
    ? nearestKnownAirport(place.lat, place.lon, DESTINATION_AIRPORTS)
    : null
  const liveOffer = nearestAirport
    ? offers.find(
        (offer) =>
          offer.destinationAirport === nearestAirport.code &&
          offer.livePrice &&
          offer.flightPricePerPerson !== null,
      )
    : undefined
  const flightPricePP =
    liveOffer?.flightPricePerPerson ??
    (airDistanceKm !== null ? estimateFlightPrice(airDistanceKm) : null)
  const flightIsLive = liveOffer !== undefined

  // Gesamt- und p.-P.-Preis je Hotel (Hotelanteil geschätzt nach Kategorie)
  const factor = personFactor(trip)
  const priceFor = (hotel: LiveHotel) => {
    const hotelWeek = estimateHotelWeekPrice(hotel.stars)
    const hotelPP = Math.round(hotelWeek * (trip.nights / 7))
    const perPerson = hotelPP + (flightPricePP ?? 0)
    const baggage =
      flightPricePP !== null && trip.baggage ? BAGGAGE_FEE * payingTravellers(trip) : 0
    const total =
      Math.round(hotelWeek * (trip.nights / 7) * factor) +
      (flightPricePP !== null ? Math.round(flightPricePP * factor) : 0) +
      baggage
    return { hotelPP, perPerson, total }
  }

  // Filter aus der Seitenleiste – wirken sofort, ohne neue Abfrage
  const filteredHotels = filterByBeach(
    filterByStars(hotels, filters.minStars, includeUnrated),
    filters.maxBeachDistance,
  )

  // Sortierung (Standard: Nähe zum Zentrum, wie von Overpass geliefert)
  const sortedHotels = [...filteredHotels].sort((a, b) => {
    switch (sort) {
      case 'priceAsc':
        return priceFor(a).total - priceFor(b).total
      case 'stars':
        return (b.stars ?? -1) - (a.stars ?? -1) || a.distanceKm - b.distanceKm
      case 'beach':
        return (a.beachDistanceM ?? Infinity) - (b.beachDistanceM ?? Infinity)
      default:
        return a.distanceKm - b.distanceKm
    }
  })
  const overFlightLimit =
    filters.maxFlightHours !== null && flightHours !== null && flightHours > filters.maxFlightHours

  /** Hotels + Strände rund um bekannte Koordinaten laden (ohne Geokodierung). */
  const runHotelSearch = async (lat: number, lon: number, placeName: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    setError('')
    setPlace({ name: placeName, lat, lon })
    try {
      await loadHotels(controller, lat, lon)
    } catch (err) {
      if (controller.signal.aborted) return
      setStatus('error')
      setError(
        err instanceof Error
          ? `${err.message}. Bitte später erneut versuchen.`
          : 'Unbekannter Fehler. Bitte später erneut versuchen.',
      )
    }
  }

  const search = async () => {
    // Ohne Ziel: Entdecker-Modus – alle Ziele innerhalb der max. Flugzeit
    if (!query.trim()) {
      abortRef.current?.abort()
      setPlace(null)
      setHotels([])
      setStatus('destinations')
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    setError('')
    try {
      // 1) Ziel geokodieren (Nominatim)
      const geoResponse = await fetch(nominatimUrl(query), { signal: controller.signal })
      if (!geoResponse.ok) throw new Error(`Geokodierung fehlgeschlagen (${geoResponse.status})`)
      const geo = (await geoResponse.json()) as {
        lat: string
        lon: string
        display_name: string
      }[]
      if (geo.length === 0) {
        setStatus('error')
        setError(`„${query}“ wurde nicht gefunden. Bitte Ort präzisieren, z. B. „Playa de Palma, Mallorca“.`)
        return
      }
      const lat = Number(geo[0].lat)
      const lon = Number(geo[0].lon)
      const placeName = geo[0].display_name.split(',').slice(0, 2).join(',')
      setPlace({ name: placeName, lat, lon })
      await loadHotels(controller, lat, lon)
    } catch (err) {
      if (controller.signal.aborted) return
      setStatus('error')
      setError(
        err instanceof Error
          ? `${err.message}. Bitte später erneut versuchen.`
          : 'Unbekannter Fehler. Bitte später erneut versuchen.',
      )
    }
  }

  const loadHotels = async (controller: AbortController, lat: number, lon: number) => {
    {
      // Hotels + Strände laden (Overpass/OSM, mit Ausweich-Server);
      //    der Suchbereich wird automatisch erweitert, wenn nichts erfasst ist
      let lastDetail = ''
      const fetchHotels = async (radiusM: number): Promise<LiveHotel[] | null> => {
        for (const url of OVERPASS_URLS) {
          try {
            const overpassResponse = await fetch(url, {
              method: 'POST',
              body: `data=${encodeURIComponent(overpassQuery(lat, lon, radiusM))}`,
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              signal: controller.signal,
            })
            if (!overpassResponse.ok) {
              lastDetail = `HTTP ${overpassResponse.status}`
              continue
            }
            const data = (await overpassResponse.json()) as Parameters<
              typeof parseOverpassHotels
            >[0]
            return parseOverpassHotels(data, lat, lon)
          } catch (err) {
            if (controller.signal.aborted) return null
            lastDetail = err instanceof Error ? err.message : 'Netzwerkfehler'
          }
        }
        return null
      }

      let radiusUsed = BASE_RADIUS
      let parsed = await fetchHotels(BASE_RADIUS)
      if (parsed !== null && parsed.length === 0) {
        const wider = await fetchHotels(EXTENDED_RADIUS)
        if (wider !== null) {
          parsed = wider
          radiusUsed = EXTENDED_RADIUS
        }
      }
      if (parsed === null) {
        if (controller.signal.aborted) return
        setStatus('error')
        setError(friendlyOverpassError(lastDetail))
        return
      }
      setHotels(parsed)
      setUsedRadius(radiusUsed)
      setStatus('done')
    }
  }

  const destinationLabel = place ? place.name.split(',')[0] : query

  // Entdecker-Modus: alle bekannten Ziele innerhalb der max. Flugzeit
  const reachable = fromAirport
    ? reachableDestinations(fromAirport, filters.maxFlightHours, DESTINATION_AIRPORTS)
    : []

  // Suche wird über die gemeinsame Suchmaske ausgelöst
  useEffect(() => {
    if (searchTrigger > 0) void search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTrigger])

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      {status === 'idle' && (
        <p className="text-sm text-slate-500">
          Klicke oben auf <strong>„Suchen“</strong> – mit Reiseziel lädt die Live-Suche alle dort
          erfassten Hotels, ohne Reiseziel zeigt sie alle Ziele innerhalb deiner max. Flugzeit ab{' '}
          {airportLabel(from)}.
        </p>
      )}

      {status === 'loading' && (
        <p className="mt-4 animate-pulse text-sm text-slate-500">
          Frage OpenStreetMap nach allen Hotels rund um „{query}“ …
        </p>
      )}

      {status === 'error' && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠️ {error}</p>
      )}

      {status === 'destinations' && (
        <div className="mt-5">
          <h3 className="text-sm font-medium text-slate-600">
            <strong className="text-lg font-bold text-slate-900">{reachable.length}</strong> Ziele
            {filters.maxFlightHours !== null
              ? ` innerhalb von ${filters.maxFlightHours} Std. Flugzeit`
              : ''}{' '}
            ab {airportLabel(from)} – Ziel wählen, um alle Hotels dort zu laden:
          </h3>
          {reachable.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Kein bekanntes Ziel liegt innerhalb dieser Flugzeit – erhöhe die max. Flugzeit.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {reachable.map((destination) => {
                const liveOfferPrice = offers.find(
                  (offer) =>
                    offer.destinationAirport === destination.code &&
                    offer.livePrice &&
                    offer.flightPricePerPerson !== null,
                )?.flightPricePerPerson
                return (
                  <li key={destination.code}>
                    <button
                      type="button"
                      onClick={() => {
                        onQueryChange(destination.name)
                        void runHotelSearch(destination.lat, destination.lon, destination.name)
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-left transition hover:border-sky-400 hover:bg-sky-50"
                    >
                      <span className="block text-sm font-semibold text-slate-900">
                        {destination.name}{' '}
                        <span className="font-normal text-slate-400">({destination.code})</span>
                      </span>
                      <span className="block text-xs text-slate-500">
                        ✈️ {formatFlightHours(destination.flightHours)}
                        {liveOfferPrice != null && (
                          <>
                            {' '}
                            · Flug ab {formatPrice(liveOfferPrice)}
                            <span className="ml-1 rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-bold text-emerald-700">
                              LIVE
                            </span>
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {status === 'done' && place && overFlightLimit && (
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
          ✈️ {place.name} liegt bei ca.{' '}
          <strong>{flightHours!.toLocaleString('de-DE')} Std. Flugzeit</strong> ab{' '}
          {airportLabel(from)} – über deiner max. Flugzeit von {filters.maxFlightHours} Std.
          <span className="mt-1 block text-xs text-amber-700">
            Erhöhe links den Filter „Max. Flugzeit“ oder wähle ein näheres Ziel.
          </span>
        </div>
      )}

      {status === 'done' && place && !overFlightLimit && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-slate-600">
              <strong className="text-lg font-bold text-slate-900">{filteredHotels.length}</strong>
              {filteredHotels.length !== hotels.length && (
                <span className="text-slate-400"> von {hotels.length}</span>
              )}{' '}
              Hotels bei {place.name}{' '}
              <span className="text-slate-400">
                (Umkreis {usedRadius / 1000} km
                {usedRadius === EXTENDED_RADIUS && ', automatisch erweitert'} · Quelle:
                OpenStreetMap)
              </span>
              {flightHours !== null && (
                <span className="mt-1 block text-xs font-normal text-sky-700 sm:mt-0 sm:ml-2 sm:inline">
                  ✈️ {formatFlightHours(flightHours)} ab {airportLabel(from)}
                  {filters.maxFlightHours !== null && ` (Filter: max. ${filters.maxFlightHours} Std. ✓)`}
                </span>
              )}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Sortieren:
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as LiveSort)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                >
                  {LIVE_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <a
                href={flightsSearchUrl(destinationLabel, from, trip)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-sky-600 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
              >
                ✈️ Flugangebote nach {destinationLabel} ab {airportLabel(from)}
              </a>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-slate-400">
            Preise: Hotelanteil geschätzt nach Kategorie (≈), Flug{' '}
            {flightIsLive
              ? `live (Aviasales, Route ${from} → ${nearestAirport!.code})`
              : 'nach Distanz geschätzt (≈)'}
            {trip.baggage && ' · inkl. Aufgabegepäck'} – exakte Hotelpreise über „Preise prüfen“.
          </p>

          {filters.minStars > 0 && (
            <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={includeUnrated}
                onChange={(e) => setIncludeUnrated(e.target.checked)}
                className="size-3.5 rounded border-slate-300 accent-sky-600"
              />
              Hotels ohne Sterne-Angabe einbeziehen (OpenStreetMap kennt nicht überall Sterne)
            </label>
          )}

          {filteredHotels.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              {hotels.length === 0
                ? 'Rund um dieses Ziel sind keine Hotels in OpenStreetMap erfasst (auch nicht im erweiterten 40-km-Umkreis) – bitte anderen Ort probieren.'
                : 'Kein Hotel erfüllt die aktiven Filter (Sterne/Strandnähe) – Filter links lockern oder Hotels ohne Sterne-Angabe einbeziehen.'}
            </p>
          ) : (
            <>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {sortedHotels.slice(0, MAX_SHOWN).map((hotel) => (
                  <li
                    key={hotel.id}
                    className="flex flex-col gap-1.5 rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {hotel.name} {hotel.stars !== null && <StarsInline stars={hotel.stars} />}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {hotel.distanceKm < 1
                          ? `${Math.round(hotel.distanceKm * 1000)} m`
                          : `${hotel.distanceKm.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km`}
                      </span>
                    </div>
                    {hotel.beachDistanceM !== null && (
                      <span className="text-xs text-sky-700">
                        🏖️ {formatBeachDistance(hotel.beachDistanceM)}
                      </span>
                    )}
                    {hotel.address && <span className="text-xs text-slate-500">{hotel.address}</span>}
                    {(() => {
                      const price = priceFor(hotel)
                      return (
                        <div className="mt-0.5">
                          <span className="text-sm font-bold text-slate-900">
                            ≈ {formatPrice(price.perPerson)}{' '}
                            <span className="text-xs font-normal text-slate-500">
                              p. P. (Hotel ≈ {formatPrice(price.hotelPP)}
                              {flightPricePP !== null && (
                                <>
                                  {' '}
                                  + Flug {formatPrice(flightPricePP)}
                                  {flightIsLive && (
                                    <span className="ml-1 rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-bold text-emerald-700">
                                      LIVE
                                    </span>
                                  )}
                                </>
                              )}
                              )
                            </span>
                          </span>
                          <span className="block text-xs text-slate-500">
                            gesamt ≈ {formatPrice(price.total)} · {travellersLabel(trip)} ·{' '}
                            {trip.nights} Nächte
                          </span>
                        </div>
                      )
                    })()}
                    <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-medium">
                      <a
                        href={bookingSearchUrl(`${hotel.name}, ${destinationLabel}`, trip)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-sky-600 px-2.5 py-1.5 text-white transition hover:bg-sky-700"
                      >
                        Preise prüfen
                      </a>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${hotel.lat},${hotel.lon}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-100"
                      >
                        Karte
                      </a>
                      {hotel.website && (
                        <a
                          href={hotel.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-600 transition hover:bg-slate-100"
                        >
                          Website
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {filteredHotels.length > MAX_SHOWN && (
                <p className="mt-3 text-center text-xs text-slate-400">
                  … und {filteredHotels.length - MAX_SHOWN} weitere. Nutze die Filter links, um die
                  Auswahl einzugrenzen.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
