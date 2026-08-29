import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 150_000 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js',
  toolId: 'roadReady',
  width: 390,
  height: 720,
  preScripts: ['stem_lab/stem_lab_module.js'],
  probes: 'window.__testHooks = {};',
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function startDrive(page: any, state: Record<string, unknown>) {
  await page.setViewportSize({ width: 390, height: 720 });
  await harness.mount(page, { roadReady: state }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('residential', 'sedan'));
}

test('road-test status remains clear of mirrors and controls on a phone viewport', async ({ page }) => {
  await startDrive(page, {
    view: 'driving', scenario: 'residential', vehicle: 'sedan',
    roadTestStage: 'drive', calmDrive: true, reducedMotion: true,
  });

  const meter = page.locator('.rr-road-test-meter');
  const dock = page.locator('.rr-drive-dock');
  await expect(meter).toBeHidden();
  await expect(page.getByText('Fasten Your Seatbelt')).toBeVisible();
  await page.keyboard.press('b');
  await expect(page.getByText('🪞 Check Your Mirrors', { exact: true })).toBeVisible();
  await expect(meter).toBeHidden();
  await page.waitForTimeout(4400);
  await expect(meter).toBeVisible();
  await expect(meter).toHaveAttribute('role', 'timer');
  await expect(meter).toHaveAttribute('aria-live', 'off');
  const parkedAfterScan = await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    return {
      gear: hook.gearRef.current,
      speed: hook.carRef.current.speed,
      crashes: hook.statsRef.current.crashes,
      safetyScore: hook.statsRef.current.safetyScore,
    };
  });
  expect(parkedAfterScan.gear).toBe('P');
  expect(Math.abs(parkedAfterScan.speed)).toBeLessThan(0.01);
  expect(parkedAfterScan.crashes).toBe(0);
  expect(parkedAfterScan.safetyScore).toBe(100);

  const layout = await page.evaluate(() => {
    const shell = document.querySelector('.rr-drive-shell')!.getBoundingClientRect();
    const meterRect = document.querySelector('.rr-road-test-meter')!.getBoundingClientRect();
    const dockRect = document.querySelector('.rr-drive-dock')!.getBoundingClientRect();
    return {
      meterTop: meterRect.top - shell.top,
      meterBottom: meterRect.bottom - shell.top,
      meterHeight: meterRect.height,
      dockTop: dockRect.top - shell.top,
      meterLeft: meterRect.left - shell.left,
      meterRight: meterRect.right - shell.left,
      shellWidth: shell.width,
    };
  });
  expect(layout.meterTop).toBeGreaterThanOrEqual(76);
  expect(layout.meterTop).toBeLessThanOrEqual(100);
  expect(layout.meterHeight).toBeLessThanOrEqual(42);
  expect(layout.meterBottom).toBeLessThanOrEqual(132);
  expect(layout.meterBottom).toBeLessThan(layout.dockTop);
  expect(layout.meterLeft).toBeGreaterThanOrEqual(0);
  expect(layout.meterRight).toBeLessThanOrEqual(layout.shellWidth);
  await page.screenshot({ path: 'tests/e2e/artifacts/roadready-road-test-mobile.png' });

  await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    hook.eventToastRef.current = {
      msg: '⚠ Critical test alert: stop and assess the roadway.',
      tone: 'critical', priority: 3,
      _fadeStart: hook.timeRef.current,
      until: hook.timeRef.current + 3,
    };
  });
  await page.waitForTimeout(150);
  await page.screenshot({ path: 'tests/e2e/artifacts/roadready-road-test-alert-mobile.png' });
});

test('movement-key buckling requires release and a fresh press after the mirror scan', async ({ page }) => {
  await startDrive(page, {
    view: 'driving', scenario: 'residential', vehicle: 'sedan',
    roadTestStage: 'drive', calmDrive: true, reducedMotion: true,
  });

  await expect(page.getByText('Fasten Your Seatbelt')).toBeVisible();
  await page.keyboard.down('w');
  await expect(page.getByText('Check Your Mirrors')).toBeVisible();
  await page.waitForTimeout(350);

  let driveState = await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    return {
      gear: hook.gearRef.current,
      speed: hook.carRef.current.speed,
      crashes: hook.statsRef.current.crashes,
    };
  });
  expect(driveState.gear).toBe('P');
  expect(Math.abs(driveState.speed)).toBeLessThan(0.01);
  expect(driveState.crashes).toBe(0);

  await page.waitForTimeout(4100);
  await expect(page.getByText('Release Movement Controls')).toBeVisible();
  driveState = await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    return { gear: hook.gearRef.current, speed: hook.carRef.current.speed };
  });
  expect(driveState.gear).toBe('P');
  expect(Math.abs(driveState.speed)).toBeLessThan(0.01);

  await page.keyboard.up('w');
  await expect(page.getByText('Release Movement Controls')).toBeHidden();
  await expect(page.locator('.rr-road-test-meter')).toBeVisible();
  driveState = await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    return {
      gear: hook.gearRef.current,
      speed: hook.carRef.current.speed,
      crashes: hook.statsRef.current.crashes,
    };
  });
  expect(driveState.gear).toBe('P');
  expect(Math.abs(driveState.speed)).toBeLessThan(0.01);
  expect(driveState.crashes).toBe(0);

  await page.keyboard.down('w');
  await page.waitForTimeout(300);
  await page.keyboard.up('w');
  driveState = await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    return { gear: hook.gearRef.current, speed: hook.carRef.current.speed };
  });
  expect(driveState.gear).toBe('D');
  expect(driveState.speed).toBeGreaterThan(0);
});

test('pausing preserves the mirror scan in simulation time', async ({ page }) => {
  await startDrive(page, {
    view: 'driving', scenario: 'residential', vehicle: 'sedan',
    roadTestStage: 'drive', calmDrive: true, reducedMotion: true,
  });

  await page.keyboard.press('b');
  await expect(page.getByText('Check Your Mirrors')).toBeVisible();
  await page.getByRole('button', { name: 'Pause drive' }).click();
  await expect(page.getByRole('dialog', { name: 'PAUSED' })).toBeVisible();
  const pausedAt = await page.evaluate(() => (window as any).__testHooks.roadReady.timeRef.current);
  await page.waitForTimeout(4500);
  await expect(page.getByText('🪞 Check Your Mirrors', { exact: true })).toBeVisible();
  await expect(page.locator('.rr-road-test-meter')).toBeHidden();
  const afterPause = await page.evaluate(() => (window as any).__testHooks.roadReady.timeRef.current);
  expect(afterPause).toBeCloseTo(pausedAt, 2);

  await page.getByRole('button', { name: /Resume Driving/i }).click();
  await page.waitForTimeout(4300);
  await expect(page.getByText('🪞 Check Your Mirrors', { exact: true })).toBeHidden();
  await expect(page.locator('.rr-road-test-meter')).toBeVisible();
});

test('an idle formal test cannot pass on timer and score alone', async ({ page }) => {
  await startDrive(page, {
    view: 'driving', scenario: 'residential', vehicle: 'sedan',
    roadTestStage: 'drive', calmDrive: true, reducedMotion: true,
  });
  await page.keyboard.press('b');
  await page.waitForTimeout(4300);
  await expect(page.locator('.rr-road-test-meter')).toBeVisible();
  await page.evaluate(() => {
    const hook = (window as any).__testHooks.roadReady;
    hook.statsRef.current.distance = 0;
    hook.timeRef.current += 241;
  });
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'End drive and open debrief' }).click();
  await expect(page.getByRole('heading', { name: 'More Driving Evidence Needed' })).toBeVisible();
  await expect(page.getByText(/at least 0\.19 mi of evaluated driving/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'PASSED' })).toHaveCount(0);
});

test('touch controls retain full targets and clear the bottom dock', async ({ page }) => {
  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    Object.defineProperty(Navigator.prototype, 'maxTouchPoints', {
      configurable: true, get: () => 5,
    });
    Object.defineProperty(window, 'ontouchstart', { configurable: true, value: null });
    window.matchMedia = ((query: string) => {
      if (query !== '(any-pointer: coarse)') return nativeMatchMedia(query);
      return {
        matches: true, media: query, onchange: null,
        addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
        dispatchEvent() { return false; },
      } as MediaQueryList;
    }) as typeof window.matchMedia;
  });
  await startDrive(page, {
    view: 'driving', scenario: 'residential', vehicle: 'sedan',
    calmDrive: true, reducedMotion: true,
  });

  const fastenSeatbelt = page.getByRole('button', { name: 'Fasten seatbelt' });
  const accelerator = page.getByRole('button', { name: 'Accelerate (touch and hold)' });
  const brake = page.getByRole('button', { name: 'Brake (touch and hold)' });
  const parkGear = page.getByRole('button', { name: 'Shift to Park' });
  const driveGear = page.getByRole('button', { name: 'Shift to Drive' });
  const reverseGear = page.getByRole('button', { name: 'Shift to Reverse' });
  await expect(fastenSeatbelt).toBeVisible();
  await expect(page.locator('.rr-seatbelt-prompt')).toContainText(
    'The car stays in Park during your mirror scan.');
  await expect(accelerator).toBeDisabled();
  await expect(brake).toBeDisabled();
  await expect(parkGear).toBeDisabled();
  await expect(driveGear).toBeDisabled();
  await expect(reverseGear).toBeDisabled();
  await fastenSeatbelt.click();
  await expect(page.locator('.rr-seatbelt-prompt')).toBeHidden();
  await expect(page.getByText('🪞 Check Your Mirrors', { exact: true })).toBeVisible();
  await expect(page.locator('.rr-touch-pedals')).toBeVisible();
  await expect(page.locator('.rr-touch-secondary')).toBeVisible();
  await expect(page.locator('.rr-touch-pedals').getByText('GO', { exact: true })).toBeVisible();
  await expect(page.locator('.rr-touch-pedals').getByText('BRAKE', { exact: true })).toBeVisible();
  await expect(page.locator('.rr-touch-pedals')).toHaveAttribute(
    'data-rr-controls-locked', 'true');
  await expect(page.locator('.rr-touch-secondary')).toHaveAttribute(
    'data-rr-controls-locked', 'true');
  await expect(accelerator).toBeDisabled();
  await expect(driveGear).toBeDisabled();
  const startupState = await page.evaluate(() => ({
    belted: (window as any).__testHooks.roadReady.seatbeltRef.current.fastened,
    gear: (window as any).__testHooks.roadReady.gearRef.current,
    speed: (window as any).__testHooks.roadReady.carRef.current.speed,
  }));
  expect(startupState.belted).toBe(true);
  expect(startupState.gear).toBe('P');
  expect(Math.abs(startupState.speed)).toBeLessThan(0.01);
  await page.waitForTimeout(4400);
  await expect(page.locator('.rr-touch-pedals')).toHaveAttribute(
    'data-rr-controls-locked', 'false');
  await expect(accelerator).toBeEnabled();
  await expect(brake).toBeEnabled();
  await expect(driveGear).toBeEnabled();
  await expect(accelerator).toHaveAttribute('aria-keyshortcuts', 'Space Enter');

  await driveGear.click();
  await expect(driveGear).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() =>
    (window as any).__testHooks.roadReady.gearRef.current)).toBe('D');
  await parkGear.click();
  await expect(parkGear).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() =>
    (window as any).__testHooks.roadReady.gearRef.current)).toBe('P');

  const lookLeft = page.getByRole('button', {
    name: 'Look over left shoulder (touch and hold)',
  });
  await lookLeft.dispatchEvent('pointerdown', {
    pointerId: 17, pointerType: 'touch', button: 0,
  });
  expect(await page.evaluate(() =>
    (window as any).__testHooks.roadReady.keysRef.current.z)).toBe(true);
  await lookLeft.dispatchEvent('pointercancel', {
    pointerId: 17, pointerType: 'touch', button: 0,
  });
  expect(await page.evaluate(() =>
    !!(window as any).__testHooks.roadReady.keysRef.current.z)).toBe(false);

  await accelerator.dispatchEvent('pointerdown', {
    pointerId: 18, pointerType: 'touch', button: 0,
  });
  expect(await page.evaluate(() =>
    (window as any).__testHooks.roadReady.keysRef.current.w)).toBe(true);
  await expect.poll(async () => page.evaluate(() =>
    Math.abs((window as any).__testHooks.roadReady.carRef.current.speed)
  ), { timeout: 2000 }).toBeGreaterThan(0.2);
  await accelerator.dispatchEvent('pointerup', {
    pointerId: 18, pointerType: 'touch', button: 0,
  });
  expect(await page.evaluate(() =>
    !!(window as any).__testHooks.roadReady.keysRef.current.w)).toBe(false);
  await expect(driveGear).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() =>
    (window as any).__testHooks.roadReady.gearRef.current)).toBe('D');
  await page.waitForTimeout(250);
  const postStartSafety = await page.evaluate(() => {
    const hooks = (window as any).__testHooks.roadReady;
    const stats = hooks.statsRef.current;
    return {
      learnerFaultCrashes: Math.max(0,
        (stats.crashes || 0) - (stats.aiCausedCrashes || 0)),
      impactedRiders: (hooks.cyclistsRef.current || [])
        .filter((rider: any) => !!rider._hit).length,
    };
  });
  expect(postStartSafety.learnerFaultCrashes).toBe(0);
  expect(postStartSafety.impactedRiders).toBe(0);
  const bounds = await page.evaluate(() => {
    const dock = document.querySelector('.rr-drive-dock')!.getBoundingClientRect();
    const pedals = document.querySelector('.rr-touch-pedals')!.getBoundingClientRect();
    const secondary = document.querySelector('.rr-touch-secondary')!.getBoundingClientRect();
    const buttons = [...document.querySelectorAll('.touch-controls button')]
      .map((button) => (button as HTMLElement).getBoundingClientRect())
      .map((rect) => ({ width: rect.width, height: rect.height }));
    return {
      dockTop: dock.top, pedalsBottom: pedals.bottom, secondaryBottom: secondary.bottom, buttons,
    };
  });
  expect(bounds.pedalsBottom).toBeLessThanOrEqual(bounds.dockTop - 8);
  expect(bounds.secondaryBottom).toBeLessThanOrEqual(bounds.dockTop - 8);
  for (const button of bounds.buttons) {
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: 'tests/e2e/artifacts/roadready-touch-controls-mobile.png' });
});

test('formal drives suspend a persisted Ride-Along preference', async ({ page }) => {
  await startDrive(page, {
    view: 'driving', scenario: 'residential', vehicle: 'sedan',
    roadTestStage: 'drive', rideAlong: true, calmDrive: true, reducedMotion: true,
  });

  await expect(page.locator('.rr-ridealong-state')).toHaveCount(0);
  await expect(page.getByText('Ride-Along is paused for evaluated drives. You are in control.')).toBeVisible();
  await expect(page.locator('canvas[role="application"]')).not.toHaveAttribute('aria-label', /automatically steers/);
  const state = await page.evaluate(() => ({
    rideAlongActive: (window as any).__testHooks.roadReady.rideAlongRef.current,
    belted: (window as any).__testHooks.roadReady.seatbeltRef.current.fastened,
    gear: (window as any).__testHooks.roadReady.gearRef.current,
  }));
  expect(state).toEqual({ rideAlongActive: false, belted: false, gear: 'P' });
});

test('Ride-Along rejects a real manual reverse shortcut', async ({ page }) => {
  await startDrive(page, {
    view: 'driving', scenario: 'residential', vehicle: 'sedan',
    rideAlong: true, calmDrive: true, reducedMotion: true,
  });
  await expect(page.locator('.rr-ridealong-state')).toContainText('Scan');
  await page.keyboard.press('g');
  const gear = await page.evaluate(() => (window as any).__testHooks.roadReady.gearRef.current);
  expect(gear).toBe('P');
  await expect(page.locator('canvas[role="application"]')).toHaveAttribute('aria-label', /automatically steers/);
});

test('a delayed Three.js load cannot restart a disposed drive', async ({ page }) => {
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.roadReady);
  await page.evaluate(() => {
    const w = window as any;
    w.__savedThree = w.THREE;
    w.THREE = null;
    w.StemLab.ensureThree = () => new Promise((resolve) => { w.__resolveThree = resolve; });
    w.__mount({ roadReady: {
      view: 'driving', scenario: 'residential', vehicle: 'sedan',
      calmDrive: true, reducedMotion: true,
    } });
  });
  await page.waitForFunction(() => typeof (window as any).__resolveThree === 'function');
  await page.evaluate(() => (window as any).__ctx.update('roadReady', 'view', 'menu'));
  await expect(page.locator('.rr-drive-shell')).toHaveCount(0);
  await page.evaluate(() => {
    const w = window as any;
    w.THREE = w.__savedThree;
    w.__resolveThree(w.THREE);
  });
  await page.waitForTimeout(500);
  const state = await page.evaluate(() => ({
    scene: (window as any).__testHooks?.roadReady?.threeRef?.current || null,
    errors: (window as any).__events.errors.slice(),
    drivingShells: document.querySelectorAll('.rr-drive-shell').length,
  }));
  expect(state.scene).toBeNull();
  expect(state.drivingShells).toBe(0);
  expect(state.errors).toEqual([]);
});
