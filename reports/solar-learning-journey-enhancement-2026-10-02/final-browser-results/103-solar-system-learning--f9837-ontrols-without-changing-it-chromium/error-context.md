# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 103-solar-system-learning-journey.spec.ts >> explicit recapture repairs saved evidence and routes to paused orbit controls without changing it
- Location: tests\e2e\103-solar-system-learning-journey.spec.ts:184:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

@@ -41,8 +41,8 @@
        "observationLogged": false,
        "prediction": "slower",
        "predictionResult": null,
      },
    },
-   "time": 0,
+   "time": 0.2833340000000001,
    "zoom": "inner",
  }
```

# Test source

```ts
  116 |     expect(await investigationState(page)).toEqual(completed);
  117 |     const rect = await button.boundingBox();
  118 |     expect(rect?.height).toBeGreaterThanOrEqual(43.5);
  119 |     expect(rect?.width).toBeGreaterThanOrEqual(43.5);
  120 |   }
  121 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  122 |   expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  123 | });
  124 | 
  125 | test('restored incomplete and wrong-world evidence cannot become a supported observation', async ({ page }) => {
  126 |   await mountJourney(page, 1060, true, { orr_snapshots: incompleteStore });
  127 |   const evidence = page.getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true });
  128 |   await expect(evidence.locator('.orr-evidence-snapshot')).toHaveCount(2);
  129 |   for (const slot of ['a', 'b']) {
  130 |     await expect(evidence.locator(`.orr-evidence-snapshot[data-snapshot="${slot}"]`)).toContainText('Incomplete');
  131 |   }
  132 |   const quality = page.locator('#orrery-evidence-quality');
  133 |   await expect(quality).toContainText(/Recapture A/i);
  134 |   await expect(quality).toContainText(/Recapture B/i);
  135 |   await expect(evidence.locator('.orr-evidence-result')).toHaveCount(0);
  136 |   await expect(evidence.getByRole('button', { name: 'Record orbital speed observation for Mercury', exact: true })).toHaveCount(0);
  137 |   await expect(evidence).not.toContainText(/NaN|undefined|Infinity/);
  138 |   const table = evidence.getByRole('table', { name: 'Orbital evidence change from snapshot A to B for Mercury', exact: true });
  139 |   const distance = table.getByRole('row').filter({ has: table.getByRole('rowheader', { name: 'Distance', exact: true }) });
  140 |   const speed = table.getByRole('row').filter({ has: table.getByRole('rowheader', { name: 'Orbital speed', exact: true }) });
  141 |   await expect(distance.getByRole('cell').nth(0)).toHaveText('Not recorded');
  142 |   await expect(distance.getByRole('cell').nth(2)).toHaveText('Unavailable');
  143 |   await expect(speed.getByRole('cell').nth(1)).toHaveText('Not recorded');
  144 |   await expect(speed.getByRole('cell').nth(2)).toHaveText('Unavailable');
  145 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots)).toEqual(incompleteStore);
  146 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog)).toEqual([]);
  147 | 
  148 |   const exportButton = evidence.getByRole('button', { name: 'Export orbital evidence for Mercury', exact: true });
  149 |   await expect(exportButton).toBeEnabled();
  150 |   const [download] = await Promise.all([
  151 |     page.waitForEvent('download'),
  152 |     exportButton.click(),
  153 |   ]);
  154 |   const stream = await download.createReadStream();
  155 |   expect(stream).not.toBeNull();
  156 |   let exported = '';
  157 |   for await (const chunk of stream!) exported += chunk.toString();
  158 |   expect(exported).toContain('Not recorded');
  159 |   expect(exported).toContain('Unavailable');
  160 |   expect(exported).not.toMatch(/NaN|undefined|Infinity|Prediction supported/);
  161 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots)).toEqual(incompleteStore);
  162 |   const exportLog = await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog);
  163 |   expect(exportLog).toHaveLength(1);
  164 |   expect(exportLog[0].text).toContain('Exported orbital evidence');
  165 | 
  166 |   const wrongWorldStore = {
  167 |     mercury: {
  168 |       a: { bodyId: 'earth', bodyName: 'Earth', time: 0, distance: 0.983, speed: 30.3, phase: 'Near perihelion' },
  169 |       b: { bodyId: 'mercury', bodyName: 'Mercury', time: 0.12, distance: 0.467, speed: 38.9, phase: 'Near aphelion' },
  170 |       prediction: 'faster',
  171 |       predictionResult: { choice: 'faster', actual: 'faster', correct: true, speedDelta: 8.6, distanceDelta: -0.516 },
  172 |       observationLogged: false,
  173 |     },
  174 |   };
  175 |   await updateState(page, { orr_snapshots: wrongWorldStore });
  176 |   await expect(quality).toContainText(/Recapture A/i);
  177 |   await expect(evidence.locator('.orr-evidence-result')).toHaveCount(0);
  178 |   await expect(evidence.getByRole('button', { name: 'Record orbital speed observation for Mercury', exact: true })).toHaveCount(0);
  179 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots)).toEqual(wrongWorldStore);
  180 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog)).toEqual(exportLog);
  181 |   expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  182 | });
  183 | 
  184 | test('explicit recapture repairs saved evidence and routes to paused orbit controls without changing it', async ({ page }) => {
  185 |   const earthEvidence = {
  186 |     a: { bodyId: 'earth', bodyName: 'Earth', time: 0, distance: 0.983, speed: 30.3, phase: 'Near perihelion' },
  187 |   };
  188 |   await mountJourney(page, 320, true, {
  189 |     orr_snapshots: { ...incompleteStore, earth: earthEvidence },
  190 |     orr_mission_progress: { mercury_speed: { started: true } },
  191 |     missionLog: [{ time: 'Earlier', text: 'Preserve my earlier work.' }],
  192 |   });
  193 |   const evidence = page.getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true });
  194 |   await evidence.getByRole('button', { name: 'Save orbital snapshot A for Mercury', exact: true }).click();
  195 |   const afterA = await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots);
  196 |   expect(afterA.earth).toEqual(earthEvidence);
  197 |   expect(afterA.mercury.a.bodyId).toBe('mercury');
  198 |   for (const field of ['time', 'distance', 'speed']) expect(Number.isFinite(afterA.mercury.a[field])).toBe(true);
  199 |   expect(afterA.mercury.b).toBeNull();
  200 |   expect(afterA.mercury.prediction).toBe('');
  201 |   expect(afterA.mercury.predictionResult).toBeNull();
  202 |   await evidence.getByRole('combobox', { name: 'Predict B: will orbital speed be faster, slower, or about the same as A?', exact: true }).selectOption('slower');
  203 |   await expect(evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury', exact: true })).toBeEnabled();
  204 | 
  205 |   const showControls = evidence.getByRole('button', { name: 'Show orbit controls', exact: true });
  206 |   await showControls.scrollIntoViewIfNeeded();
  207 |   // The map is above the evidence panel, so its clock does not advance offscreen.
  208 |   await showControls.evaluate((button) => button.scrollIntoView({ block: 'start' }));
  209 |   await updateState(page, { orr_paused: false });
  210 |   const beforeRoute = await investigationState(page);
  211 |   expect(beforeRoute.paused).toBe(false);
  212 |   await showControls.click();
  213 |   const phase = page.locator('#orrery-phase-scrubber');
  214 |   await expect(phase).toBeFocused();
  215 |   await expect(phase).toBeVisible();
> 216 |   expect(await investigationState(page)).toEqual({ ...beforeRoute, paused: true });
      |                                          ^ Error: expect(received).toEqual(expected) // deep equality
  217 | 
  218 |   await page.locator('#orrery-timeline-jump-2').click();
  219 |   await evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury', exact: true }).click();
  220 |   await expect(evidence.locator('.orr-evidence-result')).toHaveAttribute('data-supported', 'true');
  221 |   await expect(evidence).toContainText('Prediction supported');
  222 |   await expect(evidence).not.toContainText(/NaN|undefined|Infinity/);
  223 |   const repaired = await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots);
  224 |   expect(repaired.earth).toEqual(earthEvidence);
  225 |   expect(repaired.mercury.a).toEqual(afterA.mercury.a);
  226 |   expect(repaired.mercury.b.bodyId).toBe('mercury');
  227 |   expect(repaired.mercury.b.distance).toBeGreaterThan(repaired.mercury.a.distance);
  228 |   expect(repaired.mercury.b.speed).toBeLessThan(repaired.mercury.a.speed);
  229 |   await evidence.getByRole('button', { name: 'Record orbital speed observation for Mercury', exact: true }).click();
  230 |   const recorded = evidence.getByRole('button', { name: 'Observation already recorded for Mercury', exact: true });
  231 |   await expect(recorded).toBeDisabled();
  232 |   const savedLog = await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog);
  233 |   expect(savedLog).toHaveLength(2);
  234 |   expect(savedLog[0].text).toBe('Preserve my earlier work.');
  235 |   expect(savedLog[1].text).toContain('Orrery observation: Mercury');
  236 |   await updateState(page, { orr_zoom: 'full' });
  237 |   await expect(recorded).toBeDisabled();
  238 |   expect(await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog)).toEqual(savedLog);
  239 |   expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  240 |   expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  241 | });
  242 | 
```