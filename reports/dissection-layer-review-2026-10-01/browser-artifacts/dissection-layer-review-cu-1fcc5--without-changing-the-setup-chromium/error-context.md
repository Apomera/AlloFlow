# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-layer-review.spec.ts >> current restricted recovery guidance focuses a usable control without changing the setup
- Location: tests\e2e\dissection-layer-review.spec.ts:128:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.diss-layer-review__next').getByRole('button', { name: 'Review tissue condition', exact: true })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('.diss-layer-review__next').getByRole('button', { name: 'Review tissue condition', exact: true })

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
  - paragraph: "Work through the specimen one clear action at a time. Current focus: Demonstrate technique."
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
  - text: Specimen 🐸 Frog (Rana) Layer 1 of 5 · Skin Structures viewed 0 of 37
- region "Begin the shallow ventral midline opening":
  - text: Step 3 of 6 Next best action · Demonstrate technique
  - heading "Begin the shallow ventral midline opening" [level=3]
  - paragraph: Your plan is confirmed. Choose the required instrument, perform the action on the specimen, then explain the observed response.
  - text: "🐸 Frog (Rana) 🟢 Skin · layer 1/5 Tool: Scalpel · Ready to act"
  - button "Choose the instrument"
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
  - region "Demonstrate your plan":
    - paragraph: Plan confirmed
    - heading "Demonstrate your plan" [level=3]
    - paragraph: Use Scalpel to begin the shallow ventral midline opening. Perform the action on the specimen, then explain the result.
    - text: ✓ 1 Predict Done 2 Perform Current 3 Explain Upcoming 2 Technique controls also offer a motor-neutral action once readiness checks pass.
    - button "Prepare Scalpel"
    - button "Go to specimen"
  - region "🐸 Frog (Rana) · Skin":
    - text: Interactive specimen
    - heading "🐸 Frog (Rana) · Skin" [level=3]
    - text: "Selected: Ventral Skin"
    - group:
      - strong: View & orientation
      - text: Ventral · Skin +
    - 'group "Current action: Begin the shallow ventral midline opening. Scalpel · Ready to act. Workflow step 3 of 6"':
      - strong: Next · Demonstrate technique
      - text: Scalpel · Ready to act Workflow 3/6
    - group:
      - strong: Field monitor
      - text: Adjust before contact Restore surface moisture before further manipulation.
    - 'group "Current pointer mode: Later step. Current protocol step: Begin the shallow ventral midline opening. Use Scalpel next."':
      - strong: Pointer mode ? Later step
      - text: "Current protocol step: Begin the shallow ventral midline opening. Use Scalpel next."
    - text: Frog (Rana) interactive specimen · Skin layer, ventral view
    - region "Specimen canvas description":
      - heading "Specimen canvas description" [level=4]
      - paragraph: Every canvas selection and drag action has a keyboard or button alternative. Use the structure directory for equivalent anatomical descriptions, the technique action button instead of drawing a stroke, the pin action button instead of dragging a pin, the probe action button instead of tracing a structure, and the pan controls instead of dragging a zoomed view. When the depth atlas is enabled, surface landmarks use circles, mid-depth landmarks use diamonds, and deep landmarks use double rings.
      - paragraph: "Frog (Rana) virtual dissection. Specimen-specific procedure: Frog ventral midline access; recommended view ventral; access route shallow ventral midline corridor; protected landmarks Heart (3-chamber), Liver (3 lobes), Lungs. Current view: ventral, standard condition, Skin layer. Progressive exposure: Emerging anatomy, 38 percent; decision quality 68 percent. Observation field: Limited observation field, 45 percent; limiting factor: Access width. Surface model: moist chromatophore surface. Surface microtexture uses chromatophores detail aligned to overhead illumination, with sheen adjusted for 30 percent moisture and standard condition. Tool contact response: elastic skin. Light direction: overhead. Illumination 68 percent: Balanced illumination; glare risk 6 percent. Focus isolation on. Tissue relief on and responsive to the inspection light. Depth atlas off. Selected and hovered structures use a labeled depth footprint with front and back edges, visibility-specific line styles, and boundary-attached relationship paths. Relationship types use distinct line patterns and moving marker shapes, with fixed markers when motion is reduced. Tubular, lobed, chambered, layered, and compact structure classes use distinct contours, internal patterns, and text labels. Anatomical orientation axis uses a circle for anterior and a diamond for posterior; current and target views are stated in text. View and layer navigation uses a labeled orientation sweep with circle start and diamond target markers, plus concentric depth rings for deeper or superficial movement; reduced motion switches instantly and uses text announcements. Depth motion off. 3 directly visible structures. Active instrument: forceps. Action readiness: Later step, 76 percent. Current protocol step: Begin the shallow ventral midline opening. Use Scalpel next.. Directional contact footprint feedback is active. Engaged instrument tips use foreground tissue lips and paired depth notches to show partial insertion and opening-edge occlusion. Guided anatomical access corridor active; circle marks start and diamond marks finish. Directional target guidance uses a dashed arrow, labeled endpoint, and shape-coded reticle when an instrument is spatially misaligned. Localized action outcomes use a one-shot check or warning symbol with the changed tissue metric. Tissue opening, retraction, stabilization, hydration, and risk metrics transition spatially after each action; Undo reverses openings, retraction, pin placement, hydration, wick evidence, and probe traces; reduced motion snaps to the final state. Three-dimensional instrument pitch feedback is active. Light-aware instrument elevation feedback is active. Equivalent keyboard and button actions include an instrument approach, contact, and release replay. Recorded attempt replay progressively traces pressure with line width and states path alignment in text and shape. Direct forceps press-drag-release manipulation shows live lift direction, safe range, calibrated grip, speed, control, slip risk, and excess tension with text and geometry; the technique action button remains equivalent. Live pin stability preview shows endpoint spacing, calibrated angle, insertion depth, and flap tension with text and geometry. Direct pin press-drag-release placement adds shaft alignment, insertion travel, safe depth, and control feedback. Live probe palpation preview shows calibrated pressure, material resistance, anatomical depth, and tissue deformation with text and shape. Direct probe press-drag-release tracing adds contact coverage, alignment, resistance, deformation, and control feedback. Direct dropper press-drag-release hydration adds contact coverage, flow alignment, moisture, dose, and pooling feedback. Direct wick press-drag-release recovery adds pool-edge alignment, contact coverage, recovery distance, and control feedback. Live dropper spread forecast shows dose count, organism-specific flow direction, current saturation, and pooling risk with text and geometry. Absorbent-wick feedback shows pool-edge targeting, fluid recovery, and a localized balanced-film marker with text and cross-hatched geometry. Guided procedure handoff cue connects the next required instrument to its anatomical target and 6-step progress rail with text, shape, and line style. Persistent localized technique evidence maps edge stress, grip compression, anchor tension, probe pressure, and saline pooling to actual contact locations with text and distinct geometry; direct wick recovery maps pool-edge contact, recovery distance, and control. Press the opened tissue edge, drag away while monitoring lift and tension, then release inside the solid safe envelope; the equivalent technique action button remains available. Occluded structures remain available in the structure directory."
    - application "Frog (Rana) interactive specimen · Skin layer, ventral view"
    - button "Zoom out canvas": ➖
    - text: 100%
    - button "Zoom in canvas": ➕
    - button "Frame selected structure Ventral Skin": ◎ Frame Ventral Skin
    - paragraph: Every canvas action has a keyboard or button alternative. The specimen canvas description lists them.
    - status: Tool Scalpel · Ready to act. Scalpel is ready to begin the shallow ventral midline opening. Selected Ventral Skin in the Skin layer. Lighter, thinner ventral surface.
    - group: Evidence notebook · 0/6 frames
    - region "Layer review":
      - text: Skin
      - heading "Layer review" [level=3]
      - text: In progress
      - status: "Latest action: Orientation check 8"
      - heading "What you did" [level=4]
      - paragraph: 1 of 6 protocol actions complete. 1 of 6 actions have verified plans and explanations.
      - paragraph:
        - strong: ORIENTATION RECORDED
        - text: . The recommended view and protected landmarks were checked before contact.
      - heading "What changed" [level=4]
      - text: Clarity
      - strong: 77 → 82
      - text: +5 points · Improved Exposure
      - strong: 8 → 8
      - text: Unchanged Stability
      - strong: 19 → 19
      - text: Unchanged Risk
      - strong: 20 → 17
      - text: "-3 points · Improved"
      - paragraph: Values are out of 100. Lower risk is better.
      - button "Replay reviewed action"
      - heading "Try next" [level=4]
      - text: Current setup
      - paragraph: Moisture is 30/100. Prepare a controlled saline dose before further handling.
      - button "Review Dropper"
      - group: Action history8 saved records
    - group "Technique practice · step 2 of 6":
      - strong: Technique controls
      - text: Begin the shallow ventral midline opening
  - complementary "Structure directory and lab notes":
    - link "Return to interactive specimen":
      - /url: "#diss-canvas"
    - group: Review observations · 0 inspected
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
        - text: Keep this observation.
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
      - group "Draft check":
        - strong: Draft check
        - list "Writing and confidence status":
          - listitem: Draft present · review needed
          - listitem: "Confidence: Somewhat sure"
        - paragraph: Text and confidence are recorded separately. Their presence does not verify the explanation or earn an assessment score.
        - group: Review your explanation
      - group: "Optional challenge: test your identification ＋"
      - strong: "Your record:"
      - text: Not yet inspected
      - button "🤖 AI Explain"
      - button "Copy Ventral Skin information to clipboard": 📋 Copy
    - text: Layer Progress 🟢 Skin 💪 Muscle 🫁 Organs 🦴 Skeleton ⚡ Nervous
    - paragraph: Classic vertebrate — 3-chambered heart, cutaneous respiration, metamorphosis.
    - paragraph: "Comparative learning model: specimen observations and human clinical connections are labeled separately. Anatomy varies by species, age, preservation, and individual."
    - group: Biology fact ＋
    - text: 📊 Learning evidence 1%
    - 'progressbar "Observation: structures viewed 0 of 37"'
    - text: "Observation: 0 of 37 structures viewed Technique 3%"
    - progressbar "Technique evidence"
    - text: Observation 0%
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
```

# Test source

```ts
  33  | async function openHistory(page: Page) {
  34  |   const history = page.locator('.diss-layer-review__history');
  35  |   if (!(await history.evaluate((node: HTMLDetailsElement) => node.open))) await history.locator('summary').click();
  36  | }
  37  | async function readable(page: Page, name: string, available: number, large = false) {
  38  |   await openHistory(page);
  39  |   const panel = page.locator('#diss-layer-review');
  40  |   await panel.screenshot({ path: `${out}/${name}.png`, style: captureStyle });
  41  |   const metrics = await panel.evaluate(node => ({ width: node.getBoundingClientRect().width, client: node.clientWidth, scroll: node.scrollWidth,
  42  |     targets: Array.from(node.querySelectorAll('button, summary')).map(el => ({ height: el.getBoundingClientRect().height, scroll: el.scrollWidth, client: el.clientWidth })),
  43  |     text: Array.from(node.querySelectorAll('h3,h4,p,span,small,strong,b,button,summary')).filter(el => !!el.getBoundingClientRect().height).map(el => ({ text: el.textContent, size: parseFloat(getComputedStyle(el).fontSize), clipped: el.scrollWidth > el.clientWidth + 1 })) }));
  44  |   await writeFile(`${out}/${name}-metrics.json`, JSON.stringify(metrics, null, 2));
  45  |   expect(metrics.width).toBeLessThanOrEqual(available); expect(metrics.scroll).toBeLessThanOrEqual(metrics.client + 1);
  46  |   for (const target of metrics.targets) { expect(target.height).toBeGreaterThanOrEqual(47.9); expect(target.scroll).toBeLessThanOrEqual(target.client + 1); }
  47  |   for (const text of metrics.text) { expect(text.size, text.text || '').toBeGreaterThanOrEqual(large ? 15.9 : 13.9); expect(text.clipped, text.text || '').toBe(false); }
  48  |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  49  |   const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-layer-review']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  50  |   await writeFile(`${out}/${name}-axe.json`, JSON.stringify(audit, null, 2));
  51  |   expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  52  | }
  53  | 
  54  | for (const { name, width, available, large, contrast, forced } of [
  55  |   { name: 'phone', width: 320, available: 320 }, { name: 'tablet', width: 768, available: 768 },
  56  |   { name: 'embedded-large', width: 1440, available: 320, large: true, contrast: true },
  57  |   { name: 'desktop', width: 1440, available: 1180 }, { name: 'forced-colors', width: 390, available: 390, forced: true },
  58  | ]) {
  59  |   test(`layer review ${name} is readable outside closed technique controls`, async ({ page }) => {
  60  |     const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  61  |     if (forced) await page.emulateMedia({ forcedColors: 'active' });
  62  |     await mount(page, { largeText: !!large, highContrast: !!contrast }, width, available);
  63  |     const before = await evidence(page);
  64  |     const panel = page.locator('#diss-layer-review');
  65  |     await expect(panel).toBeVisible(); await expect(page.locator('#diss-procedure-panel')).not.toHaveAttribute('open');
  66  |     await expect(panel).toHaveAttribute('data-review-state', 'Explanation needed');
  67  |     await expect(panel).toContainText('1 of 6 protocol actions complete. 0 of 6 actions have verified plans and explanations.');
  68  |     await readable(page, name, available, !!large);
  69  |     await expect(panel.locator('.diss-procedure__timeline-entry')).toHaveCount(8);
  70  |     await panel.locator('.diss-procedure__timeline-entry').first().focus();
  71  |     await panel.locator('.diss-procedure__timeline-entry').first().screenshot({ path: `${out}/${name}-focus.png` });
  72  |     expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
  73  |   });
  74  | }
  75  | 
  76  | test('history keyboard browsing is separate from selecting and replaying saved evidence', async ({ page }) => {
  77  |   await mount(page); await openHistory(page);
  78  |   const entries = page.locator('.diss-layer-review .diss-procedure__timeline-entry');
  79  |   const before = await evidence(page);
  80  |   await entries.first().focus();
  81  |   const prevented = await entries.first().evaluate(node => [
  82  |     { key: 'End', shiftKey: true }, { key: 'Home', ctrlKey: true }, { key: 'ArrowRight', altKey: true },
  83  |     { key: 'ArrowLeft', metaKey: true }, { key: 'End', isComposing: true }, { key: 'Home', keyCode: 229 },
  84  |   ].map(options => { const e = new KeyboardEvent('keydown', { ...options, bubbles: true, cancelable: true }); node.dispatchEvent(e); return e.defaultPrevented; }));
  85  |   expect(prevented).toEqual([false, false, false, false, false, false]);
  86  |   for (const [key, index] of [['End', 7], ['ArrowDown', 0], ['ArrowRight', 1], ['ArrowUp', 0], ['ArrowLeft', 7], ['Home', 0]] as const) {
  87  |     await page.keyboard.press(key); await expect(entries.nth(index)).toBeFocused();
  88  |     await expect(entries.last()).toHaveAttribute('aria-pressed', 'true'); expect(await evidence(page)).toEqual(before);
  89  |   }
  90  |   await page.keyboard.press('Enter');
  91  |   await expect(entries.first()).toHaveAttribute('aria-pressed', 'true'); await expect(entries.last()).toHaveAttribute('aria-pressed', 'false');
  92  |   await expect(page.locator('.diss-layer-review__selection')).toHaveText('Reviewing action: Orientation check 1');
  93  |   await expect(page.locator('.diss-layer-review__delta').first()).toContainText('70 → 75');
  94  |   await page.getByRole('button', { name: 'Replay reviewed action', exact: true }).click();
  95  |   await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureFeedback?.message)).toContain('Selected response replay started');
  96  |   expect(await evidence(page)).toEqual(before);
  97  |   await page.locator('#diss-layer-review').screenshot({ path: `${out}/selected-response.png`, style: captureStyle });
  98  | });
  99  | 
  100 | test('review is requested explicitly before work and never invents missing snapshot values', async ({ page }) => {
  101 |   await mount(page, { techniquePanelOpen: true }, 390, 390, {});
  102 |   await expect(page.locator('#diss-layer-review')).toHaveCount(0);
  103 |   await page.getByRole('button', { name: 'Review layer', exact: true }).click();
  104 |   await expect(page.locator('#diss-layer-review-title')).toBeFocused();
  105 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'In progress');
  106 |   await expect(page.locator('#diss-layer-review')).toContainText('0 of 6 protocol actions complete.');
  107 |   await expect(page.locator('.diss-layer-review__delta')).toHaveCount(0);
  108 |   await expect(page.locator('#diss-layer-review')).not.toContainText('Strength:');
  109 |   await harness.unmount(page);
  110 |   await mount(page, {}, 390, 390, { ...recorded, actionLog: [{ ...actions[0], tissueAfter: { clarity: 75 } }] });
  111 |   await expect(page.locator('.diss-layer-review__delta')).toHaveCount(0);
  112 |   await expect(page.locator('#diss-layer-review')).toContainText('No complete before-and-after tissue data was saved for this action.');
  113 | });
  114 | 
  115 | test('pending explanation takes priority and the shortcut only focuses the checkpoint', async ({ page }) => {
  116 |   await mount(page, { anatomicalView: 'dorsal' }); const before = await evidence(page);
  117 |   await page.getByRole('button', { name: 'Explain the response', exact: true }).click();
  118 |   await expect(page.locator('#diss-learning-check-title')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  119 | });
  120 | 
  121 | for (const { name, state, procedure, label, target } of [
  122 |   { name: 'view', state: { anatomicalView: 'dorsal' }, procedure: {}, label: 'Check view', target: '#diss-view-cycle' },
  123 |   { name: 'optics', state: { lensFocusDepth: 'deep', lensMagnification: 6 }, procedure: {}, label: 'Adjust optics', target: '#diss-view-tools' },
  124 |   { name: 'dry tissue', state: {}, procedure: { tissueState: { ...tissue, moisture: 30 } }, label: 'Review Dropper', target: '#diss-instrument-dropper' },
  125 |   { name: 'restricted recovery', state: { procedureScenario: 'restricted-tray' }, procedure: { tissueState: { ...tissue, moisture: 30 } }, label: 'Review tissue condition', target: '#diss-field-monitor-summary' },
  126 |   { name: 'calibration', state: { activeInstrument: 'scalpel', toolCalibration: { bladeAngle: 70 } }, procedure: {}, label: 'Adjust calibration', target: '#diss-calibration-range' },
  127 | ]) {
  128 |   test(`current ${name} guidance focuses a usable control without changing the setup`, async ({ page }) => {
  129 |     await mount(page, { ...state, selectedOrgan: 'ventral_skin', lensFocusDepth: 'surface', lensMagnification: 2, ...state }, 390, 390,
  130 |       { ...recorded, ...procedure, learningChecks: { inspect: { predictionCorrect: true, reflectionCorrect: true }, scalpel: { predictionCorrect: true } } });
  131 |     const before = await evidence(page);
  132 |     const shortcut = page.locator('.diss-layer-review__next').getByRole('button', { name: label, exact: true });
> 133 |     await expect(shortcut).toBeVisible(); await shortcut.click();
      |                            ^ Error: expect(locator).toBeVisible() failed
  134 |     await expect(page.locator(target)).toBeFocused(); expect(await evidence(page)).toEqual(before);
  135 |   });
  136 | }
  137 | 
  138 | test('completion still requires the final explanation', async ({ page }) => {
  139 |   const checks = Object.fromEntries(['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'].map(action => [action, { predictionCorrect: true, reflectionCorrect: action !== 'probe' }]));
  140 |   await mount(page, {}, 390, 390, { ...recorded, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .4, y: .3 }, { x: .6, y: .7 }], probed: true, learningChecks: checks });
  141 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Explanation needed');
  142 |   await expect(page.locator('#diss-layer-review')).toContainText('6 of 6 protocol actions complete. 5 of 6 actions have verified');
  143 |   await page.locator('#diss-learning-checkpoint .diss-learning-check__option').first().click();
  144 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal');
  145 |   const before = await evidence(page); await page.getByRole('button', { name: 'Review next action', exact: true }).click();
  146 |   await expect(page.locator('#diss-next-action-title')).toBeFocused(); expect(await evidence(page)).toEqual(before);
  147 | });
  148 | 
  149 | for (const practical of [false, true]) {
  150 |   test(`${practical ? 'timed practical' : 'quiz'} conceals reviews and preparation shortcuts`, async ({ page }) => {
  151 |     await mount(page, { quizMode: true, practicalMode: practical, practicalTimer: practical ? 300 : 0, practicalEndsAt: practical ? Date.now() + 300000 : 0, practicalTargetIds: ['ventral_skin', 'tympanum'], showProcedureDebrief: true, techniquePanelOpen: true });
  152 |     if (practical) expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.practicalMode)).toBe(true);
  153 |     await expect(page.locator('#diss-layer-review')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Review layer', exact: true })).toHaveCount(0);
  154 |   });
  155 | }
  156 | 
  157 | test('beginner completes a layer with explicit plans, supported actions, explanations, notes and assessment', async ({ page }) => {
  158 |   test.setTimeout(240000);
  159 |   const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  160 |   await mount(page, { activeInstrument: 'probe', organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 0, quizTotal: 0, workspaceMode: 'essentials' }, 1180, 1180, {});
  161 |   const planChoices = [0, 1, 2, 0, 1, 2]; const reflections = [1, 0, 0, 1, 2, 0];
  162 |   const actionNames = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  163 |   for (let i = 0; i < actionNames.length; i++) {
  164 |     const checkpoint = page.locator('#diss-learning-checkpoint');
  165 |     await expect(checkpoint).toHaveAttribute('data-learning-action', actionNames[i]); await expect(checkpoint).toHaveAttribute('data-phase', 'predict');
  166 |     await checkpoint.locator('.diss-learning-check__option').nth(planChoices[i]).click(); await expect(checkpoint).toHaveAttribute('data-phase', 'perform');
  167 |     await checkpoint.getByRole('button', { name: /^Prepare / }).click();
  168 |     const tool = actionNames[i] === 'inspect' ? 'probe' : actionNames[i];
  169 |     await expect(page.locator(`#diss-instrument-${tool}`)).toBeFocused(); await page.locator(`#diss-instrument-${tool}`).click();
  170 |     const equivalent = page.locator('#diss-procedure-panel .diss-procedure__next');
  171 |     await expect(equivalent).toBeEnabled(); await equivalent.click();
  172 |     if (tool === 'pin') { await expect(checkpoint).toHaveAttribute('data-phase', 'perform'); await equivalent.click(); }
  173 |     await expect(checkpoint).toHaveAttribute('data-phase', 'reflect');
  174 |     await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Explanation needed');
  175 |     await checkpoint.locator('.diss-learning-check__option').nth(reflections[i]).click();
  176 |   }
  177 |   await expect(page.locator('#diss-layer-review')).toHaveAttribute('data-review-state', 'Ready to reveal');
  178 |   await expect(page.locator('#diss-layer-review')).toContainText('6 of 6 actions have verified plans and explanations.');
  179 |   const physical = await page.evaluate(() => (window as any).__ctx.toolData.dissection.procedureByLayer.skin);
  180 |   expect(physical.actionLog.length).toBe(7); expect(physical.actionLog.every((a: any) => a.assistance === 'motor-neutral')).toBe(true);
  181 |   await page.locator('#diss-canvas').focus(); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
  182 |   const note = page.locator('.diss-evidence-note'); await expect(note).toBeVisible();
  183 |   await note.fill('I observed a surface boundary on the ventral skin. Its position agrees with the orientation landmarks.');
  184 |   await page.getByRole('radio', { name: 'Confidence 2 of 3: Somewhat sure', exact: true }).check();
  185 |   const saved = await evidence(page); expect(Object.values(saved.notes)).toContain('I observed a surface boundary on the ventral skin. Its position agrees with the orientation landmarks.');
  186 |   await page.getByRole('button', { name: /^Assess understanding/ }).click();
  187 |   await expect(page.locator('#diss-quiz-panel')).toBeVisible(); await expect(page.locator('#diss-layer-review')).toHaveCount(0);
  188 |   await page.locator('#diss-quiz-panel .diss-quiz-option').first().click();
  189 |   const next = page.locator('#diss-quiz-panel').getByRole('button', { name: /^Next Question/ });
  190 |   if (!(await next.isVisible())) await page.locator('#diss-quiz-panel').getByRole('button', { name: /Show answer|Reveal answer/ }).click();
  191 |   await next.click(); await expect(page.locator('#diss-quiz-panel')).toBeFocused();
  192 |   const final = await evidence(page); expect(final.notes).toEqual(saved.notes); expect(final.confidence).toEqual(saved.confidence); expect(final.procedures).toEqual(saved.procedures);
  193 |   await page.locator('#diss-quiz-panel').screenshot({ path: `${out}/journey-assessment.png`, style: captureStyle });
  194 |   await writeFile(`${out}/journey-state.json`, JSON.stringify(final, null, 2)); expect(errors).toEqual([]);
  195 | });
  196 | 
```