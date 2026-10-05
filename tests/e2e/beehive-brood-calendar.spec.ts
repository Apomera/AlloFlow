import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, width: 320, height: 950, layout: 'document' });
test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ viewport: { width: 320, height: 950 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, options: any = {}) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(options => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    const workers = Array(21).fill(0), drones = Array(24).fill(0);
    workers[0] = 12; workers[3] = 100; workers[6] = 29; workers[20] = 50;
    drones[0] = 3; drones[3] = 12; drones[23] = 9;
    const cohorts = { schemaVersion: 1, workers, drones };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: { ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: 'beekeeper', beeView: 'lifecycle', tutorialDone: true, soundOn: false,
      motionPaused: true, day: 60, brood: 215, broodCohorts: cohorts,
      ...options }, otherTool: { retained: true } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
  }, options);
  await expect(page.locator('[data-beehive-brood-calendar]')).toBeVisible();
}
async function inputs(page: Page) {
  return page.evaluate(() => {
    const { notebook, ...colony } = (window as any).__toolData.beehive;
    return { colony, otherTool: (window as any).__toolData.otherTool };
  });
}
async function accessible(page: Page) {
  const result = await page.evaluate(async () => {
    const node = document.querySelector('[data-beehive-brood-calendar]')!;
    const axe = await (window as any).axe.run(node, { runOnly: { type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return { violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: node.scrollWidth - node.clientWidth,
      smallControls: Array.from(node.querySelectorAll('button, select, summary')).filter(item => item.getBoundingClientRect().height < 44).map(item => item.textContent),
      bodySize: parseFloat(getComputedStyle(node).fontSize) };
  });
  expect(result.violations).toEqual([]);
  expect(result.overflow).toBeLessThanOrEqual(1);
  expect(result.smallControls).toEqual([]);
  expect(result.bodySize).toBeGreaterThanOrEqual(14);
}

test('a learner reads, reasons and captures a conditional schedule without moving colony time', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, { notebook: { beekeeper: { claim: 'My claim', reasoning: 'My explanation',
    evidence: 'Earlier field note.', review: { claim: true, reasoning: true, evidence: true } },
    drone: { evidence: 'Drone writing' } } });
  const card = page.locator('[data-beehive-brood-calendar]'), control = card.locator('select');
  const before = await inputs(page);
  await expect(card).toContainText('Next 7 days: 156 scheduled adults; 59 remain for later.');
  await expect(card.locator('[data-brood-calendar-question]')).toHaveAttribute('data-brood-calendar-question', '6–8');
  await control.focus(); await page.keyboard.press('End');
  await expect(control).toHaveValue('7');
  await expect(card.locator('[data-brood-reading-workers]')).toHaveText('29');
  await control.selectOption('4');
  await expect(card.locator('[data-brood-reading-workers]')).toHaveText('100');
  await expect(card.locator('[data-brood-reading-drones]')).toHaveText('12');
  const table = card.locator('[data-brood-calendar-table]');
  await table.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(table).toHaveAttribute('open', '');
  await expect(table.locator('tbody tr')).toHaveCount(7);
  await expect(table.locator('tbody tr').nth(3).locator('[data-brood-table-count]')).toHaveText(['100', '12', '112']);
  await page.keyboard.press('Enter');
  const reasoning = card.locator('[data-brood-calendar-reasoning]');
  await reasoning.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(reasoning).toContainText('not a forecast of net growth or forager numbers');
  await page.keyboard.press('Enter');
  const model = card.locator('[data-brood-calendar-model]');
  await model.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(model).toContainText('distributed across age groups as a model assumption');
  await page.keyboard.press('Enter');
  expect(await inputs(page)).toEqual(before);
  await accessible(page);
  await card.screenshot({ path: testInfo.outputPath('brood-calendar-mobile-light.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await accessible(page);
  await card.screenshot({ path: testInfo.outputPath('brood-calendar-mobile-dark.png') });
  const save = card.locator('[data-brood-calendar-evidence]');
  await save.focus(); await page.keyboard.press('Enter');
  await expect(save).toBeDisabled();
  await expect(card.locator('#bee-brood-calendar-evidence-hint')).toContainText('already in your evidence');
  const writing = await page.evaluate(() => (window as any).__toolData.beehive.notebook);
  expect(writing.beekeeper.evidence).toContain('Earlier field note.\nConditional brood schedule read on Day 60');
  expect(writing.beekeeper.evidence).toContain('Day 64 (+4) has 100 workers and 12 drones');
  expect(writing.beekeeper.review).toEqual({ claim: true, reasoning: true, evidence: false });
  expect(writing.beekeeper.claim).toBe('My claim'); expect(writing.drone.evidence).toBe('Drone writing');
  expect(await inputs(page)).toEqual(before);
  // Grade changes adapt the task without altering the stored age groups.
  await page.evaluate(() => { const w = window as any; w.__ctx.gradeLevel = '11th Grade'; w.__rerender(); });
  await expect(card.locator('[data-brood-calendar-question]')).toContainText('expected lag');
  expect(await inputs(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test('large counts stay readable in a narrow desktop panel, enlarged text and forced colors', async ({ page }, testInfo) => {
  const workers = Array(21).fill(0), drones = Array(24).fill(0);
  workers[0] = 120000; workers[3] = 110000; workers[6] = 90000;
  drones[0] = 50000; drones[3] = 30000; drones[6] = 100000;
  await mount(page, { brood: 500000, broodCohorts: { schemaVersion: 1, workers, drones } });
  await page.setViewportSize({ width: 1280, height: 950 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '340px'; });
  const before = await inputs(page), card = page.locator('[data-beehive-brood-calendar]');
  await accessible(page);
  await card.locator('[data-brood-calendar-table] summary').click();
  await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
  await accessible(page);
  const numberLayout = await card.evaluate(node => {
    const values = Array.from(node.querySelectorAll('.bee-brood-count,[data-brood-table-count],.bee-brood-reading dd'));
    return { wrapped: values.filter(item => item.getBoundingClientRect().height > parseFloat(getComputedStyle(item).lineHeight) + 1).map(item => item.textContent),
      chart: getComputedStyle(node.querySelector('.bee-brood-bars')!).display,
      captionWidth: node.querySelector('caption')!.getBoundingClientRect().width,
      tableWidth: node.querySelector('table')!.getBoundingClientRect().width,
      readingColumns: getComputedStyle(node.querySelector('.bee-brood-reading dl')!).gridTemplateColumns.split(' ').length };
  });
  expect(numberLayout.wrapped).toEqual([]);
  expect(numberLayout.chart).toBe('block');
  expect(numberLayout.readingColumns).toBe(1);
  expect(numberLayout.captionWidth).toBeGreaterThanOrEqual(numberLayout.tableWidth - 1);
  await card.screenshot({ path: testInfo.outputPath('brood-calendar-large-text.png') });
  await page.emulateMedia({ forcedColors: 'active' });
  const select = card.locator('select'); await select.focus();
  expect(await select.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
  const pattern = await card.locator('.bee-brood-stack .bee-brood-drone').first().evaluate(node => getComputedStyle(node).borderStyle);
  expect(pattern).toBe('dashed');
  expect(await inputs(page)).toEqual(before);
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { document.documentElement.style.fontSize = '16px'; document.getElementById('wrap')!.style.width = '100%'; });
  await accessible(page);
  await card.screenshot({ path: testInfo.outputPath('brood-calendar-desktop.png') });
});

test('missing age groups, an empty schedule and a full notebook have honest distinct states', async ({ page }) => {
  await mount(page, { broodCohorts: null });
  const card = page.locator('[data-beehive-brood-calendar]');
  await expect(card).toHaveAttribute('data-brood-calendar-state', 'unavailable');
  await expect(card.locator('[data-brood-calendar-unavailable]')).toContainText('emergence days cannot be read from that total alone');
  await expect(card.locator('select')).toHaveCount(0);
  await accessible(page);
  await harness.destroy(page);
  await mount(page, { brood: 0, broodCohorts: { schemaVersion: 1, workers: Array(21).fill(0), drones: Array(24).fill(0) },
    notebook: { beekeeper: { evidence: 'x'.repeat(1200) } } });
  await expect(card).toHaveAttribute('data-brood-calendar-state', 'available');
  await expect(card.locator('[data-brood-calendar-empty]')).toContainText('No brood is recorded');
  await expect(card.locator('[data-brood-calendar-evidence]')).toBeDisabled();
  await expect(card.locator('#bee-brood-calendar-evidence-hint')).toContainText('Make room for');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook.beekeeper.evidence)).toBe('x'.repeat(1200));
  await accessible(page);
});
