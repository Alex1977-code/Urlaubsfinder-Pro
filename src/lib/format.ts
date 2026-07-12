const euro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export function formatPrice(value: number): string {
  return euro.format(value)
}

export function formatFlightHours(hours: number): string {
  if (hours === 0) return 'Ohne Flug erreichbar'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return m > 0 ? `ca. ${h} Std. ${m} Min. Flug` : `ca. ${h} Std. Flug`
}

export function formatBeachDistance(meters: number | null): string {
  if (meters === null) return 'Kein Strand'
  if (meters === 0) return 'Direkt am Strand'
  if (meters < 1000) return `${meters} m zum Strand`
  return `${(meters / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} km zum Strand`
}

export function ratingWord(rating: number): string {
  if (rating >= 9) return 'Ausgezeichnet'
  if (rating >= 8.5) return 'Hervorragend'
  if (rating >= 8) return 'Sehr gut'
  if (rating >= 7) return 'Gut'
  return 'Solide'
}
