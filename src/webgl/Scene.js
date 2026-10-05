import * as THREE from 'three';
import { gsap, ScrollTrigger } from '../core/gsap.js';
import * as S from './shaders.js';

/*
  One persistent scene sits behind the whole page. Instead of every section
  owning its own canvas, each section declares where the planet, its rings,
  the orbits and the lunar body should be while it is on screen. The scene
  blends between those "shots" from the scroll position, so the page reads as
  one continuous camera move rather than a stack of separate effects.

  Positions are expressed in screen fractions (sx, sy in -1..1 of the visible
  half-extent at depth d) so compositions hold across aspect ratios.
*/

const SHOTS = [
  { sel: '#top', s: { psx: 0.58, psy: -0.5, pd: 16, psr: 0.6, tilt: 0.42, ring: 0.9, glow: 1, orbits: 0, lsx: 1.9, lsy: -1.4, lsr: 0.5, neb: 1, hue: 0.2, stars: 1 },
    portrait: { psx: 0.25, psy: -0.62, psr: 0.62 } },
  { sel: '#about', s: { psx: -0.95, psy: 0.7, pd: 34, psr: 0.34, tilt: 0.62, ring: 0.85, glow: 0.8, orbits: 0, lsx: 0.86, lsy: -0.42, lsr: 0.56, neb: 0.75, hue: 0.1, stars: 0.9 },
    portrait: { psx: -0.6, psy: 0.85, lsx: 0.78, lsy: -0.98, lsr: 0.62 } },
  { sel: '#experience', s: { psx: 0.42, psy: -0.02, pd: 22, psr: 0.3, tilt: 0.26, ring: 0.75, glow: 1, orbits: 1, lsx: 1.7, lsy: 1.0, lsr: 0.4, neb: 0.9, hue: 0.3, stars: 1 },
    portrait: { psx: 0.0, psy: 0.32, psr: 0.26 } },
  { sel: '#explore', s: { psx: 0.78, psy: 0.64, pd: 60, psr: 0.2, tilt: 0.5, ring: 0.8, glow: 1, orbits: 0, lsx: 1.8, lsy: 1.2, lsr: 0.4, neb: 1.1, hue: 0.75, stars: 1.1 } },
  { sel: '#programs', s: { psx: 0.86, psy: 1.62, pd: 40, psr: 0.3, tilt: 0.4, ring: 0.7, glow: 0.8, orbits: 0, lsx: -1.9, lsy: -1.2, lsr: 0.4, neb: 0.55, hue: 0.3, stars: 0.7 } },
  { sel: '#membership', s: { psx: 0.0, psy: -0.12, pd: 70, psr: 0.42, tilt: 0.07, ring: 1, glow: 1.5, orbits: 0, lsx: -1.9, lsy: -1.2, lsr: 0.4, neb: 1.2, hue: 0.5, stars: 0.9 } },
  { sel: '#gallery', s: { psx: -0.25, psy: -1.7, pd: 40, psr: 0.4, tilt: 0.3, ring: 0.8, glow: 1, orbits: 0, lsx: -1.9, lsy: -1.2, lsr: 0.4, neb: 0.6, hue: 0.4, stars: 0.75 } },
  { sel: '#crew', s: { psx: 0.84, psy: 0.5, pd: 50, psr: 0.2, tilt: 0.5, ring: 0.85, glow: 1, orbits: 0.3, lsx: -1.9, lsy: -1.2, lsr: 0.4, neb: 0.75, hue: 0.35, stars: 0.9 },
    portrait: { psx: 1.0, psy: 0.98, psr: 0.24 } },
  { sel: '#community', s: { psx: 0.72, psy: 0.12, pd: 36, psr: 0.26, tilt: 0.36, ring: 0.85, glow: 1.1, orbits: 0, lsx: -1.9, lsy: -1.2, lsr: 0.4, neb: 0.9, hue: 0.6, stars: 1 } },
  { sel: '#faq', s: { psx: 0.62, psy: 0.95, pd: 46, psr: 0.2, tilt: 0.4, ring: 0.7, glow: 0.8, orbits: 0, lsx: -1.9, lsy: -1.2, lsr: 0.4, neb: 0.5, hue: 0.4, stars: 0.75 } },
  { sel: '.finale', s: { psx: 0.0, psy: -1.34, pd: 14, psr: 0.9, tilt: 0.3, ring: 1, glow: 1.7, orbits: 0, lsx: -1.9, lsy: -1.2, lsr: 0.4, neb: 1.45, hue: 0.85, stars: 1.3 },
    portrait: { psy: -1.05, psr: 0.95 } },
];
const KEYS = Object.keys(SHOTS[0].s);

const LIGHT = new THREE.Vector3(-0.8, 0.38, 0.3).normalize();
const PURPLE = [0.353, 0.176, 1.0];
const PINK = [1.0, 0.235, 0.675];
const LAV = [0.561, 0.561, 0.784];

export function createScene({ canvas, device, scroll }) {
  const tierCfg = {
    high: { dpr: 1.75, stars: 9000, dust: 320, seg: 128, neb: 4 },
    mid: { dpr: 1.5, stars: 5500, dust: 200, seg: 96, neb: 4 },
    low: { dpr: 1.35, stars: 2800, dust: 90, seg: 64, neb: 5 },
  }[device.tier];
  const reduced = device.reduced;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: device.tier === 'high',
    alpha: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x050506, 1);
  let dpr = Math.min(window.devicePixelRatio || 1, tierCfg.dpr);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1500);
  scene.add(camera);

  /* ---------- Nebula (low-res target) ---------- */
  const nebulaRT = new THREE.WebGLRenderTarget(4, 4, {
    type: THREE.HalfFloatType,
    depthBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  const nebulaMat = new THREE.ShaderMaterial({
    vertexShader: S.fullscreenVert,
    fragmentShader: S.nebulaFrag,
    uniforms: {
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uScroll: { value: 0 },
      uIntensity: { value: 1 },
      uHue: { value: 0.2 },
      uMouse: { value: new THREE.Vector2() },
    },
    depthTest: false,
    depthWrite: false,
  });
  const nebulaScene = new THREE.Scene();
  const fsGeo = new THREE.PlaneGeometry(2, 2);
  nebulaScene.add(new THREE.Mesh(fsGeo, nebulaMat));
  const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const bgMat = new THREE.ShaderMaterial({
    vertexShader: S.fullscreenVert,
    fragmentShader: S.backgroundFrag,
    uniforms: { uNebula: { value: nebulaRT.texture }, uFade: { value: 0 } },
    depthTest: false,
    depthWrite: false,
  });
  const bg = new THREE.Mesh(fsGeo, bgMat);
  bg.frustumCulled = false;
  bg.renderOrder = -100;
  scene.add(bg);

  /* ---------- Star tunnel ---------- */
  const STAR_DEPTH = 700;
  const stars = makePoints({
    count: tierCfg.stars,
    spread: [260, 160],
    depth: STAR_DEPTH,
    near: 10,
    size: [0.35, 1.5],
    palette: [
      [0.78, [0.92, 0.93, 1.0]],
      [0.1, LAV],
      [0.07, PINK],
      [0.05, [1.0, 0.86, 0.72]],
    ],
  });
  stars.renderOrder = 0;
  scene.add(stars);

  // Near-field dust: big soft bokeh that parts around the pointer.
  const dust = makePoints({
    count: tierCfg.dust,
    spread: [28, 18],
    depth: 60,
    near: 2,
    size: [0.6, 2.4],
    bokeh: true,
    repel: device.finePointer ? 0.09 : 0,
    palette: [
      [0.5, LAV],
      [0.3, PURPLE],
      [0.2, PINK],
    ],
  });
  dust.material.uniforms.uBright.value = 0.22;
  dust.renderOrder = 6;
  scene.add(dust);

  /* ---------- Planet rig ---------- */
  const rig = new THREE.Group();
  scene.add(rig);
  const tiltGroup = new THREE.Group();
  tiltGroup.rotation.z = -0.32; // echoes the logo's ring angle
  rig.add(tiltGroup);

  const planetMat = new THREE.ShaderMaterial({
    vertexShader: S.planetVert,
    fragmentShader: S.planetFrag,
    uniforms: {
      uLight: { value: LIGHT },
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3() },
      uRadius: { value: 1 },
      uRingNormal: { value: new THREE.Vector3(0, 1, 0) },
      uRingAlpha: { value: 1 },
    },
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1, tierCfg.seg, Math.round(tierCfg.seg * 0.75)), planetMat);
  tiltGroup.add(planet);

  const atmoMat = new THREE.ShaderMaterial({
    vertexShader: S.atmoVert,
    fragmentShader: S.atmoFrag,
    uniforms: { uLight: { value: LIGHT }, uGlow: { value: 1 } },
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.2, 64, 48), atmoMat);
  atmo.renderOrder = 2;
  tiltGroup.add(atmo);

  const ringMat = new THREE.ShaderMaterial({
    vertexShader: S.ringVert,
    fragmentShader: S.ringFrag,
    uniforms: {
      uLight: { value: LIGHT },
      uCenter: { value: new THREE.Vector3() },
      uRadius: { value: 1 },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
    },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.38, 2.35, 256, 1), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.renderOrder = 3;
  tiltGroup.add(ring);

  // Orbits with moons, revealed in "What we do"
  const orbitGroup = new THREE.Group();
  orbitGroup.rotation.set(1.16, 0, -0.2);
  rig.add(orbitGroup);
  const moonGeo = new THREE.SphereGeometry(1, 24, 16);
  const orbits = [
    { r: 2.9, tilt: 0.0, speed: 1, size: 0.09 },
    { r: 3.6, tilt: 0.12, speed: 0.72, size: 0.13 },
    { r: 4.4, tilt: -0.08, speed: 0.55, size: 0.07 },
    { r: 5.3, tilt: 0.18, speed: 0.4, size: 0.1 },
  ].map((o, i) => {
    const pts = 256;
    const pos = new Float32Array(pts * 3);
    const t = new Float32Array(pts);
    for (let k = 0; k < pts; k++) {
      const a = (k / pts) * Math.PI * 2;
      pos.set([Math.cos(a) * o.r, Math.sin(a) * o.r, 0], k * 3);
      t[k] = k / pts;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(t, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: S.orbitVert,
      fragmentShader: S.orbitFrag,
      uniforms: {
        uPhase: { value: i * 0.25 },
        uAlpha: { value: 0 },
        uColor: { value: new THREE.Vector3(...(i % 2 ? PINK : LAV)) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.LineLoop(g, m);
    line.renderOrder = 4;
    const holder = new THREE.Group();
    holder.rotation.x = o.tilt;
    holder.add(line);
    const moon = new THREE.Mesh(moonGeo, rockMaterial({ tint: [0.95, 0.92, 1.05], detail: 0 }));
    moon.scale.setScalar(o.size);
    holder.add(moon);
    orbitGroup.add(holder);
    return { ...o, line, moon, mat: m, phase: i * 0.25 };
  });

  /* ---------- Lunar body (About) ---------- */
  const luna = new THREE.Mesh(
    new THREE.SphereGeometry(1, tierCfg.seg, Math.round(tierCfg.seg * 0.75)),
    rockMaterial({ tint: [0.86, 0.83, 0.94], detail: device.tier === 'low' ? 0 : 1 })
  );
  luna.rotation.set(0.3, 0.8, 0);
  scene.add(luna);

  /* ---------- Meteor ---------- */
  const meteorMat = new THREE.ShaderMaterial({
    vertexShader: S.meteorVert,
    fragmentShader: S.meteorFrag,
    uniforms: { uAlpha: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const meteor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), meteorMat);
  meteor.visible = false;
  meteor.renderOrder = 7;
  camera.add(meteor);

  /* ---------- State ---------- */
  const state = { ...SHOTS[0].s };
  const target = { ...SHOTS[0].s };
  const intro = { z: reduced ? 0 : 160, fov: reduced ? 0 : 34, fade: reduced ? 1 : 0, spin: 0 };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let orbitProgress = 0;
  let orbitSmooth = 0;
  let anchors = [];
  let elapsed = 0;
  let travel = 0;
  let fovKick = 0;
  let width = 1;
  let height = 1;
  let needsRender = true;

  function resolveShot(shot) {
    const portrait = width / height < 0.85;
    return portrait && shot.portrait ? { ...shot.s, ...shot.portrait } : shot.s;
  }

  function refreshAnchors() {
    const vh = window.innerHeight;
    const sy = window.scrollY;
    anchors = SHOTS.map((shot) => {
      const el = document.querySelector(shot.sel);
      if (!el) return null;
      const box = el.parentElement?.classList.contains('pin-spacer') ? el.parentElement : el;
      const r = box.getBoundingClientRect();
      const top = r.top + sy;
      const a0 = Math.max(0, top - vh * 0.3);
      const a1 = Math.max(a0, top + box.offsetHeight - vh * 1.2);
      return { a0, a1, s: resolveShot(shot) };
    }).filter(Boolean);
    anchors[0].a0 = 0;
    needsRender = true;
  }

  const smooth = (t) => t * t * (3 - 2 * t);
  function sampleShots(y) {
    if (!anchors.length) return;
    if (y <= anchors[0].a1) return assign(target, anchors[0].s);
    for (let i = 1; i < anchors.length; i++) {
      const prev = anchors[i - 1];
      const cur = anchors[i];
      if (y < cur.a0) {
        const t = smooth(gsap.utils.clamp(0, 1, (y - prev.a1) / Math.max(1, cur.a0 - prev.a1)));
        for (const k of KEYS) target[k] = prev.s[k] + (cur.s[k] - prev.s[k]) * t;
        return;
      }
      if (y <= cur.a1) return assign(target, cur.s);
    }
    assign(target, anchors[anchors.length - 1].s);
  }

  /* ---------- Resize ---------- */
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    // On touch devices ignore the small height changes from the URL bar.
    if (w === width && Math.abs(h - height) < 140 && !device.finePointer && height > 1) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    nebulaRT.setSize(Math.ceil((w * dpr) / tierCfg.neb), Math.ceil((h * dpr) / tierCfg.neb));
    nebulaMat.uniforms.uAspect.value = w / h;
    for (const pts of [stars, dust]) {
      pts.material.uniforms.uPixelRatio.value = dpr;
      pts.material.uniforms.uAspect.value = w / h;
    }
    needsRender = true;
  }

  /* ---------- Pointer ---------- */
  if (device.finePointer && !reduced) {
    window.addEventListener(
      'pointermove',
      (e) => {
        mouse.tx = (e.clientX / width) * 2 - 1;
        mouse.ty = -((e.clientY / height) * 2 - 1);
      },
      { passive: true }
    );
  }

  /* ---------- Placement helpers ---------- */
  const tanHalf = () => Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const tmpQ = new THREE.Quaternion();
  const ringNormal = new THREE.Vector3();

  function place(obj, sx, sy, d, sr, baseZ) {
    const halfH = tanHalf() * d;
    const halfW = halfH * camera.aspect;
    obj.position.set(sx * halfW, sy * halfH, baseZ - d);
    obj.scale.setScalar(Math.max(0.0001, sr * Math.min(halfH, halfW)));
  }

  /* ---------- Frame ---------- */
  let frames = 0;
  let slowFrames = 0;
  function tick(_time, deltaMs) {
    const dt = Math.min(deltaMs / 1000, 0.05);
    const y = scroll.y;
    const v = scroll.velocity;

    if (!reduced) elapsed += dt;
    sampleShots(y);

    const k = reduced ? 1 : 1 - Math.exp(-dt * 2.6);
    let moved = false;
    for (const key of KEYS) {
      const delta = target[key] - state[key];
      if (Math.abs(delta) > 1e-4) moved = true;
      state[key] += delta * k;
    }

    mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 3));
    mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 3));

    // Constant gentle drift forward, plus scroll-driven travel.
    if (!reduced) travel += dt * 1.4;
    const camZ = intro.z - travel - y * 0.09;
    const warp = reduced ? 0 : gsap.utils.clamp(0, 1, Math.abs(v) / 60);
    fovKick += (warp * 7 - fovKick) * (1 - Math.exp(-dt * 4));

    camera.fov = 45 + intro.fov + fovKick;
    camera.updateProjectionMatrix();
    camera.position.set(mouse.x * 0.9, mouse.y * 0.55, camZ);
    camera.rotation.set(mouse.y * 0.025, -mouse.x * 0.04, 0);

    // Planet rig
    place(rig, state.psx, state.psy, state.pd, state.psr, camZ);
    tiltGroup.rotation.x = state.tilt + mouse.y * 0.05;
    planet.rotation.y = elapsed * 0.035 + mouse.x * 0.2 + intro.spin;
    ring.material.uniforms.uOpacity.value = state.ring;
    atmoMat.uniforms.uGlow.value = state.glow;

    rig.updateMatrixWorld(true);
    planetMat.uniforms.uCenter.value.copy(rig.position);
    planetMat.uniforms.uRadius.value = rig.scale.x;
    planetMat.uniforms.uRingAlpha.value = state.ring;
    planetMat.uniforms.uTime.value = elapsed;
    ringMat.uniforms.uCenter.value.copy(rig.position);
    ringMat.uniforms.uRadius.value = rig.scale.x;
    ringMat.uniforms.uTime.value = elapsed;
    tiltGroup.getWorldQuaternion(tmpQ);
    ringNormal.set(0, 1, 0).applyQuaternion(tmpQ);
    planetMat.uniforms.uRingNormal.value.copy(ringNormal);

    // Orbits: idle drift + scroll-scrubbed sweep through "What we do"
    orbitSmooth += (orbitProgress - orbitSmooth) * (reduced ? 1 : 1 - Math.exp(-dt * 4));
    const orbitVisible = state.orbits > 0.01;
    orbitGroup.visible = orbitVisible;
    if (orbitVisible) {
      orbitGroup.rotation.z = -0.2 + orbitSmooth * 0.6;
      for (const o of orbits) {
        o.phase = (o.phase + dt * 0.02 * o.speed) % 1;
        const ph = o.phase + orbitSmooth * o.speed * 1.5;
        const a = ph * Math.PI * 2;
        o.moon.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r, 0);
        o.mat.uniforms.uPhase.value = ph % 1;
        o.mat.uniforms.uAlpha.value = state.orbits * 0.85;
        o.moon.visible = state.orbits > 0.2;
      }
    }

    // Lunar body
    place(luna, state.lsx, state.lsy, 20, state.lsr, camZ);
    luna.rotation.y = 0.8 + elapsed * 0.01 + y * 0.00012;
    luna.visible = Math.abs(state.lsx) < 1.75 && Math.abs(state.lsy) < 1.6;

    // Stars & dust
    const starU = stars.material.uniforms;
    starU.uTime.value = elapsed;
    starU.uCamZ.value = camZ;
    starU.uWarp.value = warp;
    starU.uBright.value = state.stars * (0.35 + intro.fade * 0.65);
    const dustU = dust.material.uniforms;
    dustU.uTime.value = elapsed;
    dustU.uCamZ.value = camZ;
    dustU.uWarp.value = warp;
    dustU.uMouse.value.set(mouse.tx, mouse.ty);

    // Nebula
    nebulaMat.uniforms.uTime.value = elapsed;
    nebulaMat.uniforms.uScroll.value = y * 0.00018;
    nebulaMat.uniforms.uIntensity.value = state.neb;
    nebulaMat.uniforms.uHue.value = state.hue;
    nebulaMat.uniforms.uMouse.value.set(mouse.x, mouse.y);
    bgMat.uniforms.uFade.value = intro.fade;

    if (reduced && !moved && !needsRender) return;
    needsRender = false;

    renderer.setRenderTarget(nebulaRT);
    renderer.render(nebulaScene, orthoCam);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);

    // Adaptive resolution: if the first seconds run slow, step the pixel ratio down.
    if (!reduced && frames < 240) {
      frames++;
      if (frames > 60 && deltaMs > 24) slowFrames++;
      if (frames === 240 && slowFrames > 90 && dpr > 1) {
        dpr = Math.max(1, dpr * 0.75);
        renderer.setPixelRatio(dpr);
        height = 0; // force resize
        resize();
      }
    }
  }

  /* ---------- Meteors ---------- */
  function shootMeteor() {
    if (document.hidden) return schedule();
    const side = Math.random() < 0.5 ? -1 : 1;
    const d = 60;
    const halfH = tanHalf() * d;
    const halfW = halfH * camera.aspect;
    const angle = side > 0 ? -0.5 - Math.random() * 0.35 : Math.PI + 0.5 + Math.random() * 0.35;
    const len = halfW * (0.25 + Math.random() * 0.2);
    const sx = -side * halfW * (0.1 + Math.random() * 0.6);
    const sy = halfH * (0.35 + Math.random() * 0.55);
    const dir = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
    const travelDist = halfW * (0.6 + Math.random() * 0.5);

    meteor.visible = true;
    meteor.rotation.z = angle;
    meteor.scale.set(len, len * 0.012, 1);
    const p = { t: 0 };
    gsap.timeline({ onComplete: () => ((meteor.visible = false), schedule()) })
      .to(p, {
        t: 1,
        duration: 1.1,
        ease: 'power2.in',
        onUpdate: () => {
          meteor.position.set(sx + dir.x * travelDist * p.t, sy + dir.y * travelDist * p.t, -d);
        },
      })
      .fromTo(meteorMat.uniforms.uAlpha, { value: 0 }, { value: 1, duration: 0.25, ease: 'power1.out' }, 0)
      .to(meteorMat.uniforms.uAlpha, { value: 0, duration: 0.4, ease: 'power1.in' }, 0.7);
  }
  function schedule() {
    gsap.delayedCall(gsap.utils.random(7, 15), shootMeteor);
  }

  /* ---------- Public API ---------- */
  resize();
  window.addEventListener('resize', resize);
  ScrollTrigger.addEventListener('refresh', refreshAnchors);
  refreshAnchors();
  renderer.compile(scene, camera);
  gsap.ticker.add(tick);

  return {
    // The camera falls out of warp into the hero composition.
    intro() {
      if (reduced) return gsap.timeline();
      return gsap
        .timeline()
        .to(intro, { fade: 1, duration: 1.6, ease: 'power2.out' }, 0)
        .to(intro, { z: 0, duration: 3.2, ease: 'expo.out' }, 0)
        .to(intro, { fov: 0, duration: 3.2, ease: 'expo.out' }, 0)
        .fromTo(intro, { spin: -1.2 }, { spin: 0, duration: 4, ease: 'expo.out' }, 0)
        .add(() => schedule(), 3);
    },
    setOrbitProgress(p) {
      orbitProgress = p;
    },
    refresh: refreshAnchors,
    renderer,
  };

  /* ---------- Factories ---------- */
  function makePoints({ count, spread, depth, near, size, palette, bokeh = false, repel = 0 }) {
    const pos = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const colors = new Float32Array(count * 3);
    const cum = [];
    let acc = 0;
    for (const [w, c] of palette) cum.push([(acc += w), c]);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * spread[0];
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * spread[1];
      pos[i * 3 + 2] = -Math.random() * depth;
      const r = Math.random();
      sizes[i] = size[0] + Math.pow(r, 3) * (size[1] - size[0]);
      seeds[i] = Math.random();
      const pick = Math.random() * acc;
      const c = cum.find(([w]) => pick <= w)[1];
      colors.set(c, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    const m = new THREE.ShaderMaterial({
      vertexShader: S.starsVert,
      fragmentShader: S.starsFrag,
      uniforms: {
        uTime: { value: 0 },
        uCamZ: { value: 0 },
        uDepth: { value: depth },
        uNear: { value: near },
        uPixelRatio: { value: 1 },
        uWarp: { value: 0 },
        uBright: { value: 1 },
        uScale: { value: bokeh ? 1.6 : 1 },
        uRepel: { value: repel },
        uAspect: { value: 1 },
        uMouse: { value: new THREE.Vector2(9, 9) },
        uBokeh: { value: bokeh ? 1 : 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    return pts;
  }

  function rockMaterial({ tint, detail }) {
    return new THREE.ShaderMaterial({
      vertexShader: S.planetVert,
      fragmentShader: S.rockFrag,
      uniforms: {
        uLight: { value: LIGHT },
        uTint: { value: new THREE.Vector3(...tint) },
        uDetail: { value: detail },
      },
    });
  }
}

function assign(to, from) {
  for (const k of KEYS) to[k] = from[k];
}
