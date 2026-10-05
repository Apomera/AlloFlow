# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> force lens: phone walking, camera turns, keyboard tools and saved observation restoration
- Location: tests\e2e\26-bridgelab-gl.spec.ts:1787:7

# Error details

```
Error: locator.scrollIntoViewIfNeeded: Error: strict mode violation: locator('[data-bridge-force-lens="scene"]').locator('summary') resolved to 2 elements:
    1) <summary>Force lens</summary> aka getByText('Force lens')
    2) <summary>Why can these rates differ from the energy histor…</summary> aka getByLabel('Earthquake scene readout').getByText('Why can these rates differ')

Call log:
  - waiting for locator('[data-bridge-force-lens="scene"]').locator('summary')

```

# Test source

```ts
  1702 |       expect(await orbit.locator('[data-orbit-free]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')))).toEqual(curves);
  1703 |       await inspectWholeOrbit(page);await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-energy-orbit.png')});
  1704 |       expect(await drawer.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
  1705 |       await next.focus();await next.press('Escape');await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
  1706 |       await expect(page.locator('[data-bridge-compact-orbit]')).toContainText('J/kg');
  1707 |       await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-orbit-scene.png')});
  1708 |       await summary.press('Enter');await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
  1709 |       await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('At a turning point the deck has no relative velocity.');await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
  1710 |       const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(saved.scene.display.energyOrbit).toBe(true);expect(saved.timeS).toBe(time);
  1711 |       await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
  1712 |       await page.evaluate(()=>(window as any).__set({seismicEnergyOrbit:false,seismicTime:0,bridgeView:'2d',seismicDampingRatio:0.3}));
  1713 |       await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
  1714 |       expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicEnergyOrbit:true,seismicTime:time,seismicPlaying:false,seismicSceneTrial:'reference'});
  1715 |       const evidence=await page.locator('[data-seismic-scene-orbit]').textContent();
  1716 |       await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
  1717 |       await expect(page.locator('[data-bridge-print-seismic] [data-seismic-scene-orbit]')).toHaveText(evidence!);
  1718 |       await expect(page.locator('[data-bridge-print-seismic]').locator('button,input,select,textarea')).toHaveCount(0);await checkWorkflowHealth(page);
  1719 |     });
  1720 |   }
  1721 |   test('energy orbit: reduced-motion zero shaking, landscape tools and deliberate graphics recovery',async ({page})=>{
  1722 |     await page.emulateMedia({reducedMotion:'reduce'});
  1723 |     await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:16,seismicIntensityG:0,seismicEnergyOrbit:true,seismicSceneFocus:true,seismicReadoutCollapsed:true,crossSectionMm2:30000,lateralBraceEvery:1});
  1724 |     await page.setViewportSize({width:844,height:390});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
  1725 |     await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
  1726 |     const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
  1727 |     const orbit=page.locator('[data-bridge-energy-orbit="scene"]');await inspectWholeOrbit(page);
  1728 |     await expect(page.getByRole('button',{name:'Next turning point',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Next center crossing',exact:true})).toBeDisabled();
  1729 |     await expect(orbit.locator('[data-orbit-insight]')).toContainText('No shaking');
  1730 |     expect(await orbit.locator('[data-orbit-energy]').evaluateAll(rows=>rows.every(row=>Number(row.getAttribute('data-orbit-value'))===0))).toBe(true);
  1731 |     await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-844-orbit-zero.png')});
  1732 |     await page.getByRole('button',{name:'Next turning point',exact:true}).focus();
  1733 |     await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const context=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=context?.getExtension('WEBGL_lose_context');if(!extension)throw new Error('No context loss extension');(window as any).__orbitLoss=extension;extension.loseContext();});
  1734 |     await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
  1735 |     const fallback=page.locator('[data-bridge-energy-orbit="fallback"]');await expect(fallback).toHaveAttribute('open','');await expect(fallback.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-trial','current');
  1736 |     await page.evaluate(()=>(window as any).__orbitLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');
  1737 |     expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');await page.getByRole('button',{name:'From the riverbank',exact:true}).click();
  1738 |     expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicEnergyOrbit:true,seismicPlaying:false,seismicTime:16});await checkWorkflowHealth(page);
  1739 |   });
  1740 |   test('energy orbit: undamped free-vibration inspection in the labelled 2D view',async ({page})=>{
  1741 |     await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,1000,{bridgeView:'3d',seismicEnabled:true,seismicTime:16,seismicDampingRatio:0,seismicEnergyOrbit:true});
  1742 |     await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();
  1743 |     const orbit=page.locator('[data-bridge-energy-orbit="fallback"]');await expect(orbit.locator('[data-orbit-insight]')).toContainText('undamped');
  1744 |     const before=Number(await orbit.locator('[data-orbit-energy="stored"]').getAttribute('data-orbit-value'));
  1745 |     await page.getByRole('button',{name:'Next turning point',exact:true}).click();await expect(orbit.locator('[data-orbit-insight]')).toHaveAttribute('data-orbit-insight','turning');
  1746 |     await page.getByRole('button',{name:'Next center crossing',exact:true}).click();const after=Number(await orbit.locator('[data-orbit-energy="stored"]').getAttribute('data-orbit-value'));
  1747 |     await expect(orbit.locator('[data-orbit-insight]')).toContainText('If damping is present');
  1748 |     expect(Math.abs(after-before)/before).toBeLessThan(0.01);expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
  1749 |     await captureImmersiveRegion(page,orbit,'bridge-1000-orbit-2d.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
  1750 |   });
  1751 | 
  1752 |   test('force lens: selected A/B vectors, fixed scale and stable resources in the riverbank scene',async ({page})=>{
  1753 |     await mountWorkflow(page,1000,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1});
  1754 |     await page.setViewportSize({width:1000,height:800});
  1755 |     await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
  1756 |     await page.evaluate(()=>(window as any).__set({seismicTime:7.217}));
  1757 |     const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
  1758 |     const lens=page.locator('[data-bridge-force-lens="scene"]');
  1759 |     await lens.locator('summary').press('Enter');
  1760 |     await expect(lens).toHaveAttribute('open','');
  1761 |     await stage.scrollIntoViewIfNeeded();
  1762 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
  1763 |     const before=await page.evaluate(()=>(window as any).__gl());
  1764 |     expect(before.forceTrial).toBe('current');expect(before.forceVectors).toHaveLength(3);
  1765 |     const values=await lens.locator('[data-force-reading]').evaluateAll(rows=>rows.map(row=>Number(row.getAttribute('data-force-value'))));
  1766 |     expect(values).toEqual(before.forceVectors.map((v:any)=>v.valueNPerKg));expect(values[0]+values[1]).toBeCloseTo(values[2],10);
  1767 |     await page.getByRole('button',{name:'A · reference',exact:true}).click();await stage.scrollIntoViewIfNeeded();
  1768 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceTrial)).toBe('reference');
  1769 |     const a=await page.evaluate(()=>(window as any).__gl());expect(a.forceLimitNPerKg).toBe(before.forceLimitNPerKg);
  1770 |     expect(a.forceVectors.map((v:any)=>v.valueNPerKg)).not.toEqual(values);
  1771 |     await expect(page.locator('[data-force-frame]')).toHaveAttribute('data-force-trial','reference');
  1772 |     await page.getByRole('button',{name:'Focus scene',exact:true}).click();
  1773 |     await expect(page.locator('[data-bridge-compact-forces]')).toContainText('N/kg');
  1774 |     await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
  1775 |     await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
  1776 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceVectors[0].valueNPerKg)).toBeCloseTo(a.forceVectors[0].valueNPerKg,10);
  1777 |     const warm=await page.evaluate(()=>(window as any).__gl());
  1778 |     for(let cycle=0;cycle<3;cycle++){await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();}
  1779 |     expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);expect(await page.evaluate(()=>(window as any).__gl().resources)).toEqual(warm.resources);
  1780 |     await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-1000-force-bank.png')});
  1781 |     await page.locator('[data-bridge-scene-drawer] > summary').press('Enter');await lens.locator('[data-force-reading="spring"]').scrollIntoViewIfNeeded();
  1782 |     await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-1000-force-tools.png')});
  1783 |     expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(7.217);expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
  1784 |     await checkWorkflowHealth(page);
  1785 |   });
  1786 | 
  1787 |   test('force lens: phone walking, camera turns, keyboard tools and saved observation restoration',async ({page})=>{
  1788 |     await page.emulateMedia({reducedMotion:'reduce'});
  1789 |     await mountWorkflow(page,320,{bridgeView:'immersive',bridgeObserver:'deck',bridgeWalkPos:0.45,seismicEnabled:true,seismicTime:7.217,seismicForceLens:true,crossSectionMm2:30000,lateralBraceEvery:1});
  1790 |     await page.setViewportSize({width:320,height:568});
  1791 |     const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
  1792 |     await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
  1793 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
  1794 |     const before=await page.evaluate(()=>(window as any).__gl());
  1795 |     await page.getByRole('button',{name:'Walk toward far end',exact:true}).click();
  1796 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceVectors[0].origin[0])).toBeCloseTo(before.forceVectors[0].origin[0]+1.5,8);
  1797 |     const viewer=page.locator('[aria-describedby="bridge-gl-description"]');await viewer.focus();await viewer.press('ArrowRight');
  1798 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceVectors[0].origin[2])).not.toBe(before.forceVectors[0].origin[2]);
  1799 |     expect(await page.evaluate(()=>(window as any).__gl().forceVectors.map((v:any)=>v.valueNPerKg))).toEqual(before.forceVectors.map((v:any)=>v.valueNPerKg));
  1800 |     await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-force-walkway.png')});
  1801 |     const drawer=page.locator('[data-bridge-scene-drawer]'),summary=drawer.locator('summary').first();await summary.press('Enter');
> 1802 |     const lens=page.locator('[data-bridge-force-lens="scene"]');await lens.locator('summary').scrollIntoViewIfNeeded();
       |                                                                                               ^ Error: locator.scrollIntoViewIfNeeded: Error: strict mode violation: locator('[data-bridge-force-lens="scene"]').locator('summary') resolved to 2 elements:
  1803 |     const causality=lens.locator('[data-force-motion="scene"]'),velocity=causality.locator('[data-force-relative-speed]');await velocity.scrollIntoViewIfNeeded();
  1804 |     expect(await causality.locator('[data-force-motion-direction]').evaluate(node=>{const box=node.getBoundingClientRect();return [box.width,box.height];})).toEqual([80,24]);
  1805 |     const cards=await causality.locator('[data-force-motion-contribution]').evaluateAll(nodes=>nodes.map(node=>{const box=node.getBoundingClientRect();return {left:box.left,top:box.top,bottom:box.bottom};}));expect(cards[0].left).toBeCloseTo(cards[1].left,1);expect(cards[1].top).toBeGreaterThanOrEqual(cards[0].bottom);
  1806 |     await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-force-direction-tools.png')});
  1807 |     const rates=causality.locator('[data-force-motion-rate-details]');await rates.locator('summary').press('Enter');await expect(rates).toHaveAttribute('open','');await rates.locator('p').scrollIntoViewIfNeeded();await expect(rates.locator('p')).toBeVisible();await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-force-exchange-tools.png')});await rates.locator('summary').press('Enter');await expect(rates).not.toHaveAttribute('open');
  1808 |     expect(await drawer.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
  1809 |     await lens.locator('summary').press('Escape');await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
  1810 |     await summary.press('Enter');await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
  1811 |     await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('Spring and damping can point in different directions.');
  1812 |     await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
  1813 |     const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(saved.scene.display.forceLens).toBe(true);
  1814 |     await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
  1815 |     await page.evaluate(()=>(window as any).__set({seismicForceLens:false,seismicTime:0,bridgeView:'2d'}));
  1816 |     await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
  1817 |     expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicForceLens:true,seismicTime:7.217,seismicPlaying:false,bridgeWalkPos:0.5});
  1818 |     await summary.press('Enter');await stage.scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
  1819 |     expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
  1820 |     await expect(page.locator('[data-seismic-scene-forces]')).toContainText('spring / damping / net');
  1821 |     const evidence=await page.locator('[data-seismic-scene-forces]').textContent();
  1822 |     await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
  1823 |     await expect(page.locator('[data-bridge-print-seismic] [data-seismic-scene-forces]')).toHaveText(evidence!);
  1824 |     await expect(page.locator('[data-bridge-print-seismic]').locator('button,input,select,textarea')).toHaveCount(0);
  1825 |     await checkWorkflowHealth(page);
  1826 |   });
  1827 | 
  1828 |   test('force lens: zero shaking, graphics fallback and deliberate recovery in landscape',async ({page})=>{
  1829 |     await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:16,seismicIntensityG:0,seismicForceLens:true,seismicSceneFocus:true,seismicReadoutCollapsed:true,crossSectionMm2:30000,lateralBraceEvery:1});
  1830 |     await page.setViewportSize({width:844,height:390});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
  1831 |     await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
  1832 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
  1833 |     expect(await page.evaluate(()=>(window as any).__gl().forceVectors.every((v:any)=>v.direction===0&&v.valueNPerKg===0))).toBe(true);
  1834 |     await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-844-force-zero.png')});
  1835 |     await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  1836 |       const context=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=context?.getExtension('WEBGL_lose_context');
  1837 |       if(!extension)throw new Error('WebGL loss extension unavailable');(window as any).__forceLoss=extension;extension.loseContext();});
  1838 |     await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
  1839 |     const fallback=page.locator('[data-bridge-force-lens="fallback"]');await expect(fallback).toHaveAttribute('open','');
  1840 |     await expect(fallback.locator('[data-force-frame]')).toHaveAttribute('data-force-trial','current');
  1841 |     expect(await fallback.locator('[data-force-reading]').evaluateAll(rows=>rows.every(row=>Number(row.getAttribute('data-force-value'))===0))).toBe(true);
  1842 |     await page.evaluate(()=>(window as any).__forceLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');
  1843 |     expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');await page.getByRole('button',{name:'From the riverbank',exact:true}).click();await stage.scrollIntoViewIfNeeded();
  1844 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
  1845 |     expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicForceLens:true,seismicTime:16,seismicPlaying:false});
  1846 |     await checkWorkflowHealth(page);
  1847 |   });
  1848 | 
  1849 |   for (const size of [{width:1000,height:800},{width:320,height:568},{width:844,height:390}]) {
  1850 |     test('scene focus: paired drawer, compact replay and stable graphics at '+size.width+'x'+size.height,async ({page})=>{
  1851 |       await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,
  1852 |         crossSectionMm2:30000,lateralBraceEvery:1,seismicObservation:'Keep the comparison.'});
  1853 |       await page.setViewportSize(size);
  1854 |       await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
  1855 |       const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
  1856 |       await page.getByRole('button',{name:'A · reference',exact:true}).click();
  1857 |       await page.getByRole('combobox',{name:'Scene key moments',exact:true}).selectOption('motion');
  1858 |       await page.getByRole('button',{name:'B · current',exact:true}).click();
  1859 |       const time=await page.evaluate(()=>(window as any).__bucket().seismicTime);
  1860 |       await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
  1861 |       const before=await page.evaluate(()=>(window as any).__gl());
  1862 |       const focusBox=await page.getByRole('button',{name:'Focus scene',exact:true}).boundingBox();
  1863 |       const initialPanel=await page.locator('[data-bridge-scene-readout]').boundingBox();
  1864 |       if(!focusBox||!initialPanel)throw new Error('Scene controls missing');
  1865 |       expect(focusBox.x).toBeGreaterThanOrEqual(initialPanel.x+initialPanel.width+3);
  1866 |       await page.getByRole('button',{name:'Focus scene',exact:true}).click();
  1867 |       await expect(stage).toHaveAttribute('data-bridge-scene-focus','true');
  1868 |       const drawer=page.locator('[data-bridge-scene-drawer]');
  1869 |       await expect(drawer).not.toHaveAttribute('open');
  1870 |       await expect(page.locator('[data-bridge-compact-comparison]')).toHaveAttribute('data-bridge-compact-comparison',String(time));
  1871 |       await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
  1872 |       await checkBridgeCanvasFillsStage(page);
  1873 |       const replay=page.locator('[data-bridge-focus-replay]');
  1874 |       const a=await drawer.boundingBox(),b=await replay.boundingBox();
  1875 |       if(!a||!b)throw new Error('Focus panels missing');expect(a.y+a.height).toBeLessThanOrEqual(b.y-4);
  1876 |       expect(await replay.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
  1877 |       await expect(page.getByRole('combobox',{name:'Scene key moments',exact:true})).toHaveCount(0);
  1878 |       await expect(page.getByRole('slider',{name:'Scene replay time (s)',exact:true})).toHaveCount(1);
  1879 |       await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();
  1880 |       expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeCloseTo(time-0.5,9);
  1881 |       await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
  1882 |       expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeCloseTo(time,9);
  1883 |       const warm=await page.evaluate(()=>(window as any).__gl());
  1884 |       expect(warm.sceneBuilds).toBe(before.sceneBuilds);
  1885 |       // A changed viewport or first inspected frame can bring previously culled
  1886 |       // geometry into view. Verify repeated inspection after those first uploads.
  1887 |       for(let cycle=0;cycle<3;cycle++){
  1888 |         await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();
  1889 |         await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
  1890 |       }
  1891 |       expect(await page.evaluate(()=>(window as any).__gl().resources)).toEqual(warm.resources);
  1892 |       expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
  1893 |       await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'x'+size.height+'-focus-scene.png')});
  1894 |       const summary=drawer.locator('summary').first();
  1895 |       await summary.press('Enter');await expect(drawer).toHaveAttribute('open','');
  1896 |       await expect(page.getByRole('combobox',{name:'Scene key moments',exact:true})).toBeVisible();
  1897 |       const expanded=await drawer.boundingBox(),replayBox=await replay.boundingBox();
  1898 |       if(!expanded||!replayBox)throw new Error('Focus drawer missing');expect(expanded.y+expanded.height).toBeLessThanOrEqual(replayBox.y-4);
  1899 |       expect(await drawer.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
  1900 |       expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
  1901 |       await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'x'+size.height+'-focus-tools.png')});
  1902 |       await page.getByRole('combobox',{name:'Scene key moments',exact:true}).selectOption('end');
```