// Two fixes to prove on screen, because neither is provable from the source:
//   1. 171 terms + 171 definitions now translate. A wrapped call site proves
//      nothing - ui_strings OVERRIDES the fallback - so install DISTINCT values
//      and read them back off the rendered page.
//   2. The result cards now follow the theme. Their ink was always readable
//      (8:1, 10:1); the defect was 173 pure-white cards on a near-black page,
//      so the check is that the card background CHANGES between themes.
// Also drives the search box: the filter lowercases term and definition, so a
// translated glossary must still be searchable by what the reader can see.
//   node dev-tools/pt_glossary_i18n.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];

const PROBE = {
  gl_t_abyssal_plain: 'ZZTERM-ABYSSAL',
  gl_d_abyssal_plain: 'ZZDEF-ABYSSAL',
  gl_t_wilson_cycle: 'ZZTERM-WILSON',
  gl_t_magnitude: 'ZZTERM-MAG',
  gl_d_magnitude: 'ZZDEF-MAG',
  gl_t_seismic_moment: 'ZZTERM-MOMENT',
  gl_d_seismic_moment: 'ZZDEF-MOMENT'
};

(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 1200 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));

  await pg.evaluate((probe) => {
    const u = window.__uiStrings = window.__uiStrings || {};
    u.stem = u.stem || {}; u.stem.platetectonics = u.stem.platetectonics || {};
    Object.keys(probe).forEach((k) => { u.stem.platetectonics[k] = probe[k]; });
  }, PROBE);

  const card = () => {
    const cards = [...document.querySelectorAll('div')].filter((e) => e.children.length === 2 &&
      /font-bold/.test(e.children[0].className || '') && (e.className || '').includes('rounded-lg'));
    return cards[0] || null;
  };

  const themes = {};
  for (const dark of [false, true]) {
    await pg.evaluate((d) => window.__mount(d, 'glossary'), dark);
    await pg.waitForTimeout(1200);
    themes[dark ? 'dark' : 'light'] = await pg.evaluate((fn) => {
      const c = new Function('return (' + fn + ')()')();
      return c ? getComputedStyle(c).backgroundColor : null;
    }, card.toString());
  }

  // Translation + counts, measured in the theme the student is most likely in.
  await pg.evaluate(() => window.__mount(false, 'glossary'));
  await pg.waitForTimeout(1200);
  const shown = await pg.evaluate((probe) => {
    const t = document.body.innerText || '';
    const out = {};
    Object.keys(probe).forEach((k) => { out[k] = t.includes(probe[k]); });
    return out;
  }, PROBE);

  // Exactly one Wilson entry should remain (was two, differing only in case).
  const wilson = await pg.evaluate(() => {
    const hits = [...document.querySelectorAll('.font-bold')]
      .map((e) => (e.textContent || '').trim())
      .filter((x) => /wilson/i.test(x));
    return hits;
  });

  // Search the TRANSLATED definition text.
  let searched = null;
  const box = await pg.$('input[placeholder^="Search glossary"]');
  if (box) {
    await box.fill('zzdef-moment');
    await pg.waitForTimeout(500);
    searched = await pg.evaluate(() => {
      const t = document.body.innerText || '';
      return { hitsMoment: t.includes('ZZTERM-MOMENT'), excludesAbyssal: !t.includes('ZZTERM-ABYSSAL') };
    });
  }

  console.log(JSON.stringify({
    translated: shown,
    cardBg: themes,
    themeFollows: themes.light !== themes.dark,
    wilsonEntries: wilson,
    searched, hadSearchBox: !!box
  }, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
