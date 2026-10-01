# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: raptor-study-lighting.spec.ts >> Raptor inspection lighting >> keeps short-phone and fullscreen inspection usable with keyboard, reduced motion, and forced colors
- Location: tests\e2e\raptor-study-lighting.spec.ts:110:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('combobox', { name: 'Studio light', exact: true })
Expected: 1
Received: 0
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" with timeout 15000ms
  - waiting for getByRole('combobox', { name: 'Studio light', exact: true })
    32 × locator resolved to 0 elements
       - unexpected value "0"

```

# Test source

```ts
  25  |     await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: species,
  26  |       flightSession: { speciesId: species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: quality,
  27  |       activeInvestigation: 'speed', investigations: { speed: { prediction: 'Lighting will change which feather details I can see.' } }
  28  |     } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  29  |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => { c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 }); for (let i = 0; i < 8; i++) (window as any).lightStep(25); });
  30  |   }
  31  |   async function state(page: any) { return page.evaluate(() => (window as any).__toolData.raptorHunt); }
  32  |   async function snapshot(page: any) {
  33  |     return page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  34  |       const w = window as any, parts = [], scene = w.lightScene;
  35  |       scene.getObjectByName('raptor-head-rig').parent.traverse(mesh => { if (mesh.isMesh) parts.push({ name: mesh.name, position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), scale: mesh.scale.toArray(), morphs: mesh.morphTargetInfluences?.slice(),
  36  |         geometry: mesh.geometry.uuid, version: mesh.geometry.attributes.position.version, material: mesh.material.uuid, color: mesh.material.color?.getHex(), map: mesh.material.map?.uuid, normal: mesh.material.normalMap?.uuid }); });
  37  |       return { ...c._rhSnapshot(), parts, draw: w.lightDraw, environment: { background: scene.background.uuid || scene.background.getHex(), fog: [scene.fog.color.getHex(), scene.fog.near, scene.fog.far], exposure: w.lightRenderer.toneMappingExposure, roots: scene.children.map(o => [o.id, o.visible]) } };
  38  |     });
  39  |   }
  40  |   function frozen(a: any, b: any) {
  41  |     for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'gazeYaw', 'gazePitch', 'parts']) expect(b[key], key).toEqual(a[key]);
  42  |   }
  43  |   async function pixels(page: any, save: boolean) {
  44  |     return page.locator('[data-raptor-canvas]').evaluate((canvas: any, save: boolean) => {
  45  |       const w = window as any, copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
  46  |       const ctx = copy.getContext('2d')!; ctx.drawImage(canvas, 0, 0); const data = ctx.getImageData(0, 0, copy.width, copy.height).data;
  47  |       if (save) { w.lightPixels = data; return 0; }
  48  |       let changed = 0; for (let i = 0; i < data.length; i += 4) if (Math.abs(data[i] - w.lightPixels[i]) + Math.abs(data[i + 1] - w.lightPixels[i + 1]) + Math.abs(data[i + 2] - w.lightPixels[i + 2]) > 15) changed++;
  49  |       return changed;
  50  |     }, save);
  51  |   }
  52  |   async function inspect(page: any, region = 'wing') { await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption(region); }
  53  |   async function keep(page: any) { await page.getByRole('button', { name: 'Keep moment', exact: true }).click(); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled(); }
  54  | 
  55  |   for (const model of [{ species: 'peregrine', quality: 'high', region: 'wing' }, { species: 'greatHorned', quality: 'low', region: 'head' }])
  56  |     test(`reveals the frozen surface without changing habitat or geometry: ${model.species}`, async ({ page }) => {
  57  |       const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  58  |       await mount(page, model.species, model.quality); const flight = await snapshot(page); await inspect(page, model.region);
  59  |       const select = page.getByRole('combobox', { name: 'Studio light', exact: true }); await expect(select).toHaveValue('soft'); await expect(select).toBeEnabled();
  60  |       const soft = await snapshot(page); frozen(flight, soft); expect(soft.draw.lights).toHaveLength(3); expect(soft.environment).toEqual({ ...flight.environment, roots: soft.environment.roots });
  61  |       await pixels(page, true); await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-soft.png' });
  62  |       const modes: any[] = [];
  63  |       for (const mode of ['side', 'rim']) {
  64  |         await select.selectOption(mode); const lit = await snapshot(page); frozen(soft, lit);
  65  |         expect(lit.cameraPosition).toEqual(soft.cameraPosition); expect(lit.cameraQuaternion).toEqual(soft.cameraQuaternion); expect(lit.environment).toEqual(soft.environment);
  66  |         expect(lit.studyLighting).toBe(mode); expect(lit.draw.lights).toHaveLength(3); expect(lit.draw.calls).toBe(soft.draw.calls); expect(lit.draw.textures).toBe(soft.draw.textures); expect(lit.draw.geometries).toBe(soft.draw.geometries);
  67  |         const changed = await pixels(page, false); expect(changed).toBeGreaterThan(1000); modes.push({ mode, changed, draw: lit.draw });
  68  |         await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + model.species + '-' + mode + '.png' });
  69  |       }
  70  |       const renders = await page.evaluate(() => (window as any).lightRenders); await page.evaluate(() => (window as any).lightStep(60000)); expect(await page.evaluate(() => (window as any).lightRenders)).toBe(renders); frozen(soft, await snapshot(page));
  71  |       await page.locator('[data-raptor-canvas]').focus(); await page.keyboard.press('ArrowLeft'); const orbited = await snapshot(page);
  72  |       expect(orbited.draw.lights[0].position).not.toEqual(modes[1].draw.lights[0].position); frozen(soft, orbited);
  73  |       await page.getByRole('button', { name: 'Habitat', exact: true }).click(); await expect(select).toBeDisabled(); const habitat = await snapshot(page); expect(habitat.draw.lights).toHaveLength(0); await pixels(page, true);
  74  |       await page.getByRole('button', { name: 'Studio', exact: true }).click(); await expect(select).toHaveValue('rim'); await select.selectOption('side');
  75  |       await page.getByRole('button', { name: 'Habitat', exact: true }).click(); expect(await pixels(page, false)).toBeLessThan(30); expect((await snapshot(page)).cameraPosition).toEqual(habitat.cameraPosition);
  76  |       await page.getByRole('button', { name: 'Close study', exact: true }).click(); const restored = await snapshot(page); frozen(flight, restored);
  77  |       expect(restored.cameraPosition).toEqual(flight.cameraPosition); expect(restored.cameraQuaternion).toEqual(flight.cameraQuaternion); expect(restored.environment).toEqual(flight.environment);
  78  |       writeFileSync(output + '/' + model.species + '-lighting-checks.json', JSON.stringify({ soft: soft.draw, modes }, null, 2));
  79  |       expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  80  |     });
  81  | 
  82  |   test('matches light settings and preserves honest comparison context through notebook, export, and restoration', async ({ page }) => {
  83  |     await mount(page); await inspect(page); const select = page.getByRole('combobox', { name: 'Studio light', exact: true });
  84  |     await select.selectOption('side'); await keep(page); const first = (await state(page)).flightStudyMoments[0]; expect(first.view.lighting).toBe('side'); expect(first.presentationLabel).toBe('Studio side lighting');
  85  |     await select.selectOption('rim'); await expect(page.getByRole('button', { name: 'Moment kept', exact: true })).toBeDisabled(); // One capture per frozen instant still applies.
  86  |     await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click(); await page.evaluate(() => (window as any).lightStep(100)); await inspect(page);
  87  |     await expect(select).toHaveValue('rim'); await keep(page); expect((await state(page)).flightStudyMoments[1].view.lighting).toBe('rim');
  88  |     await page.getByRole('button', { name: 'Match saved view', exact: true }).click(); await expect(select).toHaveValue('side'); await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true');
  89  |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click(); await expect(page.locator('[data-study-camera-comparison]')).toContainText('different studio lights');
  90  |     await expect(page.locator('[data-study-moment=A] img')).toHaveAttribute('alt', /Studio side lighting/); await expect(page.locator('[data-study-moment=B] img')).toHaveAttribute('alt', /Studio rim lighting/);
  91  |     await page.locator('[data-study-moment=A] textarea').fill('Side lighting makes the feather ridges easier to trace. The rim light emphasizes the outer edge.');
  92  |     await page.locator('[data-study-moment=A]').getByRole('button', { name: 'Add to notebook', exact: true }).click(); expect((await state(page)).investigations.speed.evidence[0].reading.view.lighting).toBe('side');
  93  |     await page.locator('.rh-flight-moments').screenshot({ path: output + '/lighting-comparison.png' });
  94  |     const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download visual report', exact: true }).click(); const download = await pending; await download.saveAs(output + '/lighting-observations.html');
  95  |     const html = readFileSync((await download.path())!, 'utf8'); expect(html).toContain('Studio side lighting'); expect(html).toContain('Studio rim lighting'); expect(html).toContain('different studio lights'); expect(html).toContain(first.image);
  96  |     const saved = await page.evaluate(() => (window as any).__toolData); await harness.destroy(page); await page.evaluate(data => (window as any).__mount(data), saved);
  97  |     await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true); await page.locator('[data-raptor-study-button]').click();
  98  |     await page.getByRole('button', { name: 'Match saved view', exact: true }).click(); await expect(select).toHaveValue('side'); expect((await state(page)).flightStudyMoments[0].image).toBe(first.image);
  99  |     await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  100 |     await page.evaluate(() => { const w = window as any, moment = w.__toolData.raptorHunt.flightStudyMoments[0]; delete moment.view.lighting; w.__toolData.raptorHunt.flightStudyMoments = [moment]; w.__rerender(); });
  101 |     await page.locator('[data-raptor-study-button]').click(); await select.selectOption('rim'); await page.getByRole('button', { name: 'Match saved view', exact: true }).click(); await expect(select).toHaveValue('soft');
  102 |     for (const invalid of ['unknown', 1, { id: 'side' }]) {
  103 |       await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  104 |       await page.evaluate(value => { const w = window as any; w.__toolData.raptorHunt.flightStudyMoments[0].view.lighting = value; w.__rerender(); }, invalid);
  105 |       await page.locator('[data-raptor-study-button]').click(); await expect(page.locator('.rh-study-match')).toBeHidden();
  106 |     }
  107 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  108 |   });
  109 | 
  110 |   test('keeps short-phone and fullscreen inspection usable with keyboard, reduced motion, and forced colors', async ({ page }) => {
  111 |     await mount(page, 'greatHorned'); await inspect(page, 'head');
  112 |     await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 740 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  113 |     const select = page.getByRole('combobox', { name: 'Studio light', exact: true });
  114 |     await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
  115 |     await select.focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowDown'); await expect(select).toHaveValue('side');
  116 |     const layout = await page.locator('.rh-study-panel').evaluate(el => { const p = el.getBoundingClientRect(), header = document.querySelector('.rh-study-header')!.getBoundingClientRect(), stage = document.querySelector('[data-raptor-flight-stage]')!.getBoundingClientRect(); return { visibleBirdHeight: p.top - header.bottom, scrolls: el.scrollHeight > el.clientHeight, overflow: getComputedStyle(el).overflowY, fits: el.scrollWidth <= el.clientWidth + 1, within: p.bottom <= stage.bottom }; });
  117 |     expect(layout.visibleBirdHeight).toBeGreaterThan(130); expect(layout.scrolls).toBe(true); expect(layout.overflow).toBe('auto'); expect(layout.fits).toBe(true); expect(layout.within).toBe(true);
  118 |     expect(await select.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  119 |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-short-phone.png' });
  120 |     await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); expect(await page.evaluate(async () => (await (window as any).axe.run({ include: ['.rh-study-header', '.rh-study-panel'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map(v => v.id))).toEqual([]);
  121 |     await page.emulateMedia({ forcedColors: 'active' }); const colors = await select.evaluate(el => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]); expect(colors[0]).not.toBe(colors[1]); await page.emulateMedia({ forcedColors: 'none' });
  122 |     await page.setViewportSize({ width: 960, height: 560 }); await page.getByRole('button', { name: 'Toggle fullscreen flight view', exact: true }).click(); await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  123 |     await select.selectOption('rim'); await expect(select).toBeInViewport(); await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-short-fullscreen.png' }); await page.evaluate(() => document.exitFullscreen());
  124 |     await page.getByRole('button', { name: 'Restart this flight', exact: true }).click(); await expect.poll(() => page.locator('[data-raptor-canvas]').evaluate((c: any) => !!c._rhSnapshot)).toBe(true);
> 125 |     await expect(select).toHaveCount(1); await page.locator('[data-raptor-study-button]').click(); await expect(select).toHaveValue('soft');
      |                          ^ Error: expect(locator).toHaveCount(expected) failed
  126 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  127 |   });
  128 | });
  129 | 
```