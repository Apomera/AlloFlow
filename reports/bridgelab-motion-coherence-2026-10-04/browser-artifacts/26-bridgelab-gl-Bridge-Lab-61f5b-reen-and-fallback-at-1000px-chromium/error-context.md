# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> motion guide: fixed references, A/B scale, fullscreen and fallback at 1000px
- Location: tests\e2e\26-bridgelab-gl.spec.ts:1132:9

# Error details

```
Error: all three measurements fit the compact scene panel

expect(received).toBeLessThanOrEqual(expected)

Expected: <= -2
Received:    15.5
```

# Test source

```ts
  1058 |       await page.getByRole('button', { name: 'A · reference', exact: true }).click();
  1059 |       await expect(page.locator('[data-bridge-scene-readout]')).toHaveAttribute('data-scene-trial', 'reference');
  1060 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().relativeOffsetM)).not.toBe(before.relativeOffsetM);
  1061 |       expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(8);
  1062 |       await expect(page.locator('[data-bridge-scene-energy-frame]')).toHaveAttribute('data-energy-limit', scale!);
  1063 |       expect(await page.evaluate(() => (window as any).__gl().cameraDirection)).toEqual(before.cameraDirection);
  1064 |       expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
  1065 |       await stage.screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-damping-a.png`) });
  1066 |       await page.getByRole('button', { name: 'B · current', exact: true }).click();
  1067 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().relativeOffsetM)).toBeCloseTo(before.relativeOffsetM, 9);
  1068 |       const separation = await page.locator('[data-bridge-scene-readout]').evaluate(element =>
  1069 |         document.querySelector('[data-bridge-scene-replay]')!.getBoundingClientRect().top - element.getBoundingClientRect().bottom);
  1070 |       expect(separation).toBeGreaterThan(4);
  1071 |       await page.getByRole('button', { name: 'A · reference', exact: true }).click();
  1072 |       await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
  1073 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(8);
  1074 |       await page.getByRole('button', { name: 'Pause scene replay', exact: true }).click();
  1075 |       const sharedTime = await page.evaluate(() => (window as any).__bucket().seismicTime);
  1076 |       expect(Number(await page.locator('[data-bridge-scene-energy-frame]').getAttribute('data-bridge-scene-energy-frame'))).toBeCloseTo(sharedTime, 8);
  1077 |       expect(Number(await guide.locator('[data-guide-readings="current"]').getAttribute('data-guide-time'))).toBeCloseTo(sharedTime, 8);
  1078 |       await expect(page.locator('[data-bridge-scene-readout]')).toHaveAttribute('data-scene-trial', 'reference');
  1079 |       await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  1080 |       await page.getByRole('button', { name: 'Inspect both at 16 s', exact: true }).click();
  1081 |       await page.getByRole('button', { name: 'Record paired evidence', exact: true }).click();
  1082 |       await expect(guide.locator('[data-guide-evidence]')).toHaveAttribute('data-guide-evidence', 'matching');
  1083 |       await expect(guide.locator('[data-guide-readings="recorded"]')).toHaveAttribute('data-guide-time', '16');
  1084 |       await expect(guide.locator('[data-guide-readings="recorded"] [data-guide-measure="3"] [data-guide-value="b"]')).toContainText('<0.001 J/kg');
  1085 |       await page.getByLabel('Claim from the damping comparison', { exact: true }).fill('B has less relative motion in this experiment.');
  1086 |       await page.getByLabel('Evidence and energy explanation', { exact: true }).fill('I compared the peak motion and the energy still stored at 16 seconds. Damping removes mechanical energy.');
  1087 |       const recorded = await guide.locator('[data-guide-readings="recorded"]').textContent();
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
> 1158 |         'all three measurements fit the compact scene panel').toBeLessThanOrEqual(-2);
       |                                                               ^ Error: all three measurements fit the compact scene panel
  1159 |       await captureImmersiveRegion(page, stage, 'bridge-' + width + '-motion-guide.png');
  1160 |       await page.getByRole('button', { name: 'Prepare 5% / 20% comparison', exact: true }).click();
  1161 |       await page.getByRole('button', { name: 'Inspect both at 16 s', exact: true }).click();
  1162 |       await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  1163 |       await checkBridgeCanvasFillsStage(page);
  1164 |       await page.evaluate(() => (window as any).__set({ seismicTime: 8 }));
  1165 |       // The outline, two trails and shared marker first upload when comparison is visible.
  1166 |       // Measure that initial allocation separately from repeated replay and toggles.
  1167 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().resources.geometries)).toBe(before.resources.geometries + 4);
  1168 |       const comparisonResources = await page.evaluate(() => (window as any).__gl().resources);
  1169 |       expect(comparisonResources.textures).toBe(before.resources.textures);
  1170 |       const range = await frame.getAttribute('data-motion-range-m');
  1171 |       await checkReadings();
  1172 |       const b = await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m');
  1173 |       await page.getByRole('button', { name: 'A · reference', exact: true }).click();
  1174 |       await expect(frame).toHaveAttribute('data-motion-trial', 'reference');
  1175 |       await expect(frame).toHaveAttribute('data-motion-range-m', range!);
  1176 |       expect(await frame.locator('[data-motion-reading="deck"]').getAttribute('data-motion-value-m')).not.toBe(b);
  1177 |       await checkReadings();
  1178 |       await stage.screenshot({ path: join(ENHANCEMENT_REPORT, 'bridge-' + width + '-motion-a-fullscreen.png') });
  1179 |       await page.getByRole('button', { name: 'B · current', exact: true }).click();
  1180 |       await expect(frame).toHaveAttribute('data-motion-range-m', range!);
  1181 |       await expect(frame.locator('[data-motion-reading="deck"]')).toHaveAttribute('data-motion-value-m', b!);
  1182 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  1183 |       await page.getByRole('slider', { name: 'Scene replay time (s)', exact: true }).press('End');
  1184 |       await expect(frame).toHaveAttribute('data-motion-frame', '24');
  1185 |       await expect(frame).toHaveAttribute('data-motion-range-m', range!);
  1186 |       await expect(page.getByRole('button', { name: 'Replay scene', exact: true })).toBeDisabled();
  1187 |       await summary.press('Enter');
  1188 |       await expect(frame).toHaveCount(0);
  1189 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(false);
  1190 |       await summary.press('Enter');
  1191 |       await expect.poll(() => page.evaluate(() => (window as any).__gl().motionReferenceVisible)).toBe(true);
  1192 |       expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
  1193 |       expect(await page.evaluate(() => (window as any).__gl().resources)).toEqual(comparisonResources);
  1194 |       await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  1195 |       await page.getByRole('button', { name: '3D structure', exact: true }).click();
  1196 |       await page.evaluate(() => (window as any).__set({ seismicSceneCompare: false, seismicTime: 7.2 }));
  1197 |       await stage.scrollIntoViewIfNeeded();
  1198 |       await checkReadings();
  1199 |       await captureImmersiveRegion(page, stage, 'bridge-' + width + '-motion-orbit.png');
  1200 |       await page.evaluate(() => (window as any).__set({ bridgeView: '2d', seismicIntensityG: 0 }));
  1201 |       await expect(page.locator('[data-bridge-motion-guide="fallback"]')).toBeVisible();
  1202 |       await expect(frame).toHaveAttribute('data-motion-trial', 'current');
  1203 |       await expect(frame.locator('[data-motion-reading]')).toHaveText(['Ground from rest0.00 cm', 'Deck from rest0.00 cm', 'Deck relative to ground0.00 cm']);
  1204 |       await expect(frame).toContainText('Current experiment');
  1205 |       await page.getByRole('button', { name: 'Step forward 0.5 s', exact: true }).click();
  1206 |       await expect(frame).toHaveAttribute('data-motion-frame', '7.7');
  1207 |       await captureImmersiveRegion(page, page.locator('[data-bridge-motion-guide="fallback"]'), 'bridge-' + width + '-motion-fallback.png');
  1208 |       await page.getByLabel('Earthquake experiment', { exact: true }).uncheck();
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
```