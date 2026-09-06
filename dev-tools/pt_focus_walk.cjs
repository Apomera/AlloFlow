// Tab through a tab's controls and record what a keyboard or screen-reader user
// actually gets: the accessible name, the size of the target, and whether the
// focus ring is visible. Reports duplicate names, which are the defect that does
// not show up in a screenshot — sixty stops all called "Show answer" are sixty
// identical stops.
//   node dev-tools/pt_focus_walk.cjs <out-dir> <tab> [maxStops]
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
const TAB = process.argv[3] || 'review';
// 'all' walks every tab and prints one line each, so a naming defect on a tab
// nobody opens is still found.
const ALL_TABS = ['sim', 'earthquake', 'timeline', 'quiz', 'boundaryHunt', 'encyclopedia', 'plateProfiles',
  'boundaries', 'faults', 'volcanoes', 'mountains', 'tsunamis', 'hotspots', 'seafloor', 'rocks',
  'minerals', 'fossils', 'dinosaurs', 'extinctions', 'periods', 'paleo', 'hominids', 'cascadia',
  'preparedness', 'quakeStories', 'eruptions', 'impacts', 'events', 'parks', 'us_states', 'landforms',
  'caves', 'outcrops', 'geothermal', 'critical_minerals', 'methods', 'expeditions', 'submersibles',
  'projects', 'women', 'indigenous', 'climate', 'insights', 'history', 'biographies', 'maine',
  'careers', 'glossary', 'lessons', 'concepts', 'review', 'faq', 'resources', 'about'];
const MAX = parseInt(process.argv[4] || '140', 10);
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  const tabs = TAB === 'all' ? ALL_TABS : [TAB];
  const summary = [];
  for (const tab of tabs) {
  await pg.evaluate((t) => window.__mount(false, t), tab);
  await pg.waitForTimeout(900);
  await pg.evaluate(() => document.body.focus());

  const stops = [];
  for (let i = 0; i < MAX; i++) {
    await pg.keyboard.press('Tab');
    const s = await pg.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      // Accessible name, near enough for this purpose: aria-label, then the
      // labelled-by text, then the control's own text.
      let name = e.getAttribute('aria-label') || '';
      if (!name && e.getAttribute('aria-labelledby')) {
        const l = document.getElementById(e.getAttribute('aria-labelledby'));
        name = l ? l.textContent.trim() : '';
      }
      // A checkbox usually gets its name from a WRAPPING <label>, or from a
      // label whose `for` points at it. Skipping those two routes invents
      // unnamed controls that are perfectly well labelled.
      if (!name && e.id) {
        const l = document.querySelector('label[for="' + e.id + '"]');
        if (l) name = l.textContent.trim();
      }
      if (!name) {
        const wrap = e.closest('label');
        if (wrap) name = wrap.textContent.trim();
      }
      if (!name) name = (e.textContent || '').trim().slice(0, 60);
      if (!name && e.getAttribute('placeholder')) name = 'placeholder: ' + e.getAttribute('placeholder');
      return {
        tag: e.tagName.toLowerCase(), name,
        cls: (typeof e.className === 'string' ? e.className : '').slice(0, 70),
        itype: e.getAttribute('type') || '',
        hook: ['data-pt-review-reveal', 'data-pt-plate-card', 'data-pt-stress-log'].map(function (h) { return e.getAttribute(h) ? h : ''; }).filter(Boolean).join(','),
        w: Math.round(r.width), h: Math.round(r.height),
        ring: cs.outlineStyle !== 'none' || /ring/.test(e.className || '')
      };
    });
    if (!s) break;
    stops.push(s);
  }

  const byName = new Map();
  stops.forEach((s) => byName.set(s.name, (byName.get(s.name) || 0) + 1));
  const dupes = [...byName.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
  const unnamed = stops.filter((s) => !s.name);
  const small = stops.filter((s) => (s.w < 24 || s.h < 24) && s.w * s.h > 0);

  summary.push({ tab: tab, stops: stops.length, unnamed: unnamed.length, small: small.length, dupes: dupes.length, worst: dupes.length ? dupes[0] : null });
  if (TAB === 'all') {
    console.log(tab.padEnd(18) + 'stops=' + String(stops.length).padEnd(5) +
      'unnamed=' + String(unnamed.length).padEnd(3) + 'small=' + String(small.length).padEnd(3) +
      'dupNames=' + String(dupes.length).padEnd(3) + (dupes.length ? '  worst: x' + dupes[0][1] + ' "' + dupes[0][0].slice(0, 46) + '"' : ''));
    continue;
  }
  console.log(tab + ': ' + stops.length + ' focus stops');
  console.log('  unnamed: ' + unnamed.length);
  console.log('  under 24px in a dimension: ' + small.length + (small.length ? '  e.g. ' + JSON.stringify(small.slice(0, 3)) : ''));
  console.log('  duplicate accessible names: ' + dupes.length);
  dupes.slice(0, 8).forEach(([n, c]) => console.log('     x' + c + '  "' + n + '"'));
  if (unnamed.length) { console.log('  UNNAMED:'); unnamed.forEach(function (u) { console.log('     ' + JSON.stringify(u)); }); }
  var reveal = stops.filter(function (s) { return /review question/.test(s.name); });
  console.log('  named review reveals: ' + reveal.length + (reveal.length ? '  e.g. ' + JSON.stringify(reveal.slice(0, 2).map(function (s) { return s.name; })) : ''));
  console.log('  first 6: ' + JSON.stringify(stops.slice(0, 6).map((s) => s.name)));
  console.log('  last 3 : ' + JSON.stringify(stops.slice(-3).map((s) => s.name)));
  }
  if (TAB === 'all') {
    const bad = summary.filter((r) => r.unnamed || r.dupes);
    console.log('');
    console.log(bad.length + ' of ' + summary.length + ' tabs have an unnamed or duplicate-named stop');
    bad.forEach((r) => console.log('  ' + r.tab + ': unnamed=' + r.unnamed + ' dupes=' + r.dupes + (r.worst ? '  x' + r.worst[1] + ' "' + r.worst[0].slice(0, 60) + '"' : '')));
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
