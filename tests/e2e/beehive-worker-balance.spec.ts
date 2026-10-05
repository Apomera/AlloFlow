import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, width: 320, height: 950, layout: 'document' });
test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ viewport: { width: 320, height: 950 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, overrides: any = {}, grade = '7th Grade') {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ overrides, grade }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: { ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: 'beekeeper', beeView: 'lifecycle', tutorialDone: true, soundOn: false,
      motionPaused: true, day: 60, ...overrides }, otherTool: { retained: true } }));
    w.__ctx.gradeLevel = grade; w.__rerender();
  }, { overrides, grade });
  await expect(page.locator('[data-worker-balance-lab]')).toBeVisible();
}
async function inputs(page: Page) {
  return page.evaluate(() => { const { notebook, ...colony } = (window as any).__toolData.beehive;
    return { colony, otherTool: (window as any).__toolData.otherTool }; });
}
async function openLab(page: Page) {
  const summary = page.locator('[data-worker-balance-open] > summary');
  await summary.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-worker-balance-open]')).toHaveAttribute('open', '');
}
async function accessible(page: Page) {
  const result = await page.evaluate(async () => {
    const node = document.querySelector('[data-worker-balance-lab]')!;
    const axe = await (window as any).axe.run(node, { runOnly: { type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return { violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: node.scrollWidth - node.clientWidth,
      smallTargets: Array.from(node.querySelectorAll('button,select,summary,.bee-balance-choice')).filter(item => item.getBoundingClientRect().height > 0 && item.getBoundingClientRect().height < 44).map(item => item.textContent),
      wrappedCounts: Array.from(node.querySelectorAll('.bee-balance-flows dd')).filter(item => item.getBoundingClientRect().height > parseFloat(getComputedStyle(item).lineHeight) + 1).map(item => item.textContent) };
  });
  expect(result.violations).toEqual([]); expect(result.overflow).toBeLessThanOrEqual(1);
  expect(result.smallTargets).toEqual([]); expect(result.wrappedCounts).toEqual([]);
}

test('a learner predicts, checks and explains a hypothetical balance with keyboard controls', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page, { notebook: { beekeeper: { claim: 'My claim', reasoning: 'My reasoning', evidence: 'My observed readings.',
    review: { claim: true, reasoning: true, evidence: true } }, drone: { evidence: 'Drone writing' } } });
  const lab = page.locator('[data-worker-balance-lab]'), before = await inputs(page);
  await expect(lab.locator('[data-worker-balance-open]')).not.toHaveAttribute('open');
  await openLab(page);
  await expect(lab.locator('[data-worker-balance-result]')).toHaveCount(0);
  await expect(lab.locator('[data-worker-balance-check]')).toBeDisabled();
  const predicted = lab.locator('input[value="increase"]');
  await predicted.focus(); await page.keyboard.press('Space');
  await expect(predicted).toBeChecked();
  await expect(lab.locator('[data-worker-balance-result]')).toHaveCount(0);
  await lab.locator('[data-worker-balance-check]').focus(); await page.keyboard.press('Enter');
  await expect(lab.locator('[data-worker-balance-result]')).toContainText('Revise your prediction using both flows');
  await expect(lab.locator('[data-worker-balance-equation]')).toHaveText('100 + 20 − 40 = 80');
  await expect(lab.locator('[data-worker-balance-net]')).toContainText('-20');
  await expect(lab.locator('[data-worker-balance-evidence]')).toBeDisabled();
  await lab.locator('textarea').fill('More adult workers were lost than emerged.');
  await accessible(page);
  await lab.screenshot({ path: testInfo.outputPath('worker-balance-mobile-light.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await accessible(page);
  await lab.screenshot({ path: testInfo.outputPath('worker-balance-mobile-dark.png') });
  await lab.locator('[data-worker-balance-evidence]').focus(); await page.keyboard.press('Enter');
  await expect(lab.locator('[data-worker-balance-evidence]')).toBeDisabled();
  const saved = await page.evaluate(() => (window as any).__toolData.beehive.notebook);
  expect(saved.beekeeper.evidence).toContain('My observed readings.\nHypothetical worker balance practice (not a colony observation)');
  expect(saved.beekeeper.evidence).toContain('I predicted the count would increase; the arithmetic shows it would decrease');
  expect(saved.beekeeper.review).toEqual({ claim: true, reasoning: true, evidence: false });
  expect(saved.beekeeper.claim).toBe('My claim'); expect(saved.drone.evidence).toBe('Drone writing');
  expect(await inputs(page)).toEqual(before); expect(errors).toEqual([]);
});

test('changed flows clear the old answer and preserve the explanation across grade changes', async ({ page }) => {
  await mount(page); await openLab(page);
  const lab = page.locator('[data-worker-balance-lab]'), before = await inputs(page);
  await lab.locator('input[value="decrease"]').check(); await lab.locator('[data-worker-balance-check]').click();
  await lab.locator('textarea').fill('Compare both arrivals and losses.');
  await lab.locator('[data-worker-balance-flow="losses"]').selectOption('2');
  await expect(lab.locator('[data-worker-balance-result]')).toHaveCount(0);
  await expect(lab.locator('input:checked')).toHaveCount(0);
  await expect(lab.locator('[data-worker-balance-check]')).toBeDisabled();
  await lab.locator('input[value="same"]').check(); await lab.locator('[data-worker-balance-check]').click();
  await expect(lab.locator('[data-worker-balance-equation]')).toHaveText('100 + 20 − 20 = 100');
  await expect(lab.locator('textarea')).toHaveValue('Compare both arrivals and losses.');
  await page.evaluate(() => { const w = window as any; w.__ctx.gradeLevel = 'Kindergarten'; w.__rerender(); });
  await expect(lab).toContainText('starts with 10 adult workers');
  await expect(lab.locator('[data-worker-balance-result]')).toHaveCount(0);
  await lab.locator('input[value="same"]').check(); await lab.locator('[data-worker-balance-check]').click();
  await expect(lab.locator('[data-worker-balance-equation]')).toHaveText('10 + 3 − 3 = 10');
  await expect(lab.locator('textarea')).toHaveValue('Compare both arrivals and losses.');
  await accessible(page); expect(await inputs(page)).toEqual(before);
});

test('a full notebook and enlarged-text desktop panel keep the result clear and writing intact', async ({ page }, testInfo) => {
  await mount(page, { notebook: { beekeeper: { evidence: 'x'.repeat(1200) } } }, '11th Grade');
  await openLab(page); const lab = page.locator('[data-worker-balance-lab]'), before = await inputs(page);
  await lab.locator('input[value="decrease"]').check(); await lab.locator('[data-worker-balance-check]').click();
  await expect(lab.locator('[data-worker-balance-net]')).toContainText('-20%');
  await lab.locator('textarea').fill('Losses exceed arrivals; other flows are not modeled in this practice.');
  await expect(lab.locator('[data-worker-balance-evidence]')).toBeDisabled();
  await expect(lab.locator('#bee-worker-balance-evidence-hint')).toContainText('Make room for');
  await page.setViewportSize({ width: 1280, height: 950 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '340px'; document.documentElement.style.fontSize = '24px'; });
  await accessible(page);
  await lab.screenshot({ path: testInfo.outputPath('worker-balance-large-text.png') });
  await page.emulateMedia({ forcedColors: 'active' });
  const radio = lab.locator('input[value="decrease"]'); await radio.focus();
  expect(await radio.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
  expect(await lab.locator('.bee-balance-total-track[data-after="true"] > span').evaluate(node => getComputedStyle(node).borderStyle)).toBe('dashed');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.documentElement.style.fontSize = '16px'; });
  await accessible(page); await lab.screenshot({ path: testInfo.outputPath('worker-balance-desktop.png') });
  expect(await inputs(page)).toEqual(before);
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook.beekeeper.evidence)).toBe('x'.repeat(1200));
});
