import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, stage, frames, activate, openDetails, data, writes, mount, scene, expectFitted, expectStable, expectPrimaryContour, settled, accessibility, capture } from './helpers/migration_round31';

test.describe.configure({ retries: 0, timeout: 120_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round31-2026-10-22');
const canonical = readFileSync(join(process.cwd(), 'stem_lab/stem_tool_migration.js'));
if (!canonical.equals(readFileSync(join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js')))) throw new Error('Canonical and desktop migration sources differ');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE || Object.keys(process.env).some(key => /^MIGRATION_.*_CANDIDATE$/.test(key) && process.env[key])) throw new Error('Canonical regression rejects runtime substitutions');
const sourceProof = { canonical: 'stem_lab/stem_tool_migration.js', mirror: 'desktop/web-app/public/stem_lab/stem_tool_migration.js', sha256: createHash('sha256').update(canonical).digest('hex'), bytes: canonical.length, identical: true };
const harness = makeHarness('stem_lab/stem_tool_migration.js');
test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => { let timer: ReturnType<typeof setTimeout> | undefined; try { await Promise.race([harness.destroy(page), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Round31 scene cleanup exceeded 20 seconds')), 20_000); })]); } finally { if (timer) clearTimeout(timer); } });
const root = (page: Page) => page.locator('[data-migration-flight-challenges]');
const history = (page: Page) => root(page).locator('[data-flight-challenge-history]');
const reflection = (page: Page, index = 1) => root(page).locator('[data-flight-challenge-reflection="' + index + '"]');
const action = (page: Page, name: string, index = 1) => reflection(page, index).locator('[data-flight-reflection-action="' + name + '"]');
const input = (page: Page) => reflection(page).locator('[data-flight-reflection-input="1"]');
const evidence = (page: Page) => root(page).locator('[data-mission-progress-step="evidence"]');
const laterWords = 'The saved wind change raised modeled ground speed from 0 to 21 mph. The fixed model does not show gusts or the butterfly choosing when to fly.';
function seed() {
  const start = { speciesId: 'monarch', season: 'fall', wind: -15, formationMode: 'natural', formation: 'swarm', groundSpeed: 0, benefit: 0 };
  const rows = [4, -10, 5, -14].map((wind, index) => ({ baseline: { ...start }, snapshot: { ...start, wind, groundSpeed: Math.max(0, Math.round(12 + wind * 2.23694)) }, prediction: 'Captured prediction ' + (index + 1), notes: index === 1 ? 'Captured reasoning for a flight that did not meet the model target.' : '' }));
  return { flightChallenges: { selectedId: 'wind', work: {
    wind: { prediction: 'My current wind prediction is still a draft.', notes: 'My current explanation stays separate from old attempts.', setup: start, attempts: rows },
    formation: { prediction: 'Keep the other goal prediction.', notes: 'Keep the other goal notes.', setup: null, attempts: [] },
    season: { prediction: '', notes: '', setup: null, attempts: [] } } },
    flightStudyObservations: { drafts: { 'canada_goose:primaries': 'Keep my shape observation.' }, records: {}, comparison: { draft: 'Keep my comparison claim.' } },
    flightInvestigation: { variable: 'wind', prediction: 'Keep my investigation prediction.', trials: [], evidence: 'Keep my wind evidence.' },
    inquiry: { hypothesis: 'Keep my migration hypothesis.', explanation: 'Keep my explanation.', trials: [] }, aiExplorerText: 'Keep my research.' };
}
function unrelated(value: any) { return Object.fromEntries(['flightStudyObservations', 'flightInvestigation', 'inquiry', 'aiExplorerText'].map(key => [key, value[key]])); }
function captured(value: any) { return value.flightChallenges.work.wind.attempts.map(({ reflection, ...original }: any) => original); }
function compareBaseline(current: any, name: string) {
  const file = join(report, 'baseline-' + name + '.json'), available = existsSync(file);
  if (process.env.MIGRATION_EXPECT_BASELINE === '1') expect(available, 'Explicit frozen baseline capture must exist').toBe(true);
  if (!available) return null; const baseline = JSON.parse(readFileSync(file, 'utf8'));
  expect(baseline.sha256).toBe('2d5d8561653448bcdb6bd5eb21cbb4db1a3adb4d7edf651e53936d41cb1c0d35');
  const before = baseline.rendered; expect(current.view).toEqual(before.view); expect(current.stage).toEqual(before.stage); expect(current.studyRadius).toBe(before.studyRadius);
  for (const key of ['camera', 'projection', 'model'] as const) current[key].forEach((value: number, i: number) => expect(value).toBeCloseTo(before[key][i], 7));
  current.wings.forEach((wing: number[], side: number) => wing.forEach((value, i) => expect(value).toBeCloseTo(before.wings[side][i], 7)));
  current.primary.forEach((mesh: any, side: number) => { expect(mesh.positions).toEqual(before.primary[side].positions); expect(mesh.indices).toEqual(before.primary[side].indices); });
  expect(current.nodes.length).toBe(before.nodes.length); expect(current.resources.length).toBe(before.resources.length); expect(current.cue.capacity).toBe(before.cue.capacity);
  expect(before.cue.drawCount).toBe(90); expect(before.cue.primaryOutline).toHaveLength(30); expect(current.cue.drawCount).toBe(130); expect(current.cue.primaryOutline).toHaveLength(150);
  return { sourceSha256: baseline.sha256, viewAndGeometry: 'matched', beforeDrawCount: 90, afterDrawCount: 130 };
}
async function reflectionFlow(page: Page, touch: boolean, name: string) {
  const original = await data(page), originalScene = await scene(page);
  await openDetails(page, root(page), touch); await openDetails(page, history(page), touch);
  await expect(root(page).locator('[data-flight-challenge-action="check"]')).toBeDisabled();
  await expect(root(page)).toContainText('You can still add a later reflection to any saved attempt.');
  await expect(evidence(page)).toHaveAttribute('data-recorded', 'false');
  const currentNotes = root(page).getByRole('textbox', { name: 'My explanation: what numbers or route changes support my claim?', exact: true });
  await currentNotes.focus(); await currentNotes.evaluate(node => { const field = node as HTMLTextAreaElement; field.setSelectionRange(3, 14, 'backward'); (window as any).__round31CurrentNotes = field; });
  const beforeDraft = await writes(page); await openDetails(page, reflection(page), touch); await activate(page, action(page, 'edit'), touch);
  await expect(input(page)).toBeFocused(); await expect(action(page, 'save')).toBeDisabled(); await input(page).fill(laterWords);
  expect(await writes(page)).toEqual(beforeDraft); expect(await data(page)).toEqual(original);
  await input(page).evaluate(node => { const field = node as HTMLTextAreaElement; field.setSelectionRange(5, 23, 'backward'); (window as any).__round31Reflection = field; });
  const revisedPrediction = 'My revised current wind prediction stays separate from this old flight.';
  await root(page).getByRole('textbox', { name: 'My prediction: which control will I change, and why?', exact: true }).fill(revisedPrediction);
  expect(await input(page).evaluate(node => ({ same: node === (window as any).__round31Reflection, start: (node as HTMLTextAreaElement).selectionStart, end: (node as HTMLTextAreaElement).selectionEnd, direction: (node as HTMLTextAreaElement).selectionDirection }))).toEqual({ same: true, start: 5, end: 23, direction: 'backward' });
  expect(await currentNotes.evaluate(node => ({ same: node === (window as any).__round31CurrentNotes, start: (node as HTMLTextAreaElement).selectionStart, end: (node as HTMLTextAreaElement).selectionEnd, direction: (node as HTMLTextAreaElement).selectionDirection }))).toEqual({ same: true, start: 3, end: 14, direction: 'backward' });
  const sizeDiagnostics = async () => reflection(page).locator('button:visible').evaluateAll(nodes => nodes.map(node => {
    const record = (element: Element) => { const r = element.getBoundingClientRect(), css = getComputedStyle(element); return { tag: element.tagName, class: element.className, width: r.width, height: r.height, minHeight: css.minHeight, heightCss: css.height, transform: css.transform, zoom: css.zoom, animation: css.animation, transition: css.transition, boxSizing: css.boxSizing, padding: css.padding }; };
    const ancestors = []; for (let parent = node.parentElement; parent; parent = parent.parentElement) ancestors.push(record(parent));
    const rules: string[] = []; for (const sheet of Array.from(document.styleSheets)) { try { for (const rule of Array.from(sheet.cssRules)) { const candidate = rule as CSSStyleRule; if (candidate.selectorText && node.matches(candidate.selectorText)) rules.push(candidate.cssText); } } catch {} }
    return { text: node.textContent, ...record(node), ancestors, rules };
  }));
  const sizingFirst = await sizeDiagnostics(); await frames(page); const sizingLater = await sizeDiagnostics();
  await writeFile(join(report, name + '-button-sizing.json'), JSON.stringify({ sizingFirst, sizingLater }, null, 2));
  const sizes = await reflection(page).locator('button:visible').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { width: r.width, height: r.height }; }));
  for (const size of sizes) { expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44); }
  await activate(page, action(page, 'save'), touch); await expect(action(page, 'edit')).toBeFocused(); await expect(action(page, 'edit')).toHaveText('Edit reflection');
  const saved = await data(page); expect(saved.flightChallenges.work.wind.attempts).toHaveLength(4); expect(saved.flightChallenges.work.wind.attempts[0].reflection).toBe(laterWords);
  expect(captured(saved)).toEqual(captured(original)); expect(saved.flightChallenges.work.formation).toEqual(original.flightChallenges.work.formation);
  expect(saved.flightChallenges.work.wind.notes).toBe(original.flightChallenges.work.wind.notes); expect(saved.flightChallenges.work.wind.prediction).toBe(revisedPrediction); expect(unrelated(saved)).toEqual(unrelated(original));
  await expect(evidence(page)).toHaveAttribute('data-recorded', 'true'); await expect(root(page).locator('[data-flight-challenge-review="1"]')).toContainText('Reflection recorded · ungraded');
  await expect(root(page).locator('[data-flight-challenge-attempt="1"] .migration-mission-explanation')).toContainText('No explanation was recorded when checked.');
  await expect(root(page).locator('[data-flight-challenge-action="check"]')).toBeDisabled();
  await capture(page, join(report, name + '-saved-reflection.png'), root(page).locator('[data-flight-challenge-attempt="1"]'));
  const beforeCancel = await writes(page); await activate(page, action(page, 'edit'), touch); await input(page).fill('An unsaved replacement that I cancel.');
  await activate(page, action(page, 'cancel'), touch); await expect(action(page, 'edit')).toBeFocused(); expect(await data(page)).toEqual(saved); expect(await writes(page)).toEqual(beforeCancel);
  if (!touch) {
    await activate(page, action(page, 'edit')); await input(page).fill('   '); await activate(page, action(page, 'save')); await expect(evidence(page)).toHaveAttribute('data-recorded', 'false');
    expect((await data(page)).flightChallenges.work.wind.attempts[0]).not.toHaveProperty('reflection'); expect(captured(await data(page))).toEqual(captured(original));
    await activate(page, action(page, 'edit')); await input(page).fill(laterWords); await activate(page, action(page, 'save')); await expect(evidence(page)).toHaveAttribute('data-recorded', 'true');
    await activate(page, action(page, 'edit')); await input(page).fill('My local draft survives a challenge switch.'); const beforeSwitch = await data(page);
    await activate(page, root(page).locator('[data-flight-challenge="formation"]'));
    const stale = root(page).locator('[data-flight-reflection-stale]'); await expect(stale).toBeVisible(); await expect(stale.getByRole('textbox', { name: 'My unsaved reflection', exact: true })).toHaveValue('My local draft survives a challenge switch.');
    await expect(stale.getByRole('textbox')).toHaveAttribute('readonly', ''); expect((await data(page)).flightChallenges.work).toEqual(beforeSwitch.flightChallenges.work);
    await activate(page, root(page).locator('[data-flight-challenge="wind"]')); await openDetails(page, history(page)); await openDetails(page, reflection(page));
    await expect(input(page)).toHaveValue('My local draft survives a challenge switch.'); await activate(page, action(page, 'cancel')); await expect(action(page, 'edit')).toBeFocused();
  }
  expectStable(await scene(page), originalScene);
  const beforeTab = await data(page);
  for (const id of ['[data-migration-tab="inquiry"]', '[data-migration-tab="flight3d"]']) {
    const tab = page.locator(id); if (touch) await tab.tap(); else { await tab.focus(); await page.keyboard.press('Enter'); }
  }
  await expect(stage(page)).toHaveAttribute('data-flight-ready', 'true');
  await page.evaluate(() => { const rec = (window as any).__glCanvas().rec, original = rec.scene.onBeforeRender;
    rec.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) { rec.camera = camera; if (original) original.call(this, renderer, scene, camera, ...rest); };
  }); await frames(page);
  await openDetails(page, root(page), touch); await openDetails(page, history(page), touch); await openDetails(page, reflection(page), touch);
  await expect(reflection(page).locator('[data-flight-reflection-saved="1"]')).toHaveText(laterWords); expect(await data(page)).toEqual(beforeTab);
  expect(captured(await data(page))).toEqual(captured(original)); expect(unrelated(await data(page))).toEqual(unrelated(original));
  const finalScene = await scene(page); expectFitted(finalScene);
  return { original, saved, final: await data(page), originalScene, finalScene, sizes, mutations: await writes(page), accessibility: await accessibility(page) };
}

test('Desktop keyboard primary contours follow both articulated sides and later reflection works at four attempts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(harness, page, 'canada_goose', { extra: seed() });
  const originalData = await data(page), above = await scene(page); expectPrimaryContour(above); const baseline = compareBaseline(above, 'desktop-goose-primary-above');
  await capture(page, join(report, 'desktop-goose-primary-above.png'));
  await activate(page, page.locator('[data-wingtip-follow-side="0"]')); const left = await scene(page); expectPrimaryContour(left); expect(left.cue.side).toBe(0); expectStable(left, above);
  await activate(page, page.locator('[data-marked-pose-action="mark"]')); const marked = await scene(page);
  await activate(page, page.getByRole('button', { name: 'Cycle position 3 of 8', exact: true })); const cycled = await scene(page); expectPrimaryContour(cycled); expectStable(cycled, above); expect(cycled.view.phase).not.toBe(marked.view.phase);
  expect(cycled.cue.primaryOutline).not.toEqual(left.cue.primaryOutline); await capture(page, join(report, 'desktop-goose-left-primary-cycle.png'));
  await activate(page, page.locator('[data-marked-pose-action="return"]')); const returned = await scene(page); expectPrimaryContour(returned); expect(returned.joints).toEqual(marked.joints); expect(returned.cue.primaryOutline).toEqual(marked.cue.primaryOutline);
  await activate(page, page.locator('[data-wingtip-follow-side="1"]')); const right = await scene(page); expectPrimaryContour(right); expect(right.cue.side).toBe(1); expectStable(right, above); expect(unrelated(await data(page))).toEqual(unrelated(originalData));
  const learning = await reflectionFlow(page, false, 'desktop-keyboard');
  await writeFile(join(report, 'desktop-primary-reflection.json'), JSON.stringify({ sourceProof, baseline, above, left, marked, cycled, returned, right, learning }, null, 2));
});
for (const dark of [false, true]) test.describe(dark ? 'Dark Monarch phone' : 'Light Peregrine phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Saved-flight reflection preserves captured evidence and fits native touch controls', async ({ page }) => {
    const name = dark ? 'phone-dark-monarch' : 'phone-light-peregrine'; await mount(harness, page, dark ? 'monarch' : 'peregrine', { dark, extra: seed() });
    const initial = await scene(page); let baseline = null;
    if (dark) { expect(initial.cue.visible).toBe(false); expect(initial.primary).toEqual([]); expect(initial.monarch).toHaveLength(4); expectFitted(initial); }
    else { expectPrimaryContour(initial); baseline = compareBaseline(initial, 'phone-peregrine-primary-above'); await capture(page, join(report, 'phone-peregrine-primary-above.png'));
      await activate(page, page.locator('[data-wingtip-follow-side="0"]'), true); const left = await scene(page); expectPrimaryContour(left); expect(left.cue.side).toBe(0); expectStable(left, initial); }
    const learning = await reflectionFlow(page, true, name);
    if (dark) { expect(learning.finalScene.monarch).toEqual(initial.monarch); expect(learning.finalScene.cue.visible).toBe(false); }
    else expectPrimaryContour(learning.finalScene);
    await writeFile(join(report, name + '-reflection.json'), JSON.stringify({ sourceProof, baseline, initial, learning }, null, 2));
  });
});
test('Motion-enabled orbit and wing cycle keep the actual primary rims and pooled scene buffers', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(harness, page, 'canada_goose', { reduced: false, extra: seed() }); await settled(page);
  const original = await data(page), initial = await scene(page); expectPrimaryContour(initial); expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
  await stage(page).focus(); await page.keyboard.press('ArrowRight'); await frames(page); await settled(page); const orbited = await scene(page); expectPrimaryContour(orbited); expectStable(orbited, initial);
  expect(orbited.camera).not.toEqual(initial.camera); expect(orbited.joints).toEqual(initial.joints); expect(orbited.cue.primaryOutline).toEqual(initial.cue.primaryOutline);
  await activate(page, page.locator('[data-wingtip-follow-side="0"]')); await activate(page, page.getByRole('button', { name: 'Cycle position 5 of 8', exact: true })); const changed = await scene(page); expectPrimaryContour(changed); expectStable(changed, initial);
  expect(changed.view.phase).not.toBe(initial.view.phase); expect(unrelated(await data(page))).toEqual(unrelated(original)); expect((await data(page)).flightChallenges).toEqual(original.flightChallenges);
  await capture(page, join(report, 'desktop-motion-primary-contour.png')); await writeFile(join(report, 'desktop-motion-primary-contour.json'), JSON.stringify({ sourceProof, initial, orbited, changed, accessibility: await accessibility(page) }, null, 2));
});
