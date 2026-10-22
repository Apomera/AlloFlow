import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true,
  probes: `THREE.WebGLRenderer=new Proxy(THREE.WebGLRenderer,{construct:function(target,args,newTarget){var renderer=Reflect.construct(target,args,newTarget),render=renderer.render;renderer.render=function(scene,camera){var result=render.apply(this,arguments);if(window.__captureCrossing)window.__captureCrossing(scene,camera);return result;};return renderer;}});`,
});
const reportDir = process.env.ECOLOGY_REPORT_DIR || 'reports/ecosystem-jaws-interactions-lab';
test.describe.configure({ timeout: 420_000, retries: 0 });
test.use({ trace: 'off', video: 'off' });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  const errors = await page.evaluate(() => {
    const w = window as any; w.__captureCrossing = null;
    if (w.__crossOriginalRaf) { window.requestAnimationFrame = w.__crossOriginalRaf; w.__crossOriginalRaf = null; }
    return w.__events?.errors || [];
  });
  await harness.destroy(page); expect(errors).toEqual([]);
});

async function seek(page: Page, step: number) {
  const meadow = page.locator('[data-efw-meadow]');
  await meadow.getByLabel('Meadow timeline', { exact: true }).fill(String(step));
  await expect(meadow.locator('canvas')).toHaveAttribute('data-step', String(step));
}

async function drawnPair(page: Page, step: number) {
  return page.evaluate(step => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, scene = w.__glCanvas('[data-efw-meadow]').rec.scene, frame = w.__crossFrames[step];
    const animals = scene.children.filter((g: any) => g.userData.headSurface?.name === 'eco-foxes-head-surface'), receiver = animals[6], source = animals[1], pose = frame.foxes[6];
    const pair = api.interaction(frame, 'foxes', 6), group = scene.getObjectByName('eco-interaction-cues'), line = scene.getObjectByName('eco-interaction-connector');
    function shown(part: any) { for (let node = part; node; node = node.parent) if (!node.visible) return false; return true; }
    function positions(part: any) { const p = part.geometry.getAttribute('position'), count = part.geometry.drawRange.count; return Array.from({ length: Math.min(Number.isFinite(count) ? count : p.count, p.count) }, (_, k) => [p.getX(k), p.getY(k), p.getZ(k)]); }
    function animal(root: any, p: any) { return { active: root.visible, scale: root.scale.toArray(), x: root.position.x, z: root.position.z, yaw: root.rotation.y, head: root.userData.head.rotation.toArray(), body: root.userData.body.matrix.toArray(), applied: root.userData.mammalArticulation,
      ears: root.userData.ears.map((ear: any) => ({ side: ear.userData.side, rotation: ear.rotation.toArray() })), feet: root.userData.legs.map((leg: any, k: number) => { const sole = leg.userData.rig.paw.children.find((node: any) => node.isMesh); return { x: sole.matrixWorld.elements[12], z: sole.matrixWorld.elements[14], expected: p.footPlants[k] }; }) }; }
    const selectedTrack = scene.getObjectByName('eco-interaction-trail-selected'), cueTrack = scene.getObjectByName('eco-interaction-trail-cue');
    return { step, pose, cuePose: frame.foxes[1], cue: pose.crossingCue, expectedArticulation: api.mammalArticulation('foxes', pose, false), receiver: animal(receiver, pose), source: animal(source, frame.foxes[1]), expectedPair: !!pair, groupVisible: group.visible,
      line: { visible: shown(line), points: positions(line) }, selectedTrack: { visible: shown(selectedTrack), points: positions(selectedTrack) }, cueTrack: { visible: shown(cueTrack), points: positions(cueTrack) }, visibleFoxes: animals.filter((g: any) => g.visible).length };
  }, step);
}

function checkPair(actual: any) {
  expect(actual.receiver.active).toBe(true); expect(actual.source.active).toBe(actual.expectedPair);
  for (const [drawn, pose] of [[actual.receiver, actual.pose], [actual.source, actual.cuePose]]) {
    for (const key of ['x', 'z', 'yaw']) expect(drawn[key]).toBeCloseTo(pose[key], 11);
    // A paused isolated cue animal has zero presence after its interaction ends.
    // Its zero-scale world paw centers no longer describe rendered support sites.
    if (drawn.active) for (const foot of drawn.feet) { expect(foot.x).toBeCloseTo(foot.expected.x, 10); expect(foot.z).toBeCloseTo(foot.expected.z, 10); }
    else expect(drawn.scale).toEqual([0, 0, 0]);
  }
  expect(actual.receiver.applied).toEqual(actual.expectedArticulation);
  expect(actual.receiver.head[1]).toBeCloseTo(actual.pose.headTurn, 12);
  for (const ear of actual.receiver.ears) expect(ear.rotation[1]).toBeCloseTo(ear.side < 0 ? actual.expectedArticulation.earLeft : actual.expectedArticulation.earRight, 12);
  expect(actual.groupVisible).toBe(actual.expectedPair); expect(actual.line.visible).toBe(actual.expectedPair);
  if (actual.expectedPair) {
    expect(actual.visibleFoxes).toBe(2); expect(actual.line.points.length).toBeGreaterThan(8);
    const first = actual.line.points[0], last = actual.line.points.at(-1);
    expect(first[0]).toBeCloseTo(actual.source.x, 5); expect(first[2]).toBeCloseTo(actual.source.z, 5);
    expect(last[0]).toBeCloseTo(actual.receiver.x, 5); expect(last[2]).toBeCloseTo(actual.receiver.z, 5);
    for (const [track, animal] of [[actual.selectedTrack, actual.receiver], [actual.cueTrack, actual.source]]) {
      expect(track.points.length).toBeGreaterThan(0); expect(track.points[0][0]).toBeCloseTo(animal.x, 5); expect(track.points[0][2]).toBeCloseTo(animal.z, 5);
    }
  } else { expect(actual.visibleFoxes).toBe(1); expect(actual.selectedTrack.visible).toBe(false); expect(actual.cueTrack.visible).toBe(false); }
}

async function drafts(page: Page) {
  return page.evaluate(() => { const s = (window as any).__toolData.ecosystem.foodWeb; return JSON.stringify({ motionStudy: s.motionStudy, ethogram: s.ethogram, fieldwork: s.fieldwork, controlStudy: s.controlStudy, prediction: s.prediction, reflection: s.reflection, notebook: s.notebook, run: s.run }); });
}

test('real fox clearance steps show a live peer, preserve learner drafts on inspection, and remove a canceled crossing during actual fractional playback', async ({ page }) => {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { document.body.className = 'theme-default'; document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white'; });
  await page.getByRole('button', { name: 'Fox crossings', exact: true }).click();
  await page.getByLabel('Your prediction (optional)', { exact: true }).fill('Navigation spacing and a turning head do not supply food or change the population equations.');
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const meadow = page.locator('[data-efw-meadow]'), canvas = meadow.locator('canvas'), stage = meadow.locator('.efw-meadow-stage');
  if (!(await meadow.isVisible())) await page.getByRole('button', { name: 'Show 3D meadow', exact: true }).click();
  const initialized = await page.waitForFunction(() => { const r = (window as any).__glCanvas?.('[data-efw-meadow]'); if (r?.rec?.scene && r.rec.draws > 0 && document.querySelector('[data-efw-meadow] canvas')?.hasAttribute('data-representative-index')) return 'ready'; return document.querySelector('[data-efw-meadow]')?.textContent?.includes('3D is unavailable on this device.') ? 'unavailable' : false; }, undefined, { timeout: 60_000 });
  expect(await initialized.jsonValue(), 'this workflow uses the actual page renderer').toBe('ready');
  await meadow.getByLabel('Meadow scene data', { exact: true }).selectOption('baseline');
  const fixture = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = w.__toolData.ecosystem.foodWeb.run.config, pair = api.compare(config);
    w.__crossFrames = api.behaviorTimeline(config, pair.baseline);
    return { config, episode: api.foxCrossingEpisode(w.__crossFrames), firstFoxBiomass: pair.baseline[0].values.foxes, lastFoxBiomass: pair.baseline.at(-1).values.foxes, run: JSON.stringify(w.__toolData.ecosystem.foodWeb.run) };
  });
  expect(fixture.episode).toEqual({ step: 63, index: 6, sourceIndex: 1, start: 61 });
  for (const id of ['rabbits', 'voles', 'owls', 'caterpillars', 'bluetits']) expect(fixture.config.enabled[id]).toBe(false);
  expect(fixture.config.enabled.foxes).toBe(true); expect(fixture.config.initial.foxes).toBe(20); expect(fixture.lastFoxBiomass).toBeLessThan(fixture.firstFoxBiomass);

  // Build a legitimate unfinished rep-0 movement sheet through its real controls.
  const movement = meadow.locator('[data-efw-movement-study]');
  await movement.getByRole('button', { name: 'Study a fox movement', exact: true }).click();
  await movement.getByLabel('First movement snapshot', { exact: true }).selectOption('0');
  const movementDraft = await drafts(page), inspect = meadow.getByRole('button', { name: 'Inspect a fox crossing', exact: true });
  const actionOverlay = meadow.locator('[data-efw-action-overlay]');
  await inspect.press('Enter');
  await expect(canvas).toHaveAttribute('data-step', '63'); await expect(canvas).toHaveAttribute('data-representative-index', '6');
  await expect(canvas).toHaveAttribute('data-selected-species', 'foxes'); await expect(canvas).toHaveAttribute('data-behavior', 'Searching');
  await expect(actionOverlay).toBeVisible(); await expect(actionOverlay).toHaveText(/^Searching \u00b7 representative 7 of \d+$/);
  expect(await drafts(page)).toBe(movementDraft);
  // Resume the unfinished study through its checkpoint. The free animal selector
  // intentionally starts a new inspection and clears working activities.
  await movement.locator('[data-efw-motion-sample="1"]').click();
  await expect(canvas).toHaveAttribute('data-representative-index', '0');
  await expect(actionOverlay).toHaveText(/^(Movement snapshot|Snapshot [A-C]) \u00b7 representative 1 of \d+$/);
  expect(await drafts(page)).toBe(movementDraft);
  await inspect.click(); await expect(canvas).toHaveAttribute('data-representative-index', '6'); await expect(canvas).toHaveAttribute('data-behavior', 'Searching');
  await expect(actionOverlay).toHaveText(/^Searching \u00b7 representative 7 of \d+$/);

  // A second unfinished activity also remains intact when the shortcut inspects.
  const ethogram = meadow.locator('[data-efw-ethogram]');
  if ((await ethogram.getAttribute('open')) === null) await ethogram.locator(':scope > summary').click();
  await ethogram.getByLabel('Ethogram start time', { exact: true }).fill('0');
  await ethogram.getByLabel('Ethogram sampling interval', { exact: true }).fill('1');
  await ethogram.getByRole('button', { name: 'Set sampling plan', exact: true }).click();
  await ethogram.getByLabel('Ethogram sample 1 code', { exact: true }).selectOption({ index: 1 });
  const combinedDraft = await drafts(page); await inspect.click();
  await expect(canvas).toHaveAttribute('data-step', '63'); await expect(canvas).toHaveAttribute('data-representative-index', '6');
  expect(await drafts(page)).toBe(combinedDraft);

  const saved63 = await drawnPair(page, 63); checkPair(saved63);
  expect(saved63.cue).toMatchObject({ stage: 'watch', stepKind: 'held', index: 1, receiverIndex: 6, sourceStep: 63 });
  expect(saved63.pose.attention.kind).toBe('crossing'); expect(saved63.receiver.head[1]).toBeGreaterThan(.2);
  await stage.screenshot({ path: reportDir + '/fox-crossing-held-desktop.jpg', type: 'jpeg', quality: 90 });
  for (const step of [61, 62, 68, 69, 70, 71, 76, 77]) {
    await seek(page, step); const actual = await drawnPair(page, step); checkPair(actual);
    if (step === 61) { expect(actual.cue.stepKind).toBe('shortened'); expect(actual.cue.allowedDistance).toBeCloseTo(.002698124578688356, 12); }
    if (step >= 62 && step <= 68) { expect(actual.cue.stepKind).toBe('held'); expect(actual.cue.allowedDistance).toBe(0); expect(actual.pose.moving).toBe(0); expect(actual.cuePose.moving).toBe(0); }
    if (step === 69) { expect(actual.cue).toMatchObject({ stage: 'release', stepKind: 'unmarked' }); expect(actual.pose.moving).toBeCloseTo(.32, 12); expect(actual.cuePose.moving).toBe(0); expect(actual.pose.peerAvoidance).toBeNull(); }
    if (step === 71) {
      const expectedTravel = Math.hypot(actual.cuePose.x - saved63.cuePose.x, actual.cuePose.z - saved63.cuePose.z);
      expect(expectedTravel).toBeGreaterThan(1e-6);
      expect(Math.hypot(actual.source.x - saved63.source.x, actual.source.z - saved63.source.z)).toBeCloseTo(expectedTravel, 11);
    }
    if (step === 77) expect(actual.cue).toBeNull();
  }
  await seek(page, 63); expect(await drawnPair(page, 63)).toEqual(saved63);
  await seek(page, 69); await page.setViewportSize({ width: 390, height: 844 });
  checkPair(await drawnPair(page, 69)); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await stage.screenshot({ path: reportDir + '/fox-crossing-release-mobile.jpg', type: 'jpeg', quality: 90 });
  await page.setViewportSize({ width: 1140, height: 1050 }); await seek(page, 70);
  await meadow.getByLabel('Meadow playback speed', { exact: true }).selectOption('0.5');

  await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, frames = w.__crossFrames;
    w.__crossPlayback = []; w.__crossLast = null;
    // Slow only the browser animation clock to observe one short model interval
    // in several real rendered frames. No pose, route or recorded value is set.
    const anchor = performance.now(), original = window.requestAnimationFrame;
    w.__crossOriginalRaf = original;
    window.requestAnimationFrame = callback => original.call(window, now => callback(anchor + (now - anchor) * .06));
    function shown(part: any) { for (let node = part; node; node = node.parent) if (!node.visible) return false; return true; }
    w.__captureCrossing = (scene: any) => {
      const roots = scene.children.filter((g: any) => g.userData.headSurface?.name === 'eco-foxes-head-surface'), actor = roots[6], source = roots[1]; if (!actor || !source) return;
      const line = scene.getObjectByName('eco-interaction-connector'), group = scene.getObjectByName('eco-interaction-cues'), selectedTrack = scene.getObjectByName('eco-interaction-trail-selected'), cueTrack = scene.getObjectByName('eco-interaction-trail-cue');
      w.__crossLast = { x: actor.position.x, z: actor.position.z, group: group.visible };
      for (let step = 70; step <= 77; step++) {
        const a = frames[step].foxes[6], b = frames[step + 1].foxes[6], axis = Math.abs(b.x - a.x) >= Math.abs(b.z - a.z) ? 'x' : 'z', value = actor.position[axis];
        if (Math.abs(b[axis] - a[axis]) < 1e-8 || value < Math.min(a[axis], b[axis]) || value > Math.max(a[axis], b[axis])) continue;
        const blend = (t: number, index: number) => api.blendPose(frames[step].foxes[index], frames[step + 1].foxes[index], t, 'foxes', frames[step - 1].foxes[index], frames[step + 2].foxes[index]);
        let low = 0, high = 1; for (let k = 0; k < 45; k++) { const t = (low + high) / 2; if ((blend(t, 6)[axis] < value) === (b[axis] > a[axis])) low = t; else high = t; }
        const alpha = (low + high) / 2; if (alpha <= .02 || alpha >= .98) continue;
        const pose = blend(alpha, 6), other = blend(alpha, 1);
        if (Math.hypot(pose.x - actor.position.x, pose.z - actor.position.z) > 1e-8 || Math.abs(pose.yaw - actor.rotation.y) > 1e-8) continue;
        const frame = { ...frames[step], foxes: frames[step].foxes.map((p: any, index: number) => index === 6 ? pose : index === 1 ? other : p) }, pair = api.interaction(frame, 'foxes', 6);
        function ends(part: any) { const p = part.geometry.getAttribute('position'); return [[p.getX(0), p.getY(0), p.getZ(0)], [p.getX(p.count - 1), p.getY(p.count - 1), p.getZ(p.count - 1)]]; }
        const lineEnds = ends(line), first = (part: any) => { const p = part.geometry.getAttribute('position'); return [p.getX(0), p.getY(0), p.getZ(0)]; };
        w.__crossPlayback.push({ step, alpha, expectedPair: !!pair, groupVisible: group.visible, lineVisible: shown(line), selectedTrackVisible: shown(selectedTrack), cueTrackVisible: shown(cueTrack), selectedDrawCount: selectedTrack.geometry.drawRange.count, cueDrawCount: cueTrack.geometry.drawRange.count, actor: { x: actor.position.x, z: actor.position.z, yaw: actor.rotation.y }, source: { x: source.position.x, z: source.position.z }, expectedActor: { x: pose.x, z: pose.z, yaw: pose.yaw }, expectedSource: { x: other.x, z: other.z }, headYaw: actor.userData.head.rotation.y, expectedHeadYaw: api.mammalArticulation('foxes', pose, false).headYaw, lineEnds, selectedFirst: first(selectedTrack), cueFirst: first(cueTrack), frozenCueDistance: pose.crossingCue ? Math.hypot(other.x - pose.crossingCue.x, other.z - pose.crossingCue.z) : null });
        break;
      }
    };
  });
  await meadow.getByRole('button', { name: 'Play meadow timeline', exact: true }).click();
  await page.waitForFunction(() => { const samples = (window as any).__crossPlayback || []; return samples.filter((p: any) => p.expectedPair && p.frozenCueDistance > 1e-6).length >= 2 && samples.some((p: any) => p.step === 76 && !p.expectedPair); }, undefined, { timeout: 60_000 }).catch(async error => {
    const diagnostics = await page.evaluate(() => { const w = window as any; w.__captureCrossing = null; return { last: w.__crossLast, samples: w.__crossPlayback, errors: w.__events?.errors }; });
    await test.info().attach('actual-crossing-playback-diagnostics', { body: JSON.stringify(diagnostics), contentType: 'application/json' }); throw error;
  });
  await meadow.getByRole('button', { name: 'Pause meadow timeline', exact: true }).click();
  const playback = await page.evaluate(() => { const w = window as any; w.__captureCrossing = null; window.requestAnimationFrame = w.__crossOriginalRaf; w.__crossOriginalRaf = null; return w.__crossPlayback; });
  for (const p of playback) {
    for (const key of ['x', 'z', 'yaw']) expect(p.actor[key]).toBeCloseTo(p.expectedActor[key], 10);
    for (const key of ['x', 'z']) expect(p.source[key]).toBeCloseTo(p.expectedSource[key], 10);
    expect(p.headYaw).toBeCloseTo(p.expectedHeadYaw, 11); expect(p.groupVisible).toBe(p.expectedPair); expect(p.lineVisible).toBe(p.expectedPair);
    if (p.expectedPair) { expect(p.lineEnds[0][0]).toBeCloseTo(p.source.x, 5); expect(p.lineEnds[0][2]).toBeCloseTo(p.source.z, 5); expect(p.lineEnds[1][0]).toBeCloseTo(p.actor.x, 5); expect(p.lineEnds[1][2]).toBeCloseTo(p.actor.z, 5); expect(p.selectedFirst[0]).toBeCloseTo(p.actor.x, 5); expect(p.cueFirst[0]).toBeCloseTo(p.source.x, 5); }
    else { expect(p.selectedTrackVisible).toBe(false); expect(p.cueTrackVisible).toBe(false); expect(p.selectedDrawCount).toBe(0); expect(p.cueDrawCount).toBe(0); }
  }
  await test.info().attach('actual-fractional-crossing-playback', { body: JSON.stringify(playback), contentType: 'application/json' });
  await seek(page, 63); expect(await drawnPair(page, 63)).toEqual(saved63); expect(await drafts(page)).toBe(combinedDraft);
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.run))).toBe(fixture.run);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(canvas).toHaveAttribute('data-behavior', 'Starting pose');
  await expect(canvas).toHaveAttribute('data-interaction-view', 'false'); await expect(canvas).toHaveAttribute('data-crossing-cue', '');
});
