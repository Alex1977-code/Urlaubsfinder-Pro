import { useEffect, useMemo, useRef, useState } from 'react'
import type { Filters, Offer, SortKey, TripParams } from './types'
import { OFFERS } from './data/offers'
import { DEFAULT_FILTERS, applyFilters } from './lib/filter'
import { EMPTY_LIVE_PRICES, applyLivePrices, fetchLivePrices } from './lib/livePrices'
import { DEFAULT_TRIP, tripSummary } from './lib/trip'
import { SearchBar } from './components/SearchBar'
import { FilterSidebar } from './components/FilterSidebar'
import { OfferCard } from './components/OfferCard'
import { OfferDetailDialog } from './components/OfferDetailDialog'
import { LiveSearch } from './components/LiveSearch'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Unsere Empfehlung' },
  { value: 'priceAsc', label: 'Preis aufsteigend' },
  { value: 'priceDesc', label: 'Preis absteigend' },
  { value: 'rating', label: 'Beste Bewertung' },
  { value: 'stars', label: 'Hotelkategorie' },
]

export default function App() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [trip, setTrip] = useState<TripParams>(DEFAULT_TRIP)
  const [sort, setSort] = useState<SortKey>('recommended')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null)
  const [view, setView] = useState<'catalog' | 'live'>('catalog')
  const [livePrices, setLivePrices] = useState(EMPTY_LIVE_PRICES)
  const resultsRef = useRef<HTMLElement>(null)

  useEffect(() => {
    void fetchLivePrices().then(setLivePrices)
  }, [])

  const offers = useMemo(() => applyLivePrices(OFFERS, livePrices), [livePrices])
  const results = useMemo(() => applyFilters(offers, filters, sort), [offers, filters, sort])

  // Bei "Nur Hotel" spielt Gepäck keine Rolle – nicht in Preis und Anzeige aufnehmen.
  const effectiveTrip = filters.travelType === 'hotel' ? { ...trip, baggage: false } : trip

  // "Suchen" springt zur Ergebnisliste – auch ohne eingegebenes Reiseziel.
  const handleSearch = () => {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen">
      {/* Hero mit Suchleiste */}
      <header className="bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-500 pb-20">
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="flex items-center justify-between">
            <p className="text-xl font-extrabold tracking-tight text-white">
              🌴 Urlaubsfinder <span className="text-cyan-200">Pro</span>
            </p>
            <p className="hidden text-sm text-sky-100 sm:block">
              Pauschalreisen · Hotels · Flüge
            </p>
          </div>
          <div className="py-10 text-center sm:py-14">
            <h1 className="text-3xl font-extrabold text-white sm:text-4xl">
              Finde deinen Traumurlaub
            </h1>
            <p className="mt-3 text-sky-100">
              Mit den Kriterien, die wirklich zählen – von Strandnähe bis „Darf Papier in die Toilette?“
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-16 max-w-6xl px-4 pb-16 sm:px-6">
        <SearchBar
          travelType={filters.travelType}
          onTravelTypeChange={(travelType) => setFilters({ ...filters, travelType })}
          query={filters.query}
          onQueryChange={(query) => setFilters({ ...filters, query })}
          trip={trip}
          onTripChange={setTrip}
          onSearch={handleSearch}
        />

        <div
          role="tablist"
          aria-label="Suchmodus"
          className="mt-6 flex flex-wrap gap-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'catalog'}
            onClick={() => setView('catalog')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              view === 'catalog' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
            }`}
          >
            ⭐ Empfohlene Angebote ({OFFERS.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'live'}
            onClick={() => setView('live')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              view === 'live' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-600 shadow-sm hover:bg-slate-50'
            }`}
          >
            🌐 Live-Suche: alle Hotels
          </button>
        </div>

        {view === 'live' && (
          <div className="mt-4">
            <LiveSearch
              trip={effectiveTrip}
              minStars={filters.minStars}
              onMinStarsChange={(minStars) => setFilters({ ...filters, minStars })}
              preferredAirport={filters.airports[0]}
            />
          </div>
        )}

        <div className={`mt-4 grid gap-6 lg:grid-cols-[300px_1fr] ${view === 'live' ? 'hidden' : ''}`}>
          {/* Filter: auf Mobilgeräten einklappbar */}
          <aside>
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="mb-3 w-full rounded-xl bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-900/5 lg:hidden"
              aria-expanded={filtersOpen}
            >
              {filtersOpen ? '▲ Filter ausblenden' : '▼ Filter anzeigen'}
            </button>
            <div className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
              <FilterSidebar filters={filters} onChange={setFilters} />
            </div>
          </aside>

          <section aria-label="Suchergebnisse" ref={resultsRef} className="scroll-mt-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-slate-600">
                <strong className="text-lg font-bold text-slate-900">{results.length}</strong>{' '}
                {results.length === 1 ? 'Angebot' : 'Angebote'} gefunden
                <span className="block text-xs font-normal text-slate-400">
                  {tripSummary(effectiveTrip, filters.travelType !== 'hotel')}
                  {livePrices.updatedAt && filters.travelType !== 'hotel' && (
                    <>
                      {' · '}
                      <span className="text-emerald-600">
                        ✈️ Flugpreise live (Aviasales), Stand{' '}
                        {new Date(livePrices.updatedAt).toLocaleDateString('de-DE')}
                      </span>
                    </>
                  )}
                </span>
              </h2>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Sortieren:
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {results.length > 0 ? (
              <div className="flex flex-col gap-4">
                {results.map((offer) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    trip={effectiveTrip}
                    travelType={filters.travelType}
                    onSelect={setSelectedOffer}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-900/5">
                <p className="text-4xl" aria-hidden="true">
                  🏝️
                </p>
                <h3 className="mt-3 text-lg font-bold text-slate-900">Keine Angebote gefunden</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Deine Kriterien sind aktuell zu streng. Lockere einzelne Filter oder setze sie zurück.
                </p>
                <button
                  type="button"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="mt-4 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  Alle Filter zurücksetzen
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      <OfferDetailDialog
        offer={selectedOffer}
        trip={effectiveTrip}
        travelType={filters.travelType}
        preferredAirport={filters.airports[0]}
        onClose={() => setSelectedOffer(null)}
      />

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-400 sm:px-6">
          Urlaubsfinder Pro – Demo mit Beispieldaten. Preise pro Person, Verfügbarkeit nicht garantiert.
        </div>
      </footer>
    </div>
  )
}
