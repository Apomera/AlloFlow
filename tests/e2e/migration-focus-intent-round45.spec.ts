import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, data, openDetails, settled } from './helpers/migration_round31';

test.describe.configure({ timeout: 150_000, retries: 0 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round45-2026-10-24');
const sourcePath = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirrorPath = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(sourcePath), hash = createHash('sha256').update(source).digest('hex');
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const errors = new WeakMap<Page, string[]>();
const stage = (page: Page) => page.locator('#migration-flight-stage');
const evidence = (page: Page) => page.locator('#migration-experiment-evidence');
const evidenceReturn = (page: Page) => page.locator('[data-trial-evidence-return]');
const challenge = (page: Page) => page.locator('[data-migration-flight-challenges]');
const row = (page: Page) => page.locator('[data-flight-challenge-attempt="1"]');
const reflection = (page: Page) => row(page).locator('[data-flight-challenge-reflection]');
const reflectionAction = (page: Page, action: string) => row(page).locator('[data-flight-reflection-action="' + action + '"]');
const reflectionInput = (page: Page) => page.locator('[data-flight-reflection-input="1"]');

const snapshot = (wind = 0) => ({ speciesId: 'canada_goose', season: 'fall', wind, formationMode: 'natural' });
const windStart = () => ({ speciesId: 'monarch', season: 'fall', wind: -15, formationMode: 'natural' });
const trial = () => ({ variable: 'wind', prediction: 'My original trial prediction.', baseline: snapshot(), snapshot: snapshot(10) });
function challenges() {
  return { selectedId: 'wind', work: {
    wind: { prediction: 'My current challenge prediction.', notes: 'My current challenge reasoning.', setup: windStart(), attempts: [
      { baseline: windStart(), snapshot: { ...windStart(), wind: 4 }, prediction: 'My original saved prediction.', notes: 'My original saved explanation.' }
    ] },
    formation: { prediction: 'Keep my other goal prediction.', notes: '', setup: null, attempts: [] },
    season: { prediction: '', notes: '', setup: null, attempts: [] }
  } };
}
const savedWork = (state: any) => Object.fromEntries(['inquiry', 'flightInvestigation', 'flightChallenges', 'flightStudyObservations'].map(key => [key, state[key]]));
function unchangedSource() {
  expect(readFileSync(sourcePath).equals(source), 'source changed during browser verification').toBe(true);
  expect(readFileSync(mirrorPath).equals(source), 'desktop mirror differs from tested source').toBe(true);
}
test.beforeAll(async () => { unchangedSource(); mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => { expect(errors.get(page) || []).toEqual([]); unchangedSource(); await harness.destroy(page); });

async function paint(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); await paint(page); }
async function openScene(page: Page, dark = false) {
  const failures: string[] = []; errors.set(page, failures); page.on('pageerror', error => failures.push(error.stack || error.message));
  await mount(harness, page, 'canada_goose', { dark, reduced: true, extra: {
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1.2,
    inquiry: { hypothesis: 'Keep the independent inquiry.' },
    flightInvestigation: { variable: 'wind', prediction: 'Keep the current investigation prediction.', baseline: snapshot(), trials: [trial()], evidence: 'Keep my evidence draft.', explanation: 'Keep my current reasoning.' },
    flightChallenges: challenges(),
    flightStudyObservations: { drafts: { 'canada_goose:tail': 'Keep my independent Study draft.' }, records: {} }
  } });
  await settled(page);
}
async function openTrial(page: Page) {
  await activate(page, page.locator('[data-experiment-revisit="1"]'));
  await expect(page.locator('[data-experiment-pair-review]')).toBeVisible();
  await expect(evidenceReturn(page)).toHaveAccessibleName('Add evidence');
}
async function openReflection(page: Page) {
  await openDetails(page, challenge(page));
  await openDetails(page, challenge(page).locator('[data-flight-challenge-history]'));
  await openDetails(page, reflection(page));
  await activate(page, reflectionAction(page, 'edit'));
  await expect(reflectionInput(page)).toBeFocused();
}
async function inspectAttempt(page: Page) {
  await activate(page, row(page).locator('[data-flight-challenge-inspect="snapshot"]'));
  await expect(page.locator('[data-flight-challenge-inspection]')).toHaveAttribute('data-inspection-state', 'ready');
  await expect(page.locator('[data-flight-challenge-return]')).toBeVisible();
}
async function scan(page: Page) {
  await page.addScriptTag({ path: join(process.cwd(), 'axe-core/4.12.1/axe.min.js') });
  const result = await page.evaluate(async () => {
    const audit = await (window as any).axe.run(document.querySelector('.migration-tool-shell'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
    });
    return { violations: audit.violations, incomplete: audit.incomplete.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) };
  });
  expect(result.violations).toEqual([]); return result;
}

// Fullscreen completion is deliberately controlled so focus can be moved
// between the user action and its promise settlement. WebGL and DOM stay real.
// Native OS fullscreen transitions remain a manual verification item.
async function installDeferredFullscreen(page: Page) {
  await page.evaluate(() => {
    const w = window as any; w.__focus45Exits = []; w.__focus45Fullscreen = document.querySelector('#migration-flight-deck');
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => w.__focus45Fullscreen });
    document.exitFullscreen = () => new Promise<void>((resolve, reject) => w.__focus45Exits.push({ resolve, reject }));
  });
}
async function setFullscreen(page: Page) {
  await page.evaluate(() => { (window as any).__focus45Fullscreen = document.querySelector('#migration-flight-deck'); });
}
async function settleExit(page: Page, index: number, options: { reject?: boolean; clear?: boolean } = {}) {
  await page.evaluate(({ index, reject, clear }) => {
    const w = window as any;
    if (clear !== false) w.__focus45Fullscreen = null;
    if (reject) w.__focus45Exits[index].reject(new Error('Fullscreen exit rejected for this verification.'));
    else w.__focus45Exits[index].resolve();
  }, { index, ...options });
  await paint(page);
}
async function exitCount(page: Page) { return page.evaluate(() => (window as any).__focus45Exits.length); }

test('saved-pair evidence navigation respects focus movement and the latest fullscreen request', async ({ page }) => {
  await openScene(page); await openTrial(page); const before = await data(page);
  await activate(page, evidenceReturn(page)); await expect(evidence(page)).toBeFocused();
  expect(savedWork(await data(page))).toEqual(savedWork(before));

  await installDeferredFullscreen(page);
  await activate(page, evidenceReturn(page)); expect(await exitCount(page)).toBe(1);
  await expect(evidenceReturn(page)).toBeFocused();
  const other = page.locator('#migration-experiment-prediction'); await other.focus();
  await settleExit(page, 0); await expect(other).toBeFocused();

  await setFullscreen(page); await activate(page, evidenceReturn(page));
  await activate(page, evidenceReturn(page)); expect(await exitCount(page)).toBe(3);
  await settleExit(page, 1); await expect(evidenceReturn(page)).toBeFocused();
  await settleExit(page, 2); await expect(evidence(page)).toBeFocused();

  await setFullscreen(page); await activate(page, evidenceReturn(page));
  await settleExit(page, 3, { reject: true, clear: false }); await expect(evidenceReturn(page)).toBeFocused();
  await activate(page, evidenceReturn(page));
  await settleExit(page, 4, { clear: false }); await expect(evidenceReturn(page)).toBeFocused();
  expect(savedWork(await data(page))).toEqual(savedWork(before));
  await page.evaluate(() => { (window as any).__focus45Fullscreen = null; });
  const audit = await scan(page);
  writeFileSync(join(report, 'pair-evidence-focus-proof.json'), JSON.stringify({ hash, fullscreenApi: 'Controlled deferred exit; native OS transition not exercised', before, final: await data(page), requests: await exitCount(page), audit }, null, 2));
});

test('challenge inspection returns to its own reflection and cancels a late return after navigation', async ({ page }) => {
  await openScene(page); await openReflection(page);
  await reflectionInput(page).fill('Keep my unsaved later reflection.'); const before = await data(page);
  await inspectAttempt(page); await activate(page, page.locator('[data-flight-challenge-return]'));
  await expect(reflectionInput(page)).toBeFocused(); await expect(reflectionInput(page)).toHaveValue('Keep my unsaved later reflection.');
  expect(savedWork(await data(page))).toEqual(savedWork(before));

  await inspectAttempt(page); await installDeferredFullscreen(page);
  await activate(page, page.locator('[data-flight-challenge-return]')); expect(await exitCount(page)).toBe(1);
  await activate(page, page.locator('[data-migration-tab="vformation"]'));
  await settleExit(page, 0); await expect(page.locator('[data-migration-tab="vformation"]')).toBeFocused();
  await expect(page.locator('[data-migration-tab="vformation"]')).toHaveAttribute('aria-selected', 'true');
  expect(savedWork(await data(page))).toEqual(savedWork(before));
  await activate(page, page.locator('[data-migration-tab="flight3d"]'));
  await expect(stage(page)).toHaveAttribute('data-flight-ready', 'true');
  await openDetails(page, challenge(page)); await openDetails(page, challenge(page).locator('[data-flight-challenge-history]'));
  await openDetails(page, reflection(page));
  await expect(reflectionInput(page)).toHaveValue('Keep my unsaved later reflection.');
  const audit = await scan(page);
  writeFileSync(join(report, 'challenge-reflection-return-proof.json'), JSON.stringify({ hash, before, final: await data(page), fullscreenApi: 'Controlled deferred exit', audit }, null, 2));
});

test('saving and cancelling a reflection retain an owned keyboard destination across delayed saves', async ({ page }) => {
  await openScene(page, true); await openReflection(page); const before = await data(page);
  await reflectionInput(page).fill('My later reflection belongs to this saved attempt.');
  await page.evaluate(() => {
    const w = window as any; w.__focus45SavedPatches = [];
    const update = w.__ctx.update;
    w.__ctx.update = function(bucket: string, key: string, value: any) {
      if (bucket === 'migration' && key === 'flightChallenges') { w.__focus45SavedPatches.push({ bucket, key, value }); return; }
      return update.apply(this, arguments);
    };
    w.__focus45FlushSave = () => { for (const item of w.__focus45SavedPatches.splice(0)) update.call(w.__ctx, item.bucket, item.key, item.value); };
  });
  await activate(page, reflectionAction(page, 'save')); await expect(reflectionAction(page, 'edit')).toBeFocused();
  expect((await data(page)).flightChallenges).toEqual(before.flightChallenges);
  await evidence(page).focus();
  await page.evaluate(() => (window as any).__focus45FlushSave()); await paint(page);
  await expect(evidence(page)).toBeFocused();
  const saved = await data(page), recorded = saved.flightChallenges.work.wind.attempts[0];
  expect(recorded.reflection).toBe('My later reflection belongs to this saved attempt.');
  expect(recorded.prediction).toBe(before.flightChallenges.work.wind.attempts[0].prediction);
  expect(recorded.notes).toBe(before.flightChallenges.work.wind.attempts[0].notes);
  expect(saved.flightInvestigation).toEqual(before.flightInvestigation); expect(saved.flightStudyObservations).toEqual(before.flightStudyObservations);

  await openReflection(page); await reflectionInput(page).fill('This draft will be cancelled.');
  await activate(page, reflectionAction(page, 'cancel')); await expect(reflectionAction(page, 'edit')).toBeFocused();
  expect(savedWork(await data(page))).toEqual(savedWork(saved));
  await page.setViewportSize({ width: 320, height: 1000 }); await reflectionAction(page, 'edit').focus();
  const focus = await reflectionAction(page, 'edit').evaluate(node => {
    const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
    return { left: rect.left, right: rect.right, width: innerWidth, outline: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focus.left).toBeGreaterThanOrEqual(0); expect(focus.right).toBeLessThanOrEqual(focus.width + 1);
  expect(focus.outline).toBe('solid'); expect(parseFloat(focus.outlineWidth)).toBeGreaterThanOrEqual(2);
  const audit = await scan(page); await reflection(page).screenshot({ path: join(report, 'reflection-return-mobile.png') });
  writeFileSync(join(report, 'reflection-save-cancel-focus-proof.json'), JSON.stringify({ hash, before, saved, final: await data(page), focus, audit }, null, 2));
});

test('remaining Study comparison actions report their result locally while keeping focus and learner work', async ({ page }) => {
  await openScene(page); const before = await data(page), feedback = page.locator('[data-scene-feedback]');
  const fit = page.locator('[data-scene-study-action="fit"]'), turn = page.locator('[data-scene-study-action="half-turn"]');
  await expect(fit).toBeEnabled(); await activate(page, fit); await expect(fit).toBeFocused();
  await expect(feedback).toContainText('Whole model fitted.');
  await activate(page, turn); await expect(turn).toBeFocused(); await expect(feedback).toContainText(/turned 180 degrees/i); await settled(page);
  await activate(page, page.locator('[data-study-cycle-position="2"]'));
  const next = page.locator('[data-scene-study-action="next"]'), previous = page.locator('[data-scene-study-action="previous"]');
  await expect(next).toBeEnabled(); await activate(page, next); await expect(next).toBeFocused();
  await expect(feedback).toContainText('Selected cycle position 4/8');
  await expect(previous).toBeEnabled(); await activate(page, previous); await expect(previous).toBeFocused();
  await expect(feedback).toContainText('Selected cycle position 3/8');
  const opposite = page.locator('[data-scene-study-action="opposite"]');
  await expect(opposite).toBeEnabled(); await activate(page, opposite); await expect(opposite).toBeFocused();
  await expect(feedback).toContainText('Selected opposite cycle position 7');
  const message = await feedback.textContent(); await paint(page); await expect(feedback).toHaveText(message!);
  expect(savedWork(await data(page))).toEqual(savedWork(before));
  const audit = await scan(page);
  writeFileSync(join(report, 'study-comparison-feedback-proof.json'), JSON.stringify({ hash, before, final: await data(page), message, audit }, null, 2));
});
