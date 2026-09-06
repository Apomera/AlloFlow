// How often does each aria-live region change while the tool just sits there?
// A live region that updates on its own cadence interrupts a screen reader
// continuously, so nothing else on the page can be read.
//   node dev-tools/pt_live_chatter.cjs <out-dir> [tab] [seconds]
const path = require('path');
const ROOT = process.cwd(); const OUT = process.argv[2];
const TAB = process.argv[3] || 'sim';
const SECS = parseInt(process.argv[4] || '20', 10);
(async () => {
  const { chromium } = require(path.join(ROOT, 'node_modules', 'playwright'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1200, height: 1000 } });
  pg.on('pageerror', (e) => console.log('[page error] ' + e.message));
  await pg.goto('file:///' + path.join(OUT, 'pt-shots.html').replace(/\\/g, '/'));
  await pg.evaluate(([t]) => window.__mount(false, t), [TAB]);
  await pg.waitForTimeout(1500);

  // Scroll the simulator into view: this tool throttles canvases that are off
  // screen, so a probe reading from the top of the page measures a paused sim
  // and reports silence that no student would ever get.
  await pg.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find((e) => /Plate Boundary Simulator/.test(e.textContent || '') && e.children.length < 6);
    if (el) el.scrollIntoView({ block: 'center' });
  });
  await pg.waitForTimeout(800);

  await pg.evaluate(() => {
    window.__chatter = [];
    const nodes = Array.from(document.querySelectorAll('[aria-live], [role="status"], [role="alert"]'));
    window.__liveNodes = nodes.map((n, i) => ({ i, node: n, last: (n.textContent || '').trim(), changes: 0, samples: [] }));
    window.__tick = setInterval(() => {
      window.__liveNodes.forEach((r) => {
        const t = (r.node.textContent || '').trim();
        if (t !== r.last) {
          r.changes++;
          if (r.samples.length < 4) r.samples.push(t.slice(0, 70));
          r.last = t;
        }
      });
    }, 100);
  });
  await pg.waitForTimeout(SECS * 1000);
  const rows = await pg.evaluate((secs) => {
    clearInterval(window.__tick);
    return window.__liveNodes.map((r) => ({
      i: r.i,
      changes: r.changes,
      perMinute: +(r.changes / secs * 60).toFixed(1),
      label: (r.node.getAttribute('data-pt-scene-live') ? 'scene-live' :
              r.node.getAttribute('data-pt-vent-phase') ? 'vent-phase' : (r.node.textContent || '').trim().slice(0, 40)),
      samples: r.samples
    }));
  }, SECS);
  console.log('watched ' + SECS + 's on tab "' + TAB + '"');
  rows.sort((a, b) => b.changes - a.changes).forEach((r) => {
    console.log(String(r.changes).padStart(4) + ' changes  ' + String(r.perMinute).padStart(7) + '/min  ' + r.label);
    r.samples.forEach((s) => console.log('        > ' + s));
  });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
