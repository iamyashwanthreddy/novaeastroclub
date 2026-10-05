import { gsap, SplitText } from '../core/gsap.js';

// Gradient text can't survive being split into per-character boxes, so the
// gradient is re-expressed as a colour ramp across the characters instead.
function rampGradient(self) {
  self.chars?.forEach((c) => c.closest('.grad')?.classList.add('is-split'));
  const groups = new Map();
  self.chars?.forEach((c) => {
    const g = c.closest('.grad');
    if (!g) return;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(c);
  });
  const ramp = gsap.utils.interpolate('#8b63ff', '#ff3cac');
  groups.forEach((chars) => chars.forEach((c, i) => (c.style.color = ramp(chars.length > 1 ? i / (chars.length - 1) : 1))));
}

/** Major headings: characters rise out of a line mask, sharpening from blur. */
export function revealChars(el, { start = 'top 84%', delay = 0 } = {}) {
  let played = false;
  return SplitText.create(el, {
    type: 'chars,words,lines',
    mask: 'lines',
    autoSplit: true,
    onSplit(self) {
      rampGradient(self);
      if (played) return;
      return gsap.from(self.chars, {
        yPercent: 118,
        opacity: 0,
        filter: 'blur(10px)',
        rotate: 4,
        duration: 1.4,
        stagger: 0.018,
        ease: 'cosmic',
        delay,
        clearProps: 'filter',
        scrollTrigger: { trigger: el, start, once: true, onEnter: () => (played = true) },
      });
    },
  });
}

/** Supporting statements: whole lines slide up from behind a mask. */
export function revealLines(el, { start = 'top 86%' } = {}) {
  let played = false;
  return SplitText.create(el, {
    type: 'lines,words',
    mask: 'lines',
    autoSplit: true,
    onSplit(self) {
      rampGradient(self);
      if (played) return;
      return gsap.from(self.lines, {
        yPercent: 105,
        duration: 1.3,
        stagger: 0.09,
        ease: 'cosmic',
        scrollTrigger: { trigger: el, start, once: true, onEnter: () => (played = true) },
      });
    },
  });
}

/** Long statements: words light up as you read, scrubbed to scroll. */
export function scrubWords(el) {
  return SplitText.create(el, {
    type: 'words',
    autoSplit: true,
    onSplit(self) {
      return gsap.fromTo(
        self.words,
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.12,
          scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: 0.6 },
        }
      );
    },
  });
}

export function fadeUp(el, { start = 'top 88%' } = {}) {
  return gsap.from(el, { y: 40, opacity: 0, duration: 1.4, ease: 'cosmic', scrollTrigger: { trigger: el, start, once: true } });
}
