// Does Galaxy Explorer honour prefers-reduced-motion?
//
//   node dev-tools/galaxy_reduced_motion_check.cjs <harness.html>
//
// This is the accessibility axis a continuously auto-rotating 3-D scene most needs to
// get right: WCAG 2.3.3, and vestibular safety generally. The tool injects a global
// `animation-duration: 0.01ms` stylesheet, but that only reaches CSS animations — a
// requestAnimationFrame loop spinning a THREE.Group ignores it completely, which is a
// failure mode this repo has hit before.
//
// Measured by SAMPLING SCENE STATE, not by screenshotting: a screenshot never settles
// while a rAF loop is running, and stopping the loop to take one would destroy the
// very thing being measured. Rotation values read straight out of the scene graph are
// both cheaper and harder to fool.
const path = require('path');
const { chromium } = require('playwright');
const HTML = process.argv[2] || '.tmp/rm/galaxy-canvas-text.html';

const SAMPLE = () => {
  const cv = document.querySelector('[data-galaxy-canvas]');
  if (!cv || !cv._layers) return null;
  // Walk up from a known layer to the root the render loop actually spins.
  const vals = [];
  const seen = new Set();
  const visit = (o, depth) => {
    if (!o || seen.has(o) || depth > 4) return;
    seen.add(o);
    if (o.rotation) vals.push(+o.rotation.x.toFixed(6), +o.rotation.y.toFixed(6), +o.rotation.z.toFixed(6));
    if (o.position) vals.push(+o.position.x.toFixed(6), +o.position.y.toFixed(6), +o.position.z.toFixed(6));
    (o.children || []).forEach((c) => visit(c, depth + 1));
  };
  for (const v of Object.values(cv._layers)) { visit(v, 0); if (v && v.parent) visit(v.parent, 0); }
  return vals;
};

async function run(reduced) {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({
    viewport: { width: 1180, height: 900 },
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });
  await p.addInitScript(() => { let s = 7; Math.random = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; }; });
  await p.goto('file:///' + path.resolve(HTML).replace(/\\/g, '/'));
  await p.waitForTimeout(2200);
  await p.evaluate(() => window.__mount({ simMode: 'galaxy', galaxyControlPanel: 'view', galaxyType: 'barredSpiral' }));
  await p.waitForTimeout(7000);

  const media = await p.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const a = await p.evaluate(SAMPLE);
  await p.waitForTimeout(2500);
  const c = await p.evaluate(SAMPLE);
  await b.close();
  if (!a || !c) return { media, error: 'scene did not build' };
  let moved = 0, maxDelta = 0;
  for (let i = 0; i < Math.min(a.length, c.length); i++) {
    const d = Math.abs(a[i] - c[i]);
    if (d > 1e-4) moved++;
    if (d > maxDelta) maxDelta = d;
  }
  return { media, sampled: a.length, moved, maxDelta: +maxDelta.toFixed(5) };
}

(async () => {
  const normal = await run(false);
  const reduced = await run(true);
  console.log('prefers-reduced-motion: no-preference  ->  ' + JSON.stringify(normal));
  console.log('prefers-reduced-motion: reduce         ->  ' + JSON.stringify(reduced));
  console.log('');
  if (normal.error || reduced.error) { console.log('INCONCLUSIVE: ' + (normal.error || reduced.error)); return; }
  if (!normal.moved) {
    // Without this check a tool that never animates at all would "pass" reduced motion.
    console.log('INCONCLUSIVE: the scene does not move even WITHOUT the preference, so');
    console.log('this cannot tell "honours reduced motion" apart from "measured nothing".');
    return;
  }
  console.log('baseline motion (no preference): ' + normal.moved + ' of ' + normal.sampled + ' transform values changed over 2.5s');
  if (reduced.moved === 0) console.log('RESULT: reduced motion is HONOURED — the scene is completely still.');
  else if (reduced.moved < normal.moved / 4) console.log('RESULT: motion is strongly reduced (' + reduced.moved + ' vs ' + normal.moved + ' values moving).');
  else console.log('RESULT: ★ scene still animates under reduced motion (' + reduced.moved + ' vs ' + normal.moved + ' values moving, max delta ' + reduced.maxDelta + ').');
})();
