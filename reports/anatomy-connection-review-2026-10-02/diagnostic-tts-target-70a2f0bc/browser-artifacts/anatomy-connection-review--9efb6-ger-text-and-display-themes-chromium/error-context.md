# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: anatomy-connection-review.spec.ts >> First feedback, practice feedback and the topic overview are readable across desktop, phone, Arabic larger text and display themes
- Location: tests\e2e\anatomy-connection-review.spec.ts:190:5

# Error details

```
Error: Read this connection aloud

expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 44
Received:    39.96875
```

# Test source

```ts
  73  |   await expect(page.locator('.anatomy-connection-progress')).toContainText('First answers: 1/10');
  74  |   await expect(page.locator('.anatomy-connection-progress')).toContainText('0 correct');
  75  |   expect((await anatomyState(page))._connectionConcepts).toEqual(savedFirst);
  76  | }
  77  | async function startPractice(page:Page){
  78  |   const old=(await anatomyState(page))._connectionPractice?.sessions?.conn_3?.token;
  79  |   await page.locator(practiceStartSelector).click();
  80  |   const session=(await anatomyState(page))._connectionPractice.sessions.conn_3;
  81  |   expect(session).toMatchObject({active:true,answer:null});expect(typeof session.token).toBe('string');expect(session.token.length).toBeGreaterThan(0);
  82  |   if(old)expect(session.token).not.toBe(old);
  83  |   const field=page.locator(practiceFieldSelector);await expect(field).toBeFocused();await expect(field).toHaveAttribute('data-anatomy-connection-attempt',session.token);
  84  |   await expect(field.locator('[data-anatomy-connection-option]:enabled')).toHaveCount(3);return session.token;
  85  | }
  86  | async function returnSaved(page:Page){
  87  |   await page.locator(practiceSavedSelector).click();await expect(page.locator(firstFeedbackSelector)).toBeFocused();
  88  |   await expect(page.locator(firstFeedbackSelector)).toHaveAttribute('data-anatomy-connection-response','choice_1');
  89  |   await expect(page.locator(practiceFeedbackSelector)).toHaveCount(0);
  90  | }
  91  | async function answerPractice(page:Page,token:string){
  92  |   await page.locator(practiceFieldSelector+' [data-anatomy-connection-option="choice_0"]').click();
  93  |   const feedback=page.locator(practiceFeedbackSelector);await expect(feedback).toBeVisible();await expect(feedback).toHaveAttribute('data-anatomy-connection-feedback-token',token);
  94  |   await expect(feedback).toHaveAttribute('data-anatomy-connection-response','choice_0');
  95  |   expect((await anatomyState(page))._connectionPractice.sessions.conn_3).toEqual({token,answer:'choice_0',active:true});
  96  |   expect((await anatomyState(page))._connectionConcepts).toEqual(savedFirst);
  97  | }
  98  | async function overview(page:Page){
  99  |   await page.locator('[data-anatomy-connection-all]').click();await expect(page.locator('#anatomy-connection-select')).toBeFocused();
  100 |   await expect(page.locator(panelSelector+' [data-anatomy-connection]:visible')).toHaveCount(10);
  101 |   await expect(page.locator(panelSelector+' [data-anatomy-connection][hidden]')).toHaveCount(0);
  102 |   await expect(page.locator(panelSelector+' [data-anatomy-connection-open="true"]')).toHaveCount(0);
  103 |   await expect(page.locator('#anatomy-connection-select')).toHaveValue('');
  104 | }
  105 | async function capture(page:Page,record:any,locator:Locator,name:string){
  106 |   await expect(locator).toBeVisible();const width=page.viewportSize()!.width,box=await locator.boundingBox();if(!box)throw Error('No screenshot target: '+name);
  107 |   await page.setViewportSize({width,height:Math.ceil(box.height+200)});
  108 |   try{
  109 |     await locator.evaluate(element=>scrollTo(0,Math.max(0,element.getBoundingClientRect().top+scrollY-70)));
  110 |     const clip=await locator.evaluate(element=>{const rect=element.getBoundingClientRect(),x=Math.max(0,Math.floor(rect.left-6)),y=Math.max(0,Math.floor(rect.top-6));return {x,y,width:Math.min(innerWidth,Math.ceil(rect.right+6))-x,height:Math.min(innerHeight,Math.ceil(rect.bottom+6))-y};});
  111 |     expect(clip.width).toBeGreaterThan(0);expect(clip.height).toBeGreaterThan(0);await page.screenshot({path:captures+'/'+name+'.png',clip});record.captures.push(name+'.png');
  112 |   }finally{await page.setViewportSize({width,height:1000});}
  113 | }
  114 | 
  115 | test('A wrong first response stays recorded while correct practice and returning to saved feedback preserve other work',async({page})=>{
  116 |   const record=recordFor(page,'firstAndPractice');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:1000});await mounted(page,selectedState);await oneTopic(page);
  117 |   await expect(page.locator(articleSelector+' [data-anatomy-connection-attempt="first"]')).toBeVisible();
  118 |   await page.locator(articleSelector+' [data-anatomy-connection-option="choice_1"]').click();
  119 |   await expect(page.locator(firstFeedbackSelector)).toHaveAttribute('data-anatomy-connection-response','choice_1');await firstSummary(page);await checkWork(page,record,'wrong first answer');
  120 |   const token=await startPractice(page);await answerPractice(page,token);await firstSummary(page);await checkWork(page,record,'correct practice answer');
  121 |   await capture(page,record,page.locator(panelSelector),'desktop-practice-feedback');
  122 |   await returnSaved(page);let state=await checkWork(page,record,'saved first feedback');expect(state._connectionPractice.sessions.conn_3).toEqual({token,answer:'choice_0',active:false});await firstSummary(page);
  123 |   await capture(page,record,page.locator(firstFeedbackSelector),'desktop-saved-first-feedback');
  124 |   const nextToken=await startPractice(page);expect(nextToken).not.toBe(token);await firstSummary(page);await checkWork(page,record,'fresh practice question');expect(record.errors).toEqual([]);
  125 | });
  126 | 
  127 | test('An unfinished review persists across topics, overview, markers, activities and reload, and its answer survives another reload',async({page})=>{
  128 |   const record=recordFor(page,'persistentReview');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});await mounted(page,originState);
  129 |   await page.locator('[data-anatomy-relationship-process="conn_3"]').click();await expect(page.locator(articleSelector)).toBeFocused();await oneTopic(page);
  130 |   const token=await startPractice(page);await page.locator('#anatomy-connection-select').selectOption('conn_1');await oneTopic(page,'conn_1');await overview(page);
  131 |   expect((await anatomyState(page))._connectionPractice.sessions.conn_3).toEqual({token,answer:null,active:true});
  132 |   await page.locator('#anatomy-connection-select').selectOption('conn_3');await oneTopic(page);await expect(page.locator(practiceFieldSelector)).toHaveAttribute('data-anatomy-connection-attempt',token);
  133 |   await page.locator(articleSelector+' [data-anatomy-connection-marker="biceps"][data-anatomy-connection-marker-system="muscular"]').click();await expect(page.locator('[data-anatomy-model-shell]')).toBeFocused();
  134 |   await checkWork(page,record,'marker detour');expect((await anatomyState(page))._connectionPractice.sessions.conn_3).toEqual({token,answer:null,active:true});
  135 |   await page.locator('.anatomy-connection-model-context [data-anatomy-connection-return]').click();await expect(page.locator(articleSelector)).toBeFocused();
  136 |   await page.locator('#anatomy-mobile-activity').selectOption('explore');await page.locator('#anatomy-mobile-activity').selectOption('connections');await oneTopic(page);
  137 |   let state=await checkWork(page,record,'activity return');expect(state._connectionPractice.sessions.conn_3).toEqual({token,answer:null,active:true});
  138 |   await harness.destroy(page);await mounted(page,state);await oneTopic(page);await expect(page.locator(practiceFieldSelector)).toHaveAttribute('data-anatomy-connection-attempt',token);
  139 |   await expect(page.locator(practiceFieldSelector+' [data-anatomy-connection-option]:enabled')).toHaveCount(3);await answerPractice(page,token);state=await checkWork(page,record,'answered after reload');
  140 |   await harness.destroy(page);await mounted(page,state);await oneTopic(page);await expect(page.locator(practiceFeedbackSelector)).toHaveAttribute('data-anatomy-connection-feedback-token',token);
  141 |   await expect(page.locator(practiceFeedbackSelector)).toHaveAttribute('data-anatomy-connection-response','choice_0');await firstSummary(page);
  142 |   await capture(page,record,page.locator(panelSelector),'phone-reloaded-practice');await returnSaved(page);await checkWork(page,record,'saved feedback after reload');expect(record.errors).toEqual([]);
  143 | });
  144 | 
  145 | test('The compact overview and topic picker retain first-answer statuses and put focus on the topic chooser',async({page})=>{
  146 |   const record=recordFor(page,'topicNavigation');await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:1000});await mounted(page,{...selectedState,_connectionConcepts:savedFirst});
  147 |   await oneTopic(page);await expect(page.locator('#anatomy-connection-select option[value="conn_3"]')).toContainText('Review first answer');
  148 |   await overview(page);await expect(page.locator('[data-anatomy-connection="conn_3"] [data-anatomy-connection-first-status="review"]')).toBeVisible();
  149 |   await expect(page.locator(panelSelector+' [data-anatomy-connection-first-status="unanswered"]')).toHaveCount(9);await capture(page,record,page.locator(panelSelector),'phone-topic-overview');
  150 |   await page.locator('[data-anatomy-connection-toggle="conn_3"]').click();await oneTopic(page);await expect(page.locator(articleSelector)).toBeFocused();
  151 |   await page.locator('#anatomy-connection-select').selectOption('');await expect(page.locator('#anatomy-connection-select')).toBeFocused();
  152 |   await expect(page.locator(panelSelector+' [data-anatomy-connection]:visible')).toHaveCount(10);await checkWork(page,record,'empty chooser opens overview');expect(record.errors).toEqual([]);
  153 | });
  154 | 
  155 | const displays=[{width:1280,locale:'en',reading:false},{width:320,locale:'en',reading:false},{width:320,locale:'ar',reading:true}];
  156 | async function display(page:Page,context:{width:number,locale:string,reading:boolean},theme:string){
  157 |   await page.setViewportSize({width:context.width,height:1000});const dict=context.locale==='ar'?JSON.parse(await readFile('lang/arabic.js','utf8')):null;
  158 |   await page.evaluate(({dict,theme,reading})=>{document.documentElement.lang=dict?'ar':'en';document.documentElement.dir=dict?'rtl':'ltr';document.body.className=theme==='light'?'':'theme-'+theme;const ctx=(window as any).__ctx;ctx.t=dict?(key:string,fallback:string)=>key.split('.').reduce((node:any,part:string)=>node?.[part],dict)||fallback:(key:string,fallback:string)=>fallback;ctx.updateMulti('anatomy',{_readingMode:reading});},{dict,theme,reading:context.reading});
  159 | }
  160 | async function scan(page:Page,record:any,context:any,theme:string,view:string){
  161 |   const panel=page.locator(panelSelector);await expect(panel).toBeVisible();
  162 |   const layout=await panel.evaluate(element=>({client:element.clientWidth,scroll:element.scrollWidth,height:element.getBoundingClientRect().height,left:element.getBoundingClientRect().left,right:element.getBoundingClientRect().right}));
  163 |   const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  164 |   const violations=await page.evaluate(async selector=>{const result=await (window as any).axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return result.violations.map((item:any)=>({id:item.id,nodes:item.nodes.map((node:any)=>({target:node.target,summary:node.failureSummary}))}));},panelSelector);
  165 |   record.scans.push({...context,theme,view,layout,dimensions,violations});expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);expect(layout.scroll).toBeLessThanOrEqual(layout.client+1);expect(layout.left).toBeGreaterThanOrEqual(0);expect(layout.right).toBeLessThanOrEqual(dimensions.width);expect(violations).toEqual([]);
  166 | }
  167 | async function readable(page:Page,reading:boolean){
  168 |   const metrics=await page.locator(articleSelector).evaluate(element=>Array.from(element.querySelectorAll('p,fieldset legend,fieldset button,[data-anatomy-connection-feedback-kind] :is(strong,h6),[data-anatomy-connection-practice-start],[data-anatomy-connection-practice-saved]')).filter(node=>node.getClientRects().length).map(node=>({text:node.textContent?.trim().slice(0,90),font:parseFloat(getComputedStyle(node).fontSize)})));
  169 |   expect(metrics.length).toBeGreaterThan(0);for(const item of metrics)expect(item.font,item.text||'reading text').toBeGreaterThanOrEqual(reading?17:16);return metrics;
  170 | }
  171 | async function targets(page:Page){
  172 |   const metrics=await page.locator(panelSelector+' button,'+panelSelector+' select').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length).map(element=>({label:element.getAttribute('aria-label')||element.textContent?.trim().slice(0,100),width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})));
> 173 |   expect(metrics.length).toBeGreaterThan(0);for(const item of metrics){expect(item.width,item.label||'control').toBeGreaterThanOrEqual(44);expect(item.height,item.label||'control').toBeGreaterThanOrEqual(44);}return metrics;
      |                                                                                                                 ^ Error: Read this connection aloud
  174 | }
  175 | async function contrast(page:Page,selector:string){
  176 |   const metrics=await page.locator(selector).evaluateAll(elements=>elements.filter(element=>element.getClientRects().length).map(element=>{
  177 |     const foreground=getComputedStyle(element).color;let parent:Element|null=element,background='rgb(255, 255, 255)';
  178 |     while(parent){const candidate=getComputedStyle(parent).backgroundColor,numbers=candidate.match(/[\d.]+/g)?.map(Number);if(numbers&&numbers.length>=3&&(numbers.length===3||numbers[3]!==0)){background=candidate;break;}parent=parent.parentElement;}
  179 |     const luminance=(value:string)=>value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(component=>component/255).map(component=>component<=0.04045?component/12.92:Math.pow((component+0.055)/1.055,2.4)).reduce((total,component,index)=>total+component*[0.2126,0.7152,0.0722][index],0);
  180 |     const first=luminance(foreground),second=luminance(background);return {label:element.textContent?.trim().slice(0,100),foreground,background,ratio:(Math.max(first,second)+0.05)/(Math.min(first,second)+0.05)};
  181 |   }));expect(metrics.length).toBeGreaterThan(0);for(const item of metrics)expect(item.ratio,item.label+' actual contrast').toBeGreaterThanOrEqual(4.5);return metrics;
  182 | }
  183 | async function labelPixels(page:Page,record:any,selector:string,name:string){
  184 |   const button=page.locator(selector);await button.scrollIntoViewIfNeeded();
  185 |   const bounds=await button.evaluate(element=>{const range=document.createRange();range.selectNodeContents(element);const rect=range.getBoundingClientRect();return {left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom};});
  186 |   const clip={x:Math.ceil(bounds.left)+2,y:Math.ceil(bounds.top)+2,width:Math.floor(bounds.right)-Math.ceil(bounds.left)-4,height:Math.floor(bounds.bottom)-Math.ceil(bounds.top)-4};expect(clip.width).toBeGreaterThan(30);expect(clip.height).toBeGreaterThan(6);
  187 |   const metrics=pixelStats(readPng(await page.screenshot({path:captures+'/'+name+'.png',clip})));record.labelPixels.push({name,...metrics});record.captures.push(name+'.png');expect(metrics.significantColors,'button label has letter strokes').toBeGreaterThanOrEqual(2);expect(metrics.dominantShare,'button label is not a flat backplate').toBeLessThan(0.95);
  188 | }
  189 | 
  190 | test('First feedback, practice feedback and the topic overview are readable across desktop, phone, Arabic larger text and display themes',async({page})=>{
  191 |   const record=recordFor(page,'displayMatrix');record.styles=[];record.labelPixels=[];await page.emulateMedia({reducedMotion:'reduce'});await mounted(page,{...selectedState,_connectionConcepts:savedFirst});
  192 |   for(const context of displays)for(const theme of ['light','dark','contrast']){
  193 |     await display(page,context,theme);await page.locator('#anatomy-connection-select').selectOption('conn_3');
  194 |     if((await anatomyState(page))._connectionPractice?.sessions?.conn_3?.active)await returnSaved(page);
  195 |     await oneTopic(page);const firstStyles={text:await readable(page,context.reading),targets:await targets(page),contrast:await contrast(page,firstFeedbackSelector+' :is(p,strong,h6),'+practiceStartSelector)};
  196 |     await scan(page,record,context,theme,'first');
  197 |     if(context.width===320&&context.locale==='en'&&theme==='light')await capture(page,record,page.locator(panelSelector),'phone-focused-first-feedback');
  198 |     const token=await startPractice(page);await answerPractice(page,token);
  199 |     const practiceStyles={text:await readable(page,context.reading),targets:await targets(page),contrast:await contrast(page,practiceFeedbackSelector+' :is(p,strong,h6),'+practiceSavedSelector)};
  200 |     await scan(page,record,context,theme,'practice');
  201 |     if(context.width===1280&&theme==='light')await capture(page,record,page.locator(practiceFeedbackSelector),'desktop-practice-detail');
  202 |     if(context.locale==='ar'&&theme==='dark')await capture(page,record,page.locator(practiceFeedbackSelector),'phone-arabic-dark-practice');
  203 |     await overview(page);const overviewTargets=await targets(page);await scan(page,record,context,theme,'overview');
  204 |     if(context.locale==='ar'&&theme==='dark')await capture(page,record,page.locator(panelSelector),'phone-arabic-dark-overview');
  205 |     const state=await checkWork(page,record,context.locale+' '+context.width+' '+theme);expect(state._connectionConcepts).toEqual(savedFirst);record.styles.push({...context,theme,first:firstStyles,practice:practiceStyles,overviewTargets});
  206 |   }
  207 |   await display(page,{width:320,locale:'en',reading:false},'light');await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await page.locator('#anatomy-connection-select').selectOption('conn_3');if((await anatomyState(page))._connectionPractice.sessions.conn_3.active)await returnSaved(page);
  208 |   const forced={width:320,locale:'en',reading:false,forcedColors:true};record.forcedFirstContrast=await contrast(page,firstFeedbackSelector+' :is(p,strong,h6),'+practiceStartSelector);await scan(page,record,forced,'forced-colors','first');await capture(page,record,page.locator(firstFeedbackSelector),'phone-forced-first-feedback');await labelPixels(page,record,practiceStartSelector,'phone-forced-practice-start-label');
  209 |   const token=await startPractice(page);await answerPractice(page,token);record.forcedPracticeContrast=await contrast(page,practiceFeedbackSelector+' :is(p,strong,h6),'+practiceSavedSelector);await scan(page,record,forced,'forced-colors','practice');await capture(page,record,page.locator(practiceFeedbackSelector),'phone-forced-practice-feedback');await labelPixels(page,record,practiceSavedSelector,'phone-forced-saved-feedback-label');
  210 |   await overview(page);await targets(page);await scan(page,record,forced,'forced-colors','overview');await capture(page,record,page.locator(panelSelector),'phone-forced-overview');await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});await checkWork(page,record,'display matrix finished');expect(record.scans).toHaveLength(30);expect(record.errors).toEqual([]);
  211 | });
  212 | 
```