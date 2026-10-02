# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: anatomy-connection-journey.spec.ts >> A direct participating-system entry keeps both return actions and adjusts only the inspected marker level and view
- Location: tests\e2e\anatomy-connection-journey.spec.ts:108:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-anatomy-relationship-partner="muscular"][data-anatomy-relationship-connection="conn_3"]')
    - locator resolved to <button type="button" data-kind="partner" class="anatomy-relation-node" data-anatomy-relationship-partner="muscular" data-anatomy-relationship-connection="conn_3" aria-label="Open Muscular system diagram from Lever System for Movement">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span aria-hidden="true" class="anatomy-relation-arrow">→</span> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <span aria-hidden="true" class="anatomy-relation-arrow">→</span> intercepts pointer events
    - retrying click action
      - waiting 100ms
    51 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <span aria-hidden="true" class="anatomy-relation-arrow">→</span> intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Test source

```ts
  11  | const contextSelector='.anatomy-connection-model-context';
  12  | const panelSelector='[data-anatomy-connections-panel]';
  13  | const processSelector='[data-anatomy-relationship-process="conn_3"]';
  14  | const partnerSelector='[data-anatomy-relationship-partner="muscular"][data-anatomy-relationship-connection="conn_3"]';
  15  | const markerSelector=(id:string)=>'[data-anatomy-connection-marker="'+id+'"][data-anatomy-connection-marker-system="muscular"]';
  16  | const preservedKeys=['quizIdx','quizScore','quizFeedback','_quizAttempts','_quizActivityReturn','_flashcardDeck','_flashcardDeckContext','_flashcardRoundContext','_flashcardIdx','_flashcardFlipped','_flashcardRoundRated','_flashcardRounds','_structureNotes','_structureConfidence','_confidenceAt','_compareStructure'];
  17  | const deck=['skull','ribs','femur'];
  18  | const deckContext='skeletal:3:all:'+deck.join(',');
  19  | const savedWork={
  20  |   quizIdx:3,quizScore:2,quizFeedback:{correct:true,selected:0,questionKey:'saved-question'},_quizAttempts:4,
  21  |   _quizActivityReturn:{questionKey:'saved-question',token:'saved-question-token',index:3,score:2,attempts:4},
  22  |   _flashcardDeck:deck,_flashcardDeckContext:deckContext,_flashcardRoundContext:deckContext,
  23  |   _flashcardIdx:1,_flashcardFlipped:true,_flashcardRoundRated:{skull:true},
  24  |   _flashcardRounds:{'skeletal:3:all':{context:deckContext,deckIds:deck,index:1,rated:{skull:true}}},
  25  |   _structureNotes:{femur:'The femur supports the leg and is involved in movement.',biceps:'My biceps note stays with this structure.'},
  26  |   _structureConfidence:{femur:'learning'},_confidenceAt:{femur:1800000000000},_compareStructure:'tibia'
  27  | };
  28  | const originState={_activeTab:'explore',system:'skeletal',view:'anterior',complexity:3,selectedStructure:'femur',search:'Femur',_studyFilter:'notes',...savedWork};
  29  |
  30  | test.use({video:'off',trace:'off'});
  31  | test.describe.configure({mode:'serial',retries:0,timeout:300000});
  32  | test.beforeAll(async()=>{
  33  |   await harness.start();await mkdir(captures,{recursive:true});
  34  |   const source=await readFile('stem_lab/stem_tool_anatomy.js','utf8');
  35  |   validation.metadata={sourceLfSha256:createHash('sha256').update(source.replace(/\r\n/g,'\n')).digest('hex'),startedAt:new Date().toISOString()};
  36  | });
  37  | test.afterAll(async()=>{await writeFile(out+'/browser-validation.json',JSON.stringify(validation,null,2));await harness.stop();});
  38  | test.afterEach(async({page})=>{await harness.destroy(page);});
  39  |
  40  | function recordFor(page:Page,name:string){
  41  |   const record:any={errors:[],scans:[],steps:[],captures:[]};validation[name]=record;
  42  |   page.on('pageerror',error=>record.errors.push(error.message));return record;
  43  | }
  44  | async function mounted(page:Page,state:Record<string,any>){
  45  |   await harness.mount(page,{anatomy:{_bodyView3d:false,_startHereDismissed:true,...state}},undefined,{expectCanvas:false});
  46  |   await page.addStyleTag({content:'html,body{background:#f1f5f9}#wrap{width:min(1280px,100%);height:auto;min-height:100%;margin:auto}*{transition:none!important;animation:none!important}'});
  47  |   await page.evaluate(()=>{const ctx=(window as any).__ctx;ctx.gradeLevel='9';ctx.gradeBand='g912';ctx.updateMulti('anatomy',{});});
  48  |   await page.addScriptTag({path:'axe-core/4.12.1/axe.min.js'});
  49  | }
  50  | const anatomyState=(page:Page)=>page.evaluate(()=>(window as any).__toolData.anatomy);
  51  | async function checkSavedWork(page:Page,record:any,label:string){
  52  |   const state=await anatomyState(page),saved:Record<string,any>={};
  53  |   for(const key of preservedKeys){saved[key]=state[key];expect(state[key],label+': '+key).toEqual((savedWork as any)[key]);}
  54  |   record.steps.push({label,system:state.system,view:state.view,complexity:state.complexity,selected:state.selectedStructure,activeTab:state._activeTab,savedWork:saved});
  55  |   return state;
  56  | }
  57  | async function screenshot(page:Page,record:any,locator:Locator,name:string){
  58  |   await expect(locator).toBeVisible();const width=page.viewportSize()!.width,box=await locator.boundingBox();
  59  |   if(!box)throw Error('Screenshot target has no bounds: '+name);
  60  |   await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  61  |   try{
  62  |     await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-70)));
  63  |     const clip=await locator.evaluate(element=>{
  64  |       const rect=element.getBoundingClientRect(),x=Math.max(0,Math.floor(rect.left-6)),y=Math.max(0,Math.floor(rect.top-6));
  65  |       return {x,y,width:Math.min(innerWidth,Math.ceil(rect.right+6))-x,height:Math.min(innerHeight,Math.ceil(rect.bottom+6))-y};
  66  |     });
  67  |     expect(clip.width).toBeGreaterThan(0);expect(clip.height).toBeGreaterThan(0);
  68  |     await page.screenshot({path:captures+'/'+name+'.png',clip});record.captures.push(name+'.png');
  69  |   }finally{await page.setViewportSize({width,height:1000});}
  70  | }
  71  | async function openProcess(page:Page){
  72  |   await page.locator(processSelector).click();
  73  |   await expect(page.locator(connectionSelector)).toBeVisible();
  74  |   await expect(page.locator(connectionSelector)).toBeFocused();
  75  |   await expect(page.locator(panelSelector+' [data-anatomy-connection-origin="femur"]')).toBeVisible();
  76  | }
  77  | async function backToOrigin(page:Page,entry:'process'|'partner',complexity=3){
  78  |   await page.locator(panelSelector+' [data-anatomy-connection-origin-return="femur"]').click();
  79  |   await expect(page.locator('[data-anatomy-structure-detail="femur"]')).toBeVisible();
  80  |   await expect(page.locator(entry==='process'?processSelector:partnerSelector)).toBeFocused();
  81  |   const state=await anatomyState(page);
  82  |   expect(state).toMatchObject({_activeTab:'explore',system:'skeletal',view:'anterior',complexity,selectedStructure:'femur',search:'Femur',_studyFilter:'notes',_bodyView3d:false,_connectionStudyOrigin:null});
  83  |   await expect(page.locator('[data-anatomy-connection-origin-return]')).toHaveCount(0);return state;
  84  | }
  85  |
  86  | test('A relationship detour returns to its exact structure and preserves practice, writing and the comparison pin',async({page})=>{
  87  |   const record=recordFor(page,'processJourney');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});
  88  |   await mounted(page,originState);await checkSavedWork(page,record,'origin');
  89  |   await openProcess(page);
  90  |   let state=await checkSavedWork(page,record,'opened connection');
  91  |   expect(state._connectionStudyOrigin).toMatchObject({version:1,structureId:'femur',systemId:'skeletal',connectionId:'conn_3',entry:'process',search:'Femur',studyFilter:'notes'});
  92  |   await expect(page.locator(panelSelector+' [data-anatomy-connection-origin="femur"]')).toContainText('Started at Femur');
  93  |   await screenshot(page,record,page.locator(panelSelector),'desktop-expanded-connection');
  94  |   await page.locator(connectionSelector+' [data-anatomy-connection-diagram="muscular"]').click();
  95  |   await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  96  |   state=await checkSavedWork(page,record,'muscular diagram');expect(state).toMatchObject({_activeTab:'connections',system:'muscular',selectedStructure:null,_expandedConn:'conn_3',search:'',_studyFilter:'all'});
  97  |   await page.locator(connectionSelector+' '+markerSelector('biceps')).click();
  98  |   await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  99  |   state=await checkSavedWork(page,record,'biceps marker');expect(state).toMatchObject({system:'muscular',view:'anterior',selectedStructure:'biceps',complexity:3});
  100 |   await expect(page.locator(connectionSelector+' [data-anatomy-connection-current="biceps"]')).toContainText('Biceps Brachii');
  101 |   await expect(page.locator(connectionSelector+' '+markerSelector('biceps'))).toHaveAttribute('aria-pressed','true');
  102 |   await screenshot(page,record,page.locator(contextSelector),'desktop-marker-return');
  103 |   await page.locator(contextSelector+' [data-anatomy-connection-return]').click();await expect(page.locator(connectionSelector)).toBeFocused();
  104 |   await backToOrigin(page,'process');await checkSavedWork(page,record,'returned to origin');
  105 |   record.returnedToExactButton=true;expect(record.errors).toEqual([]);
  106 | });
  107 |
  108 | test('A direct participating-system entry keeps both return actions and adjusts only the inspected marker level and view',async({page})=>{
  109 |   const record=recordFor(page,'partnerJourney');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});
  110 |   await mounted(page,{...originState,complexity:1});
> 111 |   await page.locator(partnerSelector).click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
      |                                       ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  112 |   let state=await checkSavedWork(page,record,'partner entry');
  113 |   expect(state).toMatchObject({_activeTab:'connections',system:'muscular',complexity:1,selectedStructure:null,_expandedConn:'conn_3'});
  114 |   expect(state._connectionStudyOrigin).toMatchObject({entry:'partner',partnerSystemId:'muscular',complexity:1});
  115 |   await expect(page.locator(contextSelector+' [data-anatomy-connection-origin-return="femur"]')).toBeVisible();
  116 |   await expect(page.locator(contextSelector+' [data-anatomy-connection-return]')).toBeVisible();
  117 |   await screenshot(page,record,page.locator(contextSelector),'phone-partner-context');
  118 |   await page.locator(contextSelector+' [data-anatomy-connection-return]').click();await expect(page.locator(connectionSelector)).toBeFocused();
  119 |   await page.locator(connectionSelector+' '+markerSelector('rotator_cuff')).click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  120 |   state=await checkSavedWork(page,record,'posterior intermediate marker');expect(state).toMatchObject({system:'muscular',view:'posterior',complexity:2,selectedStructure:'rotator_cuff'});
  121 |   await page.locator(contextSelector+' [data-anatomy-connection-return]').click();await expect(page.locator(connectionSelector)).toBeFocused();
  122 |   await backToOrigin(page,'partner',1);await checkSavedWork(page,record,'partner origin restored');
  123 |   record.returnedToExactButton=true;record.markerRaisedOnlyNeededLevelAndView=true;expect(record.errors).toEqual([]);
  124 | });
  125 |
  126 | test('A saved relationship route survives a page reload and retains its latest connection answer',async({page})=>{
  127 |   const record=recordFor(page,'reloadJourney');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});
  128 |   await mounted(page,originState);await openProcess(page);
  129 |   await page.locator(connectionSelector+' [data-anatomy-connection-option="choice_0"]').click();
  130 |   await expect(page.locator(connectionSelector+' [data-anatomy-connection-feedback]')).toBeVisible();
  131 |   await page.locator(connectionSelector+' '+markerSelector('biceps')).click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  132 |   const saved=await checkSavedWork(page,record,'before reload'),answers=saved._connectionConcepts;
  133 |   expect(answers).toEqual({version:1,answers:{conn_3:'choice_0'}});
  134 |   await harness.destroy(page);await mounted(page,saved);
  135 |   await expect(page.locator(contextSelector+' [data-anatomy-connection-origin-return="femur"]')).toBeVisible();
  136 |   await expect(page.locator(connectionSelector+' [data-anatomy-connection-feedback]')).toBeVisible();
  137 |   await page.locator(contextSelector+' [data-anatomy-connection-return]').click();await expect(page.locator(connectionSelector)).toBeFocused();
  138 |   await screenshot(page,record,page.locator(panelSelector),'phone-reloaded-connection');
  139 |   await backToOrigin(page,'process');const returned=await checkSavedWork(page,record,'reload return');
  140 |   expect(returned._connectionConcepts).toEqual(answers);record.pageReloadRestoresRoute=true;expect(record.errors).toEqual([]);
  141 | });
  142 |
  143 | const displayContexts=[{width:1280,locale:'en',reading:false},{width:320,locale:'en',reading:false},{width:320,locale:'ar',reading:true}];
  144 | async function display(page:Page,context:{width:number,locale:string,reading:boolean},theme:string){
  145 |   await page.setViewportSize({width:context.width,height:1000});
  146 |   const dict=context.locale==='ar'?JSON.parse(await readFile('lang/arabic.js','utf8')):null;
  147 |   await page.evaluate(({dict,theme,reading})=>{
  148 |     document.documentElement.lang=dict?'ar':'en';document.documentElement.dir=dict?'rtl':'ltr';document.body.className=theme==='light'?'':'theme-'+theme;
  149 |     const ctx=(window as any).__ctx;ctx.t=dict?(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback:(key:string,fallback:string)=>fallback;
  150 |     ctx.updateMulti('anatomy',{_readingMode:reading});
  151 |   },{dict,theme,reading:context.reading});
  152 | }
  153 | async function scan(page:Page,record:any,selector:string,context:any,theme:string){
  154 |   const locator=page.locator(selector);await expect(locator).toBeVisible();
  155 |   const layout=await locator.evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth,left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right}));
  156 |   const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  157 |   const violations=await page.evaluate(async selector=>{
  158 |     const result=await (window as any).axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});
  159 |     return result.violations.map((item:any)=>({id:item.id,nodes:item.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));
  160 |   },selector);
  161 |   record.scans.push({...context,theme,selector,layout,dimensions,violations});
  162 |   expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);expect(layout.scroll).toBeLessThanOrEqual(layout.client+1);
  163 |   expect(layout.left).toBeGreaterThanOrEqual(0);expect(layout.right).toBeLessThanOrEqual(dimensions.width);expect(violations).toEqual([]);
  164 | }
  165 | async function targets(locator:Locator){
  166 |   const metrics=await locator.evaluateAll(elements=>elements.filter(element=>element.getClientRects().length).map(element=>({label:element.getAttribute('aria-label')||element.textContent?.trim(),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})));
  167 |   expect(metrics.length).toBeGreaterThan(0);for(const item of metrics){expect(item.width,item.label||'control').toBeGreaterThanOrEqual(44);expect(item.height,item.label||'control').toBeGreaterThanOrEqual(44);}return metrics;
  168 | }
  169 |
  170 | test('Relationship context and authored markers remain readable in every theme, phone layout, Arabic larger text and forced colors',async({page})=>{
  171 |   const record=recordFor(page,'displayMatrix');record.styles=[];
  172 |   await page.emulateMedia({reducedMotion:'reduce'});await mounted(page,originState);await openProcess(page);
  173 |   await page.locator(connectionSelector+' '+markerSelector('biceps')).click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  174 |   const bannerSelector=panelSelector+' [data-anatomy-connection-origin="femur"]';
  175 |   for(const context of displayContexts)for(const theme of ['light','dark','contrast']){
  176 |     await display(page,context,theme);
  177 |     const metrics=await page.locator(bannerSelector).evaluate(element=>{const style=getComputedStyle(element);return {left:style.borderLeftWidth,right:style.borderRightWidth,background:style.backgroundColor,textColor:style.color};});
  178 |     expect(metrics.left).toBe(context.locale==='ar'?'1px':'4px');expect(metrics.right).toBe(context.locale==='ar'?'4px':'1px');
  179 |     const text=await page.locator('.anatomy-connection-origin,.anatomy-connection-anatomy,.anatomy-connection-model-context').evaluateAll(elements=>elements.flatMap(element=>Array.from(element.querySelectorAll('p,strong,span,h6,button')).filter(node=>node.getClientRects().length).map(node=>({text:node.textContent?.trim().slice(0,90),font:parseFloat(getComputedStyle(node).fontSize)}))));
  180 |     if(context.reading)for(const item of text)expect(item.font,item.text||'larger text').toBeGreaterThanOrEqual(17);
  181 |     record.styles.push({...context,theme,...metrics,text,targets:await targets(page.locator('[data-anatomy-connection-origin-return],[data-anatomy-connection-marker],'+contextSelector+' [data-anatomy-connection-return]'))});
  182 |     for(const selector of [bannerSelector,connectionSelector,contextSelector])await scan(page,record,selector,context,theme);
  183 |     await checkSavedWork(page,record,context.locale+' '+context.width+' '+theme);
  184 |     if(context.width===320&&context.locale==='en'&&theme==='light')await screenshot(page,record,page.locator(contextSelector),'phone-marker-return');
  185 |     if(context.locale==='ar'&&theme==='dark'){
  186 |       await screenshot(page,record,page.locator(contextSelector),'phone-arabic-dark-context');
  187 |       await screenshot(page,record,page.locator('[data-anatomy-connection-anatomy="conn_3"]'),'phone-arabic-dark-markers');
  188 |       await expect(page.locator(bannerSelector+' button')).toContainText('العودة');
  189 |     }
  190 |   }
  191 |   await display(page,{width:320,locale:'en',reading:false},'light');await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  192 |   for(const selector of [bannerSelector,connectionSelector,contextSelector])await scan(page,record,selector,{width:320,locale:'en',reading:false,forcedColors:true},'forced-colors');
  193 |   await targets(page.locator('[data-anatomy-connection-origin-return],[data-anatomy-connection-marker],'+contextSelector+' [data-anatomy-connection-return]'));
  194 |   await screenshot(page,record,page.locator(contextSelector),'phone-forced-colors-context');
  195 |   await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});
  196 |   await page.locator(contextSelector+' [data-anatomy-connection-return]').click();await expect(page.locator(connectionSelector)).toBeFocused();
  197 |   await backToOrigin(page,'process');await checkSavedWork(page,record,'returned after display changes');
  198 |   expect(record.scans).toHaveLength(30);expect(record.errors).toEqual([]);
  199 | });
  200 |
```