// How long does one render of each Machine Lab view actually take?
//
//   node dev-tools/ml_render_cost.cjs        (exit 0 = pass, 2 = fail)
//
// WHY. Sliders re-render on every drag, and some views do real work per render:
// the Compare view runs a full flight integration for each of three machines
// plus the preview, and every integration is thousands of fixed 1 ms steps. If
// a render costs more than a frame, dragging a slider feels like mud, and
// nothing else in this repo's tooling would ever tell us.
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('dev-tools/ml_frame_budget.cjs');
const SHELL = src.match(/const SHELL = `([\s\S]*?)\n`;/)[1];
const BASE = eval('(' + src.match(/const BASE = (\{[\s\S]*?\n\});/)[1] + ')');

const parts = [
  '<!doctype html><html><head><meta charset="utf-8"></head><body><main id="slot"></main>',
  '<script>' + read('vendor/three-r128/three.min.js') + '</scr' + 'ipt>',
  '<script>' + read('vendor/three-r128/OrbitControls.js') + '</scr' + 'ipt>',
  '<script>' + read('desktop/web-app/node_modules/react/umd/react.production.min.js') + '</scr' + 'ipt>',
  '<script>' + read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js') + '</scr' + 'ipt>',
  '<script>window.React=React;</scr' + 'ipt>',
  '<script>' + read('stem_lab/stem_lab_module.js') + '</scr' + 'ipt>',
  '<script>' + read('stem_lab/stem_tool_machinelab.js') + '</scr' + 'ipt>',
  '<script>' + SHELL + '</scr' + 'ipt>',
  '</body></html>'
];

// One frame at 60 Hz. A render is only part of the budget (layout and paint
// follow), so hold the render itself well under it.
const FRAME_MS = 16.7;
const BUDGET_MS = 12;

const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: String(detail === undefined ? '' : detail) }); }

(async () => {
  const { chromium } = require('playwright');
  const tmp = path.join(require('os').tmpdir(), 'ml-cost.html');
  fs.writeFileSync(tmp, parts.join('\n'), 'utf8');
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1180, height: 1400 } });
  pg.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await pg.goto('file://' + tmp.replace(/\\/g, '/'));
  await pg.waitForTimeout(1200);

  const S = (o) => Object.assign({}, BASE, o);

  // Re-mount N times and take the median, so one unlucky GC does not decide it.
  async function costOf(state, n) {
    return pg.evaluate(([st, runs]) => {
      const times = [];
      for (let i = 0; i < runs; i++) {
        // Vary one number so React cannot skip the work as identical.
        const s = Object.assign({}, st, { projMass: 25 + (i % 7) });
        const t0 = performance.now();
        window.__mount(s, {});
        times.push(performance.now() - t0);
      }
      times.sort((a, b) => a - b);
      return { median: times[Math.floor(times.length / 2)], worst: times[times.length - 1] };
    }, [state, n]);
  }

  const VIEWS = ['machines', 'build', 'range', 'siege', 'compare', 'learn'];
  let slowest = { view: null, median: 0 };

  for (const view of VIEWS) {
    // Give a 3D view a moment to settle before timing the re-renders.
    await pg.evaluate((s) => window.__mount(s, {}), S({ view }));
    await pg.waitForTimeout(view === 'build' || view === 'siege' ? 2200 : 400);
    const c = await costOf(S({ view }), 15);
    if (c.median > slowest.median) slowest = { view, median: c.median };
    check('render of ' + view + ' fits in a frame',
          c.median < BUDGET_MS,
          'median ' + c.median.toFixed(1) + 'ms, worst ' + c.worst.toFixed(1) + 'ms');
  }

  // The Compare view is the one that does real physics per render: three
  // machines plus the preview, each a full flight integration.
  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'compare' }));
  await pg.waitForTimeout(400);
  const cmp = await costOf(S({ view: 'compare' }), 15);
  check('Compare stays usable while dragging a slider',
        cmp.median < BUDGET_MS, 'median ' + cmp.median.toFixed(1) + 'ms');

  // A wall with many blocks is the heaviest siege state.
  const bigWall = await pg.evaluate(() => window.__batter ? null : null);
  void bigWall;
  await pg.evaluate((s) => window.__mount(s, {}), S({ view: 'siege', wallPreset: 'keep' }));
  await pg.waitForTimeout(2200);
  const keep = await costOf(S({ view: 'siege', wallPreset: 'keep' }), 12);
  check('the largest wall preset still renders in a frame',
        keep.median < BUDGET_MS, 'median ' + keep.median.toFixed(1) + 'ms');

  await b.close();
  const failed = results.filter((x) => !x.ok);
  results.forEach((x) => console.log((x.ok ? '  ok   ' : '  FAIL ') + x.name + (x.detail ? '   [' + x.detail + ']' : '')));
  console.log('\nslowest view: ' + slowest.view + ' at ' + slowest.median.toFixed(1) + 'ms (frame is ' + FRAME_MS + 'ms)');
  console.log((results.length - failed.length) + '/' + results.length + ' render-cost checks passed');
  if (failed.length) { console.error('\n' + failed.length + ' FAILED'); process.exit(2); }
})();
