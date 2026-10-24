import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
const reportDir = 'reports/ecosystem-sampling-spacing';
test.describe.configure({ timeout: 300_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page);
  expect(errors, 'actual limb, spacing and sampling workflows have no uncaught errors').toEqual([]);
});

async function mount(page: Page, preset = 'Habitat restoration', prediction = '') {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white';
  });
  await page.getByRole('button', { name: preset, exact: true }).click();
  if (prediction) await page.getByLabel('Your prediction (optional)', { exact: true }).fill(prediction);
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const meadow = page.locator('[data-efw-meadow]');
  if (!(await meadow.isVisible())) await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  const initialized = await page.waitForFunction(() => {
    const region = document.querySelector('[data-efw-meadow]'), record = (window as any).__glCanvas?.('[data-efw-meadow]');
    if (record?.rec?.scene && record.rec.draws > 0 && region?.querySelector('canvas')?.hasAttribute('data-representative-index')) return 'ready';
    if (region?.textContent?.includes('3D is unavailable on this device.')) return 'unavailable';
    return false;
  }, undefined, { timeout: 45_000 });
  expect(await initialized.jsonValue(), 'the actual renderer initializes and draws before its controls are tested').toBe('ready');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  return {
    meadow, canvas: meadow.locator('canvas'), stage: meadow.locator('.efw-meadow-stage'),
    timeline: meadow.getByLabel('Meadow timeline', { exact: true }), comparisonTime: page.getByLabel('Food-web comparison time', { exact: true }),
    ethogram: meadow.locator('[data-efw-ethogram]'), fieldwork: meadow.locator('[data-efw-fieldwork]'),
  };
}

async function recordedFrames(page: Page) {
  return page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config, comparison = api.compare(config);
    w.__samplingSpacingFrames = { baseline: api.behaviorTimeline(config, comparison.baseline), experiment: api.behaviorTimeline(config, comparison.experiment) };
    return { config, run: JSON.stringify(w.__toolData.ecosystem.foodWeb.run) };
  });
}

async function chooseMammal(page: Page, id: string, sample: any) {
  const meadow = page.locator('[data-efw-meadow]');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption(sample.branch);
  await meadow.getByRole('button', { name: id === 'foxes' ? /Red foxes\s[\d.]/ : /Rabbits\s[\d.]/ }).click();
  await meadow.getByLabel('Meadow timeline', { exact: true }).fill(String(sample.step));
  const representatives = meadow.getByLabel('Representative animal', { exact: true });
  if ((await representatives.count()) === 0) await meadow.getByRole('button', { name: 'Inspect selected group', exact: true }).click();
  if (await representatives.isEnabled()) await representatives.selectOption(String(sample.index));
  const canvas = meadow.locator('canvas');
  await expect(canvas).toHaveAttribute('data-selected-species', id);
  await expect(canvas).toHaveAttribute('data-representative-index', String(sample.index));
  await expect(canvas).toHaveAttribute('data-step', String(sample.step));
}

async function limbRig(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const animals = scene.children.filter((a: any) => a.visible && a.userData.limbSkin?.name === `eco-${id}-limb-skin`);
    if (animals.length !== 1) throw new Error(`Expected one isolated ${id} skin, found ${animals.length}`);
    const animal = animals[0], d = animal.userData, skin = d.limbSkin, attr = skin.geometry.getAttribute('position'), normals = skin.geometry.getAttribute('normal');
    const layout = skin.geometry.userData.limbLayout, joints = JSON.parse(skin.userData.lastFit);
    const torsoMatrix = new T.Matrix4().multiplyMatrices(d.torso.parent.matrix, d.torso.matrix), origin = id === 'foxes' ? [-.10, .49, 0] : [-.12, .335, 0];
    torsoMatrix.multiply(new T.Matrix4().makeTranslation(-origin[0], -origin[1], 0));
    let maxError = 0, distalError = 0, invalidNormals = 0, invalidPositions = 0, seamError = 0;
    const endpoints = layout.map((part: any, k: number) => {
      const fitted = api.mammalLimbFit(id, part.hind, joints[k]);
      const positions = fitted.positions || fitted, original = positions.slice();
      api.mammalLimbAttachment(id, part.hind, joints[k], torsoMatrix.elements, positions, 0, part.side);
      for (let v = 5 * 13; v < 221; v++) for (let axis = 0; axis < 3; axis++) distalError = Math.max(distalError, Math.abs(attr.array[(part.start + v) * 3 + axis] - original[v * 3 + axis]));
      const socket = positions.slice(221 * 3, 222 * 3);
      let ikHip;
      if (id === 'foxes') ikHip = new T.Vector3().setFromMatrixPosition(d.legs[k].userData.rig.upper.matrixWorld).applyMatrix4(new T.Matrix4().copy(d.body.matrixWorld).invert()).toArray();
      else { const bone = new T.Matrix4(); d.rabbitLimbs.getMatrixAt(k * 2, bone); const m = bone.elements, length = Math.hypot(m[4], m[5], m[6]), scale = 1 - .012 / length; ikHip = [m[12] - m[4] * scale, m[13] - m[5] * scale, m[14] - m[6] * scale]; }
      for (let v = 0; v < part.count; v++) for (let axis = 0; axis < 3; axis++) maxError = Math.max(maxError, Math.abs(attr.array[(part.start + v) * 3 + axis] - positions[v * 3 + axis]));
      const hip = new T.Vector3().fromBufferAttribute(attr, part.hipVertex).toArray(), paw = new T.Vector3().fromBufferAttribute(attr, part.pawVertex).toArray(), knee = [0, 0, 0];
      for (let side = 0; side < 12; side++) for (let axis = 0; axis < 3; axis++) knee[axis] += attr.array[(part.start + 8 * 13 + side) * 3 + axis] / 12;
      for (let ring = 0; ring < 17; ring++) {
        const first = part.start + ring * 13, last = first + 12;
        for (let axis = 0; axis < 3; axis++) seamError = Math.max(seamError, Math.abs(normals.array[first * 3 + axis] - normals.array[last * 3 + axis]));
      }
      return { ...part, hip, socket, ikHip, knee, paw, target: joints[k] };
    });
    for (let k = 0; k < attr.count; k++) {
      if (![attr.getX(k), attr.getY(k), attr.getZ(k)].every(Number.isFinite)) invalidPositions++;
      const length = Math.hypot(normals.getX(k), normals.getY(k), normals.getZ(k));
      if (!Number.isFinite(length) || Math.abs(length - 1) > 1e-4) invalidNormals++;
    }
    const feet = (id === 'foxes' ? d.legs : d.paws).map((leg: any) => {
      const mesh = id === 'foxes' ? leg.userData.rig.paw.children.find((p: any) => p.isMesh) : leg.userData.paw;
      const center = new T.Vector3().setFromMatrixPosition(mesh.matrixWorld), m = mesh.matrixWorld.elements;
      return { center: center.toArray(), gap: center.y - Math.hypot(m[1], m[5], m[9]) - api.groundHeight(center.x, center.z) };
    });
    const base = d.torso.userData.baseScale;
    return { name: skin.name, vertices: attr.count, triangles: skin.geometry.index.count / 3, layout, endpoints, maxError, distalError, invalidPositions, invalidNormals, seamError, feet, bodyScale: d.body.scale.toArray(), ribScaleY: d.torso.scale.y / base.y, ribScaleZ: d.torso.scale.z / base.z, ribRoll: d.mammalParts.back.rotation.x, positions: Array.from(attr.array), oldRabbitLimbsVisible: id === 'rabbits' ? d.rabbitLimbs?.visible : null };
  }, id);
}

function expectSameRig(actual: any, expected: any) {
  expect(actual.positions.length).toBe(expected.positions.length);
  expect(actual.positions.every((value: number, k: number) => value === expected.positions[k]), 'every actual skin vertex rewinds exactly').toBe(true);
  const current = { ...actual }, prior = { ...expected };
  delete current.positions; delete prior.positions;
  expect(current).toEqual(prior);
}

test('continuous muscle skins follow four actual joint chains and planted soles while recorded breathing stays in the torso', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page);
  const run = await recordedFrames(page);
  const targets = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, out: any = { foxes: {}, rabbits: {} };
    for (const branch of ['baseline', 'experiment']) w.__samplingSpacingFrames[branch].forEach((frame: any, step: number) => {
      for (const id of ['foxes', 'rabbits']) frame[id].forEach((pose: any, index: number) => {
        if (!pose.active) return;
        const art = api.mammalArticulation(id, pose, false), sample = { branch, step, index, pose, art }, choice = out[id];
        if (!choice.walk && pose.stride > .25 && art.supportFeet > 0 && art.supportFeet < 4 && art.flightLift === 0 && (pose.pounce || 0) < .01) choice.walk = sample;
        if (!choice.flight && ((id === 'foxes' && pose.pounce > .8) || (id === 'rabbits' && art.supportFeet === 0 && art.flightLift > .08))) choice.flight = sample;
        if (pose.state === 'Resting' && art.supportFeet === 4 && index === 0) {
          if (!choice.inhale || art.ribScaleY > choice.inhale.art.ribScaleY) choice.inhale = sample;
          if (!choice.exhale || art.ribScaleY < choice.exhale.art.ribScaleY) choice.exhale = sample;
        }
      });
    });
    return out;
  });
  await meadow.getByRole('button', { name: 'Inspect selected group', exact: true }).click();
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  for (const id of ['foxes', 'rabbits']) {
    const recorded: any = {};
    for (const label of ['walk', 'flight', 'inhale', 'exhale']) {
      const sample = targets[id][label];
      expect(sample, `${id} has an actual recorded ${label}`).toBeTruthy();
      await chooseMammal(page, id, sample);
      const actual = await limbRig(page, id);
      expect(actual.vertices).toBe(892);
      expect(actual.triangles).toBe(1632);
      expect(actual.layout).toHaveLength(4);
      expect(actual.maxError).toBeLessThan(2e-6);
      expect(actual.distalError).toBeLessThan(2e-6);
      expect(actual.invalidPositions).toBe(0);
      expect(actual.invalidNormals).toBe(0);
      expect(actual.seamError).toBeLessThan(1e-5);
      for (const limb of actual.endpoints) {
        expect(limb.count).toBe(223);
        for (const part of ['knee', 'paw'] as const) for (let axis = 0; axis < 3; axis++) expect(limb[part][axis]).toBeCloseTo(limb.target[part][axis], 5);
        for (let axis = 0; axis < 3; axis++) { expect(limb.ikHip[axis]).toBeCloseTo(limb.target.hip[axis], 5); expect(limb.hip[axis]).toBeCloseTo(limb.socket[axis], 5); }
      }
      expect(actual.ribScaleY).toBeCloseTo(sample.art.ribScaleY, 10);
      expect(actual.ribScaleZ).toBeCloseTo(sample.art.ribScaleZ, 10);
      expect(actual.ribRoll).toBeCloseTo(sample.art.ribRoll, 10);
      if (label === 'inhale' || label === 'exhale') for (const foot of actual.feet) expect(Math.abs(foot.gap - .002)).toBeLessThan(.008);
      if (label === 'flight') for (const foot of actual.feet) expect(foot.gap).toBeGreaterThan(id === 'foxes' ? .12 : .07);
      recorded[label] = actual;
      await meadow.getByRole('button', { name: 'Side view', exact: true }).click();
      await stage.screenshot({ path: `${reportDir}/${id}-${label}-muscle-skins.jpg`, type: 'jpeg', quality: 92 });
    }
    expect(recorded.inhale.ribScaleY - recorded.exhale.ribScaleY).toBeGreaterThan(.02);
    expect(recorded.inhale.bodyScale).toEqual(recorded.exhale.bodyScale);
    expect(recorded.walk.positions).not.toEqual(recorded.flight.positions);
    await chooseMammal(page, id, targets[id].flight);
    expectSameRig(await limbRig(page, id), recorded.flight);
    // Representative zero remains present as the census changes. A later
    // sample may legitimately remove a higher numbered representative.
    await chooseMammal(page, id, { branch: 'baseline', step: 0, index: 0 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
    const frozen = await limbRig(page, id);
    expect(frozen.ribScaleY).toBeCloseTo(1, 10);
    expect(frozen.ribScaleZ).toBeCloseTo(1, 10);
    expect(frozen.ribRoll).toBeCloseTo(0, 10);
    await timeline.fill('160');
    expectSameRig(await limbRig(page, id), frozen);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(canvas).not.toHaveAttribute('data-behavior', 'Starting pose');
  }
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(run.run);
});

test('feeding neighbors produce a real same-species spacing encounter with distinct representatives, measurable gaps and restorable field evidence', async ({ page }) => {
  const prediction = 'A brief spacing movement between two rabbits does not establish a change in their population biomass.';
  const { meadow, canvas, stage, fieldwork, timeline, comparisonTime } = await mount(page, 'Rabbit neighbors', prediction);
  const run = await recordedFrames(page);
  const recording = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, frames = w.__samplingSpacingFrames.baseline, config = w.__toolData.ecosystem.foodWeb.run.config;
    const encounter = api.encounters(frames, config).find((e: any) => e.kind === 'spacing');
    if (!encounter) return null;
    const pose = frames[encounter.step].rabbits[encounter.actor.index], neighbor = frames[encounter.step].rabbits[encounter.cue.index];
    const previous = frames[encounter.step - 1].rabbits[encounter.cue.index];
    const steps = [encounter.before, encounter.step, encounter.after], evidence = api.pairEvidence(frames, encounter, steps);
    return { encounter, pose, neighbor, previous, steps, evidence, reason: api.explainBehavior('rabbits', pose).text, rabbitDietLink: api.links.some((link: any) => link.consumer === 'rabbits' && link.food === 'rabbits') };
  });
  expect(recording, 'the actual Rabbit neighbors recording contains a sustained spacing encounter').toBeTruthy();
  const recorded = recording!;
  expect(recorded.encounter.actor.id).toBe('rabbits');
  expect(recorded.encounter.cue.id).toBe('rabbits');
  expect(recorded.encounter.cue.index).toBeLessThan(recorded.encounter.actor.index);
  expect(recorded.pose.state).toBe('Giving space');
  expect(recorded.neighbor.active).toBe(true);
  expect(recorded.previous.active).toBe(true);
  expect(recorded.neighbor.state).toBe('Grazing');
  expect(recorded.previous.foodAvailable).toBe(true);
  expect(recorded.pose.spacingCue.index).toBe(recorded.encounter.cue.index);
  expect(recorded.rabbitDietLink).toBe(false);
  expect(recorded.evidence).toBeTruthy();
  await fieldwork.locator('[data-efw-encounter="spacing"]').click();
  await expect(fieldwork.getByLabel('Wildlife prediction', { exact: true }).getByRole('option', { name: 'Give a feeding neighbor space', exact: true })).toHaveCount(1);
  await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('avoid');
  await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
  await expect(fieldwork).toContainText('The recorded action fits that description.');
  await expect(canvas).toHaveAttribute('data-behavior', 'Giving space');
  await expect(canvas).toHaveAttribute('data-selected-species', 'rabbits');
  await expect(canvas).toHaveAttribute('data-representative-index', String(recorded.encounter.actor.index));
  await expect(canvas).toHaveAttribute('data-interaction-cue', `rabbits:${recorded.encounter.cue.index}`);
  await expect(canvas).toHaveAttribute('data-interaction-connector', 'true');
  await expect(canvas).toHaveAttribute('data-spacing-cue', JSON.stringify(recorded.pose.spacingCue));
  const reason = meadow.locator('[data-efw-action-reason]');
  await reason.locator('summary').click();
  await expect(reason.locator('[data-efw-action-explanation]')).toHaveText(recorded.reason);
  await expect(reason).toContainText('does not establish dominance');
  await stage.screenshot({ path: `${reportDir}/feeding-neighbors-spacing.jpg`, type: 'jpeg', quality: 92 });
  const lab = fieldwork.locator('[data-efw-pair-lab]');
  await lab.locator('summary').click();
  await expect(canvas).toHaveAttribute('data-field-ruler', 'true');
  for (let k = 0; k < 3; k++) {
    await lab.getByLabel('Pair measurement time', { exact: true }).fill(String(recorded.steps[k]));
    await expect(timeline).toHaveValue(String(recorded.steps[k]));
    await expect(comparisonTime).toHaveValue(String(recorded.steps[k]));
    await expect(canvas).toHaveAttribute('data-field-ruler', 'true');
    expect(Number(await canvas.getAttribute('data-field-ruler-gap'))).toBeCloseTo(recorded.evidence.samples[k].gap, 8);
    await lab.getByRole('button', { name: `Record current sample as ${'ABC'[k]}`, exact: true }).click();
  }
  await lab.getByLabel('Pair gap claim', { exact: true }).selectOption(recorded.evidence.trend);
  await lab.getByRole('button', { name: 'Check my gap evidence', exact: true }).click();
  await expect(lab.locator('[data-efw-pair-feedback]')).toContainText('Your claim matches these measured samples.');
  await lab.getByLabel('Pair measurement reflection', { exact: true }).fill('I measured the same two rabbits at all three checkpoints. A changing gap describes their positions, not a dominance hierarchy.');
  await fieldwork.getByLabel('Wildlife explanation', { exact: true }).fill('One rabbit slowly gives its feeding neighbor space while that distinct neighbor continues grazing.');
  await fieldwork.getByLabel('Wildlife model limit', { exact: true }).fill('This presentation rule does not model dominance or change food intake or biomass.');
  await fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true }).click();
  const note = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[0]);
  expect(note.sighting).toMatchObject({ kind: 'spacing', branch: 'baseline', actorIndex: recorded.encounter.actor.index, cueId: 'rabbits', cueIndex: recorded.encounter.cue.index, state: 'Giving space', runPrediction: prediction });
  expect(note.sighting.measurement.samples).toEqual(recorded.evidence.samples);
  expect(note.prediction).toContain('Give a feeding neighbor space');
  const saved = JSON.stringify(note);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-field-ruler', 'false');
  await expect(canvas).toHaveAttribute('data-interaction-connector', 'false');
  await expect(lab.getByRole('img', { name: 'Measured gap against time', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await lab.screenshot({ path: `${reportDir}/mobile-spacing-evidence.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('experiment');
  await page.locator('[data-efw-notebook]').getByRole('button', { name: 'Reopen observation 1', exact: true }).click();
  await expect(meadow.getByLabel('Meadow scene data', { exact: true })).toHaveValue('baseline');
  await expect(canvas).toHaveAttribute('data-selected-species', 'rabbits');
  await expect(canvas).toHaveAttribute('data-representative-index', String(recorded.encounter.actor.index));
  await expect(timeline).toHaveValue(String(recorded.steps[2]));
  await expect(canvas).toHaveAttribute('data-field-ruler', 'true');
  await expect(page.getByLabel('Your prediction (optional)', { exact: true })).toHaveValue(prediction);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(saved);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(run.run);
});

async function codeSheet(page: Page, plan: any, codes: string[]) {
  const ethogram = page.locator('[data-efw-ethogram]');
  for (let k = 0; k < 5; k++) {
    const card = ethogram.locator(`[data-efw-ethogram-sample="${k}"]`);
    await card.getByRole('button', { name: `Inspect ethogram sample ${k + 1}`, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Meadow timeline', { exact: true })).toHaveValue(String(plan.samples[k].step));
    const returnButton = page.locator('[data-efw-observation-dock]').getByRole('button', { name: `Code ethogram sample ${k + 1}`, exact: true });
    await expect(returnButton).toBeFocused();
    await returnButton.press('Enter');
    const select = ethogram.getByLabel(`Ethogram sample ${k + 1} code`, { exact: true });
    await expect(select).toBeFocused();
    await select.selectOption(codes[k]);
  }
  await ethogram.getByRole('button', { name: 'Check my ethogram', exact: true }).click();
}

test('a one-variable second sampling plan preserves both coding sheets and original category predictions through navigation, revision and reopening', async ({ page }) => {
  const prediction = 'I predict more cover reduces predator access; these individual sampling sheets cannot establish a population effect.';
  const { meadow, canvas, stage, ethogram, timeline } = await mount(page, 'Habitat restoration', prediction);
  const run = await recordedFrames(page);
  const fixture = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, branch = 'experiment', frames = w.__samplingSpacingFrames[branch];
    const sheet = (plan: any) => ({ version: 1, branch, species: plan.species, index: plan.index, start: plan.start, interval: plan.interval, samples: plan.samples, codes: plan.samples.map((s: any) => s.category), firstCodes: plan.samples.map((s: any) => s.category), reflection: '' });
    let chosen: any = null;
    for (const id of ['rabbits', 'foxes']) for (let start = 0; start <= 120; start += 10) for (const interval of [5, 10, 15, 20]) {
      const first = api.ethogramPlan(frames, id, 0, start, interval), second = api.ethogramPlan(frames, id, 0, start + interval, interval);
      if (!first || !second) continue;
      const comparison = api.samplingComparison(sheet(first), sheet(second)), changed = comparison?.rows.find((r: any) => r.delta !== 0);
      if (!changed) continue;
      const variety = new Set(first.samples.concat(second.samples).map((s: any) => s.category)).size;
      if (!chosen || variety > chosen.variety) chosen = { branch, id, index: 0, step: first.start, first, second, comparison, firstCategory: changed.id, firstExpected: changed.delta > 0 ? 'higher' : 'lower', variety };
    }
    if (!chosen) return null;
    chosen.categories = api.ethogramCategories();
    chosen.wrongPrediction = chosen.firstExpected === 'higher' ? 'lower' : 'higher';
    chosen.latestCategory = chosen.comparison.rows.find((r: any) => r.id !== chosen.firstCategory).id;
    const latest = chosen.comparison.rows.find((r: any) => r.id === chosen.latestCategory);
    chosen.latestPrediction = latest.delta > 0 ? 'higher' : latest.delta < 0 ? 'lower' : 'same';
    return chosen;
  });
  expect(fixture, 'the actual recording supports two overlapping windows with different sampled categories').toBeTruthy();
  expect(fixture.comparison.overlapSteps).toHaveLength(4);
  await chooseMammal(page, fixture.id, fixture);
  await ethogram.locator('summary').first().click();
  await ethogram.getByLabel('Ethogram start time', { exact: true }).fill(String(fixture.first.start));
  await ethogram.getByLabel('Ethogram sampling interval', { exact: true }).fill(String(fixture.first.interval));
  await ethogram.getByRole('button', { name: 'Set sampling plan', exact: true }).click();
  const firstCodes = fixture.first.samples.map((s: any) => s.category);
  await codeSheet(page, fixture.first, firstCodes);
  await page.setViewportSize({ width: 390, height: 844 });
  await ethogram.getByRole('button', { name: 'Check revised ethogram', exact: true }).click();
  const referenceEntry = await ethogram.getByRole('button', { name: 'Keep this sheet as a sampling reference', exact: true }).evaluate(node => {
    const box = node.getBoundingClientRect();
    return { y: box.y, bottom: box.bottom, viewportHeight: innerHeight, width: box.width };
  });
  await test.info().attach('reference-entry-after-mobile-sheet-check', { body: JSON.stringify(referenceEntry), contentType: 'application/json' });
  const firstReflection = await ethogram.getByLabel('Ethogram reflection', { exact: true }).boundingBox();
  const firstSave = await ethogram.getByRole('button', { name: 'Save ethogram observation', exact: true }).boundingBox();
  expect(referenceEntry.y).toBeGreaterThan(firstReflection!.y + firstReflection!.height);
  expect(referenceEntry.bottom).toBeLessThanOrEqual(firstSave!.y);
  await page.screenshot({ path: `${reportDir}/mobile-reference-entry-after-check.jpg`, type: 'jpeg', quality: 92 });
  await page.setViewportSize({ width: 1140, height: 1050 });
  const referenceReflection = 'I used the same behavior key at five fixed checkpoints for the reference sheet.';
  await ethogram.getByLabel('Ethogram reflection', { exact: true }).fill(referenceReflection);
  await ethogram.getByRole('button', { name: 'Keep this sheet as a sampling reference', exact: true }).click();
  const comparison = ethogram.locator('[data-efw-sampling-comparison]');
  await expect(comparison).toBeVisible();
  await expect(comparison.getByLabel('Sampling comparison variable', { exact: true })).toBeFocused();
  await expect(ethogram.getByRole('button', { name: 'Replace with this sampling plan', exact: true })).toHaveCount(0);
  await expect(ethogram.getByLabel('Ethogram sampling interval', { exact: true })).toBeDisabled();
  await expect(ethogram.getByLabel('Ethogram start time', { exact: true })).toBeEnabled();
  await expect(comparison.getByRole('button', { name: 'Collect comparison sheet', exact: true })).toBeDisabled();
  await ethogram.getByLabel('Ethogram start time', { exact: true }).fill(String(fixture.second.start));
  await comparison.getByLabel('Sampling comparison behavior', { exact: true }).selectOption(fixture.firstCategory);
  await comparison.getByLabel('Sampling comparison prediction', { exact: true }).selectOption(fixture.wrongPrediction);
  await expect(comparison.locator('[data-efw-sampling-results]')).toHaveCount(0);
  await comparison.getByRole('button', { name: 'Collect comparison sheet', exact: true }).click();
  await expect(ethogram.getByLabel('Ethogram start time', { exact: true })).toBeDisabled();
  await expect(ethogram.getByLabel('Ethogram sampling interval', { exact: true })).toBeDisabled();
  const secondCodes = fixture.second.samples.map((s: any) => s.category), submittedCodes = secondCodes.slice();
  submittedCodes[0] = fixture.categories.find((category: any) => category.id !== secondCodes[0]).id;
  await codeSheet(page, fixture.second, submittedCodes);
  await expect(ethogram.locator('[data-efw-ethogram-feedback]')).toContainText('4 of 5 current codes match');
  await ethogram.getByLabel('Ethogram sample 1 code', { exact: true }).selectOption(secondCodes[0]);
  await ethogram.getByRole('button', { name: 'Check revised ethogram', exact: true }).click();
  await expect(ethogram.locator('[data-efw-ethogram-feedback]')).toContainText('First submission: 4 of 5 codes matched.');
  const results = comparison.locator('[data-efw-sampling-results]');
  const secondReflection = await ethogram.getByLabel('Ethogram reflection', { exact: true }).boundingBox();
  const comparisonBounds = await comparison.boundingBox();
  expect(comparisonBounds!.y).toBeGreaterThan(secondReflection!.y + secondReflection!.height);
  await expect(results).toContainText('Changed variable: start time only');
  await expect(results).toContainText('share 4 checkpoints');
  await expect(results).toContainText('These are reused observations of the same recording.');
  await expect(comparison.locator('[data-efw-sampling-prediction-feedback]')).toContainText('revise your prediction');
  for (const expected of fixture.comparison.rows) {
    const row = results.getByRole('row', { name: new RegExp(`^${expected.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `) });
    const cells = row.getByRole('cell');
    await expect(cells.nth(0)).toContainText(expected.reference + '/5');
    await expect(cells.nth(1)).toContainText(expected.current + '/5');
    await expect(cells.nth(2)).toHaveText((expected.delta >= 0 ? '+' : '') + expected.delta);
  }
  await comparison.getByLabel('Sampling comparison behavior', { exact: true }).selectOption(fixture.latestCategory);
  await comparison.getByLabel('Sampling comparison prediction', { exact: true }).selectOption(fixture.latestPrediction);
  await expect(comparison.locator('[data-efw-sampling-prediction-feedback]')).toContainText('Your current prediction matches');
  const reflection = 'Only the start time changed. Four checkpoints were reused from the same representative recording, so the sheets are not independent animals or elapsed-time budgets.';
  await comparison.getByLabel('Sampling comparison reflection', { exact: true }).fill(reflection);
  await ethogram.getByRole('button', { name: 'Save ethogram observation', exact: true }).click();
  const note = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[0]);
  expect(note.ethogram).toMatchObject({ branch: fixture.branch, species: fixture.id, index: 0, start: fixture.second.start, interval: fixture.second.interval, samples: fixture.second.samples, firstCodes: submittedCodes, codes: secondCodes, runPrediction: prediction });
  expect(note.ethogram.reference).toMatchObject({ start: fixture.first.start, interval: fixture.first.interval, samples: fixture.first.samples, firstCodes, codes: firstCodes, reflection: referenceReflection });
  expect(note.ethogram.comparison).toMatchObject({ variable: 'start', firstCategory: fixture.firstCategory, firstPrediction: fixture.wrongPrediction, category: fixture.latestCategory, prediction: fixture.latestPrediction, reflection });
  const saved = JSON.stringify(note);
  const exported = await page.evaluate(() => (window as any).StemLab.ecosystemFoodWeb.notebookText((window as any).__toolData.ecosystem.foodWeb.notebook));
  expect(exported).toContain(referenceReflection);
  expect(exported).toContain(reflection);
  expect(exported).toContain(prediction);
  for (const sample of fixture.first.samples.concat(fixture.second.samples)) expect(exported).toContain(sample.state);
  await comparison.screenshot({ path: `${reportDir}/sampling-comparison.jpg`, type: 'jpeg', quality: 92 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(ethogram.locator('[data-efw-ethogram-recorded-description]')).toHaveCount(5);
  const frozen = await canvas.getAttribute('data-representative-position');
  await ethogram.getByRole('button', { name: 'Inspect ethogram sample 1', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-representative-position', frozen!);
  await expect(meadow.locator('[data-efw-observation-dock]')).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await comparison.screenshot({ path: `${reportDir}/mobile-sampling-comparison.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  await expect(ethogram.locator('[data-efw-sampling-comparison]')).toHaveCount(0);
  await page.locator('[data-efw-notebook]').getByRole('button', { name: 'Reopen observation 1', exact: true }).click();
  await expect(meadow.getByLabel('Meadow scene data', { exact: true })).toHaveValue(fixture.branch);
  await expect(canvas).toHaveAttribute('data-selected-species', fixture.id);
  await expect(canvas).toHaveAttribute('data-representative-index', '0');
  await expect(timeline).toHaveValue(String(note.step));
  await expect(comparison.locator('[data-efw-sampling-results]')).toBeVisible();
  await expect(comparison.getByLabel('Sampling comparison behavior', { exact: true })).toHaveValue(fixture.latestCategory);
  await expect(comparison.getByLabel('Sampling comparison prediction', { exact: true })).toHaveValue(fixture.latestPrediction);
  await expect(comparison.getByLabel('Sampling comparison reflection', { exact: true })).toHaveValue(reflection);
  await expect(page.getByLabel('Your prediction (optional)', { exact: true })).toHaveValue(prediction);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(saved);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(run.run);
  await stage.screenshot({ path: `${reportDir}/reopened-sampling-scene.jpg`, type: 'jpeg', quality: 92 });
});
