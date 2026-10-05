# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: anatomy-case-journey.spec.ts >> Hint, explanation, hide and review actions focus their content and distinguish atlas progress from all cases
- Location: tests\e2e\anatomy-case-journey.spec.ts:103:5

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('[data-anatomy-case="case_2"] [data-anatomy-case-reviewed="case_2"]')
Expected: focused
Received: inactive
Timeout:  15000ms

Call log:
  - Expect "toBeFocused" with timeout 15000ms
  - waiting for locator('[data-anatomy-case="case_2"] [data-anatomy-case-reviewed="case_2"]')
    33 × locator resolved to <p role="group" tabindex="-1" class="anatomy-case-reviewed" data-anatomy-case-reviewed="case_2" aria-label="Explanation reviewed · The Shoulder That Won't Lift">Explanation reviewed</p>
       - unexpected value "inactive"

```

```yaml
- group "Explanation reviewed · The Shoulder That Won't Lift": Explanation reviewed
```

# Test source

```ts
  7   | const out=process.env.ANATOMY_CASE_JOURNEY_QA_OUT||'reports/anatomy-case-journey-2026-10-02';
  8   | const captures=out+'/screenshots';
  9   | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_anatomy.js',toolId:'anatomy',width:1280,height:1000,layout:'document',appStyles:true});
  10  | const validation:Record<string,any>={};
  11  | const study='[data-anatomy-clinical-study]';
  12  | const case2='[data-anatomy-case="case_2"]';
  13  | const explanation=case2+' [data-anatomy-case-explanation="case_2"]';
  14  | const hint=case2+' [data-anatomy-case-hint="case_2"]';
  15  | const reviewed=case2+' [data-anatomy-case-reviewed="case_2"]';
  16  | const origin='[data-anatomy-case-origin="case_2"]';
  17  | const returnButton=origin+' [data-anatomy-case-return="case_2"]';
  18  | const workKeys=['quizIdx','quizScore','quizFeedback','_quizAttempts','_quizQuestion','_quizSeed','_quizActivityReturn','_quizStudyReturn',
  19  |   '_flashcardDeck','_flashcardDeckContext','_flashcardRoundContext','_flashcardIdx','_flashcardFlipped','_flashcardRoundRated','_flashcardRounds','_flashcardScope',
  20  |   '_spotterActive','_spotterTarget','_spotterOpts','_spotterFeedback','_spotterScore','_spotterTotal','_spotterStartTime','_spotterElapsed','_spotterRoundTimed','_spotterTimed','_spotterSerial',
  21  |   '_structureNotes','_structureConfidence','_confidenceAt','_retrievalEvidence','_compareStructure','_connectionConcepts','_connectionPractice'];
  22  | const base={system:'muscular',view:'anterior',complexity:3,_activeTab:'explore',quizMode:false,selectedStructure:'biceps',search:'Biceps',_studyFilter:'notes',_showClinical:true,
  23  |   _structureNotes:{biceps:'My saved biceps note.'},_compareStructure:'triceps',_connectionConcepts:{version:1,answers:{conn_3:'choice_1'}},
  24  |   _connectionPractice:{version:1,sessions:{conn_3:{token:'saved-connection-practice',answer:'choice_0',active:false}}}};
  25  | 
  26  | test.use({video:'off',trace:'off'});test.describe.configure({mode:'serial',retries:0,timeout:300000});
  27  | test.beforeAll(async()=>{
  28  |   await harness.start();await mkdir(captures,{recursive:true});
  29  |   const source=await readFile('stem_lab/stem_tool_anatomy.js','utf8');validation.metadata={sourceLfSha256:createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex'),startedAt:new Date().toISOString()};
  30  |   if(process.env.ANATOMY_CASE_JOURNEY_SOURCE_HASH)expect(validation.metadata.sourceLfSha256).toBe(process.env.ANATOMY_CASE_JOURNEY_SOURCE_HASH);
  31  | });
  32  | test.afterAll(async()=>{
  33  |   const source=await readFile('stem_lab/stem_tool_anatomy.js','utf8');validation.metadata.finishedSourceLfSha256=createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex');validation.metadata.finishedAt=new Date().toISOString();
  34  |   await writeFile(out+'/browser-validation.json',JSON.stringify(validation,null,2));try{expect(validation.metadata.finishedSourceLfSha256).toBe(validation.metadata.sourceLfSha256);}finally{await harness.stop();}
  35  | });
  36  | test.afterEach(async({page},info)=>{
  37  |   if(info.status!==info.expectedStatus){const name='diagnostic-'+info.title.replace(/[^a-z0-9]+/gi,'-').slice(0,100)+'.png';try{await page.screenshot({path:captures+'/'+name,fullPage:true});(validation.diagnostics??=[]).push(name);}catch{}}
  38  |   await harness.destroy(page);
  39  | });
  40  | function recordFor(page:Page,name:string){const record:any={errors:[],steps:[],scans:[],styles:[],captures:[],labelPixels:[]};validation[name]=record;page.on('pageerror',error=>record.errors.push(error.message));return record;}
  41  | const state=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
  42  | async function mount(page:Page,data:Record<string,any>){
  43  |   await harness.mount(page,{anatomy:{_bodyView3d:false,_startHereDismissed:true,...data}},undefined,{expectCanvas:false});
  44  |   await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  45  |   await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{});});await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  46  |   await expect(page.locator(study)).toBeVisible();await expect(page.locator(study)).toHaveAttribute('data-anatomy-case-navigation',/.+/);await expect(page.locator(case2)).toHaveAttribute('data-anatomy-case-state',/.+/);
  47  | }
  48  | async function activity(page:Page,tab:string){
  49  |   const mobile=page.locator('#anatomy-mobile-activity');if(await mobile.isVisible())await mobile.selectOption(tab);else await page.locator('#anatomy-mode-tab-'+tab).click();
  50  |   expect((await state(page))._activeTab).toBe(tab);
  51  | }
  52  | function workSnapshot(data:Record<string,any>){return Object.fromEntries(workKeys.map(key=>[key,data[key]]));}
  53  | async function sameWork(page:Page,expected:Record<string,any>,record:any,label:string){const data=await state(page);for(const key of workKeys)expect(data[key],label+': '+key).toEqual(expected[key]);record.steps.push({label,system:data.system,view:data.view,tab:data._activeTab,quizScore:data.quizScore,quizAttempts:data._quizAttempts,caseStudy:data._clinicalStudy,origin:data._caseDiagramOrigin});return data;}
  54  | async function draft(page:Page,text:string){await page.locator(case2+' [data-anatomy-case-draft="case_2"]').fill(text);expect((await state(page))._clinicalStudy.cases.case_2.draft).toBe(text);}
  55  | async function reveal(page:Page){await page.locator(case2+' [data-anatomy-case-reveal="case_2"]').click();await expect(page.locator(explanation)).toBeFocused();await expect(page.locator(explanation)).toHaveAttribute('role','group');const labelled=await page.locator(explanation).getAttribute('aria-labelledby');expect(labelled).toBeTruthy();await expect(page.locator('#'+labelled)).toBeVisible();}
  56  | async function diagram(page:Page){
  57  |   await page.locator(case2+' [data-anatomy-case-marker="case_2"]').click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();await expect(page.locator(origin)).toBeVisible();await expect(page.locator(returnButton)).toBeVisible();
  58  |   const data=await state(page);expect(data).toMatchObject({system:'muscular',view:'posterior',complexity:3,_activeTab:'explore',selectedStructure:'rotator_cuff',_bodyView3d:false});expect(data._caseDiagramOrigin).toMatchObject({version:1,caseId:'case_2'});expect(data._caseDiagramOrigin.token).toBeTruthy();expect(data._caseDiagramReturn).toBe('case_2');return data;
  59  | }
  60  | async function returned(page:Page,initial:Record<string,any>,visible=true){
  61  |   await page.locator(returnButton).click();await expect(visible?page.locator(explanation):page.locator(case2+' h4').first()).toBeFocused();const data=await state(page);
  62  |   for(const key of ['system','view','complexity','selectedStructure','search','_studyFilter','_activeTab','_bodyView3d','quizMode'])expect(data[key],'origin '+key).toEqual(initial[key]);
  63  |   expect(data._caseDiagramOrigin==null).toBe(true);expect(data._caseDiagramReturn==null).toBe(true);await expect(page.locator(origin)).toHaveCount(0);return data;
  64  | }
  65  | async function actualQuiz(page:Page){
  66  |   await activity(page,'quiz');const panel=page.locator('[data-anatomy-quiz-panel]');await expect(panel).toBeVisible();await expect.poll(async()=>(await state(page))._quizQuestion?.context).toContain('g912');
  67  |   const first=(await state(page))._quizQuestion;expect(first).toBeTruthy();await panel.locator('[data-anatomy-quiz-option]').first().click();await expect(panel.locator('[data-anatomy-quiz-feedback]')).toBeFocused();
  68  |   await panel.locator('[data-anatomy-quiz-next]').click();await expect(panel).toBeFocused();const next=(await state(page))._quizQuestion;expect(next).not.toEqual(first);await panel.locator('[data-anatomy-quiz-option]').first().click();await expect(panel.locator('[data-anatomy-quiz-feedback]')).toBeFocused();
  69  |   const data=await state(page);expect(data.quizIdx).toBe(1);expect(data._quizAttempts).toBe(2);expect(data.quizFeedback.questionKey).toBeTruthy();return data;
  70  | }
  71  | async function capture(page:Page,record:any,locator:Locator,name:string){
  72  |   await expect(locator).toBeVisible();const width=page.viewportSize()!.width,box=await locator.boundingBox();if(!box)throw Error('Missing screenshot target '+name);await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  73  |   try{await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-70)));const clip=await locator.evaluate(element=>{const r=element.getBoundingClientRect(),x=Math.max(0,Math.floor(r.left-6)),y=Math.max(0,Math.floor(r.top-6));return {x,y,width:Math.min(innerWidth,Math.ceil(r.right+6))-x,height:Math.min(innerHeight,Math.ceil(r.bottom+6))-y};});expect(clip.width).toBeGreaterThan(0);expect(clip.height).toBeGreaterThan(0);await page.screenshot({path:captures+'/'+name+'.png',clip});record.captures.push(name+'.png');}finally{await page.setViewportSize({width,height:1000});}
  74  | }
  75  | 
  76  | test('A real answered anterior quiz survives the posterior clinical marker and returns to the same question and explanation',async({page})=>{
  77  |   const record=recordFor(page,'quizReturn');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});await mount(page,base);await actualQuiz(page);
  78  |   await draft(page,'Shoulder pain suggests a relevant muscle group; it does not establish a tear.');await reveal(page);const initial=await state(page),saved=workSnapshot(initial),question=initial._quizQuestion;
  79  |   const options=await page.locator('[data-anatomy-quiz-option]').evaluateAll(items=>items.map(item=>({id:item.getAttribute('data-anatomy-quiz-option'),result:item.getAttribute('data-result'),text:item.textContent,disabled:(item as HTMLButtonElement).disabled})));
  80  |   await diagram(page);await sameWork(page,saved,record,'posterior marker');await capture(page,record,page.locator(origin),'desktop-case-marker-context');
  81  |   await returned(page,initial);await sameWork(page,saved,record,'back to answered quiz');expect((await state(page))._quizQuestion).toEqual(question);
  82  |   expect(await page.locator('[data-anatomy-quiz-option]').evaluateAll(items=>items.map(item=>({id:item.getAttribute('data-anatomy-quiz-option'),result:item.getAttribute('data-result'),text:item.textContent,disabled:(item as HTMLButtonElement).disabled})))).toEqual(options);
  83  |   await expect(page.locator('[data-anatomy-quiz-feedback]')).toBeVisible();await capture(page,record,page.locator(study),'desktop-case-explanation-return');expect(record.errors).toEqual([]);
  84  | });
  85  | 
  86  | test('The phone marker route reloads safely, retains newer writing, and falls back to the title after its explanation is hidden',async({page})=>{
  87  |   const record=recordFor(page,'reloadReturn');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});await mount(page,base);await draft(page,'My initial anatomical explanation.');await reveal(page);
  88  |   const initial=await state(page),saved=workSnapshot(initial);await diagram(page);let away=await sameWork(page,saved,record,'before route reload');const token=away._caseDiagramOrigin.token;
  89  |   await harness.destroy(page);await mount(page,away);await expect(page.locator(origin)).toBeVisible();expect((await state(page))._caseDiagramOrigin.token).toBe(token);await capture(page,record,page.locator(origin),'phone-reloaded-marker-context');
  90  |   await draft(page,'A newer explanation written while inspecting the posterior marker.');await page.locator(case2+' [data-anatomy-case-reveal="case_2"]').click();await expect(page.locator(case2+' [data-anatomy-case-draft="case_2"]')).toBeFocused();await expect(page.locator(explanation)).toBeHidden();
  91  |   await returned(page,initial,false);await sameWork(page,saved,record,'hidden explanation return');expect((await state(page))._clinicalStudy.cases.case_2.draft).toBe('A newer explanation written while inspecting the posterior marker.');
  92  |   await expect(page.locator(case2+' [data-anatomy-case-draft="case_2"]')).toHaveValue('A newer explanation written while inspecting the posterior marker.');await capture(page,record,page.locator(case2),'phone-title-fallback-return');expect(record.errors).toEqual([]);
  93  | });
  94  | 
  95  | test('Actual Cards and answered Spotter work remain intact through a clinical diagram detour',async({page})=>{
  96  |   const record=recordFor(page,'cardsSpotter');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});await mount(page,{...base,_activeTab:'flashcards',search:'',_studyFilter:'all'});
  97  |   const cards=page.locator('[data-anatomy-flashcards]');await expect(cards).toBeVisible();await cards.getByRole('button',{name:'Reveal function',exact:true}).click();await cards.getByRole('button',{name:'! Need practice',exact:true}).click();await cards.getByRole('button',{name:'Next flashcard',exact:true}).click();await cards.getByRole('button',{name:'Reveal function',exact:true}).click();
  98  |   const cardState=await state(page);expect(cardState._flashcardFlipped).toBe(true);expect(Object.keys(cardState._flashcardRoundRated).length).toBeGreaterThan(0);
  99  |   await activity(page,'spotter');await page.locator('[data-anatomy-spotter-start]').click();const round=await state(page),wrong=round._spotterOpts.findIndex((option:any)=>option.id!==round._spotterTarget);expect(wrong).toBeGreaterThanOrEqual(0);await page.locator('[data-anatomy-spotter-option]').nth(wrong).click();await expect(page.locator('[data-anatomy-spotter-feedback]')).toBeFocused();expect((await state(page))._spotterTotal).toBe(1);
  100 |   await activity(page,'explore');await draft(page,'My shoulder-case reasoning is separate from card and Spotter scores.');await reveal(page);const initial=await state(page),saved=workSnapshot(initial);await diagram(page);await sameWork(page,saved,record,'Cards and Spotter at marker');await returned(page,initial);await sameWork(page,saved,record,'Cards and Spotter after return');expect(record.errors).toEqual([]);
  101 | });
  102 | 
  103 | test('Hint, explanation, hide and review actions focus their content and distinguish atlas progress from all cases',async({page})=>{
  104 |   const record=recordFor(page,'caseFeedback');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});await mount(page,{...base,_clinicalSolvedIds:{case_1:true},_clinicalSolved:1});
  105 |   await expect(page.locator('[data-anatomy-case-atlas-progress="muscular"]')).toHaveText('In this atlas: 0/1 explanations reviewed');await expect(page.locator('[data-anatomy-case-total-progress]')).toHaveText('Across all atlases: 1/8 reviewed');await draft(page,'Pain with movement is a clue, and an examination would add evidence.');
  106 |   await page.locator(case2+' [data-anatomy-case-hint-toggle="case_2"]').click();await expect(page.locator(hint)).toBeFocused();await expect(page.locator(hint)).toHaveAttribute('role','group');expect(await page.locator(hint).getAttribute('aria-labelledby')).toBeTruthy();
> 107 |   await reveal(page);expect((await state(page))._clinicalSolvedIds).toEqual({case_1:true});await page.locator(case2+' [data-anatomy-case-review="case_2"]').dblclick();await expect(page.locator(reviewed)).toBeFocused();expect((await state(page))._clinicalSolvedIds).toEqual({case_1:true,case_2:true});expect((await state(page))._clinicalSolved).toBe(2);
      |                                                                                                                                                                                                             ^ Error: expect(locator).toBeFocused() failed
  108 |   await expect(page.locator('[data-anatomy-case-atlas-progress="muscular"]')).toHaveText('In this atlas: 1/1 explanations reviewed');await expect(page.locator('[data-anatomy-case-total-progress]')).toHaveText('Across all atlases: 2/8 reviewed');await expect(page.locator(case2+' [data-anatomy-case-review="case_2"]')).toBeDisabled();await capture(page,record,page.locator(study),'phone-reviewed-case');
  109 |   await page.locator(case2+' [data-anatomy-case-reveal="case_2"]').click();await expect(page.locator(case2+' [data-anatomy-case-draft="case_2"]')).toBeFocused();await expect(page.locator(explanation)).toBeHidden();expect((await state(page))._clinicalSolvedIds).toEqual({case_1:true,case_2:true});expect((await state(page))._clinicalStudy.cases.case_2.draft).toContain('Pain with movement');
  110 |   await page.evaluate(()=>(window as any).__ctx.updateMulti('anatomy',{_caseDiagramOrigin:null,_caseDiagramReturn:'case_2'}));const legacy=await state(page);await page.locator('[data-anatomy-case-return="case_2"]').click();await expect(page.locator(case2+' h4').first()).toBeFocused();const afterLegacy=await sameWork(page,workSnapshot(legacy),record,'legacy case return');for(const key of ['system','view','complexity','selectedStructure','search','_studyFilter','_activeTab','_bodyView3d','quizMode'])expect(afterLegacy[key],'legacy navigation '+key).toEqual(legacy[key]);expect(afterLegacy._caseDiagramReturn==null).toBe(true);expect(afterLegacy._caseDiagramOrigin==null).toBe(true);expect(afterLegacy._clinicalStudy).toEqual(legacy._clinicalStudy);expect(record.errors).toEqual([]);
  111 | });
  112 | 
  113 | async function display(page:Page,context:{width:number,locale:string,reading:boolean},theme:string){
  114 |   await page.setViewportSize({width:context.width,height:1000});const dict=context.locale==='ar'?JSON.parse(await readFile('lang/arabic.js','utf8')):null;
  115 |   await page.evaluate(({dict,theme,reading})=>{document.documentElement.lang=dict?'ar':'en';document.documentElement.dir=dict?'rtl':'ltr';document.body.className=theme==='light'?'':'theme-'+theme;const ctx=(window as any).__ctx;ctx.t=dict?(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback:(key:string,fallback:string)=>fallback;ctx.updateMulti('anatomy',{_readingMode:reading});},{dict,theme,reading:context.reading});
  116 | }
  117 | async function measure(page:Page,record:any,selector:string,context:any){
  118 |   const metrics=await page.locator(selector).evaluateAll(elements=>elements.filter(element=>element.getClientRects().length).map(element=>{
  119 |     const css=getComputedStyle(element),foreground=css.color;let parent:Element|null=element,background='rgb(255, 255, 255)';while(parent){const color=getComputedStyle(parent).backgroundColor,n=color.match(/[\d.]+/g)?.map(Number);if(n&&n.length>=3&&(n.length===3||n[3]!==0)){background=color;break;}parent=parent.parentElement;}
  120 |     const lum=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>x/255).map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4)).reduce((total,x,i)=>total+x*[0.2126,0.7152,0.0722][i],0);const a=lum(foreground),b=lum(background),box=element.getBoundingClientRect();return {tag:element.tagName,text:element.getAttribute('aria-label')||element.textContent?.trim().slice(0,100),font:parseFloat(css.fontSize),width:box.width,height:box.height,foreground,background,ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05),disabled:(element as HTMLButtonElement).disabled===true};
  121 |   }));record.styles.push({context,selector,metrics});expect(metrics.length).toBeGreaterThan(0);for(const m of metrics){expect(m.font,m.text).toBeGreaterThanOrEqual(context.reading?17:16);expect(m.ratio,m.text+' actual contrast').toBeGreaterThanOrEqual(4.5);if(m.tag==='BUTTON'){expect(m.width,m.text).toBeGreaterThanOrEqual(44);expect(m.height,m.text).toBeGreaterThanOrEqual(44);}}return metrics;
  122 | }
  123 | async function scan(page:Page,record:any,selector:string,context:any){
  124 |   const box=await page.locator(selector).evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth,left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right}));const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  125 |   const violations=await page.evaluate(async selector=>{const result=await (window as any).axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return result.violations.map((item:any)=>({id:item.id,nodes:item.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));},selector);record.scans.push({context,selector,box,dimensions,violations});expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);expect(box.scroll).toBeLessThanOrEqual(box.client+1);expect(box.left).toBeGreaterThanOrEqual(0);expect(box.right).toBeLessThanOrEqual(dimensions.width);expect(violations).toEqual([]);
  126 | }
  127 | async function labelPixels(page:Page,record:any,selector:string,name:string){
  128 |   const button=page.locator(selector);await button.scrollIntoViewIfNeeded();const bounds=await button.evaluate(element=>{const range=document.createRange();range.selectNodeContents(element);const r=range.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};});const clip={x:Math.ceil(bounds.left)+2,y:Math.ceil(bounds.top)+2,width:Math.floor(bounds.right)-Math.ceil(bounds.left)-4,height:Math.floor(bounds.bottom)-Math.ceil(bounds.top)-4};expect(clip.width).toBeGreaterThan(30);expect(clip.height).toBeGreaterThan(6);const metrics=pixelStats(readPng(await page.screenshot({path:captures+'/'+name+'.png',clip})));record.labelPixels.push({name,...metrics});record.captures.push(name+'.png');expect(metrics.significantColors).toBeGreaterThanOrEqual(2);expect(metrics.dominantShare).toBeLessThan(0.95);
  129 | }
  130 | 
  131 | test('Case reasoning, feedback and marker context are readable in desktop, phone, Arabic larger text and display themes',async({page})=>{
  132 |   const record=recordFor(page,'displayMatrix');await page.emulateMedia({reducedMotion:'reduce'});await mount(page,base);await draft(page,'My saved reasoning for the shoulder case.');await reveal(page);
  133 |   for(const context of [{width:1280,locale:'en',reading:false},{width:320,locale:'en',reading:false},{width:320,locale:'ar',reading:true}])for(const theme of ['light','dark','contrast']){
  134 |     const view={...context,theme};record.currentDisplay=view;await display(page,context,theme);
  135 |     await measure(page,record,study+' :is(h3,h4,h5,p,label,button,a,textarea)',view);await scan(page,record,study,view);
  136 |     if(context.width===1280&&theme==='light')await capture(page,record,page.locator(study),'desktop-case-reading-feedback');if(context.width===320&&context.locale==='en'&&theme==='contrast')await capture(page,record,page.locator(case2),'phone-contrast-case');if(context.locale==='ar'&&theme==='dark')await capture(page,record,page.locator(case2),'phone-arabic-dark-case');
  137 |     const initial=await state(page),saved=workSnapshot(initial);await diagram(page);await measure(page,record,origin+' :is(h4,h5,p,button,strong)',view);await scan(page,record,origin,{...view,marker:true});
  138 |     if(context.locale==='ar'&&theme==='dark')await capture(page,record,page.locator(origin),'phone-arabic-dark-marker-context');await returned(page,initial);await sameWork(page,saved,record,context.locale+' '+context.width+' '+theme);
  139 |   }
  140 |   const forced={width:320,locale:'en',reading:false,theme:'forced-colors'};record.currentDisplay=forced;await display(page,forced,'light');await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  141 |   await measure(page,record,study+' :is(h3,h4,h5,p,label,button,a,textarea)',forced);await scan(page,record,study,forced);await capture(page,record,page.locator(case2),'phone-forced-case-feedback');await labelPixels(page,record,case2+' [data-anatomy-case-marker="case_2"]','phone-forced-case-marker-label');
  142 |   const initial=await state(page);await diagram(page);await measure(page,record,origin+' :is(h4,h5,p,button,strong)',forced);await scan(page,record,origin,{...forced,marker:true});await capture(page,record,page.locator(origin),'phone-forced-case-marker-context');await labelPixels(page,record,returnButton,'phone-forced-case-return-label');await returned(page,initial);await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});expect(record.scans).toHaveLength(20);expect(record.errors).toEqual([]);
  143 | });
  144 | 
```