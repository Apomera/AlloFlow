import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// Inspect the geometry submitted by the tool; never create a replacement GL context.
test.describe.configure({ retries: 0, timeout: 180_000 });
const report = process.env.MIGRATION_REPORT_DIR ? join(process.env.MIGRATION_REPORT_DIR, 'round11') : join(process.cwd(), 'reports/migration-deep-review-round11-2026-10-18');
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
    flightSpecies: 'canada_goose', flightWind: 0, flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...seed } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
  await page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec;
    const original = record.scene.onBeforeRender;
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
function snapshot(speciesId: string, wind: number, season = 'fall', formationMode = 'natural') {
  return { speciesId, wind, season, formationMode };
}
function evidenceSeed() {
  return { flightSeason: 'fall', flightFormation: 'natural', flightWind: 6,
    flightInvestigation: { variable: 'wind', prediction: 'Keep my current prediction separate from each saved pair.',
      baseline: snapshot('monarch', -15, 'spring', 'swarm'),
      trials: [
        { id: 1, variable: 'wind', prediction: 'Original tailwind prediction.', baseline: snapshot('canada_goose', 0), snapshot: snapshot('canada_goose', 10) },
        { id: 2, variable: 'formation', prediction: 'Original confounded pattern prediction.', baseline: snapshot('snow_goose', 5, 'spring', 'solo'), snapshot: snapshot('snow_goose', -10, 'spring', 'v') },
        { id: 3, variable: 'formation', prediction: 'Natural V and explicit V keep the effective pattern.', baseline: snapshot('canada_goose', 0), snapshot: snapshot('canada_goose', 0, 'fall', 'v') }
      ], evidence: 'Keep my recorded evidence and numbers.', explanation: 'Keep my ungraded explanation.' },
    flightStudyObservations: { drafts: { 'canada_goose:head': 'Keep my unfinished anatomy note.' }, records: {}, comparison: { draft: 'Keep my unfinished observation comparison.' } },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep this challenge prediction.', notes: 'Keep this challenge reasoning.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep this energy hypothesis.', explanation: 'Keep this energy explanation.', trials: [] },
    aiExplorerText: 'Keep my route facts.', selectedSpecies: 'canada_goose' };
}
function learnerRecords(data: Record<string, unknown>) {
  return Object.fromEntries(['flightInvestigation', 'flightStudyObservations', 'flightChallenges', 'inquiry', 'aiExplorerText', 'selectedSpecies']
    .map(key => [key, data[key]]));
}
function retainedLearning(data: Record<string, unknown>) {
  const result = { ...data };
  for (const key of ['flightSpecies', 'flightSeason', 'flightFormation', 'flightWind', 'flightCamera', 'flightPaused', 'flightShowSpeedVectors']) delete result[key];
  return result;
}

async function wingtip(page: Page) {
  return page.evaluate(() => {
    const record = (window as any).__glCanvas()?.rec, scene = record?.scene, camera = record?.camera, THREE = (window as any).THREE;
    const root = scene?.getObjectByName('migration-wingtip-path');
    const line = root?.getObjectByName('migration-wingtip-cycle');
    const flock = scene?.getObjectByName('migration-flock');
    if (!root || !line || !flock || !camera) throw new Error('Submitted wingtip geometry, flock or camera is unavailable');
    const data = (window as any).__toolData.migration;
    const bird = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))];
    scene.updateMatrixWorld(true);
    const inverseBird = new THREE.Matrix4().copy(bird.matrixWorld).invert();
    const shown = (object: any) => { for (let part = object; part; part = part.parent) if (!part.visible) return false; return true; };
    const positions = line.geometry.attributes.position;
    const requested = Number(line.geometry.drawRange.count);
    const count = Number.isFinite(requested) ? Math.min(positions.count, requested) : positions.count;
    const actual = Array.from(positions.array.slice(0, count * 3)) as number[];
    const point = new THREE.Vector3(), projected = new THREE.Vector3();
    const endpoints = ['left', 'right'].map((side, index) => {
      // Independently choose the actual outer mesh. Both sides share positive-x
      // local geometry and the left mesh mirrors it with scale.x = -1.
      const node = data.flightSpecies === 'monarch'
        ? bird.userData.wings[index].children.find((part: any) => part.name === 'migration-monarch-forewing')
        : bird.userData.primaries[index];
      if (!node?.geometry?.attributes?.position) throw new Error('Actual outer wingtip mesh is unavailable');
      const vertices = node.geometry.attributes.position;
      const rim = data.flightSpecies === 'monarch' ? Number(node.geometry.userData.monarchBoundaryVertexCount) : vertices.count;
      let vertex = 0;
      for (let candidate = 1; candidate < rim; candidate++) {
        if (vertices.getX(candidate) > vertices.getX(vertex) ||
          (vertices.getX(candidate) === vertices.getX(vertex) && vertices.getZ(candidate) > vertices.getZ(vertex))) vertex = candidate;
      }
      const expected = new THREE.Vector3().fromBufferAttribute(vertices, vertex).applyMatrix4(node.matrixWorld).applyMatrix4(inverseBird);
      const marker = root.getObjectByName('migration-wingtip-' + side + '-point');
      if (!marker?.geometry) throw new Error('Actual ' + side + ' wingtip endpoint geometry is unavailable');
      const markerOrigin = marker.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverseBird);
      const projection = marker.getWorldPosition(new THREE.Vector3()).project(camera);
      return { side, node, vertex, vertices, sourceUuid: node.uuid, sourceGeometry: node.geometry.uuid,
        sourceName: node.name, rim, fullVertices: vertices.count, expected: expected.toArray(), actual: markerOrigin.toArray(),
        error: markerOrigin.distanceTo(expected), marker: marker.uuid, geometry: marker.geometry.uuid, material: marker.material.uuid,
        visible: shown(marker), inView: Math.abs(projection.x) <= 1 && Math.abs(projection.y) <= 1 && projection.z >= -1 && projection.z <= 1 };
    });
    // Independently reconstruct all 64 closed segments from the REAL skeleton.
    // Do not call the implementation's phase helper or trust its source metadata.
    // A synchronous evaluate prevents RAF between these temporary poses; finally
    // restores every rotation before returning control to the application.
    const joints = [...bird.userData.wings, ...bird.userData.wrists, ...bird.userData.primaries];
    const originals = joints.map((joint: any) => joint.rotation.clone());
    const expectedCycle: number[] = [];
    const setPose = (phase: number) => {
      const flap = Math.sin(phase) * bird.userData.flapAmount;
      bird.userData.wings[0].rotation.z = flap; bird.userData.wings[1].rotation.z = -flap;
      for (let index = 0; index < bird.userData.wrists.length; index++) {
        const side = index === 0 ? -1 : 1;
        bird.userData.wrists[index].rotation.z = side * (0.08 + Math.sin(phase - 0.65) * 0.15);
        bird.userData.wrists[index].rotation.y = side * (0.06 + Math.max(0, Math.sin(phase)) * 0.13);
        bird.userData.primaries[index].rotation.x = Math.sin(phase - 0.85) * 0.075;
      }
      bird.updateMatrixWorld(true);
    };
    try {
      for (const endpoint of endpoints) {
        for (let segment = 0; segment < 64; segment++) {
          for (let end = 0; end < 2; end++) {
            setPose((segment + end) / 64 * Math.PI * 2);
            point.fromBufferAttribute(endpoint.vertices, endpoint.vertex).applyMatrix4(endpoint.node.matrixWorld).applyMatrix4(inverseBird);
            expectedCycle.push(point.x, point.y, point.z);
          }
        }
      }
    } finally {
      joints.forEach((joint: any, index: number) => joint.rotation.copy(originals[index]));
      bird.updateMatrixWorld(true);
    }
    let maximumCycleError = 0, inView = 0, extent = 0;
    for (let index = 0; index < Math.min(actual.length, expectedCycle.length); index++) maximumCycleError = Math.max(maximumCycleError, Math.abs(actual[index] - expectedCycle[index]));
    for (let index = 0; index < count; index++) {
      projected.fromBufferAttribute(positions, index).applyMatrix4(line.matrixWorld).project(camera);
      extent = Math.max(extent, Math.abs(projected.x), Math.abs(projected.y));
      if (Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1 && projected.z >= -1 && projected.z <= 1) inView++;
    }
    const materials = (Array.isArray(line.material) ? line.material : [line.material]).map((material: any) => ({
      uuid: material.uuid, type: material.type, hex: material.color.getHexString(), rgb: material.color.toArray(),
      vertexColors: material.vertexColors, depthTest: material.depthTest, depthWrite: material.depthWrite, fog: material.fog }));
    const colors = line.geometry.attributes.color, distances = line.geometry.attributes.lineDistance;
    return { scene: scene.uuid, uuid: root.uuid, visible: shown(root), type: line.type, line: line.uuid,
      geometry: line.geometry.uuid, capacity: positions.count, count, actual, expectedCycle, maximumCycleError,
      finite: actual.every(Number.isFinite), inView, extent, groups: line.geometry.groups.map((group: any) => ({ ...group })), materials,
      colors: colors ? Array.from(colors.array.slice(0, count * 3)) : [],
      distances: distances ? Array.from(distances.array.slice(0, count)) : [],
      endpoints: endpoints.map(({ node, vertices, ...endpoint }) => endpoint),
      rootMatrix: root.matrixWorld.elements.slice(), birdMatrix: bird.matrixWorld.elements.slice(),
      sourceBirdUuid: root.userData.sourceBirdUuid, selectedBirdUuid: bird.uuid,
      camera: camera.position.toArray(), speciesId: data.flightSpecies, data: JSON.parse(JSON.stringify(data)) };
  });
}
function expectPath(state: any) {
  expect(state.visible).toBe(true); expect(state.type).toBe('LineSegments');
  expect(state.count).toBe(256); expect(state.capacity).toBeGreaterThanOrEqual(256); expect(state.finite).toBe(true);
  expect(state.actual).toHaveLength(state.expectedCycle.length); expect(state.maximumCycleError).toBeLessThan(0.00001);
  expect(state.inView).toBe(state.count); expect(state.extent).toBeLessThan(1);
  expect(state.sourceBirdUuid).toBe(state.selectedBirdUuid);
  expect(state.distances).toHaveLength(state.count); expect(state.distances.every(Number.isFinite)).toBe(true);
  expect(state.distances.slice(0, 128).every((value: number) => value === 0)).toBe(true);
  expect(state.distances[128]).toBe(0); expect(state.distances[255]).toBeGreaterThan(0.5);
  for (let index = 129; index < state.distances.length; index++) expect(state.distances[index]).toBeGreaterThanOrEqual(state.distances[index - 1]);
  state.rootMatrix.forEach((value: number, index: number) => expect(value).toBeCloseTo(state.birdMatrix[index], 6));
  expect(state.endpoints).toHaveLength(2);
  for (const endpoint of state.endpoints) { expect(endpoint.visible).toBe(true); expect(endpoint.inView).toBe(true); expect(endpoint.error).toBeLessThan(0.00001); }
  // Each side forms a closed, nondegenerate loop rather than an arbitrary line.
  for (let side = 0; side < 2; side++) {
    const offset = side * 64 * 6;
    const first = state.actual.slice(offset, offset + 3), last = state.actual.slice(offset + 64 * 6 - 3, offset + 64 * 6);
    first.forEach((value: number, index: number) => expect(value).toBeCloseTo(last[index], 6));
    const ys = Array.from({ length: 128 }, (_, index) => state.actual[offset + index * 3 + 1]) as number[];
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.2);
  }
}
function expectTheme(state: any, dark: boolean) {
  const expected = dark ? [[103 / 255, 232 / 255, 249 / 255], [251 / 255, 191 / 255, 36 / 255]]
    : [[2 / 255, 16 / 255, 22 / 255], [36 / 255, 12 / 255, 1 / 255]];
  expect(state.colors).toHaveLength(state.count * 3);
  for (let index = 0; index < state.count; index++) {
    for (let axis = 0; axis < 3; axis++) expect(state.colors[index * 3 + axis]).toBeCloseTo(expected[index < 128 ? 0 : 1][axis], 6);
  }
  for (const material of state.materials) { expect(material.type).toBe('LineDashedMaterial'); expect(material.vertexColors).toBe(true); }
}
function resources(state: any) {
  return { root: state.uuid, line: state.line, geometry: state.geometry, capacity: state.capacity,
    materials: state.materials.map((item: any) => item.uuid),
    endpoints: state.endpoints.map((item: any) => [item.marker, item.geometry, item.material]) };
}

test('Migration wingtip paths follow both real outer vertices, reconstruct a complete stylized cycle and keep live dots aligned while stepping and orbiting', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page, evidenceSeed());
  const control = page.getByRole('checkbox', { name: 'Show wingtip path', exact: true });
  await expect(control).not.toBeChecked(); const disabled = await wingtip(page); expect(disabled.visible).toBe(false);
  const beforeToggle = await saved(page);
  const learning = learnerRecords(await saved(page));
  await control.focus(); await page.keyboard.press('Space'); await frames(page);
  await expect(control).toBeChecked();
  const initial = await wingtip(page); expectPath(initial); expectTheme(initial, false);
  expect(initial.endpoints.map((item: any) => item.expected)).toEqual(disabled.endpoints.map((item: any) => item.expected));
  const afterToggle = await saved(page); delete afterToggle.flightShowWingtipPath;
  const comparableBefore = { ...beforeToggle }; delete comparableBefore.flightShowWingtipPath;
  expect(afterToggle).toEqual(comparableBefore);
  await keyboardClick(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }));
  const steps: any[] = [];
  for (let index = 0; index < 8; index++) {
    await keyboardClick(page, page.getByRole('button', { name: 'Step wingbeat', exact: true }));
    const state = await wingtip(page); expectPath(state); expect(state.actual).toEqual(initial.actual); expect(resources(state)).toEqual(resources(initial)); steps.push(state);
  }
  expect(steps[0].endpoints.map((item: any) => item.actual)).not.toEqual(initial.endpoints.map((item: any) => item.actual));
  for (let side = 0; side < 2; side++) steps[7].endpoints[side].actual.forEach((value: number, axis: number) => expect(value).toBeCloseTo(initial.endpoints[side].actual[axis], 5));
  await keyboardClick(page, page.getByRole('button', { name: 'From above', exact: true }));
  const above = await wingtip(page); expectPath(above); expect(above.camera).not.toEqual(initial.camera); expect(above.actual).toEqual(initial.actual);
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-wingtip-path-above.png') });
  await keyboardClick(page, page.getByRole('button', { name: 'Profile', exact: true }));
  await page.locator('#migration-flight-stage').focus(); await page.keyboard.press('ArrowRight'); await frames(page);
  const orbited = await wingtip(page); expectPath(orbited); expect(orbited.actual).toEqual(initial.actual);
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-wingtip-path-profile.png') });
  await theme(page, true); const dark = await wingtip(page); expectPath(dark); expectTheme(dark, true);
  expect(dark.actual).toEqual(initial.actual); expect(resources(dark)).toEqual(resources(initial));
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-wingtip-path-night.png') });
  expect(learnerRecords(await saved(page))).toEqual(learning);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-wingtip-geometry-review.json'), JSON.stringify({ disabled, initial, steps, above, orbited, dark }, null, 2));
});

test('Migration wingtip resources survive toggles, camera modes and all eight species including true Monarch membrane rims, then dispose on unmount', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page);
  const control = page.getByRole('checkbox', { name: 'Show wingtip path', exact: true });
  await control.check(); await frames(page); const original = await wingtip(page); expectPath(original);
  const states: any[] = [];
  for (let index = 0; index < 3; index++) {
    await control.uncheck(); await frames(page); const hidden = await wingtip(page); expect(hidden.visible).toBe(false); expect(resources(hidden)).toEqual(resources(original));
    await control.check(); await frames(page); const shown = await wingtip(page); expectPath(shown); expect(resources(shown)).toEqual(resources(original));
  }
  await keyboardClick(page, page.getByRole('button', { name: 'Chase', exact: true }));
  expect((await wingtip(page)).visible).toBe(false); expect((await saved(page)).flightShowWingtipPath).toBe(true);
  await expect(control).toHaveCount(0);
  await keyboardClick(page, page.getByRole('button', { name: 'Study', exact: true }));
  await expect(control).toBeChecked(); expectPath(await wingtip(page));
  await page.getByRole('combobox', { name: 'Study individual', exact: true }).selectOption('1'); await frames(page);
  const individual = await wingtip(page); expectPath(individual); expect(individual.selectedBirdUuid).not.toBe(original.selectedBirdUuid); expect(resources(individual)).toEqual(resources(original));
  for (const id of ['canada_goose', 'arctic_tern', 'ruby_hummingbird', 'snow_goose', 'peregrine', 'sandhill_crane', 'monarch', 'bartailed_godwit']) {
    await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption(id); await frames(page);
    const state = await wingtip(page); expectPath(state); expect(state.speciesId).toBe(id); expect(resources(state)).toEqual(resources(original));
    for (const endpoint of state.endpoints) {
      expect(endpoint.sourceName).toBe(id === 'monarch' ? 'migration-monarch-forewing' : 'migration-primary-feathers');
      if (id === 'monarch') expect(endpoint.rim).toBeLessThan(endpoint.fullVertices);
    }
    if (id === 'monarch') await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-monarch-wingtip-path.png') });
    states.push(state);
  }
  await page.evaluate(() => {
    const root = (window as any).__glCanvas()?.rec.scene.getObjectByName('migration-wingtip-path');
    const unique = new Map<string, any>(); root.traverse((node: any) => {
      if (node.geometry) unique.set(node.geometry.uuid, node.geometry);
      for (const material of (Array.isArray(node.material) ? node.material : [node.material])) if (material) unique.set(material.uuid, material);
    });
    (window as any).__wingtipDisposals = Array.from(unique.values()).map(resource => {
      const item = { uuid: resource.uuid, count: 0 }; resource.addEventListener('dispose', () => item.count++); return item;
    });
  });
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await harness.unmount(page);
  await expect.poll(() => page.evaluate(() => (window as any).__wingtipDisposals.every((item: any) => item.count === 1))).toBe(true);
  const disposals = await page.evaluate(() => (window as any).__wingtipDisposals);
  expect(disposals.length).toBeGreaterThan(3);
  await writeFile(join(report, 'desktop-wingtip-species-lifecycle.json'), JSON.stringify({ original, individual, states, disposals }, null, 2));
});

test('Migration context loss keeps the wingtip path invalid through later animation callbacks while retaining saved work and the selected preference', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mount(page, { ...evidenceSeed(), flightShowWingtipPath: true });
  await expect(page.getByRole('checkbox', { name: 'Show wingtip path', exact: true })).toBeChecked();
  const initial = await wingtip(page); expectPath(initial);
  const before = await saved(page);
  const review = await page.evaluate(async () => {
    const record = (window as any).__glCanvas()?.rec;
    const canvas = record?.canvas || document.querySelector('.migration-flight-stage canvas');
    const scene = record?.scene, root = scene?.getObjectByName('migration-wingtip-path');
    const line = root?.getObjectByName('migration-wingtip-cycle');
    const host = document.querySelector('.migration-flight-stage');
    if (!canvas || !root || !line || !host) throw new Error('Mounted wingtip scene is unavailable before loss');
    const snapshot = () => ({ scene: scene.uuid, root: root.uuid, visible: root.visible,
      count: line.geometry.drawRange.count, geometry: line.geometry.uuid, material: line.material.uuid,
      available: root.userData.available, buildVersion: root.userData.buildVersion,
      sourceBirdUuid: root.userData.sourceBirdUuid, speciesId: root.userData.speciesId,
      individual: root.userData.individual, sources: JSON.parse(JSON.stringify(root.userData.sources)),
      ready: host.getAttribute('data-flight-ready'), error: host.getAttribute('data-flight-error') });
    const before = snapshot();
    // Dispatch to the actual canvas so the installed loss listeners run. Do not
    // invoke invalidate/update helpers or wait for application renders: a lost
    // renderer can stop submitting draws while browser RAF callbacks continue.
    const event = new Event('webglcontextlost', { cancelable: true });
    const dispatchReturned = canvas.dispatchEvent(event);
    const immediate = snapshot(), callbacks: any[] = [];
    for (let frame = 0; frame < 8; frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      callbacks.push(snapshot());
    }
    return { before, immediate, callbacks, dispatchReturned, prevented: event.defaultPrevented,
      errors: (window as any).__events.errors };
  });
  expect(review.before.visible).toBe(true); expect(review.before.count).toBe(256);
  expect(review.before.available).toBe(true); expect(review.before.buildVersion).toBeGreaterThan(0);
  expect(review.prevented).toBe(true); expect(review.dispatchReturned).toBe(false); expect(review.callbacks).toHaveLength(8);
  for (const state of [review.immediate, ...review.callbacks]) {
    expect(state.visible).toBe(false); expect(state.count).toBe(0); expect(state.available).toBe(false);
    expect(state.sources).toEqual([]); expect(state.sourceBirdUuid).toBe(''); expect(state.speciesId).toBe(''); expect(state.individual).toBe(-1);
    expect(state.buildVersion).toBe(review.before.buildVersion); expect(state.ready).toBeNull(); expect(state.error).toBe('true');
    expect(state.scene).toBe(review.before.scene); expect(state.root).toBe(review.before.root);
    expect(state.geometry).toBe(review.before.geometry); expect(state.material).toBe(review.before.material);
  }
  await expect(page.getByRole('checkbox', { name: 'Show wingtip path', exact: true })).toBeChecked();
  await expect(page.getByText('The 3D context paused. Switch tabs and return to restart the flight view.', { exact: true })).toBeVisible();
  expect(await saved(page)).toEqual(before); expect(review.errors).toEqual([]);
  await writeFile(join(report, 'desktop-wingtip-context-loss-review.json'), JSON.stringify({ initial, before, review, after: await saved(page) }, null, 2));
});

test('Migration historical pair feedback distinguishes controlled, confounded and effectively unchanged conditions using each saved baseline without editing learner work', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); const seed = evidenceSeed(); await mount(page, seed);
  const before = await saved(page), reviews: any[] = [];
  for (const expected of [
    { trial: 1, variable: 'wind', status: 'controlled', label: 'Controlled comparison', changed: 'wind', speed: 22, drafting: 0 },
    { trial: 2, variable: 'formation', status: 'confounded', label: 'Other conditions changed', changed: 'wind,formation', speed: -33, drafting: 22 },
    { trial: 3, variable: 'formation', status: 'unchanged', label: 'Unchanged conditions', changed: '', speed: 0, drafting: 0 }
  ]) {
    await keyboardClick(page, page.getByRole('button', { name: 'Revisit trial ' + expected.trial, exact: true }));
    const tray = page.locator('[data-experiment-pair-review]'), feedback = tray.locator('[data-pair-review-comparison]');
    await expect(tray).toBeVisible(); await expect(feedback).toHaveAttribute('data-pair-review-comparison', expected.status);
    await expect(feedback).toHaveAttribute('data-pair-review-variable', expected.variable);
    await expect(feedback).toContainText('Variable tested: ' + (expected.variable === 'wind' ? 'Wind' : 'Formation'));
    await expect(feedback).toContainText(expected.label);
    await expect(feedback.locator('[data-pair-changed-conditions]')).toHaveAttribute('data-pair-changed-conditions', expected.changed);
    await expect(feedback.locator('[data-pair-speed-delta]')).toHaveAttribute('data-pair-speed-delta', String(expected.speed));
    await expect(feedback.locator('[data-pair-drafting-delta]')).toHaveAttribute('data-pair-drafting-delta', String(expected.drafting));
    await expect(feedback.locator('[data-pair-speed-delta]')).toHaveText('Ground speed change: ' + (expected.speed > 0 ? '+' : '') + expected.speed + ' mph');
    await expect(feedback.locator('[data-pair-drafting-delta]')).toHaveText('Drafting credit change: ' + (expected.drafting > 0 ? '+' : '') + expected.drafting + ' percentage points');
    if (expected.status === 'confounded') { await expect(feedback).toContainText('This pair cannot isolate the tested condition.'); await expect(feedback).toContainText('Wind, Pattern'); }
    if (expected.status === 'unchanged') await expect(feedback).toContainText('No effective condition changed');
    const reviewBefore = await feedback.innerText();
    await keyboardClick(page, tray.getByRole('button', { name: 'Saved baseline', exact: true }));
    expect(await feedback.innerText()).toBe(reviewBefore);
    await keyboardClick(page, tray.getByRole('button', { name: 'Saved trial', exact: true }));
    const wind = page.getByRole('slider', { name: /Along-route wind in meters per second/ }); await wind.fill('-9'); await frames(page);
    await expect(tray).toHaveAttribute('data-review-active', ''); expect(await feedback.innerText()).toBe(reviewBefore);
    expect(retainedLearning(await saved(page))).toEqual(retainedLearning(before));
    reviews.push({ expected, text: reviewBefore, data: await saved(page) });
    if (expected.trial === 2) await tray.screenshot({ path: join(report, 'desktop-historical-confounded-pair-feedback.png') });
  }
  const tray = page.locator('[data-experiment-pair-review]');
  await keyboardClick(page, tray.getByRole('button', { name: 'Add evidence', exact: true }));
  await expect(page.getByRole('textbox', { name: 'Evidence I noticed', exact: true })).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Evidence I noticed', exact: true })).toHaveValue(seed.flightInvestigation.evidence);
  expect(retainedLearning(await saved(page))).toEqual(retainedLearning(before));
  const after = await saved(page);
  await keyboardClick(page, tray.getByRole('button', { name: 'Close saved trial review', exact: true }));
  await expect(page.locator('[data-experiment-pair-review]')).toHaveCount(0); await expect(page.locator('#migration-flight-stage')).toBeFocused();
  expect(await saved(page)).toEqual(after); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-historical-pair-feedback-review.json'), JSON.stringify({ before, reviews, after }, null, 2));
});

for (const dark of [false, true]) test.describe('phone ' + (dark ? 'dark' : 'light'), () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Migration native wingtip controls and historical comparison feedback fit a 390px phone with accessible learning actions', async ({ page }) => {
    await mount(page, evidenceSeed()); await theme(page, dark);
    const before = await saved(page), control = page.getByRole('checkbox', { name: 'Show wingtip path', exact: true });
    await control.tap(); await frames(page); await expect(control).toBeChecked();
    const initial = await wingtip(page); expectPath(initial); expectTheme(initial, dark);
    await page.getByRole('button', { name: 'Step wingbeat', exact: true }).tap(); await frames(page);
    await page.getByRole('button', { name: 'From above', exact: true }).tap(); await frames(page);
    const stepped = await wingtip(page); expectPath(stepped); expect(stepped.actual).toEqual(initial.actual); expect(resources(stepped)).toEqual(resources(initial));
    const stem = 'mobile-' + (dark ? 'dark' : 'light') + '-wingtip-feedback';
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-stage.png') });
    expect(learnerRecords(await saved(page))).toEqual(learnerRecords(before));
    await page.getByRole('button', { name: 'Revisit trial 2', exact: true }).tap(); await frames(page);
    const tray = page.locator('[data-experiment-pair-review]'), feedback = tray.locator('[data-pair-review-comparison]');
    await expect(feedback).toHaveAttribute('data-pair-review-comparison', 'confounded');
    await expect(feedback).toContainText('This pair cannot isolate the tested condition.');
    await expect(feedback.locator('[data-pair-speed-delta]')).toHaveAttribute('data-pair-speed-delta', '-33');
    await expect(feedback.locator('[data-pair-drafting-delta]')).toHaveAttribute('data-pair-drafting-delta', '22');
    await tray.getByRole('button', { name: 'Saved baseline', exact: true }).tap(); await frames(page);
    await expect(tray).toHaveAttribute('data-review-active', 'baseline');
    const baseline = await saved(page); expect(baseline).toMatchObject({ flightSpecies: 'snow_goose', flightSeason: 'spring', flightFormation: 'solo', flightWind: 5 });
    await tray.getByRole('button', { name: 'Saved trial', exact: true }).tap(); await frames(page);
    await expect(tray).toHaveAttribute('data-review-active', 'trial');
    const trial = await saved(page); expect(trial).toMatchObject({ flightSpecies: 'snow_goose', flightSeason: 'spring', flightFormation: 'v', flightWind: -10 });
    expect(learnerRecords(trial)).toEqual(learnerRecords(before)); await tray.screenshot({ path: join(report, stem + '-saved-pair.png') });
    await tray.getByRole('button', { name: 'Add evidence', exact: true }).tap();
    await expect(page.getByRole('textbox', { name: 'Evidence I noticed', exact: true })).toBeFocused();
    await page.addScriptTag({ content: axeSource });
    const review = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        violations: result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })) })),
        errors: (window as any).__events.errors };
    });
    await page.screenshot({ path: join(report, stem + '.png'), fullPage: true });
    await writeFile(join(report, stem + '.json'), JSON.stringify({ ...review, initial, stepped, before, baseline, trial }, null, 2));
    expect(review.viewport).toBe(390); expect(review.scrollWidth).toBeLessThanOrEqual(390); expect(review.violations).toEqual([]); expect(review.errors).toEqual([]);
  });
});
