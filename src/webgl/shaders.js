// GLSL for the persistent space scene. Colours are written straight to the
// framebuffer (no colour-space conversion), so brand hex values map 1:1.

export const NOISE = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 hash33(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }

float noise2(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1,0)), f.x), mix(hash12(i + vec2(0,1)), hash12(i + vec2(1,1)), f.x), f.y);
}
float noise3(vec3 p){
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash13(i), hash13(i + vec3(1,0,0)), f.x), mix(hash13(i + vec3(0,1,0)), hash13(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash13(i + vec3(0,0,1)), hash13(i + vec3(1,0,1)), f.x), mix(hash13(i + vec3(0,1,1)), hash13(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float fbm2(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * noise2(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
float fbm3(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * noise3(p); p = p * 2.02 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }
`;

export const BRAND = /* glsl */ `
const vec3 C_PURPLE = vec3(0.353, 0.176, 1.0);
const vec3 C_PINK   = vec3(1.0, 0.235, 0.675);
const vec3 C_LAV    = vec3(0.561, 0.561, 0.784);
const vec3 C_WHITE  = vec3(0.973, 0.973, 0.988);
const vec3 C_BLACK  = vec3(0.0196, 0.0196, 0.0235);
const vec3 C_DEEP   = vec3(0.07, 0.035, 0.2);
`;

/* ---------------- Fullscreen ---------------- */
export const fullscreenVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

/* Nebula — rendered to a quarter-resolution target, then upsampled. */
export const nebulaFrag = /* glsl */ `
uniform float uTime;
uniform float uAspect;
uniform float uScroll;
uniform float uIntensity;
uniform float uHue;
uniform vec2 uMouse;
varying vec2 vUv;
${NOISE}
${BRAND}
void main(){
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  p += uMouse * 0.025;
  vec2 q = p * 1.45 + vec2(0.0, uScroll);
  float t = uTime * 0.012;
  vec2 w = vec2(fbm2(q + vec2(t, -t)), fbm2(q + vec2(5.2, 1.3) - t));
  float n = fbm2(q + 2.4 * w + vec2(0.0, t * 2.0));
  float n2 = fbm2(q * 2.2 - w * 1.4 + 4.0);

  // A diagonal galactic band that drifts with scroll
  float band = exp(-pow(p.y * 0.95 + p.x * 0.5 + (n - 0.5) * 0.7 + sin(uScroll * 0.6) * 0.25, 2.0) * 3.2);

  vec3 col = C_DEEP * smoothstep(0.25, 0.85, n) * 0.9;
  col += C_PURPLE * pow(smoothstep(0.42, 0.95, n), 2.0) * 0.5 * (0.35 + band);
  col += C_PINK * pow(smoothstep(0.5, 1.0, n2 * n * 1.65), 2.4) * 0.5 * mix(band, 1.0, uHue);
  col += C_LAV * pow(smoothstep(0.62, 1.0, n2), 3.0) * 0.12 * band;
  col *= 0.55 + 0.45 * smoothstep(0.22, 0.62, n2); // dust lanes
  col *= smoothstep(1.35, 0.15, length(p * vec2(0.8, 1.0)));
  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`;

/* Background composite — samples the nebula and dithers away banding. */
export const backgroundFrag = /* glsl */ `
uniform sampler2D uNebula;
uniform float uFade;
varying vec2 vUv;
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  vec3 col = vec3(0.0196, 0.0196, 0.0235) + texture2D(uNebula, vUv).rgb * uFade;
  col += (hash12(gl_FragCoord.xy) - 0.5) / 255.0 * 1.5;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ---------------- Stars & dust ---------------- */
export const starsVert = /* glsl */ `
attribute float aSize;
attribute float aSeed;
attribute vec3 aColor;
uniform float uTime;
uniform float uCamZ;
uniform float uDepth;
uniform float uNear;
uniform float uPixelRatio;
uniform float uWarp;
uniform float uBright;
uniform float uScale;
uniform float uRepel;
uniform float uAspect;
uniform vec2 uMouse;
varying vec3 vColor;
varying float vAlpha;
varying float vFlare;
void main(){
  vec3 p = position;
  // Wrap depth around the camera: an endless field however far we travel.
  p.z = uCamZ + uNear - mod(uCamZ + uNear - p.z, uDepth);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = -mv.z;
  gl_Position = projectionMatrix * mv;

  if (uRepel > 0.0) {
    vec2 ndc = gl_Position.xy / gl_Position.w;
    vec2 d = ndc - uMouse; d.x *= uAspect;
    float f = smoothstep(0.45, 0.0, length(d)) * uRepel;
    vec2 push = normalize(d + 1e-5) * f; push.x /= uAspect;
    gl_Position.xy += push * gl_Position.w;
  }

  vFlare = step(0.982, aSeed);
  float size = aSize * uScale * (1.0 + uWarp * 0.8) * (1.0 + vFlare * 2.6);
  float px = size * uPixelRatio * (260.0 / dist);
  gl_PointSize = clamp(px, 1.0, 72.0 * uPixelRatio);

  float tw = 0.62 + 0.38 * sin(uTime * (0.5 + aSeed * 2.6) + aSeed * 61.0);
  float near = smoothstep(uNear * 0.2, uNear * 2.2 + 2.0, dist);
  float far = 1.0 - smoothstep(uDepth * 0.55, uDepth * 0.98, dist);
  vAlpha = tw * near * far * uBright * min(px, 1.0) * (1.0 + uWarp * 0.6);
  vColor = aColor;
}
`;

export const starsFrag = /* glsl */ `
uniform float uBokeh;
varying vec3 vColor;
varying float vAlpha;
varying float vFlare;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float a;
  if (uBokeh > 0.5) {
    a = smoothstep(0.5, 0.36, d) * (0.55 + 0.45 * smoothstep(0.2, 0.46, d));
  } else {
    float k = mix(1.0, 3.6, vFlare);
    float core = pow(smoothstep(0.5, 0.0, d * k), 2.4);
    float spikes = 0.0;
    if (vFlare > 0.5) {
      spikes = exp(-abs(uv.x) * 48.0) * smoothstep(0.5, 0.0, abs(uv.y));
      spikes += exp(-abs(uv.y) * 48.0) * smoothstep(0.5, 0.0, abs(uv.x));
      spikes *= 0.85;
      core += exp(-d * 9.0) * 0.35;
    }
    a = core + spikes;
  }
  a *= vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor, a);
}
`;

/* ---------------- Planet ---------------- */
export const planetVert = /* glsl */ `
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vWorld;
void main(){
  vObj = position;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const RING_DENSITY = /* glsl */ `
float ringDensity(float r){
  float x = (r - 1.38) / 0.97;
  if (x < 0.0 || x > 1.0) return 0.0;
  float d = 0.55 + 0.45 * sin(x * 96.0 + sin(x * 21.0) * 2.4);
  d *= 0.62 + 0.38 * sin(x * 33.0 + 1.3);
  d *= smoothstep(0.0, 0.07, x) * smoothstep(1.0, 0.84, x);
  d *= 1.0 - 0.94 * smoothstep(0.035, 0.0, abs(x - 0.61));
  d *= 1.0 - 0.55 * smoothstep(0.018, 0.0, abs(x - 0.86));
  return clamp(d, 0.0, 1.0);
}
`;

export const planetFrag = /* glsl */ `
uniform vec3 uLight;
uniform float uTime;
uniform vec3 uCenter;
uniform float uRadius;
uniform vec3 uRingNormal;
uniform float uRingAlpha;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vWorld;
${NOISE}
${BRAND}
${RING_DENSITY}
void main(){
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uLight);
  vec3 p = normalize(vObj);
  float lat = p.y;

  float warp = fbm3(p * 2.6 + vec3(uTime * 0.012, 0.0, 0.0));
  float turb = fbm3(vec3(p.x * 2.2, p.y * 13.0, p.z * 2.2) + warp * 2.2);
  float bands = sin(lat * 13.0 + warp * 3.2 + turb * 1.9) * 0.5 + 0.5;
  float fine = sin(lat * 46.0 + turb * 4.5) * 0.5 + 0.5;

  vec3 col = mix(C_DEEP * 1.4, C_PURPLE * 0.92, smoothstep(0.15, 0.95, bands));
  col = mix(col, C_LAV, smoothstep(0.62, 1.0, fine) * 0.22);
  col = mix(col, C_PINK, smoothstep(0.72, 1.0, bands * turb * 1.45) * 0.38);
  col *= mix(0.5, 1.0, smoothstep(0.96, 0.55, abs(lat)));

  // A slow pink storm, in the southern belt
  vec3 sc = normalize(vec3(0.82, -0.36, 0.44));
  vec3 dp = (p - sc) * vec3(1.0, 1.9, 1.0);
  float storm = smoothstep(0.24, 0.0, length(dp));
  float swirl = sin(length(dp) * 60.0 - uTime * 0.6 + atan(dp.y, dp.x) * 2.0) * 0.5 + 0.5;
  col = mix(col, mix(C_PINK, C_WHITE, swirl * 0.35), storm * 0.75);

  float ndl = dot(N, L);
  float diff = smoothstep(-0.14, 0.9, ndl);
  vec3 lit = col * (diff * 1.15 + 0.02);
  float term = smoothstep(0.26, 0.0, abs(ndl - 0.04));
  lit += C_PINK * term * 0.2;

  // Ring shadow cast onto the planet
  float denom = dot(L, uRingNormal);
  if (abs(denom) > 1e-3) {
    float t = dot(uCenter - vWorld, uRingNormal) / denom;
    if (t > 0.0) {
      float rr = length(vWorld + L * t - uCenter) / uRadius;
      lit *= 1.0 - ringDensity(rr) * 0.75 * uRingAlpha;
    }
  }

  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  lit += mix(C_PURPLE, C_LAV, 0.45) * fres * (0.18 + 1.0 * smoothstep(-0.35, 0.65, ndl));
  gl_FragColor = vec4(lit, 1.0);
}
`;

/* Atmosphere — back-faces of a slightly larger sphere, additive. */
export const atmoVert = /* glsl */ `
varying vec3 vNormalV;
varying vec3 vNormalW;
void main(){
  vNormalV = normalize(normalMatrix * normal);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
export const atmoFrag = /* glsl */ `
uniform vec3 uLight;
uniform float uGlow;
varying vec3 vNormalV;
varying vec3 vNormalW;
${BRAND}
void main(){
  float g = pow(clamp(-vNormalV.z / 0.55, 0.0, 1.0), 2.4);
  float lit = smoothstep(-0.45, 0.75, dot(normalize(vNormalW), normalize(uLight)));
  vec3 col = mix(C_PURPLE, C_PINK, 0.25 + 0.3 * lit) * g * (0.18 + lit * 1.1) * uGlow;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* Rings */
export const ringVert = /* glsl */ `
varying vec3 vLocal;
varying vec3 vWorld;
void main(){
  vLocal = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;
export const ringFrag = /* glsl */ `
uniform vec3 uLight;
uniform vec3 uCenter;
uniform float uRadius;
uniform float uOpacity;
uniform float uTime;
varying vec3 vLocal;
varying vec3 vWorld;
${BRAND}
${RING_DENSITY}
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
void main(){
  float r = length(vLocal.xy);
  float d = ringDensity(r);
  float x = (r - 1.38) / 0.97;
  vec3 col = mix(C_PINK * 0.9, C_LAV, smoothstep(0.0, 0.45, x));
  col = mix(col, C_WHITE, smoothstep(0.5, 0.95, x) * 0.55);

  // Fine grain glints that orbit slowly
  float ang = atan(vLocal.y, vLocal.x) + uTime * 0.02 / max(r, 0.5);
  float glint = step(0.985, hash12(vec2(floor(ang * 300.0), floor(r * 140.0))));
  col += glint * 0.6;

  vec3 L = normalize(uLight);
  vec3 toP = vWorld - uCenter;
  float along = dot(toP, L);
  float perp = length(toP - L * along);
  float shadow = along < 0.0 ? smoothstep(uRadius * 0.96, uRadius * 1.04, perp) : 1.0;

  float a = d * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col * (0.2 + 0.95 * shadow), a);
}
`;

/* Orbits — a fading trail behind each moon */
export const orbitVert = /* glsl */ `
attribute float aT;
varying float vT;
void main(){ vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const orbitFrag = /* glsl */ `
uniform float uPhase;
uniform float uAlpha;
uniform vec3 uColor;
varying float vT;
void main(){
  float trail = pow(fract(vT - uPhase), 5.0);
  float a = uAlpha * (0.1 + 0.9 * trail);
  gl_FragColor = vec4(uColor, a);
}
`;

/* Rocky bodies — moons and the large lunar body in About */
export const rockFrag = /* glsl */ `
uniform vec3 uLight;
uniform vec3 uTint;
uniform float uDetail;
varying vec3 vObj;
varying vec3 vNormalW;
varying vec3 vWorld;
${NOISE}
${BRAND}
float craters(vec3 p){
  vec3 i = floor(p), f = fract(p);
  float sh = 0.0;
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = hash33(i + g);
    if (o.z > 0.32) continue;
    float rad = 0.12 + 0.42 * o.x * o.x;
    vec3 d = (g + o - f) / rad;
    float dist = length(d);
    // Bowls are shaded by their slope against the light, rims catch it softly.
    float bowl = smoothstep(1.0, 0.0, dist);
    float slope = dot(normalize(d + 1e-4), normalize(uLight));
    sh += bowl * (-0.35 + 0.3 * slope) + smoothstep(0.8, 1.0, dist) * smoothstep(1.25, 1.0, dist) * 0.22;
  }
  return sh;
}
void main(){
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uLight);
  vec3 p = normalize(vObj);
  float maria = smoothstep(0.5, 0.62, fbm3(p * 1.5 + 2.0));
  vec3 base = mix(vec3(0.74, 0.72, 0.78), vec3(0.34, 0.32, 0.42), maria) * (0.8 + 0.35 * fbm3(p * 9.0));
  if (uDetail > 0.5) base *= 1.0 + (craters(p * 6.0) + 0.6 * craters(p * 15.0 + 3.0)) * 0.3;
  base *= uTint;
  float ndl = dot(N, L);
  vec3 col = base * smoothstep(-0.06, 0.5, ndl) * 1.05;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += C_LAV * fres * 0.25 * smoothstep(-0.2, 0.5, ndl);
  col += C_PURPLE * 0.025;
  gl_FragColor = vec4(col, 1.0);
}
`;

/* Meteor streak */
export const meteorVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
export const meteorFrag = /* glsl */ `
uniform float uAlpha;
varying vec2 vUv;
${BRAND}
void main(){
  float head = pow(vUv.x, 6.0);
  float body = pow(vUv.x, 2.2);
  float w = 1.0 - smoothstep(0.0, 0.5, abs(vUv.y - 0.5) / mix(0.12, 0.5, vUv.x));
  vec3 col = mix(C_PINK, C_WHITE, head);
  float a = (body * 0.7 + head) * w * uAlpha;
  gl_FragColor = vec4(col, a);
}
`;
