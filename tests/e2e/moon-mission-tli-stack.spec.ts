import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_TLI_STACK_REPORT_DIR || 'reports/moon-mission-enhancement-pass37-2026-10-09/browser');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: {
  missionPhase: 2, tliStarted: true, orbitRun: { version: 1, time: 9245.011304324662 },
  tliAccuracy: { onTime: true, offByDeg: 0, side: 'late', beforeGo: false },
  missionXP: 0, missionLog: [], animPaused: true, soundOff: true, difficulty: 'pilot',
  earnedBadges: { first_step: true, mission_complete: true }, ...extra,
} });
async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  await expect(page.locator('[data-tli-canvas]')).toBeVisible();
  await expect.poll(() => page.locator('[data-tli-canvas]').getAttribute('data-tli-time')).not.toBeNull();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function live(page: Page) { return page.locator('[data-tli-canvas]').evaluate((cv: HTMLCanvasElement) => ({
  time: Number(cv.dataset.tliTime), altitude: Number(cv.dataset.tliAltitude), speed: Number(cv.dataset.tliSpeed), mass: Number(cv.dataset.tliMass), energy: Number(cv.dataset.tliEnergy),
  thrust: Number(cv.dataset.tliThrust), acceleration: Number(cv.dataset.tliAcceleration), plume: cv.dataset.tliPlume, recorded: cv.dataset.tliRecorded,
})); }
function progress(data: any) { return { run: data.tliRun, result: data.tliResult, phase: data.missionPhase, xp: data.missionXP, log: data.missionLog }; }
async function seek(page: Page, time: number) {
  await page.locator('[data-tli-seek]').evaluate((el: HTMLInputElement, value) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value)); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, time);
  await expect.poll(async () => Math.abs((await live(page)).time - time)).toBeLessThan(0.01);
}
async function capture(page: Page, info: TestInfo, name: string, workspace = false) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(workspace ? '[data-tli-workspace]' : '[data-tli-canvas]').screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('retained injection stack and nozzle-rooted plume remain accurate through both cameras, cutoff, resize and reload', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await mount(page);

  // Compare actual Chromium canvas pixels with the same hardware, changing only thrust.
  const pixels = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, profile = P.tliProfile();
    function render(heading: number, thrust: number) {
      const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 360;
      const ctx = canvas.getContext('2d')!;
      const geometry = P.drawTliStack(ctx, 180, 180, heading, 78, thrust);
      return { geometry, pixels: ctx.getImageData(0, 0, 360, 360).data, url: canvas.toDataURL() };
    }
    const checks = [0, Math.PI / 2, Math.PI, -Math.PI / 2].map(heading => {
      const sample = P.tliSample(profile, 150.5), on = render(heading, sample.thrust), again = render(heading, sample.thrust), off = render(heading, 0);
      let changed = 0, aheadOfNozzle = 0;
      for (let i = 0; i < on.pixels.length; i += 4) {
        if ([0, 1, 2, 3].some(k => on.pixels[i + k] !== off.pixels[i + k])) {
          changed++;
          const x = (i / 4) % 360 + .5, y = Math.floor(i / 4 / 360) + .5;
          if ((x - on.geometry.nozzle.x) * Math.cos(heading) + (y - on.geometry.nozzle.y) * Math.sin(heading) > 2) aheadOfNozzle++;
        }
      }
      const cutoff = render(heading, P.tliSample(profile, profile.summary.duration).thrust);
      return { heading, changed, aheadOfNozzle, deterministic: on.url === again.url,
        cutoffMatchesCoast: cutoff.url === off.url, on: on.geometry, off: off.geometry };
    });
    const state = P.tliSample(profile, 150.5), before = JSON.stringify(state);
    const scenes = ['burn', 'orbit'].map(view => {
      const canvas = document.createElement('canvas'); canvas.width = 288; canvas.height = 360;
      const geometry = P.drawTliScene(canvas.getContext('2d'), 288, 360, state, profile, { view, orbitTime: 9245.011304324662 });
      return { view, geometry };
    });
    return { checks, scenes, stateUnchanged: before === JSON.stringify(state) };
  });
  for (const check of pixels.checks) {
    expect(check.changed).toBeGreaterThan(50);
    expect(check.aheadOfNozzle).toBe(0);
    expect(check.deterministic).toBe(true);
    expect(check.cutoffMatchesCoast).toBe(true);
    expect(check.on.plume).toBe(true); expect(check.off.plume).toBe(false);
    expect(check.on.sections.map((s: any) => typeof s === 'string' ? s : s.id)).toEqual(['cm', 'sm', 'sla', 'iu', 's4b']);
  }
  expect(pixels.stateUnchanged).toBe(true);
  for (const scene of pixels.scenes) {
    expect(scene.geometry.scaleX).toBe(scene.geometry.scaleY);
    expect(scene.geometry.stack.plume).toBe(true);
    expect(scene.geometry.stack.length).toBeGreaterThanOrEqual(54);
    expect(scene.geometry.stack.length).toBeLessThanOrEqual(78);
  }
  await writeFile(join(REPORT, 'stack-pixel-evidence.json'), JSON.stringify(pixels, null, 2));

  for (const width of [1100, 320]) {
    await page.setViewportSize({ width, height: 1000 }); await mount(page);
    for (const time of [0, 150.5, 342]) {
      await seek(page, time); const state = await live(page), receipt = progress(await saved(page));
      const expected = await page.evaluate(t => { const P = (window as any).MoonMissionPure; return P.tliSample(P.tliProfile(), t); }, time);
      expect(state.altitude).toBeCloseTo(expected.altitude, 6); expect(state.speed).toBeCloseTo(expected.speed, 6);
      expect(state.mass).toBeCloseTo(expected.mass, 6); expect(state.energy).toBeCloseTo(expected.energy, 6);
      expect(state.thrust).toBe(expected.thrust); expect(state.plume).toBe(String(time < 342));
      for (const view of ['burn', 'orbit']) {
        await page.locator('[data-tli-view]').selectOption(view);
        expect(await live(page)).toEqual(state); expect(progress(await saved(page))).toEqual(receipt);
        await capture(page, info, `stack-${width}-${view}-${String(time).replace('.', '_')}`);
      }
    }
    await capture(page, info, `stack-workspace-${width}`, true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  }

  await seek(page, 80); const reviewed = await saved(page), rewound = await live(page);
  await page.setViewportSize({ width: 500, height: 850 }); expect(await live(page)).toEqual(rewound);
  expect(progress(await saved(page))).toEqual(progress(reviewed));
  await page.setViewportSize({ width: 320, height: 850 }); await mount(page, seed(reviewed));
  expect(await live(page)).toEqual(rewound); expect(progress(await saved(page))).toEqual(progress(reviewed));
  await expect(page.locator('[data-tli-proceed]')).toBeEnabled();
  const slider = page.locator('[data-tli-seek]'); await slider.focus(); await page.keyboard.press('Home');
  await expect.poll(async () => (await live(page)).time).toBe(0); expect((await live(page)).plume).toBe('true');
  await page.keyboard.press('End'); await expect.poll(async () => (await live(page)).time).toBe(342);
  expect((await live(page)).plume).toBe('false'); expect((await saved(page)).missionXP).toBe(0);
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-tli-workspace]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  await writeFile(join(REPORT, 'stack-phone-axe.json'), JSON.stringify(violations, null, 2));
  expect(violations).toEqual([]); expect(errors).toEqual([]);
});
