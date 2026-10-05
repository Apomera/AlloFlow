# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> guided prediction review compares the original guess with measured evidence without changing saved work
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:1629:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 2
Received: 4
```

# Test source

```ts
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
  1629 | test('guided prediction review compares the original guess with measured evidence without changing saved work', async ({ page }) => {
  1630 |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  1631 |   await page.setViewportSize({ width: 1100, height: 1000 });
  1632 |   await mount(page, { nkStudio: { mission: 'distance', firstDiscovery: 'guided', completed: ['decay'], distance: { prediction: 'half', setting: 2, runs: [1, 2], reflection: 'Keep the source fixed.' }, counting: { runs: [1, 4] } } });
  1633 |   const saved = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  1634 |   const prediction = page.getByRole('button', { name: 'My prediction', exact: true });
  1635 |   await prediction.focus(); await page.keyboard.press('Enter');
  1636 |   await expect(prediction).toBeFocused(); await expect(prediction).toHaveAttribute('aria-pressed', 'true');
  1637 |   await expect(page.locator('[data-ns-prediction-bar="predicted"] > strong')).toHaveText('50%');
  1638 |   await expect(page.locator('[data-ns-prediction-bar="measured"] > strong')).toHaveText('25%');
  1639 |   await expect(page.locator('[data-ns-prediction-bar="predicted"] .ns-case-fill')).toHaveAttribute('style', 'width: 50%;');
  1640 |   await expect(page.locator('[data-ns-first-chart]')).toHaveAttribute('aria-label', /At 2 m: your prediction, 50%; saved reading, 25%/);
  1641 |   await expect(page.locator('[data-ns-first-prediction-result]')).toHaveAttribute('data-ns-first-prediction-result', 'different');
> 1642 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance.setting)).toBe(2);
       |                                                                                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  1643 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio)).toEqual(saved);
  1644 |   await page.screenshot({ path: output + '/first-prediction-desktop.png', fullPage: true }); await audit(page);
  1645 |   await page.getByRole('button', { name: 'Saved readings', exact: true }).click();
  1646 |   await expect(page.locator('[data-ns-first-bar="1"] > strong')).toHaveText('100%');
  1647 |   await expect(page.locator('[data-ns-first-bar="2"] > strong')).toHaveText('25%');
  1648 |   await page.getByRole('button', { name: 'The same output spreads' }).click();
  1649 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.completed)).toEqual(['decay', 'distance']);
  1650 |   expect(errors).toEqual([]);
  1651 | });
  1652 | 
  1653 | test('guided prediction review fits at 320px and preserves readable controls in forced colors', async ({ page }) => {
  1654 |   await page.setViewportSize({ width: 320, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  1655 |   await mount(page, { nkLargeText: true, nkReduceMotion: true, nkStudio: { mission: 'distance', firstDiscovery: 'guided', distance: { prediction: 'quarter', setting: 2, runs: [1, 2] } } });
  1656 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  1657 |   const prediction = page.getByRole('button', { name: 'My prediction', exact: true });
  1658 |   await prediction.focus(); await page.keyboard.press('Enter');
  1659 |   await page.locator('.ns-first-stage').evaluate(node => node.scrollIntoView({ block: 'start' }));
  1660 |   await expect(prediction).toBeFocused(); await expect(prediction).toBeInViewport({ ratio: 1 });
  1661 |   await expect(page.locator('[data-ns-first-chart]')).toBeInViewport({ ratio: 1 });
  1662 |   await expect(page.locator('[data-ns-first-prediction-result]')).toHaveAttribute('data-ns-first-prediction-result', 'matched');
  1663 |   expect((await prediction.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  1664 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  1665 |   await page.screenshot({ path: output + '/first-prediction-mobile-light.png' }); await audit(page);
  1666 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  1667 |   await expect(prediction).toHaveCSS('outline-style', 'solid');
  1668 |   const fills = page.locator('[data-ns-prediction-bar] .ns-case-fill');
  1669 |   expect(await fills.first().evaluate(node => getComputedStyle(node).backgroundColor)).toBe(await fills.last().evaluate(node => getComputedStyle(node).backgroundColor));
  1670 |   await page.screenshot({ path: output + '/first-prediction-mobile-forced.png' }); await audit(page);
  1671 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance.runs)).toEqual([1, 2]);
  1672 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.completed)).toBeUndefined();
  1673 | });
  1674 | 
```