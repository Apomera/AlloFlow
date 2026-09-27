import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cephalopodlab.js',
  toolId: 'cephalopodLab',
  width: 900,
  height: 1000,
  layout: 'document',
});
const canvas = 'canvas[role=application]';
const forage = (page: Page) => page.getByRole('button', { name: 'Forage [R]', exact: true });
const progress = (page: Page) => page.locator('progress[aria-label="Foraging progress"]');

async function mount(page: Page, species = 'commonOcto') {
  await harness.mount(page, {
    cephalopodLab: {
      activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: species,
      huntMode: 'observe', huntSeed: 2741, huntQuality: 'low', _threeLoaded: true,
    },
  });
  await page.evaluate(() => {
    const w = window as any;
    w.__scene = w.__glRecorder.records.filter((r: any) => r.scene && r.canvas.isConnected).at(-1).scene;
    w.__player = w.__scene.getObjectByName('cl-player');
    // Keep real rendering/input/AI running, but only advance simulation in explicit
    // 50 ms steps. SwiftShader frame rates must not determine contact timing.
    w.__testStep = 0;
    w.THREE.Clock.prototype.getDelta = function () {
      const dt = w.__testStep;
      w.__testStep = 0;
      return dt;
    };
    w.__scene.children.forEach((o: any) => {
      if (o.userData.substrate === 'rock') {
        o.position.set(w.__player.position.x - 18, o.position.y, w.__player.position.z - 18);
        o.userData.substrateRadius = 0;
      }
      if (o.userData.alive && o.userData.cfg) {
        o.position.set(18, 0.18, 18);
        o.userData.speed = 0;
      }
      if (o.userData.alive && 'drillProgress' in o.userData) o.position.set(18, 0.1, 18);
      if ('cooldownUntil' in o.userData) o.userData.cooldownUntil = 1e9;
    });
    w.__scene.updateMatrixWorld(true);
  });
  await page.locator(canvas).focus();
}

async function advance(page: Page, frames: number) {
  await page.evaluate(async (count) => {
    const w = window as any;
    for (let i = 0; i < count; i++) {
      w.__testStep = 0.05;
      do {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      } while (w.__testStep !== 0);
    }
  }, frames);
}

async function placeClams(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    const clams = w.__scene.children.filter((o: any) => o.userData.alive && 'drillProgress' in o.userData);
    w.__mealClam = clams[0];
    w.__secondClam = clams[1];
    w.__mealClam.position.set(w.__player.position.x, 0.1, w.__player.position.z + 0.45);
    w.__secondClam.position.set(w.__player.position.x, 0.1, w.__player.position.z + 0.95);
    w.__scene.updateMatrixWorld(true);
  });
}

async function placeCrab(page: Page, distance = 1.4) {
  await page.evaluate((distance) => {
    const w = window as any;
    w.__strikeCrab = w.__scene.children.find((o: any) => o.userData.alive && o.userData.cfg);
    w.__strikeCrab.position.set(w.__player.position.x, 0.18, w.__player.position.z + distance);
    w.__strikeCrab.userData.speed = 0;
    w.__scene.updateMatrixWorld(true);
  }, distance);
  await page.keyboard.press('KeyT');
  await advance(page, 4);
}

const crabAlive = (page: Page) => page.evaluate(() => (window as any).__strikeCrab.userData.alive);
const meals = (page: Page) => page.evaluate(() => (window as any).__toolData.cephalopodLab.huntsSuccessful || 0);
const forageProgress = (page: Page) => progress(page).evaluate((el: HTMLProgressElement) => el.value);

test.describe.configure({ timeout: 120000, retries: 0, mode: 'default' });
test.beforeAll(() => harness.start());
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('R opens exactly one clam without holding a key and exposes its progress', async ({ page }) => {
  await mount(page);
  await placeClams(page);
  await page.keyboard.press('KeyR');
  await expect(forage(page)).toHaveAttribute('aria-pressed', 'true');
  await advance(page, 10);
  await expect(page.getByRole('progressbar', { name: 'Foraging progress' })).toBeVisible();
  expect(await forageProgress(page)).toBeGreaterThan(0);
  await expect(page.locator('[data-hud=activity]')).toContainText(/clam|forag|opening/i);
  await advance(page, 40);
  await expect.poll(() => meals(page)).toBe(1);
  await expect(forage(page)).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => (window as any).__mealClam.userData.alive)).toBe(false);
  expect(await page.evaluate(() => (window as any).__secondClam.userData.alive)).toBe(true);
  await advance(page, 45);
  expect(await meals(page)).toBe(1);
  expect(await page.evaluate(() => (window as any).__secondClam.userData.alive)).toBe(true);
});

test('movement and pausing cancel a latched meal and resume never restarts it', async ({ page }) => {
  await mount(page);
  await placeClams(page);
  await page.keyboard.press('KeyR');
  await advance(page, 10);
  expect(await forageProgress(page)).toBeGreaterThan(0);
  await page.keyboard.down('KeyW');
  await advance(page, 2);
  await page.keyboard.up('KeyW');
  await expect(forage(page)).toHaveAttribute('aria-pressed', 'false');
  expect(await forageProgress(page)).toBe(0);

  await page.keyboard.press('KeyR');
  await advance(page, 8);
  expect(await forageProgress(page)).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(forage(page)).toHaveAttribute('aria-pressed', 'false');
  expect(await forageProgress(page)).toBe(0);
  await advance(page, 45);
  expect(await meals(page)).toBe(0);
  await page.keyboard.press('Escape');
  await advance(page, 45);
  expect(await meals(page)).toBe(0);
  await expect(forage(page)).toHaveAttribute('aria-pressed', 'false');
});

test('the forage button gathers a single marine-snow meal for vampire squid', async ({ page }) => {
  await mount(page, 'vampireSquid');
  await page.evaluate(() => {
    const w = window as any;
    const snow = w.__scene.children.filter((o: any) => o.name === 'cl-marine-snow');
    snow.forEach((o: any, i: number) => o.position.copy(w.__player.position).add(new w.THREE.Vector3(9, i * 0.05, 0)));
    snow[0].position.copy(w.__player.position).add(new w.THREE.Vector3(0, 0, 0.5));
    snow[1].position.copy(w.__player.position).add(new w.THREE.Vector3(0, 0, 1));
  });
  await forage(page).click();
  await expect(forage(page)).toHaveAttribute('aria-pressed', 'true');
  await advance(page, 5);
  expect(await forageProgress(page)).toBeGreaterThan(0);
  await advance(page, 20);
  await expect(page.locator('[data-hud=score]')).toHaveText('2');
  await expect(forage(page)).toHaveAttribute('aria-pressed', 'false');
  await advance(page, 30);
  await expect(page.locator('[data-hud=score]')).toHaveText('2');
  await page.getByRole('button', { name: /End run \+ surface/ }).click();
  const summary = await page.evaluate(() => JSON.parse(localStorage.getItem('allo.cephalopodlab.lastRun.v2')!));
  expect(summary.stats.marineSnow).toBe(1);
  expect(summary.stats.crabs).toBe(0);
});

test('a pending strike waits through pause and captures only after simulation-time contact', async ({ page }) => {
  await mount(page);
  await placeCrab(page);
  await page.keyboard.press('KeyE');
  await advance(page, 1);
  expect(await crabAlive(page)).toBe(true);
  await page.keyboard.press('Escape');
  const time = await page.locator('[data-hud=time]').innerText();
  await advance(page, 30);
  expect(await crabAlive(page)).toBe(true);
  expect(await meals(page)).toBe(0);
  await expect(page.locator('[data-hud=time]')).toHaveText(time);
  await page.keyboard.press('Escape');
  await advance(page, 2);
  expect(await crabAlive(page)).toBe(true);
  await advance(page, 3);
  await expect.poll(() => crabAlive(page)).toBe(false);
  await expect.poll(() => meals(page)).toBe(1);
});

test('prey that escapes or gains rock cover during wind-up survives contact', async ({ page }) => {
  await mount(page);
  await placeCrab(page);
  await page.keyboard.press('KeyE');
  await advance(page, 1);
  await page.evaluate(() => {
    const w = window as any;
    w.__strikeCrab.position.z = w.__player.position.z + 7;
  });
  await advance(page, 6);
  expect(await crabAlive(page)).toBe(true);
  expect(await meals(page)).toBe(0);

  await page.evaluate(() => {
    const w = window as any;
    w.__strikeCrab.position.z = w.__player.position.z + 1.4;
  });
  await advance(page, 40);
  await expect(page.locator('.cl-hunt-mission')).toContainText('IN RANGE');
  await page.keyboard.press('KeyE');
  await advance(page, 1);
  await page.evaluate(() => {
    const w = window as any;
    w.__strikeCover = w.__scene.children.find((o: any) => o.userData.substrate === 'rock');
    w.__strikeCover.geometry.dispose();
    w.__strikeCover.geometry = new w.THREE.BoxGeometry(8, 3, 0.16);
    w.__strikeCover.rotation.set(0, 0, 0);
    w.__strikeCover.scale.set(1, 1, 1);
    w.__strikeCover.position.set(w.__player.position.x, 1, w.__player.position.z + 0.7);
    w.__scene.updateMatrixWorld(true);
  });
  await advance(page, 6);
  expect(await crabAlive(page)).toBe(true);
  expect(await meals(page)).toBe(0);
  await expect(page.locator('.cl-hunt-mission')).toContainText(/blocked|COVER BLOCKS STRIKE/);
  await page.evaluate(() => {
    const w = window as any;
    w.__strikeCover.position.set(-18, 1, -18);
    w.__scene.updateMatrixWorld(true);
  });
  await advance(page, 40);
  await expect(page.locator('.cl-hunt-mission')).toContainText('IN RANGE');
  await page.keyboard.press('KeyE');
  await advance(page, 6);
  await expect.poll(() => crabAlive(page)).toBe(false);
  await expect.poll(() => meals(page)).toBe(1);
});

// The crab rule is horizontal reach plus a separate depth allowance. This
// boundary is inside that rule, while just outside a 2.6 m sphere.
test('crab target readiness and capture agree at the horizontal reach boundary', async ({ page }) => {
  await mount(page);
  await placeCrab(page, 2.59);
  await expect(page.locator('.cl-hunt-mission')).toContainText('IN RANGE');
  await page.keyboard.press('KeyE');
  await advance(page, 6);
  await expect.poll(() => crabAlive(page)).toBe(false);
  await expect.poll(() => meals(page)).toBe(1);
});


test('cuttlefish display interrupts a nearby school alarm and fleeing resumes after release', async ({ page }) => {
  await mount(page, 'cuttlefish');
  await page.evaluate(async () => {
    const w = window as any;
    const fish = w.__scene.children.filter((o: any) => o.userData.alive && o.userData.offset).slice(0, 8);
    if (fish.length !== 8) throw new Error('Expected the actual first fish school');
    // The scene exposes fish meshes, while their steering center lives in the
    // simulation closure. Recover that existing Vector3 during a frozen frame;
    // restore clone immediately, then arrange a controlled school encounter.
    const initialCenter = fish[0].position.clone().sub(fish[0].userData.offset);
    const originalClone = w.THREE.Vector3.prototype.clone;
    let center: any;
    w.THREE.Vector3.prototype.clone = function () {
      if (this.distanceToSquared(initialCenter) < 4 && !fish.some((f: any) => f.position === this)) center = this;
      return originalClone.call(this);
    };
    try {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    } finally {
      w.THREE.Vector3.prototype.clone = originalClone;
    }
    if (!center) throw new Error('Could not locate the actual school steering center');
    center.copy(w.__player.position).add(new w.THREE.Vector3(0, 0, 1.1));
    fish.forEach((f: any, i: number) => {
      f.userData.offset.set((i % 4 - 1.5) * 0.08, 0, Math.floor(i / 4) * 0.12);
      f.position.copy(center).add(f.userData.offset);
    });
    w.__displaySchool = fish;
    w.__scene.updateMatrixWorld(true);
  });
  await page.keyboard.press('KeyT');
  await advance(page, 8);
  expect(await page.evaluate(() => (window as any).__displaySchool.every((f: any) => f.userData.alert && f.userData.intent === 'fleeing'))).toBe(true);
  await expect(page.locator('.cl-hunt-mission')).toContainText('prey is fleeing');

  await page.keyboard.down('KeyH');
  await advance(page, 16);
  expect(await page.evaluate(() => (window as any).__displaySchool.every((f: any) => f.userData.distracted && !f.userData.alert && f.userData.intent === 'distracted'))).toBe(true);
  await expect(page.locator('.cl-hunt-mission')).toContainText('prey distracted by display');

  await page.keyboard.up('KeyH');
  await advance(page, 8);
  expect(await page.evaluate(() => (window as any).__displaySchool.every((f: any) => !f.userData.distracted && f.userData.alert && f.userData.intent === 'fleeing'))).toBe(true);
  await expect(page.locator('.cl-hunt-mission')).toContainText('prey is fleeing');
});
