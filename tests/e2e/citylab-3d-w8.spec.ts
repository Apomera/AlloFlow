import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * City Lab 3D, wave 8 (2026-11-04), against real WebGL and the real host
 * full-screen helper.
 *
 * In full screen the HUD covers the top of the model (and a corner). When the
 * HUD's parcel buttons move the selection, the camera slides the frame just
 * enough that the selected parcel's projected point (its roof) is clear of
 * every HUD box: it eases with motion on (no rebuild), and snaps with no
 * easing frames under reduced motion. The HUD row's "Zoom to {parcel}" frames
 * the parcel and leaves it clear too.
 *
 * CITYLAB_FILE=<path> serves another copy of the tool (the wave's start copy)
 * to show the tests fail on the old behaviour. Run alone, 0 retries.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_citylab.js',
  toolId: 'cityLab',
  preScripts: ['stem_lab/stem_lab_module.js'],
  appStyles: true,
  layout: 'document',
  width: 1280,
  height: 900,
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
    // Where the selected parcel's roof is on the page, and the HUD boxes.
    window.__cover = function () {
      var d = window.__city();
      var id = d.selectedId, pt = d.project(id);
      var stage = document.getElementById('citylab-stage').getBoundingClientRect();
      var boxes = Array.prototype.slice.call(document.querySelectorAll('[data-citylab-hud] > [data-citylab-stage-wrap] > [data-citylab-hud-part]'))
        .map(function (n) { var b = n.getBoundingClientRect(); return { part: n.getAttribute('data-citylab-hud-part'), left: b.left, top: b.top, right: b.right, bottom: b.bottom }; });
      var under = boxes.filter(function (b) { return pt && pt.x >= b.left && pt.x <= b.right && pt.y >= b.top && pt.y <= b.bottom; }).map(function (b) { return b.part; });
      var inStage = !!pt && pt.onScreen && pt.x >= stage.left && pt.x <= stage.right && pt.y >= stage.top && pt.y <= stage.bottom;
      return { id: id, pt: pt, boxes: boxes, under: under, inStage: inStage, frame: d.frame, kind: d.frameKind, builds: d.builds,
        easing: d.frameEasing, easeFrames: d.frameEaseFrames, snapped: d.frameSnapped, zoom: d.zoom, motion: d.motion && !d.slow };
    };
  `,
});

test.describe.configure({ timeout: 150_000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

async function mount3d(page: Page) {
  await harness.mount(page, { _cityLab: { boardView: 'model', coachOff: true } });
  await page.evaluate(() => {
    const wrap = document.getElementById('wrap')!;
    wrap.setAttribute('data-stem-tool-shell', 'true');
    wrap.style.background = '#fff';
    (window as any).__rerender();
  });
  await page.evaluate(() => document.getElementById('citylab-stage')!.scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => (window as any).__cityReady(), null, { timeout: 30000 });
  await page.waitForTimeout(500);
}
async function enterHud(page: Page) {
  const more = page.locator('[data-citylab-cam-more]');
  if ((await more.getAttribute('aria-expanded')) !== 'true') await more.click();
  await page.locator('#citylab-fs-toggle').click();
  await page.waitForFunction(() => !!document.querySelector('[data-citylab-hud="on"]'), null, { timeout: 8000 });
  await page.waitForTimeout(700);
}
const cover = (page: Page) => page.evaluate(() => (window as any).__cover());
// Press a HUD parcel button and wait until the camera is still again. At the
// map's edge the selection stays put: null.
async function pick(page: Page, dir: string) {
  const before = (await cover(page)).id;
  await page.locator(`[data-citylab-hud-pick="${dir}"]`).click();
  try {
    await page.waitForFunction((b) => (window as any).__city().selectedId !== b, before, { timeout: 2000 });
  } catch (e) { return null; }
  await page.waitForTimeout(120);
  await page.waitForFunction(() => !(window as any).__city().frameEasing, null, { timeout: 5000 });
  await page.waitForTimeout(60);
  return cover(page);
}

test.describe('City Lab 3D W8 - the camera keeps the HUD selection in view', () => {
  test.beforeEach(async ({ page }) => {
    const alt = process.env.CITYLAB_FILE;
    if (alt) await page.route('**/stem_lab/stem_tool_citylab.js', (r) => r.fulfill({ body: readFileSync(alt, 'utf8'), contentType: 'application/javascript' }));
  });
  test.afterEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: null });
    await harness.destroy(page);
  });

  test('moving the selection up under the HUD box slides the frame just enough, easing, with no rebuild', async ({ page }) => {
    await mount3d(page);
    await enterHud(page);
    const c0 = await cover(page);
    expect(c0.boxes.map((b: any) => b.part).sort()).toEqual(['camera', 'top']);
    const top = c0.boxes.find((b: any) => b.part === 'top');
    const builds0 = c0.builds;
    const log: string[] = [];
    let followed = 0, eased = 0, nearEdge = 0;
    // Up to the top row and back along it: the far side of the town, where the HUD box sits.
    const dirs = ['up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'up', 'right', 'right', 'left', 'left', 'left'];
    let prevFrame = JSON.stringify(c0.frame);
    for (const dir of dirs) {
      const c = await pick(page, dir);
      if (!c) { log.push(`${dir} -> edge`); continue; }
      log.push(`${dir} -> ${c.id} at ${c.pt ? Math.round(c.pt.x) + ',' + Math.round(c.pt.y) : 'none'} under [${c.under}] kind ${c.kind} motion ${c.motion}`);
      expect(c.under, `${c.id} sits under the HUD: ${log.join(' | ')}`).toEqual([]);
      expect(c.inStage, `${c.id} is off the stage: ${log.join(' | ')}`).toBe(true);
      if (JSON.stringify(c.frame) !== prevFrame) {
        expect(c.kind).toBe('follow');
        followed++;
        // With motion on every follow takes the eased path (never the snap);
        // a frame stall on a loaded machine can shorten one ease, not all.
        // (The frame watchdog may turn motion off on a loaded machine: then a snap is right.)
        if (c.motion) expect(c.snapped, 'a follow snapped with motion on').toBe(false);
        if (c.easeFrames > 2) eased++;
        // Just enough: the roof lands a margin below the top box, not mid-screen.
        if (c.pt.y > top.bottom && c.pt.y < top.bottom + 60) nearEdge++;
      }
      prevFrame = JSON.stringify(c.frame);
    }
    console.log(log.join('\n'));
    expect(followed, 'the camera never followed').toBeGreaterThan(0);
    // The frame watchdog turns motion off on a machine too loaded to draw at
    // 30 fps; then every slide snaps (rightly) and the ease cannot be seen.
    if ((await cover(page)).motion) expect(eased, 'no slide eased over several frames').toBeGreaterThan(0);
    else test.info().annotations.push({ type: 'note', description: 'the frame watchdog turned motion off: the ease was not observable' });
    expect(nearEdge, 'a slide moved the parcel further than it had to').toBeGreaterThan(0);
    expect((await cover(page)).builds, 'the slide rebuilt the scene').toBe(builds0);
    await page.screenshot({ path: 'C:/tmp/citylab_3d_2026-11-04/wave8/c1280_fullscreen_follow.jpg', type: 'jpeg', quality: 70 });
  });

  test('reduced motion: the slide snaps, with no easing frames', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mount3d(page);
    await enterHud(page);
    const steps: any[] = [];
    for (let i = 0; i < 11; i++) {
      const before = await cover(page);
      if (/^[A-L]1$/.test(before.id)) break;
      await page.locator('[data-citylab-hud-pick="up"]').click();
      await page.waitForFunction((b) => (window as any).__city().selectedId !== b, before.id, { timeout: 5000 });
      // One short wait, no waiting on an ease: what is drawn now is where it lands.
      await page.waitForTimeout(150);
      steps.push(Object.assign(await cover(page), { moved: JSON.stringify((await cover(page)).frame) !== JSON.stringify(before.frame) }));
    }
    expect(steps.filter((c) => c.under.length).map((c) => `${c.id} under [${c.under}]`), 'a parcel under the HUD').toEqual([]);
    const moved = steps.filter((c) => c.moved);
    expect(moved.length, 'the camera never followed').toBeGreaterThan(0);
    for (const c of steps) expect(c.easing, 'easing under reduced motion').toBe(false);
    for (const c of moved) {
      expect(c.kind).toBe('follow');
      expect(c.snapped).toBe(true);
      expect(c.easeFrames).toBe(0);
    }
  });

  test('Zoom to in the HUD row frames the parcel and leaves it clear of the HUD', async ({ page }) => {
    await mount3d(page);
    await enterHud(page);
    for (let i = 0; i < 11; i++) if (!(await pick(page, 'up'))) break;
    const id = (await cover(page)).id;
    const zoom = page.locator('[data-citylab-hud-zoom]');
    await expect(zoom).toHaveText('Zoom to ' + id);
    await zoom.click();
    await page.waitForFunction(() => (window as any).__city().frame && Math.abs((window as any).__city().frame.hx - 1.75) < 1e-9, null, { timeout: 5000 });
    await page.waitForTimeout(150);
    const c = await cover(page);
    expect(c.zoom).toBe(1);
    expect(c.under, `${id} under the HUD after Zoom to`).toEqual([]);
    expect(c.inStage).toBe(true);
    // Zoomed in: the frame is the parcel's district, near the parcel.
    expect(c.frame.hx).toBeCloseTo(1.75, 9);
  });
});
