# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-combined-visual.spec.ts >> combined head proportions and palm surfaces in seven paired native views
- Location: ..\..\..\Documents\Codex\2026-09-29\new-chat-14\firstresponse-palm-work\firstresponse-combined-visual.spec.ts:119:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 0
+ Received  + 4

@@ -1,8 +1,9 @@
  Object {
    "b3dAge": "adult",
    "b3dChildHands": "two",
+   "b3dHandStudy": Object {},
    "b3dPlaced": "correct",
    "b3dRec": Array [
      "check",
      "arm",
      "hand",
@@ -14,8 +15,11 @@
    ],
    "b3dRecView": 0,
    "b3dRecoveryGuides": false,
    "b3dStatus": "ready",
    "b3dTab": "recovery",
+   "badges": Object {},
    "consentAccepted": true,
+   "faMastery": Object {},
+   "modulesVisited": Object {},
    "view": "body3d",
  }
```

# Test source

```ts
  39  |       };return renderer;
  40  |     }});
  41  |     window.__palmProbe=function(kind){
  42  |       var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__palmDraws.get(canvas),rec=canvas && window.__glRecorder.forCanvas(canvas);
  43  |       if(!drawn || !drawn.scene || !rec)return null;
  44  |       var T=THREE,model=drawn.scene.getObjectByName('fr-training-manikin'),camera=drawn.camera;model.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  45  |       function visible(o){var a=o;while(a){if(!a.visible)return false;a=a.parent;}return true;}
  46  |       function headDescendant(o){var a=o;while(a){if(a.name==='fr-manikin-head-pivot')return true;a=a.parent;}return false;}
  47  |       function rightArmDescendant(o){var a=o;while(a){if(/^fr-patient-right-/.test(a.name))return true;a=a.parent;}return false;}
  48  |       function digest(rows){var s=JSON.stringify(rows),h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return {hash:(h>>>0).toString(16),bytes:s.length};}
  49  |       function projected(group){
  50  |         var total=0,inFrame=0,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  51  |         if(group)group.traverse(function(o){if(!o.isMesh || !visible(o) || !o.geometry.attributes.position)return;
  52  |           var a=o.geometry.attributes.position;for(var i=0;i<a.count;i++){
  53  |             var p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);if(!isFinite(p.x+p.y+p.z))throw Error('Non-finite projected '+o.name);
  54  |             total++;var values=[p.x,p.y,p.z];for(var j=0;j<3;j++){min[j]=Math.min(min[j],values[j]);max[j]=Math.max(max[j],values[j]);}
  55  |             if(Math.abs(p.x)<=1.001 && Math.abs(p.y)<=1.001 && p.z>=-1.001 && p.z<=1.001)inFrame++;
  56  |           }
  57  |         });return {total:total,inFrame:inFrame,min:total?min:null,max:total?max:null};
  58  |       }
  59  |       var structure=[],preserved=[],counts={objects:0,meshes:0},creases=[];
  60  |       model.traverse(function(o){
  61  |         counts.objects++;if(o.isMesh)counts.meshes++;structure.push([o.name,o.parent && o.parent.name,o.visible]);
  62  |         if(!headDescendant(o) && !rightArmDescendant(o))preserved.push([o.name,o.parent && o.parent.name,o.matrix.elements,o.visible]);
  63  |         if(o.isMesh && /fr-patient-(left|right)-(palm|thumb)-crease$/.test(o.name)){
  64  |           var a=o.geometry.attributes.position,box=new T.Box3().setFromObject(o);
  65  |           creases.push({name:o.name,visible:visible(o),vertices:a.count,triangles:o.geometry.index?o.geometry.index.count/3:a.count/3,materialType:o.material.type,opacity:o.material.opacity,worldBounds:[box.min.toArray(),box.max.toArray()]});
  66  |         }
  67  |       });
  68  |       var b=canvas.getBoundingClientRect(),selected=kind==='support'?'right':'left',hand=model.getObjectByName('fr-patient-'+selected+'-hand'),head=model.getObjectByName('fr-manikin-head-pivot');
  69  |       var headBox=new T.Box3().setFromObject(head),bodyBox=new T.Box3().setFromObject(model),support=model.getObjectByName('fr-patient-right-hand');
  70  |       var context=support && support.userData.inspection && support.userData.inspection.context;
  71  |       return {
  72  |         camera:{position:camera.getWorldPosition(new T.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},
  73  |         pose:{structure:digest(structure),preservedTransforms:digest(preserved),counts:counts},
  74  |         draw:{id:rec.id,createdBy:rec.createdBy,draws:rec.draws,sequence:drawn.sequence,calls:drawn.calls,triangles:drawn.triangles,geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length,disposeCount:drawn.disposeCount},
  75  |         canvasSize:[b.width,b.height],selectedCreases:creases.filter(function(c){return c.name.indexOf('fr-patient-'+selected+'-')===0;}),allCreases:creases,
  76  |         selectedHand:projected(hand),head:projected(head),wholeBody:kind==='body'?projected(model):null,
  77  |         headBounds:[headBox.min.toArray(),headBox.max.toArray()],bodyBounds:[bodyBox.min.toArray(),bodyBox.max.toArray()],
  78  |         cheekContext:context?context.map(function(p){return new T.Vector3().fromArray(p).project(camera).toArray();}):null,
  79  |         state:window.__ctx.toolData.firstResponse,errors:window.__events.errors.slice()
  80  |       };
  81  |     };
  82  |   `,
  83  | });
  84  | 
  85  | test.describe.configure({retries:0,timeout:150000});
  86  | test.beforeAll(async()=>{
  87  |   expect(report).toBeTruthy();expect(work).toBeTruthy();expect(candidatePath).toBeTruthy();
  88  |   expect(hash(baseline)).toBe(baselineSha);expect(hash(candidate)).toBe(finalSha);expect(finalSha).not.toBe(baselineSha);
  89  |   expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSha);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);
  90  |   mkdirSync(report,{recursive:true});await harness.start();
  91  | });
  92  | test.afterAll(async()=>{writeFileSync(resolve(report,'palm-surface-metrics.json'),JSON.stringify({baselineSha,finalSha,evidence},null,2));await harness.stop();});
  93  | test.afterEach(async({page})=>{await harness.destroy(page);});
  94  | 
  95  | async function settle(page:Page){
  96  |   await page.locator('.fr-body3d-stage').evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant' as ScrollBehavior}));
  97  |   const previous=await page.evaluate(()=>{const r=window as any,c=document.querySelector('#wrap canvas');return r.__palmDraws.get(c)?.sequence||0;});
  98  |   await page.waitForFunction(sequence=>{const r=window as any,c=document.querySelector('#wrap canvas'),d=r.__palmDraws.get(c);return d && d.sequence>=sequence+2;},previous,{timeout:10000});
  99  | }
  100 | async function probe(page:Page,kind:string,pose:number){
  101 |   const encoded=await page.evaluate(kind=>JSON.stringify((window as any).__palmProbe(kind),(key,value)=>{if(typeof value==='number' && !Number.isFinite(value))throw new Error('Non-finite evidence: '+key);return value;}),kind);
  102 |   expect(encoded).not.toBe('null');const value=JSON.parse(encoded);
  103 |   expect(value.draw.createdBy).toBe('page');expect(value.draw.draws).toBeGreaterThan(0);expect(value.draw.calls).toBeGreaterThan(0);expect(value.draw.triangles).toBeGreaterThan(0);expect(value.draw.sequence).toBeGreaterThanOrEqual(2);
  104 |   expect(value.draw.disposeCount).toBe(0);expect(value.errors).toEqual([]);expect(value.state.b3dStatus).toBe('ready');expect(value.state.b3dRecView).toBe(pose);expect(value.camera.aspect).toBeCloseTo(value.canvasSize[0]/value.canvasSize[1],5);
  105 |   expect(value.allCreases).toHaveLength(4);expect(value.selectedCreases).toHaveLength(2);
  106 |   if(kind!=='body'){
  107 |     expect(value.selectedHand.total).toBeGreaterThan(0);expect(value.selectedHand.inFrame,'complete selected hand').toBe(value.selectedHand.total);
  108 |     for(const crease of value.selectedCreases){expect(crease.visible).toBe(true);expect(crease.opacity).toBeGreaterThan(0);expect(crease.triangles).toBeGreaterThan(0);}
  109 |   }
  110 |   if(kind==='support'){
  111 |     expect(value.head.inFrame,'visible cheek and head context').toBeGreaterThan(0);expect(value.cheekContext).toHaveLength(5);
  112 |     for(const p of value.cheekContext){expect(Math.abs(p[0])).toBeLessThanOrEqual(1.001);expect(Math.abs(p[1])).toBeLessThanOrEqual(1.001);expect(p[2]).toBeGreaterThanOrEqual(-1.001);expect(p[2]).toBeLessThanOrEqual(1.001);}
  113 |   }
  114 |   if(kind==='body'){
  115 |     expect(value.head.inFrame,'complete head in body view').toBe(value.head.total);expect(value.wholeBody.total).toBeGreaterThan(0);expect(value.wholeBody.inFrame/value.wholeBody.total,'full figure within body view').toBeGreaterThan(.99);
  116 |   }return value;
  117 | }
  118 | 
  119 | test('combined head proportions and palm surfaces in seven paired native views',async({page})=>{
  120 |   const errors:string[]=[];page.on('pageerror',error=>errors.push('page: '+error.message));page.on('console',message=>{if(message.type()==='error')errors.push('console: '+message.text());});await page.emulateMedia({reducedMotion:'reduce'});
  121 |   const references:Record<string,any>={};
  122 |   for(const age of ['adult','child','infant'] as const){
  123 |     const ageViews=views.filter(view=>view.age===age),first=ageViews[0];
  124 |     await page.setViewportSize({width:first.width,height:first.height});
  125 |     for(const variant of ['baseline','candidate'] as const){
  126 |       await page.unroute('**/stem_lab/stem_tool_firstresponse.js');const source=variant==='baseline'?baseline:candidate;
  127 |       await page.route('**/stem_lab/stem_tool_firstresponse.js',route=>route.fulfill({body:source,contentType:'text/javascript; charset=utf-8'}));
  128 |       await harness.mount(page,{firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'recovery',b3dAge:age,b3dRec:completed,b3dRecView:0,b3dRecoveryGuides:false,b3dChildHands:'two',b3dPlaced:'correct'}},'window.__ctx.toolData.firstResponse.b3dStatus === "ready"');
  129 |       await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});await settle(page);
  130 |       const canvas=page.locator('#wrap canvas');await expect(canvas).toHaveCount(1);const handle=await canvas.elementHandle();expect(handle).toBeTruthy();
  131 |       for(const view of ageViews){
  132 |         if(view.pose===5){await page.getByLabel('Pose to inspect',{exact:true}).selectOption('5');await settle(page);}
  133 |         const name=view.kind==='body'?'Whole manikin':view.kind==='near'?'Palm detail view':'Supporting hand close-up';await page.getByRole('button',{name,exact:true}).click();await settle(page);
  134 |         const value=await probe(page,view.kind,view.pose),key=view.age+'-'+view.kind;
  135 |         if(variant==='baseline')references[key]=value;else{
  136 |           const reference=references[key];
  137 |           if(view.kind==='near')expect(value.camera,key+': same near hand camera').toEqual(reference.camera);
  138 |           expect(value.pose.structure,key+': unchanged hierarchy').toEqual(reference.pose.structure);expect(value.pose.preservedTransforms,key+': unchanged torso and other limbs').toEqual(reference.pose.preservedTransforms);
> 139 |           expect(value.pose.counts).toEqual(reference.pose.counts);expect(value.canvasSize).toEqual(reference.canvasSize);expect(value.state).toEqual(reference.state);expect(value.draw.geometries).toBe(reference.draw.geometries);expect(value.allCreases.map((c:any)=>c.name)).toEqual(reference.allCreases.map((c:any)=>c.name));
      |                                                                                                                                               ^ Error: expect(received).toEqual(expected) // deep equality
  140 |         }
  141 |         const capture=key+'-'+variant+'.png';await page.locator('.fr-body3d-stage').screenshot({path:resolve(report,capture),timeout:30000});evidence.push({...view,variant,sourceSha:hash(source),capture,...value});
  142 |         expect(await harness.glContexts(page)).toHaveLength(1);expect((await harness.glContexts(page)).filter(r=>r.connected && r.inWrap && !r.lost)).toHaveLength(1);
  143 |       }
  144 |       await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await handle!.evaluate((c:any)=>(window as any).__palmDraws.get(c).disposeCount)).toBe(1);await expect(page.locator('#wrap canvas')).toHaveCount(0);await handle!.dispose();expect(errors).toEqual([]);
  145 |     }
  146 |   }
  147 |   expect(hash(readFileSync(candidatePath))).toBe(finalSha);expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSha);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);expect(evidence).toHaveLength(14);
  148 | });
  149 | 
```