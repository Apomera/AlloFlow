# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> field desk keeps one island renderer, supports keyboard tabs and leaves evolution unchanged
- Location: tests\e2e\evolab-living-island.spec.ts:684:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  locator('[data-island-scene]')
Expected: "ready"
Received: "fallback"
Timeout:  15000ms

Call log:
  - Expect "toHaveAttribute" with timeout 15000ms
  - waiting for locator('[data-island-scene]')
    21 × locator resolved to <div role="group" class="ei-scene" data-island-scene="fallback" aria-label="Living Island habitat. Use the organism selector below to inspect any creature.">…</div>
       - unexpected value "fallback"

```

```yaml
- group "Living Island habitat. Use the organism selector below to inspect any creature.":
  - paragraph: Habitat map · 3D is unavailable on this device. All experiments and family records still work.
  - button "Inspect Spriglet 1": "1"
  - button "Inspect Spriglet 2": "2"
  - button "Inspect Spriglet 3": "3"
  - button "Inspect Spriglet 4": "4"
  - button "Inspect Spriglet 5": "5"
  - button "Inspect Spriglet 6": "6"
  - button "Inspect Spriglet 7": "7"
  - button "Inspect Spriglet 8": "8"
  - button "Inspect Spriglet 9": "9"
  - button "Inspect Spriglet 10": "10"
  - button "Inspect Spriglet 11": "11"
  - button "Inspect Spriglet 12": "12"
  - button "Inspect Spriglet 13": "13"
  - button "Inspect Spriglet 14": "14"
  - button "Inspect Spriglet 15": "15"
  - button "Inspect Spriglet 16": "16"
  - button "Inspect Spriglet 17": "17"
  - button "Inspect Spriglet 18": "18"
  - button "Inspect Spriglet 19": "19"
  - button "Inspect Spriglet 20": "20"
  - button "Inspect Spriglet 21": "21"
  - button "Inspect Spriglet 22": "22"
  - button "Inspect Spriglet 23": "23"
  - button "Inspect Spriglet 24": "24"
  - button "Inspect Spriglet 25": "25"
  - button "Inspect Spriglet 26": "26"
  - button "Inspect Spriglet 27": "27"
  - button "Inspect Spriglet 28": "28"
  - button "Inspect Spriglet 29": "29"
  - button "Inspect Spriglet 30": "30"
  - button "Inspect Spriglet 31": "31"
  - button "Inspect Spriglet 32": "32"
  - button "Inspect Spriglet 33": "33"
  - button "Inspect Spriglet 34": "34"
  - button "Inspect Spriglet 35": "35"
  - button "Inspect Spriglet 36": "36"
```

# Test source

```ts
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
> 689 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'ready');
      |                                                     ^ Error: expect(locator).toHaveAttribute(expected) failed
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
  709 |   expect(canvas!.y).toBeGreaterThanOrEqual(0); expect(canvas!.y + canvas!.height).toBeLessThan(1100);
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
  732 |   await page.getByRole('button', { name: 'Trace this birth', exact: true }).click();
  733 |   await expect(page.locator('.ei-inheritance')).toBeFocused();
  734 |   await page.getByLabel('Trait to trace', { exact: true }).selectOption(trait);
  735 |   const reveal = page.locator('.ei-inheritance');
  736 |   await expect(reveal).toHaveAttribute('data-inheritance-step', '0');
  737 |   await page.getByRole('button', { name: 'Next inheritance step', exact: true }).click();
  738 |   for (let i = 0; i < 2; i++) {
  739 |     await expect(page.locator('[data-inherit-copy="' + i + ':' + child.inheritance[trait][i].copy + '"]')).toHaveAttribute('data-chosen', 'true');
  740 |     const parent = world.history[0].population.find((o: any) => o.id === child.parents[i]);
  741 |     await expect(page.locator('[data-inherit-value="' + i + '"]')).toHaveText((parent.genes[trait][child.inheritance[trait][i].copy] * 100).toFixed(2));
  742 |   }
  743 |   await page.getByRole('button', { name: 'Next inheritance step', exact: true }).click();
  744 |   await expect(page.locator('.ei-inherit-mutated')).toHaveCount(child.inheritance[trait].filter((r: any) => r.delta !== null).length);
  745 |   for (let i = 0; i < 2; i++) await expect(page.locator('[data-inherit-value="' + i + '"]')).toHaveText((child.genes[trait][i] * 100).toFixed(2));
  746 |   await page.getByRole('button', { name: 'Next inheritance step', exact: true }).click();
  747 |   await expect(page.locator('.ei-inherit-child')).toContainText(((child.genes[trait][0] + child.genes[trait][1]) * 50).toFixed(2));
  748 |   for (let i = 0; i < 2; i++) await expect(reveal.getByText('Parent ' + (i + 1) + ' · #' + child.parents[i], { exact: true })).toBeVisible();
  749 |   await page.locator('.ei-inherit-child').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
  750 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  751 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-inheritance', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  752 |   await reveal.screenshot({ path: report + '/inheritance-reveal-desktop.png', style: '.ei-commandbar,.ei-workspace > .ei-main,.ei-desk { position: static !important; } .ei-desk-body,.ei-workspace > .ei-main { max-height: none !important; overflow: visible !important; }' });
  753 |   await page.getByRole('button', { name: 'Watch inheritance', exact: true }).click();
  754 |   await expect(reveal).toHaveAttribute('data-inheritance-step', '1', { timeout: 6000 });
  755 |   await page.getByRole('button', { name: 'Pause inheritance', exact: true }).click();
  756 |   await page.waitForTimeout(2400);
  757 |   await expect(reveal).toHaveAttribute('data-inheritance-step', '1');
  758 |   await page.getByRole('button', { name: 'Watch inheritance', exact: true }).click();
  759 |   await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  760 |   await expect(page.getByRole('button', { name: 'Watch inheritance', exact: true })).toBeVisible();
  761 |   await page.evaluate(() => { delete (document as any).hidden; document.dispatchEvent(new Event('visibilitychange')); });
  762 |   await page.waitForTimeout(2400);
  763 |   await expect(reveal).toHaveAttribute('data-inheritance-step', '0');
  764 |   await page.getByRole('button', { name: 'Watch inheritance', exact: true }).click();
  765 |   await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  766 |   await page.waitForTimeout(2400);
  767 |   await page.getByRole('tab', { name: 'Families', exact: true }).click();
  768 |   await expect(reveal).toHaveAttribute('data-inheritance-step', '0');
  769 |   await expect(page.getByRole('button', { name: 'Watch inheritance', exact: true })).toBeVisible();
  770 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.v1')!))).toEqual(world);
  771 |   // A saved birth without detailed provenance must not claim to know its random choices.
  772 |   world.history.forEach((f: any) => f.population.forEach((o: any) => delete o.inheritance));
  773 |   await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 2026, selectedId: child.id, introDismissed: true } } });
  774 |   await page.getByRole('tab', { name: 'Families', exact: true }).click();
  775 |   await expect(reveal).toContainText('exact choices and mutation events are unknown');
  776 |   await expect(page.getByRole('button', { name: 'Watch inheritance', exact: true })).toHaveCount(0);
  777 |   await expect(page.locator('[data-chosen="true"]')).toHaveCount(0);
  778 | });
  779 | 
  780 | test('phone inheritance is self paced, accessible and does not overflow with reduced motion', async ({ page }) => {
  781 |   await page.setViewportSize({ width: 390, height: 844 });
  782 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  783 |   await harness.mount(page, { evoLab: { view: 'livingIsland', islandStudy: { seed: 2026, introDismissed: true } } });
  784 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  785 |   await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  786 |   await page.selectOption('#ei-organism', '37');
  787 |   await page.getByRole('button', { name: 'Trace this birth', exact: true }).click();
  788 |   for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next inheritance step', exact: true }).click();
  789 |   expect(await page.locator('.ei-inherit-child').evaluate(el => getComputedStyle(el).animationName)).toBe('none');
```