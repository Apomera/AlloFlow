# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-rock-navigation.spec.ts >> real movement resolves a translated rock center and permits swimming fully above its rendered top
- Location: tests\e2e\cephalopod-rock-navigation.spec.ts:19:5

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0.5
Received:   0
```

# Test source

```ts
  1  | import { test, expect, Page } from '@playwright/test';
  2  | import { GlHarness } from './helpers/stem_gl_harness';
  3  | 
  4  | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
  5  | async function step(page: Page, count: number) {
  6  |   await page.evaluate(async count => {
  7  |     const w = window as any;
  8  |     for (let i = 0; i < count; i++) {
  9  |       w.__navigationStep = .05;
  10 |       do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__navigationStep !== 0);
  11 |     }
  12 |   }, count);
  13 | }
  14 | test.describe.configure({ timeout: 180000, retries: 0 });
  15 | test.beforeAll(() => harness.start());
  16 | test.afterAll(() => harness.stop());
  17 | test.afterEach(async ({ page }) => harness.destroy(page));
  18 | 
  19 | test('real movement resolves a translated rock center and permits swimming fully above its rendered top', async ({ page }) => {
  20 |   const errors: string[] = [];
  21 |   page.on('pageerror', e => errors.push(e.message));
  22 |   page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  23 |   await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'humboldtSquid', huntMode: 'observe', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  24 |   // A diagnostic translation exercises the live frame callback and recycled
  25 |   // collision cache. Geometry, controls, and collision code stay untouched.
  26 |   const initial = await page.evaluate(() => {
  27 |     const w = window as any;
  28 |     w.__navigationScene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
  29 |     w.__navigationPlayer = w.__navigationScene.getObjectByName('cl-player');
  30 |     w.__navigationRock = w.__navigationScene.children.find((r: any) => r.userData.substrate === 'rock');
  31 |     w.__navigationStep = 0;
  32 |     w.THREE.Clock.prototype.getDelta = function () { const dt = w.__navigationStep; w.__navigationStep = 0; return dt; };
  33 |     const p = w.__navigationPlayer, r = w.__navigationRock;
  34 |     w.__navigationOwned = { geometry: r.geometry, material: r.material, position: r.geometry.attributes.position, normal: r.geometry.attributes.normal, vertices: Array.from(r.geometry.attributes.position.array) };
  35 |     r.position.x = p.position.x; r.position.z = p.position.z;
  36 |     return { x: p.position.x, z: p.position.z };
  37 |   });
  38 |   await step(page, 2);
  39 |   const resolved = await page.evaluate(() => ({ x: (window as any).__navigationPlayer.position.x, z: (window as any).__navigationPlayer.position.z }));
> 40 |   expect(Math.hypot(resolved.x - initial.x, resolved.z - initial.z)).toBeGreaterThan(.5);
     |                                                                      ^ Error: expect(received).toBeGreaterThan(expected)
  41 |   await page.evaluate(() => document.querySelector('canvas[role=application]')!.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', key: 'q', bubbles: true, cancelable: true })));
  42 |   await step(page, 90);
  43 |   await page.evaluate(() => document.querySelector('canvas[role=application]')!.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ', key: 'q', bubbles: true, cancelable: true })));
  44 |   const above = await page.evaluate(() => {
  45 |     const w = window as any, p = w.__navigationPlayer, r = w.__navigationRock;
  46 |     r.position.x = p.position.x; r.position.z = p.position.z;
  47 |     w.__navigationScene.updateMatrixWorld(true);
  48 |     const box = new w.THREE.Box3().setFromObject(r);
  49 |     return { x: p.position.x, z: p.position.z, y: p.position.y, top: box.max.y };
  50 |   });
  51 |   expect(above.y - above.top).toBeGreaterThan(1);
  52 |   await step(page, 3);
  53 |   const after = await page.evaluate(() => {
  54 |     const w = window as any, p = w.__navigationPlayer, r = w.__navigationRock, owned = w.__navigationOwned;
  55 |     return { x: p.position.x, z: p.position.z, retained: r.geometry === owned.geometry && r.material === owned.material && r.geometry.attributes.position === owned.position && r.geometry.attributes.normal === owned.normal && Array.from(r.geometry.attributes.position.array).every((v, i) => v === owned.vertices[i]) };
  56 |   });
  57 |   expect(after.x).toBe(above.x); expect(after.z).toBe(above.z); expect(after.retained).toBe(true);
  58 |   await harness.unmount(page);
  59 |   expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  60 |   expect(errors).toEqual([]);
  61 | });
  62 | 
```