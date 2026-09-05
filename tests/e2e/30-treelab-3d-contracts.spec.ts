import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const VALID_PARTS = ['crown', 'trunk', 'roots', 'clones'] as const;

const probes = `
(function () {
  var VALID = ['crown', 'trunk', 'roots', 'clones'];
  window.__tree3dProbe = {
    builds: 0,
    pickIds: [],
    meshKeys: [],
    anchorIds: [],
    matrixWrites: 0,
    frameCalls: 0,
    sceneProps: null,
    apiReduced: false,
    instancedBatches: [],
    trunkStats: null
  };

  var originalSetMatrixAt = THREE.InstancedMesh.prototype.setMatrixAt;
  THREE.InstancedMesh.prototype.setMatrixAt = function () {
    window.__tree3dProbe.matrixWrites += 1;
    return originalSetMatrixAt.apply(this, arguments);
  };

  var originalFactory = window.StemLab.makeBayViewer;
  window.StemLab.makeBayViewer = function (cfg) {
    var originalBuild = cfg.buildScene;
    var wrapped = Object.assign({}, cfg, {
      buildScene: function (THREERef, api) {
        var content = originalBuild(THREERef, api);
        var probe = window.__tree3dProbe;
        var meshes = content.meshes || {};
        var anchorMaps = [
          content.labelAnchors,
          content.labelTargets,
          content.anchors,
          content.labels
        ];

        probe.applyStillPhase = function (phase) {
          content.frame(Date.now(), Object.assign({}, api.sceneProps, { visualPhase: phase }), true);
          var arrays = [];
          meshes.crown.traverse(function (mesh) {
            if (mesh.isInstancedMesh) arrays.push(Array.from(mesh.instanceMatrix.array));
          });
          return JSON.stringify(arrays);
        };
        probe.builds += 1;
        probe.pickIds = (content.picks || []).map(function (mesh) {
          return mesh && mesh.userData ? (mesh.userData.partId || null) : null;
        });
        probe.meshKeys = Object.keys(meshes);
        probe.anchorIds = VALID.filter(function (id) {
          for (var i = 0; i < anchorMaps.length; i += 1) {
            if (anchorMaps[i] && anchorMaps[i][id]) return true;
          }
          var data = meshes[id] && meshes[id].userData;
          return !!(data && (data.labelAnchor || data.labelTarget || data.anchor));
        });
        var batches = [];
        if (api.scene && typeof api.scene.traverse === 'function') {
          api.scene.traverse(function (object) {
            if (!object || !object.isInstancedMesh) return;
            batches.push({
              count: typeof object.count === 'number' ? object.count : null,
              geometry: object.geometry ? object.geometry.type : null,
              material: object.material ? object.material.type : null,
              partId: object.userData ? (object.userData.partId || null) : null
            });
          });
        }
        var trunkMeshCount = 0;
        var trunkVertices = [];
        if (meshes.trunk && typeof meshes.trunk.traverse === 'function') {
          meshes.trunk.traverse(function (object) {
            if (!object || !object.isMesh) return;
            trunkMeshCount += 1;
            var position = object.geometry && object.geometry.getAttribute
              ? object.geometry.getAttribute('position') : null;
            trunkVertices.push(position ? position.count : 0);
          });
        }
        var trunkPickCount = (content.picks || []).filter(function (mesh) {
          return !!(mesh && mesh.userData && mesh.userData.partId === 'trunk');
        }).length;
        probe.apiReduced = !!api.reduced;
        probe.instancedBatches = batches;
        probe.trunkStats = {
          meshCount: trunkMeshCount,
          pickCount: trunkPickCount,
          vertexCounts: trunkVertices,
          maxVertices: trunkVertices.length ? Math.max.apply(Math, trunkVertices) : 0
        };
        probe.sceneProps = {
          reduced: !!(api.sceneProps && api.sceneProps.reduced),
          wind: api.sceneProps && api.sceneProps.wind
        };

        var originalFrame = content.frame;
        if (typeof originalFrame === 'function') {
          content.frame = function () {
            probe.frameCalls += 1;
            return originalFrame.apply(this, arguments);
          };
        }
        return content;
      }
    });
    return originalFactory.call(this, wrapped);
  };
})();
`;

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_treelab.js',
  toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'],
  width: 1060,
  height: 920,
  probes,
});

test.describe.configure({ timeout: 300_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountTree(
  page: import('@playwright/test').Page,
  options: {
    reduced?: boolean;
    season?: 'spring' | 'summer' | 'autumn' | 'winter';
    clones?: number;
  } = {},
) {
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(
    () => !!(window as any).StemLab?._registry?.treeLab,
    null,
    { timeout: 30_000 },
  );
  await page.evaluate(({ reduced, season, clones }) => {
    const E = (window as any).__alloTreeLabEngine;
    const sp = E.speciesById('oak');
    let tree = E.newTree('oak');
    const env = { tempC: 22, light: 0.85, co2ppm: 420, soilWater: 0.75 };
    const alloc = { leaf: 0.3, root: 0.2, wood: 0.35, repro: 0.05, store: 0.1 };
    for (let year = 0; year < 45 && tree.alive; year += 1) {
      tree = E.simulateYear(tree, sp, env, alloc);
    }
    (window as any).__mount({
      treeLab: {
        view: 'grow',
        speciesId: 'oak',
        tree,
        season: season || 'summer',
        light: env.light,
        soilWater: env.soilWater,
        spreadTotals: { diverse: 0, clonal: clones == null ? 3 : clones },
      },
    });
    // __mount creates ctx synchronously and React commits asynchronously, so setting
    // this immediately makes the first committed 3D scene the reduced-motion scene.
    (window as any).__ctx.reduceMotion = !!reduced;
    if (reduced) (window as any).__rerender();
  }, {
    reduced: !!options.reduced,
    season: options.season || 'summer',
    clones: options.clones == null ? 3 : options.clones,
  });

  await page.waitForSelector('#wrap canvas', { timeout: 30_000 });
  await page.waitForFunction(
    () => (window as any).__tree3dProbe?.builds > 0,
    null,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(900);
}

test('scene picking, mesh ownership, and label anchors use the four anatomy IDs', async ({ page }) => {
  await mountTree(page);
  const scene = await page.evaluate(() => {
    const probe = (window as any).__tree3dProbe;
    return {
      pickIds: [...probe.pickIds],
      meshKeys: [...probe.meshKeys],
      anchorIds: [...probe.anchorIds],
    };
  });

  expect(scene.pickIds.length, 'the scene exposed no raycast targets').toBeGreaterThan(0);
  expect(scene.pickIds.every((id: unknown) =>
    typeof id === 'string' && (VALID_PARTS as readonly string[]).includes(id)),
  `invalid partId values: ${JSON.stringify(scene.pickIds)}`).toBe(true);
  expect([...new Set(scene.pickIds)].sort(),
    'every anatomy group needs at least one real pick target')
    .toEqual([...VALID_PARTS].sort());

  expect(scene.meshKeys).not.toContain('sky');
  expect(scene.meshKeys).not.toContain('sun');
  for (const id of VALID_PARTS) expect(scene.meshKeys).toContain(id);
  expect(scene.anchorIds.sort(),
    'HTML label chips need an explicit stable anchor for every anatomy group')
    .toEqual([...VALID_PARTS].sort());
});

test('reduced=true and wind=0 leave instanced matrices unchanged after build', async ({ page }) => {
  await mountTree(page, { reduced: true });
  await page.evaluate(() => {
    const probe = (window as any).__tree3dProbe;
    probe.matrixWrites = 0;
    probe.frameCalls = 0;
  });
  await page.waitForTimeout(700);

  const motion = await page.evaluate(() => {
    const probe = (window as any).__tree3dProbe;
    return {
      matrixWrites: probe.matrixWrites,
      frameCalls: probe.frameCalls,
      sceneProps: probe.sceneProps,
    };
  });
  expect(motion.sceneProps).toEqual({ reduced: true, wind: 0 });
  expect(motion.frameCalls, 'the assertion never observed a live scene frame').toBeGreaterThan(1);
  expect(motion.matrixWrites,
    'reduced motion still recomposed canopy or weather instance matrices').toBe(0);
});


test('OS reduced motion suppresses airborne autumn leaves at scene construction', async ({ page }) => {
  // The preference must exist before navigation: the shared viewer snapshots it while
  // building the renderer. This deliberately leaves ctx.reduceMotion false so the
  // system preference, not the app override, is the mechanism under test.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mountTree(page, { season: 'autumn', reduced: false, clones: 0 });

  await page.evaluate(() => {
    const probe = (window as any).__tree3dProbe;
    probe.matrixWrites = 0;
    probe.frameCalls = 0;
  });
  await page.waitForTimeout(700);

  const state = await page.evaluate(() => {
    const probe = (window as any).__tree3dProbe;
    const airborne = probe.instancedBatches.filter((batch: any) =>
      batch.count === 44 &&
      batch.geometry === 'PlaneGeometry' &&
      batch.material === 'MeshPhongMaterial' &&
      !batch.partId);
    const settledLitter = probe.instancedBatches.filter((batch: any) =>
      batch.count === 52 && batch.geometry === 'CircleGeometry');
    return {
      apiReduced: probe.apiReduced,
      sceneProps: probe.sceneProps,
      contextReduced: !!(window as any).__ctx.reduceMotion,
      airborneCount: airborne.length,
      settledLitterCount: settledLitter.length,
      matrixWrites: probe.matrixWrites,
      frameCalls: probe.frameCalls,
    };
  });

  expect(state.contextReduced,
    'ctx.reduceMotion must remain false so this isolates the OS preference').toBe(false);
  expect(state.apiReduced,
    'the shared viewer did not report the build-time OS preference to the scene').toBe(true);
  expect(state.sceneProps.reduced,
    'app state unexpectedly claimed responsibility for reduced motion').toBe(false);
  expect(state.airborneCount,
    'autumn built an airborne leaf batch that would hang motionless in the scene').toBe(0);
  expect(state.settledLitterCount,
    'reduced motion should preserve static seasonal ground evidence').toBe(1);
  expect(state.frameCalls, 'the reduced scene was not observed in the live RAF loop')
    .toBeGreaterThan(1);
  expect(state.matrixWrites,
    'the reduced scene rewrote instanced matrices after construction').toBe(0);
});

test('bare winter broadleaf batches the branch network and builds without errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await mountTree(page, { season: 'winter', reduced: false, clones: 0 });
  const state = await page.evaluate(() => {
    const probe = (window as any).__tree3dProbe;
    const health = (window as any).__glLive();
    return {
      builds: probe.builds,
      trunk: probe.trunkStats,
      runtimeErrors: [...((window as any).__events?.errors || [])],
      health,
    };
  });

  expect(state.builds).toBeGreaterThan(0);
  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
  expect(state.runtimeErrors, state.runtimeErrors.join('\n')).toEqual([]);
  expect(state.health, 'winter scene produced no live WebGL canvas').not.toBeNull();
  expect(state.health.lost, 'winter scene lost its WebGL context during construction').toBe(false);

  expect(state.trunk.meshCount,
    'bare winter branches regressed to hundreds of independently rendered meshes')
    .toBeLessThanOrEqual(6);
  expect(state.trunk.pickCount,
    'bare winter branches regressed to hundreds of raycast targets')
    .toBeLessThanOrEqual(6);
  expect(state.trunk.maxVertices,
    'the batched winter silhouette is missing its dense branch geometry')
    .toBeGreaterThan(5000);
});

test('keyboard anatomy controls update selectedPart when the staged UI exposes them', async ({ page }) => {
  await mountTree(page);
  const anatomy = page.locator([
    '[data-tree-anatomy]',
    '[role="group"][aria-label*="anatom" i]',
    '[role="group"][aria-label*="tree part" i]',
  ].join(', ')).first();
  const dataButtons = page.locator('button[data-tree-part], button[data-part-id]');
  const hasGroup = await anatomy.count() > 0;
  const hasDataButtons = await dataButtons.count() > 0;

  test.skip(!hasGroup && !hasDataButtons,
    'This implementation does not expose the optional keyboard anatomy controls.');
  const scope = hasGroup ? anatomy : page.locator('#wrap');

  const controls: Array<[typeof VALID_PARTS[number], RegExp]> = [
    ['crown', /crown|leaves/i],
    ['trunk', /trunk|wood/i],
    ['roots', /root system|roots/i],
    ['clones', /clonal offspring|clones/i],
  ];

  for (const [id, name] of controls) {
    const dataButton = page.locator(
      'button[data-tree-part="' + id + '"], button[data-part-id="' + id + '"]',
    );
    const button = await dataButton.count() > 0
      ? dataButton.first()
      : scope.getByRole('button', { name }).first();
    await expect(button, `no keyboard control for ${id}`).toBeVisible();
    await button.focus();
    await page.keyboard.press('Enter');
    await expect.poll(
      () => page.evaluate(() => (window as any).__toolData?.treeLab?.selectedPart || null),
      { message: `keyboard activation did not select ${id}` },
    ).toBe(id);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
});
// Resting poses must still change when the learner changes the seasonal state.
test('reduced motion updates seasonal leaf state but reuses an unchanged resting pose', async ({ page }) => {
  await mountTree(page, { reduced: true, season: 'autumn' });
  const result = await page.evaluate(() => {
    const probe = (window as any).__tree3dProbe;
    const spring = probe.applyStillPhase(0.20);
    probe.matrixWrites = 0;
    const stillSpring = probe.applyStillPhase(0.20);
    const restingWrites = probe.matrixWrites;
    probe.matrixWrites = 0;
    const lateAutumn = probe.applyStillPhase(0.94);
    return { restingWrites, stateWrites: probe.matrixWrites,
      restingUnchanged: spring === stillSpring, seasonChanged: spring !== lateAutumn };
  });
  expect(result.restingWrites).toBe(0);
  expect(result.restingUnchanged).toBe(true);
  expect(result.stateWrites).toBeGreaterThan(0);
  expect(result.seasonChanged).toBe(true);
});
