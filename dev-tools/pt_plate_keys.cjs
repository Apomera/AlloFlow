// The simulation canvas advertises, in its own aria-label: "up and down arrows
// pick a plate and left and right arrows move it". Drive it and read back what
// was announced, so the promise is checked rather than assumed.
//   node dev-tools/pt_plate_keys.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 1000 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'sim'));
  await pg.waitForTimeout(2500);

  const said = () => pg.evaluate(() => { const a = (window.__sr || []).slice(); window.__sr = []; return a; });
  await said();

  // The handler lives on the simulation canvas, which must be focusable.
  const focused = await pg.evaluate(() => {
    const c = document.querySelector('canvas[tabindex="0"], [data-pt-sim-surface] canvas');
    if (!c) return null;
    c.scrollIntoView({ block: 'center' });
    c.focus();
    return document.activeElement === c ? 'canvas' : document.activeElement.tagName;
  });
  console.log('focus landed on:', focused);

  const step = async (key, mods) => {
    await pg.keyboard.press((mods ? mods + '+' : '') + key);
    await pg.waitForTimeout(220);
    const out = await said();
    console.log((mods ? mods + '+' : '') + key.padEnd(10), out.length ? out.map((m) => '"' + m + '"').join(' | ') : '(silent)');
    return out;
  };

  await step('ArrowDown');
  await step('ArrowDown');
  await step('ArrowUp');
  await step('ArrowRight');
  await step('ArrowRight', 'Shift');
  await step('ArrowLeft');
  // Give the settle timer time to fire, then collect anything it announced.
  await pg.waitForTimeout(900);
  const settled = await said();
  console.log('after settling', settled.length ? settled.map((m) => '"' + m + '"').join(' | ') : '(silent)');

  const holes = [...(settled || [])].filter((m) => /\{[a-z]+\}/.test(m));
  console.log('announcements with an unsubstituted placeholder:', holes.length);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
