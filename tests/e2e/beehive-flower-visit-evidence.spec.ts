import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, width: 320, height: 950, layout: 'document' });
test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ viewport: { width: 320, height: 950 }, reducedMotion: 'reduce', hasTouch: true, video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const reading = (day: number, visits: number) => ({ schemaVersion: 1, kind: 'flower-visits', day, visits,
  simulationSeed: 777, runSerial: 2, modelVersion: 'colony-daily-1.2', seededFromDay: 0 });
const savedStudy = (before = 2000, after = 3500) => ({ baseline: reading(3, before),
  comparison: { schemaVersion: 1, before: reading(3, before), after: reading(5, after) },
  explanation: 'Visits show modeled activity, not seed success.', teacher: { retained: true } });

async function mount(page: Page, overrides: any = {}, grade = '7th Grade') {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ overrides, grade }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: { ...BH.bhCreateNewColonyState(777, 2, 0),
      viewMode: 'beekeeper', beeView: 'pollination', discoveryLesson: 'pollination', tutorialDone: true,
      soundOn: false, motionPaused: true, day: 3, totalFlowerVisits: 2000, ...overrides }, otherTool: { retained: true } }));
    w.__ctx.gradeLevel = grade; w.__rerender(); document.getElementById('wrap')!.style.width = '100%';
  }, { overrides, grade });
  await expect(page.locator('[data-flower-visit-study]')).toBeVisible();
}
async function colony(page: Page) {
  return page.evaluate(() => {
    const { flowerVisitStudy, notebook, ...state } = (window as any).__toolData.beehive;
    return { state, otherTool: (window as any).__toolData.otherTool };
  });
}
async function patch(page: Page, overrides: any) {
  await page.evaluate(overrides => { const w = window as any; Object.assign(w.__toolData.beehive, overrides); w.__rerender(); }, overrides);
}
async function accessible(page: Page, fullPage = true) {
  const result = await page.evaluate(async () => {
    const node = document.querySelector('[data-flower-visit-study]')!;
    const audit = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return {
      violations: audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: node.scrollWidth - node.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      smallTargets: Array.from(node.querySelectorAll('button,summary,a')).filter(n => n.getBoundingClientRect().height > 0 && (n.getBoundingClientRect().height < 44 || n.getBoundingClientRect().width < 44)).map(n => n.textContent)
    };
  });
  expect(result.violations).toEqual([]); expect(result.overflow).toBeLessThanOrEqual(1);
  if (fullPage) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.smallTargets).toEqual([]);
}

test('captures a real day advance, freezes by keyboard and appends fixed evidence at 320px', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  const notebook = { beekeeper: { claim: 'Original claim', reasoning: 'Original reasoning', evidence: 'Earlier evidence.', review: { claim: true, evidence: true } }, queen: { evidence: 'Keep queen note' }, synthesis: 'Keep synthesis' };
  await mount(page, { notebook }); const panel = page.locator('[data-flower-visit-study]'), before = await colony(page);
  await expect(panel.locator('output')).toHaveText('2,000 visits');
  await panel.getByRole('button', { name: 'Save starting reading', exact: true }).focus(); await page.keyboard.press('Enter');
  expect(await colony(page)).toEqual(before); await expect(panel.getByRole('button', { name: 'Freeze current interval', exact: true })).toBeDisabled();
  await page.locator('[data-discovery-advance="true"]').click();
  const advanced = await colony(page);
  expect(advanced.state.day).toBe(4); expect(advanced.state.totalFlowerVisits).toBeGreaterThan(2000);
  await panel.getByRole('button', { name: 'Freeze current interval', exact: true }).focus(); await page.keyboard.press('Enter');
  expect(await colony(page)).toEqual(advanced);
  await expect(panel.locator('[data-flower-visit-value="added"]')).toContainText((advanced.state.totalFlowerVisits - 2000).toLocaleString() + ' visits');
  const saved = await page.evaluate(() => (window as any).__toolData.beehive.flowerVisitStudy);
  await panel.getByRole('textbox', { name: 'My explanation', exact: true }).fill('The model added visits in one day. This does not count pollen transfers or seeds.');
  await panel.getByRole('button', { name: 'Add interval to notebook', exact: true }).tap();
  const added = await page.evaluate(() => (window as any).__toolData.beehive.notebook);
  expect(added.beekeeper.evidence).toContain('Day 3: 2000 cumulative visits; frozen Day 4: ' + advanced.state.totalFlowerVisits);
  expect(added.beekeeper.evidence.startsWith('Earlier evidence.\n')).toBe(true);
  expect(added.beekeeper).toMatchObject({ claim: 'Original claim', reasoning: 'Original reasoning', review: { claim: true, evidence: false } });
  expect(added.queen).toEqual(notebook.queen); expect(added.synthesis).toBe(notebook.synthesis);
  await expect(panel.getByRole('button', { name: 'Already in notebook', exact: true })).toBeDisabled();
  await patch(page, { day: 7, totalFlowerVisits: advanced.state.totalFlowerVisits + 2000 });
  expect(await page.evaluate(() => (window as any).__toolData.beehive.flowerVisitStudy.comparison)).toEqual(saved.comparison);
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook)).toEqual(added);
  await accessible(page); await panel.screenshot({ path: testInfo.outputPath('visits-mobile-light.png') });
  expect(errors).toEqual([]);
});

test('preserves saved evidence across a new run and asks for a matching starting reading', async ({ page }) => {
  const study = savedStudy(), notebook = { beekeeper: { evidence: 'Earlier notes' } };
  await mount(page, { flowerVisitStudy: study, notebook, experimentRunSerial: 3, day: 1, totalFlowerVisits: 200 });
  const panel = page.locator('[data-flower-visit-study]');
  await expect(panel.locator('[data-flower-visit-notice]')).toContainText('another colony run');
  await expect(panel.locator('[data-flower-visit-comparison]')).toContainText('Run 2');
  await expect(panel.getByRole('button', { name: 'Freeze current interval', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.flowerVisitStudy)).toEqual(study);
  await panel.getByRole('button', { name: 'Replace starting reading', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.flowerVisitStudy)).toMatchObject({ baseline: { runSerial: 3, day: 1, visits: 200 }, comparison: null, explanation: study.explanation, teacher: study.teacher });
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook)).toEqual(notebook);
});

test('retains unsupported saved pairs and keeps unreadable counters distinct from zero', async ({ page }) => {
  const study = { baseline: { schemaVersion: 2, future: 'Preserve' }, comparison: { schemaVersion: 2, future: 'Preserve' }, explanation: 'Keep my older draft' };
  await mount(page, { flowerVisitStudy: study, totalFlowerVisits: '2000' }); const panel = page.locator('[data-flower-visit-study]');
  await expect(panel.locator('output')).toHaveText('Unavailable');
  await expect(panel.getByRole('button', { name: 'Save starting reading', exact: true })).toBeDisabled();
  await expect(panel.getByRole('button', { name: 'Freeze current interval', exact: true })).toBeDisabled();
  await expect(panel).toContainText('saved pair cannot be verified');
  await expect(panel.getByRole('textbox')).toHaveValue('Keep my older draft');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.flowerVisitStudy)).toEqual(study);
  await accessible(page);
});

test('uses one bar scale and three evidence columns on a wide desktop, with source and model limits', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await mount(page, { day: 5, totalFlowerVisits: 3500, flowerVisitStudy: savedStudy() }, '11th Grade'); const panel = page.locator('[data-flower-visit-study]');
  expect((await panel.boundingBox())!.width).toBeGreaterThan(700);
  for (const selector of ['.bee-visits-path', '.bee-visits-values']) expect(await panel.locator(selector).evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(3);
  const widths = await panel.locator('.bee-visits-track > span').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().width));
  expect(widths[0] / widths[1]).toBeCloseTo(2000 / 3500, 2);
  await expect(panel.locator('[data-flower-visit-mean]')).toContainText('750 visits');
  await panel.getByText('Plan your explanation', { exact: true }).click();
  await expect(panel.locator('[data-flower-visit-grade]')).toContainText('unvisited flowers as controls');
  await panel.getByText('How the counter is calculated', { exact: true }).click();
  await expect(panel).toContainText('illustrative factor of 300'); await expect(panel).toContainText('fixed per-visit ratio');
  await expect(panel.getByRole('link')).toHaveAttribute('href', 'https://besjournals.onlinelibrary.wiley.com/doi/10.1111/2041-210X.12074');
  await accessible(page); await panel.screenshot({ path: testInfo.outputPath('visits-desktop.png') });
});

test('keeps saved readings and grade-appropriate prompts in dark and forced colors at 320px', async ({ page }, testInfo) => {
  const study = savedStudy(); await mount(page, { day: 5, totalFlowerVisits: 3500, flowerVisitStudy: study }, '2nd Grade'); const panel = page.locator('[data-flower-visit-study]');
  await expect(panel.locator('[data-flower-visit-mean]')).toHaveCount(0);
  await expect(panel.locator('[data-flower-visit-grade]')).toContainText('stigma');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await accessible(page); await panel.screenshot({ path: testInfo.outputPath('visits-mobile-dark.png') });
  await page.emulateMedia({ forcedColors: 'active' }); await accessible(page);
  const colors = await panel.getByRole('button', { name: 'Add interval to notebook', exact: true }).evaluate(n => ({ ink: getComputedStyle(n).color, paper: getComputedStyle(n).backgroundColor }));
  expect(colors.ink).not.toBe(colors.paper);
  expect(await panel.locator('.bee-visits-track[data-after="true"] > span').evaluate(n => getComputedStyle(n).borderStyle)).toBe('dashed');
  await panel.screenshot({ path: testInfo.outputPath('visits-forced-colors.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.gradeLevel = '11th Grade'; w.__rerender(); });
  await expect(panel.locator('[data-flower-visit-mean]')).toContainText('750 visits');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.flowerVisitStudy)).toEqual(study);
});

test('does not draw growth for zero counts, wraps doubled text and preserves full notebook writing', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); const study = savedStudy(0, 0), notebook = { beekeeper: { evidence: 'x'.repeat(1200), claim: 'Keep', reasoning: 'Keep' } };
  await mount(page, { day: 5, totalFlowerVisits: 0, flowerVisitStudy: study, notebook }); const panel = page.locator('[data-flower-visit-study]');
  await panel.evaluate(node => { (node as HTMLElement).style.width = '340px'; (node as HTMLElement).style.maxWidth = '100%'; document.documentElement.style.fontSize = '32px'; });
  await expect(panel).toContainText('No visits were added');
  expect(await panel.locator('.bee-visits-track > span').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().width))).toEqual([0, 0]);
  expect(await panel.locator('.bee-visits-path').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(1);
  await expect(panel.getByRole('button', { name: 'Add interval to notebook', exact: true })).toBeDisabled();
  await expect(panel.locator('[data-flower-visit-notebook]')).toHaveAttribute('data-flower-visit-notebook', 'full');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook)).toEqual(notebook);
  await accessible(page, false); await panel.screenshot({ path: testInfo.outputPath('visits-large-text-zero.png') });
});

test('exports the actual cumulative count and routes to the flower case without changing colony biology', async ({ page }) => {
  await mount(page, { focusLayout: false }); const panel = page.locator('[data-flower-visit-study]');
  await expect(panel).toHaveCount(1);
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text: string) => { (window as any).__visitReport = text; } } }); });
  await page.getByRole('button', { name: 'Export colony report', exact: true }).click();
  const report = await page.evaluate(() => (window as any).__visitReport);
  expect(report).toContain('Modeled flower visits (cumulative):** 2,000'); expect(report.includes('apple trees')).toBe(false);
  expect(report).toContain('does not measure pollen deposition, fruit yield, distance or economic value');
  const before = await colony(page); await panel.getByRole('button', { name: 'Try pollen transfer activity', exact: true }).click();
  await expect(page.locator('#bee-discovery-hands-on')).toBeFocused(); await expect(panel).toHaveCount(1);
  const after = await colony(page); expect(after.state.workers).toBe(before.state.workers); expect(after.state.day).toBe(before.state.day); expect(after.state.totalFlowerVisits).toBe(before.state.totalFlowerVisits); expect(after.otherTool).toEqual(before.otherTool);
});
