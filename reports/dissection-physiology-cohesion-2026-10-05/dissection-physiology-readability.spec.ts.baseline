import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const out = 'reports/dissection-physiology-readability-2026-09-28';
test.describe.configure({ retries: 0 });
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.unmount(page); });

async function mount(page: Page, state: Record<string, unknown> = {}) {
  await harness.mount(page, { dissection: { specimen: 'sheepHeart', _dissLoadedSpec: 'sheepHeart', workspaceMode: 'advanced', activeLayer: 'organs', revealedLayers: { skin: true, organs: true }, livingFunctionEnabled: true, traceCirculation: true, reducedMotion: true, soundEnabled: false, largeText: true, sceneDetail: false, ...state } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
    viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  });
  await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  const canvas = page.locator('[data-diss-canvas]');
  await expect(canvas).toBeVisible();
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((el: any) => el._dissInViewport)).toBe(true);
  await expect(canvas).toHaveAttribute('data-dissection-hud', 'detailed');
}

async function paint(page: Page) {
  return page.locator('[data-diss-canvas]').evaluate((el: any) => {
    const ctx = el.getContext('2d'), text = ctx.fillText, round = ctx.roundRect;
    const labels: any[] = [], panels: any[] = [];
    const box = (x: number, y: number, w: number, h: number) => {
      const a = new DOMPoint(x, y).matrixTransform(ctx.getTransform()), b = new DOMPoint(x + w, y + h).matrixTransform(ctx.getTransform());
      return { x: Math.min(a.x, b.x) / el.width, y: Math.min(a.y, b.y) / el.height, w: Math.abs(b.x - a.x) / el.width, h: Math.abs(b.y - a.y) / el.height };
    };
    ctx.roundRect = function (x: number, y: number, w: number, h: number, ...rest: any[]) { panels.push(box(x, y, w, h)); return round.call(this, x, y, w, h, ...rest); };
    ctx.fillText = function (value: string, x: number, y: number, ...rest: any[]) {
      const m = this.measureText(value), fontPx = Number(this.font.match(/([\d.]+)px/)[1]);
      labels.push({ text: String(value), alpha: this.globalAlpha, cssFont: fontPx * this.getTransform().a / el.width * el.getBoundingClientRect().width, ...box(x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent, m.actualBoundingBoxLeft + m.actualBoundingBoxRight, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) });
      return text.call(this, value, x, y, ...rest);
    };
    try { el._drawDissectionNow(); } finally { ctx.fillText = text; ctx.roundRect = round; }
    return { labels, panels };
  });
}

const contains = (panel: any, label: any) => label.x >= panel.x - .001 && label.y >= panel.y - .001 && label.x + label.w <= panel.x + panel.w + .001 && label.y + label.h <= panel.y + panel.h + .001;

for (const width of [390, 320]) {
  test(`physiology captions fit opaque panels at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await mount(page, { highContrast: width === 320 });
    const drawing = await paint(page);
    const model = drawing.labels.find(label => label.text === 'LIVING MODEL');
    const pathway = drawing.labels.find(label => label.y > .8 && label.text.startsWith('♥ Circulatory'));
    const scale = drawing.labels.find(label => label.text.replace(/\s+/g, ' ') === 'BASE ↑ ↓ APEX');
    const panels = [model, pathway, scale].map(label => {
      expect(label).toBeTruthy();
      const panel = drawing.panels.filter(item => contains(item, label)).sort((a, b) => a.w * a.h - b.w * b.h)[0];
      expect(panel).toBeTruthy(); return panel;
    });
    expect(model.cssFont).toBeGreaterThanOrEqual(12);
    expect(pathway.cssFont).toBeGreaterThanOrEqual(11);
    expect(pathway.text).not.toContain('…');
    expect(drawing.labels.some(label => label.y > .7 && (label.text === 'Internal' || label.text.endsWith('Internal Layer')))).toBe(true);
    for (const label of [model, pathway, ...drawing.labels.filter(label => label.text.includes('STATIC') || label.text === 'REDUCED MOTION')]) {
      expect(label.alpha).toBe(1);
      expect(panels.some(panel => contains(panel, label)), label.text).toBe(true);
    }
    for (const [a, b] of [[panels[0], panels[1]], [panels[0], panels[2]], [panels[1], panels[2]]]) {
      expect(Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))).toBeLessThan(.0001);
    }
    await page.locator('.diss-stage').screenshot({ path: `${out}/physiology-${width}.png` });
  });
}

test('readable controls report static, paused, playing and off states', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, { reducedMotion: false });
  await page.getByText('Systems and physiology tools', { exact: true }).click();
  const model = page.getByRole('group', { name: 'Specimen-specific living function model', exact: true });
  const badge = model.locator('.diss-living-function__badge');
  const pathway = page.locator('.diss-system-playback');
  await expect(badge).toHaveText('Static · reduced motion');
  await expect(pathway).toContainText('Static directions · reduced motion');
  for (const controls of [model, pathway]) {
    expect(await controls.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    for (const button of await controls.getByRole('button').all()) {
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await button.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13);
    }
  }
  await model.getByRole('button', { name: '⏸ Pause', exact: true }).click();
  await expect(model.getByRole('button', { name: '▶ Resume', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(badge).toHaveText('Static · reduced motion');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await model.getByRole('button', { name: 'Cycle living function speed', exact: true }).click();
  await expect(badge).toHaveText('Paused · slow');
  await expect(model).toHaveAttribute('data-motion', 'paused');
  await model.screenshot({ path: `${out}/model-controls-phone.png` });
  await model.getByRole('button', { name: '▶ Resume', exact: true }).click();
  await expect(badge).toHaveText('Playing · slow');
  await page.evaluate(() => (window as any).__ctx.update('dissection', 'reducedMotion', true));
  await expect(badge).toHaveText('Static · reduced motion');
  await model.getByRole('button', { name: 'Function model on', exact: true }).click();
  await expect(badge).toHaveText('Off · preserved view remains static');
  await expect(model.getByRole('button', { name: '↻ Replay', exact: true })).toBeDisabled();
});
