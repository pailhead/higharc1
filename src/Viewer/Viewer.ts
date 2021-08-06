import {
  Clock,
  EventDispatcher,
  LinearEncoding,
  Scene,
  Vector2,
  WebGLRenderer,
} from 'three'
import { Camera } from './Camera'

export enum ViewerEvents {
  WillRender = 'WILL_RENDER',
  HasRendered = 'HAS_RENDERED',
  Resize = 'RESIZE',
}
/**
 * a wrapper around three's scene and renderer
 */
export class Viewer extends EventDispatcher {
  public readonly scene = new Scene()
  public readonly camera = new Camera()
  public readonly renderer = new WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true,
  })
  public readonly size = new Vector2()
  public readonly timeUniform = { value: 0 }
  public readonly clock = new Clock()

  constructor() {
    super()
    this.camera.zoom = 1
    this.camera.position.x = 0
    this.camera.position.y = 100
    this.camera.position.z = 100

    this.scene.add(this.camera)
    this.renderer.autoClear = false
    this.renderer.outputEncoding = LinearEncoding
    document.body.appendChild(this.renderer.domElement)
    document.body.style.margin = '0px'

    window.addEventListener('resize', this._onResize)
    this._onResize()
  }
  animate = () => {
    requestAnimationFrame(this.animate)
    const dt = this.clock.getDelta()
    this.timeUniform.value += dt
    this.camera.update()
    this.renderer.clear()
    this.dispatchEvent({ type: ViewerEvents.WillRender })
    this.renderer.render(this.scene, this.camera)
    this.dispatchEvent({ type: ViewerEvents.HasRendered })
  }
  private _onResize = () => {
    this.size.set(window.innerWidth, window.innerHeight)
    const wh = window.innerWidth / 2
    const hh = window.innerHeight / 2
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.camera.aspect = wh / hh
    this.camera.updateProjectionMatrix()
    this.dispatchEvent({ type: ViewerEvents.Resize })
  }
}
