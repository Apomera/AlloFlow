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
    const w = window as any; w.__RR_TEST_EXPORTS__ = {}; w.__pollenCanvasLabels = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text: string, ...args: any[]) {
      if (typeof text === 'string' && text.startsWith('Case:')) w.__pollenCanvasLabels.push(text);
      return original.apply(this, [text, ...args] as any);
    };
  });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ overrides, grade }) => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: { ...BH.bhCreateNewColonyState(777, 1, 0),
      viewMode: 'beekeeper', beeView: 'pollination', discoveryLesson: 'pollination', tutorialDone: true,
      soundOn: false, motionPaused: true, day: 60, ...overrides }, otherTool: { retained: true } }));
    w.__ctx.gradeLevel = grade; w.__rerender(); document.getElementById('wrap')!.style.width = '100%';
  }, { overrides, grade });
  await expect(page.locator('[data-pollination-lab]')).toBeVisible();
}
async function simulation(page: Page, omitDiscovery = false) {
  return page.evaluate(omitDiscovery => {
    const { pollinationLab, ...colony } = (window as any).__toolData.beehive;
    if (omitDiscovery) { delete colony.discoveryRecords; delete colony.notebook; }
    return { colony, otherTool: (window as any).__toolData.otherTool };
  }, omitDiscovery);
}
async function accessible(page: Page, fullPage = true) {
  const result = await page.evaluate(async () => {
    const node = document.querySelector('[data-pollination-lab]')!;
    const audit = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    const controls = document.querySelector('[data-beehive-stage-controls]')!;
    const controlsAudit = await (window as any).axe.run(controls, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return {
      violations: audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      controlsViolations: controlsAudit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      smallControls: Array.from(controls.querySelectorAll('button')).filter(n => n.getBoundingClientRect().height < 44 || n.getBoundingClientRect().width < 44).map(n => n.textContent),
      overflow: node.scrollWidth - node.clientWidth,
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      smallTargets: Array.from(node.querySelectorAll('button,.bee-pollen-choice,summary,a')).filter(n => n.getBoundingClientRect().height > 0 && n.getBoundingClientRect().height < 44).map(n => n.textContent),
      pictureWidth: node.querySelector('svg[data-pollination-art="bee"]')!.getBoundingClientRect().width
    };
  });
  expect(result.violations).toEqual([]); expect(result.overflow).toBeLessThanOrEqual(1);
  expect(result.controlsViolations).toEqual([]); expect(result.smallControls).toEqual([]);
  if (fullPage) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.smallTargets).toEqual([]); expect(result.pictureWidth).toBeGreaterThan(140);
}
async function canvasPainted(page: Page) {
  await expect.poll(() => page.locator('[data-beehive-canvas]').evaluate((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!, colors = new Set(); let opaque = 0, total = 0;
    for (let y = 0; y < canvas.height; y += Math.max(1, Math.floor(canvas.height / 25))) {
      for (let x = 0; x < canvas.width; x += Math.max(1, Math.floor(canvas.width / 45))) {
        const pixel = Array.from(ctx.getImageData(x, y, 1, 1).data); total++; if (pixel[3] === 255) opaque++;
        colors.add(pixel.join(','));
      }
    }
    return opaque / total > .95 && colors.size > 7;
  })).toBe(true);
}

test('matches the paused canvas and changes the flower case by keyboard and touch at 320px', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page); const lab = page.locator('[data-pollination-lab]'), before = await simulation(page);
  await canvasPainted(page);
  await expect(lab.locator('output')).toHaveAttribute('data-pollination-outcome', 'no-transfer');
  expect(await page.evaluate(() => (window as any).__toolData.beehive.pollinationLab)).toBeUndefined();
  await expect.poll(() => page.evaluate(() => (window as any).__pollenCanvasLabels.at(-1))).toContain('No pollen transfer shown');
  const canvas = page.locator('[data-beehive-canvas]'), firstPixels = await canvas.evaluate((n: HTMLCanvasElement) => n.toDataURL());
  await lab.getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).focus(); await page.keyboard.press('Space');
  await expect(lab.locator('output')).toHaveAttribute('data-pollination-outcome', 'transfer');
  await expect(lab.getByRole('img', { name: 'Pollen grains deposited on the round stigma; anthers are rectangular' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__pollenCanvasLabels.at(-1))).toContain('Case: Pollen transfer shown');
  await expect.poll(() => canvas.evaluate((n: HTMLCanvasElement) => n.toDataURL())).not.toBe(firstPixels);
  await lab.getByRole('checkbox', { name: 'Pollen compatible', exact: true }).tap();
  await expect(lab.locator('output')).toContainText('transfer still occurred');
  await lab.getByRole('checkbox', { name: 'Loose pollen on bee', exact: true }).tap();
  await expect(lab.locator('output')).toHaveAttribute('data-pollination-outcome', 'no-transfer');
  await expect(lab.locator('output')).toContainText('no loose pollen');
  expect(await simulation(page)).toEqual(before); await accessible(page);
  await lab.screenshot({ path: testInfo.outputPath('pollination-mobile-light.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await accessible(page); await lab.screenshot({ path: testInfo.outputPath('pollination-mobile-dark.png') });
  expect(errors).toEqual([]);
});

test('saves a flower comparison and leaves its evidence fixed through later changes', async ({ page }) => {
  await mount(page, { notebook: { beekeeper: { claim: 'Original colony claim', reasoning: 'Original reasoning' } } });
  const lab = page.locator('[data-pollination-lab]'), card = page.locator('[data-beehive-discovery]'), before = await simulation(page, true);
  await card.getByRole('radio', { name: 'Pollen reaching a receptive stigma', exact: true }).check();
  await card.getByRole('button', { name: 'Check my thinking', exact: true }).click();
  await card.getByRole('button', { name: 'Capture observation', exact: true }).click();
  await lab.getByRole('checkbox', { name: 'Bee contacts stigma', exact: true }).check();
  await lab.getByRole('button', { name: 'Record your discovery', exact: false }).click();
  await expect(page.locator('#bee-discovery-title')).toBeFocused();
  await card.getByRole('button', { name: 'Compare now', exact: true }).click();
  await expect(card.locator('[data-discovery-feedback]')).toHaveAttribute('data-discovery-feedback', 'supported');
  await expect(card.locator('[data-evidence-metric="transfer"] [data-evidence-case="before"]')).toHaveText('Starting caseNot shown');
  await expect(card.locator('[data-evidence-metric="transfer"] [data-evidence-case="after"]')).toHaveText('Compared caseShown');
  const note = 'With pollen and compatibility fixed, contact deposited pollen. This does not show fertilization.';
  await card.getByRole('textbox').fill(note); await card.getByRole('button', { name: 'Save discovery', exact: true }).click();
  const saved = await page.evaluate(() => (window as any).__toolData.beehive.notebook.discoveries.pollination);
  expect(saved.evidence.runKey).toBe('pollination:777:1:pollen-transfer-1');
  expect(saved.evidence.metrics.map((m: any) => m.value)).toEqual([1, 0, 1, 0, 0]);
  expect(saved.comparisonEvidence.rows.find((r: any) => r.id === 'transfer')).toMatchObject({ before: 0, after: 1, delta: 1 });
  await lab.getByRole('checkbox', { name: 'Pollen compatible', exact: true }).uncheck();
  await lab.getByRole('button', { name: 'Reset flower case', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook.discoveries.pollination)).toEqual(saved);
  expect(await simulation(page, true)).toEqual(before);
  await page.locator('#beehive-notebook-summary').click();
  await expect(page.locator('[data-discovery-notebook-records]')).toContainText(note);
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook.beekeeper.claim)).toBe('Original colony claim');
});

test('keeps old colony evidence and writing while asking for a fresh flower case', async ({ page }) => {
  const snapshot = { version: 1, lesson: 'pollination', mode: 'beekeeper', runKey: 'colony:777:1', clock: 60, label: 'Day 60', metrics: [{ id: 'honey', label: 'Food stores', value: 40, unit: 'lb' }] };
  const record = { prediction: 2, checked: true, saved: true, observation: 'Earlier colony totals', snapshot, note: 'Earlier explanation' };
  const notebook = { title: 'A flower connection', observation: record.observation, explanation: record.note, evidence: snapshot };
  await mount(page, { discoveryRecords: { pollination: record }, notebook: { discoveries: { pollination: notebook } } });
  const card = page.locator('[data-beehive-discovery]');
  await expect(card.locator('[data-discovery-feedback]')).toHaveAttribute('data-discovery-feedback', 'pending');
  await expect(card).toContainText('Capture a fresh observation');
  await expect(card.getByRole('button', { name: 'Discovery saved', exact: false })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.discoveryRecords.pollination)).toEqual(record);
  await card.getByRole('button', { name: 'Update observation', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook.discoveries.pollination)).toEqual(notebook);
  await expect(card.getByRole('textbox')).toHaveValue('Earlier explanation');
  await expect(card.getByRole('button', { name: 'Save discovery', exact: true })).toBeDisabled();
});

test('lays out a desktop pollen path with clear source and model boundaries', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await mount(page, { pollinationLab: { pollen: true, contact: true, compatible: false } }, '11th Grade');
  const lab = page.locator('[data-pollination-lab]');
  expect((await lab.boundingBox())!.width).toBeGreaterThan(700);
  await canvasPainted(page);
  expect(await lab.locator('.bee-pollen-path').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(3);
  await expect(lab.locator('output')).toContainText('transfer still occurred');
  await lab.getByText('Plan your explanation', { exact: true }).click();
  await expect(lab.locator('[data-pollination-grade]')).toContainText('inference');
  await lab.getByText('What this flower case shows', { exact: true }).click();
  await expect(lab).toContainText('not a field measurement or a success rate');
  await expect(lab.getByRole('link', { name: 'SARE: pollen compatibility and flower reproduction' })).toHaveAttribute('href', 'https://www.sare.org/publications/managing-alternative-pollinators/chapter-four-pollination-botany/flower-reproduction/');
  await accessible(page); await lab.screenshot({ path: testInfo.outputPath('pollination-desktop.png') });
  await page.locator('[data-beehive-canvas]').screenshot({ path: testInfo.outputPath('pollination-canvas.png') });
});

test('remains readable with doubled text and forced colors in a narrow desktop panel', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); await mount(page);
  const lab = page.locator('[data-pollination-lab]');
  await lab.evaluate(node => { (node as HTMLElement).style.width = '340px'; (node as HTMLElement).style.maxWidth = '100%'; document.documentElement.style.fontSize = '32px'; });
  await accessible(page, false);
  expect(await lab.locator('.bee-pollen-path').evaluate(n => getComputedStyle(n).gridTemplateColumns.split(' ').length)).toBe(1);
  await lab.screenshot({ path: testInfo.outputPath('pollination-large-text.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await accessible(page, false); await page.emulateMedia({ forcedColors: 'active' }); await accessible(page, false);
  const buttonColors = await lab.getByRole('button', { name: 'Record your discovery', exact: false }).evaluate(n => ({ ink: getComputedStyle(n).color, paper: getComputedStyle(n).backgroundColor }));
  expect(buttonColors.ink).not.toBe(buttonColors.paper);
  expect(await lab.locator('svg path').first().evaluate(n => getComputedStyle(n).stroke)).not.toBe('none');
  await lab.screenshot({ path: testInfo.outputPath('pollination-forced-colors.png') });
});

test('retains case metadata, notes and controls when entering the discovery workspace', async ({ page }) => {
  await mount(page, { focusLayout: false, pollinationLab: { pollen: false, contact: true, compatible: false, note: 'Keep case notes', teacher: { note: 'Retain' } } }, '2nd Grade');
  const lab = page.locator('[data-pollination-lab]');
  await expect(lab).toHaveCount(1); await expect(lab.locator('[data-pollination-grade]')).toContainText('dots');
  await lab.getByRole('button', { name: 'Open discovery workspace', exact: false }).click();
  await expect(page.locator('[data-beehive-discovery]')).toHaveAttribute('data-beehive-discovery', 'pollination');
  await expect(lab).toHaveCount(1);
  await page.evaluate(() => { const w = window as any; w.__ctx.gradeLevel = '11th Grade'; w.__rerender(); });
  await expect(lab.locator('[data-pollination-grade]')).toContainText('deposition');
  await lab.getByRole('button', { name: 'Reset flower case', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.beehive.pollinationLab)).toEqual({ pollen: true, contact: false, compatible: true, note: 'Keep case notes', teacher: { note: 'Retain' } });
});

test('repaints paused pollen, dance and temperature diagrams after a real layout resize', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); await mount(page);
  const canvas = page.locator('[data-beehive-canvas]'), before = await simulation(page);
  for (const view of ['pollination', 'waggle', 'thermo']) {
    await page.evaluate(view => { const w = window as any; w.__toolData.beehive.beeView = view; w.__rerender(); }, view);
    expect(await canvas.evaluate(n => getComputedStyle(n).filter)).toBe('none');
    for (const width of [980, 390, 1180]) {
      await page.setViewportSize({ width, height: 1000 }); await canvasPainted(page);
      expect(await canvas.evaluate((n: HTMLCanvasElement) => n.width)).toBeGreaterThan(200);
    }
  }
  await page.evaluate(() => { const w = window as any; w.__toolData.beehive.beeView = 'pollination'; w.__rerender(); });
  await canvasPainted(page); expect(await simulation(page)).toEqual(before);
});
