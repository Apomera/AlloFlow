import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DOCKING_INSTRUMENT_REPORT_DIR || 'reports/moon-mission-enhancement-pass35-2026-10-09/docking-instruments');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });

async function mount(page: Page, fixture: Record<string, unknown> = {}, checkpoint?: Record<string, unknown>) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(({ fixture, checkpoint }) => {
    document.getElementById('wrap')!.style.width = '100%';
    Math.random = () => 0.999;
    const P = (window as any).MoonMissionPure, summary = P.ascentProfile().summary;
    const data = checkpoint || {
      missionPhase: 7, animPaused: true, soundOff: true, missionXP: 0, missionLog: [],
      earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
      ascentRun: { version: 1, time: summary.duration, recorded: true }, ascentResult: { version: 1, ...summary }, ascentPaused: true,
      dockingRun: { ...P.dockingState(), ...fixture }, dockingPaused: true, dockingGuided: false, dockingResult: null,
    };
    (window as any).__mount({ moonMission: data });
  }, { fixture, checkpoint });
  await expect(page.locator('[data-docking-instruments]')).toBeVisible();
  await expect(page.locator('[data-docking-value="closing"]')).toHaveText(/m\/s$/);
}

async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}

async function inspect(page: Page) {
  return page.locator('[data-docking-instruments]').evaluate(root => {
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    const get = (selector: string) => root.querySelector(selector)!;
    return {
      state: JSON.parse(JSON.stringify((window as any).__toolData.moonMission)),
      title: get('[data-docking-instrument-title]').textContent,
      root: box(root), viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      controls: Array.from(document.querySelectorAll('[data-docking-pause], [data-docking-pulse]')).map(node => ({
        kind: node.hasAttribute('data-docking-pause') ? 'pause' : node.getAttribute('data-docking-pulse'), ...box(node),
      })),
      metrics: Array.from(root.querySelectorAll('[data-docking-instrument]')).map(card => {
        const key = card.getAttribute('data-docking-instrument')!;
        const pick = (attribute: string) => card.querySelector('[' + attribute + ']')! as HTMLElement;
        const track = pick('data-docking-instrument-track'), marker = pick('data-docking-instrument-marker'), band = pick('data-docking-instrument-band');
        const scale = pick('data-docking-instrument-scale'), style = getComputedStyle(marker);
        return { key, within: card.getAttribute('data-docking-within'), reading: pick('data-docking-instrument-reading').textContent,
          status: pick('data-docking-instrument-status').textContent, clipped: pick('data-docking-instrument-clipped').textContent,
          card: box(card), track: box(track), marker: box(marker), band: box(band), scale: box(scale),
          position: parseFloat(marker.style.left), bandStart: parseFloat(band.style.left), bandWidth: parseFloat(band.style.width),
          markerCss: { width: parseFloat(style.width), height: parseFloat(style.height), border: parseFloat(style.borderLeftWidth) },
          scaleTexts: Array.from(scale.children).map(node => node.textContent),
          fonts: Array.from(card.querySelectorAll('h5,p,[data-docking-instrument-scale] span')).map(node => parseFloat(getComputedStyle(node).fontSize)),
        };
      }),
      legacy: Object.fromEntries(Array.from(document.querySelectorAll('[data-docking-value]')).map(node => [node.getAttribute('data-docking-value')!, node.textContent])),
      canvas: (() => { const cv = document.querySelector('[data-docking-canvas]')! as HTMLElement; return { offset: Number(cv.dataset.dockingOffset), closing: Number(cv.dataset.dockingClosingSpeed), status: cv.dataset.dockingStatus }; })(),
    };
  });
}

// Independent expectations from the physical state and the documented contact limits.
function expectedReading(value: number, key: string, limit: number) {
  const digits = key === 'offset' ? 2 : 3, unit = key === 'offset' ? 'm' : 'm/s';
  const magnitude = Math.abs(value), rounded = magnitude.toFixed(digits);
  const amount = magnitude > 0 && Number(rounded) === 0 ? '< ' + (10 ** -digits).toFixed(digits)
    : magnitude > limit && Number(rounded) <= limit ? '> ' + limit.toFixed(digits) : rounded;
  const direction = value === 0 ? key === 'offset' ? 'aligned' : key === 'closing' ? 'no axial motion' : 'no radial motion'
    : key === 'closing' ? value > 0 ? 'closing' : 'separating' : value > 0 ? 'outward' : 'inward';
  return amount + ' ' + unit + ' ' + direction;
}

function verify(snapshot: Awaited<ReturnType<typeof inspect>>) {
  const run = snapshot.state.dockingRun;
  const title = ['docked', 'collision'].includes(run.status) ? 'Recorded contact measurements' : run.status === 'missed' ? 'Final approach measurements' : 'Current approach measurements';
  expect(snapshot.title).toBe(title);
  expect(snapshot.metrics).toHaveLength(3);
  expect(snapshot.documentWidth).toBeLessThanOrEqual(snapshot.viewport + 1);
  expect(snapshot.root.left).toBeGreaterThanOrEqual(0);
  expect(snapshot.root.right).toBeLessThanOrEqual(snapshot.viewport + 0.5);
  expect(snapshot.controls.map(control => control.kind).sort()).toEqual(['approach', 'brake', 'down', 'pause', 'up']);
  for (const control of snapshot.controls) {
    expect(control.width).toBeGreaterThan(0);
    expect(control.height).toBeGreaterThan(0);
    expect(control.bottom).toBeLessThanOrEqual(snapshot.root.top);
  }
  expect(snapshot.canvas.offset).toBe(run.x);
  expect(snapshot.canvas.closing).toBe(run.vy);
  expect(snapshot.canvas.status).toBe(run.status);
  expect(snapshot.legacy.offset).toBe(run.x.toFixed(2) + ' m');
  expect(snapshot.legacy.closing).toBe(run.vy.toFixed(3) + ' m/s');
  expect(snapshot.legacy.lateral).toBe(run.vx.toFixed(3) + ' m/s');
  for (const item of snapshot.metrics) {
    const value = item.key === 'offset' ? run.x : item.key === 'closing' ? run.vy : run.vx;
    const extent = item.key === 'offset' ? 2 : item.key === 'closing' ? 0.4 : 0.3;
    const limit = item.key === 'offset' ? 0.6 : item.key === 'closing' ? 0.2 : 0.1;
    const within = item.key === 'closing' ? value > 0 && value <= limit : Math.abs(value) <= limit;
    const position = Math.max(0, Math.min(100, (value + extent) / (extent * 2) * 100));
    const bandStart = item.key === 'closing' ? 50 : (extent - limit) / (extent * 2) * 100;
    const bandEnd = (extent + limit) / (extent * 2) * 100;
    expect(item.within).toBe(String(within));
    expect(item.status).toBe(within ? 'Within contact limit' : 'Outside contact limit');
    expect(item.reading).toBe(expectedReading(value, item.key, limit));
    // CSSOM serializes percentages to fewer digits than the physical state.
    expect(Math.abs(item.position - position)).toBeLessThanOrEqual(0.0001);
    expect(Math.abs(item.bandStart - bandStart)).toBeLessThanOrEqual(0.0001);
    expect(Math.abs(item.bandWidth - (bandEnd - bandStart))).toBeLessThanOrEqual(0.0001);
    expect(item.clipped).toBe(Math.abs(value) > extent ? 'Outside displayed scale' : 'Fixed display scale');
    expect(item.markerCss).toEqual({ width: 12, height: 12, border: 2 });
    expect(Math.abs((item.marker.left + item.marker.right) / 2 - (item.track.left + position / 100 * item.track.width))).toBeLessThan(0.6);
    expect(item.marker.width).toBeCloseTo(12 * Math.SQRT2, 1);
    expect(item.marker.height).toBeCloseTo(12 * Math.SQRT2, 1);
    expect(Math.abs(item.band.left - (item.track.left + bandStart / 100 * item.track.width))).toBeLessThan(0.6);
    expect(Math.abs(item.band.width - (bandEnd - bandStart) / 100 * item.track.width)).toBeLessThan(0.6);
    for (const region of [item.card, item.track, item.marker, item.scale]) {
      expect(region.left).toBeGreaterThanOrEqual(snapshot.root.left);
      expect(region.right).toBeLessThanOrEqual(snapshot.root.right);
    }
    expect(item.fonts.length).toBeGreaterThanOrEqual(7);
    for (const font of item.fonts) expect(font).toBeGreaterThanOrEqual(12);
    expect(item.scaleTexts).toEqual(['−' + extent.toFixed(item.key === 'offset' ? 0 : 1), '0', '+' + extent.toFixed(item.key === 'offset' ? 0 : 1) + ' ' + (item.key === 'offset' ? 'm' : 'm/s')]);
  }
}

async function capture(page: Page, info: TestInfo, name: string) {
  const snapshot = await inspect(page); verify(snapshot);
  const path = join(REPORT, name + '.png'), data = join(REPORT, name + '.json');
  await page.locator('[data-docking-instruments]').screenshot({ path });
  await writeFile(data, JSON.stringify(snapshot, null, 2));
  await info.attach(name, { path, contentType: 'image/png' });
  await info.attach(name + '-measurements', { path: data, contentType: 'application/json' });
  return snapshot;
}

test.describe.configure({ timeout: 240000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('docking contact instruments preserve signed measurements, exact limits and live control outcomes', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = [], checkpoints: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('crash', () => errors.push('Browser page crashed'));
  const mark = async (name: string) => { checkpoints.push(name); await writeFile(join(REPORT, 'diagnostics.json'), JSON.stringify({ checkpoints, errors }, null, 2)); };
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 844 });
    await mount(page);
    await capture(page, info, 'phone-initial-clipped');
    const paused = await saved(page);
    await page.locator('[data-docking-canvas]').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    expect(await saved(page)).toEqual(paused);
    await page.setViewportSize({ width: 1100, height: 1000 });
    verify(await inspect(page));
    expect(await saved(page)).toEqual(paused);
    await mount(page, {}, paused);
    verify(await inspect(page));
    expect(await saved(page)).toEqual(paused);
    await mark('paused resize, ignored arrows and reload preserve all saved state');

    await mount(page, { x: -0.6, vx: 0.1, vy: 0.2 });
    await capture(page, info, 'desktop-inclusive-boundaries');
    await page.setViewportSize({ width: 320, height: 844 });
    await mount(page, { x: -0.600000001, vx: 0.100000001, vy: 0.200000001 });
    await capture(page, info, 'phone-just-outside-limits');
    await mount(page, { x: 0, vx: 0, vy: 0 });
    verify(await inspect(page));
    await expect(page.locator('[data-docking-instrument-status="closing"]')).toHaveText('Outside contact limit');
    await mount(page, { x: 1e-9, vx: -1e-9, vy: 1e-9 });
    verify(await inspect(page));
    await expect(page.locator('[data-docking-instrument-reading="closing"]')).toHaveText('< 0.001 m/s closing');
    await mount(page, { x: -4, vx: -0.9, vy: -0.8 });
    await capture(page, info, 'phone-separating-clipped');
    await mount(page, { x: 5, y: 0, vx: 0, vy: 0.1, time: 1, status: 'missed' });
    verify(await inspect(page));
    await expect(page.locator('[data-ascent-proceed]')).toBeDisabled();
    await mark('inclusive, just-outside, zero, tiny, separating and missed fixtures');

    await page.setViewportSize({ width: 1100, height: 1000 });
    await mount(page);
    const initial = await saved(page);
    await page.locator('[data-docking-demonstrate]').click();
    await expect(page.locator('[data-docking-canvas]')).toHaveAttribute('data-docking-status', 'docked');
    await expect(page.locator('[data-ascent-proceed]')).toBeEnabled();
    const docked = await capture(page, info, 'desktop-guided-contact');
    expect(docked.state.dockingRun.y).toBe(0);
    expect(docked.state.dockingRun.time).toBeGreaterThan(230);
    expect(docked.state.dockingRun.time).toBeLessThan(280);
    expect(docked.metrics.every(item => item.within === 'true')).toBe(true);
    expect(docked.state.dockingResult.closingSpeed).toBe(docked.state.dockingRun.vy);
    expect(docked.state.dockingRun.propellant).toBeLessThan(initial.dockingRun.propellant);
    expect(docked.state.missionXP).toBe(0);
    await page.waitForTimeout(300);
    expect(await saved(page)).toEqual(docked.state);
    await mount(page, {}, docked.state);
    verify(await inspect(page));
    expect(await saved(page)).toEqual(docked.state);
    await mark('real guided contact, receipt and terminal reload');

    await mount(page, { x: 0, y: -0.03, vx: 0, vy: 0.8, time: 20 });
    const beforeCollision = await saved(page);
    await page.locator('[data-docking-demonstrate]').click();
    await expect(page.locator('[data-docking-canvas]')).toHaveAttribute('data-docking-status', 'collision');
    await expect(page.locator('[data-ascent-proceed]')).toBeDisabled();
    const failed = await capture(page, info, 'desktop-unsafe-contact');
    expect(failed.state.dockingResult).toBeNull();
    expect(failed.state.missionXP).toBe(0);
    expect(failed.metrics.find(item => item.key === 'closing')!.within).toBe('false');
    await page.locator('[data-docking-retry]').click();
    const retry = await saved(page);
    expect(retry.ascentResult).toEqual(beforeCollision.ascentResult);
    expect(retry.ascentRun).toEqual(beforeCollision.ascentRun);
    expect(retry.dockingRun).toMatchObject({ time: 0, x: 8, y: -120, vx: 0, vy: 0.55, propellant: 40, status: 'flying' });
    expect(retry.dockingPaused).toBe(true);
    verify(await inspect(page));
    await mark('unsafe real contact and retry preserve insertion');

    await page.setViewportSize({ width: 320, height: 844 });
    await page.locator('[data-docking-pause]').focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-docking-pulse="approach"]').click();
    await expect.poll(async () => (await saved(page)).dockingRun.propellant).toBeLessThan(39.98);
    await page.locator('[data-docking-canvas]').focus();
    await page.keyboard.press('ArrowDown');
    await expect.poll(async () => (await saved(page)).dockingRun.vx).toBeLessThan(-0.005);
    await expect(page.locator('[data-docking-instrument-reading="drift"]')).toHaveText(/m\/s inward$/);
    await page.locator('[data-docking-pause]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-docking-pause]')).toHaveText('Play docking');
    const controlled = await capture(page, info, 'phone-manual-pulses');
    expect(controlled.state.dockingRun.time).toBeGreaterThan(0);
    expect(controlled.state.dockingRun.propellant).toBeLessThan(39.98);
    expect(controlled.state.dockingRun.ax).toBe(0);
    expect(controlled.state.dockingRun.ay).toBe(0);
    expect(controlled.state.missionXP).toBe(0);
    await page.waitForTimeout(300);
    expect(await saved(page)).toEqual(controlled.state);
    await expect(page.locator('[data-docking-pulse="down"]')).toBeDisabled();
    await mark('button pulse and keyboard radial pulse update instruments, then pause consistently');
    expect(errors).toEqual([]);
  } catch (error) {
    await writeFile(join(REPORT, 'failure.txt'), String(error));
    if (!page.isClosed()) {
      await Promise.race([page.screenshot({ path: join(REPORT, 'failure.png'), timeout: 5000 }).catch(() => {}), new Promise(resolve => setTimeout(resolve, 5500))]);
    }
    throw error;
  } finally {
    await writeFile(join(REPORT, 'diagnostics.json'), JSON.stringify({ checkpoints, errors }, null, 2));
  }
});
