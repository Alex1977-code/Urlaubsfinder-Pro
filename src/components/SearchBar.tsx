import { useState } from 'react'
import type { Flexibility, RoomOccupancy, TravelType, TripParams } from '../types'
import { FLEX_LABELS, NIGHT_OPTIONS, travellersLabel } from '../lib/trip'

const TRAVEL_TYPES: { value: TravelType | 'all'; label: string; icon: string }[] = [
  { value: 'package', label: 'Pauschalreise', icon: '🧳' },
  { value: 'hotel', label: 'Nur Hotel', icon: '🏨' },
  { value: 'flight', label: 'Nur Flug', icon: '✈️' },
  { value: 'all', label: 'Alles', icon: '🌍' },
]

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`${label} verringern`}
          className="flex size-8 items-center justify-center rounded-full border border-slate-300 text-lg text-slate-600 transition hover:border-sky-500 hover:text-sky-600 disabled:opacity-30"
        >
          −
        </button>
        <span className="w-5 text-center text-sm font-semibold text-slate-900">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`${label} erhöhen`}
          className="flex size-8 items-center justify-center rounded-full border border-slate-300 text-lg text-slate-600 transition hover:border-sky-500 hover:text-sky-600 disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  )
}

function RoomEditor({
  room,
  index,
  showTitle,
  onChange,
}: {
  room: RoomOccupancy
  index: number
  showTitle: boolean
  onChange: (room: RoomOccupancy) => void
}) {
  const setChildCount = (count: number) => {
    const childAges = [...room.childAges]
    while (childAges.length < count) childAges.push(7)
    onChange({ ...room, childAges: childAges.slice(0, count) })
  }

  return (
    <div className={showTitle ? 'mt-3 border-t border-slate-100 pt-3' : ''}>
      {showTitle && (
        <p className="mb-1.5 text-xs font-bold tracking-wide text-sky-900/60 uppercase">
          Zimmer {index + 1}
        </p>
      )}
      <Stepper
        label="Erwachsene"
        value={room.adults}
        min={1}
        max={4}
        onChange={(adults) => onChange({ ...room, adults })}
      />
      <div className="mt-2">
        <Stepper
          label="Kinder (0–17 J.)"
          value={room.childAges.length}
          min={0}
          max={3}
          onChange={setChildCount}
        />
      </div>
      {room.childAges.map((age, childIndex) => (
        <label
          key={childIndex}
          className="mt-2 flex items-center justify-between gap-3 text-sm text-slate-600"
        >
          Alter Kind {childIndex + 1}
          <select
            value={age}
            onChange={(e) => {
              const childAges = [...room.childAges]
              childAges[childIndex] = Number(e.target.value)
              onChange({ ...room, childAges })
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
          >
            {Array.from({ length: 18 }, (_, i) => (
              <option key={i} value={i}>
                {i} {i === 1 ? 'Jahr' : 'Jahre'}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}

function TravellerPicker({
  trip,
  onChange,
}: {
  trip: TripParams
  onChange: (trip: TripParams) => void
}) {
  const [open, setOpen] = useState(false)

  const setRoomCount = (count: number) => {
    const rooms = [...trip.rooms]
    while (rooms.length < count) rooms.push({ adults: 2, childAges: [] })
    onChange({ ...trip, rooms: rooms.slice(0, count) })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      >
        👤 {travellersLabel(trip)}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Zimmer und Reisende auswählen"
          className="absolute z-20 mt-2 max-h-[70vh] w-72 max-w-[calc(100vw-3rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
        >
          <Stepper label="Zimmer" value={trip.rooms.length} min={1} max={4} onChange={setRoomCount} />
          {trip.rooms.map((room, index) => (
            <RoomEditor
              key={index}
              room={room}
              index={index}
              showTitle={trip.rooms.length > 1}
              onChange={(updated) => {
                const rooms = [...trip.rooms]
                rooms[index] = updated
                onChange({ ...trip, rooms })
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-4 w-full rounded-lg bg-sky-600 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            Fertig
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Reisedaten-Eingaben (Datum, Flexibilität, Dauer, Zimmer/Reisende, Gepäck) –
 * identisch in der Katalog-Suche und der weltweiten Live-Suche.
 */
export function TripControls({
  trip,
  onTripChange,
  showBaggage,
}: {
  trip: TripParams
  onTripChange: (trip: TripParams) => void
  showBaggage: boolean
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Reisedatum (optional)
          <input
            type="date"
            value={trip.departureDate ?? ''}
            onChange={(e) => onTripChange({ ...trip, departureDate: e.target.value || null })}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Ungefähr
          <select
            value={trip.flexibility}
            onChange={(e) => onTripChange({ ...trip, flexibility: e.target.value as Flexibility })}
            disabled={!trip.departureDate}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
          >
            {(Object.keys(FLEX_LABELS) as Flexibility[]).map((flex) => (
              <option key={flex} value={flex}>
                {FLEX_LABELS[flex]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Dauer
          <select
            value={trip.nights}
            onChange={(e) => onTripChange({ ...trip, nights: Number(e.target.value) })}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
          >
            {NIGHT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Zimmer & Reisende
          <TravellerPicker trip={trip} onChange={onTripChange} />
        </div>
      </div>

      {showBaggage && (
        <div
          role="radiogroup"
          aria-label="Gepäck"
          className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500"
        >
          <span className="mr-1">Gepäck:</span>
          <button
            type="button"
            role="radio"
            aria-checked={trip.baggage}
            onClick={() => onTripChange({ ...trip, baggage: true })}
            className={`rounded-full px-3 py-1.5 transition ${
              trip.baggage ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🧳 mit Aufgabegepäck
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!trip.baggage}
            onClick={() => onTripChange({ ...trip, baggage: false })}
            className={`rounded-full px-3 py-1.5 transition ${
              !trip.baggage ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🎒 nur Handgepäck
          </button>
        </div>
      )}
    </>
  )
}

export function SearchBar({
  travelType,
  onTravelTypeChange,
  query,
  onQueryChange,
  trip,
  onTripChange,
  onSearch,
}: {
  travelType: TravelType | 'all'
  onTravelTypeChange: (type: TravelType | 'all') => void
  query: string
  onQueryChange: (query: string) => void
  trip: TripParams
  onTripChange: (trip: TripParams) => void
  onSearch: () => void
}) {
  const showBaggage = travelType !== 'hotel'

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

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          onSearch()
        }}
      >
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
              placeholder="Reiseziel oder Hotel (optional) – z. B. Mallorca"
              aria-label="Reiseziel oder Hotelname (optional)"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-4 pl-10 text-sm outline-none focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/30 transition hover:from-sky-700 hover:to-cyan-600"
          >
            Suchen
          </button>
        </div>

        <TripControls trip={trip} onTripChange={onTripChange} showBaggage={showBaggage} />
      </form>
    </div>
  )
}
