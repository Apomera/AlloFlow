import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem',
  width: 1100, height: 900, appStyles: true,
});
const reportDir = 'reports/ecosystem-natural-birds';

test.describe.configure({ timeout: 180_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page);
  expect(errors, 'uncaught errors from the current local ecology source').toEqual([]);
});

async function mount(page: Page, run = true) {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white';
  });
  if (run) {
    await page.getByRole('button', { name: 'Insect food shortage', exact: true }).click();
    await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  }
  const meadow = page.locator('[data-efw-meadow]');
  return {
    meadow, canvas: meadow.locator('canvas'), stage: meadow.locator('.efw-meadow-stage'),
    timeline: meadow.getByLabel('Meadow timeline', { exact: true }),
    comparisonTime: page.getByLabel('Food-web comparison time', { exact: true }),
    study: meadow.locator('[data-efw-movement-study]'),
  };
}

// Discover samples in the actual deterministic recording. Neither test poses nor
// hand-picked event times are injected into the renderer or its saved run.
async function birdSamples(page: Page) {
  return page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb;
    const config = w.__toolData.ecosystem.foodWeb.run.config;
    const frames = api.behaviorTimeline(config, api.compare(config).experiment);
    w.__naturalBirdFrames = frames;
    let owlLow: any = null, owlHigh: any = null, airborne: any = null, grounded: any = null, pecking: any = null;
    frames.forEach((frame: any, step: number) => {
      const owl = frame.owls[0], owlJoint = api.birdArticulation('owls', owl, step / 10, false);
      if (owl.active && (!owlLow || owlJoint.shoulder < owlLow.joint.shoulder)) owlLow = { step, index: 0, joint: owlJoint };
      if (owl.active && (!owlHigh || owlJoint.shoulder > owlHigh.joint.shoulder)) owlHigh = { step, index: 0, joint: owlJoint };
      frame.bluetits.slice(0, 7).forEach((pose: any, index: number) => {
        if (!pose.active) return;
        const joint = api.birdArticulation('bluetits', pose, step / 10, false), sample = { step, index, joint };
        if (!joint.contact && (!airborne || joint.bodyLift > airborne.joint.bodyLift)) airborne = sample;
        if (joint.contact && joint.mode === 'hop' && (!grounded || joint.bodyLift < grounded.joint.bodyLift)) grounded = sample;
        if (joint.mode === 'feed' && (!pecking || pose.forage > frames[pecking.step].bluetits[pecking.index].forage)) pecking = sample;
      });
    });
    const pauseStep = pecking ? frames.map((frame: any, step: number) => ({ pose: frame.bluetits[pecking.index], step }))
      .filter(({ pose }: any) => pose.active && pose.moving <= 0.015 && pose.state !== 'Pecking' && pose.forage < 0.2)
      .sort((a: any, b: any) => Math.abs(a.step - pecking.step) - Math.abs(b.step - pecking.step))[0]?.step : undefined;
    const pause = pauseStep == null ? null : { step: pauseStep, index: pecking.index, joint: api.birdArticulation('bluetits', frames[pauseStep].bluetits[pecking.index], pauseStep / 10, false) };
    return { owlLow, owlHigh, airborne, grounded, pecking, pause, run: JSON.stringify(w.__toolData.ecosystem.foodWeb.run) };
  });
}

// Read the scene three.js really rendered. Local joint and world sole matrices
// verify visible articulation independently of DOM descriptions.
async function rig(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const animals = scene.children.filter((object: any) => object.visible && object.userData.birdLegs && object.userData.birdLegs[0].name.includes(id === 'owls' ? 'owl' : 'bluetit'));
    if (animals.length !== 1) throw new Error(`Expected one isolated ${id}; found ${animals.length}`);
    const animal = animals[0], data = animal.userData;
    const read = (part: any) => ({ matrix: Array.from(part.matrix.elements), world: Array.from(part.matrixWorld.elements), position: part.position.toArray(), rotation: [part.rotation.x, part.rotation.y, part.rotation.z] });
    const billMesh = animal.getObjectByName('eco-bluetit-bill');
    let bill = null;
    if (billMesh) {
      const positions = billMesh.geometry.getAttribute('position');
      let min = Infinity, max = -Infinity;
      for (let i = 0; i < positions.count; i++) { min = Math.min(min, positions.getX(i)); max = Math.max(max, positions.getX(i)); }
      const extreme = (x: number) => {
        const center = new T.Vector3(), point = new T.Vector3();
        let count = 0;
        for (let i = 0; i < positions.count; i++) if (Math.abs(positions.getX(i) - x) < 1e-6) { center.add(point.fromBufferAttribute(positions, i)); count++; }
        return center.divideScalar(count).applyMatrix4(billMesh.matrixWorld);
      };
      const tip = extreme(max), base = extreme(min), direction = tip.clone().sub(base).normalize();
      bill = { ...read(billMesh), tip: tip.toArray(), base: base.toArray(), direction: direction.toArray(), gap: tip.y - w.StemLab.ecosystemFoodWeb.groundHeight(tip.x, tip.z), vertices: positions.count };
    }
    return {
      articulation: data.birdArticulation, body: read(data.body), head: read(data.head), tail: read(data.birdTail), bill,
      feathers: data.birdTail.userData.feathers.map((part: any) => read(part)),
      wings: data.wings.map((shoulder: any) => ({
        name: shoulder.name, shoulder: read(shoulder), wrist: read(shoulder.userData.wrist),
        wristParent: shoulder.userData.wrist.parent === shoulder,
        featherCount: shoulder.children.filter((part: any) => part.isMesh).length + shoulder.userData.wrist.children.filter((part: any) => part.isMesh).length,
      })),
      feet: data.birdLegs.map((leg: any) => {
        const foot = leg.userData.foot, position = new T.Vector3().setFromMatrixPosition(foot.matrixWorld);
        return { ...read(foot), contact: leg.userData.contact, gap: position.y - w.StemLab.ecosystemFoodWeb.groundHeight(position.x, position.z), toes: leg.userData.digits.map((toe: any) => toe.rotation.z) };
      }),
    };
  }, id);
}

async function chooseSample(page: Page, id: string, sample: { step: number; index: number }) {
  const meadow = page.locator('[data-efw-meadow]'), canvas = meadow.locator('canvas');
  await meadow.getByRole('button', { name: id === 'owls' ? /Barn owls\s[\d.]/ : /Blue tits\s[\d.]/ }).click();
  await meadow.getByLabel('Meadow timeline', { exact: true }).fill(String(sample.step));
  await meadow.getByLabel('Representative animal', { exact: true }).selectOption(String(sample.index));
  await expect(canvas).toHaveAttribute('data-step', String(sample.step));
  await expect(canvas).toHaveAttribute('data-selected-species', id);
  await expect(canvas).toHaveAttribute('data-representative-index', String(sample.index));
}

test('owl shoulder and wrist flex separately; blue-tit hops articulate head, tail, planted feet and curled toes, then rewind exactly', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page);
  const samples = await birdSamples(page);
  for (const sample of [samples.owlLow, samples.owlHigh, samples.airborne, samples.grounded, samples.pecking, samples.pause]) expect(sample).toBeTruthy();
  expect(samples.owlHigh.joint.shoulder - samples.owlLow.joint.shoulder).toBeGreaterThan(0.5);
  expect(samples.airborne.joint.bodyLift).toBeGreaterThan(0.06);
  await meadow.getByRole('button', { name: 'Inspect selected group', exact: true }).click();
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();

  let previous: any;
  for (const [label, sample] of [['owl-downstroke', samples.owlLow], ['owl-upstroke', samples.owlHigh]] as const) {
    await chooseSample(page, 'owls', sample);
    await meadow.getByRole('button', { name: 'Face view', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-bird-articulation', JSON.stringify(sample.joint));
    await expect(canvas).toHaveAttribute('data-bird-wing-joints', '4');
    await expect(canvas).toHaveAttribute('data-bird-rig', 'shoulders,wrists,tail,paired-feet');
    const actual = await rig(page, 'owls');
    expect(actual.articulation).toEqual(sample.joint);
    expect(actual.wings).toHaveLength(2);
    for (let i = 0; i < 2; i++) {
      const wing = actual.wings[i], side = i === 0 ? -1 : 1;
      expect(wing.name).toBe(`eco-owl-shoulder-${side}`);
      expect(wing.wristParent).toBe(true);
      expect(wing.featherCount).toBeGreaterThanOrEqual(15);
      expect(wing.shoulder.rotation[0]).toBeCloseTo(side * sample.joint.shoulder, 10);
      expect(wing.wrist.rotation[0]).toBeCloseTo(side * sample.joint.wrist, 10);
      if (previous) {
        expect(wing.shoulder.matrix).not.toEqual(previous.wings[i].shoulder.matrix);
        expect(wing.wrist.matrix).not.toEqual(previous.wings[i].wrist.matrix);
      }
    }
    expect(actual.head.rotation[0]).toBeCloseTo(sample.joint.headRoll, 10);
    previous = actual;
    await stage.screenshot({ path: `${reportDir}/${label}.jpg`, type: 'jpeg', quality: 92 });
  }
  const owlRemembered = await rig(page, 'owls');
  await timeline.fill('0');
  await timeline.fill(String(samples.owlHigh.step));
  expect(await rig(page, 'owls')).toEqual(owlRemembered);

  const blue: Record<string, any> = {};
  for (const [label, sample] of [['blue-tit-airborne', samples.airborne], ['blue-tit-grounded', samples.grounded], ['blue-tit-pecking', samples.pecking]] as const) {
    await chooseSample(page, 'bluetits', sample);
    await meadow.getByRole('button', { name: 'Side view', exact: true }).click();
    await expect(canvas).toHaveAttribute('data-bird-articulation', JSON.stringify(sample.joint));
    await expect(canvas).toHaveAttribute('data-bird-foot-contact', String(sample.joint.contact));
    const actual = await rig(page, 'bluetits');
    expect(actual.articulation).toEqual(sample.joint);
    expect(actual.body.position[1]).toBeCloseTo(sample.joint.bodyLift, 10);
    expect(actual.body.rotation[2]).toBeCloseTo(sample.joint.bodyPitch, 10);
    expect(actual.tail.rotation[2]).toBeCloseTo(sample.joint.tailPitch, 10);
    expect(actual.bill, 'the visible blue-tit bill mesh exists').toBeTruthy();
    expect(actual.bill!.vertices).toBeGreaterThan(0);
    expect(actual.feathers).toHaveLength(5);
    expect(actual.feet).toHaveLength(2);
    for (const foot of actual.feet) {
      expect(foot.contact).toBe(sample.joint.contact);
      if (sample.joint.contact) {
        expect(Math.abs(foot.gap)).toBeLessThan(0.012);
        expect(foot.toes).toEqual([0, 0, 0, 0]);
      } else {
        expect(foot.gap).toBeGreaterThan(0.015);
        expect(foot.toes.every((angle: number) => Math.abs(angle) > 0.3)).toBe(true);
      }
    }
    await stage.screenshot({ path: `${reportDir}/${label}.jpg`, type: 'jpeg', quality: 92 });
    if (label === 'blue-tit-pecking') {
      await test.info().attach('blue-tit-ground-peck', { body: JSON.stringify({ step: sample.step, index: sample.index, articulation: sample.joint, bill: actual.bill, feet: actual.feet }, null, 2), contentType: 'application/json' });
      expect(sample.joint.contact).toBe(true);
      expect(actual.bill!.direction[1], 'the bill axis points down during a groundward peck').toBeLessThan(-0.2);
      expect(actual.bill!.gap, 'deepest recorded stationary peck reaches toward the terrain').toBeGreaterThanOrEqual(0.02);
      expect(actual.bill!.gap).toBeLessThanOrEqual(0.08);
    }
    blue[label] = actual;
  }
  expect(blue['blue-tit-airborne'].body.matrix).not.toEqual(blue['blue-tit-grounded'].body.matrix);
  expect(blue['blue-tit-airborne'].feet[0].matrix).not.toEqual(blue['blue-tit-grounded'].feet[0].matrix);
  expect(blue['blue-tit-airborne'].head.matrix).not.toEqual(blue['blue-tit-pecking'].head.matrix);
  expect(blue['blue-tit-airborne'].tail.matrix).not.toEqual(blue['blue-tit-grounded'].tail.matrix);
  await chooseSample(page, 'bluetits', samples.pause);
  const paused = await rig(page, 'bluetits');
  expect(paused.feet.every((foot: any) => foot.contact && Math.abs(foot.gap) < 0.012)).toBe(true);
  expect(paused.bill!.gap).toBeGreaterThan(blue['blue-tit-pecking'].bill.gap + 0.08);
  await chooseSample(page, 'bluetits', samples.pecking);
  expect(await rig(page, 'bluetits')).toEqual(blue['blue-tit-pecking']);
  await chooseSample(page, 'bluetits', samples.pause);
  expect(await rig(page, 'bluetits')).toEqual(paused);
  await chooseSample(page, 'bluetits', samples.pecking);
  expect(await rig(page, 'bluetits')).toEqual(blue['blue-tit-pecking']);

  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  await stage.screenshot({ path: `${reportDir}/woodland-context.jpg`, type: 'jpeg', quality: 92 });
  const census = await harness.glScene(page, '[data-efw-meadow]');
  expect(census?.hasScene).toBe(true);
  expect(census!.draws).toBeGreaterThan(0);
  expect(census!.visibleMeshes).toBeGreaterThan(20);
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await stage.screenshot({ path: `${reportDir}/mobile-blue-tit.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  const frozen = await rig(page, 'bluetits');
  await timeline.fill('180');
  expect(await rig(page, 'bluetits')).toEqual(frozen);
  expect(frozen.feet.every((foot: any) => foot.contact && Math.abs(foot.gap) < 0.012)).toBe(true);
  await meadow.getByRole('button', { name: /Barn owls\s[\d.]/ }).click();
  const frozenOwl = await rig(page, 'owls');
  await timeline.fill('240');
  expect(await rig(page, 'owls')).toEqual(frozenOwl);
  expect(frozenOwl.articulation.mode).toBe('glide');
  await meadow.getByRole('button', { name: /Rabbits\s[\d.]/ }).click();
  await expect(canvas).toHaveAttribute('data-bird-articulation', '');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(samples.run);
});

test('movement studies use three recorded checkpoints, support keyboard evidence choices and remain usable with reduced motion on a phone', async ({ page }) => {
  const { meadow, canvas, stage, study, timeline, comparisonTime } = await mount(page);
  const before = await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run));
  for (const [id, buttonName] of [['bluetits', 'Study a blue-tit hop'], ['owls', 'Study an owl wingbeat']] as const) {
    const launch = study.getByRole('button', { name: buttonName, exact: true });
    await launch.focus();
    await launch.press('Enter');
    const expected = await page.evaluate(id => {
      const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config;
      const frames = api.behaviorTimeline(config, api.compare(config).experiment);
      return api.motionStudy(frames, id, 0);
    }, id);
    expect(expected).toBeTruthy();
    expect(expected.samples).toHaveLength(3);
    expect(expected.target.length).toBeGreaterThan(0);
    await expect(canvas).toHaveAttribute('data-selected-species', id);
    await expect(study).toContainText(expected.title);
    await expect(study).toContainText(expected.question);
    const checkpoints = study.locator('[data-efw-motion-sample]');
    await expect(checkpoints).toHaveCount(3);
    for (let index = 0; index < expected.samples.length; index++) {
      const checkpoint = study.locator(`[data-efw-motion-sample="${index}"]`);
      await checkpoint.focus();
      await checkpoint.press('Enter');
      await expect(timeline).toHaveValue(String(expected.samples[index].step));
      await expect(comparisonTime).toHaveValue(String(expected.samples[index].step));
      await expect(checkpoint).toHaveAttribute('aria-pressed', 'true');
      await expect(study).toContainText(expected.samples[index].label);
    }
    const answer = study.getByLabel('Movement evidence choice', { exact: true });
    const check = study.getByRole('button', { name: 'Check movement evidence', exact: true });
    await answer.selectOption(String(expected.target[0]));
    await check.focus();
    await check.press('Enter');
    await expect(study.locator('[data-efw-motion-feedback]')).toBeVisible();
    await expect(study.locator('[data-efw-motion-feedback]')).toContainText('Your choice matches the recorded movement.');
    const other = [0, 1, 2].find(index => !expected.target.includes(index));
    if (other != null) {
      await answer.selectOption(String(other));
      await check.click();
      await expect(study.locator('[data-efw-motion-feedback]')).toContainText('Compare again with the recorded movement.');
    }
    for (const tied of expected.target) {
      await answer.selectOption(String(tied));
      await check.click();
      await expect(study.locator('[data-efw-motion-feedback]')).toContainText('Your choice matches the recorded movement.');
    }
    await meadow.getByLabel('Meadow playback speed', { exact: true }).selectOption('4');
    await timeline.fill('240');
    await study.getByRole('button', { name: 'Replay movement', exact: true }).click();
    await expect(meadow.locator('[data-efw-replay-status]')).toContainText('Replay finished');
    await expect(timeline).toHaveValue(String(expected.samples[2].step));
    await expect(comparisonTime).toHaveValue(String(expected.samples[2].step));
    await study.screenshot({ path: `${reportDir}/${id}-movement-study.jpg`, type: 'jpeg', quality: 92 });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  await expect(study.getByRole('button', { name: 'Replay movement', exact: true })).toBeDisabled();
  const frozen = await canvas.getAttribute('data-bird-articulation');
  for (const index of [0, 2, 1]) await study.locator(`[data-efw-motion-sample="${index}"]`).click();
  await expect(canvas).toHaveAttribute('data-bird-articulation', frozen!);
  await page.setViewportSize({ width: 390, height: 844 });
  await study.screenshot({ path: `${reportDir}/mobile-movement-study.jpg`, type: 'jpeg', quality: 92 });
  await stage.screenshot({ path: `${reportDir}/reduced-motion-owl.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await study.getByRole('button', { name: 'Study a blue-tit hop', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-representative-index', '0');
  await study.getByLabel('Movement evidence choice', { exact: true }).selectOption('0');
  await study.getByRole('button', { name: 'Check movement evidence', exact: true }).click();
  await expect(study.locator('[data-efw-motion-feedback]')).toBeVisible();
  await timeline.fill('0');
  await meadow.getByLabel('Representative animal', { exact: true }).selectOption('1');
  await expect(canvas).toHaveAttribute('data-representative-index', '1');
  await expect(study.locator('[data-efw-motion-sample]')).toHaveCount(0);
  await expect(study.locator('[data-efw-motion-feedback]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.motionStudy)).toBeNull();
  await study.getByRole('button', { name: 'Study a blue-tit hop', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-representative-index', '0');
  await expect(study.locator('[data-efw-motion-sample]')).toHaveCount(3);
  await meadow.getByRole('button', { name: /Barn owls\s[\d.]/ }).click();
  await expect(canvas).toHaveAttribute('data-selected-species', 'owls');
  await expect(study.locator('[data-efw-motion-sample]')).toHaveCount(0);
  await expect(study.locator('[data-efw-motion-feedback]')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.motionStudy)).toBeNull();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(before);
});

test('optional birds offer no invented study, while Rabbit neighbors exposes a recorded direct alarm and its nearby recipient', async ({ page }) => {
  const { meadow, study } = await mount(page, false);
  await expect(study.locator('[data-efw-motion-sample]')).toHaveCount(0);
  await expect(meadow.locator('[data-efw-encounter="vigilance"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Simple chain', exact: true }).click();
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  await expect(study.getByRole('button', { name: 'Study a blue-tit hop', exact: true })).toBeDisabled();
  await expect(study.getByRole('button', { name: 'Study an owl wingbeat', exact: true })).toBeDisabled();
  await expect(study.locator('[data-efw-motion-sample]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Rabbit neighbors', exact: true }).click();
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const recorded = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config;
    const frames = api.behaviorTimeline(config, api.compare(config).experiment);
    const vigilance = api.encounters(frames, config).find((item: any) => item.kind === 'vigilance');
    if (!vigilance) return null;
    const pose = frames[vigilance.step][vigilance.actor.id][vigilance.actor.index];
    const previous = frames[vigilance.step - 1];
    const source = pose.socialCue && previous.rabbits[pose.socialCue.index];
    const recipient = previous.rabbits[vigilance.actor.index];
    const predator = pose.socialCue && previous[pose.socialCue.threatId][pose.socialCue.threatIndex];
    return { encounter: vigilance, pose, source, recipient, predator };
  });
  expect(recorded, 'the Rabbit neighbors preset must contain a real social vigilance recording').toBeTruthy();
  const vigilanceCard = meadow.locator('[data-efw-encounter="vigilance"]');
  await expect(vigilanceCard).toHaveCount(recorded ? 1 : 0);
  if (recorded) {
    expect(recorded.encounter.actor.id).toBe('rabbits');
    expect(recorded.encounter.cue.id).toBe('rabbits');
    expect(recorded.encounter.actor.index).not.toBe(recorded.encounter.cue.index);
    expect(recorded.pose.socialCue).toBeTruthy();
    expect(recorded.pose.socialCue.index).toBe(recorded.encounter.cue.index);
    expect(recorded.source.active).toBe(true);
    expect(recorded.source.directAlarm).toBe(true);
    expect(['Alert', 'Retreating']).toContain(recorded.source.state);
    expect(recorded.source.socialCue).toBeNull();
    expect(recorded.predator.active).toBe(true);
    expect(recorded.pose.socialCue.distance).toBeCloseTo(Math.hypot(recorded.source.x - recorded.recipient.x, recorded.source.z - recorded.recipient.z), 9);
    expect(recorded.pose.socialCue.distance).toBeLessThanOrEqual(1.6);
    await vigilanceCard.click();
    await expect(meadow).toContainText(recorded.encounter.title);
    const fieldwork = meadow.locator('[data-efw-fieldwork]');
    await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('unsure');
    await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
    await expect(meadow.locator('canvas')).toHaveAttribute('data-interaction-cue', `rabbits:${recorded.encounter.cue.index}`);
    await meadow.locator('.efw-meadow-stage').screenshot({ path: `${reportDir}/rabbit-neighbor-vigilance.jpg`, type: 'jpeg', quality: 92 });
  }
});
