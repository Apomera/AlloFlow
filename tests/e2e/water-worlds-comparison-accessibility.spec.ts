import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

test.use({ video: 'off', reducedMotion: 'reduce' });
const output = resolve('reports/stem-refinement-team-2026-10-01/water');

for (const width of [1280, 320]) {
  test(`saved observations toggle by native keyboard at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.setViewportSize({ width, height: 900 });
    // Real runtime on an isolated local page; no persistent server or remote app.
    await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><main id="water-slot"></main></body></html>');
    for (const source of [
      'desktop/web-app/node_modules/react/umd/react.production.min.js',
      'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
      'stem_lab/water_worlds_kernel.js', 'stem_lab/water_worlds_view.js'
    ]) await page.addScriptTag({ path: resolve(source) });
    const before = await page.evaluate(() => {
      const runtime = window as any, K = runtime.WaterWorldsKernel;
      let saved = K.begin(K.initial(), false);
      for (let i = 0; i < 3; i++) {
        saved = K.advance(saved, 5);
        saved = K.observe(saved, undefined, 'Keyboard record ' + (i + 1));
      }
      saved = { ...saved, running: false };
      runtime.ReactDOM.render(runtime.React.createElement(runtime.WaterWorldsView, {
        React: runtime.React, saved, onSave: (state: any) => { runtime.waterKeyboardState = state; }
      }), document.getElementById('water-slot'));
      return JSON.stringify(K.evidence(saved));
    });
    const buttons = page.locator('.ww-observation-card button[aria-pressed]');
    await expect(buttons).toHaveCount(3);
    await page.waitForFunction(() => !!(window as any).waterKeyboardState);
    // Reach the first evidence control by actual sequential Tab navigation.
    let reached = false;
    for (let step = 0; step < 80; step++) {
      await page.keyboard.press('Tab');
      reached = await buttons.nth(0).evaluate(node => document.activeElement === node);
      if (reached) break;
    }
    expect(reached).toBe(true);
    const first = buttons.nth(0), second = buttons.nth(1), third = buttons.nth(2);
    await expect(first).toHaveAccessibleName('Compare observation 1');
    await page.keyboard.press('Space');
    await expect(first).toHaveAccessibleName('Selected for comparison observation 1');
    await expect(first).toHaveAttribute('aria-pressed', 'true');
    await expect(first).toBeFocused();
    // Revisit is disabled during this paused unfinished run; Remove then note
    // then Compare are the sequential focusable controls between the cards.
    for (let step = 0; step < 8; step++) {
      await page.keyboard.press('Tab');
      if (await second.evaluate(node => document.activeElement === node)) break;
    }
    await expect(second).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(second).toHaveAttribute('aria-pressed', 'true');
    await expect(second).toHaveAccessibleName('Selected for comparison observation 2');
    await expect(second).toBeFocused();
    await expect(third).toBeDisabled();
    for (let cycle = 0; cycle < 3; cycle++) {
      await page.keyboard.press(cycle % 2 ? 'Space' : 'Enter');
      await expect(second).toHaveAttribute('aria-pressed', 'false');
      await expect(second).toHaveAccessibleName('Compare observation 2');
      await expect(second).toBeFocused();
      await expect(third).toBeEnabled();
      await page.keyboard.press(cycle % 2 ? 'Enter' : 'Space');
      await expect(second).toHaveAttribute('aria-pressed', 'true');
      await expect(second).toHaveAccessibleName('Selected for comparison observation 2');
      await expect(second).toBeFocused();
      await expect(third).toBeDisabled();
    }
    const after = await page.evaluate(() => JSON.stringify((window as any).WaterWorldsKernel.evidence((window as any).waterKeyboardState)));
    expect(after).toBe(before);
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    mkdirSync(output, { recursive: true });
    await second.scrollIntoViewIfNeeded();
    await page.screenshot({ path: resolve(output, `keyboard-${width}.png`), fullPage: true });
    await testInfo.attach(`keyboard-${width}-evidence`, {
      body: JSON.stringify({ width, nativeKeys: ['Tab', 'Space', 'Enter'], cycles: 3, evidenceUnchanged: before === after, errors }),
      contentType: 'application/json'
    });
  });
}