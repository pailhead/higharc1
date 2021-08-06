uniform sampler2D uTexture;
uniform vec4 uTextureSize; //pixel size, inv pixel size, textureScale
uniform vec2 uHeightRange;

varying vec2 vUv;
varying vec3 vNormal;
varying vec2 vWorldScreen;
varying vec3 vEye;
varying vec3 vViewPosition;
varying float vDebug;

const vec3 unpack = vec3(
  256.0 * 256.0 * 255.0,
  256.0 * 255.0,
  255.0
);

vec2 lookup(vec2 point){
  return point * uTextureSize.z + uTextureSize.y*0.5;
}

float height(vec2 point){
  vec3 t = texture2D(uTexture,point).xyz;
  float h = -10000.0 + dot(t,unpack) * 0.1;
  return h*0.001; //km
}

vec3 getNormal(vec2 point){
  float h = height(point);
  float pxOffset = uTextureSize.y;

  float hl = height(vec2(point.x+pxOffset, point.y));
  float hr = height(vec2(point.x-pxOffset, point.y));
  float ht = height(vec2(point.x, point.y+pxOffset));
  float hb = height(vec2(point.x, point.y-pxOffset));
  float dzdx = hr - hl;
  float dzdy = ht - hb;

  return vec3(-dzdx,2.0,-dzdy);
}


void main (){
  vec2 l = lookup(uv.yx);
  vUv = l;
  vNormal = getNormal(l);
  
  float h = height(l);
  
  vec4 pos = vec4(position,1.);
  pos = modelMatrix * pos;
  
  mat4 pvMat = projectionMatrix * viewMatrix;

  vec4 wp = pvMat * pos;
  vWorldScreen = wp.xy / wp.w; 
  vWorldScreen = vWorldScreen * 0.5 + 0.5;

  pos.y += h;
  vDebug = h;

  vEye = pos.xyz - cameraPosition;
  // vViewPosition = (viewMatrix * pos).xyz;
  vViewPosition = pos.xyz;
  gl_Position = pvMat * pos;
}