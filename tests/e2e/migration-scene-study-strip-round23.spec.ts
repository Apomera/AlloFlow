import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 120_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round23-2026-10-21');
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
      timer = setTimeout(() => reject(new Error('Round23 scene cleanup exceeded 20 seconds')), 20_000);
    })]);
  } finally { if (timer) clearTimeout(timer); }
});

const stage = (page: Page) => page.locator('.migration-flight-stage');
const inspect = (page: Page) => page.locator('[data-study-action="inspect-current-view"]');
const note = (page: Page) => page.getByRole('textbox', { name: 'My observation', exact: true });
const cycle = (page: Page, index: number) => page.getByRole('button', { name: 'Cycle position ' + (index + 1) + ' of 8', exact: true });
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
    const identityMap = w.__study23Ids || (w.__study23Ids = new WeakMap());
    const identity = (object: object) => { if (!identityMap.has(object)) identityMap.set(object, w.__study23Next = (w.__study23Next || 0) + 1); return identityMap.get(object); };
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


const sceneStrip = (page: Page) => page.locator('[data-scene-study-actions="true"]');
const sceneOpposite = (page: Page) => page.locator('[data-scene-study-action="opposite"]');
const continueNote = (page: Page) => page.locator('[data-study-scene-action="continue-note"]');
const regionLabels: Record<string, { number: number; label: string }> = {
  head: { number: 1, label: 'Head' }, 'inner-wing': { number: 2, label: 'Inner wing' },
  primaries: { number: 3, label: 'Primary feathers' }, tail: { number: 4, label: 'Tail' }
};
async function expectStrip(page: Page, region: string, index: number | null, noteOpen: boolean) {
  await expect(sceneStrip(page)).toBeVisible();
  await expect(page.locator('[data-scene-study-context]')).toHaveAttribute('data-scene-study-context', 'ready');
  const part = page.locator('[data-scene-study-region]');
  await expect(part).toHaveAttribute('data-scene-study-region', region);
  await expect(part).toContainText(regionLabels[region].label);
  await expect(part).toContainText(String(regionLabels[region].number));
  await expect(page.locator('[data-scene-study-cycle]')).toHaveAttribute('data-scene-study-cycle', index === null ? 'none' : String(index));
  await expect(page.locator('[data-scene-study-side]')).toHaveAttribute('data-scene-study-side', 'left');
  await expect(sceneOpposite(page)).toHaveAccessibleName('Compare opposite wings');
  if (index === null) await expect(sceneOpposite(page)).toBeDisabled(); else await expect(sceneOpposite(page)).toBeEnabled();
  await checkTarget(sceneOpposite(page));
  if (noteOpen) { await expect(continueNote(page)).toHaveAccessibleName('Continue observation note'); await checkTarget(continueNote(page)); }
  else await expect(continueNote(page)).toHaveCount(0);
}
async function stripLayout(page: Page, phone: boolean) {
  const layout = await page.evaluate(() => {
    const stage = document.querySelector('.migration-flight-stage')!, strip = document.querySelector('[data-scene-study-actions="true"]')!;
    const deck = document.querySelector('.migration-flight-deck')!, view = document.querySelector('.migration-flight-view')!;
    const aside = document.querySelector('.migration-flight-controls')!, canvas = stage.querySelector('canvas')!;
    const rect = (element: Element) => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    return { stage: rect(stage), strip: rect(strip), deck: rect(deck), view: rect(view), aside: rect(aside), canvas: rect(canvas),
      deckStudy: deck.getAttribute('data-study-strip'), viewport: { width: innerWidth, height: innerHeight },
      scrollWidth: document.documentElement.scrollWidth, buttons: Array.from(strip.querySelectorAll('button')).map(rect) };
  });
  expect(layout.deckStudy).toBe('true');
  expect(layout.stage.height, 'The new strip must not shrink the established study canvas').toBeCloseTo(phone ? 390 : 678, 1);
  expect(layout.canvas.height).toBeCloseTo(phone ? 390 : 678, 1);
  expect(layout.strip.top, 'Study actions belong below the canvas, outside all drawn annotations').toBeGreaterThanOrEqual(layout.stage.bottom - 0.1);
  expect(layout.strip.left).toBeGreaterThanOrEqual(layout.view.left - 0.1);
  expect(layout.strip.right).toBeLessThanOrEqual(layout.view.right + 0.1);
  expect(layout.strip.bottom, 'The deck must expand to contain the full strip').toBeLessThanOrEqual(layout.deck.bottom + 0.1);
  expect(layout.strip.bottom).toBeLessThanOrEqual(layout.view.bottom + 0.1);
  expect(layout.scrollWidth).toBe(layout.viewport.width);
  if (!phone) expect(layout.aside.height).toBeCloseTo(678, 1);
  for (const button of layout.buttons) {
    expect(button.width).toBeGreaterThanOrEqual(44); expect(button.height).toBeGreaterThanOrEqual(44);
    expect(button.left).toBeGreaterThanOrEqual(layout.strip.left - 0.1); expect(button.right).toBeLessThanOrEqual(layout.strip.right + 0.1);
    expect(button.top).toBeGreaterThanOrEqual(layout.strip.top - 0.1); expect(button.bottom).toBeLessThanOrEqual(layout.strip.bottom + 0.1);
  }
  return layout;
}
async function selection(page: Page) {
  return note(page).evaluate((element: HTMLTextAreaElement) => ({ start: element.selectionStart, end: element.selectionEnd, direction: element.selectionDirection }));
}
async function continueWithoutChanges(page: Page, before: any, beforeVisual: any, tips: number[][], selected: any, touch: boolean) {
  await expect(continueNote(page)).toHaveAttribute('aria-controls', 'migration-study-observation-note');
  await expect(continueNote(page)).toBeEnabled();
  await activate(page, continueNote(page), touch); await expect(note(page)).toBeFocused();
  expect(await selection(page), 'Returning to the existing note retains its exact caret/selection').toEqual(selected);
  expect(await saved(page), 'Continue never replays a previous region or authors evidence').toEqual(before);
  const after = await visualState(page, tips); expectVisual(after, 0);
  expect(after.experiment).toEqual(beforeVisual.experiment); expect(after.pool).toEqual(beforeVisual.pool);
  const bounds = await note(page).evaluate(element => { const r = element.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: innerHeight }; });
  expect(bounds.top).toBeGreaterThanOrEqual(-1); expect(bounds.bottom).toBeLessThanOrEqual(bounds.height + 1);
  return { after, selected: await selection(page), bounds };
}

async function fullscreenStripLayout(page: Page, tips: number[][]) {
  const before = await saved(page), beforeVisual = await visualState(page, tips);
  const deck = page.locator('.migration-flight-deck');
  let initial: any, scrolled: any;
  try {
    // Exercise the existing in-page fullscreen fallback CSS without requesting
    // OS fullscreen. The stage stays viewport-height and the strip is reached
    // through the view's own scrollbar instead of shrinking the study canvas.
    await deck.evaluate(element => {
      element.setAttribute('data-allo-fullscreen-active', 'true');
      (element.querySelector('.migration-flight-view') as HTMLElement).scrollTop = 0;
    });
    await frames(page);
    await page.waitForFunction(() => Math.abs(document.querySelector('.migration-flight-stage')!.getBoundingClientRect().height - innerHeight) < 1);
    initial = await deck.evaluate(element => {
      const view = element.querySelector('.migration-flight-view') as HTMLElement;
      const stage = element.querySelector('.migration-flight-stage')!, strip = element.querySelector('[data-scene-study-actions="true"]')!;
      const rect = (node: Element) => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
      return { deck: rect(element), view: rect(view), stage: rect(stage), strip: rect(strip),
        viewportHeight: innerHeight, clientHeight: view.clientHeight, scrollHeight: view.scrollHeight, overflowY: getComputedStyle(view).overflowY };
    });
    expect(initial.deck.height).toBeCloseTo(initial.viewportHeight, 1);
    expect(initial.view.height).toBeCloseTo(initial.viewportHeight, 1);
    expect(initial.stage.height).toBeCloseTo(initial.viewportHeight, 1);
    expect(initial.scrollHeight).toBeGreaterThan(initial.clientHeight);
    expect(initial.overflowY).toBe('auto');
    await deck.evaluate(element => { const view = element.querySelector('.migration-flight-view') as HTMLElement; view.scrollTop = view.scrollHeight; });
    await frames(page);
    scrolled = await deck.evaluate(element => {
      const view = element.querySelector('.migration-flight-view') as HTMLElement, strip = element.querySelector('[data-scene-study-actions="true"]')!;
      const rect = (node: Element) => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
      return { view: rect(view), strip: rect(strip), scrollTop: view.scrollTop, clientHeight: view.clientHeight, scrollHeight: view.scrollHeight,
        buttons: Array.from(strip.querySelectorAll('button')).map(rect) };
    });
    expect(scrolled.scrollTop).toBeGreaterThan(0);
    expect(scrolled.strip.top).toBeGreaterThanOrEqual(scrolled.view.top - 1);
    expect(scrolled.strip.bottom).toBeLessThanOrEqual(scrolled.view.bottom + 1);
    for (const button of scrolled.buttons) {
      expect(button.top).toBeGreaterThanOrEqual(scrolled.view.top - 1); expect(button.bottom).toBeLessThanOrEqual(scrolled.view.bottom + 1);
    }
    await sceneStrip(page).screenshot({ path: join(report, 'desktop-scene-study-strip-fullscreen-scroll.png') });
    expect(await saved(page)).toEqual(before);
  } finally {
    await deck.evaluate(element => {
      element.removeAttribute('data-allo-fullscreen-active');
      (element.querySelector('.migration-flight-view') as HTMLElement).scrollTop = 0;
    });
    await frames(page);
  }
  await page.waitForFunction(() => Math.abs(document.querySelector('.migration-flight-stage')!.getBoundingClientRect().height - 678) < 1);
  expect(await saved(page)).toEqual(before);
  const after = await visualState(page, tips); expectVisual(after, 0);
  expect(after.experiment).toEqual(beforeVisual.experiment); expect(after.pool).toEqual(beforeVisual.pool);
  return { initial, scrolled, beforeVisual, after };
}

async function sceneStudyFlow(page: Page, dark: boolean, touch: boolean) {
  const stem = touch ? 'mobile-' + (dark ? 'dark' : 'light') + '-scene-study-strip' : 'desktop-scene-study-strip';
  await mount(page, dark);
  await expect(sceneOpposite(page)).toBeDisabled(); await expect(continueNote(page)).toHaveCount(0);
  await activate(page, page.getByRole('button', { name: 'Individual’s left: solid path', exact: true }), touch);
  await activate(page, cycle(page, 2), touch); await expectSelected(page, 2);
  await activate(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }), touch);
  const originalSaved = await saved(page), region = originalSaved.flightStudyRegion, key = 'canada_goose:' + region;
  const marked3 = await visualState(page); expectVisual(marked3, 0); await expectStrip(page, region, 2, false);
  const markedLayout = await stripLayout(page, touch);
  await page.locator('.migration-flight-view').screenshot({ path: join(report, stem + '-marked-position.png') });
  await activate(page, sceneOpposite(page), touch); await expectSelected(page, 6); await expectStrip(page, region, 6, false);
  const opposite7 = await visualState(page, marked3.actualTips); expectVisual(opposite7, 1);
  expect(opposite7.pool).toEqual(marked3.pool); expect(opposite7.experiment.marked).toEqual(marked3.experiment.marked);
  expect(opposite7.experiment.body).toEqual(marked3.experiment.body); expect(opposite7.experiment.allBodies).toEqual(marked3.experiment.allBodies);
  expect(opposite7.experiment.cameraMatrix).toEqual(marked3.experiment.cameraMatrix);
  expect(opposite7.experiment.phase).not.toBe(marked3.experiment.phase); expect(opposite7.experiment.joints).not.toEqual(marked3.experiment.joints);
  expect(await saved(page)).toEqual(originalSaved);
  await page.locator('.migration-flight-view').screenshot({ path: join(report, stem + '-opposite-position.png') });
  await activate(page, sceneOpposite(page), touch); await expectSelected(page, 2); await expectStrip(page, region, 2, false);
  const returned3 = await visualState(page, marked3.actualTips); expectVisual(returned3, 0);
  expect(returned3.experiment).toEqual(marked3.experiment); expect(returned3.pool).toEqual(marked3.pool); expect(await saved(page)).toEqual(originalSaved);

  await activate(page, page.getByRole('button', { name: 'Describe this wing segment', exact: true }), touch);
  await expect(note(page)).toBeFocused(); await expect(note(page)).toHaveValue(originalSaved.flightStudyObservations.drafts[key]);
  const evidence = 'I predicted that the marked left tip would meet its live dot when I returned from cycle 7 to cycle 3. I kept the camera fixed and used the nearby comparison action to check the visible difference.';
  await note(page).fill(evidence); await frames(page);
  await note(page).evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(9, 45, 'backward'));
  const selected = await selection(page), drafted = await saved(page), beforeInspect = await visualState(page, marked3.actualTips);
  const inspectedDraft = await inspectWithoutChanges(page, drafted, beforeInspect, marked3.actualTips, touch);
  await expectStrip(page, region, 2, true); const openLayout = await stripLayout(page, touch);
  await page.locator('.migration-flight-view').screenshot({ path: join(report, stem + '-note-actions.png') });
  await activate(page, sceneOpposite(page), touch); await expectSelected(page, 6);
  const draftOpposite7 = await visualState(page, marked3.actualTips); expectVisual(draftOpposite7, 1);
  expect(await saved(page)).toEqual(drafted); expect(await selection(page)).toEqual(selected);
  await activate(page, sceneOpposite(page), touch); await expectSelected(page, 2);
  const beforeContinue = await visualState(page, marked3.actualTips);
  expect(beforeContinue.experiment).toEqual(beforeInspect.experiment); expect(beforeContinue.pool).toEqual(beforeInspect.pool);
  const continuedDraft = await continueWithoutChanges(page, drafted, beforeContinue, marked3.actualTips, selected, touch);
  await expect(note(page)).toHaveValue(evidence);
  await note(page).locator('..').screenshot({ path: join(report, stem + '-continued-note.png') });

  await activate(page, page.getByRole('button', { name: 'Record observation', exact: true }), touch);
  const recorded = await saved(page), record = recorded.flightStudyObservations.records[key];
  expect(record.note).toBe(evidence); expect(record.wingStep).toBe(13); expect(record.paused).toBe(true);
  for (const field of ['cyclePosition', 'oppositePosition', 'followedSide', 'followSide', 'flightStudyCyclePosition', 'flightWingtipFollowSide']) expect(record).not.toHaveProperty(field);
  const selectedRecorded = await selection(page), beforeRecorded = await visualState(page, marked3.actualTips);
  const inspectedRecord = await inspectWithoutChanges(page, recorded, beforeRecorded, marked3.actualTips, touch);
  const continuedRecord = await continueWithoutChanges(page, recorded, inspectedRecord.after, marked3.actualTips, selectedRecorded, touch);
  expect((await saved(page)).flightStudyObservations.records[key]).toEqual(record);

  // An explicit region change chooses the current note. The strip must never
  // silently replay the note that happened to be inspected earlier.
  await activate(page, page.locator('[data-study-region="head"]'), touch); await expect(note(page)).toHaveAttribute('data-study-observation-key', 'canada_goose:head');
  await expect(note(page)).toHaveValue('Keep my head draft.');
  await note(page).focus(); await note(page).evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(3, 14, 'forward'));
  const selectedHead = await selection(page), headSaved = await saved(page), headVisual = await visualState(page, marked3.actualTips);
  const inspectedHead = await inspectWithoutChanges(page, headSaved, headVisual, marked3.actualTips, touch);
  await expectStrip(page, 'head', 2, true);
  if (!touch) await page.locator('.migration-flight-view').screenshot({ path: join(report, stem + '-current-head-note.png') });
  const continuedHead = await continueWithoutChanges(page, headSaved, inspectedHead.after, marked3.actualTips, selectedHead, touch);
  await expect(note(page)).toHaveValue('Keep my head draft.');
  const finalSaved = await saved(page);
  expect(finalSaved.flightStudyObservations.drafts[key]).toBe(evidence); expect(finalSaved.flightStudyObservations.records[key]).toEqual(record);
  expect(Object.keys(finalSaved.flightStudyObservations.records)).toEqual([key]);
  for (const field of ['flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']) expect(finalSaved[field]).toEqual(originalSaved[field]);
  const finalLayout = await stripLayout(page, touch);
  const fullscreen = touch ? null : await fullscreenStripLayout(page, marked3.actualTips);
  await page.addScriptTag({ content: axeSource });
  const accessibility = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      violations: result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })), errors: (window as any).__events.errors };
  });
  expect(accessibility.scrollWidth).toBe(accessibility.width); expect(accessibility.violations).toEqual([]); expect(accessibility.errors).toEqual([]);
  expect(failures.get(page)).toEqual([]);
  await writeFile(join(report, stem + '.json'), JSON.stringify({ originalSaved, marked3, opposite7, returned3, markedLayout, openLayout, finalLayout,
    drafted, selected, beforeInspect, inspectedDraft, draftOpposite7, beforeContinue, continuedDraft,
    recorded, selectedRecorded, beforeRecorded, inspectedRecord, continuedRecord, headSaved, selectedHead, headVisual, inspectedHead, continuedHead, fullscreen, accessibility }, null, 2));
}

test('Keyboard learners compare beside the 3D scene and continue the current observation with their selection and evidence intact', async ({ page }) => {
  await sceneStudyFlow(page, false, false);
});
for (const dark of [false, true]) test.describe('Migration scene study strip phone ' + (dark ? 'dark' : 'light') + ' round23', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch learners compare wing positions near the model and return to the current note without replay or lost work', async ({ page }) => {
    await sceneStudyFlow(page, dark, true);
  });
});
