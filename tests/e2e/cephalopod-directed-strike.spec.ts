import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab',
  width: 900, height: 1000, layout: 'document',
});
const canvas = 'canvas[role=application]';

async function advance(page: Page, frames: number) {
  await page.evaluate(async count => {
    const w = window as any;
    for (let i = 0; i < count; i++) {
      w.__testStep = 0.05;
      do {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      } while (w.__testStep !== 0);
    }
  }, frames);
}

async function mount(page: Page) {
  await harness.mount(page, { cephalopodLab: {
    activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'humboldtSquid',
    huntMode: 'observe', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true,
  } });
  await page.evaluate(async () => {
    const w = window as any;
    w.__scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
    w.__player = w.__scene.getObjectByName('cl-player');
    w.__fish = w.__scene.children.filter((o: any) => o.name === 'cl-prey-fish' && o.userData.alive);
    w.__testStep = 0;
    w.THREE.Clock.prototype.getDelta = function () { const dt = w.__testStep; w.__testStep = 0; return dt; };
    const approximateCenter = w.__fish[0].position.clone().sub(w.__fish[0].userData.offset);
    const originalClone = w.THREE.Vector3.prototype.clone;
    let center: any;
    w.THREE.Vector3.prototype.clone = function () {
      if (this.distanceToSquared(approximateCenter) < 4 && !w.__fish.some((f: any) => f.position === this)) center = this;
      return originalClone.call(this);
    };
    try { await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
    finally { w.THREE.Vector3.prototype.clone = originalClone; }
    if (!center) throw new Error('Could not locate the real fish-school center');
    w.__schoolCenter = center;
    w.__fish.forEach((f: any, i: number) => { f.userData.alive = i < 2; f.position.set(25, 4, 25); });
    w.__scene.children.forEach((o: any) => {
      if (o.userData.alive && o.userData.cfg) { o.position.set(25, 0.18, 25); o.userData.speed = 0; }
      if (o.userData.substrate === 'rock') { o.position.set(-18, o.position.y, -18); o.userData.substrateRadius = 0; }
      if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9;
    });
  });
  await page.locator(canvas).focus();
  // A real turn ensures tests catch mixing world coordinates with rig-local aim.
  await page.keyboard.down('KeyD');
  await advance(page, 6);
  await page.keyboard.up('KeyD');
  await advance(page, 3);
}

async function arrangeFish(page: Page, a: number[], b: number[]) {
  await page.evaluate(({ a, b }) => {
    const w = window as any;
    w.__scene.updateMatrixWorld(true);
    w.__schoolCenter.copy(w.__player.localToWorld(new w.THREE.Vector3(0, 0, 1.2)));
    [a, b].forEach((local, i) => {
      const world = w.__player.localToWorld(new w.THREE.Vector3(...local));
      w.__fish[i].position.copy(world);
      w.__fish[i].userData.offset.copy(world).sub(w.__schoolCenter);
    });
    w.__scene.updateMatrixWorld(true);
  }, { a, b });
  await advance(page, 2);
}

async function pose(page: Page) {
  return page.evaluate(() => {
    const w = window as any;
    w.__scene.updateMatrixWorld(true);
    return [0, 1].map(index => {
      const mesh = w.__player.getObjectByName('cl-tentacle-' + index);
      if (!mesh) throw new Error('Missing actual tentacle mesh');
      const positions = mesh.geometry.attributes.position;
      // The club's widest region is ring18 of the twenty-segment tube. Average
      // the nonduplicated circumference, then use the real mesh world matrix.
      const stride = positions.count / 21;
      if (!Number.isInteger(stride) || stride < 4) throw new Error('Unexpected tube topology');
      const center = new w.THREE.Vector3();
      for (let side = 0; side < stride - 1; side++) center.add(new w.THREE.Vector3().fromBufferAttribute(positions, 18 * stride + side));
      center.multiplyScalar(1 / (stride - 1));
      mesh.localToWorld(center);
      const target = w.__fish[0].position, other = w.__fish[1].position;
      let radius = 0;
      for (let i = 0; i < positions.count; i++) {
        const p = mesh.localToWorld(new w.THREE.Vector3().fromBufferAttribute(positions, i));
        radius = Math.max(radius, p.distanceTo(w.__player.position));
      }
      return { center: center.toArray(), distanceToTarget: center.distanceTo(target), distanceToOther: center.distanceTo(other), radius, positions: Array.from(positions.array) as number[] };
    });
  });
}

async function untilContact(page: Page) {
  for (let frame = 0; frame < 7; frame++) {
    if (!await page.evaluate(() => (window as any).__fish[0].userData.alive)) return;
    await advance(page, 1);
  }
  expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(false);
}

const buffers = async (page: Page) => (await pose(page)).map(p => p.positions);
const strikeButton = (page: Page) => page.getByRole('button', { name: 'Strike [E]', exact: true });

test.describe.configure({ timeout: 150000, retries: 0, mode: 'default' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('rendered clubs follow the moving committed prey at contact while T queues another fish', async ({ page }) => {
  await mount(page);
  await arrangeFish(page, [0.65, 0.25, 1.1], [-0.85, -0.1, 1.3]);
  const resting = await pose(page);
  await page.keyboard.press('KeyT');
  await page.keyboard.press('KeyE');
  await advance(page, 1);
  await page.keyboard.press('KeyT');
  await page.evaluate(() => {
    const w = window as any;
    w.__scene.updateMatrixWorld(true);
    const moved = w.__player.localToWorld(new w.THREE.Vector3(1.05, 0.5, 0.85));
    w.__fish[0].position.copy(moved);
    w.__fish[0].userData.offset.copy(moved).sub(w.__schoolCenter);
  });
  await untilContact(page);
  const contact = await pose(page);
  for (const club of contact) {
    expect(club.distanceToTarget).toBeLessThan(0.35);
    expect(club.distanceToTarget + 0.5).toBeLessThan(club.distanceToOther);
  }
  expect(Math.max(...contact.map(p => p.distanceToTarget))).toBeLessThan(Math.max(...resting.map(p => p.distanceToTarget)));
  expect(await page.evaluate(() => (window as any).__fish[1].userData.alive)).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.cephalopodLab.huntsSuccessful || 0)).toBe(1);
});

test('inspection freezes a pending reach and its recovery, then resumes the same strike', async ({ page }) => {
  await mount(page);
  await arrangeFish(page, [0.6, 0.2, 1.2], [-1, 0, 1.35]);
  const idleClubs = await pose(page);
  await page.keyboard.press('KeyT');
  await page.keyboard.press('KeyE');
  await advance(page, 2);
  await page.keyboard.press('KeyF');
  const windup = await buffers(page);
  await advance(page, 15);
  expect(await buffers(page)).toEqual(windup);
  expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(true);
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click();
  await untilContact(page);
  await advance(page, 2);
  await expect(strikeButton(page)).toBeDisabled();
  await page.keyboard.press('KeyF');
  const recovery = await buffers(page);
  await advance(page, 15);
  expect(await buffers(page)).toEqual(recovery);
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click();
  await expect(strikeButton(page)).toBeDisabled();
  // The game draws its HUD at 8 Hz. Continue simulation through the next
  // refresh instead of freezing the clock between cooldown and HUD updates.
  let resumedFrames = 0;
  while (resumedFrames < 12 && !await strikeButton(page).isEnabled()) {
    await advance(page, 1);
    resumedFrames++;
  }
  await expect(strikeButton(page)).toBeEnabled();
  const recovered = await pose(page);
  recovered.forEach((club, i) => {
    expect(Math.hypot(...club.center.map((value: number, axis: number) => value - idleClubs[i].center[axis]))).toBeLessThan(0.15);
  });
  expect(recovered.map(p => p.positions)).not.toEqual(recovery);
  expect(await page.evaluate(() => (window as any).__fish[1].userData.alive)).toBe(true);
});

test('a distant target produces finite bounded reach without capture and reduced motion suppresses the reach', async ({ page }) => {
  await mount(page);
  await arrangeFish(page, [12, 6, 8], [-17, 0, 12]);
  await page.keyboard.press('KeyT');
  await page.keyboard.press('KeyE');
  await advance(page, 5);
  const missed = await pose(page);
  expect(missed.every(p => p.positions.every(Number.isFinite))).toBe(true);
  expect(Math.max(...missed.map(p => p.radius))).toBeLessThan(5);
  expect(Math.min(...missed.map(p => p.distanceToTarget))).toBeGreaterThan(5);
  expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(true);
  await expect(page.locator('[data-hud=score]')).toHaveText('0');
  await advance(page, 12);

  await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
  await page.getByLabel('Reduced motion', { exact: true }).check();
  await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  await advance(page, 2);
  const still = await buffers(page);
  await page.locator(canvas).focus();
  await page.keyboard.press('KeyE');
  await advance(page, 5);
  expect(await buffers(page)).toEqual(still);
  expect(await page.evaluate(() => (window as any).__fish[0].userData.alive)).toBe(true);
  await expect(page.locator('[data-hud=score]')).toHaveText('0');
});
