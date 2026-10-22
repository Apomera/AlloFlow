import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 120_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round21-2026-10-21');
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
    await Promise.race([harness.destroy(page), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Round21 scene cleanup exceeded 20 seconds')), 20_000); })]);
  } finally { if (timer) clearTimeout(timer); }
});

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
async function mount(page: Page, dark = false) {
  page.setDefaultTimeout(20_000);
  page.setDefaultNavigationTimeout(30_000);
  const errors: string[] = []; failures.set(page, errors);
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('crash', () => errors.push('Browser page crashed'));
  page.on('console', message => { if (message.type() === 'error' && /WebGL|shader|context lost|THREE\.WebGLRenderer/i.test(message.text())) errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { migration: { tab: 'flight3d', flightCamera: 'study', flightPaused: true,
    flightSpecies: 'canada_goose', flightShowWingtipPath: true, flightShowAnatomy: true,
    flightStudyRegion: 'inner-wing', flightStudyObservationOpen: false, flightWingStep: 13,
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
  const contexts = await harness.glContexts(page);
  expect(contexts.some(context => context.createdBy === 'page' && context.type === 'webgl2' && !context.lost && context.draws > 0)).toBe(true);
}



function work(data: any) {
  return Object.fromEntries(['flightStudyObservations', 'flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText'].map(key => [key, data[key]]));
}
const cycle = (page: Page, index: number) => page.getByRole('button', { name: 'Cycle position ' + (index + 1) + ' of 8', exact: true });
const opposite = (page: Page) => page.locator('[data-study-cycle-action="opposite"]');
const stage = (page: Page) => page.locator('.migration-flight-stage');
async function selectedPosition(page: Page, index: number) {
  await expect(cycle(page, index)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-study-stage-cycle-position]')).toHaveAttribute('data-study-stage-cycle-position', String(index));
  await expect(page.locator('#migration-study-current-context')).toContainText('Cycle position ' + (index + 1) + ' of 8 selected.');
}
async function checked(page: Page, kind: string, touch = false) {
  const before = await saved(page);
  await activate(page, page.getByRole('button', { name: 'Check what changed', exact: true }), touch);
  await expect(page.locator('[data-marked-comparison-check="true"]')).toHaveAttribute('data-marked-comparison-status', 'checked');
  await expect(page.locator('[data-marked-comparison-check="true"]')).toHaveAttribute('data-marked-comparison-kind', kind);
  expect(await saved(page)).toEqual(before);
}

// Project the disk vertices and the maximum selected focus-ring footprint
// through the actual matrices drawn by Three.js. The expected CSS radii and
// minimum center margins are constants, independent of renderer metadata.
async function anatomyAudit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, record = w.__glCanvas()?.rec, scene = record?.scene, camera = record?.camera, THREE = w.THREE;
    const markers = scene?.getObjectByName('migration-anatomy-markers'), lines = scene?.getObjectByName('migration-anatomy-callouts');
    const flock = scene?.getObjectByName('migration-flock'), data = w.__toolData.migration;
    if (!markers || !lines || !flock || !camera || !record.canvas) throw new Error('Anatomy scene unavailable');
    scene.updateMatrixWorld(true);
    const rect = record.canvas.getBoundingClientRect(), width = rect.width, height = rect.height;
    const bird = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))];
    const side = markers.userData.anatomySide, selected = data.flightStudyRegion;
    const ids = ['head', 'inner-wing', 'primaries', 'tail'], lengths = [144, 24, 30, 24];
    const geometry = lines.geometry.attributes.position, color = lines.geometry.attributes.color;
    const project = (point: any, transform: any) => {
      const p = point.clone().applyMatrix4(transform).project(camera);
      return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2, z: p.z };
    };
    const origin = new THREE.Vector3(), point = new THREE.Vector3();
    const head = bird.getObjectByName('migration-bird-head');
    if (!head || ![0, 1].includes(side)) throw new Error('A ready bird anatomy source is required');
    // This browser matrix uses Canada Goose. Derive expected leader starts
    // from its actual articulated nodes, without trusting advertised anchors.
    const expectedAnchors = [
      new THREE.Vector3(0, 0.24, 0).applyMatrix4(head.matrixWorld),
      new THREE.Vector3((side === 0 ? -1 : 1) * 1.38 * 0.27, 0.10, 0).applyMatrix4(bird.userData.wings[side].matrixWorld),
      new THREE.Vector3(1.38 * 0.39, 0.10, 0.86 * 0.32).applyMatrix4(bird.userData.primaries[side].matrixWorld),
      new THREE.Vector3(0, 0.10, 0.98).applyMatrix4(bird.matrixWorld)
    ];
    const hud = ['.migration-scene-tools', '.migration-flight-route', '.migration-flight-badge'].map(selector => {
      const r = document.querySelector(selector)?.getBoundingClientRect();
      if (!r) throw new Error('Missing scene HUD: ' + selector);
      return { selector, left: r.left - rect.left, top: r.top - rect.top, right: r.right - rect.left, bottom: r.bottom - rect.top };
    });
    const resources = new Set<string>();
    for (const owner of [markers, lines]) owner.traverse((node: any) => {
      if (node.geometry) resources.add(node.geometry.uuid);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) resources.add(material.uuid);
    });
    const identityMap = w.__anatomy21Ids || (w.__anatomy21Ids = new WeakMap());
    const identity = (object: object) => { if (!identityMap.has(object)) identityMap.set(object, w.__anatomy21Next = (w.__anatomy21Next || 0) + 1); return identityMap.get(object); };
    let radiusError = 0, orientationError = 0, leaderError = 0, finite = true, marginError = 0, minimumHudClearance = Infinity, offset = 0;
    const positions: any[] = [], footprints: any[] = [];
    for (let index = 0; index < markers.children.length; index++) {
      const marker = markers.children[index], disk = marker.children[0], focus = marker.children[3], center = project(origin, disk.matrixWorld);
      const focused = ids[index] === selected, factor = focused ? 1.08 : 1, targetRadius = 13 * factor;
      if (marker.userData.anatomyId !== ids[index] || marker.userData.markerNumber !== index + 1 ||
          marker.userData.focused !== focused || focus.visible !== focused) throw new Error('Anatomy marker identity or focus differs');
      const diskVertices = disk.geometry.attributes.position;
      for (let vertex = 0; vertex < diskVertices.count; vertex++) {
        point.fromBufferAttribute(diskVertices, vertex);
        if (Math.hypot(point.x, point.y) < 0.99) continue;
        const p = project(point, disk.matrixWorld), expectedRadius = targetRadius * Math.hypot(point.x, point.y);
        const error = Math.abs(Math.hypot(p.x - center.x, p.y - center.y) - expectedRadius);
        finite = finite && [p.x, p.y, p.z, error].every(Number.isFinite);
        radiusError = Math.max(radiusError, error);
      }
      const xAxis = project(new THREE.Vector3(1, 0, 0), disk.matrixWorld), yAxis = project(new THREE.Vector3(0, 1, 0), disk.matrixWorld);
      const xLength = Math.hypot(xAxis.x - center.x, xAxis.y - center.y), yLength = Math.hypot(yAxis.x - center.x, yAxis.y - center.y);
      orientationError = Math.max(orientationError, Math.abs((xAxis.x - center.x) / xLength - 1), Math.abs((xAxis.y - center.y) / xLength),
        Math.abs((yAxis.x - center.x) / yLength), Math.abs((yAxis.y - center.y) / yLength + 1));
      marginError = Math.max(marginError, 28 - center.x, center.x - (width - 28), 128 - center.y, center.y - (height - 88));
      const footprint = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
      const focusVertices = focus.geometry.attributes.position;
      for (let vertex = 0; vertex < focusVertices.count; vertex++) {
        point.fromBufferAttribute(focusVertices, vertex);
        // Reserve the same maximum footprint for every region. Selecting a
        // different marker must not move the labels or their leader lines.
        point.multiplyScalar(1.08 / factor);
        const p = project(point, focus.matrixWorld);
        footprint.left = Math.min(footprint.left, p.x); footprint.right = Math.max(footprint.right, p.x);
        footprint.top = Math.min(footprint.top, p.y); footprint.bottom = Math.max(footprint.bottom, p.y);
      }
      for (const obstacle of hud) {
        const dx = Math.max(0, obstacle.left - footprint.right, footprint.left - obstacle.right);
        const dy = Math.max(0, obstacle.top - footprint.bottom, footprint.top - obstacle.bottom);
        minimumHudClearance = Math.min(minimumHudClearance, Math.hypot(dx, dy));
      }
      const leader = offset + lengths[index], actualStart = new THREE.Vector3().fromArray(geometry.array, leader).applyMatrix4(lines.matrixWorld);
      const firstElbow = new THREE.Vector3().fromArray(geometry.array, leader + 3).applyMatrix4(lines.matrixWorld);
      const secondElbow = new THREE.Vector3().fromArray(geometry.array, leader + 6).applyMatrix4(lines.matrixWorld);
      const actualEnd = new THREE.Vector3().fromArray(geometry.array, leader + 9).applyMatrix4(lines.matrixWorld);
      const expectedEnd = new THREE.Vector3().setFromMatrixPosition(marker.matrixWorld);
      leaderError = Math.max(leaderError, actualStart.distanceTo(expectedAnchors[index]), firstElbow.distanceTo(secondElbow), actualEnd.distanceTo(expectedEnd));
      offset = leader + 12;
      positions.push({ number: index + 1, id: ids[index], x: center.x, y: center.y, clientX: rect.left + center.x, clientY: rect.top + center.y });
      footprints.push({ number: index + 1, ...footprint });
    }
    const marked = scene.getObjectByName('migration-marked-wing-pose');
    const markedCount = marked.geometry.drawRange.count;
    return {
      visible: markers.visible && lines.visible, source: lines.userData.sourceBirdUuid, markerSource: markers.userData.sourceBirdUuid, bird: bird.uuid,
      side, selected: lines.userData.selectedAnatomyId, finite, radiusError, orientationError, leaderError, marginError, minimumHudClearance,
      positions, footprints, hud, count: lines.geometry.drawRange.count, expectedCount: offset / 3,
      pool: { resources: [...resources].sort(), buffers: [geometry, color].map(attribute => [identity(attribute), identity(attribute.array)]),
        bytes: geometry.array.byteLength + color.array.byteLength },
      pose: { phase: bird.userData.lastRenderedWingPhase, serial: Number(data.flightWingStep) || 0, body: bird.matrixWorld.elements.slice(),
        cameraPosition: camera.position.toArray(), cameraQuaternion: camera.quaternion.toArray(),
        joints: [...bird.userData.wings, ...bird.userData.wrists, ...bird.userData.primaries].map((node: any) => node.quaternion.toArray()) },
      marked: { visible: marked.visible, captured: marked.userData.captured, source: marked.userData.sourceBirdUuid, phase: marked.userData.capturedPhase,
        version: marked.userData.captureVersion, positions: Array.from(marked.geometry.attributes.position.array.slice(0, markedCount * 3)),
        count: markedCount, matrix: marked.matrixWorld.elements.slice() },
      browserErrors: w.__events.errors, canvas: { width, height }
    };
  });
}
function expectAnatomy(audit: any, region: string) {
  expect({ visible: audit.visible, source: audit.source, markerSource: audit.markerSource, side: audit.side, selected: audit.selected, finite: audit.finite, errors: audit.browserErrors })
    .toEqual({ visible: true, source: audit.bird, markerSource: audit.bird, side: 0, selected: region, finite: true, errors: [] });
  expect(audit.radiusError, 'Actual disk vertices keep a13px radius, selected×1.08').toBeLessThan(0.02);
  expect(audit.orientationError, 'Number disks remain camera-facing in actual projected geometry').toBeLessThan(0.0001);
  expect(audit.marginError, 'Marker centers retain28/128/88px minimum scene margins').toBeLessThan(0.02);
  expect(audit.minimumHudClearance, 'Maximum selected focus-ring footprints clear actual scene HUD rectangles').toBeGreaterThanOrEqual(2);
  expect(audit.leaderError, 'Both leader segments join each actual anatomical anchor to its rendered label').toBeLessThan(0.000002);
  expect(audit.count).toBe(audit.expectedCount); expect(audit.pool.resources).toHaveLength(15); expect(audit.pool.bytes).toBe(4608);
  expect(audit.positions[0].x).toBeLessThan(audit.positions[1].x); expect(audit.positions[3].x).toBeLessThan(audit.positions[2].x);
  expect(audit.positions[0].y).toBeLessThan(audit.positions[3].y); expect(audit.positions[1].y).toBeLessThan(audit.positions[2].y);
}
function expectFixedExperiment(audit: any, reference: any) {
  expect(audit.pool).toEqual(reference.pool); expect(audit.marked).toEqual(reference.marked);
  expect(audit.pose.serial).toBe(13); expect(audit.pose.body).toEqual(reference.pose.body);
  expect(audit.pose.cameraPosition).toEqual(reference.pose.cameraPosition); expect(audit.pose.cameraQuaternion).toEqual(reference.pose.cameraQuaternion);
}
async function checkTarget(locator: Locator) {
  const box = await locator.evaluate(element => { const r = element.getBoundingClientRect(); return { width: r.width, height: r.height }; });
  expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
}
async function resetZoom(page: Page) {
  const zoom = page.getByRole('slider', { name: 'Study zoom percent', exact: true });
  await zoom.press('Home');
  for (let step = 0; step < 7; step++) await zoom.press('ArrowRight');
  await frames(page);
}
async function oppositeComparison(page: Page, touch = false) {
  await expect(opposite(page)).toBeDisabled();
  await activate(page, page.getByRole('button', { name: 'Follow individual’s left wingtip', exact: true }), touch);
  await activate(page, cycle(page, 2), touch); await selectedPosition(page, 2);
  await expect(opposite(page)).toBeEnabled(); await checkTarget(opposite(page));
  await activate(page, page.getByRole('button', { name: 'Mark wing pose', exact: true }), touch);
  const original = await saved(page), marked3 = await anatomyAudit(page); expectAnatomy(marked3, original.flightStudyRegion);
  expect(marked3.marked.visible).toBe(true); expect(marked3.marked.captured).toBe(true); expect(marked3.marked.count).toBeGreaterThan(0);
  await activate(page, opposite(page), touch); await selectedPosition(page, 6);
  const opposite7 = await anatomyAudit(page); expectAnatomy(opposite7, original.flightStudyRegion); expectFixedExperiment(opposite7, marked3);
  expect(opposite7.pose.phase).not.toBe(marked3.pose.phase); expect(opposite7.pose.joints).not.toEqual(marked3.pose.joints);
  expect(await saved(page)).toEqual(original); await checked(page, 'wing-only', touch);
  await activate(page, opposite(page), touch); await selectedPosition(page, 2);
  const returned3 = await anatomyAudit(page); expectAnatomy(returned3, original.flightStudyRegion); expectFixedExperiment(returned3, marked3);
  expect(returned3.pose.phase).toBe(marked3.pose.phase); expect(returned3.pose.joints).toEqual(marked3.pose.joints);
  expect(await saved(page)).toEqual(original); await checked(page, 'same', touch);
  return { original, marked3, opposite7, returned3 };
}

test('Opposite cycle comparison preserves one fixed experiment while anatomy labels keep projected size and clear the scene HUD', async ({ page }) => {
  await mount(page);
  const flow = await oppositeComparison(page);
  await page.locator('[data-study-cycle-controls]').screenshot({ path: join(report, 'desktop-opposite-cycle-controls.png') });
  await activate(page, page.getByRole('button', { name: 'Front', exact: true }));
  const zoom = page.getByRole('slider', { name: 'Study zoom percent', exact: true }); await zoom.press('End'); await frames(page);
  const maximumZoom = await anatomyAudit(page);
  await writeFile(join(report, 'desktop-maximum-zoom-diagnostic.json'), JSON.stringify(maximumZoom, null, 2));
  await stage(page).screenshot({ path: join(report, 'desktop-maximum-zoom-diagnostic.png') });
  expectAnatomy(maximumZoom, 'inner-wing'); expect(maximumZoom.pool).toEqual(flow.marked3.pool);
  await activate(page, page.getByRole('button', { name: 'From above', exact: true })); await resetZoom(page);
  const above = await anatomyAudit(page); expectAnatomy(above, 'inner-wing'); expect(above.pool).toEqual(flow.marked3.pool); expect(above.marked).toEqual(flow.marked3.marked);
  await stage(page).scrollIntoViewIfNeeded(); await frames(page);
  const pick = await anatomyAudit(page), target = pick.positions.find((position: any) => position.id === 'inner-wing');
  await page.mouse.click(target.clientX, target.clientY); await frames(page);
  await expect(page.locator('[data-study-region="inner-wing"]')).toHaveAttribute('aria-pressed', 'true');
  const picked = await anatomyAudit(page); expectAnatomy(picked, 'inner-wing'); expect(picked.pose).toEqual(pick.pose); expect(picked.marked).toEqual(pick.marked);
  await stage(page).screenshot({ path: join(report, 'desktop-opposite-cycle-stage.png') });
  await activate(page, page.getByRole('button', { name: 'Describe this wing segment', exact: true }));
  const note = page.getByRole('textbox', { name: 'Shape and motion observation', exact: true });
  await expect(note).toBeFocused(); await expect(note).toHaveValue(flow.original.flightStudyObservations.drafts['canada_goose:inner-wing']);
  expect(work(await saved(page))).toEqual(work(flow.original));
  await page.locator('[data-study-observation]').screenshot({ path: join(report, 'desktop-opposite-cycle-notes.png') });
  await expect(opposite(page)).toBeEnabled(); expect((await saved(page)).flightWingStep).toBe(13);
  expect(work(await saved(page))).toEqual(work(flow.original)); expect(failures.get(page)).toEqual([]);
  await writeFile(join(report, 'desktop-opposite-cycle.json'), JSON.stringify({ ...flow, maximumZoom, above, picked, current: await saved(page) }, null, 2));
});

for (const dark of [false, true]) test.describe('Migration opposite cycle phone ' + (dark ? 'dark' : 'light') + ' round21', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch learners predict compare and record their own opposite-position evidence with readable anatomy cues', async ({ page }) => {
    const stem = 'mobile-' + (dark ? 'dark' : 'light') + '-opposite-cycle';
    await mount(page, dark);
    const region = dark ? 'primaries' : 'inner-wing';
    await activate(page, page.locator('[data-study-region="' + region + '"]'), true);
    const flow = await oppositeComparison(page, true);
    const zoom = page.getByRole('slider', { name: 'Study zoom percent', exact: true }); await zoom.press('End'); await frames(page);
    const maximumZoom = await anatomyAudit(page); expectAnatomy(maximumZoom, region); expect(maximumZoom.pool).toEqual(flow.marked3.pool);
    await resetZoom(page); await stage(page).scrollIntoViewIfNeeded(); await frames(page);
    const pick = await anatomyAudit(page); expectAnatomy(pick, region);
    const target = pick.positions.find((position: any) => position.id === region);
    await page.touchscreen.tap(target.clientX, target.clientY); await frames(page);
    await expect(page.locator('[data-study-region="' + region + '"]')).toHaveAttribute('aria-pressed', 'true');
    const picked = await anatomyAudit(page); expectAnatomy(picked, region); expect(picked.pose).toEqual(pick.pose); expect(picked.marked).toEqual(pick.marked);
    await stage(page).screenshot({ path: join(report, stem + '-stage.png') });
    const describe = page.getByRole('button', { name: 'Describe this wing segment', exact: true }); await checkTarget(describe); await activate(page, describe, true);
    const note = page.getByRole('textbox', { name: 'Shape and motion observation', exact: true });
    await expect(note).toBeFocused(); await expect(note).toHaveValue(flow.original.flightStudyObservations.drafts['canada_goose:' + region]);
    await selectedPosition(page, 2); expect(work(await saved(page))).toEqual(work(flow.original));
    const evidence = 'I predicted a change, marked cycle position 3, and compared position 7 with the view fixed. I followed the individual’s left wing and can describe the visible difference against the dashed outline.';
    await note.fill(evidence); await page.getByRole('button', { name: 'Record observation', exact: true }).tap();
    const recorded = await saved(page), record = recorded.flightStudyObservations.records['canada_goose:' + region];
    expect(record.note).toBe(evidence); expect(record.wingStep).toBe(13);
    for (const key of ['cyclePosition', 'oppositePosition', 'followedSide', 'followSide', 'flightStudyCyclePosition', 'flightWingtipFollowSide']) expect(record).not.toHaveProperty(key);
    for (const other of ['head', 'inner-wing', 'primaries'].filter(id => id !== region)) expect(recorded.flightStudyObservations.drafts['canada_goose:' + other]).toBe(flow.original.flightStudyObservations.drafts['canada_goose:' + other]);
    for (const key of ['flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']) expect(recorded[key]).toEqual(flow.original[key]);
    await page.addScriptTag({ content: axeSource });
    const accessibility = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, violations: result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })), errors: (window as any).__events.errors };
    });
    expect(accessibility).toEqual({ width: 390, scrollWidth: 390, violations: [], errors: [] }); expect(failures.get(page)).toEqual([]);
    await page.locator('[data-study-observation]').screenshot({ path: join(report, stem + '-notes.png') });
    await writeFile(join(report, stem + '.json'), JSON.stringify({ ...flow, maximumZoom, picked, recorded, accessibility }, null, 2));
  });
});
