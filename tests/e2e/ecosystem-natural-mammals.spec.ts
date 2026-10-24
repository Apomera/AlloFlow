import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem',
  width: 1100, height: 900, appStyles: true,
});
const reportDir = 'reports/ecosystem-natural-mammals';

test.describe.configure({ timeout: 210_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page);
  expect(errors, 'uncaught errors in the actual local mammal workflows').toEqual([]);
});

async function mount(page: Page, preset = 'Insect food shortage', prediction = '') {
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
  expect(await initialized.jsonValue(), 'the actual page-created meadow renderer must initialize and draw before exercising its controls').toBe('ready');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  return {
    meadow, canvas: meadow.locator('canvas'), stage: meadow.locator('.efw-meadow-stage'),
    study: meadow.locator('[data-efw-movement-study]'), fieldwork: meadow.locator('[data-efw-fieldwork]'),
    timeline: meadow.getByLabel('Meadow timeline', { exact: true }),
    comparisonTime: page.getByLabel('Food-web comparison time', { exact: true }),
  };
}

function groupName(id: string) { return id === 'foxes' ? /Red foxes\s[\d.]/ : /Rabbits\s[\d.]/; }

async function chooseSample(page: Page, id: string, sample: { step: number; index: number; branch?: string }) {
  const meadow = page.locator('[data-efw-meadow]'), canvas = meadow.locator('canvas');
  if (sample.branch) await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption(sample.branch);
  await meadow.getByRole('button', { name: groupName(id) }).click();
  await meadow.getByLabel('Meadow timeline', { exact: true }).fill(String(sample.step));
  const representative = meadow.getByLabel('Representative animal', { exact: true });
  if (await representative.isEnabled()) await representative.selectOption(String(sample.index));
  else await expect(representative).toHaveValue(String(sample.index));
  await expect(canvas).toHaveAttribute('data-selected-species', id);
  await expect(canvas).toHaveAttribute('data-representative-index', String(sample.index));
  await expect(canvas).toHaveAttribute('data-step', String(sample.step));
}

// The test discovers recorded behavior instead of supplying artificial animals,
// poses, event times or model output to the scene.
async function mammalSamples(page: Page) {
  return page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config;
    const comparison = api.compare(config), branches: any = {}, targets: any = { foxes: {}, rabbits: {} };
    for (const branch of ['baseline', 'experiment']) branches[branch] = api.behaviorTimeline(config, comparison[branch]);
    w.__naturalMammalFrames = branches;
    for (const branch of ['baseline', 'experiment']) branches[branch].forEach((frame: any, step: number) => {
      for (const id of ['foxes', 'rabbits']) frame[id].forEach((pose: any, index: number) => {
        if (!pose.active) return;
        const art = api.mammalArticulation(id, pose, false), posture = api.mammalPosture(id, pose);
        const sample = { branch, step, index, art, posture, pose }, out = targets[id];
        if ((pose.pounce || 0) < 0.01 && pose.stride > 0.25 && art.supportFeet > 0 && art.flightLift === 0 && (!out.walk || Math.abs(art.spineFlex) > Math.abs(out.walk.art.spineFlex))) out.walk = sample;
        if (!out.rest || posture.settle > out.rest.posture.settle) out.rest = sample;
        if (id === 'foxes' && pose.pounce > 0.8 && (!out.flight || pose.pounce > out.flight.pose.pounce)) out.flight = sample;
        if (id === 'rabbits' && art.supportFeet === 0 && art.flightLift > 0.01 && (!out.flight || art.flightLift > out.flight.art.flightLift)) out.flight = sample;
      });
    });
    for (const id of ['foxes', 'rabbits']) {
      const flight = targets[id].flight;
      if (!flight) continue;
      const frames = branches[flight.branch];
      let ground: any = null;
      frames.forEach((frame: any, step: number) => {
        const pose = frame[id][flight.index];
        if (!pose.active || pose.pounce > 0.01) return;
        const art = api.mammalArticulation(id, pose, false);
        if (art.supportFeet === 4 && art.flightLift === 0 && (!ground || Math.abs(step - flight.step) < Math.abs(ground.step - flight.step))) ground = { branch: flight.branch, step, index: flight.index, pose, art, posture: api.mammalPosture(id, pose) };
      });
      targets[id].ground = ground;
    }
    return { ...targets, run: JSON.stringify(w.__toolData.ecosystem.foodWeb.run) };
  });
}

// Inspect the real source meshes/joints after three.js updates matrixWorld.
// This does not create a GL context or replace the renderer's animation path.
async function mammalRig(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb;
    const scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const animals = scene.children.filter((animal: any) => animal.visible && animal.userData.mammalParts && (id === 'foxes' ? animal.userData.legs : animal.userData.paws));
    if (animals.length !== 1) throw new Error(`Expected one isolated ${id}, found ${animals.length}`);
    const animal = animals[0], data = animal.userData;
    const canvas = document.querySelector('[data-efw-meadow] canvas')!;
    const step = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Number(canvas.getAttribute('data-step'));
    const pose = w.__naturalMammalFrames[canvas.getAttribute('data-branch')!][step][id][Number(canvas.getAttribute('data-representative-index'))];
    const read = (part: any) => ({ name: part.name, matrix: Array.from(part.matrix.elements), world: Array.from(part.matrixWorld.elements), position: part.position.toArray(), scale: part.scale.toArray(), rotation: [part.rotation.x, part.rotation.y, part.rotation.z], home: part.userData.home?.toArray() });
    const parts: any = {};
    Object.keys(data.mammalParts).forEach(name => { parts[name] = read(data.mammalParts[name]); });
    const feet = (id === 'foxes' ? data.legs : data.paws).map((leg: any) => {
      const mesh = id === 'foxes' ? leg.userData.rig.paw.children.find((part: any) => part.isMesh) : leg.userData.paw;
      const center = new T.Vector3().setFromMatrixPosition(mesh.matrixWorld), elements = mesh.matrixWorld.elements;
      const sole = Math.hypot(elements[1], elements[5], elements[9]);
      const foot = api.footPose(id, pose, leg.userData.hind, leg.userData.side), contact = (pose.pounce || 0) < 0.01 && !(foot.swing && pose.stride > 0.015);
      return { ...read(mesh), hind: leg.userData.hind, side: leg.userData.side, contact, center: center.toArray(), sole, gap: center.y - sole - api.groundHeight(center.x, center.z) };
    });
    return { body: read(data.body), head: read(data.head), ears: data.ears.map(read), parts, tail: read(data.tail), tailTip: data.tail.userData.distal ? read(data.tail.userData.distal) : null, tailAttached: !data.tail.userData.distal || data.tail.userData.distal.parent === data.tail, feet };
  }, id);
}

test('fox and rabbit body joints articulate while real soles stay planted, fast rabbits share a flight phase and every pose rewinds exactly', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page, 'Habitat restoration');
  const targets = await mammalSamples(page);
  await meadow.getByRole('button', { name: 'Inspect selected group', exact: true }).click();
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  for (const id of ['foxes', 'rabbits']) {
    const samples = targets[id];
    for (const label of ['walk', 'ground', 'flight', 'rest']) expect(samples[label], `${id} has an actual recorded ${label}`).toBeTruthy();
    expect(samples.rest.posture.settle).toBeGreaterThan(0.85);
    if (id === 'rabbits') { expect(samples.flight.art.supportFeet).toBe(0); expect(samples.flight.art.flightLift).toBeGreaterThan(0.08); }
    const poses: any = {};
    for (const label of ['ground', 'walk', 'flight', 'rest']) {
      const sample = samples[label];
      await chooseSample(page, id, sample);
      await meadow.getByRole('button', { name: 'Side view', exact: true }).click();
      await expect(canvas).toHaveAttribute('data-mammal-articulation', JSON.stringify(sample.art));
      await expect(canvas).toHaveAttribute('data-mammal-rig', 'back,chest,neck,haunches,tail,paired-ears');
      await expect(canvas).toHaveAttribute('data-mammal-support-feet', String(sample.art.supportFeet));
      const actual = await mammalRig(page, id);
      await test.info().attach(`${id}-${label}-sole-measurements`, { body: JSON.stringify({ branch: sample.branch, step: sample.step, index: sample.index, state: sample.pose.state, altitude: sample.pose.altitude, pounce: sample.pose.pounce, articulation: sample.art, feet: actual.feet.map((foot: any) => ({ name: foot.name, hind: foot.hind, side: foot.side, contact: foot.contact, center: foot.center, sole: foot.sole, gap: foot.gap })) }, null, 2), contentType: 'application/json' });
      for (const name of ['back', 'chest', 'neck', 'belly']) expect(actual.parts[name].name).toBe(`eco-${id}-${name}`);
      expect(actual.parts.back.rotation[2]).toBeCloseTo(sample.art.spineFlex, 10);
      expect(actual.parts.back.scale[0]).toBeCloseTo(sample.art.bodyStretch, 10);
      expect(actual.parts.chest.position[1] - actual.parts.chest.home[1]).toBeCloseTo(sample.art.shoulderLift, 10);
      expect(actual.parts.neck.rotation[2]).toBeCloseTo(sample.art.headPitch * 0.45, 10);
      expect(actual.head.rotation[1]).toBeCloseTo(sample.art.headYaw, 10);
      expect(actual.tail.rotation[1]).toBeCloseTo(sample.art.tailYaw, 10);
      expect(actual.tail.rotation[2]).toBeCloseTo(sample.art.tailPitch, 10);
      expect(actual.feet).toHaveLength(4);
      if (id === 'foxes') {
        expect(actual.tailAttached).toBe(true);
        expect(actual.tailTip!.name).toBe('eco-foxes-tail-tip');
        expect(actual.tailTip!.rotation[1]).toBeCloseTo(sample.art.tailCurl, 10);
      }
      if (label === 'flight') {
        expect(actual.feet.every((foot: any) => foot.gap > (id === 'foxes' ? 0.12 : 0.07))).toBe(true);
      } else if (label === 'walk') {
        expect(actual.feet.filter((foot: any) => foot.contact)).toHaveLength(sample.art.supportFeet);
        for (const foot of actual.feet.filter((foot: any) => foot.contact)) expect(Math.abs(foot.gap - 0.002)).toBeLessThan(0.008);
      } else if (label === 'ground' || label === 'rest') {
        expect(sample.art.supportFeet).toBe(4);
        for (const foot of actual.feet) expect(Math.abs(foot.gap - 0.002)).toBeLessThan(0.008);
      }
      poses[label] = actual;
      await stage.screenshot({ path: `${reportDir}/${id}-${label}.jpg`, type: 'jpeg', quality: 92 });
    }
    expect(poses.walk.parts.back.matrix).not.toEqual(poses.rest.parts.back.matrix);
    expect(poses.walk.parts.chest.matrix).not.toEqual(poses.rest.parts.chest.matrix);
    expect(poses.walk.parts.neck.matrix).not.toEqual(poses.rest.parts.neck.matrix);
    expect(poses.walk.head.matrix).not.toEqual(poses.rest.head.matrix);
    expect(poses.walk.tail.matrix).not.toEqual(poses.rest.tail.matrix);
    if (id === 'foxes') expect(poses.walk.tailTip.matrix).not.toEqual(poses.rest.tailTip.matrix);
    await chooseSample(page, id, samples.ground);
    await chooseSample(page, id, samples.flight);
    expect(await mammalRig(page, id)).toEqual(poses.flight);
    await chooseSample(page, id, samples.rest);
    expect(await mammalRig(page, id)).toEqual(poses.rest);
    await meadow.getByRole('button', { name: 'Face view', exact: true }).click();
    await stage.screenshot({ path: `${reportDir}/${id}-face.jpg`, type: 'jpeg', quality: 92 });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await stage.screenshot({ path: `${reportDir}/mobile-rabbit.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const id of ['foxes', 'rabbits']) {
    await chooseSample(page, id, { branch: 'baseline', step: 0, index: 0 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
    await expect(canvas).toHaveAttribute('data-mammal-support-feet', '4');
    const frozen = await mammalRig(page, id);
    await timeline.fill('240');
    expect(await mammalRig(page, id)).toEqual(frozen);
    expect(frozen.feet.every((foot: any) => Math.abs(foot.gap - 0.002) < 0.008)).toBe(true);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }
  const census = await harness.glScene(page, '[data-efw-meadow]');
  expect(census?.hasScene).toBe(true);
  expect(census!.draws).toBeGreaterThan(0);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(targets.run);
});

async function recordedStudy(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config;
    return api.motionStudy(api.behaviorTimeline(config, api.compare(config).baseline), id, 0);
  }, id);
}

async function setSequence(page: Page, order: number[]) {
  const sequence = page.locator('[data-efw-motion-sequence]');
  for (let index = 0; index < 3; index++) await sequence.getByLabel(['First', 'Middle', 'Last'][index] + ' movement snapshot', { exact: true }).selectOption(String(order[index]));
}

test('mammal snapshot sequencing conceals answers, handles duplicates and revisions, replays real checkpoints and saves restorable movement evidence', async ({ page }) => {
  const ecologyPrediction = 'I predict fewer caterpillars will later reduce blue-tit biomass through their feeding link.';
  const { meadow, canvas, stage, study, timeline, comparisonTime } = await mount(page, 'Insect food shortage', ecologyPrediction);
  const run = await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run));
  let rabbit: any;
  for (const id of ['foxes', 'rabbits']) {
    const expected = await recordedStudy(page, id);
    expect(expected, `${id} has a real supported movement sequence`).toBeTruthy();
    expect(expected.sequence).toBe(true);
    expect(expected.samples).toHaveLength(3);
    await study.getByRole('button', { name: id === 'foxes' ? 'Study a fox movement' : 'Study a rabbit movement', exact: true }).click();
    const sequence = study.locator('[data-efw-motion-sequence]');
    await expect(sequence).toBeVisible();
    await expect(sequence).toContainText(expected.title);
    const cards = sequence.locator('[data-efw-motion-sample]');
    await expect(cards).toHaveCount(3);
    await expect(sequence.getByRole('button', { name: 'Replay ordered movement', exact: true })).toBeDisabled();
    for (let k = 0; k < 3; k++) {
      const card = sequence.locator(`[data-efw-motion-sample="${k}"]`);
      await expect(card).not.toContainText(expected.metricName);
      await expect(card).not.toContainText(expected.samples[k].label);
      await expect(card).not.toContainText('time ');
      await card.focus();
      await card.press('Enter');
      await expect(timeline).toHaveValue(String(expected.samples[k].step));
      await expect(comparisonTime).toHaveValue(String(expected.samples[k].step));
      await expect(canvas).toHaveAttribute('data-representative-index', String(expected.index));
      await expect(card).toHaveAttribute('aria-pressed', 'true');
      await expect(meadow.locator('[data-efw-action-overlay]')).toContainText('Snapshot ' + String.fromCharCode(65 + expected.layout.indexOf(k)));
      await expect(meadow.getByRole('group', { name: 'Behavior moments', exact: true })).toHaveCount(0);
    }
    await sequence.getByRole('button', { name: 'Check my sequence', exact: true }).click();
    await expect(sequence.locator('[data-efw-motion-sequence-error]')).toContainText('Choose a snapshot for each position.');
    await setSequence(page, [0, 0, 2]);
    await sequence.getByRole('button', { name: 'Check my sequence', exact: true }).click();
    await expect(sequence.locator('[data-efw-motion-sequence-error]')).toContainText('Use each snapshot once.');
    await expect(sequence.locator('[data-efw-motion-feedback]')).toHaveCount(0);
    await expect(cards.first()).not.toContainText(expected.metricName);
    await stage.screenshot({ path: `${reportDir}/${id}-anonymous-snapshot.jpg`, type: 'jpeg', quality: 92 });
    await setSequence(page, [1, 0, 2]);
    await sequence.getByRole('button', { name: 'Check my sequence', exact: true }).click();
    await expect(sequence.locator('[data-efw-motion-feedback]')).toContainText('Compare your order with the recorded movement.');
    for (let k = 0; k < 3; k++) {
      const card = sequence.locator(`[data-efw-motion-sample="${k}"]`), sample = expected.samples[k];
      await expect(card).toContainText(sample.label);
      await expect(card).toContainText(`${expected.metricName}: ${sample.value.toFixed(3)}`);
      await expect(card).toContainText(`Supporting paws: ${sample.supportFeet} of 4`);
    }
    await setSequence(page, [0, 1, 2]);
    await sequence.getByRole('button', { name: 'Check my sequence', exact: true }).click();
    await expect(sequence.locator('[data-efw-motion-feedback]')).toContainText('Your sequence matches the recorded movement.');
    const letter = (k: number) => String.fromCharCode(65 + expected.layout.indexOf(k));
    await expect(sequence.locator('[data-efw-motion-feedback]')).toContainText(`Your first submitted order: Snapshot ${letter(1)} → Snapshot ${letter(0)} → Snapshot ${letter(2)}.`);
    await meadow.getByLabel('Meadow playback speed', { exact: true }).selectOption('4');
    await timeline.fill('240');
    await sequence.getByRole('button', { name: 'Replay ordered movement', exact: true }).click();
    await expect(meadow.locator('[data-efw-replay-status]')).toContainText('Replay finished');
    await expect(timeline).toHaveValue(String(expected.samples[2].step));
    await expect(comparisonTime).toHaveValue(String(expected.samples[2].step));
    await sequence.screenshot({ path: `${reportDir}/${id}-sequence-evidence.jpg`, type: 'jpeg', quality: 92 });
    if (id === 'rabbits') rabbit = expected;
  }
  const sequence = study.locator('[data-efw-motion-sequence]');
  const reflection = 'I placed the grounded paw before its forward swing and return. The support count helps distinguish one raised paw from whole-body flight.';
  await sequence.getByLabel('Movement evidence reflection', { exact: true }).fill(reflection);
  await sequence.getByRole('button', { name: 'Save movement observation', exact: true }).click();
  await expect(sequence).toContainText('Movement evidence saved to the field notebook.');
  await expect(sequence.getByRole('button', { name: 'Save movement observation', exact: true })).toBeDisabled();
  const note = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[0]);
  expect(note.focus).toBe('rabbits');
  expect(note.step).toBe(rabbit.samples[1].step);
  expect(note.explanation).toContain(reflection);
  expect(note.movement).toMatchObject({ version: 1, branch: 'baseline', index: rabbit.index, studyId: rabbit.id, kind: rabbit.kind, order: [1, 0, 2] });
  expect(note.movement.runPrediction).toBe(ecologyPrediction);
  expect(note.movement.samples).toHaveLength(3);
  for (let k = 0; k < 3; k++) {
    const sample = rabbit.samples[k], savedSample = note.movement.samples[k];
    expect(savedSample).toMatchObject({ step: sample.step, value: sample.value, supportFeet: sample.supportFeet, foreContact: sample.foreContact, hindContact: sample.hindContact });
    if ('pawAngle' in savedSample) expect(savedSample.pawAngle).toBe(sample.pawAngle);
  }
  const saved = JSON.stringify(note), notebook = page.locator('[data-efw-notebook]');
  await expect(notebook.locator('[data-efw-note-movement]')).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  await expect(sequence.getByRole('button', { name: 'Replay ordered movement', exact: true })).toBeDisabled();
  await expect(sequence.locator('[data-efw-motion-reduced]')).toContainText('supporting paws');
  await expect(sequence.locator('[data-efw-motion-reduced]')).toContainText('observed paw angle');
  const frozen = await canvas.getAttribute('data-mammal-articulation');
  for (const k of [0, 2, 1]) await sequence.locator(`[data-efw-motion-sample="${k}"]`).click();
  await expect(canvas).toHaveAttribute('data-mammal-articulation', frozen!);
  await page.setViewportSize({ width: 390, height: 844 });
  await sequence.screenshot({ path: `${reportDir}/mobile-sequence-evidence.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await timeline.fill('0');
  await meadow.getByLabel('Representative animal', { exact: true }).selectOption('1');
  await expect(study.locator('[data-efw-motion-sequence]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.motionStudy)).toBeNull();
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('experiment');
  await meadow.getByRole('button', { name: groupName('foxes') }).click();
  await notebook.getByRole('button', { name: 'Reopen observation 1', exact: true }).click();
  await expect(meadow.getByLabel('Meadow scene data', { exact: true })).toHaveValue('baseline');
  await expect(canvas).toHaveAttribute('data-selected-species', 'rabbits');
  await expect(canvas).toHaveAttribute('data-representative-index', String(rabbit.index));
  await expect(canvas).toHaveAttribute('data-camera-mode', 'detail');
  await expect(canvas).toHaveAttribute('data-isolated-specimen', 'true');
  await expect(canvas).toHaveAttribute('data-interaction-view', 'false');
  await expect(timeline).toHaveValue(String(note.step));
  await expect(comparisonTime).toHaveValue(String(note.step));
  await expect(study.locator('[data-efw-motion-sequence]')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(saved);
  await expect(page.getByLabel('Your prediction (optional)', { exact: true })).toHaveValue(ecologyPrediction);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(run);
});

test('fox listening follows one live prey movement cue, remains bounded, and saves/reopens that exact recorded encounter', async ({ page }) => {
  const ecologyPrediction = 'I predict the food-web branches will match because this run has no disturbance.';
  const { meadow, canvas, stage, fieldwork, timeline, comparisonTime } = await mount(page, 'Rabbit neighbors', ecologyPrediction);
  const recorded = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config;
    const frames = api.behaviorTimeline(config, api.compare(config).baseline), encounter = api.encounters(frames, config).find((item: any) => item.kind === 'listening');
    if (!encounter) return null;
    const pose = frames[encounter.step].foxes[encounter.actor.index], cue = pose.listenCue, previous = frames[encounter.step - 1];
    const onsetStep = encounter.step - cue.age, onset = frames[onsetStep].foxes[encounter.actor.index];
    const onsetSource = frames[onsetStep - 1][cue.id][cue.index];
    const episode = frames.map((frame: any, step: number) => ({ pose: frame.foxes[encounter.actor.index], step }))
      .filter(({ pose: item, step }: any) => step >= onsetStep && step <= onsetStep + 8 && item.state === 'Listening' && item.listenCue?.id === cue.id && item.listenCue?.index === cue.index);
    return { encounter, pose, cue, reason: api.explainBehavior('foxes', pose).text, actorPrevious: previous.foxes[encounter.actor.index], sourcePrevious: previous[cue.id][cue.index], source: frames[encounter.step][cue.id][cue.index], onset, onsetSource, episode, run: JSON.stringify(w.__toolData.ecosystem.foodWeb.run) };
  });
  expect(recorded, 'the actual Rabbit neighbors recording contains a listening event').toBeTruthy();
  const evidence = recorded!;
  expect(evidence.encounter.actor.id).toBe('foxes');
  expect(evidence.cue.id).toBe(evidence.encounter.cue.id);
  expect(evidence.cue.index).toBe(evidence.encounter.cue.index);
  expect(evidence.pose.state).toBe('Listening');
  expect(evidence.source.active).toBe(true);
  expect(evidence.sourcePrevious.active).toBe(true);
  expect(evidence.onsetSource.moving).toBeGreaterThanOrEqual(0.12);
  expect(evidence.onset.listenCue.age).toBe(0);
  expect(evidence.cue.onsetMovement).toBe(evidence.onsetSource.moving);
  expect(evidence.cue.distance).toBeCloseTo(Math.hypot(evidence.sourcePrevious.x - evidence.actorPrevious.x, evidence.sourcePrevious.z - evidence.actorPrevious.z), 9);
  expect(evidence.cue.distance).toBeLessThanOrEqual(4.5);
  expect(evidence.episode.length).toBeGreaterThan(0);
  expect(evidence.episode.length).toBeLessThanOrEqual(8);
  for (const { pose } of evidence.episode) { expect(pose.listenCue.age).toBeLessThanOrEqual(7); expect(pose.listenCue.onsetMovement).toBeGreaterThanOrEqual(0.12); }
  await fieldwork.locator('[data-efw-encounter="listening"]').click();
  await expect(timeline).toHaveValue(String(evidence.encounter.before));
  await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('approach');
  await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
  await expect(fieldwork).toContainText('The recorded action fits that description.');
  await expect(canvas).toHaveAttribute('data-behavior', 'Listening');
  await expect(canvas).toHaveAttribute('data-selected-species', 'foxes');
  await expect(canvas).toHaveAttribute('data-representative-index', String(evidence.encounter.actor.index));
  await expect(canvas).toHaveAttribute('data-interaction-cue', `${evidence.cue.id}:${evidence.cue.index}`);
  await expect(canvas).toHaveAttribute('data-interaction-connector', 'true');
  const reason = meadow.locator('[data-efw-action-reason]');
  await reason.locator('summary').click();
  await expect(reason.locator('[data-efw-action-explanation]')).toHaveText(evidence.reason);
  await expect(reason.locator('[data-efw-action-explanation]')).toContainText('does not simulate sound');
  await stage.screenshot({ path: `${reportDir}/fox-listening-encounter.jpg`, type: 'jpeg', quality: 92 });
  const rows = fieldwork.locator('[data-efw-encounter-evidence] > div');
  await expect(rows).toHaveCount(3);
  for (const [label, step] of [['Before encounter', evidence.encounter.before], ['After encounter', evidence.encounter.after], ['Encounter moment', evidence.encounter.step]] as const) {
    await fieldwork.getByRole('button', { name: label, exact: true }).click();
    await expect(timeline).toHaveValue(String(step));
    await expect(comparisonTime).toHaveValue(String(step));
  }
  await fieldwork.getByLabel('Wildlife explanation', { exact: true }).fill('A nearby prey representative moved before this short listening pause. The fox turned its head and ears toward that same live animal.');
  await fieldwork.getByLabel('Wildlife model limit', { exact: true }).fill('The movement cue does not model sound propagation or prove that a fox heard or captured prey.');
  await fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true }).click();
  const note = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[0]);
  expect(note.sighting).toMatchObject({ kind: 'listening', branch: 'baseline', actorIndex: evidence.encounter.actor.index, cueId: evidence.cue.id, cueIndex: evidence.cue.index, state: 'Listening' });
  expect(note.sighting.runPrediction).toBe(ecologyPrediction);
  expect(note.step).toBe(evidence.encounter.step);
  const saved = JSON.stringify(note);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  await expect(canvas).toHaveAttribute('data-interaction-connector', 'false');
  const frozen = await canvas.getAttribute('data-representative-position');
  await fieldwork.getByRole('button', { name: 'After encounter', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-representative-position', frozen!);
  await expect(rows).toHaveCount(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await fieldwork.screenshot({ path: `${reportDir}/mobile-listening-fieldwork.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('experiment');
  await meadow.getByRole('button', { name: groupName('rabbits') }).click();
  await page.locator('[data-efw-notebook]').getByRole('button', { name: 'Reopen observation 1', exact: true }).click();
  await expect(meadow.getByLabel('Meadow scene data', { exact: true })).toHaveValue('baseline');
  await expect(canvas).toHaveAttribute('data-selected-species', 'foxes');
  await expect(canvas).toHaveAttribute('data-representative-index', String(evidence.encounter.actor.index));
  await expect(timeline).toHaveValue(String(evidence.encounter.step));
  await expect(canvas).toHaveAttribute('data-interaction-cue', `${evidence.cue.id}:${evidence.cue.index}`);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(saved);
  await expect(page.getByLabel('Your prediction (optional)', { exact: true })).toHaveValue(ecologyPrediction);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(evidence.run);
});
