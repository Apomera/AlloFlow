# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> immersive earthquake: walk, inspect energy and preserve static analysis at 1000px
- Location: tests\e2e\26-bridgelab-gl.spec.ts:583:9

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('[data-bridge-inspector]')
Timeout: 15000ms
- Expected  - 28
+ Received  +  1

- Choose a member to inspect its force and margin. In the labelled 2D view, its identifier marks the same member. Positive forces pull; negative forces compress.
-
- Inspect member
- BC0 · B0 → B1
- BC1 · B1 → B2
- BC2 · B2 → B3
- BC3 · B3 → B4
- TC0 · T0 → T1
- TC1 · T1 → T2
- TC2 · T2 → T3
- DL0 · B0 → T0
- DR0 · T0 → B1
- DL1 · B1 → T1
- DR1 · T1 → B2
- DL2 · B2 → T2
- DR2 · T2 → B3
- DL3 · B3 → T3
- DR3 · T3 → B4
- TC1 · Compression · -131.25 kN
- Member length: 7.50 m · Stress: 9.05 MPa
- Governing safety factor: 4.68
- Buckling length: 7.50 m
-
- Run “Test all positions” to see this member’s largest tension and compression during the crossing.
-
- Support balance: 97.50 + 52.50 = 150.00 kN total applied load.
-
- All member forces
+ Choose a member to inspect its force and margin. In the labelled 2D view, its identifier marks the same member. Positive forces pull; negative forces compress.Inspect memberBC0 · B0 → B1BC1 · B1 → B2BC2 · B2 → B3BC3 · B3 → B4TC0 · T0 → T1TC1 · T1 → T2TC2 · T2 → T3DL0 · B0 → T0DR0 · T0 → B1DL1 · B1 → T1DR1 · T1 → B2DL2 · B2 → T2DR2 · T2 → B3DL3 · B3 → T3DR3 · T3 → B4TC1 · Compression · -131.25 kNMember length: 7.50 m · Stress: 9.05 MPaGoverning safety factor: 4.68Buckling length: 7.50 mRun “Test all positions” to see this member’s largest tension and compression during the crossing.Support balance: 97.50 + 52.50 = 150.00 kN total applied load.All member forcesOne truss plane. SF is the smaller strength or buckling margin.MemberForce (kN)ActionLength (m)SFBC060.94Tension7.5083.28BC1164.06Tension7.5030.93BC298.44Tension7.5051.56BC332.81Tension7.50154.67TC0-112.50Compression7.505.47TC1-131.25Compression7.504.68TC2-65.63Compression7.509.37DL0-114.98Compression7.086.01DR097.29Tension7.0852.16DL1-97.29Compression7.087.10DR1-61.91Compression7.0811.16DL261.91Tension7.0881.97DR2-61.91Compression7.0811.16DL361.91Tension7.0881.97DR3-61.91Compression7.0811.16

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('[data-bridge-inspector]')
    33 × locator resolved to <div data-bridge-inspector="true">…</div>
       - unexpected value "Choose a member to inspect its force and margin. In the labelled 2D view, its identifier marks the same member. Positive forces pull; negative forces compress.Inspect memberBC0 · B0 → B1BC1 · B1 → B2BC2 · B2 → B3BC3 · B3 → B4TC0 · T0 → T1TC1 · T1 → T2TC2 · T2 → T3DL0 · B0 → T0DR0 · T0 → B1DL1 · B1 → T1DR1 · T1 → B2DL2 · B2 → T2DR2 · T2 → B3DL3 · B3 → T3DR3 · T3 → B4TC1 · Compression · -131.25 kNMember length: 7.50 m · Stress: 9.05 MPaGoverning safety factor: 4.68Buckling length: 7.50 mRun “Test all positions” to see this member’s largest tension and compression during the crossing.Support balance: 97.50 + 52.50 = 150.00 kN total applied load.All member forcesOne truss plane. SF is the smaller strength or buckling margin.MemberForce (kN)ActionLength (m)SFBC060.94Tension7.5083.28BC1164.06Tension7.5030.93BC298.44Tension7.5051.56BC332.81Tension7.50154.67TC0-112.50Compression7.505.47TC1-131.25Compression7.504.68TC2-65.63Compression7.509.37DL0-114.98Compression7.086.01DR097.29Tension7.0852.16DL1-97.29Compression7.087.10DR1-61.91Compression7.0811.16DL261.91Tension7.0881.97DR2-61.91Compression7.0811.16DL361.91Tension7.0881.97DR3-61.91Compression7.0811.16"

```

```yaml
- paragraph: Choose a member to inspect its force and margin. In the labelled 2D view, its identifier marks the same member. Positive forces pull; negative forces compress.
- text: Inspect member
- combobox "Inspect member":
  - option "BC0 · B0 → B1"
  - option "BC1 · B1 → B2"
  - option "BC2 · B2 → B3"
  - option "BC3 · B3 → B4"
  - option "TC0 · T0 → T1"
  - option "TC1 · T1 → T2" [selected]
  - option "TC2 · T2 → T3"
  - option "DL0 · B0 → T0"
  - option "DR0 · T0 → B1"
  - option "DL1 · B1 → T1"
  - option "DR1 · T1 → B2"
  - option "DL2 · B2 → T2"
  - option "DR2 · T2 → B3"
  - option "DL3 · B3 → T3"
  - option "DR3 · T3 → B4"
- status:
  - strong: TC1 · Compression · -131.25 kN
  - text: "Member length: 7.50 m · Stress: 9.05 MPa Governing safety factor: 4.68 Buckling length: 7.50 m"
- paragraph: Run “Test all positions” to see this member’s largest tension and compression during the crossing.
- paragraph: "Support balance: 97.50 + 52.50 = 150.00 kN total applied load."
- group: All member forces
```

# Test source

```ts
  521 |       const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  522 |       const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  523 |       const extension = context?.getExtension('WEBGL_lose_context');
  524 |       if (!extension) throw new Error('Chromium did not expose WEBGL_lose_context');
  525 |       (window as any).__bridgeRestoreContext = extension;
  526 |       extension.loseContext();
  527 |     });
  528 |     const fallback = page.locator('[data-bridge-elevation]');
  529 |     await expect(page.locator('[data-bridge-view-status]')).toBeVisible();
  530 |     await expect(page.locator('[data-bridge-view-status]')).toContainText('3D is unavailable');
  531 |     await expect(fallback).toBeFocused();
  532 |     await expect(page.getByRole('button', { name: '3D structure', exact: true })).toBeDisabled();
  533 |     await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
  534 |     await page.evaluate(() => (window as any).__bridgeRestoreContext.restoreContext());
  535 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
  536 |     await expect(page.locator('[data-bridge-view-status]')).toContainText('3D is available again');
  537 |     await expect(fallback).toBeFocused();
  538 |     await expect(page.getByRole('button', { name: 'Labelled 2D view', exact: true })).toHaveAttribute('aria-pressed', 'true');
  539 |     await page.getByRole('button', { name: '3D structure', exact: true }).click();
  540 |     await expect(viewer).toBeVisible();
  541 |     await expect(page.locator('[data-bridge-view-status]')).toHaveCount(0);
  542 |     await checkWorkflowHealth(page);
  543 |   });
  544 | 
  545 |   test('view recovery: failed 3D startup keeps the explanation and 2D controls available', async ({ page }) => {
  546 |     await page.goto(`${base}/__harness`);
  547 |     await page.evaluate(() => {
  548 |       (window as any).StemLab.ensureThree = () => Promise.reject(new Error('Test WebGL unavailable'));
  549 |       (window as any).__mount({ tab: 'build', introDismissed: true });
  550 |     });
  551 |     await expect(page.locator('[data-bridge-view-status]')).toBeVisible();
  552 |     await expect(page.locator('[data-bridge-view-status]')).toContainText('all analysis controls remain available');
  553 |     await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
  554 |     await expect(page.getByRole('button', { name: '3D structure', exact: true })).toBeDisabled();
  555 |     await page.getByLabel('Inspect member', { exact: true }).selectOption('BC0');
  556 |     await expect(page.locator('[data-bridge-inspector] [role="status"]')).toContainText('BC0');
  557 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  558 |   });
  559 | 
  560 |   test('view recovery: keyboard orbit and view switching preserve explicit 2D selection', async ({ page }) => {
  561 |     await mountWorkflow(page, 1000);
  562 |     const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
  563 |     await viewer.focus();
  564 |     await viewer.press('ArrowRight');
  565 |     await viewer.press('ArrowUp');
  566 |     await viewer.press('+');
  567 |     const rotated = await page.evaluate(() => (window as any).__bucket());
  568 |     expect(rotated.rot3d).toEqual({ rotY: 34, rotX: 20 });
  569 |     expect(rotated.zoom3d).toBeGreaterThan(1);
  570 |     const twoDimensional = page.getByRole('button', { name: 'Labelled 2D view', exact: true });
  571 |     await twoDimensional.focus();
  572 |     await twoDimensional.press('Enter');
  573 |     await expect(twoDimensional).toBeFocused();
  574 |     await expect(viewer).toHaveAttribute('tabindex', '-1');
  575 |     await expect(page.locator('[data-allo-fs-stage]')).toHaveAttribute('aria-hidden', 'true');
  576 |     await page.evaluate(() => (window as any).__set({ span: 40 }));
  577 |     await expect(twoDimensional).toHaveAttribute('aria-pressed', 'true');
  578 |     await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
  579 |     await checkWorkflowHealth(page);
  580 |   });
  581 | 
  582 |   for (const width of [1000, 390]) {
  583 |     test(`immersive earthquake: walk, inspect energy and preserve static analysis at ${width}px`, async ({ page }) => {
  584 |       await mountWorkflow(page, width, { loadMode: 'vehicle', vehiclePos: 0.35, crossSectionMm2: 14500 });
  585 |       await mkdir(IMMERSIVE_REPORT, { recursive: true });
  586 |       const stage = page.locator('[data-allo-fs-stage]');
  587 |       const inspector = page.locator('[data-bridge-inspector]');
  588 |       const staticBefore = await inspector.innerText();
  589 |       await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
  590 |       await stage.scrollIntoViewIfNeeded();
  591 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
  592 |       const onDeck = await page.evaluate(() => (window as any).__gl());
  593 |       expect(onDeck.roadwayPresent).toBe(true);
  594 |       expect(onDeck.railingsPresent).toBe(true);
  595 |       expect(onDeck.deckEyeHeightM).toBe(1.65);
  596 |       expect(onDeck.cameraDirection[0]).toBeGreaterThan(0.99);
  597 |       const position = page.getByRole('slider', { name: 'Position on bridge (%)', exact: true });
  598 |       await position.focus();
  599 |       await position.press('ArrowRight');
  600 |       await stage.scrollIntoViewIfNeeded();
  601 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraPosition.x)).toBeGreaterThan(onDeck.cameraPosition.x);
  602 |       const look = page.getByRole('slider', { name: 'Look left or right (°)', exact: true });
  603 |       await look.focus();
  604 |       await look.press('ArrowRight');
  605 |       await stage.scrollIntoViewIfNeeded();
  606 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraDirection[2])).toBeGreaterThan(0);
  607 |       await stage.screenshot({ path: join(IMMERSIVE_REPORT, `bridge-${width}-on-deck.png`) });
  608 | 
  609 |       await page.getByRole('checkbox', { name: 'Earthquake experiment', exact: true }).check();
  610 |       const time = page.getByRole('slider', { name: 'Experiment time (s)', exact: true });
  611 |       await time.focus();
  612 |       await time.press('Home');
  613 |       await time.press('PageUp');
  614 |       await time.press('PageUp');
  615 |       await time.press('PageUp');
  616 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(0);
  617 |       const energy = page.locator('[data-bridge-energy]');
  618 |       await expect(energy).toContainText('J/kg');
  619 |       await expect(energy).not.toContainText(/NaN|Infinity|undefined/);
  620 |       await expect(page.locator('[data-bridge-seismic-comparison] tbody tr')).toHaveCount(3);
> 621 |       await expect(inspector).toHaveText(staticBefore);
      |                               ^ Error: expect(locator).toHaveText(expected) failed
  622 |       await stage.scrollIntoViewIfNeeded();
  623 |       await expect.poll(() => page.evaluate(() => Math.abs((window as any).__gl().relativeOffsetM))).toBeGreaterThan(0);
  624 |       const quake = await page.evaluate(() => (window as any).__gl());
  625 |       expect(quake.sceneBuilds).toBe(onDeck.sceneBuilds);
  626 |       expect(quake.deckOffsetM - quake.groundOffsetM).toBeCloseTo(quake.relativeOffsetM, 10);
  627 |       expect(quake.deckOffsetVisualM).toBeCloseTo(quake.deckOffsetM * quake.motionScale, 10);
  628 |       expect(quake.supportEndpoints.length).toBeGreaterThan(0);
  629 |       for (const support of quake.supportEndpoints) {
  630 |         expect(support.top.z - support.base.z).toBeCloseTo(quake.deckOffsetVisualM - quake.groundOffsetVisualM, 8);
  631 |       }
  632 |       expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
  633 |       await stage.screenshot({ path: join(IMMERSIVE_REPORT, `bridge-${width}-on-deck-earthquake.png`) });
  634 |       const originalViewport = page.viewportSize()!;
  635 |       if (width > 640) await page.setViewportSize({ width, height: 1800 });
  636 |       await energy.scrollIntoViewIfNeeded();
  637 |       await energy.screenshot({ path: join(IMMERSIVE_REPORT, `bridge-${width}-energy.png`) });
  638 |       await page.setViewportSize(originalViewport);
  639 | 
  640 |       await page.getByRole('button', { name: '3D structure', exact: true }).click();
  641 |       await stage.scrollIntoViewIfNeeded();
  642 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('orbit');
  643 |       await stage.screenshot({ path: join(IMMERSIVE_REPORT, `bridge-${width}-orbit-earthquake.png`) });
  644 |       await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
  645 |       await expect(page.getByRole('img', { name: /^Warren truss diagram/ })).toBeVisible();
  646 |       await expect(inspector).toHaveText(staticBefore);
  647 |       await checkWorkflowHealth(page);
  648 |     });
  649 |   }
  650 | 
  651 |   test('immersive earthquake: playback requires consent and reduced motion keeps deliberate stepping available', async ({ page }) => {
  652 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  653 |     await mountWorkflow(page, 1000, { bridgeView: 'immersive', seismicEnabled: true, seismicPlaying: true, seismicTime: 6 });
  654 |     await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  655 |     await page.waitForTimeout(150);
  656 |     expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(6);
  657 |     const step = page.getByRole('button', { name: 'Step forward 0.5 s', exact: true });
  658 |     await step.focus();
  659 |     await step.press('Enter');
  660 |     await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(6.5);
  661 |     await page.emulateMedia({ reducedMotion: 'no-preference' });
  662 |     await page.getByRole('button', { name: 'Run earthquake', exact: true }).click();
  663 |     await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(6.5);
  664 |     await page.getByRole('button', { name: 'Pause earthquake', exact: true }).click();
  665 |     const paused = await page.evaluate(() => (window as any).__bucket().seismicTime);
  666 |     await page.waitForTimeout(150);
  667 |     expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(paused);
  668 |     await page.getByRole('button', { name: 'Run earthquake', exact: true }).click();
  669 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  670 |     await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  671 |     await expect(step).toBeEnabled();
  672 |     await checkWorkflowHealth(page);
  673 |   });
  674 | });
  675 | 
```