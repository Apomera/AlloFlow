# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-label-layout.spec.ts >> touchscreen labels >> long selected labels fit their cards on a phone in dorsal view
- Location: tests\e2e\dissection-label-layout.spec.ts:59:7

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 0.2954845140859411
Received:   0.655470442120365
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { mkdir } from 'node:fs/promises';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  6   | const out = 'reports/dissection-label-layout-2026-09-27';
  7   | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  8   | test.afterAll(async () => { await harness.stop(); });
  9   | test.afterEach(async ({ page }) => { await harness.unmount(page); });
  10  | 
  11  | async function mount(page: Page, state: Record<string, unknown>) {
  12  |   await harness.mount(page, { dissection: { reducedMotion: true, soundEnabled: false, revealedLayers: { skin: true }, activeLayer: 'skin', ...state } }, undefined, { expectCanvas: false });
  13  |   await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  14  |   await page.locator('[data-diss-canvas]').scrollIntoViewIfNeeded();
  15  | }
  16  | 
  17  | // Observe real drawing coordinates after the renderer applies its transforms. This
  18  | // checks the painted glyphs and card, including mirrored views and device density.
  19  | async function paintedLabels(page: Page) {
  20  |   return page.locator('[data-diss-canvas]').evaluate((canvas: any) => {
  21  |     const ctx = canvas.getContext('2d');
  22  |     const originalRect = ctx.roundRect, originalText = ctx.fillText;
  23  |     let card: { x: number; y: number; width: number; height: number } | null = null;
  24  |     const labels: any[] = [];
  25  |     ctx.roundRect = function (x: number, y: number, width: number, height: number, ...rest: any[]) {
  26  |       const m = this.getTransform();
  27  |       const a = new DOMPoint(x, y).matrixTransform(m), b = new DOMPoint(x + width, y + height).matrixTransform(m);
  28  |       card = { x: Math.min(a.x, b.x) / canvas.width, y: Math.min(a.y, b.y) / canvas.height, width: Math.abs(b.x - a.x) / canvas.width, height: Math.abs(b.y - a.y) / canvas.height };
  29  |       return originalRect.call(this, x, y, width, height, ...rest);
  30  |     };
  31  |     ctx.fillText = function (text: string, x: number, y: number, ...rest: any[]) {
  32  |       const m = this.getTransform(), point = new DOMPoint(x, y).matrixTransform(m), width = this.measureText(text).width * m.a;
  33  |       labels.push({ text: String(text), x: point.x / canvas.width, y: point.y / canvas.height, width: width / canvas.width, card });
  34  |       return originalText.call(this, text, x, y, ...rest);
  35  |     };
  36  |     try { canvas._drawDissectionNow(); } finally { ctx.roundRect = originalRect; ctx.fillText = originalText; }
  37  |     return labels;
  38  |   });
  39  | }
  40  | 
  41  | test('the Labels toggle hides default labels on its first click and restores them', async ({ page }) => {
  42  |   await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', toolbarViewOpen: true });
  43  |   const button = page.getByRole('button', { name: 'Toggle organ name labels', exact: true });
  44  |   await expect(button).toHaveAttribute('aria-pressed', 'true');
  45  |   expect((await paintedLabels(page)).some(label => label.text === 'Dorsal Skin')).toBe(true);
  46  |   await button.click();
  47  |   await expect(button).toHaveAttribute('aria-pressed', 'false');
  48  |   await page.locator('[data-diss-canvas]').scrollIntoViewIfNeeded();
  49  |   expect((await paintedLabels(page)).some(label => label.text === 'Dorsal Skin')).toBe(false);
  50  |   await button.click();
  51  |   await expect(button).toHaveAttribute('aria-pressed', 'true');
  52  |   await page.locator('[data-diss-canvas]').scrollIntoViewIfNeeded();
  53  |   expect((await paintedLabels(page)).some(label => label.text === 'Dorsal Skin')).toBe(true);
  54  | });
  55  | 
  56  | test.describe('touchscreen labels', () => {
  57  | test.use({ hasTouch: true, isMobile: true });
  58  | for (const view of ['dorsal', 'ventral']) {
  59  |   test(`long selected labels fit their cards on a phone in ${view} view`, async ({ page }) => {
  60  |     await page.setViewportSize({ width: 390, height: 844 });
  61  |     await mount(page, { specimen: 'sheepHeart', _dissLoadedSpec: 'sheepHeart', anatomicalView: view, selectedOrgan: 'sup_vena_h', largeText: true });
  62  |     const labels = await paintedLabels(page);
  63  |     const first = labels.find(label => label.text.includes('Cranial'));
  64  |     expect(first).toBeTruthy();
  65  |     const lines = labels.filter(label => label.card && JSON.stringify(label.card) === JSON.stringify(first.card));
  66  |     expect(lines.length).toBeGreaterThan(1);
  67  |     expect(lines.map(line => line.text).join(' ')).toContain('Cranial (Superior) Vena Cava');
  68  |     for (const line of lines) {
  69  |       expect(line.width).toBeGreaterThan(0);
  70  |       expect(line.x).toBeGreaterThanOrEqual(line.card.x - 0.002);
  71  |       expect(line.x + line.width).toBeLessThanOrEqual(line.card.x + line.card.width + 0.002);
  72  |       expect(line.y).toBeGreaterThan(line.card.y);
> 73  |       expect(line.y).toBeLessThan(line.card.y + line.card.height);
      |                      ^ Error: expect(received).toBeLessThan(expected)
  74  |     }
  75  |     expect(first.card.x).toBeGreaterThan(0);
  76  |     expect(first.card.x + first.card.width).toBeLessThan(1);
  77  |     await page.locator('.diss-stage').screenshot({ path: out + `/heart-label-${view}.png` });
  78  |   });
  79  | }
  80  | });
  81  | 
  82  | test('lateral perch preserves its drawing proportions and the visible label selects its structure', async ({ page }) => {
  83  |   await page.setViewportSize({ width: 1440, height: 1100 });
  84  |   await mount(page, { specimen: 'perch', _dissLoadedSpec: 'perch', anatomicalView: 'lateral' });
  85  |   const canvas = page.locator('[data-diss-canvas]');
  86  |   const bodyScales = await canvas.evaluate((el: any) => {
  87  |     const ctx = el.getContext('2d'), original = ctx.moveTo, scales: number[] = [];
  88  |     ctx.moveTo = function (x: number, y: number) {
  89  |       if (Math.abs(x - el._logicalW * 0.2) < 0.01 && Math.abs(y - el._logicalH * 0.45) < 0.01) scales.push(this.getTransform().a / el._dpr);
  90  |       return original.call(this, x, y);
  91  |     };
  92  |     try { el._drawDissectionNow(); } finally { ctx.moveTo = original; }
  93  |     return scales;
  94  |   });
  95  |   expect(bodyScales.length).toBeGreaterThan(0);
  96  |   for (const scale of bodyScales) { expect(scale).toBeGreaterThan(0.96); expect(scale).toBeLessThan(1.04); }
  97  |   const label = (await paintedLabels(page)).find(item => item.text === 'Ctenoid Scales');
  98  |   expect(label).toBeTruthy();
  99  |   const box = (await canvas.boundingBox())!;
  100 |   await page.mouse.click(box.x + (label.card.x + label.card.width / 2) * box.width, box.y + (label.card.y + label.card.height / 2) * box.height);
  101 |   await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.selectedOrgan)).toBe('scales');
  102 |   await canvas.screenshot({ path: out + '/perch-lateral.png' });
  103 | });
  104 | 
  105 | test('phone labels leave the frog hotspot markers exposed', async ({ page }) => {
  106 |   await page.setViewportSize({ width: 390, height: 844 });
  107 |   await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', anatomicalView: 'dorsal' });
  108 |   const canvas = page.locator('[data-diss-canvas]');
  109 |   const markers = await canvas.evaluate((el: any) => {
  110 |     const ctx = el.getContext('2d'), original = ctx.arc, points: { x: number; y: number }[] = [];
  111 |     ctx.arc = function (x: number, y: number, radius: number, ...rest: any[]) {
  112 |       if (radius === 5) {
  113 |         const point = new DOMPoint(x, y).matrixTransform(this.getTransform());
  114 |         points.push({ x: point.x / el.width, y: point.y / el.height });
  115 |       }
  116 |       return original.call(this, x, y, radius, ...rest);
  117 |     };
  118 |     try { el._drawDissectionNow(); } finally { ctx.arc = original; }
  119 |     return points;
  120 |   });
  121 |   const names = ['Dorsal Skin', 'Ventral Skin', 'Nictitating Membrane', 'Tympanic Membrane'];
  122 |   const cards = (await paintedLabels(page)).filter(label => names.some(name => label.text.startsWith(name))).map(label => label.card);
  123 |   expect(cards.length).toBe(4);
  124 |   expect(markers.length).toBeGreaterThanOrEqual(3);
  125 |   for (const card of cards) {
  126 |     for (const marker of markers) {
  127 |       expect(marker.x > card.x && marker.x < card.x + card.width && marker.y > card.y && marker.y < card.y + card.height).toBe(false);
  128 |     }
  129 |   }
  130 |   await canvas.screenshot({ path: out + '/frog-phone.png' });
  131 | });
  132 | 
```