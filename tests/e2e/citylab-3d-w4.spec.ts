import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import * as vm from 'node:vm';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

/**
 * City Lab 3D, wave 4 (2026-11-04): lenses in 3D, against real WebGL.
 *
 * jsdom (tests/citylab_3d_w4.test.js) proves each lens is one per-parcel
 * function both boards draw, that its summary is the scorecard's numbers and
 * that a staged edit freezes every lens. This spec proves what only a browser
 * can: every lens draws a non-blank town; a fully built plan stays inside the
 * 25-call budget in EVERY lens, with one glyph batch per glyph the model asks
 * for; Harborlight's sea sheet eases between allowances and snaps under
 * reduced motion with no frames spent; axe finds nothing on the board in each
 * lens in light, dark and contrast; 320 px reflow; and the real keyboard
 * builds on the map (Enter runs the tool once, Space too).
 *
 * Run alone: one Playwright suite at a time on this machine, 0 retries.
 */
const DRAW_BUDGET = 25;
const LENSES = ['use', 'elevation', 'heat', 'park', 'transit', 'rain', 'flood', 'access'];

function pureSeam(): any {
  const sb: any = {};
  sb.window = sb;
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_citylab.js', 'utf8'), sb);
  return sb.__alloCityLabPure;
}
const P = pureSeam();
const plain = (o: any) => JSON.parse(JSON.stringify(o));

// The W2 spec's fully built town: every buildable parcel used, roads along
// every row and down the west edge, stops, cool roofs and green infrastructure.
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
  return plain(p);
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
    window.__raf = 0;
    (function () {
      var raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = function (cb) { window.__raf++; return raf(cb); };
    })();
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
  // No ready wait inside mount: a stage below the fold is not drawn (the
  // viewer pauses off screen), so scroll it in first, then wait.
  await harness.mount(page, { _cityLab: Object.assign({ boardView: 'model', coachOff: true }, extra) });
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
async function lensOn(page: Page, id: string) {
  const b = page.locator(`[data-citylab-lens="${id}"]`);
  if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click();
  // W5: the mission strip sits between the lens bar and the stage, so the
  // stage is scrolled in BEFORE the wait (the host draws nothing off screen).
  await page.evaluate(() => document.getElementById('citylab-stage')!.scrollIntoView({ block: 'start' }));
  await page.waitForFunction((l) => (window as any).__city().lens === l, id, { timeout: 10000 });
  await page.waitForTimeout(700);
}
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

test.describe('City Lab 3D W4 - lenses, real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: null });
    await harness.destroy(page);
  });

  test('every lens draws a non-blank town, and a fully built plan stays inside 25 draw calls in each', async ({ page }) => {
    const plan = fullPlan();
    await mount3d(page, 'light', { plan, motionOff: true });
    const report: Record<string, number> = {};
    for (const lens of LENSES) {
      await lensOn(page, lens);
      const d = (await city(page))!;
      report[lens] = d.calls;
      expect(d.calls, `${lens}: draw calls in one frame of a fully built town`).toBeLessThanOrEqual(DRAW_BUDGET);
      expect(d.calls).toBeGreaterThan(5);
      // One glyph batch per glyph the model asks for, with one tag per parcel.
      const want: Record<string, number> = {};
      const L = P.lensCells(plan, 'central', lens).cells;
      Object.keys(L).forEach((id) => { if (L[id].glyph) want[L[id].glyph] = (want[L[id].glyph] || 0) + 1; });
      expect(d.tags, `${lens} glyph batches`).toEqual(want);
      const px = await harness.glPixels(page);
      expect(px, 'no GL canvas').not.toBeNull();
      expect(looksBlank(px!), `${lens}: the 3D canvas is blank`).toBe(false);
    }
    console.log('draw calls per lens (fully built plan):', JSON.stringify(report));
  });

  test('Harborlight\'s sea sheet eases between allowances, and snaps under reduced motion with no frames spent', async ({ page }) => {
    await mount3d(page, 'light', { lens: 'flood', plan: plain(P.basePlan('harborlight')) });
    const d0 = (await city(page))!;
    expect(d0.motion, 'a capable device should animate').toBe(true);
    const sheet = (d: any) => d.sheets.find((s: any) => s.id === 'surge_2050');
    const y0 = sheet(d0).y;
    await page.locator('[data-citylab-sea-set="conservative"]').click();
    // It moves through the heights between, not in one jump.
    await page.waitForFunction((y) => { const s = (window as any).__city().sheets.find((x: any) => x.id === 'surge_2050');
      return s.to > y + 1e-6 && s.y > y + 1e-6 && s.y < s.to - 1e-6; }, y0, { polling: 'raf', timeout: 5000 });
    await page.waitForFunction(() => !(window as any).__city().sheetEasing, null, { timeout: 5000 });
    const d1 = (await city(page))!;
    expect(sheet(d1).y).toBeCloseTo(sheet(d1).to, 9);
    expect(d1.sheetEaseFrames, 'the ease ran over several frames').toBeGreaterThan(2);
    expect(d1.sheetSnapped).toBe(false);
    // Reduced motion: the next change lands at once, with no easing frames.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !(window as any).__city().motion, null, { timeout: 5000 });
    await page.waitForTimeout(300);
    const r0 = await page.evaluate(() => (window as any).__raf);
    await page.locator('[data-citylab-sea-set="optimistic"]').click();
    await page.waitForFunction((to) => { const s = (window as any).__city().sheets.find((x: any) => x.id === 'surge_2050');
      return s.to < to - 1e-6; }, sheet(d1).to, { timeout: 5000 });
    const d2 = (await city(page))!;
    expect(sheet(d2).y, 'the sheet did not snap to its new height').toBeCloseTo(sheet(d2).to, 9);
    expect(d2.sheetSnapped).toBe(true);
    expect(d2.sheetEaseFrames).toBe(0);
    expect(d2.sheetEasing).toBe(false);
    await page.waitForTimeout(800);
    expect(await page.evaluate(() => (window as any).__raf) - r0, 'frames kept being requested under reduced motion').toBeLessThanOrEqual(3);
  });

  for (const theme of ['light', 'dark', 'contrast'] as Theme[]) {
    test(`axe finds nothing on the board, the lens bar and each lens key (${theme})`, async ({ page }) => {
      await mount3d(page, theme, { plan: plain(P.basePlan('harborlight')) });
      const all: string[] = [];
      for (const lens of LENSES) {
        await lensOn(page, lens);
        const v = await axeOn(page, [['[data-citylab-board3d]'], ['[data-citylab-view-controls]'], ['[data-citylab-motion]']]);
        v.forEach((x: any) => all.push(`  [${lens}] ${x.rule}: ${x.why}\n    ${x.html}`));
      }
      expect(all, `${theme}: ${all.length} violation(s)\n${all.join('\n')}`).toEqual([]);
    });
  }

  test('reflows at 320 px: the lens bar, the gauge, the sea-level buttons and the map palette', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await harness.mount(page, { _cityLab: { boardView: 'model', lens: 'rain', coachOff: true, plan: plain(P.basePlan('harborlight')) } });
    await page.addStyleTag({ content: '#wrap{width:auto !important;max-width:100% !important}' });
    await setTheme(page, 'light');
    await page.evaluate(() => document.getElementById('citylab-stage')!.scrollIntoView({ block: 'start' }));
    await page.waitForFunction(() => (window as any).__cityReady(), null, { timeout: 30000 });
    await page.waitForTimeout(500);
    const measure = () => page.evaluate(() => {
      const right = (sel: string) => { const n = document.querySelector(sel); return n ? Math.round(n.getBoundingClientRect().right) : 0; };
      return { scrollW: document.documentElement.scrollWidth, bar: right('[data-citylab-lens-bar]'), gauge: right('[data-citylab-outlet-gauge="legend"]'),
        sets: right('[data-citylab-sea-sets]'), palette: right('[data-citylab-map-palette]'),
        small: [...document.querySelectorAll('[data-citylab-lens], [data-citylab-board-mode], [data-citylab-sea-set], [data-citylab-motion-switch]')]
          .map((b) => { const r = b.getBoundingClientRect(); return { t: (b.textContent || '').trim(), w: Math.round(r.width), h: Math.round(r.height) }; })
          .filter((r) => r.w < 44 || r.h < 44) };
    });
    const rain = await measure();
    expect(rain.scrollW, 'page scrolls sideways at 320 px (rain)').toBeLessThanOrEqual(320);
    expect(rain.bar).toBeLessThanOrEqual(320);
    expect(rain.gauge).toBeLessThanOrEqual(320);
    expect(rain.small).toEqual([]);
    await page.locator('[data-citylab-lens="flood"]').click();
    await page.waitForTimeout(400);
    const flood = await measure();
    expect(flood.scrollW, 'page scrolls sideways at 320 px (flood)').toBeLessThanOrEqual(320);
    expect(flood.sets).toBeLessThanOrEqual(320);
    await page.locator('[data-citylab-board-mode="map"]').click();
    await page.waitForTimeout(400);
    const map = await measure();
    expect(map.scrollW, 'page scrolls sideways at 320 px (map)').toBeLessThanOrEqual(320);
    expect(map.palette).toBeLessThanOrEqual(320);
  });

  test('on the map, the real keyboard builds with the palette: Enter runs the tool once, Space too', async ({ page }) => {
    await harness.mount(page, { _cityLab: { boardView: 'use', coachOff: true } }, undefined, { expectCanvas: false });
    await setTheme(page, 'light');
    // A toggling tool, so a second run (the key AND the button's own click)
    // would undo the first: cool roofs on homes.
    await page.locator('[data-citylab-map-palette] [data-citylab-tool="cool"]').click();
    await page.locator('#citylab-parcel-B6').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    let p = await page.evaluate(() => (window as any).__toolData._cityLab.plan);
    expect(p.coolRoofs && p.coolRoofs.B6, 'Enter ran the tool twice (the key and the button click)').toBe(true);
    expect(p.editCount).toBe(1);
    await page.locator('[data-citylab-map-palette] [data-citylab-tool="park"]').click();
    await page.locator('#citylab-parcel-A9').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    p = await page.evaluate(() => (window as any).__toolData._cityLab.plan);
    expect(p.uses.A9).toBe('park');
    expect(p.editCount).toBe(2);
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('#citylab-parcel-A8')).toBeFocused();
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    p = await page.evaluate(() => (window as any).__toolData._cityLab.plan);
    expect(p.uses.A8).toBe('park');
    expect(p.editCount).toBe(3);
    await expect(page.locator('[data-citylab-stage-note]')).toHaveText('A8 set to Park / open space.');
  });
});
