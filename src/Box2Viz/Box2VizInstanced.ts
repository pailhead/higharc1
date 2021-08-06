import {
  BufferAttribute,
  Color,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Line,
  Vector4,
} from 'three'
import { MAX_TILES } from '../constants'
import { SharedGeometry } from '../Shared/SharedGeometry'
import { Box2VizInstancedMaterial } from './Box2VizInstancedMaterial'

export class Box2VizInstanced extends Line {
  private _boxBuffer: InstancedBufferAttribute
  private _colorBuffer: InstancedBufferAttribute
  private _geometry: InstancedBufferGeometry

  constructor(maxCount = MAX_TILES) {
    super(new InstancedBufferGeometry(), new Box2VizInstancedMaterial())

    const g = (this._geometry = this.geometry as InstancedBufferGeometry)

    g.setIndex(new BufferAttribute(SharedGeometry.lineRect.index!.array, 1))

    const { array } = SharedGeometry.lineRect.getAttribute('position')!
    g.setAttribute('position', new BufferAttribute(array, 3))

    const boxArray = new Float32Array(maxCount * 4)
    this._boxBuffer = new InstancedBufferAttribute(boxArray, 4)
    g.setAttribute('aInstanceBox', this._boxBuffer)

    const colorArray = new Uint8Array(maxCount * 4)
    this._colorBuffer = new InstancedBufferAttribute(colorArray, 4, true)
    g.setAttribute('aInstanceColor', this._colorBuffer)

    this.frustumCulled = false
    this.renderOrder = 2
  }

  setBoxAt(index: number, box: Vector4) {
    this._boxBuffer.setXYZW(index, box.x, box.y, box.z, box.w)
    this._boxBuffer.needsUpdate = true
  }

  setColorAt(index: number, color: Color) {
    this._colorBuffer.setXYZW(
      index,
      color.r * 255,
      color.g * 255,
      color.b * 255,
      0,
    )
    this._colorBuffer.needsUpdate = true
  }

  setCount(count: number) {
    this._geometry.instanceCount = count
  }
}
