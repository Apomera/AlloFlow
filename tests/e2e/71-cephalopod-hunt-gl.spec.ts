import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Cephalopod Lab — Hunter Sim on real WebGL.
 *
 * The jsdom suites never invoke the canvas ref, so the 4,000-line 3D hunt
 * (terrain, prey AI, predators, HUD, minimap, audio) has had no automated
 * eyes on it at all. This spec mounts the real scene under SwiftShader and
 * pins the things a student would notice first:
 *   1. the dive reaches a live, non-blank GL scene with the HUD attached;
 *   2. moving (W) changes the frame — the loop runs and input reaches it;
 *   3. the canvas follows its container when the container resizes
 *      (renderer.setSize must not pin the CSS box);
 *   4. surfacing releases the context.
 *
 * Set CL_SHOTS=<dir> to also save PNGs for eyeballing.
 */

const SHOT_DIR = process.env.CL_SHOTS || '';
function save(name: string, buf: Buffer) {
  if (!SHOT_DIR) return;
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.writeFileSync(path.join(SHOT_DIR, name), buf);
}

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_cephalopodlab.js',
  toolId: 'cephalopodLab',
  width: 960,
  height: 1150,
  probes: `
    window.__hunt = function () {
      var c = document.querySelector('#wrap canvas[role="application"]');
      if (!c) return null;
      var p = c.parentElement.getBoundingClientRect();
      var b = c.getBoundingClientRect();
      var gl = c.getContext('webgl2') || c.getContext('webgl');
      return { canvas: { w: Math.round(b.width), h: Math.round(b.height) }, parent: { w: Math.round(p.width), h: Math.round(p.height) },
               lost: gl ? gl.isContextLost() : null, styleW: c.style.width, hud: !!c.parentElement.querySelector('div'),
               wrapW: Math.round(document.querySelector('#wrap').getBoundingClientRect().width), rootW: Math.round(document.querySelector('#wrap > *').getBoundingClientRect().width) };
    };
  `,
});

const DIVE = { cephalopodLab: { activeSection: 'hunt', hunt3DActive: true, huntSpeciesId: 'commonOcto', _threeLoaded: true, huntsAttempted: 1 } };

test.describe.configure({ timeout: 180_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

test.describe('Cephalopod Lab — Hunter Sim on real WebGL', () => {
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('dives into a live, non-blank scene with the HUD attached', async ({ page }) => {
    // Force the full environment (sun shafts, surface) so the screenshot shows what a
    // GPU-equipped student sees; the sim disables them under a software rasteriser.
    await page.addInitScript(() => { (window as any).__alloForceFX = true; });
    await harness.mount(page, DIVE);
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => (window as any).__hunt());
    expect(info).not.toBeNull();
    expect(info.lost).toBe(false);
    expect(info.hud).toBe(true);
    const shot = await page.locator('#wrap').screenshot();
    save('hunt_0_dive.png', shot);
    expect(shot.length).toBeGreaterThan(20_000);
  });

  test('W moves the octopus: the frame changes and the loop is running', async ({ page }) => {
    await harness.mount(page, DIVE);
    await page.waitForTimeout(2000);
    const canvas = page.locator('#wrap canvas[role="application"]');
    await canvas.click({ position: { x: 20, y: 20 } });
    const before = await canvas.screenshot();
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(1800);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(300);
    const after = await canvas.screenshot();
    save('hunt_1_moved.png', await page.locator('#wrap').screenshot());
    expect(Buffer.compare(before, after)).not.toBe(0);
    await page.keyboard.down('KeyW'); await page.keyboard.down('Space');
    await page.waitForTimeout(900);
    await page.keyboard.up('Space'); await page.keyboard.up('KeyW');
    save('hunt_2_jet.png', await page.locator('#wrap').screenshot());
    await page.keyboard.press('KeyI');
    await page.waitForTimeout(700);
    save('hunt_3_ink.png', await page.locator('#wrap').screenshot());
  });

  test('the canvas follows its container when the container resizes', async ({ page }) => {
    await harness.mount(page, DIVE);
    await page.waitForTimeout(1500);
    const wide = await page.evaluate(() => (window as any).__hunt());
    await page.evaluate(() => {
      // #wrap is a flex box; the tool root is a flex item whose min-width is its content, so shrink both.
      (document.querySelector('#wrap') as HTMLElement).style.width = '560px';
      const root = document.querySelector('#wrap > *') as HTMLElement; root.style.width = '560px'; root.style.minWidth = '0'; root.style.flex = '0 0 560px';
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForTimeout(900);
    const narrow = await page.evaluate(() => (window as any).__hunt());
    expect(narrow.parent.w).toBeLessThan(wide.parent.w);
    // the whole point: the canvas box must track the parent box, not its first measurement
    expect(Math.abs(narrow.canvas.w - narrow.parent.w)).toBeLessThanOrEqual(2);
    expect(Math.abs(narrow.canvas.h - narrow.parent.h)).toBeLessThanOrEqual(2);
  });

  test('surfacing releases the WebGL context', async ({ page }) => {
    await harness.mount(page, DIVE);
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /End run/ }).click();
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => document.querySelectorAll('#wrap canvas[role="application"]').length);
    expect(after).toBe(0);
  });
});
