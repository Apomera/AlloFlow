import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, width: 320, height: 900 });
test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce', video: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, extra: any = {}) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness');
  await page.evaluate(extra => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    // Commit the harness root before keyboard interaction. The existing diagram
    // keeps this colony/Notebook workflow independent of scene rendering cost.
    w.ReactDOM.flushSync(() => w.__mount({ beehive: { ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: 'beekeeper', tutorialDone: true, soundOn: false, motionPaused: true,
      beeView: 'lifecycle', day: 10, workers: 22000, honey: 80, pollen: 80, ...extra }, otherTool: { retained: true } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, extra);
}
async function open(page: Page) {
  const summary = page.locator('[data-forecast-investigation] > summary');
  await summary.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-forecast-investigation]')).toHaveAttribute('open', '');
}
async function accessible(page: Page, selector = '[data-forecast-investigation]') {
  const violations = await page.evaluate(async selector => {
    const result = await (window as any).axe.run(document.querySelector(selector), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return result.violations.map((v: any) => ({ id: v.id, impact: v.impact,
      nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  }, selector);
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}
async function advanceTo(page: Page, target: number) {
  for (let i = 0; i < 35; i++) {
    const current = await page.evaluate(() => ({ day: (window as any).__toolData.beehive.day,
      event: !!(window as any).__toolData.beehive.activeEvent }));
    if (current.day >= target) return;
    if (current.event) await page.locator('[data-event-acknowledge]').click();
    else await page.locator('[data-beehive-time-control="5"]').click();
  }
  throw new Error('Colony did not reach the requested checkpoint');
}

test('keyboard prediction, reload, actual checkpoint, and Notebook portfolio form one persistent investigation', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const initial = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
  await open(page); await accessible(page);
  await page.locator('[data-forecast-study-metric]').selectOption('workers');
  await page.locator('[data-forecast-study-direction]').selectOption('higher');
  await page.locator('[data-forecast-study-prediction]').fill('Emerging brood should increase the worker population.');
  const draftData = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
  // A fresh page tests saved draft hydration rather than keeping component-local state.
  await harness.destroy(page);
  await page.reload();
  await page.evaluate(data => { const w = window as any; w.ReactDOM.flushSync(() => w.__mount(data)); Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' }); }, draftData);
  await open(page);
  await expect(page.locator('[data-forecast-study-prediction]')).toHaveValue('Emerging brood should increase the worker population.');
  await page.locator('[data-forecast-study-start]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-forecast-study-registered]')).toBeFocused();
  await expect(page.locator('[data-forecast-study-metric]')).toHaveCount(0);
  const registered = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
  expect(registered.beehive.day).toBe(initial.beehive.day);
  expect(registered.beehive.actionPoints).toBe(initial.beehive.actionPoints);
  expect(registered.beehive.randomState).toBe(initial.beehive.randomState);
  await page.locator('[data-management-choice="feed_bees"]').click();
  await advanceTo(page, 20);
  await expect(page.locator('[data-forecast-study-status="complete"]')).toBeVisible();
  const completed = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
  const readingSizes = await page.evaluate(() => ({
    axes: Array.from(document.querySelectorAll('[data-forecast-axis] span')).map(node => parseFloat(getComputedStyle(node).fontSize)),
    checkpoint: parseFloat(getComputedStyle(document.querySelector('[data-forecast-study-result] [data-emphasis="true"] dd')!).fontSize),
  }));
  expect(readingSizes.axes.every(size => size >= 12.5)).toBe(true);
  expect(readingSizes.checkpoint).toBeGreaterThanOrEqual(24);
  await expect(page.locator('#beehive-forecast-save-hint')).toContainText('Add an explanation');
  expect(completed.beehive.forecastInvestigation.forecast).toEqual(registered.beehive.forecastInvestigation.forecast);
  expect(completed.beehive.forecastInvestigation.observations.map((p: any) => p.day)).toEqual([10,11,12,13,14,15,16,17]);
  expect(completed.beehive.forecastInvestigation.notices.some((n: any) => n.kind === 'action')).toBe(true);
  await page.locator('[data-forecast-investigation]').getByText('Daily readings and intervening choices', { exact: true }).click();
  await expect(page.locator('[data-forecast-study-table] tbody tr')).toHaveCount(8);
  await accessible(page);
  await page.locator('[data-forecast-investigation]').screenshot({ path: testInfo.outputPath('forecast-investigation-light.png') });
  await page.evaluate(() => { (window as any).__ctx.isDark = true; (window as any).__rerender(); });
  await accessible(page);
  await page.locator('[data-forecast-investigation]').screenshot({ path: testInfo.outputPath('forecast-investigation-dark.png') });
  await page.locator('[data-forecast-study-explanation]').fill('Workers decreased. Feed and weather are competing explanations; one run cannot prove cause.');
  await page.locator('[data-forecast-study-save]').click();
  await expect(page.locator('[data-forecast-study-save]')).toHaveText('Saved to Science Notebook');
  await page.locator('[data-forecast-study-notebook]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-notebook-summary')).toBeFocused();
  const saved = page.locator('[data-forecast-saved-studies]'); await expect(saved).toBeVisible();
  await saved.locator('summary').click();
  await expect(saved.locator('pre')).toContainText('Prediction recorded at Day 10');
  await expect(saved.locator('pre')).toContainText('competing explanations');
  await accessible(page, '[data-forecast-saved-studies]');
  await page.evaluate(() => {
    const w = window as any; w.__copiedPortfolio = '';
    w.StemLab.writeClipboard = (text: string) => { w.__copiedPortfolio = text; return Promise.resolve(); };
  });
  await page.locator('[data-beehive-copy-notebook]').click();
  expect(await page.evaluate(() => (window as any).__copiedPortfolio)).toContain('## Colony forecast investigation');
  await page.emulateMedia({ forcedColors: 'active' });
  await saved.locator('[data-forecast-saved-remove]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-notebook-summary')).toBeFocused();
  await expect(page.locator('[data-forecast-saved-studies]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.otherTool)).toEqual({ retained: true });
  expect(errors).toEqual([]);
});

test('30-day monitoring marks unavailable readings honestly and remains readable under high contrast and large text', async ({ page }) => {
  await mount(page, { forecastInvestigationDraft: { metricId: 'pollen', horizon: 30, direction: 'lower', prediction: 'Nurses will consume pollen while brood grows.' } });
  await open(page); await page.locator('[data-forecast-study-start]').click();
  await page.locator('[data-forecast-investigation]').getByText('Daily readings and intervening choices', { exact: true }).click();
  await expect(page.locator('[data-forecast-study-table] tbody tr')).toHaveCount(31);
  await expect(page.locator('[data-forecast-study-table] tbody tr').last()).toContainText('Not recorded');
  await accessible(page);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
  await page.locator('[data-forecast-study-stop]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-forecast-study-explanation]')).toBeFocused();
  await expect(page.locator('[data-forecast-study-status="interrupted"]')).toContainText('stopped by the learner');
  await expect(page.locator('[data-forecast-study-result]')).toContainText('Not recorded');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.locator('[data-forecast-study-clear]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-forecast-study-metric]')).toBeFocused();
  await expect(page.locator('[data-forecast-study-prediction]')).toHaveValue('');
});

test('reopening evidence in another run reports an interruption without inventing the planned checkpoint', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, { forecastInvestigationDraft: { metricId: 'workers', horizon: 7, direction: 'higher', prediction: 'More brood should emerge.' } });
  await open(page); await page.locator('[data-forecast-study-start]').click();
  const evidence = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.beehive.forecastInvestigation)));
  await harness.destroy(page);
  await page.reload();
  await page.evaluate(evidence => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: { ...BH.bhCreateNewColonyState(0, 2, 0), viewMode: 'beekeeper', beeView: 'lifecycle', day: 10,
      workers: 22000, honey: 80, pollen: 80, soundOn: false, motionPaused: true, tutorialDone: true,
      forecastInvestigation: evidence } }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, evidence);
  await open(page);
  expect(errors).toEqual([]);
  await expect(page.locator('[data-forecast-study-status="interrupted"]')).toContainText('changed');
  await expect(page.locator('[data-forecast-study-result]')).toContainText('Not recorded');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.forecastInvestigation.observations.length)).toBe(1);
  await accessible(page);
});

test('coach, recorded changes, and pending checkpoints stay clear across themes and widths', async ({ page }, testInfo) => {
  await mount(page, { focusLayout: false, actionPoints: 2,
    lastAdvance: { fromDay: 9, toDay: 10, days: 1, workers: -350, honey: 2.7, varroa: 0, morale: 0, stoppedForEvent: false },
    lastManagement: { label: 'Feed Bees', day: 10, cost: '1 AP', summary: 'Added supplemental food to the colony.',
      changes: [{ label: 'Honey', before: 75, after: 80, delta: 5, suffix: ' lb' }, { label: 'Action points', before: 3, after: 2, delta: -1, suffix: '' }] },
    forecastInvestigationDraft: { metricId: 'workers', horizon: 7, direction: 'higher', prediction: 'I expect brood to emerge during the next week.' },
  });
  const coach = page.locator('[data-beehive-play-coach]');
  await expect(coach).toContainText('Next step');
  const bodySizes = await coach.locator('p').evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
  expect(bodySizes.every(size => size >= 14)).toBe(true);
  await expect(page.locator('[data-beehive-advance-evidence]')).toContainText('Decreased');
  await expect(page.locator('[data-beehive-advance-evidence]')).toContainText('Unchanged');
  await expect(page.locator('[data-beehive-management-evidence]')).toContainText('Benefits recorded');
  await expect(page.locator('[data-management-readings]')).toContainText('Before: 75 lb');
  await expect(page.locator('[data-management-causal-path]')).toContainText('Modeled mechanism');
  const intro = await page.locator('[data-management-intro]').boundingBox();
  const badges = await page.locator('[data-management-badges]').boundingBox();
  expect(intro!.width).toBeGreaterThan(240);
  expect(badges!.y).toBeGreaterThanOrEqual(intro!.y + intro!.height);
  await open(page); await page.locator('[data-forecast-study-start]').click();
  await expect(page.locator('[data-forecast-study-result]')).toContainText('Checkpoint not reached yet');
  const baseline = await page.evaluate(() => JSON.stringify((window as any).__toolData));
  for (const dark of [false, true]) {
    await page.evaluate(dark => { (window as any).__ctx.isDark = dark; (window as any).__rerender(); }, dark);
    if (dark) expect(await page.locator('[data-management-readings] h4').evaluate(node => getComputedStyle(node).color)).toBe('rgb(241, 245, 249)');
    for (const selector of ['[data-beehive-play-coach]', '[data-beehive-advance-evidence]', '[data-beehive-management-evidence]', '[data-forecast-investigation]']) await accessible(page, selector);
  }
  await coach.screenshot({ path: testInfo.outputPath('coach-mobile-dark.png') });
  await page.locator('[data-beehive-management-evidence]').screenshot({ path: testInfo.outputPath('management-mobile-dark.png') });
  await page.setViewportSize({ width: 1280, height: 900 });
  await accessible(page);
  await page.locator('[data-forecast-investigation]').screenshot({ path: testInfo.outputPath('forecast-desktop-dark.png') });
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData))).toBe(baseline);
});

test('planning results precede methods and management comparisons fit narrow desktop panels without spending actions', async ({ page }, testInfo) => {
  await mount(page, { focusLayout: false, day: 65, varroaLevel: 42, diseaseRisk: 45, actionPoints: 3 });
  const overview = page.locator('[data-beehive-outlook-overview]');
  expect(await page.evaluate(() => {
    const result = document.querySelector('[data-beehive-outlook-overview]')!;
    const methods = document.querySelector('[data-beehive-experiment-tools]')!;
    return !!(result.compareDocumentPosition(methods) & Node.DOCUMENT_POSITION_FOLLOWING);
  })).toBe(true);
  await expect(overview).toContainText('Combined food');
  await expect(overview).toContainText('Mite pressure');
  const initial = await page.evaluate(() => {
    const value = structuredClone((window as any).__toolData); delete value.beehive.forecastDays; return JSON.stringify(value);
  });
  await page.locator('[data-outlook-horizon="30"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-outlook-horizon="30"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await page.locator('[data-outlook-horizon="30"]').boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const preview = page.locator('[data-management-preview]');
  await preview.locator('summary').focus(); await page.keyboard.press('Enter');
  await page.locator('[data-management-preview-choice]').selectOption('requeen');
  await page.locator('[data-management-preview-horizon]').selectOption('30');
  const workers = preview.locator('[data-management-preview-metric="workers"]');
  await expect(workers).toContainText('Do nothing');
  await expect(workers).toContainText('Requeen');
  await expect(workers).toContainText('Difference');
  await expect(workers.locator('[data-preview-difference]')).toBeVisible();
  for (const dark of [false, true]) {
    await page.evaluate(dark => { (window as any).__ctx.isDark = dark; (window as any).__rerender(); }, dark);
    await accessible(page, '[data-beehive-outlook-overview]');
    await accessible(page, '.bee-outlook-header');
    await accessible(page, '[data-management-preview]');
    await workers.screenshot({ path: testInfo.outputPath('management-comparison-mobile-' + (dark ? 'dark' : 'light') + '.png') });
  }
  await overview.screenshot({ path: testInfo.outputPath('outlook-mobile-dark.png') });
  await page.setViewportSize({ width: 1280, height: 900 });
  await overview.screenshot({ path: testInfo.outputPath('outlook-desktop-dark.png') });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '340px'; });
  expect(await preview.locator('.bee-preview-controls').evaluate(node => getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/).length)).toBe(1);
  expect(await preview.locator('.bee-preview-metrics').evaluate(node => getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/).length)).toBe(1);
  expect(await overview.locator('.bee-outlook-metrics').evaluate(node => getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/).length)).toBe(2);
  expect(await preview.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await preview.locator('[data-management-preview-locate]').click();
  await expect(page.locator('[data-management-choice="requeen"]')).toBeFocused();
  expect(await page.evaluate(() => {
    const value = structuredClone((window as any).__toolData); delete value.beehive.forecastDays; return JSON.stringify(value);
  })).toBe(initial);
});

test('a shortened outlook and action comparison identify the actual day instead of implying a full 30-day projection', async ({ page }) => {
  await mount(page, { focusLayout: false, day: 95, workers: 510, honey: 0, syrup: 0, pollen: 0,
    brood: 0, broodCohorts: null, forecastDays: 30, actionPoints: 3 });
  await expect(page.locator('[data-outlook-shortened]')).toContainText('of 30 requested days');
  const checkpoint = (await page.locator('[data-outlook-checkpoint]').innerText()).match(/Day 95 → Day (\d+) · (\d+) projected days/)!;
  expect(Number(checkpoint[2])).toBeGreaterThan(0);
  expect(Number(checkpoint[2])).toBeLessThan(30);
  expect(Number(checkpoint[1])).toBe(95 + Number(checkpoint[2]));
  await expect(page.locator('[data-beehive-outlook-overview] h4').first()).toHaveText('Projected at Day ' + checkpoint[1]);
  await page.locator('[data-management-preview] > summary').click();
  await page.locator('[data-management-preview-horizon]').selectOption('30');
  const comparison = (await page.locator('[data-management-preview-results] h4').innerText()).match(/after (\d+) days · Day (\d+)/)!;
  expect(Number(comparison[1])).toBeLessThan(30);
  expect(Number(comparison[2])).toBe(95 + Number(comparison[1]));
  await expect(page.locator('[data-management-preview-results]')).toContainText('Both scenarios use Day ' + comparison[2]);
  await page.emulateMedia({ forcedColors: 'active' });
  await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
  expect(await page.locator('[data-management-preview]').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  expect(await page.locator('[data-beehive-outlook-overview]').evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { document.documentElement.style.fontSize = '16px'; });
  await accessible(page, '[data-management-preview]');
  await page.evaluate(() => {
    (window as any).__ctx.setToolData((prev: any) => ({ ...prev, beehive: { ...prev.beehive, actionPoints: 0 } }));
  });
  await expect(page.locator('[data-management-preview-readiness]')).toContainText('Need 1 AP');
  await expect(page.locator('[data-management-preview-results]')).toHaveCount(0);
});
