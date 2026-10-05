import { gsap, ScrollTrigger, SplitText } from '../core/gsap.js';
import { revealChars, revealLines, scrubWords, fadeUp } from './text.js';

const q = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => [...r.querySelectorAll(s)];

/* ------------------------------------------------------------------
   Hero — split once, outside matchMedia, so the intro can be played
   by main.js the moment the loader's iris opens.
------------------------------------------------------------------- */
export function setupHero(device) {
  const lines = qa('.hero__line');
  if (device.reduced) return () => gsap.timeline();
  const splits = lines.map((l) => SplitText.create(l, { type: 'chars,lines', mask: 'lines' }));

  return function intro() {
    const tl = gsap.timeline();
    splits.forEach((s, li) => {
      const mid = (s.chars.length - 1) / 2;
      // Characters converge from a wide spread: a letter-spacing pull done with transforms.
      tl.from(
        s.chars,
        {
          yPercent: 115,
          x: (i) => (i - mid) * 26,
          opacity: 0,
          filter: 'blur(16px)',
          duration: 2,
          ease: 'cosmic',
          stagger: { each: 0.05, from: 'center' },
          clearProps: 'filter',
        },
        0.1 + li * 0.2
      );
    });
    tl.from('.hero__eyebrow', { opacity: 0, y: 20, duration: 1.2 }, 0.2)
      .from('.hero__copy > *', { opacity: 0, y: 30, stagger: 0.12, duration: 1.5 }, 0.9)
      .from('.hero__ctas > *', { opacity: 0, yPercent: 70, stagger: 0.1, duration: 1.5 }, 1.05)
      .from('.hero__foot > *', { opacity: 0, y: 20, stagger: 0.1, duration: 1.2 }, 1.25);
    return tl;
  };
}

/* ------------------------------------------------------------------
   Everything scroll-driven.
------------------------------------------------------------------- */
export function initSections({ scene, scroll, device }) {
  initFaq();
  initLightbox(scroll);

  const mm = gsap.matchMedia();
  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 900px)',
    },
    (ctx) => {
      const { motion, desktop } = ctx.conditions;
      if (!motion) return reducedMotion(scene);

      headings();
      counters();
      hero(desktop);
      about();
      experience(scene, desktop);
      const stopShear = explore(desktop, scroll);
      programs();
      membership(desktop);
      gallery(desktop);
      crew();
      community();
      faq();
      finale();
      const stopMarquee = footer(scroll);
      // Ticker callbacks aren't owned by the matchMedia context; remove them on revert.
      return () => {
        stopShear?.();
        stopMarquee?.();
      };
    }
  );
  return mm;
}

/* ---------- Shared ---------- */
function headings() {
  qa('[data-reveal]').forEach((el) => {
    const type = el.dataset.reveal;
    if (type === 'chars') revealChars(el);
    else if (type === 'lines') revealLines(el);
    else if (type === 'words') scrubWords(el);
    else if (type === 'fade') fadeUp(el);
  });
}

function counters() {
  qa('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (!end) return;
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: end,
      duration: 2.2,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = Math.round(o.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}

/* ---------- Hero: lines part as the camera pushes through ---------- */
function hero(desktop) {
  const [l1, l2] = qa('.hero__line');
  gsap
    .timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to(l1, { xPercent: desktop ? -14 : -8, ease: 'none' }, 0)
    .to(l2, { xPercent: desktop ? 12 : 8, ease: 'none' }, 0)
    .to('.hero__inner', { yPercent: -18, opacity: 0, ease: 'power1.in' }, 0)
    .to('.hero__foot', { opacity: 0, y: -40, ease: 'power2.in' }, 0);
}

/* ---------- About: "What's out there?" falls in from deep space ---------- */
function about() {
  gsap.from('.fact', {
    y: 50,
    opacity: 0,
    duration: 1.4,
    stagger: 0.1,
    scrollTrigger: { trigger: '.facts', start: 'top 85%', once: true },
  });

  const ask = q('.ask');
  const split = SplitText.create(ask, { type: 'words,chars' });
  gsap.fromTo(
    split.chars,
    { opacity: 0, z: (i) => -900 - (i % 3) * 300, rotationX: -70, yPercent: 40, transformPerspective: 700 },
    {
      opacity: 1,
      z: 0,
      rotationX: 0,
      yPercent: 0,
      ease: 'drift',
      stagger: { each: 0.04, from: 'center' },
      scrollTrigger: { trigger: ask, start: 'top 92%', end: 'top 42%', scrub: 1 },
    }
  );
}

/* ---------- Experience: pinned, the scene's orbits sweep with scroll ---------- */
function experience(scene, desktop) {
  const section = q('.experience');
  const frame = q('.experience__frame');
  const items = qa('.exp__item');
  const navItems = qa('.exp-nav__item');
  const bar = q('.exp-nav__bar i');

  const parts = items.map((item) => ({
    item,
    num: q('.exp__num', item),
    chars: SplitText.create(q('.exp__title', item), { type: 'words,chars', mask: 'chars' }).chars,
    lines: SplitText.create(q('.exp__text', item), { type: 'lines', mask: 'lines' }).lines,
  }));
  gsap.set(items.slice(1), { autoAlpha: 0 });

  let active = 0;
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + window.innerHeight * (desktop ? 3.4 : 2.6),
      pin: frame,
      pinSpacing: true,
      scrub: 0.9,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate(self) {
        scene?.setOrbitProgress(self.progress);
        gsap.set(bar, { scaleX: self.progress });
        const idx = Math.min(items.length - 1, Math.floor(self.progress * items.length * 0.999));
        if (idx !== active) {
          navItems[active]?.classList.remove('is-active');
          navItems[idx]?.classList.add('is-active');
          active = idx;
        }
      },
      onLeaveBack: () => scene?.setOrbitProgress(0),
    },
  });

  parts.forEach(({ item, num, chars, lines }, i) => {
    if (i > 0) {
      tl.set(item, { autoAlpha: 1 })
        .from(chars, { yPercent: 110, stagger: 0.035, duration: 0.6, ease: 'power3.out' }, '<')
        .from(num, { opacity: 0, x: -20, duration: 0.4, ease: 'power2.out' }, '<')
        .from(lines, { yPercent: 105, stagger: 0.06, duration: 0.5, ease: 'power3.out' }, '<0.12');
    }
    tl.to({}, { duration: 0.7 });
    if (i < parts.length - 1) {
      tl.to(chars, { yPercent: -110, stagger: 0.025, duration: 0.45, ease: 'power3.in' })
        .to(lines, { yPercent: -105, stagger: 0.03, duration: 0.4, ease: 'power3.in' }, '<')
        .to(num, { opacity: 0, duration: 0.3 }, '<')
        .set(item, { autoAlpha: 0 });
    }
  });
}

/* ---------- Explore: vertical scroll becomes a horizontal voyage ---------- */
function explore(desktop, scroll) {
  const section = q('.explore');
  const panels = qa('.xpanel');

  if (!desktop) {
    panels.forEach((panel) => {
      const media = q('.xpanel__media', panel);
      gsap.fromTo(
        media,
        { clipPath: 'inset(22% 12% 22% 12% round 22px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none', scrollTrigger: { trigger: media, start: 'top 92%', end: 'top 40%', scrub: true } }
      );
      gsap.fromTo(q('img', media), { yPercent: -8, scale: 1.25 }, { yPercent: 8, scale: 1.25, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from(qa('.xpanel__body > :not(.xpanel__num)', panel), {
        y: 40,
        opacity: 0,
        stagger: 0.08,
        duration: 1.2,
        scrollTrigger: { trigger: q('.xpanel__body', panel), start: 'top 88%', once: true },
      });
    });
    return;
  }

  const track = q('.explore__track');
  const bar = q('.explore__bar i');
  const count = q('.explore__count');
  const distance = () => track.scrollWidth - window.innerWidth;
  let inView = false;

  const voyage = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top top',
      end: () => '+=' + distance(),
      pin: q('.explore__viewport'),
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onToggle: (s) => (inView = s.isActive),
      onUpdate(self) {
        gsap.set(bar, { scaleX: self.progress });
        const n = Math.min(panels.length, Math.max(1, Math.round(self.progress * panels.length + 0.5)));
        count.textContent = `0${n} / 0${panels.length}`;
      },
    },
  });

  // Velocity shear: panels lean into fast scrolling, then settle.
  const skew = gsap.quickTo(panels, 'skewX', { duration: 0.7, ease: 'power3' });
  const clampSkew = gsap.utils.clamp(-5, 5);
  let last = 0;
  const shear = () => {
    if (!inView && last === 0) return;
    const s = inView ? clampSkew(-scroll.velocity * 0.12) : 0;
    if (Math.abs(s - last) > 0.05 || (s === 0 && last !== 0)) skew((last = Math.abs(s) < 0.05 ? 0 : s));
  };
  gsap.ticker.add(shear);

  panels.forEach((panel) => {
    const media = q('.xpanel__media', panel);
    const st = { trigger: panel, containerAnimation: voyage, scrub: true };
    gsap.fromTo(
      media,
      { clipPath: 'inset(16% 28% 16% 28% round 40px)', scale: 0.92 },
      { clipPath: 'inset(0% 0% 0% 0% round 22px)', scale: 1, ease: 'none', scrollTrigger: { ...st, start: 'left 100%', end: 'left 30%' } }
    );
    gsap.fromTo(q('img', media), { xPercent: -10, scale: 1.3 }, { xPercent: 10, scale: 1.3, ease: 'none', scrollTrigger: { ...st, start: 'left right', end: 'right left' } });
    gsap.fromTo(q('.xpanel__num', panel), { xPercent: 70 }, { xPercent: -70, ease: 'none', scrollTrigger: { ...st, start: 'left right', end: 'right left' } });
    gsap.from(qa('.xpanel__body > :not(.xpanel__num)', panel), {
      y: 60,
      opacity: 0,
      stagger: 0.07,
      duration: 1.2,
      ease: 'cosmic',
      scrollTrigger: { trigger: panel, containerAnimation: voyage, start: 'left 62%', toggleActions: 'play none none reverse' },
    });
  });

  gsap.from('.explore__intro > :not(h2)', {
    y: 40,
    opacity: 0,
    stagger: 0.1,
    duration: 1.3,
    scrollTrigger: { trigger: section, start: 'top 70%', once: true },
  });

  return () => gsap.ticker.remove(shear);
}

/* ---------- Programs ---------- */
function programs() {
  // Monthly cards rise toward the viewer out of the background.
  gsap.fromTo(
    '.month',
    { z: -520, rotationX: -36, yPercent: 45, opacity: 0, transformOrigin: '50% 100%' },
    {
      z: 0,
      rotationX: 0,
      yPercent: 0,
      opacity: 1,
      duration: 1.7,
      stagger: 0.1,
      ease: 'cosmic',
      scrollTrigger: { trigger: '.months', start: 'top 86%', once: true },
    }
  );
  gsap.from('.month__icon', {
    scale: 0,
    rotate: -90,
    duration: 1.4,
    stagger: 0.1,
    delay: 0.4,
    ease: 'back.out(2.2)',
    scrollTrigger: { trigger: '.months', start: 'top 86%', once: true },
  });
  gsap.from('.tally p', { y: 50, opacity: 0, stagger: 0.12, duration: 1.4, scrollTrigger: { trigger: '.tally', start: 'top 88%', once: true } });

  // Event rows roll up from behind their own clip.
  const rows = qa('.events__list li');
  rows.forEach((r) => gsap.set(r.children, { yPercent: 130 }));
  ScrollTrigger.batch(rows, {
    start: 'top 94%',
    once: true,
    onEnter: (batch) =>
      gsap.to(
        batch.flatMap((r) => [...r.children]),
        { yPercent: 0, duration: 1.2, stagger: 0.025, ease: 'cosmic' }
      ),
  });

  dipper();
}

// The Saptarishi draws itself as you scroll; each star lights up its question.
function dipper() {
  const lines = qa('.dipper__lines line');
  const stars = qa('.dstar');
  const labels = qa('.dipper__labels li');
  const alcor = q('.dstar__alcor');

  lines.forEach((l) => {
    const len = Math.hypot(l.x2.baseVal.value - l.x1.baseVal.value, l.y2.baseVal.value - l.y1.baseVal.value);
    gsap.set(l, { strokeDasharray: len, strokeDashoffset: len });
  });
  gsap.set(stars, { scale: 0, transformOrigin: '50% 50%' });
  gsap.set(alcor, { opacity: 0 });
  labels.forEach((li) => gsap.set(li.children, { opacity: 0, y: 12 }));

  const tl = gsap.timeline({ scrollTrigger: { trigger: '.dipper', start: 'top 78%', end: 'bottom 50%', scrub: 1 } });
  const light = (i) => {
    tl.to(stars[i], { scale: 1, duration: 0.45, ease: 'back.out(3)' }).to(labels[i].children, { opacity: 1, y: 0, stagger: 0.08, duration: 0.5 }, '<0.1');
    if (i === 1) tl.to(alcor, { opacity: 1, duration: 0.3 }, '<');
  };
  light(0);
  for (let i = 0; i < 6; i++) {
    tl.to(lines[i], { strokeDashoffset: 0, duration: 1, ease: 'none' });
    light(i + 1);
  }
  tl.to(lines[6], { strokeDashoffset: 0, duration: 1, ease: 'none' });
}

/* ---------- Membership: plans surface out of the deep ---------- */
function membership(desktop) {
  gsap.fromTo(
    '.plan',
    { z: desktop ? -1000 : -420, rotationX: desktop ? 40 : 22, yPercent: 26, opacity: 0, transformOrigin: '50% 0%' },
    {
      z: 0,
      rotationX: 0,
      yPercent: 0,
      opacity: 1,
      ease: 'drift',
      stagger: 0.14,
      scrollTrigger: { trigger: '.plans', start: 'top 96%', end: 'top 32%', scrub: 1.2 },
    }
  );
  qa('[data-price]').forEach((el) => {
    const end = Number(el.dataset.price);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: end,
      duration: 2,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('en-IN')),
      scrollTrigger: { trigger: el, start: 'top 82%', once: true },
    });
  });
  qa('.plan').forEach((plan) =>
    gsap.from(qa('.plan__list li', plan), {
      x: -24,
      opacity: 0,
      stagger: 0.07,
      duration: 1.1,
      scrollTrigger: { trigger: q('.plan__list', plan), start: 'top 85%', once: true },
    })
  );
}

/* ---------- Gallery: plates open like shutters, at different depths ---------- */
function gallery(desktop) {
  if (desktop) {
    qa('.gallery__col').forEach((col) => {
      const d = Number(col.dataset.depth);
      gsap.fromTo(
        col,
        { y: () => 140 * d },
        {
          y: () => -140 * d,
          ease: 'none',
          scrollTrigger: { trigger: '.gallery__grid', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
        }
      );
    });
  }
  const masks = ['inset(100% 0% 0% 0% round 18px)', 'inset(0% 0% 100% 0% round 18px)', 'inset(0% 100% 0% 0% round 18px)', 'inset(50% 50% 50% 50% round 18px)'];
  qa('.shot').forEach((shot, i) => {
    const frame = q('.shot__frame', shot);
    gsap
      .timeline({ scrollTrigger: { trigger: shot, start: 'top 90%', once: true } })
      .fromTo(frame, { clipPath: masks[i % masks.length] }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.6, ease: 'warp' })
      .fromTo(q('img', frame), { scale: 1.5 }, { scale: 1, duration: 2.2, ease: 'cosmic' }, 0)
      .from(qa('figcaption > *', shot), { yPercent: 100, opacity: 0, stagger: 0.08, duration: 1 }, 0.6);
  });
}

/* ---------- Crew: portrait rings draw, faces irise open ---------- */
function crew() {
  qa('.person').forEach((p) => {
    const ring = q('.person__ring circle', p);
    const len = 2 * Math.PI * 57;
    const photo = q('.person__photo', p);
    const role = q('.person__role', p);
    const roleText = role.textContent;
    const name = SplitText.create(q('.person__name', p), { type: 'chars,words', mask: 'words' });
    gsap.set(ring, { strokeDasharray: len, strokeDashoffset: len });

    gsap
      .timeline({ scrollTrigger: { trigger: p, start: 'top 78%', once: true } })
      .to(ring, { strokeDashoffset: 0, duration: 2, ease: 'warp' })
      .fromTo(photo, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(50% at 50% 50%)', duration: 1.5, ease: 'cosmic' }, 0.35)
      .fromTo(photo.children, { scale: 1.45 }, { scale: 1, duration: 2.2, ease: 'cosmic' }, 0.35)
      .from(name.chars, { yPercent: 110, stagger: 0.025, duration: 1.1 }, 0.45)
      .fromTo(role, { textContent: '' }, { duration: 1.2, scrambleText: { text: roleText, chars: 'upperCase', speed: 0.5 } }, 0.65)
      .from(q('.person__bio', p), { y: 30, opacity: 0, duration: 1.3 }, 0.85);

    gsap.fromTo(
      q('.person__ring', p),
      { rotation: -150 },
      { rotation: -30, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } }
    );
  });
}

/* ---------- Community ---------- */
function community() {
  gsap.from('.why__list li', {
    x: -30,
    opacity: 0,
    stagger: 0.06,
    duration: 1.2,
    scrollTrigger: { trigger: '.why__list', start: 'top 86%', once: true },
  });
  gsap.from('.why__list svg', {
    scale: 0,
    rotate: -180,
    stagger: 0.06,
    duration: 1.2,
    delay: 0.2,
    ease: 'back.out(2)',
    scrollTrigger: { trigger: '.why__list', start: 'top 86%', once: true },
  });
}

function faq() {
  gsap.from('.qa', { y: 30, opacity: 0, stagger: 0.07, duration: 1.2, scrollTrigger: { trigger: '.faq__list', start: 'top 86%', once: true } });
}

/* ---------- Finale: the last line arrives out of the planet's glow ---------- */
function finale() {
  const split = SplitText.create(qa('.finale__line'), { type: 'chars,words' });
  gsap
    .timeline({ scrollTrigger: { trigger: '.finale', start: 'top 80%', end: 'top 5%', scrub: 1 } })
    .fromTo(
      split.chars,
      { opacity: 0, z: () => gsap.utils.random(-1600, -500), rotationX: () => gsap.utils.random(-80, 80), transformPerspective: 900 },
      { opacity: 1, z: 0, rotationX: 0, ease: 'drift', stagger: { each: 0.02, from: 'center' }, duration: 1 }
    )
    .from('.finale__eyebrow', { opacity: 0, letterSpacing: '0.8em', duration: 0.6 }, 0);

  gsap.from(['.finale__copy', '.finale__cta', '.finale__small'], {
    y: 40,
    opacity: 0,
    stagger: 0.12,
    duration: 1.4,
    scrollTrigger: { trigger: '.finale__copy', start: 'top 92%', once: true },
  });
}

/* ---------- Footer: a marquee whose speed and direction follow your scroll ---------- */
function footer(scroll) {
  const track = q('.marquee__track');
  let x = 0;
  let dir = -1;
  let inView = false;
  ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onToggle: (s) => (inView = s.isActive) });
  const setX = gsap.quickSetter(track, 'x', 'px');
  const tick = (_t, dt) => {
    if (!inView) return;
    const v = scroll.velocity;
    if (Math.abs(v) > 0.5) dir = v > 0 ? -1 : 1;
    const half = track.scrollWidth / 2;
    x += dir * (0.5 + Math.min(Math.abs(v) * 0.3, 14)) * (dt / 16.67);
    x = gsap.utils.wrap(-half, 0, x);
    setX(x);
  };
  gsap.ticker.add(tick);

  gsap.from('.wordmark > *', {
    yPercent: 60,
    opacity: 0,
    rotate: (i) => (i === 1 ? -180 : 0),
    stagger: 0.1,
    duration: 1.6,
    scrollTrigger: { trigger: '.wordmark', start: 'top 92%', once: true },
  });
  return () => gsap.ticker.remove(tick);
}

/* ---------- Reduced motion: still, legible, complete ---------- */
function reducedMotion(scene) {
  scene?.setOrbitProgress(0.35);
  qa('.exp__item').forEach((i) => gsap.set(i, { clearProps: 'all' }));
}

/* ---------- FAQ accordion ---------- */
function initFaq() {
  qa('.qa__q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.qa');
      const open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      // Heights change: let pinned sections and the scene re-measure.
      setTimeout(() => ScrollTrigger.refresh(), 650);
    });
  });
}

/* ---------- Lightbox: the plate flies from the grid to centre stage ---------- */
function initLightbox(scroll) {
  const lb = q('.lightbox');
  const img = q('img', lb);
  const cap = q('figcaption', lb);
  const close = q('.lightbox__close', lb);
  let source = null;

  async function open(shot) {
    const thumb = q('img', shot);
    if (!thumb.src) return;
    source = shot;
    img.src = thumb.src;
    img.alt = thumb.alt;
    cap.textContent = qa('figcaption > *', shot).map((n) => n.textContent).join(' — ');
    try {
      await img.decode();
    } catch {}
    scroll.stop();
    gsap.set(lb, { visibility: 'visible' });
    lb.setAttribute('aria-hidden', 'false');
    const from = thumb.getBoundingClientRect();
    const to = img.getBoundingClientRect();
    gsap
      .timeline()
      .to(lb, { opacity: 1, duration: 0.45, ease: 'power2.out' }, 0)
      .fromTo(
        img,
        {
          x: from.left + from.width / 2 - (to.left + to.width / 2),
          y: from.top + from.height / 2 - (to.top + to.height / 2),
          scale: from.width / to.width,
        },
        { x: 0, y: 0, scale: 1, duration: 1, ease: 'cosmic' },
        0
      )
      .from(cap, { opacity: 0, y: 10, duration: 0.6 }, 0.4);
    close.focus({ preventScroll: true });
  }
  function shut() {
    if (!source) return;
    gsap.to(lb, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        gsap.set(lb, { visibility: 'hidden' });
        lb.setAttribute('aria-hidden', 'true');
      },
    });
    scroll.start();
    source.focus({ preventScroll: true });
    source = null;
  }

  qa('.shot').forEach((shot) => {
    shot.setAttribute('tabindex', '0');
    shot.setAttribute('role', 'button');
    shot.setAttribute('aria-label', `View larger: ${q('figcaption span', shot).textContent}`);
    shot.addEventListener('click', () => open(shot));
    shot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(shot);
      }
    });
  });
  close.addEventListener('click', shut);
  lb.addEventListener('click', (e) => e.target === lb && shut());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && shut());
}
