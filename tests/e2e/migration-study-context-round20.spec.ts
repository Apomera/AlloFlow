import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 120_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round20-2026-10-20');
const axeSource = readFileSync(join(process.cwd(), 'node_modules/axe-core/axe.min.js'), 'utf8');
const harness = new GlHarness({
  toolFile: process.env.MIG_TOOL_FILE || 'stem_lab/stem_tool_migration.js', toolId: 'migration',
  width: 1100, height: 900, layout: 'document', appStyles: true,
  probes: `var viewport=document.createElement('meta');viewport.name='viewport';viewport.content='width=device-width,initial-scale=1';document.head.appendChild(viewport);document.querySelector('#wrap').style.width='min(100vw,1100px)';document.body.style.fontFamily='system-ui,sans-serif';document.body.style.background='#f8fafc';`
});
const failures = new WeakMap<Page, string[]>();
test.beforeAll(async () => { await mkdir(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([harness.destroy(page), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Round20 scene cleanup exceeded 20 seconds')), 20_000); })]);
  } finally { if (timer) clearTimeout(timer); }
});

async function frames(page: Page) {
  const before = await page.evaluate(() => (window as any).__glScene()?.renders || 0);
  await page.waitForFunction(before => ((window as any).__glScene()?.renders || 0) >= before + 2, before, { timeout: 15_000 });
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
  page.setDefaultTimeout(15_000);
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
function cycle(page: Page, index: number) {
  return page.getByRole('button', { name: 'Cycle position ' + (index + 1) + ' of 8', exact: true });
}
const currentContext = (page: Page) => page.locator("[data-migration-id=\"migration-study-current-context\"]");
const stage = (page: Page) => page.locator('.migration-flight-stage');
async function expectContext(page: Page, region: string, index: number | null, side = 'left') {
  const context = currentContext(page);
  await expect(context).toHaveAttribute('data-study-current-context', 'ready');
  await expect(context.locator('[data-study-context-region]')).toHaveAttribute('data-study-context-region', region);
  await expect(context.locator('[data-study-context-side]')).toHaveAttribute('data-study-context-side', side);
  if (index === null) {
    await expect(context.locator('[data-study-context-cycle]')).toHaveAttribute('data-study-context-cycle', 'none');
    await expect(context).toContainText('No numbered cycle position selected.');
    await expect(page.locator('[data-study-stage-cycle-position]')).toHaveCount(0);
  } else {
    await expect(context.locator('[data-study-context-cycle]')).toHaveAttribute('data-study-context-cycle', 'selected');
    await expect(context).toContainText('Cycle position ' + (index + 1) + ' of 8 selected.');
    await expect(page.locator('[data-study-stage-cycle-position]')).toHaveAttribute('data-study-stage-cycle-position', String(index));
    await expect(page.locator('[data-study-stage-cycle-position]')).toHaveText('Cycle ' + (index + 1) + '/8 selected');
  }
  await expect(context).toContainText('Record observation does not save the numbered cycle position or followed side');
}

// Read actual geometry vertices through the matrices Three.js renders. In-page
// reductions check every vertex without creating thousands of assertion steps.
async function cueAudit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, record = w.__glCanvas()?.rec, scene = record?.scene, camera = record?.camera, THREE = w.THREE;
    const root = scene?.getObjectByName('migration-wingtip-path'), flock = scene?.getObjectByName('migration-flock');
    if (!root || !flock || !camera || !record.canvas) throw new Error('Wingtip cue scene unavailable');
    scene.updateMatrixWorld(true);
    const rect = record.canvas.getBoundingClientRect(), data = w.__toolData.migration;
    const bird = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))];
    const curve = root.getObjectByName('migration-wingtip-cycle'), resources = new Set<string>();
    root.traverse((node: any) => {
      if (node.geometry) resources.add(node.geometry.uuid);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) resources.add(material.uuid);
    });
    const ids = w.__cue20Ids || (w.__cue20Ids = new WeakMap());
    const identity = (object: object) => { if (!ids.has(object)) ids.set(object, w.__cue20Next = (w.__cue20Next || 0) + 1); return ids.get(object); };
    const attributes = [curve.geometry.attributes.position, curve.geometry.attributes.color, curve.geometry.attributes.lineDistance];
    const baseline = w.__cue20Baseline || (w.__cue20Baseline = {
      root: root.uuid, positions: attributes[0].array.slice(), distances: attributes[2].array.slice()
    });
    const project = (point: any, matrix: any) => {
      const p = point.clone().applyMatrix4(matrix).project(camera);
      return { x: (p.x + 1) * rect.width / 2, y: (1 - p.y) * rect.height / 2, z: p.z };
    };
    const vertex = new THREE.Vector3(), origin = new THREE.Vector3(), matrix = new THREE.Matrix4(), composed = new THREE.Matrix4();
    let radiusError = 0, anchorError = 0, directionError = 0, dotCount = 0, ringCount = 0, directionCount = 0, outerVertices = 0, finite = true;
    const errors: Array<{ name: string; expected: number; maximum: number }> = [];
    function radius(mesh: any, transform: any, pixels: number, name: string, outerOnly: boolean) {
      const center = project(origin, transform), attribute = mesh.geometry.attributes.position;
      let maximum = 0;
      for (let index = 0; index < attribute.count; index++) {
        vertex.fromBufferAttribute(attribute, index);
        const localRadius = Math.hypot(vertex.x, vertex.y);
        if (outerOnly && localRadius < 0.99) continue;
        const p = project(vertex, transform), expected = pixels * localRadius;
        const error = Math.abs(Math.hypot(p.x - center.x, p.y - center.y) - expected);
        if (![p.x, p.y, p.z, error].every(Number.isFinite)) finite = false;
        maximum = Math.max(maximum, error); outerVertices++;
      }
      radiusError = Math.max(radiusError, maximum); errors.push({ name, expected: pixels, maximum });
    }
    function anchor(transform: any, expected: any) {
      const center = project(origin, transform), target = project(expected, root.matrixWorld);
      const error = Math.hypot(center.x - target.x, center.y - target.y);
      if (!Number.isFinite(error)) finite = false;
      anchorError = Math.max(anchorError, error);
    }
    const samples = 64, landmarkIndices = [0, 8, 16, 24, 32, 40, 48, 56];
    if (root.userData.sampleCount !== samples || root.userData.directionAheadSamples !== 2 ||
        JSON.stringify(root.userData.landmarkSampleIndices) !== JSON.stringify(landmarkIndices)) throw new Error('Unexpected cycle sampling contract');
    function sampleCurve(sideIndex: number, sample: number) {
      const wrapped = ((sample % samples) + samples) % samples, first = Math.floor(wrapped), blend = wrapped - first;
      const base = sideIndex * samples * 2;
      const a = new THREE.Vector3().fromBufferAttribute(attributes[0], base + first * 2);
      const b = new THREE.Vector3().fromBufferAttribute(attributes[0], base + ((first + 1) % samples) * 2);
      return a.lerp(b, blend);
    }
    for (const side of ['left', 'right']) {
      const sideIndex = side === 'left' ? 0 : 1;
      const dot = root.getObjectByName('migration-wingtip-' + side + '-point');
      if (dot.visible) {
        if (dot.geometry.type !== 'CircleGeometry') throw new Error('Tip dot must use one camera-facing circle');
        radius(dot, dot.matrixWorld, 6, side + ' current tip', true); dotCount++;
        // Derive the canonical outer tip from the selected bird, not from
        // the overlay's advertised source or chosen vertex.
        const source = root.userData.sources[sideIndex], node = bird.userData.primaries[sideIndex];
        if (!node || !node.geometry?.attributes.position) throw new Error('Selected bird primary geometry unavailable');
        const positions = node.geometry.attributes.position;
        let chosen = -1, maxX = -Infinity, maxZ = -Infinity;
        for (let index = 0; index < positions.count; index++) {
          const x = positions.getX(index), z = positions.getZ(index);
          if (Number.isFinite(x) && Number.isFinite(z) && (x > maxX || (x === maxX && z > maxZ))) {
            chosen = index; maxX = x; maxZ = z;
          }
        }
        if (chosen < 0 || !source || source.side !== sideIndex || source.nodeUuid !== node.uuid ||
            source.geometryUuid !== node.geometry.uuid || source.vertexIndex !== chosen) throw new Error('Wingtip source mismatch');
        const expected = new THREE.Vector3().fromBufferAttribute(positions, chosen).applyMatrix4(node.matrixWorld).applyMatrix4(new THREE.Matrix4().copy(root.matrixWorld).invert());
        anchor(dot.matrixWorld, expected);
      }
      const rings = root.getObjectByName('migration-wingtip-' + side + '-landmarks');
      if (rings.visible) for (let index = 0; index < rings.count; index++) {
        rings.getMatrixAt(index, matrix); composed.multiplyMatrices(rings.matrixWorld, matrix);
        radius(rings, composed, index === rings.userData.activeCheckpoint ? 8 : 3.2, side + ' checkpoint ' + index, true); ringCount++;
        anchor(composed, sampleCurve(sideIndex, landmarkIndices[index]));
      }
      const arrow = root.getObjectByName('migration-wingtip-' + side + '-direction');
      if (arrow.visible) {
        radius(arrow, arrow.matrixWorld, 8, side + ' direction', false); directionCount++;
        const ahead = bird.userData.lastRenderedWingPhase / (Math.PI * 2) * samples + 2;
        anchor(arrow.matrixWorld, sampleCurve(sideIndex, ahead));
        // Independently project two neighboring actual curve samples. The
        // expected tangent never uses the implementation's direction metadata.
        const before = project(sampleCurve(sideIndex, ahead - 0.5), root.matrixWorld);
        const after = project(sampleCurve(sideIndex, ahead + 0.5), root.matrixWorld);
        const dx = after.x - before.x, dy = after.y - before.y, expectedLength = Math.hypot(dx, dy);
        const center = project(origin, arrow.matrixWorld), axis = project(new THREE.Vector3(1, 0, 0), arrow.matrixWorld);
        const length = Math.hypot(axis.x - center.x, axis.y - center.y);
        directionError = Math.max(directionError, Math.abs((axis.x - center.x) / length - dx / expectedLength),
          Math.abs((axis.y - center.y) / length - dy / expectedLength));
      }
    }
    const badge = document.querySelector('.migration-flight-badge')?.getBoundingClientRect();
    const tools = document.querySelector('.migration-scene-tools')?.getBoundingClientRect();
    const overlaps = !!(badge && tools && badge.left < tools.right && badge.right > tools.left && badge.top < tools.bottom && badge.bottom > tools.top);
    return {
      visible: root.visible, available: root.userData.available, source: root.userData.sourceBirdUuid, bird: bird.uuid,
      follow: root.userData.followSide, selected: root.getObjectByName('migration-wingtip-left-landmarks').userData.activeCheckpoint,
      radiusError, anchorError, directionError, finite, dotCount, ringCount, directionCount, outerVertices, errors, badgeOverlapsTools: overlaps,
      pool: { resources: [...resources].sort(), buffers: attributes.map(attribute => [identity(attribute), identity(attribute.array)]), buildVersion: root.userData.buildVersion },
      curveUnchanged: baseline.root === root.uuid && baseline.positions.every((value: number, index: number) => value === attributes[0].array[index]) &&
        baseline.distances.every((value: number, index: number) => value === attributes[2].array[index]),
      pose: { phase: bird.userData.lastRenderedWingPhase, serial: Number(data.flightWingStep) || 0,
        cameraPosition: camera.position.toArray(), cameraQuaternion: camera.quaternion.toArray(),
        body: bird.matrixWorld.elements.slice(), joints: [...bird.userData.wings, ...bird.userData.wrists, ...bird.userData.primaries].map((node: any) => node.quaternion.toArray()) },
      canvas: { width: rect.width, height: rect.height }, browserErrors: w.__events.errors
    };
  });
}
function expectCues(audit: any, index: number) {
  expect({ visible: audit.visible, available: audit.available, source: audit.source, follow: audit.follow, selected: audit.selected, finite: audit.finite,
    dotCount: audit.dotCount, ringCount: audit.ringCount, curveUnchanged: audit.curveUnchanged, badgeOverlapsTools: audit.badgeOverlapsTools, errors: audit.browserErrors })
    .toEqual({ visible: true, available: true, source: audit.bird, follow: 0, selected: index, finite: true,
      dotCount: 1, ringCount: 8, curveUnchanged: true, badgeOverlapsTools: false, errors: [] });
  expect(audit.radiusError, 'Actual projected dot, ring and direction vertices retain their intended CSS radii').toBeLessThan(0.02);
  expect(audit.anchorError, 'Each rendered cue remains attached to its real wingtip or sampled path anchor').toBeLessThan(0.02);
  expect(audit.directionError, 'The rendered chevron follows its projected direction').toBeLessThan(0.0001);
  expect(audit.outerVertices).toBeGreaterThan(100);
  expect(audit.pool.resources).toHaveLength(7);
}
async function checkTarget(locator: Locator) {
  const box = await locator.evaluate(element => { const r = element.getBoundingClientRect(); return { width: r.width, height: r.height }; });
  expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
}

test('Study context follows current viewing choices while projected wingtip cues retain size through native keyboard views and zoom', async ({ page }) => {
  await mount(page);
  await activate(page, page.getByRole('button', { name: 'Individual’s left: solid path', exact: true }));
  await activate(page, cycle(page, 2));
  const initial = await saved(page), first = await cueAudit(page); expectCues(first, 2);
  await activate(page, page.getByRole('button', { name: 'Front', exact: true }));
  const zoom = page.getByRole('slider', { name: 'Study zoom percent', exact: true });
  await zoom.press('End'); await frames(page);
  const magnified = await cueAudit(page); expectCues(magnified, 2); expect(magnified.pool).toEqual(first.pool);
  await activate(page, page.getByRole('button', { name: 'From above', exact: true }));
  await zoom.press('Home');
  for (let step = 0; step < 7; step++) await zoom.press('ArrowRight');
  await frames(page);
  const above = await cueAudit(page); expectCues(above, 2); expect(above.pool).toEqual(first.pool);
  expect(first.directionCount + magnified.directionCount + above.directionCount).toBeGreaterThan(0);
  expect(above.pose.phase).toBe(first.pose.phase); expect(above.pose.serial).toBe(13); expect(above.pose.body).toEqual(first.pose.body);
  await stage(page).screenshot({ path: join(report, 'desktop-study-context-stage.png') });
  const describe = page.getByRole('button', { name: 'Describe this wing segment', exact: true }); await checkTarget(describe); await activate(page, describe);
  const note = page.getByRole('textbox', { name: 'My observation', exact: true });
  await expect(note).toBeFocused(); await expect(note).toHaveValue(initial.flightStudyObservations.drafts['canada_goose:inner-wing']);
  await expectContext(page, 'inner-wing', 2); expect(work(await saved(page))).toEqual(work(initial));
  await page.locator('[data-study-observation]').screenshot({ path: join(report, 'desktop-study-context-notes.png') });
  await activate(page, page.getByRole('button', { name: 'Step wingbeat', exact: true }));
  await expectContext(page, 'inner-wing', null); expect(work(await saved(page))).toEqual(work(initial));
  expect(failures.get(page)).toEqual([]);
  await writeFile(join(report, 'desktop-study-context.json'), JSON.stringify({ first, magnified, above, current: await saved(page) }, null, 2));
});

for (const dark of [false, true]) test.describe('Migration current study context phone ' + (dark ? 'dark' : 'light') + ' round20', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Current cycle and anatomical side remain visible beside learner notes with readable fixed-size cues and explicit evidence recording', async ({ page }) => {
    const stem = 'mobile-' + (dark ? 'dark' : 'light') + '-study-context';
    await mount(page, dark);
    await activate(page, page.getByRole('button', { name: 'Individual’s left: solid path', exact: true }), true);
    const region = dark ? 'primaries' : 'inner-wing';
    await activate(page, page.locator('[data-study-region="' + region + '"]'), true);
    await activate(page, cycle(page, 2), true);
    const original = await saved(page), position3 = await cueAudit(page); expectCues(position3, 2);
    await activate(page, cycle(page, 6), true);
    const position7 = await cueAudit(page); expectCues(position7, 6);
    expect(position7.pool).toEqual(position3.pool); expect(position7.pose.cameraPosition).toEqual(position3.pose.cameraPosition);
    expect(position7.pose.cameraQuaternion).toEqual(position3.pose.cameraQuaternion); expect(position7.pose.body).toEqual(position3.pose.body);
    expect(position7.pose.serial).toBe(13); expect(position7.pose.phase).not.toBe(position3.pose.phase);
    await stage(page).screenshot({ path: join(report, stem + '-stage.png') });
    const describe = page.getByRole('button', { name: 'Describe this wing segment', exact: true }); await checkTarget(describe);
    await activate(page, describe, true);
    const note = page.getByRole('textbox', { name: 'My observation', exact: true });
    await expect(note).toBeFocused(); await expect(note).toHaveValue(original.flightStudyObservations.drafts['canada_goose:' + region]);
    await expectContext(page, region, 6); await expect(currentContext(page)).toContainText('Followed wingtip: individual’s left.');
    expect(work(await saved(page))).toEqual(work(original));
    const beforeWriting = await cueAudit(page); expect(beforeWriting.pose).toEqual(position7.pose); expect(beforeWriting.pool).toEqual(position7.pool);
    const evidence = 'I followed the individual’s left wing and compared cycle positions 3 and 7 with the camera fixed. I can describe what changed in the selected segment.';
    await note.fill(evidence); await page.getByRole('button', { name: 'Record observation', exact: true }).tap();
    const recorded = await saved(page), record = recorded.flightStudyObservations.records['canada_goose:' + region];
    expect(record.note).toBe(evidence); expect(record.wingStep).toBe(13);
    for (const key of ['cyclePosition', 'followedSide', 'followSide', 'flightStudyCyclePosition', 'flightWingtipFollowSide']) expect(record).not.toHaveProperty(key);
    for (const other of ['head', 'inner-wing', 'primaries'].filter(id => id !== region)) expect(recorded.flightStudyObservations.drafts['canada_goose:' + other]).toBe(original.flightStudyObservations.drafts['canada_goose:' + other]);
    for (const key of ['flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']) expect(recorded[key]).toEqual(original[key]);
    await expectContext(page, region, 6);
    await page.addScriptTag({ content: axeSource });
    const accessibility = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, violations: result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })), errors: (window as any).__events.errors };
    });
    expect(accessibility).toEqual({ width: 390, scrollWidth: 390, violations: [], errors: [] }); expect(failures.get(page)).toEqual([]);
    await page.locator('[data-study-observation]').screenshot({ path: join(report, stem + '-notes.png') });
    await writeFile(join(report, stem + '.json'), JSON.stringify({ position3, position7, beforeWriting, recorded, accessibility }, null, 2));
  });
});
