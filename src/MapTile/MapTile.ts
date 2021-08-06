import { Mesh, Texture, Vector4, WebGLRenderTarget } from 'three'
import { TEXTURE_SIZE } from '../constants'
import { SharedGeometry } from '../Shared/SharedGeometry'
import { MapTileMaterial } from './MapTileMaterial'

export class MapTile extends Mesh {
  private _material: MapTileMaterial

  constructor(
    tileIndex: number,
    maskUniform: { value: WebGLRenderTarget | null },
    screenSizeUniform: { value: Vector4 },
  ) {
    super(
      SharedGeometry.tilePlane,
      new MapTileMaterial(maskUniform, screenSizeUniform),
    )
    this._material = this.material as MapTileMaterial
    this.frustumCulled = false
    this.userData.tileIndex = tileIndex
  }

  get tileIndex() {
    return this.userData.tileIndex as number
  }

  setTile(tile: number[]) {
    this.userData.tile = tile
  }
  getTile(): number[] | null {
    return this.userData.tile ?? null
  }
  setSize(size: Vector4) {
    this.position.set(size.x, 0, size.y)
    this.scale.set(size.z, 1, size.w)
  }
  setTexture(texture: Texture) {
    this._material.setTexture(texture)
  }
  setLevel(level: number) {
    this._material.setLevel(level)
  }
}

export const getHeightRange = (pixels: Uint8Array) => {
  let min = Infinity
  let max = -Infinity
  const rFactor = 256 * 256
  const gFactor = 256

  for (let r = 0; r < TEXTURE_SIZE; r++) {
    for (let c = 0; c < TEXTURE_SIZE; c++) {
      let pi = r * TEXTURE_SIZE + c
      pi *= 4
      const x = pixels[pi]
      const y = pixels[pi + 1]
      const z = pixels[pi + 2]
      const height = -10000 + (x * rFactor + y * gFactor + z) * 0.1
      min = Math.min(min, height)
      max = Math.max(max, height)
    }
  }
  return { min, max }
}
