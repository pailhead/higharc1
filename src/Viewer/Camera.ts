import {
  BufferAttribute,
  BufferGeometry,
  Line3,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Plane,
  Ray,
  Vector2,
  Vector3,
  Vector4,
} from 'three'
import { degToRad } from 'three/src/math/MathUtils'

const position = [
  ...[0, 0, 0],
  ...[1, 1, 1], //0
  ...[-1, 1, 1],
  ...[-1, -1, 1],
  ...[1, -1, 1],
]
const indices = [
  ...[0, 1, 2],
  ...[0, 2, 3],
  ...[0, 3, 4],
  ...[0, 4, 1],
  ...[1, 2, 3],
  ...[1, 4, 3],
]

const WORK_VEC4 = new Vector4()

/**
 * a camera with some additional entities to help intersection and culling
 * had some trouble with Frustum and Box3
 */

export class Camera extends PerspectiveCamera {
  //for viz
  private _geometry = new BufferGeometry()
  //for intersection
  private _planes = [new Plane(), new Plane(), new Plane(), new Plane()]
  private _sizeHalf = new Vector2()

  public readonly mesh = new Mesh(
    this._geometry,
    new MeshBasicMaterial({ color: 'red', transparent: true, opacity: 0.25 }),
  )

  constructor() {
    super(60, 1, 0.1, 40000)
    this.add(this.mesh)

    this.mesh.layers.set(2)
    this._geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(position), 3),
    )
    this.mesh.frustumCulled = false
    this._geometry.setIndex(new BufferAttribute(new Uint8Array(indices), 1))
  }

  /**
   * update geometry and size
   * @returns
   */
  updateProjectionMatrix() {
    super.updateProjectionMatrix()
    if (!this.mesh) return
    this._updateGeometry()
    const { fov } = this
    const fovr = degToRad(fov / 2)
    const hh = Math.tan(fovr)
    const wh = hh * this.aspect
    this._sizeHalf.set(wh, hh)
  }

  /**
   * set planes based on where camera is at
   */
  update() {
    this.updateMatrixWorld()
    const { x, y } = this._sizeHalf
    this._setPlane(0, 1, 0, x)
    this._setPlane(1, 0, -1, y)
    this._setPlane(2, -1, 0, x)
    this._setPlane(3, 0, 1, y)
  }

  /**
   * intersectCamera with a tile rect
   * @param worldRect
   * @returns true if there is an intersection
   */
  intersectWorldRect = (() => {
    const points = [new Vector3(), new Vector3(), new Vector3(), new Vector3()]
    const edges = [new Line3(), new Line3(), new Line3(), new Line3()]
    const ray = new Ray()
    const groundPlane = new Plane(new Vector3(0, 1, 0), 0)
    const intersectionResult = new Vector3()
    const dirs = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]

    /**
     * check if the points of the rectangle are within the frustum
     */
    const checkPoints = (
      worldRect: Vector4,
      result: Vector3[],
      count: number,
    ) => {
      points[0].set(worldRect.x, 0, worldRect.y)
      points[1].set(worldRect.x + worldRect.z, 0, worldRect.y)
      points[2].set(worldRect.x + worldRect.z, 0, worldRect.y + worldRect.w)
      points[3].set(worldRect.x, 0, worldRect.y + worldRect.w)

      const inside: Record<number, Vector3> = {}

      for (let i = 0; i < points.length; i++) {
        const point = points[i]
        let c = 4
        this._planes.forEach((plane) => {
          const d = plane.distanceToPoint(point)
          if (d < 0) c--
        })
        if (c) continue
        result[count++].copy(point)
        inside[i] = point
      }
      return { count, inside }
    }

    const checkEdges = (
      result: Vector3[],
      count: number,
      inside: Record<number, Vector3>,
    ) => {
      for (let curr = 0; curr < edges.length; curr++) {
        const edge = edges[curr]
        const next = (curr + 1) % 4
        if (inside[curr] && inside[next]) continue
        edge.start.copy(points[curr])
        edge.end.copy(points[next])
        this._planes.forEach((plane, pi) => {
          const intersects = plane.intersectLine(edge, intersectionResult)
          if (!intersects) return
          const p0 = (pi + 1) % 4
          const p1 = (pi + 3) % 4
          const d0 = this._planes[p0].distanceToPoint(intersectionResult)
          const d1 = this._planes[p1].distanceToPoint(intersectionResult)
          if (d0 >= 0 || d1 >= 0) return
          result[count++].copy(intersectionResult)
        })
      }
      return count
    }

    const checkRays = (
      worldRect: Vector4,
      result: Vector3[],
      count: number,
    ) => {
      ray.origin.copy(this.position)
      for (let i = 0; i < dirs.length; i++) {
        const [x, y] = dirs[i]
        WORK_VEC4.set(x * this._sizeHalf.x, y * this._sizeHalf.y, -1, 0)
        WORK_VEC4.applyMatrix4(this.matrixWorld)
        ray.direction.set(WORK_VEC4.x, WORK_VEC4.y, WORK_VEC4.z)
        ray.intersectPlane(groundPlane, intersectionResult)
        if (!isPointInBox(intersectionResult, worldRect)) continue
        result[count++].copy(intersectionResult)
      }
      return count
    }

    const isPointInBox = (p: Vector3, box: Vector4) => {
      const h = p.x >= box.x && p.x < box.x + box.z
      const v = p.z >= box.y && p.z < box.y + box.w
      return h && v
    }

    return (worldRect: Vector4, result: Vector3[]) => {
      let count = 0
      const points = checkPoints(worldRect, result, count)
      count = points.count
      if (count === 4) return count //all within frustum
      count = checkEdges(result, count, points.inside)
      count = checkRays(worldRect, result, count)
      return count
    }
  })()

  private _setPlane(index: number, x: number, y: number, z: number) {
    WORK_VEC4.set(x, y, z, 0)
    WORK_VEC4.applyMatrix4(this.matrixWorld)
    WORK_VEC4.normalize()
    this._planes[index].setFromNormalAndCoplanarPoint(
      WORK_VEC4 as never,
      this.position,
    )
  }

  private _updateGeometry() {
    const { fov } = this
    const fovr = degToRad(fov / 2)
    const hh = Math.tan(fovr)
    const wh = hh * this.aspect

    for (let i = 1; i < 5; i++) {
      const i3 = i * 3
      const x = position[i3] * wh * this.far
      const y = position[i3 + 1] * hh * this.far
      const z = -this.far
      this._geometry.getAttribute('position').setXYZ(i, x, y, z)
    }
    this._geometry.getAttribute('position').needsUpdate = true
  }
}
