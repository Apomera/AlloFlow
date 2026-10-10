import { test, expect, Page, TestInfo } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.error) console.error(testInfo.error.message);
  await harness.destroy(page);
});

const ownEvidence = 'My own comparison note: <strong>check conditions</strong> & keep this text.';
function panel(page: Page) { return page.locator('[data-observation-comparison]'); }
function useEvidence(page: Page) { return panel(page).locator('[data-observation-use-evidence]'); }
function metric(page: Page, id: string) { return panel(page).locator('[data-observation-metric="' + id + '"]'); }

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(ownEvidence => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Comparison test uses the supported fallback'));
    let colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: true,
      missionBriefOpen: false, journeyOpen: false, day: 12, workers: 33333, honey: 300, syrup: 40,
      history: [{ d: 6, w: 12001, h: 21.125, v: 0, m: 82 }, { d: 12, w: 12235, h: 18.5, v: 2 }],
      notebook: {
        beekeeper: { prediction: 'Keep my colony prediction.', evidence: ownEvidence, explanation: 'Keep my possible explanation.',
          review: { prediction: true, evidence: true, explanation: true }, custom: { retained: 'Role metadata.' } },
        queen: { evidence: 'Keep my network writing.', review: { evidence: true } },
        drone: { evidence: 'Keep my flight writing.', review: { evidence: true } },
        synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' },
      },
      queen: { active: false }, drone: { active: false, pacing: 'steps', graphicsMode: 'eco' },
    };
    for (const day of [6, 12]) colony = BH.bhSaveColonyObservation(colony, BH.bhCreateColonyObservation(colony, day)).state;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, ownEvidence);
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('[data-beehive-notebook]')).toHaveJSProperty('open', true);
  await expect(panel(page).locator('[data-observation-metric]')).toHaveCount(4);
}

async function work(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
}
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}
async function expectedText(page: Page) {
  return page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    const records = w.__toolData.beehive.notebook.colonyObservations.entries;
    return BH.bhColonyObservationComparisonText(BH.bhCompareColonyObservations(records[0], records[1]));
  });
}
async function recordText(page: Page) {
  const record = panel(page).locator('details[data-comparison-record]');
  const summary = record.locator(':scope > summary');
  await expect(summary).toHaveAccessibleName('Read the comparison text');
  if (!await record.evaluate(node => (node as HTMLDetailsElement).open)) {
    await summary.focus(); await page.keyboard.press('Enter');
  }
  await expect(record).toHaveJSProperty('open', true);
  const text = record.locator('pre[data-comparison-text]');
  await expect(text).toBeVisible(); await expect(text.locator('*')).toHaveCount(0);
  expect(await text.evaluate(node => getComputedStyle(node).whiteSpace)).toMatch(/pre-wrap|break-spaces/);
  return (await text.textContent())!;
}
async function direction(page: Page, id: string) {
  return metric(page, id).evaluate(node => (node.hasAttribute('data-comparison-direction') ? node : node.querySelector('[data-comparison-direction]'))?.getAttribute('data-comparison-direction'));
}
async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const audit = await (window as any).axe.run(document.querySelector('[data-observation-comparison]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    return audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}
async function readableLayout(page: Page, checkPageOverflow = true) {
  const result = await panel(page).evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const blocks = [node, ...Array.from(node.querySelectorAll('dl,dt,dd,p,h5,button,summary,details,pre,label,select,article,[data-comparison-provenance],[data-comparison-timeline],[data-comparison-endpoint]'))];
    return {
      rootFont,
      readings: Array.from(node.querySelectorAll('[data-observation-metric]')).map(el => ({ x: el.getBoundingClientRect().x, width: el.getBoundingClientRect().width })),
      controls: Array.from(node.querySelectorAll('button,summary,select')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      text: Array.from(node.querySelectorAll('dt,dd,p,pre,label,select,[data-comparison-provenance]')).map(el => {
        const css = getComputedStyle(el);
        return { tag: el.tagName, text: el.textContent, font: parseFloat(css.fontSize), ellipsis: css.textOverflow === 'ellipsis', whiteSpace: css.whiteSpace };
      }),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.controls.length).toBeGreaterThanOrEqual(4);
  for (const control of result.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  expect(result.text.length).toBeGreaterThan(10);
  for (const text of result.text) {
    expect(text.font, text.text || '').toBeGreaterThanOrEqual(result.rootFont * .875);
    expect(text.ellipsis, text.text || '').toBe(false);
    // Native select controls keep their option text on one line; their accessible names remain complete.
    if (text.tag !== 'SELECT') {
      expect(text.whiteSpace, text.text || '').not.toBe('nowrap');
    }
  }
  return result;
}
async function preview(page: Page, testInfo: TestInfo, name: string) {
  await panel(page).screenshot({ path: testInfo.outputPath('comparison-' + name + '.png'), timeout: 120000, animations: 'disabled' });
}

test('saved comparisons disclose their source and exact evidence while preserving chronology, missing readings and writing', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const original = await work(page), expected = await expectedText(page);
  const provenance = panel(page).locator('[data-comparison-provenance]');
  await expect(provenance).toContainText(/Run\s*3/i); await expect(provenance).toContainText(/seed\s*777/i);
  await expect(provenance).toContainText(original.beehive.notebook.colonyObservations.entries[0].modelVersion);
  const timeline = panel(page).locator('[data-comparison-timeline]');
  await expect(timeline.locator('[data-comparison-endpoint="earlier"]')).toContainText(/Earlier recorded day/i);
  await expect(timeline.locator('[data-comparison-endpoint="earlier"]')).toContainText(/Day\s*6/);
  await expect(timeline.locator('[data-comparison-endpoint="later"]')).toContainText(/Later recorded day/i);
  await expect(timeline.locator('[data-comparison-endpoint="later"]')).toContainText(/Day\s*12/);
  await expect(panel(page).locator('[data-observation-comparison-span]')).toContainText(/6 simulated days/);
  await expect(panel(page).locator('[data-comparison-coverage]')).toContainText('3 of 4 changes can be calculated.');
  await expect(panel(page).locator('[data-observation-select="a"]')).toHaveAccessibleName('Observation A');
  await expect(panel(page).locator('[data-observation-select="b"]')).toHaveAccessibleName('Observation B');
  const status = panel(page).locator('[data-observation-comparison-span]');
  await expect(status).toHaveAttribute('role', 'status');
  await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveAttribute('aria-atomic', 'true');
  for (const [id, movement, change] of [['workers', 'increased', 'Increased 234 workers'], ['food', 'decreased', 'Decreased 2.625 lb'], ['mites', 'increased', 'Increased 2 points'], ['stability', 'unavailable', 'Unavailable']]) {
    expect(await direction(page, id)).toBe(movement);
    await expect(metric(page, id).locator('[data-observation-delta]')).toContainText(change);
    await expect(metric(page, id).locator('dt').nth(0)).toHaveText('Earlier · Day 6');
    await expect(metric(page, id).locator('dt').nth(1)).toHaveText('Later · Day 12');
  }
  await expect(metric(page, 'mites').locator('dd').first()).toHaveText('0 points');
  await expect(metric(page, 'stability').locator('dd').last()).toHaveText('Unavailable');
  await expect(metric(page, 'stability').locator('[data-comparison-missing]')).toHaveText('The colony stability reading for Day 12 was not recorded; no change can be calculated.');
  expect(await recordText(page)).toBe(expected);
  const summary = panel(page).locator('details[data-comparison-record] > summary');
  await summary.focus(); await page.keyboard.press('Space');
  await expect(panel(page).locator('[data-comparison-record]')).toHaveJSProperty('open', false);
  await expect(summary).toBeFocused(); await page.keyboard.press('Enter');
  expect(await recordText(page)).toBe(expected); expect(await work(page)).toEqual(original);

  const [earlier, later] = original.beehive.notebook.colonyObservations.entries;
  await panel(page).locator('[data-observation-select="a"]').selectOption(String(later.id));
  await expect(panel(page).locator('[data-observation-comparison-reason]')).toContainText('Choose two different observations.');
  await expect(panel(page).locator('[data-comparison-record]')).toHaveCount(0);
  await panel(page).locator('[data-observation-select="b"]').selectOption(String(earlier.id));
  expect(await recordText(page)).toBe(expected);
  await expect(timeline.locator('[data-comparison-endpoint="earlier"]')).toContainText(/Day\s*6/);
  await expect(timeline.locator('[data-comparison-endpoint="later"]')).toContainText(/Day\s*12/);
  expect(await work(page)).toEqual(original);

  await useEvidence(page).focus(); await page.keyboard.press('Enter');
  const appended = JSON.parse(JSON.stringify(original));
  appended.beehive.notebook.beekeeper.evidence += '\n' + expected;
  appended.beehive.notebook.beekeeper.review.evidence = false;
  expect(await work(page)).toEqual(appended);
  await expect(page.locator('[data-notebook-field="evidence"]')).toHaveValue(appended.beehive.notebook.beekeeper.evidence);
  await expect(page.locator('[data-notebook-review="evidence"]')).not.toBeChecked();
  for (const field of ['prediction', 'explanation']) await expect(page.locator('[data-notebook-review="' + field + '"]')).toBeChecked();
  await expect(useEvidence(page)).toBeDisabled();
  await expect(panel(page).locator('#beehive-observation-evidence-hint')).toContainText('already');
  expect(await recordText(page)).toBe(expected); expect(await work(page)).toEqual(appended);

  const full = JSON.parse(JSON.stringify(original.beehive.notebook)); full.beekeeper.evidence = 'x'.repeat(1200);
  await fixture(page, { notebook: full }); const fullWork = await work(page);
  await expect(useEvidence(page)).toBeDisabled();
  await expect(panel(page).locator('#beehive-observation-evidence-hint')).toContainText('Make room');
  expect(await recordText(page)).toBe(expected); expect(await work(page)).toEqual(fullWork);
  await expect(page.locator('[data-notebook-field="evidence"]')).toHaveValue('x'.repeat(1200));
  await expect(page.locator('[data-notebook-review="evidence"]')).toBeChecked();

  const unchanged = JSON.parse(JSON.stringify(original.beehive.notebook));
  unchanged.colonyObservations.entries[1].metrics.mites = 0;
  await fixture(page, { notebook: unchanged }); const unchangedWork = await work(page);
  expect(await direction(page, 'mites')).toBe('unchanged');
  await expect(metric(page, 'mites').locator('[data-observation-delta]')).toContainText('Unchanged (0 points)');
  expect(await recordText(page)).toBe(await expectedText(page)); expect(await work(page)).toEqual(unchangedWork);

  const mismatch = JSON.parse(JSON.stringify(original.beehive.notebook)); mismatch.colonyObservations.entries[1].runSerial = 4;
  await fixture(page, { notebook: mismatch }); const mismatchWork = await work(page);
  await expect(panel(page).locator('[data-observation-comparison-reason]')).toContainText('different colony runs');
  for (const selector of ['[data-observation-metric]', '[data-observation-delta]', '[data-comparison-record]', '[data-comparison-text]', '[data-comparison-timeline]', '[data-comparison-provenance]', '[data-comparison-coverage]', '[data-observation-use-evidence]']) {
    await expect(panel(page).locator(selector)).toHaveCount(0);
  }
  await accessible(page); expect(await work(page)).toEqual(mismatchWork); expect(errors).toEqual([]);
});

test('comparison reading stays clear across layouts, mobile, dark and forced colors, and enlarged text', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const original = await work(page), text = await recordText(page);
  for (const focusLayout of [true, false]) {
    await fixture(page, { focusLayout });
    await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-layout', focusLayout ? 'stage-first' : 'overview-first');
    for (const [width, name] of [[980, 'wide'], [320, 'mobile']] as const) {
      await page.setViewportSize({ width, height: 1800 });
      const layout = await readableLayout(page);
      if (width === 320) expect(new Set(layout.readings.map(item => Math.round(item.x))).size).toBe(1);
      else expect(new Set(layout.readings.map(item => Math.round(item.x))).size).toBeGreaterThan(1);
      expect(await recordText(page)).toBe(text); await accessible(page);
      if (focusLayout) await preview(page, testInfo, name);
    }
  }
  await fixture(page, { focusLayout: true }); expect(await work(page)).toEqual(original);
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await useEvidence(page).focus();
  const colors = await useEvidence(page).evaluate(node => {
    const css = getComputedStyle(node);
    const reference = document.createElement('button');
    reference.style.cssText = 'color:ButtonText;background:ButtonFace'; document.body.appendChild(reference);
    const system = getComputedStyle(reference), systemInk = system.color, systemPaper = system.backgroundColor;
    reference.remove();
    return { ink: css.color, paper: css.backgroundColor, systemInk, systemPaper, border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth), outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) };
  });
  expect(colors.ink).toBe(colors.systemInk); expect(colors.paper).toBe(colors.systemPaper);
  expect(colors.ink).not.toBe(colors.paper); expect(colors.border).not.toBe('none'); expect(colors.borderWidth).toBeGreaterThan(0);
  expect(colors.outline).not.toBe('none'); expect(colors.outlineWidth).toBeGreaterThan(0);
  await readableLayout(page); await accessible(page); await preview(page, testInfo, 'forced-colors');
  await page.emulateMedia({ forcedColors: 'none' }); await page.setViewportSize({ width: 1600, height: 1800 });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await page.locator('[data-beehive-notebook]').evaluate(node => Object.assign((node as HTMLElement).style, { width: '1100px', maxWidth: 'none' }));
  await panel(page).evaluate(node => Object.assign((node as HTMLElement).style, { width: '900px', maxWidth: '100%' }));
  expect(await panel(page).evaluate(node => node.getBoundingClientRect().width)).toBe(900);
  const enlarged = await readableLayout(page, false);
  expect(new Set(enlarged.readings.map(item => Math.round(item.x))).size).toBe(1);
  expect(await recordText(page)).toBe(text); await accessible(page); await preview(page, testInfo, 'large-text');
  expect(await work(page)).toEqual(original); expect(errors).toEqual([]);
});
