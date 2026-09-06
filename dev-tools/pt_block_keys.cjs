// The 3D block's help text promises: arrow keys turn it, Shift takes bigger
// steps, plus/minus zoom, Home resets. Drive each promise and compare the
// orientation before and after, instead of reading the handler.
//   node dev-tools/pt_block_keys.cjs <out-dir>
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

  // The block view is off by default, so turn it on the way a student does.
  const on = await pg.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((e) => /3D block/i.test(e.textContent || ''));
    if (!btn) return false;
    btn.click(); return true;
  });
  await pg.waitForTimeout(2500);
  const present = await pg.$('[data-tect-view]');
  console.log('3D toggle found:', on, ' block in DOM:', !!present);
  if (!present) { console.log('NO BLOCK - the rest of this probe would be vacuous'); await b.close(); return; }

  const view = () => pg.getAttribute('[data-tect-view]', 'data-tect-view');
  const focused = () => pg.evaluate(() => document.activeElement === document.querySelector('[data-tect-view]'));

  await pg.focus('[data-tect-view]');
  console.log('focusable      ', await focused(), ' start', await view());

  const press = async (key, times, mods) => {
    const before = await view();
    for (let i = 0; i < times; i++) {
      await pg.keyboard.press((mods ? mods + '+' : '') + key);
      await pg.waitForTimeout(60);
    }
    const after = await view();
    const d = after.split(',').map((x, i) => +x - +before.split(',')[i]);
    console.log((mods ? mods + '+' : '') + key + ' x' + times, ' ', before, '->', after,
      ' delta rotX/rotY/scale =', d.map((x) => +x.toFixed(2)).join(' / '));
    return d;
  };

  // Each press should ADD to the last. If the handler reads a stale closure the
  // total will be one step, not N.
  await press('ArrowRight', 5);
  await press('ArrowLeft', 2);
  await press('ArrowUp', 3);
  await press('ArrowDown', 1);
  await press('ArrowRight', 2, 'Shift');
  await press('+', 3);
  await press('-', 1);
  // Clamps: 88 degrees of tilt and 2.6x zoom are the stated limits.
  await press('ArrowUp', 40);
  await press('+', 40);
  await press('Home', 1);
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
