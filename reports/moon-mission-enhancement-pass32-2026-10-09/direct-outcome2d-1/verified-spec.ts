import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// Run the two workflows separately, with one worker and zero retries.
const REPORT = resolve(process.env.MM_DESCENT_OUTCOME_REPORT_DIR ||
  'reports/moon-mission-enhancement-pass32-2026-10-09/browser');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const PHONE = { width: 320, height: 850 }, DESKTOP = { width: 1100, height: 1000 };
const seed = (result: Record<string, unknown>) => ({ moonMission: {
  missionPhase: 5, descentStarted: true, animPaused: true, soundOff: true, difficulty: 'pilot',
  missionXP: 42, landingRewarded: false, lunarSamples: [], quizCorrect: 0,
  earnedBadges: { first_step: true, mission_complete: true }, landingResult: result, landingAttempts: [result],
} });
// Saved presentation fixtures, not newly integrated flights. The 69/C grade is
// authoritative even though rounding the stored reserve can cross a score boundary.
const success = { crashed: false, score: 69, grade: 'C', vVel: 1.2, hVel: .8, fuel: 30, fuelUnit: 's',
  recording: { version: 1, samples: [
    { t: 0, alt: 300, v: -12, h: 4, fuel: 100, throttle: 0, tilt: 0, x: 0 },
    { t: 72.5, alt: 0, v: -1.2, h: -.8, fuel: 29.7, throttle: .5, tilt: -.1, x: -80.4 },
  ] } };
const impact = { crashed: true, score: 0, grade: '\u2014', vVel: 12.5, hVel: 6.2, fuel: 30, fuelUnit: 's' };
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function instrument(page: Page, fallback: boolean) {
  await page.addInitScript(({ fallback }) => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 4 });
    if (fallback) {
      const original = HTMLCanvasElement.prototype.getContext;
      (HTMLCanvasElement.prototype as any).getContext = function(type: string, ...args: any[]) {
        return /webgl/i.test(type) ? null : (original as any).apply(this, [type, ...args]);
      };
    }
    const frames = new WeakMap<HTMLCanvasElement, any>();
    const proto = CanvasRenderingContext2D.prototype, original = proto.fillText;
    proto.fillText = function(value, x, y, maxWidth?) {
      if (maxWidth === undefined) original.call(this, value, x, y);
      else original.call(this, value, x, y, maxWidth);
      const canvas = this.canvas, text = String(value);
      if (!canvas.matches('[data-descent-canvas]')) return;
      // Observe actual browser shaping and painting after the first HUD label.
      // The fallback vignette fills the canvas after the text, so a full fill
      // cannot serve as a frame boundary. No drawing helper is called here.
      if (text === 'Altitude') {
        const previous = frames.get(canvas);
        frames.set(canvas, { generation: (previous?.generation || 0) + 1,
          width: canvas.offsetWidth, height: canvas.offsetHeight, rows: [] });
      }
      const frame = frames.get(canvas); if (!frame || frame.rows.length >= 64) return;
      const m = this.getTransform(), metric = this.measureText(text);
      const sx = canvas.offsetWidth / canvas.width, sy = canvas.offsetHeight / canvas.height;
      const size = Number(/([\d.]+)px/.exec(this.font)?.[1]);
      frame.rows.push({ text, x, y, font: this.font, size, cssSize: size * m.a * sx,
        alpha: this.globalAlpha, align: this.textAlign, baseline: this.textBaseline,
        box: { left: (m.a * (x - metric.actualBoundingBoxLeft) + m.e) * sx,
          right: (m.a * (x + metric.actualBoundingBoxRight) + m.e) * sx,
          top: (m.d * (y - metric.actualBoundingBoxAscent) + m.f) * sy,
          bottom: (m.d * (y + metric.actualBoundingBoxDescent) + m.f) * sy } });
    };
    (window as any).__outcomePaintFrame = (canvas: HTMLCanvasElement) => frames.get(canvas) || null;
  }, { fallback });
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

async function mount(page: Page, result: Record<string, unknown>) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(data => {
    Math.random = () => .999;
    document.getElementById('wrap')!.style.width = '100%';
    (window as any).__mount(data);
  }, seed(result));
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-hud-bottom', '156');
}
async function receipts(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__toolData.moonMission;
    return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult,
      landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
  });
}
async function flight(page: Page) {
  return page.locator('[data-descent-canvas]').evaluate((canvas: any) => canvas._descentState());
}
async function controls(page: Page, visible: boolean) {
  const pad = page.locator('[data-descent-pad]');
  await expect(pad).toHaveCount(1); await expect(pad.locator('button')).toHaveCount(3);
  if (visible) await expect(pad).toBeVisible(); else await expect(pad).toBeHidden();
  for (const button of await pad.locator('button').all()) {
    if (visible) await expect(button).toBeVisible(); else await expect(button).toBeHidden();
  }
}
async function painted(page: Page) {
  const canvas = page.locator('[data-descent-canvas]');
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-descent-canvas]') as HTMLCanvasElement;
    const frame = (window as any).__outcomePaintFrame(canvas);
    return frame?.rows.some((row: any) => row.text === 'Altitude') && frame.width === canvas.offsetWidth;
  });
  return canvas.evaluate((canvas: any) => ({ ...(window as any).__outcomePaintFrame(canvas),
    layout: canvas.dataset.descentHudLayout, reviewTime: canvas.dataset.descentReviewTime,
    renderer: canvas.dataset.descent3d, horizontalOverflow: document.documentElement.scrollWidth > innerWidth }));
}
async function outcome(page: Page, kind: 'success' | 'impact', expected: string[]) {
  // Wait for the completed paint rather than accepting the HUD alone: frame
  // collection begins at Altitude and continues through all outcome text.
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-descent-canvas]') as HTMLCanvasElement;
    const frame = (window as any).__outcomePaintFrame(canvas);
    return frame?.width === canvas.offsetWidth && frame.rows.some((row: any) => /The Eagle has landed|HARD LANDING/.test(row.text));
  });
  const frame = await painted(page), headingPattern = kind === 'success' ? /The Eagle has landed/ : /HARD LANDING/;
  const heading = frame.rows.findIndex((row: any) => headingPattern.test(row.text));
  expect(heading).toBeGreaterThanOrEqual(0);
  const rows = frame.rows.slice(heading);
  expect(frame.rows.filter((row: any) => /The Eagle has landed|HARD LANDING/.test(row.text))).toHaveLength(1);
  expect(rows.length).toBeGreaterThanOrEqual(3);
  expect(rows[0].box.top).toBeGreaterThanOrEqual(172 - .5);
  expect(frame.horizontalOverflow).toBe(false);
  const joined = rows.map((row: any) => row.text).join(' ').replace(/\s+/g, ' ');
  for (const text of expected) expect(joined).toContain(text);
  const collisions: string[][] = [];
  for (const row of rows) {
    expect(row.size, row.text).toBeGreaterThanOrEqual(12);
    expect(row.cssSize, row.text).toBeGreaterThanOrEqual(12 - .01);
    expect(row.alpha, row.text).toBe(1);
    expect(row.box.left, row.text).toBeGreaterThanOrEqual(12 - .5);
    expect(row.box.right, row.text).toBeLessThanOrEqual(frame.width - 12 + .5);
    expect(row.box.top, row.text).toBeGreaterThanOrEqual(172 - .5);
    expect(row.box.bottom, row.text).toBeLessThanOrEqual(frame.height - 12);
  }
  for (let i = 0; i < frame.rows.length; i++) for (let j = i + 1; j < frame.rows.length; j++) {
    const a = frame.rows[i].box, b = frame.rows[j].box;
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > .5 &&
        Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > .5)
      collisions.push([frame.rows[i].text, frame.rows[j].text]);
  }
  expect(collisions).toEqual([]);
  const bottom = Math.max(...rows.map((row: any) => row.box.bottom));
  if (frame.layout === 'compact') expect(bottom, 'typical outcome leaves landed hardware visible').toBeLessThanOrEqual(272);
  await controls(page, false);
  return { ...frame, outcomeRows: rows, joined, bottom, collisions };
}
async function absentOutcome(page: Page, review: boolean) {
  const frame = await painted(page);
  expect(frame.rows.filter((row: any) => /The Eagle has landed|HARD LANDING|Landing score|fuel left|Impact at|Touchdown at/.test(row.text))).toEqual([]);
  expect(frame.rows.filter((row: any) => /RECORDED FRAME/.test(row.text))).toHaveLength(review ? 1 : 0);
  return frame;
}
async function actualNative(page: Page) {
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  await page.waitForFunction(() => {
    const canvas = document.querySelector('[data-descent-gl]') as HTMLCanvasElement;
    const record = (window as any).__glRecord(canvas);
    return record?.draws > 0 && record?.renders > 0 && canvas.width > 0 && canvas.height > 0;
  });
  const actual = await page.evaluate(() => {
    const canvas = document.querySelector('[data-descent-gl]') as HTMLCanvasElement;
    const record = (window as any).__glRecord(canvas);
    return { draws: record.draws, renders: record.renders, width: canvas.width, height: canvas.height,
      lost: record.ctx.isContextLost() };
  });
  expect(actual.lost).toBe(false); expect(actual.draws).toBeGreaterThan(0); expect(actual.renders).toBeGreaterThan(0);
  return actual;
}
function reporter(directory: string, page: Page, info: TestInfo) {
  const stages: any[] = [];
  return async (name: string, value: any, screenshot = true) => {
    await mkdir(directory, { recursive: true });
    const stage = { name, ...value, screenshot: null as string | null }; stages.push(stage);
    await writeFile(join(directory, name + '.json'), JSON.stringify(stage, null, 2));
    await writeFile(join(directory, 'progress.json'), JSON.stringify({ stages }, null, 2));
    if (screenshot) {
      const path = join(directory, name + '.png');
      await page.locator('[data-descent-canvas]').locator('..').screenshot({ path, animations: 'disabled', timeout: 60000 });
      await info.attach(name, { path, contentType: 'image/png' }); stage.screenshot = path;
      await writeFile(join(directory, name + '.json'), JSON.stringify(stage, null, 2));
      await writeFile(join(directory, 'progress.json'), JSON.stringify({ stages }, null, 2));
    }
  };
}

test('2D landing outcome stays readable across saved results, replay and retry', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await instrument(page, true); await page.setViewportSize(PHONE); await mount(page, success);
  await expect(page.locator('[data-descent-gl]')).toHaveCount(0);
  const save = reporter(join(REPORT, 'fallback'), page, info), held = await flight(page), saved = await receipts(page);
  const successText = ['Landing score 69/100 (grade C)', '30 s of fuel left', 'Begin EVA'];
  await save('success-phone', { outcome: await outcome(page, 'success', successText), held, saved });
  await page.setViewportSize(DESKTOP);
  await save('success-desktop', { outcome: await outcome(page, 'success', successText) });
  expect(await receipts(page)).toEqual(saved); expect(await flight(page)).toEqual(held);
  await page.setViewportSize(PHONE);
  await page.locator('[data-landing-scrub]').fill('0');
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time', '0.000');
  await controls(page, false);
  await save('recorded-review', { paint: await absentOutcome(page, true) });
  expect(await receipts(page)).toEqual(saved); expect(await flight(page)).toEqual(held);
  await page.getByRole('button', { name: 'Return to touchdown', exact: true }).click();
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-review-time', '');
  await save('returned-touchdown', { outcome: await outcome(page, 'success', successText) }, false);
  expect(await receipts(page)).toEqual(saved); expect(await flight(page)).toEqual(held);
  for (const [name, result, expected] of [
    ['legacy-percent', { crashed: false, score: 88, grade: 'A', vVel: 1.2, hVel: .8, fuel: 22 }, ['Landing score 88/100 (grade A)', '22% fuel left']],
    ['legacy-missing', { crashed: false, vVel: 1.2, hVel: .8 }, ['Landing score not recorded', 'fuel not recorded']],
  ] as const) {
    await mount(page, result);
    const before = await receipts(page), heldLegacy = await flight(page), card = await outcome(page, 'success', [...expected]);
    expect(card.joined).not.toMatch(/Fuel reserve \+|Soft touch \+/);
    if (name === 'legacy-percent') expect(card.joined).not.toContain('22 s');
    await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-fuel', '');
    expect(await receipts(page)).toEqual(before); expect(await flight(page)).toEqual(heldLegacy);
    await save(name, { outcome: card, held: heldLegacy, saved: before });
  }
  await mount(page, impact);
  const beforeImpact = await receipts(page), impactHeld = await flight(page);
  const impactText = ['HARD LANDING', '12.5 m/s down', '6.2 m/s across', 'limits 3 and 5', 'Retry Landing'];
  await save('impact-phone', { outcome: await outcome(page, 'impact', impactText), held: impactHeld, saved: beforeImpact });
  await page.setViewportSize(DESKTOP);
  await save('impact-desktop', { outcome: await outcome(page, 'impact', impactText) }, false);
  expect(await receipts(page)).toEqual(beforeImpact); expect(await flight(page)).toEqual(impactHeld);
  await page.setViewportSize(PHONE);
  await page.getByRole('button', { name: 'Retry the powered descent from the start', exact: true }).click();
  await expect(page.locator('[data-descent-canvas]')).toHaveCount(0);
  await expect(page.locator('[data-descent-pad]')).toHaveCount(0);
  expect(await receipts(page)).toEqual({ ...beforeImpact, landingResult: null });
  await page.locator('button[data-descent-begin]').click();
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  await controls(page, true);
  const retry = await flight(page);
  expect(retry.alt).toBeGreaterThan(0); expect(retry.thrust).toBe(0);
  expect(await receipts(page)).toEqual({ ...beforeImpact, landingResult: null });
  expect(errors).toEqual([]);
  await save('retry-live', { paint: await absentOutcome(page, false), held: retry,
    saved: await receipts(page), errors, completed: true });
});

test('native landing outcome keeps success and impact readable on desktop and phone', async ({ page }, info) => {
  const errors: string[] = [], shaderErrors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error' && /shader|GL_INVALID|VALIDATE_STATUS/i.test(msg.text())) shaderErrors.push(msg.text()); });
  await instrument(page, false);
  const save = reporter(join(REPORT, 'native'), page, info);
  for (const [name, result, kind, expected] of [
    ['success', success, 'success', ['Landing score 69/100 (grade C)', '30 s of fuel left', 'Begin EVA']],
    ['impact', impact, 'impact', ['HARD LANDING', '12.5 m/s down', '6.2 m/s across', 'limits 3 and 5', 'Retry Landing']],
  ] as const) {
    await page.setViewportSize(DESKTOP); await mount(page, result);
    const held = await flight(page), saved = await receipts(page);
    for (const [size, viewport] of [['desktop', DESKTOP], ['phone', PHONE]] as const) {
      await page.setViewportSize(viewport);
      const native = await actualNative(page), card = await outcome(page, kind, [...expected]);
      expect(await receipts(page)).toEqual(saved); expect(await flight(page)).toEqual(held);
      expect(errors).toEqual([]); expect(shaderErrors).toEqual([]);
      await save(name + '-' + size, { outcome: card, native, held, saved, errors, shaderErrors,
        contexts: await harness.glContexts(page), completed: name === 'impact' && size === 'phone' });
    }
  }
});
