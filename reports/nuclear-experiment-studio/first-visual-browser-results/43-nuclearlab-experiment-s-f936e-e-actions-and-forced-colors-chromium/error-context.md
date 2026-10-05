# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> guided first discovery fits at 320px with larger text, visible actions, and forced colors
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:1449:5

# Error details

```
Error: expect(locator).toBeInViewport() failed

Locator:  getByRole('button', { name: 'Half as much', exact: true })
Expected: in viewport
Received: viewport ratio 0.9593800902366638
Timeout:  15000ms

Call log:
  - Expect "toBeInViewport" with timeout 15000ms
  - waiting for getByRole('button', { name: 'Half as much', exact: true })
    32 × locator resolved to <button type="button" class="ns-choice">…</button>
       - unexpected value "viewport ratio 0.9593800902366638"

```

```yaml
- button "Half as much"
```

# Test source

```ts
  1357 |   await expect(page.locator('[data-ns-explain]')).toBeInViewport({ ratio: 1 });
  1358 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  1359 |   await page.getByRole('button', { name: 'Adding neutrons always makes a different element.', exact: true }).click();
  1360 |   state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  1361 |   await page.getByRole('button', { name: 'Look at the saved comparisons again' }).focus();
  1362 |   await page.keyboard.press('Enter'); await expect(saved).toBeFocused();
  1363 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveAttribute('data-ns-nucleus-comparison', 'protons');
  1364 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  1365 |   await expect(page.locator('[data-ns-reflection="nucleus"]')).toHaveCount(0);
  1366 |   await audit(page);
  1367 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  1368 |   await page.getByRole('button', { name: 'Explain these comparisons' }).focus();
  1369 |   await page.keyboard.press('Enter'); await expect(explanation).toBeFocused();
  1370 |   await expect(explanation).toHaveCSS('outline-style', 'solid');
  1371 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  1372 |   await page.screenshot({ path: output + '/nucleus-flow-mobile-explain-forced.png' });
  1373 |   await page.getByRole('button', { name: 'Protons identify the element.' }).click();
  1374 |   await page.getByRole('button', { name: 'Review your explanation' }).focus();
  1375 |   await page.keyboard.press('Enter'); await expect(explanation).toBeFocused();
  1376 |   await page.getByRole('button', { name: 'Back to introductions' }).click();
  1377 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  1378 |   await page.locator('.ns-warmup-entry > summary').click();
  1379 |   await page.getByRole('button', { name: 'Revisit the nucleus builder' }).click();
  1380 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Nitrogen-15');
  1381 |   await expect(page.locator('[data-ns-nucleus-comparison]')).toHaveAttribute('data-ns-nucleus-comparison', 'protons');
  1382 |   await page.locator('[data-ns-reflection="nucleus"] > summary').click();
  1383 |   await expect(page.getByRole('textbox', { name: 'My takeaway from Nucleus builder', exact: true })).toHaveValue('Keep my saved note.');
  1384 |   expect(errors).toEqual([]);
  1385 | });
  1386 | 
  1387 | test('guided first discovery records two readings on one scale and keeps keyboard progress', async ({ page }) => {
  1388 |   const errors: string[] = [];
  1389 |   page.on('pageerror', error => errors.push(error.message));
  1390 |   await page.setViewportSize({ width: 1100, height: 1000 });
  1391 |   await mount(page, {});
  1392 |   const guide = page.locator('[data-ns-first-discovery]');
  1393 |   const heading = page.locator('[data-ns-first-heading]');
  1394 |   await expect(guide).toHaveAttribute('data-ns-first-discovery', 'predict');
  1395 |   await expect(page.locator('[data-ns-first-run]')).toHaveCount(0);
  1396 |   await expect(page.locator('[data-nk-sec]')).toHaveCount(0);
  1397 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio)).toBeUndefined();
  1398 |   await page.screenshot({ path: output + '/first-discovery-desktop-start.png', fullPage: true });
  1399 |   await audit(page);
  1400 |   await page.getByRole('button', { name: 'Half as much', exact: true }).focus();
  1401 |   await page.keyboard.press('Enter');
  1402 |   await expect(heading).toBeFocused();
  1403 |   await expect(guide).toHaveAttribute('data-ns-first-discovery', 'near');
  1404 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance.runs)).toBeUndefined();
  1405 |   await page.getByRole('button', { name: 'Take a reading at 1 m', exact: false }).focus();
  1406 |   await page.keyboard.press('Enter');
  1407 |   await expect(guide).toHaveAttribute('data-ns-first-discovery', 'far');
  1408 |   await expect(heading).toBeFocused();
  1409 |   await expect(page.locator('[data-ns-first-chart]')).toHaveCount(0);
  1410 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  1411 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  1412 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance.runs)).toEqual([1]);
  1413 |   await page.keyboard.press('Enter');
  1414 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance.runs)).toEqual([1]);
  1415 |   await page.getByRole('button', { name: 'Move detector to 2 m' }).focus();
  1416 |   await page.keyboard.press('Enter');
  1417 |   await expect(page.getByRole('button', { name: 'Take a reading at 2 m' })).toBeFocused();
  1418 |   await page.keyboard.press('Enter');
  1419 |   await expect(guide).toHaveAttribute('data-ns-first-discovery', 'explain');
  1420 |   await expect(heading).toBeFocused();
  1421 |   const chart = page.locator('[data-ns-first-chart]');
  1422 |   await expect(chart.locator('[data-ns-first-bar="2"] > strong')).toHaveText('25%');
  1423 |   await expect(chart.locator('[data-ns-first-bar="1"] > strong')).toHaveText('100%');
  1424 |   await expect(chart).toHaveAttribute('aria-label', 'Saved readings on a shared 0 to 100% scale: 1 m, 100%; 2 m, 25%. The source output stayed fixed.');
  1425 |   const bars = await chart.locator('.ns-case-fill').evaluateAll(nodes => nodes.map(node => ({ width: (node as HTMLElement).style.width, rendered: node.getBoundingClientRect().width, track: node.parentElement!.getBoundingClientRect().width })));
  1426 |   expect(bars.map(bar => bar.width)).toEqual(['100%', '25%']);
  1427 |   expect(bars[0].rendered / bars[1].rendered).toBeCloseTo(4, 1);
  1428 |   expect(bars[0].track).toBeCloseTo(bars[1].track, 1);
  1429 |   await page.screenshot({ path: output + '/first-discovery-desktop-evidence.png', fullPage: true });
  1430 |   await audit(page);
  1431 |   const wrong = page.getByRole('button', { name: 'Moving the detector makes the source emit less.', exact: true });
  1432 |   await wrong.focus(); await page.keyboard.press('Enter');
  1433 |   await expect(wrong).toBeFocused();
  1434 |   await expect(guide).toHaveAttribute('data-ns-first-discovery', 'explain');
  1435 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.completed || [])).toEqual([]);
  1436 |   await page.getByRole('button', { name: 'The same output spreads over a larger area.', exact: true }).focus();
  1437 |   await page.keyboard.press('Enter');
  1438 |   await expect(guide).toHaveAttribute('data-ns-first-discovery', 'done');
  1439 |   await expect(heading).toBeFocused();
  1440 |   await expect(page.locator('.ns-first-progress [data-state="done"]')).toHaveCount(4);
  1441 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.completed)).toEqual(['distance']);
  1442 |   await page.getByRole('button', { name: 'Continue: What can paper stop?' }).click();
  1443 |   await expect(page.locator('[data-ns-intro]')).toHaveAttribute('data-ns-intro', 'rays');
  1444 |   await expect(page.getByRole('heading', { name: 'A signal disappears. Has the source stopped?' })).toBeFocused();
  1445 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance.runs)).toEqual([1, 2]);
  1446 |   expect(errors).toEqual([]);
  1447 | });
  1448 | 
  1449 | test('guided first discovery fits at 320px with larger text, visible actions, and forced colors', async ({ page }) => {
  1450 |   await page.setViewportSize({ width: 320, height: 844 });
  1451 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  1452 |   await mount(page, { nkLargeText: true, nkReduceMotion: true });
  1453 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  1454 |   const heading = page.locator('[data-ns-first-heading]');
  1455 |   for (const name of ['Half as much', 'One quarter', 'No change']) {
  1456 |     const button = page.getByRole('button', { name, exact: true });
> 1457 |     await expect(button).toBeInViewport({ ratio: 1 });
       |                          ^ Error: expect(locator).toBeInViewport() failed
  1458 |     expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  1459 |   }
  1460 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  1461 |   await page.screenshot({ path: output + '/first-discovery-mobile-start-light.png' });
  1462 |   await audit(page);
  1463 |   await page.getByRole('button', { name: 'One quarter', exact: true }).focus(); await page.keyboard.press('Enter');
  1464 |   await expect(heading).toBeFocused();
  1465 |   const near = page.getByRole('button', { name: 'Take a reading at 1 m' });
  1466 |   await expect(near).toBeInViewport({ ratio: 1 });
  1467 |   await near.focus(); await page.keyboard.press('Enter');
  1468 |   await expect(heading).toBeFocused();
  1469 |   const move = page.getByRole('button', { name: 'Move detector to 2 m' });
  1470 |   await expect(move).toBeInViewport({ ratio: 1 });
  1471 |   await move.focus(); await page.keyboard.press('Enter');
  1472 |   const far = page.getByRole('button', { name: 'Take a reading at 2 m' });
  1473 |   await expect(far).toBeFocused();
  1474 |   await expect(far).toBeInViewport({ ratio: 1 });
  1475 |   await expect(page.locator('[data-ns-reading]')).toBeInViewport({ ratio: 1 });
  1476 |   await page.screenshot({ path: output + '/first-discovery-mobile-reading-light.png' });
  1477 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  1478 |   await expect(far).toHaveCSS('outline-style', 'solid');
  1479 |   await expect(page.locator('.ns-first .ns-scene-note')).toHaveCSS('color', 'rgb(0, 0, 0)');
  1480 |   await audit(page);
  1481 |   await far.focus(); await page.keyboard.press('Enter');
  1482 |   const chart = page.locator('[data-ns-first-chart]');
  1483 |   await expect(heading).toBeFocused();
  1484 |   await expect(chart).toBeInViewport({ ratio: 1 });
  1485 |   for (const name of ['Moving the detector makes the source emit less.', 'The same output spreads over a larger area.']) {
  1486 |     const button = page.getByRole('button', { name, exact: true });
  1487 |     await expect(button).toBeInViewport({ ratio: 1 });
  1488 |     expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  1489 |   }
  1490 |   await page.screenshot({ path: output + '/first-discovery-mobile-evidence-forced.png' });
  1491 |   await audit(page);
  1492 |   await page.getByRole('button', { name: 'The same output spreads over a larger area.', exact: true }).click();
  1493 |   await expect(heading).toBeFocused();
  1494 |   await expect(page.getByRole('button', { name: 'Continue: What can paper stop?' })).toBeInViewport({ ratio: 1 });
  1495 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  1496 |   await page.getByRole('button', { name: 'Start again', exact: true }).click();
  1497 |   await expect(heading).toBeFocused();
  1498 |   await expect(page.locator('[data-ns-first-discovery]')).toHaveAttribute('data-ns-first-discovery', 'predict');
  1499 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.completed)).toEqual(['distance']);
  1500 |   await expect(page.getByRole('button', { name: 'One quarter', exact: true })).toBeInViewport({ ratio: 1 });
  1501 | });
  1502 | 
  1503 | test('guided first discovery preserves existing experiments, resumes readings, and offers free exploration', async ({ page }) => {
  1504 |   await page.setViewportSize({ width: 1100, height: 1000 });
  1505 |   const saved = { mission: 'chain', completed: ['decay'], chain: { prediction: 'steady', setting: 1.2, step: 2 }, distance: { prediction: 'half', setting: 4, runs: [1], reflection: 'Keep this note.' }, investigation: { prediction: 'both', runs: ['closer'] } };
  1506 |   await mount(page, { nkStudio: saved });
  1507 |   await expect(page.locator('[data-ns-first-discovery]')).toHaveCount(0);
  1508 |   await expect(page.locator('[data-ns-intro]')).toHaveAttribute('data-ns-intro', 'chain');
  1509 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio)).toEqual(saved);
  1510 |   await page.locator('.ns-first-invite > summary').click();
  1511 |   await page.getByRole('button', { name: 'Open the distance guide' }).click();
  1512 |   await expect(page.locator('[data-ns-first-discovery]')).toHaveAttribute('data-ns-first-discovery', 'far');
  1513 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance)).toEqual(saved.distance);
  1514 |   await page.getByRole('button', { name: 'All topics & routes', exact: true }).click();
  1515 |   await page.getByRole('button', { name: 'Experiment studio', exact: true }).click();
  1516 |   await expect(page.locator('[data-ns-first-discovery]')).toHaveAttribute('data-ns-first-discovery', 'far');
  1517 |   await page.getByRole('button', { name: 'Explore distance freely', exact: true }).click();
  1518 |   await expect(page.locator('[data-ns-intro]')).toHaveAttribute('data-ns-intro', 'distance');
  1519 |   await expect(page.getByRole('heading', { name: 'What changes when you move farther away?' })).toBeFocused();
  1520 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance)).toEqual(saved.distance);
  1521 |   await page.locator('.ns-first-invite > summary').click();
  1522 |   await page.getByRole('button', { name: 'Open the distance guide' }).click();
  1523 |   await page.getByRole('button', { name: 'Choose another experiment', exact: true }).click();
  1524 |   await expect(page.locator('.ns-chooser')).toHaveAttribute('open', '');
  1525 |   await expect(page.locator('.ns-chooser > summary')).toBeFocused();
  1526 |   const final = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  1527 |   expect(final).toEqual({ ...saved, mission: 'distance', firstDiscovery: 'explore' });
  1528 |   await page.locator('[data-ns-mission="chain"]').click();
  1529 |   await expect(page.getByRole('heading', { name: 'Can a chain stay steady?' })).toBeFocused();
  1530 |   await expect(page.locator('[data-ns-intro]')).toHaveAttribute('data-ns-intro', 'chain');
  1531 |   await audit(page);
  1532 | });
  1533 | 
  1534 | 
  1535 | test('guided detector movement changes position while keeping the saved reading and evidence intact', async ({ page }) => {
  1536 |   const errors: string[] = [];
  1537 |   page.on('pageerror', error => errors.push(error.message));
  1538 |   await page.setViewportSize({ width: 1100, height: 1000 });
  1539 |   await mount(page, { nkStudio: { mission: 'distance', firstDiscovery: 'guided', lastWorked: 'distance', completed: ['decay'], distance: { prediction: 'quarter', setting: 1, runs: [1], reflection: 'Keep the source fixed.' }, counting: { prediction: 'vary', runs: [1, 4] } } });
  1540 |   const saved = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  1541 |   await expect(page.locator('[data-ns-first-run]')).toHaveCount(0);
  1542 |   const move = page.getByRole('button', { name: 'Move detector to 2 m' });
  1543 |   await move.focus(); await page.keyboard.press('Enter');
  1544 |   await expect(page.locator('[data-ns-first-chart]')).toHaveCount(0);
  1545 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  1546 |   expect(Number(await page.locator('[data-ns-first-detector="current"]').getAttribute('x'))).toBe(195);
  1547 |   await expect(page.locator('[data-ns-first-detector="saved"]')).toHaveAttribute('data-distance', '1');
  1548 |   await expect(page.locator('[data-ns-first-detector="saved"]')).toHaveAttribute('stroke-dasharray', '5 5');
  1549 |   await expect(page.locator('[data-ns-first-position]')).toHaveText('Detector: 2 m');
  1550 |   await expect(page.locator('[data-ns-first-position-image]')).toHaveAttribute('aria-label', 'Source output fixed. Detector at 2 m. Saved reading at 1 m: 100%.');
  1551 |   await expect(page.locator('[data-ns-first-movement]')).toHaveCount(1);
  1552 |   await expect(page.locator('[data-ns-first-heading]')).toHaveText('Read at 2 m');
  1553 |   const read = page.getByRole('button', { name: 'Take a reading at 2 m' });
  1554 |   await expect(read).toBeFocused();
  1555 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio)).toEqual({ ...saved, distance: { ...saved.distance, setting: 2 } });
  1556 |   await page.screenshot({ path: output + '/first-movement-desktop-prepared.png', fullPage: true });
  1557 |   await audit(page);
```