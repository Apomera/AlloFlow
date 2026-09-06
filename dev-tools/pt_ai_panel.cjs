// The AI tutor panel's own prose tells the student what to press. Open it and
// read back the controls that actually exist, so the instruction can be checked
// against the interface rather than against its author's intent.
//   node dev-tools/pt_ai_panel.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'sim'));
  await pg.waitForTimeout(1200);
  const closed = await pg.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button')).find((x) => /Open AI coach/i.test(x.textContent || ''));
    if (!el) return null;
    const card = el.closest('div');
    const t = card ? card.textContent.replace(/\s+/g, ' ').trim() : '';
    el.click();
    return t.slice(0, 200);
  });
  console.log('closed state text:', JSON.stringify(closed));
  await pg.waitForTimeout(700);
  const open = await pg.evaluate(() => {
    const p = document.querySelector('[data-pt-ai-coach]');
    if (!p) return null;
    return {
      buttons: Array.from(p.querySelectorAll('button')).map((x) => x.textContent.trim()),
      selects: Array.from(p.querySelectorAll('select')).map((x) => (x.getAttribute('aria-label') || '') + ' = ' + x.value),
      prose: p.textContent.replace(/\s+/g, ' ').trim().slice(0, 300)
    };
  });
  console.log(JSON.stringify(open, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
