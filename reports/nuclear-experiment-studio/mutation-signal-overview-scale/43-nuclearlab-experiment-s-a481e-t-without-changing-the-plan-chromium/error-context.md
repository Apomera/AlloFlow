# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> signal detective compares both effects on one scale and inspects a saved test without changing the plan
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:864:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('[data-ns-case-overview-chart]').locator('[data-ns-case-effect="unshielded"] > strong')
Expected: "25.0%"
Received: "100.0%"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('[data-ns-case-overview-chart]').locator('[data-ns-case-effect="unshielded"] > strong')
    33 × locator resolved to <strong>100.0%</strong>
       - unexpected value "100.0%"

```

```yaml
- strong: 100.0%
```

# Test source

```ts
  776 |   await expect(feedback).toContainText('The detector stayed at 2 m.');
  777 |   await choices.getByRole('button', { name: 'Shield only', exact: true }).click();
  778 |   await expect(check.locator('summary')).toBeFocused();
  779 |   await expect(check.locator('summary')).toHaveText('✓ Shielding changed');
  780 |   await expect(feedback).toContainText('separate the shielding effect');
  781 |   await expect(page.locator('[data-ns-case-evidence] > p')).toHaveText('2 of 2 separate effects checked');
  782 |   await expect(page.locator('[data-ns-reflection="investigation"]')).toHaveCount(0);
  783 |   current = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  784 |   expect(current.nkStudio.investigation.noticing).toEqual({ both: 'both', closer: 'distance', unshielded: 'shield' });
  785 |   expect(current.nkStudio.investigation.solved).toBeUndefined();
  786 |   expect(current.nkStudio.investigation.reflection).toBe(original.nkStudio.investigation.reflection);
  787 |   expect(current.nkStudio.completed).toEqual(original.nkStudio.completed);
  788 |   expect(current.nkStudio.counting).toEqual(original.nkStudio.counting);
  789 |   expect(current.nkStudio.nucleus).toEqual(original.nkStudio.nucleus);
  790 |   await page.screenshot({ path: output + '/signal-noticing-desktop.png', fullPage: true });
  791 |   await audit(page);
  792 |   await page.getByRole('combobox', { name: 'Review a saved test', exact: true }).selectOption('both');
  793 |   await expect(check.locator('summary')).toHaveText('✓ Both changed together');
  794 |   await expect(check).not.toHaveAttribute('open');
  795 |   await page.getByRole('button', { name: 'Back to introductions' }).click();
  796 |   await page.locator('.ns-case-entry > summary').click();
  797 |   await page.getByRole('button', { name: 'Resume the signal mystery' }).click();
  798 |   await expect(check.locator('summary')).toHaveText('✓ Both changed together');
  799 |   expect((await page.evaluate(() => (window as any).__toolData._nuclearLab)).nkStudio.investigation.noticing).toEqual(current.nkStudio.investigation.noticing);
  800 |   expect(errors).toEqual([]);
  801 | });
  802 | 
  803 | test('signal detective comparison checks fit at 320px and fold back to visible keyboard focus in forced colors', async ({ page }) => {
  804 |   const errors: string[] = [];
  805 |   page.on('pageerror', error => errors.push(error.message));
  806 |   await page.setViewportSize({ width: 320, height: 844 });
  807 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  808 |   await mount(page, { nkView: 'investigate', nkLargeText: true, nkReduceMotion: true, nkStudio: { investigation: { prediction: 'both', selected: 'both', runs: ['closer'], review: 'closer', reflection: 'Keep this note.' } } });
  809 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  810 |   await page.getByRole('button', { name: 'Review saved evidence', exact: true }).click();
  811 |   const check = page.locator('[data-ns-case-check]');
  812 |   const feedback = page.locator('[data-ns-case-check-feedback]');
  813 |   const choices = page.getByRole('group', { name: 'From the mystery setup (2 m, 2 cm lead), what changed?', exact: true });
  814 |   const summary = check.locator('summary');
  815 |   await expect(check).not.toHaveAttribute('open');
  816 |   await summary.focus(); await page.keyboard.press('Enter');
  817 |   const shield = choices.getByRole('button', { name: 'Shield only', exact: true });
  818 |   const distance = choices.getByRole('button', { name: 'Distance only', exact: true });
  819 |   await shield.focus(); await page.keyboard.press('Enter');
  820 |   await expect(feedback).toHaveAttribute('data-ns-case-check-feedback', 'retry');
  821 |   await expect(shield).toBeFocused();
  822 |   await expect(shield).toHaveCSS('outline-style', 'solid');
  823 |   for (const button of await choices.getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  824 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  825 |   await page.screenshot({ path: output + '/signal-noticing-mobile-retry-light.png' });
  826 |   await audit(page);
  827 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  828 |   await distance.focus(); await page.keyboard.press('Enter');
  829 |   await expect(feedback).toHaveAttribute('data-ns-case-check-feedback', 'correct');
  830 |   await expect(summary).toBeFocused();
  831 |   await expect(summary).toBeInViewport({ ratio: 1 });
  832 |   await expect(summary).toHaveCSS('outline-style', 'solid');
  833 |   await expect(summary).toHaveCSS('color', 'rgb(0, 0, 0)');
  834 |   await expect(check).not.toHaveAttribute('open');
  835 |   await expect(page.locator('[data-ns-case-evidence] > p')).toHaveText('1 of 2 separate effects checked');
  836 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  837 |   await page.screenshot({ path: output + '/signal-noticing-mobile-correct-forced.png' });
  838 |   await page.keyboard.press('Enter');
  839 |   await expect(distance).toHaveAttribute('aria-pressed', 'true');
  840 |   await expect(distance).toHaveCSS('outline-style', 'solid');
  841 |   await distance.focus(); await page.keyboard.press('Enter');
  842 |   await expect(summary).toBeFocused();
  843 |   await expect(check).not.toHaveAttribute('open');
  844 |   await page.getByRole('button', { name: 'Run this comparison' }).click();
  845 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('100.0%');
  846 |   await expect(check).toHaveAttribute('data-ns-case-check', 'both');
  847 |   await expect(feedback).toHaveAttribute('data-ns-case-check-feedback', 'waiting');
  848 |   await summary.focus(); await page.keyboard.press('Enter');
  849 |   await choices.getByRole('button', { name: 'Distance + shield', exact: true }).click();
  850 |   await expect(summary).toBeFocused();
  851 |   await expect(summary).toHaveText('✓ Both changed together');
  852 |   await expect(feedback).toContainText('cannot show each effect separately');
  853 |   await expect(page.locator('[data-ns-case-evidence] > p')).toHaveText('1 of 2 separate effects checked');
  854 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  855 |   const state = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.investigation);
  856 |   expect(state.noticing).toEqual({ closer: 'distance', both: 'both' });
  857 |   expect(state.runs).toEqual(['closer', 'both']);
  858 |   expect(state.reflection).toBe('Keep this note.');
  859 |   expect(state.solved).toBeUndefined();
  860 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  861 |   expect(errors).toEqual([]);
  862 | });
  863 | 
  864 | test('signal detective compares both effects on one scale and inspects a saved test without changing the plan', async ({ page }) => {
  865 |   const errors: string[] = [];
  866 |   page.on('pageerror', error => errors.push(error.message));
  867 |   await page.setViewportSize({ width: 1100, height: 1000 });
  868 |   await mount(page, { nkView: 'investigate', nkStudio: { completed: ['distance'], counting: { runs: [1, 4] }, nucleus: { reflection: 'Keep this too.' }, investigation: { prediction: 'both', selected: 'both', runs: ['closer', 'unshielded', 'both'], review: 'both', noticing: { closer: 'distance', unshielded: 'shield', both: 'both' }, explanation: 'retry', reflection: 'Keep my note.' } } });
  869 |   const both = page.getByRole('button', { name: 'Both effects', exact: true });
  870 |   const single = page.getByRole('button', { name: 'One saved test', exact: true });
  871 |   const chart = page.locator('[data-ns-case-overview-chart]');
  872 |   const saved = page.getByRole('heading', { name: 'Your saved evidence', exact: true });
  873 |   const original = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  874 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('100.0%');
  875 |   await both.focus(); await page.keyboard.press('Enter');
> 876 |   await expect(chart.locator('[data-ns-case-effect="unshielded"] > strong')).toHaveText('25.0%');
      |                                                                              ^ Error: expect(locator).toHaveText(expected) failed
  877 |   await expect(chart.locator('[data-ns-case-effect="mystery"] > strong')).toHaveText('5.3%');
  878 |   await expect(chart.locator('[data-ns-case-effect="closer"] > strong')).toHaveText('21.4%');
  879 |   await expect(chart.locator('[data-ns-case-effect]')).toHaveCount(3);
  880 |   await expect(chart.locator('[data-ns-case-effect="both"]')).toHaveCount(0);
  881 |   await expect(both).toBeFocused();
  882 |   await expect(both).toHaveAttribute('aria-pressed', 'true');
  883 |   await expect(chart).toBeInViewport({ ratio: 1 });
  884 |   await expect(chart).toHaveAttribute('aria-label', 'Saved single-change comparisons on a shared 0 to 100% scale. Mystery setup at 2 m with 2 cm lead: 5.3%. Distance changed, 2 cm lead kept: 21.4%. Shield changed, distance kept at 2 m: 25.0%.');
  885 |   await expect(page.locator('[data-ns-case-reading]')).toHaveCount(0);
  886 |   await expect(page.getByRole('combobox', { name: 'Review a saved test', exact: true })).toHaveCount(0);
  887 |   await expect(page.locator('[data-ns-case-check]')).toHaveCount(0);
  888 |   const bars = await chart.evaluate(node => [...node.querySelectorAll('.ns-case-track')].map(track => ({ track: track.clientWidth, fill: track.querySelector('.ns-case-fill')!.getBoundingClientRect().width })));
  889 |   expect(bars.map(bar => bar.track)).toEqual([bars[0].track, bars[0].track, bars[0].track]);
  890 |   expect(bars[0].fill / bars[0].track).toBeCloseTo(Math.exp(-.771 * 2) / 4, 2);
  891 |   expect(bars[1].fill / bars[1].track).toBeCloseTo(Math.exp(-.771 * 2), 2);
  892 |   expect(bars[2].fill / bars[2].track).toBeCloseTo(.25, 2);
  893 |   const combined = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  894 |   expect(combined).toEqual({ ...original, nkStudio: { ...original.nkStudio, investigation: { ...original.nkStudio.investigation, evidenceView: 'effects' } } });
  895 |   await page.screenshot({ path: output + '/signal-overview-desktop.png', fullPage: true });
  896 |   await audit(page);
  897 |   await page.getByRole('button', { name: 'Inspect distance test', exact: true }).focus();
  898 |   await page.keyboard.press('Enter');
  899 |   await expect(page.locator('[data-ns-case-plan]')).toHaveText('Planned test: Undo both changes. Run it to record a reading.');
  900 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('21.4%');
  901 |   await expect(saved).toBeFocused();
  902 |   await expect(page.getByRole('combobox', { name: 'Review a saved test', exact: true })).toHaveValue('closer');
  903 |   await expect(single).toHaveAttribute('aria-pressed', 'true');
  904 |   await expect(page.locator('[data-ns-case-check] > summary')).toHaveText('✓ Distance changed');
  905 |   const inspected = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  906 |   expect(inspected).toEqual({ ...original, nkStudio: { ...original.nkStudio, investigation: { ...original.nkStudio.investigation, evidenceView: 'single', review: 'closer' } } });
  907 |   await single.focus(); await page.keyboard.press('Enter');
  908 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(inspected);
  909 |   await both.focus(); await page.keyboard.press('Enter');
  910 |   let state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  911 |   await page.getByRole('button', { name: 'Explain these results', exact: true }).click();
  912 |   await expect(page.getByRole('heading', { name: 'What explains the lower signal?', exact: true })).toBeFocused();
  913 |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  914 |   await page.getByRole('button', { name: 'Review the shielding evidence', exact: true }).click();
  915 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  916 |   await expect(saved).toBeFocused();
  917 |   await expect(page.locator('[data-ns-case-plan]')).toContainText('Undo both changes');
  918 |   await both.click();
  919 |   state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  920 |   await page.getByRole('button', { name: 'Back to introductions' }).click();
  921 |   await page.locator('.ns-case-entry > summary').click();
  922 |   await page.getByRole('button', { name: 'Resume the signal mystery' }).click();
  923 |   await expect(chart).toBeVisible();
  924 |   await expect(both).toHaveAttribute('aria-pressed', 'true');
  925 |   const resumed = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  926 |   expect(resumed.nkStudio).toEqual(state.nkStudio);
  927 |   const run = page.getByRole('button', { name: 'Run this comparison' });
  928 |   await run.focus(); await page.keyboard.press('Enter');
  929 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('100.0%');
  930 |   await expect(run).toBeFocused();
  931 |   await expect(chart).toHaveCount(0);
  932 |   await expect(single).toHaveAttribute('aria-pressed', 'true');
  933 |   const measured = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  934 |   expect(measured.investigation.noticing).toEqual(original.nkStudio.investigation.noticing);
  935 |   expect(measured.investigation.reflection).toBe(original.nkStudio.investigation.reflection);
  936 |   expect(measured.investigation.runs).toEqual(['closer', 'unshielded', 'both']);
  937 |   expect(measured.completed).toEqual(original.nkStudio.completed);
  938 |   expect(measured.counting).toEqual(original.nkStudio.counting);
  939 |   expect(measured.nucleus).toEqual(original.nkStudio.nucleus);
  940 |   expect(measured.investigation.solved).toBeUndefined();
  941 |   expect(errors).toEqual([]);
  942 | });
  943 | 
  944 | test('signal detective combined evidence fits at 320px with keyboard inspection and forced colors', async ({ page }) => {
  945 |   const errors: string[] = [];
  946 |   page.on('pageerror', error => errors.push(error.message));
  947 |   await page.setViewportSize({ width: 320, height: 844 });
  948 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  949 |   await mount(page, { nkView: 'investigate', nkLargeText: true, nkReduceMotion: true, nkStudio: { completed: ['distance'], counting: { runs: [1, 4] }, investigation: { prediction: 'both', selected: 'both', runs: ['closer', 'unshielded'], review: 'closer', reflection: 'Keep this note.' } } });
  950 |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  951 |   const both = page.getByRole('button', { name: 'Both effects', exact: true });
  952 |   const chart = page.locator('[data-ns-case-overview-chart]');
  953 |   const original = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  954 |   await both.focus(); await page.keyboard.press('Enter');
  955 |   await expect(both).toBeFocused();
  956 |   await expect(chart).toBeInViewport({ ratio: 1 });
  957 |   await expect(chart.locator('[data-ns-case-effect="closer"]')).toContainText('2 cm lead kept');
  958 |   await expect(chart.locator('[data-ns-case-effect="unshielded"]')).toContainText('distance kept at 2 m');
  959 |   for (const name of ['One saved test', 'Both effects', 'Inspect distance test', 'Inspect shielding test']) {
  960 |     const button = page.getByRole('button', { name, exact: true });
  961 |     expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  962 |     await expect(button).toBeInViewport({ ratio: 1 });
  963 |   }
  964 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  965 |   await page.screenshot({ path: output + '/signal-overview-mobile-light.png' });
  966 |   await audit(page);
  967 |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  968 |   await expect(both).toHaveCSS('outline-style', 'solid');
  969 |   await expect(chart.locator('[data-ns-case-effect="unshielded"] .ns-case-effect-fixed')).toHaveCSS('color', 'rgb(0, 0, 0)');
  970 |   await page.screenshot({ path: output + '/signal-overview-mobile-forced.png' });
  971 |   await page.getByRole('button', { name: 'Inspect shielding test', exact: true }).focus();
  972 |   await page.keyboard.press('Enter');
  973 |   await expect(page.getByRole('heading', { name: 'Your saved evidence', exact: true })).toBeFocused();
  974 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  975 |   await expect(page.getByRole('combobox', { name: 'Review a saved test', exact: true })).toHaveValue('unshielded');
  976 |   await expect(page.locator('[data-ns-case-chart]')).toBeInViewport({ ratio: 1 });
```