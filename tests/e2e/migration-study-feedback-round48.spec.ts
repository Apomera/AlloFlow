import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, data, openDetails, settled } from './helpers/migration_round31';

test.describe.configure({ timeout: 150_000, retries: 0 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round48-2026-10-26');
const sourcePath = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirrorPath = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(sourcePath), hash = createHash('sha256').update(source).digest('hex');
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const errors = new WeakMap<Page, string[]>();
const noteMessage = 'Observation recorded. Your words count as evidence; they are not graded.';
const comparisonMessage = 'Comparison recorded with both source notes and view settings. Your claim is not graded.';
const status = (page: Page, kind: string) => page.locator('[data-learning-feedback="study-' + kind + '"]');
const visible = (page: Page, kind: string) => page.locator('[data-study-' + kind + '-status]');
const otherWork = (state: any) => Object.fromEntries(['inquiry', 'flightInvestigation', 'flightChallenges', 'flightSpecies', 'flightStudyRegion', 'flightWind', 'flightCamera', 'flightPaused'].map(key => [key, state[key]]));
function unchangedSource() {
  expect(readFileSync(sourcePath).equals(source)).toBe(true); expect(readFileSync(mirrorPath).equals(source)).toBe(true);
}
test.beforeAll(async () => { unchangedSource(); mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => { expect(errors.get(page) || []).toEqual([]); unchangedSource(); await harness.destroy(page); });
async function paint(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function activate(page: Page, button: Locator) { await button.focus(); await page.keyboard.press('Enter'); await paint(page); }
async function rememberChild(node: Locator) { await node.evaluate(element => { (element as any).__round48Child = element.firstChild; }); }
async function changedChild(node: Locator) { expect(await node.evaluate(element => element.firstChild !== (element as any).__round48Child)).toBe(true); }
async function scan(page: Page) {
  await page.addScriptTag({ path: join(process.cwd(), 'axe-core/4.12.1/axe.min.js') });
  const result = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('#wrap > .migration-tool-shell'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return { violations: result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })), incomplete: result.incomplete.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) };
  }); expect(result.violations).toEqual([]); return result;
}
async function openScene(page: Page) {
  const failures: string[] = []; errors.set(page, failures); page.on('pageerror', error => failures.push(error.stack || error.message));
  const record = (region: string, note: string) => ({ speciesId: 'canada_goose', region, note, bird: 0, yaw: 35, pitch: 15, zoom: 1.2, wingStep: 13, paused: true, motionReduced: true });
  await mount(harness, page, 'canada_goose', { reduced: true, extra: {
    flightStudyRegion: 'head', flightStudyBird: 0, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1.2, flightWind: 0,
    flightStudyObservations: { drafts: { 'canada_goose:head': 'Recorded bill evidence.' },
      records: { 'canada_goose:head': record('head', 'Recorded bill evidence.'), 'canada_goose:tail': record('tail', 'Recorded tail evidence.') },
      comparison: { firstKey: 'canada_goose:head', secondKey: 'canada_goose:tail', draft: 'My comparison A.', saved: null, feedback: '' } },
    inquiry: { hypothesis: 'Keep independent inquiry work.' },
    flightInvestigation: { variable: 'wind', prediction: 'Keep flight prediction.', baseline: null, trials: [], evidence: 'Keep flight evidence.', explanation: 'Keep flight explanation.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep challenge prediction.', notes: 'Keep challenge notes.', setup: null, attempts: [] } } }
  } }); await settled(page);
  await page.evaluate(() => { const w = window as any; w.__ctx.announceToSR = undefined; w.__rerender(); }); await paint(page);
  await openDetails(page, page.locator('[data-study-observation]'));
}

test('Study note saves repeat locally and editing removes stale success without announcing each keystroke', async ({ page }) => {
  await openScene(page); const before = await data(page), note = page.locator('[data-study-observation-key]');
  const save = page.getByRole('button', { name: 'Record observation', exact: true }), live = status(page, 'observation');
  await expect(live).toBeEmpty(); await expect(live).toHaveAttribute('role', 'status'); await expect(live).toHaveAttribute('aria-atomic', 'true');
  await note.fill('Observation A: the bill shape stays connected.'); await activate(page, save);
  await expect(save).toBeFocused(); await expect(live).toHaveText(noteMessage); await expect(visible(page, 'observation')).toHaveAttribute('aria-live', 'off');
  await rememberChild(live); await note.fill('Observation B: a revised source detail.'); await paint(page);
  await expect(live).toBeEmpty(); await expect(visible(page, 'observation')).toBeEmpty(); await expect(note).toBeFocused();
  expect((await data(page)).flightStudyObservations.records['canada_goose:head'].note).toBe('Observation A: the bill shape stays connected.');
  await live.evaluate(node => {
    const state = { mutations: 0, observer: null as MutationObserver | null }; state.observer = new MutationObserver(records => { state.mutations += records.length; });
    state.observer.observe(node, { childList: true, subtree: true, characterData: true }); (node as any).__round48Changes = state;
  });
  await note.press('End'); await note.pressSequentially(' More evidence.'); await paint(page);
  const quietEdits = await live.evaluate(node => { const state = (node as any).__round48Changes; state.observer.disconnect(); return state.mutations; });
  expect(quietEdits).toBe(0); await activate(page, save); await expect(live).toHaveText(noteMessage); await changedChild(live); await expect(save).toBeFocused();
  const recorded = await data(page); expect(recorded.flightStudyObservations.records['canada_goose:head'].note).toBe('Observation B: a revised source detail. More evidence.');
  expect(recorded.flightStudyObservations.records['canada_goose:tail']).toEqual(before.flightStudyObservations.records['canada_goose:tail']);
  expect(recorded.flightStudyObservations.comparison).toEqual(before.flightStudyObservations.comparison); expect(otherWork(recorded)).toEqual(otherWork(before));
  await rememberChild(live); await activate(page, save); await changedChild(live); await expect(save).toBeFocused();
  await page.setViewportSize({ width: 390, height: 950 }); await note.scrollIntoViewIfNeeded(); await note.focus(); await paint(page);
  await page.locator('[data-study-observation]').screenshot({ path: join(report, 'study-save-feedback-mobile.png') });
  const audit = await scan(page);
  writeFileSync(join(report, 'study-save-feedback-proof.json'), JSON.stringify({ hash, before, recorded, final: await data(page), quietEdits, audit }, null, 2));
});

test('comparison saves and blocked notebook exports repeat through their own status while retaining learner work', async ({ page }) => {
  await openScene(page); const before = await data(page), comparison = page.locator('[data-study-comparison]'); await openDetails(page, comparison);
  const claim = page.getByRole('textbox', { name: 'My observation comparison', exact: true });
  const save = page.getByRole('button', { name: 'Record comparison', exact: true }), live = status(page, 'comparison');
  await expect(live).toBeEmpty(); await activate(page, save); await expect(live).toHaveText(comparisonMessage); await expect(save).toBeFocused(); await rememberChild(live);
  await claim.fill('My comparison B: include a detail from each source.'); await paint(page);
  await expect(live).toBeEmpty(); await expect(visible(page, 'comparison')).toBeEmpty();
  expect((await data(page)).flightStudyObservations.comparison.saved.claim).toBe('My comparison A.');
  await activate(page, save); await expect(live).toHaveText(comparisonMessage); await changedChild(live); await expect(save).toBeFocused();
  const recorded = await data(page); expect(recorded.flightStudyObservations.comparison.saved.claim).toBe('My comparison B: include a detail from each source.');
  expect(recorded.flightStudyObservations.records).toEqual(before.flightStudyObservations.records); expect(otherWork(recorded)).toEqual(otherWork(before));
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('Controlled blocked download'); }; });
  const download = page.getByRole('button', { name: 'Download observation notebook (HTML)', exact: true }), exported = status(page, 'export');
  await activate(page, download); await expect(exported).toHaveText('Download was blocked by this browser.'); await expect(download).toBeFocused(); await rememberChild(exported);
  await activate(page, download); await changedChild(exported); await expect(download).toBeFocused(); await expect(page.locator('a[download]')).toHaveCount(0);
  const final = await data(page); expect(final.flightStudyObservations.records).toEqual(recorded.flightStudyObservations.records);
  expect(final.flightStudyObservations.drafts).toEqual(recorded.flightStudyObservations.drafts);
  expect(final.flightStudyObservations.comparison.saved).toEqual(recorded.flightStudyObservations.comparison.saved);
  expect(final.flightStudyObservations.comparison.draft).toEqual(recorded.flightStudyObservations.comparison.draft); expect(otherWork(final)).toEqual(otherWork(before));
  const audit = await scan(page);
  writeFileSync(join(report, 'study-comparison-export-feedback-proof.json'), JSON.stringify({ hash, before, recorded, final, blockedDownload: true, audit }, null, 2));
});
