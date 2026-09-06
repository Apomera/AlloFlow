// The stress lab's Log button appended trials that nothing rendered. Drive it:
// set three different boundary/stress/friction combinations, log each, and read
// the table back to check the rows say what the run actually did.
//   node dev-tools/pt_stress_log.cjs <out-dir>
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1100, height: 900 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(() => window.__mount(false, 'boundaryHunt'));
  await pg.waitForTimeout(1000);

  const setSlider = async (label, v) => {
    await pg.evaluate(([l, val]) => {
      const el = Array.from(document.querySelectorAll('input[type=range]')).find((x) => (x.getAttribute('aria-label') || '').startsWith(l));
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      set.call(el, String(val)); el.dispatchEvent(new Event('input', { bubbles: true }));
    }, [label, v]);
    await pg.waitForTimeout(250);
  };
  const pick = async (bt) => {
    await pg.evaluate((t) => {
      const el = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === t);
      el && el.click();
    }, bt);
    await pg.waitForTimeout(250);
  };
  const logIt = async () => {
    await pg.evaluate(() => {
      const el = Array.from(document.querySelectorAll('button')).find((x) => /Log/.test(x.textContent || ''));
      el && el.click();
    });
    await pg.waitForTimeout(300);
  };
  const table = () => pg.evaluate(() => {
    const box = document.querySelector('[data-pt-stress-log]');
    if (!box) return null;
    return {
      rows: box.getAttribute('data-pt-stress-log'),
      body: Array.from(box.querySelectorAll('tbody tr')).map((tr) => Array.from(tr.children).map((td) => td.textContent.trim()).join(' | ')),
      headers: Array.from(box.querySelectorAll('th')).map((th) => th.textContent.trim() + '/' + th.getAttribute('scope'))
    };
  });
  const live = () => pg.evaluate(() => (document.querySelector('[data-pt-stress-diagram]') || {}).getAttribute
    ? document.querySelector('[data-pt-stress-diagram]').getAttribute('data-pt-stress-diagram') : null);

  console.log('before any log:', JSON.stringify(await table()));
  const cases = [['convergent', 100, 0], ['divergent', 100, 0], ['transform', 60, 95]];
  for (const [bt, f, fr] of cases) {
    await pick(bt); await setSlider('Stress', f); await setSlider('Friction', fr);
    const l = await live();
    await logIt();
    console.log('logged ' + bt + ' stress=' + f + ' friction=' + fr + ' live=' + l);
  }
  console.log(JSON.stringify(await table(), null, 1));
  for (const dk of [false, true]) {
    if (dk) {
      await pg.evaluate(() => window.__mount(true, 'boundaryHunt'));
      await pg.waitForTimeout(900);
      for (const [bt, f, fr] of cases) { await pick(bt); await setSlider('Stress', f); await setSlider('Friction', fr); await logIt(); }
    }
    await pg.evaluate(() => { const e = document.querySelector('[data-pt-stress-log]'); e && e.scrollIntoView({ block: 'center' }); });
    await pg.waitForTimeout(300);
    const box = await pg.evaluate(() => {
      const e = document.querySelector('[data-pt-stress-log]');
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: Math.max(0, r.x - 10), y: Math.max(0, r.y - 30), width: Math.min(1080, r.width + 20), height: Math.min(600, r.height + 40) };
    });
    if (!box) { console.log('no log table in ' + (dk ? 'dark' : 'light')); continue; }
    await pg.screenshot({ path: path.join(OUT, 'stress-log-' + (dk ? 'dark' : 'light') + '.png'), clip: box, animations: 'disabled', timeout: 30000 });
    console.log('wrote stress-log-' + (dk ? 'dark' : 'light') + '.png');
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
