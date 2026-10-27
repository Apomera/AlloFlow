import { test, expect, type Page } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, scene, frames, activate, data, writes, settled, expectFitted, expectStable, accessibility, capture } from './helpers/migration_round31';
import { portrait } from './helpers/migration_round32';

test.describe.configure({ retries: 0, timeout: 150_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round37-2026-10-23');
const source = readFileSync(join(process.cwd(), 'stem_lab/stem_tool_migration.js'));
if (!source.equals(readFileSync(join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js')))) throw new Error('Migration runtime copies differ');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE || Object.keys(process.env).some(key => /^MIGRATION_.*_CANDIDATE$/.test(key) && process.env[key])) throw new Error('Canonical regression rejects substitutions');
const sourceProof = { sha256: createHash('sha256').update(source).digest('hex'), bytes: source.length, canonical: true, mirrorIdentical: true };
const harness = makeHarness('stem_lab/stem_tool_migration.js');
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function overlays(page: Page) {
  return page.evaluate(() => {
    const w = window as any, root = w.__glCanvas().rec.scene;
    const mark = root.getObjectByName('migration-marked-wing-pose'), path = root.getObjectByName('migration-wingtip-path');
    const node = (name: string) => root.getObjectByName(name);
    const visible = (name: string) => { let object = node(name); if (!object) return false; while (object) { if (!object.visible) return false; object = object.parent; } return true; };
    return { visible: { anatomy: visible('migration-anatomy-callouts'), markers: visible('migration-anatomy-markers'),
      path: visible('migration-wingtip-path'), mark: visible('migration-marked-wing-pose'), airflow: visible('migration-airflow'), links: visible('migration-marked-wingtip-links') },
      mark: { source: mark.userData.sourceBirdUuid, captured: mark.userData.captured, phase: mark.userData.capturedPhase,
        version: mark.userData.captureVersion, positions: Array.from(mark.geometry.attributes.position.array), count: mark.geometry.drawRange.count },
      path: { geometry: path.children[0].geometry.uuid, positions: Array.from(path.children[0].geometry.attributes.position.array), version: path.userData.buildVersion },
      side: document.querySelector('[data-scene-study-side]')?.getAttribute('data-scene-study-side'),
      cycle: document.querySelector('[data-scene-study-cycle]')?.getAttribute('data-scene-study-cycle') };
  });
}
function fixedView(before: any, after: any, phaseChanges = false) {
  expectStable(before, after); expectFitted(after); expect(after.model).toEqual(before.model); expect(after.projection).toEqual(before.projection);
  expect(after.view).toEqual(phaseChanges ? { ...before.view, phase: after.view.phase } : before.view); expect(after.marked).toEqual(before.marked);
  after.camera.forEach((value: number, index: number) => expect(value).toBeCloseTo(before.camera[index], 4));
  if (!phaseChanges) { expect(after.wings).toEqual(before.wings); expect(after.joints).toEqual(before.joints); }
}
function ternHead(p: any) {
  expect(p.head).not.toBeNull(); expect(p.head.vertices).toBe(425); expect(p.head.triangles).toBe(720);
  expect(p.head.vertexColors).toBe(true); expect(p.head.materialColor).toBe(0xffffff);
  for (const key of ['positions', 'normals', 'colors']) { expect(p.head[key].length).toBeGreaterThan(0); expect(p.head[key].every(Number.isFinite)).toBe(true); }
  expect(new Set(p.head.colors).size).toBeGreaterThan(3);
}
async function journey(page: Page, phone: boolean) {
  const species = phone ? 'monarch' : 'arctic_tern', region = phone ? 'whole-wing' : 'head';
  const name = phone ? 'phone-monarch-clean-view' : 'desktop-tern-clean-view';
  await mount(harness, page, species, { dark: phone, reduced: phone, extra: {
    flightStudyYaw: phone ? 0 : 90, flightStudyPitch: phone ? 60 : 10, flightStudyZoom: 1, flightStudyRegion: region,
    flightShowAnatomy: true, flightShowWingtipPath: true, flightShowAirflow: true, flightStudyObservationOpen: true,
    flightStudyObservations: { drafts: { [species + ':' + region]: 'My shape prediction and evidence stay unfinished.' }, records: {}, comparison: { draft: 'My comparison stays unfinished.' } },
    flightInvestigation: { prediction: 'My migration prediction.', trials: [], evidence: 'My wind evidence.' }
  } });
  const strip = page.locator('[data-scene-study-actions]'), toggle = strip.getByRole('checkbox', { name: 'Inspect without guides', exact: true });
  await expect(toggle).toBeEnabled(); await expect(toggle).not.toBeChecked();
  await expect(toggle).toHaveAttribute('aria-controls', 'migration-flight-stage'); await expect(toggle).toHaveAttribute('aria-describedby', 'migration-study-clean-help');
  const box = await toggle.locator('..').boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator("[data-migration-id=\"migration-study-clean-help\"]")).toContainText(/predict/i);
  await activate(page, page.getByRole('button', { name: 'Individual’s left: solid path', exact: true }), phone);
  await activate(page, page.getByRole('button', { name: 'Cycle position 3 of 8', exact: true }), phone); await settled(page);
  await activate(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }), phone);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(phone);
  const note = page.getByRole('textbox', { name: 'My observation', exact: true });
  await note.evaluate((element: HTMLTextAreaElement) => { (window as any).__round37Draft = element; element.focus(); element.setSelectionRange(3, 15); });
  const beforeData = await data(page), before = await scene(page), beforeOverlay = await overlays(page), writesBefore = (await writes(page)).length;
  expectFitted(before); expect(beforeOverlay.side).toBe('left'); expect(beforeOverlay.cycle).toBe('2'); expect(beforeOverlay.mark.captured).toBe(true);
  expect(beforeOverlay.visible).toMatchObject({ anatomy: !phone, markers: !phone, path: true, mark: true, airflow: !phone });
  const profilePortrait = phone ? null : await portrait(page); if (profilePortrait) ternHead(profilePortrait);
  const guidedCapture = await capture(page, join(report, name + (phone ? '-guided.png' : '-profile-guided.png')));
  async function toggleGuides(hidden: boolean) {
    if (phone) await toggle.tap(); else { await toggle.focus(); await page.keyboard.press('Space'); } await frames(page);
    await expect(toggle).toBeChecked({ checked: hidden }); await expect(toggle).toBeFocused();
    if (hidden) {
      await expect(page.getByRole('group', { name: 'Scene layer key', exact: true })).toHaveCount(0);
      await expect(strip.locator('[data-study-guides-status]')).toContainText('Guides temporarily hidden.');
      await expect(page.locator('[data-study-motion-evidence="clean-view"]')).toContainText(/predict/i);
      await expect(page.locator('[data-study-motion-evidence="clean-view"]')).toContainText(/restore/i);
      await expect(page.locator('[data-study-anatomy-side]')).toHaveCount(0);
      if (!phone) await expect(strip.locator('[data-scene-study-region]')).toHaveText('Region: Head & bill');
    } else await expect(page.locator('[data-study-motion-evidence="clean-view"]')).toHaveCount(0);
    expect(await data(page)).toEqual(beforeData);
    expect(await note.evaluate((element: HTMLTextAreaElement) => ({ same: element === (window as any).__round37Draft, value: element.value, selection: [element.selectionStart, element.selectionEnd] })))
      .toEqual({ same: true, value: 'My shape prediction and evidence stay unfinished.', selection: [3, 15] });
  }
  await toggleGuides(true); const hidden = await scene(page), hiddenOverlay = await overlays(page);
  fixedView(before, hidden); expect(hiddenOverlay.visible).toEqual({ anatomy: false, markers: false, path: false, mark: false, airflow: false, links: false });
  expect(hiddenOverlay.mark).toEqual(beforeOverlay.mark); expect(hiddenOverlay.path).toEqual(beforeOverlay.path); expect(hiddenOverlay.side).toBe('left'); expect(hiddenOverlay.cycle).toBe('2');
  expect((await writes(page)).length).toBe(writesBefore);
  const cleanCapture = await capture(page, join(report, name + (phone ? '-clean.png' : '-profile-clean.png')));
  for (const [side, label] of [['right', 'right'], ['left', 'left']] as const) {
    await activate(page, page.getByRole('button', { name: label === 'left' ? 'Individual’s left: solid path' : 'Individual’s right: dashed path', exact: true }), phone);
    await expect(page.locator('[data-wingtip-follow-status]')).toHaveText('Individual’s ' + label + ' wingtip selected. Guides are temporarily hidden.');
    await expect(strip.locator('[data-scene-study-side]')).toHaveAttribute('data-scene-study-side', side);
    await expect(toggle).toBeChecked(); expect((await overlays(page)).visible).toEqual(hiddenOverlay.visible);
  }
  for (const selector of ["[data-migration-id=\"migration-wingtip-follow-help\"]", "[data-migration-id=\"migration-marked-pose-help\"]", "[data-migration-id=\"migration-study-cycle-help\"]"]) {
    await expect(page.locator(selector)).toContainText('Restore the guides'); await expect(page.locator(selector)).toContainText('hidden');
  }
  expect((await writes(page)).length).toBe(writesBefore);
  const checks: any[] = [];
  for (const [direction, index] of [['next', 3], ['previous', 2]] as const) {
    await activate(page, strip.locator('[data-scene-study-action="' + direction + '"]'), phone); await settled(page);
    await expect(toggle).toBeChecked(); await expect(strip.locator('[data-scene-study-cycle]')).toHaveText('Cycle ' + (index + 1) + '/8 selected');
    const current = await scene(page), currentOverlays = await overlays(page); fixedView(before, current, true);
    expect(Math.sin(current.view.phase)).toBeCloseTo(Math.sin(index * Math.PI / 4), 8); expect(Math.cos(current.view.phase)).toBeCloseTo(Math.cos(index * Math.PI / 4), 8);
    expect(currentOverlays.visible).toEqual(hiddenOverlay.visible); expect(currentOverlays.mark).toEqual(beforeOverlay.mark);
    expect(currentOverlays.side).toBe('left'); expect(await data(page)).toEqual(beforeData); checks.push({ direction, current, currentOverlays });
  }
  await toggleGuides(false); const restored = await scene(page), restoredOverlays = await overlays(page); fixedView(before, restored);
  expect(restoredOverlays).toEqual(beforeOverlay);
  expect((await writes(page)).slice(writesBefore)).toEqual([{ bucket: 'migration', patch: { flightPaused: true } }, { bucket: 'migration', patch: { flightPaused: true } }]);
  let above: any = null, aboveClean: any = null, abovePortrait: any = null, aboveGuidedCapture: any = null, aboveCleanCapture: any = null;
  if (!phone) {
    await activate(page, page.getByRole('button', { name: 'From above', exact: true })); await settled(page);
    above = await scene(page); abovePortrait = await portrait(page); ternHead(abovePortrait); expectFitted(above);
    expect(abovePortrait.head).toEqual(profilePortrait.head); expect(abovePortrait.bill).toEqual(profilePortrait.bill);
    aboveGuidedCapture = await capture(page, join(report, name + '-above-guided.png'));
    // Viewpoint changes are explicit; this second inspection must not write new settings.
    const aboveData = await data(page), aboveWrites = (await writes(page)).length;
    await toggle.focus(); await page.keyboard.press('Space'); await frames(page); await expect(toggle).toBeChecked();
    aboveClean = await scene(page); fixedView(above, aboveClean); expect((await overlays(page)).visible).toEqual(hiddenOverlay.visible);
    aboveCleanCapture = await capture(page, join(report, name + '-above-clean.png'));
    await toggle.focus(); await page.keyboard.press('Space'); await frames(page); await expect(toggle).not.toBeChecked();
    expect(await data(page)).toEqual(aboveData); expect((await writes(page)).length).toBe(aboveWrites);
  }
  await strip.scrollIntoViewIfNeeded(); const stripBounds = await strip.boundingBox();
  expect(stripBounds!.width).toBeLessThanOrEqual(page.viewportSize()!.width); expect(stripBounds!.height).toBeLessThan(page.viewportSize()!.height);
  await strip.screenshot({ path: join(report, name + '-controls.png') });
  expect((await data(page)).flightStudyObservations).toEqual(beforeData.flightStudyObservations);
  writeFileSync(join(report, name + '.json'), JSON.stringify({ sourceProof, motion: phone ? 'reduced' : 'ordinary', before, beforeData, beforeOverlay,
    hidden, hiddenOverlay, restored, restoredOverlays, checks, profilePortrait, above, aboveClean, abovePortrait,
    guidedCapture, cleanCapture, aboveGuidedCapture, aboveCleanCapture, stripBounds, accessibility: await accessibility(page) }, null, 2));
}
test('Desktop tern surfaces and keyboard inspection separate model shape from guide annotations', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await journey(page, false);
});
test.describe('Dark phone Monarch inspection', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch inspection preserves wing evidence and restores the exact guide choices', async ({ page }) => journey(page, true));
});
