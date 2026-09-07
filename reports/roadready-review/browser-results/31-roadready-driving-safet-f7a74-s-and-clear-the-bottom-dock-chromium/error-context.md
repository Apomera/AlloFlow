# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 31-roadready-driving-safety.spec.ts >> touch controls retain full targets and clear the bottom dock
- Location: tests\e2e\31-roadready-driving-safety.spec.ts:194:5

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 508
Received:    514
```

# Test source

```ts
  221 |   await expect(fastenSeatbelt).toBeVisible();
  222 |   await expect(page.locator('.rr-seatbelt-prompt')).toContainText(
  223 |     'The car stays in Park during your mirror scan.');
  224 |   await expect(accelerator).toBeDisabled();
  225 |   await expect(brake).toBeDisabled();
  226 |   await expect(parkGear).toBeDisabled();
  227 |   await expect(driveGear).toBeDisabled();
  228 |   await expect(reverseGear).toBeDisabled();
  229 |   await fastenSeatbelt.click();
  230 |   await expect(page.locator('.rr-seatbelt-prompt')).toBeHidden();
  231 |   await expect(page.getByText('🪞 Check Your Mirrors', { exact: true })).toBeVisible();
  232 |   await expect(page.locator('.rr-touch-pedals')).toBeVisible();
  233 |   await expect(page.locator('.rr-touch-secondary')).toBeVisible();
  234 |   await expect(page.locator('.rr-touch-pedals').getByText('GO', { exact: true })).toBeVisible();
  235 |   await expect(page.locator('.rr-touch-pedals').getByText('BRAKE', { exact: true })).toBeVisible();
  236 |   await expect(page.locator('.rr-touch-pedals')).toHaveAttribute(
  237 |     'data-rr-controls-locked', 'true');
  238 |   await expect(page.locator('.rr-touch-secondary')).toHaveAttribute(
  239 |     'data-rr-controls-locked', 'true');
  240 |   await expect(accelerator).toBeDisabled();
  241 |   await expect(driveGear).toBeDisabled();
  242 |   const startupState = await page.evaluate(() => ({
  243 |     belted: (window as any).__testHooks.roadReady.seatbeltRef.current.fastened,
  244 |     gear: (window as any).__testHooks.roadReady.gearRef.current,
  245 |     speed: (window as any).__testHooks.roadReady.carRef.current.speed,
  246 |   }));
  247 |   expect(startupState.belted).toBe(true);
  248 |   expect(startupState.gear).toBe('P');
  249 |   expect(Math.abs(startupState.speed)).toBeLessThan(0.01);
  250 |   await page.waitForTimeout(4400);
  251 |   await expect(page.locator('.rr-touch-pedals')).toHaveAttribute(
  252 |     'data-rr-controls-locked', 'false');
  253 |   await expect(accelerator).toBeEnabled();
  254 |   await expect(brake).toBeEnabled();
  255 |   await expect(driveGear).toBeEnabled();
  256 |   await expect(accelerator).toHaveAttribute('aria-keyshortcuts', 'Space Enter');
  257 | 
  258 |   await driveGear.click();
  259 |   await expect(driveGear).toHaveAttribute('aria-pressed', 'true');
  260 |   expect(await page.evaluate(() =>
  261 |     (window as any).__testHooks.roadReady.gearRef.current)).toBe('D');
  262 |   await parkGear.click();
  263 |   await expect(parkGear).toHaveAttribute('aria-pressed', 'true');
  264 |   expect(await page.evaluate(() =>
  265 |     (window as any).__testHooks.roadReady.gearRef.current)).toBe('P');
  266 | 
  267 |   const lookLeft = page.getByRole('button', {
  268 |     name: 'Look over left shoulder (touch and hold)',
  269 |   });
  270 |   await lookLeft.dispatchEvent('pointerdown', {
  271 |     pointerId: 17, pointerType: 'touch', button: 0,
  272 |   });
  273 |   expect(await page.evaluate(() =>
  274 |     (window as any).__testHooks.roadReady.keysRef.current.z)).toBe(true);
  275 |   await lookLeft.dispatchEvent('pointercancel', {
  276 |     pointerId: 17, pointerType: 'touch', button: 0,
  277 |   });
  278 |   expect(await page.evaluate(() =>
  279 |     !!(window as any).__testHooks.roadReady.keysRef.current.z)).toBe(false);
  280 | 
  281 |   await accelerator.dispatchEvent('pointerdown', {
  282 |     pointerId: 18, pointerType: 'touch', button: 0,
  283 |   });
  284 |   expect(await page.evaluate(() =>
  285 |     (window as any).__testHooks.roadReady.keysRef.current.w)).toBe(true);
  286 |   await expect.poll(async () => page.evaluate(() =>
  287 |     Math.abs((window as any).__testHooks.roadReady.carRef.current.speed)
  288 |   ), { timeout: 2000 }).toBeGreaterThan(0.2);
  289 |   await accelerator.dispatchEvent('pointerup', {
  290 |     pointerId: 18, pointerType: 'touch', button: 0,
  291 |   });
  292 |   expect(await page.evaluate(() =>
  293 |     !!(window as any).__testHooks.roadReady.keysRef.current.w)).toBe(false);
  294 |   await expect(driveGear).toHaveAttribute('aria-pressed', 'true');
  295 |   expect(await page.evaluate(() =>
  296 |     (window as any).__testHooks.roadReady.gearRef.current)).toBe('D');
  297 |   await page.waitForTimeout(250);
  298 |   const postStartSafety = await page.evaluate(() => {
  299 |     const hooks = (window as any).__testHooks.roadReady;
  300 |     const stats = hooks.statsRef.current;
  301 |     return {
  302 |       learnerFaultCrashes: Math.max(0,
  303 |         (stats.crashes || 0) - (stats.aiCausedCrashes || 0)),
  304 |       impactedRiders: (hooks.cyclistsRef.current || [])
  305 |         .filter((rider: any) => !!rider._hit).length,
  306 |     };
  307 |   });
  308 |   expect(postStartSafety.learnerFaultCrashes).toBe(0);
  309 |   expect(postStartSafety.impactedRiders).toBe(0);
  310 |   const bounds = await page.evaluate(() => {
  311 |     const dock = document.querySelector('.rr-drive-dock')!.getBoundingClientRect();
  312 |     const pedals = document.querySelector('.rr-touch-pedals')!.getBoundingClientRect();
  313 |     const secondary = document.querySelector('.rr-touch-secondary')!.getBoundingClientRect();
  314 |     const buttons = [...document.querySelectorAll('.touch-controls button')]
  315 |       .map((button) => (button as HTMLElement).getBoundingClientRect())
  316 |       .map((rect) => ({ width: rect.width, height: rect.height }));
  317 |     return {
  318 |       dockTop: dock.top, pedalsBottom: pedals.bottom, secondaryBottom: secondary.bottom, buttons,
  319 |     };
  320 |   });
> 321 |   expect(bounds.pedalsBottom).toBeLessThanOrEqual(bounds.dockTop - 8);
      |                               ^ Error: expect(received).toBeLessThanOrEqual(expected)
  322 |   expect(bounds.secondaryBottom).toBeLessThanOrEqual(bounds.dockTop - 8);
  323 |   for (const button of bounds.buttons) {
  324 |     expect(button.width).toBeGreaterThanOrEqual(44);
  325 |     expect(button.height).toBeGreaterThanOrEqual(44);
  326 |   }
  327 |   await page.screenshot({ path: 'tests/e2e/artifacts/roadready-touch-controls-mobile.png' });
  328 | });
  329 | 
  330 | test('formal drives suspend a persisted Ride-Along preference', async ({ page }) => {
  331 |   await startDrive(page, {
  332 |     view: 'driving', scenario: 'residential', vehicle: 'sedan',
  333 |     roadTestStage: 'drive', rideAlong: true, calmDrive: true, reducedMotion: true,
  334 |   });
  335 | 
  336 |   await expect(page.locator('.rr-ridealong-state')).toHaveCount(0);
  337 |   await expect(page.getByText('Ride-Along is paused for evaluated drives. You are in control.')).toBeVisible();
  338 |   await expect(page.locator('canvas[role="application"]')).not.toHaveAttribute('aria-label', /automatically steers/);
  339 |   const state = await page.evaluate(() => ({
  340 |     rideAlongActive: (window as any).__testHooks.roadReady.rideAlongRef.current,
  341 |     belted: (window as any).__testHooks.roadReady.seatbeltRef.current.fastened,
  342 |     gear: (window as any).__testHooks.roadReady.gearRef.current,
  343 |   }));
  344 |   expect(state).toEqual({ rideAlongActive: false, belted: false, gear: 'P' });
  345 | });
  346 | 
  347 | test('Ride-Along rejects a real manual reverse shortcut', async ({ page }) => {
  348 |   await startDrive(page, {
  349 |     view: 'driving', scenario: 'residential', vehicle: 'sedan',
  350 |     rideAlong: true, calmDrive: true, reducedMotion: true,
  351 |   });
  352 |   await expect(page.locator('.rr-ridealong-state')).toContainText('Scan');
  353 |   await page.keyboard.press('g');
  354 |   const gear = await page.evaluate(() => (window as any).__testHooks.roadReady.gearRef.current);
  355 |   expect(gear).toBe('P');
  356 |   await expect(page.locator('canvas[role="application"]')).toHaveAttribute('aria-label', /automatically steers/);
  357 | });
  358 | 
  359 | test('a delayed Three.js load cannot restart a disposed drive', async ({ page }) => {
  360 |   await page.goto(`${harness.url}/__harness`);
  361 |   await page.waitForFunction(() => !!(window as any).StemLab?._registry?.roadReady);
  362 |   await page.evaluate(() => {
  363 |     const w = window as any;
  364 |     w.__savedThree = w.THREE;
  365 |     w.THREE = null;
  366 |     w.StemLab.ensureThree = () => new Promise((resolve) => { w.__resolveThree = resolve; });
  367 |     w.__mount({ roadReady: {
  368 |       view: 'driving', scenario: 'residential', vehicle: 'sedan',
  369 |       calmDrive: true, reducedMotion: true,
  370 |     } });
  371 |   });
  372 |   await page.waitForFunction(() => typeof (window as any).__resolveThree === 'function');
  373 |   await page.evaluate(() => (window as any).__ctx.update('roadReady', 'view', 'menu'));
  374 |   await expect(page.locator('.rr-drive-shell')).toHaveCount(0);
  375 |   await page.evaluate(() => {
  376 |     const w = window as any;
  377 |     w.THREE = w.__savedThree;
  378 |     w.__resolveThree(w.THREE);
  379 |   });
  380 |   await page.waitForTimeout(500);
  381 |   const state = await page.evaluate(() => ({
  382 |     scene: (window as any).__testHooks?.roadReady?.threeRef?.current || null,
  383 |     errors: (window as any).__events.errors.slice(),
  384 |     drivingShells: document.querySelectorAll('.rr-drive-shell').length,
  385 |   }));
  386 |   expect(state.scene).toBeNull();
  387 |   expect(state.drivingShells).toBe(0);
  388 |   expect(state.errors).toEqual([]);
  389 | });
  390 | 
```