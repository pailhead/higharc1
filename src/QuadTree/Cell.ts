import { getChildren } from '@mapbox/tilebelt'
import { Vector4, Vector2, Group } from 'three'

interface ITraversal {
  stopPropagation: boolean
  terminate: boolean
}
interface IBFS extends ITraversal {
  level: number
}
interface IDFS extends ITraversal {
  path: Cell[]
}
const DIR = [
  new Vector2(0, 0),
  new Vector2(1, 0),
  new Vector2(1, 1),
  new Vector2(0, 1),
]

export class Cell {
  public static readonly DIR = DIR
  public readonly level: number
  public readonly size = new Vector4()
  public readonly center = new Vector2()

  parent: Cell | null = null

  private _children: Cell[] | null = null

  constructor(
    public readonly tile: number[],
    public index: number,
    level: number,
    private _rootObject: Group,
  ) {
    this.level = level
  }

  get isRoot() {
    return !this.parent
  }

  get children() {
    return this._children
  }

  getAncestors() {
    if (this.isRoot) return
    const res: Cell[] = []

    let parent: Cell | null = this.parent!
    while (parent) {
      res.unshift(parent!)
      parent = parent.parent
    }
    return res
  }

  split() {
    if (this.children) return this.children
    const nextLevel = this.level + 1

    const children = getChildren(this.tile)

    this._children = [
      new Cell(children[3], 0, nextLevel, this._rootObject),
      new Cell(children[0], 1, nextLevel, this._rootObject),
      new Cell(children[1], 2, nextLevel, this._rootObject),
      new Cell(children[2], 3, nextLevel, this._rootObject),
    ]
    const wh = this.size.z * 0.5
    const hh = this.size.w * 0.5
    this._children.forEach((child, i) => {
      const x = DIR[i].x * wh + this.size.x
      const y = DIR[i].y * hh + this.size.y
      child.setSize(x, y, wh, hh)
      child.parent = this
    })
    return this._children
  }

  setSize(x: number, y: number, width: number, height: number) {
    this.size.set(x, y, width, height)
    const wh = width * 0.5
    const hh = height * 0.5
    this.center.set(x, y)
    this.center.x += wh
    this.center.y += hh
  }

  getSiblings(target: Cell[] = []) {
    if (this.isRoot) return null
    this.parent!.children!.forEach((child) => target.push(child))
    return target
  }

  dfs(
    cb: (cell: Cell, traversal: IDFS) => void,
    visited: Map<Cell, Cell> = new Map(),
  ) {
    const traversal: IDFS = {
      stopPropagation: false,
      terminate: false,
      path: [],
    }

    const search = (cell: Cell) => {
      if (traversal.terminate) return
      if (visited.has(cell)) return
      visited.set(cell, cell)
      traversal.stopPropagation = false
      cb(cell, traversal)
      if (traversal.stopPropagation || traversal.terminate) return
      if (!cell.children) return
      traversal.path.push(cell)
      cell.children.forEach(search)
      traversal.path.pop()
    }
    search(this)
  }

  bfs(
    cb: (cell: Cell, traversal: IBFS) => void,
    visited: Map<Cell, Cell> = new Map(),
  ) {
    const traversal: IBFS = {
      stopPropagation: false,
      terminate: false,
      level: 0,
    }
    const queue: Cell[] = [this]

    const search = (cell: Cell) => {
      if (visited.has(cell)) return
      if (traversal.terminate) return
      visited.set(cell, cell)
      traversal.stopPropagation = false
      cb(cell, traversal)
      if (traversal.stopPropagation || traversal.terminate) return
      if (!cell.children) return
      cell.children.forEach((child) => queue.push(child))
    }

    while (queue.length) {
      let count = queue.length
      while (count--) {
        search(queue.shift()!)
        if (traversal.terminate) return
      }
      traversal.level++
    }
  }
}
