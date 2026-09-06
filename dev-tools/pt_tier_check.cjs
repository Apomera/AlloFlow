// The encyclopedia's intro sentence and its tier chips both claim numbers.
// Click each chip and count the cards it actually renders: a claim and the thing
// it claims about must have one derivation, or the tool contradicts itself.
//   node dev-tools/pt_tier_check.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'encyclopedia'));
  await pg.waitForTimeout(1000);
  const claimed = await pg.evaluate(() => (document.querySelector('[data-pt-plate-counts]') || {}).getAttribute
    ? document.querySelector('[data-pt-plate-counts]').getAttribute('data-pt-plate-counts') : null);
  const sentence = await pg.evaluate(() => (document.querySelector('[data-pt-plate-counts]') || { textContent: '' }).textContent.trim().slice(0, 120));
  console.log('sentence:', sentence);
  console.log('claimed major/minor/micro:', claimed);
  let bad = 0;
  for (const tier of ['all', 'major', 'minor', 'micro']) {
    await pg.click('[data-pt-tier-chip="' + tier + '"]');
    await pg.waitForTimeout(450);
    const r = await pg.evaluate((t) => ({
      chip: document.querySelector('[data-pt-tier-chip="' + t + '"]').getAttribute('data-pt-tier-count'),
      label: document.querySelector('[data-pt-tier-chip="' + t + '"]').textContent.trim(),
      pressed: document.querySelector('[data-pt-tier-chip="' + t + '"]').getAttribute('aria-pressed'),
      cards: document.querySelectorAll('[data-pt-plate-card]').length
    }), tier);
    const ok = String(r.cards) === r.chip;
    if (!ok) bad++;
    console.log(tier.padEnd(7) + 'chip says ' + String(r.chip).padEnd(5) + 'rendered ' + String(r.cards).padEnd(5) +
      'pressed=' + r.pressed + '  ' + (ok ? 'agree' : '*** DISAGREE') + '   "' + r.label + '"');
  }
  console.log('\n' + bad + ' tier chips disagree with what they render');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
