import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ video: 'off' });
test.describe.configure({ retries: 0, timeout: 90000 });
const out = path.resolve(process.env.MICROBIOLOGY_REPORT_DIR || 'reports/micro-lab-experiment-design-2026-10-01');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_microbiology.js', toolId: 'microbiology', width: 1280, height: 960, layout: 'document' });
let errors: string[];
test.beforeAll(async () => { mkdirSync(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => { errors = []; page.on('pageerror', error => errors.push(error.message)); });
test.afterEach(async ({ page }) => { try { expect(errors).toEqual([]); } finally { await harness.unmount(page); } });
const state = (page: Page) => page.evaluate(() => (window as any).__toolData.microbiology);
async function mount(page: Page, seed: Record<string, unknown>) {
  await page.setViewportSize({ width: 1280, height: 960 });
  await harness.mount(page, { microbiology: seed }, undefined, { expectCanvas: false });
  await page.addStyleTag({ content: '#wrap{width:100%!important}body{margin:0;font-family:system-ui,sans-serif}button,input,select,textarea{font-family:inherit}' });
}
async function reload(page: Page) {
  const saved = JSON.parse(JSON.stringify(await state(page))); await harness.unmount(page);
  await page.evaluate(data => (window as any).__mount({ microbiology: data }), saved); return saved;
}
async function phone(page: Page) {
  await page.setViewportSize({ width: 320, height: 844 });
  await noOverflow(page);
}
async function open(details: Locator) {
  if (!await details.evaluate(node => (node as HTMLDetailsElement).open)) await details.locator(':scope > summary').press('Enter');
  await expect(details).toHaveAttribute('open', '');
}
async function download(page: Page, button: Locator, name: string) {
  await button.focus(); const pending = page.waitForEvent('download'); await page.keyboard.press('Enter');
  const file = await pending; const text = readFileSync((await file.path())!, 'utf8'); await file.saveAs(path.join(out, name));
  await expect(button).toBeFocused(); return text;
}

const base = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
const changed = { profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 35 };
const design = (page: Page) => page.locator('#gl-design-preview');
async function setRange(control: Locator, value: number) {
  await control.evaluate((node, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  await expect(control).toHaveValue(String(value));
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  for (const selector of ['[data-microbiology-tool]', '[data-micro-resistance-workspace]']) {
    const panels = page.locator(selector);
    if (await panels.count()) expect(await panels.evaluate(node => node.scrollWidth <= node.clientWidth + 1), selector).toBe(true);
  }
}

test('planned Growth settings explain missing, same, one and multiple differences without revealing outcomes', async ({ page }) => {
  await mount(page, { tab: 'growthLab', growthLab: base });
  const before = await state(page);
  await expect(design(page)).toHaveAttribute('data-growth-design', 'unavailable');
  await expect(page.locator('#gl-design-status')).toContainText('Save a control');
  await expect(page.locator('#gl-design-table tbody tr')).toHaveCount(4);
  await expect(page.locator('#gl-design-table')).toHaveAccessibleName('Saved control and proposed trial settings');
  await expect(design(page).getByRole('region')).toHaveAttribute('aria-describedby', 'gl-design-table-help');
  await expect(page.locator('#gl-design-table-help')).toContainText('scroll the table sideways');
  await expect(page.locator('#gl-saved-result')).toHaveCount(0);
  expect(await state(page)).toEqual(before);
  await page.getByRole('button', { name: 'Use current conditions as control', exact: true }).click();
  await expect(design(page)).toHaveAttribute('data-growth-design', 'none');
  await setRange(page.locator('#gl-oxygen'), 35);
  await expect(design(page)).toHaveAttribute('data-growth-design', 'single');
  await expect(page.locator('#gl-design-status')).toContainText('Oxygen availability');
  await page.locator('#gl-profile').selectOption('thermus');
  await expect(design(page)).toHaveAttribute('data-growth-design', 'confounded');
  await expect(page.locator('#gl-design-guidance')).toContainText('You can still run it');
  const shape = await page.evaluate(() => (window as any).__MicrobiologyCore.growth.designPreview(
    (window as any).__toolData.microbiology.growthInvestigation.control, (window as any).__toolData.microbiology.growthLab));
  expect(Object.keys(shape).sort()).toEqual(['changed', 'control', 'design', 'held', 'trial']);
  expect(shape.changed).toEqual(['profile', 'oxygen']); expect(shape.held).toEqual(['tempC', 'pH']);
  await expect(page.locator('#gl-design-status')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('#gl-design-status')).toHaveAttribute('aria-atomic', 'true');
  expect(await page.locator('#gl-design-status table').count()).toBe(0);
  await expect(page.locator('#gl-saved-result')).toHaveCount(0);
  expect((await state(page)).growthInvestigation.trials || []).toHaveLength(0);
  await phone(page); await design(page).screenshot({ path: path.join(out, 'growth-design-preview-phone.png') });
  await reload(page); await expect(design(page)).toHaveAttribute('data-growth-design', 'confounded');
});

test('preparing one Growth difference preserves saved evidence, recovery, sweeps and all working responses', async ({ page }) => {
  const trial = { id: 7, control: base, conditions: { ...base, oxygen: 50 }, prediction: 'lower', hypothesis: 'Original trial hypothesis.', explanation: 'Original saved explanation.' };
  const removed = { trial: { ...trial, id: 9, conditions: { ...base, pH: 6 }, hypothesis: 'Recoverable hypothesis.' }, index: 1 };
  await mount(page, { tab: 'growthLab', growthReviewHour: 6,
    growthLab: { ...changed, understood: true, stuckRevealed: true, hypothesis: 'Independent legacy note.', explanation: 'Independent legacy explanation.', log: [{ note: 'Keep this legacy log.' }] },
    growthInvestigation: { control: base, trials: [trial], removed, selectedId: 7, nextId: 10, prediction: 'unsure', hypothesis: 'My next prediction reasoning.', explanation: 'Independent notebook note.',
      sweep: { variable: 'oxygen', conditions: base }, previousSweep: { variable: 'pH', conditions: { ...changed, oxygen: 100 } }, sweepVariable: 'pH' },
    mysteryLab: { active: 'wall' }, quizAnswers: [1, 2] });
  const before = await state(page), savedView = await page.locator('#gl-saved-result').innerText();
  await page.locator('#gl-design-variable').selectOption('oxygen');
  expect(await state(page)).toEqual(before);
  await page.locator('#gl-design-prepare').press('Enter');
  await expect(page.locator('#gl-design-heading')).toBeFocused();
  await expect(design(page)).toHaveAttribute('data-growth-design', 'single');
  let saved = await state(page);
  expect(saved.growthLab).toEqual({ ...before.growthLab, ...base, oxygen: 35 });
  expect(saved.growthInvestigation).toEqual(before.growthInvestigation);
  expect(saved.growthReviewHour).toBe(6); expect(saved.mysteryLab).toEqual(before.mysteryLab); expect(saved.quizAnswers).toEqual(before.quizAnswers);
  expect(await page.locator('#gl-saved-result').innerText()).toBe(savedView);
  await expect(page.getByRole('button', { name: 'Run comparison', exact: true })).toBeEnabled();
  await expect(page.locator('#gl-design-prepare')).toHaveCount(0);
  await phone(page); await design(page).screenshot({ path: path.join(out, 'growth-design-repair-phone.png') });
  await reload(page); saved = await state(page);
  await expect(design(page)).toHaveAttribute('data-growth-design', 'single'); expect(saved.growthInvestigation).toEqual(before.growthInvestigation);
  expect(saved.growthLab).toEqual({ ...before.growthLab, ...base, oxygen: 35 });
});

test('Growth still permits unchanged and multiple-difference exploration with the original saved prediction', async ({ page }) => {
  await mount(page, { tab: 'growthLab', growthLab: base, growthInvestigation: { control: base, prediction: 'unsure', hypothesis: 'Explore first.' } });
  const run = page.getByRole('button', { name: 'Run comparison', exact: true });
  await expect(design(page)).toHaveAttribute('data-growth-design', 'none'); await expect(run).toBeEnabled(); await run.press('Enter');
  let saved = await state(page); expect(saved.growthInvestigation.trials).toHaveLength(1);
  expect(saved.growthInvestigation.trials[0].conditions).toEqual(base); expect(saved.growthInvestigation.trials[0].prediction).toBe('unsure');
  await setRange(page.locator('#gl-pH'), 6); await setRange(page.locator('#gl-oxygen'), 50);
  await expect(design(page)).toHaveAttribute('data-growth-design', 'confounded'); await expect(run).toBeEnabled(); await run.press('Enter');
  saved = await state(page); expect(saved.growthInvestigation.trials).toHaveLength(2);
  expect(saved.growthInvestigation.trials[1].conditions).toEqual({ ...base, pH: 6, oxygen: 50 });
  expect(saved.growthInvestigation.trials[1].prediction).toBe('unsure');
  await expect(page.locator('#gl-saved-result [data-design="confounded"]')).toBeVisible();
});

test('Growth setup preparation respects a later focus-only move to an activity tab', async ({ page }) => {
  await mount(page, { tab: 'growthLab', growthLab: { ...changed, understood: true, stuckRevealed: true, hypothesis: 'Legacy reasoning.', explanation: 'Legacy explanation.', log: [{ note: 'Focus legacy log.' }] }, growthInvestigation: { control: base, prediction: 'unsure', hypothesis: 'Keep my reasoning.' } });
  await page.locator('#gl-design-variable').selectOption('tempC'); const originalSetup = (await state(page)).growthLab;
  await page.evaluate(() => {
    const original = window.setTimeout; (window as any).__originalFocusTimeout = original; (window as any).__pendingDesignFocus = [];
    window.setTimeout = ((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
      if (delay === 0) { (window as any).__pendingDesignFocus.push(() => callback(...args)); return 0; }
      return original(callback, delay, ...args);
    }) as typeof window.setTimeout;
  });
  await page.locator('#gl-design-prepare').click(); const nextFocus = page.locator('#micro-tab-quiz'); await nextFocus.focus(); const before = await state(page);
  await page.evaluate(() => { window.setTimeout = (window as any).__originalFocusTimeout; for (const callback of (window as any).__pendingDesignFocus) callback(); delete (window as any).__pendingDesignFocus; delete (window as any).__originalFocusTimeout; });
  await expect(nextFocus).toBeFocused(); expect(await state(page)).toEqual(before); await expect(page.locator('#micro-tab-growthLab')).toHaveAttribute('aria-selected', 'true');
  expect(before.growthLab).toEqual({ ...originalSetup, ...base, tempC: 70 }); expect(before.growthInvestigation.hypothesis).toBe('Keep my reasoning.');
});

test('Resistance phone layout keeps readable help, large controls and shape-based chart descriptions', async ({ page }) => {
  await mount(page, { tab: 'resistance' }); const panel = page.locator('[data-micro-resistance-workspace]');
  const exposure = page.getByRole('slider', { name: 'Antibiotic exposure strength in the teaching model', exact: true });
  await expect(exposure).toHaveAttribute('aria-describedby', /micro-resistance-exposure-help/);
  await expect(page.getByRole('slider', { name: 'Number of exposure rounds in the teaching model', exact: true })).toHaveAttribute('aria-describedby', /micro-resistance-rounds-help/);
  await expect(page.getByRole('slider', { name: 'Initial resistance', exact: true })).toHaveAttribute('aria-describedby', /micro-resistance-initial-help/);
  await expect(page.locator('#micro-resistance-share-help')).toContainText('With no survivors, the share is undefined.');
  await expect(page.getByRole('img', { name: /^Resistance trend/ })).toHaveAttribute('aria-describedby', 'micro-resistance-share-help');
  await expect(page.locator('[data-resistance-shape-legend]')).toContainText('sensitive circles');
  await expect(page.locator('[data-resistance-shape-legend]')).toContainText('resistant diamonds');
  const before = await state(page); await phone(page); await noOverflow(page);
  for (const selector of ['#micro-resistance-share-help', '#micro-resistance-exposure-help', '[data-resistance-shape-legend]'])
    expect(await page.locator(selector).evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(13);
  for (const target of [exposure, page.getByRole('button', { name: 'Step round', exact: true }), page.getByRole('button', { name: '▶ Play', exact: true })])
    expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await state(page)).toEqual(before);
  await panel.screenshot({ path: path.join(out, 'resistance-readable-phone.png') });
});

test('Resistance reflows at enlarged text and retains keyboard controls, current run and saved notebook', async ({ page }) => {
  const evidence = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', history: [{ day: 0, sensitive: 72, resistant: 8 }] };
  const savedEvidence = { ...evidence, notes: 'Original saved notes.', history: [...evidence.history, { day: 1, sensitive: 60, resistant: 8 }] };
  await mount(page, { tab: 'resistance', resistanceInvestigation: evidence,
    resistanceNotebook: { records: [{ id: 7, evidence: savedEvidence, reviewNote: 'Later saved reflection.' }], selectedId: 7 } });
  await open(page.locator('.micro-resistance-saved'));
  await expect(page.locator('[data-resistance-evidence="7"]')).toBeVisible();
  await expect(page.locator('[data-resistance-evidence="7"]')).toContainText('Original saved notes.');
  await expect(page.locator('#micro-resistance-reflection-7')).toHaveValue('Later saved reflection.');
  await page.emulateMedia({ reducedMotion: 'reduce' }); const before = await state(page);
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; }); await noOverflow(page);
  await page.locator('[data-micro-resistance-workspace]').screenshot({ path: path.join(out, 'resistance-readable-zoom.png') });
  await page.evaluate(() => { document.documentElement.style.zoom = '4'; }); await noOverflow(page);
  expect(await state(page)).toEqual(before);
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  const exposure = page.getByRole('slider', { name: 'Antibiotic exposure strength in the teaching model', exact: true });
  await exposure.focus(); await exposure.press('ArrowRight'); await expect(exposure).toHaveValue('35');
  await page.getByRole('radio', { name: 'Increase', exact: true }).press('Space');
  await page.getByRole('button', { name: 'Step round', exact: true }).press('Enter');
  await expect.poll(async () => (await state(page)).resistanceInvestigation.day).toBe(1);
  const saved = await state(page); expect(saved.resistanceNotebook).toEqual(before.resistanceNotebook);
  await expect(exposure).toBeDisabled(); await expect(page.getByRole('img', { name: /^Petri dish model/ })).toHaveAccessibleName(/exposure round 1/);
});
