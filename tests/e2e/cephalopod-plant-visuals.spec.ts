import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const errors = new WeakMap<Page, string[]>();

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let frame = 0; frame < count; frame++) {
      w.__plantStep = .05;
      do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
      while (w.__plantStep !== 0);
    }
  }, frames);
}

async function mount(page: Page, quality: 'low' | 'balanced') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'observe', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any;
    w.__scene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene;
    w.__plants = w.__scene.children.filter((object: any) => ['cl-seagrass', 'cl-kelp'].includes(object.name));
    if (w.__plants.length !== 105) throw new Error('Expected 80 live seagrass patches and 25 kelp strands');
    w.__plantStep = 0;
    w.THREE.Clock.prototype.getDelta = function () { const dt = w.__plantStep; w.__plantStep = 0; return dt; };
    w.__scene.children.forEach((object: any) => { if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9; });
    w.__plantPrograms = { 'cl-seagrass': { draws: 0, program: null }, 'cl-kelp': { draws: 0, program: null } };
    w.__plantOwned = w.__plants.map((mesh: any) => ({ mesh, geometry: mesh.geometry, material: mesh.material, attributes: Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name, attribute]: [string, any]) => [name, { attribute, array: attribute.array, initial: Array.from(attribute.array) }])), instances: mesh.instanceMatrix?.array, initialInstances: mesh.instanceMatrix ? Array.from(mesh.instanceMatrix.array) : null }));
    const resources = new Set<any>();
    w.__plants.forEach((mesh: any) => {
      resources.add(mesh.geometry); resources.add(mesh.material);
      const previous = mesh.onAfterRender;
      mesh.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        previous.call(this, renderer, scene, camera, geometry, material, group);
        const row = w.__plantPrograms[this.name]; row.draws++;
        // Audit a native program from an actual draw, without per-frame GPU queries.
        if (!row.program) {
          const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM);
          row.program = { linked: gl.getProgramParameter(program, gl.LINK_STATUS), shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), source: gl.getShaderSource(shader) })) };
        }
      };
    });
    w.__plantResources = Array.from(resources).map((resource: any) => {
      const row = { uuid: resource.uuid, disposed: false }; resource.addEventListener('dispose', () => { row.disposed = true; }); return row;
    });
  });
  await page.locator('canvas[role=application]').focus();
  await advance(page, 3);
}

async function plantState(page: Page) {
  return page.evaluate(() => {
    const w = window as any;
    return { poses: w.__plants.map((mesh: any) => ({ name: mesh.name, position: mesh.position.toArray(), quaternion: mesh.quaternion.toArray(), scale: mesh.scale.toArray() })),
      stable: w.__plantOwned.every((owned: any) => owned.mesh.geometry === owned.geometry && owned.mesh.material === owned.material && owned.mesh.instanceMatrix?.array === owned.instances && Object.entries(owned.attributes).every(([name, attribute]: [string, any]) => owned.geometry.attributes[name] === attribute.attribute && owned.geometry.attributes[name].array === attribute.array)),
      buffersUnchanged: w.__plantOwned.every((owned: any) => Object.values(owned.attributes).every((attribute: any) => attribute.initial.every((value: number, index: number) => value === attribute.array[index])) && (!owned.initialInstances || owned.initialInstances.every((value: number, index: number) => value === owned.instances[index]))),
      disposed: w.__plantResources.filter((resource: any) => resource.disposed).length };
  });
}

async function rootAttachment(page: Page) {
  return page.evaluate(() => {
    const w = window as any, T = w.THREE;
    w.__scene.updateMatrixWorld(true);
    const matrix = new T.Matrix4(), base = new T.Vector3(), point = new T.Vector3(), ray = new T.Raycaster();
    const floor = w.__scene.getObjectByName('cl-seafloor');
    return w.__plants.map((mesh: any) => {
      const positions = mesh.geometry.attributes.position;
      // The real basal row has three vertices; use its centroid rather than
      // mesh.position so floating roots or wrong instance pivots are detected.
      base.set(0, 0, 0);
      for (let vertex = 0; vertex < 3; vertex++) base.add(point.fromBufferAttribute(positions, vertex));
      base.multiplyScalar(1 / 3);
      const roots: number[][] = [];
      for (let instance = 0; instance < (mesh.isInstancedMesh ? mesh.count : 1); instance++) {
        point.copy(base);
        if (mesh.isInstancedMesh) { mesh.getMatrixAt(instance, matrix); point.applyMatrix4(matrix); }
        roots.push(point.applyMatrix4(mesh.matrixWorld).toArray());
      }
      // A cluster has one terrain anchor. Individual roots need not conform to
      // the steep shelf independently, so test visible-floor contact on reef.
      let floorError: number | null = null;
      if (Math.abs(mesh.position.x) < 18) {
        ray.set(new T.Vector3(mesh.position.x, 50, mesh.position.z), new T.Vector3(0, -1, 0)); ray.far = 150;
        const hit = ray.intersectObject(floor, false)[0];
        if (hit) floorError = Math.max(...roots.map(root => Math.abs(root[1] - hit.point.y - mesh.userData.groundOffset)));
      }
      return { name: mesh.name, angle: mesh.rotation.z, roots, baseY: mesh.position.y, floorError };
    });
  });
}

async function expectRootedPlants(page: Page) {
  const plants = await rootAttachment(page);
  for (const kind of ['cl-seagrass', 'cl-kelp']) {
    const rows = plants.filter((plant: any) => plant.name === kind);
    expect(rows.some((plant: any) => plant.floorError !== null)).toBe(true);
    for (const plant of rows) {
      expect(plant.roots.every((root: number[]) => root.every(Number.isFinite))).toBe(true);
      for (const root of plant.roots) expect(Math.abs(root[1] - plant.baseY)).toBeLessThan(kind === 'cl-seagrass' ? .031 : .00001);
      if (plant.floorError !== null) expect(plant.floorError).toBeLessThan(.055);
    }
  }
}

test.describe.configure({ timeout: 180000, retries: 0 });
// Keep the WebGL resource and motion checks independent of GPU video capture.
// The initial recorded run is retained separately with its teardown failures.
test.use({ video: 'off', trace: 'off' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => {
  const events: string[] = []; errors.set(page, events);
  page.on('pageerror', error => events.push(error.message));
  page.on('console', message => { if (message.type() === 'error') events.push(message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

for (const quality of ['low', 'balanced'] as const) {
  test(`${quality} rooted plants render, sway without reallocating buffers, respect motion settings and dispose on exit`, async ({ page }) => {
    await mount(page, quality);
    const anatomy = await page.evaluate(() => {
      const w = window as any;
      return w.__plants.map((mesh: any) => ({ name: mesh.name, instances: mesh.isInstancedMesh ? mesh.count : 1, vertices: mesh.geometry.attributes.position.count, finite: Object.values(mesh.geometry.attributes).every((attribute: any) => Array.from(attribute.array).every(Number.isFinite)), lit: mesh.material.isMeshStandardMaterial, colors: mesh.material.vertexColors, substrate: mesh.userData.substrate, radius: mesh.userData.substrateRadius }));
    });
    expect(anatomy.filter((plant: any) => plant.name === 'cl-seagrass')).toHaveLength(80);
    expect(anatomy.filter((plant: any) => plant.name === 'cl-kelp')).toHaveLength(25);
    for (const plant of anatomy) {
      expect(plant.finite && plant.lit && plant.colors).toBe(true); expect(plant.substrate).toBe('grass'); expect(plant.radius).toBeGreaterThan(0);
      expect(plant.instances).toBe(plant.name === 'cl-seagrass' ? 7 : 1); expect(plant.vertices).toBe(plant.name === 'cl-seagrass' ? 33 : 57);
    }
    const audit = await page.evaluate(() => (window as any).__plantPrograms);
    for (const kind of ['cl-seagrass', 'cl-kelp']) {
      expect(audit[kind].draws).toBeGreaterThan(0); expect(audit[kind].program?.linked).toBe(true);
      expect(audit[kind].program.shaders).toHaveLength(2); expect(audit[kind].program.shaders.every((shader: any) => shader.compiled)).toBe(true);
    }
    expect(audit['cl-seagrass'].program.shaders.some((shader: any) => shader.source.includes('#define USE_INSTANCING'))).toBe(true);
    await expectRootedPlants(page);
    const initial = await plantState(page); await advance(page, 8); const moving = await plantState(page);
    expect(moving.poses).not.toEqual(initial.poses); expect(moving.stable && moving.buffersUnchanged).toBe(true); expect(moving.disposed).toBe(0);
    // Existing seeded phases naturally cover the ends of the sway range.
    expect(Math.max(...(await rootAttachment(page)).map((plant: any) => Math.abs(plant.angle)))).toBeGreaterThan(.11);
    await expectRootedPlants(page);
    await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click();
    const inspected = await plantState(page); await advance(page, 7);
    expect(await plantState(page)).toEqual(inspected); await expectRootedPlants(page);
    await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await advance(page, 5);
    expect((await plantState(page)).poses).not.toEqual(inspected.poses);
    await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).check();
    await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 2);
    const reduced = await plantState(page); await advance(page, 8);
    expect(await plantState(page)).toEqual(reduced);
    expect((await rootAttachment(page)).every((plant: any) => plant.angle === 0)).toBe(true); await expectRootedPlants(page);
    await page.getByRole('button', { name: 'Help / settings', exact: true }).click(); await page.getByLabel('Reduced motion', { exact: true }).uncheck();
    await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 5);
    const resumed = await plantState(page); expect(resumed.poses).not.toEqual(reduced.poses); expect(resumed.stable && resumed.buffersUnchanged).toBe(true); expect(resumed.disposed).toBe(0);
    await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
    expect(await page.evaluate(() => (window as any).__plantResources.filter((resource: any) => !resource.disposed))).toEqual([]);
  });
}
