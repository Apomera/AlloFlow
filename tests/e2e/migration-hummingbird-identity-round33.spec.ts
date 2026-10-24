import { test, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, scene, stage, frames, activate, data, accessibility, capture } from './helpers/migration_round31';
import { portrait } from './helpers/migration_round32';

test.describe.configure({ retries: 0, timeout: 150_000 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round33-2026-10-22');
const source = readFileSync(join(process.cwd(), 'stem_lab/stem_tool_migration.js'));
if (!source.equals(readFileSync(join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js')))) throw new Error('Migration runtime copies differ');
if (process.env.STEM_GL_SUBSTITUTE || process.env.MIG_TOOL_FILE || Object.keys(process.env).some(k => /^MIGRATION_.*_CANDIDATE$/.test(k) && process.env[k])) throw new Error('Canonical regression rejects substitutions');
const sourceProof = { sha256: createHash('sha256').update(source).digest('hex'), bytes: source.length, canonical: true, mirrorIdentical: true };
const harness = makeHarness('stem_lab/stem_tool_migration.js');
test.beforeAll(async () => { mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
const settings = { flightShowAnatomy: false, flightShowWingtipPath: false, flightStudyYaw: 115, flightStudyPitch: 0, flightStudyZoom: 1.1, flightWingStep: 13 };

function identity(p: any) {
  expect(p.head.vertices).toBe(425); expect(p.head.triangles).toBe(720); expect(p.head.vertexColors).toBe(true);
  expect(p.head.materialColor).toBe(0xffffff); expect(p.rings).toBeNull();
  expect(p.counts).toEqual({ nodes: 19, geometries: 12, materials: 10 });
  for (const key of ['positions', 'normals', 'colors']) expect(p.head[key].every(Number.isFinite)).toBe(true);
  let ruby = 0, crown = 0, face = 0;
  for (let i = 0; i < p.head.vertices; i++) {
    const [x, y, z] = p.head.positions.slice(i * 3, i * 3 + 3);
    const [r, g, b] = p.head.colors.slice(i * 3, i * 3 + 3);
    if (r > .35 && r > g * 2 && r > b * 1.7) { ruby++; expect(y).toBeLessThan(0); }
    if (y > .16 && g > r * 2) crown++;
    if (Math.abs(x) > .12 && y > .01 && y < .08 && z < .03 && r < .1 && g < .17) face++;
  }
  expect(ruby).toBeGreaterThan(40); expect(crown).toBeGreaterThan(10); expect(face).toBeGreaterThan(2);
}
function fit(s: any) { expect(s.visible).toBe(1); expect(s.extent).toBeGreaterThan(.2); expect(s.extent).toBeLessThan(.98); expect(s.minDepth).toBeGreaterThan(-1); expect(s.maxDepth).toBeLessThan(1); }
function compareBaseline(p: any, geometry: any, name: string) {
  // Compare the same JSON representation as the persisted baseline, including signed zero.
  const serialized = JSON.parse(JSON.stringify({ rendered: p, scene: geometry }));
  p = serialized.rendered; geometry = serialized.scene;
  const file = join(report, 'baseline-' + name + '.json');
  if (process.env.MIGRATION_EXPECT_BASELINE === '1') expect(existsSync(file)).toBe(true);
  if (!existsSync(file)) return null;
  const baseline = JSON.parse(readFileSync(file, 'utf8')), old = baseline.rendered;
  expect(baseline.sha256).toBe('7af4273e1d682e946085e64979a5462b14457d76dd2623d242198ad8b362cc44');
  expect(p.view).toEqual(old.view); expect(p.stage).toEqual(old.stage); expect(p.studyRadius).toBe(old.studyRadius);
  for (const key of ['camera', 'projection']) p[key].forEach((value: number, i: number) => expect(value).toBeCloseTo(old[key][i], 7));
  expect(p.head.position).toEqual(old.head.position); expect(p.head.scale).toEqual(old.head.scale);
  for (const key of ['positions', 'normals', 'indices', 'position', 'rotation', 'scale']) expect(p.bill[key]).toEqual(old.bill[key]);
  expect(p.counts.nodes).toBe(old.counts.nodes - 2); expect(p.counts.geometries).toBe(old.counts.geometries - 1); expect(p.counts.materials).toBe(old.counts.materials - 1);
  expect(geometry.joints).toEqual(baseline.scene.joints);
  for (let side = 0; side < 2; side++) {
    expect(geometry.primary[side].positions).toEqual(baseline.scene.primary[side].positions);
    expect(geometry.primary[side].indices).toEqual(baseline.scene.primary[side].indices);
    geometry.wings[side].forEach((value: number, i: number) => expect(value).toBeCloseTo(baseline.scene.wings[side][i], 7));
  }
  return { sha256: baseline.sha256, cameraAndPoseMatched: true, before: old.counts, after: p.counts };
}
async function journey(page: Page, phone: boolean) {
  await mount(harness, page, 'ruby_hummingbird', { extra: { ...settings,
    flightStudyObservations: { drafts: { 'ruby_hummingbird:head': 'My head observation stays unfinished.' }, records: {}, comparison: { draft: 'My comparison stays unfinished.' } } } });
  const name = phone ? 'phone-hummingbird' : 'desktop-hummingbird', original = await data(page), initial = await portrait(page), geometry = await scene(page);
  identity(initial); fit(geometry); const baseline = compareBaseline(initial, geometry, name);
  await capture(page, join(report, name + '-identity.png'));
  if (phone) await activate(page, page.getByRole('button', { name: 'Profile', exact: true }), true);
  else { await stage(page).focus(); await page.keyboard.press('ArrowLeft'); await frames(page); }
  const moved = await portrait(page), movedScene = await scene(page);
  identity(moved); fit(movedScene); expect(moved.camera).not.toEqual(initial.camera);
  expect(movedScene.nodes).toEqual(geometry.nodes); expect(movedScene.resources).toEqual(geometry.resources); expect(movedScene.joints).toEqual(geometry.joints);
  expect(moved.head.geometry).toBe(initial.head.geometry); expect(moved.head.colors).toEqual(initial.head.colors);
  await activate(page, page.getByRole('button', { name: 'Observe Head & bill', exact: true }), phone);
  await expect(page.getByText('Adult male head markings are shown.', { exact: false })).toBeVisible();
  await expect(page.getByText('Adult male head markings are shown.', { exact: false })).toContainText('females and young birds can have pale throats');
  expect((await data(page)).flightStudyObservations).toEqual(original.flightStudyObservations);
  await writeFileSync(join(report, name + '-identity.json'), JSON.stringify({ sourceProof, baseline, initial, geometry, moved, movedScene, accessibility: await accessibility(page) }, null, 2));
}
test('Desktop hummingbird has a continuous throat patch with preserved framing and keyboard orbit', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await journey(page, false);
});
test.describe('Phone hummingbird study', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Touch Profile keeps the markings attached and explains the adult male model', async ({ page }) => journey(page, true));
});
