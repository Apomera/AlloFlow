import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import * as vm from 'node:vm';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

/**
 * City Lab 3D, wave 5 (2026-11-04): missions and feedback, against real WebGL.
 *
 * jsdom (tests/citylab_3d_w5.test.js) proves the strip judges as the Missions
 * box does, that nothing celebrates before Check, for a pass under the
 * student's set alone, for an imported plan, after a reveal or on a
 * prediction, that the Suggested lens never switches by itself, that sound is
 * off by default and closed on unmount, and that the model's frames mark only
 * what a row counts. This spec proves what only a browser can: a Check that
 * passes sets real fireworks going over the town (frames drawn, inside the
 * draw budget) that end on their own; reduced motion mid-show clears the sky
 * on the next frame, leaves a still banner and stops asking for frames; axe
 * finds nothing on the strip open, collapsed and celebrating in light, dark
 * and contrast; 320 px reflow; and no GL context or AudioContext outlives it.
 *
 * Run alone: one Playwright suite at a time on this machine, 0 retries.
 */
const DRAW_BUDGET = 25;

function pureSeam(): any {
  const sb: any = {};
  sb.window = sb;
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_citylab.js', 'utf8'), sb);
  return sb.__alloCityLabPure;
}
const P = pureSeam();
const plain = (o: any) => JSON.parse(JSON.stringify(o));
function parkPlan() {
  const ex = P.parkExample('riverbend');
  let p = P.basePlan('riverbend');
  for (const s of ex.steps) { p = P.setUse(p, s.id, 'park'); if (s.via) p = P.setEdge(p, s.id, s.via, 'path'); }
  return plain(p);
}
function bondTrapPlan() {
  const homes: string[] = [];
  ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
  let p = homes.reduce((a: any, id: string) => P.toggleGreenInfra(P.setUse(a, id, 'mixed'), id), P.basePlan('riverbend'));
  const pairs: string[][] = [['C8', 'C9'], ['C9', 'C10'], ['C10', 'C11'], ['C11', 'C12']];
  [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r]));
  p = pairs.reduce((a: any, e) => P.setEdge(a, e[0], e[1], 'local'), p);
  const bond = P.missionTargets('riverbend').bond;
  for (const id of P.allParcelIds()) {
    if (P.scorecard(p, 'central').tier2.capitalCost > bond) break;
    if (p.uses[id] === 'field') p = P.setUse(p, id, 'civic');
  }
  return plain(Object.assign(P.clonePlan(p), { assumptionSetId: 'optimistic' }));
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
    // Every AudioContext the page makes, so a test can see it closed.
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
// Press Check with the real mouse while the stage stays on screen (the host
// draws nothing off screen), keeping the strip and the town both in view.
async function pressCheck(page: Page) {
  const btn = page.locator('[data-citylab-strip-check]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.evaluate(() => document.getElementById('citylab-stage')!.scrollIntoView({ block: 'center' }));
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

test.describe('City Lab 3D W5 - missions and feedback, real WebGL', () => {
  test.afterEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: null });
    await harness.destroy(page);
  });

  test('a Check that passes sets fireworks going over the town, inside the draw budget, and they end on their own', async ({ page }) => {
    await mount3d(page, 'light', { plan: parkPlan() });
    const d0 = (await city(page))!;
    expect(d0.motion, 'a capable device should animate').toBe(true);
    expect(d0.fw.seen, 'no celebration before Check').toBe(null);
    expect(d0.markN, 'the park mission frames the homes it already counts').toBeGreaterThan(0);
    await pressCheck(page);
    await page.waitForFunction(() => { const f = (window as any).__city().fw; return f.playing && f.visible && f.frames > 3; },
      null, { polling: 'raf', timeout: 8000 });
    const mid = (await city(page))!;
    expect(mid.calls, 'draw calls during the show').toBeLessThanOrEqual(DRAW_BUDGET);
    await expect(page.locator('[data-citylab-celebrate]')).toHaveAttribute('data-citylab-celebrate', 'fireworks');
    await expect(page.locator('[data-citylab-celebrate]')).toContainText('Fireworks over the town');
    const px = await harness.glPixels(page);
    expect(looksBlank(px!), 'the canvas went blank during the show').toBe(false);
    await page.waitForFunction(() => (window as any).__city().fw.done === 1, null, { timeout: 8000 });
    const end = (await city(page))!;
    expect(end.fw.playing).toBe(false);
    expect(end.fw.visible).toBe(false);
    expect(end.fw.frames, 'the show ran over many frames').toBeGreaterThan(10);
    // The show is one batch: drawn while it runs, gone from the frame after.
    // (The town's people keep walking for the usual idle window; that is W2's
    // motion, measured flat by its own spec.)
    expect(mid.calls, 'the fireworks batch was drawn').toBeGreaterThan(d0.calls);
    await page.waitForTimeout(300);
    expect((await city(page))!.calls, 'the fireworks batch is still drawn after the show').toBe(d0.calls);
  });

  test('reduced motion mid-show clears the sky on the next frame, leaves a still banner and stops asking for frames', async ({ page }) => {
    await mount3d(page, 'light', { plan: parkPlan() });
    await pressCheck(page);
    await page.waitForFunction(() => { const f = (window as any).__city().fw; return f.playing && f.frames > 3; },
      null, { polling: 'raf', timeout: 8000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !(window as any).__city().fw.playing, null, { timeout: 5000 });
    const d = (await city(page))!;
    expect(d.fw.stopped, 'the show was cut short, not left to finish').toBe(1);
    expect(d.fw.visible).toBe(false);
    await expect(page.locator('[data-citylab-celebrate]')).toHaveAttribute('data-citylab-celebrate', 'banner');
    await expect(page.locator('[data-citylab-celebrate]')).not.toContainText('Fireworks');
    await expect(page.locator('[data-citylab-celebrate]')).toContainText('Mission complete: Fix park access');
    await page.waitForTimeout(300);
    const r0 = await page.evaluate(() => (window as any).__raf);
    await page.waitForTimeout(1000);
    expect(await page.evaluate(() => (window as any).__raf) - r0, 'frames kept being requested under reduced motion').toBeLessThanOrEqual(3);
  });

  test('a pass under the student\'s set alone sets nothing off', async ({ page }) => {
    await mount3d(page, 'light', { plan: bondTrapPlan(), missionsDone: { 'riverbend:m_park': true } });
    await pressCheck(page);
    await page.waitForTimeout(1200);
    const d = (await city(page))!;
    expect(d.fw.seen).toBe(null);
    expect(d.fw.frames).toBe(0);
    await expect(page.locator('[data-citylab-celebrate]')).toHaveCount(0);
    await expect(page.locator('[data-citylab-strip-result]')).toHaveAttribute('data-citylab-strip-result', 'standard_only');
  });

  for (const theme of ['light', 'dark', 'contrast'] as Theme[]) {
    test(`axe finds nothing on the strip open, collapsed, celebrating and falling short (${theme})`, async ({ page }) => {
      const all: string[] = [];
      const run = async (label: string) => {
        const v = await axeOn(page, [['[data-citylab-strip]'], ['[data-citylab-board3d]']]);
        v.forEach((x: any) => all.push(`  [${label}] ${x.rule}: ${x.why}\n    ${x.html}`));
      };
      await mount3d(page, theme, { plan: bondTrapPlan(), missionsDone: { 'riverbend:m_park': true } });
      await run('open');
      await pressCheck(page);
      await page.locator('[data-citylab-strip-readout]').click();
      await page.waitForTimeout(300);
      await run('short + readout');
      await page.locator('#citylab-strip-toggle').click();
      await page.waitForTimeout(300);
      await run('collapsed');
      await harness.destroy(page);
      await mount3d(page, theme, { plan: parkPlan() });
      await pressCheck(page);
      await page.waitForTimeout(400);
      await run('celebrating');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(400);
      await run('banner');
      expect(all, `${theme}: ${all.length} violation(s)\n${all.join('\n')}`).toEqual([]);
    });
  }

  test('reflows at 320 px with the strip open, its readout open and the banner showing, all targets 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await harness.mount(page, { _cityLab: { boardView: 'model', coachOff: true, plan: westHomes(), missionsDone: { 'riverbend:m_park': true } } });
    await page.addStyleTag({ content: '#wrap{width:auto !important;max-width:100% !important}' });
    await setTheme(page, 'light');
    await page.locator('[data-citylab-strip-readout]').click();
    await page.waitForTimeout(300);
    const measure = () => page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      strip: Math.round(document.querySelector('[data-citylab-strip]')!.getBoundingClientRect().right),
      small: [...document.querySelectorAll('[data-citylab-strip] button')]
        .map((b) => { const r = b.getBoundingClientRect(); return { t: (b.textContent || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter((r) => r.w < 44 || r.h < 44),
    }));
    const open = await measure();
    expect(open.scrollW, 'page scrolls sideways at 320 px').toBeLessThanOrEqual(320);
    expect(open.strip).toBeLessThanOrEqual(320);
    expect(open.small).toEqual([]);
    await page.locator('[data-citylab-strip-check]').click();
    await page.waitForTimeout(400);
    const after = await measure();
    expect(after.scrollW).toBeLessThanOrEqual(320);
    expect(after.small).toEqual([]);
  });

  test('nothing outlives it: no GL context and no AudioContext after unmount, with Sounds on and a show running', async ({ page }) => {
    await mount3d(page, 'light', { plan: parkPlan() });
    await page.locator('#citylab-options-toggle').click();
    await page.locator('#citylab-options button', { hasText: 'Sounds' }).click();
    expect(await page.evaluate(() => (window as any).__acs.length), 'Sounds on makes one context on that press').toBe(1);
    await pressCheck(page);
    await page.waitForFunction(() => (window as any).__city().fw.playing, null, { polling: 'raf', timeout: 8000 });
    await harness.unmount(page);
    const leaked = await harness.leakedAfterUnmount(page);
    expect(leaked).toEqual([]);
    await page.waitForFunction(() => (window as any).__acs.every((a: any) => a.state === 'closed'), null, { timeout: 5000 });
    expect(await page.evaluate(() => (window as any).__acs.length)).toBe(1);
  });
});

function westHomes() {
  const homes: string[] = [];
  ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
  let p = homes.reduce((a: any, id: string) => P.toggleGreenInfra(P.setUse(a, id, 'mixed'), id), P.basePlan('riverbend'));
  const pairs: string[][] = [['C8', 'C9'], ['C9', 'C10'], ['C10', 'C11'], ['C11', 'C12']];
  [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r]));
  return plain(pairs.reduce((a: any, e) => P.setEdge(a, e[0], e[1], 'local'), p));
}
