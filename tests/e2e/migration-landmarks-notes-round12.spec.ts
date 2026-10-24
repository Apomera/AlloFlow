import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 180_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round12-2026-10-18');
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

// Read only geometry actually owned by the submitted scene. Reconstruct poses
// from the real wing meshes without calling the implementation's sampler.
async function landmarks(page: Page) {
  return page.evaluate(() => {
    const rec = (window as any).__glCanvas()?.rec, scene = rec?.scene, camera = rec?.camera, THREE = (window as any).THREE;
    const root = scene?.getObjectByName('migration-wingtip-path'), flock = scene?.getObjectByName('migration-flock');
    if (!root || !flock || !camera) throw new Error('The tool has not submitted its wingtip scene');
    const data = (window as any).__toolData.migration;
    const bird = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))];
    scene.updateMatrixWorld(true);
    const inverse = new THREE.Matrix4().copy(bird.matrixWorld).invert();
    const joints = [...bird.userData.wings, ...bird.userData.wrists, ...bird.userData.primaries];
    const rotations = joints.map((joint: any) => joint.rotation.clone());
    const visible = (node: any) => { for (let parent = node; parent; parent = parent.parent) if (!parent.visible) return false; return true; };
    const pose = (phase: number) => {
      const flap = Math.sin(phase) * bird.userData.flapAmount;
      bird.userData.wings[0].rotation.z = flap; bird.userData.wings[1].rotation.z = -flap;
      for (let index = 0; index < bird.userData.wrists.length; index++) {
        const side = index === 0 ? -1 : 1;
        bird.userData.wrists[index].rotation.z = side * (0.08 + Math.sin(phase - 0.65) * 0.15);
        bird.userData.wrists[index].rotation.y = side * (0.06 + Math.max(0, Math.sin(phase)) * 0.13);
        bird.userData.primaries[index].rotation.x = Math.sin(phase - 0.85) * 0.075;
      } bird.updateMatrixWorld(true);
    };
    const sources = [0, 1].map(index => {
      const node = data.flightSpecies === 'monarch'
        ? bird.userData.wings[index].children.find((part: any) => part.name === 'migration-monarch-forewing')
        : bird.userData.primaries[index];
      const vertices = node?.geometry?.attributes?.position;
      if (!vertices) throw new Error('Actual wing mesh unavailable');
      const limit = data.flightSpecies === 'monarch' ? node.geometry.userData.monarchBoundaryVertexCount : vertices.count;
      let selected = 0;
      for (let i = 1; i < limit; i++) if (vertices.getX(i) > vertices.getX(selected) ||
        (vertices.getX(i) === vertices.getX(selected) && vertices.getZ(i) > vertices.getZ(selected))) selected = i;
      return { node, vertices, selected, rim: limit };
    });
    const expected: number[][][] = [[], []];
    try {
      for (let sample = 0; sample < 64; sample++) {
        pose(sample / 64 * Math.PI * 2);
        sources.forEach((source, side) => expected[side].push(new THREE.Vector3().fromBufferAttribute(source.vertices, source.selected)
          .applyMatrix4(source.node.matrixWorld).applyMatrix4(inverse).toArray()));
      }
    } finally {
      joints.forEach((joint: any, index: number) => joint.rotation.copy(rotations[index])); bird.updateMatrixWorld(true);
    }
    // Recover phase from TWO actual bird joint angles, avoiding the ambiguity
    // of asin alone. Monarch has no feather joints, so its paused, reduced-motion
    // engine phase is independently determined by individual offset/manual step.
    let phase: number;
    if (bird.userData.primaries.length) {
      const sine = bird.userData.wings[0].rotation.z / bird.userData.flapAmount;
      const shifted = bird.userData.primaries[0].rotation.x / 0.075;
      const cosine = (sine * Math.cos(0.85) - shifted) / Math.sin(0.85);
      phase = (Math.atan2(sine, cosine) + Math.PI * 2) % (Math.PI * 2);
    } else phase = ((bird.userData.phase + (Number(data.flightWingStep) || 0) * Math.PI / 4) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const bounds = (node: any, matrix?: any) => {
      const positions = node.geometry.attributes.position;
      let left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity, inView = true;
      const transform = matrix ? new THREE.Matrix4().multiplyMatrices(node.matrixWorld, matrix) : node.matrixWorld;
      for (let vertex = 0; vertex < positions.count; vertex++) {
        const point = new THREE.Vector3().fromBufferAttribute(positions, vertex).applyMatrix4(transform).project(camera);
        left = Math.min(left, point.x); right = Math.max(right, point.x);
        top = Math.max(top, point.y); bottom = Math.min(bottom, point.y);
        inView = inView && Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && Math.abs(point.z) < 1;
      }
      const rect = rec.canvas.getBoundingClientRect();
      return { left, right, top, bottom, inView, widthPx: (right - left) * rect.width / 2, heightPx: (top - bottom) * rect.height / 2 };
    };
    const sides = ['left', 'right'].map((side, index) => {
      const rings = root.getObjectByName('migration-wingtip-' + side + '-landmarks');
      const direction = root.getObjectByName('migration-wingtip-' + side + '-direction');
      const point = root.getObjectByName('migration-wingtip-' + side + '-point');
      if (!rings?.isInstancedMesh || !direction?.geometry || !point) throw new Error('The scene is missing its actual ' + side + ' landmarks/direction');
      const instances = [];
      for (let landmark = 0; landmark < rings.count; landmark++) {
        const matrix = new THREE.Matrix4(); rings.getMatrixAt(landmark, matrix);
        const center = new THREE.Vector3().setFromMatrixPosition(matrix);
        instances.push({ position: center.toArray(), expected: expected[index][landmark * 8],
          error: center.distanceTo(new THREE.Vector3().fromArray(expected[index][landmark * 8])), bounds: bounds(rings, matrix) });
      }
      const position = direction.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
      const screenPosition = direction.getWorldPosition(new THREE.Vector3()).project(camera);
      // Reconstruct the upcoming point and its centered half-sample tangent
      // from our independently posed actual wing vertices, not cue metadata.
      const interpolate = (coordinate: number) => {
        const wrapped = (coordinate % 64 + 64) % 64, lower = Math.floor(wrapped), weight = wrapped - lower;
        return new THREE.Vector3().fromArray(expected[index][lower]).lerp(new THREE.Vector3().fromArray(expected[index][(lower + 1) % 64]), weight);
      };
      const coordinate = phase / (Math.PI * 2) * 64 + 2;
      const expectedAnchor = interpolate(coordinate);
      const tangent = interpolate(coordinate + 0.5).sub(interpolate(coordinate - 0.5)).normalize();
      const worldTangent = tangent.clone().transformDirection(bird.matrixWorld);
      const cameraRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const cameraUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      const visibilityLength = Math.hypot(worldTangent.dot(cameraRight), worldTangent.dot(cameraUp));
      const prior = interpolate(coordinate - 0.5).applyMatrix4(bird.matrixWorld).project(camera);
      const next = interpolate(coordinate + 0.5).applyMatrix4(bird.matrixWorld).project(camera);
      const stageBox = rec.canvas.getBoundingClientRect();
      // Screen-space tangent must include perspective at off-axis tips and the
      // viewport's aspect ratio. Project both independently reconstructed curve
      // neighbors, rather than repeating the product's camera-basis formula.
      const expectedScreen = [(next.x - prior.x) * stageBox.width, (next.y - prior.y) * stageBox.height];
      const expectedLength = Math.hypot(...expectedScreen);
      // Positive local x is the actual chevron's forward axis; inspecting its
      // transformed geometry catches a reversed quaternion or a stale heading.
      const nose = direction.localToWorld(new THREE.Vector3(1, 0, 0)).project(camera);
      const actualScreenDirection = [(nose.x - screenPosition.x) * stageBox.width, (nose.y - screenPosition.y) * stageBox.height];
      const length = Math.hypot(...actualScreenDirection);
      const testWindow = window as any;
      const identities = testWindow.__round12ResourceIdentities || (testWindow.__round12ResourceIdentities = new WeakMap());
      const identity = (resource: object) => {
        if (!identities.has(resource)) identities.set(resource, testWindow.__round12ResourceSequence = (testWindow.__round12ResourceSequence || 0) + 1);
        return identities.get(resource);
      };
      const unique = new Map<string, any>();
      root.traverse((part: any) => {
        if (part.geometry) unique.set(part.geometry.uuid, { kind: 'geometry', uuid: part.geometry.uuid, type: part.geometry.type });
        for (const material of (Array.isArray(part.material) ? part.material : [part.material])) if (material) unique.set(material.uuid, { kind: 'material', uuid: material.uuid, type: material.type });
      });
      return { side, visible: visible(rings), count: rings.count, type: rings.type, instances,
        ring: { uuid: rings.uuid, geometry: rings.geometry.uuid, material: rings.material.uuid, type: rings.geometry.type,
          innerRadius: rings.geometry.parameters?.innerRadius, outerRadius: rings.geometry.parameters?.outerRadius,
          buffer: identity(rings.instanceMatrix), array: identity(rings.instanceMatrix.array), capacity: rings.instanceMatrix.count, color: rings.material.color.getHexString() },
        direction: { uuid: direction.uuid, visible: visible(direction), position: position.toArray(),
          geometry: direction.geometry.uuid, material: direction.material.uuid, bounds: bounds(direction),
          actualScreenDirection: actualScreenDirection.map(value => value / length), userData: JSON.parse(JSON.stringify(direction.userData)),
          expectedAnchor: expectedAnchor.toArray(), anchorError: position.distanceTo(expectedAnchor),
          expectedScreenDirection: expectedScreen.map(value => value / expectedLength), expectedVisible: visibilityLength >= 0.08 },
        point: { geometry: point.geometry.uuid, material: point.material.uuid, position: point.position.toArray() },
        source: { name: sources[index].node.name, rim: sources[index].rim, vertices: sources[index].vertices.count },
        expectedCycle: expected[index], resources: Array.from(unique.values()) };
    });
    return { root: root.uuid, visible: visible(root), available: root.userData.available, buildVersion: root.userData.buildVersion,
      scene: scene.uuid, species: data.flightSpecies, phase, sides, camera: camera.position.toArray(),
      cycleGeometry: root.getObjectByName('migration-wingtip-cycle').geometry.uuid,
      matrix: root.matrixWorld.elements.slice(), birdMatrix: bird.matrixWorld.elements.slice(), errors: (window as any).__events.errors };
  });
}
function resources(state: any) {
  return { root: state.root, geometry: state.cycleGeometry,
    sides: state.sides.map((side: any) => ({ ring: { ...side.ring, color: undefined },
      direction: { uuid: side.direction.uuid, geometry: side.direction.geometry, material: side.direction.material }, point: side.point.geometry })) };
}
function expectLandmarks(state: any, requireFit = true) {
  expect(state.visible).toBe(true); expect(state.available).toBe(true); expect(state.errors).toEqual([]);
  state.matrix.forEach((value: number, index: number) => expect(value).toBeCloseTo(state.birdMatrix[index], 6));
  expect(state.sides).toHaveLength(2);
  for (const side of state.sides) {
    expect(side.visible).toBe(true); expect(side.count).toBe(8); expect(side.ring.type).toBe('RingGeometry');
    expect(side.ring.innerRadius).toBeGreaterThan(0); expect(side.ring.innerRadius).toBeLessThan(side.ring.outerRadius);
    expect(side.ring.capacity).toBe(8); expect(side.ring.material).toBe(side.point.material);
    expect(side.direction.material).toBe(side.point.material);
    for (const instance of side.instances) {
      expect(instance.error).toBeLessThan(0.00001);
      if (requireFit) expect(instance.bounds.inView).toBe(true);
      expect(instance.bounds.widthPx).toBeGreaterThan(3); expect(instance.bounds.widthPx).toBeLessThan(20);
      expect(instance.bounds.heightPx).toBeGreaterThan(3); expect(instance.bounds.heightPx).toBeLessThan(20);
      expect(instance.bounds.widthPx / instance.bounds.heightPx).toBeCloseTo(1, 1);
    }
    expect(side.direction.visible).toBe(side.direction.expectedVisible);
    if (side.direction.visible) {
      if (requireFit) expect(side.direction.bounds.inView).toBe(true);
      expect(side.direction.anchorError).toBeLessThan(0.00001);
      side.direction.actualScreenDirection.forEach((value: number, index: number) => expect(value).toBeCloseTo(side.direction.expectedScreenDirection[index], 4));
    }
    expect(side.direction.position.every(Number.isFinite)).toBe(true);
  }
  expect(state.sides[0].ring.geometry).toBe(state.sides[1].ring.geometry);
  expect(state.sides[0].direction.geometry).toBe(state.sides[1].direction.geometry);
}

test('Migration hollow wingtip landmarks reconstruct actual articulation for all eight species and direction cues follow manual steps and camera changes', async ({ page }) => {
  test.setTimeout(270_000);
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page, observationSeed());
  const before = await saved(page), initial = await landmarks(page); expectLandmarks(initial);
  const steps = [];
  for (let index = 0; index < 8; index++) {
    await keyboardClick(page, page.getByRole('button', { name: 'Step wingbeat', exact: true }));
    const state = await landmarks(page); expectLandmarks(state); expect(resources(state)).toEqual(resources(initial)); steps.push(state);
  }
  expect(steps[0].sides[0].direction.position).not.toEqual(initial.sides[0].direction.position);
  initial.sides[0].direction.position.forEach((value: number, index: number) => expect(steps[7].sides[0].direction.position[index]).toBeCloseTo(value, 5));
  const species = [];
  for (const id of ['canada_goose', 'arctic_tern', 'ruby_hummingbird', 'snow_goose', 'peregrine', 'sandhill_crane', 'monarch', 'bartailed_godwit']) {
    await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption(id); await frames(page);
    const state = await landmarks(page); expectLandmarks(state); expect(resources(state)).toEqual(resources(initial)); species.push(state);
    for (const side of state.sides) {
      expect(side.source.name).toBe(id === 'monarch' ? 'migration-monarch-forewing' : 'migration-primary-feathers');
      if (id === 'monarch') expect(side.source.rim).toBeLessThan(side.source.vertices);
    }
    if (id === 'monarch') await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-monarch-cycle-landmarks.png') });
  }
  const framing = [];
  for (const name of ['Front', 'From above', 'Profile']) {
    await keyboardClick(page, page.getByRole('button', { name, exact: true }));
    await page.getByRole('slider', { name: 'Study zoom percent', exact: true }).fill('160'); await frames(page);
    const state = await landmarks(page); expectLandmarks(state, false); expect(resources(state)).toEqual(resources(initial)); framing.push(state);
  }
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-cycle-landmarks-profile.png') });
  const afterSpeciesSelections = await saved(page);
  expect(speciesWork(afterSpeciesSelections)).toEqual(speciesWork(before));
  // Species selection has always cleared the species-specific AI response.
  expect(afterSpeciesSelections.aiExplorerText).toBe('');
  await writeFile(join(report, 'desktop-landmarks-articulation.json'), JSON.stringify({ initial, steps, species, framing }, null, 2));
});

test('Migration landmark pool remains stable across themes and toggles, invalidates through context loss and disposes each owned resource exactly once', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page, observationSeed());
  const before = await saved(page), initial = await landmarks(page); expectLandmarks(initial);
  const control = page.getByRole('checkbox', { name: 'Show wingtip path', exact: true });
  for (const dark of [true, false, true]) {
    await theme(page, dark); const state = await landmarks(page); expectLandmarks(state);
    expect(resources(state)).toEqual(resources(initial)); expect(state.buildVersion).toBe(initial.buildVersion);
    expect(state.sides.map((side: any) => side.ring.color)).toEqual(dark ? ['67e8f9', 'fbbf24'] : ['021016', '240c01']);
    await control.uncheck(); await frames(page); const hidden = await landmarks(page); expect(hidden.visible).toBe(false);
    await control.check(); await frames(page); expectLandmarks(await landmarks(page));
  }
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-cycle-landmarks-night.png') });
  await page.evaluate(() => {
    const root = (window as any).__glCanvas().rec.scene.getObjectByName('migration-wingtip-path'), unique = new Map<string, any>();
    root.traverse((node: any) => {
      if (node.geometry) unique.set(node.geometry.uuid, node.geometry);
      for (const material of (Array.isArray(node.material) ? node.material : [node.material])) if (material) unique.set(material.uuid, material);
    });
    (window as any).__round12Disposals = Array.from(unique.values()).map(resource => {
      const item = { uuid: resource.uuid, count: 0 }; resource.addEventListener('dispose', () => item.count++); return item;
    });
  });
  const loss = await page.evaluate(async () => {
    const rec = (window as any).__glCanvas().rec, root = rec.scene.getObjectByName('migration-wingtip-path');
    const snapshot = () => ({ visible: root.visible, available: root.userData.available,
      count: root.getObjectByName('migration-wingtip-cycle').geometry.drawRange.count,
      children: root.children.filter((node: any) => /landmarks|direction/.test(node.name)).map((node: any) => ({ name: node.name, visible: node.visible })) });
    rec.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    const snapshots = [snapshot()];
    for (let index = 0; index < 6; index++) { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); snapshots.push(snapshot()); }
    return snapshots;
  });
  for (const state of loss) { expect(state.visible).toBe(false); expect(state.available).toBe(false); expect(state.count).toBe(0); }
  expect(work(await saved(page))).toEqual(work(before));
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await harness.unmount(page);
  await expect.poll(() => page.evaluate(() => (window as any).__round12Disposals.every((item: any) => item.count === 1))).toBe(true);
  const disposals = await page.evaluate(() => (window as any).__round12Disposals);
  expect(disposals).toHaveLength(7);
  await writeFile(join(report, 'desktop-landmarks-lifecycle.json'), JSON.stringify({ initial, loss, disposals }, null, 2));
});

test('Migration Describe wing motion opens the existing correct draft with native keyboard access and contextual evidence without recording or pausing', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page, { ...observationSeed(), flightPaused: false });
  const before = await saved(page), button = page.getByRole('button', { name: 'Describe wing motion', exact: true });
  await expect(button).toHaveAttribute('data-study-action', 'describe-wing-motion');
  await expect(button).toHaveAttribute('aria-controls', 'migration-study-observation-note');
  await expect(button).toHaveAttribute('aria-describedby', 'migration-wing-motion-note-help');
  await expect(page.locator('#migration-wing-motion-note-help')).toContainText('Primary feathers');
  await keyboardClick(page, button);
  const input = page.getByRole('textbox', { name: 'Shape and motion observation', exact: true });
  await expect(input).toBeFocused(); await expect(input).toHaveValue(before.flightStudyObservations.drafts['canada_goose:primaries']);
  await expect(input).toHaveAttribute('data-study-observation-key', 'canada_goose:primaries');
  await expect(page.locator('[data-study-observation]')).toHaveAttribute('open', '');
  await expect(page.locator('[data-study-region="primaries"]')).toHaveAttribute('aria-pressed', 'true');
  const prompt = page.locator('#migration-study-motion-evidence-prompt');
  await expect(prompt).toHaveAttribute('data-study-motion-evidence', 'path');
  await expect(input).toHaveAttribute('aria-describedby', /migration-study-motion-evidence-prompt/);
  await expect(prompt).toContainText(/step|Step/);
  expect((await saved(page)).flightPaused).toBe(false); expect(work(await saved(page))).toEqual(work(before));
  await keyboardClick(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }));
  await expect(prompt).toHaveAttribute('data-study-motion-evidence', 'path-and-pose');
  await page.getByRole('checkbox', { name: 'Show wingtip path', exact: true }).uncheck(); await frames(page);
  await expect(prompt).toHaveAttribute('data-study-motion-evidence', 'pose');
  await keyboardClick(page, page.getByRole('button', { name: 'Clear marked pose', exact: true }));
  await expect(prompt).toHaveCount(0);
  await expect(input).not.toHaveAttribute('aria-describedby', /migration-study-motion-evidence-prompt/);
  await page.getByRole('checkbox', { name: 'Show wingtip path', exact: true }).check(); await frames(page);
  await page.locator('[data-study-region="head"]').click(); await expect(prompt).toHaveCount(0);
  expect(work(await saved(page))).toEqual(work(before));
  await page.getByRole('combobox', { name: '3D migration focus species', exact: true }).selectOption('monarch'); await frames(page);
  const monarchBeforeNotes = await saved(page), latentRegion = monarchBeforeNotes.flightStudyRegion;
  expect(speciesWork(monarchBeforeNotes)).toEqual(speciesWork(before));
  expect(monarchBeforeNotes.aiExplorerText).toBe('');
  await expect(page.locator('#migration-wing-motion-note-help')).toContainText(/whole-wing/i);
  await keyboardClick(page, button); await expect(input).toBeFocused();
  await expect(input).toHaveAttribute('data-study-observation-key', 'monarch:whole-wing');
  await expect(input).toHaveValue(before.flightStudyObservations.drafts['monarch:whole-wing']);
  await expect(prompt).toHaveAttribute('data-study-motion-evidence', 'path');
  expect((await saved(page)).flightStudyRegion).toBe(latentRegion); expect(work(await saved(page))).toEqual(work(monarchBeforeNotes));
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await page.locator('.migration-flight-controls').screenshot({ path: join(report, 'desktop-describe-wing-motion-notes.png') });
  await writeFile(join(report, 'desktop-wing-motion-notes.json'), JSON.stringify({ before, after: await saved(page) }, null, 2));
});

test('Migration a pending wing-motion note focus cannot steal focus after a synchronous species or camera change', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page, observationSeed());
  const before = await saved(page);
  // Queue both real native events within one task so the pending React commit
  // genuinely races a changed context, rather than testing a stale DOM helper.
  await page.evaluate(() => {
    const button = document.querySelector('[data-study-action="describe-wing-motion"]') as HTMLButtonElement;
    button.click();
    const species = document.querySelector('[aria-label="3D migration focus species"]') as HTMLSelectElement;
    species.value = 'monarch'; species.dispatchEvent(new Event('change', { bubbles: true })); species.focus();
  }); await frames(page, 6);
  await expect(page.getByRole('combobox', { name: '3D migration focus species', exact: true })).toBeFocused();
  await expect(page.locator('#migration-study-observation-note')).not.toBeFocused();
  const afterSpeciesChange = await saved(page);
  expect(afterSpeciesChange.flightSpecies).toBe('monarch');
  expect(speciesWork(afterSpeciesChange)).toEqual(speciesWork(before));
  expect(afterSpeciesChange.aiExplorerText).toBe('');
  await page.evaluate(() => {
    (document.querySelector('[data-study-action="describe-wing-motion"]') as HTMLButtonElement).click();
    const chase = Array.from(document.querySelectorAll('button')).find(button => button.textContent?.trim() === 'Chase') as HTMLButtonElement;
    if (!chase) throw new Error('Actual Chase camera button unavailable'); chase.click(); chase.focus();
  }); await frames(page, 6);
  await expect(page.getByRole('button', { name: 'Chase', exact: true })).toBeFocused();
  await expect(page.locator('#migration-study-observation-note')).toHaveCount(0);
  expect((await saved(page)).flightCamera).toBe('chase'); expect(work(await saved(page))).toEqual(work(afterSpeciesChange));
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  await writeFile(join(report, 'desktop-pending-note-focus.json'), JSON.stringify({ before, after: await saved(page) }, null, 2));
});

for (const dark of [false, true]) test.describe('Migration phone ' + (dark ? 'dark' : 'light') + ' round12', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Hollow landmarks and native wing-motion observation activity fit a 390px touch phone and preserve existing learning work', async ({ page }) => {
    await mount(page, observationSeed()); await theme(page, dark);
    const before = await saved(page), initial = await landmarks(page); expectLandmarks(initial);
    await page.getByRole('button', { name: 'Step wingbeat', exact: true }).tap(); await frames(page);
    await page.getByRole('button', { name: 'From above', exact: true }).tap(); await frames(page);
    const stepped = await landmarks(page); expectLandmarks(stepped); expect(resources(stepped)).toEqual(resources(initial));
    const stem = 'mobile-' + (dark ? 'dark' : 'light') + '-landmarks-notes';
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-stage.png') });
    const button = page.getByRole('button', { name: 'Describe wing motion', exact: true });
    const buttonBox = await button.boundingBox(); expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
    await button.tap();
    const input = page.getByRole('textbox', { name: 'Shape and motion observation', exact: true });
    await expect(input).toBeFocused(); await expect(input).toHaveValue(before.flightStudyObservations.drafts['canada_goose:primaries']);
    await expect(page.locator('#migration-study-motion-evidence-prompt')).toHaveAttribute('data-study-motion-evidence', 'path');
    expect(work(await saved(page))).toEqual(work(before));
    await input.fill('I compared the hollow cycle landmarks with the moving outer tip from above.');
    await page.getByRole('button', { name: 'Record observation', exact: true }).tap();
    const recorded = await saved(page);
    expect(recorded.flightStudyObservations.records['canada_goose:primaries']).toMatchObject({
      note: 'I compared the hollow cycle landmarks with the moving outer tip from above.', region: 'primaries', speciesId: 'canada_goose', wingStep: 1 });
    for (const key of ['flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']) expect(recorded[key]).toEqual(before[key]);
    expect(recorded.flightStudyObservations.drafts['canada_goose:head']).toBe(before.flightStudyObservations.drafts['canada_goose:head']);
    expect(recorded.flightStudyObservations.drafts['monarch:whole-wing']).toBe(before.flightStudyObservations.drafts['monarch:whole-wing']);
    await page.addScriptTag({ content: axeSource });
    const review = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        violations: result.violations.map((item: any) => ({ id: item.id, nodes: item.nodes.map((node: any) => ({ target: node.target, summary: node.failureSummary })) })),
        errors: (window as any).__events.errors };
    });
    await page.locator('[data-study-observation]').screenshot({ path: join(report, stem + '-observation.png') });
    await page.screenshot({ path: join(report, stem + '.png'), fullPage: true });
    await writeFile(join(report, stem + '.json'), JSON.stringify({ ...review, initial, stepped, before, recorded }, null, 2));
    expect(review.viewport).toBe(390); expect(review.scrollWidth).toBeLessThanOrEqual(390); expect(review.violations).toEqual([]); expect(review.errors).toEqual([]);
  });
});
