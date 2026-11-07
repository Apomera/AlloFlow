import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import * as vm from 'node:vm';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

/**
 * City Lab 3D, wave 7 (2026-11-04), against real WebGL and the real host
 * full-screen helper.
 *
 * jsdom (tests/citylab_3d_w7.test.js) pins the logic. This spec proves, in
 * Chromium with real keys: in full screen the HUD's parcel buttons move the
 * selection marker on the model, Enter and Space on the focused model use the
 * chosen tool on it (the scene rebuilds with the change, focus stays on the
 * model, full screen holds), roads take two presses, and the axe scan of the
 * HUD with its parcel row is clean; and only the first passing brief Check
 * sets off fireworks (and pays the brief's XP once).
 *
 * CITYLAB_FILE=<path> serves another copy of the tool (the wave's start copy)
 * to show the tests fail on the old behaviour. Run alone, 0 retries.
 */
function pureSeam(): any {
  const sb: any = {};
  sb.window = sb;
  vm.runInNewContext(readFileSync('stem_lab/stem_tool_citylab.js', 'utf8'), sb);
  return sb.__alloCityLabPure;
}
const P = pureSeam();
const plain = (o: any) => JSON.parse(JSON.stringify(o));
function briefPlan() {
  const useAll = (p: any, ids: string[], u: string) => ids.reduce((a: any, id: string) => P.setUse(a, id, u), p);
  const homes: string[] = [];
  ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
  ['A', 'B', 'C'].forEach((c) => [1, 2].forEach((r) => homes.push(c + r)));
  homes.push('A3', 'B3');
  let p = useAll(P.basePlan('riverbend'), homes, 'mixed');
  p = homes.reduce((a: any, id: string) => P.toggleGreenInfra(a, id), p);
  p = useAll(p, ['D10', 'D2', 'D12'], 'park');
  const pairs: string[][] = [];
  for (let r = 8; r <= 11; r++) pairs.push(['C' + r, 'C' + (r + 1)]);
  [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]));
  for (let r = 2; r <= 5; r++) pairs.push(['C' + r, 'C' + (r - 1)]);
  [1, 2, 3].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r], ['C' + r, 'D' + r]));
  pairs.push(['D2', 'D1']);
  return plain(pairs.reduce((a: any, e) => P.setEdge(a, e[0], e[1], 'local'), p));
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
  `,
});

test.describe.configure({ timeout: 150_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

async function mount3d(page: Page, extra: Record<string, unknown> = {}) {
  await harness.mount(page, { _cityLab: Object.assign({ boardView: 'model', coachOff: true }, extra) });
  await page.evaluate(() => {
    const w = window as any;
    w.__xp = [];
    w.__ctx.awardXP = function (id: string, n: number, why: string) { w.__xp.push([id, n, why]); };
    const wrap = document.getElementById('wrap')!;
    wrap.setAttribute('data-stem-tool-shell', 'true');
    wrap.style.background = '#fff';
    w.__rerender();
  });
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
async function enterHud(page: Page) {
  const more = page.locator('[data-citylab-cam-more]');
  if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click();
  await page.locator('#citylab-fs-toggle').click();
  await page.waitForFunction(() => !!document.querySelector('[data-citylab-hud="on"]'), null, { timeout: 8000 });
  await page.waitForTimeout(700);
}
// The model only draws while it is on screen: Check sits above it, so look back down.
async function pressCheck(page: Page) {
  const btn = page.locator('[data-citylab-strip-check="brief"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await page.evaluate(() => document.getElementById('citylab-stage')!.scrollIntoView({ block: 'center' }));
}
const inFs = (page: Page) => page.evaluate(() => !!(document.fullscreenElement || document.querySelector('[data-allo-fullscreen-active]')));
const useOf = (page: Page, id: string) => page.evaluate((pid) => document.getElementById('citylab-parcel-' + pid)!.getAttribute('aria-label'), id);

test.describe('City Lab 3D W7 - real WebGL and the real full-screen helper', () => {
  test.beforeEach(async ({ page }) => {
    const alt = process.env.CITYLAB_FILE;
    if (alt) await page.route('**/stem_lab/stem_tool_citylab.js', (r) => r.fulfill({ body: readFileSync(alt, 'utf8'), contentType: 'application/javascript' }));
  });
  test.afterEach(async ({ page }) => {
    await harness.destroy(page);
  });

  test('full screen: the parcel buttons move the marker, Enter and Space on the model apply the tool, roads take two presses', async ({ page }) => {
    await mount3d(page);
    await enterHud(page);
    expect(await inFs(page), 'full screen did not start').toBe(true);
    const d0 = (await city(page))!;
    const start = d0.selectedId as string;
    // The nearest field to the right that a road enters.
    const base = P.basePlan('riverbend'), served = P.servedParcels(base), cols = 'ABCDEFGHIJKL';
    let steps = 0, target = '';
    for (let i = cols.indexOf(start[0]) + 1; i < cols.length; i++) {
      const id = cols[i] + start.slice(1);
      if (base.uses[id] === 'field' && served[id]) { target = id; steps = i - cols.indexOf(start[0]); break; }
    }
    expect(target).not.toBe('');
    await page.locator('[data-citylab-hud-part="top"] [data-citylab-tool="park"]').click();
    for (let i = 0; i < steps; i++) await page.locator('[data-citylab-hud-pick="right"]').click();
    await page.waitForFunction((id) => (window as any).__city().selectedId === id, target, { timeout: 5000 });
    const builds0 = (await city(page))!.builds;
    await page.locator('#citylab-stage').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction((b) => (window as any).__city().builds > b, builds0, { timeout: 8000 });
    expect(await useOf(page, target)).toContain('Park');
    expect(await page.evaluate(() => document.activeElement!.id), 'focus left the model').toBe('citylab-stage');
    expect(await inFs(page), 'Enter left full screen').toBe(true);
    const px = await harness.glPixels(page);
    expect(looksBlank(px!)).toBe(false);
    // Undo in the HUD, then Space does what Enter did.
    await page.locator('[data-citylab-hud-undo]').click();
    await page.waitForFunction((id) => !/Park/.test(document.getElementById('citylab-parcel-' + id)!.getAttribute('aria-label') || ''), target, { timeout: 5000 });
    await page.locator('#citylab-stage').focus();
    // Space is the model's own key: it must not also scroll (its default is cancelled).
    await page.evaluate(() => {
      const w = window as any;
      w.__spaceKept = null;
      window.addEventListener('keydown', (e) => { if (e.key === ' ') w.__spaceKept = !e.defaultPrevented; }, { once: true });
    });
    await page.keyboard.press('Space');
    await page.waitForFunction((id) => /Park/.test(document.getElementById('citylab-parcel-' + id)!.getAttribute('aria-label') || ''), target, { timeout: 5000 });
    expect(await page.evaluate(() => (window as any).__spaceKept), 'Space would also scroll the page').toBe(false);
    // A road: Enter marks the start on the model, a parcel button moves on, Enter builds.
    await page.locator('[data-citylab-hud-part="top"] [data-citylab-tool="road"]').click();
    for (let i = 0; i < 12; i++) await page.locator('[data-citylab-hud-pick="up"]').click();
    const a = (await city(page))!.selectedId as string;
    await page.locator('#citylab-stage').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction((id) => (window as any).__city().roadFrom === id, a, { timeout: 5000 });
    await page.locator('[data-citylab-hud-pick="right"]').click();
    const b = (await city(page))!.selectedId as string;
    const builds1 = (await city(page))!.builds;
    await page.locator('#citylab-stage').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction((n) => (window as any).__city().builds > n && !(window as any).__city().roadFrom, builds1, { timeout: 8000 });
    expect(a).not.toBe(b);
    // The HUD with its parcel row stays axe-clean.
    const v = await page.evaluate(async () => {
      const res = await (window as any).axe.run({ include: [['[data-citylab-hud="on"]']] }, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
      return res.violations.map((x: any) => x.id + ': ' + x.nodes.length);
    });
    expect(v).toEqual([]);
    await page.screenshot({ path: 'C:/tmp/citylab_3d_2026-11-04/wave7/c1280_fullscreen_pick.jpg', type: 'jpeg', quality: 70 });
  });

  test('the first passing brief Check sets off fireworks and pays once; a later one shows the banner only', async ({ page }) => {
    await mount3d(page, { plan: briefPlan(), level: 'brief' });
    expect(await page.evaluate(() => (window as any).__xp.length), 'paid before Check').toBe(0);
    await pressCheck(page);
    await page.waitForFunction(() => (window as any).__city().fw.playing, null, { polling: 'raf', timeout: 8000 });
    expect(await page.locator('[data-citylab-celebrate]').getAttribute('data-citylab-celebrate')).toBe('fireworks');
    await page.waitForFunction(() => (window as any).__city().fw.done === 1, null, { timeout: 10000 });
    const done = (await city(page))!.fw.done;
    const paidFirst = await page.evaluate(() => (window as any).__xp.filter((x: any) => x[0] === 'citylab_brief_riverbend').length);
    await pressCheck(page);
    await page.waitForTimeout(1200);
    const d = (await city(page))!;
    expect(d.fw.playing, 'fireworks again').toBe(false);
    expect(d.fw.done).toBe(done);
    expect(await page.locator('[data-citylab-celebrate]').getAttribute('data-citylab-celebrate')).toBe('banner');
    expect(paidFirst, 'the first Check pays the brief XP').toBe(1);
    expect(await page.evaluate(() => (window as any).__xp.filter((x: any) => x[0] === 'citylab_brief_riverbend').length), 'paid twice').toBe(1);
  });
});
