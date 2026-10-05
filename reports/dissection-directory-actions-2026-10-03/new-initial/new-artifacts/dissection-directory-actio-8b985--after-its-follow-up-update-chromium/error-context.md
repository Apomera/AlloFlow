# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-directory-actions.spec.ts >> relationship tracing retains the first structure-trace completion after its follow-up update
- Location: tests\e2e\dissection-directory-actions.spec.ts:103:71

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator: getByRole('button', { name: 'Trace next exposed connection', exact: true })
Expected: enabled
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeEnabled" with timeout 15000ms
  - waiting for getByRole('button', { name: 'Trace next exposed connection', exact: true })

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
  - text: Specimen 🐸 Frog (Rana) Layer 3 of 5 · Organs Structures viewed 1 of 37
- region "Find and inspect Lungs":
  - text: Step 4 of 6 Next best action · Identify
  - heading "Find and inspect Lungs" [level=3]
  - paragraph: 1 of 12 structures inspected in this layer.
  - paragraph: Use the specimen or preview the target in the structure directory. Activate a visible directory result to inspect it.
  - text: 🐸 Frog (Rana) 🫁 Organs · layer 3/5
  - button "Focus the specimen"
  - button "Find Lungs in structure directory": Find in directory
- toolbar "Learning route":
  - button "Free explore" [pressed]: 🔎 Free explore
  - button "Guided investigation": 🧭 Guided investigation
  - button "Study tools": 📚 Study tools
  - button "Practice assessment": 🧠 Practice assessment
  - group "Workspace detail":
    - button "Essentials workspace": Essentials
    - button "Advanced workspace" [pressed]: Advanced
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
  - paragraph: 2 of 5 layers revealed
  - toolbar "Specimen display and lab tool controls":
    - button "View and accessibility options": 👁 View & access ▼
    - button "Lab tool options": 🛠 Tools ▼
  - 'button "Layer 1: Skin, revealed"': 🟢 Skin Revisit structures
  - 'button "Layer 2: Muscle, revealed"': 💪 Muscle Revisit structures
  - 'button "Layer 3: Organs, current"': 🫁 Organs Awaiting reveal
  - 'button "Layer 4: Skeleton, locked" [disabled]': 🦴 Skeleton Reveal Organs first
  - 'button "Layer 5: Nervous, locked" [disabled]': ⚡ Nervous Reveal Skeleton first
  - paragraph: Use Left and Right to browse available layers; Enter selects.
- 'tabpanel "Select specimen: Frog (Rana)"':
  - region "🐸 Frog (Rana) · Organs":
    - text: Interactive specimen
    - heading "🐸 Frog (Rana) · Organs" [level=3]
    - text: "Selected: Heart (3-chamber)"
    - group:
      - strong: View & orientation
      - text: Internal · Organs +
    - 'group "Current action: Find and inspect Lungs. Identify. Workflow step 4 of 6"':
      - strong: Next · Find and inspect Lungs
      - text: Identify Workflow 4/6
    - group:
      - strong: Field monitor
      - text: High-definition field Exposure and tissue-response details
    - 'group "Current pointer mode: Inspect anatomy. Select a visible structure, or use Arrow keys to preview and Enter to inspect."':
      - strong: Pointer mode ? Inspect anatomy
      - text: Select a visible structure, or use Arrow keys to preview and Enter to inspect.
    - text: Frog (Rana) interactive specimen · Organs layer, internal view
    - region "Specimen canvas description":
      - heading "Specimen canvas description" [level=4]
      - paragraph: Every canvas selection and drag action has a keyboard or button alternative. Use the structure directory for equivalent anatomical descriptions, the technique action button instead of drawing a stroke, the pin action button instead of dragging a pin, the probe action button instead of tracing a structure, and the pan controls instead of dragging a zoomed view. When the depth atlas is enabled, surface landmarks use circles, mid-depth landmarks use diamonds, and deep landmarks use double rings.
      - paragraph: "Frog (Rana) virtual dissection. Specimen-specific procedure: Frog ventral midline access; recommended view ventral; access route shallow ventral midline corridor; protected landmarks Heart (3-chamber), Liver (3 lobes), Lungs. Current view: internal, standard condition, Organs layer. Progressive exposure: Fully exposed field, 94 percent; decision quality 82 percent. Observation field: High-definition field, 92 percent; limiting factor: No major limiter. Surface model: moist chromatophore surface. Surface microtexture is suppressed for visual clarity. Tool contact response: elastic skin. Light direction: overhead. Illumination 68 percent: Balanced illumination; glare risk 6 percent. Focus isolation on. Tissue relief on and responsive to the inspection light. Depth atlas on, with circle surface markers, diamond mid-depth markers, and double-ring deep markers. Selected and hovered structures use a labeled depth footprint with front and back edges, visibility-specific line styles, and boundary-attached relationship paths. Relationship types use distinct line patterns and moving marker shapes, with fixed markers when motion is reduced. Tubular, lobed, chambered, layered, and compact structure classes use distinct contours, internal patterns, and text labels. View and layer navigation uses a labeled orientation sweep with circle start and diamond target markers, plus concentric depth rings for deeper or superficial movement; reduced motion switches instantly and uses text announcements. Depth motion on. 12 directly visible structures. Active instrument: forceps. Action readiness: Technique complete, 66 percent. Technique protocol complete. Continue with visible structure identification and evidence.. Directional contact footprint feedback is active. Engaged instrument tips use foreground tissue lips and paired depth notches to show partial insertion and opening-edge occlusion. Directional target guidance uses a dashed arrow, labeled endpoint, and shape-coded reticle when an instrument is spatially misaligned. Localized action outcomes use a one-shot check or warning symbol with the changed tissue metric. Tissue opening, retraction, stabilization, hydration, and risk metrics transition spatially after each action; Undo reverses openings, retraction, pin placement, hydration, wick evidence, and probe traces; reduced motion snaps to the final state. Three-dimensional instrument pitch feedback is active. Light-aware instrument elevation feedback is active. Equivalent keyboard and button actions include an instrument approach, contact, and release replay. Recorded attempt replay progressively traces pressure with line width and states path alignment in text and shape. Direct forceps press-drag-release manipulation shows live lift direction, safe range, calibrated grip, speed, control, slip risk, and excess tension with text and geometry; the technique action button remains equivalent. Live pin stability preview shows endpoint spacing, calibrated angle, insertion depth, and flap tension with text and geometry. Direct pin press-drag-release placement adds shaft alignment, insertion travel, safe depth, and control feedback. Live probe palpation preview shows calibrated pressure, material resistance, anatomical depth, and tissue deformation with text and shape. Direct probe press-drag-release tracing adds contact coverage, alignment, resistance, deformation, and control feedback. Direct dropper press-drag-release hydration adds contact coverage, flow alignment, moisture, dose, and pooling feedback. Direct wick press-drag-release recovery adds pool-edge alignment, contact coverage, recovery distance, and control feedback. Live dropper spread forecast shows dose count, organism-specific flow direction, current saturation, and pooling risk with text and geometry. Absorbent-wick feedback shows pool-edge targeting, fluid recovery, and a localized balanced-film marker with text and cross-hatched geometry. Guided procedure handoff cue connects the next required instrument to its anatomical target and 6-step progress rail with text, shape, and line style. Persistent localized technique evidence maps edge stress, grip compression, anchor tension, probe pressure, and saline pooling to actual contact locations with text and distinct geometry; direct wick recovery maps pool-edge contact, recovery distance, and control. Press the opened tissue edge, drag away while monitoring lift and tension, then release inside the solid safe envelope; the equivalent technique action button remains available. Occluded structures remain available in the structure directory."
    - application "Frog (Rana) interactive specimen · Organs layer, internal view"
    - paragraph: Numbered markers match the numbers in the structure list.
    - button "Browse structures"
    - button "Zoom out canvas": ➖
    - text: 100%
    - button "Zoom in canvas": ➕
    - button "Frame selected structure Heart (3-chamber)": ◎ Frame Heart (3-chamber)
    - 'group "Anatomical depth visual key: 0 surface, 0 mid-depth, and 12 deep structures"': Depth atlas Surface 0 Mid-depth 0 Deep 12
    - group "System color key": System color key ＋
    - paragraph: Every canvas action has a keyboard or button alternative. The specimen canvas description lists them.
    - status: "Identify: Find and inspect Lungs. 1 of 12 structures inspected in this layer. Selected Heart (3-chamber) in the Organs layer."
    - group: Evidence notebook · 0/6 frames
    - region "Layer review":
      - text: Organs
      - heading "Layer review" [level=3]
      - text: Inspect structures
      - region "Investigation progress":
        - heading "Investigation progress" [level=4]
        - strong: "Verified technique: 6 of 6"
        - 'progressbar "Verified technique: 6 of 6"'
        - text: Actions with a confirmed plan and explanation.
        - strong: "Structures inspected: 1 of 12"
        - 'progressbar "Structures inspected: 1 of 12"'
        - text: Structures viewed across this layer’s anatomical views.
        - strong: "Evidence recorded: 1 of 12"
        - 'progressbar "Evidence recorded: 1 of 12"'
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
      - paragraph: The instrument sequence and explanations are complete. Review your observations. The next action shows any evidence still needed before revealing this layer.
      - button "Review next action"
      - group: About technique feedback
      - group: Action history6 saved records
    - group: Keyboard and precision controls
    - group "Technique practice · ready to complete":
      - strong: Technique controls
      - text: Protocol complete
    - group "System overlays": Systems and physiology tools
  - complementary "Structure directory and lab notes":
    - link "Return to interactive specimen":
      - /url: "#diss-canvas"
    - group: Review observations · 1 inspected
    - region "Heart (3-chamber)":
      - heading "Heart (3-chamber)" [level=4]
      - status "Heart (3-chamber), structure 1 of 12": 1 of 12
      - button "Previous structure" [disabled]: ◀
      - button "Next structure": ▶
      - button "Back to structure directory": ✕
      - note:
        - strong: Observe first
        - paragraph: Describe a visible feature and its location. Compare with the reference, then revise your observation as needed.
      - 'group "Study actions: Heart (3-chamber)"':
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
        - text: Observed a chambered central structure.
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
          - listitem: Draft present · review needed
          - listitem: "Confidence: Somewhat sure"
        - paragraph: Text and confidence are recorded separately. Their presence does not verify the explanation or earn an assessment score.
        - group: Review your explanation
      - group: "Optional challenge: test your identification ＋"
      - region "Your record":
        - heading "Your record" [level=4]
        - text: Note and confidence recorded
        - paragraph: 1 of 1 inspected structures in this layer have a note and confidence rating.
        - paragraph: 11 more structures need inspection in this layer.
        - strong: "Next inspection: Lungs"
        - paragraph: Preview the target in the directory, then activate its result when visible to inspect it.
        - button "Find Lungs in structure directory": "Find in directory: Lungs"
        - button "Review all observations"
      - button "🤖 AI Explain"
      - button "Copy Heart (3-chamber) information to clipboard": 📋 Copy
    - text: Layer Progress 🟢 Skin ✓ 💪 Muscle ✓ 🫁 Organs 🦴 Skeleton ⚡ Nervous
    - paragraph: Classic vertebrate — 3-chambered heart, cutaneous respiration, metamorphosis.
    - paragraph: "Comparative learning model: specimen observations and human clinical connections are labeled separately. Anatomy varies by species, age, preservation, and individual."
    - group: Biology fact ＋
    - text: 📊 Learning evidence 12%
    - 'progressbar "Observation: structures viewed 1 of 37"'
    - text: "Observation: 1 of 37 structures viewed Technique 20%"
    - progressbar "Technique evidence"
    - text: Observation 3%
    - progressbar "Observation evidence"
    - text: Evidence 3%
    - progressbar "Evidence evidence"
    - text: Understanding 22%
    - progressbar "Understanding evidence"
    - text: 1/2 guided identifications verified · 1/37 evidence records · completed first-attempt assessment 0/0 Practice in progress Continue the investigation; the log distinguishes viewing from verified understanding.
    - button "Copy practice log to clipboard": Copy practice log
    - group: Specimen stats ＋
    - group: Learning objectives ＋
    - group: Advanced inquiry simulator ＋
    - group: Key terms ＋
```

# Test source

```ts
  5   | const out = 'reports/dissection-directory-actions-2026-10-03';
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
  35  | const saved = { exploredOrgans: { 'frog|ventral_skin': true, 'frog|tympanum': true, 'frog|nictitating': true }, organNotes: { 'frog|ventral_skin': 'Observed the pale, moist ventral surface.', 'frog|tympanum': 'Observed a circular eardrum behind the eye.' }, organConfidence: { 'frog|tympanum': 2 }, verifiedIdentifications: { 'frog|tympanum': { status: 'verified', at: 88 } }, revealedLayers: { muscle: true }, toolCalibration: { forcepsGrip: 45, probePressure: 40, pinAngle: 60 }, procedureScenario: 'structure-trace', instructorRequiredStructures: 2, scenarioStartedAt: 100, scenarioCompletedAt: 200 };
  36  | const row = (page: Page, id: string) => page.locator('#diss-organ-' + id);
  37  | async function back(page: Page) { await page.getByRole('button', { name: 'Back to structure directory', exact: true }).click(); }
  38  | async function time(page: Page, value: number) { await page.evaluate(value => { Date.now = () => value; }, value); }
  39  | 
  40  | for (const { name, width, available, large, contrast, forced } of [
  41  |   { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 }, { name: 'desktop', width: 1440, available: 1180 },
  42  |   { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true }, { name: 'forced-colors', width: 390, available: 390, forced: true },
  43  | ]) test(`directory actions ${name} state the actual action and preserve saved evidence`, async ({ page }) => {
  44  |   const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); if (forced) await page.emulateMedia({ forcedColors: 'active' });
  45  |   await mount(page, { ...saved, largeText: !!large, highContrast: !!contrast }, width, available);
  46  |   const before = await evidence(page), directory = page.locator('[data-dissection-directory]');
  47  |   for (const [id, action] of [['dorsal_skin','Show recovery guidance'],['ventral_skin','Choose confidence'],['tympanum','Review saved record'],['nictitating','Open observation record']]) {
  48  |     await expect(row(page,id).locator('.diss-directory-item__action')).toHaveText(action + ' →');
  49  |     await expect(row(page,id)).toHaveAccessibleName(new RegExp(action));
  50  |   }
  51  |   await expect(row(page,'nictitating').locator('[data-structure-record]')).toHaveText('Note and confidence needed');
  52  |   await row(page,'ventral_skin').focus();
  53  |   await directory.screenshot({path:`${out}/${name}-actions.png`,style:'.diss-next-action {position:static!important;}'});
  54  |   const metrics = await directory.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,
  55  |     rows:Array.from(el.querySelectorAll('.diss-directory-item')).map(n=>({height:n.getBoundingClientRect().height,clipped:n.scrollWidth>n.clientWidth+1})),
  56  |     text:Array.from(el.querySelectorAll('.diss-directory-item__name,.diss-directory-item__action,.diss-directory-progress,.diss-directory-item__state')).map(n=>({text:n.textContent,font:parseFloat(getComputedStyle(n).fontSize),clipped:n.scrollWidth>n.clientWidth+1}))}));
  57  |   expect(metrics.scroll).toBeLessThanOrEqual(metrics.client+1); for(const n of metrics.rows) {expect(n.height).toBeGreaterThanOrEqual(47.9);expect(n.clipped).toBe(false);}
  58  |   for(const n of metrics.text) {expect(n.font,n.text||'').toBeGreaterThanOrEqual(large?15.9:13.9);expect(n.clipped).toBe(false);}
  59  |   await writeFile(`${out}/${name}-metrics.json`,JSON.stringify(metrics,null,2));
  60  |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  61  |   const audit=await page.evaluate(async()=>(window as any).axe.run({include:[['[data-dissection-directory]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  62  |   await writeFile(`${out}/${name}-axe.json`,JSON.stringify(audit,null,2));expect(audit.violations).toEqual([]);
  63  |   if(width===320||large||forced){await row(page,'nictitating').scrollIntoViewIfNeeded();await expect(row(page,'nictitating').locator('.diss-directory-item__action')).toBeInViewport();await directory.screenshot({path:`${out}/${name}-actions-end.png`,style:'.diss-next-action {position:static!important;}'});}
  64  |   await row(page,'ventral_skin').focus();await page.keyboard.press('Enter');await expect(page.locator('#diss-confidence-ventral_skin-1')).toBeFocused();
  65  |   expect(await evidence(page)).toEqual({...before,selected:'ventral_skin'});await back(page);expect(await evidence(page)).toEqual(before);expect(errors).toEqual([]);
  66  | });
  67  | 
  68  | for (const both of [false,true]) test(`row activation focuses ${both?'the record with both fields missing':'the missing note'} and keeps its query`,async({page})=>{
  69  |   await mount(page,{...saved,organSearch:'ventral',directoryFilter:'needs-record',organNotes:{'frog|ventral_skin':'   '},organConfidence:{'frog|ventral_skin':both?0:2}});
  70  |   const before=await evidence(page);await row(page,'ventral_skin').click();await expect(page.locator('#diss-note-ventral_skin')).toBeFocused();
  71  |   expect(await evidence(page)).toEqual({...before,selected:'ventral_skin'});await back(page);await expect(page.locator('#diss-organ-search')).toHaveValue('ventral');
  72  |   await expect(page.locator('[data-directory-filter="needs-record"]')).toHaveAttribute('aria-pressed','true');expect(await evidence(page)).toEqual(before);
  73  | });
  74  | 
  75  | for(const completedAt of [0,200]) test(`saved record review preserves completion ${completedAt} without awarding an inspection`,async({page})=>{
  76  |   await mount(page,{...saved,scenarioCompletedAt:completedAt});const before=await evidence(page);await time(page,9000);
  77  |   await row(page,'tympanum').click();await expect(page.locator('#diss-selection-title')).toBeFocused();expect(await evidence(page)).toEqual({...before,selected:'tympanum'});
  78  | });
  79  | 
  80  | test('next-structure navigation to an inspected neighbor preserves navigation focus and completion',async({page})=>{
  81  |   await mount(page,{...saved,selectedOrgan:'ventral_skin'});const before=await evidence(page),next=page.getByRole('button',{name:'Next structure',exact:true});
  82  |   await next.focus();await page.keyboard.press('Enter');await expect(next).toBeFocused();expect(await evidence(page)).toEqual({...before,selected:'tympanum'});
  83  | });
  84  | 
  85  | for(const hidden of [false,true]) test(`an inspected guided target ${hidden?'stays in hidden record review':'still opens its visible evidence checkpoint'}`,async({page})=>{
  86  |   await mount(page,{...saved,anatomicalView:hidden?'dorsal':'ventral',guidedMode:true,guidedStep:0,guidedTargetIds:['ventral_skin','tympanum']});const before=await evidence(page);
  87  |   await expect(row(page,'ventral_skin')).toHaveAttribute('data-directory-action',hidden?'record':'guided');await row(page,'ventral_skin').click();const after=await evidence(page);
  88  |   expect(after.guided.slice(0,3)).toEqual(before.guided.slice(0,3));expect(after.notes).toEqual(before.notes);expect(after.confidence).toEqual(before.confidence);expect(after.explored).toEqual(before.explored);
  89  |   expect(after.verified).toEqual(before.verified);expect(after.scores).toEqual(before.scores);expect(after.scenario).toEqual(before.scenario);expect(after.procedures).toEqual(before.procedures);
  90  |   if(hidden){await expect(page.locator('#diss-guided-observation-check')).toHaveCount(0);await expect(page.locator('#diss-confidence-ventral_skin-1')).toBeFocused();}
  91  |   else{await expect(page.locator('#diss-guided-observation-check')).toBeVisible();expect(after.guided[3]).toBeTruthy();}
  92  | });
  93  | 
  94  | test('only current-layer structures reach the threshold and first completion survives further inspection and review',async({page})=>{
  95  |   const explored={'frog|heart':true,'frog|liver':true,'frog|unknown_saved_id':true,'sheepEye|cornea':true};
  96  |   await mount(page,{...saved,exploredOrgans:explored,organNotes:{},organConfidence:{},scenarioCompletedAt:0});await time(page,1000);await row(page,'ventral_skin').click();
  97  |   let state=await evidence(page);expect(state.scenario[2]).toBe(0);expect(state.explored).toEqual({...explored,'frog|ventral_skin':true});
  98  |   await back(page);await time(page,2000);await row(page,'tympanum').click();state=await evidence(page);expect(state.scenario[2]).toBe(2000);
  99  |   await back(page);await time(page,3000);await row(page,'nictitating').click();expect((await evidence(page)).scenario[2]).toBe(2000);
  100 |   await back(page);await time(page,4000);await row(page,'ventral_skin').click();expect((await evidence(page)).scenario[2]).toBe(2000);
  101 | });
  102 | 
  103 | for(const scenario of ['structure-trace','relationship-pathway']) test(`relationship tracing retains the first ${scenario} completion after its follow-up update`,async({page})=>{
  104 |   await mount(page,{...saved,workspaceMode:'advanced',activeLayer:'organs',anatomicalView:'internal',selectedOrgan:'heart',relationshipMode:true,procedureScenario:scenario,scenarioCompletedAt:0,exploredOrgans:{'frog|heart':true},organNotes:{'frog|heart':'Observed a chambered central structure.'},organConfidence:{'frog|heart':2},revealedLayers:{skin:true,muscle:true},procedureByLayer:{organs:complete}},1180);
> 105 |   const before=await evidence(page);await time(page,5000);const trace=page.getByRole('button',{name:'Trace next exposed connection',exact:true});await expect(trace).toBeEnabled();await trace.click();
      |                                                                                                                                                                      ^ Error: expect(locator).toBeEnabled() failed
  106 |   const after=await evidence(page);expect(after.scenario[2]).toBe(5000);expect(after.selected).not.toBe('heart');expect(after.notes).toEqual(before.notes);expect(after.confidence).toEqual(before.confidence);expect(after.procedures).toEqual(before.procedures);
  107 |   await time(page,6000);await trace.click();expect((await evidence(page)).scenario[2]).toBe(5000);
  108 | });
  109 | 
  110 | test('a real equivalent probe action keeps its first completion and reports the current-layer checkpoint',async({page})=>{
  111 |   const setup={...complete,probed:false,history:order.slice(0,-1),actionLog:complete.actionLog.slice(0,-1)};
  112 |   await mount(page,{...saved,workspaceMode:'advanced',activeLayer:'organs',anatomicalView:'internal',activeInstrument:'probe',techniquePanelOpen:true,scenarioCompletedAt:0,exploredOrgans:{'frog|heart':true},revealedLayers:{skin:true,muscle:true},procedureByLayer:{organs:setup}},1180);
  113 |   const before=await evidence(page);await time(page,7000);const action=page.locator('#diss-procedure-panel .diss-procedure__next');await expect(action).toContainText('Probe');await expect(action).toBeEnabled();await action.click();
  114 |   const after=await evidence(page);expect(after.scenario[2]).toBe(7000);expect(after.procedures.organs.probed).toBe(true);expect(after.procedures.organs.actionLog.length).toBe(before.procedures.organs.actionLog.length+1);
  115 |   expect(Object.keys(after.explored).filter(k=>after.explored[k])).toHaveLength(2);expect(after.notes).toEqual(before.notes);expect(after.confidence).toEqual(before.confidence);
  116 |   await expect(page.locator('[role="status"]').filter({hasText:'Scenario checkpoint: 100%.'}).first()).toBeVisible();
  117 | });
  118 | 
  119 | for(const prior of [false,true]) test(`ordinary canvas pointer ${prior?'review preserves an absent completion':'inspection records first completion once'}`,async({page})=>{
  120 |   await mount(page,{...saved,workspaceMode:'advanced',activeInstrument:'probe',visualRealism:'accessible',parallaxDepth:false,canvasZoom:1,canvasPanX:0,canvasPanY:0,labelMode:'hide',instructorRequiredStructures:1,scenarioCompletedAt:0,exploredOrgans:prior?{'frog|ventral_skin':true}:{},revealedLayers:{},procedureByLayer:{skin:complete}},1180);
  121 |   const before=await evidence(page),canvas=page.locator('[data-diss-canvas]');await canvas.scrollIntoViewIfNeeded();
  122 |   await page.waitForFunction(()=>{const c=document.querySelector('[data-diss-canvas]') as any;return c&&!c._cameraTransition;});
  123 |   const box=(await canvas.boundingBox())!;await time(page,8000);await page.mouse.click(box.x+box.width*.5,box.y+box.height*.58);
  124 |   const after=await evidence(page);expect(after.selected).toBe('ventral_skin');expect(after.explored).toEqual({'frog|ventral_skin':true});expect(after.scenario[2]).toBe(prior?0:8000);
  125 |   expect(after.notes).toEqual(before.notes);expect(after.confidence).toEqual(before.confidence);expect(after.procedures).toEqual(before.procedures);expect(after.verified).toEqual(before.verified);
  126 |   await time(page,9000);await page.mouse.click(box.x+box.width*.5,box.y+box.height*.58);expect((await evidence(page)).scenario[2]).toBe(prior?0:8000);
  127 | });
  128 | 
  129 | test('keyboard navigation distinguishes recovery from opening an existing record',async({page})=>{
  130 |   await mount(page,saved);const before=await evidence(page),search=page.locator('#diss-organ-search');await search.focus();await page.keyboard.press('ArrowDown');
  131 |   await expect(row(page,'dorsal_skin')).toBeFocused();await page.keyboard.press('Enter');expect(await evidence(page)).toEqual(before);
  132 |   await page.keyboard.press('ArrowDown');await expect(row(page,'ventral_skin')).toBeFocused();await page.keyboard.press('Enter');await expect(page.locator('#diss-confidence-ventral_skin-1')).toBeFocused();
  133 |   expect(await evidence(page)).toEqual({...before,selected:'ventral_skin'});
  134 | });
  135 | 
```