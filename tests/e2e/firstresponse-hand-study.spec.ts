import { expect,test,type Page,type Locator } from '@playwright/test';
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { GlHarness } from './helpers/stem_gl_harness';
const report=process.env.FIRST_RESPONSE_HAND_STUDY_REPORT || 'reports/firstresponse-hand-study';
const startingSourceSha="970fbb0e068412f3d3e3fb4ed01013a1afb56b9d5270fb2eb18d24201bfd012c";
const finalSourceSha='cc354bd12dd0712e1e628ebfc16689ba584c3b988d1b085df5a41e1f67cecc26';
const axe=readFileSync('node_modules/axe-core/axe.min.js','utf8');
const hostSource=readFileSync('stem_lab/stem_lab_module.js','utf8');
const completed=['check','arm','hand','knee','roll','airway','stable','watch'];
const nearLegend='After the turn, which side of the near hand stays facing upward?';
const supportLegend='As the body turns, which surface of the supporting hand stays beside the cheek?';
const nearFeedback='The palm side stays facing upward in poses 4 and 5. Its folds help you follow the same surface.';
const supportFeedback='The back of the supporting hand stays beside the cheek in poses 4 and 5. Its palm folds face outward.';
const metrics:Record<string,unknown>[]=[];
const errors=new WeakMap<Page,string[]>();
const harness=new GlHarness({toolFile:'stem_lab/stem_tool_firstresponse.js',toolId:'firstResponse',preScripts:['stem_lab/stem_lab_module.js','tests/e2e/helpers/firstresponse_failed_body_viewer.js'],
  width:1160,height:1080,layout:'document',appStyles:true,probes:"window.__finishDraws=new WeakMap();window.__finishIds=new WeakMap();window.__finishNextId=0;\n    function finishId(object){if(!object)return null;var id=window.__finishIds.get(object);if(!id){id=++window.__finishNextId;window.__finishIds.set(object,id);}return id;}\n    var FinishRenderer=THREE.WebGLRenderer;\n    THREE.WebGLRenderer=new Proxy(FinishRenderer,{construct:function(target,args,newTarget){\n      var renderer=Reflect.construct(target,args,newTarget),render=renderer.render;\n      renderer.render=function(scene,camera){var result=render.apply(this,arguments);\n        if(scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')){\n          var previous=window.__finishDraws.get(this.domElement);\n          window.__finishDraws.set(this.domElement,{scene:scene,camera:camera,renderer:renderer,calls:renderer.info.render.calls,\n            triangles:renderer.info.render.triangles,sequence:(previous?previous.sequence:0)+1});\n        }return result;\n      };return renderer;\n    }});\n    function finishVisible(object){for(var parent=object;parent;parent=parent.parent)if(!parent.visible)return false;return true;}\n    function finishHash(arrays){var hash=2166136261;arrays.filter(Boolean).forEach(function(array){var bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength);\n      for(var i=0;i<bytes.length;i++)hash=Math.imul(hash^bytes[i],16777619);});return ('00000000'+(hash>>>0).toString(16)).slice(-8);}\n    window.__finishProbe=function(){\n      var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__finishDraws.get(canvas),record=canvas && window.__glRecorder.forCanvas(canvas);\n      if(!record || !drawn)return null;var scene=drawn.scene,camera=drawn.camera;scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);\n      var skin=scene.getObjectByName('fr-manikin-head').material,parts=[],nodes=0,lights=[];\n      scene.traverse(function(mesh){nodes++;if(mesh.isLight)lights.push([mesh.name,mesh.type,mesh.color.toArray(),mesh.intensity,mesh.position.toArray()]);\n        if(!mesh.isMesh || !mesh.geometry.attributes.position)return;\n        var g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,index=g.index,mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];\n        var total=index?index.count:p.count,start=g.drawRange.start,end=Math.min(total,start+g.drawRange.count);\n        parts.push({name:mesh.name,skin:mesh.material===skin,visible:finishVisible(mesh),fingerprint:finishHash([p.array,n && n.array,index && index.array]),\n          matrix:mesh.matrixWorld.elements.slice(),drawRange:[start,end-start],\n          resources:[finishId(mesh),finishId(g),finishId(p),finishId(p.array),finishId(n),finishId(n && n.array),finishId(index),finishId(index && index.array)].concat(mats.map(finishId)),\n          materials:mats.map(function(m){return {name:m.name,type:m.type,color:m.color.toArray(),specular:m.specular?m.specular.toArray():null,shininess:m.shininess,\n            opacity:m.opacity,transparent:m.transparent,depthTest:m.depthTest,depthWrite:m.depthWrite,side:m.side,\n            patientContour:m.userData.frPatientContourStrength?m.userData.frPatientContourStrength.value:null,\n            rescuerContour:m.userData.frContourStrength?m.userData.frContourStrength.value:null};})});\n      });\n      return {parts:parts,nodeCount:nodes,lights:lights,skin:{id:finishId(skin),color:skin.color.toArray(),specular:skin.specular?skin.specular.toArray():null,\n          type:skin.type,shininess:skin.shininess},\n        camera:{position:camera.getWorldPosition(new THREE.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},\n        canvasSize:[canvas.getBoundingClientRect().width,canvas.getBoundingClientRect().height],\n        draw:{id:record.id,draws:record.draws,sequence:drawn.sequence,createdBy:record.createdBy,calls:drawn.calls,triangles:drawn.triangles,\n          geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length},\n        state:JSON.parse(JSON.stringify(window.__ctx.toolData.firstResponse)),errors:window.__events.errors.slice()};\n    };\n"});
test.describe.configure({mode:'default',retries:0,timeout:480000});
test.beforeAll(async()=>{expect(createHash('sha256').update(readFileSync('stem_lab/stem_tool_firstresponse.js')).digest('hex')).toBe(finalSourceSha);mkdirSync(report,{recursive:true});await harness.start();});
test.afterAll(async()=>{writeFileSync(report+'/hand-study-metrics.json',JSON.stringify({startingSourceSha,finalSourceSha,metrics},null,2));await harness.stop();});
test.beforeEach(async({page})=>{const found:string[]=[];errors.set(page,found);page.on('pageerror',error=>found.push('page: '+error.message));
  page.on('console',message=>{if(message.type()==='error')found.push('console: '+message.text());});});
test.afterEach(async({page})=>{await harness.destroy(page);});

async function settle(page:Page){
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await page.locator('.fr-body3d-stage').evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant' as ScrollBehavior}));
  const previous=await page.evaluate(()=>{const canvas=document.querySelector('#wrap canvas'),runtime=window as any;
    return {id:runtime.__glRecorder.forCanvas(canvas)?.id || 0,sequence:runtime.__finishDraws.get(canvas)?.sequence || 0};});
  await page.waitForFunction(previous=>{const canvas=document.querySelector('#wrap canvas'),runtime=window as any;
    const record=runtime.__glRecorder.forCanvas(canvas),drawn=runtime.__finishDraws.get(canvas);
    return record && drawn && drawn.sequence>=(record.id===previous.id?previous.sequence+2:2);},previous);
}
async function probe(page:Page):Promise<any>{
  // settle() already waits for two actual draws. Transfer one native JSON
  // string instead of walking the snapshot again through a remote JSHandle.
  const encoded=await page.evaluate(()=>JSON.stringify((window as any).__finishProbe(),(key,value)=>{
    if(value===undefined)return {__frHandEvidenceUndefined:true};
    if(typeof value==='number'&&!Number.isFinite(value))throw new Error('Non-finite scene evidence: '+key);
    return value;
  }));
  expect(encoded,'rendered scene evidence').not.toBe('null');
  function restore(value:any):any{
    if(value&&typeof value==='object'){
      if(Object.keys(value).length===1&&value.__frHandEvidenceUndefined===true)return undefined;
      for(const key of Object.keys(value))value[key]=restore(value[key]);
    }return value;
  }
  return restore(JSON.parse(encoded));
}
async function state(page:Page):Promise<any>{return page.evaluate(()=>JSON.parse(JSON.stringify((window as any).__ctx.toolData.firstResponse)));}
const geometry=(pose:any)=>pose.parts.map((p:any)=>[p.name,p.fingerprint,p.matrix,p.drawRange,p.visible]);
const materials=(pose:any)=>pose.parts.map((p:any)=>[p.name,p.materials]);
const resources=(pose:any)=>({all:pose.parts.map((p:any)=>p.resources),skin:pose.skin.id,canvas:pose.draw.id,nodes:pose.nodeCount});
const drawShape=(pose:any)=>({calls:pose.draw.calls,triangles:pose.draw.triangles,geometries:pose.draw.geometries,programs:pose.draw.programs});
const learning=(s:any)=>({rec:s.b3dRec,depth:s.b3dDepthLab,reference:s.b3dDepthReference,inquiry:s.b3dDepthInquiry,hands:s.b3dChildHands,placed:s.b3dPlaced,study:s.b3dHandStudy});
function valid(pose:any){expect(pose.draw.createdBy).toBe('page');expect(pose.draw.draws).toBeGreaterThan(0);expect(pose.draw.sequence).toBeGreaterThanOrEqual(2);
  expect(pose.draw.calls).toBeGreaterThan(0);expect(pose.draw.triangles).toBeGreaterThan(0);expect(pose.errors).toEqual([]);
  expect(pose.camera.aspect).toBeCloseTo(pose.canvasSize[0]/pose.canvasSize[1],2);expect(pose.parts.length).toBeGreaterThan(80);
}
function unchangedScene(after:any,before:any){expect(geometry(after)).toEqual(geometry(before));expect(materials(after)).toEqual(materials(before));
  expect(resources(after)).toEqual(resources(before));expect(after.lights).toEqual(before.lights);
  expect(after.draw.geometries).toBe(before.draw.geometries);expect(after.draw.programs).toBe(before.draw.programs);
  // Frustum culling changes draws when inspecting a different hand. Compare
  // calls/triangles only for the same camera; action() also checks the selected
  // hand against its independently captured, matching-camera reference.
  if(JSON.stringify(after.camera)===JSON.stringify(before.camera))expect(drawShape(after)).toEqual(drawShape(before));}
async function activate(page:Page,button:Locator,keyboard:boolean){await expect(button).toBeEnabled();
  if(keyboard){await button.focus();await expect(button).toBeFocused();await page.keyboard.press('Enter');}else await button.click();}
async function openStudy(page:Page,keyboard:boolean){const details=page.locator('details.fr-hand-study');await expect(details).toHaveCount(1);
  if(!(await details.evaluate(element=>(element as HTMLDetailsElement).open))){const summary=details.locator('summary');
    if(keyboard){await summary.focus();await page.keyboard.press('Enter');}else await summary.click();}
  await expect(details).toHaveAttribute('open','');return details;
}
async function choose(page:Page,details:Locator,legend:string,label:string,keyboard:boolean){
  const radio=details.getByRole('group',{name:legend,exact:true}).getByRole('radio',{name:label,exact:true});
  if(keyboard){await radio.focus();await expect(radio).toBeFocused();await page.keyboard.press('Space');}else await radio.check();await expect(radio).toBeChecked();
}
async function fillStudy(page:Page,details:Locator,note:string,keyboard:boolean){
  await choose(page,details,nearLegend,'Palm side',keyboard);await choose(page,details,supportLegend,'Back of hand',keyboard);
  const textbox=details.getByRole('textbox',{name:'Explain your hand comparison',exact:true});await expect(textbox).toHaveAttribute('maxlength','2000');await textbox.fill(note);
  await activate(page,details.getByRole('button',{name:'Check hand observations',exact:true}),keyboard);
  const feedback=details.locator('.fr-hand-study-feedback');await expect(feedback).toHaveAttribute('role','status');
  await expect(feedback).toContainText('Compare your choices with the model');await expect(feedback).toContainText(nearFeedback);await expect(feedback).toContainText(supportFeedback);
  const s=await state(page),record=s.b3dHandStudy[s.b3dAge];expect(record).toEqual({version:1,near:'palm',support:'back',checked:true,note});return record;
}
async function mount(page:Page,age:string,width:number){await page.setViewportSize({width,height:width<760?840:1080});await page.emulateMedia({reducedMotion:'reduce'});
  await harness.mount(page,{firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'recovery',b3dAge:age,b3dRec:completed,b3dRecView:5,b3dRecoveryGuides:false,
    b3dChildHands:'two',b3dPlaced:'correct',b3dDepthLab:{age:'child',depth:5,lean:1,rate:110,motion:'inspect',phase:50,hands:true,anatomy:false,measure:false},
    b3dDepthReference:{age:'child',depth:5,lean:0},b3dDepthInquiry:{signature:'hand-study-observation',explanation:'Retain this saved observation.'}}});
  await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});await settle(page);
}
async function direct(page:Page,label:string,keyboard:boolean){const before=await probe(page);await activate(page,page.getByRole('button',{name:label,exact:true}),keyboard);await settle(page);
  const after=await probe(page);valid(after);expect(after.state).toEqual(before.state);unchangedScene(after,before);return after;
}
async function action(page:Page,label:string,pose:number,expected:any,keyboard:boolean){const before=await probe(page),evidenceButton=page.getByRole('button',{name:label,exact:true});
  if(keyboard && before.state.b3dRecView!==pose){
    await evidenceButton.scrollIntoViewIfNeeded();const hidden=await page.locator('.fr-body3d-stage').boundingBox();expect(hidden).toBeTruthy();
    expect(hidden!.y+hidden!.height).toBeLessThan(0);
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  }
  await activate(page,evidenceButton,keyboard);
  const stage=page.locator('.fr-body3d-stage');await expect(stage).toBeFocused();
  const box=await stage.boundingBox();expect(box).toBeTruthy();const viewport=page.viewportSize()!;
  expect(box!.y).toBeGreaterThanOrEqual(-1);expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height+1);
  await settle(page);
  const after=await probe(page);valid(after);expect(after.state).toEqual({...before.state,b3dRecView:pose});expect(after.camera).toEqual(expected.camera);
  expect(geometry(after)).toEqual(geometry(expected));expect(materials(after)).toEqual(materials(expected));expect(after.lights).toEqual(expected.lights);
  expect(after.nodeCount).toBe(expected.nodeCount);expect(after.draw.calls).toBe(expected.draw.calls);expect(after.draw.triangles).toBe(expected.draw.triangles);
  if(before.state.b3dRecView===pose)unchangedScene(after,before);return after;
}
async function capture(page:Page,name:string,details:Locator){await settle(page);const image=await harness.glPixels(page,'#wrap');expect(image).toBeTruthy();writeFileSync(report+'/'+name+'-gl.png',image!.png);
  await settle(page);let clip=await page.locator('.fr-body3d-stage').boundingBox();expect(clip).toBeTruthy();await page.screenshot({path:report+'/'+name+'-stage.png',clip:clip!,timeout:60000});
  await details.screenshot({path:report+'/'+name+'-study.png',timeout:60000});
}
async function audit(page:Page,name:string){await page.addScriptTag({content:axe});const result=await page.evaluate(async()=>{
  const options={runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']},rules:matchMedia('(forced-colors:active)').matches?{'color-contrast':{enabled:false}}:{}};
  const reports=[];for(const scope of ['.fr-hand-inspection','details.fr-hand-study']){
    const report=await(window as any).axe.run(scope,options);reports.push({scope,violations:report.violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)}))});}
  return reports;
});writeFileSync(report+'/'+name+'-axe.json',JSON.stringify(result,null,2));for(const item of result)expect(item.violations,item.scope).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false);expect(errors.get(page)).toEqual([]);
}
async function release(page:Page){expect(await page.locator('#wrap canvas').count()).toBe(1);
  expect((await harness.glContexts(page)).filter(r=>r.connected&&r.inWrap&&!r.lost)).toHaveLength(1);
  await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await page.locator('#wrap canvas').count()).toBe(0);expect(errors.get(page)).toEqual([]);
}
async function workflow(page:Page,age:string,width:number,keyboard:boolean){
  await mount(page,age,width);const original=await probe(page),details=await openStudy(page,keyboard),prefix=age==='infant'?'phone-infant':age;
  const note='I followed the same palm folds through both poses; the supporting hand stays beside the cheek.';
  const record=await fillStudy(page,details,note,keyboard);await settle(page);const assessed=await probe(page);
  unchangedScene(assessed,original);expect(assessed.camera).toEqual(original.camera);
  const expected:any={};
  for(const pose of [4,5]){await page.getByLabel('Pose to inspect',{exact:true}).selectOption(String(pose));await settle(page);
    expected['near'+pose]=await direct(page,'Palm detail view',keyboard);expected['support'+pose]=await direct(page,'Supporting hand close-up',keyboard);
    expect(expected['near'+pose].camera).not.toEqual(expected['support'+pose].camera);
    await action(page,pose===4?'Near palm before turn':'Near palm after turn',pose,expected['near'+pose],keyboard);
    await action(page,pose===4?'Supporting hand before turn':'Supporting hand after turn',pose,expected['support'+pose],keyboard);
    await action(page,pose===4?'Inspect before the turn':'Inspect after the turn',pose,expected['near'+pose],keyboard);
  }
  // Exercise queued pose changes and the same-pose hand switch separately.
  await action(page,'Near palm before turn',4,expected.near4,keyboard);
  await action(page,'Supporting hand after turn',5,expected.support5,keyboard);
  await action(page,'Near palm after turn',5,expected.near5,keyboard);
  await action(page,'Supporting hand before turn',4,expected.support4,keyboard);
  const beforeGuides=await probe(page),saved=learning(beforeGuides.state);await page.evaluate(()=>(window as any).__ctx.updateMulti('firstResponse',{b3dRecoveryGuides:true}));await settle(page);
  const guides=await probe(page);expect(learning(guides.state)).toEqual(saved);expect(guides.state.b3dHandStudy[age]).toEqual(record);
  await page.evaluate(()=>(window as any).__ctx.updateMulti('firstResponse',{b3dRecoveryGuides:false,b3dRecView:8}));await settle(page);
  const later=await direct(page,'Supporting hand close-up',keyboard);expect(learning(later.state)).toEqual(saved);await expect(details.getByRole('textbox',{name:'Explain your hand comparison',exact:true})).toHaveValue(note);
  const summary=details.locator('summary');if(keyboard){await summary.focus();await page.keyboard.press('Enter');}else await summary.click();
  await expect(details).not.toHaveAttribute('open','');expect((await state(page)).b3dHandStudy[age]).toEqual(record);await openStudy(page,keyboard);
  await expect(details.getByRole('textbox',{name:'Explain your hand comparison',exact:true})).toHaveValue(note);await capture(page,prefix+'-checked',details);

  const otherAge=age==='adult'?'child':age==='child'?'infant':'adult';
  await page.evaluate(other=>(window as any).__ctx.updateMulti('firstResponse',{b3dAge:other}),otherAge);await settle(page);const otherDetails=await openStudy(page,keyboard);
  const otherNote='A separate '+otherAge+' observation.';await otherDetails.getByRole('textbox',{name:'Explain your hand comparison',exact:true}).fill(otherNote);
  const otherRecord=(await state(page)).b3dHandStudy[otherAge];expect(otherRecord.note).toBe(otherNote);expect((await state(page)).b3dHandStudy[age]).toEqual(record);
  await page.evaluate(primary=>(window as any).__ctx.updateMulti('firstResponse',{b3dAge:primary}),age);await settle(page);await openStudy(page,keyboard);
  await expect(details.getByRole('textbox',{name:'Explain your hand comparison',exact:true})).toHaveValue(note);
  const beforeReset=await probe(page);await activate(page,details.getByRole('button',{name:'Reset this hand study',exact:true}),keyboard);await settle(page);const reset=await probe(page);
  unchangedScene(reset,beforeReset);expect(reset.camera).toEqual(beforeReset.camera);expect(reset.state.b3dHandStudy[otherAge]).toEqual(otherRecord);
  const resetStudy={...beforeReset.state.b3dHandStudy};delete resetStudy[age];expect(reset.state).toEqual({...beforeReset.state,b3dHandStudy:resetStudy});expect(reset.state.b3dHandStudy[age]).toBeUndefined();
  await expect(details.getByRole('textbox',{name:'Explain your hand comparison',exact:true})).toHaveValue('');await fillStudy(page,details,note,keyboard);await settle(page);

  if(keyboard){const narrow=await direct(page,'Supporting hand close-up',true),ids=resources(narrow);
    await page.setViewportSize({width:760,height:840});await settle(page);const wide=await probe(page);expect(resources(wide)).toEqual(ids);expect(geometry(wide)).toEqual(geometry(narrow));expect(materials(wide)).toEqual(materials(narrow));expect(wide.state).toEqual(narrow.state);
    await page.setViewportSize({width:320,height:840});await settle(page);const restored=await probe(page);expect(resources(restored)).toEqual(ids);expect(restored.state).toEqual(narrow.state);
    for(let axis=0;axis<3;axis++)expect(restored.camera.position[axis]).toBeCloseTo(narrow.camera.position[axis],6);
    await page.emulateMedia({forcedColors:'active'});await openStudy(page,true);await audit(page,prefix+'-forced-colors');await capture(page,prefix+'-forced-colors',details);await page.emulateMedia({forcedColors:'none'});
  }
  const beforeContrast=await direct(page,'Supporting hand close-up',keyboard),oldCanvas=await page.locator('#wrap canvas').elementHandle();
  await page.evaluate(()=>{(window as any).__ctx.isContrast=true;(window as any).__rerender();});await settle(page);
  await expect.poll(async()=>oldCanvas!.evaluate(element=>(window as any).__glRecorder.forCanvas(element)?.ctx.isContextLost())).toBe(true);
  const contrasted=await direct(page,'Supporting hand close-up',keyboard);valid(contrasted);expect(contrasted.state).toEqual(beforeContrast.state);expect(geometry(contrasted)).toEqual(geometry(beforeContrast));
  expect(contrasted.draw.calls).toBe(beforeContrast.draw.calls);expect(contrasted.draw.triangles).toBe(beforeContrast.draw.triangles);
  await openStudy(page,keyboard);await expect(details.getByRole('textbox',{name:'Explain your hand comparison',exact:true})).toHaveValue(note);await audit(page,prefix+'-final');await capture(page,prefix+'-contrast',details);
  writeFileSync(report+'/'+prefix+'-final-evidence.json',JSON.stringify({startingSourceSha,record,otherRecord,beforeContrast,contrasted},null,2));
  metrics.push({age,width,record,otherRecord,nativeCameraComparisons:10,draw:contrasted.draw});await release(page);
}
test('adult hand study keeps observations through real hand camera comparisons',async({page})=>{await workflow(page,'adult',1280,false);});
test('child hand study keeps observations through real hand camera comparisons',async({page})=>{await workflow(page,'child',1280,false);});
test('320px infant hand study preserves keyboard choices resize forced colors and cleanup',async({page})=>{await workflow(page,'infant',320,true);});

test('hand study remains usable when the body viewer reports a failed renderer',async({page})=>{
  await page.addInitScript(()=>{(window as any).__handStudyForceFallback=true;});
  await page.setViewportSize({width:320,height:840});await page.emulateMedia({reducedMotion:'reduce'});
  await harness.mount(page,{firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'recovery',b3dAge:'adult',b3dRec:completed,b3dRecView:5,b3dStatus:'failed'}},undefined,{expectCanvas:false});
  await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});
  const details=await openStudy(page,true);for(const label of ['Near palm before turn','Near palm after turn','Supporting hand before turn','Supporting hand after turn'])await expect(details.getByRole('button',{name:label,exact:true})).toBeEnabled();
  const record=await fillStudy(page,details,'I can compare the descriptions while the model loads.',true);expect(record.checked).toBe(true);
  const beforeEvidence=await state(page);await activate(page,details.getByRole('button',{name:'Near palm before turn',exact:true}),true);expect(await state(page)).toEqual({...beforeEvidence,b3dRecView:4});await activate(page,details.getByRole('button',{name:'Supporting hand after turn',exact:true}),true);expect(await state(page)).toEqual({...beforeEvidence,b3dRecView:5});expect(await page.evaluate(()=>(window as any).__handStudyFallbackFactoryUses)).toBeGreaterThan(0);expect(await page.evaluate(()=>(window as any).__handStudyFallbackCalls)).toEqual([]);expect((await harness.glContexts(page)).filter(r=>r.createdBy==='page' && !r.lost)).toEqual([]);
  await audit(page,'fallback');const clip=await details.boundingBox();expect(clip).toBeTruthy();await details.screenshot({path:report+'/fallback-study.png',timeout:60000});
  metrics.push({condition:'fallback',record});await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);
});

test('hand observations survive page navigation and project restore without a study seed',async({page})=>{
  await mount(page,'adult',1280);const records:Record<string,unknown>={};
  for(const age of ['adult','child','infant']){
    await page.evaluate(age=>(window as any).__ctx.updateMulti('firstResponse',{b3dAge:age}),age);await settle(page);
    records[age]=await fillStudy(page,await openStudy(page,false),'Saved '+age+' comparison.',false);
  }
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('firstResponse.state.v1')!).b3dHandStudy)).toEqual(records);
  expect(await page.evaluate(()=>(window as any).__alloflowFirstResponse.b3dHandStudy)).toEqual(records);
  await release(page);await mount(page,'adult',1280);
  expect((await state(page)).b3dHandStudy).toEqual(records);
  for(const age of ['adult','child','infant']){
    await page.evaluate(age=>(window as any).__ctx.updateMulti('firstResponse',{b3dAge:age}),age);await settle(page);
    const details=await openStudy(page,false);await expect(details.getByRole('textbox',{name:'Explain your hand comparison',exact:true})).toHaveValue('Saved '+age+' comparison.');
    await expect(details.locator('.fr-hand-study-feedback')).toContainText(nearFeedback);
  }
  const before=await state(page);
  const legacy=await page.evaluate(()=>{
    const runtime=window as any;runtime.__alloflowFirstResponse={consentAccepted:true,importMarker:'legacy project'};
    localStorage.setItem('firstResponse.state.v1',JSON.stringify(runtime.__alloflowFirstResponse));
    window.dispatchEvent(new Event('alloflow-firstresponse-restored'));
    return {window:runtime.__alloflowFirstResponse,storage:JSON.parse(localStorage.getItem('firstResponse.state.v1')!)};
  });
  expect(legacy.window.b3dHandStudy).toEqual(records);expect(legacy.storage.b3dHandStudy).toEqual(records);
  expect(legacy.window.importMarker).toBe('legacy project');expect(await state(page)).toEqual(before);
  const imported={...records,adult:{version:1,near:'back',support:'unsure',checked:true,note:'Restored project comparison.'}};
  const immediate=await page.evaluate(imported=>{
    const runtime=window as any;runtime.__alloflowFirstResponse={b3dHandStudy:imported,importMarker:'new project'};
    localStorage.setItem('firstResponse.state.v1',JSON.stringify(runtime.__alloflowFirstResponse));
    window.dispatchEvent(new Event('alloflow-firstresponse-restored'));
    return {window:runtime.__alloflowFirstResponse,storage:JSON.parse(localStorage.getItem('firstResponse.state.v1')!)};
  },imported);
  expect(immediate.window.b3dHandStudy).toEqual(imported);expect(immediate.storage.b3dHandStudy).toEqual(imported);
  expect(immediate.window.importMarker).toBe('new project');
  await expect.poll(async()=>(await state(page)).b3dHandStudy).toEqual(imported);
  expect(await state(page)).toEqual({...before,b3dHandStudy:imported});
  await page.evaluate(()=>(window as any).__ctx.updateMulti('firstResponse',{b3dAge:'child'}));await settle(page);
  await activate(page,(await openStudy(page,false)).getByRole('button',{name:'Reset this hand study',exact:true}),false);
  const remaining={adult:imported.adult,infant:imported.infant};
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('firstResponse.state.v1')!).b3dHandStudy)).toEqual(remaining);
  await release(page);await mount(page,'adult',1280);
  expect((await state(page)).b3dHandStudy).toEqual(remaining);const details=await openStudy(page,false);
  await expect(details.getByRole('textbox',{name:'Explain your hand comparison',exact:true})).toHaveValue('Restored project comparison.');
  await audit(page,'reload-project-restore');await capture(page,'reload-project-restore',details);
  writeFileSync(report+'/reload-project-restore-evidence.json',JSON.stringify({records,legacy,immediate,remaining,state:await state(page)},null,2));
  metrics.push({condition:'reload-project-restore',records:3,reloads:2,remaining});await release(page);
});
