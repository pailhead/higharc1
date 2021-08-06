attribute vec4 aInstanceBox;
attribute vec4 aInstanceColor;

varying vec3 vColor;

void main(){
  vColor = aInstanceColor.xyz;

  vec3 p = vec3(
    position.x * aInstanceBox.z + aInstanceBox.x,
    0.0,
    position.z * aInstanceBox.w + aInstanceBox.y
  );

  gl_Position = projectionMatrix * viewMatrix * vec4(p,1.0);
}