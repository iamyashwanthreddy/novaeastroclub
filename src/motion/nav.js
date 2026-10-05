import { gsap, ScrollTrigger } from '../core/gsap.js';

const q = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => [...r.querySelectorAll(s)];

export function initNav({ scroll, device }) {
  const nav = q('.nav');
  const burger = q('.burger');
  const menu = q('.menu');
  let menuOpen = false;
  let hidden = false;

  /* Scrolled state + hide on the way down, return on the way up */
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 60);
      const hide = !device.reduced && self.direction === 1 && y > window.innerHeight * 0.9 && !menuOpen;
      if (hide !== hidden) {
        hidden = hide;
        gsap.to(nav, { yPercent: hide ? -110 : 0, duration: 0.8, ease: 'cosmic', overwrite: true });
      }
    },
  });

  /* Mobile menu: an iris opening from the burger, then a staggered roll-call */
  const stars = q('.menu__stars');
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('i');
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.setProperty('--d', `${2 + Math.random() * 4}s`);
    s.style.animationDelay = `${-Math.random() * 4}s, ${-Math.random() * 22}s`;
    if (Math.random() < 0.15) s.style.background = '#FF3CAC';
    stars.appendChild(s);
  }
  const links = qa('.menu__nav a');
  const iris = () => {
    const r = burger.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, R: Math.hypot(window.innerWidth, window.innerHeight) };
  };
  const menuTl = gsap
    .timeline({ paused: true, defaults: { ease: 'cosmic' } })
    .set(menu, { visibility: 'visible' })
    .fromTo(
      menu,
      {
        clipPath: () => {
          const c = iris();
          return `circle(0px at ${c.x}px ${c.y}px)`;
        },
      },
      {
        clipPath: () => {
          const c = iris();
          return `circle(${c.R}px at ${c.x}px ${c.y}px)`;
        },
        duration: device.reduced ? 0.01 : 0.9,
        ease: 'warp',
      }
    )
    .from(qa('.menu__nav a > *'), { yPercent: 120, duration: 1, stagger: 0.035 }, 0.3)
    .from('.menu__foot', { opacity: 0, y: 20, duration: 0.8 }, 0.55)
    .from(stars, { opacity: 0, scale: 1.2, duration: 1.4 }, 0.2);

  function setMenu(open) {
    menuOpen = open;
    document.documentElement.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));
    if (open) {
      gsap.to(nav, { yPercent: 0, duration: 0.4, overwrite: true });
      menuTl.invalidate().timeScale(1).play();
      scroll.stop();
      setTimeout(() => links[0]?.focus({ preventScroll: true }), 300);
    } else {
      menuTl.timeScale(1.7).reverse();
      scroll.start();
    }
  }
  burger.addEventListener('click', () => setMenu(!menuOpen));
  links.forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) {
      setMenu(false);
      burger.focus();
    }
  });

  /* Intro, played as the loader opens */
  return function intro() {
    if (device.reduced) return gsap.timeline();
    return gsap
      .timeline()
      .from('.logo__mark', { scale: 0, rotate: -160, duration: 1.4, ease: 'cosmic' }, 0)
      .from('.logo__word', { opacity: 0, x: -16, duration: 1.2 }, 0.15)
      .from('.nav__links a span', { yPercent: 120, duration: 1.1, stagger: 0.05 }, 0.2)
      .from('.nav__cta', { opacity: 0, scale: 0.7, duration: 1.1 }, 0.45)
      .from('.burger', { opacity: 0, scale: 0.6, duration: 1 }, 0.45);
  };
}

/** Active link and side HUD follow the section in view. Call after pins exist. */
export function initWayfinding() {
  qa('[data-nav]').forEach((a) => {
    const sec = q('#' + a.dataset.nav);
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 50%',
      end: 'bottom 50%',
      onToggle: (s) => a.classList.toggle('is-active', s.isActive),
    });
  });

  const fill = q('.hud__fill');
  const label = q('.hud__label');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => gsap.set(fill, { scaleY: s.progress }) });
  qa('main > [data-label]').forEach((sec) =>
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (s) => {
        if (!s.isActive) return;
        gsap.to(label, { duration: 0.8, overwrite: true, scrambleText: { text: sec.dataset.label, chars: '01+*', speed: 0.5 } });
      },
    })
  );
}
