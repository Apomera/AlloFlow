import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const canvas = 'canvas[role=application]', errors = new WeakMap<Page, string[]>();

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let i = 0; i < count; i++) {
      w.__inkStep = .05;
      do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__inkStep !== 0);
    }
  }, frames);
}
async function mount(page: Page, species = 'commonOcto') {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: species, huntMode: 'free', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  await page.evaluate(() => {
    const w = window as any;
    w.__inkScene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene;
    w.__inkPlayer = w.__inkScene.getObjectByName('cl-player');
    w.__inkGrouper = w.__inkScene.children.find((object: any) => object.userData.aggroRange === 10 && 'patrolAngle' in object.userData && !object.userData.kind);
    w.__inkMoray = w.__inkScene.children.find((object: any) => 'homeX' in object.userData && object.userData.aggroRange);
    if (!w.__inkGrouper || !w.__inkMoray) throw new Error('The real grouper and moray must exist');
    w.__inkStep = 0; w.__inkTicks = 0;
    w.THREE.Clock.prototype.getDelta = function () { const dt = w.__inkStep; w.__inkStep = 0; if (dt) w.__inkTicks++; return dt; };
    w.__inkScene.children.forEach((object: any) => {
      if (object.userData.substrate === 'rock') { object.position.x = -18; object.position.z = -18; object.userData.substrateRadius = 0; }
      if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9;
    });
    w.__inkClouds = () => w.__inkScene.children.filter((object: any) => object.isMesh && object.geometry?.parameters?.radius === 2.6 && object.material?.color?.getHex() === 0x080812);
    w.__inkHistory = [];
  });
  await page.locator(canvas).focus(); await advance(page, 22);
  await expect(page.locator('[data-hud=status]')).not.toContainText('IN DEN');
}
async function pauseSnapshot(page: Page) {
  await page.locator(canvas).focus(); await page.keyboard.press('Escape');
  await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
  return page.evaluate(() => {
    const w = window as any;
    return { health: Number(document.querySelector('[data-hud=health]')!.textContent), ink: document.querySelector('[data-hud=ink]')!.textContent,
      time: document.querySelector('[data-hud=time]')!.textContent, clouds: w.__inkClouds().map((cloud: any) => ({ uuid: cloud.uuid, position: cloud.position.toArray(), scale: cloud.scale.toArray(), opacity: cloud.material.opacity })),
      grouper: { state: w.__inkGrouper.userData.state, canBite: w.__inkGrouper.userData.canBite }, moray: { state: w.__inkMoray.userData.state, canBite: w.__inkMoray.userData.canBite }, ticks: w.__inkTicks };
  });
}
async function resume(page: Page) { await page.locator(canvas).focus(); await page.keyboard.press('Escape'); }
async function park(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    for (const [actor, state] of [[w.__inkGrouper, 'patrol'], [w.__inkMoray, 'idle']]) {
      actor.userData.state = state; actor.userData.cooldownUntil = 1e9; actor.userData.stateTimer = 0; actor.userData.awareness = 0; actor.userData.lastSeen = null; actor.userData.lostFor = 0;
      actor.position.set(18, 1, 18);
    }
  });
}
async function biteFrame(page: Page, kind: 'grouper' | 'moray', ink: boolean) {
  await page.evaluate(async ({ kind, ink }) => {
    const w = window as any, actor = kind === 'grouper' ? w.__inkGrouper : w.__inkMoray, u = actor.userData;
    // Arm the real actor and send the real key event atomically before the next
    // RAF. A separate Playwright key call could allow a dt=0 bite in between.
    actor.position.copy(w.__inkPlayer.position).add(new w.THREE.Vector3(0, 0, .7));
    u.state = 'attacking'; u.stateTimer = 0; u.speed = 0; u.cooldownUntil = 0; u.patrolTimer = 1000; u.lostFor = 0; u.awareness = 1; u.lastSeen = w.__inkPlayer.position.clone();
    if (ink) {
      const target = document.querySelector('canvas[role=application]')!;
      target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', key: 'i', bubbles: true, cancelable: true }));
      target.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyI', key: 'i', bubbles: true, cancelable: true }));
    }
    w.__inkStep = .05;
    do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__inkStep !== 0);
  }, { kind, ink });
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.use({ video: 'off', trace: 'off' });
test.beforeAll(() => harness.start()); test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => {
  const entries: string[] = []; errors.set(page, entries);
  page.on('pageerror', error => entries.push(error.message)); page.on('console', message => { if (message.type() === 'error') entries.push(message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

test('accepted same-frame ink prevents a real grouper bite after a positive damage control', async ({ page }, testInfo) => {
  await mount(page); const initial = await pauseSnapshot(page); expect(initial.clouds).toHaveLength(0); expect(initial.ink).toContain('3/3');
  await resume(page); await biteFrame(page, 'grouper', false); const control = await pauseSnapshot(page);
  expect(control.health).toBe(initial.health - 35); expect(control.clouds).toHaveLength(0); expect(control.ink).toContain('3/3');
  await park(page); await resume(page); await advance(page, 20);
  await biteFrame(page, 'grouper', true); const defended = await pauseSnapshot(page);
  await testInfo.attach('same-frame-grouper-evidence', { body: JSON.stringify({ initial, control, defended }, null, 2), contentType: 'application/json' });
  expect(defended.clouds).toHaveLength(1); expect(defended.ink).toContain('2/3');
  expect(defended.health).toBe(control.health); expect(defended.grouper.canBite).toBe(false); expect(defended.grouper.state).toBe('patrol');
});

test('the real moray keeps the same accepted-ink protection as the grouper', async ({ page }, testInfo) => {
  await mount(page); const initial = await pauseSnapshot(page);
  await resume(page); await biteFrame(page, 'moray', false); const control = await pauseSnapshot(page);
  expect(control.health).toBe(initial.health - 30); expect(control.clouds).toHaveLength(0); expect(control.ink).toContain('3/3');
  await park(page); await resume(page); await advance(page, 20);
  await biteFrame(page, 'moray', true); const defended = await pauseSnapshot(page);
  await testInfo.attach('same-frame-moray-evidence', { body: JSON.stringify({ initial, control, defended }, null, 2), contentType: 'application/json' });
  expect(defended.clouds).toHaveLength(1); expect(defended.ink).toContain('2/3'); expect(defended.health).toBe(control.health);
  expect(defended.moray.canBite).toBe(false); expect(defended.moray.state).toBe('returning');
});

test('ink freezes in pause and inspection then expires before a bite on the first expired frame', async ({ page }, testInfo) => {
  await mount(page); await park(page); await page.locator(canvas).focus();
  await page.evaluate(async () => {
    const w = window as any, target = document.querySelector('canvas[role=application]')!;
    // Accept the input on this counted frame, so the paused snapshot starts at
    // cloud age zero rather than after an intervening zero-delta RAF.
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', key: 'i', bubbles: true, cancelable: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyI', key: 'i', bubbles: true, cancelable: true }));
    w.__inkStep = .05; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__inkStep !== 0);
  });
  const accepted = await pauseSnapshot(page); expect(accepted.clouds).toHaveLength(1); expect(accepted.ink).toContain('2/3');
  await page.evaluate(() => {
    const w = window as any, cloud = w.__inkClouds()[0];
    w.__inkDisposed = { geometry: 0, material: 0 }; w.__inkOwned = { cloud, geometry: cloud.geometry, material: cloud.material, position: cloud.geometry.attributes.position, index: cloud.geometry.index };
    cloud.geometry.addEventListener('dispose', () => w.__inkDisposed.geometry++); cloud.material.addEventListener('dispose', () => w.__inkDisposed.material++);
  });
  const frozenState = () => page.evaluate(() => {
    const w = window as any, cloud = w.__inkOwned.cloud;
    return { time: document.querySelector('[data-hud=time]')!.textContent, health: document.querySelector('[data-hud=health]')!.textContent,
      ink: document.querySelector('[data-hud=ink]')!.textContent, position: cloud.position.toArray(), scale: cloud.scale.toArray(), opacity: cloud.material.opacity,
      geometry: cloud.geometry.uuid, material: cloud.material.uuid, vertices: Array.from(cloud.geometry.attributes.position.array), index: Array.from(cloud.geometry.index.array),
      versions: [cloud.geometry.attributes.position.version, cloud.geometry.index.version], disposed: { ...w.__inkDisposed } };
  });
  const frozen = await frozenState();
  await page.locator(canvas).focus(); await page.keyboard.press('KeyI'); await advance(page, 30); expect(await frozenState()).toEqual(frozen);
  await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click(); await expect(page.getByRole('region', { name: 'Specimen inspection' })).toBeVisible();
  await page.locator(canvas).focus(); await page.keyboard.press('KeyI'); await advance(page, 25); expect(await frozenState()).toEqual(frozen);
  await page.keyboard.press('Escape'); await expect(page.getByRole('region', { name: 'Specimen inspection' })).toBeHidden(); await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
  await resume(page); await advance(page, 63); const beforeExpiry = await pauseSnapshot(page);
  expect(beforeExpiry.clouds).toHaveLength(1); expect(beforeExpiry.clouds[0].uuid).toBe(accepted.clouds[0].uuid);
  expect(beforeExpiry.clouds[0].opacity).toBeGreaterThan(0); expect(beforeExpiry.clouds[0].opacity).toBeLessThan(accepted.clouds[0].opacity);
  expect(beforeExpiry.clouds[0].scale[0]).toBeGreaterThan(accepted.clouds[0].scale[0]);
  expect(await page.evaluate(() => {
    const w = window as any, own = w.__inkOwned; return { geometry: own.cloud.geometry === own.geometry, material: own.cloud.material === own.material,
      position: own.cloud.geometry.attributes.position === own.position, index: own.cloud.geometry.index === own.index, disposed: w.__inkDisposed };
  })).toEqual({ geometry: true, material: true, position: true, index: true, disposed: { geometry: 0, material: 0 } });
  // Mounting can leave gameNow with a fractional offset. Sample 3151 ms while
  // still alive, then 3201 ms: this crosses the exact 3200 ms lifetime without
  // depending on floating-point equality after repeated clock additions.
  await resume(page);
  await page.evaluate(async () => { const w = window as any; w.__inkStep = .001; do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); } while (w.__inkStep !== 0); });
  expect(await page.evaluate(() => (window as any).__inkClouds().length)).toBe(1);
  await biteFrame(page, 'grouper', false); const expired = await pauseSnapshot(page);
  await testInfo.attach('first-expired-frame-evidence', { body: JSON.stringify({ accepted, beforeExpiry, expired, testedLiveAgeMs: 3201 }, null, 2), contentType: 'application/json' });
  expect(expired.clouds).toHaveLength(0); expect(expired.health).toBe(accepted.health - 35); expect(expired.grouper.canBite).toBe(true);
  expect(await page.evaluate(() => (window as any).__inkDisposed)).toEqual({ geometry: 1, material: 1 });
  await park(page); await resume(page); await advance(page, 20);
  await biteFrame(page, 'grouper', true); const cooldownRejected = await pauseSnapshot(page);
  await testInfo.attach('ink-lifetime-evidence', { body: JSON.stringify({ accepted, beforeExpiry, expired, cooldownRejected }, null, 2), contentType: 'application/json' });
  expect(cooldownRejected.clouds).toHaveLength(0); expect(cooldownRejected.ink).toContain('2/3'); expect(cooldownRejected.ink).toContain('refilling');
  expect(cooldownRejected.health).toBe(expired.health - 35); expect(cooldownRejected.grouper.canBite).toBe(true);
  await harness.unmount(page); expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  expect(await page.evaluate(() => (window as any).__inkDisposed)).toEqual({ geometry: 1, material: 1 });
});

test('a non-inking vampire squid cannot cancel a real bite by pressing I', async ({ page }, testInfo) => {
  await mount(page, 'vampireSquid'); const initial = await pauseSnapshot(page); expect(initial.ink).toContain('No ink');
  await resume(page); await biteFrame(page, 'grouper', false); const control = await pauseSnapshot(page);
  expect(control.health).toBe(initial.health - 35); expect(control.clouds).toHaveLength(0);
  await park(page); await resume(page); await advance(page, 20);
  await biteFrame(page, 'grouper', true); const rejected = await pauseSnapshot(page);
  await testInfo.attach('non-inking-species-evidence', { body: JSON.stringify({ initial, control, rejected }, null, 2), contentType: 'application/json' });
  expect(rejected.clouds).toHaveLength(0); expect(rejected.ink).toContain('No ink'); expect(rejected.health).toBe(control.health - 35); expect(rejected.grouper.canBite).toBe(true);
});
