import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import * as vm from 'node:vm';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

/**
 * City Lab 3D, wave 3 (2026-11-04): the first two minutes, against real WebGL.
 *
 * jsdom (tests/citylab_3d_w3.test.js) proves the coach is the student's own
 * three steps, Options keeps every setting, and the K-5 view hides nothing it
 * cannot give back. This spec proves what only a browser can: the first view
 * really frames the town (its parcels fill the stage, and Reset brings the
 * whole map back on screen); the view slides and zooms to an edge district
 * with the real keyboard; the coach's tint is drawn and the coach path works
 * with the real keyboard; axe on the board, the coach, Options and the path in
 * light, dark and contrast, and on the K-5 view; 320 px reflow; 44 px targets.
 *
 * Run alone: one Playwright suite at a time on this machine, 0 retries.
 */
function pureSeam(): any {
  const sb: any = {};
  sb.window = sb;
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_citylab.js', 'utf8'), sb);
  return sb.__alloCityLabPure;
}
const P = pureSeam();

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
    // The screen box the given parcels' tops fill, and how many are on screen.
    window.__spread = function (ids) {
      var d = window.__city(), xs = [], ys = [], on = 0;
      ids.forEach(function (id) {
        var p = d.project(id);
        if (!p) return;
        if (p.onScreen) on++;
        xs.push(p.x); ys.push(p.y);
      });
      var r = document.getElementById('citylab-stage').getBoundingClientRect();
      return { on: on, n: ids.length, w: (Math.max.apply(null, xs) - Math.min.apply(null, xs)) / r.width,
        h: (Math.max.apply(null, ys) - Math.min.apply(null, ys)) / r.height,
        cx: (Math.max.apply(null, xs) + Math.min.apply(null, xs)) / 2 - (r.left + r.width / 2) };
    };
  `,
});

test.describe.configure({ timeout: 150_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

type Theme = 'light' | 'dark' | 'contrast';

async function setTheme(page: Page, theme: Theme, extra: Record<string, unknown> = {}) {
  await page.evaluate(([th, ex]) => {
    const w = window as any;
    document.body.className = th === 'dark' ? 'theme-dark' : th === 'contrast' ? 'theme-contrast' : '';
    document.body.style.background = th === 'contrast' ? '#000' : th === 'dark' ? '#0f172a' : '#f1f5f9';
    const wrap = document.getElementById('wrap')!;
    wrap.setAttribute('data-stem-tool-shell', 'true');
    wrap.style.background = th === 'contrast' ? '#000' : '#fff';
    wrap.style.padding = '12px';
    wrap.style.boxSizing = 'border-box';
    Object.assign(w.__ctx, { theme: th, isDark: th !== 'light', isContrast: th === 'contrast' }, ex);
    w.__rerender();
  }, [theme, extra] as const);
  await page.waitForTimeout(400);
}

async function mount3d(page: Page, theme: Theme = 'light', extra: Record<string, unknown> = {}, ctx: Record<string, unknown> = {}) {
  // W4: no ready wait inside mount. With the lens row the stage can start
  // below the fold, and the viewer draws nothing off screen until it is
  // scrolled in, so scroll first (below), then wait.
  await harness.mount(page, { _cityLab: Object.assign({ boardView: 'model' }, extra) });
  await setTheme(page, theme, ctx);
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

const BASE = P.basePlan('riverbend');
const BUILT = P.allParcelIds().filter((id: string) => P.BUILT_USE_IDS.indexOf(BASE.uses[id]) !== -1);
const CORNERS = ['A1', 'L1', 'A12', 'L12'];

async function axeOn(page: Page, include: string[][]) {
  return page.evaluate(async (inc) => {
    const res = await (window as any).axe.run({ include: inc }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      resultTypes: ['violations'],
    });
    return res.violations.flatMap((v: any) => v.nodes.map((n: any) => ({
      rule: v.id, html: String(n.html).slice(0, 140),
      why: String((n.any && n.any[0] && n.any[0].message) || n.failureSummary || '').slice(0, 180),
    })));
  }, include);
}

test.describe('City Lab 3D W3 - the first two minutes, real WebGL', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('the first view frames the town, and Reset brings the whole map back', async ({ page }) => {
    await mount3d(page);
    const d0 = (await city(page))!;
    const town = P.townFrame(BASE);
    expect(d0.frame).toMatchObject({ x: town.x, z: town.z, hx: town.hx, hz: town.hz });
    expect(d0.target.x).toBeCloseTo(town.x, 6);
    expect(d0.target.z).toBeCloseTo(town.z, 6);
    const framed = await page.evaluate((ids) => (window as any).__spread(ids), BUILT);
    expect(framed.on, 'a building of the town is off screen').toBe(framed.n);
    await page.locator('button', { hasText: 'Reset view' }).first().click();
    await page.waitForFunction(() => (window as any).__city().frame.hx === 6, null, { timeout: 5000 });
    await page.waitForTimeout(300);
    const whole = await page.evaluate((ids) => (window as any).__spread(ids), BUILT);
    const corners = await page.evaluate((ids) => (window as any).__spread(ids), CORNERS);
    expect(corners.on, 'Reset does not show the whole map').toBe(4);
    // The town fills far more of the stage at first than in the whole-map view.
    expect(framed.h * framed.w, `framed ${JSON.stringify(framed)} vs whole ${JSON.stringify(whole)}`)
      .toBeGreaterThan(2 * whole.h * whole.w);
    const px = await harness.glPixels(page);
    expect(looksBlank(px!), 'the 3D canvas is blank').toBe(false);
  });

  test('the keyboard slides the view and zooms to an edge district', async ({ page }) => {
    await mount3d(page, 'light', { coachOff: true });
    const stage = page.locator('#citylab-stage');
    await stage.focus();
    const t0 = (await city(page))!.target;
    const rot = (await city(page))!.rotY;
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    const mv = P.screenPan(rot, 2, 0);
    await page.waitForFunction(([x]) => Math.abs((window as any).__city().target.x - x) < 1e-6, [t0.x + mv.dx], { timeout: 5000 });
    expect((await city(page))!.target.z).toBeCloseTo(t0.z + mv.dz, 6);
    expect((await city(page))!.rotY).toBe(rot);
    // Select the far corner on the map by keyboard, then Zoom to it by keyboard.
    await page.locator('#citylab-parcel-' + P.SCENARIOS.riverbend.coreParcel).focus();
    for (let i = 0; i < 11; i++) await page.keyboard.press('End');
    for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowDown');
    await expect(page.locator('#citylab-parcel-L12')).toBeFocused();
    await page.locator('[data-citylab-cam-more]').click();        // W4: folded at every width
    const zoom = page.getByRole('button', { name: 'Zoom in on the selected parcel, L12, and the parcels round it' });
    await zoom.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (window as any).__city().frame.hx < 2, null, { timeout: 5000 });
    await page.evaluate(() => document.getElementById('citylab-stage')!.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    const s = await page.evaluate(() => (window as any).__spread(['L12']));
    expect(s.on).toBe(1);
    // The district frame holds L12 and keeps its whole box on the map (no void past the edge).
    const fr = (await city(page))!.frame;
    expect(P.inFrame(fr, 'L12')).toBe(true);
    expect(fr.x + fr.hx).toBeLessThanOrEqual(6 + 1e-9);
    expect(fr.z + fr.hz).toBeLessThanOrEqual(6 + 1e-9);
    // Home shows the whole map again.
    await stage.focus();
    await page.keyboard.press('Home');
    await page.waitForFunction(() => (window as any).__city().frame.hx === 6, null, { timeout: 5000 });
  });

  test('the coach tints its fields on the model and walks a keyboard-only student into Mission 1', async ({ page }) => {
    await mount3d(page);
    const fields = P.coachFields(BASE);
    await page.waitForFunction((n) => (window as any).__city().hints === n, fields.length, { timeout: 5000 });
    await expect(page.locator('[data-citylab-coach]')).toHaveAttribute('data-citylab-coach', '1');
    // Arrow keys on the map to the first tinted field in the core's row.
    const core = P.SCENARIOS.riverbend.coreParcel;
    const target = fields.find((id: string) => P.parcelRow(id) === P.parcelRow(core)) || fields[0];
    await page.locator('#citylab-parcel-' + core).focus();
    const steps = P.parcelCol(core) - P.parcelCol(target);
    for (let i = 0; i < Math.abs(steps); i++) await page.keyboard.press(steps > 0 ? 'ArrowLeft' : 'ArrowRight');
    await expect(page.locator('#citylab-parcel-' + target)).toBeFocused();
    await expect(page.locator('[data-citylab-coach]')).toHaveAttribute('data-citylab-coach', '2');
    await page.waitForFunction(() => (window as any).__city().hints === 0, null, { timeout: 5000 });
    await page.keyboard.press('6');
    await expect(page.locator('[data-citylab-coach]')).toHaveAttribute('data-citylab-coach', '3');
    await expect(page.locator('[data-citylab-coach]')).toContainText('more people figures walk there');
    const go = page.getByRole('button', { name: 'Start Mission 1' });
    await go.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-citylab-coach]')).toHaveCount(0);
    await expect(page.locator('#citylab-missions-title')).toBeFocused();
    const td = await page.evaluate(() => (window as any).__toolData._cityLab);
    expect(td.coachOff).toBe(true);
    expect(td.plan.uses[target]).toBe('housing_mid');
    expect(td.xpAwarded).toBeUndefined();
  });

  for (const theme of ['light', 'dark', 'contrast'] as Theme[]) {
    test(`axe finds nothing on the path, the coach, Options and the board (${theme})`, async ({ page }) => {
      await mount3d(page, theme);
      await page.locator('#citylab-options-toggle').click();
      await page.locator('[data-citylab-more-uses]').click();
      await page.waitForTimeout(300);
      const v = await axeOn(page, [['nav[aria-labelledby="citylab-path-title"]'], ['[data-citylab-coach]'], ['#citylab-options'],
        ['#citylab-options-toggle'], ['[data-citylab-board3d]']]);
      const detail = v.map((x: any) => `  ${x.rule}: ${x.why}\n    ${x.html}`).join('\n');
      expect(v, `${theme}: ${v.length} violation(s)\n${detail}`).toEqual([]);
    });
  }

  test('axe finds nothing on the K-5 view: pictures, mission numbers and the full scorecard', async ({ page }) => {
    await mount3d(page, 'light', { coachOff: true }, { gradeBand: 'k2' });
    await expect(page.locator('[role="toolbar"][data-citylab-palette]')).toHaveAttribute('data-citylab-palette', 'pictures');
    await page.locator('[data-citylab-full-score]').click();
    await page.waitForTimeout(300);
    const v = await axeOn(page, [['[data-citylab-mission-numbers]'], ['[data-citylab-full-score]'], ['[data-citylab-board3d]']]);
    const detail = v.map((x: any) => `  ${x.rule}: ${x.why}\n    ${x.html}`).join('\n');
    expect(v, `${v.length} violation(s)\n${detail}`).toEqual([]);
  });

  test('reflows at 320 px with the coach, Options and the K-5 palette open', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await harness.mount(page, { _cityLab: { boardView: 'model' } }, 'window.__cityReady()');
    await page.addStyleTag({ content: '#wrap{width:auto !important;max-width:100% !important}' });
    await setTheme(page, 'light', { gradeBand: 'k2' });
    await page.locator('#citylab-options-toggle').click();
    await page.locator('[data-citylab-more-uses]').click();
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      coachW: Math.round(document.querySelector('[data-citylab-coach]')!.getBoundingClientRect().right),
      optW: Math.round(document.getElementById('citylab-options')!.getBoundingClientRect().right),
    }));
    expect(m.scrollW, 'page scrolls sideways at 320 px').toBeLessThanOrEqual(320);
    expect(m.coachW).toBeLessThanOrEqual(320);
    expect(m.optW).toBeLessThanOrEqual(320);
  });

  test('every new control is at least 44 px', async ({ page }) => {
    await mount3d(page);
    await page.locator('#citylab-options-toggle').click();
    await page.locator('nav[aria-labelledby="citylab-path-title"] button').first().click();
    await page.waitForTimeout(300);
    const small = await page.evaluate(() => {
      const scope = [...document.querySelectorAll('[data-citylab-coach] button, #citylab-options button, #citylab-options-toggle, '
        + 'nav[aria-labelledby="citylab-path-title"] button, [role="toolbar"] button, [aria-label="Move the camera"] button')];
      return scope.map((b) => { const r = b.getBoundingClientRect(); return { t: (b.textContent || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter((r) => r.w < 44 || r.h < 44);
    });
    expect(small).toEqual([]);
    const rows = await page.locator('nav[aria-labelledby="citylab-path-title"] ol button').count();
    expect(rows).toBe(6);
  });
});
