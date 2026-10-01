# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> repeat trials preserve both original worlds, chart actual outcomes, save evidence and resume
- Location: tests\e2e\evolab-living-island.spec.ts:801:5

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "
Repeated trials:"
Received string:    "Two futures · seed 2026 · shared start G0 · 5/5 rounds.
Changed condition: habitat. Both climates fixed. Mutation probability: 0.06.
A: Sunlit meadow, trait selection true, G5, population 60. shade mean 46.2/100; fur mean 56.6/100; legs mean 46.3/100.
B: Long winter, trait selection true, G5, population 60. shade mean 52.8/100; fur mean 59.4/100; legs mean 51.0/100.
Identical starting genes and random stream; later random events may diverge. The main expedition was unchanged.\\nRepeated trials: original pair + 5 repeats of the same starting population and fixed conditions, with fresh chance streams. Chance seeds: 266155874, 2920591643, 1280060116, 3934495885, 2293964358, 653432831.\\nshade: B higher 2, A higher 3, within 0.1 point 1, undefined 0. Mean B-A 1.9 points among 6 living pairs.\\nfur: B higher 6, A higher 0, within 0.1 point 0, undefined 0. Mean B-A 20.4 points among 6 living pairs.\\nlegs: B higher 4, A higher 1, within 0.1 point 1, undefined 0. Mean B-A 5.3 points among 6 living pairs.\\nExtinctions: A 0/6, B 0/6. Repeats test chance with one starting population; they are not a significance test or a general conclusion."
```

# Test source

```ts
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
  790 |   await expect(page.locator('.ei-inheritance')).toHaveAttribute('data-inheritance-step', '3');
  791 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  792 |   await page.locator('.ei-inheritance').screenshot({ path: report + '/inheritance-reveal-phone.png', style: '.ei-commandbar,.ei-desk-tabs { position: static !important; }' });
  793 |   await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  794 |   await page.locator('.ei-stage').scrollIntoViewIfNeeded();
  795 |   await page.screenshot({ path: report + '/focused-workspace-phone.png' });
  796 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  797 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-app', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => v.id)))).toEqual([]);
  798 | });
  799 | 
  800 | 
  801 | test('repeat trials preserve both original worlds, chart actual outcomes, save evidence and resume', async ({ page }) => {
  802 |   await page.setViewportSize({ width: 1440, height: 1100 });
  803 |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  804 |   await harness.mount(page, { evoLab: { view: 'livingIsland', evoProgress: { notes: { livingIsland: { text: 'My own field explanation.', at: '2026-09-27T00:00:00Z' } } } } });
  805 |   await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  806 |   await page.getByRole('button', { name: 'Explore two futures', exact: false }).click();
  807 |   await page.getByRole('button', { name: 'Create my two futures', exact: true }).click();
  808 |   await expect(page.locator('.ei-repeat-evidence')).toHaveCount(0);
  809 |   for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Advance both islands', exact: true }).click();
  810 |   const before = await page.evaluate(() => ({ world: localStorage.getItem('evoLab.island.v1'), summary: JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial }));
  811 |   const originalText = await page.locator('.ei-trial-evidence').innerText();
  812 |   const rendererIds = (await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id);
  813 |   await expect(page.locator('.ei-repeat-evidence')).toHaveAttribute('data-repeat-count', '0');
  814 |   for (let i = 1; i <= 5; i++) {
  815 |     await page.getByRole('button', { name: 'Run another 5-round trial', exact: true }).click();
  816 |     await expect(page.locator('.ei-repeat-evidence')).toHaveAttribute('data-repeat-count', String(i));
  817 |   }
  818 |   await expect(page.getByRole('button', { name: 'Five repeats recorded', exact: true })).toBeDisabled();
  819 |   await expect(page.locator('[data-trial-generation]')).toHaveText(['G5', 'G5']);
  820 |   expect(await page.locator('.ei-trial-evidence').innerText()).toBe(originalText);
  821 |   expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(rendererIds);
  822 |   const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial);
  823 |   expect(saved).toMatchObject(before.summary);
  824 |   expect(saved.repeats.runs).toHaveLength(5);
  825 |   const expected = await page.evaluate((summary: any) => (window as any).StemLab.evoIslandRepeats.observe(summary, 'fur'), saved);
  826 |   await expect(page.locator('.ei-repeat-outcome')).toContainText('6 paired trials recorded');
  827 |   await expect(page.locator('.ei-repeat-outcome')).toContainText(expected.higher + ' with B higher');
  828 |   await page.getByText('Read every trial and random seed', { exact: true }).click();
  829 |   await expect(page.locator('.ei-repeat-evidence tbody tr')).toHaveCount(6);
  830 |   for (const run of saved.repeats.runs) await expect(page.locator('.ei-repeat-evidence table')).toContainText(String(run.seed));
  831 |   await page.getByLabel('Compare across trials', { exact: true }).selectOption('legs');
  832 |   const legs = await page.evaluate((summary: any) => (window as any).StemLab.evoIslandRepeats.observe(summary, 'legs'), saved);
  833 |   await expect(page.locator('.ei-repeat-outcome')).toContainText(legs.lower + ' with A higher');
  834 |   await page.locator('.ei-repeat-evidence').screenshot({ path: report + '/repeated-trials-desktop.png' });
  835 |   await page.getByRole('button', { name: 'Save repeated-trial evidence', exact: true }).click();
  836 |   const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  837 |   expect(notes.livingIsland.text).toBe('My own field explanation.');
  838 |   expect(notes.livingIslandComparison.text).toContain('original pair + 5 repeats');
  839 |   expect(notes.livingIslandComparison.text).toContain('Extinctions: A');
  840 |   expect(notes.livingIslandComparison.text.length).toBeLessThan(2000);
> 841 |   expect(notes.livingIslandComparison.text).toContain('\nRepeated trials:');
      |                                             ^ Error: expect(received).toContain(expected) // indexOf
  842 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  843 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-comparison', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  844 |   await page.getByRole('button', { name: 'Return to my island', exact: false }).click();
  845 |   expect(await page.evaluate(() => localStorage.getItem('evoLab.island.v1'))).toBe(before.world);
  846 |   await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  847 |   await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  848 |   await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  849 |   await page.getByText('Your last comparison · saved evidence', { exact: true }).click();
  850 |   await expect(page.locator('.ei-repeat-evidence')).toHaveAttribute('data-repeat-count', '5');
  851 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial)).toEqual(saved);
  852 |   await expect(page.getByRole('button', { name: 'Run another 5-round trial', exact: true })).toHaveCount(0);
  853 |   expect(errors).toEqual([]);
  854 | });
  855 | 
  856 | test('repeat evidence handles early extinction on a phone and survives changing experimental conditions', async ({ page }) => {
  857 |   await page.setViewportSize({ width: 390, height: 844 });
  858 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  859 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  860 |   const world = await page.evaluate(() => {
  861 |     const model = (window as any).StemLab.evoIslandModel, world = model.create(17);
  862 |     world.history[0].population = world.history[0].population.slice(0, 2);
  863 |     world.history[0].stats = model.stats(world.history[0].population); world.nextId = 3; return world;
  864 |   });
  865 |   await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 17, introDismissed: true } } });
  866 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  867 |   await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  868 |   await page.getByRole('button', { name: 'Explore two futures', exact: false }).click();
  869 |   await page.getByRole('button', { name: 'Create my two futures', exact: true }).click();
  870 |   for (let i = 0; i < 5; i++) {
  871 |     const button = page.getByRole('button', { name: 'Advance both islands', exact: true });
  872 |     if (await button.isDisabled()) break;
  873 |     await button.click();
  874 |   }
  875 |   await page.getByRole('button', { name: 'Run another 5-round trial', exact: true }).click();
  876 |   await page.getByRole('button', { name: 'Run another 5-round trial', exact: true }).click();
  877 |   await expect(page.locator('.ei-repeat-outcome')).toContainText('extinction');
  878 |   await page.getByText('Read every trial and random seed', { exact: true }).click();
  879 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  880 |   await page.locator('.ei-repeat-evidence').screenshot({ path: report + '/repeated-trials-phone-extinction.png' });
  881 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  882 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-repeat-evidence', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => v.id)))).toEqual([]);
  883 |   await page.getByRole('button', { name: 'Try another condition', exact: true }).click();
  884 |   await page.selectOption('#ei-trial-factor', 'selection');
  885 |   await page.getByRole('button', { name: 'Create my two futures', exact: true }).click();
  886 |   await expect(page.locator('.ei-repeat-evidence')).toHaveCount(0);
  887 |   await page.getByRole('button', { name: 'Advance both islands', exact: true }).click();
  888 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial.repeats)).toBeUndefined();
  889 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  890 | });
  891 | 
```