import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 120_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round22-2026-10-21');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE) throw new Error('Canonical migration checks reject source substitutions');
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
      timer = setTimeout(() => reject(new Error('Round22 scene cleanup exceeded 20 seconds')), 20_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
});

const stage = (page: Page) => page.locator('.migration-flight-stage');
const inspect = (page: Page) => page.locator('[data-study-action="inspect-current-view"]');
const note = (page: Page) => page.getByRole('textbox', { name: 'My observation', exact: true });
const cycle = (page: Page, index: number) => page.getByRole('button', { name: 'Cycle position ' + (index + 1) + ' of 8', exact: true });
const opposite = (page: Page) => page.locator('[data-study-cycle-action="opposite"]');
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
function learnerSeed() {
  return {
    flightStudyObservations: { drafts: {
      'canada_goose:inner-wing': 'Keep my inner-wing draft.',
      'canada_goose:primaries': 'Keep my primary-feather draft.',
      'canada_goose:head': 'Keep my head draft.'
    }, records: {}, comparison: { draft: 'Keep my comparison draft.' } },
    flightInvestigation: { variable: 'wind', prediction: 'Keep my wind prediction.', trials: [], evidence: 'Keep my wind evidence.' },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge prediction.', notes: 'Keep my reasoning.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep my migration hypothesis.', explanation: 'Keep my explanation.', trials: [] },
    aiExplorerText: 'Keep my migration research.'
  };
}
async function mount(page: Page, dark: boolean) {
  page.setDefaultTimeout(20_000); page.setDefaultNavigationTimeout(30_000);
  const errors: string[] = []; failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('crash', () => errors.push('Browser page crashed'));
  page.on('console', message => { if (message.type() === 'error' && /WebGL|shader|context lost|THREE\.WebGLRenderer/i.test(message.text())) errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'study', flightPaused: true,
    flightSpecies: 'canada_goose', flightShowWingtipPath: true, flightShowAnatomy: true,
    flightStudyRegion: dark ? 'primaries' : 'inner-wing', flightStudyObservationOpen: false, flightWingStep: 13,
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...learnerSeed() } },
    'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  await page.evaluate(dark => {
    const w = window as any, record = w.__glCanvas()?.rec, original = record.scene.onBeforeRender;
    record.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      record.camera = camera; if (original) original.call(this, renderer, scene, camera, ...rest);
    };
    w.__ctx.isDark = dark; w.__ctx.theme = dark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', dark);
    document.body.style.background = dark ? '#0f172a' : '#f8fafc'; w.__rerender();
  }, dark);
  await frames(page);
  expect(await harness.glScene(page)).toMatchObject({ hasScene: true });
  expect((await harness.glContexts(page)).some(context => context.createdBy === 'page' && context.type === 'webgl2' && !context.lost && context.draws > 0)).toBe(true);
}

// Derive anatomical endpoints directly from the real primary geometry. Project
// the actual submitted instance vertices; renderer metadata is not a size oracle.
async function visualState(page: Page, capturedTips?: number[][]) {
  return page.evaluate(capturedTips => {
    const w = window as any, rec = w.__glCanvas()?.rec, scene = rec?.scene, camera = rec?.camera, THREE = w.THREE;
    const marked = scene?.getObjectByName('migration-marked-wing-pose'), flock = scene?.getObjectByName('migration-flock');
    const diamonds = marked?.getObjectByName('migration-marked-wingtip-diamonds'), links = marked?.getObjectByName('migration-marked-wingtip-links');
    const data = w.__toolData.migration;
    if (!marked || !flock || !diamonds || !links || !camera || !rec.canvas) throw new Error('Marked comparison scene unavailable');
    scene.updateMatrixWorld(true);
    const bird = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))];
    const rect = rec.canvas.getBoundingClientRect(), inverse = new THREE.Matrix4().copy(bird.matrixWorld).invert();
    const actualTips = [0, 1].map(side => {
      const primary = bird.userData.primaries[side], vertices = primary?.geometry?.attributes?.position;
      if (!vertices) throw new Error('Anatomical primary mesh unavailable');
      let chosen = 0;
      for (let index = 1; index < vertices.count; index++) if (vertices.getX(index) > vertices.getX(chosen) ||
        (vertices.getX(index) === vertices.getX(chosen) && vertices.getZ(index) > vertices.getZ(chosen))) chosen = index;
      return new THREE.Vector3().fromBufferAttribute(vertices, chosen).applyMatrix4(primary.matrixWorld).applyMatrix4(inverse).toArray();
    });
    const referenceTips = capturedTips || actualTips;
    const shown = (node: any) => { for (let p = node; p; p = p.parent) if (!p.visible) return false; return true; };
    const project = (point: any, matrix: any) => {
      const result = point.clone().applyMatrix4(matrix).project(camera);
      return { x: (result.x + 1) * rect.width / 2, y: (1 - result.y) * rect.height / 2, z: result.z };
    };
    const identityMap = w.__study22Ids || (w.__study22Ids = new WeakMap());
    const identity = (object: object) => { if (!identityMap.has(object)) identityMap.set(object, w.__study22Next = (w.__study22Next || 0) + 1); return identityMap.get(object); };
    const resources = new Set<string>();
    marked.traverse((node: any) => {
      if (node.geometry) resources.add(node.geometry.uuid);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) resources.add(material.uuid);
    });
    const instance = new THREE.Matrix4(), transform = new THREE.Matrix4(), point = new THREE.Vector3(), origin = new THREE.Vector3();
    let radiusError = 0, orientationError = 0, anchorError = 0, linkError = 0, finite = true;
    const positions: any[] = [];
    for (let index = 0; index < diamonds.count; index++) {
      diamonds.getMatrixAt(index, instance); transform.multiplyMatrices(diamonds.matrixWorld, instance);
      const side = diamonds.userData.segmentSides[index], center = project(origin, transform);
      const expectedWorld = new THREE.Vector3().fromArray(referenceTips[side]).applyMatrix4(bird.matrixWorld);
      anchorError = Math.max(anchorError, new THREE.Vector3().setFromMatrixPosition(transform).distanceTo(expectedWorld));
      const vertices = diamonds.geometry.attributes.position;
      for (let vertex = 0; vertex < vertices.count; vertex++) {
        point.fromBufferAttribute(vertices, vertex);
        if (Math.hypot(point.x, point.y) < 0.99) continue;
        const projected = project(point, transform), expectedRadius = 7 * Math.hypot(point.x, point.y);
        const error = Math.abs(Math.hypot(projected.x - center.x, projected.y - center.y) - expectedRadius);
        finite = finite && [projected.x, projected.y, projected.z, error].every(Number.isFinite);
        radiusError = Math.max(radiusError, error);
      }
      const xAxis = project(new THREE.Vector3(1, 0, 0), transform), yAxis = project(new THREE.Vector3(0, 1, 0), transform);
      const xLength = Math.hypot(xAxis.x - center.x, xAxis.y - center.y), yLength = Math.hypot(yAxis.x - center.x, yAxis.y - center.y);
      orientationError = Math.max(orientationError, Math.abs((xAxis.x - center.x) / xLength - 1), Math.abs((xAxis.y - center.y) / xLength),
        Math.abs((yAxis.x - center.x) / yLength), Math.abs((yAxis.y - center.y) / yLength + 1));
      positions.push({ side, center });
    }
    const linkPosition = links.geometry.attributes.position, linkColor = links.geometry.attributes.color, linkDistance = links.geometry.attributes.lineDistance;
    for (let index = 0; index < links.userData.segmentCount; index++) {
      const side = links.userData.segmentSides[index];
      const start = new THREE.Vector3().fromArray(linkPosition.array, index * 6).applyMatrix4(links.matrixWorld);
      const end = new THREE.Vector3().fromArray(linkPosition.array, index * 6 + 3).applyMatrix4(links.matrixWorld);
      linkError = Math.max(linkError, start.distanceTo(new THREE.Vector3().fromArray(referenceTips[side]).applyMatrix4(bird.matrixWorld)),
        end.distanceTo(new THREE.Vector3().fromArray(actualTips[side]).applyMatrix4(bird.matrixWorld)));
    }
    const outlineCount = marked.geometry.drawRange.count;
    return {
      actualTips, capturedTips: referenceTips, radiusError, orientationError, anchorError, linkError, finite, positions,
      diamonds: { visible: shown(diamonds), count: diamonds.count, sides: diamonds.userData.segmentSides.slice(), capacity: diamonds.instanceMatrix.count },
      links: { visible: shown(links), count: links.userData.segmentCount, sides: links.userData.segmentSides.slice(), drawCount: links.geometry.drawRange.count },
      pool: { resources: [...resources].sort(), buffers: [marked.geometry.attributes.position, marked.geometry.attributes.lineDistance,
        linkPosition, linkColor, linkDistance, diamonds.instanceMatrix].map(attribute => [identity(attribute), identity(attribute.array)]),
        linkBytes: linkPosition.array.byteLength + linkColor.array.byteLength + linkDistance.array.byteLength, instanceBytes: diamonds.instanceMatrix.array.byteLength },
      experiment: { source: bird.uuid, phase: bird.userData.lastRenderedWingPhase,
        body: bird.matrixWorld.elements.slice(), flock: flock.matrixWorld.elements.slice(),
        allBodies: flock.children.map((node: any) => node.matrixWorld.elements.slice()),
        joints: [...bird.userData.wings, ...bird.userData.wrists, ...bird.userData.primaries].map((node: any) => node.quaternion.toArray()),
        cameraPosition: camera.position.toArray(), cameraQuaternion: camera.quaternion.toArray(), cameraMatrix: camera.matrixWorld.elements.slice(),
        projection: camera.projectionMatrix.elements.slice(), serial: Number(data.flightWingStep) || 0, paused: data.flightPaused === true,
        marked: { visible: shown(marked), captured: marked.userData.captured, source: marked.userData.sourceBirdUuid, version: marked.userData.captureVersion,
          phase: marked.userData.capturedPhase, count: outlineCount, matrix: marked.matrixWorld.elements.slice(),
          positions: Array.from(marked.geometry.attributes.position.array.slice(0, outlineCount * 3)) },
        cycle: document.querySelector('[data-study-cycle-position][aria-pressed="true"]')?.getAttribute('data-study-cycle-position'),
        followed: document.querySelector('[data-wingtip-follow-status]')?.getAttribute('data-wingtip-follow-status'),
        canvas: { width: rect.width, height: rect.height } },
      errors: w.__events.errors
    };
  }, capturedTips);
}
function expectVisual(state: any, links: number) {
  expect(state.diamonds).toEqual({ visible: true, count: 1, sides: [0, -1], capacity: 2 });
  expect(state.links).toEqual({ visible: links > 0, count: links, sides: links ? [0, -1] : [-1, -1], drawCount: links * 2 });
  expect(state.finite).toBe(true); expect(state.errors).toEqual([]);
  expect(state.radiusError, 'Actual diamond vertices retain a seven CSS pixel radius').toBeLessThan(0.03);
  expect(state.orientationError, 'Diamond planes face the actual rendered camera').toBeLessThan(0.0001);
  expect(state.anchorError, 'Diamond centers match the independently captured anatomical tips').toBeLessThan(0.000002);
  expect(state.linkError, 'Displacement links join the actual marked and current anatomical tips').toBeLessThan(0.000002);
  expect(state.pool.resources).toHaveLength(6); expect(state.pool.linkBytes).toBe(112); expect(state.pool.instanceBytes).toBe(128);
  expect(state.experiment.serial).toBe(13); expect(state.experiment.paused).toBe(true); expect(state.experiment.followed).toBe('left');
}
async function checkTarget(locator: Locator) {
  const dimensions = await locator.evaluate(element => { const r = element.getBoundingClientRect(); return { width: r.width, height: r.height }; });
  expect(dimensions.width).toBeGreaterThanOrEqual(44); expect(dimensions.height).toBeGreaterThanOrEqual(44);
}
async function expectSelected(page: Page, index: number) {
  await expect(cycle(page, index)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-study-stage-cycle-position]')).toHaveAttribute('data-study-stage-cycle-position', String(index));
  await expect(page.locator("[data-migration-id=\"migration-study-current-context\"]")).toContainText('Cycle position ' + (index + 1) + ' of 8 selected.');
}
async function inspectWithoutChanges(page: Page, before: any, beforeVisual: any, tips: number[][], touch: boolean) {
  await expect(inspect(page)).toHaveAccessibleName('Inspect current 3D view');
  await expect(inspect(page)).toBeEnabled(); await checkTarget(inspect(page));
  await expect(inspect(page)).toHaveAttribute('aria-controls', 'migration-flight-stage');
  await activate(page, inspect(page), touch); await expect(stage(page)).toBeFocused();
  const bounds = await stage(page).evaluate(element => {
    const r = element.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: innerWidth, height: innerHeight };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(-1); expect(bounds.right).toBeLessThanOrEqual(bounds.width + 1);
  expect(bounds.top).toBeGreaterThanOrEqual(-1); expect(bounds.bottom).toBeLessThanOrEqual(bounds.height + 1);
  expect(await saved(page), 'Inspect neither replays a saved view nor edits any learner work').toEqual(before);
  const after = await visualState(page, tips); expectVisual(after, 0);
  expect(after.experiment, 'Inspect preserves rendered pose, view, source, selected cycle, side, serial and paused bodies').toEqual(beforeVisual.experiment);
  expect(after.pool).toEqual(beforeVisual.pool);
  await expectSelected(page, 2);
  return { after, bounds };
}

async function inspectionFlow(page: Page, dark: boolean, touch: boolean) {
  const stem = touch ? 'mobile-' + (dark ? 'dark' : 'light') + '-study-inspection' : 'desktop-study-inspection';
  await mount(page, dark);
  await activate(page, page.getByRole('button', { name: 'Individual’s left: solid path', exact: true }), touch);
  await activate(page, cycle(page, 2), touch); await expectSelected(page, 2);
  await activate(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }), touch);
  const originalSaved = await saved(page), marked3 = await visualState(page); expectVisual(marked3, 0);
  expect(marked3.experiment.marked.visible).toBe(true); expect(marked3.experiment.marked.captured).toBe(true);
  await stage(page).screenshot({ path: join(report, stem + '-marked-position.png') });
  await activate(page, opposite(page), touch); await expectSelected(page, 6);
  const opposite7 = await visualState(page, marked3.actualTips); expectVisual(opposite7, 1);
  expect(opposite7.pool).toEqual(marked3.pool); expect(opposite7.experiment.marked).toEqual(marked3.experiment.marked);
  expect(opposite7.experiment.body).toEqual(marked3.experiment.body); expect(opposite7.experiment.cameraMatrix).toEqual(marked3.experiment.cameraMatrix);
  expect(opposite7.experiment.phase).not.toBe(marked3.experiment.phase); expect(opposite7.experiment.joints).not.toEqual(marked3.experiment.joints);
  expect(await saved(page)).toEqual(originalSaved);
  if (!touch) await stage(page).screenshot({ path: join(report, stem + '-opposite-position.png') });
  await activate(page, opposite(page), touch); await expectSelected(page, 2);
  const returned3 = await visualState(page, marked3.actualTips); expectVisual(returned3, 0);
  expect(returned3.experiment).toEqual(marked3.experiment); expect(returned3.pool).toEqual(marked3.pool); expect(await saved(page)).toEqual(originalSaved);

  await activate(page, page.getByRole('button', { name: 'Describe this wing segment', exact: true }), touch);
  await expect(note(page)).toBeFocused();
  const region = originalSaved.flightStudyRegion, key = 'canada_goose:' + region;
  await expect(note(page)).toHaveValue(originalSaved.flightStudyObservations.drafts[key]);
  const evidence = 'I kept the individual’s left wing and view fixed, marked cycle position 3, and compared position 7. Back at 3 the marked diamond meets the live tip; at 7 the line shows the visible difference.';
  await note(page).fill(evidence); await frames(page);
  const drafted = await saved(page), beforeInspect = await visualState(page, marked3.actualTips);
  expect(drafted.flightStudyObservations.records).toEqual(originalSaved.flightStudyObservations.records);
  await page.locator("[data-migration-id=\"migration-study-current-context\"]").screenshot({ path: join(report, stem + '-notes-context.png') });
  const firstInspect = await inspectWithoutChanges(page, drafted, beforeInspect, marked3.actualTips, touch);
  await stage(page).screenshot({ path: join(report, stem + '-inspected-stage.png') });
  // Keyboard interaction begins directly from the focused native scene. Only
  // the intentional arrow input changes the view; the frozen pose stays fixed.
  if (!touch) {
    await page.keyboard.press('ArrowRight'); await frames(page);
    const turned = await visualState(page, marked3.actualTips); expectVisual(turned, 0);
    expect((await saved(page)).flightStudyYaw).toBe(drafted.flightStudyYaw + 10);
    expect(turned.experiment.phase).toBe(beforeInspect.experiment.phase); expect(turned.experiment.joints).toEqual(beforeInspect.experiment.joints);
    expect(turned.experiment.body).toEqual(beforeInspect.experiment.body); expect(turned.experiment.cameraMatrix).not.toEqual(beforeInspect.experiment.cameraMatrix);
    expect((await saved(page)).flightStudyObservations).toEqual(drafted.flightStudyObservations);
    await page.keyboard.press('ArrowLeft'); await frames(page);
    expect(await saved(page)).toEqual(drafted);
  }
  await activate(page, page.getByRole('button', { name: 'Describe this wing segment', exact: true }), touch);
  await expect(note(page)).toBeFocused(); await expect(note(page)).toHaveValue(evidence);
  await activate(page, page.getByRole('button', { name: 'Record observation', exact: true }), touch);
  const recorded = await saved(page), record = recorded.flightStudyObservations.records[key];
  expect(record.note).toBe(evidence); expect(record.wingStep).toBe(13); expect(record.paused).toBe(true);
  for (const field of ['cyclePosition', 'oppositePosition', 'followedSide', 'followSide', 'flightStudyCyclePosition', 'flightWingtipFollowSide']) expect(record).not.toHaveProperty(field);
  for (const other of ['head', 'inner-wing', 'primaries'].filter(id => id !== region)) expect(recorded.flightStudyObservations.drafts['canada_goose:' + other]).toBe(originalSaved.flightStudyObservations.drafts['canada_goose:' + other]);
  for (const field of ['flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']) expect(recorded[field]).toEqual(originalSaved[field]);
  const secondBefore = await visualState(page, marked3.actualTips);
  const secondInspect = await inspectWithoutChanges(page, recorded, secondBefore, marked3.actualTips, touch);
  await page.addScriptTag({ content: axeSource });
  const accessibility = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      violations: result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })), errors: (window as any).__events.errors };
  });
  expect(accessibility.scrollWidth).toBe(accessibility.width); expect(accessibility.violations).toEqual([]); expect(accessibility.errors).toEqual([]);
  expect(failures.get(page)).toEqual([]);
  await writeFile(join(report, stem + '.json'), JSON.stringify({ originalSaved, marked3, opposite7, returned3, drafted, beforeInspect,
    firstInspect, recorded, secondBefore, secondInspect, accessibility }, null, 2));
}

test('Keyboard learners inspect the current 3D view from their own notes without changing the comparison or recording evidence', async ({ page }) => {
  await inspectionFlow(page, false, false);
});
for (const dark of [false, true]) test.describe('Migration study inspection phone ' + (dark ? 'dark' : 'light') + ' round22', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch learners return from draft and recorded notes to the same frozen 3D comparison with persistent marked tips', async ({ page }) => {
    await inspectionFlow(page, dark, true);
  });
});
