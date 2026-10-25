import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, scene, frames, activate, data, writes, settled, expectFitted, expectStable, accessibility, capture } from './helpers/migration_round31';
import { portrait } from './helpers/migration_round32';

test.describe.configure({ retries: 0, timeout: 150_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round36-2026-10-23');
const source = readFileSync(join(process.cwd(), 'stem_lab/stem_tool_migration.js'));
if (!source.equals(readFileSync(join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js')))) throw new Error('Migration runtime copies differ');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE || Object.keys(process.env).some(key => /^MIGRATION_.*_CANDIDATE$/.test(key) && process.env[key])) throw new Error('Canonical regression rejects substitutions');
const sourceProof = { sha256: createHash('sha256').update(source).digest('hex'), bytes: source.length, canonical: true, mirrorIdentical: true };
const harness = makeHarness('stem_lab/stem_tool_migration.js');
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function markAndTipState(page: Page) {
  return page.evaluate(() => {
    const w = window as any, root = w.__glCanvas().rec.scene;
    const mark = root.getObjectByName('migration-marked-wing-pose');
    const strip = document.querySelector('[data-scene-study-actions]');
    return { mark: { source: mark.userData.sourceBirdUuid, captured: mark.userData.captured, phase: mark.userData.capturedPhase,
      version: mark.userData.captureVersion, positions: Array.from(mark.geometry.attributes.position.array), count: mark.geometry.drawRange.count },
      side: strip?.querySelector('[data-scene-study-side]')?.getAttribute('data-scene-study-side') };
  });
}
function phaseNear(actual: number, expected: number) {
  expect(Math.sin(actual)).toBeCloseTo(Math.sin(expected), 8);
  expect(Math.cos(actual)).toBeCloseTo(Math.cos(expected), 8);
}
function fixedExperiment(before: any, after: any) {
  expectStable(before, after); expectFitted(after); expect(after.model).toEqual(before.model); expect(after.projection).toEqual(before.projection);
  expect(after.view).toEqual({ ...before.view, phase: after.view.phase }); expect(after.marked).toEqual(before.marked);
  after.camera.forEach((value: number, index: number) => expect(value).toBeCloseTo(before.camera[index], 4));
}
function craneHead(p: any) {
  expect(p.head).not.toBeNull(); expect(p.head.vertices).toBe(425); expect(p.head.triangles).toBe(720);
  expect(p.head.vertexColors).toBe(true); expect(p.head.materialColor).toBe(0xffffff);
  for (const key of ['positions', 'normals', 'colors']) { expect(p.head[key].length).toBeGreaterThan(0); expect(p.head[key].every(Number.isFinite)).toBe(true); }
  expect(new Set(p.head.colors).size).toBeGreaterThan(3);
}

async function journey(page: Page, phone: boolean) {
  const species = phone ? 'monarch' : 'sandhill_crane', region = phone ? 'whole-wing' : 'head';
  const name = phone ? 'phone-monarch-adjacent-cycle' : 'desktop-crane-adjacent-cycle';
  await mount(harness, page, species, { dark: phone, reduced: phone, extra: {
    flightStudyYaw: phone ? 0 : 90, flightStudyPitch: phone ? 60 : 10, flightStudyZoom: 1, flightStudyRegion: region,
    flightShowAnatomy: !phone, flightShowWingtipPath: true, flightStudyObservationOpen: true,
    flightStudyObservations: { drafts: { [species + ':' + region]: 'My prediction and wingtip evidence stay unfinished.' }, records: {}, comparison: { draft: 'My comparison stays unfinished.' } },
    flightInvestigation: { prediction: 'My migration prediction.', trials: [], evidence: 'My wind evidence.' }
  } });
  const strip = page.locator('[data-scene-study-actions]'), next = strip.locator('[data-scene-study-action="next"]'), previous = strip.locator('[data-scene-study-action="previous"]');
  await expect(next).toBeDisabled(); await expect(previous).toBeDisabled();
  await expect(next).toHaveText('Next cycle position'); await expect(previous).toHaveText('Previous cycle position');
  for (const button of [next, previous]) {
    await expect(button).toHaveAttribute('aria-controls', 'migration-flight-stage');
    await expect(button).toHaveAttribute('aria-describedby', 'migration-study-adjacent-help');
    const box = await button.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.locator('#migration-study-adjacent-help')).toContainText('Predict how the wingtip will move');
  await expect(page.locator('#migration-study-adjacent-help')).toContainText('not measured flight times');
  await activate(page, page.getByRole('button', { name: 'Individual’s left: solid path', exact: true }), phone);
  await activate(page, page.getByRole('button', { name: 'Cycle position 8 of 8', exact: true }), phone); await settled(page);
  await activate(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }), phone);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(phone);
  const note = page.getByRole('textbox', { name: 'My observation', exact: true });
  await note.evaluate((element: HTMLTextAreaElement) => { (window as any).__round36Draft = element; element.focus(); element.setSelectionRange(3, 15); });
  const beforeData = await data(page), before = await scene(page), beforeMark = await markAndTipState(page), writesBefore = (await writes(page)).length;
  const profilePortrait = phone ? null : await portrait(page); if (profilePortrait) craneHead(profilePortrait);
  expectFitted(before); phaseNear(before.view.phase, 7 * Math.PI / 4); expect(beforeMark.side).toBe('left'); expect(beforeMark.mark.captured).toBe(true);
  const checks: any[] = [];
  async function chooseAdjacent(direction: 'next' | 'previous', index: number) {
    const button = direction === 'next' ? next : previous; await activate(page, button, phone); await settled(page);
    await expect(strip.locator('[data-scene-study-cycle]')).toHaveText('Cycle ' + (index + 1) + '/8 selected');
    await expect(page.getByRole('button', { name: 'Cycle position ' + (index + 1) + ' of 8', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toBeFocused();
    const current = await scene(page), mark = await markAndTipState(page); fixedExperiment(before, current); phaseNear(current.view.phase, index * Math.PI / 4);
    expect(mark).toEqual(beforeMark); expect(await data(page)).toEqual(beforeData);
    expect(await note.evaluate((element: HTMLTextAreaElement) => ({ same: element === (window as any).__round36Draft, value: element.value, selection: [element.selectionStart, element.selectionEnd] })))
      .toEqual({ same: true, value: 'My prediction and wingtip evidence stay unfinished.', selection: [3, 15] });
    checks.push({ direction, index, current, mark }); return current;
  }
  const adjacent = await chooseAdjacent('next', 0); expect(adjacent.joints).not.toEqual(before.joints);
  const returned = await chooseAdjacent('previous', 7); expect(returned.joints).toEqual(before.joints); expect(returned.wings).toEqual(before.wings);
  for (const index of [0, 1, 2]) await chooseAdjacent('next', index);
  for (const index of [1, 0, 7]) await chooseAdjacent('previous', index);
  expect((await writes(page)).slice(writesBefore)).toEqual(Array.from({ length: 8 }, () => ({ bucket: 'migration', patch: { flightPaused: true } })));
  const stageCapture = await capture(page, join(report, name + (phone ? '-stage.png' : '-profile.png')));
  let above: any = null, abovePortrait: any = null, aboveCapture: any = null;
  if (!phone) {
    await activate(page, page.getByRole('button', { name: 'From above', exact: true })); await settled(page);
    above = await scene(page); abovePortrait = await portrait(page); craneHead(abovePortrait); expectFitted(above);
    expect(abovePortrait.head).toEqual(profilePortrait.head); expect(abovePortrait.bill).toEqual(profilePortrait.bill);
    expect(await markAndTipState(page)).toEqual(beforeMark); phaseNear(above.view.phase, before.view.phase);
    aboveCapture = await capture(page, join(report, name + '-above.png'));
  }
  await strip.scrollIntoViewIfNeeded(); const stripBounds = await strip.boundingBox();
  expect(stripBounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width); expect(stripBounds!.height).toBeLessThan(page.viewportSize()!.height);
  await strip.screenshot({ path: join(report, name + '-controls.png') });
  if (!phone) {
    await activate(page, page.getByRole('button', { name: 'Observe Head & bill', exact: true }));
    await expect(page.getByText('red crown', { exact: false })).toBeVisible(); await expect(page.getByText('pale cheeks', { exact: false })).toBeVisible();
  } else {
    await expect(strip.locator('[data-scene-study-region]')).toHaveText('Whole-insect wing motion');
  }
  expect((await data(page)).flightStudyObservations).toEqual(beforeData.flightStudyObservations);
  writeFileSync(join(report, name + '.json'), JSON.stringify({ sourceProof, motion: phone ? 'reduced' : 'ordinary', before, beforeMark, beforeData,
    adjacent, returned, checks, profilePortrait, above, abovePortrait, stageCapture, aboveCapture, stripBounds, accessibility: await accessibility(page) }, null, 2));
}
test('Desktop crane crown and reversible adjacent-cycle observations preserve one fixed experiment', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await journey(page, false);
});
test.describe('Dark phone Monarch Study', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch cycle navigation wraps in both directions and keeps whole-wing evidence intact', async ({ page }) => journey(page, true));
});
