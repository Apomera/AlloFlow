# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> enhanced workflow: inspect, sweep, compare and restore at 1000px
- Location: tests\e2e\26-bridgelab-gl.spec.ts:324:9

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('img', { name: 'Warren truss diagram', exact: true })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('img', { name: 'Warren truss diagram', exact: true })

```

```yaml
- heading "Bridge Engineering Lab" [level=2]
- text: Engineering Design · Structural Mechanics · NGSS HS-ETS1 + HS-PS2
- region "Stress Test":
  - text: Design brief
  - heading "Stress Test" [level=3]
  - paragraph: Start by stress-testing a bridge, then use material and force references only when you need evidence for a redesign.
  - button "Open Stress test" [pressed]: Stress test Change span, loads, and truss style.
  - button "Open Materials": Materials Compare strength, cost, and density.
  - button "Open Forces": Forces Read tension, compression, shear, and torsion.
  - button "Open Design cycle": Design cycle Plan, test, revise, and document.
  - text: Design readiness
  - strong: Ready for testing
  - text: SF 5.34 Warren truss, 6 bays, Structural Steel
  - img "Bridge readiness visual": SAFE
  - text: Span 36 m Load 150 kN Material Structural Steel Stress 10 MPa Mass 16100 kg Material cost $96601
  - button "Show reference tabs"
- tablist "Bridge Engineering sections":
  - tab "Stress Test" [selected]: 🔨 Stress Test
  - tab "Bridge Types": 🌉 Bridge Types
  - tab "Materials": 🧱 Materials
  - tab "Forces": ⚖️ Forces
  - tab "Design Cycle": 🔁 Design Cycle
  - tab "Quiz": 📝 Quiz
- tabpanel "Stress Test":
  - paragraph:
    - text: Warren truss bridge stress test. Adjust the parameters below and see how force distribution changes.
    - strong: Red = tension
    - text: ","
    - strong: blue = compression
    - text: ", thickness shows magnitude. Forces are solved exactly by the method of joints — every member force satisfies equilibrium at both of its ends."
  - group "Bridge view":
    - button "3D structure"
    - button "Labelled 2D view" [pressed]
  - region "Bridge side elevation horizontal scroll region":
    - img "Warren truss diagram Warren truss with 6 bays, span 36 meters, height 6 meters. Red members are in tension; blue members are in compression. Thickness shows magnitude of force.": DL0 150 kN Span = 36 m
  - text: "Tension Compression Thicker = larger force Supports: pin (left) ▲ · roller (right) ▲⊙"
  - heading "Loading" [level=3]
  - button "Uniform load distributed across all top joints (dead load equivalent)"
  - button "Moving vehicle single point load you can drag across the span" [pressed]
  - strong: "Moving-load analysis:"
  - button "🚗 Auto-Drive Vehicle Across Bridge"
  - text: real bridges are designed by sliding the worst possible vehicle across every point on the span and recording the maximum force in each member. The "influence line" of a member is how its force varies with the load's position. Each member has its own worst case — usually NOT in the same place as the worst case for any other member. Span (m) 36
  - slider "Span (m)": "35"
  - text: "The distance between the two supports. Longer spans are MUCH harder: forces grow fast with span. Height (m) 6"
  - slider "Height (m)": "6"
  - text: A taller truss spreads the load better, like a wider stance. Watch the safety factor rise as you raise it. Bays (triangle sections) 6
  - slider "Bays (triangle sections)": "6"
  - text: How many triangles the truss is divided into. More bays = shorter, sturdier pieces, but more joints to build. Vehicle position (0=left, 1=right) 0.2
  - slider "Vehicle position (0=left, 1=right)": "0.2"
  - text: Slide the truck across the bridge and watch the forces chase it. Vehicle weight (kN) 150
  - slider "Vehicle weight (kN)": "150"
  - text: Member cross-section (mm²) 14000
  - slider "Member cross-section (mm²)": "14000"
  - text: "Lateral bracing: every N panels (1 = every joint) 1"
  - 'slider "Lateral bracing: every N panels (1 = every joint)"': "1"
  - text: Cross-ties that stop the top chord flexing sideways. Fewer braces = longer free lengths = easier to buckle. This slider decides most verdicts here.
  - heading "Truss style" [level=3]
  - button "Warren alternating diagonals, no verticals" [pressed]
  - button "Pratt verticals + inward diagonals (in tension)"
  - button "Howe verticals + outward diagonals (in compression)"
  - button "K-truss K-shaped pattern, shorter diagonals"
  - text: Warren trusses (1848, James Warren) use equilateral triangles with no verticals. Alternating diagonals carry shear in alternating tension/compression. Efficient and elegant; common in shorter spans.
  - heading "Material" [level=3]
  - button "Wood (softwood)"
  - button "Stone"
  - button "Cast Iron"
  - button "Structural Steel" [pressed]
  - button "Reinforced Concrete"
  - button "FRP Composite (fiber-reinforced polymer)"
  - status:
    - text: "✓ SAFE — passes both yield and buckling checks Two different checks, both passed: the material is strong enough (yield), and no piece is so long and thin that it would snap sideways (buckling)."
    - strong: ✓ Strength (yield)
    - text: Safety factor 36.30 (max stress 10 MPa vs nominal strength 350 MPa)
    - strong: ✓ Stability (buckling)
    - text: "Governing member DL0: P_cr 716 kN vs compression 134 kN; length 6.7 m; slenderness 196 (pinned ends K=1; solid square section) Both checks meet this lab’s target for the current applied load. A safety factor of 2 is a learning target, not a bridge code approval."
  - text: "Max chord force 135 kN The biggest pull or squeeze in the long top/bottom pieces. (1 kN is about the weight of a washing machine.) Max diagonal force 134 kN The biggest force in the zig-zag pieces. Diagonals work hardest near the supports. Max stress 10 MPa Force squeezed into each bit of material. Must stay well BELOW the yield number beside it. Material yield 350 MPa The stress where this material starts to permanently bend or tear. Your ceiling. Buckling load (P_cr) 716 kN The push at which the weakest strut snaps sideways, like a spaghetti noodle pressed from both ends. Weakest strut DL0 The piece closest to buckling. Find it in the picture above; the whole bridge is only as safe as this one piece. Slenderness ratio (L/r) 196 Length divided by thickness. Long and thin = wobbly. Real design codes stop at about 200. Push-back at each support 75 kN How hard each end pushes back up. The two ends together carry the whole load. Diagonal angle 63° About 45\\u201360\\u00B0 is the sweet spot: steep enough to be short, shallow enough to share the load. Total member length 146.5 m All the pieces laid end to end. More length = more material = more cost. Estimated mass 16100 kg What the bare structure weighs. A bridge must carry itself before it carries anything else. Estimated material cost $96601 The engineering game: the CHEAPEST design that is still SAFE wins."
  - group: 📖 The words on this page, in plain language
  - heading "Test the whole crossing" [level=3]
  - paragraph: A passing result at one position can hide a weaker position elsewhere. Test the vehicle at every load-transfer joint and at 2% intervals across the span.
  - button "Test all positions"
  - heading "Follow the load" [level=3]
  - paragraph: Choose a member to inspect its force and margin. In the labelled 2D view, its identifier marks the same member. Positive forces pull; negative forces compress.
  - text: Inspect member
  - combobox "Inspect member":
    - option "BC0 · B0 → B1"
    - option "BC1 · B1 → B2"
    - option "BC2 · B2 → B3"
    - option "BC3 · B3 → B4"
    - option "BC4 · B4 → B5"
    - option "BC5 · B5 → B6"
    - option "TC0 · T0 → T1"
    - option "TC1 · T1 → T2"
    - option "TC2 · T2 → T3"
    - option "TC3 · T3 → T4"
    - option "TC4 · T4 → T5"
    - option "DL0 · B0 → T0" [selected]
    - option "DR0 · T0 → B1"
    - option "DL1 · B1 → T1"
    - option "DR1 · T1 → B2"
    - option "DL2 · B2 → T2"
    - option "DR2 · T2 → B3"
    - option "DL3 · B3 → T3"
    - option "DR3 · T3 → B4"
    - option "DL4 · B4 → T4"
    - option "DR4 · T4 → B5"
    - option "DL5 · B5 → T5"
    - option "DR5 · T5 → B6"
  - status:
    - strong: DL0 · Compression · -134.16 kN
    - text: "Member length: 6.71 m · Stress: 9.58 MPa Governing safety factor: 5.34 Buckling length: 6.71 m"
  - paragraph: "Support balance: 120.00 + 30.00 = 150.00 kN total applied load."
  - group: All member forces
  - heading "Design notebook" [level=3]
  - paragraph: Save a starting design, change one variable, then compare the result. Keep up to four trials with your design notes.
  - button "Save current design"
  - text: 0 / 4
  - button "Open design report"
  - paragraph: No trials yet. Save this design before your next change.
  - heading "Design notes (optional, included on print)" [level=3]
  - textbox "Bridge design name":
    - /placeholder: Design name (e.g., "Marie's pedestrian bridge over Back Cove")
    - text: Baseline bridge
  - textbox "Bridge design notes":
    - /placeholder: Why this material? What are the constraints? What would you improve?
    - text: Compare one change at a time.
  - heading "💰 Cost optimization — what's the cheapest design that passes?" [level=3]
  - paragraph: Real engineering is not just "does it work?" — it is "what's the cheapest design that works?" This optimizer sweeps every combination of material + cross-section, keeps only those that pass your target safety factor for BOTH yield AND buckling, and ranks them by material cost. Span, height, number of bays, and load remain at your current settings.
  - text: Target safety factor 2.0
  - slider "Target safety factor": "2"
  - text: "1.5 (very thin margin) 2.0 (learning target) 4.0+ (conservative) 6.0 (Brooklyn Bridge) ✓ 143 combinations pass. Top 5 by cost:"
  - region "Top bridge designs by cost":
    - table:
      - rowgroup:
        - row "Rank Material Cross-section SF yield SF buckling Mass Cost (USD)":
          - columnheader "Rank"
          - columnheader "Material"
          - columnheader "Cross-section"
          - columnheader "SF yield"
          - columnheader "SF buckling"
          - columnheader "Mass"
          - columnheader "Cost (USD)"
      - rowgroup:
        - row "🏆 1 Stone 17,500 mm² 12.96 2.09 6922 kg $6153":
          - cell "🏆 1"
          - cell "Stone"
          - cell "17,500 mm²"
          - cell "12.96"
          - cell "2.09"
          - cell "6922 kg"
          - cell "$6153"
        - row "2 Stone 18,000 mm² 13.33 2.21 7120 kg $6329":
          - cell "2"
          - cell "Stone"
          - cell "18,000 mm²"
          - cell "13.33"
          - cell "2.21"
          - cell "7120 kg"
          - cell "$6329"
        - row "3 Stone 18,500 mm² 13.70 2.33 7318 kg $6505":
          - cell "3"
          - cell "Stone"
          - cell "18,500 mm²"
          - cell "13.70"
          - cell "2.33"
          - cell "7318 kg"
          - cell "$6505"
        - row "4 Stone 19,000 mm² 14.07 2.46 7515 kg $6680":
          - cell "4"
          - cell "Stone"
          - cell "19,000 mm²"
          - cell "14.07"
          - cell "2.46"
          - cell "7515 kg"
          - cell "$6680"
        - row "5 Stone 19,500 mm² 14.44 2.59 7713 kg $6856":
          - cell "5"
          - cell "Stone"
          - cell "19,500 mm²"
          - cell "14.44"
          - cell "2.59"
          - cell "7713 kg"
          - cell "$6856"
  - strong: "Note:"
  - text: Cost estimate is material-only — doesn't include labor, fabrication, transport, fastening, or maintenance over the bridge's lifetime. Real bridge economics also factor in durability (steel maintenance vs concrete) + replacement cycle. But raw material cost is the starting line.
  - strong: "Click the winner:"
  - button "Apply this design to my bridge"
  - heading "A note on this analysis" [level=3]
  - paragraph: "Model scope: one idealized truss plane with pin joints and solid square members. Quantities cover that plane only; the second truss, deck, lateral bracing, connections and labor are excluded. Only the entered loads are applied; self-weight is not added automatically. All materials use a single nominal strength in both tension and compression, which cannot represent brittle stone, cast iron, grain direction or reinforced-concrete behavior."
  - strong: ✓ Exact analysis (Method of Joints).
  - text: "Forces are computed from 2D pin-jointed equilibrium: for each joint, sum of forces in x and sum of forces in y both equal zero. The resulting linear system (26 equations, 26 unknowns) is solved by Gaussian elimination with partial pivoting. Hover over any member in the diagram to see its exact tension or compression force. The maximum chord force (135 kN) and maximum diagonal force (134 kN) are now the actual peak member forces, not deep-beam approximations."
```

# Test source

```ts
  236 |     await mount(page, { span: 30, height: 6, nBays: 4, crossSectionMm2: 5000 });
  237 |     expect(await page.evaluate(() => (window as any).__bucket().lateralBraceEvery)).toBeUndefined();
  238 |     const txt = await page.evaluate(() => (window as any).__text());
  239 |     expect(txt).not.toContain('buckling SIDEWAYS');
  240 |     // It buckles, but in-plane — i.e. governed by the member's own length, which
  241 |     // is exactly what the pre-change code computed.
  242 |     expect(await page.evaluate(() => (window as any).__gl().bowedAxis)).toBe('in-plane');
  243 |   });
  244 | 
  245 |   test('the failed member is drawn bowed, and only when it fails', async ({ page }) => {
  246 |     await mount(page, { span: 36, height: 6, nBays: 6, crossSectionMm2: 14000, lateralBraceEvery: 1 });
  247 |     expect(await page.evaluate(() => (window as any).__gl().bowedMember)).toBeNull();
  248 |     await page.evaluate(() => (window as any).__set({ lateralBraceEvery: 6 }));
  249 |     await page.waitForTimeout(500);
  250 |     const gl = await page.evaluate(() => (window as any).__gl());
  251 |     expect(gl.bowedMember).toBeTruthy();
  252 |     expect(String(gl.bowedMember)).toMatch(/^TC/);   // a top chord, as the physics says
  253 |     // And it bows the way it actually failed, not just some way.
  254 |     expect(gl.bowedAxis).toBe('out-of-plane');
  255 |   });
  256 | 
  257 |   test('the elevation survives underneath as the guaranteed floor', async ({ page }) => {
  258 |     await mount(page, { span: 30, height: 6, nBays: 4 });
  259 |     // Hidden with visibility, never removed — exports and DOM queries still work.
  260 |     expect(await page.evaluate(() => (window as any).__svgCount())).toBeGreaterThan(0);
  261 |   });
  262 | 
  263 |   test('the loading overlay actually goes away', async ({ page }) => {
  264 |     // The viewer status flips asynchronously, long after the render that mounted
  265 |     // it. Nothing in React was watching, so the overlay sat on top of a working
  266 |     // canvas — a dead overlay that every other test in this file would pass
  267 |     // straight through, because the scene underneath was genuinely fine.
  268 |     await mount(page, { span: 30, height: 6, nBays: 4 });
  269 |     expect(await page.evaluate(() => (window as any).__text())).not.toContain('Loading 3D view');
  270 |     // And the affordance it replaces is really offered.
  271 |     expect(await page.evaluate(() => (window as any).__text())).toContain('Drag');
  272 |   });
  273 | 
  274 |   test('every truss style builds without throwing', async ({ page }) => {
  275 |     await mount(page, { span: 36, height: 6, nBays: 6, trussStyle: 'warren' });
  276 |     for (const style of ['pratt', 'howe', 'ktruss', 'warren']) {
  277 |       await page.evaluate((s) => (window as any).__set({ trussStyle: s }), style);
  278 |       await page.waitForTimeout(350);
  279 |       const gl = await page.evaluate(() => (window as any).__gl());
  280 |       expect(gl.state, `style ${style}`).toBe('ready');
  281 |       expect(gl.contextLost, `style ${style}`).toBe(false);
  282 |     }
  283 |     expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
  284 |   });
  285 | 
  286 |   test('drag orbits the camera, which the overlay claims', async ({ page }) => {
  287 |     await mount(page, { span: 30, height: 6, nBays: 4 });
  288 |     const before = await page.evaluate(() => (window as any).__bucket().rot3d);
  289 |     await page.evaluate(() => {
  290 |       const c = document.querySelector('canvas[data-bridge-gl="true"]') as HTMLCanvasElement;
  291 |       const host = c.parentElement as HTMLElement;
  292 |       const r = host.getBoundingClientRect();
  293 |       const mk = (t: string, x: number, y: number) =>
  294 |         new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, cancelable: true, pointerId: 1 });
  295 |       host.dispatchEvent(mk('pointerdown', r.left + r.width / 2, r.top + r.height / 2));
  296 |       host.dispatchEvent(mk('pointermove', r.left + r.width / 2 + 90, r.top + r.height / 2));
  297 |       host.dispatchEvent(mk('pointerup', r.left + r.width / 2 + 90, r.top + r.height / 2));
  298 |     });
  299 |     await page.waitForTimeout(400);
  300 |     const after = await page.evaluate(() => (window as any).__bucket().rot3d);
  301 |     expect(after.rotY).toBeGreaterThan((before?.rotY ?? 26) + 10);
  302 |   });
  303 | 
  304 |   test('changing the span does not remount the canvas', async ({ page }) => {
  305 |     await mount(page, { span: 30, height: 6, nBays: 4 });
  306 |     for (const span of [36, 44, 52]) {
  307 |       await page.evaluate((s) => (window as any).__set({ span: s }), span);
  308 |       await page.waitForTimeout(200);
  309 |     }
  310 |     expect(await page.evaluate(() => (window as any).__canvasCount())).toBe(1);
  311 |     const gl = await page.evaluate(() => (window as any).__gl());
  312 |     expect(gl.state).toBe('ready');
  313 |     expect(gl.extent.w).toBe(52);
  314 |   });
  315 | 
  316 |   test('tears the renderer down on unmount', async ({ page }) => {
  317 |     await mount(page, { span: 30, height: 6, nBays: 4 });
  318 |     await page.evaluate(() => (window as any).__destroy());
  319 |     await page.waitForTimeout(400);
  320 |     expect(await page.evaluate(() => (window as any).__gl().state)).toBe('idle');
  321 |   });
  322 | 
  323 |   for (const width of [1000, 390, 320]) {
  324 |     test(`enhanced workflow: inspect, sweep, compare and restore at ${width}px`, async ({ page }) => {
  325 |       await mountWorkflow(page, width, {
  326 |         span: 36, height: 6, nBays: 6, crossSectionMm2: 14000,
  327 |         lateralBraceEvery: 1, loadMode: 'vehicle', vehiclePos: 0.2,
  328 |         designName: 'Baseline bridge', designNotes: 'Compare one change at a time.'
  329 |       });
  330 |       const canvas = page.locator('canvas[data-bridge-gl="true"]');
  331 |       await expect(canvas).toBeVisible();
  332 |       await page.screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-overview.png`) });
  333 | 
  334 |       await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
  335 |       await expect(page.getByRole('button', { name: 'Labelled 2D view', exact: true })).toHaveAttribute('aria-pressed', 'true');
> 336 |       await expect(page.getByRole('img', { name: 'Warren truss diagram', exact: true })).toBeVisible();
      |                                                                                          ^ Error: expect(locator).toBeVisible() failed
  337 |       await page.getByLabel('Inspect member', { exact: true }).selectOption('BC0');
  338 |       await expect(page.locator('[data-bridge-inspector] [role="status"]')).toContainText('BC0');
  339 |       await expect(page.locator('[data-bridge-member="BC0"] text')).toHaveText('BC0');
  340 |       await page.locator('[data-bridge-inspector] summary').click();
  341 |       await expect(page.getByRole('region', { name: 'Member force table', exact: true })).toBeVisible();
  342 |       await page.locator('[data-bridge-inspector]').screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-inspector.png`) });
  343 |       await page.getByRole('img', { name: 'Warren truss diagram', exact: true }).screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-elevation.png`) });
  344 | 
  345 |       await page.getByRole('button', { name: 'Test all positions', exact: true }).click();
  346 |       await expect(page.locator('[data-bridge-sweep]')).toContainText('Lowest safety factor across the crossing:');
  347 |       const sweep = await page.evaluate(() => (window as any).__bucket().vehicleSweep);
  348 |       expect(sweep.samples.length).toBeGreaterThanOrEqual(51);
  349 |       expect(sweep.worst.sf).toBeGreaterThan(0);
  350 |       await page.getByRole('button', { name: 'Inspect worst position', exact: true }).click();
  351 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(sweep.worst.position);
  352 |       await page.locator('[data-bridge-sweep]').screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-sweep.png`) });
  353 | 
  354 |       await page.getByRole('button', { name: 'Save current design', exact: true }).click();
  355 |       await expect(page.locator('[data-bridge-notebook] article')).toHaveCount(1);
  356 |       const baseline = await page.evaluate(() => (window as any).__bucket().designTrials[0].inputs);
  357 |       const area = page.getByRole('slider', { name: 'Member cross-section (mm²)', exact: true });
  358 |       await area.focus();
  359 |       await area.press('ArrowRight');
  360 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().crossSectionMm2)).toBe(14500);
  361 |       await expect(page.locator('[data-bridge-sweep]')).toContainText('The design changed. Run the crossing test again');
  362 |       await expect(page.getByRole('button', { name: 'Inspect worst position', exact: true })).toHaveCount(0);
  363 |       await page.getByRole('textbox', { name: 'Bridge design name', exact: true }).fill('Thicker section');
  364 |       await page.getByRole('button', { name: 'Save current design', exact: true }).click();
  365 |       await expect(page.locator('[data-bridge-notebook] article')).toHaveCount(2);
  366 |       await page.getByRole('button', { name: 'Restore Baseline bridge', exact: true }).click();
  367 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().crossSectionMm2)).toBe(baseline.crossSectionMm2);
  368 |       await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(baseline.vehiclePos);
  369 |       await expect(page.getByRole('textbox', { name: 'Bridge design notes', exact: true })).toHaveValue('Compare one change at a time.');
  370 |       await page.locator('[data-bridge-notebook]').screenshot({ path: join(ENHANCEMENT_REPORT, `bridge-${width}-notebook.png`) });
  371 |       await checkWorkflowHealth(page);
  372 |     });
  373 |   }
  374 | 
  375 |   test('enhanced workflow: auto-drive visibly updates the vehicle and pauses on manual input', async ({ page }) => {
  376 |     await mountWorkflow(page, 1000, { loadMode: 'vehicle', vehiclePos: 0, introDismissed: true });
  377 |     await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
  378 |     const elevation = page.getByRole('img', { name: 'Warren truss diagram', exact: true });
  379 |     const before = await elevation.textContent();
  380 |     await page.getByRole('button', { name: 'Auto-Drive Vehicle Across Bridge' }).click();
  381 |     await expect.poll(() => page.evaluate(() => (window as any).__bucket().vehiclePos)).toBeGreaterThan(0.1);
  382 |     await expect(page.getByRole('button', { name: 'Stop Drive' })).toHaveAttribute('aria-pressed', 'true');
  383 |     expect(await elevation.textContent()).not.toBe(before);
  384 |     const position = page.getByRole('slider', { name: 'Vehicle position (0=left, 1=right)', exact: true });
  385 |     await position.focus();
  386 |     await position.press('End');
  387 |     await expect.poll(() => page.evaluate(() => (window as any).__bucket().autoDriving)).toBe(false);
  388 |     const stopped = await page.evaluate(() => (window as any).__bucket().vehiclePos);
  389 |     await page.waitForTimeout(300);
  390 |     expect(await page.evaluate(() => (window as any).__bucket().vehiclePos)).toBe(stopped);
  391 |     await checkWorkflowHealth(page);
  392 |   });
  393 | });
  394 | 
```