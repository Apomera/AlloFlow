import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass56-2026-10-12/browser/injection-sunlight');
const MAIN = '[data-tli-canvas]';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, extra: any = {}) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(extra => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    (window as any).__mount({ moonMission: { missionPhase: 2, tliStarted: true, animPaused: true, tliPaused: true,
      soundOff: true, missionXP: 0, missionLog: [], difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
      earnedBadges: { first_step: true, mission_complete: true }, tliPlan: { duration: 342 }, tliView: 'burn',
      tliRun: { version: 1, duration: 342, orbitTime: 9245.011304324662, time: 150.5, recorded: false }, ...extra } });
  }, extra);
  await expect(page.locator(MAIN)).toBeVisible();
  await expect.poll(() => page.locator(MAIN).getAttribute('data-tli-sun-fraction')).not.toBeNull();
  await page.evaluate(async () => { await document.fonts.ready; });
}
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
function progress(d: any) { const { tliView, ...rest } = d; return rest; }
async function seek(page: Page, time: number) {
  await page.locator('[data-tli-seek]').evaluate((el: HTMLInputElement, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, String(value));
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-tli-time'))).toBeCloseTo(time, 6);
}
async function settledPixels(page: Page) {
  return page.locator(MAIN).evaluate(async (cv: HTMLCanvasElement) => {
    await document.fonts.ready; let last = '', repeats = 0;
    for (let frame = 0; frame < 30; frame++) {
      await new Promise<void>(done => requestAnimationFrame(() => done()));
      const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
      let hash = 2166136261, opaque = 0;
      for (const channel of data) hash = Math.imul(hash ^ channel, 16777619);
      for (let i = 3; i < data.length; i += 4) if (data[i] === 255) opaque++;
      const key = [hash >>> 0, cv.width, cv.height, cv.dataset.tliTime].join(':');
      repeats = key === last && opaque === cv.width * cv.height && cv.width === cv.offsetWidth * 2 ? repeats + 1 : 0; last = key;
      if (repeats >= 2) return { hash: hash >>> 0, width: cv.width, height: cv.height, opaque, time: cv.dataset.tliTime };
    }
    throw new Error('The paused injection canvas did not settle within 30 frames');
  });
}
async function capture(page: Page, info: TestInfo, name: string, selector = MAIN) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  if (selector === '#injection-light-board') {
    // Export the synthetic material board directly; live application views below
    // still use browser screenshots including their surrounding layout.
    const url = await page.locator(selector).evaluate((cv: HTMLCanvasElement) => cv.toDataURL('image/png'));
    expect(url.startsWith('data:image/png;base64,')).toBe(true);
    await writeFile(path, Buffer.from(url.split(',')[1], 'base64'));
  } else await page.locator(selector).screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-tli-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  const path = join(REPORT, name + '.json'); await writeFile(path, JSON.stringify(violations, null, 2));
  await info.attach(name, { path, contentType: 'application/json' }); expect(violations).toEqual([]);
}

// Numerically integrate vertical strips through the Sun's angular disc. This
// does not call the implementation's circle-overlap equation or shadow helper.
function referenceSun(sample: any, orbitAngle: number) {
  const c = Math.cos(orbitAngle), s = Math.sin(orbitAngle);
  const x = sample.x * c - sample.y * s, y = sample.x * s + sample.y * c;
  const earth = Math.asin(6371000 / Math.hypot(x, y)), sun = Math.asin(695700000 / 149597870700);
  const separation = Math.atan2(Math.abs(y), -x), slices = 16384, dx = 2 * sun / slices;
  let covered = 0;
  for (let i = 0; i < slices; i++) {
    const at = -sun + (i + 0.5) * dx;
    const solarHeight = Math.sqrt(Math.max(0, sun * sun - at * at));
    const earthHeight = Math.sqrt(Math.max(0, earth * earth - (at - separation) ** 2));
    covered += 2 * Math.min(solarHeight, earthHeight) * dx;
  }
  const fraction = Math.max(0, Math.min(1, 1 - covered / (Math.PI * sun * sun)));
  return { x, y, earth, sun, separation, fraction,
    phase: separation <= earth - sun ? 'total' : separation < earth + sun ? 'partial' : 'sunlit' };
}
async function lightingTimes(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, sample = P.tliSample(P.tliProfile(), 150.5);
    const period = P.orbitSnapshot(0).period, bodyAngle = Math.atan2(sample.y, sample.x);
    const earth = Math.asin(6371000 / Math.hypot(sample.x, sample.y));
    const atAngle = (worldAngle: number) => {
      const ignitionAngle = ((worldAngle - bodyAngle + Math.PI / 2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      return period * (2 + ignitionAngle / (Math.PI * 2));
    };
    return { sample, period, sunlit: atAngle(0), total: atAngle(Math.PI), partial: atAngle(Math.PI - earth) };
  });
}
async function inspect(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, d = (window as any).__toolData.moonMission;
    const profile = P.tliProfile(d.tliPlan), time = Number(cv.dataset.tliTime), sample = P.tliSample(profile, time);
    const before = JSON.stringify(sample), W = cv.width / 2, H = cv.height / 2;
    const scratch = document.createElement('canvas'); scratch.width = cv.width; scratch.height = cv.height;
    const ctx = scratch.getContext('2d')!; ctx.scale(2, 2);
    const scene = P.drawTliScene(ctx, W, H, sample, profile, { view: d.tliView, orbitTime: d.tliRun.orbitTime });
    const isolated = document.createElement('canvas'); isolated.width = cv.width; isolated.height = cv.height;
    const ic = isolated.getContext('2d')!; ic.scale(2, 2);
    P.drawTliStack(ic, scene.craftX, scene.craftY, scene.heading, scene.stack.length, sample.thrust, { sunlight: scene.viewSunlight });
    const a = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    const b = ic.getImageData(0, 0, cv.width, cv.height).data;
    let opaqueChecked = 0, opaqueMismatches = 0, maximumDifference = 0;
    const mismatchPixels: any[] = [];
    for (let i = 0; i < a.length; i += 4) {
      if (b[i + 3] !== 255) continue;
      opaqueChecked++; const difference = Math.max(...[0, 1, 2].map(channel => Math.abs(a[i + channel] - b[i + channel])));
      maximumDifference = Math.max(maximumDifference, difference);
      if (difference > 1 || a[i + 3] !== 255) {
        opaqueMismatches++;
        mismatchPixels.push({ x: (i / 4) % cv.width, y: Math.floor(i / 4 / cv.width),
          actual: Array.from(a.slice(i, i + 4)), expected: Array.from(b.slice(i, i + 4)), difference });
      }
    }
    return { sample, scene, phase: cv.dataset.tliSun, fraction: Number(cv.dataset.tliSunFraction), view: d.tliView,
      orbitTime: d.tliRun.orbitTime, orbitAngle: P.orbitSnapshot(d.tliRun.orbitTime).orbAng,
      anchor: Math.atan2(profile.samples[profile.samples.length - 1].y, profile.samples[profile.samples.length - 1].x) / 2,
      live: Object.fromEntries(['time', 'altitude', 'speed', 'mass', 'energy', 'thrust', 'acceleration'].map(key =>
        [key, Number(cv.dataset['tli' + key[0].toUpperCase() + key.slice(1)])])),
      plume: cv.dataset.tliPlume, recorded: cv.dataset.tliRecorded, inputUnchanged: before === JSON.stringify(sample),
      opaqueChecked, opaqueMismatches, maximumDifference, mismatchPixels };
  });
}
async function verifyLive(page: Page, row: any) {
  const s = row.sample, g = row.scene, ref = referenceSun(s, row.orbitAngle);
  if (row.opaqueMismatches) await writeFile(join(REPORT, 'injection-hull-mismatch-' + row.view + '-' + row.phase + '.json'),
    JSON.stringify({ ...row, independentSunlight: ref }, null, 2));
  expect(row.phase).toBe(ref.phase); expect(g.sunlight.phase).toBe(ref.phase);
  expect(Math.abs(row.fraction - ref.fraction)).toBeLessThan(0.00005);
  expect(g.sunlight.fraction).toBe(row.fraction); expect(g.sunlight.directionX).toBe(1); expect(g.sunlight.directionY).toBe(0);
  const a = row.anchor + row.orbitAngle, sx = row.view === 'orbit' ? 1 : -Math.sin(a), sy = row.view === 'orbit' ? 0 : Math.cos(a);
  expect(g.viewSunlight.directionX).toBeCloseTo(sx, 12); expect(g.viewSunlight.directionY).toBeCloseTo(sy, 12);
  expect(g.viewSunlight.fraction).toBe(row.fraction);
  const sunAngle = Math.atan2(-sy, sx), angleDifference = g.earthSunAngle - sunAngle;
  expect(Math.cos(angleDifference)).toBeCloseTo(1, 12); expect(Math.sin(angleDifference)).toBeCloseTo(0, 12);
  const local = g.stack.sunlight, rotation = g.heading + Math.PI / 2;
  expect(local.x * Math.cos(rotation) - local.y * Math.sin(rotation)).toBeCloseTo(sx, 12);
  expect(local.x * Math.sin(rotation) + local.y * Math.cos(rotation)).toBeCloseTo(-sy, 12);
  expect(local.fraction).toBe(row.fraction); expect(g.scaleX).toBe(g.scaleY);
  expect(g.stack.sections).toEqual(['cm', 'sm', 'sla', 'iu', 's4b']); expect(g.plume).toBe(s.thrust > 0);
  expect(row.plume).toBe(String(s.thrust > 0)); expect(row.inputUnchanged).toBe(true);
  expect(row.opaqueChecked).toBeGreaterThan(500); expect(row.opaqueMismatches).toBe(0);
  for (const [key, value] of Object.entries(row.live)) expect(value).toBeCloseTo(s[key === 'acceleration' ? 'properAcceleration' : key], 6);
  await expect(page.locator('[data-tli-value="sun"]')).toContainText((row.fraction * 100).toFixed(1) + '%');
  await expect(page.locator('[data-tli-value="sun"]')).toContainText(row.phase === 'sunlit' ? 'Full sunlight' : row.phase === 'partial' ? 'Partial sunlight' : 'Earth shadow');
}

async function materialEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure, board = document.createElement('canvas'); board.width = 960; board.height = 480;
    board.id = 'injection-light-board'; board.style.cssText = 'display:block;max-width:100%;height:auto';
    const bc = board.getContext('2d')!; bc.fillStyle = '#071224'; bc.fillRect(0, 0, board.width, board.height);
    bc.fillStyle = '#f8fafc'; bc.font = '18px system-ui'; bc.fillText('S-IVB injection · independent sunlight and thrust', 20, 28);
    bc.fillStyle = '#cbd5e1'; bc.font = '13px system-ui'; bc.fillText('Opaque hull materials dim in Earth shadow; the J-2 plume emits its own light.', 20, 51);
    const rows: any[] = [], images: Uint8ClampedArray[] = [];
    for (const firing of [false, true]) for (const fraction of [1, 0.5, 0]) {
      const cv = document.createElement('canvas'); cv.width = 300; cv.height = 160; const ctx = cv.getContext('2d')!;
      const result = P.drawTliStack(ctx, 170, 80, 0, 110, firing ? P.tliPhysics.thrust : 0,
        { sunlight: { directionX: 0, directionY: 1, fraction } });
      const data = ctx.getImageData(0, 0, 300, 160).data;
      let opaque = 0, luminance = 0, plumePixels = 0, materialPixels = 0;
      for (let y = 0; y < 160; y++) for (let x = 0; x < 300; x++) {
        const at = (y * 300 + x) * 4;
        if (x < result.nozzle.x - 2 && data[at + 3]) plumePixels++;
        if (x > result.nozzle.x + 2 && data[at + 3] === 255) {
          opaque++; luminance += data[at] + data[at + 1] + data[at + 2];
        }
        if (x > result.nozzle.x + 2 && data[at + 3]) materialPixels++;
      }
      const col = rows.length % 3, top = firing ? 295 : 95;
      bc.fillStyle = '#cbd5e1'; bc.font = '13px system-ui';
      bc.fillText((firing ? 'J-2 firing' : 'Engine off') + ' · ' + fraction * 100 + '% solar disc', col * 320 + 20, top);
      bc.drawImage(cv, col * 320 + 10, top + 10);
      rows.push({ firing, fraction, result, opaque, luminance, plumePixels, materialPixels }); images.push(data);
    }
    const comparisons = [1, 2, 4, 5].map(index => {
      const base = index < 3 ? 0 : 3; let alphaMismatches = 0, plumeChanges = 0;
      for (let at = 0; at < images[index].length; at += 4) {
        if (images[index][at + 3] !== images[base][at + 3]) alphaMismatches++;
        const x = (at / 4) % 300;
        if (x < rows[index].result.nozzle.x - 2 && [0, 1, 2, 3].some(channel => images[index][at + channel] !== images[base][at + channel])) plumeChanges++;
      }
      return { index, alphaMismatches, plumeChanges };
    });
    document.querySelector('[data-tli-workspace]')!.append(board); return { rows, comparisons };
  });
}

test('injection sunlight keeps Earth, retained spacecraft and camera frames consistent through shadow, cutoff and review', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true }); const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page);
  await expect(page.locator(MAIN)).toHaveAttribute('aria-describedby', 'mm-tli-light-note');
  await expect(page.locator('[data-tli-light-note]')).toContainText('Earth and spacecraft share a fixed Sun');
  const initial = await saved(page), times = await lightingTimes(page), evidence = await materialEvidence(page), rows: any[] = [];
  await writeFile(join(REPORT, 'injection-material-evidence.json'), JSON.stringify(evidence, null, 2));
  for (const row of evidence.rows) {
    expect(row.opaque).toBeGreaterThan(1000); expect(row.materialPixels).toBeGreaterThan(row.opaque);
    expect(row.result.sunlight.fraction).toBe(row.fraction); expect(row.result.plume).toBe(row.firing);
    expect(row.plumePixels).toBe(row.firing ? evidence.rows[3].plumePixels : 0);
  }
  expect(evidence.rows[3].plumePixels).toBeGreaterThan(1000);
  for (const row of evidence.comparisons) { expect(row.alphaMismatches).toBe(0); expect(row.plumeChanges).toBe(0); }
  for (const start of [0, 3]) {
    expect(evidence.rows[start].luminance).toBeGreaterThan(evidence.rows[start + 1].luminance);
    expect(evidence.rows[start + 1].luminance).toBeGreaterThan(evidence.rows[start + 2].luminance);
  }
  expect(await saved(page)).toEqual(initial);
  await capture(page, info, 'injection-material-board', '#injection-light-board');
  await page.locator('#injection-light-board').evaluate(el => el.remove());

  for (const phase of ['sunlit', 'total', 'partial'] as const) {
    await mount(page, { tliRun: { version: 1, duration: 342, orbitTime: times[phase], time: 150.5, recorded: false } });
    const held = progress(await saved(page)); let sameSample: any = null;
    for (const view of ['burn', 'orbit']) {
      await page.locator('[data-tli-view]').selectOption(view); await settledPixels(page);
      const row = await inspect(page); await verifyLive(page, row); rows.push(row);
      expect(row.phase).toBe(phase); if (phase === 'partial') { expect(row.fraction).toBeGreaterThan(0.45); expect(row.fraction).toBeLessThan(0.55); }
      if (sameSample === null) sameSample = row.sample; else expect(row.sample).toEqual(sameSample);
      expect(progress(await saved(page))).toEqual(held); await expect(page.locator('[data-tli-proceed]')).toBeDisabled();
      if ((phase === 'sunlit' && view === 'burn') || (phase === 'total' && view === 'orbit') || (phase === 'partial' && view === 'burn')) {
        await capture(page, info, 'injection-' + phase + '-' + view + '-1100');
      }
    }
  }
  await page.locator('[data-tli-view]').selectOption('burn'); await accessibility(page, info, 'injection-light-a11y-1100');
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(390);
  const phonePixels = await settledPixels(page), phone = await inspect(page); await verifyLive(page, phone); rows.push(phone);
  expect(phone.phase).toBe('partial'); const phoneSave = await saved(page);
  await capture(page, info, 'injection-partial-workspace-390', '[data-tli-workspace]');
  await accessibility(page, info, 'injection-light-a11y-390'); expect(await settledPixels(page)).toEqual(phonePixels);
  await mount(page, phoneSave); expect(await settledPixels(page)).toEqual(phonePixels); expect(await saved(page)).toEqual(phoneSave);
  const beforeCamera = progress(await saved(page));
  await page.locator('[data-tli-view]').selectOption('orbit'); await settledPixels(page);
  const phoneOrbit = await inspect(page); await verifyLive(page, phoneOrbit); rows.push(phoneOrbit);
  await page.locator('[data-tli-view]').selectOption('burn'); expect(await settledPixels(page)).toEqual(phonePixels);
  expect(progress(await saved(page))).toEqual(beforeCamera);

  await seek(page, 100); const earlier = await inspect(page); await verifyLive(page, earlier); rows.push(earlier);
  expect(earlier.sample.mass).toBeGreaterThan(phone.sample.mass); expect(earlier.sample.properAcceleration).toBeLessThan(phone.sample.properAcceleration);
  await page.locator('[data-tli-rate]').selectOption('1'); await page.locator('[data-tli-pause]').click();
  await expect.poll(async () => Number(await page.locator(MAIN).getAttribute('data-tli-time'))).toBeGreaterThan(100.1);
  await page.locator('[data-tli-pause]').click(); const paused = await settledPixels(page), pauseSave = await saved(page);
  await page.waitForTimeout(200); expect(await settledPixels(page)).toEqual(paused); expect(await saved(page)).toEqual(pauseSave);
  await page.locator('[data-tli-review]').click(); await expect(page.locator('[data-tli-proceed]')).toBeEnabled();
  await settledPixels(page); const cutoff = await inspect(page); await verifyLive(page, cutoff); rows.push(cutoff);
  expect(cutoff.sample.thrust).toBe(0); expect(cutoff.plume).toBe('false'); expect(cutoff.recorded).toBe('true');
  const reviewed = await saved(page); expect(reviewed.tliResult.outcome).not.toBe('insufficient'); expect(reviewed.missionXP).toBe(0);
  await capture(page, info, 'injection-cutoff-orbit-390');
  await seek(page, 80); expect((await saved(page)).tliResult).toEqual(reviewed.tliResult);
  await expect(page.locator('[data-tli-proceed]')).toBeEnabled(); await mount(page, await saved(page));
  expect((await saved(page)).tliResult).toEqual(reviewed.tliResult); await expect(page.locator('[data-tli-proceed]')).toBeEnabled();
  await page.locator('[data-tli-plan]').selectOption('300'); await expect(page.locator('[data-tli-proceed]')).toBeDisabled();
  expect((await saved(page)).tliResult).toBeNull();
  await page.locator('[data-tli-review]').click(); await expect(page.locator('[data-tli-proceed]')).toBeDisabled();
  const short = await saved(page); expect(short.tliResult.outcome).toBe('insufficient'); expect(short.missionXP).toBe(0);
  expect(short.missionPhase).toBe(2); expect(short.earnedBadges).toEqual(initial.earnedBadges); expect(short.missionLog).toEqual(initial.missionLog);
  const bounds = await page.locator('[data-tli-workspace]').evaluate(el => {
    const r = el.getBoundingClientRect(), note = el.querySelector('[data-tli-light-note]')!.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth + 1, left: r.left, right: r.right, noteLeft: note.left, noteRight: note.right };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(390);
  expect(bounds.noteLeft).toBeGreaterThanOrEqual(0); expect(bounds.noteRight).toBeLessThanOrEqual(390); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'injection-sunlight-measured.json'), JSON.stringify({ times, evidence, rows, phonePixels, paused, bounds, errors }, null, 2));
});
