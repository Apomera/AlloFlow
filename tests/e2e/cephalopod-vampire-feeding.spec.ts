import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { clickCephalopodControl } from './helpers/cephalopod_controls';

const harness = new GlHarness({ toolFile: (process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js').replace(/\\/g, '/'), toolId: 'cephalopodLab', width: 1200, height: 1000, layout: 'document' });
const canvas = 'canvas[role=application]', errors = new WeakMap<Page, string[]>();
test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1440, height: 1000 }, hasTouch: false, isMobile: false, video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => { const found: string[] = []; errors.set(page, found); page.on('pageerror', e => found.push(e.message)); page.on('console', m => { if (m.type() === 'error') found.push(m.text()); }); });
test.afterEach(async ({ page }) => { try { await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]); } finally { await harness.destroy(page); } expect(errors.get(page)).toEqual([]); });

async function step(page: Page, count: number) {
  await page.evaluate(async count => { const w = window as any; for (let i = 0; i < count; i++) { const before = w.__vampireTicks; w.__vampireStep = .05; for (let wait = 0; wait < 120 && w.__vampireTicks === before; wait++) await new Promise<void>(r => requestAnimationFrame(() => r())); if (w.__vampireTicks !== before + 1) throw new Error('Expected one actual counted simulation frame'); } }, count);
}
async function state(page: Page) {
  return page.evaluate(() => { const w = window as any; return { score: Number(document.querySelector('[data-hud=score]')!.textContent), food: w.__vampireFood.map((o: any) => ({ uuid: o.uuid, gather: o.userData.gather || 0, parent: o.parent === w.__vampireScene, position: o.position.toArray() })), prey: w.__vampirePrey.map((o: any) => ({ uuid: o.uuid, alive: o.userData.alive, parent: o.parent === w.__vampireScene })), ticks: w.__vampireTicks }; });
}
async function positionFood(page: Page, reachable: boolean) {
  await page.evaluate(reachable => { const w = window as any, p = w.__vampirePlayer.position; w.__vampireFood.forEach((o: any, i: number) => o.position.set(p.x + 7 + i * .025, p.y + 2, p.z)); if (reachable) w.__vampireFood[0].position.set(p.x, p.y, p.z + .5); }, reachable);
  await step(page, 3);
}

test('vampire desktop guidance uses real marine snow while T remains advice and existing feeding controls still work', async ({ page }, testInfo) => {
  await page.goto(harness.url + '/__harness'); await page.waitForFunction(() => !!(window as any).THREE?.Clock && typeof (window as any).__mount === 'function');
  await page.evaluate(() => { const w = window as any; w.__vampireStep = 0; w.__vampireTicks = 0; w.THREE.Clock.prototype.getDelta = function () { const dt = w.__vampireStep; w.__vampireStep = 0; if (dt) w.__vampireTicks++; return dt; }; w.__mount({ cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'vampireSquid', huntMode: 'free', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } }); });
  await page.waitForFunction(() => (window as any).__glRecorder.records.some((r: any) => r.scene?.getObjectByName('cl-player') && r.canvas.isConnected && r.draws > 0), undefined, { timeout: 90000 });
  await page.evaluate(() => { const w = window as any; w.__vampireScene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene; w.__vampirePlayer = w.__vampireScene.getObjectByName('cl-player'); w.__vampireFood = w.__vampireScene.children.filter((o: any) => o.name === 'cl-marine-snow'); w.__vampirePrey = w.__vampireScene.children.filter((o: any) => o.userData.alive && (o.userData.cfg || o.userData.offset)); if (w.__vampireFood.length !== 28 || !w.__vampirePrey.length) throw new Error('Actual seeded food and prey are required'); });
  await step(page, 6); await positionFood(page, false);
  const forage = page.getByRole('button', { name: 'Forage [R]', exact: true });
  await expect(forage).toBeVisible(); await expect(page.locator('.cl-hunt-stage')).not.toHaveClass(/cl-hunt-touch-enabled/);
  for (const name of ['Next target [T]', 'Strike [E]']) {
    const owned = page.getByRole('button', { name, exact: true, includeHidden: true }); await expect(owned).toHaveCount(1); await expect(owned).toBeHidden();
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  }
  await expect(page.locator(canvas)).toHaveAttribute('aria-label', /marine-snow meal/); await expect(page.locator(canvas)).not.toHaveAttribute('aria-label', /Click hunts|I uses ink/);
  const before = await state(page);
  await clickCephalopodControl(page, 'Observe');
  const nearest = await page.evaluate(() => { const w = window as any; return Math.min(...w.__vampireFood.map((o: any) => o.position.distanceTo(w.__vampirePlayer.position))).toFixed(0); });
  const observed = await page.locator('.cl-mission-brief').innerText(); expect(observed).toContain('Nearest marine snow ' + nearest + ' metres away.'); expect(observed).not.toContain('Nearest prey'); await expect(page.locator('#allo-live-cl')).toHaveText(observed);
  const advice = 'Find marine snow. Tap Forage [R] nearby, or hold E.';
  await page.locator(canvas).focus(); await page.keyboard.press('KeyT'); await step(page, 3);
  await expect(page.locator('.cl-mission-brief')).toBeVisible(); await expect(page.locator('.cl-mission-brief')).toContainText(advice); await expect(page.locator('#allo-live-cl')).toHaveText(advice);
  await expect(page.locator('.cl-target-readout')).toBeHidden(); expect((await state(page)).score).toBe(before.score); expect((await state(page)).prey).toEqual(before.prey);
  await expect(forage).toHaveAttribute('aria-pressed', 'false'); await expect(page.locator('progress[aria-label="Foraging progress"]')).toBeHidden();
  await page.keyboard.press('Escape'); const paused = await state(page); await step(page, 75);
  await expect(page.locator('.cl-mission-brief')).toContainText(advice); expect((await state(page)).score).toBe(paused.score); await page.keyboard.press('Escape'); await step(page, 71); await expect(page.locator('.cl-mission-brief')).not.toContainText(advice);
  await clickCephalopodControl(page, 'Help / settings');
  const help = page.getByRole('dialog', { name: 'Dive help and settings', exact: true }).locator('p').first();
  await expect(help).toContainText('Hold E within reach of marine snow to gather'); await expect(help).toContainText('this species has no ink'); await expect(help).not.toContainText(/T selects a target|E strikes|clam|I inks/);
  await page.getByRole('button', { name: 'Resume dive', exact: true }).click(); await step(page, 3);
  await positionFood(page, true); await forage.click(); await step(page, 3); await expect(forage).toHaveAttribute('aria-pressed', 'true');
  await page.locator(canvas).focus(); await page.keyboard.press('Escape'); await step(page, 3); await expect(forage).toHaveAttribute('aria-pressed', 'false'); expect((await state(page)).score).toBe(before.score);
  await page.keyboard.press('Escape'); await step(page, 3); await forage.click(); await step(page, 18);
  const latched = await state(page); expect(latched.score).toBe(before.score + 2); await expect(forage).toHaveAttribute('aria-pressed', 'false');
  await positionFood(page, true); await page.locator(canvas).focus(); await page.keyboard.down('KeyE'); await step(page, 4); await page.keyboard.up('KeyE'); await step(page, 3);
  expect((await state(page)).food[0].gather).toBe(0); expect((await state(page)).score).toBe(latched.score);
  await page.keyboard.down('KeyE'); await step(page, 15); await page.keyboard.up('KeyE'); await step(page, 3);
  const held = await state(page); expect(held.score).toBe(before.score + 4); expect(held.prey).toEqual(before.prey); expect(held.food.every(o => o.parent)).toBe(true);
  await testInfo.attach('vampire-desktop-guidance-and-feeding', { body: JSON.stringify({ before, nearest, observed, advice, latched, held }, null, 2), contentType: 'application/json' });
});
