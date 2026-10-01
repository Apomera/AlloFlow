# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: astronomy-observatory-3d.spec.ts >> jump buttons land on the computed sunset, and the Sky Map hands its place and time to the observatory
- Location: tests\e2e\astronomy-observatory-3d.spec.ts:432:5

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
  345 |   const { sky, errors } = await mountObservatory(page, EVENING);
  346 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  347 |   await sky.focus();
  348 |   await sky.press('ArrowRight');
  349 |   expect((await debug(sky)).camera.yaw).toBe(185);
  350 |   await sky.press('Home');
  351 |   expect((await debug(sky)).camera.yaw).toBe(180);
  352 |   await page.getByRole('button', { name: 'Face north', exact: true }).click();
  353 |   expect((await debug(sky)).camera.yaw).toBe(0);
  354 |   const box = (await sky.boundingBox())!;
  355 |   await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  356 |   await page.mouse.down();
  357 |   await page.mouse.move(box.x + box.width * .8, box.y + box.height * .55, { steps: 4 });
  358 |   await page.mouse.up();
  359 |   expect((await debug(sky)).camera.yaw).not.toBe(0);
  360 |   const info = await debug(sky);
  361 |   if (info.moon.alt > 0) {
  362 |     await page.getByRole('button', { name: '🔎 Moon', exact: true }).click();
  363 |     expect(Math.abs((await debug(sky)).camera.yaw - info.moon.az)).toBeLessThan(1);
  364 |   }
  365 |   await openSettings(page);
  366 |   await page.getByRole('button', { name: 'Constellation lines', exact: true }).click();
  367 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsLayers.lines)).toBe(false);
  368 |   await page.getByRole('button', { name: 'Compass points', exact: true }).click();
  369 |   await expect.poll(async () => (await debug(sky)).labels.includes('N')).toBe(false);
  370 |   await page.getByLabel('Highlight a constellation', { exact: true }).selectOption('cygnus');
  371 |   await page.getByRole('button', { name: '🔎 Cygnus', exact: true }).click();
  372 |   const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  373 |   expect(overflow).toBeLessThanOrEqual(1);
  374 |   expect(errors).toEqual([]);
  375 | });
  376 | 
  377 | test('falls back to built-in bright stars when the catalog asset is unavailable, and disposes on navigation', async ({ page }) => {
  378 |   await page.route('**/hyg-v41-naked-eye.json', route => route.fulfill({ status: 500, body: 'nope' }));
  379 |   const { sky, errors } = await mountObservatory(page, EVENING);
  380 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(0);
  381 |   const info = await debug(sky);
  382 |   expect(info.fallback).toBe(true);
  383 |   expect(info.catalog).toBeLessThan(100);
  384 |   // Partial patterns would look broken, so lines stay hidden on the fallback even where a few resolve.
  385 |   expect(info.linesVisible).toBe(false);
  386 |   await expect(page.getByText('Built-in bright stars only')).toBeVisible();
  387 |   await page.evaluate(() => { (window as any).__oldSky = document.getElementById('astronomy-observatory-3d'); });
  388 |   await page.getByRole('tab', { name: /Meteors/ }).click();
  389 |   expect(await page.evaluate(() => !!(window as any).__oldSky.__observatoryDebug)).toBe(false);
  390 |   await expect(page.locator('#astronomy-observatory-3d')).toHaveCount(0);
  391 |   // The injected 500 is the only acceptable console error here.
  392 |   expect(errors.filter(e => !/status of 500/.test(e))).toEqual([]);
  393 | });
  394 | 
  395 | test('click-to-identify names a real star, guides and pole appear, deep-sky glows and the Moon surface load', async ({ page }) => {
  396 |   const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  397 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  398 |   await expect.poll(async () => (await debug(sky)).moonFace).toBe(true);
  399 |   const info = await debug(sky);
  400 |   expect(info.deepSky).toEqual(expect.arrayContaining(['m45', 'm42']));
  401 |   await expect(page.getByRole('button', { name: '🔎 Pleiades (M45)', exact: true })).toBeVisible();
  402 |   // Turn toward the brightest named star on screen and click exactly on it.
  403 |   expect(info.brightStar).toBeTruthy();
  404 |   await sky.evaluate((el: any, s: any) => el.__observatoryLookAt(s.az, s.alt), info.brightStar);
  405 |   await sky.scrollIntoViewIfNeeded();
  406 |   const spot = (await debug(sky)).spots.star;
  407 |   expect(spot).toBeTruthy();
  408 |   const box = (await sky.boundingBox())!;
  409 |   await page.mouse.click(box.x + spot.x, box.y + spot.y);
  410 |   await expect.poll(async () => (await debug(sky)).picked?.name).toBe(info.brightStar.name);
  411 |   await expect(page.locator('#astronomy-observatory-picked')).toContainText(info.brightStar.name);
  412 |   await expect(page.locator('#astronomy-observatory-picked')).toContainText(/HIP \d+/);
  413 |   await page.getByRole('button', { name: 'Clear', exact: true }).click();
  414 |   await expect.poll(async () => (await debug(sky)).picked).toBeNull();
  415 |   // Guides: ecliptic, equator and the celestial pole at the site latitude.
  416 |   await openSettings(page);
  417 |   await page.getByRole('button', { name: 'Ecliptic and equator', exact: true }).click();
  418 |   await expect.poll(async () => (await debug(sky)).guides).toBe(true);
  419 |   await page.getByRole('button', { name: '🔎 Celestial pole', exact: true }).click();
  420 |   const north = await debug(sky);
  421 |   expect(north.poleVisible).toBe(true);
  422 |   expect(Math.abs(north.camera.yaw)).toBeLessThan(1);
  423 |   expect(north.labels).toContain('Celestial pole');
  424 |   await sky.screenshot({ path: 'scratch/observatory-guides-pole.png' });
  425 |   // Enter identifies what sits at the centre of the view (pole marker is not an object, so aim at the Moon if up).
  426 |   if (north.moon.alt > 5) {
  427 |     await sky.evaluate((el: any, m: any) => el.__observatoryLookAt(m.az, m.alt), north.moon);
  428 |     await sky.focus();
  429 |     await sky.press('Enter');
  430 |     await expect.poll(async () => (await debug(sky)).picked?.kind).toBe('moon');
  431 |   }
  432 |   expect(errors).toEqual([]);
  433 | });
  434 | 
  435 | test('jump buttons land on the computed sunset, and the Sky Map hands its place and time to the observatory', async ({ page }) => {
  436 |   const { sky, errors } = await mountObservatory(page, EVENING);
  437 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  438 |   const sunsetButton = page.getByRole('button', { name: /^Jump to Sunset \d\d:\d\d$/ });
  439 |   const label = (await sunsetButton.getAttribute('aria-label'))!;
  440 |   const time = label.match(/(\d\d:\d\d)$/)![1];
  441 |   await sunsetButton.click();
  442 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsTime)).toBe(time);
  443 |   const atSunset = await debug(sky);
  444 |   expect(atSunset.sun.alt).toBeGreaterThan(-1.5);
> 445 |   expect(atSunset.sun.alt).toBeLessThan(0.3);
      |              ^ Error: page.screenshot: Clipped area is either empty or outside the resulting image
  446 |   // A Sun on the horizon is seen through tens of airmasses, and is drawn accordingly.
  447 |   expect(atSunset.sunExt).toBeGreaterThan(2);
  448 |   await sky.screenshot({ path: 'scratch/observatory-sunset.png' });
  449 |   // Sky Map → Observatory hand-off.
  450 |   await page.evaluate(() => (window as any).__destroy());
  451 |   await page.evaluate(() => (window as any).__mount({ tab: 'skymap', skyLoc: 'sydney', skyHourOffset: 3 }));
  452 |   await page.getByRole('button', { name: 'Open this place and time in the 3D Observatory', exact: true }).click();
  453 |   const state = await page.evaluate(() => (window as any).__toolData.astronomy);
  454 |   expect(state.tab).toBe('observatory');
  455 |   expect(state.obsSite).toBe('sydney');
  456 |   expect(state.obsTz).toBe('Australia/Sydney');
  457 |   expect(state.obsLive).toBe(false);
  458 |   await expect(page.locator('#astronomy-observatory-summary')).toContainText('Sydney, Australia');
  459 |   expect(errors).toEqual([]);
  460 | });
  461 | 
  462 | test('tour steps aim the camera, describe-view names what is in front of it, and picking a pattern star highlights its figure', async ({ page }) => {
  463 |   await page.setViewportSize({ width: 1280, height: 1500 });
  464 |   const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  465 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  466 |   // Tour appears once the catalog is cached, with a ★ Find button for the current step.
  467 |   await expect(page.locator('#astronomy-observatory-tour')).toContainText(/Tonight's tour · 1 \/ \d/);
  468 |   const before = (await debug(sky)).camera;
  469 |   await page.getByRole('button', { name: /^🔎 ★ / }).first().click();
  470 |   const after = (await debug(sky)).camera;
  471 |   expect(after.yaw !== before.yaw || after.pitch !== before.pitch).toBe(true);
  472 |   await page.getByRole('button', { name: 'Next ›', exact: true }).click();
  473 |   await expect(page.locator('#astronomy-observatory-tour')).toContainText(/· 2 \/ \d/);
  474 |   // Describe the view from the tour target.
  475 |   await page.getByRole('button', { name: /Describe this view/ }).click();
  476 |   const described = page.locator('#astronomy-observatory-described');
  477 |   await expect(described).toContainText(/^Facing [NESW]+, \d+° up/);
  478 |   await expect(described).toContainText('In view');
  479 |   // Identify Betelgeuse by clicking on it: the Orion figure gets highlighted.
  480 |   await openSettings(page);
  481 |   await page.getByLabel('Highlight a constellation', { exact: true }).selectOption('orion');
  482 |   await page.getByRole('button', { name: '🔎 Orion', exact: true }).click();
  483 |   await page.getByLabel('Highlight a constellation', { exact: true }).selectOption('');
  484 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsHighlight)).toBe('');
  485 |   await sky.scrollIntoViewIfNeeded();
  486 |   const spots = (await debug(sky)).spots.byName;
  487 |   const target = ['Betelgeuse', 'Rigel'].find(n => spots[n]);
  488 |   expect(target, 'an Orion star on screen').toBeTruthy();
  489 |   const box = (await sky.boundingBox())!;
  490 |   await page.mouse.click(box.x + spots[target!].x, box.y + spots[target!].y);
  491 |   await expect.poll(async () => (await debug(sky)).picked?.name).toBe(target);
  492 |   await expect.poll(() => page.evaluate(() => (window as any).__toolData.astronomy.obsHighlight)).toBe('orion');
  493 |   await expect(page.locator('#astronomy-observatory-picked')).toContainText('Part of Orion');
  494 |   await sky.screenshot({ path: 'scratch/observatory-identify-orion.png' });
  495 |   expect(errors).toEqual([]);
  496 | });
  497 | 
  498 | test('deep time moves the real star field and withholds the solar system', async ({ page }) => {
  499 |   const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  500 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  501 |   await expect.poll(async () => (await debug(sky)).withMotion).toBeGreaterThan(8000);
  502 |   await sky.evaluate((el: any) => el.__observatoryLookAt(180, 40));
  503 |   const before = await debug(sky);
  504 |   expect(before.deepTime).toBe(false);
  505 |   expect(before.drift).toBe(0);
  506 |   const namedBefore = before.spots.byName;
  507 |   expect(Object.keys(namedBefore).length).toBeGreaterThan(2);
  508 |   await sky.screenshot({ path: 'scratch/observatory-drift-today.png' });
  509 | 
  510 |   await openSettings(page);
  511 |   await page.getByLabel(/Deep time: star motion/).fill('100000');
  512 |   await expect.poll(async () => (await debug(sky)).drift).toBe(100000);
  513 |   const after = await debug(sky);
  514 |   expect(after.deepTime).toBe(true);
  515 |   // Stars are still there and still bright, but they have moved.
  516 |   expect(after.starsUp).toBeGreaterThan(3000);
  517 |   const shared = Object.keys(namedBefore).filter(n => after.spots.byName[n]);
  518 |   expect(shared.length).toBeGreaterThan(0);
  519 |   const moved = shared.map(n => Math.hypot(after.spots.byName[n].x - namedBefore[n].x, after.spots.byName[n].y - namedBefore[n].y));
  520 |   expect(Math.max(...moved)).toBeGreaterThan(3);
  521 |   // The solar system is withheld at this range rather than drawn wrongly.
  522 |   expect(after.planets.every((p: any) => !p.visible)).toBe(true);
  523 |   expect(after.labels.some((l: string) => /Moon/.test(l))).toBe(false);
  524 |   expect(after.deepSky).toEqual([]);
  525 |   // The Moon's glow is painted by the sky shader, so hiding the sprite is not enough.
  526 |   expect(before.skyMoonGlow).toBeGreaterThan(0);
  527 |   expect(after.skyMoonGlow).toBe(0);
  528 |   expect(after.skySunAlt).toBe(-90);
  529 |   await expect(page.getByText('Deep-time view')).toBeVisible();
  530 |   await expect(page.locator('#astronomy-observatory-tour')).toContainText('The sky in 100,000 years');
  531 |   await sky.screenshot({ path: 'scratch/observatory-drift-100k.png' });
  532 | 
  533 |   await page.getByRole('button', { name: 'Back to today', exact: true }).click();
  534 |   await expect.poll(async () => (await debug(sky)).drift).toBe(0);
  535 |   const restored = await debug(sky);
  536 |   expect(restored.deepTime).toBe(false);
  537 |   const backAgain = shared.map(n => restored.spots.byName[n] ? Math.hypot(restored.spots.byName[n].x - namedBefore[n].x, restored.spots.byName[n].y - namedBefore[n].y) : 0);
  538 |   expect(Math.max(...backAgain)).toBeLessThan(1.5);
  539 |   expect(errors).toEqual([]);
  540 | });
  541 | 
  542 | test('star trails draw computed arcs, lengthen with the span, and stay off in daylight', async ({ page }) => {
  543 |   const { sky, errors } = await mountObservatory(page, { obsSite: 'portland', obsLive: false, obsDate: '2026-12-21', obsTime: '22:00' });
  544 |   await expect.poll(async () => (await debug(sky)).catalog).toBeGreaterThan(8000);
  545 |   expect((await debug(sky)).trails).toBe(false);
```