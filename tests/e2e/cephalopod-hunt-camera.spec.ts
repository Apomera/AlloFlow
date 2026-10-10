import { test, expect, Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { clickCephalopodControl } from './helpers/cephalopod_controls';
import { useCephalopodAudioFallback } from './helpers/cephalopod_audio';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 1000, height: 1000, layout: 'document' });
const errors = new WeakMap<Page, string[]>(), canvas = 'canvas[role=application]';
async function step(page: Page, count = 1) {
  await page.evaluate(async count => { const w = window as any; for (let i = 0; i < count; i++) { w.__huntStep = .05; let frames = 0; do { await new Promise<void>(r => requestAnimationFrame(() => r())); if (++frames > 120) throw Error('Hunt clock stalled'); } while (w.__huntStep); } }, count);
}
async function settle(page: Page) { await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))); }
const read = (page: Page) => page.evaluate(() => (window as any).__huntRead());
async function view(page: Page) {
  const b = page.getByRole('button', { name: 'View', exact: true });
  if (!await b.isVisible()) await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await b.click(); await settle(page);
}
async function mount(page: Page, phone: boolean) {
  await useCephalopodAudioFallback(page);
  await page.goto(harness.url + '/__harness'); await page.waitForFunction(() => !!(window as any).THREE?.Clock && typeof (window as any).__mount === 'function');
  await page.evaluate(phone => {
    const w = window as any; w.__huntStep = 0; w.__huntFirst = false;
    w.THREE.Clock.prototype.getDelta = function () { if (!w.__huntFirst) { w.__huntFirst = true; document.querySelector('canvas[role=application]')!.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true, cancelable: true })); } const dt = w.__huntStep; w.__huntStep = 0; return dt; };
    document.getElementById('wrap')!.style.width = '100%';
    w.__mount({ cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: phone ? 'blueRinged' : 'giantPacific', huntMode: 'observe', huntSeed: 2741, huntQuality: phone ? 'low' : 'balanced', _threeLoaded: true } });
  }, phone);
  await page.waitForFunction(() => (window as any).__glRecorder.records.some((r: any) => r.scene?.getObjectByName('cl-player') && r.canvas.isConnected && r.draws > 0));
  await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await step(page, 4);
  await page.evaluate(() => {
    const w = window as any, T = w.THREE, record = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1), scene = record.scene, player = scene.getObjectByName('cl-player');
    const scale = player.userData.species === 'blueRinged' ? .72 : 1.4, crabs = scene.children.filter((o: any) => o.userData.alive && o.userData.cfg);
    if (crabs.length < 2) throw Error('Two real crabs required');
    scene.children.forEach((o: any) => { if (o.userData.alive && (o.userData.cfg || o.userData.offset)) { o.position.set(80, .18, 80); if (o.userData.cfg) { o.userData.speed = 0; o.userData.wanderTimer = 100; } } if (o.userData.substrate === 'rock') { o.position.set(-45, o.position.y, -45); o.userData.substrateRadius = 0; } if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9; });
    player.updateWorldMatrix(true, false); crabs[0].position.copy(player.localToWorld(new T.Vector3(.55, -.37, 1.35).multiplyScalar(scale))); crabs[1].position.copy(player.localToWorld(new T.Vector3(-.7, -.37, 1.55).multiplyScalar(scale)));
    const backdrop = scene.children.find((o: any) => o.material?.uniforms?.bottomColor); backdrop.onAfterRender = function (r: any, s: any, c: any) { w.__huntCamera = c; w.__huntRenderer = r; };
    const refs: any[] = []; player.traverse((o: any) => { if (o.geometry) refs.push({ o, g: o.geometry, m: o.material, a: o.geometry.attributes.position, data: o.geometry.attributes.position.array }); });
    w.__huntRead = () => {
      const c = w.__huntCamera, p = new T.Vector3(); let x = 0, y = 0, finite = true; player.updateWorldMatrix(true, true);
      for (const r of refs) if (!r.o.isInstancedMesh && r.o.visible) for (let i = 0; i < r.a.count; i += 3) { p.fromBufferAttribute(r.a, i).applyMatrix4(r.o.matrixWorld).project(c); x = Math.max(x, Math.abs(p.x)); y = Math.max(y, Math.abs(p.y)); finite = finite && Number.isFinite(p.x + p.y + p.z); }
      const halo = scene.getObjectByName('cl-target');
      return { camera: c.position.toArray(), rotation: c.quaternion.toArray(), aspect: c.aspect, maxX: x, maxY: y, finite, player: player.position.toArray(), playerRotation: player.quaternion.toArray(), pose: Array.from(player.getObjectByName('cl-arm-2').geometry.attributes.position.array), score: Number(document.querySelector('[data-hud=score]')!.textContent), preyAlive: crabs[0].userData.alive, expectedScore: Math.round(crabs[0].userData.cfg.score * (scale === 1.4 ? 1.5 : 1)), halo: halo.visible ? Math.abs(halo.quaternion.dot(c.quaternion)) : 1, retained: refs.every(r => r.o.geometry === r.g && r.o.material === r.m && r.g.attributes.position === r.a && r.a.array === r.data), contextLost: record.ctx.isContextLost() };
    };
  });
  await page.keyboard.press('KeyT'); await step(page, 3); await settle(page);
}
const framed = (s: any) => { expect(s.finite && s.retained && !s.contextLost).toBe(true); expect(s.maxX).toBeLessThan(1); expect(s.maxY).toBeLessThan(1); expect(s.halo).toBeGreaterThan(.99999); };
test.describe.configure({ timeout: 480000, retries: 0 }); test.use({ trace: 'off', video: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => { const e: string[] = []; errors.set(page, e); page.on('pageerror', x => e.push(x.message)); page.on('console', m => { if (m.type() === 'error') e.push(m.text()); }); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });
for (const phone of [false, true]) test.describe(phone ? 'Phone Hunt view' : 'Desktop Hunt view', () => {
  if (phone) test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('frames real capture, pause, resize and turns with working view and inspection controls', async ({ page }, testInfo) => {
    await mount(page, phone); await page.locator(canvas).focus(); await page.keyboard.press('Escape'); const before = await read(page);
    for (let i = 0; i < 3; i++) await view(page);
    await expect(page.getByRole('button', { name: 'View', exact: true, includeHidden: true })).toHaveText('View · Hunt'); const hunt = await read(page); framed(hunt); expect(hunt.camera).not.toEqual(before.camera); expect(hunt.player).toEqual(before.player); expect(hunt.pose).toEqual(before.pose); expect(hunt.score).toBe(before.score);
    await page.setViewportSize(phone ? { width: 844, height: 390 } : { width: 760, height: 950 }); await settle(page); await expect.poll(async () => (await read(page)).aspect).not.toBe(hunt.aspect); const resized = await read(page); framed(resized); expect(resized.pose).toEqual(hunt.pose); expect(resized.player).toEqual(hunt.player);
    await page.setViewportSize(phone ? { width: 390, height: 844 } : { width: 1280, height: 1000 }); await settle(page); await page.locator(canvas).focus(); await page.keyboard.press('Escape');
    if (phone) await page.getByRole('button', { name: 'Strike / hold', exact: true }).tap(); else await page.keyboard.press('KeyE'); await step(page); await step(page, 2); await page.locator(canvas).focus(); await page.keyboard.press('KeyT'); await step(page, 2); const contact = await read(page); framed(contact); expect(contact.preyAlive).toBe(false); expect(contact.score).toBe(contact.expectedScore);
    const pixels = await harness.glPixels(page); expect(pixels && !looksBlank(pixels)).toBeTruthy(); await testInfo.attach('native-hunt-contact', { body: pixels!.png, contentType: 'image/png' });
    await step(page, 9); await page.keyboard.down('KeyW'); await page.keyboard.down('KeyD'); await step(page, 8); await page.keyboard.up('KeyD'); await page.keyboard.up('KeyW'); const turning = await read(page); framed(turning); expect(turning.player).not.toEqual(contact.player);
    await clickCephalopodControl(page, 'Inspect'); await expect(page.getByRole('region', { name: 'Specimen inspection' })).toBeVisible(); const inspected = await read(page); await step(page, 3); expect((await read(page)).pose).toEqual(inspected.pose); await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await step(page); framed(await read(page));
    await clickCephalopodControl(page, 'Help / settings'); await page.getByLabel('Reduced motion', { exact: true }).check(); await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await step(page, 2); framed(await read(page));
    await page.locator(canvas).focus(); await page.keyboard.press('KeyV'); await expect(page.getByRole('button', { name: 'View', exact: true, includeHidden: true })).toHaveText('View · Follow');
    await testInfo.attach('native-hunt-states', { body: JSON.stringify({ before, hunt, resized, contact, turning }), contentType: 'application/json' });
    await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  });
});
