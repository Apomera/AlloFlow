// The screen-reader layer now goes through ui_strings. Drive the shortcuts and
// read back what was announced, so a template that failed to substitute shows
// up as a literal "{state}" rather than passing unseen.
//   node dev-tools/pt_sr_text.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 1000 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'sim'));
  await pg.waitForTimeout(2000);

  // window.__sr collects everything the harness's announceToSR receives.
  const said = () => pg.evaluate(() => (window.__sr || []).slice());
  const region = async () => {
    const el = await pg.$('[role="region"][tabindex="0"]');
    if (el) await el.focus();
  };
  await region();
  for (const k of ['l', 'c', '2', '3', '1']) {
    await pg.keyboard.press(k);
    await pg.waitForTimeout(250);
  }
  const out = await said();
  console.log('announced ' + out.length + ' message(s)');
  out.forEach((m) => console.log('  > ' + m));
  const bad = out.filter((m) => /\{[a-z]+\}/.test(m));
  console.log('with an unsubstituted placeholder: ' + bad.length + (bad.length ? ' -> ' + JSON.stringify(bad) : ''));

  // The long canvas descriptions are the only route into those figures.
  const desc = await pg.evaluate(() => Array.from(document.querySelectorAll('[aria-label]'))
    .map((e) => e.getAttribute('aria-label'))
    .filter((t) => t && t.length > 120)
    .map((t) => ({ len: t.length, ph: (t.match(/\{[a-z]+\}/g) || []).length, head: t.slice(0, 58) })));
  console.log('long descriptions: ' + desc.length);
  desc.forEach((d) => console.log('  [' + d.len + ' chars, ' + d.ph + ' placeholders] ' + d.head));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
