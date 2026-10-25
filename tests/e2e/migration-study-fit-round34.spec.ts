import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, scene, stage, frames, activate, data, writes, settled, expectFitted, expectStable, accessibility, capture } from './helpers/migration_round31';
import { portrait } from './helpers/migration_round32';

test.describe.configure({ retries: 0, timeout: 150_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round34-2026-10-23');
const source = readFileSync(join(process.cwd(), 'stem_lab/stem_tool_migration.js'));
if (!source.equals(readFileSync(join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js')))) throw new Error('Migration runtime copies differ');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE || Object.keys(process.env).some(key => /^MIGRATION_.*_CANDIDATE$/.test(key) && process.env[key])) throw new Error('Canonical regression rejects substitutions');
const sourceProof = { sha256: createHash('sha256').update(source).digest('hex'), bytes: source.length, canonical: true, mirrorIdentical: true };
const harness = makeHarness('stem_lab/stem_tool_migration.js');
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

function billIdentity(p: any) {
  expect(p.bill).not.toBeNull(); expect(p.bill.vertexColors).toBe(true); expect(p.bill.materialColor).toBe(0xffffff);
  for (const key of ['positions', 'normals', 'colors']) { expect(p.bill[key].length).toBeGreaterThan(0); expect(p.bill[key].every(Number.isFinite)).toBe(true); }
  expect(new Set(p.bill.colors).size).toBeGreaterThan(3);
}
async function journey(page: Page, phone: boolean) {
  const species = 'bartailed_godwit', name = phone ? 'phone-godwit-fit' : 'desktop-godwit-fit';
  await mount(harness, page, species, { dark: phone, extra: {
    flightStudyYaw: 115, flightStudyPitch: 0, flightStudyZoom: 1.6, flightStudyRegion: 'head',
    flightShowAnatomy: false, flightShowWingtipPath: true, flightStudyObservationOpen: true,
    flightStudyObservations: { drafts: { 'bartailed_godwit:head': 'My unfinished bill observation stays here.' }, records: {}, comparison: { draft: 'My comparison stays unfinished.' } },
    flightInvestigation: { prediction: 'Keep my migration prediction.', trials: [] }
  } });
  await activate(page, page.getByRole('button', { name: 'Cycle position 3 of 8', exact: true }), phone);
  await settled(page);
  const note = page.getByRole('textbox', { name: 'My observation', exact: true });
  await note.evaluate((element: HTMLTextAreaElement) => { (window as any).__round34Draft = element; element.focus(); element.setSelectionRange(3, 14); });
  const strip = page.locator('[data-scene-study-actions]'), fit = strip.locator('[data-scene-study-action="fit"]');
  await expect(fit).toBeEnabled(); await expect(fit).toHaveText('Fit whole model');
  await expect(strip.locator('[data-scene-study-zoom]')).toHaveText('Zoom: 160% of fitted view');
  expect(await fit.getAttribute('aria-controls')).toBe('migration-flight-stage');
  expect(await fit.getAttribute('aria-describedby')).toBe('migration-study-fit-help');
  const beforeData = await data(page), before = await scene(page), beforePortrait = await portrait(page);
  billIdentity(beforePortrait);
  const writesBefore = (await writes(page)).length;
  await activate(page, fit, phone); await settled(page);
  const after = await scene(page), afterPortrait = await portrait(page), afterData = await data(page);
  expect(afterData).toEqual({ ...beforeData, flightStudyZoom: 1 });
  expect((await writes(page)).slice(writesBefore)).toEqual([{ bucket: 'migration', patch: { flightStudyZoom: 1 } }]);
  expectFitted(after); expectStable(before, after); billIdentity(afterPortrait);
  expect(before.extent).toBeGreaterThan(after.extent * 1.35);
  expect(after.model).toEqual(before.model); expect(after.joints).toEqual(before.joints); expect(after.wings).toEqual(before.wings); expect(after.marked).toEqual(before.marked);
  for (const index of [0, 1, 2, 4, 5, 6, 8, 9, 10]) expect(after.camera[index]).toBeCloseTo(before.camera[index], 6);
  expect(after.view).toEqual({ ...before.view, zoom: 1 });
  for (const key of ['uuid', 'geometry', 'material', 'positions', 'normals', 'colors', 'indices', 'position', 'rotation', 'scale']) expect(afterPortrait.bill[key]).toEqual(beforePortrait.bill[key]);
  await expect(strip.locator('[data-scene-study-zoom]')).toHaveText('Zoom: 100% of fitted view');
  await expect(strip.locator('#migration-study-fit-help')).toHaveText('100% fits the whole model at this angle. Fitted models do not share a physical size scale.');
  await expect(strip.locator('[data-scene-study-cycle]')).toHaveText('Cycle 3/8 selected');
  await expect(fit).toBeFocused();
  expect(await note.evaluate((element: HTMLTextAreaElement) => ({ same: element === (window as any).__round34Draft, value: element.value, selection: [element.selectionStart, element.selectionEnd] }))).toEqual({ same: true, value: 'My unfinished bill observation stays here.', selection: [3, 14] });
  await activate(page, fit, phone); expect((await writes(page)).slice(writesBefore)).toEqual([{ bucket: 'migration', patch: { flightStudyZoom: 1 } }]);
  const fitBounds = await fit.boundingBox(); expect(fitBounds!.height).toBeGreaterThanOrEqual(44); expect(fitBounds!.width).toBeGreaterThanOrEqual(44);
  const stageCapture = await capture(page, join(report, name + '-stage.png'));
  await strip.scrollIntoViewIfNeeded(); const stripBounds = await strip.boundingBox();
  expect(stripBounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width); expect(stripBounds!.height).toBeLessThan(page.viewportSize()!.height);
  await strip.screenshot({ path: join(report, name + '-controls.png') });
  await activate(page, page.getByRole('button', { name: 'Observe Head & bill', exact: true }), phone);
  await expect(page.getByText('slightly upturned bill', { exact: false })).toBeVisible();
  await activate(page, page.getByRole('button', { name: 'Front', exact: true }), phone); await settled(page);
  const front = await scene(page);
  await activate(page, page.getByRole('button', { name: 'Profile', exact: true }), phone); await settled(page);
  const profile = await scene(page), profilePortrait = await portrait(page);
  expectFitted(front); expectFitted(profile);
  expect(front.camera).not.toEqual(profile.camera);
  expect(front.model).toEqual(after.model); expect(profile.model).toEqual(after.model);
  expect(front.joints).toEqual(after.joints); expect(profile.joints).toEqual(after.joints);
  expect(profilePortrait.bill.positions).toEqual(afterPortrait.bill.positions);
  expect(profilePortrait.bill.colors).toEqual(afterPortrait.bill.colors);
  expect((await data(page)).flightStudyObservations).toEqual(beforeData.flightStudyObservations);
  writeFileSync(join(report, name + '.json'), JSON.stringify({ sourceProof, before, after, beforePortrait, afterPortrait, front, profile, fitBounds, stageCapture, stripBounds, accessibility: await accessibility(page) }, null, 2));
}
test('Desktop keyboard fits the godwit without changing its angle, bill geometry or observation', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await journey(page, false);
});
test.describe('Dark phone godwit Study', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch fit restores full framing with readable controls and preserved learner work', async ({ page }) => journey(page, true));
});
