import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass58-2026-10-12/browser/departure-earth');
const MAIN = '[data-tli-canvas]';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, extra: any = {}) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(extra => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    (window as any).__mount({ moonMission: { missionPhase: 2, tliStarted: true, animPaused: true, tliPaused: true,
      soundOff: true, missionXP: 0, missionLog: [], difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
      earnedBadges: { first_step: true, mission_complete: true }, tliPlan: { duration: 342 }, tliView: 'burn',
      tliRun: { version: 1, duration: 342, orbitTime: 9245.011304324662, time: 150.5, recorded: false }, ...extra } });
  }, extra);
  await expect(page.locator(MAIN)).toBeVisible();
  await expect.poll(() => page.locator(MAIN).getAttribute('data-tli-sun-fraction')).not.toBeNull();
  await page.evaluate(async () => { await document.fonts.ready; });
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
function progress(d: any) { const { tliView, ...rest } = d; return rest; }
async function seek(page: Page, time: number) {
  await page.locator('[data-tli-seek]').evaluate((el: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-tli-time'))).toBeCloseTo(time, 6);
}
async function settledPixels(page: Page) {
  return page.locator(MAIN).evaluate(async (cv: HTMLCanvasElement) => {
    await document.fonts.ready; let last = '', repeats = 0;
    for (let frame = 0; frame < 30; frame++) {
      await new Promise<void>(done => requestAnimationFrame(() => done()));
      const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
      let hash = 2166136261, opaque = 0;
      for (const channel of data) hash = Math.imul(hash ^ channel, 16777619);
      for (let i = 3; i < data.length; i += 4) if (data[i] === 255) opaque++;
      const key = [hash >>> 0, cv.width, cv.height, cv.dataset.tliTime].join(':');
      repeats = key === last && opaque === cv.width * cv.height && cv.width === cv.offsetWidth * 2 ? repeats + 1 : 0; last = key;
      if (repeats >= 2) return { hash: hash >>> 0, width: cv.width, height: cv.height, opaque, time: cv.dataset.tliTime };
    }
    throw new Error('The paused injection canvas did not settle within 30 frames');
  });
}
async function capture(page: Page, info: TestInfo, name: string, selector = MAIN) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  if (selector === '#departure-atmosphere-board') {
    // Export the synthetic atmosphere board directly; live application views below
    // still use browser screenshots including their surrounding layout.
    const url = await page.locator(selector).evaluate((cv: HTMLCanvasElement) => cv.toDataURL('image/png'));
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
    await writeFile(path, Buffer.from(url.split(',')[1], 'base64'));
  } else await page.locator(selector).screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-tli-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  const path = join(REPORT, name + '.json'); await writeFile(path, JSON.stringify(violations, null, 2));
  await info.attach(name, { path, contentType: 'application/json' }); expect(violations).toEqual([]);
}


async function lightingClocks(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.tliProfile();
    const last = profile.samples[profile.samples.length - 1];
    const anchor = Math.atan2(last.y, last.x) / 2, period = P.orbitSnapshot(0).period;
    // The close camera's upward surface normal has world angle anchor + orbitAngle.
    // Choose that normal parallel, perpendicular, and opposite to the fixed +X Sun.
    const clock = (beta: number) => {
      const phase = ((beta - anchor + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      return period * (2 + phase / (2 * Math.PI));
    };
    return { day: clock(0), twilight: clock(Math.PI / 2), night: clock(Math.PI), anchor, period };
  });
}
async function inspectEarth(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    const profile = P.tliProfile(d.tliPlan), sample = P.tliSample(profile, Number(cv.dataset.tliTime));
    const off = document.createElement('canvas'); off.width = cv.width; off.height = cv.height;
    const ctx = off.getContext('2d')!; ctx.scale(2, 2);
    const scene = P.drawTliScene(ctx, cv.width / 2, cv.height / 2, sample, profile,
      { view: d.tliView, orbitTime: d.tliRun.orbitTime });
    return { scene, sample, orbitTime: P.orbitSnapshot(d.tliRun.orbitTime).time,
      earthTick: Number(cv.dataset.tliEarthTick), view: d.tliView };
  });
}
function checkEarth(row: any) {
  // Independent conversion from seconds to the renderer's historical angular ticks.
  const expected = ((row.orbitTime + row.sample.time) % 86164) * 360 / 86164 / 0.0458;
  expect(row.earthTick).toBeCloseTo(expected, 9); expect(row.scene.earthTick).toBeCloseTo(expected, 9);
  expect(row.scene.scaleX).toBe(row.scene.scaleY);
  if (row.view === 'burn') {
    expect(row.scene.atmosphere.bands).toBe(8); expect(row.scene.atmosphere.topHeight).toBe(60000);
    expect(row.scene.atmosphere.segments).toBeGreaterThan(0);
  }
}
async function atmosphereEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, R = 6371000, scale = 1000 / R;
    const W = 640, H = 240, cx = 320, cy = 1160, dpr = 3;
    const board = document.createElement('canvas'); board.width = 960; board.height = 450;
    board.id = 'departure-atmosphere-board'; board.style.cssText = 'display:block;max-width:100%;height:auto';
    const bc = board.getContext('2d')!; bc.fillStyle = '#071224'; bc.fillRect(0, 0, board.width, board.height);
    bc.fillStyle = '#f8fafc'; bc.font = '18px system-ui'; bc.fillText('Earth limb · altitude and sunlight', 20, 30);
    bc.fillStyle = '#cbd5e1'; bc.font = '13px system-ui';
    bc.fillText('Same spherical shell: 0–60 km altitude; daylight fades with height and vanishes in deep night.', 20, 54);
    const rows: any[] = [];
    for (const [name, angle] of [['day', -Math.PI / 2], ['twilight', 0], ['night', Math.PI / 2]] as const) {
      const cv = document.createElement('canvas'); cv.width = W * dpr; cv.height = H * dpr;
      const ctx = cv.getContext('2d')!; ctx.scale(dpr, dpr);
      const result = P.drawEarthLimbAtmosphere(ctx, W, H, cx, cy, scale, angle);
      const pixels = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let visible = 0, outsideShell = 0, alphaSum = 0, minHeight = Infinity, maxHeight = -Infinity;
      const bins = [0, 0, 0, 0, 0, 0], counts = [0, 0, 0, 0, 0, 0];
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
        const alpha = pixels[(y * cv.width + x) * 4 + 3];
        // Radius/altitude derived independently from Canvas sample positions.
        const h = Math.hypot((x + 0.5) / dpr - cx, (y + 0.5) / dpr - cy) / scale - R;
        if (Math.abs((x + 0.5) / dpr - cx) < 18 && h > 0 && h < 60000) {
          const bin = Math.floor(h / 10000); bins[bin] += alpha; counts[bin]++;
        }
        if (!alpha) continue;
        visible++; alphaSum += alpha; minHeight = Math.min(minHeight, h); maxHeight = Math.max(maxHeight, h);
        // A two-device-pixel allowance covers edge rasterization and chord error.
        if (h < -2 / dpr / scale || h > 60000 + 2 / dpr / scale) outsideShell++;
      }
      const col = rows.length;
      bc.fillStyle = '#cbd5e1'; bc.font = '14px system-ui'; bc.fillText(name, col * 320 + 20, 95);
      // Show the actual native raster at 1:1 output pixels around the upper limb.
      bc.drawImage(cv, (cx - 150) * dpr, 140 * dpr, 300 * dpr, 95 * dpr, col * 320 + 10, 110, 300, 95);
      // A magnified strip makes the physical atmospheric thickness inspectable.
      bc.drawImage(cv, (cx - 42) * dpr, 146 * dpr, 84 * dpr, 30 * dpr, col * 320 + 34, 250, 252, 90);
      bc.fillStyle = '#94a3b8'; bc.font = '12px system-ui'; bc.fillText('Detail: same shell, 3× magnification', col * 320 + 20, 370);
      rows.push({ name, result, visible, outsideShell, alphaSum,
        minHeight: Number.isFinite(minHeight) ? minHeight : null, maxHeight: Number.isFinite(maxHeight) ? maxHeight : null,
        alphaByHeight: bins.map((sum, i) => counts[i] ? sum / counts[i] : 0), counts });
    }
    document.querySelector('[data-tli-workspace]')!.append(board);
    return { R, scale, dpr, W, H, cx, cy, rows };
  });
}

test('departure Earth preserves its rotating globe and physical atmosphere across close and orbit cameras', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  const clocks = await lightingClocks(page), initial = await saved(page), evidence = await atmosphereEvidence(page), rows: any[] = [];
  await writeFile(join(REPORT, 'departure-atmosphere-pixels.json'), JSON.stringify(evidence, null, 2));
  for (const row of evidence.rows) {
    expect(row.result.bands).toBe(8); expect(row.result.topHeight).toBe(60000); expect(row.outsideShell).toBe(0);
  }
  const [day, twilight, night] = evidence.rows;
  expect(day.visible).toBeGreaterThan(1000); expect(day.alphaSum).toBeGreaterThan(twilight.alphaSum);
  expect(twilight.alphaSum).toBeGreaterThan(0); expect(night.visible).toBe(0);
  expect(day.alphaByHeight[0]).toBeGreaterThan(day.alphaByHeight[2]);
  expect(day.alphaByHeight[2]).toBeGreaterThan(day.alphaByHeight[4]);
  expect(day.alphaByHeight[4]).toBeGreaterThan(0);
  expect(await saved(page)).toEqual(initial);
  await capture(page, info, 'departure-atmosphere-board', '#departure-atmosphere-board');
  await page.locator('#departure-atmosphere-board').evaluate(el => el.remove());

  for (const width of [1100, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const light of ['day', 'twilight', 'night'] as const) {
      await mount(page, { tliRun: { version: 1, duration: 342, orbitTime: clocks[light], time: 150.5, recorded: false } });
      await settledPixels(page); const row = await inspectEarth(page); checkEarth(row); rows.push({ width, light, ...row });
      expect(Math.sin(row.scene.earthSunAngle)).toBeCloseTo(light === 'day' ? -1 : light === 'night' ? 1 : 0, 10);
      if (width === 1100) await capture(page, info, 'departure-' + light + '-1100');
      if (width === 320 && light === 'night') await capture(page, info, 'departure-night-workspace-320', '[data-tli-workspace]');
    }
    await accessibility(page, info, 'departure-earth-a11y-' + width);
  }
  const phonePixels = await settledPixels(page), phoneSave = await saved(page), phoneProgress = progress(phoneSave);
  await page.waitForTimeout(200); expect(await settledPixels(page)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  await mount(page, phoneSave); expect(await settledPixels(page)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  await page.locator('[data-tli-view]').selectOption('orbit'); await settledPixels(page);
  const orbit = await inspectEarth(page); checkEarth(orbit); rows.push({ width: 320, ...orbit });
  expect(orbit.earthTick).toBe(rows[rows.length - 2].earthTick);
  await capture(page, info, 'departure-orbit-320');
  await page.locator('[data-tli-view]').selectOption('burn'); expect(await settledPixels(page)).toEqual(phonePixels);
  expect(progress(await saved(page))).toEqual(phoneProgress);

  // The geography clock must advance with the burn, survive a reload, and share
  // its epoch between cameras. No new clock is persisted in mission progress.
  for (const time of [0, 150.5, 342]) {
    await seek(page, time); await settledPixels(page);
    const close = await inspectEarth(page); checkEarth(close); rows.push(close);
    const savedAtTime = await saved(page);
    await page.locator('[data-tli-view]').selectOption('orbit'); await settledPixels(page);
    const whole = await inspectEarth(page); checkEarth(whole); rows.push(whole);
    expect(whole.earthTick).toBe(close.earthTick); expect(whole.sample).toEqual(close.sample);
    expect(progress(await saved(page))).toEqual(progress(savedAtTime));
    await page.locator('[data-tli-view]').selectOption('burn');
  }
  await mount(page, { tliRun: { version: 1, duration: 342, orbitTime: clocks.day + 600, time: 150.5, recorded: false } });
  await settledPixels(page); const offset = await inspectEarth(page); checkEarth(offset); rows.push(offset);
  const dayOriginal = rows.find(row => row.width === 1100 && row.light === 'day');
  expect(offset.earthTick - dayOriginal.earthTick).toBeCloseTo(600 * 360 / 86164 / 0.0458, 9);
  const final = await saved(page);
  expect(final.missionXP).toBe(0); expect(final.missionLog).toEqual(initial.missionLog);
  expect(final.earnedBadges).toEqual(initial.earnedBadges); expect(final.missionPhase).toBe(2);
  const bounds = await page.locator('[data-tli-workspace]').evaluate(el => {
    const r = el.getBoundingClientRect(), note = el.querySelector('[data-tli-light-note]')!.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth + 1, left: r.left, right: r.right, noteLeft: note.left, noteRight: note.right };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320);
  expect(bounds.noteLeft).toBeGreaterThanOrEqual(0); expect(bounds.noteRight).toBeLessThanOrEqual(320); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'departure-earth-measured.json'), JSON.stringify({ clocks, evidence, rows, phonePixels, bounds, errors }, null, 2));
});
