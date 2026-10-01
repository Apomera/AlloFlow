# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-footer.spec.ts >> heart trace runs only with the living model and follows its pause control
- Location: tests\e2e\dissection-footer.spec.ts:97:5

# Error details

```
Error: expect(received).not.toEqual(expected) // deep equality

Expected: not [41, 45, 60, 255, 41, 45, 59, 255, 41, 45, …]


Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Test source

```ts
  9   | test.afterAll(async () => { await harness.stop(); });
  10  | test.afterEach(async ({ page }) => { await harness.unmount(page); });
  11  | 
  12  | async function mount(page: Page, state: Record<string, unknown>) {
  13  |   await harness.mount(page, { dissection: { specimen: 'sheepHeart', _dissLoadedSpec: 'sheepHeart', activeLayer: 'skin', revealedLayers: { skin: true }, reducedMotion: true, soundEnabled: false, ...state } }, undefined, { expectCanvas: false });
  14  |   await page.evaluate(() => {
  15  |     const viewport = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
  16  |     viewport.setAttribute('name', 'viewport'); viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  17  |   });
  18  |   await page.addStyleTag({ content: '#wrap { width:100% !important; max-width:1180px; }' });
  19  |   await page.locator('[data-diss-canvas]').scrollIntoViewIfNeeded();
  20  | }
  21  | 
  22  | async function paint(page: Page) {
  23  |   return page.locator('[data-diss-canvas]').evaluate((canvas: any) => {
  24  |     const ctx = canvas.getContext('2d'), originalText = ctx.fillText, originalRound = ctx.roundRect, originalFill = ctx.fillRect;
  25  |     const labels: any[] = [], panels: any[] = [];
  26  |     const box = (x: number, y: number, w: number, h: number) => {
  27  |       const m = ctx.getTransform(), a = new DOMPoint(x, y).matrixTransform(m), b = new DOMPoint(x + w, y + h).matrixTransform(m);
  28  |       return { x: Math.min(a.x, b.x) / canvas.width, y: Math.min(a.y, b.y) / canvas.height, w: Math.abs(b.x - a.x) / canvas.width, h: Math.abs(b.y - a.y) / canvas.height };
  29  |     };
  30  |     ctx.roundRect = function (x: number, y: number, w: number, h: number, ...rest: any[]) { panels.push(box(x, y, w, h)); return originalRound.call(this, x, y, w, h, ...rest); };
  31  |     ctx.fillRect = function (x: number, y: number, w: number, h: number) { if (w > 60 && h > 20) panels.push(box(x, y, w, h)); return originalFill.call(this, x, y, w, h); };
  32  |     ctx.fillText = function (text: string, x: number, y: number, ...rest: any[]) {
  33  |       const m = this.measureText(text);
  34  |       labels.push({ text: String(text), ...box(x - m.actualBoundingBoxLeft, y - m.actualBoundingBoxAscent, m.actualBoundingBoxLeft + m.actualBoundingBoxRight, m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) });
  35  |       return originalText.call(this, text, x, y, ...rest);
  36  |     };
  37  |     try { canvas._drawDissectionNow(); } finally { ctx.fillText = originalText; ctx.roundRect = originalRound; ctx.fillRect = originalFill; }
  38  |     return { labels, panels };
  39  |   });
  40  | }
  41  | 
  42  | function panelFor(drawing: Awaited<ReturnType<typeof paint>>, text: string) {
  43  |   const label = drawing.labels.find(item => item.text.replace(/\s+/g, ' ') === text.replace(/\s+/g, ' '));
  44  |   expect(label, text).toBeTruthy();
  45  |   const panel = drawing.panels.filter(item => label.x >= item.x - .001 && label.y >= item.y - .001 && label.x + label.w <= item.x + item.w + .001 && label.y + label.h <= item.y + item.h + .001).sort((a, b) => a.w * a.h - b.w * b.h)[0];
  46  |   expect(panel, 'background for ' + text).toBeTruthy();
  47  |   return panel;
  48  | }
  49  | 
  50  | test.describe('phone footer', () => {
  51  |   test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  52  |   test('numbered guidance opens the matching list without changing saved evidence', async ({ page }) => {
  53  |     const notes = { 'sheepHeart|sup_vena_h': 'My saved observation' }, confidence = { 'sheepHeart|sup_vena_h': 2 };
  54  |     await mount(page, { selectedOrgan: 'sup_vena_h', largeText: true, organSearch: 'old filter', directoryFilter: 'recorded', organNotes: notes, organConfidence: confidence });
  55  |     const guide = page.locator('[data-diss-marker-guide]');
  56  |     await expect(guide).toBeVisible();
  57  |     expect(await guide.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  58  |     const drawing = await paint(page);
  59  |     expect(drawing.labels.some(item => item.text.includes('Adaptive labels') || item.text.includes('BPM') || item.text === 'MODEL TRACE')).toBe(false);
  60  |     await page.locator('.diss-stage').screenshot({ path: out + '/phone-preserved-heart.png' });
  61  |     await guide.getByRole('button', { name: 'Browse structures', exact: true }).tap();
  62  |     await expect(page.locator('#diss-organ-search')).toBeFocused();
  63  |     await expect(page.locator('#diss-directory-results .diss-directory-index')).toHaveCount(7);
  64  |     const state = await page.evaluate(() => (window as any).__ctx.toolData.dissection);
  65  |     expect(state.organNotes).toEqual(notes); expect(state.organConfidence).toEqual(confidence);
  66  |     expect(state.selectedOrgan).toBeNull(); expect(state.organSearch).toBe(''); expect(state.directoryFilter).toBe('all');
  67  |   });
  68  | 
  69  |   for (const anatomicalView of ['dorsal', 'ventral']) {
  70  |     test(`living trace and scale stay separate through zoom in ${anatomicalView}`, async ({ page }) => {
  71  |       await mount(page, { workspaceMode: 'advanced', livingFunctionEnabled: true, anatomicalView, largeText: true, sceneDetail: false });
  72  |       const initial = await paint(page);
  73  |       const trace = panelFor(initial, 'MODEL TRACE'), living = panelFor(initial, 'LIVING FUNCTION MODEL'), scale = panelFor(initial, 'BASE ↑ ↓ APEX');
  74  |       for (const [a, b] of [[trace, living], [trace, scale], [living, scale]]) {
  75  |         expect(Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))).toBeLessThan(.0001);
  76  |       }
  77  |       await page.evaluate(() => (window as any).__ctx.update('dissection', 'canvasZoom', 2));
  78  |       await expect.poll(() => page.locator('[data-diss-canvas]').evaluate((el: any) => el._drawD.canvasZoom)).toBe(2);
  79  |       expect(panelFor(await paint(page), 'MODEL TRACE')).toEqual(trace);
  80  |       await page.locator('.diss-stage').screenshot({ path: out + `/phone-model-${anatomicalView}.png` });
  81  |     });
  82  |   }
  83  | });
  84  | 
  85  | test('guide follows compact labels and is absent during assessment', async ({ page }) => {
  86  |   await page.setViewportSize({ width: 1440, height: 1100 });
  87  |   await mount(page, { specimen: 'frog', _dissLoadedSpec: 'frog', labelMode: 'show' });
  88  |   const guide = page.locator('[data-diss-marker-guide]');
  89  |   await paint(page); await expect(guide).toBeHidden();
  90  |   await page.evaluate(() => (window as any).__ctx.update('dissection', 'labelMode', 'hidden'));
  91  |   await expect(guide).toBeVisible();
  92  |   await page.evaluate(() => (window as any).__ctx.update('dissection', 'quizMode', true));
  93  |   await expect(guide).toHaveCount(0);
  94  |   expect((await paint(page)).labels.some(item => item.text === 'MODEL TRACE')).toBe(false);
  95  | });
  96  | 
  97  | test('heart trace runs only with the living model and follows its pause control', async ({ page }) => {
  98  |   await page.setViewportSize({ width: 1440, height: 1100 });
  99  |   await page.emulateMedia({ reducedMotion: 'no-preference' });
  100 |   await mount(page, { workspaceMode: 'advanced', livingFunctionEnabled: true, reducedMotion: false, sceneDetail: false });
  101 |   const canvas = page.locator('[data-diss-canvas]');
  102 |   const trace = panelFor(await paint(page), 'MODEL TRACE');
  103 |   const pixels = () => canvas.evaluate((el: any, area: any) => {
  104 |     el._drawDissectionNow();
  105 |     return Array.from(el.getContext('2d').getImageData(Math.ceil(area.x * el.width) + 2, Math.ceil(area.y * el.height) + 2, Math.floor(area.w * el.width) - 4, Math.floor(area.h * el.height) - 4).data);
  106 |   }, trace);
  107 |   const running = await pixels();
  108 |   console.log('trace motion diagnostic', await canvas.evaluate((el: any) => ({ reduced: el._dissMotionReduced, stateReduced: el._drawD.reducedMotion, paused: el._drawD.livingFunctionPaused, enabled: el._drawD.livingFunctionEnabled, workspace: el._drawD.workspaceMode, elapsed: el._livingFunctionElapsedMs, last: el._livingFunctionLastAt, now: performance.now(), inView: el._dissInViewport, hidden: document.hidden, raf: el._dissAnim, media: matchMedia('(prefers-reduced-motion: reduce)').matches, accessibility: localStorage.getItem('dissection_accessibility_preferences') })));
> 109 |   await expect.poll(pixels).not.toEqual(running);
      |                                 ^ Error: expect(received).not.toEqual(expected) // deep equality
  110 |   await page.evaluate(() => (window as any).__ctx.update('dissection', 'livingFunctionPaused', true));
  111 |   await expect.poll(() => canvas.evaluate((el: any) => el._drawD.livingFunctionPaused)).toBe(true);
  112 |   const paused = await pixels();
  113 |   await page.waitForTimeout(150);
  114 |   expect(await pixels()).toEqual(paused);
  115 |   await page.evaluate(() => (window as any).__ctx.update('dissection', 'livingFunctionEnabled', false));
  116 |   await expect.poll(async () => (await paint(page)).labels.some(item => item.text === 'MODEL TRACE')).toBe(false);
  117 | });
  118 | 
```