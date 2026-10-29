import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900,
  layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-fullscreen-keyboard-2026-10-29';
test.describe.configure({ mode: 'serial', retries: 0, timeout: 90000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await mkdir(out, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

async function work(page: Page) {
  return page.evaluate(() => {
    const d = (window as any).__ctx.toolData.dissection;
    return Object.fromEntries(['selectedOrgan', 'annotateMode', 'rulerMode', 'annotations', 'organNotes', 'organConfidence',
      'exploredOrgans', 'verifiedIdentifications', 'quizScore', 'quizTotal'].map(key => [key, d[key]]));
  });
}

for (const scenario of [{ mode: 'selection', width: 1280 }, { mode: 'annotation', width: 390 }, { mode: 'ruler', width: 1280 }]) {
  test(`CSS fullscreen contains Tab and preserves ${scenario.mode} work on Escape`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: scenario.width, height: 900 });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
      workspaceMode: 'advanced', toolbarViewOpen: true, selectedOrgan: 'nictitating',
      annotateMode: scenario.mode === 'annotation', rulerMode: scenario.mode === 'ruler',
      annotations: [{ type: 'dot', x: .4, y: .4 }], exploredOrgans: { 'frog|nictitating': true },
      organNotes: { 'frog|nictitating': 'Keep the transparent membrane observation.' }, organConfidence: { 'frog|nictitating': 2 },
      verifiedIdentifications: {}, quizScore: 1, quizTotal: 2, reducedMotion: true, soundEnabled: false, sceneDetail: false,
    } }, undefined, { expectCanvas: false });
    await page.evaluate(() => {
      Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
      Object.defineProperty(document, 'webkitFullscreenEnabled', { configurable: true, value: false });
      const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
      meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
    });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    const before = await work(page);
    const entry = page.getByRole('button', { name: 'Enter fullscreen specimen mode with view and tool controls', exact: true });
    await entry.click();
    const stage = page.locator('[data-diss-fullscreen-stage]');
    const exit = stage.getByRole('button', { name: 'Exit fullscreen specimen mode', exact: true });
    const canvas = stage.locator('[data-diss-canvas]');
    await expect(stage).toHaveAttribute('data-allo-fullscreen-active', 'true');
    await expect(exit).toBeFocused();
    await page.keyboard.press('Shift+Tab'); await expect(canvas).toBeFocused();
    await page.keyboard.press('Tab'); await expect(exit).toBeFocused();
    // Check the entire cycle in real layout, including the editable dock controls.
    for (let index = 0; index < 16; index += 1) {
      await page.keyboard.press('Tab');
      expect(await stage.evaluate(node => node.contains(document.activeElement))).toBe(true);
    }
    const illumination = stage.getByRole('slider', { name: 'Fullscreen illumination intensity', exact: true });
    await illumination.focus();
    const previousLight = Number(await illumination.inputValue());
    await page.keyboard.press('ArrowLeft');
    await expect(illumination).toHaveValue(String(Math.max(20, previousLight - 2)));
    await expect(illumination).toBeFocused();
    expect(await work(page)).toEqual(before);
    await canvas.focus();
    await stage.screenshot({ path: `${out}/${scenario.mode}.png` });
    await page.keyboard.press('Escape');
    await expect(stage).not.toHaveAttribute('data-allo-fullscreen-active', 'true');
    await expect(entry).toBeFocused();
    expect(await work(page)).toEqual(before);
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    expect(errors).toEqual([]);
  });
}

for (const viewport of [{ width: 320, height: 568, largeText: false }, { width: 390, height: 600, largeText: true }, { width: 844, height: 390, largeText: false }]) {
  test(`fullscreen Exit stays reachable after scrolling tools at ${viewport.width} by ${viewport.height}`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await harness.mount(page, { dissection: {
      specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
      workspaceMode: 'advanced', toolbarViewOpen: true, selectedOrgan: 'nictitating',
      exploredOrgans: { 'frog|nictitating': true }, organNotes: { 'frog|nictitating': 'The exit must preserve this observation.' },
      organConfidence: { 'frog|nictitating': 2 }, reducedMotion: true, soundEnabled: false, sceneDetail: false,
      largeText: viewport.largeText, highContrast: viewport.largeText,
    } }, undefined, { expectCanvas: false });
    await page.evaluate(() => {
      Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false });
      Object.defineProperty(document, 'webkitFullscreenEnabled', { configurable: true, value: false });
      const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
      meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
    });
    await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
    const before = await work(page);
    const entry = page.getByRole('button', { name: 'Enter fullscreen specimen mode with view and tool controls', exact: true });
    await entry.click();
    const stage = page.locator('[data-diss-fullscreen-stage]');
    const exit = stage.getByRole('button', { name: 'Exit fullscreen specimen mode', exact: true });
    const tools = stage.locator('.diss-fullscreen-dock__controls');
    const instrument = stage.getByRole('combobox', { name: 'Fullscreen active instrument', exact: true });
    await expect(exit).toBeFocused();
    expect(await tools.evaluate(node => node.scrollHeight > node.clientHeight)).toBe(true);
    await tools.evaluate(node => { node.scrollTop = node.scrollHeight; });
    expect(await tools.evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    await expect(exit).toBeInViewport({ ratio: 1 });
    expect(await exit.evaluate(node => {
      const box = node.getBoundingClientRect();
      return node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })).toBe(true);
    await instrument.focus();
    await expect(instrument).toBeInViewport({ ratio: 1 });
    await expect(exit).toBeInViewport({ ratio: 1 });
    // Lower controls remain usable, and the visible exit has not covered them.
    expect(await instrument.evaluate(node => {
      const box = node.getBoundingClientRect();
      return node.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })).toBe(true);
    await stage.screenshot({ path: `${out}/exit-visible-${viewport.width}-${viewport.height}.png` });
    await exit.click();
    await expect(stage).not.toHaveAttribute('data-allo-fullscreen-active', 'true');
    await expect(entry).toBeFocused();
    expect(await work(page)).toEqual(before);
    expect(errors).toEqual([]);
  });
}
