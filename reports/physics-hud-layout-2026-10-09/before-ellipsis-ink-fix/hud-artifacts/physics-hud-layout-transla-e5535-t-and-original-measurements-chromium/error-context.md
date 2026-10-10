# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: physics-hud-layout.spec.ts >> translated run identities and energy labels retain complete text and original measurements
- Location: tests\e2e\physics-hud-layout.spec.ts:159:5

# Error details

```
Error: oversized-grapheme final native ink: …

expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  20  |     let id = 0, now = 1000, nativeMode = false;
  21  |     const frames = new Map<number, FrameRequestCallback>(), running = new Map<number, { callback: FrameRequestCallback; nativeId: number }>();
  22  |     const queueNative = (key: number, callback: FrameRequestCallback) => running.set(key, { callback, nativeId: nativeRaf(time => { running.delete(key); callback(time); }) });
  23  |     window.requestAnimationFrame = callback => { const key = ++id; if (nativeMode) queueNative(key, callback); else frames.set(key, callback); return key; };
  24  |     window.cancelAnimationFrame = key => { frames.delete(key); const pending = running.get(key); if (pending) { nativeCancel(pending.nativeId); running.delete(key); } };
  25  |     w.__hudTick = () => { now += 1000 / 60; const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now)); };
  26  |     w.__hudNative = (enabled: boolean) => {
  27  |       if (enabled && (document.getElementById('physicsCanvas') as any)?.dataset.simSpeed !== '0') throw Error('Native captures require paused playback');
  28  |       nativeMode = enabled;
  29  |       if (enabled) { const pending = [...frames.entries()]; frames.clear(); pending.forEach(([key, callback]) => queueNative(key, callback)); }
  30  |       else { for (const [key, pending] of running) { nativeCancel(pending.nativeId); frames.set(key, pending.callback); } running.clear(); }
  31  |     };
  32  |     w.__hudSettle = () => new Promise<void>(resolve => nativeRaf(() => nativeRaf(() => resolve())));
  33  |     w.__hudText = [];
  34  |     const proto = CanvasRenderingContext2D.prototype, fillText = proto.fillText, clearRect = proto.clearRect;
  35  |     proto.clearRect = function (x, y, width, height) {
  36  |       if (this.canvas.id === 'physicsCanvas' && x === 0 && y === 0 && width >= this.canvas.width && height >= this.canvas.height) w.__hudText = [];
  37  |       return clearRect.call(this, x, y, width, height);
  38  |     };
  39  |     proto.fillText = function (value, x, y, maxWidth?) {
  40  |       if (this.canvas.id === 'physicsCanvas') {
  41  |         const metrics = this.measureText(value), t = this.getTransform(), rect = this.canvas.getBoundingClientRect();
  42  |         const project = (px: number, py: number) => ({ x: (t.a * px + t.c * py + t.e) * rect.width / this.canvas.width, y: (t.b * px + t.d * py + t.f) * rect.height / this.canvas.height });
  43  |         const corners = [project(x - metrics.actualBoundingBoxLeft, y - metrics.actualBoundingBoxAscent), project(x + metrics.actualBoundingBoxRight, y - metrics.actualBoundingBoxAscent), project(x - metrics.actualBoundingBoxLeft, y + metrics.actualBoundingBoxDescent), project(x + metrics.actualBoundingBoxRight, y + metrics.actualBoundingBoxDescent)], origin = project(x, y);
  44  |         w.__hudText.push({ text: String(value), fontSize: Number(this.font.match(/([\d.]+)px/)?.[1] || 0) * Math.hypot(t.a, t.b) * rect.width / this.canvas.width,
  45  |           x: origin.x, y: origin.y, left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)), top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)), color: this.fillStyle, maxWidth: maxWidth === undefined ? null : maxWidth });
  46  |       }
  47  |       if (maxWidth === undefined) fillText.call(this, value, x, y); else fillText.call(this, value, x, y, maxWidth);
  48  |     };
  49  |   });
  50  |   await harness.mount(page, {}, undefined, { expectCanvas: false });
  51  |   await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  52  |   await page.evaluate(() => {
  53  |     const w = window as any, wrap = document.getElementById('wrap')!; wrap.style.width = '100%';
  54  |     const main = document.createElement('main'); wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
  55  |     const card = document.createElement('div'); main.insertBefore(card, wrap); card.appendChild(wrap);
  56  |     w.__hudTheme = (theme: string) => {
  57  |       w.__ctx.isDark = theme === 'dark'; w.__ctx.isContrast = theme === 'contrast'; w.__ctx.theme = theme;
  58  |       main.className = theme === 'default' ? '' : 'theme-' + theme;
  59  |       card.setAttribute('style', theme === 'dark' ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px' : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : ''); w.__rerender();
  60  |     };
  61  |   });
  62  | }
  63  | async function patch(page: Page, changes: object) {
  64  |   await page.evaluate(value => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, physics: { ...previous.physics, ...value } })), changes); await page.waitForTimeout(40);
  65  | }
  66  | async function launch(page: Page, complete = true) {
  67  |   await page.evaluate(() => (window as any).__hudNative(false));
  68  |   await patch(page, { angle: 45, velocity: 50, gravity: 25, launchHeight: 50, mass: 10, airResist: false, simSpeed: complete ? 1 : 0, showVectors: true, showEnergy: true, showOverlay: complete });
  69  |   await page.getByRole('button', { name: 'Launch!', exact: true }).click();
  70  |   if (complete) {
  71  |     const landed = await page.evaluate(() => { const w = window as any, cv = document.getElementById('physicsCanvas') as any; let steps = 0; while (cv._launched && steps++ < 1000) w.__hudTick(); return !cv._launched; });
  72  |     expect(landed).toBe(true);
  73  |     await page.waitForFunction(() => (window as any).__toolData.physics.runCount === 1, null, { polling: 20 });
  74  |     await page.locator('[data-physics-plot-flight="1"]').click(); await page.locator('[data-physics-plot-moment="apex"]').click();
  75  |   }
  76  |   await expect(page.locator('#physicsCanvas')).toHaveAttribute('data-sim-speed', '0');
  77  | }
  78  | async function evidence(page: Page) {
  79  |   return page.evaluate(() => {
  80  |     const cv = document.getElementById('physicsCanvas') as any, physics = (window as any).__toolData.physics;
  81  |     return { trails: cv._trails.map((trail: any) => ({ points: [...trail], parameters: trail.parameters, run: trail.run, apex: trail.apex, modelVersion: trail.modelVersion })), log: physics.runLog, recordedFlights: physics.recordedFlights,
  82  |       selection: cv._inspection ? { snapshot: cv._inspection.snapshot, index: cv._inspection.index, originalPoint: cv._inspection.trail[cv._inspection.index] } : null };
  83  |   });
  84  | }
  85  | async function labels(page: Page, changes: Record<string, string> | null) {
  86  |   await page.evaluate(value => { const w = window as any, cv = document.getElementById('physicsCanvas') as any; if (!w.__hudOriginalLabels) w.__hudOriginalLabels = { ...cv._L }; cv._L = { ...w.__hudOriginalLabels, ...value }; cv._physScheduleFrame(); }, changes);
  87  | }
  88  | async function draw(page: Page) {
  89  |   return page.evaluate(async () => {
  90  |     const w = window as any, cv = document.getElementById('physicsCanvas') as any;
  91  |     w.__hudNative(true); cv._physScheduleFrame(); await w.__hudSettle(); await w.__hudSettle();
  92  |     const rect = cv.getBoundingClientRect(), context = cv.getContext('2d'), dx = cv.width / rect.width, dy = cv.height / rect.height;
  93  |     const texts = w.__hudText.map((paint: any) => {
  94  |       let inkPixels = 0;
  95  |       const rgb = /^#[\da-f]{6}$/i.test(paint.color) ? [1, 3, 5].map(start => parseInt(paint.color.slice(start, start + 2), 16)) : null;
  96  |       if (rgb && paint.right > paint.left && paint.bottom > paint.top) {
  97  |         const x = Math.max(0, Math.floor(paint.left * dx)), y = Math.max(0, Math.floor(paint.top * dy));
  98  |         const width = Math.max(0, Math.min(cv.width, Math.ceil(paint.right * dx)) - x), height = Math.max(0, Math.min(cv.height, Math.ceil(paint.bottom * dy)) - y);
  99  |         if (width && height) { const pixels = context.getImageData(x, y, width, height).data; for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] === 255 && rgb.every((value, channel) => Math.abs(value - pixels[i + channel]) <= 4)) inkPixels++; }
  100 |       }
  101 |       return { ...paint, inkPixels };
  102 |     });
  103 |     return { width: rect.width, height: rect.height, texts, layout: cv._visualLayout, view: cv._launchView, telemetry: cv._visualTelemetry, energy: cv._visualEnergy,
  104 |       description: cv.getAttribute('aria-description'), documentWidth: document.documentElement.scrollWidth, viewportWidth: document.documentElement.clientWidth,
  105 |       marker: cv._visualInspection, selected: cv._inspection?.snapshot, originalPoint: cv._inspection?.trail[cv._inspection.index], ball: cv._ball ? { t: cv._ball.t, vx: cv._ball.mVx, vy: cv._ball.mVy } : null, launched: cv._launched };
  106 |   });
  107 | }
  108 | function readable(result: Awaited<ReturnType<typeof draw>>, name: string) {
  109 |   const header = (result.texts as Paint[]).filter(paint => paint.y < result.layout.plotTop - 18), footer = (result.texts as Paint[]).filter(paint => paint.y > result.layout.groundY + 48);
  110 |   expect(header.length, name + ' native header calls').toBeGreaterThanOrEqual(7);
  111 |   expect(footer.length, name + ' native energy calls').toBeGreaterThanOrEqual(5);
  112 |   expect(result.documentWidth, name + ' document width').toBeLessThanOrEqual(result.viewportWidth + 1);
  113 |   for (const [region, entries] of [['header', header], ['footer', footer]] as const) for (const [index, paint] of entries.entries()) {
  114 |     expect(paint.fontSize, name + ' font: ' + paint.text).toBeGreaterThanOrEqual(11.99);
  115 |     expect(paint.maxWidth, name + ' no horizontal font compression: ' + paint.text).toBeNull();
  116 |     expect(paint.left, name + ' left: ' + paint.text).toBeGreaterThanOrEqual(10);
  117 |     expect(paint.right, name + ' right: ' + paint.text).toBeLessThanOrEqual(result.width - 10);
  118 |     expect(paint.top, name + ' top: ' + paint.text).toBeGreaterThanOrEqual(region === 'header' ? 0 : result.layout.groundY + 48);
  119 |     expect(paint.bottom, name + ' bottom: ' + paint.text).toBeLessThanOrEqual(region === 'header' ? result.layout.plotTop - 18 : result.height - 2);
> 120 |     expect(paint.inkPixels, name + ' final native ink: ' + paint.text).toBeGreaterThan(0);
      |                                                                        ^ Error: oversized-grapheme final native ink: …
  121 |     for (const other of entries.slice(index + 1)) expect(paint.left < other.right && paint.right > other.left && paint.top < other.bottom && paint.bottom > other.top, `${name}: ${paint.text} overlaps ${other.text}`).toBe(false);
  122 |   }
  123 |   expect(header.some(paint => paint.fontSize >= 13.99), name + ' 14px heading').toBe(true); expect(result.description).toBeTruthy();
  124 |   return { header, footer };
  125 | }
  126 | async function capture(page: Page, name: string) {
  127 |   const result = await draw(page), regions = readable(result, name), file = name + '.png';
  128 |   await page.locator('#physicsCanvas').screenshot({ path: path.join(reports, file), animations: 'disabled' });
  129 |   captures.push({ name, file, ...result, ...regions }); return { ...result, ...regions };
  130 | }
  131 | const compact = (value: string) => value.replace(/\s/g, '');
  132 | 
  133 | test('native HUD and energy text fit extreme settings at three widths in every theme', async ({ page }) => {
  134 |   await mount(page); await launch(page, false);
  135 |   for (const width of [1100, 375, 320]) {
  136 |     await page.setViewportSize({ width, height: 1000 });
  137 |     for (const theme of ['default', 'dark', 'contrast']) {
  138 |       await page.evaluate(value => (window as any).__hudTheme(value), theme); await page.waitForTimeout(60);
  139 |       const result = await capture(page, `hud-${theme}-${width}`);
  140 |       expect(result.launched).toBe(true); expect(result.ball.t).toBe(0);
  141 |       expect(result.header.map(paint => paint.text).join(' ')).toContain('50 m/s'); expect(result.description).toContain('10 kg'); expect(result.description).toContain('25 m/s²');
  142 |       if (width === 1100) {
  143 |         expect(result.header.find(paint => paint.fontSize >= 13.99)?.y).toBeCloseTo(25, 6);
  144 |         expect(result.header.find(paint => paint.text.startsWith('g '))?.y).toBeCloseTo(47, 6);
  145 |         expect(result.header.find(paint => paint.text.includes('Current flight'))?.y).toBeCloseTo(68, 6);
  146 |         expect(result.header.find(paint => paint.text.startsWith('t '))?.y).toBeCloseTo(89, 6); expect(result.layout.plotTop).toBe(128);
  147 |       }
  148 |     }
  149 |   }
  150 |   await page.getByRole('button', { name: 'Advance 0.035 seconds (available when paused)', exact: true }).click();
  151 |   const stepped = await capture(page, 'paused-step');
  152 |   expect(stepped.ball.t).toBeCloseTo(0.035, 12);
  153 |   const readings = stepped.header.map(paint => paint.text);
  154 |   expect(readings).toContain('t ' + stepped.ball.t.toFixed(2) + ' s');
  155 |   expect(readings).toContain('Vx ' + stepped.ball.vx.toFixed(1) + ' m/s');
  156 |   expect(readings).toContain('Vy ' + stepped.ball.vy.toFixed(1) + ' m/s');
  157 | });
  158 | 
  159 | test('translated run identities and energy labels retain complete text and original measurements', async ({ page }) => {
  160 |   await page.setViewportSize({ width: 320, height: 1000 }); await mount(page); await launch(page); const before = await evidence(page);
  161 |   const fixtures = [
  162 |     { name: 'long-translation', values: { runPrefix: 'ComparisonRecordingWithoutWhitespaceABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', selectedPoint: 'Original selected measurement from the recorded trajectory', vacuum: 'Without atmospheric resistance', initialEnergy: 'Initial mechanical energy for this recorded launch', selectedEnergy: 'Energy at the original selected recorded point', ke: 'Kinetic energy of the moving projectile', pe: 'Gravitational potential energy above ground', dragLoss: 'Energy transferred by air resistance' } },
  163 |     { name: 'arabic-emoji', values: { runPrefix: 'التجربة المسجلة 🧑‍🚀 ', selectedPoint: 'موضع القياس الأصلي في مسار المقذوف', vacuum: 'بدون مقاومة الهواء', initialEnergy: 'الطاقة الميكانيكية الابتدائية 🚀', selectedEnergy: 'الطاقة عند النقطة المحددة', ke: 'الطاقة الحركية', pe: 'طاقة وضع الجاذبية', dragLoss: 'الطاقة المفقودة' } },
  164 |   ];
  165 |   for (const fixture of fixtures) {
  166 |     await labels(page, fixture.values); const result = await capture(page, fixture.name), painted = compact([...result.header, ...result.footer].map(paint => paint.text).join(''));
  167 |     for (const value of Object.values(fixture.values)) { expect(painted, fixture.name + ' retains ' + value).toContain(compact(value)); expect(result.description).toContain(value); }
  168 |     expect(await evidence(page)).toEqual(before); expect(result.selected.t).toBe(before.selection!.snapshot.t);
  169 |   }
  170 |   const cluster = '\u0915' + '\u094d\u0915'.repeat(60);
  171 |   await labels(page, { runPrefix: cluster, selectedEnergy: cluster }); const result = await capture(page, 'oversized-grapheme');
  172 |   expect(result.description).toContain(cluster); expect(result.header.some(paint => paint.text.includes('…'))).toBe(true); expect(result.footer.some(paint => paint.text.includes('…'))).toBe(true);
  173 |   expect([...result.header, ...result.footer].some(paint => paint.text.includes('\u0915') || paint.text.includes('\u094d'))).toBe(false); expect(await evidence(page)).toEqual(before);
  174 | });
  175 | 
  176 | test('wrapping preserves plot space and restores the original selected sample through resizing', async ({ page }) => {
  177 |   await page.setViewportSize({ width: 375, height: 1000 }); await mount(page); await launch(page);
  178 |   const before = await evidence(page), base = await capture(page, 'growth-base');
  179 |   const translations = { runPrefix: 'A recorded comparison trajectory with a fully visible identity ', selectedPoint: 'The originally recorded selected measurement', initialEnergy: 'The initial mechanical energy before this trajectory started', selectedEnergy: 'Energy at the currently selected original recorded moment', ke: 'Kinetic energy', pe: 'Gravitational potential energy', dragLoss: 'Energy transferred to air' };
  180 |   await labels(page, translations);
  181 |   const grown = await capture(page, 'growth-expanded');
  182 |   expect(grown.height).toBeGreaterThan(base.height); expect(grown.layout.groundY - grown.layout.plotTop).toBeCloseTo(base.layout.groundY - base.layout.plotTop, 6);
  183 |   expect(grown.view.scale).toBeCloseTo(base.view.scale, 9); expect(grown.marker.x).toBeCloseTo(base.marker.x, 9);
  184 |   expect(grown.layout.groundY - grown.marker.y).toBeCloseTo(base.layout.groundY - base.marker.y, 9);
  185 |   const headerGrowth = grown.layout.plotTop - base.layout.plotTop, footerGrowth = (grown.height - grown.layout.groundY) - (base.height - base.layout.groundY);
  186 |   expect(headerGrowth).toBeGreaterThan(0); expect(footerGrowth).toBeGreaterThan(0); expect(grown.height - base.height).toBeCloseTo(headerGrowth + footerGrowth, 6);
  187 |   await patch(page, { showEnergy: false }); await labels(page, translations); const hidden = await draw(page);
  188 |   expect(hidden.height).toBeCloseTo(grown.height - grown.energy.extraHeight, 6);
  189 |   expect(hidden.layout.plotTop).toBe(grown.layout.plotTop);
  190 |   expect(hidden.layout.groundY - hidden.layout.plotTop).toBeCloseTo(grown.layout.groundY - grown.layout.plotTop, 6);
  191 |   expect((hidden.texts as Paint[]).filter(paint => paint.y > hidden.layout.groundY + 48)).toEqual([]);
  192 |   expect(await evidence(page)).toEqual(before);
  193 |   await patch(page, { showEnergy: true }); await labels(page, translations);
  194 |   for (const width of [1100, 320, 375]) {
  195 |     await page.setViewportSize({ width, height: 1000 }); const resized = await capture(page, 'growth-resize-' + width);
  196 |     expect(resized.selected).toEqual(base.selected); expect(resized.originalPoint).toEqual(base.originalPoint); expect(await evidence(page)).toEqual(before);
  197 |   }
  198 |   await labels(page, null); const restored = await capture(page, 'growth-restored');
  199 |   expect(restored.height).toBeCloseTo(base.height, 6); expect(restored.layout.plotTop).toBe(base.layout.plotTop); expect(restored.view).toEqual(base.view);
  200 |   expect(restored.header).toEqual(base.header); expect(restored.footer).toEqual(base.footer); expect(await evidence(page)).toEqual(before);
  201 | });
  202 | 
```