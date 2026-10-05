import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_evolab.js', toolId: 'evoLab', width: 1380, height: 980, layout: 'document', appStyles: true });
const report = 'reports/evolab-living-island';
const prefix = '#ea-main-route-chance';
const speciesNames: Record<string, string> = { birds: 'Seedwing birds', plants: 'Shellseed plants' };
const actualFields = ['arrivals', 'parents', 'copies', 'total-copies', 'capital-a', 'lowercase-a'];

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const setRange = async (page: any, selector: string, value: number) => page.locator(selector).evaluate((input: HTMLInputElement, v: number) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(v));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}, value);

async function fixture(page: any) {
  await harness.mount(page, { evoLab: { view: 'archipelago' } });
  const world = await page.evaluate(() => {
    const m = (window as any).StemLab.evoArchipelagoModel;
    let w = m.create(21); w.settings.migration = .4; w.settings.mutation = .03;
    for (let i = 0; i < 3; i++) w = m.step(w);
    return w;
  });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: world } });
  return world;
}

async function openRoutes(page: any, pair: string) {
  await page.getByRole('button', { name: 'Investigate sea routes', exact: true }).click();
  const routes = page.locator('section[data-route-evidence]');
  await routes.locator('#ea-main-routes-route').selectOption({ value: pair });
  return routes;
}

async function openChance(routes: any, keyboard = false) {
  const summary = routes.getByText('Could these arrivals happen by chance?', { exact: true });
  const open = await summary.evaluate((el: Element) => (el.closest('details') as HTMLDetailsElement).open);
  if (!open) {
    if (keyboard) { await summary.focus(); await summary.press('Enter'); }
    else await summary.click();
  }
  const panel = routes.locator('section[data-route-chance]');
  await expect(panel).toBeVisible();
  return panel;
}

async function actualCounts(routes: any) {
  return routes.locator('[data-route-species]').evaluateAll((cards: Element[], fields: string[]) => cards.map(card => ({
    species: card.getAttribute('data-route-species'),
    values: fields.map(field => card.querySelector('[data-route-' + field + ']')!.getAttribute('data-route-' + field)),
  })), actualFields);
}

async function scalar(panel: any, field: string) {
  const raw = await panel.evaluate((el: Element, attribute: string) => {
    const target = el.hasAttribute(attribute) ? el : el.querySelector('[' + attribute + ']');
    return target ? target.getAttribute(attribute) : null;
  }, 'data-chance-' + field);
  expect(raw, 'missing data-chance-' + field).not.toBeNull();
  return Number(raw);
}

function binomialMass(n: number, p: number) {
  let choose = 1;
  return Array.from({ length: n + 1 }, (_, k) => {
    if (k) choose *= (n - k + 1) / k;
    return choose * Math.pow(p, k) * Math.pow(1 - p, n - k);
  });
}

async function modelEvidence(page: any, world: any, generation: number, from: number, to: number, records: any[]) {
  return page.evaluate(({ w, g, a, b, forecasts }) => {
    const m = (window as any).StemLab.evoArchipelagoModel;
    return {
      theory: m.routeChance(w, g, a, b),
      trials: Array.from({ length: forecasts.length * 16 }, (_, i) => m.routeChanceTrial(w, g, a, b, i)),
      forecastResults: forecasts.map((f: any, i: number) => m.routeChanceForecast(w, g, a, b, f.species, f.low, f.high, i * 16, 16)),
    };
  }, { w: world, g: generation, a: from, b: to, forecasts: records });
}

async function verifyChart(panel: any, expected: any, sp: string, low: number, high: number) {
  const row = expected.theory.rows.find((r: any) => r.species === sp);
  await expect(panel).toHaveAttribute('data-route-chance', String(expected.theory.generation));
  await expect(panel).toHaveAttribute('data-chance-species', sp);
  await expect(panel).toHaveAttribute('data-chance-draws', String(expected.trials.length));
  await expect(panel.locator(prefix + '-low')).toHaveValue(String(low));
  await expect(panel.locator(prefix + '-high')).toHaveValue(String(high));
  const chart = panel.locator('svg.ea-route-chance-chart[role=img]');
  await expect(chart).toHaveCount(1);
  const bars = await chart.locator('[data-chance-bar]').evaluateAll((els: Element[]) => els.map(el => ({
    k: Number(el.getAttribute('data-chance-bar')),
    probability: Number(el.getAttribute('data-chance-probability')),
    frequency: Number(el.getAttribute('data-chance-private-frequency')),
  })));
  expect(bars).toHaveLength(row.size + 1);
  const mass = binomialMass(row.size, row.probability);
  const counts = expected.trials.map((t: any) => t.rows.find((r: any) => r.species === sp).route);
  for (const bar of bars) {
    expect(bar.k).toBeGreaterThanOrEqual(0); expect(bar.k).toBeLessThanOrEqual(row.size);
    expect(bar.probability).toBe(row.mass[bar.k]);
    expect(bar.probability).toBeCloseTo(mass[bar.k], 12);
    expect(bar.frequency).toBe(counts.filter((k: number) => k === bar.k).length / counts.length);
  }
  expect(bars.map((bar: any) => bar.k)).toEqual(Array.from({ length: row.size + 1 }, (_, k) => k));
  expect(Number(await chart.locator('[data-chance-recorded]').getAttribute('data-chance-recorded'))).toBe(row.observed);
  expect(await scalar(panel, 'zero')).toBe(row.zeroProbability);
  expect(await scalar(panel, 'expected')).toBe(row.expected);
  expect(await scalar(panel, 'expected')).toBe(row.size * row.probability);
  expect(await scalar(panel, 'sample-mean')).toBe(counts.reduce((sum: number, k: number) => sum + k, 0) / counts.length);
  expect(await scalar(panel, 'band-probability')).toBe(row.mass.slice(low, high + 1).reduce((sum: number, p: number) => sum + p, 0));
}

async function verifyForecast(panel: any, index: number, record: any, result: any) {
  await panel.locator(prefix + '-forecast').selectOption({ value: String(index) });
  const detail = panel.locator('[data-chance-forecast]');
  await expect(detail).toHaveAttribute('data-chance-forecast', String(index));
  await expect(detail).toContainText(speciesNames[record.species]);
  await expect(detail).toHaveAttribute('data-chance-forecast-species', record.species);
  await expect(detail).toHaveAttribute('data-chance-forecast-low', String(record.low));
  await expect(detail).toHaveAttribute('data-chance-forecast-high', String(record.high));
  await expect(detail).toHaveAttribute('data-chance-forecast-reason', record.reason);
  expect(await scalar(detail, 'hits')).toBe(result.hits);
  expect(await scalar(detail, 'forecast-probability')).toBe(result.probability);
  expect(result.expectedHits).toBe(result.probability * 16);
}

async function verifyTrial(panel: any, expected: any, index: number, species: string) {
  await panel.locator(prefix + '-trial').selectOption({ value: String(index) });
  const detail = panel.locator('[data-chance-trial]');
  await expect(detail).toHaveAttribute('data-chance-trial', String(index));
  const row = expected.trials[index].rows.find((r: any) => r.species === species);
  expect(await scalar(detail, 'route')).toBe(row.route);
  expect(await scalar(detail, 'other')).toBe(row.other);
  expect(await scalar(detail, 'stay')).toBe(row.stay);
  expect(row.route + row.other + row.stay).toBe(row.size);
}

async function downloadChance(page: any, panel: any) {
  const pending = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Download chance investigation', exact: true }).click();
  const downloaded = await pending;
  return JSON.parse(readFileSync((await downloaded.path())!, 'utf8'));
}

async function verifyExport(page: any, raw: any, world: any, generation: number, from: number, to: number, records: any[]) {
  expect(raw.format).toBe('evolab-route-chance');
  expect(raw.generation).toBe(generation); expect(raw.from).toBe(from); expect(raw.to).toBe(to);
  expect(raw.recipe.forecasts).toEqual(records);
  expect(raw.protocol).toBeTruthy(); expect(raw.limits).toBeTruthy();
  const expected = await modelEvidence(page, world, generation, from, to, records);
  expect(raw.theory).toEqual(expected.theory); expect(raw.trials).toEqual(expected.trials); expect(raw.forecastResults).toEqual(expected.forecastResults);
  expect(raw.trials.map((t: any) => t.index)).toEqual(Array.from({ length: records.length * 16 }, (_, i) => i));
  for (const trial of raw.trials) for (const row of trial.rows) expect(row.route + row.other + row.stay).toBe(row.size);
  const replay = await page.evaluate(data => {
    const m = (window as any).StemLab.evoArchipelagoModel, source = m.restoreCheckpoint(data.source);
    return {
      world: source, theory: m.routeChance(source, data.generation, data.from, data.to),
      trials: data.trials.map((t: any) => m.routeChanceTrial(source, data.generation, data.from, data.to, t.index)),
      forecastResults: data.recipe.forecasts.map((f: any, i: number) => m.routeChanceForecast(source, data.generation, data.from, data.to, f.species, f.low, f.high, i * 16, 16)),
    };
  }, raw);
  expect(replay.world).toEqual(world); expect(replay.theory).toEqual(raw.theory);
  expect(replay.trials).toEqual(raw.trials); expect(replay.forecastResults).toEqual(raw.forecastResults);
  return expected;
}

test('locked crossing forecasts use fresh private dispersal blocks, show exact binomial odds and preserve actual inheritance and archived settings', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const world = await fixture(page), routes = await openRoutes(page, '0:1');
  const actual = await actualCounts(routes), panel = await openChance(routes);
  await expect(panel).toHaveAttribute('data-chance-draws', '0');
  await expect(panel.locator('svg.ea-route-chance-chart')).toHaveCount(0);
  const records: any[] = [{ species: 'birds', low: 2, high: 6, reason: 'Nearby islands make several bird crossings plausible, but chance still produces different counts.' }];
  await setRange(page, prefix + '-low', 2); await setRange(page, prefix + '-high', 6);
  await panel.locator(prefix + '-reason').fill(records[0].reason);
  const testForecast = panel.getByRole('button', { name: 'Test forecast with 16 new draws', exact: true });
  await testForecast.click();
  let expected = await modelEvidence(page, world, 3, 0, 1, records);
  await verifyChart(panel, expected, 'birds', 2, 6);
  await verifyForecast(panel, 0, records[0], expected.forecastResults[0]);
  await verifyTrial(panel, expected, 15, 'birds');
  expect(await actualCounts(routes)).toEqual(actual);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);

  records.push({ species: 'birds', low: 8, high: 10, reason: 'I am revising my prediction before seeing the next independent block of draws.' });
  await setRange(page, prefix + '-low', 8); await setRange(page, prefix + '-high', 10);
  await panel.locator(prefix + '-reason').fill(records[1].reason);
  await verifyForecast(panel, 0, records[0], expected.forecastResults[0]);
  await expect(panel.locator(prefix + '-low')).toHaveValue('8'); await expect(panel.locator(prefix + '-high')).toHaveValue('10');
  await expect(panel.locator(prefix + '-reason')).toHaveValue(records[1].reason);
  await testForecast.click();
  expected = await modelEvidence(page, world, 3, 0, 1, records);
  await verifyChart(panel, expected, 'birds', 8, 10);
  await verifyForecast(panel, 0, records[0], expected.forecastResults[0]);
  await verifyTrial(panel, expected, 31, 'birds');
  const birdTheory = expected.theory.rows.find((row: any) => row.species === 'birds'), size = birdTheory.size;
  expect(birdTheory.mass[size]).toBeGreaterThan(0);
  await setRange(page, prefix + '-low', size); await setRange(page, prefix + '-high', size);
  expect(await scalar(panel, 'band-probability')).toBeGreaterThan(0);
  expect(await scalar(panel, 'band-probability')).toBeLessThan(.0001);
  await expect(panel.locator('[data-chance-band-probability]')).toHaveText('<0.01%');
  await setRange(page, prefix + '-low', 0); await setRange(page, prefix + '-high', size - 1);
  expect(await scalar(panel, 'band-probability')).toBeGreaterThan(.9999);
  expect(await scalar(panel, 'band-probability')).toBeLessThanOrEqual(1);
  await expect(panel.locator('[data-chance-band-probability]')).toHaveText('>99.99%');
  const exactTable = panel.locator('.ea-chance-exact-table');
  await exactTable.getByText('Read every crossing-count probability', { exact: true }).click();
  await expect(exactTable.locator('tbody tr').nth(size).locator('th[scope=row]')).toHaveText(String(size));
  await expect(exactTable.locator('tbody tr').nth(size).locator('td').first()).toHaveText('<0.01%');
  await exactTable.getByText('Read every crossing-count probability', { exact: true }).click();
  await expect(exactTable).toHaveJSProperty('open', false);
  await setRange(page, prefix + '-low', 8); await setRange(page, prefix + '-high', 10);
  await verifyChart(panel, expected, 'birds', 8, 10);
  await verifyForecast(panel, 0, records[0], expected.forecastResults[0]);
  await expect(panel.locator(prefix + '-reason')).toHaveValue(records[1].reason);
  await panel.locator('xpath=ancestor::details[1]').screenshot({ path: report + '/route-chance-desktop.png' });

  await panel.getByRole('button', { name: speciesNames.plants, exact: true }).click();
  records.push({ species: 'plants', low: 0, high: 2, reason: 'Seeds have lower per-route dispersal odds; a zero-arrival round can still be plausible.' });
  await setRange(page, prefix + '-low', 0); await setRange(page, prefix + '-high', 2);
  await panel.locator(prefix + '-reason').fill(records[2].reason);
  await testForecast.click();
  expected = await modelEvidence(page, world, 3, 0, 1, records);
  await verifyChart(panel, expected, 'plants', 0, 2);
  await verifyForecast(panel, 0, records[0], expected.forecastResults[0]);
  await expect(panel.locator(prefix + '-reason')).toHaveValue(records[2].reason);
  await verifyTrial(panel, expected, 47, 'plants');
  const firstExport = await downloadChance(page, panel);
  await verifyExport(page, firstExport, world, 3, 0, 1, records);
  expect(firstExport.view.species).toBe('plants'); expect(firstExport.view.trial).toBe(47); expect(firstExport.view.forecast).toBe(0);

  await routes.locator('#ea-main-routes-note').fill('My actual-route evidence remains separate from this private chance investigation.');
  await routes.getByRole('button', { name: 'Save route evidence to journal', exact: true }).click();
  const actualNote = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoRouteEvidence.text);
  await panel.getByRole('button', { name: 'Save chance investigation to journal', exact: true }).click();
  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  expect(notes.archipelagoRouteEvidence.text).toBe(actualNote);
  for (const record of records) expect(notes.archipelagoRouteChance.text).toContain(record.reason);
  for (let i = records.length; i < 8; i++) {
    records.push({ ...records[2] }); await testForecast.click();
    await expect(panel).toHaveAttribute('data-chance-draws', String(records.length * 16));
  }
  await expect(testForecast).toBeDisabled();
  const complete = await downloadChance(page, panel);
  expected = await verifyExport(page, complete, world, 3, 0, 1, records);
  await verifyChart(panel, expected, 'plants', 0, 2);
  expect(complete.forecastResults.map((f: any) => f.start)).toEqual([0, 16, 32, 48, 64, 80, 96, 112]);
  expect(await actualCounts(routes)).toEqual(actual);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);

  await setRange(page, '#ea-migration', 0); await setRange(page, '#ea-rain-1', .95);
  const queued = await page.evaluate(() => (window as any).__toolData.evoLab.archipelago);
  expect(queued.history).toEqual(world.history); expect(queued.rng).toBe(world.rng);
  await verifyChart(panel, expected, 'plants', 0, 2);
  const queuedExport = await downloadChance(page, panel);
  expect(queuedExport.theory).toEqual(complete.theory); expect(queuedExport.trials).toEqual(complete.trials);
  expect(queuedExport.forecastResults).toEqual(complete.forecastResults); expect(queuedExport.theory.settings.migration).toBe(.4);
  await verifyExport(page, queuedExport, queued, 3, 0, 1, records);
  await setRange(page, '#ea-generation', 1);
  await expect(panel).toHaveAttribute('data-route-chance', '1'); await expect(panel).toHaveAttribute('data-chance-draws', '0');
  await expect(panel.locator(prefix + '-reason')).toHaveValue('');
  await setRange(page, '#ea-generation', 0);
  await expect(routes.locator('section[data-route-chance]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Return to present', exact: true }).click();
  await openChance(routes); await verifyChart(panel, expected, 'plants', 0, 2);
  await expect(panel.locator(prefix + '-reason')).toHaveValue(records[2].reason);
  await expect(testForecast).toBeDisabled();
  const next = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), queued);
  await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(next);
  await openChance(routes); await expect(panel).toHaveAttribute('data-route-chance', '4'); await expect(panel).toHaveAttribute('data-chance-draws', '0');
  await expect(panel.locator('svg.ea-route-chance-chart')).toHaveCount(0);
  const contexts = (await harness.glContexts(page)).filter(c => c.connected && !c.lost);
  expect(contexts).toHaveLength(1); expect(contexts[0].draws).toBeGreaterThan(0); expect(errors).toEqual([]);
});

test('phone learners make crossing predictions with keyboard ranges and retain species and route drafts without WebGL', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const get = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await harness.mount(page, { evoLab: { view: 'archipelago' } }, undefined, { expectCanvas: false });
  const founding = await page.evaluate(() => {
    const w = (window as any).StemLab.evoArchipelagoModel.create(21); w.settings.migration = .4; return w;
  });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: founding } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await expect(page.locator('[data-archipelago-scene]')).toHaveAttribute('data-archipelago-scene', 'fallback');
  const routes = await openRoutes(page, '0:2');
  await expect(routes.locator('section[data-route-chance]')).toHaveCount(0);
  const world = await page.evaluate(w => (window as any).StemLab.evoArchipelagoModel.step(w), founding);
  await routes.getByRole('button', { name: 'Record the first dispersal round', exact: true }).focus(); await page.keyboard.press('Enter');
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);
  const actual = await actualCounts(routes), panel = await openChance(routes, true);
  const low = panel.getByLabel('Lowest predicted crossing count', { exact: true }), high = panel.getByLabel('Highest predicted crossing count', { exact: true });
  const size = world.history[0].demes[0].birds.length;
  await low.focus(); await page.keyboard.press('End');
  await expect(low).toHaveValue(String(size)); await expect(high).toHaveValue(String(size));
  await high.focus(); await page.keyboard.press('Home');
  await expect(low).toHaveValue('0'); await expect(high).toHaveValue('0');
  await low.focus(); await page.keyboard.press('ArrowRight');
  await high.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(low).toHaveValue('1'); await expect(high).toHaveValue('3');
  const records = [{ species: 'birds', low: 1, high: 3, reason: 'The long crossing is uncommon for each bird, but there are many possible travelers.' }];
  await panel.getByLabel('Why do you expect this crossing range?', { exact: true }).fill(records[0].reason);
  const testForecast = panel.getByRole('button', { name: 'Test forecast with 16 new draws', exact: true });
  await testForecast.focus(); await page.keyboard.press('Enter');
  let expected = await modelEvidence(page, world, 1, 0, 2, records);
  await verifyChart(panel, expected, 'birds', 1, 3);
  await panel.getByRole('button', { name: speciesNames.plants, exact: true }).focus(); await page.keyboard.press('Space');
  await low.focus(); await page.keyboard.press('Home');
  await high.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  records.push({ species: 'plants', low: 0, high: 1, reason: 'Seeds disperse less often than birds, so I expect few or no selected-route crossings.' });
  await panel.locator(prefix + '-reason').fill(records[1].reason);
  await testForecast.focus(); await page.keyboard.press('Space');
  expected = await modelEvidence(page, world, 1, 0, 2, records);
  await verifyChart(panel, expected, 'plants', 0, 1);
  await panel.getByLabel('Inspect a possible dispersal round', { exact: true }).focus(); await page.keyboard.press('End');
  await expect(panel.locator(prefix + '-trial')).toHaveValue('31');
  await verifyTrial(panel, expected, 31, 'plants');
  await verifyForecast(panel, 0, records[0], expected.forecastResults[0]);
  await expect(panel.locator(prefix + '-low')).toHaveValue('0'); await expect(panel.locator(prefix + '-high')).toHaveValue('1');
  await expect(panel.locator(prefix + '-reason')).toHaveValue(records[1].reason);
  await panel.getByRole('button', { name: speciesNames.birds, exact: true }).focus(); await page.keyboard.press('Enter');
  await verifyChart(panel, expected, 'birds', 1, 3); await expect(panel.locator(prefix + '-reason')).toHaveValue(records[0].reason);
  await routes.getByRole('button', { name: 'Reverse this route', exact: true }).focus(); await page.keyboard.press('Space');
  await expect(panel).toHaveAttribute('data-chance-draws', '0'); await expect(panel.locator(prefix + '-reason')).toHaveValue('');
  await routes.locator('#ea-main-routes-route').selectOption({ value: '0:2' });
  await verifyChart(panel, expected, 'birds', 1, 3); await expect(panel.locator(prefix + '-reason')).toHaveValue(records[0].reason);
  await setRange(page, '#ea-generation', 0); await expect(routes.locator('section[data-route-chance]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Return to present', exact: true }).click(); await openChance(routes, true);
  await verifyChart(panel, expected, 'birds', 1, 3); await expect(panel.locator(prefix + '-reason')).toHaveValue(records[0].reason);
  await panel.getByRole('button', { name: 'Save chance investigation to journal', exact: true }).focus(); await page.keyboard.press('Enter');
  const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.archipelagoRouteChance.text);
  for (const record of records) expect(note).toContain(record.reason);
  const exported = await downloadChance(page, panel);
  await verifyExport(page, exported, world, 1, 0, 2, records);
  expect(await actualCounts(routes)).toEqual(actual);
  for (const button of [speciesNames.birds, speciesNames.plants, 'Test forecast with 16 new draws', 'Save chance investigation to journal', 'Download chance investigation']) {
    expect(await panel.getByRole('button', { name: button, exact: true }).evaluate((el: Element) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  }
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const violations = await page.evaluate(async () => (window as any).axe.run('[data-archipelago]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await panel.locator('xpath=ancestor::details[1]').screenshot({ path: report + '/route-chance-phone.png' });
  await harness.mount(page, { evoLab: { view: 'archipelago', archipelago: world } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  await openRoutes(page, '0:2'); await openChance(routes, true);
  await verifyChart(panel, expected, 'birds', 1, 3); await expect(panel.locator(prefix + '-reason')).toHaveValue(records[0].reason);
  const restoredExport = await downloadChance(page, panel);
  expect(restoredExport.recipe).toEqual(exported.recipe); expect(restoredExport.trials).toEqual(exported.trials);
  expect(restoredExport.forecastResults).toEqual(exported.forecastResults);
  expect(await page.evaluate(() => (window as any).__toolData.evoLab.archipelago)).toEqual(world);
  expect((await harness.glContexts(page)).filter(c => c.connected && !c.lost)).toHaveLength(0); expect(errors).toEqual([]);
});
