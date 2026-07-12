import type { Offer, TripParams } from '../types'
import { airportLabel } from '../data/airports'
import { formatBeachDistance, formatFlightHours, formatPrice, ratingWord } from '../lib/format'
import { totalPrice, travellersLabel } from '../lib/trip'
import { Badge, ScoreBar, Stars } from './ui'

export function OfferCard({
  offer,
  trip,
  onSelect,
}: {
  offer: Offer
  trip: TripParams
  onSelect: (offer: Offer) => void
}) {
  return (
    <article className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 transition hover:shadow-lg">
      <div className="flex flex-col sm:flex-row">
        {/* Bild-Platzhalter mit Reiseziel-Symbol */}
        <div
          className={`relative flex h-40 shrink-0 items-center justify-center bg-gradient-to-br sm:h-auto sm:w-52 ${offer.gradient}`}
        >
          <span className="text-6xl drop-shadow-lg transition group-hover:scale-110" aria-hidden="true">
            {offer.emoji}
          </span>
          <span className="absolute bottom-2 left-2 rounded-full bg-black/35 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            ☀️ {offer.sunHoursPerDay} Std. Sonne/Tag
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-sky-700 uppercase">{offer.region}</p>
              <h3 className="text-lg font-bold text-slate-900">{offer.name}</h3>
              <p className="text-sm text-slate-500">
                {offer.destination} · <Stars count={offer.hotelStars} />
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end">
              <span className="rounded-lg rounded-br-none bg-sky-700 px-2.5 py-1.5 text-sm font-bold text-white">
                {offer.rating.toLocaleString('de-DE', { minimumFractionDigits: 1 })}
              </span>
              <span className="mt-1 text-xs font-medium text-slate-600">{ratingWord(offer.rating)}</span>
              <span className="text-xs text-slate-400">
                {offer.reviewCount.toLocaleString('de-DE')} Bewertungen
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge tone="sky">🏖️ {formatBeachDistance(offer.beachDistanceM)}</Badge>
            <Badge tone="sky">✈️ {formatFlightHours(offer.flightHours)}</Badge>
            {offer.familyHotel && <Badge tone="green">👨‍👩‍👧‍👦 Familienhotel</Badge>}
            {offer.amenities.pool && <Badge>🏊 Pool</Badge>}
            {offer.amenities.whirlpool && <Badge>🛁 Whirlpool</Badge>}
            {offer.amenities.spa && <Badge>💆 Spa</Badge>}
            {offer.amenities.parking && <Badge>🅿️ Parkplätze</Badge>}
            <Badge tone={offer.paperInToilet ? 'green' : 'amber'}>
              🚽 {offer.paperInToilet ? 'Papier in Toilette OK' : 'Papier in den Eimer'}
            </Badge>
          </div>

          <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <ScoreBar label="Unterhaltung" value={offer.scores.entertainment} />
            <ScoreBar label="Essensqualität" value={offer.scores.food} />
            <ScoreBar label="Ausflüge" value={offer.scores.excursions} />
            <ScoreBar label="Erholung" value={offer.scores.relaxation} />
          </div>

          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="text-xs text-slate-500">
              <p>
                {offer.board}
                {offer.departureAirports.length > 0 && (
                  <>
                    {' '}
                    · ab{' '}
                    {offer.departureAirports.slice(0, 3).map(airportLabel).join(', ')}
                    {offer.departureAirports.length > 3 && ` +${offer.departureAirports.length - 3} weitere`}
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-400">p. P. ab</p>
                <p className="text-2xl font-extrabold text-slate-900">{formatPrice(offer.pricePerPerson)}</p>
                <p className="text-xs text-slate-500">
                  gesamt ab {formatPrice(totalPrice(offer, trip))}
                  <span className="text-slate-400">
                    {' '}
                    · {travellersLabel(trip)} · {trip.nights} Nächte
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(offer)}
                className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-sky-700"
              >
                Zum Angebot
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
