import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const REPORT = resolve(process.env.MM_DOCKING_SUNLIGHT_REPORT_DIR || 'reports/moon-mission-enhancement-pass54-2026-10-12/browser/sunlight');
const MAIN = '[data-docking-canvas]';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
async function saved(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.moonMission))); }
async function mount(page: Page, fixture: Record<string, unknown> = {}, checkpoint?: any) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(({ fixture, checkpoint }) => {
    // Observe the real canvas font state without changing context options.
    // This records the small distance labels around capture and view changes.
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, options?: any) {
      const context: any = getContext.call(this, type, options);
      if (type === '2d' && context && !context.__sunlightRecorded) {
        context.__sunlightRecorded = true;
        const fillText = context.fillText.bind(context), cv: any = this;
        context.fillText = function(text: string, x: number, y: number, maxWidth?: number) {
          if (/^(100|50|10) m$/.test(text)) {
            const measured = context.measureText(text);
            const metrics: any = {};
            for (const key of ['width', 'actualBoundingBoxLeft', 'actualBoundingBoxRight', 'actualBoundingBoxAscent',
              'actualBoundingBoxDescent', 'fontBoundingBoxAscent', 'fontBoundingBoxDescent']) metrics[key] = measured[key];
            cv.__sunlightLabels = cv.__sunlightLabels || {};
            cv.__sunlightLabels[text] = { text, x, y, maxWidth: maxWidth ?? null, metrics,
              font: context.font, fontKerning: context.fontKerning, fontStretch: context.fontStretch,
              fontVariantCaps: context.fontVariantCaps, textRendering: context.textRendering,
              letterSpacing: context.letterSpacing, wordSpacing: context.wordSpacing,
              textAlign: context.textAlign, textBaseline: context.textBaseline, direction: context.direction,
              fillStyle: context.fillStyle, globalAlpha: context.globalAlpha, transform: context.getTransform().toJSON() };
          }
          if (maxWidth === undefined) fillText(text, x, y); else fillText(text, x, y, maxWidth);
        };
      }
      return context;
    } as typeof getContext;
    document.getElementById('wrap')!.style.width = '100%'; Math.random = () => 0.999;
    const P = (window as any).MoonMissionPure, summary = P.ascentProfile().summary;
    (window as any).__mount({ moonMission: checkpoint || {
      missionPhase: 7, animPaused: true, soundOff: true, missionXP: 0, missionLog: [],
      earnedBadges: { first_step: true, mission_complete: true }, difficulty: 'pilot', lunarSamples: [], quizCorrect: 0,
      ascentRun: { version: 1, time: summary.duration, recorded: true }, ascentResult: { version: 1, ...summary }, ascentPaused: true,
      dockingRun: { ...P.dockingState(), ...fixture }, dockingPaused: true, dockingGuided: false, dockingResult: null,
    } });
  }, { fixture, checkpoint });
  await expect(page.locator(MAIN)).toHaveAttribute('data-docking-view', 'overview');
  await expect(page.locator('[data-docking-horizon-note]')).toBeVisible();
}
async function choose(page: Page, mode: 'overview' | 'closeup') {
  await page.getByRole('combobox', { name: 'Docking view', exact: true }).selectOption(mode);
  await expect(page.locator(MAIN)).toHaveAttribute('data-docking-view', mode);
  if (mode === 'overview') {
    await expect(page.locator('[data-docking-horizon-note]')).toBeVisible();
    await expect(page.locator(MAIN)).toHaveAttribute('aria-describedby', 'mm-docking-instructions mm-docking-horizon-note');
  } else {
    await expect(page.locator('[data-docking-horizon-note]')).toBeHidden();
    await expect(page.locator(MAIN)).toHaveAttribute('aria-describedby', 'mm-docking-instructions');
    for (const key of ['altitude', 'dip', 'fov', 'eye-y', 'focal'])
      await expect(page.locator(MAIN)).toHaveAttribute('data-docking-horizon-' + key, '');
  }
}
async function pixels(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    let h = 2166136261;
    for (const v of cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data) h = Math.imul(h ^ v, 16777619);
    return h >>> 0;
  });
}
async function inspect(page: Page) {
  return page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => {
    const d = cv.dataset, P = (window as any).MoonMissionPure;
    const width = cv.width / 2, height = cv.height / 2;
    return { width, height, view: d.dockingView,
      altitude: Number(d.dockingHorizonAltitude), dip: Number(d.dockingHorizonDip), fov: Number(d.dockingHorizonFov),
      eyeY: Number(d.dockingHorizonEyeY), focal: Number(d.dockingHorizonFocal),
      geometry: P.dockingHorizonGeometry(width, height),
      pictureScale: Number(d.dockingPictureScale), portX: Number(d.dockingPortX), portY: Number(d.dockingPortY),
      eagleX: Number(d.dockingEaglePortX), eagleY: Number(d.dockingEaglePortY),
      run: JSON.parse(JSON.stringify((window as any).__toolData.moonMission.dockingRun)) };
  });
}
function verifyGeometry(g: any, width: number, height: number) {
  const radius = 1737400, altitude = 110000, focal = height / (2 * Math.tan(Math.PI / 6));
  const dip = Math.acos(radius / (radius + altitude));
  expect(g.radius).toBe(radius); expect(g.altitude).toBe(altitude); expect(g.fieldDegrees).toBe(60);
  expect(g.centerX).toBe(width / 2); expect(g.eyeY).toBe(height / 2);
  expect(g.focal).toBeCloseTo(focal, 11); expect(g.dipDegrees).toBeCloseTo(dip * 180 / Math.PI, 11);
  expect(g.points).toHaveLength(49);
  for (const p of g.points) {
    // A pinhole ray is (horizontal, downward, forward), with the eye at R+h.
    // Its closest distance to the lunar centre must equal R on the silhouette.
    const qx = (p.x - width / 2) / focal, qy = (p.y - height / 2) / focal;
    const closestSquared = (radius + altitude) ** 2 * (1 - qy * qy / (1 + qx * qx + qy * qy));
    expect(closestSquared / (radius * radius)).toBeCloseTo(1, 12);
    expect(qy).toBeGreaterThan(0);
    expect(p.y).toBeCloseTo(height / 2 + focal * Math.tan(dip) * Math.sqrt(1 + qx * qx), 10);
  }
  expect(g.points[0].x).toBeLessThanOrEqual(0); expect(g.points[48].x).toBeGreaterThanOrEqual(width);
  expect(g.points[0].y).toBeCloseTo(g.points[48].y, 12);
  expect(g.points[24].y).toBeLessThan(g.points[0].y);
}
function verifyLive(row: any) {
  verifyGeometry(row.geometry, row.width, row.height);
  expect(row.view).toBe('overview'); expect(row.altitude).toBe(110000); expect(row.fov).toBe(60);
  expect(row.dip).toBeCloseTo(Math.acos(1737400 / 1847400) * 180 / Math.PI, 11);
  expect(row.eyeY).toBe(row.height / 2); expect(row.focal).toBeCloseTo(row.height / (2 * Math.tan(Math.PI / 6)), 11);
  // The angular background must not change the equal-axis metre foreground.
  expect((row.eagleX - row.portX) / row.pictureScale).toBeCloseTo(row.run.y, 9);
  expect((row.portY - row.eagleY) / row.pictureScale).toBeCloseTo(row.run.x, 9);
}
async function capture(page: Page, info: TestInfo, name: string, workspace = false) {
  const path = join(REPORT, name + '-' + info.project.name + '.png');
  await page.locator(workspace ? '[data-ascent-workspace]' : MAIN).screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}
async function accessibility(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['[data-ascent-workspace]']] }, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  })).violations.map((v: any) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n: any) => n.target) })));
  await info.attach(name, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' }); expect(violations).toEqual([]);
}


async function settledPixels(page: Page) {
  await page.evaluate(async () => { await document.fonts.ready; });
  let prior = -1, equal = 0;
  for (let frame = 0; frame < 30; frame++) {
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    const current = await pixels(page);
    equal = current === prior ? equal + 1 : 0; prior = current;
    if (equal >= 2) return current;
  }
  throw new Error('The paused docking canvas did not settle within 30 frames');
}
async function pixelDiagnostic(page: Page, name: string, raw = false) {
  const result = await page.locator(MAIN).evaluate((cv: HTMLCanvasElement, args) => {
    const ctx = cv.getContext('2d')!, data = ctx.getImageData(0, 0, cv.width, cv.height).data, w: any = window;
    let hash = 2166136261;
    for (const value of data) hash = Math.imul(hash ^ value, 16777619);
    if (args.name === 'phone-before-captures') w.__sunlightDiagnosticBaseline = new Uint8ClampedArray(data);
    const baseline = w.__sunlightDiagnosticBaseline;
    let changed = 0, left = cv.width, right = -1, top = cv.height, bottom = -1;
    const rows: Record<string, number> = {};
    if (baseline && baseline.length === data.length) {
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === baseline[i] && data[i + 1] === baseline[i + 1] && data[i + 2] === baseline[i + 2] && data[i + 3] === baseline[i + 3]) continue;
        const x = (i / 4) % cv.width, y = Math.floor(i / (4 * cv.width));
        changed++; left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        rows[y] = (rows[y] || 0) + 1;
      }
    }
    const style = getComputedStyle(cv), css: any = {};
    for (const key of ['font', 'fontFamily', 'fontSize', 'fontWeight', 'fontStretch', 'fontKerning',
      'fontVariant', 'fontFeatureSettings', 'fontVariationSettings', 'textRendering', 'letterSpacing', 'wordSpacing']) css[key] = (style as any)[key];
    let rgba = '';
    if (args.raw) {
      let binary = '';
      for (let i = 0; i < data.length; i += 32768) binary += String.fromCharCode(...data.subarray(i, i + 32768));
      rgba = btoa(binary);
    }
    return { name: args.name, width: cv.width, height: cv.height, hash: hash >>> 0, changed,
      bounds: changed ? { left, top, right, bottom } : null, rows, rgba,
      labels: (cv as any).__sunlightLabels || null, context: { attributes: ctx.getContextAttributes(), font: ctx.font,
        transform: ctx.getTransform().toJSON(), textAlign: ctx.textAlign, textBaseline: ctx.textBaseline, direction: ctx.direction,
        fontKerning: ctx.fontKerning, letterSpacing: ctx.letterSpacing, wordSpacing: ctx.wordSpacing },
      css, fonts: { status: document.fonts.status, monospace: document.fonts.check('9px monospace', '100 m 50 m 10 m'),
        entries: Array.from(document.fonts).map(f => ({ family: f.family, status: f.status, style: f.style, weight: f.weight })) },
      dataset: { ...cv.dataset }, state: JSON.parse(JSON.stringify(w.__toolData.moonMission)),
    };
  }, { name, raw });
  const { rgba, ...metadata } = result;
  if (raw) await writeFile(join(REPORT, name + '.rgba'), Buffer.from(rgba, 'base64'));
  await writeFile(join(REPORT, name + '.json'), JSON.stringify(metadata, null, 2));
  return metadata;
}
async function sunlightEvidence(page: Page) {
  return page.evaluate(() => {
    const P = (window as any).MoonMissionPure;
    const hash = (d: Uint8ClampedArray) => { let h = 2166136261; for (const v of d) h = Math.imul(h ^ v, 16777619); return h >>> 0; };
    const canvas = (width: number, height: number) => {
      const cv = document.createElement('canvas'); cv.width = width; cv.height = height;
      cv.style.cssText = 'display:block;background:#020815;'; return cv;
    };
    const board = document.createElement('section'); board.id = 'sunlight-evidence-board';
    board.style.cssText = 'width:940px;padding:20px;box-sizing:border-box;background:#06101e;color:#e2e8f0;font:14px system-ui;';
    const heading = document.createElement('h2'); heading.textContent = 'Shared upper-left Sun · material comparison'; board.append(heading);
    const explanation = document.createElement('p');
    explanation.textContent = 'Legacy material at left · fixed Sun at right. Shapes and equipment remain the same.'; board.append(explanation);
    const sun = { directionX: -Math.SQRT1_2, directionY: Math.SQRT1_2, fraction: 1 };
    const rows = ['Columbia', 'Eagle'].map(kind => {
      const title = document.createElement('h3'); title.textContent = kind; board.append(title);
      const group = document.createElement('div'); group.style.cssText = 'display:flex;gap:20px'; board.append(group);
      const data = [false, true].map(lit => {
        const cv = canvas(440, 200), ctx = cv.getContext('2d')!; group.append(cv);
        if (kind === 'Columbia') P.drawReturnCraft(ctx, 220, 100, 4, -Math.PI, false, lit ? sun : undefined);
        else P.drawLunarAscentStage(ctx, 220, 100, 4, Math.PI / 2, {
          time: 0, engineOn: false, thrust: 0, ...(lit ? { orbitLight: P.dockingCraftLight(Math.PI / 2) } : {}),
        });
        return ctx.getImageData(0, 0, cv.width, cv.height).data;
      });
      let alphaMismatches = 0, changed = 0, opaque = 0;
      let beforeSum = 0, afterSum = 0;
      for (let i = 0; i < data[0].length; i += 4) {
        if (data[0][i + 3] !== data[1][i + 3]) alphaMismatches++;
        if (data[0][i + 3] !== 255) continue;
        opaque++; beforeSum += data[0][i] + data[0][i + 1] + data[0][i + 2];
        afterSum += data[1][i] + data[1][i + 1] + data[1][i + 2];
        if (data[0][i] !== data[1][i] || data[0][i + 1] !== data[1][i + 1] || data[0][i + 2] !== data[1][i + 2]) changed++;
      }
      return { kind, alphaMismatches, changed, opaque, beforeMean: beforeSum / (opaque * 3),
        afterMean: afterSum / (opaque * 3), beforeHash: hash(data[0]), afterHash: hash(data[1]) };
    });
    const surfaceTitle = document.createElement('h3'); surfaceTitle.textContent = 'Surface projection · same Sun and fixed exposure'; board.append(surfaceTitle);
    const surface = canvas(320, 280); board.append(surface);
    const g = P.drawDockingHorizon(surface.getContext('2d'), 320, 280);
    const data = surface.getContext('2d')!.getImageData(0, 0, 320, 280).data;
    let skyPainted = 0, groundTransparent = 0, surfaceMismatches = 0, checked = 0;
    const samples: any[] = [], levels = new Set<number>();
    for (let x = 0; x < 320; x++) {
      const f = 280 / (2 * Math.tan(Math.PI / 6)), dip = Math.acos(1737400 / 1847400);
      const limb = 140 + Math.tan(dip) * Math.hypot(f, x + 0.5 - 160);
      for (let y = 0; y < 280; y++) {
        const offset = (y * 320 + x) * 4;
        if (y + 0.5 < limb - 4 && data[offset + 3] !== 0) skyPainted++;
        if (y + 0.5 <= limb + 4) continue;
        if (data[offset + 3] !== 255) groundTransparent++;
        levels.add(data[offset]);
        if (x % 17 || y % 11) continue;
        const hit = P.dockingSurfaceRay(g, x + 0.5, y + 0.5), material = P.dockingSurfaceMaterial(hit.normal);
        checked++;
        if (data[offset] !== material.rgb[0] || data[offset + 1] !== material.rgb[1] || data[offset + 2] !== material.rgb[2]) surfaceMismatches++;
        samples.push({ x: x + 0.5, y: y + 0.5, normal: hit.normal, material, sunlight: P.dockingSunlight(hit.normal) });
      }
    }
    const normals = [
      { x: Math.SQRT1_2, y: 0, z: -Math.SQRT1_2 }, { x: 1, y: 0, z: 0 },
      { x: 1, y: 0, z: 1 }, { x: 0, y: 1, z: 1 },
      { x: 0, y: 0, z: 1 }, { x: -Math.SQRT1_2, y: 0, z: Math.SQRT1_2 },
    ].map(normal => ({ normal, material: P.dockingSurfaceMaterial(normal), light: P.dockingSunlight(normal) }));
    const directions = [0, Math.PI / 2, -Math.PI / 3, Math.PI].map(angle => ({ angle, light: P.dockingCraftLight(angle) }));
    const state = Object.freeze({ ...P.dockingState(), ax: 0, ay: 0 }), before = JSON.stringify(state);
    const scenes = [0, 200].map(time => {
      const cv = canvas(700, 280), ctx = cv.getContext('2d')!, labels: any[] = [];
      const fillText = ctx.fillText.bind(ctx);
      ctx.fillText = ((text: string, x: number, y: number, maxWidth?: number) => {
        if (text.includes('SUN')) labels.push({ text, x, y, align: ctx.textAlign, width: ctx.measureText(text).width });
        if (maxWidth === undefined) fillText(text, x, y); else fillText(text, x, y, maxWidth);
      }) as typeof ctx.fillText;
      const result = P.drawDockingPractice(ctx, 700, 280, state, { time, view: 'overview' });
      return { result, cv, labels, data: ctx.getImageData(0, 0, 700, 280).data };
    });
    // Check actual overview material against the independently positioned, public
    // CSM renderer. Opaque panel interiors exclude stars, labels and port markers.
    const k = Math.min(1.3, Math.max(0.72, 700 / 670)), live = scenes[0].result;
    const csm = canvas(700, 280);
    P.drawReturnCraft(csm.getContext('2d'), live.portX + 38 * k, live.portY, k, -Math.PI, false, sun);
    const csmPixels = csm.getContext('2d')!.getImageData(0, 0, 700, 280).data;
    let craftChecked = 0, craftMismatches = 0;
    for (let x = Math.ceil(live.portX + 30 * k); x < live.portX + 59 * k; x++) {
      for (let y = Math.ceil(live.portY - 8 * k); y < live.portY - 4 * k; y++) {
        const offset = (y * 700 + x) * 4;
        if (csmPixels[offset + 3] !== 255) continue;
        craftChecked++;
        if ([0, 1, 2].some(c => Math.abs(csmPixels[offset + c] - scenes[0].data[offset + c]) > 1)) craftMismatches++;
      }
    }
    const eagle = canvas(700, 280), eagleX = live.eaglePortX - 19 * k;
    P.drawLunarAscentStage(eagle.getContext('2d'), eagleX, live.eaglePortY, k, Math.PI / 2,
      { engineOn: false, thrust: 0, time: 0, orbitLight: P.dockingCraftLight(Math.PI / 2) });
    const eaglePixels = eagle.getContext('2d')!.getImageData(0, 0, 700, 280).data;
    let eagleChecked = 0, eagleMismatches = 0;
    for (let x = Math.ceil(eagleX - 8 * k); x < eagleX + 8 * k; x++) {
      for (let y = Math.ceil(live.eaglePortY - 8 * k); y < live.eaglePortY + 8 * k; y++) {
        const offset = (y * 700 + x) * 4;
        if (eaglePixels[offset + 3] !== 255) continue;
        eagleChecked++;
        if ([0, 1, 2].some(c => Math.abs(eaglePixels[offset + c] - scenes[0].data[offset + c]) > 1)) eagleMismatches++;
      }
    }
    const closeup = canvas(700, 280);
    const closeupResult = P.drawDockingPractice(closeup.getContext('2d'), 700, 280, state, { time: 200, view: 'closeup' });
    document.body.append(board);
    return { rows, surface: { skyPainted, groundTransparent, surfaceMismatches, checked, levels: levels.size, samples },
      normals, directions, craftChecked, craftMismatches, eagleChecked, eagleMismatches,
      scenes: scenes.map(row => ({ result: row.result, labels: row.labels, hash: hash(row.data) })), inputUnchanged: JSON.stringify(state) === before,
      closeupHasHorizon: Object.prototype.hasOwnProperty.call(closeupResult, 'horizon') };
  });
}

test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start()); test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('shared docking sunlight lights surface and spacecraft consistently while preserving view, reload and contact states', async ({ page }, info) => {
  await mkdir(REPORT, { recursive: true });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.setViewportSize({ width: 1100, height: 1000 });
  await mount(page);
  const initial = await saved(page);
  const note = page.locator('[data-docking-horizon-note]');
  await expect(note).toContainText('A fixed upper-left Sun lights the surface and both spacecraft; shaded materials retain illustrative exposure.');
  await expect(note).toContainText('Surface colors and star exposure are illustrative; terrain height and cast shadows are omitted.');
  const evidence = await sunlightEvidence(page);
  for (const row of evidence.rows) {
    expect(row.alphaMismatches).toBe(0); expect(row.opaque).toBeGreaterThan(2000);
    expect(row.changed).toBeGreaterThan(row.opaque * 0.7);
    expect(row.afterMean).toBeLessThan(row.beforeMean); expect(row.afterHash).not.toBe(row.beforeHash);
  }
  for (const row of evidence.directions) {
    const { angle, light } = row;
    expect(light.fraction).toBe(1); expect(Math.hypot(light.x, light.y)).toBeCloseTo(1, 13);
    // Rotate local screen direction back to the unrotated overview plane.
    expect(light.x * Math.cos(angle) - light.y * Math.sin(angle)).toBeCloseTo(-Math.SQRT1_2, 13);
    expect(light.x * Math.sin(angle) + light.y * Math.cos(angle)).toBeCloseTo(-Math.SQRT1_2, 13);
  }
  let lastResponse = -1;
  for (const row of evidence.normals) {
    const length = Math.hypot(row.normal.x, row.normal.y, row.normal.z);
    const incidence = (row.normal.z - row.normal.x) / (Math.SQRT2 * length);
    const response = 0.24 + 0.76 * Math.max(0, incidence);
    expect(row.light.sun).toEqual({ x: -Math.SQRT1_2, y: 0, z: Math.SQRT1_2 });
    expect(row.light.incidence).toBeCloseTo(incidence, 13);
    expect(row.light.daylight).toBe(incidence > 0);
    expect(row.light.response).toBeCloseTo(response, 13);
    // Divide out each location's albedo to compare the same material exposure.
    const measured = (row.material.brightness - 0.02) / (0.45 * row.material.albedo);
    expect(measured).toBeCloseTo(response, 13); expect(measured).toBeGreaterThanOrEqual(lastResponse - 1e-12);
    lastResponse = measured;
  }
  expect(evidence.surface.checked).toBeGreaterThan(40); expect(evidence.surface.levels).toBeGreaterThan(10);
  expect(evidence.surface.skyPainted).toBe(0); expect(evidence.surface.groundTransparent).toBe(0);
  expect(evidence.surface.surfaceMismatches).toBe(0);
  for (const sample of evidence.surface.samples) {
    const incidence = (sample.normal.z - sample.normal.x) / Math.SQRT2;
    const brightness = 0.02 + 0.45 * sample.material.albedo * (0.24 + 0.76 * Math.max(0, incidence));
    expect(sample.sunlight.incidence).toBeCloseTo(incidence, 12);
    expect(sample.material.brightness).toBeCloseTo(brightness, 12);
    expect(sample.material.rgb).toEqual([0, 1, 2].map(() => Math.round(brightness * 255)));
  }
  expect(evidence.craftChecked).toBeGreaterThan(80); expect(evidence.craftMismatches).toBe(0);
  expect(evidence.eagleChecked).toBeGreaterThan(80); expect(evidence.eagleMismatches).toBe(0);
  expect(evidence.scenes[0].labels).toHaveLength(1);
  expect(evidence.scenes[0].labels[0]).toMatchObject({ text: 'SUN ↖', x: 684, y: 24, align: 'right' });
  expect(evidence.scenes[0].labels[0].width).toBeLessThan(70);
  expect(evidence.scenes[0].hash).toBe(evidence.scenes[1].hash);
  expect(evidence.scenes[0].result).toEqual(evidence.scenes[1].result);
  expect(evidence.scenes[0].result.engineVisible).toBe(false); expect(evidence.scenes[0].result.plumeVisible).toBe(false);
  expect(evidence.closeupHasHorizon).toBe(false); expect(evidence.inputUnchanged).toBe(true);
  const boardPath = join(REPORT, 'sunlight-material-board-' + info.project.name + '.png');
  await page.locator('#sunlight-evidence-board').screenshot({ path: boardPath });
  await info.attach('sunlight-material-board', { path: boardPath, contentType: 'image/png' });
  await page.locator('#sunlight-evidence-board').evaluate(el => el.remove());
  expect(await saved(page)).toEqual(initial);
  const rows = [await inspect(page)]; verifyLive(rows[0]);
  const desktopPixels = await settledPixels(page);
  await capture(page, info, 'sunlight-overview-1100'); await accessibility(page, info, 'sunlight-a11y-1100');
  await choose(page, 'closeup'); await capture(page, info, 'sunlight-closeup-1100');
  await choose(page, 'overview'); expect(await settledPixels(page)).toBe(desktopPixels);
  await page.setViewportSize({ width: 320, height: 900 });
  await expect.poll(() => page.locator(MAIN).evaluate((cv: HTMLCanvasElement) => cv.width / 2)).toBe(282);
  const phone = await inspect(page); verifyLive(phone); rows.push(phone);
  const phonePixels = await settledPixels(page);
  const beforeCaptures = await pixelDiagnostic(page, 'phone-before-captures', true);
  expect(beforeCaptures.hash).toBe(phonePixels);
  expect(beforeCaptures.context.attributes.willReadFrequently).toBe(false);
  for (const label of Object.values(beforeCaptures.labels) as any[]) expect(label.font).toBe('9px "Courier New", monospace');
  await capture(page, info, 'sunlight-overview-320');
  await pixelDiagnostic(page, 'phone-after-canvas-capture');
  await capture(page, info, 'sunlight-workspace-320', true);
  await pixelDiagnostic(page, 'phone-after-workspace-capture');
  await accessibility(page, info, 'sunlight-a11y-320');
  await pixelDiagnostic(page, 'phone-after-axe');
  await choose(page, 'closeup'); await page.locator(MAIN).focus(); await page.keyboard.press('ArrowDown');
  expect(await saved(page)).toEqual(initial); await choose(page, 'overview');
  const switchedPixels = await settledPixels(page);
  await pixelDiagnostic(page, 'phone-after-view-switch', true);
  expect(switchedPixels).toBe(phonePixels);
  await mount(page, {}, initial); verifyLive(await inspect(page));
  const reloadPixels = await settledPixels(page);
  expect(reloadPixels).toBe(phonePixels); expect(await saved(page)).toEqual(initial);
  await page.locator('[data-docking-demonstrate]').click();
  await expect(page.locator(MAIN)).toHaveAttribute('data-docking-status', 'docked');
  await expect(page.locator('[data-ascent-proceed]')).toBeEnabled();
  const docked = await saved(page);
  expect(docked.dockingRun.y).toBe(0); expect(docked.dockingResult.closingSpeed).toBe(docked.dockingRun.vy);
  expect(docked.dockingRun.propellant).toBeLessThan(initial.dockingRun.propellant);
  expect(docked.missionXP).toBe(0); expect(docked.earnedBadges).toEqual(initial.earnedBadges);
  const contact = await inspect(page); verifyLive(contact); rows.push(contact);
  await capture(page, info, 'sunlight-contact-320');
  await choose(page, 'closeup'); await choose(page, 'overview'); expect(await saved(page)).toEqual(docked);
  await mount(page, {}, docked); expect(await saved(page)).toEqual(docked);
  const bounds = await page.locator('[data-ascent-workspace]').evaluate(el => {
    const note = el.querySelector('[data-docking-horizon-note]')!.getBoundingClientRect();
    return { overflow: document.documentElement.scrollWidth > innerWidth, left: note.left, right: note.right };
  });
  expect(bounds.overflow).toBe(false); expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(320);
  expect(errors).toEqual([]);
  await writeFile(join(REPORT, 'sunlight-measured.json'), JSON.stringify({
    evidence, rows, bounds, desktopPixels, phonePixels, reloadPixels, errors,
  }, null, 2));
});
