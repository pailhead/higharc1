import {
  BufferAttribute,
  BufferGeometry,
  PlaneBufferGeometry,
  SphereBufferGeometry,
} from 'three'
import { TEXTURE_SIZE } from '../constants'

const SEG_COUNT = TEXTURE_SIZE - 1

export class SharedGeometry {
  static lineRect = new BufferGeometry()
  static sphereHi = new SphereBufferGeometry(1, 16, 8)
  static sphereLo = new SphereBufferGeometry(1, 4, 2)
  static tilePlane = new PlaneBufferGeometry(1, 1, SEG_COUNT, SEG_COUNT)
    .translate(0.5, 0.5, 0)
    .rotateX(Math.PI / 2)
  static simplePlane = new PlaneBufferGeometry(1, 1, 1, 1)
    .translate(0.5, 0.5, 0)
    .rotateX(Math.PI / 2)
}

SharedGeometry.lineRect.setIndex(
  new BufferAttribute(new Uint8Array([0, 1, 2, 3, 0]), 1),
)
SharedGeometry.lineRect.setAttribute(
  'position',
  new BufferAttribute(
    new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]),
    3,
  ),
)
SharedGeometry.lineRect.rotateX(Math.PI / 2)
