import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DOCKING_CLOSEUP_REPORT_DIR || 'reports/moon-mission-enhancement-pass36-2026-10-09/docking-closeup');
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
  await expect(page.getByRole('combobox', { name: 'Docking view', exact: true })).toBeVisible();
  await expect(page.locator('[data-docking-canvas]')).toHaveAttribute('data-docking-view', 'overview');
}

async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}

async function choose(page: Page, view: 'overview' | 'closeup') {
  await page.getByRole('combobox', { name: 'Docking view', exact: true }).selectOption(view);
  await expect(page.locator('[data-docking-canvas]')).toHaveAttribute('data-docking-view', view);
  await expect(page.locator('select[data-docking-view]')).toHaveValue(view);
}

async function inspect(page: Page) {
  return page.locator('[data-docking-canvas]').evaluate(node => {
    const canvas = node as HTMLCanvasElement, d = canvas.dataset;
    const select = document.querySelector('select[data-docking-view]')! as HTMLSelectElement;
    const box = (element: Element) => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
    return {
      state: JSON.parse(JSON.stringify((window as any).__toolData.moonMission)),
      width: canvas.offsetWidth, height: canvas.offsetHeight, backingWidth: canvas.width, backingHeight: canvas.height,
      canvas: box(canvas), select: box(select), selected: select.value, selectFontSize: parseFloat(getComputedStyle(select).fontSize),
      viewport: innerWidth, documentWidth: document.documentElement.scrollWidth,
      view: d.dockingView, scale: Number(d.dockingPictureScale), portX: Number(d.dockingPortX), portY: Number(d.dockingPortY),
      eagleX: Number(d.dockingEaglePortX), eagleY: Number(d.dockingEaglePortY), visible: d.dockingPortVisible,
      indicatorX: Number(d.dockingIndicatorX), indicatorY: Number(d.dockingIndicatorY),
      physical: { x: Number(d.dockingOffset), vy: Number(d.dockingClosingSpeed), propellant: Number(d.dockingPropellant), status: d.dockingStatus },
    };
  });
}

function verify(snapshot: Awaited<ReturnType<typeof inspect>>) {
  const run = snapshot.state.dockingRun;
  expect(snapshot.view).toBe('closeup');
  expect(snapshot.selected).toBe('closeup');
  expect(snapshot.backingWidth).toBe(snapshot.width * 2);
  expect(snapshot.backingHeight).toBe(snapshot.height * 2);
  expect(snapshot.documentWidth).toBeLessThanOrEqual(snapshot.viewport + 1);
  for (const region of [snapshot.canvas, snapshot.select]) {
    expect(region.left).toBeGreaterThanOrEqual(0);
    expect(region.right).toBeLessThanOrEqual(snapshot.viewport + 0.5);
  }
  expect(snapshot.select.height).toBeGreaterThanOrEqual(44);
  expect(snapshot.selectFontSize).toBeGreaterThanOrEqual(12);
  expect(snapshot.select.bottom).toBeLessThanOrEqual(snapshot.canvas.top);
  expect(snapshot.physical).toEqual({ x: run.x, vy: run.vy, propellant: run.propellant, status: run.status });
  // Independent mapping from metres to CSS pixels: a four-metre radial field.
  const left = 32, right = snapshot.width - 24, top = 76, bottom = snapshot.height - 66;
  const scale = (bottom - top) / 4, px = right - scale, py = (top + bottom) / 2;
  const ex = px + run.y * scale, ey = py - run.x * scale;
  expect(snapshot.scale).toBe(scale);
  expect(snapshot.portX).toBe(px);
  expect(snapshot.portY).toBe(py);
  expect(snapshot.eagleX).toBeCloseTo(ex, 10);
  expect(snapshot.eagleY).toBeCloseTo(ey, 10);
  const visible = ex >= left && ex <= right && ey >= top && ey <= bottom;
  expect(snapshot.visible).toBe(String(visible));
  if (visible) {
    expect(snapshot.indicatorX).toBe(snapshot.eagleX);
    expect(snapshot.indicatorY).toBe(snapshot.eagleY);
  } else {
    // The arrow must point along the actual target-to-port ray, never relocate the port.
    const dx = ex - px, dy = ey - py, ix = snapshot.indicatorX - px, iy = snapshot.indicatorY - py;
    expect(Math.abs(ix * dy - iy * dx)).toBeLessThan(1e-6);
    expect(ix * dx + iy * dy).toBeGreaterThan(0);
    expect(Math.hypot(ix, iy)).toBeLessThan(Math.hypot(dx, dy));
    expect(snapshot.indicatorX).toBeGreaterThanOrEqual(left + 10 - 1e-8);
    expect(snapshot.indicatorX).toBeLessThanOrEqual(right - 10 + 1e-8);
    expect(snapshot.indicatorY).toBeGreaterThanOrEqual(top + 10 - 1e-8);
    expect(snapshot.indicatorY).toBeLessThanOrEqual(bottom - 10 + 1e-8);
    expect(Math.min(Math.abs(snapshot.indicatorX - left - 10), Math.abs(snapshot.indicatorX - right + 10), Math.abs(snapshot.indicatorY - top - 10), Math.abs(snapshot.indicatorY - bottom + 10))).toBeLessThan(1e-8);
  }
}

async function capture(page: Page, info: TestInfo, name: string) {
  const snapshot = await inspect(page); verify(snapshot);
  const path = join(REPORT, name + '.png'), data = join(REPORT, name + '.json');
  await page.locator('[data-docking-canvas]').screenshot({ path });
  await writeFile(data, JSON.stringify(snapshot, null, 2));
  await info.attach(name, { path, contentType: 'image/png' });
  await info.attach(name + '-geometry', { path: data, contentType: 'application/json' });
  return snapshot;
}

async function accessibility(page: Page, info: TestInfo, name: string) {
  const axePath = resolve('node_modules/axe-core/axe.min.js');
  if (!existsSync(axePath)) {
    await writeFile(join(REPORT, name + '.json'), JSON.stringify({ status: 'not-installed', violations: null }, null, 2));
    return;
  }
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const result = await (window as any).axe.run({ include: [['[data-ascent-workspace]']] }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    });
    return result.violations.map((item: any) => ({ id: item.id, impact: item.impact, description: item.description,
      targets: item.nodes.flatMap((node: any) => node.target) }));
  });
  const path = join(REPORT, name + '.json');
  await writeFile(path, JSON.stringify({ status: 'completed', scope: '[data-ascent-workspace]', violations }, null, 2));
  await info.attach(name, { path, contentType: 'application/json' });
  expect(violations).toEqual([]);
}

test.describe.configure({ timeout: 240000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('docking port close-up preserves physical geometry, saved state and uninterrupted control outcomes', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = [], checkpoints: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('crash', () => errors.push('Browser page crashed'));
  const mark = async (name: string) => { checkpoints.push(name); await writeFile(join(REPORT, 'diagnostics.json'), JSON.stringify({ checkpoints, errors }, null, 2)); };
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 320, height: 844 });
    await mount(page);
    const paused = await saved(page);
    await choose(page, 'closeup');
    await capture(page, info, 'phone-offscreen-approach');
    await accessibility(page, info, 'phone-closeup-accessibility');
    await page.locator('[data-docking-canvas]').focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);
    expect(await saved(page)).toEqual(paused);
    await choose(page, 'overview');
    expect(await saved(page)).toEqual(paused);
    await choose(page, 'closeup');
    const phoneWidth = (await inspect(page)).width;
    await page.setViewportSize({ width: 1100, height: 1000 });
    await expect.poll(async () => (await inspect(page)).width).toBeGreaterThan(phoneWidth);
    await capture(page, info, 'desktop-offscreen-approach');
    expect(await saved(page)).toEqual(paused);
    await mount(page, {}, paused);
    await expect(page.locator('select[data-docking-view]')).toHaveValue('overview');
    expect(await saved(page)).toEqual(paused);
    await mark('paused view switching, ignored arrows, resize and reload preserve every saved field');

    await page.setViewportSize({ width: 320, height: 844 });
    await mount(page, { x: 0.6, y: -1, vx: 0, vy: 0.1 });
    await choose(page, 'closeup');
    const boundary = await capture(page, info, 'phone-contact-corridor');
    expect(boundary.visible).toBe('true');
    expect(boundary.portY - boundary.eagleY).toBeCloseTo(0.6 * boundary.scale, 10);
    await page.setViewportSize({ width: 1100, height: 1000 });
    await expect.poll(async () => (await inspect(page)).width).toBeGreaterThan(boundary.width);
    await capture(page, info, 'desktop-contact-corridor');
    await accessibility(page, info, 'desktop-closeup-accessibility');
    await mark('near-port geometry retains a 0.60 m corridor and equal axes on phone and desktop');

    await mount(page);
    await choose(page, 'closeup');
    const initial = await saved(page);
    await page.locator('[data-docking-demonstrate]').click();
    await expect(page.locator('[data-docking-canvas]')).toHaveAttribute('data-docking-status', 'docked');
    await expect(page.locator('[data-ascent-proceed]')).toBeEnabled();
    const docked = await capture(page, info, 'desktop-guided-contact');
    expect(docked.state.dockingRun.y).toBe(0);
    expect(docked.eagleX).toBe(docked.portX);
    expect(docked.state.dockingRun.time).toBeGreaterThan(230);
    expect(docked.state.dockingRun.time).toBeLessThan(280);
    expect(docked.state.dockingRun.propellant).toBeLessThan(initial.dockingRun.propellant);
    expect(docked.state.dockingResult.closingSpeed).toBe(docked.state.dockingRun.vy);
    expect(docked.state.missionXP).toBe(0);
    await choose(page, 'overview');
    await choose(page, 'closeup');
    await page.waitForTimeout(300);
    expect(await saved(page)).toEqual(docked.state);
    await mount(page, {}, docked.state);
    expect(await saved(page)).toEqual(docked.state);
    await choose(page, 'closeup');
    verify(await inspect(page));
    await mark('real guided contact records the same receipt and remains unchanged across views and reload');

    await page.setViewportSize({ width: 320, height: 844 });
    await mount(page, { x: 0, y: -0.03, vx: 0, vy: 0.8, time: 20 });
    await choose(page, 'closeup');
    const beforeCollision = await saved(page);
    await page.locator('[data-docking-demonstrate]').click();
    await expect(page.locator('[data-docking-canvas]')).toHaveAttribute('data-docking-status', 'collision');
    await expect(page.locator('[data-ascent-proceed]')).toBeDisabled();
    const failed = await capture(page, info, 'phone-unsafe-contact');
    expect(failed.state.dockingResult).toBeNull();
    expect(failed.state.missionXP).toBe(0);
    await page.locator('[data-docking-retry]').click();
    await expect(page.locator('[data-docking-canvas]')).toHaveAttribute('data-docking-status', 'flying');
    await expect(page.locator('select[data-docking-view]')).toHaveValue('closeup');
    const retry = await saved(page);
    expect(retry.ascentResult).toEqual(beforeCollision.ascentResult);
    expect(retry.ascentRun).toEqual(beforeCollision.ascentRun);
    expect(retry.dockingRun).toMatchObject({ time: 0, x: 8, y: -120, vx: 0, vy: 0.55, propellant: 40, status: 'flying' });
    expect(retry.dockingPaused).toBe(true);
    verify(await inspect(page));
    await mark('unsafe contact remains blocked; retry preserves insertion and the selected close-up');

    await choose(page, 'overview');
    const expectedPropellant = await page.evaluate(() => {
      const P = (window as any).MoonMissionPure;
      return P.dockingStep((window as any).__toolData.moonMission.dockingRun, 1, { y: 0.2 }).propellant;
    });
    await page.locator('[data-docking-pause]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-docking-pulse="approach"]')).toBeEnabled();
    // Dispatch both public DOM events before another animation frame can run.
    // This checks queued pulse preservation, not independent clock continuity.
    await page.evaluate(() => {
      const button = document.querySelector('[data-docking-pulse="approach"]') as HTMLButtonElement;
      if (button.disabled) throw new Error('Pulse button disabled');
      button.click();
      const select = document.querySelector('select[data-docking-view]') as HTMLSelectElement;
      select.value = 'closeup';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(page.locator('[data-docking-canvas]')).toHaveAttribute('data-docking-view', 'closeup');
    await expect(page.locator('select[data-docking-view]')).toHaveValue('closeup');
    // Switching view must retain the complete queued one-second burn.
    await expect.poll(async () => (await saved(page)).dockingRun.propellant).toBeLessThan(expectedPropellant + 1e-7);
    await page.waitForTimeout(300);
    await page.locator('[data-docking-pause]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-docking-pause]')).toHaveText('Play docking');
    const controlled = await capture(page, info, 'phone-pulse-after-view-switch');
    expect(controlled.state.dockingRun.propellant).toBeCloseTo(expectedPropellant, 7);
    expect(controlled.state.dockingRun.time).toBeGreaterThanOrEqual(1);
    expect(controlled.state.dockingRun.ay).toBe(0);
    expect(controlled.state.dockingRun.ax).toBe(0);
    expect(controlled.state.missionXP).toBe(0);
    await page.waitForTimeout(300);
    expect(await saved(page)).toEqual(controlled.state);
    await mark('synchronous DOM view change preserves the queued one-second pulse and its full fuel use; keyboard pause freezes state');
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
