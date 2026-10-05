// Capability tiers drive particle counts, pixel ratio and which interactions run.
export function detectDevice() {
  const mq = (q) => window.matchMedia(q).matches;
  const reduced = mq('(prefers-reduced-motion: reduce)');
  const finePointer = mq('(hover: hover) and (pointer: fine)');
  const width = window.innerWidth;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 8;

  let tier = 'high';
  if (width < 768 || (!finePointer && cores <= 4) || memory <= 2) tier = 'low';
  else if (width < 1200 || !finePointer || cores <= 4 || memory <= 4) tier = 'mid';

  return { reduced, finePointer, tier, webgl: hasWebGL() };
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2'); // three.js r163+ is WebGL2-only
  } catch {
    return false;
  }
}
