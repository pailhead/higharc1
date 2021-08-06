import { tileToBBOX } from '@mapbox/tilebelt'
import { Group, Vector3 } from 'three'
import { lonLatToKM } from '../Api/tileUtils'
import { Cell } from './Cell'

export class QuadTree {
  public readonly rootObject = new Group()
  public readonly root: Cell
  constructor(tile: number[]) {
    this.root = new Cell(tile, 0, this.rootObject)
    const bbox = tileToBBOX(tile)
    const min = lonLatToKM(bbox[0], bbox[1])
    const max = lonLatToKM(bbox[2], bbox[3])
    const size = new Vector3().subVectors(max, min)
    this.root.setSize(min.x, min.z, size.x, size.z)
  }
}
