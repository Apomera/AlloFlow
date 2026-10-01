# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: astronomy-observatory-3d.spec.ts >> deep time moves the real star field and withholds the solar system
- Location: tests\e2e\astronomy-observatory-3d.spec.ts:495:5

# Error details

```
Error: page.screenshot: Clipped area is either empty or outside the resulting image
Call log:
  - taking page screenshot
  - waiting for fonts to load...
  - fonts loaded

```

# Test source

```ts
  428 |   if (north.moon.alt > 5) {
  429 |     await sky.evaluate((el: any, m: any) => el.__observatoryLookAt(m.az, m.alt), north.moon);
  430 |     await sky.focus();
  431 |     await sky.press('Enter');
  432 |     await expect.poll(async () => (await debug(sky)).picked?.kind).toBe('moon');
  433 |   }
  434 |   expect(errors).toEqual([]);
  435 | });
  436 | 
  437 | test('jump buttons land on the computed sunset, and the Sky Map hands its place and time to the observatory', async ({ page }) => {
  438 |   const { sky, errors } = await mountObservatory(page, EVENING);
  439 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  440 |   const sunsetButton = page.getByRole('button', { name: /^Jump to Sunset \d\d:\d\d$/ });
  441 |   const label = (await sunsetButton.getAttribute('aria-label'))!;
  442 |   const time = label.match(/(\d\d:\d\d)$/)![1];
  443 |   await sunsetButton.click();
  444 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsTime)).toBe(time);
  445 |   const atSunset = await debug(sky);
  446 |   expect(atSunset.sun.alt).toBeGreaterThan(-1.5);
  447 |   expect(atSunset.sun.alt).toBeLessThan(0.3);
  448 |   // A Sun on the horizon is seen through tens of airmasses, and is drawn accordingly.
  449 |   expect(atSunset.sunExt).toBeGreaterThan(2);
  450 |   await sky.screenshot({ path: 'scratch/observatory-sunset.png' });
  451 |   // Sky Map → Observatory hand-off.
  452 |   await page.evaluate(() => (window as any).__destroy());
  453 |   await page.evaluate(() => (window as any).__mount({ tab: 'skymap', skyLoc: 'sydney', skyHourOffset: 3 }));
  454 |   await page.getByRole('button', { name: 'Open this place and time in the 3D Observatory', exact: true }).click();
  455 |   const state = await page.evaluate(() => (window as any).__toolData.astronomy);
  456 |   expect(state.tab).toBe('observatory');
  457 |   expect(state.obsSite).toBe('sydney');
  458 |   expect(state.obsTz).toBe('Australia/Sydney');
  459 |   expect(state.obsLive).toBe(false);
  460 |   await expect(page.locator('#astronomy-observatory-summary')).toContainText('Sydney, Australia');
  461 |   expect(errors).toEqual([]);
  462 | });
  463 | 
  464 | test('tour steps aim the camera, describe-view names what is in front of it, and picking a pattern star highlights its figure', async ({ page }) => {
  465 |   await page.setViewportSize({ width: 1280, height: 1500 });
  466 |   const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  467 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  468 |   // Tour appears once the catalog is cached, with a ★ Find button for the current step.
  469 |   await expect(page.locator('#astronomy-observatory-tour')).toContainText(/Tonight's tour · 1 \/ \d/);
  470 |   const before = (await debug(sky)).camera;
  471 |   await page.getByRole('button', { name: /^🔎 ★ / }).first().click();
  472 |   const after = (await debug(sky)).camera;
  473 |   expect(after.yaw !== before.yaw || after.pitch !== before.pitch).toBe(true);
  474 |   await page.getByRole('button', { name: 'Next ›', exact: true }).click();
  475 |   await expect(page.locator('#astronomy-observatory-tour')).toContainText(/· 2 \/ \d/);
  476 |   // Describe the view from the tour target.
  477 |   await page.getByRole('button', { name: /Describe this view/ }).click();
  478 |   const described = page.locator('#astronomy-observatory-described');
  479 |   await expect(described).toContainText(/^Facing [NESW]+, \d+° up/);
  480 |   await expect(described).toContainText('In view');
  481 |   // Identify Betelgeuse by clicking on it: the Orion figure gets highlighted.
  482 |   await openSettings(page);
  483 |   await page.getByLabel('Highlight a constellation', { exact: true }).selectOption('orion');
  484 |   await page.getByRole('button', { name: '🔎 Orion', exact: true }).click();
  485 |   await page.getByLabel('Highlight a constellation', { exact: true }).selectOption('');
  486 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsHighlight)).toBe('');
  487 |   await sky.scrollIntoViewIfNeeded();
  488 |   const spots = (await debug(sky)).spots.byName;
  489 |   const target = ['Betelgeuse', 'Rigel'].find(n => spots[n]);
  490 |   expect(target, 'an Orion star on screen').toBeTruthy();
  491 |   const box = (await sky.boundingBox())!;
  492 |   await page.mouse.click(box.x + spots[target!].x, box.y + spots[target!].y);
  493 |   await expect.poll(async () => (await debug(sky)).picked?.name).toBe(target);
  494 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsHighlight)).toBe('orion');
  495 |   await expect(page.locator('#astronomy-observatory-picked')).toContainText('Part of Orion');
  496 |   await sky.screenshot({ path: 'scratch/observatory-identify-orion.png' });
  497 |   expect(errors).toEqual([]);
  498 | });
  499 | 
  500 | test('deep time moves the real star field and withholds the solar system', async ({ page }) => {
  501 |   const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  502 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  503 |   await expect.poll(async () => (await debug(sky)).withMotion).toBeGreaterThan(8000);
  504 |   await sky.evaluate((el: any) => el.__observatoryLookAt(180, 40));
  505 |   const before = await debug(sky);
  506 |   expect(before.deepTime).toBe(false);
  507 |   expect(before.drift).toBe(0);
  508 |   const namedBefore = before.spots.byName;
  509 |   expect(Object.keys(namedBefore).length).toBeGreaterThan(2);
  510 |   await sky.screenshot({ path: 'scratch/observatory-drift-today.png' });
  511 | 
  512 |   await openSettings(page);
  513 |   await page.getByLabel(/Deep time: star motion/).fill('100000');
  514 |   await expect.poll(async () => (await debug(sky)).drift).toBe(100000);
  515 |   const after = await debug(sky);
  516 |   expect(after.deepTime).toBe(true);
  517 |   // Stars are still there and still bright, but they have moved.
  518 |   expect(after.starsUp).toBeGreaterThan(3000);
  519 |   const shared = Object.keys(namedBefore).filter(n => after.spots.byName[n]);
  520 |   expect(shared.length).toBeGreaterThan(0);
  521 |   const moved = shared.map(n => Math.hypot(after.spots.byName[n].x - namedBefore[n].x, after.spots.byName[n].y - namedBefore[n].y));
  522 |   expect(Math.max(...moved)).toBeGreaterThan(3);
  523 |   // The solar system is withheld at this range rather than drawn wrongly.
  524 |   expect(after.planets.every((p: any) => !p.visible)).toBe(true);
  525 |   expect(after.labels.some((l: string) => /Moon/.test(l))).toBe(false);
  526 |   expect(after.deepSky).toEqual([]);
  527 |   // The Moon's glow is painted by the sky shader, so hiding the sprite is not enough.
> 528 |   expect(before.skyMoonGlow).toBeGreaterThan(0);
      |              ^ Error: page.screenshot: Clipped area is either empty or outside the resulting image
  529 |   expect(after.skyMoonGlow).toBe(0);
  530 |   expect(after.skySunAlt).toBe(-90);
  531 |   await expect(page.getByText('Deep-time view')).toBeVisible();
  532 |   await expect(page.locator('#astronomy-observatory-tour')).toContainText('The sky in 100,000 years');
  533 |   await sky.screenshot({ path: 'scratch/observatory-drift-100k.png' });
  534 | 
  535 |   await page.getByRole('button', { name: 'Back to today', exact: true }).click();
  536 |   await expect.poll(async () => (await debug(sky)).drift).toBe(0);
  537 |   const restored = await debug(sky);
  538 |   expect(restored.deepTime).toBe(false);
  539 |   const backAgain = shared.map(n => restored.spots.byName[n] ? Math.hypot(restored.spots.byName[n].x - namedBefore[n].x, restored.spots.byName[n].y - namedBefore[n].y) : 0);
  540 |   expect(Math.max(...backAgain)).toBeLessThan(1.5);
  541 |   expect(errors).toEqual([]);
  542 | });
  543 | 
  544 | test('star trails draw computed arcs, lengthen with the span, and stay off in daylight', async ({ page }) => {
  545 |   const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  546 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  547 |   expect((await debug(sky)).trails).toBe(false);
  548 |   await openSettings(page);
  549 |   await page.getByRole('button', { name: 'Star trails', exact: true }).click();
  550 |   await expect.poll(async () => (await debug(sky)).trails).toBe(true);
  551 |   const four = await debug(sky);
  552 |   expect(four.trailHours).toBe(4);
  553 |   expect(four.trailStars).toBeGreaterThan(20);
  554 |   // Face the pole: the arcs should be visibly concentric there.
  555 |   await page.getByRole('button', { name: 'Face north', exact: true }).click();
  556 |   await sky.screenshot({ path: 'scratch/observatory-trails-pole.png' });
  557 |   await page.getByLabel('Trail length', { exact: true }).selectOption('8');
  558 |   await expect.poll(async () => (await debug(sky)).trailHours).toBe(8);
  559 |   expect((await debug(sky)).trailStars).toBeGreaterThan(20);
  560 |   await sky.evaluate((el: any) => el.__observatoryLookAt(180, 35));
  561 |   await sky.screenshot({ path: 'scratch/observatory-trails-south.png' });
  562 |   // Daylight washes the trails out along with the stars.
  563 |   await page.getByLabel('Local time', { exact: true }).fill('12:00');
  564 |   await expect.poll(async () => (await debug(sky)).sun.alt).toBeGreaterThan(0);
  565 |   expect((await debug(sky)).trails).toBe(false);
  566 |   await expect(page.locator('#astronomy-observatory-summary')).toContainText('Star trails');
  567 |   expect(errors).toEqual([]);
  568 | });
  569 | 
  570 | test('a star picked from the sky reaches the printed plan with its times', async ({ page }) => {
  571 |   await page.setViewportSize({ width: 1280, height: 1500 });
  572 |   const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  573 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  574 |   // Identify a real star by clicking it.
  575 |   const info = await debug(sky);
  576 |   await sky.evaluate((el: any, s: any) => el.__observatoryLookAt(s.az, s.alt), info.brightStar);
  577 |   await sky.scrollIntoViewIfNeeded();
  578 |   const spot = (await debug(sky)).spots.star;
  579 |   const box = (await sky.boundingBox())!;
  580 |   await page.mouse.click(box.x + spot.x, box.y + spot.y);
  581 |   const name = info.brightStar.name;
  582 |   await expect.poll(async () => (await debug(sky)).picked?.name).toBe(name);
  583 |   // Save it, and it appears in the tab's list.
  584 |   await page.getByRole('button', { name: /Add to tonight's list/ }).click();
  585 |   await expect(page.locator('#astronomy-observatory-targets')).toContainText(name);
  586 |   await expect(page.getByRole('button', { name: /On tonight's list/ })).toBeVisible();
  587 |   const saved = await page.evaluate(() => (window as any).__toolData.astronomy.obsTargets);
  588 |   expect(saved).toHaveLength(1);
  589 |   expect(saved[0].name).toBe(name);
  590 |   expect(Number.isFinite(saved[0].ra)).toBe(true);
  591 |   // It survives into the printed kit with a real timetable.
  592 |   await page.getByRole('tab', { name: /Print/ }).click();
  593 |   const table = page.locator('table[aria-label="My targets tonight"]');
  594 |   await expect(table).toContainText(name);
  595 |   await expect(table.locator('tbody tr')).toHaveCount(1);
  596 |   await expect(page.locator('#astro-tonight-plan-heading')).toContainText('Portland, Maine');
  597 |   await page.screenshot({ path: 'scratch/observatory-print-plan.png', fullPage: false });
  598 |   expect(errors).toEqual([]);
  599 | });
  600 | 
  601 | test('reduced motion keeps the scene still and disables time-lapse', async ({ page }) => {
  602 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  603 |   const { sky, errors } = await mountObservatory(page, { ...EVENING, obsShower: 'perseids', obsDate: '2026-08-12' });
  604 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  605 |   await page.waitForTimeout(300);
  606 |   const info = await debug(sky);
  607 |   expect(info.raf).toBe(false);
  608 |   await expect(page.getByRole('button', { name: 'Play time-lapse', exact: true })).toBeDisabled();
  609 |   await expect(page.getByText('Reduced motion is on')).toBeVisible();
  610 |   expect(errors).toEqual([]);
  611 | });
  612 | 
```