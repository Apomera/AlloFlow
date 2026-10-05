# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> motion guide: fixed references, A/B scale, fullscreen and fallback at 1000px
- Location: tests\e2e\26-bridgelab-gl.spec.ts:1132:9

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Object {
-   "geometries": 141,
+   "geometries": 145,
    "textures": 1,
  }
```

# Test source

```ts
  1088 |       await captureImmersiveRegion(page, guide.locator('[data-guide-readings="recorded"]'), `bridge-${width}-paired-evidence.png`);
  1089 |       await page.locator('[data-bridge-seismic] summary').click();
  1090 |       await page.getByRole('slider', { name: 'Ground shaking frequency (Hz)', exact: true }).press('End');
  1091 |       await expect(guide.locator('[data-guide-feedback]')).toContainText('Response mode or ground motion differs');
  1092 |       await expect(guide.locator('[data-guide-evidence]')).toHaveAttribute('data-guide-evidence', 'earlier');
  1093 |       expect(await guide.locator('[data-guide-readings="recorded"]').textContent()).toBe(recorded);
  1094 |       expect(await page.evaluate(() => (window as any).__bucket().seismicPrediction)).toBe('Keep my notebook prediction.');
  1095 |       expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Keep my notebook evidence.');
  1096 |       await page.getByRole('button', { name: 'Open investigation report', exact: true }).click();
  1097 |       const report = page.locator('[data-bridge-damping-guide="print"]');
  1098 |       expect(await report.locator('[data-guide-readings="recorded"]').textContent()).toBe(recorded);
  1099 |       await expect(report).toContainText('Damping removes mechanical energy.');
  1100 |       await expect(report.locator('button,input,textarea')).toHaveCount(0);
  1101 |       await captureImmersiveRegion(page, report, `bridge-${width}-guided-report.png`);
  1102 |       await checkWorkflowHealth(page);
  1103 |     });
  1104 | 
  1105 |     test('guided damping: qualitative case-study steps and reduced motion at ' + width + 'px', async ({ page }) => {
  1106 |       await mountWorkflow(page, width);
  1107 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  1108 |       for (const selectedCase of ['tacoma', 'millennium']) {
  1109 |         await page.evaluate(selected => (window as any).__set({ tab: 'cases', selectedCase: selected }), selectedCase);
  1110 |         const illustration = page.locator('[data-bridge-dynamics]');
  1111 |         await expect(illustration).toContainText('do not predict wind speed, crowd limits');
  1112 |         const steps = illustration.getByRole('group', { name: 'Illustration steps', exact: true }).getByRole('button');
  1113 |         await steps.nth(2).press('Enter');
  1114 |         await expect(illustration.locator('[data-dynamics-step]')).toHaveAttribute('data-dynamics-step', '2');
  1115 |         await expect(steps.nth(2)).toHaveAttribute('aria-pressed', 'true');
  1116 |         await expect(illustration.locator('input[type="range"]')).toHaveCount(0);
  1117 |         await captureImmersiveRegion(page, illustration, `bridge-${width}-${selectedCase}-mechanism.png`);
  1118 |         await checkWorkflowHealth(page);
  1119 |       }
  1120 |       await page.getByRole('button', { name: 'Investigate damping and energy', exact: true }).click();
  1121 |       await expect(page.locator('[data-bridge-damping-guide="interactive"]')).toBeVisible();
  1122 |       await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
  1123 |       await expect(page.getByRole('button', { name: 'Run earthquake', exact: true })).toBeDisabled();
  1124 |       await page.getByRole('button', { name: 'Inspect both at 24 s', exact: true }).click();
  1125 |       await expect(page.locator('[data-guide-readings="current"]')).toHaveAttribute('data-guide-time', '24');
  1126 |       expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  1127 |       await checkWorkflowHealth(page);
  1128 |     });
  1129 |   }
  1130 | 
  1131 |   for (const width of [1000, 320]) {
  1132 |     test('motion guide: fixed references, A/B scale, fullscreen and fallback at ' + width + 'px', async ({ page }) => {
  1133 |       await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2,
  1134 |         seismicGuideOpen: true, crossSectionMm2: 30000, lateralBraceEvery: 1 });
  1135 |       const stage = page.locator('[data-allo-fs-stage]');
  1136 |       const guide = page.locator('[data-bridge-motion-guide="scene"]');
  1137 |       const summary = guide.locator('summary');
  1138 |       const frame = page.locator('[data-motion-frame]');
  1139 |       await expect(frame).toHaveCount(0);
  1140 |       await summary.press('Enter');
  1141 |       await expect(frame).toHaveAttribute('data-motion-frame', '7.2');
  1142 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
  1143 |       const before = await page.evaluate(() => (window as any).__gl());
  1144 |       expect(before.motionReferencePosition).toEqual([0, 0, 0]);
  1145 |       async function checkReadings() {
  1146 |         await stage.scrollIntoViewIfNeeded();
  1147 |         const values = await frame.locator('[data-motion-reading]').evaluateAll(nodes =>
  1148 |           Object.fromEntries(nodes.map(node => [node.getAttribute('data-motion-reading'), Number(node.getAttribute('data-motion-value-m'))])));
  1149 |         await expect.poll(() => page.evaluate(() => (window as any).__gl().deckOffsetM)).toBeCloseTo(values.deck, 9);
  1150 |         await expect.poll(() => page.evaluate(() => (window as any).__gl().groundOffsetM)).toBeCloseTo(values.ground, 9);
  1151 |         expect(values.deck - values.ground).toBeCloseTo(values.relative, 9);
  1152 |         expect(await frame.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  1153 |       }
  1154 |       await checkReadings();
  1155 |       const lastReading = frame.locator('[data-motion-reading="relative"]');
  1156 |       expect(await lastReading.evaluate(element => element.getBoundingClientRect().bottom
  1157 |         - element.closest('[data-bridge-scene-readout]')!.getBoundingClientRect().bottom),
  1158 |         'all three measurements fit the compact scene panel').toBeLessThanOrEqual(-2);
  1159 |       await captureImmersiveRegion(page, stage, 'bridge-' + width + '-motion-guide.png');
  1160 |       await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
  1161 |       await page.getByRole('button', { name: 'Inspect both at 16 s', exact: true }).click();
  1162 |       await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  1163 |       await checkBridgeCanvasFillsStage(page);
  1164 |       await page.evaluate(() => (window as any).__set({ seismicTime: 8 }));
  1165 |       const range = await frame.getAttribute('data-motion-range-m');
  1166 |       await checkReadings();
  1167 |       const b = await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m');
  1168 |       await page.getByRole('button', { name: 'A · reference', exact: true }).click();
  1169 |       await expect(frame).toHaveAttribute('data-motion-trial', 'reference');
  1170 |       await expect(frame).toHaveAttribute('data-motion-range-m', range!);
  1171 |       expect(await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m')).not.toBe(b);
  1172 |       await checkReadings();
  1173 |       await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-motion-a-fullscreen.png') });
  1174 |       await page.getByRole('button', { name: 'B · current', exact: true }).click();
  1175 |       await expect(frame).toHaveAttribute('data-motion-range-m', range!);
  1176 |       await expect(frame.locator('[data-motion-reading="deck"]')).toHaveAttribute('data-motion-value-m', b!);
  1177 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  1178 |       await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('End');
  1179 |       await expect(frame).toHaveAttribute('data-motion-frame', '24');
  1180 |       await expect(frame).toHaveAttribute('data-motion-range-m', range!);
  1181 |       await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
  1182 |       await summary.press('Enter');
  1183 |       await expect(frame).toHaveCount(0);
  1184 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(false);
  1185 |       await summary.press('Enter');
  1186 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
  1187 |       expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
> 1188 |       expect(await page.evaluate(() => (window as any).__gl().resources)).toEqual(before.resources);
       |                                                                           ^ Error: expect(received).toEqual(expected) // deep equality
  1189 |       await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  1190 |       await page.getByRole('button', { name: '3D structure', exact: true }).click();
  1191 |       await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false, seismicTime: 7.2 }));
  1192 |       await stage.scrollIntoViewIfNeeded();
  1193 |       await checkReadings();
  1194 |       await captureImmersiveRegion(page, stage, 'bridge-' + width + '-motion-orbit.png');
  1195 |       await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0 }));
  1196 |       await expect(page.locator('[data-bridge-motion-guide="fallback"]')).toBeVisible();
  1197 |       await expect(frame).toHaveAttribute('data-motion-trial', 'current');
  1198 |       await expect(frame.locator('[data-motion-reading]')).toHaveText(['Ground from rest0.00 cm', 'Deck from rest0.00 cm', 'Deck relative to ground0.00 cm']);
  1199 |       await expect(frame).toContainText('Current experiment');
  1200 |       await page.getByRole('button', { name: 'Step forward 0.5 s', exact: true }).click();
  1201 |       await expect(frame).toHaveAttribute('data-motion-frame', '7.7');
  1202 |       await captureImmersiveRegion(page, page.locator('[data-bridge-motion-guide="fallback"]'), 'bridge-' + width + '-motion-fallback.png');
  1203 |       await page.getByLabel('Earthquake experiment', { exact: true }).uncheck();
  1204 |       await expect(page.locator('[data-bridge-motion-guide]')).toHaveCount(0);
  1205 |       await checkWorkflowHealth(page);
  1206 |     });
  1207 |   }
  1208 | 
  1209 |   for (const width of [1000, 320]) {
  1210 |     test('key moments: selected trial peaks, compact controls and fullscreen at ' + width + 'px', async ({ page }) => {
  1211 |       await mountWorkflow(page, width, { bridgeView: 'immersive', bridgeObserver: 'bank', seismicEnabled: true,
  1212 |         seismicGuideOpen: true, seismicTime: 7, crossSectionMm2: 30000, lateralBraceEvery: 1,
  1213 |         seismicObservation: 'Keep this comparison.' });
  1214 |       const stage = page.locator('[data-allo-fs-stage]');
  1215 |       const select = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
  1216 |       const readout = page.locator('[data-bridge-scene-readout]');
  1217 |       const replay = page.locator('[data-bridge-scene-replay]');
  1218 |       async function checkOverlayFit() {
  1219 |         const panel = await replay.boundingBox(), measurements = await readout.boundingBox();
  1220 |         if (!panel || !measurements) throw new Error('Scene controls missing');
  1221 |         expect(measurements.y + measurements.height).toBeLessThanOrEqual(panel.y - 4);
  1222 |         expect(await replay.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  1223 |         const containers = await stage.boundingBox();
  1224 |         if (!containers) throw new Error('Stage missing');
  1225 |         expect(panel.x).toBeGreaterThan(containers.x);
  1226 |         expect(panel.x + panel.width).toBeLessThan(containers.x + containers.width);
  1227 |       }
  1228 |       await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
  1229 |       await stage.scrollIntoViewIfNeeded();
  1230 |       const before = await page.evaluate(() => (window as any).__gl());
  1231 |       const bTime = Number(await select.locator('option[value="motion"]').getAttribute('data-moment-time'));
  1232 |       await page.getByRole('button', { name: 'A · reference', exact: true }).click();
  1233 |       const aTime = Number(await select.locator('option[value="motion"]').getAttribute('data-moment-time'));
  1234 |       expect(aTime).not.toBe(bTime);
  1235 |       await select.selectOption('motion');
  1236 |       expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(aTime);
  1237 |       expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  1238 |       await expect(page.locator('[data-bridge-moment-insight="motion"]')).toHaveAttribute('data-moment-trial', 'reference');
  1239 |       await page.getByRole('button', { name: 'B · current', exact: true }).click();
  1240 |       expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(aTime);
  1241 |       await expect(select).toHaveValue('');
  1242 |       await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
  1243 |       await select.selectOption('motion');
  1244 |       expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(bTime);
  1245 |       expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  1246 |       await checkOverlayFit();
  1247 |       await captureImmersiveRegion(page, stage, 'bridge-' + width + '-key-moments-inline.png');
  1248 |       await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  1249 |       await checkBridgeCanvasFillsStage(page);
  1250 |       await checkOverlayFit();
  1251 |       await page.locator('[data-bridge-scene-energy] > summary').press('Enter');
  1252 |       await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-key-moments-fullscreen.png') });
  1253 |       await readout.locator(':scope > summary').press('Enter');
  1254 |       await select.selectOption('free');
  1255 |       await expect(readout).toContainText('16.00 s');
  1256 |       await expect(select).not.toHaveAttribute('aria-describedby');
  1257 |       await readout.locator(':scope > summary').press('Enter');
  1258 |       await expect(page.locator('[data-bridge-moment-insight="free"]')).toContainText('Ground motion has ended');
  1259 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  1260 |       await select.focus();
  1261 |       await select.press('End');
  1262 |       await select.press('Tab');
  1263 |       await expect(select).toHaveValue('end');
  1264 |       await expect(page.locator('[data-bridge-moment-insight="end"]')).toContainText('does not mean the deck has settled');
  1265 |       await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
  1266 |       await checkOverlayFit();
  1267 |       expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
  1268 |       expect(await page.evaluate(() => (window as any).__bucket().bridgeObserver)).toBe('bank');
  1269 |       expect(await page.evaluate(() => (window as any).__bucket().seismicObservation)).toBe('Keep this comparison.');
  1270 |       await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  1271 |       await checkWorkflowHealth(page);
  1272 |     });
  1273 |   }
  1274 | 
  1275 |   test('key moments: zero-input boundaries and precise manual time remain usable', async ({ page }) => {
  1276 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  1277 |     await mountWorkflow(page, 320, { bridgeView: 'immersive', seismicEnabled: true, seismicIntensityG: 0, seismicTime: 5 });
  1278 |     const select = page.getByRole('combobox', { name: 'Scene key moments', exact: true });
  1279 |     await expect(select.locator('option[value="motion"]')).toBeDisabled();
  1280 |     await expect(select.locator('option[value="acceleration"]')).toBeDisabled();
  1281 |     await select.selectOption('free');
  1282 |     await expect(page.locator('[data-bridge-moment-insight]')).toContainText('No ground motion was applied');
  1283 |     await expect(page.locator('[data-bridge-moment-insight]')).toContainText('0.000 J/kg');
  1284 |     await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('ArrowRight');
  1285 |     await expect(select).toHaveValue('');
  1286 |     await expect(page.locator('[data-bridge-moment-insight]')).toHaveCount(0);
  1287 |     expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(16.05);
  1288 |     await select.selectOption('end');
```