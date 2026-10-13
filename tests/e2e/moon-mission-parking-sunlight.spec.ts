import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_REPORT_DIR || 'reports/moon-mission-enhancement-pass55-2026-10-12/browser/parking-sunlight');
const MAIN = '[data-orbit-canvas]';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function mount(page: Page, time = 0, checkpoint?: any) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(({ time, checkpoint }) => {
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    (window as any).__mount({ moonMission: checkpoint || {
      missionPhase: 2, animPaused: true, orbitPaused: true, soundOff: true, missionXP: 0, missionLog: [],
      earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
      orbitRun: { version: 1, time }, orbitPlaybackRate: 360,
    } });
  }, { time, checkpoint });
  await expect(page.locator(MAIN)).toBeVisible();
  await page.evaluate(async () => { await document.fonts.ready; });
}
async function orbit(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => ({ time: Number(cv.dataset.orbitTime),
    shadow: cv.dataset.orbitShadow, engine: cv.dataset.orbitEngine, window: cv.dataset.orbitWindow,
    speed: Number(cv.dataset.orbitSpeed), altitude: Number(cv.dataset.orbitAltitude), period: Number(cv.dataset.orbitPeriod),
    sunrises: Number(cv.dataset.orbitSunrises), width: cv.width, height: cv.height }));
}
async function pixels(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let hash = 2166136261; for (const value of d) hash = Math.imul(hash ^ value, 16777619); return hash >>> 0;
  });
}
async function settledPixels(page: Page) {
  let previous = -1, equal = 0;
  for (let frame = 0; frame < 30; frame++) {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    const current = await pixels(page); equal = current === previous ? equal + 1 : 0; previous = current;
    if (equal >= 2) return current;
  }
  throw new Error('The paused parking orbit canvas did not settle within 30 frames');
}
async function capture(page: Page, info: TestInfo, name: string, workspace = false) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(workspace ? '[data-orbit-workspace]' : MAIN).screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-orbit-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  await info.attach(name, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
  expect(violations).toEqual([]);
}

async function materialEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const board = document.createElement('section'); board.id = 'parking-sunlight-board';
    board.style.cssText = 'width:960px;padding:20px;box-sizing:border-box;background:#06101e;color:#e2e8f0;font:14px system-ui';
    const heading = document.createElement('h2'); heading.textContent = 'Parking stack · shared Sun from the right'; board.append(heading);
    const intro = document.createElement('p'); intro.textContent = 'Legacy material · sunlit material · Earth shadow with 24% shade exposure'; board.append(intro);
    const angles = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
    const rows = angles.map(angle => {
      const label = document.createElement('h3'); label.textContent = 'Stack rotation ' + Math.round(angle * 180 / Math.PI) + '°'; board.append(label);
      const group = document.createElement('div'); group.style.cssText = 'display:flex;gap:10px'; board.append(group);
      const variants = ['legacy', 'sunlit', 'shadow'].map(kind => {
        const cv = document.createElement('canvas'); cv.width = 300; cv.height = 200;
        cv.style.cssText = 'display:block;background:#020815'; group.append(cv);
        const ctx = cv.getContext('2d')!, k = 5, top = -32.4 * k / 2 - 8.9 * k;
        const light = kind === 'legacy' ? undefined : P.orbitalCraftLight({ directionX: 1, directionY: 0, fraction: kind === 'shadow' ? 0 : 1 }, angle);
        ctx.translate(150, 100); ctx.rotate(angle);
        const geometry = P.saturnV(ctx, 0, top, P.saturnVHeight() * k, 3, { les: false, ...(light ? { orbitLight: light } : {}) });
        const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
        // Read opaque material interiors in body coordinates, then transform to the
        // actual rotated canvas. Avoid the service ring and S-IVB roll pattern.
        const sample = (section: string, u: number) => {
          const s = geometry.sections.find((p: any) => p.id === section), v = 0.32;
          const x = u * (s.w0 + (s.w1 - s.w0) * v) / 2, y = s.y0 + (s.y1 - s.y0) * v;
          const px = Math.floor(150 + x * Math.cos(angle) - y * Math.sin(angle));
          const py = Math.floor(100 + x * Math.sin(angle) + y * Math.cos(angle));
          return Array.from(d.slice((py * cv.width + px) * 4, (py * cv.width + px) * 4 + 4));
        };
        let exhaustPixels = 0;
        for (let py = 0; py < cv.height; py++) for (let px = 0; px < cv.width; px++) {
          const dx = px + 0.5 - 150, dy = py + 0.5 - 100;
          const localX = dx * Math.cos(angle) + dy * Math.sin(angle);
          const localY = -dx * Math.sin(angle) + dy * Math.cos(angle);
          if (Math.abs(localX) < 20 && localY > geometry.nozzle + 3 && d[(py * cv.width + px) * 4 + 3]) exhaustPixels++;
        }
        return { kind, geometry, light, d, samples: { cylinderLeft: sample('s4b', -0.65), cylinderRight: sample('s4b', 0.65),
          cylinderCenter: sample('s4b', 0), coneCenter: sample('cm', 0) }, exhaustPixels };
      });
      let alphaMismatches = 0, opaque = 0, changed = 0, maximumAlphaDelta = 0, litShadowAlphaMismatches = 0;
      const alphaDetails: any[] = [];
      const alphaByVariant = variants.map(v => ({ kind: v.kind, mismatches: 0, maximumAlphaDelta: 0,
        fullyOpaqueInteriorLosses: 0, fullyTransparentExteriorGains: 0, opaqueMaskMismatches: 0, exteriorMaskMismatches: 0 }));
      for (let i = 0; i < variants[0].d.length; i += 4) {
        const baseline = variants[0].d[i + 3];
        if (variants[1].d[i + 3] !== variants[2].d[i + 3]) litShadowAlphaMismatches++;
        if (variants.some(v => v.d[i + 3] !== baseline)) {
          alphaMismatches++;
          alphaDetails.push({ x: (i / 4) % 300, y: Math.floor(i / (4 * 300)),
            variants: variants.map(v => ({ kind: v.kind, rgba: Array.from(v.d.slice(i, i + 4)), alphaDelta: v.d[i + 3] - baseline })) });
        }
        for (let n = 0; n < variants.length; n++) {
          const alpha = variants[n].d[i + 3], delta = Math.abs(alpha - baseline), stats = alphaByVariant[n];
          if (delta) stats.mismatches++;
          stats.maximumAlphaDelta = Math.max(stats.maximumAlphaDelta, delta);
          if (baseline === 255 && alpha < 255) stats.fullyOpaqueInteriorLosses++;
          if (baseline === 0 && alpha > 0) stats.fullyTransparentExteriorGains++;
          if ((baseline === 255) !== (alpha === 255)) stats.opaqueMaskMismatches++;
          if ((baseline === 0) !== (alpha === 0)) stats.exteriorMaskMismatches++;
          maximumAlphaDelta = Math.max(maximumAlphaDelta, delta);
        }
        if (baseline !== 255) continue;
        opaque++;
        if ([0, 1, 2].some(c => variants[1].d[i + c] !== variants[2].d[i + c])) changed++;
      }
      return { angle, alphaMismatches, maximumAlphaDelta, litShadowAlphaMismatches, alphaByVariant, alphaDetails,
        opaque, changed, variants: variants.map(({ d, ...rest }) => rest) };
    });
    document.body.append(board); return rows;
  });
}

// Render the known parked stack independently on a transparent canvas. Every
// opaque hull pixel in the real scene must contain this RGB value, even while
// the colored orbit arrows pass behind it. Alpha fading fails this comparison.
async function sceneEvidence(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const P = (window as any).MoonMissionPure, ctx = cv.getContext('2d')!, W = cv.width / 2, H = cv.height / 2;
    const sample = P.orbitSnapshot(Number(cv.dataset.orbitTime), 360);
    const ex = W < 520 ? W * 0.40 : W * 0.34, ey = H * 0.53;
    const radius = Math.min(H * 0.22, W * 0.17) + 28, ry = radius * 0.92, tilt = -0.12;
    const c = Math.cos(tilt), s = Math.sin(tilt), px = Math.cos(sample.orbAng) * radius, py = Math.sin(sample.orbAng) * ry;
    const x = ex + px * c - py * s, y = ey + px * s + py * c;
    const tx = -Math.sin(sample.orbAng) * radius, ty = Math.cos(sample.orbAng) * ry;
    const angle = Math.atan2(tx * s + ty * c, tx * c - ty * s) + Math.PI / 2;
    const expected = document.createElement('canvas'); expected.width = cv.width; expected.height = cv.height;
    const ec = expected.getContext('2d')!, k = 42 / 32.4;
    ec.scale(2, 2); ec.translate(x, y); ec.rotate(angle);
    const light = P.orbitalCraftLight({ directionX: 1, directionY: 0, fraction: sample.inShadow ? 0 : 1 }, angle);
    const geometry = P.saturnV(ec, 0, -21 - 8.9 * k, P.saturnVHeight() * k, 3, { les: false, orbitLight: light });
    const actual = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const predicted = ec.getImageData(0, 0, cv.width, cv.height).data;
    let checked = 0, mismatches = 0, maxDifference = 0, actualOpaque = 0;
    for (let i = 0; i < actual.length; i += 4) {
      if (actual[i + 3] === 255) actualOpaque++;
      if (predicted[i + 3] !== 255) continue;
      checked++;
      const difference = Math.max(...[0, 1, 2].map(channel => Math.abs(actual[i + channel] - predicted[i + channel])));
      maxDifference = Math.max(maxDifference, difference);
      if (difference > 1 || actual[i + 3] !== 255) mismatches++;
    }
    return { time: sample.time, shadow: sample.inShadow, angle, x, y, width: W, height: H, light,
      geometry, checked, mismatches, maxDifference, opaqueFraction: actualOpaque / (cv.width * cv.height) };
  });
}
function verifyScene(row: any, shadow: boolean) {
  expect(row.shadow).toBe(shadow); expect(row.checked).toBeGreaterThan(400); expect(row.mismatches).toBe(0);
  expect(row.opaqueFraction).toBe(1); expect(row.light.fraction).toBe(shadow ? 0 : 1);
  expect(row.light.x * Math.cos(row.angle) - row.light.y * Math.sin(row.angle)).toBeCloseTo(1, 12);
  expect(row.light.x * Math.sin(row.angle) + row.light.y * Math.cos(row.angle)).toBeCloseTo(0, 12);
  expect(row.geometry.sections.map((s: any) => s.id)).toEqual(['cm', 'sm', 'sla', 'iu', 's4b']);
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('parking orbit sunlight follows the fixed Sun while Earth shadow keeps the coasting stack opaque', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page);
  const period = (await orbit(page)).period;
  const rows = await materialEvidence(page);
  await writeFile(join(REPORT, 'parking-material-diagnostic.json'), JSON.stringify(rows, null, 2));
  for (const row of rows) {
    // Real Canvas rounds two partially covered SM ring edge pixels from alpha
    // 195 to 196 when its solid paint becomes a gradient. Permit only that
    // one-level antialias rounding; opaque/exterior masks and lit/shadow alpha
    // must match exactly, so neither geometry changes nor fading can pass.
    expect(row.alphaMismatches).toBeLessThanOrEqual(2);
    expect(row.maximumAlphaDelta).toBeLessThanOrEqual(1);
    expect(row.litShadowAlphaMismatches).toBe(0);
    for (const stats of row.alphaByVariant) {
      expect(stats.opaqueMaskMismatches).toBe(0); expect(stats.exteriorMaskMismatches).toBe(0);
      expect(stats.fullyOpaqueInteriorLosses).toBe(0); expect(stats.fullyTransparentExteriorGains).toBe(0);
    }
    for (const pixel of row.alphaDetails) for (const variant of pixel.variants) {
      expect(variant.rgba[3]).toBeGreaterThan(0); expect(variant.rgba[3]).toBeLessThan(255);
      expect(Math.abs(variant.alphaDelta)).toBeLessThanOrEqual(1);
    }
    expect(row.opaque).toBeGreaterThan(3000);
    for (const v of row.variants) {
      expect(v.geometry).toEqual(row.variants[0].geometry); expect(v.exhaustPixels).toBe(0);
      for (const sample of Object.values(v.samples)) expect(sample[3]).toBe(255);
    }
    const shadow = row.variants[2];
    expect(shadow.samples.cylinderLeft).toEqual([61, 61, 61, 255]);
    expect(shadow.samples.cylinderRight).toEqual([61, 61, 61, 255]);
    expect(shadow.samples.coneCenter).toEqual([60, 60, 60, 255]);
    const lit = row.variants[1], light = lit.light;
    expect(light.x * Math.cos(row.angle) - light.y * Math.sin(row.angle)).toBeCloseTo(1, 13);
    expect(light.x * Math.sin(row.angle) + light.y * Math.cos(row.angle)).toBeCloseTo(0, 13);
  }
  expect(rows[0].changed).toBeGreaterThan(1000); expect(rows[1].changed).toBeGreaterThan(1000);
  expect(rows[0].variants[1].samples.cylinderRight[0] - rows[0].variants[1].samples.cylinderLeft[0]).toBeGreaterThan(100);
  expect(rows[1].variants[1].samples.cylinderLeft[0] - rows[1].variants[1].samples.cylinderRight[0]).toBeGreaterThan(100);
  // With sunlight along the stack axis, the sloping command module catches light
  // while a cylinder's side receives no direct light. Reverse it and both shade.
  expect(rows[2].variants[1].samples.coneCenter[0] / 248 - rows[2].variants[1].samples.cylinderCenter[0] / 255).toBeGreaterThan(0.3);
  expect(rows[3].variants[1].samples.coneCenter).toEqual(rows[3].variants[2].samples.coneCenter);
  const boardPath = join(REPORT, 'parking-material-board-' + info.project.name + '.png');
  await page.locator('#parking-sunlight-board').screenshot({ path: boardPath });
  await info.attach('parking-material-board', { path: boardPath, contentType: 'image/png' });
  await page.locator('#parking-sunlight-board').evaluate(el => el.remove());

  const scenes: any[] = [];
  await mount(page, period * 0.25); await settledPixels(page);
  await expect(page.locator('#mm-earth-orbit-description')).toContainText('Sunlight comes from the right');
  await expect(page.locator('#mm-earth-orbit-description')).toContainText('24%');
  await expect(page.locator(MAIN)).toHaveAttribute('aria-describedby', 'mm-earth-orbit-description');
  const lit = await sceneEvidence(page); verifyScene(lit, false); scenes.push(lit);
  await expect(page.locator('[data-orbit-value="light"]')).toHaveText('Sunlit');
  await capture(page, info, 'parking-sunlit-1100');
  await mount(page, period * 0.75); await settledPixels(page);
  const dark = await sceneEvidence(page); verifyScene(dark, true); scenes.push(dark);
  await expect(page.locator('[data-orbit-value="light"]')).toHaveText('Earth shadow');
  await expect(page.locator('[data-orbit-value="engine"]')).toHaveText('Coasting — engine off');
  const desktopState = await saved(page), desktopPixels = await settledPixels(page);
  await capture(page, info, 'parking-shadow-1100', true); await accessibility(page, info, 'parking-a11y-1100');
  expect(await settledPixels(page)).toBe(desktopPixels); expect(await saved(page)).toEqual(desktopState);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBeLessThan(390);
  await settledPixels(page);
  const phoneDark = await sceneEvidence(page); verifyScene(phoneDark, true); scenes.push(phoneDark);
  expect(await saved(page)).toEqual(desktopState);
  const phonePixels = await settledPixels(page);
  await capture(page, info, 'parking-shadow-390', true); await accessibility(page, info, 'parking-a11y-390');
  expect(await settledPixels(page)).toBe(phonePixels);
  await mount(page, 0, desktopState); expect(await settledPixels(page)).toBe(phonePixels);
  expect(await saved(page)).toEqual(desktopState);
  await mount(page, period * 0.25); await settledPixels(page);
  const phoneLit = await sceneEvidence(page); verifyScene(phoneLit, false); scenes.push(phoneLit);
  await capture(page, info, 'parking-sunlit-390', true);
  const controls = await page.locator('[data-orbit-instruments] button, [data-orbit-rate]').evaluateAll(nodes => nodes.map(node => {
    const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, height: b.height };
  }));
  expect(controls).toHaveLength(3);
  for (const b of controls) { expect(b.left).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(390); expect(b.height).toBeGreaterThanOrEqual(44); }
  const bounds = await page.locator('#mm-earth-orbit-description').evaluate(el => {
    const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(390);

  await page.locator('[data-orbit-rate]').selectOption('1');
  const beforePlay = (await orbit(page)).time;
  await page.locator('[data-orbit-pause]').click();
  await expect.poll(async () => (await orbit(page)).time).toBeGreaterThan(beforePlay + 0.1);
  await page.locator('[data-orbit-pause]').click();
  const paused = await orbit(page); await page.waitForTimeout(250); expect(await orbit(page)).toEqual(paused);
  expect(paused.engine).toBe('off'); expect((await saved(page)).orbitPaused).toBe(true);
  await page.locator('[data-orbit-window-next]').click();
  await expect(page.locator(MAIN)).toHaveAttribute('data-orbit-window', 'go');
  const aligned = await orbit(page), checkpoint = await saved(page);
  expect(aligned.engine).toBe('off'); expect(aligned.time).toBeGreaterThan(period * 1.35);
  expect(checkpoint.missionPhase).toBe(2); expect(checkpoint.missionXP).toBe(0);
  expect(checkpoint.tliAccuracy ?? null).toBeNull(); expect(checkpoint.tliStarted || false).toBe(false);
  expect(checkpoint.orbitPaused).toBe(true);
  const ready = await sceneEvidence(page); verifyScene(ready, true); scenes.push(ready);
  await capture(page, info, 'parking-window-390');
  await mount(page, 0, checkpoint); expect(await orbit(page)).toEqual(aligned); expect(await saved(page)).toEqual(checkpoint);
  await page.getByRole('button', { name: /Execute TLI Burn/ }).click();
  await expect(page.locator('[data-tli-canvas]')).toBeVisible(); await expect(page.locator('[data-tli-proceed]')).toBeDisabled();
  const ignition = await saved(page);
  expect(ignition.missionPhase).toBe(2); expect(ignition.missionXP).toBe(0); expect(ignition.tliAccuracy.onTime).toBe(true);
  expect(ignition.tliResult).toBeNull(); expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'parking-sunlight-measured.json'), JSON.stringify({ rows, scenes, bounds, controls,
    desktopPixels, phonePixels, paused, aligned, errors }, null, 2));
});
