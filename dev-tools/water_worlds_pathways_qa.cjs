'use strict';

// Focused browser checks for local water pathways. Each forecast is checked
// against the hydrology kernel at the world and minute displayed by the view.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');

const root = process.cwd();
const out = path.join(root, 'reports', 'water-worlds-pathways');
const checks = [], errors = [];
const paths = ['Across ground', 'Into soil', 'Delayed water', 'To air'];
const transferKeys = ['rainMm', 'infiltrationMm', 'drainageMm', 'releaseMm', 'surfaceEvaporationMm', 'soilEvapotranspirationMm', 'incomingSurfaceMm', 'outgoingSurfaceMm', 'streamReceiptMm'];
let child, browser, page;

function check(name) { checks.push(name); console.log('PASS ' + name); }
function near(actual, expected, message) {
  assert(Number.isFinite(actual), message + ' is a finite number');
  assert(Math.abs(actual - expected) < 1e-10, message + ': expected ' + expected + ', got ' + actual);
}
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
const panel = () => page.locator('.ww-pathways');
const click = async name => { await page.getByRole('button', { name, exact: true }).click(); return state(); };
const evidence = () => page.evaluate(() => JSON.stringify({
  world: waterWorldsData.waterWorlds.world,
  run: waterWorldsData.waterWorlds.run,
  baseline: waterWorldsData.waterWorlds.baseline
}));
async function openPathways() {
  const summary = page.getByText('What happens next?', { exact: true });
  if (!(await summary.evaluate(element => element.parentElement.open))) await summary.click();
  await panel().waitFor({ state: 'visible' });
  return state();
}
async function selectCell(index) {
  await page.getByLabel('Ground cell', { exact: true }).selectOption(String(index));
  return state();
}
async function mount(saved, dark = false, contrast = false) {
  await page.evaluate(({ saved, dark, contrast }) => mountWaterWorlds({ wcMode: 'worlds', waterWorlds: saved }, dark, contrast), { saved, dark, contrast });
  await page.waitForSelector('.ww canvas');
  await openPathways();
}
async function fixture(wetness = 95, minute = 20, complete = false) {
  return page.evaluate(({ wetness, minute, complete }) => {
    const K = WaterWorldsKernel;
    let s = K.initial();
    s.world = K.create(wetness);
    s.settings = K.settings({ rain: 80, duration: 40, wetness, pattern: 'late' });
    s = K.advance(K.begin(s, false), complete ? 240 : minute);
    s.running = false;
    return s;
  }, { wetness, minute, complete });
}
async function forecast(minute) {
  return page.evaluate(minute => {
    const K = WaterWorldsKernel, s = waterWorldsData.waterWorlds;
    const inspecting = typeof minute === 'number';
    const world = inspecting ? K.atTime(s.run, minute) : s.world;
    const elapsed = s.run ? world.minutes - s.run.start.minutes : 0;
    const raining = s.run && (!s.run.complete || inspecting) && elapsed < s.run.forcing.duration;
    const rain = raining ? K.rainDuring(s.run.forcing, elapsed, .25) : 0;
    return { budget: K.cellBudget(world, rain, s.selected), rain, minute: world.minutes, cell: world.cells[s.selected] };
  }, minute);
}
async function assertBudget(minute) {
  const expected = await forecast(minute), budget = expected.budget;
  const stores = await panel().locator('[data-budget-store]').evaluateAll(elements => elements.map(element => ({
    key: element.dataset.budgetStore,
    before: Number(element.getAttribute('data-before')),
    after: Number(element.getAttribute('data-after')),
    hasBefore: element.hasAttribute('data-before'), hasAfter: element.hasAttribute('data-after')
  })));
  assert.deepEqual(stores.map(row => row.key).sort(), ['ground', 'soil', 'surface']);
  for (const row of stores) {
    assert(row.hasBefore && row.hasAfter, row.key + ' exposes exact before and after depths');
    near(row.before, budget.before[row.key], row.key + ' current depth');
    near(row.after, budget.after[row.key], row.key + ' forecast depth');
  }
  const rows = await panel().locator('[data-budget-transfer]').evaluateAll(elements => elements.map(element => ({
    key: element.dataset.budgetTransfer,
    value: Number(element.getAttribute('data-value')),
    hasValue: element.hasAttribute('data-value')
  })));
  assert(rows.length > 0, 'The selected pathway exposes quantitative transfers');
  for (const row of rows) {
    assert(transferKeys.includes(row.key), 'Recognized transfer: ' + row.key);
    assert(row.hasValue, row.key + ' exposes an exact transfer value');
    near(row.value, budget.transfers[row.key], row.key + ' transfer');
  }
  const balance = panel().locator('[data-budget-balance]');
  assert.equal(await balance.count(), 1);
  for (const [attribute, key] of [['before', 'beforeMm'], ['inputs', 'inputsMm'], ['outputs', 'outputsMm'], ['after', 'afterMm'], ['error', 'errorMm']]) {
    const actual = await balance.getAttribute('data-' + attribute);
    assert.notEqual(actual, null, 'The water balance exposes ' + attribute);
    near(Number(actual), budget.balance[key], 'Cell water balance ' + attribute);
  }
  near(budget.balance.errorMm, 0, 'Local storage, inputs, and outputs close the water balance');
  return { ...expected, keys: rows.map(row => row.key) };
}
async function assertSelectedPath(name) {
  for (const candidate of paths) {
    assert.equal(await panel().getByRole('button', { name: candidate, exact: true }).getAttribute('aria-pressed'), String(candidate === name));
  }
}
async function allPathways(minute) {
  const seen = new Set(), original = await evidence();
  for (const name of paths) {
    await click(name);
    await assertSelectedPath(name);
    const result = await assertBudget(minute);
    result.keys.forEach(key => seen.add(key));
    assert.equal(await evidence(), original, name + ' does not advance or rewrite the run');
  }
  assert.deepEqual([...seen].sort(), [...transferKeys].sort(), 'The four pathways expose all local transfers');
}
async function inspect(minute) {
  const slider = page.getByLabel('Inspection minute', { exact: true });
  await slider.focus();
  await slider.press('Home');
  for (let i = 0; i < minute; i++) await slider.press('ArrowRight');
  await page.waitForFunction(time => Number(document.querySelector('.ww canvas').dataset.modelTime) === waterWorldsData.waterWorlds.run.start.minutes + time, minute);
  return state();
}
function routeLabel(direction, index) {
  return 'Follow water ' + direction + ' column ' + (index % 12 + 1) + ', row ' + (Math.floor(index / 12) + 1);
}
async function assertRoutes(minute) {
  const { budget } = await forecast(minute);
  for (const route of budget.incoming) assert(await panel().getByRole('button', { name: routeLabel('from', route.from), exact: true }).isVisible());
  for (const route of budget.outgoing.filter(route => route.to >= 0)) assert(await panel().getByRole('button', { name: routeLabel('to', route.to), exact: true }).isVisible());
  const count = budget.incoming.length + budget.outgoing.filter(route => route.to >= 0).length;
  assert.equal(await panel().getByRole('button', { name: /^Follow water (from|to) column/ }).count(), count, 'Only real modeled neighbor transfers become follow controls');
  return budget;
}
async function followRoute(direction, index, minute) {
  const original = await evidence();
  await panel().getByRole('button', { name: routeLabel(direction, index), exact: true }).focus();
  await page.keyboard.press('Enter');
  assert.equal((await state()).selected, index);
  assert(await panel().isVisible(), 'Explorer stays open after following a route');
  await assertSelectedPath('Across ground');
  assert(await panel().evaluate(element => element.contains(document.activeElement) && /^H[1-6]$/.test(document.activeElement.tagName)), 'Following a route moves focus to a persistent pathway heading');
  await assertBudget(minute);
  assert.equal(await evidence(), original, 'Following a route changes only the selected location');
}
async function audit(label) {
  const violations = await page.evaluate(async () => (await axe.run(document.querySelector('.ww'), { rules: { region: { enabled: false } } })).violations.map(v => ({
    id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ html: n.html, summary: n.failureSummary }))
  })));
  fs.writeFileSync(path.join(out, 'axe-' + label + '.json'), JSON.stringify(violations, null, 2));
  assert.deepEqual(violations, [], label + ' accessibility including contrast');
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const url = await preview();
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(url);
  await page.waitForSelector('.ww canvas');
  await page.waitForFunction(() => waterWorldsData.waterWorlds && typeof WaterWorldsKernel.cellBudget === 'function');
  await page.addScriptTag({ url: url + 'desktop/web-app/node_modules/axe-core/axe.min.js' });
  await openPathways();
  await assertSelectedPath('Across ground');
  const initial = await assertBudget();
  assert.equal(initial.rain, 0);
  assert.match(await panel().innerText(), /15 (?:model )?seconds/);
  assert.match(await panel().innerText(), /no (?:storm|rain)|rain(?:fall)?[^.\n]*(?:off|zero)|start[^.\n]*storm/i);
  check('Pathway explorer starts with one selected process and explains the 15-second no-rain probe');

  const dry = await page.evaluate(() => ({ ...WaterWorldsKernel.initial(), world: WaterWorldsKernel.create(0) }));
  await mount(dry);
  await allPathways();
  const dryBudget = (await forecast()).budget;
  assert(Object.values(dryBudget.transfers).every(value => value === 0));
  await click('Across ground');
  assert.equal(await panel().getByRole('button', { name: /^Follow water/ }).count(), 0);
  check('Completely dry ground shows zero transfers and no invented water routes');

  const paused = await fixture();
  await mount(paused);
  await allPathways();
  assert.equal((await forecast()).rain, 120, 'Forecast uses the current late-storm rainfall phase');
  assert.match(await panel().innerText(), /paused|current|storm|rain reaching the valley/i);
  const pausedEvidence = await evidence();
  await page.waitForTimeout(550);
  assert.equal(await evidence(), pausedEvidence, 'Inspecting process forecasts never runs the clock');
  check('Every pathway and storage forecast matches the solver at paused minute 20 without advancing time');

  await click('Across ground');
  const routedCell = await page.evaluate(() => {
    const K = WaterWorldsKernel, s = waterWorldsData.waterWorlds, rain = K.rainDuring(s.run.forcing, 20, .25);
    return s.world.cells.findIndex((cell, index) => {
      const b = K.cellBudget(s.world, rain, index);
      return b.incoming.length && b.outgoing.some(route => route.to >= 0);
    });
  });
  assert(routedCell >= 0, 'Storm fixture has a cell with genuine incoming and outgoing routes');
  await selectCell(routedCell);
  let routeBudget = await assertRoutes();
  await followRoute('from', routeBudget.incoming[0].from);
  await selectCell(routedCell);
  routeBudget = await assertRoutes();
  await followRoute('to', routeBudget.outgoing.find(route => route.to >= 0).to);
  check('Keyboard route controls follow real sources and destinations while preserving process, focus, and evidence');

  await selectCell(89);
  const outlet = await assertRoutes();
  assert(outlet.outgoing.some(route => route.to < 0));
  assert.match(await panel().innerText(), /out of the valley|valley outlet/i);
  assert.equal(await panel().getByRole('button', { name: /out of the valley|valley outlet/i }).count(), 0, 'The boundary is not presented as another selectable ground cell');
  await click('Delayed water');
  const stream = await assertBudget();
  assert(stream.budget.transfers.streamReceiptMm > 0);
  assert.match(await panel().innerText(), /pool|shared|evenly/i);
  assert.match(await panel().innerText(), /stream cells|16/i);
  await panel().screenshot({ path: path.join(out, 'pathway-delayed-water-desktop.png') });
  check('Stream cells show pooled delayed-water receipts and the outlet stays a non-selectable boundary');

  const soaked = await page.evaluate(() => {
    const K = WaterWorldsKernel; let s = K.initial();
    s.world = K.create(100); s.settings = K.settings({ rain: 100, duration: 40, wetness: 100 });
    s = K.begin(s, false); s.running = false; return s;
  });
  await mount(soaked);
  await click('Into soil');
  const saturation = await assertBudget();
  assert.equal(saturation.budget.transfers.infiltrationMm, 0, 'Full soil cannot accept more water in this step');
  await panel().screenshot({ path: path.join(out, 'pathway-into-soil-desktop.png') });
  await click('Delayed water');
  const drainage = await assertBudget();
  assert(drainage.budget.transfers.drainageMm > 0, 'Soaked soil drains into delayed storage');
  check('Soaked soil shows capacity-limited infiltration and positive drainage into delayed storage');

  const completed = await fixture(95, 20, true);
  await mount(completed);
  await allPathways();
  const completedEvidence = await evidence();
  assert.equal((await forecast()).rain, 0);
  assert.match(await panel().innerText(), /complete|ended|stopped|no rain/i);
  check('Completed runs use a no-rain forecast and leave their saved evidence intact');

  await inspect(30);
  await allPathways(30);
  assert.equal((await forecast(30)).minute, completed.run.start.minutes + 30);
  assert.equal((await forecast(30)).rain, 120);
  assert.match(await panel().innerText(), /recorded|inspect(?:ing|ed)|minute 30/i);
  assert.equal(await evidence(), completedEvidence);
  await click('Across ground');
  await selectCell(routedCell);
  const pastRoutes = await assertRoutes(30);
  await followRoute('to', pastRoutes.outgoing.find(route => route.to >= 0).to, 30);
  assert.equal(Number(await page.getByLabel('Inspection minute', { exact: true }).inputValue()), 30, 'Following a past route retains the inspection minute');
  assert.equal(await evidence(), completedEvidence);
  check('Recorded-minute forecasts and route following use past stores and rain while preserving the completed run');

  await panel().getByText('Check this cell’s water balance', { exact: true }).click();
  assert(await panel().locator('[data-budget-balance]').isVisible());
  await assertBudget(30);
  assert.match(await panel().innerText(), /water.table|layer thickness|volume.*cell/i);
  check('Expandable water accounting matches inputs, outputs, and storage with explicit depth units');

  const themed = await state();
  for (const [name, dark, contrast] of [['light', false, false], ['dark', true, false], ['contrast', false, true]]) {
    await mount(themed, dark, contrast);
    await inspect(30);
    await selectCell(89);
    await click('Across ground');
    await panel().getByText('Check this cell’s water balance', { exact: true }).click();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await panel().scrollIntoViewIfNeeded();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), name + ' fits ' + width + 'px');
      const boxes = await panel().getByRole('button').evaluateAll(buttons => buttons.map(button => {
        const box = button.getBoundingClientRect(); return { width: box.width, height: box.height, text: button.textContent };
      }));
      assert(boxes.every(box => box.width >= 24 && box.height >= 44), 'Path and route buttons remain comfortable touch targets at ' + width);
      await audit(name + '-' + width);
      await page.screenshot({ path: path.join(out, 'pathways-' + name + '-' + width + '.png'), fullPage: true });
      if (name === 'dark' && width === 320) await panel().screenshot({ path: path.join(out, 'pathway-dark-320.png') });
    }
  }
  check('Pathways fit desktop, 390px, and 320px with accessible light, dark, and high-contrast treatments');
  assert.deepEqual(errors, []);
  check('Pathway workflows complete without browser exceptions');
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
