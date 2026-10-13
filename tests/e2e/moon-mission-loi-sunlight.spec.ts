import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_LOI_SUNLIGHT_REPORT_DIR || 'reports/moon-mission-enhancement-pass48-2026-10-11/browser/sunlight');
const MAIN = '[data-loi-canvas]';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const seed = () => ({ moonMission: { missionPhase: 4, animPaused: true, loiPaused: true, soundOff: true,
  missionXP: 0, missionLog: [], earnedBadges: { first_step: true, mission_complete: true },
  difficulty: 'pilot', lunarSamples: [], quizCorrect: 0 } });
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function mount(page: Page, data: any = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => { document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999; (window as any).__mount(value); }, data);
  await expect(page.locator(MAIN)).toBeVisible();
  await expect(page.locator(MAIN)).toHaveAttribute('data-loi-sun-angle', '45');
}
async function seek(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await page.locator('[data-loi-seek]').evaluate((input: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-loi-time'))).toBeCloseTo(time, 6);
  return time;
}
async function pixels(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    let hash = 2166136261;
    for (const value of cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data) hash = Math.imul(hash ^ value, 16777619);
    return hash >>> 0;
  });
}
async function inspect(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, data = (window as any).__toolData.moonMission;
    const profile = P.loiProfile(P.cleanLoiPlayback(data).loiPlan), sample = P.loiSample(profile, Number(cv.dataset.loiTime));
    const scratch = document.createElement('canvas'); scratch.width = cv.width / 2; scratch.height = cv.height / 2;
    const picture = P.drawLOIScene(scratch.getContext('2d'), scratch.width, scratch.height, sample, profile, { time: sample.time });
    return { time: Number(cv.dataset.loiTime), phase: cv.dataset.loiSun, fraction: cv.dataset.loiSunFraction,
      angle: Number(cv.dataset.loiSunAngle), radio: cv.dataset.loiRadio, engine: cv.dataset.loiEngine,
      sample, picture, width: scratch.width, height: scratch.height };
  });
}
// Independent angular geometry uses atan2 of cross/dot products. The partial
// disc fraction is integrated in strips, independently of the runtime's lens formula.
function solarReference(s: any, angle = 45) {
  const radius = 1737400, distance = 149597870700, solarRadius = 695700000;
  const orbitRadius = Math.hypot(s.x, s.y); if (orbitRadius <= radius) return null;
  const theta = angle * Math.PI / 180, sx = distance * Math.cos(theta) - s.x, sy = distance * Math.sin(theta) - s.y;
  const solarRange = Math.hypot(sx, sy), solar = Math.asin(solarRadius / solarRange), lunar = Math.asin(radius / orbitRadius);
  const separation = Math.atan2(Math.abs(-s.x * sy + s.y * sx), -s.x * sx - s.y * sy);
  const phase = separation <= lunar - solar ? 'total' : separation < lunar + solar ? 'partial' : 'sunlit';
  let fraction = phase === 'total' ? 0 : 1;
  if (phase === 'partial') {
    const n = 8192, dx = 2 * solar / n;
    let covered = 0;
    for (let i = 0; i < n; i++) {
      const x = -solar + (i + 0.5) * dx;
      const sunHeight = Math.sqrt(Math.max(0, solar * solar - x * x));
      const moonHeight = Math.sqrt(Math.max(0, lunar * lunar - (x - separation) ** 2));
      covered += 2 * Math.min(sunHeight, moonHeight) * dx;
    }
    fraction = Math.max(0, Math.min(1, 1 - covered / (Math.PI * solar * solar)));
  }
  return { phase, fraction, separation, solarRadius: solar, lunarRadius: lunar };
}
async function verifyLive(page: Page, row: any) {
  const expected = solarReference(row.sample);
  expect(row.angle).toBe(45);
  expect(row.radio).toBe(row.sample.x <= 0 || Math.abs(row.sample.y) >= 1737400 ? 'contact' : 'blocked');
  expect((row.picture.craftX - row.picture.moonX) / row.picture.pictureScale).toBeCloseTo(row.sample.x, 6);
  expect((row.picture.moonY - row.picture.craftY) / row.picture.pictureScale).toBeCloseTo(row.sample.y, 6);
  expect(row.picture.moonRadius / row.picture.pictureScale).toBeCloseTo(1737400, 6);
  if (!expected) {
    expect(row.phase).toBe('surface'); expect(row.fraction).toBe(''); expect(row.picture.sunlight).toBeNull();
    await expect(page.locator('[data-loi-value="sun"]')).toHaveText('At lunar surface');
    await expect(page.locator('[data-loi-value="sunFraction"]')).toHaveText('—');
  } else {
    expect(row.phase).toBe(expected.phase);
    expect(Math.abs(Number(row.fraction) - expected.fraction)).toBeLessThan(0.00005);
    expect(row.picture.sunlight.phase).toBe(expected.phase);
    expect(row.picture.sunlight.fraction).toBe(Number(row.fraction));
    await expect(page.locator('[data-loi-value="sun"]')).toHaveText(expected.phase === 'total' ? 'Total eclipse' : expected.phase === 'partial' ? 'Partial eclipse' : 'Full sunlight');
    await expect(page.locator('[data-loi-value="sunFraction"]')).toHaveText((Number(row.fraction) * 100).toFixed(1) + '%');
  }
  await expect(page.locator('[data-loi-value="radio"]')).toHaveText(row.radio === 'contact' ? 'Earth in view' : 'Loss of signal');
}
async function capture(page: Page, info: TestInfo, name: string, workspace = false, selector = MAIN) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(workspace ? '[data-loi-workspace]' : selector).screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-loi-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  await info.attach(name, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
  expect(violations).toEqual([]);
}
async function renderEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const hash = (data: Uint8ClampedArray) => { let h = 2166136261; for (const value of data) h = Math.imul(h ^ value, 16777619); return h >>> 0; };
    const rows = [45, 90, 135].map(angle => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 256;
      const ctx = cv.getContext('2d')!, result = P.drawLunarOrbitLight(ctx, 128, 128, 128, angle);
      const data = ctx.getImageData(0, 0, 256, 256).data, probes: any[] = [];
      let paintedOutside = 0, transparentInside = 0, outsideCount = 0, insideCount = 0;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const rho = Math.hypot(x + 0.5 - 128, y + 0.5 - 128), offset = (y * 256 + x) * 4;
        if (rho > 130) { outsideCount++; if (data[offset + 3] !== 0) paintedOutside++; }
        if (rho < 125) { insideCount++; if (data[offset + 3] !== 255) transparentInside++; }
        if (x % 12 === 6 && y % 12 === 6 && rho < 120)
          probes.push({ x, y, rgba: Array.from(data.slice(offset, offset + 4)) });
      }
      return { angle, result, probes, paintedOutside, transparentInside, outsideCount, insideCount, hash: hash(data) };
    });
    const profile = P.loiProfile(), sample = Object.freeze(P.loiSample(profile, 0)), before = JSON.stringify({ sample, profile });
    const scenes = [0, 200].map(time => {
      const cv = document.createElement('canvas'); cv.width = 700; cv.height = 340;
      const ctx = cv.getContext('2d')!, result = P.drawLOIScene(ctx, 700, 340, sample, profile, { time });
      return { time, result, hash: hash(ctx.getImageData(0, 0, 700, 340).data) };
    });
    return { rows, scenes, inputUnchanged: JSON.stringify({ sample, profile }) === before };
  });
}
function verifyPixels(evidence: any) {
  for (const row of evidence.rows) {
    expect(row.result).toEqual({ angle: row.angle, radius: 128 });
    expect(row.paintedOutside).toBe(0); expect(row.transparentInside).toBe(0);
    expect(row.outsideCount).toBeGreaterThan(10000); expect(row.insideCount).toBeGreaterThan(40000);
    expect(row.probes.length).toBeGreaterThan(250);
    for (const probe of row.probes) {
      const u = (probe.x + 0.5) / 128 - 1, v = 1 - (probe.y + 0.5) / 128;
      const z = Math.sqrt(1 - u * u - v * v), theta = row.angle * Math.PI / 180;
      const sx = 149597870700 * Math.cos(theta) - 1737400 * u;
      const sy = 149597870700 * Math.sin(theta) - 1737400 * v, sz = -1737400 * z;
      const incidence = (u * sx + v * sy + z * sz) / Math.hypot(sx, sy, sz);
      const brightness = 0.055 + 0.945 * Math.max(0, incidence) ** 0.6;
      expect(probe.rgba).toEqual([Math.round(190 * brightness), Math.round(190 * brightness), Math.round(183 * brightness), 255]);
    }
  }
  expect(new Set(evidence.rows.map((r: any) => r.hash)).size).toBe(3);
  expect(evidence.scenes[0].hash).toBe(evidence.scenes[1].hash);
  expect(evidence.scenes[0].result).toEqual(evidence.scenes[1].result); expect(evidence.inputUnchanged).toBe(true);
}
async function epochs(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, p = P.loiProfile();
    const rows = p.samples.map((s: any) => ({ ...s, sun: P.lunarSunlight(s, 45) }));
    const sunlit = rows.find((s: any) => s.sun?.phase === 'sunlit' && !s.radioVisible);
    const total = rows.find((s: any) => s.sun?.phase === 'total' && s.radioVisible);
    let partial = rows.find((s: any) => s.sun?.phase === 'partial' && s.sun.fraction > 0.05 && s.sun.fraction < 0.95);
    if (!partial) {
      for (let i = 1; i < rows.length; i++) {
        const margin = (s: any) => s.sun.separation - s.sun.moonAngularRadius;
        if (!rows[i-1].sun || !rows[i].sun || margin(rows[i-1]) * margin(rows[i]) >= 0) continue;
        let left = rows[i-1].time, right = rows[i].time, leftSign = Math.sign(margin(rows[i-1]));
        for (let n = 0; n < 18; n++) {
          const time = (left + right) / 2, s = P.loiSample(p, time), sun = P.lunarSunlight(s, 45);
          if (Math.sign(sun.separation - sun.moonAngularRadius) === leftSign) left = time; else right = time;
        }
        partial = { time: (left + right) / 2 }; break;
      }
    }
    return { sunlit: sunlit?.time, total: total?.time, partial: partial?.time, duration: p.summary.duration, summary: p.summary };
  });
}

test('measured insertion sunlight follows surface normals and solar disc contacts across desktop and phone review', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page);
  await expect(page.locator(MAIN)).toHaveAttribute('aria-describedby', 'mm-loi-light-note');
  const note = page.locator('[data-loi-light-note]');
  for (const text of [/45°/, /fixed teaching preset/, /spherical surface normals/, /partial and total eclipse/, /radio contact is calculated separately/, /illustrative/]) await expect(note).toContainText(text);
  const initial = await saved(page), evidence = await renderEvidence(page); verifyPixels(evidence);
  expect(await saved(page)).toEqual(initial);
  const times = await epochs(page); expect(times.sunlit).toBeDefined(); expect(times.total).toBeDefined(); expect(times.partial).toBeDefined();
  const rows: any[] = [];
  for (const [name, time, phase] of [['sunlit', times.sunlit, 'sunlit'], ['partial', times.partial, 'partial'], ['total', times.total, 'total']] as const) {
    await seek(page, time!); const row = await inspect(page); await verifyLive(page, row); rows.push(row);
    expect(row.phase).toBe(phase);
    if (phase === 'sunlit') expect(row.radio).toBe('blocked');
    if (phase === 'total') expect(row.radio).toBe('contact');
    await capture(page, info, 'insertion-' + name + '-1100');
  }
  await accessibility(page, info, 'insertion-light-a11y-1100');
  const fixed = await inspect(page), fixedState = await saved(page), fixedPixels = await pixels(page);
  await page.waitForTimeout(150); expect(await inspect(page)).toEqual(fixed); expect(await pixels(page)).toBe(fixedPixels); expect(await saved(page)).toEqual(fixedState);
  await page.locator('[data-loi-result]').click(); await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  const captured = await saved(page); expect(captured.loiRun.recorded).toBe(true); expect(captured.loiResult.outcome).toBe('captured'); expect(captured.missionXP).toBe(0);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  await seek(page, times.partial!); const phone = await inspect(page); await verifyLive(page, phone); rows.push(phone);
  await capture(page, info, 'insertion-partial-320'); await capture(page, info, 'insertion-workspace-320', true);
  await accessibility(page, info, 'insertion-light-a11y-320');
  const reviewed = await saved(page), phonePixels = await pixels(page);
  expect(reviewed.loiResult).toEqual(captured.loiResult); expect(reviewed.loiRun.recorded).toBe(true); expect(reviewed.missionXP).toBe(0);
  expect(reviewed.earnedBadges).toEqual(initial.earnedBadges); expect(reviewed.missionLog).toEqual(initial.missionLog);
  await mount(page, { moonMission: reviewed }); expect(await saved(page)).toEqual(reviewed); expect(await pixels(page)).toBe(phonePixels); await verifyLive(page, await inspect(page));
  await page.locator('[data-loi-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-loi-time'))).toBeCloseTo(phone.time + 0.1, 6);
  const keyboard = await saved(page); expect(keyboard.loiResult).toEqual(captured.loiResult); expect(keyboard.missionXP).toBe(0);
  await page.locator('[data-environment-toggle]').click();
  await page.locator('[data-environment-sun-control]').selectOption('90');
  await expect(page.locator('[data-environment-canvas]')).toBeVisible();
  await capture(page, info, 'insertion-shared-environment-90-320', false, '[data-environment-canvas]');
  expect((await saved(page)).loiResult).toEqual(captured.loiResult); expect((await saved(page)).missionXP).toBe(0);
  const bounds = await page.locator('[data-loi-workspace]').evaluate(el => {
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height }; };
    return { overflow: document.documentElement.scrollWidth > innerWidth, note: box(el.querySelector('[data-loi-light-note]')!),
      instruments: box(el.querySelector('[data-loi-instruments]')!), seek: box(el.querySelector('[data-loi-seek]')!) };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.seek.height).toBeGreaterThanOrEqual(32);
  for (const region of [bounds.note, bounds.instruments, bounds.seek]) { expect(region.left).toBeGreaterThanOrEqual(0); expect(region.right).toBeLessThanOrEqual(320); }
  await page.locator('[data-loi-preset="overburn"]').click(); await expect(page.locator('[data-loi-proceed]')).toBeDisabled();
  expect((await saved(page)).loiResult).toBeNull();
  await page.locator('[data-loi-result]').click(); await expect(page.locator('[data-loi-proceed]')).toBeDisabled();
  const impacted = await saved(page); expect(impacted.loiResult.outcome).toBe('impact'); expect(impacted.missionXP).toBe(0);
  const impact = await inspect(page); await verifyLive(page, impact); expect(impact.phase).toBe('surface'); rows.push(impact);
  await capture(page, info, 'insertion-impact-320');
  await page.locator('[data-loi-preset="nominal"]').click(); expect((await saved(page)).loiResult).toBeNull();
  await expect(page.locator('[data-loi-proceed]')).toBeDisabled();
  await page.locator('[data-loi-result]').click(); await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  await page.locator('[data-loi-proceed]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(5);
  const descended = await saved(page); expect(descended.missionXP).toBe(15); expect(descended.loiAwarded).toBe(true);
  await mount(page, { moonMission: { ...descended, missionPhase: 4 } });
  await page.locator('[data-loi-proceed]').click(); await expect.poll(async () => (await saved(page)).missionPhase).toBe(5);
  expect((await saved(page)).missionXP).toBe(15); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'insertion-sunlight-measured.json'), JSON.stringify({ times, evidence, rows, bounds, errors }, null, 2));
});
