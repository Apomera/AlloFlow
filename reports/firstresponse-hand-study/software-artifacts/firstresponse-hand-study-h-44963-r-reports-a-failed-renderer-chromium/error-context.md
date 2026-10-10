# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-hand-study.spec.ts >> hand study remains usable when the body viewer reports a failed renderer
- Location: tests\e2e\firstresponse-hand-study.spec.ts:164:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

Expected: []
Received: undefined
```

# Test source

```ts
  75  | }
  76  | async function action(page:Page,label:string,pose:number,expected:any,keyboard:boolean){const before=await probe(page),evidenceButton=page.getByRole('button',{name:label,exact:true});
  77  |   if(keyboard && before.state.b3dRecView!==pose){
  78  |     await evidenceButton.scrollIntoViewIfNeeded();const hidden=await page.locator('.fr-body3d-stage').boundingBox();expect(hidden).toBeTruthy();
  79  |     expect(hidden!.y+hidden!.height).toBeLessThan(0);
  80  |     await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  81  |   }
  82  |   await activate(page,evidenceButton,keyboard);
  83  |   const stage=page.locator('.fr-body3d-stage');await expect(stage).toBeFocused();
  84  |   const box=await stage.boundingBox();expect(box).toBeTruthy();const viewport=page.viewportSize()!;
  85  |   expect(box!.y).toBeGreaterThanOrEqual(-1);expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height+1);
  86  |   await settle(page);
  87  |   const after=await probe(page);valid(after);expect(after.state).toEqual({...before.state,b3dRecView:pose});expect(after.camera).toEqual(expected.camera);
  88  |   expect(geometry(after)).toEqual(geometry(expected));expect(materials(after)).toEqual(materials(expected));expect(after.lights).toEqual(expected.lights);
  89  |   expect(after.nodeCount).toBe(expected.nodeCount);expect(after.draw.calls).toBe(expected.draw.calls);expect(after.draw.triangles).toBe(expected.draw.triangles);
  90  |   if(before.state.b3dRecView===pose)unchangedScene(after,before);return after;
  91  | }
  92  | async function capture(page:Page,name:string,details:Locator){await settle(page);const image=await harness.glPixels(page,'#wrap');expect(image).toBeTruthy();writeFileSync(report+'/'+name+'-gl.png',image!.png);
  93  |   await settle(page);let clip=await page.locator('.fr-body3d-stage').boundingBox();expect(clip).toBeTruthy();await page.screenshot({path:report+'/'+name+'-stage.png',clip:clip!,timeout:60000});
  94  |   await details.screenshot({path:report+'/'+name+'-study.png',timeout:60000});
  95  | }
  96  | async function audit(page:Page,name:string){await page.addScriptTag({content:axe});const result=await page.evaluate(async()=>{
  97  |   const options={runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},rules:matchMedia('(forced-colors:active)').matches?{'color-contrast':{enabled:false}}:{}};
  98  |   const reports=[];for(const scope of ['.fr-hand-inspection','details.fr-hand-study']){
  99  |     const report=await(window as any).axe.run(scope,options);reports.push({scope,violations:report.violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)}))});}
  100 |   return reports;
  101 | });writeFileSync(report+'/'+name+'-axe.json',JSON.stringify(result,null,2));for(const item of result)expect(item.violations,item.scope).toEqual([]);
  102 |   expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);expect(errors.get(page)).toEqual([]);
  103 | }
  104 | async function release(page:Page){expect(await page.locator('#wrap canvas').count()).toBe(1);
  105 |   expect((await harness.glContexts(page)).filter(r=>r.connected&&r.inWrap&&!r.lost)).toHaveLength(1);
  106 |   await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await page.locator('#wrap canvas').count()).toBe(0);expect(errors.get(page)).toEqual([]);
  107 | }
  108 | async function workflow(page:Page,age:string,width:number,keyboard:boolean){
  109 |   await mount(page,age,width);const original=await probe(page),details=await openStudy(page,keyboard),prefix=age==='infant'?'phone-infant':age;
  110 |   const note='I followed the same palm folds through both poses; the supporting hand stays beside the cheek.';
  111 |   const record=await fillStudy(page,details,note,keyboard);await settle(page);const assessed=await probe(page);
  112 |   unchangedScene(assessed,original);expect(assessed.camera).toEqual(original.camera);
  113 |   const expected:any={};
  114 |   for(const pose of [4,5]){await page.getByLabel('Pose to inspect',{exact:true}).selectOption(String(pose));await settle(page);
  115 |     expected['near'+pose]=await direct(page,'Palm detail view',keyboard);expected['support'+pose]=await direct(page,'Supporting hand close-up',keyboard);
  116 |     expect(expected['near'+pose].camera).not.toEqual(expected['support'+pose].camera);
  117 |     await action(page,pose===4?'Near palm before turn':'Near palm after turn',pose,expected['near'+pose],keyboard);
  118 |     await action(page,pose===4?'Supporting hand before turn':'Supporting hand after turn',pose,expected['support'+pose],keyboard);
  119 |     await action(page,pose===4?'Inspect before the turn':'Inspect after the turn',pose,expected['near'+pose],keyboard);
  120 |   }
  121 |   // Exercise queued pose changes and the same-pose hand switch separately.
  122 |   await action(page,'Near palm before turn',4,expected.near4,keyboard);
  123 |   await action(page,'Supporting hand after turn',5,expected.support5,keyboard);
  124 |   await action(page,'Near palm after turn',5,expected.near5,keyboard);
  125 |   await action(page,'Supporting hand before turn',4,expected.support4,keyboard);
  126 |   const beforeGuides=await probe(page),saved=learning(beforeGuides.state);await page.evaluate(()=>(window as any).__ctx.updateMulti('firstResponse',{b3dRecoveryGuides:true}));await settle(page);
  127 |   const guides=await probe(page);expect(learning(guides.state)).toEqual(saved);expect(guides.state.b3dHandStudy[age]).toEqual(record);
  128 |   await page.evaluate(()=>(window as any).__ctx.updateMulti('firstResponse',{b3dRecoveryGuides:false,b3dRecView:8}));await settle(page);
  129 |   const later=await direct(page,'Supporting hand close-up',keyboard);expect(learning(later.state)).toEqual(saved);await expect(details.getByRole('textbox',{name:'Explain your hand comparison',exact:true})).toHaveValue(note);
  130 |   const summary=details.locator('summary');if(keyboard){await summary.focus();await page.keyboard.press('Enter');}else await summary.click();
  131 |   await expect(details).not.toHaveAttribute('open','');expect((await state(page)).b3dHandStudy[age]).toEqual(record);await openStudy(page,keyboard);
  132 |   await expect(details.getByRole('textbox',{name:'Explain your hand comparison',exact:true})).toHaveValue(note);await capture(page,prefix+'-checked',details);
  133 | 
  134 |   const otherAge=age==='adult'?'child':age==='child'?'infant':'adult';
  135 |   await page.evaluate(other=>(window as any).__ctx.updateMulti('firstResponse',{b3dAge:other}),otherAge);await settle(page);const otherDetails=await openStudy(page,keyboard);
  136 |   const otherNote='A separate '+otherAge+' observation.';await otherDetails.getByRole('textbox',{name:'Explain your hand comparison',exact:true}).fill(otherNote);
  137 |   const otherRecord=(await state(page)).b3dHandStudy[otherAge];expect(otherRecord.note).toBe(otherNote);expect((await state(page)).b3dHandStudy[age]).toEqual(record);
  138 |   await page.evaluate(primary=>(window as any).__ctx.updateMulti('firstResponse',{b3dAge:primary}),age);await settle(page);await openStudy(page,keyboard);
  139 |   await expect(details.getByRole('textbox',{name:'Explain your hand comparison',exact:true})).toHaveValue(note);
  140 |   const beforeReset=await probe(page);await activate(page,details.getByRole('button',{name:'Reset this hand study',exact:true}),keyboard);await settle(page);const reset=await probe(page);
  141 |   unchangedScene(reset,beforeReset);expect(reset.camera).toEqual(beforeReset.camera);expect(reset.state.b3dHandStudy[otherAge]).toEqual(otherRecord);
  142 |   const resetStudy={...beforeReset.state.b3dHandStudy};delete resetStudy[age];expect(reset.state).toEqual({...beforeReset.state,b3dHandStudy:resetStudy});expect(reset.state.b3dHandStudy[age]).toBeUndefined();
  143 |   await expect(details.getByRole('textbox',{name:'Explain your hand comparison',exact:true})).toHaveValue('');await fillStudy(page,details,note,keyboard);await settle(page);
  144 | 
  145 |   if(keyboard){const narrow=await direct(page,'Supporting hand close-up',true),ids=resources(narrow);
  146 |     await page.setViewportSize({width:760,height:840});await settle(page);const wide=await probe(page);expect(resources(wide)).toEqual(ids);expect(geometry(wide)).toEqual(geometry(narrow));expect(materials(wide)).toEqual(materials(narrow));expect(wide.state).toEqual(narrow.state);
  147 |     await page.setViewportSize({width:320,height:840});await settle(page);const restored=await probe(page);expect(resources(restored)).toEqual(ids);expect(restored.state).toEqual(narrow.state);
  148 |     for(let axis=0;axis<3;axis++)expect(restored.camera.position[axis]).toBeCloseTo(narrow.camera.position[axis],6);
  149 |     await page.emulateMedia({forcedColors:'active'});await openStudy(page,true);await audit(page,prefix+'-forced-colors');await capture(page,prefix+'-forced-colors',details);await page.emulateMedia({forcedColors:'none'});
  150 |   }
  151 |   const beforeContrast=await direct(page,'Supporting hand close-up',keyboard),oldCanvas=await page.locator('#wrap canvas').elementHandle();
  152 |   await page.evaluate(()=>{(window as any).__ctx.isContrast=true;(window as any).__rerender();});await settle(page);
  153 |   await expect.poll(async()=>oldCanvas!.evaluate(element=>(window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  154 |   const contrasted=await direct(page,'Supporting hand close-up',keyboard);valid(contrasted);expect(contrasted.state).toEqual(beforeContrast.state);expect(geometry(contrasted)).toEqual(geometry(beforeContrast));
  155 |   expect(contrasted.draw.calls).toBe(beforeContrast.draw.calls);expect(contrasted.draw.triangles).toBe(beforeContrast.draw.triangles);
  156 |   await openStudy(page,keyboard);await expect(details.getByRole('textbox',{name:'Explain your hand comparison',exact:true})).toHaveValue(note);await audit(page,prefix+'-final');await capture(page,prefix+'-contrast',details);
  157 |   writeFileSync(report+'/'+prefix+'-final-evidence.json',JSON.stringify({startingSourceSha,record,otherRecord,beforeContrast,contrasted},null,2));
  158 |   metrics.push({age,width,record,otherRecord,nativeCameraComparisons:10,draw:contrasted.draw});await release(page);
  159 | }
  160 | test('adult hand study keeps observations through real hand camera comparisons',async({page})=>{await workflow(page,'adult',1280,false);});
  161 | test('child hand study keeps observations through real hand camera comparisons',async({page})=>{await workflow(page,'child',1280,false);});
  162 | test('320px infant hand study preserves keyboard choices resize forced colors and cleanup',async({page})=>{await workflow(page,'infant',320,true);});
  163 | 
  164 | test('hand study remains usable when the body viewer reports a failed renderer',async({page})=>{
  165 |   await page.route('**/stem_lab/stem_lab_module.js',route=>route.fulfill({status:200,contentType:'application/javascript',body:hostSource+`
  166 | 
  167 |     window.__handStudyFallbackCalls=[];
  168 |     window.StemLab.makeBayViewer=function(){return {attach:function(){},sync:function(){},status:function(){return 'failed';},
  169 |       reset:function(){},nudge:function(){},zoom:function(){},focus:function(){window.__handStudyFallbackCalls.push('focus');return false;}};`}));
  170 |   await page.setViewportSize({width:320,height:840});await page.emulateMedia({reducedMotion:'reduce'});
  171 |   await harness.mount(page,{firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'recovery',b3dAge:'adult',b3dRec:completed,b3dRecView:5,b3dStatus:'failed'}},undefined,{expectCanvas:false});
  172 |   await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});
  173 |   const details=await openStudy(page,true);for(const label of ['Near palm before turn','Near palm after turn','Supporting hand before turn','Supporting hand after turn'])await expect(details.getByRole('button',{name:label,exact:true})).toBeEnabled();
  174 |   const record=await fillStudy(page,details,'I can compare the descriptions while the model loads.',true);expect(record.checked).toBe(true);
> 175 |   const beforeEvidence=await state(page);await activate(page,details.getByRole('button',{name:'Near palm before turn',exact:true}),true);expect(await state(page)).toEqual({...beforeEvidence,b3dRecView:4});await activate(page,details.getByRole('button',{name:'Supporting hand after turn',exact:true}),true);expect(await state(page)).toEqual({...beforeEvidence,b3dRecView:5});expect(await page.evaluate(()=>(window as any).__handStudyFallbackCalls)).toEqual([]);expect((await harness.glContexts(page)).filter(r=>r.createdBy==='page' && !r.lost)).toEqual([]);
      |                                                                                                                                                                                                                                                                                                                                                                                                                                                                 ^ Error: expect(received).toEqual(expected) // deep equality
  176 |   await audit(page,'fallback');const clip=await details.boundingBox();expect(clip).toBeTruthy();await details.screenshot({path:report+'/fallback-study.png',timeout:60000});
  177 |   metrics.push({condition:'fallback',record});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
  178 | });
  179 | 
```