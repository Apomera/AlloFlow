import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Molecule Lab's 3D viewer had no `webglcontextlost` handler and no failure state at all,
 * so a context lost after init (GPU reset, low-memory Chromebook, browser evicting old
 * contexts) left a black viewport with no message and no way back.
 *
 * The fix adds a role="alert" "3D view paused" panel in place of the canvas with a
 * "Restart 3D view" button that bumps the canvas key, so a FRESH canvas and renderer are
 * built. The canvas carries no key handlers (camera buttons sit beside it), so there is no
 * canvas-focus assertion; focus is checked on the panel's button instead.
 *
 * Mounted the way the conformance row does: methane in the viewer, OrbitControls loaded
 * (without it initThree returns before the renderer), app styles for a real canvas size.
 */
const METHANE = {
  atoms: [{ el: 'C', x: 200, y: 150, color: '#1e293b' }, { el: 'H', x: 200, y: 80, color: '#60a5fa' },
    { el: 'H', x: 270, y: 180, color: '#60a5fa' }, { el: 'H', x: 130, y: 180, color: '#60a5fa' },
    { el: 'H', x: 200, y: 220, color: '#60a5fa' }],
  bonds: [[0, 1], [0, 2], [0, 3], [0, 4]],
  formula: 'CH₄',
};

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_molecule.js',
  toolId: 'molecule',
  extraScripts: ['vendor/three-r128/OrbitControls.js'],
  appStyles: true,
  width: 1280,
  height: 900
});

test.describe.configure({ timeout: 150000, retries: 0 });

/** The viewer canvas's recorded context (harness recorder; never creates one). */
async function viewerContext(page: Page) {
  return page.evaluate(() => {
    const cv = document.querySelector('[data-molecule-viewport] canvas') as HTMLCanvasElement | null;
    const rec = cv && (window as any).__glRecord(cv);
    return rec ? { id: rec.id, live: !rec.ctx.isContextLost(), draws: rec.draws, byPage: rec.createdBy === 'page' } : null;
  });
}

async function mountViewer(page: Page) {
  // tutorialDismissed: on a first visit the 5-step tutorial is an aria-modal dialog that
  // makes the rest of the tool inert, so nothing behind it (the panel's button included)
  // can be focused or found by role. A returning student has dismissed it.
  await harness.mount(page, { molecule: { ...METHANE, moleculeMode: 'viewer', tutorialDismissed: true } });
  await expect.poll(async () => {
    const c = await viewerContext(page);
    return !!c && c.live && c.byPage && c.draws > 0;
  }, { timeout: 30000, message: 'the viewer never drew on a LIVE context, so this proves nothing' }).toBe(true);
}

test.describe('Molecule Lab — WebGL context loss', () => {
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('a lost viewer context shows the restart panel, and Restart builds a new live context', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await mountViewer(page);
    const before = await viewerContext(page);
    await expect(page.locator('[data-molecule-webgl-lost]')).toHaveCount(0);

    const killed = await page.evaluate(() => {
      const cv = document.querySelector('[data-molecule-viewport] canvas') as HTMLCanvasElement;
      const ext = (window as any).__glRecord(cv).ctx.getExtension('WEBGL_lose_context');
      if (!ext) return false;
      ext.loseContext();
      return true;
    });
    expect(killed, 'could not force a context loss').toBe(true);

    const panel = page.locator('[data-molecule-webgl-lost="lost"]');
    await expect(panel).toBeVisible({ timeout: 15000 });
    await expect(panel).toHaveAttribute('role', 'alert');
    await expect(panel).toContainText('3D view paused');
    await expect(panel).toContainText('Your work is saved');
    const restart = page.getByRole('button', { name: 'Restart 3D view', exact: true });
    await expect(restart, 'focus did not move to the Restart button').toBeFocused();

    await restart.click();
    await expect(page.locator('[data-molecule-webgl-lost]')).toHaveCount(0, { timeout: 15000 });
    await expect.poll(async () => {
      const c = await viewerContext(page);
      return !!c && c.id !== before!.id && c.live && c.draws > 0;
    }, { timeout: 30000, message: 'Restart did not build a NEW live context' }).toBe(true);
    // The model is still the student's methane, not an empty scene.
    const scene = await harness.glScene(page, '[data-molecule-viewport]');
    expect(scene && scene.visibleMeshes, 'the rebuilt scene is empty').toBeGreaterThanOrEqual(9);

    expect(errors.filter((m) => !/ResizeObserver loop/i.test(m)), 'page errors').toEqual([]);
  });

  test('switching to another mode and back does not raise the panel', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await mountViewer(page);
    const first = await viewerContext(page);

    const setMode = (m: string) => page.evaluate((mode) => (window as any).__ctx.setToolData((p: any) =>
      Object.assign({}, p, { molecule: Object.assign({}, p.molecule, { moleculeMode: mode }) })), m);
    // Leaving the viewer runs disposeThree; StemLab.releaseGl then force-loses the removed canvas.
    await setMode('table');
    await expect(page.locator('[data-molecule-viewport] canvas')).toHaveCount(0, { timeout: 15000 });
    await page.waitForTimeout(800);
    await setMode('viewer');
    await expect.poll(async () => {
      const c = await viewerContext(page);
      return !!c && c.id !== first!.id && c.live && c.draws > 0;
    }, { timeout: 30000, message: 'the viewer did not come back live' }).toBe(true);
    await expect(page.locator('[data-molecule-webgl-lost]'), 'our own teardown raised the panel').toHaveCount(0);

    expect(errors.filter((m) => !/ResizeObserver loop/i.test(m)), 'page errors').toEqual([]);
  });
});
