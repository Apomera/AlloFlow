# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-record-handoff.spec.ts >> finishing records advances the handoff only after explicit writing or rating
- Location: tests\e2e\dissection-record-handoff.spec.ts:66:5

# Error details

```
Error: expect(locator).toBeChecked() failed

Locator: getByRole('radio', { name: 'Confidence 2 of 3: Some evidence', exact: true })
Expected: checked
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeChecked" with timeout 15000ms
  - waiting for getByRole('radio', { name: 'Confidence 2 of 3: Some evidence', exact: true })

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
  - paragraph: "Work through the specimen one clear action at a time. Current focus: Record evidence."
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
  - text: Specimen 🐸 Frog (Rana) Layer 1 of 5 · Skin Structures viewed 4 of 37
- region "Write an evidence note for Tympanic Membrane":
  - text: Step 5 of 6 Next best action · Record evidence
  - heading "Write an evidence note for Tympanic Membrane" [level=3]
  - paragraph: Your confidence rating is present. Describe what you observed and how it supports the identification. 2 of 4 inspected structures have a note and confidence rating.
  - text: 🐸 Frog (Rana) 🟢 Skin · layer 1/5
  - button "Write evidence note"
  - button "View specimen"
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
  - paragraph: Use Left and Right to browse available layers; Enter selects. Scroll to see all layers.
- 'tabpanel "Select specimen: Frog (Rana)"':
  - region "🐸 Frog (Rana) · Skin":
    - text: Interactive specimen
    - heading "🐸 Frog (Rana) · Skin" [level=3]
    - text: "Selected: Tympanic Membrane"
    - group:
      - strong: View & orientation
      - text: Ventral · Skin +
    - 'group "Current action: Write an evidence note for Tympanic Membrane. Record evidence. Workflow step 5 of 6"':
      - strong: Next · Write an evidence note for Tympanic Membrane
      - text: Record evidence Workflow 5/6
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
    - button "Frame selected structure Tympanic Membrane": ◎ Frame Tympanic Membrane
    - paragraph: Every canvas action has a keyboard or button alternative. The specimen canvas description lists them.
    - status: "Record evidence: Write an evidence note for Tympanic Membrane. Your confidence rating is present. Describe what you observed and how it supports the identification. 2 of 4 inspected structures have a note and confidence rating. Selected Tympanic Membrane in the Skin layer."
    - group: Evidence notebook · 0/6 frames
    - region "Layer review":
      - text: Skin
      - heading "Layer review" [level=3]
      - text: Record evidence
      - region "Investigation progress":
        - heading "Investigation progress" [level=4]
        - strong: "Verified technique: 6 of 6"
        - 'progressbar "Verified technique: 6 of 6"'
        - text: Actions with a confirmed plan and explanation.
        - strong: "Structures inspected: 4 of 4"
        - 'progressbar "Structures inspected: 4 of 4"'
        - text: Structures viewed across this layer’s anatomical views.
        - strong: "Evidence recorded: 2 of 4"
        - 'progressbar "Evidence recorded: 2 of 4"'
        - text: Inspected structures with a note and confidence rating.
        - group: Unfinished observation records · 2
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
    - group: Review observations · 4 inspected
    - region "Tympanic Membrane":
      - heading "Tympanic Membrane" [level=4]
      - status "Tympanic Membrane, structure 3 of 4": 3 of 4
      - button "Previous structure": ◀
      - button "Next structure": ▶
      - button "Back to structure directory": ✕
      - note:
        - strong: Observe first
        - paragraph: Describe a visible feature and its location. Compare with the reference, then revise your observation as needed.
      - 'group "Study actions: Tympanic Membrane"':
        - list:
          - listitem:
            - button "Inspect specimen":
              - strong: Inspect specimen
              - text: Bring this structure into focus.
          - listitem:
            - button "Write observation":
              - strong: Write observation
              - text: Describe a feature and its location.
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
      - group "How sure are you, based on your evidence?":
        - text: How sure are you, based on your evidence?
        - 'radio "Confidence 1 of 3: Not sure yet"'
        - text: 1 · Not sure yet
        - 'radio "Confidence 2 of 3: Somewhat sure" [checked]'
        - text: 2 · Somewhat sure
        - 'radio "Confidence 3 of 3: Confident"'
        - text: 3 · Confident
      - paragraph:
        - strong: "Calibration cue:"
        - text: Check one more distinguishing feature or anatomical relationship.
      - button "Review layer progress"
      - group "Draft check":
        - strong: Draft check
        - list "Writing and confidence status":
          - listitem: Note not started
          - listitem: "Confidence: Somewhat sure"
        - paragraph: Text and confidence are recorded separately. Their presence does not verify the explanation or earn an assessment score.
        - group: Review your explanation
      - group: "Optional challenge: test your identification ＋"
      - region "Your record":
        - heading "Your record" [level=4]
        - text: Add an evidence note
        - paragraph: 2 of 4 inspected structures in this layer have a note and confidence rating.
        - strong: "Next unfinished record: Nictitating Membrane"
        - paragraph: Note and confidence needed. Write an observation note, then choose a confidence rating based on your evidence.
        - button "Open observation record for Nictitating Membrane": "Open observation record: Nictitating Membrane"
        - button "Review all observations"
      - button "🤖 AI Explain"
      - button "Copy Tympanic Membrane information to clipboard": 📋 Copy
    - text: Layer Progress 🟢 Skin 💪 Muscle 🫁 Organs 🦴 Skeleton ⚡ Nervous
    - paragraph: Classic vertebrate — 3-chambered heart, cutaneous respiration, metamorphosis.
    - paragraph: "Comparative learning model: specimen observations and human clinical connections are labeled separately. Anatomy varies by species, age, preservation, and individual."
    - group: Biology fact ＋
    - text: 📊 Learning evidence 10%
    - 'progressbar "Observation: structures viewed 4 of 37"'
    - text: "Observation: 4 of 37 structures viewed Technique 20%"
    - progressbar "Technique evidence"
    - text: Observation 11%
    - progressbar "Observation evidence"
    - text: Evidence 5%
    - progressbar "Evidence evidence"
    - text: Understanding 3%
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
  1   | import { test, expect, type Page } from '@playwright/test';
  2   | import { mkdir, writeFile } from 'node:fs/promises';
  3   | import { GlHarness } from './helpers/stem_gl_harness';
  4   | 
  5   | const out = 'reports/dissection-record-handoff-2026-10-02';
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
  22  | async function catalog(page: Page) { return page.locator('.diss-directory-item').evaluateAll(nodes => nodes.map(node => ({ id: node.id.replace('diss-organ-', ''), name: node.querySelector('.diss-directory-item__name')!.textContent! }))); }
  23  | async function seed(page: Page, state: any = {}, width = 390, available = width) {
  24  |   await mount(page, {}, width, available); const organs = await catalog(page); expect(organs).toHaveLength(4); await harness.unmount(page);
  25  |   const exploredOrgans = Object.fromEntries(organs.map(org => ['frog|' + org.id, true]));
  26  |   const organNotes = Object.fromEntries(organs.map(org => ['frog|' + org.id, 'I observed a surface boundary.']));
  27  |   const organConfidence = Object.fromEntries(organs.map(org => ['frog|' + org.id, 2]));
  28  |   organConfidence['frog|' + organs[1].id] = 0; organNotes['frog|' + organs[2].id] = '   '; organNotes['frog|' + organs[3].id] = ''; organConfidence['frog|' + organs[3].id] = 0;
  29  |   await mount(page, { selectedOrgan: organs[0].id, exploredOrgans, organNotes, organConfidence, ...state }, width, available); return organs;
  30  | }
  31  | async function evidence(page: Page) { return page.evaluate(() => { const d = (window as any).__ctx.toolData.dissection; return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioCompletedAt], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] }; }); }
  32  | 
  33  | for (const { name, width, available, large, contrast, forced } of [
  34  |   { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  35  |   { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
  36  | ]) test(`record handoff ${name} is readable and opens the actual missing field`, async ({ page }) => {
  37  |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message)); if (forced) await page.emulateMedia({ forcedColors: 'active' });
  38  |   const organs = await seed(page, { largeText: !!large, highContrast: !!contrast }, width, available), before = await evidence(page), handoff = page.getByRole('region', { name: 'Your record', exact: true });
  39  |   await expect(handoff.locator('[data-record-complete]')).toHaveText('Note and confidence recorded'); await expect(handoff).toContainText('1 of 4 inspected structures');
  40  |   await expect(handoff.locator('[data-next-record]')).toHaveAttribute('data-next-record', organs[1].id); await expect(handoff).toContainText('Confidence needed');
  41  |   const button = handoff.getByRole('button', { name: 'Choose confidence for ' + organs[1].name, exact: true }); await button.focus();
  42  |   await handoff.screenshot({ path: `${out}/${name}-handoff.png`, style: '.diss-next-action {position:static!important;}' });
  43  |   const metrics = await handoff.evaluate(node => ({ client: node.clientWidth, scroll: node.scrollWidth,
  44  |     targets: Array.from(node.querySelectorAll('button')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ label: el.textContent, height: el.getBoundingClientRect().height, clipped: el.scrollWidth > el.clientWidth + 1 })),
  45  |     text: Array.from(node.querySelectorAll('h4,p,strong,span,button')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth + 1 })) }));
  46  |   await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2)); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  47  |   for (const target of metrics.targets) { expect(target.height, target.label || '').toBeGreaterThanOrEqual(47.9); expect(target.clipped).toBe(false); }
  48  |   for (const text of metrics.text) { expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped, text.text || '').toBe(false); }
  49  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' }); const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-note-handoff]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  50  |   await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);
  51  |   await page.keyboard.press('Enter'); await expect(page.locator(`#diss-confidence-${organs[1].id}-1`)).toBeFocused(); await expect(page.locator(`#diss-confidence-${organs[1].id}-1`)).not.toBeChecked(); expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
  52  | });
  53  | 
  54  | for (const kind of ['confidence', 'note', 'both']) test(`next action names the ${kind} missing from the record`, async ({ page }) => {
  55  |   const organs = await seed(page), target = organs[0]; await harness.unmount(page);
  56  |   const state: any = { exploredOrgans: Object.fromEntries(organs.map(org => ['frog|' + org.id, true])), organNotes: Object.fromEntries(organs.map(org => ['frog|' + org.id, 'A visible boundary.'])), organConfidence: Object.fromEntries(organs.map(org => ['frog|' + org.id, 2])) };
  57  |   if (kind !== 'confidence') state.organNotes['frog|' + target.id] = '  '; if (kind !== 'note') state.organConfidence['frog|' + target.id] = 0;
  58  |   await mount(page, state); const before = await evidence(page), action = page.locator('[data-dissection-next-action]');
  59  |   const title = kind === 'confidence' ? 'Rate your confidence for ' : kind === 'note' ? 'Write an evidence note for ' : 'Complete the observation record for ';
  60  |   const label = kind === 'confidence' ? 'Choose confidence' : kind === 'note' ? 'Write evidence note' : 'Open observation record';
  61  |   await expect(action).toHaveAttribute('data-next-action', 'evidence'); await expect(action.locator('#diss-next-action-title')).toHaveText(title + target.name);
  62  |   await action.getByRole('button', { name: label, exact: true }).click(); await expect(page.locator(kind === 'confidence' ? `#diss-confidence-${target.id}-1` : `#diss-note-${target.id}`)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  63  |   if (kind === 'confidence') await expect(page.locator('.diss-confidence-scale input:checked')).toHaveCount(0);
  64  | });
  65  | 
  66  | test('finishing records advances the handoff only after explicit writing or rating', async ({ page }) => {
  67  |   const organs = await seed(page), before = await evidence(page), handoff = page.locator('[data-note-handoff]');
  68  |   await handoff.locator('[data-next-record-action]').click(); await page.getByRole('radio', { name: 'Confidence 1 of 3: Not sure yet', exact: true }).check();
  69  |   await expect(handoff.locator('[data-record-complete]')).toHaveText('Note and confidence recorded'); await expect(handoff).toContainText('2 of 4 inspected structures');
  70  |   await expect(handoff.locator('[data-next-record]')).toHaveAttribute('data-next-record', organs[2].id); await expect(handoff).toContainText('Note needed');
> 71  |   await handoff.locator('[data-next-record-action]').click(); await expect(page.locator(`#diss-note-${organs[2].id}`)).toBeFocused(); await expect(page.getByRole('radio', { name: 'Confidence 2 of 3: Some evidence', exact: true })).toBeChecked();
      |                                                                                                                                                                                                                                        ^ Error: expect(locator).toBeChecked() failed
  72  |   await page.locator(`#diss-note-${organs[2].id}`).fill('I observed the external membrane next to the eye.');
  73  |   await expect(handoff).toContainText('3 of 4 inspected structures'); await expect(handoff.locator('[data-next-record]')).toHaveAttribute('data-next-record', organs[3].id); await expect(handoff).toContainText('Note and confidence needed');
  74  |   await handoff.locator('[data-next-record-action]').click(); await expect(page.locator(`#diss-note-${organs[3].id}`)).toBeFocused(); await page.locator(`#diss-note-${organs[3].id}`).fill('I observed the protective eyelid and its position.');
  75  |   await expect(handoff.locator('[data-record-handoff-remaining]')).toHaveText('Finish this record before continuing your notes.');
  76  |   await page.getByRole('radio', { name: 'Confidence 2 of 3: Some evidence', exact: true }).check(); await expect(handoff).toContainText('4 of 4 inspected structures');
  77  |   await expect(handoff.locator('[data-record-handoff-remaining]')).toHaveText('Every structure in this layer has been inspected and documented.');
  78  |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal');
  79  |   const after = await evidence(page); expect(after.explored).toEqual(before.explored); expect(after.verified).toEqual(before.verified); expect(after.scores).toEqual(before.scores); expect(after.procedures).toEqual(before.procedures); expect(after.revealed).toEqual(before.revealed);
  80  |   await page.getByRole('button', { name: 'Review layer progress', exact: true }).click(); await expect(page.locator('#diss-investigation-progress-title')).toBeFocused();
  81  | });
  82  | 
  83  | test('clearing the current note keeps a pending record visible when no other record is unfinished', async ({ page }) => {
  84  |   const organs = await seed(page); await harness.unmount(page); await mount(page, { selectedOrgan: organs[0].id, exploredOrgans: { ['frog|' + organs[0].id]: true }, organNotes: { ['frog|' + organs[0].id]: 'A visible surface.' }, organConfidence: { ['frog|' + organs[0].id]: 2 } });
  85  |   const handoff = page.locator('[data-note-handoff]'); await expect(handoff.locator('[data-next-record-action]')).toHaveCount(0); await expect(handoff.locator('[data-record-handoff-remaining]')).toHaveText('3 more structures need inspection in this layer.');
  86  |   await page.locator(`#diss-note-${organs[0].id}`).fill('  '); await expect(handoff.locator('[data-record-complete]')).toHaveAttribute('data-record-complete', 'false'); await expect(handoff).toContainText('Add an evidence note');
  87  |   await expect(handoff.locator('[data-record-handoff-remaining]')).toHaveText('Finish this record before continuing your notes.');
  88  | });
  89  | 
  90  | test('next-record navigation preserves the guided route, view, and scenario completion', async ({ page }) => {
  91  |   const organs = await seed(page, { guidedMode: true, guidedStep: 0, guidedTargetIds: ['ventral_skin', 'tympanum'], anatomicalView: 'dorsal', scenarioStartedAt: 100, scenarioCompletedAt: 200 });
  92  |   const before = await evidence(page); await page.locator('[data-next-record-action]').click(); await expect(page.locator(`#diss-confidence-${organs[1].id}-1`)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  93  |   await page.getByRole('button', { name: 'Review layer progress', exact: true }).click(); expect(await evidence(page)).toEqual(before);
  94  | });
  95  | 
  96  | for (const practical of [false, true]) test(`${practical ? 'timed practical' : 'quiz'} hides the observation handoff`, async ({ page }) => {
  97  |   await mount(page, { selectedOrgan: 'ventral_skin', quizMode: !practical, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: ['ventral_skin', 'tympanum'], exploredOrgans: { 'frog|ventral_skin': true } });
  98  |   await expect(page.locator('[data-note-handoff]')).toHaveCount(0); await expect(page.locator('[data-next-record-action]')).toHaveCount(0);
  99  | });
  100 | 
```