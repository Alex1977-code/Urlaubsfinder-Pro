export interface Airport {
  code: string
  city: string
}

/** Deutsche Abflughäfen, die in der App wählbar sind. */
export const AIRPORTS: Airport[] = [
  { code: 'FRA', city: 'Frankfurt' },
  { code: 'MUC', city: 'München' },
  { code: 'DUS', city: 'Düsseldorf' },
  { code: 'BER', city: 'Berlin' },
  { code: 'HAM', city: 'Hamburg' },
  { code: 'STR', city: 'Stuttgart' },
  { code: 'CGN', city: 'Köln/Bonn' },
  { code: 'HAJ', city: 'Hannover' },
  { code: 'NUE', city: 'Nürnberg' },
  { code: 'LEJ', city: 'Leipzig/Halle' },
]

export function airportLabel(code: string): string {
  const airport = AIRPORTS.find((a) => a.code === code)
  return airport ? `${airport.city} (${airport.code})` : code
}
