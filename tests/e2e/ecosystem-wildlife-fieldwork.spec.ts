import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem',
  width: 1100, height: 900, appStyles: true,
});
const reportDir = 'reports/ecosystem-wildlife-fieldwork';

test.describe.configure({ timeout: 150_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => (window as any).__events?.errors || []);
  await harness.destroy(page);
  expect(errors, 'uncaught errors in the real WebGL workflow').toEqual([]);
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
    meadow, canvas: meadow.locator('canvas'),
    fieldwork: meadow.locator('[data-efw-fieldwork]'),
    timeline: meadow.getByLabel('Meadow timeline', { exact: true }),
    comparisonTime: page.getByLabel('Food-web comparison time', { exact: true }),
  };
}

// Expected evidence comes from the run's actual recorded frames, including the
// cue representative. No fixed event times or invented wildlife are injected.
async function recordedEncounter(page: Page, kind: string, branch = 'experiment') {
  return page.evaluate(({ kind, branch }) => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb;
    const config = w.__toolData.ecosystem.foodWeb.run.config;
    const frames = api.behaviorTimeline(config, api.compare(config)[branch]);
    const encounters = api.encounters(frames, config);
    const encounter = encounters.find((item: any) => item.kind === kind);
    if (!encounter) throw new Error(`No recorded ${kind} encounter in ${branch}`);
    const key = encounter.expected === 'avoid' ? 'threat' : 'prey';
    const samples = ['before', 'step', 'after'].map(point => {
      const step = encounter[point], frame = frames[step];
      const actor = frame[encounter.actor.id][encounter.actor.index];
      const cue = frame[encounter.cue.id][encounter.cue.index];
      return {
        step, state: actor?.active ? actor.state : 'Not present',
        cueState: cue?.active ? cue.state : 'Not present',
        distance: actor?.active && actor[key] === encounter.cue.id && actor[key + 'Index'] === encounter.cue.index && Number.isFinite(actor[key + 'Distance']) ? actor[key + 'Distance'] : null,
      };
    });
    const noCue = frames.findIndex((frame: any) => frame[encounter.actor.id]?.[encounter.actor.index]?.active && !api.interaction(frame, encounter.actor.id, encounter.actor.index));
    const replayMoment = api.behaviorMoments(frames, encounter.actor.id, encounter.actor.index).find((moment: any) => moment.active && moment.end - moment.start >= 2 && moment.end - moment.start <= 20);
    return { ...encounter, samples, noCue, replayMoment, run: JSON.stringify(w.__toolData.ecosystem.foodWeb.run) };
  }, { kind, branch });
}

async function assertPairFramed(page: Page) {
  const points = JSON.parse((await page.locator('[data-efw-meadow] canvas').getAttribute('data-interaction-projection'))!);
  expect(points).toHaveLength(2);
  for (const point of points) {
    expect(Math.abs(point[0]), 'animal inside the camera horizontally').toBeLessThan(0.8);
    expect(Math.abs(point[1]), 'animal inside the camera vertically').toBeLessThan(0.8);
    expect(point[2]).toBeGreaterThan(-1);
    expect(point[2]).toBeLessThan(1);
  }
}

async function assertRenderedPair(page: Page, episode: any, branch: string) {
  const geometry = await page.evaluate(({ episode, branch }) => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb;
    const frame = api.behaviorTimeline(w.__toolData.ecosystem.foodWeb.run.config, api.compare(w.__toolData.ecosystem.foodWeb.run.config)[branch])[episode.step];
    const scene = w.__glCanvas('[data-efw-meadow]').rec.scene;
    function read(name: string) {
      const object = scene.getObjectByName(name), position = object.geometry.getAttribute('position');
      let visible = true;
      for (let parent = object; parent; parent = parent.parent) visible = visible && parent.visible;
      return {
        visible, count: object.geometry.drawRange.count, capacity: position.count,
        first: Array.from(position.array.slice(0, 3)),
        last: Array.from(position.array.slice((position.count - 1) * 3, position.count * 3)),
        color: object.material.color.clone().convertLinearToSRGB().toArray(),
        distances: object.geometry.getAttribute('lineDistance') ? Array.from(object.geometry.getAttribute('lineDistance').array) : [],
      };
    }
    function body(id: string, index: number) {
      const pose = frame[id][index];
      return [pose.x, api.groundHeight(pose.x, pose.z) + pose.altitude + (id === 'caterpillars' ? 0.08 : id === 'bluetits' || id === 'voles' ? 0.2 : 0.42), pose.z];
    }
    return { connector: read('eco-interaction-connector'), selected: read('eco-interaction-trail-selected'), cue: read('eco-interaction-trail-cue'), actorBody: body(episode.actor.id, episode.actor.index), cueBody: body(episode.cue.id, episode.cue.index) };
  }, { episode, branch });
  expect(geometry.connector.visible).toBe(true);
  expect(geometry.connector.capacity).toBe(25);
  expect(geometry.connector.distances).toHaveLength(25);
  expect(Number(geometry.connector.distances[24])).toBeGreaterThan(0);
  for (let axis = 0; axis < 3; axis++) {
    expect(Number(geometry.connector.first[axis])).toBeCloseTo(geometry.cueBody[axis], 5);
    expect(Number(geometry.connector.last[axis])).toBeCloseTo(geometry.actorBody[axis], 5);
  }
  for (const trail of [geometry.selected, geometry.cue]) {
    expect(trail.visible).toBe(true);
    expect(trail.capacity).toBe(12);
    expect(trail.count).toBeGreaterThan(1);
    expect(trail.count).toBeLessThanOrEqual(12);
  }
  for (let channel = 0; channel < 3; channel++) {
    expect(geometry.selected.color[channel]).toBeCloseTo([255, 231, 144][channel] / 255, 4);
    expect(geometry.cue.color[channel]).toBeCloseTo([119, 237, 238][channel] / 255, 4);
  }
}

test('fox fieldwork predicts, inspects real paired evidence, replays, and reopens the saved branch and representative', async ({ page }) => {
  const { meadow, canvas, fieldwork, timeline, comparisonTime } = await mount(page);
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  const episode = await recordedEncounter(page, 'fox', 'baseline');
  const card = fieldwork.locator('[data-efw-encounter="fox"]');
  await card.focus();
  await card.press('Enter');
  await expect(card).toHaveAttribute('aria-pressed', 'true');
  await expect(timeline).toHaveValue(String(episode.before));
  await expect(comparisonTime).toHaveValue(String(episode.before));
  await expect(canvas).toHaveAttribute('data-camera-mode', 'detail');
  await expect(canvas).toHaveAttribute('data-isolated-specimen', 'true');
  await expect(canvas).toHaveAttribute('data-selected-species', episode.actor.id);
  await expect(canvas).toHaveAttribute('data-representative-index', String(episode.actor.index));
  const reveal = fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true });
  await expect(reveal).toBeDisabled();
  await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('rest');
  await reveal.focus();
  await reveal.press('Enter');
  await expect(timeline).toHaveValue(String(episode.step));
  await expect(comparisonTime).toHaveValue(String(episode.step));
  await expect(fieldwork).toContainText('The recorded action differs');
  await expect(canvas).toHaveAttribute('data-interaction-view', 'true');
  await expect(canvas).toHaveAttribute('data-interaction-cue', `${episode.cue.id}:${episode.cue.index}`);
  await expect(canvas).toHaveAttribute('data-interaction-connector', 'true');
  await expect(canvas).toHaveAttribute('data-selected-marker', 'gold');
  await expect(canvas).toHaveAttribute('data-cue-marker', 'cyan');
  await expect(canvas).toHaveAttribute('data-interaction-trail-selected', 'true');
  await expect(canvas).toHaveAttribute('data-interaction-trail-cue', 'true');
  await expect.poll(async () => Number(await canvas.getAttribute('data-interaction-trail-selected-count'))).toBeGreaterThan(1);
  await expect.poll(async () => Number(await canvas.getAttribute('data-interaction-trail-cue-count'))).toBeGreaterThan(1);
  await assertPairFramed(page);
  await assertRenderedPair(page, episode, 'baseline');
  const census = await harness.glScene(page, '[data-efw-meadow]');
  expect(census?.hasScene).toBe(true);
  expect(census!.draws).toBeGreaterThan(0);
  expect(census!.visibleMeshes).toBeGreaterThan(20);

  const rows = fieldwork.locator('[data-efw-encounter-evidence] > div');
  await expect(rows).toHaveCount(3);
  for (let i = 0; i < episode.samples.length; i++) {
    const sample = episode.samples[i];
    await expect(rows.nth(i).locator('b')).toHaveText(sample.state);
    await expect(rows.nth(i)).toContainText(`Cue animal: ${sample.cueState}`);
    await expect(rows.nth(i)).toContainText(sample.distance == null ? 'No current cue distance recorded.' : `Decision distance: ${sample.distance.toFixed(2)} scene units`);
  }
  await expect(fieldwork).toContainText('A pounce or feeding pose does not establish a capture.');
  await meadow.locator('.efw-meadow-stage').screenshot({ path: `${reportDir}/desktop-fox.jpg`, type: 'jpeg', quality: 90 });
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-isolated-specimen', 'false');
  await meadow.locator('.efw-meadow-stage').screenshot({ path: `${reportDir}/forest-context.jpg`, type: 'jpeg', quality: 90 });
  await meadow.getByRole('button', { name: 'Isolate specimen', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-isolated-specimen', 'true');

  for (const [label, step] of [['After encounter', episode.after], ['Before encounter', episode.before], ['Encounter moment', episode.step]] as const) {
    const checkpoint = fieldwork.getByRole('button', { name: label, exact: true });
    await checkpoint.focus();
    await checkpoint.press('Enter');
    await expect(timeline).toHaveValue(String(step));
    await expect(comparisonTime).toHaveValue(String(step));
    await expect(checkpoint).toHaveAttribute('aria-pressed', 'true');
  }

  expect(episode.replayMoment).toBeTruthy();
  await meadow.getByLabel('Meadow playback speed', { exact: true }).selectOption('4');
  await timeline.fill(String(episode.replayMoment.end));
  await meadow.getByRole('button', { name: 'Replay this behavior', exact: true }).click();
  await expect(meadow.locator('[data-efw-replay-status]')).toContainText('Replay finished');
  await expect(timeline).toHaveValue(String(episode.replayMoment.end));
  await fieldwork.getByRole('button', { name: 'Before encounter', exact: true }).click();
  await expect(timeline).toHaveValue(String(episode.before));
  await fieldwork.getByRole('button', { name: 'Encounter moment', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-interaction-connector', 'true');

  await fieldwork.getByLabel('Wildlife explanation', { exact: true }).fill('The fox changed its action while the same prey animal supplied a nearby cue.');
  await fieldwork.getByLabel('Wildlife model limit', { exact: true }).fill('I would observe scent and wind outdoors; this animation does not prove a capture.');
  const save = fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true });
  await save.focus();
  await save.press('Enter');
  await expect(save).toBeDisabled();
  await fieldwork.screenshot({ path: `${reportDir}/desktop-fieldwork.jpg`, type: 'jpeg', quality: 90 });
  const notebook = page.locator('[data-efw-notebook]');
  await expect(notebook.locator('[data-efw-note]')).toHaveCount(1);
  const note = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook[0]);
  expect(note.focus).toBe(episode.actor.id);
  expect(note.step).toBe(episode.step);
  expect(note.sighting).toMatchObject({ version: 1, kind: 'fox', branch: 'baseline', actorIndex: episode.actor.index, cueId: episode.cue.id, cueIndex: episode.cue.index, state: episode.samples[1].state, forecast: 'rest', before: { step: episode.before, state: episode.samples[0].state }, after: { step: episode.after, state: episode.samples[2].state } });
  expect(note.sighting.decisionDistance).toBe(episode.samples[1].distance);
  expect(note.explanation).toBe('The fox changed its action while the same prey animal supplied a nearby cue.');
  expect(note.sighting.limitation).toBe('I would observe scent and wind outdoors; this animation does not prove a capture.');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(episode.run);
  const saved = JSON.stringify(note);

  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('experiment');
  await expect(fieldwork.getByLabel('Wildlife explanation', { exact: true })).toHaveCount(0);
  await expect(fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true })).toHaveCount(0);
  await meadow.getByRole('button', { name: /Rabbits\s/ }).click();
  const reopen = notebook.getByRole('button', { name: 'Reopen observation 1', exact: true });
  await reopen.focus();
  await reopen.press('Enter');
  await expect(meadow.getByLabel('Meadow scene data', { exact: true })).toHaveValue('baseline');
  await expect(canvas).toHaveAttribute('data-camera-mode', 'detail');
  await expect(canvas).toHaveAttribute('data-selected-species', episode.actor.id);
  await expect(canvas).toHaveAttribute('data-representative-index', String(episode.actor.index));
  await expect(timeline).toHaveValue(String(episode.step));
  await expect(canvas).toHaveAttribute('data-interaction-cue', `${episode.cue.id}:${episode.cue.index}`);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(saved);
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.run.config)).toEqual(note.config);

  if (episode.noCue >= 0) {
    await timeline.fill(String(episode.noCue));
    await expect(canvas).toHaveAttribute('data-interaction-view', 'false');
    await expect(canvas).toHaveAttribute('data-interaction-connector', 'false');
    await expect(canvas).toHaveAttribute('data-interaction-trail-selected', 'false');
    await expect(canvas).toHaveAttribute('data-interaction-trail-cue', 'false');
    await timeline.fill(String(episode.step));
    await expect(canvas).toHaveAttribute('data-interaction-connector', 'true');
  }
});

test('insect encounter stays readable at 320 and 390 pixels and reduced motion preserves sampled evidence', async ({ page }) => {
  const { meadow, canvas, fieldwork, timeline, comparisonTime } = await mount(page);
  const episode = await recordedEncounter(page, 'insects');
  await fieldwork.locator('[data-efw-encounter="insects"]').click();
  await expect(timeline).toHaveValue(String(episode.before));
  await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('feed');
  await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
  await expect(fieldwork).toContainText('The recorded action fits that description.');
  await expect(canvas).toHaveAttribute('data-selected-species', 'bluetits');
  await expect(canvas).toHaveAttribute('data-interaction-cue', `caterpillars:${episode.cue.index}`);
  await expect(canvas).toHaveAttribute('data-interaction-connector', 'true');
  await assertPairFramed(page);
  await assertRenderedPair(page, episode, 'experiment');
  await meadow.locator('.efw-meadow-stage').screenshot({ path: `${reportDir}/insects.jpg`, type: 'jpeg', quality: 90 });

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await assertPairFramed(page);
    await expect(fieldwork.getByLabel('Wildlife explanation', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no page overflow at ${width}px`).toBe(true);
  }
  await fieldwork.screenshot({ path: `${reportDir}/mobile.jpg`, type: 'jpeg', quality: 90 });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(fieldwork.locator('[data-efw-fieldwork-reduced]')).toContainText('starting poses');
  await expect(canvas).toHaveAttribute('data-interaction-view', 'false');
  await expect(canvas).toHaveAttribute('data-interaction-connector', 'false');
  await expect(canvas).toHaveAttribute('data-interaction-trail-selected', 'false');
  await expect(canvas).toHaveAttribute('data-interaction-trail-cue', 'false');
  await expect(meadow.getByRole('button', { name: 'Replay this behavior', exact: true })).toBeDisabled();
  const frozen = await canvas.getAttribute('data-representative-position');
  await fieldwork.getByRole('button', { name: 'After encounter', exact: true }).click();
  await expect(timeline).toHaveValue(String(episode.after));
  await expect(comparisonTime).toHaveValue(String(episode.after));
  await expect(canvas).toHaveAttribute('data-representative-position', frozen!);
  await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  await expect(fieldwork.locator('[data-efw-encounter-evidence] > div').nth(1)).toContainText(episode.samples[1].state);
  await expect(fieldwork.locator('[data-efw-encounter-evidence] > div').nth(1)).toContainText(`Decision distance: ${episode.samples[1].distance.toFixed(2)} scene units`);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await fieldwork.getByRole('button', { name: 'Encounter moment', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-interaction-connector', 'true');
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(episode.run);
});

test('disabled optional species produce no invented insect encounter, and absent actors hide paired scene overlays', async ({ page }) => {
  const { meadow, canvas, fieldwork, timeline } = await mount(page, false);
  await expect(page.locator('[data-efw-encounter]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Simple chain', exact: true }).click();
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  await expect(fieldwork).toBeVisible();
  await expect(fieldwork.locator('[data-efw-encounter="insects"]')).toHaveCount(0);
  const config = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.run.config);
  expect(config.enabled.bluetits).toBe(false);
  expect(config.enabled.caterpillars).toBe(false);

  const episode = await recordedEncounter(page, 'fox');
  await fieldwork.locator('[data-efw-encounter="fox"]').click();
  await fieldwork.getByLabel('Wildlife prediction', { exact: true }).selectOption('unsure');
  await fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true }).click();
  await expect(fieldwork).toContainText('You started with uncertainty.');
  await expect(canvas).toHaveAttribute('data-interaction-connector', 'true');
  await page.getByLabel('Disturbance', { exact: true }).selectOption('remove');
  await page.getByLabel('Affected group', { exact: true }).selectOption(episode.actor.id);
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  await timeline.fill('240');
  await expect(fieldwork.getByRole('button', { name: 'Reveal encounter', exact: true })).toHaveCount(0);
  await expect(canvas).toHaveAttribute('data-visible-glyphs-foxes', '0');
  await expect(canvas).toHaveAttribute('data-interaction-view', 'false');
  await expect(canvas).toHaveAttribute('data-interaction-connector', 'false');
  await expect(canvas).toHaveAttribute('data-interaction-trail-selected', 'false');
  await expect(canvas).toHaveAttribute('data-interaction-trail-cue', 'false');
});
