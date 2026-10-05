import { gsap } from '../core/gsap.js';

// Short by design: it covers font loading and shader compilation, then opens
// like a telescope iris onto the scene that's already rendering behind it.
export function createLoader(device) {
  const root = document.querySelector('.loader');
  const countEl = root.querySelector('.loader__count');
  const labelEl = root.querySelector('.loader__label');
  const trackEl = root.querySelector('.loader__track');
  const tasks = [];
  let settled = 0;
  const shown = { v: 0 };
  const startedAt = performance.now();
  const MIN_MS = device.reduced ? 150 : 1250;

  const render = () => {
    countEl.textContent = String(Math.round(shown.v)).padStart(3, '0');
    trackEl.style.strokeDashoffset = String(553 * (1 - shown.v / 100));
  };
  const progressTo = (v, duration = 0.6) =>
    new Promise((resolve) => gsap.to(shown, { v, duration, ease: 'power2.out', overwrite: true, onUpdate: render, onComplete: resolve }));

  progressTo(24, 0.9);

  return {
    track(promise) {
      tasks.push(
        Promise.resolve(promise)
          .catch(() => {})
          // Braces matter: returning the progress promise would make this task wait on a
        // tween that a later progress update may overwrite (and so never resolve).
        .finally(() => {
          progressTo(24 + (66 * ++settled) / tasks.length);
        })
      );
    },
    async ready() {
      await Promise.race([Promise.all(tasks), new Promise((r) => setTimeout(r, 6000))]);
      const wait = MIN_MS - (performance.now() - startedAt);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      await progressTo(100, device.reduced ? 0.1 : 0.45);
    },
    exit() {
      const tl = gsap.timeline({ onComplete: () => root.classList.add('is-done') });
      if (device.reduced) return tl.to(root, { opacity: 0, duration: 0.4, ease: 'power1.out' });
      tl.to(labelEl, { duration: 0.5, scrambleText: { text: 'Ready for launch', chars: 'upperCase', speed: 0.6 } }, 0)
        .to('.loader__status', { opacity: 0, duration: 0.35 }, 0.45)
        .to('.loader__word', { opacity: 0, y: -12, duration: 0.45, ease: 'power2.in' }, 0.3)
        .to('.loader__svg', { scale: 1.35, opacity: 0, duration: 0.7, ease: 'power3.in' }, 0.35)
        .to(root, { '--r': '160vmax', duration: 1.6, ease: 'aperture' }, 0.55);
      return tl;
    },
  };
}
