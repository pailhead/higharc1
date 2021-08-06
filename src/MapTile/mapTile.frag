varying vec2 vUv;
varying vec3 vNormal;
varying vec2 vWorldScreen;
varying vec3 vEye;
varying vec3 vViewPosition;
varying float vDebug;

uniform int uLevel;
uniform vec3 uLightDir;
uniform vec4 uTextureSize; //pixel size, inv pixel size, textureScale
uniform vec4 uScreenSize;
uniform sampler2D uTexture;
uniform sampler2D uMaskTexture;

void main () {

  vec2 maskLookup = vWorldScreen;
  float mask = texture2D(uMaskTexture,maskLookup).x;
  
  if(int(mask*255.) != uLevel) discard;

  vec2 vs = vUv * uTextureSize.x * 0.5;
  vs = fract(vs);
  float c = step(0.5,vs.x) + step(0.5,vs.y);
  c = abs(c - 1.0);

  vec3 n = normalize(vNormal);
  float ndl = dot(n,uLightDir);
  ndl = clamp(ndl,0.0,1.0);
  vec3 r = reflect(uLightDir,n);
  float spec = dot(r,normalize(vEye));
  spec = clamp(spec,0.,1.);
  spec = pow(spec, 4.);
  
  vec3 res = mix(vec3(0.5),vec3(0.25),vec3(c));
  gl_FragColor = vec4(
    vec3(0.505, 0.607, 0.874) * 0.2 + ndl * vec3(1., 0.768, 0.505) * 0.5 + spec * 0.3,
    1.
  );
  // gl_FragColor.xyz = texture2D(uTexture,vUv).xyz;
  // gl_FragColor.x = max(step(vUv.x,uTextureSize.y*10.),step(vUv.y,uTextureSize.y*10.));
}