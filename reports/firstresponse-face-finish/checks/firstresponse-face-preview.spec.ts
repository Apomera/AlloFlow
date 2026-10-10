import {expect,test,type Page} from 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/@playwright/test/index.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {GlHarness} from 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/helpers/stem_gl_harness';

const work=process.env.FIRST_RESPONSE_FACE_WORK!,report=process.env.FIRST_RESPONSE_FACE_REPORT!;
const finalSHA=process.env.FIRST_RESPONSE_FACE_SOURCE_SHA!,candidatePath=process.env.FIRST_RESPONSE_FACE_CANDIDATE!;
const baselineSHA='0cc79f45f9a57ce3c4f1d5fa674b56f462a2418c4b253dbc648557b37a6b2639';
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const baseline=readFileSync(resolve(work,'before.js')),candidate=readFileSync(candidatePath),evidence:any[]=[];
const eyeNames=['fr-manikin-upper-lid-left','fr-manikin-upper-lid-right','fr-manikin-lower-lid-left','fr-manikin-lower-lid-right','fr-manikin-eye-left','fr-manikin-eye-right'].sort();
const completed=['check','arm','hand','knee','roll','airway','stable','watch'];
const allViews=[
  {id:'adult-pose5',age:'adult',width:1280,height:1080,pose:5,contrast:false},
  {id:'adult-pose8',age:'adult',width:1280,height:1080,pose:8,contrast:false},
  {id:'infant-pose8-contrast',age:'infant',width:320,height:840,pose:8,contrast:true},
] as const;
const requestedViews=(process.env.FIRST_RESPONSE_FACE_VIEWS || allViews.map(v=>v.id).join(',')).split(',');
if(new Set(requestedViews).size!==requestedViews.length || requestedViews.some(id=>!allViews.some(view=>view.id===id)))throw Error('Invalid requested face views');
const views=allViews.filter(view=>requestedViews.includes(view.id));

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_firstresponse.js',toolId:'firstResponse',preScripts:['stem_lab/stem_lab_module.js'],
  width:1160,height:1080,layout:'document',appStyles:true,probes:`
    // React's initial root.render is asynchronous; set the context before that render runs.
    var FaceMount=window.__mount;
    window.__mount=function(data){var contrast=!!data.__faceContrast,clean=Object.assign({},data);delete clean.__faceContrast;
      var result=FaceMount(clean);window.__ctx.isContrast=contrast;return result;};
    window.__faceDraws=new WeakMap();var FaceRenderer=THREE.WebGLRenderer;
    THREE.WebGLRenderer=new Proxy(FaceRenderer,{construct:function(target,args,newTarget){
      var renderer=Reflect.construct(target,args,newTarget),render=renderer.render,dispose=renderer.dispose;
      var record={renderer:renderer,disposeCount:0,sequence:0};window.__faceDraws.set(renderer.domElement,record);
      renderer.dispose=function(){record.disposeCount++;return dispose.apply(this,arguments);};
      renderer.render=function(scene,camera){var result=render.apply(this,arguments);
        if(scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')){
          record.scene=scene;record.camera=camera;record.sequence++;record.calls=renderer.info.render.calls;record.triangles=renderer.info.render.triangles;
        }return result;};return renderer;
    }});
    window.__faceProbe=function(){
      var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__faceDraws.get(canvas),rec=canvas && window.__glRecorder.forCanvas(canvas);
      if(!drawn || !drawn.scene || !rec)return null;
      var T=THREE,model=drawn.scene.getObjectByName('fr-training-manikin'),camera=drawn.camera;model.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      function visible(o){var a=o;while(a){if(!a.visible)return false;a=a.parent;}return true;}
      function digest(rows){var s=JSON.stringify(rows),h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return {hash:(h>>>0).toString(16),bytes:s.length};}
      function isEyeMesh(o){return /^fr-manikin-(?:upper-lid|lower-lid|eye)-(?:left|right)$/.test(o.name);}
      function geometryDescriptor(o){
        var geometry=o.geometry,positions=geometry.attributes.position,normals=geometry.attributes.normal,attributes={};
        Object.keys(geometry.attributes).sort().forEach(function(name){var a=geometry.attributes[name];attributes[name]={count:a.count,itemSize:a.itemSize,array:digest(Array.from(a.array))};});
        var bounds=new T.Box3().setFromBufferAttribute(positions);
        for(var i=0;i<positions.count;i++)if(!isFinite(positions.getX(i)+positions.getY(i)+positions.getZ(i)))throw Error('Non-finite eye/skull position '+o.name);
        if(normals)for(var i=0;i<normals.count;i++)if(!isFinite(normals.getX(i)+normals.getY(i)+normals.getZ(i)))throw Error('Non-finite eye/skull normal '+o.name);
        return {name:o.name,vertices:positions.count,triangles:geometry.index?geometry.index.count/3:positions.count/3,attributes:attributes,index:geometry.index?digest(Array.from(geometry.index.array)):null,
          bounds:[bounds.min.toArray(),bounds.max.toArray()],material:{type:o.material.type,colorHex:o.material.color.getHex(),side:o.material.side,transparent:o.material.transparent,opacity:o.material.opacity,depthWrite:o.material.depthWrite},visible:visible(o)};
      }
      function projected(group,predicate){var total=0,inFrame=0,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
        group.traverse(function(o){if(!o.isMesh || !visible(o) || !o.geometry.attributes.position)return;
          var a=o.geometry.attributes.position;for(var i=0;i<a.count;i++){
            if(predicate && !predicate(o,a,i))continue;
            var p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);if(!isFinite(p.x+p.y+p.z))throw Error('Non-finite projected '+o.name);
            total++;var values=[p.x,p.y,p.z];for(var j=0;j<3;j++){min[j]=Math.min(min[j],values[j]);max[j]=Math.max(max[j],values[j]);}
            if(Math.abs(p.x)<=1.001 && Math.abs(p.y)<=1.001 && p.z>=-1.001 && p.z<=1.001)inFrame++;
          }
        });return {total:total,inFrame:inFrame,min:total?min:null,max:total?max:null};}
      var structure=[],preserved=[],counts={objects:0,meshes:0},neckMesh=null,torsoMesh=null,eyeMeshes=[];
      model.traverse(function(o){counts.objects++;if(o.isMesh)counts.meshes++;structure.push([o.name,o.parent && o.parent.name,o.visible]);
        if(o.isMesh && isEyeMesh(o))eyeMeshes.push(geometryDescriptor(o));
        preserved.push([o.name,o.parent && o.parent.name,o.matrix.elements,o.visible]);
        if(o.isMesh && o.name==='fr-manikin-neck')neckMesh={name:o.name,vertices:o.geometry.attributes.position.count,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3,materialType:o.material.type,colorHex:o.material.color.getHex(),visible:visible(o)};
        if(o.isMesh && o.name==='fr-manikin-torso')torsoMesh={name:o.name,vertices:o.geometry.attributes.position.count,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3,materialType:o.material.type,colorHex:o.material.color.getHex(),visible:visible(o)};
      });
      var hand=model.getObjectByName('fr-patient-right-hand'),head=model.getObjectByName('fr-manikin-head-pivot'),context=hand.userData.inspection.context,b=canvas.getBoundingClientRect();
      var neck=model.getObjectByName('fr-manikin-neck'),neckProjection=projected(neck),neckBox=new T.Box3().setFromObject(neck);
      var skull=model.getObjectByName('fr-manikin-head'),preservedFace=projected(head,function(o){return !/^fr-manikin-eye-(?:left|right)$/.test(o.name);});
      var faceProjection=projected(head,function(o){return isEyeMesh(o) || /^fr-manikin-brow-(?:left|right)$/.test(o.name) || o.name==='fr-manikin-nose' || o.name==='fr-manikin-mouth';});
      eyeMeshes.sort(function(a,b){return a.name.localeCompare(b.name);});
      return {camera:{position:camera.getWorldPosition(new T.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},
        pose:{structure:digest(structure),preservedTransforms:digest(preserved),counts:counts},neckMesh:neckMesh,torsoMesh:torsoMesh,faceProjection:faceProjection,eyeMeshes:eyeMeshes,skull:projected(skull),skullGeometry:geometryDescriptor(skull),preservedFace:preservedFace,neckProjection:neckProjection,neckBounds:[neckBox.min.toArray(),neckBox.max.toArray()],selectedHand:projected(hand),head:projected(head),
        canvasRect:{x:b.x,y:b.y,width:b.width,height:b.height},cheekContext:context.map(function(p){return new T.Vector3().fromArray(p).project(camera).toArray();}),
        contrast:window.__ctx.isContrast,state:window.__ctx.toolData.firstResponse,errors:window.__events.errors.slice(),
        draw:{id:rec.id,createdBy:rec.createdBy,draws:rec.draws,sequence:drawn.sequence,calls:drawn.calls,triangles:drawn.triangles,geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length,disposeCount:drawn.disposeCount}};
    };
  `});

// Bound each matched pair separately; this host needs room for software WebGL.
test.describe.configure({retries:0,timeout:300000});
test.beforeAll(async()=>{
  expect(hash(baseline)).toBe(baselineSHA);expect(hash(candidate)).toBe(finalSHA);expect(finalSHA).not.toBe(baselineSHA);
  expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSHA);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);
  mkdirSync(report,{recursive:true});await harness.start();
});
test.afterAll(async()=>{
  const retained=views.flatMap(view=>{try{return JSON.parse(readFileSync(resolve(report,view.id+'-evidence.json'),'utf8')).evidence;}catch{return [];}});
  writeFileSync(resolve(report,'face-preview-metrics.json'),JSON.stringify({baselineSHA,finalSHA,selectedViews:views.map(view=>view.id),evidence:retained},null,2));await harness.stop();
});
test.afterEach(async({page})=>{await harness.destroy(page);});
async function settle(page:Page){
  await page.locator('.fr-body3d-stage').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant' as ScrollBehavior}));
  const sequence=await page.evaluate(()=>{const w=window as any,c=document.querySelector('#wrap canvas');return w.__faceDraws.get(c)?.sequence||0;});
  await page.waitForFunction(n=>{const w=window as any,c=document.querySelector('#wrap canvas'),r=w.__faceDraws.get(c);return r && r.sequence>=n+2;},sequence,{timeout:10000});
}
async function probe(page:Page){const encoded=await page.evaluate(()=>JSON.stringify((window as any).__faceProbe(),(key,value)=>{
  if(typeof value==='number' && !Number.isFinite(value))throw Error('Non-finite evidence '+key);return value;}));expect(encoded).not.toBe('null');return JSON.parse(encoded);}
async function captureFace(page:Page,value:any,prefix:string){
  const p=value.faceProjection,b=value.canvasRect;
  if(!p || !p.min || p.inFrame===0)return null;
  const left=b.x+(Math.max(-1,p.min[0])+1)*b.width/2,top=b.y+(1-Math.min(1,p.max[1]))*b.height/2;
  const right=b.x+(Math.min(1,p.max[0])+1)*b.width/2,bottom=b.y+(1-Math.max(-1,p.min[1]))*b.height/2;
  if(right-left<4 || bottom-top<4)return null;
  const viewport=page.viewportSize()!,margin=18,x=Math.max(0,Math.floor(left-margin)),y=Math.max(0,Math.floor(top-margin));
  const width=Math.min(viewport.width-x,Math.ceil(right+margin)-x),height=Math.min(viewport.height-y,Math.ceil(bottom+margin)-y);
  if(width<=0 || height<=0)return null;
  const file=prefix+'-face.png';await page.screenshot({path:resolve(report,file),clip:{x,y,width,height},timeout:30000});
  return {file,clip:{x,y,width,height}};
}

for(const view of views)test('closed-eye surface '+view.id+' preview at matching native supporting-hand view',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push('page: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  await page.emulateMedia({reducedMotion:'reduce'});
  const attempts:any[]=[];
  try{await page.setViewportSize({width:view.width,height:view.height});let reference:any;
    for(const variant of ['baseline','candidate'] as const){
      const attempt:any={variant,startedAt:new Date().toISOString(),phase:'mount'};attempts.push(attempt);
      await page.unroute('**/stem_lab/stem_tool_firstresponse.js');const source=variant==='baseline'?baseline:candidate;
      await page.route('**/stem_lab/stem_tool_firstresponse.js',route=>route.fulfill({body:source,contentType:'text/javascript; charset=utf-8'}));
      await harness.mount(page,{__faceContrast:view.contrast,firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'recovery',b3dAge:view.age,b3dRec:completed,b3dRecView:view.pose,b3dRecoveryGuides:false,b3dChildHands:'two',b3dPlaced:'correct',b3dHandStudy:{},faMastery:{},modulesVisited:{},badges:{}}},'window.__ctx.toolData.firstResponse.b3dStatus === "ready"');
      await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});await settle(page);
      const canvas=page.locator('#wrap canvas');await expect(canvas).toHaveCount(1);const handle=await canvas.elementHandle();expect(handle).toBeTruthy();
      await page.getByRole('button',{name:'Supporting hand close-up',exact:true}).click();await settle(page);const value=await probe(page);attempt.probe=value;
      expect(value.contrast).toBe(view.contrast);expect(value.state.b3dStatus).toBe('ready');expect(value.state.b3dRecView).toBe(view.pose);expect(value.errors).toEqual([]);
      expect(value.draw.createdBy).toBe('page');expect(value.draw.calls).toBeGreaterThan(0);expect(value.draw.triangles).toBeGreaterThan(0);expect(value.draw.draws).toBeGreaterThan(0);expect(value.draw.disposeCount).toBe(0);
      expect(value.camera.aspect).toBeCloseTo(value.canvasRect.width/value.canvasRect.height,5);expect(value.selectedHand.total).toBeGreaterThan(0);expect(value.selectedHand.inFrame,'complete supporting hand').toBe(value.selectedHand.total);expect(value.head.inFrame).toBeGreaterThan(0);
      expect(value.cheekContext).toHaveLength(5);for(const p of value.cheekContext){expect(Math.abs(p[0])).toBeLessThanOrEqual(1.001);expect(Math.abs(p[1])).toBeLessThanOrEqual(1.001);expect(p[2]).toBeGreaterThanOrEqual(-1.001);expect(p[2]).toBeLessThanOrEqual(1.001);}
      expect(value.neckMesh).toBeTruthy();expect(value.neckMesh.name).toBe('fr-manikin-neck');
      expect(value.neckMesh.vertices).toBeGreaterThan(0);expect(value.neckMesh.triangles).toBeGreaterThan(0);expect(value.neckMesh.visible).toBe(true);
      expect(value.neckProjection.inFrame,'visible neck transition').toBeGreaterThan(0);
      expect(value.torsoMesh).toBeTruthy();expect(value.torsoMesh.name).toBe('fr-manikin-torso');expect(value.torsoMesh.visible).toBe(true);
      expect(value.torsoMesh.vertices).toBeGreaterThan(0);expect(value.torsoMesh.triangles).toBeGreaterThan(0);
      expect(value.faceProjection.inFrame,'visible facial landmarks').toBeGreaterThan(0);
      expect(value.eyeMeshes.map((mesh:any)=>mesh.name)).toEqual(eyeNames);
      for(const mesh of value.eyeMeshes){expect(mesh.vertices).toBeGreaterThan(0);expect(mesh.triangles).toBeGreaterThan(0);expect(mesh.visible).toBe(true);expect(mesh.attributes.position).toBeTruthy();expect(mesh.attributes.normal).toBeTruthy();expect(mesh.material.opacity).toBe(1);expect(mesh.material.transparent).toBe(false);}
      expect(value.skull.total).toBeGreaterThan(0);expect(value.skull.inFrame).toBeGreaterThan(0);
      if(view.contrast){expect(value.torsoMesh.materialType,'actual contrast torso material').toBe('MeshBasicMaterial');expect(value.torsoMesh.colorHex,'actual dark contrast torso color').toBe(0x333333);}
      if(view.contrast){expect(value.neckMesh.materialType,'actual contrast neck material').toBe('MeshBasicMaterial');expect(value.neckMesh.colorHex,'actual white contrast neck color').toBe(0xffffff);}
      if(variant==='baseline')reference=value;else{
        expect(value.camera).toEqual(reference.camera);expect(value.pose).toEqual(reference.pose);expect(value.state).toEqual(reference.state);
        expect(value.neckMesh).toEqual(reference.neckMesh);expect(value.neckProjection).toEqual(reference.neckProjection);expect(value.neckBounds).toEqual(reference.neckBounds);
        expect(value.selectedHand).toEqual(reference.selectedHand);expect(value.skull).toEqual(reference.skull);expect(value.skullGeometry).toEqual(reference.skullGeometry);expect(value.preservedFace).toEqual(reference.preservedFace);expect(value.cheekContext).toEqual(reference.cheekContext);
        expect(value.eyeMeshes.filter((mesh:any)=>!mesh.name.startsWith('fr-manikin-eye-')),'all four original lid shells').toEqual(reference.eyeMeshes.filter((mesh:any)=>!mesh.name.startsWith('fr-manikin-eye-')));
        expect(value.eyeMeshes.map((mesh:any)=>({name:mesh.name,material:mesh.material,visible:mesh.visible}))).toEqual(reference.eyeMeshes.map((mesh:any)=>({name:mesh.name,material:mesh.material,visible:mesh.visible})));
        expect(value.torsoMesh).toEqual(reference.torsoMesh);
        expect(value.draw.geometries).toBe(reference.draw.geometries);expect(value.draw.programs).toBe(reference.draw.programs);
      }
      attempt.phase='capture';const prefix=view.id+'-'+variant,capture=prefix+'-stage.png';
      await page.locator('.fr-body3d-stage').screenshot({path:resolve(report,capture),timeout:30000});const detail=await captureFace(page,value,prefix);
      // Re-select the same camera to check that an inspection adds no geometry or programs.
      await page.getByRole('button',{name:'Supporting hand close-up',exact:true}).click();await settle(page);const repeat=await probe(page);
      expect(repeat.draw.geometries).toBe(value.draw.geometries);expect(repeat.draw.programs).toBe(value.draw.programs);expect(repeat.camera).toEqual(value.camera);expect(repeat.eyeMeshes).toEqual(value.eyeMeshes);expect(repeat.skullGeometry).toEqual(value.skullGeometry);
      evidence.push({...view,variant,sourceSHA:hash(source),capture,detail,...value});
      expect(await harness.glContexts(page)).toHaveLength(1);expect((await harness.glContexts(page)).filter(r=>r.connected && r.inWrap && !r.lost)).toHaveLength(1);
      attempt.phase='disposal';await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await handle!.evaluate((c:any)=>(window as any).__faceDraws.get(c).disposeCount)).toBe(1);
      await expect(page.locator('#wrap canvas')).toHaveCount(0);await handle!.dispose();expect(errors).toEqual([]);
      attempt.phase='complete';
    }
    expect(hash(readFileSync(candidatePath))).toBe(finalSHA);expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSHA);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);expect(evidence.filter(e=>e.id===view.id)).toHaveLength(2);
  }finally{writeFileSync(resolve(report,view.id+'-evidence.json'),JSON.stringify({baselineSHA,finalSHA,view,attempts,evidence:evidence.filter(e=>e.id===view.id)},null,2));}
});
