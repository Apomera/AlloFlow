# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: raptor-study-anatomy.spec.ts >> Raptor anatomy close-ups >> inspects folded owl anatomy, fits phones and short fullscreen, and cleans up on restart
- Location: tests\e2e\raptor-study-anatomy.spec.ts:120:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 120
Received:   69.42196402726859
```

# Test source

```ts
  29  |     await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: mission, selectedSpecies: species,
  30  |       flightSession: { speciesId: species, missionId: mission }, huntTutorialDismissed: true, graphicsQuality: 'low',
  31  |       activeInvestigation: 'speed', investigations: { speed: { prediction: 'The wing and tail shapes may change during a dive.' } }
  32  |     } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  33  |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  34  |       c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 });
  35  |       for (let i = 0; i < 8; i++) (window as any).anatomyStep(25);
  36  |     });
  37  |   }
  38  |   async function snapshot(page: any) {
  39  |     return page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  40  |       const w = window as any, parts: any[] = [];
  41  |       w.anatomyScene.getObjectByName('raptor-head-rig').parent.traverse((part: any) => {
  42  |         if (part.isMesh) parts.push({ name: part.name, position: part.position.toArray(), rotation: part.rotation.toArray(), scale: part.scale.toArray(),
  43  |           morphs: part.morphTargetInfluences, color: part.material.color?.getHex(), version: part.geometry.attributes.position.version });
  44  |       });
  45  |       return { ...c._rhSnapshot(), parts };
  46  |     });
  47  |   }
  48  |   async function state(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt); }
  49  |   function frozen(before: any, after: any) {
  50  |     for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'parts']) expect(after[key], key).toEqual(before[key]);
  51  |   }
  52  |   async function bounds(page: any, object: string) {
  53  |     return page.evaluate(name => {
  54  |       const w = window as any, T = w.THREE, camera = w.anatomyCamera, points: any[] = [];
  55  |       const root = w.anatomyScene.getObjectByName(name); root.updateWorldMatrix(true, true);
  56  |       root.traverseVisible((mesh: any) => {
  57  |         if (!mesh.isMesh) return;
  58  |         const p = mesh.geometry.attributes.position, targets = mesh.geometry.morphAttributes.position || [];
  59  |         for (let i = 0; i < p.count; i++) {
  60  |           const base = new T.Vector3().fromBufferAttribute(p, i), vertex = base.clone();
  61  |           targets.forEach((target: any, j: number) => {
  62  |             const delta = new T.Vector3().fromBufferAttribute(target, i);
  63  |             if (!mesh.geometry.morphTargetsRelative) delta.sub(base);
  64  |             vertex.addScaledVector(delta, mesh.morphTargetInfluences[j]);
  65  |           });
  66  |           points.push(vertex.applyMatrix4(mesh.matrixWorld).project(camera));
  67  |         }
  68  |       });
  69  |       const stage = document.querySelector('[data-raptor-flight-stage]')!.getBoundingClientRect();
  70  |       const panel = document.querySelector('.rh-study-panel')!.getBoundingClientRect();
  71  |       const header = document.querySelector('.rh-study-header')!.getBoundingClientRect();
  72  |       const left = (Math.min(...points.map(p => p.x)) + 1) * stage.width / 2, right = (Math.max(...points.map(p => p.x)) + 1) * stage.width / 2;
  73  |       return { left, right, width: right - left, stageWidth: stage.width, top: (1 - Math.max(...points.map(p => p.y))) * stage.height / 2,
  74  |         bottom: (1 - Math.min(...points.map(p => p.y))) * stage.height / 2, panelTop: panel.top - stage.top, headerBottom: header.bottom - stage.top };
  75  |     }, object);
  76  |   }
  77  |   async function keep(page: any) { await page.getByRole('button', { name: 'Keep moment', exact: true }).click(); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled(); }
  78  |   async function advance(page: any) {
  79  |     await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
  80  |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  81  |       const w = window as any; c._rhCommand('assist'); c._rhCommand('hold', { key: 'shift', pressed: true });
  82  |       w.anatomySkipRender = true; for (let i = 0; i < 60; i++) w.anatomyStep(50);
  83  |       w.anatomySkipRender = false; w.anatomyStep(25);
  84  |     });
  85  |   }
  86  | 
  87  |   test('frames real anatomy without changing the pose or materials and restores flight exactly', async ({ page }) => {
  88  |     await mount(page);
  89  |     const flying = await snapshot(page);
  90  |     await page.locator('[data-raptor-study-button]').click();
  91  |     await expect(page.locator('.rh-study-region')).toBeHidden();
  92  |     const wholeHead = await bounds(page, objects.head);
  93  |     for (const [region, object] of Object.entries(objects)) {
  94  |       await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption(region);
  95  |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/peregrine-' + region + '.png' });
  96  |       const fit = await bounds(page, object);
  97  |       expect(fit.left).toBeGreaterThan(8); expect(fit.right).toBeLessThan(fit.stageWidth - 8);
  98  |       expect(fit.top).toBeGreaterThan(fit.headerBottom); expect(fit.bottom).toBeLessThan(fit.panelTop - 8);
  99  |       expect(fit.width).toBeGreaterThan(90);
  100 |       if (region === 'head') expect(fit.width).toBeGreaterThan(wholeHead.width * 2);
  101 |       await expect(page.locator('.rh-study-focus-frame')).toBeVisible();
  102 |       await expect(page.locator('.rh-study-region')).toBeVisible();
  103 |       frozen(flying, await snapshot(page));
  104 |     }
  105 |     await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('head');
  106 |     const frame = await page.locator('.rh-study-focus-frame path').last().getAttribute('d');
  107 |     await page.locator('[data-raptor-canvas]').focus(); await page.keyboard.press('ArrowLeft');
  108 |     expect(await page.locator('.rh-study-focus-frame path').last().getAttribute('d')).not.toBe(frame);
  109 |     const renders = await page.evaluate(() => (window as any).anatomyRenders);
  110 |     await page.evaluate(() => (window as any).anatomyStep(60000));
  111 |     expect(await page.evaluate(() => (window as any).anatomyRenders)).toBe(renders);
  112 |     await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('whole');
  113 |     await expect(page.locator('.rh-study-focus-frame')).toBeHidden(); await expect(page.locator('.rh-study-region')).toBeHidden();
  114 |     await page.getByRole('button', { name: 'Close study', exact: true }).click();
  115 |     const restored = await snapshot(page); frozen(flying, restored);
  116 |     expect(restored.cameraPosition).toEqual(flying.cameraPosition); expect(restored.cameraQuaternion).toEqual(flying.cameraQuaternion);
  117 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  118 |   });
  119 | 
  120 |   test('inspects folded owl anatomy, fits phones and short fullscreen, and cleans up on restart', async ({ page }) => {
  121 |     await mount(page, 'greatHorned', 'open');
  122 |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => { c._rhCommand('perchPractice'); for (let i = 0; i < 40; i++) (window as any).anatomyStep(25); });
  123 |     await page.locator('[data-raptor-study-button]').click();
  124 |     const perched = await snapshot(page); expect(perched.footExtension).toBeGreaterThan(0.95);
  125 |     for (const region of ['wing', 'feet', 'head'] as const) {
  126 |       await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption(region);
  127 |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-' + region + '.png' });
  128 |       const fit = await bounds(page, objects[region]);
> 129 |       expect(fit.width).toBeGreaterThan(120); expect(fit.top).toBeGreaterThan(fit.headerBottom); expect(fit.bottom).toBeLessThan(fit.panelTop - 8);
      |                         ^ Error: expect(received).toBeGreaterThan(expected)
  130 |       frozen(perched, await snapshot(page));
  131 |     }
  132 |     await expect(page.locator('#rh-study-observation-copy')).toContainText('not ears');
  133 |     await page.addStyleTag({ content: '#wrap{width:420px}' }); await page.setViewportSize({ width: 420, height: 1000 });
  134 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  135 |     await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  136 |     await page.locator('[data-study-view=front]').click();
  137 |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-head-phone.png' });
  138 |     const phone = await bounds(page, objects.head);
  139 |     expect(phone.left).toBeGreaterThan(8); expect(phone.right).toBeLessThan(phone.stageWidth - 8); expect(phone.width).toBeGreaterThan(110);
  140 |     expect(phone.top).toBeGreaterThan(phone.headerBottom); expect(phone.bottom).toBeLessThan(phone.panelTop - 8);
  141 |     const select = page.getByRole('combobox', { name: 'Inspect', exact: true });
  142 |     expect(await select.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  143 |     await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  144 |     expect(await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-study-header', '.rh-study-panel'] }, {
  145 |       runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }
  146 |     })).violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })))).toEqual([]);
  147 |     await page.emulateMedia({ forcedColors: 'active' });
  148 |     const colors = await select.evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]); expect(colors[0]).not.toBe(colors[1]);
  149 |     await page.emulateMedia({ forcedColors: 'none' });
  150 |     await page.setViewportSize({ width: 960, height: 560 });
  151 |     await page.getByRole('button', { name: 'Toggle fullscreen flight view', exact: true }).click();
  152 |     await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  153 |     await select.selectOption('feet');
  154 |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-feet-fullscreen.png' });
  155 |     const fullscreen = await bounds(page, objects.feet);
  156 |     expect(fullscreen.top).toBeGreaterThan(fullscreen.headerBottom); expect(fullscreen.bottom).toBeLessThan(fullscreen.panelTop - 8);
  157 |     await page.evaluate(() => document.exitFullscreen());
  158 |     await page.getByRole('button', { name: 'Restart this flight', exact: true }).click();
  159 |     await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
  160 |     await expect(page.locator('.rh-study-focus-frame')).toHaveCount(1); await expect(page.locator('.rh-study-focus-frame')).toBeHidden();
  161 |     await page.locator('[data-raptor-study-button]').click(); await expect(select).toHaveValue('whole');
  162 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  163 |   });
  164 | 
  165 |   test('keeps inspection context through comparison, matching, notebook transfer, export, and restoration', async ({ page }) => {
  166 |     await mount(page);
  167 |     await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('tail'); await keep(page);
  168 |     const first = (await state(page)).flightStudyMoments[0];
  169 |     expect(first.view.focus).toBe('tail'); expect(first.focusLabel).toBe('Tail feathers'); expect(first.image).toMatch(/^data:image\/jpeg;base64,/);
  170 |     await advance(page);
  171 |     await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('wing'); await keep(page);
  172 |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  173 |     await expect(page.locator('[data-study-camera-comparison]')).toContainText('different regions');
  174 |     await expect(page.locator('[data-study-moment=A] img')).toHaveAttribute('alt', /Tail feathers/);
  175 |     await page.locator('[data-study-moment=A] textarea').fill('The tail feathers overlap. I will compare their spread after a dive.');
  176 |     await page.locator('[data-study-moment=A]').getByRole('button', { name: 'Add to notebook', exact: true }).click();
  177 |     expect((await state(page)).investigations.speed.evidence[0].reading.view.focus).toBe('tail');
  178 |     await page.getByRole('button', { name: 'Remove moment B', exact: true }).click();
  179 |     await page.locator('[data-raptor-study-button]').click();
  180 |     const before = await snapshot(page);
  181 |     await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
  182 |     frozen(before, await snapshot(page)); await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toHaveValue('tail');
  183 |     await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true'); await keep(page);
  184 |     const second = (await state(page)).flightStudyMoments[1]; expect(second.view).toEqual(first.view); expect(second.image).not.toBe(first.image);
  185 |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  186 |     await expect(page.locator('[data-study-camera-comparison]')).toContainText('inspected region match');
  187 |     await page.locator('[data-study-moment=B] textarea').fill('The tail is narrower during this dive. A matched view helps me compare its outline.');
  188 |     await page.locator('.rh-flight-moments').screenshot({ path: output + '/tail-comparison.png' });
  189 |     const htmlPending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download visual report', exact: true }).click();
  190 |     const html = await htmlPending; await html.saveAs(output + '/tail-observations.html');
  191 |     expect(readFileSync((await html.path())!, 'utf8')).toContain('Tail feathers · Above');
  192 |     await page.locator('.rh-flight-moments').getByRole('button', { name: 'Open notebook', exact: true }).click();
  193 |     await expect(page.locator('.rh-journal-note')).toContainText('Tail feathers');
  194 |     const txtPending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download field notes', exact: true }).click();
  195 |     const txt = await txtPending; expect(readFileSync((await txt.path())!, 'utf8')).toContain('Tail feathers');
  196 |     const saved = await page.evaluate(() => (window as any).__toolData);
  197 |     await harness.destroy(page); await page.evaluate(data => (window as any).__mount(data), saved);
  198 |     await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
  199 |     await page.locator('[data-raptor-study-button]').click(); await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
  200 |     await expect(page.getByRole('combobox', { name: 'Inspect', exact: true })).toHaveValue('tail');
  201 |     expect((await state(page)).flightStudyMoments[0].image).toBe(first.image);
  202 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  203 |   });
  204 | });
  205 | 
```