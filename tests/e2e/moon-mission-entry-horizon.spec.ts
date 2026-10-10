import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_ENTRY_HORIZON_REPORT_DIR || 'reports/moon-mission-enhancement-pass39-2026-10-10/browser/horizon');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
type Plan = { version: 2; mode: 'guided' | 'bank'; bank: number };
const guided: Plan = { version: 2, mode: 'guided', bank: 0 };
const fixedBank: Plan = { version: 2, mode: 'bank', bank: 0 };
const seed = (plan = guided) => ({ moonMission: {
  missionPhase: 9, entryAngle: -6.5, entryPlan: plan,
  entryRun: { version: 2, plan, angle: -6.5, time: 0, recovery: 0, recorded: false },
  animPaused: true, entryPaused: true, entryPlaybackRate: 30, soundOff: true, missionXP: 0,
  earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot',
  lunarSamples: [], quizCorrect: 0,
} });

async function mount(page: Page, data: any = seed()) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => {
    document.getElementById('wrap')!.style.width = '100%';
    (window as any).__mount(value);
  }, data);
  await expect(page.locator('[data-entry-canvas]')).toBeVisible();
  await expect.poll(async () => page.locator('[data-entry-canvas]').getAttribute('data-entry-horizon-field')).toBe('60');
}
async function saved(page: Page) {
  return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission)));
}
async function live(page: Page) {
  return page.locator('[data-entry-canvas]').evaluate((cv: HTMLCanvasElement) => {
    const d = cv.dataset, b = cv.getBoundingClientRect();
    return { physical: {
      time: Number(d.entryTime), stage: d.entryStage, altitude: Number(d.entryAltitude),
      speed: Number(d.entrySpeed), load: Number(d.entryLoad), heat: Number(d.entryHeatFlux),
      gamma: Number(d.entryGamma), verticalSpeed: Number(d.entryVerticalSpeed),
      bank: d.entryBank === '' ? null : Number(d.entryBank), recovery: Number(d.entryRecovery),
    }, horizon: {
      active: d.entryHorizonActive === 'true', dip: Number(d.entryHorizonDip),
      field: Number(d.entryHorizonField), focal: Number(d.entryHorizonFocal),
      eye: Number(d.entryHorizonEye), center: Number(d.entryHorizonCenter), edge: Number(d.entryHorizonEdge),
      airglow: d.entryHorizonAirglow === 'true',
      airglowCenter: d.entryHorizonAirglowCenter === '' ? null : Number(d.entryHorizonAirglowCenter),
    }, width: cv.width / 2, height: cv.height / 2, offsetWidth: cv.offsetWidth,
    cssWidth: b.width, cssHeight: b.height };
  });
}
async function seek(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await page.locator('[data-entry-seek]').evaluate((el: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Math.abs((await live(page)).physical.time - time)).toBeLessThan(0.11);
}
async function capture(page: Page, info: TestInfo, name: string, workspace = false) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  if (workspace) await page.screenshot({ path, fullPage: true });
  else await page.locator('[data-entry-canvas]').screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function assertGeometry(page: Page, plan = guided) {
  const measured = await live(page);
  const expected = await page.evaluate(({ time, plan }) => {
    const P = (window as any).MoonMissionPure, p = P.entryProfile(-6.5, { plan });
    return { sample: P.entrySample(p, time), radius: P.entry.radius };
  }, { time: measured.physical.time, plan });
  const h = expected.sample.altitude, R = expected.radius, H = measured.height, W = measured.width;
  const eye = 0.72 * H, T = Math.tan(Math.PI / 3);
  const focal = (H + Math.sqrt(H * H + 4 * T * T * eye * (H - eye))) / (2 * T);
  // Independent spherical tangency: the radius to a tangent point is normal to
  // the observer ray, so cos(dip) = R / (R + h).
  const dip = Math.acos(R / (R + Math.max(0, h)));
  const center = eye + focal * Math.tan(dip);
  const edge = eye + Math.tan(dip) * Math.hypot(focal, W / 2);
  expect(measured.height).toBe(320);
  expect(measured.cssHeight).toBeCloseTo(320, 6);
  expect(measured.width).toBe(measured.offsetWidth);
  expect(Math.abs(measured.cssWidth - measured.width)).toBeLessThanOrEqual(1);
  expect(measured.horizon.field).toBe(60);
  expect(measured.horizon.focal).toBeCloseTo(focal, 8);
  expect(measured.horizon.eye).toBeCloseTo(eye, 8);
  expect((Math.atan(eye / focal) + Math.atan((H - eye) / focal)) * 180 / Math.PI).toBeCloseTo(60, 10);
  expect(measured.horizon.dip).toBeCloseTo(dip * 180 / Math.PI, 7);
  expect(measured.horizon.center).toBeCloseTo(center, 7);
  expect(measured.horizon.edge).toBeCloseTo(edge, 7);
  expect(measured.horizon.active).toBe(['entry', 'skip'].includes(expected.sample.stage));
  expect(measured.horizon.airglow).toBe(h > 100000);
  if (h > 100000) {
    const shellDip = Math.acos((R + 100000) / (R + h));
    expect(measured.horizon.airglowCenter).toBeCloseTo(eye + focal * Math.tan(shellDip), 7);
    expect(measured.horizon.airglowCenter!).toBeLessThan(measured.horizon.center);
  } else expect(measured.horizon.airglowCenter).toBeNull();
  expect(measured.physical.altitude).toBeCloseTo(expected.sample.altitude, 8);
  expect(measured.physical.speed).toBeCloseTo(expected.sample.speed, 8);
  expect(measured.physical.load).toBeCloseTo(expected.sample.loadG, 8);
  expect(measured.physical.heat).toBeCloseTo(expected.sample.heatFlux, 6);
  expect(measured.physical.gamma).toBeCloseTo(expected.sample.gamma, 9);
  expect(measured.physical.verticalSpeed).toBeCloseTo(expected.sample.speed * Math.sin(expected.sample.gamma), 7);
  expect(measured.physical.bank).toEqual(expected.sample.bank);
  await expect(page.locator('[data-entry-value="horizonDip"]')).toHaveText((dip * 180 / Math.PI).toFixed(2) + '°');
  return measured;
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('entry horizon follows spherical altitude and exact field geometry through paused review, parachutes, receipt reload and skip-out', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => { Math.random = () => 0.999; });
  await mkdir(REPORT, { recursive: true });
  await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page);
  const profile = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, p = P.entryProfile(-6.5, { plan: { version: 2, mode: 'guided', bank: 0 } });
    return { summary: p.summary, events: p.events };
  });
  expect(profile.summary.outcome).toBe('nominal');
  expect(profile.events.drogue).toBeTruthy();
  expect(profile.events.main).toBeTruthy();
  const masks = await page.evaluate(() => {
    const P = (window as any).MoonMissionPure, W = 600, H = 320, h = 122000;
    const g = P.entryHorizonGeometry(h, W, H), R = P.entry.radius;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    const inspect = (layer?: string) => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const drawn = P.entryHorizonPath(ctx, g, layer, true);
      ctx.fillStyle = '#fff'; ctx.fill();
      const radius = layer === 'airglow' ? R + 100000 : R;
      const dip = Math.acos(radius / (R + h));
      const points = [10, W / 2, W - 11].map(x => {
        const y = g.eyeY + Math.tan(dip) * Math.hypot(g.focal, x - W / 2);
        const above = ctx.getImageData(x, Math.floor(y - 4), 1, 1).data;
        const below = ctx.getImageData(x, Math.ceil(y + 4), 1, 1).data;
        return { x, y, above: Array.from(above), below: Array.from(below) };
      });
      return { drawn, points };
    };
    return { earth: inspect(), airglow: inspect('airglow') };
  });
  for (const mask of [masks.earth, masks.airglow]) {
    expect(mask.drawn).toBe(true);
    for (const p of mask.points) {
      expect(p.above).toEqual([0, 0, 0, 255]);
      expect(p.below).toEqual([255, 255, 255, 255]);
    }
  }
  await writeFile(join(REPORT, 'horizon-path-pixels.json'), JSON.stringify(masks, null, 2));
  const rows: any[] = [], starReadings: any[] = [], byMoment = new Map<string, any>();
  const moments = [
    { name: 'interface', time: 0, stage: 'entry' },
    { name: 'peak-heat', time: profile.summary.peakHeatTime, stage: 'entry' },
    { name: 'before-drogue', time: profile.events.drogue.time - 0.2, stage: 'entry' },
    { name: 'drogue', time: profile.events.drogue.time + 0.2, stage: 'drogue' },
    { name: 'main', time: profile.events.main.time + 0.2, stage: 'main' },
  ];
  for (const width of [1100, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 850 : 1000 });
    await expect.poll(async () => (await live(page)).width).toBeLessThanOrEqual(width);
    await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
    for (const moment of moments) {
      await seek(page, moment.time);
      const row = await assertGeometry(page);
      expect(row.physical.stage).toBe(moment.stage);
      if (width === 1100 && ['interface', 'before-drogue'].includes(moment.name)) {
        const stars = await page.locator('[data-entry-canvas]').evaluate((cv: HTMLCanvasElement) => {
          // Bright, nearly neutral points in an empty sky region. Capsule,
          // captions, glow and Earth are outside this region in both frames.
          const ctx = cv.getContext('2d')!, W = cv.width / 2;
          const x = 40, y = 100, w = Math.floor(W * 0.6) - x, h = 160;
          const pixels = ctx.getImageData(x, y, w, h).data;
          let bright = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            const low = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
            const high = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
            if (low >= 80 && high - low <= 35) bright++;
          }
          return { bright, x, y, w, h };
        });
        starReadings.push({ moment: moment.name, ...stars });
        if (moment.name === 'interface') expect(stars.bright).toBeGreaterThan(0);
        else expect(stars.bright).toBe(0);
      }
      rows.push({ width, moment: moment.name, ...row });
      if (width === 1100) byMoment.set(moment.name, row);
      else {
        const wide = byMoment.get(moment.name);
        expect(row.physical).toEqual(wide.physical);
        expect(row.horizon.dip).toBeCloseTo(wide.horizon.dip, 10);
        expect(row.horizon.center).toBeCloseTo(wide.horizon.center, 10);
        expect(row.horizon.focal).toBeCloseTo(wide.horizon.focal, 10);
        if (moment.name === 'interface') {
          expect(row.horizon.edge).toBeLessThan(wide.horizon.edge);
          const slider = page.locator('[data-entry-seek]');
          await slider.focus(); await page.keyboard.press('ArrowRight');
          await expect.poll(async () => (await live(page)).physical.time).toBeGreaterThan(0);
          await seek(page, 0);
          expect((await saved(page)).missionXP).toBe(0);
        }
      }
      const state = await saved(page);
      expect(state.entryOutcome == null).toBe(true);
      expect(state.missionXP).toBe(0);
      expect(state.entryRun.recorded).toBe(false);
      expect(state.entryRun.plan).toEqual(guided);
      expect(state.entryPaused).toBe(true);
      await capture(page, info, 'horizon-' + moment.name + '-' + width);
      if (moment.name === 'peak-heat') {
        await expect(page.locator('[data-entry-horizon-note]')).toContainText('60° vertical field');
        await expect(page.locator('[data-entry-horizon-note]')).toContainText('measured altitude');
        const fonts = await page.locator('[data-entry-horizon-note], [data-entry-value="horizonDip"]').evaluateAll(nodes => nodes.map(n => parseFloat(getComputedStyle(n).fontSize)));
        expect(Math.min(...fonts)).toBeGreaterThanOrEqual(12);
        expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
        const controls = await page.locator('[data-entry-instruments] button, [data-entry-seek], select[aria-label="Playback speed"]').evaluateAll(nodes => nodes.filter(n => { const b = n.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).map(n => {
          const b = n.getBoundingClientRect(); return { height: b.height, left: b.left, right: b.right };
        }));
        expect(controls.length).toBeGreaterThanOrEqual(4);
        for (const c of controls) {
          expect(c.height).toBeGreaterThanOrEqual(44);
          expect(c.left).toBeGreaterThanOrEqual(0);
          expect(c.right).toBeLessThanOrEqual(width);
        }
        const violations = await page.evaluate(async () => (await (window as any).axe.run(document.querySelector('[data-entry-workspace]'),
          { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations);
        expect(violations).toEqual([]);
        await writeFile(join(REPORT, 'horizon-axe-' + width + '.json'), JSON.stringify(violations, null, 2));
        await capture(page, info, 'horizon-workspace-' + width, true);
      }
    }
  }
  const beforeResize = await saved(page), beforePhysical = (await live(page)).physical;
  await page.setViewportSize({ width: 1100, height: 1000 });
  await expect.poll(async () => (await live(page)).width).toBeGreaterThan(320);
  await assertGeometry(page);
  expect((await live(page)).physical).toEqual(beforePhysical);
  const afterResize = await saved(page);
  expect(afterResize.entryRun).toEqual(beforeResize.entryRun);
  expect(afterResize.entryPlan).toEqual(beforeResize.entryPlan);
  expect(afterResize.entryPlaybackRate).toBe(30);
  expect(afterResize.missionXP).toBe(0);
  await page.setViewportSize({ width: 320, height: 850 });
  await expect.poll(async () => (await live(page)).width).toBeLessThanOrEqual(320);
  await page.locator('[data-entry-result]').click();
  await expect(page.locator('[data-entry-terminal="splash"]')).toBeVisible();
  await expect(page.locator('[data-entry-complete]')).toBeEnabled();
  const done = await saved(page);
  expect(done.entryOutcome).toMatchObject({ modelVersion: 2, plan: guided, completed: true, terminal: 'splash', outcome: 'nominal' });
  expect(done.missionXP).toBe(25);
  expect(done.entryAttempts).toHaveLength(1);
  const splash = await assertGeometry(page);
  expect(splash.physical.stage).toBe('splash');
  expect(splash.horizon.active).toBe(false);
  expect(splash.horizon.dip).toBe(0);
  await capture(page, info, 'horizon-splash-320');
  await seek(page, profile.summary.peakHeatTime);
  const reviewed = await saved(page), reviewRow = await assertGeometry(page);
  expect(reviewed.entryOutcome).toEqual(done.entryOutcome);
  expect(reviewed.entryAttempts).toEqual(done.entryAttempts);
  expect(reviewed.missionXP).toBe(25);
  expect(reviewed.entryRun.recorded).toBe(true);
  await mount(page, { moonMission: reviewed });
  await expect.poll(async () => (await live(page)).physical.time).toBe(reviewRow.physical.time);
  const restored = await saved(page);
  expect(restored.entryRun).toEqual(reviewed.entryRun);
  expect(restored.entryOutcome).toEqual(done.entryOutcome);
  expect(restored.entryAttempts).toEqual(done.entryAttempts);
  expect(restored.missionXP).toBe(25);
  expect((await assertGeometry(page)).physical).toEqual(reviewRow.physical);
  await page.locator('[data-entry-result]').click();
  expect((await saved(page)).missionXP).toBe(25);
  expect((await saved(page)).entryAttempts).toHaveLength(1);
  await mount(page, seed(fixedBank));
  await page.locator('[data-entry-result]').click();
  await expect(page.locator('[data-entry-terminal="skip"]')).toBeVisible();
  const skip = await assertGeometry(page, fixedBank);
  expect(skip.physical.stage).toBe('skip');
  expect(skip.physical.altitude).toBeCloseTo(122000, 3);
  expect(skip.physical.verticalSpeed).toBeGreaterThan(0);
  expect(skip.horizon.active).toBe(true);
  expect(skip.horizon.airglow).toBe(true);
  await expect(page.locator('[data-entry-complete]')).toBeDisabled();
  const skipped = await saved(page);
  expect(skipped.entryOutcome).toMatchObject({ modelVersion: 2, plan: fixedBank, terminal: 'skip', splashSpeed: null });
  expect(skipped.missionXP).toBe(10);
  expect(skipped.entryAttempts).toHaveLength(1);
  await page.locator('[data-entry-result]').click();
  expect((await saved(page)).missionXP).toBe(10);
  expect((await saved(page)).entryAttempts).toHaveLength(1);
  await capture(page, info, 'horizon-skip-320');
  expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'horizon-measured-geometry.json'), JSON.stringify({ rows, starReadings, splash, reviewRow, skip, errors }, null, 2));
});
