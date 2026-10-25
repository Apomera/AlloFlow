import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, scene, frames, activate, data, writes, settled, expectFitted, expectStable, accessibility, capture } from './helpers/migration_round31';
import { portrait } from './helpers/migration_round32';

test.describe.configure({ retries: 0, timeout: 150_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round35-2026-10-23');
const source = readFileSync(join(process.cwd(), 'stem_lab/stem_tool_migration.js'));
if (!source.equals(readFileSync(join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js')))) throw new Error('Migration runtime copies differ');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE || Object.keys(process.env).some(key => /^MIGRATION_.*_CANDIDATE$/.test(key) && process.env[key])) throw new Error('Canonical regression rejects substitutions');
const sourceProof = { sha256: createHash('sha256').update(source).digest('hex'), bytes: source.length, canonical: true, mirrorIdentical: true };
const harness = makeHarness('stem_lab/stem_tool_migration.js');
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

function billIdentity(p: any) {
  expect(p.bill).not.toBeNull(); expect(p.bill.vertices).toBe(114);
  for (const key of ['positions', 'normals']) { expect(p.bill[key].length).toBeGreaterThan(0); expect(p.bill[key].every(Number.isFinite)).toBe(true); }
  if (p.view.species === 'snow_goose') {
    expect(p.bill.vertexColors).toBe(true); expect(p.bill.materialColor).toBe(0xffffff);
    expect(p.bill.colors.every(Number.isFinite)).toBe(true); expect(new Set(p.bill.colors).size).toBeGreaterThan(3);
  } else {
    expect(p.bill.vertexColors).toBe(false); expect(p.bill.materialColor).toBe(0x1f2937); expect(p.bill.colors).toBeNull();
  }
}
function unchangedBill(before: any, after: any) {
  for (const key of ['uuid', 'geometry', 'material', 'positions', 'normals', 'colors', 'indices', 'position', 'rotation', 'scale']) expect(after.bill[key]).toEqual(before.bill[key]);
}
async function observeNextTurnFrames(page: Page, expectedYaw: number) {
  await page.evaluate(yaw => {
    const w = window as any, rec = w.__glCanvas().rec;
    if (!w.__round35OriginalBeforeRender) {
      w.__round35OriginalBeforeRender = rec.scene.onBeforeRender;
      rec.scene.onBeforeRender = function(renderer: any, root: any, camera: any, ...rest: any[]) {
        w.__round35OriginalBeforeRender.call(this, renderer, root, camera, ...rest);
        const d = w.__toolData.migration, probe = w.__round35TurnProbe;
        if (!probe || d.flightStudyYaw !== probe.yaw || probe.samples.length >= 12) return;
        const T = w.THREE, bird = root.getObjectByName('migration-flock').children[Number(d.flightStudyBird) || 0];
        const target = bird.getWorldPosition(new T.Vector3());
        const half = Math.min(camera.fov * Math.PI / 360, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
        const radius = bird.userData.studyRadius * 1.18 / Math.sin(half) / d.flightStudyZoom;
        const yawRad = d.flightStudyYaw * Math.PI / 180, pitch = d.flightStudyPitch * Math.PI / 180;
        const desired = target.clone().add(new T.Vector3(Math.sin(yawRad) * Math.cos(pitch) * radius, Math.sin(pitch) * radius, Math.cos(yawRad) * Math.cos(pitch) * radius));
        probe.samples.push({ distance: camera.position.distanceTo(target), radius, error: camera.position.distanceTo(desired), position: camera.position.toArray(), phase: bird.userData.lastRenderedWingPhase });
      };
    }
    w.__round35TurnProbe = { yaw, samples: [] };
  }, expectedYaw);
}
async function assertNoThroughModelFrames(page: Page) {
  await frames(page);
  const samples = await page.evaluate(() => (window as any).__round35TurnProbe.samples);
  expect(samples.length).toBeGreaterThanOrEqual(2);
  for (const sample of samples) {
    expect(sample.error).toBeLessThan(1e-5);
    expect(sample.distance / sample.radius).toBeCloseTo(1, 6);
  }
  return samples;
}

async function journey(page: Page, phone: boolean) {
  const species = phone ? 'canada_goose' : 'snow_goose', name = phone ? 'phone-canada-goose-inspection' : 'desktop-snow-goose-inspection';
  await mount(harness, page, species, { dark: phone, reduced: phone, extra: {
    flightStudyYaw: 90, flightStudyPitch: 0, flightStudyZoom: 1.2, flightStudyRegion: 'head',
    flightShowAnatomy: false, flightShowWingtipPath: true, flightStudyObservationOpen: true,
    flightStudyObservations: { drafts: { [species + ':head']: 'My unfinished bill observation stays here.' }, records: {}, comparison: { draft: 'My comparison stays unfinished.' } },
    flightInvestigation: { prediction: 'Keep my migration prediction.', trials: [] }
  } });
  await activate(page, page.getByRole('button', { name: 'Cycle position 3 of 8', exact: true }), phone); await settled(page);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(phone);
  const note = page.getByRole('textbox', { name: 'My observation', exact: true });
  await note.evaluate((element: HTMLTextAreaElement) => { (window as any).__round35Draft = element; element.focus(); element.setSelectionRange(3, 14); });
  const strip = page.locator('[data-scene-study-actions]'), turn = strip.locator('[data-scene-study-action="half-turn"]');
  await expect(turn).toBeEnabled(); await expect(turn).toHaveText('Turn view 180°');
  expect(await turn.getAttribute('aria-controls')).toBe('migration-flight-stage');
  expect(await turn.getAttribute('aria-describedby')).toBe('migration-study-turn-help');
  const beforeData = await data(page), before = await scene(page), beforePortrait = await portrait(page), writesBefore = (await writes(page)).length;
  billIdentity(beforePortrait);
  await observeNextTurnFrames(page, -90); await activate(page, turn, phone);
  const outwardFrames = await assertNoThroughModelFrames(page); await settled(page);
  const opposite = await scene(page), oppositePortrait = await portrait(page);
  expect(await data(page)).toEqual({ ...beforeData, flightStudyYaw: -90 });
  expect((await writes(page)).slice(writesBefore)).toEqual([{ bucket: 'migration', patch: { flightStudyYaw: -90 } }]);
  expectStable(before, opposite); unchangedBill(beforePortrait, oppositePortrait);
  expect(opposite.model).toEqual(before.model); expect(opposite.joints).toEqual(before.joints); expect(opposite.wings).toEqual(before.wings); expect(opposite.marked).toEqual(before.marked);
  expect(opposite.view).toEqual({ ...before.view, yaw: -90 }); expect(opposite.camera).not.toEqual(before.camera);
  await expect(strip.locator('[data-scene-study-cycle]')).toHaveText('Cycle 3/8 selected'); await expect(turn).toBeFocused();
  expect(await note.evaluate((element: HTMLTextAreaElement) => ({ same: element === (window as any).__round35Draft, value: element.value, selection: [element.selectionStart, element.selectionEnd] })))
    .toEqual({ same: true, value: 'My unfinished bill observation stays here.', selection: [3, 14] });
  await observeNextTurnFrames(page, 90); await activate(page, turn, phone);
  const returnFrames = await assertNoThroughModelFrames(page); await settled(page);
  const returned = await scene(page); expectStable(before, returned); expect(returned.view).toEqual(before.view); expect(await data(page)).toEqual(beforeData);
  returned.camera.forEach((value: number, i: number) => expect(value).toBeCloseTo(before.camera[i], 5));
  expect((await writes(page)).slice(writesBefore)).toEqual([{ bucket: 'migration', patch: { flightStudyYaw: -90 } }, { bucket: 'migration', patch: { flightStudyYaw: 90 } }]);
  const turnBounds = await turn.boundingBox(); expect(turnBounds!.height).toBeGreaterThanOrEqual(44); expect(turnBounds!.width).toBeGreaterThanOrEqual(44);
  await activate(page, strip.locator('[data-scene-study-action="fit"]'), phone); await settled(page);
  await activate(page, turn, phone); await settled(page); const fittedOpposite = await scene(page); expectFitted(fittedOpposite);
  const stageCapture = await capture(page, join(report, name + '-stage.png'));
  await strip.scrollIntoViewIfNeeded(); const stripBounds = await strip.boundingBox();
  expect(stripBounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width); expect(stripBounds!.height).toBeLessThan(page.viewportSize()!.height);
  await strip.screenshot({ path: join(report, name + '-controls.png') });
  await activate(page, page.getByRole('button', { name: 'Observe Head & bill', exact: true }), phone);
  await expect(page.getByText(phone ? 'broad bill' : 'dark side patch', { exact: false })).toBeVisible();
  expect((await data(page)).flightStudyObservations).toEqual(beforeData.flightStudyObservations);
  writeFileSync(join(report, name + '.json'), JSON.stringify({ sourceProof, motion: phone ? 'reduced' : 'ordinary', before, opposite, returned, fittedOpposite,
    beforePortrait, oppositePortrait, outwardFrames, returnFrames, turnBounds, stageCapture, stripBounds, accessibility: await accessibility(page) }, null, 2));
}
test('Desktop keyboard inspects both Snow Goose bill sides without a camera pass through the model', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await journey(page, false);
});
test.describe('Dark phone Canada Goose Study', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch half-turn preserves the bill, selected cycle, and learner draft', async ({ page }) => journey(page, true));
});
