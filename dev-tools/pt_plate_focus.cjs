// The plate encyclopedia: 102 cards that used to write a state nothing read.
// Drive one and confirm the click now has a result — pressed state, the wired
// selectedPlate, the challenge that checks it, and the area printed once.
//   node dev-tools/pt_plate_focus.cjs <out-dir>
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

  const look = () => pg.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-pt-plate-card]'));
    const pressed = cards.filter((e) => e.getAttribute('aria-pressed') === 'true').map((e) => e.getAttribute('data-pt-plate-card'));
    const areas = cards.map((e) => (e.textContent.match(/Area: [^~]*/) || [''])[0].trim()).filter(Boolean);
    return {
      cards: cards.length, pressed,
      doubledUnit: areas.filter((t) => /km²\s*km2|km2\s*km²|km²\s*km²/.test(t)).length,
      areaSample: areas.slice(0, 3),
      selected: (((window.__toolState || {}).plateTectonics) || {}).selectedPlate || null
    };
  });
  console.log('resting ', JSON.stringify(await look()));
  await pg.click('[data-pt-plate-card="Pacific"]'); await pg.waitForTimeout(400);
  console.log('clicked ', JSON.stringify(await look()));
  await pg.click('[data-pt-plate-card="Nazca"]'); await pg.waitForTimeout(400);
  console.log('other   ', JSON.stringify(await look()));
  await pg.click('[data-pt-plate-card="Nazca"]'); await pg.waitForTimeout(400);
  console.log('toggled ', JSON.stringify(await look()));

  // Does studying a plate here satisfy the challenge that checks exactly that?
  await pg.click('[data-pt-plate-card="Pacific"]'); await pg.waitForTimeout(400);
  // Switch tab without remounting: a remount installs fresh state and would
  // make every cross-tab effect look broken.
  await pg.evaluate(() => window.__setTab('sim')); await pg.waitForTimeout(1500);
  const after = await pg.evaluate(() => ({
    selected: (((window.__toolState || {}).plateTectonics) || {}).selectedPlate || null,
    keyChip: (document.querySelector('[data-pt-plate-key="pacific"]') || {}).getAttribute
      ? document.querySelector('[data-pt-plate-key="pacific"]').getAttribute('data-selected') : null,
    scene: (document.querySelector('[data-pt-scene-text]') || { textContent: '' }).textContent.slice(0, 120)
  }));
  console.log('in sim  ', JSON.stringify(after));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
