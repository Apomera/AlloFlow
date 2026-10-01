# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-physiology-readability.spec.ts >> physiology captions fit opaque panels at 390px
- Location: tests\e2e\dissection-physiology-readability.spec.ts:49:7

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 11
Received:    10.6201468125
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { mkdir } from 'node:fs/promises';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  6   | const out = 'reports/dissection-physiology-readability-2026-09-28';
  7   | test.describe.configure({ retries: 0 });
  8   | test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  9   | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  10  | test.afterAll(async () => { await harness.stop(); });
  11  | test.afterEach(async ({ page }) => { await harness.unmount(page); });
  12  | 
  13  | async function mount(page: Page, state: Record<string, unknown> = {}) {
  14  |   await harness.mount(page, { dissection: { specimen: 'sheepHeart', _dissLoadedSpec: 'sheepHeart', workspaceMode: 'advanced', activeLayer: 'organs', revealedLayers: { skin: true, organs: true }, livingFunctionEnabled: true, traceCirculation: true, reducedMotion: true, soundEnabled: false, largeText: true, sceneDetail: false, ...state } }, undefined, { expectCanvas: false });
  15  |   await page.evaluate(() => {
  16  |     const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
  17  |     viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  18  |   });
  19  |   await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  20  |   const canvas = page.locator('[data-diss-canvas]');
  21  |   await expect(canvas).toBeVisible();
  22  |   await canvas.scrollIntoViewIfNeeded();
  23  |   await expect.poll(() => canvas.evaluate((el: any) => el._dissInViewport)).toBe(true);
  24  |   await expect(canvas).toHaveAttribute('data-dissection-hud', 'detailed');
  25  | }
  26  | 
  27  | async function paint(page: Page) {
  28  |   return page.locator('[data-diss-canvas]').evaluate((el: any) => {
  29  |     const ctx = el.getContext('2d'), text = ctx.fillText, round = ctx.roundRect;
  30  |     const labels: any[] = [], panels: any[] = [];
  31  |     const box = (x: number, y: number, w: number, h: number) => {
  32  |       const a = new DOMPoint(x, y).matrixTransform(ctx.getTransform()), b = new DOMPoint(x + w, y + h).matrixTransform(ctx.getTransform());
  33  |       return { x: Math.min(a.x, b.x) / el.width, y: Math.min(a.y, b.y) / el.height, w: Math.abs(b.x - a.x) / el.width, h: Math.abs(b.y - a.y) / el.height };
  34  |     };
  35  |     ctx.roundRect = function (x: number, y: number, w: number, h: number, ...rest: any[]) { panels.push(box(x, y, w, h)); return round.call(this, x, y, w, h, ...rest); };
  36  |     ctx.fillText = function (value: string, x: number, y: number, ...rest: any[]) {
  37  |       const m = this.measureText(value), fontPx = Number(this.font.match(/([\d.]+)px/)[1]);
  38  |       labels.push({ text: String(value), alpha: this.globalAlpha, cssFont: fontPx * this.getTransform().a / el.width * el.getBoundingClientRect().width, ...box(x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent, m.actualBoundingBoxLeft + m.actualBoundingBoxRight, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) });
  39  |       return text.call(this, value, x, y, ...rest);
  40  |     };
  41  |     try { el._drawDissectionNow(); } finally { ctx.fillText = text; ctx.roundRect = round; }
  42  |     return { labels, panels };
  43  |   });
  44  | }
  45  | 
  46  | const contains = (panel: any, label: any) => label.x >= panel.x - .001 && label.y >= panel.y - .001 && label.x + label.w <= panel.x + panel.w + .001 && label.y + label.h <= panel.y + panel.h + .001;
  47  | 
  48  | for (const width of [390, 320]) {
  49  |   test(`physiology captions fit opaque panels at ${width}px`, async ({ page }) => {
  50  |     await page.setViewportSize({ width, height: 844 });
  51  |     await mount(page, { highContrast: width === 320 });
  52  |     const drawing = await paint(page);
  53  |     const model = drawing.labels.find(label => label.text === 'LIVING MODEL');
  54  |     const pathway = drawing.labels.find(label => label.text.includes('Circulatory'));
  55  |     const scale = drawing.labels.find(label => label.text.replace(/\s+/g, ' ') === 'BASE ↑ ↓ APEX');
  56  |     const panels = [model, pathway, scale].map(label => {
  57  |       expect(label).toBeTruthy();
  58  |       const panel = drawing.panels.filter(item => contains(item, label)).sort((a, b) => a.w * a.h - b.w * b.h)[0];
  59  |       expect(panel).toBeTruthy(); return panel;
  60  |     });
  61  |     expect(model.cssFont).toBeGreaterThanOrEqual(12);
> 62  |     expect(pathway.cssFont).toBeGreaterThanOrEqual(11);
      |                             ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  63  |     for (const label of [model, pathway, ...drawing.labels.filter(label => label.text.includes('STATIC') || label.text === 'REDUCED MOTION')]) {
  64  |       expect(label.alpha).toBe(1);
  65  |       expect(panels.some(panel => contains(panel, label)), label.text).toBe(true);
  66  |     }
  67  |     for (const [a, b] of [[panels[0], panels[1]], [panels[0], panels[2]], [panels[1], panels[2]]]) {
  68  |       expect(Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))).toBeLessThan(.0001);
  69  |     }
  70  |     await page.locator('.diss-stage').screenshot({ path: `${out}/physiology-${width}.png` });
  71  |   });
  72  | }
  73  | 
  74  | test('readable controls report static, paused, playing and off states', async ({ page }) => {
  75  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  76  |   await mount(page, { reducedMotion: false });
  77  |   await page.getByText('Systems and physiology tools', { exact: true }).click();
  78  |   const model = page.getByRole('group', { name: 'Specimen-specific living function model', exact: true });
  79  |   const badge = model.locator('.diss-living-function__badge');
  80  |   const pathway = page.locator('.diss-system-playback');
  81  |   await expect(badge).toHaveText('Static · reduced motion');
  82  |   await expect(pathway).toContainText('Static directions · reduced motion');
  83  |   for (const controls of [model, pathway]) {
  84  |     expect(await controls.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  85  |     for (const button of await controls.getByRole('button').all()) {
  86  |       expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  87  |       expect(await button.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(13);
  88  |     }
  89  |   }
  90  |   await model.getByRole('button', { name: '⏸ Pause', exact: true }).click();
  91  |   await expect(model.getByRole('button', { name: '▶ Resume', exact: true })).toHaveAttribute('aria-pressed', 'true');
  92  |   await expect(badge).toHaveText('Static · reduced motion');
  93  |   await page.emulateMedia({ reducedMotion: 'no-preference' });
  94  |   await model.getByRole('button', { name: 'Cycle living function speed', exact: true }).click();
  95  |   await expect(badge).toHaveText('Paused · slow');
  96  |   await expect(model).toHaveAttribute('data-motion', 'paused');
  97  |   await model.screenshot({ path: `${out}/model-controls-phone.png` });
  98  |   await model.getByRole('button', { name: '▶ Resume', exact: true }).click();
  99  |   await expect(badge).toHaveText('Playing · slow');
  100 |   await page.evaluate(() => (window as any).__ctx.update('dissection', 'reducedMotion', true));
  101 |   await expect(badge).toHaveText('Static · reduced motion');
  102 |   await model.getByRole('button', { name: 'Function model on', exact: true }).click();
  103 |   await expect(badge).toHaveText('Off · preserved view remains static');
  104 |   await expect(model.getByRole('button', { name: '↻ Replay', exact: true })).toBeDisabled();
  105 | });
  106 | 
```