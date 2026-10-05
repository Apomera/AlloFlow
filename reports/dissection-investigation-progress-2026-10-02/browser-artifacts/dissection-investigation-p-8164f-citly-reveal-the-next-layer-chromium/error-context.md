# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-investigation-progress.spec.ts >> a complete investigation can explicitly reveal the next layer
- Location: tests\e2e\dissection-investigation-progress.spec.ts:100:5

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator: locator('[data-progress-kind="inspected"] progress')
Expected: "0"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 15000ms
  - waiting for locator('[data-progress-kind="inspected"] progress')

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
  - paragraph: "Work through the specimen one clear action at a time. Current focus: Predict before contact."
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
  - text: Specimen 🐸 Frog (Rana) Layer 2 of 5 · Muscle Structures viewed 4 of 37
- toolbar "Learning route":
  - button "Procedure practice" [pressed]: 🔎 Procedure practice
  - button "Guided investigation": 🧭 Guided investigation
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
  - paragraph: 1 of 5 layers revealed
  - toolbar "Specimen display and lab tool controls":
    - button "View and accessibility options": 👁 View & access ▼
  - 'button "Layer 1: Skin, revealed"': 🟢 Skin Revisit structures
  - 'button "Layer 2: Muscle, current"': 💪 Muscle Awaiting reveal
  - 'button "Layer 3: Organs, locked" [disabled]': 🫁 Organs Reveal Muscle first
  - 'button "Layer 4: Skeleton, locked" [disabled]': 🦴 Skeleton Reveal Organs first
  - 'button "Layer 5: Nervous, locked" [disabled]': ⚡ Nervous Reveal Skeleton first
  - paragraph: Use Left and Right to browse available layers; Enter selects.
- 'tabpanel "Select specimen: Frog (Rana)"':
  - region "Plan the orientation check":
    - paragraph: Pause before contact
    - heading "Plan the orientation check" [level=3]
    - paragraph: What must be confirmed before any instrument contacts this specimen?
    - text: 1 Predict Current 2 Perform Upcoming 3 Explain Upcoming
    - group "Choose the safest plan":
      - button "Confirm the ventral view, center the shallow ventral midline corridor, and account for Heart (3-chamber), Liver (3 lobes), Lungs."
      - button "Open at the deepest-looking region first; the shallow ventral midline corridor can be re-established once the first opening is made."
      - button "Select a cutting instrument first and let the opening incision reveal where Heart (3-chamber), Liver (3 lobes), Lungs sit."
    - paragraph: Arrow keys browse choices. Enter or Space checks the focused choice.
  - region "🐸 Frog (Rana) · Muscle":
    - text: Interactive specimen
    - heading "🐸 Frog (Rana) · Muscle" [level=3]
    - text: Limited observation field · 46%
    - group:
      - strong: View & orientation
      - text: Ventral · Muscle +
    - 'group "Current action: What must be confirmed before any instrument contacts this specimen?. Predict before contact. Workflow step 1 of 6"':
      - strong: Next · Predict before contact
      - text: Workflow 1/6
    - group:
      - strong: Field monitor
      - text: Limited observation field Exposure and tissue-response details
    - 'group "Current pointer mode: Later step. Current protocol step: Inspect ventral landmarks and confirm symmetry. Use Probe next."':
      - strong: Pointer mode ? Later step
      - text: "Current protocol step: Inspect ventral landmarks and confirm symmetry. Use Probe next."
    - text: Frog (Rana) interactive specimen · Muscle layer, ventral view
    - region "Specimen canvas description":
      - heading "Specimen canvas description" [level=4]
      - paragraph: Every canvas selection and drag action has a keyboard or button alternative. Use the structure directory for equivalent anatomical descriptions, the technique action button instead of drawing a stroke, the pin action button instead of dragging a pin, the probe action button instead of tracing a structure, and the pan controls instead of dragging a zoomed view. When the depth atlas is enabled, surface landmarks use circles, mid-depth landmarks use diamonds, and deep landmarks use double rings.
      - paragraph: "Frog (Rana) virtual dissection. Specimen-specific procedure: Frog ventral midline access; recommended view ventral; access route shallow ventral midline corridor; protected landmarks Heart (3-chamber), Liver (3 lobes), Lungs. Current view: ventral, standard condition, Muscle layer. Progressive exposure: Covered anatomy, 33 percent; decision quality 65 percent. Observation field: Limited observation field, 46 percent; limiting factor: Access width. Surface model: moist chromatophore surface. Surface microtexture uses chromatophores detail aligned to overhead illumination, with sheen adjusted for 76 percent moisture and standard condition. Tool contact response: elastic skin. Light direction: overhead. Illumination 68 percent: Balanced illumination; glare risk 6 percent. Focus isolation on. Tissue relief on and responsive to the inspection light. Depth atlas off. Selected and hovered structures use a labeled depth footprint with front and back edges, visibility-specific line styles, and boundary-attached relationship paths. Relationship types use distinct line patterns and moving marker shapes, with fixed markers when motion is reduced. Tubular, lobed, chambered, layered, and compact structure classes use distinct contours, internal patterns, and text labels. Anatomical orientation axis uses a circle for anterior and a diamond for posterior; current and target views are stated in text. View and layer navigation uses a labeled orientation sweep with circle start and diamond target markers, plus concentric depth rings for deeper or superficial movement; reduced motion switches instantly and uses text announcements. Depth motion off. 0 directly visible structures. Active instrument: forceps. Action readiness: Later step, 76 percent. Current protocol step: Inspect ventral landmarks and confirm symmetry. Use Probe next.. Directional contact footprint feedback is active. Engaged instrument tips use foreground tissue lips and paired depth notches to show partial insertion and opening-edge occlusion. Guided anatomical access corridor active; circle marks start and diamond marks finish. Directional target guidance uses a dashed arrow, labeled endpoint, and shape-coded reticle when an instrument is spatially misaligned. Localized action outcomes use a one-shot check or warning symbol with the changed tissue metric. Tissue opening, retraction, stabilization, hydration, and risk metrics transition spatially after each action; Undo reverses openings, retraction, pin placement, hydration, wick evidence, and probe traces; reduced motion snaps to the final state. Three-dimensional instrument pitch feedback is active. Light-aware instrument elevation feedback is active. Equivalent keyboard and button actions include an instrument approach, contact, and release replay. Recorded attempt replay progressively traces pressure with line width and states path alignment in text and shape. Direct forceps press-drag-release manipulation shows live lift direction, safe range, calibrated grip, speed, control, slip risk, and excess tension with text and geometry; the technique action button remains equivalent. Live pin stability preview shows endpoint spacing, calibrated angle, insertion depth, and flap tension with text and geometry. Direct pin press-drag-release placement adds shaft alignment, insertion travel, safe depth, and control feedback. Live probe palpation preview shows calibrated pressure, material resistance, anatomical depth, and tissue deformation with text and shape. Direct probe press-drag-release tracing adds contact coverage, alignment, resistance, deformation, and control feedback. Direct dropper press-drag-release hydration adds contact coverage, flow alignment, moisture, dose, and pooling feedback. Direct wick press-drag-release recovery adds pool-edge alignment, contact coverage, recovery distance, and control feedback. Live dropper spread forecast shows dose count, organism-specific flow direction, current saturation, and pooling risk with text and geometry. Absorbent-wick feedback shows pool-edge targeting, fluid recovery, and a localized balanced-film marker with text and cross-hatched geometry. Guided procedure handoff cue connects the next required instrument to its anatomical target and 6-step progress rail with text, shape, and line style. Persistent localized technique evidence maps edge stress, grip compression, anchor tension, probe pressure, and saline pooling to actual contact locations with text and distinct geometry; direct wick recovery maps pool-edge contact, recovery distance, and control. Press the opened tissue edge, drag away while monitoring lift and tension, then release inside the solid safe envelope; the equivalent technique action button remains available. Occluded structures remain available in the structure directory."
    - application "Frog (Rana) interactive specimen · Muscle layer, ventral view"
    - button "Zoom out canvas": ➖
    - text: 100%
    - button "Zoom in canvas": ➕
    - paragraph: Every canvas action has a keyboard or button alternative. The specimen canvas description lists them.
    - status: "Predict before contact: Choose the safest plan. A correct plan unlocks the simulation action but never performs it for you. Answer it in the planning checkpoint above the specimen."
    - group: Evidence notebook · 0/6 frames
    - group "Technique practice · step 1 of 6":
      - strong: Technique controls
      - text: Inspect ventral landmarks and confirm symmetry
  - complementary "Structure directory and lab notes":
    - link "Return to interactive specimen":
      - /url: "#diss-canvas"
    - group: Review observations · 4 inspected
    - region "💪 Muscle structures (6)":
      - heading "💪 Muscle structures (6)" [level=3]
      - text: Find a structure
      - textbox "Find a structure":
        - /placeholder: Search names or functions…
      - paragraph: Down arrow moves to results. Use Up and Down to browse; Enter opens a result. Escape clears search and filters.
      - group "Filter structures by learning progress":
        - button "All structures, 6 structures" [pressed]: All structures 6
        - button "To inspect, 6 structures": To inspect 6
        - button "Needs notes, 0 structures": Needs notes 0
        - button "Recorded, 0 structures": Recorded 0
      - paragraph: Filters apply to this layer. Recorded means a note and confidence are present, not verified mastery.
      - status: 6 structures available in Muscle.
      - region "Directory results":
        - button "Pectoralis, not currently visible; preview only" [disabled]: Pectoralis Not yet inspected
        - button "Rectus Abdominis, not currently visible; preview only" [disabled]: Rectus Abdominis Not yet inspected
        - button "Gastrocnemius, not currently visible; preview only" [disabled]: Gastrocnemius Not yet inspected
        - button "Triceps Femoris, not currently visible; preview only" [disabled]: Triceps Femoris Not yet inspected
        - button "Sartorius, not currently visible; preview only" [disabled]: Sartorius Not yet inspected
        - button "Deltoideus, not currently visible; preview only" [disabled]: Deltoideus Not yet inspected
    - text: Layer Progress 🟢 Skin ✓ 💪 Muscle 🫁 Organs 🦴 Skeleton ⚡ Nervous
    - paragraph: Classic vertebrate — 3-chambered heart, cutaneous respiration, metamorphosis.
    - paragraph: "Comparative learning model: specimen observations and human clinical connections are labeled separately. Anatomy varies by species, age, preservation, and individual."
    - group: Biology fact ＋
    - text: 📊 Learning evidence 11%
    - 'progressbar "Observation: structures viewed 4 of 37"'
    - text: "Observation: 4 of 37 structures viewed Technique 20%"
    - progressbar "Technique evidence"
    - text: Observation 11%
    - progressbar "Observation evidence"
    - text: Evidence 11%
    - progressbar "Evidence evidence"
    - text: Understanding 3%
    - progressbar "Understanding evidence"
    - text: 0/2 guided identifications verified · 4/37 evidence records · completed first-attempt assessment 0/0 Practice in progress Continue the investigation; the log distinguishes viewing from verified understanding.
    - button "Copy practice log to clipboard": Copy practice log
    - group: Specimen stats ＋
    - group: Learning objectives ＋
    - group: Key terms ＋
- status
```

# Test source

```ts
  5   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  6   | const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
  7   | const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  8   | const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
  9   | const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, revealedLayers: {}, exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
  10  | test.describe.configure({ retries: 0 }); test.use({ video: 'off' });
  11  | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); }); test.afterAll(async () => { await harness.stop(); });
  12  | test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });
  13  | async function mount(page: Page, state: any = {}, width = 390, available = width, procedure: any = complete) {
  14  |   await page.setViewportSize({ width, height: 1000 });
  15  |   await harness.mount(page, { dissection: { ...initial, ...state, procedureByLayer: { skin: procedure } } }, undefined, { expectCanvas: false });
  16  |   await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  17  |   await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
  18  | }
  19  | async function catalog(page: Page) { return page.locator('.diss-directory-item').evaluateAll(nodes => nodes.map(node => ({ id: node.id.replace('diss-organ-', ''), name: node.querySelector('.diss-directory-item__name')!.textContent! }))); }
  20  | async function seed(page: Page, options: any = {}, width = 390, available = width) {
  21  |   await mount(page, {}, width, available); const organs = await catalog(page); expect(organs.length).toBeGreaterThanOrEqual(3); await harness.unmount(page);
  22  |   const inspected = options.all ? organs : organs.slice(0, Math.min(4, organs.length));
  23  |   const exploredOrgans = Object.fromEntries(inspected.map(org => ['frog|' + org.id, true]));
  24  |   const organNotes = Object.fromEntries(inspected.map(org => ['frog|' + org.id, 'Observed a surface boundary.']));
  25  |   const organConfidence = Object.fromEntries(inspected.map(org => ['frog|' + org.id, 2]));
  26  |   if (!options.complete) { organConfidence['frog|' + inspected[1].id] = 0; organNotes['frog|' + inspected[2].id] = '   '; if (inspected[3]) { organNotes['frog|' + inspected[3].id] = ''; organConfidence['frog|' + inspected[3].id] = 0; } }
  27  |   await mount(page, { exploredOrgans, organNotes, organConfidence, ...options.state }, width, available, options.procedure || complete);
  28  |   return { organs, inspected };
  29  | }
  30  | async function evidence(page: Page) { return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, layer: d.activeLayer, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] }; }); }
  31  | const progress = (page: Page, kind: string) => page.locator(`[data-progress-kind="${kind}"] progress`);
  32  | async function openRecords(page: Page) { const details = page.locator('.diss-layer-records'); if (!(await details.evaluate((node: HTMLDetailsElement) => node.open))) await details.locator('summary').click(); return details; }
  33  | 
  34  | for (const { name, width, available, large, contrast, forced } of [
  35  |   { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  36  |   { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
  37  | ]) test(`investigation ${name} shows readable progress and unfinished records`, async ({ page }) => {
  38  |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); if (forced) await page.emulateMedia({ forcedColors: 'active' });
  39  |   const { organs, inspected } = await seed(page, { state: { largeText: !!large, highContrast: !!contrast } }, width, available);
  40  |   const before = await evidence(page), panel = page.locator('#diss-layer-review');
  41  |   await expect(progress(page, 'technique')).toHaveAttribute('value', '6'); await expect(progress(page, 'technique')).toHaveAttribute('max', '6');
  42  |   await expect(progress(page, 'inspected')).toHaveAttribute('value', String(inspected.length)); await expect(progress(page, 'inspected')).toHaveAttribute('max', String(organs.length));
  43  |   await expect(progress(page, 'recorded')).toHaveAttribute('value', '1'); await expect(progress(page, 'recorded')).toHaveAttribute('max', String(organs.length));
  44  |   await expect(page.locator('.diss-layer-records')).not.toHaveAttribute('open'); const records = await openRecords(page); await expect(records.locator('li')).toHaveCount(inspected.length - 1);
  45  |   await expect(records.locator(`[data-record-organ="${inspected[1].id}"]`)).toContainText('Confidence needed'); await expect(records.locator(`[data-record-organ="${inspected[2].id}"]`)).toContainText('Note needed');
  46  |   await records.getByRole('button').first().focus(); await panel.screenshot({ path: `${out}/${name}-review.png`, style: '.diss-next-action {position:static!important;}' });
  47  |   await records.screenshot({ path: `${out}/${name}-queue-focus.png` });
  48  |   const metrics = await panel.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth,
  49  |     targets: Array.from(node.querySelectorAll('button,summary')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ label: el.textContent, height: el.getBoundingClientRect().height, clipped: el.scrollWidth > el.clientWidth + 1 })),
  50  |     text: Array.from(node.querySelectorAll('h3,h4,p,strong,span,button,summary')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth + 1 })) }));
  51  |   await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2)); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  52  |   for (const target of metrics.targets) { expect(target.height, target.label || '').toBeGreaterThanOrEqual(47.9); expect(target.clipped).toBe(false); }
  53  |   for (const text of metrics.text) { expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped, text.text || '').toBe(false); }
  54  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-layer-review']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  55  |   await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]); expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
  56  | });
  57  | 
  58  | test('confidence shortcut focuses an unchecked rating and returns without granting evidence', async ({ page }) => {
  59  |   const { inspected } = await seed(page); const before = await evidence(page); const records = await openRecords(page);
  60  |   const button = records.locator(`[data-record-organ="${inspected[1].id}"] button`); await button.focus(); await page.keyboard.press('Enter');
  61  |   const rating = page.locator(`#diss-confidence-${inspected[1].id}-1`); await expect(rating).toBeFocused(); await expect(rating).not.toBeChecked(); expect(await evidence(page)).toEqual(before);
  62  |   await page.getByRole('button', { name: 'Review layer progress', exact: true }).click(); await expect(page.locator('#diss-investigation-progress-title')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  63  | });
  64  | 
  65  | test('missing note shortcut preserves the rating and updates progress after an explicit edit', async ({ page }) => {
  66  |   const { inspected } = await seed(page); const before = await evidence(page); const records = await openRecords(page);
  67  |   await records.locator(`[data-record-organ="${inspected[2].id}"] button`).click(); const note = page.locator(`#diss-note-${inspected[2].id}`); await expect(note).toBeFocused(); expect(await evidence(page)).toEqual(before);
  68  |   await note.fill('I observed the boundary and checked its position against a nearby landmark.'); await expect(progress(page, 'recorded')).toHaveAttribute('value', '2');
  69  |   await expect(page.locator(`[data-record-organ="${inspected[2].id}"]`)).toHaveCount(0); const after = await evidence(page);
  70  |   expect(after.confidence).toEqual(before.confidence); expect(after.explored).toEqual(before.explored); expect(after.procedures).toEqual(before.procedures); expect(after.scores).toEqual(before.scores);
  71  |   await page.getByRole('button', { name: 'Review layer progress', exact: true }).click(); await expect(page.locator('#diss-investigation-progress-title')).toBeFocused();
  72  | });
  73  | 
  74  | test('ratings outside the three-level scale remain unfinished and cannot make a layer ready', async ({ page }) => {
  75  |   for (const confidence of [0, 4, 99, -1, 'invalid']) {
  76  |     const { organs } = await seed(page, { all: true, complete: true }); await harness.unmount(page);
  77  |     const target = organs[0], key = 'frog|' + target.id;
  78  |     await mount(page, { exploredOrgans: Object.fromEntries(organs.map(org => ['frog|' + org.id, true])), organNotes: Object.fromEntries(organs.map(org => ['frog|' + org.id, 'Surface boundary observed.'])), organConfidence: { ...Object.fromEntries(organs.map(org => ['frog|' + org.id, 2])), [key]: confidence } });
  79  |     await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Record evidence'); await expect(progress(page, 'recorded')).toHaveAttribute('value', String(organs.length - 1));
  80  |     await expect(page.locator(`#diss-record-${target.id}`)).toHaveText('Add a confidence rating'); await openRecords(page); await page.locator(`[data-record-organ="${target.id}"] button`).click();
  81  |     await expect(page.locator(`#diss-confidence-${target.id}-1`)).toBeFocused(); await expect(page.locator('.diss-confidence-scale input:checked')).toHaveCount(0);
  82  |     await page.getByRole('radio', { name: 'Confidence 1 of 3: Not sure yet', exact: true }).check(); await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal');
  83  |     await expect(progress(page, 'recorded')).toHaveAttribute('value', String(organs.length)); await harness.unmount(page);
  84  |   }
  85  | });
  86  | 
  87  | test('completed technique waits for actual inspection before reporting readiness', async ({ page }) => {
  88  |   await mount(page); const organs = await catalog(page), before = await evidence(page);
  89  |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Inspect structures'); await expect(progress(page, 'recorded')).toHaveAttribute('value', '0'); await expect(page.locator('.diss-layer-records')).toHaveCount(0);
  90  |   const visible = page.locator('.diss-directory-item[data-exposure-state="visible"]').first(); await visible.click(); await expect(progress(page, 'inspected')).toHaveAttribute('value', '1'); await expect(page.locator('.diss-layer-records li')).toHaveCount(1);
  91  |   const after = await evidence(page); expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.procedures).toEqual(before.procedures); expect(after.scores).toEqual(before.scores); expect(organs.length).toBeGreaterThan(1);
  92  | });
  93  | 
  94  | test('notes for uninspected and unknown structures do not inflate progress', async ({ page }) => {
  95  |   await mount(page); const organs = await catalog(page); await harness.unmount(page);
  96  |   await mount(page, { organNotes: Object.fromEntries([...organs.map(org => ['frog|' + org.id, 'Draft.']), ['frog|unknown', 'Unknown.'], ['perch|' + organs[0].id, 'Other specimen.']]), organConfidence: Object.fromEntries([...organs.map(org => ['frog|' + org.id, 3]), ['frog|unknown', 3]]), exploredOrgans: { 'frog|unknown': true } });
  97  |   await expect(progress(page, 'inspected')).toHaveAttribute('value', '0'); await expect(progress(page, 'recorded')).toHaveAttribute('value', '0'); await expect(page.locator('.diss-layer-records')).toHaveCount(0);
  98  | });
  99  | 
  100 | test('a complete investigation can explicitly reveal the next layer', async ({ page }) => {
  101 |   const { organs } = await seed(page, { all: true, complete: true }, 1180, 1180); const before = await evidence(page);
  102 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal'); await expect(page.locator('.diss-layer-records')).toHaveCount(0); await expect(progress(page, 'recorded')).toHaveAttribute('value', String(organs.length));
  103 |   await page.locator('.diss-next-action__primary').click(); await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.activeLayer)).not.toBe('skin');
  104 |   const after = await evidence(page); expect(after.revealed.skin).toBe(true); expect(after.notes).toEqual(before.notes); expect(after.confidence).toEqual(before.confidence); expect(after.procedures.skin).toEqual(before.procedures.skin);
> 105 |   await expect(progress(page, 'inspected')).toHaveAttribute('value', '0'); await expect(progress(page, 'recorded')).toHaveAttribute('value', '0');
      |                                             ^ Error: expect(locator).toHaveAttribute(expected) failed
  106 |   await writeFile(`${out}/revealed-state.json`, JSON.stringify(after, null, 2));
  107 | });
  108 | 
  109 | test('reviewing a prior observation preserves the guided route and hidden-view credit', async ({ page }) => {
  110 |   const { inspected } = await seed(page, { state: { guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'], anatomicalView: 'dorsal' } }); const before = await evidence(page);
  111 |   await openRecords(page); await page.locator(`[data-record-organ="${inspected[1].id}"] button`).click(); expect(await evidence(page)).toEqual(before);
  112 | });
  113 | 
  114 | for (const practical of [false, true]) test(`${practical ? 'timed practical' : 'quiz'} hides the record queue and progress shortcuts`, async ({ page }) => {
  115 |   await mount(page, { quizMode: true, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: ['ventral_skin', 'tympanum'], selectedOrgan: 'ventral_skin', exploredOrgans: { 'frog|ventral_skin': true } });
  116 |   await expect(page.locator('.diss-investigation-progress')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Review layer progress', exact: true })).toHaveCount(0);
  117 | });
  118 | 
```