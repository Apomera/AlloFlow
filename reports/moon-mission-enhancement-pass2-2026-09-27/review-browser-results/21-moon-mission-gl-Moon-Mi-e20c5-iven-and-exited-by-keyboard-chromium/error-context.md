# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 21-moon-mission-gl.spec.ts >> Moon Mission — real WebGL EVA >> the optional LRV can be reached, boarded, driven, and exited by keyboard
- Location: tests\e2e\21-moon-mission-gl.spec.ts:275:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#eva-mode')
Expected substring: "LRV"
Received string:    "On foot"
Timeout: 15000ms

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('#eva-mode')
    28 × locator resolved to <span id="eva-mode">On foot</span>
       - unexpected value "On foot"

```

```yaml
- text: On foot
```

# Test source

```ts
  204 |     // "collect 4 samples" (a quest hook), Lunar Geologist and Sample Return were all
  205 |     // unreachable no matter how long a student explored. Nothing in jsdom can reach
  206 |     // this — the loop needs WebGL and real rAF frames.
  207 |     //
  208 |     // Determinism comes from pinning Math.random into a narrow band before the page
  209 |     // loads: the orb scatter is `8 + (rand - 0.5) * 60`, so a band around 0.4133
  210 |     // parks every sample within half a unit of the astronaut's spawn at (3, 3),
  211 |     // inside the 2-unit pickup radius. It stays a BAND rather than a constant so
  212 |     // three.js still generates distinct object UUIDs.
  213 |     await page.addInitScript(() => {
  214 |       let n = 1;
  215 |       Math.random = function () {
  216 |         n = (n * 1103515245 + 12345) % 2147483648;
  217 |         return 0.4105 + (n % 1000) / 1000 * 0.006;
  218 |       };
  219 |     });
  220 |     await harness.mount(page, AT_EVA, EVA_READY);
  221 |     expect(await page.evaluate(() => (window as any).__focusEva())).toBe(true);
  222 | 
  223 |     const bag = () => page.evaluate(() =>
  224 |       ((((window as any).__toolData || {}).moonMission || {}).lunarSamples || []).map((s: any) => String(s.name)));
  225 | 
  226 |     expect(await bag(), 'started the EVA with rocks already collected').toEqual([]);
  227 | 
  228 |     // Hold F down rather than tapping it: the pickup cooldown is 60 FRAMES, and
  229 |     // SwiftShader renders this scene at ~13fps, so a fixed tap interval collects on
  230 |     // some presses and not others. Holding lets the loop bank one rock per cooldown
  231 |     // however fast it happens to be running — and the wait is on the BAG reaching three
  232 |     // rather than on a wall-clock guess, because 12s at 13fps is 156 frames and three
  233 |     // pickups need 180. The 40s ceiling still fails if collection is broken outright.
  234 |     await page.keyboard.down('KeyF');
  235 |     await page.waitForFunction(
  236 |       () => ((((window as any).__toolData || {}).moonMission || {}).lunarSamples || []).length >= 3,
  237 |       null, { timeout: 40000 },
  238 |     ).catch(() => null);
  239 |     await page.keyboard.up('KeyF');
  240 |     await page.waitForTimeout(300);
  241 | 
  242 |     const names = await bag();
  243 |     expect(names.length, 'pressing F never collected anything — the orbs are out of reach')
  244 |       .toBeGreaterThan(0);
  245 |     expect(names.length, 'the collection is being REPLACED rather than appended: ' + JSON.stringify(names))
  246 |       .toBeGreaterThanOrEqual(3);
  247 |     expect(new Set(names).size, 'the same rock was banked twice: ' + JSON.stringify(names))
  248 |       .toBe(names.length);
  249 |   });
  250 | 
  251 |   test('the EVA canvas stays put and fits its parent', async ({ page }) => {
  252 |     // Geometry World's canvas climbed ~8px every 220ms because a ResizeObserver fed
  253 |     // its own output back in. This one declares display:block, which is the fix.
  254 |     await harness.mount(page, AT_EVA, EVA_READY);
  255 | 
  256 |     const samples: string[] = [];
  257 |     for (let i = 0; i < 8; i += 1) {
  258 |       samples.push(JSON.stringify((await page.evaluate(() => (window as any).__eva())).box));
  259 |       await page.waitForTimeout(220);
  260 |     }
  261 |     expect([...new Set(samples)].length, 'canvas size unstable:\n' + [...new Set(samples)].join('\n')).toBe(1);
  262 | 
  263 |     const eva = await page.evaluate(() => (window as any).__eva());
  264 |     expect(eva.box.w).toBeLessThanOrEqual(eva.parentBox.w + 1);
  265 |     expect(eva.box.h).toBeLessThanOrEqual(eva.parentBox.h + 1);
  266 |   });
  267 | 
  268 |   test('mounts the EVA without throwing', async ({ page }) => {
  269 |     await harness.mount(page, AT_EVA, EVA_READY);
  270 |     const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
  271 |       .filter((m: string) => !/ResizeObserver loop/.test(m));
  272 |     expect(errs).toEqual([]);
  273 |   });
  274 | 
  275 |   test('the optional LRV can be reached, boarded, driven, and exited by keyboard', async ({ page }) => {
  276 |     await harness.mount(page, AT_EVA, EVA_READY);
  277 |     expect(await page.evaluate(() => (window as any).__focusEva())).toBe(true);
  278 | 
  279 |     const evaCanvas = page.locator('canvas[data-eva-canvas="true"]');
  280 |     const geologyAction = page.locator('#eva-gt-action');
  281 |     await expect(page.locator('#eva-geology-traverse')).toBeVisible();
  282 |     await expect(geologyAction).toHaveText('Start optional traverse');
  283 |     await geologyAction.click();
  284 |     await expect(geologyAction).toHaveText('Restart traverse');
  285 |     await expect.poll(() => evaCanvas.getAttribute('data-geology-traverse-status')).toBe('active');
  286 |     await expect.poll(() => evaCanvas.getAttribute('data-geology-traverse-step')).toBe('1');
  287 |     expect(await page.evaluate(() => document.activeElement?.matches('canvas[data-eva-canvas="true"]')))
  288 |       .toBe(true);
  289 | 
  290 |     // From the EVA spawn, W+D follows a diagonal that passes within the rover's
  291 |     // three-metre boarding radius. Wait on the accessible control, not a fixed
  292 |     // duration, so SwiftShader frame rate cannot make this flaky.
  293 |     await page.keyboard.down('KeyW');
  294 |     await page.keyboard.down('KeyD');
  295 |     const reached = await page.waitForFunction(() => {
  296 |       const action = document.getElementById('eva-lrv-action');
  297 |       return action && /Board LRV/i.test(String(action.textContent)) ? true : false;
  298 |     }, null, { timeout: 30000 }).then(() => true).catch(() => false);
  299 |     await page.keyboard.up('KeyD');
  300 |     await page.keyboard.up('KeyW');
  301 |     expect(reached, 'the visible LRV control never reported boarding range').toBe(true);
  302 | 
  303 |     await page.keyboard.press('KeyV');
> 304 |     await expect(page.locator('#eva-mode')).toContainText('LRV');
      |                                             ^ Error: expect(locator).toContainText(expected) failed
  305 |     await expect(page.locator('#eva-lrv-action')).toContainText('Exit LRV');
  306 |     await expect.poll(() => evaCanvas.getAttribute('data-geology-traverse-step')).toBe('2');
  307 | 
  308 |     await page.keyboard.down('KeyW');
  309 |     const drove = await page.waitForFunction(() => {
  310 |       const speed = document.getElementById('eva-lrv-speed');
  311 |       const text = speed ? String(speed.textContent) : '';
  312 |       return text && !/^Parked$/i.test(text) && Number.parseFloat(text) > 0 ? text : false;
  313 |     }, null, { timeout: 8000 }).catch(() => null);
  314 |     await page.keyboard.up('KeyW');
  315 |     expect(drove, 'the boarded LRV never reported forward speed').not.toBeNull();
  316 | 
  317 |     await page.keyboard.press('KeyF');
  318 |     const sampleGuard = await page.evaluate(() => (window as any).__events.toasts
  319 |       .some((t: any) => /on-foot|exit before collecting|samples stay/i.test(String(t.message))));
  320 |     expect(sampleGuard, 'F while boarded did not explain that sampling is on foot').toBe(true);
  321 | 
  322 |     await page.keyboard.press('KeyV');
  323 |     await expect(page.locator('#eva-mode')).toContainText('On foot');
  324 | 
  325 |     const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
  326 |       .filter((m: string) => !/ResizeObserver loop/.test(m));
  327 |     expect(errs).toEqual([]);
  328 |   });
  329 | 
  330 |   test('boots at phase 0 with no 3D surface and no errors', async ({ page }) => {
  331 |     // The default path every other test already covers — here only to confirm the
  332 |     // EVA is genuinely phase-gated rather than always present.
  333 |     await harness.mount(page, { moonMission: { missionPhase: 0 } }, undefined, { expectCanvas: false });
  334 |     expect(await page.evaluate(() => !!document.querySelector('canvas[data-eva-canvas="true"]'))).toBe(false);
  335 | 
  336 |     const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
  337 |       .filter((m: string) => !/ResizeObserver loop/.test(m));
  338 |     expect(errs).toEqual([]);
  339 |   });
  340 | 
  341 |   test('the trans-Earth coast paints its own 2D canvas', async ({ page }) => {
  342 |     // Phase 8 is 2D, not WebGL, so expectCanvas is off — the harness would otherwise
  343 |     // sit waiting for a GL context that this phase never creates. Worth a browser
  344 |     // check anyway: a ref callback that throws is swallowed into a blank rectangle,
  345 |     // and no jsdom test renders past phase 0.
  346 |     await harness.mount(page, { moonMission: { missionPhase: 8 } }, undefined, { expectCanvas: false });
  347 |     await page.waitForTimeout(1500); // let the coast animate past its opening frames
  348 | 
  349 |     const canvas = page.locator('canvas[data-teicoast-canvas="true"]');
  350 |     expect(await canvas.count(), 'trans-Earth coast canvas never mounted').toBe(1);
  351 | 
  352 |     const shot = await canvas.screenshot({ timeout: 60000 });
  353 |     expect(shot.length, 'the coast canvas is blank').toBeGreaterThan(6000);
  354 | 
  355 |     const errs: string[] = (await page.evaluate(() => (window as any).__events.errors))
  356 |       .filter((m: string) => !/ResizeObserver loop/.test(m));
  357 |     expect(errs).toEqual([]);
  358 |   });
  359 | 
  360 |   test('releases the EVA canvas on unmount', async ({ page }) => {
  361 |     await harness.mount(page, AT_EVA, EVA_READY);
  362 |     expect(await page.evaluate(() => !!(window as any).__eva())).toBe(true);
  363 | 
  364 |     await harness.destroy(page);
  365 |     await page.waitForTimeout(500);
  366 |     expect(await page.evaluate(() => !!document.querySelector('canvas[data-eva-canvas="true"]'))).toBe(false);
  367 |   });
  368 | 
  369 |   test('the header toggle freezes the launch animation and play resumes it', async ({ page }) => {
  370 |     // WCAG 2.2.2 (pause, stop, hide). The passive phases loop on their own; the
  371 |     // toggle is proved at runtime in BOTH directions — a paused canvas must stop
  372 |     // changing, and an unpaused one must change again — so a broken flag cannot
  373 |     // pass by accident (the echolocation reduced-motion lesson).
  374 |     await harness.mount(page, { moonMission: { missionPhase: 1 } }, undefined, { expectCanvas: false });
  375 |     const canvas = page.locator('canvas[data-launch-canvas="true"]');
  376 |     await page.waitForTimeout(600);
  377 |     const shoot = () => canvas.screenshot({ timeout: 60000 });
  378 | 
  379 |     const a1 = await shoot(); await page.waitForTimeout(700); const a2 = await shoot();
  380 |     expect(Buffer.compare(a1, a2), 'launch canvas is not animating before the toggle').not.toBe(0);
  381 | 
  382 |     const toggle = page.locator('[data-moonmission-anim-toggle="true"]');
  383 |     await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  384 |     await toggle.click();
  385 |     await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  386 |     await page.waitForTimeout(400);
  387 |     const b1 = await shoot(); await page.waitForTimeout(700); const b2 = await shoot();
  388 |     expect(Buffer.compare(b1, b2), 'canvas kept animating while paused').toBe(0);
  389 | 
  390 |     await toggle.click();
  391 |     await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  392 |     await page.waitForTimeout(400);
  393 |     const c1 = await shoot(); await page.waitForTimeout(700); const c2 = await shoot();
  394 |     expect(Buffer.compare(c1, c2), 'canvas did not resume after play').not.toBe(0);
  395 |   });
  396 | 
  397 |   test('with animation paused the TLI window still opens, so the burn can be flown on time', async ({ page }) => {
  398 |     // Pausing (or the OS reduced-motion setting, which pauses by default) used to
  399 |     // return from the orbit loop before its clock advanced. The window froze at
  400 |     // "Houston is verifying systems", so a reduced-motion student could only ever
  401 |     // burn "early" and was billed a mid-course correction for it.
  402 |     test.setTimeout(120000);
  403 |     await harness.mount(page, { moonMission: { missionPhase: 2, animPaused: true } }, undefined, { expectCanvas: false });
  404 |     const state = page.locator('[data-moonmission-tli-state]');
```