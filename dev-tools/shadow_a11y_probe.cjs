#!/usr/bin/env node
// Accessibility probe for STEM tools that mount into a SHADOW ROOT.
//
//   node dev-tools/shadow_a11y_probe.cjs [toolFile ...] [--dark] [--all] [--json <path>]
//
// WHY THIS EXISTS. Two tools -- fieldjourneys and applab -- render into
// `attachShadow({mode:'open'})`. Every existing instrument reported them clean,
// and every one of those reports was worthless:
//
//   * check_stem_a11y.cjs renders in jsdom without running effects, so the
//     shadow root is never created at all -> reported `empty-render`.
//   * axe_a11y_depth.cjs DOES mount them and axe DOES descend into an open
//     shadow root -- but it printed "CLEAN at depth / total 0" for a tool whose
//     entire visible output was the sentence "The field station could not open".
//     A failure screen has almost no markup, so it has almost nothing to fail.
//   * That probe's interaction walk uses document.querySelectorAll(), which does
//     NOT pierce shadow roots, so the <details>/toggle/tab walk drove nothing.
//
// So this probe does three things the others cannot:
//   1. RESOLVES ENGINE DEPENDENCIES. fieldJourneys reads
//      window.__alloTreeLabEngine, which stem_tool_treelab.js defines. Without
//      it the tool renders its error screen. Dependencies are discovered by
//      scanning for `window.__allo*` reads and finding the tool that assigns
//      them -- not hardcoded -- so a new pairing is picked up automatically.
//   2. REFUSES TO SAY "CLEAN" WHEN IT DID NOT MEASURE. Every run is classified
//      MEASURED or UNMEASURED. An error screen, an empty root, or a root with no
//      interactive elements is UNMEASURED and exits non-zero. A clean bill of
//      health has to be earned.
//   3. PIERCES SHADOW ROOTS for both the axe scan and the interaction walk.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const args = process.argv.slice(2);
const DARK = args.includes('--dark');
const ALL = args.includes('--all');
const jsonIdx = args.indexOf('--json');
const JSON_OUT = jsonIdx >= 0 ? args[jsonIdx + 1] : null;
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const TW = path.join(ROOT, 'dev-tools', '.cache', 'sweep-tailwind.css');
if (!fs.existsSync(TW)) {
  console.error('Missing dev-tools/.cache/sweep-tailwind.css - build it with:');
  console.error('  node dev-tools/build_sweep_tailwind_css.cjs');
  process.exit(2);
}

const STEM_DIR = path.join(ROOT, 'stem_lab');
const allTools = fs.readdirSync(STEM_DIR).filter((f) => /^stem_tool_.*\.js$/.test(f));

/** Tools that call attachShadow -- the ones every other instrument mis-reads. */
function shadowTools() {
  return allTools.filter((f) => fs.readFileSync(path.join(STEM_DIR, f), 'utf8').includes('attachShadow'));
}

let targets = args.filter((a) => !a.startsWith('--') && a !== JSON_OUT);
if (ALL || !targets.length) targets = shadowTools().map((f) => path.join('stem_lab', f));

/**
 * Which other tool files does this one need loaded first?
 * A tool that READS window.__alloFooEngine needs whichever tool ASSIGNS it.
 */
function resolveDeps(toolFile, src) {
  const reads = new Set([...src.matchAll(/window\.(__allo[A-Za-z0-9_]+)/g)].map((m) => m[1]));
  const deps = [];
  for (const g of reads) {
    if (new RegExp('window\\.' + g + '\\s*=').test(src)) continue; // it defines its own
    for (const f of allTools) {
      const p = path.join('stem_lab', f);
      if (p === toolFile.replace(/\\/g, '/')) continue;
      const other = fs.readFileSync(path.join(ROOT, p), 'utf8');
      if (new RegExp('window\\.' + g + '\\s*=').test(other)) { deps.push({ global: g, file: p }); break; }
    }
  }
  return deps;
}

const SHELL = `
window.__mount = function (id, dark) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry[id];
  if (!cfg) return 'not-registered:' + id;
  var Host = function () {
    var init = {}; init[id] = {};
    var pair = React.useState(init);
    var ctx = { React: React, toolData: pair[0], setToolData: pair[1],
      theme: dark ? 'dark' : 'light', isDark: !!dark, isContrast: false,
      gradeBand: 'g68', gradeLevel: '7th Grade',
      setStemLabTool: function(){}, setStemLabTab: function(){}, setToolSnapshots: function(){},
      addToast: function(){}, announceToSR: function(){}, awardXP: function(){},
      beep: function(){}, celebrate: function(){}, canvasNarrate: function(){},
      canvasA11yDesc: function(){}, callGemini: null, callTTS: null, callImagen: null,
      callGeminiVision: null, stemLabTab: 'explore', stemLabTool: null,
      toolSnapshots: [], props: {}, srOnly: {},
      update: function(){}, updateMulti: function(){}, setLabToolData: pair[1],
      labToolData: pair[0],
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) { return fb != null ? fb : k; }, getXP: function () { return 0; } };
    var rendered;
    try { rendered = cfg.render(ctx); }
    catch (e) { return React.createElement('div', { 'data-threw': '1' }, 'threw: ' + e.message); }
    return rendered;
  };
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return id;
};

// --- shadow-piercing helpers, installed once and reused by every phase ---
window.__roots = function () {
  var out = [document];
  (function walk(node) {
    var kids = node.querySelectorAll ? node.querySelectorAll('*') : [];
    for (var i = 0; i < kids.length; i++) {
      if (kids[i].shadowRoot) { out.push(kids[i].shadowRoot); walk(kids[i].shadowRoot); }
    }
  }(document.getElementById('slot')));
  return out;
};
window.__deepAll = function (sel) {
  var found = [];
  window.__roots().forEach(function (r) {
    var scope = r === document ? document.getElementById('slot') : r;
    if (!scope || !scope.querySelectorAll) return;
    found = found.concat(Array.prototype.slice.call(scope.querySelectorAll(sel)));
  });
  return found;
};`;

const INTERACTIVE = 'a[href],button,[role=button],input,select,textarea,summary,[tabindex]:not([tabindex="-1"])';
// Phrases a tool shows when a dependency failed to load. If the whole render is
// one of these, the run measured the error screen, not the tool.
const FAILURE_HINTS = [
  'could not open', 'did not load', 'failed to load', 'unable to load',
  'not available', 'something went wrong', 'engine did not',
];

async function probe(toolFile) {
  const rel = toolFile.replace(/\\/g, '/');
  const toolSrc = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const idMatch = /registerTool\(\s*['"]([^'"]+)['"]/.exec(toolSrc);
  if (!idMatch) return { tool: rel, verdict: 'SKIP', why: 'no registerTool() id' };
  const TOOL_ID = idMatch[1];
  const deps = resolveDeps(rel, toolSrc);

  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));

  await page.setContent('<!doctype html><html><head><style>' + fs.readFileSync(TW, 'utf8') +
    '</style><style>body{margin:0;font-family:system-ui;background:' +
    (DARK ? '#0f172a' : '#ffffff') + '}</style></head><body><div id="slot" class="' +
    (DARK ? 'theme-dark' : 'theme-default') + '"></div></body></html>');

  const bundle = [
    read('node_modules/axe-core/axe.min.js'),
    read('desktop/web-app/node_modules/react/umd/react.production.min.js'),
    read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'),
    read('stem_lab/stem_lab_module.js'),
    ...deps.map((d) => read(d.file)),
    toolSrc,
    SHELL,
  ];
  for (const code of bundle) await page.addScriptTag({ content: code });

  const status = await page.evaluate(({ id, dark }) => window.__mount(id, dark), { id: TOOL_ID, dark: DARK });
  if (typeof status === 'string' && /^not-registered/.test(status)) {
    await browser.close();
    return { tool: rel, id: TOOL_ID, verdict: 'SKIP', why: status, deps };
  }
  await page.waitForTimeout(4000);

  // ---- did we actually mount anything? ----
  const shape = await page.evaluate((interactive) => {
    const slot = document.getElementById('slot');
    const roots = window.__roots();
    const shadowCount = roots.length - 1;
    // text with <style>/<script> removed -- CSS is not content
    const textOf = (scope) => {
      const c = scope.cloneNode(true);
      c.querySelectorAll && c.querySelectorAll('style,script').forEach((n) => n.remove());
      return (c.textContent || '').replace(/\s+/g, ' ').trim();
    };
    let text = textOf(slot);
    roots.slice(1).forEach((r) => {
      const holder = document.createElement('div');
      holder.append(...Array.from(r.children).map((n) => n.cloneNode(true)));
      text += ' ' + textOf(holder);
    });
    return {
      shadowRoots: shadowCount,
      threw: !!slot.querySelector('[data-threw]'),
      text: text.trim(),
      textLen: text.trim().length,
      interactive: window.__deepAll(interactive).length,
      headings: window.__deepAll('h1,h2,h3,h4,h5,h6,[role=heading]').length,
      live: window.__deepAll('[aria-live]').length,
      landmarks: window.__deepAll('main,[role=main],nav,[role=navigation]').length,
      canvases: window.__deepAll('canvas').length,
      imgs: window.__deepAll('img').length,
      unnamedImgs: window.__deepAll('img:not([alt])').length,
    };
  }, INTERACTIVE);

  // Verdict is about whether REAL CONTENT was measured, not about where it
  // lives. applab calls attachShadow inside a web component that only exists
  // once a student runs an app, so its first screen is ordinary light DOM and
  // is perfectly measurable -- "no shadow root" is a coverage note there, not a
  // failure. Content checks therefore come first.
  const lowered = shape.text.toLowerCase();
  const looksBroken = FAILURE_HINTS.some((h) => lowered.includes(h)) && shape.textLen < 600;
  let verdict = 'MEASURED';
  let why = '';
  let note = '';
  if (shape.threw) { verdict = 'UNMEASURED'; why = 'render() threw'; }
  else if (shape.textLen === 0) { verdict = 'UNMEASURED'; why = 'rendered no text at all'; }
  else if (looksBroken) { verdict = 'UNMEASURED'; why = 'rendered a failure screen: "' + shape.text.slice(0, 90) + '"'; }
  else if (shape.interactive === 0) { verdict = 'UNMEASURED'; why = 'no interactive elements - probably a pre-load or gated state'; }
  if (verdict === 'MEASURED' && shape.shadowRoots === 0) {
    note = 'declares attachShadow but no shadow root is live in this state - its shadow surface is NOT covered by this run';
  }

  const runAxe = () => page.evaluate(async () => {
    // axe descends into OPEN shadow roots on its own; #slot is the whole tool.
    const r = await window.axe.run('#slot', {
      resultTypes: ['violations'],
      rules: {
        'color-contrast': { enabled: false }, 'color-contrast-enhanced': { enabled: false },
        region: { enabled: false }, 'page-has-heading-one': { enabled: false },
        'landmark-one-main': { enabled: false }, bypass: { enabled: false },
        'html-has-lang': { enabled: false }, 'document-title': { enabled: false },
      },
    });
    return r.violations.flatMap((x) => x.nodes.map((n) => {
      const html = String(n.html || '').replace(/\s+/g, ' ').slice(0, 110);
      return { key: x.id + '|' + html, id: x.id, impact: x.impact || '', help: x.help || '', html };
    }));
  });

  const seen = new Set();
  const states = [];
  const record = async (label) => {
    const v = await runAxe();
    const fresh = v.filter((x) => !seen.has(x.key));
    fresh.forEach((x) => seen.add(x.key));
    states.push({ label, fresh, total: v.length });
  };

  await record('baseline');

  if (verdict === 'MEASURED') {
    const nDetails = await page.evaluate(() => {
      const ds = window.__deepAll('details:not([open])');
      ds.forEach((d) => { d.open = true; });
      return ds.length;
    });
    if (nDetails) { await page.waitForTimeout(400); await record('expand ' + nDetails + ' <details>'); }

    const nToggles = await page.evaluate(() => {
      const ts = window.__deepAll('[aria-expanded="false"]').filter((el) => el.getAttribute('role') !== 'tab');
      ts.forEach((el) => { try { el.click(); } catch (e) {} });
      return ts.length;
    });
    if (nToggles) { await page.waitForTimeout(600); await record('open ' + nToggles + ' toggles'); }

    const tabNames = await page.evaluate(() => window.__deepAll('[role=tab]')
      .map((el) => (el.textContent || el.getAttribute('aria-label') || '?').trim().slice(0, 30)));
    for (let i = 0; i < tabNames.length; i++) {
      const ok = await page.evaluate((idx) => {
        const el = window.__deepAll('[role=tab]')[idx];
        if (!el) return false;
        try { el.click(); } catch (e) { return false; }
        return true;
      }, i);
      if (!ok) continue;
      await page.waitForTimeout(450);
      await record('tab "' + tabNames[i] + '"');
    }

    // Primary actions: click the first few buttons, each its own axe pass.
    const btns = await page.evaluate(() => window.__deepAll('button:not([disabled])')
      .slice(0, 6).map((el) => (el.textContent || el.getAttribute('aria-label') || '?').trim().slice(0, 30)));
    for (let i = 0; i < btns.length; i++) {
      const ok = await page.evaluate((idx) => {
        const el = window.__deepAll('button:not([disabled])')[idx];
        if (!el) return false;
        try { el.click(); } catch (e) { return false; }
        return true;
      }, i);
      if (!ok) continue;
      await page.waitForTimeout(450);
      await record('button "' + btns[i] + '"');
    }
  }

  await browser.close();
  const findings = states.flatMap((s) => s.fresh.map((f) => ({ ...f, state: s.label })));
  return { tool: rel, id: TOOL_ID, verdict, why, note, deps, shape, states, findings, errors: errors.slice(0, 3) };
}

(async () => {
  const results = [];
  for (const t of targets) results.push(await probe(t));

  let bad = 0;
  for (const r of results) {
    console.log('\n=== ' + r.tool + '  [' + (r.id || '?') + ']  ' + (DARK ? 'DARK' : 'LIGHT'));
    if (r.deps && r.deps.length) {
      console.log('    deps loaded: ' + r.deps.map((d) => d.global + ' <- ' + path.basename(d.file)).join(', '));
    }
    if (r.verdict === 'SKIP') { console.log('    SKIP - ' + r.why); continue; }
    const s = r.shape;
    console.log('    shadow roots ' + s.shadowRoots + ' | interactive ' + s.interactive +
      ' | headings ' + s.headings + ' | aria-live ' + s.live + ' | landmarks ' + s.landmarks +
      ' | canvas ' + s.canvases + ' | text ' + s.textLen + ' chars');
    if (r.verdict === 'UNMEASURED') {
      bad++;
      console.log('    *** UNMEASURED - ' + r.why);
      console.log('    A clean axe result here means nothing. Fix the mount before trusting any sweep.');
      continue;
    }
    if (r.note) console.log('    NOTE - ' + r.note);
    console.log('    states probed: ' + r.states.length);
    for (const st of r.states) {
      console.log('    - ' + st.label + ': total ' + st.total + (st.fresh.length ? '  << ' + st.fresh.length + ' NEW' : ''));
      for (const f of st.fresh) {
        console.log('        [' + (f.impact || '?') + '] ' + f.id + ' -- ' + f.help);
        console.log('        ' + f.html);
      }
    }
    if (!r.findings.length) console.log('    CLEAN at depth (measured: real content, shadow-pierced walk)');
    else bad++;
    if (r.errors.length) console.log('    page errors: ' + r.errors.join(' | '));
  }

  if (JSON_OUT) {
    fs.writeFileSync(path.resolve(ROOT, JSON_OUT), JSON.stringify({ dark: DARK, results }, null, 2));
    console.log('\nwrote ' + JSON_OUT);
  }
  const measured = results.filter((r) => r.verdict === 'MEASURED').length;
  console.log('\n' + measured + '/' + results.filter((r) => r.verdict !== 'SKIP').length +
    ' shadow tool(s) actually measured; ' + bad + ' need attention.');
  process.exit(bad ? 1 : 0);
})();
