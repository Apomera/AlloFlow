import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
const reportDir = 'reports/ecosystem-cue-lab';
test.describe.configure({ timeout: 300_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page);
  expect(errors).toEqual([]);
});

async function ready(page: Page) {
  const meadow = page.locator('[data-efw-meadow]');
  if (!(await meadow.isVisible())) await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  const result = await page.waitForFunction(() => {
    const region = document.querySelector('[data-efw-meadow]'), rec = (window as any).__glCanvas?.('[data-efw-meadow]');
    if (rec?.rec?.scene && rec.rec.draws > 0 && region?.querySelector('canvas')?.hasAttribute('data-representative-index')) return 'ready';
    return region?.textContent?.includes('3D is unavailable on this device.') ? 'unavailable' : false;
  }, undefined, { timeout: 45_000 });
  expect(await result.jsonValue(), 'the actual tool creates its scene and draws').toBe('ready');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config, comparison = api.compare(config);
    w.__cueLabFrames = { baseline: api.behaviorTimeline(config, comparison.baseline), experiment: api.behaviorTimeline(config, comparison.experiment) };
  });
  return { meadow, canvas: meadow.locator('canvas'), stage: meadow.locator('.efw-meadow-stage'), timeline: meadow.getByLabel('Meadow timeline', { exact: true }), fieldwork: meadow.locator('[data-efw-fieldwork]') };
}

async function mount(page: Page, preset = 'Rabbit neighbors', prediction = '') {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white'; });
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
  await expect(meadow.locator('canvas')).toHaveAttribute('data-representative-index', String(sample.index));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-step', String(sample.step));
}

async function anatomy(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const animal = scene.children.find((a: any) => a.visible && a.userData.neckSurface?.name === `eco-${id}-neck-surface`), d = animal.userData, neck = d.neckSurface;
    const raw = api.mammalSurface(id, 'neck'), home = id === 'foxes' ? [.265, .51, 0] : [.178, .365, 0], fitted = api.neckFit(id, d.head.matrix.elements, raw.positions), attr = neck.geometry.getAttribute('position'), n = neck.geometry.getAttribute('normal');
    let error = 0, invalid = 0;
    for (let k = 0; k < attr.count; k++) {
      for (let axis = 0; axis < 3; axis++) error = Math.max(error, Math.abs(attr.array[k * 3 + axis] - fitted[k * 3 + axis]));
      const length = Math.hypot(n.getX(k), n.getY(k), n.getZ(k));
      if (!Number.isFinite(length) || Math.abs(length - 1) > 1e-4) invalid++;
    }
    function coat(mesh: any) {
      const material = mesh.material, image = material.map.image, pixels = image.getContext('2d').getImageData(0, 0, image.width, image.height).data;
      let hash = 2166136261;
      const colors = new Set();
      for (let k = 0; k < pixels.length; k += 16) { hash = Math.imul(hash ^ pixels[k], 16777619); colors.add(pixels[k] * 65536 + pixels[k + 1] * 256 + pixels[k + 2]); }
      return { width: image.width, height: image.height, hash: hash >>> 0, colors: colors.size, bump: material.bumpScale, distinctRelief: material.bumpMap.image !== image, vertexColors: material.vertexColors };
    }
    const colors = d.torso.geometry.getAttribute('color'); let colorMin = Infinity, colorMax = -Infinity;
    for (let k = 0; k < colors.count; k++) { const value = colors.getX(k) + colors.getY(k) + colors.getZ(k); colorMin = Math.min(colorMin, value); colorMax = Math.max(colorMax, value); }
    const canvas = document.querySelector('[data-efw-meadow] canvas')!, branch = canvas.getAttribute('data-branch')!, step = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Number(canvas.getAttribute('data-step')), index = Number(canvas.getAttribute('data-representative-index'));
    const pose = w.__cueLabFrames[branch][step][id][index];
    const feet = (id === 'foxes' ? d.legs : d.paws).map((leg: any) => {
      const mesh = id === 'foxes' ? leg.userData.rig.paw.children.find((m: any) => m.isMesh) : leg.userData.paw, center = new T.Vector3().setFromMatrixPosition(mesh.matrixWorld), e = mesh.matrixWorld.elements;
      const foot = api.footPose(id, pose, leg.userData.hind, leg.userData.side);
      return { hind: leg.userData.hind, side: leg.userData.side, contact: (pose.pounce || 0) < .01 && !(foot.swing && pose.stride > .015), gap: center.y - Math.hypot(e[1], e[5], e[9]) - api.groundHeight(center.x, center.z), gait: id === 'foxes' ? api.foxGait(pose, leg.userData.hind, leg.userData.side) : null, matrix: mesh.matrixWorld.toArray() };
    });
    const neckControl = d.mammalParts.neck;
    if (neckControl.position.distanceTo(new T.Vector3(...home)) > 1e-12 || neckControl.rotation.toArray().slice(0, 3).some((angle: number) => Math.abs(angle) > 1e-12)) throw new Error('The neck control must stay at its fixed home while its skin follows the head');
    return { vertices: attr.count, triangles: neck.geometry.index.count / 3, error, invalid, coat: coat(neck), upright: coat(d.limbSkin), sharedAlong: neck.material.map === d.torso.material.map, colorSpread: colorMax - colorMin, feet, neckMatrix: neckControl.matrix.toArray() };
  }, id);
}

async function trailMesh(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const group = scene.children.find((node: any) => node.children?.some((child: any) => child.isInstancedMesh && child.instanceMatrix.count === 30 && child.material.emissive?.getHex() === 0x51400b));
    if (!group) throw new Error('The actual recent-trail buffers were not created');
    return { visible: group.visible, meshes: group.children.map((mesh: any) => {
      const matrices = [], m = new T.Matrix4();
      for (let k = 0; k < mesh.count; k++) { mesh.getMatrixAt(k, m); matrices.push(m.toArray()); }
      return { count: mesh.count, matrices };
    }) };
  });
}

test('four-beat fox walking eases toward a diagonal trot while lofted necks and directional fur retain real planted contacts', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page, 'Habitat restoration');
  const samples = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, out: any = {};
    for (const branch of ['baseline', 'experiment']) w.__cueLabFrames[branch].forEach((frame: any, step: number) => {
      frame.foxes.forEach((pose: any, index: number) => {
        if (!pose.active || pose.pounce > .01) return;
        const gait = api.foxGait(pose, false, -1), sample = { branch, step, index, pose, gait };
        if (pose.stride > .2 && gait.blend === 0 && (!out.walk || pose.stride > out.walk.pose.stride)) out.walk = sample;
        if (!out.trot || gait.blend > out.trot.gait.blend) out.trot = sample;
      });
    });
    return out;
  });
  expect(samples.walk).toBeTruthy(); expect(samples.trot.gait.blend).toBeGreaterThan(.8);
  await choose(page, 'foxes', samples.walk);
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  const rigs: any = {};
  for (const label of ['walk', 'trot']) {
    await choose(page, 'foxes', samples[label]);
    const actual = await anatomy(page, 'foxes'); rigs[label] = actual;
    expect(actual.vertices).toBe(825); expect(actual.triangles).toBe(1536); expect(actual.error).toBeLessThan(1e-6); expect(actual.invalid).toBe(0);
    expect(actual.feet.filter((f: any) => f.contact).length).toBeGreaterThanOrEqual(label === 'walk' ? 3 : 2);
    for (const foot of actual.feet.filter((f: any) => f.contact)) expect(Math.abs(foot.gap - .002)).toBeLessThan(.008);
    expect(actual.sharedAlong).toBe(true); expect(actual.coat).toMatchObject({ width: 512, height: 256, bump: .002, distinctRelief: true, vertexColors: true });
    expect(actual.coat.colors).toBeGreaterThan(100); expect(actual.upright.hash).not.toBe(actual.coat.hash); expect(actual.colorSpread).toBeGreaterThan(.1);
    await meadow.getByRole('button', { name: 'Side view', exact: true }).click();
    await stage.screenshot({ path: `${reportDir}/fox-${label}-neck-coat.jpg`, type: 'jpeg', quality: 92 });
  }
  expect(new Set(rigs.walk.feet.map((f: any) => f.gait.offset)).size).toBe(4);
  await choose(page, 'foxes', samples.walk); expect(await anatomy(page, 'foxes')).toEqual(rigs.walk);
  await meadow.getByRole('button', { name: 'Face view', exact: true }).click();
  await stage.screenshot({ path: `${reportDir}/fox-face-coat.jpg`, type: 'jpeg', quality: 92 });
  await choose(page, 'rabbits', { branch: 'baseline', step: 0, index: 0 });
  const rabbit = await anatomy(page, 'rabbits');
  expect(rabbit.vertices).toBe(825); expect(rabbit.error).toBeLessThan(1e-6); expect(rabbit.coat.hash).not.toBe(rigs.walk.coat.hash);
  await meadow.getByRole('button', { name: 'Side view', exact: true }).click();
  await stage.screenshot({ path: `${reportDir}/rabbit-neck-coat.jpg`, type: 'jpeg', quality: 92 });
  await meadow.getByRole('button', { name: 'Face view', exact: true }).click();
  await stage.screenshot({ path: `${reportDir}/rabbit-face-coat.jpg`, type: 'jpeg', quality: 92 });
  await page.emulateMedia({ reducedMotion: 'reduce' }); const frozen = await anatomy(page, 'rabbits');
  await timeline.fill('160'); expect(await anatomy(page, 'rabbits')).toEqual(frozen);
  await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
});

test('a pursuit breakoff brakes then reorients around one fixed release point without displaying a live prey arrow', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page);
  const episode = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, frames = w.__cueLabFrames.baseline;
    let best: any = null;
    frames.forEach((frame: any, step: number) => frame.foxes.forEach((pose: any, index: number) => {
      if (pose.breakoffCue?.age !== 0) return;
      const samples = [];
      for (let k = step; k < Math.min(step + 10, frames.length); k++) {
        const next = frames[k].foxes[index]; if (!next.breakoffCue) break;
        samples.push({ branch: 'baseline', step: k, index, pose: next, previousFox: frames[k - 1].foxes[index], previousRabbit: frames[k - 1].rabbits[next.breakoffCue.index], why: api.explainBehavior('foxes', next), interaction: api.interaction(frames[k], 'foxes', index) });
      }
      const radialGain = samples.reduce((sum: number, sample: any) => {
        if (sample.pose.breakoffCue.age < 2) return sum;
        const cue = sample.pose.breakoffCue;
        return sum + Math.hypot(sample.pose.x - cue.x, sample.pose.z - cue.z) - Math.hypot(sample.previousFox.x - cue.x, sample.previousFox.z - cue.z);
      }, 0);
      if (!best || radialGain > best.radialGain) best = { samples, radialGain };
    }));
    return best?.samples;
  });
  expect(episode, 'the actual recording contains a pursuit release').toBeTruthy();
  expect(episode.length).toBeGreaterThanOrEqual(3); expect(episode.length).toBeLessThanOrEqual(10);
  const anchor = episode[0].pose.breakoffCue;
  expect(anchor.decisionDistance).toBeGreaterThan(2.2);
  expect(anchor.x).toBe(episode[0].previousRabbit.x); expect(anchor.z).toBe(episode[0].previousRabbit.z);
  let movement = 0, radialProjection = 0, radialGain = 0, headingChange = 0;
  for (const sample of episode) {
    const cue = sample.pose.breakoffCue;
    expect(sample.pose.state).toBe('Breaking off pursuit'); expect(sample.previousRabbit.state).toBe('Retreating');
    expect(cue.x).toBe(anchor.x); expect(cue.z).toBe(anchor.z); expect(cue.age).toBe(sample.step - episode[0].step);
    expect(cue.duration).toBe(10); expect(cue.stage).toBe(cue.age < 2 ? 'brake' : 'reorient');
    expect(sample.interaction).toBeNull(); expect(sample.why.cue).toBeNull();
    movement += Math.hypot(sample.pose.x - sample.previousFox.x, sample.pose.z - sample.previousFox.z);
    if (cue.age >= 2) {
      const x = sample.previousFox.x - anchor.x, z = sample.previousFox.z - anchor.z, length = Math.hypot(x, z) || 1;
      radialProjection += (sample.pose.x - sample.previousFox.x) * x / length + (sample.pose.z - sample.previousFox.z) * z / length;
      const gain = Math.hypot(sample.pose.x - anchor.x, sample.pose.z - anchor.z) - length;
      expect(gain, 'turning or avoiding terrain never advances this response toward the fixed released target').toBeGreaterThanOrEqual(-1e-10);
      radialGain += gain;
      headingChange += Math.abs(Math.atan2(Math.sin(sample.pose.yaw - sample.previousFox.yaw), Math.cos(sample.pose.yaw - sample.previousFox.yaw)));
    }
  }
  await test.info().attach('recorded-breakoff-motion', { body: JSON.stringify({ movement, radialProjection, radialGain, headingChange, samples: episode.map((sample: any) => ({ step: sample.step, index: sample.index, yaw: sample.pose.yaw, x: sample.pose.x, z: sample.pose.z, stage: sample.pose.breakoffCue.stage })) }), contentType: 'application/json' });
  expect(movement, 'braking can leave only a small displacement during this brief turn').toBeGreaterThan(1e-6);
  expect(radialProjection, 'after braking, the actual terrain-aware response takes an outward step from the fixed release point').toBeGreaterThan(1e-6);
  expect(radialGain).toBeGreaterThan(1e-6);
  expect(headingChange, 'the body visibly reorients during the recorded response').toBeGreaterThan(.1);
  await choose(page, 'foxes', episode[0]);
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  const why = meadow.locator('[data-efw-action-reason]'); await why.locator('summary').click();
  for (const sample of episode) {
    await timeline.fill(String(sample.step));
    await expect(canvas).toHaveAttribute('data-breakoff-cue', JSON.stringify(sample.pose.breakoffCue));
    await expect(canvas).toHaveAttribute('data-interaction-connector', 'false');
    await expect(why.locator('[data-efw-action-explanation]')).toHaveText(sample.why.text);
  }
  await stage.screenshot({ path: `${reportDir}/fox-pursuit-breakoff.jpg`, type: 'jpeg', quality: 92 });
  await meadow.getByRole('button', { name: 'Recent movement trail', exact: true }).click();
  await timeline.fill(String(episode[0].step)); const beginning = await anatomy(page, 'foxes'), beginningTrail = await trailMesh(page);
  expect(beginningTrail.visible).toBe(true);
  const endpoint = JSON.parse((await canvas.getAttribute('data-trail-end'))!);
  expect(endpoint.step).toBe(episode[0].step); expect(endpoint.x).toBeCloseTo(episode[0].pose.x, 8); expect(endpoint.z).toBeCloseTo(episode[0].pose.z, 8);
  await timeline.fill(String(episode.at(-1).step)); await timeline.fill(String(episode[0].step));
  expect(await anatomy(page, 'foxes')).toEqual(beginning);
  expect(await trailMesh(page)).toEqual(beginningTrail);
  await timeline.fill(String(episode.at(-1).step + 1)); await expect(canvas).toHaveAttribute('data-breakoff-cue', '');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  await expect(canvas).toHaveAttribute('data-breakoff-cue', '');
  expect((await trailMesh(page)).visible).toBe(false);
});

async function liveScene(page: Page) {
  return page.evaluate(() => {
    const w = window as any, scene = w.__glCanvas('[data-efw-meadow]').rec.scene, matrices: any[] = [];
    scene.children.filter((node: any) => node.visible && node.userData.body).forEach((animal: any) => animal.traverse((node: any) => matrices.push([node.name, node.matrixWorld.toArray()])));
    const canvas = document.querySelector('[data-efw-meadow] canvas')!;
    return JSON.stringify({ matrices, step: canvas.getAttribute('data-step'), actor: canvas.getAttribute('data-representative-index'), position: canvas.getAttribute('data-representative-position'), run: w.__toolData.ecosystem.foodWeb.run });
  });
}

async function probeCase(page: Page) {
  return page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, frames = w.__cueLabFrames.baseline, config = w.__toolData.ecosystem.foodWeb.run.config;
    const encounter = api.encounters(frames, config).find((e: any) => e.kind === 'spacing');
    const context = api.spacingProbeCase(frames, encounter);
    return context ? { encounter, context, distance: api.spacingProbeRun(context, 'distance', 2.5), feeding: api.spacingProbeRun(context, 'feeding', false) } : null;
  });
}

test('the cue bench tests detached original inputs, preserves first predictions and restores exact hypothetical evidence without changing live animals', async ({ page }) => {
  const ecologicalPrediction = 'A one-decision spacing test cannot show a modified trajectory or a population effect.';
  let views = await mount(page, 'Rabbit neighbors', ecologicalPrediction), saved: any = null, savedJSON = '', firstContext: any = null;
  const outcomes = new Set<string>();
  for (const cover of [10, 80]) {
    if (cover === 80) {
      await page.getByLabel('Starting refuge cover', { exact: true }).fill('80');
      await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
      views = await ready(page);
    }
    const fixture = await probeCase(page); expect(fixture, `cover ${cover} supplies a real onset input snapshot`).toBeTruthy();
    const { fieldwork, canvas, stage } = views;
    await fieldwork.locator('[data-efw-encounter="spacing"]').click();
    await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('avoid');
    await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
    const bench = fieldwork.locator('[data-efw-cue-probe]');
    await expect(bench).not.toHaveAttribute('open', '');
    await bench.locator('summary').focus(); await page.keyboard.press('Enter');
    await expect(bench).toHaveAttribute('open', '');
    await bench.getByRole('button', { name: 'Inspect the original cue decision', exact: true }).click();
    await expect(views.timeline).toHaveValue(String(fixture.context.step));
    const originalScene = await liveScene(page);
    await expect(bench.getByLabel('Cue test neighbor distance', { exact: true })).toHaveAttribute('step', 'any');
    expect(Number(await bench.getByLabel('Cue test neighbor distance', { exact: true }).inputValue())).toBeCloseTo(fixture.context.recorded.decisionDistance, 12);
    await expect(bench.getByRole('button', { name: 'Run unchanged-input control', exact: true })).toBeDisabled();
    await bench.getByLabel('Cue test prediction', { exact: true }).selectOption('continue');
    await bench.getByRole('button', { name: 'Run unchanged-input control', exact: true }).click();
    await expect(bench.locator('[data-efw-cue-probe-output]')).toContainText('The unchanged-input control reproduces the same spacing decision.'); outcomes.add('continue');
    const variable = cover === 10 ? 'distance' : 'feeding', trial = fixture[variable];
    await bench.getByLabel('Cue test variable', { exact: true }).selectOption(variable);
    if (variable === 'distance') await bench.getByLabel('Cue test neighbor distance', { exact: true }).fill('2.5');
    else await bench.getByLabel('Cue test neighbor action', { exact: true }).selectOption('resting');
    await expect(bench.locator('[data-efw-cue-probe-output]')).toHaveCount(0);
    expect((await liveScene(page)) === originalScene, 'changing bench inputs leaves every visible animal matrix and recorded cursor unchanged').toBe(true);
    await bench.getByRole('button', { name: 'Test this cue', exact: true }).click(); outcomes.add(trial.outcome);
    await expect(bench.locator('[data-efw-cue-probe-output]')).toContainText(trial.outcome === 'stop' ? 'No feeding neighbor triggers spacing' : 'A different recorded feeding neighbor now triggers spacing');
    await bench.getByLabel('Cue test prediction', { exact: true }).selectOption(trial.outcome);
    await bench.getByRole('button', { name: 'Test this cue again', exact: true }).click();
    await expect(bench.locator('[data-efw-cue-probe-output]')).toContainText('First cue-test prediction: Give space with the same neighbor.');
    await expect(bench.locator('[data-efw-cue-probe-output]')).toContainText('Your current prediction matches this rule result.');
    expect((await liveScene(page)) === originalScene, 'running the detached decision does not move recorded 3D animals').toBe(true);
    if (cover === 10) {
      firstContext = fixture.context;
      const reflection = 'I changed only the recorded neighbor input. The result describes one local rule decision and does not generate a changed route or a population outcome.';
      await bench.getByLabel('Cue test reflection', { exact: true }).fill(reflection);
      await fieldwork.getByLabel('Wildlife explanation', { exact: true }).fill('The original spacing encounter and its original wildlife prediction remain separate from this hypothetical input.');
      await fieldwork.getByLabel('Wildlife model limit', { exact: true }).fill('This is a detached decision test, not a modified animal trajectory.');
      await fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true }).click();
      saved = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[0]); savedJSON = JSON.stringify(saved);
      expect(saved.sighting.probe).toMatchObject({ version: 1, trial, prediction: trial.outcome, firstPrediction: 'continue', reflection });
      expect(saved.sighting.runPrediction).toBe(ecologicalPrediction);
      expect(saved.prediction).toContain('Give a feeding neighbor space');
      const text = await page.evaluate(() => (window as any).StemLab.ecosystemFoodWeb.notebookText((window as any).__toolData.ecosystem.foodWeb.notebook));
      expect(text).toContain(reflection); expect(text).toContain('not recorded animal positions');
      const inputLine = (label: string) => text.split('\n').find((line: string) => line.startsWith(label))?.slice(label.length);
      expect(JSON.parse(inputLine('Frozen original rule inputs (JSON): '))).toEqual(trial.context.input);
      expect(JSON.parse(inputLine('Frozen tested rule inputs (JSON): '))).toEqual(trial.modifiedInput);
      await bench.screenshot({ path: `${reportDir}/cue-bench-recorded-and-tested.jpg`, type: 'jpeg', quality: 92 });
      await stage.screenshot({ path: `${reportDir}/cue-bench-unchanged-live-scene.jpg`, type: 'jpeg', quality: 92 });
      await bench.getByRole('button', { name: 'Use original neighbor input', exact: true }).click();
      expect(Number(await bench.getByLabel('Cue test neighbor distance', { exact: true }).inputValue())).toBeCloseTo(fixture.context.recorded.decisionDistance, 12);
      await expect(bench.locator('[data-efw-cue-probe-output]')).toHaveCount(0);
      await bench.getByLabel('Cue test prediction', { exact: true }).selectOption('continue');
      await bench.getByRole('button', { name: 'Run unchanged-input control', exact: true }).click();
      await expect(bench.locator('[data-efw-cue-probe-output]')).toContainText('The unchanged-input control reproduces the same spacing decision.');
      expect((await liveScene(page)) === originalScene).toBe(true);
    } else {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(bench.locator('[data-efw-cue-probe-reduced]')).toBeVisible();
      await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
      await expect(bench.locator('[data-efw-cue-probe-output]')).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await bench.screenshot({ path: `${reportDir}/mobile-reduced-cue-bench.jpg`, type: 'jpeg', quality: 92 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
  }
  await page.locator('[data-efw-notebook]').getByRole('button', { name: 'Reopen observation 1', exact: true }).click();
  const bench = views.fieldwork.locator('[data-efw-cue-probe]');
  await expect(bench).toHaveAttribute('open', '');
  await expect(views.fieldwork.locator('.efw-fieldwork-feedback')).toContainText('Your prediction was “Give a feeding neighbor space”.');
  await expect(bench.getByLabel('Cue test prediction', { exact: true })).toHaveValue(saved.sighting.probe.prediction);
  await expect(bench.getByLabel('Cue test neighbor distance', { exact: true })).toHaveValue('2.5');
  await expect(bench.getByLabel('Cue test reflection', { exact: true })).toHaveValue(saved.sighting.probe.reflection);
  await expect(bench.locator('[data-efw-cue-probe-output]')).toContainText('First cue-test prediction: Give space with the same neighbor.');
  await bench.getByRole('button', { name: 'Inspect the original cue decision', exact: true }).click();
  await expect(views.timeline).toHaveValue(String(firstContext.step));
  await expect(page.getByLabel('Starting refuge cover', { exact: true })).toHaveValue('10');
  await expect(page.getByLabel('Your prediction (optional)', { exact: true })).toHaveValue(ecologicalPrediction);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(savedJSON);
  // Both selectable recorded encounters have one eligible feeding neighbor. The
  // alternate-neighbor branch is covered by the pure rule fixture, not fabricated here.
  expect(outcomes).toEqual(new Set(['continue', 'stop']));
});
