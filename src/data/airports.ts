export interface Airport {
  code: string
  city: string
  lat: number
  lon: number
}

/** Deutsche Abflughäfen, die in der App wählbar sind. */
export const AIRPORTS: Airport[] = [
  { code: 'FRA', city: 'Frankfurt', lat: 50.038, lon: 8.562 },
  { code: 'MUC', city: 'München', lat: 48.354, lon: 11.786 },
  { code: 'DUS', city: 'Düsseldorf', lat: 51.289, lon: 6.767 },
  { code: 'BER', city: 'Berlin', lat: 52.362, lon: 13.501 },
  { code: 'HAM', city: 'Hamburg', lat: 53.63, lon: 9.988 },
  { code: 'STR', city: 'Stuttgart', lat: 48.69, lon: 9.222 },
  { code: 'CGN', city: 'Köln/Bonn', lat: 50.866, lon: 7.143 },
  { code: 'HAJ', city: 'Hannover', lat: 52.461, lon: 9.685 },
  { code: 'NUE', city: 'Nürnberg', lat: 49.499, lon: 11.078 },
  { code: 'LEJ', city: 'Leipzig/Halle', lat: 51.424, lon: 12.236 },
]

export function airportLabel(code: string): string {
  const airport = AIRPORTS.find((a) => a.code === code)
  return airport ? `${airport.city} (${airport.code})` : code
}
