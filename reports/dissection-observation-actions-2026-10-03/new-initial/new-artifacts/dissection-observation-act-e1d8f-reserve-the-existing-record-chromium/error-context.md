# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-observation-actions.spec.ts >> observation tasks tablet are readable and preserve the existing record
- Location: tests\e2e\dissection-observation-actions.spec.ts:40:320

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 47.9
Received:    44.46875
```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test';
  2  | import { mkdir, writeFile } from 'node:fs/promises';
  3  | import { GlHarness } from './helpers/stem_gl_harness';
  4  | 
  5  | const out = 'reports/dissection-observation-actions-2026-10-03';
  6  | const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 900, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
  7  | const tissue = { moisture: 67, tension: 52, exposure: 87, trauma: 0, clarity: 91, stability: 84, risk: 16, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'probe', lastUpdatedAt: 100, consequences: [] };
  8  | const order = ['inspect', 'scalpel', 'scissors', 'forceps', 'pin', 'probe'];
  9  | const complete = { tissueState: tissue, inspected: true, incisionStarted: true, incisionExtended: true, retracted: true, pins: [{ x: .45, y: .3 }, { x: .55, y: .8 }], probed: true, history: order, actionLog: order.map((action, i) => ({ action, at: 100 + i, label: action, inputType: 'motor-neutral', assistance: 'motor-neutral', tissueBefore: tissue, tissueAfter: tissue })), learningChecks: Object.fromEntries(order.map(action => [action, { predictionCorrect: true, reflectionCorrect: true }])) };
  10 | const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, organSearch: '', directoryFilter: 'all', revealedLayers: {}, exploredOrgans: {}, organNotes: {}, organConfidence: {}, verifiedIdentifications: {}, quizScore: 1, quizTotal: 2, workspaceMode: 'essentials', techniquePanelOpen: false, reducedMotion: true, soundEnabled: false, sceneDetail: false };
  11 | test.describe.configure({ retries: 0 });
  12 | test.use({ video: 'off' });
  13 | test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
  14 | test.afterAll(async () => { await harness.stop(); });
  15 | test.afterEach(async ({ page }) => { if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page); });
  16 | 
  17 | async function mount(page: Page, state: any = {}, width = 390, available = width) {
  18 |   await page.setViewportSize({ width, height: 1000 });
  19 |   await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: complete }, ...state } }, undefined, { expectCanvas: false });
  20 |   await page.evaluate(() => {
  21 |     const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta'));
  22 |     meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1');
  23 |   });
  24 |   await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${available}px;}` });
  25 | }
  26 | async function evidence(page: Page) {
  27 |   return page.evaluate(() => {
  28 |     const d = (window as any).__ctx.toolData.dissection;
  29 |     return { notes: d.organNotes, confidence: d.organConfidence, explored: d.exploredOrgans, verified: d.verifiedIdentifications, scores: [d.quizScore, d.quizTotal], revealed: d.revealedLayers, selected: d.selectedOrgan, layer: d.activeLayer, view: d.anatomicalView, instrument: d.activeInstrument, calibration: d.toolCalibration, procedures: d.procedureByLayer, scenario: [d.procedureScenario, d.scenarioStartedAt, d.scenarioCompletedAt], guided: [d.guidedMode, d.guidedStep, d.guidedTargetIds, d.guidedObservationPending] };
  30 |   });
  31 | }
  32 | const context = (page: Page) => page.locator('[data-directory-context]');
  33 | const result = (page: Page, id = 'dorsal_skin') => page.locator('#diss-organ-' + id);
  34 | 
  35 | const saved={exploredOrgans:{'frog|dorsal_skin':true,'frog|ventral_skin':true,'frog|tympanum':true,'frog|nictitating':true},organNotes:{'frog|dorsal_skin':'I observed a surface feature and checked its location.','frog|ventral_skin':'   ','frog|nictitating':'I observed a membrane near the eye.'},organConfidence:{'frog|ventral_skin':2,'frog|tympanum':'invalid','frog|nictitating':1},verifiedIdentifications:{'frog|nictitating':{status:'verified',at:88}},procedureScenario:'structure-trace',scenarioStartedAt:100,scenarioCompletedAt:200,instructorRequiredStructures:2};
  36 | async function proof(page:Page){return page.evaluate(()=>{const d=(window as any).__ctx.toolData.dissection;return {specimen:d.specimen,layer:d.activeLayer,view:d.anatomicalView,instrument:d.activeInstrument,selected:d.selectedOrgan,explored:d.exploredOrgans,notes:d.organNotes,confidence:d.organConfidence,verified:d.verifiedIdentifications,scores:[d.quizScore,d.quizTotal],revealed:d.revealedLayers,procedures:d.procedureByLayer,scenario:[d.procedureScenario,d.scenarioStartedAt,d.scenarioCompletedAt],guided:[d.guidedMode,d.guidedStep,d.guidedTargetIds,d.guidedObservationPending,d.guidedObservationFeedback]};});}
  37 | async function openReview(page:Page){await page.locator('#diss-observation-review-title').click();return page.locator('[data-observation-review]');}
  38 | async function readerEntry(page:Page,id:string){await page.locator('[data-observation-reader-open]').click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();for(let i=0;i<12;i++){if(await dialog.locator('[data-observation-reader-entry]').getAttribute('data-observation-reader-entry')===id)return dialog;await dialog.getByRole('button',{name:'Next observation',exact:true}).click();}throw Error('Entry unavailable');}
  39 | 
  40 | for(const {name,width,available,large,contrast,forced} of [{name:'phone',width:320,available:320},{name:'tablet',width:768,available:768},{name:'desktop',width:1440,available:1180},{name:'embedded-large',width:1440,available:320,large:true,contrast:true},{name:'forced-colors',width:390,available:390,forced:true}])test(`observation tasks ${name} are readable and preserve the existing record`,async({page})=>{
  41 |   const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));if(forced)await page.emulateMedia({forcedColors:'active'});await mount(page,{...saved,largeText:!!large,highContrast:!!contrast},width,available);const before=await proof(page),panel=await openReview(page);
  42 |   for(const [id,label] of [['dorsal_skin','Choose confidence'],['ventral_skin','Write evidence note'],['tympanum','Open observation record'],['nictitating','Review note']])await expect(panel.locator(`[data-observation-edit="${id}"]`)).toHaveText(label+': '+({dorsal_skin:'Dorsal Skin',ventral_skin:'Ventral Skin',tympanum:'Tympanic Membrane',nictitating:'Nictitating Membrane'} as any)[id]);
  43 |   await panel.locator('[data-observation-edit="dorsal_skin"]').focus();await panel.screenshot({path:`${out}/${name}-review.png`,style:'.diss-next-action {position:static!important;}'});
  44 |   const metrics=await panel.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,controls:Array.from(el.querySelectorAll('button,input')).map(n=>({text:n.textContent||n.getAttribute('aria-label'),height:n.getBoundingClientRect().height,clipped:n.scrollWidth>n.clientWidth+1})),text:Array.from(el.querySelectorAll('.diss-observation-filter-label,.diss-observation-filter-count,.diss-observation-record-status,h4')).map(n=>({text:n.textContent,font:parseFloat(getComputedStyle(n).fontSize),clipped:n.scrollWidth>n.clientWidth+1}))}));
> 45 |   expect(metrics.scroll).toBeLessThanOrEqual(metrics.client+1);for(const n of metrics.controls){expect(n.height).toBeGreaterThanOrEqual(47.9);expect(n.clipped).toBe(false);}for(const n of metrics.text){expect(n.font).toBeGreaterThanOrEqual(large?15.9:13.9);expect(n.clipped).toBe(false);}await writeFile(`${out}/${name}-review-metrics.json`,JSON.stringify(metrics,null,2));
     |                                                                                                                  ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  46 |   await page.addScriptTag({path:'node_modules/axe-core/axe.min.js'});const audit=await page.evaluate(async()=>(window as any).axe.run({include:[['[data-observation-review]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));await writeFile(`${out}/${name}-review-axe.json`,JSON.stringify(audit,null,2));expect(audit.violations).toEqual([]);
  47 |   await panel.locator('[data-observation-edit="dorsal_skin"]').focus();await page.keyboard.press('Enter');await expect(page.locator('#diss-confidence-dorsal_skin-1')).toBeFocused();expect(await proof(page)).toEqual({...before,selected:'dorsal_skin'});
  48 |   const form=page.locator('[data-dissection-evidence]');await expect(form.getByRole('textbox',{name:'Evidence note',exact:true})).toHaveAccessibleDescription(/Draft present/);await expect(form.locator('fieldset')).toHaveAccessibleDescription(/Confidence not rated/);
  49 |   const fm=await form.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,text:Array.from(el.querySelectorAll('.diss-evidence-field-status,.diss-evidence-field-header label,legend')).map(n=>({text:n.textContent,font:parseFloat(getComputedStyle(n).fontSize),clipped:n.scrollWidth>n.clientWidth+1})),ratings:Array.from(el.querySelectorAll('.diss-confidence-scale__option')).map(n=>n.getBoundingClientRect().height)}));expect(fm.scroll).toBeLessThanOrEqual(fm.client+1);for(const n of fm.text){expect(n.font).toBeGreaterThanOrEqual(large?15.9:13.9);expect(n.clipped).toBe(false);}for(const h of fm.ratings)expect(h).toBeGreaterThanOrEqual(47.9);await writeFile(`${out}/${name}-fields-metrics.json`,JSON.stringify(fm,null,2));
  50 |   await form.screenshot({path:`${out}/${name}-fields.png`,style:'.diss-next-action {position:static!important;}'});const fa=await page.evaluate(async()=>(window as any).axe.run({include:[['[data-dissection-evidence]']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));await writeFile(`${out}/${name}-fields-axe.json`,JSON.stringify(fa,null,2));expect(fa.violations).toEqual([]);expect(errors).toEqual([]);
  51 | });
  52 | 
  53 | for(const route of ['list','reader'])for(const {name,note,rating,label,target} of [
  54 |   {name:'confidence only',note:'A saved observation.',rating:0,label:'Choose confidence',target:'diss-confidence-ventral_skin-1'},
  55 |   {name:'note only',note:'   ',rating:2,label:'Write evidence note',target:'diss-note-ventral_skin'},
  56 |   {name:'both missing',note:'',rating:'invalid',label:'Open observation record',target:'diss-note-ventral_skin'},
  57 |   {name:'complete at low confidence',note:'A saved observation.',rating:1,label:'Review note',target:'diss-note-ventral_skin'}
  58 | ])test(`${route} routes ${name} work to its actual field without changing evidence`,async({page})=>{
  59 |   await mount(page,{...saved,organNotes:{'frog|ventral_skin':note},organConfidence:{'frog|ventral_skin':rating},_observationReviewSearch:'ventral',_observationReviewFilter:name==='complete at low confidence'?'uncertain':'unfinished'});const before=await proof(page);const panel=await openReview(page);
  60 |   if(route==='list')await panel.getByRole('button',{name:label+': Ventral Skin',exact:true}).click();else{const dialog=await readerEntry(page,'ventral_skin');await expect(dialog.locator('[data-observation-reader-status]')).toHaveText(name==='both missing'?'Note and confidence needed':name==='confidence only'?'Add a confidence rating':name==='note only'?'Add an evidence note':'Note and confidence recorded');await dialog.getByRole('button',{name:label==='Review note'?'Return to edit this note':label,exact:true}).click();await expect(dialog).toHaveCount(0);}
  61 |   await expect(page.locator('#'+target)).toBeFocused();expect(await proof(page)).toEqual({...before,selected:'ventral_skin'});await page.getByRole('button',{name:'Review all observations',exact:true}).click();await expect(panel.locator('#diss-observation-review-title')).toBeFocused();await expect(panel.locator('#diss-observation-search')).toHaveValue('ventral');await expect(panel.locator('[data-observation-filter="'+(name==='complete at low confidence'?'uncertain':'unfinished')+'"]')).toHaveAttribute('aria-pressed','true');
  62 | });
  63 | 
  64 | for(const route of ['list','reader'])for(const pending of [false,true])test(`${route} same-layer review preserves the Guided investigation with ${pending?'a pending checkpoint':'no pending checkpoint'}`,async({page})=>{
  65 |   await mount(page,{...saved,organNotes:{'frog|ventral_skin':'Saved evidence.'},organConfidence:{},guidedMode:true,guidedStep:1,guidedTargetIds:['ventral_skin','tympanum'],guidedObservationPending:pending?'tympanum':null,guidedObservationFeedback:pending?{correct:false,choiceId:'nictitating',message:'Saved retry feedback.'}:null});const before=await proof(page);const panel=await openReview(page);
  66 |   if(route==='list')await panel.locator('[data-observation-edit="ventral_skin"]').click();else{const dialog=await readerEntry(page,'ventral_skin');await dialog.getByRole('button',{name:'Choose confidence',exact:true}).click();await expect(dialog).toHaveCount(0);}
  67 |   await expect(page.locator('#diss-confidence-ventral_skin-1')).toBeFocused();expect(await proof(page)).toEqual({...before,selected:'ventral_skin'});if(pending)await expect(page.locator('#diss-guided-observation-check')).toBeVisible();
  68 | });
  69 | 
  70 | test('cross-layer record completion retains the normal Guided layer reset and preserves progress',async({page})=>{
  71 |   await mount(page,{...saved,guidedMode:true,guidedStep:1,guidedTargetIds:['ventral_skin','tympanum'],guidedObservationPending:'tympanum',guidedObservationFeedback:{correct:false,message:'Saved retry feedback.'},exploredOrgans:{...saved.exploredOrgans,'frog|heart':true},organNotes:{'frog|heart':'A saved central structure observation.'},organConfidence:{},revealedLayers:{skin:true,muscle:true}});const before=await proof(page),panel=await openReview(page);await panel.locator('[data-observation-edit="heart"]').click();await expect(page.locator('#diss-confidence-heart-1')).toBeFocused();expect(await proof(page)).toEqual({...before,layer:'organs',selected:'heart',guided:[false,0,[],null,null]});
  72 | });
  73 | 
  74 | test('locked records remain readable and offer no field-edit handoff',async({page})=>{
  75 |   await mount(page,{...saved,exploredOrgans:{'frog|heart':true},organNotes:{'frog|heart':'Read-only saved evidence.'},organConfidence:{},revealedLayers:{}});const before=await proof(page),panel=await openReview(page);await expect(panel.locator('[data-observation-edit]')).toHaveCount(0);await expect(panel.locator('[data-observation-locked]')).toBeVisible();const dialog=await readerEntry(page,'heart');await expect(dialog.locator('[data-observation-reader-edit]')).toHaveCount(0);await expect(dialog.locator('[data-observation-reader-locked]')).toBeVisible();await expect(dialog.getByRole('region',{name:'Your recorded note'})).toHaveText('Read-only saved evidence.');await page.keyboard.press('Escape');expect(await proof(page)).toEqual(before);
  76 | });
  77 | 
  78 | test('field status follows deliberate edits without announcing each keystroke or awarding mastery',async({page})=>{
  79 |   await mount(page,{...saved,selectedOrgan:'tympanum'});const before=await proof(page),form=page.locator('[data-dissection-evidence]'),note=form.getByRole('textbox',{name:'Evidence note',exact:true});await expect(form.locator('#diss-note-status-tympanum')).toHaveText('Note not started');await expect(form.locator('#diss-confidence-status-tympanum')).toHaveText('Confidence not rated');await note.fill('   ');await expect(form.locator('#diss-note-status-tympanum')).toHaveAttribute('data-field-present','false');const text='لاحظت شكلًا واضحًا.\nI will check its location.';await note.fill(text);await expect(note).toBeFocused();await expect(form.locator('#diss-note-status-tympanum')).toHaveText('Draft present · review needed');await form.getByRole('radio',{name:'Confidence 1 of 3: Not sure yet',exact:true}).check();await expect(form.locator('#diss-confidence-status-tympanum')).toHaveText('Confidence: Not sure yet · 1 of 3');await expect(form.locator('.diss-draft-status')).toHaveCount(0);expect(await form.locator('.diss-evidence-field-status').evaluateAll(nodes=>nodes.every(n=>!n.hasAttribute('aria-live')&&!n.hasAttribute('role')))).toBe(true);expect(await proof(page)).toEqual({...before,notes:{...before.notes,'frog|tympanum':text},confidence:{...before.confidence,'frog|tympanum':1}});await expect(page.locator('[data-note-handoff] [data-record-complete]')).toHaveAttribute('data-record-complete','true');
  80 | });
  81 | 
  82 | for(const mode of ['quizMode','practicalMode','flashcardMode','compareMode','eyeStudyMode'])test(`observation editing stays unavailable in ${mode}`,async({page})=>{await mount(page,{...saved,[mode]:true});await expect(page.locator('[data-observation-review]')).toHaveCount(0);await expect(page.locator('[data-observation-reader-edit]')).toHaveCount(0);});
  83 | 
  84 | test('export documentation accurately names one or both missing fields',async({page})=>{await mount(page,saved);const before=await proof(page),panel=await openReview(page);await panel.locator('[data-observation-export] > summary').click();const text=await panel.locator('#diss-observation-summary').inputValue();expect(text).toContain('Documentation: Evidence note and confidence missing');expect(text).toContain('Documentation: Confidence missing');expect(text).toContain('Documentation: Evidence note missing');expect(text).toContain('Documentation: Note and confidence recorded');expect(await proof(page)).toEqual(before);});
  85 | 
  86 | test('review filter badges retain complete accessible counts and update after an explicit rating',async({page})=>{await mount(page,saved);const panel=await openReview(page);await expect(panel.locator('[data-observation-filter="unfinished"]')).toHaveAccessibleName('Finish records (3)');await expect(panel.locator('[data-observation-filter="uncertain"]')).toHaveAccessibleName('Low confidence (1)');await panel.locator('[data-observation-edit="dorsal_skin"]').click();await page.getByRole('radio',{name:'Confidence 1 of 3: Not sure yet',exact:true}).check();await page.getByRole('button',{name:'Review all observations',exact:true}).click();await expect(panel.locator('[data-observation-filter="unfinished"]')).toHaveAccessibleName('Finish records (2)');await expect(panel.locator('[data-observation-filter="uncertain"]')).toHaveAccessibleName('Low confidence (2)');await expect(panel.locator('[data-observation-entry="dorsal_skin"] .diss-observation-record-status')).toHaveText('Note and confidence recorded');});
  87 | 
```