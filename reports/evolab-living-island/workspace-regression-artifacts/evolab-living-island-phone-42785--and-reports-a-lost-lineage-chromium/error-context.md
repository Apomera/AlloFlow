# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> phone family journey stays usable across long histories and reports a lost lineage
- Location: tests\e2e\evolab-living-island.spec.ts:536:5

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 590
Received:   659.65625
```

# Test source

```ts
  442 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'parents');
  443 |   await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  444 |   await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  445 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '2');
  446 |   await page.waitForTimeout(3500);
  447 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring');
  448 |   const expected = await page.evaluate((saved: string) => JSON.stringify((window as any).StemLab.evoIslandModel.step(JSON.parse(saved))), original!);
  449 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(expected);
  450 | });
  451 | 
  452 | test('generation stories keep the recorded habitat after a pending change and close without advancing', async ({ page }) => {
  453 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  454 |   await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  455 |   await page.getByRole('button', { name: 'Long winter', exact: false }).click();
  456 |   await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  457 |   await page.getByText('Experiment settings', { exact: true }).click();
  458 |   await page.getByLabel('Traits affect survival', { exact: false }).uncheck();
  459 |   const original = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  460 |   const frame = JSON.parse(original!).history[1];
  461 |   expect(frame.habitat).toBe('meadow'); expect(frame.selection).toBe(true);
  462 |   await expect(page.locator('.ei-stage-top')).toContainText('Long winter');
  463 |   await expect(page.locator('.ei-pressure')).toContainText('Trait-neutral survival');
  464 |   await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  465 |   await expect(page.locator('.ei-stage-top')).toContainText('Sunlit meadow');
  466 |   await expect(page.locator('.ei-pressure')).not.toContainText('Trait-neutral survival');
  467 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring', { timeout: 11000 });
  468 |   await expect(page.locator('[data-island-phase]')).toHaveText('Replay · recorded offspring');
  469 |   await expect(page.locator('.ei-stage-top')).toContainText('Sunlit meadow');
  470 |   await page.getByRole('button', { name: 'Close generation story', exact: true }).click();
  471 |   await expect(page.getByRole('button', { name: 'Watch generation story', exact: true })).toBeFocused();
  472 |   await expect(page.locator('.ei-story-chapter')).toHaveCount(0);
  473 |   await expect(page.locator('.ei-stage-top')).toContainText('Long winter');
  474 |   await expect(page.locator('.ei-pressure')).toContainText('Trait-neutral survival');
  475 |   await expect(page.locator('[data-island-phase]')).toHaveText('Present day');
  476 |   await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  477 |   await page.getByRole('button', { name: 'Close generation story', exact: true }).click();
  478 |   await page.waitForTimeout(3500);
  479 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring');
  480 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(original);
  481 | });
  482 | 
  483 | 
  484 | test('first discovery brings the island forward and follows a real family without changing history', async ({ page }) => {
  485 |   await page.setViewportSize({ width: 1440, height: 1100 });
  486 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  487 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  488 |   expect((await page.locator('.ei-scene').boundingBox())!.y).toBeLessThan(530);
  489 |   await page.screenshot({ path: report + '/first-discovery-desktop.png' });
  490 |   const original = await page.evaluate(() => JSON.stringify((window as any).StemLab.evoIslandModel.create(2026)));
  491 |   await page.getByRole('button', { name: 'Meet a spriglet', exact: true }).click();
  492 |   await expect(page.locator('#ei-organism')).toHaveValue('1');
  493 |   await expect(page.locator('[data-discovery-step]')).toHaveAttribute('data-discovery-step', '1');
  494 |   await page.getByRole('button', { name: 'Follow this spriglet', exact: true }).click();
  495 |   await expect(page.locator('[data-discovery-step]')).toHaveAttribute('data-discovery-step', '2');
  496 |   const initialStudy = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!));
  497 |   expect(initialStudy.trackedId).toBe(1);
  498 |   await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  499 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  500 |   const expected = await page.evaluate((saved: string) => JSON.stringify((window as any).StemLab.evoIslandModel.step(JSON.parse(saved))), original);
  501 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(expected);
  502 |   await page.getByRole('button', { name: 'Read the family story', exact: true }).click();
  503 |   await expect(page.locator('.ei-family-journey')).toBeFocused();
  504 |   const descendants = JSON.parse(expected).history[1].population.filter((o: any) => o.parents.includes(1));
  505 |   await expect(page.locator('[data-family-result]')).toContainText('G1 · ' + descendants.length + ' / ');
  506 |   await expect(page.locator('.ei-family-relative')).toContainText('#' + descendants[0].id);
  507 |   await page.getByRole('button', { name: 'Meet another family member', exact: true }).click();
  508 |   await expect(page.locator('.ei-family-relative')).toContainText('#' + descendants[1].id);
  509 |   await page.getByRole('button', { name: 'Find on the island', exact: true }).click();
  510 |   await expect(page.locator('.ei-stage')).toBeFocused();
  511 |   await expect(page.locator('#ei-organism')).toHaveValue(String(descendants[1].id));
  512 |   await page.locator('.ei-family-journey').screenshot({ path: report + '/family-journey.png' });
  513 |   await page.getByRole('button', { name: 'Revisit the ancestor', exact: true }).click();
  514 |   await expect(page.locator('#ei-organism')).toHaveValue('1');
  515 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  516 |   await expect(page.getByRole('button', { name: 'Next generation', exact: false })).toBeDisabled();
  517 |   await page.getByRole('button', { name: 'Next family generation', exact: true }).click();
  518 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  519 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(expected);
  520 |   await page.getByRole('button', { name: 'Explore freely', exact: true }).click();
  521 |   await expect(page.getByRole('button', { name: 'Your first discovery', exact: true })).toBeFocused();
  522 |   await page.getByRole('button', { name: 'Choose a question', exact: true }).click();
  523 |   await expect(page.locator('.ei-investigations')).toBeFocused();
  524 |   await page.getByRole('button', { name: 'Two futures', exact: true }).click();
  525 |   await expect(page.locator('.ei-trial-launch')).toBeFocused();
  526 |   await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  527 |   await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  528 |   await expect(page.locator('[data-discovery-step]')).toHaveCount(0);
  529 |   await page.getByRole('button', { name: 'Your first discovery', exact: true }).click();
  530 |   await expect(page.locator('[data-discovery-step]')).toBeFocused();
  531 |   await expect(page.locator('[data-discovery-step]')).toHaveAttribute('data-discovery-step', '3');
  532 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  533 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }))))).toEqual([]);
  534 | });
  535 | 
  536 | test('phone family journey stays usable across long histories and reports a lost lineage', async ({ page }) => {
  537 |   await page.setViewportSize({ width: 390, height: 844 });
  538 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  539 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  540 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  541 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
> 542 |   expect((await page.locator('.ei-scene').boundingBox())!.y).toBeLessThan(590);
      |                                                              ^ Error: expect(received).toBeLessThan(expected)
  543 |   await page.screenshot({ path: report + '/first-discovery-phone.png' });
  544 |   const world = await page.evaluate(() => {
  545 |     const model = (window as any).StemLab.evoIslandModel;
  546 |     let world = model.create(2026);
  547 |     for (let i = 0; i < 12; i++) world = model.step(world);
  548 |     return world;
  549 |   });
  550 |   const lost = world.history[0].population.find((o: any) => !world.history[1].population.some((c: any) => c.parents.includes(o.id)));
  551 |   await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: world.seed, trackedId: lost.id, introDismissed: true } } });
  552 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  553 |   await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'ended');
  554 |   await expect(page.locator('[data-family-result]')).toContainText('Other families still live');
  555 |   await expect(page.locator('.ei-family-timeline button')).toHaveCount(5);
  556 |   await page.getByRole('tab', { name: 'Families', exact: true }).click();
  557 |   await page.getByRole('button', { name: 'Previous family generation', exact: true }).click();
  558 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '11');
  559 |   await page.getByRole('button', { name: 'Revisit the ancestor', exact: true }).click();
  560 |   await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'ancestor');
  561 |   await page.getByRole('button', { name: 'Visit family in generation 1', exact: false }).click();
  562 |   await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'ended');
  563 |   await page.getByText('Read the complete family record', { exact: true }).click();
  564 |   await expect(page.locator('.ei-family-record tbody tr')).toHaveCount(13);
  565 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  566 |   await page.locator('.ei-family-journey').screenshot({ path: report + '/family-journey-phone.png' });
  567 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  568 | });
  569 | 
  570 | 
  571 | test('generation field reports reveal actual shifts and mutated offspring without rewriting evidence', async ({ page }) => {
  572 |   await page.setViewportSize({ width: 1440, height: 1100 });
  573 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  574 |   await expect(page.locator('.ei-field-report')).toHaveCount(0);
  575 |   await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  576 |   const original = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  577 |   const data = await page.evaluate(() => {
  578 |     const w = window as any, world = JSON.parse(localStorage.getItem('evoLab.island.v1')!);
  579 |     return w.StemLab.evoIslandObservation.briefing(world, 1);
  580 |   });
  581 |   await expect(page.locator('.ei-report-flow strong')).toHaveText([String(data.parents), String(data.survivors), String(data.offspring)]);
  582 |   await expect(page.locator('.ei-report-announcement')).toHaveAttribute('role', 'status');
  583 |   await expect(page.locator('.ei-report-announcement')).toHaveAttribute('aria-live', 'polite');
  584 |   await expect(page.locator('.ei-report-announcement')).toContainText(data.survivors + ' / ' + data.parents);
  585 |   await expect(page.locator('.ei-report-variant')).toContainText('#' + data.variant.id);
  586 |   await expect(page.locator('.ei-report-variant')).toContainText(data.variant.mutations + ' recorded allele mutations');
  587 |   await page.locator('.ei-field-report').screenshot({ path: report + '/generation-field-report.png' });
  588 |   await page.getByRole('button', { name: 'Long winter', exact: false }).click();
  589 |   await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  590 |   await page.getByText('Experiment settings', { exact: true }).click();
  591 |   await page.getByLabel('Traits affect survival', { exact: false }).uncheck();
  592 |   const queued = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  593 |   await expect(page.locator('.ei-report-habitat')).toHaveText('Recorded habitat: Sunlit meadow');
  594 |   await expect(page.locator('.ei-field-report')).toContainText('One generation alone does not establish adaptation.');
  595 |   await page.getByRole('button', { name: 'Investigate this shift', exact: true }).click();
  596 |   await expect(page.locator('#ei-lens')).toHaveValue(data.strongest.trait);
  597 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'survivors');
  598 |   await expect(page.locator('.ei-stage')).toBeFocused();
  599 |   await expect(page.locator('.ei-stage-top')).toContainText('Sunlit meadow');
  600 |   await page.getByRole('button', { name: 'Meet this offspring', exact: true }).click();
  601 |   await expect(page.locator('#ei-organism')).toHaveValue(String(data.variant.id));
  602 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring');
  603 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(queued);
  604 |   expect(JSON.parse(queued!).history).toEqual(JSON.parse(original!).history);
  605 |   await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  606 |   await expect(page.locator('.ei-report-habitat')).toHaveText('Recorded habitat: Sunlit meadow → Long winter');
  607 |   await expect(page.locator('.ei-field-report')).toContainText('Trait advantages were off in this round.');
  608 |   const expected = await page.evaluate((saved: string) => (window as any).StemLab.evoIslandModel.step(JSON.parse(saved)), queued!);
  609 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!))).toEqual(expected);
  610 |   await page.setViewportSize({ width: 390, height: 844 });
  611 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  612 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  613 |   await page.locator('.ei-field-report').screenshot({ path: report + '/generation-field-report-phone.png' });
  614 |   await page.getByRole('button', { name: 'Play evolution', exact: false }).click();
  615 |   await expect(page.locator('.ei-report-announcement')).toHaveAttribute('aria-live', 'off');
  616 |   await page.getByRole('button', { name: 'Pause evolution', exact: false }).click();
  617 |   await expect(page.locator('.ei-report-announcement')).toHaveAttribute('aria-live', 'polite');
  618 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  619 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }))))).toEqual([]);
  620 | });
  621 | 
  622 | test('seasonal atmosphere reuses buffers, freezes with pause and reduced motion, and leaves biology unchanged', async ({ page }) => {
  623 |   const errors: string[] = [];
  624 |   page.on('pageerror', e => errors.push(e.message));
  625 |   page.on('console', msg => { if (msg.type() === 'error' && /shader|webgl/i.test(msg.text())) errors.push(msg.text()); });
  626 |   await page.setViewportSize({ width: 1440, height: 1100 });
  627 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  628 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  629 |   const read = () => page.evaluate(() => {
  630 |     const w = window as any, scene = w.__glRecorder.records.find((r: any) => r.scene && r.canvas.isConnected).scene;
  631 |     const weather = scene.getObjectByName('Island seasonal atmosphere'), water = scene.getObjectByName('Shallow coastal water');
  632 |     if (!w.__weatherTracked) {
  633 |       w.__weatherTracked = true; w.__weatherBuffer = weather.geometry.attributes.position; w.__weatherDisposed = [];
  634 |       weather.geometry.addEventListener('dispose', () => w.__weatherDisposed.push('geometry'));
  635 |       weather.material.addEventListener('dispose', () => w.__weatherDisposed.push('material'));
  636 |       weather.material.map.addEventListener('dispose', () => w.__weatherDisposed.push('texture'));
  637 |     }
  638 |     return { count: weather.geometry.drawRange.count, capacity: weather.geometry.attributes.position.count, visible: weather.visible,
  639 |       positions: Array.from(weather.geometry.attributes.position.array), color: weather.material.color.getHexString(), geometry: weather.geometry.uuid,
  640 |       sameBuffer: weather.geometry.attributes.position === w.__weatherBuffer,
  641 |       shoreSamples: water.geometry.attributes.islandDepth.count, waterVertices: water.geometry.attributes.position.count };
  642 |   });
```