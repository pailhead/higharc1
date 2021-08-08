import {
  BackSide,
  Color,
  EqualStencilFunc,
  IncrementStencilOp,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  PlaneBufferGeometry,
  Scene,
  ShaderMaterial,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} from 'three'
import { degToRad } from 'three/src/math/MathUtils'
import { Box2VizInstanced } from '~/Box2Viz/Box2VizInstanced'
import { MAX_LEVEL, MAX_TILES, START_LEVEL } from '~/constants'
import { MapTile } from '~/MapTile/MapTile'
import { TextureResources } from '~/MapTile/TextureResources'
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
      this._tileScene.add(this._tiles[i])
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
    this._tiles.forEach((tile) => tile.getTexture()?.setActive(false))
    const { _viewer } = this
    const { renderer } = _viewer
    const visible = this._getIdealVisibleCells(bias)
    visible.sort(this._sortDistance)
    // this._updateTiles(visible, maxCells)
    this._updateTiles2(visible, maxCells)
    this._updateInstances(visible, maxCells)

    const renderMap: Map<number, MapTile[]> = new Map()
    let maxLevel = 0
    for (let i = 0; i < this._tileQueue.length; i++) {
      const mapTile = this._tiles[i]
      const tile = mapTile.getTile()!
      maxLevel = Math.max(maxLevel, tile[2])
      if (!renderMap.has(tile[2])) renderMap.set(tile[2], [])
      renderMap.get(tile[2])!.push(mapTile)
    }

    renderer.render(this._tileScene, _viewer.camera)
    while (this._tileQueue.length) this._tileQueue.shift()

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

  /**
   * divides the map into ideal cells for zoom level
   * @returns
   */
  private _getIdealVisibleCells(bias: number) {
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
    let rpx = -Infinity
    for (let i = intersectCount - 1; i >= 0; i--) {
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

  private _updateTiles2(visible: Cell[], maxTiles: number) {
    let i = 0
    for (i = 0; i < Math.min(maxTiles, visible.length); i++) {
      this._setupCell(visible[i], i)
    }
    while (i < this._tiles.length) this._tiles[i++].visible = false
  }

  private _setupCell(cell: Cell, tileIndex: number) {
    const { tile } = cell
    const mapTile = this._tiles[tileIndex]

    mapTile.setTile(tile)
    mapTile.setSize(cell.size)
    mapTile.visible = true

    this._tileQueue.push(mapTile)

    const ancestors = cell.getAncestors() ?? []
    ancestors.push(cell)

    const indices: number[] = []
    const textureOffset = mapTile.getTextureOffset().set(0, 0, 1)

    if (!TextureResources.getTexture(tile)) TextureResources.createTexture(tile)

    while (ancestors.length) {
      const c = ancestors.pop()!
      const tileTexture = TextureResources.getTexture(c.tile)
      if (tileTexture && !tileTexture.pending) {
        tileTexture.setActive(true)
        mapTile.setTexture(tileTexture)
        const size = 1 << indices.length
        textureOffset.z = 1 / size

        let d = 0
        while (indices.length) {
          const i = indices.pop()!
          const f = 1 / (1 << ++d)
          textureOffset.x += Cell.DIR[i].x * f
          textureOffset.y += Cell.DIR[i].y * f
        }
        return
      }
      indices.push(c.index)
    }
  }
}
