# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> survival detective without WebGL explains changed conditions and never accepts a late prediction
- Location: tests\e2e\evolab-living-island.spec.ts:1017:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Next generation', exact: true })

```

# Test source

```ts
  933  |   await expect(page.getByRole('heading', { name: 'A chance, not a promise', exact: true })).toBeFocused();
  934  |   await expect(page.locator('.ei-detective-feedback')).toContainText('matches the model’s chances');
  935  |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  936  |   await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  937  |   await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  938  |   await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  939  |   await expect(page.locator('.ei-detective')).toHaveAttribute('data-detective-phase', 'locked');
  940  |   const renderer = (await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id);
  941  |   const expected = await page.evaluate((original: any) => {
  942  |     const w = (window as any).StemLab.evoIslandModel.step({ ...original, living: false });
  943  |     return { ...w, living: true };
  944  |   }, world);
  945  |   await page.getByRole('button', { name: 'Run one survival round', exact: true }).click();
  946  |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '5');
  947  |   await expect(page.getByRole('heading', { name: 'The real round is in', exact: true })).toBeFocused();
  948  |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(expected);
  949  |   expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(renderer);
  950  |   await expect(page.getByRole('button', { name: 'Run one survival round', exact: true })).toHaveCount(0);
  951  |   for (const id of locked.record.ids) {
  952  |     const card = page.locator('.ei-detective-resident[data-organism-id="' + id + '"]');
  953  |     const survived = expected.history[5].survivors.includes(id);
  954  |     await expect(card.locator('.ei-detective-result')).toHaveAttribute('data-survived', String(survived));
  955  |     await expect(card).toContainText('Direct offspring: ' + expected.history[5].population.filter((o: any) => o.parents.includes(id)).length);
  956  |     const chance = await page.evaluate(({ original, id }: any) => {
  957  |       const m = (window as any).StemLab.evoIslandModel;
  958  |       return (m.chance(original.history[4].population.find((o: any) => o.id === id), m.habitats[original.habitat], original.selection) * 100).toFixed(1) + '%';
  959  |     }, { original: world, id });
  960  |     await expect(card.locator('.ei-detective-chance')).toContainText(chance);
  961  |   }
  962  |   await page.getByText('Why these chances?', { exact: true }).click();
  963  |   await expect(page.locator('.ei-detective-formula')).toContainText('Predator protection');
  964  |   await page.getByRole('button', { name: 'Save detective evidence', exact: true }).click();
  965  |   const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  966  |   expect(notes.livingIsland.text).toBe('My original reasoning.');
  967  |   expect(notes.livingIslandDetective.text).toContain('\nPrediction: ' + locked.answer);
  968  |   expect(notes.livingIslandDetective.text).toContain('G4 → G5');
  969  |   expect(notes.livingIslandDetective.text.length).toBeLessThan(2000);
  970  |   await page.locator('.ei-detective').screenshot({ path: report + '/survival-detective-desktop.png', style: '.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  971  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  972  |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-detective', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  973  |   await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  974  |   await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  975  |   await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  976  |   await expect(page.locator('.ei-detective')).toHaveAttribute('data-detective-phase', 'result');
  977  |   await expect(page.locator('.ei-detective-feedback')).toContainText('matches the model’s chances');
  978  |   expect(errors).toEqual([]);
  979  | });
  980  | 
  981  | test('survival detective on a phone distinguishes neutral chance from extinction and keeps the layout accessible', async ({ page }) => {
  982  |   await page.setViewportSize({ width: 390, height: 844 });
  983  |   await page.emulateMedia({ reducedMotion: 'reduce' });
  984  |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  985  |   const world = await page.evaluate(() => {
  986  |     const m = (window as any).StemLab.evoIslandModel;
  987  |     for (let seed = 1; seed <= 50; seed++) {
  988  |       const w = m.create(seed); w.selection = false;
  989  |       w.history[0].population = w.history[0].population.slice(0, 2); w.history[0].stats = m.stats(w.history[0].population); w.nextId = 3;
  990  |       if (m.step(w).history[1].survivors.length === 1) return w;
  991  |     }
  992  |   });
  993  |   await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: world.seed, introDismissed: true } } });
  994  |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  995  |   await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  996  |   await page.getByRole('button', { name: 'Start survival detective', exact: true }).click();
  997  |   await page.getByRole('radio', { name: 'About equal (within 1 percentage point)', exact: true }).focus();
  998  |   await page.keyboard.press('Space');
  999  |   await page.getByRole('button', { name: 'Lock prediction & reveal chances', exact: true }).click();
  1000 |   await expect(page.locator('.ei-detective-chance strong')).toHaveText(['68.0%', '68.0%']);
  1001 |   await page.getByText('Why these chances?', { exact: true }).click();
  1002 |   await expect(page.locator('.ei-detective-formula p')).toHaveText([/0.68 × 1.000 = 68.0%/, /0.68 × 1.000 = 68.0%/]);
  1003 |   await page.getByRole('button', { name: 'Run one survival round', exact: true }).click();
  1004 |   await expect(page.locator('.ei-detective-result[data-survived=true]')).toHaveCount(1);
  1005 |   await expect(page.locator('.ei-detective-result[data-survived=false]')).toHaveCount(1);
  1006 |   await expect(page.locator('.ei-detective-result small')).toHaveText(['Direct offspring: 0', 'Direct offspring: 0']);
  1007 |   await expect(page.getByRole('button', { name: 'Start a new case', exact: true })).toBeDisabled();
  1008 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  1009 |   await page.locator('.ei-detective').screenshot({ path: report + '/survival-detective-phone.png', style: '.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  1010 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  1011 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-detective', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  1012 |   await page.getByRole('button', { name: 'Meet resident A', exact: true }).click();
  1013 |   await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toHaveAttribute('aria-selected', 'true');
  1014 |   await expect(page.locator('[data-island-generation]')).toHaveAttribute('data-island-generation', '0');
  1015 | });
  1016 | 
  1017 | test('survival detective without WebGL explains changed conditions and never accepts a late prediction', async ({ page }) => {
  1018 |   await page.setViewportSize({ width: 1440, height: 1100 });
  1019 |   await page.addInitScript(() => {
  1020 |     const get = HTMLCanvasElement.prototype.getContext;
  1021 |     HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  1022 |   });
  1023 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } }, undefined, { expectCanvas: false });
  1024 |   await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  1025 |   await page.getByRole('button', { name: 'Start survival detective', exact: true }).click();
  1026 |   await page.getByRole('radio', { name: 'A has the better chance', exact: true }).check();
  1027 |   await page.getByRole('button', { name: 'Lock prediction & reveal chances', exact: true }).click();
  1028 |   await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  1029 |   await page.getByRole('button', { name: 'Long winter', exact: false }).click();
  1030 |   await page.getByRole('tab', { name: 'Investigate', exact: true }).click();
  1031 |   await expect(page.locator('.ei-detective')).toContainText('The habitat or selection setting changed.');
  1032 |   await expect(page.getByRole('button', { name: 'Run one survival round', exact: true })).toHaveCount(0);
> 1033 |   await page.getByRole('button', { name: 'Next generation', exact: true }).click();
       |                                                                            ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  1034 |   await expect(page.locator('.ei-detective-feedback')).toContainText('original prediction is not scored');
  1035 |   await expect(page.locator('.ei-detective')).toContainText('Long winter');
  1036 |   await page.getByRole('button', { name: 'Save detective evidence', exact: true }).click();
  1037 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandDetective.text)).toContain('Conditions changed; prediction not scored.');
  1038 |   await page.getByRole('button', { name: 'Start a new case', exact: true }).click();
  1039 |   await page.getByRole('button', { name: 'Next generation', exact: true }).click();
  1040 |   await expect(page.locator('.ei-detective-feedback')).toContainText('before you locked a prediction');
  1041 |   await expect(page.getByRole('button', { name: 'Lock prediction & reveal chances', exact: true })).toHaveCount(0);
  1042 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'fallback');
  1043 | });
  1044 | 
```