import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, scene, stage, frames, activate, openDetails, data, accessibility, capture, portrait, expectPeregrineIdentity } from './helpers/migration_round32';

test.describe.configure({ retries: 0, timeout: 150_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round32-2026-10-22');
const canonical = readFileSync(join(process.cwd(), 'stem_lab/stem_tool_migration.js'));
if (!canonical.equals(readFileSync(join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js')))) throw new Error('Canonical and desktop migration sources differ');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE || Object.keys(process.env).some(key => /^MIGRATION_.*_CANDIDATE$/.test(key) && process.env[key])) throw new Error('Canonical regression rejects runtime substitutions');
const sourceProof = { canonical: 'stem_lab/stem_tool_migration.js', mirror: 'desktop/web-app/public/stem_lab/stem_tool_migration.js', sha256: createHash('sha256').update(canonical).digest('hex'), bytes: canonical.length, identical: true };
const harness = makeHarness('stem_lab/stem_tool_migration.js');
test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => { let timer: ReturnType<typeof setTimeout> | undefined; try { await Promise.race([harness.destroy(page), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Round32 scene cleanup exceeded 20 seconds')), 20_000); })]); } finally { if (timer) clearTimeout(timer); } });
const portraitSettings = { flightShowAnatomy: false, flightShowWingtipPath: false, flightStudyYaw: 55, flightStudyPitch: 18, flightStudyZoom: 1.25, flightWingStep: 13 };
const root = (page: Page) => page.locator('[data-migration-flight-challenges]');
const row = (page: Page, index = 1) => root(page).locator('[data-flight-challenge-attempt="' + index + '"]');
const reflection = (page: Page, index = 1) => row(page, index).locator('[data-flight-challenge-reflection]');
const field = (page: Page) => root(page).locator('[data-flight-reflection-input]');
const inspect = (page: Page, source: string, index = 1) => row(page, index).locator('[data-flight-challenge-inspect="' + source + '"]');
const strip = (page: Page) => page.locator('[data-flight-challenge-inspection]');
const back = (page: Page) => page.locator('[data-flight-challenge-return]');
const laterWords = 'I compared the recorded starting flight and saved result. The saved conditions support my observation, but this illustrative scene does not replay the original flight or establish a biological cause.';
const writes = (page: Page) => page.evaluate(() => JSON.parse(JSON.stringify((window as any).__round31Writes)));
function snapshot(speciesId: string, wind: number, formationMode: string, season = 'fall') {
  const formation = formationMode === 'natural' ? speciesId === 'monarch' ? 'swarm' : 'v' : formationMode;
  return { speciesId, season, wind, formationMode, formation, groundSpeed: Math.max(0, Math.round((speciesId === 'monarch' ? 12 : 40) + wind * 2.237)), benefit: speciesId === 'monarch' ? 0 : formation === 'v' ? 22 : formation === 'solo' ? 0 : formation === 'loose' ? 7 : 5 };
}
function seed(selectedId = 'wind') {
  const starts: any = { wind: snapshot('monarch', -15, 'natural'), formation: snapshot('canada_goose', 0, 'solo'), season: snapshot('canada_goose', 8, 'natural') };
  const results: any = { wind: snapshot('monarch', 4, 'natural'), formation: snapshot('canada_goose', 0, 'v'), season: snapshot('canada_goose', 8, 'natural', 'spring') };
  return { flightChallenges: { selectedId, work: Object.fromEntries(Object.keys(starts).map(id => [id, {
    prediction: 'My current ' + id + ' prediction remains a draft.', notes: 'My current ' + id + ' explanation stays separate.', setup: starts[id],
    attempts: Array.from({ length: id === selectedId ? 4 : 1 }, (_, index) => ({ baseline: { ...starts[id] }, snapshot: { ...results[id] }, prediction: 'Captured ' + id + ' prediction ' + (index + 1), notes: '' }))
  }])) }, flightStudyObservations: { drafts: { 'peregrine:head': 'Keep my portrait observation.' }, records: {}, comparison: { draft: 'Keep my comparison claim.' } },
    flightInvestigation: { variable: 'wind', prediction: 'Keep my investigation prediction.', baseline: null, trials: [], evidence: 'Keep my investigation evidence.', explanation: 'Keep my investigation reasoning.' },
    inquiry: { hypothesis: 'Keep my inquiry hypothesis.', explanation: 'Keep my inquiry explanation.', trials: [] }, aiExplorerText: 'Keep my research.' };
}
function untouched(value: any) { return Object.fromEntries(['flightStudyObservations', 'flightInvestigation', 'inquiry', 'aiExplorerText'].map(key => [key, value[key]])); }
function viewPatch(saved: any) { return { flightSpecies: saved.speciesId, flightSeason: saved.season, flightWind: saved.wind, flightFormation: saved.formationMode, flightCamera: 'chase', flightPaused: true, flightShowSpeedVectors: true }; }
function compareBaseline(current: any, geometry: any, name: string) {
  const file = join(report, 'baseline-' + name + '.json'), available = existsSync(file);
  if (process.env.MIGRATION_EXPECT_BASELINE === '1') expect(available, 'Explicit frozen baseline must exist').toBe(true);
  if (!available) return null;
  const baseline = JSON.parse(readFileSync(file, 'utf8')), before = baseline.rendered;
  expect(baseline.sha256).toBe('cd67237e0dc60945bb292b6e97efb70b63b3cb22aa0ee424381c4cc9fe128f3a');
  expect(current.view).toEqual(before.view); expect(current.stage).toEqual(before.stage); expect(current.studyRadius).toBe(before.studyRadius);
  for (const key of ['camera', 'projection'] as const) current[key].forEach((value: number, index: number) => expect(value).toBeCloseTo(before[key][index], 7));
  expect(current.head.position).toEqual(before.head.position); expect(current.head.rotation).toEqual(before.head.rotation); expect(current.head.scale).toEqual(before.head.scale);
  expect(before.head.vertices).toBe(117); expect(before.bill.vertices).toBe(43); expect(before.rings).toBeNull(); expect(before.head.colors).toBeNull();
  expect(current.counts.nodes).toBe(before.counts.nodes + 1); expect(current.counts.geometries).toBe(before.counts.geometries + 1); expect(current.counts.materials).toBe(before.counts.materials);
  geometry.wings.forEach((wing: number[], side: number) => wing.forEach((value, index) => expect(value).toBeCloseTo(baseline.scene.wings[side][index], 7)));
  expect(geometry.view).toEqual(baseline.scene.view); expect(geometry.joints).toEqual(baseline.scene.joints);
  return { baselineSha256: baseline.sha256, matchedCameraAndPose: true, beforeCounts: before.counts, afterCounts: current.counts, headVertices: [before.head.vertices, current.head.vertices], billVertices: [before.bill.vertices, current.bill.vertices] };
}
function assertFitted(actual: any) { expect(actual.visible).toBe(1); expect(actual.extent).toBeGreaterThan(.2); expect(actual.extent).toBeLessThan(.98); expect(actual.minDepth).toBeGreaterThan(-1); expect(actual.maxDepth).toBeLessThan(1); expect(actual.cue.visible).toBe(false); }
async function visualJourney(page: Page, phone: boolean) {
  await mount(harness, page, 'peregrine', { extra: { ...portraitSettings, ...seed() } });
  const name = phone ? 'phone-peregrine' : 'desktop-peregrine', original = await data(page), initial = await portrait(page), geometry = await scene(page);
  expectPeregrineIdentity(initial); assertFitted(geometry); const baseline = compareBaseline(initial, geometry, name);
  expect(new Set(initial.head.colors).size).toBeGreaterThan(3); expect(new Set(initial.bill.colors).size).toBeGreaterThan(3);
  await capture(page, join(report, name + '-identity.png'));
  if (phone) await activate(page, page.getByRole('button', { name: 'Profile', exact: true }), true);
  else { await stage(page).focus(); await page.keyboard.press('ArrowRight'); await frames(page); }
  const moved = await portrait(page), movedScene = await scene(page); expectPeregrineIdentity(moved); assertFitted(movedScene);
  expect(moved.camera).not.toEqual(initial.camera); expect(movedScene.joints).toEqual(geometry.joints);
  if (phone) await capture(page, join(report, 'phone-peregrine-profile.png'));
  expect(movedScene.nodes).toEqual(geometry.nodes); expect(movedScene.resources).toEqual(geometry.resources);
  for (const name of ['head', 'bill', 'rings']) { expect(moved[name].uuid).toBe(initial[name].uuid); expect(moved[name].geometry).toBe(initial[name].geometry); expect(moved[name].material).toBe(initial[name].material); }
  expect(untouched(await data(page))).toEqual(untouched(original)); expect((await data(page)).flightChallenges).toEqual(original.flightChallenges);
  await writeFile(join(report, name + '-identity.json'), JSON.stringify({ sourceProof, baseline, initial, geometry, moved, movedScene, accessibility: await accessibility(page) }, null, 2));
}
async function assertInspectionVisible(page: Page, fullscreen = false) {
  const deck = page.locator('.migration-flight-deck'); await expect(deck).toHaveAttribute('data-challenge-inspection-open', 'true');
  await strip(page).scrollIntoViewIfNeeded(); await expect(strip(page)).toBeVisible(); await expect(back(page)).toBeInViewport({ ratio: 1 });
  const boxes = await page.evaluate(() => {
    const deck = document.querySelector('.migration-flight-deck') as HTMLElement, view = deck.querySelector('.migration-flight-view') as HTMLElement;
    const inspection = deck.querySelector('[data-flight-challenge-inspection]') as HTMLElement, button = inspection.querySelector('button') as HTMLElement;
    const stage = deck.querySelector('.migration-flight-stage') as HTMLElement;
    const rect = (element: HTMLElement) => { const r = element.getBoundingClientRect(); return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height }; };
    const b = button.getBoundingClientRect(), hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { deck: rect(deck), stage: rect(stage), strip: rect(inspection), button: rect(button), view: rect(view),
      deckScroll: deck.scrollTop, viewScroll: view.scrollTop, viewOverflow: getComputedStyle(view).overflowY,
      hitButton: !!hit && (hit === button || button.contains(hit)), viewportHeight: innerHeight };
  });
  for (const key of ['strip', 'button'] as const) {
    expect(boxes[key].top).toBeGreaterThanOrEqual(boxes.deck.top - 1); expect(boxes[key].bottom).toBeLessThanOrEqual(boxes.deck.bottom + 1);
    expect(boxes[key].left).toBeGreaterThanOrEqual(boxes.deck.left - 1); expect(boxes[key].right).toBeLessThanOrEqual(boxes.deck.right + 1);
  }
  expect(boxes.button.top).toBeGreaterThanOrEqual(boxes.strip.top); expect(boxes.button.bottom).toBeLessThanOrEqual(boxes.strip.bottom + 1); expect(boxes.hitButton).toBe(true);
  if (!fullscreen) { expect(boxes.stage.top).toBeGreaterThanOrEqual(boxes.deck.top - 1); expect(boxes.stage.bottom).toBeLessThanOrEqual(boxes.strip.top + 1); expect(boxes.deckScroll).toBe(0); expect(boxes.viewScroll).toBe(0); }
  return boxes;
}
async function fullscreenInspection(page: Page) {
  const deck = page.locator('.migration-flight-deck');
  // Exercise the existing fallback CSS contract without substituting runtime.
  await deck.evaluate(node => node.setAttribute('data-allo-fullscreen-active', 'true')); await frames(page);
  const fallback = await assertInspectionVisible(page, true);
  expect(Math.abs(fallback.deck.height - fallback.viewportHeight)).toBeLessThan(2);
  expect(Math.abs(fallback.stage.height - fallback.viewportHeight)).toBeLessThan(2); expect(fallback.viewOverflow).toBe('auto');
  await deck.evaluate(node => { node.removeAttribute('data-allo-fullscreen-active'); (node as HTMLElement).scrollTop = 0; (node.querySelector('.migration-flight-view') as HTMLElement).scrollTop = 0; }); await frames(page);
  await assertInspectionVisible(page);
  const enabled = await page.evaluate(() => document.fullscreenEnabled);
  let native: any = null;
  if (enabled) {
    await activate(page, page.getByRole('button', { name: 'Toggle fullscreen for the 3D migration flight deck', exact: true }));
    await expect.poll(() => page.evaluate(() => document.fullscreenElement?.classList.contains('migration-flight-deck') || false)).toBe(true);
    native = await assertInspectionVisible(page, true);
    expect(Math.abs(native.deck.height - native.viewportHeight)).toBeLessThan(2); expect(Math.abs(native.stage.height - native.viewportHeight)).toBeLessThan(2);
    await activate(page, back(page)); await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false); await expect(field(page)).toBeFocused();
    await assertInspectionVisible(page);
  }
  return { fallback, native, nativeFullscreenEnabled: enabled };
}
async function recordedScene(page: Page, goal: string, source: string, saved: any) {
  await expect(strip(page)).toHaveAttribute('data-inspection-state', 'ready');
  await expect(strip(page)).toHaveAttribute('data-inspection-goal', goal); await expect(strip(page)).toHaveAttribute('data-inspection-source', source);
  await expect(strip(page)).toContainText('Recorded conditions restored'); await expect(strip(page)).toContainText('The original animation frame was not recorded.');
  const actual = await page.evaluate(() => {
    const w = window as any, rec = w.__glCanvas().rec, flock = rec.scene.getObjectByName('migration-flock'), vectors = rec.scene.getObjectByName('migration-speed-vectors');
    return { ack: document.querySelector('.migration-flight-stage')?.getAttribute('data-flight-challenge-frame'),
      renders: rec.renders, flockCount: flock.children.length, visibleCount: flock.children.filter((bird: any) => bird.visible).length,
      monarch: !!flock.children[0].getObjectByName('migration-monarch-forewing'),
      vectorsVisible: vectors.visible, values: Object.fromEntries(vectors.children.map((arrow: any) => [arrow.userData.speedRole, arrow.userData.mph])),
      camera: rec.camera.matrixWorld.toArray(), scene: w.__glScene() };
  });
  expect(Number(actual.ack)).toBeGreaterThan(0); expect(actual.vectorsVisible).toBe(true);
  expect(actual.values.air).toBe(saved.speciesId === 'monarch' ? 12 : 40); expect(actual.values.wind).toBeCloseTo(saved.wind * 2.237, 7); expect(actual.values.ground).toBe(saved.groundSpeed);
  expect(actual.flockCount).toBe(saved.formation === 'solo' ? 1 : saved.formation === 'v' ? 11 : 18); expect(actual.visibleCount).toBe(actual.flockCount);
  expect(actual.monarch).toBe(saved.speciesId === 'monarch'); expect(actual.camera.every(Number.isFinite)).toBe(true);
  expect(await data(page)).toMatchObject(viewPatch(saved)); return { ...actual, layout: await assertInspectionVisible(page) };
}
async function draftIdentity(page: Page) {
  return field(page).evaluate(node => { const input = node as HTMLTextAreaElement; return { same: input === (window as any).__round32Draft, value: input.value, start: input.selectionStart, end: input.selectionEnd, direction: input.selectionDirection, scroll: input.scrollTop }; });
}
async function learningJourney(page: Page, touch: boolean) {
  const goal = touch ? 'formation' : 'wind', name = touch ? 'phone-touch-inspection' : 'desktop-keyboard-inspection';
  await mount(harness, page, 'peregrine', { extra: { ...portraitSettings, ...seed(goal) } });
  await page.evaluate(() => { const w = window as any; w.__round32XP = []; w.__ctx.awardXP = (...args: any[]) => w.__round32XP.push(args); w.__rerender(); }); await frames(page);
  await expect(page.locator('.migration-flight-deck')).toHaveAttribute('data-challenge-inspection-open', 'false');
  let fullscreen: any = null;
  const original = await data(page); await openDetails(page, root(page), touch); await openDetails(page, root(page).locator('[data-flight-challenge-history]'), touch);
  await expect(root(page).locator('[data-flight-challenge-action="check"]')).toBeDisabled();
  await openDetails(page, reflection(page), touch); await activate(page, reflection(page).locator('[data-flight-reflection-action="edit"]'), touch);
  await field(page).fill(laterWords); await field(page).evaluate(node => { const input = node as HTMLTextAreaElement; input.setSelectionRange(5, 28, 'backward'); input.scrollTop = 0; (window as any).__round32Draft = input; });
  const draft = await draftIdentity(page), before = await data(page), writeCount = (await writes(page)).length;
  await activate(page, inspect(page, 'baseline'), touch); const starting = await recordedScene(page, goal, 'baseline', before.flightChallenges.work[goal].attempts[0].baseline);
  await expect(stage(page)).toBeFocused(); expect(await draftIdentity(page)).toEqual(draft); expect(await data(page)).toEqual({ ...before, ...viewPatch(before.flightChallenges.work[goal].attempts[0].baseline) });
  expect((await writes(page)).slice(writeCount).map((item: any) => item.patch)).toEqual([viewPatch(before.flightChallenges.work[goal].attempts[0].baseline)]);
  await activate(page, back(page), touch); await expect(field(page)).toBeFocused(); expect(await draftIdentity(page)).toEqual(draft);
  const beforeSaved = await data(page), savedWriteCount = (await writes(page)).length;
  await activate(page, inspect(page, 'snapshot'), touch); const saved = await recordedScene(page, goal, 'snapshot', before.flightChallenges.work[goal].attempts[0].snapshot);
  expect(Number(saved.ack)).toBeGreaterThan(Number(starting.ack)); expect(await data(page)).toEqual({ ...beforeSaved, ...viewPatch(before.flightChallenges.work[goal].attempts[0].snapshot) });
  expect((await writes(page)).slice(savedWriteCount).map((item: any) => item.patch)).toEqual([viewPatch(before.flightChallenges.work[goal].attempts[0].snapshot)]);
  expect(await draftIdentity(page)).toEqual(draft);
  if (!touch) { fullscreen = await fullscreenInspection(page); expect(await draftIdentity(page)).toEqual(draft); await capture(page, join(report, 'desktop-inspection-source.png'), page.locator('.migration-flight-deck')); }
  const buttons = await row(page).locator('[data-flight-challenge-inspect]').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { width: r.width, height: r.height }; }));
  for (const box of buttons) { expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
  const backBox = await back(page).boundingBox(); expect(backBox!.height).toBeGreaterThanOrEqual(44);
  await activate(page, page.getByRole('button', { name: 'Side', exact: true }), touch);
  await expect(strip(page)).toHaveAttribute('data-inspection-state', 'changed'); await expect(strip(page)).not.toContainText('Recorded conditions restored'); await assertInspectionVisible(page);
  await activate(page, back(page), touch); await expect(field(page)).toBeFocused(); expect(await draftIdentity(page)).toEqual(draft);
  await activate(page, inspect(page, 'snapshot'), touch); await recordedScene(page, goal, 'snapshot', before.flightChallenges.work[goal].attempts[0].snapshot);
  await activate(page, back(page), touch); await expect(field(page)).toBeFocused(); expect(await draftIdentity(page)).toEqual(draft);
  if (touch) await capture(page, join(report, name + '-reflection.png'), row(page));
  if (!touch) {
    const workBefore = (await data(page)).flightChallenges.work;
    await activate(page, root(page).locator('[data-flight-challenge="season"]')); await expect(strip(page)).toHaveCount(0); await expect(page.locator('.migration-flight-deck')).toHaveAttribute('data-challenge-inspection-open', 'false');
    await expect(root(page).locator('[data-flight-reflection-stale] textarea')).toHaveValue(laterWords);
    await openDetails(page, root(page).locator('[data-flight-challenge-history]'));
    await activate(page, inspect(page, 'snapshot')); await recordedScene(page, 'season', 'snapshot', workBefore.season.attempts[0].snapshot);
    await expect(stage(page).locator('.migration-flight-route-places')).toContainText('Northern Canada & Alaska');
    await activate(page, back(page)); await expect(reflection(page).locator(':scope > summary')).toBeFocused();
    expect((await data(page)).flightChallenges.work).toEqual(workBefore);
    await activate(page, root(page).locator('[data-flight-challenge="wind"]')); await expect(strip(page)).toHaveCount(0);
    await openDetails(page, root(page).locator('[data-flight-challenge-history]')); await openDetails(page, reflection(page)); await expect(field(page)).toHaveValue(laterWords);
  }
  await activate(page, reflection(page).locator('[data-flight-reflection-action="save"]'), touch);
  await expect(reflection(page).locator('[data-flight-reflection-action="edit"]')).toBeFocused();
  const final = await data(page), expectedWork = JSON.parse(JSON.stringify(original.flightChallenges.work)); expectedWork[goal].attempts[0].reflection = laterWords;
  expect(final.flightChallenges.work).toEqual(expectedWork); expect(untouched(final)).toEqual(untouched(original));
  expect(final.flightChallenges.work[goal].attempts).toHaveLength(4); expect(await page.evaluate(() => (window as any).__round32XP)).toEqual([]);
  await expect(root(page).locator('[data-mission-progress-step="evidence"]')).toHaveAttribute('data-recorded', 'true');
  await writeFile(join(report, name + '.json'), JSON.stringify({ sourceProof, original, starting, saved, draft, buttons, fullscreen, final, writes: await writes(page), accessibility: await accessibility(page) }, null, 2));
}

test('Desktop Peregrine identity matches the frozen view and keeps pooled geometry during keyboard orbit', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await visualJourney(page, false);
});
test.describe('Light phone Peregrine portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Three-quarter identity stays fitted and native touch changes only the inspection angle', async ({ page }) => visualJourney(page, true));
});
test('Desktop keyboard inspections connect recorded flights to an unsaved reflection and another goal', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await learningJourney(page, false);
});
test.describe('Light phone challenge inspection', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch compares saved Solo and V flights and returns to the same reflection draft', async ({ page }) => learningJourney(page, true));
});
