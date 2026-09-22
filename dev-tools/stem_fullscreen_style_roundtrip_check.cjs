// Does the shared fullscreen helper give a stage its inline styles back EXACTLY?
//
//   node dev-tools/stem_fullscreen_style_roundtrip_check.cjs <out-dir>
//   node dev-tools/stem_fullscreen_style_roundtrip_check.cjs <out-dir> --selftest
//
// window.__alloStemFS is the fullscreen path for 31 STEM tools, so anything it
// corrupts, it corrupts 31 times. Its CSS fill-frame mode overwrites eight inline
// properties on the stage and puts them back on exit.
//
// It used to put them back WITHOUT their priority: getPropertyValue returns the
// value alone, so a stage carrying `height: 400px !important` came back as a plain
// `height: 400px`. The number still looked right, which is why this survived - but
// an !important inline value is written to beat something, and whatever it was
// holding off silently takes over afterwards. Measured against a competing
// stylesheet rule the stage collapsed 400px -> 90px on the round-trip.
//
// So this gate asserts the RENDERED result against a competing rule, not just the
// attribute: a check that only compared cssText would pass on a tool whose layout
// had already broken, and a check that only read the value would have missed the
// original defect entirely.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
const SELFTEST = process.argv.includes('--selftest');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function page(mod) {
  const file = path.join(OUT, 'stem-fs-roundtrip.html');
  fs.writeFileSync(file,
    '<!doctype html><html><head><meta charset="utf-8">\n'
    // An !important stylesheet rule beats a NON-important inline one. That is
    // precisely what the stage's own !important exists to hold off, so it is the
    // condition that makes a lost priority visible rather than merely untidy.
    + '<style>#stage { height: 90px !important; } #plain { height: 70px; }</style>\n'
    + '</head><body>\n'
    + '<div id="stage" style="height:400px !important;position:relative;border-radius:12px">S</div>\n'
    + '<div id="plain" style="height:300px;position:relative">P</div>\n'
    + '<script>window.StemLab={registerTool:function(){},registerHelper:function(){},getHelper:function(){return null;}};<\/script>\n'
    + '<script>' + mod + '<\/script>\n'
    + '</body></html>', 'utf8');
  return file;
}

async function run(chromium, mod, label) {
  const checks = [];
  const ok = (n, p, d) => checks.push({ n, p, d });
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1000, height: 700 } });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
  try {
    await pg.goto('file://' + page(mod).split(path.sep).join('/'));
    await pg.waitForTimeout(700);
    const res = await pg.evaluate(() => {
      if (typeof window.__alloStemFS !== 'function') return { error: 'helper not defined' };
      // Force the CSS fill-frame path: that is what a sandboxed embed (the Canvas
      // surface) actually gets, and it is the only path that rewrites inline styles.
      Object.defineProperty(document, 'fullscreenEnabled', { get: () => false, configurable: true });
      delete Element.prototype.requestFullscreen;
      delete Element.prototype.webkitRequestFullscreen;
      const snap = (el) => ({
        css: el.style.cssText,
        h: Math.round(el.getBoundingClientRect().height),
        pri: el.style.getPropertyPriority('height'),
        posPri: el.style.getPropertyPriority('position'),
      });
      const out = {};
      for (const id of ['stage', 'plain']) {
        const el = document.getElementById(id);
        const before = snap(el);
        window.__alloStemFS(el);
        const during = snap(el);
        window.__alloStemFS(el);
        out[id] = { before, during, after: snap(el) };
      }
      return out;
    });
    if (res.error) { ok('helper defined', false, res.error); }
    else {
      const s = res.stage, p = res.plain;
      ok('fill-frame actually grew the stage', s.during.h > s.before.h, s.before.h + ' -> ' + s.during.h);
      // The headline: rendered height, against a competing !important rule.
      ok('stage keeps its height after the round-trip', s.after.h === s.before.h,
        s.before.h + 'px -> ' + s.after.h + 'px (a stylesheet rule took over)');
      ok('!important priority is restored', s.after.pri === s.before.pri,
        JSON.stringify(s.before.pri) + ' -> ' + JSON.stringify(s.after.pri));
      ok('inline styles are byte-identical', s.after.css === s.before.css,
        '\n      before: ' + s.before.css + '\n      after : ' + s.after.css);
      // The inverse matters too: restoring a priority that was never there would
      // make the stage start winning arguments it used to lose.
      ok('a non-important value stays non-important', p.after.pri === '' && p.after.pri === p.before.pri,
        'plain height priority became ' + JSON.stringify(p.after.pri));
      ok('position priority not invented', s.after.posPri === s.before.posPri,
        JSON.stringify(s.before.posPri) + ' -> ' + JSON.stringify(s.after.posPri));
      ok('plain stage restored too', p.after.h === p.before.h, p.before.h + ' -> ' + p.after.h);
    }
    ok('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    ok('run completed', false, String(e.message).split(/\r?\n/)[0]);
  }
  await b.close();
  const bad = checks.filter((c) => !c.p);
  console.log('\n— ' + label + ' —');
  for (const c of checks) console.log('  ' + (c.p ? 'ok  ' : 'FAIL') + '  ' + c.n + (c.p ? '' : '   [' + c.d + ']'));
  console.log('  ' + (checks.length - bad.length) + '/' + checks.length + ' passed');
  return bad.length === 0;
}

(async () => {
  const { chromium } = require('playwright');
  const mod = read('stem_lab/stem_lab_module.js');
  const live = await run(chromium, mod, 'stem_lab/stem_lab_module.js');

  if (!SELFTEST) {
    console.log('\n' + (live ? 'stem fullscreen style round-trip: OK' : 'stem fullscreen style round-trip: FAILURES above'));
    process.exit(live ? 0 : 1);
  }

  // A gate that cannot fail is worse than none. Drop the priority on restore -
  // the original defect, exactly - and require a red.
  console.log('\n=== selftest: dropping the restored priority ===');
  const marker = "s.setProperty(p, saved[p], savedPri[p] || '')";
  if (mod.indexOf(marker) < 0) {
    console.log('SELFTEST INCONCLUSIVE — restore call not found; update the marker.');
    process.exit(1);
  }
  const broken = mod.replace(marker, 's.setProperty(p, saved[p])');
  const mutated = await run(chromium, broken, 'MUTATED (priority dropped on restore)');
  console.log('\nselftest: ' + (!mutated ? 'PASS — the gate goes red on the real defect' : 'FAIL — the gate stayed green with the defect reinstated'));
  console.log(live ? 'live helper: OK' : 'live helper: FAILURES above');
  process.exit(!mutated && live ? 0 : 1);
})();
