import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive', preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1360, height: 1000, extraScripts: ['node_modules/axe-core/axe.min.js'] });
test.describe.configure({ timeout: 120000 });
test.use({ viewport: { width: 1360, height: 1000 }, reducedMotion: 'reduce' });
test.beforeAll(async () => { mkdirSync('scratch/beehive-discovery', { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });
async function mount(page: any, state: any = {}, dark = false) {
  await page.goto(harness.url + '/__harness');
  await page.evaluate(({ state, dark }: any) => {
    const w = window as any;
    w.__mount({ beehive: { tutorialDone: true, motionPaused: true, soundOn: false, day: 0, simulationSeed: 24581, ...state } });
    w.__ctx.isDark = dark; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, { state, dark });
  await expect(page.locator('[data-beehive-discovery-shell]')).toBeVisible();
}
async function expectApiaryPainted(page: any) {
  await expect.poll(async () => page.locator('[data-beehive-canvas]').evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    const colors = new Set();
    for (let x = 0; x < canvas.width; x += Math.max(1, Math.floor(canvas.width / 60))) {
      colors.add(Array.from(ctx.getImageData(x, Math.floor(canvas.height * .65), 1, 1).data).join(','));
    }
    return colors.size;
  })).toBeGreaterThan(10);
}
async function auditDiscovery(page: any) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-beehive-discovery]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.failureSummary) }));
  });
  expect(violations).toEqual([]);
}

test('opens with an unobstructed scene and keyboard-operable learning annotations', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page);
  const scene = page.locator('#beehive-canvas-wrap');
  expect((await scene.boundingBox())!.y).toBeLessThan(500);
  expect((await page.locator('[data-beehive-beekeeper-paused-overlay]').boundingBox())!.height).toBeLessThan(60);
  await expect(page.locator('.bee-discovery-routes')).toBeVisible();
  await page.getByRole('button', { name: 'Worker routes', exact: true }).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('.bee-discovery-routes')).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(page.locator('.bee-discovery-routes')).toBeVisible();
  await page.getByRole('button', { name: 'Colony demand', exact: true }).click();
  await expect(page.locator('#bee-discovery-mechanism')).toContainText('More activity does not automatically mean a surplus');
  await expect.poll(async () => page.locator('[data-beehive-canvas]').evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    const colors = new Set();
    for (let x = 0; x < canvas.width; x += Math.max(1, Math.floor(canvas.width / 60))) {
      colors.add(Array.from(ctx.getImageData(x, Math.floor(canvas.height * .65), 1, 1).data).join(','));
    }
    return colors.size;
  })).toBeGreaterThan(10);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'scratch/beehive-discovery/desktop-apiary.png' });
  await auditDiscovery(page);
  expect(errors).toEqual([]);
});

test('captures immutable evidence, accepts revision, and includes the saved explanation in portfolio export', async ({ page }) => {
  await mount(page);
  const card = page.locator('[data-beehive-discovery]');
  await expect(card.getByRole('button', { name: 'Check my thinking' })).toBeDisabled();
  await card.getByRole('radio', { name: 'They grow because bees are busy' }).check();
  await card.getByRole('button', { name: 'Check my thinking' }).click();
  // Evidence before the answer: the verdict stays locked until an observation and a change.
  await expect(card.locator('[data-discovery-feedback]')).toHaveAttribute('data-discovery-feedback', 'pending');
  await card.getByRole('button', { name: 'Capture observation', exact: true }).click();
  const captured = await card.locator('.bee-discovery-evidence p').first().textContent();
  await expect(card.locator('[data-discovery-feedback]')).toHaveAttribute('data-discovery-feedback', 'pending');
  await page.locator('[data-discovery-advance]').click();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.day)).toBe(1);
  await expect(card.locator('.bee-discovery-evidence p').first()).toHaveText(captured!);
  await expect(card.locator('[data-discovery-feedback]')).toHaveAttribute('data-discovery-feedback', 'revise');
  await card.getByRole('radio', { name: 'They fall even while bees forage' }).focus();
  await page.keyboard.press('Space');
  await card.getByRole('button', { name: 'Check my thinking' }).click();
  await expect(card.locator('[data-discovery-feedback]')).toHaveAttribute('data-discovery-feedback', 'supported');
  await expect(card.getByRole('button', { name: 'Save discovery', exact: true })).toBeDisabled();
  const note = 'I observed 20 lb at day 0. Stores depend on income minus consumption, not visible activity.';
  await card.getByRole('textbox').fill(note);
  await card.getByRole('button', { name: 'Save discovery', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Discovery saved' })).toBeVisible();
  const savedEvidence = await page.evaluate(() => (window as any).__toolData.beehive.notebook.discoveries.stores.comparisonEvidence);
  expect(savedEvidence.beforeLabel).toBe('Day 0');
  expect(savedEvidence.afterLabel).toBe('Day 1');
  expect(savedEvidence.rows.find((row: any) => row.id === 'honey')).toMatchObject({ before: 20 });
  await expect(card.locator('.bee-discovery-progress')).toContainText('1/6 discoveries saved');
  await page.locator('#beehive-notebook-summary').click();
  await expect(page.locator('[data-discovery-notebook-records]')).toContainText(note);
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as any).__copiedPortfolio = text; } } }); });
  await page.locator('[data-beehive-copy-notebook]').click();
  expect(await page.evaluate(() => (window as any).__copiedPortfolio)).toContain(note);
  await page.getByRole('radio', { name: /^Colony Network\./ }).click();
  await expect(page.locator('[data-beehive-discovery]')).toHaveAttribute('data-beehive-discovery', 'network');
  await page.getByRole('radio', { name: /^Beekeeper\./ }).click();
  await expect(page.locator('[data-beehive-discovery] textarea')).toHaveValue(note);
});

test('connects each discovery to the right science diagram and preserves separate drafts', async ({ page }) => {
  await mount(page);
  const select = page.getByRole('combobox', { name: 'Choose a discovery' });
  for (const [lesson, view, title] of [['pollination', 'pollination', 'A flower connection'], ['waggle', 'waggle', 'Decode the dance'], ['thermo', 'thermo', 'The living thermostat'], ['stores', 'scene', 'Follow the food']]) {
    await select.selectOption(lesson);
    await expect(page.locator('#bee-discovery-title')).toHaveText(title);
    expect(await page.evaluate(() => (window as any).__toolData.beehive.beeView)).toBe(view);
    await auditDiscovery(page);
  }
  await select.selectOption('waggle');
  await page.getByRole('radio', { name: 'Direction relative to the sun', exact: true }).check();
  await select.selectOption('thermo');
  await expect(page.locator('[data-beehive-discovery] input:checked')).toHaveCount(0);
  await select.selectOption('waggle');
  await expect(page.getByRole('radio', { name: 'Direction relative to the sun', exact: true })).toBeChecked();
});

test('preserves readability and access at 320px, dark theme, and forced colors', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    for (const name of [/^Beekeeper\./, /^Colony Network\./, /^Drone Flight\./]) await expect(page.getByRole('radio', { name })).toBeVisible();
    await auditDiscovery(page);
  }
  await page.screenshot({ path: 'scratch/beehive-discovery/mobile-apiary.png' });
  await page.evaluate(() => { (window as any).__ctx.isDark = true; (window as any).__rerender(); });
  await auditDiscovery(page);
  await page.locator('[data-beehive-discovery]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'scratch/beehive-discovery/mobile-dark-discovery.png' });
  await page.emulateMedia({ forcedColors: 'active' });
  await expect(page.getByRole('button', { name: 'Check my thinking', exact: true })).toBeVisible();
  expect(await page.locator('.bee-discovery-route-travel').evaluate(n => getComputedStyle(n).animationName)).toBe('none');
});

test('supports active network and flight evidence, including real flight altitude', async ({ page }) => {
  await mount(page, { viewMode: 'queen', queen: { active: true, paused: true } });
  await expect(page.locator('[data-beehive-discovery]')).toHaveAttribute('data-beehive-discovery', 'network');
  await page.getByRole('button', { name: 'Capture observation', exact: true }).click();
  await expect(page.locator('.bee-discovery-evidence')).toContainText('Cycle');
  await page.evaluate(() => window.scrollTo(0, 0));
  expect((await page.locator('[data-beehive-3d-bay="queen"]').boundingBox())!.y).toBeLessThan(650);
  await expect(page.locator('#beehive-queen-playfield')).toBeVisible();
  await page.screenshot({ path: 'scratch/beehive-discovery/colony-network.png' });
  await page.getByRole('radio', { name: /^Drone Flight\./ }).click();
  await expect(page.getByRole('button', { name: 'Capture observation', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Start easy flight' }).click();
  await page.getByRole('button', { name: 'Capture observation', exact: true }).click();
  // Launch position varies with the route. Compare with real instruments, not a fixture constant.
  const capturedFlight = await page.locator('.bee-discovery-evidence').textContent();
  expect(capturedFlight).toMatch(/altitude [1-9]\d* ft/);
  expect(capturedFlight).not.toContain('altitude 0 ft');
  await auditDiscovery(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'scratch/beehive-discovery/drone-flight.png' });
});

test('restores saved overview layout and can switch back without losing state', async ({ page }) => {
  await mount(page);
  await page.locator('[data-discovery-settings] > summary').click();
  await page.locator('[data-beehive-focus-layout]').click();
  await expect(page.locator('[data-beehive-focus-layout]')).toBeFocused();
  await expectApiaryPainted(page);
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-layout', 'overview-first');
  await expect(page.locator('[data-beehive-discovery]')).toHaveCount(0);
  await page.locator('[data-beehive-focus-layout]').click();
  await expect(page.locator('[data-beehive-focus-layout]')).toBeFocused();
  await expectApiaryPainted(page);
  await expect(page.locator('[data-beehive-discovery]')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.day)).toBe(0);
});

test('decodes dance directions by keyboard and exports a frozen before-and-after trial', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page, { discoveryLesson: 'waggle', beeView: 'waggle' });
  const lab = page.locator('[data-waggle-lab]');
  const card = page.locator('[data-beehive-discovery]');
  await expect(lab.locator('output')).toContainText('135°');
  await card.getByRole('radio', { name: 'Direction relative to the sun', exact: true }).check();
  await card.getByRole('button', { name: 'Check my thinking' }).click();
  await card.getByRole('button', { name: 'Capture observation', exact: true }).click();
  await card.getByRole('button', { name: 'Compare now', exact: true }).click();
  await expect(card.locator('[data-discovery-comparison]')).toContainText('No measured change in this trial');
  await card.getByRole('button', { name: 'Try the dance decoder' }).click();
  await expect(lab).toBeFocused();
  await page.locator('#bee-waggle-sun').focus();
  await page.keyboard.press('End');
  await expect(page.locator('#bee-waggle-sun')).toHaveValue('345');
  await expect(lab.locator('output')).toContainText('30°');
  await expect(lab.getByRole('img', { name: /Outdoor compass/ })).toHaveAttribute('aria-label', /Food bearing 30 degrees/);
  await lab.getByRole('button', { name: 'Record your discovery' }).click();
  await expect(page.locator('#bee-discovery-title')).toBeFocused();
  await card.getByRole('button', { name: 'Compare now', exact: true }).click();
  await expect(card.locator('[data-evidence-metric="food"]')).toContainText('135 → 30 °');
  await expect(card.locator('[data-evidence-metric="food"]')).toContainText('-105 ° turn');
  await expect(card.locator('[data-evidence-metric="dance"]')).toContainText('No change');
  await card.getByRole('textbox').fill('With the same dance angle, the compass direction changes when the sun moves.');
  await card.getByRole('button', { name: 'Save discovery', exact: true }).click();
  await page.locator('#bee-waggle-angle').focus();
  await page.keyboard.press('Home');
  await expect(card.locator('[data-evidence-metric="food"]')).toContainText('135 → 30 °');
  await page.locator('#beehive-notebook-summary').click();
  await expect(page.locator('[data-discovery-notebook-records]')).toContainText('135 → 30 ° (-105 °, shortest turn)');
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as any).__copiedPortfolio = text; } } }); });
  await page.locator('[data-beehive-copy-notebook]').click();
  expect(await page.evaluate(() => (window as any).__copiedPortfolio)).toContain('**Before and after:**');
  await lab.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'scratch/beehive-discovery/waggle-decoder.png' });
  await auditDiscovery(page);
  expect(errors).toEqual([]);
});

test('brings temperature controls beside evidence and compares the actual inquiry model', async ({ page }) => {
  await mount(page, { discoveryLesson: 'thermo', beeView: 'thermo' });
  const widget = page.locator('[data-beehive-thermoregulation]');
  const card = page.locator('[data-beehive-discovery]');
  await expect(widget).toHaveCount(1);
  expect((await widget.boundingBox())!.y).toBeLessThan(500);
  await expect(widget.locator('#beehive-thermo-output')).toContainText('29.6 °C');
  await card.getByRole('button', { name: 'Capture observation', exact: true }).click();
  await page.locator('#th-beesFanning').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#th-beesFanning')).toHaveValue('40');
  await expect(widget.locator('#beehive-thermo-output')).toContainText('29.2 °C');
  await card.getByRole('button', { name: 'Compare now', exact: true }).click();
  await expect(card.locator('[data-evidence-metric="temperature"]')).toContainText('29.6 → 29.2 °C');
  await expect(card.locator('[data-evidence-metric="temperature"]')).toContainText('-0.4 °C');
  await expect(card.locator('[data-evidence-metric="fanning"]')).toContainText('+10 bees');
  await expect(card.locator('[data-evidence-metric="outside"]')).toContainText('No change');
  await page.getByRole('combobox', { name: 'Choose a discovery' }).selectOption('stores');
  // Merged 2026-09-28: the lab belongs to its discovery; elsewhere a one-line launcher stands in.
  await expect(widget).toHaveCount(0);
  await expect(page.locator('[data-beehive-thermo-launcher]')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Choose a discovery' }).selectOption('thermo');
  await expect(page.locator('#th-beesFanning')).toHaveValue('40');
  await expect(card.locator('[data-evidence-metric="temperature"]')).toContainText('-0.4 °C');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'scratch/beehive-discovery/temperature-trial.png' });
  await auditDiscovery(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => { (window as any).__ctx.isDark = true; (window as any).__rerender(); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-beehive-thermoregulation]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.failureSummary) }));
  });
  expect(violations).toEqual([]);
  await auditDiscovery(page);
  await widget.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'scratch/beehive-discovery/mobile-dark-temperature.png' });
});

test('requires a fresh baseline after a restart and supports legacy observations', async ({ page }) => {
  await mount(page, { experimentRunSerial: 1 });
  const card = page.locator('[data-beehive-discovery]');
  await card.getByRole('radio', { name: 'They fall even while bees forage' }).check();
  await card.getByRole('button', { name: 'Check my thinking' }).click();
  await card.getByRole('button', { name: 'Capture observation', exact: true }).click();
  await page.evaluate(() => { const w = window as any; w.__toolData.beehive.experimentRunSerial = 2; w.__toolData.beehive.day = 5; w.__rerender(); });
  await expect(card.locator('[data-discovery-feedback]')).toHaveAttribute('data-discovery-feedback', 'pending');
  await expect(card).toContainText('Capture a fresh observation in this run');
  await card.getByRole('button', { name: 'Compare now', exact: true }).click();
  await expect(card).toContainText('different run');
  await expect(card.locator('[data-discovery-comparison]')).toHaveCount(0);
  await card.getByRole('button', { name: 'Update observation', exact: true }).click();
  await page.locator('[data-discovery-advance]').click();
  await card.getByRole('button', { name: 'Compare now', exact: true }).click();
  await expect(card.locator('[data-discovery-comparison]')).toContainText('Day 5 → Day 6');
  await page.evaluate(() => { const w = window as any; w.__toolData.beehive.discoveryRecords.stores = { observation: 'Legacy written observation' }; w.__rerender(); });
  await card.getByRole('button', { name: 'Compare now', exact: true }).click();
  await expect(card).toContainText('Capture a fresh observation with numeric readings');
});

test('plots the real daily food-store history after advancing the colony', async ({ page }) => {
  await mount(page);
  for (let i = 0; i < 3; i++) await page.locator('[data-discovery-advance="true"]').click();
  const history = await page.evaluate(() => (window as any).__toolData.beehive.history);
  expect(history.length).toBe(3);
  const chart = page.locator('[data-discovery-trend] svg');
  await expect(chart).toBeVisible();
  await expect(chart.locator('circle')).toHaveCount(3);
  const label = await chart.getAttribute('aria-label');
  for (const sample of history) expect(label).toContain('Day ' + sample.d + ': ' + sample.h.toFixed(1) + ' lb');
});

test('records an unchanged trial as evidence and keeps it fixed after later adjustments', async ({ page }) => {
  await mount(page, { discoveryLesson: 'waggle', beeView: 'waggle' });
  const card = page.locator('[data-beehive-discovery]');
  await card.getByRole('radio', { name: 'Direction relative to the sun', exact: true }).check();
  await card.getByRole('button', { name: 'Check my thinking' }).click();
  await card.getByRole('button', { name: 'Capture observation', exact: true }).click();
  await card.getByRole('textbox').fill('With the same sun and dance angles, the food bearing stayed the same.');
  await expect(card.getByRole('button', { name: 'Save discovery', exact: true })).toBeDisabled();
  await card.getByRole('button', { name: 'Compare now', exact: true }).click();
  await expect(card.locator('[data-discovery-feedback]')).toHaveAttribute('data-discovery-feedback', 'supported');
  await expect(card.locator('[data-discovery-comparison]')).toContainText('No change');
  await card.getByRole('button', { name: 'Save discovery', exact: true }).click();
  const captured = await page.evaluate(() => JSON.stringify((window as any).__toolData.beehive.notebook.discoveries.waggle.comparisonEvidence));
  await page.locator('#bee-waggle-sun').focus();
  await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.beehive.notebook.discoveries.waggle.comparisonEvidence))).toBe(captured);
  expect(JSON.parse(captured).unchanged).toBe(true);
  await auditDiscovery(page);
});

test('keeps the decoder and comparison readable at 320px in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mount(page, { discoveryLesson: 'waggle', beeView: 'waggle' });
  for (const dark of [false, true]) {
    await page.evaluate(dark => { (window as any).__ctx.isDark = dark; (window as any).__rerender(); }, dark);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator('#bee-waggle-angle')).toBeVisible();
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('[data-waggle-lab]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
      return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.failureSummary) }));
    });
    expect(violations).toEqual([]);
    await auditDiscovery(page);
  }
  await page.locator('[data-waggle-lab]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'scratch/beehive-discovery/mobile-dark-decoder.png' });
  await page.emulateMedia({ forcedColors: 'active' });
  await page.locator('#bee-waggle-angle').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#bee-waggle-angle')).toHaveValue('60');
});

test('opens the next planning field with keyboard focus and preserves the trial', async ({ page }) => {
  const plan = {
    plannedActionId: 'plant_wildflowers', predictedMetricId: 'honey', predictedDirection: 'higher',
    question: '', hypothesis: 'More forage may increase stores.', changedVariable: 'Plant wildflowers once.', prediction: 'Run B honey will be higher.',
  };
  await mount(page, { day: 4, notebook: { experiment: plan } });
  await page.evaluate(() => { (window as any).__ctx.gradeLevel = 8; (window as any).__rerender(); });
  const planner = page.locator('[data-beehive-experiment-notebook]');
  expect(await planner.evaluate((element: HTMLDetailsElement) => element.open)).toBe(false);
  const guide = page.locator('[data-experiment-protocol]');
  await guide.getByRole('button', { name: 'Open the next planning item', exact: true }).click();
  await expect(page.locator('[data-experiment-notebook-field="question"]')).toBeFocused();
  expect(await planner.evaluate((element: HTMLDetailsElement) => element.open)).toBe(true);
  const state = await page.evaluate(() => (window as any).__toolData.beehive);
  expect(state.day).toBe(4);
  expect(state.notebook.experiment).toMatchObject(plan);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const next = guide.locator('[data-experiment-next-step]');
  const textBox = await next.locator(':scope > div').boundingBox();
  const actionBox = await next.locator('button').boundingBox();
  expect(textBox!.width).toBeGreaterThan(140);
  expect(actionBox!.y).toBeGreaterThanOrEqual(textBox!.y + textBox!.height);
  await guide.screenshot({ path: 'scratch/beehive-discovery/mobile-experiment-guide.png' });
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-experiment-protocol]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.failureSummary) }));
  });
  expect(violations).toEqual([]);
});

test('guides a repeat trial to time, restart, and explanation controls without executing them', async ({ page }) => {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await mount(page);
  for (const [day, step, target] of [
    [7, 'checkpoint', '#beehive-next-day'],
    [14, 'overshot', '[data-experiment-restart-run-b]'],
    [12, 'explain', '[data-experiment-notebook-field="observations"]'],
  ] as const) {
    await page.evaluate((day) => {
      const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
      const plan = { plannedActionId: 'plant_wildflowers', predictedMetricId: 'honey', predictedDirection: 'higher', question: 'Does forage affect honey?', hypothesis: 'Extra forage may raise stores.', changedVariable: 'Plant wildflowers once.', prediction: 'Run B will store more honey at Day 12.' };
      const baseline = BH.bhCreateExperimentSnapshot({ ...BH.bhCreateNewColonyState(4321, 1), day: 12, honey: 20 });
      const current = { ...BH.bhCreateNewColonyState(4321, 2), day, honey: 28, tutorialDone: true, motionPaused: true, soundOn: false, experimentBaseline: baseline, notebook: { experiment: { ...plan, registeredPlan: BH.bhCreateExperimentPlanRegistration(plan, 2, 1) } } };
      BH.bhAppendManagementAction(current, { day: 4, choiceId: 'plant_wildflowers', label: 'Plant wildflowers', cost: '1 AP' });
      w.__toolData.beehive = current; w.__ctx.gradeLevel = 8; w.__rerender();
    }, day);
    const action = page.locator('[data-experiment-next-action="' + step + '"]');
    await expect(action).toBeVisible();
    await action.click();
    await expect(page.locator(target)).toBeFocused();
    const state = await page.evaluate(() => (window as any).__toolData.beehive);
    expect(state.day).toBe(day);
    expect(state.experimentRunSerial).toBe(2);
    expect(state.managementTrail).toHaveLength(1);
  }
});
