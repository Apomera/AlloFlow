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

const readingIds = ['health', 'workers', 'food', 'syrup', 'mites', 'stability'];

function seededNotebook() {
  return {
    beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'My own colony note: <strong>compare conditions</strong> & keep this text.', explanation: 'Keep my possible explanation.', review: { prediction: true, evidence: true, explanation: true }, custom: { retained: 'Role metadata.' } },
    queen: { prediction: 'Keep my network prediction.', evidence: 'Keep my recorded match.', explanation: 'Keep my network explanation.', review: { prediction: true, evidence: true, explanation: true } },
    drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my route reading.', explanation: 'Keep my route explanation.', review: { evidence: true } },
    synthesis: 'Keep my synthesis.', discoveries: { pollination: { explanation: 'Keep my saved discovery.' } },
    custom: { retained: 'Notebook metadata.' },
  };
}

async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(notebook => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Colony evidence test uses the supported fallback'));
    let colony = {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'beekeeper', beeView: 'pollination',
      tutorialDone: true, soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 12, honey: 60, syrup: 8.5, workers: 24000, queenHealth: 90, morale: 85, varroaLevel: 7, activeEvent: null,
      history: [{ d: 6, w: 21000, h: 50, v: 4, m: 80 }],
      missionBriefOpen: false, journeyOpen: false, notebookOpen: true, notebook,
      queen: { active: false, custom: { retained: 'Colony setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', courseSeed: 20260908 },
      discoveryLesson: 'pollination',
      discoveryRecords: { pollination: { prediction: 1, checked: true, note: 'Keep my discovery draft.', saved: false } },
    };
    colony = BH.bhSaveColonyObservation(colony, BH.bhCreateColonyObservation(colony, 6)).state;
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: true, note: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
    const copy = async (text: string) => { w.__copiedColonyEvidence = text; };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
    w.StemLab.writeClipboard = copy;
  }, seededNotebook());
  await expect(panel(page)).toBeVisible();
  await expect(page.locator('[data-beehive-notebook]')).toHaveJSProperty('open', true);
}

function panel(page: Page) { return page.locator('[data-colony-notebook-capture="true"]'); }
function reading(page: Page, id: string) { return panel(page).locator('[data-capture-reading="' + id + '"]'); }
function value(page: Page, id: string) { return reading(page, id).locator('[data-capture-value]'); }
function capture(page: Page) { return page.locator('[data-beehive-capture-evidence="beekeeper"]'); }

async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}

async function work(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
}

async function semantics(page: Page, state: string, source: string) {
  const capturePanel = panel(page);
  await expect(capturePanel).toHaveAttribute('data-capture-state', state);
  await expect(capturePanel).toHaveAttribute('data-capture-source', source);
  await expect(capturePanel.locator('h3')).toBeVisible();
  await expect(capturePanel.locator('[data-capture-context]')).toBeVisible();
  await expect(capturePanel.locator('[data-capture-save-hint]')).toBeVisible();
  await expect(capturePanel.locator('dl')).toHaveCount(1);
  await expect(capturePanel.locator('[data-capture-reading]')).toHaveCount(6);
  for (const id of readingIds) {
    await expect(reading(page, id).locator(':scope > dt')).not.toHaveText('');
    await expect(reading(page, id).locator(':scope > dd[data-capture-value]')).not.toHaveText('');
  }
  await expect(capture(page)).toBeEnabled();
  await expect(capture(page)).toHaveAccessibleName(/Add these readings/i);
}

async function recordText(page: Page) {
  const record = panel(page).locator('details[data-capture-record]');
  if (!await record.evaluate(node => (node as HTMLDetailsElement).open)) {
    await record.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
  }
  await expect(record).toHaveJSProperty('open', true);
  const text = record.locator('pre[data-capture-text]');
  await expect(text).toBeVisible(); await expect(text.locator('*')).toHaveCount(0);
  expect(await text.evaluate(node => getComputedStyle(node).whiteSpace)).toMatch(/pre-wrap|break-spaces/);
  const content = (await text.textContent())!;
  expect(content.trim()).not.toBe('');
  return content;
}

async function assertAppend(page: Page, text: string) {
  const before = await work(page);
  await capture(page).focus(); await page.keyboard.press('Enter');
  const expected = JSON.parse(JSON.stringify(before));
  expected.beehive.notebook.beekeeper.evidence += '\n' + text.trim();
  expected.beehive.notebook.beekeeper.review.evidence = false;
  expect(await work(page)).toEqual(expected);
  await expect(page.locator('[data-notebook-field="evidence"]')).toHaveValue(expected.beehive.notebook.beekeeper.evidence);
  await expect(page.locator('[data-notebook-review="evidence"]')).not.toBeChecked();
  await expect(page.locator('[data-notebook-review="prediction"]')).toBeChecked();
  await expect(page.locator('[data-notebook-review="explanation"]')).toBeChecked();
}

async function accessible(page: Page) {
  const violations = await page.evaluate(async () => {
    const audit = await (window as any).axe.run(document.querySelector('[data-colony-notebook-capture="true"]'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] },
      rules: { region: { enabled: false } },
    });
    return audit.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) }));
  });
  expect(violations).toEqual([]);
}

async function readableLayout(page: Page, checkPageOverflow = true) {
  const result = await panel(page).evaluate(node => {
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const blocks = [node, ...Array.from(node.querySelectorAll('dl,dt,dd,p,h3,button,summary,details,pre,[data-capture-reading],[data-capture-context],[data-capture-value]'))];
    return {
      rootFont,
      readings: Array.from(node.querySelectorAll('[data-capture-reading]')).map(el => ({ x: el.getBoundingClientRect().x, width: el.getBoundingClientRect().width })),
      controls: Array.from(node.querySelectorAll('button,summary')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
      text: Array.from(node.querySelectorAll('dt,dd,p,pre,[data-capture-context]')).map(el => {
        const css = getComputedStyle(el);
        return { text: el.textContent, font: parseFloat(css.fontSize), ellipsis: css.textOverflow === 'ellipsis', whiteSpace: css.whiteSpace };
      }),
      overflow: blocks.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, cls: el.className, extra: el.scrollWidth - el.clientWidth })),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  expect(result.overflow).toEqual([]);
  if (checkPageOverflow) expect(result.pageOverflow).toBeLessThanOrEqual(1);
  expect(result.controls.length).toBeGreaterThanOrEqual(2);
  for (const control of result.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  expect(result.text.length).toBeGreaterThan(5);
  for (const text of result.text) {
    expect(text.font, text.text || '').toBeGreaterThanOrEqual(result.rootFont * .875);
    expect(text.ellipsis, text.text || '').toBe(false); expect(text.whiteSpace, text.text || '').not.toBe('nowrap');
  }
  return result;
}

async function preview(page: Page, testInfo: TestInfo, name: string) {
  await panel(page).screenshot({ path: testInfo.outputPath('colony-' + name + '.png'), timeout: 120000, animations: 'disabled' });
}

test('colony evidence preserves exact readings, model state and saved work through manual days, events and final days', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await semantics(page, 'manual', 'current');
  const original = await work(page), context = panel(page).locator('[data-capture-context]');
  expect(original.beehive.notebook.colonyObservations.entries).toHaveLength(1);
  for (const [id, text] of [['health', '88 / 100'], ['workers', '24,000'], ['food', '60 honey-equivalent lb'], ['syrup', '8.5 honey-equivalent lb'], ['mites', '7 points'], ['stability', '85 points']]) {
    await expect(value(page, id)).toHaveText(text);
  }
  for (const label of [/Current colony model/i, /Day\s*12/i, /Manual days/i, /Run\s*2/i, /Seed\s*777/i]) await expect(context).toContainText(label);
  await expect(context).toContainText('Model ' + original.beehive.modelVersion);
  await expect(reading(page, 'syrup').locator('dt')).toContainText(/included in food/i);
  await expect(panel(page)).toContainText(/not percentages of bees/i);
  await expect(panel(page)).toContainText(/difference alone does not establish a cause/i);
  const text = await recordText(page), held = await work(page);
  const frameObservation = panel(page).locator('[data-capture-frame]');
  await expect(frameObservation).toContainText('Schematic frame observation: Frame 1/6');
  expect(text).toContain(await frameObservation.textContent());
  expect(text).toContain('24,000'); expect(text).toContain('8.5 honey-equivalent lb');
  await panel(page).locator('[data-capture-refresh]').focus(); await page.keyboard.press('Space');
  expect(await work(page)).toEqual(held); expect(await recordText(page)).toBe(text);
  const summary = panel(page).locator('details[data-capture-record] > summary');
  await summary.focus(); await page.keyboard.press('Space');
  await expect(panel(page).locator('[data-capture-record]')).toHaveJSProperty('open', false);
  await expect(summary).toBeFocused(); await page.keyboard.press('Enter');

  // Scene motion is independent of the clock that advances modeled days.
  await fixture(page, { motionPaused: false });
  await semantics(page, 'manual', 'current');
  await expect(context).toContainText(/Manual days/i);
  expect(await recordText(page)).toBe(text);
  const moving = await work(page);
  await panel(page).locator('[data-capture-refresh]').click(); expect(await work(page)).toEqual(moving);
  await fixture(page, { motionPaused: true }); expect(await work(page)).toEqual(held);
  await assertAppend(page, text);
  await expect(panel(page).locator('[data-capture-save-hint]')).toContainText(/already|added/i);

  const duplicate = await work(page); duplicate.beehive.notebook.beekeeper.review.evidence = true;
  await fixture(page, { notebook: duplicate.beehive.notebook });
  const duplicateBefore = await work(page);
  await capture(page).click(); expect(await work(page)).toEqual(duplicateBefore);
  await expect(page.locator('[data-notebook-review="evidence"]')).toBeChecked();
  await expect(panel(page).locator('[data-capture-save-hint]')).toContainText(/already/i);
  await page.locator('[data-beehive-copy-notebook]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__copiedColonyEvidence || '')).toContain(text.trim());
  const exported = await page.evaluate(() => (window as any).__copiedColonyEvidence as string);
  expect(exported).toContain(seededNotebook().beekeeper.evidence); expect(exported).toContain(seededNotebook().drone.evidence);

  const full = JSON.parse(JSON.stringify(original.beehive.notebook)); full.beekeeper.evidence = 'x'.repeat(1200);
  await fixture(page, { notebook: full });
  const fullBefore = await work(page), required = text.trim().length + 1;
  await expect(panel(page).locator('[data-capture-save-hint]')).toContainText(String(required));
  await expect(capture(page)).toBeEnabled(); await capture(page).click();
  expect(await work(page)).toEqual(fullBefore);
  await expect(page.locator('[data-notebook-evidence-notice]')).toContainText(/room|full|1,200/i);
  await expect(page.locator('[data-notebook-review="evidence"]')).toBeChecked();
  const exact = JSON.parse(JSON.stringify(full)); exact.beekeeper.evidence = 'x'.repeat(1200 - required);
  await fixture(page, { notebook: exact }); await assertAppend(page, text);
  expect((await work(page)).beehive.notebook.beekeeper.evidence.length).toBe(1200);

  // An unresolved event blocks automatic days before the clock can advance.
  const event = { emoji: '⚠', label: 'Sudden storm', desc: 'Foragers return early.', lesson: 'Weather changes colony energy flow.', effect: { morale: -4 } };
  await fixture(page, { notebook: original.beehive.notebook, activeEvent: event, autoAdvance: true });
  await semantics(page, 'event', 'current');
  await expect(context).toContainText(/Event awaiting review/i);
  await expect.poll(async () => (await work(page)).beehive.autoAdvance).toBe(false);
  expect((await work(page)).beehive.day).toBe(12);
  const eventText = await recordText(page), eventBefore = await work(page);
  await panel(page).locator('[data-capture-refresh]').click(); expect(await work(page)).toEqual(eventBefore);
  await assertAppend(page, eventText);
  expect((await work(page)).beehive.activeEvent).toEqual(event);

  // Genuine zeros remain recorded values, including components of the composite.
  await fixture(page, { notebook: original.beehive.notebook, activeEvent: null, autoAdvance: false, colonySurvived: false,
    day: 0, workers: 0, honey: 0, syrup: 0, queenHealth: 0, varroaLevel: 0, morale: 0 });
  await semantics(page, 'ended', 'current');
  await expect(context).toContainText(/Day\s*0/i); await expect(context).toContainText(/Colony ended/i);
  await expect(value(page, 'health')).toHaveText('20 / 100');
  await expect(value(page, 'workers')).toHaveText('0');
  for (const id of ['food', 'syrup']) await expect(value(page, id)).toHaveText('0 honey-equivalent lb');
  for (const id of ['mites', 'stability']) await expect(value(page, id)).toHaveText('0 points');
  const finalText = await recordText(page); await assertAppend(page, finalText);
  const finalWork = await work(page);
  await panel(page).locator('[data-capture-refresh]').click(); expect(await work(page)).toEqual(finalWork);

  // Missing persisted measurements stay explicit rather than becoming playable defaults.
  await fixture(page, { notebook: original.beehive.notebook, day: null, workers: null, honey: null, syrup: null,
    queenHealth: null, varroaLevel: null, morale: null, experimentRunSerial: null, simulationSeed: null, modelVersion: '' });
  await semantics(page, 'ended', 'current');
  for (const id of readingIds) await expect(value(page, id)).toHaveText('Not recorded');
  for (const label of ['Day Not recorded', 'Run Not recorded', 'Seed Not recorded', 'Model Not recorded']) await expect(context).toContainText(label);
  const missingText = await recordText(page), recovered = await work(page);
  expect(missingText).not.toMatch(/24,000|10000|60 honey-equivalent|100 \/ 100/);
  await panel(page).locator('[data-capture-refresh]').click(); expect(await work(page)).toEqual(recovered);
  await assertAppend(page, missingText); await accessible(page);
  const finished = await work(page);
  for (const role of ['queen', 'drone']) expect(finished.beehive.notebook[role]).toEqual(original.beehive.notebook[role]);
  expect(finished.beehive.notebook.colonyObservations).toEqual(original.beehive.notebook.colonyObservations);
  expect(finished.beehive.notebook.synthesis).toEqual(original.beehive.notebook.synthesis);
  expect(finished.beehive.queen).toEqual(original.beehive.queen);
  expect(finished.beehive.drone).toEqual(original.beehive.drone);
  expect(finished.otherTool).toEqual(original.otherTool); expect(errors).toEqual([]);
});

test('colony readings stay readable in both layouts, mobile, dark and forced colors, and enlarged text', async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const original = await work(page), text = await recordText(page);
  for (const focusLayout of [true, false]) {
    await fixture(page, { focusLayout });
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
  await page.emulateMedia({ forcedColors: 'active' }); await capture(page).focus();
  const colors = await capture(page).evaluate(node => {
    const css = getComputedStyle(node);
    return { ink: css.color, paper: css.backgroundColor, border: css.borderTopStyle, borderWidth: parseFloat(css.borderTopWidth), outline: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) };
  });
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
