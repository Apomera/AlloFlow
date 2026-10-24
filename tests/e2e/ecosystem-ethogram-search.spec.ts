import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true });
const reportDir = 'reports/ecosystem-ethogram-search';
test.describe.configure({ timeout: 240_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page);
  expect(errors, 'actual anatomy, search and ethogram workflows have no uncaught errors').toEqual([]);
});

async function mount(page: Page, preset = 'Habitat restoration', prediction = '', cover?: string) {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white';
  });
  await page.getByRole('button', { name: preset, exact: true }).click();
  if (cover !== undefined) await page.getByLabel('Starting refuge cover', { exact: true }).fill(cover);
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
  expect(await initialized.jsonValue(), 'the actual renderer initializes and draws before controls are tested').toBe('ready');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  return { meadow, canvas: meadow.locator('canvas'), stage: meadow.locator('.efw-meadow-stage'), timeline: meadow.getByLabel('Meadow timeline', { exact: true }), comparisonTime: page.getByLabel('Food-web comparison time', { exact: true }), ethogram: meadow.locator('[data-efw-ethogram]') };
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

async function recordedFrames(page: Page) {
  return page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config, comparison = api.compare(config);
    w.__ethogramSearchFrames = { baseline: api.behaviorTimeline(config, comparison.baseline), experiment: api.behaviorTimeline(config, comparison.experiment) };
    return { config, run: JSON.stringify(w.__toolData.ecosystem.foodWeb.run) };
  });
}

async function readHead(page: Page, id: string) {
  return page.evaluate(id => {
    const w = window as any, T = w.THREE, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    const animal = scene.children.find((a: any) => a.visible && a.userData.headSurface?.name === `eco-${id}-head-surface`), data = animal?.userData;
    if (!data) throw new Error(`No isolated ${id} surface rig exists`);
    const home = id === 'foxes' ? [.24, .58, 0] : [.24, .4, 0];
    function geometryError(mesh: any, part: string, offset: number[]) {
      const raw = api.mammalSurface(id, part), a = mesh.geometry.getAttribute('position'), normal = mesh.geometry.getAttribute('normal');
      let maximum = 0, invalidNormals = 0;
      for (let k = 0; k < a.count; k++) {
        for (let axis = 0; axis < 3; axis++) maximum = Math.max(maximum, Math.abs(a.array[k * 3 + axis] - (raw.positions[k * 3 + axis] - offset[axis])));
        const length = Math.hypot(normal.getX(k), normal.getY(k), normal.getZ(k));
        if (!Number.isFinite(length) || Math.abs(length - 1) > 1e-4) invalidNormals++;
      }
      return { maximum, invalidNormals, vertices: a.count, indices: mesh.geometry.index.count, vertexColors: mesh.material.vertexColors };
    }
    const ears: any[] = [];
    animal.traverse((node: any) => { if (node.name.startsWith(`eco-${id}-pinna-`)) ears.push({ name: node.name, scale: node.scale.toArray(), ...geometryError(node, 'ear', [0, 0, 0]) }); });
    const nose = animal.getObjectByName(`eco-${id}-nose`), c = new T.Vector3().setFromMatrixPosition(nose.matrixWorld), e = nose.matrixWorld.elements;
    const noseGap = c.y - Math.hypot(e[1], e[5], e[9]) - api.groundHeight(c.x, c.z);
    const paws = (id === 'foxes' ? data.legs : data.paws).map((leg: any) => {
      const mesh = id === 'foxes' ? leg.userData.rig.paw.children.find((part: any) => part.isMesh) : leg.userData.paw;
      const p = new T.Vector3().setFromMatrixPosition(mesh.matrixWorld), m = mesh.matrixWorld.elements;
      return p.y - Math.hypot(m[1], m[5], m[9]) - api.groundHeight(p.x, p.z);
    });
    const lids = data.eyelidSkin, expectedLids = api.mammalEyelids(id, lids.userData.opening), positions = lids.geometry.getAttribute('position');
    let lidError = 0;
    for (let k = 0; k < positions.array.length; k++) lidError = Math.max(lidError, Math.abs(positions.array[k] - expectedLids.positions[k]));
    return { head: geometryError(data.headSurface, 'head', home), ears, eyeOpen: data.eyeGroups.map((eye: any) => eye.scale.y), eyeMatrices: data.eyeGroups.map((eye: any) => [eye.matrix.toArray(), ...eye.children.map((mesh: any) => mesh.matrix.toArray())]), lidOpening: lids.userData.opening, lidError, jaw: [data.jaw.rotation.z, data.jaw.rotation.y], nose: nose.position.toArray(), noseScale: nose.scale.toArray(), noseGap, paws, matrix: data.head.matrix.toArray(), bodyPosition: animal.position.toArray() };
  }, id);
}

test('real head and cupped ear meshes keep their anatomical geometry while eyes blink, grazing jaws move and paws stay planted', async ({ page }) => {
  const { meadow, canvas, stage, timeline } = await mount(page);
  const run = await recordedFrames(page);
  const targets = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, out: any = { foxes: {}, rabbits: {} };
    for (const branch of ['baseline', 'experiment']) w.__ethogramSearchFrames[branch].forEach((frame: any, step: number) => {
      for (const id of ['foxes', 'rabbits']) frame[id].forEach((pose: any, index: number) => {
        if (!pose.active) return;
        const art = api.mammalArticulation(id, pose, false), sample = { branch, step, index, pose, art }, choice = out[id];
        if (!choice.blink || art.eyeOpen < choice.blink.art.eyeOpen) choice.blink = sample;
        if (!choice.open || art.eyeOpen > choice.open.art.eyeOpen) choice.open = sample;
        if (!choice.feed || pose.forage > choice.feed.pose.forage) choice.feed = sample;
        if (!choice.chew || art.jawOpen > choice.chew.art.jawOpen) choice.chew = sample;
      });
    });
    let stationary: any = null;
    for (const branch of ['baseline', 'experiment']) for (const id of ['foxes', 'rabbits']) for (let index = 0; index < 16; index++) {
      let previous: any = null, minimum: any = null, maximum: any = null;
      w.__ethogramSearchFrames[branch].forEach((frame: any, step: number) => {
        const pose = frame[id][index], art = api.mammalArticulation(id, pose, false);
        if (!pose?.active || pose.state !== 'Resting' || pose.moving > .01 || art.supportFeet !== 4 || art.flightLift !== 0) { previous = minimum = maximum = null; return; }
        const sample = { branch, id, index, step, pose, art };
        if (!previous || Math.hypot(pose.x - previous.pose.x, pose.z - previous.pose.z) > 1e-9) minimum = maximum = sample;
        else {
          if (art.eyeOpen < minimum.art.eyeOpen) minimum = sample;
          if (art.eyeOpen > maximum.art.eyeOpen) maximum = sample;
        }
        const variation = maximum.art.eyeOpen - minimum.art.eyeOpen;
        if (!stationary || variation > stationary.variation) stationary = { id, minimum, maximum, variation };
        previous = sample;
      });
    }
    out.stationary = stationary;
    return out;
  });
  await meadow.getByRole('button', { name: 'Inspect selected group', exact: true }).click();
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  for (const id of ['foxes', 'rabbits']) {
    const poses: any = {};
    for (const label of ['open', 'blink', 'feed', 'chew']) {
      const sample = targets[id][label];
      await chooseMammal(page, id, sample);
      const actual = await readHead(page, id);
      expect(actual.head.maximum).toBeLessThan(1e-6);
      expect(actual.head.invalidNormals).toBe(0);
      expect(actual.head.vertices).toBeGreaterThan(100);
      expect(actual.head.indices).toBeGreaterThan(300);
      expect(actual.ears).toHaveLength(2);
      for (const ear of actual.ears) { expect(ear.maximum).toBeLessThan(1e-6); expect(ear.invalidNormals).toBe(0); expect(ear.vertexColors).toBe(true); }
      expect(actual.eyeOpen).toHaveLength(2);
      expect(actual.eyeOpen).toEqual([1, 1]);
      expect(actual.lidOpening).toBeCloseTo(Math.max(0, Math.min(1, (sample.art.eyeOpen - .12) / .88)), 10);
      expect(actual.lidError).toBeLessThan(1e-7);
      expect(actual.jaw[0]).toBeCloseTo(-sample.art.jawOpen, 10);
      expect(actual.jaw[1]).toBeCloseTo(sample.art.jawSide, 10);
      poses[label] = actual;
    }
    expect(targets[id].blink.art.eyeOpen).toBeLessThan(targets[id].open.art.eyeOpen - .3);
    expect(poses.blink.eyeMatrices).toEqual(poses.open.eyeMatrices);
    await chooseMammal(page, id, targets[id].blink);
    expect(await readHead(page, id)).toEqual(poses.blink);
    await meadow.getByRole('button', { name: 'Face view', exact: true }).click();
    await stage.screenshot({ path: `${reportDir}/${id}-face-anatomy.jpg`, type: 'jpeg', quality: 92 });
    if (id === 'foxes') {
      expect(poses.open.nose[0]).toBeCloseTo(.436, 8);
      expect(poses.open.noseScale[0]).toBeCloseTo(.027, 8);
    } else {
      expect(targets[id].chew.art.jawOpen).toBeGreaterThan(.02);
      expect(poses.chew.jaw).not.toEqual(poses.open.jaw);
      expect(poses.feed.noseGap).toBeLessThan(.1);
      expect(poses.feed.noseGap).toBeGreaterThan(-.02);
      for (const gap of poses.feed.paws) expect(Math.abs(gap - .002)).toBeLessThan(.008);
      await chooseMammal(page, id, targets[id].feed);
      await meadow.getByRole('button', { name: 'Side view', exact: true }).click();
      await stage.screenshot({ path: `${reportDir}/rabbit-chewing-graze.jpg`, type: 'jpeg', quality: 92 });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
    const reduced = await readHead(page, id);
    expect(reduced.eyeOpen).toEqual([1, 1]);
    expect(reduced.lidOpening).toBe(1);
    for (const angle of reduced.jaw) expect(angle).toBeCloseTo(0, 12);
    await timeline.fill('160');
    expect(await readHead(page, id)).toEqual(reduced);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(canvas).not.toHaveAttribute('data-behavior', 'Starting pose');
  }
  expect(targets.stationary, 'the recording includes a fully stationary resting animal').toBeTruthy();
  expect(targets.stationary.variation, 'recorded time continues blinking during a stationary rest').toBeGreaterThan(.15);
  const stationaryEyes: any[] = [];
  for (const sample of [targets.stationary.minimum, targets.stationary.maximum]) {
    await chooseMammal(page, targets.stationary.id, sample);
    stationaryEyes.push(await readHead(page, targets.stationary.id));
    expect(stationaryEyes.at(-1).eyeOpen).toEqual([1, 1]);
    expect(stationaryEyes.at(-1).lidOpening).toBeCloseTo(Math.max(0, Math.min(1, (sample.art.eyeOpen - .12) / .88)), 10);
  }
  expect(stationaryEyes[0].bodyPosition[0]).toBeCloseTo(stationaryEyes[1].bodyPosition[0], 9);
  expect(stationaryEyes[0].bodyPosition[2]).toBeCloseTo(stationaryEyes[1].bodyPosition[2], 9);
  expect(stationaryEyes[1].lidOpening - stationaryEyes[0].lidOpening).toBeGreaterThan(.15);
  expect(stationaryEyes[1].eyeMatrices).toEqual(stationaryEyes[0].eyeMatrices);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(run.run);
});

test('a fox checks one fixed previously recorded prey location and the violet marker never tracks the concealed rabbit', async ({ page }) => {
  const { meadow, canvas, stage, timeline, comparisonTime } = await mount(page, 'Rabbit neighbors', '', '80');
  const run = await recordedFrames(page);
  const recording = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, frames = w.__ethogramSearchFrames.baseline;
    let episode: any[] | null = null;
    frames.forEach((frame: any, step: number) => frame.foxes.forEach((pose: any, index: number) => {
      if (episode || pose.searchCue?.age !== 0) return;
      const found = [];
      for (let k = step; k < Math.min(step + 12, frames.length); k++) {
        const next = frames[k].foxes[index];
        if (!next.searchCue) break;
        found.push({ branch: 'baseline', step: k, index, pose: next, source: frames[k].rabbits[next.searchCue.index], previous: frames[k - 1].rabbits[next.searchCue.index], interaction: api.interaction(frames[k], 'foxes', index) });
      }
      if (found.length >= 2) episode = found;
    }));
    return episode;
  });
  expect(recording, 'the actual dense-cover recording includes a bounded fox search').toBeTruthy();
  const episode = recording as any[];
  expect(episode.length).toBeLessThanOrEqual(10);
  const anchor = episode[0].pose.searchCue;
  for (const sample of episode) {
    expect(sample.pose.state).toBe('Checking last location');
    expect(sample.pose.searchCue.x).toBe(anchor.x);
    expect(sample.pose.searchCue.z).toBe(anchor.z);
    expect(sample.pose.searchCue.index).toBe(anchor.index);
    expect(sample.pose.searchCue.duration).toBe(10);
    expect(sample.pose.searchCue.age).toBe(sample.step - episode[0].step);
    expect(sample.previous.state).toBe('Alert');
    expect(sample.previous.refugeCue.stage).toBe('at-cover');
    expect(sample.previous.active).toBe(true);
    expect(sample.interaction).toBeNull();
  }
  await meadow.getByRole('button', { name: 'Inspect a fox search near shelter', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-behavior', 'Checking last location');
  // Inspect the discovered episode itself; the discovery button may choose a
  // different valid fox episode without weakening this fixed-anchor check.
  await chooseMammal(page, 'foxes', episode[0]);
  const showMemory = meadow.getByRole('button', { name: 'Show remembered location', exact: true });
  if ((await showMemory.getAttribute('aria-pressed')) !== 'true') await showMemory.click();
  for (const sample of [episode[0], episode.at(-1)!]) {
    await timeline.fill(String(sample.step));
    await expect(comparisonTime).toHaveValue(String(sample.step));
    await expect(canvas).toHaveAttribute('data-search-location-visible', 'true');
    await expect(canvas).toHaveAttribute('data-interaction-connector', 'false');
    const cue = JSON.parse((await canvas.getAttribute('data-search-cue'))!);
    expect(cue).toEqual(sample.pose.searchCue);
    const actual = await page.evaluate(() => {
      const w = window as any, T = w.THREE, scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
      const group = scene.getObjectByName('eco-fox-memory-target'), ring = scene.getObjectByName('eco-fox-memory-target-ring'), path = scene.getObjectByName('eco-fox-memory-target-path');
      const center = new T.Vector3().setFromMatrixPosition(ring.matrixWorld), attr = path.geometry.getAttribute('position'), last = new T.Vector3().fromBufferAttribute(attr, attr.count - 1).applyMatrix4(path.matrixWorld);
      return { visible: group.visible, center: center.toArray(), endpoint: last.toArray(), color: ring.material.color.getHex() };
    });
    expect(actual.visible).toBe(true);
    expect(actual.color).toBe(0xc4b5fd);
    for (const axis of [0, 2]) {
      const value = axis === 0 ? anchor.x : anchor.z;
      expect(actual.center[axis]).toBeCloseTo(value, 8);
      expect(actual.endpoint[axis]).toBeCloseTo(value, 5);
    }
  }
  await stage.screenshot({ path: `${reportDir}/fox-fixed-location-search.jpg`, type: 'jpeg', quality: 92 });
  await meadow.getByRole('button', { name: 'Show remembered location', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-search-location-visible', 'false');
  await meadow.getByRole('button', { name: 'Show remembered location', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-search-location-visible', 'false');
  await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const after = episode.at(-1)!.step + 1;
  await timeline.fill(String(after));
  await expect(canvas).toHaveAttribute('data-search-cue', '');
  await expect(canvas).toHaveAttribute('data-search-location-visible', 'false');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(run.run);
});

test('five inspected checkpoints preserve first behavior codes, support revisions and restore the exact saved ethogram and ecological prediction', async ({ page }) => {
  const prediction = 'I predict habitat restoration reduces predator access without proving an individual rabbit survived.';
  const { meadow, canvas, stage, ethogram, timeline, comparisonTime } = await mount(page, 'Habitat restoration', prediction);
  const run = await recordedFrames(page);
  const fixture = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb;
    let best: any = null;
    const branch = 'experiment', frames = w.__ethogramSearchFrames[branch];
    for (const id of ['foxes', 'rabbits']) for (let start = 0; start <= 160; start += 20) for (const interval of [5, 10, 15, 20]) {
      const plan = api.ethogramPlan(frames, id, 0, start, interval);
      if (!plan) continue;
      const variety = new Set(plan.samples.map((s: any) => s.category)).size;
      if (!best || variety > best.variety) best = { branch, id, index: 0, step: start, plan, variety };
    }
    if (!best) return null;
    best.categories = api.ethogramCategories();
    best.wrong = best.plan.samples.map((s: any) => best.categories.find((category: any) => category.id !== s.category).id);
    return best;
  });
  expect(fixture).toBeTruthy();
  expect(fixture.variety).toBeGreaterThanOrEqual(2);
  await chooseMammal(page, fixture.id, fixture);
  await ethogram.locator('summary').first().click();
  await ethogram.getByLabel('Ethogram start time', { exact: true }).fill(String(fixture.plan.start));
  await ethogram.getByLabel('Ethogram sampling interval', { exact: true }).fill(String(fixture.plan.interval));
  await ethogram.getByRole('button', { name: 'Set sampling plan', exact: true }).click();
  const cards = ethogram.locator('[data-efw-ethogram-sample]');
  await expect(cards).toHaveCount(5);
  await expect(ethogram.getByRole('button', { name: 'Check my ethogram', exact: true })).toBeDisabled();
  for (let k = 0; k < 5; k++) {
    const card = ethogram.locator(`[data-efw-ethogram-sample="${k}"]`);
    await expect(card).not.toContainText('Recorded:');
    await card.getByLabel(`Ethogram sample ${k + 1} code`, { exact: true }).selectOption(fixture.wrong[k]);
  }
  await expect(ethogram.getByRole('button', { name: 'Check my ethogram', exact: true })).toBeDisabled();
  for (let k = 0; k < 5; k++) {
    const card = ethogram.locator(`[data-efw-ethogram-sample="${k}"]`);
    await card.getByRole('button', { name: `Inspect ethogram sample ${k + 1}`, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(timeline).toHaveValue(String(fixture.plan.samples[k].step));
    await expect(comparisonTime).toHaveValue(String(fixture.plan.samples[k].step));
    await expect(card).toContainText('Inspected');
  }
  await ethogram.getByRole('button', { name: 'Check my ethogram', exact: true }).click();
  await expect(ethogram.locator('[data-efw-ethogram-feedback]')).toContainText('0 of 5 current codes match');
  for (let k = 0; k < 5; k++) await ethogram.getByLabel(`Ethogram sample ${k + 1} code`, { exact: true }).selectOption(fixture.plan.samples[k].category);
  await ethogram.getByRole('button', { name: 'Check revised ethogram', exact: true }).click();
  const feedback = ethogram.locator('[data-efw-ethogram-feedback]');
  await expect(feedback).toContainText('5 of 5 current codes match');
  await expect(feedback).toContainText('First submission: 0 of 5 codes matched.');
  await expect(feedback.getByRole('img', { name: 'Ethogram coded and recorded sample tally', exact: true })).toBeVisible();
  await expect(feedback.getByRole('table')).toContainText('Category tally from these five samples');
  for (const category of fixture.categories) {
    const count = fixture.plan.samples.filter((sample: any) => sample.category === category.id).length;
    const row = feedback.getByRole('row', { name: new RegExp(`^${category.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} `) });
    await expect(row.getByRole('cell')).toHaveCount(2);
    for (const cell of await row.getByRole('cell').all()) await expect(cell).toContainText(count + '/5');
  }
  await expect(feedback).toContainText('not the fraction of elapsed time');
  const reflection = 'I revised my codes using the same declared key. These five samples describe checkpoints of one representative; a different sampling interval could change this tally.';
  await ethogram.getByLabel('Ethogram reflection', { exact: true }).fill(reflection);
  await ethogram.getByRole('button', { name: 'Save ethogram observation', exact: true }).click();
  const note = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[0]);
  expect(note.ethogram).toMatchObject({ branch: fixture.branch, species: fixture.id, index: fixture.index, start: fixture.plan.start, interval: fixture.plan.interval, samples: fixture.plan.samples, firstCodes: fixture.wrong, codes: fixture.plan.samples.map((s: any) => s.category), reflection, runPrediction: prediction });
  expect(note.step).toBe(fixture.plan.samples[2].step);
  const saved = JSON.stringify(note);
  const exported = await page.evaluate(() => (window as any).StemLab.ecosystemFoodWeb.notebookText((window as any).__toolData.ecosystem.foodWeb.notebook));
  expect(exported).toContain(prediction);
  expect(exported).toContain(reflection);
  for (const sample of fixture.plan.samples) expect(exported).toContain(sample.state);
  await ethogram.screenshot({ path: `${reportDir}/five-sample-ethogram.jpg`, type: 'jpeg', quality: 92 });
  await stage.screenshot({ path: `${reportDir}/ethogram-selected-animal.jpg`, type: 'jpeg', quality: 92 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(ethogram.locator('[data-efw-ethogram-reduced]')).toBeVisible();
  await expect(ethogram.locator('[data-efw-ethogram-recorded-description]')).toHaveCount(5);
  const frozen = await canvas.getAttribute('data-representative-position');
  await ethogram.getByRole('button', { name: 'Inspect ethogram sample 1', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-representative-position', frozen!);
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileChart = ethogram.locator('[data-efw-ethogram-mobile-chart]');
  await expect(mobileChart).toBeVisible();
  const fontSizes = await mobileChart.locator('.efw-ethogram-bar-label').evaluateAll(nodes => nodes.map(node => Number.parseFloat(getComputedStyle(node).fontSize)));
  expect(fontSizes.length).toBeGreaterThanOrEqual(5);
  for (const size of fontSizes) expect(size).toBeGreaterThanOrEqual(12);
  for (const category of fixture.categories) await expect(mobileChart).toContainText(category.name);
  await ethogram.screenshot({ path: `${reportDir}/mobile-reduced-ethogram.jpg`, type: 'jpeg', quality: 92 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const representative = meadow.getByLabel('Representative animal', { exact: true });
  const alternative = await representative.locator('option').evaluateAll((options, chosen) => options.map(o => (o as HTMLOptionElement).value).find(v => v !== chosen), String(fixture.index));
  expect(alternative).toBeTruthy();
  await representative.selectOption(alternative!);
  await expect(ethogram.locator('[data-efw-ethogram-active]')).toHaveCount(0);
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  await page.locator('[data-efw-notebook]').getByRole('button', { name: 'Reopen observation 1', exact: true }).click();
  await expect(meadow.getByLabel('Meadow scene data', { exact: true })).toHaveValue(fixture.branch);
  await expect(canvas).toHaveAttribute('data-selected-species', fixture.id);
  await expect(canvas).toHaveAttribute('data-representative-index', String(fixture.index));
  await expect(timeline).toHaveValue(String(note.step));
  await expect(ethogram.locator('[data-efw-ethogram-active]')).toBeVisible();
  await expect(ethogram.locator('[data-efw-ethogram-feedback]')).toContainText('5 of 5 current codes match');
  await expect(ethogram.getByLabel('Ethogram reflection', { exact: true })).toHaveValue(reflection);
  await expect(page.getByLabel('Your prediction (optional)', { exact: true })).toHaveValue(prediction);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(saved);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(run.run);
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  await expect(ethogram.locator('[data-efw-ethogram-active]')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(saved);
});
