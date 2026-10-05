# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> guided first discovery preserves existing experiments, resumes readings, and offers free exploration
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:1497:5

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-ns-first-discovery]')
Expected: 0
Received: 1
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" with timeout 15000ms
  - waiting for locator('[data-ns-first-discovery]')
    31 × locator resolved to 1 element
       - unexpected value "1"

```

# Test source

```ts
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
  1415 |   await page.getByRole('button', { name: 'Move to 2 m and take a reading' }).focus();
  1416 |   await page.keyboard.press('Enter');
  1417 |   await expect(guide).toHaveAttribute('data-ns-first-discovery', 'explain');
  1418 |   await expect(heading).toBeFocused();
  1419 |   const chart = page.locator('[data-ns-first-chart]');
  1420 |   await expect(chart.locator('[data-ns-first-bar="2"] > strong')).toHaveText('25%');
  1421 |   await expect(chart.locator('[data-ns-first-bar="1"] > strong')).toHaveText('100%');
  1422 |   await expect(chart).toHaveAttribute('aria-label', 'Saved readings on a shared 0 to 100% scale: 1 m, 100%; 2 m, 25%. The source output stayed fixed.');
  1423 |   const bars = await chart.locator('.ns-case-fill').evaluateAll(nodes => nodes.map(node => ({ width: (node as HTMLElement).style.width, rendered: node.getBoundingClientRect().width, track: node.parentElement!.getBoundingClientRect().width })));
  1424 |   expect(bars.map(bar => bar.width)).toEqual(['100%', '25%']);
  1425 |   expect(bars[0].rendered / bars[1].rendered).toBeCloseTo(4, 1);
  1426 |   expect(bars[0].track).toBeCloseTo(bars[1].track, 1);
  1427 |   await page.screenshot({ path: output + '/first-discovery-desktop-evidence.png', fullPage: true });
  1428 |   await audit(page);
  1429 |   const wrong = page.getByRole('button', { name: 'Moving the detector makes the source emit less.', exact: true });
  1430 |   await wrong.focus(); await page.keyboard.press('Enter');
  1431 |   await expect(wrong).toBeFocused();
  1432 |   await expect(guide).toHaveAttribute('data-ns-first-discovery', 'explain');
  1433 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.completed || [])).toEqual([]);
  1434 |   await page.getByRole('button', { name: 'The same output spreads over a larger area.', exact: true }).focus();
  1435 |   await page.keyboard.press('Enter');
  1436 |   await expect(guide).toHaveAttribute('data-ns-first-discovery', 'done');
  1437 |   await expect(heading).toBeFocused();
  1438 |   await expect(page.locator('.ns-first-progress [data-state="done"]')).toHaveCount(4);
  1439 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.completed)).toEqual(['distance']);
  1440 |   await page.getByRole('button', { name: 'Continue: What can paper stop?' }).click();
  1441 |   await expect(page.locator('[data-ns-intro]')).toHaveAttribute('data-ns-intro', 'rays');
  1442 |   await expect(page.getByRole('heading', { name: 'A signal disappears. Has the source stopped?' })).toBeFocused();
  1443 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance.runs)).toEqual([1, 2]);
  1444 |   expect(errors).toEqual([]);
  1445 | });
  1446 | 
  1447 | test('guided first discovery fits at 320px with larger text, visible actions, and forced colors', async ({ page }) => {
  1448 |   await page.setViewportSize({ width: 320, height: 844 });
  1449 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  1450 |   await mount(page, { nkLargeText: true, nkReduceMotion: true });
  1451 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  1452 |   const heading = page.locator('[data-ns-first-heading]');
  1453 |   for (const name of ['Half as much', 'One quarter', 'No change']) {
  1454 |     const button = page.getByRole('button', { name, exact: true });
  1455 |     await expect(button).toBeInViewport({ ratio: 1 });
  1456 |     expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  1457 |   }
  1458 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  1459 |   await page.screenshot({ path: output + '/first-discovery-mobile-start-light.png' });
  1460 |   await audit(page);
  1461 |   await page.getByRole('button', { name: 'One quarter', exact: true }).focus(); await page.keyboard.press('Enter');
  1462 |   await expect(heading).toBeFocused();
  1463 |   const near = page.getByRole('button', { name: 'Take a reading at 1 m' });
  1464 |   await expect(near).toBeInViewport({ ratio: 1 });
  1465 |   await near.focus(); await page.keyboard.press('Enter');
  1466 |   await expect(heading).toBeFocused();
  1467 |   const far = page.getByRole('button', { name: 'Move to 2 m and take a reading' });
  1468 |   await expect(far).toBeInViewport({ ratio: 1 });
  1469 |   await expect(page.locator('[data-ns-reading]')).toBeInViewport({ ratio: 1 });
  1470 |   await page.screenshot({ path: output + '/first-discovery-mobile-reading-light.png' });
  1471 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  1472 |   await expect(heading).toHaveCSS('outline-style', 'solid');
  1473 |   await expect(page.locator('.ns-first .ns-scene-note')).toHaveCSS('color', 'rgb(0, 0, 0)');
  1474 |   await audit(page);
  1475 |   await far.focus(); await page.keyboard.press('Enter');
  1476 |   const chart = page.locator('[data-ns-first-chart]');
  1477 |   await expect(heading).toBeFocused();
  1478 |   await expect(chart).toBeInViewport({ ratio: 1 });
  1479 |   for (const name of ['Moving the detector makes the source emit less.', 'The same output spreads over a larger area.']) {
  1480 |     const button = page.getByRole('button', { name, exact: true });
  1481 |     await expect(button).toBeInViewport({ ratio: 1 });
  1482 |     expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  1483 |   }
  1484 |   await page.screenshot({ path: output + '/first-discovery-mobile-evidence-forced.png' });
  1485 |   await audit(page);
  1486 |   await page.getByRole('button', { name: 'The same output spreads over a larger area.', exact: true }).click();
  1487 |   await expect(heading).toBeFocused();
  1488 |   await expect(page.getByRole('button', { name: 'Continue: What can paper stop?' })).toBeInViewport({ ratio: 1 });
  1489 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  1490 |   await page.getByRole('button', { name: 'Start again', exact: true }).click();
  1491 |   await expect(heading).toBeFocused();
  1492 |   await expect(page.locator('[data-ns-first-discovery]')).toHaveAttribute('data-ns-first-discovery', 'predict');
  1493 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.completed)).toEqual(['distance']);
  1494 |   await expect(page.getByRole('button', { name: 'One quarter', exact: true })).toBeInViewport({ ratio: 1 });
  1495 | });
  1496 | 
  1497 | test('guided first discovery preserves existing experiments, resumes readings, and offers free exploration', async ({ page }) => {
  1498 |   await page.setViewportSize({ width: 1100, height: 1000 });
  1499 |   const saved = { mission: 'chain', completed: ['decay'], chain: { prediction: 'steady', setting: 1.2, step: 2 }, distance: { prediction: 'half', setting: 4, runs: [1], reflection: 'Keep this note.' }, investigation: { prediction: 'both', runs: ['closer'] } };
  1500 |   await mount(page, { nkStudio: saved });
> 1501 |   await expect(page.locator('[data-ns-first-discovery]')).toHaveCount(0);
       |                                                           ^ Error: expect(locator).toHaveCount(expected) failed
  1502 |   await expect(page.locator('[data-ns-intro]')).toHaveAttribute('data-ns-intro', 'chain');
  1503 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio)).toEqual(saved);
  1504 |   await page.locator('.ns-first-invite > summary').click();
  1505 |   await page.getByRole('button', { name: 'Open the distance guide' }).click();
  1506 |   await expect(page.locator('[data-ns-first-discovery]')).toHaveAttribute('data-ns-first-discovery', 'far');
  1507 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance)).toEqual(saved.distance);
  1508 |   await page.getByRole('button', { name: 'All topics & routes', exact: true }).click();
  1509 |   await page.getByRole('button', { name: 'Experiment studio', exact: true }).click();
  1510 |   await expect(page.locator('[data-ns-first-discovery]')).toHaveAttribute('data-ns-first-discovery', 'far');
  1511 |   await page.getByRole('button', { name: 'Explore distance freely', exact: true }).click();
  1512 |   await expect(page.locator('[data-ns-intro]')).toHaveAttribute('data-ns-intro', 'distance');
  1513 |   await expect(page.getByRole('heading', { name: 'What changes when you move farther away?' })).toBeFocused();
  1514 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.distance)).toEqual(saved.distance);
  1515 |   await page.locator('.ns-first-invite > summary').click();
  1516 |   await page.getByRole('button', { name: 'Open the distance guide' }).click();
  1517 |   await page.getByRole('button', { name: 'Choose another experiment', exact: true }).click();
  1518 |   await expect(page.locator('.ns-chooser')).toHaveAttribute('open', '');
  1519 |   await expect(page.locator('.ns-chooser > summary')).toBeFocused();
  1520 |   const final = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  1521 |   expect(final).toEqual({ ...saved, mission: 'distance', firstDiscovery: 'explore' });
  1522 |   await page.locator('[data-ns-mission="chain"]').click();
  1523 |   await expect(page.getByRole('heading', { name: 'Can a chain stay steady?' })).toBeFocused();
  1524 |   await expect(page.locator('[data-ns-intro]')).toHaveAttribute('data-ns-intro', 'chain');
  1525 |   await audit(page);
  1526 | });
  1527 | 
```