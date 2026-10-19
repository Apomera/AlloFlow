import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('reports/avian-activities-round3-2026-10-18/final');
const harness = new GlHarness({ toolId: 'birdLab', toolFile: 'stem_lab/stem_tool_birdlab.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1280, height: 960, appStyles: true, layout: 'document' });
test.use({ video: 'off' });
test.describe.configure({ timeout: 90_000, retries: 0, mode: 'serial' });
test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mount(page: Page, view: string, width = 1280, hostWidth = width) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await harness.mount(page, { birdLab: { view, blXp: 23, blBadges: {}, blLifeList: {} } }, undefined, { expectCanvas: false });
  await page.locator('#wrap').evaluate((element, width) => {
    (element as HTMLElement).style.width = `${width}px`;
    element.setAttribute('data-stem-tool-shell', 'true');
  }, hostWidth);
  return errors;
}
async function rewards(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__toolData.birdLab;
    return { xp: d.blXp, badges: d.blBadges, lifeList: d.blLifeList };
  });
}
async function hostRerender(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__toolData.birdLab.qaUnrelatedRender = 1;
    w.__rerender();
  });
}

test('binocular controls change the real drawing and preserve independent optics relationships', async ({ page }) => {
  const errors = await mount(page, 'optics');
  const before = await rewards(page);
  const zoom = page.locator('[data-optics-zoom]');
  const field = page.locator('[data-optics-field]');
  const pupil = page.locator('[data-optics-exit-pupil]');
  const initialField = Number(await field.getAttribute('data-optics-field'));
  const initialScale = await zoom.evaluate(el => (el as SVGGraphicsElement).transform.baseVal.consolidate()!.matrix.a);
  await page.getByRole('button', { name: '10 × 42', exact: true }).click();
  await expect(zoom).toHaveAttribute('data-optics-zoom', '10');
  await expect(pupil).toHaveAttribute('data-optics-exit-pupil', '4.200');
  const magnifiedScale = await zoom.evaluate(el => (el as SVGGraphicsElement).transform.baseVal.consolidate()!.matrix.a);
  expect(magnifiedScale / initialScale).toBeCloseTo(10 / 8, 3);
  const smallerField = Number(await field.getAttribute('data-optics-field'));
  expect(smallerField / initialField).toBeCloseTo(8 / 10, 3);
  await page.locator('#birdlab-optics-objective').focus();
  await page.keyboard.press('End');
  await expect(pupil).toHaveAttribute('data-optics-exit-pupil', '5.000');
  expect(Number(await field.getAttribute('data-optics-field'))).toBe(smallerField);
  await page.getByRole('button', { name: 'Low light · 6 mm', exact: true }).click();
  await expect(page.getByRole('img', { name: /gold exit pupil/ })).toHaveAccessibleName(/6 millimeters/);
  await hostRerender(page);
  await expect(page.locator('#birdlab-optics-mag')).toHaveValue('10');
  await expect(page.locator('#birdlab-optics-objective')).toHaveValue('50');
  await expect(pupil).toHaveAttribute('data-optics-exit-pupil', '5.000');
  expect(await rewards(page)).toEqual(before);
  expect(errors).toEqual([]);
});

for (const width of [1280, 390]) {
  test(`shutter, subject, framing, and immutable comparison frames at ${width}px`, async ({ page }) => {
    const errors = await mount(page, 'photo', width);
    const before = await rewards(page);
    const live = page.locator('[data-photo-frame="birdlab-photo-live"]');
    const shutter = page.locator('#birdlab-photo-shutter');
    await shutter.focus();
    await page.keyboard.press('Home');
    await expect(live).toHaveAttribute('data-shutter', '60');
    const slowSmear = Number(await live.getAttribute('data-smear'));
    await page.getByRole('button', { name: 'Capture comparison frame', exact: true }).click();
    await shutter.focus();
    await page.keyboard.press('End');
    await expect(live).toHaveAttribute('data-shutter', '2000');
    expect(Number(await live.getAttribute('data-smear'))).toBeLessThan(slowSmear / 20);
    await page.locator('#birdlab-photo-position').focus();
    await page.keyboard.press('End');
    await expect(live).toHaveAttribute('data-position', '75');
    await page.getByRole('checkbox', { name: 'Rule-of-thirds guide' }).uncheck();
    await expect(page.getByRole('checkbox', { name: 'Rule-of-thirds guide' })).not.toBeChecked();
    await page.getByRole('button', { name: 'Capture comparison frame', exact: true }).click();
    await expect(page.locator('[data-photo-capture]')).toHaveCount(2);
    const first = page.locator('[data-photo-capture="1"] svg');
    await expect(first).toHaveAttribute('data-shutter', '60');
    await expect(first).toHaveAttribute('data-position', '33');
    await page.getByRole('button', { name: 'Perched robin', exact: true }).click();
    await expect(live).toHaveAttribute('data-smear', '0.00');
    await hostRerender(page);
    await expect(live).toHaveAttribute('data-shutter', '2000');
    await expect(first).toHaveAttribute('data-shutter', '60');
    await page.locator('[data-birdlab-photo-workbench]').screenshot({ path: resolve(output, `bird-photo-comparison-${width}.png`) });
    await page.getByRole('button', { name: 'Capture comparison frame', exact: true }).click();
    await expect(page.locator('[data-photo-capture="1"]')).toHaveCount(0);
    await expect(page.locator('[data-photo-capture]')).toHaveCount(2);
    await expect(page.locator('[data-photo-capture-status]')).toContainText('Frame 3 captured');
    expect(await rewards(page)).toEqual(before);
    expect(errors).toEqual([]);
  });
}

test('both equipment workbenches stack inside a 500px desktop pane', async ({ page }) => {
  const errors = await mount(page, 'optics', 1280, 500);
  for (const view of ['optics', 'photo']) {
    if (view === 'photo') {
      // BirdLab owns its current view in local state; changing host data alone
      // would keep testing the optics screen a second time.
      await mount(page, 'photo', 1280, 500);
    }
    await expect(page.locator(`[data-birdlab-${view}-workbench]`)).toBeVisible();
    const picture = await page.locator('.birdlab-equipment-view').boundingBox();
    const controls = await page.locator('.birdlab-equipment-panel').boundingBox();
    expect(picture!.width).toBeGreaterThan(300);
    expect(controls!.y).toBeGreaterThanOrEqual(picture!.y + picture!.height);
    expect(await page.locator('#wrap').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(501);
  }
  expect(errors).toEqual([]);
});

test('all ten flight styles support manual inspection and hovering separates body position from wing motion', async ({ page }) => {
  const errors = await mount(page, 'flightPatterns', 390);
  const before = await rewards(page);
  const bench = page.locator('[data-birdlab-flight-workbench]');
  const body = page.locator('[data-flight-body]');
  const phase = page.locator('#birdlab-flight-phase');
  await expect(bench).toHaveAttribute('data-flight-playing', 'false');
  for (const kind of ['soar', 'direct', 'bound', 'hover', 'glide', 'dive', 'erratic', 'plow', 'dart', 'slowflap']) {
    const choice = page.locator(`[data-flight-style="${kind}"]`);
    await choice.focus();
    await page.keyboard.press('Enter');
    await expect(choice).toBeFocused();
    await expect(bench).toHaveAttribute('data-birdlab-flight-workbench', kind);
    await expect(body).toHaveAttribute('data-flight-phase', '0.0');
    const initialWing = await body.locator('[data-flight-wing-pose]').getAttribute('data-flight-wing-pose');
    await phase.focus();
    await page.keyboard.press('PageUp');
    await expect(body).toHaveAttribute('data-flight-phase', '100.0');
    await expect(bench).toHaveAttribute('data-flight-playing', 'false');
    if (kind === 'hover') {
      await expect(body).toHaveAttribute('data-flight-body-x', '320.000');
      await expect(body).toHaveAttribute('data-flight-body-y', '155.000');
      expect(await body.locator('[data-flight-wing-pose]').getAttribute('data-flight-wing-pose')).not.toBe(initialWing);
      await expect(bench.locator('[data-flight-route]')).toHaveCount(0);
      await expect(bench).toContainText('not a route through the air');
    } else {
      await expect(bench.locator('[data-flight-route]')).toHaveAttribute('data-flight-route', kind);
    }
    if (kind === 'glide' || kind === 'soar') await expect(page.locator('[data-flight-wing-state]')).toHaveAttribute('data-flight-wing-state', 'held');
    if (kind === 'bound' || kind === 'dive') await expect(page.locator('[data-flight-wing-state]')).toHaveAttribute('data-flight-wing-state', 'folded');
  }
  await hostRerender(page);
  await expect(bench).toHaveAttribute('data-birdlab-flight-workbench', 'slowflap');
  await expect(body).toHaveAttribute('data-flight-phase', '100.0');
  expect(await rewards(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test('flight playback pauses, honors a reduced-motion change, and stops at the sequence end', async ({ page }) => {
  const errors = await mount(page, 'flightPatterns');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const bench = page.locator('[data-birdlab-flight-workbench]');
  const body = page.locator('[data-flight-body]');
  await page.getByRole('button', { name: 'Play sequence', exact: true }).click();
  await expect.poll(async () => Number(await body.getAttribute('data-flight-phase'))).toBeGreaterThan(20);
  await page.getByRole('button', { name: 'Pause sequence', exact: true }).click();
  await expect(bench).toHaveAttribute('data-flight-playing', 'false');
  const paused = await body.getAttribute('data-flight-phase');
  await page.waitForTimeout(180);
  await expect(body).toHaveAttribute('data-flight-phase', paused!);
  await page.getByRole('button', { name: 'Play sequence', exact: true }).click();
  await expect(bench).toHaveAttribute('data-flight-playing', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(bench).toHaveAttribute('data-flight-playing', 'false');
  const stopped = await body.getAttribute('data-flight-phase');
  await page.waitForTimeout(180);
  await expect(body).toHaveAttribute('data-flight-phase', stopped!);
  await page.locator('#birdlab-flight-phase').focus();
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowLeft');
  await expect(body).toHaveAttribute('data-flight-phase', '999.0');
  await page.getByRole('button', { name: 'Play sequence', exact: true }).click();
  await expect(body).toHaveAttribute('data-flight-phase', '1000.0');
  await expect(bench).toHaveAttribute('data-flight-playing', 'false');
  await page.getByRole('button', { name: 'Start of sequence', exact: true }).click();
  await expect(body).toHaveAttribute('data-flight-phase', '0.0');
  expect(errors).toEqual([]);
});

test('the flight scene and controls stack in a narrow embedded desktop pane', async ({ page }) => {
  const errors = await mount(page, 'flightPatterns', 1280, 500);
  const picture = await page.locator('.birdlab-equipment-view').boundingBox();
  const controls = await page.locator('.birdlab-equipment-panel').boundingBox();
  expect(picture!.width).toBeGreaterThan(300);
  expect(controls!.y).toBeGreaterThanOrEqual(picture!.y + picture!.height);
  expect(await page.locator('#wrap').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(501);
  expect(errors).toEqual([]);
});
