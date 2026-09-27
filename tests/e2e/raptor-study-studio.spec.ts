import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-3d-studio-2026-09-27';
const probes = `window.AlloPostFXEnabled=false;window.studioRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original(options),render=r.render.bind(r);window.studioRenderer=r;r.render=function(scene,camera){window.studioScene=scene;window.studioCamera=camera;if(window.studioSkipRender)return;window.studioRenders++;window.lastStudioDraw={background:scene.background?.name,fog:!!scene.fog,exposure:r.toneMappingExposure,roots:scene.children.filter(c=>c.visible).map(c=>({id:c.id,name:c.name}))};if(scene.background?.name==='raptor-studio-backdrop'&&!scene.background.__studioWatched){scene.background.__studioWatched=true;scene.background.addEventListener('dispose',()=>window.studioDisposed=(window.studioDisposed||0)+1);}if(window.studioThrow){window.studioThrow=false;throw new Error('Controlled renderer failure');}return render(scene,camera);};return r;};})();`;

test.describe('Raptor studio presentation', () => {
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
      (window as any).studioStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function mount(page: any, species = 'peregrine', mission = 'highStoop') {
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: mission, selectedSpecies: species,
      flightSession: { speciesId: species, missionId: mission }, huntTutorialDismissed: true, graphicsQuality: 'low'
    } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
      for (let i = 0; i < 8; i++) (window as any).studioStep(25);
    });
  }
  async function state(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt); }
  async function snapshot(page: any) {
    return page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      const w = window as any, parts: any[] = [], scene = w.studioScene;
      const bird = scene.getObjectByName('raptor-head-rig').parent;
      bird.traverse((part: any) => {
        if (part.isMesh) parts.push({ name: part.name, position: part.position.toArray(), rotation: part.rotation.toArray(), scale: part.scale.toArray(),
          morphs: part.morphTargetInfluences, color: part.material.color?.getHex(), version: part.geometry.attributes.position.version });
      });
      return { ...c._rhSnapshot(), parts, birdId: bird.id, environment: {
        roots: scene.children.map((o: any) => [o.id, o.visible]), background: scene.background.uuid || scene.background.getHex(),
        fog: [scene.fog.color.getHex(), scene.fog.near, scene.fog.far], exposure: w.studioRenderer.toneMappingExposure
      }, draw: w.lastStudioDraw };
    });
  }
  function frozen(before: any, after: any) {
    for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'parts']) expect(after[key], key).toEqual(before[key]);
  }
  async function keep(page: any) { await page.getByRole('button', { name: 'Keep moment', exact: true }).click(); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled(); }

  test('isolates the actual bird, preserves the habitat even on render failure, and restores flight', async ({ page }) => {
    await mount(page);
    const flying = await snapshot(page);
    await page.locator('[data-raptor-study-button]').click();
    await expect(page.getByRole('button', { name: 'Studio', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-study-view=above]').click();
    const studio = await snapshot(page); frozen(flying, studio);
    expect(studio.draw.background).toBe('raptor-studio-backdrop'); expect(studio.draw.fog).toBe(false); expect(studio.draw.exposure).toBe(1);
    expect(studio.draw.roots).toHaveLength(4); expect(studio.draw.roots.some((root: any) => root.id === studio.birdId)).toBe(true);
    expect(studio.environment.fog).toEqual(flying.environment.fog); expect(studio.environment.background).toBe(flying.environment.background);
    expect(studio.environment.exposure).toBe(flying.environment.exposure);
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/peregrine-studio.png' });
    await page.getByRole('button', { name: 'Habitat', exact: true }).click();
    const habitat = await snapshot(page); frozen(studio, habitat); expect(habitat.environment).toEqual(studio.environment);
    expect(habitat.cameraPosition).toEqual(studio.cameraPosition); expect(habitat.draw.fog).toBe(true); expect(habitat.draw.roots.length).toBeGreaterThan(4);
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/peregrine-habitat.png' });
    const failure = await page.getByRole('button', { name: 'Studio', exact: true }).evaluate((button: any) => {
      (window as any).studioThrow = true;
      try { button.onclick(); } catch (error: any) { return error.message; }
    });
    expect(failure).toBe('Controlled renderer failure'); expect((await snapshot(page)).environment).toEqual(habitat.environment);
    await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/peregrine-head-studio.png' });
    const renders = await page.evaluate(() => (window as any).studioRenders);
    await page.evaluate(() => (window as any).studioStep(60000));
    expect(await page.evaluate(() => (window as any).studioRenders)).toBe(renders);
    await page.getByRole('button', { name: 'Close study', exact: true }).click();
    const returned = await snapshot(page); frozen(flying, returned);
    expect(returned.environment).toEqual(flying.environment); expect(returned.cameraPosition).toEqual(flying.cameraPosition); expect(returned.cameraQuaternion).toEqual(flying.cameraQuaternion);
    expect(returned.draw.fog).toBe(true); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('records presentation, matches it, and handles legacy or invalid settings without false matches', async ({ page }) => {
    await mount(page); await page.locator('[data-raptor-study-button]').click(); await keep(page);
    const first = (await state(page)).flightStudyMoments[0];
    expect(first.view.presentation).toBe('studio'); expect(first.presentationLabel).toBe('Studio lighting'); expect(first.image).toMatch(/^data:image\/jpeg;base64,/);
    await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
    await page.evaluate(() => (window as any).studioStep(100));
    await page.locator('[data-raptor-study-button]').click();
    await page.getByRole('button', { name: 'Habitat', exact: true }).click();
    await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'false'); await keep(page);
    expect((await state(page)).flightStudyMoments[1].view.presentation).toBe('habitat');
    await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Studio', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true');
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await expect(page.locator('[data-study-camera-comparison]')).toContainText('different lighting and backgrounds');
    await expect(page.locator('[data-study-moment=A] img')).toHaveAttribute('alt', /Studio lighting/);
    await expect(page.locator('[data-study-moment=B] img')).toHaveAttribute('alt', /Habitat \+ study lighting/);
    const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download visual report', exact: true }).click();
    const download = await pending; await download.saveAs(output + '/studio-observations.html');
    const html = readFileSync((await download.path())!, 'utf8');
    expect(html).toContain(first.image); expect(html).toContain('Studio lighting'); expect(html).toContain('Habitat + study lighting'); expect(html).toContain('different lighting and backgrounds');
    await page.evaluate(() => {
      const w = window as any, moment = w.__toolData.raptorHunt.flightStudyMoments[0];
      delete moment.view.presentation; delete moment.presentationLabel;
      w.__toolData.raptorHunt.flightStudyMoments = [moment]; w.__rerender();
    });
    await page.locator('[data-raptor-study-button]').click();
    await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Habitat', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true');
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await page.evaluate(() => {
      const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[0].view.presentation = 'invalid'; w.__rerender();
    });
    await page.locator('[data-raptor-study-button]').click(); await expect(page.locator('.rh-study-match')).toBeHidden();
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('shows nocturnal owl detail on phones with accessible controls and disposes the studio on restart', async ({ page }) => {
    test.setTimeout(240000);
    await mount(page, 'greatHorned', 'open');
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      c._rhCommand('environment', { dayPhase: 0.92 }); c._rhCommand('perchPractice');
      for (let i = 0; i < 40; i++) (window as any).studioStep(25);
    });
    await page.locator('[data-raptor-study-button]').click();
    await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
    await page.locator('[data-study-view=front]').click();
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-studio.png' });
    await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
    await page.locator('[data-study-view=front]').click();
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-studio-phone.png' });
    const controls = await page.locator('.rh-study-presentation button').evaluateAll(buttons => buttons.map(button => {
      const r = button.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height };
    }));
    controls.forEach(control => { expect(control.height).toBeGreaterThanOrEqual(44); expect(control.left).toBeGreaterThanOrEqual(0); expect(control.right).toBeLessThanOrEqual(390); });
    await page.getByRole('button', { name: 'Habitat', exact: true }).focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Habitat', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-habitat-phone.png' });
    await page.getByRole('button', { name: 'Studio', exact: true }).click();
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    expect(await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-study-header', '.rh-study-panel'] }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
    })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active' });
    const colors = await page.getByRole('button', { name: 'Studio', exact: true }).evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
    expect(colors[0]).not.toBe(colors[1]); await page.emulateMedia({ forcedColors: 'none' });
    await page.getByRole('button', { name: 'Restart this flight', exact: true }).click();
    await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
    expect(await page.evaluate(() => (window as any).studioDisposed)).toBe(1);
    await expect(page.locator('.rh-study-presentation')).toHaveCount(1);
    await page.locator('[data-raptor-study-button]').click();
    await expect(page.getByRole('button', { name: 'Studio', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
