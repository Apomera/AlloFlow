import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, width: 320, height: 950, layout: 'document' });
test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ viewport: { width: 320, height: 950 }, reducedMotion: 'reduce', hasTouch: true, video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, overrides: any = {}, grade = '7th Grade') {
  await page.addInitScript(() => {
    const w = window as any; w.__RR_TEST_EXPORTS__ = {}; w.__thermoCanvasLabels = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text: string, ...args: any[]) {
      if (typeof text === 'string' && text.startsWith('Trial:')) w.__thermoCanvasLabels.push(text);
      return original.apply(this, [text, ...args] as any);
    };
  });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ overrides, grade }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: { ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: 'beekeeper', beeView: 'thermo', discoveryLesson: 'thermo', tutorialDone: true,
      soundOn: false, motionPaused: true, day: 60, ...overrides }, otherTool: { retained: true } }));
    w.__ctx.gradeLevel = grade; w.__rerender(); document.getElementById('wrap')!.style.width = '100%';
  }, { overrides, grade });
  await expect(page.locator('[data-beehive-thermoregulation]')).toBeVisible();
}
async function simulation(page: Page, omitDiscovery = false) {
  return page.evaluate(omitDiscovery => {
    const { thermHunt, ...colony } = (window as any).__toolData.beehive;
    if (omitDiscovery) { delete colony.discoveryRecords; delete colony.notebook; }
    return { colony, otherTool: (window as any).__toolData.otherTool };
  }, omitDiscovery);
}
async function setRange(page: Page, key: string, value: number) {
  await page.locator('#th-' + key).evaluate((node: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}
async function accessible(page: Page, fullPage = true) {
  const result = await page.evaluate(async () => {
    const node = document.querySelector('[data-beehive-thermoregulation]')!;
    const audit = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return {
      violations: audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: node.scrollWidth - node.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      smallTargets: Array.from(node.querySelectorAll('button,input[type="range"],summary,select,a')).filter(n => n.getBoundingClientRect().height > 0 && n.getBoundingClientRect().height < 44).map(n => n.textContent),
      scaleWidth: node.querySelector('svg')!.getBoundingClientRect().width
    };
  });
  expect(result.violations).toEqual([]); expect(result.overflow).toBeLessThanOrEqual(1);
  if (fullPage) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.smallTargets).toEqual([]); expect(result.scaleWidth).toBeGreaterThan(180);
}

test('matches default canvas labels and supports a controlled trial by keyboard and touch', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page); const lab = page.locator('[data-beehive-thermoregulation]'), before = await simulation(page);
  await expect(lab.locator('[data-thermo-reading]')).toHaveText('29.6 °C');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.thermHunt)).toBeUndefined();
  await expect.poll(() => page.evaluate(() => (window as any).__thermoCanvasLabels.at(-1))).toContain('brood ≈ 29.6°C');
  const canvas = page.locator('[data-beehive-canvas]'), initialPixels = await canvas.evaluate((n: HTMLCanvasElement) => n.toDataURL());
  await lab.getByRole('button', { name: 'Log current trial', exact: true }).focus(); await page.keyboard.press('Enter');
  const baseline = await page.evaluate(() => (window as any).__toolData.beehive.thermHunt.comparisonBaseline);
  await lab.locator('#th-beesFanning').focus(); await page.keyboard.press('ArrowRight');
  await expect(lab.locator('#th-beesFanning')).toHaveValue('40'); await expect(lab.locator('[data-thermo-reading]')).toHaveText('29.2 °C');
  await expect(lab.locator('[data-thermo-comparison]')).toHaveAttribute('data-thermo-comparison', 'single');
  await expect(lab.locator('[data-thermo-comparison]')).toContainText('Only fanning bees changed');
  await expect(lab.locator('[data-thermo-delta="temperature"]')).toContainText('-0.4 °C');
  await expect.poll(() => page.evaluate(() => (window as any).__thermoCanvasLabels.at(-1))).toContain('brood ≈ 29.2°C');
  await expect.poll(() => canvas.evaluate((n: HTMLCanvasElement) => n.toDataURL())).not.toBe(initialPixels);
  await lab.getByRole('button', { name: 'Log current trial', exact: true }).tap();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.thermHunt.comparisonBaseline)).toEqual(baseline);
  expect(await simulation(page)).toEqual(before); await accessible(page);
  await lab.screenshot({ path: testInfo.outputPath('thermo-mobile-light.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await accessible(page); await lab.screenshot({ path: testInfo.outputPath('thermo-mobile-dark.png') });
  expect(errors).toEqual([]);
});

test('captures and saves a temperature comparison without later controls rewriting its evidence', async ({ page }) => {
  await mount(page, { notebook: { beekeeper: { claim: 'Original colony claim', reasoning: 'Original reasoning' } } });
  const lab = page.locator('[data-beehive-thermoregulation]'), card = page.locator('[data-beehive-discovery]'), before = await simulation(page, true);
  await card.getByRole('radio', { name: 'Fanning to move air', exact: true }).check();
  await card.getByRole('button', { name: 'Check my thinking', exact: true }).click();
  await card.getByRole('button', { name: 'Capture observation', exact: true }).click();
  await lab.locator('#th-heaterBees').focus(); await page.keyboard.press('ArrowRight');
  await expect(lab.locator('[data-thermo-reading]')).toHaveText('30.5 °C');
  await page.getByRole('button', { name: 'Record your discovery', exact: false }).click();
  await expect(page.locator('#bee-discovery-title')).toBeFocused();
  await card.getByRole('button', { name: 'Compare now', exact: true }).click();
  await expect(card.locator('[data-discovery-feedback]')).toHaveAttribute('data-discovery-feedback', 'supported');
  const note = 'With outside and fanning fixed, 100 more heater bees added 0.9 degrees in this classroom model.';
  await card.getByRole('textbox').fill(note); await card.getByRole('button', { name: 'Save discovery', exact: true }).click();
  const saved = await page.evaluate(() => (window as any).__toolData.beehive.notebook.discoveries.thermo);
  expect(saved.comparisonEvidence.rows.find((r: any) => r.id === 'temperature')).toMatchObject({ before: 29.6, after: 30.5, delta: .9 });
  await setRange(page, 'beesFanning', 200); await lab.getByRole('button', { name: 'Reset conditions', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook.discoveries.thermo)).toEqual(saved);
  expect(await simulation(page, true)).toEqual(before);
  await page.locator('#beehive-notebook-summary').click();
  await expect(page.locator('[data-discovery-notebook-records]')).toContainText(note);
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook.beekeeper.claim)).toBe('Original colony claim');
});

test('keeps older-model notes and results visible while requiring a verifiable baseline', async ({ page }) => {
  const old = { o: 20, f: 30, b: 5000, t: '22.8', st: 'chilled' };
  await mount(page, { focusLayout: false, thermHunt: { outsideC: 20, beesFanning: 30, broodCount: 5000,
    hypothesis: 'My earlier hypothesis', understood: true, explanation: 'My earlier explanation', log: [old], teacher: { note: 'Retain' } } });
  const lab = page.locator('[data-beehive-thermoregulation]'), before = await simulation(page);
  await expect(lab.locator('[data-thermo-reading]')).toHaveText('29.6 °C');
  await expect(lab.locator('.bee-thermo-log')).toContainText('5,000 brood (older model)');
  await expect(lab.locator('[data-thermo-comparison]')).toContainText('different model');
  await lab.getByRole('button', { name: 'Log current trial', exact: true }).click();
  await expect(lab.locator('[data-thermo-comparison]')).toHaveAttribute('data-thermo-comparison', 'unchanged');
  await lab.locator('#beehive-thermo-baseline').selectOption('0');
  await expect(lab.locator('[data-thermo-comparison]')).toHaveAttribute('data-thermo-comparison', 'unavailable');
  await setRange(page, 'heaterBees', 3000); await lab.getByRole('button', { name: 'Reset conditions', exact: true }).click();
  await expect(lab.locator('#beehive-thermo-hypothesis')).toHaveValue('My earlier hypothesis');
  await expect(lab.locator('#beehive-thermo-explanation')).toHaveValue('My earlier explanation');
  const saved = await page.evaluate(() => (window as any).__toolData.beehive.thermHunt);
  expect(saved.log[0]).toEqual(old); expect(saved.teacher).toEqual({ note: 'Retain' }); expect(saved.comparisonBaseline).toEqual(old);
  expect(await simulation(page)).toEqual(before); await accessible(page);
});

test('shows the heat calculation, a fixed scale and isolated cooling in a full-width desktop lab', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await mount(page, { thermHunt: { outsideC: 40, heaterBees: 1000, beesFanning: 0 } }, '11th Grade');
  const lab = page.locator('[data-beehive-thermoregulation]');
  expect((await lab.boundingBox())!.width).toBeGreaterThan(700);
  expect(await lab.locator('.bee-thermo-budget').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(3);
  await expect(lab.locator('[data-thermo-reading]')).toHaveText('49.0 °C');
  await lab.getByRole('button', { name: 'Log current trial', exact: true }).click();
  const target = await lab.locator('[data-thermo-target-band]').getAttribute('x');
  await setRange(page, 'beesFanning', 350); await expect(lab.locator('[data-thermo-reading]')).toHaveText('35.0 °C');
  await expect(lab.locator('#beehive-thermo-output')).toHaveAttribute('data-thermo-state', 'optimal');
  await expect(lab.locator('[data-term="heating"] dd strong')).toHaveText('+9.0 °C');
  await expect(lab.locator('[data-term="cooling"] dd strong')).toHaveText('−14.0 °C');
  await expect(lab.locator('[data-thermo-delta="temperature"]')).toContainText('-14.0 °C');
  expect(await lab.locator('[data-thermo-target-band]').getAttribute('x')).toBe(target);
  await lab.getByText('Plan your explanation', { exact: true }).click();
  await expect(lab.locator('.bee-thermo-prompt')).toContainText('ΔT');
  await lab.locator('[data-thermo-model-note] > summary').click();
  await expect(lab.locator('[data-thermo-model-note]')).toContainText('teaching assumptions');
  await accessible(page); await lab.screenshot({ path: testInfo.outputPath('thermo-desktop.png') });
});

test('flags several changed inputs and retains a baseline after eight newer logged trials', async ({ page }) => {
  await mount(page); const lab = page.locator('[data-beehive-thermoregulation]');
  await lab.getByRole('button', { name: 'Log current trial', exact: true }).click();
  const baseline = await page.evaluate(() => (window as any).__toolData.beehive.thermHunt.comparisonBaseline);
  await setRange(page, 'heaterBees', 1400); await setRange(page, 'beesFanning', 75);
  await expect(lab.locator('[data-thermo-comparison]')).toHaveAttribute('data-thermo-comparison', 'multiple');
  await expect(lab.locator('[data-thermo-comparison]')).toContainText('cannot isolate one input');
  for (let n = 0; n < 9; n++) {
    await setRange(page, 'outsideC', 21 + n); await lab.getByRole('button', { name: 'Log current trial', exact: true }).click();
  }
  const saved = await page.evaluate(() => (window as any).__toolData.beehive.thermHunt);
  expect(saved.log).toHaveLength(8); expect(saved.comparisonBaseline).toEqual(baseline);
  await expect(lab.locator('#beehive-thermo-baseline')).toHaveValue('saved');
  await expect(lab.locator('#beehive-thermo-baseline')).toContainText('Earlier baseline · 29.6 °C');
});

test('keeps large text and forced colors readable in a narrow desktop panel', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); await mount(page);
  const lab = page.locator('[data-beehive-thermoregulation]');
  await lab.getByRole('button', { name: 'Log current trial', exact: true }).click();
  await lab.evaluate(node => { (node as HTMLElement).style.width = '340px'; (node as HTMLElement).style.maxWidth = '100%'; document.documentElement.style.fontSize = '32px'; });
  await accessible(page, false);
  expect(await lab.locator('.bee-thermo-budget').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(1);
  expect(await lab.locator('.bee-thermo-values').first().evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(1);
  await lab.screenshot({ path: testInfo.outputPath('thermo-large-text.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await accessible(page, false); await page.emulateMedia({ forcedColors: 'active' });
  await accessible(page, false);
  expect(await lab.locator('[data-thermo-target-band]').evaluate(n => getComputedStyle(n).stroke)).not.toBe('none');
  await lab.screenshot({ path: testInfo.outputPath('thermo-forced-colors.png') });
});
