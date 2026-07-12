import { useRef, useState } from 'react'
import type { Filters, TripParams } from '../types'
import { AIRPORTS, airportLabel } from '../data/airports'
import { formatBeachDistance, formatFlightHours } from '../lib/format'
import { bookingSearchUrl, flightsSearchUrl } from '../lib/links'
import {
  OVERPASS_URLS,
  estimatedFlightHours,
  filterByBeach,
  filterByStars,
  friendlyOverpassError,
  haversineKm,
  nominatimUrl,
  overpassQuery,
  parseOverpassHotels,
  type LiveHotel,
  type LivePlace,
} from '../lib/live'
import { TripControls } from './SearchBar'

const RADIUS_OPTIONS = [
  { value: 3000, label: '3 km' },
  { value: 10000, label: '10 km' },
  { value: 25000, label: '25 km' },
]

const MAX_SHOWN = 60

type Status = 'idle' | 'loading' | 'done' | 'error'

function StarsInline({ stars }: { stars: number }) {
  return <span className="text-amber-400">{'★'.repeat(Math.round(stars))}</span>
}

export function LiveSearch({
  trip,
  onTripChange,
  filters,
}: {
  trip: TripParams
  onTripChange: (trip: TripParams) => void
  /** Die Filter der Seitenleiste; angewendet werden Sterne, Flugzeit, Strandnähe, Abflughafen */
  filters: Filters
}) {
  const [query, setQuery] = useState('')
  const [radius, setRadius] = useState(10000)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [place, setPlace] = useState<LivePlace | null>(null)
  const [hotels, setHotels] = useState<LiveHotel[]>([])
  const [flightHours, setFlightHours] = useState<number | null>(null)
  const [includeUnrated, setIncludeUnrated] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const from = filters.airports[0] ?? 'FRA'
  const fromAirport = AIRPORTS.find((airport) => airport.code === from)

  // Filter aus der Seitenleiste – wirken sofort, ohne neue Abfrage
  const filteredHotels = filterByBeach(
    filterByStars(hotels, filters.minStars, includeUnrated),
    filters.maxBeachDistance,
  )
  const overFlightLimit =
    filters.maxFlightHours !== null && flightHours !== null && flightHours > filters.maxFlightHours

  const search = async (searchRadius: number = radius) => {
    if (!query.trim()) return
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

      // 2) Geschätzte Flugzeit ab Abflughafen (für Anzeige und Flugzeit-Filter)
      setFlightHours(
        fromAirport
          ? estimatedFlightHours(haversineKm(fromAirport.lat, fromAirport.lon, lat, lon))
          : null,
      )

      // 3) Hotels + Strände im Umkreis laden (Overpass/OSM, mit Ausweich-Server)
      let data: unknown = null
      let lastDetail = ''
      for (const url of OVERPASS_URLS) {
        try {
          const overpassResponse = await fetch(url, {
            method: 'POST',
            body: `data=${encodeURIComponent(overpassQuery(lat, lon, searchRadius))}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: controller.signal,
          })
          if (!overpassResponse.ok) {
            lastDetail = `HTTP ${overpassResponse.status}`
            continue
          }
          data = await overpassResponse.json()
          break
        } catch (err) {
          if (controller.signal.aborted) return
          lastDetail = err instanceof Error ? err.message : 'Netzwerkfehler'
        }
      }
      if (data === null) {
        setStatus('error')
        setError(friendlyOverpassError(lastDetail))
        return
      }
      setHotels(parseOverpassHotels(data as Parameters<typeof parseOverpassHotels>[0], lat, lon))
      setStatus('done')
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

  const destinationLabel = place ? place.name.split(',')[0] : query

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <h2 className="text-base font-bold text-slate-900">🌐 Live-Suche: alle Hotels eines Ziels</h2>
      <p className="mt-1 text-sm text-slate-500">
        Fragt in Echtzeit alle in OpenStreetMap erfassten Hotels ab – für jedes Ziel weltweit.
        Reisedaten und Filter (links) gelten wie bei den empfohlenen Angeboten.
      </p>

      <form
        className="mt-4 flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void search()
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Beliebiges Reiseziel – z. B. Alcúdia, Side, Punta Cana …"
            aria-label="Reiseziel für die Live-Suche"
            required
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200"
          />
          <select
            value={radius}
            onChange={(e) => {
              const value = Number(e.target.value)
              setRadius(value)
              // Nach einer Suche lädt der neue Umkreis direkt neu
              if (status !== 'idle') void search(value)
            }}
            aria-label="Suchradius"
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none focus:border-sky-500"
          >
            {RADIUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Umkreis {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={status === 'loading'}
            className="rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/30 transition hover:from-sky-700 hover:to-cyan-600 disabled:opacity-60"
          >
            {status === 'loading' ? 'Suche läuft …' : 'Hotels laden'}
          </button>
        </div>

        <TripControls trip={trip} onTripChange={onTripChange} showBaggage={false} />
      </form>

      {status === 'loading' && (
        <p className="mt-4 animate-pulse text-sm text-slate-500">
          Frage OpenStreetMap nach allen Hotels rund um „{query}“ …
        </p>
      )}

      {status === 'error' && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">⚠️ {error}</p>
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
              Hotels bei {place.name} <span className="text-slate-400">(Quelle: OpenStreetMap)</span>
              {flightHours !== null && (
                <span className="mt-1 block text-xs font-normal text-sky-700 sm:mt-0 sm:ml-2 sm:inline">
                  ✈️ {formatFlightHours(flightHours)} ab {airportLabel(from)}
                  {filters.maxFlightHours !== null && ` (Filter: max. ${filters.maxFlightHours} Std. ✓)`}
                </span>
              )}
            </h3>
            <a
              href={flightsSearchUrl(destinationLabel, from, trip)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-sky-600 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
            >
              ✈️ Flugangebote nach {destinationLabel} ab {airportLabel(from)}
            </a>
          </div>

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
                ? 'In diesem Umkreis sind keine Hotels in OpenStreetMap erfasst – Radius vergrößern oder anderen Ort probieren.'
                : 'Kein Hotel erfüllt die aktiven Filter (Sterne/Strandnähe) – Filter links lockern oder Hotels ohne Sterne-Angabe einbeziehen.'}
            </p>
          ) : (
            <>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {filteredHotels.slice(0, MAX_SHOWN).map((hotel) => (
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
                  … und {filteredHotels.length - MAX_SHOWN} weitere. Verkleinere den Radius, um
                  gezielter zu suchen.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
