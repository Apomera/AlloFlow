# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> first discovery brings the island forward and follows a real family without changing history
- Location: tests\e2e\evolab-living-island.spec.ts:465:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 14

- Array []
+ Array [
+   Object {
+     "id": "color-contrast",
+     "nodes": Array [
+       Object {
+         "summary": "Fix any of the following:
+   Element has insufficient color contrast of 4.45 (foreground color: #547264, background color: #e7eedc, font size: 7.5pt (10px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "target": Array [
+           ".ei-intro-copy > div > .ei-kicker",
+         ],
+       },
+     ],
+   },
+ ]
```

# Test source

```ts
  407 |   await expect(page.locator('.ei-story-chapter')).toContainText('36 individuals');
  408 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'survivors', { timeout: 7000 });
  409 |   await page.getByRole('button', { name: 'Pause generation story', exact: true }).click();
  410 |   await page.waitForTimeout(3500);
  411 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'survivors');
  412 |   await expect(page.locator('.ei-story-chapter')).toContainText(world.history[1].survivors.length + ' individuals');
  413 |   await page.locator('.ei-stage').screenshot({ path: report + '/generation-story-survivors.png' });
  414 |   await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  415 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring', { timeout: 11000 });
  416 |   await expect(page.getByRole('button', { name: 'Watch generation story', exact: true })).toBeVisible();
  417 |   await expect(page.locator('.ei-story-chapter')).toContainText(world.history[1].population.length + ' individuals');
  418 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(original);
  419 |   await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  420 |   await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  421 |   await expect(page.getByRole('button', { name: 'Watch generation story', exact: true })).toBeVisible();
  422 |   await page.evaluate(() => { delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange')); });
  423 |   await page.waitForTimeout(3500);
  424 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'parents');
  425 |   await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  426 |   await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  427 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '2');
  428 |   await page.waitForTimeout(3500);
  429 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring');
  430 |   const expected = await page.evaluate((saved: string) => JSON.stringify((window as any).StemLab.evoIslandModel.step(JSON.parse(saved))), original!);
  431 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(expected);
  432 | });
  433 | 
  434 | test('generation stories keep the recorded habitat after a pending change and close without advancing', async ({ page }) => {
  435 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  436 |   await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  437 |   await page.getByRole('button', { name: 'Long winter', exact: false }).click();
  438 |   await page.getByText('Experiment settings', { exact: true }).click();
  439 |   await page.getByLabel('Traits affect survival', { exact: false }).uncheck();
  440 |   const original = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  441 |   const frame = JSON.parse(original!).history[1];
  442 |   expect(frame.habitat).toBe('meadow'); expect(frame.selection).toBe(true);
  443 |   await expect(page.locator('.ei-stage-top')).toContainText('Long winter');
  444 |   await expect(page.locator('.ei-pressure')).toContainText('Trait-neutral survival');
  445 |   await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  446 |   await expect(page.locator('.ei-stage-top')).toContainText('Sunlit meadow');
  447 |   await expect(page.locator('.ei-pressure')).not.toContainText('Trait-neutral survival');
  448 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring', { timeout: 11000 });
  449 |   await expect(page.locator('[data-island-phase]')).toHaveText('Replay · recorded offspring');
  450 |   await expect(page.locator('.ei-stage-top')).toContainText('Sunlit meadow');
  451 |   await page.getByRole('button', { name: 'Close generation story', exact: true }).click();
  452 |   await expect(page.getByRole('button', { name: 'Watch generation story', exact: true })).toBeFocused();
  453 |   await expect(page.locator('.ei-story-chapter')).toHaveCount(0);
  454 |   await expect(page.locator('.ei-stage-top')).toContainText('Long winter');
  455 |   await expect(page.locator('.ei-pressure')).toContainText('Trait-neutral survival');
  456 |   await expect(page.locator('[data-island-phase]')).toHaveText('Present day');
  457 |   await page.getByRole('button', { name: 'Watch generation story', exact: true }).click();
  458 |   await page.getByRole('button', { name: 'Close generation story', exact: true }).click();
  459 |   await page.waitForTimeout(3500);
  460 |   await expect(page.locator('[data-island-phase]')).toHaveAttribute('data-island-phase', 'offspring');
  461 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(original);
  462 | });
  463 | 
  464 | 
  465 | test('first discovery brings the island forward and follows a real family without changing history', async ({ page }) => {
  466 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  467 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  468 |   expect((await page.locator('.ei-scene').boundingBox())!.y).toBeLessThan(530);
  469 |   await page.screenshot({ path: report + '/first-discovery-desktop.png' });
  470 |   const original = await page.evaluate(() => JSON.stringify((window as any).StemLab.evoIslandModel.create(2026)));
  471 |   await page.getByRole('button', { name: 'Meet a spriglet', exact: true }).click();
  472 |   await expect(page.locator('#ei-organism')).toHaveValue('1');
  473 |   await expect(page.locator('[data-discovery-step]')).toHaveAttribute('data-discovery-step', '1');
  474 |   await page.getByRole('button', { name: 'Follow this spriglet', exact: true }).click();
  475 |   await expect(page.locator('[data-discovery-step]')).toHaveAttribute('data-discovery-step', '2');
  476 |   const initialStudy = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!));
  477 |   expect(initialStudy.trackedId).toBe(1);
  478 |   await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  479 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  480 |   const expected = await page.evaluate((saved: string) => JSON.stringify((window as any).StemLab.evoIslandModel.step(JSON.parse(saved))), original);
  481 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(expected);
  482 |   await page.getByRole('button', { name: 'Read the family story', exact: true }).click();
  483 |   await expect(page.locator('.ei-family-journey')).toBeFocused();
  484 |   const descendants = JSON.parse(expected).history[1].population.filter((o: any) => o.parents.includes(1));
  485 |   await expect(page.locator('[data-family-result]')).toContainText('G1 · ' + descendants.length + ' / ');
  486 |   await page.locator('.ei-family-journey').screenshot({ path: report + '/family-journey.png' });
  487 |   await page.getByRole('button', { name: 'Revisit the ancestor', exact: true }).click();
  488 |   await expect(page.locator('#ei-organism')).toHaveValue('1');
  489 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  490 |   await expect(page.getByRole('button', { name: 'Next generation', exact: false })).toBeDisabled();
  491 |   await page.getByRole('button', { name: 'Next family generation', exact: true }).click();
  492 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  493 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(expected);
  494 |   await page.getByRole('button', { name: 'Explore freely', exact: true }).click();
  495 |   await expect(page.getByRole('button', { name: 'Your first discovery', exact: true })).toBeFocused();
  496 |   await page.getByRole('button', { name: 'Choose a question', exact: true }).click();
  497 |   await expect(page.locator('.ei-investigations')).toBeFocused();
  498 |   await page.getByRole('button', { name: 'Two futures', exact: true }).click();
  499 |   await expect(page.locator('.ei-trial-launch')).toBeFocused();
  500 |   await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  501 |   await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  502 |   await expect(page.locator('[data-discovery-step]')).toHaveCount(0);
  503 |   await page.getByRole('button', { name: 'Your first discovery', exact: true }).click();
  504 |   await expect(page.locator('[data-discovery-step]')).toBeFocused();
  505 |   await expect(page.locator('[data-discovery-step]')).toHaveAttribute('data-discovery-step', '3');
  506 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
> 507 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }))))).toEqual([]);
      |                                                                                                                                                                                                                                                                                                          ^ Error: expect(received).toEqual(expected) // deep equality
  508 | });
  509 | 
  510 | test('phone family journey stays usable across long histories and reports a lost lineage', async ({ page }) => {
  511 |   await page.setViewportSize({ width: 390, height: 844 });
  512 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  513 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  514 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  515 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  516 |   expect((await page.locator('.ei-scene').boundingBox())!.y).toBeLessThan(590);
  517 |   await page.screenshot({ path: report + '/first-discovery-phone.png' });
  518 |   const world = await page.evaluate(() => {
  519 |     const model = (window as any).StemLab.evoIslandModel;
  520 |     let world = model.create(2026);
  521 |     for (let i = 0; i < 12; i++) world = model.step(world);
  522 |     return world;
  523 |   });
  524 |   const lost = world.history[0].population.find((o: any) => !world.history[1].population.some((c: any) => c.parents.includes(o.id)));
  525 |   await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: world.seed, trackedId: lost.id, introDismissed: true } } });
  526 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  527 |   await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'ended');
  528 |   await expect(page.locator('[data-family-result]')).toContainText('Other families still live');
  529 |   await expect(page.locator('.ei-family-timeline button')).toHaveCount(5);
  530 |   await page.getByRole('button', { name: 'Previous family generation', exact: true }).click();
  531 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '11');
  532 |   await page.getByRole('button', { name: 'Revisit the ancestor', exact: true }).click();
  533 |   await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'ancestor');
  534 |   await page.getByRole('button', { name: 'Visit family in generation 1', exact: false }).click();
  535 |   await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'ended');
  536 |   await page.getByText('Read the complete family record', { exact: true }).click();
  537 |   await expect(page.locator('.ei-family-record tbody tr')).toHaveCount(13);
  538 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  539 |   await page.locator('.ei-family-journey').screenshot({ path: report + '/family-journey-phone.png' });
  540 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  541 | });
  542 | 
```