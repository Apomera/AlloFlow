import { test, expect, Page } from '@playwright/test';
import { GlHarness, looksBlank } from './helpers/stem_gl_harness';

/**
 * City Lab 3D, wave 1 (2026-11-04): build in 3D, against real WebGL.
 *
 * jsdom (tests/citylab_3d_w1.test.js) proves the edit API is one path. This
 * spec proves the parts only a real browser has: a click at a parcel's
 * projected screen point raycasts to THAT parcel and edits toolData; a drag
 * orbits and edits nothing; keyboard orbit reaches the camera; a selection
 * change moves the outline without a scene rebuild; a lost context drops to
 * the map with focus kept and comes back with "Back to 3D"; nothing leaks on
 * unmount; axe in light, dark and contrast; 320 px reflow; touch targets.
 *
 * The real host viewer (makeOrbitViewer) comes from stem_lab_module.js, and the
 * city viewer is found through its own debug seam (debug().cityLab).
 * Run alone: one Playwright suite at a time on this machine, 0 retries.
 */
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
    // A field parcel whose projected top really picks back to itself.
    window.__cityTarget = function () {
      var d = window.__city(), P = window.__alloCityLabPure;
      var plan = window.__toolData._cityLab && window.__toolData._cityLab.plan;
      plan = plan || P.basePlan('riverbend');
      var ids = P.allParcelIds().filter(function (id) { return plan.uses[id] === 'field'; });
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

// The host wraps a tool in a card: white in light AND dark (the tool paints
// translucent panels over it), black in contrast. Without the wrapper a
// contrast check measures a page no student sees.
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
  // Top of the viewport: the 520 px stage does not fit a 720 px window whole,
  // and a press below the fold sends no events at all.
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
const toolPlan = (page: Page) => page.evaluate(() => {
  const c = (window as any).__toolData._cityLab;
  return c && c.plan ? { uses: c.plan.uses, editCount: c.plan.editCount || 0 } : null;
});

test.describe('City Lab 3D W1 - build in 3D, real WebGL', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('the model renders, and a click at a parcel builds there', async ({ page }) => {
    await mount3d(page);
    const px = await harness.glPixels(page);
    expect(px, 'no GL canvas').not.toBeNull();
    expect(looksBlank(px!), 'the 3D canvas is blank').toBe(false);
    const scene = await harness.glScene(page);
    expect(scene!.meshes).toBeGreaterThan(144);

    await page.locator('[data-citylab-tool="housing_mid"]').click();
    await page.evaluate(() => document.getElementById('citylab-stage')!.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    const target = await page.evaluate(() => (window as any).__cityTarget());
    expect(target, 'no field parcel picks back to itself').not.toBeNull();
    const builds0 = (await city(page))!.builds;
    await page.mouse.click(target.x, target.y);
    await page.waitForFunction((id) => {
      const c = (window as any).__toolData._cityLab;
      return !!(c && c.plan && c.plan.uses[id] === 'housing_mid');
    }, target.id, { timeout: 10000 });
    expect((await toolPlan(page))!.editCount).toBe(1);
    await page.waitForFunction((b) => (window as any).__city().builds === b + 1, builds0, { timeout: 10000 });
    expect((await city(page))!.selectedId).toBe(target.id);
  });

  test('a drag turns the model and edits nothing', async ({ page }) => {
    await mount3d(page);
    await page.locator('[data-citylab-tool="housing_mid"]').click();
    await page.evaluate(() => document.getElementById('citylab-stage')!.scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    const box = (await page.locator('#citylab-stage').boundingBox())!;
    const before = await city(page);
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 80, y + 5, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const after = await city(page);
    expect(after!.rotY).not.toBe(before!.rotY);
    const p = await toolPlan(page);
    expect(p ? p.editCount : 0).toBe(0);
  });

  test('keyboard orbit on the focused stage, and selection moves without a rebuild', async ({ page }) => {
    await mount3d(page);
    await page.locator('#citylab-stage').focus();
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => (window as any).__city().rotY === 19, null, { timeout: 5000 });
    await page.keyboard.press('Home');
    await page.waitForFunction(() => (window as any).__city().rotY === 34, null, { timeout: 5000 });

    const d0 = (await city(page))!;
    await page.locator('#citylab-parcel-' + d0.selectedId).focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await page.waitForFunction((s) => {
      const d = (window as any).__city();
      return d.selectedId !== s && d.selAt === d.selectedId;
    }, d0.selectedId, { timeout: 5000 });
    expect((await city(page))!.builds, 'a selection change rebuilt the scene').toBe(d0.builds);
  });

  test('a lost context drops to the map with focus kept, and Back to 3D returns', async ({ page }) => {
    await mount3d(page);
    const sel = (await city(page))!.selectedId;
    await page.locator('#citylab-stage').focus();
    await page.evaluate(() => {
      const w = window as any;
      w.__lc = w.__glCanvas().gl.getExtension('WEBGL_lose_context');
      w.__lc.loseContext();
    });
    await page.waitForSelector('[data-citylab-3d-fallback="lost"]', { timeout: 10000 });
    await page.waitForFunction((id) => document.activeElement && document.activeElement.id === 'citylab-parcel-' + id, sel, { timeout: 5000 });
    expect(await page.locator('#citylab-parcel-' + sel).isVisible()).toBe(true);
    await page.evaluate(() => (window as any).__lc.restoreContext());
    const back = page.getByRole('button', { name: 'Back to 3D' });
    await back.waitFor({ timeout: 15000 });
    await back.click();
    await page.waitForSelector('[data-citylab-board3d="live"]', { timeout: 10000 });
    await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'citylab-stage', null, { timeout: 5000 });
    await page.waitForFunction(() => (window as any).__cityReady(), null, { timeout: 15000 });
    await page.waitForTimeout(600);
    const px = await harness.glPixels(page);
    expect(looksBlank(px!), 'blank after the restore').toBe(false);
  });

  test('unmount releases every GL context', async ({ page }) => {
    await mount3d(page);
    await harness.unmount(page);
    const leaked = await harness.leakedAfterUnmount(page);
    expect(leaked).toEqual([]);
  });

  for (const theme of ['light', 'dark', 'contrast'] as Theme[]) {
    test(`axe finds nothing on the 3D board (${theme})`, async ({ page }) => {
      await mount3d(page, theme);
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

  test('reflows at 320 px with no sideways page scroll', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await harness.mount(page, { _cityLab: { boardView: 'model' } }, 'window.__cityReady()');
    await page.addStyleTag({ content: '#wrap{width:auto !important;max-width:100% !important}' });
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      stageW: Math.round(document.getElementById('citylab-stage')!.getBoundingClientRect().width),
      touch: getComputedStyle(document.getElementById('citylab-stage')!).touchAction,
    }));
    expect(m.scrollW, 'page scrolls sideways at 320 px').toBeLessThanOrEqual(320);
    expect(m.stageW).toBeLessThanOrEqual(320);
    expect(m.touch).toBe('pan-y');
  });

  test('every control on the 3D board is at least 44 px', async ({ page }) => {
    await mount3d(page);
    const small = await page.evaluate(() => {
      const scope = [...document.querySelectorAll('[data-allo-fs-stage] button')]
        .concat([...document.querySelectorAll('[aria-label="Map view"] button')])
        .concat([...document.querySelectorAll('button')].filter((b) => /^(Undo|Redo)$/.test(b.textContent!.trim())));
      return scope.map((b) => { const r = b.getBoundingClientRect(); return { t: (b.textContent || '').trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; })
        .filter((r) => r.w < 44 || r.h < 44);
    });
    expect(small).toEqual([]);
  });
});
