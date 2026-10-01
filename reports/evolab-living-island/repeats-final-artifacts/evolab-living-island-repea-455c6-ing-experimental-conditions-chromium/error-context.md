# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> repeat evidence handles early extinction on a phone and survives changing experimental conditions
- Location: tests\e2e\evolab-living-island.spec.ts:856:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "scrollable-region-focusable",
+ ]
```

# Test source

```ts
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
  841 |   expect(notes.livingIslandComparison.text).toContain('\nRepeated trials:');
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
> 882 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-repeat-evidence', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => v.id)))).toEqual([]);
      |                                                                                                                                                                                                                         ^ Error: expect(received).toEqual(expected) // deep equality
  883 |   await page.getByRole('button', { name: 'Return to my island', exact: false }).click();
  884 |   await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  885 |   await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  886 |   await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
  887 |   await page.getByText('Your last comparison · saved evidence', { exact: true }).click();
  888 |   await expect(page.locator('.ei-repeat-evidence')).toHaveAttribute('data-repeat-count', '2');
  889 |   await page.getByRole('button', { name: 'Run another 5-round trial', exact: true }).click();
  890 |   await expect(page.locator('.ei-repeat-evidence')).toHaveAttribute('data-repeat-count', '3');
  891 |   const resumed = await page.evaluate(() => {
  892 |     const w = window as any, s = JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial;
  893 |     return { actual: s.repeats.runs[2], expected: w.StemLab.evoIslandRepeats.run(w.__toolData.evoLab.island, s, s.repeats.rng, 3) };
  894 |   });
  895 |   expect(resumed.actual).toEqual(resumed.expected);
  896 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  897 |   await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  898 |   await page.getByRole('button', { name: 'Explore two futures', exact: false }).click();
  899 |   await page.selectOption('#ei-trial-factor', 'selection');
  900 |   await page.getByRole('button', { name: 'Create my two futures', exact: true }).click();
  901 |   await expect(page.locator('.ei-repeat-evidence')).toHaveCount(0);
  902 |   await page.getByRole('button', { name: 'Advance both islands', exact: true }).click();
  903 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).lastTrial.repeats)).toBeUndefined();
  904 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  905 | });
  906 | 
```