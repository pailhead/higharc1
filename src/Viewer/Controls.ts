import { PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { lonLatToKM } from '../Api/tileUtils'

export class Controls extends OrbitControls {
  constructor(camera: PerspectiveCamera, domElement: HTMLElement) {
    super(camera, domElement)
  }

  goToLonLat(lon: number, lat: number) {
    // const { camera } = viewer
    // const tweenTime = 2000
    // const posStart = new Vector3().copy(camera.position)
    // const quatStart = new Quaternion().copy(viewer.camera.quaternion)
    // const factor = { value: 0 }

    const target = lonLatToKM(lon, lat)
    const posEnd = new Vector3(-100, 100, 0).add(target)
    // const quatEnd = new Quaternion().setFromUnitVectors(
    //   new Vector3(0, 0, 1),
    //   new Vector3().subVectors(posEnd, target).normalize(),
    // )

    // const tween = new TWEEN.Tween(factor)
    //   .to({ value: 1 }, tweenTime)
    //   .easing(TWEEN.Easing.Quadratic.Out)
    //   .onUpdate(() => {
    //     viewer.camera.position.lerpVectors(posStart, posEnd, factor.value)
    //     viewer.camera.quaternion.slerpQuaternions(
    //       quatStart,
    //       quatEnd,
    //       factor.value,
    //     )
    //   })
    //   .onComplete(() => {
    //     controls.target.copy(target)
    //     controls.enabled = true
    //   })
    //   .start()

    this.enabled = false
    this.object.position.copy(posEnd)
    // this.object.quaternion.copy(quatEnd)
    this.object.lookAt(target)
    this.target.copy(target)
    this.enabled = true
  }
}
