# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-hunt-camera.spec.ts >> Phone Hunt view >> frames real capture, pause, resize and turns with working view and inspection controls
- Location: tests\e2e\cephalopod-hunt-camera.spec.ts:53:7

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByRole('button', { name: 'View', exact: true })
Expected: "View · Hunt"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for getByRole('button', { name: 'View', exact: true })

```

```yaml
- region "Cephalopod Lab":
  - text: "Cephalopod Lab 13 areas · 98 sections Evidence-based cephalopod biology: dynamic skin, distributed neural control, hunting strategies, diverse life histories, and deep evolutionary history. Find a section"
  - searchbox "Find a section"
  - status: 98 sections
  - tablist "Cephalopod Lab topic areas":
    - tab "Start (2 sections)": Start
    - tab "Simulations (5 sections)" [selected]: Simulations
    - tab "Activities (7 sections)": Activities
    - tab "Biology (16 sections)": Biology
    - tab "Intelligence (2 sections)": Intelligence
    - tab "Evolution & Time (4 sections)": Evolution & Time
    - tab "Science (8 sections)": Science
    - tab "Conservation & Ethics (6 sections)": Conservation & Ethics
    - tab "Applications (2 sections)": Applications
    - tab "Culture (6 sections)": Culture
    - tab "Field & Citizen Science (6 sections)": Field & Citizen Science
    - tab "For Teachers (19 sections)": For Teachers
    - tab "Reference (15 sections)": Reference
  - tabpanel "Simulations (5 sections)":
    - tablist "Simulations sections":
      - tab "Hunter Sim" [selected]
      - tab "Evasion Sim"
      - tab "Day in the Life"
      - tab "Camouflage Lab"
      - tab "Camo Discovery"
  - tabpanel "Hunter Sim":
    - text: 🎯 Hunter Sim — 3D Underwater Choose a cephalopod and explore an underwater world. Read the reef, conserve energy, and learn how your animal moves, feeds, and hides. Keyboard and touch controls are available. Run stats 0 Meals caught 0 Dives 0 Best run 0/3 Pearls
    - application "3D octopus hunt simulator. WASD to crawl, A and D rotate. Space jets. Click hunts. I uses ink defense. G grabs shelters.": Interactive 3D octopus hunt. Use WASD to crawl, A and D to rotate, Space to jet, I for ink defense, and G to grab shelters.
    - 'status "Hunter Sim status: health, stamina, hunger, camouflage, score"': 💍 Blue-Ringed Octopus Day Reef Zone · 26m · 4 atm HEALTH 65 ENERGY 70 STAMINA 100 CAMO 8% on sand · moving
    - text: ⏸ Paused Press Esc to resume
    - status:
      - text: Field study · Explore freely, without hunger or injury.
      - group "Selected prey": Rock crab · 1.0 m · ahead IN RANGE · tap Strike / hold · prey is fleeing
    - group "Movement and depth":
      - button "Forward"
      - button "Left"
      - button "Back"
      - button "Right"
      - button "Rise"
      - button "Dive"
    - group "Dive actions":
      - text: Strike / hold rock crab
      - button "Pause"
      - button "Forage"
      - button "Tools"
      - button "Jet"
      - button "Strike / hold"
      - button "Ink defense, 3 of 3 reserves, Ready": Ink 3/3 Ready
      - button "Interact"
      - button "Target"
    - button "◀ End run + surface"
    - text: "Tip: Tab to or click the canvas so keyboard input is captured."
- status: Hunt view
```

# Test source

```ts
  1  | import { test, expect, Page } from '@playwright/test';
  2  | import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
  3  | import { clickCephalopodControl } from './helpers/cephalopod_controls';
  4  | import { useCephalopodAudioFallback } from './helpers/cephalopod_audio';
  5  | 
  6  | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 1000, height: 1000, layout: 'document' });
  7  | const errors = new WeakMap<Page, string[]>(), canvas = 'canvas[role=application]';
  8  | async function step(page: Page, count = 1) {
  9  |   await page.evaluate(async count => { const w = window as any; for (let i = 0; i < count; i++) { w.__huntStep = .05; let frames = 0; do { await new Promise<void>(r => requestAnimationFrame(() => r())); if (++frames > 120) throw Error('Hunt clock stalled'); } while (w.__huntStep); } }, count);
  10 | }
  11 | async function settle(page: Page) { await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))); }
  12 | const read = (page: Page) => page.evaluate(() => (window as any).__huntRead());
  13 | async function view(page: Page) {
  14 |   const b = page.getByRole('button', { name: 'View', exact: true });
  15 |   if (!await b.isVisible()) await page.getByRole('button', { name: 'Tools', exact: true }).click();
  16 |   await b.click(); await settle(page);
  17 | }
  18 | async function mount(page: Page, phone: boolean) {
  19 |   await useCephalopodAudioFallback(page);
  20 |   await page.goto(harness.url + '/__harness'); await page.waitForFunction(() => !!(window as any).THREE?.Clock && typeof (window as any).__mount === 'function');
  21 |   await page.evaluate(phone => {
  22 |     const w = window as any; w.__huntStep = 0; w.__huntFirst = false;
  23 |     w.THREE.Clock.prototype.getDelta = function () { if (!w.__huntFirst) { w.__huntFirst = true; document.querySelector('canvas[role=application]')!.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true })); } const dt = w.__huntStep; w.__huntStep = 0; return dt; };
  24 |     document.getElementById('wrap')!.style.width = '100%';
  25 |     w.__mount({ cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: phone ? 'blueRinged' : 'giantPacific', huntMode: 'observe', huntSeed: 2741, huntQuality: phone ? 'low' : 'balanced', _threeLoaded: true } });
  26 |   }, phone);
  27 |   await page.waitForFunction(() => (window as any).__glRecorder.records.some((r: any) => r.scene?.getObjectByName('cl-player') && r.canvas.isConnected && r.draws > 0));
  28 |   await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await step(page, 4);
  29 |   await page.evaluate(() => {
  30 |     const w = window as any, T = w.THREE, record = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1), scene = record.scene, player = scene.getObjectByName('cl-player');
  31 |     const scale = player.userData.species === 'blueRinged' ? .72 : 1.4, crabs = scene.children.filter((o: any) => o.userData.alive && o.userData.cfg);
  32 |     if (crabs.length < 2) throw Error('Two real crabs required');
  33 |     scene.children.forEach((o: any) => { if (o.userData.alive && (o.userData.cfg || o.userData.offset)) { o.position.set(80, .18, 80); if (o.userData.cfg) { o.userData.speed = 0; o.userData.wanderTimer = 100; } } if (o.userData.substrate === 'rock') { o.position.set(-45, o.position.y, -45); o.userData.substrateRadius = 0; } if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9; });
  34 |     player.updateWorldMatrix(true, false); crabs[0].position.copy(player.localToWorld(new T.Vector3(.55, -.37, 1.35).multiplyScalar(scale))); crabs[1].position.copy(player.localToWorld(new T.Vector3(-.7, -.37, 1.55).multiplyScalar(scale)));
  35 |     const backdrop = scene.children.find((o: any) => o.material?.uniforms?.bottomColor); backdrop.onAfterRender = function (r: any, s: any, c: any) { w.__huntCamera = c; w.__huntRenderer = r; };
  36 |     const refs: any[] = []; player.traverse((o: any) => { if (o.geometry) refs.push({ o, g: o.geometry, m: o.material, a: o.geometry.attributes.position, data: o.geometry.attributes.position.array }); });
  37 |     w.__huntRead = () => {
  38 |       const c = w.__huntCamera, p = new T.Vector3(); let x = 0, y = 0, finite = true; player.updateWorldMatrix(true, true);
  39 |       for (const r of refs) if (!r.o.isInstancedMesh && r.o.visible) for (let i = 0; i < r.a.count; i += 3) { p.fromBufferAttribute(r.a, i).applyMatrix4(r.o.matrixWorld).project(c); x = Math.max(x, Math.abs(p.x)); y = Math.max(y, Math.abs(p.y)); finite = finite && Number.isFinite(p.x + p.y + p.z); }
  40 |       const halo = scene.getObjectByName('cl-target');
  41 |       return { camera: c.position.toArray(), rotation: c.quaternion.toArray(), aspect: c.aspect, maxX: x, maxY: y, finite, player: player.position.toArray(), playerRotation: player.quaternion.toArray(), pose: Array.from(player.getObjectByName('cl-arm-2').geometry.attributes.position.array), score: Number(document.querySelector('[data-hud=score]')!.textContent), preyAlive: crabs[0].userData.alive, expectedScore: Math.round(crabs[0].userData.cfg.score * (scale === 1.4 ? 1.5 : 1)), halo: halo.visible ? Math.abs(halo.quaternion.dot(c.quaternion)) : 1, retained: refs.every(r => r.o.geometry === r.g && r.o.material === r.m && r.g.attributes.position === r.a && r.a.array === r.data), contextLost: record.ctx.isContextLost() };
  42 |     };
  43 |   });
  44 |   await page.keyboard.press('KeyT'); await step(page, 3); await settle(page);
  45 | }
  46 | const framed = (s: any) => { expect(s.finite && s.retained && !s.contextLost).toBe(true); expect(s.maxX).toBeLessThan(1); expect(s.maxY).toBeLessThan(1); expect(s.halo).toBeGreaterThan(.99999); };
  47 | test.describe.configure({ timeout: 240000, retries: 0 }); test.use({ trace: 'off', video: 'off' });
  48 | test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
  49 | test.beforeEach(({ page }) => { const e: string[] = []; errors.set(page, e); page.on('pageerror', x => e.push(x.message)); page.on('console', m => { if (m.type() === 'error') e.push(m.text()); }); });
  50 | test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });
  51 | for (const phone of [false, true]) test.describe(phone ? 'Phone Hunt view' : 'Desktop Hunt view', () => {
  52 |   if (phone) test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  53 |   test('frames real capture, pause, resize and turns with working view and inspection controls', async ({ page }, testInfo) => {
  54 |     await mount(page, phone); await page.locator(canvas).focus(); await page.keyboard.press('Escape'); const before = await read(page);
  55 |     for (let i = 0; i < 3; i++) await view(page);
> 56 |     await expect(page.getByRole('button', { name: 'View', exact: true })).toHaveText('View · Hunt'); const hunt = await read(page); framed(hunt); expect(hunt.camera).not.toEqual(before.camera); expect(hunt.player).toEqual(before.player); expect(hunt.pose).toEqual(before.pose); expect(hunt.score).toBe(before.score);
     |                                                                           ^ Error: expect(locator).toHaveText(expected) failed
  57 |     await page.setViewportSize(phone ? { width: 844, height: 390 } : { width: 760, height: 950 }); await settle(page); await expect.poll(async () => (await read(page)).aspect).not.toBe(hunt.aspect); const resized = await read(page); framed(resized); expect(resized.pose).toEqual(hunt.pose); expect(resized.player).toEqual(hunt.player);
  58 |     await page.setViewportSize(phone ? { width: 390, height: 844 } : { width: 1280, height: 1000 }); await settle(page); await page.locator(canvas).focus(); await page.keyboard.press('Escape');
  59 |     if (phone) await page.getByRole('button', { name: 'Strike / hold', exact: true }).tap(); else await page.keyboard.press('KeyE'); await step(page); await step(page, 2); await page.locator(canvas).focus(); await page.keyboard.press('KeyT'); await step(page, 2); const contact = await read(page); framed(contact); expect(contact.preyAlive).toBe(false); expect(contact.score).toBe(contact.expectedScore);
  60 |     const pixels = await harness.glPixels(page); expect(pixels && !looksBlank(pixels)).toBeTruthy(); await testInfo.attach('native-hunt-contact', { body: pixels!.png, contentType: 'image/png' });
  61 |     await step(page, 9); await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD'); await step(page, 8); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW'); const turning = await read(page); framed(turning); expect(turning.player).not.toEqual(contact.player);
  62 |     await clickCephalopodControl(page, 'Inspect'); await expect(page.getByRole('region', { name: 'Specimen inspection' })).toBeVisible(); const inspected = await read(page); await step(page, 3); expect((await read(page)).pose).toEqual(inspected.pose); await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await step(page); framed(await read(page));
  63 |     await clickCephalopodControl(page, 'Help / settings'); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await step(page, 2); framed(await read(page));
  64 |     await page.locator(canvas).focus(); await page.keyboard.press('KeyV'); await expect(page.getByRole('button', { name: 'View', exact: true })).toHaveText('View · Follow');
  65 |     await testInfo.attach('native-hunt-states', { body: JSON.stringify({ before, hunt, resized, contact, turning }), contentType: 'application/json' });
  66 |     await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  67 |   });
  68 | });
  69 | 
```