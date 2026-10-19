import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
const reportDir = 'reports/ecosystem-pinna-vigilance';
test.describe.configure({ timeout: 300_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page); expect(errors, 'actual pinna, vigilance and headline workflows have no uncaught errors').toEqual([]);
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
    w.__pinnaVigilanceFrames = { baseline: api.behaviorTimeline(config, pair.baseline), experiment: api.behaviorTimeline(config, pair.experiment) };
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

async function skullRig(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const canvas = document.querySelector('[data-efw-meadow] canvas')!, index = Number(canvas.getAttribute('data-representative-index'));
    const animals = scene.children.filter((node: any) => node.userData.headSurface?.name === `eco-${id}-head-surface`), animal = animals[index], d = animal.userData;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, step = reduced ? 0 : Number(canvas.getAttribute('data-step'));
    const pose = w.__pinnaVigilanceFrames[canvas.getAttribute('data-branch')!][step][id][index], art = api.mammalArticulation(id, pose, reduced);
    function shown(part: any) { for (let node = part; node; node = node.parent) if (!node.visible) return false; return true; }
    const ears = d.ears.map((ear: any) => {
      const mesh = ear.children.find((part: any) => part.isMesh), raw = api.mammalSurface(id, 'ear'), positions = mesh.geometry.getAttribute('position'), normals = mesh.geometry.getAttribute('normal');
      let positionError = 0, normalError = 0, invalidNormals = 0, hash = 2166136261;
      for (let k = 0; k < positions.count; k++) {
        for (let axis = 0; axis < 3; axis++) { const at = k * 3 + axis; positionError = Math.max(positionError, Math.abs(positions.array[at] - raw.positions[at])); normalError = Math.max(normalError, Math.abs(normals.array[at] - raw.normals[at])); hash = Math.imul(hash ^ new Uint32Array(positions.array.buffer, positions.array.byteOffset, positions.array.length)[at], 16777619); }
        if (Math.abs(Math.hypot(normals.getX(k), normals.getY(k), normals.getZ(k)) - 1) > 1e-5) invalidNormals++;
      }
      const batch = scene.children.find((node: any) => node.isInstancedMesh && node.userData.parts?.includes(mesh)), instance = batch.userData.parts.filter(shown).indexOf(mesh), actual = new T.Matrix4(); batch.getMatrixAt(instance, actual);
      const middle = raw.rings / 2 * (raw.sides + 1) + raw.sides / 2, rim = raw.rings / 2 * (raw.sides + 1), layer = raw.faceLayer;
      const front = new T.Vector3().fromBufferAttribute(positions, middle).applyMatrix4(mesh.matrixWorld), back = new T.Vector3().fromBufferAttribute(positions, middle + layer).applyMatrix4(mesh.matrixWorld);
      return { attached: ear.parent === d.head, shown: shown(mesh), drawn: instance >= 0 && instance < batch.count, geometry: mesh.geometry.uuid, vertices: positions.count, triangles: mesh.geometry.index.count / 3, positionError, normalError, invalidNormals, hash: hash >>> 0, scale: mesh.scale.toArray(), angles: [ear.rotation.y, ear.rotation.z], world: mesh.matrixWorld.toArray(), batchError: Math.max(...actual.elements.map((value: number, k: number) => Math.abs(value - mesh.matrixWorld.elements[k]))), vertexColors: mesh.material.vertexColors, colors: mesh.geometry.getAttribute('color').count, map: !!mesh.material.map, thickness: front.distanceTo(back), normalizedThickness: positions.getX(middle) - positions.getX(middle + layer), cup: positions.getX(rim) - positions.getX(middle), metadata: mesh.geometry.userData.ecoPinnaSurface };
    });
    const allPinnae = animals.flatMap((root: any) => root.userData.ears.map((ear: any) => ear.children.find((part: any) => part.isMesh)));
    return { art, ears, shared: { geometries: [...new Set(allPinnae.map((part: any) => part.geometry.uuid))], materials: [...new Set(allPinnae.map((part: any) => part.material.uuid))], representatives: animals.length }, head: d.head.matrix.toArray(), headAngles: [d.head.rotation.x, d.head.rotation.y, d.head.rotation.z], headPosition: d.head.position.toArray(), neck: Array.from(d.neckSurface.geometry.getAttribute('position').array), feet: (id === 'foxes' ? d.legs : d.paws).map((leg: any) => (id === 'foxes' ? leg.userData.rig.paw : leg.userData.paw).matrixWorld.toArray()) };
  }, id);
}

test('rounded volumetric pinnae remain real shared drawn geometry attached to the moving skull and reproduce exactly after seeking', async ({ page }) => {
  const { meadow, stage, timeline } = await mount(page);
  const samples = await page.evaluate(() => {
    const w = window as any, samples: any = {};
    for (const id of ['foxes', 'rabbits']) {
      let best: any = null;
      w.__pinnaVigilanceFrames.baseline.forEach((frame: any, step: number) => { const pose = frame[id][0]; if (pose.active && (!best || Math.abs(pose.earLeft - pose.earRight) > Math.abs(best.pose.earLeft - best.pose.earRight))) best = { branch: 'baseline', step, index: 0, pose }; });
      samples[id] = best;
    }
    return samples;
  });
  await choose(page, 'foxes', samples.foxes); await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  const hashes = [];
  for (const id of ['foxes', 'rabbits']) {
    await choose(page, id, samples[id]); const actual = await skullRig(page, id);
    expect(actual.ears).toHaveLength(2); expect(new Set(actual.ears.map((ear: any) => ear.geometry)).size).toBe(1);
    expect(actual.shared.representatives).toBe(16); expect(actual.shared.geometries).toHaveLength(1); expect(actual.shared.materials).toHaveLength(1);
    for (const ear of actual.ears) {
      expect(ear).toMatchObject({ attached: true, shown: true, drawn: true, invalidNormals: 0, vertexColors: true, map: true });
      expect(ear.vertices).toBe(1314); expect(ear.triangles).toBe(2624); expect(ear.positionError).toBeLessThan(1e-7); expect(ear.normalError).toBeLessThan(1e-7); expect(ear.batchError).toBeLessThan(2e-6); expect(ear.colors).toBe(ear.vertices);
      expect(ear.scale).toEqual(id === 'foxes' ? [.12, .215, .215] : [.13, .355, .18]);
      expect(ear.normalizedThickness).toBeCloseTo(.105, 7); expect(ear.cup).toBeCloseTo(id === 'foxes' ? .33 : .37, 7); expect(ear.thickness).toBeGreaterThan(.01); expect(ear.metadata).toMatchObject({ bevelBands: 4, faceLayer: 525, rimVertices: 88 });
    }
    expect(actual.ears[0].angles).toEqual([actual.art.earLeft, actual.art.earTilt]); expect(actual.ears[1].angles).toEqual([actual.art.earRight, actual.art.earTilt]); hashes.push(actual.ears[0].hash);
    await meadow.getByRole('button', { name: 'Face view', exact: true }).click(); await meadow.getByLabel('Meadow camera distance', { exact: true }).fill('8'); await stage.screenshot({ path: `${reportDir}/${id}-rounded-pinna-face.jpg`, type: 'jpeg', quality: 92 });
    await meadow.getByRole('button', { name: 'Rotate left', exact: true }).click(); await stage.screenshot({ path: `${reportDir}/${id}-rounded-pinna-side.jpg`, type: 'jpeg', quality: 92 });
    await timeline.fill('0'); await choose(page, id, samples[id]); expect(await skullRig(page, id)).toEqual(actual);
    await page.emulateMedia({ reducedMotion: 'reduce' }); const frozen = await skullRig(page, id); await timeline.fill('160'); expect(await skullRig(page, id)).toEqual(frozen); await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  expect(new Set(hashes).size).toBe(2);
});

test('a grazing rabbit promptly raises its real skull at alarm while a listening fox cocks toward the recorded source and both poses replay exactly', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page, 'Rabbit neighbors');
  const samples = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb; let rabbit: any = null, fox: any = null, resumption: any = null;
    w.__pinnaVigilanceFrames.baseline.forEach((frame: any, step: number, frames: any[]) => {
      if (!step) return;
      frame.rabbits.forEach((pose: any, index: number) => {
        const old = frames[step - 1].rabbits[index];
        if (!rabbit && pose.active && old.state === 'Grazing' && ['Alert', 'Retreating'].includes(pose.state) && pose.forage > .2 && pose.headRaise > old.headRaise) rabbit = { branch: 'baseline', step, index, pose, old, unraised: api.mammalArticulation('rabbits', { ...pose, headRaise: 0 }, false) };
        if (!resumption && pose.active && pose.state === 'Grazing' && old.headRaise > .12 && pose.headRaise > 0) resumption = { step, index, pose, old };
      });
      frame.foxes.forEach((pose: any, index: number) => { if (pose.active && pose.state === 'Listening' && pose.listenCue && (!fox || Math.abs(pose.listenTilt) > Math.abs(fox.pose.listenTilt))) fox = { branch: 'baseline', step, index, pose, uncocked: api.mammalArticulation('foxes', { ...pose, listenTilt: 0 }, false) }; });
    });
    return { rabbit, fox, resumption };
  });
  expect(samples.rabbit).toBeTruthy(); expect(samples.fox).toBeTruthy(); expect(samples.resumption).toBeTruthy();
  expect(samples.resumption.pose.headRaise).toBeCloseTo(samples.resumption.old.headRaise - .12, 10);
  const rabbit = samples.rabbit;
  await choose(page, 'rabbits', { ...rabbit, step: rabbit.step - 1 }); await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  await meadow.getByRole('button', { name: 'Side view', exact: true }).click(); await meadow.getByLabel('Meadow camera distance', { exact: true }).fill('8');
  const grazing = await skullRig(page, 'rabbits'); await stage.screenshot({ path: `${reportDir}/rabbit-before-alarm.jpg`, type: 'jpeg', quality: 92 });
  await choose(page, 'rabbits', rabbit); const raised = await skullRig(page, 'rabbits');
  expect(raised.art.headRaise).toBeGreaterThanOrEqual(.75); expect(raised.art.headPitch).toBeGreaterThan(rabbit.unraised.headPitch + .3); expect(raised.art.headDrop).toBeLessThanOrEqual(rabbit.unraised.headDrop * .25 + 1e-12);
  expect(raised.headAngles).toEqual([raised.art.headRoll, raised.art.headYaw, raised.art.headPitch]); expect(raised.headPosition[1]).toBeCloseTo(.4 - raised.art.headDrop, 12); expect(raised.head).not.toEqual(grazing.head); expect(raised.neck).not.toEqual(grazing.neck);
  await expect(canvas).toHaveAttribute('data-interaction-posture', JSON.stringify({ headRaise: rabbit.pose.headRaise, listenTilt: rabbit.pose.listenTilt }));
  await expect(canvas).toHaveAttribute('data-behavior', rabbit.pose.state); await stage.screenshot({ path: `${reportDir}/rabbit-head-raised-at-alarm.jpg`, type: 'jpeg', quality: 92 });
  await timeline.fill('0'); await choose(page, 'rabbits', rabbit); expect(await skullRig(page, 'rabbits')).toEqual(raised);
  const fox = samples.fox; await choose(page, 'foxes', fox); const listening = await skullRig(page, 'foxes');
  expect(Math.abs(listening.art.listenTilt)).toBeGreaterThan(.06); expect(listening.art.headRoll - fox.uncocked.headRoll).toBeCloseTo(listening.art.listenTilt, 12);
  expect(fox.pose.attention).toMatchObject({ kind: 'prey', id: fox.pose.listenCue.id, index: fox.pose.listenCue.index }); expect(fox.pose.listenCue.onsetMovement).toBeGreaterThanOrEqual(.12);
  expect(listening.headAngles).toEqual([listening.art.headRoll, listening.art.headYaw, listening.art.headPitch]);
  await meadow.getByRole('button', { name: 'Face view', exact: true }).click(); await stage.screenshot({ path: `${reportDir}/fox-listening-skull-tilt.jpg`, type: 'jpeg', quality: 92 });
  await timeline.fill(String(Math.max(0, fox.step - 3))); await choose(page, 'foxes', fox); expect(await skullRig(page, 'foxes')).toEqual(listening);
  await page.emulateMedia({ reducedMotion: 'reduce' }); const frozen = await skullRig(page, 'foxes'); expect(frozen.art.listenTilt).toBe(0); expect(frozen.art.headRaise).toBe(0); await timeline.fill('200'); expect(await skullRig(page, 'foxes')).toEqual(frozen); await expect(canvas).toHaveAttribute('data-interaction-posture', '{"headRaise":0,"listenTilt":0}');
});

