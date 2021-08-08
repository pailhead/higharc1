varying vec2 vUv;
varying vec3 vNormal;
varying vec2 vWorldScreen;
varying vec3 vEye;
varying vec3 vViewPosition;

uniform vec4 uTextureOffset;
uniform vec3 uLightDir;
uniform vec4 uTextureSize; //pixel size, inv pixel size, textureScale
uniform sampler2D uTexture;

void main () {

	vec3 fdx = vec3( dFdx( vViewPosition.x ), dFdx( vViewPosition.y ), dFdx( vViewPosition.z ) );
	vec3 fdy = vec3( dFdy( vViewPosition.x ), dFdy( vViewPosition.y ), dFdy( vViewPosition.z ) );
	vec3 normal = normalize( cross( fdx, fdy ) );
  
  vec2 vs = vUv * uTextureSize.x * uTextureOffset.z * 0.5;
  vs = fract(vs);
  float c = step(0.5,vs.x) + step(0.5,vs.y);
  c = abs(c - 1.0);

  vec3 n = normalize(vNormal);
  // vec3 n = normal;
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
  // gl_FragColor.xyz = vec3(c);
  // gl_FragColor.xyz = n.yyy;
  // gl_FragColor.x = max(step(vUv.x,uTextureSize.y*10.),step(vUv.y,uTextureSize.y*10.));
}