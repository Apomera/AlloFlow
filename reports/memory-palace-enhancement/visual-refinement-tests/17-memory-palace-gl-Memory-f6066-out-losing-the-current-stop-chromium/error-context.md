# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 17-memory-palace-gl.spec.ts >> Memory Palace — real WebGL walk >> begins a walk and inspects its room without losing the current stop
- Location: tests\e2e\17-memory-palace-gl.spec.ts:483:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 1000
Received:   150
```

# Test source

```ts
  408 |     expect(metrics.roles['gallery-light-strip']).toBe(8);
  409 |     const variants = await page.evaluate(() => {
  410 |       const out: number[] = [];
  411 |       (window as any).__lastScene.traverse((o: any) => { if (o.userData.visualRole === 'room-landmark') out.push(o.userData.variant); });
  412 |       return out;
  413 |     });
  414 |     expect(new Set(variants).size).toBe(4);
  415 |     await page.locator('[data-palace-action="overview"]').click();
  416 |     expect(await page.evaluate(() => (window as any).__lastScene.fog.density)).toBe(0);
  417 |     await page.evaluate(() => (window as any).__handle.goTo(1));
  418 |     expect(await page.evaluate(() => (window as any).__lastScene.fog.density)).toBeGreaterThan(0);
  419 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  420 |   });
  421 | 
  422 |   test('distinguishes jumping to the final stop from visiting the entire route', async ({ page }) => {
  423 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  424 |     await mount(page);
  425 |     await page.evaluate(() => (window as any).__handle.goTo(8));
  426 |     const summary = page.locator('[data-palace-overlay="completion"]');
  427 |     await expect(summary).toContainText('Final stop reached');
  428 |     await expect(summary).toContainText('Visited 1 of 8 stops');
  429 |     await page.evaluate(() => { for (let i = 1; i <= 8; i++) (window as any).__handle.goTo(i); });
  430 |     await expect(summary).toContainText('Route complete');
  431 |     await expect(summary).toContainText('Visited 8 of 8 stops');
  432 |     await summary.getByRole('button', { name: 'Walk again', exact: true }).click();
  433 |     await expect(page.locator('#wrap canvas')).toBeFocused();
  434 |     await expect(summary).toBeHidden();
  435 |     await page.evaluate(() => (window as any).__handle.goTo(8));
  436 |     await expect(summary).toContainText('Visited 1 of 8 stops');
  437 |   });
  438 | 
  439 |   test('makes long cues expandable and map destinations readable on a small screen', async ({ page }) => {
  440 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  441 |     const longCue = 'A waterfall pours over my front door, splashes my shoes, and sings the names of the clouds. '.repeat(12);
  442 |     await mount(page, { main: 'My route', branches: [{ title: 'Home', items: ['Evaporation', 'Condensation'], mnemonics: [longCue, 'A cloud in the hallway.'] }] });
  443 |     await page.evaluate(() => { const wrap = document.getElementById('wrap')!; wrap.style.width = '390px'; wrap.style.height = '740px'; (window as any).__handle.goTo(1); });
  444 |     await page.waitForTimeout(300);
  445 |     const toggle = page.locator('[data-palace-action="expand-cue"]');
  446 |     await toggle.click();
  447 |     await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  448 |     const card = page.locator('[data-palace-overlay="focus"]');
  449 |     const cardBox = await card.boundingBox();
  450 |     const dockBox = await page.locator('[data-palace-overlay="dock"]').boundingBox();
  451 |     expect(cardBox!.y + cardBox!.height).toBeLessThan(dockBox!.y);
  452 |     await toggle.click();
  453 |     await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  454 |     await page.locator('[data-palace-action="overview"]').click();
  455 |     const first = page.locator('[data-journey-index="1"]');
  456 |     await expect(first).toContainText('Evaporation');
  457 |     expect((await first.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  458 |     await expect(first).toHaveAttribute('data-visited', 'true');
  459 |     await page.locator('[data-journey-index="2"]').click();
  460 |     await expect(card).toContainText('Condensation');
  461 |   });
  462 | 
  463 |   test('keeps landmarks in recall while withholding memory answers and cue controls', async ({ page }) => {
  464 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  465 |     await mount(page, SAMPLE, { recall: true });
  466 |     await page.evaluate(() => (window as any).__handle.goTo(1));
  467 |     await expect(page.locator('[data-palace-overlay="focus"]')).toBeHidden();
  468 |     await expect(page.locator('[data-palace-action="expand-cue"]')).toBeHidden();
  469 |     await expect(page.locator('[data-palace-overlay="journey"]')).toBeHidden();
  470 |     const metrics = await page.evaluate(() => (window as any).__palaceVisualMetrics());
  471 |     expect(metrics.roles['room-landmark']).toBe(4);
  472 |     await page.locator('#wrap canvas').focus();
  473 |     await page.keyboard.down('w');
  474 |     await page.keyboard.up('w');
  475 |     await expect(page.locator('[data-palace-overlay="free-nav"]')).toBeVisible();
  476 |     await expect(page.locator('[data-palace-room-controls]')).toBeHidden();
  477 |     await expect(page.locator('[data-palace-overlay="free-nav"]')).not.toContainText('Evaporation');
  478 |     await expect(page.locator('[data-palace-overlay="free-nav"]')).not.toContainText('Condensation');
  479 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  480 |   });
  481 | 
  482 | 
  483 |   test('begins a walk and inspects its room without losing the current stop', async ({ page }) => {
  484 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  485 |     await mount(page);
  486 |     await page.locator('[data-palace-action="begin-walk"]').click();
  487 |     await expect(page.locator('#wrap canvas')).toBeFocused();
  488 |     await expect(page.locator('[data-palace-overlay="focus"]')).toContainText('Evaporation');
  489 |     await page.locator('[data-palace-action="inspect-room"]').click();
  490 |     await expect(page.locator('[data-palace-overlay="focus"]')).toBeHidden();
  491 |     await expect(page.locator('[data-palace-overlay="free-nav"]')).toBeVisible();
  492 |     const roomKey = await page.evaluate(data => {
  493 |       const w = window as any;
  494 |       const p = w.AlloModules.MemoryPalace.buildPalace(data);
  495 |       return w.AlloModules.MemoryPalace.roomAtPoint(p, w.__lastCamera.position.x, w.__lastCamera.position.z)?.roomKey;
  496 |     }, SAMPLE);
  497 |     expect(roomKey).toBe('b0');
  498 |     expect(await page.evaluate(() => (window as any).__lastCamera.fov)).toBe(68);
  499 |     await page.getByRole('button', { name: 'Return to guided route', exact: true }).click();
  500 |     await expect(page.locator('[data-palace-overlay="focus"]')).toContainText('Evaporation');
  501 |     await expect(page.locator('#wrap canvas')).toBeFocused();
  502 |     expect(await page.evaluate(() => (window as any).__lastCamera.fov)).toBe(58);
  503 |     await page.keyboard.press('r');
  504 |     await expect(page.locator('[data-palace-overlay="free-nav"]')).toBeVisible();
  505 |     await page.locator('[data-palace-action="overview"]').click();
  506 |     await expect(page.locator('[data-palace-overlay="journey"]')).toBeVisible();
  507 |     await expect(page.locator('[data-palace-overlay="free-nav"]')).toBeHidden();
> 508 |     expect(await page.evaluate(() => (window as any).__lastCamera.position.y)).toBeGreaterThan(1000);
      |                                                                                ^ Error: expect(received).toBeGreaterThan(expected)
  509 |   });
  510 | 
  511 |   test('opens gallery ceilings for the map and restores them during exploration', async ({ page }) => {
  512 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  513 |     await mount(page);
  514 |     const canopies = () => page.evaluate(() => { const a: boolean[] = []; (window as any).__lastScene.traverse((o: any) => { if (o.userData.visualRole === 'gallery-canopy') a.push(o.visible); }); return a; });
  515 |     expect(await canopies()).toEqual([true, true, true, true]);
  516 |     await page.locator('[data-palace-action="overview"]').click();
  517 |     expect(await canopies()).toEqual([false, false, false, false]);
  518 |     await page.locator('[data-palace-action="inspect-room"]').click();
  519 |     expect(await canopies()).toEqual([true, true, true, true]);
  520 |     await expect(page.locator('[data-palace-overlay="journey"]')).toBeHidden();
  521 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  522 |   });
  523 | 
  524 |   test('visits skipped stops without erasing progress and hides completion actions in recall', async ({ page }) => {
  525 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  526 |     await mount(page);
  527 |     await page.evaluate(() => (window as any).__handle.goTo(8));
  528 |     const remaining = page.locator('[data-palace-action="visit-remaining"]');
  529 |     await expect(remaining).toContainText('(7)');
  530 |     await remaining.click();
  531 |     await expect(page.locator('[data-palace-overlay="focus"]')).toContainText('Evaporation');
  532 |     await page.evaluate(() => (window as any).__handle.goTo(8));
  533 |     await expect(remaining).toContainText('(6)');
  534 |     await page.evaluate(() => { for (let n=1;n<=8;n++) (window as any).__handle.goTo(n); });
  535 |     await expect(remaining).toBeHidden();
  536 |     await page.evaluate(() => (window as any).__handle.destroy());
  537 |     await page.evaluate(data => (window as any).__mount(data, { recall: true }), SAMPLE);
  538 |     await page.waitForSelector('#wrap canvas');
  539 |     await expect(page.locator('[data-palace-action="inspect-room"]')).toBeHidden();
  540 |     await expect(page.locator('[data-palace-action="begin-walk"]')).toBeHidden();
  541 |     await expect(remaining).toBeHidden();
  542 |   });
  543 | 
  544 |   test('keeps short cues fully readable under zoom and disables begin for an empty palace', async ({ page }) => {
  545 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  546 |     const cue = 'A cloud in my hallway grows bright green shoes and dances through the door.';
  547 |     await mount(page, { main: 'My room', branches: [{ title: 'Hallway', items: ['Cloud'], mnemonics: [cue] }] });
  548 |     await page.evaluate(() => { document.getElementById('wrap')!.style.width='320px'; document.getElementById('wrap')!.style.height='740px'; document.documentElement.style.fontSize='28px'; (window as any).__handle.goTo(1); });
  549 |     await expect(page.locator('[data-palace-action="expand-cue"]')).toBeHidden();
  550 |     expect(await page.locator('[id^="palace-cue-"]').evaluate(el => getComputedStyle(el).webkitLineClamp)).toBe('none');
  551 |     await page.evaluate(() => (window as any).__handle.destroy());
  552 |     await page.evaluate(() => (window as any).__mount({ main:'Empty', branches: [] }));
  553 |     await page.waitForSelector('#wrap canvas');
  554 |     await expect(page.locator('[data-palace-action="begin-walk"]')).toBeDisabled();
  555 |     await expect(page.locator('[data-palace-action="inspect-room"]')).toBeDisabled();
  556 |   });
  557 | 
  558 | 
  559 |   test('stops walking when focus leaves the canvas or the window loses focus', async ({ page }) => {
  560 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  561 |     await mount(page);
  562 |     await page.locator('[data-palace-action="inspect-room"]').click();
  563 |     const canvas = page.locator('#wrap canvas');
  564 |     const position = () => page.evaluate(() => (window as any).__lastCamera.position.toArray());
  565 |     await canvas.focus();
  566 |     const start = await position();
  567 |     await page.keyboard.down('w');
  568 |     await page.waitForFunction(start => (window as any).__lastCamera.position.toArray().some((v: number, i: number) => Math.abs(v-start[i]) > 1), start);
  569 |     await page.locator('[data-palace-action="turn-left"]').focus();
  570 |     await page.keyboard.up('w');
  571 |     const stopped = await position();
  572 |     await page.waitForTimeout(250);
  573 |     expect(await position()).toEqual(stopped);
  574 |     await canvas.focus();
  575 |     await page.keyboard.down('a');
  576 |     await page.waitForFunction(start => (window as any).__lastCamera.position.toArray().some((v: number, i: number) => Math.abs(v-start[i]) > 1), stopped);
  577 |     await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  578 |     const blurred = await position();
  579 |     await page.waitForTimeout(250);
  580 |     expect(await position()).toEqual(blurred);
  581 |     await page.keyboard.up('a');
  582 |     const modifierHandled = await canvas.evaluate(el => {
  583 |       const event = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, bubbles: true, cancelable: true });
  584 |       el.dispatchEvent(event); return event.defaultPrevented;
  585 |     });
  586 |     expect(modifierHandled).toBe(false);
  587 |   });
  588 | 
  589 |   test('cancels touch drags without moving the view or placing a memory afterwards', async ({ page }) => {
  590 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  591 |     await mount(page);
  592 |     await page.locator('[data-palace-action="inspect-room"]').click();
  593 |     const canvas = page.locator('#wrap canvas');
  594 |     expect(await canvas.evaluate(el => getComputedStyle(el).touchAction)).toBe('none');
  595 |     await page.evaluate(() => (window as any).__handle.setBuildMode(true));
  596 |     await expect(page.locator('[data-palace-room-controls]')).toBeHidden();
  597 |     const orientation = await page.evaluate(() => (window as any).__lastCamera.quaternion.toArray());
  598 |     await canvas.evaluate(el => {
  599 |       const init = { pointerId: 17, pointerType: 'touch', isPrimary: true, clientX: 250, clientY: 300, bubbles: true };
  600 |       el.dispatchEvent(new PointerEvent('pointerdown', init));
  601 |       el.dispatchEvent(new PointerEvent('pointercancel', init));
  602 |       el.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: 450 }));
  603 |       el.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: 450 }));
  604 |     });
  605 |     await page.waitForTimeout(150);
  606 |     expect(await page.evaluate(() => (window as any).__lastCamera.quaternion.toArray())).toEqual(orientation);
  607 |     expect(await page.evaluate(() => (window as any).__events.floor)).toEqual([]);
  608 |     await expect(canvas).toHaveCSS('cursor', 'crosshair');
```