# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 43-nuclearlab-experiment-studio.spec.ts >> signal detective keeps the combined view unavailable until both single changes are recorded
- Location: tests\e2e\43-nuclearlab-experiment-studio.spec.ts:999:5

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-ns-case-overview-chart]')
Expected: 0
Received: 1
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" with timeout 15000ms
  - waiting for locator('[data-ns-case-overview-chart]')
    31 × locator resolved to 1 element
       - unexpected value "1"

```

# Test source

```ts
  901  |   await expect(saved).toBeFocused();
  902  |   await expect(page.getByRole('combobox', { name: 'Review a saved test', exact: true })).toHaveValue('closer');
  903  |   await expect(single).toHaveAttribute('aria-pressed', 'true');
  904  |   await expect(page.locator('[data-ns-case-check] > summary')).toHaveText('✓ Distance changed');
  905  |   const inspected = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  906  |   expect(inspected).toEqual({ ...original, nkStudio: { ...original.nkStudio, investigation: { ...original.nkStudio.investigation, evidenceView: 'single', review: 'closer' } } });
  907  |   await single.focus(); await page.keyboard.press('Enter');
  908  |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(inspected);
  909  |   await both.focus(); await page.keyboard.press('Enter');
  910  |   let state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  911  |   await page.getByRole('button', { name: 'Explain these results', exact: true }).click();
  912  |   await expect(page.getByRole('heading', { name: 'What explains the lower signal?', exact: true })).toBeFocused();
  913  |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab)).toEqual(state);
  914  |   await page.getByRole('button', { name: 'Review the shielding evidence', exact: true }).click();
  915  |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  916  |   await expect(saved).toBeFocused();
  917  |   await expect(page.locator('[data-ns-case-plan]')).toContainText('Undo both changes');
  918  |   await both.click();
  919  |   state = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  920  |   await page.getByRole('button', { name: 'Back to introductions' }).click();
  921  |   await page.locator('.ns-case-entry > summary').click();
  922  |   await page.getByRole('button', { name: 'Resume the signal mystery' }).click();
  923  |   await expect(chart).toBeVisible();
  924  |   await expect(both).toHaveAttribute('aria-pressed', 'true');
  925  |   const resumed = await page.evaluate(() => (window as any).__toolData._nuclearLab);
  926  |   expect(resumed.nkStudio).toEqual(state.nkStudio);
  927  |   const run = page.getByRole('button', { name: 'Run this comparison' });
  928  |   await run.focus(); await page.keyboard.press('Enter');
  929  |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('100.0%');
  930  |   await expect(run).toBeFocused();
  931  |   await expect(chart).toHaveCount(0);
  932  |   await expect(single).toHaveAttribute('aria-pressed', 'true');
  933  |   const measured = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  934  |   expect(measured.investigation.noticing).toEqual(original.nkStudio.investigation.noticing);
  935  |   expect(measured.investigation.reflection).toBe(original.nkStudio.investigation.reflection);
  936  |   expect(measured.investigation.runs).toEqual(['closer', 'unshielded', 'both']);
  937  |   expect(measured.completed).toEqual(original.nkStudio.completed);
  938  |   expect(measured.counting).toEqual(original.nkStudio.counting);
  939  |   expect(measured.nucleus).toEqual(original.nkStudio.nucleus);
  940  |   expect(measured.investigation.solved).toBeUndefined();
  941  |   expect(errors).toEqual([]);
  942  | });
  943  | 
  944  | test('signal detective combined evidence fits at 320px with keyboard inspection and forced colors', async ({ page }) => {
  945  |   const errors: string[] = [];
  946  |   page.on('pageerror', error => errors.push(error.message));
  947  |   await page.setViewportSize({ width: 320, height: 844 });
  948  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  949  |   await mount(page, { nkView: 'investigate', nkLargeText: true, nkReduceMotion: true, nkStudio: { completed: ['distance'], counting: { runs: [1, 4] }, investigation: { prediction: 'both', selected: 'both', runs: ['closer', 'unshielded'], review: 'closer', reflection: 'Keep this note.' } } });
  950  |   await page.evaluate(() => { (window as any).__ctx.theme = 'light'; (window as any).__rerender(); });
  951  |   const both = page.getByRole('button', { name: 'Both effects', exact: true });
  952  |   const chart = page.locator('[data-ns-case-overview-chart]');
  953  |   const original = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  954  |   await both.focus(); await page.keyboard.press('Enter');
  955  |   await expect(both).toBeFocused();
  956  |   await expect(chart).toBeInViewport({ ratio: 1 });
  957  |   await expect(chart.locator('[data-ns-case-effect="closer"]')).toContainText('2 cm lead kept');
  958  |   await expect(chart.locator('[data-ns-case-effect="unshielded"]')).toContainText('distance kept at 2 m');
  959  |   for (const name of ['One saved test', 'Both effects', 'Inspect distance test', 'Inspect shielding test']) {
  960  |     const button = page.getByRole('button', { name, exact: true });
  961  |     expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  962  |     await expect(button).toBeInViewport({ ratio: 1 });
  963  |   }
  964  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  965  |   await page.screenshot({ path: output + '/signal-overview-mobile-light.png' });
  966  |   await audit(page);
  967  |   await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  968  |   await expect(both).toHaveCSS('outline-style', 'solid');
  969  |   await expect(chart.locator('[data-ns-case-effect="unshielded"] .ns-case-effect-fixed')).toHaveCSS('color', 'rgb(0, 0, 0)');
  970  |   await page.screenshot({ path: output + '/signal-overview-mobile-forced.png' });
  971  |   await page.getByRole('button', { name: 'Inspect shielding test', exact: true }).focus();
  972  |   await page.keyboard.press('Enter');
  973  |   await expect(page.getByRole('heading', { name: 'Your saved evidence', exact: true })).toBeFocused();
  974  |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  975  |   await expect(page.getByRole('combobox', { name: 'Review a saved test', exact: true })).toHaveValue('unshielded');
  976  |   await expect(page.locator('[data-ns-case-chart]')).toBeInViewport({ ratio: 1 });
  977  |   await expect(page.locator('[data-ns-case-plan]')).toContainText('Undo both changes');
  978  |   const inspected = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  979  |   expect(inspected).toEqual({ ...original, investigation: { ...original.investigation, review: 'unshielded', evidenceView: 'single' } });
  980  |   await page.screenshot({ path: output + '/signal-overview-mobile-inspect-forced.png' });
  981  |   await both.focus(); await page.keyboard.press('Enter');
  982  |   const state = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio);
  983  |   await page.getByRole('button', { name: 'Explain these results', exact: true }).focus();
  984  |   await page.keyboard.press('Enter');
  985  |   await expect(page.getByRole('heading', { name: 'What explains the lower signal?', exact: true })).toBeFocused();
  986  |   await expect(page.locator('[data-ns-explain]')).toBeInViewport({ ratio: 1 });
  987  |   expect(await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio)).toEqual(state);
  988  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  989  |   const run = page.getByRole('button', { name: 'Run this comparison' });
  990  |   await run.focus(); await page.keyboard.press('Enter');
  991  |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('100.0%');
  992  |   await expect(run).toBeFocused();
  993  |   await expect(run).toBeInViewport({ ratio: 1 });
  994  |   await expect(chart).toHaveCount(0);
  995  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  996  |   expect(errors).toEqual([]);
  997  | });
  998  | 
  999  | test('signal detective keeps the combined view unavailable until both single changes are recorded', async ({ page }) => {
  1000 |   await mount(page, { nkView: 'investigate', nkStudio: { investigation: { prediction: 'both', selected: 'unshielded', runs: ['closer', 'both'], review: 'both', evidenceView: 'effects', reflection: 'Keep this note.' } } });
> 1001 |   await expect(page.locator('[data-ns-case-overview-chart]')).toHaveCount(0);
       |                                                               ^ Error: expect(locator).toHaveCount(expected) failed
  1002 |   await expect(page.getByRole('button', { name: 'Both effects', exact: true })).toHaveCount(0);
  1003 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('100.0%');
  1004 |   await expect(page.locator('[data-ns-case-evidence] > p')).toHaveText('1 of 2 separate effects checked');
  1005 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  1006 |   const run = page.getByRole('button', { name: 'Run this comparison' });
  1007 |   await run.focus(); await page.keyboard.press('Enter');
  1008 |   await expect(page.locator('[data-ns-case-reading]')).toHaveText('25.0%');
  1009 |   await expect(page.locator('[data-ns-case-overview-chart]')).toHaveCount(0);
  1010 |   await expect(run).toBeFocused();
  1011 |   await expect(page.getByRole('button', { name: 'One saved test', exact: true })).toHaveAttribute('aria-pressed', 'true');
  1012 |   await page.getByRole('button', { name: 'Both effects', exact: true }).click();
  1013 |   await expect(page.locator('[data-ns-case-overview-chart] [data-ns-case-effect]')).toHaveCount(3);
  1014 |   await expect(page.locator('[data-ns-case-overview-chart] [data-ns-case-effect="both"]')).toHaveCount(0);
  1015 |   const state = await page.evaluate(() => (window as any).__toolData._nuclearLab.nkStudio.investigation);
  1016 |   expect(state.runs).toEqual(['closer', 'both', 'unshielded']);
  1017 |   expect(state.review).toBe('unshielded');
  1018 |   expect(state.reflection).toBe('Keep this note.');
  1019 |   expect(state.solved).toBeUndefined();
  1020 | });
  1021 | 
  1022 | test('nucleus builder introduces isotopes with keyboard comparisons and preserves the half-life lesson', async ({ page }) => {
  1023 |   const errors: string[] = [];
  1024 |   page.on('pageerror', error => errors.push(error.message));
  1025 |   await page.setViewportSize({ width: 1100, height: 1000 });
  1026 |   await mount(page, { nkStudio: { mission: 'shield', completed: ['distance'], decay: { prediction: 32, step: 1 } } });
  1027 |   await expect(page.locator('.ns-warmup-entry')).not.toHaveAttribute('open');
  1028 |   await page.locator('.ns-warmup-entry > summary').focus();
  1029 |   await page.keyboard.press('Enter');
  1030 |   await page.getByRole('button', { name: 'Start the nucleus builder' }).focus();
  1031 |   await page.keyboard.press('Enter');
  1032 |   await expect(page.getByRole('region', { name: 'Nucleus builder', exact: true })).toBeFocused();
  1033 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-12');
  1034 |   const save = page.getByRole('button', { name: 'Save this nucleus' });
  1035 |   await expect(save).toBeDisabled();
  1036 |   await page.getByRole('button', { name: 'It becomes another element', exact: true }).click();
  1037 |   await save.focus();
  1038 |   await page.keyboard.press('Enter');
  1039 |   await page.keyboard.press('Enter');
  1040 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(1);
  1041 |   await page.getByRole('button', { name: '+ Neutron', exact: true }).focus();
  1042 |   await page.keyboard.press('Enter');
  1043 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-13');
  1044 |   await page.keyboard.press('Enter');
  1045 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Carbon-14');
  1046 |   await expect(page.locator('[data-ns-nucleus-mass]')).toHaveText('6 + 8 = 14');
  1047 |   await expect(page.getByRole('img', { name: 'Carbon-14 nucleus: 6 protons and 8 neutrons. Mass number 14.', exact: true })).toBeVisible();
  1048 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(1);
  1049 |   await save.click();
  1050 |   await expect(page.locator('[data-ns-explain]')).toHaveCount(0);
  1051 |   await expect(page.locator('[data-ns-nucleus-evidence]')).toHaveText('2 of 3 comparison nuclei saved');
  1052 |   await page.getByRole('button', { name: '+ Proton', exact: true }).focus();
  1053 |   await page.keyboard.press('Enter');
  1054 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Nitrogen-15');
  1055 |   await save.click();
  1056 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody th')).toHaveText(['Carbon-12', 'Carbon-14', 'Nitrogen-15']);
  1057 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody td')).toHaveText(['6', '6', '6', '8', '7', '8']);
  1058 |   await page.getByRole('button', { name: 'Review saved comparisons' }).focus();
  1059 |   await page.keyboard.press('Enter');
  1060 |   await expect(page.getByRole('heading', { name: 'Your saved nuclei', exact: true })).toBeFocused();
  1061 |   await page.getByRole('button', { name: 'Explain these comparisons' }).focus();
  1062 |   await page.keyboard.press('Enter');
  1063 |   await expect(page.getByRole('heading', { name: 'What determines the element?', exact: true })).toBeFocused();
  1064 |   await page.screenshot({ path: output + '/nucleus-builder-comparison.png', fullPage: true });
  1065 |   await audit(page);
  1066 |   await page.getByRole('button', { name: 'Adding neutrons always makes a different element.', exact: true }).click();
  1067 |   await expect(page.locator('[data-ns-reflection="nucleus"]')).toHaveCount(0);
  1068 |   await page.getByRole('button', { name: 'Protons identify the element.' }).click();
  1069 |   await expect(page.locator('.ns-case-tests')).not.toHaveAttribute('open');
  1070 |   await page.getByRole('button', { name: 'Continue to the half-life experiment' }).click();
  1071 |   await expect(page.getByRole('region', { name: 'Experiment studio', exact: true })).toBeFocused();
  1072 |   await expect(page.locator('[data-nk-studio]')).toHaveAttribute('data-nk-studio', 'decay');
  1073 |   await expect(page.locator('.ns-readout > strong')).toHaveText('32');
  1074 |   await expect(page.locator('.ns-progress')).toContainText('1 / 6');
  1075 |   await page.locator('.ns-warmup-entry > summary').click();
  1076 |   await page.getByRole('button', { name: 'Revisit the nucleus builder' }).click();
  1077 |   await expect(page.locator('[data-ns-nucleus-name]')).toHaveText('Nitrogen-15');
  1078 |   await expect(page.locator('[data-ns-nucleus-notebook] tbody tr')).toHaveCount(3);
  1079 |   expect(errors).toEqual([]);
  1080 | });
  1081 | 
  1082 | test('nucleus builder fits at 320px with larger text and identifiable particles in forced colors', async ({ page }) => {
  1083 |   await page.setViewportSize({ width: 320, height: 844 });
  1084 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  1085 |   await mount(page, { nkView: 'nucleus', nkLargeText: true, nkReduceMotion: true, nkStudio: { nucleus: { prediction: 'same', cards: [{ protons: 6, neutrons: 6 }] } } });
  1086 |   await page.getByRole('button', { name: '+ Neutron', exact: true }).focus();
  1087 |   await page.keyboard.press('Enter'); await page.keyboard.press('Enter');
  1088 |   await page.getByRole('button', { name: 'Save this nucleus' }).click();
  1089 |   await page.getByRole('button', { name: '+ Proton', exact: true }).click();
  1090 |   await page.getByRole('button', { name: 'Save this nucleus' }).click();
  1091 |   const positions = await page.evaluate(() => ({
  1092 |     controls: document.querySelector('.ns-controls')!.getBoundingClientRect().bottom,
  1093 |     notebook: document.querySelector('[data-ns-nucleus-notebook]')!.getBoundingClientRect().top,
  1094 |     fits: document.documentElement.scrollWidth <= innerWidth,
  1095 |   }));
  1096 |   expect(positions.fits).toBe(true);
  1097 |   expect(positions.notebook).toBeGreaterThanOrEqual(positions.controls);
  1098 |   await page.getByRole('button', { name: 'Protons identify the element.' }).click();
  1099 |   await page.locator('[data-ns-reflection="nucleus"] > summary').click();
  1100 |   const note = page.getByRole('textbox', { name: 'My takeaway from Nucleus builder', exact: true });
  1101 |   await note.fill('The protons tell me the element.');
```