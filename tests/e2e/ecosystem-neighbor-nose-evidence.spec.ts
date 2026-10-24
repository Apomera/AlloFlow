import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
const reportDir = process.env.ECOLOGY_REPORT_DIR || 'reports/ecosystem-neighbor-nose-evidence';
test.describe.configure({ timeout: 420_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page); expect(errors, 'nasal, neighbor and reasoning workflows have no uncaught errors').toEqual([]);
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
    w.__naturalFrames = { baseline: api.behaviorTimeline(config, pair.baseline), experiment: api.behaviorTimeline(config, pair.experiment) };
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

async function facialRig(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb;
    const scene = w.__glCanvas('[data-efw-meadow]').rec.scene, canvas = document.querySelector('[data-efw-meadow] canvas')!;
    const index = Number(canvas.getAttribute('data-representative-index')), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = reduced ? 0 : Number(canvas.getAttribute('data-step')), pose = w.__naturalFrames[canvas.getAttribute('data-branch')!][step][id][index];
    const animals = scene.children.filter((node: any) => node.userData.headSurface?.name === `eco-${id}-head-surface`), animal = animals[index], d = animal.userData;
    const nose = d.nose, whiskers = d.whiskers, raw = api.mammalNoseSurface(id), nasal = api.mammalNosePose(id, pose, reduced), curves = api.mammalWhiskers(id, pose, reduced);
    const position = nose.geometry.getAttribute('position'), normal = nose.geometry.getAttribute('normal'), color = nose.geometry.getAttribute('color'), wp = whiskers.geometry.getAttribute('position');
    let shapeError = 0, whiskerError = 0, rootError = 0, normalError = 0, groundGap = Infinity, colorMin = Infinity, colorMax = -Infinity;
    for (let k = 0; k < position.count; k++) {
      for (let axis = 0; axis < 3; axis++) shapeError = Math.max(shapeError, Math.abs(position.array[k * 3 + axis] - raw.positions[k * 3 + axis]));
      normalError = Math.max(normalError, Math.abs(Math.hypot(normal.getX(k), normal.getY(k), normal.getZ(k)) - 1));
      const point = new T.Vector3().fromBufferAttribute(position, k).applyMatrix4(nose.matrixWorld);
      groundGap = Math.min(groundGap, point.y - api.groundHeight(point.x, point.z));
      colorMin = Math.min(colorMin, color.getX(k)); colorMax = Math.max(colorMax, color.getX(k));
    }
    for (let k = 0; k < wp.array.length; k++) whiskerError = Math.max(whiskerError, Math.abs(wp.array[k] - curves.positions[k]));
    curves.roots.forEach((vertex: number, strand: number) => curves.rootPositions[strand].forEach((value: number, axis: number) => { rootError = Math.max(rootError, Math.abs(wp.array[vertex * 3 + axis] - value)); }));
    function shown(part: any) { for (let node = part; node; node = node.parent) if (!node.visible) return false; return true; }
    const batch = scene.children.find((node: any) => node.isInstancedMesh && node.userData.parts?.includes(nose)), slot = batch.userData.parts.filter(shown).indexOf(nose), matrix = new T.Matrix4(); batch.getMatrixAt(slot, matrix);
    const headFocus = api.headFocus(id, pose, index, reduced), actualFocus = new T.Vector3().fromArray(headFocus.local).applyMatrix4(d.head.matrixWorld).toArray();
    const target = canvas.getAttribute('data-head-focus') ? JSON.parse(canvas.getAttribute('data-head-focus')!) : null;
    function hash(array: any) { let value = 2166136261; const words = new Uint32Array(array.buffer, array.byteOffset, array.length); for (const word of words) value = Math.imul(value ^ word, 16777619); return value >>> 0; }
    const feet = (id === 'foxes' ? d.legs : d.paws).map((joint: any, k: number) => {
      const sole = id === 'foxes' ? joint.userData.rig.paw.children.find((part: any) => part.isMesh) : joint.userData.paw;
      const m = sole.matrixWorld.elements;
      return { x: m[12], z: m[14], target: pose.footPlants[k], matrix: m.slice() };
    });
    return {
      index, step, state: pose.state, nasal, applied: nose.userData.ecoNosePose, nosePosition: nose.position.toArray(), home: nose.userData.ecoNoseHome.toArray(), noseScale: nose.scale.toArray(), baseScale: nose.userData.ecoNoseScale.toArray(),
      vertices: position.count, triangles: nose.geometry.index.count / 3, shapeError, whiskerVertices: wp.count, whiskerError, rootError, normalError, groundGap, colorSpread: colorMax - colorMin,
      attached: nose.parent === d.head && whiskers.parent === d.head, drawn: slot >= 0 && slot < batch.count, drawError: Math.max(...matrix.elements.map((value: number, k: number) => Math.abs(value - nose.matrixWorld.elements[k]))),
      sharedGeometry: [...new Set(animals.map((root: any) => root.userData.nose.geometry.uuid))], sharedMaterial: [...new Set(animals.map((root: any) => root.userData.nose.material.uuid))], privateWhiskers: new Set(animals.map((root: any) => root.userData.whiskers.geometry.uuid)).size,
      noseHash: hash(position.array), whiskerHash: hash(wp.array), headMatrix: d.head.matrix.toArray(), bodyMatrix: d.body.matrix.toArray(), eyes: d.eyeGroups.map((eye: any) => ({ matrix: eye.matrix.toArray(), children: eye.children.map((part: any) => part.matrix.toArray()) })), feet,
      headFocus: headFocus.point, actualFocus, target, framing: canvas.getAttribute('data-specimen-framing')
    };
  }, id);
}

test('sculpted nasal pads and fixed-root curved whiskers use genuine recorded grazing motion while face framing follows the current drawn skull', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page, 'Rabbit neighbors');
  const pulse = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb; let best: any = null;
    w.__naturalFrames.baseline.forEach((frame: any, step: number) => frame.rabbits.forEach((pose: any, index: number) => {
      if (!pose.active) return; const nasal = api.mammalNosePose('rabbits', pose, false);
      if (nasal.lift > (best?.nasal.lift || 0)) best = { step, index, nasal };
    })); return best;
  });
  expect(pulse?.nasal.lift).toBeGreaterThan(.001);
  for (const id of ['foxes', 'rabbits']) {
    const sample = id === 'rabbits' ? pulse : { step: 0, index: 0 };
    await choose(page, id, sample);
    if (await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).getAttribute('aria-pressed') !== 'true') await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
    const beforeFrame = await facialRig(page, id);
    await meadow.getByRole('button', { name: 'Face detail', exact: true }).press('Enter');
    await expect(canvas).toHaveAttribute('data-specimen-framing', 'face');
    const actual = await facialRig(page, id);
    expect(actual).toMatchObject({ vertices: 617, triangles: 1200, whiskerVertices: 96, attached: true, drawn: true });
    expect(actual.shapeError).toBeLessThan(1e-7); expect(actual.whiskerError).toBeLessThan(1e-7); expect(actual.rootError).toBeLessThan(1e-7); expect(actual.normalError).toBeLessThan(1e-6); expect(actual.drawError).toBeLessThan(2e-6); expect(actual.groundGap).toBeGreaterThan(.005); expect(actual.colorSpread).toBeGreaterThan(.005);
    expect(actual.sharedGeometry).toHaveLength(1); expect(actual.sharedMaterial).toHaveLength(1); expect(actual.privateWhiskers).toBe(16); expect(actual.applied).toEqual(actual.nasal);
    for (let k = 0; k < 3; k++) { expect(actual.nosePosition[k]).toBeCloseTo(actual.home[k] + (k === 1 ? actual.nasal.lift : 0), 12); expect(actual.noseScale[k]).toBeCloseTo(actual.baseScale[k] * [actual.nasal.scaleX, actual.nasal.scaleY, actual.nasal.scaleZ][k], 12); expect(actual.headFocus[k]).toBeCloseTo(actual.actualFocus[k], 10); expect(actual.target[k]).toBeCloseTo(actual.actualFocus[k], 10); }
    expect(actual.headMatrix).toEqual(beforeFrame.headMatrix); expect(actual.bodyMatrix).toEqual(beforeFrame.bodyMatrix); expect(actual.feet).toEqual(beforeFrame.feet); expect(actual.eyes).toEqual(beforeFrame.eyes);
    for (const foot of actual.feet) { expect(foot.x).toBeCloseTo(foot.target.x, 10); expect(foot.z).toBeCloseTo(foot.target.z, 10); }
    if (id === 'rabbits') { expect(actual.state).toBe('Grazing'); expect(actual.nasal.lift).toBeGreaterThan(.001); expect(actual.nasal.fan).toBeGreaterThan(.02); } else expect(actual.nasal.lift).toBe(0);
    await stage.screenshot({ path: `${reportDir}/${id}-nasal-face-detail.jpg`, type: 'jpeg', quality: 94 });
    await meadow.getByRole('button', { name: 'Rotate left', exact: true }).click(); await stage.screenshot({ path: `${reportDir}/${id}-curved-whiskers-oblique.jpg`, type: 'jpeg', quality: 94 });
    await timeline.fill(String(Math.min(240, sample.step + 5))); await choose(page, id, sample);
    expect(await facialRig(page, id)).toEqual(actual);
    await meadow.getByRole('button', { name: 'Whole animal', exact: true }).click(); await expect(canvas).toHaveAttribute('data-specimen-framing', 'whole');
  }
  await choose(page, 'rabbits', { step: 0, index: 0 }); await meadow.getByRole('button', { name: 'Face detail', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  const frozen = await facialRig(page, 'rabbits'); expect(frozen.nasal).toEqual({ lift: 0, scaleX: 1, scaleY: 1, scaleZ: 1, fan: 0 });
  await timeline.fill('180'); expect(await facialRig(page, 'rabbits')).toEqual({ ...frozen, step: 0 });
  await page.setViewportSize({ width: 390, height: 844 }); await expect(canvas).toHaveAttribute('data-specimen-framing', 'face');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await stage.screenshot({ path: `${reportDir}/mobile-reduced-face-detail.jpg`, type: 'jpeg', quality: 94 });
});

async function neighborRig(page: Page) {
  return page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, canvas = document.querySelector('[data-efw-meadow] canvas')!, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const index = Number(canvas.getAttribute('data-representative-index')), step = Number(canvas.getAttribute('data-step')), frames = w.__naturalFrames[canvas.getAttribute('data-branch')!], pose = frames[step].rabbits[index];
    const root = scene.children.filter((node: any) => node.userData.headSurface?.name === 'eco-rabbits-head-surface')[index], d = root.userData, art = api.mammalArticulation('rabbits', pose, false), feeding = api.mammalArticulation('rabbits', { ...pose, neighborLook: 0 }, false);
    return { index, step, pose, previousSource: pose.neighborLookCue ? frames[step - 1].rabbits[pose.neighborLookCue.index] : null, art, feeding, headPosition: d.head.position.toArray(), headRotation: d.head.rotation.toArray(), ears: d.ears.map((ear: any) => ear.rotation.toArray()), appliedNasal: d.nose.userData.ecoNosePose, headMatrix: d.head.matrix.toArray(), neck: Array.from(d.neckSurface.geometry.getAttribute('position').array), feet: d.paws.map((joint: any, k: number) => ({ x: joint.userData.paw.matrixWorld.elements[12], z: joint.userData.paw.matrixWorld.elements[14], target: pose.footPlants[k] })), interaction: canvas.getAttribute('data-interaction-cue') };
  });
}

test('a reciprocal grazing glance follows the real giving-space neighbor without moving the receiving rabbit or changing its recorded feeding action', async ({ page }) => {
  const { meadow, canvas, stage } = await mount(page, 'Rabbit neighbors');
  const sample = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb; let best: any = null;
    w.__naturalFrames.baseline.forEach((frame: any, step: number) => frame.rabbits.forEach((pose: any, index: number) => {
      if (!pose.active || !pose.neighborLookCue || pose.neighborLook < .9) return;
      const actual = api.mammalArticulation('rabbits', pose, false), feeding = api.mammalArticulation('rabbits', { ...pose, neighborLook: 0 }, false), lift = feeding.headDrop - actual.headDrop;
      if (!best || lift > best.lift) best = { step, index, weight: pose.neighborLook, lift };
    })); return best;
  });
  expect(sample?.weight).toBeGreaterThan(.9); await choose(page, 'rabbits', sample);
  const actual = await neighborRig(page), p = actual.pose, cue = p.neighborLookCue;
  expect(p).toMatchObject({ state: 'Grazing', speed: 0, moving: 0, headRaise: 0, neighbor: 'rabbits', neighborIndex: cue.index, attention: { kind: 'neighbor', id: 'rabbits', index: cue.index } });
  expect(actual.previousSource).toMatchObject({ state: 'Giving space', spacingCue: { id: 'rabbits', index: sample.index } });
  expect(cue.sourceStep).toBe(sample.step - 1); expect([cue.x, cue.z, cue.movement]).toEqual([actual.previousSource.x, actual.previousSource.z, actual.previousSource.moving]);
  expect(actual.art.neighborLook).toBeGreaterThan(.9); expect(actual.art.headDrop).toBeLessThan(actual.feeding.headDrop - .04); expect(actual.art.headPitch).toBeGreaterThan(actual.feeding.headPitch + .1);
  expect(actual.headPosition[1]).toBeCloseTo(.4 - actual.art.headDrop, 12); expect(actual.headRotation[1]).toBeCloseTo(actual.art.headYaw, 12); expect(actual.headRotation[2]).toBeCloseTo(actual.art.headPitch, 12);
  expect(actual.ears[0][1]).toBeCloseTo(actual.art.earLeft, 12); expect(actual.ears[1][1]).toBeCloseTo(actual.art.earRight, 12); expect(actual.appliedNasal.lift).toBeLessThan(.0001);
  for (const foot of actual.feet) { expect(foot.x).toBeCloseTo(foot.target.x, 10); expect(foot.z).toBeCloseTo(foot.target.z, 10); }
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  const explanation = meadow.locator('[data-efw-action-explanation]');
  if (!(await explanation.isVisible())) await meadow.getByText('Why this action?', { exact: true }).click();
  await meadow.getByRole('button', { name: 'Show behavior interaction', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-interaction-cue', `rabbits:${cue.index}`); await expect(canvas).toHaveAttribute('data-interaction-view', 'true');
  await expect(explanation).toContainText('does not establish communication');
  await stage.screenshot({ path: `${reportDir}/reciprocal-rabbit-glance-pair.jpg`, type: 'jpeg', quality: 94 });
  await meadow.getByRole('button', { name: 'Show behavior interaction', exact: true }).click(); await meadow.getByRole('button', { name: 'Face detail', exact: true }).click();
  await meadow.getByRole('button', { name: 'Rotate left', exact: true }).click(); await stage.screenshot({ path: `${reportDir}/grazing-rabbit-neighbor-glance.jpg`, type: 'jpeg', quality: 94 });
  await choose(page, 'rabbits', { ...sample, step: Math.max(0, sample.step - 8) }); await choose(page, 'rabbits', sample);
  expect(await neighborRig(page)).toEqual(actual);
  await choose(page, 'rabbits', { step: 0, index: 0 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  const reduced = await facialRig(page, 'rabbits'); expect(reduced.nasal.lift).toBe(0); await meadow.getByLabel('Meadow timeline', { exact: true }).fill('200'); expect(await facialRig(page, 'rabbits')).toEqual(reduced);
});
