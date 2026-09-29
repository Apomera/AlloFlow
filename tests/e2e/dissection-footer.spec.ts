import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-footer-2026-09-28';
test.describe.configure({ retries: 0 });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

async function mount(page: Page, state: Record<string, unknown>) {
  await harness.mount(page, { dissection: { specimen: 'sheepHeart', _dissLoadedSpec: 'sheepHeart', activeLayer: 'skin', revealedLayers: { skin: true }, reducedMotion: true, soundEnabled: false, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  const canvas = page.locator('[data-diss-canvas]');
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((el: any) => el._dissInViewport)).toBe(true);
  await expect(canvas).toHaveAttribute('data-dissection-hud', /compact|detailed/);
}

async function paint(page: Page) {
  return page.locator('[data-diss-canvas]').evaluate((canvas: any) => {
    const ctx = canvas.getContext('2d'), originalText = ctx.fillText, originalRound = ctx.roundRect, originalFill = ctx.fillRect;
    const labels: any[] = [], panels: any[] = [];
    const box = (x: number, y: number, w: number, h: number) => {
      const m = ctx.getTransform(), a = new DOMPoint(x, y).matrixTransform(m), b = new DOMPoint(x + w, y + h).matrixTransform(m);
      return { x: Math.min(a.x, b.x) / canvas.width, y: Math.min(a.y, b.y) / canvas.height, w: Math.abs(b.x - a.x) / canvas.width, h: Math.abs(b.y - a.y) / canvas.height };
    };
    ctx.roundRect = function (x: number, y: number, w: number, h: number, ...rest: any[]) { panels.push(box(x, y, w, h)); return originalRound.call(this, x, y, w, h, ...rest); };
    ctx.fillRect = function (x: number, y: number, w: number, h: number) { if (w > 60 && h > 20) panels.push(box(x, y, w, h)); return originalFill.call(this, x, y, w, h); };
    ctx.fillText = function (text: string, x: number, y: number, ...rest: any[]) {
      const m = this.measureText(text);
      labels.push({ text: String(text), ...box(x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent, m.actualBoundingBoxLeft + m.actualBoundingBoxRight, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) });
      return originalText.call(this, text, x, y, ...rest);
    };
    try { canvas._drawDissectionNow(); } finally { ctx.fillText = originalText; ctx.roundRect = originalRound; ctx.fillRect = originalFill; }
    return { labels, panels };
  });
}

function panelFor(drawing: Awaited<ReturnType<typeof paint>>, text: string) {
  const label = drawing.labels.find(item => item.text.replace(/\s+/g, ' ') === text.replace(/\s+/g, ' '));
  expect(label, text).toBeTruthy();
  const panel = drawing.panels.filter(item => label.x >= item.x - .001 && label.y >= item.y - .001 && label.x + label.w <= item.x + item.w + .001 && label.y + label.h <= item.y + item.h + .001).sort((a, b) => a.w * a.h - b.w * b.h)[0];
  expect(panel, 'background for ' + text).toBeTruthy();
  return panel;
}

test.describe('phone footer', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('numbered guidance opens the matching list without changing saved evidence', async ({ page }) => {
    const notes = { 'sheepHeart|sup_vena_h': 'My saved observation' }, confidence = { 'sheepHeart|sup_vena_h': 2 };
    await mount(page, { selectedOrgan: 'sup_vena_h', largeText: true, organSearch: 'old filter', directoryFilter: 'recorded', organNotes: notes, organConfidence: confidence });
    const guide = page.locator('[data-diss-marker-guide]');
    await expect(guide).toBeVisible();
    expect(await guide.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    const drawing = await paint(page);
    expect(drawing.labels.some(item => item.text.includes('Adaptive labels') || item.text.includes('BPM') || item.text === 'MODEL TRACE')).toBe(false);
    await page.locator('.diss-stage').screenshot({ path: out + '/phone-preserved-heart.png' });
    await guide.getByRole('button', { name: 'Browse structures', exact: true }).tap();
    await expect(page.locator('#diss-organ-search')).toBeFocused();
    await expect(page.locator('#diss-directory-results .diss-directory-index')).toHaveCount(7);
    const state = await page.evaluate(() => (window as any).__ctx.toolData.dissection);
    expect(state.organNotes).toEqual(notes); expect(state.organConfidence).toEqual(confidence);
    expect(state.selectedOrgan).toBeNull(); expect(state.organSearch).toBe(''); expect(state.directoryFilter).toBe('all');
  });

  for (const anatomicalView of ['dorsal', 'ventral']) {
    test(`living trace and scale stay separate through zoom in ${anatomicalView}`, async ({ page }) => {
      await mount(page, { workspaceMode: 'advanced', livingFunctionEnabled: true, anatomicalView, largeText: true, sceneDetail: false });
      const initial = await paint(page);
      const trace = panelFor(initial, 'MODEL TRACE'), living = panelFor(initial, 'LIVING MODEL'), scale = panelFor(initial, 'BASE ↑ ↓ APEX');
      for (const [a, b] of [[trace, living], [trace, scale], [living, scale]]) {
        expect(Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))).toBeLessThan(.0001);
      }
      await page.locator('.diss-stage').screenshot({ path: out + `/phone-model-${anatomicalView}-overview.png` });
      await page.evaluate(() => (window as any).__ctx.update('dissection', 'canvasZoom', 2));
      await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((el: any) => el._drawD.canvasZoom)).toBe(2);
      expect(panelFor(await paint(page), 'MODEL TRACE')).toEqual(trace);
      await page.locator('.diss-stage').screenshot({ path: out + `/phone-model-${anatomicalView}.png` });
    });
  }
});

test('guide follows compact labels and is absent during assessment', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', labelMode: 'show' });
  const guide = page.locator('[data-diss-marker-guide]');
  await paint(page); await expect(guide).toBeHidden();
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'labelMode', 'hidden'));
  await expect(guide).toBeVisible();
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'quizMode', true));
  await expect(guide).toHaveCount(0);
  expect((await paint(page)).labels.some(item => item.text === 'MODEL TRACE')).toBe(false);
});

test('heart trace follows living-model playback, pause and reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await mount(page, { workspaceMode: 'advanced', livingFunctionEnabled: true, reducedMotion: false, sceneDetail: false });
  const canvas = page.locator('[data-diss-canvas]');
  const trace = panelFor(await paint(page), 'MODEL TRACE');
  const pixels = () => canvas.evaluate((el: any, area: any) => {
    // The model drops long frame gaps after a hidden tab or slow render. Supply a
    // normal interval to test playback deterministically on software-rendered CI.
    el._livingFunctionLastAt = performance.now() - 80;
    el._drawDissectionNow();
    return Array.from(el.getContext('2d').getImageData(Math.ceil(area.x * el.width) + 2, Math.ceil(area.y * el.height) + 2, Math.floor(area.w * el.width) - 4, Math.floor(area.h * el.height) - 4).data);
  }, trace);
  const running = await pixels();
  expect(await pixels()).not.toEqual(running);
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'livingFunctionPaused', true));
  await expect.poll(() => canvas.evaluate((el: any) => el._drawD.livingFunctionPaused)).toBe(true);
  const paused = await pixels();
  await page.waitForTimeout(150);
  expect(await pixels()).toEqual(paused);
  await page.evaluate(() => (window as any).__ctx.updateMulti('dissection', { livingFunctionPaused: false, reducedMotion: true }));
  await expect.poll(() => canvas.evaluate((el: any) => el._dissMotionReduced)).toBe(true);
  const reduced = await pixels();
  expect(await pixels()).toEqual(reduced);
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'livingFunctionEnabled', false));
  await expect.poll(async () => (await paint(page)).labels.some(item => item.text === 'MODEL TRACE')).toBe(false);
});
