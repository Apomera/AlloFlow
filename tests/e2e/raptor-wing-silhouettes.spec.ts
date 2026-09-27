import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-wing-silhouettes-2026-09-27';
const probes = `window.AlloPostFXEnabled=false;window.wingRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original(options),render=r.render.bind(r);r.render=function(scene,camera){window.wingScene=scene;window.wingCamera=camera;if(window.wingSkipRender)return;window.wingRenders++;return render(scene,camera);};return r;};})();`;

test.describe('Raptor continuous wing outlines', () => {
  test.describe.configure({ mode: 'serial', timeout: 180000 });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  test.beforeAll(async () => harness.start());
  test.afterAll(async () => harness.stop());
  test.afterEach(async ({ page }) => harness.destroy(page));
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 1100 });
    await page.addInitScript(() => {
      let time = 1000, id = 0, seed = 731;
      const frames = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      performance.now = () => time;
      window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
      window.cancelAnimationFrame = key => frames.delete(key);
      (window as any).wingStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  function frozen(a: any, b: any) {
    for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina']) expect(b[key], key).toEqual(a[key]);
  }
  for (const model of [
    { species: 'peregrine', quality: 'low' }, { species: 'peregrine', quality: 'high' },
    { species: 'greatHorned', quality: 'low' }, { species: 'greatHorned', quality: 'high' },
    { species: 'redTail', quality: 'low' }
  ]) {
    test(`keeps a complete, symmetric, folding wing: ${model.species} ${model.quality}`, async ({ page }) => {
      const errors: string[] = [], label = model.species + '-' + model.quality;
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: model.species,
        flightSession: { speciesId: model.species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: model.quality
      } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
      await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
        c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
        for (let i = 0; i < 8; i++) (window as any).wingStep(25);
      });
      const geometry = await page.evaluate(() => {
        const w = window as any, bird = w.wingScene.getObjectByName('raptor-head-rig').parent;
        const left = bird.getObjectByName('left-tapered-wing'), right = bird.getObjectByName('right-tapered-wing');
        const vanes = bird.getObjectByName('layered-flight-feathers--1'), opposite = bird.getObjectByName('layered-flight-feathers-1');
        w.wingMeshes = [left, right, vanes, opposite];
        const position = right.geometry.attributes.position, uv = right.geometry.attributes.uv, rows: any[] = [];
        for (let start = 0; start < position.count; start += 7) {
          const xs: number[] = [], ys: number[] = [], zs: number[] = [];
          for (let j = start; j < start + 7; j++) { xs.push(position.getX(j)); ys.push(position.getY(j)); zs.push(position.getZ(j)); }
          rows.push({ u: uv.getX(start), x: xs[0], width: Math.max(...zs) - Math.min(...zs), height: Math.max(...ys) - Math.min(...ys) });
        }
        function nearest(u: number) { return rows.reduce((best, row) => Math.abs(row.u - u) < Math.abs(best.u - u) ? row : best); }
        let mirrorError = 0;
        [[left, right], [vanes, opposite]].forEach(([a, b]) => {
          const pairs = [[a.geometry.attributes.position, b.geometry.attributes.position], [a.geometry.morphAttributes.position[0], b.geometry.morphAttributes.position[0]]];
          pairs.forEach(([p, q]) => { for (let i = 0; i < p.count; i++) mirrorError = Math.max(mirrorError, Math.abs(p.getX(i) + q.getX(i)), Math.abs(p.getY(i) - q.getY(i)), Math.abs(p.getZ(i) - q.getZ(i))); });
        });
        const outerX = Math.max(...Array.from({ length: opposite.geometry.attributes.position.count }, (_, i) => opposite.geometry.attributes.position.getX(i)));
        return { vertices: position.count, outlineRatio: rows[rows.length - 1].width / nearest(0.6).width,
          shoulderRatio: nearest(0.9).width / nearest(0.6).width, terminalHeight: rows[rows.length - 1].height,
          featherCoverage: outerX / rows[rows.length - 1].x, mirrorError,
          finite: w.wingMeshes.every(mesh => [mesh.geometry.attributes.position, mesh.geometry.attributes.normal, mesh.geometry.attributes.uv, mesh.geometry.morphAttributes.position[0], mesh.geometry.morphAttributes.normal[0]].every(attr => Array.from(attr.array).every(Number.isFinite))),
          wingMeshCount: left.parent.children.length + right.parent.children.length,
          buffers: w.wingMeshes.map(mesh => ({ vertices: mesh.geometry.attributes.position.count, version: mesh.geometry.attributes.position.version, morphVersion: mesh.geometry.morphAttributes.position[0].version })) };
      });
      expect(geometry.finite).toBe(true); expect(geometry.mirrorError).toBeLessThan(0.000001);
      expect(geometry.vertices).toBe(model.quality === 'low' ? 77 : 133);
      if (model.species !== 'redTail') {
        expect(geometry.outlineRatio).toBeLessThan(0.035); expect(geometry.terminalHeight).toBeLessThan(0.002);
        expect(geometry.featherCoverage).toBeGreaterThan(0.985); expect(geometry.featherCoverage).toBeLessThan(1.01);
        expect(geometry.wingMeshCount).toBe(4);
        if (model.species === 'peregrine') expect(geometry.shoulderRatio).toBeLessThan(0.45);
        else expect(geometry.shoulderRatio).toBeGreaterThan(0.6);
      } else {
        expect(geometry.outlineRatio).toBeGreaterThan(0.5); expect(geometry.wingMeshCount).toBe(12);
        expect((await snapshot(page)).leftPrimaryFeatherCount).toBe(4);
      }
      const flying = await snapshot(page);
      await page.locator('[data-raptor-study-button]').click(); await page.locator('[data-study-view=above]').click();
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-flight.png' });
      await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing');
      if(model.species==='peregrine') await expect(page.locator('#rh-study-observation-copy')).toContainText('Trace the pointed wing tip');
      else if(model.species==='greatHorned') await expect(page.locator('#rh-study-observation-copy')).toContainText('Follow the rounded outer edge');
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-wing.png' });
      frozen(flying, await snapshot(page));
      const renders = await page.evaluate(() => (window as any).wingRenders);
      await page.evaluate(() => (window as any).wingStep(60000));
      expect(await page.evaluate(() => (window as any).wingRenders)).toBe(renders);
      await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
      await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
        const w = window as any; c._rhCommand('perchPractice'); w.wingSkipRender = true;
        for (let i = 0; i < 45; i++) w.wingStep(25);
        w.wingSkipRender = false; w.wingStep(25);
      });
      expect((await snapshot(page)).wingRestSpan).toBeLessThan(0.32);
      expect((await snapshot(page)).wingFold).toBeGreaterThan(0.999);
      await page.locator('[data-raptor-study-button]').click();
      await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing');
      await expect(page.locator('#rh-study-observation-copy')).toContainText('Trace the folded wing');
      if (model.species === 'greatHorned' && model.quality === 'low') {
        await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
        await page.locator('[data-study-view=side]').click();
      }
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-folded.png' });
      await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
      await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
        const w = window as any; c._rhCommand('hold', { key: ' ', pressed: true }); w.wingSkipRender = true;
        for (let i = 0; i < 35; i++) w.wingStep(25);
        c._rhCommand('hold', { key: ' ', pressed: false }); w.wingSkipRender = false; w.wingStep(25);
      });
      const relaunched = await snapshot(page);
      expect(relaunched.landed).toBe(false); expect(relaunched.wingRestSpan).toBeGreaterThan(0.95); expect(relaunched.wingFold).toBeLessThan(0.003);
      expect(await page.evaluate(() => (window as any).wingMeshes.map(mesh => ({ vertices: mesh.geometry.attributes.position.count, version: mesh.geometry.attributes.position.version, morphVersion: mesh.geometry.morphAttributes.position[0].version })))).toEqual(geometry.buffers);
      expect(relaunched.drawCalls).toBeLessThan(170); expect(errors).toEqual([]);
      expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    });
  }
});
