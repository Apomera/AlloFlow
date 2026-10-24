import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 120_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round30-2026-10-22');
const canonical = readFileSync(join(process.cwd(), 'stem_lab/stem_tool_migration.js'));
if (!canonical.equals(readFileSync(join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js')))) throw new Error('Canonical and desktop migration sources differ');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE || Object.keys(process.env).some(key => /^MIGRATION_.*_CANDIDATE$/.test(key) && process.env[key])) throw new Error('Canonical regression rejects runtime substitutions');
const sourceProof = { canonical: 'stem_lab/stem_tool_migration.js', mirror: 'desktop/web-app/public/stem_lab/stem_tool_migration.js',
  sha256: createHash('sha256').update(canonical).digest('hex'), bytes: canonical.length, identical: true };
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_migration.js', toolId: 'migration',
  width: 1100, height: 900, layout: 'document', appStyles: true,
  probes: `var viewport=document.createElement('meta');viewport.name='viewport';viewport.content='width=device-width,initial-scale=1';document.head.appendChild(viewport);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';` });
const failures = new WeakMap<Page, string[]>();
test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await Promise.race([harness.destroy(page), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Round30 scene cleanup exceeded 20 seconds')), 20_000); })]); }
  finally { if (timer) clearTimeout(timer); }
});
const stage = (page: Page) => page.locator('.migration-flight-stage');
const selected = (page: Page) => page.locator('[data-study-selected-comparison-activity]');
const savedPanel = (page: Page) => page.locator('[data-study-saved-comparison]');
const claim = (page: Page) => page.getByRole('textbox', { name: 'My observation comparison', exact: true });
const viewpoint = (page: Page, name: string) => page.locator('[data-study-viewpoint="' + name + '"]');
const markedAction = (page: Page, name: string) => page.locator('[data-marked-pose-action="' + name + '"]');
async function frames(page: Page) {
  const n = await page.evaluate(() => (window as any).__glScene()?.renders || 0);
  await page.waitForFunction(n => ((window as any).__glScene()?.renders || 0) >= n + 2, n, { timeout: 20_000 });
}
async function activate(page: Page, locator: Locator, touch = false) {
  if (touch) await locator.tap(); else { await locator.focus(); await page.keyboard.press('Enter'); }
  await frames(page);
}
async function data(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.migration))); }
async function writes(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__round30Writes))); }
function learnerWork(value: any) {
  return Object.fromEntries(['flightStudyObservations', 'flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText'].map(key => [key, value[key]]));
}
async function mount(page: Page, options: { species?: string; region?: string; dark?: boolean; reduced?: boolean; extra?: any } = {}) {
  page.setDefaultTimeout(20_000); page.setDefaultNavigationTimeout(30_000);
  const errors: string[] = []; failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.stack || error.message)); page.on('crash', () => errors.push('Browser page crashed'));
  page.on('console', message => { if (message.type() === 'error' && /WebGL|shader|context lost|THREE\.WebGLRenderer/i.test(message.text())) errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: options.reduced === false ? 'no-preference' : 'reduce' });
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'study', flightPaused: true,
    flightSpecies: options.species || 'canada_goose', flightShowWingtipPath: true, flightShowAnatomy: options.species !== 'monarch',
    flightStudyRegion: options.region || 'primaries', flightStudyObservationOpen: true, flightWingStep: 13,
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1, ...options.extra } },
  'document.querySelector(".migration-flight-stage")?.getAttribute("data-flight-ready")==="true"');
  await page.evaluate(dark => {
    const w = window as any, rec = w.__glCanvas().rec, original = rec.scene.onBeforeRender;
    rec.scene.onBeforeRender = function(renderer: any, scene: any, camera: any, ...rest: any[]) {
      rec.camera = camera; if (original) original.call(this, renderer, scene, camera, ...rest);
    };
    w.__round30Writes = [];
    for (const method of ['update', 'updateMulti']) {
      const originalUpdate = w.__ctx[method];
      w.__ctx[method] = function(...args: any[]) {
        w.__round30Writes.push({ bucket: args[0], patch: JSON.parse(JSON.stringify(method === 'update' ? { [args[1]]: args[2] } : args[1])) });
        return originalUpdate.apply(this, args);
      };
    }
    if (dark) { w.__ctx.isDark = true; w.__ctx.theme = 'dark'; document.documentElement.classList.add('dark'); document.body.style.background = '#0f172a'; w.__rerender(); }
  }, !!options.dark);
  await frames(page);
  expect((await harness.glContexts(page)).some(item => item.createdBy === 'page' && item.type === 'webgl2' && !item.lost && item.draws > 0)).toBe(true);
}

// Inspect the geometry submitted by Three.js. All relief, manifold, boundary,
// normal and material assertions are derived from real buffers, not metadata.
async function scene(page: Page) {
  return page.evaluate(() => {
    const w = window as any, rec = w.__glCanvas().rec, THREE = w.THREE, d = w.__toolData.migration;
    const root = rec.scene, camera = rec.camera, flock = root.getObjectByName('migration-flock');
    const index = Number(d.flightStudyBird) || 0, bird = flock.children[index]; root.updateMatrixWorld(true);
    const ids = w.__round30Ids || (w.__round30Ids = new WeakMap());
    const identity = (object: object) => { if (!ids.has(object)) ids.set(object, w.__round30Next = (w.__round30Next || 0) + 1); return ids.get(object); };
    const attributes = (geometry: any) => Object.entries(geometry.attributes).map(([name, attribute]: [string, any]) => [name, identity(attribute), identity(attribute.array)]);
    function geometry(mesh: any) {
      const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color, ix = g.index;
      const edges = new Map<string, number>(), areas: number[] = [], facing: number[] = [];
      for (let i = 0; i < ix.count; i += 3) {
        const triangle = [ix.getX(i), ix.getX(i + 1), ix.getX(i + 2)];
        const a = new THREE.Vector3().fromBufferAttribute(p, triangle[0]);
        const cross = new THREE.Vector3().fromBufferAttribute(p, triangle[1]).sub(a).cross(new THREE.Vector3().fromBufferAttribute(p, triangle[2]).sub(a));
        areas.push(cross.length() / 2); facing.push(cross.y);
        for (let k = 0; k < 3; k++) { const edge = [triangle[k], triangle[(k + 1) % 3]].sort((a, b) => a - b).join(':'); edges.set(edge, (edges.get(edge) || 0) + 1); }
      }
      return { name: mesh.name, geometry: g.uuid, material: mesh.material.uuid, vertices: p.count, triangles: ix.count / 3,
        positions: Array.from(p.array), normals: Array.from(n.array), colors: c ? Array.from(c.array) : null, indices: Array.from(ix.array),
        normalLengths: Array.from({ length: n.count }, (_, i) => Math.hypot(n.getX(i), n.getY(i), n.getZ(i))), areas, facing,
        boundary: [...edges].filter(([, uses]) => uses === 1).map(([edge]) => edge).sort(), edgeUses: [...edges].map(([, uses]) => uses),
        buffers: attributes(g), indexIdentity: [identity(ix), identity(ix.array)],
        style: { type: mesh.material.type, vertexColors: mesh.material.vertexColors, color: mesh.material.color.getHex(), roughness: mesh.material.roughness, side: mesh.material.side } };
    }
    const inner = bird.userData.wings.map((wing: any) => wing.children.find((node: any) => node.isMesh)).map(geometry);
    const hands = (bird.userData.wrists || []).map((wrist: any) => wrist.children.find((node: any) => node.isMesh)).map(geometry);
    const membranes = bird.userData.wings.flatMap((wing: any) => wing.children.filter((node: any) => /^migration-monarch-(forewing|hindwing)$/.test(node.name))).map(geometry);
    const pool: any[] = [], nodes: string[] = []; root.traverse((node: any) => {
      nodes.push(node.uuid); if (node.geometry) pool.push([node.geometry.uuid, attributes(node.geometry), node.geometry.index ? identity(node.geometry.index.array) : null]);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) pool.push([material.uuid, material.type]);
    });
    const target = bird.getWorldPosition(new THREE.Vector3()), offset = camera.position.clone().sub(target).normalize();
    let extent = 0, minDepth = Infinity, maxDepth = -Infinity; const point = new THREE.Vector3();
    bird.traverse((node: any) => { const p = node.geometry?.attributes.position; if (!p) return;
      for (let i = 0; i < p.count; i++) { point.fromBufferAttribute(p, i).applyMatrix4(node.matrixWorld).project(camera); extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y)); minDepth = Math.min(minDepth, point.z); maxDepth = Math.max(maxDepth, point.z); }
    });
    const mark = root.getObjectByName('migration-marked-wing-pose');
    return { inner, hands, membranes, pool, nodes, camera: camera.matrixWorld.toArray(), projection: camera.projectionMatrix.toArray(),
      model: bird.matrixWorld.toArray(), wings: bird.userData.wings.map((wing: any) => wing.matrixWorld.toArray()),
      joints: [...bird.userData.wings, ...(bird.userData.wrists || []), ...(bird.userData.primaries || [])].map((joint: any) => joint.quaternion.toArray()),
      view: { yaw: d.flightStudyYaw, pitch: d.flightStudyPitch, zoom: d.flightStudyZoom, species: d.flightSpecies, step: d.flightWingStep, phase: bird.userData.lastRenderedWingPhase },
      studyRadius: bird.userData.studyRadius, selected: index, visible: flock.children.filter((child: any) => child.visible).length,
      offset: offset.toArray(), extent, minDepth, maxDepth, region: d.flightStudyRegion, paused: d.flightPaused,
      stage: { width: rec.canvas.clientWidth, height: rec.canvas.clientHeight },
      marked: { captured: mark?.userData.captured, phase: mark?.userData.capturedPhase, count: mark?.geometry.drawRange.count,
        finite: Array.from(mark?.geometry.attributes.position.array || []).every(Number.isFinite) } };
  });
}
function expectBird(state: any) {
  expect(state.inner).toHaveLength(2); expect(state.hands).toHaveLength(2);
  for (const panel of state.inner) {
    expect(panel.vertices).toBe(56); expect(panel.triangles).toBe(106);
    expect(panel.boundary).toEqual(['0:1', '0:2', '1:3', '2:3']); expect(panel.edgeUses.every((uses: number) => uses === 1 || uses === 2)).toBe(true);
    expect(panel.areas.every((value: number) => value > 1e-9)).toBe(true);
    expect(panel.facing.every((value: number) => value > 0) || panel.facing.every((value: number) => value < 0)).toBe(true);
    expect(panel.normalLengths.every((value: number) => Math.abs(value - 1) < 1e-6)).toBe(true);
    expect([...panel.positions, ...panel.normals, ...panel.colors].every(Number.isFinite)).toBe(true);
    const ys = panel.positions.filter((_: number, i: number) => i % 3 === 1);
    expect(Math.max(...ys)).toBeGreaterThan(.07); expect(Math.max(...ys)).toBeLessThan(.12); expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...panel.colors) - Math.min(...panel.colors)).toBeGreaterThan(.1);
    expect(Math.min(...panel.colors)).toBeGreaterThanOrEqual(.81999); expect(Math.max(...panel.colors)).toBeLessThanOrEqual(1.00001);
    expect(panel.style).toMatchObject({ type: 'MeshStandardMaterial', vertexColors: true, roughness: .72, side: 2 });
  }
  expect(state.inner[0].material).toBe(state.inner[1].material);
  for (const hand of state.hands) { expect(hand.vertices).toBe(7); expect(hand.colors).toBeNull(); expect(hand.style.vertexColors).toBe(false); expect(hand.material).not.toBe(state.inner[0].material); }
  expect(state.hands[0].material).toBe(state.hands[1].material);
  expect(state.visible).toBe(1); expect(state.paused).toBe(true);
}
function expectSameResources(a: any, b: any) {
  expect(a.pool).toEqual(b.pool); expect(a.nodes).toEqual(b.nodes); expect(a.inner).toEqual(b.inner); expect(a.hands).toEqual(b.hands); expect(a.membranes).toEqual(b.membranes); expect(a.studyRadius).toBe(b.studyRadius);
}
function expectMonarch(state: any) {
  expect(state.hands).toEqual([]); expect(state.membranes).toHaveLength(4);
  expect(state.membranes.map((mesh: any) => mesh.name)).toEqual(['migration-monarch-forewing', 'migration-monarch-hindwing', 'migration-monarch-forewing', 'migration-monarch-hindwing']);
  for (const membrane of state.membranes) {
    expect(membrane.vertices).toBeGreaterThan(250); expect(membrane.triangles).toBeGreaterThan(150);
    expect(membrane.colors).toHaveLength(membrane.vertices * 3);
    expect([...membrane.positions, ...membrane.normals, ...membrane.colors].every(Number.isFinite)).toBe(true);
    expect(Math.max(...membrane.colors) - Math.min(...membrane.colors)).toBeGreaterThan(.8);
    expect(membrane.style).toMatchObject({ type: 'MeshStandardMaterial', vertexColors: true, roughness: .68, side: 2 });
    expect(membrane.normalLengths.every((length: number) => Math.abs(length - 1) < 1e-6)).toBe(true);
  }
  expect(new Set(state.membranes.map((mesh: any) => mesh.material)).size).toBe(1);
  expect(state.membranes[0].geometry).toBe(state.membranes[2].geometry); expect(state.membranes[1].geometry).toBe(state.membranes[3].geometry);
}
function expectFitted(state: any) {
  expect(state.extent).toBeGreaterThan(.2); expect(state.extent).toBeLessThan(.98); expect(state.minDepth).toBeGreaterThan(-1); expect(state.maxDepth).toBeLessThan(1);
}
async function settled(page: Page) {
  await expect.poll(async () => page.evaluate(() => {
    const w = window as any, rec = w.__glCanvas().rec, d = w.__toolData.migration, T = w.THREE;
    const bird = rec.scene.getObjectByName('migration-flock').children[Number(d.flightStudyBird) || 0], camera = rec.camera;
    const target = bird.getWorldPosition(new T.Vector3());
    const half = Math.min(camera.fov * Math.PI / 360, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
    const radius = bird.userData.studyRadius * 1.18 / Math.sin(half) / d.flightStudyZoom;
    const yaw = d.flightStudyYaw * Math.PI / 180, pitch = d.flightStudyPitch * Math.PI / 180;
    const desired = target.clone().add(new T.Vector3(Math.sin(yaw) * Math.cos(pitch) * radius, Math.sin(pitch) * radius, Math.cos(yaw) * Math.cos(pitch) * radius));
    return camera.position.distanceTo(desired);
  }), { timeout: 15_000, intervals: [50, 100, 200] }).toBeLessThan(1e-5);
}
async function capture(page: Page, name: string, locator = stage(page)) {
  await locator.scrollIntoViewIfNeeded(); const box = await locator.boundingBox();
  expect(box).not.toBeNull(); expect(box!.width).toBeGreaterThan(280); expect(box!.height).toBeGreaterThan(100);
  await locator.screenshot({ path: join(report, name + '.png') });
  return box;
}
async function accessibility(page: Page) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    const scan = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, errors: (window as any).__events.errors,
      violations: scan.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })) };
  });
  expect(result.violations).toEqual([]); expect(result.errors).toEqual([]); expect(failures.get(page)).toEqual([]); expect(result.scrollWidth).toBe(result.width); return result;
}
function compareBaseline(final: any, baseline: any) {
  expect(final.view).toEqual(baseline.view); expect(final.stage).toEqual(baseline.stage);
  for (const field of ['camera', 'projection', 'model'] as const) final[field].forEach((value: number, i: number) => expect(value).toBeCloseTo(baseline[field][i], 7));
  final.wings.forEach((values: number[], side: number) => values.forEach((value, i) => expect(value).toBeCloseTo(baseline.wings[side][i], 7)));
  for (let side = 0; side < 2; side++) {
    expect(final.inner[side].positions.slice(0, 12)).toEqual(baseline.inner[side].positions.slice(0, 12));
    expect(baseline.inner[side].positions.length).toBe(15); expect(baseline.inner[side].colors).toBeNull();
  }
}
test('Goose inner-wing relief keeps its rim, fitted views, marked pose and stable buffers', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page);
  const originalData = await data(page), oblique = await scene(page); expectBird(oblique); expectFitted(oblique);
  await capture(page, 'desktop-goose-inner-oblique');
  await activate(page, viewpoint(page, 'above'));
  const above = await scene(page); expectBird(above); expectFitted(above); expectSameResources(above, oblique);
  expect(above.model).toEqual(oblique.model); expect(above.joints).toEqual(oblique.joints); expect(above.view.phase).toBe(oblique.view.phase);
  await capture(page, 'desktop-goose-inner-above');
  const baselineFile = join(report, 'baseline-inner-wing-browser.json');
  const hasBaseline = existsSync(baselineFile);
  if (process.env.MIGRATION_EXPECT_BASELINE === '1') expect(hasBaseline, 'Run the explicit frozen baseline capture before required visual comparison').toBe(true);
  const baseline = hasBaseline ? JSON.parse(readFileSync(baselineFile, 'utf8')) : null;
  if (baseline) { compareBaseline(oblique, baseline.oblique); compareBaseline(above, baseline.above); }
  await activate(page, markedAction(page, 'mark')); const marked = await scene(page);
  expect(marked.marked.captured).toBe(true); expect(marked.marked.finite).toBe(true); expect(marked.marked.count).toBeGreaterThan(0);
  await activate(page, page.getByRole('button', { name: 'Cycle position 3 of 8', exact: true }));
  const changed = await scene(page); expect(changed.view.phase).not.toBe(marked.view.phase); expectSameResources(changed, oblique);
  await activate(page, markedAction(page, 'return')); const returned = await scene(page);
  expect(returned.view.phase).toBeCloseTo(marked.view.phase, 8); expect(returned.joints).toEqual(marked.joints); expectSameResources(returned, oblique);
  expect(learnerWork(await data(page))).toEqual(learnerWork(originalData));
  await writeFile(join(report, 'desktop-goose-inner-wing.json'), JSON.stringify({ sourceProof, baselineSha256: baseline?.sha256 || null,
    baselineComparison: baseline ? 'matched' : 'not-provided', oblique, above, marked, changed, returned, accessibility: await accessibility(page) }, null, 2));
});

function learningSeed() {
  const record = (speciesId: string, region: string, bird: number, note: string) => ({ speciesId, region, bird, note, yaw: -65, pitch: 30, zoom: 1.45, wingStep: 11, paused: false, motionReduced: false });
  const first = record('canada_goose', 'head', 4, 'Original Goose head observation.'), second = record('arctic_tern', 'tail', 1, 'Original Tern tail observation.');
  const firstKey = 'peregrine:primaries', secondKey = 'monarch:whole-wing';
  return { flightFormation: 'v', flightWind: 13, flightSeason: 'spring',
    flightStudyObservations: { drafts: { [firstKey]: 'My Peregrine observation draft.', [secondKey]: 'My Monarch observation draft.' },
      records: { 'canada_goose:head': first, 'arctic_tern:tail': second,
        [firstKey]: record('peregrine', 'primaries', 0, 'New Peregrine outer feather observation.'),
        [secondKey]: record('monarch', 'whole-wing', 0, 'New Monarch membrane observation.') },
      comparison: { firstKey, secondKey, draft: 'My own comparison draft, kept while I inspect both pairs.', feedback: '',
        saved: { firstKey: 'canada_goose:head', secondKey: 'arctic_tern:tail', first, second, claim: 'My historical Goose and Tern claim.' } } },
    flightInvestigation: { variable: 'wind', prediction: 'Keep my wind prediction.', evidence: 'Keep my wind evidence.', trials: [] },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep my challenge prediction.', notes: 'Keep my reasoning.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep my hypothesis.', explanation: 'Keep my explanation.', trials: [] }, aiExplorerText: 'Keep my research.' };
}
async function openDetails(page: Page, element: Locator, touch: boolean) {
  if (!(await element.evaluate(node => (node as HTMLDetailsElement).open))) await activate(page, element.locator(':scope > summary'), touch);
}
async function openComparison(page: Page, touch: boolean) {
  await openDetails(page, page.locator('[data-study-observation]'), touch);
  await openDetails(page, page.locator('[data-study-comparison]'), touch);
}
async function match(page: Page, panel: Locator, which: 'first' | 'second', angle: 'profile' | 'above', expected: any, touch: boolean) {
  const select = panel.getByRole('combobox', { name: 'Matched comparison view', exact: true });
  await select.selectOption(angle); await frames(page);
  await activate(page, panel.locator('[data-study-matched="' + which + '"]'), touch); await settled(page);
  const value = await data(page), rendered = await scene(page);
  expect(value).toMatchObject({ ...expected, flightCamera: 'study', flightPaused: true, flightStudyYaw: angle === 'above' ? 0 : 90,
    flightStudyPitch: angle === 'above' ? 60 : 10, flightStudyZoom: 1, flightWingStep: 0 });
  expect(rendered.view).toMatchObject({ species: expected.flightSpecies, yaw: angle === 'above' ? 0 : 90, pitch: angle === 'above' ? 60 : 10, zoom: 1, step: 0 });
  expect(rendered.selected).toBe(expected.flightStudyBird); expect(rendered.visible).toBe(1); expectFitted(rendered);
  expect(rendered.wings.length).toBe(2); await expect(stage(page)).toBeFocused(); return rendered;
}
async function learningFlow(page: Page, dark: boolean) {
  const touch = true, stem = dark ? 'mobile-dark-monarch' : 'mobile-light-peregrine';
  const original = await data(page), originalScene = await scene(page); await openComparison(page, touch);
  await expect(selected(page)).toHaveJSProperty('open', false);
  await expect(savedPanel(page)).toContainText('My historical Goose and Tern claim.');
  await claim(page).focus();
  await claim(page).evaluate(element => { const field = element as HTMLTextAreaElement; field.setSelectionRange(6, 24, 'backward'); (window as any).__round30Claim = field; });
  const beforeDisclosure = await writes(page);
  await openDetails(page, selected(page), touch);
  await expect(selected(page).locator('[data-study-selected-source-state="different"]')).toBeVisible();
  await expect(selected(page).locator('[data-study-matched-source="selected"]')).toBeVisible();
  expect(await writes(page)).toEqual(beforeDisclosure); expect(await data(page)).toEqual(original);
  expectSameResources(await scene(page), originalScene);
  const claimIdentity = async () => claim(page).evaluate(element => ({ same: element === (window as any).__round30Claim,
    start: (element as HTMLTextAreaElement).selectionStart, end: (element as HTMLTextAreaElement).selectionEnd, direction: (element as HTMLTextAreaElement).selectionDirection }));
  expect(await claimIdentity()).toEqual({ same: true, start: 6, end: 24, direction: 'backward' });
  const beforeAngle = await writes(page); await selected(page).getByRole('combobox', { name: 'Matched comparison view', exact: true }).selectOption('above'); await frames(page);
  expect(await writes(page)).toEqual(beforeAngle); expect(await data(page)).toEqual(original);
  await expect(savedPanel(page).getByRole('combobox', { name: 'Matched comparison view', exact: true })).toHaveValue('above');
  const targetSizes = await selected(page).locator('button').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { width: r.width, height: r.height }; }));
  for (const size of targetSizes) { expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44); }
  await capture(page, stem + '-selected-pair-activity', selected(page));
  const first = await match(page, selected(page), 'first', 'above', { flightSpecies: 'peregrine', flightStudyRegion: 'primaries', flightStudyBird: 0 }, touch);
  expectBird(first); expect(learnerWork(await data(page))).toEqual(learnerWork(original));
  if (!dark) await capture(page, stem + '-inner-wing-above');
  const second = await match(page, selected(page), 'second', 'above', { flightSpecies: 'monarch', flightStudyRegion: 'head', flightStudyBird: 0 }, touch);
  expectMonarch(second);
  if (dark) {
    expectMonarch(originalScene);
    const surfaces = (state: any) => state.membranes.map((mesh: any) => ({ name: mesh.name, positions: mesh.positions, normals: mesh.normals, colors: mesh.colors, indices: mesh.indices, style: mesh.style }));
    expect(surfaces(second)).toEqual(surfaces(originalScene));
  }
  expect((await data(page)).flightShowAnatomy).toBe(false);
  expect(learnerWork(await data(page))).toEqual(learnerWork(original));
  expect(await claimIdentity()).toEqual({ same: true, start: 6, end: 24, direction: 'backward' });
  if (dark) await capture(page, stem + '-membrane-above');
  const historical = await match(page, savedPanel(page), 'first', 'profile', { flightSpecies: 'canada_goose', flightStudyRegion: 'head', flightStudyBird: 4 }, touch);
  expectBird(historical); expect(learnerWork(await data(page))).toEqual(learnerWork(original));
  await expect(selected(page).getByRole('combobox', { name: 'Matched comparison view', exact: true })).toHaveValue('profile');
  const selectedAgain = await match(page, selected(page), 'second', 'profile', { flightSpecies: 'monarch', flightStudyRegion: 'head', flightStudyBird: 0 }, touch);
  expect(learnerWork(await data(page))).toEqual(learnerWork(original));
  const mutations = await writes(page);
  expect(mutations).toHaveLength(beforeDisclosure.length + 4);
  expect(mutations.every((write: any) => !Object.keys(write.patch).some(key => ['flightStudyObservations', 'flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText'].includes(key)))).toBe(true);
  await openComparison(page, touch); await claim(page).focus(); await expect(claim(page)).toHaveValue(original.flightStudyObservations.comparison.draft);
  expect(await claimIdentity()).toEqual({ same: true, start: 6, end: 24, direction: 'backward' });
  return { original, originalScene, first, second, historical, selectedAgain, targetSizes, mutations, claimIdentity: await claimIdentity(), accessibility: await accessibility(page) };
}
for (const dark of [false, true]) test.describe('Selected and historical matched pairs, ' + (dark ? 'dark Monarch phone' : 'light Peregrine phone'), () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Native disclosure and matched controls preserve both pairs, learner drafts and selection', async ({ page }) => {
    await mount(page, { species: dark ? 'monarch' : 'peregrine', region: dark ? 'whole-wing' : 'primaries', dark, extra: learningSeed() });
    const result = await learningFlow(page, dark);
    await writeFile(join(report, (dark ? 'mobile-dark-monarch' : 'mobile-light-peregrine') + '-selected-history.json'), JSON.stringify({ sourceProof, ...result }, null, 2));
  });
});
test('Motion-enabled native orbit and cycle preserve inner relief buffers and paused pose', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await mount(page, { reduced: false }); await settled(page);
  const originalData = await data(page), initial = await scene(page); expectBird(initial);
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(false);
  await stage(page).focus(); await page.keyboard.press('ArrowRight'); await frames(page); await settled(page);
  const orbited = await scene(page); expect(orbited.view.yaw).toBe(45); expect(orbited.camera).not.toEqual(initial.camera);
  expectSameResources(orbited, initial); expect(orbited.joints).toEqual(initial.joints); expect(orbited.model).toEqual(initial.model); expect(orbited.view.phase).toBe(initial.view.phase);
  await activate(page, viewpoint(page, 'above')); await settled(page); await activate(page, markedAction(page, 'mark'));
  const marked = await scene(page); await activate(page, page.getByRole('button', { name: 'Cycle position 3 of 8', exact: true }));
  const changed = await scene(page); expect(changed.view.phase).not.toBe(marked.view.phase); expectSameResources(changed, initial);
  await activate(page, markedAction(page, 'return')); const returned = await scene(page);
  expect(returned.view.phase).toBeCloseTo(marked.view.phase, 8); expect(returned.joints).toEqual(marked.joints); expectSameResources(returned, initial); expectBird(returned);
  expect(learnerWork(await data(page))).toEqual(learnerWork(originalData));
  await capture(page, 'desktop-motion-inner-wing-above');
  await writeFile(join(report, 'desktop-motion-inner-wing.json'), JSON.stringify({ sourceProof, initial, orbited, marked, changed, returned, accessibility: await accessibility(page) }, null, 2));
});
