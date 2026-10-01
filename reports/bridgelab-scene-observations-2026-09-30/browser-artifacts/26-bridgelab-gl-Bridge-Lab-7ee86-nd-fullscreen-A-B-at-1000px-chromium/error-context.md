# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> riverbank observer: same moment, independent poses and fullscreen A/B at 1000px
- Location: tests\e2e\26-bridgelab-gl.spec.ts:1498:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 5
+ Received  + 1

- Array [
-   "Ground from rest−2.34 cm",
-   "Deck from rest−6.40 cm",
-   "Deck relative to ground−4.07 cm",
- ]
+ Array []
```

# Test source

```ts
  1460 |     await expect(page.locator('[data-bridge-energy-flow="fallback"]')).toBeVisible();
  1461 |     await expect(page.locator('[data-flow-frame] svg')).toHaveAttribute('aria-label',before!);
  1462 |     await page.getByRole('button',{name:'Step forward 0.5 s',exact:true}).click();
  1463 |     await expect(page.locator('[data-flow-frame]')).toHaveAttribute('data-flow-frame','7.717');
  1464 |     await page.evaluate(() => (window as any).__flowLoss.restoreContext());
  1465 |     await page.getByRole('button',{name:'From the riverbank',exact:true}).click();
  1466 |     await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
  1467 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
  1468 |     await expect(page.locator('[data-bridge-energy-flow="scene"]')).toBeVisible();
  1469 |     await expect(page.locator('[data-flow-frame]')).toHaveAttribute('data-flow-frame','7.717');
  1470 |     expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  1471 |     await checkWorkflowHealth(page);
  1472 |   });
  1473 | 
  1474 |   test('motion guide: WebGL loss retains current measurements and recovery restores resting rails', async ({ page }) => {
  1475 |     await mountWorkflow(page, 1000, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2, seismicMotionGuide: true });
  1476 |     const values = await page.locator('[data-motion-reading]').allTextContents();
  1477 |     await page.evaluate(() => {
  1478 |       const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  1479 |       const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  1480 |       const extension = context?.getExtension('WEBGL_lose_context');
  1481 |       if (!extension) throw new Error('WebGL loss extension unavailable');
  1482 |       (window as any).__motionLoss = extension;
  1483 |       extension.loseContext();
  1484 |     });
  1485 |     await expect(page.locator('[data-bridge-motion-guide="fallback"]')).toBeVisible();
  1486 |     expect(await page.locator('[data-motion-reading]').allTextContents()).toEqual(values);
  1487 |     await page.evaluate(() => (window as any).__motionLoss.restoreContext());
  1488 |     await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
  1489 |     await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
  1490 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
  1491 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
  1492 |     await expect(page.locator('[data-bridge-motion-guide="scene"]')).toBeVisible();
  1493 |     expect(await page.locator('[data-motion-reading]').allTextContents()).toEqual(values);
  1494 |     await checkWorkflowHealth(page);
  1495 |   });
  1496 | 
  1497 |   for (const width of [1000, 320]) {
  1498 |     test('riverbank observer: same moment, independent poses and fullscreen A/B at ' + width + 'px', async ({ page }) => {
  1499 |       await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeWalkPos: 0.62, bridgeLookYaw: 20,
  1500 |         bridgeLookPitch: -6, seismicEnabled: true, seismicTime: 7.2, seismicMotionGuide: true, seismicGuideOpen: true,
  1501 |         crossSectionMm2: 30000, lateralBraceEvery: 1, seismicObservation: 'Keep my observation.' });
  1502 |       const stage = page.locator('[data-allo-fs-stage]');
  1503 |       const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
  1504 |       await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
  1505 |       await stage.scrollIntoViewIfNeeded();
  1506 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
  1507 |       await expect(page.locator('[data-bridge-observer-hint]')).toContainText('moves with the ground');
  1508 |       await expect(viewer).toHaveAttribute('aria-label', /Standing at an observation point on the riverbank/);
  1509 |       await expect(page.getByRole('slider', { name: 'Position on bridge (%)', exact: true })).toHaveCount(0);
  1510 |       const before = await page.evaluate(() => (window as any).__gl());
  1511 |       await page.evaluate(() => (window as any).__set({ seismicTime: 8 }));
  1512 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().groundOffsetM)).not.toBe(before.groundOffsetM);
  1513 |       const moved = await page.evaluate(() => (window as any).__gl());
  1514 |       expect(moved.cameraPosition.z - before.cameraPosition.z).toBeCloseTo((moved.groundOffsetM - before.groundOffsetM) * 10, 8);
  1515 |       moved.cameraDirection.forEach((value: number, axis: number) => expect(value).toBeCloseTo(before.cameraDirection[axis], 8));
  1516 |       await viewer.press('ArrowRight');
  1517 |       await viewer.press('ArrowUp');
  1518 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeBankYaw)).toBe(8);
  1519 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeBankPitch)).toBe(5);
  1520 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeWalkPos)).toBe(0.62);
  1521 |       await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
  1522 |       await expect(viewer).toBeFocused();
  1523 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
  1524 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeLookYaw)).toBe(20);
  1525 |       await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
  1526 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeBankYaw)).toBe(8);
  1527 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeBankPitch)).toBe(5);
  1528 |       const viewerBox = await viewer.boundingBox();
  1529 |       if (!viewerBox) throw new Error('Bank viewer is not visible');
  1530 |       await page.mouse.move(viewerBox.x + viewerBox.width * 0.9, viewerBox.y + viewerBox.height * 0.5);
  1531 |       await page.mouse.down();
  1532 |       await page.mouse.move(viewerBox.x + viewerBox.width * 0.9 - 12, viewerBox.y + viewerBox.height * 0.5 + 12, { steps: 3 });
  1533 |       await page.mouse.up();
  1534 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeBankYaw)).not.toBe(8);
  1535 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeLookYaw)).toBe(20);
  1536 |       await viewer.press('Home');
  1537 |       await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
  1538 |       await page.evaluate(() => (window as any).__set({ seismicTime: 8 }));
  1539 |       await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  1540 |       await checkBridgeCanvasFillsStage(page);
  1541 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
  1542 |       const bankB = await page.evaluate(() => (window as any).__gl());
  1543 |       await page.getByRole('button', { name: 'A · reference', exact: true }).click();
  1544 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().deckOffsetM)).not.toBe(bankB.deckOffsetM);
  1545 |       const bankA = await page.evaluate(() => (window as any).__gl());
  1546 |       expect(bankA.cameraPosition).toEqual(bankB.cameraPosition);
  1547 |       expect(bankA.cameraDirection).toEqual(bankB.cameraDirection);
  1548 |       const readings = await page.locator('[data-motion-reading]').allTextContents();
  1549 |       await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-bank-a.png') });
  1550 |       const measurementToggle = page.locator('[data-bridge-scene-readout] > summary');
  1551 |       await measurementToggle.press('Enter');
  1552 |       await expect(page.locator('[data-motion-frame]')).toHaveCount(0);
  1553 |       await expect(page.locator('[data-bridge-scene-readout]')).toContainText('A · reference · 8.00 s');
  1554 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
  1555 |       await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-bank-immersive.png') });
  1556 |       await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
  1557 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('deck');
  1558 |       await expect(page.locator('[data-motion-frame]')).toHaveCount(0);
  1559 |       await measurementToggle.press('Enter');
> 1560 |       expect(await page.locator('[data-motion-reading]').allTextContents()).toEqual(readings);
       |                                                                             ^ Error: expect(received).toEqual(expected) // deep equality
  1561 |       expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(8);
  1562 |       await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-deck-a.png') });
  1563 |       await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
  1564 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraPosition)).toEqual(bankA.cameraPosition);
  1565 |       await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
  1566 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(8);
  1567 |       await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
  1568 |       expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  1569 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  1570 |       await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
  1571 |       await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('End');
  1572 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().groundOffsetM)).toBe(0);
  1573 |       await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
  1574 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
  1575 |       // A first visit can upload previously culled meshes. After both fixed
  1576 |       // views have rendered, repeated switching must not grow GPU resources.
  1577 |       let warmedResources;
  1578 |       for (let cycle = 0; cycle < 3; cycle++) {
  1579 |         await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
  1580 |         await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
  1581 |         await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
  1582 |         await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
  1583 |         const resources = await page.evaluate(() => (window as any).__gl().resources);
  1584 |         if (cycle === 0) warmedResources = resources;
  1585 |         else expect(resources).toEqual(warmedResources);
  1586 |       }
  1587 |       await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  1588 |       await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
  1589 |       await expect(page.locator('[data-bridge-observer-switch]')).toHaveCount(0);
  1590 |       await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
  1591 |       await stage.scrollIntoViewIfNeeded();
  1592 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
  1593 |       expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Keep my observation.');
  1594 |       await checkWorkflowHealth(page);
  1595 |     });
  1596 |   }
  1597 | 
  1598 |   test('riverbank observer: WebGL recovery preserves the selected observer without resuming motion', async ({ page }) => {
  1599 |     await mountWorkflow(page, 1000, { bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 12,
  1600 |       bridgeBankPitch: -5, seismicEnabled: true, seismicTime: 8, seismicMotionGuide: true });
  1601 |     await page.evaluate(() => {
  1602 |       const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  1603 |       const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  1604 |       const extension = context?.getExtension('WEBGL_lose_context');
  1605 |       if (!extension) throw new Error('WebGL loss extension unavailable');
  1606 |       (window as any).__bankLoss = extension;
  1607 |       extension.loseContext();
  1608 |     });
  1609 |     await expect(page.locator('[data-bridge-motion-guide="fallback"]')).toBeVisible();
  1610 |     await expect(page.getByRole('button', { name: 'From the riverbank', exact: true })).toBeDisabled();
  1611 |     await page.evaluate(() => (window as any).__bankLoss.restoreContext());
  1612 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
  1613 |     expect(await page.evaluate(() => (window as any).__bucket().bridgeView)).toBe('2d');
  1614 |     await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
  1615 |     await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
  1616 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
  1617 |     expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ bridgeBankYaw: 12, bridgeBankPitch: -5, seismicTime: 8, seismicPlaying: false });
  1618 |     await checkWorkflowHealth(page);
  1619 |   });
  1620 | 
  1621 |   test.describe('earthquake replay', () => {
  1622 |     test.use({ hasTouch: true });
  1623 |     for (const fallback of [false, true]) {
  1624 |       test('WebGL loss exits ' + (fallback ? 'fill-frame' : 'native fullscreen') + ' and preserves a usable focused fallback', async ({ page }) => {
  1625 |         await mountWorkflow(page, 1000, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2 });
  1626 |         const stage = page.locator('[data-allo-fs-stage]');
  1627 |         if (fallback) await stage.evaluate(element => {
  1628 |           Object.defineProperty(element, 'requestFullscreen', { configurable: true, value: () => Promise.reject(new Error('Exercise fill-frame fallback')) });
  1629 |         });
  1630 |         await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  1631 |         await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
  1632 |         await expect.poll(() => stage.evaluate(element => (element as any).__alloFsOn === true || document.fullscreenElement === element)).toBe(true);
  1633 |         await checkBridgeCanvasFillsStage(page);
  1634 |         await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
  1635 |         await page.getByRole('button', { name: 'Pause scene replay', exact: true }).focus();
  1636 |         await page.evaluate(() => {
  1637 |           const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  1638 |           const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  1639 |           const extension = context?.getExtension('WEBGL_lose_context');
  1640 |           if (!extension) throw new Error('WebGL loss extension unavailable');
  1641 |           extension.loseContext();
  1642 |         });
  1643 |         await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
  1644 |         await expect(page.locator('[data-bridge-elevation]')).toBeVisible();
  1645 |         await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  1646 |         expect(await stage.evaluate(element => !!(element as any).__alloFsOn)).toBe(false);
  1647 |         expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  1648 |         const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
  1649 |         await chart.press('End');
  1650 |         await expect(chart).toHaveAttribute('aria-valuenow', '24');
  1651 |         if (fallback) expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  1652 |         await checkWorkflowHealth(page);
  1653 |       });
  1654 |     }
  1655 |     for (const width of [1000, 320]) {
  1656 |       test('scene controls, fullscreen and synchronized timeline at ' + width + 'px', async ({ page }) => {
  1657 |         await mkdir(REPLAY_REPORT, { recursive: true });
  1658 |         await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2 });
  1659 |         const stage = page.locator('[data-allo-fs-stage]');
  1660 |         const scene = page.getByRole('group', { name: 'Earthquake scene replay', exact: true });
```