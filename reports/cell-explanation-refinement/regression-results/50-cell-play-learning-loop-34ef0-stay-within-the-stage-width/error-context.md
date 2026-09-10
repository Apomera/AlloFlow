# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 50-cell-play-learning-loop.spec.ts >> mobile play controls, target key, and learning card stay within the stage width
- Location: tests\e2e\50-cell-play-learning-loop.spec.ts:1364:5

# Error details

```
Test timeout of 200000ms exceeded.
```

```
Error: page.waitForFunction: Test timeout of 200000ms exceeded.
```

# Test source

```ts
  1417 |   await expect(plantControlMap.locator('[data-cell-card-control-input]')).toHaveText('Select a label');
  1418 |   await expect(plantControlMap.locator('[data-cell-card-control-response]')).toHaveText('Structure highlighted');
  1419 |   await expect(selectedOrganismCard).toHaveAttribute('data-cell-selected-organism', 'amoeba');
  1420 |   await expect(selectedOrganismCard).toHaveAttribute('data-cell-selected-organism-state', 'current');
  1421 |   await expect(selectedOrganismCard.locator('[data-cell-selected-organism-eyebrow]')).toContainText('Current organism');
  1422 |   await expect(selectedOrganismCard.locator('[data-cell-learning-link]')).toHaveAttribute('aria-label', 'Amoeba gameplay learning map');
  1423 |   await expect(structureSpotlight).toHaveAttribute('aria-label', 'Amoeba mission anatomy: Pseudopods, Cell Membrane, Food Vacuole');
  1424 |   await expect(structureSpotlight.locator('[data-cell-focus-structure]')).toHaveCount(3);
  1425 |   await expect(structureSpotlight.locator('[data-cell-focus-structure="Pseudopods"]')).toContainText('Pseudopods');
  1426 |   await expect(structureSpotlight.locator('[data-cell-focus-structure="Cell Membrane"]')).toContainText('Cell Membrane');
  1427 |   await expect(structureSpotlight.locator('[data-cell-focus-structure="Food Vacuole"]')).toContainText('Food Vacuole');
  1428 |   await expect(amoebaFocusRows).toHaveCount(3);
  1429 |   await expect(selectedOrganismCard.locator('[data-cell-anatomy-item="Pseudopods"]')).toHaveAttribute('data-cell-mission-focus', 'true');
  1430 |   await expect(selectedOrganismCard.locator('[data-cell-anatomy-item="Pseudopods"]')).toContainText('Mission focus');
  1431 |   const amoebaStructureRow = selectedOrganismCard.locator('[data-cell-anatomy-item="Pseudopods"]');
  1432 |   await expect(amoebaStructureRow).toHaveAttribute('data-cell-anatomy-jump', 'true');
  1433 |   await expect(amoebaStructureRow).toHaveAttribute('aria-label', 'Show Pseudopods in the Amoeba live dish. Mission focus structure. Moves focus to the simulation.');
  1434 |   await expect(amoebaStructureRow).toContainText('Show in live dish');
  1435 |   await page.keyboard.press('Tab');
  1436 |   await amoebaStructureRow.focus();
  1437 |   await expect(amoebaStructureRow).toBeFocused();
  1438 |   const anatomyFocusStyle = await amoebaStructureRow.evaluate((row) => {
  1439 |     const style = getComputedStyle(row);
  1440 |     return { outlineStyle: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth), outlineColor: style.outlineColor };
  1441 |   });
  1442 |   expect(anatomyFocusStyle.outlineStyle).not.toBe('none');
  1443 |   expect(anatomyFocusStyle.outlineWidth).toBeGreaterThanOrEqual(2);
  1444 |   expect(anatomyFocusStyle.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
  1445 |   await expect(backToOrganisms).toHaveAttribute('aria-label', 'Return to organism choices from Amoeba details');
  1446 |   await expect(selectedPrimaryAction).toHaveAttribute('aria-label', 'Review Amoeba tutorial');
  1447 |   await expect(centerPlayer).toHaveAttribute('aria-label', 'Center Amoeba in the live dish');
  1448 |   await expect(centerPlayerLabel).toBeHidden();
  1449 |   await expect(tutorialHudLabel).toBeHidden();
  1450 |   const mobileFirstActionTrace = page.locator('[data-cell-control-loop]');
  1451 |   const mobileRibbon = page.locator('[data-cell-mission-ribbon]');
  1452 |   await expect(mobileFirstActionTrace).toHaveAttribute('data-cell-first-action-state', 'waiting');
  1453 |   await expect(mobileFirstActionTrace.locator('[data-cell-control-title]')).toHaveText('1 \u00B7 First action');
  1454 |   await expect(mobileFirstActionTrace.locator('[data-cell-control-input]')).toHaveText('Press / hold a direction');
  1455 |   await expect(mobileFirstActionTrace).toBeHidden();
  1456 |   await expect(mobileRibbon).toBeVisible();
  1457 |   await expect(mobileRibbon).toHaveAttribute('data-cell-ribbon-state', 'control');
  1458 |   await expect(mobileRibbon.locator('[data-cell-mission-ribbon-announcement]')).toHaveText('Control step. Press / hold a direction. Pseudopods extend, resulting in Cell crawls.');
  1459 |   await expect(mobileRibbon.locator('[data-cell-mission-ribbon-label]')).toHaveText('2 \u00B7 Control');
  1460 |   await expect(mobileRibbon.locator('[data-cell-mission-ribbon-primary]')).toHaveText('Press / hold a direction');
  1461 |   await expect(mobileRibbon.locator('[data-cell-mission-ribbon-secondary]')).toHaveText('Pseudopods extend \u2192 Cell crawls');
  1462 |   if (process.env.CELL_VISUAL_QA === '1') {
  1463 |     await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-first-action-ready-mobile.png' : testInfo.outputPath('cell-first-action-ready-mobile.png') });
  1464 |   }
  1465 |   await page.setViewportSize({ width: 320, height: 844 });
  1466 |   await page.evaluate(() => { const wrap = document.getElementById('wrap'); if (wrap) wrap.style.width = '320px'; });
  1467 |   await page.waitForFunction(() => document.documentElement.clientWidth === 320);
  1468 |   await expect(mobileFirstActionTrace).toHaveAttribute('data-cell-first-action-state', 'waiting');
  1469 |   await expect(mobileFirstActionTrace.locator('[data-cell-first-action-command="true"]')).toBeHidden();
  1470 |   expect(await page.locator('[data-cell-control-lead]:visible').count()).toBe(0);
  1471 |   const narrowFirstActionLayout = await mobileRibbon.evaluate((ribbon) => {
  1472 |     const rect = ribbon.getBoundingClientRect();
  1473 |     const primary = ribbon.querySelector('[data-cell-mission-ribbon-primary]') as HTMLElement;
  1474 |     const secondary = ribbon.querySelector('[data-cell-mission-ribbon-secondary]') as HTMLElement;
  1475 |     return {
  1476 |       height: rect.height,
  1477 |       scrollWidth: (ribbon as HTMLElement).scrollWidth,
  1478 |       clientWidth: (ribbon as HTMLElement).clientWidth,
  1479 |       primaryFont: parseFloat(getComputedStyle(primary).fontSize),
  1480 |       secondaryFont: parseFloat(getComputedStyle(secondary).fontSize),
  1481 |     };
  1482 |   });
  1483 |   expect(narrowFirstActionLayout.scrollWidth).toBeLessThanOrEqual(narrowFirstActionLayout.clientWidth + 1);
  1484 |   expect(narrowFirstActionLayout.height).toBeLessThanOrEqual(110);
  1485 |   expect(narrowFirstActionLayout.primaryFont).toBeGreaterThanOrEqual(14);
  1486 |   expect(narrowFirstActionLayout.secondaryFont).toBeGreaterThanOrEqual(12);
  1487 |   if (process.env.CELL_VISUAL_QA === '1') {
  1488 |     await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-first-action-ready-320.png' : testInfo.outputPath('cell-first-action-ready-320.png') });
  1489 |   }
  1490 |   await page.setViewportSize({ width: 390, height: 844 });
  1491 |   await page.evaluate(() => { const wrap = document.getElementById('wrap'); if (wrap) wrap.style.width = '390px'; });
  1492 |   await page.waitForFunction(() => document.documentElement.clientWidth === 390);
  1493 |   await parameciumChoice.click();
  1494 |   await expect(selectedOrganismCard).toHaveAttribute('data-cell-selected-organism', 'paramecium');
  1495 |   await expect(selectedOrganismCard).toHaveAttribute('data-cell-selected-organism-state', 'preview');
  1496 |   await expect(selectedOrganismCard.locator('[data-cell-selected-organism-eyebrow]')).toContainText('Mission preview');
  1497 |   await expect(selectedPrimaryAction).toHaveAttribute('aria-label', 'Play as Paramecium');
  1498 |   await expect(selectedPrimaryAction).toBeFocused();
  1499 |   await expect(backToOrganisms).toHaveAttribute('aria-label', 'Return to organism choices from Paramecium details');
  1500 |   if (process.env.CELL_VISUAL_QA === '1') {
  1501 |     await selectedOrganismCard.screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-mission-preview-mobile.png' : testInfo.outputPath('cell-mission-preview-mobile.png') });
  1502 |   }
  1503 |   await backToOrganisms.click();
  1504 |   await expect(parameciumChoice).toBeFocused();
  1505 |   await amoebaChoice.click();
  1506 |   await expect(selectedOrganismCard).toHaveAttribute('data-cell-selected-organism', 'amoeba');
  1507 |   await expect(selectedOrganismCard).toHaveAttribute('data-cell-selected-organism-state', 'current');
  1508 |   await expect(selectedPrimaryAction).toHaveAttribute('aria-label', 'Review Amoeba tutorial');
  1509 |   await expect(selectedPrimaryAction).toBeFocused();
  1510 |   await amoebaStructureRow.click();
  1511 |   await expect(mobileCanvas).toBeFocused();
  1512 |   await page.waitForFunction(() => {
  1513 |     const rect = document.querySelector('[data-cell-stage]')?.getBoundingClientRect();
  1514 |     return !!rect && rect.top < window.innerHeight && rect.bottom > 0;
  1515 |   });
  1516 |   await page.waitForFunction(() => ((window as any).__toolData.cell._cellExt.organellesClicked || []).includes('Pseudopods'));
> 1517 |   await page.waitForFunction(() => !!(document.querySelector('[data-cell-sim-canvas]') as any)?._cellSimGetOrganelleTooltip?.()?.layout?.bounds);
       |              ^ Error: page.waitForFunction: Test timeout of 200000ms exceeded.
  1518 |   const anatomyTooltip = await page.evaluate(() => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimGetOrganelleTooltip());
  1519 |   expect(anatomyTooltip).toMatchObject({
  1520 |     organismId: 'amoeba',
  1521 |     name: 'Pseudopods',
  1522 |   });
  1523 |   expect(anatomyTooltip.layout.legendBottom).toBeGreaterThan(0);
  1524 |   expect(anatomyTooltip.layout.bounds.top).toBeGreaterThanOrEqual(anatomyTooltip.layout.safeTop - 1);
  1525 |   expect(anatomyTooltip.layout.bounds.top).toBeGreaterThanOrEqual(
  1526 |     anatomyTooltip.layout.legendBottom + (6 * anatomyTooltip.layout.dpr),
  1527 |   );
  1528 |   if (process.env.CELL_VISUAL_QA === '1') {
  1529 |     await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-anatomy-jump-mobile.png' : testInfo.outputPath('cell-anatomy-jump-mobile.png') });
  1530 |   }
  1531 |   await centerPlayer.click();
  1532 |   await expect(mobileCanvas).toBeFocused();
  1533 |   expect(await organismGrid.evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length)).toBe(2);
  1534 |   await expect(fullTargetKey).toBeHidden();
  1535 |   await expect(compactTargetKey).toBeVisible();
  1536 |   await expect(compactTargetKey).toHaveText('FOOD target | Green circle');
  1537 |   expect(await page.locator('[data-cell-control-lead]:visible').count()).toBe(0);
  1538 |   await expect(mobileMissionPath).toBeHidden();
  1539 |   await setMissionScenario(page, { particleOffsets: [[120, 0]], resetRuntime: true });
  1540 |   await advanceMission(page, 0);
  1541 |   await setMissionScenario(page, { particleOffsets: [[0, 0]] });
  1542 |   expect((await advanceMission(page, 0)).successCount).toBe(1);
  1543 |   await expect(page.locator('[data-cell-evidence-feedback]')).toBeHidden();
  1544 |   await expect(page.locator('[data-cell-evidence-chain]')).toContainText('Pseudopods \u2192 engulfment');
  1545 |   await expect(page.locator('[data-cell-mission-cue]')).toBeHidden();
  1546 |   await expect(page.locator('[data-cell-mission-cue]')).toHaveAttribute('data-cell-cue-layout', 'consolidated');
  1547 |   await expect(page.locator('[data-cell-evidence-feedback]')).toHaveAttribute('data-cell-evidence-layout', 'consolidated');
  1548 |   await expect(mobileRibbon).toBeVisible();
  1549 |   await expect(mobileRibbon).toHaveAttribute('data-cell-ribbon-state', 'evidence');
  1550 |   await expect(mobileRibbon.locator('[data-cell-mission-ribbon-primary]')).toContainText('Pseudopods \u2192 engulfment');
  1551 |   await expect(mobileRibbon.locator('[data-cell-mission-ribbon-progress]')).toHaveText('1/3');
  1552 |   await mobileCanvas.focus();
  1553 |   await expect(page.locator('[data-cell-target-legend]')).toHaveAttribute('data-cell-target-state', 'recorded');
  1554 |   await expect(page.locator('[data-cell-target-proximity]')).toHaveAttribute('data-cell-proximity', 'recorded');
  1555 |   await expect(mobileMissionPath).toHaveAttribute('data-cell-approach-state', 'complete');
  1556 |   await expect(mobileMissionPath.locator('[data-cell-step-state="complete"]')).toHaveCount(3);
  1557 |   await expect(mobileMissionPath.locator('[aria-current="step"]')).toHaveCount(0);
  1558 |   await page.keyboard.down('ArrowRight');
  1559 |   expect(await page.evaluate(() => (document.querySelector('[data-cell-sim-canvas]') as any)._cellSimGetOrganelleTooltip())).toBeNull();
  1560 |   await page.waitForFunction(() => (document.querySelector('[data-cell-sim-canvas]') as any)?._cellSimGetControlResponse?.()?.moving === true);
  1561 |   const mobileControl = await readControlResponse(page);
  1562 |   expect(mobileControl).toMatchObject({
  1563 |     evidenceActive: true,
  1564 |     evidenceCount: 1,
  1565 |     evidenceLabel: 'Pseudopods \u2192 engulfment',
  1566 |     compactControlFocus: false,
  1567 |     anatomyLabelCount: 3,
  1568 |     mechanismVisual: 'pseudopod',
  1569 |     mechanismVisualActive: true,
  1570 |     mechanismVisualEvidence: true,
  1571 |   });
  1572 |   const mobileTrace = page.locator('[data-cell-control-loop]');
  1573 |   await expect(mobileTrace).toHaveAttribute('data-cell-control-phase', 'evidence');
  1574 |   await expect(mobileTrace.locator('[data-cell-control-input]')).toHaveText('Food contact');
  1575 |   await expect(mobileTrace.locator('[data-cell-control-mechanism]')).toHaveText('Pseudopods');
  1576 |   await expect(mobileTrace.locator('[data-cell-control-observation]')).toHaveText('engulfment');
  1577 |   await expect(mobileTrace).toHaveAttribute('aria-label', /Observed action: Food contact.*Biological mechanism: Pseudopods.*Evidence: engulfment.*Evidence 1 of 3/);
  1578 |   await expect(page.locator('[data-cell-direction-pad]')).toHaveAttribute('data-cell-active-direction', 'right');
  1579 |   await expect(page.locator('[data-cell-move="ArrowRight"]')).toHaveAttribute('aria-pressed', 'true');
  1580 |   await expect(page.locator('[data-cell-move="ArrowRight"]')).toHaveAttribute('data-cell-move-active', 'true');
  1581 |   await expect(page.locator('[data-cell-pad-readout]')).toHaveAttribute('data-cell-pad-state', 'active');
  1582 |   await expect(page.locator('[data-cell-pad-readout]')).toHaveText('right');
  1583 |   if (process.env.CELL_VISUAL_QA === '1') {
  1584 |     await page.locator('[data-cell-stage]').screenshot({ path: process.env.CELL_VISUAL_QA_DIR ? process.env.CELL_VISUAL_QA_DIR + '/cell-evidence-pulse-mobile.png' : testInfo.outputPath('cell-evidence-pulse-mobile.png') });
  1585 |   }
  1586 |   expect(mobileControl.tagBounds.left).toBeGreaterThanOrEqual(mobileControl.canvasBounds.left);
  1587 |   expect(mobileControl.tagBounds.right).toBeLessThanOrEqual(mobileControl.canvasBounds.right);
  1588 |   expect(mobileControl.tagBounds.top).toBeGreaterThanOrEqual(mobileControl.canvasBounds.top);
  1589 |   expect(mobileControl.tagBounds.bottom).toBeLessThanOrEqual(mobileControl.canvasBounds.bottom);
  1590 |   const mobileTagPlacement = await page.evaluate((response) => {
  1591 |     const canvas = document.querySelector('[data-cell-sim-canvas]') as HTMLCanvasElement;
  1592 |     const canvasRect = canvas.getBoundingClientRect();
  1593 |     const legendRect = document.querySelector('[data-cell-target-legend]')!.getBoundingClientRect();
  1594 |     const padRect = document.querySelector('[data-cell-direction-pad]')!.getBoundingClientRect();
  1595 |     const scaleY = canvas.height / canvasRect.height;
  1596 |     return {
  1597 |       tagTop: canvasRect.top + response.tagBounds.top / scaleY,
  1598 |       tagBottom: canvasRect.top + response.tagBounds.bottom / scaleY,
  1599 |       legendBottom: legendRect.bottom,
  1600 |       padTop: padRect.top,
  1601 |     };
  1602 |   }, mobileControl);
  1603 |   expect(mobileTagPlacement.tagTop).toBeGreaterThanOrEqual(mobileTagPlacement.legendBottom + 4);
  1604 |   expect(mobileTagPlacement.tagBottom).toBeLessThanOrEqual(mobileTagPlacement.padTop - 4);
  1605 | 
  1606 |   const bounds = await page.evaluate(() => {
  1607 |     const box = (selector: string) => {
  1608 |       const rect = document.querySelector(selector)?.getBoundingClientRect();
  1609 |       return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } : null;
  1610 |     };
  1611 |     return {
  1612 |       viewportWidth: document.documentElement.clientWidth,
  1613 |       scrollWidth: document.documentElement.scrollWidth,
  1614 |       stage: box('[data-cell-stage]'),
  1615 |       stageHud: box('[data-cell-stage-hud]'),
  1616 |       hudHeading: box('[data-cell-hud-heading]'),
  1617 |       hudActions: box('[data-cell-hud-actions]'),
```