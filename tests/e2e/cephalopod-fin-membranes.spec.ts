import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const canvas = 'canvas[role=application]';
const errors = new WeakMap<Page, string[]>();

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let frame = 0; frame < count; frame++) {
      w.__testStep = .05;
      do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
      while (w.__testStep !== 0);
    }
  }, frames);
}

async function mount(page: Page, species: 'dumboOcto' | 'cuttlefish') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: species, huntMode: 'observe', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any;
    w.__scene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene;
    w.__player = w.__scene.getObjectByName('cl-player');
    w.__mantle = w.__player.getObjectByName('cl-mantle');
    w.__fins = ['cl-fin--1', 'cl-fin-1'].map(name => w.__player.getObjectByName(name));
    if (w.__fins.some((fin: any) => !fin)) throw new Error('Missing the two live fin membranes');
    w.__testStep = 0;
    w.THREE.Clock.prototype.getDelta = function () { const dt = w.__testStep; w.__testStep = 0; return dt; };
    w.__scene.children.forEach((object: any) => {
      if (object.userData.substrate === 'rock') { object.position.set(w.__player.position.x - 18, object.position.y, w.__player.position.z - 18); object.userData.substrateRadius = 0; }
      if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9;
    });
    w.__scene.updateMatrixWorld(true);
  });
  await page.locator(canvas).focus();
  await advance(page, 3);
}

async function finPose(page: Page) {
  return page.evaluate(() => {
    const w = window as any;
    return { mantleScale: w.__mantle.scale.toArray(), fins: w.__fins.map((fin: any) => ({
      name: fin.name, geometry: fin.geometry.uuid, material: fin.material.uuid,
      positions: Array.from(fin.geometry.attributes.position.array), normals: Array.from(fin.geometry.attributes.normal.array),
      position: fin.position.toArray(), quaternion: fin.quaternion.toArray(), scale: fin.scale.toArray(),
    })) };
  });
}

async function expectDumboSeamsAttached(page: Page) {
  const seams = await page.evaluate(() => {
    const w = window as any, point = new w.THREE.Vector3();
    w.__scene.updateMatrixWorld(true);
    return w.__fins.map((fin: any) => {
      const positions = fin.geometry.attributes.position;
      const radii = [];
      for (let ring = 0; ring <= 28; ring++) {
        // Follow the rendered mesh through its own world transform, then back
        // into the breathing mantle. A detached rotated fin fails this check.
        point.fromBufferAttribute(positions, ring * 6).applyMatrix4(fin.matrixWorld);
        w.__mantle.worldToLocal(point);
        radii.push(Math.hypot(point.x / .47, point.y / .48, point.z / .54));
      }
      return { vertices: positions.count, radii, quaternion: fin.quaternion.toArray(), finite: Array.from(positions.array).every(value => Number.isFinite(value)) && Array.from(fin.geometry.attributes.normal.array).every(value => Number.isFinite(value)) };
    });
  });
  expect(seams).toHaveLength(2);
  for (const seam of seams) {
    expect(seam.vertices).toBe(174);
    expect(seam.finite).toBe(true);
    expect(seam.quaternion).toEqual([0, 0, 0, 1]);
    for (const radius of seam.radii) { expect(radius).toBeGreaterThan(.97); expect(radius).toBeLessThan(1.01); }
  }
}

test.describe.configure({ timeout: 150000, retries: 0 });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => {
  const events: string[] = []; errors.set(page, events);
  page.on('pageerror', error => events.push(error.message));
  page.on('console', message => { if (message.type() === 'error') events.push(message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

test('Dumbo fin seams stay attached while rising and turning under boost, and inspection freezes their pose', async ({ page }) => {
  await mount(page, 'dumboOcto');
  await expectDumboSeamsAttached(page);
  const idle = await finPose(page);
  await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD'); await page.keyboard.down('KeyQ'); await page.keyboard.down('Space');
  await advance(page, 8);
  await expect(page.locator('[data-hud=burn]')).toContainText('Fin boost');
  expect(await finPose(page)).not.toEqual(idle);
  const orientation = await page.evaluate(() => (window as any).__player.rotation.toArray());
  expect(Math.abs(orientation[0])).toBeGreaterThan(.01);
  expect(Math.abs(orientation[2])).toBeGreaterThan(.01);
  await expectDumboSeamsAttached(page);
  await page.keyboard.press('KeyF');
  await page.keyboard.up('Space'); await page.keyboard.up('KeyW'); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyQ');
  const inspecting = await finPose(page);
  await advance(page, 10);
  expect(await finPose(page)).toEqual(inspecting);
  await expectDumboSeamsAttached(page);
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click();
  await advance(page, 5);
  expect(await finPose(page)).not.toEqual(inspecting);
  await expectDumboSeamsAttached(page);
});

test('cuttlefish membranes obey reduced motion through propulsion changes and release their owned resources', async ({ page }) => {
  await mount(page, 'cuttlefish');
  const swimming = await finPose(page);
  await advance(page, 6);
  expect(await finPose(page)).not.toEqual(swimming);
  const resources = await page.evaluate(() => {
    const w = window as any, owned = new Set<any>();
    w.__fins.forEach((fin: any) => { owned.add(fin.geometry); owned.add(fin.material); });
    w.__finResources = Array.from(owned).map((resource: any) => {
      const row = { uuid: resource.uuid, disposed: false };
      resource.addEventListener('dispose', () => { row.disposed = true; });
      return row;
    });
    return { geometries: Array.from(owned).filter((resource: any) => resource.isBufferGeometry).length, materials: Array.from(owned).filter((resource: any) => resource.isMaterial).length };
  });
  expect(resources.geometries).toBe(2); expect(resources.materials).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
  await page.getByLabel('Reduced motion', { exact: true }).check();
  await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  await advance(page, 2);
  const reduced = await finPose(page);
  await page.keyboard.down('KeyW'); await page.keyboard.down('Space');
  await advance(page, 8);
  await expect(page.locator('[data-hud=burn]')).toContainText('Jetting');
  expect(await finPose(page)).toEqual(reduced);
  await page.keyboard.up('Space'); await page.keyboard.up('KeyW');
  await advance(page, 5);
  expect(await finPose(page)).toEqual(reduced);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
  await page.getByLabel('Reduced motion', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  await advance(page, 5);
  expect(await finPose(page)).not.toEqual(reduced);
  expect(await page.evaluate(() => (window as any).__finResources.some((resource: any) => resource.disposed))).toBe(false);
  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.evaluate(() => (window as any).__finResources.filter((resource: any) => !resource.disposed))).toEqual([]);
});
