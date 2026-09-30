import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass6-2026-09-29/loi');
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true,
});
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 4, animPaused: true, soundOff: true, missionXP: 0, missionLog: [],
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
  await expect(page.locator('[data-loi-canvas]')).toBeVisible();
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}
async function loi(page: Page) {
  return page.locator('[data-loi-canvas]').evaluate((cv: HTMLCanvasElement) => ({
    time: Number(cv.dataset.loiTime), altitude: Number(cv.dataset.loiAltitude), speed: Number(cv.dataset.loiSpeed),
    radial: Number(cv.dataset.loiRadial), tangential: Number(cv.dataset.loiTangential),
    mass: Number(cv.dataset.loiMass), propellant: Number(cv.dataset.loiPropellant), thrust: Number(cv.dataset.loiThrust),
    engine: cv.dataset.loiEngine, radio: cv.dataset.loiRadio, plume: cv.dataset.loiPlume,
  }));
}
async function profile(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const plan = P.cleanLoiPlayback((window as any).__toolData.moonMission).loiPlan;
    const p = P.loiProfile(plan);
    return { plan, summary: p.summary, events: p.events, firstBurn: p.samples.find((s: any) => s.engineOn) };
  });
}
async function sample(page: Page, time: number) {
  return page.evaluate(seconds => {
    const P = (window as any).MoonMissionPure;
    const plan = P.cleanLoiPlayback((window as any).__toolData.moonMission).loiPlan;
    return P.loiSample(P.loiProfile(plan), seconds);
  }, time);
}
async function seek(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await page.locator('[data-loi-seek]').evaluate((el: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Math.abs((await loi(page)).time - time)).toBeLessThan(0.11);
  return time;
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true });
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.screenshot({ path, fullPage: true });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function painted(page: Page) {
  await expect.poll(async () => page.locator('[data-loi-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, total = 0; const colors = new Set<string>();
    for (let y = 10; y < cv.height; y += 20) for (let x = 10; x < cv.width; x += 20) {
      const i = (y * cv.width + x) * 4; total++;
      if (data[i + 3] > 100) opaque++;
      colors.add(Array.from(data.slice(i, i + 3)).join(','));
    }
    return opaque / total > 0.9 && colors.size > 12;
  }), { message: 'LOI must remain painted when paused or resized' }).toBe(true);
}
async function accessible(page: Page, info: TestInfo) {
  const axePath = resolve('node_modules/axe-core/axe.min.js');
  if (!existsSync(axePath)) return;
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run({ include: [['[data-loi-workspace]']] }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return result.violations.map((item: any) => ({ id: item.id, impact: item.impact, description: item.description,
      targets: item.nodes.flatMap((node: any) => node.target) }));
  });
  await info.attach('loi-accessibility', { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
  expect(violations).toEqual([]);
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('finite SPS burn instruments follow the calculated trajectory and measured capture', async ({ page }, info) => {
  await mount(page);
  await expect(page.locator('[data-loi-proceed]')).toBeDisabled();
  const p = await profile(page);
  expect(p.firstBurn).toBeDefined();
  const burnTime = await seek(page, p.firstBurn.time + 30);
  const live = await loi(page), expected = await sample(page, burnTime);
  expect(live.engine).toBe('on');
  expect(live.plume).toBe('on');
  expect(live.thrust).toBeGreaterThan(50000);
  expect(live.altitude).toBeCloseTo(expected.altitude, 6);
  expect(live.speed).toBeCloseTo(expected.speed, 6);
  expect(live.mass).toBeCloseTo(expected.mass, 6);
  expect(live.propellant).toBeCloseTo(expected.propellant, 6);
  expect(live.thrust).toBeCloseTo(expected.thrust, 6);
  expect(live.radial).toBeCloseTo(expected.radialSpeed, 6);
  expect(live.tangential).toBeCloseTo(expected.tangentialSpeed, 6);
  expect(live.speed).toBeCloseTo(Math.hypot(live.radial, live.tangential), 6);
  await painted(page);
  await capture(page, info, 'loi-sps-burn');
  await page.locator('[data-loi-result]').click();
  await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  const recorded = await saved(page), end = await loi(page);
  expect(recorded.loiRun.recorded).toBe(true);
  expect(recorded.loiResult.perilune).toBeGreaterThanOrEqual(60000);
  expect(recorded.loiResult.apolune).toBeLessThanOrEqual(2000000);
  expect(recorded.loiResult.apolune).toBeGreaterThanOrEqual(recorded.loiResult.perilune);
  expect(end.time).toBeCloseTo(p.summary.duration, 6);
  expect(end.engine).toBe('off'); expect(end.thrust).toBe(0); expect(end.plume).toBe('off');
  expect(end.mass).toBeLessThan(live.mass); expect(end.propellant).toBeGreaterThan(0);
  expect(recorded.missionXP).toBe(0);
  await capture(page, info, 'loi-captured');
});

test('no-burn flyby and overburn cannot unlock descent, and replanning clears the previous outcome', async ({ page }, info) => {
  await mount(page);
  await page.locator('[data-loi-result]').click();
  await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  for (const preset of ['flyby', 'overburn']) {
    await page.locator('[data-loi-preset="' + preset + '"]').click();
    await expect(page.locator('[data-loi-proceed]')).toBeDisabled();
    const changed = await saved(page);
    expect(changed.loiResult).toBeNull(); expect(changed.loiRun.recorded).toBe(false);
    expect(changed.loiRun.time).toBe(0); expect(changed.loiPaused).toBe(true);
    await page.locator('[data-loi-result]').click();
    await expect(page.locator('[data-loi-proceed]')).toBeDisabled();
    const end = await saved(page), p = await profile(page);
    expect(end.loiResult.outcome).toBe(p.summary.outcome);
    expect(end.loiRun.recorded).toBe(true); expect(end.missionXP).toBe(0);
    expect((await loi(page)).engine).toBe('off');
    await capture(page, info, 'loi-' + preset);
  }
  await page.locator('[data-loi-preset="nominal"]').click();
  expect((await saved(page)).loiResult).toBeNull();
  await page.locator('[data-loi-result]').click();
  await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  expect((await saved(page)).missionXP).toBe(0);
});

test('review and reload preserve capture, then undocking rewards the mission once', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await page.locator('[data-loi-result]').click();
  const captured = await saved(page);
  const p = await profile(page);
  await seek(page, p.firstBurn.time + 10);
  const reviewing = await saved(page), readings = await loi(page);
  expect(reviewing.loiResult).toEqual(captured.loiResult); expect(reviewing.loiRun.recorded).toBe(true);
  await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  await mount(page, { moonMission: reviewing });
  expect(await loi(page)).toEqual(readings);
  await page.locator('[data-loi-proceed]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(5);
  const descended = await saved(page);
  expect(descended.missionXP).toBe(15); expect(descended.loiAwarded).toBe(true);
  await mount(page, { moonMission: { ...descended, missionPhase: 4 } });
  await page.locator('[data-loi-proceed]').click();
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(5);
  expect((await saved(page)).missionXP).toBe(15); expect(errors).toEqual([]);
});

test('legacy ready flags and malformed playback cannot bypass the capture gate', async ({ page }) => {
  await mount(page, seed({ orbitStatus: 'ready', loiRun: { version: 1, time: 'corrupt', recorded: true }, loiResult: { outcome: 'captured' } }));
  await expect(page.locator('[data-loi-proceed]')).toBeDisabled();
  expect((await loi(page)).time).toBe(0); expect((await saved(page)).missionXP).toBe(0);
  await page.locator('[data-loi-result]').click();
  await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  expect((await saved(page)).missionXP).toBe(0);
});

test('paused LOI and the Moon atlas remain readable on a 320px keyboard-controlled view', async ({ page }, info) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page);
  const p = await profile(page);
  await seek(page, p.firstBurn.time + 60);
  const fixed = await loi(page), pixels = await page.locator('[data-loi-canvas]').evaluate((cv: HTMLCanvasElement) => cv.toDataURL());
  await page.waitForTimeout(250);
  expect(await loi(page)).toEqual(fixed);
  expect(await page.locator('[data-loi-canvas]').evaluate((cv: HTMLCanvasElement) => cv.toDataURL())).toBe(pixels);
  await page.setViewportSize({ width: 320, height: 844 });
  await expect.poll(async () => page.locator('[data-loi-canvas]').evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  await painted(page);
  expect(await loi(page)).toEqual(fixed);
  await mount(page, { moonMission: await saved(page) });
  expect(await loi(page)).toEqual(fixed);
  const slider = page.locator('[data-loi-seek]');
  await slider.focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await loi(page)).time).toBeGreaterThan(fixed.time);
  const labels = page.locator('[data-moonmission-moon-labels]');
  await labels.focus(); await page.keyboard.press('Enter');
  await expect(labels).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-moonmission-moon-sites] li')).toHaveCount(6);
  await expect(page.locator('[data-lunar-atlas]')).toBeVisible();
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
  const bounds = await page.locator('[data-loi-workspace] button, [data-loi-workspace] select, [data-loi-workspace] input').evaluateAll(nodes => nodes.map(node => {
    const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, height: box.height };
  }));
  for (const box of bounds) { expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(320); expect(box.height).toBeGreaterThanOrEqual(32); }
  await accessible(page, info);
  await capture(page, info, 'loi-paused-320');
  await slider.focus(); await page.keyboard.press('End');
  await expect.poll(async () => (await loi(page)).time).toBeCloseTo(p.summary.duration, 6);
  await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  const completed = await saved(page);
  expect(completed.loiRun.recorded).toBe(true);
  expect(completed.loiResult.outcome).toBe('captured');
  const beforePlan = (await profile(page)).plan;
  await page.locator('[data-loi-duration]').focus(); await page.keyboard.press('ArrowRight');
  const changed = await saved(page);
  expect(changed.loiPlan.burnDuration).toBeGreaterThan(beforePlan.burnDuration);
  expect(changed.loiRun.time).toBe(0); expect(changed.loiRun.recorded).toBe(false); expect(changed.loiResult).toBeNull();
  await expect(page.locator('[data-loi-proceed]')).toBeDisabled();
  expect(changed.missionXP).toBe(0);
});

test('LOI playback resets its clock while hidden and resumes without catch-up', async ({ page }) => {
  await mount(page, seed({ animPaused: false, loiPlaybackRate: 1, loiRun: { version: 1, time: 20, recorded: false } }));
  const start = (await loi(page)).time;
  await expect.poll(async () => (await loi(page)).time).toBeGreaterThan(start + 0.2);
  await page.evaluate(async () => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  });
  const hidden = await loi(page); await page.waitForTimeout(350); expect(await loi(page)).toEqual(hidden);
  const visible = await page.evaluate(async () => {
    delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange'));
    const cv = document.querySelector('[data-loi-canvas]') as HTMLCanvasElement, before = Number(cv.dataset.loiTime);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    return { before, after: Number(cv.dataset.loiTime) };
  });
  expect(visible.after).toBe(visible.before);
  await expect.poll(async () => (await loi(page)).time).toBeGreaterThan(hidden.time + 0.1);
  expect((await saved(page)).missionXP).toBe(0);
});

test('radio loss follows the lunar line of sight and stays consistent across display sizes', async ({ page }, info) => {
  await mount(page);
  const epochs = await page.evaluate(() => {
    const p = (window as any).MoonMissionPure.loiProfile();
    const blocked = p.samples.filter((s: any) => s.engineOn && !s.radioVisible);
    const visible = p.samples.filter((s: any) => s.time > p.events.cutoff.time && s.radioVisible);
    return { blocked: blocked[Math.floor(blocked.length / 2)].time, contact: visible[Math.floor(visible.length / 2)].time };
  });
  for (const [time, radio, text] of [[epochs.blocked, 'blocked', 'Loss of signal'], [epochs.contact, 'contact', 'Earth in view']] as const) {
    const reviewed = await seek(page, time), expected = await sample(page, reviewed);
    expect(expected.radioVisible).toBe(expected.x <= 0 || Math.abs(expected.y) >= 1737400);
    await expect(page.locator('[data-loi-canvas]')).toHaveAttribute('data-loi-radio', radio);
    await expect(page.locator('[data-loi-value="radio"]')).toHaveText(text);
    const before = await loi(page);
    await page.setViewportSize({ width: radio === 'blocked' ? 390 : 1200, height: 900 });
    await painted(page); expect(await loi(page)).toEqual(before);
  }
  expect((await saved(page)).missionXP).toBe(0);
  await capture(page, info, 'loi-radio-reacquired');
});
