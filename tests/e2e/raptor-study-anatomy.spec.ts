import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const output = 'reports/raptor-3d-anatomy-2026-09-27';
const probes = `window.AlloPostFXEnabled=false;window.anatomyRenders=0;(()=>{const Original=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const r=new Original(options),render=r.render.bind(r);r.render=function(scene,camera){window.anatomyScene=scene;window.anatomyCamera=camera;if(window.anatomySkipRender)return;window.anatomyRenders++;return render(scene,camera);};return r;};})();`;
const objects = { wing: 'raptor-left-wing', tail: 'fan-tail-silhouette', head: 'raptor-head-rig', feet: 'raptor-feet' };

test.describe('Raptor anatomy close-ups', () => {
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
      (window as any).anatomyStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function mount(page: any, species = 'peregrine', mission = 'highStoop') {
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: mission, selectedSpecies: species,
      flightSession: { speciesId: species, missionId: mission }, huntTutorialDismissed: true, graphicsQuality: 'low',
      activeInvestigation: 'speed', investigations: { speed: { prediction: 'The wing and tail shapes may change during a dive.' } }
    } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
      for (let i = 0; i < 8; i++) (window as any).anatomyStep(25);
    });
  }
  async function snapshot(page: any) {
    return page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      const w = window as any, parts: any[] = [];
      w.anatomyScene.getObjectByName('raptor-head-rig').parent.traverse((part: any) => {
        if (part.isMesh) parts.push({ name: part.name, position: part.position.toArray(), rotation: part.rotation.toArray(), scale: part.scale.toArray(),
          morphs: part.morphTargetInfluences, color: part.material.color?.getHex(), version: part.geometry.attributes.position.version });
      });
      return { ...c._rhSnapshot(), parts };
    });
  }
  async function state(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt); }
  function frozen(before: any, after: any) {
    for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'parts']) expect(after[key], key).toEqual(before[key]);
  }
  async function bounds(page: any, object: string) {
    return page.evaluate(name => {
      const w = window as any, T = w.THREE, camera = w.anatomyCamera, points: any[] = [];
      const root = w.anatomyScene.getObjectByName(name); root.updateWorldMatrix(true, true);
      root.traverseVisible((mesh: any) => {
        if (!mesh.isMesh) return;
        const p = mesh.geometry.attributes.position, targets = mesh.geometry.morphAttributes.position || [];
        for (let i = 0; i < p.count; i++) {
          const base = new T.Vector3().fromBufferAttribute(p, i), vertex = base.clone();
          targets.forEach((target: any, j: number) => {
            const delta = new T.Vector3().fromBufferAttribute(target, i);
            if (!mesh.geometry.morphTargetsRelative) delta.sub(base);
            vertex.addScaledVector(delta, mesh.morphTargetInfluences[j]);
          });
          points.push(vertex.applyMatrix4(mesh.matrixWorld).project(camera));
        }
      });
      const stage = document.querySelector('[data-raptor-flight-stage]')!.getBoundingClientRect();
      const panel = document.querySelector('.rh-study-panel')!.getBoundingClientRect();
      const header = document.querySelector('.rh-study-header')!.getBoundingClientRect();
      const left = (Math.min(...points.map(p => p.x)) + 1) * stage.width / 2, right = (Math.max(...points.map(p => p.x)) + 1) * stage.width / 2;
      return { left, right, width: right - left, stageWidth: stage.width, top: (1 - Math.max(...points.map(p => p.y))) * stage.height / 2,
        bottom: (1 - Math.min(...points.map(p => p.y))) * stage.height / 2, panelTop: panel.top - stage.top, headerBottom: header.bottom - stage.top };
    }, object);
  }
  async function keep(page: any) { await page.getByRole('button', { name: 'Keep moment', exact: true }).click(); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled(); }
  async function advance(page: any) {
    await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      const w = window as any; c._rhCommand('assist'); c._rhCommand('hold', { key: 'shift', pressed: true });
      w.anatomySkipRender = true; for (let i = 0; i < 60; i++) w.anatomyStep(50);
      w.anatomySkipRender = false; w.anatomyStep(25);
    });
  }

  test('frames real anatomy without changing the pose or materials and restores flight exactly', async ({ page }) => {
    await mount(page);
    const flying = await snapshot(page);
    await page.locator('[data-raptor-study-button]').click();
    await expect(page.locator('.rh-study-region')).toBeHidden();
    const wholeHead = await bounds(page, objects.head);
    for (const [region, object] of Object.entries(objects)) {
      await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption(region);
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/peregrine-' + region + '.png' });
      const fit = await bounds(page, object);
      expect(fit.left).toBeGreaterThan(8); expect(fit.right).toBeLessThan(fit.stageWidth - 8);
      expect(fit.top).toBeGreaterThan(fit.headerBottom); expect(fit.bottom).toBeLessThan(fit.panelTop - 8);
      expect(fit.width).toBeGreaterThan(90);
      if (region === 'head') expect(fit.width).toBeGreaterThan(wholeHead.width * 2);
      await expect(page.locator('.rh-study-focus-frame')).toBeVisible();
      await expect(page.locator('.rh-study-region')).toBeVisible();
      frozen(flying, await snapshot(page));
    }
    await keep(page);
    const feetView = (await state(page)).flightStudyMoments[0].view;
    expect(feetView.focus).toBe('feet'); expect(feetView.elevation).toBeLessThan(0);
    const feetCamera = (await snapshot(page)).cameraPosition;
    await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
    await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toHaveValue('feet');
    expect((await snapshot(page)).cameraPosition).toEqual(feetCamera);
    await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
    const frame = await page.locator('.rh-study-focus-frame path').last().getAttribute('d');
    await page.locator('[data-raptor-canvas]').focus(); await page.keyboard.press('ArrowLeft');
    expect(await page.locator('.rh-study-focus-frame path').last().getAttribute('d')).not.toBe(frame);
    const renders = await page.evaluate(() => (window as any).anatomyRenders);
    await page.evaluate(() => (window as any).anatomyStep(60000));
    expect(await page.evaluate(() => (window as any).anatomyRenders)).toBe(renders);
    await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('whole');
    await expect(page.locator('.rh-study-focus-frame')).toBeHidden(); await expect(page.locator('.rh-study-region')).toBeHidden();
    await page.getByRole('button', { name: 'Close study', exact: true }).click();
    const restored = await snapshot(page); frozen(flying, restored);
    expect(restored.cameraPosition).toEqual(flying.cameraPosition); expect(restored.cameraQuaternion).toEqual(flying.cameraQuaternion);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('inspects folded owl anatomy, fits phones and short fullscreen, and cleans up on restart', async ({ page }) => {
    // Several real-WebGL captures, axe, fullscreen changes, and a second scene can
    // exceed three minutes on a busy SwiftShader host; action/assertion limits stay bounded.
    test.setTimeout(300000);
    await mount(page, 'greatHorned', 'open');
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => { c._rhCommand('perchPractice'); for (let i = 0; i < 40; i++) (window as any).anatomyStep(25); });
    await page.locator('[data-raptor-study-button]').click();
    const perched = await snapshot(page); expect(perched.footExtension).toBeGreaterThan(0.95);
    for (const region of ['wing', 'feet', 'head'] as const) {
      await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption(region);
      await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-' + region + '.png' });
      const fit = await bounds(page, objects[region]);
      expect(fit.width).toBeGreaterThan(120); expect(fit.top).toBeGreaterThan(fit.headerBottom); expect(fit.bottom).toBeLessThan(fit.panelTop - 8);
      frozen(perched, await snapshot(page));
    }
    await expect(page.locator('#rh-study-observation-copy')).toContainText('not ears');
    await page.addStyleTag({ content: '#wrap{width:420px}' }); await page.setViewportSize({ width: 420, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
    await page.locator('[data-study-view=front]').click();
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-head-phone.png' });
    const phone = await bounds(page, objects.head);
    expect(phone.left).toBeGreaterThan(8); expect(phone.right).toBeLessThan(phone.stageWidth - 8); expect(phone.width).toBeGreaterThan(110);
    expect(phone.top).toBeGreaterThan(phone.headerBottom); expect(phone.bottom).toBeLessThan(phone.panelTop - 8);
    const select = page.getByRole('combobox', { name: 'Inspect', exact: true });
    expect(await select.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    expect(await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-study-header', '.rh-study-panel'] }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
    })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active' });
    const colors = await select.evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]); expect(colors[0]).not.toBe(colors[1]);
    await page.emulateMedia({ forcedColors: 'none' });
    await page.setViewportSize({ width: 960, height: 560 });
    await page.getByRole('button', { name: 'Toggle fullscreen flight view', exact: true }).click();
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    await select.selectOption('feet');
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-feet-fullscreen.png' });
    const fullscreen = await bounds(page, objects.feet);
    expect(fullscreen.top).toBeGreaterThan(fullscreen.headerBottom); expect(fullscreen.bottom).toBeLessThan(fullscreen.panelTop - 8);
    await page.evaluate(() => document.exitFullscreen());
    await page.getByRole('button', { name: 'Restart this flight', exact: true }).click();
    await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
    await expect(page.locator('.rh-study-focus-frame')).toHaveCount(1); await expect(page.locator('.rh-study-focus-frame')).toBeHidden();
    await page.locator('[data-raptor-study-button]').click(); await expect(select).toHaveValue('whole');
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('keeps inspection context through comparison, matching, notebook transfer, export, and restoration', async ({ page }) => {
    await mount(page);
    await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('tail'); await keep(page);
    const first = (await state(page)).flightStudyMoments[0];
    expect(first.view.focus).toBe('tail'); expect(first.focusLabel).toBe('Tail feathers'); expect(first.image).toMatch(/^data:image\/jpeg;base64,/);
    await advance(page);
    await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing'); await keep(page);
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await expect(page.locator('[data-study-camera-comparison]')).toContainText('different regions');
    await expect(page.locator('[data-study-moment=A] img')).toHaveAttribute('alt', /Tail feathers/);
    await page.locator('[data-study-moment=A] textarea').fill('The tail feathers overlap. I will compare their spread after a dive.');
    await page.locator('[data-study-moment=A]').getByRole('button', { name: 'Add to notebook', exact: true }).click();
    expect((await state(page)).investigations.speed.evidence[0].reading.view.focus).toBe('tail');
    await page.getByRole('button', { name: 'Remove moment B', exact: true }).click();
    await page.locator('[data-raptor-study-button]').click();
    const before = await snapshot(page);
    await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    frozen(before, await snapshot(page)); await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toHaveValue('tail');
    await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true'); await keep(page);
    const second = (await state(page)).flightStudyMoments[1]; expect(second.view).toEqual(first.view); expect(second.image).not.toBe(first.image);
    await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
    await expect(page.locator('[data-study-camera-comparison]')).toContainText('inspected region match');
    await page.locator('[data-study-moment=B] textarea').fill('The tail is narrower during this dive. A matched view helps me compare its outline.');
    await page.locator('.rh-flight-moments').screenshot({ path: output + '/tail-comparison.png' });
    const htmlPending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download visual report', exact: true }).click();
    const html = await htmlPending; await html.saveAs(output + '/tail-observations.html');
    expect(readFileSync((await html.path())!, 'utf8')).toContain('Tail feathers · Above');
    await page.locator('.rh-flight-moments').getByRole('button', { name: 'Open notebook', exact: true }).click();
    await expect(page.locator('.rh-journal-note')).toContainText('Tail feathers');
    const txtPending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download field notes', exact: true }).click();
    const txt = await txtPending; expect(readFileSync((await txt.path())!, 'utf8')).toContain('Tail feathers');
    const saved = await page.evaluate(() => (window as any).__toolData);
    await harness.destroy(page); await page.evaluate(data => (window as any).__mount(data), saved);
    await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
    await page.locator('[data-raptor-study-button]').click(); await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toHaveValue('tail');
    expect((await state(page)).flightStudyMoments[0].image).toBe(first.image);
    // Earlier reports stored valid camera settings without a focus field. They remain whole-bird references.
    await page.evaluate(() => {
      const w = window as any, old = { ...w.__toolData.raptorHunt.flightStudyMoments[0], view: { ...w.__toolData.raptorHunt.flightStudyMoments[0].view } };
      delete old.view.focus; delete old.focusLabel; w.__toolData.raptorHunt.flightStudyMoments = [old]; w.__rerender();
    });
    await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toHaveValue('whole');
    await expect(page.locator('.rh-study-focus-frame')).toBeHidden();
    await page.evaluate(() => {
      const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[0].view.focus = 'unrecognized-region'; w.__rerender();
    });
    await expect(page.locator('.rh-study-match')).toBeHidden();
    expect((await state(page)).flightStudyMoments).toHaveLength(1);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
