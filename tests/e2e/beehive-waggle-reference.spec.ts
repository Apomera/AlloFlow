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
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ overrides, grade }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: { ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: 'beekeeper', beeView: 'waggle', discoveryLesson: 'waggle', tutorialDone: true,
      soundOn: false, motionPaused: true, day: 60, ...overrides }, otherTool: { retained: true } }));
    w.__ctx.gradeLevel = grade; w.__rerender();
    document.getElementById('wrap')!.style.width = '100%';
  }, { overrides, grade });
  await expect(page.locator('[data-waggle-lab]')).toBeVisible();
}
async function simulation(page: Page, omitDiscovery = false) {
  return page.evaluate(omitDiscovery => {
    const { waggleLab, ...colony } = (window as any).__toolData.beehive;
    if (omitDiscovery) { delete colony.discoveryRecords; delete colony.notebook; }
    return { colony, otherTool: (window as any).__toolData.otherTool };
  }, omitDiscovery);
}
async function accessible(page: Page) {
  const result = await page.evaluate(async () => {
    const node = document.querySelector('[data-waggle-lab]')!;
    const audit = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const svgs = Array.from(node.querySelectorAll('.bee-waggle-dials svg'));
    return {
      violations: audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: node.scrollWidth - node.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      smallTargets: Array.from(node.querySelectorAll('button,input[type="range"],summary,.bee-waggle-choice,a')).filter(n => n.getBoundingClientRect().height > 0 && n.getBoundingClientRect().height < 44).map(n => n.textContent),
      dialWidths: svgs.map(n => n.getBoundingClientRect().width),
      clippedLabels: svgs.flatMap(svg => Array.from(svg.querySelectorAll('text')).filter(label => {
        const a = label.getBoundingClientRect(), b = svg.getBoundingClientRect();
        return a.left < b.left - 1 || a.right > b.right + 1 || a.top < b.top - 1 || a.bottom > b.bottom + 1;
      }).map(n => n.textContent)),
      sunStroke: getComputedStyle(svgs[1].querySelector('g[stroke="var(--bd-sun)"]')!).stroke,
      legendStyle: getComputedStyle(node.querySelector('.bee-waggle-line[data-sun]')!).borderTopStyle
    };
  });
  expect(result.violations).toEqual([]); expect(result.overflow).toBeLessThanOrEqual(1);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.smallTargets).toEqual([]);
  expect(result.clippedLabels).toEqual([]); expect(Math.min(...result.dialWidths)).toBeGreaterThanOrEqual(200);
  expect(result.sunStroke).not.toBe('none'); expect(result.legendStyle).toBe('dashed');
}

test('holds the flowers while keyboard and touch move the sun, including a paused canvas redraw', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page, { waggleLab: { dance: 45, sun: 90, teacherNote: 'Retained', distance: 1200 } });
  const lab = page.locator('[data-waggle-lab]'), before = await simulation(page);
  const food = lab.locator('#bee-waggle-hold-food'); await food.focus(); await page.keyboard.press('Space');
  await expect(food).toBeChecked(); await expect(lab.locator('#bee-waggle-angle')).toBeDisabled();
  const canvas = page.locator('[data-beehive-canvas]');
  await expect.poll(() => canvas.evaluate((n: HTMLCanvasElement) => n.width)).toBeGreaterThan(0);
  const initialImage = await canvas.evaluate((n: HTMLCanvasElement) => n.toDataURL());
  await lab.locator('#bee-waggle-sun').focus(); await page.keyboard.press('ArrowRight');
  await expect(lab.locator('#bee-waggle-sun')).toHaveValue('105');
  await expect(lab.locator('[data-waggle-angle-reading]')).toHaveText('30°');
  await expect(lab.locator('output strong')).toHaveText('135°');
  await expect.poll(() => canvas.evaluate((n: HTMLCanvasElement) => n.toDataURL())).not.toBe(initialImage);
  const demo = await page.evaluate(() => { const w = window as any; return w.__RR_TEST_EXPORTS__.beehive.bhWaggleDemoState(0, w.__toolData.beehive.waggleLab); });
  expect(demo).toMatchObject({ dance: 30, sun: 105, food: 135, source: 'lab' });
  await lab.locator('#bee-waggle-hold-dance').tap(); await expect(lab.locator('#bee-waggle-angle')).toBeEnabled();
  await lab.locator('.bee-waggle-choice').filter({ hasText: 'Food location' }).tap();
  const sun = lab.locator('#bee-waggle-sun'), box = (await sun.boundingBox())!;
  await sun.tap({ position: { x: box.width * .55, y: box.height / 2 } });
  await expect(sun).not.toHaveValue('105'); await expect(lab.locator('output strong')).toHaveText('135°');
  expect(await simulation(page)).toEqual(before);
  await accessible(page); await lab.screenshot({ path: testInfo.outputPath('waggle-mobile-light.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await accessible(page); await lab.screenshot({ path: testInfo.outputPath('waggle-mobile-dark.png') });
  expect(errors).toEqual([]);
});

test('reopens a saved destination, wraps through north and releases the current dance without moving food', async ({ page }) => {
  await mount(page, { waggleLab: { fixedFood: 30, sun: 345, dance: 45, teacherNote: 'Keep me' },
    notebook: { beekeeper: { claim: 'Keep my claim', reasoning: 'Keep my explanation' } } });
  const lab = page.locator('[data-waggle-lab]'), before = await simulation(page), sun = lab.locator('#bee-waggle-sun');
  await expect(lab.locator('#bee-waggle-hold-food')).toBeChecked();
  await sun.focus(); await page.keyboard.press('Home');
  await expect(sun).toHaveValue('0'); await expect(lab.locator('[data-waggle-angle-reading]')).toHaveText('30°');
  await page.keyboard.press('ArrowRight');
  await expect(sun).toHaveValue('15'); await expect(lab.locator('[data-waggle-angle-reading]')).toHaveText('15°');
  await expect(lab.locator('output strong')).toHaveText('30°');
  const savedLab = await page.evaluate(() => (window as any).__toolData.beehive.waggleLab);
  await mount(page, { waggleLab: savedLab, notebook: { beekeeper: { claim: 'Keep my claim', reasoning: 'Keep my explanation' } } });
  await expect(lab.locator('output strong')).toHaveText('30°'); await expect(lab.locator('#bee-waggle-hold-food')).toBeChecked();
  await lab.locator('#bee-waggle-hold-food').focus(); await page.keyboard.press('ArrowLeft');
  await expect(lab.locator('#bee-waggle-hold-dance')).toBeChecked(); await expect(lab.locator('#bee-waggle-angle')).toBeEnabled();
  await sun.focus(); await page.keyboard.press('ArrowRight');
  await expect(lab.locator('output strong')).toHaveText('45°');
  await lab.getByRole('button', { name: 'Reset angles', exact: true }).click();
  await expect(lab.locator('output strong')).toHaveText('135°');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.waggleLab)).toEqual({ dance: 45, sun: 90, teacherNote: 'Keep me' });
  expect(await simulation(page)).toEqual(before);
});

test('captures the fixed-food comparison in the Notebook and preserves it after later adjustments', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await mount(page, { waggleLab: { fixedFood: 135, sun: 90, dance: 45 }, notebook: { beekeeper: { claim: 'My colony claim', reasoning: 'My colony explanation' } } });
  const lab = page.locator('[data-waggle-lab]'), card = page.locator('[data-beehive-discovery]'), before = await simulation(page, true);
  expect((await lab.boundingBox())!.width).toBeGreaterThan(500);
  expect(await lab.locator('.bee-waggle-dials').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(2);
  await card.getByRole('radio', { name: 'Direction relative to the sun', exact: true }).check();
  await card.getByRole('button', { name: 'Check my thinking', exact: true }).click();
  await card.getByRole('button', { name: 'Capture observation', exact: true }).click();
  await lab.locator('#bee-waggle-sun').focus(); await page.keyboard.press('ArrowRight');
  await lab.getByRole('button', { name: 'Record your discovery' }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#bee-discovery-title')).toBeFocused();
  await card.getByRole('button', { name: 'Compare now', exact: true }).click();
  await expect(card.locator('[data-evidence-metric="food"]')).toContainText('No change');
  await expect(card.locator('[data-evidence-metric="sun"]')).toContainText('+15 ° turn');
  await expect(card.locator('[data-evidence-metric="dance"]')).toContainText('-15 ° turn');
  await card.getByRole('textbox').fill('The flowers stayed at 135°. The sun moved 15° clockwise and the comb dance adjusted 15° left.');
  await card.getByRole('button', { name: 'Save discovery', exact: true }).click();
  const captured = await page.evaluate(() => JSON.stringify((window as any).__toolData.beehive.notebook.discoveries.waggle.comparisonEvidence));
  expect(JSON.parse(captured).beforeLabel).toContain('food location fixed');
  await lab.locator('#bee-waggle-sun').focus(); await page.keyboard.press('End');
  await expect(lab.locator('output strong')).toHaveText('135°');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.beehive.notebook.discoveries.waggle.comparisonEvidence))).toBe(captured);
  expect(await simulation(page, true)).toEqual(before);
  await page.locator('#beehive-notebook-summary').click();
  await expect(page.locator('[data-discovery-notebook-records]')).toContainText('Food bearing: 135 → 135 ° (0 °, shortest turn)');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook.beekeeper.claim)).toBe('My colony claim');
  await accessible(page); await lab.screenshot({ path: testInfo.outputPath('waggle-desktop.png') });
});

test('keeps enlarged text, narrow desktop panels, forced colors and the expanded layout readable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await mount(page, { waggleLab: { fixedFood: 135, sun: 90, dance: 45 } }, '11th Grade');
  const lab = page.locator('[data-waggle-lab]'), before = await simulation(page);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '340px'; document.documentElement.style.fontSize = '32px'; });
  await accessible(page);
  await expect(lab.locator('[data-waggle-grade]')).toHaveAttribute('data-waggle-grade', '9–12');
  await lab.screenshot({ path: testInfo.outputPath('waggle-large-text.png') });
  await page.emulateMedia({ forcedColors: 'active' });
  await lab.locator('#bee-waggle-hold-food').focus();
  expect(await lab.locator('#bee-waggle-hold-food').evaluate(n => parseFloat(getComputedStyle(n).outlineWidth))).toBeGreaterThanOrEqual(2);
  await accessible(page); await lab.screenshot({ path: testInfo.outputPath('waggle-forced-colors.png') });
  expect(await simulation(page)).toEqual(before);
  await page.emulateMedia({ forcedColors: 'none' });
  await mount(page, { focusLayout: false, waggleLab: { dance: -30.5, sun: 359 } }, 'Kindergarten');
  await expect(lab).toHaveCount(1); await expect(lab.locator('#bee-waggle-angle')).toHaveValue('-30.5');
  await expect(lab.locator('#bee-waggle-sun')).toHaveValue('359');
  await expect(lab.locator('output strong')).toHaveText('328.5°');
  await expect(lab.locator('[data-waggle-grade]')).toHaveAttribute('data-waggle-grade', 'K–2');
  await accessible(page);
  await lab.getByRole('button', { name: 'Open discovery workspace' }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#bee-discovery-title')).toBeFocused();
  await expect(lab.locator('output strong')).toHaveText('328.5°');
  await accessible(page);
});

test('the initial canvas agrees with the decoder before any settings are saved', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.addInitScript(() => {
    const w = window as any; w.__beeDrawnText = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
      if (this.canvas.hasAttribute('data-beehive-canvas')) {
        w.__beeDrawnText.push(String(text));
        if (w.__beeDrawnText.length > 2000) w.__beeDrawnText.splice(0, 1000);
      }
      if (maxWidth === undefined) original.call(this, text, x, y);
      else original.call(this, text, x, y, maxWidth);
    };
  });
  await mount(page); const lab = page.locator('[data-waggle-lab]'), before = await simulation(page);
  const latestText = (prefix: string) => page.evaluate(prefix => (window as any).__beeDrawnText.filter((text: string) => text.startsWith(prefix)).at(-1), prefix);
  await expect.poll(() => latestText('sun ')).toBe('sun 90°');
  await expect.poll(() => latestText('FLOWER ')).toBe('FLOWER 135°');
  await expect(lab.locator('output strong')).toHaveText('135°');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.waggleLab)).toBeUndefined();
  await lab.locator('#bee-waggle-hold-food').check();
  await page.evaluate(() => { (window as any).__beeDrawnText = []; });
  await lab.locator('#bee-waggle-sun').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(() => latestText('sun ')).toBe('sun 105°');
  await expect.poll(() => latestText('FLOWER ')).toBe('FLOWER 135°');
  await expect.poll(() => latestText('θ = ')).toBe('θ = 30° right of up');
  await expect.poll(() => latestText('this dance: ')).toBe('this dance: 1.2s ≈ 1200m');
  expect(await simulation(page)).toEqual(before);
  await accessible(page); await lab.screenshot({ path: testInfo.outputPath('waggle-wide-reference.png') });
});
