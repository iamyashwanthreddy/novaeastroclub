import * as THREE from 'three';
import { NOISE } from './shaders.js';

/*
  Illustrative astrophotography "plates", rendered once on the GPU and handed
  to <img> tags as blob URLs. They stand in until real member photos exist:
  to use a real photo, give the <img> a normal `src` and remove `data-plate`.
*/

export const PLATES = {
  moon: { mode: 0, w: 1000, h: 1000 },
  saturn: { mode: 1, w: 960, h: 1200 },
  pleiades: { mode: 2, w: 960, h: 1200 },
  nebula: { mode: 3, w: 960, h: 1200 },
  trails: { mode: 4, w: 1600, h: 1000 },
  galaxy: { mode: 5, w: 1600, h: 1000 },
};

const frag = /* glsl */ `
uniform float uMode;
uniform vec2 uRes;
varying vec2 vUv;
${NOISE}

float starCell(vec2 px, float cell, float prob, float seed){
  vec2 g = px / cell; vec2 id = floor(g); vec2 f = fract(g) - 0.5;
  float h = hash12(id + seed);
  if (h > prob) return 0.0;
  vec2 off = (vec2(hash12(id + seed + 3.1), hash12(id + seed + 7.7)) - 0.5) * 0.7;
  float b = pow(hash12(id + seed + 1.3), 4.0);
  float d = length(f - off) * cell;
  float r = 0.55 + b * 1.9;
  return exp(-d * d / (r * r)) * (0.3 + b * 1.8);
}
vec3 stars(vec2 px, float density){
  float s = starCell(px, 5.0, 0.05 * density, 1.0) * 0.55
          + starCell(px, 11.0, 0.08 * density, 5.0)
          + starCell(px, 29.0, 0.12 * density, 9.0) * 1.4;
  float t = hash12(floor(px / 11.0) + 2.0);
  return s * mix(vec3(0.72, 0.8, 1.0), vec3(1.0, 0.84, 0.68), t);
}
float craters(vec3 p){
  vec3 i = floor(p), f = fract(p);
  float sh = 0.0;
  for (int z = -1; z <= 1; z++)
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z));
    vec3 o = hash33(i + g);
    if (o.z > 0.55) continue;
    float rad = 0.16 + 0.34 * o.x * o.x;
    float dist = length(g + o - f) / rad;
    sh += smoothstep(1.0, 0.1, dist) * -0.75 + smoothstep(0.7, 1.0, dist) * smoothstep(1.32, 1.0, dist) * 0.9;
  }
  return sh;
}
vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c) * p; }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }

vec3 moon(vec2 p, vec2 px){
  vec3 col = stars(px, 0.2) * 0.35;
  float R = 0.8; float r = length(p);
  vec2 q = p / R;
  float z = sqrt(max(0.0, 1.0 - dot(q, q)));
  vec3 n = vec3(q, z);
  vec3 nn = vec3(n.x * 0.9 + n.z * 0.43, n.y, -n.x * 0.43 + n.z * 0.9);
  float maria = smoothstep(0.47, 0.6, fbm3(nn * 1.7 + 2.0));
  vec3 base = mix(vec3(0.82, 0.8, 0.79), vec3(0.4, 0.39, 0.43), maria) * (0.76 + 0.42 * fbm3(nn * 10.0));
  float cr = craters(nn * 7.0) + 0.6 * craters(nn * 17.0 + 3.0) + 0.35 * craters(nn * 38.0 + 7.0);
  vec3 L = normalize(vec3(1.0, 0.12, 0.08));
  float ndl = dot(n, L);
  base *= 1.0 + cr * mix(0.28, 0.6, smoothstep(0.4, 0.0, ndl));
  vec3 m = base * smoothstep(-0.02, 0.2, ndl) * 1.15 + base * 0.012;
  m *= mix(0.86, 1.0, z);
  float edge = smoothstep(R + 0.003, R - 0.003, r);
  col = mix(col, m, edge);
  col += vec3(0.55, 0.55, 0.7) * 0.06 * smoothstep(R + 0.12, R, r) * (1.0 - edge) * smoothstep(-0.4, 0.6, p.x);
  return col;
}

float saturnRing(float rr){
  float d = 0.0;
  d += smoothstep(1.22, 1.26, rr) * smoothstep(1.53, 1.5, rr) * 0.22;
  d += smoothstep(1.52, 1.56, rr) * smoothstep(1.96, 1.93, rr) * (0.75 + 0.25 * sin(rr * 120.0));
  d += smoothstep(2.02, 2.05, rr) * smoothstep(2.28, 2.24, rr) * (0.55 + 0.15 * sin(rr * 90.0));
  d *= 1.0 - 0.7 * smoothstep(0.012, 0.0, abs(rr - 2.2));
  return d;
}
vec3 saturn(vec2 p, vec2 px){
  vec3 col = stars(px, 0.12) * 0.3;
  p = rot(p, 0.14);
  float Rp = 0.125;
  vec2 q = vec2(p.x, p.y / 0.33);
  float rr = length(q) / Rp;
  float ringD = saturnRing(rr);
  vec3 ringCol = vec3(0.86, 0.78, 0.63) * mix(0.7, 1.0, smoothstep(1.5, 2.0, rr));
  vec2 pp = vec2(p.x, p.y * 1.11);
  float pd = length(pp) / Rp;
  float inP = smoothstep(1.0, 0.985, pd);
  float lat = pp.y / Rp;
  float bands = sin(lat * 15.0 + fbm2(vec2(lat * 6.0, p.x * 20.0)) * 1.4) * 0.5 + 0.5;
  vec3 pc = mix(vec3(0.82, 0.7, 0.48), vec3(0.96, 0.89, 0.72), bands);
  pc *= mix(0.62, 1.0, smoothstep(0.95, 0.35, abs(lat)));
  pc *= pow(max(0.0, 1.0 - pd * pd), 0.32);
  pc *= 1.0 - 0.55 * smoothstep(0.08, 0.0, abs(lat - 0.33)) * step(0.0, lat); // ring shadow
  bool front = p.y < 0.0;
  if (!front) col += ringCol * ringD * (1.0 - inP);
  col = mix(col, pc * 1.08, inP);
  if (front) col = mix(col, ringCol * ringD * 1.05, clamp(ringD * 0.92, 0.0, 1.0));
  col += vec3(0.9, 0.8, 0.6) * 0.05 * exp(-max(pd - 1.0, 0.0) * 6.0) * (1.0 - inP);
  return col;
}

vec3 brightStar(vec2 p, vec2 s, float b, float aspectPx){
  vec2 d = p - s;
  float r2 = dot(d, d);
  float core = exp(-r2 / (0.000018 * b));
  float halo = 0.0009 * b / (r2 + 0.0009);
  float spikes = exp(-abs(d.y) * 1400.0) * exp(-abs(d.x) * 11.0 / b) + exp(-abs(d.x) * 1400.0) * exp(-abs(d.y) * 11.0 / b);
  return vec3(0.75, 0.86, 1.0) * (core * 2.0 + halo * 0.35 + spikes * 0.55 * b);
}
vec3 pleiades(vec2 p, vec2 px){
  vec3 col = vec3(0.006, 0.01, 0.028);
  float w = fbm2(p * 4.0 + fbm2(p * 2.5) * 1.6);
  float streak = fbm2(vec2(p.x * 3.0 + p.y * 2.0, p.y * 10.0 - p.x * 3.0) + 4.0);
  float neb = exp(-dot(p * vec2(1.0, 0.85), p * vec2(1.0, 0.85)) * 6.0);
  col += vec3(0.16, 0.3, 0.85) * neb * pow(w * streak * 1.9, 1.7) * 1.4;
  col += stars(px, 0.55) * 0.8;
  col += brightStar(p, vec2(0.02, 0.05), 1.6, 1.0);
  col += brightStar(p, vec2(-0.14, 0.12), 1.2, 1.0);
  col += brightStar(p, vec2(-0.09, -0.02), 1.0, 1.0);
  col += brightStar(p, vec2(0.16, -0.08), 1.25, 1.0);
  col += brightStar(p, vec2(0.21, 0.02), 0.85, 1.0);
  col += brightStar(p, vec2(-0.2, -0.13), 0.9, 1.0);
  col += brightStar(p, vec2(0.08, 0.2), 0.75, 1.0);
  col += brightStar(p, vec2(-0.02, -0.19), 0.6, 1.0);
  col += brightStar(p, vec2(0.27, 0.22), 0.55, 1.0);
  return col;
}

vec3 nebula(vec2 p, vec2 px){
  vec2 s = p * 1.6;
  vec2 w = vec2(fbm2(s * 1.6 + 1.0), fbm2(s * 1.6 + 7.0));
  float n = fbm2(s * 2.0 + w * 2.3);
  float n2 = fbm2(s * 4.0 - w * 1.3 + 3.0);
  float shape = exp(-dot(s * vec2(0.9, 1.15), s * vec2(0.9, 1.15)) * 1.5);
  vec3 ha = vec3(1.0, 0.2, 0.55) * pow(smoothstep(0.32, 0.9, n), 1.8) * shape * 1.7;
  vec3 oiii = vec3(0.12, 0.62, 0.86) * pow(smoothstep(0.5, 0.95, n2), 2.0) * exp(-dot(s, s) * 3.0) * 1.2;
  vec3 pur = vec3(0.35, 0.18, 1.0) * pow(n, 3.0) * shape * 0.9;
  float dust = smoothstep(0.42, 0.72, fbm2(s * 3.0 + w * 3.0 + 11.0));
  vec3 col = (ha + oiii + pur) * (1.0 - dust * 0.88);
  col += stars(px, 0.7) * (1.0 - dust * 0.75);
  col += brightStar(p, vec2(0.05, 0.03), 0.9, 1.0) * 0.8;
  col += brightStar(p, vec2(-0.18, 0.21), 0.6, 1.0) * 0.6;
  return col;
}

vec3 trails(vec2 uv, vec2 px, float aspect){
  vec2 p = uv * vec2(aspect, 1.0);
  vec3 col = mix(vec3(0.17, 0.07, 0.24), vec3(0.012, 0.016, 0.05), smoothstep(0.0, 0.8, p.y));
  col += vec3(0.55, 0.16, 0.42) * 0.22 * exp(-p.y * 5.5);
  vec2 pole = vec2(aspect * 0.62, 1.1);
  vec2 d = p - pole;
  float r = length(d);
  float th = atan(d.y, d.x);
  float rp = r * uRes.y / 3.2;
  float id = floor(rp);
  float f = fract(rp);
  float h = hash12(vec2(id, 1.7));
  float b = pow(hash12(vec2(id, 3.1)), 3.0);
  float th0 = hash12(vec2(id, 9.2)) * 6.2831;
  float arc = 0.62;
  float ang = mod(th - th0, 6.2831);
  float inArc = step(ang, arc) * smoothstep(0.0, 0.06, ang) * smoothstep(arc, arc - 0.03, ang);
  float line = exp(-pow((f - 0.5) * 3.2, 2.0) * 3.0 / (0.45 + b));
  vec3 tc = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.72, 0.55), hash12(vec2(id, 5.5)));
  col += tc * step(0.8, h) * inArc * line * (0.2 + b * 1.6);

  float hill = 0.17 + 0.07 * fbm2(vec2(p.x * 2.2, 3.0)) + 0.02 * sin(p.x * 5.0);
  float ground = 0.1 + 0.012 * sin(p.x * 3.0 + 1.0);
  vec3 hillCol = vec3(0.02, 0.012, 0.03);
  col = mix(col, hillCol, smoothstep(hill + 0.002, hill - 0.002, p.y));
  col = mix(col, vec3(0.006, 0.005, 0.01), smoothstep(ground + 0.002, ground - 0.002, p.y));

  // Lit tent
  float tx = aspect * 0.64;
  float tw = 0.13;
  float th2 = 0.15;
  float inTent = step(ground - 0.01, p.y) * step(p.y, ground + th2 * (1.0 - abs(p.x - tx) / tw));
  vec3 tent = mix(vec3(1.0, 0.6, 0.28), vec3(1.0, 0.36, 0.42), (p.y - ground) / th2) * 0.75;
  float door = step(ground - 0.01, p.y) * step(p.y, ground + th2 * 0.55 * (1.0 - abs(p.x - tx) / (tw * 0.3)));
  tent = mix(tent, vec3(1.0, 0.8, 0.45), door * 0.7);
  col = mix(col, tent, inTent);
  col += vec3(1.0, 0.5, 0.3) * 0.12 * exp(-length((p - vec2(tx, ground + 0.04)) * vec2(1.0, 1.8)) * 9.0);

  // Telescope on a tripod
  float tel = sdSeg(p, vec2(aspect * 0.4, ground + 0.12), vec2(aspect * 0.4 + 0.07, ground + 0.22)) - 0.011;
  tel = min(tel, sdSeg(p, vec2(aspect * 0.405, ground + 0.12), vec2(aspect * 0.38, ground)) - 0.0025);
  tel = min(tel, sdSeg(p, vec2(aspect * 0.405, ground + 0.12), vec2(aspect * 0.43, ground)) - 0.0025);
  tel = min(tel, sdSeg(p, vec2(aspect * 0.405, ground + 0.12), vec2(aspect * 0.405, ground - 0.004)) - 0.0025);
  col = mix(col, vec3(0.004), smoothstep(0.0015, -0.0015, tel));
  return col;
}

vec3 galaxy(vec2 p, vec2 px){
  p = rot(p, -0.5);
  vec2 q = vec2(p.x, p.y / 0.38);
  float r = length(q);
  float a = atan(q.y, q.x);
  float spiral = a - log(r + 0.0005) * 2.4;
  float arms = pow(0.5 + 0.5 * cos(2.0 * spiral), 3.0);
  float disc = exp(-r * 4.6);
  float n = fbm2(q * 14.0);
  float clumps = smoothstep(0.56, 0.9, fbm2(q * 30.0 + 3.0));
  float lane = smoothstep(0.4, 0.75, fbm2(q * 10.0 + 8.0)) * pow(0.5 + 0.5 * cos(2.0 * spiral + 0.9), 4.0) * smoothstep(0.03, 0.12, r);
  vec3 col = vec3(1.0, 0.86, 0.68) * exp(-r * r * 90.0) * 1.5 + vec3(1.0, 0.9, 0.8) * exp(-r * 11.0) * 0.35;
  col += mix(vec3(0.55, 0.62, 1.0), vec3(1.0, 0.45, 0.75), clumps * 0.8) * arms * disc * (0.5 + 0.9 * n) * 1.35;
  col += vec3(1.0, 0.36, 0.7) * clumps * arms * disc * 0.6;
  col *= 1.0 - lane * 0.78;
  col += stars(px, 0.5) * 0.75;
  return col;
}

void main(){
  float aspect = uRes.x / uRes.y;
  vec2 px = vUv * uRes;
  vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
  vec3 col;
  if (uMode < 0.5) col = moon(p * 2.0, px);
  else if (uMode < 1.5) col = saturn(p, px);
  else if (uMode < 2.5) col = pleiades(p, px);
  else if (uMode < 3.5) col = nebula(p, px);
  else if (uMode < 4.5) col = trails(vUv, px, aspect);
  else col = galaxy(p, px);
  col = 1.0 - exp(-col * 1.3);
  col += (hash12(px + uMode * 13.0) - 0.5) * 0.03;
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

export async function renderPlates(keys) {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  const material = new THREE.ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: frag,
    uniforms: { uMode: { value: 0 }, uRes: { value: new THREE.Vector2() } },
    depthTest: false,
  });
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  scene.add(mesh);
  const camera = new THREE.Camera();

  const urls = {};
  for (const key of keys) {
    const spec = PLATES[key];
    if (!spec) continue;
    renderer.setSize(spec.w, spec.h, false);
    material.uniforms.uMode.value = spec.mode;
    material.uniforms.uRes.value.set(spec.w, spec.h);
    renderer.render(scene, camera);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    if (blob) urls[key] = URL.createObjectURL(blob);
    await new Promise((res) => requestAnimationFrame(res)); // keep the main thread responsive
  }

  material.dispose();
  mesh.geometry.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return urls;
}
