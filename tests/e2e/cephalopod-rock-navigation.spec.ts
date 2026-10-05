import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
async function step(page: Page, count: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let i = 0; i < count; i++) {
      w.__navigationStep = .05;
      do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__navigationStep !== 0);
    }
  }, count);
}
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('real movement resolves a translated rock center and permits swimming fully above its rendered top', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'observe', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  // A diagnostic translation exercises the live frame callback and recycled
  // collision cache. Geometry, controls, and collision code stay untouched.
  const initial = await page.evaluate(() => {
    const w = window as any;
    w.__navigationScene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
    w.__navigationPlayer = w.__navigationScene.getObjectByName('cl-player');
    w.__navigationRock = w.__navigationScene.children.find((r: any) => r.userData.substrate === 'rock');
    w.__navigationStep = 0;
    w.THREE.Clock.prototype.getDelta = function () { const dt = w.__navigationStep; w.__navigationStep = 0; return dt; };
    const p = w.__navigationPlayer, r = w.__navigationRock;
    w.__navigationOwned = { geometry: r.geometry, material: r.material, position: r.geometry.attributes.position, normal: r.geometry.attributes.normal, vertices: Array.from(r.geometry.attributes.position.array) };
    r.position.x = p.position.x; r.position.z = p.position.z;
    w.__navigationScene.updateMatrixWorld(true);
    const box = new w.THREE.Box3().setFromObject(r);
    return { x: p.position.x, z: p.position.z, y: p.position.y, bottom: box.min.y, top: box.max.y };
  });
  expect(initial.y).toBeGreaterThan(initial.bottom);
  expect(initial.y).toBeLessThan(initial.top);
  await step(page, 2);
  const resolved = await page.evaluate(() => ({ x: (window as any).__navigationPlayer.position.x, z: (window as any).__navigationPlayer.position.z }));
  expect(Math.hypot(resolved.x - initial.x, resolved.z - initial.z)).toBeGreaterThan(.5);
  await page.evaluate(() => document.querySelector('canvas[role=application]')!.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', key: 'q', bubbles: true, cancelable: true })));
  await step(page, 90);
  await page.evaluate(() => document.querySelector('canvas[role=application]')!.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ', key: 'q', bubbles: true, cancelable: true })));
  const above = await page.evaluate(() => {
    const w = window as any, p = w.__navigationPlayer, r = w.__navigationRock;
    r.position.x = p.position.x; r.position.z = p.position.z;
    w.__navigationScene.updateMatrixWorld(true);
    const box = new w.THREE.Box3().setFromObject(r);
    return { x: p.position.x, z: p.position.z, y: p.position.y, top: box.max.y };
  });
  expect(above.y - above.top).toBeGreaterThan(1);
  await step(page, 3);
  const after = await page.evaluate(() => {
    const w = window as any, p = w.__navigationPlayer, r = w.__navigationRock, owned = w.__navigationOwned;
    return { x: p.position.x, z: p.position.z, retained: r.geometry === owned.geometry && r.material === owned.material && r.geometry.attributes.position === owned.position && r.geometry.attributes.normal === owned.normal && Array.from(r.geometry.attributes.position.array).every((v, i) => v === owned.vertices[i]) };
  });
  expect(after.x).toBe(above.x); expect(after.z).toBe(above.z); expect(after.retained).toBe(true);
  await harness.unmount(page);
  expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(errors).toEqual([]);
});
