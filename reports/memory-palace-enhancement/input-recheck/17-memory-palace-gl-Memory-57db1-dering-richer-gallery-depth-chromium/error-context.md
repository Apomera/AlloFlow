# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 17-memory-palace-gl.spec.ts >> Memory Palace — real WebGL walk >> keeps multilingual captions bounded while rendering richer gallery depth
- Location: tests\e2e\17-memory-palace-gl.spec.ts:201:7

# Error details

```
Error: expect(received).toMatch(expected)

Expected pattern: /\|1$/
Received string:  "1.000|\"Times New Roman\"|0px|0"
```

# Test source

```ts
  124 |       res.end('not found');
  125 |     }
  126 |   });
  127 |   await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  128 |   const addr = server.address();
  129 |   base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  130 | });
  131 | 
  132 | test.afterAll(async () => {
  133 |   await new Promise<void>((r) => server.close(() => r()));
  134 | });
  135 | 
  136 | /** Mount the palace and wait for the GL canvas to appear. */
  137 | async function mount(page: import('@playwright/test').Page, data: unknown = SAMPLE, opts: unknown = {}) {
  138 |   await page.goto(`${base}/__harness`);
  139 |   await page.waitForFunction(() => !!(window as any).AlloModules?.MemoryPalace);
  140 |   await page.evaluate(async () => {
  141 |     await (window as any).AlloModules.MemoryPalace.loadThree({});
  142 |     (window as any).__captureScene();
  143 |   });
  144 |   await page.evaluate(([d, o]) => (window as any).__mount(d, o), [data, opts] as [unknown, unknown]);
  145 |   await page.waitForSelector('#wrap canvas', { timeout: 20000 });
  146 |   await page.waitForTimeout(900);   // let three.js settle a few frames
  147 | }
  148 | 
  149 | // SwiftShader is a software rasteriser, so mounting a scene and especially
  150 | // reading pixels back out ("GPU stall due to ReadPixels") is far slower than a
  151 | // DOM test. The default 30s budget is not enough for a mount plus two canvas
  152 | // screenshots on a modest machine.
  153 | test.describe.configure({ timeout: 150_000 });
  154 | 
  155 | test.describe('Memory Palace — real WebGL walk', () => {
  156 |   // Chromium caps how many live WebGL contexts a process may hold and silently
  157 |   // kills the oldest past that. Every test here mounts a scene, so leaving them
  158 |   // alive makes later tests flaky for reasons that have nothing to do with the
  159 |   // code under test. Tearing down is also what the real view does on unmount.
  160 |   test.afterEach(async ({ page }) => {
  161 |     await page.evaluate(() => { try { (window as any).__handle?.destroy(); } catch { /* already gone */ } }).catch(() => {});
  162 |   });
  163 | 
  164 |   test('mounts a live GL canvas that fills its container', async ({ page }) => {
  165 |     await mount(page);
  166 |     const gl = await page.evaluate(() => (window as any).__glLive());
  167 |     expect(gl).not.toBeNull();
  168 |     expect(gl.lost).toBe(false);
  169 |     // The historical bug: clientWidth was read once at mount, so the canvas froze
  170 |     // at ~60% when the panel expanded afterwards.
  171 |     const wrap = await page.locator('#wrap').boundingBox();
  172 |     expect(gl.w).toBeGreaterThan((wrap!.width) - 8);
  173 |     expect(gl.h).toBeGreaterThan(400);
  174 |   });
  175 | 
  176 |   test('refits when its container resizes after mount', async ({ page }) => {
  177 |     await mount(page);
  178 |     await page.evaluate(() => { (document.getElementById('wrap') as HTMLElement).style.width = '520px'; });
  179 |     await page.waitForTimeout(700);   // ResizeObserver + next-frame refit
  180 |     const gl = await page.evaluate(() => (window as any).__glLive());
  181 |     expect(gl.w).toBeLessThan(540);
  182 |     expect(gl.w).toBeGreaterThan(500);
  183 |   });
  184 | 
  185 |   test('renders a scene that actually changes as you walk', async ({ page }) => {
  186 |     await mount(page);
  187 |     const canvas = page.locator('#wrap canvas');
  188 |     const atEntrance = await canvas.screenshot();
  189 |     await page.evaluate(() => (window as any).__handle.goTo(3));
  190 |     await expect.poll(() => page.evaluate(() => (window as any).__palaceVisualMetrics().captions.find((c: any) => c.id === 'b0_i0')?.depthTest), { timeout: 15000 }).toBe(false);   // camera eases along the rail
  191 |     const atLocus3 = await canvas.screenshot();
  192 |     expect(atEntrance.length).toBeGreaterThan(2000);
  193 |     // Different vantage ⇒ different pixels. This is the single strongest proof
  194 |     // that the scene renders AND the camera rail moves.
  195 |     expect(Buffer.compare(atEntrance, atLocus3)).not.toBe(0);
  196 |     const locus = await page.evaluate(() => (window as any).__events.locus);
  197 |     expect(locus.length).toBeGreaterThan(0);
  198 |     expect(locus[locus.length - 1].idx).toBe(3);
  199 |   });
  200 | 
  201 |   test('keeps multilingual captions bounded while rendering richer gallery depth', async ({ page }) => {
  202 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  203 |     const longData = {
  204 |       main: 'Multilingual memory gallery',
  205 |       branches: [
  206 |         { title: 'Long terms', items: ['Pneumonoultramicroscopicsilicovolcanoconiosis'.repeat(4)] },
  207 |         { title: '多言語', items: ['記憶の宮殿で学習内容を鮮明に整理して長期記憶へ結び付ける'.repeat(4)] },
  208 |       ],
  209 |     };
  210 |     await mount(page, longData);
  211 |     await page.evaluate(() => { document.body.classList.add('theme-contrast'); document.documentElement.style.fontSize = '24px'; (window as any).__handle.goTo(1); });
  212 |     await page.waitForTimeout(1200);
  213 |     const metrics = await page.evaluate(() => (window as any).__palaceVisualMetrics());
  214 |     expect(metrics.roles['sky-dome']).toBe(1);
  215 |     expect(metrics.roles['frame-molding']).toBe(8);
  216 |     expect(metrics.roles['frame-contact-shadow']).toBe(2);
  217 |     expect(metrics.roles['architectural-trim']).toBeGreaterThanOrEqual(12);
  218 |     expect(metrics.roles['directional-runner']).toBe(2);
  219 |     expect(metrics.roles['active-room-light']).toBe(1);
  220 |     expect(metrics.captions).toHaveLength(2);
  221 |     metrics.captions.forEach((caption: any) => {
  222 |       expect(caption.width).toBeGreaterThan(80);
  223 |       expect(caption.width).toBeLessThan(370);
> 224 |       expect(caption.typographyKey).toMatch(/\|1$/);
      |                                     ^ Error: expect(received).toMatch(expected)
  225 |       expect(caption.visible).toBe(true);
  226 |     });
  227 |     const active = metrics.captions.find((caption: any) => caption.id === 'b0_i0');
  228 |     const distant = metrics.captions.find((caption: any) => caption.id === 'b1_i0');
  229 |     expect(active.depthTest).toBe(false); expect(active.renderOrder).toBe(24);
  230 |     expect(distant.depthTest).toBe(true); expect(distant.renderOrder).toBe(12);
  231 |     expect((await page.evaluate(() => (window as any).__glLive())).lost).toBe(false);
  232 |   });
  233 | 
  234 |   test('publishes an accessible route list covering every locus', async ({ page }) => {
  235 |     await mount(page);
  236 |     // Two lists by design: the sr-only one render() always emits (the a11y source
  237 |     // of truth, and the visible fallback if GL dies) plus the in-scene route
  238 |     // panel, which starts hidden so it cannot double-announce.
  239 |     expect(await page.locator('#wrap ol').count()).toBe(2);
  240 |     // 6 generated + 2 student-built + the entrance
  241 |     expect(await page.locator('#wrap ol').first().locator('li').count()).toBe(9);
  242 |     expect(await page.locator('#wrap ol').nth(1).locator('li').count()).toBe(9);
  243 |     const panelHidden = await page.evaluate(() => {
  244 |       const panel = document.querySelector('#wrap [id^="palace-route-panel"]') as HTMLElement | null;
  245 |       return panel ? panel.hidden : null;
  246 |     });
  247 |     expect(panelHidden).toBe(true);
  248 |     const all = await page.evaluate(() => document.querySelector('#wrap')?.textContent || '');
  249 |     expect(all).toContain('My own fact');      // student-built loci reach the a11y route
  250 |     expect(all).toContain('Attic thing');
  251 |     expect(all).toContain('golden steam');     // and generated mnemonics are read out
  252 |   });
  253 | 
  254 |   test('build mode picks the room under the pointer and rejects the hub', async ({ page }) => {
  255 |     await mount(page);
  256 |     const box = (await page.locator('#wrap canvas').boundingBox())!;
  257 |     // Focus the canvas FIRST (keyboard goes to the body otherwise, so 'o' would
  258 |     // silently do nothing) and only then arm build mode, so this focusing click
  259 |     // cannot itself place anything.
  260 |     await page.locator('#wrap canvas').click({ position: { x: 4, y: 4 } });
  261 |     await page.keyboard.press('o');            // overview: look down on the whole palace
  262 |     await page.waitForTimeout(1000);
  263 |     await page.evaluate(() => { (window as any).__handle.setBuildMode(true); });
  264 |     await expect(page.locator('[data-palace-overlay="journey"]')).toBeHidden();
  265 |     await page.waitForTimeout(200);
  266 |     // Scan a grid of clicks. Hits must name a real room; the exact centre is the
  267 |     // hub plaza, which is deliberately NOT placeable.
  268 |     for (let gx = 1; gx <= 5; gx++) {
  269 |       for (let gy = 1; gy <= 3; gy++) {
  270 |         await page.mouse.click(box.x + (box.width * gx) / 6, box.y + (box.height * gy) / 4);
  271 |       }
  272 |     }
  273 |     const floor = await page.evaluate(() => (window as any).__events.floor);
  274 |     expect(floor.length).toBeGreaterThan(0);
  275 |     const hits = floor.filter((f: any) => f && f.roomKey);
  276 |     expect(hits.length).toBeGreaterThan(0);
  277 |     const keys = [...new Set(hits.map((h: any) => h.roomKey))];
  278 |     keys.forEach((k) => expect(['b0', 'b1', 'b2', 'xr1']).toContain(k));
  279 |     // every hit reports a spot inside its room, in room-local coordinates
  280 |     hits.forEach((h: any) => {
  281 |       expect(Number.isFinite(h.lx)).toBe(true);
  282 |       expect(Number.isFinite(h.lz)).toBe(true);
  283 |       expect(typeof h.roomLabel).toBe('string');
  284 |     });
  285 |     // The hub plaza in the middle is deliberately not placeable: aiming there
  286 |     // reports null so the host can explain why, rather than silently doing nothing.
  287 |     expect(floor.some((f: any) => f === null)).toBe(true);
  288 |   });
  289 | 
  290 |   test('build mode is inert until it is switched on', async ({ page }) => {
  291 |     await mount(page);
  292 |     const box = (await page.locator('#wrap canvas').boundingBox())!;
  293 |     await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
  294 |     await page.waitForTimeout(300);
  295 |     const floor = await page.evaluate(() => (window as any).__events.floor);
  296 |     expect(floor.length).toBe(0);
  297 |   });
  298 | 
  299 |   test('tears the GL context down on destroy', async ({ page }) => {
  300 |     await mount(page);
  301 |     const after = await page.evaluate(() => {
  302 |       (window as any).__handle.destroy();
  303 |       return { canvases: document.querySelectorAll('#wrap canvas').length };
  304 |     });
  305 |     expect(after.canvases).toBe(0);
  306 |   });
  307 | 
  308 |   test('walks the whole route without a single console error', async ({ page }) => {
  309 |     const consoleErrors: string[] = [];
  310 |     page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  311 |     page.on('pageerror', (e) => consoleErrors.push(String(e.message)));
  312 |     await mount(page);
  313 |     const total = await page.evaluate(() => (window as any).__events.locus[0]?.total ?? 9);
  314 |     for (let i = 0; i < total; i++) {
  315 |       await page.evaluate((n) => (window as any).__handle.goTo(n), i);
  316 |       await page.waitForTimeout(220);
  317 |     }
  318 |     await page.evaluate(() => (window as any).__handle.setLocusMnemonic('b0_i0', 'A kettle wearing my sneakers'));
  319 |     await page.evaluate(() => (window as any).__handle.destroy());
  320 |     const pageErrors = await page.evaluate(() => (window as any).__events.errors);
  321 |     expect(pageErrors).toEqual([]);
  322 |     // three.js CDN sourcemap chatter is not ours; anything else is
  323 |     const ours = consoleErrors.filter((e) => !/sourcemap|favicon/i.test(e));
  324 |     expect(ours).toEqual([]);
```