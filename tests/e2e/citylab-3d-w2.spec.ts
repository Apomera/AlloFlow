import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import * as vm from 'node:vm';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

/**
 * City Lab 3D, wave 2 (2026-11-04): the city responds, against real WebGL.
 *
 * jsdom (tests/citylab_3d_w2.test.js) proves livingCity is the model and that
 * the frame logic snaps and freezes. This spec proves what only a browser can:
 * a change really grows in and the frames really stop when reduced motion is
 * switched on mid-growth (it checks the scene WAS animating first); a fully
 * built town stays inside the draw-call budget, and draws nothing once it is
 * still; a staged edit freezes the model; the figures on screen are
 * livingCity's; no context leaks; axe in light, dark and contrast; the canvas
 * is not blank; and on a phone the camera folds behind "More camera".
 *
 * Run alone: one Playwright suite at a time on this machine, 0 retries.
 */
const DRAW_BUDGET = 25;

// The tool's pure seam, loaded in Node, so a spec can build plans and ask
// livingCity what the page should be drawing.
function pureSeam(): any {
  const sb: any = {};
  sb.window = sb;
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_citylab.js', 'utf8'), sb);
  return sb.__alloCityLabPure;
}
const P = pureSeam();

// A fully built town: every buildable parcel used, roads along every row and
// down the west edge, stops, cool roofs and green infrastructure.
function fullPlan() {
  let p = P.basePlan('riverbend');
  const cycle = ['housing_low', 'housing_mid', 'mixed', 'commercial', 'civic', 'industry', 'park', 'preserve', 'farm'];
  P.allParcelIds().forEach((id: string) => {
    if (p.uses[id] !== 'water') p = P.setUse(p, id, cycle[(P.parcelCol(id) + P.parcelRow(id)) % cycle.length]);
  });
  for (let r = 1; r <= P.N_ROWS; r++) {
    for (let c = 0; c < P.N_COLS - 1; c++) {
      const a = P.pid(c, r), b = P.pid(c + 1, r);
      if (!p.edges[P.edgeKey(a, b)]) p = P.setEdge(p, a, b, 'local');
    }
  }
  for (let r = 1; r < P.N_ROWS; r++) {
    const a = P.pid(0, r), b = P.pid(0, r + 1);
    if (!p.edges[P.edgeKey(a, b)]) p = P.setEdge(p, a, b, 'local');
  }
  ['C3', 'F6', 'J9', 'D10'].forEach((id) => { p = P.toggleTransit(p, id); });
  ['B2', 'E5', 'H8'].forEach((id) => { if (P.canCoolRoof(p.uses[id])) p = P.toggleCoolRoof(p, id); });
  ['C4', 'G7'].forEach((id) => { if (P.canGreenInfra(p.uses[id])) p = P.toggleGreenInfra(p, id); });
  return p;
}

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_citylab.js',
  toolId: 'cityLab',
  preScripts: ['stem_lab/stem_lab_module.js'],
  appStyles: true,
  layout: 'document',
  width: 1280,
  height: 900,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
  probes: `
    window.__city = function () {
      var vs = (window.StemLab && window.StemLab._orbitViewers) || [];
      for (var i = 0; i < vs.length; i++) {
        var d = null;
        try { d = vs[i].debug(); } catch (e) {}
        if (d && d.cityLab) return d;
      }
      return null;
    };
    window.__cityReady = function () {
      var d = window.__city();
      return !!(d && d.state === 'ready' && d.pickables > 0);
    };
    // Every frame request the page makes, counted at the global the viewer calls.
    window.__raf = 0;
    (function () {
      var raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function (cb) { window.__raf++; return raf(cb); };
    })();
    // A field parcel a road reaches whose projected top picks back to itself.
    window.__cityTarget = function () {
      var d = window.__city(), P = window.__alloCityLabPure;
      var plan = (window.__toolData._cityLab && window.__toolData._cityLab.plan) || P.basePlan('riverbend');
      var served = P.servedParcels(plan);
      var ids = P.allParcelIds().filter(function (id) { return plan.uses[id] === 'field' && served[id]; });
      for (var i = 0; i < ids.length; i++) {
        var p = d.project(ids[i]);
        if (p && p.onScreen && d.pick(p.x, p.y) === ids[i]) return { id: ids[i], x: p.x, y: p.y };
      }
      return null;
    };
  `,
});

test.describe.configure({ timeout: 150_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

type Theme = 'light' | 'dark' | 'contrast';

async function setTheme(page: Page, theme: Theme) {
  await page.evaluate((th) => {
    const w = window as any;
    document.body.className = th === 'dark' ? 'theme-dark' : th === 'contrast' ? 'theme-contrast' : '';
    document.body.style.background = th === 'contrast' ? '#000' : th === 'dark' ? '#0f172a' : '#f1f5f9';
    const wrap = document.getElementById('wrap')!;
    wrap.setAttribute('data-stem-tool-shell', 'true');
    wrap.style.background = th === 'contrast' ? '#000' : '#fff';
    wrap.style.padding = '12px';
    wrap.style.boxSizing = 'border-box';
    Object.assign(w.__ctx, { theme: th, isDark: th !== 'light', isContrast: th === 'contrast' });
    w.__rerender();
  }, theme);
  await page.waitForTimeout(400);
}

async function mount3d(page: Page, theme: Theme = 'light', extra: Record<string, unknown> = {}) {
  await harness.mount(page, { _cityLab: Object.assign({ boardView: 'model' }, extra) }, 'window.__cityReady()');
  await setTheme(page, theme);
  await page.evaluate(() => document.getElementById('citylab-stage')!.scrollIntoView({ block: 'start' }));
  await page.waitForFunction(() => (window as any).__cityReady(), null, { timeout: 30000 });
  await page.waitForTimeout(500);
}

const city = (page: Page) => page.evaluate(() => {
  const d = (window as any).__city();
  if (!d) return null;
  const { project, pick, ...rest } = d;
  return rest;
});
// GL draw calls made so far on the city's live canvas.
const draws = (page: Page) => harness.glContexts(page).then((cs) => cs.filter((c) => c.inWrap && !c.lost)
  .reduce((n, c) => n + c.draws, 0));

async function clickServedField(page: Page, tool = 'housing_mid') {
  await page.locator(`[data-citylab-tool="${tool}"]`).click();
  await page.evaluate(() => document.getElementById('citylab-stage')!.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
  const target = await page.evaluate(() => (window as any).__cityTarget());
  expect(target, 'no served field parcel picks back to itself').not.toBeNull();
  await page.mouse.click(target.x, target.y);
  return target;
}

test.describe('City Lab 3D W2 - the city responds, real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: null });
    await harness.destroy(page);
  });

  test('a change grows in, and reduced motion switched on mid-growth stops the frames', async ({ page }) => {
    await mount3d(page);
    const before = (await city(page))!;
    expect(before.motion, 'a capable device should animate').toBe(true);
    expect(before.slow, 'the watchdog tripped before the test began').toBe(false);
    const target = await clickServedField(page);
    // The change starts growing in, and the scene is animating.
    await page.waitForFunction(() => { const d = (window as any).__city(); return d.growing && d.growStart != null; },
      null, { polling: 'raf', timeout: 5000 });
    const mid = (await city(page))!;
    expect(mid.growK, 'the change did not grow in').toBeLessThan(1);
    expect(mid.animFrames, 'it was not animating').toBeGreaterThan(before.animFrames);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => { const d = (window as any).__city(); return !d.growing && d.static && !d.active; }, null, { timeout: 5000 });
    const after = (await city(page))!;
    expect(after.growK).toBe(1);
    // Snapped to the end state, well before the 400 ms the growth takes.
    const ran = after.growEnd - after.growStart;
    expect(ran, `the growth ran ${Math.round(ran)} ms: the switch did not cut it short`).toBeLessThan(P.GROW_MS - 40);
    const r0 = await page.evaluate(() => (window as any).__raf);
    const f0 = after.animFrames;
    await page.waitForTimeout(900);
    const r1 = await page.evaluate(() => (window as any).__raf);
    expect(r1 - r0, 'frames kept being requested under reduced motion').toBeLessThanOrEqual(1);
    expect((await city(page))!.animFrames).toBe(f0);
    // The edit itself landed, and the board says why the town stands still.
    const c = await page.evaluate(() => (window as any).__toolData._cityLab.plan.uses);
    expect(c[target.id]).toBe('housing_mid');
    await expect(page.locator('[data-citylab-motion]')).toContainText('asks for less motion');
    await expect(page.locator('[data-citylab-motion-switch]')).toBeDisabled();
  });

  test('a fully built town stays inside the draw-call budget, and draws nothing once still', async ({ page }) => {
    const plan = fullPlan();
    await mount3d(page, 'light', { plan });
    const live = (await city(page))!;
    expect(live.calls, 'draw calls in one frame of a fully built town').toBeLessThanOrEqual(DRAW_BUDGET);
    expect(live.calls).toBeGreaterThan(5);
    expect(live.meshes, 'one mesh per part is back').toBeLessThan(250);
    // The figures, cars and signs on screen are livingCity's.
    const L = P.livingCity(plan, 'central');
    expect(live.batches.people).toBe(L.people.length);
    expect(live.batches.cars).toBe(L.cars.length);
    expect(live.batches.sign).toBe(L.noRoad.length);
    // Animation off: the frame loop stops and the draw count stays flat.
    await page.locator('[data-citylab-cam-more]').click();
    await page.locator('[data-citylab-motion-switch]').click();
    await page.waitForFunction(() => { const d = (window as any).__city(); return d.static && !d.active && !d.motion; }, null, { timeout: 5000 });
    await page.waitForTimeout(300);
    const d0 = await draws(page);
    await page.waitForTimeout(1500);
    expect(await draws(page), 'still drawing after the town settled').toBe(d0);
    // A camera move draws exactly one frame, at the same cost. (W4: the camera
    // row folds at every width, so Turn left is under More camera, opened
    // before the count above.)
    await page.locator('button[aria-label="Turn the model left"]').click();
    await page.waitForTimeout(600);
    const d1 = await draws(page);
    expect(d1 - d0).toBeGreaterThan(0);
    expect(d1 - d0).toBeLessThanOrEqual(DRAW_BUDGET * 2);
    expect((await city(page))!.calls).toBe(live.calls);
  });

  test('a staged edit freezes the model until the prediction is in', async ({ page }) => {
    await mount3d(page, 'light', { predictEvery: true });
    await clickServedField(page);
    await page.waitForFunction(() => (window as any).__city().frozen, null, { timeout: 5000 });
    await page.waitForFunction(() => { const d = (window as any).__city(); return d.static && !d.active; }, null, { timeout: 5000 });
    const s0 = (await city(page))!;
    expect(s0.ghost).toBe(true);
    expect(s0.growing).toBe(false);
    const r0 = await page.evaluate(() => (window as any).__raf);
    await page.waitForTimeout(800);
    expect((await city(page))!.animFrames).toBe(s0.animFrames);
    expect(await page.evaluate(() => (window as any).__raf) - r0).toBeLessThanOrEqual(1);
    await expect(page.locator('[data-citylab-chip]')).toHaveCount(0);
    await page.getByRole('button', { name: 'up', exact: true }).click();
    await page.waitForFunction(() => !(window as any).__city().frozen, null, { timeout: 5000 });
    await expect(page.locator('[data-citylab-chip="homes"]')).toBeVisible();
  });

  test('unmount releases every GL context', async ({ page }) => {
    await mount3d(page);
    await clickServedField(page);
    await page.waitForTimeout(300);
    await harness.unmount(page);
    const leaked = await harness.leakedAfterUnmount(page);
    expect(leaked).toEqual([]);
  });

  for (const theme of ['light', 'dark', 'contrast'] as Theme[]) {
    test(`axe finds nothing on the living board, and the canvas is not blank (${theme})`, async ({ page }) => {
      await mount3d(page, theme);
      await clickServedField(page);
      await page.waitForTimeout(700);
      await expect(page.locator('[data-citylab-chip]').first()).toBeVisible();
      const px = await harness.glPixels(page);
      expect(px, 'no GL canvas').not.toBeNull();
      expect(looksBlank(px!), `${theme}: the 3D canvas is blank`).toBe(false);
      const violations = await page.evaluate(async () => {
        const res = await (window as any).axe.run({ include: [['[data-citylab-board3d]']] }, {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
          resultTypes: ['violations'],
        });
        return res.violations.flatMap((v: any) => v.nodes.map((n: any) => ({
          rule: v.id, html: String(n.html).slice(0, 140),
          why: String((n.any && n.any[0] && n.any[0].message) || n.failureSummary || '').slice(0, 180),
        })));
      });
      const detail = violations.map((v: any) => `  ${v.rule}: ${v.why}\n    ${v.html}`).join('\n');
      expect(violations, `${theme}: ${violations.length} violation(s)\n${detail}`).toEqual([]);
    });
  }

  test('on a phone the camera folds behind More camera, and the stage is not a tall empty box', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await harness.mount(page, { _cityLab: { boardView: 'model' } }, 'window.__cityReady()');
    await page.addStyleTag({ content: '#wrap{width:auto !important;max-width:100% !important}' });
    await setTheme(page, 'light');
    await page.waitForTimeout(600);
    const more = page.locator('[data-citylab-cam-more]');
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByRole('button', { name: 'Turn the model left' })).toHaveCount(0);
    const folded = await page.evaluate(() => Math.round(document.querySelector('[aria-label="Move the camera"]')!.getBoundingClientRect().height));
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', { name: 'Turn the model left' })).toBeVisible();
    const m = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      stageH: Math.round(document.getElementById('citylab-stage')!.getBoundingClientRect().height),
      small: [...document.querySelectorAll('[aria-label="Move the camera"] button, [data-citylab-motion-switch]')]
        .map((b) => { const r = b.getBoundingClientRect(); return { t: (b.textContent || '').trim(), w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter((r) => r.w < 44 || r.h < 44),
    }));
    expect(folded, 'folded camera controls take more than two rows').toBeLessThanOrEqual(100);
    expect(m.scrollW).toBeLessThanOrEqual(390);
    expect(m.stageH).toBeLessThan(420);
    expect(m.small).toEqual([]);
  });
});
