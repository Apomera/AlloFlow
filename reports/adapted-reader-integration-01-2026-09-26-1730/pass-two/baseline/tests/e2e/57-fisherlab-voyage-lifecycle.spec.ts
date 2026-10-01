import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Fisher Lab — real-browser voyage lifecycle and frame-budget coverage.
 *
 * The unit suite exercises the pure navigation, scoring, persistence, and recovery
 * helpers. This journey guards the seams jsdom cannot reach: a live WebGL scene,
 * React HUD updates, keyboard pause, held-scene controls, inactivity recovery,
 * local checkpoint persistence, responsive layout, and the rendered ARIA tree.
 */
test.describe.configure({ timeout: 180_000 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_fisherlab.js',
  toolId: 'fisherLab',
  width: 1180,
  height: 980,
  appStyles: true,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
  probes: `
    (function () {
      var originalUseState = window.React.useState;
      window.__fisherHudSetCount = 0;
      window.React.useState = function (initial) {
        var pair = originalUseState.apply(this, arguments);
        var isHud = initial && typeof initial === 'object' && !Array.isArray(initial)
          && Object.keys(initial).length === 0;
        if (!isHud) return pair;
        var setState = pair[1];
        return [pair[0], function (next) {
          window.__fisherHudSetCount += 1;
          return setState(next);
        }];
      };

      var originalRequestAnimationFrame = window.requestAnimationFrame.bind(window);
      window.__fisherFrameCount = 0;
      window.requestAnimationFrame = function (callback) {
        return originalRequestAnimationFrame(function (time) {
          window.__fisherFrameCount += 1;
          callback(time);
        });
      };
    })();
  `,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountSimulator(page: any) {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.getByRole('tab', { name: /3D Sim/ }).click();
  await page.getByRole('button', { name: /Start new Guided voyage/ }).click();
  await page.waitForSelector('canvas.fl-sim-canvas', { timeout: 30_000 });
  await page.waitForFunction(() => {
    const hit = (window as any).__glLive?.();
    return !!hit && !hit.lost && hit.box.w > 300 && hit.box.h > 250;
  }, null, { timeout: 30_000 });
  await page.waitForTimeout(500);
}

test('runs, pauses, checkpoints, and leaves a recoverable voyage without flooding React', async ({ page }) => {
  await mountSimulator(page);

  const baseline = await page.evaluate(() => ({
    frames: (window as any).__fisherFrameCount,
    hud: (window as any).__fisherHudSetCount,
    time: performance.now(),
  }));
  await page.waitForTimeout(1_200);
  const active = await page.evaluate((before) => ({
    frames: (window as any).__fisherFrameCount - before.frames,
    hud: (window as any).__fisherHudSetCount - before.hud,
    milliseconds: performance.now() - before.time,
  }), baseline);

  expect(active.frames, 'the harbor animation loop did not advance').toBeGreaterThan(5);
  expect(active.hud, 'the realtime instruments never refreshed').toBeGreaterThan(0);
  // SwiftShader can stall the browser main thread long enough that Playwright's
  // nominal 1.2-second wait spans several seconds of page time. Grade the update
  // count against the browser's measured interval rather than wall-clock intent.
  const hudBudget = Math.ceil(active.milliseconds / 1000 * 12) + 4;
  expect(active.hud, 'HUD updates exceeded the 10 Hz runtime budget').toBeLessThanOrEqual(hudBudget);
  if (active.frames >= 30) {
    expect(active.hud, 'React still updates on nearly every animation frame').toBeLessThan(active.frames * 0.65);
  }

  const canvas = page.locator('canvas.fl-sim-canvas');
  await canvas.focus();
  await page.keyboard.press('p');
  await expect(page.getByRole('button', { name: /Resume \(P\)/ })).toBeVisible();

  const pausedFrames = await page.evaluate(() => (window as any).__fisherFrameCount);
  await page.waitForTimeout(500);
  const pausedFrameDelta = await page.evaluate((before) => (window as any).__fisherFrameCount - before, pausedFrames);
  expect(pausedFrameDelta, 'paused Fisher Lab should leave requestAnimationFrame idle').toBeLessThanOrEqual(2);

  const fogButton = page.getByRole('button', { name: /Foggy/ });
  await fogButton.click();
  await expect(fogButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Resume \(P\)/ })).toBeVisible();

  const droneButton = page.getByRole('button', { name: /Drone/ });
  await droneButton.click();
  await expect(droneButton).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: /Resume \(P\)/ }).click();
  await expect(page.getByRole('button', { name: /Pause \(P\)/ })).toBeVisible();

  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('button', { name: /Resume \(P\)/ })).toBeVisible();
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('fisherLab.state.v1');
    if (!raw) return false;
    try { return !!JSON.parse(raw).coreVoyageCheckpoint; } catch { return false; }
  });

  const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('fisherLab.state.v1') || '{}').coreVoyageCheckpoint);
  expect(checkpoint).toMatchObject({
    version: 1,
    resumePolicy: 'paused-neutral',
    environment: { weather: 'foggy', cameraView: 'topdown' },
  });

  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('button', { name: /Resume \(P\)/ })).toBeVisible();
  await page.getByRole('button', { name: /Leave sim/ }).click();
  await expect(page.getByText('Saved voyage ready')).toBeVisible();
  await expect(page.getByRole('button', { name: /Resume saved voyage/ })).toBeVisible();
});

test('keeps the core route accessible at a narrow viewport with learner preferences enabled', async ({ page }) => {
  await page.setViewportSize({ width: 420, height: 900 });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const wrap = document.getElementById('wrap');
    if (wrap) wrap.style.width = '400px';
  });

  for (const name of ['Reduced scene motion', 'Expanded captions', 'Large text']) {
    const button = page.getByRole('button', { name });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }

  const homeViolations = await page.evaluate(async () => {
    const result = await (window as any).axe.run('#wrap', {
      runOnly: {
        type: 'rule',
        values: ['aria-allowed-attr', 'aria-valid-attr', 'button-name', 'duplicate-id', 'label', 'landmark-unique'],
      },
      resultTypes: ['violations'],
    });
    return result.violations.map((violation: any) => violation.id);
  });
  expect(homeViolations).toEqual([]);

  await page.getByRole('tab', { name: /3D Sim/ }).click();
  await page.getByRole('button', { name: /Start new Guided voyage/ }).click();
  await page.waitForSelector('canvas.fl-sim-canvas', { timeout: 30_000 });
  await page.waitForTimeout(600);

  const responsive = await page.evaluate(() => {
    const root = document.querySelector('.fl-fisherlab-root');
    const canvas = document.querySelector('canvas.fl-sim-canvas') as HTMLElement | null;
    const box = canvas?.getBoundingClientRect();
    return {
      staticCamera: root?.getAttribute('data-static-camera'),
      captions: root?.getAttribute('data-caption-mode'),
      largeText: root?.classList.contains('fl-large-text'),
      canvasWidth: box ? Math.round(box.width) : 0,
    };
  });
  expect(responsive).toMatchObject({ staticCamera: 'true', captions: 'true', largeText: true });
  expect(responsive.canvasWidth).toBeGreaterThan(300);
  expect(responsive.canvasWidth).toBeLessThanOrEqual(400);

  const simViolations = await page.evaluate(async () => {
    const result = await (window as any).axe.run('#wrap', {
      runOnly: {
        type: 'rule',
        values: ['aria-allowed-attr', 'aria-valid-attr', 'button-name', 'duplicate-id', 'label', 'landmark-unique'],
      },
      resultTypes: ['violations'],
    });
    return result.violations.map((violation: any) => violation.id);
  });
  expect(simViolations).toEqual([]);
});

test('shows a reviewed official regulations source for every regional practice profile', async ({ page }) => {
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.getByRole('button', { name: 'Fisheries & Gear' }).click();
  await page.getByRole('tab', { name: /Regional Regs/ }).click();

  const sourceNote = page.locator('[data-fisherlab-regulation-provenance]');
  const officialLink = sourceNote.getByRole('link');
  const expected = [
    ['maine', 'https://www.maine.gov/dmr/marine-patrol/fishing-regulations'],
    ['chesapeake', 'https://dnr.maryland.gov/Fisheries/Pages/regulations/index.aspx'],
    ['pnw', 'https://wdfw.wa.gov/fishing/regulations'],
    ['greatlakes', 'https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations'],
  ];

  for (const [region, href] of expected) {
    await page.locator('#fl-region-select').selectOption(region);
    await expect(sourceNote).toHaveAttribute('data-fisherlab-regulation-provenance', 'source-checked');
    await expect(sourceNote).toHaveAttribute('data-fisherlab-regulation-reviewed-on', '2026-08-31');
    await expect(officialLink).toHaveAttribute('href', href);
    await expect(officialLink).toHaveAttribute('target', '_blank');
    await expect(officialLink).toHaveAttribute('rel', 'noopener noreferrer');
  }

  await expect(sourceNote.getByText('Instructional source reviewed August 31, 2026.')).toBeVisible();
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run('[data-fisherlab-regulation-provenance]', {
      runOnly: {
        type: 'rule',
        values: ['aria-allowed-attr', 'aria-valid-attr', 'duplicate-id', 'link-name'],
      },
      resultTypes: ['violations'],
    });
    return result.violations.map((violation: any) => violation.id);
  });
  expect(violations).toEqual([]);
});
