import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 180_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round13-2026-10-18');
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
async function cycleState(page: Page) {
  return page.evaluate(() => {
    const rec = (window as any).__glCanvas()?.rec, scene = rec?.scene, camera = rec?.camera, THREE = (window as any).THREE;
    const root = scene?.getObjectByName('migration-wingtip-path'), flock = scene?.getObjectByName('migration-flock');
    if (!root || !flock || !camera) throw new Error('The migration tool has not submitted a wingtip scene');
    const data = (window as any).__toolData.migration;
    const selected = Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0));
    const bird = flock.children[selected]; scene.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(bird.matrixWorld).invert();
    const shown = (node: any) => { for (let parent = node; parent; parent = parent.parent) if (!parent.visible) return false; return true; };
    const positions = root.getObjectByName('migration-wingtip-cycle').geometry.attributes.position;
    const stage = rec.canvas.getBoundingClientRect();
    const identities = (window as any).__cycle13Identities || ((window as any).__cycle13Identities = new WeakMap());
    const identity = (value: object) => {
      if (!identities.has(value)) identities.set(value, (window as any).__cycle13IdentitySequence = ((window as any).__cycle13IdentitySequence || 0) + 1);
      return identities.get(value);
    };
    const bounds = (node: any, matrix: any) => {
      const transform = new THREE.Matrix4().multiplyMatrices(node.matrixWorld, matrix), vertices = node.geometry.attributes.position;
      let left = Infinity, right = -Infinity, bottom = Infinity, top = -Infinity, fits = true;
      for (let vertex = 0; vertex < vertices.count; vertex++) {
        const point = new THREE.Vector3().fromBufferAttribute(vertices, vertex).applyMatrix4(transform).project(camera);
        left = Math.min(left, point.x); right = Math.max(right, point.x); bottom = Math.min(bottom, point.y); top = Math.max(top, point.y);
        fits = fits && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1 && Math.abs(point.z) <= 1;
      }
      return { width: (right - left) * stage.width / 2, height: (top - bottom) * stage.height / 2, fits };
    };
    const sides = ['left', 'right'].map((side, index) => {
      const source = data.flightSpecies === 'monarch'
        ? bird.userData.wings[index].children.find((part: any) => part.name === 'migration-monarch-forewing')
        : bird.userData.primaries[index];
      if (!source?.geometry?.attributes?.position) throw new Error('Actual outer wing mesh unavailable');
      const vertices = source.geometry.attributes.position;
      const limit = data.flightSpecies === 'monarch' ? source.geometry.userData.monarchBoundaryVertexCount : vertices.count;
      let chosen = 0;
      for (let vertex = 1; vertex < limit; vertex++) if (vertices.getX(vertex) > vertices.getX(chosen) ||
        (vertices.getX(vertex) === vertices.getX(chosen) && vertices.getZ(vertex) > vertices.getZ(chosen))) chosen = vertex;
      const actual = new THREE.Vector3().fromBufferAttribute(vertices, chosen).applyMatrix4(source.matrixWorld).applyMatrix4(inverse);
      const point = root.getObjectByName('migration-wingtip-' + side + '-point');
      const marker = point.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
      const rings = root.getObjectByName('migration-wingtip-' + side + '-landmarks');
      const landmarks = [];
      for (let checkpoint = 0; checkpoint < 8; checkpoint++) {
        const matrix = new THREE.Matrix4(); rings.getMatrixAt(checkpoint, matrix);
        const center = new THREE.Vector3().setFromMatrixPosition(matrix), scale = new THREE.Vector3().setFromMatrixScale(matrix);
        const cached = new THREE.Vector3().fromBufferAttribute(positions, index * 128 + checkpoint * 16);
        landmarks.push({ index: checkpoint, position: center.toArray(), cached: cached.toArray(),
          cachedError: center.distanceTo(cached), endpointError: actual.distanceTo(cached), bounds: bounds(rings, matrix), scale: scale.toArray() });
      }
      return { side, actual: actual.toArray(), marker: marker.toArray(), markerError: marker.distanceTo(actual),
        activeCheckpoint: rings.userData.activeCheckpoint, visible: shown(rings), landmarks,
        geometry: rings.geometry.uuid, material: rings.material.uuid, instanceMatrix: identity(rings.instanceMatrix), array: identity(rings.instanceMatrix.array),
        source: { name: source.name, limit, fullVertices: vertices.count } };
    });
    const resources = new Map<string, any>(); root.traverse((node: any) => {
      if (node.geometry) resources.set(node.geometry.uuid, { uuid: node.geometry.uuid, type: 'geometry' });
      for (const material of (Array.isArray(node.material) ? node.material : [node.material])) if (material) resources.set(material.uuid, { uuid: material.uuid, type: 'material' });
    });
    const marked = scene.getObjectByName('migration-marked-wing-pose'), markedPositions = marked?.geometry?.attributes?.position;
    const markedCount = Number(marked?.geometry?.drawRange?.count) || 0;
    return { root: root.uuid, scene: scene.uuid, visible: shown(root), available: root.userData.available,
      buildVersion: root.userData.buildVersion, species: data.flightSpecies, selected, birdUuid: bird.uuid,
      body: { position: bird.position.toArray(), rotation: bird.rotation.toArray(), matrix: bird.matrixWorld.elements.slice() },
      wings: bird.userData.wings.map((part: any) => part.rotation.toArray()),
      wrists: bird.userData.wrists.map((part: any) => part.rotation.toArray()),
      primaries: bird.userData.primaries.map((part: any) => part.rotation.toArray()), flapAmount: bird.userData.flapAmount,
      camera: camera.position.toArray(), wingStep: data.flightWingStep || 0, paused: data.flightPaused === true, sides,
      resources: Array.from(resources.values()).sort((a, b) => a.uuid.localeCompare(b.uuid)),
      marked: { visible: marked ? shown(marked) : false, geometry: marked?.geometry?.uuid, count: markedCount,
        positions: markedPositions ? Array.from(markedPositions.array.slice(0, markedCount * 3)) : [] },
      errors: (window as any).__events.errors };
  });
}
function pool(state: any) {
  return { root: state.root, resources: state.resources,
    rings: state.sides.map((side: any) => [side.geometry, side.material, side.instanceMatrix, side.array]) };
}
function expectPosition(state: any, index: number, selected = true) {
  expect(state.visible).toBe(true); expect(state.available).toBe(true); expect(state.paused).toBe(true); expect(state.errors).toEqual([]);
  const phase = index * Math.PI / 4;
  expect(state.wings[0][2]).toBeCloseTo(Math.sin(phase) * state.flapAmount, 6);
  expect(state.wings[1][2]).toBeCloseTo(-Math.sin(phase) * state.flapAmount, 6);
  for (let joint = 0; joint < state.wrists.length; joint++) {
    const side = joint === 0 ? -1 : 1;
    expect(state.wrists[joint][2]).toBeCloseTo(side * (0.08 + Math.sin(phase - 0.65) * 0.15), 6);
    expect(state.wrists[joint][1]).toBeCloseTo(side * (0.06 + Math.max(0, Math.sin(phase)) * 0.13), 6);
    expect(state.primaries[joint][0]).toBeCloseTo(Math.sin(phase - 0.85) * 0.075, 6);
  }
  for (const side of state.sides) {
    expect(side.visible).toBe(true); expect(side.markerError).toBeLessThan(0.00001);
    expect(side.activeCheckpoint).toBe(selected ? index : null); expect(side.landmarks).toHaveLength(8);
    expect(side.landmarks[index].endpointError).toBeLessThan(0.00001);
    for (const landmark of side.landmarks) {
      expect(landmark.cachedError).toBeLessThan(0.00001); expect(landmark.bounds.fits).toBe(true);
      const diameter = selected && landmark.index === index ? 16 : 6.4;
      expect(landmark.bounds.width).toBeGreaterThan(diameter * 0.85);
      expect(landmark.bounds.width).toBeLessThan(diameter * 1.6);
      expect(landmark.bounds.width / landmark.bounds.height).toBeCloseTo(1, 1);
    }
  }
}

test('Migration all eight cycle positions align live real outer tips with cached phase landmarks for all eight species without changing manual serial or learner work', async ({ page }) => {
  test.setTimeout(420_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { ...observationSeed(), flightWingStep: 13, flightPaused: false });
  const initial = await cycleState(page), before = await saved(page), species = [];
  await expect(page.locator('[data-study-cycle-position]')).toHaveCount(8); await expectNoSelection(page);
  const desktopLayout = await cycleLayout(page); expectCycleLayout(desktopLayout);
  for (const id of speciesIds) {
    await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption(id); await frames(page);
    const baseline = await saved(page), bodyBefore = await cycleState(page), positions = [];
    expect(speciesWork(baseline)).toEqual(speciesWork(before));
    if (id !== 'canada_goose') expect(baseline.aiExplorerText).toBe('');
    await expectNoSelection(page);
    for (let index = 0; index < 8; index++) {
      await choosePosition(page, index); const state = await cycleState(page); expectPosition(state, index);
      expect(pool(state)).toEqual(pool(initial)); expect(state.wingStep).toBe(13); expect(state.buildVersion).toBe(bodyBefore.buildVersion);
      expect(state.body).toEqual(bodyBefore.body); expect(state.camera).toEqual(bodyBefore.camera);
      const after = await saved(page), comparable = { ...after }; delete comparable.flightPaused;
      const original = { ...baseline }; delete original.flightPaused;
      expect(comparable).toEqual(original); expect(work(after)).toEqual(work(baseline));
      for (const side of state.sides) {
        expect(side.source.name).toBe(id === 'monarch' ? 'migration-monarch-forewing' : 'migration-primary-feathers');
        if (id === 'monarch') expect(side.source.limit).toBeLessThan(side.source.fullVertices);
      }
      positions.push(state);
    }
    if (id === 'monarch') await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-monarch-cycle-position-eight.png') });
    species.push({ id, positions });
  }
  await writeFile(join(report, 'desktop-cycle-position-species-review.json'), JSON.stringify({ initial, before, desktopLayout, species }, null, 2));
});

test('Migration native cycle activity compares positions one and five with a frozen marked pose and opens the existing observation draft', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page, { ...observationSeed(), flightWingStep: 13 });
  const before = await saved(page);
  await choosePosition(page, 0); const first = await cycleState(page); expectPosition(first, 0);
  await keyboardClick(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }));
  const marked = await cycleState(page); expect(marked.marked.visible).toBe(true); expect(marked.marked.count).toBeGreaterThan(0);
  await choosePosition(page, 4); const fifth = await cycleState(page); expectPosition(fifth, 4);
  expect(fifth.sides.map((side: any) => side.actual)).not.toEqual(first.sides.map((side: any) => side.actual));
  expect(fifth.marked).toEqual(marked.marked); expect(fifth.wingStep).toBe(13);
  const views = [];
  for (const name of ['Front', 'From above']) {
    await keyboardClick(page, page.getByRole('button', { name, exact: true }));
    const state = await cycleState(page); expectPosition(state, 4); expect(state.marked).toEqual(marked.marked); views.push(state);
    await expect(positionButton(page, 4)).toHaveAttribute('aria-pressed', 'true');
  }
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-cycle-one-five-marked-pose.png') });
  await keyboardClick(page, page.getByRole('button', { name: 'Describe wing motion', exact: true }));
  const input = page.getByRole('textbox', { name: 'My observation', exact: true });
  await expect(input).toBeFocused(); await expect(input).toHaveValue(before.flightStudyObservations.drafts['canada_goose:primaries']);
  await expect(page.locator('#migration-study-motion-evidence-prompt')).toHaveAttribute('data-study-motion-evidence', 'path-and-pose');
  await expect(positionButton(page, 4)).toHaveAttribute('aria-pressed', 'true');
  expect(work(await saved(page))).toEqual(work(before)); expect((await saved(page)).flightWingStep).toBe(13);
  await page.locator('.migration-flight-controls').screenshot({ path: join(report, 'desktop-cycle-observation-activity.png') });
  await keyboardClick(page, page.getByRole('button', { name: 'Revisit recorded view', exact: true }));
  await expectNoSelection(page);
  const revisited = await cycleState(page); expect(revisited.sides.every((side: any) => side.activeCheckpoint === null)).toBe(true);
  expect(work(await saved(page))).toEqual(work(before));
  await writeFile(join(report, 'desktop-cycle-observation-activity.json'), JSON.stringify({ before, first, marked, fifth, views, revisited }, null, 2));
});

test('Migration rapid cycle selections and an immediate manual step honor the latest action without reviving an old selected checkpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page, { ...observationSeed(), flightWingStep: 13 });
  const before = await saved(page);
  await page.evaluate(() => {
    for (const index of [7, 1, 5, 2]) (document.querySelector('[data-study-cycle-position="' + index + '"]') as HTMLButtonElement).click();
  }); await frames(page);
  const latest = await cycleState(page); expectPosition(latest, 2); await expect(positionButton(page, 2)).toHaveAttribute('aria-pressed', 'true');
  expect(latest.wingStep).toBe(13); expect(work(await saved(page))).toEqual(work(before));
  await page.evaluate(() => {
    (document.querySelector('[data-study-cycle-position="2"]') as HTMLButtonElement).click();
    const step = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Step wingbeat') as HTMLButtonElement;
    if (!step) throw new Error('Native manual wing step unavailable'); step.click();
  }); await frames(page, 6);
  await expectNoSelection(page); const stepped = await cycleState(page); expectPosition(stepped, 3, false);
  expect(stepped.wingStep).toBe(14); expect(work(await saved(page))).toEqual(work(before));
  await choosePosition(page, 6); const afterSelection = await cycleState(page); expectPosition(afterSelection, 6); expect(afterSelection.wingStep).toBe(14);
  await frames(page, 6); await expect(positionButton(page, 6)).toHaveAttribute('aria-pressed', 'true');
  expectPosition(await cycleState(page), 6); expect(work(await saved(page))).toEqual(work(before));
  await writeFile(join(report, 'desktop-cycle-latest-action.json'), JSON.stringify({ before, latest, stepped, afterSelection }, null, 2));
});

test('Migration cycle selections clear across playback and changed scene contexts and stay invalid after context loss without reallocating the landmark pool', async ({ page }) => {
  test.setTimeout(270_000);
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page, observationSeed());
  const before = await saved(page), initial = await cycleState(page), states = [];
  await choosePosition(page, 3);
  await keyboardClick(page, page.getByRole('button', { name: 'Resume flight', exact: true }));
  await expectNoSelection(page); expect((await cycleState(page)).sides.every((side: any) => side.activeCheckpoint === null)).toBe(true);
  await keyboardClick(page, page.getByRole('button', { name: 'Pause flight', exact: true })); await expectNoSelection(page);
  await choosePosition(page, 1);
  await keyboardClick(page, page.getByRole('button', { name: 'Chase', exact: true }));
  await expect(page.locator('[data-study-cycle-position]')).toHaveCount(0);
  expect((await cycleState(page)).visible).toBe(false);
  await keyboardClick(page, page.getByRole('button', { name: 'Study', exact: true })); await expectNoSelection(page);
  await choosePosition(page, 1);
  await page.getByRole('combobox', { name: 'Study individual', exact: true }).selectOption('1'); await frames(page);
  await expectNoSelection(page); const individual = await cycleState(page); expect(individual.selected).toBe(1);
  expect(individual.sides.every((side: any) => side.activeCheckpoint === null)).toBe(true); expect(pool(individual)).toEqual(pool(initial)); states.push(individual);
  await choosePosition(page, 1); expectPosition(await cycleState(page), 1);
  const path = page.getByRole('checkbox', { name: 'Show wingtip path', exact: true });
  await path.uncheck(); await frames(page); await expect(page.locator('[data-study-cycle-position]')).toHaveCount(0);
  await path.check(); await frames(page); await expectNoSelection(page);
  await choosePosition(page, 1);
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('monarch'); await frames(page);
  await expectNoSelection(page); const afterSpecies = await saved(page);
  expect(speciesWork(afterSpecies)).toEqual(speciesWork(before)); expect(afterSpecies.aiExplorerText).toBe('');
  await choosePosition(page, 5); const monarch = await cycleState(page); expectPosition(monarch, 5); expect(pool(monarch)).toEqual(pool(initial)); states.push(monarch);
  await page.evaluate(() => {
    const rec = (window as any).__glCanvas().rec, root = rec.scene.getObjectByName('migration-wingtip-path'), resources = new Map<string, any>();
    root.traverse((node: any) => {
      if (node.geometry) resources.set(node.geometry.uuid, node.geometry);
      for (const material of (Array.isArray(node.material) ? node.material : [node.material])) if (material) resources.set(material.uuid, material);
    });
    (window as any).__cycle13Disposals = Array.from(resources.values()).map(resource => {
      const item = { uuid: resource.uuid, count: 0 }; resource.addEventListener('dispose', () => item.count++); return item;
    });
  });
  const loss = await page.evaluate(async () => {
    const rec = (window as any).__glCanvas().rec, root = rec.scene.getObjectByName('migration-wingtip-path');
    const snapshot = () => ({ visible: root.visible, available: root.userData.available,
      checkpoints: ['left', 'right'].map(side => root.getObjectByName('migration-wingtip-' + side + '-landmarks').userData.activeCheckpoint),
      pressedCount: document.querySelectorAll('[data-study-cycle-position][aria-pressed="true"]').length });
    rec.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })); const samples = [snapshot()];
    for (let index = 0; index < 6; index++) { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); samples.push(snapshot()); }
    return samples;
  });
  for (const state of loss) { expect(state.visible).toBe(false); expect(state.available).toBe(false); expect(state.checkpoints).toEqual([null, null]); }
  for (const state of loss.slice(1)) expect(state.pressedCount).toBe(0);
  await expectNoSelection(page); expect(work(await saved(page))).toEqual(work(afterSpecies));
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await harness.unmount(page);
  await expect.poll(() => page.evaluate(() => (window as any).__cycle13Disposals.every((item: any) => item.count === 1))).toBe(true);
  const disposals = await page.evaluate(() => (window as any).__cycle13Disposals); expect(disposals).toHaveLength(7);
  await writeFile(join(report, 'desktop-cycle-context-lifecycle.json'), JSON.stringify({ before, initial, states, loss, disposals }, null, 2));
});

for (const dark of [false, true]) test.describe('Migration phone ' + (dark ? 'dark' : 'light') + ' round13', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Eight native cycle positions support keyboard and touch comparison with existing observation notes on a 390px phone', async ({ page }) => {
    await mount(page, { ...observationSeed(), flightWingStep: 13 }); await theme(page, dark);
    const before = await saved(page), stem = 'mobile-' + (dark ? 'dark' : 'light') + '-cycle-positions';
    await expect(page.locator('[data-study-cycle-position]')).toHaveCount(8);
    const layout = await cycleLayout(page); expectCycleLayout(layout);
    for (let index = 0; index < 8; index++) {
      const button = positionButton(page, index); await expect(button).toHaveAttribute('data-study-cycle-position', String(index));
      await expect(button).toHaveText(String(index + 1)); const box = await button.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44); expect(box?.width).toBeGreaterThanOrEqual(44);
    }
    await positionButton(page, 0).focus(); await page.keyboard.press('Enter'); await frames(page);
    await expect(positionButton(page, 0)).toHaveAttribute('aria-pressed', 'true'); expectPosition(await cycleState(page), 0);
    await page.getByRole('button', { name: 'Mark wing pose', exact: true }).tap(); await frames(page);
    const first = await cycleState(page); await positionButton(page, 4).tap(); await frames(page);
    const fifth = await cycleState(page); expectPosition(fifth, 4); expect(fifth.marked).toEqual(first.marked);
    await page.getByRole('button', { name: 'From above', exact: true }).tap(); await frames(page);
    await expect(positionButton(page, 4)).toHaveAttribute('aria-pressed', 'true'); expectPosition(await cycleState(page), 4);
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-stage.png') });
    await page.getByRole('button', { name: 'Describe wing motion', exact: true }).tap();
    const input = page.getByRole('textbox', { name: 'My observation', exact: true });
    await expect(input).toBeFocused(); await expect(input).toHaveValue(before.flightStudyObservations.drafts['canada_goose:primaries']);
    await expect(page.locator('#migration-study-motion-evidence-prompt')).toHaveAttribute('data-study-motion-evidence', 'path-and-pose');
    expect(work(await saved(page))).toEqual(work(before)); expect((await saved(page)).flightWingStep).toBe(13);
    await input.fill('I compared cycle positions one and five with the marked outline from above.');
    await page.getByRole('button', { name: 'Record observation', exact: true }).tap();
    const recorded = await saved(page);
    expect(recorded.flightStudyObservations.records['canada_goose:primaries']).toMatchObject({
      note: 'I compared cycle positions one and five with the marked outline from above.', speciesId: 'canada_goose', region: 'primaries', wingStep: 13 });
    for (const key of ['flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']) expect(recorded[key]).toEqual(before[key]);
    expect(recorded.flightStudyObservations.drafts['canada_goose:head']).toBe(before.flightStudyObservations.drafts['canada_goose:head']);
    expect(recorded.flightStudyObservations.drafts['monarch:whole-wing']).toBe(before.flightStudyObservations.drafts['monarch:whole-wing']);
    await page.addScriptTag({ content: axeSource });
    const review = await page.evaluate(async () => {
      const scan = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        violations: scan.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })) })),
        errors: (window as any).__events.errors };
    });
    await page.locator('[data-study-observation]').screenshot({ path: join(report, stem + '-observation.png') });
    await page.screenshot({ path: join(report, stem + '.png'), fullPage: true });
    await writeFile(join(report, stem + '.json'), JSON.stringify({ ...review, layout, before, first, fifth, recorded }, null, 2));
    expect(review.viewport).toBe(390); expect(review.scrollWidth).toBeLessThanOrEqual(390); expect(review.violations).toEqual([]); expect(review.errors).toEqual([]);
  });
});

test('Migration remount clears temporary cycle selection while preserving serialized notes, path preference and manual serial', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { ...observationSeed(), flightWingStep: 13 });
  const initialFreshView = await cycleState(page);
  const inputDraft = 'Keep this unrecorded motion draft across a complete saved-data remount.';
  await keyboardClick(page, page.getByRole('button', { name: 'Describe wing motion', exact: true }));
  await page.getByRole('textbox', { name: 'My observation', exact: true }).fill(inputDraft);
  await choosePosition(page, 3);
  const selected = await cycleState(page); expectPosition(selected, 3);
  const serialized = JSON.parse(JSON.stringify(await saved(page)));
  expect(serialized.flightWingStep).toBe(13); expect(serialized.flightShowWingtipPath).toBe(true);
  expect(serialized.flightStudyObservations.drafts['canada_goose:primaries']).toBe(inputDraft);
  // Destroy the actual engine, navigate through the harness's full mount path,
  // and restore only JSON-persisted tool data. No refs or Three objects survive.
  await harness.unmount(page); await mount(page, serialized);
  await expectNoSelection(page);
  const restored = await cycleState(page);
  expect(restored.root).not.toBe(selected.root); expect(restored.scene).not.toBe(selected.scene);
  expect(restored.wingStep).toBe(13); expect(restored.sides.map((side: any) => side.activeCheckpoint)).toEqual([null, null]);
  // The persisted manual value is an increment serial, not an absolute phase.
  // Compare two real fresh engines instead of interpreting serial 13 as phase.
  expect(restored.wings).toEqual(initialFreshView.wings);
  expect(restored.wrists).toEqual(initialFreshView.wrists);
  expect(restored.primaries).toEqual(initialFreshView.primaries);
  for (let side = 0; side < restored.sides.length; side++) {
    const actual = restored.sides[side]; expect(actual.visible).toBe(true); expect(actual.markerError).toBeLessThan(0.00001);
    actual.actual.forEach((value: number, axis: number) => expect(value).toBeCloseTo(initialFreshView.sides[side].actual[axis], 6));
    for (const landmark of actual.landmarks) {
      expect(landmark.cachedError).toBeLessThan(0.00001); expect(landmark.bounds.fits).toBe(true);
      expect(landmark.bounds.width).toBeGreaterThan(6.4 * 0.85); expect(landmark.bounds.width).toBeLessThan(6.4 * 1.6);
    }
  }
  expect(await saved(page)).toEqual(serialized);
  await expect(page.getByRole('checkbox', { name: 'Show wingtip path', exact: true })).toBeChecked();
  await expect(page.getByRole('textbox', { name: 'My observation', exact: true })).toHaveValue(inputDraft);
  await choosePosition(page, 0);
  await keyboardClick(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }));
  await choosePosition(page, 4);
  const selectedAgain = await cycleState(page); expectPosition(selectedAgain, 4);
  expect(pool(selectedAgain)).toEqual(pool(restored)); expect(selectedAgain.marked.visible).toBe(true);
  expect(await saved(page)).toEqual(serialized);
  const checkpointControls = page.locator('[data-study-cycle-controls]');
  await checkpointControls.scrollIntoViewIfNeeded(); await expect(checkpointControls).toBeVisible();
  const layout = await cycleLayout(page); expectCycleLayout(layout);
  const previewLayout = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector); if (!element) throw new Error('Missing preview element ' + selector);
      const box = element.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    return { deck: rect('#migration-flight-deck'), stage: rect('.migration-flight-stage'),
      sidebar: rect('.migration-flight-controls'), checkpoints: rect('[data-study-cycle-controls]') };
  });
  expect(previewLayout.checkpoints.top).toBeGreaterThanOrEqual(previewLayout.sidebar.top - 1);
  expect(previewLayout.checkpoints.bottom).toBeLessThanOrEqual(previewLayout.sidebar.bottom + 1);
  expect(previewLayout.checkpoints.left).toBeGreaterThanOrEqual(previewLayout.stage.right - 1);
  // The deck contains the stage AND its sibling sidebar; the flight-view child
  // contains only the scene and cannot show the new native controls beside it.
  await page.locator('#migration-flight-deck').screenshot({ path: join(report, 'desktop-cycle-explorer.png') });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-cycle-remount-and-preview.json'), JSON.stringify({ initialFreshView, selected, serialized, restored, selectedAgain, layout, previewLayout }, null, 2));
});

