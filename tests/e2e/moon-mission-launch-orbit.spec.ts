import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve('reports/moon-mission-enhancement-pass4-2026-09-28/launch-orbit');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true,
});
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 1, animPaused: true, soundOff: true, missionXP: 0, missionLog: [],
  earnedBadges: { first_step: true, mission_complete: true },
  difficulty: 'pilot', lunarSamples: [], quizCorrect: 0, ...extra,
} });

async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => {
    document.getElementById('wrap')!.style.width = '100%';
    Math.random = () => 0.999; // Isolate the phase action from random mission events.
    (window as any).__mount(value);
  }, data);
  await expect(page.locator('[data-launch-canvas], [data-orbit-canvas]').first()).toBeVisible();
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}
async function launch(page: Page) {
  return page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => ({
    time: Number(cv.dataset.launchTime), altitude: Number(cv.dataset.launchAltitude),
    speed: Number(cv.dataset.launchSpeed), airSpeed: Number(cv.dataset.launchAirSpeed),
    mass: Number(cv.dataset.launchMass), thrust: Number(cv.dataset.launchThrust),
    pressure: Number(cv.dataset.launchPressure), stage: Number(cv.dataset.launchStage),
    pitch: Number(cv.dataset.launchPitch), engine: cv.dataset.launchEngine,
  }));
}
async function orbit(page: Page) {
  return page.locator('[data-orbit-canvas]').evaluate((cv: HTMLCanvasElement) => ({
    time: Number(cv.dataset.orbitTime), window: cv.dataset.orbitWindow,
    altitude: Number(cv.dataset.orbitAltitude), speed: Number(cv.dataset.orbitSpeed),
    period: Number(cv.dataset.orbitPeriod), sunrises: Number(cv.dataset.orbitSunrises),
    shadow: cv.dataset.orbitShadow, engine: cv.dataset.orbitEngine,
  }));
}
async function profile(page: Page) {
  return page.evaluate(() => {
    const p = (window as any).MoonMissionPure.launchProfile();
    return { events: p.events, summary: p.summary };
  });
}
async function launchSample(page: Page, seconds: number) {
  return page.evaluate(time => {
    const P = (window as any).MoonMissionPure;
    return P.launchSample(P.launchProfile(), time);
  }, seconds);
}
async function seek(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await page.locator('[data-launch-seek]').evaluate((el: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Math.abs((await launch(page)).time - time)).toBeLessThan(0.11);
  return time;
}
async function milestone(page: Page, name: string, time: number) {
  await page.locator('[data-launch-milestone="' + name + '"]').click();
  await expect.poll(async () => Math.abs((await launch(page)).time - time)).toBeLessThan(1e-6);
}
async function painted(page: Page, selector: string) {
  await expect.poll(async () => page.locator(selector).evaluate((cv: HTMLCanvasElement) => {
    const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, total = 0; const colors = new Set<string>();
    for (let y = 10; y < cv.height; y += 20) for (let x = 10; x < cv.width; x += 20) {
      const i = (y * cv.width + x) * 4; total++;
      if (data[i + 3] > 100) opaque++;
      colors.add(Array.from(data.slice(i, i + 3)).join(','));
    }
    return opaque / total > 0.9 && colors.size > 12;
  }), { message: 'The resized, paused canvas should remain painted and varied' }).toBe(true);
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true });
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: 'image/png' });
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('launch instruments distinguish Earth rotation, air speed and the true pressure peak', async ({ page }, info) => {
  await mount(page);
  await expect(page.locator('[data-launch-value="time"]')).toHaveText('T−5.0 s');
  const pad = await launch(page);
  expect(pad.speed, 'Earth rotation is already part of inertial speed').toBeGreaterThan(390);
  expect(pad.speed).toBeLessThan(430);
  expect(pad.airSpeed).toBeCloseTo(0, 10);
  expect(pad.pressure).toBeCloseTo(0, 10);
  expect(pad.engine).toBe('off');
  expect(pad.thrust).toBe(0);
  await expect(page.locator('[data-launch-value="load"]')).toHaveText('1.00 g');
  await expect(page.locator('[data-launch-proceed]')).toBeDisabled();

  const p = await profile(page);
  await milestone(page, 'maxQ', p.events.maxQ.time);
  const reading = await launch(page), sample = await launchSample(page, p.events.maxQ.time);
  expect(reading.altitude).toBeCloseTo(sample.altitude, 6);
  expect(reading.mass).toBeCloseTo(sample.mass, 5);
  expect(reading.pressure).toBeCloseTo(0.5 * sample.density * reading.airSpeed ** 2, 5);
  expect(reading.pressure).toBeCloseTo(p.summary.peakQ, 5);
  expect(reading.pressure).toBeGreaterThan(20000);
  expect(reading.pressure).toBeLessThan(50000);
  expect(reading.altitude).toBeGreaterThan(8000);
  expect(reading.altitude).toBeLessThan(16000);
  await expect(page.locator('[data-launch-value="pressure"]')).toHaveText((sample.dynamicPressure / 1000).toFixed(2) + ' kPa');
  await expect(page.locator('[data-launch-value="speed"]')).toHaveText((sample.speed / 1000).toFixed(3) + ' km/s');
  await expect(page.locator('[data-launch-value="airSpeed"]')).toHaveText((sample.airSpeed / 1000).toFixed(3) + ' km/s');
  await expect(page.locator('[data-launch-value="mass"]')).toHaveText((sample.mass / 1000).toFixed(1) + ' t');
  expect((await saved(page)).missionXP).toBe(0);
  await painted(page, '[data-launch-canvas]');
  await capture(page, info, 'launch-maxq');
});

test('stage events shed mass, coast between engines and restart the next stage', async ({ page }, info) => {
  await mount(page);
  const p = await profile(page);
  for (const [name, expectedStage, minimumDrop, ignitionDelay] of [
    ['stage1', 2, 100000, 2.1], ['stage2', 3, 20000, 2.6],
  ] as const) {
    const event = p.events[name];
    await seek(page, event.time - 0.2);
    const before = await launch(page);
    await milestone(page, name, event.time);
    const separated = await launch(page);
    expect(separated.stage).toBe(expectedStage);
    expect(before.mass - separated.mass).toBeGreaterThan(minimumDrop);
    expect(separated.engine).toBe('off');
    expect(separated.thrust).toBe(0);
    await expect(page.locator('[data-launch-value="thrust"]')).toHaveText('0.00 MN');
    await expect(page.getByText(expectedStage === 2 ? 'Stage 1 away. Coasting briefly before second-stage ignition.' : 'Stage 2 away. Coasting briefly before third-stage ignition.')).toBeVisible();
    if (expectedStage === 3) await capture(page, info, 'launch-stage2-separation');
    await seek(page, event.time + ignitionDelay);
    const burning = await launch(page);
    expect(burning.engine).toBe('on');
    expect(burning.thrust).toBeGreaterThan(500000);
    expect(burning.mass).toBeLessThan(separated.mass);
    expect(burning.pitch).toBeCloseTo((await launchSample(page, burning.time)).pitch, 6);
    await expect(page.getByText(expectedStage === 2 ? 'Stage 1 away. Second stage burning, and the vehicle is pitching downrange.' : 'Stage 2 away. Third stage pushing for orbital velocity.')).toBeVisible();
    if (expectedStage === 2) await capture(page, info, 'launch-stage2');
  }
});

test('a recorded insertion survives review and reload, then pays the launch reward once', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const p = await profile(page);
  await page.locator('[data-launch-result]').click();
  await expect(page.locator('[data-launch-outcome="orbit"]')).toBeVisible();
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  const inserted = await launch(page), done = await saved(page);
  expect(inserted.time).toBeCloseTo(p.summary.duration, 6);
  expect(inserted.engine).toBe('off');
  expect(inserted.thrust).toBe(0);
  expect(done.launchRun.recorded).toBe(true);
  expect(done.launchResult.perigee).toBeGreaterThan(100000);
  expect(done.launchResult.apogee).toBeGreaterThanOrEqual(done.launchResult.perigee);
  expect(done.launchResult.eccentricity).toBeLessThan(0.1);
  expect(done.launchResult.propellantRemaining).toBeGreaterThan(0);
  expect(done.missionXP).toBe(0);
  await expect(page.locator('[data-launch-value="load"]')).toHaveText('0.00 g');
  await capture(page, info, 'launch-cutoff-orbit');
  await page.locator('[data-launch-result]').click();
  const reviewedTime = await seek(page, p.events.maxQ.time);
  const reviewed = await saved(page);
  expect(reviewed.launchResult).toEqual(done.launchResult);
  expect(reviewed.missionXP).toBe(0);
  await mount(page, { moonMission: reviewed });
  expect((await launch(page)).time).toBeCloseTo(reviewedTime, 1);
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  await page.locator('[data-launch-proceed]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.locator('[data-orbit-canvas]')).toBeVisible();
  const orbitSave = await saved(page);
  expect(orbitSave.missionPhase).toBe(2);
  expect(orbitSave.missionXP).toBe(20);
  expect(orbitSave.launchAwarded).toBe(true);
  // Returning to the completed launch cannot farm its reward after the phase lock expires.
  await mount(page, { moonMission: { ...orbitSave, missionPhase: 1 } });
  await page.locator('[data-launch-proceed]').click();
  await expect(page.locator('[data-orbit-canvas]')).toBeVisible();
  expect((await saved(page)).missionXP).toBe(20);
  expect(errors).toEqual([]);
});

test('an old orbit flag with malformed playback cannot bypass the new insertion result', async ({ page }) => {
  await mount(page, seed({ launchStatus: 'orbit', launchRun: { version: 1, time: 'corrupt', recorded: true }, launchResult: {}, launchMaxQ: { altKm: 9.9, velMs: 999 } }));
  await expect(page.locator('[data-launch-instruments]')).toContainText('earlier animation');
  await expect(page.locator('[data-launch-proceed]')).toBeDisabled();
  expect((await launch(page)).time).toBe(-5);
  expect((await saved(page)).launchResult).toBeNull();
  expect((await saved(page)).launchMaxQ, 'the earlier scripted pressure peak is not a measurement from this new launch').toBeNull();
  expect((await saved(page)).missionXP).toBe(0);
  await page.locator('[data-launch-result]').click();
  await expect(page.locator('[data-launch-outcome="orbit"]')).toBeVisible();
  await expect(page.locator('[data-launch-proceed]')).toBeEnabled();
  expect((await saved(page)).missionXP).toBe(0);
  const peak = (await profile(page)).events.maxQ;
  expect((await saved(page)).launchMaxQ.altKm).toBeCloseTo(peak.altitude / 1000, 1);
  expect((await saved(page)).launchMaxQ.velMs).toBeCloseTo(peak.airSpeed, 0);
});

test('paused launch resize and reload preserve physics, and phone controls remain usable', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await mount(page);
  const p = await profile(page);
  await milestone(page, 'stage1', p.events.stage1.time);
  const before = await launch(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => page.locator('[data-launch-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(390);
  await painted(page, '[data-launch-canvas]');
  expect(await launch(page)).toEqual(before);
  const state = await saved(page);
  await mount(page, { moonMission: state });
  expect(await launch(page)).toEqual(before);
  const slider = page.locator('[data-launch-seek]');
  await slider.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await launch(page)).time).toBeGreaterThan(before.time);
  const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
  const boxes = await page.locator('[data-launch-instruments] button, [data-launch-seek], select[aria-label="Launch playback speed"]').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, height: box.height };
  }));
  expect(boxes.length).toBeGreaterThanOrEqual(9);
  for (const box of boxes) { expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(390); expect(box.height).toBeGreaterThanOrEqual(32); }
  await expect(page.locator('[data-launch-instruments] svg[role="img"]')).toHaveCount(2);
  await capture(page, info, 'launch-paused-phone');
  await page.locator('[data-launch-result]').click();
  const complete = await launch(page);
  await page.setViewportSize({ width: 1000, height: 900 });
  await painted(page, '[data-launch-canvas]');
  expect(await launch(page)).toEqual(complete);
});

test('launch playback keeps countdown in real time and supports deliberate pause and speed changes', async ({ page }) => {
  await mount(page, seed({ launchRun: { version: 1, time: -4, recorded: false }, launchPlaybackRate: 60 }));
  await page.locator('[data-launch-pause]').click();
  await expect.poll(async () => (await launch(page)).time).toBeGreaterThan(-3.5);
  await page.locator('[data-launch-pause]').click();
  const countdown = await launch(page);
  expect(countdown.time, '60x playback must not accelerate the final countdown').toBeLessThan(0);
  await page.waitForTimeout(300);
  expect(await launch(page)).toEqual(countdown);
  await milestone(page, 'liftoff', 0);
  await page.getByRole('combobox', { name: 'Launch playback speed', exact: true }).selectOption('10');
  await page.locator('[data-launch-pause]').click();
  await expect.poll(async () => (await launch(page)).time).toBeGreaterThan(2);
  await page.locator('[data-launch-pause]').click();
  const paused = await launch(page);
  await page.waitForTimeout(300);
  expect(await launch(page)).toEqual(paused);
  expect((await saved(page)).launchPlaybackRate).toBe(10);
  expect((await saved(page)).launchPaused).toBe(true);
});

test('orbit instruments obey circular-orbit physics and explicit advance grants no automatic burn', async ({ page }, info) => {
  await mount(page, seed({ missionPhase: 2 }));
  const initial = await orbit(page), r = 6371000 + 185000, mu = 3.986004418e14;
  const speed = Math.sqrt(mu / r), period = 2 * Math.PI * r / speed;
  expect(initial.altitude).toBe(185000);
  expect(initial.speed).toBeCloseTo(speed, 6);
  expect(initial.period).toBeCloseTo(period, 6);
  expect(initial.engine).toBe('off');
  await expect(page.locator('[data-orbit-value="speed"]')).toHaveText((speed / 1000).toFixed(3) + ' km/s');
  await expect(page.locator('[data-orbit-value="period"]')).toHaveText((period / 60).toFixed(2) + ' min');
  await expect(page.locator('[data-orbit-value="gravity"]')).toHaveText((mu / r ** 2).toFixed(2) + ' m/s²');
  await page.waitForTimeout(300); expect(await orbit(page)).toEqual(initial);
  await page.locator('[data-orbit-window-next]').click();
  await expect(page.locator('[data-orbit-canvas]')).toHaveAttribute('data-orbit-window', 'go');
  const aligned = await orbit(page), state = await saved(page);
  expect(aligned.time).toBeGreaterThan(period * 1.35);
  expect(aligned.sunrises).toBeGreaterThanOrEqual(1);
  expect(aligned.engine).toBe('off');
  expect(state.orbitPaused).toBe(true);
  expect(state.animPaused).toBe(true);
  expect(state.tliAccuracy ?? null).toBeNull();
  expect(state.missionXP).toBe(0);
  await page.waitForTimeout(300); expect(await orbit(page)).toEqual(aligned);
  await page.setViewportSize({ width: 390, height: 844 });
  await painted(page, '[data-orbit-canvas]');
  expect(await orbit(page)).toEqual(aligned);
  await capture(page, info, 'orbit-window-phone');
  await mount(page, { moonMission: await saved(page) });
  expect(await orbit(page)).toEqual(aligned);
  await page.getByRole('button', { name: /Execute TLI Burn/ }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(3);
  expect((await saved(page)).tliAccuracy).toMatchObject({ onTime: true, beforeGo: false });
  expect((await saved(page)).missionXP).toBe(25);
});

test('an off-window burn uses the current model position and records the required correction', async ({ page }) => {
  await mount(page, seed({ missionPhase: 2 }));
  const target = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const first = P.orbitSnapshot(0, 360), time = first.nextWindowTime + first.period * 35 / 360;
    return { time, sample: P.orbitSnapshot(time, 360) };
  });
  expect(target.sample.state).toBe('aligning');
  await mount(page, seed({ missionPhase: 2, orbitRun: { version: 1, time: target.time }, tliWindow: { state: 'go', offByDeg: 0, side: 'early' } }));
  await expect(page.locator('[data-orbit-canvas]')).toHaveAttribute('data-orbit-window', 'aligning');
  await page.getByRole('button', { name: /Execute TLI Burn/ }).click();
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(3);
  const state = await saved(page);
  expect(state.tliAccuracy).toMatchObject({ onTime: false, side: 'late', beforeGo: false });
  expect(state.tliAccuracy.offByDeg).toBeCloseTo(target.sample.offByDeg, 6);
  expect(state.missionXP).toBe(10);
  await expect(page.getByRole('button', { name: /Arrive at the Moon/ })).toBeDisabled();
});

for (const phase of ['launch', 'orbit'] as const) test(phase + ' resets its active clock while hidden and resumes without catch-up', async ({ page }) => {
  const data = phase === 'launch'
    ? seed({ animPaused: false, launchPlaybackRate: 1, launchRun: { version: 1, time: 20, recorded: false } })
    : seed({ missionPhase: 2, animPaused: false, orbitPlaybackRate: 1 });
  await mount(page, data);
  const read = () => phase === 'launch' ? launch(page) : orbit(page);
  const start = (await read()).time;
  await expect.poll(async () => (await read()).time).toBeGreaterThan(start + 0.2);
  await page.evaluate(async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
  const hidden = await read(); await page.waitForTimeout(350); expect(await read()).toEqual(hidden);
  const firstVisible = await page.evaluate(async name => {
    delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange'));
    const cv = document.querySelector('[data-' + name + '-canvas]') as HTMLCanvasElement;
    const key = name + 'Time', before = Number(cv.dataset[key]);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    return { before, after: Number(cv.dataset[key]) };
  }, phase);
  expect(firstVisible.after).toBe(firstVisible.before);
  await expect.poll(async () => (await read()).time).toBeGreaterThan(hidden.time + 0.1);
  expect((await saved(page)).missionXP).toBe(0);
});
