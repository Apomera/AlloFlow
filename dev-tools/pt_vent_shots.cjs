// Screenshot the Plate Tectonics 3D volcano cutaway across the eruption.
//
//   node dev-tools/pt_vent_shots.cjs <out-dir>
//
// WHY. This view is WebGL, so nothing in the SSR tests can see a single pixel
// of it: a mesh built at the wrong scale, a label outside the frustum, or a
// material whose colour lands on the background all render as valid markup and
// an empty black box. Every 3D defect in this codebase was found by looking at
// the picture.
//
// It drives the REAL eruption: the shot script clicks the tool's own Erupt
// button and lets the 2D loop advance eruptState, which is the only thing that
// feeds VentGL. Injecting ticks directly would test the injection, not the
// bridge — and the bridge is the part that can silently be wired to nothing.
//
// three.js is preloaded from the pinned local vendor asset, so ensureThree
// resolves without a network. A stubbed ensureThree that never resolves would
// leave the tool on its 2D fallback and every shot would be of the wrong view.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2] || '.';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const stemLab = read('stem_lab/stem_lab_module.js');
const tool = read('stem_lab/stem_tool_platetectonics.js');
const uiStrings = read('ui_strings.js');

// Real StemLab module, real ensureThree, real makeVoxelBatch. Only the host
// application shell is stubbed.
const SHELL = `
window.__mount = function (dark) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.plateTectonics;
  var Host = function () {
    var pair = React.useState({ plateTectonics: { simTab: 'sim' } });
    var ctx = { React: React, toolData: pair[0], setToolData: pair[1], setStemLabTool: function(){},
      setStemLabTab: function(){}, setToolSnapshots: function(){}, addToast: function(){},
      announceToSR: function(m){ window.__sr = (window.__sr || []).concat([m]); },
      awardXP: function(){}, getXP: function(){ return 0; }, beep: function(){}, celebrate: function(){},
      canvasNarrate: function(){}, canvasA11yDesc: function(){},
      callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, gradeLevel: '5th',
      stemLabTab: 'explore', stemLabTool: 'plateTectonics', toolSnapshots: [], props: {}, srOnly: {},
      isDark: dark, isContrast: false, pal: null,
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) {
        var cur = window.__uiStrings, segs = String(k).split('.');
        for (var si = 0; si < segs.length; si++) {
          if (cur == null || typeof cur !== 'object') { cur = null; break; }
          cur = cur[segs[si]];
        }
        if (typeof cur === 'string') return cur;
        return fb != null ? fb : k;
      } };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
`;

// Keyed to eruptState.tick, NOT to wall-clock. The tick advances one step per
// animation frame, and the frame rate here is whatever the machine gives (~19fps
// under headless with the 2D sim and WebGL both live, not 60). Timing the shots
// in milliseconds silently caught the whole eruption inside the blast phase.
const SHOTS = [
  [null, 'repose',   'anatomy before any eruption'],
  [40,   'pressure', 'chamber swelling toward the blast'],
  [120,  'blast',    'ash plume + glowing conduit'],
  [300,  'deflate',  'chamber draining'],
  [450,  'caldera',  'summit foundering into the emptied chamber'],
  [560,  'after',    'caldera held after the eruption ends']
];

(async () => {
  const { chromium } = require('playwright');
  // Default GL backend. Forcing SwiftShader also works but composites so slowly
  // that a screenshot of a live WebGL canvas times out — a blank page alone took
  // 3.4s. If this box ever lacks a GPU, add the swiftshader args back and raise
  // the screenshot timeout rather than assuming the view is broken.
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
  pg.on('console', (m) => { if (m.type() === 'error') console.log('  [console error] ' + m.text()); });
  pg.on('pageerror', (e) => console.log('  [page error] ' + e.message));

  const page = path.join(OUT, 'pt-vent-shots.html');
  fs.writeFileSync(page, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"><\/script>
<style>body{margin:0;padding:12px;background:#fff;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${react}<\/script><script>${reactDom}<\/script>
<script>${three}<\/script>
<script>window.React = React; window.ReactDOM = ReactDOM;<\/script>
<script>window.__uiStrings = ${uiStrings};<\/script>
<script>${stemLab}<\/script>
<script>${tool}<\/script>
<script>${SHELL}<\/script></body></html>`, 'utf8');

  await pg.goto('file://' + page.replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(true));
  await pg.waitForTimeout(1200);

  // Guard the premise. If WebGL is unavailable, or the toggle never wired up,
  // every shot below would be of the 2D sim and would look plausible.
  // Clicked through the DOM, not Playwright's actionability path: the sim's rAF
  // loop repaints continuously, so the "element is stable" check never settles.
  const click = (sel) => pg.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return false;
    el.click();
    return true;
  }, sel);

  if (!(await pg.$('[data-pt-vent-view="3d"]'))) { console.log('FAIL: no 3D toggle button rendered'); await b.close(); process.exit(1); }
  await click('[data-pt-vent-view="3d"]');
  await pg.waitForTimeout(2500);

  const dbg = await pg.evaluate(() => window.__alloVentGL && window.__alloVentGL.debug());
  console.log('VentGL after mount: ' + JSON.stringify(dbg));
  if (!dbg || dbg.state !== 'ready') {
    console.log('FAIL: VentGL did not reach ready — shots would show the 2D fallback.');
    await b.close();
    process.exit(1);
  }

  // Page screenshot with an explicit clip, not elementHandle.screenshot: the
  // element path waits for the box to be "stable", and this surface re-renders
  // continuously (the quake counter alone changes every frame), so it never is.
  const shot = async (name) => {
    const box = await pg.evaluate(() => {
      const el = document.querySelector('[data-pt-sim-surface="true"]');
      // The surface sits well below the fold, and a clip rect is viewport-
      // relative, so it has to be scrolled into view before it is measured.
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
    });
    // animations:'disabled' matters here — the Erupt button carries an infinite
    // CSS pulse, and Playwright will otherwise sit waiting for it to settle.
    // Retried: capturing a live WebGL canvas intermittently overruns the
    // deadline, and one flaky capture should not lose a whole run.
    for (let attempt = 0; ; attempt++) {
      try {
        await pg.screenshot({ path: path.join(OUT, name), clip: box, animations: 'disabled', timeout: 15000 });
        return;
      } catch (e) {
        if (attempt >= 2) throw e;
        await pg.waitForTimeout(600);
      }
    }
  };
  const setMagma = async (id) => {
    await click('[data-pt-vent-magma="' + id + '"]');
    await pg.waitForTimeout(900);
  };
  // The tool's Erupt handler is guarded by `if (!eruptState.active)`, so a click
  // during a running eruption is a SILENT no-op. Waiting for the eruption to end
  // first is therefore mandatory: the naive version clicked, watched the old
  // eruption finish and reset its tick to 0, read that as a fresh start, and then
  // waited forever for a tick that was never going to advance.
  // Falling through silently is what corrupted the 2D profile check: an eruption
  // that outlasted the budget left the sim busy, the next Erupt click was
  // swallowed by the tool's own `if (!eruptState.active)` guard, and the probe
  // then read the PREVIOUS eruption's profile as if it were the new one.
  const waitIdle = async (label) => {
    for (let i = 0; i < 200; i++) {
      const d = await pg.evaluate(() => window.__alloVentGL.debug());
      if (!d.active) return d;
      await pg.waitForTimeout(500);
    }
    throw new Error('sim never went idle before ' + label);
  };

  const freshErupt = async () => {
    await waitIdle('erupt');
    // One beat so React can re-render on the sim's edge-published ptErupting.
    // Clicking inside that window hits a handler still closed over "busy".
    await pg.waitForTimeout(400);
    await click('[data-pt-erupt]');
    for (let j = 0; j < 60; j++) {
      const d = await pg.evaluate(() => window.__alloVentGL.debug());
      // Require the tick to have RESET. "active with any tick" was satisfied by
      // a still-running previous eruption, so the check could never fail.
      if (d.active && d.tick > 0 && d.tick < 90) return d;
      await pg.waitForTimeout(200);
    }
    throw new Error('eruption never restarted');
  };

  const waitForTick = async (target) => {
    for (let i = 0; i < 200; i++) {
      const d = await pg.evaluate(() => window.__alloVentGL.debug());
      if (d.tick >= target) return d;
      await pg.waitForTimeout(250);
    }
    throw new Error('tick never reached ' + target);
  };

  for (const [at, label, caption] of SHOTS) {
    if (label === 'pressure') await click('[aria-label="Trigger a volcanic eruption in the plate tectonics simulation"]');
    const d = at == null
      ? await pg.evaluate(() => window.__alloVentGL.debug())
      : await waitForTick(at);
    await shot('vent-' + label + '.png');
    console.log(('vent-' + label).padEnd(18) + JSON.stringify(d).padEnd(140) + caption);
  }

  // ── Erupt button state ─────────────────────────────────────────────────────
  // The handler ignores a click while an eruption runs, so the button MUST say
  // so. Asserting aria-disabled and the label proves the sim's edge-published
  // flag actually reaches React, which a screenshot of a dimmed button would
  // not: a hard-coded dim would look identical.
  const eruptBtn = () => pg.evaluate(() => {
    const el = document.querySelector('[data-pt-erupt]');
    return el ? { aria: el.getAttribute('aria-disabled'), text: el.textContent, cls: /opacity-60/.test(el.className) } : null;
  });
  await waitIdle('erupt-button check');
  const idleBtn = await eruptBtn();
  await click('[data-pt-erupt]');
  await pg.waitForTimeout(700);
  const busyBtn = await eruptBtn();
  console.log('erupt button idle: ' + JSON.stringify(idleBtn));
  console.log('erupt button busy: ' + JSON.stringify(busyBtn));
  console.log('erupt button reflects state: ' +
    ((idleBtn.aria === 'false' && busyBtn.aria === 'true' && idleBtn.text !== busyBtn.text) ? 'OK' : 'MISMATCH'));

  // A second click while busy must stay a no-op AND explain itself.
  const srBefore = await pg.evaluate(() => (window.__sr || []).length);
  await click('[data-pt-erupt]');
  await pg.waitForTimeout(400);
  const srAfter = await pg.evaluate((n) => (window.__sr || []).slice(n), srBefore);
  console.log('busy click announced: ' + JSON.stringify(srAfter));

  // ── Composition sweep ──────────────────────────────────────────────────────
  // The whole claim of the magma control is that ONE choice changes the landform,
  // the eruption style, and the collapse together. Three numbers that move is not
  // evidence the three MOUNTAINS look different, so each gets shot at rest and at
  // full blast, and the geometry is asserted rather than eyeballed.
  const geom = [];
  for (const id of ['basalt', 'andesite', 'rhyolite']) {
    // Wait out the previous eruption BEFORE switching composition. Order matters:
    // applyMagma resets the edifice to pristine, but if an eruption is still
    // running animate() immediately re-collapses it for the new composition, so
    // switching first gave three "at rest" shots that were all post-caldera.
    await waitIdle('composition switch');
    await setMagma(id);
    const rest = await pg.evaluate(() => window.__alloVentGL.debug());
    geom.push(rest);
    await shot('magma-' + id + '-rest.png');
    console.log(('magma-' + id + '-rest').padEnd(22) + JSON.stringify(rest));

    await freshErupt();
    const blast = await waitForTick(120);
    await shot('magma-' + id + '-blast.png');
    console.log(('magma-' + id + '-blast').padEnd(22) + JSON.stringify(blast));

    const cald = await waitForTick(530);
    await shot('magma-' + id + '-caldera.png');
    console.log(('magma-' + id + '-caldera').padEnd(22) + JSON.stringify(cald));
  }

  // The 2D sim draws its own cone from eruptState.coneW/coneH. Those are set at
  // trigger time from the same composition, so the two views must agree — the
  // earlier build gave a broad shield in 3D and a steep stratovolcano in 2D.
  const profiles = [];
  for (const id of ['basalt', 'andesite', 'rhyolite']) {
    await waitIdle('composition switch');
    await setMagma(id);
    await freshErupt();
    await pg.waitForTimeout(400);
    const prof = await pg.evaluate(() => {
      const c = window._ptMainCanvas;
      return c && c._ptEruptProfile ? c._ptEruptProfile : null;
    });
    profiles.push({ id: id, prof: prof });
    console.log('2D cone profile ' + id.padEnd(9) + JSON.stringify(prof));
  }
  const distinct2d = new Set(profiles.map((x) => JSON.stringify(x.prof))).size;
  console.log('distinct 2D cone profiles: ' + distinct2d + '/3 ' + (distinct2d === 3 ? 'OK' : 'MISMATCH'));

  // Guard the premise: if the composition control were wired to nothing, every
  // shot above would be the same mountain and would still look plausible.
  const distinct = new Set(geom.map((g) => g.coneR + 'x' + g.coneH)).size;
  console.log('distinct edifice geometries: ' + distinct + '/3 ' + (distinct === 3 ? 'OK' : 'MISMATCH'));

  // Cutaway, on the state the eruption left behind.
  await pg.evaluate(() => window.__alloVentGL.setCut(2));
  await pg.waitForTimeout(500);
  await shot('vent-cutaway.png');
  console.log('vent-cutaway'.padEnd(18) + JSON.stringify(await pg.evaluate(() => window.__alloVentGL.debug())));

  // Light theme: the tool has been struck before by marks drawn in a colour
  // that only reads against the dark shell.
  // Back to the DEFAULT slice, not to "no cut": the light shot is meant to show
  // what a student actually opens the view to.
  await pg.evaluate(() => window.__alloVentGL.setCut(0));
  await pg.evaluate(() => window.__mount(false));
  await pg.waitForTimeout(1000);
  await click('[data-pt-vent-view="3d"]');
  await pg.waitForTimeout(2500);
  await shot('vent-light.png');
  const sliderSync = await pg.evaluate(() => {
    const el = document.getElementById('pt-vent-cut');
    const m = window.__alloVentGL.getCam();
    return { slider: el ? el.value : null, cut: m.cut };
  });
  console.log('slider/model sync: ' + JSON.stringify(sliderSync) +
    (String(sliderSync.slider) === String(sliderSync.cut == null ? 30 : sliderSync.cut) ? '  OK' : '  MISMATCH'));
  console.log('vent-light'.padEnd(18) + JSON.stringify(await pg.evaluate(() => window.__alloVentGL.debug())));

  console.log('\nSR announcements: ' + JSON.stringify(await pg.evaluate(() => window.__sr || [])));
  await b.close();
  console.log('wrote ' + (SHOTS.length + 2) + ' shots to ' + OUT);
})();
