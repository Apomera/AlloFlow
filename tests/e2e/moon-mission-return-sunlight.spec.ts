import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_RETURN_SUNLIGHT_REPORT_DIR || 'reports/moon-mission-enhancement-pass51-2026-10-11/browser/sunlight');
const MAIN = '[data-teicoast-canvas]';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, extra: any = {}) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(value => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    (window as any).__mount({ moonMission: { missionPhase: 8, missionXP: 0, missionLog: [], animPaused: true,
      returnPaused: true, soundOff: true, difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
      earnedBadges: { first_step: true, mission_complete: true }, ...value } });
  }, extra);
  await expect(page.locator(MAIN)).toBeVisible();
  await expect(page.locator(MAIN)).toHaveAttribute('data-return-sun-angle', '90');
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function seek(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await page.locator('[data-return-seek]').evaluate((input: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-return-elapsed'))).toBeCloseTo(time, 6);
}
async function pixels(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    let hash = 2166136261;
    for (const n of cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data) hash = Math.imul(hash ^ n, 16777619);
    return hash >>> 0;
  });
}
async function settledPixels(page: Page) {
  return page.locator(MAIN).evaluate(async (cv: HTMLCanvasElement) => {
    await document.fonts.ready;
    const observations: any[] = []; let repeats = 0, previous = '';
    // A published data attribute may precede the ResizeObserver callback which
    // resets the backing canvas. Compare only after three equal painted frames.
    for (let frame = 0; frame < 20; frame++) {
      await new Promise<void>(done => requestAnimationFrame(() => done()));
      const ctx = cv.getContext('2d')!, data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let hash = 2166136261, opaque = 0;
      for (let index = 0; index < data.length; index++) hash = Math.imul(hash ^ data[index], 16777619);
      for (let index = 3; index < data.length; index += 4) if (data[index] === 255) opaque++;
      const row = { frame, hash: hash >>> 0, width: cv.width, height: cv.height, cssWidth: cv.offsetWidth,
        cssHeight: cv.offsetHeight, opaque, time: cv.dataset.returnElapsed, view: cv.dataset.returnCameraView };
      observations.push(row);
      const key = JSON.stringify({ ...row, frame: 0 });
      const painted = opaque > cv.width * cv.height * 0.95 && cv.width === cv.offsetWidth * 2 && cv.height === cv.offsetHeight * 2;
      repeats = painted && key === previous ? repeats + 1 : 0; previous = key;
      if (repeats >= 2) break;
    }
    const ctx = cv.getContext('2d')!, transform = ctx.getTransform(), rect = cv.getBoundingClientRect();
    return { ...observations[observations.length - 1], settled: repeats >= 2, observations,
      png: cv.toDataURL(), dataset: { ...cv.dataset }, rect: { width: rect.width, height: rect.height },
      dpr: devicePixelRatio, fontStatus: document.fonts.status,
      context: { attributes: ctx.getContextAttributes(), font: ctx.font, textAlign: ctx.textAlign, textBaseline: ctx.textBaseline, alpha: ctx.globalAlpha,
        filter: ctx.filter, composite: ctx.globalCompositeOperation, smoothing: ctx.imageSmoothingEnabled,
        transform: [transform.a, transform.b, transform.c, transform.d, transform.e, transform.f] } };
  });
}
async function compareReloadPixels(page: Page, before: any, after: any) {
  const { png: beforePng, ...beforeMetadata } = before, { png: afterPng, ...afterMetadata } = after;
  let difference: any = null;
  if (before.hash !== after.hash) {
    for (const [name, png] of [['before', beforePng], ['after', afterPng]]) {
      await writeFile(join(REPORT, 'return-reload-' + name + '.png'), Buffer.from(png.split(',')[1], 'base64'));
    }
    difference = await page.evaluate(async images => {
      async function imageData(png: string) {
        const image = new Image(); image.src = png; await image.decode();
        const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
        return { width: canvas.width, height: canvas.height, data: ctx.getImageData(0, 0, canvas.width, canvas.height).data };
      }
      const a = await imageData(images[0]), b = await imageData(images[1]);
      if (a.width !== b.width || a.height !== b.height) return { dimensionsDiffer: true };
      let changed = 0, maxChannelDelta = 0, left = a.width, right = -1, top = a.height, bottom = -1;
      for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
        const at = (y * a.width + x) * 4; let different = false;
        for (let channel = 0; channel < 4; channel++) {
          const delta = Math.abs(a.data[at + channel] - b.data[at + channel]);
          maxChannelDelta = Math.max(maxChannelDelta, delta); if (delta) different = true;
        }
        if (different) { changed++; left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
      }
      return { changed, total: a.width * a.height, maxChannelDelta, bounds: { left, right, top, bottom } };
    }, [beforePng, afterPng]);
  }
  await writeFile(join(REPORT, 'return-reload-pixels.json'), JSON.stringify({ before: beforeMetadata, after: afterMetadata, difference }, null, 2));
  expect(before.settled).toBe(true); expect(after.settled).toBe(true); expect(after.hash).toBe(before.hash);
}
async function inspect(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    const profile = P.returnProfile(d.entryAngle), time = Number(cv.dataset.returnElapsed), sample = P.returnSample(profile, time);
    const scratch = document.createElement('canvas'); scratch.width = cv.width / 2; scratch.height = cv.height / 2;
    const picture = P.drawReturnScene(scratch.getContext('2d'), scratch.width, scratch.height, sample, profile, { view: d.returnView });
    const direct = d.returnView === 'crew' ? P.drawReturnCrewScene(scratch.getContext('2d'), scratch.width, scratch.height, sample) : null;
    return { time, sample, picture, direct, phase: cv.dataset.returnSun, fraction: Number(cv.dataset.returnSunFraction),
      sunAngle: Number(cv.dataset.returnSunAngle), view: d.returnView, plume: cv.dataset.returnPlume,
      complete: cv.dataset.returnComplete, summary: profile.summary };
  });
}
// Independent visible-disc reference: integrate vertical strips through the
// apparent Sun, with an opaque Earth disc centered on the horizontal axis.
function referenceSun(s: any) {
  const solar = Math.asin(695700000 / 149597870700), earth = Math.asin(6371000 / Math.hypot(s.x, s.y));
  const separation = Math.atan2(Math.abs(s.x), -s.y);
  const phase = separation <= earth - solar ? 'total' : separation < earth + solar ? 'partial' : 'sunlit';
  let fraction = phase === 'total' ? 0 : 1;
  if (phase === 'partial') {
    const count = 16384, dx = 2 * solar / count; let covered = 0;
    for (let i = 0; i < count; i++) {
      const x = -solar + (i + 0.5) * dx;
      covered += 2 * Math.min(Math.sqrt(Math.max(0, solar * solar - x * x)),
        Math.sqrt(Math.max(0, earth * earth - (x - separation) ** 2))) * dx;
    }
    fraction = Math.max(0, Math.min(1, 1 - covered / (Math.PI * solar * solar)));
  }
  return { phase, fraction, solar, earth, separation };
}
async function verifyLive(page: Page, row: any) {
  const s = row.sample, p = row.picture, solar = referenceSun(s);
  expect(row.sunAngle).toBe(90); expect(row.phase).toBe(solar.phase); expect(p.sunlight.phase).toBe(solar.phase);
  expect(Math.abs(row.fraction - solar.fraction)).toBeLessThan(0.00005);
  expect(p.sunlight.fraction).toBe(row.fraction); expect(p.sunlight.directionX).toBe(0); expect(p.sunlight.directionY).toBe(1);
  expect(row.plume).toBe('off'); expect(p.plumeVisible).toBe(false); expect(p.cmOnly).toBe(s.serviceModuleSeparated);
  const label = solar.phase === 'total' ? 'Total Earth eclipse' : solar.phase === 'partial' ? 'Partial Earth eclipse' : 'Full sunlight';
  await expect(page.locator('[data-return-value="sun"]')).toContainText(label);
  await expect(page.locator('[data-return-value="sun"]')).toContainText((row.fraction * 100).toFixed(1) + '%');
  if (row.view === 'crew') {
    expect(p.spacecraft).toBeNull(); expect(p.crew).toEqual(row.direct.crew);
    expect(p.angularRadius).toBeCloseTo(Math.asin(6371000 / s.radius) * 180 / Math.PI, 9);
  } else {
    expect(p.scaleX).toBe(p.scaleY); expect(p.earthRadius / p.scaleX).toBeCloseTo(6371000, 6);
    expect((p.craft.x - p.earth.x) / p.scaleX).toBeCloseTo(s.x, 5);
    expect((p.earth.y - p.craft.y) / p.scaleY).toBeCloseTo(s.y, 5);
    const craft = p.spacecraft, travel = Math.atan2(-s.vy, s.vx);
    expect(craft.centerX).toBeCloseTo(p.craft.x, 10); expect(craft.centerY).toBeCloseTo(p.craft.y, 10);
    expect(craft.angle).toBeCloseTo(travel + (s.serviceModuleSeparated ? 0 : Math.PI), 12);
    expect(craft.scale).toBe(0.52); expect(craft.cmOnly).toBe(s.serviceModuleSeparated); expect(craft.plumeVisible).toBe(false);
    expect(craft.sunlight.fraction).toBe(row.fraction);
    expect(craft.sunlight.x).toBeCloseTo(-Math.sin(craft.angle), 12);
    expect(craft.sunlight.y).toBeCloseTo(-Math.cos(craft.angle), 12);
    // The CM heat-shield normal points along velocity after SM separation.
    const velocityDot = Math.cos(craft.angle) * s.vx / s.speed + Math.sin(craft.angle) * -s.vy / s.speed;
    expect(velocityDot).toBeCloseTo(s.serviceModuleSeparated ? 1 : -1, 12);
  }
}
async function capture(page: Page, info: TestInfo, name: string, selector = MAIN) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(selector).screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-return-workspace]']] },
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations
    .map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  const path = join(REPORT, name + '.json'); await writeFile(path, JSON.stringify(violations, null, 2));
  await info.attach(name, { path, contentType: 'application/json' }); expect(violations).toEqual([]);
}
async function isolatedEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, board = document.createElement('canvas'); board.width = 760; board.height = 570;
    board.setAttribute('data-return-light-comparison', ''); board.style.cssText = 'display:block;max-width:100%;height:auto';
    const bc = board.getContext('2d')!; bc.fillStyle = '#020713'; bc.fillRect(0, 0, board.width, board.height);
    bc.fillStyle = '#f8fafc'; bc.font = '18px system-ui'; bc.fillText('Columbia: sunlight and Earth shadow', 22, 28);
    bc.font = '12px system-ui'; bc.fillStyle = '#cbd5e1'; bc.fillText('Same opaque geometry · no coast plume · raised eclipse exposure', 22, 49);
    const masks: number[][] = [], rows: any[] = [];
    for (const cmOnly of [false, true]) for (const fraction of [1, 0.5, 0]) {
      const cv = document.createElement('canvas'); cv.width = 340; cv.height = 120;
      const ctx = cv.getContext('2d')!, angle = cmOnly ? 0 : Math.PI, scale = 2, x = 170, y = 60;
      const result = P.drawReturnCraft(ctx, x, y, scale, angle, cmOnly, { directionX: 0, directionY: 1, fraction });
      const image = ctx.getImageData(0, 0, cv.width, cv.height).data, mask: number[] = [];
      let outside = 0, opaque = 0, luminance = 0, covered = 0;
      for (let py = 0; py < cv.height; py++) for (let px = 0; px < cv.width; px++) {
        const at = (py * cv.width + px) * 4, alpha = image[at + 3]; mask.push(alpha);
        const localX = (px + 0.5 - x) / scale, localY = (py + 0.5 - y) / scale;
        if (alpha > 0 && (localX < (cmOnly ? -19 : -40) || localX > (cmOnly ? 14 : 41) || Math.abs(localY) > 17)) outside++;
        if (alpha > 0) { covered++; luminance += image[at] + image[at + 1] + image[at + 2]; }
        if (alpha === 255) opaque++;
      }
      const index = rows.length, col = cmOnly ? 1 : 0, row = index % 3, ox = col * 380, oy = 75 + row * 155;
      bc.fillStyle = '#cbd5e1'; bc.font = '13px system-ui';
      bc.fillText((cmOnly ? 'CM only' : 'CM + SM') + ' · ' + Math.round(fraction * 100) + '% solar disc', ox + 22, oy);
      bc.drawImage(cv, ox + 20, oy + 10);
      masks.push(mask); rows.push({ cmOnly, fraction, result, outside, covered, opaque, luminance });
    }
    const maskChanges = [1, 2, 4, 5].map(index => ({ index, changes: masks[index].reduce((n, alpha, at) => n + Number(alpha !== masks[index < 3 ? 0 : 3][at]), 0) }));
    document.querySelector('[data-return-workspace]')!.appendChild(board);
    return { rows, maskChanges };
  });
}
async function trajectoryMoments(page: Page, angle: number) {
  return page.evaluate(selected => {
    const P = (window as any).MoonMissionPure, profile = P.returnProfile(selected), duration = profile.summary.duration;
    function margin(time: number) { const s = P.returnSample(profile, time); return Math.atan2(Math.abs(s.x), -s.y) - Math.asin(6371000 / Math.hypot(s.x, s.y)); }
    const solar = Math.asin(695700000 / 149597870700); let partial: number | null = null, total: number | null = null;
    let previous = margin(0);
    for (let i = 1; i <= 2048; i++) {
      const time = duration * i / 2048, current = margin(time);
      if (current < -solar && total === null) total = time;
      if (partial === null && current * previous < 0) {
        let lo = duration * (i - 1) / 2048, hi = time, sign = previous;
        for (let n = 0; n < 55; n++) { const mid = (lo + hi) / 2; if (margin(mid) * sign > 0) lo = mid; else hi = mid; }
        partial = (lo + hi) / 2;
      }
      previous = current;
    }
    return { angle: selected, duration, partial, total, separation: profile.summary.separationTime };
  }, angle);
}

test('measured return sunlight follows Earth occultation without changing coast geometry, separation or review state', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  await expect(page.locator(MAIN)).toHaveAttribute('aria-describedby', 'mm-return-light-note');
  const note = page.locator('#mm-return-light-note');
  for (const text of ['+Y', '1 au', 'uniform', 'illustrative']) await expect(note).toContainText(text);
  const initial = await saved(page), rows: any[] = [], moments: any[] = [];
  const evidence = await isolatedEvidence(page);
  for (const row of evidence.rows) {
    expect(row.outside).toBe(0); expect(row.opaque).toBeGreaterThan(500); expect(row.covered).toBeGreaterThan(row.opaque);
    expect(row.result.cmOnly).toBe(row.cmOnly); expect(row.result.plumeVisible).toBe(false);
    expect(row.result.sunlight.fraction).toBe(row.fraction);
  }
  for (const comparison of evidence.maskChanges) expect(comparison.changes).toBe(0);
  for (const start of [0, 3]) {
    expect(evidence.rows[start].luminance).toBeGreaterThan(evidence.rows[start + 1].luminance);
    expect(evidence.rows[start + 1].luminance).toBeGreaterThan(evidence.rows[start + 2].luminance);
  }
  expect(evidence.rows[0].covered).toBeGreaterThan(evidence.rows[3].covered * 2);
  expect(await saved(page)).toEqual(initial);
  await capture(page, info, 'return-csm-cm-sunlight-comparison', '[data-return-light-comparison]');
  await page.locator('[data-return-light-comparison]').evaluate(el => el.remove());

  for (const angle of [-6.5, -4, -9]) {
    if (angle !== -6.5) await mount(page, { entryAngle: angle });
    const timing = await trajectoryMoments(page, angle); moments.push(timing);
    expect(timing.partial).not.toBeNull(); expect(timing.total).not.toBeNull();
    for (const [name, time] of [['sunlit', 0], ['partial', timing.partial!], ['total', timing.total!], ['separation', timing.separation + 0.2]] as const) {
      await seek(page, time);
      const state = await saved(page), { returnView: ignored, ...invariants } = state;
      for (const view of ['system', 'approach', 'crew']) {
        await page.locator('[data-return-view]').selectOption(view);
        const row = await inspect(page); await verifyLive(page, row); rows.push(row);
        const { returnView: ignoredAfter, ...after } = await saved(page); expect(after).toEqual(invariants);
        if (name === 'partial') expect(row.phase).toBe('partial'); if (name === 'total') expect(row.phase).toBe('total');
        if (name === 'separation') expect(row.sample.serviceModuleSeparated).toBe(true);
        if (angle === -6.5 && ((name === 'sunlit' && view === 'system') || (name === 'partial' && view === 'approach') ||
          (name === 'total' && view === 'approach') || (name === 'separation' && view === 'approach') || (name === 'separation' && view === 'crew'))) {
          await capture(page, info, 'return-' + name + '-' + view + '-1100');
        }
      }
    }
  }
  await mount(page); await page.locator('[data-return-arrival]').click();
  await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  const reviewed = await saved(page); expect(reviewed.returnRun.recorded).toBe(true); expect(reviewed.missionXP).toBe(0);
  await accessibility(page, info, 'return-sunlight-a11y-1100');
  await page.setViewportSize({ width: 320, height: 1000 });
  await seek(page, moments[0].partial); await page.locator('[data-return-view]').selectOption('approach');
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  const phoneRow = await inspect(page); await verifyLive(page, phoneRow); rows.push(phoneRow);
  const held = await saved(page), heldPixels = await settledPixels(page); expect(heldPixels.settled).toBe(true);
  await page.waitForTimeout(150);
  expect(await pixels(page)).toBe(heldPixels.hash); expect(await saved(page)).toEqual(held);
  await capture(page, info, 'return-partial-workspace-320', '[data-return-workspace]');
  await accessibility(page, info, 'return-sunlight-a11y-320');
  await mount(page, held); expect(await saved(page)).toEqual(held);
  await compareReloadPixels(page, heldPixels, await settledPixels(page));
  await page.locator('[data-return-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-return-elapsed'))).toBeCloseTo(phoneRow.time + 0.1, 6);
  expect((await saved(page)).returnResult).toEqual(reviewed.returnResult);
  await page.keyboard.press('Home'); await expect.poll(async () => (await inspect(page)).time).toBe(0);
  await page.keyboard.press('End'); await expect(page.locator('[data-entry-begin]')).toBeEnabled();
  const final = await saved(page); expect(final.returnResult).toEqual(reviewed.returnResult); expect(final.missionXP).toBe(0);
  expect(final.earnedBadges).toEqual(initial.earnedBadges); expect(final.missionLog).toEqual(initial.missionLog);
  const bounds = await page.locator('[data-return-workspace]').evaluate(el => {
    const r = el.getBoundingClientRect(), n = el.querySelector('#mm-return-light-note')!.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth + 1, left: r.left, right: r.right, noteLeft: n.left, noteRight: n.right };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320);
  expect(bounds.noteLeft).toBeGreaterThanOrEqual(0); expect(bounds.noteRight).toBeLessThanOrEqual(320); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'return-sunlight-measured.json'), JSON.stringify({ evidence, moments, rows, bounds, errors }, null, 2));
});
