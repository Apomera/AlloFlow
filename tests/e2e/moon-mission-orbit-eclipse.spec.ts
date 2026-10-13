import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass57-2026-10-12/browser/orbit-eclipse');
const MAIN = '[data-orbit-canvas]';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1100, layout: 'document', appStyles: true });
// Independent circular-orbit geometry and strip integration. The oracle does
// not call the production eclipse helper or its analytic circle-overlap code.
const radius = 6371000 + 185000, omega = Math.sqrt(3.986004418e14 / radius ** 3);
const sunRadius = Math.asin(695700000 / 149597870700), earthRadius = Math.asin(6371000 / radius);
function visible(separation: number) {
  if (separation >= earthRadius + sunRadius) return 1;
  if (separation <= earthRadius - sunRadius) return 0;
  const earth = earthRadius / sunRadius, distance = separation / sunRadius, strips = 16384;
  let covered = 0;
  for (let n = 0; n < strips; n++) {
    const x = -1 + (n + 0.5) * 2 / strips;
    const solarHalf = Math.sqrt(1 - x * x), earthHalf = Math.sqrt(Math.max(0, earth * earth - (x - distance) ** 2));
    covered += Math.min(solarHalf, earthHalf) * 4 / strips;
  }
  return Math.max(0, Math.min(1, 1 - covered / Math.PI));
}
function event(coverage: number, exit: boolean) {
  let lo = earthRadius - 1.1 * sunRadius, hi = earthRadius + 1.1 * sunRadius;
  if (coverage === 0) lo = hi;
  else if (coverage === 1) hi = lo;
  else for (let n = 0; n < 42; n++) { const mid = (lo + hi) / 2; if (visible(mid) < 1 - coverage) lo = mid; else hi = mid; }
  const separation = (lo + hi) / 2;
  return { coverage, exit, separation, fraction: visible(separation), time: (1.5 * Math.PI + (exit ? separation : -separation)) / omega };
}
function nextContact(time: number) {
  const angles: [string, number][] = [['partial-entry', -earthRadius - sunRadius], ['total-entry', -earthRadius + sunRadius],
    ['total-exit', earthRadius - sunRadius], ['partial-exit', earthRadius + sunRadius]];
  const candidates = angles.map(([type, angle]) => {
    let at = (1.5 * Math.PI + angle) / omega;
    while (at <= time + 1e-7) at += 2 * Math.PI / omega;
    return { type, time: at, seconds: at - time };
  });
  return candidates.sort((a, b) => a.time - b.time)[0];
}
async function mount(page: Page, time = 0, checkpoint?: any) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(({ time, checkpoint }) => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    (window as any).__mount({ moonMission: checkpoint || { missionPhase: 2, animPaused: true, orbitPaused: true,
      soundOff: true, missionXP: 0, missionLog: [], earnedBadges: { first_step: true, mission_complete: true },
      difficulty: 'pilot', lunarSamples: [], quizCorrect: 0, orbitRun: { version: 1, time }, orbitPlaybackRate: 360 } });
    return document.fonts.ready.then(() => undefined);
  }, { time, checkpoint });
  await expect(page.locator(MAIN)).toBeVisible();
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function pixels(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    let hash = 2166136261;
    for (const b of cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data) hash = Math.imul(hash ^ b, 16777619);
    return hash >>> 0;
  });
}
async function settle(page: Page) {
  let previous = -1, same = 0;
  for (let n = 0; n < 30; n++) {
    await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => done())));
    const current = await pixels(page); same = current === previous ? same + 1 : 0; previous = current;
    if (same >= 2) return current;
  }
  throw new Error('Paused parking canvas did not settle');
}
async function capture(page: Page, info: TestInfo, name: string) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator('[data-orbit-workspace]').screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function axe(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-orbit-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  await info.attach(name, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
  expect(violations).toEqual([]);
}
async function evidence(page: Page, fraction: number) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement, fraction: number) => {
    const P = (window as any).MoonMissionPure, time = Number(cv.dataset.orbitTime), sample = P.orbitSnapshot(time);
    const illumination = P.orbitIllumination(time), W = cv.width / 2, H = cv.height / 2;
    const ex = W < 520 ? W * 0.40 : W * 0.34, ey = H * 0.53;
    const rx = Math.min(H * 0.22, W * 0.17) + 28, ry = rx * 0.92, tilt = -0.12;
    const c = Math.cos(tilt), s = Math.sin(tilt), px = Math.cos(sample.orbAng) * rx, py = Math.sin(sample.orbAng) * ry;
    const x = ex + px * c - py * s, y = ey + px * s + py * c;
    const tx = -Math.sin(sample.orbAng) * rx, ty = Math.cos(sample.orbAng) * ry;
    const angle = Math.atan2(tx * s + ty * c, tx * c - ty * s) + Math.PI / 2;
    const render = (f: number) => {
      const expected = document.createElement('canvas'); expected.width = cv.width; expected.height = cv.height;
      const ctx = expected.getContext('2d')!, k = 42 / 32.4;
      ctx.scale(2, 2); ctx.translate(x, y); ctx.rotate(angle);
      P.saturnV(ctx, 0, -21 - 8.9 * k, P.saturnVHeight() * k, 3, {
        les: false, orbitLight: P.orbitalCraftLight({ directionX: 1, directionY: 0, fraction: f }, angle) });
      return ctx.getImageData(0, 0, cv.width, cv.height).data;
    };
    const expected = render(fraction), binary = render(sample.inShadow ? 0 : 1);
    const actual = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let checked = 0, mismatches = 0, differsFromBinary = 0, alphaLosses = 0, maxDifference = 0;
    for (let i = 0; i < actual.length; i += 4) {
      if (expected[i + 3] !== 255) continue;
      checked++; if (actual[i + 3] !== 255) alphaLosses++;
      const delta = Math.max(...[0, 1, 2].map(k => Math.abs(actual[i + k] - expected[i + k])));
      maxDifference = Math.max(maxDifference, delta); if (delta > 1) mismatches++;
      if ([0, 1, 2].some(k => Math.abs(actual[i + k] - binary[i + k]) > 2)) differsFromBinary++;
    }
    const occultor = document.querySelector('[data-orbit-occultor]')!;
    return { time, illumination, dataset: { sun: cv.dataset.orbitSun, fraction: Number(cv.dataset.orbitSunFraction), engine: cv.dataset.orbitEngine },
      svg: { cx: Number(occultor.getAttribute('cx')), cy: Number(occultor.getAttribute('cy')), r: Number(occultor.getAttribute('r')) },
      checked, mismatches, differsFromBinary, alphaLosses, maxDifference, angle };
  }, fraction);
}

test.describe.configure({ timeout: 240000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('parking eclipse resolves the solar disc, intermediate opaque hull shading and model-time contacts', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true }); const rows: any[] = [], errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message)); await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [1100, 390]) {
    await page.setViewportSize({ width, height: width === 1100 ? 1100 : 844 });
    for (const exit of [false, true]) for (const coverage of [0, 0.25, 0.5, 0.75, 1]) {
      const reference = event(coverage, exit); await mount(page, reference.time); await settle(page);
      const row = { width, reference, ...await evidence(page, reference.fraction) }; rows.push(row);
      // Persist before assertions so even a real-pixel failure has inspectable evidence.
      await writeFile(join(REPORT, 'orbit-eclipse-measured.json'), JSON.stringify({ rows, errors }, null, 2));
      expect(row.illumination.fraction).toBeCloseTo(reference.fraction, 4);
      expect(row.illumination.separation).toBeCloseTo(reference.separation, 12);
      expect(row.illumination.sunAngularRadius).toBeCloseTo(sunRadius, 14);
      expect(row.illumination.earthAngularRadius).toBeCloseTo(earthRadius, 14);
      const contact = nextContact(reference.time);
      expect(row.illumination.nextContact.type).toBe(contact.type);
      expect(row.illumination.nextContact.time).toBeCloseTo(contact.time, 8);
      expect(row.illumination.nextContact.seconds).toBeCloseTo(contact.seconds, 8);
      expect(row.illumination.penumbraSeconds).toBeCloseTo(2 * sunRadius / omega, 10);
      expect(row.dataset.fraction).toBeCloseTo(reference.fraction, 4);
      expect(row.dataset.sun).toBe(coverage === 0 ? 'sunlit' : coverage === 1 ? 'total' : 'partial');
      expect(row.dataset.engine).toBe('off'); expect(row.checked).toBeGreaterThan(400);
      expect(row.mismatches).toBe(0); expect(row.alphaLosses).toBe(0);
      if (coverage > 0 && coverage < 1) expect(row.differsFromBinary).toBeGreaterThan(20);
      expect(row.svg.cx).toBeCloseTo(50 + (exit ? -1 : 1) * 32 * reference.separation / sunRadius, 5);
      expect(row.svg.cy).toBe(50); expect(row.svg.r).toBeCloseTo(32 * earthRadius / sunRadius, 5);
      await expect(page.locator('[data-orbit-solar-disc]')).toHaveAttribute('aria-hidden', 'true');
      await expect(page.locator('[data-orbit-value="light"]')).toHaveText(coverage === 0 ? 'Sunlit' : coverage === 1 ? 'Earth shadow' : 'Partial sunlight');
      await expect(page.locator('[data-orbit-value="solar"]')).toContainText(String(Math.round(reference.fraction * 100)));
      if (!exit && ((width === 1100 && [0, 0.5, 1].includes(coverage)) || (width === 390 && [0.25, 0.75].includes(coverage)))) {
        await capture(page, info, 'orbit-eclipse-' + Math.round(coverage * 100) + '-covered-' + width);
      }
      if (exit && coverage === 0.5) {
        await axe(page, info, 'orbit-eclipse-a11y-' + width);
        const snapshot = await saved(page), before = await settle(page);
        await page.waitForTimeout(150); expect(await settle(page)).toBe(before); expect(await saved(page)).toEqual(snapshot);
        await mount(page, 0, snapshot); expect(await settle(page)).toBe(before); expect(await saved(page)).toEqual(snapshot);
        const contactText = await page.locator('[data-orbit-value="contact"]').textContent();
        expect(contactText?.trim().length).toBeGreaterThan(5);
        for (const rate of ['1', '30', '120', '360']) {
          await page.locator('[data-orbit-rate]').selectOption(rate); await settle(page);
          const changed = await evidence(page, reference.fraction);
          expect(changed.time).toBe(reference.time); expect(changed.illumination.nextContact).toEqual(row.illumination.nextContact);
          expect(await page.locator('[data-orbit-value="contact"]').textContent()).toBe(contactText);
        }
      }
    }
  }
  const bounds = await page.locator('[data-orbit-instruments] button, [data-orbit-inspect], [data-orbit-rate], [data-orbit-eclipse]').evaluateAll(nodes => nodes.map(node => {
    const b = node.getBoundingClientRect(); return { tag: node.tagName, left: b.left, right: b.right, height: b.height };
  }));
  for (const b of bounds) { expect(b.left).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(390); if (b.tag !== 'DIV') expect(b.height).toBeGreaterThanOrEqual(44); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await mount(page, 0);
  const controls: any[] = [];
  for (const side of ['sunset', 'sunrise']) {
    await page.locator('[data-orbit-inspect="' + side + '"]').click(); await settle(page);
    const state = await saved(page), time = await page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => Number(cv.dataset.orbitTime));
    const expectedTime = (1.5 * Math.PI + (side === 'sunrise' ? earthRadius : -earthRadius)) / omega;
    expect(time).toBeCloseTo(expectedTime, 8); expect(state.orbitPaused).toBe(true); expect(state.orbitPlaybackRate).toBe(1);
    expect(state.missionPhase).toBe(2); expect(state.missionXP).toBe(0); expect(state.tliStarted || false).toBe(false);
    await expect(page.locator(MAIN)).toHaveAttribute('data-orbit-sun', 'partial'); controls.push({ side, time, state });
  }
  await mount(page, 1000000);
  await expect(page.locator('[data-orbit-inspect="sunset"]')).toBeDisabled();
  await expect(page.locator('[data-orbit-inspect="sunrise"]')).toBeDisabled();
  await mount(page, 0, controls[1].state);
  await page.locator('[data-orbit-window-next]').click(); await expect(page.locator(MAIN)).toHaveAttribute('data-orbit-window', 'go');
  const aligned = await saved(page); expect(aligned.orbitPaused).toBe(true); expect(aligned.missionXP).toBe(0);
  expect(aligned.tliStarted || false).toBe(false); expect(aligned.tliAccuracy ?? null).toBeNull();
  await page.getByRole('button', { name: /Execute TLI Burn/ }).click();
  await expect(page.locator('[data-tli-canvas]')).toBeVisible(); await expect(page.locator('[data-tli-proceed]')).toBeDisabled();
  const ignition = await saved(page); expect(ignition.missionPhase).toBe(2); expect(ignition.missionXP).toBe(0);
  expect(ignition.tliAccuracy.onTime).toBe(true); expect(ignition.tliResult).toBeNull(); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'orbit-eclipse-measured.json'), JSON.stringify({ rows, bounds, controls, aligned, ignition, errors,
    oracle: { strips: 16384, sunRadius, earthRadius, omega, penumbraSeconds: 2 * sunRadius / omega } }, null, 2));
});
