# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: firstresponse-face-preview.spec.ts >> nose contrast infant-pose8-contrast preview at matching native supporting-hand view
- Location: ..\..\..\Documents\Codex\2026-09-29\new-chat-14\firstresponse-face-contrast-work\firstresponse-face-preview.spec.ts:159:29

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 0
+ Received  + 1

  Object {
+   "_baseOpacity": 1,
    "frNoseContourStrength": Object {
      "value": 1,
    },
  }
```

# Test source

```ts
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
  60  |           if(window.__ctx.isContrast){mat=exactMaterial(headMaterial);hooks=materialHooks(headMaterial);}
  61  |         }
  62  |         exactScene.push({path:key,name:o.name,type:o.type,visible:o.visible,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),matrix:o.matrix.elements,renderOrder:o.renderOrder,layers:o.layers.mask,castShadow:o.castShadow,receiveShadow:o.receiveShadow,frustumCulled:o.frustumCulled,userData:o.userData,geometry:o.geometry?exactGeometry(o.geometry):null,material:mat,materialHooks:hooks});
  63  |         o.children.forEach(function(child,i){visitExact(child,key+'/'+i);});
  64  |       }
  65  |       visitExact(drawn.scene,'scene');
  66  |       function isEyeMesh(o){return /^fr-manikin-(?:upper-lid|lower-lid|eye)-(?:left|right)$/.test(o.name);}
  67  |       function geometryDescriptor(o){
  68  |         var geometry=o.geometry,positions=geometry.attributes.position,normals=geometry.attributes.normal,attributes={};
  69  |         Object.keys(geometry.attributes).sort().forEach(function(name){var a=geometry.attributes[name];attributes[name]={count:a.count,itemSize:a.itemSize,array:digest(Array.from(a.array))};});
  70  |         var bounds=new T.Box3().setFromBufferAttribute(positions);
  71  |         for(var i=0;i<positions.count;i++)if(!isFinite(positions.getX(i)+positions.getY(i)+positions.getZ(i)))throw Error('Non-finite eye/skull position '+o.name);
  72  |         if(normals)for(var i=0;i<normals.count;i++)if(!isFinite(normals.getX(i)+normals.getY(i)+normals.getZ(i)))throw Error('Non-finite eye/skull normal '+o.name);
  73  |         return {name:o.name,vertices:positions.count,triangles:geometry.index?geometry.index.count/3:positions.count/3,attributes:attributes,index:geometry.index?digest(Array.from(geometry.index.array)):null,
  74  |           bounds:[bounds.min.toArray(),bounds.max.toArray()],material:{type:o.material.type,colorHex:o.material.color.getHex(),side:o.material.side,transparent:o.material.transparent,opacity:o.material.opacity,depthWrite:o.material.depthWrite},visible:visible(o)};
  75  |       }
  76  |       function projected(group,predicate){var total=0,inFrame=0,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  77  |         group.traverse(function(o){if(!o.isMesh || !visible(o) || !o.geometry.attributes.position)return;
  78  |           var a=o.geometry.attributes.position;for(var i=0;i<a.count;i++){
  79  |             if(predicate && !predicate(o,a,i))continue;
  80  |             var p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);if(!isFinite(p.x+p.y+p.z))throw Error('Non-finite projected '+o.name);
  81  |             total++;var values=[p.x,p.y,p.z];for(var j=0;j<3;j++){min[j]=Math.min(min[j],values[j]);max[j]=Math.max(max[j],values[j]);}
  82  |             if(Math.abs(p.x)<=1.001 && Math.abs(p.y)<=1.001 && p.z>=-1.001 && p.z<=1.001)inFrame++;
  83  |           }
  84  |         });return {total:total,inFrame:inFrame,min:total?min:null,max:total?max:null};}
  85  |       var structure=[],preserved=[],counts={objects:0,meshes:0},neckMesh=null,torsoMesh=null,eyeMeshes=[];
  86  |       model.traverse(function(o){counts.objects++;if(o.isMesh)counts.meshes++;structure.push([o.name,o.parent && o.parent.name,o.visible]);
  87  |         if(o.isMesh && isEyeMesh(o))eyeMeshes.push(geometryDescriptor(o));
  88  |         preserved.push([o.name,o.parent && o.parent.name,o.matrix.elements,o.visible]);
  89  |         if(o.isMesh && o.name==='fr-manikin-neck')neckMesh={name:o.name,vertices:o.geometry.attributes.position.count,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3,materialType:o.material.type,colorHex:o.material.color.getHex(),visible:visible(o)};
  90  |         if(o.isMesh && o.name==='fr-manikin-torso')torsoMesh={name:o.name,vertices:o.geometry.attributes.position.count,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3,materialType:o.material.type,colorHex:o.material.color.getHex(),visible:visible(o)};
  91  |       });
  92  |       var hand=model.getObjectByName('fr-patient-right-hand'),head=model.getObjectByName('fr-manikin-head-pivot'),context=hand.userData.inspection.context,b=canvas.getBoundingClientRect();
  93  |       var neck=model.getObjectByName('fr-manikin-neck'),neckProjection=projected(neck),neckBox=new T.Box3().setFromObject(neck);
  94  |       var skull=model.getObjectByName('fr-manikin-head'),preservedFace=projected(head,function(o){return !/^fr-manikin-eye-(?:left|right)$/.test(o.name);});
  95  |       var faceProjection=projected(head,function(o){return isEyeMesh(o) || /^fr-manikin-brow-(?:left|right)$/.test(o.name) || o.name==='fr-manikin-nose' || o.name==='fr-manikin-mouth';});
  96  |       eyeMeshes.sort(function(a,b){return a.name.localeCompare(b.name);});
  97  |       return {preservedScene:digest(exactScene),noseMaterial:noseMaterial,headMaterial:exactMaterial(headMaterial),camera:{position:camera.getWorldPosition(new T.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},
  98  |         pose:{structure:digest(structure),preservedTransforms:digest(preserved),counts:counts},neckMesh:neckMesh,torsoMesh:torsoMesh,faceProjection:faceProjection,eyeMeshes:eyeMeshes,skull:projected(skull),skullGeometry:geometryDescriptor(skull),preservedFace:preservedFace,neckProjection:neckProjection,neckBounds:[neckBox.min.toArray(),neckBox.max.toArray()],selectedHand:projected(hand),head:projected(head),
  99  |         canvasRect:{x:b.x,y:b.y,width:b.width,height:b.height},cheekContext:context.map(function(p){return new T.Vector3().fromArray(p).project(camera).toArray();}),
  100 |         contrast:window.__ctx.isContrast,state:window.__ctx.toolData.firstResponse,errors:window.__events.errors.slice(),
  101 |         draw:{materials:drawn.materials.size,id:rec.id,createdBy:rec.createdBy,draws:rec.draws,sequence:drawn.sequence,calls:drawn.calls,triangles:drawn.triangles,geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length,disposeCount:drawn.disposeCount}};
  102 |     };
  103 |   `});
  104 | 
  105 | // Bound each matched pair separately; this host needs room for software WebGL.
  106 | test.describe.configure({retries:0,timeout:450000});
  107 | test.beforeAll(async()=>{
  108 |   expect(hash(baseline)).toBe(baselineSHA);expect(hash(candidate)).toBe(finalSHA);expect(finalSHA).not.toBe(baselineSHA);
  109 |   expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSHA);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);
  110 |   mkdirSync(report,{recursive:true});await harness.start();
  111 | });
  112 | test.afterAll(async()=>{
  113 |   const retained=views.flatMap(view=>{try{return JSON.parse(readFileSync(resolve(report,view.id+'-evidence.json'),'utf8')).evidence;}catch{return [];}});
  114 |   writeFileSync(resolve(report,'face-preview-metrics.json'),JSON.stringify({baselineSHA,finalSHA,selectedViews:views.map(view=>view.id),evidence:retained},null,2));await harness.stop();
  115 | });
  116 | test.afterEach(async({page})=>{await harness.destroy(page);});
  117 | async function settle(page:Page){
  118 |   await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  119 |   await page.locator('.fr-body3d-stage').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant' as ScrollBehavior}));
  120 |   const sequence=await page.evaluate(()=>{const w=window as any,c=document.querySelector('#wrap canvas');return w.__faceDraws.get(c)?.sequence||0;});
  121 |   await page.waitForFunction(n=>{const w=window as any,c=document.querySelector('#wrap canvas'),r=w.__faceDraws.get(c);return r && r.sequence>=n+2;},sequence,{timeout:15000});
  122 | }
  123 | async function probe(page:Page){const encoded=await page.evaluate(()=>JSON.stringify((window as any).__faceProbe(),(key,value)=>{
  124 |   if(typeof value==='number' && !Number.isFinite(value))throw Error('Non-finite evidence '+key);return value;}));expect(encoded).not.toBe('null');return JSON.parse(encoded);}
  125 | async function captureFrame(page:Page,value:any,prefix:string){
  126 |   const observed=await page.evaluate(()=>{const stage=document.querySelector('.fr-body3d-stage')!.getBoundingClientRect(),canvas=document.querySelector('#wrap canvas')!.getBoundingClientRect();return {stage:{x:stage.x,y:stage.y,width:stage.width,height:stage.height},canvas:{x:canvas.x,y:canvas.y,width:canvas.width,height:canvas.height},viewport:{width:innerWidth,height:innerHeight}};});
  127 |   const s=observed.stage,b=observed.canvas,p=value.faceProjection;
  128 |   expect(b.width).toBe(value.canvasRect.width);expect(b.height).toBe(value.canvasRect.height);expect(p.inFrame).toBeGreaterThan(0);
  129 |   const x=Math.floor(s.x),y=Math.floor(s.y),width=Math.ceil(s.x+s.width)-x,height=Math.ceil(s.y+s.height)-y;
  130 |   expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);expect(x+width).toBeLessThanOrEqual(observed.viewport.width);expect(y+height).toBeLessThanOrEqual(observed.viewport.height);
  131 |   const capture=prefix+'-stage.png',screenshotStart=Date.now(),buffer=await page.screenshot({path:resolve(report,capture),clip:{x,y,width,height},scale:'css',timeout:30000}),screenshotMs=Date.now()-screenshotStart;
  132 |   const margin=18,left=b.x+(Math.max(-1,p.min[0])+1)*b.width/2,top=b.y+(1-Math.min(1,p.max[1]))*b.height/2,right=b.x+(Math.min(1,p.max[0])+1)*b.width/2,bottom=b.y+(1-Math.max(-1,p.min[1]))*b.height/2;
  133 |   const cropX=Math.max(0,Math.floor(left-margin)-x),cropY=Math.max(0,Math.floor(top-margin)-y),cropWidth=Math.min(width-cropX,Math.ceil(right+margin)-x-cropX),cropHeight=Math.min(height-cropY,Math.ceil(bottom+margin)-y-cropY);
  134 |   expect(cropWidth).toBeGreaterThan(4);expect(cropHeight).toBeGreaterThan(4);
  135 |   const cropped=cropPng(buffer,{x:cropX,y:cropY,width:cropWidth,height:cropHeight},{width,height}),file=prefix+'-face.png';writeFileSync(resolve(report,file),cropped.buffer);
  136 |   return {capture,detail:{file,clip:{x:x+cropX,y:y+cropY,width:cropWidth,height:cropHeight},proof:cropped.proof,visibleVertices:p.inFrame,totalVertices:p.total,partiallyClipped:p.inFrame<p.total},captureInfo:{stageClip:{x,y,width,height},observedCanvas:b,screenshotMs}};
  137 | }
  138 | function validNose(value:any,variant:string){
  139 |   const nose=value.noseMaterial;expect(nose.name).toBe('fr-manikin-nose');expect(nose.visible).toBe(true);
  140 |   expect(nose.material.type).toBe(value.contrast?'MeshBasicMaterial':'MeshPhongMaterial');
  141 |   if(value.contrast&&variant==='candidate'){
  142 |     expect(nose.separateFromHead).toBe(true);expect(nose.strength).toBe(1);
> 143 |     expect(nose.material.name).toBe('fr-patient-nose-skin');expect(nose.material.userData).toEqual({frNoseContourStrength:{value:1}});
      |                                                                                            ^ Error: expect(received).toEqual(expected) // deep equality
  144 |     expect(nose.hooks.cacheKey).toBe('fr-patient-nose-contrast-contours-v1');
  145 |     for(const fragment of ['shader.uniforms.frNoseContourStrength = noseContourStrength','frNoseSurfaceNormal = normalize(normalMatrix * normal)','frNoseViewPosition = -mvPosition.xyz','abs(dot(normalize(frNoseSurfaceNormal), normalize(frNoseViewPosition)))','mix(0.08, 1.0, smoothstep(0.20, 0.45, frNoseFacing))','diffuseColor.rgb *= mix(1.0, frNoseContour, frNoseContourStrength)'])expect(nose.hooks.compile).toContain(fragment);
  146 |     const clean=JSON.parse(JSON.stringify(nose.material));delete clean.name;delete clean.userData;expect(clean).toEqual(value.headMaterial);
  147 |   }else{expect(nose.separateFromHead).toBe(false);expect(nose.strength).toBe(null);expect(nose.material).toEqual(value.headMaterial);}
  148 | }
  149 | function matching(value:any,reference:any){
  150 |   expect(value.preservedScene,'all geometry, metadata, transforms and other materials').toEqual(reference.preservedScene);
  151 |   for(const key of ['camera','pose','state','neckMesh','neckProjection','neckBounds','selectedHand','skull','skullGeometry','preservedFace','cheekContext','eyeMeshes','torsoMesh','faceProjection','head','contrast','headMaterial'])expect(value[key],key).toEqual(reference[key]);
  152 |   for(const key of ['geometries','calls','triangles'])expect(value.draw[key],'actual rendered '+key).toBe(reference.draw[key]);
  153 |   const extra=value.contrast?1:0;
  154 |   expect(value.draw.programs,'only the contrast nose adds a compiled program').toBe(reference.draw.programs+extra);
  155 |   expect(value.draw.materials,'only the contrast nose adds a material').toBe(reference.draw.materials+extra);
  156 |   if(!value.contrast)expect(value.noseMaterial,'normal nose finish exact').toEqual(reference.noseMaterial);
  157 | }
  158 | 
  159 | for(const view of views)test('nose contrast '+view.id+' preview at matching native supporting-hand view',async({page})=>{
  160 |   const errors:string[]=[];page.on('pageerror',e=>errors.push('page: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  161 |   await page.emulateMedia({reducedMotion:'reduce'});
  162 |   const attempts:any[]=[];
  163 |   try{await page.setViewportSize({width:view.width,height:view.height});let reference:any;
  164 |     for(const variant of ['baseline','candidate'] as const){
  165 |       const attempt:any={variant,startedAt:new Date().toISOString(),phase:'mount'};attempts.push(attempt);
  166 |       await page.unroute('**/stem_lab/stem_tool_firstresponse.js');const source=variant==='baseline'?baseline:candidate;
  167 |       await page.route('**/stem_lab/stem_tool_firstresponse.js',route=>route.fulfill({body:source,contentType:'text/javascript; charset=utf-8'}));
  168 |       attempt.mountWindow=await runMountWithWaitWindow(page,()=>harness.mount(page,{__faceContrast:view.contrast,firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'recovery',b3dAge:view.age,b3dRec:completed,b3dRecView:view.pose,b3dRecoveryGuides:false,b3dChildHands:'two',b3dPlaced:'correct',b3dHandStudy:{},faMastery:{},modulesVisited:{},badges:{}}},'window.__ctx.toolData.firstResponse.b3dStatus === "ready"'));expect(attempt.mountWindow.adjustedWaits).toBe(4);
  169 |       await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});await settle(page);
  170 |       const canvas=page.locator('#wrap canvas');await expect(canvas).toHaveCount(1);const handle=await canvas.elementHandle();expect(handle).toBeTruthy();
  171 |       await page.getByRole('button',{name:'Supporting hand close-up',exact:true}).click();await settle(page);const value=await probe(page);attempt.probe=value;
  172 |       expect(value.contrast).toBe(view.contrast);expect(value.state.b3dStatus).toBe('ready');expect(value.state.b3dRecView).toBe(view.pose);expect(value.errors).toEqual([]);
  173 |       expect(value.draw.createdBy).toBe('page');expect(value.draw.calls).toBeGreaterThan(0);expect(value.draw.triangles).toBeGreaterThan(0);expect(value.draw.draws).toBeGreaterThan(0);expect(value.draw.disposeCount).toBe(0);
  174 |       expect(value.camera.aspect).toBeCloseTo(value.canvasRect.width/value.canvasRect.height,5);expect(value.selectedHand.total).toBeGreaterThan(0);expect(value.selectedHand.inFrame,'complete supporting hand').toBe(value.selectedHand.total);expect(value.head.inFrame).toBeGreaterThan(0);
  175 |       expect(value.cheekContext).toHaveLength(5);for(const p of value.cheekContext){expect(Math.abs(p[0])).toBeLessThanOrEqual(1.001);expect(Math.abs(p[1])).toBeLessThanOrEqual(1.001);expect(p[2]).toBeGreaterThanOrEqual(-1.001);expect(p[2]).toBeLessThanOrEqual(1.001);}
  176 |       expect(value.neckMesh).toBeTruthy();expect(value.neckMesh.name).toBe('fr-manikin-neck');
  177 |       expect(value.neckMesh.vertices).toBeGreaterThan(0);expect(value.neckMesh.triangles).toBeGreaterThan(0);expect(value.neckMesh.visible).toBe(true);
  178 |       expect(value.neckProjection.inFrame,'visible neck transition').toBeGreaterThan(0);
  179 |       expect(value.torsoMesh).toBeTruthy();expect(value.torsoMesh.name).toBe('fr-manikin-torso');expect(value.torsoMesh.visible).toBe(true);
  180 |       expect(value.torsoMesh.vertices).toBeGreaterThan(0);expect(value.torsoMesh.triangles).toBeGreaterThan(0);
  181 |       expect(value.faceProjection.inFrame,'visible facial landmarks').toBeGreaterThan(0);
  182 |       expect(value.eyeMeshes.map((mesh:any)=>mesh.name)).toEqual(eyeNames);
  183 |       for(const mesh of value.eyeMeshes){expect(mesh.vertices).toBeGreaterThan(0);expect(mesh.triangles).toBeGreaterThan(0);expect(mesh.visible).toBe(true);expect(mesh.attributes.position).toBeTruthy();expect(mesh.attributes.normal).toBeTruthy();expect(mesh.material.opacity).toBe(1);expect(mesh.material.transparent).toBe(false);}
  184 |       expect(value.skull.total).toBeGreaterThan(0);expect(value.skull.inFrame).toBeGreaterThan(0);
  185 |       if(view.contrast){expect(value.torsoMesh.materialType,'actual contrast torso material').toBe('MeshBasicMaterial');expect(value.torsoMesh.colorHex,'actual dark contrast torso color').toBe(0x333333);}
  186 |       if(view.contrast){expect(value.neckMesh.materialType,'actual contrast neck material').toBe('MeshBasicMaterial');expect(value.neckMesh.colorHex,'actual white contrast neck color').toBe(0xffffff);}
  187 |       validNose(value,variant);if(variant==='baseline')reference=value;else matching(value,reference);
  188 |       attempt.phase='capture';const prefix=view.id+'-'+variant,captured=await captureFrame(page,value,prefix);
  189 |       // Re-select the same camera to check that an inspection adds no geometry or programs.
  190 |       await page.getByRole('button',{name:'Supporting hand close-up',exact:true}).click();await settle(page);const repeat=await probe(page);
  191 |       expect(repeat.draw.geometries).toBe(value.draw.geometries);expect(repeat.draw.programs).toBe(value.draw.programs);expect(repeat.camera).toEqual(value.camera);expect(repeat.eyeMeshes).toEqual(value.eyeMeshes);expect(repeat.skullGeometry).toEqual(value.skullGeometry);
  192 |       expect(repeat.preservedScene).toEqual(value.preservedScene);expect(repeat.noseMaterial).toEqual(value.noseMaterial);expect(repeat.draw.materials).toBe(value.draw.materials);
  193 |       evidence.push({...view,variant,sourceSHA:hash(source),...captured,...value});
  194 |       expect(await harness.glContexts(page)).toHaveLength(1);expect((await harness.glContexts(page)).filter(r=>r.connected && r.inWrap && !r.lost)).toHaveLength(1);
  195 |       attempt.phase='disposal';await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await handle!.evaluate((c:any)=>(window as any).__faceDraws.get(c).disposeCount)).toBe(1);
  196 |       const disposal=await handle!.evaluate((c:any)=>Array.from((window as any).__faceDraws.get(c).materials.values()) as any[]);attempt.materialDisposal=disposal;
  197 |       expect(disposal.length).toBe(value.draw.materials);for(const item of disposal)expect(item.disposeCount,'material disposed '+item.name).toBeGreaterThan(0);
  198 |       if(view.contrast&&variant==='candidate')expect(disposal.filter((item:any)=>item.name==='fr-patient-nose-skin').map((item:any)=>item.disposeCount)).toEqual([1]);
  199 |       await expect(page.locator('#wrap canvas')).toHaveCount(0);await handle!.dispose();expect(errors).toEqual([]);
  200 |       attempt.phase='complete';
  201 |     }
  202 |     expect(hash(readFileSync(candidatePath))).toBe(finalSHA);expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSHA);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);expect(evidence.filter(e=>e.id===view.id)).toHaveLength(2);
  203 |   }finally{writeFileSync(resolve(report,view.id+'-evidence.json'),JSON.stringify({baselineSHA,finalSHA,view,attempts,evidence:evidence.filter(e=>e.id===view.id)},null,2));}
  204 | });
  205 | 
```