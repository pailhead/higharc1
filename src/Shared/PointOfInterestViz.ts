import { AxesHelper, Group, Mesh, MeshBasicMaterial } from 'three'
import { SharedGeometry } from './SharedGeometry'

export class PointOfInterestViz extends Group {
  constructor() {
    super()
    this.add(
      new Mesh(
        SharedGeometry.sphereHi,
        new MeshBasicMaterial({ color: '#ff0000' }),
      ),
    )
    this.add(
      new Mesh(
        SharedGeometry.sphereHi,
        new MeshBasicMaterial({ color: '#ffff00' }),
      ),
    )
    this.children[1].layers.set(2)
    this.children[1].scale.set(200, 10, 200)
    this.add(new AxesHelper(1000))
  }
}
