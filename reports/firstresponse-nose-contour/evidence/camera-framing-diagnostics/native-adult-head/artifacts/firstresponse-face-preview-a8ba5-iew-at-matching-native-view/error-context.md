# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-face-preview.spec.ts >> nose contour adult-head preview at matching native view
- Location: ..\..\..\Documents\Codex\2026-09-29\new-chat-14\firstresponse-nose-contour-work\firstresponse-face-preview.spec.ts:152:29

# Error details

```
Error: camera

expect(received).toEqual(expected) // deep equality

- Expected  - 7
+ Received  + 7

@@ -1,11 +1,11 @@
  Object {
    "aspect": 1.5614525139664805,
    "position": Array [
-     -0.2101590533820324,
-     1.1650598713171454,
-     -1.2242667179183844,
+     -0.20935407947677293,
+     1.1573982886004048,
+     -1.2264719537195878,
    ],
    "projection": Array [
      1.6683754654031857,
      0,
      0,
@@ -22,11 +22,11 @@
      0,
      -0.20020020020020018,
      0,
    ],
    "quaternion": Array [
-     -0.4652500352655442,
-     -0.5193140555159217,
-     -0.41175652061418194,
-     0.5867809507479931,
+     -0.46319360235953827,
+     -0.5222248886782904,
+     -0.4140539848228065,
+     0.5842021482590561,
    ],
  }
```

# Test source

```ts
  39  |         if(scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')){
  40  |           record.scene=scene;record.camera=camera;record.sequence++;record.calls=renderer.info.render.calls;record.triangles=renderer.info.render.triangles;
  41  |         }return result;};return renderer;
  42  |     }});
  43  |     window.__faceProbe=function(){
  44  |       var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__faceDraws.get(canvas),rec=canvas && window.__glRecorder.forCanvas(canvas);
  45  |       if(!drawn || !drawn.scene || !rec)return null;
  46  |       var T=THREE,model=drawn.scene.getObjectByName('fr-training-manikin'),camera=drawn.camera;model.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  47  |       function visible(o){var a=o;while(a){if(!a.visible)return false;a=a.parent;}return true;}
  48  |       function digest(rows){var s=JSON.stringify(rows),h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return {hash:(h>>>0).toString(16),bytes:s.length};}
  49  | 
  50  |       function bufferHash(a){var b=new Uint8Array(a.buffer,a.byteOffset,a.byteLength),h=2166136261;for(var i=0;i<b.length;i++)h=Math.imul(h^b[i],16777619);return {hash:(h>>>0).toString(16),bytes:b.length};}
  51  |       // The generated Shape UUID is the only geometry parameter normalized here.
  52  |       function geometryParameters(value){return JSON.parse(JSON.stringify(value,function(key,item){return key==='uuid'&&this.type==='Shape'&&typeof item==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item)?'[generated Shape UUID]':item;}));}
  53  |       function exactGeometry(g){var attributes={};Object.keys(g.attributes).sort().forEach(function(k){var a=g.attributes[k];attributes[k]={count:a.count,itemSize:a.itemSize,normalized:a.normalized,buffer:bufferHash(a.array)};});return {type:g.type,attributes:attributes,index:g.index?bufferHash(g.index.array):null,indexCount:g.index?g.index.count:null,drawRange:{start:g.drawRange.start,count:g.drawRange.count===Infinity?'Infinity':g.drawRange.count},groups:g.groups,parameters:geometryParameters(g.parameters||null)};}
  54  |       function exactMaterial(m){if(Array.isArray(m))return m.map(exactMaterial);var data=m.toJSON();delete data.uuid;return data;}
  55  |       function materialHooks(m){if(Array.isArray(m))return m.map(materialHooks);return {compile:String(m.onBeforeCompile),cacheKey:m.customProgramCacheKey()};}
  56  |       var exactScene=[],noseMaterial=null,headMaterial=model.getObjectByName('fr-manikin-head').material;
  57  |       function visitExact(o,key){var mat=o.material?exactMaterial(o.material):null,hooks=o.material?materialHooks(o.material):null;
  58  |         if(o.name==='fr-manikin-nose'){
  59  |           noseMaterial={name:o.name,material:JSON.parse(JSON.stringify(mat)),visible:visible(o),hooks:hooks,separateFromHead:o.material!==headMaterial,strength:o.material.userData.frNoseContourStrength?o.material.userData.frNoseContourStrength.value:null};
  60  |         }
  61  |         exactScene.push({path:key,name:o.name,type:o.type,visible:o.visible,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),matrix:o.matrix.elements,renderOrder:o.renderOrder,layers:o.layers.mask,castShadow:o.castShadow,receiveShadow:o.receiveShadow,frustumCulled:o.frustumCulled,userData:o.userData,geometry:o.geometry&&!/^fr-manikin-(?:nose|nostril-(?:left|right))$/.test(o.name)?exactGeometry(o.geometry):null,material:mat,materialHooks:hooks});
  62  |         o.children.forEach(function(child,i){visitExact(child,key+'/'+i);});
  63  |       }
  64  |       visitExact(drawn.scene,'scene');
  65  |       function isNoseMesh(o){return /^fr-manikin-(?:nose|nostril-(?:left|right))$/.test(o.name);}
  66  |       function geometryDescriptor(o){
  67  |         var geometry=o.geometry,positions=geometry.attributes.position,normals=geometry.attributes.normal,attributes={};
  68  |         Object.keys(geometry.attributes).sort().forEach(function(name){var a=geometry.attributes[name];attributes[name]={count:a.count,itemSize:a.itemSize,array:digest(Array.from(a.array))};});
  69  |         var bounds=new T.Box3().setFromBufferAttribute(positions);
  70  |         for(var i=0;i<positions.count;i++)if(!isFinite(positions.getX(i)+positions.getY(i)+positions.getZ(i)))throw Error('Non-finite nose/skull position '+o.name);
  71  |         if(normals)for(var i=0;i<normals.count;i++)if(!isFinite(normals.getX(i)+normals.getY(i)+normals.getZ(i)))throw Error('Non-finite nose/skull normal '+o.name);
  72  |         return {name:o.name,type:geometry.type,parameters:geometryParameters(geometry.parameters||null),vertices:positions.count,triangles:geometry.index?geometry.index.count/3:positions.count/3,attributes:attributes,index:geometry.index?digest(Array.from(geometry.index.array)):null,indexCount:geometry.index?geometry.index.count:null,
  73  |           bounds:[bounds.min.toArray(),bounds.max.toArray()],material:{type:o.material.type,colorHex:o.material.color.getHex(),side:o.material.side,transparent:o.material.transparent,opacity:o.material.opacity,depthWrite:o.material.depthWrite},visible:visible(o)};
  74  |       }
  75  |       function projected(group,predicate){var total=0,inFrame=0,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  76  |         group.traverse(function(o){if(!o.isMesh || !visible(o) || !o.geometry.attributes.position)return;
  77  |           var a=o.geometry.attributes.position;for(var i=0;i<a.count;i++){
  78  |             if(predicate && !predicate(o,a,i))continue;
  79  |             var p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);if(!isFinite(p.x+p.y+p.z))throw Error('Non-finite projected '+o.name);
  80  |             total++;var values=[p.x,p.y,p.z];for(var j=0;j<3;j++){min[j]=Math.min(min[j],values[j]);max[j]=Math.max(max[j],values[j]);}
  81  |             if(Math.abs(p.x)<=1.001 && Math.abs(p.y)<=1.001 && p.z>=-1.001 && p.z<=1.001)inFrame++;
  82  |           }
  83  |         });return {total:total,inFrame:inFrame,min:total?min:null,max:total?max:null};}
  84  |       var structure=[],preserved=[],counts={objects:0,meshes:0},neckMesh=null,torsoMesh=null,noseMeshes=[];
  85  |       model.traverse(function(o){counts.objects++;if(o.isMesh)counts.meshes++;structure.push([o.name,o.parent && o.parent.name,o.visible]);
  86  |         if(o.isMesh && isNoseMesh(o))noseMeshes.push(geometryDescriptor(o));
  87  |         preserved.push([o.name,o.parent && o.parent.name,o.matrix.elements,o.visible]);
  88  |         if(o.isMesh && o.name==='fr-manikin-neck')neckMesh={name:o.name,vertices:o.geometry.attributes.position.count,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3,materialType:o.material.type,colorHex:o.material.color.getHex(),visible:visible(o)};
  89  |         if(o.isMesh && o.name==='fr-manikin-torso')torsoMesh={name:o.name,vertices:o.geometry.attributes.position.count,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3,materialType:o.material.type,colorHex:o.material.color.getHex(),visible:visible(o)};
  90  |       });
  91  |       var hand=model.getObjectByName('fr-patient-right-hand'),head=model.getObjectByName('fr-manikin-head-pivot'),context=hand.userData.inspection?hand.userData.inspection.context:[],b=canvas.getBoundingClientRect();
  92  |       var neck=model.getObjectByName('fr-manikin-neck'),neckProjection=projected(neck),neckBox=new T.Box3().setFromObject(neck);
  93  |       var skull=model.getObjectByName('fr-manikin-head'),preservedFace=projected(head,function(o){return !/^fr-manikin-eye-(?:left|right)$/.test(o.name);});
  94  |       var faceProjection=projected(head,function(o){return /^fr-manikin-(?:brow|upper-lid|lower-lid|eye)-(?:left|right)$/.test(o.name) || /^fr-manikin-(?:upper-lip|lower-lip|mouth)$/.test(o.name);});
  95  |       noseMeshes.sort(function(a,b){return a.name.localeCompare(b.name);});
  96  |       return {preservedScene:digest(exactScene),noseMaterial:noseMaterial,headMaterial:exactMaterial(headMaterial),camera:{position:camera.getWorldPosition(new T.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},
  97  |         pose:{structure:digest(structure),preservedTransforms:digest(preserved),counts:counts},neckMesh:neckMesh,torsoMesh:torsoMesh,faceProjection:faceProjection,noseMeshes:noseMeshes,skull:projected(skull),skullGeometry:geometryDescriptor(skull),preservedFace:preservedFace,neckProjection:neckProjection,neckBounds:[neckBox.min.toArray(),neckBox.max.toArray()],selectedHand:projected(hand),head:projected(head),
  98  |         canvasRect:{x:b.x,y:b.y,width:b.width,height:b.height},cheekContext:context.map(function(p){return new T.Vector3().fromArray(p).project(camera).toArray();}),
  99  |         contrast:window.__ctx.isContrast,state:window.__ctx.toolData.firstResponse,errors:window.__events.errors.slice(),
  100 |         draw:{materials:drawn.materials.size,id:rec.id,createdBy:rec.createdBy,draws:rec.draws,sequence:drawn.sequence,calls:drawn.calls,triangles:drawn.triangles,geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length,disposeCount:drawn.disposeCount}};
  101 |     };
  102 |   `});
  103 | 
  104 | // Bound each matched pair separately; this host needs room for software WebGL.
  105 | test.describe.configure({retries:0,timeout:450000});
  106 | test.beforeAll(async()=>{
  107 |   expect(hash(baseline)).toBe(baselineSHA);expect(hash(candidate)).toBe(finalSHA);expect(finalSHA).not.toBe(baselineSHA);
  108 |   expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSHA);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);
  109 |   mkdirSync(report,{recursive:true});await harness.start();
  110 | });
  111 | test.afterAll(async()=>{
  112 |   const retained=views.flatMap(view=>{try{return JSON.parse(readFileSync(resolve(report,view.id+'-evidence.json'),'utf8')).evidence;}catch{return [];}});
  113 |   writeFileSync(resolve(report,'face-preview-metrics.json'),JSON.stringify({baselineSHA,finalSHA,selectedViews:views.map(view=>view.id),evidence:retained},null,2));await harness.stop();
  114 | });
  115 | test.afterEach(async({page})=>{await harness.destroy(page);});
  116 | async function settle(page:Page){
  117 |   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  118 |   await page.locator('.fr-body3d-stage').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant' as ScrollBehavior}));
  119 |   const sequence=await page.evaluate(()=>{const w=window as any,c=document.querySelector('#wrap canvas');return w.__faceDraws.get(c)?.sequence||0;});
  120 |   await page.waitForFunction(n=>{const w=window as any,c=document.querySelector('#wrap canvas'),r=w.__faceDraws.get(c);return r && r.sequence>=n+2;},sequence,{timeout:15000});
  121 | }
  122 | async function probe(page:Page){const encoded=await page.evaluate(()=>JSON.stringify((window as any).__faceProbe(),(key,value)=>{
  123 |   if(typeof value==='number' && !Number.isFinite(value))throw Error('Non-finite evidence '+key);return value;}));expect(encoded).not.toBe('null');return JSON.parse(encoded);}
  124 | async function captureFrame(page:Page,value:any,prefix:string){
  125 |   const observed=await page.evaluate(()=>{const stage=document.querySelector('.fr-body3d-stage')!.getBoundingClientRect(),canvas=document.querySelector('#wrap canvas')!.getBoundingClientRect();return {stage:{x:stage.x,y:stage.y,width:stage.width,height:stage.height},canvas:{x:canvas.x,y:canvas.y,width:canvas.width,height:canvas.height},viewport:{width:innerWidth,height:innerHeight}};});
  126 |   const s=observed.stage,b=observed.canvas,p=value.faceProjection;
  127 |   expect(b.width).toBe(value.canvasRect.width);expect(b.height).toBe(value.canvasRect.height);expect(p.inFrame).toBeGreaterThan(0);
  128 |   const x=Math.floor(s.x),y=Math.floor(s.y),width=Math.ceil(s.x+s.width)-x,height=Math.ceil(s.y+s.height)-y;
  129 |   expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);expect(x+width).toBeLessThanOrEqual(observed.viewport.width);expect(y+height).toBeLessThanOrEqual(observed.viewport.height);
  130 |   const capture=prefix+'-stage.png',screenshotStart=Date.now(),buffer=await page.screenshot({path:resolve(report,capture),clip:{x,y,width,height},scale:'css',timeout:30000}),screenshotMs=Date.now()-screenshotStart;
  131 |   const margin=18,left=b.x+(Math.max(-1,p.min[0])+1)*b.width/2,top=b.y+(1-Math.min(1,p.max[1]))*b.height/2,right=b.x+(Math.min(1,p.max[0])+1)*b.width/2,bottom=b.y+(1-Math.max(-1,p.min[1]))*b.height/2;
  132 |   const cropX=Math.max(0,Math.floor(left-margin)-x),cropY=Math.max(0,Math.floor(top-margin)-y),cropWidth=Math.min(width-cropX,Math.ceil(right+margin)-x-cropX),cropHeight=Math.min(height-cropY,Math.ceil(bottom+margin)-y-cropY);
  133 |   expect(cropWidth).toBeGreaterThan(4);expect(cropHeight).toBeGreaterThan(4);
  134 |   const cropped=cropPng(buffer,{x:cropX,y:cropY,width:cropWidth,height:cropHeight},{width,height}),file=prefix+'-face.png';writeFileSync(resolve(report,file),cropped.buffer);
  135 |   return {capture,detail:{file,clip:{x:x+cropX,y:y+cropY,width:cropWidth,height:cropHeight},proof:cropped.proof,visibleVertices:p.inFrame,totalVertices:p.total,partiallyClipped:p.inFrame<p.total},captureInfo:{stageClip:{x,y,width,height},observedCanvas:b,screenshotMs}};
  136 | }
  137 | function matching(value:any,reference:any){
  138 |   expect(value.preservedScene,'all unrelated geometry, metadata, transforms and materials').toEqual(reference.preservedScene);
> 139 |   for(const key of ['camera','pose','state','neckMesh','neckProjection','neckBounds','selectedHand','skull','skullGeometry','cheekContext','torsoMesh','contrast','headMaterial','noseMaterial'])expect(value[key],key).toEqual(reference[key]);
      |                                                                                                                                                                                                                         ^ Error: camera
  140 |   for(const key of ['geometries','calls','materials','programs'])expect(value.draw[key],'rendered '+key).toBe(reference.draw[key]);
  141 |     expect(value.draw.triangles).toBe(reference.draw.triangles);
  142 |   expect(value.faceProjection).toEqual(reference.faceProjection);
  143 |   for(let i=0;i<value.noseMeshes.length;i++){
  144 |     const mesh=value.noseMeshes[i],old=reference.noseMeshes[i];expect(mesh.name).toBe(old.name);expect(mesh.material).toEqual(old.material);expect(mesh.visible).toBe(old.visible);
  145 |     expect(mesh.attributes.position.array).not.toEqual(old.attributes.position.array);expect(mesh.attributes.normal.array).not.toEqual(old.attributes.normal.array);
  146 |     expect(mesh.type).toBe(old.type);expect(mesh.parameters).toEqual(old.parameters);expect(mesh.vertices).toBe(mesh.name==='fr-manikin-nose'?1617:825);expect(mesh.vertices).toBe(old.vertices);expect(mesh.triangles).toBe(mesh.name==='fr-manikin-nose'?2976:1472);expect(mesh.triangles).toBe(old.triangles);expect(mesh.indexCount).toBe(old.indexCount);expect(mesh.index).toEqual(old.index);expect(mesh.attributes.uv).toEqual(old.attributes.uv);
  147 |     expect(Object.keys(mesh.attributes).sort()).toEqual(Object.keys(old.attributes).sort());
  148 |     for(const key of ['position','normal']){expect(mesh.attributes[key].count).toBe(old.attributes[key].count);expect(mesh.attributes[key].itemSize).toBe(old.attributes[key].itemSize);}
  149 |   }
  150 | }
  151 | 
  152 | for(const view of views)test('nose contour '+view.id+' preview at matching native view',async({page})=>{
  153 |   const errors:string[]=[];page.on('pageerror',e=>errors.push('page: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  154 |   await page.emulateMedia({reducedMotion:'reduce'});
  155 |   const attempts:any[]=[];
  156 |   try{await page.setViewportSize({width:view.width,height:view.height});let reference:any;
  157 |     for(const variant of ['baseline','candidate'] as const){
  158 |       const attempt:any={variant,startedAt:new Date().toISOString(),phase:'mount'};attempts.push(attempt);
  159 |       await page.unroute('**/stem_lab/stem_tool_firstresponse.js');const source=variant==='baseline'?baseline:candidate;
  160 |       await page.route('**/stem_lab/stem_tool_firstresponse.js',route=>route.fulfill({body:source,contentType:'text/javascript; charset=utf-8'}));
  161 |       attempt.mountWindow=await runMountWithWaitWindow(page,()=>harness.mount(page,{__faceContrast:view.contrast,firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'recovery',b3dAge:view.age,b3dRec:completed,b3dRecView:view.pose,b3dRecoveryGuides:false,b3dChildHands:'two',b3dPlaced:'correct',b3dHandStudy:{},faMastery:{},modulesVisited:{},badges:{}}},'window.__ctx.toolData.firstResponse.b3dStatus === "ready"'));expect(attempt.mountWindow.adjustedWaits).toBe(4);
  162 |       await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});await settle(page);
  163 |       const canvas=page.locator('#wrap canvas');await expect(canvas).toHaveCount(1);const handle=await canvas.elementHandle();expect(handle).toBeTruthy();
  164 |       await page.getByRole('button',{name:view.head?'Head close-up':'Supporting hand close-up',exact:true}).click();await settle(page);const value=await probe(page);attempt.probe=value;
  165 |       expect(value.contrast).toBe(view.contrast);expect(value.state.b3dStatus).toBe('ready');expect(value.state.b3dRecView).toBe(view.pose);expect(value.errors).toEqual([]);
  166 |       expect(value.draw.createdBy).toBe('page');expect(value.draw.calls).toBeGreaterThan(0);expect(value.draw.triangles).toBeGreaterThan(0);expect(value.draw.draws).toBeGreaterThan(0);expect(value.draw.disposeCount).toBe(0);
  167 |       expect(value.camera.aspect).toBeCloseTo(value.canvasRect.width/value.canvasRect.height,5);expect(value.selectedHand.total).toBeGreaterThan(0);if(!view.head)expect(value.selectedHand.inFrame,'complete supporting hand').toBe(value.selectedHand.total);expect(value.head.inFrame).toBeGreaterThan(0);
  168 |       if(!view.head)expect(value.cheekContext).toHaveLength(5);if(!view.head)for(const p of value.cheekContext){expect(Math.abs(p[0])).toBeLessThanOrEqual(1.001);expect(Math.abs(p[1])).toBeLessThanOrEqual(1.001);expect(p[2]).toBeGreaterThanOrEqual(-1.001);expect(p[2]).toBeLessThanOrEqual(1.001);}
  169 |       expect(value.neckMesh).toBeTruthy();expect(value.neckMesh.name).toBe('fr-manikin-neck');
  170 |       expect(value.neckMesh.vertices).toBeGreaterThan(0);expect(value.neckMesh.triangles).toBeGreaterThan(0);expect(value.neckMesh.visible).toBe(true);
  171 |       if(!view.head)expect(value.neckProjection.inFrame,'visible neck transition').toBeGreaterThan(0);
  172 |       expect(value.torsoMesh).toBeTruthy();expect(value.torsoMesh.name).toBe('fr-manikin-torso');expect(value.torsoMesh.visible).toBe(true);
  173 |       expect(value.torsoMesh.vertices).toBeGreaterThan(0);expect(value.torsoMesh.triangles).toBeGreaterThan(0);
  174 |       expect(value.faceProjection.inFrame,'visible facial landmarks').toBeGreaterThan(0);
  175 |       expect(value.noseMeshes.map((mesh:any)=>mesh.name)).toEqual(noseNames);
  176 |       for(const mesh of value.noseMeshes){expect(mesh.vertices).toBeGreaterThan(0);expect(mesh.triangles).toBeGreaterThan(0);expect(mesh.visible).toBe(true);expect(mesh.attributes.position).toBeTruthy();expect(mesh.attributes.normal).toBeTruthy();expect(mesh.material.opacity).toBe(1);expect(mesh.material.transparent).toBe(false);}
  177 |       expect(value.skull.total).toBeGreaterThan(0);expect(value.skull.inFrame).toBeGreaterThan(0);
  178 |       if(view.contrast){expect(value.torsoMesh.materialType,'actual contrast torso material').toBe('MeshBasicMaterial');expect(value.torsoMesh.colorHex,'actual dark contrast torso color').toBe(0x333333);}
  179 |       if(view.contrast){expect(value.neckMesh.materialType,'actual contrast neck material').toBe('MeshBasicMaterial');expect(value.neckMesh.colorHex,'actual white contrast neck color').toBe(0xffffff);}
  180 |       if(variant==='baseline')reference=value;else matching(value,reference);
  181 |       attempt.phase='capture';const prefix=view.id+'-'+variant,captured=await captureFrame(page,value,prefix);
  182 |       // Re-select the same camera to check that an inspection adds no geometry or programs.
  183 |       await page.getByRole('button',{name:view.head?'Head close-up':'Supporting hand close-up',exact:true}).click();await settle(page);const repeat=await probe(page);
  184 |       expect(repeat.draw.geometries).toBe(value.draw.geometries);expect(repeat.draw.programs).toBe(value.draw.programs);expect(repeat.camera).toEqual(value.camera);expect(repeat.noseMeshes).toEqual(value.noseMeshes);expect(repeat.skullGeometry).toEqual(value.skullGeometry);
  185 |       expect(repeat.preservedScene).toEqual(value.preservedScene);expect(repeat.noseMaterial).toEqual(value.noseMaterial);expect(repeat.draw.materials).toBe(value.draw.materials);
  186 |       evidence.push({...view,variant,sourceSHA:hash(source),...captured,...value});
  187 |       expect(await harness.glContexts(page)).toHaveLength(1);expect((await harness.glContexts(page)).filter(r=>r.connected && r.inWrap && !r.lost)).toHaveLength(1);
  188 |       attempt.phase='disposal';await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await handle!.evaluate((c:any)=>(window as any).__faceDraws.get(c).disposeCount)).toBe(1);
  189 |       const disposal=await handle!.evaluate((c:any)=>Array.from((window as any).__faceDraws.get(c).materials.values()) as any[]);attempt.materialDisposal=disposal;
  190 |       expect(disposal.length).toBe(value.draw.materials);for(const item of disposal)expect(item.disposeCount,'material disposed '+item.name).toBeGreaterThan(0);
  191 |       if(view.contrast)expect(disposal.filter((item:any)=>item.name==='fr-patient-nose-skin').map((item:any)=>item.disposeCount)).toEqual([1]);
  192 |       await expect(page.locator('#wrap canvas')).toHaveCount(0);await handle!.dispose();expect(errors).toEqual([]);
  193 |       attempt.phase='complete';
  194 |     }
  195 |     expect(hash(readFileSync(candidatePath))).toBe(finalSHA);expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSHA);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);expect(evidence.filter(e=>e.id===view.id)).toHaveLength(2);
  196 |   }finally{writeFileSync(resolve(report,view.id+'-evidence.json'),JSON.stringify({baselineSHA,finalSHA,view,attempts,evidence:evidence.filter(e=>e.id===view.id)},null,2));}
  197 | });
  198 | 
```