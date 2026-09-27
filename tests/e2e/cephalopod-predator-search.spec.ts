import { test, expect as baseExpect, Page } from '@playwright/test';
const expect = baseExpect.configure({ timeout: 30000 });
import { GlHarness } from './helpers/stem_gl_harness';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const canvas = 'canvas[role=application]';
test.describe.configure({ timeout: 120000 });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function fixture(page: Page) {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', huntMode: 'free', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any;
    w.__scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
    w.__player = w.__scene.getObjectByName('cl-player');
    w.__predator = w.__scene.children.find((o: any) => o.userData.aggroRange === 10 && o.userData.state === 'patrol');
    w.__scene.children.filter((o: any) => o.userData.aggroRange).forEach((o: any) => { o.position.set(200, 1, 200); o.userData.cooldownUntil = Infinity; if ('homeX' in o.userData) { o.userData.homeX = 200; o.userData.homeZ = 200; } });
    const rocks = w.__scene.children.filter((o: any) => o.userData.substrate === 'rock');
    rocks.forEach((r: any) => { r.position.set(300, 1, 300); r.scale.setScalar(0.001); r.userData.substrateRadius = 0; });
    w.__cover = rocks[0]; w.__cover.geometry.dispose(); w.__cover.geometry = new w.THREE.BoxGeometry(60, 9, 0.8); w.__cover.rotation.set(0, 0, 0); w.__cover.scale.set(1, 1, 1);
    w.__predator.position.set(0, 1.2, 6); Object.assign(w.__predator.userData, { aggroRange: 50, speed: 0, cooldownUntil: 0, awareness: 0, state: 'patrol' });
  });
  await expect.poll(() => state(page)).toBe('attacking');
}
const state = (page: Page) => page.evaluate(() => (window as any).__predator.userData.state);
async function conceal(page: Page) {
  await page.evaluate(() => { const w = window as any; w.__cover.position.set(0, 2.5, 3); w.__cover.updateMatrixWorld(true); w.__player.position.x = 6; });
  await expect.poll(() => state(page)).toBe('searching');
}
test('cover freezes the remembered prey position, then bounded search disengages', async ({ page }) => {
  await fixture(page);
  await page.evaluate(() => { (window as any).__player.position.x = 1; });
  await expect.poll(() => page.evaluate(() => (window as any).__predator.userData.lastSeen.x)).toBeCloseTo(1, 3);
  await conceal(page);
  const remembered = await page.evaluate(() => { const u = (window as any).__predator.userData; return { x: u.lastSeen.x, z: u.lastSeen.z, origin: u.searchOrigin.toArray(), time: u.lastSeenAt }; });
  expect(remembered.x).toBeCloseTo(1, 3); expect(remembered.origin[0]).toBeCloseTo(1, 3);
  await expect(page.locator('.cl-hunt-mission')).toContainText('searching your last seen position');
  const blockedPosition = await page.evaluate(() => { const w = window as any; w.__player.position.x = 10; w.__predator.userData.speed = 3; return w.__predator.position.toArray(); });
  await expect.poll(() => page.evaluate(() => (window as any).__predator.userData.searchFor)).toBeGreaterThan(0.6);
  expect(await page.evaluate(() => { const u = (window as any).__predator.userData; return { x: u.lastSeen.x, time: u.lastSeenAt }; })).toEqual({ x: remembered.x, time: remembered.time });
  expect(await page.evaluate(() => (window as any).__predator.position.toArray())).toEqual(blockedPosition);
  await expect.poll(() => state(page), { timeout: 30000 }).toBe('patrol');
  const finished = await page.evaluate(() => { const u = (window as any).__predator.userData; return { memory: u.lastSeen, awareness: u.awareness, searchFor: u.searchFor }; });
  expect(finished.memory).toBeNull(); expect(finished.awareness).toBe(0); expect(finished.searchFor).toBeGreaterThan(3.2); expect(finished.searchFor).toBeLessThan(3.3);
});
test('search pauses with the dive and reacquires only after the player becomes visible', async ({ page }) => {
  await fixture(page); await conceal(page);
  await page.locator(canvas).focus(); await page.keyboard.press('Escape');
  const frozen = await page.evaluate(() => { const u = (window as any).__predator.userData; return { searchFor: u.searchFor, seen: u.lastSeen.toArray(), position: (window as any).__predator.position.toArray() }; });
  await page.waitForTimeout(650);
  expect(await page.evaluate(() => { const u = (window as any).__predator.userData; return { searchFor: u.searchFor, seen: u.lastSeen.toArray(), position: (window as any).__predator.position.toArray() }; })).toEqual(frozen);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { (window as any).__cover.position.set(300, 1, 300); (window as any).__cover.updateMatrixWorld(true); });
  await expect.poll(() => state(page)).toBe('attacking');
  await expect.poll(() => page.evaluate(() => (window as any).__predator.userData.lastSeen.x)).toBeCloseTo(6, 3);
  await expect(page.locator('.cl-hunt-mission')).toContainText('Predator charging');
});
test('a predator cannot bite through nearby rock cover or an active ink cloud', async ({ page }) => {
  await fixture(page);
  await page.evaluate(() => { const w = window as any; w.__cover.geometry.dispose(); w.__cover.geometry = new w.THREE.BoxGeometry(20, 6, 0.2); w.__cover.position.set(0, 2, 0.6); w.__cover.updateMatrixWorld(true); w.__predator.position.set(0, 1.2, 1.2); });
  const health = await page.locator('[data-hud=health]').innerText();
  await expect.poll(() => state(page)).toBe('searching');
  expect(await page.locator('[data-hud=health]').innerText()).toBe(health);
  await page.locator(canvas).focus(); await page.keyboard.press('KeyI'); await expect(page.locator('[data-hud=ink]')).toContainText('2/3');
  await page.evaluate(() => { const w = window as any; w.__cover.position.set(300, 1, 300); w.__cover.updateMatrixWorld(true); Object.assign(w.__predator.userData, { state: 'attacking', stateTimer: 0, lostFor: 0 }); w.__predator.position.set(0, 1.2, 1.2); });
  await expect.poll(() => state(page)).toBe('patrol');
  expect(await page.locator('[data-hud=health]').innerText()).toBe(health);
});
