import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * A NORMAL exit from a 3D view must not be reported as a lost WebGL context.
 *
 * StemLab.releaseGl force-loses a canvas one tick after teardown removes it from the
 * page, and that fires `webglcontextlost` on the old canvas. A loss handler that cannot
 * tell that apart from a real loss raises the tool's "WebGL failed" state after every
 * ordinary exit — and where that state lives in toolData, it is still there when the
 * student comes back. A real loss always happens on a canvas that is still on the page,
 * so the discriminator is `canvas.isConnected`.
 *
 * Each case takes the tool through its real exit control, gives the deferred release
 * time to land, then comes back where a return path exists, and asserts no failure text.
 */

// Read the harness's record of contexts the PAGE created and drew with. Calling
// getContext here would create a live context itself (so the wait could never fail)
// and could take a canvas the tool had not drawn on yet.
async function liveGl(page: Page) {
  await page.waitForFunction(() => ((window as any).__glContexts() || []).some((c: any) =>
    c.createdBy === 'page' && !c.lost && c.connected && c.draws > 0), null, { timeout: 40000 });
}
const liveIds = (page: Page) => page.evaluate(() => ((window as any).__glContexts() || [])
  .filter((c: any) => c.createdBy === 'page' && !c.lost && c.connected).map((c: any) => c.id));

async function clickByText(page: Page, re: RegExp, what: string) {
  const hit = await page.evaluate((src) => {
    const r = new RegExp(src, 'i');
    const b = Array.from(document.querySelectorAll('button, [role="tab"]'))
      .find((x) => r.test((x.textContent || '').trim()) && (x as HTMLElement).offsetParent !== null);
    if (!b) return null;
    (b as HTMLElement).click();
    return (b.textContent || '').replace(/\s+/g, ' ').trim();
  }, re.source);
  expect(hit, `could not find the ${what} control`).not.toBeNull();
}

const bodyHas = (page: Page, re: RegExp) =>
  page.evaluate((src) => new RegExp(src, 'i').test(document.body.textContent || ''), re.source);

test.describe('Cephalopod Lab — surfacing is not a lost context', () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_cephalopodlab.js', toolId: 'cephalopodLab', width: 960, height: 1150 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('surfacing after a dive leaves no WebGL failure behind', async ({ page }) => {
    test.setTimeout(150000);
    await harness.mount(page, { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', _threeLoaded: true, huntsAttempted: 1 } },
      'document.querySelector(\'#wrap canvas[role="application"]\')');
    await liveGl(page);
    await clickByText(page, /End run \+ surface/, 'End run + surface');
    await page.waitForTimeout(1500);
    const failed = await bodyHas(page, /WebGL failed to load or initialize/);
    console.log('ceph after surfacing, failure shown:', failed);
    expect(failed, 'a normal surface was reported as a WebGL failure').toBe(false);
  });
});

test.describe('Aquaculture — exiting the sim is not a lost context', () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_aquaculture.js', toolId: 'aquacultureLab', width: 1280, height: 900 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('exiting the boat mission leaves no WebGL failure behind', async ({ page }) => {
    test.setTimeout(150000);
    await harness.mount(page, { aquacultureLab: {} }, undefined, { expectCanvas: false });
    await page.waitForTimeout(1000);
    await clickByText(page, /Boat Mission/, 'Boat Mission tab');
    await page.waitForTimeout(1200);
    await clickByText(page, /Cast off|Load 3D engine/, 'launch');
    await liveGl(page);
    await clickByText(page, /Exit sim/, 'Exit sim');
    await page.waitForTimeout(1500);
    const failed = await bodyHas(page, /WebGL failed to load or initialize/);
    console.log('aquaculture after exit, failure shown:', failed);
    expect(failed, 'a normal exit was reported as a WebGL failure').toBe(false);
  });
});

test.describe('Solar System — leaving the orrery is not a lost context', () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_solarsystem.js', toolId: 'solarSystem', width: 1280, height: 900 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('switching away and back leaves no WebGL failure behind', async ({ page }) => {
    test.setTimeout(150000);
    await harness.mount(page);
    await liveGl(page);
    // Note the live contexts, so we can prove a teardown actually happened. If switching
    // tabs does not replace the canvas, releaseGl never fires and this proves nothing.
    const beforeIds = await liveIds(page);
    await page.evaluate(() => (window as any).__ctx.setToolData((d: any) =>
      Object.assign({}, d, { solarSystem: Object.assign({}, d.solarSystem, { viewTab: 'interior' }) })));
    await page.waitForTimeout(1500);
    await page.evaluate(() => (window as any).__ctx.setToolData((d: any) =>
      Object.assign({}, d, { solarSystem: Object.assign({}, d.solarSystem, { viewTab: 'overview' }) })));
    await page.waitForTimeout(2500);
    const replaced = await page.evaluate((ids: number[]) => {
      const all = (window as any).__glContexts() || [];
      return ids.length > 0 && ids.every((id) => { const c = all.find((x: any) => x.id === id); return !c || !c.connected; });
    }, beforeIds);
    const failed = await bodyHas(page, /WebGL failed to initialize/);
    console.log('solar after away-and-back:', JSON.stringify({ canvasReplaced: replaced, failureShown: failed }));
    test.skip(!replaced, 'switching view tabs does not tear the canvas down, so this path cannot fire the bug');
    expect(failed, 'leaving the orrery was reported as a WebGL failure').toBe(false);
  });
});

test.describe('Moon Mission — leaving the moonwalk is not a lost context', () => {
  const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_moonmission.js', toolId: 'moonMission', width: 1280, height: 820 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });

  test('leaving the EVA and returning leaves no WebGL failure behind', async ({ page }) => {
    test.setTimeout(150000);
    await harness.mount(page, { moonMission: { missionPhase: 6, evaStarted: true } },
      `document.querySelector('canvas[data-eva-canvas="true"]')`);
    await liveGl(page);
    // Leave by MERGING a new phase in, so any webglError the release writes survives.
    // (Replacing the whole moonMission object here would erase exactly the state this
    // test is looking for and pass for the wrong reason.)
    await page.evaluate(() => (window as any).__ctx.setToolData((d: any) =>
      Object.assign({}, d, { moonMission: Object.assign({}, d.moonMission, { missionPhase: 7 }) })));
    await page.waitForTimeout(1500);
    const persisted = await page.evaluate(() => !!((window as any).__toolData.moonMission || {}).webglError);
    await page.evaluate(() => (window as any).__ctx.setToolData((d: any) =>
      Object.assign({}, d, { moonMission: Object.assign({}, d.moonMission, { missionPhase: 6, evaStarted: true }) })));
    await page.waitForTimeout(2500);
    const failed = await bodyHas(page, /Moonwalk 3D Mode Unresolved/);
    console.log('moonmission after leaving EVA:', JSON.stringify({ webglErrorPersisted: persisted, failureShownOnReturn: failed }));
    expect(persisted, 'leaving the moonwalk wrote a WebGL failure into saved state').toBe(false);
    expect(failed, 'leaving the moonwalk was reported as a WebGL failure').toBe(false);
  });
});
