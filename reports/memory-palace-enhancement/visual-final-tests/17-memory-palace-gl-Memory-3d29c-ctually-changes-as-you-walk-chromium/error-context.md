# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 17-memory-palace-gl.spec.ts >> Memory Palace — real WebGL walk >> renders a scene that actually changes as you walk
- Location: tests\e2e\17-memory-palace-gl.spec.ts:185:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true

Call Log:
- Timeout 15000ms exceeded while waiting on the predicate
```

# Test source

```ts
  90  |   };
  91  |   window.__palaceVisualMetrics = function () {
  92  |     var out = { captions: [], roles: {} };
  93  |     if (!window.__lastScene) return out;
  94  |     window.__lastScene.traverse(function (o) {
  95  |       var role = o.userData && o.userData.visualRole;
  96  |       if (role) out.roles[role] = (out.roles[role] || 0) + 1;
  97  |       if (role === 'locus-caption') out.captions.push({ id: o.userData.locusId, width: o.userData.baseScale && o.userData.baseScale.x, height: o.userData.baseScale && o.userData.baseScale.y, typographyKey: o.userData.typographyKey, depthTest: o.material && o.material.depthTest, renderOrder: o.renderOrder, visible: o.visible });
  98  |     });
  99  |     return out;
  100 |   };
  101 | </script></body></html>`;
  102 | 
  103 | let server: Server;
  104 | let base: string;
  105 | 
  106 | test.beforeAll(async () => {
  107 |   server = createServer(async (req, res) => {
  108 |     const url = (req.url || '/').split('?')[0];
  109 |     if (url === '/__harness') {
  110 |       res.writeHead(200, { 'content-type': MIME['.html'] });
  111 |       res.end(HARNESS);
  112 |       return;
  113 |     }
  114 |     try {
  115 |       // serve the working tree, refusing to climb out of it
  116 |       const rel = normalize(decodeURIComponent(url)).replace(/^([/\\])+/, '');
  117 |       const file = join(ROOT, rel);
  118 |       if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('no'); return; }
  119 |       const body = await readFile(file);
  120 |       res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
  121 |       res.end(body);
  122 |     } catch {
  123 |       res.writeHead(404);
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
> 190 |     await expect.poll(() => page.evaluate(() => (window as any).__palaceVisualMetrics().captions.find((c: any) => c.id === 'xl1')?.depthTest), { timeout: 15000 }).toBe(false);
      |                                                                                                                                                                    ^ Error: expect(received).toBe(expected) // Object.is equality
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
  212 |     await expect.poll(() => page.evaluate(() => {
  213 |       const captions = (window as any).__palaceVisualMetrics().captions;
  214 |       return captions.length === 2 && captions.every((c: any) => c.typographyKey.endsWith('|1')) && captions.find((c: any) => c.id === 'b0_i0')?.depthTest === false;
  215 |     }), { timeout: 15000 }).toBe(true);
  216 |     const metrics = await page.evaluate(() => (window as any).__palaceVisualMetrics());
  217 |     expect(metrics.roles['sky-dome']).toBe(1);
  218 |     expect(metrics.roles['frame-molding']).toBe(8);
  219 |     expect(metrics.roles['frame-contact-shadow']).toBe(2);
  220 |     expect(metrics.roles['architectural-trim']).toBeGreaterThanOrEqual(12);
  221 |     expect(metrics.roles['directional-runner']).toBe(2);
  222 |     expect(metrics.roles['active-room-light']).toBe(1);
  223 |     expect(metrics.captions).toHaveLength(2);
  224 |     metrics.captions.forEach((caption: any) => {
  225 |       expect(caption.width).toBeGreaterThan(80);
  226 |       expect(caption.width).toBeLessThan(370);
  227 |       expect(caption.typographyKey).toMatch(/\|1$/);
  228 |       expect(caption.visible).toBe(true);
  229 |     });
  230 |     const active = metrics.captions.find((caption: any) => caption.id === 'b0_i0');
  231 |     const distant = metrics.captions.find((caption: any) => caption.id === 'b1_i0');
  232 |     expect(active.depthTest).toBe(false); expect(active.renderOrder).toBe(24);
  233 |     expect(distant.depthTest).toBe(true); expect(distant.renderOrder).toBe(12);
  234 |     expect((await page.evaluate(() => (window as any).__glLive())).lost).toBe(false);
  235 |   });
  236 | 
  237 |   test('publishes an accessible route list covering every locus', async ({ page }) => {
  238 |     await mount(page);
  239 |     // Two lists by design: the sr-only one render() always emits (the a11y source
  240 |     // of truth, and the visible fallback if GL dies) plus the in-scene route
  241 |     // panel, which starts hidden so it cannot double-announce.
  242 |     expect(await page.locator('#wrap ol').count()).toBe(2);
  243 |     // 6 generated + 2 student-built + the entrance
  244 |     expect(await page.locator('#wrap ol').first().locator('li').count()).toBe(9);
  245 |     expect(await page.locator('#wrap ol').nth(1).locator('li').count()).toBe(9);
  246 |     const panelHidden = await page.evaluate(() => {
  247 |       const panel = document.querySelector('#wrap [id^="palace-route-panel"]') as HTMLElement | null;
  248 |       return panel ? panel.hidden : null;
  249 |     });
  250 |     expect(panelHidden).toBe(true);
  251 |     const all = await page.evaluate(() => document.querySelector('#wrap')?.textContent || '');
  252 |     expect(all).toContain('My own fact');      // student-built loci reach the a11y route
  253 |     expect(all).toContain('Attic thing');
  254 |     expect(all).toContain('golden steam');     // and generated mnemonics are read out
  255 |   });
  256 | 
  257 |   test('build mode picks the room under the pointer and rejects the hub', async ({ page }) => {
  258 |     await mount(page);
  259 |     const box = (await page.locator('#wrap canvas').boundingBox())!;
  260 |     // Focus the canvas FIRST (keyboard goes to the body otherwise, so 'o' would
  261 |     // silently do nothing) and only then arm build mode, so this focusing click
  262 |     // cannot itself place anything.
  263 |     await page.locator('#wrap canvas').click({ position: { x: 4, y: 4 } });
  264 |     await page.keyboard.press('o');            // overview: look down on the whole palace
  265 |     await page.waitForTimeout(1000);
  266 |     await page.evaluate(() => { (window as any).__handle.setBuildMode(true); });
  267 |     await expect(page.locator('[data-palace-overlay="journey"]')).toBeHidden();
  268 |     await page.waitForTimeout(200);
  269 |     // Scan a grid of clicks. Hits must name a real room; the exact centre is the
  270 |     // hub plaza, which is deliberately NOT placeable.
  271 |     for (let gx = 1; gx <= 5; gx++) {
  272 |       for (let gy = 1; gy <= 3; gy++) {
  273 |         await page.mouse.click(box.x + (box.width * gx) / 6, box.y + (box.height * gy) / 4);
  274 |       }
  275 |     }
  276 |     const floor = await page.evaluate(() => (window as any).__events.floor);
  277 |     expect(floor.length).toBeGreaterThan(0);
  278 |     const hits = floor.filter((f: any) => f && f.roomKey);
  279 |     expect(hits.length).toBeGreaterThan(0);
  280 |     const keys = [...new Set(hits.map((h: any) => h.roomKey))];
  281 |     keys.forEach((k) => expect(['b0', 'b1', 'b2', 'xr1']).toContain(k));
  282 |     // every hit reports a spot inside its room, in room-local coordinates
  283 |     hits.forEach((h: any) => {
  284 |       expect(Number.isFinite(h.lx)).toBe(true);
  285 |       expect(Number.isFinite(h.lz)).toBe(true);
  286 |       expect(typeof h.roomLabel).toBe('string');
  287 |     });
  288 |     // The hub plaza in the middle is deliberately not placeable: aiming there
  289 |     // reports null so the host can explain why, rather than silently doing nothing.
  290 |     expect(floor.some((f: any) => f === null)).toBe(true);
```