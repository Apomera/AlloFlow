// State-walking probe for Plate Tectonics: for every tab, click every control by
// SIGNATURE (never by index — the control list mutates as panels open, and
// indexing clicks arbitrary buttons while silently skipping others), then scan
// every rendered leaf for template holes.
//
//   node dev-tools/pt_state_walk.cjs <out-dir> [dark|light] [passes]
//     PT_ONLY=tab,tab   restrict to these tabs
//     PT_VERBOSE=1      print every control visited
//
// The interesting controls are the ones that do not exist yet (a panel has no
// True/False until you press Start), so the control list is re-read every round
// and a visited set keyed on (tag|aria-label|text) stops repeats.
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
const DARK = (process.argv[3] || 'dark') === 'dark';
const PASSES = parseInt(process.argv[4] || '3', 10);
const ONLY = (process.env.PT_ONLY || '').split(',').filter(Boolean);
const VERBOSE = !!process.env.PT_VERBOSE;

const TABS = ['sim', 'earthquake', 'timeline', 'quiz', 'boundaryHunt', 'encyclopedia', 'plateProfiles',
  'boundaries', 'faults', 'volcanoes', 'mountains', 'tsunamis', 'hotspots', 'seafloor', 'rocks',
  'minerals', 'fossils', 'dinosaurs', 'extinctions', 'periods', 'paleo', 'hominids', 'cascadia',
  'preparedness', 'quakeStories', 'eruptions', 'impacts', 'events', 'parks', 'us_states', 'landforms',
  'caves', 'outcrops', 'geothermal', 'critical_minerals', 'methods', 'expeditions', 'submersibles',
  'projects', 'women', 'indigenous', 'climate', 'insights', 'history', 'biographies', 'maine',
  'careers', 'glossary', 'lessons', 'concepts', 'review', 'faq', 'resources', 'about'];

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const pageErrors = [];
  pg.on('pageerror', (e) => pageErrors.push(e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));

  // One scan function, injected once per evaluate. Leaves only: a container's
  // text is its children's, and grading it too would report every hole twice.
  const SCAN = `(() => {
    const BAD = [
      [/\\bundefined\\b/, 'undefined'], [/\\bNaN\\b/, 'NaN'], [/\\[object [A-Z]\\w+\\]/, '[object]'],
      [/\\bInfinity\\b/, 'Infinity'], [/\\{\\{[^}]+\\}\\}/, 'unreplaced token'],
      [/function\\s*\\([^)]*\\)\\s*\\{/, 'stringified function'], [/\\bnull\\b/, 'null']
    ];
    const out = [];
    document.querySelectorAll('*').forEach((el) => {
      if (el.children.length) return;
      const t = (el.textContent || '').trim();
      if (!t || t.length > 400) return;
      BAD.forEach(([re, name]) => {
        if (re.test(t)) out.push({ kind: name, text: t.slice(0, 160), tag: el.tagName.toLowerCase() });
      });
    });
    // Canvas aria-labels and live regions are read aloud, so they carry holes too.
    document.querySelectorAll('[aria-label],[data-pt-scene-text],[aria-live]').forEach((el) => {
      const t = (el.getAttribute('aria-label') || el.textContent || '').trim();
      if (!t || t.length > 900) return;
      BAD.forEach(([re, name]) => {
        if (re.test(t)) out.push({ kind: name + ' (label)', text: t.slice(0, 160), tag: el.tagName.toLowerCase() });
      });
    });
    return out;
  })()`;

  const findings = [];
  const tabs = ONLY.length ? ONLY : TABS;
  for (const tab of tabs) {
    const before = pageErrors.length;
    await pg.evaluate(([d, t]) => window.__mount(d, t), [DARK, tab]);
    await pg.waitForTimeout(700);
    // Scan the RESTING state first. A click can navigate away (a hub or
    // category card sets simTab), and everything after that belongs to another
    // screen — grading only the end state reported the wrong tab's leaves.
    (await pg.evaluate(SCAN)).forEach((h) => findings.push(Object.assign({ tab, after: '(resting)' }, h)));
    const visited = new Set();
    let clicks = 0, drifted = 0;
    for (let round = 0; round < PASSES; round++) {
      // Re-read the control list every round: opening a panel creates controls
      // that did not exist when the round started.
      const sigs = await pg.evaluate(() => Array.from(document.querySelectorAll('button,[role="button"],summary'))
        .map((el) => el.tagName.toLowerCase() + '|' + (el.getAttribute('aria-label') || '') + '|' + (el.textContent || '').trim().slice(0, 40)));
      let didOne = false;
      for (const sig of sigs) {
        if (visited.has(sig)) continue;
        visited.add(sig);
        const ok = await pg.evaluate((s) => {
          const el = Array.from(document.querySelectorAll('button,[role="button"],summary'))
            .find((x) => x.tagName.toLowerCase() + '|' + (x.getAttribute('aria-label') || '') + '|' + (x.textContent || '').trim().slice(0, 40) === s);
          // Never leave the tool or change tab: that would walk a different page
          // under this tab's name.
          if (!el || /Back to Tools|^🏠|Hub$/.test(el.textContent || '')) return false;
          el.click(); return true;
        }, sig);
        if (!ok) continue;
        clicks++; didOne = true;
        if (VERBOSE) console.log('   click ' + sig);
        await pg.waitForTimeout(150);
        // Did that click leave the tab? If so its findings are another screen's,
        // so drop them and put the tab back before carrying on.
        // simTab alone is not the whole of "where am I": a category card sets
        // _ptCategory and swaps the tab body for a tool list without touching
        // simTab, and the search box does the same.
        const now = await pg.evaluate(() => { const d = ((window.__toolState || {}).plateTectonics) || {}; return d.simTab + '|' + (d._ptCategory || '') + '|' + (d._ptSearch || ''); });
        if (now !== tab + '|' + '|' + '') {
          drifted++;
          await pg.evaluate(([d, t]) => window.__mount(d, t), [DARK, tab]);
          await pg.waitForTimeout(400);
          continue;
        }
        const hits = await pg.evaluate(SCAN);
        hits.forEach((h) => findings.push(Object.assign({ tab, after: sig }, h)));
      }
      if (!didOne) break;
    }
    const newErr = pageErrors.slice(before);
    console.log(tab.padEnd(18), 'controls=' + String(clicks).padEnd(4), 'drift=' + String(drifted).padEnd(3),
      'holes=' + findings.filter((f) => f.tab === tab).length,
      newErr.length ? 'PAGE ERRORS: ' + newErr.join(' | ') : '');
  }

  // De-duplicate: the same hole re-reported after every subsequent click is one bug.
  const seen = new Set(); const uniq = [];
  findings.forEach((f) => { const k = f.tab + '|' + f.kind + '|' + f.text; if (!seen.has(k)) { seen.add(k); uniq.push(f); } });
  console.log('\n=== ' + uniq.length + ' distinct holes (' + (DARK ? 'dark' : 'light') + ') ===');
  uniq.forEach((f) => console.log('[' + f.tab + '] ' + f.kind + ' <' + f.tag + '> after ' + f.after + '\n    ' + f.text));
  console.log('\npage errors: ' + pageErrors.length);
  pageErrors.slice(0, 10).forEach((e) => console.log('  ' + e));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
