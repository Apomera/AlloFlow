# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> energy orbit: reduced-motion zero shaking, landscape tools and deliberate graphics recovery
- Location: tests\e2e\26-bridgelab-gl.spec.ts:1357:7

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 233
Received:    236
```

# Test source

```ts
  1209 |       await expect(page.locator('[data-bridge-motion-guide]')).toHaveCount(0);
  1210 |       await checkWorkflowHealth(page);
  1211 |     });
  1212 |   }
  1213 | 
  1214 |   for (const width of [1000, 320]) {
  1215 |     test('key moments: selected trial peaks, compact controls and fullscreen at ' + width + 'px', async ({ page }) => {
  1216 |       await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
  1217 |         seismicGuideOpen: true, seismicTime: 7, crossSectionMm2: 30000, lateralBraceEvery: 1,
  1218 |         seismicObservation: 'Keep this comparison.' });
  1219 |       const stage = page.locator('[data-allo-fs-stage]');
  1220 |       const select = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
  1221 |       const readout = page.locator('[data-bridge-scene-readout]');
  1222 |       const replay = page.locator('[data-bridge-scene-replay]');
  1223 |       async function checkOverlayFit() {
  1224 |         const panel = await replay.boundingBox(), measurements = await readout.boundingBox();
  1225 |         if (!panel || !measurements) throw new Error('Scene controls missing');
  1226 |         expect(measurements.y + measurements.height).toBeLessThanOrEqual(panel.y - 4);
  1227 |         expect(await replay.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  1228 |         const containers = await stage.boundingBox();
  1229 |         if (!containers) throw new Error('Stage missing');
  1230 |         expect(panel.x).toBeGreaterThan(containers.x);
  1231 |         expect(panel.x + panel.width).toBeLessThan(containers.x + containers.width);
  1232 |       }
  1233 |       await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
  1234 |       await stage.scrollIntoViewIfNeeded();
  1235 |       const before = await page.evaluate(() => (window as any).__gl());
  1236 |       const bTime = Number(await select.locator('option[value="motion"]').getAttribute('data-moment-time'));
  1237 |       await page.getByRole('button', { name: 'A · reference', exact: true }).click();
  1238 |       const aTime = Number(await select.locator('option[value="motion"]').getAttribute('data-moment-time'));
  1239 |       expect(aTime).not.toBe(bTime);
  1240 |       await select.selectOption('motion');
  1241 |       expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(aTime);
  1242 |       expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  1243 |       await expect(page.locator('[data-bridge-moment-insight="motion"]')).toHaveAttribute('data-moment-trial', 'reference');
  1244 |       await page.getByRole('button', { name: 'B · current', exact: true }).click();
  1245 |       expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(aTime);
  1246 |       await expect(select).toHaveValue('');
  1247 |       await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
  1248 |       await select.selectOption('motion');
  1249 |       expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(bTime);
  1250 |       expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  1251 |       await checkOverlayFit();
  1252 |       await captureImmersiveRegion(page, stage, 'bridge-' + width + '-key-moments-inline.png');
  1253 |       await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  1254 |       await checkBridgeCanvasFillsStage(page);
  1255 |       await checkOverlayFit();
  1256 |       await page.locator('[data-bridge-scene-energy] > summary').press('Enter');
  1257 |       await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-key-moments-fullscreen.png') });
  1258 |       await readout.locator(':scope > summary').press('Enter');
  1259 |       await select.selectOption('free');
  1260 |       await expect(readout).toContainText('16.00 s');
  1261 |       await expect(select).not.toHaveAttribute('aria-describedby');
  1262 |       await readout.locator(':scope > summary').press('Enter');
  1263 |       await expect(page.locator('[data-bridge-moment-insight="free"]')).toContainText('Ground motion has ended');
  1264 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  1265 |       await select.focus();
  1266 |       await select.press('End');
  1267 |       await select.press('Tab');
  1268 |       await expect(select).toHaveValue('end');
  1269 |       await expect(page.locator('[data-bridge-moment-insight="end"]')).toContainText('does not mean the deck has settled');
  1270 |       await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
  1271 |       await checkOverlayFit();
  1272 |       expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
  1273 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeObserver)).toBe('bank');
  1274 |       expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Keep this comparison.');
  1275 |       await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  1276 |       await checkWorkflowHealth(page);
  1277 |     });
  1278 |   }
  1279 | 
  1280 |   test('key moments: zero-input boundaries and precise manual time remain usable', async ({ page }) => {
  1281 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  1282 |     await mountWorkflow(page, 320, { bridgeView: 'immersive', seismicEnabled: true, seismicIntensityG: 0, seismicTime: 5 });
  1283 |     const select = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
  1284 |     await expect(select.locator('option[value="motion"]')).toBeDisabled();
  1285 |     await expect(select.locator('option[value="acceleration"]')).toBeDisabled();
  1286 |     await select.selectOption('free');
  1287 |     await expect(page.locator('[data-bridge-moment-insight]')).toContainText('No ground motion was applied');
  1288 |     await expect(page.locator('[data-bridge-moment-insight]')).toContainText('0.000 J/kg');
  1289 |     await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('ArrowRight');
  1290 |     await expect(select).toHaveValue('');
  1291 |     await expect(page.locator('[data-bridge-moment-insight]')).toHaveCount(0);
  1292 |     expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(16.05);
  1293 |     await select.selectOption('end');
  1294 |     expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(24);
  1295 |     await checkWorkflowHealth(page);
  1296 |   });
  1297 | 
  1298 | 
  1299 |   async function inspectWholeOrbit(page: Page) {
  1300 |     const plot=page.locator('[data-bridge-energy-orbit="scene"] [data-orbit-plot]');
  1301 |     await plot.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
  1302 |     const bounds=await plot.evaluate(node=>{
  1303 |       const drawer=node.closest('[data-bridge-scene-drawer]')!;
  1304 |       const summary=drawer.querySelector('summary')!;
  1305 |       const p=node.getBoundingClientRect(),d=drawer.getBoundingClientRect(),s=summary.getBoundingClientRect();
  1306 |       return {top:p.top,headerBottom:s.bottom,bottom:p.bottom,drawerBottom:d.bottom,height:p.height,width:p.width};
  1307 |     });
  1308 |     expect(bounds.top).toBeGreaterThanOrEqual(bounds.headerBottom);
> 1309 |     expect(bounds.bottom).toBeLessThanOrEqual(bounds.drawerBottom-6);
       |                           ^ Error: expect(received).toBeLessThanOrEqual(expected)
  1310 |     expect(bounds.height).toBeGreaterThanOrEqual(160);
  1311 |   }
  1312 | 
  1313 |   for(const size of [{width:1000,height:800},{width:320,height:568}]){
  1314 |     test('energy orbit: paired cycles, fixed curves, saved evidence and fullscreen at '+size.width+'px',async ({page})=>{
  1315 |       await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,seismicEnergyOrbit:true,crossSectionMm2:30000,lateralBraceEvery:1});
  1316 |       await page.setViewportSize(size);await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
  1317 |       await page.evaluate(()=>(window as any).__set({seismicTime:7.217}));
  1318 |       const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
  1319 |       const before=await page.evaluate(()=>(window as any).__gl());
  1320 |       await page.getByRole('button',{name:'Focus scene',exact:true}).click();await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
  1321 |       const drawer=page.locator('[data-bridge-scene-drawer]'),summary=drawer.locator('summary').first();await summary.press('Enter');
  1322 |       const orbit=page.locator('[data-bridge-energy-orbit="scene"]'),plot=orbit.locator('[data-orbit-plot]');
  1323 |       await plot.scrollIntoViewIfNeeded();await expect(plot).toBeVisible();await expect(orbit.locator('[data-orbit-marker]')).toHaveCount(2);
  1324 |       const range=await orbit.locator('[data-orbit-frame]').getAttribute('data-orbit-limit');
  1325 |       const curves=await orbit.locator('[data-orbit-free]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')));
  1326 |       expect(curves[0]).not.toBe(curves[1]);expect(curves.join(' ')).not.toMatch(/NaN|Infinity/);
  1327 |       const next=page.getByRole('button',{name:'Next turning point',exact:true}),turn=Number(await next.getAttribute('data-orbit-next-time'));await next.click();
  1328 |       expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(turn);
  1329 |       await expect(orbit.locator('[data-orbit-insight]')).toHaveAttribute('data-orbit-insight','turning');
  1330 |       expect(Number(await orbit.locator('[data-orbit-energy="kinetic"]').getAttribute('data-orbit-value'))).toBeLessThan(1e-20);
  1331 |       await page.getByRole('button',{name:'Next center crossing',exact:true}).click();
  1332 |       await expect(orbit.locator('[data-orbit-insight]')).toHaveAttribute('data-orbit-insight','crossing');
  1333 |       expect(Number(await orbit.locator('[data-orbit-energy="elastic"]').getAttribute('data-orbit-value'))).toBeLessThan(1e-20);
  1334 |       await page.getByRole('button',{name:'A · reference',exact:true}).click();
  1335 |       await expect(orbit.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-trial','reference');await expect(orbit.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-limit',range!);
  1336 |       await page.getByRole('button',{name:'Next turning point',exact:true}).click();
  1337 |       const time=await page.evaluate(()=>(window as any).__bucket().seismicTime);
  1338 |       expect(await orbit.locator('[data-orbit-free]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('points')))).toEqual(curves);
  1339 |       await inspectWholeOrbit(page);await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-energy-orbit.png')});
  1340 |       expect(await drawer.evaluate(el=>el.scrollWidth-el.clientWidth)).toBeLessThanOrEqual(1);
  1341 |       await next.focus();await next.press('Escape');await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
  1342 |       await expect(page.locator('[data-bridge-compact-orbit]')).toContainText('J/kg');
  1343 |       await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'-orbit-scene.png')});
  1344 |       await summary.press('Enter');await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
  1345 |       await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('At a turning point the deck has no relative velocity.');await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
  1346 |       const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);expect(saved.scene.display.energyOrbit).toBe(true);expect(saved.timeS).toBe(time);
  1347 |       await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
  1348 |       await page.evaluate(()=>(window as any).__set({seismicEnergyOrbit:false,seismicTime:0,bridgeView:'2d',seismicDampingRatio:0.3}));
  1349 |       await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
  1350 |       expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicEnergyOrbit:true,seismicTime:time,seismicPlaying:false,seismicSceneTrial:'reference'});
  1351 |       const evidence=await page.locator('[data-seismic-scene-orbit]').textContent();
  1352 |       await page.getByRole('button',{name:'Open earthquake evidence report',exact:true}).click();
  1353 |       await expect(page.locator('[data-bridge-print-seismic] [data-seismic-scene-orbit]')).toHaveText(evidence!);
  1354 |       await expect(page.locator('[data-bridge-print-seismic]').locator('button,input,select,textarea')).toHaveCount(0);await checkWorkflowHealth(page);
  1355 |     });
  1356 |   }
  1357 |   test('energy orbit: reduced-motion zero shaking, landscape tools and deliberate graphics recovery',async ({page})=>{
  1358 |     await page.emulateMedia({reducedMotion:'reduce'});
  1359 |     await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:16,seismicIntensityG:0,seismicEnergyOrbit:true,seismicSceneFocus:true,seismicReadoutCollapsed:true,crossSectionMm2:30000,lateralBraceEvery:1});
  1360 |     await page.setViewportSize({width:844,height:390});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
  1361 |     await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
  1362 |     const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
  1363 |     const orbit=page.locator('[data-bridge-energy-orbit="scene"]');await inspectWholeOrbit(page);
  1364 |     await expect(page.getByRole('button',{name:'Next turning point',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Next center crossing',exact:true})).toBeDisabled();
  1365 |     await expect(orbit.locator('[data-orbit-insight]')).toContainText('No shaking');
  1366 |     expect(await orbit.locator('[data-orbit-energy]').evaluateAll(rows=>rows.every(row=>Number(row.getAttribute('data-orbit-value'))===0))).toBe(true);
  1367 |     await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-844-orbit-zero.png')});
  1368 |     await page.getByRole('button',{name:'Next turning point',exact:true}).focus();
  1369 |     await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;const context=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=context?.getExtension('WEBGL_lose_context');if(!extension)throw new Error('No context loss extension');(window as any).__orbitLoss=extension;extension.loseContext();});
  1370 |     await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
  1371 |     const fallback=page.locator('[data-bridge-energy-orbit="fallback"]');await expect(fallback).toHaveAttribute('open','');await expect(fallback.locator('[data-orbit-frame]')).toHaveAttribute('data-orbit-trial','current');
  1372 |     await page.evaluate(()=>(window as any).__orbitLoss.restoreContext());await expect.poll(()=>page.evaluate(()=>(window as any).__gl().state)).toBe('ready');
  1373 |     expect(await page.evaluate(()=>(window as any).__bucket().bridgeView)).toBe('2d');await page.getByRole('button',{name:'From the riverbank',exact:true}).click();
  1374 |     expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicEnergyOrbit:true,seismicPlaying:false,seismicTime:16});await checkWorkflowHealth(page);
  1375 |   });
  1376 |   test('energy orbit: undamped free-vibration inspection in the labelled 2D view',async ({page})=>{
  1377 |     await page.emulateMedia({reducedMotion:'reduce'});await mountWorkflow(page,1000,{bridgeView:'3d',seismicEnabled:true,seismicTime:16,seismicDampingRatio:0,seismicEnergyOrbit:true});
  1378 |     await page.getByRole('button',{name:'Labelled 2D view',exact:true}).click();
  1379 |     const orbit=page.locator('[data-bridge-energy-orbit="fallback"]');await expect(orbit.locator('[data-orbit-insight]')).toContainText('undamped');
  1380 |     const before=Number(await orbit.locator('[data-orbit-energy="stored"]').getAttribute('data-orbit-value'));
  1381 |     await page.getByRole('button',{name:'Next turning point',exact:true}).click();await expect(orbit.locator('[data-orbit-insight]')).toHaveAttribute('data-orbit-insight','turning');
  1382 |     await page.getByRole('button',{name:'Next center crossing',exact:true}).click();const after=Number(await orbit.locator('[data-orbit-energy="stored"]').getAttribute('data-orbit-value'));
  1383 |     expect(Math.abs(after-before)/before).toBeLessThan(0.01);expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
  1384 |     await captureImmersiveRegion(page,orbit,'bridge-1000-orbit-2d.png',ENHANCEMENT_REPORT);await checkWorkflowHealth(page);
  1385 |   });
  1386 | 
  1387 |   test('force lens: selected A/B vectors, fixed scale and stable resources in the riverbank scene',async ({page})=>{
  1388 |     await mountWorkflow(page,1000,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1});
  1389 |     await page.setViewportSize({width:1000,height:800});
  1390 |     await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
  1391 |     await page.evaluate(()=>(window as any).__set({seismicTime:7.217}));
  1392 |     const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
  1393 |     const lens=page.locator('[data-bridge-force-lens="scene"]');
  1394 |     await lens.locator('summary').press('Enter');
  1395 |     await expect(lens).toHaveAttribute('open','');
  1396 |     await stage.scrollIntoViewIfNeeded();
  1397 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceLensVisible)).toBe(true);
  1398 |     const before=await page.evaluate(()=>(window as any).__gl());
  1399 |     expect(before.forceTrial).toBe('current');expect(before.forceVectors).toHaveLength(3);
  1400 |     const values=await lens.locator('[data-force-reading]').evaluateAll(rows=>rows.map(row=>Number(row.getAttribute('data-force-value'))));
  1401 |     expect(values).toEqual(before.forceVectors.map((v:any)=>v.valueNPerKg));expect(values[0]+values[1]).toBeCloseTo(values[2],10);
  1402 |     await page.getByRole('button',{name:'A · reference',exact:true}).click();await stage.scrollIntoViewIfNeeded();
  1403 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().forceTrial)).toBe('reference');
  1404 |     const a=await page.evaluate(()=>(window as any).__gl());expect(a.forceLimitNPerKg).toBe(before.forceLimitNPerKg);
  1405 |     expect(a.forceVectors.map((v:any)=>v.valueNPerKg)).not.toEqual(values);
  1406 |     await expect(page.locator('[data-force-frame]')).toHaveAttribute('data-force-trial','reference');
  1407 |     await page.getByRole('button',{name:'Focus scene',exact:true}).click();
  1408 |     await expect(page.locator('[data-bridge-compact-forces]')).toContainText('N/kg');
  1409 |     await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();await checkBridgeCanvasFillsStage(page);
```