# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> field desk keeps one island renderer, supports keyboard tabs and leaves evolution unchanged
- Location: tests\e2e\evolab-living-island.spec.ts:684:5

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 0
Received:    -266.015625
```

# Test source

```ts
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
  643 |   const first = await read();
  644 |   expect(first.count).toBe(26); expect(first.capacity).toBe(180);
  645 |   expect(first.shoreSamples).toBe(first.waterVertices);
  646 |   await page.getByRole('button', { name: 'Long winter', exact: false }).click();
  647 |   const winter = await read();
  648 |   expect(winter.count).toBe(180); expect(winter.geometry).toBe(first.geometry); expect(winter.sameBuffer).toBe(true); expect(winter.color).not.toBe(first.color);
  649 |   await page.locator('.ei-stage-wrap').screenshot({ path: report + '/winter-atmosphere.png' });
  650 |   const original = await page.evaluate(() => localStorage.getItem('evoLab.island.v1'));
  651 |   await page.getByLabel('Animate wildlife while paused', { exact: false }).check();
  652 |   await page.waitForTimeout(300);
  653 |   expect((await read()).positions).not.toEqual(winter.positions);
  654 |   await page.getByLabel('Animate wildlife while paused', { exact: false }).uncheck();
  655 |   const paused = await read(); await page.waitForTimeout(350);
  656 |   expect((await read()).positions).toEqual(paused.positions);
  657 |   await page.getByLabel('Animate wildlife while paused', { exact: false }).check();
  658 |   await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  659 |   const hidden = await read(); await page.waitForTimeout(350);
  660 |   expect((await read()).positions).toEqual(hidden.positions);
  661 |   await page.evaluate(() => { delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange')); });
  662 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  663 |   await expect(page.getByText('Your reduced-motion preference keeps the habitat still.', { exact: true })).toBeVisible();
  664 |   const reduced = await read(); await page.waitForTimeout(350);
  665 |   expect((await read()).positions).toEqual(reduced.positions);
  666 |   await page.selectOption('#ei-organism', '1');
  667 |   await page.getByRole('button', { name: 'Creature close-up', exact: true }).click();
  668 |   expect((await read()).visible).toBe(false);
  669 |   await page.getByRole('button', { name: 'Island overview', exact: true }).click();
  670 |   expect((await read()).visible).toBe(true);
  671 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(original);
  672 |   await page.getByRole('button', { name: 'Dry season', exact: false }).click();
  673 |   const dry = await read(); expect(dry.count).toBe(75); expect(dry.sameBuffer).toBe(true);
  674 |   await page.locator('.ei-stage-wrap').screenshot({ path: report + '/dry-atmosphere.png' });
  675 |   const changed = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!));
  676 |   expect(changed.history).toEqual(JSON.parse(original!).history);
  677 |   expect(changed.rng).toBe(JSON.parse(original!).rng);
  678 |   await page.evaluate(() => (window as any).__unmount());
  679 |   expect(await page.evaluate(() => (window as any).__weatherDisposed.sort())).toEqual(['geometry', 'material', 'texture']);
  680 |   expect(errors).toEqual([]);
  681 | });
  682 | 
  683 | 
  684 | test('field desk keeps one island renderer, supports keyboard tabs and leaves evolution unchanged', async ({ page }) => {
  685 |   const errors: string[] = [];
  686 |   page.on('pageerror', e => errors.push(e.message));
  687 |   await page.setViewportSize({ width: 1440, height: 1100 });
  688 |   await harness.mount(page, { evoLab: { view: 'livingIsland', islandStudy: { seed: 2026, introDismissed: true } } });
  689 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
  690 |   await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  691 |   const world = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!));
  692 |   await page.selectOption('#ei-organism', String(world.history[1].population[0].id));
  693 |   const renderer = (await harness.glContexts(page)).find(r => r.connected)!.id;
  694 |   await page.getByRole('tab', { name: 'Explore', exact: true }).focus();
  695 |   await page.keyboard.press('ArrowRight');
  696 |   await expect(page.getByRole('tab', { name: 'Families', exact: true })).toBeFocused();
  697 |   await expect(page.locator('#ei-panel-families')).toBeVisible();
  698 |   await expect(page.locator('#ei-panel-explore')).toBeHidden();
  699 |   await page.keyboard.press('End');
  700 |   await expect(page.getByRole('tab', { name: 'Evidence', exact: true })).toBeFocused();
  701 |   await expect(page.locator('.ei-replay')).toBeVisible();
  702 |   await page.keyboard.press('Home');
  703 |   await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toBeFocused();
  704 |   await page.getByRole('button', { name: 'Explore this family & inheritance', exact: true }).click();
  705 |   await expect(page.locator('.ei-inheritance')).toBeVisible();
  706 |   await page.locator('.ei-desk-body').evaluate(el => { el.scrollTop = el.scrollHeight; });
  707 |   const canvas = await page.locator('.ei-scene').boundingBox();
  708 |   const transport = await page.getByRole('button', { name: 'Next generation', exact: false }).boundingBox();
> 709 |   expect(canvas!.y).toBeGreaterThanOrEqual(0); expect(canvas!.y + canvas!.height).toBeLessThan(1100);
      |                     ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  710 |   expect(transport!.y).toBeGreaterThanOrEqual(0); expect(transport!.y + transport!.height).toBeLessThan(1100);
  711 |   expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual([renderer]);
  712 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!))).toEqual(world);
  713 |   await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  714 |   await page.locator('.ei-desk-body').evaluate(el => { el.scrollTop = 0; });
  715 |   await page.screenshot({ path: report + '/focused-workspace-desktop.png' });
  716 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  717 |   for (const tab of ['Explore', 'Families', 'Investigate', 'Evidence']) {
  718 |     await page.getByRole('tab', { name: tab, exact: true }).click();
  719 |     expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  720 |   }
  721 |   expect(errors).toEqual([]);
  722 | });
  723 | 
  724 | test('inheritance reveal shows recorded choices, mutations and trait averages without drawing new genes', async ({ page }) => {
  725 |   await page.setViewportSize({ width: 1440, height: 1100 });
  726 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  727 |   await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  728 |   const world = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!));
  729 |   const child = world.history[1].population.find((o: any) => o.mutations > 0);
  730 |   const trait = ['shade', 'fur', 'legs'].find(k => child.inheritance[k].some((r: any) => r.delta !== null))!;
  731 |   await page.selectOption('#ei-organism', String(child.id));
  732 |   await page.getByRole('button', { name: 'Explore this family & inheritance', exact: true }).click();
  733 |   await page.getByLabel('Trait to trace', { exact: true }).selectOption(trait);
  734 |   const reveal = page.locator('.ei-inheritance');
  735 |   await expect(reveal).toHaveAttribute('data-inheritance-step', '0');
  736 |   await page.getByRole('button', { name: 'Next inheritance step', exact: true }).click();
  737 |   for (let i = 0; i < 2; i++) {
  738 |     await expect(page.locator('[data-inherit-copy="' + i + ':' + child.inheritance[trait][i].copy + '"]')).toHaveAttribute('data-chosen', 'true');
  739 |     const parent = world.history[0].population.find((o: any) => o.id === child.parents[i]);
  740 |     await expect(page.locator('[data-inherit-value="' + i + '"]')).toHaveText((parent.genes[trait][child.inheritance[trait][i].copy] * 100).toFixed(2));
  741 |   }
  742 |   await page.getByRole('button', { name: 'Next inheritance step', exact: true }).click();
  743 |   await expect(page.locator('.ei-inherit-mutated')).toHaveCount(child.inheritance[trait].filter((r: any) => r.delta !== null).length);
  744 |   for (let i = 0; i < 2; i++) await expect(page.locator('[data-inherit-value="' + i + '"]')).toHaveText((child.genes[trait][i] * 100).toFixed(2));
  745 |   await page.getByRole('button', { name: 'Next inheritance step', exact: true }).click();
  746 |   await expect(page.locator('.ei-inherit-child')).toContainText(((child.genes[trait][0] + child.genes[trait][1]) * 50).toFixed(2));
  747 |   await reveal.screenshot({ path: report + '/inheritance-reveal-desktop.png', style: '.ei-commandbar,.ei-workspace > .ei-main,.ei-desk { position: static !important; } .ei-desk-body { max-height: none !important; }' });
  748 |   await page.getByRole('button', { name: 'Watch inheritance', exact: true }).click();
  749 |   await expect(reveal).toHaveAttribute('data-inheritance-step', '1', { timeout: 6000 });
  750 |   await page.getByRole('button', { name: 'Pause inheritance', exact: true }).click();
  751 |   await page.waitForTimeout(2400);
  752 |   await expect(reveal).toHaveAttribute('data-inheritance-step', '1');
  753 |   await page.getByRole('button', { name: 'Watch inheritance', exact: true }).click();
  754 |   await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  755 |   await page.waitForTimeout(2400);
  756 |   await page.getByRole('tab', { name: 'Families', exact: true }).click();
  757 |   await expect(reveal).toHaveAttribute('data-inheritance-step', '0');
  758 |   await expect(page.getByRole('button', { name: 'Watch inheritance', exact: true })).toBeVisible();
  759 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!))).toEqual(world);
  760 |   // A saved birth without detailed provenance must not claim to know its random choices.
  761 |   world.history.forEach((f: any) => f.population.forEach((o: any) => delete o.inheritance));
  762 |   await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 2026, selectedId: child.id, introDismissed: true } } });
  763 |   await page.getByRole('tab', { name: 'Families', exact: true }).click();
  764 |   await expect(reveal).toContainText('exact choices and mutation events are unknown');
  765 |   await expect(page.getByRole('button', { name: 'Watch inheritance', exact: true })).toHaveCount(0);
  766 |   await expect(page.locator('[data-chosen="true"]')).toHaveCount(0);
  767 | });
  768 | 
  769 | test('phone inheritance is self paced, accessible and does not overflow with reduced motion', async ({ page }) => {
  770 |   await page.setViewportSize({ width: 390, height: 844 });
  771 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  772 |   await harness.mount(page, { evoLab: { view: 'livingIsland', islandStudy: { seed: 2026, introDismissed: true } } });
  773 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  774 |   await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  775 |   await page.selectOption('#ei-organism', '37');
  776 |   await page.getByRole('button', { name: 'Explore this family & inheritance', exact: true }).click();
  777 |   for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next inheritance step', exact: true }).click();
  778 |   expect(await page.locator('.ei-inherit-child').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
  779 |   await expect(page.locator('.ei-inheritance')).toHaveAttribute('data-inheritance-step', '3');
  780 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  781 |   await page.locator('.ei-inheritance').screenshot({ path: report + '/inheritance-reveal-phone.png', style: '.ei-commandbar,.ei-desk-tabs { position: static !important; }' });
  782 |   await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  783 |   await page.locator('.ei-stage').scrollIntoViewIfNeeded();
  784 |   await page.screenshot({ path: report + '/focused-workspace-phone.png' });
  785 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  786 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => v.id)))).toEqual([]);
  787 | });
  788 | 
```