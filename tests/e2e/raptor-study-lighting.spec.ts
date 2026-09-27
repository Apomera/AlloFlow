import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-study-lighting-2026-09-27';
const probes = `window.AlloPostFXEnabled=false;window.lightRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);window.lightRenderer=r;r.render=function(scene,camera){window.lightScene=scene;window.lightCamera=camera;if(window.lightSkipRender)return;window.lightRenders++;const result=render(scene,camera);window.lightDraw={calls:r.info.render.calls,textures:r.info.memory.textures,geometries:r.info.memory.geometries,lights:scene.children.filter(o=>o.visible&&o.name.startsWith('raptor-studio-light-')).map(o=>({name:o.name,intensity:o.intensity,position:o.position.toArray()}))};return result;};return r;};})();`;

test.describe('Raptor inspection lighting', () => {
  test.describe.configure({ mode: 'serial', timeout: 240000 });
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
      (window as any).lightStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function mount(page: any, species = 'peregrine', quality = 'low') {
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: species,
      flightSession: { speciesId: species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: quality,
      activeInvestigation: 'speed', investigations: { speed: { prediction: 'Lighting will change which feather details I can see.' } }
    } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => { c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 }); for (let i = 0; i < 8; i++) (window as any).lightStep(25); });
  }
  async function state(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt); }
  async function snapshot(page: any) {
    return page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      const w = window as any, parts = [], scene = w.lightScene;
      scene.getObjectByName('raptor-head-rig').parent.traverse(mesh => { if (mesh.isMesh) parts.push({ name: mesh.name, position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), scale: mesh.scale.toArray(), morphs: mesh.morphTargetInfluences?.slice(),
        geometry: mesh.geometry.uuid, version: mesh.geometry.attributes.position.version, material: mesh.material.uuid, color: mesh.material.color?.getHex(), map: mesh.material.map?.uuid, normal: mesh.material.normalMap?.uuid }); });
      return { ...c._rhSnapshot(), parts, draw: w.lightDraw, environment: { background: scene.background.uuid || scene.background.getHex(), fog: [scene.fog.color.getHex(), scene.fog.near, scene.fog.far], exposure: w.lightRenderer.toneMappingExposure, roots: scene.children.map(o => [o.id, o.visible]) } };
    });
  }
  function frozen(a: any, b: any) {
    for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'gazeYaw', 'gazePitch', 'parts']) expect(b[key], key).toEqual(a[key]);
  }
  async function pixels(page: any, save: boolean) {
    return page.locator('[data-raptor-canvas]').evaluate((canvas: any, save: boolean) => {
      const w = window as any, copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
      const ctx = copy.getContext('2d')!; ctx.drawImage(canvas, 0, 0); const data = ctx.getImageData(0, 0, copy.width, copy.height).data;
      if (save) { w.lightPixels = data; return 0; }
      let changed = 0; for (let i = 0; i < data.length; i += 4) if (Math.abs(data[i] - w.lightPixels[i]) + Math.abs(data[i + 1] - w.lightPixels[i + 1]) + Math.abs(data[i + 2] - w.lightPixels[i + 2]) > 15) changed++;
      return changed;
    }, save);
  }
  async function inspect(page: any, region = 'wing') { await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption(region); }
  async function keep(page: any) { await page.getByRole('button', { name: 'Keep moment', exact: true }).click(); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled(); }

  for (const model of [{ species: 'peregrine', quality: 'high', region: 'wing' }, { species: 'greatHorned', quality: 'low', region: 'head' }])
    test(`reveals the frozen surface without changing habitat or geometry: ${model.species}`, async ({ page }) => {
      const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await mount(page, model.species, model.quality); const flight = await snapshot(page); await inspect(page, model.region);
      const select = page.getByRole('combobox', { name: 'Studio light', exact: true }); await expect(select).toHaveValue('soft'); await expect(select).toBeEnabled();
      const soft = await snapshot(page); frozen(flight, soft); expect(soft.draw.lights).toHaveLength(3); expect(soft.environment).toEqual({ ...flight.environment, roots: soft.environment.roots });
      await pixels(page, true); await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-soft.png' });
      const modes: any[] = [];
      for (const mode of ['side', 'rim']) {
        await select.selectOption(mode); const lit = await snapshot(page); frozen(soft, lit);
        expect(lit.cameraPosition).toEqual(soft.cameraPosition); expect(lit.cameraQuaternion).toEqual(soft.cameraQuaternion); expect(lit.environment).toEqual(soft.environment);
        expect(lit.studyLighting).toBe(mode); expect(lit.draw.lights).toHaveLength(3); expect(lit.draw.calls).toBe(soft.draw.calls); expect(lit.draw.textures).toBe(soft.draw.textures); expect(lit.draw.geometries).toBe(soft.draw.geometries);
        const changed = await pixels(page, false); expect(changed).toBeGreaterThan(1000); modes.push({ mode, changed, draw: lit.draw });
        await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-' + mode + '.png' });
      }
      const renders = await page.evaluate(() => (window as any).lightRenders); await page.evaluate(() => (window as any).lightStep(60000)); expect(await page.evaluate(() => (window as any).lightRenders)).toBe(renders); frozen(soft, await snapshot(page));
      await page.locator('[data-raptor-canvas]').focus(); await page.keyboard.press('ArrowLeft'); const orbited = await snapshot(page);
      expect(orbited.draw.lights[0].position).not.toEqual(modes[1].draw.lights[0].position); frozen(soft, orbited);
      await page.getByRole('button', { name: 'Habitat', exact: true }).click(); await expect(select).toBeDisabled(); const habitat = await snapshot(page); expect(habitat.draw.lights).toHaveLength(0); await pixels(page, true);
      await page.getByRole('button', { name: 'Studio', exact: true }).click(); await expect(select).toHaveValue('rim'); await select.selectOption('side');
      await page.getByRole('button', { name: 'Habitat', exact: true }).click(); expect(await pixels(page, false)).toBeLessThan(30); expect((await snapshot(page)).cameraPosition).toEqual(habitat.cameraPosition);
      await page.getByRole('button', { name: 'Close study', exact: true }).click(); const restored = await snapshot(page); frozen(flight, restored);
      expect(restored.cameraPosition).toEqual(flight.cameraPosition); expect(restored.cameraQuaternion).toEqual(flight.cameraQuaternion); expect(restored.environment).toEqual(flight.environment);
      writeFileSync(output + '/' + model.species + '-lighting-checks.json', JSON.stringify({ soft: soft.draw, modes }, null, 2));
      expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
    });

  test('matches light settings and preserves honest comparison context through notebook, export, and restoration', async ({ page }) => {
    await mount(page); await inspect(page); const select = page.getByRole('combobox', { name: 'Studio light', exact: true });
    await select.selectOption('side'); await keep(page); const first = (await state(page)).flightStudyMoments[0]; expect(first.view.lighting).toBe('side'); expect(first.presentationLabel).toBe('Studio side lighting');
    await select.selectOption('rim'); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled(); // One capture per frozen instant still applies.
    await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click(); await page.evaluate(() => (window as any).lightStep(100)); await inspect(page);
    await expect(select).toHaveValue('rim'); await keep(page); expect((await state(page)).flightStudyMoments[1].view.lighting).toBe('rim');
    await page.getByRole('button', { name: 'Match saved view', exact: true }).click(); await expect(select).toHaveValue('side'); await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true');
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click(); await expect(page.locator('[data-study-camera-comparison]')).toContainText('different studio lights');
    await expect(page.locator('[data-study-moment=A] img')).toHaveAttribute('alt', /Studio side lighting/); await expect(page.locator('[data-study-moment=B] img')).toHaveAttribute('alt', /Studio rim lighting/);
    await page.locator('[data-study-moment=A] textarea').fill('Side lighting makes the feather ridges easier to trace. The rim light emphasizes the outer edge.');
    await page.locator('[data-study-moment=A]').getByRole('button', { name: 'Add to notebook', exact: true }).click(); expect((await state(page)).investigations.speed.evidence[0].reading.view.lighting).toBe('side');
    await page.locator('.rh-flight-moments').screenshot({ path: output + '/lighting-comparison.png' });
    const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download visual report', exact: true }).click(); const download = await pending; await download.saveAs(output + '/lighting-observations.html');
    const html = readFileSync((await download.path())!, 'utf8'); expect(html).toContain('Studio side lighting'); expect(html).toContain('Studio rim lighting'); expect(html).toContain('different studio lights'); expect(html).toContain(first.image);
    const saved = await page.evaluate(() => (window as any).__toolData); await harness.destroy(page); await page.evaluate(data => (window as any).__mount(data), saved);
    await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true); await page.locator('[data-raptor-study-button]').click();
    await page.getByRole('button', { name: 'Match saved view', exact: true }).click(); await expect(select).toHaveValue('side'); expect((await state(page)).flightStudyMoments[0].image).toBe(first.image);
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await page.evaluate(() => { const w = window as any, moment = w.__toolData.raptorHunt.flightStudyMoments[0]; delete moment.view.lighting; w.__toolData.raptorHunt.flightStudyMoments = [moment]; w.__rerender(); });
    await page.locator('[data-raptor-study-button]').click(); await select.selectOption('rim'); await page.getByRole('button', { name: 'Match saved view', exact: true }).click(); await expect(select).toHaveValue('soft');
    for (const invalid of ['unknown', 1, { id: 'side' }]) {
      await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
      await page.evaluate(value => { const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[0].view.lighting = value; w.__rerender(); }, invalid);
      await page.locator('[data-raptor-study-button]').click(); await expect(page.locator('.rh-study-match')).toBeHidden();
    }
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('keeps short-phone and fullscreen inspection usable with keyboard, reduced motion, and forced colors', async ({ page }) => {
    await mount(page, 'greatHorned'); await inspect(page, 'head');
    await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 740 }); await page.emulateMedia({ reducedMotion: 'reduce' });
    const select = page.getByRole('combobox', { name: 'Studio light', exact: true });
    await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
    await select.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await expect(select).toHaveValue('side');
    const layout = await page.locator('.rh-study-panel').evaluate(el => { const p = el.getBoundingClientRect(), header = document.querySelector('.rh-study-header')!.getBoundingClientRect(), stage = document.querySelector('[data-raptor-flight-stage]')!.getBoundingClientRect(); return { visibleBirdHeight: p.top - header.bottom, scrolls: el.scrollHeight > el.clientHeight, overflow: getComputedStyle(el).overflowY, fits: el.scrollWidth <= el.clientWidth + 1, within: p.bottom <= stage.bottom }; });
    expect(layout.visibleBirdHeight).toBeGreaterThan(130); expect(layout.scrolls).toBe(true); expect(layout.overflow).toBe('auto'); expect(layout.fits).toBe(true); expect(layout.within).toBe(true);
    expect(await select.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-short-phone.png' });
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); expect(await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-study-header', '.rh-study-panel'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => v.id))).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active' }); const colors = await select.evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]); expect(colors[0]).not.toBe(colors[1]); await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 960, height: 560 }); await page.getByRole('button', { name: 'Toggle fullscreen flight view', exact: true }).click(); await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
    await select.selectOption('rim'); await expect(select).toBeInViewport(); await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-short-fullscreen.png' }); await page.evaluate(() => document.exitFullscreen());
    await page.getByRole('button', { name: 'Restart this flight', exact: true }).click(); await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
    await expect(page.locator('.rh-study-light select')).toHaveCount(1); await page.locator('[data-raptor-study-button]').click(); await expect(select).toHaveValue('soft');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
