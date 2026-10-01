# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: evolab-living-island.spec.ts >> family time machine without WebGL handles a single zero-valued ancestor and a later-born family
- Location: tests\e2e\evolab-living-island.spec.ts:1162:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Follow this family' })

```

# Test source

```ts
  1086 |     const mean = members.reduce((n: number, o: any) => n + (o.genes.legs[0] + o.genes.legs[1]) / 2, 0) / members.length;
  1087 |     const sorted = members.slice().sort((a: any, b: any) => m.value(a, 'legs') - m.value(b, 'legs') || a.id - b.id);
  1088 |     return { mean, minimum: sorted[0], maximum: sorted[sorted.length - 1], count: members.length,
  1089 |       populationMean: world.history[2].population.reduce((n: number, o: any) => n + (o.genes.legs[0] + o.genes.legs[1]) / 2, 0) / world.history[2].population.length };
  1090 |   }, { world: fixture.world, id: fixture.root.id });
  1091 |   await expect(page.locator('[data-family-trait-mean]')).toHaveText((evidence.mean * 100).toFixed(1));
  1092 |   await expect(page.locator('[data-family-population-mean]')).toHaveText((evidence.populationMean * 100).toFixed(1));
  1093 |   await page.getByRole('button', { name: 'Meet lowest-trait member', exact: true }).click();
  1094 |   await expect(page.locator('#ei-organism')).toHaveValue(String(evidence.minimum.id));
  1095 |   await expect(page.locator('#ei-lens')).toHaveValue('legs');
  1096 |   await expect(page.locator('.ei-stage')).toBeFocused();
  1097 |   await page.getByRole('button', { name: 'Meet highest-trait member', exact: true }).click();
  1098 |   await expect(page.locator('#ei-organism')).toHaveValue(String(evidence.maximum.id));
  1099 |   await page.getByRole('button', { name: 'Save family trait evidence', exact: true }).click();
  1100 |   const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes);
  1101 |   expect(notes.livingIsland.text).toBe('My explanation stays.');
  1102 |   expect(notes.livingIslandTraitTrail.text).toContain('ancestor #' + fixture.root.id);
  1103 |   expect(notes.livingIslandTraitTrail.text).toContain('\nTrait: Leg length.');
  1104 |   expect(notes.livingIslandTraitTrail.text).toContain('viewed G2');
  1105 |   expect(notes.livingIslandTraitTrail.text).toContain((evidence.mean * 100).toFixed(1) + '/100');
  1106 |   expect(notes.livingIslandTraitTrail.text.length).toBeLessThan(2000);
  1107 |   await page.getByText('Read the complete family record', { exact: true }).click();
  1108 |   await expect(page.locator('.ei-family-record tbody tr')).toHaveCount(9);
  1109 |   await expect(page.locator('.ei-family-record thead')).toContainText('Leg length');
  1110 |   await expect(page.locator('.ei-family-record tbody tr').nth(2)).toContainText((evidence.mean * 100).toFixed(1));
  1111 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  1112 |   expect((await harness.glContexts(page)).filter(r => r.connected && !r.lost).map(r => r.id)).toEqual(renderer);
  1113 |   await page.locator('.ei-family-machine').screenshot({ path: report + '/family-time-machine-desktop.png', style: '.ei-desk,.ei-desk-body{max-height:none!important;overflow:visible!important;position:static!important}.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  1114 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  1115 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-family-journey', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  1116 |   await page.getByRole('button', { name: 'All EvoLab activities', exact: false }).click();
  1117 |   await page.getByRole('button', { name: 'Explore Living Island', exact: false }).click();
  1118 |   await page.getByRole('tab', { name: 'Families', exact: true }).click();
  1119 |   await expect(page.getByLabel('Trait to follow', { exact: true })).toHaveValue('legs');
  1120 |   expect(await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.island.study.v1')!).trackedId)).toBe(fixture.root.id);
  1121 |   expect(errors).toEqual([]);
  1122 | });
  1123 | 
  1124 | test('family time machine on a phone leaves a lost lineage undefined and makes the exact record keyboard-scrollable', async ({ page }) => {
  1125 |   await page.setViewportSize({ width: 390, height: 844 });
  1126 |   await page.emulateMedia({ reducedMotion: 'reduce' });
  1127 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } });
  1128 |   const fixture = await page.evaluate(() => {
  1129 |     const m = (window as any).StemLab.evoIslandModel;
  1130 |     let world = m.create(2026); for (let i = 0; i < 12; i++) world = m.step(world);
  1131 |     const root = world.history[0].population.find((o: any) => !world.history[1].population.some((c: any) => c.parents.includes(o.id)));
  1132 |     return { world, root };
  1133 |   });
  1134 |   await harness.mount(page, { evoLab: { view: 'livingIsland', island: fixture.world, islandStudy: { seed: 2026, trackedId: fixture.root.id, introDismissed: true } } });
  1135 |   await page.evaluate(() => { document.getElementById('wrap')!.style.width = '100%'; document.body.style.padding = '0'; });
  1136 |   await page.getByRole('tab', { name: 'Families', exact: true }).click();
  1137 |   await expect(page.locator('[data-family-trait-mean]')).toHaveText('—');
  1138 |   await expect(page.locator('.ei-family-machine')).toContainText('mean and range are undefined');
  1139 |   expect((await page.locator('[data-family-mean-line]').getAttribute('points'))!.trim().split(' ')).toHaveLength(1);
  1140 |   expect((await page.locator('[data-family-population-line]').getAttribute('points'))!.trim().split(' ')).toHaveLength(13);
  1141 |   await expect(page.locator('[data-family-extreme]')).toHaveCount(0);
  1142 |   await page.locator('#ei-family-time').fill('0');
  1143 |   await expect(page.locator('[data-family-trait-mean]')).not.toHaveText('—');
  1144 |   await expect(page.getByRole('button', { name: 'Meet highest-trait member', exact: true })).toBeDisabled();
  1145 |   await page.locator('#ei-family-time').fill('12');
  1146 |   await page.getByRole('button', { name: 'Save family trait evidence', exact: true }).click();
  1147 |   const note = await page.evaluate(() => JSON.parse(localStorage.getItem('evoLab.progress.v1')!).notes.livingIslandTraitTrail.text);
  1148 |   expect(note).toContain('Family mean: undefined');
  1149 |   expect(note).not.toContain('Mean change since ancestor:');
  1150 |   await page.getByText('Read the complete family record', { exact: true }).click();
  1151 |   const record = page.getByRole('region', { name: 'Read the complete family record', exact: true });
  1152 |   await record.focus(); await page.keyboard.press('ArrowRight');
  1153 |   await expect.poll(async () => record.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  1154 |   await record.evaluate(el => { el.scrollLeft = 0; });
  1155 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  1156 |   await page.locator('.ei-family-machine').screenshot({ path: report + '/family-time-machine-phone.png', style: '.ei-commandbar,.ei-desk-tabs{position:static!important}' });
  1157 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  1158 |   expect(await page.evaluate(async () => (window as any).axe.run('.ei-family-journey', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }).then((r: any) => r.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))))).toEqual([]);
  1159 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(fixture.world);
  1160 | });
  1161 | 
  1162 | test('family time machine without WebGL handles a single zero-valued ancestor and a later-born family', async ({ page }) => {
  1163 |   await page.setViewportSize({ width: 1440, height: 1100 });
  1164 |   await page.addInitScript(() => {
  1165 |     const get = HTMLCanvasElement.prototype.getContext;
  1166 |     HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) { return type.includes('webgl') ? null : (get as any).call(this, type, ...args); } as any;
  1167 |   });
  1168 |   await harness.mount(page, { evoLab: { view: 'livingIsland' } }, undefined, { expectCanvas: false });
  1169 |   const world = await page.evaluate(() => {
  1170 |     const m = (window as any).StemLab.evoIslandModel, world = m.create(2026);
  1171 |     world.history[0].population.forEach((o: any) => { o.genes.fur = [0, 0]; });
  1172 |     world.history[0].stats = m.stats(world.history[0].population); return world;
  1173 |   });
  1174 |   await harness.mount(page, { evoLab: { view: 'livingIsland', island: world, islandStudy: { seed: 2026, trackedId: 1, introDismissed: true } } }, undefined, { expectCanvas: false });
  1175 |   await page.getByRole('tab', { name: 'Families', exact: true }).click();
  1176 |   await expect(page.locator('#ei-family-time')).toBeDisabled();
  1177 |   await expect(page.locator('[data-family-trait-mean]')).toHaveText('0.0');
  1178 |   await expect(page.locator('[data-family-population-mean]')).toHaveText('0.0');
  1179 |   await page.getByRole('button', { name: 'Meet lowest-trait member', exact: true }).click();
  1180 |   await expect(page.locator('#ei-lens')).toHaveValue('fur');
  1181 |   expect(await page.evaluate(() => (window as any).__toolData.evoLab.island)).toEqual(world);
  1182 |   await page.getByRole('button', { name: 'Next generation', exact: false }).click();
  1183 |   await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  1184 |   const child = await page.locator('#ei-organism option').nth(1).getAttribute('value');
  1185 |   await page.selectOption('#ei-organism', child!);
> 1186 |   await page.getByRole('button', { name: 'Follow this family', exact: false }).click();
       |                                                                                ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  1187 |   await page.getByRole('tab', { name: 'Families', exact: true }).click();
  1188 |   await expect(page.locator('#ei-family-time')).toHaveAttribute('min', '1');
  1189 |   await expect(page.locator('#ei-family-time')).toBeDisabled();
  1190 |   await page.locator('#ei-time').fill('0');
  1191 |   await expect(page.locator('[data-family-result]')).toHaveAttribute('data-family-result', 'before');
  1192 |   await expect(page.locator('.ei-family-machine')).toHaveCount(0);
  1193 |   await page.getByRole('button', { name: 'Revisit the ancestor', exact: true }).click();
  1194 |   await expect(page.locator('.ei-family-machine')).toHaveAttribute('data-family-trait-generation', '1');
  1195 |   await expect(page.locator('[data-island-scene]')).toHaveAttribute('data-island-scene', 'fallback');
  1196 | });
  1197 | 
```