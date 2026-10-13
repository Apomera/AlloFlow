import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_TRANSIT_SUNLIGHT_REPORT_DIR || 'reports/moon-mission-enhancement-pass52-2026-10-11/browser/sunlight');
const MAIN = '[data-transit-canvas]';
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
    (window as any).__mount({ moonMission: { missionPhase: 3, missionXP: 0, missionLog: [], animPaused: true,
      transitPaused: true, soundOff: true, difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
      earnedBadges: { first_step: true, mission_complete: true }, ...value } });
  }, extra);
  await expect(page.locator(MAIN)).toBeVisible();
  await expect(page.locator(MAIN)).toHaveAttribute('data-transit-sun-angle', '90');
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function seek(page: Page, seconds: number) {
  const time = Math.round(seconds * 10) / 10;
  await page.locator('[data-transit-seek]').evaluate((input: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-transit-time'))).toBeCloseTo(time, 6);
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
        cssHeight: cv.offsetHeight, opaque, time: cv.dataset.transitTime, view: cv.dataset.transitView };
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
      await writeFile(join(REPORT, 'transit-reload-' + name + '.png'), Buffer.from(png.split(',')[1], 'base64'));
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
  await writeFile(join(REPORT, 'transit-reload-pixels.json'), JSON.stringify({ before: beforeMetadata, after: afterMetadata, difference }, null, 2));
  expect(before.settled).toBe(true); expect(after.settled).toBe(true); expect(after.hash).toBe(before.hash);
}
async function inspect(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    const profile = P.transitProfile(P.cleanTransitPlayback(d).transitPlan);
    const time = Number(cv.dataset.transitTime), sample = P.transitSample(profile, time);
    const scratch = document.createElement('canvas'); scratch.width = cv.width / 2; scratch.height = cv.height / 2;
    const picture = P.drawTransitScene(scratch.getContext('2d'), scratch.width, scratch.height, sample, profile,
      { view: d.transitView, trueScale: d.trueScale });
    return { time, sample, picture, phase: cv.dataset.transitSun, fraction: Number(cv.dataset.transitSunFraction),
      sunAngle: Number(cv.dataset.transitSunAngle), view: d.transitView, trueScale: d.trueScale,
      plume: cv.dataset.transitPlume, engine: cv.dataset.transitEngine, summary: profile.summary,
      live: Object.fromEntries(['earthDistance', 'moonDistance', 'earthSpeed', 'moonSpeed', 'mass', 'propellant', 'thrust']
        .map(key => [key, Number(cv.dataset['transit' + key[0].toUpperCase() + key.slice(1)])])) };
  });
}
// Independent reference: vertical strips through the Sun. In this planar
// model both opaque discs lie on the same angular axis, so their union at a
// strip is the greater half-height. Adding areas would double-count overlap.
function referenceSun(s: any) {
  const solar = Math.asin(695700000 / 149597870700);
  const bodies = [{ name: 'earth', x: 0, y: 0, radius: 6371000 }, { name: 'moon', x: s.moonX, y: s.moonY, radius: 1737400 }]
    .map(body => ({ name: body.name, center: Math.atan2(body.x - s.x, body.y - s.y),
      radius: Math.asin(body.radius / Math.hypot(body.x - s.x, body.y - s.y)) }));
  const count = 16384, dx = 2 * solar / count, area = Math.PI * solar * solar;
  const covered = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    const x = -solar + (i + 0.5) * dx, height = Math.sqrt(Math.max(0, solar * solar - x * x));
    const h = bodies.map(body => Math.min(height, Math.sqrt(Math.max(0, body.radius ** 2 - (x - body.center) ** 2))));
    covered[0] += 2 * h[0] * dx; covered[1] += 2 * h[1] * dx; covered[2] += 2 * Math.max(h[0], h[1]) * dx;
  }
  const fraction = (index: number) => Math.max(0, Math.min(1, 1 - covered[index] / area));
  const phase = bodies.some(body => Math.abs(body.center) + solar <= body.radius) ? 'total' :
    bodies.some(body => Math.abs(body.center) < body.radius + solar) ? 'partial' : 'sunlit';
  return { phase, fraction: fraction(2), earth: fraction(0), moon: fraction(1), bodies };
}
async function verifyLive(page: Page, row: any) {
  const s = row.sample, p = row.picture, solar = referenceSun(s);
  expect(row.sunAngle).toBe(90); expect(p.sunAngle).toBe(90); expect(row.phase).toBe(solar.phase);
  expect(p.sunlight.phase).toBe(solar.phase); expect(Math.abs(row.fraction - solar.fraction)).toBeLessThan(0.00005);
  expect(p.sunlight.fraction).toBe(row.fraction); expect(p.sunlight.directionX).toBe(0); expect(p.sunlight.directionY).toBe(1);
  expect(Math.abs(p.sunlight.earth.fraction - solar.earth)).toBeLessThan(0.00005);
  expect(Math.abs(p.sunlight.moon.fraction - solar.moon)).toBeLessThan(0.00005);
  expect(p.craftSunlight.fraction).toBe(row.fraction);
  const angle = p.craftAngle, local = p.craftSunlight;
  expect(local.x * Math.cos(angle) - local.y * Math.sin(angle)).toBeCloseTo(0, 12);
  expect(local.x * Math.sin(angle) + local.y * Math.cos(angle)).toBeCloseTo(-1, 12);
  expect((p.craftX - p.earthX) / p.pictureScale).toBeCloseTo(s.x, 5);
  expect((p.earthY - p.craftY) / p.pictureScale).toBeCloseTo(s.y, 5);
  expect((p.craftX - p.moonX) / p.pictureScale).toBeCloseTo(s.x - s.moonX, 5);
  expect((p.moonY - p.craftY) / p.pictureScale).toBeCloseTo(s.y - s.moonY, 5);
  if (row.trueScale) {
    expect(p.earthRadius / p.pictureScale).toBeCloseTo(6371000, 6);
    expect(p.moonRadius / p.pictureScale).toBeCloseTo(1737400, 6);
  }
  const firing = s.engineOn && s.thrust > 0;
  expect(p.plumeVisible).toBe(firing); expect(row.plume).toBe(firing ? 'on' : 'off'); expect(row.engine).toBe(s.engineOn ? 'on' : 'off');
  if (firing) {
    expect(Math.cos(angle) * -s.thrustX + Math.sin(angle) * s.thrustY).toBeCloseTo(Math.hypot(s.thrustX, s.thrustY), 6);
  } else expect(angle).toBeCloseTo(Math.atan2(-s.vy, s.vx) + Math.PI, 12);
  for (const [key, value] of Object.entries(row.live)) expect(value).toBeCloseTo(s[key], 6);
  await expect(page.locator('[data-transit-readouts]')).toContainText('Visible solar disc');
  await expect(page.locator('[data-transit-value="sun"]')).toContainText((row.fraction * 100).toFixed(1) + '%');
  await expect(page.locator('[data-transit-value="sun"]')).toContainText(solar.phase === 'sunlit' ? 'Full sunlight' : /eclipse/i);
}
async function capture(page: Page, info: TestInfo, name: string, selector = MAIN) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(selector).screenshot({ path }); await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-transit-workspace]']] },
    { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations
    .map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  const path = join(REPORT, name + '.json'); await writeFile(path, JSON.stringify(violations, null, 2));
  await info.attach(name, { path, contentType: 'application/json' }); expect(violations).toEqual([]);
}
async function isolatedEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, board = document.createElement('canvas'); board.width = 960; board.height = 450;
    board.setAttribute('data-transit-light-comparison', ''); board.style.cssText = 'display:block;max-width:100%;height:auto';
    const bc = board.getContext('2d')!; bc.fillStyle = '#020713'; bc.fillRect(0, 0, board.width, board.height);
    bc.fillStyle = '#f8fafc'; bc.font = '18px system-ui'; bc.fillText('Columbia + Eagle: sunlight and shadow', 22, 28);
    bc.font = '12px system-ui'; bc.fillStyle = '#cbd5e1'; bc.fillText('Opaque hull geometry stays fixed; the SPS plume emits its own light.', 22, 49);
    const masks: number[][] = [], exhausts: number[][] = [], rows: any[] = [];
    for (const engineOn of [false, true]) for (const fraction of [1, 0.5, 0]) {
      const cv = document.createElement('canvas'); cv.width = 300; cv.height = 140;
      const ctx = cv.getContext('2d')!, scale = 1.25, x = 115, y = 70;
      const result = P.drawLOIStack(ctx, x, y, scale, 0, { time: 23.75, engineOn, thrust: engineOn ? 91000 : 0,
        sunlight: { directionX: 0, directionY: 1, fraction } });
      const image = ctx.getImageData(0, 0, cv.width, cv.height).data, mask: number[] = [], exhaust: number[] = [];
      let opaque = 0, luminance = 0, covered = 0, exhaustPixels = 0;
      for (let py = 0; py < cv.height; py++) for (let px = 0; px < cv.width; px++) {
        const at = (py * cv.width + px) * 4, alpha = image[at + 3]; mask.push(alpha);
        if (px >= 195) { exhaust.push(...image.slice(at, at + 4)); if (alpha) exhaustPixels++; }
        if (px < 186 && alpha > 0) { covered++; luminance += image[at] + image[at + 1] + image[at + 2]; }
        if (px < 186 && alpha === 255) opaque++;
      }
      const index = rows.length, col = index % 3, row = engineOn ? 1 : 0, ox = col * 320, oy = 80 + row * 175;
      bc.fillStyle = '#cbd5e1'; bc.font = '13px system-ui';
      bc.fillText((engineOn ? 'SPS firing' : 'Coasting') + ' · ' + Math.round(fraction * 100) + '% sunlight', ox + 22, oy);
      bc.drawImage(cv, ox + 10, oy + 10);
      masks.push(mask); exhausts.push(exhaust); rows.push({ engineOn, fraction, result, covered, opaque, luminance, exhaustPixels });
    }
    const maskChanges = [1, 2, 4, 5].map(index => ({ index,
      changes: masks[index].reduce((n, alpha, at) => n + Number(alpha !== masks[index < 3 ? 0 : 3][at]), 0) }));
    const plumeChanges = [4, 5].map(index => ({ index,
      changes: exhausts[index].reduce((n, channel, at) => n + Number(channel !== exhausts[3][at]), 0) }));
    document.querySelector('[data-transit-workspace]')!.appendChild(board);
    // Frozen physical geometry in the Moon frame isolates the sky from body
    // movement and Earth rotation. Only simulation time differs by 28 hours.
    const d = (window as any).__toolData.moonMission, real = P.transitProfile(P.cleanTransitPlayback(d).transitPlan);
    const last = P.transitSample(real, real.summary.duration), frozen = { samples: [{ ...last, time: 0 }], events: {}, summary: { actualBurn: 0 } };
    const scenes = [0, 100000].map(time => {
      const cv = document.createElement('canvas'); cv.width = 760; cv.height = 360;
      const ctx = cv.getContext('2d')!, result = P.drawTransitScene(ctx, cv.width, cv.height,
        { ...last, time, engineOn: false, thrust: 0 }, frozen, { view: 'moon' });
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let hash = 2166136261;
      for (const channel of data) hash = Math.imul(hash ^ channel, 16777619);
      return { time, hash: hash >>> 0, result };
    });
    return { rows, maskChanges, plumeChanges, scenes };
  });
}

test('shared transit sunlight preserves measured navigation, correction thrust and review state in both cameras', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true }); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  await expect(page.locator(MAIN)).toHaveAttribute('aria-describedby', 'mm-transit-light-note');
  for (const text of ['+Y', '1 au', 'uniform', 'illustrative']) await expect(page.locator('#mm-transit-light-note')).toContainText(text);
  const initial = await saved(page), rows: any[] = [], evidence = await isolatedEvidence(page);
  for (const row of evidence.rows) {
    expect(row.opaque).toBeGreaterThan(500); expect(row.covered).toBeGreaterThan(row.opaque);
    expect(row.result.sunlight.fraction).toBe(row.fraction); expect(row.result.plumeVisible).toBe(row.engineOn);
    expect(row.exhaustPixels).toBe(row.engineOn ? evidence.rows[3].exhaustPixels : 0);
  }
  expect(evidence.rows[3].exhaustPixels).toBeGreaterThan(300);
  for (const comparison of evidence.maskChanges) expect(comparison.changes).toBe(0);
  for (const comparison of evidence.plumeChanges) expect(comparison.changes).toBe(0);
  for (const start of [0, 3]) {
    expect(evidence.rows[start].luminance).toBeGreaterThan(evidence.rows[start + 1].luminance);
    expect(evidence.rows[start + 1].luminance).toBeGreaterThan(evidence.rows[start + 2].luminance);
  }
  expect(evidence.scenes[0].hash).toBe(evidence.scenes[1].hash);
  for (const scene of evidence.scenes) {
    expect(scene.result.plumeVisible).toBe(false);
    expect(scene.result.earthX + scene.result.earthRadius < 0 || scene.result.earthX - scene.result.earthRadius > 760 ||
      scene.result.earthY + scene.result.earthRadius < 73 || scene.result.earthY - scene.result.earthRadius > 304).toBe(true);
  }
  expect(await saved(page)).toEqual(initial);
  await capture(page, info, 'transit-material-and-plume-comparison', '[data-transit-light-comparison]');
  await page.locator('[data-transit-light-comparison]').evaluate(el => el.remove());
  const departure = await inspect(page); await verifyLive(page, departure); rows.push(departure);
  await capture(page, info, 'transit-nominal-system-1100');
  await seek(page, 36 * 3600);
  const { transitView: ignoredView, trueScale: ignoredScale, ...fixed } = await saved(page);
  let fixedSample: any = null;
  for (const view of ['system', 'moon']) for (const trueScale of [false, true]) {
    await page.locator('[data-transit-view]').selectOption(view);
    const button = page.locator('[data-moonmission-true-scale]');
    if ((await button.getAttribute('aria-pressed')) !== String(trueScale)) await button.click();
    const row = await inspect(page); await verifyLive(page, row); rows.push(row);
    if (fixedSample === null) fixedSample = row.sample; else expect(row.sample).toEqual(fixedSample);
    const { transitView: viewAfter, trueScale: scaleAfter, ...after } = await saved(page);
    expect(viewAfter).toBe(view); expect(!!scaleAfter).toBe(trueScale); expect(after).toEqual(fixed);
  }
  await page.locator('[data-transit-result]').click(); await expect(page.locator('[data-transit-proceed]')).toBeEnabled();
  const nominal = await saved(page); expect(nominal.transitResult.outcome).toBe('encounter'); expect(nominal.missionXP).toBe(0);
  const arrival = await inspect(page); await verifyLive(page, arrival); rows.push(arrival);
  await page.locator('[data-moonmission-true-scale]').click();
  await expect(page.locator('[data-moonmission-true-scale]')).toHaveAttribute('aria-pressed', 'false');
  await capture(page, info, 'transit-nominal-moon-approach-1100');

  await page.locator('[data-transit-preset="corrected"]').click();
  const reset = await saved(page); expect(reset.transitResult).toBeNull(); expect(reset.transitRun.recorded).toBe(false);
  await page.locator('[data-transit-milestone="burn"]').click(); await page.locator('[data-transit-view]').selectOption('system');
  const burn = await inspect(page); await verifyLive(page, burn); rows.push(burn);
  expect(burn.plume).toBe('on'); expect(burn.sample.thrust).toBeGreaterThan(90000); expect(burn.sample.propellant).toBeLessThan(departure.sample.propellant);
  await capture(page, info, 'transit-correction-burn-1100');
  await page.locator('[data-transit-milestone="cutoff"]').click();
  const cutoff = await inspect(page); await verifyLive(page, cutoff); rows.push(cutoff);
  expect(cutoff.plume).toBe('off'); expect(cutoff.sample.thrust).toBe(0); expect(cutoff.sample.mass).toBeLessThan(burn.sample.mass);
  await page.locator('[data-transit-result]').click(); await expect(page.locator('[data-transit-proceed]')).toBeEnabled();
  const corrected = await saved(page); expect(corrected.transitResult.outcome).toBe('encounter');
  expect(corrected.transitResult.propellantUsed).toBeGreaterThan(0); expect(corrected.transitRun.recorded).toBe(true);
  await page.locator('[data-transit-view]').selectOption('moon'); await page.locator('[data-moonmission-true-scale]').click();
  const trueMoon = await inspect(page); await verifyLive(page, trueMoon); rows.push(trueMoon); expect(trueMoon.trueScale).toBe(true);
  await capture(page, info, 'transit-corrected-moon-true-size-1100');
  await accessibility(page, info, 'transit-sunlight-a11y-1100');

  await page.setViewportSize({ width: 320, height: 1000 });
  await seek(page, corrected.transitResult.duration - 1800); await page.locator('[data-moonmission-true-scale]').click();
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(320);
  const phone = await inspect(page); await verifyLive(page, phone); rows.push(phone);
  const held = await saved(page), heldPixels = await settledPixels(page); expect(heldPixels.settled).toBe(true);
  await page.waitForTimeout(150); expect(await pixels(page)).toBe(heldPixels.hash); expect(await saved(page)).toEqual(held);
  await capture(page, info, 'transit-moon-workspace-320', '[data-transit-workspace]');
  await accessibility(page, info, 'transit-sunlight-a11y-320');
  await mount(page, held); expect(await saved(page)).toEqual(held);
  await compareReloadPixels(page, heldPixels, await settledPixels(page));
  await page.locator('[data-transit-seek]').focus(); await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-transit-time'))).toBeCloseTo(phone.time + 0.1, 6);
  expect((await saved(page)).transitResult).toEqual(corrected.transitResult);
  await page.keyboard.press('Home'); await expect.poll(async () => (await inspect(page)).time).toBe(0);
  await page.keyboard.press('End'); await expect(page.locator('[data-transit-proceed]')).toBeEnabled();
  const final = await saved(page); expect(final.transitResult).toEqual(corrected.transitResult); expect(final.missionXP).toBe(0);
  expect(final.earnedBadges).toEqual(initial.earnedBadges); expect(final.missionLog).toEqual(initial.missionLog);
  const bounds = await page.locator('[data-transit-workspace]').evaluate(el => {
    const r = el.getBoundingClientRect(), n = el.querySelector('#mm-transit-light-note')!.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth + 1, left: r.left, right: r.right, noteLeft: n.left, noteRight: n.right };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320);
  expect(bounds.noteLeft).toBeGreaterThanOrEqual(0); expect(bounds.noteRight).toBeLessThanOrEqual(320); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'transit-sunlight-measured.json'), JSON.stringify({ evidence, rows, bounds, errors }, null, 2));
});
