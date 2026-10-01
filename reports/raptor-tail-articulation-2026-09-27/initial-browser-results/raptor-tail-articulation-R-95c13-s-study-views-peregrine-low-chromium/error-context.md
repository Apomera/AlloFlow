# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: raptor-tail-articulation.spec.ts >> Raptor articulated tail feathers >> fans without stretching and preserves study views: peregrine low
- Location: tests\e2e\raptor-tail-articulation.spec.ts:59:10

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Match saved view', exact: true })

```

# Test source

```ts
  18  |       Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  19  |       performance.now = () => time;
  20  |       window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; }; window.cancelAnimationFrame = key => frames.delete(key);
  21  |       (window as any).fanStep = (ms: number) => { time += ms; const pending = [...frames.values()]; frames.clear(); pending.forEach(cb => cb(time)); };
  22  |     });
  23  |   });
  24  |   async function snapshot(page: any) {
  25  |     return page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  26  |       const w = window as any, tail = w.fanScene.getObjectByName('fan-tail-silhouette');
  27  |       return { ...c._rhSnapshot(), tailScale: tail.scale.toArray(), tailMorphs: tail.morphTargetInfluences.slice() };
  28  |     });
  29  |   }
  30  |   function frozen(a: any, b: any) {
  31  |     for (const key of ['motionTimeMs', 'raptorPosition', 'headingRadians', 'pitchRadians', 'wingAngle', 'speedMps', 'stamina', 'tailScale', 'tailMorphs']) expect(b[key], key).toEqual(a[key]);
  32  |   }
  33  |   async function inspect(page: any) {
  34  |     await page.locator('[data-raptor-study-button]').click(); await page.getByRole('combobox', { name: 'Inspect', exact: true }).selectOption('tail');
  35  |   }
  36  |   async function fit(page: any) {
  37  |     return page.evaluate(() => {
  38  |       const w = window as any, T = w.THREE, tail = w.fanScene.getObjectByName('fan-tail-silhouette'), p = tail.geometry.attributes.position;
  39  |       tail.updateWorldMatrix(true, false);
  40  |       const points = Array.from({ length: p.count }, (_, i) => {
  41  |         const base = new T.Vector3().fromBufferAttribute(p, i), v = base.clone();
  42  |         tail.geometry.morphAttributes.position.forEach((target, j) => v.addScaledVector(new T.Vector3().fromBufferAttribute(target, i).sub(base), tail.morphTargetInfluences[j]));
  43  |         return v.applyMatrix4(tail.matrixWorld).project(w.fanCamera);
  44  |       });
  45  |       const stage = document.querySelector('[data-raptor-flight-stage]')!.getBoundingClientRect(), panel = document.querySelector('.rh-study-panel')!.getBoundingClientRect(), header = document.querySelector('.rh-study-header')!.getBoundingClientRect();
  46  |       return { left: (1 + Math.min(...points.map(p => p.x))) * stage.width / 2, right: (1 + Math.max(...points.map(p => p.x))) * stage.width / 2,
  47  |         top: (1 - Math.max(...points.map(p => p.y))) * stage.height / 2, bottom: (1 - Math.min(...points.map(p => p.y))) * stage.height / 2,
  48  |         width: stage.width, panelTop: panel.top - stage.top, headerBottom: header.bottom - stage.top };
  49  |     });
  50  |   }
  51  |   function fits(bounds: any) {
  52  |     expect(bounds.left).toBeGreaterThan(8); expect(bounds.right).toBeLessThan(bounds.width - 8);
  53  |     expect(bounds.top).toBeGreaterThan(bounds.headerBottom); expect(bounds.bottom).toBeLessThan(bounds.panelTop - 8);
  54  |     expect(bounds.right - bounds.left).toBeGreaterThan(90);
  55  |   }
  56  |   for (const model of [
  57  |     { species: 'peregrine', quality: 'low' }, { species: 'redTail', quality: 'high' },
  58  |     { species: 'greatHorned', quality: 'low' }, { species: 'osprey', quality: 'high' }
  59  |   ]) test(`fans without stretching and preserves study views: ${model.species} ${model.quality}`, async ({ page }) => {
  60  |     const errors: string[] = [], label = model.species + '-' + model.quality;
  61  |     page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  62  |     await harness.mount(page, { raptorHunt: { activeSection: 'hunt', activeMission: 'open', selectedSpecies: model.species,
  63  |       flightSession: { speciesId: model.species, missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: model.quality,
  64  |       activeInvestigation: 'speed', investigations: { speed: { prediction: 'The tail will spread farther when I pull up.' } }
  65  |     } }, "document.querySelector('[data-raptor-canvas]')?._rhSnapshot");
  66  |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => {
  67  |       c._rhCommand('environment', { windSpeed: 0, dayPhase: 0.44, cloudCover: 0.15 }); for (let i = 0; i < 8; i++) (window as any).fanStep(25);
  68  |     });
  69  |     const structure = await page.evaluate(() => {
  70  |       const w = window as any, T = w.THREE, tail = w.fanScene.getObjectByName('fan-tail-silhouette'), g = tail.geometry, p = g.attributes.position;
  71  |       w.fanTail = tail; w.fanMaterial = tail.material;
  72  |       const poses = [p, ...g.morphAttributes.position], stride = p.count / 12, point = (attr, i) => new T.Vector3().fromBufferAttribute(attr, i);
  73  |       let maxLengthError = 0, maxWidthError = 0, maxRootError = 0, minArea = Infinity;
  74  |       for (let f = 0; f < 12; f++) {
  75  |         const root = f * stride + 1, tip = (f + 1) * stride - 1, sample = f * stride + 6;
  76  |         for (const pose of poses) {
  77  |           maxRootError = Math.max(maxRootError, point(pose, root).distanceTo(point(p, root)));
  78  |           maxLengthError = Math.max(maxLengthError, Math.abs(point(pose, tip).distanceTo(point(pose, root)) - point(p, tip).distanceTo(point(p, root))));
  79  |           maxWidthError = Math.max(maxWidthError, Math.abs(point(pose, sample).distanceTo(point(pose, sample + 2)) - point(p, sample).distanceTo(point(p, sample + 2))));
  80  |         }
  81  |       }
  82  |       for (const pose of poses) for (let i = 0; i < g.index.count; i += 3) {
  83  |         const a = point(pose, g.index.getX(i)), b = point(pose, g.index.getX(i + 1)), c = point(pose, g.index.getX(i + 2));
  84  |         minArea = Math.min(minArea, b.sub(a).cross(c.sub(a)).length());
  85  |       }
  86  |       const widths = poses.map(attr => { const x = Array.from({ length: attr.count }, (_, i) => attr.getX(i)); return Math.max(...x) - Math.min(...x); });
  87  |       const vanes = tail.parent.getObjectByName('layered-flight-feathers--1').material;
  88  |       return { vertices: p.count, triangles: g.index.count / 3, poses: g.morphAttributes.position.map(attr => attr.name), widths,
  89  |         maxRootError, maxLengthError, maxWidthError, minArea,
  90  |         finite: [...poses, g.attributes.normal, g.attributes.uv, g.attributes.rhTailAlong, ...g.morphAttributes.normal].every(attr => Array.from(attr.array).every(Number.isFinite)),
  91  |         normalError: Math.max(...[g.attributes.normal, ...g.morphAttributes.normal].flatMap(attr => Array.from({ length: attr.count }, (_, i) => Math.abs(point(attr, i).length() - 1)))),
  92  |         version: [p.version, ...g.morphAttributes.position.map(attr => attr.version)],
  93  |         textures: [tail.material.map.uuid, tail.material.normalMap.uuid, tail.material.roughnessMap.uuid],
  94  |         shared: tail.material.map === vanes.map && tail.material.normalMap === vanes.normalMap && tail.material.roughnessMap === vanes.roughnessMap,
  95  |         bands: !!tail.material.userData.tailBandsCompiled, children: tail.children.length };
  96  |     });
  97  |     expect(structure.vertices).toBe(model.quality === 'low' ? 264 : 408); expect(structure.children).toBe(0); expect(structure.shared).toBe(true);
  98  |     expect(structure.poses).toEqual(['resting-fan', 'wide-fan', 'narrow-fan']); expect(structure.finite).toBe(true); expect(structure.normalError).toBeLessThan(1e-6);
  99  |     expect(structure.maxRootError).toBe(0); expect(structure.maxWidthError).toBeLessThan(1e-6); expect(structure.maxLengthError).toBeLessThan(1e-6); expect(structure.minArea).toBeGreaterThan(1e-8);
  100 |     expect(structure.widths[1]).toBeLessThan(structure.widths[3]); expect(structure.widths[3]).toBeLessThan(structure.widths[0] * .95); expect(structure.widths[2]).toBeGreaterThan(structure.widths[0] * 1.08);
  101 |     expect(structure.bands).toBe(model.species !== 'redTail'); writeFileSync(output + '/' + label + '-geometry.json', JSON.stringify(structure, null, 2));
  102 |     const flying = await snapshot(page); expect(flying.tailScale).toEqual([1, 1, 1]);
  103 |     await inspect(page); fits(await fit(page)); frozen(flying, await snapshot(page)); await expect(page.locator('#rh-study-observation-copy')).toContainText('rounded tip');
  104 |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-glide.png' });
  105 |     await page.getByRole('button', { name: 'Keep moment', exact: true }).click();
  106 |     const first = await page.evaluate(() => (window as any).__toolData.raptorHunt.flightStudyMoments[0]); expect(first.view.focus).toBe('tail');
  107 |     const flightPoses: any[] = [];
  108 |     for (const maneuver of [{ key: ' ', name: 'wide', index: 1 }, { key: 'shift', name: 'narrow', index: 2 }]) {
  109 |       await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
  110 |       const transition = await page.locator('[data-raptor-canvas]').evaluate((c: any, key) => {
  111 |         const w = window as any; w.fanSkipRender = true; c._rhCommand('hold', { key, pressed: true }); w.fanStep(25);
  112 |         const first = w.fanTail.morphTargetInfluences.slice(); for (let i = 0; i < 39; i++) w.fanStep(25);
  113 |         w.fanSkipRender = false; w.fanStep(25); return first;
  114 |       }, maneuver.key);
  115 |       expect(transition[maneuver.index]).toBeLessThan(.3);
  116 |       const pose = await snapshot(page); expect(pose.tailMorphs[maneuver.index]).toBeGreaterThan(.999); expect(pose.tailMorphs[0]).toBe(0); expect(pose.tailScale).toEqual([1, 1, 1]);
  117 |       flightPoses.push({ name: maneuver.name, pose }); await inspect(page); fits(await fit(page)); frozen(pose, await snapshot(page));
> 118 |       await page.getByRole('button', { name: 'Match saved view', exact: true }).click(); await expect(page.locator('.rh-study-match')).toHaveAttribute('data-matched', 'true'); fits(await fit(page));
      |                                                                                 ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  119 |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-' + maneuver.name + '.png' });
  120 |       if (maneuver.name === 'wide') await page.getByRole('button', { name: 'Keep moment', exact: true }).click();
  121 |     }
  122 |     const paused = await snapshot(page), renders = await page.evaluate(() => (window as any).fanRenders);
  123 |     await page.evaluate(() => (window as any).fanStep(60000)); frozen(paused, await snapshot(page)); expect(await page.evaluate(() => (window as any).fanRenders)).toBe(renders);
  124 |     if (model.species === 'peregrine') {
  125 |       await page.getByRole('button', { name: 'Review kept moments', exact: true }).click();
  126 |       await expect(page.locator('[data-study-camera-comparison]')).toContainText('inspected region match');
  127 |       await page.locator('[data-study-moment=B] textarea').fill('During the pull-up, the tail feathers fan farther apart. Their rounded tips remain visible.');
  128 |       await page.locator('[data-study-moment=B]').getByRole('button', { name: 'Add to notebook', exact: true }).click();
  129 |       expect(await page.evaluate(() => (window as any).__toolData.raptorHunt.investigations.speed.evidence[0].reading.view.focus)).toBe('tail');
  130 |       await page.locator('.rh-flight-moments').screenshot({ path: output + '/tail-comparison.png' });
  131 |       await page.locator('[data-raptor-study-button]').click(); await page.getByRole('button', { name: 'Match saved view', exact: true }).click();
  132 |     }
  133 |     if (model.species === 'greatHorned') {
  134 |       await page.addStyleTag({ content: '#wrap{width:390px}' }); await page.setViewportSize({ width: 390, height: 1000 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  135 |       await expect.poll(() => page.locator('.rh-study-panel').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1); fits(await fit(page));
  136 |       await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/owl-phone.png' });
  137 |     }
  138 |     await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
  139 |     await page.locator('[data-raptor-canvas]').evaluate((c: any, species) => {
  140 |       const w = window as any; w.fanSkipRender = true;
  141 |       if (species === 'osprey') { c._rhCommand('assist'); c._rhCommand('hold', { key: 'q', pressed: true }); for (let i = 0; i < 400 && !c._rhSnapshot().landed; i++) w.fanStep(50); c._rhCommand('hold', { key: 'q', pressed: false }); }
  142 |       else c._rhCommand('perchPractice');
  143 |       for (let i = 0; i < 45; i++) w.fanStep(25); w.fanSkipRender = false; w.fanStep(25);
  144 |     }, model.species);
  145 |     const resting = await snapshot(page); expect(resting.landed).toBe(true); expect(resting.tailMorphs[0]).toBeGreaterThan(.999); expect(resting.tailMorphs[1] + resting.tailMorphs[2]).toBeLessThan(.001);
  146 |     await inspect(page); fits(await fit(page)); frozen(resting, await snapshot(page)); await expect(page.locator('#rh-study-observation-copy')).toContainText('overlapping tail feathers');
  147 |     await page.locator('[data-raptor-flight-stage]').screenshot({ path: output + '/' + label + '-rest.png' });
  148 |     await page.getByRole('button', { name: 'Resume from this moment', exact: true }).click();
  149 |     await page.locator('[data-raptor-canvas]').evaluate((c: any) => { const w = window as any; w.fanSkipRender = true; c._rhCommand('hold', { key: ' ', pressed: true }); for (let i = 0; i < 35; i++) w.fanStep(25); c._rhCommand('hold', { key: ' ', pressed: false }); w.fanSkipRender = false; w.fanStep(25); });
  150 |     const takeoff = await snapshot(page); expect(takeoff.landed).toBe(false); expect(takeoff.tailMorphs[0]).toBeLessThan(.003); expect(takeoff.tailScale).toEqual([1, 1, 1]);
  151 |     const after = await page.evaluate(() => { const w = window as any, tail = w.fanTail, g = tail.geometry; return { version: [g.attributes.position.version, ...g.morphAttributes.position.map(attr => attr.version)], textures: [tail.material.map.uuid, tail.material.normalMap.uuid, tail.material.roughnessMap.uuid], sameMaterial: tail.material === w.fanMaterial }; });
  152 |     expect(after).toEqual({ version: structure.version, textures: structure.textures, sameMaterial: true });
  153 |     writeFileSync(output + '/' + label + '-motion.json', JSON.stringify({ flying, flightPoses, resting, takeoff }, null, 2));
  154 |     expect(errors).toEqual([]); expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  155 |   });
  156 | });
  157 | 
```