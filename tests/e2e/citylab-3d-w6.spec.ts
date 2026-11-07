import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import * as vm from 'node:vm';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';
import { readPng } from './helpers/png_pixels';

/**
 * City Lab 3D, wave 6 (2026-11-04): hardening, against real WebGL.
 *
 * jsdom (tests/citylab_3d_w6.test.js) proves the full-brief strip judges as
 * briefJudged does and celebrates only through Check, that the dark and
 * contrast palettes map every lens class, that the contrast scene has a code
 * on every parcel, the layout order, and the HUD's Tab and Escape. This spec
 * proves what only a browser can: where the board actually starts (first
 * visit and returning, 1280 and 390 px), the draw-call budget in every lens
 * with the strip, the HUD and fireworks on a fully built plan, axe in the
 * three themes with and without the HUD, that the contrast scene really is
 * black, white and strong edges in its pixels, 320 px reflow, and that no GL
 * context or AudioContext outlives the tool.
 *
 * Run alone: one Playwright suite at a time on this machine, 0 retries.
 */
const DRAW_BUDGET = 25;
// Board-top targets (lead, W6), measured from the top of the tool card (the
// probe's card has a 12 px padding, so the harness is normalised to it).
const TOP_FIRST_1280 = 560, TOP_FIRST_390 = 520, TOP_RETURNING_1280 = 700;

function pureSeam(): any {
  const sb: any = {};
  sb.window = sb;
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_citylab.js', 'utf8'), sb);
  return sb.__alloCityLabPure;
}
const P = pureSeam();
const plain = (o: any) => JSON.parse(JSON.stringify(o));
const LENSES = ['use', 'elevation', 'heat', 'park', 'transit', 'rain', 'flood', 'access'];
function westHomes() {
  const homes: string[] = [];
  ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
  let p = homes.reduce((a: any, id: string) => P.toggleGreenInfra(P.setUse(a, id, 'mixed'), id), P.basePlan('riverbend'));
  const pairs: string[][] = [['C8', 'C9'], ['C9', 'C10'], ['C10', 'C11'], ['C11', 'C12']];
  [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r]));
  return plain(pairs.reduce((a: any, e) => P.setEdge(a, e[0], e[1], 'local'), p));
}
// Every parcel built, every road and path, four stops, and Mission 1 met, so
// the fireworks can play over the fullest town the model can draw.
function fullPassPlan() {
  let p = P.basePlan('riverbend');
  const cycle = ['housing_low', 'park', 'housing_mid', 'mixed', 'park', 'commercial', 'civic', 'park', 'industry', 'preserve', 'farm'];
  P.allParcelIds().forEach((id: string) => { if (p.uses[id] !== 'water') p = P.setUse(p, id, cycle[(P.parcelCol(id) + P.parcelRow(id)) % cycle.length]); });
  for (let r = 1; r <= P.N_ROWS; r++) for (let c = 0; c < P.N_COLS - 1; c++) { const a = P.pid(c, r), b = P.pid(c + 1, r); if (!p.edges[P.edgeKey(a, b)]) p = P.setEdge(p, a, b, 'local'); }
  for (let r = 1; r < P.N_ROWS; r++) { const a = P.pid(0, r), b = P.pid(0, r + 1); if (!p.edges[P.edgeKey(a, b)]) p = P.setEdge(p, a, b, 'local'); }
  for (let c = 0; c < P.N_COLS; c++) for (let r = 1; r < P.N_ROWS; r++) { const a = P.pid(c, r), b = P.pid(c, r + 1); if (!p.edges[P.edgeKey(a, b)]) p = P.setEdge(p, a, b, 'path'); }
  ['C3', 'F6', 'J9', 'D10'].forEach((id) => { p = P.toggleTransit(p, id); });
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
    window.__acs = [];
    (function () {
      var AC = window.AudioContext;
      if (!AC) return;
      function Wrapped() { var a = new AC(); window.__acs.push(a); return a; }
      Wrapped.prototype = AC.prototype;
      window.AudioContext = Wrapped;
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
  await harness.mount(page, { _cityLab: Object.assign({ boardView: 'model', coachOff: true }, extra) });
  await setTheme(page, theme);
  await page.evaluate(() => document.getElementById('citylab-stage')!.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => (window as any).__cityReady(), null, { timeout: 30000 });
  await page.waitForTimeout(500);
}
const city = (page: Page) => page.evaluate(() => {
  const d = (window as any).__city();
  if (!d) return null;
  const { project, pick, ...rest } = d;
  return rest;
});
async function boardTop(page: Page) {
  return page.evaluate(() => {
    const wrap = document.getElementById('wrap')!;
    const stage = document.getElementById('citylab-stage');
    const map = document.querySelector('[id^="citylab-parcel-"]');
    const board = stage && stage.getBoundingClientRect().width ? stage : map!;
    // From the top of the tool card, with the card's own 12 px padding.
    return { board: board === stage ? '3d' : 'map', top: Math.round(board.getBoundingClientRect().top - wrap.getBoundingClientRect().top) };
  });
}
async function lensOn(page: Page, id: string, hud: boolean) {
  const sel = hud ? `[data-citylab-hud-lens] [data-citylab-lens="${id}"]` : `[data-citylab-lens-bar] [data-citylab-lens="${id}"]`;
  const b0 = (await city(page))!.builds;
  const on = await page.locator(sel).getAttribute('aria-pressed');
  if (on !== 'true') {
    await page.locator(sel).click();
    await page.waitForFunction((b) => (window as any).__city().builds > b, b0, { timeout: 15000 });
  }
  if (!hud) await page.evaluate(() => document.getElementById('citylab-stage')!.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(700);
}
async function enterHud(page: Page) {
  const more = page.locator('[data-citylab-cam-more]');
  if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click();
  await page.locator('#citylab-fs-toggle').click();
  await page.waitForFunction(() => !!document.querySelector('[data-citylab-hud="on"]'), null, { timeout: 8000 }).catch(async (e) => {
    const st = await page.evaluate(() => ({ real: !!document.fullscreenElement, attr: !!document.querySelector('[data-allo-fullscreen-active]'),
      hud: (document.querySelector('[data-citylab-hud]') || { getAttribute: () => 'none' }).getAttribute('data-citylab-hud'), active: (document.activeElement || {} as any).id }));
    throw new Error('HUD did not open: ' + JSON.stringify(st) + ' ' + e);
  });
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
// What a canvas's pixels are made of: the share of mid greys (low saturation,
// neither near black nor near white) and of strong edges (neighbours at 4.5:1).
function pixelMix(png: Buffer) {
  const p = readPng(png);
  const lum = (c: number[]) => { const f = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  let n = 0, grey = 0, pairs = 0, edges = 0;
  for (let y = 0; y < p.height; y += 2) {
    for (let x = 0; x < p.width - 2; x += 2) {
      const a = p.at(x, y), b = p.at(x + 2, y);
      if (a[0] === 255 && a[1] === 0 && a[2] === 255) continue;          // the harness's magenta backdrop
      n++;
      const la = lum(a), sp = Math.max(...a) - Math.min(...a);
      if (sp < 40 && la > 0.05 && la < 0.6) grey++;
      const lb = lum(b);
      pairs++;
      if ((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05) >= 4.5) edges++;
    }
  }
  return { greyShare: grey / Math.max(1, n), edgeShare: edges / Math.max(1, pairs) };
}

test.describe('City Lab 3D W6 - hardening, real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: null });
    await harness.destroy(page);
  });

  test('the board starts high: first visit at 1280 and 390 px, and a returning student with the strip open at 1280', async ({ page }) => {
    // A first visit has nothing saved on this device (a saved plan opens as someone else's).
    const clearStore = () => page.evaluate(() => { try { window.localStorage.clear(); } catch (e) { /* about:blank */ } });
    await clearStore();
    await harness.mount(page, {});
    await setTheme(page, 'light');
    const first1280 = await boardTop(page);
    expect(first1280.board).toBe('3d');
    expect(first1280.top, `first visit 1280: board top ${first1280.top}`).toBeLessThanOrEqual(TOP_FIRST_1280);
    await harness.destroy(page);

    await harness.mount(page, { _cityLab: { coachOff: true, plan: westHomes() } });
    await setTheme(page, 'light');
    const ret = await boardTop(page);
    expect(await page.locator('[data-citylab-strip]').getAttribute('data-citylab-strip')).toBe('open');
    expect(ret.top, `returning 1280 with the strip open: board top ${ret.top}`).toBeLessThanOrEqual(TOP_RETURNING_1280);
    await harness.destroy(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await clearStore();
    await harness.mount(page, {}, undefined, { expectCanvas: false });
    expect(await page.locator('[data-citylab-coach]').count(), 'a first visit').toBe(1);
    await page.addStyleTag({ content: '#wrap{width:auto !important;max-width:100% !important}' });
    await setTheme(page, 'light');
    const first390 = await boardTop(page);
    expect(first390.board).toBe('map');
    expect(first390.top, `first visit 390: board top ${first390.top}`).toBeLessThanOrEqual(TOP_FIRST_390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    // Nothing removed: the coach, the strip's button, Start here and every tab are still there.
    await expect(page.locator('[data-citylab-coach]')).toHaveCount(1);
    await expect(page.locator('[data-citylab-strip-slot="coach"] #citylab-strip-toggle')).toHaveCount(1);
    await expect(page.locator('#citylab-path-toggle')).toHaveCount(1);
    await expect(page.locator('[role="tab"]')).toHaveCount(8);
    console.log('[W6 board top]', JSON.stringify({ first1280, ret, first390 }));
  });

  for (const theme of ['light', 'contrast'] as Theme[]) {
    test(`a fully built plan stays under ${DRAW_BUDGET} draw calls in every lens, with the strip, the HUD and fireworks (${theme})`, async ({ page }) => {
      // Animation off while the lenses are switched (720 walking figures on swiftshader trip the
      // frame watchdog, which would then stop the show), on again just before Check.
      await mount3d(page, theme, { plan: fullPassPlan(), motionOff: true });
      const calls: Record<string, number> = {};
      for (const lens of LENSES) {
        await lensOn(page, lens, false);
        calls[lens] = (await city(page))!.calls;
      }
      await enterHud(page);
      for (const lens of LENSES) {
        await lensOn(page, lens, true);
        calls['hud_' + lens] = (await city(page))!.calls;
      }
      await lensOn(page, 'use', true);
      const before = (await city(page))!;
      if (theme === 'contrast') {
        expect(before.codes, 'one code label per parcel').toBe(P.allParcelIds().length);
        expect(before.codeBatch, 'the codes are one instanced batch').toBe(true);
      } else {
        expect(before.codes).toBe(0);
      }
      await page.evaluate(() => (document.querySelector('[data-citylab-motion-switch]') as HTMLElement).click());
      await page.waitForFunction(() => (window as any).__city().motion === true, null, { timeout: 5000 });
      const pre = (await city(page))!;
      console.log('[W6 before Check]', JSON.stringify({ motion: pre.motion, slow: pre.slow, static: pre.static }));
      await page.locator('[data-citylab-hud-strip] button', { hasText: 'Check my plan' }).click();
      await page.waitForFunction(() => { const f = (window as any).__city().fw; return f.playing && f.visible && f.frames > 3; },
        null, { polling: 'raf', timeout: 8000 });
      let peak = 0;
      for (let i = 0; i < 10; i++) { peak = Math.max(peak, (await city(page))!.calls || 0); await page.waitForTimeout(100); }
      calls.hud_fireworks = peak;
      console.log(`[W6 draw calls ${theme}]`, JSON.stringify(calls));
      Object.keys(calls).forEach((k) => expect(calls[k], k).toBeLessThanOrEqual(DRAW_BUDGET));
      expect(peak, 'the fireworks batch was drawn').toBeGreaterThan(before.calls);
      expect((await city(page))!.fw.scale, 'the bursts are larger than W5\'s').toBeGreaterThanOrEqual(1.3);
      const px = await harness.glPixels(page);
      expect(looksBlank(px!)).toBe(false);
    });
  }

  test('contrast pixels are black, white and strong edges, where the dark scene is mid greys', async ({ page }) => {
    const mix: Record<string, { greyShare: number; edgeShare: number }> = {};
    for (const theme of ['dark', 'contrast'] as Theme[]) {
      await mount3d(page, theme, { plan: westHomes(), motionOff: true });
      const px = await harness.glPixels(page);
      expect(looksBlank(px!)).toBe(false);
      mix[theme] = pixelMix(px!.png);
      await harness.destroy(page);
    }
    console.log('[W6 pixel mix]', JSON.stringify(mix));
    // Mid greys are only the antialiased rims of edges; strong (4.5:1) edges are many times the dark scene's.
    expect(mix.contrast.greyShare, 'contrast scene is not mid greys').toBeLessThan(0.08);
    expect(mix.contrast.edgeShare, 'contrast scene has many more strong edges than the dark one').toBeGreaterThan(5 * mix.dark.edgeShare);
    expect(mix.contrast.edgeShare).toBeGreaterThan(0.02);
  });

  for (const theme of ['light', 'dark', 'contrast'] as Theme[]) {
    test(`axe finds nothing on the board, the strip and the full-brief strip, then in the fullscreen HUD (${theme})`, async ({ page }) => {
      const all: string[] = [];
      const run = async (label: string, inc: string[][]) => {
        const v = await axeOn(page, inc);
        v.forEach((x: any) => all.push(`  [${label}] ${x.rule}: ${x.why}\n    ${x.html}`));
      };
      await mount3d(page, theme, { plan: westHomes(), lens: 'rain' });
      await run('normal', [['[data-citylab-title-row]'], ['[data-citylab-strip]'], ['[data-citylab-board3d]']]);
      await enterHud(page);
      await run('hud', [['[data-citylab-hud="on"]']]);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.querySelector('[data-citylab-hud]')!.getAttribute('data-citylab-hud') === 'off', null, { timeout: 5000 });
      await harness.destroy(page);
      // The 9-12 default: the full-brief strip, checked and short.
      await harness.mount(page, { _cityLab: { boardView: 'model', coachOff: true, plan: westHomes() } });
      await page.evaluate(() => { const w = window as any; w.__ctx.gradeBand = 'g912'; w.__rerender(); });
      await setTheme(page, theme);
      await page.locator('[data-citylab-strip-check="brief"]').click();
      await page.locator('[data-citylab-strip-row="req_cost"] [data-citylab-strip-readout]').click();
      await page.waitForTimeout(300);
      await run('brief', [['[data-citylab-strip]']]);
      expect(all, `${theme}: ${all.length} violation(s)\n${all.join('\n')}`).toEqual([]);
    });
  }

  test('full screen: focus goes to the model, Tab stays on screen, Escape leaves and focus returns; 320 px reflows with 44 px targets', async ({ page }) => {
    await mount3d(page, 'light', { plan: westHomes() });
    await enterHud(page);
    expect(await page.evaluate(() => document.activeElement!.id)).toBe('citylab-stage');
    // Walk forward through every stop; focus never leaves the HUD's stage column.
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const fs = document.querySelector('[data-citylab-hud="on"]');
        return !!(fs && fs.contains(document.activeElement));
      });
      expect(inside, `Tab ${i + 1} left the full-screen view`).toBe(true);
      seen.add(await page.evaluate(() => (document.activeElement as HTMLElement).outerHTML.slice(0, 60)));
    }
    expect(seen.size).toBeGreaterThan(5);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('[data-citylab-hud]')!.getAttribute('data-citylab-hud') === 'off', null, { timeout: 5000 });
    expect(await page.evaluate(() => document.activeElement!.id)).toBe('citylab-fs-toggle');
    expect(await page.evaluate(() => !document.fullscreenElement && !document.querySelector('[data-allo-fullscreen-active]'))).toBe(true);
    await harness.destroy(page);

    await page.setViewportSize({ width: 320, height: 800 });
    await harness.mount(page, { _cityLab: { boardView: 'model', coachOff: true, plan: westHomes() } });
    await page.addStyleTag({ content: '#wrap{width:auto !important;max-width:100% !important}' });
    await setTheme(page, 'light');
    const measure = () => page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      small: [...document.querySelectorAll('[data-citylab-strip] button, [data-citylab-title-row] button, [role="tablist"] button, [data-citylab-hud="on"] button')]
        .map((b) => { const r = b.getBoundingClientRect(); return { t: (b.textContent || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter((r) => r.w > 0 && (r.w < 44 || r.h < 44)),
    }));
    const flat = await measure();
    expect(flat.scrollW, 'page scrolls sideways at 320 px').toBeLessThanOrEqual(320);
    expect(flat.small).toEqual([]);
    await enterHud(page);
    const hud = await measure();
    expect(hud.scrollW).toBeLessThanOrEqual(320);
    expect(hud.small).toEqual([]);
  });

  test('nothing outlives it: no GL context and no AudioContext after unmount, in contrast, full screen, with Sounds on and a show running', async ({ page }) => {
    await mount3d(page, 'contrast', { plan: fullPassPlan() });
    await page.locator('#citylab-options-toggle').click();
    await page.locator('#citylab-options button', { hasText: 'Sounds' }).click();
    expect(await page.evaluate(() => (window as any).__acs.length)).toBe(1);
    await enterHud(page);
    await page.locator('[data-citylab-hud-strip] button', { hasText: 'Check my plan' }).click();
    await page.waitForFunction(() => (window as any).__city().fw.playing, null, { polling: 'raf', timeout: 8000 });
    await harness.unmount(page);
    const leaked = await harness.leakedAfterUnmount(page);
    expect(leaked).toEqual([]);
    await page.waitForFunction(() => (window as any).__acs.every((a: any) => a.state === 'closed'), null, { timeout: 5000 });
    // The full-screen lock on the page is released with it.
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  });
});
