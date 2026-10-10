# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-hand-study.spec.ts >> child hand study keeps observations through real hand camera comparisons
- Location: tests\e2e\firstresponse-hand-study.spec.ts:161:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 2
+ Received  + 2

  Object {
-   "calls": 79,
+   "calls": 20,
    "geometries": 77,
    "programs": 3,
-   "triangles": 100712,
+   "triangles": 18056,
  }
```

# Test source

```ts
  1   | import { expect,test,type Page,type Locator } from '@playwright/test';
  2   | import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
  3   | import { createHash } from 'node:crypto';
  4   | import { GlHarness } from './helpers/stem_gl_harness';
  5   | const report=process.env.FIRST_RESPONSE_HAND_STUDY_REPORT || 'reports/firstresponse-hand-study';
  6   | const startingSourceSha="970fbb0e068412f3d3e3fb4ed01013a1afb56b9d5270fb2eb18d24201bfd012c";
  7   | const finalSourceSha='c86f55dea845a8ca03f0fe8385edb85ce051ad71d2b5a2d244884cab56acf367';
  8   | const axe=readFileSync('node_modules/axe-core/axe.min.js','utf8');
  9   | const hostSource=readFileSync('stem_lab/stem_lab_module.js','utf8');
  10  | const completed=['check','arm','hand','knee','roll','airway','stable','watch'];
  11  | const nearLegend='After the turn, which side of the near hand stays facing upward?';
  12  | const supportLegend='As the body turns, which surface of the supporting hand stays beside the cheek?';
  13  | const nearFeedback='The palm side stays facing upward in poses 4 and 5. Its folds help you follow the same surface.';
  14  | const supportFeedback='The back of the supporting hand stays beside the cheek in poses 4 and 5. Its palm folds face outward.';
  15  | const metrics:Record<string,unknown>[]=[];
  16  | const errors=new WeakMap<Page,string[]>();
  17  | const harness=new GlHarness({toolFile:'stem_lab/stem_tool_firstresponse.js',toolId:'firstResponse',preScripts:['stem_lab/stem_lab_module.js'],
  18  |   width:1160,height:1080,layout:'document',appStyles:true,probes:"window.__finishDraws=new WeakMap();window.__finishIds=new WeakMap();window.__finishNextId=0;\n    function finishId(object){if(!object)return null;var id=window.__finishIds.get(object);if(!id){id=++window.__finishNextId;window.__finishIds.set(object,id);}return id;}\n    var FinishRenderer=THREE.WebGLRenderer;\n    THREE.WebGLRenderer=new Proxy(FinishRenderer,{construct:function(target,args,newTarget){\n      var renderer=Reflect.construct(target,args,newTarget),render=renderer.render;\n      renderer.render=function(scene,camera){var result=render.apply(this,arguments);\n        if(scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')){\n          var previous=window.__finishDraws.get(this.domElement);\n          window.__finishDraws.set(this.domElement,{scene:scene,camera:camera,renderer:renderer,calls:renderer.info.render.calls,\n            triangles:renderer.info.render.triangles,sequence:(previous?previous.sequence:0)+1});\n        }return result;\n      };return renderer;\n    }});\n    function finishVisible(object){for(var parent=object;parent;parent=parent.parent)if(!parent.visible)return false;return true;}\n    function finishHash(arrays){var hash=2166136261;arrays.filter(Boolean).forEach(function(array){var bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);\n      for(var i=0;i<bytes.length;i++)hash=Math.imul(hash^bytes[i],16777619);});return ('00000000'+(hash>>>0).toString(16)).slice(-8);}\n    window.__finishProbe=function(){\n      var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__finishDraws.get(canvas),record=canvas && window.__glRecorder.forCanvas(canvas);\n      if(!record || !drawn)return null;var scene=drawn.scene,camera=drawn.camera;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);\n      var skin=scene.getObjectByName('fr-manikin-head').material,parts=[],nodes=0,lights=[];\n      scene.traverse(function(mesh){nodes++;if(mesh.isLight)lights.push([mesh.name,mesh.type,mesh.color.toArray(),mesh.intensity,mesh.position.toArray()]);\n        if(!mesh.isMesh || !mesh.geometry.attributes.position)return;\n        var g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,index=g.index,mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];\n        var total=index?index.count:p.count,start=g.drawRange.start,end=Math.min(total,start+g.drawRange.count);\n        parts.push({name:mesh.name,skin:mesh.material===skin,visible:finishVisible(mesh),fingerprint:finishHash([p.array,n && n.array,index && index.array]),\n          matrix:mesh.matrixWorld.elements.slice(),drawRange:[start,end-start],\n          resources:[finishId(mesh),finishId(g),finishId(p),finishId(p.array),finishId(n),finishId(n && n.array),finishId(index),finishId(index && index.array)].concat(mats.map(finishId)),\n          materials:mats.map(function(m){return {name:m.name,type:m.type,color:m.color.toArray(),specular:m.specular?m.specular.toArray():null,shininess:m.shininess,\n            opacity:m.opacity,transparent:m.transparent,depthTest:m.depthTest,depthWrite:m.depthWrite,side:m.side,\n            patientContour:m.userData.frPatientContourStrength?m.userData.frPatientContourStrength.value:null,\n            rescuerContour:m.userData.frContourStrength?m.userData.frContourStrength.value:null};})});\n      });\n      return {parts:parts,nodeCount:nodes,lights:lights,skin:{id:finishId(skin),color:skin.color.toArray(),specular:skin.specular?skin.specular.toArray():null,\n          type:skin.type,shininess:skin.shininess},\n        camera:{position:camera.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},\n        canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],\n        draw:{id:record.id,draws:record.draws,sequence:drawn.sequence,createdBy:record.createdBy,calls:drawn.calls,triangles:drawn.triangles,\n          geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length},\n        state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)),errors:window.__events.errors.slice()};\n    };\n"});
  19  | test.describe.configure({mode:'default',retries:0,timeout:480000});
  20  | test.beforeAll(async()=>{expect(createHash('sha256').update(readFileSync('stem_lab/stem_tool_firstresponse.js')).digest('hex')).toBe(finalSourceSha);mkdirSync(report,{recursive:true});await harness.start();});
  21  | test.afterAll(async()=>{writeFileSync(report+'/hand-study-metrics.json',JSON.stringify({startingSourceSha,finalSourceSha,metrics},null,2));await harness.stop();});
  22  | test.beforeEach(async({page})=>{const found:string[]=[];errors.set(page,found);page.on('pageerror',error=>found.push('page: '+error.message));
  23  |   page.on('console',message=>{if(message.type()==='error')found.push('console: '+message.text());});});
  24  | test.afterEach(async({page})=>{await harness.destroy(page);});
  25  | 
  26  | async function settle(page:Page){
  27  |   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  28  |   await page.locator('.fr-body3d-stage').evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant' as ScrollBehavior}));
  29  |   const previous=await page.evaluate(()=>{const canvas=document.querySelector('#wrap canvas'),runtime=window as any;
  30  |     return {id:runtime.__glRecorder.forCanvas(canvas)?.id || 0,sequence:runtime.__finishDraws.get(canvas)?.sequence || 0};});
  31  |   await page.waitForFunction(previous=>{const canvas=document.querySelector('#wrap canvas'),runtime=window as any;
  32  |     const record=runtime.__glRecorder.forCanvas(canvas),drawn=runtime.__finishDraws.get(canvas);
  33  |     return record && drawn && drawn.sequence>=(record.id===previous.id?previous.sequence+2:2);},previous);
  34  | }
  35  | async function probe(page:Page):Promise<any>{const h=await page.waitForFunction(()=>(window as any).__finishProbe());try{return await h.jsonValue();}finally{await h.dispose();}}
  36  | async function state(page:Page):Promise<any>{return page.evaluate(()=>JSON.parse(JSON.stringify((window as any).__ctx.toolData.firstResponse)));}
  37  | const geometry=(pose:any)=>pose.parts.map((p:any)=>[p.name,p.fingerprint,p.matrix,p.drawRange,p.visible]);
  38  | const materials=(pose:any)=>pose.parts.map((p:any)=>[p.name,p.materials]);
  39  | const resources=(pose:any)=>({all:pose.parts.map((p:any)=>p.resources),skin:pose.skin.id,canvas:pose.draw.id,nodes:pose.nodeCount});
  40  | const drawShape=(pose:any)=>({calls:pose.draw.calls,triangles:pose.draw.triangles,geometries:pose.draw.geometries,programs:pose.draw.programs});
  41  | const learning=(s:any)=>({rec:s.b3dRec,depth:s.b3dDepthLab,reference:s.b3dDepthReference,inquiry:s.b3dDepthInquiry,hands:s.b3dChildHands,placed:s.b3dPlaced,study:s.b3dHandStudy});
  42  | function valid(pose:any){expect(pose.draw.createdBy).toBe('page');expect(pose.draw.draws).toBeGreaterThan(0);expect(pose.draw.sequence).toBeGreaterThanOrEqual(2);
  43  |   expect(pose.draw.calls).toBeGreaterThan(0);expect(pose.draw.triangles).toBeGreaterThan(0);expect(pose.errors).toEqual([]);
  44  |   expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0]/pose.canvasSize[1],2);expect(pose.parts.length).toBeGreaterThan(80);
  45  | }
  46  | function unchangedScene(after:any,before:any){expect(geometry(after)).toEqual(geometry(before));expect(materials(after)).toEqual(materials(before));
> 47  |   expect(resources(after)).toEqual(resources(before));expect(after.lights).toEqual(before.lights);expect(drawShape(after)).toEqual(drawShape(before));}
      |                                                                                                                            ^ Error: expect(received).toEqual(expected) // deep equality
  48  | async function activate(page:Page,button:Locator,keyboard:boolean){await expect(button).toBeEnabled();
  49  |   if(keyboard){await button.focus();await expect(button).toBeFocused();await page.keyboard.press('Enter');}else await button.click();}
  50  | async function openStudy(page:Page,keyboard:boolean){const details=page.locator('details.fr-hand-study');await expect(details).toHaveCount(1);
  51  |   if(!(await details.evaluate(element=>(element as HTMLDetailsElement).open))){const summary=details.locator('summary');
  52  |     if(keyboard){await summary.focus();await page.keyboard.press('Enter');}else await summary.click();}
  53  |   await expect(details).toHaveAttribute('open','');return details;
  54  | }
  55  | async function choose(page:Page,details:Locator,legend:string,label:string,keyboard:boolean){
  56  |   const radio=details.getByRole('group',{name:legend,exact:true}).getByRole('radio',{name:label,exact:true});
  57  |   if(keyboard){await radio.focus();await expect(radio).toBeFocused();await page.keyboard.press('Space');}else await radio.check();await expect(radio).toBeChecked();
  58  | }
  59  | async function fillStudy(page:Page,details:Locator,note:string,keyboard:boolean){
  60  |   await choose(page,details,nearLegend,'Palm side',keyboard);await choose(page,details,supportLegend,'Back of hand',keyboard);
  61  |   const textbox=details.getByRole('textbox',{name:'Explain your hand comparison',exact:true});await expect(textbox).toHaveAttribute('maxlength','2000');await textbox.fill(note);
  62  |   await activate(page,details.getByRole('button',{name:'Check hand observations',exact:true}),keyboard);
  63  |   const feedback=details.locator('.fr-hand-study-feedback');await expect(feedback).toHaveAttribute('role','status');
  64  |   await expect(feedback).toContainText('Compare your choices with the model');await expect(feedback).toContainText(nearFeedback);await expect(feedback).toContainText(supportFeedback);
  65  |   const s=await state(page),record=s.b3dHandStudy[s.b3dAge];expect(record).toEqual({version:1,near:'palm',support:'back',checked:true,note});return record;
  66  | }
  67  | async function mount(page:Page,age:string,width:number){await page.setViewportSize({width,height:width<760?840:1080});await page.emulateMedia({reducedMotion:'reduce'});
  68  |   await harness.mount(page,{firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'recovery',b3dAge:age,b3dRec:completed,b3dRecView:5,b3dRecoveryGuides:false,
  69  |     b3dChildHands:'two',b3dPlaced:'correct',b3dDepthLab:{age:'child',depth:5,lean:1,rate:110,motion:'inspect',phase:50,hands:true,anatomy:false,measure:false},
  70  |     b3dDepthReference:{age:'child',depth:5,lean:0},b3dDepthInquiry:{signature:'hand-study-observation',explanation:'Retain this saved observation.'}}});
  71  |   await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});await settle(page);
  72  | }
  73  | async function direct(page:Page,label:string,keyboard:boolean){const before=await probe(page);await activate(page,page.getByRole('button',{name:label,exact:true}),keyboard);await settle(page);
  74  |   const after=await probe(page);valid(after);expect(after.state).toEqual(before.state);unchangedScene(after,before);return after;
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
```