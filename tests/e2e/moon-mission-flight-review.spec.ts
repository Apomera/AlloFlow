import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve('reports/moon-mission-enhancement-pass2-2026-09-27/review');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true,
  // Read the actual rendered camera, so merely changing a select or dataset
  // cannot pass the camera test. Preserve the harness's existing GL recorder.
  probes: `
    (function () {
      var Original = window.THREE.WebGLRenderer;
      window.THREE.WebGLRenderer = new Proxy(Original, {
        construct: function (target, args, newTarget) {
          var renderer = Reflect.construct(target, args, newTarget), render = renderer.render;
          renderer.render = function (scene, camera) {
            if (renderer.domElement.hasAttribute('data-descent-gl') && scene && scene.isScene && camera && camera.isPerspectiveCamera) {
              window.__descentCameraPose = { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
            }
            return render.apply(this, arguments);
          };
          return renderer;
        }
      });
    })();
  `,
});

const SAMPLES = [
  { t: 0, alt: 300, v: -3, h: 4, fuel: 110, throttle: 0, tilt: 0, x: 0 },
  { t: 10, alt: 120, v: -6, h: 1.2, fuel: 90, throttle: 0.35, tilt: -0.15, x: 30 },
  { t: 20, alt: 30, v: -2, h: 0.2, fuel: 70, throttle: 0.25, tilt: 0, x: 40 },
  { t: 40, alt: 0, v: -0.9, h: 0.1, fuel: 61, throttle: 0, tilt: 0, x: 42 },
];

function completedFlight() {
  const recording = {
    version: 1, interval: 0.5, samples: SAMPLES.map(row => ({ ...row })),
    burnSeconds: 25, peakDescent: 6, peakDrift: 4,
    firstBurn: { t: 10, alt: 120 }, lastTime: 40,
  };
  const landing = {
    crashed: false, score: 94, grade: 'A', vVel: 0.9, hVel: 0.1,
    fuel: 61, fuelUnit: 's', duration: 40, elapsed: 40, recording,
  };
  return { moonMission: {
    missionPhase: 5, descentStarted: true, soundOff: true, landingResult: landing,
    landingAttempts: [
      { crashed: true, score: 0, grade: '—', vVel: 5.4, hVel: 6.3, fuel: 12, fuelUnit: 's' },
      landing,
    ],
  } };
}

async function finalPhysics(page: Page) {
  return page.locator('[data-descent-canvas]').evaluate((cv: HTMLCanvasElement) => ({
    time: cv.dataset.descentElapsed, alt: cv.dataset.descentAlt,
    v: cv.dataset.descentVspeed, h: cv.dataset.descentHspeed,
    fuel: cv.dataset.descentFuel, mass: cv.dataset.descentMass,
    thrust: cv.dataset.descentThrust, x: cv.dataset.descentX,
  }));
}

async function savedLanding(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.moonMission;
    return { result: data.landingResult, attempts: data.landingAttempts };
  });
}

async function reviewTime(page: Page) {
  const value = await page.locator('[data-descent-canvas]').getAttribute('data-descent-review-time');
  return value == null || value === '' ? null : Number(value);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true });
  const path = join(REPORT, `${name}-${testInfo.project.name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('camera views change the rendered perspective while a paused flight remains unchanged', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 1000 });
  await harness.mount(page, { moonMission: { missionPhase: 5, descentStarted: true, soundOff: true } }, undefined, { expectCanvas: false });
  const cv = page.locator('[data-descent-canvas]');
  await expect(cv).toHaveAttribute('data-descent3d', 'on');
  await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  await expect(cv).toHaveAttribute('data-descent-paused', 'true');
  const paused = await finalPhysics(page);
  const camera = page.locator('select[data-descent-camera]');
  const poses: string[] = [];
  for (const mode of ['chase', 'overhead', 'landing']) {
    await camera.selectOption(mode);
    await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', mode);
    const pose = await page.evaluate(() => (window as any).__descentCameraPose);
    expect(pose).toBeTruthy();
    expect(pose.position.every(Number.isFinite)).toBe(true);
    poses.push(JSON.stringify(pose));
    expect(await finalPhysics(page)).toEqual(paused);
    await cv.scrollIntoViewIfNeeded();
    await capture(page, testInfo, `camera-${mode}`);
  }
  expect(new Set(poses).size, 'the renderer reused one camera transform for all views').toBe(3);
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-model', 'apollo-shared');
  expect(errors).toEqual([]);
});

test('a saved touchdown can be inspected and exported, then retried without losing earlier attempts', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 1000 });
  await harness.mount(page, completedFlight(), undefined, { expectCanvas: false });
  const cv = page.locator('[data-descent-canvas]');
  await expect(cv).toHaveAttribute('data-descent-alt', '0');
  await expect(page.locator('[data-flight-value="altitude"]')).toHaveText('0.0 m');
  await expect(page.getByRole('button', { name: /Begin EVA/ })).toBeEnabled();
  await expect(page.locator('[data-landing-attempts] tbody tr')).toHaveCount(2);
  const final = await finalPhysics(page), stored = await savedLanding(page);
  expect(Number(final.time)).toBe(40);
  expect(Number(final.fuel)).toBe(61);
  expect(Number(final.thrust)).toBe(0);
  const scrub = page.getByRole('slider', { name: 'Inspect recorded time', exact: true });
  await expect(scrub).toHaveValue('3');
  await scrub.fill('1');
  await expect.poll(async () => reviewTime(page)).toBe(10);
  await expect(page.locator('[data-landing-selected-sample]')).toContainText('120.0 m');
  await expect(page.locator('[data-landing-selected-sample]')).toContainText('throttle 35%');
  await expect(scrub).toHaveAttribute('aria-valuetext', /10\.0 seconds, altitude 120\.0 metres/);
  expect(await finalPhysics(page)).toEqual(final);
  expect(await savedLanding(page)).toEqual(stored);
  await cv.scrollIntoViewIfNeeded();
  await capture(page, testInfo, 'recorded-approach');

  // Scrub backwards as well: the visual renderer must discard live/future dust.
  await scrub.fill('0');
  await expect.poll(async () => reviewTime(page)).toBe(0);
  await expect(page.locator('[data-landing-selected-sample]')).toContainText('300.0 m');
  expect(await finalPhysics(page)).toEqual(final);
  await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
  await expect(scrub).toHaveValue('3');
  await expect.poll(async () => (await cv.getAttribute('data-descent-review-time')) || '').toBe('');
  expect(await finalPhysics(page)).toEqual(final);
  expect(await savedLanding(page)).toEqual(stored);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download flight CSV', exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('moon-mission-descent.csv');
  await mkdir(REPORT, { recursive: true });
  const csvPath = join(REPORT, 'saved-landing.csv');
  await download.saveAs(csvPath);
  const csv = await readFile(csvPath, 'utf8');
  const lines = csv.trim().split(/\r?\n/);
  expect(lines).toHaveLength(SAMPLES.length + 1);
  expect(lines[0]).toBe('time_s,altitude_m,vertical_velocity_m_s,lateral_velocity_m_s,hover_fuel_s,throttle_percent,tilt_deg,displacement_m');
  expect(lines[2].split(',').map(Number).slice(0, 6)).toEqual([10, 120, -6, 1.2, 90, 35]);
  expect(lines[lines.length - 1].split(',').map(Number)).toEqual([40, 0, -0.9, 0.1, 61, 0, 0, 42]);
  await testInfo.attach('flight-recording-csv', { path: csvPath, contentType: 'text/csv' });

  await page.getByRole('button', { name: 'Retry the powered descent from the start', exact: true }).click();
  await expect(page.locator('[data-descent-canvas]')).toHaveCount(0);
  const reset = await savedLanding(page);
  expect(reset.result).toBeNull();
  expect(reset.attempts).toEqual(stored.attempts);
  await page.getByRole('button', { name: /Begin Descent/ }).click();
  await expect(page.locator('[data-flight-value="mass"]')).toContainText('kg');
  await page.getByRole('button', { name: 'Pause flight', exact: true }).click();
  await expect(page.locator('[data-descent-throttle]')).toHaveValue('0');
  expect((await savedLanding(page)).attempts).toEqual(stored.attempts);
  expect(errors).toEqual([]);
});

test('phone recorder fits the viewport and supports keyboard inspection', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(seed => {
    document.getElementById('wrap')!.style.width = '100%';
    (window as any).__mount(seed);
  }, completedFlight());
  const recorder = page.getByRole('region', { name: 'Landing flight recorder', exact: true });
  await expect(recorder).toBeVisible();
  const scrub = page.locator('[data-landing-scrub]');
  await scrub.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(scrub).toHaveValue('2');
  await expect(page.locator('[data-landing-selected-sample]')).toContainText('30.0 m');
  await expect.poll(async () => reviewTime(page)).toBe(20);
  const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
  const boxes = await page.locator('[data-landing-recorder] button, [data-landing-scrub], select[data-descent-camera]').evaluateAll(nodes => nodes.map(node => {
    const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, height: b.height };
  }));
  expect(boxes.length).toBeGreaterThanOrEqual(4);
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  await expect(recorder.getByRole('img')).toHaveCount(2);
  await capture(page, testInfo, 'recorder-phone');
});
