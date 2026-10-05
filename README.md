# Novae Astro Club — website

Single-page site for Novae Astro Club (an initiative by Novae Glamp, Bhongir).
Vite + vanilla JS, Three.js, GSAP (ScrollTrigger, SplitText, CustomEase, ScrambleText) and Lenis.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build → dist/
npm run preview  # serve the build
```

## How it fits together

- `index.html` — all content (semantic HTML, readable without JS).
- `src/main.js` — boot: loader → scene → section motion → intro.
- `src/webgl/Scene.js` — one persistent 3D scene behind the page. Each section declares a "shot"
  (`SHOTS`) for where the planet, rings, orbits and Moon sit; the scene blends between shots from the
  scroll position. Edit `SHOTS` to recompose any section.
- `src/webgl/plates.js` — GPU-rendered illustrative astrophotography plates (Moon, Saturn, Pleiades,
  nebula, star trails, galaxy).
- `src/motion/` — loader, nav/menu/HUD, pointer interactions, and per-section ScrollTrigger choreography.
- `src/core/device.js` — capability tiers (star counts, pixel ratio, interactions); reduced motion is respected.

## Before launch

1. **Registration link** — set `links.registration` in `src/config.js` to the WhatsApp registration URL
   behind the launch-deck QR code (it currently points to Instagram).
2. **Crew photos** — add `public/crew/ravi-raja-pothineni.jpg` and `public/crew/sandeep-reddy-moku.jpg`
   (square). Until then a monogram shows.
3. **Brand fonts** — the brandbook specifies LOVelo / Disket Mono. Add licensed `.woff2` files to
   `public/fonts/` and uncomment the `@font-face` block at the top of `src/styles/main.css`.
   Syncopate and Space Mono are used as fallbacks.
4. **Real member photos** — replace any `<img data-plate="…">` with a normal `src` and drop the
   `data-plate` attribute.
