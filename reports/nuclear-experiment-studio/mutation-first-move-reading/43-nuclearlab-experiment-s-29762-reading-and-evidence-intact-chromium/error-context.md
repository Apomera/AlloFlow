# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> guided detector movement changes position while keeping the saved reading and evidence intact
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:1535:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('[data-ns-reading]')
Expected: "100%"
Received: "25%"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('[data-ns-reading]')
    33 × locator resolved to <strong data-ns-reading="true">25%</strong>
       - unexpected value "25%"

```

```yaml
- strong: 25%
```

# Test source

```ts
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
  1457 |     await expect(button).toBeInViewport({ ratio: 1 });
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
> 1545 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
       |                                                   ^ Error: expect(locator).toHaveText(expected) failed
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
  1558 |   await page.keyboard.press('Enter');
  1559 |   await expect(page.locator('[data-ns-first-heading]')).toBeFocused();
  1560 |   await expect(page.locator('[data-ns-first-bar="2"] > strong')).toHaveText('25%');
  1561 |   const measured = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  1562 |   expect(measured.distance.runs).toEqual([1, 2]);
  1563 |   expect(measured.distance.reflection).toBe(saved.distance.reflection);
  1564 |   expect(measured.completed).toEqual(saved.completed);
  1565 |   expect(measured.counting).toEqual(saved.counting);
  1566 |   expect(errors).toEqual([]);
  1567 | });
  1568 | 
  1569 | test('guided detector movement keeps the position, saved reading, and next action visible at 320px', async ({ page }) => {
  1570 |   await page.setViewportSize({ width: 320, height: 844 });
  1571 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  1572 |   await mount(page, { nkLargeText: true, nkReduceMotion: true });
  1573 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  1574 |   await page.getByRole('button', { name: 'No change', exact: true }).click();
  1575 |   await page.getByRole('button', { name: 'Take a reading at 1 m' }).click();
  1576 |   const move = page.getByRole('button', { name: 'Move detector to 2 m' });
  1577 |   await expect(move).toBeInViewport({ ratio: 1 });
  1578 |   await move.focus(); await page.keyboard.press('Enter');
  1579 |   const read = page.getByRole('button', { name: 'Take a reading at 2 m' });
  1580 |   await expect(read).toBeFocused();
  1581 |   for (const locator of [read, page.locator('[data-ns-first-position]'), page.locator('[data-ns-reading]'), page.locator('[data-ns-first-position-image]')]) await expect(locator).toBeInViewport({ ratio: 1 });
  1582 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  1583 |   expect((await read.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  1584 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  1585 |   await page.screenshot({ path: output + '/first-movement-mobile-prepared-light.png' });
  1586 |   await audit(page);
  1587 |   await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
  1588 |   await expect(read).toHaveCSS('outline-style', 'solid');
  1589 |   await expect(page.locator('[data-ns-first-detector="saved"]')).toHaveCSS('fill', 'rgb(255, 255, 255)');
  1590 |   const current = await page.locator('[data-ns-first-detector="current"]').evaluate(node => getComputedStyle(node).fill);
  1591 |   const previous = await page.locator('[data-ns-first-detector="saved"]').evaluate(node => getComputedStyle(node).fill);
  1592 |   expect(current).not.toBe(previous);
  1593 |   await page.screenshot({ path: output + '/first-movement-mobile-prepared-forced.png' });
  1594 |   await audit(page);
  1595 |   await page.keyboard.press('Enter');
  1596 |   await expect(page.locator('[data-ns-first-bar="2"] > strong')).toHaveText('25%');
  1597 |   await expect(page.locator('[data-ns-first-heading]')).toBeFocused();
  1598 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance.runs)).toEqual([1, 2]);
  1599 | });
  1600 | 
  1601 | test('guided detector movement resumes a prepared setup and shares it with free exploration', async ({ page }) => {
  1602 |   await page.setViewportSize({ width: 1100, height: 1000 });
  1603 |   const saved = { mission: 'distance', firstDiscovery: 'guided', completed: ['decay'], distance: { prediction: 'quarter', setting: 2, runs: [1], reflection: 'Keep my note.' }, investigation: { prediction: 'both', runs: ['closer'] } };
  1604 |   await mount(page, { nkStudio: saved });
  1605 |   await expect(page.locator('[data-ns-first-move]')).toHaveCount(0);
  1606 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  1607 |   await expect(page.locator('[data-ns-first-position]')).toHaveText('Detector: 2 m');
  1608 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio)).toEqual(saved);
  1609 |   await page.getByRole('button', { name: 'All topics & routes', exact: true }).click();
  1610 |   await page.getByRole('button', { name: 'Experiment studio', exact: true }).click();
  1611 |   await expect(page.getByRole('region', { name: 'Experiment studio' })).toBeFocused();
  1612 |   await expect(page.locator('[data-ns-first-chart]')).toHaveCount(0);
  1613 |   await expect(page.getByRole('button', { name: 'Take a reading at 2 m' })).not.toBeFocused();
  1614 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  1615 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio)).toEqual(saved);
  1616 |   await page.getByRole('button', { name: 'Explore distance freely', exact: true }).click();
  1617 |   await expect(page.getByRole('heading', { name: 'What changes when you move farther away?' })).toBeFocused();
  1618 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  1619 |   await page.getByRole('button', { name: 'Take a reading', exact: false }).click();
  1620 |   await expect(page.locator('[data-ns-reading]')).toHaveText('25%');
  1621 |   const final = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  1622 |   expect(final.distance.runs).toEqual([1, 2]);
  1623 |   expect(final.distance.reflection).toBe(saved.distance.reflection);
  1624 |   expect(final.investigation).toEqual(saved.investigation);
  1625 |   expect(final.completed).toEqual(saved.completed);
  1626 |   await audit(page);
  1627 | });
  1628 | 
```