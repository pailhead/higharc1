import { getChildren, tileToBBOX } from '@mapbox/tilebelt'
import { Vector3, Vector4 } from 'three'
import { degToRad } from 'three/src/math/MathUtils'

import { EARTH_R_KM, START_LEVEL } from '~/constants'

/**
 * convert lon lat to three's space in kilometers
 * @param lon
 * @param lat
 * @returns
 */
export const lonLatToKM = (lon: number, lat: number) => {
  return new Vector3(
    degToRad(lat) * EARTH_R_KM,
    0,
    degToRad(lon) * EARTH_R_KM, //
  )
}

/**
 * gather some "sane" earth tiles - with aspect ratios closer to 1
 * the bottom ones are removed since they don't seem to contain anything
 * top ones are labeled static because they are very thin
 * center ones will be divided
 *
 * @returns two collections, of divisible and static tiles
 */
export const getSaneEarth = () => {
  const getLevel = (level: number) => {
    const root = [0, 0, 0]

    const queue = [root]
    const res: number[][] = []
    const search = (tile: number[]) => {
      if (tile[2] > level) return
      if (tile[2] === level) res.push(tile)

      getChildren(tile).forEach((child) => {
        queue.push(child)
      })
    }
    while (queue.length) {
      let count = queue.length
      while (count--) search(queue.shift()!)
    }
    return res
  }

  const divisibleEarthTiles: number[][] = []
  const staticEarthTiles: number[][] = []
  getLevel(START_LEVEL).forEach((tile) => {
    const bbox = tileToBBOX(tile)
    const min = lonLatToKM(bbox[0], bbox[1])
    const max = lonLatToKM(bbox[2], bbox[3])
    const size = new Vector3().subVectors(max, min)
    const aspect = size.z / size.x
    if (aspect < 2) {
      divisibleEarthTiles.push(tile)
    } else if (min.x > 0) {
      staticEarthTiles.push(tile)
    }
  })
  return { divisibleEarthTiles, staticEarthTiles }
}

/**
 * measure the gathered root tiles
 * @param earth
 * @returns size of visible tiles in kilometers
 */
export const getEarthBB = (earth: {
  divisibleEarthTiles: number[][]
  staticEarthTiles: number[][]
}) => {
  let minx = Infinity
  let miny = Infinity
  let maxx = -Infinity
  let maxy = -Infinity
  const check = (tile: number[]) => {
    const bbox = tileToBBOX(tile)
    minx = Math.min(bbox[1], minx)
    miny = Math.min(bbox[0], miny)
    maxx = Math.max(bbox[3], maxx)
    maxy = Math.max(bbox[2], maxy)
  }
  earth.divisibleEarthTiles.forEach(check)
  earth.staticEarthTiles.forEach(check)
  return new Vector4(minx, miny, maxx, maxy)
}

export const projectRadius = (
  radius: number,
  dEye: number,
  fovInv: number,
  heightHalf: number,
) => {
  const r = radius
  const l = Math.sqrt(dEye * dEye - r * r)
  const projected = (fovInv * r) / l
  return projected * heightHalf
}
