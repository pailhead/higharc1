import {
  Vector3,
  OrthographicCamera,
  WebGLRenderer,
  Scene,
  Vector2,
  Vector4,
} from 'three'

import { lonLatToKM } from '~/utils'

const WORK_VEC = new Vector2()

/**
 * draw a scissored area with some helpers, scene objects with layer flag set to 2 will render
 */
export class MapViz {
  private _camera: OrthographicCamera
  private _aspect: number

  constructor(earthSize: Vector4, private _renderer: WebGLRenderer) {
    const min = lonLatToKM(earthSize.x, earthSize.y)
    const max = lonLatToKM(earthSize.z, earthSize.w)
    const size = new Vector3().subVectors(max, min)
    this._aspect = size.x / size.z

    const camera = new OrthographicCamera(
      -size.x * 0.5,
      size.x * 0.5,
      size.z * 0.5,
      -size.z * 0.5,
      1,
      50000,
    )
    camera.position.x = (min.z + max.z) * 0.5
    camera.position.y = 100
    camera.rotation.x = -Math.PI / 2
    camera.rotation.z = -Math.PI / 2
    camera.layers.set(2)
    this._camera = camera
  }

  render(scene: Scene) {
    const size = this._renderer.getSize(WORK_VEC)
    const width = 600
    const height = width / this._aspect
    this._renderer.setScissor(0, size.y - height, width, height)
    this._renderer.setScissorTest(true)
    this._renderer.setViewport(0, size.y - height, width, height)
    this._renderer.setClearColor('#000', 1)

    this._renderer.clear()
    this._camera.layers.set(2)
    this._renderer.render(scene, this._camera)
    this._camera.layers.set(0)

    this._renderer.setScissorTest(false)
    this._renderer.setViewport(0, 0, size.x, size.y)
    this._renderer.setClearColor('#000', 1)
  }
}
