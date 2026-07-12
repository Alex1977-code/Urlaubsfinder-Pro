import { useState, type ReactNode } from 'react'
import type { Offer } from '../types'
import { photoUrl } from '../lib/images'

/**
 * Foto des Hotels/Reiseziels mit Fallback: Lädt das Bild nicht (oder ist
 * keines hinterlegt), erscheint der bisherige Farbverlauf mit Symbol.
 */
export function OfferPhoto({
  offer,
  className,
  children,
}: {
  offer: Offer
  className?: string
  children?: ReactNode
}) {
  const [failed, setFailed] = useState(false)
  const url = photoUrl(offer)
  const showPhoto = url !== null && !failed

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${offer.gradient} ${className ?? ''}`}
    >
      {showPhoto ? (
        <img
          src={url}
          alt={`${offer.name}, ${offer.destination}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <span className="text-6xl drop-shadow-lg" aria-hidden="true">
          {offer.emoji}
        </span>
      )}
      {children}
    </div>
  )
}
