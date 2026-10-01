// The glossary search input switches on isDark, but the 172 result cards under
// it are hardcoded `bg-white` with rose/slate ink. Measure what the dark theme
// actually paints rather than arguing from the class list: a white card in a
// dark page may still be readable on its own, and the real question is whether
// it is readable AND whether it belongs.
//   node dev-tools/pt_glossary_theme.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];

function lum(c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
const rgb = (s) => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number);

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 1200 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));

  const out = {};
  for (const dark of [false, true]) {
    await pg.evaluate((d) => window.__mount(d, 'glossary'), dark);
    await pg.waitForTimeout(1200);
    out[dark ? 'dark' : 'light'] = await pg.evaluate(() => {
      // The card is the div holding a bold term and a small definition.
      const cards = [...document.querySelectorAll('div')].filter((e) => {
        const kids = e.children;
        return kids.length === 2 && /font-bold/.test(kids[0].className || '') &&
          (e.className || '').includes('rounded-lg');
      });
      if (!cards.length) return { found: 0 };
      const c = cards[0];
      const cs = getComputedStyle(c);
      const term = getComputedStyle(c.children[0]);
      const def = getComputedStyle(c.children[1]);
      // What does the PAGE paint behind the card?
      const page = getComputedStyle(document.body);
      return {
        found: cards.length,
        cardBg: cs.backgroundColor,
        termInk: term.color,
        defInk: def.color,
        pageBg: page.backgroundColor,
        sample: (c.children[0].textContent || '').trim().slice(0, 30)
      };
    });
  }

  for (const k of ['light', 'dark']) {
    const r = out[k];
    if (!r || !r.found) { console.log(k + ': no cards found'); continue; }
    const bg = rgb(r.cardBg);
    console.log(k + ': ' + r.found + ' cards, bg ' + r.cardBg + ' on page ' + r.pageBg);
    console.log('   term "' + r.sample + '" ' + r.termInk + '  ' + ratio(rgb(r.termInk), bg).toFixed(2) + ':1');
    console.log('   def  ' + r.defInk + '  ' + ratio(rgb(r.defInk), bg).toFixed(2) + ':1');
    // A card that ignores the theme is the defect even when its own contrast is fine.
    console.log('   card bg identical in both themes? (compare to the other row)');
  }
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
