import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 900, height: 1000, layout: 'document' });
const canvas = 'canvas[role=application]';
const errors = new WeakMap<Page, string[]>();

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let frame = 0; frame < count; frame++) {
      w.__testStep = .05;
      do { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
      while (w.__testStep !== 0);
    }
  }, frames);
}

async function mount(page: Page) {
  await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'humboldtSquid', huntMode: 'observe', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true } });
  await page.evaluate(async () => {
    const w = window as any;
    w.__scene = w.__glRecorder.records.filter((record: any) => record.scene && record.canvas.isConnected).at(-1).scene;
    w.__player = w.__scene.getObjectByName('cl-player');
    w.__testStep = 0;
    w.THREE.Clock.prototype.getDelta = function () { const dt = w.__testStep; w.__testStep = 0; return dt; };
    // Capture the existing school object during a frozen frame. Keep its real
    // fish, update loop and visibility checks; restore the hook immediately.
    const each = Array.prototype.forEach;
    (Array.prototype as any).forEach = function (callback: any, thisArg: any) {
      if (this.length && this[0]?.center?.isVector3 && Array.isArray(this[0]?.fish) && typeof this[0]?.heading === 'number') w.__school = this[0];
      return each.call(this, callback, thisArg);
    };
    try { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
    finally { Array.prototype.forEach = each; }
    if (!w.__school || w.__school.fish.length !== 8) throw new Error('Could not capture the actual eight-fish school');
    w.__player.position.x = 0; w.__player.position.z = 0;
    w.__school.center.copy(w.__player.position).add(new w.THREE.Vector3(0, 0, 3));
    w.__school.heading = 0; w.__school.wanderTimer = 1000; w.__school.alarm = 0; w.__school.lastThreatPosition = null;
    w.__scene.children.forEach((object: any) => {
      if (object.name === 'cl-prey-fish' && !w.__school.fish.includes(object)) object.userData.alive = false;
      if (object.userData.alive && object.userData.cfg) { object.position.set(-30, .18, -30); object.userData.speed = 0; }
      if (object.userData.substrate === 'rock') { object.position.set(-30, object.position.y, -30); object.userData.substrateRadius = 0; }
      if ('cooldownUntil' in object.userData) object.userData.cooldownUntil = 1e9;
    });
    w.__school.fish.forEach((fish: any, index: number) => {
      Object.assign(fish.userData, { alive: true, alert: false, awareness: 0, threatVisible: false, intent: 'unaware', distracted: false });
      fish.userData.offset.set((index % 4 - 1.5) * .08, 0, Math.floor(index / 4) * .08);
      fish.position.copy(w.__school.center).add(fish.userData.offset);
    });
    w.__cover = w.__scene.children.find((object: any) => object.userData.substrate === 'rock');
    w.__cover.geometry.dispose(); w.__cover.geometry = new w.THREE.BoxGeometry(40, 12, .2);
    w.__cover.rotation.set(0, 0, 0); w.__cover.scale.setScalar(1);
    w.__scene.updateMatrixWorld(true);
  });
  await page.locator(canvas).focus();
  await page.keyboard.press('KeyT');
}

async function cover(page: Page, enabled: boolean) {
  await page.evaluate(enabled => {
    const w = window as any;
    w.__cover.position.set(enabled ? 0 : -30, 4, enabled ? 1.5 : -30);
    w.__scene.updateMatrixWorld(true);
  }, enabled);
}

async function schoolState(page: Page) {
  return page.evaluate(() => {
    const school = (window as any).__school;
    return {
      center: school.center.toArray(), heading: school.heading, alarm: school.alarm,
      memory: school.lastThreatPosition ? { ...school.lastThreatPosition } : null,
      fish: school.fish.map((fish: any) => ({ position: fish.position.toArray(), rotation: fish.rotation.toArray(), phase: fish.userData.swimPhase, awareness: fish.userData.awareness, visible: fish.userData.threatVisible, alert: fish.userData.alert, intent: fish.userData.intent })),
    };
  });
}

async function expectCoverIsOnlySightBarrier(page: Page, blocked: boolean) {
  const rays = await page.evaluate(() => {
    const w = window as any;
    w.__scene.updateMatrixWorld(true);
    return w.__school.fish.map((fish: any) => {
      const direction = w.__player.position.clone().sub(fish.position);
      const distance = direction.length();
      const ray = new w.THREE.Raycaster(fish.position, direction.normalize(), 0, distance);
      return { distance, depth: Math.abs(fish.position.y - w.__player.position.y), blocked: ray.intersectObject(w.__cover, false).length > 0 };
    });
  });
  expect(rays).toHaveLength(8);
  for (const ray of rays) {
    // Keep every fish within its normal visual range and depth band, so a
    // hidden result can only come from the actual intervening rock geometry.
    expect(ray.distance).toBeLessThan(5);
    expect(ray.depth).toBeLessThan(2.8);
    expect(ray.blocked).toBe(blocked);
  }
}

test.describe.configure({ timeout: 150000, retries: 0 });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.beforeEach(({ page }) => {
  const events: string[] = []; errors.set(page, events);
  page.on('pageerror', error => events.push(error.message));
  page.on('console', message => { if (message.type() === 'error') events.push(message.text()); });
});
test.afterEach(async ({ page }) => { await harness.destroy(page); expect(errors.get(page)).toEqual([]); });

test('concealed player movement cannot redirect an alarmed school, while renewed sight refreshes its escape', async ({ page }) => {
  await mount(page);
  await advance(page, 8);
  const acquired = await schoolState(page);
  expect(acquired.alarm).toBeGreaterThan(.3);
  expect(acquired.memory).not.toBeNull();
  expect(acquired.fish.every((fish: any) => fish.visible && fish.alert)).toBe(true);
  await cover(page, true);
  await page.evaluate(() => {
    const w = window as any, school = w.__school;
    w.__pairedSchool = { center: school.center.clone(), heading: school.heading, alarm: school.alarm, intent: school.intent, wanderTimer: school.wanderTimer, memory: { ...school.lastThreatPosition }, fish: school.fish.map((fish: any) => ({ position: fish.position.clone(), rotation: fish.rotation.clone(), phase: fish.userData.swimPhase, awareness: fish.userData.awareness, visible: fish.userData.threatVisible, alert: fish.userData.alert, intent: fish.userData.intent })) };
  });
  async function concealedBranch(playerX: number) {
    await page.evaluate(playerX => {
      const w = window as any, school = w.__school, before = w.__pairedSchool;
      school.center.copy(before.center); school.heading = before.heading; school.alarm = before.alarm; school.intent = before.intent; school.wanderTimer = before.wanderTimer; school.lastThreatPosition = { ...before.memory };
      school.fish.forEach((fish: any, index: number) => { const prior = before.fish[index]; fish.position.copy(prior.position); fish.rotation.copy(prior.rotation); Object.assign(fish.userData, { swimPhase: prior.phase, awareness: prior.awareness, threatVisible: prior.visible, alert: prior.alert, intent: prior.intent }); });
      w.__player.position.x = playerX; w.__player.position.z = 0;
      w.__scene.updateMatrixWorld(true);
    }, playerX);
    await expectCoverIsOnlySightBarrier(page, true);
    await advance(page, 1);
    return schoolState(page);
  }
  const left = await concealedBranch(-2), right = await concealedBranch(2);
  for (const result of [left, right]) {
    expect(result.fish.every((fish: any) => !fish.visible && fish.intent === 'settling')).toBe(true);
    expect(result.memory).toEqual(acquired.memory);
    expect(result.alarm).toBeLessThan(acquired.alarm);
  }
  // These are the same real school restored to the same state, then advanced
  // by one equal simulation tick; only the concealed player's position differs.
  expect(left.heading).toBeCloseTo(right.heading, 10);
  left.center.forEach((value: number, axis: number) => expect(value).toBeCloseTo(right.center[axis], 10));
  left.fish.forEach((fish: any, index: number) => fish.position.forEach((value: number, axis: number) => expect(value).toBeCloseTo(right.fish[index].position[axis], 10)));
  await cover(page, false);
  await expectCoverIsOnlySightBarrier(page, false);
  await advance(page, 1);
  const seenAgain = await schoolState(page);
  expect(seenAgain.fish.every((fish: any) => fish.visible && fish.intent === 'fleeing')).toBe(true);
  expect(seenAgain.memory).toEqual({ x: 2, z: 0 });
  expect(Math.abs(seenAgain.heading - right.heading)).toBeGreaterThan(.02);
});

test('target feedback follows wary, fleeing and settling prey, with memory frozen during inspection and cleared when calm', async ({ page }) => {
  await mount(page);
  await advance(page, 3);
  const wary = await schoolState(page);
  expect(wary.alarm).toBeGreaterThan(0); expect(wary.alarm).toBeLessThanOrEqual(.3);
  expect(wary.fish.every((fish: any) => fish.visible && !fish.alert && fish.intent === 'wary' && fish.awareness === wary.alarm)).toBe(true);
  // Target selection reads the prior AI frame and the HUD is throttled. A
  // frozen render then normal pause refreshes it without extending wary time.
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-target=action]')).toContainText('prey is wary');
  expect((await schoolState(page)).alarm).toBe(wary.alarm);
  await page.keyboard.press('Escape');
  await advance(page, 5);
  const fleeing = await schoolState(page);
  expect(fleeing.fish.every((fish: any) => fish.visible && fish.alert && fish.intent === 'fleeing')).toBe(true);
  await expect(page.locator('[data-target=action]')).toContainText('prey is fleeing');
  await cover(page, true);
  await expectCoverIsOnlySightBarrier(page, true);
  await advance(page, 3);
  const settling = await schoolState(page);
  expect(settling.alarm).toBeGreaterThan(0); expect(settling.alarm).toBeLessThan(fleeing.alarm);
  expect(settling.fish.every((fish: any) => !fish.visible && fish.intent === 'settling' && fish.awareness === settling.alarm)).toBe(true);
  await expect(page.locator('[data-target=action]')).toContainText('prey is settling');
  await page.keyboard.press('KeyF');
  const frozen = await schoolState(page);
  await advance(page, 15);
  expect(await schoolState(page)).toEqual(frozen);
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click();
  for (let frame = 0; frame < 45 && (await schoolState(page)).alarm > 0; frame++) await advance(page, 1);
  await advance(page, 3); // Let the existing 8 Hz HUD consume the final intent.
  const calm = await schoolState(page);
  expect(calm.alarm).toBe(0); expect(calm.memory).toBeNull();
  expect(calm.fish.every((fish: any) => !fish.visible && !fish.alert && fish.intent === 'unaware' && fish.awareness === 0)).toBe(true);
  await expect(page.locator('[data-target=action]')).toContainText('prey is unaware');
});
