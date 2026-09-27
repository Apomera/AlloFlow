import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
async function mount(page: Page) {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'observe', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any;
    w.__scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
    w.__player = w.__scene.getObjectByName('cl-player');
    w.__colonies = w.__scene.children.filter((o: any) => o.userData.substrate === 'coral');
    w.__step = 0;
    w.THREE.Clock.prototype.getDelta = function () { const dt = w.__step; w.__step = 0; return dt; };
  });
}
async function advance(page: Page, count: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let i = 0; i < count; i++) { w.__step = .05; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__step !== 0); }
  }, count);
}
test.describe.configure({ timeout: 150000, retries: 0 });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('coral colonies use finite merged surfaces and release their owned GPU resources', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await mount(page);
  await advance(page, 2);
  const colonies = await page.evaluate(() => {
    const w = window as any;
    w.__coralResources = [];
    return w.__colonies.map((c: any) => {
      const meshes: any[] = []; c.traverse((o: any) => { if (o.isMesh) meshes.push(o); });
      for (const resource of [c.geometry, c.material]) {
        const row = { disposed: false }; resource.addEventListener('dispose', () => { row.disposed = true; }); w.__coralResources.push(row);
      }
      const p = c.geometry.attributes.position, n = c.geometry.attributes.normal, color = c.geometry.attributes.color;
      c.geometry.computeBoundingBox();
      const size = c.geometry.boundingBox.getSize(new w.THREE.Vector3());
      return { name: c.name, meshes: meshes.length, vertices: p.count, finite: Array.from(p.array).every(Number.isFinite) && Array.from(n.array).every(Number.isFinite), colors: color?.count, tint: c.userData.coralHex, radius: c.userData.substrateRadius, size: size.toArray() };
    });
  });
  expect(colonies.length).toBeGreaterThan(10);
  for (const c of colonies) {
    expect(c.name).toBe('cl-coral-colony');
    expect(c.meshes).toBe(1);
    expect(c.vertices).toBeGreaterThan(100);
    expect(c.finite).toBe(true);
    expect(c.colors).toBe(c.vertices);
    expect(c.tint).toBeGreaterThan(0);
    expect(c.radius).toBe(1.1);
    expect(c.size[0]).toBeGreaterThan(.3); expect(c.size[1]).toBeGreaterThan(.9); expect(c.size[2]).toBeGreaterThan(.3);
  }
  const pixels = await harness.glPixels(page);
  expect(pixels!.significantColors).toBeGreaterThan(5);
  await harness.unmount(page);
  expect(await page.evaluate(() => (window as any).__coralResources.every((r: any) => r.disposed))).toBe(true);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('recycling reuses coral geometry and keeps colony anchors on the moving terrain', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    const w = window as any;
    w.__before = w.__colonies.map((c: any) => ({ geometry: c.geometry.uuid, material: c.material.uuid, hex: c.userData.coralHex, position: c.position.toArray() }));
    w.__player.position.x = 250; w.__player.position.z = 160;
  });
  await advance(page, 14);
  const results = await page.evaluate(() => {
    const w = window as any; w.__scene.updateMatrixWorld(true);
    const ray = new w.THREE.Raycaster(), floor = w.__scene.getObjectByName('cl-seafloor');
    return w.__colonies.map((c: any, i: number) => {
      const before = w.__before[i];
      ray.set(new w.THREE.Vector3(c.position.x, 50, c.position.z), new w.THREE.Vector3(0, -1, 0)); ray.far = 200;
      const hit = ray.intersectObject(floor, false)[0];
      return { same: before.geometry === c.geometry.uuid && before.material === c.material.uuid && before.hex === c.userData.coralHex, moved: Math.hypot(c.position.x - before.position[0], c.position.z - before.position[2]), distance: Math.hypot(c.position.x - w.__player.position.x, c.position.z - w.__player.position.z), groundError: hit ? Math.abs(c.position.y - c.userData.groundOffset - hit.point.y) : null };
    });
  });
  for (const r of results) {
    expect(r.same).toBe(true); expect(r.moved).toBeGreaterThan(100);
    expect(r.distance).toBeGreaterThanOrEqual(54); expect(r.distance).toBeLessThanOrEqual(96);
    expect(r.groundError).not.toBeNull(); expect(r.groundError!).toBeLessThan(.025);
  }
});

test('inspection fits beside blocking rocks on desktop and phone and restores cover on exit', async ({ page }) => {
  await mount(page);
  const canvas = page.locator('canvas[role=application]');
  await page.evaluate(() => {
    const w = window as any, update = w.THREE.Camera.prototype.updateMatrixWorld;
    w.THREE.Camera.prototype.updateMatrixWorld = function (...args: any[]) {
      if (this.isPerspectiveCamera) w.__camera = this;
      return update.apply(this, args);
    };
  });
  await canvas.focus(); await page.keyboard.press('KeyF'); await advance(page, 2);
  await page.evaluate(() => {
    const w = window as any;
    w.__rocks = w.__scene.children.filter((o: any) => o.userData.substrate === 'rock');
    w.__baselineDistance = w.__camera.position.distanceTo(w.__player.position);
    w.__blocker = w.__rocks.find((o: any) => o.visible);
    w.__blocker.position.copy(w.__camera.position).lerp(w.__player.position, .5);
    w.__blocker.updateMatrixWorld(true);
    w.__alreadyHidden = w.__rocks.find((o: any) => o !== w.__blocker && o.visible);
    w.__alreadyHidden.visible = false;
  });
  // Re-enter after arranging the frozen world fixture so its occlusion cache starts fresh.
  await page.keyboard.press('KeyF'); await page.keyboard.press('KeyF');
  await advance(page, 2);
  expect(await page.evaluate(() => !(window as any).__blocker.visible)).toBe(true);
  expect(await page.evaluate(() => {
    const w = window as any; return w.__camera.position.distanceTo(w.__player.position) / w.__baselineDistance;
  })).toBeGreaterThan(.95);
  async function framing() {
    return page.evaluate(() => {
      const w = window as any, points: number[][] = [], point = new w.THREE.Vector3();
      w.__player.updateMatrixWorld(true);
      w.__player.traverse((o: any) => {
        if (!o.isMesh || o.isInstancedMesh || !o.geometry?.attributes.position) return;
        for (let a = o; a && a !== w.__player.parent; a = a.parent) if (!a.visible) return;
        const p = o.geometry.attributes.position;
        for (let i = 0; i < p.count; i++) {
          point.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld).project(w.__camera);
          points.push(point.toArray());
        }
      });
      return { count: points.length, finite: points.flat().every(Number.isFinite), x: Math.max(...points.map(p => Math.abs(p[0]))), y: Math.max(...points.map(p => Math.abs(p[1]))), depth: points.every(p => p[2] > 0 && p[2] < 1) };
    });
  }
  for (const phone of [false, true]) {
    if (phone) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); });
      await advance(page, 30);
    }
    const bounds = await framing();
    expect(bounds.count).toBeGreaterThan(100); expect(bounds.finite).toBe(true);
    expect(bounds.x).toBeLessThan(.95); expect(bounds.y).toBeLessThan(.95); expect(bounds.depth).toBe(true);
  }
  await canvas.focus(); await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as any).__blocker.visible)).toBe(true);
  expect(await page.evaluate(() => (window as any).__alreadyHidden.visible)).toBe(false);
  await page.keyboard.press('KeyF'); await advance(page, 2);
  await harness.unmount(page);
  expect(await page.evaluate(() => (window as any).__blocker.visible)).toBe(true);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});
