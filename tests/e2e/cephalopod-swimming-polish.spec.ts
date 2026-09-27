import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab',
  width: 900, height: 1000, layout: 'document',
});
const canvas = 'canvas[role=application]';

async function mount(page: Page) {
  await harness.mount(page, { cephalopodLab: {
    activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'humboldtSquid',
    huntMode: 'observe', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true,
  } });
  await page.evaluate(() => {
    const w = window as any;
    w.__scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
    w.__player = w.__scene.getObjectByName('cl-player');
    w.__fish = w.__scene.children.filter((o: any) => o.name === 'cl-prey-fish' && o.userData.alive && o.userData.offset);
    if (w.__fish.length < 2) throw new Error('Expected live named prey fish in the actual scene');
    w.__testStep = 0;
    w.THREE.Clock.prototype.getDelta = function () {
      const dt = w.__testStep;
      w.__testStep = 0;
      return dt;
    };
    w.__scene.children.forEach((o: any) => {
      if (o.userData.substrate === 'rock') {
        o.position.set(w.__player.position.x - 18, o.position.y, w.__player.position.z - 18);
        o.userData.substrateRadius = 0;
      }
      if (o.userData.alive && o.userData.cfg) {
        o.position.set(18, 0.18, 18);
        o.userData.speed = 0;
      }
      if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9;
    });
    w.__scene.updateMatrixWorld(true);
  });
  await page.locator(canvas).focus();
}

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let i = 0; i < count; i++) {
      w.__testStep = 0.05;
      do {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      } while (w.__testStep !== 0);
    }
  }, frames);
}

async function tailState(page: Page, index = 0) {
  return page.evaluate(index => {
    const tail = (window as any).__fish[index].userData.tail;
    if (!tail) throw new Error('Prey fish has no tail animation reference');
    return tail.position.toArray().concat(tail.quaternion.toArray(), tail.scale.toArray(), Array.from(tail.geometry.attributes.position.array));
  }, index);
}

async function nearSchool(page: Page, distance = 0.65) {
  await page.evaluate(async (distance) => {
    const w = window as any;
    const fish = w.__fish.slice(0, 8);
    const approximateCenter = fish[0].position.clone().sub(fish[0].userData.offset);
    const originalClone = w.THREE.Vector3.prototype.clone;
    let center: any;
    // Capture the school's existing steering center while simulation time is
    // frozen; do not replace the fish, the school, or its behavior under test.
    w.THREE.Vector3.prototype.clone = function () {
      if (this.distanceToSquared(approximateCenter) < 4 && !fish.some((f: any) => f.position === this)) center = this;
      return originalClone.call(this);
    };
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    } finally {
      w.THREE.Vector3.prototype.clone = originalClone;
    }
    if (!center) throw new Error('Could not locate the actual school steering center');
    center.copy(w.__player.position).add(new w.THREE.Vector3(0, 0, distance));
    fish.forEach((f: any, i: number) => {
      f.userData.offset.set(i === 0 ? 0 : 0.8 + i * 0.3, 0, 0);
      f.position.copy(center).add(f.userData.offset);
    });
    w.__scene.updateMatrixWorld(true);
  }, distance);
}

test.describe.configure({ timeout: 150000, retries: 0, mode: 'default' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('prey fish face forward and animate their tails while respecting inspection and reduced motion', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await mount(page);
  const shape = await page.evaluate(() => {
    const w = window as any, fish = w.__fish[0];
    const body = fish.getObjectByName('cl-fish-body'), tail = fish.getObjectByName('cl-fish-tail');
    if (!body || !tail) throw new Error('Missing the named body/tail render meshes');
    function localBounds(mesh: any) {
      mesh.updateMatrix();
      const box = new w.THREE.Box3(), point = new w.THREE.Vector3();
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) box.expandByPoint(point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrix));
      return { span: box.getSize(new w.THREE.Vector3()).toArray(), center: box.getCenter(new w.THREE.Vector3()).toArray() };
    }
    return { group: fish.isGroup, alive: fish.userData.alive, offset: fish.userData.offset.isVector3, tailReference: fish.userData.tail === tail, body: localBounds(body), tail: localBounds(tail) };
  });
  expect(shape.group && shape.alive && shape.offset && shape.tailReference).toBe(true);
  expect(shape.body.span[2]).toBeGreaterThan(shape.body.span[0]);
  expect(shape.body.span[2]).toBeGreaterThan(shape.body.span[1]);
  expect(shape.tail.center[2]).toBeLessThan(shape.body.center[2]);
  const swimming = await tailState(page);
  await advance(page, 5);
  expect(await tailState(page)).not.toEqual(swimming);

  await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click();
  const inspecting = await tailState(page);
  await advance(page, 8);
  expect(await tailState(page)).toEqual(inspecting);
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click();
  await advance(page, 5);
  expect(await tailState(page)).not.toEqual(inspecting);

  await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
  await page.getByLabel('Reduced motion', { exact: true }).check();
  await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  await advance(page, 2);
  const reduced = await tailState(page);
  await advance(page, 8);
  expect(await tailState(page)).toEqual(reduced);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
  await page.getByLabel('Reduced motion', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  await advance(page, 5);
  expect(await tailState(page)).not.toEqual(reduced);
  expect(errors).toEqual([]);
});

test('capturing a fish disposes its owned resources while a surviving neighbor keeps swimming', async ({ page }) => {
  await mount(page);
  await nearSchool(page);
  const resourceCounts = await page.evaluate(() => {
    const w = window as any;
    function resources(fish: any) {
      const found = new Set<any>();
      fish.traverse((o: any) => {
        if (o.geometry) found.add(o.geometry);
        (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach((m: any) => found.add(m));
      });
      return found;
    }
    const target = resources(w.__fish[0]), neighbor = resources(w.__fish[1]);
    const owned = Array.from(target).filter((resource: any) => !neighbor.has(resource));
    const audit = (resource: any) => {
      const row = { type: resource.type, uuid: resource.uuid, disposed: false };
      resource.addEventListener('dispose', () => { row.disposed = true; });
      return row;
    };
    w.__caughtResources = owned.map(audit);
    w.__neighborResources = Array.from(neighbor).map(audit);
    return { geometry: owned.filter((r: any) => r.isBufferGeometry).length, material: owned.filter((r: any) => r.isMaterial).length, neighbor: neighbor.size };
  });
  expect(resourceCounts.geometry).toBeGreaterThan(0);
  expect(resourceCounts.material).toBeGreaterThan(0);
  expect(resourceCounts.neighbor).toBeGreaterThan(0);
  await page.keyboard.press('KeyT');
  await advance(page, 2);
  await page.keyboard.press('KeyE');
  await advance(page, 7);
  await expect.poll(() => page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(false);
  expect(await page.evaluate(() => (window as any).__fish[0].parent === null)).toBe(true);
  expect(await page.evaluate(() => (window as any).__caughtResources.filter((r: any) => !r.disposed))).toEqual([]);
  expect(await page.evaluate(() => (window as any).__neighborResources.filter((r: any) => r.disposed))).toEqual([]);
  expect(await page.evaluate(() => { const w = window as any; return w.__fish[1].userData.alive && w.__fish[1].parent === w.__scene; })).toBe(true);
  const survivor = await tailState(page, 1);
  await advance(page, 5);
  expect(await tailState(page, 1)).not.toEqual(survivor);
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.cephalopodLab.huntsSuccessful || 0)).toBe(1);
});

test('squid jet stretch eases on and off and inspection freezes the swimming geometry', async ({ page }) => {
  await mount(page);
  const stretch = () => page.evaluate(() => (window as any).__player.getObjectByName('cl-mantle').scale.z);
  const idle = await stretch();
  await page.keyboard.down('KeyW');
  await page.keyboard.down('Space');
  await advance(page, 1);
  const firstJet = await stretch();
  await advance(page, 7);
  const sustained = await stretch();
  expect(sustained).toBeGreaterThan(idle);
  expect(Math.abs(firstJet - idle)).toBeLessThan(Math.abs(sustained - idle) * 0.8);
  await page.keyboard.up('Space');
  await advance(page, 1);
  const firstRelease = await stretch();
  await advance(page, 7);
  const settled = await stretch();
  expect(Math.abs(firstRelease - sustained)).toBeLessThan(Math.abs(settled - sustained) * 0.8);
  await page.keyboard.up('KeyW');

  await page.keyboard.down('KeyW');
  await page.keyboard.down('Space');
  await advance(page, 4);
  await page.keyboard.press('KeyF');
  await page.keyboard.up('Space');
  await page.keyboard.up('KeyW');
  const buffers = () => page.evaluate(() => {
    const w = window as any;
    return { mantleScale: w.__player.getObjectByName('cl-mantle').scale.toArray(), meshes: ['cl-arm-0', 'cl-tentacle-0', 'cl-fin-1'].map(name => {
      const mesh = w.__player.getObjectByName(name);
      if (!mesh) throw new Error('Missing swimming mesh ' + name);
      return { name, positions: Array.from(mesh.geometry.attributes.position.array) };
    }) };
  });
  const frozen = await buffers();
  await advance(page, 10);
  expect(await buffers()).toEqual(frozen);
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click();
  await advance(page, 5);
  expect(await buffers()).not.toEqual(frozen);
});


test('fish tail motion stays smooth when alarm rises after an extended quiet swim', async ({ page }) => {
  await mount(page);
  await nearSchool(page, 35);
  // Twelve simulation seconds puts this beyond the startup-only coverage. A
  // frequency multiplied by total elapsed time creates increasingly large
  // phase jumps when alarm changes, even though ordinary cruising looks fine.
  await advance(page, 240);
  expect(await page.evaluate(() => (window as any).__fish[0].userData.alert)).toBe(false);
  const sampleTail = (frames: number) => page.evaluate(async count => {
    const w = window as any;
    const samples = [{ angle: w.__fish[0].userData.tail.rotation.y, alert: !!w.__fish[0].userData.alert }];
    for (let i = 0; i < count; i++) {
      w.__testStep = 0.05;
      do {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      } while (w.__testStep !== 0);
      samples.push({ angle: w.__fish[0].userData.tail.rotation.y, alert: !!w.__fish[0].userData.alert });
    }
    return samples;
  }, frames);
  const quiet = await sampleTail(20);
  expect(quiet.every(sample => !sample.alert)).toBe(true);
  await nearSchool(page, 0.65);
  const alarm = await sampleTail(12);
  expect(alarm.some(sample => sample.alert)).toBe(true);
  const largestStep = (samples: { angle: number }[]) => Math.max(...samples.slice(1).map((sample, i) => Math.abs(sample.angle - samples[i].angle)));
  const quietStep = largestStep(quiet), alarmStep = largestStep(alarm);
  expect(quietStep).toBeGreaterThan(0);
  // Alarm may speed up and widen the stroke, but should not introduce abrupt
  // reversals far larger than the normal stroke sampled at the same cadence.
  expect(alarmStep).toBeLessThan(quietStep * 3.5);
});
