import type { Offer } from '../types'

/**
 * Hotel-/Reisezielfotos werden von Wikimedia Commons geladen (frei
 * lizenziert, hotlink-erlaubt). Special:FilePath liefert eine auf die
 * gewünschte Breite skalierte Version und ist über den Dateinamen stabil.
 */

export function photoUrl(offer: Offer, width = 900): string | null {
  if (!offer.photoFile) return null
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(offer.photoFile)}?width=${width}`
}

/** Beschreibungsseite des Fotos (Quelle/Lizenz) auf Wikimedia Commons. */
export function photoPageUrl(offer: Offer): string | null {
  if (!offer.photoFile) return null
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(offer.photoFile)}`
}
