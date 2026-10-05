import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DESCENT_LANDMARK_REPORT_DIR || 'reports/moon-mission-enhancement-pass19-2026-10-03/browser/landmarks');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 5, descentStarted: true,
  descentPredictionOpen: true, animPaused: true, soundOff: true, difficulty: 'pilot', missionXP: 42,
  landingRewarded: true, lunarSamples: [], quizCorrect: 0, earnedBadges: { first_step: true, mission_complete: true }, ...extra } });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
test.beforeEach(async ({ page }) => page.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
    if (/webgl/i.test(type)) return null; return (original as any).apply(this, [type, ...args]);
  };
}));
async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount(value); }, data);
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-available', 'true');
}
async function flight(page: Page) { return page.locator('[data-descent-canvas]').evaluate((cv: any) => cv._descentState()); }
async function evidence(page: Page) { return page.evaluate(() => {
  const d = (window as any).__toolData.moonMission;
  return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult, landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
}); }
async function capture(page: Page, info: TestInfo, name: string, selector = '[data-descent-prediction]') {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '.png');
  await page.locator(selector).screenshot({ path, animations: 'disabled' }); await info.attach(name, { path, contentType: 'image/png' });
}
async function axe(page: Page, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-descent-prediction]'),
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, name + '-axe.json'), JSON.stringify({ violations }, null, 2));
  expect(violations).toEqual([]);
}
async function landmarks(page: Page) {
  const result = await page.locator('[data-descent-prediction]').evaluate((root: HTMLElement) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    const cv = document.querySelector('[data-descent-canvas]') as any;
    const recorded = root.dataset.descentPredictionSource === 'recorded', t = Number(root.dataset.descentPredictionTime);
    const r = recorded ? d.landingResult.recording.samples.find((row: any) => Math.abs(row.t - t) < 1e-6) : null;
    const s = r ? { alt: r.alt, vVel: r.v, hVel: r.h, fuel: r.fuel, thrust: r.throttle, tilt: r.tilt,
      x: r.x, elapsed: r.t, contact: r.alt <= 0 } : cv._descentState();
    const p = P.descentPredictionProfile(s, { throttle: Number(root.dataset.descentPredictionThrottle),
      left: root.dataset.descentPredictionTilt === 'left', right: root.dataset.descentPredictionTilt === 'right' });
    const v = P.descentPredictionVisuals(p), output: any[] = [];
    for (const name of ['main', 'detail']) {
      const f = v[name]; if (!f) continue;
      const svg = root.querySelector(name === 'main' ? '[data-descent-prediction-diagram]' : '[data-descent-prediction-detail-diagram]') as SVGSVGElement;
      const matrix = svg.getScreenCTM()!, ticks: any[] = [];
      for (const axis of ['altitude', 'displacement']) for (let i = 0; i < 5; i++) {
        const node = root.querySelector('[data-descent-ruler="' + name + '-' + axis + '"][data-tick="' + i + '"]') as HTMLElement;
        if (getComputedStyle(node).display === 'none') continue;
        const box = node.getBoundingClientRect(), point = svg.createSVGPoint();
        point.x = axis === 'altitude' ? 36 : 36 + i * 132; point.y = axis === 'altitude' ? 36 + i * 72 : 324;
        const screen = point.matrixTransform(matrix);
        const actual = axis === 'altitude' ? box.y + box.height / 2 : i === 0 ? box.x : i === 4 ? box.right : box.x + box.width / 2;
        const expected = axis === 'altitude' ? screen.y : screen.x;
        const metres = axis === 'altitude' ? f.maxAltitude - i * f.verticalMetres / 4 : f.leftMetres + i * (f.rightMetres - f.leftMetres) / 4;
        ticks.push({ axis, i, actual, expected, value: Number(node.dataset.value), metres, font: parseFloat(getComputedStyle(node).fontSize) });
      }
      const origin = svg.querySelector('[data-descent-visual-origin]')!;
      const events = ['held', 'burn'].map(key => {
        const badge = root.querySelector('[data-descent-event="' + name + '-' + key + '"]') as HTMLElement;
        return { key, kind: badge.dataset.endpoint, visible: badge.dataset.endpointVisible === 'true',
          label: badge.querySelector('[data-descent-event-label]')!.textContent, time: Number(badge.dataset.time), altitude: Number(badge.dataset.altitude),
          expected: p[key].summary, inView: f[key + 'EndVisible'] };
      });
      output.push({ name, ticks, events, scaleX: matrix.a, scaleY: matrix.d, originX: Number(origin.getAttribute('x1')), initialX: f.initial.x });
    }
    return { views: output, contact: p.initial.contact, detail: !!v.detail };
  });
  for (const view of result.views) {
    expect(view.scaleX).toBeCloseTo(view.scaleY, 8); expect(view.originX).toBeCloseTo(view.initialX, 8);
    for (const tick of view.ticks) { expect(Math.abs(tick.actual - tick.expected)).toBeLessThan(.8); expect(tick.value).toBeCloseTo(tick.metres, 8); expect(tick.font).toBeGreaterThanOrEqual(12); }
    for (const event of view.events) {
      expect(event.kind).toBe(event.expected.kind); expect(event.time).toBe(event.expected.time); expect(event.altitude).toBe(event.expected.altitude);
      expect(event.visible).toBe(event.inView); if (!event.inView) expect(event.label).toBe('… Outside view');
    }
  }
  return result;
}

test('desktop rulers align with physical grid and endpoint summaries preserve paused flight', async ({ page }, info) => {
  await mount(page); const before = await flight(page), receipt = await evidence(page);
  const initial = await landmarks(page); expect(initial.views).toHaveLength(2);
  expect(initial.views.every(view => view.ticks.length === 10)).toBe(true);
  await capture(page, info, 'desktop-coast');
  await page.locator('[data-descent-throttle]').fill('65');
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-throttle', '0.65');
  await landmarks(page); await expect(page.locator('[data-descent-event="main-held"]')).toHaveAttribute('data-endpoint', 'arrest');
  expect(await flight(page)).toEqual(before); expect(await evidence(page)).toEqual(receipt);
  await capture(page, info, 'desktop-braking'); await capture(page, info, 'braking-rulers', '[data-descent-prediction-plot]'); await axe(page, 'desktop');
});

test('recorded inspection restores rulers and compact contact view without rewriting receipts', async ({ page }, info) => {
  await mount(page);
  const result = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, s: any = { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 };
    const rec = P.newDescentRecording(); P.recordDescent(rec, s, false);
    for (let i = 0; i < 3000 && !s.contact; i++) { P.descentStep(s, {}, 1 / 60); P.recordDescent(rec, s, !!s.contact); }
    return { crashed: true, score: 0, grade: '—', vVel: Math.abs(s.vVel), hVel: Math.abs(s.hVel), fuel: Math.round(s.fuel), fuelUnit: 's', recording: P.cleanDescentRecording(rec) };
  });
  await mount(page, seed({ landingResult: result, landingAttempts: [result] })); const receipt = await evidence(page);
  const ruler = page.locator('[data-descent-visual-rulers="main"]');
  await expect(page.locator('[data-descent-visual-caption="main"]')).toHaveText('Contact inspection');
  expect((await ruler.boundingBox())!.width).toBeLessThanOrEqual(360); const terminal = await landmarks(page);
  expect(terminal.contact).toBe(true); expect(terminal.detail).toBe(false);
  expect(terminal.views[0].events.every(event => event.time === 0 && event.altitude === 0)).toBe(true);
  await expect(page.locator('[data-descent-prediction-scale]')).toContainText('Both paths end at the inspected contact position');
  await capture(page, info, 'compact-contact');
  await page.locator('[data-landing-scrub]').fill('10');
  await expect.poll(async () => Number(await page.locator('[data-descent-prediction]').getAttribute('data-descent-prediction-time'))).toBeCloseTo(result.recording.samples[10].t, 8);
  const recorded = await landmarks(page); expect(recorded.contact).toBe(false); expect(recorded.detail).toBe(true);
  await expect(ruler).toHaveCSS('max-width', 'none'); await expect(page.locator('[data-descent-visual-caption="main"]')).toHaveText('Surface reference');
  await expect(page.locator('[data-descent-prediction-command="held"]')).toContainText('hypothetical future command');
  await capture(page, info, 'recorded-five-seconds');
  await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
  await expect(page.locator('[data-descent-prediction]')).toHaveAttribute('data-descent-prediction-inspection-contact', 'true');
  await landmarks(page); expect(await evidence(page)).toEqual(receipt);
});

test('320 px rulers and endpoint summaries remain readable with keyboard and forced colors', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page); const before = await flight(page), receipt = await evidence(page), toggle = page.locator('[data-descent-prediction-toggle]');
  await toggle.focus(); await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter'); await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const phone = await landmarks(page);
  for (const view of phone.views) { expect(view.ticks.filter(t => t.axis === 'displacement')).toHaveLength(3); expect(view.ticks.filter(t => t.axis === 'altitude')).toHaveLength(5); }
  expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const fonts = await page.locator('[data-descent-event], [data-descent-ruler]').evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
  expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await capture(page, info, 'phone-320'); await axe(page, 'phone');
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await landmarks(page);
  await expect(page.locator('[data-descent-prediction-path="held"]')).toHaveCSS('stroke-dasharray', 'none');
  await expect(page.locator('[data-descent-prediction-path="burn"]')).toHaveCSS('stroke-dasharray', '7px, 5px');
  await expect(page.locator('[data-descent-prediction-diagram] [data-descent-visual-origin]')).toHaveCSS('stroke-dasharray', '1px, 4px');
  await capture(page, info, 'phone-forced-colors'); await axe(page, 'phone-forced');
  expect(await flight(page)).toEqual(before); expect(await evidence(page)).toEqual(receipt);
});
