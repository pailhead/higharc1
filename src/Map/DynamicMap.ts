import {
  BackSide,
  Color,
  EqualStencilFunc,
  IncrementStencilOp,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  Scene,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} from 'three'
import { degToRad } from 'three/src/math/MathUtils'
import { Box2VizInstanced } from '~/Box2Viz/Box2VizInstanced'
import { MAX_LEVEL, MAX_TILES, START_LEVEL } from '~/constants'
import { MapTile } from '~/MapTile/MapTile'
import { getTileKey, TextureResources } from '~/MapTile/TextureResources'
import { Cell } from '~/QuadTree/Cell'
import { QuadTree } from '~/QuadTree/Quad'
import { SharedGeometry } from '~/Shared/SharedGeometry'
import { projectRadius } from '~/utils'
import { Viewer, ViewerEvents } from '~/Viewer/Viewer'

const MAX_DEPTH = MAX_LEVEL - START_LEVEL
const INV_255 = 1 / 255
const WORK_INTERSECT_RESULT: Vector3[] = []

for (let i = 0; i < 16; i++) WORK_INTERSECT_RESULT.push(new Vector3())

/**
 * zoom tile manager
 */

export class DynamicMap {
  public readonly boxInstanced = new Box2VizInstanced()

  private _earthTileQuads: QuadTree[]

  private _tiles: MapTile[] = []
  private _tileQueue: MapTile[] = []
  private _updateQueue: Cell[] = []

  private _renderTarget: WebGLRenderTarget | null = null

  private _tileScene = new Scene()
  private _maskScene = new Scene()
  private _maskMesh = new Mesh(
    SharedGeometry.simplePlane,
    new MeshBasicMaterial({
      color: 0x000,
      side: BackSide,
      stencilWrite: true,
      stencilRef: 0,
      stencilFunc: EqualStencilFunc,
      stencilZPass: IncrementStencilOp,
    }),
  )
  private _maskUniform = {
    value: this._renderTarget,
  }
  private _screenSizeUniform = {
    value: new Vector4(),
  }

  constructor(earthTiles: number[][], private _viewer: Viewer) {
    this.boxInstanced.layers.set(2)
    this.boxInstanced.renderOrder = 10

    this._earthTileQuads = earthTiles.map((tile) => new QuadTree(tile))

    for (let i = 0; i < MAX_TILES; i++) {
      this._tiles.push(
        new MapTile(i, this._maskUniform, this._screenSizeUniform),
      )
    }

    this._maskScene.autoUpdate = false
    this._maskScene.add(this._maskMesh)

    _viewer.addEventListener(ViewerEvents.Resize, () =>
      this.setSize(_viewer.size.x, _viewer.size.y),
    )
    this.setSize(_viewer.size.x, _viewer.size.y)
  }

  setSize(width: number, height: number) {
    this._renderTarget?.dispose()
    this._renderTarget = new WebGLRenderTarget(width, height, {
      magFilter: NearestFilter,
      minFilter: NearestFilter,
      stencilBuffer: true,
    })
    this._maskUniform.value = this._renderTarget
    this._screenSizeUniform.value.set(width, height, 1 / width, 1 / height)
  }

  render(maxCells: number, bias: number) {
    const { _viewer } = this
    const { renderer } = _viewer
    const visible = this._getVisibleCells(bias)
    visible.sort(this._sortDistance)
    visible.sort(this._sortLevel)
    if (visible.length > MAX_TILES) visible.splice(MAX_TILES)
    this._updateInstances(visible, maxCells)
    this._updateTiles(visible)

    renderer.setRenderTarget(this._renderTarget)
    renderer.clear()
    this._tileQueue.forEach(this._renderTileMask)

    while (this._tileQueue.length > maxCells) this._tileQueue.shift()

    renderer.setRenderTarget(null)
    while (this._tileQueue.length) this._renderTile(this._tileQueue.shift()!)

    return visible
  }

  private _renderTileMask = (mapTile: MapTile) => {
    const { _viewer, _maskMesh } = this
    const { renderer, camera } = _viewer
    const tile = mapTile.getTile()!

    mapTile.updateMatrixWorld()
    _maskMesh.matrixWorld.copy(mapTile.matrixWorld)
    ;(_maskMesh.material as MeshBasicMaterial).color.r = tile[2] * INV_255
    renderer.render(this._maskScene, camera)
  }

  private _renderTile(mapTile: MapTile) {
    const { _viewer, _tileScene } = this
    const { renderer, camera } = _viewer

    _tileScene.remove(_tileScene.children[0])
    _tileScene.add(mapTile)

    renderer.setRenderTarget(null)
    renderer.render(this._tileScene, camera)
  }

  /**
   * divides the map into ideal cells for zoom level
   * @returns
   */
  private _getVisibleCells(bias: number) {
    const { camera } = this._viewer
    const heightHalf = this._viewer.size.y * 0.5
    const fovInv = 1 / Math.tan(degToRad(camera.fov / 2))
    const visible: Cell[] = []

    const path: Cell[] = []

    const intersect = (cell: Cell) => {
      const { size } = cell
      const tilePixelSize = Math.max(size.z, size.w) * INV_255
      const intersectCount = camera.intersectWorldRect(
        size,
        WORK_INTERSECT_RESULT,
      )

      if (!intersectCount) return

      visible.push(cell)

      if (path.length === MAX_DEPTH) return

      const rpx = this._tapCell(
        intersectCount,
        fovInv,
        heightHalf,
        tilePixelSize,
      )
      if (rpx > bias) {
        visible.pop()
        if (!cell.children) cell.split()
        path.push(cell)
        cell.children!.forEach(intersect)
        path.pop()
      }
    }

    this._earthTileQuads.forEach((tree) => intersect(tree.root))

    return visible
  }

  /**
   * check all the interseection points for pixel size
   */
  private _tapCell(
    intersectCount: number,
    fovInv: number,
    heightHalf: number,
    tilePixelSize: number,
  ) {
    let i = intersectCount
    let rpx = -Infinity
    while (i--) {
      const p = WORK_INTERSECT_RESULT[i]
      const dEye = p.distanceTo(this._viewer.camera.position)
      if (dEye < tilePixelSize) {
        rpx = Infinity
        break
      }
      const rp = projectRadius(tilePixelSize, dEye, fovInv, heightHalf)
      rpx = Math.max(rp, rpx)
    }
    return rpx
  }

  /**
   * sort?
   */
  private _sortDistance = (() => {
    const WORK_VEC3 = new Vector3()
    return (a: Cell, b: Cell) => {
      const { camera } = this._viewer
      WORK_VEC3.set(a.center.x, 0, a.center.y)
      const da = camera.position.distanceTo(WORK_VEC3)
      WORK_VEC3.set(b.center.x, 0, b.center.y)
      const db = camera.position.distanceTo(WORK_VEC3)
      return da - db
    }
  })()

  private _sortLevel = (a: Cell, b: Cell) => {
    return b.level - a.level
  }

  /**
   * update instanced bb rendering
   */
  private _updateInstances = (() => {
    const WORK_COLOR = new Color('#ff0000')
    const WORK_HSL = { h: 0, s: 0, l: 0 }

    return (visible: Cell[], maxCells: number) => {
      visible.forEach((cell, i) => {
        WORK_COLOR.setStyle('#ff0000')
        WORK_COLOR.getHSL(WORK_HSL)
        WORK_HSL.h = cell.level / 12
        WORK_COLOR.setHSL(WORK_HSL.h, WORK_HSL.s, WORK_HSL.l)
        this.boxInstanced.setBoxAt(i, cell.size)
        this.boxInstanced.setColorAt(i, WORK_COLOR)
      })

      this.boxInstanced.setCount(Math.min(maxCells, visible.length))
    }
  })()

  private _updateTiles(visible: Cell[]) {
    const queue = this._updateQueue
    let i = 0
    const visibleMap: Map<Cell, boolean> = new Map()
    const visitedTiles: Record<string, boolean> = {}

    const remaining = visible.map((cell) => {
      visibleMap.set(cell, true)
      return cell
    })

    const p = (cell: Cell) => {
      const key = getTileKey(cell.tile)
      if (visitedTiles[key]) return
      visitedTiles[key] = true
      const { tile } = cell
      const tileTexture = TextureResources.getTexture(tile)

      if (tileTexture && !tileTexture?.pending) {
        const mapTile = this._tiles[i++]
        mapTile.setLevel(tile[2])
        mapTile.setTile(tile)
        mapTile.setTexture(tileTexture.texture!)
        mapTile.setSize(cell.size)
        mapTile.visible = true
        this._tileQueue.push(mapTile)
        return
      }

      if (visibleMap.has(cell) && !tileTexture?.pending)
        TextureResources.createTexture(tile)

      // if (cell.parent) queue.push(cell.parent)
      if (cell.parent) p(cell.parent)
    }

    while (remaining.length) {
      let r = remaining[0]
      const { level } = r

      while (r?.level === level) {
        queue.push(remaining.shift()!)
        r = remaining[0]
      }
      while (queue.length) p(queue.shift()!)
    }

    while (i < this._tiles.length) this._tiles[i++].visible = false
  }
}
