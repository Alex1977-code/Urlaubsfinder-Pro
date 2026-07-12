import { useEffect, useRef } from 'react'
import type { Offer, TravelType, TripParams } from '../types'
import { airportLabel } from '../data/airports'
import { SCORE_KEYS, SCORE_LABELS } from '../lib/filter'
import { photoPageUrl } from '../lib/images'
import { bookingUrl, flightsUrl, mapsUrl } from '../lib/links'
import { OfferPhoto } from './OfferPhoto'
import { formatBeachDistance, formatFlightHours, formatPrice, ratingWord } from '../lib/format'
import { priceBreakdown, tripSummary } from '../lib/trip'
import { Badge, ScoreBar, Stars } from './ui'

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  )
}

export function OfferDetailDialog({
  offer,
  trip,
  travelType,
  preferredAirport,
  onClose,
}: {
  offer: Offer | null
  trip: TripParams
  travelType: TravelType | 'all'
  preferredAirport?: string
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (offer && !dialog.open) dialog.showModal()
    if (!offer && dialog.open) dialog.close()
  }, [offer])

  const flights = offer ? flightsUrl(offer, preferredAirport, trip) : null

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Klick auf den Hintergrund (das <dialog>-Element selbst) schließt
        if (e.target === ref.current) onClose()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl p-0 shadow-2xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm"
      aria-label={offer ? `Details zu ${offer.name}` : undefined}
    >
      {offer && (
        <div className="max-h-[85vh] overflow-y-auto">
          <OfferPhoto offer={offer} className="h-44">
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition hover:bg-black/50"
            >
              ✕
            </button>
          </OfferPhoto>

          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-wide text-sky-700 uppercase">{offer.region}</p>
                <h2 className="text-xl font-bold text-slate-900">{offer.name}</h2>
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

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Fact label="Strand" value={formatBeachDistance(offer.beachDistanceM)} />
              <Fact label="Flugzeit" value={formatFlightHours(offer.flightHours)} />
              <Fact label="Sonne" value={`${offer.sunHoursPerDay} Std./Tag`} />
              <Fact label="Verpflegung" value={offer.board} />
              <Fact label="WC-Regel" value={offer.paperInToilet ? 'Papier in Toilette OK' : 'Papier in den Eimer'} />
              <Fact label="Hotel p. P./Woche" value={`ab ${formatPrice(offer.hotelPricePerPerson)}`} />
              <Fact
                label={offer.livePrice ? 'Flug p. P. (live)' : 'Flug p. P.'}
                value={
                  offer.flightPricePerPerson !== null
                    ? `ab ${formatPrice(offer.flightPricePerPerson)}`
                    : 'Ohne Flug'
                }
              />
            </dl>

            {(() => {
              const breakdown = priceBreakdown(offer, trip, travelType)
              return (
                <div className="rounded-lg bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">Gesamt ab {formatPrice(breakdown.total)}</span>
                    <span className="text-xs text-sky-700">
                      {tripSummary(trip, travelType !== 'hotel' && offer.destinationAirport !== null)}
                    </span>
                  </div>
                  <dl className="mt-1.5 space-y-0.5 border-t border-sky-100 pt-1.5 text-xs text-sky-800">
                    {breakdown.hotel > 0 && (
                      <div className="flex justify-between">
                        <dt>
                          🏨 Hotel ({trip.nights} Nächte, {trip.rooms.length}{' '}
                          {trip.rooms.length === 1 ? 'Zimmer' : 'Zimmer'})
                        </dt>
                        <dd className="font-medium">{formatPrice(breakdown.hotel)}</dd>
                      </div>
                    )}
                    {breakdown.flight > 0 && (
                      <div className="flex justify-between">
                        <dt>✈️ Flug (hin & zurück{offer.livePrice ? ', live' : ''})</dt>
                        <dd className="font-medium">{formatPrice(breakdown.flight)}</dd>
                      </div>
                    )}
                    {breakdown.baggage > 0 && (
                      <div className="flex justify-between">
                        <dt>🧳 Aufgabegepäck</dt>
                        <dd className="font-medium">{formatPrice(breakdown.baggage)}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )
            })()}

            <div className="flex flex-wrap gap-1.5">
              {offer.familyHotel && <Badge tone="green">👨‍👩‍👧‍👦 Familienhotel</Badge>}
              {offer.amenities.pool && <Badge>🏊 Pool</Badge>}
              {offer.amenities.whirlpool && <Badge>🛁 Whirlpool</Badge>}
              {offer.amenities.spa && <Badge>💆 Spa</Badge>}
              {offer.amenities.parking && <Badge>🅿️ Parkplätze</Badge>}
            </div>

            <div>
              <h3 className="mb-2 text-[11px] font-bold tracking-[0.08em] text-sky-900/60 uppercase">
                Lage & Erlebnis
              </h3>
              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {SCORE_KEYS.map((key) => (
                  <ScoreBar key={key} label={SCORE_LABELS[key]} value={offer.scores[key]} />
                ))}
              </div>
            </div>

            {offer.departureAirports.length > 0 && (
              <p className="text-xs text-slate-500">
                Abflug möglich ab: {offer.departureAirports.map(airportLabel).join(', ')}
              </p>
            )}

            <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
              <a
                href={bookingUrl(offer, trip)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-sky-600 px-5 py-3 text-center text-sm font-semibold text-white shadow transition hover:bg-sky-700"
              >
                🏨 Aktuelle Hotelpreise auf Booking.com
              </a>
              {flights && (
                <a
                  href={flights}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-sky-600 px-5 py-3 text-center text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
                >
                  ✈️ Flüge suchen (Google Flights)
                </a>
              )}
              <a
                href={mapsUrl(offer)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                📍 Lage auf Google Maps
              </a>
              <p className="text-center text-[11px] text-slate-400">
                Links öffnen echte, tagesaktuelle Angebote in einem neuen Tab. Die Preise in dieser
                Übersicht sind Richtwerte.
                {photoPageUrl(offer) && (
                  <>
                    {' '}
                    Foto:{' '}
                    <a
                      href={photoPageUrl(offer)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-slate-600"
                    >
                      Wikimedia Commons
                    </a>
                    .
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </dialog>
  )
}
