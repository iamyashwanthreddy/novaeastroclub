import { gsap } from '../core/gsap.js';

const qa = (s, r = document) => [...r.querySelectorAll(s)];

/* Desktop-only: none of this runs on touch or with reduced motion. */
export function initInteractions(device) {
  if (!device.finePointer || device.reduced) return;
  initCursor();
  initMagnetic();
  initLight();
  initTilt();
}

function initCursor() {
  document.documentElement.classList.add('has-cursor');
  const root = document.querySelector('.cursor');
  const dot = root.querySelector('.cursor__dot');
  const ring = root.querySelector('.cursor__ring');
  const glow = root.querySelector('.cursor__glow');
  const label = root.querySelector('.cursor__label');
  const follow = (el, duration, ease = 'power3') => [
    gsap.quickTo(el, 'x', { duration, ease }),
    gsap.quickTo(el, 'y', { duration, ease }),
  ];
  const [dx, dy] = follow(dot, 0.1);
  const [rx, ry] = follow(ring, 0.45);
  const [gx, gy] = follow(glow, 1.6, 'power2');
  gsap.set([dot, ring, glow], { x: innerWidth / 2, y: innerHeight / 2 });

  window.addEventListener(
    'pointermove',
    (e) => {
      dx(e.clientX), dy(e.clientY), rx(e.clientX), ry(e.clientY), gx(e.clientX), gy(e.clientY);
      root.classList.remove('is-hidden');
    },
    { passive: true }
  );
  document.documentElement.addEventListener('pointerleave', () => root.classList.add('is-hidden'));
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor], a, button');
    const text = t?.dataset.cursor;
    root.classList.toggle('is-label', !!text);
    root.classList.toggle('is-link', !!t && !text);
    if (text) label.textContent = text;
  });
}

function initMagnetic() {
  qa('[data-magnetic]').forEach((el) => {
    const inner = el.querySelector('span') || el;
    const ease = 'elastic.out(1, 0.38)';
    const xTo = gsap.quickTo(el, 'x', { duration: 0.9, ease });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.9, ease });
    const ixTo = gsap.quickTo(inner, 'x', { duration: 0.9, ease });
    const iyTo = gsap.quickTo(inner, 'y', { duration: 0.9, ease });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      xTo(mx * 0.28), yTo(my * 0.38), ixTo(mx * 0.12), iyTo(my * 0.16);
    });
    el.addEventListener('pointerleave', () => (xTo(0), yTo(0), ixTo(0), iyTo(0)));
  });
}

// Cards catch a soft light (and a lit edge) where the pointer is.
function initLight() {
  qa('.js-light').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
      el.style.setProperty('--lo', '1');
    });
    el.addEventListener('pointerleave', () => el.style.setProperty('--lo', '0'));
  });
}

function initTilt() {
  qa('.js-tilt').forEach((card) => {
    const inner = card.querySelector('.plan__inner');
    const rx = gsap.quickTo(inner, 'rotationX', { duration: 0.8, ease: 'power3' });
    const ry = gsap.quickTo(inner, 'rotationY', { duration: 0.8, ease: 'power3' });
    gsap.set(inner, { transformPerspective: 1200 });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 9);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
    });
    card.addEventListener('pointerleave', () => (rx(0), ry(0)));
  });
}
