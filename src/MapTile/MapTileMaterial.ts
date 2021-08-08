import {
  BackSide,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} from 'three'

import { TEXTURE_SIZE } from '~/constants'

import vertexShader from './mapTile.vert'
import fragmentShader from './mapTile.frag'

export class MapTileMaterial extends ShaderMaterial {
  constructor(
    maskUniform: { value: WebGLRenderTarget | null },
    screenSizeUniform: { value: Vector4 },
  ) {
    super({
      vertexShader,
      fragmentShader,
      uniforms: {
        uLightDir: {
          value: new Vector3(1, 1, 1).normalize(),
        },
        uLevel: { value: 0 },
        uTexture: { value: null },
        uTileSizeWorld: { value: new Vector2() },
        uTextureSize: {
          value: new Vector4(0, 0, 1, 1),
        },
        uTextureOffset: { value: new Vector4() },
        uScreenSize: screenSizeUniform,
        uMaskTexture: maskUniform,
        uHeightRange: { value: new Vector2(0, 1) },
      },
      side: BackSide,
      // wireframe: true,
    })
  }
  setTextureOffset(v: Vector4) {
    this.uniforms.uTextureOffset.value.copy(v)
    const ts = TEXTURE_SIZE / v.z
    this.uniforms.uTextureSize.value.set(ts, 1 / ts, (ts - 1) / ts, 0)
  }
  setTexture(texture: Texture) {
    this.uniforms.uTexture.value = texture
  }
  getTexture() {
    return this.uniforms.uTexture.value
  }
  setTileSizeWorld(w: number, h: number) {
    this.uniforms.uTileSizeWorld.value.set(w, h)
  }
}
