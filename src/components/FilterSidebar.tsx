import type { Filters, ScoreKey } from '../types'
import { AIRPORTS } from '../data/airports'
import { DEFAULT_FILTERS, PRICE_CAP, SCORE_KEYS, SCORE_LABELS, countActiveFilters } from '../lib/filter'
import { CheckboxRow, FilterSection, LevelPicker, SliderRow } from './ui'

const BEACH_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Egal' },
  { value: 100, label: '≤ 100 m (direkt am Strand)' },
  { value: 300, label: '≤ 300 m' },
  { value: 1000, label: '≤ 1 km' },
  { value: 2000, label: '≤ 2 km' },
]

export function FilterSidebar({
  filters,
  onChange,
  liveMode = false,
}: {
  filters: Filters
  onChange: (filters: Filters) => void
  /** In der Live-Suche wirken nur Filter, für die OpenStreetMap Daten hat */
  liveMode?: boolean
}) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value })

  const setScoreLevel = (key: ScoreKey, level: Filters['scoreLevels'][ScoreKey]) =>
    onChange({ ...filters, scoreLevels: { ...filters.scoreLevels, [key]: level } })

  const activeCount = countActiveFilters(filters)
  // Ausgegraut im Live-Modus: Kriterien ohne Datenbasis in OpenStreetMap
  const inactive = liveMode ? 'pointer-events-none opacity-40 select-none' : ''

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Filter</h2>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS, travelType: filters.travelType, query: filters.query })}
            className="text-xs font-medium text-sky-700 hover:underline"
          >
            {activeCount} zurücksetzen
          </button>
        )}
      </div>

      {liveMode && (
        <p className="mb-3 rounded-lg bg-sky-50 px-2.5 py-2 text-xs text-sky-800">
          In der Live-Suche wirken <strong>Hotelkategorie</strong>, <strong>max. Flugzeit</strong>,{' '}
          <strong>Strandnähe</strong> und <strong>Abflughafen</strong>. Ausgegraute Filter brauchen
          Bewertungs-/Preisdaten, die OpenStreetMap nicht enthält.
        </p>
      )}

      <div className={inactive} aria-disabled={liveMode}>
      <FilterSection title="Budget pro Person">
        <SliderRow
          label="Max. Preis"
          valueLabel={filters.maxPrice >= PRICE_CAP ? 'Egal' : `bis ${filters.maxPrice} €`}
          min={300}
          max={PRICE_CAP}
          step={50}
          value={filters.maxPrice}
          onChange={(value) => set('maxPrice', value)}
        />
      </FilterSection>
      </div>

      <FilterSection title="Hotelkategorie">
        <div className="flex gap-1.5" role="radiogroup" aria-label="Mindest-Sterne">
          {[0, 3, 4, 5].map((stars) => (
            <button
              key={stars}
              type="button"
              role="radio"
              aria-checked={filters.minStars === stars}
              onClick={() => set('minStars', stars)}
              className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                filters.minStars === stars
                  ? 'border-sky-600 bg-sky-50 text-sky-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {stars === 0 ? 'Alle' : `${stars}★+`}
            </button>
          ))}
        </div>
      </FilterSection>

      <div className={inactive} aria-disabled={liveMode}>
      <FilterSection title="Gästebewertung">
        <SliderRow
          label="Mindestens"
          valueLabel={filters.minRating === 0 ? 'Egal' : `${filters.minRating.toLocaleString('de-DE')} / 10`}
          min={0}
          max={9.5}
          step={0.5}
          value={filters.minRating}
          onChange={(value) => set('minRating', value)}
        />
      </FilterSection>
      </div>

      <FilterSection title="Max. Flugzeit">
        <SliderRow
          label="Höchstens"
          valueLabel={filters.maxFlightHours === null ? 'Egal' : `${filters.maxFlightHours} Std.`}
          min={1}
          max={13}
          step={1}
          value={filters.maxFlightHours ?? 13}
          onChange={(value) => set('maxFlightHours', value >= 13 ? null : value)}
        />
      </FilterSection>

      <FilterSection title="Strandnähe">
        <select
          value={filters.maxBeachDistance === null ? '' : String(filters.maxBeachDistance)}
          onChange={(e) => set('maxBeachDistance', e.target.value === '' ? null : Number(e.target.value))}
          aria-label="Maximale Entfernung zum Strand"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
        >
          {BEACH_OPTIONS.map((option) => (
            <option key={option.label} value={option.value === null ? '' : option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FilterSection>

      <div className={inactive} aria-disabled={liveMode}>
      <FilterSection title="Verpflegung">
        {['All Inclusive', 'Vollpension', 'Dreiviertelpension', 'Halbpension', 'Frühstück'].map(
          (board) => (
            <CheckboxRow
              key={board}
              icon="🍽️"
              label={board}
              checked={filters.boards.includes(board)}
              onChange={(checked) =>
                set(
                  'boards',
                  checked
                    ? [...filters.boards, board]
                    : filters.boards.filter((b) => b !== board),
                )
              }
            />
          ),
        )}
      </FilterSection>

      <FilterSection title="Sonnenfaktor">
        <SliderRow
          label="Sonnenstunden/Tag"
          valueLabel={filters.minSunHours === 0 ? 'Egal' : `ab ${filters.minSunHours} Std.`}
          min={0}
          max={12}
          step={1}
          value={filters.minSunHours}
          onChange={(value) => set('minSunHours', value)}
        />
      </FilterSection>

      <FilterSection title="Hotel & Ausstattung">
        <CheckboxRow icon="👨‍👩‍👧‍👦" label="Familienhotel" checked={filters.familyOnly} onChange={(v) => set('familyOnly', v)} />
        <CheckboxRow icon="🏊" label="Pool" checked={filters.pool} onChange={(v) => set('pool', v)} />
        <CheckboxRow icon="🛁" label="Whirlpool" checked={filters.whirlpool} onChange={(v) => set('whirlpool', v)} />
        <CheckboxRow icon="💆" label="Spa & Wellness" checked={filters.spa} onChange={(v) => set('spa', v)} />
        <CheckboxRow icon="🅿️" label="Parkplätze" checked={filters.parking} onChange={(v) => set('parking', v)} />
        <CheckboxRow
          icon="🚽"
          label="Papier darf in die Toilette"
          checked={filters.paperInToilet}
          onChange={(v) => set('paperInToilet', v)}
        />
        <CheckboxRow
          icon="🏳️‍🌈"
          label="LGBTQI+-freundlich"
          checked={filters.lgbtqFriendly}
          onChange={(v) => set('lgbtqFriendly', v)}
        />
        <CheckboxRow
          icon="🌱"
          label="Vegan-freundlich"
          checked={filters.veganFriendly}
          onChange={(v) => set('veganFriendly', v)}
        />
      </FilterSection>

      <FilterSection title="Lage & Erlebnis">
        <p className="mb-2 text-xs text-slate-500">
          Wie wichtig ist dir …? („Gut“ = Wertung ≥ 6, „Top“ = Wertung ≥ 8)
        </p>
        {SCORE_KEYS.map((key) => (
          <LevelPicker
            key={key}
            label={SCORE_LABELS[key]}
            value={filters.scoreLevels[key]}
            onChange={(level) => setScoreLevel(key, level)}
          />
        ))}
      </FilterSection>
      </div>

      <FilterSection title="Abflughafen">
        <div className="grid grid-cols-2 gap-x-2">
          {AIRPORTS.map((airport) => (
            <CheckboxRow
              key={airport.code}
              label={`${airport.city}`}
              checked={filters.airports.includes(airport.code)}
              onChange={(checked) =>
                set(
                  'airports',
                  checked
                    ? [...filters.airports, airport.code]
                    : filters.airports.filter((code) => code !== airport.code),
                )
              }
            />
          ))}
        </div>
      </FilterSection>
    </div>
  )
}
