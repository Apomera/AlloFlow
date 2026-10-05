# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> simultaneous responses: matching motion, reduced-motion inspection and captured A/B graphics recovery
- Location: tests\e2e\26-bridgelab-gl.spec.ts:1628:7

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('[data-bridge-elevation]')
Expected: focused
Received: inactive
Timeout:  15000ms

Call log:
  - Expect "toBeFocused" with timeout 15000ms
  - waiting for locator('[data-bridge-elevation]')
    33 × locator resolved to <div tabindex="0" role="region" data-bridge-elevation="true" aria-label="Bridge side elevation horizontal scroll region">…</div>
       - unexpected value "inactive"

```

```yaml
- region "Bridge side elevation horizontal scroll region":
  - img "Warren truss diagram Warren truss with 4 bays, span 40 meters, height 6 meters. Red members are in tension; blue members are in compression. Thickness shows magnitude of force.": TC1 50kN 50kN 50kN 50kN Span = 40 m
```

# Test source

```ts
  1549 |         loadMode:'vehicle',loadPerJoint:73,vehicleLoad:220,vehiclePos:0.37,lateralBraceEvery:1};
  1550 |       await mountWorkflow(page,width,{...design,bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,
  1551 |         designName:'Classroom crossing',designNotes:'Inspect the deck against the banks.'});
  1552 |       await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
  1553 |       const stage=page.locator('[data-allo-fs-stage]'); await stage.scrollIntoViewIfNeeded();
  1554 |       await page.getByRole('button',{name:'A · reference',exact:true}).click();
  1555 |       await page.getByRole('combobox',{name:'Scene key moments',exact:true}).selectOption('motion');
  1556 |       const time=await page.evaluate(()=>(window as any).__bucket().seismicTime);
  1557 |       await page.getByRole('button',{name:'B · current',exact:true}).click();
  1558 |       const readings=page.locator('[data-bridge-overlay-readings]');
  1559 |       await expect(readings).toHaveAttribute('data-bridge-overlay-readings',String(time));
  1560 |       await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
  1561 |       await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOutlineTrial)).toBe('reference');
  1562 |       const expected=await page.evaluate(()=>(window as any).__gl());
  1563 |       expect(expected.comparisonReferenceM).not.toBe(expected.comparisonCurrentM);
  1564 |       expect(expected.comparisonOutlinePosition[2]).toBeCloseTo(expected.comparisonReferenceM*10,8);
  1565 |       expect(expected.deckOffsetM).toBeCloseTo(expected.comparisonCurrentM,12);
  1566 |       expect(expected.comparisonTrailSamples).toBe(31);
  1567 |       await page.getByRole('button',{name:'A · reference',exact:true}).click();
  1568 |       await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOutlineTrial)).toBe('current');
  1569 |       await page.getByRole('button',{name:'B · current',exact:true}).click();
  1570 |       await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOutlineTrial)).toBe('reference');
  1571 |       const warm=await page.evaluate(()=>(window as any).__gl());
  1572 |       for(let i=0;i<8;i++){
  1573 |         await page.getByRole('button',{name:'Show both responses',exact:true}).click();
  1574 |         await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(i%2!==0);
  1575 |         await page.evaluate(t=>(window as any).__set({seismicTime:t}),time+i*0.05);
  1576 |       }
  1577 |       await page.evaluate(t=>(window as any).__set({seismicTime:t}),time);
  1578 |       await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonReferenceM)).toBeCloseTo(expected.comparisonReferenceM,12);
  1579 |       const after=await page.evaluate(()=>(window as any).__gl());
  1580 |       expect(after.sceneBuilds).toBe(warm.sceneBuilds); expect(after.resources).toEqual(warm.resources);
  1581 |       await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
  1582 |       await checkBridgeCanvasFillsStage(page);
  1583 |       await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+width+'-simultaneous-responses.png')});
  1584 |       const measurementToggle=page.locator('[data-bridge-scene-readout] > summary');
  1585 |       await measurementToggle.press('Enter');
  1586 |       await expect(page.locator('[data-bridge-compact-comparison]')).toHaveAttribute('data-bridge-compact-comparison',String(time));
  1587 |       await expect(page.locator('[data-compact-response=reference]')).toContainText('outline');
  1588 |       await expect(page.locator('[data-compact-response=current]')).toContainText('solid');
  1589 |       await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+width+'-simultaneous-compact.png')});
  1590 |       await measurementToggle.press('Enter');
  1591 |       await expect(readings).toHaveAttribute('data-bridge-overlay-readings',String(time));
  1592 |       const panel=await page.locator('[data-bridge-scene-readout]').boundingBox(),replay=await page.locator('[data-bridge-scene-replay]').boundingBox();
  1593 |       if(!panel||!replay)throw new Error('Scene panels missing'); expect(panel.y+panel.height).toBeLessThanOrEqual(replay.y-4);
  1594 |       await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
  1595 |       await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('The reference moves farther under the same ground motion.');
  1596 |       await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
  1597 |       const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);
  1598 |       expect(saved.scene.design.inputs).toEqual(design);
  1599 |       expect(saved.scene.comparison).toMatchObject({referenceInputs:{dampingRatio:0.05},currentInputs:{dampingRatio:0.2}});
  1600 |       await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
  1601 |       await page.evaluate(()=>(window as any).__set({span:20,height:3,nBays:4,materialId:'wood',trussStyle:'howe',crossSectionMm2:1000,
  1602 |         loadMode:'uniform',loadPerJoint:1,vehicleLoad:40,vehiclePos:0.9,lateralBraceEvery:2,bridgeView:'2d',
  1603 |         designName:'Changed',designNotes:'Changed',seismicTime:18,seismicDampingRatio:0.3,seismicFrequencyHz:2,
  1604 |         seismicIntensityG:0.2,seismicSceneCompare:false,seismicSceneOverlay:false,seismicGuideBaseline:null}));
  1605 |       await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
  1606 |       await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toBeFocused();
  1607 |       const restored=await page.evaluate(()=>(window as any).__bucket());
  1608 |       expect(restored).toMatchObject({...design,designName:'Classroom crossing',designNotes:'Inspect the deck against the banks.',
  1609 |         seismicTime:time,seismicDampingRatio:0.2,seismicFrequencyHz:1.1,seismicIntensityG:0.12,
  1610 |         seismicSceneCompare:true,seismicSceneSource:'capture',seismicSceneTrial:'current',seismicSceneOverlay:true,seismicPlaying:false});
  1611 |       await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
  1612 |       const reproduced=await page.evaluate(()=>(window as any).__gl());
  1613 |       expect(reproduced.extent).toEqual(expected.extent);
  1614 |       expect(reproduced.comparisonReferenceM).toBeCloseTo(expected.comparisonReferenceM,12);
  1615 |       expect(reproduced.comparisonCurrentM).toBeCloseTo(expected.comparisonCurrentM,12);
  1616 |       const motion=await page.locator('[data-seismic-scene-pair-motion]').textContent();
  1617 |       await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
  1618 |       const report=page.locator('[data-bridge-print-seismic]');
  1619 |       await expect(report.locator('[data-seismic-scene-design]')).toContainText('40 m × 8 m');
  1620 |       await expect(report).toContainText('Classroom crossing');
  1621 |       await expect(report.locator('[data-seismic-scene-pair-motion]')).toHaveText(motion!);
  1622 |       await expect(report.locator('button,input,textarea,select')).toHaveCount(0);
  1623 |       await captureImmersiveRegion(page,report,'bridge-'+width+'-complete-scene-report.png',ENHANCEMENT_REPORT);
  1624 |       await checkWorkflowHealth(page);
  1625 |     });
  1626 |   }
  1627 | 
  1628 |   test('simultaneous responses: matching motion, reduced-motion inspection and captured A/B graphics recovery',async ({page})=>{
  1629 |     await page.emulateMedia({reducedMotion:'reduce'});
  1630 |     await mountWorkflow(page,1000,{span:40,bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true});
  1631 |     await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
  1632 |     const stage=page.locator('[data-allo-fs-stage]'); await stage.scrollIntoViewIfNeeded();
  1633 |     await page.evaluate(()=>(window as any).__set({seismicTime:7.217,seismicFrequencyHz:1.4}));
  1634 |     await expect(page.getByRole('button',{name:'Show both responses',exact:true})).toBeDisabled();
  1635 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(false);
  1636 |     await page.evaluate(()=>(window as any).__set({seismicFrequencyHz:1.1}));
  1637 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
  1638 |     await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeDisabled();
  1639 |     await page.getByRole('button',{name:'A · reference',exact:true}).click();
  1640 |     await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
  1641 |     await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
  1642 |     await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('A and B share the ground motion.');
  1643 |     await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
  1644 |     await page.evaluate(()=>{
  1645 |       const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  1646 |       const context=canvas.getContext('webgl2')||canvas.getContext('webgl');const extension=context?.getExtension('WEBGL_lose_context');
  1647 |       if(!extension)throw new Error('WebGL loss extension unavailable');(window as any).__pairLoss=extension;extension.loseContext();
  1648 |     });
> 1649 |     await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
       |                                                           ^ Error: expect(locator).toBeFocused() failed
  1650 |     await page.evaluate(()=>(window as any).__set({span:25,seismicTime:18,seismicDampingRatio:0.3}));
  1651 |     await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
  1652 |     await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
  1653 |     expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({span:40,bridgeView:'2d',seismicTime:7.217,
  1654 |       seismicDampingRatio:0.2,seismicSceneCompare:true,seismicSceneTrial:'reference',seismicSceneSource:'capture',seismicPlaying:false});
  1655 |     await page.evaluate(()=>(window as any).__pairLoss.restoreContext());
  1656 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');
  1657 |     expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');
  1658 |     await page.getByRole('button',{name:'From the riverbank',exact:true}).click();await stage.scrollIntoViewIfNeeded();
  1659 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
  1660 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOutlineTrial)).toBe('current');
  1661 |     await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeDisabled();
  1662 |     await checkWorkflowHealth(page);
  1663 |   });
  1664 | 
  1665 |   for (const width of [1000, 320]) {
  1666 |     test('scene observations: record reference A, revisit the bank and print at ' + width + 'px', async ({ page }) => {
  1667 |       await mountWorkflow(page,width,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,bridgeBankPitch:-8,
  1668 |         seismicEnabled:true,seismicGuideOpen:true,seismicPrediction:'B prediction stays here',seismicObservation:'B explanation stays here'});
  1669 |       await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
  1670 |       await page.evaluate(() => (window as any).__set({seismicTime:7.217}));
  1671 |       const stage=page.locator('[data-allo-fs-stage]');
  1672 |       await stage.scrollIntoViewIfNeeded();
  1673 |       await page.getByRole('button',{name:'A · reference',exact:true}).click();
  1674 |       await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
  1675 |       await checkBridgeCanvasFillsStage(page);
  1676 |       await page.getByRole('button',{name:'Replay scene',exact:true}).click();
  1677 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(true);
  1678 |       const recorder=page.locator('[data-bridge-scene-recorder]');
  1679 |       await recorder.locator('summary').press('Enter');
  1680 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  1681 |       await page.evaluate(() => (window as any).__set({seismicTime:7.217}));
  1682 |       const note='From the bank, the deck moves relative to the ground.\nThe damper transfers stored energy into dissipated energy.';
  1683 |       await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill(note);
  1684 |       await expect(recorder.locator('[data-scene-record-context]')).toHaveText('A · reference · 7.217 s');
  1685 |       await page.locator('[data-bridge-scene-readout]').evaluate(element => {element.scrollTop=0;});
  1686 |       await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+width+'-scene-observation.png')});
  1687 |       const panel=await page.locator('[data-bridge-scene-readout]').boundingBox();
  1688 |       const replay=await page.locator('[data-bridge-scene-replay]').boundingBox();
  1689 |       if(!panel||!replay)throw new Error('Scene controls missing');
  1690 |       expect(panel.y+panel.height).toBeLessThanOrEqual(replay.y-4);
  1691 |       await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
  1692 |       await expect(recorder.locator('[data-scene-record-saved]')).toContainText('saved in the earthquake notebook');
  1693 |       const bucket=await page.evaluate(() => (window as any).__bucket());
  1694 |       expect(bucket).toMatchObject({seismicDampingRatio:0.2,seismicSceneTrial:'reference',seismicTime:7.217,
  1695 |         seismicPlaying:false,seismicPrediction:'B prediction stays here',seismicObservation:'B explanation stays here'});
  1696 |       const record=bucket.seismicTrials[0];
  1697 |       expect(record).toMatchObject({timeS:7.217,prediction:'',observation:note,inputs:{dampingRatio:0.05},
  1698 |         scene:{source:'reference',view:'immersive',observer:'bank',bankYaw:18,bankPitch:-8}});
  1699 |       await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
  1700 |       const card=page.locator('[data-seismic-trial="0"]');
  1701 |       await expect(card).toContainText('Captured from the reference scene · Riverbank viewpoint');
  1702 |       const power=await card.locator('[data-seismic-scene-power]').textContent();
  1703 |       await page.evaluate(() => (window as any).__set({bridgeView:'2d',bridgeObserver:'deck',bridgeBankYaw:-30,bridgeBankPitch:20,
  1704 |         seismicTime:18,seismicDampingRatio:0.3,seismicSceneCompare:true,seismicSceneTrial:'reference'}));
  1705 |       await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
  1706 |       const view=page.locator('[aria-describedby="bridge-gl-description"]');
  1707 |       await expect(view).toBeFocused();
  1708 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
  1709 |       expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({bridgeView:'immersive',bridgeObserver:'bank',
  1710 |         bridgeBankYaw:18,bridgeBankPitch:-8,seismicTime:7.217,seismicDampingRatio:0.2,seismicSceneCompare:true,
  1711 |         seismicSceneSource:'capture',seismicSceneTrial:'reference',seismicSceneNote:note,seismicPlaying:false});
  1712 |       await expect(page.getByRole('textbox',{name:'Scene observation note',exact:true})).toHaveValue(note);
  1713 |       await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
  1714 |       const report=page.locator('[data-bridge-print-seismic]');
  1715 |       await expect(report).toContainText('Inspected time: 7.217 s');
  1716 |       await expect(report).toContainText(note.replaceAll('\n',' '));
  1717 |       await expect(report.locator('[data-seismic-scene-power]')).toHaveText(power!);
  1718 |       await expect(report.locator('button,input,textarea,select')).toHaveCount(0);
  1719 |       await captureImmersiveRegion(page,report,'bridge-'+width+'-scene-observation-report.png',ENHANCEMENT_REPORT);
  1720 |       await checkWorkflowHealth(page);
  1721 |     });
  1722 |   }
  1723 | 
  1724 |   test('scene observations: graphics loss preserves the saved pose and focused fallback until deliberate recovery', async ({page}) => {
  1725 |     await mountWorkflow(page,1000,{bridgeView:'immersive',bridgeObserver:'bank',bridgeBankYaw:18,bridgeBankPitch:-8,
  1726 |       seismicEnabled:true,seismicTime:7.217,seismicSceneRecording:true,seismicSceneNote:'Watch the ground and the deck.'});
  1727 |     await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
  1728 |     await page.evaluate(() => {
  1729 |       const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  1730 |       const context=canvas.getContext('webgl2')||canvas.getContext('webgl');
  1731 |       const extension=context?.getExtension('WEBGL_lose_context');
  1732 |       if(!extension)throw new Error('WebGL loss extension unavailable');
  1733 |       (window as any).__sceneRecordLoss=extension; extension.loseContext();
  1734 |     });
  1735 |     await expect(page.locator('[data-bridge-elevation]')).toBeVisible();
  1736 |     await page.evaluate(() => (window as any).__set({seismicTime:18,bridgeBankYaw:-30}));
  1737 |     await page.emulateMedia({reducedMotion:'reduce'});
  1738 |     await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
  1739 |     await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
  1740 |     expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({bridgeView:'2d',bridgeObserver:'bank',
  1741 |       bridgeBankYaw:18,bridgeBankPitch:-8,seismicTime:7.217,seismicPlaying:false});
  1742 |     await page.evaluate(() => (window as any).__sceneRecordLoss.restoreContext());
  1743 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
  1744 |     expect(await page.evaluate(() => (window as any).__bucket().bridgeView)).toBe('2d');
  1745 |     await page.getByRole('button',{name:'From the riverbank',exact:true}).click();
  1746 |     await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
  1747 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
  1748 |     await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeDisabled();
  1749 |     await expect(page.getByRole('textbox',{name:'Scene observation note',exact:true})).toHaveValue('Watch the ground and the deck.');
```