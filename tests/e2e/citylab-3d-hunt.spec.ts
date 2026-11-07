import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import * as vm from 'node:vm';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

/**
 * City Lab 3D, independent bug hunt (2026-11-04), against real WebGL and the
 * real host full-screen helper.
 *
 * jsdom (tests/citylab_3d_hunt.test.js) pins the logic. This spec proves, in
 * Chromium: the page behind full screen is inert while the HUD shows (a live
 * region outside stays live), Tab still stays in the HUD, and all of it is
 * given back on Escape; a context lost in full screen leaves full screen with
 * focus on the map; and the high-contrast scene labels only what is built
 * (plus the selected and hovered parcel), not 144 parcels.
 *
 * CITYLAB_FILE=<path> serves another copy of the tool (the hunt's start copy)
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
function westHomes() {
  const homes: string[] = [];
  ['A', 'B', 'C'].forEach((c) => [9, 10, 11, 12].forEach((r) => homes.push(c + r)));
  let p = homes.reduce((a: any, id: string) => P.toggleGreenInfra(P.setUse(a, id, 'mixed'), id), P.basePlan('riverbend'));
  const pairs: string[][] = [['C8', 'C9'], ['C9', 'C10'], ['C10', 'C11'], ['C11', 'C12']];
  [9, 10, 11, 12].forEach((r) => pairs.push(['A' + r, 'B' + r], ['B' + r, 'C' + r]));
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
async function enterHud(page: Page) {
  const more = page.locator('[data-citylab-cam-more]');
  if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click();
  await page.locator('#citylab-fs-toggle').click();
  await page.waitForFunction(() => !!document.querySelector('[data-citylab-hud="on"]'), null, { timeout: 8000 });
  await page.waitForTimeout(700);
}
// What the page behind holds: a button, a live region, and a block with both.
async function decorate(page: Page) {
  await page.evaluate(() => {
    const add = (html: string) => { const d = document.createElement('div'); d.innerHTML = html; document.body.appendChild(d.firstElementChild!); };
    add('<nav id="behind"><a id="behind-link" href="#x">a link behind</a></nav>');
    add('<div id="host-live" aria-live="polite"></div>');
    add('<div id="mixed"><button id="mixed-btn">behind</button><p id="mixed-live" role="status"></p></div>');
  });
}

test.describe('City Lab 3D hunt - real WebGL and the real full-screen helper', () => {
  test.beforeEach(async ({ page }) => {
    const alt = process.env.CITYLAB_FILE;
    if (alt) await page.route('**/stem_lab/stem_tool_citylab.js', (r) => r.fulfill({ body: readFileSync(alt, 'utf8'), contentType: 'application/javascript' }));
  });
  test.afterEach(async ({ page }) => {
    await harness.destroy(page);
  });

  test('full screen makes the page behind inert (live regions excepted), Tab stays in the HUD, and Escape gives it all back', async ({ page }) => {
    await mount3d(page, 'light', { plan: westHomes() });
    await decorate(page);
    await enterHud(page);
    const st = await page.evaluate(() => {
      const inert = (id: string) => { const n = document.getElementById(id); return !!(n && n.closest('[inert]')); };
      const fs = document.querySelector('[data-citylab-hud="on"]')!;
      return {
        real: !!document.fullscreenElement, attr: !!document.querySelector('[data-allo-fullscreen-active]'),
        behind: inert('behind-link'), mixedBtn: inert('mixed-btn'), hostLive: inert('host-live'), mixedLive: inert('mixed-live'),
        twin: !!document.querySelector('#citylab-parcel-A1')!.closest('[inert]'), hudInert: !!fs.closest('[inert]'),
        focusable: (() => { const b = document.getElementById('behind-link') as HTMLElement; b.focus(); return document.activeElement === b; })(),
      };
    });
    console.log('[hunt fs]', JSON.stringify(st));
    expect(st.real || st.attr, 'full screen did not start').toBe(true);
    expect(st.behind, 'the page behind is reachable').toBe(true);
    expect(st.mixedBtn).toBe(true);
    expect(st.twin, 'the map behind the HUD is reachable').toBe(true);
    expect(st.focusable, 'focus can still go behind the HUD').toBe(false);
    expect(st.hostLive, 'a live region went silent').toBe(false);
    expect(st.mixedLive).toBe(false);
    expect(st.hudInert).toBe(false);
    // Tab still walks the HUD only.
    await page.locator('#citylab-stage').focus();
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => !!document.querySelector('[data-citylab-hud="on"]')!.contains(document.activeElement));
      expect(inside, `Tab ${i + 1} left the HUD`).toBe(true);
    }
    await page.locator('#citylab-stage').focus();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('[data-citylab-hud]')!.getAttribute('data-citylab-hud') === 'off', null, { timeout: 5000 });
    expect(await page.evaluate(() => document.querySelectorAll('[inert]').length), 'inert left behind').toBe(0);
    expect(await page.evaluate(() => document.activeElement!.id)).toBe('citylab-fs-toggle');
    // Leaving the tool in full screen gives the page back as well.
    await enterHud(page);
    expect(await page.evaluate(() => document.querySelectorAll('[inert]').length)).toBeGreaterThan(0);
    await harness.unmount(page);
    expect(await page.evaluate(() => document.querySelectorAll('[inert]').length), 'inert left after unmount').toBe(0);
  });

  test('a context lost in full screen leaves full screen, with focus on the selected parcel of the map', async ({ page }) => {
    await mount3d(page, 'light');
    const sel = (await city(page))!.selectedId;
    await enterHud(page);
    await page.locator('#citylab-stage').focus();
    await page.evaluate(() => {
      const w = window as any;
      w.__lc = w.__glCanvas().gl.getExtension('WEBGL_lose_context');
      w.__lc.loseContext();
    });
    await page.waitForSelector('[data-citylab-3d-fallback="lost"]', { timeout: 10000 });
    await page.waitForFunction(() => !document.fullscreenElement && !document.querySelector('[data-allo-fullscreen-active]'), null, { timeout: 8000 })
      .catch(() => { /* asserted below */ });
    const st = await page.evaluate(() => ({ real: !!document.fullscreenElement, attr: !!document.querySelector('[data-allo-fullscreen-active]'),
      hud: document.querySelector('[data-citylab-hud]')!.getAttribute('data-citylab-hud'), inert: document.querySelectorAll('[inert]').length }));
    console.log('[hunt lost in fs]', JSON.stringify(st));
    expect(st.real || st.attr, 'a blank stage still fills the screen with nothing to press').toBe(false);
    expect(st.inert).toBe(0);
    await page.waitForFunction((id) => document.activeElement && document.activeElement.id === 'citylab-parcel-' + id, sel, { timeout: 5000 });
    expect(await page.locator('#citylab-parcel-' + sel).isVisible()).toBe(true);
  });

  test('high contrast labels what is built, plus the selected and hovered parcel, not every field; axe stays clean', async ({ page }) => {
    const p = plain(P.setUse(P.setUse(P.basePlan('harborlight'), 'D6', 'park'), 'E6', 'housing_mid'));
    await mount3d(page, 'contrast', { plan: p, motionOff: true });
    const fields = P.allParcelIds().filter((id: string) => p.uses[id] === 'field');
    const d0 = (await city(page))!;
    console.log('[hunt codes]', JSON.stringify({ total: d0.codes, shown: d0.codesShown, fields: fields.length, calls: d0.calls }));
    expect(d0.codeBatch).toBe(true);
    const selIsField = p.uses[d0.selectedId] === 'field' ? 1 : 0;
    expect(d0.codesShown, 'codes on screen').toBe(P.allParcelIds().length - fields.length + selIsField);
    expect(d0.calls).toBeLessThanOrEqual(25);
    await page.screenshot({ path: 'C:/tmp/citylab_3d_2026-11-04/hunt/c1280_contrast_codes.jpg', type: 'jpeg', quality: 70 });
    // Select a field on the map twin: its code shows on the model.
    const f = fields.find((id: string) => id !== d0.selectedId)!;
    await page.locator('#citylab-parcel-' + f).click();
    await page.waitForFunction((id) => (window as any).__city().selectedId === id, f, { timeout: 5000 });
    await page.waitForTimeout(300);
    expect((await city(page))!.codesShown).toBe(P.allParcelIds().length - fields.length + 1);
    const px = await harness.glPixels(page);
    expect(looksBlank(px!)).toBe(false);
    const v = await page.evaluate(async () => {
      const res = await (window as any).axe.run({ include: [['[data-citylab-board3d]']] }, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
      return res.violations.map((x: any) => x.id + ': ' + x.nodes.length);
    });
    expect(v).toEqual([]);
    await expect(page.locator('[data-citylab-hc-codes]')).toContainText('except open fields');
  });
});
