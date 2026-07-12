import type { TravelType } from '../types'

const TRAVEL_TYPES: { value: TravelType | 'all'; label: string; icon: string }[] = [
  { value: 'package', label: 'Pauschalreise', icon: '🧳' },
  { value: 'hotel', label: 'Nur Hotel', icon: '🏨' },
  { value: 'flight', label: 'Nur Flug', icon: '✈️' },
  { value: 'all', label: 'Alles', icon: '🌍' },
]

export function SearchBar({
  travelType,
  onTravelTypeChange,
  query,
  onQueryChange,
}: {
  travelType: TravelType | 'all'
  onTravelTypeChange: (type: TravelType | 'all') => void
  query: string
  onQueryChange: (query: string) => void
}) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-900/5 sm:p-4">
      <div role="tablist" aria-label="Reiseart" className="mb-3 flex flex-wrap gap-1.5">
        {TRAVEL_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            role="tab"
            aria-selected={travelType === type.value}
            onClick={() => onTravelTypeChange(type.value)}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition ${
              travelType === type.value
                ? 'bg-sky-600 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span aria-hidden="true">{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
          >
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Reiseziel, Region oder Hotelname – z. B. Mallorca"
            aria-label="Reiseziel oder Hotelname"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-4 pl-10 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200"
          />
        </div>
        <button
          type="button"
          className="rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/30 transition hover:from-sky-700 hover:to-cyan-600"
        >
          Suchen
        </button>
      </div>
    </div>
  )
}
