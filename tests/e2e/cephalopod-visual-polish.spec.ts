import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab',
  width: 900, height: 1000, layout: 'document',
});
const canvas = 'canvas[role=application]';

async function mount(page: Page, quality: 'low' | 'balanced' = 'low') {
  await harness.mount(page, { cephalopodLab: {
    activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'humboldtSquid',
    huntMode: 'observe', huntSeed: 2741, huntQuality: quality, _threeLoaded: true,
  } });
  await page.evaluate(() => {
    const w = window as any;
    w.__scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
    w.__player = w.__scene.getObjectByName('cl-player');
    w.__floor = w.__scene.getObjectByName('cl-seafloor');
    w.__caustics = w.__scene.getObjectByName('cl-caustics');
    if (!w.__floor || !w.__caustics) throw new Error('Expected named terrain and caustics meshes');
    w.__testStep = 0;
    w.THREE.Clock.prototype.getDelta = function () {
      const dt = w.__testStep;
      w.__testStep = 0;
      return dt;
    };
  });
  await page.locator(canvas).focus();
}

// Advance the live animation loop using simulation time, independent of the
// software renderer's frame rate. The loop still renders while paused.
async function advance(page: Page, frames: number) {
  await page.evaluate(async (count) => {
    const w = window as any;
    for (let i = 0; i < count; i++) {
      w.__testStep = 0.05;
      do {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      } while (w.__testStep !== 0);
    }
  }, frames);
}

async function phase(page: Page) {
  return page.evaluate(() => (window as any).__caustics.material.map.offset.toArray() as number[]);
}

async function terrainSamples(page: Page) {
  return page.evaluate(() => {
    const w = window as any;
    w.__scene.updateMatrixWorld(true);
    const ray = new w.THREE.Raycaster();
    const samples: { x: number; z: number; floorY: number | null; lightY: number | null }[] = [];
    // Cross the shallow reef and its deep shelf, rather than only checking the
    // flat water directly beneath spawn. Raycasts compare rendered surfaces.
    for (const x of [12, 24, 36, 48, 60]) {
      for (const z of [-10, 0, 10]) {
        ray.set(new w.THREE.Vector3(x, 50, z), new w.THREE.Vector3(0, -1, 0));
        ray.far = 200;
        const floorHit = ray.intersectObject(w.__floor, false)[0];
        const lightHit = ray.intersectObject(w.__caustics, false)[0];
        samples.push({ x, z, floorY: floorHit ? floorHit.point.y : null, lightY: lightHit ? lightHit.point.y : null });
      }
    }
    return { samples, tile: w.__floor.position.toArray() as number[] };
  });
}

function expectConformingTerrain(result: Awaited<ReturnType<typeof terrainSamples>>) {
  expect(result.samples.every(p => p.floorY !== null && p.lightY !== null)).toBe(true);
  const depths = result.samples.map(p => p.floorY!);
  expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan(10);
  const separation = result.samples.map(p => p.lightY! - p.floorY!);
  // A thin offset avoids z-fighting; a floating flat light sheet would differ
  // from the shelf by tens of metres and fail these world-space checks.
  expect(Math.min(...separation)).toBeGreaterThanOrEqual(-0.001);
  expect(Math.max(...separation)).toBeLessThan(0.15);
  expect(Math.max(...separation) - Math.min(...separation)).toBeLessThan(0.005);
}

test.describe.configure({ timeout: 180000, retries: 0, mode: 'default' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('low and balanced quality draw real squid scenes without errors and release scene textures', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  for (const quality of ['low', 'balanced'] as const) {
    await mount(page, quality);
    await advance(page, 8);
    const fins = await page.evaluate(() => {
      const w = window as any;
      return w.__player.children.filter((o: any) => /^cl-fin-/.test(o.name)).map((o: any) => {
        const positions = Array.from(o.geometry.attributes.position.array) as number[];
        return { name: o.name, vertices: positions.length / 3, finite: positions.every(Number.isFinite) };
      });
    });
    expect(fins.length).toBeGreaterThan(0);
    expect(fins.every((f: any) => f.vertices > 0 && f.finite)).toBe(true);
    const pixels = await harness.glPixels(page);
    expect(pixels).not.toBeNull();
    expect(pixels!.significantColors).toBeGreaterThan(5);
    expect(pixels!.dominantShare).toBeLessThan(0.97);

    const textureCount = await page.evaluate(() => {
      const w = window as any;
      const textures = new Set<any>();
      const collect = (value: any) => { if (value && value.isTexture) textures.add(value); };
      w.__scene.traverse((o: any) => {
        const materials = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        materials.forEach((material: any) => {
          Object.values(material).forEach(collect);
          Object.values(material.uniforms || {}).forEach((uniform: any) => collect(uniform.value));
        });
      });
      collect(w.__scene.background);
      collect(w.__scene.environment);
      if (!textures.has(w.__floor.material.map) || !textures.has(w.__caustics.material.map)) throw new Error('Terrain textures were not included in the disposal audit');
      w.__textureAudit = Array.from(textures).map((texture: any) => {
        const row = { uuid: texture.uuid, name: texture.name || 'unnamed', disposed: false };
        texture.addEventListener('dispose', () => { row.disposed = true; });
        return row;
      });
      return w.__textureAudit.length;
    });
    expect(textureCount).toBeGreaterThanOrEqual(2);
    await harness.unmount(page);
    expect(await harness.leakedAfterUnmount(page)).toEqual([]);
    expect(await page.evaluate(() => (window as any).__textureAudit.filter((r: any) => !r.disposed))).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('caustics remain attached to reef and shelf terrain after a floor tile shifts', async ({ page }) => {
  await mount(page);
  await advance(page, 3);
  const before = await terrainSamples(page);
  expectConformingTerrain(before);
  await page.evaluate(() => {
    const w = window as any;
    w.__player.position.x = 60;
    w.__player.position.z = 30;
  });
  await advance(page, 3);
  const after = await terrainSamples(page);
  expect(Math.hypot(after.tile[0] - before.tile[0], after.tile[2] - before.tile[2])).toBeGreaterThan(20);
  expectConformingTerrain(after);
});

test('caustic movement freezes during inspection and reduced motion, then resumes', async ({ page }) => {
  await mount(page);
  const playing = await phase(page);
  await advance(page, 10);
  expect(await phase(page)).not.toEqual(playing);

  await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click();
  const inspecting = await phase(page);
  await advance(page, 10);
  expect(await phase(page)).toEqual(inspecting);
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click();
  await advance(page, 8);
  expect(await phase(page)).not.toEqual(inspecting);

  await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
  await page.getByLabel('Reduced motion', { exact: true }).check();
  await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  await advance(page, 2);
  const reduced = await phase(page);
  await advance(page, 10);
  expect(await phase(page)).toEqual(reduced);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
  await page.getByLabel('Reduced motion', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  await advance(page, 8);
  expect(await phase(page)).not.toEqual(reduced);
});
