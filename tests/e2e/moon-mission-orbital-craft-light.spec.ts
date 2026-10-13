import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_ORBITAL_CRAFT_REPORT_DIR || 'reports/moon-mission-enhancement-pass49-2026-10-11/browser/craft');
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


// Real Canvas spacecraft checks and workflow are authored below.

async function craftEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const hash = (bytes: Uint8ClampedArray) => { let h = 2166136261; for (const value of bytes) h = Math.imul(h ^ value, 16777619); return h >>> 0; };
    const direction = Object.freeze({ directionX: 3, directionY: 4, fraction: 1 });
    const before = JSON.stringify(direction);
    function draw(fraction: number, engineOn: boolean, angle = 0, cancel = false, sunlight: any = 'default') {
      const cv = document.createElement('canvas'); cv.width = 680; cv.height = 300;
      const ctx = cv.getContext('2d')!; ctx.translate(220, 150); if (cancel) ctx.rotate(-angle);
      const opts: any = { engineOn, thrust: engineOn ? 1 : 0, time: 17 };
      if (sunlight === 'legacy') {}
      else if (sunlight !== 'default') opts.sunlight = sunlight;
      else opts.sunlight = Object.freeze({ ...direction, fraction });
      const result = P.drawLOIStack(ctx, 0, 0, 2, angle, opts);
      return { cv, result, pixels: ctx.getImageData(0, 0, cv.width, cv.height).data };
    }
    const fractions = [1, 0.5, 0], groups: any[] = [], gallery = document.createElement('canvas');
    gallery.width = 960; gallery.height = 330; gallery.dataset.craftComparison = 'true';
    const g = gallery.getContext('2d')!; g.fillStyle = '#06101e'; g.fillRect(0, 0, 960, 330);
    g.fillStyle = '#f8fafc'; g.font = '18px system-ui'; g.fillText('Same spacecraft and Sun direction · eclipse fraction changes hull light', 20, 29);
    for (const engineOn of [false, true]) {
      const pictures = fractions.map(fraction => draw(fraction, engineOn));
      let alphaDifferences = 0, monotoneViolations = 0, changedHullPixels = 0, plumeDifferences = 0, plumePixels = 0;
      let opaqueHullPixels = 0, illuminatedTotal = 0, eclipsedTotal = 0, partialTotal = 0;
      for (let i = 0; i < pictures[0].pixels.length; i += 4) {
        const values = pictures.map(picture => picture.pixels), x = (i / 4) % 680;
        if (values[0][i+3] !== values[1][i+3] || values[1][i+3] !== values[2][i+3]) alphaDifferences++;
        // The bell ends at x=340. Beyond x=350 the isolated pixels are exhaust.
        if (x > 350 && values[0][i+3]) {
          plumePixels++;
          if ([0,1,2,3].some(channel => values[0][i+channel] !== values[1][i+channel] || values[1][i+channel] !== values[2][i+channel])) plumeDifferences++;
        }
        if (x <= 340 && values.every(value => value[i+3] === 255)) {
          opaqueHullPixels++;
          let different = false;
          for (let channel = 0; channel < 3; channel++) {
            if (values[0][i+channel] + 1 < values[1][i+channel] || values[1][i+channel] + 1 < values[2][i+channel]) monotoneViolations++;
            if (values[0][i+channel] !== values[2][i+channel]) different = true;
            illuminatedTotal += values[0][i+channel]; partialTotal += values[1][i+channel]; eclipsedTotal += values[2][i+channel];
          }
          if (different) changedHullPixels++;
        }
      }
      groups.push({ engineOn, alphaDifferences, monotoneViolations, changedHullPixels, opaqueHullPixels,
        plumePixels, plumeDifferences, illuminatedTotal, partialTotal, eclipsedTotal,
        renders: pictures.map((picture, index) => ({ fraction: fractions[index], result: picture.result, hash: hash(picture.pixels) })) });
      pictures.forEach((picture, index) => {
        const y = engineOn ? 240 : 115;
        g.fillStyle = '#cbd5e1'; g.font = '14px system-ui';
        g.fillText(Math.round(fractions[index] * 100) + '% sunlight · SPS ' + (engineOn ? 'on' : 'off'), index * 320 + 20, y - 39);
        P.drawLOIStack(g, index * 320 + 120, y, 1.5, 0, { sunlight: { ...direction, fraction: fractions[index] }, engineOn, thrust: engineOn ? 1 : 0, time: 17 });
      });
    }
    document.body.appendChild(gallery);
    const a = Math.PI / 2, original = draw(1, false, 0, true, { directionX: 1, directionY: 0, fraction: 1 });
    const rotated = draw(1, false, a, true, { directionX: Math.cos(a), directionY: -Math.sin(a), fraction: 1 });
    // Repeated default calls must remain deterministic, and an invalid light
    // record must use the same legacy drawing route as omitted lighting.
    const legacy = ['legacy', 'legacy', { directionX: 0, directionY: 0, fraction: 1 }].map(sun => draw(1, false, 0, false, sun));
    return { groups, covariance: { original: original.result, rotated: rotated.result,
      originalHash: hash(original.pixels), rotatedHash: hash(rotated.pixels) },
      legacy: legacy.map(picture => ({ result: picture.result, hash: hash(picture.pixels) })), inputUnchanged: before === JSON.stringify(direction) };
  });
}
function verifyCraft(evidence: any) {
  for (const group of evidence.groups) {
    expect(group.alphaDifferences).toBe(0); expect(group.monotoneViolations).toBe(0);
    expect(group.opaqueHullPixels).toBeGreaterThan(3000); expect(group.changedHullPixels).toBeGreaterThan(1000);
    expect(group.illuminatedTotal).toBeGreaterThan(group.partialTotal); expect(group.partialTotal).toBeGreaterThan(group.eclipsedTotal);
    expect(group.eclipsedTotal).toBeGreaterThan(0); expect(group.plumeDifferences).toBe(0);
    if (group.engineOn) expect(group.plumePixels).toBeGreaterThan(1000); else expect(group.plumePixels).toBe(0);
    for (const row of group.renders) {
      expect(row.result.engineVisible).toBe(group.engineOn); expect(row.result.plumeVisible).toBe(group.engineOn);
      expect(row.result.sunlight.fraction).toBe(row.fraction);
      expect(row.result.sunlight.x).toBeCloseTo(0.6, 12); expect(row.result.sunlight.y).toBeCloseTo(-0.8, 12);
    }
  }
  expect(evidence.covariance.rotated.sunlight.x).toBeCloseTo(evidence.covariance.original.sunlight.x, 12);
  expect(evidence.covariance.rotated.sunlight.y).toBeCloseTo(evidence.covariance.original.sunlight.y, 12);
  expect(evidence.covariance.rotatedHash).toBe(evidence.covariance.originalHash);
  expect(evidence.legacy[0].hash).toBe(evidence.legacy[1].hash); expect(evidence.legacy[0].hash).toBe(evidence.legacy[2].hash);
  expect(evidence.inputUnchanged).toBe(true);
}
function verifySceneLight(row: any) {
  const sun = row.picture.sunlight, light = row.picture.craftSunlight;
  if (!sun) { expect(light).toBeNull(); return; }
  const angle = Math.atan2(-row.sample.vy, row.sample.vx), n = Math.hypot(sun.directionX, sun.directionY);
  const x = sun.directionX / n, y = -sun.directionY / n;
  expect(light.x).toBeCloseTo(x * Math.cos(angle) + y * Math.sin(angle), 12);
  expect(light.y).toBeCloseTo(-x * Math.sin(angle) + y * Math.cos(angle), 12);
  expect(light.fraction).toBe(sun.fraction);
}
async function environmentEvidence(page: Page) {
  return page.locator('[data-environment-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    const profile = P.lunarEnvironmentProfile(d.loiPlan, d.lunarEnvironmentSunAngle), sample = P.lunarEnvironmentSample(profile, Number(cv.dataset.environmentTime));
    const scratch = document.createElement('canvas'); scratch.width = cv.width / 2; scratch.height = cv.height / 2;
    const picture = P.drawLunarEnvironment(scratch.getContext('2d'), scratch.width, scratch.height, sample, profile);
    return { angle: profile.sunAngle, sample, picture: { ...picture, sunlight: sample.sun }, phase: cv.dataset.environmentSun, fraction: Number(cv.dataset.environmentSunFraction) };
  });
}

test('measured orbital spacecraft lighting follows the Sun through eclipse and preserves plume, geometry and review state', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true }); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  await expect(page.locator('[data-loi-light-note]')).toContainText('Approximate hull facets follow the Sun');
  await expect(page.locator('[data-loi-light-note]')).toContainText('eclipse exposure is raised to keep the craft visible');
  const initial = await saved(page), evidence = await craftEvidence(page); verifyCraft(evidence); expect(await saved(page)).toEqual(initial);
  await capture(page, info, 'spacecraft-eclipse-comparison', false, '[data-craft-comparison]'); await page.locator('[data-craft-comparison]').evaluate(el => el.remove());
  const times = await epochs(page); expect(times.sunlit).toBeDefined(); expect(times.partial).toBeDefined(); expect(times.total).toBeDefined();
  const rows: any[] = [];
  for (const [name, time] of [['sunlit', times.sunlit], ['partial', times.partial], ['total', times.total]] as const) {
    await seek(page, time!); const row = await inspect(page); await verifyLive(page, row); verifySceneLight(row);
    expect(row.phase).toBe(name); rows.push(row); await capture(page, info, 'spacecraft-' + name + '-1100');
  }
  await accessibility(page, info, 'orbital-craft-a11y-1100');
  const frozenPixels = await pixels(page), frozenState = await saved(page); await page.waitForTimeout(120);
  expect(await pixels(page)).toBe(frozenPixels); expect(await saved(page)).toEqual(frozenState);
  await page.locator('[data-loi-result]').click(); await expect(page.locator('[data-loi-proceed]')).toBeEnabled();
  const captured = await saved(page); expect(captured.loiResult.outcome).toBe('captured'); expect(captured.loiRun.recorded).toBe(true); expect(captured.missionXP).toBe(0);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  await seek(page, times.partial!); const phone = await inspect(page); verifySceneLight(phone); rows.push(phone);
  await capture(page, info, 'spacecraft-workspace-320', true);
  await accessibility(page, info, 'orbital-craft-a11y-320');
  const reviewed = await saved(page), phonePixels = await pixels(page); await mount(page, { moonMission: reviewed });
  expect(await saved(page)).toEqual(reviewed); expect(await pixels(page)).toBe(phonePixels);
  await page.locator('[data-loi-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-loi-time'))).toBeCloseTo(phone.time + 0.1, 6);
  expect((await saved(page)).loiResult).toEqual(captured.loiResult); expect((await saved(page)).missionXP).toBe(0);
  await page.locator('[data-environment-toggle]').click(); const environments: any[] = [];
  for (const angle of [90, 135]) {
    await page.locator('[data-environment-sun-control]').selectOption(String(angle));
    await expect(page.locator('[data-environment-canvas]')).toBeVisible();
    await expect.poll(async () => (await environmentEvidence(page)).angle).toBe(angle);
    const row = await environmentEvidence(page); verifySceneLight(row); expect(row.picture.plumeVisible).toBe(false);
    expect(row.picture.scaleX).toBe(row.picture.scaleY); expect(row.fraction).toBe(row.sample.sun.fraction);
    environments.push(row); await capture(page, info, 'spacecraft-environment-' + angle + '-320', false, '[data-environment-canvas]');
    const state = await saved(page); expect(state.loiResult).toEqual(captured.loiResult); expect(state.missionXP).toBe(0);
  }
  expect(environments[0].picture.craftSunlight).not.toEqual(environments[1].picture.craftSunlight);
  await expect(page.locator('[data-environment-model-note]')).toContainText('Approximate hull facets follow the Sun');
  const bounds = await page.locator('[data-loi-workspace]').evaluate(el => {
    const box = (node: Element) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right }; };
    return { overflow: document.documentElement.scrollWidth > innerWidth, note: box(el.querySelector('[data-loi-light-note]')!), environment: box(el.querySelector('[data-environment-model-note]')!) };
  });
  expect(bounds.overflow).toBe(false); for (const box of [bounds.note, bounds.environment]) { expect(box.left).toBeGreaterThanOrEqual(0); expect(box.right).toBeLessThanOrEqual(320); }
  const prior = await saved(page); expect(prior.earnedBadges).toEqual(initial.earnedBadges); expect(prior.missionLog).toEqual(initial.missionLog);
  await page.locator('[data-loi-proceed]').evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(5);
  const descended = await saved(page); expect(descended.missionXP).toBe(15); expect(descended.loiAwarded).toBe(true);
  await mount(page, { moonMission: { ...descended, missionPhase: 4 } }); await page.locator('[data-loi-proceed]').click();
  await expect.poll(async () => (await saved(page)).missionPhase).toBe(5); expect((await saved(page)).missionXP).toBe(15); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'orbital-craft-measured.json'), JSON.stringify({ evidence, times, rows, environments, bounds, errors }, null, 2));
});
