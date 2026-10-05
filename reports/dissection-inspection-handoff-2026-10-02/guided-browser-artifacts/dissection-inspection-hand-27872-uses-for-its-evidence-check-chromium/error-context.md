# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-inspection-handoff.spec.ts >> the record inspection shortcut follows the current guided target and pauses for its evidence check
- Location: tests\e2e\dissection-inspection-handoff.spec.ts:101:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: locator('[data-record-complete]')
Expected: "true"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 15000ms
  - waiting for locator('[data-record-complete]')

```

```yaml
- link "Skip to interactive specimen":
  - /url: "#diss-canvas"
- link "Skip to structure directory and notes":
  - /url: "#diss-structure-directory"
- status: Progress saved locally on this device.
- region "Virtual Dissection Lab":
  - paragraph: Virtual Biology Laboratory
  - heading "Virtual Dissection Lab" [level=2]
  - paragraph: "Work through the specimen one clear action at a time. Current focus: Verify observation."
  - list "Dissection workflow":
    - listitem: Orient
    - listitem: Prepare
    - listitem: Reveal
    - listitem: Identify
    - listitem: Record evidence
    - listitem: Review
  - paragraph: Virtual practice supports observation and comparison. Follow your instructor’s safety, ethics, handling, and disposal procedures for any physical specimen.
  - navigation "Lab workspace shortcuts":
    - button "Go to specimen"
    - button "Structures and notes"
    - button "Continue activity"
  - text: Specimen 🐸 Frog (Rana) Layer 1 of 5 · Skin Structures viewed 2 of 37
- region "Choose the observation that supports Nictitating Membrane":
  - text: Step 4 of 6 Next best action · Verify observation
  - heading "Choose the observation that supports Nictitating Membrane" [level=3]
  - paragraph: Locating the target marks it viewed; a matching specimen observation is required before the Guided step advances.
  - text: 🐸 Frog (Rana) 🟢 Skin · layer 1/5
  - button "Complete evidence check"
  - button "View specimen"
- toolbar "Learning route":
  - button "Procedure practice": 🔎 Procedure practice
  - button "Guided investigation" [pressed]: 🧭 Guided investigation
  - button "Study tools": 📚 Study tools
  - button "Practice assessment": 🧠 Practice assessment
  - group "Workspace detail":
    - button "Essentials workspace" [pressed]: Essentials
    - button "Advanced workspace": Advanced
- region "Choose a specimen":
  - heading "Choose a specimen" [level=3]
  - paragraph: 7 comparative anatomy models
  - tablist "Dissection specimens":
    - 'tab "Select specimen: Frog (Rana)" [selected]': 🐸 Frog (Rana)
    - 'tab "Select specimen: Earthworm (Lumbricus)"': 🪱 Earthworm (Lumbricus)
    - 'tab "Select specimen: Fetal Pig (Sus scrofa)"': 🐷 Fetal Pig (Sus scrofa)
    - 'tab "Select specimen: Perch (Perca)"': 🐟 Perch (Perca)
    - 'tab "Select specimen: Crayfish (Cambarus)"': 🦞 Crayfish (Cambarus)
    - 'tab "Select specimen: Sheep Eye"': 👁️ Sheep Eye
    - 'tab "Select specimen: Sheep Heart"': ❤️ Sheep Heart
- navigation "Anatomical layers":
  - heading "Anatomical layers" [level=3]
  - paragraph: 0 of 5 layers revealed
  - toolbar "Specimen display and lab tool controls":
    - button "View and accessibility options": 👁 View & access ▼
  - 'button "Layer 1: Skin, current"': 🟢 Skin Awaiting reveal
  - 'button "Layer 2: Muscle, locked" [disabled]': 💪 Muscle Reveal Skin first
  - 'button "Layer 3: Organs, locked" [disabled]': 🫁 Organs Reveal Muscle first
  - 'button "Layer 4: Skeleton, locked" [disabled]': 🦴 Skeleton Reveal Organs first
  - 'button "Layer 5: Nervous, locked" [disabled]': ⚡ Nervous Reveal Skeleton first
  - paragraph: Use Left and Right to browse available layers; Enter selects. Scroll to see all layers.
- 'tabpanel "Select specimen: Frog (Rana)"':
  - region "What observation supports this identification?":
    - paragraph: Guided evidence check
    - heading "What observation supports this identification?" [level=3]
    - paragraph: You located Nictitating Membrane. Choose the description that matches what this structure looks like or does. Locating alone does not advance the step.
    - text: ✓ Locate Done Observe Current Verify Upcoming
    - group "Choose the matching specimen observation":
      - button "Transparent third eyelid protecting eye underwater."
      - button "Lighter, thinner ventral surface."
      - button "External eardrum behind eye."
    - paragraph: Arrow keys browse choices. Enter or Space checks the focused choice.
  - region "🐸 Frog (Rana) · Skin":
    - text: Interactive specimen
    - heading "🐸 Frog (Rana) · Skin" [level=3]
    - text: High-definition field · 92%
    - group:
      - strong: View & orientation
      - text: Ventral · Skin +
    - 'group "Current action: Choose the observation that supports Nictitating Membrane. Verify observation. Workflow step 4 of 6"':
      - strong: Next · Choose the observation that supports Nictitating Membrane
      - text: Verify observation Workflow 4/6
    - group:
      - strong: Field monitor
      - text: High-definition field Exposure and tissue-response details
    - 'group "Current pointer mode: Locate the guided target. Select a visible structure; procedure tools are paused during Guided investigation."':
      - strong: Pointer mode ? Locate the guided target
      - text: Select a visible structure; procedure tools are paused during Guided investigation.
    - text: Frog (Rana) interactive specimen · Skin layer, ventral view
    - region "Specimen canvas description":
      - heading "Specimen canvas description" [level=4]
      - paragraph: Every canvas selection and drag action has a keyboard or button alternative. Use the structure directory for equivalent anatomical descriptions, the technique action button instead of drawing a stroke, the pin action button instead of dragging a pin, the probe action button instead of tracing a structure, and the pan controls instead of dragging a zoomed view. When the depth atlas is enabled, surface landmarks use circles, mid-depth landmarks use diamonds, and deep landmarks use double rings.
      - paragraph: "Frog (Rana) virtual dissection. Specimen-specific procedure: Frog ventral midline access; recommended view ventral; access route shallow ventral midline corridor; protected landmarks Heart (3-chamber), Liver (3 lobes), Lungs. Current view: ventral, standard condition, Skin layer. Progressive exposure: Fully exposed field, 100 percent; decision quality 98 percent. Observation field: High-definition field, 92 percent; limiting factor: No major limiter. Surface model: moist chromatophore surface. Surface microtexture uses chromatophores detail aligned to overhead illumination, with sheen adjusted for 67 percent moisture and standard condition. Tool contact response: elastic skin. Light direction: overhead. Illumination 68 percent: Balanced illumination; glare risk 6 percent. Focus isolation on. Tissue relief on and responsive to the inspection light. Depth atlas off. Selected and hovered structures use a labeled depth footprint with front and back edges, visibility-specific line styles, and boundary-attached relationship paths. Relationship types use distinct line patterns and moving marker shapes, with fixed markers when motion is reduced. Tubular, lobed, chambered, layered, and compact structure classes use distinct contours, internal patterns, and text labels. Anatomical orientation axis uses a circle for anterior and a diamond for posterior; current and target views are stated in text. View and layer navigation uses a labeled orientation sweep with circle start and diamond target markers, plus concentric depth rings for deeper or superficial movement; reduced motion switches instantly and uses text announcements. Depth motion off. 3 directly visible structures. Active instrument: forceps. Action readiness: Technique complete, 76 percent. Technique protocol complete. Continue with visible structure identification and evidence.. Directional contact footprint feedback is active. Engaged instrument tips use foreground tissue lips and paired depth notches to show partial insertion and opening-edge occlusion. Directional target guidance uses a dashed arrow, labeled endpoint, and shape-coded reticle when an instrument is spatially misaligned. Localized action outcomes use a one-shot check or warning symbol with the changed tissue metric. Tissue opening, retraction, stabilization, hydration, and risk metrics transition spatially after each action; Undo reverses openings, retraction, pin placement, hydration, wick evidence, and probe traces; reduced motion snaps to the final state. Three-dimensional instrument pitch feedback is active. Light-aware instrument elevation feedback is active. Equivalent keyboard and button actions include an instrument approach, contact, and release replay. Recorded attempt replay progressively traces pressure with line width and states path alignment in text and shape. Direct forceps press-drag-release manipulation shows live lift direction, safe range, calibrated grip, speed, control, slip risk, and excess tension with text and geometry; the technique action button remains equivalent. Live pin stability preview shows endpoint spacing, calibrated angle, insertion depth, and flap tension with text and geometry. Direct pin press-drag-release placement adds shaft alignment, insertion travel, safe depth, and control feedback. Live probe palpation preview shows calibrated pressure, material resistance, anatomical depth, and tissue deformation with text and shape. Direct probe press-drag-release tracing adds contact coverage, alignment, resistance, deformation, and control feedback. Direct dropper press-drag-release hydration adds contact coverage, flow alignment, moisture, dose, and pooling feedback. Direct wick press-drag-release recovery adds pool-edge alignment, contact coverage, recovery distance, and control feedback. Live dropper spread forecast shows dose count, organism-specific flow direction, current saturation, and pooling risk with text and geometry. Absorbent-wick feedback shows pool-edge targeting, fluid recovery, and a localized balanced-film marker with text and cross-hatched geometry. Guided procedure handoff cue connects the next required instrument to its anatomical target and 6-step progress rail with text, shape, and line style. Persistent localized technique evidence maps edge stress, grip compression, anchor tension, probe pressure, and saline pooling to actual contact locations with text and distinct geometry; direct wick recovery maps pool-edge contact, recovery distance, and control. Press the opened tissue edge, drag away while monitoring lift and tension, then release inside the solid safe envelope; the equivalent technique action button remains available. Occluded structures remain available in the structure directory."
    - application "Frog (Rana) interactive specimen · Skin layer, ventral view"
    - button "Zoom out canvas": ➖
    - text: 100%
    - button "Zoom in canvas": ➕
    - paragraph: Every canvas action has a keyboard or button alternative. The specimen canvas description lists them.
    - status: "Verify observation: Choose the observation that supports Nictitating Membrane. Locating the target marks it viewed; a matching specimen observation is required before the Guided step advances."
    - group: Evidence notebook · 0/6 frames
    - region "Layer review":
      - text: Skin
      - heading "Layer review" [level=3]
      - text: Inspect structures
      - region "Investigation progress":
        - heading "Investigation progress" [level=4]
        - strong: "Verified technique: 6 of 6"
        - 'progressbar "Verified technique: 6 of 6"'
        - text: Actions with a confirmed plan and explanation.
        - strong: "Structures inspected: 2 of 4"
        - 'progressbar "Structures inspected: 2 of 4"'
        - text: Structures viewed across this layer’s anatomical views.
        - strong: "Evidence recorded: 2 of 4"
        - 'progressbar "Evidence recorded: 2 of 4"'
        - text: Inspected structures with a note and confidence rating.
      - status: "Latest action: probe"
      - heading "What you did" [level=4]
      - paragraph: 6 of 6 protocol actions complete. 6 of 6 actions have verified plans and explanations.
      - text: Supported technique
      - paragraph: The motor-neutral control performed this action.
      - paragraph:
        - strong: Recorded action
      - strong: "Simulation result:"
      - list:
        - listitem: Full instrument sequence completed
        - listitem: Cautions within the chosen limit
        - listitem: High modeled tissue preservation
      - heading "What changed" [level=4]
      - paragraph: Before → After · values out of 100
      - text: Clarity
      - strong: 91 → 91
      - text: 0 points Unchanged Exposure
      - strong: 87 → 87
      - text: 0 points Unchanged Stability
      - strong: 84 → 84
      - text: 0 points Unchanged Risk
      - strong: 16 → 16
      - text: 0 points Unchanged
      - group: What do these measures mean?
      - button "Replay reviewed action"
      - button "Return to history"
      - heading "Try next" [level=4]
      - text: Current setup
      - paragraph: Follow the guided observation prompt and explain the evidence you can see.
      - button "Review guided observation"
      - group: About technique feedback
      - group: Action history6 saved records
    - group "Technique practice · ready to complete":
      - strong: Technique controls
      - text: Protocol complete
  - complementary "Structure directory and lab notes":
    - link "Return to interactive specimen":
      - /url: "#diss-canvas"
    - group: Review observations · 2 inspected
    - region "🟢 Skin structures (4)":
      - heading "🟢 Skin structures (4)" [level=3]
      - text: Find a structure
      - textbox "Find a structure":
        - /placeholder: Search names or functions…
        - text: Nictitating Membrane
      - paragraph: Down arrow moves to results. Use Up and Down to browse; Enter opens a result. Escape clears search and filters.
      - group "Filter structures by learning progress":
        - button "All structures, 1 structures" [pressed]: All structures 1
        - button "To inspect, 0 structures": To inspect 0
        - button "Needs notes, 0 structures": Needs notes 0
        - button "Recorded, 1 structures": Recorded 1
      - paragraph: Filters apply to this layer. Recorded means a note and confidence are present, not verified mastery.
      - button "Clear search and filters"
      - status: 1 matching structure in Skin.
      - region "Directory results":
        - button "Nictitating Membrane, viewed": Nictitating Membrane Note and confidence recorded
    - text: Layer Progress 🟢 Skin 💪 Muscle 🫁 Organs 🦴 Skeleton ⚡ Nervous
    - paragraph: Classic vertebrate — 3-chambered heart, cutaneous respiration, metamorphosis.
    - paragraph: "Comparative learning model: specimen observations and human clinical connections are labeled separately. Anatomy varies by species, age, preservation, and individual."
    - group: Biology fact ＋
    - text: 📊 Learning evidence 8%
    - 'progressbar "Observation: structures viewed 2 of 37"'
    - text: "Observation: 2 of 37 structures viewed Technique 20%"
    - progressbar "Technique evidence"
    - text: Observation 5%
    - progressbar "Observation evidence"
    - text: Evidence 5%
    - progressbar "Evidence evidence"
    - text: Understanding 0%
    - progressbar "Understanding evidence"
    - text: 0/2 guided identifications verified · 2/37 evidence records · completed first-attempt assessment 0/0 Practice in progress Continue the investigation; the log distinguishes viewing from verified understanding.
    - button "Copy practice log to clipboard": Copy practice log
    - group: Specimen stats ＋
    - group: Learning objectives ＋
    - group: Key terms ＋
- status
```

# Test source

```ts
  5   | const out = 'reports/dissection-inspection-handoff-2026-10-02';
  6   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  7   | const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
  8   | const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  9   | const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
  10  | const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, revealedLayers: {}, exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
  11  | test.describe.configure({ retries: 0 }); test.use({ video: 'off' });
  12  | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  13  | test.afterAll(async () => { await harness.stop(); });
  14  | test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });
  15  | 
  16  | async function mount(page: Page, state: any = {}, width = 390, available = width) {
  17  |   await page.setViewportSize({ width, height: 1000 });
  18  |   await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: complete }, ...state } }, undefined, { expectCanvas: false });
  19  |   await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  20  |   await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
  21  | }
  22  | async function catalog(page: Page) { return page.locator('.diss-directory-item').evaluateAll(nodes => nodes.map(node => ({ id: node.id.replace('diss-organ-', ''), name: node.querySelector('.diss-directory-item__name')!.textContent!, exposure: node.getAttribute('data-exposure-state') }))); }
  23  | async function seed(page: Page, state: any = {}, width = 390, available = width) {
  24  |   await mount(page, {}, width, available); const organs = await catalog(page), current = organs.find(org => org.exposure === 'visible')!; expect(organs).toHaveLength(4); await harness.unmount(page);
  25  |   const target = organs.find(org => org.id !== current.id && org.exposure === 'visible')!; expect(target).toBeTruthy();
  26  |   await mount(page, { selectedOrgan: current.id, exploredOrgans: { ['frog|' + current.id]: true }, organNotes: { ['frog|' + current.id]: 'I observed the surface and checked a nearby landmark.' }, organConfidence: { ['frog|' + current.id]: 2 }, ...state }, width, available); return { organs, current, target };
  27  | }
  28  | async function evidence(page: Page) { return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioCompletedAt], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] }; }); }
  29  | const action = (page: Page) => page.locator('[data-dissection-next-action]');
  30  | 
  31  | for (const { name, width, available, large, contrast, forced } of [
  32  |   { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  33  |   { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
  34  | ]) test(`inspection ${name} shows readable directory shortcuts and previews without credit`, async ({ page }) => {
  35  |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); if (forced) await page.emulateMedia({ forcedColors: 'active' });
  36  |   const { target } = await seed(page, { largeText: !!large, highContrast: !!contrast, organSearch: 'old query', directoryFilter: 'recorded' }, width, available), before = await evidence(page), card = action(page), handoff = page.locator('[data-note-handoff]');
  37  |   await expect(card).toHaveAttribute('data-inspection-target', target.id); await expect(handoff.locator('[data-next-inspection]')).toHaveAttribute('data-next-inspection', target.id);
  38  |   await expect(handoff).toContainText('3 more structures need inspection'); await card.locator('[data-inspection-directory-action]').focus();
  39  |   await card.screenshot({ path: `${out}/${name}-next-action.png`, style: '.diss-next-action {position:static!important;}' }); await handoff.screenshot({ path: `${out}/${name}-record.png`, style: '.diss-next-action {position:static!important;}' });
  40  |   const metrics = await page.evaluate(() => Array.from(document.querySelectorAll('[data-inspection-target],[data-note-handoff]')).map(node => ({ client: node.clientWidth, scroll: node.scrollWidth,
  41  |     targets: Array.from(node.querySelectorAll('button')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ label: el.textContent, height: el.getBoundingClientRect().height, clipped: el.scrollWidth > el.clientWidth + 1 })),
  42  |     text: Array.from(node.querySelectorAll('h3,h4,p,strong,span,button,.diss-next-action__step')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth + 1 })) })));
  43  |   await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2)); expect(metrics).toHaveLength(2);
  44  |   for (const panel of metrics) { expect(panel.scroll).toBeLessThanOrEqual(panel.client + 1); for (const target of panel.targets) { expect(target.height, target.label || '').toBeGreaterThanOrEqual(47.9); expect(target.clipped).toBe(false); } for (const text of panel.text) { expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped, text.text || '').toBe(false); } }
  45  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-inspection-target]'], ['[data-note-handoff]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  46  |   await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  47  |   await card.locator('[data-inspection-directory-action]').focus(); await page.keyboard.press('Enter'); await expect(page.locator('#diss-organ-' + target.id)).toBeFocused(); await expect(page.locator('#diss-organ-search')).toHaveValue(target.name); await expect(page.locator('[data-directory-filter="all"]')).toHaveAttribute('aria-pressed', 'true');
  48  |   expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]); await page.locator('#diss-organ-' + target.id).screenshot({ path: `${out}/${name}-focused-result.png` });
  49  | });
  50  | 
  51  | test('the record shortcut previews a visible target and inspection requires a separate activation', async ({ page }) => {
  52  |   const { target } = await seed(page), before = await evidence(page); await page.locator('[data-record-inspection-action]').click(); await expect(page.locator('#diss-organ-' + target.id)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  53  |   await page.keyboard.press('Enter'); const after = await evidence(page); expect(after.explored).toEqual({ ...before.explored, ['frog|' + target.id]: true }); expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.verified).toEqual(before.verified); expect(after.scores).toEqual(before.scores); expect(after.procedures).toEqual(before.procedures); expect(after.view).toEqual(before.view); expect(after.instrument).toEqual(before.instrument);
  54  |   await expect(page.locator('[data-progress-kind="inspected"] progress')).toHaveAttribute('value', '2'); await expect(page.locator('[data-progress-kind="recorded"] progress')).toHaveAttribute('value', '1'); await expect(page.locator('#diss-selection-title')).toBeFocused();
  55  | });
  56  | 
  57  | test('an occluded target can be previewed and cannot earn inspection credit', async ({ page }) => {
  58  |   const { organs } = await seed(page); await harness.unmount(page); const hidden = organs.find(org => org.exposure === 'occluded')!, visible = organs.filter(org => org.id !== hidden.id);
  59  |   await mount(page, { exploredOrgans: Object.fromEntries(visible.map(org => ['frog|' + org.id, true])), organNotes: Object.fromEntries(visible.map(org => ['frog|' + org.id, 'Observed a surface boundary.'])), organConfidence: Object.fromEntries(visible.map(org => ['frog|' + org.id, 2])) }); const before = await evidence(page);
  60  |   await expect(action(page)).toHaveAttribute('data-next-action', 'visibility'); await expect(action(page)).toHaveAttribute('data-inspection-target', hidden.id); await action(page).locator('[data-inspection-directory-action]').click();
  61  |   const row = page.locator('#diss-organ-' + hidden.id); await expect(row).toBeFocused(); await expect(row).toHaveAttribute('aria-disabled', 'true'); await expect(row).toHaveAttribute('data-exposure-state', 'occluded'); expect(await evidence(page)).toEqual(before);
  62  |   await row.press('Enter'); expect(await evidence(page)).toEqual(before); await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback?.message || '')).toContain('occluded');
  63  | });
  64  | 
  65  | test('guided directory preview keeps the fixed target until explicit inspection opens its evidence check', async ({ page }) => {
  66  |   await mount(page, { guidedMode: true, guidedStep: 0, guidedTargetIds: ['nictitating', 'tympanum'] }); const before = await evidence(page);
  67  |   await expect(action(page)).toHaveAttribute('data-inspection-target', 'nictitating'); await action(page).locator('[data-inspection-directory-action]').click(); const row = page.locator('#diss-organ-nictitating'); await expect(row).toBeFocused(); expect(await evidence(page)).toEqual(before);
  68  |   await row.press('Enter'); await expect(page.locator('#diss-guided-observation-check')).toBeVisible(); const after = await evidence(page); expect(after.guided[1]).toBe(before.guided[1]); expect(after.guided[2]).toEqual(before.guided[2]); expect(after.scores).toEqual(before.scores); expect(after.verified).toEqual(before.verified);
  69  |   await expect(page.locator('[data-inspection-directory-action]')).toHaveCount(0);
  70  | });
  71  | 
  72  | test('a hidden guided target remains fixed while the directory explains its visibility', async ({ page }) => {
  73  |   await mount(page, { guidedMode: true, guidedStep: 0, guidedTargetIds: ['dorsal_skin', 'tympanum'] }); const before = await evidence(page);
  74  |   await expect(action(page)).toHaveAttribute('data-inspection-target', 'dorsal_skin'); await action(page).locator('[data-inspection-directory-action]').click(); await expect(page.locator('#diss-organ-dorsal_skin')).toBeFocused(); expect(await evidence(page)).toEqual(before); await expect(page.locator('#diss-organ-dorsal_skin')).toHaveAttribute('data-exposure-state', 'occluded');
  75  | });
  76  | 
  77  | test('a restored draft remains uninspected until its visible directory result is activated', async ({ page }) => {
  78  |   await mount(page, { selectedOrgan: 'ventral_skin', organNotes: { 'frog|ventral_skin': 'I observed a lighter surface.' }, organConfidence: { 'frog|ventral_skin': 2 } }); const before = await evidence(page);
  79  |   await expect(page.locator('[data-record-handoff-remaining]')).toHaveText('Inspect this structure before completing its observation record.'); await expect(page.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', 'false'); await expect(page.locator('[data-record-inspection-action]')).toHaveCount(0);
  80  |   await action(page).locator('[data-inspection-directory-action]').click(); await expect(page.locator('#diss-organ-ventral_skin')).toBeFocused(); expect(await evidence(page)).toEqual(before); await page.keyboard.press('Enter');
  81  |   await expect(page.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', 'true'); const after = await evidence(page); expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.explored).toEqual({ 'frog|ventral_skin': true });
  82  | });
  83  | 
  84  | test('the record handoff prioritizes unfinished notes before offering another inspection', async ({ page }) => {
  85  |   await seed(page, { exploredOrgans: { 'frog|ventral_skin': true, 'frog|tympanum': true }, organNotes: { 'frog|ventral_skin': 'Observed a surface.' }, organConfidence: { 'frog|ventral_skin': 2, 'frog|tympanum': 2 } });
  86  |   await expect(page.locator('[data-next-record-action]')).toBeVisible(); await expect(page.locator('[data-record-inspection-action]')).toHaveCount(0); await page.locator('[data-next-record-action]').click(); await page.locator('#diss-note-tympanum').fill('Observed the external membrane beside the eye.');
  87  |   await expect(page.locator('[data-record-inspection-action]')).toBeVisible(); await expect(page.locator('[data-next-record-action]')).toHaveCount(0);
  88  | });
  89  | 
  90  | test('planning, reflection, and study routes keep their own next actions', async ({ page }) => {
  91  |   for (const state of [{ procedureByLayer: { skin: {} } }, { procedureByLayer: { skin: { ...complete, learningChecks: { ...complete.learningChecks, probe: { predictionCorrect: true, reflectionCorrect: false } } } } }, { compareMode: true }, { flashcardMode: true }]) {
  92  |     await mount(page, state); const before = await evidence(page); await expect(page.locator('[data-inspection-directory-action]')).toHaveCount(0); await expect(page.locator('[data-record-inspection-action]')).toHaveCount(0); expect(await evidence(page)).toEqual(before); await harness.unmount(page);
  93  |   }
  94  | });
  95  | 
  96  | for (const practical of [false, true]) test(`${practical ? 'timed practical' : 'quiz'} hides inspection handoff shortcuts`, async ({ page }) => {
  97  |   await mount(page, { selectedOrgan: 'ventral_skin', quizMode: !practical, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: ['ventral_skin', 'tympanum'], exploredOrgans: { 'frog|ventral_skin': true }, organNotes: { 'frog|ventral_skin': 'A visible surface.' }, organConfidence: { 'frog|ventral_skin': 2 } });
  98  |   await expect(page.locator('[data-inspection-directory-action]')).toHaveCount(0); await expect(page.locator('[data-record-inspection-action]')).toHaveCount(0);
  99  | });
  100 | 
  101 | test('the record inspection shortcut follows the current guided target and pauses for its evidence check', async ({ page }) => {
  102 |   await seed(page, { guidedMode: true, guidedStep: 0, guidedTargetIds: ['nictitating', 'tympanum'], organNotes: { 'frog|ventral_skin': 'Observed a lighter surface.', 'frog|nictitating': 'Draft: protective membrane beside the eye.' }, organConfidence: { 'frog|ventral_skin': 2, 'frog|nictitating': 1 } });
  103 |   const before = await evidence(page); await expect(page.locator('[data-next-inspection]')).toHaveAttribute('data-next-inspection', 'nictitating');
  104 |   await page.locator('[data-record-inspection-action]').click(); const row = page.locator('#diss-organ-nictitating'); await expect(row).toBeFocused(); expect(await evidence(page)).toEqual(before);
> 105 |   await row.press('Enter'); await expect(page.locator('#diss-guided-observation-check')).toBeVisible(); await expect(page.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', 'true'); await expect(page.locator('[data-record-inspection-action]')).toHaveCount(0); await expect(page.locator('[data-inspection-directory-action]')).toHaveCount(0);
      |                                                                                                                                                              ^ Error: expect(locator).toHaveAttribute(expected) failed
  106 |   const after = await evidence(page); expect(after.guided[1]).toEqual(before.guided[1]); expect(after.guided[2]).toEqual(before.guided[2]); expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.scores).toEqual(before.scores);
  107 | });
  108 | 
```