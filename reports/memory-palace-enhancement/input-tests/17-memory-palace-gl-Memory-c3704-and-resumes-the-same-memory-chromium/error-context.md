# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 17-memory-palace-gl.spec.ts >> Memory Palace — real WebGL walk >> touch room exploration >> offers touch-sized steps and turns, respects walls, and resumes the same memory
- Location: tests\e2e\17-memory-palace-gl.spec.ts:605:9

# Error details

```
Error: expect(received).toBeCloseTo(expected, precision)

Expected: 64
Received: 394.00941500755624

Expected precision:    1
Expected difference: < 0.05
Received difference:   330.00941500755624
```

# Test source

```ts
  517 |     const remaining = page.locator('[data-palace-action="visit-remaining"]');
  518 |     await expect(remaining).toContainText('(7)');
  519 |     await remaining.click();
  520 |     await expect(page.locator('[data-palace-overlay="focus"]')).toContainText('Evaporation');
  521 |     await page.evaluate(() => (window as any).__handle.goTo(8));
  522 |     await expect(remaining).toContainText('(6)');
  523 |     await page.evaluate(() => { for (let n=1;n<=8;n++) (window as any).__handle.goTo(n); });
  524 |     await expect(remaining).toBeHidden();
  525 |     await page.evaluate(() => (window as any).__handle.destroy());
  526 |     await page.evaluate(data => (window as any).__mount(data, { recall: true }), SAMPLE);
  527 |     await page.waitForSelector('#wrap canvas');
  528 |     await expect(page.locator('[data-palace-action="inspect-room"]')).toBeHidden();
  529 |     await expect(page.locator('[data-palace-action="begin-walk"]')).toBeHidden();
  530 |     await expect(remaining).toBeHidden();
  531 |   });
  532 | 
  533 |   test('keeps short cues fully readable under zoom and disables begin for an empty palace', async ({ page }) => {
  534 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  535 |     const cue = 'A cloud in my hallway grows bright green shoes and dances through the door.';
  536 |     await mount(page, { main: 'My room', branches: [{ title: 'Hallway', items: ['Cloud'], mnemonics: [cue] }] });
  537 |     await page.evaluate(() => { document.getElementById('wrap')!.style.width='320px'; document.getElementById('wrap')!.style.height='740px'; document.documentElement.style.fontSize='28px'; (window as any).__handle.goTo(1); });
  538 |     await expect(page.locator('[data-palace-action="expand-cue"]')).toBeHidden();
  539 |     expect(await page.locator('[id^="palace-cue-"]').evaluate(el => getComputedStyle(el).webkitLineClamp)).toBe('none');
  540 |     await page.evaluate(() => (window as any).__handle.destroy());
  541 |     await page.evaluate(() => (window as any).__mount({ main:'Empty', branches: [] }));
  542 |     await page.waitForSelector('#wrap canvas');
  543 |     await expect(page.locator('[data-palace-action="begin-walk"]')).toBeDisabled();
  544 |     await expect(page.locator('[data-palace-action="inspect-room"]')).toBeDisabled();
  545 |   });
  546 | 
  547 | 
  548 |   test('stops walking when focus leaves the canvas or the window loses focus', async ({ page }) => {
  549 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  550 |     await mount(page);
  551 |     await page.locator('[data-palace-action="inspect-room"]').click();
  552 |     const canvas = page.locator('#wrap canvas');
  553 |     const position = () => page.evaluate(() => (window as any).__lastCamera.position.toArray());
  554 |     await canvas.focus();
  555 |     const start = await position();
  556 |     await page.keyboard.down('w');
  557 |     await page.waitForFunction(start => (window as any).__lastCamera.position.toArray().some((v: number, i: number) => Math.abs(v-start[i]) > 1), start);
  558 |     await page.locator('[data-palace-action="turn-left"]').focus();
  559 |     await page.keyboard.up('w');
  560 |     const stopped = await position();
  561 |     await page.waitForTimeout(250);
  562 |     expect(await position()).toEqual(stopped);
  563 |     await canvas.focus();
  564 |     await page.keyboard.down('a');
  565 |     await page.waitForFunction(start => (window as any).__lastCamera.position.toArray().some((v: number, i: number) => Math.abs(v-start[i]) > 1), stopped);
  566 |     await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  567 |     const blurred = await position();
  568 |     await page.waitForTimeout(250);
  569 |     expect(await position()).toEqual(blurred);
  570 |     await page.keyboard.up('a');
  571 |     const modifierHandled = await canvas.evaluate(el => {
  572 |       const event = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, bubbles: true, cancelable: true });
  573 |       el.dispatchEvent(event); return event.defaultPrevented;
  574 |     });
  575 |     expect(modifierHandled).toBe(false);
  576 |   });
  577 | 
  578 |   test('cancels touch drags without moving the view or placing a memory afterwards', async ({ page }) => {
  579 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  580 |     await mount(page);
  581 |     await page.locator('[data-palace-action="inspect-room"]').click();
  582 |     const canvas = page.locator('#wrap canvas');
  583 |     expect(await canvas.evaluate(el => getComputedStyle(el).touchAction)).toBe('none');
  584 |     await page.evaluate(() => (window as any).__handle.setBuildMode(true));
  585 |     await expect(page.locator('[data-palace-room-controls]')).toBeHidden();
  586 |     const orientation = await page.evaluate(() => (window as any).__lastCamera.quaternion.toArray());
  587 |     await canvas.evaluate(el => {
  588 |       const init = { pointerId: 17, pointerType: 'touch', isPrimary: true, clientX: 250, clientY: 300, bubbles: true };
  589 |       el.dispatchEvent(new PointerEvent('pointerdown', init));
  590 |       el.dispatchEvent(new PointerEvent('pointercancel', init));
  591 |       el.dispatchEvent(new PointerEvent('pointermove', { ...init, clientX: 450 }));
  592 |       el.dispatchEvent(new PointerEvent('pointerup', { ...init, clientX: 450 }));
  593 |     });
  594 |     await page.waitForTimeout(150);
  595 |     expect(await page.evaluate(() => (window as any).__lastCamera.quaternion.toArray())).toEqual(orientation);
  596 |     expect(await page.evaluate(() => (window as any).__events.floor)).toEqual([]);
  597 |     await expect(canvas).toHaveCSS('cursor', 'crosshair');
  598 |     await page.evaluate(() => (window as any).__handle.setBuildMode(false));
  599 |     await expect(page.locator('[data-palace-room-controls]')).toBeVisible();
  600 |     await expect(canvas).toHaveCSS('cursor', 'grab');
  601 |   });
  602 | 
  603 |   test.describe('touch room exploration', () => {
  604 |     test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  605 |     test('offers touch-sized steps and turns, respects walls, and resumes the same memory', async ({ page }) => {
  606 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  607 |       await mount(page);
  608 |       await page.evaluate(() => { document.getElementById('wrap')!.style.width='390px'; document.getElementById('wrap')!.style.height='740px'; (window as any).__handle.goTo(1); });
  609 |       await page.tap('[data-palace-action="inspect-room"]');
  610 |       const controls = page.locator('[data-palace-room-controls]');
  611 |       await expect(controls).toBeVisible();
  612 |       const position = () => page.evaluate(() => (window as any).__lastCamera.position.toArray());
  613 |       const start = await position();
  614 |       await page.tap('[data-palace-action="step-forward"]');
  615 |       await page.waitForFunction(start => Math.hypot((window as any).__lastCamera.position.x-start[0], (window as any).__lastCamera.position.z-start[2]) > 60, start);
  616 |       const forward = await position();
> 617 |       expect(Math.hypot(forward[0]-start[0], forward[2]-start[2])).toBeCloseTo(64, 1);
      |                                                                    ^ Error: expect(received).toBeCloseTo(expected, precision)
  618 |       await page.tap('[data-palace-action="step-back"]');
  619 |       await page.waitForFunction(start => Math.hypot((window as any).__lastCamera.position.x-start[0], (window as any).__lastCamera.position.z-start[2]) < 1, start);
  620 |       const rotation = await page.evaluate(() => (window as any).__lastCamera.quaternion.toArray());
  621 |       await page.tap('[data-palace-action="turn-left"]');
  622 |       await page.waitForFunction(q => (window as any).__lastCamera.quaternion.toArray().some((v: number, i: number) => Math.abs(v-q[i]) > .01), rotation);
  623 |       await page.evaluate(() => { for (let i=0;i<30;i++) (document.querySelector('[data-palace-action="step-forward"]') as HTMLButtonElement).click(); });
  624 |       await expect(page.locator('[data-palace-overlay="free-nav"]')).toHaveAttribute('data-blocked', 'true');
  625 |       const roomKey = await page.evaluate(data => {
  626 |         const w=window as any; const p=w.AlloModules.MemoryPalace.buildPalace(data);
  627 |         return w.AlloModules.MemoryPalace.roomAtPoint(p,w.__lastCamera.position.x,w.__lastCamera.position.z)?.roomKey;
  628 |       }, SAMPLE);
  629 |       expect(roomKey).toBe('b0');
  630 |       await page.evaluate(() => { document.getElementById('wrap')!.style.width='320px'; document.documentElement.style.fontSize='28px'; });
  631 |       await page.waitForTimeout(200);
  632 |       const viewportBox=(await page.locator('[data-memory-palace-viewport]').boundingBox())!;
  633 |       for(const action of ['turn-left','step-forward','step-back','turn-right']) {
  634 |         const box=(await page.locator('[data-palace-action="'+action+'"]').boundingBox())!;
  635 |         expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  636 |         expect(box.x).toBeGreaterThanOrEqual(viewportBox.x); expect(box.x+box.width).toBeLessThanOrEqual(viewportBox.x+viewportBox.width);
  637 |       }
  638 |       const box=(await controls.boundingBox())!;
  639 |       const dock=(await page.locator('[data-palace-overlay="dock"]').boundingBox())!;
  640 |       expect(box.y+box.height).toBeLessThan(dock.y);
  641 |       await page.getByRole('button', { name: 'Return to guided route', exact: true }).tap();
  642 |       await expect(controls).toBeHidden();
  643 |       await expect(page.locator('[data-palace-overlay="focus"]')).toContainText('Evaporation');
  644 |       await expect(page.locator('#wrap canvas')).toBeFocused();
  645 |       expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  646 |     });
  647 |   });
  648 | 
  649 | });
  650 | 
```