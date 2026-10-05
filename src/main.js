import '@fontsource/syncopate/400.css';
import '@fontsource/syncopate/700.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource/alegreya-sans/400.css';
import '@fontsource/alegreya-sans/500.css';
import '@fontsource/alegreya-sans/700.css';
import '@fontsource/alegreya-sans/800.css';
import 'lenis/dist/lenis.css';
import './styles/main.css';

import { gsap, ScrollTrigger } from './core/gsap.js';
import { detectDevice } from './core/device.js';
import { createScroll } from './core/scroll.js';
import { links } from './config.js';
import { createLoader } from './motion/loader.js';
import { initNav, initWayfinding } from './motion/nav.js';
import { initInteractions } from './motion/interactions.js';
import { setupHero, initSections } from './motion/sections.js';

const html = document.documentElement;

async function boot() {
  const device = detectDevice();
  html.classList.remove('no-js');
  html.classList.add('js', device.reduced ? 'reduced' : 'motion', `tier-${device.tier}`);
  if (!device.webgl) html.classList.add('no-webgl');

  // Always begin the journey at the launch pad; deep links are honoured after the intro.
  const hash = location.hash;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  wireJoinLinks();

  const scroll = createScroll(device);
  scroll.stop();

  const loader = createLoader(device);
  loader.track(
    Promise.all([
      document.fonts.load('700 1em Syncopate'),
      document.fonts.load('400 1em "Space Mono"'),
      document.fonts.load('400 1em "Alegreya Sans"'),
      document.fonts.load('700 1em "Alegreya Sans"'),
    ]).then(() => document.fonts.ready)
  );

  // The 3D scene is code-split so the page shell parses and paints first.
  const canvas = document.querySelector('.webgl');
  const scenePromise = device.webgl
    ? import('./webgl/Scene.js')
        .then(({ createScene }) => createScene({ canvas, device, scroll }))
        .catch((err) => {
          console.warn('[NAC] WebGL scene unavailable, using static sky.', err);
          html.classList.add('no-webgl');
          return null;
        })
    : Promise.resolve(null);
  loader.track(scenePromise);

  await loader.ready();
  const scene = await scenePromise;

  const heroIntro = setupHero(device);
  const navIntro = initNav({ scroll, device });
  initSections({ scene, scroll, device });
  initWayfinding();
  initInteractions(device);

  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  scene?.refresh();

  gsap
    .timeline({
      onComplete: () => {
        if (hash && hash.length > 1 && document.querySelector(hash)) scroll.to(hash);
      },
    })
    .add(loader.exit(), 0)
    .add(scene?.intro() ?? gsap.timeline(), 0.5)
    .add(navIntro(), 0.9)
    .add(heroIntro(), 0.75)
    .add(() => scroll.start(), device.reduced ? 0 : 1.6);

  // Illustrative plates render after the intro is under way.
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
  idle(() => loadPlates(device), { timeout: 2500 });

  // Late layout shifts (fonts, images) re-measure pins and scene anchors.
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

function wireJoinLinks() {
  document.querySelectorAll('[data-join]').forEach((a) => {
    a.href = links.registration;
    a.target = '_blank';
    a.rel = 'noopener';
  });
}

async function loadPlates(device) {
  const imgs = [...document.querySelectorAll('img[data-plate]')];
  if (!imgs.length || !device.webgl) return;
  try {
    const { renderPlates } = await import('./webgl/plates.js');
    const urls = await renderPlates([...new Set(imgs.map((i) => i.dataset.plate))]);
    imgs.forEach((img) => {
      const url = urls[img.dataset.plate];
      if (!url) return;
      img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
      img.src = url;
    });
  } catch (err) {
    console.warn('[NAC] Could not render illustrative plates.', err);
  }
}

boot();
