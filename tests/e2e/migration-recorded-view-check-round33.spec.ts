import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, stage, frames, activate, openDetails, data, writes, accessibility } from './helpers/migration_round31';

test.describe.configure({ retries: 0, timeout: 150_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round33-2026-10-22');
const source = readFileSync(join(process.cwd(), 'stem_lab/stem_tool_migration.js'));
if (!source.equals(readFileSync(join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js')))) throw new Error('Migration runtime copies differ');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE || Object.keys(process.env).some(k => /^MIGRATION_.*_CANDIDATE$/.test(k) && process.env[k])) throw new Error('Canonical regression rejects substitutions');
const sourceProof = { sha256: createHash('sha256').update(source).digest('hex'), bytes: source.length, canonical: true, mirrorIdentical: true };
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const fields = ['yaw', 'pitch', 'zoom', 'bird', 'wingStep', 'paused', 'motionReduced'];
const panel = (page: Page, which: string) => page.locator('[data-study-view-check="' + which + '"]');
const result = (page: Page, which: string) => panel(page, which).locator('[data-study-view-check-result]');
const claim = (page: Page) => page.getByRole('textbox', { name: 'My observation comparison', exact: true });
const matched = (page: Page, which: string) => page.locator('[data-study-matched-comparison="' + which + '"]');
const clone = (value: any) => JSON.parse(JSON.stringify(value));
const learnerWork = (value: any) => Object.fromEntries(['flightStudyObservations', 'flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText'].map(key => [key, value[key]]));

test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

function seed() {
  const record = (speciesId: string, region: string, note: string) => ({ speciesId, region, note, yaw: 35, pitch: 15, zoom: 1.2, bird: 0, wingStep: 7, paused: true, motionReduced: false });
  const first = record('canada_goose', 'head', 'The Goose head has a long neck below it.');
  const oldSecond = record('peregrine', 'head', 'The Peregrine has a compact hooked bill.');
  const second = { ...oldSecond, yaw: -65, pitch: 30, zoom: 1.45, bird: 3, wingStep: 15, paused: false, motionReduced: true };
  return { flightStudyRegion: 'head', flightStudyObservations: {
    drafts: { 'canada_goose:head': 'My unfinished Goose observation.', 'peregrine:head': 'My unfinished Peregrine observation.' },
    records: { 'canada_goose:head': first, 'peregrine:head': second, 'monarch:whole-wing': { ...record('monarch', 'whole-wing', 'The Monarch wings have dark veins.'), yaw: 90 } },
    comparison: { firstKey: 'canada_goose:head', secondKey: 'peregrine:head', draft: 'My unfinished comparison draft.', feedback: '',
      saved: { firstKey: 'canada_goose:head', secondKey: 'peregrine:head', first: clone(first), second: clone(oldSecond), claim: 'My historical comparison claim.' } }
  }, flightInvestigation: { variable: 'wind', prediction: 'Keep my wind prediction.', evidence: 'Keep my wind evidence.', trials: [] },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge prediction.', notes: 'Keep my challenge reasoning.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep my migration hypothesis.', explanation: 'Keep my explanation.', trials: [] }, aiExplorerText: 'Keep my research.' };
}

async function rememberDraft(page: Page) {
  await claim(page).focus();
  await claim(page).evaluate(element => { const field = element as HTMLTextAreaElement; field.setSelectionRange(4, 18, 'backward'); (window as any).__round33ComparisonField = field; });
}
async function draftIdentity(page: Page) {
  return claim(page).evaluate(element => { const field = element as HTMLTextAreaElement; return { same: field === (window as any).__round33ComparisonField,
    value: field.value, start: field.selectionStart, end: field.selectionEnd, direction: field.selectionDirection }; });
}
async function readout(page: Page, which: string) {
  return result(page, which).locator('[data-view-condition]').evaluateAll(nodes => nodes.map(node => ({ field: node.getAttribute('data-view-condition'),
    matches: node.getAttribute('data-view-condition-match'), label: node.querySelector('dt')?.textContent, value: node.querySelector('dd')?.textContent })));
}
async function check(page: Page, which: string, touch: boolean) {
  const before = await data(page), beforeWrites = await writes(page), beforeDraft = await draftIdentity(page);
  const button = panel(page, which).locator('[data-study-view-check-action="check"]');
  await button.scrollIntoViewIfNeeded(); await expect(button).toBeInViewport();
  const box = await button.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
  await activate(page, button, touch);
  await expect(result(page, which)).toBeVisible();
  expect(await data(page)).toEqual(before); expect(await writes(page)).toEqual(beforeWrites); expect(await draftIdentity(page)).toEqual(beforeDraft);
  expect((await readout(page, which)).map(row => row.field)).toEqual(fields);
  if (!touch) await expect(button).toBeFocused();
  return { target: box, readout: await readout(page, which) };
}
async function verifyPanelFit(page: Page, locator: Locator) {
  const sizes = await locator.evaluate(element => {
    const own = element.getBoundingClientRect();
    return { width: innerWidth, left: own.left, right: own.right, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
      rows: [...element.querySelectorAll('[data-view-condition]')].map(row => { const r = row.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height }; }) };
  });
  expect(sizes.left).toBeGreaterThanOrEqual(0); expect(sizes.right).toBeLessThanOrEqual(sizes.width);
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth + 1);
  for (const row of sizes.rows) { expect(row.left).toBeGreaterThanOrEqual(sizes.left); expect(row.right).toBeLessThanOrEqual(sizes.right); expect(row.height).toBeGreaterThan(35); }
  return sizes;
}

async function journey(page: Page, touch: boolean) {
  await mount(harness, page, 'canada_goose', { dark: touch, extra: seed() });
  await openDetails(page, page.locator('[data-study-observation]'), touch);
  await openDetails(page, page.locator('[data-study-comparison]'), touch);
  await openDetails(page, page.locator('[data-study-selected-comparison-activity]'), touch);
  await claim(page).fill('My revised but unrecorded comparison uses both source notes.'); await frames(page); await rememberDraft(page);
  const initial = await data(page), initialDraft = await draftIdentity(page), preservedSaved = clone(initial.flightStudyObservations.comparison.saved);
  await expect(result(page, 'selected')).toHaveCount(0); await expect(result(page, 'saved')).toHaveCount(0);
  const selectedCheck = await check(page, 'selected', touch);
  await expect(panel(page, 'selected').locator('[data-study-view-check-status]')).toHaveText('Selected recorded observations: 7 of 7 recorded settings differ.');
  expect(selectedCheck.readout.every(row => row.matches === 'false')).toBe(true);
  expect(selectedCheck.readout.map(row => row.value)).toEqual([
    'First: 35°; Second: -65°Differs', 'First: 15°; Second: 30°Differs', 'First: 1.2×; Second: 1.45×Differs',
    'First: 1; Second: 4Differs', 'First: 7; Second: 15Differs', 'First: On; Second: OffDiffers', 'First: Off; Second: OnDiffers'
  ]);
  await expect(result(page, 'selected')).toContainText('step counter is not a recorded animation frame');
  await expect(result(page, 'selected')).toContainText('does not grade your explanation');
  const layout = await verifyPanelFit(page, panel(page, 'selected'));
  const stem = touch ? 'phone-dark-recorded-view-check' : 'desktop-recorded-view-check';
  const readoutImage = result(page, 'selected').locator('dl');
  await readoutImage.scrollIntoViewIfNeeded();
  const screenshot = await readoutImage.boundingBox();
  expect(screenshot).not.toBeNull();
  expect(screenshot!.width).toBeGreaterThan(150);
  expect(screenshot!.height).toBeGreaterThan(100);
  expect(screenshot!.height).toBeLessThan(page.viewportSize()!.height);
  await readoutImage.screenshot({ path: join(report, stem + '.png') });
  const savedCheck = await check(page, 'saved', touch);
  await expect(panel(page, 'saved').locator('[data-study-view-check-status]')).toHaveText('Saved comparison captures: All seven recorded settings match.');
  expect(savedCheck.readout.every(row => row.matches === 'true')).toBe(true);
  expect(await data(page)).toEqual(initial); expect(await draftIdentity(page)).toEqual(initialDraft);

  await activate(page, matched(page, 'selected').locator('[data-study-matched="second"]'), touch);
  const afterMatched = await data(page);
  expect(afterMatched).toMatchObject({ flightSpecies: 'peregrine', flightStudyRegion: 'head', flightCamera: 'study', flightPaused: true,
    flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1, flightWingStep: 0 });
  await expect(stage(page)).toBeFocused();
  expect(learnerWork(afterMatched)).toEqual(learnerWork(initial)); expect(await draftIdentity(page)).toEqual(initialDraft);
  expect(await readout(page, 'selected')).toEqual(selectedCheck.readout); expect(await readout(page, 'saved')).toEqual(savedCheck.readout);

  const note = page.getByRole('textbox', { name: 'My observation', exact: true });
  const replacement = 'I can see a dark curved bill below the pale cheek in the matched profile view.';
  await note.fill(replacement); await frames(page);
  expect(await readout(page, 'selected')).toEqual(selectedCheck.readout); expect(await readout(page, 'saved')).toEqual(savedCheck.readout);
  await activate(page, page.getByRole('button', { name: 'Record observation', exact: true }), touch);
  await expect(result(page, 'selected')).toHaveCount(0); await expect(panel(page, 'selected').locator('[data-study-view-check-status]')).toBeEmpty();
  expect(await readout(page, 'saved')).toEqual(savedCheck.readout);
  const afterObservation = await data(page);
  expect(afterObservation.flightStudyObservations.records['peregrine:head'].note).toBe(replacement);
  expect(afterObservation.flightStudyObservations.comparison.saved).toEqual(preservedSaved);
  expect(await draftIdentity(page)).toEqual(initialDraft);
  const replacedCheck = await check(page, 'selected', touch);
  expect(replacedCheck.readout.find(row => row.field === 'yaw')!.value).toBe('First: 35°; Second: 90°Differs');

  await page.getByRole('combobox', { name: 'Second recorded observation', exact: true }).selectOption('monarch:whole-wing'); await frames(page);
  await expect(result(page, 'selected')).toHaveCount(0); expect(await readout(page, 'saved')).toEqual(savedCheck.readout);
  const changedSelection = await check(page, 'selected', touch);
  await expect(panel(page, 'selected').locator('[data-study-view-check-status]')).toHaveText('Selected recorded observations: 1 of 7 recorded settings differ.');
  expect(changedSelection.readout.filter(row => row.matches === 'false').map(row => row.field)).toEqual(['yaw']);
  const beforeSave = await data(page);
  await activate(page, page.getByRole('button', { name: 'Record comparison', exact: true }), touch);
  await expect(result(page, 'saved')).toHaveCount(0); expect(await readout(page, 'selected')).toEqual(changedSelection.readout);
  const afterSave = await data(page), book = afterSave.flightStudyObservations;
  expect(book.comparison.saved).toEqual({ firstKey: 'canada_goose:head', secondKey: 'monarch:whole-wing', first: book.records['canada_goose:head'],
    second: book.records['monarch:whole-wing'], claim: initialDraft.value });
  expect(book.records).toEqual(beforeSave.flightStudyObservations.records); expect(book.drafts).toEqual(beforeSave.flightStudyObservations.drafts);
  for (const key of ['flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']) expect(afterSave[key]).toEqual(initial[key]);
  expect(await draftIdentity(page)).toEqual(initialDraft);
  const savedReplacement = await check(page, 'saved', touch); expect(savedReplacement.readout).toEqual(changedSelection.readout);
  const audit = await accessibility(page);
  writeFileSync(join(report, stem + '.json'), JSON.stringify({ sourceProof, input: touch ? 'native touch' : 'native keyboard', initial, initialDraft,
    selectedCheck, savedCheck, layout, screenshot, afterMatched, afterObservation, replacedCheck, changedSelection, afterSave, savedReplacement,
    finalDraft: await draftIdentity(page), writes: await writes(page), accessibility: audit }, null, 2));
}

test('Keyboard recorded-condition checks preserve drafts and independently invalidate selected and saved sources', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await journey(page, false);
});
test.describe('Dark phone recorded-condition learning', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch checks distinguish captured conditions from matched live views and preserve the learner claim', async ({ page }) => journey(page, true));
});
