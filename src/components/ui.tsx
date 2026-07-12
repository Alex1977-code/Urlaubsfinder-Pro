import type { ReactNode } from 'react'
import type { ScoreLevel } from '../types'

export function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  // Trennlinie ÜBER der Überschrift und enger Abstand zum Regler darunter,
  // damit Überschrift und zugehörige Bedienelemente klar zusammengehören.
  return (
    <section className="mt-4 border-t border-slate-200 pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-[11px] font-bold tracking-[0.08em] text-sky-900/60 uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function CheckboxRow({
  label,
  checked,
  onChange,
  icon,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  icon?: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-slate-300 accent-sky-600"
      />
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{label}</span>
    </label>
  )
}

const LEVEL_OPTIONS: { value: ScoreLevel; label: string }[] = [
  { value: 'any', label: 'Egal' },
  { value: 'good', label: 'Gut' },
  { value: 'excellent', label: 'Top' },
]

/** Dreistufige Anspruchs-Auswahl (Egal / Gut ≥6 / Top ≥8) für ein Kriterium. */
export function LevelPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: ScoreLevel
  onChange: (level: ScoreLevel) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-slate-700">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white text-xs"
      >
        {LEVEL_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`px-2.5 py-1.5 font-medium transition ${
              value === option.value
                ? 'bg-sky-600 text-white'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SliderRow({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  valueLabel: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm text-slate-700">{label}</span>
        <span className="text-sm font-semibold text-sky-700">{valueLabel}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'sky' | 'amber' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-800',
    sky: 'bg-sky-100 text-sky-800',
    amber: 'bg-amber-100 text-amber-800',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 shrink-0 text-slate-500">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400"
          style={{ width: `${value * 10}%` }}
        />
      </div>
      <span className="w-6 text-right font-medium text-slate-700">{value}</span>
    </div>
  )
}

export function Stars({ count }: { count: number }) {
  return (
    <span className="text-amber-400" aria-label={`${count} Sterne`}>
      {'★'.repeat(count)}
      <span className="text-slate-300">{'★'.repeat(5 - count)}</span>
    </span>
  )
}
