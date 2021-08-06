import { Line, LineBasicMaterial } from 'three'

import { SharedGeometry } from '~/Shared/SharedGeometry'

export class Box2Viz extends Line {
  constructor(color = '#ff0000') {
    super(SharedGeometry.lineRect, new LineBasicMaterial({ color }))
  }
  setSize(w: number, h: number) {
    this.scale.set(w, 1, h)
  }
  setPosition(x: number, y: number) {
    this.position.set(x, 0, y)
  }
}
