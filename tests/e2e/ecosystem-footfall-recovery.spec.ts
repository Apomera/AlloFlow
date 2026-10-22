import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
const reportDir = process.env.ECOLOGY_REPORT_DIR || 'reports/ecosystem-footfall-recovery';
const paws = ['Left hind', 'Left fore', 'Right hind', 'Right fore'];
test.describe.configure({ timeout: 300_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page);
  expect(errors, 'the actual eyelid, recovery and footfall workflows have no uncaught errors').toEqual([]);
});

async function ready(page: Page) {
  const meadow = page.locator('[data-efw-meadow]');
  if (!(await meadow.isVisible())) await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  const result = await page.waitForFunction(() => {
    const region = document.querySelector('[data-efw-meadow]'), rec = (window as any).__glCanvas?.('[data-efw-meadow]');
    if (rec?.rec?.scene && rec.rec.draws > 0 && region?.querySelector('canvas')?.hasAttribute('data-representative-index')) return 'ready';
    return region?.textContent?.includes('3D is unavailable on this device.') ? 'unavailable' : false;
  }, undefined, { timeout: 45_000 });
  expect(await result.jsonValue(), 'the real tool creates its renderer and draws before inspection').toBe('ready');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config, comparison = api.compare(config);
    w.__footfallRecoveryFrames = { baseline: api.behaviorTimeline(config, comparison.baseline), experiment: api.behaviorTimeline(config, comparison.experiment) };
  });
  return { meadow, canvas: meadow.locator('canvas'), stage: meadow.locator('.efw-meadow-stage'), timeline: meadow.getByLabel('Meadow timeline', { exact: true }), study: meadow.locator('[data-efw-movement-study]') };
}

async function mount(page: Page, preset = 'Rabbit neighbors', prediction = '') {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white';
    // Retain the actual camera constructed by the tool; its state is never replaced.
    const w = window as any, Camera = w.THREE.PerspectiveCamera;
    w.THREE.PerspectiveCamera = new Proxy(Camera, { construct(target, args, newTarget) { const camera = Reflect.construct(target, args, newTarget); w.__footfallRecoveryCamera = camera; return camera; } });
  });
  await page.getByRole('button', { name: preset, exact: true }).click();
  if (prediction) await page.getByLabel('Your prediction (optional)', { exact: true }).fill(prediction);
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  return ready(page);
}

async function choose(page: Page, id: string, sample: any) {
  const meadow = page.locator('[data-efw-meadow]');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption(sample.branch || 'baseline');
  await meadow.getByRole('button', { name: id === 'foxes' ? /Red foxes\s[\d.]/ : /Rabbits\s[\d.]/ }).click();
  await meadow.getByLabel('Meadow timeline', { exact: true }).fill(String(sample.step));
  const representative = meadow.getByLabel('Representative animal', { exact: true });
  if (!(await representative.count())) await meadow.getByRole('button', { name: 'Inspect selected group', exact: true }).click();
  if (await representative.isEnabled()) await representative.selectOption(String(sample.index));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-selected-species', id);
  await expect(meadow.locator('canvas')).toHaveAttribute('data-representative-index', String(sample.index));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-step', String(sample.step));
}

async function anatomy(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const animals = scene.children.filter((a: any) => a.userData.neckSurface?.name === `eco-${id}-neck-surface`), animal = animals.find((a: any) => a.visible), d = animal.userData;
    const neck = d.neckSurface, lids = d.eyelidSkin, raw = api.mammalSurface(id, 'neck'), fitted = api.neckFit(id, d.head.matrix.elements, raw.positions), skin = api.mammalEyelids(id, lids.userData.opening);
    const neckHome = id === 'foxes' ? [.265, .51, 0] : [.178, .365, 0], headHome = id === 'foxes' ? [.24, .58, 0] : [.24, .4, 0];
    const anchor = id === 'foxes' ? .18 : .11, attach = id === 'foxes' ? .34 : .23;
    function readGeometry(mesh: any, expected: number[]) {
      const positions = mesh.geometry.getAttribute('position'), normals = mesh.geometry.getAttribute('normal'); let error = 0, invalidNormals = 0, hash = 2166136261;
      const words = new Uint32Array(positions.array.buffer, positions.array.byteOffset, positions.array.length);
      for (let k = 0; k < positions.array.length; k++) { error = Math.max(error, Math.abs(positions.array[k] - expected[k])); hash = Math.imul(hash ^ words[k], 16777619); }
      for (let k = 0; k < normals.count; k++) { const length = Math.hypot(normals.getX(k), normals.getY(k), normals.getZ(k)); if (!Number.isFinite(length) || Math.abs(length - 1) > 1e-4) invalidNormals++; }
      return { vertices: positions.count, triangles: mesh.geometry.index.count / 3, error, invalidNormals, hash: hash >>> 0 };
    }
    const positions = neck.geometry.getAttribute('position'), normals = neck.geometry.getAttribute('normal'); let shoulderError = 0, headError = 0, seamError = 0;
    for (let k = 0; k < positions.count; k++) {
      const rest = new T.Vector3(...raw.positions.slice(k * 3, k * 3 + 3)), actual = new T.Vector3(positions.getX(k) + neckHome[0], positions.getY(k) + neckHome[1], positions.getZ(k));
      if (rest.x <= anchor) shoulderError = Math.max(shoulderError, actual.distanceTo(rest));
      if (rest.x >= attach) headError = Math.max(headError, actual.distanceTo(rest.sub(new T.Vector3(...headHome)).applyMatrix4(d.head.matrix)));
    }
    for (let ring = 0; ring <= 32; ring++) {
      const first = ring * 25, last = first + 24;
      seamError = Math.max(seamError, Math.hypot(positions.getX(first) - positions.getX(last), positions.getY(first) - positions.getY(last), positions.getZ(first) - positions.getZ(last)), Math.hypot(normals.getX(first) - normals.getX(last), normals.getY(first) - normals.getY(last), normals.getZ(first) - normals.getZ(last)));
    }
    const rayResults = [-1, 1].map(side => {
      const mount = api.eyeMount(id), center = mount.center, angle = mount.angle;
      const eyeMeshes = new Set(d.eyeGroups.flatMap((eye: any) => eye.children)), relevant = new Set([lids, ...eyeMeshes]);
      const batches = scene.children.filter((node: any) => node.isInstancedMesh && node.userData.parts?.some((part: any) => relevant.has(part)));
      function shown(part: any) { for (let node = part; node; node = node.parent) if (!node.visible) return false; return true; }
      let covered = 0, eyeVisible = 0;
      for (const dx of [-.010, 0, .010]) for (const dy of [-.006, .006]) {
        const target = new T.Vector3(center[0] + Math.cos(angle) * dx - Math.sin(angle) * dy, center[1] + Math.sin(angle) * dx + Math.cos(angle) * dy, side * center[2]);
        const origin = target.clone().add(new T.Vector3(0, 0, side)).applyMatrix4(d.head.matrixWorld), direction = new T.Vector3(0, 0, -side).transformDirection(d.head.matrixWorld);
        // The tool renders these layer-1 control meshes through layer-0 batches.
        // Raycast the actual drawn instance buffers, then resolve each instance
        // back to its visible source part using the renderer's ordering.
        const hits = new T.Raycaster(origin, direction).intersectObjects(batches, false).map((hit: any) => ({ hit, source: hit.object.userData.parts.filter(shown)[hit.instanceId] })).filter((entry: any) => relevant.has(entry.source));
        if (hits[0]?.source === lids) covered++; else if (hits.length) eyeVisible++;
      }
      return { side, covered, eyeVisible };
    });
    function projected(meshes: any[]) {
      const camera = w.__footfallRecoveryCamera, bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
      for (const mesh of meshes) {
        const points = mesh.geometry.getAttribute('position');
        for (let k = 0; k < points.count; k++) { const p = new T.Vector3(points.getX(k), points.getY(k), points.getZ(k)).applyMatrix4(mesh.matrixWorld).project(camera); bounds.minX = Math.min(bounds.minX, p.x); bounds.maxX = Math.max(bounds.maxX, p.x); bounds.minY = Math.min(bounds.minY, p.y); bounds.maxY = Math.max(bounds.maxY, p.y); bounds.minZ = Math.min(bounds.minZ, p.z); bounds.maxZ = Math.max(bounds.maxZ, p.z); }
      }
      return bounds;
    }
    const soleMeshes = (id === 'foxes' ? d.legs : d.paws).map((leg: any) => id === 'foxes' ? leg.userData.rig.paw.children.find((part: any) => part.isMesh) : leg.userData.paw);
    return {
      neck: { ...readGeometry(neck, fitted), shoulderError, headError, seamError, control: d.mammalParts.neck.matrix.toArray(), headMatrix: d.head.matrix.toArray(), private: new Set(animals.map((a: any) => a.userData.neckSurface.geometry.uuid)).size === animals.length },
      lids: { ...readGeometry(lids, skin.positions), opening: lids.userData.opening, attached: lids.parent === d.head, rayResults },
      eyes: d.eyeGroups.map((eye: any) => ({ scale: eye.scale.toArray(), matrices: [eye.matrix.toArray(), ...eye.children.map((mesh: any) => mesh.matrix.toArray())] })),
      projected: { head: projected([d.headSurface, lids, ...d.ears.flatMap((ear: any) => ear.children.filter((part: any) => part.isMesh))]), feet: projected(soleMeshes) }
    };
  }, id);
}

test('recorded blinks close fitted eyelids over unchanged eyeballs while each continuous neck follows the actual head and keeps its shoulder seam fixed', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page, 'Habitat restoration');
  const targets = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, targets: any = {};
    for (const id of ['foxes', 'rabbits']) {
      const choice: any = {}; targets[id] = choice;
      for (const branch of ['baseline', 'experiment']) w.__footfallRecoveryFrames[branch].forEach((frame: any, step: number) => frame[id].forEach((pose: any, index: number) => {
        if (!pose.active) return;
        const art = api.mammalArticulation(id, pose, false), sample = { branch, step, index, pose, art };
        if (index === 0 && (!choice.closed || art.eyeOpen < choice.closed.art.eyeOpen)) choice.closed = sample;
        if (index === 0 && (!choice.open || art.eyeOpen > choice.open.art.eyeOpen)) choice.open = sample;
        const deformation = Math.abs(art.headPitch) + Math.abs(art.headYaw) + art.headDrop;
        if (!choice.neck || deformation > choice.neck.deformation) choice.neck = { ...sample, deformation };
      }));
    }
    return targets;
  });
  await choose(page, 'foxes', targets.foxes.open);
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  for (const id of ['foxes', 'rabbits']) {
    const states: any = {};
    for (const label of ['open', 'closed', 'neck']) {
      await choose(page, id, targets[id][label]);
      await meadow.getByRole('button', { name: label === 'neck' ? 'Side view' : 'Face view', exact: true }).click();
      await meadow.getByLabel('Meadow camera distance', { exact: true }).fill('8');
      const actual = await anatomy(page, id); states[label] = actual;
      expect(actual.neck).toMatchObject({ vertices: 825, triangles: 1536, invalidNormals: 0, private: true });
      expect(actual.neck.error).toBeLessThan(1e-6); expect(actual.neck.shoulderError).toBeLessThan(1e-6); expect(actual.neck.headError).toBeLessThan(1e-6); expect(actual.neck.seamError).toBeLessThan(1e-6);
      expect(actual.lids).toMatchObject({ vertices: 420, triangles: 640, invalidNormals: 0, attached: true }); expect(actual.lids.error).toBeLessThan(1e-7);
      expect(actual.lids.opening).toBeCloseTo(Math.max(0, Math.min(1, (targets[id][label].art.eyeOpen - .12) / .88)), 10);
      for (const eye of actual.eyes) expect(eye.scale).toEqual([1, 1, 1]);
      for (const bounds of Object.values(actual.projected)) { expect(bounds.minX).toBeGreaterThan(-1); expect(bounds.maxX).toBeLessThan(1); expect(bounds.minY).toBeGreaterThan(-1); expect(bounds.maxY).toBeLessThan(1); expect(bounds.minZ).toBeGreaterThan(-1); expect(bounds.maxZ).toBeLessThan(1); }
      await test.info().attach(`${id}-${label}-projected-bounds`, { body: JSON.stringify(actual.projected), contentType: 'application/json' });
      await stage.screenshot({ path: `${reportDir}/${id}-${label}.jpg`, type: 'jpeg', quality: 92 });
    }
    expect(states.open.lids.opening).toBeGreaterThan(.98); expect(states.closed.lids.opening).toBe(0);
    expect(states.closed.eyes).toEqual(states.open.eyes);
    for (const rays of states.open.lids.rayResults) { expect(rays.covered).toBe(0); expect(rays.eyeVisible).toBe(6); }
    for (const rays of states.closed.lids.rayResults) expect(rays.covered).toBe(6);
    expect(states.closed.lids.hash).not.toBe(states.open.lids.hash);
    await choose(page, id, targets[id].closed); await meadow.getByRole('button', { name: 'Face view', exact: true }).click(); expect(await anatomy(page, id)).toEqual(states.closed);
    await choose(page, id, { branch: 'baseline', step: 0, index: 0 });
    await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose'); const frozen = await anatomy(page, id);
    expect(frozen.lids.opening).toBe(1);
    await timeline.fill('160'); expect(await anatomy(page, id)).toEqual(frozen);
    await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  const distance = meadow.getByLabel('Meadow camera distance', { exact: true });
  await distance.fill('10'); await canvas.hover(); await page.keyboard.down('Control'); await page.mouse.wheel(0, -600); await page.keyboard.up('Control');
  await expect(meadow.getByLabel('Meadow camera distance', { exact: true })).toHaveValue('8');
  await distance.focus(); await distance.press('End'); await expect(distance).toHaveValue('30'); await distance.press('Home'); await expect(distance).toHaveValue('8');
  await meadow.getByRole('button', { name: 'Reset camera', exact: true }).click(); await expect(distance).toHaveValue('19');
});

test('a rabbit brakes before four still checks of one fixed direct-threat point and refuge responses take priority over recovery', async ({ page }) => {
  let { meadow, canvas, stage, timeline } = await mount(page);
  const evidence = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, frames = w.__footfallRecoveryFrames.baseline; let best: any = null;
    frames.forEach((frame: any, step: number) => frame.rabbits.forEach((pose: any, index: number) => {
      if (pose.recoveryCue?.age !== 0) return;
      const samples = [];
      for (let k = step; k < Math.min(step + 12, frames.length); k++) {
        const next = frames[k].rabbits[index]; if (!next.recoveryCue) break;
        samples.push({ step: k, pose: next, previous: frames[k - 1].rabbits[index], why: api.explainBehavior('rabbits', next), interaction: api.interaction(frames[k], 'rabbits', index) });
      }
      if (samples.filter((sample: any) => sample.pose.recoveryCue.stage === 'still').length === 4 && (!best || samples.length > best.samples.length)) {
        const cue = pose.recoveryCue;
        best = { branch: 'baseline', index, samples, source: frames[cue.sourceStep - 1][cue.id][cue.index], sourceRabbit: frames[cue.sourceStep - 1].rabbits[index], after: frames[step + samples.length].rabbits[index] };
      }
    }));
    return best;
  });
  expect(evidence, 'the real default recording contains braking followed by all four still samples').toBeTruthy();
  const samples = evidence.samples, cue = samples[0].pose.recoveryCue, still = samples.filter((sample: any) => sample.pose.recoveryCue.stage === 'still');
  expect(samples.length).toBeLessThanOrEqual(12); expect(samples[0].previous.state).toBe('Retreating');
  expect(cue.x).toBe(evidence.source.x); expect(cue.z).toBe(evidence.source.z); expect(evidence.source.active).toBe(true);
  expect(still).toHaveLength(4);
  for (const sample of samples) {
    const point = sample.pose.recoveryCue;
    expect(sample.pose.state).toBe('Checking after retreat'); expect(point.x).toBe(cue.x); expect(point.z).toBe(cue.z); expect(point.sourceStep).toBe(cue.sourceStep); expect(point.duration).toBe(12); expect(point.stillDuration).toBe(4);
    expect(sample.interaction).toBeNull(); expect(sample.why.cue).toBeNull();
    expect(sample.pose.speed).toBeCloseTo(Math.max(0, sample.previous.speed - .15), 10);
    if (point.stage === 'still') { expect(sample.pose.speed).toBe(0); expect(sample.pose.x).toBe(still[0].pose.x); expect(sample.pose.z).toBe(still[0].pose.z); }
  }
  expect(still.map((sample: any) => sample.pose.recoveryCue.stillAge)).toEqual([0, 1, 2, 3]);
  expect(evidence.after.recoveryCue).toBeNull(); expect(evidence.after.lastDirectThreat).toBeNull();
  await choose(page, 'rabbits', { step: samples[0].step, index: evidence.index });
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  const why = meadow.locator('[data-efw-action-reason]'); await why.locator('summary').click();
  for (const sample of samples) {
    await timeline.fill(String(sample.step)); await expect(canvas).toHaveAttribute('data-recovery-cue', JSON.stringify(sample.pose.recoveryCue));
    await expect(canvas).toHaveAttribute('data-interaction-connector', 'false');
    await expect(why.locator('[data-efw-action-explanation]')).toHaveText(sample.why.text);
  }
  await stage.screenshot({ path: `${reportDir}/rabbit-still-recovery.jpg`, type: 'jpeg', quality: 92 });
  await timeline.fill(String(still[0].step)); const paused = await anatomy(page, 'rabbits');
  await timeline.fill(String(samples[0].step)); await timeline.fill(String(still[0].step)); expect(await anatomy(page, 'rabbits')).toEqual(paused);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(canvas).toHaveAttribute('data-recovery-cue', '');
  await expect(canvas).toHaveAttribute('data-last-direct-threat', ''); await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByLabel('Starting refuge cover', { exact: true }).fill('80');
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  ({ meadow, canvas, stage, timeline } = await ready(page));
  const priority = await page.evaluate(() => {
    const frames = (window as any).__footfallRecoveryFrames.baseline;
    return { recoveries: frames.flatMap((frame: any) => frame.rabbits).filter((pose: any) => pose.active && pose.recoveryCue).length, refuges: frames.flatMap((frame: any) => frame.rabbits).filter((pose: any) => pose.active && pose.refugeCue).length };
  });
  expect(priority.recoveries).toBe(0); expect(priority.refuges).toBeGreaterThan(0);
});

async function actualFeet(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const animal = scene.children.find((a: any) => a.visible && a.userData.neckSurface?.name === `eco-${id}-neck-surface`), d = animal.userData;
    return (id === 'foxes' ? d.legs : d.paws).map((leg: any) => {
      const sole = id === 'foxes' ? leg.userData.rig.paw.children.find((m: any) => m.isMesh) : leg.userData.paw, position = new T.Vector3().setFromMatrixPosition(sole.matrixWorld), m = sole.matrixWorld.elements;
      return { x: position.x, z: position.z, gap: position.y - Math.hypot(m[1], m[5], m[9]) - api.groundHeight(position.x, position.z) };
    });
  }, id);
}

async function setGrid(page: Page, grid: boolean[][]) {
  const strip = page.locator('[data-efw-footfall-lab]');
  for (let k = 0; k < 3; k++) for (let j = 0; j < 4; j++) await strip.getByLabel(`Checkpoint ${k + 1} ${paws[j]} contact`, { exact: true }).selectOption(grid[k][j] ? 'contact' : 'clear');
}

test('twelve explicit contact codes require all three actual inspections and preserve first/revised footfall evidence through export, reopening, keyboard and reduced mobile use', async ({ page }) => {
  const ecologicalPrediction = 'The footfall strip describes three illustrated poses and cannot establish a wildlife gait time budget or population change.';
  const movementReflection = 'My original snapshot order is kept separately from the support prediction.';
  const { meadow, canvas, timeline, study } = await mount(page, 'Habitat restoration', ecologicalPrediction);
  const run = await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run));
  let rabbit: any = null, savedJSON = '';
  for (const id of ['foxes', 'rabbits']) {
    const expected = await page.evaluate(id => {
      const w = window as any, api = w.StemLab.ecosystemFoodWeb, frames = w.__footfallRecoveryFrames.baseline, movement = api.motionStudy(frames, id, 0);
      return { movement, plan: api.footfallPlan(frames, movement) };
    }, id);
    expect(expected.plan, `${id} has a complete real four-paw record at the original movement checkpoints`).toBeTruthy();
    await study.getByRole('button', { name: id === 'foxes' ? 'Study a fox movement' : 'Study a rabbit movement', exact: true }).click();
    const sequence = study.locator('[data-efw-motion-sequence]');
    await expect(sequence.locator('[data-efw-footfall-lab]')).toHaveCount(0);
    for (const order of [[1, 0, 2], [0, 1, 2]]) {
      for (let k = 0; k < 3; k++) await sequence.getByLabel(['First', 'Middle', 'Last'][k] + ' movement snapshot', { exact: true }).selectOption(String(order[k]));
      await sequence.getByRole('button', { name: 'Check my sequence', exact: true }).click();
    }
    const strip = sequence.locator('[data-efw-footfall-lab]');
    await expect(strip).not.toHaveAttribute('open', ''); await strip.locator('summary').focus(); await page.keyboard.press('Enter');
    await expect(strip).toHaveAttribute('open', '');
    const codes = strip.locator('[data-efw-footfall-checkpoint] select'); await expect(codes).toHaveCount(12);
    for (const code of await codes.all()) await expect(code).toHaveValue('');
    const grid = expected.plan.samples.map((sample: any) => sample.feet.map((foot: any) => foot.planted)), firstGrid = grid.map((column: boolean[]) => column.map(value => !value));
    const soleEvidence: any[] = [];
    const prediction = expected.plan.samples.some((sample: any) => sample.supportCount === 0) ? 'clear' : 'supported';
    await strip.getByLabel('Footfall support prediction', { exact: true }).selectOption(prediction === 'clear' ? 'supported' : 'clear');
    await setGrid(page, firstGrid); await expect(strip.getByRole('button', { name: 'Check my footfall strip', exact: true })).toBeDisabled();
    for (let k = 0; k < 3; k++) {
      const inspect = strip.getByRole('button', { name: `Inspect footfall checkpoint ${k + 1}`, exact: true }); await inspect.focus(); await page.keyboard.press('Enter');
      await expect(timeline).toHaveValue(String(expected.plan.samples[k].step));
      await expect(canvas).toHaveAttribute('data-representative-index', String(expected.movement.index));
      const feet = await actualFeet(page, id);
      soleEvidence.push({ checkpoint: k, step: expected.plan.samples[k].step, feet: feet.map((foot: any, j: number) => ({ ...foot, planted: grid[k][j], id: paws[j] })) });
      for (let j = 0; j < 4; j++) if (grid[k][j]) { expect(Math.abs(feet[j].gap - .002)).toBeLessThan(.008); expect(Math.hypot(feet[j].x - expected.plan.samples[k].feet[j].x, feet[j].z - expected.plan.samples[k].feet[j].z)).toBeLessThan(.01); }
      else expect(feet[j].gap, `${id} checkpoint ${k + 1} ${paws[j]} is marked clear and must be above the actual terrain`).toBeGreaterThan(0);
      const dockReturn = meadow.locator('[data-efw-observation-dock]').getByRole('button', { name: `Code footfall checkpoint ${k + 1}`, exact: true });
      await expect(dockReturn).toBeFocused(); await dockReturn.press('Enter');
      await expect(strip.getByLabel(`Checkpoint ${k + 1} Left hind contact`, { exact: true })).toBeFocused();
      if (k < 2) await expect(strip.getByRole('button', { name: 'Check my footfall strip', exact: true })).toBeDisabled();
    }
    await test.info().attach(`${id}-recorded-sole-gaps`, { body: JSON.stringify(soleEvidence), contentType: 'application/json' });
    await strip.getByRole('button', { name: 'Check my footfall strip', exact: true }).click();
    await expect(strip.locator('[data-efw-footfall-feedback]')).toContainText('0 matching and 12 differing definite marks; 0 uncertain.');
    await setGrid(page, grid); await expect(strip.locator('[data-efw-footfall-feedback]')).toHaveCount(0);
    await strip.getByLabel('Footfall support prediction', { exact: true }).selectOption(prediction);
    await strip.getByRole('button', { name: 'Check revised footfall strip', exact: true }).click();
    await expect(strip.locator('[data-efw-footfall-feedback]')).toContainText('12 matching and 0 differing definite marks; 0 uncertain.');
    await expect(strip.locator('[data-efw-footfall-feedback]')).toContainText('First submission: 0 matching and 12 differing definite marks; 0 uncertain.');
    await expect(strip.locator('[data-efw-footfall-feedback]')).toContainText('Your current support prediction matches these checkpoints.');
    await expect(strip).toContainText('Three sparse checkpoints do not measure the duration of contact or prove continuous flight between samples.');
    await expect(strip.locator('[data-efw-footfall-map] circle')).toHaveCount(expected.plan.samples[2].supportCount + 1);
    const reflection = 'I revised each contact flag from the recorded poses. An all-clear checkpoint does not prove continuous flight between these sparse samples.';
    await strip.getByLabel('Footfall evidence reflection', { exact: true }).fill(reflection);
    await sequence.getByLabel('Movement evidence reflection', { exact: true }).fill(movementReflection);
    await sequence.getByRole('button', { name: 'Save movement observation', exact: true }).click();
    const note = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook.at(-1));
    expect(note.movement.footfall).toMatchObject({ version: 2, branch: 'baseline', species: id, index: expected.movement.index, studyId: expected.movement.id, samples: expected.plan.samples, grid, firstGrid, prediction, firstPrediction: prediction === 'clear' ? 'supported' : 'clear', reflection });
    expect(JSON.parse(note.movement.footfall.sampleKey)).toEqual({ branch: 'baseline', species: id, index: expected.movement.index, studyId: expected.movement.id, samples: expected.plan.samples });
    expect(note.movement.order).toEqual([1, 0, 2]); expect(note.movement.latestOrder).toEqual([0, 1, 2]); expect(note.movement.reflection).toBe(movementReflection); expect(note.movement.runPrediction).toBe(ecologicalPrediction);
    await strip.screenshot({ path: `${reportDir}/${id}-footfall-strip.jpg`, type: 'jpeg', quality: 92 });
    if (id === 'rabbits') { rabbit = { ...expected, note }; savedJSON = JSON.stringify(note); }
  }
  const strip = study.locator('[data-efw-footfall-lab]');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(strip.locator('[data-efw-footfall-reduced]')).toBeVisible();
  await expect(strip.locator('[data-efw-footfall-description]')).toHaveCount(3);
  const frozen = await canvas.getAttribute('data-representative-position');
  for (let k = 0; k < 3; k++) await strip.getByRole('button', { name: `Inspect footfall checkpoint ${k + 1}`, exact: true }).click();
  await expect(canvas).toHaveAttribute('data-representative-position', frozen!);
  await page.setViewportSize({ width: 390, height: 844 });
  await strip.screenshot({ path: `${reportDir}/mobile-reduced-footfall-strip.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const text = await page.evaluate(() => (window as any).StemLab.ecosystemFoodWeb.notebookText((window as any).__toolData.ecosystem.foodWeb.notebook));
  expect(text).toContain(rabbit.note.movement.footfall.reflection); expect(text).toContain('First contact grid:'); expect(text).toContain('Latest contact grid:');
  const exported = text.split('\n').filter((line: string) => line.startsWith('Frozen footfall evidence (JSON): ')).map((line: string) => JSON.parse(line.slice('Frozen footfall evidence (JSON): '.length)));
  const savedFootfalls = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook.map((note: any) => note.movement.footfall));
  expect(exported).toEqual(savedFootfalls);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await timeline.fill('0'); await meadow.getByLabel('Representative animal', { exact: true }).selectOption('1');
  await expect(study.locator('[data-efw-footfall-lab]')).toHaveCount(0);
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('experiment');
  await page.locator('[data-efw-notebook]').getByRole('button', { name: 'Reopen observation 2', exact: true }).click();
  await expect(meadow.getByLabel('Meadow scene data', { exact: true })).toHaveValue('baseline');
  await expect(canvas).toHaveAttribute('data-selected-species', 'rabbits'); await expect(canvas).toHaveAttribute('data-representative-index', String(rabbit.movement.index));
  await expect(strip).toHaveAttribute('open', '');
  await expect(strip.locator('[data-efw-footfall-feedback]')).toContainText('12 matching and 0 differing definite marks; 0 uncertain.');
  await expect(strip.locator('[data-efw-footfall-feedback]')).toContainText('First submission: 0 matching and 12 differing definite marks; 0 uncertain.');
  await expect(strip.getByLabel('Footfall evidence reflection', { exact: true })).toHaveValue(rabbit.note.movement.footfall.reflection);
  const reopenedSequence = study.locator('[data-efw-motion-sequence]');
  for (let k = 0; k < 3; k++) await expect(reopenedSequence.getByLabel(['First', 'Middle', 'Last'][k] + ' movement snapshot', { exact: true })).toHaveValue(String(k));
  const letter = (k: number) => String.fromCharCode(65 + rabbit.movement.layout.indexOf(k));
  await expect(reopenedSequence.locator('[data-efw-motion-feedback]')).toContainText(`Your first submitted order: Snapshot ${letter(1)} → Snapshot ${letter(0)} → Snapshot ${letter(2)}.`);
  await expect(reopenedSequence.getByLabel('Movement evidence reflection', { exact: true })).toHaveValue(movementReflection);
  await expect(page.getByLabel('Your prediction (optional)', { exact: true })).toHaveValue(ecologicalPrediction);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[1]))).toBe(savedJSON);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(run);
  const revisedReflection = 'The original prediction remains saved; this added reflection describes only the three inspected checkpoints.';
  await reopenedSequence.getByLabel('Movement evidence reflection', { exact: true }).fill(revisedReflection);
  await reopenedSequence.getByRole('button', { name: 'Save movement observation', exact: true }).click();
  const resaved = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[2]);
  expect(resaved.movement.reflection).toBe(revisedReflection); expect(resaved.movement.latestOrder).toEqual([0, 1, 2]); expect(resaved.movement.order).toEqual([1, 0, 2]);
  expect(resaved.movement.footfall).toEqual(rabbit.note.movement.footfall);
  expect(resaved.explanation.split('Recorded order:').length - 1).toBe(1); expect(resaved.explanation.split(revisedReflection).length - 1).toBe(1); expect(resaved.explanation).not.toContain(movementReflection);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[1]))).toBe(savedJSON);
});
