import { describe, expect, it } from 'vitest'
import { photoPageUrl, photoUrl } from './images'
import { OFFERS } from '../data/offers'

const withPhoto = { ...OFFERS[0], photoFile: 'Playa de Muro (Café del Sol).jpg' }
const withoutPhoto = { ...OFFERS[0], photoFile: null }

describe('photoUrl', () => {
  it('baut eine skalierte Special:FilePath-URL mit kodiertem Dateinamen', () => {
    const url = photoUrl(withPhoto)
    expect(url).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/Playa%20de%20Muro%20(Caf%C3%A9%20del%20Sol).jpg?width=900',
    )
  })

  it('liefert null ohne hinterlegtes Foto', () => {
    expect(photoUrl(withoutPhoto)).toBeNull()
    expect(photoPageUrl(withoutPhoto)).toBeNull()
  })
})

describe('photoPageUrl', () => {
  it('verlinkt die Beschreibungsseite auf Commons', () => {
    expect(photoPageUrl(withPhoto)).toContain('commons.wikimedia.org/wiki/File:')
  })
})
