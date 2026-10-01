import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off' });
const probes = `window.AlloPostFXEnabled=false;window.studyRenders=0;(()=>{const Renderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(options){const renderer=new Renderer(options),render=renderer.render.bind(renderer);renderer.render=function(scene,camera){window.studyScene=scene;window.studyCamera=camera;if(window.studySkipRender)return;window.studyRenders++;return render(scene,camera);};return renderer;};})();`;

test.describe('Raptor frozen 3D study', () => {
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
      (window as any).studyStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
    });
  });
  async function mount(page: any, species = 'redTail', mission = 'open') {
    await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: mission, selectedSpecies: species,
      flightSession: { speciesId: species, missionId: mission }, huntTutorialDismissed: true, graphicsQuality: 'low' } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
    await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
      for (let i = 0; i < 5; i++) (window as any).studyStep(25);
    });
  }
  async function snapshot(page: any) {
    return page.locator('[data-raptor-canvas]').evaluate((c: any) => {
      const w = window as any;
      return { ...c._rhSnapshot(), animals: w.studyScene.children.filter((o: any) => o.children.some((p: any) => p.name.startsWith('prey-'))).map((o: any) => o.position.toArray()) };
    });
  }
  function frozen(before: any, after: any) {
    for (const key of ['raptorPosition', 'headingRadians', 'pitchRadians', 'motionTimeMs', 'calories', 'stamina', 'missionCatches', 'strikeRecoveryMs', 'wingAngle', 'animals']) expect(after[key], key).toEqual(before[key]);
  }
  async function modelBounds(page: any) {
    return page.evaluate(() => {
      const w = window as any, camera = w.studyCamera, T = w.THREE;
      const bird = w.studyScene.getObjectByName('raptor-head-rig').parent;
      const points: any[] = [];
      camera.updateMatrixWorld(true);
      bird.updateMatrixWorld(true);
      // Project the rendered vertices, including their current morph weights.
      // The engine's default box also includes the unused unfolded pose.
      bird.traverseVisible((mesh: any) => {
        if (!mesh.isMesh) return;
        const attribute = mesh.geometry.attributes.position;
        const targets = mesh.geometry.morphAttributes.position || [];
        for (let i = 0; i < attribute.count; i++) {
          const base = new T.Vector3().fromBufferAttribute(attribute, i), vertex = base.clone();
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
      return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.max(...points.map(p => p.y)),
        bottomPx: (1 - Math.min(...points.map(p => p.y))) / 2 * stage.height, panelTop: panel.top - stage.top,
        panelOverflow: document.querySelector('.rh-study-panel')!.scrollWidth - document.querySelector('.rh-study-panel')!.clientWidth,
        visible: bird.visible };
    });
  }
  test('orbits the actual frozen bird, preserves flight, and restores the original camera', async ({ page }) => {
    await mount(page);
    const before = await snapshot(page);
    await page.locator('[data-raptor-study-button]').click();
    await expect(page.locator('.rh-study-heading h3')).toBeFocused();
    await expect(page.locator('[data-raptor-flight-stage]')).toHaveAttribute('data-raptor-study', 'true');
    const started = await snapshot(page); frozen(before, started);
    expect(started.studyFillVisible).toBe(true);
    expect(started.cameraPosition).not.toEqual(before.cameraPosition);
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: 'reports/raptor-3d-study-2026-09-26/side-desktop.png' });
    for (const view of ['front', 'above', 'behind']) {
      await page.locator(`[data-study-view=${view}]`).click();
      await expect(page.locator(`[data-study-view=${view}]`)).toHaveAttribute('aria-pressed', 'true');
      frozen(before, await snapshot(page));
      const bounds = await modelBounds(page);
      expect(bounds.visible).toBe(true); expect(bounds.left).toBeGreaterThan(-0.95); expect(bounds.right).toBeLessThan(0.95);
      expect(bounds.top).toBeLessThan(0.90); expect(bounds.bottomPx).toBeLessThan(bounds.panelTop - 8);
    }
    await page.locator('[data-study-view=above]').click();
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: 'reports/raptor-3d-study-2026-09-26/above-desktop.png' });
    const canvas = page.locator('[data-raptor-canvas]');
    await canvas.focus(); await page.keyboard.press('ArrowLeft');
    expect((await snapshot(page)).studyPreset).toBe('');
    const keyboardView = await snapshot(page);
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + 200); await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 50, box.y + 215); await page.mouse.up();
    expect((await snapshot(page)).cameraPosition).not.toEqual(keyboardView.cameraPosition);
    await page.getByRole('slider', { name: 'View distance' }).press('End');
    const renders = await page.evaluate(() => (window as any).studyRenders);
    await page.evaluate(() => (window as any).studyStep(60000));
    expect(await page.evaluate(() => (window as any).studyRenders)).toBe(renders);
    frozen(before, await snapshot(page));
    await page.getByRole('button', { name: 'Close study', exact: true }).click();
    const restored = await snapshot(page); frozen(before, restored);
    expect(restored.studyActive).toBe(false); expect(restored.studyFillVisible).toBe(false);
    expect(restored.cameraPosition).toEqual(before.cameraPosition); expect(restored.cameraQuaternion).toEqual(before.cameraQuaternion);
    expect(restored.cameraFov).toBe(before.cameraFov);
    await expect(page.getByRole('button', { name: 'Resume paused flight', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Resume paused flight', exact: true }).click();
    await page.evaluate(() => (window as any).studyStep(25));
    expect((await snapshot(page)).motionTimeMs - before.motionTimeMs).toBeCloseTo(25, 6);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('supports a perched owl, narrow panels, reduced motion, first-person return, and accessible controls', async ({ page }) => {
    await mount(page, 'greatHorned');
    const canvas = page.locator('[data-raptor-canvas]');
    await canvas.evaluate((c: any) => { c._rhCommand('environment', { dayPhase: 0.02 }); c._rhCommand('perchPractice'); for (let i = 0; i < 40; i++) (window as any).studyStep(25); c._rhCommand('pause'); c._rhCommand('view'); });
    const before = await snapshot(page);
    await page.locator('[data-raptor-study-button]').click();
    await expect(page.locator('.rh-study-panel h4')).toHaveText('What changes when a bird lands?');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addStyleTag({ content: '#wrap{width:420px}' });
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => Math.abs(c.width - c.clientWidth))).toBeLessThan(2);
    // A narrow embedded lab needs the same layout even in a wide desktop window.
    await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
    await page.setViewportSize({ width: 420, height: 1000 });
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => Math.abs(c.height - c.clientHeight))).toBeLessThan(2);
    await page.locator('[data-study-view=front]').click();
    const bounds = await modelBounds(page);
    expect(bounds.left).toBeGreaterThan(-0.95); expect(bounds.right).toBeLessThan(0.95);
    expect(bounds.right - bounds.left).toBeGreaterThan(0.45);
    expect(bounds.bottomPx).toBeLessThan(bounds.panelTop - 8); expect(bounds.panelOverflow).toBeLessThanOrEqual(1);
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: 'reports/raptor-3d-study-2026-09-26/owl-phone.png' });
    await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run({ include: ['.rh-study-header', '.rh-study-panel'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
      return result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }));
    });
    expect(violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active' });
    const colors = await page.locator('.rh-study-resume').evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
    expect(colors[0]).not.toBe(colors[1]);
    await canvas.focus(); await page.keyboard.press('Escape');
    const restored = await snapshot(page);
    expect(restored.studyActive).toBe(false); expect(restored.cameraPosition).toEqual(before.cameraPosition);
    expect(restored.motionTimeMs).toBe(before.motionTimeMs);
    await expect(page.getByRole('button', { name: 'Resume paused flight', exact: true })).toBeFocused();
    await page.locator('[data-raptor-study-button]').click();
    await page.getByRole('button', { name: 'Resume from this moment' }).click();
    await expect(canvas).toBeFocused();
    expect((await snapshot(page)).studyActive).toBe(false);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });

  test('honors motion preferences on return from a dive and cleans up when restarting', async ({ page }) => {
    await mount(page, 'peregrine', 'highStoop');
    const canvas = page.locator('[data-raptor-canvas]');
    await canvas.evaluate((c: any) => {
      const w = window as any; c._rhCommand('assist'); c._rhCommand('hold', { key: 'shift', pressed: true });
      w.studySkipRender = true; for (let i = 0; i < 120; i++) w.studyStep(50);
      w.studySkipRender = false; w.studyStep(25);
    });
    const dive = await snapshot(page);
    expect(dive.diveActive).toBe(true); expect(dive.crashed).toBe(false); expect(dive.cameraFov).toBeGreaterThan(72);
    await page.locator('[data-raptor-study-button]').click();
    await expect(page.locator('.rh-study-panel h4')).toHaveText('Where did the wing area go?');
    frozen(dive, await snapshot(page));
    await page.locator('[data-study-view=above]').click();
    await page.locator('[data-raptor-flight-stage]').screenshot({ path: 'reports/raptor-3d-study-2026-09-26/dive-desktop.png' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(async () => (await snapshot(page)).reducedMotion).toBe(true);
    await page.getByRole('slider', { name: 'View distance' }).press('Escape');
    const restored = await snapshot(page);
    expect(restored.studyActive).toBe(false); expect(restored.cameraFov).toBe(70);
    expect(restored.cameraPosition).toEqual(dive.cameraPosition); expect(restored.motionTimeMs).toBe(dive.motionTimeMs);
    expect(await page.evaluate(() => (window as any).studyCamera.up.toArray())).toEqual([0, 1, 0]);
    await page.locator('[data-raptor-study-button]').click();
    await canvas.evaluate((c: any) => { (window as any).studyOldCanvas = c; });
    await page.getByRole('button', { name: 'Restart this flight' }).click();
    await expect.poll(() => canvas.evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
    await expect(page.locator('[data-raptor-study-button]')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('[data-raptor-canvas]')).not.toHaveAttribute('aria-describedby', 'rh-study-help');
    await expect(page.locator('.rh-study-panel')).toHaveCount(1);
    await expect(page.locator('.rh-study-panel')).toBeHidden();
    expect((await snapshot(page)).studyActive).toBe(false);
    expect(await page.evaluate(() => (window as any).studyScene.children.filter((o: any) => o.name === 'raptor-study-fill').length)).toBe(1);
    expect(await page.evaluate(() => !!(window as any).studyOldCanvas._rhCommand)).toBe(false);
    expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  });
});
