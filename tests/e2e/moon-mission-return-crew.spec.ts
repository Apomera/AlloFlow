import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_RETURN_CREW_REPORT_DIR || 'reports/moon-mission-enhancement-pass38-2026-10-09/browser');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 8, animPaused: true, soundOff: true,
  missionXP: 0, missionLog: [], difficulty: 'pilot', earnedBadges: { first_step: true, mission_complete: true }, lunarSamples: [], quizCorrect: 0, ...extra } });
async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  await expect(page.locator('[data-teicoast-canvas]')).toBeVisible();
  await expect.poll(() => page.locator('[data-teicoast-canvas]').getAttribute('data-return-elapsed')).not.toBeNull();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function live(page: Page) {
  return page.locator('[data-teicoast-canvas]').evaluate((cv: HTMLCanvasElement) => ({ time: Number(cv.dataset.returnElapsed), altitude: Number(cv.dataset.returnAltitude) * 1000,
    speed: Number(cv.dataset.returnSpeed), radialSpeed: Number(cv.dataset.returnRadialSpeed), tangentialSpeed: Number(cv.dataset.returnTangentialSpeed),
    gamma: Number(cv.dataset.returnAngle), x: Number(cv.dataset.returnX), y: Number(cv.dataset.returnY), vx: Number(cv.dataset.returnVx), vy: Number(cv.dataset.returnVy),
    separated: cv.dataset.returnSeparated === 'true', complete: cv.dataset.returnComplete === 'true', plume: cv.dataset.returnPlume }));
}
async function seek(page: Page, time: number) {
  const selected = Math.round(time * 10) / 10;
  await page.locator('[data-return-seek]').evaluate((input: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, selected);
  await expect.poll(async () => Math.abs((await live(page)).time - selected)).toBeLessThan(0.11);
}
async function crew(page: Page) {
  await page.locator('[data-return-view]').selectOption('crew');
  await expect(page.locator('[data-teicoast-canvas]')).toHaveAttribute('data-return-camera-view', 'crew');
}
async function capture(page: Page, info: TestInfo, name: string, workspace = false) {
  await mkdir(REPORT, { recursive: true });
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(workspace ? '[data-return-workspace]' : '[data-teicoast-canvas]').screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function painted(page: Page) {
  await expect.poll(async () => page.locator('[data-teicoast-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const pixels = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0, count = 0; const colors = new Set<string>();
    for (let y = 10; y < cv.height; y += 10) for (let x = 10; x < cv.width; x += 10) {
      const i = (y * cv.width + x) * 4; count++; if (pixels[i + 3] > 100) opaque++;
      colors.add(Array.from(pixels.slice(i, i + 3)).join(','));
    }
    return opaque / count > 0.95 && colors.size > 12;
  })).toBe(true);
}
function withoutView(value: Record<string, any>) { const { returnView, ...rest } = value; return rest; }

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop()); test.afterEach(async ({ page }) => harness.destroy(page));

test('crew Earth camera preserves measured coast, physical angular size, sunlight, receipts and accessible phone controls', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mkdir(REPORT, { recursive: true });
  await mount(page);
  const reference = await page.evaluate(() => { const P = (window as any).MoonMissionPure, profile = P.returnProfile();
    return { duration: profile.summary.duration, radius: 6371000 }; });
  const sunlight = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, R = 6371000;
    const base = P.returnSample(P.returnProfile(), 0);
    function draw(sign: number) {
      const sample = { ...base, x: 0, y: sign * R * 4 };
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
      P.drawReturnCrewScene(canvas.getContext('2d'), canvas.width, canvas.height, sample);
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      let brightness = 0, opaque = 0; const colors = new Set<string>();
      for (let i = 0; i < pixels.length; i += 4) { brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3; if (pixels[i + 3] > 100) opaque++; }
      for (let y = 8; y < canvas.height; y += 8) for (let x = 8; x < canvas.width; x += 8) {
        const i = (y * canvas.width + x) * 4; colors.add(Array.from(pixels.slice(i, i + 3)).join(','));
      }
      const ray = P.returnCrewRay(sample, 0, 0), geometry = P.returnCrewGeometry(sample, 100);
      return { brightness: brightness / (canvas.width * canvas.height), opaque: opaque / (canvas.width * canvas.height), colors: colors.size,
        solar: ray.solar, normal: ray.ny, range: ray.range, angularRadius: geometry.angularRadius };
    }
    return { sunny: draw(1), night: draw(-1) };
  });
  expect(sunlight.sunny.solar).toBeCloseTo(1, 10); expect(sunlight.night.solar).toBeCloseTo(-1, 10);
  expect(sunlight.sunny.normal).toBeCloseTo(1, 10); expect(sunlight.night.normal).toBeCloseTo(-1, 10);
  expect(sunlight.sunny.range).toBeCloseTo(reference.radius * 3, 4);
  expect(sunlight.sunny.angularRadius).toBeCloseTo(Math.asin(0.25) * 180 / Math.PI, 10);
  for (const shot of [sunlight.sunny, sunlight.night]) { expect(shot.opaque).toBeGreaterThan(0.95); expect(shot.colors).toBeGreaterThan(12); }
  expect(sunlight.sunny.brightness).toBeGreaterThan(sunlight.night.brightness + 0.1);
  await writeFile(join(REPORT, 'crew-sunlight-pixels.json'), JSON.stringify(sunlight, null, 2));

  await seek(page, 86400); await crew(page); await page.locator('[data-return-rate]').selectOption('600');
  await page.locator('[data-return-play-pause]').click();
  await expect.poll(async () => (await live(page)).time).toBeGreaterThan(86400.1);
  const clock = await page.evaluate(async () => {
    const raf = window.requestAnimationFrame, cancel = window.cancelAnimationFrame;
    const hidden = Object.getOwnPropertyDescriptor(document, 'hidden');
    const pending = new Map<number, FrameRequestCallback>(); let id = 0;
    window.requestAnimationFrame = callback => { const key = --id; pending.set(key, callback); return key; };
    window.cancelAnimationFrame = key => { if (key < 0) pending.delete(key); else cancel.call(window, key); };
    let canvas: any;
    try {
      await new Promise<void>(done => raf.call(window, () => raf.call(window, () => done())));
      canvas = document.querySelector('[data-teicoast-canvas]');
      function frame(time: number) { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => callback(time));
        return { time: Number(canvas.dataset.returnElapsed), callbacks: callbacks.length }; }
      const start = frame(1000), advanced = frame(1016);
      Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
      const held = frame(5016);
      Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange'));
      const resumed = frame(3600000), next = frame(3600016);
      canvas._returnAction('pause', true); const stopped = frame(3601000);
      return { start, advanced, held, resumed, next, stopped };
    } finally {
      if (canvas && canvas._returnAction) canvas._returnAction('pause', true);
      if (hidden) Object.defineProperty(document, 'hidden', hidden); else delete (document as any).hidden;
      document.dispatchEvent(new Event('visibilitychange'));
      window.requestAnimationFrame = raf; window.cancelAnimationFrame = cancel;
      const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(callback => raf.call(window, callback));
    }
  });
  for (const snapshot of Object.values(clock)) expect(snapshot.callbacks).toBeGreaterThan(0);
  expect(clock.advanced.time - clock.start.time).toBeCloseTo(9.6, 6);
  expect(clock.held.time).toBe(clock.advanced.time); expect(clock.resumed.time).toBe(clock.held.time);
  expect(clock.next.time - clock.resumed.time).toBeCloseTo(9.6, 6); expect(clock.stopped.time).toBe(clock.next.time);
  await writeFile(join(REPORT, 'crew-controlled-clock.json'), JSON.stringify(clock, null, 2));
  // Reload each viewport below; synthetic timestamps must not affect later publication clocks.
  for (const width of [1100, 320]) {
    await page.setViewportSize({ width, height: 1000 }); await mount(page);
    await page.locator('[data-return-rate]').selectOption('600');
    for (const [name, time] of [['departure', 0], ['day-one', 86400], ['final-fifteen-minutes', reference.duration - 900], ['entry-interface', reference.duration]] as const) {
      if (name === 'entry-interface') {
        await page.locator('[data-return-arrival]').click();
        await expect(page.locator('[data-entry-begin]')).toBeEnabled();
      } else await seek(page, time);
      const before = await live(page), state = await saved(page);
      await crew(page); await painted(page);
      expect(await live(page)).toEqual(before); expect(withoutView(await saved(page))).toEqual(withoutView(state));
      const meta = await page.locator('[data-teicoast-canvas]').evaluate((cv: HTMLCanvasElement) => ({
        diameter: Number(cv.dataset.returnAngularDiameter), clipped: cv.dataset.returnCrewClipped === 'true', aria: cv.getAttribute('aria-label'), dataUrl: cv.toDataURL()
      }));
      const diameter = 2 * Math.asin(reference.radius / Math.hypot(before.x, before.y)) * 180 / Math.PI;
      expect(meta.diameter).toBeCloseTo(diameter, 5); expect(meta.clipped).toBe(diameter > 80);
      expect(meta.aria).toMatch(/crew|camera|angular/i); expect(before.plume).toBe('off');
      await page.waitForTimeout(120);
      expect(await page.locator('[data-teicoast-canvas]').evaluate((cv: HTMLCanvasElement) => cv.toDataURL())).toBe(meta.dataUrl);
      await capture(page, info, 'crew-' + name + '-' + width);
      if (name === 'entry-interface') {
        expect(meta.clipped).toBe(true); await expect(page.locator('[data-entry-begin]')).toBeEnabled();
        await capture(page, info, 'crew-workspace-' + width, true);
      }
      await page.locator('[data-return-view]').selectOption('system');
      expect(await live(page)).toEqual(before);
      expect(withoutView(await saved(page))).toEqual(withoutView(state));
      await page.locator('[data-return-view]').selectOption('approach');
      expect(await live(page)).toEqual(before); expect(withoutView(await saved(page))).toEqual(withoutView(state));
    }
    await seek(page, reference.duration - 880); await crew(page);
    await page.locator('[data-return-rate]').selectOption('1'); const playStart = await live(page);
    await page.locator('[data-return-play-pause]').click();
    await expect.poll(async () => (await live(page)).time).toBeGreaterThan(playStart.time + 0.1);
    await expect(page.locator('[data-return-view]')).toHaveValue('crew');
    await page.locator('[data-return-play-pause]').click(); const stop = await live(page);
    await page.waitForTimeout(180); expect(await live(page)).toEqual(stop);
    await page.locator('[data-return-rate]').selectOption('600');
    const receipt = (await saved(page)).returnResult;
    await seek(page, 86400); await crew(page); const paused = await live(page), stored = await saved(page);
    expect(stored.returnRun.recorded).toBe(true); expect(stored.returnResult).toEqual(receipt);
    await page.setViewportSize({ width: width === 320 ? 390 : 980, height: 1000 }); await painted(page);
    await expect(page.locator('[data-return-view]')).toHaveValue('crew'); expect(await live(page)).toEqual(paused);
    await page.setViewportSize({ width, height: 1000 }); await mount(page, seed(stored));
    await expect(page.locator('[data-return-view]')).toHaveValue('crew'); expect(await live(page)).toEqual(paused);
    expect((await saved(page)).returnResult).toEqual(receipt); expect((await saved(page)).missionXP).toBe(0);
    await expect(page.locator('[data-return-rate]')).toHaveValue('600');
    await page.locator('[data-return-seek]').focus(); await page.keyboard.press('End');
    await expect(page.locator('[data-entry-begin]')).toBeEnabled(); expect((await live(page)).complete).toBe(true);
    await crew(page); await painted(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    const axe = resolve('node_modules/axe-core/axe.min.js');
    expect(existsSync(axe)).toBe(true); await page.addScriptTag({ path: axe });
    const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-return-workspace]']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map((v: any) => ({
        id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target)
      })));
    await writeFile(join(REPORT, 'crew-axe-' + width + '.json'), JSON.stringify(violations, null, 2)); expect(violations).toEqual([]);
    await mount(page, seed({ ...(await saved(page)), animPaused: true }));
    const boundary = await live(page); await page.locator('[data-entry-begin]').click();
    await expect(page.locator('[data-entry-canvas]')).toBeVisible(); const entry = await saved(page);
    expect(entry.entryRun).toEqual({ version: 2, angle: -6.5, time: 0, recovery: 0, recorded: false, plan: { version: 2, mode: 'guided', bank: 0 } });
    expect(entry.missionXP).toBe(0); expect(entry.returnResult).toEqual(receipt);
    const entryStart = await page.evaluate(() => { const P = (window as any).MoonMissionPure; return P.entrySample(P.entryProfile(-6.5), 0); });
    expect(entryStart.altitude).toBeCloseTo(boundary.altitude, 5); expect(entryStart.speed).toBeCloseTo(boundary.speed, 6);
    expect(entryStart.gamma * 180 / Math.PI).toBeCloseTo(boundary.gamma, 8);
  }
  expect(errors).toEqual([]);
});
