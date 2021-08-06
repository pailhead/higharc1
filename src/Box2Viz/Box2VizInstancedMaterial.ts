import { ShaderMaterial } from 'three'

import vertexShader from './boxInstanced.vert'
import fragmentShader from './boxInstanced.frag'

export class Box2VizInstancedMaterial extends ShaderMaterial {
  constructor() {
    super({
      vertexShader,
      fragmentShader,
      uniforms: {},
      depthTest: false,
    })
  }
}
