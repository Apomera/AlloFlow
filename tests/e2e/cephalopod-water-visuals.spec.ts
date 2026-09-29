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

async function mount(page: Page, species = 'dumboOcto', quality: 'low' | 'balanced' = 'low') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: species, huntMode: 'observe', huntSeed: 2741, huntQuality: quality, _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any;
    w.__scene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene;
    w.__player = w.__scene.getObjectByName('cl-player');
    w.__water = w.__scene.getObjectByName('cl-water-particles');
    if (!w.__water?.isPoints) throw new Error('Expected the actual named water-particle Points object');
    w.__testStep = 0;
    w.THREE.Clock.prototype.getDelta = function () { const dt = w.__testStep; w.__testStep = 0; return dt; };
    w.__scene.children.forEach((object: any) => {
      if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9;
    });
    w.__waterOwned = { geometry: w.__water.geometry, material: w.__water.material, attributes: Object.fromEntries(Object.entries(w.__water.geometry.attributes).map(([name, attribute]: [string, any]) => [name, { attribute, array: attribute.array }])) };
    w.__renderAudit = { water: { draws: 0, programs: [] }, eye: { draws: 0, programs: [] } };
    function watch(object: any, kind: 'water' | 'eye') {
      const original = object.onAfterRender;
      object.onAfterRender = function (renderer: any, scene: any, camera: any, geometry: any, material: any, group: any) {
        original.call(this, renderer, scene, camera, geometry, material, group);
        const row = w.__renderAudit[kind]; row.draws++;
        if (kind === 'water') { w.__waterCamera = camera; w.__waterRenderer = renderer; }
        const gl = renderer.getContext(), program = gl.getParameter(gl.CURRENT_PROGRAM);
        if (!row.programs.some((entry: any) => entry.program === program)) {
          // These are the native GPU shaders used by a submitted scene object,
          // rather than an uncompiled onBeforeCompile string or test renderer.
          const cap = kind === 'water' ? gl.getUniformLocation(program, 'clParticleMaxSize') : null;
          row.programs.push({ program, linked: gl.getProgramParameter(program, gl.LINK_STATUS), maxCssDiameter: cap === null ? null : gl.getUniform(program, cap) / renderer.getPixelRatio(), shaders: gl.getAttachedShaders(program).map((shader: any) => ({ compiled: gl.getShaderParameter(shader, gl.COMPILE_STATUS), type: gl.getShaderParameter(shader, gl.SHADER_TYPE), source: gl.getShaderSource(shader) })) });
        }
      };
    }
    watch(w.__water, 'water');
    const eyes: any[] = []; w.__eyeMeshes = [];
    w.__player.traverse((object: any) => {
      if (object.isMesh && /^cl-(eye-|iris|pupil)/.test(object.name)) w.__eyeMeshes.push(object);
      if (object.isMesh && object.name === 'cl-pupil') { eyes.push(object); watch(object, 'eye'); }
    });
    if (eyes.length !== 2) throw new Error('Expected the two actual pupil meshes');
    w.__eyes = eyes;
  });
  await page.locator(canvas).focus();
  await advance(page, 3);
}

async function field(page: Page) {
  return page.evaluate(() => {
    const w = window as any, water = w.__water, owned = w.__waterOwned, p = water.geometry.attributes.position;
    w.__scene.updateMatrixWorld(true);
    const offsets: number[][] = [], projected: number[][] = [];
    const point = new w.THREE.Vector3();
    for (let index = 0; index < p.count; index++) {
      point.fromBufferAttribute(p, index).applyMatrix4(water.matrixWorld);
      offsets.push(point.clone().sub(w.__player.position).toArray());
      if (w.__waterCamera) projected.push(point.project(w.__waterCamera).toArray());
    }
    return { player: w.__player.position.toArray(), offsets, inView: projected.filter(value => value.every(Number.isFinite) && Math.abs(value[0]) < 1 && Math.abs(value[1]) < 1 && Math.abs(value[2]) < 1).length,
      draws: w.__renderAudit.water.draws, finite: Object.values(water.geometry.attributes).every((attribute: any) => Array.from(attribute.array).every(Number.isFinite)),
      scale: Array.from(water.geometry.attributes.clParticleScale.array) as number[], brightness: Array.from(water.geometry.attributes.clParticleBrightness.array) as number[],
      stable: water.geometry === owned.geometry && water.material === owned.material && Object.entries(owned.attributes).every(([name, saved]: [string, any]) => water.geometry.attributes[name] === saved.attribute && water.geometry.attributes[name].array === saved.array) };
  });
}

function expectSurroundingField(value: Awaited<ReturnType<typeof field>>) {
  expect(value.offsets).toHaveLength(200);
  expect(value.finite && value.stable).toBe(true);
  expect(value.scale).toHaveLength(200); expect(value.brightness).toHaveLength(200);
  expect(Math.min(...value.scale)).toBeGreaterThanOrEqual(.64); expect(Math.max(...value.scale)).toBeLessThanOrEqual(1.36);
  expect(Math.min(...value.brightness)).toBeGreaterThanOrEqual(.54); expect(Math.max(...value.brightness)).toBeLessThanOrEqual(1.01);
  expect(Math.max(...value.scale) - Math.min(...value.scale)).toBeGreaterThan(.25);
  expect(Math.max(...value.brightness) - Math.min(...value.brightness)).toBeGreaterThan(.2);
  expect(value.inView).toBeGreaterThan(0);
  for (const offset of value.offsets) {
    expect(Math.abs(offset[0])).toBeLessThanOrEqual(18.01);
    expect(Math.abs(offset[1])).toBeLessThanOrEqual(8.01);
    expect(Math.abs(offset[2])).toBeLessThanOrEqual(18.01);
  }
  expect(value.offsets.some(offset => offset[1] < -2)).toBe(true);
  expect(value.offsets.some(offset => offset[1] > 2)).toBe(true);
}

async function particlePose(page: Page) {
  return page.evaluate(() => {
    const water = (window as any).__water;
    return { position: water.position.toArray(), quaternion: water.quaternion.toArray(), scale: water.scale.toArray(), attributes: Object.fromEntries(Object.entries(water.geometry.attributes).map(([name, attribute]: [string, any]) => [name, Array.from(attribute.array)])) };
  });
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => {
  const events: string[] = []; errors.set(page, events);
  page.on('pageerror', error => events.push(error.message));
  page.on('console', message => { if (message.type() === 'error') events.push(message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

for (const [quality, species] of [['low', 'cuttlefish'], ['balanced', 'bobtailSquid']] as const) {
  test(`${quality} water particles and ${species} eyes submit successfully linked real GPU shaders`, async ({ page }) => {
    await mount(page, species, quality);
    await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click();
    await advance(page, 2);
    const audit = await page.evaluate(() => {
      const w = window as any;
      return { water: { draws: w.__renderAudit.water.draws, transparent: w.__water.material.transparent, depthWrite: w.__water.material.depthWrite, opacity: w.__water.material.opacity, programs: w.__renderAudit.water.programs.map(({ program, ...entry }: any) => entry) },
        eye: { draws: w.__renderAudit.eye.draws, names: w.__eyes.map((eye: any) => eye.material.name), programs: w.__renderAudit.eye.programs.map(({ program, ...entry }: any) => entry) } };
    });
    for (const object of [audit.water, audit.eye]) {
      expect(object.draws).toBeGreaterThan(0); expect(object.programs.length).toBeGreaterThan(0);
      for (const program of object.programs) {
        expect(program.linked).toBe(true); expect(program.shaders).toHaveLength(2);
        expect(program.shaders.every((shader: any) => shader.compiled)).toBe(true);
      }
    }
    expect(audit.eye.names).toEqual(['cl-swimmer-pupil-material', 'cl-swimmer-pupil-material']);
    expect(audit.eye.programs.some((program: any) => program.shaders.some((shader: any) => shader.source.includes('clSwimEyeN')))).toBe(true);
    expect(audit.water.transparent).toBe(true); expect(audit.water.depthWrite).toBe(false);
    expect(audit.water.opacity).toBeGreaterThan(0); expect(audit.water.opacity).toBeLessThan(1);
    for (const program of audit.water.programs) {
      expect(program.maxCssDiameter).toBeGreaterThan(0); expect(program.maxCssDiameter).toBeLessThanOrEqual(3.01);
      const compiledSource = program.shaders.map((shader: any) => shader.source).join('\n');
      expect(compiledSource).toContain('clParticleScale'); expect(compiledSource).toContain('clParticleMaxSize');
      expect(compiledSource).toContain('clParticleDepth'); expect(compiledSource).toContain('gl_PointCoord');
    }
    expectSurroundingField(await field(page));
  });
}

test('the particle field stays around deep and distant swimmers and still submits visible points after travel', async ({ page }) => {
  await mount(page);
  const initial = await field(page);
  expect(initial.player[1]).toBeLessThan(-8);
  expectSurroundingField(initial);
  // Move only horizontal world coordinates as the existing recycle fixtures
  // do. Actual Dive input drives the simulation's authoritative depth state.
  await page.evaluate(() => { const w = window as any; w.__player.position.x = 640; w.__player.position.z = -450; });
  await page.keyboard.down('KeyZ'); await advance(page, 55); await page.keyboard.up('KeyZ');
  const traveled = await field(page);
  expect(traveled.player[1]).toBeLessThan(-20);
  expect(Math.hypot(traveled.player[0] - initial.player[0], traveled.player[2] - initial.player[2])).toBeGreaterThan(500);
  expect(traveled.draws).toBeGreaterThan(initial.draws);
  expectSurroundingField(traveled);
});

test('water motion freezes for inspection and reduced motion, resumes, and releases all owned resources on exit', async ({ page }) => {
  await mount(page);
  const live = await particlePose(page); await advance(page, 6);
  expect(await particlePose(page)).not.toEqual(live);
  await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click();
  const inspected = await particlePose(page); await advance(page, 8);
  expect(await particlePose(page)).toEqual(inspected);
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click(); await advance(page, 5);
  expect(await particlePose(page)).not.toEqual(inspected);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
  await page.getByLabel('Reduced motion', { exact: true }).check();
  await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 2);
  const reduced = await particlePose(page); await advance(page, 8);
  expect(await particlePose(page)).toEqual(reduced);
  expect((await field(page)).stable).toBe(true);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
  await page.getByLabel('Reduced motion', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await advance(page, 5);
  expect(await particlePose(page)).not.toEqual(reduced);
  const resourceCount = await page.evaluate(() => {
    const w = window as any, resources = new Set<any>();
    for (const object of [w.__water, ...w.__eyeMeshes]) {
      resources.add(object.geometry); resources.add(object.material);
      Object.values(object.material).forEach((value: any) => { if (value?.isTexture) resources.add(value); });
      Object.values(object.material.uniforms || {}).forEach((uniform: any) => { if (uniform.value?.isTexture) resources.add(uniform.value); });
    }
    w.__waterResourceAudit = Array.from(resources).map((resource: any) => {
      const row = { uuid: resource.uuid, disposed: false }; resource.addEventListener('dispose', () => { row.disposed = true; }); return row;
    });
    return resources.size;
  });
  expect(resourceCount).toBeGreaterThanOrEqual(5);
  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.evaluate(() => (window as any).__waterResourceAudit.filter((resource: any) => !resource.disposed))).toEqual([]);
});
