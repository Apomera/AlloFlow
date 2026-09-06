// Read the rendered text of the tabs whose cards print a bold label followed by
// a value, and report any leaf that says its label twice ("Visit: Visit: ...").
//   node dev-tools/pt_label_check.cjs <out-dir> [tab,tab,...]
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
const TABS = (process.argv[3] || 'impacts,projects,extinctions,cascadia,volcanoes,rocks,glossary,review').split(',');
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  let bad = 0;
  for (const tab of TABS) {
    await pg.evaluate((t) => window.__mount(false, t), tab);
    await pg.waitForTimeout(900);
    const r = await pg.evaluate(() => {
      const out = { doubled: [], sample: [], leaves: 0 };
      document.querySelectorAll('*').forEach((el) => {
        if (el.children.length > 1) return;
        const t = (el.textContent || '').trim();
        if (!t || t.length > 300) return;
        out.leaves++;
        const m = t.match(/^([A-Z][A-Za-z ]{2,20}):\s*([A-Z][A-Za-z ]{2,20}):/);
        if (m && m[1].toLowerCase() === m[2].toLowerCase()) out.doubled.push(t.slice(0, 70));
      });
      // a couple of real card lines, to prove the label still prints once
      document.querySelectorAll('div').forEach((el) => {
        if (out.sample.length >= 3) return;
        const t = (el.textContent || '').trim();
        if (/^(Visit|Causes|Discussion):\s+\S/.test(t) && t.length < 140) out.sample.push(t.slice(0, 90));
      });
      return out;
    });
    bad += r.doubled.length;
    console.log(tab.padEnd(14) + 'leaves=' + String(r.leaves).padEnd(6) + 'doubled=' + r.doubled.length +
      (r.doubled.length ? '  e.g. ' + JSON.stringify(r.doubled.slice(0, 2)) : ''));
    if (r.sample.length) r.sample.forEach((x) => console.log('      ' + x));
  }
  console.log('\ntotal doubled labels on screen: ' + bad);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
