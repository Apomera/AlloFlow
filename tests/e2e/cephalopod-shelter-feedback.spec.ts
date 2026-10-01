import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// A repo-relative saved source allows the same visible-guidance oracle to
// reproduce the old behavior without replacing the working runtime.
const harness = new GlHarness({ toolFile: (process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g, '/'), toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const canvas = 'canvas[role=application]', failures = new WeakMap<Page, string[]>();
async function step(page: Page, frames: number, code?: string) {
  await page.evaluate(async ({ frames, code }) => {
    const w = window as any, target = document.querySelector('canvas[role=application]')!;
    const event = (type: string) => target.dispatchEvent(new KeyboardEvent(type, { code, key: code?.slice(3).toLowerCase(), bubbles: true, cancelable: true }));
    if (code) event('keydown');
    try { for (let i = 0; i < frames; i++) { w.__sfStep = .05; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__sfStep !== 0); } }
    finally { if (code) event('keyup'); }
  }, { frames, code });
  if (code) await step(page, 1);
}
async function snapshot(page: Page, kind: 'conch' | 'pearl') {
  return page.evaluate(kind => { const w = window as any, actor = kind === 'conch' ? w.__sfConch : w.__sfPearl, prompt = document.querySelector('.cl-hunt-action-prompt'), rawHint = prompt?.textContent || '', opacity = prompt ? Number(getComputedStyle(prompt).opacity) : 0; return { hint: opacity > 0 ? rawHint : '', rawHint, opacity, height: Math.abs(w.__sfPlayer.position.y - actor.position.y), distance: Math.hypot(w.__sfPlayer.position.x - actor.position.x, w.__sfPlayer.position.z - actor.position.z), state: actor.userData.state, inScene: actor.parent === w.__sfScene, carried: actor.parent === w.__sfPlayer }; }, kind);
}
test.describe.configure({ timeout: 180000, retries: 0 }); test.use({ video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => { const errors: string[] = []; failures.set(page, errors); page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); }); });
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(failures.get(page)).toEqual([]); });

test('shelter and pearl hints agree with actual vertical pickup reach', async ({ page }, testInfo) => {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'free', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any; w.__sfScene = w.__glRecorder.records.filter((row: any) => row.scene && row.canvas.isConnected).at(-1).scene; w.__sfPlayer = w.__sfScene.getObjectByName('cl-player');
    w.__sfConch = w.__sfScene.children.find((object: any) => object.userData.shelterType === 'conch'); w.__sfPearl = w.__sfScene.children.find((object: any) => object.userData.landmarkType);
    if (!w.__sfConch || !w.__sfPearl) throw new Error('Actual uncollected conch and landmark pearl are required');
    w.__sfStep = 0; w.THREE.Clock.prototype.getDelta = function () { const dt = w.__sfStep; w.__sfStep = 0; return dt; };
    w.__sfScene.children.forEach((object: any) => { if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9; if (object.userData.substrate === 'rock') { object.position.x = -45; object.position.z = -45; object.userData.substrateRadius = 0; } if (object.userData.shelterType || object.userData.landmarkType) { object.position.x = -40; object.position.z = -40; } });
    w.__sfPlayer.position.x = -16; w.__sfPlayer.position.z = 0; w.__sfConch.position.x = -16; w.__sfConch.position.z = .4;
  });
  await page.locator(canvas).focus(); await step(page, 4); const conchGrounded = await snapshot(page, 'conch'); expect(conchGrounded.height).toBeLessThan(1.2); expect(conchGrounded.hint).toMatch(/pick up.*conch/i);
  await step(page, 25, 'KeyQ'); const conchHigh = await snapshot(page, 'conch'); expect(conchHigh.height).toBeGreaterThan(2); expect(conchHigh.distance).toBeLessThan(1.6);
  await step(page, 1, 'KeyG'); const conchRejected = await snapshot(page, 'conch'); expect(conchRejected.state).toBe('free'); expect(conchRejected.inScene).toBe(true); expect(conchRejected.carried).toBe(false);
  expect.soft(conchHigh.hint, 'No pickup hint may promise an action that the actual G handler rejects by height').not.toMatch(/pick up.*conch/i);
  await step(page, 25, 'KeyZ'); await step(page, 1, 'KeyG'); const carried = await snapshot(page, 'conch'); expect(carried.state).toBe('carried'); expect(carried.carried).toBe(true); await step(page, 1, 'KeyG'); expect((await snapshot(page, 'conch')).state).toBe('dropped');

  await page.evaluate(() => { const w = window as any; w.__sfPearl.position.set(w.__sfPlayer.position.x, .75, w.__sfPlayer.position.z + .4); w.__sfPearl.userData.restY = .75; });
  await step(page, 3); const pearlGrounded = await snapshot(page, 'pearl'); expect(pearlGrounded.height).toBeLessThan(1.5); expect(pearlGrounded.hint).toMatch(/collect pearl/i);
  await step(page, 25, 'KeyQ'); const pearlHigh = await snapshot(page, 'pearl'); expect(pearlHigh.height).toBeGreaterThan(2); expect(pearlHigh.distance).toBeLessThan(1.4);
  await step(page, 1, 'KeyG'); const pearlRejected = await snapshot(page, 'pearl'); expect(pearlRejected.inScene).toBe(true);
  expect.soft(pearlHigh.hint, 'Pearl hints must use the same vertical reach as real collection').not.toMatch(/collect pearl/i);
  await step(page, 25, 'KeyZ'); await step(page, 1, 'KeyG'); const collected = await snapshot(page, 'pearl'); expect(collected.inScene).toBe(false);
  await testInfo.attach('actual-pickup-height-evidence', { body: JSON.stringify({ conchGrounded, conchHigh, conchRejected, carried, pearlGrounded, pearlHigh, pearlRejected, collected }, null, 2), contentType: 'application/json' });
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});
