# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 17-memory-palace-gl.spec.ts >> Memory Palace — real WebGL walk >> build mode picks the room under the pointer and rejects the hub
- Location: tests\e2e\17-memory-palace-gl.spec.ts:261:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  184 | 
  185 |   test('renders a scene that actually changes as you walk', async ({ page }) => {
  186 |     await mount(page);
  187 |     const canvas = page.locator('#wrap canvas');
  188 |     const atEntrance = await canvas.screenshot();
  189 |     const entrancePosition = await page.evaluate(() => (window as any).__lastCamera.position.toArray());
  190 |     await page.evaluate(() => (window as any).__handle.goTo(3));
  191 |     await expect.poll(() => page.evaluate(start => {
  192 |       const p=(window as any).__lastCamera.position;
  193 |       return Math.hypot(p.x-start[0],p.y-start[1],p.z-start[2]);
  194 |     }, entrancePosition), { timeout: 15000 }).toBeGreaterThan(100);
  195 |     const atLocus3 = await canvas.screenshot();
  196 |     expect(atEntrance.length).toBeGreaterThan(2000);
  197 |     // Different vantage ⇒ different pixels. This is the single strongest proof
  198 |     // that the scene renders AND the camera rail moves.
  199 |     expect(Buffer.compare(atEntrance, atLocus3)).not.toBe(0);
  200 |     const locus = await page.evaluate(() => (window as any).__events.locus);
  201 |     expect(locus.length).toBeGreaterThan(0);
  202 |     expect(locus[locus.length - 1].idx).toBe(3);
  203 |   });
  204 | 
  205 |   test('keeps multilingual captions bounded while rendering richer gallery depth', async ({ page }) => {
  206 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  207 |     const longData = {
  208 |       main: 'Multilingual memory gallery',
  209 |       branches: [
  210 |         { title: 'Long terms', items: ['Pneumonoultramicroscopicsilicovolcanoconiosis'.repeat(4)] },
  211 |         { title: '多言語', items: ['記憶の宮殿で学習内容を鮮明に整理して長期記憶へ結び付ける'.repeat(4)] },
  212 |       ],
  213 |     };
  214 |     await mount(page, longData);
  215 |     await page.evaluate(() => { document.body.classList.add('theme-contrast'); document.documentElement.style.fontSize = '24px'; (window as any).__handle.goTo(1); });
  216 |     await expect.poll(() => page.evaluate(() => {
  217 |       const captions = (window as any).__palaceVisualMetrics().captions;
  218 |       return captions.length === 2 && captions.every((c: any) => c.typographyKey.endsWith('|1')) && captions.find((c: any) => c.id === 'b0_i0')?.depthTest === false;
  219 |     }), { timeout: 15000 }).toBe(true);
  220 |     const metrics = await page.evaluate(() => (window as any).__palaceVisualMetrics());
  221 |     expect(metrics.roles['sky-dome']).toBe(1);
  222 |     expect(metrics.roles['frame-molding']).toBe(8);
  223 |     expect(metrics.roles['frame-contact-shadow']).toBe(2);
  224 |     expect(metrics.roles['architectural-trim']).toBeGreaterThanOrEqual(12);
  225 |     expect(metrics.roles['directional-runner']).toBe(2);
  226 |     expect(metrics.roles['active-room-light']).toBe(1);
  227 |     expect(metrics.captions).toHaveLength(2);
  228 |     metrics.captions.forEach((caption: any) => {
  229 |       expect(caption.width).toBeGreaterThan(80);
  230 |       expect(caption.width).toBeLessThan(370);
  231 |       expect(caption.typographyKey).toMatch(/\|1$/);
  232 |       expect(caption.visible).toBe(true);
  233 |     });
  234 |     const active = metrics.captions.find((caption: any) => caption.id === 'b0_i0');
  235 |     const distant = metrics.captions.find((caption: any) => caption.id === 'b1_i0');
  236 |     expect(active.depthTest).toBe(false); expect(active.renderOrder).toBe(24);
  237 |     expect(distant.depthTest).toBe(true); expect(distant.renderOrder).toBe(12);
  238 |     expect((await page.evaluate(() => (window as any).__glLive())).lost).toBe(false);
  239 |   });
  240 | 
  241 |   test('publishes an accessible route list covering every locus', async ({ page }) => {
  242 |     await mount(page);
  243 |     // Two lists by design: the sr-only one render() always emits (the a11y source
  244 |     // of truth, and the visible fallback if GL dies) plus the in-scene route
  245 |     // panel, which starts hidden so it cannot double-announce.
  246 |     expect(await page.locator('#wrap ol').count()).toBe(2);
  247 |     // 6 generated + 2 student-built + the entrance
  248 |     expect(await page.locator('#wrap ol').first().locator('li').count()).toBe(9);
  249 |     expect(await page.locator('#wrap ol').nth(1).locator('li').count()).toBe(9);
  250 |     const panelHidden = await page.evaluate(() => {
  251 |       const panel = document.querySelector('#wrap [id^="palace-route-panel"]') as HTMLElement | null;
  252 |       return panel ? panel.hidden : null;
  253 |     });
  254 |     expect(panelHidden).toBe(true);
  255 |     const all = await page.evaluate(() => document.querySelector('#wrap')?.textContent || '');
  256 |     expect(all).toContain('My own fact');      // student-built loci reach the a11y route
  257 |     expect(all).toContain('Attic thing');
  258 |     expect(all).toContain('golden steam');     // and generated mnemonics are read out
  259 |   });
  260 | 
  261 |   test('build mode picks the room under the pointer and rejects the hub', async ({ page }) => {
  262 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  263 |     await mount(page);
  264 |     const box = (await page.locator('#wrap canvas').boundingBox())!;
  265 |     // Focus the canvas FIRST (keyboard goes to the body otherwise, so 'o' would
  266 |     // silently do nothing) and only then arm build mode, so this focusing click
  267 |     // cannot itself place anything.
  268 |     await page.locator('#wrap canvas').click({ position: { x: 4, y: 4 } });
  269 |     await page.keyboard.press('o');            // overview: look down on the whole palace
  270 |     await expect.poll(() => page.evaluate(() => (window as any).__lastCamera.position.y)).toBeGreaterThan(1000);
  271 |     await page.evaluate(() => { (window as any).__handle.setBuildMode(true); });
  272 |     await expect(page.locator('[data-palace-overlay="journey"]')).toBeHidden();
  273 |     await page.waitForTimeout(200);
  274 |     // Scan a grid of clicks. Hits must name a real room; the exact centre is the
  275 |     // hub plaza, which is deliberately NOT placeable.
  276 |     for (let gx = 1; gx <= 5; gx++) {
  277 |       for (let gy = 1; gy <= 3; gy++) {
  278 |         await page.mouse.click(box.x + (box.width * gx) / 6, box.y + (box.height * gy) / 4);
  279 |       }
  280 |     }
  281 |     const floor = await page.evaluate(() => (window as any).__events.floor);
  282 |     expect(floor.length).toBeGreaterThan(0);
  283 |     const hits = floor.filter((f: any) => f && f.roomKey);
> 284 |     expect(hits.length).toBeGreaterThan(0);
      |                         ^ Error: expect(received).toBeGreaterThan(expected)
  285 |     const keys = [...new Set(hits.map((h: any) => h.roomKey))];
  286 |     keys.forEach((k) => expect(['b0', 'b1', 'b2', 'xr1']).toContain(k));
  287 |     // every hit reports a spot inside its room, in room-local coordinates
  288 |     hits.forEach((h: any) => {
  289 |       expect(Number.isFinite(h.lx)).toBe(true);
  290 |       expect(Number.isFinite(h.lz)).toBe(true);
  291 |       expect(typeof h.roomLabel).toBe('string');
  292 |     });
  293 |     // The hub plaza in the middle is deliberately not placeable: aiming there
  294 |     // reports null so the host can explain why, rather than silently doing nothing.
  295 |     expect(floor.some((f: any) => f === null)).toBe(true);
  296 |   });
  297 | 
  298 |   test('build mode is inert until it is switched on', async ({ page }) => {
  299 |     await mount(page);
  300 |     const box = (await page.locator('#wrap canvas').boundingBox())!;
  301 |     await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);
  302 |     await page.waitForTimeout(300);
  303 |     const floor = await page.evaluate(() => (window as any).__events.floor);
  304 |     expect(floor.length).toBe(0);
  305 |   });
  306 | 
  307 |   test('tears the GL context down on destroy', async ({ page }) => {
  308 |     await mount(page);
  309 |     const after = await page.evaluate(() => {
  310 |       (window as any).__handle.destroy();
  311 |       return { canvases: document.querySelectorAll('#wrap canvas').length };
  312 |     });
  313 |     expect(after.canvases).toBe(0);
  314 |   });
  315 | 
  316 |   test('walks the whole route without a single console error', async ({ page }) => {
  317 |     const consoleErrors: string[] = [];
  318 |     page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  319 |     page.on('pageerror', (e) => consoleErrors.push(String(e.message)));
  320 |     await mount(page);
  321 |     const total = await page.evaluate(() => (window as any).__events.locus[0]?.total ?? 9);
  322 |     for (let i = 0; i < total; i++) {
  323 |       await page.evaluate((n) => (window as any).__handle.goTo(n), i);
  324 |       await page.waitForTimeout(220);
  325 |     }
  326 |     await page.evaluate(() => (window as any).__handle.setLocusMnemonic('b0_i0', 'A kettle wearing my sneakers'));
  327 |     await page.evaluate(() => (window as any).__handle.destroy());
  328 |     const pageErrors = await page.evaluate(() => (window as any).__events.errors);
  329 |     expect(pageErrors).toEqual([]);
  330 |     // three.js CDN sourcemap chatter is not ours; anything else is
  331 |     const ours = consoleErrors.filter((e) => !/sourcemap|favicon/i.test(e));
  332 |     expect(ours).toEqual([]);
  333 |   });
  334 | 
  335 |   test('keeps compact controls clear, accessible, zoomable, and wall-aware', async ({ page }) => {
  336 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  337 |     await mount(page);
  338 |     await page.evaluate(() => {
  339 |       const wrap = document.getElementById('wrap') as HTMLElement;
  340 |       wrap.style.width = '390px'; wrap.style.height = '640px';
  341 |       document.documentElement.style.fontSize = '24px';
  342 |     });
  343 |     await page.waitForTimeout(700);
  344 | 
  345 |     const wrap = page.locator('#wrap');
  346 |     const viewport = wrap.locator('[data-memory-palace-viewport]');
  347 |     await expect(viewport).toHaveAttribute('data-palace-layout', 'compact');
  348 |     const helpButton = viewport.locator('[data-palace-action="help"]');
  349 |     const routeButton = viewport.locator('[data-palace-action="route"]');
  350 |     const zoomIn = viewport.locator('[data-palace-action="zoom-in"]');
  351 |     const zoomOut = viewport.locator('[data-palace-action="zoom-out"]');
  352 |     const reset = viewport.locator('[data-palace-action="reset-view"]');
  353 |     for (const control of [helpButton, routeButton, zoomIn, zoomOut, reset]) {
  354 |       const box = await control.boundingBox();
  355 |       expect(box).not.toBeNull(); expect(box!.width).toBeGreaterThanOrEqual(44); expect(box!.height).toBeGreaterThanOrEqual(44);
  356 |     }
  357 | 
  358 |     await routeButton.click();
  359 |     const routePanel = viewport.locator('[data-palace-overlay="route"]');
  360 |     await expect(routePanel).toBeVisible();
  361 |     await helpButton.click();
  362 |     const helpPanel = viewport.locator('[data-palace-overlay="help"]');
  363 |     await expect(helpPanel).toBeVisible();
  364 |     await expect(routePanel).toBeHidden();
  365 |     await expect(helpButton).toHaveAttribute('aria-expanded', 'true');
  366 |     const panelBox = (await helpPanel.boundingBox())!;
  367 |     const dockBox = (await viewport.locator('[data-palace-overlay="dock"]').boundingBox())!;
  368 |     expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(dockBox.y - 2);
  369 | 
  370 |     await page.keyboard.press('Escape');
  371 |     await expect(helpPanel).toBeHidden();
  372 |     await expect(helpButton).toBeFocused();
  373 | 
  374 |     const baseFov = await page.evaluate(() => (window as any).__lastCamera.fov);
  375 |     await zoomIn.click();
  376 |     expect(await page.evaluate(() => (window as any).__lastCamera.fov)).toBeLessThan(baseFov);
  377 |     await zoomOut.click();
  378 |     await reset.click();
  379 |     expect(await page.evaluate(() => (window as any).__lastCamera.fov)).toBe(58);
  380 | 
  381 |     await page.evaluate(() => (window as any).__handle.goTo(1));
  382 |     const canvas = wrap.locator('canvas');
  383 |     await canvas.focus();
  384 |     await page.keyboard.down('w');
```