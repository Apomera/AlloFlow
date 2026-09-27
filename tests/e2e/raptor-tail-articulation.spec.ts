import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-tail-articulation-2026-09-27';
const probes = `window.AlloPostFXEnabled=false;window.fanRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.fanScene=scene;window.fanCamera=camera;if(window.fanSkipRender)return;window.fanRenders++;return render(scene,camera);};return r;};})();`;

test.describe('Raptor articulated tail feathers', () => {
  test.describe.configure({ mode: 'serial', timeout: 300000 });
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_raptorhunt.js', toolId: 'raptorHunt', width: 880, height: 680, appStyles: true, probes });
  test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
  test.afterEach(async ({ page }) => harness.destroy(page));
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 960, height: 1100 });
    await page.addInitScript(() => {
      let time = 1000, id = 0, seed = 731; const frames = new Map<number, FrameRequestCallback>();
      Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      performance.now = () => time;
      window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; }; window.cancelAnimationFrame = key => frames.delete(key);
      (window as any).fanStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function snapshot(page: any) {
    return page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      const w = window as any, tail = w.fanScene.getObjectByName('fan-tail-silhouette');
      return { ...c._rhSnapshot(), tailScale: tail.scale.toArray(), tailMorphs: tail.morphTargetInfluences.slice() };
    });
  }
  function frozen(a: any, b: any) {
    for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'tailScale', 'tailMorphs']) expect(b[key], key).toEqual(a[key]);
  }
  async function inspect(page: any) {
    await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('tail');
  }
  async function fit(page: any) {
    return page.evaluate(() => {
      const w = window as any, T = w.THREE, tail = w.fanScene.getObjectByName('fan-tail-silhouette'), p = tail.geometry.attributes.position;
      tail.updateWorldMatrix(true, false);
      const points = Array.from({ length: p.count }, (_, i) => {
        const base = new T.Vector3().fromBufferAttribute(p, i), v = base.clone();
        tail.geometry.morphAttributes.position.forEach((target, j) => v.addScaledVector(new T.Vector3().fromBufferAttribute(target, i).sub(base), tail.morphTargetInfluences[j]));
        return v.applyMatrix4(tail.matrixWorld).project(w.fanCamera);
      });
      const stage = document.querySelector('[data-raptor-flight-stage]')!.getBoundingClientRect(), panel = document.querySelector('.rh-study-panel')!.getBoundingClientRect(), header = document.querySelector('.rh-study-header')!.getBoundingClientRect();
      return { left: (1 + Math.min(...points.map(p => p.x))) * stage.width / 2, right: (1 + Math.max(...points.map(p => p.x))) * stage.width / 2,
        top: (1 - Math.max(...points.map(p => p.y))) * stage.height / 2, bottom: (1 - Math.min(...points.map(p => p.y))) * stage.height / 2,
        width: stage.width, panelTop: panel.top - stage.top, headerBottom: header.bottom - stage.top };
    });
  }
  function fits(bounds: any) {
    expect(bounds.left).toBeGreaterThan(8); expect(bounds.right).toBeLessThan(bounds.width - 8);
    expect(bounds.top).toBeGreaterThan(bounds.headerBottom); expect(bounds.bottom).toBeLessThan(bounds.panelTop - 8);
    expect(bounds.right - bounds.left).toBeGreaterThan(90);
  }
  for (const model of [
    { species: 'peregrine', quality: 'low' }, { species: 'redTail', quality: 'high' },
    { species: 'greatHorned', quality: 'low' }, { species: 'osprey', quality: 'high' }
  ]) test(`fans without stretching and preserves study views: ${model.species} ${model.quality}`, async ({ page }) => {
    const errors: string[] = [], label = model.species + '-' + model.quality;
    page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: model.species,
      flightSession: { speciesId: model.species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: model.quality,
      activeInvestigation: 'speed', investigations: { speed: { prediction: 'The tail will spread farther when I pull up.' } }
    } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 }); for (let i = 0; i < 8; i++) (window as any).fanStep(25);
    });
    const structure = await page.evaluate(() => {
      const w = window as any, T = w.THREE, tail = w.fanScene.getObjectByName('fan-tail-silhouette'), g = tail.geometry, p = g.attributes.position;
      w.fanTail = tail; w.fanMaterial = tail.material;
      const poses = [p, ...g.morphAttributes.position], stride = p.count / 12, point = (attr, i) => new T.Vector3().fromBufferAttribute(attr, i);
      let maxLengthError = 0, maxWidthError = 0, maxRootError = 0, minArea = Infinity;
      for (let f = 0; f < 12; f++) {
        const root = f * stride + 1, tip = (f + 1) * stride - 1, sample = f * stride + 6;
        for (const pose of poses) {
          maxRootError = Math.max(maxRootError, point(pose, root).distanceTo(point(p, root)));
          maxLengthError = Math.max(maxLengthError, Math.abs(point(pose, tip).distanceTo(point(pose, root)) - point(p, tip).distanceTo(point(p, root))));
          maxWidthError = Math.max(maxWidthError, Math.abs(point(pose, sample).distanceTo(point(pose, sample + 2)) - point(p, sample).distanceTo(point(p, sample + 2))));
        }
      }
      for (const pose of poses) for (let i = 0; i < g.index.count; i += 3) {
        const a = point(pose, g.index.getX(i)), b = point(pose, g.index.getX(i + 1)), c = point(pose, g.index.getX(i + 2));
        minArea = Math.min(minArea, b.sub(a).cross(c.sub(a)).length());
      }
      const widths = poses.map(attr => { const x = Array.from({ length: attr.count }, (_, i) => attr.getX(i)); return Math.max(...x) - Math.min(...x); });
      const vanes = tail.parent.getObjectByName('layered-flight-feathers--1').material;
      return { vertices: p.count, triangles: g.index.count / 3, poses: g.morphAttributes.position.map(attr => attr.name), widths,
        maxRootError, maxLengthError, maxWidthError, minArea,
        finite: [...poses, g.attributes.normal, g.attributes.uv, g.attributes.rhTailAlong, ...g.morphAttributes.normal].every(attr => Array.from(attr.array).every(Number.isFinite)),
        normalError: Math.max(...[g.attributes.normal, ...g.morphAttributes.normal].flatMap(attr => Array.from({ length: attr.count }, (_, i) => Math.abs(point(attr, i).length() - 1)))),
        version: [p.version, ...g.morphAttributes.position.map(attr => attr.version)],
        textures: [tail.material.map.uuid, tail.material.normalMap.uuid, tail.material.roughnessMap.uuid],
        shared: tail.material.map === vanes.map && tail.material.normalMap === vanes.normalMap && tail.material.roughnessMap === vanes.roughnessMap,
        bands: !!tail.material.userData.tailBandsCompiled, children: tail.children.length };
    });
    expect(structure.vertices).toBe(model.quality === 'low' ? 264 : 408); expect(structure.children).toBe(0); expect(structure.shared).toBe(true);
    expect(structure.poses).toEqual(['resting-fan', 'wide-fan', 'narrow-fan']); expect(structure.finite).toBe(true); expect(structure.normalError).toBeLessThan(1e-6);
    expect(structure.maxRootError).toBe(0); expect(structure.maxWidthError).toBeLessThan(1e-6); expect(structure.maxLengthError).toBeLessThan(1e-6); expect(structure.minArea).toBeGreaterThan(1e-8);
    expect(structure.widths[1]).toBeLessThan(structure.widths[3]); expect(structure.widths[3]).toBeLessThan(structure.widths[0] * .95); expect(structure.widths[2]).toBeGreaterThan(structure.widths[0] * 1.08);
    expect(structure.bands).toBe(model.species !== 'redTail'); writeFileSync(output + '/' + label + '-geometry.json', JSON.stringify(structure, null, 2));
    const flying = await snapshot(page); expect(flying.tailScale).toEqual([1, 1, 1]);
    await inspect(page); fits(await fit(page)); frozen(flying, await snapshot(page)); await expect(page.locator('#rh-study-observation-copy')).toContainText('rounded tip');
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-glide.png' });
    await page.getByRole('button', { name: 'Keep moment', exact: true }).click();
    const first = await page.evaluate(() => (window as any).__toolData.raptorHunt.flightStudyMoments[0]); expect(first.view.focus).toBe('tail');
    const flightPoses: any[] = [];
    for (const maneuver of [{ key: ' ', name: 'wide', index: 1 }, { key: 'shift', name: 'narrow', index: 2 }]) {
      await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
      const transition = await page.locator('[data-raptor-canvas]').evaluate((c: any, key) => {
        const w = window as any; w.fanSkipRender = true; c._rhCommand('hold', { key, pressed: true }); w.fanStep(25);
        const first = w.fanTail.morphTargetInfluences.slice(); for (let i = 0; i < 39; i++) w.fanStep(25);
        w.fanSkipRender = false; w.fanStep(25); return first;
      }, maneuver.key);
      expect(transition[maneuver.index]).toBeLessThan(.3);
      const pose = await snapshot(page); expect(pose.tailMorphs[maneuver.index]).toBeGreaterThan(.999); expect(pose.tailMorphs[0]).toBe(0); expect(pose.tailScale).toEqual([1, 1, 1]);
      flightPoses.push({ name: maneuver.name, pose }); await inspect(page); fits(await fit(page)); frozen(pose, await snapshot(page));
      await page.locator('[data-study-view=side]').click();
      await page.getByRole('button', { name: 'Match saved view', exact: true }).click(); await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true'); fits(await fit(page));
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-' + maneuver.name + '.png' });
      if (maneuver.name === 'wide') await page.getByRole('button', { name: 'Keep moment', exact: true }).click();
    }
    const paused = await snapshot(page), renders = await page.evaluate(() => (window as any).fanRenders);
    await page.evaluate(() => (window as any).fanStep(60000)); frozen(paused, await snapshot(page)); expect(await page.evaluate(() => (window as any).fanRenders)).toBe(renders);
    if (model.species === 'peregrine') {
      await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
      await expect(page.locator('[data-study-camera-comparison]')).toContainText('inspected region match');
      await page.locator('[data-study-moment=B] textarea').fill('During the pull-up, the tail feathers fan farther apart. Their rounded tips remain visible.');
      await page.locator('[data-study-moment=B]').getByRole('button', { name: 'Add to notebook', exact: true }).click();
      expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.investigations.speed.evidence[0].reading.view.focus)).toBe('tail');
      await page.locator('.rh-flight-moments').screenshot({ path: output + '/tail-comparison.png' });
      await page.locator('[data-raptor-study-button]').click(); await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    }
    if (model.species === 'greatHorned') {
      await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1); fits(await fit(page));
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-phone.png' });
    }
    await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
    await page.locator('[data-raptor-canvas]').evaluate((c: any, species) => {
      const w = window as any; w.fanSkipRender = true;
      if (species === 'osprey') { c._rhCommand('assist'); c._rhCommand('hold', { key: 'q', pressed: true }); for (let i = 0; i < 400 && !c._rhSnapshot().landed; i++) w.fanStep(50); c._rhCommand('hold', { key: 'q', pressed: false }); }
      else c._rhCommand('perchPractice');
      for (let i = 0; i < 45; i++) w.fanStep(25); w.fanSkipRender = false; w.fanStep(25);
    }, model.species);
    const resting = await snapshot(page); expect(resting.landed).toBe(true); expect(resting.tailMorphs[0]).toBeGreaterThan(.999); expect(resting.tailMorphs[1] + resting.tailMorphs[2]).toBeLessThan(.001);
    await inspect(page); fits(await fit(page)); frozen(resting, await snapshot(page)); await expect(page.locator('#rh-study-observation-copy')).toContainText('overlapping tail feathers');
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-rest.png' });
    await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => { const w = window as any; w.fanSkipRender = true; c._rhCommand('hold', { key: ' ', pressed: true }); for (let i = 0; i < 35; i++) w.fanStep(25); c._rhCommand('hold', { key: ' ', pressed: false }); w.fanSkipRender = false; w.fanStep(25); });
    const takeoff = await snapshot(page); expect(takeoff.landed).toBe(false); expect(takeoff.tailMorphs[0]).toBeLessThan(.003); expect(takeoff.tailScale).toEqual([1, 1, 1]);
    const after = await page.evaluate(() => { const w = window as any, tail = w.fanTail, g = tail.geometry; return { version: [g.attributes.position.version, ...g.morphAttributes.position.map(attr => attr.version)], textures: [tail.material.map.uuid, tail.material.normalMap.uuid, tail.material.roughnessMap.uuid], sameMaterial: tail.material === w.fanMaterial }; });
    expect(after).toEqual({ version: structure.version, textures: structure.textures, sameMaterial: true });
    writeFileSync(output + '/' + label + '-motion.json', JSON.stringify({ flying, flightPoses, resting, takeoff }, null, 2));
    expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
