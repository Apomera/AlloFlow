import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 180_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round16-2026-10-20');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
const harness = new GlHarness({
  toolFile: process.env.MIG_TOOL_FILE || 'stem_lab/stem_tool_migration.js', toolId: 'migration',
  width: 1100, height: 900, layout: 'document', appStyles: true,
  probes: `var vp=document.createElement('meta');vp.name='viewport';vp.content='width=device-width,initial-scale=1';document.head.appendChild(vp);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';`
});
test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function frames(page: Page, count = 3) {
  const start = await page.evaluate(() => (window as any).__glScene()?.renders || 0);
  await page.waitForFunction(({ start, count }) => ((window as any).__glScene()?.renders || 0) >= start + count,
    { start, count }, { timeout: 60_000 });
}
async function mount(page: Page, seed: Record<string, unknown> = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'study', flightPaused: true,
    flightSpecies: 'canada_goose', flightShowWingtipPath: true, flightWind: 0,
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...seed } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
  await page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec, original = record.scene.onBeforeRender;
    record.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      record.camera = camera;
      if (original) original.call(this, renderer, scene, camera, ...rest);
    };
  }); await frames(page);
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.migration)));
}
async function theme(page: Page, dark: boolean) {
  await page.evaluate(dark => {
    (window as any).__ctx.isDark = dark; (window as any).__ctx.theme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
    document.body.style.background = dark ? '#0f172a' : '#f8fafc'; (window as any).__rerender();
  }, dark); await frames(page);
}
async function keyboardClick(page: Page, locator: ReturnType<Page['getByRole']>) {
  await locator.focus(); await page.keyboard.press('Enter'); await frames(page);
}
function observationSeed() {
  const record = { speciesId: 'canada_goose', region: 'primaries', note: 'My explicitly recorded feather observation.',
    bird: 0, yaw: 35, pitch: 15, zoom: 1, wingStep: 0, paused: true, motionReduced: true };
  return { flightStudyRegion: 'head', flightStudyObservationOpen: false,
    flightStudyObservations: { drafts: { 'canada_goose:head': 'Keep my head note.',
      'canada_goose:primaries': 'Keep my newer unrecorded feather draft.', 'monarch:whole-wing': 'Keep my butterfly draft.' },
      records: { 'canada_goose:primaries': record }, comparison: { draft: 'Keep my observation comparison.' } },
    flightInvestigation: { variable: 'wind', prediction: 'Keep my wind prediction.',
      baseline: { speciesId: 'canada_goose', wind: 0, season: 'fall', formationMode: 'natural' },
      trials: [{ id: 1, variable: 'wind', prediction: 'Keep this saved prediction.',
        baseline: { speciesId: 'canada_goose', wind: 0, season: 'fall', formationMode: 'natural' },
        snapshot: { speciesId: 'canada_goose', wind: 8, season: 'fall', formationMode: 'natural' } }],
      evidence: 'Keep the wind evidence.', explanation: 'Keep the wind explanation.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge.', notes: 'Keep my reasoning.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep the energy hypothesis.', explanation: 'Keep the energy explanation.', trials: [] },
    aiExplorerText: 'Keep my migration research.' };
}
function work(data: any) {
  return Object.fromEntries(['flightStudyObservations', 'flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText'].map(key => [key, data[key]]));
}
function speciesWork(data: any) {
  const retained = work(data); delete retained.aiExplorerText; return retained;
}

const speciesIds = ['canada_goose', 'arctic_tern', 'ruby_hummingbird', 'snow_goose', 'peregrine', 'sandhill_crane', 'monarch', 'bartailed_godwit'];
function positionButton(page: Page, index: number) {
  return page.getByRole('button', { name: 'Cycle position ' + (index + 1) + ' of 8', exact: true });
}
async function choosePosition(page: Page, index: number) {
  await keyboardClick(page, positionButton(page, index));
  await expect(positionButton(page, index)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-study-cycle-position][aria-pressed="true"]')).toHaveCount(1);
}
async function expectNoSelection(page: Page) {
  await expect(page.locator('[data-study-cycle-position][aria-pressed="true"]')).toHaveCount(0);
}
async function cycleLayout(page: Page) {
  return page.locator('.migration-cycle-positions').evaluate(group => {
    const rect = group.getBoundingClientRect(), style = getComputedStyle(group);
    return { display: style.display, columns: style.gridTemplateColumns.trim().split(/\s+/).length,
      width: rect.width, scrollWidth: group.scrollWidth, viewport: innerWidth,
      buttons: Array.from(group.querySelectorAll('button')).map(button => {
        const box = button.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height };
      }) };
  });
}
function expectCycleLayout(layout: any) {
  expect(layout.display).toBe('grid'); expect(layout.columns).toBe(4); expect(layout.buttons).toHaveLength(8);
  expect(layout.scrollWidth).toBeLessThanOrEqual(Math.ceil(layout.width));
  for (const button of layout.buttons) { expect(button.width).toBeGreaterThanOrEqual(44); expect(button.height).toBeGreaterThanOrEqual(44); }
  layout.buttons.slice(0, 4).forEach((button: any) => expect(button.y).toBeCloseTo(layout.buttons[0].y, 1));
  layout.buttons.slice(4).forEach((button: any) => expect(button.y).toBeCloseTo(layout.buttons[4].y, 1));
  expect(layout.buttons[4].y).toBeGreaterThan(layout.buttons[0].y);
}

// Read actual submitted GL geometry. Endpoints are independently chosen from
// the real outer mesh, never from the implementation's source metadata.
async function comparisonState(page: Page) {
  return page.evaluate(() => {
    const rec = (window as any).__glCanvas()?.rec, scene = rec?.scene, camera = rec?.camera, THREE = (window as any).THREE;
    const path = scene?.getObjectByName('migration-wingtip-path'), marked = scene?.getObjectByName('migration-marked-wing-pose');
    const flock = scene?.getObjectByName('migration-flock'), links = marked?.getObjectByName('migration-marked-wingtip-links');
    if (!path || !marked || !links || !flock || !camera) throw new Error('Marked comparison scene unavailable');
    const data = (window as any).__toolData.migration;
    const individual = Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0));
    const bird = flock.children[individual]; scene.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(bird.matrixWorld).invert();
    const shown = (node: any) => { for (let parent = node; parent; parent = parent.parent) if (!parent.visible) return false; return true; };
    const identityMap = (window as any).__return14IdentityMap || ((window as any).__return14IdentityMap = new WeakMap());
    const identity = (object: object) => { if (!identityMap.has(object)) identityMap.set(object, (window as any).__return14IdentityNext = ((window as any).__return14IdentityNext || 0) + 1); return identityMap.get(object); };
    const resources = new Map<string, any>();
    for (const owner of [path, marked]) owner.traverse((node: any) => {
      if (node.geometry) resources.set(node.geometry.uuid, { uuid: node.geometry.uuid, kind: 'geometry' });
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) resources.set(material.uuid, { uuid: material.uuid, kind: 'material' });
    });
    const actualTips = [0, 1].map(side => {
      const mesh = data.flightSpecies === 'monarch'
        ? bird.userData.wings[side].children.find((part: any) => part.name === 'migration-monarch-forewing') : bird.userData.primaries[side];
      if (!mesh?.geometry?.attributes?.position) throw new Error('Actual outer tip mesh unavailable');
      const positions = mesh.geometry.attributes.position;
      const limit = data.flightSpecies === 'monarch' ? mesh.geometry.userData.monarchBoundaryVertexCount : positions.count;
      let chosen = 0;
      for (let vertex = 1; vertex < limit; vertex++) if (positions.getX(vertex) > positions.getX(chosen) ||
        (positions.getX(vertex) === positions.getX(chosen) && positions.getZ(vertex) > positions.getZ(chosen))) chosen = vertex;
      const actual = new THREE.Vector3().fromBufferAttribute(positions, chosen).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);
      return { point: actual.toArray(), meshUuid: mesh.uuid, geometryUuid: mesh.geometry.uuid, name: mesh.name, chosen, limit, count: positions.count };
    });
    const linkPosition = links.geometry.attributes.position, linkColor = links.geometry.attributes.color, linkDistance = links.geometry.attributes.lineDistance;
    const count = Number(links.userData.segmentCount) || 0;
    const lineCount = Number(marked.geometry.drawRange.count) || 0;
    return { scene: scene.uuid, bird: bird.uuid, species: data.flightSpecies, individual,
      phase: bird.userData.lastRenderedWingPhase, body: { position: bird.position.toArray(), rotation: bird.rotation.toArray(), matrix: bird.matrixWorld.elements.slice(), flockPosition: flock.position.toArray(), flockRotation: flock.rotation.toArray() },
      camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray() },
      joints: { wings: bird.userData.wings.map((part: any) => part.rotation.toArray()), wrists: bird.userData.wrists.map((part: any) => part.rotation.toArray()), primaries: bird.userData.primaries.map((part: any) => part.rotation.toArray()) },
      actualTips, paused: data.flightPaused === true, serial: Number(data.flightWingStep) || 0,
      marked: { visible: shown(marked), captured: marked.userData.captured === true, phase: marked.userData.capturedPhase,
        source: marked.userData.sourceBirdUuid, count: lineCount, positions: Array.from(marked.geometry.attributes.position.array.slice(0, lineCount * 3)),
        tips: Array.from(marked.userData.markedTipPositions || []), sources: marked.userData.tipSources || [] },
      links: { visible: shown(links), count, sides: Array.from(links.userData.segmentSides || []).slice(0, count), drawCount: links.geometry.drawRange.count,
        positions: Array.from(linkPosition.array.slice(0, count * 6)), colors: Array.from(linkColor.array.slice(0, count * 6)), distances: Array.from(linkDistance.array.slice(0, count * 2)),
        geometry: links.geometry.uuid, material: links.material.uuid, attributes: [linkPosition, linkColor, linkDistance].map(attribute => [identity(attribute), identity(attribute.array)]),
        bytes: linkPosition.array.byteLength + linkColor.array.byteLength + linkDistance.array.byteLength },
      palette: ['left', 'right'].map(side => path.getObjectByName('migration-wingtip-' + side + '-point').material.color.toArray()),
      resources: Array.from(resources.values()).sort((a, b) => a.uuid.localeCompare(b.uuid)),
      errors: (window as any).__events.errors };
  });
}
function returnButton(page: Page) { return page.getByRole('button', { name: 'Return wings to marked pose', exact: true }); }
function closePoint(actual: Array<number | string>, expected: Array<number | string>, precision = 5) {
  expect(actual).toHaveLength(expected.length);
  let typeMismatch = -1, valueMismatch = -1, maximumError = 0;
  actual.forEach((value, index) => {
    const target = expected[index];
    if (typeof value !== typeof target) typeMismatch = index;
    else if (typeof value === 'number' && typeof target === 'number') {
      maximumError = Math.max(maximumError, Number.isFinite(value) && Number.isFinite(target) ? Math.abs(value - target) : Infinity);
    } else if (value !== target) valueMismatch = index;
  });
  expect({ typeMismatch, valueMismatch }).toEqual({ typeMismatch: -1, valueMismatch: -1 });
  expect(maximumError, 'Every numeric component matches to the requested precision').toBeLessThan(0.5 * Math.pow(10, -precision));
}
function samePhase(actual: number, expected: number) {
  expect(Number.isFinite(actual)).toBe(true); expect(Math.sin(actual)).toBeCloseTo(Math.sin(expected), 8); expect(Math.cos(actual)).toBeCloseTo(Math.cos(expected), 8);
}
function frozen(state: any) { return { source: state.marked.source, phase: state.marked.phase, positions: state.marked.positions, tips: state.marked.tips, sources: state.marked.sources }; }
function graphicPool(state: any) { return { resources: state.resources, geometry: state.links.geometry, material: state.links.material, attributes: state.links.attributes }; }
function expectLinks(state: any, reference: any) {
  expect(state.errors).toEqual([]); expect(state.marked.captured).toBe(true); expect(state.links.visible).toBe(true);
  expect(state.links.count).toBe(2); expect(state.links.drawCount).toBe(4); expect(state.links.bytes).toBe(112);
  expect(new Set(state.links.sides)).toEqual(new Set([0, 1])); expect(state.links.distances.every(Number.isFinite)).toBe(true);
  for (let segment = 0; segment < state.links.count; segment++) {
    const side = Number(state.links.sides[segment]);
    closePoint(state.links.positions.slice(segment * 6, segment * 6 + 3), reference.actualTips[side].point);
    closePoint(state.links.positions.slice(segment * 6 + 3, segment * 6 + 6), state.actualTips[side].point);
    closePoint(state.links.colors.slice(segment * 6, segment * 6 + 3), state.palette[side]);
    closePoint(state.links.colors.slice(segment * 6 + 3, segment * 6 + 6), state.palette[side]);
  }
  expect(frozen(state)).toEqual(frozen(reference));
}
function expectReturned(state: any, reference: any) {
  expect(state.errors).toEqual([]); expect(state.paused).toBe(true); samePhase(state.phase, reference.marked.phase);
  for (const role of ['wings', 'wrists', 'primaries']) for (let joint = 0; joint < state.joints[role].length; joint++) closePoint(state.joints[role][joint], reference.joints[role][joint], 6);
  for (let side = 0; side < 2; side++) closePoint(state.actualTips[side].point, reference.actualTips[side].point);
  expect(state.links.count).toBe(0); expect(state.links.visible).toBe(false); expect(frozen(state)).toEqual(frozen(reference));
}
async function mark(page: Page) {
  await keyboardClick(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }));
  await expect(returnButton(page)).toBeEnabled(); return comparisonState(page);
}
async function select(page: Page, index: number) { await choosePosition(page, index); }

function checkButton(page: Page) { return page.getByRole('button', { name: 'Check what changed', exact: true }); }
function restoreButton(page: Page) { return page.getByRole('button', { name: 'Restore marked view settings', exact: true }); }
function checkCue(page: Page) { return page.locator('[data-marked-comparison-check="true"]'); }
async function check(page: Page, kind: string) {
  const before = await saved(page); await keyboardClick(page, checkButton(page));
  await expect(checkCue(page)).toHaveAttribute('data-marked-comparison-status', 'checked');
  await expect(checkCue(page)).toHaveAttribute('data-marked-comparison-kind', kind); expect(await saved(page)).toEqual(before);
}
function view(data: any) { return { flightStudyYaw: data.flightStudyYaw, flightStudyPitch: data.flightStudyPitch, flightStudyZoom: data.flightStudyZoom }; }
async function changeView(page: Page, name: string, zoomEnd = 'Home') {
  await keyboardClick(page, page.getByRole('button', { name, exact: true }));
  await page.getByRole('slider', { name: 'Study zoom percent', exact: true }).focus(); await page.keyboard.press(zoomEnd); await frames(page);
}
async function restore(page: Page, captured: any) {
  const beforeData = await saved(page), before = await comparisonState(page);
  await keyboardClick(page, restoreButton(page)); await expect(restoreButton(page)).toHaveCount(0); await expect(checkCue(page)).toHaveCount(0);
  await expect(checkButton(page)).toBeFocused();
  const afterData = await saved(page), after = await comparisonState(page);
  expect(afterData).toEqual({ ...beforeData, ...view(captured) });
  samePhase(after.phase, before.phase); expect(after.serial).toBe(before.serial); expect(after.body).toEqual(before.body); expect(after.joints).toEqual(before.joints);
  expect(after.paused).toBe(before.paused); expect(frozen(after)).toEqual(frozen(before)); expect(graphicPool(after)).toEqual(graphicPool(before));
  expect(before.resources).toHaveLength(13); expect(after.resources).toHaveLength(13);
  return { beforeData, before, afterData, after };
}
async function recordCameraWrites(page: Page, hold = false) {
  await page.evaluate(hold => {
    const w = window as any, ctx = w.__ctx, original = ctx.updateMulti;
    w.__restore16CameraWrites = []; w.__restore16Held = []; w.__restore16Hold = hold;
    ctx.updateMulti = function(tool: string, patch: any) {
      const keys = Object.keys(patch).sort().join(',');
      if (keys === 'flightStudyPitch,flightStudyYaw,flightStudyZoom') {
        w.__restore16CameraWrites.push(JSON.parse(JSON.stringify(patch)));
        if (w.__restore16Hold) { w.__restore16Held.push({ tool, patch }); return; }
      }
      return original.call(ctx, tool, patch);
    };
    w.__flushRestore16 = function() {
      w.__restore16Hold = false;
      for (const item of w.__restore16Held.splice(0)) original.call(ctx, item.tool, item.patch);
    };
  }, hold);
}
const seed = () => ({ ...observationSeed(), flightWingStep: 13, flightStudyYaw: 75, flightStudyPitch: 30, flightStudyZoom: 1.2 });

test('Migration contextual Restore marked view separates camera changes from wing changes while preserving work and current phase', async ({ page }) => {
  test.setTimeout(240_000);
  await mount(page, seed()); const original = await saved(page);
  await expect(restoreButton(page)).toHaveCount(0); await select(page, 2); const reference = await mark(page);
  await check(page, 'same'); await expect(restoreButton(page)).toHaveCount(0);
  await changeView(page, 'Front'); await select(page, 6); await check(page, 'both');
  const source = page.locator('[data-marked-view-settings="true"]'); const baseline = await source.textContent();
  expect(baseline).toContain('75'); expect(baseline).toContain('30'); expect(baseline).toContain('120');
  await expect(restoreButton(page)).toHaveAttribute('data-marked-pose-action', 'restore-view');
  await expect(restoreButton(page)).toHaveAttribute('aria-controls', 'migration-flight-stage');
  await recordCameraWrites(page); const first = await restore(page, original);
  expect(await page.evaluate(() => (window as any).__restore16CameraWrites)).toEqual([view(original)]);
  await expect(positionButton(page, 6)).toHaveAttribute('aria-pressed', 'true'); await check(page, 'wing-only'); await expect(restoreButton(page)).toHaveCount(0);
  const cameraBeforeReturn = (await comparisonState(page)).camera; await keyboardClick(page, returnButton(page));
  const returned = await comparisonState(page); expectReturned(returned, reference); expect(returned.camera).toEqual(cameraBeforeReturn); await check(page, 'same');
  await changeView(page, 'From above', 'End'); await select(page, 6); await check(page, 'both');
  await keyboardClick(page, returnButton(page)); await check(page, 'view-only');
  const second = await restore(page, original); await check(page, 'same');
  await changeView(page, 'Front'); await select(page, 6);
  const path = page.getByRole('checkbox', { name: 'Show wingtip path', exact: true }); await path.uncheck(); await frames(page); await check(page, 'both');
  const off = await restore(page, original); expect((await saved(page)).flightShowWingtipPath).toBe(false); await check(page, 'wing-only');
  await keyboardClick(page, returnButton(page)); await check(page, 'same');
  expect(work(await saved(page))).toEqual(work(original)); expect((await saved(page)).flightWingStep).toBe(13); expect(await source.textContent()).toBe(baseline);
  await writeFile(join(report, 'marked-view-camera-only-flow.json'), JSON.stringify({ original, reference, first, returned, second, off }, null, 2));
});

test('Migration Restore marked view cancels an active orbit, does not revive delayed stale feedback, respects focus and clears on remount', async ({ page }) => {
  test.setTimeout(270_000);
  await mount(page, seed()); const original = await saved(page); await select(page, 2); await mark(page);
  await changeView(page, 'Front'); await select(page, 6); await check(page, 'both');
  const stage = page.locator('.migration-flight-stage'); await stage.scrollIntoViewIfNeeded(); const box = await stage.boundingBox();
  if (!box) throw new Error('Study stage missing before pointer orbit');
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.55 + 70, box.y + box.height * 0.55 + 20, { steps: 3 }); await frames(page);
  await expect(stage).toHaveAttribute('data-study-dragging', 'true');
  await check(page, 'both'); await restoreButton(page).focus(); await page.keyboard.press('Enter'); await frames(page);
  await page.mouse.up(); await frames(page); await expect(stage).not.toHaveAttribute('data-study-dragging', 'true');
  expect(view(await saved(page))).toEqual(view(original)); await expect(restoreButton(page)).toHaveCount(0); await check(page, 'wing-only');
  await changeView(page, 'Front'); await check(page, 'both');
  await recordCameraWrites(page, true);
  await restoreButton(page).focus();
  await page.evaluate(() => {
    const w = window as any, other = document.createElement('button'); other.id = 'migration-restore16-focus-guard'; other.textContent = 'Keep focus here'; document.body.append(other);
    (document.querySelector('[data-marked-pose-action="restore-view"]') as HTMLButtonElement).click(); other.focus();
  }); await frames(page, 4);
  await expect(restoreButton(page)).toHaveCount(0);
  await expect(page.locator('[data-marked-comparison-status="checked"]')).toHaveCount(0);
  await expect(page.locator('#migration-restore16-focus-guard')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__restore16CameraWrites)).toEqual([view(original)]);
  expect(await page.evaluate(() => (window as any).__restore16Held.length)).toBe(1);
  const pending = await saved(page); await expect(checkButton(page)).toBeEnabled();
  await page.evaluate(() => (document.querySelector('[data-marked-pose-action="check"]') as HTMLButtonElement).click()); await frames(page);
  await expect(checkCue(page)).toHaveAttribute('data-marked-comparison-status', 'waiting');
  await expect(checkCue(page)).toHaveAttribute('data-marked-comparison-kind', ''); await expect(restoreButton(page)).toHaveCount(0);
  await expect(page.locator('#migration-restore16-focus-guard')).toBeFocused(); expect(await saved(page)).toEqual(pending);
  await page.evaluate(() => (window as any).__flushRestore16()); await frames(page, 4);
  await expect(page.locator('#migration-restore16-focus-guard')).toBeFocused(); await expect(checkCue(page)).toHaveCount(0); await expect(restoreButton(page)).toHaveCount(0);
  expect(view(await saved(page))).toEqual(view(original)); await check(page, 'wing-only');
  await changeView(page, 'Profile'); await check(page, 'both');
  await keyboardClick(page, page.getByRole('button', { name: 'Mark wing pose', exact: true })); await expect(restoreButton(page)).toHaveCount(0); await check(page, 'same');
  expect(work(await saved(page))).toEqual(work(original)); const serialized = await saved(page); await harness.unmount(page); await mount(page, serialized);
  await expect(checkButton(page)).toBeDisabled(); await expect(restoreButton(page)).toHaveCount(0); await expect(checkCue(page)).toHaveCount(0);
  expect(await saved(page)).toEqual(serialized); expect(work(serialized)).toEqual(work(original));
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'marked-view-stale-focus-remount.json'), JSON.stringify({ original, serialized }, null, 2));
});

for (const dark of [false, true]) test.describe('Migration marked view restore phone ' + (dark ? 'dark' : 'light') + ' round16', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Contextual marked-view restore supports touch and keyboard without losing wing comparisons or observation notes', async ({ page }) => {
    await mount(page, seed()); await theme(page, dark); const original = await saved(page), stem = 'mobile-' + (dark ? 'dark' : 'light') + '-marked-view-restore';
    await select(page, 2); const reference = await mark(page); await changeView(page, 'Front'); await positionButton(page, 6).tap(); await frames(page);
    await checkButton(page).tap(); await frames(page); await expect(checkCue(page)).toHaveAttribute('data-marked-comparison-kind', 'both');
    const before = await comparisonState(page), button = restoreButton(page), box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44); expect(box?.width).toBeGreaterThanOrEqual(44);
    await button.focus(); await page.keyboard.press('Enter'); await frames(page); await expect(checkButton(page)).toBeFocused(); await expect(button).toHaveCount(0); await expect(checkCue(page)).toHaveCount(0);
    const after = await comparisonState(page); samePhase(after.phase, before.phase); expect(after.serial).toBe(13); expect(after.body).toEqual(before.body); expect(view(await saved(page))).toEqual(view(original));
    await checkButton(page).tap(); await frames(page); await expect(checkCue(page)).toHaveAttribute('data-marked-comparison-kind', 'wing-only');
    await page.getByRole('button', { name: 'Front', exact: true }).tap(); await frames(page); await checkButton(page).tap(); await frames(page);
    await expect(checkCue(page)).toHaveAttribute('data-marked-comparison-kind', 'both'); await restoreButton(page).tap(); await frames(page);
    await expect(restoreButton(page)).toHaveCount(0); await checkButton(page).tap(); await frames(page); await expect(checkCue(page)).toHaveAttribute('data-marked-comparison-kind', 'wing-only');
    const phasePreserved = await comparisonState(page); expectLinks(phasePreserved, reference);
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-stage.png') });
    await page.locator('[data-study-marked-pose]').screenshot({ path: join(report, stem + '-activity.png') });
    await returnButton(page).tap(); await frames(page); await checkButton(page).tap(); await frames(page); await expect(checkCue(page)).toHaveAttribute('data-marked-comparison-kind', 'same');
    await page.getByRole('button', { name: 'Describe wing motion', exact: true }).tap();
    const input = page.getByRole('textbox', { name: 'My observation', exact: true }); await expect(input).toBeFocused();
    await expect(input).toHaveValue(original.flightStudyObservations.drafts['canada_goose:primaries']); expect(work(await saved(page))).toEqual(work(original));
    await input.fill('Restoring my marked view kept the current wing pose. Returning the wings then matched my original comparison.');
    await page.getByRole('button', { name: 'Record observation', exact: true }).tap(); const recorded = await saved(page);
    expect(recorded.flightStudyObservations.records['canada_goose:primaries'].note).toContain('kept the current wing pose');
    for (const key of ['flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']) expect(recorded[key]).toEqual(original[key]);
    await page.addScriptTag({ content: axeSource }); const audit = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, violations: result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => node.target) })), errors: (window as any).__events.errors };
    });
    expect(audit.width).toBe(390); expect(audit.scrollWidth).toBeLessThanOrEqual(390); expect(audit.violations).toEqual([]); expect(audit.errors).toEqual([]);
    await page.locator('[data-study-observation]').screenshot({ path: join(report, stem + '-notes.png') });
    await writeFile(join(report, stem + '.json'), JSON.stringify({ original, reference, before, after, phasePreserved, recorded, audit }, null, 2));
    if (!dark) {
      await page.setViewportSize({ width: 1440, height: 1000 }); await frames(page); await changeView(page, 'Front'); await select(page, 6); await check(page, 'both');
      await page.locator('[data-study-marked-pose]').scrollIntoViewIfNeeded(); await page.locator("[data-migration-id=\"migration-flight-deck\"]").screenshot({ path: join(report, 'desktop-marked-view-restore.png') });
    }
  });
});
