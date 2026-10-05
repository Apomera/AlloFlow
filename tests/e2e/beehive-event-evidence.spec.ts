import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, width: 320, height: 900 });
test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce', video: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, kind = '') {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(kind => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    const before = { ...BH.bhCreateNewColonyState(777, 3, 0), viewMode: 'beekeeper', day: 10,
      tutorialDone: true, soundOn: false, motionPaused: true, beeView: 'lifecycle', focusLayout: true,
      honey: 2, morale: 4, actionPoints: 3,
      notebook: { beekeeper: { evidence: 'My original writing.', review: { evidence: true, prediction: true } }, drone: { evidence: 'Flight notes.' } } };
    const definition = { id: 'storm', emoji: '🌧️', label: 'Sudden storm', weather: true,
      desc: 'Foragers return early.', lesson: 'Resource use continues through a storm.', effect: { honey: -30, morale: -8 } };
    let state = before;
    if (kind) {
      state = { ...before, day: 11, honey: 0, workers: 9789, morale: 0, varroaLevel: 5.3 };
      state.activeEvent = kind === 'legacy' ? definition : BH.bhCaptureColonyEvent(definition, before, state, before);
    }
    w.ReactDOM.flushSync(() => w.__mount({ beehive: state, otherTool: { retained: 'Unrelated writing.' } }));
    w.__eventAwards = [];
    w.__ctx.awardXP = (...args: any[]) => { w.__eventAwards.push(args); };
    const copy = (text: string) => { w.__eventReport = text; return Promise.resolve(); };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    w.StemLab.writeClipboard = copy;
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, kind);
}
async function conservedState(page: Page) {
  return page.evaluate(() => {
    const state = { ...(window as any).__toolData.beehive };
    for (const key of ['notebook', 'notebookOpen', 'activeEvent', 'eventLog', 'eventsHandled', 'weatherEventsHandled', 'autoAdvance']) delete state[key];
    return JSON.stringify(state);
  });
}
async function accessible(page: Page, selector = '#beehive-active-event') {
  const result = await page.evaluate(async selector => {
    const node = document.querySelector(selector)!;
    const audit = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return { violations: audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      width: node.clientWidth, content: node.scrollWidth,
      targets: Array.from(node.querySelectorAll('button, summary')).filter(n => n.getBoundingClientRect().height > 0).map(n => n.getBoundingClientRect().height) };
  }, selector);
  expect(result.violations).toEqual([]); expect(result.content).toBeLessThanOrEqual(result.width + 1);
  expect(result.targets.every(size => size >= 44), JSON.stringify(result.targets)).toBe(true);
}

test('real events freeze daily evidence, acknowledge once, and survive a backup with later live values', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  let prior: any;
  for (let attempt = 0; attempt < 30; attempt++) {
    prior = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.beehive)));
    await page.locator('#beehive-next-day').click();
    if (await page.locator('#beehive-active-event').count()) break;
  }
  const active = page.locator('#beehive-active-event'); await expect(active).toBeVisible();
  const event = await page.evaluate(() => (window as any).__toolData.beehive.activeEvent);
  expect(event.observation.fromDay).toBe(prior.day);
  expect(event.observation.before.honey).toBe(prior.honey);
  expect(event.observation.before.workers).toBe(prior.workers);
  expect(event.observation.after.honey).toBe(await page.evaluate(() => (window as any).__toolData.beehive.honey));
  expect(event.observation.after.workers).toBe(await page.evaluate(() => (window as any).__toolData.beehive.workers));
  await expect(active).toContainText('do not isolate');
  const before = await conservedState(page);
  await active.locator('[data-event-settings] > summary').focus(); await page.keyboard.press('Enter');
  await expect(active.locator('[data-event-settings]')).toContainText('model inputs, not measured changes');
  await active.locator('[data-event-use-evidence]').evaluate(node => { (node as HTMLButtonElement).click(); (node as HTMLButtonElement).click(); });
  await expect(active.locator('[data-event-use-evidence]')).toBeDisabled();
  await active.locator('[data-event-open-notebook]').click();
  const evidence = page.locator('[data-notebook-field="evidence"]');
  await expect(evidence).toBeFocused(); await expect(evidence).toHaveValue(/My original writing\.\nColony event:/);
  await expect(page.locator('[data-notebook-review="evidence"]')).not.toBeChecked();
  expect(await conservedState(page)).toBe(before);
  await active.locator('[data-event-acknowledge]').evaluate(node => { (node as HTMLButtonElement).click(); (node as HTMLButtonElement).click(); });
  await expect(active).toHaveCount(0); await expect(page.locator('#beehive-next-day')).toBeFocused();
  expect(await conservedState(page)).toBe(before);
  const acknowledged = await page.evaluate(() => ({ state: (window as any).__toolData.beehive, awards: (window as any).__eventAwards }));
  expect(acknowledged.state.eventLog).toHaveLength(1); expect(acknowledged.state.eventsHandled).toBe(1);
  expect(acknowledged.awards.filter((entry: any[]) => entry[2] === 'Handled event')).toHaveLength(1);
  const history = page.locator('[data-beehive-event-history]');
  await history.locator(':scope > summary').click(); await history.locator('[data-event-record] > summary').click();
  await expect(history.locator('[data-event-reading="honey"]')).toContainText(event.observation.before.honey.toLocaleString('en-US'));
  await expect(history.locator('[data-event-use-evidence]')).toBeDisabled();
  const recordText = await history.locator('[data-event-day-readings]').innerText();
  await page.getByRole('button', { name: 'Export colony report', exact: true }).click();
  const report = await page.evaluate(() => (window as any).__eventReport);
  expect(report).toContain('## Recent colony events'); expect(report).toContain(event.label);
  expect(report).toContain('Preset effects (model inputs, not measured changes)');
  const backup = await page.evaluate(() => {
    const w = window as any;
    return w.__RR_TEST_EXPORTS__.beehive.bhBuildBeeBackup({ ...w.__toolData.beehive, day: 150, honey: 999, workers: 99999, history: [] }, '2026-10-04T12:00:00Z');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(backup => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: w.__RR_TEST_EXPORTS__.beehive.bhReadBeeBackup(backup).state }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, backup);
  await history.locator(':scope > summary').click(); await history.locator('[data-event-record] > summary').click();
  expect(await history.locator('[data-event-day-readings]').innerText()).toBe(recordText);
  await expect(history.locator('[data-event-use-evidence]')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('legacy events and a full Notebook remain honest, and old acknowledgement handlers cannot resolve a new event', async ({ page }) => {
  await mount(page, 'legacy');
  const active = page.locator('#beehive-active-event');
  await expect(active).toContainText('Daily readings were not recorded');
  await expect(active.locator('[data-event-day-readings]')).toHaveCount(0);
  await page.evaluate(() => {
    const w = window as any;
    w.__staleAck = document.querySelector('[data-event-acknowledge]');
    w.__ctx.setToolData((prev: any) => ({ ...prev, beehive: { ...prev.beehive, notebook: { ...prev.beehive.notebook, beekeeper: { evidence: 'x'.repeat(1200) } } } }));
  });
  await expect(active.locator('[data-event-use-evidence]')).toBeDisabled();
  await expect(active.locator('[data-event-evidence-status]')).toContainText('Your writing is kept');
  await active.locator('[data-event-acknowledge]').click();
  const history = page.locator('[data-beehive-event-history]');
  await history.locator(':scope > summary').click(); await history.locator('[data-event-record] > summary').click();
  await expect(history).toContainText('Day not recorded');
  await page.evaluate(() => {
    const w = window as any;
    w.__ctx.setToolData((prev: any) => ({ ...prev, beehive: { ...prev.beehive, activeEvent: {
      id: 'supersedure', label: 'Raising a replacement queen', emoji: '👑', desc: 'Egg laying pauses.', lesson: 'Existing brood continues developing.', effect: {},
      observation: { schemaVersion: 2, futureData: 'keep' },
    } } }));
  });
  await expect(active).toContainText('Raising a replacement queen');
  await expect(active).toContainText('unsupported format');
  await page.evaluate(() => { (window as any).__staleAck.click(); });
  await expect(active).toBeVisible();
  await active.locator('[data-event-settings] > summary').click(); await expect(active).toContainText('No numeric preset effects');
  await active.locator('[data-event-acknowledge]').click();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.eventsHandled)).toBe(2);
  expect(await page.evaluate(() => (window as any).__toolData.beehive.eventLog.at(-1).observation)).toEqual({ schemaVersion: 2, futureData: 'keep' });
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook.beekeeper.evidence)).toBe('x'.repeat(1200));
  expect(await page.evaluate(() => (window as any).__toolData.otherTool.retained)).toBe('Unrelated writing.');
});

test('event cards support keyboard review, narrow panels, both themes and enlarged text', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); await mount(page, 'recorded');
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '340px'; });
  const active = page.locator('#beehive-active-event');
  await active.locator('[data-event-settings] > summary').focus(); await page.keyboard.press('Enter');
  await expect(active.locator('[data-event-impact="honey"]')).toContainText('-30 lb');
  await expect(active.locator('[data-event-day-delta="honey"]')).toContainText('-2 lb');
  await accessible(page);
  expect(await active.locator('.bee-event-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(1);
  await active.screenshot({ path: testInfo.outputPath('event-evidence-light.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await accessible(page); await active.screenshot({ path: testInfo.outputPath('event-evidence-dark.png') });
  await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
  await accessible(page);
  await page.emulateMedia({ forcedColors: 'active' });
  const acknowledge = active.locator('[data-event-acknowledge]'); await acknowledge.focus();
  expect(await acknowledge.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
  await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-next-day')).toBeFocused();
  const history = page.locator('[data-beehive-event-history]');
  await history.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
  await history.locator('[data-event-record] > summary').focus(); await page.keyboard.press('Enter');
  await accessible(page, '[data-beehive-event-history]');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { document.documentElement.style.fontSize = '16px'; document.getElementById('wrap')!.style.width = '100%'; });
  expect(await history.locator('.bee-event-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(2);
});
