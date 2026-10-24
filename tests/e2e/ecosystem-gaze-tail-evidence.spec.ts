import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
const reportDir = process.env.ECOLOGY_REPORT_DIR || 'reports/ecosystem-gaze-tail-evidence';
test.describe.configure({ timeout: 420_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
async function clean(page: Page) { expect(await page.evaluate(() => (window as any).__events?.errors || [])).toEqual([]); }
test.afterEach(async ({ page }) => { await clean(page); await harness.destroy(page); });
async function mount(page: Page, foodWeb?: any) {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true, ...(foodWeb ? { foodWeb } : {}) } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white'; });
}
async function ready(page: Page) {
  const meadow = page.locator('[data-efw-meadow]');
  if (!(await meadow.isVisible())) await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  const result = await page.waitForFunction(() => {
    const region = document.querySelector('[data-efw-meadow]'), hit = (window as any).__glCanvas?.('[data-efw-meadow]');
    if (hit?.rec?.scene && hit.rec.draws > 0 && region?.querySelector('canvas')?.hasAttribute('data-representative-index')) return 'ready';
    return region?.textContent?.includes('3D is unavailable on this device.') ? 'unavailable' : false;
  }, undefined, { timeout: 60_000 });
  expect(await result.jsonValue(), 'this workflow uses the actual renderer').toBe('ready');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  return meadow;
}
async function choose(page: Page, id: string, step: number, index: number) {
  const meadow = page.locator('[data-efw-meadow]');
  await meadow.getByRole('button', { name: id === 'foxes' ? /Red foxes\s[\d.]/ : /Rabbits\s[\d.]/ }).click();
  await meadow.getByLabel('Meadow timeline', { exact: true }).fill(String(step));
  const selector = meadow.getByLabel('Representative animal', { exact: true });
  if (!(await selector.count())) await meadow.getByRole('button', { name: 'Inspect selected group', exact: true }).click();
  if (await selector.isEnabled()) await selector.selectOption(String(index));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-selected-species', id);
  await expect(meadow.locator('canvas')).toHaveAttribute('data-representative-index', String(index));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-step', String(step));
}

async function detailRig(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const canvas = document.querySelector('[data-efw-meadow] canvas')!, index = Number(canvas.getAttribute('data-representative-index'));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches, step = reduced ? 0 : Number(canvas.getAttribute('data-step'));
    const pose = w.__detailFrames[canvas.getAttribute('data-branch')!][step][id][index];
    const animal = scene.children.filter((node: any) => node.userData.headSurface?.name === 'eco-' + id + '-head-surface')[index], d = animal.userData;
    function shown(part: any) { for (let node = part; node; node = node.parent) if (!node.visible) return false; return true; }
    function drawError(part: any) {
      const batch = scene.children.find((node: any) => node.isInstancedMesh && node.userData.parts?.includes(part));
      if (!batch) return null;
      const slot = batch.userData.parts.filter(shown).indexOf(part), matrix = new w.THREE.Matrix4(); batch.getMatrixAt(slot, matrix);
      return slot < 0 || slot >= batch.count ? null : Math.max(...matrix.elements.map((value: number, k: number) => Math.abs(value - part.matrixWorld.elements[k])));
    }
    const feet = (id === 'foxes' ? d.legs : d.paws).map((joint: any, k: number) => {
      const sole = id === 'foxes' ? joint.userData.rig.paw.children.find((part: any) => part.isMesh) : joint.userData.paw;
      return { x: sole.matrixWorld.elements[12], z: sole.matrixWorld.elements[14], target: pose.footPlants[k] };
    });
    const eyes = d.eyeGroups.map((eye: any) => ({
      groupMatrix: eye.matrix.toArray(), globeMatrix: eye.children[1].matrix.toArray(), globeMap: !!eye.children[1].material.map, globeRoughness: eye.children[1].material.roughness,
      expected: id === 'foxes' ? api.foxEyeFixation(pose, eye.userData.side, reduced) : null,
      applied: eye.userData.eyeFixation || null,
      layers: eye.userData.fixationLayers ? Object.fromEntries(Object.entries(eye.userData.fixationLayers).map(([name, raw]: any) => [name, { position: raw.position.toArray(), drawError: drawError(raw), map: !!raw.material.map, roughness: raw.material.roughness, ocular: !!raw.material.userData.ecoOcularSurface }])) : null,
    }));
    let tail: any = null;
    if (id === 'rabbits') {
      const part = d.tailSurface, raw = api.rabbitTailSurface(), positions = part.geometry.getAttribute('position'), normals = part.geometry.getAttribute('normal'), colors = part.geometry.getAttribute('color');
      let error = 0, normalError = 0, groundGap = Infinity, min = Infinity, max = -Infinity;
      for (let k = 0; k < positions.count; k++) {
        for (let a = 0; a < 3; a++) error = Math.max(error, Math.abs(positions.array[k * 3 + a] - raw.positions[k * 3 + a]));
        normalError = Math.max(normalError, Math.abs(Math.hypot(normals.getX(k), normals.getY(k), normals.getZ(k)) - 1));
        const point = new w.THREE.Vector3().fromBufferAttribute(positions, k).applyMatrix4(part.matrixWorld);
        groundGap = Math.min(groundGap, point.y - api.groundHeight(point.x, point.z));
        min = Math.min(min, colors.getX(k)); max = Math.max(max, colors.getX(k));
      }
      const rabbits = scene.children.filter((node: any) => node.userData.headSurface?.name === 'eco-rabbits-head-surface');
      tail = { vertices: positions.count, triangles: part.geometry.index.count / 3, error, normalError, groundGap, colorRange: max - min, drawError: drawError(part), attached: part.parent === d.tail, children: d.tail.children.filter((node: any) => node.isMesh).length, sharedGeometry: [...new Set(rabbits.map((root: any) => root.userData.tailSurface.geometry.uuid))].length, sharedMaterial: [...new Set(rabbits.map((root: any) => root.userData.tailSurface.material.uuid))].length, joint: d.tail.rotation.toArray(), expectedArticulation: api.mammalArticulation(id, pose, reduced) };
    }
    return { pose, eyes, feet, tail, head: d.head.matrix.toArray(), body: d.body.matrix.toArray(), framing: canvas.getAttribute('data-specimen-framing') };
  }, id);
}

test('live prey cues steer seated fox eye layers while smooth rabbit cotton tails retain real joint motion and rear inspection framing', async ({ page }) => {
  await mount(page); await page.getByRole('button', { name: 'Rabbit neighbors', exact: true }).click();
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const meadow = await ready(page), canvas = meadow.locator('canvas'), stage = meadow.locator('.efw-meadow-stage');
  const samples = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config, pair = api.compare(config);
    w.__detailFrames = { baseline: api.behaviorTimeline(config, pair.baseline), experiment: api.behaviorTimeline(config, pair.experiment) };
    const result: any = { negative: null, positive: null };
    w.__detailFrames.baseline.forEach((frame: any, step: number) => frame.foxes.forEach((pose: any, index: number) => {
      if (!pose.active || api.mammalArticulation('foxes', pose, false).eyeOpen < .98 || !api.foxEyeTarget(pose)) return;
      const key = pose.eyeAim < 0 ? 'negative' : 'positive';
      if (Math.abs(pose.eyeAim) > Math.abs(result[key]?.amount || .4)) result[key] = { step, index, amount: pose.eyeAim };
    }));
    result.playback = null;
    for (let step = 1; step < 236 && !result.playback; step++) for (let index = 0; index < 16 && !result.playback; index++) {
      const poses = [0, 1, 2, 3].map(offset => w.__detailFrames.baseline[step + offset].foxes[index]);
      const targets = poses.map(pose => api.foxEyeTarget(pose));
      if (poses.every(pose => pose?.active && Math.abs(pose.eyeAim) > .3) && targets.every(target => target && target.id === targets[0].id && target.index === targets[0].index) && Math.hypot(poses[1].x - poses[0].x, poses[1].z - poses[0].z) > .0001) result.playback = { step, index };
    }
    return result;
  });
  for (const key of ['negative', 'positive']) {
    const sample = samples[key]; expect(sample, 'genuine recorded prey attention supplies both fixation directions').toBeTruthy();
    await choose(page, 'foxes', sample.step, sample.index);
    if (await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).getAttribute('aria-pressed') !== 'true') await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
    await meadow.getByRole('button', { name: 'Face detail', exact: true }).click();
    const actual = await detailRig(page, 'foxes');
    expect(actual.pose.eyeAim).toBe(sample.amount);
    for (const eye of actual.eyes) {
      expect(eye.applied).toEqual(eye.expected); expect(Math.abs(eye.applied.amount)).toBeGreaterThan(.4);
      expect(eye.applied.cue).toMatchObject({ id: actual.pose.prey, index: actual.pose.preyIndex, x: actual.pose.preyCueSnapshot.x, z: actual.pose.preyCueSnapshot.z });
      expect(eye.globeMap).toBe(false); expect(eye.globeRoughness).toBe(.22);
      for (const [name, layer] of Object.entries(eye.layers) as any) {
        expect(layer.position).toEqual(eye.expected.positions[name]); expect(layer.drawError).not.toBeNull(); expect(layer.drawError).toBeLessThan(2e-6);
        if (name !== 'glint') expect(layer).toMatchObject({ map: false, roughness: .22, ocular: true });
      }
    }
    for (const foot of actual.feet) { expect(foot.x).toBeCloseTo(foot.target.x, 10); expect(foot.z).toBeCloseTo(foot.target.z, 10); }
    await stage.screenshot({ path: reportDir + '/fox-eye-fixation-' + key + '.jpg', type: 'jpeg', quality: 94 });
    await meadow.getByRole('button', { name: key === 'negative' ? 'Rotate right' : 'Rotate left', exact: true }).click();
    await stage.screenshot({ path: reportDir + '/fox-eye-fixation-' + key + '-oblique.jpg', type: 'jpeg', quality: 94 });
    await choose(page, 'foxes', Math.max(0, sample.step - 6), sample.index); await choose(page, 'foxes', sample.step, sample.index);
    expect(await detailRig(page, 'foxes')).toEqual(actual);
  }
  expect(samples.playback, 'a real moving fox sustains the same genuine prey cue across adjacent samples').toBeTruthy();
  await choose(page, 'foxes', samples.playback.step, samples.playback.index);
  await meadow.getByLabel('Meadow playback speed', { exact: true }).selectOption('0.5');
  await page.evaluate(({ index, start }) => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb; w.__fixationPlayback = []; w.__fixationSampling = true; w.__fixationLast = null;
    const frames = w.__detailFrames.baseline, segments: any[] = [];
    for (let step = 1; step < frames.length - 2; step++) {
      const a = frames[step].foxes[index], b = frames[step + 1].foxes[index], from = api.foxEyeTarget(a), to = api.foxEyeTarget(b);
      if (from && to && from.id === to.id && from.index === to.index && (Math.hypot(a.x - b.x, a.z - b.z) > .0001 || Math.abs(a.yaw - b.yaw) > .0001)) segments.push({ step, from, to });
    }
    function sameTarget(a: any, b: any) { return a && b && a.id === b.id && a.index === b.index && ['x', 'z', 'residual', 'amount'].every(key => Math.abs(a[key] - b[key]) < 1e-10); }

    function sample() {
      if (!w.__fixationSampling) return;
      const canvas = document.querySelector('[data-efw-meadow] canvas');
      const scene = w.__glCanvas('[data-efw-meadow]')?.rec?.scene;
      const root = scene?.children.filter((node: any) => node.userData.headSurface?.name === 'eco-foxes-head-surface')[index], eye = root?.userData.eyeGroups[0], applied = eye?.userData.eyeFixation;
      // The data-* mirror is committed less often than the live drawing. Read
      // the actual drawn rig channel for its fractional alpha and endpoints.
      w.__fixationLast = { mirrorStep: canvas?.getAttribute('data-step'), source: applied?.source, alpha: applied?.alpha, amount: applied?.amount };
      if (applied?.source === 'interpolated' && applied.alpha > .02 && applied.alpha < .98) {
        const segment = segments.find(segment => sameTarget(applied.endpoints?.[0], segment.from) && sameTarget(applied.endpoints?.[1], segment.to));
        if (segment) {
          const step = segment.step, alpha = applied.alpha, pose = api.blendPose(frames[step].foxes[index], frames[step + 1].foxes[index], alpha, 'foxes', frames[step - 1]?.foxes[index], frames[step + 2]?.foxes[index]);
          const expected = api.foxEyeFixation(pose, eye.userData.side, false), actor = { x: root.position.x, z: root.position.z, yaw: root.rotation.y };
          if (Math.abs(expected.amount) > .1 && Math.abs(actor.x - pose.x) < 1e-8 && Math.abs(actor.z - pose.z) < 1e-8) w.__fixationPlayback.push({ alpha, step, expected, applied, actor, expectedActor: { x: pose.x, z: pose.z, yaw: pose.yaw }, positions: Object.fromEntries(Object.entries(eye.userData.fixationLayers).map(([name, part]: any) => [name, part.position.toArray()])) });
        }
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }, { index: samples.playback.index, start: samples.playback.step });
  await meadow.getByRole('button', { name: 'Play meadow timeline', exact: true }).click();
  await page.waitForFunction(() => (window as any).__fixationPlayback?.length >= 3, undefined, { timeout: 15_000 }).catch(async error => {
    const diagnostics = await page.evaluate(() => { const w = window as any; w.__fixationSampling = false; return { records: w.__fixationPlayback, last: w.__fixationLast, errors: w.__events?.errors }; });
    await test.info().attach('fractional-playback-diagnostics', { body: JSON.stringify(diagnostics), contentType: 'application/json' });
    throw error;
  });
  await meadow.getByRole('button', { name: 'Pause meadow timeline', exact: true }).click();
  const playback = await page.evaluate(() => { (window as any).__fixationSampling = false; return (window as any).__fixationPlayback; });
  expect(playback.length).toBeGreaterThanOrEqual(3);
  for (const sample of playback) {
    expect(sample.alpha).toBeGreaterThan(.02); expect(sample.alpha).toBeLessThan(.98); expect(Math.abs(sample.applied.amount)).toBeGreaterThan(.1);
    expect(sample.applied.source).toBe('interpolated');
    expect(sample.applied.cue.id).toBe(sample.expected.cue.id); expect(sample.applied.cue.index).toBe(sample.expected.cue.index);
    for (const key of ['amount', 'offset', 'alpha']) expect(sample.applied[key]).toBeCloseTo(sample.expected[key], 12);
    for (const key of ['x', 'z', 'yaw']) expect(sample.actor[key]).toBeCloseTo(sample.expectedActor[key], 12);
    for (const name of ['iris', 'pupil', 'glint']) for (let axis = 0; axis < 3; axis++) { expect(sample.applied.positions[name][axis]).toBeCloseTo(sample.expected.positions[name][axis], 12); expect(sample.positions[name][axis]).toBeCloseTo(sample.expected.positions[name][axis], 12); }
  }
  await test.info().attach('actual-fractional-eye-playback', { body: JSON.stringify(playback), contentType: 'application/json' });
  await choose(page, 'rabbits', 0, 0); await meadow.getByRole('button', { name: 'Rear view', exact: true }).press('Enter');
  await expect(canvas).toHaveAttribute('data-specimen-framing', 'whole');
  const rabbit = await detailRig(page, 'rabbits'), tail = rabbit.tail;
  expect(tail).toMatchObject({ vertices: 761, triangles: 1472, attached: true, children: 1, sharedGeometry: 1, sharedMaterial: 1 });
  expect(tail.error).toBeLessThan(1e-7); expect(tail.normalError).toBeLessThan(1e-6); expect(tail.colorRange).toBeGreaterThan(.02); expect(tail.groundGap).toBeGreaterThan(.005); expect(tail.drawError).not.toBeNull(); expect(tail.drawError).toBeLessThan(2e-6);
  expect(tail.joint[1]).toBeCloseTo(tail.expectedArticulation.tailYaw, 12); expect(tail.joint[2]).toBeCloseTo(tail.expectedArticulation.tailPitch, 12);
  for (const eye of rabbit.eyes) { expect(eye.globeMap).toBe(false); expect(eye.globeRoughness).toBe(.22); }
  await stage.screenshot({ path: reportDir + '/rabbit-cotton-tail-rear.jpg', type: 'jpeg', quality: 94 });
  await meadow.getByRole('button', { name: 'Rotate left', exact: true }).click();
  await stage.screenshot({ path: reportDir + '/rabbit-cotton-tail-oblique.jpg', type: 'jpeg', quality: 94 });
  await choose(page, 'rabbits', 20, 0); await choose(page, 'rabbits', 0, 0); expect(await detailRig(page, 'rabbits')).toEqual(rabbit);
  await choose(page, 'foxes', 0, 0); await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  const still = await detailRig(page, 'foxes');
  for (const eye of still.eyes) { expect(eye.applied).toMatchObject({ amount: 0, cue: null, source: 'neutral' }); expect(Math.abs(eye.applied.offset)).toBe(0); expect(eye.applied).toEqual(eye.expected); }
  await meadow.getByLabel('Meadow timeline', { exact: true }).fill('180'); expect(await detailRig(page, 'foxes')).toEqual(still);
  await page.setViewportSize({ width: 390, height: 844 }); await meadow.getByRole('button', { name: 'Rear view', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-specimen-framing', 'whole');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await stage.screenshot({ path: reportDir + '/mobile-reduced-rear-inspection.jpg', type: 'jpeg', quality: 94 });
});

test('checkpoint pinning preserves first evidence choices through revision, saving, export and reduced-motion mobile reopening without mission credit', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: 'Rabbit neighbors', exact: true }).click();
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const meadow = await ready(page), fieldwork = meadow.locator('[data-efw-fieldwork]'), challenge = fieldwork.locator('[data-efw-inference]');
  const save = fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true });
  const fixture = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config;
    const frames = api.behaviorTimeline(config, api.compare(config).baseline), encounter = api.encounters(frames, config).find((item: any) => item.kind === 'spacing');
    if (!encounter) return null;
    const trial = api.inferenceTrial(frames, encounter, 'baseline');
    return { trial, steps: [trial.before, trial.step, trial.after], codes: api.inferenceClaims(trial).map((card: any) => card.category) };
  });
  expect(fixture).toBeTruthy();
  await fieldwork.locator('[data-efw-encounter="spacing"]').click();
  await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('avoid');
  await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
  await challenge.locator('summary').press('Enter');
  for (let k = 0; k < 4; k++) await challenge.getByLabel('Evidence statement ' + (k + 1) + ' source', { exact: true }).selectOption(fixture!.codes[k]);
  for (let k = 0; k < 3; k++) {
    await challenge.getByRole('button', { name: 'Inspect evidence checkpoint ' + (k + 1), exact: true }).press('Enter');
    await expect(meadow.getByLabel('Meadow timeline', { exact: true })).toHaveValue(String(fixture!.steps[k]));
    const back = meadow.locator('[data-efw-observation-dock]').getByRole('button', { name: 'Return to evidence sources', exact: true });
    await expect(back).toBeFocused(); await back.press('Enter');
  }
  await challenge.getByRole('button', { name: 'Check evidence sources', exact: true }).click();
  await expect(challenge.locator('[data-efw-inference-feedback]')).toContainText('4 of 4 current sources match');
  const link = challenge.locator('[data-efw-evidence-link]');
  await expect(link).not.toHaveAttribute('open', '');
  await link.locator('summary').press('Enter');
  await expect(save).toBeEnabled();
  await expect(link.getByRole('checkbox')).toHaveCount(3);
  const before = link.getByLabel('Pin Before checkpoint', { exact: true }), middle = link.getByLabel('Pin Encounter checkpoint', { exact: true }), after = link.getByLabel('Pin After checkpoint', { exact: true });
  await middle.check();
  await link.getByRole('button', { name: 'Check checkpoint pins', exact: true }).click();
  const feedback = link.locator('[data-efw-link-feedback]');
  await expect(feedback).toHaveAttribute('data-efw-link-status', 'insufficient');
  const firstPins = [fixture!.steps[1]];
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.inference.link.firstPins)).toEqual(firstPins);
  await before.check(); await after.check();
  await expect(save).toBeDisabled();
  await expect(fieldwork).toContainText('Check the revised checkpoint pins before saving this observation.');
  await link.getByRole('button', { name: 'Check revised checkpoint pins', exact: true }).click();
  await expect(feedback).toHaveAttribute('data-efw-link-status', 'extra');
  await middle.uncheck(); await expect(save).toBeDisabled();
  await link.getByRole('button', { name: 'Check revised checkpoint pins', exact: true }).click();
  await expect(feedback).toHaveAttribute('data-efw-link-status', 'minimal');
  await expect(save).toBeEnabled();
  await expect(feedback).toContainText('First');
  const reflection = 'Before and After support the endpoint claim. The extra middle sample cannot establish every intervening moment.';
  await link.getByLabel('Checkpoint evidence reflection', { exact: true }).fill(reflection);
  const progress = page.locator('[data-efw-mission-progress]');
  await expect(progress).toHaveText('Evidence saved for 0 of 3 missions.');
  await link.screenshot({ path: reportDir + '/checkpoint-pins-desktop.jpg', type: 'jpeg', quality: 92 });
  await save.click();
  const original = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook.at(-1));
  const frozen = JSON.stringify(original), record = original.sighting.inference.link;
  expect(record).toMatchObject({ version: 1, trialId: fixture!.trial.id, trialKey: JSON.stringify(fixture!.trial), claimId: 'checkpoints', pins: [fixture!.steps[0], fixture!.steps[2]], firstPins, reflection });
  const notebook = page.locator('[data-efw-notebook]'), note = notebook.locator('[data-efw-note="' + original.id + '"]');
  await note.locator('[data-efw-note-inference] summary').click();
  await expect(note.locator('[data-efw-note-inference]')).toContainText(reflection);
  const downloading = page.waitForEvent('download'); await notebook.getByRole('button', { name: 'Export field notebook', exact: true }).click();
  const download = await downloading, exported = await readFile((await download.path())!, 'utf8');
  const prefix = 'Frozen evidence / inference trial (JSON): ', line = exported.split('\n').find(value => value.startsWith(prefix));
  expect(line).toBeTruthy(); expect(JSON.parse(line!.slice(prefix.length)).link).toEqual(record);
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  await notebook.getByRole('button', { name: 'Reopen observation ' + original.id, exact: true }).click();
  await expect(link).toHaveAttribute('open', ''); await expect(before).toBeChecked(); await expect(middle).not.toBeChecked(); await expect(after).toBeChecked();
  await expect(link.getByLabel('Checkpoint evidence reflection', { exact: true })).toHaveValue(reflection);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(frozen);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 390, height: 844 });
  await expect(meadow.locator('canvas')).toHaveAttribute('data-behavior', 'Starting pose');
  await before.uncheck(); await expect(save).toBeDisabled();
  await link.getByRole('button', { name: 'Check revised checkpoint pins', exact: true }).press('Enter');
  await expect(feedback).toHaveAttribute('data-efw-link-status', 'insufficient');
  const mobileReflection = 'On the still scene I pinned only After. That leaves Before unsupported; the original endpoint answer stays in my first note.';
  await link.getByLabel('Checkpoint evidence reflection', { exact: true }).fill(mobileReflection);
  await expect(save).toBeEnabled(); await expect(progress).toHaveText('Evidence saved for 0 of 3 missions.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await link.screenshot({ path: reportDir + '/checkpoint-pins-mobile-reduced.jpg', type: 'jpeg', quality: 92 });
  await save.click();
  const revised = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook.at(-1));
  expect(revised.id).toBeGreaterThan(original.id);
  expect(revised.sighting.inference.link).toEqual({ ...record, pins: [fixture!.steps[2]], reflection: mobileReflection });
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(frozen);
  await expect(progress).toHaveText('Evidence saved for 0 of 3 missions.');
  const historical = await page.evaluate(note => {
    const api = (window as any).StemLab.ecosystemFoodWeb, raw = JSON.parse(JSON.stringify(note)), sample = raw.sighting.inference.trial.samples[0];
    sample.actor.x += .125; sample.gap = Math.hypot(sample.actor.x - sample.cue.x, sample.actor.z - sample.cue.z);
    raw.sighting.inference.link.trialKey = JSON.stringify(api.inferenceSnapshot(raw.sighting.inference.trial));
    const normalized = api.notebook([raw])[0], config = normalized.config;
    const pair = api.compare(config), frames = api.behaviorTimeline(config, pair[normalized.sighting.branch]);
    const encounter = api.encounters(frames, config).find((item: any) => item.kind === normalized.sighting.kind && item.actor.id === normalized.focus && item.actor.index === normalized.sighting.actorIndex && item.cue.id === normalized.sighting.cueId && item.cue.index === normalized.sighting.cueIndex && item.step === normalized.step);
    return { normalized, originalMatches: api.inferenceMatches(note.sighting.inference, frames, encounter), historicalMatches: api.inferenceMatches(normalized.sighting.inference, frames, encounter) };
  }, revised);
  expect(historical.normalized.sighting.inference.link).toEqual({ ...revised.sighting.inference.link, trialKey: JSON.stringify(historical.normalized.sighting.inference.trial) });
  expect(historical.normalized.sighting.inference.link.trialKey).not.toBe(revised.sighting.inference.link.trialKey);
  expect(historical.originalMatches).toBe(true); expect(historical.historicalMatches).toBe(false);
});
