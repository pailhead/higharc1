import {
  BackSide,
  ShaderMaterial,
  Texture,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderTarget,
} from 'three'

import vertexShader from './mapTile.vert'
import fragmentShader from './mapTile.frag'
import { TEXTURE_SIZE } from '../constants'

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
        uTextureSize: {
          value: new Vector4(
            TEXTURE_SIZE,
            1 / TEXTURE_SIZE,
            (TEXTURE_SIZE - 1) / TEXTURE_SIZE,
            0,
          ),
        },
        uScreenSize: screenSizeUniform,
        uMaskTexture: maskUniform,
        uHeightRange: { value: new Vector2(0, 1) },
      },
      side: BackSide,
    })
  }
  setLevel(level: number) {
    this.uniforms.uLevel.value = level
  }
  setTexture(texture: Texture) {
    this.uniforms.uTexture.value = texture
  }
  setHeightRange(min: number, max: number) {
    this.uniforms.uHeightRange.value.set(min, max)
  }
}
