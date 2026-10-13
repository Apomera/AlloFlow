import { test, expect, Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  probes: 'window.__testHooks={};', appStyles: true, width: 980, height: 1800, layout: 'document',
});
const artifacts = '.codex-artifacts/bee-projection-notebook-2026-10-10';
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 980, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(() => { mkdirSync(artifacts, { recursive: true }); return harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.error) console.error(testInfo.error.message);
  await harness.destroy(page);
});

function seededNotebook() {
  return {
    beekeeper: { prediction: 'Keep my colony prediction.', evidence: 'My observed note: <strong>compare frames</strong> & preserve this.', explanation: 'Keep my explanation.',
      review: { prediction: true, evidence: true, explanation: true }, custom: { retained: 'Role metadata.' } },
    queen: { prediction: 'Keep my network prediction.', evidence: 'Keep my network writing.', explanation: 'Keep my network explanation.', review: { prediction: true, evidence: true, explanation: true } },
    drone: { prediction: 'Keep my flight prediction.', evidence: 'Keep my flight writing.', explanation: 'Keep my flight explanation.', review: { prediction: true, evidence: true, explanation: true } },
    synthesis: 'Keep my synthesis.', discoveries: { pollination: { explanation: 'Keep my discovery writing.' } },
    custom: { retained: 'Notebook metadata.' },
  };
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(notebook => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('Projection notebook test uses the supported fallback'));
    w.THREE.WebGLRenderer = function() { throw new Error('No WebGL in the projection notebook test'); };
    const colony = { ...BH.bhCreateNewColonyState(777, 3, 0),
      viewMode: 'beekeeper', beeView: 'pollination', tutorialDone: true, soundOn: false,
      motionPaused: true, autoAdvance: false, focusLayout: true, notebookOpen: false,
      missionBriefOpen: false, journeyOpen: false, day: 15, workers: 24000, honey: 40,
      syrup: 5, pollen: 12, brood: 6000, queenHealth: 90, activeEvent: null,
      show3dHive: false, hive3dExploded: false, hive3dFrame: 0, hive3dFramesSeen: [],
      hive3dPart: null, hive3dFoundQueen: false, notebook,
      queen: { active: false, custom: { retained: 'Network setup.' } },
      drone: { active: false, pacing: 'steps', graphicsMode: 'eco', custom: { retained: 'Flight setup.' } },
    };
    w.ReactDOM.flushSync(() => w.__mount({ beehive: colony, otherTool: { retained: 'Keep another tool’s work.' } }));
    w.__ctx.gradeLevel = '7th Grade'; w.__rerender();
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  }, seededNotebook());
  await expect(page.locator('[data-hive-interior-open]')).toBeVisible();
}
async function fixture(page: Page, patch: Record<string, unknown>) {
  await page.evaluate(patch => {
    const w = window as any;
    w.ReactDOM.flushSync(() => w.__ctx.updateMulti('beehive', patch));
  }, patch);
}
async function work(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData)));
}
function preview(page: Page) { return page.locator('[data-management-preview]'); }
function bridge(page: Page) { return page.locator('[data-management-projection-bridge]'); }
function context(page: Page) { return page.locator('[data-notebook-projection-context]'); }
function metric(page: Page) { return page.locator('[data-preview-timeline-metric]'); }
function projectedDay(page: Page) { return page.locator('[data-preview-timeline-day]'); }
function choice(page: Page) { return page.locator('[data-management-preview-choice]'); }
function horizon(page: Page) { return page.locator('[data-management-preview-horizon]'); }
function prediction(page: Page) { return bridge(page).locator('[data-management-projection-prediction]'); }
function save(page: Page) { return bridge(page).locator('[data-management-projection-save]'); }
function field(page: Page, id: string) { return page.locator('[data-beehive-notebook="beekeeper"] [data-notebook-field="' + id + '"]'); }
async function openPreview(page: Page) {
  if (!await preview(page).evaluate(node => (node as HTMLDetailsElement).open)) {
    await preview(page).locator(':scope > summary').focus(); await page.keyboard.press('Enter');
  }
  await expect(preview(page)).toHaveJSProperty('open', true);
  await expect(bridge(page)).toBeVisible();
}
async function note(page: Page) {
  const text = bridge(page).locator('[data-management-projection-text]');
  const detail = text.locator('xpath=ancestor::details[1]');
  if (!await detail.evaluate(node => (node as HTMLDetailsElement).open)) {
    await detail.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
  }
  await expect(detail).toHaveJSProperty('open', true); await expect(text).toBeVisible();
  await expect(text.locator('*')).toHaveCount(0);
  expect(await text.evaluate(node => getComputedStyle(node).whiteSpace)).toMatch(/pre-wrap|break-spaces/);
  const value = (await text.textContent())!;
  expect(value).toMatch(/^Management projection \| Model projection, not observed colony readings\./);
  expect(value.length).toBeLessThan(1200);
  return value;
}
async function shownReadings(page: Page) {
  const result: Record<string, string> = {};
  for (const id of ['baseline', 'action', 'difference']) result[id] = (await page.locator('[data-preview-timeline-reading="' + id + '"]').textContent())!;
  return result;
}
async function assertFrozen(page: Page, text: string, readings: Record<string, string>, sourceDay: number, currentDay: number, selectedDay: number) {
  await expect(context(page)).toBeVisible(); await expect(context(page)).toHaveAccessibleName(/\S/);
  await expect(context(page)).toHaveAttribute('data-projection-state', 'valid');
  await expect(context(page).locator('[data-notebook-projection-status]')).toContainText('Saved from Day ' + sourceDay + ' · Current Day ' + currentDay + ' · Projected Day ' + selectedDay + '.');
  await expect(context(page).locator('[data-notebook-projection-text]')).toHaveText(text);
  for (const id of ['baseline', 'action', 'difference']) await expect(context(page).locator('[data-notebook-projection-reading="' + id + '"]')).toHaveText(readings[id]);
  await expect(context(page)).toContainText('Model projection, not observed colony readings.');
}
async function writePrediction(page: Page, key: 'Enter' | 'Space' = 'Enter') {
  await prediction(page).focus(); await page.keyboard.press(key);
  await expect(page.locator('[data-beehive-notebook="beekeeper"]')).toHaveJSProperty('open', true);
  await expect(field(page, 'prediction')).toBeFocused();
}
async function returnToComparison(page: Page) {
  const button = context(page).locator('[data-notebook-projection-return]');
  await expect(button).toHaveAccessibleName('Open current comparison');
  await button.focus(); await page.keyboard.press('Space');
  await expect(preview(page)).toHaveJSProperty('open', true); await expect(metric(page)).toBeFocused();
}
async function assertAppend(page: Page, text: string) {
  const before = await work(page); await save(page).focus(); await page.keyboard.press('Enter');
  await expect(field(page, 'evidence')).toBeFocused();
  const expected = JSON.parse(JSON.stringify(before));
  expected.beehive.notebookOpen = true;
  expected.beehive.notebook.beekeeper.evidence += '\n' + text.trim();
  expected.beehive.notebook.beekeeper.review.evidence = false;
  expect(await work(page)).toEqual(expected);
  await expect(field(page, 'evidence')).toHaveValue(expected.beehive.notebook.beekeeper.evidence);
  await expect(page.locator('[data-notebook-review="evidence"]')).not.toBeChecked();
  for (const id of ['prediction', 'explanation']) await expect(page.locator('[data-notebook-review="' + id + '"]')).toBeChecked();
}

test('projection writing captures exact selected readings and explicitly appends evidence while preserving notebook metadata and model state', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const initial = await work(page); await openPreview(page);
  await choice(page).selectOption('requeen'); await horizon(page).selectOption('30'); await metric(page).selectOption('queenHealth'); await projectedDay(page).selectOption('3');
  const firstText = await note(page), firstReadings = await shownReadings(page);
  expect(firstText).toContain('Requeen'); expect(firstText).toContain('Day 18'); expect(firstText).toContain('30');
  for (const value of Object.values(firstReadings)) expect(firstText).toContain(value);
  expect(await work(page)).toEqual(initial);
  await writePrediction(page);
  expect(await work(page)).toEqual({ ...initial, beehive: { ...initial.beehive, notebookOpen: true } });
  for (const id of ['prediction', 'evidence', 'explanation']) await expect(field(page, id)).toHaveValue(initial.beehive.notebook.beekeeper[id]);
  for (const id of ['prediction', 'evidence', 'explanation']) await expect(page.locator('[data-notebook-review="' + id + '"]')).toBeChecked();
  await assertFrozen(page, firstText, firstReadings, 15, 15, 18);
  const captured = await work(page); await returnToComparison(page); expect(await work(page)).toEqual(captured);
  await choice(page).selectOption('feed_bees'); await horizon(page).selectOption('7'); await metric(page).selectOption('syrup'); await projectedDay(page).selectOption('2');
  const feedText = await note(page), feedReadings = await shownReadings(page);
  expect(feedText).not.toBe(firstText); expect(feedText).toContain('Feed'); expect(feedText).toContain('Day 17');
  await assertFrozen(page, firstText, firstReadings, 15, 15, 18); expect(await work(page)).toEqual(captured);
  await assertAppend(page, feedText); await assertFrozen(page, feedText, feedReadings, 15, 15, 17);
  await expect(save(page)).toBeDisabled(); await expect(bridge(page).locator('[data-management-projection-status]')).toContainText(/already|added/i);
  const duplicate = await work(page); duplicate.beehive.notebook.beekeeper.review.evidence = true;
  await fixture(page, { notebook: duplicate.beehive.notebook }); const duplicateState = await work(page);
  await expect(save(page)).toBeDisabled(); await expect(page.locator('[data-notebook-review="evidence"]')).toBeChecked(); expect(await work(page)).toEqual(duplicateState);
  const fullNotebook = JSON.parse(JSON.stringify(initial.beehive.notebook)); fullNotebook.beekeeper.evidence = 'x'.repeat(1200);
  await fixture(page, { notebook: fullNotebook }); const fullState = await work(page);
  await expect(save(page)).toBeDisabled(); await expect(bridge(page).locator('[data-management-projection-status]')).toContainText(/room|full|1,200/i);
  await expect(prediction(page)).toBeEnabled(); await writePrediction(page, 'Space'); expect(await work(page)).toEqual(fullState);
  const exactNotebook = JSON.parse(JSON.stringify(fullNotebook)); exactNotebook.beekeeper.evidence = 'x'.repeat(1200 - feedText.trim().length - 1);
  await fixture(page, { notebook: exactNotebook }); await expect(save(page)).toBeEnabled(); await assertAppend(page, feedText);
  expect((await work(page)).beehive.notebook.beekeeper.evidence.length).toBe(1200);
  const beforeFeed = await work(page); await page.locator('[data-management-preview-locate]').click();
  await expect(page.locator('[data-management-choice="feed_bees"]')).toBeFocused(); await page.keyboard.press('Enter');
  const fed = await work(page); expect(fed.beehive.day).toBe(15); expect(fed.beehive.actionPoints).toBe(beforeFeed.beehive.actionPoints - 1);
  expect(fed.beehive.honey).toBe(beforeFeed.beehive.honey + 5); expect(fed.beehive.syrup).toBe(beforeFeed.beehive.syrup + 5);
  expect(fed.beehive.notebook).toEqual(beforeFeed.beehive.notebook); await assertFrozen(page, feedText, feedReadings, 15, 15, 17);
  await page.locator('[data-discovery-advance]').click(); const advanced = await work(page);
  expect(advanced.beehive.day).toBe(16); expect(advanced.beehive.notebook).toEqual(fed.beehive.notebook);
  await assertFrozen(page, feedText, feedReadings, 15, 16, 17);
  await preview(page).locator(':scope > summary').focus(); await page.keyboard.press('Enter'); await expect(preview(page)).toHaveJSProperty('open', false);
  await returnToComparison(page); expect(await work(page)).toEqual(advanced);
  expect(advanced.otherTool).toEqual(initial.otherTool); expect(errors).toEqual([]);
});

test('projection context remains a historical copy through role changes but never revives after conditions identity rewind Restore or Undo changes', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); await openPreview(page); await choice(page).selectOption('feed_bees'); await metric(page).selectOption('syrup'); await projectedDay(page).selectOption('2');
  const firstText = await note(page), firstReadings = await shownReadings(page); await writePrediction(page); await assertAppend(page, firstText);
  const original = await work(page), savedWriting = original.beehive.notebook;
  for (const role of ['queen', 'drone']) {
    await fixture(page, { viewMode: role }); await expect(context(page)).toHaveCount(0);
    expect((await work(page)).beehive.notebook).toEqual(savedWriting);
  }
  await fixture(page, { viewMode: 'beekeeper' }); await assertFrozen(page, firstText, firstReadings, 15, 15, 17);
  await fixture(page, { day: 16 }); await assertFrozen(page, firstText, firstReadings, 15, 16, 17);
  await fixture(page, { day: 15 }); await expect(context(page)).toHaveAttribute('data-projection-state', 'invalid');
  await expect(context(page).locator('[data-notebook-projection-status]')).toContainText(/back|rewind|earlier/i);
  await expect(context(page).locator('[data-notebook-projection-text]')).toHaveText(firstText);
  await fixture(page, { day: 16 }); await expect(context(page)).toHaveAttribute('data-projection-state', 'invalid');
  expect((await work(page)).beehive.notebook).toEqual(savedWriting);
  await writePrediction(page); await expect(context(page)).toHaveAttribute('data-projection-state', 'valid');
  for (const [change, restore] of [
    [{ simulationSeed: 888 }, { simulationSeed: 777 }],
    [{ experimentRunSerial: 4 }, { experimentRunSerial: 3 }],
    [{ modelVersion: original.beehive.modelVersion + '-changed' }, { modelVersion: original.beehive.modelVersion }],
    [{ subspecies: 'carniolan' }, { subspecies: 'italian' }],
    [{ apiarySite: 'urban' }, { apiarySite: 'meadow' }],
    [{ experimentEnvironment: { schemaVersion: 1, gardenBonus: 4, trackedFromDay: 0 } }, { experimentEnvironment: original.beehive.experimentEnvironment }],
    [{ experimentEnvironment: { schemaVersion: 1, gardenBonus: 0, trackedFromDay: 1 } }, { experimentEnvironment: original.beehive.experimentEnvironment }],
  ] as Array<[Record<string, unknown>, Record<string, unknown>]>) {
    const heldText = (await context(page).locator('[data-notebook-projection-text]').textContent())!;
    await fixture(page, change); await expect(context(page)).toHaveAttribute('data-projection-state', 'invalid');
    await expect(context(page).locator('[data-notebook-projection-status]')).not.toHaveText('');
    await fixture(page, restore); await expect(context(page)).toHaveAttribute('data-projection-state', 'invalid');
    await expect(context(page).locator('[data-notebook-projection-text]')).toHaveText(heldText);
    expect((await work(page)).beehive.notebook).toEqual(savedWriting);
    await writePrediction(page); await expect(context(page)).toHaveAttribute('data-projection-state', 'valid');
  }
  await fixture(page, { simulationSeed: null });
  await expect(prediction(page)).toBeDisabled(); await expect(save(page)).toBeDisabled();
  await expect(bridge(page).locator('[data-management-projection-status]')).toContainText(/known|recorded|seed|identity|unavailable/i);
  await fixture(page, { simulationSeed: 777 }); await expect(context(page)).toHaveAttribute('data-projection-state', 'invalid'); await writePrediction(page);
  for (const modelVersion of ['colony-daily-1.1', 'colony-daily-1.2:lab']) {
    await fixture(page, { modelVersion }); await expect(prediction(page)).toBeDisabled(); await expect(save(page)).toBeDisabled();
    await expect(bridge(page).locator('[data-management-projection-status]')).toContainText(/current.*model|model.*current/i);
    await fixture(page, { modelVersion: original.beehive.modelVersion });
    await expect(context(page)).toHaveAttribute('data-projection-state', 'invalid'); await writePrediction(page);
  }
  await fixture(page, { experimentEnvironment: null }); await expect(prediction(page)).toBeDisabled(); await expect(save(page)).toBeDisabled();
  await expect(bridge(page).locator('[data-management-projection-status]')).toContainText(/garden|environment|conditions|recorded/i);
  await fixture(page, { experimentEnvironment: original.beehive.experimentEnvironment }); await writePrediction(page);
  await fixture(page, { actionPoints: 0 }); const noActionPoints = await work(page);
  if (await preview(page).evaluate(node => (node as HTMLDetailsElement).open)) {
    await preview(page).locator(':scope > summary').focus(); await page.keyboard.press('Enter');
  }
  await context(page).locator('[data-notebook-projection-return]').focus(); await page.keyboard.press('Enter');
  await expect(preview(page)).toHaveJSProperty('open', true); await expect(metric(page)).toHaveCount(0);
  await expect(choice(page)).toBeFocused(); expect(await work(page)).toEqual(noActionPoints);
  await fixture(page, { actionPoints: original.beehive.actionPoints }); await expect(bridge(page)).toBeVisible();
  const beforeBackup = await work(page), backup = page.locator('[data-beehive-backup]');
  if (!await backup.evaluate(node => (node as HTMLDetailsElement).open)) await backup.locator(':scope > summary').click();
  const restored = { ...beforeBackup.beehive, honey: beforeBackup.beehive.honey + 1 };
  await page.locator('[data-bee-backup-file]').setInputFiles({ name: 'same-run-projection-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'alloflow-beehive-backup', schemaVersion: 1, createdAt: '2026-10-10T17:00:00Z', state: restored })) });
  await expect(page.locator('[data-bee-backup-restore]')).toBeVisible(); await page.locator('[data-bee-backup-restore]').click();
  await expect(context(page)).toHaveCount(0); expect((await work(page)).beehive.notebook).toEqual(savedWriting);
  await openPreview(page); await writePrediction(page); await expect(context(page)).toHaveAttribute('data-projection-state', 'valid');
  await page.locator('[data-bee-backup-undo]').click(); await expect(context(page)).toHaveCount(0);
  const undone = await work(page); expect(undone.beehive.notebook).toEqual(savedWriting); expect(undone.beehive.honey).toBe(beforeBackup.beehive.honey);
  expect(undone.otherTool).toEqual(original.otherTool); expect(errors).toEqual([]);
});

async function auditProjection(page: Page) {
  for (const scope of [bridge(page), context(page)]) {
    const violations = await scope.evaluate(async node => {
      const audit = await (window as any).axe.run(node, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } },
      });
      return audit.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((entry: any) => entry.target) }));
    });
    expect(violations).toEqual([]);
    const layout = await scope.evaluate(node => {
      const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const elements = [node, ...Array.from(node.querySelectorAll('div,label,p,strong,span,button,summary,details,pre,h4,dl,dt,dd'))];
      return {
        overflow: elements.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ tag: el.tagName, text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
        text: elements.filter(el => el !== node && !['DIV', 'DETAILS', 'DL'].includes(el.tagName)).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize) / rootFont, ellipsis: getComputedStyle(el).textOverflow })),
        controls: Array.from(node.querySelectorAll('button,summary')).map(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })),
        pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(layout.overflow).toEqual([]); expect(layout.pageOverflow).toBeLessThanOrEqual(1);
    for (const item of layout.text) { expect(item.size, item.text || '').toBeGreaterThanOrEqual(.875); expect(item.ellipsis).not.toBe('ellipsis'); }
    for (const control of layout.controls) { expect(control.width).toBeGreaterThanOrEqual(44); expect(control.height).toBeGreaterThanOrEqual(44); }
  }
  for (const control of [prediction(page), save(page), context(page).locator('[data-notebook-projection-return]')]) {
    await control.focus(); await expect(control).toBeFocused();
    const style = await control.evaluate(node => {
      const css = getComputedStyle(node); return { outlineStyle: css.outlineStyle, outlineWidth: parseFloat(css.outlineWidth) };
    });
    expect(style.outlineStyle).not.toBe('none'); expect(style.outlineWidth).toBeGreaterThanOrEqual(2);
  }
}
async function captureProjection(page: Page, mode: string) {
  await bridge(page).screenshot({ path: artifacts + '/preview-projection-' + mode + '.png', animations: 'disabled', timeout: 120000 });
  await context(page).screenshot({ path: artifacts + '/preview-projection-context-' + mode + '.png', animations: 'disabled', timeout: 120000 });
}
async function ensureProjectionDetailsOpen(page: Page, expectedText: string) {
  for (const text of [bridge(page).locator('[data-management-projection-text]'), context(page).locator('[data-notebook-projection-text]')]) {
    const details = text.locator('xpath=ancestor::details[1]');
    await expect(details).toHaveCount(1);
    if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) {
      await details.locator(':scope > summary').focus(); await page.keyboard.press('Enter');
    }
    await expect(details).toHaveJSProperty('open', true); await expect(text).toBeVisible();
    await expect(text).toHaveText(expectedText); await expect(text.locator('*')).toHaveCount(0);
    expect(await text.evaluate(node => getComputedStyle(node).whiteSpace)).toMatch(/pre-wrap|break-spaces/);
  }
}

test('projection notebook stays readable with clear keyboard focus in wide phone dark forced colors and enlarged text views', async ({ page }) => {
  await mount(page); await openPreview(page); await choice(page).selectOption('requeen'); await horizon(page).selectOption('30');
  await metric(page).selectOption('workers'); await projectedDay(page).selectOption('22');
  const text = await note(page), readings = await shownReadings(page); await writePrediction(page);
  const unchanged = await work(page); await assertFrozen(page, text, readings, 15, 15, 37);
  await ensureProjectionDetailsOpen(page, text); await auditProjection(page); await captureProjection(page, 'wide');
  await fixture(page, { focusLayout: false }); await ensureProjectionDetailsOpen(page, text);
  await page.setViewportSize({ width: 320, height: 1800 }); await ensureProjectionDetailsOpen(page, text);
  await auditProjection(page); await captureProjection(page, 'mobile');
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = true; w.__rerender(); });
  await ensureProjectionDetailsOpen(page, text); await auditProjection(page); await captureProjection(page, 'dark');
  await page.emulateMedia({ forcedColors: 'active' }); await ensureProjectionDetailsOpen(page, text); await auditProjection(page); await captureProjection(page, 'forced');
  await page.emulateMedia({ forcedColors: 'none' }); await ensureProjectionDetailsOpen(page, text);
  await page.evaluate(() => { const w = window as any; w.__ctx.isDark = false; w.__rerender(); document.documentElement.style.fontSize = '32px'; });
  await ensureProjectionDetailsOpen(page, text); await auditProjection(page); await captureProjection(page, 'large');
  await assertFrozen(page, text, readings, 15, 15, 37); expect(await note(page)).toBe(text);
  expect(await work(page)).toEqual({ ...unchanged, beehive: { ...unchanged.beehive, focusLayout: false } });
});
