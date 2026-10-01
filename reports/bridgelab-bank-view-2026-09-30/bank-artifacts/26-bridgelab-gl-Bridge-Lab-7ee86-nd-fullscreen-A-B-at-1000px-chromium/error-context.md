# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> riverbank observer: same moment, independent poses and fullscreen A/B at 1000px
- Location: tests\e2e\26-bridgelab-gl.spec.ts:1233:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Object {
-   "geometries": 156,
+   "geometries": 158,
    "textures": 1,
  }
```

# Test source

```ts
  1202 |       await captureImmersiveRegion(page, page.locator('[data-bridge-motion-guide="fallback"]'), 'bridge-' + width + '-motion-fallback.png');
  1203 |       await page.getByLabel('Earthquake experiment', { exact: true }).uncheck();
  1204 |       await expect(page.locator('[data-bridge-motion-guide]')).toHaveCount(0);
  1205 |       await checkWorkflowHealth(page);
  1206 |     });
  1207 |   }
  1208 | 
  1209 |   test('motion guide: WebGL loss retains current measurements and recovery restores resting rails', async ({ page }) => {
  1210 |     await mountWorkflow(page, 1000, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2, seismicMotionGuide: true });
  1211 |     const values = await page.locator('[data-motion-reading]').allTextContents();
  1212 |     await page.evaluate(() => {
  1213 |       const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  1214 |       const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  1215 |       const extension = context?.getExtension('WEBGL_lose_context');
  1216 |       if (!extension) throw new Error('WebGL loss extension unavailable');
  1217 |       (window as any).__motionLoss = extension;
  1218 |       extension.loseContext();
  1219 |     });
  1220 |     await expect(page.locator('[data-bridge-motion-guide="fallback"]')).toBeVisible();
  1221 |     expect(await page.locator('[data-motion-reading]').allTextContents()).toEqual(values);
  1222 |     await page.evaluate(() => (window as any).__motionLoss.restoreContext());
  1223 |     await page.getByRole('button', { name: 'On the bridge', exact: true }).click();
  1224 |     await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
  1225 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
  1226 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
  1227 |     await expect(page.locator('[data-bridge-motion-guide="scene"]')).toBeVisible();
  1228 |     expect(await page.locator('[data-motion-reading]').allTextContents()).toEqual(values);
  1229 |     await checkWorkflowHealth(page);
  1230 |   });
  1231 | 
  1232 |   for (const width of [1000, 320]) {
  1233 |     test('riverbank observer: same moment, independent poses and fullscreen A/B at ' + width + 'px', async ({ page }) => {
  1234 |       await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeWalkPos: 0.62, bridgeLookYaw: 20,
  1235 |         bridgeLookPitch: -6, seismicEnabled: true, seismicTime: 7.2, seismicMotionGuide: true, seismicGuideOpen: true,
  1236 |         crossSectionMm2: 30000, lateralBraceEvery: 1, seismicObservation: 'Keep my observation.' });
  1237 |       const stage = page.locator('[data-allo-fs-stage]');
  1238 |       const viewer = page.locator('[aria-describedby="bridge-gl-description"]');
  1239 |       await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
  1240 |       await stage.scrollIntoViewIfNeeded();
  1241 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
  1242 |       await expect(page.locator('[data-bridge-observer-hint]')).toContainText('moves with the ground');
  1243 |       await expect(viewer).toHaveAttribute('aria-label', /Standing at an observation point on the riverbank/);
  1244 |       await expect(page.getByRole('slider', { name: 'Position on bridge (%)', exact: true })).toHaveCount(0);
  1245 |       const before = await page.evaluate(() => (window as any).__gl());
  1246 |       await page.evaluate(() => (window as any).__set({ seismicTime: 8 }));
  1247 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().groundOffsetM)).not.toBe(before.groundOffsetM);
  1248 |       const moved = await page.evaluate(() => (window as any).__gl());
  1249 |       expect(moved.cameraPosition.z - before.cameraPosition.z).toBeCloseTo((moved.groundOffsetM - before.groundOffsetM) * 10, 8);
  1250 |       moved.cameraDirection.forEach((value: number, axis: number) => expect(value).toBeCloseTo(before.cameraDirection[axis], 8));
  1251 |       await viewer.press('ArrowRight');
  1252 |       await viewer.press('ArrowUp');
  1253 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeBankYaw)).toBe(8);
  1254 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeBankPitch)).toBe(5);
  1255 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeWalkPos)).toBe(0.62);
  1256 |       await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
  1257 |       await expect(viewer).toBeFocused();
  1258 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('deck');
  1259 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeLookYaw)).toBe(20);
  1260 |       await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
  1261 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeBankYaw)).toBe(8);
  1262 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeBankPitch)).toBe(5);
  1263 |       const viewerBox = await viewer.boundingBox();
  1264 |       if (!viewerBox) throw new Error('Bank viewer is not visible');
  1265 |       await page.mouse.move(viewerBox.x + viewerBox.width * 0.9, viewerBox.y + viewerBox.height * 0.5);
  1266 |       await page.mouse.down();
  1267 |       await page.mouse.move(viewerBox.x + viewerBox.width * 0.9 - 12, viewerBox.y + viewerBox.height * 0.5 + 12, { steps: 3 });
  1268 |       await page.mouse.up();
  1269 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeBankYaw)).not.toBe(8);
  1270 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeLookYaw)).toBe(20);
  1271 |       await viewer.press('Home');
  1272 |       await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
  1273 |       await page.evaluate(() => (window as any).__set({ seismicTime: 8 }));
  1274 |       await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  1275 |       await checkBridgeCanvasFillsStage(page);
  1276 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
  1277 |       const bankB = await page.evaluate(() => (window as any).__gl());
  1278 |       await page.getByRole('button', { name: 'A · reference', exact: true }).click();
  1279 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().deckOffsetM)).not.toBe(bankB.deckOffsetM);
  1280 |       const bankA = await page.evaluate(() => (window as any).__gl());
  1281 |       expect(bankA.cameraPosition).toEqual(bankB.cameraPosition);
  1282 |       expect(bankA.cameraDirection).toEqual(bankB.cameraDirection);
  1283 |       const readings = await page.locator('[data-motion-reading]').allTextContents();
  1284 |       await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-bank-a.png') });
  1285 |       await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
  1286 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('deck');
  1287 |       expect(await page.locator('[data-motion-reading]').allTextContents()).toEqual(readings);
  1288 |       expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(8);
  1289 |       await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-deck-a.png') });
  1290 |       await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
  1291 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraPosition)).toEqual(bankA.cameraPosition);
  1292 |       await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
  1293 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(8);
  1294 |       await page.getByRole('button', { name: 'Switch to deck viewpoint', exact: true }).click();
  1295 |       expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  1296 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  1297 |       await page.getByRole('button', { name: 'Switch to riverbank viewpoint', exact: true }).click();
  1298 |       await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('End');
  1299 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().groundOffsetM)).toBe(0);
  1300 |       await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
  1301 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
> 1302 |       expect(await page.evaluate(() => (window as any).__gl().resources)).toEqual(before.resources);
       |                                                                           ^ Error: expect(received).toEqual(expected) // deep equality
  1303 |       await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  1304 |       await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
  1305 |       await expect(page.locator('[data-bridge-observer-switch]')).toHaveCount(0);
  1306 |       await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
  1307 |       await stage.scrollIntoViewIfNeeded();
  1308 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().cameraMode)).toBe('bank');
  1309 |       expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Keep my observation.');
  1310 |       await checkWorkflowHealth(page);
  1311 |     });
  1312 |   }
  1313 | 
  1314 |   test('riverbank observer: WebGL recovery preserves the selected observer without resuming motion', async ({ page }) => {
  1315 |     await mountWorkflow(page, 1000, { bridgeView: 'immersive', bridgeObserver: 'bank', bridgeBankYaw: 12,
  1316 |       bridgeBankPitch: -5, seismicEnabled: true, seismicTime: 8, seismicMotionGuide: true });
  1317 |     await page.evaluate(() => {
  1318 |       const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  1319 |       const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  1320 |       const extension = context?.getExtension('WEBGL_lose_context');
  1321 |       if (!extension) throw new Error('WebGL loss extension unavailable');
  1322 |       (window as any).__bankLoss = extension;
  1323 |       extension.loseContext();
  1324 |     });
  1325 |     await expect(page.locator('[data-bridge-motion-guide="fallback"]')).toBeVisible();
  1326 |     await expect(page.getByRole('button', { name: 'From the riverbank', exact: true })).toBeDisabled();
  1327 |     await page.evaluate(() => (window as any).__bankLoss.restoreContext());
  1328 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().state)).toBe('ready');
  1329 |     expect(await page.evaluate(() => (window as any).__bucket().bridgeView)).toBe('2d');
  1330 |     await page.getByRole('button', { name: 'From the riverbank', exact: true }).click();
  1331 |     await page.locator('[data-allo-fs-stage]').scrollIntoViewIfNeeded();
  1332 |     await expect.poll(() => page.evaluate(() => (window as any).__gl().observerAnchor)).toBe('ground');
  1333 |     expect(await page.evaluate(() => (window as any).__bucket())).toMatchObject({ bridgeBankYaw: 12, bridgeBankPitch: -5, seismicTime: 8, seismicPlaying: false });
  1334 |     await checkWorkflowHealth(page);
  1335 |   });
  1336 | 
  1337 |   test.describe('earthquake replay', () => {
  1338 |     test.use({ hasTouch: true });
  1339 |     for (const fallback of [false, true]) {
  1340 |       test('WebGL loss exits ' + (fallback ? 'fill-frame' : 'native fullscreen') + ' and preserves a usable focused fallback', async ({ page }) => {
  1341 |         await mountWorkflow(page, 1000, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2 });
  1342 |         const stage = page.locator('[data-allo-fs-stage]');
  1343 |         if (fallback) await stage.evaluate(element => {
  1344 |           Object.defineProperty(element, 'requestFullscreen', { configurable: true, value: () => Promise.reject(new Error('Exercise fill-frame fallback')) });
  1345 |         });
  1346 |         await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  1347 |         await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
  1348 |         await expect.poll(() => stage.evaluate(element => (element as any).__alloFsOn === true || document.fullscreenElement === element)).toBe(true);
  1349 |         await checkBridgeCanvasFillsStage(page);
  1350 |         await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
  1351 |         await page.getByRole('button', { name: 'Pause scene replay', exact: true }).focus();
  1352 |         await page.evaluate(() => {
  1353 |           const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  1354 |           const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  1355 |           const extension = context?.getExtension('WEBGL_lose_context');
  1356 |           if (!extension) throw new Error('WebGL loss extension unavailable');
  1357 |           extension.loseContext();
  1358 |         });
  1359 |         await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
  1360 |         await expect(page.locator('[data-bridge-elevation]')).toBeVisible();
  1361 |         await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  1362 |         expect(await stage.evaluate(element => !!(element as any).__alloFsOn)).toBe(false);
  1363 |         expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  1364 |         const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
  1365 |         await chart.press('End');
  1366 |         await expect(chart).toHaveAttribute('aria-valuenow', '24');
  1367 |         if (fallback) expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  1368 |         await checkWorkflowHealth(page);
  1369 |       });
  1370 |     }
  1371 |     for (const width of [1000, 320]) {
  1372 |       test('scene controls, fullscreen and synchronized timeline at ' + width + 'px', async ({ page }) => {
  1373 |         await mkdir(REPLAY_REPORT, { recursive: true });
  1374 |         await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2 });
  1375 |         const stage = page.locator('[data-allo-fs-stage]');
  1376 |         const scene = page.getByRole('group', { name: 'Earthquake scene replay', exact: true });
  1377 |         await expect(scene).toBeVisible();
  1378 |         await page.getByLabel('Scene replay speed', { exact: true }).selectOption('0.25');
  1379 |         await expect(page.getByLabel('Replay speed', { exact: true })).toHaveValue('0.25');
  1380 |         await stage.scrollIntoViewIfNeeded();
  1381 |         const before = await page.evaluate(() => (window as any).__gl());
  1382 |         await captureImmersiveRegion(page, stage, 'bridge-' + width + '-scene-replay.png', REPLAY_REPORT);
  1383 |         await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  1384 |         await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
  1385 |         await expect(scene).toBeVisible();
  1386 |         await checkBridgeCanvasFillsStage(page);
  1387 |         await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
  1388 |         await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(7.2);
  1389 |         await page.getByRole('button', { name: 'Pause scene replay', exact: true }).click();
  1390 |         const sceneTime = page.getByRole('slider', { name: 'Scene replay time (s)', exact: true });
  1391 |         await sceneTime.press('Home');
  1392 |         await sceneTime.press('ArrowRight');
  1393 |         await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(0.05);
  1394 |         expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  1395 |         await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  1396 | 
  1397 |         const timeline = page.locator('[data-bridge-seismic-timeline]');
  1398 |         const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
  1399 |         await chart.scrollIntoViewIfNeeded();
  1400 |         const box = await chart.boundingBox();
  1401 |         if (!box) throw new Error('Timeline chart is not visible');
  1402 |         if (width === 320) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
```