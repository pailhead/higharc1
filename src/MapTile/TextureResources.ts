/* eslint-disable @typescript-eslint/no-explicit-any */
import { TileTexture, TileTextureEvents } from './TileTexture'

const { Loaded, Destroyed, ActiveChanged } = TileTextureEvents

const MAX_SIZE = 256

type TextureEvent = { tileTexture: TileTexture }

export const getTileKey = (tile: number[]) => tile.join(':')

class _TextureResources {
  private _cache: Map<string, TileTexture> = new Map()
  private _pending: Map<TileTexture, boolean> = new Map()
  private _active: Map<TileTexture, boolean> = new Map()
  private _inactive: Map<TileTexture, boolean> = new Map()

  createTexture(tile: number[], fixed = false) {
    const z = tile[2]
    if (z < 2 || z > 14) return null
    const key = getTileKey(tile)
    if (this._cache.has(key)) return this._cache.get(key)!
    if (this._cache.size > MAX_SIZE) this._releaseInactive()
    const texture = new TileTexture(tile, fixed)
    this._cache.set(key, texture)
    this._pending.set(texture, true)
    texture.addEventListener(Loaded, this._onTextureLoad as any)
    texture.addEventListener(Destroyed, this._onTextureDestroy as any)
    texture.addEventListener(ActiveChanged, this._onTextureActiveChange as any)

    return texture
  }

  getTexture(tile: number[]) {
    return this._cache.get(getTileKey(tile)) ?? null
  }

  private _releaseInactive() {
    if (!this._inactive.size) return false
    const first = this._inactive.keys().next().value
    first.destroy()
    this._inactive.delete(first)
    return true
  }
  private _onTextureLoad = ({ tileTexture }: TextureEvent) => {
    this._pending.delete(tileTexture)
  }
  private _onTextureDestroy = ({ tileTexture }: TextureEvent) => {
    this._cache.delete(getTileKey(tileTexture.tile))
    tileTexture.removeEventListener(Destroyed, this._onTextureDestroy as any)
    tileTexture.removeEventListener(Loaded, this._onTextureLoad as any)
    tileTexture.removeEventListener(
      ActiveChanged,
      this._onTextureActiveChange as any,
    )
  }
  private _onTextureActiveChange = (event: any) => {
    const tileTexture = event.tileTexture as TileTexture
    const active = event.active as boolean
    if (active) this._inactive.delete(tileTexture)
    else this._inactive.set(tileTexture, true)
  }
}

export const TextureResources = new _TextureResources()
