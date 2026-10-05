import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap.js';

// One smooth-scroll instance, driven by the GSAP ticker so Lenis, ScrollTrigger
// and the WebGL render all share a single requestAnimationFrame.
export function createScroll(device) {
  let lenis = null;

  if (!device.reduced) {
    lenis = new Lenis({
      lerp: device.tier === 'low' ? 0.12 : 0.085,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.1,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const api = {
    lenis,
    get y() {
      return lenis ? lenis.animatedScroll : window.scrollY;
    },
    get velocity() {
      return lenis ? lenis.velocity : 0;
    },
    to(target, opts = {}) {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el && typeof target !== 'number') return;
      if (lenis) {
        lenis.scrollTo(el ?? target, {
          duration: 1.8,
          easing: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
          ...opts,
        });
      } else if (typeof target === 'number') {
        window.scrollTo(0, target);
      } else {
        el.scrollIntoView({ behavior: device.reduced ? 'auto' : 'smooth' });
      }
    },
    stop() {
      lenis?.stop();
      document.documentElement.classList.add('is-locked');
    },
    start() {
      lenis?.start();
      document.documentElement.classList.remove('is-locked');
    },
  };

  // In-page anchors go through the smooth scroller.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-join-external')) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    api.to(id === '#top' ? 0 : el);
    if (id === '#main') el.setAttribute('tabindex', '-1'), el.focus({ preventScroll: true });
  });

  return api;
}
