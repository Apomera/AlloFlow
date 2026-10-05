# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> guided visuals show honest prediction cues, aligned apparatus, and equal quarter divisions
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:1675:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 25
Received: 20
```

# Test source

```ts
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
  1642 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance.setting)).toBe(2);
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
  1675 | test('guided visuals show honest prediction cues, aligned apparatus, and equal quarter divisions', async ({ page }) => {
  1676 |   await page.setViewportSize({ width: 1100, height: 1000 }); await mount(page, {});
  1677 |   const half = page.locator('[data-ns-first-guess="half"] rect').last();
  1678 |   expect(Number(await half.getAttribute('width'))).toBe(50);
  1679 |   expect(Number(await page.locator('[data-ns-first-guess="quarter"] rect').last().getAttribute('width'))).toBe(25);
  1680 |   expect(Number(await page.locator('[data-ns-first-guess="same"] rect').last().getAttribute('width'))).toBe(100);
  1681 |   await expect(page.locator('[data-ns-reading]')).toHaveText('—');
  1682 |   await expect(page.locator('[data-ns-first-chart]')).toHaveCount(0);
  1683 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio)).toBeUndefined();
  1684 |   await page.screenshot({ path: output + '/first-visual-desktop-start.png', fullPage: true }); await audit(page);
  1685 |   await page.getByRole('button', { name: 'Half as much', exact: true }).click();
  1686 |   await page.getByRole('button', { name: 'Take a reading at 1 m' }).click();
  1687 |   await page.getByRole('button', { name: 'Move detector to 2 m' }).click();
  1688 |   const body = page.locator('[data-ns-first-apparatus="detector"] rect');
  1689 |   expect(Number(await body.getAttribute('x')) + Number(await body.getAttribute('width')) / 2).toBe(205);
  1690 |   await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  1691 |   await expect(page.locator('[data-ns-first-detector="saved"]')).toHaveAttribute('data-distance', '1');
  1692 |   await page.screenshot({ path: output + '/first-visual-desktop-apparatus.png', fullPage: true }); await audit(page);
  1693 |   await page.getByRole('button', { name: 'Take a reading at 2 m' }).click();
  1694 |   const firstTrack = page.locator('[data-ns-first-bar="1"] [data-ns-first-scale]');
> 1695 |   expect(await firstTrack.locator('.ns-first-scale-cuts > span').first().evaluate(node => parseFloat((node as HTMLElement).style.left))).toBe(25);
       |                                                                                                                                          ^ Error: expect(received).toBe(expected) // Object.is equality
  1696 |   expect(await firstTrack.locator('.ns-first-scale-cuts > span').evaluateAll(nodes => nodes.map(node => parseFloat((node as HTMLElement).style.left)))).toEqual([25, 50, 75]);
  1697 |   await expect(page.locator('[data-ns-first-bar="1"] > strong')).toHaveText('100%');
  1698 |   await expect(page.locator('[data-ns-first-bar="2"] > strong')).toHaveText('25%');
  1699 |   const trackBox = (await page.locator('[data-ns-first-bar="2"] .ns-case-track').boundingBox())!;
  1700 |   const fillBox = (await page.locator('[data-ns-first-bar="2"] .ns-case-fill').boundingBox())!;
  1701 |   expect(Math.abs(fillBox.width / (trackBox.width - 2) - 0.25)).toBeLessThan(0.01);
  1702 |   await page.screenshot({ path: output + '/first-visual-desktop-evidence.png', fullPage: true }); await audit(page);
  1703 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance.runs)).toEqual([1, 2]);
  1704 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.completed)).toBeUndefined();
  1705 | });
  1706 | 
  1707 | for (const width of [320, 390]) {
  1708 |   test('guided visuals retain readable prediction cards and visible measurements at ' + width + 'px', async ({ page }) => {
  1709 |     await page.setViewportSize({ width, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  1710 |     await mount(page, { nkLargeText: true, nkReduceMotion: true });
  1711 |     await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  1712 |     const cards = page.getByRole('group', { name: 'Make your prediction' }).getByRole('button');
  1713 |     for (const card of await cards.all()) {
  1714 |       expect((await card.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  1715 |       expect((await card.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  1716 |     }
  1717 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  1718 |     await page.screenshot({ path: output + '/first-visual-mobile-start-' + width + '.png', fullPage: true }); await audit(page);
  1719 |     await page.getByRole('button', { name: 'One quarter', exact: true }).focus(); await page.keyboard.press('Enter');
  1720 |     await page.getByRole('button', { name: 'Take a reading at 1 m' }).focus(); await page.keyboard.press('Enter');
  1721 |     await page.getByRole('button', { name: 'Move detector to 2 m' }).focus(); await page.keyboard.press('Enter');
  1722 |     const read = page.getByRole('button', { name: 'Take a reading at 2 m' });
  1723 |     await expect(read).toBeFocused(); await expect(read).toBeInViewport({ ratio: 1 });
  1724 |     await expect(page.locator('[data-ns-reading]')).toBeInViewport({ ratio: 1 });
  1725 |     await expect(page.locator('[data-ns-first-position-image]')).toBeInViewport({ ratio: 1 });
  1726 |     await expect(page.locator('[data-ns-reading]')).toHaveText('100%');
  1727 |     await page.screenshot({ path: output + '/first-visual-mobile-apparatus-' + width + '.png' }); await audit(page);
  1728 |     await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  1729 |     await expect(page.locator('[data-ns-first-apparatus="source"] rect')).toHaveCSS('fill', 'rgb(255, 255, 255)');
  1730 |     await expect(read).toHaveCSS('outline-style', 'solid');
  1731 |     await page.screenshot({ path: output + '/first-visual-mobile-forced-' + width + '.png' }); await audit(page);
  1732 |     await page.keyboard.press('Enter');
  1733 |     await expect(page.locator('[data-ns-first-bar="2"] > strong')).toHaveText('25%');
  1734 |     await expect(page.locator('[data-ns-first-chart]')).toBeInViewport({ ratio: 1 });
  1735 |     await page.screenshot({ path: output + '/first-visual-mobile-evidence-forced-' + width + '.png' }); await audit(page);
  1736 |   });
  1737 | }
  1738 | 
```