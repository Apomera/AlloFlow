# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-next-action-clarity.spec.ts >> planning checkpoints retain one action prompt
- Location: ..\..\..\Documents\Codex\2026-09-29\please-keep-improving-interactivity-engagement-and\dissection-next-action-2026-10-04\tests\dissection-next-action-clarity.spec.ts:41:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-dissection-learning-check]')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('[data-dissection-learning-check]')

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
  - group "Current lab status": Specimen 🐸 Frog (Rana) Layer 1 of 5 · Skin Structures viewed 0 of 37
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
  - region "🐸 Frog (Rana) · Skin":
    - text: Interactive specimen
    - heading "🐸 Frog (Rana) · Skin" [level=3]
    - text: Limited observation field · 44%
    - group:
      - strong: View & orientation
      - text: Ventral · Skin +
    - 'group "Current action: What must be confirmed before any instrument contacts this specimen?. Predict before contact. Workflow step 1 of 6"':
      - strong: Next · Predict before contact
      - text: Workflow 1/6
    - group:
      - strong: Field monitor
      - text: Limited observation field Exposure and tissue-response details
    - 'group "Current pointer mode: Prediction required. Complete the prediction checkpoint before this instrument can contact the specimen."':
      - strong: Pointer mode ? Prediction required
      - text: Complete the prediction checkpoint before this instrument can contact the specimen.
    - text: Frog (Rana) interactive specimen · Skin layer, ventral view
    - region "Specimen canvas description":
      - heading "Specimen canvas description" [level=4]
      - paragraph: Every canvas selection and drag action has a keyboard or button alternative. Use the structure directory for equivalent anatomical descriptions, the technique action button instead of drawing a stroke, the pin action button instead of dragging a pin, the probe action button instead of tracing a structure, and the pan controls instead of dragging a zoomed view. When the depth atlas is enabled, surface landmarks use circles, mid-depth landmarks use diamonds, and deep landmarks use double rings.
      - paragraph: "Frog (Rana) virtual dissection. Specimen-specific procedure: Frog ventral midline access; recommended view ventral; access route shallow ventral midline corridor; protected landmarks Heart (3-chamber), Liver (3 lobes), Lungs. Current view: ventral, standard condition, Skin layer. Progressive exposure: Covered anatomy, 32 percent; decision quality 64 percent. Observation field: Limited observation field, 44 percent; limiting factor: Access width. Surface model: moist chromatophore surface. Surface microtexture uses chromatophores detail aligned to overhead illumination, with sheen adjusted for 68 percent moisture and standard condition. Tool contact response: elastic skin. Light direction: overhead. Illumination 68 percent: Balanced illumination; glare risk 6 percent. Focus isolation on. Tissue relief on and responsive to the inspection light. Depth atlas off. Selected and hovered structures use a labeled depth footprint with front and back edges, visibility-specific line styles, and boundary-attached relationship paths. Relationship types use distinct line patterns and moving marker shapes, with fixed markers when motion is reduced. Tubular, lobed, chambered, layered, and compact structure classes use distinct contours, internal patterns, and text labels. Anatomical orientation axis uses a circle for anterior and a diamond for posterior; current and target views are stated in text. View and layer navigation uses a labeled orientation sweep with circle start and diamond target markers, plus concentric depth rings for deeper or superficial movement; reduced motion switches instantly and uses text announcements. Depth motion off. 3 directly visible structures. Active instrument: probe. Action readiness: Prediction required, 80 percent. Complete the prediction checkpoint before this instrument can contact the specimen.. Directional contact footprint feedback is active. Engaged instrument tips use foreground tissue lips and paired depth notches to show partial insertion and opening-edge occlusion. Guided anatomical access corridor active; circle marks start and diamond marks finish. Directional target guidance uses a dashed arrow, labeled endpoint, and shape-coded reticle when an instrument is spatially misaligned. Localized action outcomes use a one-shot check or warning symbol with the changed tissue metric. Tissue opening, retraction, stabilization, hydration, and risk metrics transition spatially after each action; Undo reverses openings, retraction, pin placement, hydration, wick evidence, and probe traces; reduced motion snaps to the final state. Three-dimensional instrument pitch feedback is active. Light-aware instrument elevation feedback is active. Equivalent keyboard and button actions include an instrument approach, contact, and release replay. Recorded attempt replay progressively traces pressure with line width and states path alignment in text and shape. Direct forceps press-drag-release manipulation shows live lift direction, safe range, calibrated grip, speed, control, slip risk, and excess tension with text and geometry; the technique action button remains equivalent. Live pin stability preview shows endpoint spacing, calibrated angle, insertion depth, and flap tension with text and geometry. Direct pin press-drag-release placement adds shaft alignment, insertion travel, safe depth, and control feedback. Live probe palpation preview shows calibrated pressure, material resistance, anatomical depth, and tissue deformation with text and shape. Direct probe press-drag-release tracing adds contact coverage, alignment, resistance, deformation, and control feedback. Direct dropper press-drag-release hydration adds contact coverage, flow alignment, moisture, dose, and pooling feedback. Direct wick press-drag-release recovery adds pool-edge alignment, contact coverage, recovery distance, and control feedback. Live dropper spread forecast shows dose count, organism-specific flow direction, current saturation, and pooling risk with text and geometry. Absorbent-wick feedback shows pool-edge targeting, fluid recovery, and a localized balanced-film marker with text and cross-hatched geometry. Guided procedure handoff cue connects the next required instrument to its anatomical target and 6-step progress rail with text, shape, and line style. Persistent localized technique evidence maps edge stress, grip compression, anchor tension, probe pressure, and saline pooling to actual contact locations with text and distinct geometry; direct wick recovery maps pool-edge contact, recovery distance, and control. Press a visible structure, trace a short path while monitoring pressure, resistance, and contact, then release when controlled; the equivalent technique action button remains available. Occluded structures remain available in the structure directory."
    - application "Frog (Rana) interactive specimen · Skin layer, ventral view"
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
    - group: Review observations · 0 inspected
    - region "🟢 Skin structures (4)":
      - heading "🟢 Skin structures (4)" [level=3]
      - text: Find a structure
      - textbox "Find a structure":
        - /placeholder: Search names or functions…
      - paragraph: Down arrow moves to results. Use Up and Down to browse; Enter activates a result. Escape clears search and filters.
      - group "Filter structures by learning progress":
        - button "All structures, 4 structures" [pressed]: All structures 4
        - button "To inspect, 4 structures": To inspect 4
        - button "Finish records, 0 structures": Finish records 0
        - button "Recorded, 0 structures": Recorded 0
      - paragraph: Filters apply to this layer. Finish records shows missing notes or confidence ratings. Recorded tracks completed notes and confidence; understanding is checked separately.
      - status: 4 structures available in Skin.
      - region "Directory results":
        - button "Dorsal Skin, Show recovery guidance, not currently visible; preview only" [disabled]: Dorsal Skin Not yet inspected
        - button "Ventral Skin, Inspect structure, not yet viewed": Ventral Skin Not yet inspected
        - button "Tympanic Membrane, Inspect structure, not yet viewed": Tympanic Membrane Not yet inspected
        - button "Nictitating Membrane, Inspect structure, not yet viewed": Nictitating Membrane Not yet inspected
    - text: Layer Progress 🟢 Skin 💪 Muscle 🫁 Organs 🦴 Skeleton ⚡ Nervous
    - paragraph: Classic vertebrate — 3-chambered heart, cutaneous respiration, metamorphosis.
    - paragraph: "Comparative learning model: specimen observations and human clinical connections are labeled separately. Anatomy varies by species, age, preservation, and individual."
    - group: Biology fact ＋
    - text: 📊 Learning evidence 4%
    - 'progressbar "Observation: structures viewed 0 of 37"'
    - text: "Observation: 0 of 37 structures viewed Technique 0%"
    - progressbar "Technique evidence"
    - text: Observation 0%
    - progressbar "Observation evidence"
    - text: Evidence 0%
    - progressbar "Evidence evidence"
    - text: Understanding 17%
    - progressbar "Understanding evidence"
    - text: 1/2 guided identifications verified · 0/37 evidence records · completed first-attempt assessment 0/0 Practice in progress Continue the investigation; the log distinguishes viewing from verified understanding.
    - button "Copy practice log to clipboard": Copy practice log
    - group: Specimen stats ＋
    - group:
      - strong: Learning objectives
      - text: Progress from your lab evidence ＋
    - group: Key terms ＋
```

# Test source

```ts
  1  | import { test, expect, type Page, type Locator } from '@playwright/test';
  2  | import { mkdir, writeFile } from 'node:fs/promises';
  3  | import { GlHarness } from 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/helpers/stem_gl_harness';
  4  | 
  5  | const out = process.env.NEXT_OUTPUT || 'reports/dissection-next-action-clarity-2026-10-04';
  6  | const baseline = process.env.NEXT_BASELINE === '1';
  7  | const harness = new GlHarness({toolFile:'stem_lab/stem_tool_dissection.js',toolId:'dissection',width:1180,height:900,layout:'document',appStyles:true,preScripts:['stem_lab/stem_lab_module.js']});
  8  | const tissue = {moisture:67,tension:52,exposure:87,trauma:0,clarity:91,stability:84,risk:16,salineDrops:0,variantId:'firm',variantLabel:'Firm preservation',lastAction:'probe',lastUpdatedAt:100,consequences:[]};
  9  | const order = ['inspect','scalpel','scissors','forceps','pin','probe'];
  10 | const complete = {tissueState:tissue,inspected:true,incisionStarted:true,incisionExtended:true,retracted:true,pins:[{x:.45,y:.3},{x:.55,y:.8}],probed:true,history:order,actionLog:order.map((action,i)=>({action,at:100+i,label:action,inputType:'motor-neutral',assistance:'motor-neutral',tissueBefore:tissue,tissueAfter:tissue})),learningChecks:Object.fromEntries(order.map(action=>[action,{predictionCorrect:true,reflectionCorrect:true}]))};
  11 | const initial = {specimen:'frog',_dissLoadedSpec:'frog',activeLayer:'skin',anatomicalView:'ventral',activeInstrument:'probe',selectedOrgan:null,revealedLayers:{skin:true},procedureByLayer:{skin:complete},exploredOrgans:{'frog|nictitating':true},organNotes:{'frog|nictitating':'A transparent protective membrane.'},organConfidence:{'frog|nictitating':3},verifiedIdentifications:{'frog|nictitating':{status:'verified',at:88}},quizScore:1,quizTotal:2,workspaceMode:'essentials',reducedMotion:true,soundEnabled:false,sceneDetail:false};
  12 | 
  13 | test.describe.configure({retries:0}); test.use({video:'off'});
  14 | test.beforeAll(async()=>{await harness.start();await mkdir(out,{recursive:true});});
  15 | test.afterAll(async()=>{await harness.stop();});
  16 | test.afterEach(async({page})=>{if(await page.evaluate(()=>typeof(window as any).__unmount==='function'))await harness.unmount(page);});
  17 | async function mount(page:Page,state:any={},width=320,available=width){await page.setViewportSize({width,height:1000});await harness.mount(page,{dissection:{...initial,...state}},undefined,{expectCanvas:false});await page.evaluate(()=>{const m=document.querySelector('meta[name="viewport"]')||document.head.appendChild(document.createElement('meta'));m.setAttribute('name','viewport');m.setAttribute('content','width=device-width, initial-scale=1');});await page.addStyleTag({content:`#wrap {width:100%!important;max-width:${available}px;}`});}
  18 | const card=(page:Page)=>page.locator('[data-dissection-next-action]');
  19 | async function proof(page:Page){return page.evaluate(()=>{const d=(window as any).__ctx.toolData.dissection;return {specimen:d.specimen,layer:d.activeLayer,view:d.anatomicalView,instrument:d.activeInstrument,notes:d.organNotes,confidence:d.organConfidence,explored:d.exploredOrgans,verified:d.verifiedIdentifications,revealed:d.revealedLayers,procedures:d.procedureByLayer,calibration:d.toolCalibration,scores:[d.quizScore,d.quizTotal],guided:[d.guidedMode,d.guidedStep,d.guidedTargetIds,d.guidedObservationPending],assessment:[d.quizMode,d.quizComplete,d.quizIdx,d.quizFirstAttemptScore,d.quizFirstAttemptTotal,d.quizSupportedCount,d.assessmentCompletedAt]};});}
  20 | async function inventory(p:Locator){return p.evaluate(el=>({action:el.getAttribute('data-next-action'),tone:el.getAttribute('data-tone'),step:el.querySelector('.diss-next-action__step')?.textContent,stepName:el.querySelector('.diss-next-action__step')?.getAttribute('aria-label'),phase:el.querySelector('.diss-next-action__eyebrow')?.textContent,title:el.querySelector('h3')?.textContent,prose:Array.from(el.querySelectorAll('p')).map(n=>n.textContent),meta:Array.from(el.querySelectorAll('.diss-next-action__meta span')).map(n=>n.textContent),buttons:Array.from(el.querySelectorAll('button')).map(n=>({text:n.textContent,name:n.getAttribute('aria-label'),disabled:n.disabled}))}));}
  21 | async function metrics(p:Locator){return p.evaluate(el=>{const s=getComputedStyle(el);return {width:el.getBoundingClientRect().width,client:el.clientWidth,scroll:el.scrollWidth,position:s.position,columns:s.gridTemplateColumns.split(' ').length,text:Array.from(el.querySelectorAll('h3,p,.diss-next-action__step,.diss-next-action__eyebrow,.diss-next-action__meta,.diss-next-action__meta span')).map(n=>{const s=getComputedStyle(n);return {label:n.textContent,font:parseFloat(s.fontSize),opacity:parseFloat(s.opacity),clipped:n.scrollWidth>n.clientWidth+1};}),buttons:Array.from(el.querySelectorAll('button')).map(n=>{const s=getComputedStyle(n);return {label:n.textContent,font:parseFloat(s.fontSize),height:n.getBoundingClientRect().height,clipped:n.scrollWidth>n.clientWidth+1,nowrap:s.whiteSpace==='nowrap',border:parseFloat(s.borderTopWidth)};})};});}
  22 | async function readable(p:Locator,available:number,large=false){const m=await metrics(p);expect(m.width).toBeLessThanOrEqual(available+1);expect(m.scroll).toBeLessThanOrEqual(m.client+1);expect(m.columns).toBe(available<=520?1:available<=980?2:3);for(const t of m.text){expect(t.font,t.label||'').toBeGreaterThanOrEqual(large?15.9:13.9);expect(t.opacity).toBe(1);expect(t.clipped,t.label||'').toBe(false);}for(const b of m.buttons){expect(b.font).toBeGreaterThanOrEqual(15.9);expect(b.height).toBeGreaterThanOrEqual(47.9);expect(b.clipped,b.label||'').toBe(false);expect(b.nowrap).toBe(false);}return m;}
  23 | async function focusStyle(p:Locator){const s=await p.evaluate(el=>{const s=getComputedStyle(el);return {width:parseFloat(s.outlineWidth),offset:parseFloat(s.outlineOffset),style:s.outlineStyle,shadow:s.boxShadow};});expect(s.width).toBeGreaterThanOrEqual(2.9);expect(s.width+s.offset).toBeLessThanOrEqual(0);expect(s.style).toBe('solid');expect(s.shadow).toBe('none');return s;}
  24 | async function audit(page:Page,name:string){await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const a=await page.evaluate(async()=>(window as any).axe.run({include:[['[data-dissection-next-action]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));await writeFile(`${out}/${name}-axe.json`,JSON.stringify(a,null,2));expect(a.violations).toEqual([]);expect(a.incomplete.filter((r:any)=>r.id!=='color-contrast')).toEqual([]);}
  25 | const captureStyle='.diss-next-action {position:static!important;}';
  26 | for(const c of [{name:'phone',width:320,available:320},{name:'tablet',width:768,available:768},{name:'desktop',width:1440,available:1180},{name:'embedded-medium',width:1440,available:520},{name:'embedded-large',width:1440,available:320,large:true,contrast:true},{name:'forced-colors',width:390,available:390,forced:true}])test(`next action ${c.name} stays readable with intact study evidence`,async({page})=>{
  27 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));if(c.forced)await page.emulateMedia({forcedColors:'active'});
  28 |   await mount(page,{toolbarStudyOpen:true,largeText:!!c.large,highContrast:!!c.contrast},c.width,c.available);const p=card(page),before=await proof(page),items=await inventory(p),m=await metrics(p),prefix=baseline?'before':'after';await expect(p).toHaveAttribute('data-next-action','study-tools');
  29 |   await writeFile(`${out}/${prefix}-${c.name}-metrics.json`,JSON.stringify(m,null,2));await writeFile(`${out}/${prefix}-${c.name}-inventory.json`,JSON.stringify(items,null,2));await p.screenshot({path:`${out}/${prefix}-${c.name}.png`,style:captureStyle});if(baseline)return;
  30 |   await readable(p,c.available,!!c.large);await expect(p.getByRole('group',{name:'Current lab context',exact:true})).toBeVisible();await expect(p.getByRole('group',{name:'Workflow step 6 of 6',exact:true})).toBeVisible();
  31 |   const primary=p.getByRole('button',{name:'Choose a study activity',exact:true}),secondary=p.getByRole('button',{name:'View specimen',exact:true});await primary.focus();await focusStyle(primary);await p.screenshot({path:`${out}/focus-${c.name}.png`,style:captureStyle});await page.keyboard.press('Tab');await expect(secondary).toBeFocused();await focusStyle(secondary);await page.keyboard.press('Shift+Tab');await expect(primary).toBeFocused();expect(await proof(page)).toEqual(before);await audit(page,c.name);
  32 |   await page.keyboard.press('Enter');await expect(page.locator('#diss-study-tools')).toBeFocused();expect(await proof(page)).toEqual(before);await secondary.focus();await page.keyboard.press('Space');await expect(page.locator('#diss-canvas')).toBeFocused();expect(await proof(page)).toEqual(before);expect(await inventory(p)).toEqual(items);expect(errors).toEqual([]);
  33 | });
  34 | 
  35 | test('record action opens the missing note without writing evidence',async({page})=>{const ids=['dorsal_skin','ventral_skin','tympanum','nictitating'];await mount(page,{exploredOrgans:Object.fromEntries(ids.map(id=>['frog|'+id,true])),organNotes:Object.fromEntries(ids.slice(1).map(id=>['frog|'+id,'A preserved surface boundary.'])),organConfidence:Object.fromEntries(ids.slice(1).map(id=>['frog|'+id,2]))});const p=card(page),before=await proof(page);await expect(p).toHaveAttribute('data-next-action','evidence');await expect(p.locator('h3')).toHaveText('Complete the observation record for Dorsal Skin');await readable(p,320);await p.screenshot({path:`${out}/record.png`,style:captureStyle});await p.getByRole('button',{name:'Open observation record',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('#diss-note-dorsal_skin')).toBeFocused();expect(await proof(page)).toEqual(before);});
  36 | test('assessment summary action focuses first-attempt evidence without changing scores',async({page})=>{await mount(page,{quizMode:true,quizComplete:true,quizFirstAttemptScore:4,quizFirstAttemptTotal:5,quizSupportedCount:1,quizReviewQueue:['tympanum'],assessmentCompletedAt:123});const p=card(page),before=await proof(page);await expect(p).toHaveAttribute('data-next-action','assessment-summary');await readable(p,320);await p.screenshot({path:`${out}/assessment.png`,style:captureStyle});await p.getByRole('button',{name:'Go to assessment summary',exact:true}).focus();await page.keyboard.press('Space');await expect(page.locator('#diss-assessment-summary')).toBeFocused();expect(await proof(page)).toEqual(before);});
  37 | test('Guided evidence action focuses the pending check without advancing the route',async({page})=>{await mount(page,{guidedMode:true,guidedStep:0,guidedTargetIds:['ventral_skin','tympanum'],guidedObservationPending:'ventral_skin',exploredOrgans:{'frog|ventral_skin':true}});const p=card(page),before=await proof(page);await expect(p).toHaveAttribute('data-next-action','guided-observation');await readable(p,320);await p.screenshot({path:`${out}/guided.png`,style:captureStyle});await p.getByRole('button',{name:'Complete evidence check',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('#diss-guided-observation-check')).toBeFocused();expect(await proof(page)).toEqual(before);});
  38 | const readyProcedure={tissueState:tissue,inspected:true,history:['inspect'],learningChecks:{inspect:{predictionCorrect:true,reflectionCorrect:true},scalpel:{predictionCorrect:true}}};
  39 | for(const caution of [false,true])test(`next action ${caution?'setup':'procedure'} focuses its destination without performing a technique`,async({page})=>{await mount(page,{revealedLayers:{},procedureByLayer:{skin:readyProcedure},activeInstrument:'scalpel',anatomicalView:caution?'dorsal':'ventral',lensFocusDepth:'surface',lensMagnification:2,bladeAngle:caution?70:30});const p=card(page),before=await proof(page);await expect(p).toHaveAttribute('data-next-action',caution?'prepare':'procedure');await readable(p,320);await p.screenshot({path:`${out}/${caution?'setup':'procedure'}.png`,style:captureStyle});await p.locator('.diss-next-action__primary').focus();await page.keyboard.press('Enter');await expect(page.locator(caution?'#diss-instrument-scalpel':'#diss-canvas')).toBeFocused();expect(await proof(page)).toEqual(before);});
  40 | test('resizing and text spacing retain focus and full action labels',async({page})=>{await mount(page,{toolbarStudyOpen:true,largeText:true},1440,1180);const p=card(page),primary=p.locator('.diss-next-action__primary'),before=await proof(page),items=await inventory(p);await primary.focus();expect((await metrics(p)).position).toBe('sticky');await page.addStyleTag({content:'#wrap {max-width:320px!important;} .diss-next-action :is(h3,p,span,button) {letter-spacing:.12em!important;word-spacing:.16em!important;line-height:1.5!important;}'});await expect(primary).toBeFocused();expect((await readable(p,320,true)).position).toBe('static');await focusStyle(primary);const title=p.locator('h3');await title.focus();await focusStyle(title);expect(await proof(page)).toEqual(before);expect(await inventory(p)).toEqual(items);await p.screenshot({path:`${out}/text-spacing.png`,style:captureStyle});});
> 41 | test('planning checkpoints retain one action prompt',async({page})=>{await mount(page,{revealedLayers:{},procedureByLayer:{},exploredOrgans:{}});await expect(page.locator('[data-dissection-learning-check]')).toBeVisible();await expect(card(page)).toHaveCount(0);});
     |                                                                                                                                                                                                                 ^ Error: expect(locator).toBeVisible() failed
  42 | 
```