import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, scene, frames, activate, data, writes, settled, expectFitted, expectStable, accessibility, capture } from './helpers/migration_round31';
import { portrait } from './helpers/migration_round32';

test.describe.configure({ retries: 0, timeout: 180_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round38-2026-10-23');
const canonical = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirror = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(canonical);
if (!source.equals(readFileSync(mirror))) throw new Error('Migration runtime copies differ');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE || Object.keys(process.env).some(key => /^MIGRATION_.*_CANDIDATE$/.test(key) && process.env[key])) throw new Error('Canonical regression rejects substitutions');
const sourceProof = { sha256: createHash('sha256').update(source).digest('hex'), bytes: source.length, canonical: true, mirrorIdentical: true };
const harness = makeHarness('stem_lab/stem_tool_migration.js');
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function overlays(page: Page) {
  return page.evaluate(() => {
    const root = (window as any).__glCanvas().rec.scene;
    const mark = root.getObjectByName('migration-marked-wing-pose'), path = root.getObjectByName('migration-wingtip-path');
    const visible = (name: string) => { let node = root.getObjectByName(name); if (!node) return false; while (node) { if (!node.visible) return false; node = node.parent; } return true; };
    return { visible: { anatomy: visible('migration-anatomy-callouts'), markers: visible('migration-anatomy-markers'),
      path: visible('migration-wingtip-path'), mark: visible('migration-marked-wing-pose'), airflow: visible('migration-airflow'), links: visible('migration-marked-wingtip-links') },
      mark: { source: mark.userData.sourceBirdUuid, captured: mark.userData.captured, phase: mark.userData.capturedPhase,
        version: mark.userData.captureVersion, positions: Array.from(mark.geometry.attributes.position.array), count: mark.geometry.drawRange.count },
      path: { geometry: path.children[0].geometry.uuid, positions: Array.from(path.children[0].geometry.attributes.position.array), version: path.userData.buildVersion },
      side: document.querySelector('[data-scene-study-side]')?.getAttribute('data-scene-study-side'),
      cycle: document.querySelector('[data-scene-study-cycle]')?.getAttribute('data-scene-study-cycle') };
  });
}
function samePose(before: any, after: any) {
  expectStable(before, after); expectFitted(after);
  expect(after.model).toEqual(before.model); expect(after.wings).toEqual(before.wings); expect(after.joints).toEqual(before.joints);
  expect(after.view.phase).toBe(before.view.phase); expect(after.view.step).toBe(before.view.step); expect(after.view.zoom).toBe(before.view.zoom);
  expect(after.marked).toEqual(before.marked); expect(after.projection).toEqual(before.projection);
}
async function beginCameraTrace(page: Page) {
  await page.evaluate(() => {
    const w = window as any, rec = w.__glCanvas().rec, previous = rec.scene.onBeforeRender; w.__round38CameraSamples = [];
    w.__round38PreviousRender = previous;
    rec.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      previous.call(this, renderer, scene, camera, ...rest);
      const bird = scene.getObjectByName('migration-flock').children[Number(w.__toolData.migration.flightStudyBird) || 0];
      const target = bird.getWorldPosition(new w.THREE.Vector3()), distance = camera.position.distanceTo(target);
      let extent = 0, minDepth = Infinity, maxDepth = -Infinity;
      const point = new w.THREE.Vector3();
      bird.traverse((node: any) => { const positions = node.geometry?.attributes?.position; if (!positions) return;
        for (let i = 0; i < positions.count; i++) { point.fromBufferAttribute(positions, i).applyMatrix4(node.matrixWorld).project(camera);
          extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y)); minDepth = Math.min(minDepth, point.z); maxDepth = Math.max(maxDepth, point.z); }
      });
      const half = Math.min(camera.fov * Math.PI / 360, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
      const fittedRadius = bird.userData.studyRadius * 1.18 / Math.sin(half) / w.__toolData.migration.flightStudyZoom;
      w.__round38CameraSamples.push({ distance, radius: bird.userData.studyRadius, fittedRadius, extent, minDepth, maxDepth, elevation: Math.atan2(camera.position.y - target.y, Math.hypot(camera.position.x - target.x, camera.position.z - target.z)) * 180 / Math.PI });
    };
  });
}
async function journey(page: Page, phone: boolean) {
  const species = phone ? 'monarch' : 'canada_goose', region = phone ? 'whole-wing' : 'head';
  const name = phone ? 'phone-monarch-underside' : 'desktop-goose-underside';
  await mount(harness, page, species, { dark: phone, reduced: phone, extra: {
    flightStudyYaw: 90, flightStudyPitch: 10, flightStudyZoom: 1, flightStudyRegion: region,
    flightShowAnatomy: true, flightShowWingtipPath: true, flightShowAirflow: true, flightStudyObservationOpen: true,
    flightStudyObservations: { drafts: { [species + ':' + region]: 'My surface prediction and evidence stay unfinished.' }, records: {}, comparison: { draft: 'My comparison stays unfinished.' } },
    flightInvestigation: { prediction: 'My migration prediction.', trials: [], evidence: 'My wind evidence.' }
  } });
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(phone);
  await activate(page, page.getByRole('button', { name: 'Individual’s left: solid path', exact: true }), phone);
  await activate(page, page.getByRole('button', { name: 'Cycle position 3 of 8', exact: true }), phone); await settled(page);
  await activate(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }), phone);
  const strip = page.locator('[data-scene-study-actions]'), toggle = strip.getByRole('checkbox', { name: 'Inspect without guides', exact: true });
  const note = page.getByRole('textbox', { name: 'My observation', exact: true });
  await note.evaluate((element: HTMLTextAreaElement) => { (window as any).__round38Draft = element; element.focus(); element.setSelectionRange(3, 15); });
  const beforeData = await data(page), before = await scene(page), beforeOverlay = await overlays(page), writesBefore = (await writes(page)).length;
  expectFitted(before); expect(beforeOverlay.side).toBe('left'); expect(beforeOverlay.cycle).toBe('2'); expect(beforeOverlay.mark.captured).toBe(true);
  const head = phone ? null : await portrait(page);
  const captures: any = { profileGuided: await capture(page, join(report, name + '-profile-guided.png')) };
  if (phone) await toggle.tap(); else { await toggle.focus(); await page.keyboard.press('Space'); } await frames(page);
  await expect(toggle).toBeChecked(); const hiddenOverlay = await overlays(page); expect(hiddenOverlay.visible).toEqual({ anatomy: false, markers: false, path: false, mark: false, airflow: false, links: false });
  expect(hiddenOverlay.mark).toEqual(beforeOverlay.mark); expect(hiddenOverlay.path).toEqual(beforeOverlay.path);
  captures.profileClean = await capture(page, join(report, name + '-profile-clean.png'));
  const checkpoints: any[] = [];
  for (const [id, label, pitch] of [['above', 'From above', 60], ['below', 'From below', -60]] as const) {
    if (id === 'below') await beginCameraTrace(page);
    await activate(page, page.getByRole('button', { name: label, exact: true }), phone); await settled(page);
    const current = await scene(page), layers = await overlays(page); samePose(before, current);
    expect(current.view).toMatchObject({ yaw: 0, pitch }); expect(layers.visible).toEqual(hiddenOverlay.visible);
    expect(layers.mark).toEqual(beforeOverlay.mark); expect(layers.path).toEqual(beforeOverlay.path);
    expect(layers.side).toBe('left'); expect(layers.cycle).toBe('2'); await expect(toggle).toBeChecked();
    await expect(page.locator('[data-study-viewpoint="' + id + '"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await data(page)).toEqual({ ...beforeData, flightStudyYaw: 0, flightStudyPitch: pitch });
    expect(await note.evaluate((element: HTMLTextAreaElement) => ({ same: element === (window as any).__round38Draft, value: element.value, selection: [element.selectionStart, element.selectionEnd] })))
      .toEqual({ same: true, value: 'My surface prediction and evidence stay unfinished.', selection: [3, 15] });
    captures[id + 'Clean'] = await capture(page, join(report, name + '-' + id + '-clean.png'));
    checkpoints.push({ id, current, layers, portrait: phone ? null : await portrait(page) });
  }
  expect((await writes(page)).slice(writesBefore)).toEqual([
    { bucket: 'migration', patch: { flightStudyYaw: 0, flightStudyPitch: 60 } },
    { bucket: 'migration', patch: { flightStudyYaw: 0, flightStudyPitch: -60 } }
  ]);
  const cameraSamples = await page.evaluate(() => {
    const w = window as any; w.__glCanvas().rec.scene.onBeforeRender = w.__round38PreviousRender; return w.__round38CameraSamples;
  });
  expect(cameraSamples.length).toBeGreaterThan(1);
  expect(cameraSamples.every((sample: any) => Number.isFinite(sample.distance) && sample.distance > sample.radius * 1.01)).toBe(true);
  for (const sample of cameraSamples) {
    expect(sample.distance).toBeCloseTo(sample.fittedRadius, 5);
    expect(sample.extent).toBeLessThan(.98); expect(sample.minDepth).toBeGreaterThan(-1); expect(sample.maxDepth).toBeLessThan(1);
  }
  expect(cameraSamples.at(-1).elevation).toBeCloseTo(-60, 4);
  const presets = page.getByRole('group', { name: 'Study viewpoints', exact: true }), buttons = presets.locator('button');
  await expect(buttons).toHaveCount(4); const boxes = [];
  for (const button of await buttons.all()) { const box = await button.boundingBox(); expect(box!.height).toBeGreaterThanOrEqual(44); expect(box!.width).toBeGreaterThanOrEqual(44);
    await expect(button).toHaveAttribute('aria-describedby', 'migration-study-surface-help'); boxes.push(box!); }
  expect(boxes[0].y).toBeCloseTo(boxes[1].y, 1); expect(boxes[2].y).toBeCloseTo(boxes[3].y, 1); expect(boxes[2].y).toBeGreaterThan(boxes[0].y);
  await expect(page.locator('#migration-study-surface-help')).toContainText('keep zoom fixed');
  await presets.scrollIntoViewIfNeeded(); await presets.screenshot({ path: join(report, name + '-viewpoints.png') });
  await activate(page, page.locator('[data-marked-pose-action="check"]'), phone);
  await expect(page.locator('[data-marked-comparison-check]')).toHaveAttribute('data-marked-comparison-kind', 'view-only');
  // Recapture the same held wing pose from below, then restore only its view settings.
  await activate(page, page.locator('[data-marked-pose-action="mark"]'), phone);
  const belowMark = await overlays(page); await activate(page, page.getByRole('button', { name: 'From above', exact: true }), phone); await settled(page);
  await activate(page, page.locator('[data-marked-pose-action="check"]'), phone);
  await activate(page, page.locator('[data-marked-pose-action="restore-view"]'), phone); await settled(page);
  expect(await data(page)).toMatchObject({ flightStudyYaw: 0, flightStudyPitch: -60, flightStudyZoom: 1 });
  expect((await overlays(page)).mark).toEqual(belowMark.mark); await expect(toggle).toBeChecked();
  await activate(page, page.locator('[data-marked-pose-action="check"]'), phone);
  await expect(page.locator('[data-marked-comparison-check]')).toHaveAttribute('data-marked-comparison-kind', 'same');
  if (phone) await toggle.tap(); else { await toggle.focus(); await page.keyboard.press('Space'); } await frames(page);
  await expect(toggle).not.toBeChecked(); expect((await overlays(page)).visible).toMatchObject({ anatomy: !phone, markers: !phone, path: true, mark: true, airflow: !phone });
  const restoredGuides = await scene(page); expectStable(before, restoredGuides); expectFitted(restoredGuides);
  // Explicitly record the learner's unchanged words and revisit the negative camera setting.
  await activate(page, page.getByRole('button', { name: 'Record observation', exact: true }), phone);
  const recorded = await data(page); expect(recorded.flightStudyObservations.records[species + ':' + region]).toMatchObject({ pitch: -60, yaw: 0, note: 'My surface prediction and evidence stay unfinished.' });
  await activate(page, page.getByRole('button', { name: 'From above', exact: true }), phone); await settled(page);
  await activate(page, page.getByRole('button', { name: 'Revisit recorded view', exact: true }), phone); await settled(page);
  const revisited = await scene(page); expectFitted(revisited); expect(revisited.view).toMatchObject({ yaw: 0, pitch: -60, zoom: 1 });
  expect((await data(page)).flightStudyObservations).toEqual(recorded.flightStudyObservations);
  expect((await data(page)).flightInvestigation).toEqual(beforeData.flightInvestigation);
  expect(await note.evaluate((element: HTMLTextAreaElement) => ({ same: element === (window as any).__round38Draft, value: element.value })))
    .toEqual({ same: true, value: 'My surface prediction and evidence stay unfinished.' });
  expect(source.equals(readFileSync(canonical)) && source.equals(readFileSync(mirror))).toBe(true);
  writeFileSync(join(report, name + '.json'), JSON.stringify({ sourceProof, motion: phone ? 'reduced' : 'ordinary', before, beforeData, beforeOverlay,
    head, captures, checkpoints, cameraSamples, boxes, belowMark, restoredGuides, recorded, revisited, accessibility: await accessibility(page) }, null, 2));
}
test('Desktop Canada Goose views reveal continuous chinstrap surfaces and preserve learner comparisons', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await journey(page, false);
});
test.describe('Dark phone Monarch underside inspection', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch viewpoints inspect both wing surfaces and retain authored evidence', async ({ page }) => journey(page, true));
});
