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
async function placement(page: Page) {
  return page.evaluate(() => {
    const w = window as any;
    w.__scene.updateMatrixWorld(true);
    const point = new w.THREE.Vector3();
    // Rotating a geometry's bounding box exaggerates its footprint. Measure the
    // rendered vertices themselves so this checks the actual colony and rock.
    function bounds(object: any) {
      const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
      object.traverse((mesh: any) => {
        const positions = mesh.geometry?.attributes.position;
        if (!mesh.isMesh || !positions) return;
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
          box.minX = Math.min(box.minX, point.x); box.maxX = Math.max(box.maxX, point.x);
          box.minY = Math.min(box.minY, point.y); box.maxY = Math.max(box.maxY, point.y);
          box.minZ = Math.min(box.minZ, point.z); box.maxZ = Math.max(box.maxZ, point.z);
        }
      });
      return box;
    }
    const blockers = w.__scene.children.filter((o: any) => o.userData.substrate === 'rock').map(bounds);
    blockers.push({ minX: -4.5, maxX: 4.5, minZ: -5, maxZ: 4.5 }, { minX: 0, maxX: 7, minZ: -5, maxZ: 10 });
    const conflicts: any[] = [], colonies: any[] = [];
    const ray = new w.THREE.Raycaster(), floor = w.__scene.getObjectByName('cl-seafloor');
    for (let i = 0; i < w.__colonies.length; i++) {
      const coral = w.__colonies[i], box = bounds(coral);
      if (coral.visible && coral.userData.reefPlacementValid) {
        for (let j = 0; j < blockers.length; j++) {
          const other = blockers[j];
          const clearance = Math.max(other.minX - box.maxX, box.minX - other.maxX, other.minZ - box.maxZ, box.minZ - other.maxZ);
          if (clearance < .10) conflicts.push({ coral: i, blocker: j, clearance });
        }
        blockers.push(box);
      }
      ray.set(new w.THREE.Vector3(coral.position.x, 50, coral.position.z), new w.THREE.Vector3(0, -1, 0)); ray.far = 200;
      const hit = ray.intersectObject(floor, false)[0];
      colonies.push({ visible: coral.visible, active: coral.userData.reefPlacementValid, finite: Object.values(box).every(Number.isFinite), baseOffsetError: Math.abs(box.minY - (coral.position.y - coral.userData.groundOffset)), groundError: hit ? Math.abs(box.minY - hit.point.y) : null });
    }
    return { conflicts, colonies };
  });
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
      return { name: c.name, meshes: meshes.length, vertices: p.count, finite: Array.from(p.array).every(Number.isFinite) && Array.from(n.array).every(Number.isFinite), colors: color?.count, tint: c.userData.coralHex, radius: c.userData.substrateRadius, form: c.geometry.userData.growthForm, size: size.toArray() };
    });
  });
  expect(colonies.length).toBeGreaterThan(10);
  expect([...new Set(colonies.map((c: any) => c.form))].sort()).toEqual(['antler', 'corymbose', 'finger']);
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
  const sites = await placement(page);
  expect(sites.conflicts).toEqual([]);
  for (const colony of sites.colonies) {
    expect(colony.visible && colony.active && colony.finite).toBe(true);
    expect(colony.baseOffsetError).toBeLessThan(.00001);
  }
  const pixels = await harness.glPixels(page);
  expect(pixels!.significantColors).toBeGreaterThan(5);
  await harness.unmount(page);
  expect(await page.evaluate(() => (window as any).__coralResources.every((r: any) => r.disposed))).toBe(true);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('recycling preserves coral resources and camouflage while clearing rocks and grounding in the same frame', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    const w = window as any;
    w.__before = w.__colonies.map((c: any) => ({ geometry: c.geometry, material: c.material, hex: c.userData.coralHex, radius: c.userData.substrateRadius, substrate: c.userData.substrate, offset: c.userData.groundOffset, form: c.geometry.userData.growthForm, position: c.position.toArray() }));
    w.__player.position.x = 250; w.__player.position.z = 160;
  });
  // Stop on the frame that recycling actually moves the pool. Waiting longer
  // would hide a one-frame grounding defect behind the next updateGround call.
  let recycled = false;
  for (let frame = 0; frame < 12 && !recycled; frame++) {
    await advance(page, 1);
    recycled = await page.evaluate(() => { const w = window as any; return w.__colonies.every((c: any, i: number) => Math.hypot(c.position.x - w.__before[i].position[0], c.position.z - w.__before[i].position[2]) > 100); });
  }
  expect(recycled).toBe(true);
  const results = await page.evaluate(() => {
    const w = window as any; w.__scene.updateMatrixWorld(true);
    const ray = new w.THREE.Raycaster(), floor = w.__scene.getObjectByName('cl-seafloor');
    return w.__colonies.map((c: any, i: number) => {
      const before = w.__before[i];
      ray.set(new w.THREE.Vector3(c.position.x, 50, c.position.z), new w.THREE.Vector3(0, -1, 0)); ray.far = 200;
      const hit = ray.intersectObject(floor, false)[0];
      return { same: before.geometry === c.geometry && before.material === c.material && before.hex === c.userData.coralHex && before.radius === c.userData.substrateRadius && before.substrate === c.userData.substrate && before.offset === c.userData.groundOffset && before.form === c.geometry.userData.growthForm, moved: Math.hypot(c.position.x - before.position[0], c.position.z - before.position[2]), distance: Math.hypot(c.position.x - w.__player.position.x, c.position.z - w.__player.position.z), groundError: hit ? Math.abs(c.position.y - c.userData.groundOffset - hit.point.y) : null };
    });
  });
  for (const r of results) {
    expect(r.same).toBe(true); expect(r.moved).toBeGreaterThan(100);
    expect(r.distance).toBeGreaterThanOrEqual(55); expect(r.distance).toBeLessThanOrEqual(95);
    expect(r.groundError).not.toBeNull(); expect(r.groundError!).toBeLessThan(.025);
  }
  const sites = await placement(page);
  expect(sites.conflicts).toEqual([]);
  for (const colony of sites.colonies) {
    expect(colony.visible && colony.active && colony.finite).toBe(true);
    expect(colony.baseOffsetError).toBeLessThan(.00001);
    expect(colony.groundError).not.toBeNull(); expect(colony.groundError!).toBeLessThan(.025);
  }
});

test('rock recycling relocates an obstructed surviving colony without replacing its resources', async ({ page }) => {
  await mount(page);
  await page.evaluate(() => {
    const w = window as any, rocks = w.__scene.children.filter((o: any) => o.userData.substrate === 'rock');
    w.__survivor = w.__colonies.find((c: any) => c.visible && Math.hypot(c.position.x, c.position.z) < 30);
    const coral = w.__survivor;
    w.__survivorBefore = { position: coral.position.clone(), geometry: coral.geometry, material: coral.material, hex: coral.userData.coralHex, radius: coral.userData.substrateRadius, offset: coral.userData.groundOffset };
    w.__survivorDisposed = false;
    for (const resource of [coral.geometry, coral.material]) resource.addEventListener('dispose', () => { w.__survivorDisposed = true; });
    // Translate a real rock over a colony that is still inside the active area.
    // A second distant rock triggers the normal recycling/settlement path.
    rocks[0].position.x = coral.position.x; rocks[0].position.z = coral.position.z;
    w.__triggerRock = rocks[1]; w.__triggerRock.position.x = 300; w.__triggerRock.position.z = 300;
  });
  const blocked = await placement(page);
  expect(blocked.conflicts.length).toBeGreaterThan(0);
  let recycled = false;
  for (let frame = 0; frame < 12 && !recycled; frame++) {
    await advance(page, 1);
    recycled = await page.evaluate(() => { const w = window as any; return Math.hypot(w.__triggerRock.position.x - w.__player.position.x, w.__triggerRock.position.z - w.__player.position.z) < 120; });
  }
  expect(recycled).toBe(true);
  const result = await page.evaluate(() => {
    const w = window as any, coral = w.__survivor, before = w.__survivorBefore;
    return { moved: coral.position.distanceTo(before.position), same: coral.geometry === before.geometry && coral.material === before.material && coral.userData.coralHex === before.hex && coral.userData.substrateRadius === before.radius && coral.userData.groundOffset === before.offset, active: coral.visible && coral.userData.reefPlacementValid, disposed: w.__survivorDisposed };
  });
  expect(result.moved).toBeGreaterThan(.1); expect(result.same && result.active).toBe(true); expect(result.disposed).toBe(false);
  expect((await placement(page)).conflicts).toEqual([]);
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
