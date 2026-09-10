# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 17-memory-palace-gl.spec.ts >> Memory Palace — real WebGL walk >> shows visited map stops separately from skipped stops and the current position
- Location: tests\e2e\17-memory-palace-gl.spec.ts:476:7

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('[data-palace-overlay="journey"]')
Expected substring: "2 of 2 visited"
Received string:    "Visual journey mapStop 2 of 8Sky Room3 of 3 visited01Evaporation02Condensation03My own factGround Room0 of 2 visited04Precipitation05CollectionOcean Room0 of 2 visited06Runoff07InfiltrationMy Attic0 of 1 visited08Attic thing"
Timeout: 15000ms

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('[data-palace-overlay="journey"]')
    14 × locator resolved to <section role="region" data-palace-overlay="journey" aria-label="Visual journey map">…</section>
       - unexpected value "Visual journey mapStop 2 of 8Sky Room3 of 3 visited01Evaporation02Condensation03My own factGround Room0 of 2 visited04Precipitation05CollectionOcean Room0 of 2 visited06Runoff07InfiltrationMy Attic0 of 1 visited08Attic thing"

```

```yaml
- region "Visual journey map":
  - text: Visual journey map
  - status: Stop 2 of 8
  - text: Sky Room 3 of 3 visited
  - 'button "Go to stop 1: Evaporation. Visited"': Evaporation ✓
  - 'button "Go to stop 2: Condensation. Visited"': Condensation ✓
  - 'button "Go to stop 3: My own fact. Visited"': My own fact ✓
  - text: Ground Room 0 of 2 visited
  - 'button "Go to stop 4: Precipitation. Not yet visited"': Precipitation
  - 'button "Go to stop 5: Collection. Not yet visited"': Collection
  - text: Ocean Room 0 of 2 visited
  - 'button "Go to stop 6: Runoff. Not yet visited"': Runoff
  - 'button "Go to stop 7: Infiltration. Not yet visited"': Infiltration
  - text: My Attic 0 of 1 visited
  - 'button "Go to stop 8: Attic thing. Not yet visited"': Attic thing
```

# Test source

```ts
  394 |     const collisionState = await page.evaluate((data) => {
  395 |       const MP = (window as any).AlloModules.MemoryPalace;
  396 |       const palace = MP.buildPalace(data);
  397 |       const cue = document.querySelector('[data-palace-overlay="free-nav"]');
  398 |       return {
  399 |         local: MP.worldToRoomLocal(palace.rooms[1], (window as any).__lastCamera.position.x, (window as any).__lastCamera.position.z),
  400 |         blocked: cue?.getAttribute('data-blocked'),
  401 |         text: cue?.textContent || '',
  402 |       };
  403 |     }, SAMPLE);
  404 |     await page.keyboard.up('w');
  405 |     const clearance = -360 + 5 + 28;
  406 |     expect(collisionState.local.lz).toBeGreaterThanOrEqual(clearance - 0.2);
  407 |     expect(collisionState.blocked).toBe('true');
  408 |     expect(collisionState.text).toMatch(/Wall ahead/i);
  409 |     expect((await page.evaluate(() => (window as any).__glLive())).lost).toBe(false);
  410 |   });
  411 | 
  412 | 
  413 |   test('gives every room a stable landmark and connects thresholds to the compass plaza', async ({ page }) => {
  414 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  415 |     await mount(page);
  416 |     const metrics = await page.evaluate(() => (window as any).__palaceVisualMetrics());
  417 |     expect(metrics.roles['room-landmark']).toBe(4);
  418 |     expect(metrics.roles['plaza-compass']).toBe(12);
  419 |     expect(metrics.roles['hub-promenade']).toBe(4);
  420 |     expect(metrics.roles['gallery-wainscot']).toBe(8);
  421 |     expect(metrics.roles['gallery-light-strip']).toBe(8);
  422 |     const variants = await page.evaluate(() => {
  423 |       const out: number[] = [];
  424 |       (window as any).__lastScene.traverse((o: any) => { if (o.userData.visualRole === 'room-landmark') out.push(o.userData.variant); });
  425 |       return out;
  426 |     });
  427 |     expect(new Set(variants).size).toBe(4);
  428 |     await page.locator('[data-palace-action="overview"]').click();
  429 |     expect(await page.evaluate(() => (window as any).__lastScene.fog.density)).toBe(0);
  430 |     await page.evaluate(() => (window as any).__handle.goTo(1));
  431 |     expect(await page.evaluate(() => (window as any).__lastScene.fog.density)).toBeGreaterThan(0);
  432 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  433 |   });
  434 | 
  435 |   test('distinguishes jumping to the final stop from visiting the entire route', async ({ page }) => {
  436 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  437 |     await mount(page);
  438 |     await page.evaluate(() => (window as any).__handle.goTo(8));
  439 |     const summary = page.locator('[data-palace-overlay="completion"]');
  440 |     await expect(summary).toContainText('Final stop reached');
  441 |     await expect(summary).toContainText('Visited 1 of 8 stops');
  442 |     await page.evaluate(() => { for (let i = 1; i <= 8; i++) (window as any).__handle.goTo(i); });
  443 |     await expect(summary).toContainText('Route complete');
  444 |     await expect(summary).toContainText('Visited 8 of 8 stops');
  445 |     await summary.getByRole('button', { name: 'Walk again', exact: true }).click();
  446 |     await expect(page.locator('#wrap canvas')).toBeFocused();
  447 |     await expect(summary).toBeHidden();
  448 |     await page.evaluate(() => (window as any).__handle.goTo(8));
  449 |     await expect(summary).toContainText('Visited 1 of 8 stops');
  450 |   });
  451 | 
  452 |   test('makes long cues expandable and map destinations readable on a small screen', async ({ page }) => {
  453 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  454 |     const longCue = 'A waterfall pours over my front door, splashes my shoes, and sings the names of the clouds. '.repeat(12);
  455 |     await mount(page, { main: 'My route', branches: [{ title: 'Home', items: ['Evaporation', 'Condensation'], mnemonics: [longCue, 'A cloud in the hallway.'] }] });
  456 |     await page.evaluate(() => { const wrap = document.getElementById('wrap')!; wrap.style.width = '390px'; wrap.style.height = '740px'; (window as any).__handle.goTo(1); });
  457 |     await page.waitForTimeout(300);
  458 |     const toggle = page.locator('[data-palace-action="expand-cue"]');
  459 |     await toggle.click();
  460 |     await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  461 |     const card = page.locator('[data-palace-overlay="focus"]');
  462 |     const cardBox = await card.boundingBox();
  463 |     const dockBox = await page.locator('[data-palace-overlay="dock"]').boundingBox();
  464 |     expect(cardBox!.y + cardBox!.height).toBeLessThan(dockBox!.y);
  465 |     await toggle.click();
  466 |     await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  467 |     await page.locator('[data-palace-action="overview"]').click();
  468 |     const first = page.locator('[data-journey-index="1"]');
  469 |     await expect(first).toContainText('Evaporation');
  470 |     expect((await first.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  471 |     await expect(first).toHaveAttribute('data-visited', 'true');
  472 |     await page.locator('[data-journey-index="2"]').click();
  473 |     await expect(card).toContainText('Condensation');
  474 |   });
  475 | 
  476 |   test('shows visited map stops separately from skipped stops and the current position', async ({ page }) => {
  477 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  478 |     await mount(page, SAMPLE);
  479 |     await page.evaluate(() => { (window as any).__handle.goTo(1); (window as any).__handle.goTo(3); });
  480 |     await page.locator('[data-palace-action="overview"]').click();
  481 |     const first = page.locator('[data-journey-index="1"]');
  482 |     const skipped = page.locator('[data-journey-index="2"]');
  483 |     const current = page.locator('[data-journey-index="3"]');
  484 |     await expect(first.locator('[data-journey-marker]')).toHaveAttribute('data-state', 'check');
  485 |     await expect(first).toHaveAccessibleName(/Visited$/);
  486 |     await expect(skipped.locator('[data-journey-marker]')).toHaveAttribute('data-state', '');
  487 |     await expect(skipped).toHaveAccessibleName(/Not yet visited$/);
  488 |     await expect(current).toHaveAttribute('aria-current', 'step');
  489 |     await expect(current.locator('[data-journey-marker]')).toHaveAttribute('data-state', 'next');
  490 |     await skipped.click();
  491 |     await page.locator('[data-palace-action="overview"]').click();
  492 |     await expect(current.locator('[data-journey-marker]')).toHaveAttribute('data-state', 'check');
  493 |     await expect(skipped).toHaveAttribute('aria-current', 'step');
> 494 |     await expect(page.locator('[data-palace-overlay="journey"]')).toContainText('2 of 2 visited');
      |                                                                   ^ Error: expect(locator).toContainText(expected) failed
  495 |   });
  496 | 
  497 |   test('keeps landmarks in recall while withholding memory answers and cue controls', async ({ page }) => {
  498 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  499 |     await mount(page, SAMPLE, { recall: true });
  500 |     await page.evaluate(() => (window as any).__handle.goTo(1));
  501 |     await expect(page.locator('[data-palace-overlay="focus"]')).toBeHidden();
  502 |     await expect(page.locator('[data-palace-action="expand-cue"]')).toBeHidden();
  503 |     await expect(page.locator('[data-palace-overlay="journey"]')).toBeHidden();
  504 |     const metrics = await page.evaluate(() => (window as any).__palaceVisualMetrics());
  505 |     expect(metrics.roles['room-landmark']).toBe(4);
  506 |     await page.locator('#wrap canvas').focus();
  507 |     await page.keyboard.down('w');
  508 |     await page.keyboard.up('w');
  509 |     await expect(page.locator('[data-palace-overlay="free-nav"]')).toBeVisible();
  510 |     await expect(page.locator('[data-palace-room-controls]')).toBeHidden();
  511 |     await expect(page.locator('[data-palace-overlay="free-nav"]')).not.toContainText('Evaporation');
  512 |     await expect(page.locator('[data-palace-overlay="free-nav"]')).not.toContainText('Condensation');
  513 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  514 |   });
  515 | 
  516 | 
  517 |   test('begins a walk and inspects its room without losing the current stop', async ({ page }) => {
  518 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  519 |     await mount(page);
  520 |     await page.locator('[data-palace-action="begin-walk"]').click();
  521 |     await expect(page.locator('#wrap canvas')).toBeFocused();
  522 |     await expect(page.locator('[data-palace-overlay="focus"]')).toContainText('Evaporation');
  523 |     await page.locator('[data-palace-action="inspect-room"]').click();
  524 |     await expect(page.locator('[data-palace-overlay="focus"]')).toBeHidden();
  525 |     await expect(page.locator('[data-palace-overlay="free-nav"]')).toBeVisible();
  526 |     const roomKey = await page.evaluate(data => {
  527 |       const w = window as any;
  528 |       const p = w.AlloModules.MemoryPalace.buildPalace(data);
  529 |       return w.AlloModules.MemoryPalace.roomAtPoint(p, w.__lastCamera.position.x, w.__lastCamera.position.z)?.roomKey;
  530 |     }, SAMPLE);
  531 |     expect(roomKey).toBe('b0');
  532 |     expect(await page.evaluate(() => (window as any).__lastCamera.fov)).toBe(68);
  533 |     await page.getByRole('button', { name: 'Return to guided route', exact: true }).click();
  534 |     await expect(page.locator('[data-palace-overlay="focus"]')).toContainText('Evaporation');
  535 |     await expect(page.locator('#wrap canvas')).toBeFocused();
  536 |     expect(await page.evaluate(() => (window as any).__lastCamera.fov)).toBe(58);
  537 |     await page.keyboard.press('r');
  538 |     await expect(page.locator('[data-palace-overlay="free-nav"]')).toBeVisible();
  539 |     await page.locator('[data-palace-action="overview"]').click();
  540 |     await expect(page.locator('[data-palace-overlay="journey"]')).toBeVisible();
  541 |     await expect(page.locator('[data-palace-overlay="free-nav"]')).toBeHidden();
  542 |     await expect.poll(() => page.evaluate(() => (window as any).__lastCamera.position.y), { timeout: 15000 }).toBeGreaterThan(1000);
  543 |   });
  544 | 
  545 |   test('opens gallery ceilings for the map and restores them during exploration', async ({ page }) => {
  546 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  547 |     await mount(page);
  548 |     const signsInPlace = (mode: 'walk' | 'map') => page.evaluate(mode => {
  549 |       const signs: any[]=[];
  550 |       (window as any).__lastScene.traverse((o: any) => { if(o.userData.visualRole==='room-wayfinding-label') signs.push(o); });
  551 |       return signs.length>1 && signs.every(sign => sign.position.distanceTo(mode==='map'?sign.userData.roomMapPosition:sign.userData.roomWalkPosition)<.01);
  552 |     },mode);
  553 |     const canopies = () => page.evaluate(() => { const a: boolean[] = []; (window as any).__lastScene.traverse((o: any) => { if (o.userData.visualRole === 'gallery-canopy') a.push(o.visible); }); return a; });
  554 |     expect(await canopies()).toEqual([true, true, true, true]);
  555 |     expect(await signsInPlace('walk')).toBe(true);
  556 |     await page.locator('[data-palace-action="overview"]').click();
  557 |     expect(await canopies()).toEqual([false, false, false, false]);
  558 |     expect(await signsInPlace('map')).toBe(true);
  559 |     await page.locator('[data-palace-action="inspect-room"]').click();
  560 |     expect(await canopies()).toEqual([true, true, true, true]);
  561 |     expect(await signsInPlace('walk')).toBe(true);
  562 |     await expect(page.locator('[data-palace-overlay="journey"]')).toBeHidden();
  563 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  564 |   });
  565 | 
  566 |   test('visits skipped stops without erasing progress and hides completion actions in recall', async ({ page }) => {
  567 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  568 |     await mount(page);
  569 |     await page.evaluate(() => (window as any).__handle.goTo(8));
  570 |     const remaining = page.locator('[data-palace-action="visit-remaining"]');
  571 |     await expect(remaining).toContainText('(7)');
  572 |     await remaining.click();
  573 |     await expect(page.locator('[data-palace-overlay="focus"]')).toContainText('Evaporation');
  574 |     await page.evaluate(() => (window as any).__handle.goTo(8));
  575 |     await expect(remaining).toContainText('(6)');
  576 |     await page.evaluate(() => { for (let n=1;n<=8;n++) (window as any).__handle.goTo(n); });
  577 |     await expect(remaining).toBeHidden();
  578 |     await page.evaluate(() => (window as any).__handle.destroy());
  579 |     await page.evaluate(data => (window as any).__mount(data, { recall: true }), SAMPLE);
  580 |     await page.waitForSelector('#wrap canvas');
  581 |     await expect(page.locator('[data-palace-action="inspect-room"]')).toBeHidden();
  582 |     await expect(page.locator('[data-palace-action="begin-walk"]')).toBeHidden();
  583 |     await expect(remaining).toBeHidden();
  584 |   });
  585 | 
  586 |   test('keeps short cues fully readable under zoom and disables begin for an empty palace', async ({ page }) => {
  587 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  588 |     const cue = 'A cloud in my hallway grows bright green shoes and dances through the door.';
  589 |     await mount(page, { main: 'My room', branches: [{ title: 'Hallway', items: ['Cloud'], mnemonics: [cue] }] });
  590 |     await page.evaluate(() => { document.getElementById('wrap')!.style.width='320px'; document.getElementById('wrap')!.style.height='740px'; document.documentElement.style.fontSize='28px'; (window as any).__handle.goTo(1); });
  591 |     await expect(page.locator('[data-palace-action="expand-cue"]')).toBeHidden();
  592 |     expect(await page.locator('[id^="palace-cue-"]').evaluate(el => getComputedStyle(el).webkitLineClamp)).toBe('none');
  593 |     await page.evaluate(() => (window as any).__handle.destroy());
  594 |     await page.evaluate(() => (window as any).__mount({ main:'Empty', branches: [] }));
```