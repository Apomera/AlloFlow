import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
const reportDir = 'reports/ecosystem-eyes-landing-field-guide';
test.describe.configure({ timeout: 300_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page); expect(errors, 'actual eye, landing and field-guide workflows have no uncaught errors').toEqual([]);
});

async function base(page: Page, preset: string, prediction = '') {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white'; });
  await page.getByRole('button', { name: preset, exact: true }).click();
  if (prediction) await page.getByLabel('Your prediction (optional)', { exact: true }).fill(prediction);
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
}

async function mount(page: Page, preset = 'Habitat restoration') {
  await base(page, preset);
  const meadow = page.locator('[data-efw-meadow]');
  if (!(await meadow.isVisible())) await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  const initialized = await page.waitForFunction(() => {
    const region = document.querySelector('[data-efw-meadow]'), hit = (window as any).__glCanvas?.('[data-efw-meadow]');
    if (hit?.rec?.scene && hit.rec.draws > 0 && region?.querySelector('canvas')?.hasAttribute('data-representative-index')) return 'ready';
    return region?.textContent?.includes('3D is unavailable on this device.') ? 'unavailable' : false;
  }, undefined, { timeout: 60_000 });
  expect(await initialized.jsonValue(), 'the actual renderer initializes and draws').toBe('ready');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config, pair = api.compare(config);
    w.__eyeLandingFrames = { baseline: api.behaviorTimeline(config, pair.baseline), experiment: api.behaviorTimeline(config, pair.experiment) };
  });
  return { meadow, canvas: meadow.locator('canvas'), stage: meadow.locator('.efw-meadow-stage'), timeline: meadow.getByLabel('Meadow timeline', { exact: true }) };
}

async function choose(page: Page, id: string, sample: any) {
  const meadow = page.locator('[data-efw-meadow]');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption(sample.branch || 'baseline');
  await meadow.getByRole('button', { name: id === 'foxes' ? /Red foxes\s[\d.]/ : /Rabbits\s[\d.]/ }).click();
  await meadow.getByLabel('Meadow timeline', { exact: true }).fill(String(sample.step));
  const representative = meadow.getByLabel('Representative animal', { exact: true });
  if (!(await representative.count())) await meadow.getByRole('button', { name: 'Inspect selected group', exact: true }).click();
  if (await representative.isEnabled()) await representative.selectOption(String(sample.index));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-representative-index', String(sample.index));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-step', String(sample.step));
}

async function rabbitRig(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const canvas = document.querySelector('[data-efw-meadow] canvas')!, index = Number(canvas.getAttribute('data-representative-index')), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animals = scene.children.filter((node: any) => node.userData.headSurface?.name === 'eco-rabbits-head-surface'), animal = animals[index], d = animal.userData;
    const step = reduced ? 0 : Number(canvas.getAttribute('data-step')), pose = w.__eyeLandingFrames[canvas.getAttribute('data-branch')!][step].rabbits[index];
    const landing = api.rabbitLanding(pose, reduced), posture = api.mammalPosture('rabbits', pose), art = api.mammalArticulation('rabbits', pose, reduced);
    function shown(part: any) { for (let node = part; node; node = node.parent) if (!node.visible) return false; return true; }
    const feet = d.paws.map((joint: any, slot: number) => {
      const sole = joint.userData.paw, m = sole.matrixWorld.elements, foot = api.footPose('rabbits', pose, joint.userData.hind, joint.userData.side);
      // The actual world transform already includes this sole's local scales.
      const actualRadius = Math.hypot(m[1], m[5], m[9]);
      const batch = scene.children.find((node: any) => node.isInstancedMesh && node.userData.parts?.includes(sole)), instance = batch.userData.parts.filter(shown).indexOf(sole), matrix = new T.Matrix4(); batch.getMatrixAt(instance, matrix);
      return { slot, hind: joint.userData.hind, side: joint.userData.side, planted: pose.footPlants[slot].planted, phase: foot, x: m[12], z: m[14], target: pose.footPlants[slot], gap: m[13] - actualRadius - api.groundHeight(m[12], m[14]), expectedLift: foot.lift * d.body.scale.x + posture.flightLift, drawn: instance >= 0 && instance < batch.count, batchError: Math.max(...matrix.elements.map((value: number, k: number) => Math.abs(value - m[k]))), matrix: m.slice() };
    });
    return { landing, posture, art, bodyY: d.body.position.y, bodyScale: d.body.scale.toArray(), feet, body: d.body.matrix.toArray(), head: d.head.matrix.toArray(), limb: Array.from(d.limbSkin.geometry.getAttribute('position').array) };
  });
}

test('rabbit landing cushions follow the actual supporting paw pair while real drawn soles retain recorded world targets and repeat on seek', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page, 'Rabbit neighbors');
  const targets = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, out: any = {};
    w.__eyeLandingFrames.baseline.forEach((frame: any, step: number) => frame.rabbits.forEach((pose: any, index: number) => {
      if (!pose.active) return; const landing = api.rabbitLanding(pose, false), sample = { branch: 'baseline', step, index, pose, landing };
      for (const pair of ['fore', 'hind']) if (landing[pair] > .05 && (!out[pair] || landing[pair] > out[pair].landing[pair])) out[pair] = sample;
    }));
    return out;
  });
  expect(targets.fore).toBeTruthy(); expect(targets.hind).toBeTruthy();
  await choose(page, 'rabbits', targets.fore); await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  for (const pair of ['fore', 'hind']) {
    const sample = targets[pair]; await choose(page, 'rabbits', sample); const actual = await rabbitRig(page);
    expect(actual.landing.dip).toBeGreaterThan(.001); expect(actual.art.landingDip).toBeCloseTo(actual.landing.dip, 12); expect(actual.art.landingFore).toBeCloseTo(actual.landing.fore, 12); expect(actual.art.landingHind).toBeCloseTo(actual.landing.hind, 12); expect(actual.bodyY).toBeCloseTo(actual.posture.drop, 12);
    const pose = sample.pose, blend = Math.max(0, Math.min(1, (pose.moving - .35) / .55)), easedBlend = blend * blend * (3 - 2 * blend), bounce = Math.abs(Math.sin(pose.distance * 28 + pose.phase)) * pose.stride * (.025 + easedBlend * .040);
    const originalDrop = -.065 * actual.posture.settle + bounce * (1 - actual.posture.settle) + actual.posture.flightLift;
    expect(actual.bodyY).toBeCloseTo(originalDrop - actual.landing.dip, 12);
    for (const foot of actual.feet) {
      expect(foot.drawn).toBe(true); expect(foot.batchError).toBeLessThan(2e-6); expect(foot.x).toBeCloseTo(foot.target.x, 10); expect(foot.z).toBeCloseTo(foot.target.z, 10); expect(Math.abs(foot.gap - foot.expectedLift - .002)).toBeLessThan(.008);
      if ((pair === 'hind') === foot.hind) expect(foot.phase.swing).toBe(false);
    }
    await meadow.getByRole('button', { name: 'Side view', exact: true }).click(); await meadow.getByLabel('Meadow camera distance', { exact: true }).fill('8'); await stage.screenshot({ path: `${reportDir}/rabbit-${pair}-landing-cushion.jpg`, type: 'jpeg', quality: 92 });
    await timeline.fill(String(Math.max(0, sample.step - 3))); await choose(page, 'rabbits', sample); expect(await rabbitRig(page)).toEqual(actual);
  }
  // Representative zero is present at both data samples. Higher indices can
  // correctly clamp to a different animal when the displayed population falls.
  await meadow.getByLabel('Representative animal', { exact: true }).selectOption('0'); await expect(canvas).toHaveAttribute('data-representative-index', '0');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose'); const frozen = await rabbitRig(page); expect(frozen.landing).toEqual({ fore: 0, hind: 0, dip: 0 }); expect(frozen.art.landingDip).toBe(0); await timeline.fill('200'); expect(await rabbitRig(page)).toEqual(frozen);
});

async function eyeRig(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene, canvas = document.querySelector('[data-efw-meadow] canvas')!;
    const index = Number(canvas.getAttribute('data-representative-index')), animals = scene.children.filter((node: any) => node.userData.headSurface?.name === `eco-${id}-head-surface`), animal = animals[index], d = animal.userData;
    const orbit = d.orbitSurface, lids = d.eyelidSkin, head = d.headSurface, raw = api.orbitalSurface(id), mount = api.eyeMount(id), positions = orbit.geometry.getAttribute('position'), normals = orbit.geometry.getAttribute('normal'), lidPositions = lids.geometry.getAttribute('position');
    function shown(part: any) { for (let node = part; node; node = node.parent) if (!node.visible) return false; return true; }
    function drawn(mesh: any) { const batch = scene.children.find((node: any) => node.isInstancedMesh && node.userData.parts?.includes(mesh)), instance = batch.userData.parts.filter(shown).indexOf(mesh), matrix = new T.Matrix4(); batch.getMatrixAt(instance, matrix); return { shown: shown(mesh), drawn: instance >= 0 && instance < batch.count, matrixError: Math.max(...matrix.elements.map((value: number, k: number) => Math.abs(value - mesh.matrixWorld.elements[k]))) }; }
    let error = 0, invalidNormals = 0, innerGap = 0, outerGap = 0, uvGap = 0, colorGap = 0;
    for (let k = 0; k < positions.count; k++) {
      for (let axis = 0; axis < 3; axis++) error = Math.max(error, Math.abs(positions.array[k * 3 + axis] - raw.positions[k * 3 + axis]));
      if (Math.abs(Math.hypot(normals.getX(k), normals.getY(k), normals.getZ(k)) - 1) > 1e-5) invalidNormals++;
    }
    const lidRim: any[] = [];
    for (let part = 0; part < 4; part++) for (let column = 0; column <= 20; column++) lidRim.push(new T.Vector3().fromBufferAttribute(lidPositions, part * 105 + 84 + column).applyMatrix4(lids.matrixWorld));
    for (const row of raw.innerRims) for (const vertex of row) { const point = new T.Vector3().fromBufferAttribute(positions, vertex).applyMatrix4(orbit.matrixWorld); innerGap = Math.max(innerGap, Math.min(...lidRim.map((target: any) => target.distanceTo(point)))); }
    const hp = head.geometry.getAttribute('position'), hu = head.geometry.getAttribute('uv'), hc = head.geometry.getAttribute('color'), ou = orbit.geometry.getAttribute('uv'), oc = orbit.geometry.getAttribute('color');
    for (const seam of raw.seams) {
      const vertex = raw.outerRims[seam.side < 0 ? 0 : 1][seam.column], indices = [0, 1, 2].map(k => head.geometry.index.getX(seam.triangle * 3 + k)), expected = new T.Vector3();
      indices.forEach((index: number, k: number) => expected.addScaledVector(new T.Vector3().fromBufferAttribute(hp, index), seam.barycentric[k]));
      const actual = new T.Vector3().fromBufferAttribute(positions, vertex).applyMatrix4(orbit.matrixWorld); expected.applyMatrix4(head.matrixWorld); outerGap = Math.max(outerGap, actual.distanceTo(expected));
      for (let axis = 0; axis < 2; axis++) uvGap = Math.max(uvGap, Math.abs(ou.array[vertex * 2 + axis] - indices.reduce((sum: number, index: number, k: number) => sum + hu.array[index * 2 + axis] * seam.barycentric[k], 0)));
      for (let axis = 0; axis < 3; axis++) colorGap = Math.max(colorGap, Math.abs(oc.array[vertex * 3 + axis] - indices.reduce((sum: number, index: number, k: number) => sum + hc.array[index * 3 + axis] * seam.barycentric[k], 0)));
    }
    const eyeChildren = d.eyeGroups.flatMap((eye: any) => eye.children), visibleEyeParts = new Set(d.eyeGroups.flatMap((eye: any) => eye.children.slice(1))), relevant = new Set([head, orbit, lids, ...eyeChildren]);
    const batches = scene.children.filter((node: any) => node.isInstancedMesh && node.userData.parts?.some((part: any) => relevant.has(part)));
    const rays = [-1, 1].map(side => {
      let visible = 0, covered = 0, blocked = 0;
      for (const dx of [-.010, 0, .010]) for (const dy of [-.006, .006]) {
        const target = new T.Vector3(mount.center[0] + Math.cos(mount.angle) * dx - Math.sin(mount.angle) * dy, mount.center[1] + Math.sin(mount.angle) * dx + Math.cos(mount.angle) * dy, side * mount.center[2]), origin = target.clone().add(new T.Vector3(0, 0, side)).applyMatrix4(d.head.matrixWorld), direction = new T.Vector3(0, 0, -side).transformDirection(d.head.matrixWorld);
        const hits = new T.Raycaster(origin, direction).intersectObjects(batches, false).map((hit: any) => ({ source: hit.object.userData.parts.filter(shown)[hit.instanceId] })).filter((hit: any) => relevant.has(hit.source));
        if (visibleEyeParts.has(hits[0]?.source)) visible++; else if (hits[0]?.source === lids) covered++; else blocked++;
      }
      return { side, visible, covered, blocked };
    });
    return { mount, vertices: positions.count, triangles: orbit.geometry.index.count / 3, error, invalidNormals, innerGap, outerGap, uvGap, colorGap, attached: orbit.parent === d.head, draw: drawn(orbit), lidsOpening: lids.userData.opening, rays, eyes: d.eyeGroups.map((eye: any) => ({ position: eye.position.toArray(), matrix: eye.matrix.toArray(), scale: eye.scale.toArray(), children: eye.children.map((mesh: any) => ({ matrix: mesh.matrix.toArray(), geometry: mesh.geometry.uuid, material: mesh.material.uuid })) })), shared: { geometries: [...new Set(animals.map((root: any) => root.userData.orbitSurface.geometry.uuid))], materials: [...new Set(animals.map((root: any) => root.userData.orbitSurface.material.uuid))] }, coatMapMatches: orbit.material.map === head.material.map, headMatrix: d.head.matrix.toArray(), orbitMatrix: orbit.matrixWorld.toArray() };
  }, id);
}

test('fitted eye sockets join both actual skull sides and fixed eyelid rims while unchanged drawn eyes remain visible open and covered closed', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page);
  const samples = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, targets: any = {};
    for (const id of ['foxes', 'rabbits']) {
      const out: any = {}; targets[id] = out;
      w.__eyeLandingFrames.baseline.forEach((frame: any, step: number) => { const pose = frame[id][0]; if (!pose.active) return; const art = api.mammalArticulation(id, pose, false), sample = { step, index: 0, pose, art }; if (!out.open || art.eyeOpen > out.open.art.eyeOpen) out.open = sample; if (!out.closed || art.eyeOpen < out.closed.art.eyeOpen) out.closed = sample; });
    }
    return targets;
  });
  await choose(page, 'foxes', samples.foxes.open); await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  for (const id of ['foxes', 'rabbits']) {
    expect(samples[id].open.art.eyeOpen).toBeGreaterThan(.99); expect(samples[id].closed.art.eyeOpen).toBeLessThan(.12);
    let opened: any = null;
    for (const state of ['open', 'closed']) {
      const sample = samples[id][state]; await choose(page, id, sample); const actual = await eyeRig(page, id);
      expect(actual).toMatchObject({ vertices: 574, triangles: 960, invalidNormals: 0, attached: true, coatMapMatches: true }); expect(actual.draw).toMatchObject({ shown: true, drawn: true }); expect(actual.draw.matrixError).toBeLessThan(2e-6); expect(actual.error).toBeLessThan(1e-7); expect(actual.innerGap).toBeLessThan(2e-7); expect(actual.outerGap).toBeLessThan(2e-7); expect(actual.uvGap).toBeLessThan(1e-7); expect(actual.colorGap).toBeLessThan(1e-7); expect(actual.shared.geometries).toHaveLength(1); expect(actual.shared.materials).toHaveLength(1); expect(actual.mount.inset).toBeGreaterThan(0);
      for (const eye of actual.eyes) { expect(eye.scale).toEqual([1, 1, 1]); expect(eye.position[0]).toBeCloseTo(actual.mount.center[0], 12); expect(eye.position[1]).toBeCloseTo(actual.mount.center[1], 12); expect(Math.abs(eye.position[2])).toBeCloseTo(actual.mount.center[2], 12); }
      for (const ray of actual.rays) { expect(ray.blocked).toBe(0); expect(state === 'open' ? ray.visible : ray.covered).toBe(6); }
      if (state === 'open') opened = actual; else { expect(actual.eyes).toEqual(opened.eyes); expect(actual.lidsOpening).toBe(0); }
      await meadow.getByRole('button', { name: 'Face view', exact: true }).click(); await meadow.getByLabel('Meadow camera distance', { exact: true }).fill('8'); await stage.screenshot({ path: `${reportDir}/${id}-fitted-eyes-${state}.jpg`, type: 'jpeg', quality: 92 });
      if (state === 'open') { await meadow.getByRole('button', { name: 'Rotate left', exact: true }).click(); await stage.screenshot({ path: `${reportDir}/${id}-fitted-eyes-oblique.jpg`, type: 'jpeg', quality: 92 }); }
    }
    await timeline.fill('0'); await choose(page, id, samples[id].open); expect(await eyeRig(page, id)).toEqual(opened);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose'); const frozen = await eyeRig(page, id); await timeline.fill('180'); expect(await eyeRig(page, id)).toEqual(frozen); await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
});

