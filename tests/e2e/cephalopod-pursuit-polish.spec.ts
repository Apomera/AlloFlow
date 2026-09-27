import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab',
  width: 900, height: 1000, layout: 'document',
});
const canvas = 'canvas[role=application]';
const readout = (page: Page) => page.locator('.cl-target-readout');
const detail = (page: Page) => page.locator('[data-target=detail]');
const action = (page: Page) => page.locator('[data-target=action]');

async function mount(page: Page, species = 'commonOcto', mode = 'observe', withFish = false) {
  await harness.mount(page, { cephalopodLab: {
    activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: species,
    huntMode: mode, huntSeed: 2741, huntQuality: 'low', _threeLoaded: true,
  } });
  await page.evaluate(async withFish => {
    const w = window as any;
    w.__scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
    w.__player = w.__scene.getObjectByName('cl-player');
    w.__halo = w.__scene.getObjectByName('cl-target');
    w.__crabs = w.__scene.children.filter((o: any) => o.userData.alive && o.userData.cfg);
    const fish = w.__scene.children.filter((o: any) => o.userData.alive && o.userData.offset);
    w.__testStep = 0;
    w.THREE.Clock.prototype.getDelta = function () {
      const dt = w.__testStep;
      w.__testStep = 0;
      return dt;
    };
    if (withFish) {
      const approximateCenter = fish[0].position.clone().sub(fish[0].userData.offset);
      const originalClone = w.THREE.Vector3.prototype.clone;
      let center: any;
      w.THREE.Vector3.prototype.clone = function () {
        if (this.distanceToSquared(approximateCenter) < 4 && !fish.some((f: any) => f.position === this)) center = this;
        return originalClone.call(this);
      };
      try {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      } finally {
        w.THREE.Vector3.prototype.clone = originalClone;
      }
      if (!center) throw new Error('Could not locate the actual fish-school center');
      w.__schoolCenter = center;
      w.__probeFish = fish[0];
      center.set(30, 4, 30);
      fish[0].userData.offset.set(0, 0, 0);
    }
    fish.forEach((f: any, i: number) => {
      // Competing schools are irrelevant to these controlled pursuit fixtures.
      // The depth-guidance case retains a real fish and its original school.
      f.userData.alive = withFish && i === 0;
      f.position.set(30, 4, 30);
    });
    w.__scene.children.forEach((o: any) => {
      if (o.userData.substrate === 'rock') {
        o.position.set(-18, o.position.y, -18);
        o.userData.substrateRadius = 0;
      }
      if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9;
    });
    w.__crabs.forEach((c: any) => { c.position.set(30, 0.18, 30); c.userData.speed = 0; });
    w.__scene.updateMatrixWorld(true);
  }, withFish);
  await page.locator(canvas).focus();
  await advance(page, 4);
}

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

async function positionCrabs(page: Page, a: [number, number], b: [number, number]) {
  await page.evaluate(({ a, b }) => {
    const w = window as any;
    w.__crabs[0].position.set(a[0], 0.18, a[1]);
    w.__crabs[1].position.set(b[0], 0.18, b[1]);
    w.__scene.updateMatrixWorld(true);
  }, { a, b });
  await advance(page, 4);
}

async function expectHaloOn(page: Page, index: number) {
  const state = await page.evaluate(index => {
    const w = window as any, p = w.__crabs[index].position, halo = w.__halo;
    return { visible: halo.visible, error: Math.hypot(halo.position.x - p.x, halo.position.z - p.z) };
  }, index);
  expect(state.visible).toBe(true);
  expect(state.error).toBeLessThan(0.00001);
}

test.describe.configure({ timeout: 150000, retries: 0, mode: 'default' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('automatic pursuit holds nearby rivals until both switch margins are met and retains a receding target', async ({ page }) => {
  await mount(page);
  await positionCrabs(page, [0, 3], [1, 3.2]);
  await expectHaloOn(page, 0);
  // More than 20% closer, but less than the absolute margin: stay with A.
  await positionCrabs(page, [0, 3], [0, 2.3]);
  await expectHaloOn(page, 0);
  // More than the absolute margin, but less than 20% closer: still A.
  await positionCrabs(page, [0, 5], [0, 4.2]);
  await expectHaloOn(page, 0);
  await positionCrabs(page, [0, 5], [0, 3.8]);
  await expectHaloOn(page, 1);
  // Tracking extends beyond the acquisition radius, without reacquiring rivals.
  await positionCrabs(page, [0, 16], [0, 13]);
  await expectHaloOn(page, 1);
  await expect(readout(page)).toBeVisible();
  await positionCrabs(page, [0, 10], [0, 14.5]);
  await expectHaloOn(page, 0);
});

test('a strike keeps its committed prey in the ring and feedback when T selects the next target', async ({ page }) => {
  await mount(page);
  await positionCrabs(page, [0, 0.7], [1, 0.9]);
  await page.keyboard.press('KeyT');
  await page.keyboard.press('KeyE');
  await advance(page, 1);
  await page.keyboard.press('KeyT');
  await advance(page, 2);
  await expectHaloOn(page, 0);
  await expect(action(page)).toContainText('STRIKING');
  expect(await page.evaluate(() => (window as any).__crabs[0].userData.alive)).toBe(true);
  await page.keyboard.press('Escape');
  await page.keyboard.press('KeyF');
  await expect(readout(page)).toBeHidden();
  expect(await page.evaluate(() => (window as any).__halo.visible)).toBe(false);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-hud=burn]')).toHaveText('Paused');
  await expectHaloOn(page, 0);
  await page.keyboard.press('Escape');
  await advance(page, 3);
  await expect.poll(() => page.evaluate(() => (window as any).__crabs[0].userData.alive)).toBe(false);
  expect(await page.evaluate(() => (window as any).__crabs[1].userData.alive)).toBe(true);
  await advance(page, 12);
  await expectHaloOn(page, 1);
  await page.keyboard.press('KeyE');
  await advance(page, 6);
  await expect.poll(() => page.evaluate(() => (window as any).__crabs[1].userData.alive)).toBe(false);
});

test('target detail gives signed depth guidance and free-mode miss feedback remains visible', async ({ page }) => {
  await mount(page, 'humboldtSquid', 'free', true);
  const setDepth = async (delta: number) => {
    await page.evaluate(delta => {
      const w = window as any;
      w.__schoolCenter.copy(w.__player.position).add(new w.THREE.Vector3(0, delta, 1));
      w.__probeFish.position.copy(w.__schoolCenter);
    }, delta);
    await advance(page, 4);
  };
  await setDepth(3);
  await expect(detail(page)).toContainText(/Rise\s+[0-9.]+\s*m/);
  await expect(detail(page)).not.toContainText('Dive');
  await setDepth(-3);
  await expect(detail(page)).toContainText(/Dive\s+[0-9.]+\s*m/);
  await expect(detail(page)).not.toContainText('Rise');
  await page.getByRole('button', { name: 'Observe', exact: true }).click();
  await expect(page.locator('.cl-mission-brief')).toContainText(/Nearest prey/);
  await expect(readout(page)).toBeHidden();
  await page.locator(canvas).focus();
  await page.keyboard.press('KeyT');
  await advance(page, 4);
  await expect(readout(page)).toBeVisible();
  await expect(detail(page)).toContainText(/Dive\s+[0-9.]+\s*m/);
  // A nearby unselected crab cannot advertise a ready strike while the
  // explicitly selected fish is out of reach, even with the old XZ-only hint.
  await page.evaluate(() => {
    const w = window as any;
    w.__crabs[0].position.set(w.__player.position.x, 0.18, w.__player.position.z + 0.5);
  });
  await advance(page, 2);
  expect(await page.locator('.cl-hunt-action-prompt').evaluate(el =>
    getComputedStyle(el).opacity === '0' || !/\b(pounce|strike|catch)\b/i.test(el.textContent || '')
  )).toBe(true);
  // E must also interrupt an Observe narration. Only 350 ms of simulation
  // follows here, so feedback cannot pass by waiting for its six-second expiry.
  await page.getByRole('button', { name: 'Observe', exact: true }).click();
  await expect(page.locator('.cl-mission-brief')).toContainText(/Nearest prey/);
  await page.locator(canvas).focus();
  await page.keyboard.press('KeyE');
  await advance(page, 1);
  await page.evaluate(() => {
    const w = window as any;
    w.__schoolCenter.set(20, 8, 20);
    w.__probeFish.position.copy(w.__schoolCenter);
  });
  await advance(page, 6);
  await expect(page.locator('.cl-mission-brief')).toBeVisible();
  await expect(page.locator('.cl-mission-brief')).toContainText(/Missed\./);
  expect(await page.evaluate(() => (window as any).__probeFish.userData.alive)).toBe(true);
  await expect(page.locator('[data-hud=score]')).toHaveText('0');
});

test('phone target feedback fits larger text and hides for inspection or lost prey', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page);
  await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; window.dispatchEvent(new Event('resize')); });
  await positionCrabs(page, [0, 1.4], [18, 18]);
  await page.getByRole('button', { name: 'Help / settings', exact: true }).click();
  await page.getByLabel('Larger text', { exact: true }).check();
  await page.getByRole('button', { name: 'Resume dive', exact: true }).click();
  await advance(page, 4);
  await expect(readout(page)).toBeVisible();
  const stage = await page.locator(canvas).boundingBox();
  const card = await readout(page).boundingBox();
  const hud = await page.locator('.cl-hunt-hud').boundingBox();
  const mission = await page.locator('.cl-hunt-mission').boundingBox();
  const controls = await page.locator('.cl-hunt-controls').boundingBox();
  const touch = await page.locator('.cl-hunt-touch').boundingBox();
  expect(card!.x).toBeGreaterThanOrEqual(stage!.x);
  expect(card!.x + card!.width).toBeLessThanOrEqual(stage!.x + stage!.width + 1);
  expect(hud!.y + hud!.height).toBeLessThanOrEqual(mission!.y + 1);
  expect(mission!.y + mission!.height).toBeLessThanOrEqual(controls!.y + 1);
  expect(controls!.y + controls!.height).toBeLessThanOrEqual(touch!.y + 1);

  await page.getByRole('button', { name: 'Inspect [F]', exact: true }).click();
  await expect(readout(page)).toBeHidden();
  expect(await page.evaluate(() => (window as any).__halo.visible)).toBe(false);
  await page.getByRole('button', { name: 'Return to dive', exact: true }).click();
  await advance(page, 4);
  await expect(readout(page)).toBeVisible();
  await expectHaloOn(page, 0);
  await positionCrabs(page, [25, 25], [26, 26]);
  await expect(readout(page)).toBeHidden();
  expect(await page.evaluate(() => (window as any).__halo.visible)).toBe(false);
});
