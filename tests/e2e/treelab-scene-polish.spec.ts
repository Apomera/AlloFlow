import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const probes = `
  const factory = window.StemLab.makeBayViewer;
  window.StemLab.makeBayViewer = function (cfg) {
    const build = cfg.buildScene;
    return factory(Object.assign({}, cfg, { buildScene: function (T, api) {
      const content = build(T, api);
      const scenery = [], grassTints = [];
      api.scene.traverse(function (mesh) {
        if (!mesh.isInstancedMesh) return;
        if (mesh.name.indexOf('tree-distant-') === 0) {
          const g = mesh.geometry;
          scenery.push({ name: mesh.name, count: mesh.count,
            triangles: (g.index ? g.index.count : g.attributes.position.count) / 3 * mesh.count });
        }
        if (mesh.name === 'tree-ground-cover') {
          const color = new T.Color();
          for (let i = 0; i < mesh.count; i++) {
            mesh.getColorAt(i, color);
            grassTints.push([color.r, color.g, color.b]);
          }
        }
      });
      window.__scenePolish = { scenery, grassTints, contrast: !!api.contrast };
      return content;
    } }));
  };
`;
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_treelab.js', toolId: 'treeLab',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true, width: 1365, height: 900, probes });
test.describe.configure({ timeout: 300_000 });
test.use({ viewport: { width: 1365, height: 900 }, video: 'off', trace: 'off',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => { await harness.destroy(page); });

for (const sample of [
  { name: 'seedling', species: 'oak', years: 0, season: 'summer', dark: false, contrast: false },
  { name: 'autumn-oak', species: 'oak', years: 40, season: 'autumn', dark: false, contrast: false },
  { name: 'winter-pine', species: 'pine', years: 35, season: 'winter', dark: false, contrast: false },
  { name: 'dark-willow', species: 'willow', years: 20, season: 'summer', dark: true, contrast: false },
  { name: 'contrast-oak', species: 'oak', years: 20, season: 'summer', dark: false, contrast: true },
]) {
  test(`renders ${sample.name} with a clear focal tree and bounded background geometry`, async ({ page }) => {
    await page.goto(`${harness.url}/__harness`);
    await page.evaluate(sample => {
      const w = window as any, E = w.__alloTreeLabEngine;
      const sp = E.speciesById(sample.species);
      const env = { tempC: 22, light: 0.8, soilWater: 0.7, co2ppm: 420 };
      let tree = E.newTree(sp.id);
      for (let i = 0; i < sample.years; i++) tree = E.simulateYear(tree, sp, env, E.normaliseAlloc());
      w.__mount({ treeLab: { ...env, speciesId: sp.id, tree, season: sample.season } });
      w.__ctx.isDark = sample.dark;
      w.__ctx.isContrast = sample.contrast;
      w.__ctx.reduceMotion = true;
      w.__rerender();
    }, sample);
    await page.waitForFunction(() => !!(window as any).__scenePolish && !!(window as any).__alloTreeLabCam);
    await page.locator('canvas').waitFor();
    // Let the deferred camera frame and WebGL buffer reach the captured view.
    await page.waitForTimeout(600);
    const probe = await page.evaluate(() => (window as any).__scenePolish);
    if (sample.contrast) {
      expect(probe.scenery).toHaveLength(0);
      expect(probe.grassTints).toHaveLength(0);
    } else {
      expect(probe.scenery).toHaveLength(4);
      expect(probe.scenery.reduce((sum: number, item: any) => sum + item.triangles, 0)).toBeLessThan(25_000);
      expect(probe.grassTints.length).toBeGreaterThan(0);
      for (const [r, g, b] of probe.grassTints) {
        expect(r).toBeCloseTo(g, 6);
        expect(g).toBeCloseTo(b, 6);
        expect(r).toBeGreaterThanOrEqual(0.69);
      }
    }
    await page.locator('.allo-tree-viewer-card').screenshot({ path: `.tmp/tree-review/scene-${sample.name}.png` });
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
}
