// Mount a tab and report canvas geometry for every canvas on it.
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2]; const TAB = process.argv[3] || 'earthquake';
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  pg.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  const page = path.join(OUT, 'pt-shots.html');
  await pg.goto('file:///' + page.split('\\').join('/'));
  await pg.evaluate((t) => window.__mount(false, t), TAB);
  await pg.waitForTimeout(2500);
  const H = await pg.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < H; y += 800) { await pg.evaluate((yy) => window.scrollTo(0, yy), y); await pg.waitForTimeout(300); }
  const info = await pg.evaluate(() => Array.from(document.querySelectorAll('canvas')).map((c) => {
    const r = c.getBoundingClientRect();
    return { label: (c.getAttribute('aria-label') || c.id || '').slice(0, 40), attrW: c.width, attrH: c.height, cssW: Math.round(r.width), cssH: Math.round(r.height), styleW: c.style.width, styleH: c.style.height, ratioX: +(c.width / r.width).toFixed(2), ratioY: +(c.height / r.height).toFixed(2) };
  }));
  console.log(JSON.stringify(info, null, 1));
  console.log('errors:', errs.length ? errs.join('\n') : 'none');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
