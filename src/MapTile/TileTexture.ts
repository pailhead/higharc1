import { EventDispatcher, Texture } from 'three'
import { ITileResult, MapboxClient } from '../Api/MapboxClient'

export enum TileTextureEvents {
  Loaded = 'LOADED',
  Destroyed = 'DESTROYED',
  ActiveChanged = 'ACTIVE_CHANGED',
}
const { Loaded, Destroyed, ActiveChanged } = TileTextureEvents

export class TileTexture extends EventDispatcher {
  private _pending = true
  private _destroyed = false
  private _active = false
  private _texture: Texture | null = null
  private _promise: Promise<Texture | null>

  constructor(public tile: number[], public readonly fixed = false) {
    super()
    this._promise = this._load()
  }

  get pending() {
    return this._pending
  }
  get destroyed() {
    return this._destroyed
  }
  get active() {
    return this._active
  }
  get texture() {
    return this._texture
  }

  get() {
    return this._promise
  }

  setActive(active: boolean) {
    if (this._pending) return
    if (active === this._active) return
    if (this._active && this.fixed) return
    this._active = active
    this.dispatchEvent({ type: ActiveChanged, tileTexture: this, active })
  }

  destroy() {
    if (this.fixed) return
    this._texture?.dispose()
    this._texture = null
    this._destroyed = true
    this.dispatchEvent({ type: Destroyed, tileTexture: this })
  }

  private _load() {
    return MapboxClient.fetchData(this.tile).then((result) => {
      this._pending = false
      this._texture = result?.texture ?? null
      this.dispatchEvent({
        type: Loaded,
        tileTexture: this,
        error: Boolean(result),
      })
      if (this._destroyed) return null
      return this._texture
    })
  }
}
