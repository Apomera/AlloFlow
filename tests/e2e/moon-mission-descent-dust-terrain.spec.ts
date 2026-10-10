import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

// Candidate destination: tests/e2e/moon-mission-descent-dust-terrain.spec.ts.
// Launch each tier in a fresh Playwright process with one worker and zero retries.
const REPORT = resolve(process.env.MM_DESCENT_TERRAIN_DUST_REPORT_DIR ||
  'reports/moon-mission-enhancement-pass26-2026-10-07/browser/terrain-dust');
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission',
  width: 1100, height: 1000, layout: 'document', appStyles: true });
const seed = { moonMission: { missionPhase: 5, descentStarted: true, animPaused: true, soundOff: true,
  difficulty: 'pilot', missionXP: 42, landingRewarded: true, lunarSamples: [], quizCorrect: 0,
  earnedBadges: { first_step: true, mission_complete: true } } };
test.describe.configure({ timeout: 180000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page) {
  await page.goto(harness.url + '/__harness');
  await page.waitForFunction(() => !!(window as any).StemLab?._registry?.moonMission);
  await page.evaluate(data => {
    Math.random = () => .999; document.getElementById('wrap')!.style.width = '100%';
    const T = (window as any).THREE, Original = T.WebGLRenderer;
    const Capture = function(...args: any[]) {
      const renderer = new Original(...args), render = renderer.render;
      renderer.render = function(scene: any, camera: any) {
        const dust = scene.getObjectByName('moon-descent-dust'), terrain = scene.getObjectByName('moon-descent-terrain');
        if (dust && terrain) (window as any).__terrainDustGL = { renderer, scene, camera, dust, terrain };
        return render.apply(renderer, arguments);
      };
      return renderer;
    };
    Capture.prototype = Original.prototype; Object.setPrototypeOf(Capture, Original); T.WebGLRenderer = Capture;
    (window as any).__terrainDustGL = null; (window as any).__mount(data);
  }, seed);
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'on');
  await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-terrain-mode', 'mesh-triangles');
  await page.waitForFunction(() => (window as any).__terrainDustGL?.dust.userData.terrainDustMode === 'mesh-triangles');
}
async function flight(page: Page) {
  return page.locator('[data-descent-canvas]').evaluate((c: any) => c._descentState());
}
async function flatDust(page: Page) {
  return page.locator('[data-descent-canvas]').evaluate((c: any) => c._descentDustState());
}
async function receipts(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__toolData.moonMission;
    return JSON.parse(JSON.stringify({ missionXP: d.missionXP, landingResult: d.landingResult,
      landingAttempts: d.landingAttempts, landingRewarded: d.landingRewarded }));
  });
}

async function installOracle(page: Page) {
  await page.evaluate(() => {
    const w = (window as any).__terrainDustGL, T = (window as any).THREE;
    const geometry = w.terrain.geometry, positions = geometry.attributes.position, indices = geometry.index;
    const columns = geometry.parameters.widthSegments + 1, rows = geometry.parameters.heightSegments + 1;
    const xSegments = columns - 1, zSegments = rows - 1;
    const xs = Array.from({ length: columns }, (_, col) => positions.getX(col));
    const zs = Array.from({ length: rows }, (_, row) => positions.getZ(row * columns));
    const S = .6, G = 1.624, H0 = .02, LIMIT = 2.5;
    const ray = new T.Ray(), a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), hit = new T.Vector3();
    const plane = new T.Plane(), barycentric = new T.Vector3(), point = new T.Vector3();
    const cache = new Map<string, any>(); let oracleComputations = 0;
    function cell(axis: number[], value: number) {
      if (!Number.isFinite(value) || value < axis[0] - 1e-7 || value > axis[axis.length - 1] + 1e-7)
        throw Error('Independent ray left the indexed terrain');
      value = Math.max(axis[0], Math.min(axis[axis.length - 1], value));
      let lo = 0, hi = axis.length - 2;
      while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (axis[mid] <= value) lo = mid; else hi = mid - 1; }
      return lo;
    }
    function triangle(col: number, row: number, face: number) {
      const offset = (row * xSegments + col) * 6 + face * 3;
      a.fromBufferAttribute(positions, indices.getX(offset)); b.fromBufferAttribute(positions, indices.getX(offset + 1));
      c.fromBufferAttribute(positions, indices.getX(offset + 2));
    }
    function height(x: number, z: number) {
      const col = cell(xs, x), row = cell(zs, z); let value: number | null = null;
      ray.origin.set(x, 10000, z); ray.direction.set(0, -1, 0);
      for (let face = 0; face < 2; face++) {
        triangle(col, row, face);
        if (ray.intersectTriangle(a, b, c, false, hit)) value = value === null ? hit.y : Math.max(value, hit.y);
      }
      if (value === null) throw Error('Independent ray missed the actual indexed faces');
      return value;
    }
    function location(grain: any, age: number, launchY: number) {
      return { age, x: S * (grain.launchX + grain.vx * age),
        y: launchY + S * (H0 + grain.vy * age - G * age * age / 2),
        z: S * (grain.launchZ + grain.vz * age) };
    }
    function gap(grain: any, age: number, launchY: number) {
      const p = location(grain, age, launchY); return p.y - height(p.x, p.z);
    }
    function oracle(grain: any) {
      const key = grain.id + ':' + grain.born; if (cache.has(key)) return cache.get(key);
      oracleComputations++;
      const x0 = grain.launchX * S, z0 = grain.launchZ * S, dx = grain.vx * S, dz = grain.vz * S;
      const launchY = height(x0, z0); let exit = Infinity;
      if (dx > 0) exit = Math.min(exit, (xs[columns - 1] - x0) / dx);
      if (dx < 0) exit = Math.min(exit, (xs[0] - x0) / dx);
      if (dz > 0) exit = Math.min(exit, (zs[rows - 1] - z0) / dz);
      if (dz < 0) exit = Math.min(exit, (zs[0] - z0) / dz);
      const until = Math.min(LIMIT, exit), x1 = x0 + dx * until, z1 = z0 + dz * until;
      const minCol = Math.max(0, cell(xs, Math.min(x0, x1)) - 1), maxCol = Math.min(xSegments - 1, cell(xs, Math.max(x0, x1)) + 1);
      const minRow = Math.max(0, cell(zs, Math.min(z0, z1)) - 1), maxRow = Math.min(zSegments - 1, cell(zs, Math.max(z0, z1)) + 1);
      let first = Infinity;
      // Independent algorithm: solve against each actual triangle's plane and
      // accept roots only inside that triangle. It does not use surface.trace,
      // surface.heightAt, helper breakpoints, or the helper's quadratic solver.
      for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) for (let face = 0; face < 2; face++) {
        triangle(col, row, face); plane.setFromCoplanarPoints(a, b, c);
        const nx = -plane.normal.x / plane.normal.y, nz = -plane.normal.z / plane.normal.y, intercept = -plane.constant / plane.normal.y;
        const qa = -.5 * S * G, qb = S * grain.vy - nx * dx - nz * dz;
        const qc = launchY + S * H0 - nx * x0 - nz * z0 - intercept, disc = qb * qb - 4 * qa * qc;
        if (disc < 0) continue;
        const root = Math.sqrt(disc);
        for (const age of [(-qb - root) / (2 * qa), (-qb + root) / (2 * qa)]) {
          if (!(age > 1e-10 && age <= until + 1e-9 && age < first)) continue;
          const p = location(grain, age, launchY); point.set(p.x, p.y, p.z);
          T.Triangle.getBarycoord(point, a, b, c, barycentric);
          if (Math.min(barycentric.x, barycentric.y, barycentric.z) >= -1e-8) first = age;
        }
      }
      const life = Math.min(first, until), endKind = first <= until + 1e-9 ? 'impact' : exit <= LIMIT ? 'mesh-exit' : 'display-limit';
      const result = { launchY, life, endKind, impact: endKind === 'impact' ? location(grain, life, launchY) : null };
      cache.set(key, result); if (cache.size > 1024) cache.delete(cache.keys().next().value!);
      return result;
    }
    function cases() {
      const time = w.dust.userData.terrainDustTime, frame = w.dust.userData.terrainDustFrame || [];
      const births = w.dust.userData.terrainDustBirths || [], rendered = new Set(frame.map((p: any) => p.id));
      let early: any = null, bowl: any = null;
      for (const grain of births) {
        const o = oracle(grain), age = time - grain.born;
        if (!early && o.endKind === 'impact' && o.life < grain.life - .002 && age > o.life + .001 && age < grain.life - .001 &&
          o.impact.y - o.launchY > .002 && !rendered.has(grain.id))
          early = { grain, oracle: o, age, beforeGap: gap(grain, Math.max(0, o.life - 1e-5), o.launchY),
            impactGap: gap(grain, o.life, o.launchY), afterGap: gap(grain, o.life + 1e-5, o.launchY) };
        if (!bowl && age > grain.life + .001 && age < o.life - .001 && rendered.has(grain.id)) {
          const p = location(grain, age, o.launchY), terrainY = height(p.x, p.z);
          if (terrainY < o.launchY - .002) bowl = { grain, oracle: o, age, terrainY, current: p, currentGap: p.y - terrainY };
        }
      }
      return { early, bowl, time, birthCount: births.length, renderedCount: frame.length };
    }
    function inspect() {
      const data = w.dust.userData, frame = data.terrainDustFrame, births = data.terrainDustBirths, time = data.terrainDustTime;
      if (!Array.isArray(frame) || !Array.isArray(births)) throw Error('Native dust snapshots are unavailable');
      const byId = new Map(births.map((grain: any) => [grain.id, grain])), expectedIds: number[] = [];
      let lifeError = 0, launchError = 0, kindErrors = 0;
      for (const grain of births) {
        const o = oracle(grain), age = time - grain.born;
        const actual = (window as any).MoonMissionPure.descentDustTerrainFlight(grain, w.terrain.userData.descentSurface);
        if (!actual) throw Error('Native grain was rejected by the terrain flight helper');
        lifeError = Math.max(lifeError, Math.abs(actual.life - o.life)); launchError = Math.max(launchError, Math.abs(actual.launchY - o.launchY));
        if (actual.endKind !== o.endKind) kindErrors++;
        if (age >= 0 && age < o.life) expectedIds.push(grain.id);
      }
      w.scene.updateMatrixWorld(true); const inverse = w.terrain.matrixWorld.clone().invert();
      const g = w.dust.geometry, n = g.drawRange.count, gl = w.renderer.getContext();
      let vertex = 0, clearanceChecks = 0, minimumGap = Infinity, parabolaError = 0, bufferError = 0, opacityError = 0, rowErrors = 0;
      function clear(p: any) { minimumGap = Math.min(minimumGap, p.y - height(p.x, p.z)); clearanceChecks++; }
      for (const row of frame) {
        const grain: any = byId.get(row.id); if (!grain) throw Error('Rendered grain is absent from the actual pool snapshot');
        const o = oracle(grain);
        if (row.trail.length < 2 || row.trail.length > 17 || row.age < 0 || row.age >= row.life ||
          row.born !== grain.born || Math.abs(row.age - (time - grain.born)) > 1e-9 ||
          Math.abs(row.life - o.life) > 1e-7 || row.flatLife !== grain.life || row.endKind !== o.endKind) rowErrors++;
        for (const p of row.trail) {
          const physical = location(grain, p.age, o.launchY);
          parabolaError = Math.max(parabolaError, Math.abs(p.x - physical.x), Math.abs(p.y - physical.y), Math.abs(p.z - physical.z)); clear(p);
        }
        for (let i = 1; i < row.trail.length; i++) {
          const p = row.trail[i - 1], q = row.trail[i];
          for (const t of [.25, .5, .75]) clear({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z + (q.z - p.z) * t });
          for (const expected of [p, q]) {
            const actual = new T.Vector3().fromBufferAttribute(g.attributes.position, vertex).applyMatrix4(w.dust.matrixWorld).applyMatrix4(inverse);
            bufferError = Math.max(bufferError, Math.abs(actual.x - expected.x), Math.abs(actual.y - expected.y), Math.abs(actual.z - expected.z));
            opacityError = Math.max(opacityError, Math.abs(g.attributes.opacity.getX(vertex) - row.opacity)); vertex++;
          }
        }
      }
      return { mode: data.terrainDustMode, time, columns, rows, birthCount: births.length, renderedCount: frame.length,
        renderedIds: frame.map((p: any) => p.id).sort((a: number, b: number) => a - b), expectedIds: expectedIds.sort((a, b) => a - b),
        drawCount: n, expectedCount: vertex, bufferCapacity: g.attributes.position.count, minimumGap, clearanceChecks,
        lifeError, launchError, kindErrors, parabolaError, bufferError, opacityError, rowErrors, oracleComputations,
        frozen: Object.isFrozen(frame) && frame.every((p: any) => Object.isFrozen(p) && Object.isFrozen(p.trail) && p.trail.every(Object.isFrozen)) &&
          Object.isFrozen(births) && births.every(Object.isFrozen), glError: gl.getError(), cases: cases() };
    }
    (window as any).__terrainDustOracle = { cases, inspect };
  });
}

async function pilotToCases(page: Page) {
  await page.evaluate(() => {
    const cv = document.querySelector('[data-descent-canvas]') as any;
    const lever = document.querySelector('[data-descent-throttle]') as HTMLInputElement;
    const pause = document.querySelector('[data-descent-pause]') as HTMLButtonElement;
    const P = (window as any).MoonMissionPure;
    (window as any).__terrainDustPilot = { phase: 'coast', done: false, error: null };
    function pilot() {
      const control = (window as any).__terrainDustPilot; if (control.done) return;
      try {
        const s = cv._descentState(); if (s.contact) throw Error('Flight contacted before both terrain dust cases were observed');
        if (control.phase === 'coast' && s.alt < 115) control.phase = 'brake';
        if (control.phase === 'brake' && s.vVel > -1) control.phase = 'hold';
        let setting = control.phase === 'coast' ? 0 : 100;
        if (control.phase === 'hold') {
          const desired = Math.max(-4, Math.min(2, (18 - s.alt) * .6));
          setting = Math.round(Math.max(0, Math.min(1, P.descentGuidance(s).hoverThrottle / Math.cos(s.tilt) + (desired - s.vVel) * .08)) * 100);
          cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
        }
        if (lever.value !== String(setting)) { lever.value = String(setting); lever.dispatchEvent(new Event('input', { bubbles: true })); }
        if (s.alt < 26 && control.phase === 'hold') {
          const found = (window as any).__terrainDustOracle.cases();
          if (found.early && found.bowl) { pause.click(); control.done = true; control.cases = found; return; }
        }
      } catch (error) { control.error = String(error); control.done = true; pause.click(); return; }
      requestAnimationFrame(pilot);
    }
    requestAnimationFrame(pilot);
  });
  await page.locator('[data-descent-pause]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__terrainDustPilot.done), { timeout: 100000 }).toBe(true);
  expect(await page.evaluate(() => (window as any).__terrainDustPilot.error)).toBeNull();
  await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent-paused', 'true');
  const held = await flight(page);
  await expect.poll(() => page.evaluate(() => (window as any).__terrainDustGL.dust.userData.terrainDustTime)).toBe(held.elapsed);
}

async function inspect(page: Page) {
  const value = await page.evaluate(() => (window as any).__terrainDustOracle.inspect());
  expect(value.mode).toBe('mesh-triangles'); expect(value.frozen).toBe(true); expect(value.glError).toBe(0);
  expect(value.renderedCount).toBeGreaterThan(0); expect(value.renderedIds).toEqual(value.expectedIds);
  expect(value.drawCount).toBe(value.expectedCount); expect(value.drawCount).toBeLessThanOrEqual(value.bufferCapacity);
  expect(value.clearanceChecks).toBeGreaterThan(value.renderedCount * 2); expect(value.minimumGap).toBeGreaterThanOrEqual(-1e-4);
  expect(value.lifeError).toBeLessThan(1e-7); expect(value.launchError).toBeLessThan(1e-8); expect(value.kindErrors).toBe(0);
  expect(value.parabolaError).toBeLessThan(1e-8); expect(value.bufferError).toBeLessThan(2e-4); expect(value.opacityError).toBeLessThan(1e-6);
  expect(value.rowErrors).toBe(0); expect(value.cases.early).not.toBeNull(); expect(value.cases.bowl).not.toBeNull();
  expect(value.cases.early.beforeGap).toBeGreaterThan(0); expect(Math.abs(value.cases.early.impactGap)).toBeLessThan(1e-7);
  expect(value.cases.early.afterGap).toBeLessThan(0); expect(value.cases.bowl.currentGap).toBeGreaterThan(0);
  expect(value.renderedIds).not.toContain(value.cases.early.grain.id); expect(value.renderedIds).toContain(value.cases.bowl.grain.id);
  return value;
}
async function capture(page: Page, info: TestInfo, directory: string, name: string) {
  await mkdir(directory, { recursive: true }); const path = join(directory, name + '.png');
  const clip = await page.locator('[data-descent-canvas]').evaluate((c: HTMLElement) => {
    const b = c.parentElement!.getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height };
  });
  await page.screenshot({ path, fullPage: true, clip, animations: 'disabled' }); await info.attach(name, { path, contentType: 'image/png' });
}
async function pixels(page: Page) {
  return page.evaluate(() => {
    const { renderer, scene, camera, dust } = (window as any).__terrainDustGL, gl = renderer.getContext();
    const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
    function read() { const a = new Uint8Array(width * height * 4); renderer.render(scene, camera); gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, a); return a; }
    const visible = dust.visible, before = read(); dust.visible = false; const after = read(); dust.visible = visible; renderer.render(scene, camera);
    let changed = 0, delta = 0;
    for (let i = 0; i < before.length; i += 4) { const d = Math.abs(before[i] - after[i]) + Math.abs(before[i + 1] - after[i + 1]) + Math.abs(before[i + 2] - after[i + 2]); if (d) { changed++; delta += d; } }
    return { width, height, changed, delta, glError: gl.getError() };
  });
}

for (const tier of [{ name: 'lighter', cores: 4, vertices: 141 }, { name: 'detailed', cores: 8, vertices: 221 }]) {
  test(`${tier.name} native WebGL stops grains at rising terrain and continues bowl flights after flat touchdown`, async ({ page }, info) => {
    const directory = join(REPORT, tier.name), errors: string[] = [], shaderErrors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && /shader|GL_INVALID|VALIDATE_STATUS/i.test(m.text())) shaderErrors.push(m.text()); });
    await page.addInitScript(cores => Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: cores }), tier.cores);
    if (tier.name === 'lighter') await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount(page); await installOracle(page); const original = await receipts(page); await pilotToCases(page);
    const held = await flight(page), flat = await flatDust(page), saved = await receipts(page), initial = await inspect(page);
    expect(initial.columns).toBe(tier.vertices); expect(initial.rows).toBe(tier.vertices); expect(held.contact).not.toBe(true);
    expect(initial.time).toBe(held.elapsed); expect(flat.time).toBe(held.elapsed); expect(saved).toEqual(original);
    expect(flat.grains.map((p: any) => p.id)).toContain(initial.cases.early.grain.id);
    expect(flat.grains.map((p: any) => p.id)).not.toContain(initial.cases.bowl.grain.id);
    const frame = await page.evaluate(() => (window as any).__terrainDustGL.dust.userData.terrainDustFrame);
    const pixel = await pixels(page); expect(pixel.changed).toBeGreaterThan(5); expect(pixel.delta).toBeGreaterThan(0); expect(pixel.glError).toBe(0);
    await capture(page, info, directory, 'terrain-ballistic-dust');
    await page.waitForTimeout(250); expect(await flight(page)).toEqual(held); expect(await flatDust(page)).toEqual(flat); expect(await receipts(page)).toEqual(saved);
    await page.locator('select[data-descent-camera]').selectOption('landing');
    await expect(page.locator('[data-descent-gl]')).toHaveAttribute('data-descent-camera', 'landing');
    await page.setViewportSize({ width: 1000, height: 900 });
    const resized = await inspect(page); expect(resized.time).toBe(initial.time);
    expect(await page.evaluate(() => (window as any).__terrainDustGL.dust.userData.terrainDustFrame)).toEqual(frame);
    expect(await flight(page)).toEqual(held); expect(await flatDust(page)).toEqual(flat); expect(await receipts(page)).toEqual(saved);
    await capture(page, info, directory, 'landing-view-terrain-dust');
    await page.evaluate(() => {
      const extension = (window as any).__terrainDustGL.renderer.getContext().getExtension('WEBGL_lose_context');
      if (!extension) throw Error('WEBGL_lose_context unavailable'); extension.loseContext();
    });
    await expect(page.locator('[data-descent-canvas]')).toHaveAttribute('data-descent3d', 'lost');
    await expect(page.locator('[data-descent-gl]')).toHaveCount(0);
    expect(await flight(page)).toEqual(held); expect(await flatDust(page)).toEqual(flat); expect(await receipts(page)).toEqual(saved);
    await capture(page, info, directory, 'context-loss-flat-dust');
    expect(errors).toEqual([]); expect(shaderErrors).toEqual([]);
    await writeFile(join(directory, 'evidence.json'), JSON.stringify({ tier, held, flat, saved, initial, resized, pixel,
      errors, shaderErrors, contexts: await harness.glContexts(page) }, null, 2));
  });
}
