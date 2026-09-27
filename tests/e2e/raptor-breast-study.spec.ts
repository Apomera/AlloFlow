import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-breast-study-2026-09-27';
const probes = `window.AlloPostFXEnabled=false;window.breastRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original({...options,preserveDrawingBuffer:true}),render=r.render.bind(r);r.render=function(scene,camera){window.breastScene=scene;window.breastCamera=camera;if(window.breastSkipRender)return;window.breastRenders++;return render(scene,camera);};return r;};})();`;

test.describe('Raptor breast feather study', () => {
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
      (window as any).breastStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function mount(page: any, species = 'peregrine', quality = 'low') {
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: species,
      flightSession: { speciesId: species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: quality,
      activeInvestigation: 'speed', investigations: { speed: { prediction: 'The bird will fold its wings when it lands.' } }
    } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
      for (let i = 0; i < 8; i++) (window as any).breastStep(25);
    });
  }
  async function snapshot(page: any) { return page.locator('[data-raptor-canvas]').evaluate((c: any) => c._rhSnapshot()); }
  async function state(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt); }
  async function inspect(page: any) { await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('body'); }
  async function keep(page: any) { await page.getByRole('button', { name: 'Keep moment', exact: true }).click(); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled(); }
  function frozen(a: any, b: any) {
    for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'gazeYaw', 'gazePitch']) expect(b[key], key).toEqual(a[key]);
  }
  async function fit(page: any) {
    return page.evaluate(() => {
      const w = window as any, body = w.breastScene.getObjectByName('raptor-contour-body'), p = body.geometry.attributes.position;
      body.updateWorldMatrix(true, false); const points = Array.from({ length: p.count }, (_, i) => new w.THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(body.matrixWorld).project(w.breastCamera));
      const stage = document.querySelector('[data-raptor-flight-stage]')!.getBoundingClientRect(), panel = document.querySelector('.rh-study-panel')!.getBoundingClientRect(), header = document.querySelector('.rh-study-header')!.getBoundingClientRect();
      return { left: (1 + Math.min(...points.map(p => p.x))) * stage.width / 2, right: (1 + Math.max(...points.map(p => p.x))) * stage.width / 2,
        top: (1 - Math.max(...points.map(p => p.y))) * stage.height / 2, bottom: (1 - Math.min(...points.map(p => p.y))) * stage.height / 2,
        width: stage.width, panelTop: panel.top - stage.top, headerBottom: header.bottom - stage.top };
    });
  }
  function fits(bounds: any) {
    expect(bounds.left).toBeGreaterThan(8); expect(bounds.right).toBeLessThan(bounds.width - 8);
    expect(bounds.top).toBeGreaterThan(bounds.headerBottom); expect(bounds.bottom).toBeLessThan(bounds.panelTop - 8);
    expect(bounds.right - bounds.left).toBeGreaterThan(100);
  }
  async function pixels(page: any, save: boolean) {
    return page.locator('[data-raptor-canvas]').evaluate((canvas: any, save: boolean) => {
      const w = window as any, copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
      const ctx = copy.getContext('2d')!; ctx.drawImage(canvas, 0, 0); const data = ctx.getImageData(0, 0, copy.width, copy.height).data;
      if (save) { w.breastPixels = data; return 0; }
      let changed = 0; for (let i = 0; i < data.length; i += 4) if (Math.abs(data[i] - w.breastPixels[i]) + Math.abs(data[i + 1] - w.breastPixels[i + 1]) + Math.abs(data[i + 2] - w.breastPixels[i + 2]) > 15) changed++;
      return changed;
    }, save);
  }
  for (const model of [
    { species: 'peregrine', quality: 'low', prompt: 'fine dark bars', bars: true },
    { species: 'peregrine', quality: 'high', prompt: 'fine dark bars', bars: true },
    { species: 'greatHorned', quality: 'low', prompt: 'pale throat patch', bars: true },
    { species: 'redTail', quality: 'high', prompt: 'belly band', bars: false },
    { species: 'baldEagle', quality: 'low', prompt: 'overlapping feathers', bars: false }
  ]) test(`frames attached plumage without changing flight: ${model.species} ${model.quality}`, async ({ page }) => {
    const errors: string[] = [], label = model.species + '-' + model.quality;
    page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await mount(page, model.species, model.quality);
    const structure = await page.evaluate(() => {
      const w = window as any, body = w.breastScene.getObjectByName('raptor-contour-body'); w.breastBody = body; w.breastMaterial = body.material;
      return { vertices: body.geometry.attributes.position.count, version: body.geometry.attributes.position.version,
        finite: [body.geometry.attributes.position, body.geometry.attributes.normal, body.geometry.attributes.uv].every(attr => Array.from(attr.array).every(Number.isFinite)),
        bars: !!body.material.userData.bodyBarring, kind: body.material.userData.bodyMarkingKind || '', compiled: !!body.material.userData.bodyMarkingsCompiled,
        textures: [body.material.map.uuid, body.material.bumpMap.uuid], meshCount: body.children.length };
    });
    expect(structure.finite).toBe(true); expect(structure.vertices).toBe(model.quality === 'low' ? 425 : 925); expect(structure.bars).toBe(model.bars);
    expect(structure.compiled).toBe(model.species !== 'baldEagle'); expect(structure.meshCount).toBe(0);
    const flying = await snapshot(page); await inspect(page);
    await expect(page.locator('#rh-study-observation-copy')).toContainText(model.prompt);
    await expect(page.locator('.rh-study-region')).toHaveText('Breast feathers'); fits(await fit(page)); frozen(flying, await snapshot(page));
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-breast.png' });
    if (model.bars) {
      await pixels(page, true); const before = await snapshot(page);
      await page.evaluate(() => {
        const w = window as any, original = w.breastMaterial, plain = original.clone();
        plain.onBeforeCompile = shader => { original.onBeforeCompile(shader); shader.fragmentShader = shader.fragmentShader.replace(/float rhBarArea=[^;]+;/, 'float rhBarArea=0.0;'); };
        plain.customProgramCacheKey = () => 'breast-without-bars-control'; w.breastPlain = plain; w.breastBody.material = plain;
      });
      await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('body');
      expect(await pixels(page, false)).toBeGreaterThan(500); expect((await snapshot(page)).drawCalls).toBe(before.drawCalls);
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-unbarred-control.png' });
      await page.evaluate(() => { const w = window as any; w.breastBody.material = w.breastMaterial; w.breastPlain.dispose(); });
      await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('body');
    }
    const renders = await page.evaluate(() => (window as any).breastRenders);
    await page.evaluate(() => (window as any).breastStep(60000)); expect(await page.evaluate(() => (window as any).breastRenders)).toBe(renders);
    frozen(flying, await snapshot(page)); await keep(page); const first = (await state(page)).flightStudyMoments[0];
    expect(first.view.focus).toBe('body'); expect(first.focusLabel).toBe('Breast feathers'); expect(first.view.elevation).toBeLessThan(0); expect(first.image).toMatch(/^data:image\/jpeg;base64,/);
    if (model.species === 'greatHorned') {
      await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
      fits(await fit(page)); await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-phone.png' });
      await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
      expect(await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-study-header', '.rh-study-panel'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => v.id))).toEqual([]);
    }
    await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      const w = window as any; c._rhCommand('perchPractice'); w.breastSkipRender = true;
      for (let i = 0; i < 45; i++) w.breastStep(25); w.breastSkipRender = false; w.breastStep(25);
    });
    // Eagle has no practice lookout; its generic region is still usable in flight.
    const resting = await snapshot(page); if (model.species !== 'baldEagle') expect(resting.landed).toBe(true);
    await inspect(page); fits(await fit(page)); frozen(resting, await snapshot(page));
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-second-pose.png' });
    const after = await page.evaluate(() => { const w = window as any; return { version: w.breastBody.geometry.attributes.position.version, textures: [w.breastBody.material.map.uuid, w.breastBody.material.bumpMap.uuid], sameMaterial: w.breastBody.material === w.breastMaterial }; });
    expect(after).toEqual({ version: structure.version, textures: structure.textures, sameMaterial: true });
    expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('retains breast views through matching, notebook transfer, export, and restoration', async ({ page }) => {
    await mount(page); await inspect(page); await keep(page); const first = (await state(page)).flightStudyMoments[0];
    await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => { const w = window as any; c._rhCommand('perchPractice'); w.breastSkipRender = true; for (let i = 0; i < 45; i++) w.breastStep(25); w.breastSkipRender = false; w.breastStep(25); });
    await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
    await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toHaveValue('body'); await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true');
    await keep(page); expect((await state(page)).flightStudyMoments[1].view).toEqual(first.view);
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await expect(page.locator('[data-study-camera-comparison]')).toContainText('inspected region match');
    await expect(page.locator('[data-study-moment=A] img')).toHaveAttribute('alt', /Breast feathers/);
    await page.locator('[data-study-moment=A] textarea').fill('The fine bars cross the pale breast. The upper area is less strongly marked.');
    await page.locator('[data-study-moment=A]').getByRole('button', { name: 'Add to notebook', exact: true }).click();
    expect((await state(page)).investigations.speed.evidence[0].reading.view.focus).toBe('body');
    await page.locator('.rh-flight-moments').screenshot({ path: output + '/breast-comparison.png' });
    const downloadPending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download visual report', exact: true }).click();
    const download = await downloadPending; await download.saveAs(output + '/breast-observations.html'); expect(readFileSync((await download.path())!, 'utf8')).toContain('Breast feathers');
    const saved = await page.evaluate(() => (window as any).__toolData); await harness.destroy(page); await page.evaluate(data => (window as any).__mount(data), saved);
    await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
    await page.locator('[data-raptor-study-button]').click(); await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toHaveValue('body');
    expect((await state(page)).flightStudyMoments[0].image).toBe(first.image); fits(await fit(page));
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
