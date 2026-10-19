import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const captures = resolve('reports/avian-richness-2026-10-17/final');

const harness = new GlHarness({
  toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], appStyles: true,
  layout: 'document', width: 1100, height: 900,
  probes: `(() => {
    const Original = THREE.WebGLRenderer;
    THREE.WebGLRenderer = function(options) {
      const renderer = new Original({...options,preserveDrawingBuffer:true});
      const render = renderer.render.bind(renderer);
      renderer.render = function(scene,camera) {
        window.cloudscapeReview={scene,camera,renderer};
        return render(scene,camera);
      };
      return renderer;
    };
  })();`
});

test.describe.configure({ timeout: 180_000, retries: 0, mode: 'serial' });
test.use({ video: 'off' });
test.beforeAll(async () => { mkdirSync(captures, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`clouds render, follow lighting and release resources (${reducedMotion})`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => {
      if (message.type() === 'error' && /shader|WebGL|GL_INVALID/i.test(message.text())) errors.push(message.text());
    });
    await page.emulateMedia({ reducedMotion });
    await harness.mount(page, { birdLab: { view: 'observatory3d' } }, 'document.querySelector("[data-birdlab-3d-canvas]")?._birdlab3d');
    const initial = await page.evaluate(() => {
      const w = window as any, canvas = document.querySelector('[data-birdlab-3d-canvas]') as any;
      const controller = canvas._birdlab3d, review = w.cloudscapeReview;
      controller.setPaused(true); controller.seek(0);
      const sky = review.scene.getObjectByName('birdlab-sky');
      w.cloudTextureDisposals = 0;
      sky.material.uniforms.cloudField.value.addEventListener('dispose', () => w.cloudTextureDisposals++);
      return { offset: sky.material.uniforms.cloudOffset.value.toArray(), texture: sky.material.uniforms.cloudField.value.uuid };
    });
    expect(initial.offset).toEqual([0, 0]);
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).cloudscapeReview.scene.getObjectByName('birdlab-sky').material.uniforms.cloudOffset.value.toArray())).toEqual([0, 0]);

    const captures: string[] = [];
    for (const lighting of ['daylight', 'golden']) {
      const sample = await page.evaluate(lighting => {
        const w = window as any, canvas = document.querySelector('[data-birdlab-3d-canvas]') as any;
        canvas._birdlab3d.setLighting(lighting); canvas._birdlab3d.seek(28);
        const { renderer, scene, camera } = w.cloudscapeReview, sky = scene.getObjectByName('birdlab-sky');
        // Look across the canopy with an open sky, using the actual habitat,
        // lighting and compiled sky shader rather than a mock cloud plate.
        const view = camera.clone(); view.fov = 55; view.position.set(14, 14, 24);
        view.lookAt(-16, 22, -10); view.updateProjectionMatrix();
        renderer.render(scene, view);
        return { image: canvas.toDataURL('image/png'), offset: sky.material.uniforms.cloudOffset.value.toArray(),
          texture: sky.material.uniforms.cloudField.value.uuid,
          fogMatches: sky.material.uniforms.bottom.value.equals(scene.fog.color),
          shadersReady: renderer.info.programs.every((program: any) => !program.diagnostics || program.diagnostics.runnable),
          calls: renderer.info.render.calls };
      }, lighting);
      expect(sample.shadersReady).toBe(true); expect(sample.calls).toBeGreaterThan(1);
      expect(sample.fogMatches).toBe(true); expect(sample.texture).toBe(initial.texture);
      expect(sample.offset).toEqual(reducedMotion === 'reduce' ? [0, 0] : [28 * .00045, 28 * .00019]);
      captures.push(sample.image);
      writeFileSync(resolve('reports/avian-richness-2026-10-17/final', `woodland-${lighting}-${reducedMotion}.png`), Buffer.from(sample.image.split(',')[1], 'base64'));
      await testInfo.attach(`cloudscape-${lighting}-${reducedMotion}`, { body: Buffer.from(sample.image.split(',')[1], 'base64'), contentType: 'image/png' });
    }
    expect(captures[0]).not.toBe(captures[1]);
    const released = await page.evaluate(() => {
      const w = window as any, canvas = document.querySelector('[data-birdlab-3d-canvas]') as any;
      const controller = canvas._birdlab3d; controller.dispose(); controller.dispose();
      return { count: w.cloudTextureDisposals, ready: canvas.hasAttribute('data-birdlab-3d-ready'), controller: !!canvas._birdlab3d };
    });
    expect(released).toEqual({ count: 1, ready: false, controller: false });
    expect(errors).toEqual([]);
  });
}
