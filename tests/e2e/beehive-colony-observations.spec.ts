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

async function mount(page: Page, prepare = '') {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(prepare => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    let state = { ...BH.bhCreateNewColonyState(777, 3, 0), viewMode: 'beekeeper', tutorialDone: true,
      soundOn: false, motionPaused: true, beeView: 'lifecycle', day: 12, workers: 33333, honey: 300,
      syrup: 40, actionPoints: 3, history: [{ d: 6, w: 12001, h: 21.125, v: 0, m: 82 }, { d: 12, w: 12235, h: 18.5, v: 2 }],
      notebookOpen: !!prepare, focusLayout: !prepare, notebook: {
        beekeeper: { prediction: 'My prediction.', evidence: 'My original evidence.', explanation: 'My original explanation.',
          review: { prediction: true, evidence: true, explanation: true } },
        drone: { evidence: 'Flight writing.' }, synthesis: 'Keep my synthesis.',
      } };
    if (prepare === 'full') {
      state.day = 13;
      state.history = Array.from({ length: 13 }, (_, index) => ({ d: index + 1, w: 12000 + index, h: 20 + index, v: 0, m: 80 }));
      for (let day = 1; day <= 12; day++) state = BH.bhSaveColonyObservation(state, BH.bhCreateColonyObservation(state, day)).state;
    } else if (prepare) {
      for (const day of [6, 12]) state = BH.bhSaveColonyObservation(state, BH.bhCreateColonyObservation(state, day)).state;
    }
    w.ReactDOM.flushSync(() => w.__mount({ beehive: state, otherTool: { retained: 'Unrelated writing.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    w.__copiedPortfolio = '';
    const copy = (text: string) => { w.__copiedPortfolio = text; return Promise.resolve(); };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    w.StemLab.writeClipboard = copy;
  }, prepare);
  await expect(page.locator('[data-colony-history]')).toBeVisible();
}
async function modelState(page: Page) {
  return page.evaluate(() => {
    const state = { ...(window as any).__toolData.beehive };
    delete state.notebook; delete state.notebookOpen; delete state.focusLayout;
    return JSON.stringify(state);
  });
}
async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-colony-observations]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
    });
    return result.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
  const sizes = await page.locator('[data-colony-observations]').evaluate(node => ({ width: node.clientWidth, content: node.scrollWidth }));
  expect(sizes.content, JSON.stringify(sizes)).toBeLessThanOrEqual(sizes.width + 1);
}

test('saved history becomes exact Notebook evidence and survives history rollover and backup reload', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const before = await modelState(page);
  await page.locator('[data-history-save]').evaluate(node => { (node as HTMLButtonElement).click(); (node as HTMLButtonElement).click(); });
  await expect(page.locator('[data-history-save]')).toHaveText('Day 12 saved');
  await expect(page.locator('[data-colony-observation]')).toHaveCount(1);
  await page.locator('[data-history-reading]').focus(); await page.keyboard.press('Home');
  await page.locator('[data-history-save]').click();
  await expect(page.locator('[data-colony-observation]')).toHaveCount(2);
  expect(await modelState(page)).toBe(before);
  await page.locator('[data-history-notebook]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#beehive-observations-title')).toBeFocused();
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-layout', 'stage-first');
  await expect(page.locator('[data-observation-comparison-span]')).toContainText('Day 6 → Day 12');
  await expect(page.locator('[data-observation-delta="workers"]')).toContainText('Increased 234 workers');
  await expect(page.locator('[data-observation-delta="food"]')).toContainText('Decreased 2.625 lb');
  await expect(page.locator('[data-observation-metric="stability"]')).toContainText('Unavailable');
  const evidence = page.locator('[data-notebook-field="evidence"]');
  await expect(evidence).toHaveValue('My original evidence.');
  await page.locator('[data-observation-use-evidence]').click();
  await expect(evidence).toHaveValue(/My original evidence\.\nRecorded daily observations/);
  await expect(evidence).toHaveValue(/12001 workers → 12235 workers/);
  await expect(page.locator('[data-notebook-review="evidence"]')).not.toBeChecked();
  await expect(page.locator('[data-notebook-review="prediction"]')).toBeChecked();
  await expect(page.locator('[data-observation-use-evidence]')).toBeDisabled();
  expect(await modelState(page)).toBe(before);

  await page.locator('[data-beehive-copy-notebook]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__copiedPortfolio)).toContain('## Saved colony observations');
  const portfolio = await page.evaluate(() => (window as any).__copiedPortfolio);
  expect(portfolio).toContain('21.125 lb'); expect(portfolio).toContain('Colony stability: Unavailable');
  expect(portfolio).toContain('Flight writing.'); expect(portfolio).toContain('Keep my synthesis.');
  const saved = await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    return BH.bhBuildBeeBackup({ ...w.__toolData.beehive, day: 150, history: [] }, '2026-10-04T12:00:00Z');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.evaluate(saved => {
    const w = window as any, state = w.__RR_TEST_EXPORTS__.beehive.bhReadBeeBackup(saved).state;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: state, otherTool: { retained: 'Unrelated writing.' } }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, saved);
  await expect(page.locator('[data-colony-observation]')).toHaveCount(2);
  await expect(page.locator('[data-observation-delta="food"]')).toContainText('Decreased 2.625 lb');
  await expect(page.locator('[data-colony-history]')).toContainText('No daily readings yet');
  await expect(evidence).toHaveValue(/My original evidence\./);
  expect(await page.evaluate(() => (window as any).__toolData.otherTool.retained)).toBe('Unrelated writing.');
  expect(errors).toEqual([]);
});

test('capacity, reversible removal, run mismatches and writing limits preserve saved work', async ({ page }) => {
  await mount(page, 'full');
  const before = await modelState(page);
  await expect(page.locator('[data-history-save]')).toBeDisabled();
  await expect(page.locator('#beehive-history-save-status')).toContainText('Remove an observation');
  await page.locator('[data-colony-observation="12"] > summary').click();
  await page.locator('[data-observation-remove="12"]').click();
  await expect(page.locator('#beehive-observations-title')).toBeFocused();
  await expect(page.locator('[data-colony-observation]')).toHaveCount(11);
  await page.locator('[data-observation-undo]').click();
  await expect(page.locator('[data-colony-observation]')).toHaveCount(12);
  await expect(page.locator('[data-history-save]')).toBeDisabled();
  await page.locator('[data-colony-observation="12"] > summary').click();
  await page.locator('[data-observation-remove="12"]').click();
  await page.locator('[data-history-save]').click();
  await expect(page.locator('[data-history-save]')).toHaveText('Day 13 saved');
  await expect(page.locator('[data-observation-undo]')).toBeDisabled();
  await expect(page.locator('[data-colony-observation="1"]')).toHaveCount(1);
  expect(await modelState(page)).toBe(before);

  await page.evaluate(() => {
    const w = window as any;
    w.__ctx.setToolData((prev: any) => {
      const notebook = prev.beehive.notebook;
      return { ...prev, beehive: { ...prev.beehive, notebook: { ...notebook,
        beekeeper: { ...notebook.beekeeper, evidence: 'x'.repeat(1200), review: { evidence: true } },
        colonyObservations: { ...notebook.colonyObservations, entries: notebook.colonyObservations.entries.map((entry: any) => entry.id === 13 ? { ...entry, runSerial: 4 } : entry) },
      } } };
    });
  });
  await expect(page.locator('[data-observation-comparison-reason]')).toContainText('different colony runs');
  await expect(page.locator('[data-observation-delta]')).toHaveCount(0);
  await page.locator('[data-observation-select="a"]').selectOption('1');
  await page.locator('[data-observation-select="b"]').selectOption('2');
  await expect(page.locator('[data-observation-use-evidence]')).toBeDisabled();
  await expect(page.locator('#beehive-observation-evidence-hint')).toContainText('Make room');
  await page.locator('[data-beehive-capture-evidence="beekeeper"]').click();
  await expect(page.locator('[data-notebook-evidence-notice]')).toContainText('Your writing is preserved');
  const evidence = page.locator('[data-notebook-field="evidence"]');
  await expect(evidence).toHaveValue('x'.repeat(1200));
  await expect(page.locator('[data-notebook-review="evidence"]')).toBeChecked();
  await evidence.fill('A revised observation.');
  await expect(page.locator('[data-notebook-review="evidence"]')).not.toBeChecked();
  await page.locator('[data-beehive-capture-evidence="beekeeper"]').click();
  await expect(evidence).toHaveValue(/Workers 33333/);
  await expect(evidence).toHaveValue(/Combined food 300 honey-equivalent lb/);
  const captured = await evidence.inputValue();
  await page.locator('[data-beehive-capture-evidence="beekeeper"]').click();
  await expect(evidence).toHaveValue(captured);
  expect(await modelState(page)).toBe(before);
  const future = { schemaVersion: 2, entries: [{ retainedText: 'Future observation evidence.' }] };
  await page.evaluate(future => {
    const w = window as any;
    w.__ctx.setToolData((prev: any) => ({ ...prev, beehive: { ...prev.beehive, notebook: { ...prev.beehive.notebook, colonyObservations: future } } }));
  }, future);
  await expect(page.locator('[data-history-save]')).toBeDisabled();
  await expect(page.locator('[data-colony-observations]')).toContainText('unsupported format');
  await expect(page.locator('[data-observation-undo]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.beehive.notebook.colonyObservations)).toEqual(future);
});

test('observation comparisons and Notebook writing remain readable in narrow panels and both themes', async ({ page }, testInfo) => {
  await mount(page, 'two');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '340px'; });
  const observations = page.locator('[data-colony-observations]');
  const notebook = page.locator('[data-beehive-notebook="beekeeper"]');
  await accessible(page);
  const sizing = await notebook.evaluate(node => ({
    fields: getComputedStyle(node.querySelector('[data-notebook-fields]')!).gridTemplateColumns.split(' ').length,
    roles: getComputedStyle(node.querySelector('[data-notebook-role-grid]')!).gridTemplateColumns.split(' ').length,
    prompts: Array.from(node.querySelectorAll('[id$="-prompt"]')).map(item => parseFloat(getComputedStyle(item).fontSize)),
    target: node.querySelector('[data-observation-use-evidence]')!.getBoundingClientRect().height,
  }));
  expect(sizing.fields).toBe(1); expect(sizing.roles).toBe(1); expect(sizing.prompts.every(size => size >= 13), JSON.stringify(sizing)).toBe(true); expect(sizing.target).toBeGreaterThanOrEqual(44);
  await notebook.locator('[data-notebook-fields]').screenshot({ path: testInfo.outputPath('notebook-writing-narrow.png') });
  await observations.screenshot({ path: testInfo.outputPath('colony-observations-light.png') });
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await expect(page.locator('[data-beehive-root]')).toHaveAttribute('data-beehive-theme', 'dark');
  await accessible(page);
  await observations.screenshot({ path: testInfo.outputPath('colony-observations-dark.png') });
  await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
  await accessible(page);
  await page.emulateMedia({ forcedColors: 'active' });
  const select = page.locator('[data-observation-select="a"]');
  await select.focus(); await expect(select).toBeFocused();
  expect(await select.evaluate(node => parseFloat(getComputedStyle(node).outlineWidth))).toBeGreaterThanOrEqual(2);
  await page.evaluate(() => { document.documentElement.style.fontSize = '16px'; document.getElementById('wrap')!.style.width = '100%'; });
  expect(await notebook.locator('[data-notebook-fields]').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length)).toBe(3);
});
