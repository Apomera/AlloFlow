import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_ASCENT_TERRAIN_REPORT_DIR || 'reports/moon-mission-enhancement-pass44-2026-10-10/browser/terrain');
const MAIN = '[data-ascent-canvas]';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = () => ({ moonMission: { missionPhase: 7, animPaused: true, ascentPaused: true, ascentView: 'surface',
  soundOff: true, missionXP: 0, missionLog: [], earnedBadges: { first_step: true, mission_complete: true },
  difficulty: 'pilot', lunarSamples: [], quizCorrect: 0 } });

async function mount(page: Page, data: any = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-view', 'surface');
  await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-terrain-visible', 'true');
  await expect.poll(() => page.locator(MAIN).getAttribute('data-ascent-terrain-scale')).not.toBeNull();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function flight(page: Page) { const value = await saved(page); delete value.ascentView; return value; }
async function seek(page: Page, seconds: number) {
  await page.locator('[data-ascent-seek]').evaluate((input: HTMLInputElement, time) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(time));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, seconds);
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-ascent-time'))).toBeCloseTo(seconds, 6);
}
async function capture(page: Page, info: TestInfo, name: string) {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(MAIN).screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
}
async function pixels(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    let hash = 2166136261;
    for (const value of cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data) hash = Math.imul(hash ^ value, 16777619);
    return hash >>> 0;
  });
}
async function measured(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, profile = P.ascentProfile(), time = Number(cv.dataset.ascentTime);
    const sample = P.ascentSample(profile, time), width = cv.width / 2, height = cv.height / 2;
    const surface = P.ascentSurfaceGeometry(width, height, sample, profile), terrain = P.ascentTerrainGeometry(width, height, surface);
    return { width, height, sample, radius: P.ascent.radius, surface, terrain,
      visible: cv.dataset.ascentTerrainVisible, featureCount: Number(cv.dataset.ascentTerrainFeatures),
      candidateCount: Number(cv.dataset.ascentTerrainCandidates), terrainScale: Number(cv.dataset.ascentTerrainScale),
      craftX: Number(cv.dataset.ascentCraftX), craftY: Number(cv.dataset.ascentCraftY) };
  });
}
function check(row: any) {
  expect(row.radius).toBe(1737400); expect(row.visible).toBe('true');
  expect(row.terrain.view).toBe('world-terrain'); expect(row.terrainScale).toBeCloseTo(row.surface.pictureScale, 12);
  expect(row.featureCount).toBe(row.terrain.features.length); expect(row.candidateCount).toBe(row.terrain.candidateCount);
  expect(Number.isInteger(row.candidateCount)).toBe(true); expect(row.candidateCount).toBeLessThanOrEqual(6000);
  expect(row.candidateCount).toBeGreaterThanOrEqual(row.featureCount); expect(row.featureCount).toBeGreaterThan(0);
  const R = 1737400, r = R + row.sample.altitude, scale = row.surface.pictureScale;
  expect(row.craftX).toBeCloseTo(row.surface.originX + r * Math.sin(row.sample.angle) * scale, 6);
  expect(row.craftY).toBeCloseTo(row.surface.originY - (r * Math.cos(row.sample.angle) - R) * scale, 6);
  const layers = new Map<number, any>(row.terrain.layers.map((layer: any) => [layer.level, layer]));
  expect(layers.size).toBe(row.terrain.layers.length); expect(layers.size).toBeGreaterThan(0);
  for (const layer of row.terrain.layers) {
    expect(Number.isInteger(layer.level)).toBe(true); expect(layer.level).toBeGreaterThanOrEqual(0); expect(layer.level).toBeLessThanOrEqual(11);
    expect(layer.cellMetres).toBe(4 * Math.pow(4, layer.level)); expect(layer.spacing).toBeCloseTo(layer.cellMetres * scale, 9);
    expect(layer.spacing).toBeGreaterThan(24); expect(layer.spacing).toBeLessThan(160);
    expect(layer.alpha).toBeGreaterThan(0); expect(layer.alpha).toBeLessThanOrEqual(1);
  }
  const ids = new Set<string>();
  for (const feature of row.terrain.features) {
    expect(ids.has(feature.id), feature.id).toBe(false); ids.add(feature.id);
    expect(feature.id).toBe(feature.level + ':' + feature.cellX + ':' + feature.cellY);
    expect(Number.isInteger(feature.cellX)).toBe(true); expect(Number.isInteger(feature.cellY)).toBe(true);
    const layer = layers.get(feature.level); expect(layer).toBeDefined();
    const jitterX = feature.worldX / layer.cellMetres - feature.cellX, jitterY = feature.worldY / layer.cellMetres - feature.cellY;
    expect(jitterX).toBeGreaterThanOrEqual(0.2 - 1e-9); expect(jitterX).toBeLessThanOrEqual(0.8 + 1e-9);
    expect(jitterY).toBeGreaterThanOrEqual(0.2 - 1e-9); expect(jitterY).toBeLessThanOrEqual(0.8 + 1e-9);
    expect(feature.radiusMeters / layer.cellMetres).toBeGreaterThanOrEqual(0.055 - 1e-12);
    expect(feature.radiusMeters / layer.cellMetres).toBeLessThanOrEqual(0.105 + 1e-12);
    expect(Math.hypot(feature.worldX, feature.worldY + R)).toBeLessThanOrEqual(R + 1e-6);
    expect(feature.x).toBeCloseTo(row.surface.originX + feature.worldX * scale, 8);
    expect(feature.y).toBeCloseTo(row.surface.originY - feature.worldY * scale, 8);
    expect(feature.radiusPx).toBeCloseTo(feature.radiusMeters * scale, 10);
    expect(feature.radiusPx).toBeGreaterThan(0); expect(feature.alpha).toBeGreaterThan(0); expect(feature.alpha).toBeLessThanOrEqual(1);
    expect(['rock', 'mottle']).toContain(feature.kind); expect(Number.isFinite(feature.shade)).toBe(true);
    expect(feature.x + 4 * feature.radiusPx).toBeGreaterThanOrEqual(-1e-6);
    expect(feature.x - 4 * feature.radiusPx).toBeLessThanOrEqual(row.width + 1e-6);
    expect(feature.y + 4 * feature.radiusPx).toBeGreaterThanOrEqual(54 - 1e-6);
    expect(feature.y - 4 * feature.radiusPx).toBeLessThanOrEqual(row.height - 55 + 1e-6);
  }
}
function sharedAnchors(first: any, second: any) {
  const previous = new Map<string, any>(first.terrain.features.map((feature: any) => [feature.id, feature]));
  const common = second.terrain.features.filter((feature: any) => previous.has(feature.id));
  expect(common.length).toBeGreaterThan(10);
  for (const feature of common) {
    const old = previous.get(feature.id);
    for (const key of ['worldX', 'worldY', 'radiusMeters', 'kind', 'shade', 'level', 'cellX', 'cellY']) expect(feature[key], feature.id + ':' + key).toBe(old[key]);
    // The screen displacement follows the camera transform of the same anchor.
    expect(feature.x - old.x).toBeCloseTo(second.surface.originX - first.surface.originX + feature.worldX * (second.surface.pictureScale - first.surface.pictureScale), 8);
    expect(feature.y - old.y).toBeCloseTo(second.surface.originY - first.surface.originY - feature.worldY * (second.surface.pictureScale - first.surface.pictureScale), 8);
    expect(feature.radiusPx / old.radiusPx).toBeCloseTo(second.surface.pictureScale / first.surface.pictureScale, 10);
  }
  return common.map((feature: any) => feature.id);
}
async function texturePixels(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, profile = P.ascentProfile(), time = Number(cv.dataset.ascentTime);
    const sample = P.ascentSample(profile, time), width = cv.width / 2, height = cv.height / 2;
    const before = JSON.stringify({ sample, profile });
    const render = (enabled: boolean) => {
      const scratch = document.createElement('canvas'); scratch.width = cv.width; scratch.height = cv.height;
      const ctx = scratch.getContext('2d')!; ctx.scale(2, 2);
      const geometry = P.drawAscentScene(ctx, width, height, sample, profile, { view: 'surface', time, terrain: enabled });
      return { geometry, data: ctx.getImageData(0, 0, scratch.width, scratch.height).data };
    };
    const on = render(true), off = render(false), actual = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    const surface = P.ascentSurfaceGeometry(width, height, sample, profile), terrain = P.ascentTerrainGeometry(width, height, surface);
    let groundDifferences = 0, skyDifferences = 0, actualGroundMatches = 0;
    const changed = new Uint8Array(cv.width * cv.height);
    for (let x = 0; x < cv.width; x++) {
      const dx = (x / 2 - surface.originX) / surface.pictureScale;
      const root = Math.sqrt(Math.max(0, 1737400 * 1737400 - dx * dx));
      const ground = surface.originY + dx * dx / (1737400 + root) * surface.pictureScale;
      for (let y = 108; y < cv.height - 110; y++) {
        const i = (y * cv.width + x) * 4;
        if (on.data[i] === off.data[i] && on.data[i + 1] === off.data[i + 1] && on.data[i + 2] === off.data[i + 2]) continue;
        changed[y * cv.width + x] = 1;
        if (y / 2 > ground + 4) {
          groundDifferences++;
          if (actual[i] === on.data[i] && actual[i + 1] === on.data[i + 1] && actual[i + 2] === on.data[i + 2]) actualGroundMatches++;
        } else if (y / 2 < ground - 4) skyDifferences++;
      }
    }
    const neighborhoods = terrain.features.filter((feature: any) => feature.x > 8 && feature.x < width - 8 && feature.y > 62 && feature.y < height - 63).map((feature: any) => {
      const radius = Math.max(3, feature.radiusPx * 2); let differences = 0;
      for (let y = Math.max(108, Math.floor((feature.y - radius) * 2)); y < Math.min(cv.height - 110, Math.ceil((feature.y + radius) * 2)); y++) {
        for (let x = Math.max(0, Math.floor((feature.x - radius) * 2)); x < Math.min(cv.width, Math.ceil((feature.x + radius) * 2)); x++) differences += changed[y * cv.width + x];
      }
      return { id: feature.id, x: feature.x, y: feature.y, radiusPx: feature.radiusPx, differences };
    });
    const strip = (g: any) => { const result = { ...g }; delete result.terrain; delete result.terrainVisible; return result; };
    return { time, width, groundDifferences, skyDifferences, actualGroundMatches, neighborhoods,
      onVisible: on.geometry.terrainVisible, offVisible: off.geometry.terrainVisible,
      onGeometry: strip(on.geometry), offGeometry: strip(off.geometry), unchangedInputs: JSON.stringify({ sample, profile }) === before };
  });
}
function checkPixels(value: any) {
  expect(value.onVisible).toBe(true); expect(value.offVisible).toBe(false);
  expect(value.onGeometry).toEqual(value.offGeometry); expect(value.unchangedInputs).toBe(true);
  expect(value.groundDifferences).toBeGreaterThan(20); expect(value.skyDifferences).toBe(0);
  expect(value.actualGroundMatches).toBeGreaterThan(value.groundDifferences * 0.8);
  expect(value.neighborhoods.some((feature: any) => feature.differences > 5)).toBe(true);
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-ascent-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  await info.attach(name, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' }); expect(violations).toEqual([]);
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('world anchored ascent terrain follows lunar coordinates through camera motion, resize, cutoff and saved replay', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page);
  await expect(page.locator('#mm-ascent-view-note')).toContainText(/schematic/i);
  await expect(page.locator('#mm-ascent-view-note')).toContainText(/lunar coordinates/i);
  const rows: any[] = [], clipping: any[] = [], shared: any[] = [];
  for (const time of [0, 4, 15, 120, 300]) {
    await seek(page, time); const row = await measured(page); check(row); rows.push(row);
    expect(row.width).toBe(986); expect((await saved(page)).missionXP).toBe(0);
    await capture(page, info, 'terrain-' + (time === 0 ? 'liftoff' : time === 4 ? 'rise' : time + 's') + '-1100');
    if (time === 4) {
      shared.push({ from: 'liftoff', to: 'rise', ids: sharedAnchors(rows[0], row) });
      const p = await texturePixels(page); checkPixels(p); clipping.push(p);
      const beforeResize = await flight(page), beforePixels = await pixels(page);
      await page.setViewportSize({ width: 900, height: 1000 });
      await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(986);
      await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2 === cv.clientWidth)).toBe(true);
      const resized = await measured(page); check(resized); rows.push(resized);
      shared.push({ from: 'rise-1100', to: 'rise-900', ids: sharedAnchors(row, resized) });
      expect(await flight(page)).toEqual(beforeResize);
      await page.setViewportSize({ width: 1100, height: 1000 });
      await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBe(986);
      expect(await flight(page)).toEqual(beforeResize); expect(await pixels(page)).toBe(beforePixels);
    }
    if (time === 120) {
      const near = await flight(page); await seek(page, 120.1); const nearby = await measured(page); check(nearby); rows.push(nearby);
      shared.push({ from: '120s', to: '120.1s', ids: sharedAnchors(row, nearby) });
      await seek(page, 120); expect(await flight(page)).toEqual(near);
    }
  }
  await page.locator('[data-ascent-complete-review]').click();
  await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-engine', 'off');
  const cutoff = await measured(page); check(cutoff); rows.push(cutoff);
  await capture(page, info, 'terrain-cutoff-1100'); await accessibility(page, info, 'terrain-a11y-1100');
  const completed = await saved(page), measuredFlight = await flight(page), still = await pixels(page);
  expect(completed.ascentRun.recorded).toBe(true); expect(completed.ascentResult.outcome).toBe('orbit'); expect(completed.missionXP).toBe(0);
  await page.waitForTimeout(250); expect(await pixels(page)).toBe(still);
  await page.locator('[data-ascent-view-control]').selectOption('physical');
  await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-view', 'physical');
  await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-terrain-visible', 'false');
  expect(await flight(page)).toEqual(measuredFlight);
  await page.locator('[data-ascent-view-control]').selectOption('surface');
  await expect(page.locator(MAIN)).toHaveAttribute('data-ascent-terrain-visible', 'true');
  expect(await flight(page)).toEqual(measuredFlight); expect(await pixels(page)).toBe(still);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBe(282);
  const phone = await measured(page); check(phone); rows.push(phone); expect(await flight(page)).toEqual(measuredFlight);
  const phoneClipping = await texturePixels(page); checkPixels(phoneClipping); clipping.push(phoneClipping);
  await capture(page, info, 'terrain-cutoff-320'); await accessibility(page, info, 'terrain-a11y-320');
  const phonePixels = await pixels(page); await mount(page, { moonMission: await saved(page) });
  expect(await flight(page)).toEqual(measuredFlight); expect(await pixels(page)).toBe(phonePixels); check(await measured(page));
  await seek(page, 4); const replay = await measured(page); check(replay); rows.push(replay); await capture(page, info, 'terrain-rise-320');
  expect((await saved(page)).ascentResult).toEqual(completed.ascentResult); expect((await saved(page)).ascentRun.recorded).toBe(true);
  await page.locator('[data-ascent-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-ascent-time'))).toBeGreaterThan(4);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth); expect(overflow).toBe(false);
  expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'terrain-measured.json'), JSON.stringify({ rows, shared, clipping, errors, overflow }, null, 2));
});
