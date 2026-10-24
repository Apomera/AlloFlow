import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem',
  width: 1100, height: 900, appStyles: true,
});
const reportDir = 'reports/ecosystem-refuge-ruler';

test.describe.configure({ timeout: 240_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page);
  expect(errors, 'the actual field-ruler workflows have no uncaught errors').toEqual([]);
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
  expect(await initialized.jsonValue(), 'the page-created renderer initializes and draws').toBe('ready');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  return {
    meadow, canvas: meadow.locator('canvas'), stage: meadow.locator('.efw-meadow-stage'),
    fieldwork: meadow.locator('[data-efw-fieldwork]'),
    lab: meadow.locator('[data-efw-pair-lab]'),
    timeline: meadow.getByLabel('Meadow timeline', { exact: true }),
    comparisonTime: page.getByLabel('Food-web comparison time', { exact: true }),
  };
}

async function recordedPair(page: Page, kind = 'listening') {
  return page.evaluate(kind => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb;
    const config = w.__toolData.ecosystem.foodWeb.run.config;
    const frames = api.behaviorTimeline(config, api.compare(config).baseline);
    const encounters = api.encounters(frames, config);
    const encounter = encounters.find((item: any) => item.kind === kind);
    if (!encounter) return null;
    const steps = [encounter.before, encounter.step, encounter.after];
    const evidence = api.pairEvidence(frames, encounter, steps);
    w.__fieldRulerFrames = frames;
    return { encounter, steps, evidence, run: JSON.stringify(w.__toolData.ecosystem.foodWeb.run) };
  }, kind);
}

async function revealPair(page: Page, kind = 'listening') {
  const recorded = await recordedPair(page, kind);
  expect(recorded, `the actual recording contains a ${kind} encounter`).toBeTruthy();
  expect(recorded!.evidence, 'the actual representatives remain measurable at all three checkpoints').toBeTruthy();
  const fieldwork = page.locator('[data-efw-fieldwork]');
  await fieldwork.locator(`[data-efw-encounter="${kind}"]`).click();
  await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('approach');
  await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
  const lab = page.locator('[data-efw-pair-lab]');
  await lab.locator('summary').click();
  await expect(lab).toHaveAttribute('open', '');
  return recorded!;
}

async function recordCheckpoints(page: Page, steps: number[]) {
  const lab = page.locator('[data-efw-pair-lab]');
  for (let k = 0; k < 3; k++) {
    await lab.getByLabel('Pair measurement time', { exact: true }).fill(String(steps[k]));
    await lab.getByRole('button', { name: `Record current sample as ${'ABC'[k]}`, exact: true }).click();
  }
}

async function rulerGeometry(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const group = scene.getObjectByName('eco-field-ruler'), line = scene.getObjectByName('eco-field-ruler-line'), ticks = scene.getObjectByName('eco-field-ruler-ticks');
    if (!group || !line || !ticks) throw new Error('The actual scene did not create its named ruler geometry');
    const read = (object: any) => {
      const attr = object.geometry.getAttribute('position'), points = [];
      const count = Number.isFinite(object.geometry.drawRange.count) ? Math.min(attr.count, object.geometry.drawRange.count) : attr.count;
      for (let k = 0; k < count; k++) points.push(new T.Vector3().fromBufferAttribute(attr, k).applyMatrix4(object.matrixWorld).toArray());
      return points;
    };
    return { visible: group.visible, line: read(line), ticks: read(ticks) };
  });
}

test('a field ruler follows the same recorded pair with terrain-draped endpoints, bounded ticks and accessible gap charts', async ({ page }) => {
  const { meadow, canvas, stage, lab, timeline, comparisonTime } = await mount(page, 'Rabbit neighbors');
  const recorded = await revealPair(page);
  await lab.getByRole('button', { name: 'View measured pair from above', exact: true }).click();
  for (const step of recorded.steps) {
    await lab.getByLabel('Pair measurement time', { exact: true }).fill(String(step));
    const expected = await page.evaluate(({ encounter, step }) => {
      const w = window as any, api = w.StemLab.ecosystemFoodWeb;
      return api.pairMeasurement(w.__fieldRulerFrames, encounter, step);
    }, { encounter: recorded.encounter, step });
    await expect(timeline).toHaveValue(String(step));
    await expect(comparisonTime).toHaveValue(String(step));
    await expect(canvas).toHaveAttribute('data-field-ruler', 'true');
    await expect(canvas).toHaveAttribute('data-interaction-connector', 'false');
    await expect(canvas).toHaveAttribute('data-selected-species', recorded.encounter.actor.id);
    await expect(canvas).toHaveAttribute('data-representative-index', String(recorded.encounter.actor.index));
    expect(Number(await canvas.getAttribute('data-field-ruler-gap'))).toBeCloseTo(expected.gap, 5);
    const endpoints = JSON.parse((await canvas.getAttribute('data-field-ruler-endpoints'))!);
    const positions = [expected.actor, expected.cue];
    for (let k = 0; k < 2; k++) {
      expect(endpoints[k][0]).toBeCloseTo(positions[k].x, 7);
      expect(endpoints[k][2]).toBeCloseTo(positions[k].z, 7);
    }
    const geometry = await rulerGeometry(page);
    expect(geometry.visible).toBe(true);
    expect(geometry.line).toHaveLength(33);
    for (const k of [0, 1]) {
      const point = geometry.line[k === 0 ? 0 : 32];
      for (let axis = 0; axis < 3; axis++) expect(point[axis]).toBeCloseTo(endpoints[k][axis], 5);
    }
    let expectedTicks = 1;
    for (let distance = 0.5; distance < expected.gap - 1e-7 && expectedTicks < 63; distance += 0.5) expectedTicks++;
    if (expected.gap > 1e-7) expectedTicks++;
    expect(geometry.ticks.length).toBe(expectedTicks * 2);
    await expect(canvas).toHaveAttribute('data-field-ruler-ticks', String(expectedTicks));
    expect(geometry.ticks.length).toBeLessThanOrEqual(128);
    const allPoints = geometry.line.concat(geometry.ticks);
    const heights = await page.evaluate(points => points.map(point => (window as any).StemLab.ecosystemFoodWeb.groundHeight(point[0], point[2])), allPoints);
    allPoints.forEach((point: number[], k: number) => expect(point[1] - heights[k]).toBeCloseTo(0.055, 5));
    await expect(lab.locator('[data-efw-pair-current]')).toContainText(expected.gap.toFixed(3) + ' scene units');
  }
  await recordCheckpoints(page, recorded.steps);
  await expect(lab.getByRole('img', { name: 'Top-down recorded pair positions', exact: true })).toBeVisible();
  await expect(lab.getByRole('img', { name: 'Measured gap against time', exact: true })).toBeVisible();
  const labels = lab.locator('[data-efw-pair-plan-label]');
  await expect(labels).toHaveCount(3);
  const labelBoxes = await labels.evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect();
    return { label: node.textContent, x: box.x, y: box.y, width: box.width, height: box.height };
  }));
  expect(labelBoxes.map(box => box.label)).toEqual(['A', 'B', 'C']);
  for (const box of labelBoxes) {
    expect(box.width).toBeGreaterThan(4);
    expect(box.height).toBeGreaterThan(8);
  }
  for (let a = 0; a < labelBoxes.length; a++) for (let b = a + 1; b < labelBoxes.length; b++) {
    const one = labelBoxes[a], two = labelBoxes[b];
    const overlaps = one.x < two.x + two.width && one.x + one.width > two.x && one.y < two.y + two.height && one.y + one.height > two.y;
    expect(overlaps, `${one.label} and ${two.label} remain legible when one animal barely moves`).toBe(false);
  }
  for (let k = 0; k < 3; k++) {
    const sample = lab.locator(`[data-efw-pair-sample="${'ABC'[k]}"]`);
    await expect(sample).toContainText(recorded.evidence.samples[k].gap.toFixed(3) + ' scene units');
    await sample.getByRole('button', { name: new RegExp(`^Inspect ${'ABC'[k]} `) }).focus();
    await page.keyboard.press('Enter');
    await expect(timeline).toHaveValue(String(recorded.steps[k]));
  }
  await stage.screenshot({ path: `${reportDir}/pair-ruler-overhead.jpg`, type: 'jpeg', quality: 92 });
  await lab.screenshot({ path: `${reportDir}/pair-ruler-charts.jpg`, type: 'jpeg', quality: 92 });
  await lab.locator('summary').click();
  await expect(canvas).toHaveAttribute('data-field-ruler', 'false');
  await lab.locator('summary').click();
  await expect(canvas).toHaveAttribute('data-field-ruler', 'true');
  const representative = meadow.getByLabel('Representative animal', { exact: true });
  const alternative = await representative.locator('option').evaluateAll((options, chosen) => options.map(option => (option as HTMLOptionElement).value).find(value => value !== chosen), String(recorded.encounter.actor.index));
  expect(alternative, 'there is another real representative for activity invalidation').toBeTruthy();
  await representative.selectOption(alternative!);
  await expect(lab).toHaveCount(0);
  await expect(canvas).toHaveAttribute('data-field-ruler', 'false');
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork)).toBeNull();
  await revealPair(page);
  for (const letter of ['A', 'B', 'C']) await expect(lab.locator(`[data-efw-pair-sample="${letter}"]`)).toContainText('No valid sample recorded.');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(recorded.run);
});

test('learners correct unordered pair evidence, revise a claim and save/reopen exact measurements without changing the ecological prediction', async ({ page }) => {
  const prediction = 'I predict the food-web branches match because no disturbance is applied.';
  const { meadow, canvas, fieldwork, lab, timeline, comparisonTime } = await mount(page, 'Rabbit neighbors', prediction);
  const recorded = await revealPair(page);
  await recordCheckpoints(page, [recorded.steps[2], recorded.steps[1], recorded.steps[0]]);
  await expect(lab.locator('[data-efw-pair-order-error]')).toContainText('Keep A before B and B before C');
  await expect(lab.getByLabel('Pair gap claim', { exact: true })).toHaveCount(0);
  // Clear both swapped checkpoints before replacing them: the UI deliberately
  // blocks duplicate sample times rather than silently overwriting evidence.
  await lab.getByRole('button', { name: 'Clear sample A', exact: true }).click();
  await lab.getByRole('button', { name: 'Clear sample C', exact: true }).click();
  await recordCheckpoints(page, recorded.steps);
  await expect(lab.locator('[data-efw-pair-order-error]')).toHaveCount(0);
  const wrong = recorded.evidence.trend === 'steady' ? 'closer' : 'steady';
  await lab.getByLabel('Pair gap claim', { exact: true }).selectOption(wrong);
  await lab.getByRole('button', { name: 'Check my gap evidence', exact: true }).click();
  await expect(lab.locator('[data-efw-pair-feedback]')).toContainText('Revisit the pattern');
  await lab.getByLabel('Pair gap claim', { exact: true }).selectOption(recorded.evidence.trend);
  await lab.getByRole('button', { name: 'Check my gap evidence', exact: true }).click();
  await expect(lab.locator('[data-efw-pair-feedback]')).toContainText('Your claim matches these measured samples.');
  const reflection = 'Both animals changed position. I used the same two representatives at all three checkpoints; this changing gap does not establish a capture or a population effect.';
  await lab.getByLabel('Pair measurement reflection', { exact: true }).fill(reflection);
  await fieldwork.getByLabel('Wildlife explanation', { exact: true }).fill('The fox briefly listened toward a nearby moving prey representative.');
  await fieldwork.getByLabel('Wildlife model limit', { exact: true }).fill('The illustrated gap is measured in scene units, not metres.');
  await fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true }).click();
  const note = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[0]);
  expect(note.sighting.measurement).toMatchObject({ samples: recorded.evidence.samples, intervals: recorded.evidence.intervals, firstClaim: wrong, claim: recorded.evidence.trend, reflection });
  expect(note.sighting.runPrediction).toBe(prediction);
  const saved = JSON.stringify(note);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-field-ruler', 'false');
  const frozen = await canvas.getAttribute('data-representative-position');
  await lab.getByLabel('Pair measurement time', { exact: true }).fill(String(recorded.steps[0]));
  await expect(canvas).toHaveAttribute('data-representative-position', frozen!);
  await expect(lab.locator('[data-efw-pair-reduced]')).toBeVisible();
  await expect(lab.getByRole('img', { name: 'Measured gap against time', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await lab.screenshot({ path: `${reportDir}/mobile-pair-evidence.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('experiment');
  await page.locator('[data-efw-notebook]').getByRole('button', { name: 'Reopen observation 1', exact: true }).click();
  await expect(meadow.getByLabel('Meadow scene data', { exact: true })).toHaveValue('baseline');
  await expect(canvas).toHaveAttribute('data-selected-species', recorded.encounter.actor.id);
  await expect(canvas).toHaveAttribute('data-representative-index', String(recorded.encounter.actor.index));
  await expect(timeline).toHaveValue(String(recorded.steps[2]));
  await expect(comparisonTime).toHaveValue(String(recorded.steps[2]));
  await expect(canvas).toHaveAttribute('data-field-ruler', 'true');
  await expect(page.getByLabel('Your prediction (optional)', { exact: true })).toHaveValue(prediction);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(saved);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(recorded.run);
});

async function chooseMammal(page: Page, id: string, sample: any) {
  const meadow = page.locator('[data-efw-meadow]');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption(sample.branch);
  await meadow.getByRole('button', { name: id === 'foxes' ? /Red foxes\s[\d.]/ : /Rabbits\s[\d.]/ }).click();
  await meadow.getByLabel('Meadow timeline', { exact: true }).fill(String(sample.step));
  const representatives = meadow.getByLabel('Representative animal', { exact: true });
  if (await representatives.isEnabled()) await representatives.selectOption(String(sample.index));
  const canvas = meadow.locator('canvas');
  await expect(canvas).toHaveAttribute('data-selected-species', id);
  await expect(canvas).toHaveAttribute('data-representative-index', String(sample.index));
  await expect(canvas).toHaveAttribute('data-step', String(sample.step));
}

async function actualMammalSurface(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const animals = scene.children.filter((a: any) => a.visible && a.userData.mammalParts && (id === 'foxes' ? a.userData.legs : a.userData.paws));
    if (animals.length !== 1) throw new Error(`Expected one isolated ${id}, found ${animals.length}`);
    const animal = animals[0], data = animal.userData;
    const torso = animal.getObjectByName(`eco-${id}-torso-surface`), raw = api.mammalSurface(id, 'torso');
    const attr = torso.geometry.getAttribute('position'), normals = torso.geometry.getAttribute('normal'), home = data.mammalParts.back.userData.home.toArray();
    let torsoMaxError = 0, badNormals = 0;
    for (let k = 0; k < attr.count; k++) {
      for (let axis = 0; axis < 3; axis++) torsoMaxError = Math.max(torsoMaxError, Math.abs(attr.array[k * 3 + axis] - (raw.positions[k * 3 + axis] - home[axis])));
      const length = Math.hypot(normals.getX(k), normals.getY(k), normals.getZ(k));
      if (!Number.isFinite(length) || Math.abs(length - 1) > 1e-4) badNormals++;
    }
    const nose = animal.getObjectByName(`eco-${id}-nose`), center = new T.Vector3().setFromMatrixPosition(nose.matrixWorld), elements = nose.matrixWorld.elements;
    const bottom = center.y - Math.hypot(elements[1], elements[5], elements[9]);
    const paws = (id === 'foxes' ? data.legs : data.paws).map((leg: any) => {
      const mesh = id === 'foxes' ? leg.userData.rig.paw.children.find((part: any) => part.isMesh) : leg.userData.paw;
      const c = new T.Vector3().setFromMatrixPosition(mesh.matrixWorld), e = mesh.matrixWorld.elements;
      return c.y - Math.hypot(e[1], e[5], e[9]) - api.groundHeight(c.x, c.z);
    });
    let tail: any = null;
    if (id === 'foxes') {
      const brush = animal.getObjectByName('eco-foxes-tail-surface'), source = api.mammalSurface(id, 'tail'), positions = brush.geometry.getAttribute('position'), n = brush.geometry.getAttribute('normal');
      let maxError = 0, invalidNormals = 0;
      for (let k = 0; k < positions.count; k++) {
        const point = api.mammalTailPoint(source.positions[k * 3], source.positions[k * 3 + 1], source.positions[k * 3 + 2], brush.userData.lastCurl, brush.userData.lastTrim);
        const expected = Array.isArray(point) ? point : [point.x, point.y, point.z];
        for (let axis = 0; axis < 3; axis++) maxError = Math.max(maxError, Math.abs(positions.array[k * 3 + axis] - expected[axis]));
        const length = Math.hypot(n.getX(k), n.getY(k), n.getZ(k));
        if (!Number.isFinite(length) || Math.abs(length - 1) > 1e-4) invalidNormals++;
      }
      const allBrushes: any[] = [];
      scene.traverse((object: any) => { if (object.name === 'eco-foxes-tail-surface') allBrushes.push(object); });
      tail = { count: positions.count, dimensions: brush.geometry.userData.ecoSurfaceDimensions, maxError, invalidNormals, curl: brush.userData.lastCurl, trim: brush.userData.lastTrim, uniqueGeometry: allBrushes.every(other => other === brush || other.geometry !== brush.geometry) };
    }
    return { count: attr.count, dimensions: torso.geometry.userData.ecoSurfaceDimensions, torsoMaxError, badNormals, noseGap: bottom - api.groundHeight(center.x, center.z), paws, tail };
  }, id);
}

test('continuous mammal surfaces bend without shared-tail distortion, grazing lowers the muzzle and recorded shelter targets match real thickets', async ({ page }) => {
  const { meadow, canvas, stage } = await mount(page, 'Habitat restoration');
  const samples = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config;
    const out: any = { graze: null, rest: null, fox: null, shelter: null };
    for (const branch of ['baseline', 'experiment']) {
      const frames = api.behaviorTimeline(config, api.compare(config)[branch]);
      frames.forEach((frame: any, step: number) => {
        frame.rabbits.forEach((pose: any, index: number) => {
          if (!pose.active) return;
          const sample = { branch, step, index, pose, art: api.mammalArticulation('rabbits', pose, false) };
          if (!out.graze || pose.forage > out.graze.pose.forage) out.graze = sample;
          if (!out.rest || pose.forage < out.rest.pose.forage) out.rest = sample;
          if (pose.refugeCue && (!out.shelter || (pose.refugeCue.stage === 'at-cover' && out.shelter.pose.refugeCue.stage !== 'at-cover'))) out.shelter = sample;
        });
        frame.foxes.forEach((pose: any, index: number) => {
          if (!pose.active) return;
          const art = api.mammalArticulation('foxes', pose, false);
          if (!out.fox || Math.abs(art.tailCurl) > Math.abs(out.fox.art.tailCurl)) out.fox = { branch, step, index, pose, art };
        });
      });
    }
    return { ...out, run: JSON.stringify(w.__toolData.ecosystem.foodWeb.run) };
  });
  expect(samples.graze).toBeTruthy();
  expect(samples.fox).toBeTruthy();
  expect(samples.shelter, 'the actual restoration recording includes an indexed shelter decision').toBeTruthy();
  await meadow.getByRole('button', { name: 'Inspect selected group', exact: true }).click();
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  await chooseMammal(page, 'foxes', samples.fox);
  await meadow.getByRole('button', { name: 'Side view', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-mammal-surface', 'continuous-torso,continuous-brush');
  const fox = await actualMammalSurface(page, 'foxes');
  expect(fox.torsoMaxError).toBeLessThan(1e-6);
  expect(fox.badNormals).toBe(0);
  expect(fox.tail.maxError).toBeLessThan(1e-6);
  expect(fox.tail.invalidNormals).toBe(0);
  expect(fox.tail.curl).toBeCloseTo(samples.fox.art.tailCurl, 10);
  expect(fox.tail.uniqueGeometry).toBe(true);
  await stage.screenshot({ path: `${reportDir}/continuous-fox-brush.jpg`, type: 'jpeg', quality: 92 });
  await chooseMammal(page, 'rabbits', samples.rest);
  const rest = await actualMammalSurface(page, 'rabbits');
  await chooseMammal(page, 'rabbits', samples.graze);
  await expect(canvas).toHaveAttribute('data-mammal-surface', 'continuous-torso');
  const graze = await actualMammalSurface(page, 'rabbits');
  expect(graze.torsoMaxError).toBeLessThan(1e-6);
  expect(graze.badNormals).toBe(0);
  expect(samples.graze.pose.forage).toBeGreaterThan(0.65);
  expect(graze.noseGap).toBeLessThan(rest.noseGap - 0.08);
  expect(graze.noseGap).toBeGreaterThan(-0.02);
  for (const gap of graze.paws) expect(Math.abs(gap - 0.002)).toBeLessThan(0.008);
  await stage.screenshot({ path: `${reportDir}/rabbit-ground-grazing.jpg`, type: 'jpeg', quality: 92 });
  await chooseMammal(page, 'rabbits', samples.shelter);
  await meadow.getByRole('button', { name: 'Show shelter target', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-refuge-target-visible', 'true');
  const refuge = await page.evaluate(() => {
    const w = window as any, T = w.THREE, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const canvas = document.querySelector('[data-efw-meadow] canvas')!;
    const target = JSON.parse(canvas.getAttribute('data-refuge-target')!);
    const ring = scene.getObjectByName('eco-refuge-target-ring'), path = scene.getObjectByName('eco-refuge-target-path'), patch = scene.getObjectByName(`eco-refuge-patch-${target.index}`);
    const center = new T.Vector3().setFromMatrixPosition(ring.matrixWorld), patchCenter = new T.Vector3().setFromMatrixPosition(patch.matrixWorld);
    const attr = path.geometry.getAttribute('position'), points = [];
    for (let k = 0; k < attr.count; k++) points.push(new T.Vector3().fromBufferAttribute(attr, k).applyMatrix4(path.matrixWorld).toArray());
    return { target, ring: center.toArray(), patch: patchCenter.toArray(), patchVisible: patch.visible, path: points };
  });
  expect(refuge.target.index).toBe(samples.shelter.pose.refugeCue.index);
  for (const axis of [0, 2]) {
    const expected = axis === 0 ? samples.shelter.pose.refugeCue.x : samples.shelter.pose.refugeCue.z;
    expect(refuge.ring[axis]).toBeCloseTo(expected, 7);
    expect(refuge.patch[axis]).toBeCloseTo(expected, 7);
    expect(refuge.path.at(-1)![axis]).toBeCloseTo(expected, 5);
  }
  expect(refuge.patchVisible).toBe(true);
  await stage.screenshot({ path: `${reportDir}/rabbit-shelter-target.jpg`, type: 'jpeg', quality: 92 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-refuge-target-visible', 'false');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(samples.run);
});
