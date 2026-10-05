# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> scene focus: paired drawer, compact replay and stable graphics at 1000x800
- Location: tests\e2e\26-bridgelab-gl.spec.ts:1299:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Object {
-   "geometries": 159,
+   "geometries": 160,
    "textures": 1,
  }
```

# Test source

```ts
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
  1298 |   for (const size of [{width:1000,height:800},{width:320,height:568},{width:844,height:390}]) {
  1299 |     test('scene focus: paired drawer, compact replay and stable graphics at '+size.width+'x'+size.height,async ({page})=>{
  1300 |       await mountWorkflow(page,size.width,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicGuideOpen:true,
  1301 |         crossSectionMm2:30000,lateralBraceEvery:1,seismicObservation:'Keep the comparison.'});
  1302 |       await page.setViewportSize(size);
  1303 |       await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
  1304 |       const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
  1305 |       await page.getByRole('button',{name:'A · reference',exact:true}).click();
  1306 |       await page.getByRole('combobox',{name:'Scene key moments',exact:true}).selectOption('motion');
  1307 |       await page.getByRole('button',{name:'B · current',exact:true}).click();
  1308 |       const time=await page.evaluate(()=>(window as any).__bucket().seismicTime);
  1309 |       await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
  1310 |       const before=await page.evaluate(()=>(window as any).__gl());
  1311 |       const focusBox=await page.getByRole('button',{name:'Focus scene',exact:true}).boundingBox();
  1312 |       const initialPanel=await page.locator('[data-bridge-scene-readout]').boundingBox();
  1313 |       if(!focusBox||!initialPanel)throw new Error('Scene controls missing');
  1314 |       expect(focusBox.x).toBeGreaterThanOrEqual(initialPanel.x+initialPanel.width+3);
  1315 |       await page.getByRole('button',{name:'Focus scene',exact:true}).click();
  1316 |       await expect(stage).toHaveAttribute('data-bridge-scene-focus','true');
  1317 |       const drawer=page.locator('[data-bridge-scene-drawer]');
  1318 |       await expect(drawer).not.toHaveAttribute('open');
  1319 |       await expect(page.locator('[data-bridge-compact-comparison]')).toHaveAttribute('data-bridge-compact-comparison',String(time));
  1320 |       await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
  1321 |       await checkBridgeCanvasFillsStage(page);
  1322 |       const replay=page.locator('[data-bridge-focus-replay]');
  1323 |       const a=await drawer.boundingBox(),b=await replay.boundingBox();
  1324 |       if(!a||!b)throw new Error('Focus panels missing');expect(a.y+a.height).toBeLessThanOrEqual(b.y-4);
  1325 |       expect(await replay.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
  1326 |       await expect(page.getByRole('combobox',{name:'Scene key moments',exact:true})).toHaveCount(0);
  1327 |       await expect(page.getByRole('slider',{name:'Scene replay time (s)',exact:true})).toHaveCount(1);
  1328 |       await page.getByRole('button',{name:'Step scene backward 0.5 s',exact:true}).click();
  1329 |       expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeCloseTo(time-0.5,9);
  1330 |       await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
  1331 |       expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeCloseTo(time,9);
  1332 |       const warm=await page.evaluate(()=>(window as any).__gl());
> 1333 |       expect(warm.sceneBuilds).toBe(before.sceneBuilds);expect(warm.resources).toEqual(before.resources);
       |                                                                                ^ Error: expect(received).toEqual(expected) // deep equality
  1334 |       await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'x'+size.height+'-focus-scene.png')});
  1335 |       const summary=drawer.locator('summary').first();
  1336 |       await summary.press('Enter');await expect(drawer).toHaveAttribute('open','');
  1337 |       await expect(page.getByRole('combobox',{name:'Scene key moments',exact:true})).toBeVisible();
  1338 |       const expanded=await drawer.boundingBox(),replayBox=await replay.boundingBox();
  1339 |       if(!expanded||!replayBox)throw new Error('Focus drawer missing');expect(expanded.y+expanded.height).toBeLessThanOrEqual(replayBox.y-4);
  1340 |       expect(await drawer.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
  1341 |       expect(await page.evaluate(()=>(window as any).__bucket().seismicPlaying)).toBe(false);
  1342 |       await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-'+size.width+'x'+size.height+'-focus-tools.png')});
  1343 |       await page.getByRole('combobox',{name:'Scene key moments',exact:true}).selectOption('end');
  1344 |       expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBe(24);
  1345 |       await summary.press('Enter');await expect(drawer).not.toHaveAttribute('open');
  1346 |       await page.getByRole('button',{name:'Leave scene focus',exact:true}).click();
  1347 |       await expect(stage).toHaveAttribute('data-bridge-scene-focus','false');
  1348 |       await expect(page.getByRole('combobox',{name:'Scene key moments',exact:true})).toHaveCount(1);
  1349 |       expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
  1350 |       expect(await page.evaluate(()=>(window as any).__bucket().seismicObservation)).toBe('Keep the comparison.');
  1351 |       await checkWorkflowHealth(page);
  1352 |     });
  1353 |   }
  1354 | 
  1355 |   test('scene focus: fullscreen touch walking and complete observation restoration on a phone',async ({page})=>{
  1356 |     await mountWorkflow(page,320,{bridgeView:'immersive',bridgeObserver:'deck',bridgeWalkPos:0.45,seismicEnabled:true,
  1357 |       seismicGuideOpen:true,crossSectionMm2:30000,lateralBraceEvery:1,designName:'Walkway study'});
  1358 |     await page.setViewportSize({width:320,height:568});
  1359 |     await page.getByRole('button',{name:'Prepare 5% / 20% comparison',exact:true}).click();
  1360 |     await page.evaluate(()=>(window as any).__set({seismicTime:7.217}));
  1361 |     const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
  1362 |     await page.getByRole('button',{name:'Focus scene',exact:true}).click();
  1363 |     await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
  1364 |     await checkBridgeCanvasFillsStage(page);
  1365 |     const before=await page.evaluate(()=>(window as any).__gl());
  1366 |     const forward=page.getByRole('button',{name:'Walk toward far end',exact:true});
  1367 |     await forward.click();expect(await page.evaluate(()=>(window as any).__bucket().bridgeWalkPos)).toBe(0.5);
  1368 |     await forward.click();expect(await page.evaluate(()=>(window as any).__bucket().bridgeWalkPos)).toBe(0.55);
  1369 |     const back=page.getByRole('button',{name:'Walk toward entrance',exact:true});await back.click();
  1370 |     expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({bridgeWalkPos:0.5,seismicTime:7.217,seismicPlaying:false});
  1371 |     expect(await forward.evaluate(element=>element.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
  1372 |     expect(await back.evaluate(element=>element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  1373 |     expect(await page.evaluate(()=>(window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
  1374 |     expect(await page.evaluate(()=>(window as any).__gl().resources)).toEqual(before.resources);
  1375 |     await stage.screenshot({path:join(ENHANCEMENT_REPORT,'bridge-320-focus-walkway.png')});
  1376 |     const drawer=page.locator('[data-bridge-scene-drawer]');await drawer.locator('summary').first().press('Enter');
  1377 |     await expect(page.locator('[data-bridge-walk-controls]')).toHaveCount(0);
  1378 |     await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
  1379 |     await page.getByRole('textbox',{name:'Scene observation note',exact:true}).fill('At the midpoint I can compare the railing with the dashed outline.');
  1380 |     await page.getByRole('button',{name:'Save scene observation',exact:true}).click();
  1381 |     const saved=await page.evaluate(()=>(window as any).__bucket().seismicTrials[0]);
  1382 |     expect(saved.scene.display.focusMode).toBe(true);expect(saved.scene.walkPos).toBe(0.5);
  1383 |     await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
  1384 |     await page.evaluate(()=>(window as any).__set({seismicSceneFocus:false,bridgeView:'2d',bridgeWalkPos:0.12,span:20,
  1385 |       seismicTime:18,seismicDampingRatio:0.3,seismicSceneCompare:false}));
  1386 |     await page.getByRole('button',{name:'Revisit scene observation 1: Scene observation 1',exact:true}).click();
  1387 |     await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toBeFocused();
  1388 |     expect(await page.evaluate(()=>(window as any).__bucket())).toMatchObject({seismicSceneFocus:true,seismicReadoutCollapsed:false,
  1389 |       bridgeView:'immersive',bridgeObserver:'deck',bridgeWalkPos:0.5,span:30,seismicTime:7.217,seismicDampingRatio:0.2,
  1390 |       seismicSceneSource:'capture',seismicSceneCompare:true,seismicPlaying:false});
  1391 |     await expect(page.getByRole('textbox',{name:'Scene observation note',exact:true})).toHaveValue(saved.observation);
  1392 |     await drawer.locator('summary').first().press('Enter');
  1393 |     await expect(page.locator('[data-bridge-walk-position]')).toHaveText('50%');
  1394 |     await expect.poll(()=>page.evaluate(()=>(window as any).__gl().comparisonOverlayVisible)).toBe(true);
  1395 |     await checkWorkflowHealth(page);
  1396 |   });
  1397 | 
  1398 |   test('scene focus: keyboard drawer, reduced-motion steps and fill-frame landscape',async ({page})=>{
  1399 |     await page.emulateMedia({reducedMotion:'reduce'});
  1400 |     await mountWorkflow(page,844,{bridgeView:'immersive',bridgeObserver:'bank',seismicEnabled:true,seismicTime:7.217});
  1401 |     await page.setViewportSize({width:844,height:390});
  1402 |     const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
  1403 |     await page.evaluate(()=>{const stage=document.querySelector('[data-allo-fs-stage]') as any;
  1404 |       stage.requestFullscreen=()=>Promise.reject(new Error('Use fill-frame for this keyboard workflow'));stage.webkitRequestFullscreen=undefined;});
  1405 |     await page.getByRole('button',{name:'Focus scene',exact:true}).click();
  1406 |     await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
  1407 |     await checkBridgeCanvasFillsStage(page);
  1408 |     await expect(page.getByRole('button',{name:'Replay scene',exact:true})).toBeDisabled();
  1409 |     await page.getByRole('button',{name:'Step scene forward 0.5 s',exact:true}).click();
  1410 |     expect(await page.evaluate(()=>(window as any).__bucket().seismicTime)).toBeCloseTo(7.717,9);
  1411 |     const drawer=page.locator('[data-bridge-scene-drawer]'),summary=drawer.locator('summary').first();
  1412 |     await summary.press('Enter');
  1413 |     const moments=page.getByRole('combobox',{name:'Scene key moments',exact:true});await moments.focus();await moments.press('Escape');
  1414 |     await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
  1415 |     await expect(page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true})).toHaveAttribute('aria-pressed','true');
  1416 |     await summary.press('Enter');await page.locator('[data-bridge-scene-recorder] > summary').press('Enter');
  1417 |     const note=page.getByRole('textbox',{name:'Scene observation note',exact:true});await note.fill('Keyboard inspection remains available.');
  1418 |     await note.press('Escape');await expect(drawer).not.toHaveAttribute('open');await expect(summary).toBeFocused();
  1419 |     expect(await page.evaluate(()=>(window as any).__bucket().seismicSceneNote)).toBe('Keyboard inspection remains available.');
  1420 |     await page.getByRole('button',{name:'Exit fullscreen 3D bridge (Escape)',exact:true}).click();
  1421 |     await checkWorkflowHealth(page);
  1422 |   });
  1423 | 
  1424 |   test('scene focus: graphics recovery preserves the layout and paused phone observation',async ({page})=>{
  1425 |     await mountWorkflow(page,320,{bridgeView:'immersive',bridgeObserver:'deck',seismicEnabled:true,seismicTime:7.217,
  1426 |       seismicSceneNote:'Keep my scene draft.',seismicSceneFocus:true,seismicReadoutCollapsed:true});
  1427 |     await page.setViewportSize({width:320,height:568});const stage=page.locator('[data-allo-fs-stage]');await stage.scrollIntoViewIfNeeded();
  1428 |     await page.getByRole('button',{name:'View the 3D bridge fullscreen',exact:true}).click();
  1429 |     await page.getByRole('button',{name:'Leave scene focus',exact:true}).focus();
  1430 |     await page.evaluate(()=>{const canvas=document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  1431 |       const context=canvas.getContext('webgl2')||canvas.getContext('webgl'),extension=context?.getExtension('WEBGL_lose_context');
  1432 |       if(!extension)throw new Error('WebGL loss extension unavailable');(window as any).__focusLoss=extension;extension.loseContext();});
  1433 |     await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
```