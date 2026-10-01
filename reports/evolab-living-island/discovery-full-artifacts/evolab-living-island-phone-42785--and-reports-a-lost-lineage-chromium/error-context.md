# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> phone family journey stays usable across long histories and reports a lost lineage
- Location: tests\e2e\evolab-living-island.spec.ts:517:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
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
  466 |   await page.setViewportSize({ width: 1440, height: 1100 });
  467 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  468 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  469 |   expect((await page.locator('.ei-scene').boundingBox())!.y).toBeLessThan(530);
  470 |   await page.screenshot({ path: report + '/first-discovery-desktop.png' });
  471 |   const original = await page.evaluate(() => JSON.stringify((window as any).StemLab.evoIslandModel.create(2026)));
  472 |   await page.getByRole('button', { name: 'Meet a spriglet', exact: true }).click();
  473 |   await expect(page.locator('#ei-organism')).toHaveValue('1');
  474 |   await expect(page.locator('[data-discovery-step]')).toHaveAttribute('data-discovery-step', '1');
  475 |   await page.getByRole('button', { name: 'Follow this spriglet', exact: true }).click();
  476 |   await expect(page.locator('[data-discovery-step]')).toHaveAttribute('data-discovery-step', '2');
  477 |   const initialStudy = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!));
  478 |   expect(initialStudy.trackedId).toBe(1);
  479 |   await page.getByRole('button', { name: 'Advance one generation', exact: true }).click();
  480 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  481 |   const expected = await page.evaluate((saved: string) => JSON.stringify((window as any).StemLab.evoIslandModel.step(JSON.parse(saved))), original);
  482 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(expected);
  483 |   await page.getByRole('button', { name: 'Read the family story', exact: true }).click();
  484 |   await expect(page.locator('.ei-family-journey')).toBeFocused();
  485 |   const descendants = JSON.parse(expected).history[1].population.filter((o: any) => o.parents.includes(1));
  486 |   await expect(page.locator('[data-family-result]')).toContainText('G1 · ' + descendants.length + ' / ');
  487 |   await expect(page.locator('.ei-family-relative')).toContainText('#' + descendants[0].id);
  488 |   await page.getByRole('button', { name: 'Meet another family member', exact: true }).click();
  489 |   await expect(page.locator('.ei-family-relative')).toContainText('#' + descendants[1].id);
  490 |   await page.getByRole('button', { name: 'Find on the island', exact: true }).click();
  491 |   await expect(page.locator('.ei-stage')).toBeFocused();
  492 |   await expect(page.locator('#ei-organism')).toHaveValue(String(descendants[1].id));
  493 |   await page.locator('.ei-family-journey').screenshot({ path: report + '/family-journey.png' });
  494 |   await page.getByRole('button', { name: 'Revisit the ancestor', exact: true }).click();
  495 |   await expect(page.locator('#ei-organism')).toHaveValue('1');
  496 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  497 |   await expect(page.getByRole('button', { name: 'Next generation', exact: false })).toBeDisabled();
  498 |   await page.getByRole('button', { name: 'Next family generation', exact: true }).click();
  499 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '1');
  500 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(expected);
  501 |   await page.getByRole('button', { name: 'Explore freely', exact: true }).click();
  502 |   await expect(page.getByRole('button', { name: 'Your first discovery', exact: true })).toBeFocused();
  503 |   await page.getByRole('button', { name: 'Choose a question', exact: true }).click();
  504 |   await expect(page.locator('.ei-investigations')).toBeFocused();
  505 |   await page.getByRole('button', { name: 'Two futures', exact: true }).click();
  506 |   await expect(page.locator('.ei-trial-launch')).toBeFocused();
  507 |   await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  508 |   await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  509 |   await expect(page.locator('[data-discovery-step]')).toHaveCount(0);
  510 |   await page.getByRole('button', { name: 'Your first discovery', exact: true }).click();
  511 |   await expect(page.locator('[data-discovery-step]')).toBeFocused();
  512 |   await expect(page.locator('[data-discovery-step]')).toHaveAttribute('data-discovery-step', '3');
  513 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  514 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, summary: n.failureSummary })) }))))).toEqual([]);
  515 | });
  516 | 
  517 | test('phone family journey stays usable across long histories and reports a lost lineage', async ({ page }) => {
  518 |   await page.setViewportSize({ width: 390, height: 844 });
  519 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  520 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  521 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  522 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  523 |   expect((await page.locator('.ei-scene').boundingBox())!.y).toBeLessThan(590);
  524 |   await page.screenshot({ path: report + '/first-discovery-phone.png' });
  525 |   const world = await page.evaluate(() => {
  526 |     const model = (window as any).StemLab.evoIslandModel;
  527 |     let world = model.create(2026);
  528 |     for (let i = 0; i < 12; i++) world = model.step(world);
  529 |     return world;
  530 |   });
  531 |   const lost = world.history[0].population.find((o: any) => !world.history[1].population.some((c: any) => c.parents.includes(o.id)));
  532 |   await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: world.seed, trackedId: lost.id, introDismissed: true } } });
  533 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  534 |   await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'ended');
  535 |   await expect(page.locator('[data-family-result]')).toContainText('Other families still live');
  536 |   await expect(page.locator('.ei-family-timeline button')).toHaveCount(5);
  537 |   await page.getByRole('button', { name: 'Previous family generation', exact: true }).click();
  538 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '11');
  539 |   await page.getByRole('button', { name: 'Revisit the ancestor', exact: true }).click();
  540 |   await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'ancestor');
  541 |   await page.getByRole('button', { name: 'Visit family in generation 1', exact: false }).click();
  542 |   await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'ended');
  543 |   await page.getByText('Read the complete family record', { exact: true }).click();
  544 |   await expect(page.locator('.ei-family-record tbody tr')).toHaveCount(13);
> 545 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      |                                                                                                    ^ Error: expect(received).toBe(expected) // Object.is equality
  546 |   await page.locator('.ei-family-journey').screenshot({ path: report + '/family-journey-phone.png' });
  547 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  548 | });
  549 | 
```