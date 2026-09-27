'use strict';

// Focused browser checks for the Water Worlds observation and navigation workflow.
// Reuse the local preview when available; otherwise start the existing preview host.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const root = process.cwd();
const out = path.join(root, 'reports', 'water-worlds-evidence');
const checks = [], errors = [];
let child, browser, page;

function check(name) { checks.push(name); console.log('PASS ' + name); }
function servesPreview(url) {
  return new Promise(resolve => {
    const request = http.get(url, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', value => { body += value; });
      response.on('end', () => resolve(response.statusCode === 200 && body.includes('mountWaterWorlds')));
    });
    request.setTimeout(1000, () => request.destroy());
    request.on('error', () => resolve(false));
  });
}
async function preview() {
  const existing = process.env.WATER_WORLDS_URL || 'http://127.0.0.1:8768/';
  if (await servesPreview(existing)) return existing;
  child = spawn(process.execPath, [path.join(root, 'dev-tools', 'water_worlds_qa.cjs'), '--serve'], {
    cwd: root, env: { ...process.env, WATER_WORLDS_PORT: process.env.WATER_WORLDS_PORT || '0' },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
  });
  return new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Preview host did not become ready: ' + output)), 30000);
    child.stdout.on('data', chunk => {
      output += String(chunk);
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+\//);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
    child.stderr.on('data', chunk => { output += String(chunk); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('exit', code => { clearTimeout(timer); reject(new Error('Preview host exited (' + code + '): ' + output)); });
  });
}
const state = () => page.evaluate(async () => {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  return JSON.parse(JSON.stringify(waterWorldsData.waterWorlds));
});
const click = async name => { await page.getByRole('button', { name, exact: true }).click(); return state(); };
const savedButton = () => page.getByRole('button', { name: 'Save observation', exact: true });
const evidence = () => page.evaluate(() => JSON.stringify({
  world: waterWorldsData.waterWorlds.world,
  run: waterWorldsData.waterWorlds.run,
  baseline: waterWorldsData.waterWorlds.baseline
}));
const card = id => page.locator('.ww-observation-card[data-observation-id="' + id + '"]');
async function inspect(minute) {
  const slider = page.getByLabel('Inspection minute', { exact: true });
  await slider.focus();
  await slider.press('Home');
  for (let i = 0; i < minute; i++) await slider.press('ArrowRight');
  await page.waitForFunction(time => Number(document.querySelector('.ww canvas').dataset.modelTime) === waterWorldsData.waterWorlds.run.start.minutes + time, minute);
  return state();
}
async function assertObservation(entry, completed) {
  const expected = await page.evaluate(({ minute, selected }) => {
    const s = waterWorldsData.waterWorlds, world = WaterWorldsKernel.atTime(s.run, minute);
    return { cell: world.cells[selected], totals: WaterWorldsKernel.measure(world), result: WaterWorldsKernel.result(world, s.run), modelMinute: world.minutes };
  }, entry);
  assert.deepEqual(entry.cell, expected.cell, 'Saved cell values match the selected recorded minute');
  assert.deepEqual(entry.totals, expected.totals, 'Saved totals match the selected recorded minute');
  assert.deepEqual(entry.result, expected.result, 'Saved run totals match the selected recorded minute');
  assert.equal(entry.modelMinute, expected.modelMinute);
  const current = await state();
  assert.deepEqual(entry.provenance.start, current.run.start);
  assert.deepEqual(entry.provenance.forcing, current.run.forcing);
  assert.equal(current.run.complete, completed);
  assert(await card(entry.id).isVisible());
}
async function progress(phase, elapsed, max) {
  const progress = page.locator('.ww-storm-progress');
  assert.equal(await progress.getAttribute('data-phase'), phase);
  const values = await progress.evaluate(element => {
    const target = element.matches('progress,[role="progressbar"]') ? element : element.querySelector('progress,[role="progressbar"]');
    if (!target) return null;
    return { value: Number(target.getAttribute('aria-valuenow') ?? target.value), max: Number(target.getAttribute('aria-valuemax') ?? target.max) };
  });
  assert(values, 'Storm progress is exposed as a native or ARIA progress bar');
  assert.equal(values.value, elapsed);
  assert.equal(values.max, max);
}
async function audit(label) {
  const violations = await page.evaluate(async () => (await axe.run(document.querySelector('.ww'), { rules: { region: { enabled: false } } })).violations.map(v => ({
    id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary }))
  })));
  fs.writeFileSync(path.join(out, 'axe-' + label + '.json'), JSON.stringify(violations, null, 2));
  assert.deepEqual(violations, [], label + ' accessibility including color contrast');
}
async function compareReadings(a, b) {
  const panel = page.locator('.ww-observation-comparison');
  assert(await panel.isVisible());
  const rows = await panel.locator('[data-observation-metric]').evaluateAll(elements => elements.map(element => ({
    metric: element.dataset.observationMetric, difference: Number(element.dataset.difference)
  })));
  const expected = {
    surface: b.cell.surface - a.cell.surface,
    soil: b.cell.soil - a.cell.soil,
    ground: b.cell.ground - a.cell.ground,
    surfaceM3: b.totals.surfaceM3 - a.totals.surfaceM3,
    soilM3: b.totals.soilM3 - a.totals.soilM3,
    groundM3: b.totals.groundM3 - a.totals.groundM3,
    flow: b.totals.discharge - a.totals.discharge,
    discharge: b.totals.discharge - a.totals.discharge,
    outflowM3: b.result.outflowM3 - a.result.outflowM3
  };
  assert(rows.length >= 3, 'Comparison exposes at least three numerical measurements');
  for (const row of rows) {
    assert(Object.hasOwn(expected, row.metric), 'Recognized observation measurement: ' + row.metric);
    assert(Math.abs(row.difference - expected[row.metric]) < 1e-9, row.metric + ' is B minus A');
  }
  return panel.innerText();
}
async function download(name, filename) {
  const pending = page.waitForEvent('download');
  await click(name);
  await (await pending).saveAs(path.join(out, filename));
  return fs.readFileSync(path.join(out, filename), 'utf8');
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const url = await preview();
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(url);
  await page.waitForSelector('.ww-observer');
  await page.addScriptTag({ url: url + 'desktop/web-app/node_modules/axe-core/axe.min.js' });
  assert(await savedButton().isDisabled(), 'An observation needs a run');
  const placement = await page.evaluate(() => ({
    observer: document.querySelector('.ww-observer').getBoundingClientRect().bottom,
    notes: document.querySelector('#ww-notebook').getBoundingClientRect().top
  }));
  assert(placement.observer <= placement.notes, 'Observation capture appears before the saved field notes');
  await page.screenshot({ path: path.join(out, 'ready-desktop.png'), fullPage: true });
  check('Observation capture is placed beside the landscape and requires a run');

  for (const [name, expected] of [
    ['Go to valley', /CANVAS/], ['Go to storm settings', /The next storm/],
    ['Go to ground inspector', /Design the ground|Ground inspector/], ['Go to field notes', /Your field notes/]
  ]) {
    await page.getByRole('button', { name, exact: true }).focus();
    await page.keyboard.press('Enter');
    const target = await page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent, top: document.activeElement.getBoundingClientRect().top }));
    assert(expected.test(name === 'Go to valley' ? target.tag : target.text), name + ' transfers keyboard focus to its destination');
    assert(target.top >= -1 && target.top < 1000, name + ' scrolls its destination into view');
  }
  check('Section shortcuts move keyboard focus and scroll to each destination');

  await page.getByLabel('Ground cell', { exact: true }).selectOption('44');
  await page.getByLabel('Observation note', { exact: true }).fill('I see water gathering during the rain.');
  await click('Start storm');
  await page.waitForFunction(() => waterWorldsData.waterWorlds.world.minutes >= 3);
  await click('Pause and save observation');
  let snapshot = await state(), a = snapshot.observations[0];
  assert.equal(snapshot.running, false);
  assert.equal(a.minute, snapshot.world.minutes - snapshot.run.start.minutes);
  assert.equal(a.selected, 44);
  assert.equal(a.note, 'I see water gathering during the rain.');
  await assertObservation(a, false);
  assert(await page.getByRole('button', { name: 'Revisit observation 1', exact: true }).isDisabled());
  await progress('rain', a.minute, snapshot.run.forcing.duration + 60);
  await page.waitForTimeout(550);
  assert.equal((await state()).world.minutes, snapshot.world.minutes, 'Saving pauses model advancement');
  check('Live capture pauses and saves exact local, valley, and run readings with conditions');

  await click('Advance 15 min');
  await click('Advance 15 min');
  await click('Advance 15 min');
  snapshot = await state();
  await progress('drainage', snapshot.world.minutes - snapshot.run.start.minutes, snapshot.run.forcing.duration + 60);
  await click('Finish this run');
  snapshot = await state();
  await progress('complete', snapshot.run.forcing.duration + 60, snapshot.run.forcing.duration + 60);
  const completedEvidence = await evidence();
  const peak = snapshot.run.samples.reduce((best, sample) => sample.q > best.q ? sample : best);
  await click('Highest sampled flow');
  assert.equal(Number(await page.getByLabel('Inspection minute', { exact: true }).inputValue()), peak.t);
  assert.match(await page.locator('.ww-timeline').innerText(), /one.minute (samples|readings)/i);
  await progress(peak.t < snapshot.run.forcing.duration ? 'rain' : peak.t < snapshot.run.forcing.duration + 60 ? 'drainage' : 'complete', peak.t, snapshot.run.forcing.duration + 60);
  check('Storm progress follows rain, drainage, completion, and highest sampled-flow inspection');

  await inspect(20);
  await page.getByLabel('Observation note', { exact: true }).fill('Water at the same patch twenty minutes into the storm.');
  await click('Save observation');
  snapshot = await state();
  let b = snapshot.observations[1];
  assert.equal(b.minute, 20); assert.equal(b.selected, 44);
  await assertObservation(b, true);
  assert.equal(await evidence(), completedEvidence, 'Saving an inspected minute leaves completed evidence unchanged');
  await click('Compare observation 1');
  await click('Compare observation 2');
  assert.equal(await page.getByRole('button', { name: 'Compare observation 1', exact: true }).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.getByRole('button', { name: 'Compare observation 2', exact: true }).getAttribute('aria-pressed'), 'true');
  const sameContext = await compareReadings(a, b);
  assert.match(sameContext, /same (?:ground )?(?:cell|place|location)/i);
  check('Recorded-time capture preserves completed evidence and compares exact B minus A readings');

  await page.getByLabel('Note for observation 2', { exact: true }).fill('My revised evidence: the same patch stores more water.');
  await page.getByLabel('Ground cell', { exact: true }).selectOption('70');
  await inspect(35);
  await click('Revisit observation 1');
  snapshot = await state();
  assert.equal(snapshot.selected, 44);
  assert.equal(Number(await page.getByLabel('Inspection minute', { exact: true }).inputValue()), a.minute);
  assert(await page.locator('.ww canvas').evaluate(element => document.activeElement === element));
  assert.equal(await evidence(), completedEvidence);
  check('Revisit restores the recorded location and minute, focuses the valley, and retains evidence');

  await page.getByLabel('Ground cell', { exact: true }).selectOption('70');
  await inspect(35);
  await click('Save observation');
  await click('Compare observation 2');
  await click('Compare observation 3');
  snapshot = await state();
  assert.match(await compareReadings(a, snapshot.observations[2]), /different (?:ground )?(?:cells|places|locations)/i);
  check('Comparison distinguishes observations taken at different places');

  for (const minute of [45, 60, 80]) { await inspect(minute); await click('Save observation'); }
  snapshot = await state();
  assert.equal(snapshot.observations.length, 6);
  assert.equal(await page.locator('.ww-observation-card').count(), 6);
  assert(await savedButton().isDisabled());
  const firstId = snapshot.observations[0].id;
  await click('Remove observation 4');
  assert.equal((await state()).observations.length, 5);
  assert(!(await savedButton().isDisabled()));
  await click('Save observation');
  snapshot = await state();
  assert.equal(snapshot.observations.length, 6);
  assert.equal(new Set(snapshot.observations.map(entry => entry.id)).size, 6);
  assert.equal(snapshot.observations[0].id, firstId);
  assert(await card('observation-7').isVisible());
  check('Six-observation limit prevents overflow; removal frees a slot and IDs stay unique');

  const exported = JSON.parse(await download('Download investigation', 'observations-investigation.json'));
  snapshot = await state();
  assert.deepEqual(exported.observations, snapshot.observations);
  assert.equal(exported.observations[1].note, 'My revised evidence: the same patch stores more water.');
  const report = await download('Download readable report', 'observations-investigation.txt');
  assert(report.includes('My revised evidence: the same patch stores more water.'));
  assert.match(report, /Observation 1/);
  const persisted = snapshot;
  await page.evaluate(saved => mountWaterWorlds({ wcMode: 'worlds', waterWorlds: saved }), persisted);
  await page.waitForSelector('.ww-observation-card');
  assert.deepEqual((await state()).observations, persisted.observations);
  assert.equal((await state()).running, false);
  check('Observation notes and detached readings persist and export to JSON and readable reports');

  await click('Start another storm');
  assert(await page.getByRole('button', { name: 'Pause and save observation', exact: true }).isDisabled(), 'The six-observation limit also applies during playback');
  await click('Pause');
  snapshot = await state();
  assert.deepEqual(snapshot.observations, persisted.observations);
  assert(await page.getByRole('button', { name: 'Revisit observation 1', exact: true }).isDisabled());
  await click('Finish this run');
  assert(await page.getByRole('button', { name: 'Revisit observation 1', exact: true }).isDisabled());
  await click('Remove observation 7');
  await click('Save observation');
  await click('Compare observation 1');
  await click('Compare observation 8');
  snapshot = await state();
  assert.match(await compareReadings(snapshot.observations[0], snapshot.observations.at(-1)), /different (?:storm|run|record)|separate (?:storm|run|record)|conditions/i);
  check('New storms retain earlier observations, prevent mismatched revisits, and explain comparison context');

  await audit('light');
  await page.screenshot({ path: path.join(out, 'observations-desktop.png'), fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal overflow at ' + width);
    await page.getByRole('button', { name: 'Go to field notes', exact: true }).click();
    await page.screenshot({ path: path.join(out, 'observations-' + width + '.png'), fullPage: true });
    await audit('light-' + width);
  }
  const themed = await state();
  for (const [name, dark, contrast] of [['dark', true, false], ['contrast', false, true]]) {
    await page.evaluate(({ saved, dark, contrast }) => mountWaterWorlds({ wcMode: 'worlds', waterWorlds: saved }, dark, contrast), { saved: themed, dark, contrast });
    await page.waitForSelector('.ww-observation-card');
    await click('Compare observation 1'); await click('Compare observation 8');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + ' at 320px has no overflow');
    await audit(name + '-320');
    await page.screenshot({ path: path.join(out, 'observations-' + name + '-320.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await audit(name);
    await page.screenshot({ path: path.join(out, 'observations-' + name + '.png'), fullPage: true });
    await page.setViewportSize({ width: 320, height: 844 });
  }
  check('Observation cards and comparisons fit 320px/390px and pass light, dark, and high-contrast accessibility');
  assert.deepEqual(errors, []);
  check('Observation workflows complete without browser exceptions');
})().catch(async error => {
  errors.push(String(error.stack || error));
  if (page) await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {});
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify({ checks, errors }, null, 2));
  if (browser) await browser.close();
  if (child && child.exitCode === null) child.kill();
});
