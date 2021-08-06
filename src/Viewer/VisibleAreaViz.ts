import {
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Camera,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Plane,
  Scene,
  Vector3,
  WebGLRenderer,
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
  ...[0, 2, 1],
  ...[0, 3, 2],
  ...[0, 4, 3],
  ...[0, 1, 4],
  ...[1, 2, 3],
  ...[1, 3, 4],
]

export class VisibleAreaViz extends Mesh {
  private _scene = new Scene()
  private _maskMesh: Mesh

  constructor() {
    super(
      new BufferGeometry(),
      new MeshBasicMaterial({
        color: '#ff0000',
        side: BackSide,
        clippingPlanes: [new Plane(new Vector3(0, -1, 0), 0)],
        opacity: 0.25,
        transparent: true,
      }),
    )
    const { geometry } = this
    geometry.setAttribute(
      'position',
      new BufferAttribute(new Float32Array(position), 3),
    )
    geometry.setIndex(new BufferAttribute(new Uint8Array(indices), 1)),
      (this.frustumCulled = false)
    this.layers.set(2)
    this._maskMesh = new Mesh(
      this.geometry,
      new MeshBasicMaterial({
        colorWrite: false,
        clippingPlanes: [new Plane(new Vector3(0, -1, 0), 0)],
      }),
    )
    this._maskMesh.layers.set(2)
    this._scene.autoUpdate = false
    this._scene.add(this._maskMesh)
  }

  onBeforeRender = (renderer: WebGLRenderer, scene: Scene, camera: Camera) => {
    this._maskMesh.matrixWorld.copy(this.matrixWorld)
    renderer.render(this._scene, camera)
  }
  update(camera: PerspectiveCamera) {
    const { fov } = camera
    const fovr = degToRad(fov / 2)
    const hh = Math.tan(fovr)
    const wh = hh * camera.aspect
    this.scale.set(wh, hh, 1).multiplyScalar(camera.far)
  }
}
