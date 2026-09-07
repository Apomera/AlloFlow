// BOUNDARIES was the last stranded catalogue: five boundary types with a
// process, the landforms they build, real places to see them and the hazards
// they hand the people who live there, referenced only by its own definition.
// It now renders under the Edu panel's comparison table, which is collapsed
// until a student opens it - so the probe has to open it, the way a student
// would, before it can claim the content is reachable.
//   node dev-tools/pt_boundary_detail.cjs <out-dir> [tab]
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2]; const TAB = process.argv[3] || 'quiz';
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 1400 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate((t) => window.__mount(false, t), TAB);
  await pg.waitForTimeout(1200);

  // The panel is a disclosure, so the probe has to open it. Pick the toggle by
  // the SMALLEST text carrying both the heading and the show/hide affordance:
  // the first matching element is a wrapper, and the LAST in document order is
  // a <script> holding the tool's own source, which matches every string in the
  // file and clicks nothing.
  const opened = await pg.evaluate(() => {
    const els = [...document.querySelectorAll('*')].filter((e) => {
      if (e.tagName === 'SCRIPT' || e.tagName === 'STYLE') return false;
      const t = e.textContent || '';
      return /Earth's Layers/.test(t) && /Show|Hide/.test(t);
    }).sort((a, b) => (a.textContent || '').length - (b.textContent || '').length);
    // The wrapper div and the button it holds have the SAME text, so shortest
    // text alone picked the div and clicked a element with no handler on it.
    const hit = els.find((e) => e.tagName === 'BUTTON' || e.getAttribute('role') === 'button') || els[0];
    if (!hit) return false;
    hit.click();
    return hit.tagName;
  });
  await pg.waitForTimeout(700);

  const r = await pg.evaluate(() => {
    const sec = document.querySelector('[data-pt-boundary-detail]');
    const t = sec ? sec.innerText : '';
    return {
      section: !!sec,
      cards: sec ? sec.querySelectorAll('li').length : 0,
      // the four authored fields, none of which reached a student before
      labels: ['How it works', 'What it builds', 'Where to see it', 'What it does to people']
        .filter((l) => t.includes(l)).length,
      // content from each of the five rows
      mariana: t.includes('Mariana'),
      himalayas: t.includes('Himalayas'),
      wadati: t.includes('Wadati-Benioff'),
      iceland: t.includes('Iceland'),
      strikeSlip: /strike-slip/i.test(t),
      holes: (t.match(/\{[a-z]+\}/g) || []).length
    };
  });
  console.log(JSON.stringify(Object.assign({ opened }, r), null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
