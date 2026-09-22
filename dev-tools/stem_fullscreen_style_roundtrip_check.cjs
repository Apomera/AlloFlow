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
    // ── Re-entry ─────────────────────────────────────────────────────────
    // Entering the fill-frame twice without an exit between. A tool that re-renders
    // can hand over a node whose __alloFsOn flag reads false while the fill-frame
    // styles are still on it. The second enter used to re-snapshot, saving 100vh and
    // fixed as if they were the element's ORIGINALS - after that no exit could ever
    // restore it and the stage stayed fullscreen for good, Escape included. It also
    // overwrote the stored Escape handler, orphaning the first listener.
    const reentry = await pg.evaluate(() => {
      const el = document.createElement('div');
      el.style.height = '400px'; el.style.position = 'relative';
      document.body.appendChild(el);
      let keydowns = 0;
      const rAdd = document.addEventListener.bind(document);
      const rRem = document.removeEventListener.bind(document);
      document.addEventListener = function (t, f, o) { if (t === 'keydown') keydowns++; return rAdd(t, f, o); };
      document.removeEventListener = function (t, f, o) { if (t === 'keydown') keydowns--; return rRem(t, f, o); };
      const before = { h: el.style.getPropertyValue('height'), p: el.style.getPropertyValue('position') };
      window.__alloStemFS(el);      // enter
      el.__alloFsOn = false;        // a re-render presents a node that looks fresh
      window.__alloStemFS(el);      // enter again
      window.__alloStemFS(el);      // one exit
      const after = { h: el.style.getPropertyValue('height'), p: el.style.getPropertyValue('position') };
      document.addEventListener = rAdd; document.removeEventListener = rRem;
      el.remove();
      return { before, after, keydowns };
    });
    ok('re-entry does not corrupt the style snapshot',
      reentry.after.h === reentry.before.h && reentry.after.p === reentry.before.p,
      'height ' + JSON.stringify(reentry.before.h) + ' -> ' + JSON.stringify(reentry.after.h)
        + ', position ' + JSON.stringify(reentry.before.p) + ' -> ' + JSON.stringify(reentry.after.p)
        + ' (the stage can no longer be un-fullscreened)');
    ok('re-entry does not orphan an Escape listener', reentry.keydowns === 0,
      reentry.keydowns + ' keydown listener(s) left on document');

    // ── Binding lifecycle ────────────────────────────────────────────────
    // __alloStemFsBind registers a MutationObserver and two document listeners per
    // button, and sweeps them when a binding dies. A tool that re-renders in place
    // keeps its stage node and hands over a FRESH button, so a sweep that only asks
    // about the stage collects nothing: twelve re-renders left twelve live observers
    // and twenty-four listeners, all still writing aria-pressed onto buttons that had
    // left the page. Counted, not inspected — the leak is invisible in the DOM.
    const churn = await pg.evaluate(() => {
      if (typeof window.__alloStemFsBind !== 'function') return { error: 'binder not defined' };
      const host = document.body.appendChild(document.createElement('div'));
      const stage = document.createElement('div');
      stage.setAttribute('data-allo-fs-stage', 'true');
      host.appendChild(stage);
      const newBtn = () => {
        const b = document.createElement('button');
        b.setAttribute('data-allo-fs-btn', 'true');
        b.appendChild(document.createElement('span'));
        return b;
      };
      let b0 = newBtn(); stage.appendChild(b0);
      window.__alloStemFsBind(b0, stage);
      const before = (window.__alloStemFsBindings || []).length;
      // A re-render in place: same stage, replacement button, every time.
      for (let i = 0; i < 12; i++) {
        const old = stage.querySelector('button');
        if (old) old.remove();
        const nb = newBtn();
        stage.appendChild(nb);
        window.__alloStemFsBind(nb, stage);
      }
      const all = window.__alloStemFsBindings || [];
      const live = all.filter((x) => (!x.stage || x.stage.isConnected !== false) && (!x.btn || x.btn.isConnected !== false)).length;
      // What actually costs work: how many handlers answer one fullscreenchange.
      let writes = 0;
      const realSet = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function (n, v) { if (n === 'aria-pressed') writes++; return realSet.call(this, n, v); };
      document.dispatchEvent(new Event('fullscreenchange'));
      Element.prototype.setAttribute = realSet;
      const connected = document.querySelectorAll('[data-allo-fs-btn]').length;
      host.remove();
      return { grew: all.length - before, total: all.length, live, writes, connected };
    });
    if (churn.error) ok('binder defined', false, churn.error);
    else {
      ok('re-rendering a button does not leak bindings', churn.grew === 0,
        '12 re-renders added ' + churn.grew + ' binding(s) that nothing will sweep');
      ok('every retained binding is still live', churn.total === churn.live,
        churn.total + ' retained, only ' + churn.live + ' live');
      // The cost the learner's browser actually pays on each fullscreen change.
      ok('one aria write per button still on the page', churn.writes <= churn.connected,
        churn.writes + ' aria-pressed writes for ' + churn.connected + ' button(s) in the page');
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

  // Second defect, second mutation. Each assertion group needs its own, or a gate
  // can look mutation-verified while half of it is inert.
  console.log('\n=== selftest: sweeping on the stage only ===');
  const sweepMarker = "|| (b.btn && b.btn.isConnected === false)";
  let sweepRed = null;
  if (mod.indexOf(sweepMarker) < 0) {
    console.log('SELFTEST INCONCLUSIVE — sweep predicate not found; update the marker.');
  } else {
    const brokenSweep = mod.replace(sweepMarker, '');
    sweepRed = !(await run(chromium, brokenSweep, 'MUTATED (sweep ignores the button)'));
  }

  console.log('\n=== selftest: re-snapshotting on re-entry ===');
  const reMarker = "var reentry = !!el.__alloFsSaved && el.style.getPropertyValue('position') === 'fixed'";
  let reRed = null;
  if (mod.indexOf(reMarker) < 0) {
    console.log('SELFTEST INCONCLUSIVE — re-entry guard not found; update the marker.');
  } else {
    const brokenRe = mod.replace(reMarker, 'var reentry = false && !!el.__alloFsSaved');
    reRed = !(await run(chromium, brokenRe, 'MUTATED (re-entry re-snapshots)'));
  }

  const allRed = !mutated && sweepRed === true && reRed === true;
  console.log('\nselftest: ' + (allRed ? 'PASS — the gate goes red on all three real defects'
    : 'FAIL — a reinstated defect left the gate green'
      + (mutated ? ' [priority]' : '') + (sweepRed === false ? ' [sweep]' : '')
      + (sweepRed === null ? ' [sweep inconclusive]' : '')
      + (reRed === false ? ' [re-entry]' : '') + (reRed === null ? ' [re-entry inconclusive]' : '')));
  console.log(live ? 'live helper: OK' : 'live helper: FAILURES above');
  process.exit(allRed && live ? 0 : 1);
})();
