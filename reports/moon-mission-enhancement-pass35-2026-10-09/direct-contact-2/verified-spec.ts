import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve('reports/moon-mission-enhancement-pass5-2026-09-29/ascent');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true,
});
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 7, animPaused: true, soundOff: true, missionXP: 0, missionLog: [],
  earnedBadges: { first_step: true, mission_complete: true },
  difficulty: 'pilot', lunarSamples: [], quizCorrect: 0, ...extra,
} });

async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => {
    document.getElementById('wrap')!.style.width = '100%';
    Math.random = () => 0.999;
    (window as any).__mount(value);
  }, data);
  await expect(page.locator('[data-ascent-canvas]')).toBeVisible();
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}
async function ascent(page: Page) {
  return page.locator('[data-ascent-canvas]').evaluate((cv: HTMLCanvasElement) => ({
    time: Number(cv.dataset.ascentTime), altitude: Number(cv.dataset.ascentAltitude),
    speed: Number(cv.dataset.ascentSpeed), radialSpeed: Number(cv.dataset.ascentVertical),
    tangentialSpeed: Number(cv.dataset.ascentHorizontal), mass: Number(cv.dataset.ascentMass),
    propellant: Number(cv.dataset.ascentPropellant), thrust: Number(cv.dataset.ascentThrust),
    engine: cv.dataset.ascentEngine, phase: cv.dataset.ascentPhase,
  }));
}
async function profile(page: Page) {
  return page.evaluate(() => {
    const p = (window as any).MoonMissionPure.ascentProfile();
    return { events: p.events, summary: p.summary };
  });
}
async function sample(page: Page, seconds: number) {
  return page.evaluate(time => {
    const P = (window as any).MoonMissionPure;
    return P.ascentSample(P.ascentProfile(), time);
  }, seconds);
}
async function docking(page: Page) {
  return page.locator('[data-docking-canvas]').evaluate((cv: HTMLCanvasElement) => ({
    range: Number(cv.dataset.dockingRange), offset: Number(cv.dataset.dockingOffset),
    closingSpeed: Number(cv.dataset.dockingClosingSpeed), propellant: Number(cv.dataset.dockingPropellant),
    status: cv.dataset.dockingStatus,
  }));
}
async function toDocking(page: Page) {
  await page.locator('[data-ascent-complete-review]').click();
  await page.locator('[data-ascent-to-docking]').click();
  await expect(page.locator('[data-docking-canvas]')).toBeVisible();
}
async function seek(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await page.locator('[data-ascent-seek]').evaluate((el: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Math.abs((await ascent(page)).time - time)).toBeLessThan(0.11);
  return time;
}
async function painted(page: Page) {
  await expect.poll(async () => page.locator('[data-ascent-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, total = 0; const colors = new Set<string>();
    for (let y = 10; y < cv.height; y += 20) for (let x = 10; x < cv.width; x += 20) {
      const i = (y * cv.width + x) * 4; total++;
      if (data[i + 3] > 100) opaque++;
      colors.add(Array.from(data.slice(i, i + 3)).join(','));
    }
    return opaque / total > 0.9 && colors.size > 12;
  }), { message: 'The paused or resized ascent canvas should remain painted' }).toBe(true);
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

test('powered lunar ascent instruments follow thrust, mass loss and the computed orbit', async ({ page }, info) => {
  await mount(page);
  await expect(page.locator('[data-ascent-proceed]')).toBeDisabled();
  const p = await profile(page);
  await seek(page, 120);
  const burning = await ascent(page), expected = await sample(page, 120);
  expect(burning.engine).toBe('on');
  expect(burning.altitude).toBeCloseTo(expected.altitude, 6);
  expect(burning.speed).toBeCloseTo(expected.speed, 6);
  expect(burning.mass).toBeCloseTo(expected.mass, 6);
  expect(burning.propellant).toBeCloseTo(expected.propellant, 6);
  expect(burning.thrust).toBeCloseTo(expected.thrust, 6);
  expect(burning.radialSpeed).toBeCloseTo(expected.radialSpeed, 6);
  expect(burning.tangentialSpeed).toBeCloseTo(expected.tangentialSpeed, 6);
  expect(burning.speed).toBeCloseTo(Math.hypot(burning.radialSpeed, burning.tangentialSpeed), 6);
  await painted(page);
  await capture(page, info, 'ascent-powered');
  await page.locator('[data-ascent-complete-review]').click();
  const cutoff = await ascent(page);
  expect(cutoff.time).toBeCloseTo(p.summary.duration, 6);
  expect(cutoff.engine).toBe('off');
  expect(cutoff.thrust).toBe(0);
  expect(cutoff.mass).toBeLessThan(burning.mass);
  expect(cutoff.propellant).toBeGreaterThan(0);
  expect(cutoff.propellant).toBeCloseTo(p.summary.propellantRemaining, 6);
  expect(cutoff.altitude).toBeCloseTo(p.summary.cutoffAltitude, 6);
  expect(cutoff.speed).toBeCloseTo(p.summary.cutoffSpeed, 6);
  await expect(page.locator('[data-ascent-proceed]')).toBeDisabled();
  expect((await saved(page)).missionXP).toBe(0);
  await capture(page, info, 'ascent-insertion');
});

test('a paused ascent preserves physical readings through resize, review and reload', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await mount(page);
  await seek(page, 240);
  const before = await ascent(page);
  const firstPixels = await page.locator('[data-ascent-canvas]').evaluate((cv: HTMLCanvasElement) => cv.toDataURL());
  await page.waitForTimeout(300);
  expect(await ascent(page)).toEqual(before);
  expect(await page.locator('[data-ascent-canvas]').evaluate((cv: HTMLCanvasElement) => cv.toDataURL()), 'A paused scene should not flicker').toBe(firstPixels);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => page.locator('[data-ascent-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(390);
  await painted(page);
  expect(await ascent(page)).toEqual(before);
  const checkpoint = await saved(page);
  await mount(page, { moonMission: checkpoint });
  expect(await ascent(page)).toEqual(before);
  const slider = page.locator('[data-ascent-seek]');
  await slider.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await ascent(page)).time).toBeGreaterThan(before.time);
  const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
  const boxes = await page.locator('[data-ascent-workspace] button, [data-ascent-seek], select[aria-label="Ascent playback speed"]').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, height: box.height };
  }));
  expect(boxes.length).toBeGreaterThanOrEqual(3);
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(390); expect(box.height).toBeGreaterThanOrEqual(32);
  }
  await capture(page, info, 'ascent-paused-phone');
});

test('an old docked flag and malformed saved ascent cannot authorize the return burn', async ({ page }) => {
  await mount(page, seed({ ascentStatus: 'docked', ascentRun: { version: 1, time: 'corrupt', recorded: true }, ascentResult: {} }));
  await expect(page.locator('[data-ascent-proceed]')).toBeDisabled();
  expect((await saved(page)).ascentResult).toBeNull();
  expect((await saved(page)).missionXP).toBe(0);
  const initial = await ascent(page); await page.waitForTimeout(250);
  expect(await ascent(page)).toEqual(initial);
});

test('ascent resets its active clock while hidden and resumes without catch-up', async ({ page }) => {
  await mount(page, seed({ animPaused: false, ascentPlaybackRate: 1, ascentRun: { version: 1, time: 20, recorded: false } }));
  const start = (await ascent(page)).time;
  await expect.poll(async () => (await ascent(page)).time).toBeGreaterThan(start + 0.2);
  await page.evaluate(async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
  const hidden = await ascent(page); await page.waitForTimeout(350); expect(await ascent(page)).toEqual(hidden);
  const firstVisible = await page.evaluate(async () => {
    delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange'));
    const cv = document.querySelector('[data-ascent-canvas]') as HTMLCanvasElement;
    const before = Number(cv.dataset.ascentTime);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    return { before, after: Number(cv.dataset.ascentTime) };
  });
  expect(firstVisible.after).toBe(firstVisible.before);
  await expect.poll(async () => (await ascent(page)).time).toBeGreaterThan(hidden.time + 0.1);
  expect((await saved(page)).missionXP).toBe(0);
});

test('a separate guided docking exercise works with reduced motion and earns TEI only once', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await mount(page);
  await expect(page.locator('[data-ascent-to-docking]')).toBeDisabled();
  await toDocking(page);
  const initial = await docking(page);
  expect(initial.status).toBe('flying');
  expect(initial.range).toBeGreaterThanOrEqual(120);
  expect(initial.range).toBeLessThan(121);
  expect(initial.offset).toBe(8);
  expect(initial.closingSpeed).toBe(0.55);
  expect((await saved(page)).missionXP).toBe(0);
  await expect(page.locator('[data-ascent-proceed]')).toBeDisabled();
  await page.locator('[data-docking-demonstrate]').click();
  await expect(page.locator('[data-docking-canvas]')).toHaveAttribute('data-docking-status', 'docked');
  const contacted = await docking(page), state = await saved(page);
  expect(contacted.closingSpeed).toBeGreaterThan(0);
  expect(contacted.closingSpeed).toBeLessThanOrEqual(0.2);
  expect(Math.abs(contacted.offset)).toBeLessThanOrEqual(0.6);
  expect(contacted.propellant).toBeGreaterThan(0);
  expect(contacted.propellant).toBeLessThan(initial.propellant);
  expect(state.dockingResult.closingSpeed).toBeCloseTo(contacted.closingSpeed, 6);
  expect(state.missionXP).toBe(0);
  await expect(page.locator('[data-ascent-proceed]')).toBeEnabled();
  await page.waitForTimeout(200); expect(await docking(page)).toEqual(contacted);
  await capture(page, info, 'docking-guided-phone');
  const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  expect(overflow.scroll).toBeLessThanOrEqual(overflow.width + 1);
  await mount(page, { moonMission: state });
  expect(await docking(page)).toEqual(contacted);
  await page.locator('[data-ascent-proceed]').evaluate((el: HTMLButtonElement) => { el.click(); el.click(); });
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(8);
  const returning = await saved(page);
  expect(returning.missionXP).toBe(15); expect(returning.ascentAwarded).toBe(true);
  await mount(page, { moonMission: { ...returning, missionPhase: 7 } });
  await page.locator('[data-ascent-proceed]').click();
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(8);
  expect((await saved(page)).missionXP).toBe(15);
  expect(errors).toEqual([]);
});

test('fast contact refuses docking and retry preserves insertion while resetting the exercise', async ({ page }, info) => {
  await mount(page);
  await toDocking(page);
  const state = await saved(page);
  await mount(page, { moonMission: { ...state, dockingRun: { ...state.dockingRun, time: 20, x: 0, y: -0.03, vx: 0, vy: 0.8 } } });
  await page.locator('[data-docking-demonstrate]').click();
  await expect(page.locator('[data-docking-canvas]')).toHaveAttribute('data-docking-status', 'collision');
  await expect(page.locator('[data-ascent-proceed]')).toBeDisabled();
  const failed = await saved(page);
  expect(failed.dockingResult).toBeNull(); expect(failed.missionXP).toBe(0);
  await capture(page, info, 'docking-fast-contact');
  await page.locator('[data-docking-retry]').click();
  const retry = await saved(page);
  expect(retry.ascentResult).toEqual(state.ascentResult);
  expect(retry.ascentRun.recorded).toBe(true);
  expect(retry.dockingRun.time).toBe(0);
  expect(retry.dockingRun.y).toBe(-120);
  expect(retry.dockingRun.x).toBe(8);
  expect(retry.dockingRun.propellant).toBe(40);
  expect(retry.dockingRun.status).toBe('flying');
  expect(retry.dockingPaused).toBe(true); expect(retry.dockingResult).toBeNull();
  await page.locator('[data-docking-demonstrate]').click();
  await expect(page.locator('[data-ascent-proceed]')).toBeEnabled();
  expect((await saved(page)).missionXP).toBe(0);
});

test('precision thrusters use fuel while playing, then the spacecraft coasts without a held command', async ({ page }, info) => {
  await mount(page);
  await toDocking(page);
  await expect(page.locator('[data-docking-pulse="approach"]')).toBeDisabled();
  const initial = await saved(page);
  await page.locator('[data-docking-pause]').click();
  await expect(page.locator('[data-docking-pulse="approach"]')).toBeEnabled();
  const started = (await saved(page)).dockingRun.time;
  await page.locator('[data-docking-pulse="approach"]').click();
  await expect.poll(async () => (await docking(page)).propellant).toBeLessThan(39.98);
  await expect.poll(async () => (await saved(page)).dockingRun.time).toBeGreaterThan(started + 2);
  const ended = await docking(page);
  await expect.poll(async () => (await docking(page)).range).toBeLessThan(ended.range);
  const coast = await docking(page);
  expect(coast.propellant).toBeCloseTo(ended.propellant, 8);
  expect(coast.range).toBeLessThan(ended.range);
  expect(coast.closingSpeed).toBeGreaterThan(initial.dockingRun.vy);
  await page.locator('[data-docking-pause]').click();
  const stopped = await docking(page);
  await page.waitForTimeout(250); expect(await docking(page)).toEqual(stopped);
  await expect(page.locator('[data-docking-pulse="brake"]')).toBeDisabled();
  expect((await saved(page)).missionXP).toBe(0);
  await capture(page, info, 'docking-manual');
});

test('docking pause, resize, reload and hidden-tab transitions keep one physical clock', async ({ page }) => {
  await mount(page);
  await toDocking(page);
  const initial = await docking(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => page.locator('[data-docking-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(390);
  expect(await docking(page)).toEqual(initial);
  const checkpoint = await saved(page);
  await mount(page, { moonMission: checkpoint });
  expect(await docking(page)).toEqual(initial);
  await page.locator('[data-docking-pause]').click();
  await expect.poll(async () => (await saved(page)).dockingRun.time).toBeGreaterThan(0.2);
  await page.evaluate(async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
  const hidden = await docking(page), state = await saved(page);
  await page.waitForTimeout(350); expect(await docking(page)).toEqual(hidden);
  expect((await saved(page)).dockingRun.time).toBe(state.dockingRun.time);
  const visible = await page.evaluate(async () => {
    delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange'));
    const cv = document.querySelector('[data-docking-canvas]') as HTMLCanvasElement;
    const before = cv.dataset.dockingRange;
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    return { before, after: cv.dataset.dockingRange };
  });
  expect(visible.after).toBe(visible.before);
  await expect.poll(async () => (await saved(page)).dockingRun.time).toBeGreaterThan(state.dockingRun.time + 0.1);
  expect((await saved(page)).missionXP).toBe(0);
});

test('320px keyboard docking ignores paused arrows, burns deliberately and pauses from the keyboard', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await mount(page);
  await toDocking(page);
  const canvas = page.locator('[data-docking-canvas]');
  const initial = await docking(page), savedInitial = await saved(page);
  await canvas.focus();
  await expect(canvas).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(250);
  expect(await docking(page)).toEqual(initial);
  expect((await saved(page)).dockingRun.time).toBe(savedInitial.dockingRun.time);
  await page.locator('[data-docking-pause]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-docking-pulse="down"]')).toBeEnabled();
  await canvas.focus();
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await docking(page)).propellant).toBeLessThan(initial.propellant - 0.01);
  await expect.poll(async () => (await saved(page)).dockingRun.vx).toBeLessThan(-0.005);
  await expect(page.locator('[data-docking-value="lateral"]')).toHaveText(/^-\d+\.\d+ m\/s$/);
  const pause = page.locator('[data-docking-pause]');
  await pause.focus();
  await page.keyboard.press('Enter');
  await expect(pause).toHaveText('Play docking');
  const stopped = await docking(page), savedStopped = await saved(page);
  expect(savedStopped.dockingRun.ax).toBe(0);
  expect(savedStopped.dockingRun.ay).toBe(0);
  await page.waitForTimeout(300);
  expect(await docking(page)).toEqual(stopped);
  expect((await saved(page)).dockingRun.time).toBe(savedStopped.dockingRun.time);
  await expect(page.locator('[data-docking-pulse="down"]')).toBeDisabled();
  expect((await saved(page)).missionXP).toBe(0);
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
  const bounds = await page.locator('[data-ascent-workspace] button, [data-ascent-workspace] select, [data-ascent-seek]').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(); return { left: box.left, right: box.right };
  }));
  for (const box of bounds) { expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(320); }
  const axePath = resolve('node_modules/axe-core/axe.min.js');
  if (existsSync(axePath)) {
    await page.addScriptTag({ path: axePath });
    const violations = await page.evaluate(async () => {
      const result = await (window as any).axe.run({ include: [['[data-ascent-workspace]']] }, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      });
      return result.violations.map((item: any) => ({ id: item.id, impact: item.impact, description: item.description,
        targets: item.nodes.flatMap((node: any) => node.target) }));
    });
    await info.attach('ascent-docking-accessibility', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
    expect(violations).toEqual([]);
  }
  await capture(page, info, 'docking-keyboard-320');
});
