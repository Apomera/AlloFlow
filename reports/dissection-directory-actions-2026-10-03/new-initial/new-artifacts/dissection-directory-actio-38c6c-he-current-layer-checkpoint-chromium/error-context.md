# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-directory-actions.spec.ts >> a real equivalent probe action keeps its first completion and reports the current-layer checkpoint
- Location: tests\e2e\dissection-directory-actions.spec.ts:110:5

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('#diss-procedure-panel .diss-procedure__next')
Expected substring: "Probe"
Received string:    "Motor-neutral: Trace a visible organ boundary"
Timeout: 15000ms

Call log:
  - Expect "toContainText" with timeout 15000ms
  - waiting for locator('#diss-procedure-panel .diss-procedure__next')
    33 × locator resolved to <button disabled type="button" class="diss-procedure__next" aria-describedby="diss-equivalent-technique-note" aria-label="Motor-neutral equivalent: Trace a visible organ boundary. Align the specimen to the recommended ventral view.">Motor-neutral: Trace a visible organ boundary</button>
       - unexpected value "Motor-neutral: Trace a visible organ boundary"

```

```yaml
- 'button "Motor-neutral equivalent: Trace a visible organ boundary. Align the specimen to the recommended ventral view." [disabled]': "Motor-neutral: Trace a visible organ boundary"
```

# Test source

```ts
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
  105 |   const before=await evidence(page);await time(page,5000);const trace=page.getByRole('button',{name:'Trace next exposed connection',exact:true});await expect(trace).toBeEnabled();await trace.click();
  106 |   const after=await evidence(page);expect(after.scenario[2]).toBe(5000);expect(after.selected).not.toBe('heart');expect(after.notes).toEqual(before.notes);expect(after.confidence).toEqual(before.confidence);expect(after.procedures).toEqual(before.procedures);
  107 |   await time(page,6000);await trace.click();expect((await evidence(page)).scenario[2]).toBe(5000);
  108 | });
  109 | 
  110 | test('a real equivalent probe action keeps its first completion and reports the current-layer checkpoint',async({page})=>{
  111 |   const setup={...complete,probed:false,history:order.slice(0,-1),actionLog:complete.actionLog.slice(0,-1)};
  112 |   await mount(page,{...saved,workspaceMode:'advanced',activeLayer:'organs',anatomicalView:'internal',activeInstrument:'probe',techniquePanelOpen:true,scenarioCompletedAt:0,exploredOrgans:{'frog|heart':true},revealedLayers:{skin:true,muscle:true},procedureByLayer:{organs:setup}},1180);
> 113 |   const before=await evidence(page);await time(page,7000);const action=page.locator('#diss-procedure-panel .diss-procedure__next');await expect(action).toContainText('Probe');await expect(action).toBeEnabled();await action.click();
      |                                                                                                                                                         ^ Error: expect(locator).toContainText(expected) failed
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