import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Coaster Lab had no `webglcontextlost` handler, so a context lost after init left the
 * midway black for the rest of the session. Context loss is ordinary: a GPU driver
 * reset, a tab restored on a low-memory Chromebook, or the browser evicting the oldest
 * of its limited contexts.
 *
 * There was no recovery state to reuse (showFatal only covers creation failure), so
 * the engine now tears down through __clabDestroy and the host swaps in a role="alert"
 * "3D view paused" panel. "Restart 3D view" re-keys the mount box so the engine boots
 * into a FRESH element (the old one still carries the dead engine's key listeners).
 *
 * __clabDestroy calls renderer.forceContextLoss(), which fires the same event, so a
 * normal close and reopen must not raise the panel (the teardown trap).
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_coasterlab.js',
  toolId: 'coasterLab',
  width: 1200,
  height: 800,
  probes: "document.head.insertAdjacentHTML('beforeend', '<style>#wrap{width:100%}.clab-root{width:100%;height:100vh!important}</style>');"
});

const SEL = '[aria-label="Coaster Lab 3-D designer"]';
const CANVAS = '#clab-gl';

// The harness records every context the PAGE created and drew with; reading that
// avoids a spec probe calling getContext and creating a live context itself.
const liveIds = (page: Page) => page.evaluate(() => ((window as any).__glContexts() || [])
  .filter((c: any) => c.createdBy === 'page' && !c.lost && c.connected && c.draws > 0).map((c: any) => c.id));

async function waitLive(page: Page, exclude: number[] = []) {
  await page.waitForFunction((ex) => ((window as any).__glContexts() || []).some((c: any) =>
    c.createdBy === 'page' && !c.lost && c.connected && c.draws > 0 && ex.indexOf(c.id) === -1),
  exclude, { timeout: 40000 });
}

const panelUp = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('[role="alert"]'))
  .some((n) => /3D view paused/i.test(n.textContent || '')));

test.describe('Coaster Lab — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });
  test.beforeEach(async ({ page }) => {
    // Open past the first-run intro, as the other coaster specs do.
    await page.addInitScript(() => { try { localStorage.setItem('coaster_lab_onboarding_v1', 'complete'); } catch (e) { /* ignore */ } });
  });

  test('a lost midway context offers Restart, and Restart rebuilds a live scene', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, {}, `document.querySelector('${SEL}')._lab`);
    await waitLive(page);
    const before = await liveIds(page);
    expect(before.length, 'the midway never took a live WebGL context, so this proves nothing').toBeGreaterThan(0);
    expect(await panelUp(page), 'the panel was already showing before the loss').toBe(false);

    const killed = await page.evaluate((sel) => {
      const cv = document.querySelector(sel) as HTMLCanvasElement | null;
      const g: any = cv && (cv.getContext('webgl2') || cv.getContext('webgl'));
      const ext = g && !g.isContextLost() && g.getExtension('WEBGL_lose_context');
      if (!ext) return false;
      ext.loseContext();
      return true;
    }, CANVAS);
    expect(killed, 'could not force a context loss').toBe(true);

    await page.waitForFunction(() => Array.from(document.querySelectorAll('[role="alert"]'))
      .some((n) => /3D view paused/i.test(n.textContent || '')), null, { timeout: 15000 });
    const restart = page.getByRole('button', { name: /Restart 3D view/i });
    await expect(restart, 'the midway went black with no way back').toBeVisible();
    await expect(restart, 'focus did not move to the way back').toBeFocused();

    // Keys pressed on the panel must not reach the dead engine's shortcuts.
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Enter');
    await page.waitForFunction((sel) => !!(document.querySelector(sel) as any)?._lab, SEL, { timeout: 40000 });
    await waitLive(page, before);
    expect(await panelUp(page), 'Restart did not clear the panel').toBe(false);

    // The shortcuts (Space, R, C, X, P, H) live on the mount box, so it must take focus.
    const focused = await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLElement;
      el.focus();
      return document.activeElement === el;
    }, SEL);
    expect(focused, 'the rebuilt mount box cannot take focus, so its keys are dead').toBe(true);

    expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)),
      'page errors during the context-loss cycle').toEqual([]);
  });

  test('closing and reopening the tool does not raise the panel', async ({ page }) => {
    test.setTimeout(150000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await harness.mount(page, {}, `document.querySelector('${SEL}')._lab`);
    await waitLive(page);
    const before = await liveIds(page);

    // Close: __clabDestroy runs on a microtask and force-loses the context.
    await harness.unmount(page);
    await page.waitForTimeout(1500);
    const released = await page.evaluate((ids: number[]) => {
      const all = (window as any).__glContexts() || [];
      return ids.every((id) => { const c = all.find((x: any) => x.id === id); return !c || c.lost; });
    }, before);
    expect(released, 'closing did not release the context, so the teardown path never ran').toBe(true);

    await page.evaluate(() => (window as any).__mount({}));
    await page.waitForFunction((sel) => !!(document.querySelector(sel) as any)?._lab, SEL, { timeout: 40000 });
    await waitLive(page, before);
    await page.waitForTimeout(1000);
    expect(await panelUp(page), 'a normal close and reopen was reported as a lost context').toBe(false);

    expect(errors.filter((m) => !/ResizeObserver loop|context lost/i.test(m)),
      'page errors during close and reopen').toEqual([]);
  });
});
