import { test, expect, type Page, type Locator } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ retries: 0, timeout: 90_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round19-2026-10-20');
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
    await Promise.race([harness.destroy(page), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Round19 scene cleanup exceeded 20 seconds')), 20_000); })]);
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

// All per-component arithmetic runs in the page. Assertions compare independent
// world transforms, complete color buffers and stable resource identities in one RPC.
async function anatomyAudit(page: Page) {
  return page.evaluate(() => {
    const w = window as any, record = w.__glCanvas()?.rec, scene = record?.scene, camera = record?.camera, THREE = w.THREE;
    const overlay = scene?.getObjectByName('migration-anatomy-callouts'), markers = scene?.getObjectByName('migration-anatomy-markers');
    const flock = scene?.getObjectByName('migration-flock'), data = w.__toolData.migration;
    if (!overlay || !markers || !flock || !camera) throw new Error('Anatomy scene unavailable');
    scene.updateMatrixWorld(true);
    const bird = flock.children[Math.max(0, Math.min(flock.children.length - 1, Number(data.flightStudyBird) || 0))];
    const side = overlay.userData.anatomySide, anchors = bird.userData.anatomyAnchorsBySide[side];
    const position = overlay.geometry.attributes.position, color = overlay.geometry.attributes.color;
    const dark = w.__ctx.isDark === true || w.__ctx.theme === 'dark';
    const palette = dark ? [0xfbbf24, 0x67e8f9, 0x86efac, 0xf9a8d4] : [0x78350f, 0x164e63, 0x14532d, 0x831843];
    const background = dark ? 0x18344a : 0xe2e8f0, ids = ['head', 'inner-wing', 'primaries', 'tail'];
    const focused = ids.includes(data.flightStudyRegion) ? data.flightStudyRegion : '';
    let coordinateError = 0, colorError = 0, offset = 0, wrongSource = 0;
    const componentError = (actual: number, expected: number) => Number.isFinite(actual) && Number.isFinite(expected) ? Math.abs(actual - expected) : Infinity;
    anchors.forEach((anchor: any, index: number) => {
      const expectedNode = index === 1 ? bird.userData.wings[side] : index === 2 ? bird.userData.primaries[side] : bird;
      if (anchor.node !== expectedNode || anchor.id !== ids[index]) wrongSource++;
      for (let coordinate = 0; coordinate < anchor.outline.length; coordinate += 3) {
        const point = new THREE.Vector3().fromArray(anchor.outline, coordinate).applyMatrix4(expectedNode.matrixWorld);
        [point.x, point.y, point.z].forEach((value, axis) => { coordinateError = Math.max(coordinateError, componentError(position.array[offset + coordinate + axis], value)); });
      }
      const leader = anchor.point.clone().applyMatrix4(expectedNode.matrixWorld), leaderOffset = offset + anchor.outline.length;
      [leader.x, leader.y, leader.z].forEach((value, axis) => { coordinateError = Math.max(coordinateError, componentError(position.array[leaderOffset + axis], value)); });
      [markers.children[index].position.x, markers.children[index].position.y, markers.children[index].position.z].forEach((value, axis) => {
        coordinateError = Math.max(coordinateError, componentError(position.array[leaderOffset + 9 + axis], value));
      });
      const base = palette[index];
      const rgb = [16, 8, 0].map(shift => {
        const value = (base >> shift) & 255;
        return (focused && focused !== ids[index] ? Math.round(value * 0.6 + ((background >> shift) & 255) * 0.4) : value) / 255;
      });
      const end = leaderOffset + 12;
      for (let coordinate = offset; coordinate < end; coordinate++) colorError = Math.max(colorError, componentError(color.array[coordinate], rgb[(coordinate - offset) % 3]));
      offset = end;
    });
    const identities = w.__segment19Ids || (w.__segment19Ids = new WeakMap());
    const identity = (object: object) => { if (!identities.has(object)) identities.set(object, w.__segment19Next = (w.__segment19Next || 0) + 1); return identities.get(object); };
    const resources = new Set<string>();
    for (const owner of [overlay, markers]) owner.traverse((node: any) => {
      if (node.geometry) resources.add(node.geometry.uuid);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material) resources.add(material.uuid);
    });
    return {
      visible: overlay.visible && markers.visible, side, source: overlay.userData.sourceBirdUuid, bird: bird.uuid,
      selected: overlay.userData.selectedAnatomyId, markerSelected: markers.userData.selectedAnatomyId,
      coordinateError, colorError, wrongSource, expectedCount: offset / 3, count: overlay.geometry.drawRange.count,
      focused: markers.children.filter((marker: any) => marker.userData.focused && marker.children[3].visible).map((marker: any) => marker.userData.anatomyId),
      markerColors: markers.children.map((marker: any) => marker.children[0].material.color.getHex()),
      pool: { resources: [...resources].sort(), geometry: overlay.geometry.uuid, material: overlay.material.uuid,
        buffers: [position, color].map(attribute => [identity(attribute), identity(attribute.array)]), bytes: position.array.byteLength + color.array.byteLength },
      positions: Array.from(position.array.slice(0, offset)),
      pose: { phase: bird.userData.lastRenderedWingPhase, serial: Number(data.flightWingStep) || 0,
        cameraPosition: camera.position.toArray(), cameraQuaternion: camera.quaternion.toArray(),
        birdMatrix: bird.matrixWorld.elements.slice(), paused: data.flightPaused,
        joints: [...bird.userData.wings, ...bird.userData.wrists, ...bird.userData.primaries].map((node: any) => node.quaternion.toArray()) },
      errors: w.__events.errors
    };
  });
}
function expectAnatomy(audit: any, region: string, side: number) {
  expect({ visible: audit.visible, side: audit.side, selected: audit.selected, markerSelected: audit.markerSelected, wrongSource: audit.wrongSource, focused: audit.focused, errors: audit.errors })
    .toEqual({ visible: true, side, selected: region, markerSelected: region, wrongSource: 0, focused: [region], errors: [] });
  expect(audit.source).toBe(audit.bird);
  expect(audit.coordinateError, 'Every outline vertex and leader anchor follows the actual articulated nodes').toBeLessThan(0.000002);
  expect(audit.colorError, 'Every outline and both leader segments use the correct focus palette').toBeLessThan(0.0000005);
  expect(audit.count).toBe(audit.expectedCount);
  expect(audit.markerColors).toEqual([0xfbbf24, 0x67e8f9, 0x86efac, 0xf9a8d4]);
  expect(audit.pool.resources).toHaveLength(15); expect(audit.pool.bytes).toBe(4608);
}
async function checkSize(locator: Locator) {
  const size = await locator.evaluate(element => { const box = element.getBoundingClientRect(); return { width: box.width, height: box.height }; });
  expect(size.width).toBeGreaterThanOrEqual(44); expect(size.height).toBeGreaterThanOrEqual(44);
}

test('Selected anatomical outlines and segment notes preserve the fixed view and GPU pool with native keyboard controls', async ({ page }) => {
  await mount(page);
  await activate(page, page.getByRole('button', { name: 'Follow individual’s left wingtip', exact: true }));
  const original = await saved(page), inner = await anatomyAudit(page);
  expectAnatomy(inner, 'inner-wing', 0);
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-inner-wing-focus-stage.png') });
  const describe = page.getByRole('button', { name: 'Describe this wing segment', exact: true });
  await checkSize(describe); await activate(page, describe);
  const note = page.getByRole('textbox', { name: 'Shape and motion observation', exact: true });
  await expect(note).toBeFocused(); await expect(note).toHaveValue(original.flightStudyObservations.drafts['canada_goose:inner-wing']);
  expect(await saved(page)).toEqual({ ...original, flightStudyObservationOpen: true });
  const opened = await anatomyAudit(page); expect(opened.pose).toEqual(inner.pose); expect(opened.positions).toEqual(inner.positions); expect(opened.pool).toEqual(inner.pool);
  await activate(page, page.locator('[data-study-region="primaries"]'));
  const primary = await anatomyAudit(page); expectAnatomy(primary, 'primaries', 0);
  expect(primary.pose).toEqual(inner.pose); expect(primary.positions).toEqual(inner.positions); expect(primary.pool).toEqual(inner.pool);
  await activate(page, describe); await expect(note).toBeFocused(); await expect(note).toHaveValue(original.flightStudyObservations.drafts['canada_goose:primaries']);
  await activate(page, page.getByRole('button', { name: 'Follow individual’s right wingtip', exact: true }));
  const right = await anatomyAudit(page); expectAnatomy(right, 'primaries', 1);
  expect(right.pose).toEqual(inner.pose); expect(right.pool).toEqual(inner.pool);
  await page.locator('.migration-flight-stage').screenshot({ path: join(report, 'desktop-primary-focus-stage.png') });
  await activate(page, page.locator('[data-study-region="head"]')); await expect(describe).toHaveCount(0);
  await activate(page, page.getByRole('button', { name: 'Describe wing motion', exact: true }));
  await expect(page.locator('[data-study-region="primaries"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(note).toHaveValue(original.flightStudyObservations.drafts['canada_goose:primaries']);
  expect((await saved(page)).flightStudyObservations).toEqual(original.flightStudyObservations);
  expect(failures.get(page)).toEqual([]);
  await writeFile(join(report, 'desktop-segment-focus.json'), JSON.stringify({ inner, primary, right, saved: await saved(page) }, null, 2));
});

for (const dark of [false, true]) test.describe('Migration segment focus phone ' + (dark ? 'dark' : 'light') + ' round19', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch learners keep the selected segment draft, compare fixed-camera cycle positions and explicitly record their own evidence', async ({ page }) => {
    const stem = 'mobile-' + (dark ? 'dark' : 'light') + '-segment-focus';
    await mount(page, dark);
    await activate(page, page.getByRole('button', { name: 'Follow individual’s left wingtip', exact: true }), true);
    const original = await saved(page);
    const region = dark ? 'primaries' : 'inner-wing';
    await activate(page, page.locator('[data-study-region="' + region + '"]'), true);
    await activate(page, page.getByRole('button', { name: 'Cycle position 3 of 8', exact: true }), true);
    const position3 = await anatomyAudit(page); expectAnatomy(position3, region, 0);
    await activate(page, page.getByRole('button', { name: 'Cycle position 7 of 8', exact: true }), true);
    const position7 = await anatomyAudit(page); expectAnatomy(position7, region, 0);
    expect(position7.pose.cameraPosition).toEqual(position3.pose.cameraPosition); expect(position7.pose.cameraQuaternion).toEqual(position3.pose.cameraQuaternion);
    expect(position7.pose.birdMatrix).toEqual(position3.pose.birdMatrix); expect(position7.pose.serial).toBe(13);
    expect(position7.positions).not.toEqual(position3.positions); expect(position7.pool).toEqual(position3.pool);
    await page.locator('.migration-flight-stage').screenshot({ path: join(report, stem + '-stage.png') });
    const describe = page.getByRole('button', { name: 'Describe this wing segment', exact: true });
    await checkSize(describe); await checkSize(page.locator('[data-study-region="' + region + '"]'));
    await page.locator('[data-followed-anatomy-activity]').screenshot({ path: join(report, stem + '-activity.png') });
    await activate(page, describe, true);
    const note = page.getByRole('textbox', { name: 'Shape and motion observation', exact: true });
    await expect(note).toBeFocused(); await expect(note).toHaveValue(original.flightStudyObservations.drafts['canada_goose:' + region]);
    const beforeWriting = await saved(page);
    expect(beforeWriting.flightStudyRegion).toBe(region); expect(beforeWriting.flightStudyObservations).toEqual(original.flightStudyObservations);
    const opened = await anatomyAudit(page); expect(opened.pose).toEqual(position7.pose); expect(opened.positions).toEqual(position7.positions); expect(opened.pool).toEqual(position7.pool);
    const evidence = 'I followed the individual’s left wing and compared cycle positions 3 and 7 with the camera fixed. The selected segment changed angle while it stayed connected.';
    await note.fill(evidence); await page.getByRole('button', { name: 'Record observation', exact: true }).tap();
    const recorded = await saved(page);
    expect(recorded.flightStudyObservations.records['canada_goose:' + region].note).toBe(evidence);
    for (const other of ['head', 'inner-wing', 'primaries'].filter(id => id !== region)) expect(recorded.flightStudyObservations.drafts['canada_goose:' + other]).toBe(original.flightStudyObservations.drafts['canada_goose:' + other]);
    for (const key of ['flightInvestigation', 'flightChallenges', 'inquiry', 'aiExplorerText']) expect(recorded[key]).toEqual(original[key]);
    await page.addScriptTag({ content: axeSource });
    const accessibility = await page.evaluate(async () => {
      const result = await (window as any).axe.run(document.querySelector('#wrap'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, violations: result.violations.map((item: any) => ({ id: item.id, targets: item.nodes.map((node: any) => node.target) })), errors: (window as any).__events.errors };
    });
    expect(accessibility).toEqual({ width: 390, scrollWidth: 390, violations: [], errors: [] });
    expect(failures.get(page)).toEqual([]);
    await page.locator('[data-study-observation]').screenshot({ path: join(report, stem + '-notes.png') });
    await writeFile(join(report, stem + '.json'), JSON.stringify({ position3, position7, beforeWriting, recorded, accessibility }, null, 2));
  });
});
