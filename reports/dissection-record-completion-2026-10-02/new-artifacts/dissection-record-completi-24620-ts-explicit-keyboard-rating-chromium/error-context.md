# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-record-completion.spec.ts >> record completion tablet is readable and supports explicit keyboard rating
- Location: tests\e2e\dissection-record-completion.spec.ts:42:8

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: locator('#diss-organ-search')
Expected: ""
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" with timeout 15000ms
  - waiting for locator('#diss-organ-search')

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
  - paragraph: "Work through the specimen one clear action at a time. Current focus: Identify."
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
  - text: Specimen 🐸 Frog (Rana) Layer 1 of 5 · Skin Structures viewed 1 of 37
- region "Find and inspect Tympanic Membrane":
  - text: Step 4 of 6 Next best action · Identify
  - heading "Find and inspect Tympanic Membrane" [level=3]
  - paragraph: 1 of 4 structures inspected in this layer.
  - paragraph: Use the specimen or preview the target in the structure directory. Activate a visible directory result to inspect it.
  - text: 🐸 Frog (Rana) 🟢 Skin · layer 1/5
  - button "Focus the specimen"
  - button "Find Tympanic Membrane in structure directory": Find in directory
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
  - paragraph: 0 of 5 layers revealed
  - toolbar "Specimen display and lab tool controls":
    - button "View and accessibility options": 👁 View & access ▼
  - 'button "Layer 1: Skin, current"': 🟢 Skin Awaiting reveal
  - 'button "Layer 2: Muscle, locked" [disabled]': 💪 Muscle Reveal Skin first
  - 'button "Layer 3: Organs, locked" [disabled]': 🫁 Organs Reveal Muscle first
  - 'button "Layer 4: Skeleton, locked" [disabled]': 🦴 Skeleton Reveal Organs first
  - 'button "Layer 5: Nervous, locked" [disabled]': ⚡ Nervous Reveal Skeleton first
  - paragraph: Use Left and Right to browse available layers; Enter selects.
- 'tabpanel "Select specimen: Frog (Rana)"':
  - region "🐸 Frog (Rana) · Skin":
    - text: Interactive specimen
    - heading "🐸 Frog (Rana) · Skin" [level=3]
    - text: "Selected: Ventral Skin"
    - group:
      - strong: View & orientation
      - text: Ventral · Skin +
    - 'group "Current action: Find and inspect Tympanic Membrane. Identify. Workflow step 4 of 6"':
      - strong: Next · Find and inspect Tympanic Membrane
      - text: Identify Workflow 4/6
    - group:
      - strong: Field monitor
      - text: High-definition field Exposure and tissue-response details
    - 'group "Current pointer mode: Inspect anatomy. Select a visible structure, or use Arrow keys to preview and Enter to inspect."':
      - strong: Pointer mode ? Inspect anatomy
      - text: Select a visible structure, or use Arrow keys to preview and Enter to inspect.
    - text: Frog (Rana) interactive specimen · Skin layer, ventral view
    - region "Specimen canvas description":
      - heading "Specimen canvas description" [level=4]
      - paragraph: Every canvas selection and drag action has a keyboard or button alternative. Use the structure directory for equivalent anatomical descriptions, the technique action button instead of drawing a stroke, the pin action button instead of dragging a pin, the probe action button instead of tracing a structure, and the pan controls instead of dragging a zoomed view. When the depth atlas is enabled, surface landmarks use circles, mid-depth landmarks use diamonds, and deep landmarks use double rings.
      - paragraph: "Frog (Rana) virtual dissection. Specimen-specific procedure: Frog ventral midline access; recommended view ventral; access route shallow ventral midline corridor; protected landmarks Heart (3-chamber), Liver (3 lobes), Lungs. Current view: ventral, standard condition, Skin layer. Progressive exposure: Fully exposed field, 100 percent; decision quality 98 percent. Observation field: High-definition field, 92 percent; limiting factor: No major limiter. Surface model: moist chromatophore surface. Surface microtexture uses chromatophores detail aligned to overhead illumination, with sheen adjusted for 67 percent moisture and standard condition. Tool contact response: elastic skin. Light direction: overhead. Illumination 68 percent: Balanced illumination; glare risk 6 percent. Focus isolation on. Tissue relief on and responsive to the inspection light. Depth atlas off. Selected and hovered structures use a labeled depth footprint with front and back edges, visibility-specific line styles, and boundary-attached relationship paths. Relationship types use distinct line patterns and moving marker shapes, with fixed markers when motion is reduced. Tubular, lobed, chambered, layered, and compact structure classes use distinct contours, internal patterns, and text labels. Anatomical orientation axis uses a circle for anterior and a diamond for posterior; current and target views are stated in text. View and layer navigation uses a labeled orientation sweep with circle start and diamond target markers, plus concentric depth rings for deeper or superficial movement; reduced motion switches instantly and uses text announcements. Depth motion off. 3 directly visible structures. Active instrument: forceps. Action readiness: Technique complete, 76 percent. Technique protocol complete. Continue with visible structure identification and evidence.. Directional contact footprint feedback is active. Engaged instrument tips use foreground tissue lips and paired depth notches to show partial insertion and opening-edge occlusion. Directional target guidance uses a dashed arrow, labeled endpoint, and shape-coded reticle when an instrument is spatially misaligned. Localized action outcomes use a one-shot check or warning symbol with the changed tissue metric. Tissue opening, retraction, stabilization, hydration, and risk metrics transition spatially after each action; Undo reverses openings, retraction, pin placement, hydration, wick evidence, and probe traces; reduced motion snaps to the final state. Three-dimensional instrument pitch feedback is active. Light-aware instrument elevation feedback is active. Equivalent keyboard and button actions include an instrument approach, contact, and release replay. Recorded attempt replay progressively traces pressure with line width and states path alignment in text and shape. Direct forceps press-drag-release manipulation shows live lift direction, safe range, calibrated grip, speed, control, slip risk, and excess tension with text and geometry; the technique action button remains equivalent. Live pin stability preview shows endpoint spacing, calibrated angle, insertion depth, and flap tension with text and geometry. Direct pin press-drag-release placement adds shaft alignment, insertion travel, safe depth, and control feedback. Live probe palpation preview shows calibrated pressure, material resistance, anatomical depth, and tissue deformation with text and shape. Direct probe press-drag-release tracing adds contact coverage, alignment, resistance, deformation, and control feedback. Direct dropper press-drag-release hydration adds contact coverage, flow alignment, moisture, dose, and pooling feedback. Direct wick press-drag-release recovery adds pool-edge alignment, contact coverage, recovery distance, and control feedback. Live dropper spread forecast shows dose count, organism-specific flow direction, current saturation, and pooling risk with text and geometry. Absorbent-wick feedback shows pool-edge targeting, fluid recovery, and a localized balanced-film marker with text and cross-hatched geometry. Guided procedure handoff cue connects the next required instrument to its anatomical target and 6-step progress rail with text, shape, and line style. Persistent localized technique evidence maps edge stress, grip compression, anchor tension, probe pressure, and saline pooling to actual contact locations with text and distinct geometry; direct wick recovery maps pool-edge contact, recovery distance, and control. Press the opened tissue edge, drag away while monitoring lift and tension, then release inside the solid safe envelope; the equivalent technique action button remains available. Occluded structures remain available in the structure directory."
    - application "Frog (Rana) interactive specimen · Skin layer, ventral view"
    - button "Zoom out canvas": ➖
    - text: 100%
    - button "Zoom in canvas": ➕
    - button "Frame selected structure Ventral Skin": ◎ Frame Ventral Skin
    - paragraph: Every canvas action has a keyboard or button alternative. The specimen canvas description lists them.
    - status: "Identify: Find and inspect Tympanic Membrane. 1 of 4 structures inspected in this layer. Selected Ventral Skin in the Skin layer."
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
        - strong: "Structures inspected: 1 of 4"
        - 'progressbar "Structures inspected: 1 of 4"'
        - text: Structures viewed across this layer’s anatomical views.
        - strong: "Evidence recorded: 0 of 4"
        - 'progressbar "Evidence recorded: 0 of 4"'
        - text: Inspected structures with a note and confidence rating.
        - group: Unfinished observation records · 1
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
      - paragraph: The instrument sequence and explanations are complete. Review your observations. The next action shows any evidence still needed before revealing this layer.
      - button "Review next action"
      - group: About technique feedback
      - group: Action history6 saved records
    - group "Technique practice · ready to complete":
      - strong: Technique controls
      - text: Protocol complete
  - complementary "Structure directory and lab notes":
    - link "Return to interactive specimen":
      - /url: "#diss-canvas"
    - group: Review observations · 1 inspected
    - region "Ventral Skin":
      - heading "Ventral Skin" [level=4]
      - status "Ventral Skin, structure 2 of 4": 2 of 4
      - button "Previous structure": ◀
      - button "Next structure": ▶
      - button "Back to structure directory": ✕
      - note:
        - strong: Observe first
        - paragraph: Describe a visible feature and its location. Compare with the reference, then revise your observation as needed.
      - 'group "Study actions: Ventral Skin"':
        - list:
          - listitem:
            - button "Inspect specimen":
              - strong: Inspect specimen
              - text: Bring this structure into focus.
          - listitem:
            - button "Write observation":
              - strong: Write observation
              - text: Continue your existing draft.
          - listitem:
            - button "Check reference":
              - strong: Check reference
              - text: Compare, then revise your note.
      - group: Check reference and connections ＋
      - text: Evidence note
      - paragraph: Record what you observed, where it is located, and how that evidence supports your identification.
      - group "Evidence sentence starters":
        - button "+ Observation"
        - button "+ Location"
        - button "+ Reasoning"
        - button "+ Reference"
      - textbox "Evidence note":
        - /placeholder: I identified this structure because…
        - text: I observed a pale surface boundary.
      - group "How sure are you, based on your evidence?":
        - text: How sure are you, based on your evidence?
        - 'radio "Confidence 1 of 3: Not sure yet"'
        - text: 1 · Not sure yet
        - 'radio "Confidence 2 of 3: Somewhat sure"'
        - text: 2 · Somewhat sure
        - 'radio "Confidence 3 of 3: Confident"'
        - text: 3 · Confident
      - paragraph:
        - strong: "Calibration cue:"
        - text: Choose based on the evidence in your note, not on how familiar the answer feels.
      - button "Review layer progress"
      - group "Draft check":
        - strong: Draft check
        - list "Writing and confidence status":
          - listitem: Draft present · review needed
          - listitem: Confidence not rated
        - paragraph: Text and confidence are recorded separately. Their presence does not verify the explanation or earn an assessment score.
        - group: Review your explanation
      - group: "Optional challenge: test your identification ＋"
      - region "Your record":
        - heading "Your record" [level=4]
        - text: Add a confidence rating
        - paragraph: 0 of 1 inspected structures in this layer have a note and confidence rating.
        - paragraph: Finish this record before continuing your notes.
        - button "Review all observations"
      - button "🤖 AI Explain"
      - button "Copy Ventral Skin information to clipboard": 📋 Copy
    - text: Layer Progress 🟢 Skin 💪 Muscle 🫁 Organs 🦴 Skeleton ⚡ Nervous
    - paragraph: Classic vertebrate — 3-chambered heart, cutaneous respiration, metamorphosis.
    - paragraph: "Comparative learning model: specimen observations and human clinical connections are labeled separately. Anatomy varies by species, age, preservation, and individual."
    - group: Biology fact ＋
    - text: 📊 Learning evidence 6%
    - 'progressbar "Observation: structures viewed 1 of 37"'
    - text: "Observation: 1 of 37 structures viewed Technique 20%"
    - progressbar "Technique evidence"
    - text: Observation 3%
    - progressbar "Observation evidence"
    - text: Evidence 0%
    - progressbar "Evidence evidence"
    - text: Understanding 0%
    - progressbar "Understanding evidence"
    - text: 0/2 guided identifications verified · 0/37 evidence records · completed first-attempt assessment 0/0 Practice in progress Continue the investigation; the log distinguishes viewing from verified understanding.
    - button "Copy practice log to clipboard": Copy practice log
    - group: Specimen stats ＋
    - group: Learning objectives ＋
    - group: Key terms ＋
- status
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | const out = 'reports/dissection-record-completion-2026-10-02';
  6   | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  7   | const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
  8   | const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  9   | const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
  10  | const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, organSearch: '', directoryFilter: 'all', revealedLayers: {}, exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
  11  | test.describe.configure({ retries: 0 });
  12  | test.use({ video: 'off' });
  13  | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  14  | test.afterAll(async () => { await harness.stop(); });
  15  | test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });
  16  | 
  17  | async function mount(page: Page, state: any = {}, width = 390, available = width) {
  18  |   await page.setViewportSize({ width, height: 1000 });
  19  |   await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: complete }, ...state } }, undefined, { expectCanvas: false });
  20  |   await page.evaluate(() => {
  21  |     const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
  22  |     meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
  23  |   });
  24  |   await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
  25  | }
  26  | async function evidence(page: Page) {
  27  |   return page.evaluate(() => {
  28  |     const d = (window as any).__ctx.toolData.dissection;
  29  |     return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, selected: d.selectedOrgan, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioCompletedAt], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] };
  30  |   });
  31  | }
  32  | const context = (page: Page) => page.locator('[data-directory-context]');
  33  | const result = (page: Page, id = 'dorsal_skin') => page.locator('#diss-organ-' + id);
  34  | 
  35  | const draft = { organSearch: 'ventral', exploredOrgans: { 'frog|ventral_skin': true }, organNotes: { 'frog|ventral_skin': 'I observed a pale surface boundary.' }, organConfidence: { 'frog|ventral_skin': 4 }, procedureScenario: 'structure-trace', scenarioStartedAt: 100, scenarioCompletedAt: 123 };
  36  | const filter = (page: Page, id: string) => page.locator(`[data-directory-filter="${id}"]`);
  37  | const finish = (page: Page) => page.locator('[data-directory-context-action="record"]');
  38  | 
  39  | for (const { name, width, available, large, contrast, forced } of [
  40  |   { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  41  |   { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
  42  | ]) test(`record completion ${name} is readable and supports explicit keyboard rating`, async ({ page }) => {
  43  |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  44  |   if (forced) await page.emulateMedia({ forcedColors: 'active' });
  45  |   await mount(page, { ...draft, largeText: !!large, highContrast: !!contrast }, width, available);
  46  |   const before = await evidence(page);
  47  |   await expect(context(page)).toHaveAttribute('data-tone', 'caution');
  48  |   await expect(context(page).locator('[data-directory-record-status]')).toHaveText('Confidence needed');
  49  |   await expect(finish(page)).toHaveAccessibleName('Choose confidence for Ventral Skin');
  50  |   await expect(finish(page)).toHaveAttribute('aria-describedby', 'diss-directory-record-status diss-directory-context-detail');
  51  |   await finish(page).focus();
  52  |   await page.locator('[data-dissection-directory]').screenshot({ path: `${out}/${name}-unfinished.png`, style: '.diss-next-action {position:static!important;}' });
  53  |   const metrics = await page.locator('[data-dissection-directory]').evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth,
  54  |     targets: Array.from(el.querySelectorAll('.diss-directory-filters button,.diss-directory-context button')).map(n => ({ text: n.textContent, height: n.getBoundingClientRect().height, clipped: n.scrollWidth > n.clientWidth + 1 })),
  55  |     text: Array.from(el.querySelectorAll('.diss-directory-filters button,.diss-directory-filters span,.diss-directory-context h4,.diss-directory-context p,.diss-directory-context span,.diss-directory-context button')).map(n => ({ text: n.textContent, font: parseFloat(getComputedStyle(n).fontSize), clipped: n.scrollWidth > n.clientWidth + 1 })) }));
  56  |   expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  57  |   for (const n of metrics.targets) { expect(n.height).toBeGreaterThanOrEqual(47.9); expect(n.clipped).toBe(false); }
  58  |   for (const n of metrics.text) { expect(n.font, n.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(n.clipped).toBe(false); }
  59  |   await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2));
  60  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  61  |   const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-dissection-directory]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  62  |   await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  63  |   await finish(page).focus(); await page.keyboard.press('Enter');
  64  |   const rating = page.locator('#diss-confidence-ventral_skin-1');
  65  |   await expect(rating).toBeFocused(); await expect(rating).not.toBeChecked();
  66  |   expect(await evidence(page)).toEqual({ ...before, selected: 'ventral_skin' });
> 67  |   await expect(page.locator('#diss-organ-search')).toHaveValue('');
      |                                                    ^ Error: expect(locator).toHaveValue(expected) failed
  68  |   await page.keyboard.press('Space'); await expect(rating).toBeChecked();
  69  |   expect(await evidence(page)).toEqual({ ...before, selected: 'ventral_skin', confidence: { 'frog|ventral_skin': 1 } });
  70  |   await page.locator('#diss-organ-search').fill('ventral');
  71  |   await expect(filter(page, 'recorded')).toHaveAttribute('aria-label', 'Recorded, 1 structure');
  72  |   await expect(filter(page, 'needs-record')).toHaveAttribute('aria-label', 'Finish records, 0 structures');
  73  |   await expect(context(page).locator('[data-directory-record-status]')).toHaveText('Note and confidence recorded');
  74  |   await expect(finish(page)).toHaveCount(0); expect(errors).toEqual([]);
  75  | });
  76  | 
  77  | for (const rating of [0, 4, -1, 'invalid', '0', 1.5, 1, 3, '2']) test(`directory classifies restored rating ${JSON.stringify(rating)} consistently`, async ({ page }) => {
  78  |   const valid = [1, 2, 3].includes(Number(rating));
  79  |   await mount(page, { ...draft, organSearch: '', organConfidence: { 'frog|ventral_skin': rating, 'frog|dorsal_skin': 2, 'sheepEye|cornea': 2 }, organNotes: { ...draft.organNotes, 'frog|dorsal_skin': 'Uninspected draft', 'sheepEye|cornea': 'Other specimen' } });
  80  |   const before = await evidence(page);
  81  |   await expect(filter(page, 'unviewed').locator('span')).toHaveText('3');
  82  |   await filter(page, 'recorded').click(); await expect(page.locator('.diss-directory-item')).toHaveCount(valid ? 1 : 0);
  83  |   await filter(page, 'needs-record').click(); await expect(page.locator('.diss-directory-item')).toHaveCount(valid ? 0 : 1);
  84  |   await expect(filter(page, 'needs-record')).toContainText('Finish records');
  85  |   await filter(page, 'all').click(); await page.locator('#diss-organ-search').fill('ventral');
  86  |   if (valid) { await expect(finish(page)).toHaveCount(0); await expect(context(page)).toHaveAttribute('data-tone', 'prior'); }
  87  |   else {
  88  |     await expect(context(page).locator('[data-directory-record-status]')).toHaveText('Confidence needed');
  89  |     await finish(page).click(); await expect(page.locator('#diss-confidence-ventral_skin-1')).toBeFocused();
  90  |     await expect(page.locator('#diss-confidence-ventral_skin-1')).not.toBeChecked();
  91  |   }
  92  |   expect(await evidence(page)).toEqual({ ...before, selected: valid ? before.selected : 'ventral_skin' });
  93  | });
  94  | 
  95  | for (const both of [false, true]) test(`${both ? 'both missing fields' : 'a whitespace-only note'} opens the note without changing evidence`, async ({ page }) => {
  96  |   await mount(page, { ...draft, organNotes: { 'frog|ventral_skin': '   ' }, organConfidence: { 'frog|ventral_skin': both ? 0 : 2 } });
  97  |   const before = await evidence(page);
  98  |   await expect(context(page).locator('[data-directory-record-status]')).toHaveText(both ? 'Note and confidence needed' : 'Note needed');
  99  |   await expect(finish(page)).toHaveText(both ? 'Open observation record' : 'Write evidence note');
  100 |   await finish(page).click(); await expect(page.locator('#diss-note-ventral_skin')).toBeFocused();
  101 |   expect(await evidence(page)).toEqual({ ...before, selected: 'ventral_skin' });
  102 |   await page.locator('#diss-note-ventral_skin').fill('I observed a pale ventral surface.');
  103 |   await expect(page.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', both ? 'false' : 'true');
  104 |   expect((await evidence(page)).confidence).toEqual(before.confidence);
  105 | });
  106 | 
  107 | test('a hidden inspected record finishes without changing the view or completion timestamp', async ({ page }) => {
  108 |   await mount(page, { ...draft, organSearch: 'dorsal', exploredOrgans: { 'frog|dorsal_skin': true }, organNotes: { 'frog|dorsal_skin': 'Observed a pigmented dorsal surface.' }, organConfidence: { 'frog|dorsal_skin': 4 } });
  109 |   const before = await evidence(page); await expect(context(page)).toHaveAttribute('data-context-exposure', 'occluded');
  110 |   await expect(context(page)).toContainText('complete your existing record while this structure is hidden');
  111 |   await finish(page).click(); await expect(page.locator('#diss-confidence-dorsal_skin-1')).toBeFocused();
  112 |   expect(await evidence(page)).toEqual({ ...before, selected: 'dorsal_skin' });
  113 | });
  114 | 
  115 | test('an uninspected restored draft stays in To inspect and offers no record completion shortcut', async ({ page }) => {
  116 |   await mount(page, { ...draft, exploredOrgans: {}, organConfidence: { 'frog|ventral_skin': 2 } });
  117 |   const before = await evidence(page); await expect(finish(page)).toHaveCount(0);
  118 |   await filter(page, 'needs-record').click(); await expect(page.locator('.diss-directory-item')).toHaveCount(0);
  119 |   await filter(page, 'recorded').click(); await expect(page.locator('.diss-directory-item')).toHaveCount(0);
  120 |   await filter(page, 'unviewed').click(); await expect(page.locator('.diss-directory-item')).toHaveCount(1);
  121 |   await expect(context(page)).toContainText('Before inspection'); expect(await evidence(page)).toEqual(before);
  122 | });
  123 | 
  124 | test('objective next evidence names an invalid rating before allowing demonstrated status', async ({ page }) => {
  125 |   const state = { ...draft, activeLayer: 'organs', anatomicalView: 'internal', organSearch: 'heart', revealedLayers: { skin: true, muscle: true, organs: true }, procedureByLayer: { organs: complete }, exploredOrgans: { 'frog|heart': true }, organNotes: { 'frog|heart': 'Observed chambers in the central thoracic region.' }, organConfidence: { 'frog|heart': 4 }, verifiedIdentifications: { 'frog|heart': { status: 'verified' } } };
  126 |   await mount(page, state);
  127 |   const objective = page.locator('.diss-objective-item').first();
  128 |   await expect(objective).toHaveAttribute('data-objective-status', 'developing');
  129 |   await expect(objective).toContainText('0/1 evidence record');
  130 |   await expect(objective).toContainText('Next: add an observation note and confidence rating');
  131 |   await expect(objective).not.toContainText('Evidence demonstrated');
  132 |   await finish(page).click(); await page.locator('#diss-confidence-heart-1').check();
  133 |   await expect(objective).toHaveAttribute('data-objective-status', 'demonstrated');
  134 |   await expect(objective).toContainText('Evidence demonstrated');
  135 | });
  136 | 
  137 | test('direct completion preserves a fixed guided target and step', async ({ page }) => {
  138 |   await mount(page, { ...draft, guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'] });
  139 |   const before = await evidence(page); await finish(page).click();
  140 |   await expect(page.locator('#diss-confidence-ventral_skin-1')).toBeFocused();
  141 |   expect(await evidence(page)).toEqual({ ...before, selected: 'ventral_skin' });
  142 |   await page.keyboard.press('Space');
  143 |   expect((await evidence(page)).guided).toEqual(before.guided); expect((await evidence(page)).verified).toEqual(before.verified);
  144 | });
  145 | 
  146 | test('observation review and its export use Finish records for confidence-only work', async ({ page }) => {
  147 |   await mount(page, { ...draft, exploredOrgans: { 'frog|ventral_skin': true, 'frog|dorsal_skin': true }, organNotes: { ...draft.organNotes, 'frog|dorsal_skin': 'Observed a darker surface.' }, organConfidence: { 'frog|ventral_skin': 4, 'frog|dorsal_skin': 1 } });
  148 |   const before = await evidence(page), review = page.locator('[data-observation-review]');
  149 |   await review.locator('#diss-observation-review-title').click();
  150 |   await expect(review.locator('[data-observation-filter="unfinished"]')).toHaveText('Finish records (1)');
  151 |   await review.locator('[data-observation-filter="unfinished"]').click();
  152 |   await expect(review.locator('[data-observation-entry]')).toHaveCount(1);
  153 |   await expect(review.locator('[data-observation-entry="ventral_skin"]')).toBeVisible();
  154 |   await review.locator('[data-observation-export] summary').click();
  155 |   await expect(review.locator('#diss-observation-summary')).toHaveValue(/Scope: Finish records/);
  156 |   await review.locator('[data-observation-filter="uncertain"]').click();
  157 |   await expect(review.locator('[data-observation-entry="dorsal_skin"]')).toBeVisible();
  158 |   expect(await evidence(page)).toEqual(before);
  159 | });
  160 | 
```