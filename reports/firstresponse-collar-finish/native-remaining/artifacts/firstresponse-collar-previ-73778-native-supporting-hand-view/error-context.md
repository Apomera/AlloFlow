# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-collar-preview.spec.ts >> collar finish infant-pose8-contrast preview at matching native supporting-hand view
- Location: ..\..\..\Documents\Codex\2026-09-29\new-chat-14\firstresponse-collar-work\firstresponse-collar-preview.spec.ts:106:29

# Error details

```
Error: actual white contrast torso color

expect(received).toBe(expected) // Object.is equality

Expected: 16777215
Received: 3355443
```

# Test source

```ts
  29  |     THREE.WebGLRenderer=new Proxy(CollarRenderer,{construct:function(target,args,newTarget){
  30  |       var renderer=Reflect.construct(target,args,newTarget),render=renderer.render,dispose=renderer.dispose;
  31  |       var record={renderer:renderer,disposeCount:0,sequence:0};window.__collarDraws.set(renderer.domElement,record);
  32  |       renderer.dispose=function(){record.disposeCount++;return dispose.apply(this,arguments);};
  33  |       renderer.render=function(scene,camera){var result=render.apply(this,arguments);
  34  |         if(scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')){
  35  |           record.scene=scene;record.camera=camera;record.sequence++;record.calls=renderer.info.render.calls;record.triangles=renderer.info.render.triangles;
  36  |         }return result;};return renderer;
  37  |     }});
  38  |     window.__collarProbe=function(){
  39  |       var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__collarDraws.get(canvas),rec=canvas && window.__glRecorder.forCanvas(canvas);
  40  |       if(!drawn || !drawn.scene || !rec)return null;
  41  |       var T=THREE,model=drawn.scene.getObjectByName('fr-training-manikin'),camera=drawn.camera;model.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  42  |       function visible(o){var a=o;while(a){if(!a.visible)return false;a=a.parent;}return true;}
  43  |       function digest(rows){var s=JSON.stringify(rows),h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return {hash:(h>>>0).toString(16),bytes:s.length};}
  44  |       function projected(group,predicate){var total=0,inFrame=0,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  45  |         group.traverse(function(o){if(!o.isMesh || !visible(o) || !o.geometry.attributes.position)return;
  46  |           var a=o.geometry.attributes.position;for(var i=0;i<a.count;i++){
  47  |             if(predicate && !predicate(o,a,i))continue;
  48  |             var p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);if(!isFinite(p.x+p.y+p.z))throw Error('Non-finite projected '+o.name);
  49  |             total++;var values=[p.x,p.y,p.z];for(var j=0;j<3;j++){min[j]=Math.min(min[j],values[j]);max[j]=Math.max(max[j],values[j]);}
  50  |             if(Math.abs(p.x)<=1.001 && Math.abs(p.y)<=1.001 && p.z>=-1.001 && p.z<=1.001)inFrame++;
  51  |           }
  52  |         });return {total:total,inFrame:inFrame,min:total?min:null,max:total?max:null};}
  53  |       var structure=[],preserved=[],counts={objects:0,meshes:0},neckMesh=null,torsoMesh=null;
  54  |       model.traverse(function(o){counts.objects++;if(o.isMesh)counts.meshes++;structure.push([o.name,o.parent && o.parent.name,o.visible]);
  55  |         preserved.push([o.name,o.parent && o.parent.name,o.matrix.elements,o.visible]);
  56  |         if(o.isMesh && o.name==='fr-manikin-neck')neckMesh={name:o.name,vertices:o.geometry.attributes.position.count,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3,materialType:o.material.type,colorHex:o.material.color.getHex(),visible:visible(o)};
  57  |         if(o.isMesh && o.name==='fr-manikin-torso')torsoMesh={name:o.name,vertices:o.geometry.attributes.position.count,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3,materialType:o.material.type,colorHex:o.material.color.getHex(),visible:visible(o)};
  58  |       });
  59  |       var hand=model.getObjectByName('fr-patient-right-hand'),head=model.getObjectByName('fr-manikin-head-pivot'),context=hand.userData.inspection.context,b=canvas.getBoundingClientRect();
  60  |       var neck=model.getObjectByName('fr-manikin-neck'),neckProjection=projected(neck),neckBox=new T.Box3().setFromObject(neck);
  61  |       var torso=model.getObjectByName('fr-manikin-torso'),torsoPositions=torso.geometry.attributes.position,minZ=Infinity,maxZ=-Infinity;
  62  |       for(var i=0;i<torsoPositions.count;i++){minZ=Math.min(minZ,torsoPositions.getZ(i));maxZ=Math.max(maxZ,torsoPositions.getZ(i));}
  63  |       var collarTorso=projected(torso,function(o,a,i){return a.getZ(i)<=minZ+(maxZ-minZ)*.16;}),collarProjection={
  64  |         total:neckProjection.total+collarTorso.total,inFrame:neckProjection.inFrame+collarTorso.inFrame,
  65  |         min:neckProjection.min.map(function(v,i){return Math.min(v,collarTorso.min[i]);}),max:neckProjection.max.map(function(v,i){return Math.max(v,collarTorso.max[i]);})};
  66  |       return {camera:{position:camera.getWorldPosition(new T.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},
  67  |         pose:{structure:digest(structure),preservedTransforms:digest(preserved),counts:counts},neckMesh:neckMesh,torsoMesh:torsoMesh,collarProjection:collarProjection,neckProjection:neckProjection,neckBounds:[neckBox.min.toArray(),neckBox.max.toArray()],selectedHand:projected(hand),head:projected(head),
  68  |         canvasRect:{x:b.x,y:b.y,width:b.width,height:b.height},cheekContext:context.map(function(p){return new T.Vector3().fromArray(p).project(camera).toArray();}),
  69  |         contrast:window.__ctx.isContrast,state:window.__ctx.toolData.firstResponse,errors:window.__events.errors.slice(),
  70  |         draw:{id:rec.id,createdBy:rec.createdBy,draws:rec.draws,sequence:drawn.sequence,calls:drawn.calls,triangles:drawn.triangles,geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length,disposeCount:drawn.disposeCount}};
  71  |     };
  72  |   `});
  73  | 
  74  | // Bound each matched pair separately; this host needs room for software WebGL.
  75  | test.describe.configure({retries:0,timeout:300000});
  76  | test.beforeAll(async()=>{
  77  |   expect(hash(baseline)).toBe(baselineSHA);expect(hash(candidate)).toBe(finalSHA);expect(finalSHA).not.toBe(baselineSHA);
  78  |   expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSHA);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);
  79  |   mkdirSync(report,{recursive:true});await harness.start();
  80  | });
  81  | test.afterAll(async()=>{
  82  |   const retained=views.flatMap(view=>{try{return JSON.parse(readFileSync(resolve(report,view.id+'-evidence.json'),'utf8')).evidence;}catch{return [];}});
  83  |   writeFileSync(resolve(report,'collar-preview-metrics.json'),JSON.stringify({baselineSHA,finalSHA,selectedViews:views.map(view=>view.id),evidence:retained},null,2));await harness.stop();
  84  | });
  85  | test.afterEach(async({page})=>{await harness.destroy(page);});
  86  | async function settle(page:Page){
  87  |   await page.locator('.fr-body3d-stage').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant' as ScrollBehavior}));
  88  |   const sequence=await page.evaluate(()=>{const w=window as any,c=document.querySelector('#wrap canvas');return w.__collarDraws.get(c)?.sequence||0;});
  89  |   await page.waitForFunction(n=>{const w=window as any,c=document.querySelector('#wrap canvas'),r=w.__collarDraws.get(c);return r && r.sequence>=n+2;},sequence,{timeout:10000});
  90  | }
  91  | async function probe(page:Page){const encoded=await page.evaluate(()=>JSON.stringify((window as any).__collarProbe(),(key,value)=>{
  92  |   if(typeof value==='number' && !Number.isFinite(value))throw Error('Non-finite evidence '+key);return value;}));expect(encoded).not.toBe('null');return JSON.parse(encoded);}
  93  | async function captureCollar(page:Page,value:any,prefix:string){
  94  |   const p=value.collarProjection,b=value.canvasRect;
  95  |   if(!p || !p.min || p.inFrame===0)return null;
  96  |   const left=b.x+(Math.max(-1,p.min[0])+1)*b.width/2,top=b.y+(1-Math.min(1,p.max[1]))*b.height/2;
  97  |   const right=b.x+(Math.min(1,p.max[0])+1)*b.width/2,bottom=b.y+(1-Math.max(-1,p.min[1]))*b.height/2;
  98  |   if(right-left<4 || bottom-top<4)return null;
  99  |   const viewport=page.viewportSize()!,margin=18,x=Math.max(0,Math.floor(left-margin)),y=Math.max(0,Math.floor(top-margin));
  100 |   const width=Math.min(viewport.width-x,Math.ceil(right+margin)-x),height=Math.min(viewport.height-y,Math.ceil(bottom+margin)-y);
  101 |   if(width<=0 || height<=0)return null;
  102 |   const file=prefix+'-collar.png';await page.screenshot({path:resolve(report,file),clip:{x,y,width,height},timeout:30000});
  103 |   return {file,clip:{x,y,width,height}};
  104 | }
  105 | 
  106 | for(const view of views)test('collar finish '+view.id+' preview at matching native supporting-hand view',async({page})=>{
  107 |   const errors:string[]=[];page.on('pageerror',e=>errors.push('page: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  108 |   await page.emulateMedia({reducedMotion:'reduce'});
  109 |   const attempts:any[]=[];
  110 |   try{await page.setViewportSize({width:view.width,height:view.height});let reference:any;
  111 |     for(const variant of ['baseline','candidate'] as const){
  112 |       const attempt:any={variant,startedAt:new Date().toISOString(),phase:'mount'};attempts.push(attempt);
  113 |       await page.unroute('**/stem_lab/stem_tool_firstresponse.js');const source=variant==='baseline'?baseline:candidate;
  114 |       await page.route('**/stem_lab/stem_tool_firstresponse.js',route=>route.fulfill({body:source,contentType:'text/javascript; charset=utf-8'}));
  115 |       await harness.mount(page,{__collarContrast:view.contrast,firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'recovery',b3dAge:view.age,b3dRec:completed,b3dRecView:view.pose,b3dRecoveryGuides:false,b3dChildHands:'two',b3dPlaced:'correct',b3dHandStudy:{},faMastery:{},modulesVisited:{},badges:{}}},'window.__ctx.toolData.firstResponse.b3dStatus === "ready"');
  116 |       await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});await settle(page);
  117 |       const canvas=page.locator('#wrap canvas');await expect(canvas).toHaveCount(1);const handle=await canvas.elementHandle();expect(handle).toBeTruthy();
  118 |       await page.getByRole('button',{name:'Supporting hand close-up',exact:true}).click();await settle(page);const value=await probe(page);attempt.probe=value;
  119 |       expect(value.contrast).toBe(view.contrast);expect(value.state.b3dStatus).toBe('ready');expect(value.state.b3dRecView).toBe(view.pose);expect(value.errors).toEqual([]);
  120 |       expect(value.draw.createdBy).toBe('page');expect(value.draw.calls).toBeGreaterThan(0);expect(value.draw.triangles).toBeGreaterThan(0);expect(value.draw.draws).toBeGreaterThan(0);expect(value.draw.disposeCount).toBe(0);
  121 |       expect(value.camera.aspect).toBeCloseTo(value.canvasRect.width/value.canvasRect.height,5);expect(value.selectedHand.total).toBeGreaterThan(0);expect(value.selectedHand.inFrame,'complete supporting hand').toBe(value.selectedHand.total);expect(value.head.inFrame).toBeGreaterThan(0);
  122 |       expect(value.cheekContext).toHaveLength(5);for(const p of value.cheekContext){expect(Math.abs(p[0])).toBeLessThanOrEqual(1.001);expect(Math.abs(p[1])).toBeLessThanOrEqual(1.001);expect(p[2]).toBeGreaterThanOrEqual(-1.001);expect(p[2]).toBeLessThanOrEqual(1.001);}
  123 |       expect(value.neckMesh).toBeTruthy();expect(value.neckMesh.name).toBe('fr-manikin-neck');
  124 |       expect(value.neckMesh.vertices).toBeGreaterThan(0);expect(value.neckMesh.triangles).toBeGreaterThan(0);expect(value.neckMesh.visible).toBe(true);
  125 |       expect(value.neckProjection.inFrame,'visible neck transition').toBeGreaterThan(0);
  126 |       expect(value.torsoMesh).toBeTruthy();expect(value.torsoMesh.name).toBe('fr-manikin-torso');expect(value.torsoMesh.visible).toBe(true);
  127 |       expect(value.torsoMesh.vertices).toBeGreaterThan(0);expect(value.torsoMesh.triangles).toBeGreaterThan(0);
  128 |       expect(value.collarProjection.inFrame,'visible collar transition').toBeGreaterThan(0);
> 129 |       if(view.contrast){expect(value.torsoMesh.materialType,'actual contrast torso material').toBe('MeshBasicMaterial');expect(value.torsoMesh.colorHex,'actual white contrast torso color').toBe(0xffffff);}
      |                                                                                                                                                                                              ^ Error: actual white contrast torso color
  130 |       if(view.contrast){expect(value.neckMesh.materialType,'actual contrast neck material').toBe('MeshBasicMaterial');expect(value.neckMesh.colorHex,'actual white contrast neck color').toBe(0xffffff);}
  131 |       if(variant==='baseline')reference=value;else{
  132 |         expect(value.camera).toEqual(reference.camera);expect(value.pose).toEqual(reference.pose);expect(value.state).toEqual(reference.state);
  133 |         expect(value.neckMesh).toEqual(reference.neckMesh);expect(value.neckProjection).toEqual(reference.neckProjection);expect(value.neckBounds).toEqual(reference.neckBounds);
  134 |         expect(value.selectedHand).toEqual(reference.selectedHand);expect(value.head).toEqual(reference.head);expect(value.cheekContext).toEqual(reference.cheekContext);
  135 |         expect(value.torsoMesh.materialType).toBe(reference.torsoMesh.materialType);expect(value.torsoMesh.colorHex).toBe(reference.torsoMesh.colorHex);
  136 |         expect(value.draw.geometries).toBe(reference.draw.geometries);expect(value.draw.programs).toBe(reference.draw.programs);
  137 |       }
  138 |       attempt.phase='capture';const prefix=view.id+'-'+variant,capture=prefix+'-stage.png';
  139 |       await page.locator('.fr-body3d-stage').screenshot({path:resolve(report,capture),timeout:30000});const detail=await captureCollar(page,value,prefix);
  140 |       // Re-select the same camera to check that an inspection adds no geometry or programs.
  141 |       await page.getByRole('button',{name:'Supporting hand close-up',exact:true}).click();await settle(page);const repeat=await probe(page);
  142 |       expect(repeat.draw.geometries).toBe(value.draw.geometries);expect(repeat.draw.programs).toBe(value.draw.programs);expect(repeat.camera).toEqual(value.camera);
  143 |       evidence.push({...view,variant,sourceSHA:hash(source),capture,detail,...value});
  144 |       expect(await harness.glContexts(page)).toHaveLength(1);expect((await harness.glContexts(page)).filter(r=>r.connected && r.inWrap && !r.lost)).toHaveLength(1);
  145 |       attempt.phase='disposal';await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await handle!.evaluate((c:any)=>(window as any).__collarDraws.get(c).disposeCount)).toBe(1);
  146 |       await expect(page.locator('#wrap canvas')).toHaveCount(0);await handle!.dispose();expect(errors).toEqual([]);
  147 |       attempt.phase='complete';
  148 |     }
  149 |     expect(hash(readFileSync(candidatePath))).toBe(finalSHA);expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSHA);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);expect(evidence.filter(e=>e.id===view.id)).toHaveLength(2);
  150 |   }finally{writeFileSync(resolve(report,view.id+'-evidence.json'),JSON.stringify({baselineSHA,finalSHA,view,attempts,evidence:evidence.filter(e=>e.id===view.id)},null,2));}
  151 | });
  152 | 
```