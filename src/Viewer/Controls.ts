import { PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

import { lonLatToKM } from '~/utils'

export class Controls extends OrbitControls {
  constructor(camera: PerspectiveCamera, domElement: HTMLElement) {
    super(camera, domElement)
  }

  goToLonLat(lon: number, lat: number) {
    const target = lonLatToKM(lon, lat)
    const posEnd = new Vector3(-100, 100, 0).add(target)

    this.enabled = false
    this.object.position.copy(posEnd)
    this.object.lookAt(target)
    this.target.copy(target)
    this.enabled = true
  }
}
