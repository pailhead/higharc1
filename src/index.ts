import * as dat from 'dat.gui'
import TWEEN from '@tweenjs/tween.js'

import { Viewer, ViewerEvents } from './Viewer/Viewer'
import { Controls } from './Viewer/Controls'
import { MapViz } from './Viewer/MapViz'
import { DynamicMap } from './Map/DynamicMap'
import { getEarthBB, getSaneEarth, lonLatToKM } from './Api/tileUtils'
import { PointOfInterestViz } from './Shared/PointOfInterestViz'

import {
  MAX_CELL_BIAS,
  MAX_TILES,
  MIN_CELL_BIAS,
  MIN_TILES,
  SAN_FRANCISCO,
} from './constants'
import { TextureResources } from './MapTile/TextureResources'

const countEl = document.getElementById('count')
const gui = new dat.GUI()

const guiState = {
  lon: SAN_FRANCISCO[0],
  lat: SAN_FRANCISCO[1],
  maxCell: MAX_TILES,
  cellBias: MIN_CELL_BIAS,
  goTo: () => {
    //noop
  },
}

//init viewer
const viewer = new Viewer()
const controls = new Controls(viewer.camera, viewer.renderer.domElement)

//gather the first layer used for map display
const { divisibleEarthTiles, staticEarthTiles } = getSaneEarth()
const earthSize = getEarthBB({ divisibleEarthTiles, staticEarthTiles })

//Minimap renderer
const mapViz = new MapViz(earthSize, viewer.renderer)
viewer.addEventListener(ViewerEvents.HasRendered, () =>
  mapViz.render(viewer.scene),
)

divisibleEarthTiles.forEach((tile) =>
  TextureResources.createTexture(tile, true),
)

//map logic
const dynamicMap = new DynamicMap(divisibleEarthTiles, viewer)
viewer.scene.add(dynamicMap.boxInstanced)

//lon lat viz
const pointOfInterest = new PointOfInterestViz()
viewer.scene.add(pointOfInterest)

// const dir = [
//   [0, 1],
//   [1, 1],
//   [1, 0],
//   [0, 0],
// ]

const updatePoint = () => {
  pointOfInterest.position.copy(lonLatToKM(guiState.lon, guiState.lat))
}

const onGoto = () => {
  controls.goToLonLat(guiState.lon, guiState.lat)
  updatePoint()
}
onGoto()

viewer.addEventListener(ViewerEvents.WillRender, () => {
  TWEEN.update()
  const visible = dynamicMap.render(guiState.maxCell, guiState.cellBias)
  countEl!.innerHTML = `count: ${visible.length}`
})

gui.add(guiState, 'lon', -180, 180).onChange(updatePoint)
gui.add(guiState, 'lat', earthSize.x, earthSize.z).onChange(updatePoint)
gui.add(guiState, 'goTo').onChange(onGoto)
gui.add(guiState, 'maxCell', MIN_TILES, MAX_TILES).step(1)
gui.add(guiState, 'cellBias', MIN_CELL_BIAS, MAX_CELL_BIAS).step(1)

viewer.animate()
