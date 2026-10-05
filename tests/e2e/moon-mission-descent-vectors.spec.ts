import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DESCENT_VECTOR_REPORT_DIR || 'reports/moon-mission-enhancement-pass20-2026-10-03/browser/vectors');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1100,
  height: 1000, layout: 'document', appStyles: true });
const seed = (extra: Record<string, unknown> = {}) => ({ moonMission: { missionPhase: 5, descentStarted: true,
  descentPredictionOpen: false, animPaused: true, soundOff: true, difficulty: 'pilot', missionXP: 42,
  landingRewarded: true, lunarSamples: [], quizCorrect: 0, earnedBadges: { first_step: true, mission_complete: true }, ...extra } });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));
async function mount(page: Page, data = seed()) {
  await page.goto(harness.url + '/__harness'); await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; (window as any).__mount(value); }, data);
  await expect(page.locator('[data-descent-vectors]')).toHaveCount(1);
  await expect.poll(async () => await page.locator('[data-descent-canvas]').getAttribute('data-descent-paused')).toBe('true');
}
async function open(page: Page) {
  await page.locator('[data-descent-vectors] > summary').click();
  await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('open', '');
  await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-available', 'true');
}
async function flight(page: Page) { return page.locator('[data-descent-canvas]').evaluate((cv: any) => cv._descentState()); }
async function evidence(page: Page) { return page.evaluate(() => {
  const d = (window as any).__toolData.moonMission;
  return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult, landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
}); }
async function capture(page: Page, info: TestInfo, name: string, selector = '[data-descent-vectors]') {
  await mkdir(REPORT, { recursive: true }); const path = join(REPORT, name + '.png');
  await page.locator(selector).screenshot({ path, animations: 'disabled' }); await info.attach(name, { path, contentType: 'image/png' });
}
async function axe(page: Page, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-descent-vectors]'),
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
  await mkdir(REPORT, { recursive: true }); await writeFile(join(REPORT, name + '-axe.json'), JSON.stringify({ violations }, null, 2)); expect(violations).toEqual([]);
}
async function check(page: Page) {
  const measured = await page.locator('[data-descent-vectors]').evaluate((root: HTMLDetailsElement) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission, cv = document.querySelector('[data-descent-canvas]') as any;
    const recorded = root.dataset.descentVectorSource === 'recorded', time = Number(root.dataset.descentVectorTime);
    const row = recorded ? d.landingResult.recording.samples.find((r: any) => Math.abs(r.t - time) < 1e-6) : null;
    const s = row ? { alt: row.alt, vVel: row.v, hVel: row.h, fuel: row.fuel, thrust: row.throttle, tilt: row.tilt,
      x: row.x, elapsed: row.t, contact: row.alt <= 0 } : cv._descentState();
    const g = P.descentVectorGeometry(s), panes: any[] = [];
    for (const name of ['motion', 'forces']) {
      if (name === 'forces' && !g.forces) continue;
      const svg = root.querySelector('[data-descent-vector-diagram="' + name + '"]') as SVGSVGElement, matrix = svg.getScreenCTM()!;
      const geometry = name === 'motion' ? g.motion : g.forces;
      const ends = (name === 'motion' ? ['velocity'] : ['engine', 'gravity', 'net']).map(key => {
        const a = name === 'motion' ? g.motion.arrow : g.forces.arrows[key], n = svg.querySelector('[data-descent-vector-ring="' + key + '"]')!;
        return { key, x: Number(n.getAttribute('cx')), y: Number(n.getAttribute('cy')), expected: a,
          visible: getComputedStyle(svg.querySelector('[data-descent-vector-arrow="' + key + '"]')!).display !== 'none' };
      });
      panes.push({ name, scaleX: matrix.a, scaleY: matrix.d, range: Number(svg.dataset.vectorRange), expectedRange: geometry.range, ends });
    }
    return { state: s, geometry: g, actualThrottle: Number(root.dataset.descentVectorActualThrottle), time, panes };
  });
  expect(measured.actualThrottle).toBe(measured.geometry.sample.actualThrottle); expect(measured.time).toBeCloseTo(measured.state.elapsed, 8);
  for (const pane of measured.panes) {
    expect(pane.scaleX).toBeCloseTo(pane.scaleY, 8); expect(pane.range).toBe(pane.expectedRange);
    for (const end of pane.ends) { expect(end.x).toBeCloseTo(end.expected.x, 8); expect(end.y).toBeCloseTo(end.expected.y, 8); expect(end.visible).toBe(end.expected.visible); }
  }
  return measured;
}

test.describe('fallback flight vector instruments', () => {
  test.beforeEach(async ({ page }) => page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
      if (/webgl/i.test(type)) return null; return (original as any).apply(this, [type, ...args]);
    };
  }));

  test('paused desktop vectors show actual measurements and do not operate the lander', async ({ page }, info) => {
    await mount(page); const root = page.locator('[data-descent-vectors]'), before = await flight(page), receipt = await evidence(page);
    await expect(root).not.toHaveAttribute('open', ''); await expect(root).not.toHaveAttribute('data-descent-vector-available', 'true');
    await open(page); const first = await check(page); expect(first.geometry.forces.range).toBe(10); expect(first.actualThrottle).toBe(0);
    await page.locator('[data-descent-throttle]').fill('65'); await expect(page.locator('[data-throttle-setting]')).toHaveText('65%');
    await check(page); await expect(page.locator('[data-descent-vector-value="thrust"]')).toHaveText('0.00 kN');
    expect(await flight(page)).toEqual(before); expect(await evidence(page)).toEqual(receipt);
    expect(await page.evaluate(() => Object.keys((window as any).__toolData.moonMission).filter(key => /vector/i.test(key)))).toEqual([]);
    await capture(page, info, 'desktop-coast'); await capture(page, info, 'coast-vector-diagrams', '[data-descent-vector-content]'); await axe(page, 'desktop');
  });

  test('recorded tilted burn and contact preserve receipts and omit missing legacy vectors', async ({ page }, info) => {
    await mount(page);
    const result = await page.evaluate(() => {
      const P = (window as any).MoonMissionPure, s: any = { alt: 300, vVel: -9, hVel: 4, fuel: 110, thrust: 0, tilt: 0, x: 0, elapsed: 0 };
      const rec = P.newDescentRecording(); P.recordDescent(rec, s, false);
      for (let i = 0; i < 3000 && !s.contact; i++) {
        P.descentStep(s, s.elapsed >= 2 && s.elapsed < 4 ? { throttle: .65, left: true } : {}, 1 / 60);
        P.recordDescent(rec, s, !!s.contact);
      }
      return { crashed: true, score: 0, grade: '—', vVel: Math.abs(s.vVel), hVel: Math.abs(s.hVel), fuel: Math.round(s.fuel), fuelUnit: 's', recording: P.cleanDescentRecording(rec) };
    });
    await mount(page, seed({ landingResult: result, landingAttempts: [result] })); const receipt = await evidence(page); await open(page);
    await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-forces-available', 'false');
    const terminal = await check(page); expect(terminal.geometry.forces).toBeNull();
    await expect(page.locator('[data-descent-vector-plot="forces"]')).toBeHidden(); await capture(page, info, 'contact-velocity');
    await page.locator('[data-landing-scrub]').fill('6');
    await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-forces-available', 'true');
    await expect.poll(async () => Number(await page.locator('[data-descent-vectors]').getAttribute('data-descent-vector-time'))).toBeCloseTo(result.recording.samples[6].t, 8);
    const burn = await check(page); expect(burn.geometry.sample.forces.engine.x).toBeLessThan(0); expect(burn.geometry.sample.velocity.x).toBeGreaterThan(0);
    await capture(page, info, 'recorded-tilted-burn'); await capture(page, info, 'tilted-vector-diagrams', '[data-descent-vector-content]');
    await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
    await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-forces-available', 'false'); await check(page);
    expect(await evidence(page)).toEqual(receipt);
    await mount(page, seed({ landingResult: { crashed: false, score: 84, grade: 'B', vVel: 1.2, hVel: 2, fuel: 70 } }));
    const legacy = await evidence(page); await page.locator('[data-descent-vectors] > summary').click();
    await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-available', 'false');
    await expect(page.locator('[data-descent-vector-content]')).toBeHidden(); await expect(page.locator('[data-descent-vector-source-label]')).toContainText('no recorded state');
    expect(await evidence(page)).toEqual(legacy); await capture(page, info, 'legacy-no-vectors');
  });

  test('320 px flight vectors support keyboard, reduced motion and forced colors', async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 850 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await mount(page);
    const before = await flight(page), receipt = await evidence(page), summary = page.locator('[data-descent-vectors] > summary');
    await summary.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-descent-vectors]')).toHaveAttribute('data-descent-vector-available', 'true');
    await check(page); expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    const fonts = await page.locator('[data-descent-vectors] p, [data-descent-vectors] dl, [data-descent-vectors] figcaption')
      .evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
    expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12); expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const motion = await page.locator('[data-descent-vector-diagram="motion"]').boundingBox(), forces = await page.locator('[data-descent-vector-diagram="forces"]').boundingBox();
    expect(forces!.y).toBeGreaterThan(motion!.y + motion!.height); await capture(page, info, 'phone-320'); await axe(page, 'phone');
    await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await check(page);
    await expect(page.locator('[data-descent-vector-arrow="gravity"]')).toHaveCSS('stroke-dasharray', '5px, 4px');
    await expect(page.locator('[data-descent-vector-arrow="net"]')).toHaveCSS('stroke-dasharray', '1px, 4px');
    await expect(page.locator('[data-descent-vector-arrow="velocity"]')).toHaveCSS('stroke-dasharray', 'none');
    await capture(page, info, 'phone-forced-colors'); await axe(page, 'phone-forced');
    await summary.focus(); await page.keyboard.press('Enter'); await expect(page.locator('[data-descent-vectors]')).not.toHaveAttribute('open', '');
    expect(await flight(page)).toEqual(before); expect(await evidence(page)).toEqual(receipt);
  });
});

test('WebGL flight vectors follow engine and attitude response while physical time stays independent', async ({ page }, info) => {
  await mount(page); await open(page); const before = await flight(page), receipt = await evidence(page);
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  await expect.poll(async () => (await harness.glScene(page, '[data-descent-session]'))?.draws || 0, { timeout: 30000 }).toBeGreaterThan(0);
  const contexts = await harness.glContexts(page); expect(contexts.some(c => c.createdBy === 'page' && !c.lost && c.draws > 0)).toBe(true);
  const pausedScene = await harness.glScene(page, '[data-descent-session]');
  await page.waitForTimeout(300);
  expect((await harness.glScene(page, '[data-descent-session]'))!.draws).toBe(pausedScene!.draws);
  await page.locator('select[data-descent-camera]').selectOption('overhead');
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', 'overhead');
  const overheadScene = await harness.glScene(page, '[data-descent-session]'); expect(overheadScene!.draws).toBeGreaterThan(pausedScene!.draws);
  await page.setViewportSize({ width: 1000, height: 900 });
  await expect.poll(async () => (await harness.glScene(page, '[data-descent-session]'))!.draws).toBeGreaterThan(overheadScene!.draws);
  await page.locator('select[data-descent-camera]').selectOption('chase');
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', 'chase');
  expect(await flight(page)).toEqual(before);
  await page.locator('[data-descent-throttle]').fill('65'); await page.locator('[data-descent-pause]').click();
  const cv = page.locator('[data-descent-canvas]'); await cv.focus(); await page.keyboard.down('d');
  await expect.poll(async () => (await flight(page)).elapsed).toBeGreaterThan(.8);
  await page.locator('[data-descent-pause]').click(); await page.keyboard.up('d');
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  const held = await flight(page);
  await expect.poll(async () => Number(await page.locator('[data-descent-vectors]').getAttribute('data-descent-vector-time'))).toBeCloseTo(held.elapsed, 8);
  const measured = await check(page); expect(measured.state.fuel).toBeLessThan(before.fuel); expect(measured.state.hVel).toBeGreaterThan(before.hVel);
  expect(measured.geometry.sample.forces.net.x).toBeGreaterThan(0); expect(measured.actualThrottle).toBeGreaterThan(.6); expect(measured.state.tilt).toBeGreaterThan(.3);
  const heldScene = await harness.glScene(page, '[data-descent-session]');
  await page.waitForTimeout(300);
  expect((await harness.glScene(page, '[data-descent-session]'))!.draws).toBe(heldScene!.draws);
  expect(await flight(page)).toEqual(held);
  expect(await evidence(page)).toEqual(receipt); await capture(page, info, 'live-tilted-burn');
  await capture(page, info, 'flight-view-webgl', '[data-descent-canvas]');
  await writeFile(join(REPORT, 'webgl-evidence.json'), JSON.stringify({ contexts, scene: await harness.glScene(page, '[data-descent-session]'),
    pausedScene, overheadScene, heldScene, unchangedPausedDraws: true, cameraAndResizeRedraw: true, before, held }, null, 2));
});
