import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 120_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round24-2026-10-21');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE) throw new Error('Canonical lighting checks reject source substitutions');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_migration.js', toolId: 'migration',
  width: 1100, height: 900, layout: 'document', appStyles: true,
  probes: `var viewport=document.createElement('meta');viewport.name='viewport';viewport.content='width=device-width,initial-scale=1';document.head.appendChild(viewport);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';`
});
const failures = new WeakMap<Page, string[]>();
test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([harness.destroy(page), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Round24 scene cleanup exceeded 20 seconds')), 20_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
});

const stage = (page: Page) => page.locator('.migration-flight-stage');
const context = (page: Page) => page.locator('#migration-study-current-context');
const note = (page: Page) => page.getByRole('textbox', { name: 'Shape and motion observation', exact: true });
const cycle = (page: Page, index: number) => page.getByRole('button', { name: 'Cycle position ' + (index + 1) + ' of 8', exact: true });
const viewpoint = (page: Page, id: string) => page.locator('[data-study-viewpoint="' + id + '"]');
const checkedCue = (page: Page) => context(page).locator('[data-study-checked-comparison]');
async function frames(page: Page) {
  const before = await page.evaluate(() => (window as any).__glScene()?.renders || 0);
  await page.waitForFunction(before => ((window as any).__glScene()?.renders || 0) >= before + 2, before, { timeout: 20_000 });
}
async function activate(page: Page, locator: Locator, touch = false) {
  if (touch) await locator.tap();
  else { await locator.focus(); await page.keyboard.press('Enter'); }
  await frames(page);
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.migration)));
}
function work(data: any) {
  return Object.fromEntries(['flightStudyObservations', 'flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText'].map(key => [key, data[key]]));
}
function learnerSeed(id: string, region: string) {
  const key = id + ':' + region;
  return {
    flightStudyObservations: { drafts: { [key]: 'My prediction before observing ' + id + '.' },
      records: { [key]: { speciesId: id, region, note: 'Keep my earlier recorded evidence.', bird: 0,
        yaw: 90, pitch: 10, zoom: 1, wingStep: 4, paused: true, motionReduced: true } },
      comparison: { draft: 'Keep my own comparison claim.' } },
    flightInvestigation: { variable: 'wind', prediction: 'Keep my wind prediction.', trials: [], evidence: 'Keep my wind evidence.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge prediction.', notes: 'Keep my reasoning.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep my migration hypothesis.', explanation: 'Keep my explanation.', trials: [] },
    aiExplorerText: 'Keep my migration research.'
  };
}
async function setTheme(page: Page, dark: boolean) {
  await page.evaluate(dark => {
    const w = window as any; w.__ctx.isDark = dark; w.__ctx.theme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
    document.body.style.background = dark ? '#0f172a' : '#f8fafc'; w.__rerender();
  }, dark);
  await frames(page);
}
async function mount(page: Page, id: string, region: string, dark: boolean) {
  page.setDefaultTimeout(20_000); page.setDefaultNavigationTimeout(30_000);
  const errors: string[] = []; failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('crash', () => errors.push('Browser page crashed'));
  page.on('console', message => { if (message.type() === 'error' && /WebGL|shader|context lost|THREE\.WebGLRenderer/i.test(message.text())) errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'chase', flightPaused: true,
    flightSpecies: id, flightShowWingtipPath: true, flightShowAnatomy: id !== 'monarch',
    flightStudyRegion: region, flightStudyObservationOpen: true, flightWingStep: 13,
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...learnerSeed(id, region) } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  await page.evaluate(() => {
    const w = window as any, record = w.__glCanvas()?.rec, original = record.scene.onBeforeRender;
    record.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      record.camera = camera; record.renderer = renderer;
      if (original) original.call(this, renderer, scene, camera, ...rest);
    };
  });
  await setTheme(page, dark);
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
  expect((await harness.glContexts(page)).some(item => item.createdBy === 'page' && item.type === 'webgl2' && !item.lost && item.draws > 0)).toBe(true);
}

// Read the actual three pre-existing lights and their world-space targets.
// The expected camera-relative offsets below are fixed test constants, rather
// than trusting any controller metadata or advertised lighting state.
async function lightingState(page: Page) {
  return page.evaluate(() => {
    const w = window as any, rec = w.__glCanvas()?.rec, scene = rec?.scene, camera = rec?.camera, THREE = w.THREE;
    if (!scene || !camera || !rec.canvas) throw new Error('Rendered lighting scene unavailable');
    scene.updateMatrixWorld(true);
    const hemi = scene.getObjectByName('migration-flight-hemisphere');
    const key = scene.getObjectByName('migration-flight-key-light');
    const rim = scene.getObjectByName('migration-flight-rim-light');
    const flock = scene.getObjectByName('migration-flock'), data = w.__toolData.migration;
    if (!hemi?.isHemisphereLight || !key?.isDirectionalLight || !rim?.isDirectionalLight || !flock) throw new Error('Expected three original named lights');
    const bird = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))];
    const target = bird.getWorldPosition(new THREE.Vector3());
    const axes = [0, 1, 2].map(column => new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, column).normalize());
    const identityMap = w.__lighting24Ids || (w.__lighting24Ids = new WeakMap());
    const identity = (object: object) => { if (!identityMap.has(object)) identityMap.set(object, w.__lighting24Next = (w.__lighting24Next || 0) + 1); return identityMap.get(object); };
    const countLights: string[] = [], sceneResources = new Set<string>(), birdResources = new Set<string>();
    const birdColors = new Map<string, number>(); const geometryBuffers = new Map<string, number[]>();
    scene.traverse((node: any) => {
      if (node.isLight) countLights.push(node.uuid);
      if (node.geometry) sceneResources.add(node.geometry.uuid);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (material) { sceneResources.add(material.uuid); if (material.map) sceneResources.add(material.map.uuid); }
      }
    });
    bird.traverse((node: any) => {
      if (node.geometry) {
        birdResources.add(node.geometry.uuid);
        const attribute = node.geometry.attributes.position;
        if (attribute) geometryBuffers.set(node.geometry.uuid, [identity(attribute), identity(attribute.array)]);
      }
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) {
        birdResources.add(material.uuid); if (material.color) birdColors.set(material.uuid, material.color.getHex());
      }
    });
    const directional = (light: any) => {
      light.updateWorldMatrix(true, false); light.target.updateWorldMatrix(true, false);
      const position = light.getWorldPosition(new THREE.Vector3()), point = light.target.getWorldPosition(new THREE.Vector3());
      const delta = position.clone().sub(target), direction = position.clone().sub(point).normalize();
      return { uuid: light.uuid, targetUuid: light.target.uuid, color: light.color.getHex(), intensity: light.intensity,
        position: light.position.toArray(), worldPosition: position.toArray(), target: light.target.position.toArray(), worldTarget: point.toArray(),
        cameraOffset: axes.map(axis => delta.dot(axis)), cameraDirection: axes.map(axis => direction.dot(axis)),
        shadow: { object: identity(light.shadow), camera: identity(light.shadow.camera), mapSize: light.shadow.mapSize.toArray(), castShadow: light.castShadow,
          map: light.shadow.map?.texture?.uuid || null } };
    };
    const rect = rec.canvas.getBoundingClientRect();
    const joints = [...(bird.userData.wings || []), ...(bird.userData.wrists || []), ...(bird.userData.primaries || [])].filter(Boolean);
    return {
      lights: { hemi: { uuid: hemi.uuid, color: hemi.color.getHex(), ground: hemi.groundColor.getHex(), intensity: hemi.intensity, position: hemi.position.toArray() },
        key: directional(key), rim: directional(rim), count: countLights.length, identities: countLights.sort() },
      target: target.toArray(), axes: axes.map(axis => axis.toArray()),
      pool: { scene: [...sceneResources].sort(), bird: [...birdResources].sort(), buffers: [...geometryBuffers].sort(), materialColors: [...birdColors].sort() },
      pose: { species: data.flightSpecies, source: bird.uuid, phase: bird.userData.lastRenderedWingPhase,
        body: bird.matrixWorld.elements.slice(), flock: flock.matrixWorld.elements.slice(), allBodies: flock.children.map((node: any) => node.matrixWorld.elements.slice()),
        joints: joints.map((node: any) => node.quaternion.toArray()), serial: Number(data.flightWingStep) || 0, paused: data.flightPaused === true },
      view: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), matrix: camera.matrixWorld.elements.slice(), projection: camera.projectionMatrix.elements.slice() },
      canvas: { width: rect.width, height: rect.height }, errors: w.__events.errors
    };
  });
}
const themeValues = (dark: boolean) => dark
  ? { hemi: [0x415a86, 0x10161f, .26], key: [0xcddcff, .42], rim: [0x6f8ec6, .20] }
  : { hemi: [0xcfe6f5, 0x2f4a2c, .72], key: [0xfff2d0, 1.05], rim: [0x9fd0ec, .42] };
function expectCorridor(state: any, dark: boolean) {
  const theme = themeValues(dark);
  expect([state.lights.hemi.color, state.lights.hemi.ground, state.lights.hemi.intensity]).toEqual(theme.hemi);
  expect([state.lights.key.color, state.lights.key.intensity]).toEqual(theme.key);
  expect([state.lights.rim.color, state.lights.rim.intensity]).toEqual(theme.rim);
  expect(state.lights.key.position).toEqual([-28, 34, 18]); expect(state.lights.rim.position).toEqual([22, 12, -40]);
  expect(state.lights.key.target).toEqual([0, 0, 0]); expect(state.lights.rim.target).toEqual([0, 0, 0]);
  expect(state.lights.count).toBe(3); expect(state.errors).toEqual([]);
}
function expectStudy(state: any) {
  expect([state.lights.hemi.color, state.lights.hemi.ground, state.lights.hemi.intensity]).toEqual([0xe4ecf0, 0x46515c, .62]);
  expect([state.lights.key.color, state.lights.key.intensity]).toEqual([0xfff5e8, .82]);
  expect([state.lights.rim.color, state.lights.rim.intensity]).toEqual([0xc6d8e5, .34]);
  for (const [light, offset] of [[state.lights.key, [-4, 5, 7]], [state.lights.rim, [5, 2, -4]]] as const) {
    for (let index = 0; index < 3; index++) { expect(light.cameraOffset[index]).toBeCloseTo(offset[index], 6); expect(light.worldTarget[index]).toBeCloseTo(state.target[index], 6); }
    const length = Math.hypot(...offset);
    for (let index = 0; index < 3; index++) expect(light.cameraDirection[index]).toBeCloseTo(offset[index] / length, 6);
    expect([...light.position, ...light.worldPosition, ...light.worldTarget, ...light.cameraDirection].every(Number.isFinite)).toBe(true);
  }
  expect(state.lights.count).toBe(3); expect(state.pose.serial).toBe(13); expect(state.pose.paused).toBe(true); expect(state.errors).toEqual([]);
}
function expectFixedPool(state: any, reference: any) {
  expect(state.pool).toEqual(reference.pool); expect(state.lights.identities).toEqual(reference.lights.identities);
  for (const id of ['key', 'rim']) {
    expect(state.lights[id].uuid).toBe(reference.lights[id].uuid); expect(state.lights[id].targetUuid).toBe(reference.lights[id].targetUuid);
    expect(state.lights[id].shadow).toEqual(reference.lights[id].shadow);
  }
  expect(state.lights.hemi.uuid).toBe(reference.lights.hemi.uuid);
}
async function capture(page: Page, name: string) { await stage(page).screenshot({ path: join(report, name + '.png') }); }
async function toggleStudy(page: Page, touch: boolean) {
  await activate(page, stage(page).getByRole('button', { name: 'Study view', exact: true }), touch);
}
async function check(page: Page, kind: string, touch: boolean) {
  const before = await saved(page);
  await activate(page, page.getByRole('button', { name: 'Check what changed', exact: true }), touch);
  await expect(checkedCue(page)).toHaveAttribute('data-study-checked-comparison', kind);
  await expect(context(page).locator('[data-study-checked-prompt]')).toBeVisible();
  expect(await saved(page)).toEqual(before);
}
async function checkedLearning(page: Page) {
  const before = await saved(page), originalRecord = before.flightStudyObservations.records['canada_goose:inner-wing'];
  const field = await note(page).elementHandle(); await note(page).focus();
  await note(page).evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(4, 17, 'backward'));
  const selection = await note(page).evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd, element.selectionDirection]);
  const beforeText = await note(page).inputValue();
  await expect(checkedCue(page)).toHaveCount(0);
  await activate(page, cycle(page, 2));
  await activate(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }));
  await activate(page, page.locator('[data-scene-study-action="opposite"]'));
  await check(page, 'wing-only', false);
  await expect(checkedCue(page)).toHaveText('Checked comparison: Selected view settings match the mark; wing-cycle position differs.');
  await expect(context(page).locator('[data-study-checked-prompt]')).toHaveText('What visible detail supports your comparison while the selected view settings stayed the same?');
  await expect(note(page)).toHaveValue(beforeText);
  expect(await field!.evaluate(element => element === document.querySelector('#migration-study-observation-note'))).toBe(true);
  expect(await note(page).evaluate((element: HTMLTextAreaElement) => [element.selectionStart, element.selectionEnd, element.selectionDirection])).toEqual(selection);
  expect(work(await saved(page))).toEqual(work(before));
  await context(page).screenshot({ path: join(report, 'desktop-goose-checked-wing-only-notes.png') });
  await activate(page, viewpoint(page, 'front'));
  await expect(checkedCue(page)).toHaveCount(0);
  await expect(note(page)).toHaveValue(beforeText);
  await check(page, 'both', false);
  await expect(checkedCue(page)).toHaveText('Checked comparison: Selected view settings and wing-cycle position both differ from the mark.');
  await expect(context(page).locator('[data-study-checked-prompt]')).toHaveText('Restore either the wings or the marked view settings, check again, then explain your evidence.');
  expect(work(await saved(page))).toEqual(work(before));
  expect((await saved(page)).flightStudyObservations.records['canada_goose:inner-wing']).toEqual(originalRecord);
  await context(page).screenshot({ path: join(report, 'desktop-goose-checked-both-notes.png') });
  return { before, beforeText, selection, after: await saved(page), cue: await checkedCue(page).textContent() };
}

async function lightingFlow(page: Page, id: string, region: string, dark: boolean, touch: boolean) {
  const stem = touch ? 'mobile-' + (dark ? 'dark-monarch' : 'light-peregrine') : 'desktop-goose';
  await mount(page, id, region, dark);
  const corridor = await lightingState(page); expectCorridor(corridor, dark);
  const initialData = await saved(page);
  await toggleStudy(page, touch);
  await expect(stage(page)).toHaveAttribute('data-study-view', 'true');
  const initialStudy = await lightingState(page); expectStudy(initialStudy); expectFixedPool(initialStudy, corridor);
  expect(initialStudy.pose).toEqual(corridor.pose); expect(work(await saved(page))).toEqual(work(initialData));
  let learning: any = null;
  if (!touch) {
    await capture(page, stem + '-neutral-initial');
    learning = await checkedLearning(page);
  } else {
    await activate(page, cycle(page, 2), true);
  }
  const fixedPose = (await lightingState(page)).pose;
  const views: any[] = [];
  for (const id of ['front', 'profile', 'above']) {
    await activate(page, viewpoint(page, id), touch);
    const state = await lightingState(page); expectStudy(state); expectFixedPool(state, corridor); expect(state.pose).toEqual(fixedPose);
    if (!touch || (dark ? id !== 'front' : id !== 'profile')) await capture(page, stem + '-neutral-' + id);
    views.push({ id, state });
  }
  const beforeTheme = await lightingState(page), beforeThemeData = await saved(page);
  await setTheme(page, !dark);
  const otherThemeStudy = await lightingState(page); expectStudy(otherThemeStudy); expectFixedPool(otherThemeStudy, corridor);
  expect(otherThemeStudy.lights).toEqual(beforeTheme.lights); expect(otherThemeStudy.pose).toEqual(beforeTheme.pose); expect(otherThemeStudy.view).toEqual(beforeTheme.view);
  expect(await saved(page)).toEqual(beforeThemeData);
  await setTheme(page, dark);
  const restoredThemeStudy = await lightingState(page); expectStudy(restoredThemeStudy); expectFixedPool(restoredThemeStudy, corridor);
  expect(restoredThemeStudy.lights).toEqual(beforeTheme.lights); expect(await saved(page)).toEqual(beforeThemeData);
  let matchedPhone: any = null;
  if (!touch) {
    await activate(page, page.getByRole('button', { name: 'Reset study view', exact: true }));
    await activate(page, cycle(page, 2));
    const followLeft = page.getByRole('button', { name: 'Follow individual’s left wingtip', exact: true });
    if (await followLeft.getAttribute('aria-pressed') !== 'true') await activate(page, followLeft);
    await activate(page, page.locator('[data-study-region="primaries"]'));
    const beforeResize = await saved(page); await setTheme(page, true); await page.setViewportSize({ width: 390, height: 844 }); await frames(page);
    matchedPhone = await lightingState(page); expectStudy(matchedPhone); expectFixedPool(matchedPhone, corridor);
    expect(matchedPhone.canvas).toEqual({ width: 388, height: 390 });
    expect((await saved(page)).flightStudyYaw).toBe(35); expect((await saved(page)).flightStudyPitch).toBe(15); expect((await saved(page)).flightStudyZoom).toBe(1);
    expect(await saved(page)).toEqual(beforeResize);
    await capture(page, 'mobile-dark-goose-matched-baseline');
    await page.setViewportSize({ width: 1440, height: 1000 }); await setTheme(page, dark); await frames(page);
  }
  const beforeExit = await saved(page), poseBeforeExit = (await lightingState(page)).pose;
  await toggleStudy(page, touch);
  const restoredCorridor = await lightingState(page); expectCorridor(restoredCorridor, dark); expectFixedPool(restoredCorridor, corridor);
  expect(restoredCorridor.lights).toEqual(corridor.lights); expect(restoredCorridor.pose).toEqual(poseBeforeExit);
  expect(work(await saved(page))).toEqual(work(beforeExit));
  await setTheme(page, !dark);
  const changedCorridor = await lightingState(page); expectCorridor(changedCorridor, !dark); expectFixedPool(changedCorridor, corridor);
  await toggleStudy(page, touch); const reenteredOther = await lightingState(page); expectStudy(reenteredOther); expectFixedPool(reenteredOther, corridor);
  await setTheme(page, dark); await toggleStudy(page, touch);
  const latestRestored = await lightingState(page); expectCorridor(latestRestored, dark); expectFixedPool(latestRestored, corridor);
  expect(latestRestored.lights).toEqual(corridor.lights);
  await toggleStudy(page, touch); const finalStudy = await lightingState(page); expectStudy(finalStudy); expectFixedPool(finalStudy, corridor);
  expect(finalStudy.pose).toEqual(poseBeforeExit); expect(work(await saved(page))).toEqual(work(beforeExit));
  if (id === 'monarch') {
    await expect(context(page).locator('[data-study-context-region]')).toHaveAttribute('data-study-context-region', 'whole-wing');
    await expect(page.locator('[data-study-anatomy-focus]')).toHaveCount(0);
    await expect(note(page)).toHaveValue('My prediction before observing monarch.');
  }
  await page.addScriptTag({ content: axeSource });
  const accessibility = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, errors: (window as any).__events.errors,
      violations: result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })) };
  });
  expect(accessibility.scrollWidth).toBe(accessibility.width); expect(accessibility.violations).toEqual([]); expect(accessibility.errors).toEqual([]); expect(failures.get(page)).toEqual([]);
  await writeFile(join(report, stem + '-lighting.json'), JSON.stringify({ initialData, corridor, initialStudy, learning, views, beforeTheme,
    otherThemeStudy, restoredThemeStudy, matchedPhone, beforeExit, restoredCorridor, changedCorridor, reenteredOther, latestRestored, finalStudy, accessibility }, null, 2));
}

test('Keyboard learners inspect consistent Study lighting and valid checked comparison cues without changing their evidence', async ({ page }) => {
  await lightingFlow(page, 'canada_goose', 'inner-wing', false, false);
});
test.describe('Migration Study lighting phone light peregrine round24', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch learners inspect the real peregrine surfaces from settled camera views and restore the corridor theme', async ({ page }) => {
    await lightingFlow(page, 'peregrine', 'primaries', false, true);
  });
});
test.describe('Migration Study lighting phone dark Monarch round24', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch learners inspect whole-insect wing detail with the same Study lighting and preserve their own note', async ({ page }) => {
    await lightingFlow(page, 'monarch', 'whole-wing', true, true);
  });
});
