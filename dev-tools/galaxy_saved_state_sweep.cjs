// Does a saved session with stale or impossible values still render?
//   node dev-tools/galaxy_saved_state_sweep.cjs <out-dir>
//
// toolData persists across releases, so a learner can reopen the tool holding a value
// this build no longer knows. Three real defects came out of this sweep: an unknown
// simMode rendered a blank page; a retired galaxyType broke the 3-D scene and showed
// the generic "3-D unavailable" card; and a null or negative lifecycleMass rendered
// NOTHING at all (a .toFixed() on null, and NaN coordinates in the SVG diagrams).
//
// A case passes only if the mount does not throw, no page error fires, AND the tool
// actually drew something - a blank page raises no error of its own, so counting text
// and controls is the part that catches it.
//
// Aladin's offline mirror errors are filtered: they arrive late and get blamed on
// whichever case happens to be running next.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2];
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('dev-tools/galaxy_core_clipping.cjs');
const SHELL = src.slice(src.indexOf('const SHELL = `') + 15, src.indexOf('`;\n\n(async'));
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');

const CASES = [
  ['retired simMode', { simMode: 'quiz' }],
  ['nonsense simMode', { simMode: 'wormhole' }],
  ['null simMode', { simMode: null }],
  ['retired galaxyType', { simMode: 'galaxy', galaxyType: 'spiral' }],
  ['nonsense galaxyType', { simMode: 'galaxy', galaxyType: 'lenticular' }],
  ['nonsense observeMode', { simMode: 'galaxy', observeMode: 'ultraviolet' }],
  ['nonsense control panel', { simMode: 'galaxy', galaxyControlPanel: 'settings' }],
  ['nonsense quality', { simMode: 'galaxy', galaxyQuality: 'ultra' }],
  ['nonsense rotMode', { simMode: 'galaxy', rotMode: 'spiralwave' }],
  ['stage impossible at mass', { simMode: 'star', activeStage: 'black_hole', lifecycleMass: 0.3 }],
  ['stage impossible at mass 2', { simMode: 'star', activeStage: 'planetary_nebula', lifecycleMass: 40 }],
  ['nonsense activeStage', { simMode: 'star', activeStage: 'quark_star', lifecycleMass: 5 }],
  ['mass out of range low', { simMode: 'star', lifecycleMass: -5 }],
  ['mass out of range high', { simMode: 'star', lifecycleMass: 5000 }],
  ['NaN mass', { simMode: 'star', lifecycleMass: null }],
  ['cosmicAge out of range', { simMode: 'galaxy', cosmicAge: 99 }],
  ['negative cosmicAge', { simMode: 'galaxy', cosmicAge: -3 }],
  ['starCount absurd', { simMode: 'galaxy', starCount: 0 }],
  ['layers not an object', { simMode: 'galaxy', layers: 'all' }],
  ['layers with unknown key', { simMode: 'galaxy', layers: { arms: true, warpfield: true } }],
  ['retired realSky target', { simMode: 'realSky', realSkyTarget: 'm999' }],
  ['retired realSky survey', { simMode: 'realSky', realSkySurvey: 'P/GONE/color' }],
  ['metalHunt bad numbers', { simMode: 'metalHunt', iq: { metallicity: -1, mass: 0, age: 99 } }],
  ['dopplerVelocity absurd', { simMode: 'galaxy', dopplerVelocity: 999999 }],
  ['quiz index past end', { simMode: 'galaxy', quizMode: true, quizIdx: 9999 }],
  ['inspectTarget unknown', { simMode: 'galaxy', inspectTarget: 'wormhole' }],
];

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1180, height: 1400 }, deviceScaleFactor: 1 });
  await pg.addInitScript(() => { let s = 4242; Math.random = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; }; });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'fuzz.html');
  fs.writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<script src="https://cdn.tailwindcss.com"><\/script>'
    + '<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>'
    + '<body><main id="slot"></main>'
    + '<script>' + react + '<\/script><script>' + reactDom + '<\/script><script>' + three + '<\/script>'
    + '<script>window.__uiStrings = ' + uiStrings + ';<\/script>'
    + '<script>' + SHELL + '<\/script><script>window.React = React;<\/script>'
    + '<script>' + tool + '<\/script></body></html>', 'utf8');
  await pg.goto('file:///' + path.resolve(file).split(path.sep).join('/'));
  await pg.waitForTimeout(2400);

  let errors = [];
  pg.on('pageerror', (e) => { const t = String(e).split('\n')[0]; if (!/CORS|ERR_FAILED|Failed to load resource|mirrors urls have been tested|alasky|casda/.test(t)) errors.push(t.slice(0, 150)); });
  pg.on('console', (m) => { if (m.type() === 'error' && !/CORS|ERR_FAILED|Failed to load resource|mirrors urls have been tested|alasky|casda/.test(m.text())) errors.push(m.text().split('\n')[0].slice(0, 150)); });

  const lines = ['Saved-state resilience sweep', ''];
  let bad = 0;
  for (const [name, state] of CASES) {
    errors = [];
    let mounted = true;
    try {
      await pg.evaluate((st) => window.__mount(st), state);
    } catch (e) {
      mounted = false;
      errors.push('mount threw: ' + String(e).split('\n')[0].slice(0, 120));
    }
    await pg.waitForTimeout(2200);
    const seen = await pg.evaluate(() => {
      const slot = document.getElementById('slot');
      const text = (slot.innerText || '').trim();
      return { chars: text.length, controls: slot.querySelectorAll('button, input, select, textarea').length };
    });
    const blank = seen.chars < 120 || seen.controls < 4;
    const ok = mounted && !errors.length && !blank;
    if (!ok) bad++;
    lines.push((ok ? 'ok    ' : '** FAIL ') + name.padEnd(26)
      + ' text=' + String(seen.chars).padStart(5) + ' controls=' + String(seen.controls).padStart(3)
      + (errors.length ? '  errors: ' + errors.slice(0, 2).join(' | ') : ''));
  }
  lines.push('');
  lines.push('failures: ' + bad + ' of ' + CASES.length);
  fs.writeFileSync(path.join(OUT, 'state-fuzz.txt'), lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
