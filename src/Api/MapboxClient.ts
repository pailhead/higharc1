import {
  DataTexture,
  NearestFilter,
  RGBAFormat,
  Texture,
  UnsignedByteType,
} from 'three'

import { MAPBOX_API, MAPBOX_KEY, MAX_LEVEL } from '~/constants'

export interface ITileResult {
  texture: Texture
  tile: number[]
}
export interface ITileSize {
  heightKM: number
  bottomWidthKM: number
  topWidthKM: number
}

export const NULL_TEXTURE = new DataTexture(
  new Uint8Array([1, 134, 150, 0]),
  1,
  1,
  RGBAFormat,
  UnsignedByteType,
)

class _MapboxClient {
  fetchData(tile: number[]) {
    const params = `access_token=${MAPBOX_KEY}`
    const [x, y, z] = tile
    // const url = `${MAPBOX_API}/${z}/${x}/${y}@2x.pngraw?${params}`
    const url = `${MAPBOX_API}/${z}/${x}/${y}.pngraw?${params}`

    if (z > MAX_LEVEL)
      return new Promise<ITileResult | null>((res) => res(null))

    return fetch(url)
      .then((response) => {
        if (response.status === 200) return response.blob()
        if (response.status === 404) return null
        throw new Error('Failed to load image')
      })
      .then((data) => {
        if (!data) return { tile, texture: NULL_TEXTURE }
        const img = new Image()
        const imageBlob = new Blob([data], { type: 'image/png' })
        const texture = new Texture(img)
        texture.minFilter = NearestFilter
        texture.magFilter = NearestFilter
        let res: (r: ITileResult) => void

        const promise = new Promise<ITileResult>((_res) => {
          res = _res
        })
        img.onload = () => {
          texture.needsUpdate = true
          res({ tile, texture })
        }
        img.src = URL.createObjectURL(imageBlob)
        return promise
      })
  }
}

export const MapboxClient = new _MapboxClient()
