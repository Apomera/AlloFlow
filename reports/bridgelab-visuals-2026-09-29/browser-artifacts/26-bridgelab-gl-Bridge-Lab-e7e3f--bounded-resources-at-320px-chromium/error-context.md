# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> bridge landscape: lighting, river views and bounded resources at 320px
- Location: tests\e2e\26-bridgelab-gl.spec.ts:598:9

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 156
Received: 148
```

# Test source

```ts
  520 |       await captureRegion(page, page.locator('#bridge-print-region'), `bridge-${width}-portfolio.png`);
  521 |       await checkWorkflowHealth(page);
  522 |       if (width === 1000) {
  523 |         await page.emulateMedia({ media: 'print' });
  524 |         await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  525 |         await page.pdf({ path: join(ENHANCEMENT_REPORT, 'bridge-evidence-portfolio.pdf'), format: 'A4', printBackground: true,
  526 |           margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' } });
  527 |       }
  528 |     });
  529 |   }
  530 | 
  531 |   test('view recovery: WebGL loss moves focused controls to a persistent labelled 2D fallback', async ({ page }) => {
  532 |     await mountWorkflow(page, 1000, { loadMode: 'vehicle', vehiclePos: 0.3 });
  533 |     const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
  534 |     await viewer.focus();
  535 |     await page.evaluate(() => {
  536 |       const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  537 |       const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  538 |       const extension = context?.getExtension('WEBGL_lose_context');
  539 |       if (!extension) throw new Error('Chromium did not expose WEBGL_lose_context');
  540 |       (window as any).__bridgeRestoreContext = extension;
  541 |       extension.loseContext();
  542 |     });
  543 |     const fallback = page.locator('[data-bridge-elevation]');
  544 |     await expect(page.locator('[data-bridge-view-status]')).toBeVisible();
  545 |     await expect(page.locator('[data-bridge-view-status]')).toContainText('3D is unavailable');
  546 |     await expect(fallback).toBeFocused();
  547 |     await expect(page.getByRole('button', { name: '3D structure', exact: true })).toBeDisabled();
  548 |     await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
  549 |     await page.evaluate(() => (window as any).__bridgeRestoreContext.restoreContext());
  550 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
  551 |     await expect(page.locator('[data-bridge-view-status]')).toContainText('3D is available again');
  552 |     await expect(fallback).toBeFocused();
  553 |     await expect(page.getByRole('button', { name: 'Labelled 2D view', exact: true })).toHaveAttribute('aria-pressed', 'true');
  554 |     await page.getByRole('button', { name: '3D structure', exact: true }).click();
  555 |     await expect(viewer).toBeVisible();
  556 |     await expect(page.locator('[data-bridge-view-status]')).toHaveCount(0);
  557 |     await checkWorkflowHealth(page);
  558 |   });
  559 | 
  560 |   test('view recovery: failed 3D startup keeps the explanation and 2D controls available', async ({ page }) => {
  561 |     await page.goto(`${base}/__harness`);
  562 |     await page.evaluate(() => {
  563 |       (window as any).StemLab.ensureThree = () => Promise.reject(new Error('Test WebGL unavailable'));
  564 |       (window as any).__mount({ tab: 'build', introDismissed: true });
  565 |     });
  566 |     await expect(page.locator('[data-bridge-view-status]')).toBeVisible();
  567 |     await expect(page.locator('[data-bridge-view-status]')).toContainText('all analysis controls remain available');
  568 |     await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
  569 |     await expect(page.getByRole('button', { name: '3D structure', exact: true })).toBeDisabled();
  570 |     await page.getByLabel('Inspect member', { exact: true }).selectOption('BC0');
  571 |     await expect(page.locator('[data-bridge-inspector] [role="status"]')).toContainText('BC0');
  572 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  573 |   });
  574 | 
  575 |   test('view recovery: keyboard orbit and view switching preserve explicit 2D selection', async ({ page }) => {
  576 |     await mountWorkflow(page, 1000);
  577 |     const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
  578 |     await viewer.focus();
  579 |     await viewer.press('ArrowRight');
  580 |     await viewer.press('ArrowUp');
  581 |     await viewer.press('+');
  582 |     const rotated = await page.evaluate(() => (window as any).__bucket());
  583 |     expect(rotated.rot3d).toEqual({ rotY: 34, rotX: 20 });
  584 |     expect(rotated.zoom3d).toBeGreaterThan(1);
  585 |     const twoDimensional = page.getByRole('button', { name: 'Labelled 2D view', exact: true });
  586 |     await twoDimensional.focus();
  587 |     await twoDimensional.press('Enter');
  588 |     await expect(twoDimensional).toBeFocused();
  589 |     await expect(viewer).toHaveAttribute('tabindex', '-1');
  590 |     await expect(page.locator('[data-allo-fs-stage]')).toHaveAttribute('aria-hidden', 'true');
  591 |     await page.evaluate(() => (window as any).__set({ span: 40 }));
  592 |     await expect(twoDimensional).toHaveAttribute('aria-pressed', 'true');
  593 |     await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
  594 |     await checkWorkflowHealth(page);
  595 |   });
  596 | 
  597 |   for (const width of [1000, 320]) {
  598 |     test('bridge landscape: lighting, river views and bounded resources at ' + width + 'px', async ({ page }) => {
  599 |       const warnings: string[] = [];
  600 |       page.on('console', message => { if (message.type() === 'warning' || message.type() === 'error') warnings.push(message.text()); });
  601 |       await mountWorkflow(page, width, { crossSectionMm2: 14500, span: 30 });
  602 |       const stage = page.locator('[data-allo-fs-stage]');
  603 |       await stage.scrollIntoViewIfNeeded();
  604 |       const initial = await page.evaluate(() => (window as any).__gl());
  605 |       expect(initial.shadowsEnabled).toBe(true);
  606 |       expect(initial.landscape).toMatchObject({ trees: 48, ridges: 4, shadowMapSize: 1024 });
  607 |       expect(initial.resources.textures).toBeGreaterThan(0);
  608 |       expect(initial.drawCalls).toBeLessThan(650);
  609 |       expect(initial.triangles).toBeLessThan(40000);
  610 |       await captureImmersiveRegion(page, stage, 'bridge-' + width + '-landscape-orbit.png');
  611 |       for (const span of [10, 80, 30, 60, 30]) {
  612 |         const previousBuild = await page.evaluate(() => (window as any).__gl().sceneBuilds);
  613 |         await page.evaluate(value => (window as any).__set({ span: value }), span);
  614 |         await expect.poll(() => page.evaluate(() => (window as any).__gl().sceneBuilds)).toBeGreaterThan(previousBuild);
  615 |         const resized = await page.evaluate(() => (window as any).__gl());
  616 |         expect(resized.resources.textures).toBe(initial.resources.textures);
  617 |         expect(resized.drawCalls).toBeLessThan(650);
  618 |         expect(resized.triangles).toBeLessThan(40000);
  619 |       }
> 620 |       expect(await page.evaluate(() => (window as any).__gl().resources.geometries)).toBe(initial.resources.geometries);
      |                                                                                      ^ Error: expect(received).toBe(expected) // Object.is equality
  621 |       await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
  622 |       await stage.scrollIntoViewIfNeeded();
  623 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
  624 |       const built = await page.evaluate(() => (window as any).__gl().sceneBuilds);
  625 |       await captureImmersiveRegion(page, stage, 'bridge-' + width + '-landscape-walkway.png');
  626 |       await page.evaluate(() => (window as any).__set({ bridgeWalkPos: 0.5, bridgeLookYaw: 90, bridgeLookPitch: -8 }));
  627 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[2])).toBeGreaterThan(0.9);
  628 |       expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(built);
  629 |       await captureImmersiveRegion(page, stage, 'bridge-' + width + '-landscape-river.png');
  630 |       expect(warnings).toEqual([]);
  631 |       await checkWorkflowHealth(page);
  632 |     });
  633 |   }
  634 | 
  635 |   for (const width of [1000, 390]) {
  636 |     test(`immersive earthquake: walk, inspect energy and preserve static analysis at ${width}px`, async ({ page }) => {
  637 |       await mountWorkflow(page, width, { loadMode: 'vehicle', vehiclePos: 0.35, crossSectionMm2: 14500 });
  638 |       await mkdir(IMMERSIVE_REPORT, { recursive: true });
  639 |       const stage = page.locator('[data-allo-fs-stage]');
  640 |       const inspector = page.locator('[data-bridge-inspector]');
  641 |       const staticBefore = await inspector.textContent();
  642 |       await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
  643 |       await stage.scrollIntoViewIfNeeded();
  644 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
  645 |       const onDeck = await page.evaluate(() => (window as any).__gl());
  646 |       expect(onDeck.roadwayPresent).toBe(true);
  647 |       expect(onDeck.railingsPresent).toBe(true);
  648 |       expect(onDeck.deckEyeHeightM).toBe(1.65);
  649 |       expect(onDeck.cameraDirection[0]).toBeGreaterThan(0.99);
  650 |       const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
  651 |       await viewer.focus();
  652 |       await viewer.press('ArrowUp');
  653 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().bridgeWalkPos)).toBeCloseTo(0.145);
  654 |       await viewer.press('PageUp');
  655 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().bridgeLookPitch)).toBeGreaterThan(0);
  656 |       await viewer.press('Home');
  657 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().bridgeWalkPos)).toBe(0.12);
  658 |       const position = page.getByRole('slider', { name: 'Position on bridge (%)', exact: true });
  659 |       await position.focus();
  660 |       await position.press('ArrowRight');
  661 |       await stage.scrollIntoViewIfNeeded();
  662 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraPosition.x)).toBeGreaterThan(onDeck.cameraPosition.x);
  663 |       const look = page.getByRole('slider', { name: 'Look left or right (°)', exact: true });
  664 |       await look.focus();
  665 |       await look.press('ArrowRight');
  666 |       await stage.scrollIntoViewIfNeeded();
  667 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[2])).toBeGreaterThan(0);
  668 |       await captureImmersiveRegion(page, stage, `bridge-${width}-on-deck.png`);
  669 | 
  670 |       await page.getByRole('checkbox', { name: 'Earthquake experiment', exact: true }).check();
  671 |       const time = page.getByRole('slider', { name: 'Experiment time (s)', exact: true });
  672 |       await time.focus();
  673 |       await time.press('Home');
  674 |       await time.press('PageUp');
  675 |       await time.press('PageUp');
  676 |       await time.press('PageUp');
  677 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(0);
  678 |       const energy = page.locator('[data-bridge-energy]');
  679 |       await expect(energy).toContainText('J/kg');
  680 |       await expect(energy).not.toContainText(/NaN|Infinity|undefined/);
  681 |       await expect(page.locator('[data-bridge-seismic-comparison] tbody tr')).toHaveCount(3);
  682 |       await expect.poll(() => inspector.textContent()).toBe(staticBefore);
  683 |       await stage.scrollIntoViewIfNeeded();
  684 |       await expect.poll(() => page.evaluate(() => Math.abs((window as any).__gl().relativeOffsetM))).toBeGreaterThan(0);
  685 |       const quake = await page.evaluate(() => (window as any).__gl());
  686 |       expect(quake.sceneBuilds).toBe(onDeck.sceneBuilds);
  687 |       expect(quake.deckOffsetM - quake.groundOffsetM).toBeCloseTo(quake.relativeOffsetM, 10);
  688 |       expect(quake.deckOffsetVisualM).toBeCloseTo(quake.deckOffsetM * quake.motionScale, 10);
  689 |       expect(quake.supportEndpoints.length).toBeGreaterThan(0);
  690 |       for (const support of quake.supportEndpoints) {
  691 |         expect(support.top.z - support.base.z).toBeCloseTo(quake.deckOffsetVisualM - quake.groundOffsetVisualM, 8);
  692 |       }
  693 |       expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
  694 |       await captureImmersiveRegion(page, stage, `bridge-${width}-on-deck-earthquake.png`);
  695 |       await captureImmersiveRegion(page, energy, `bridge-${width}-energy.png`);
  696 | 
  697 |       await page.getByRole('button', { name: '3D structure', exact: true }).click();
  698 |       await stage.scrollIntoViewIfNeeded();
  699 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('orbit');
  700 |       await captureImmersiveRegion(page, stage, `bridge-${width}-orbit-earthquake.png`);
  701 |       await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
  702 |       await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
  703 |       await expect.poll(() => inspector.textContent()).toBe(staticBefore);
  704 |       await checkWorkflowHealth(page);
  705 |     });
  706 |   }
  707 | 
  708 |   for (const width of [1000, 320]) {
  709 |     test('earthquake investigation: inspect, save, compare, restore and print at ' + width + 'px', async ({ page }) => {
  710 |       await mkdir(INVESTIGATION_REPORT, { recursive: true });
  711 |       await mountWorkflow(page, width, { seismicEnabled: true, seismicDampingRatio: 0.05 });
  712 |       await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
  713 |       await page.getByRole('button', { name: 'Inspect peak motion', exact: true }).click();
  714 |       const recordedTime = await page.evaluate(() => (window as any).__bucket().seismicTime);
  715 |       expect(recordedTime).toBeGreaterThan(0);
  716 |       expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  717 |       const mechanism = page.locator('[data-bridge-seismic-mechanism]');
  718 |       await expect(mechanism).toContainText('N/kg');
  719 |       const offsets = await mechanism.evaluate(element => ({
  720 |         deck: Number(element.querySelector('[data-seismic-deck-x]')?.getAttribute('data-seismic-deck-x')),
```