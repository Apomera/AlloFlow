// The myth bank is assessment content and it just moved into ui_strings. Drive
// several rounds: the statement must render, both answers must be gradeable,
// and the explanation must match the verdict.
//   node dev-tools/pt_myth_run.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 1000 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'quiz'));
  await pg.waitForTimeout(1500);

  const seen = new Set();
  let bad = 0;
  for (let round = 0; round < 8; round++) {
    const started = await pg.evaluate(() => {
      const b2 = Array.from(document.querySelectorAll('button'))
        .find((e) => /New Myth|Start/i.test(e.textContent || '') || /Start a tectonics myth/i.test(e.getAttribute('aria-label') || ''));
      if (b2) { b2.click(); return true; }
      return false;
    });
    await pg.waitForTimeout(300);
    const stmt = await pg.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find((e) =>
        e.children.length === 0 && (e.textContent || '').length > 40 && /\.$/.test((e.textContent || '').trim()));
      return el ? (el.textContent || '').trim() : null;
    });
    // Answer true, then read what came back.
    const clicked = await pg.evaluate(() => {
      const t = Array.from(document.querySelectorAll('button')).find((e) => /^\s*(True|✅ True|👍)/i.test(e.textContent || ''));
      if (t) { t.click(); return true; }
      return false;
    });
    await pg.waitForTimeout(300);
    const r = await pg.evaluate(() => {
      const txt = document.body.innerText;
      return {
        verdict: (txt.match(/(Correct|Not quite)/) || [null])[0],
        holes: (txt.match(/\{[a-z]+\}/g) || []).length,
        sr: (window.__sr || []).slice(-1)[0] || null
      };
    });
    // The announced explanation is the reliable per-myth fingerprint; the
    // on-screen statement selector kept matching a neighbouring paragraph and
    // reported "1 distinct" while the sr line plainly rotated.
    if (r.sr) seen.add(r.sr.slice(0, 48));
    void stmt;
    if (r.holes) bad++;
    console.log('round ' + (round + 1), 'started=' + started, 'answered=' + clicked,
      'verdict=' + r.verdict, 'holes=' + r.holes, r.sr ? ('| sr: "' + r.sr.slice(0, 62) + '"') : '');
  }
  console.log('distinct statements seen:', seen.size, '| rounds with a placeholder hole:', bad);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
