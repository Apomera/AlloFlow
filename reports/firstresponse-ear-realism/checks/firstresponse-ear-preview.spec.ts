import {expect,test,type Page} from 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/@playwright/test/index.js';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {GlHarness} from 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/helpers/stem_gl_harness';

const work=process.env.FIRST_RESPONSE_EAR_WORK!,report=process.env.FIRST_RESPONSE_EAR_REPORT!;
const finalSHA=process.env.FIRST_RESPONSE_EAR_SOURCE_SHA!,candidatePath=process.env.FIRST_RESPONSE_EAR_CANDIDATE!;
const baselineSHA='16aceaa1b7d8bbd0ed869536b554451ddd2e5e3a832229e2e3322f8ad75f03e2';
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const baseline=readFileSync(resolve(work,'before.js')),candidate=readFileSync(candidatePath),evidence:any[]=[];
const completed=['check','arm','hand','knee','roll','airway','stable','watch'];
const views=[{age:'adult',width:1280,height:1080,pose:5,contrast:false},{age:'child',width:1280,height:1080,pose:8,contrast:false},{age:'infant',width:320,height:840,pose:5,contrast:true}] as const;

const harness=new GlHarness({toolFile:'stem_lab/stem_tool_firstresponse.js',toolId:'firstResponse',preScripts:['stem_lab/stem_lab_module.js'],
  width:1160,height:1080,layout:'document',appStyles:true,probes:`
    // React's initial root.render is asynchronous; set the context before that render runs.
    var EarMount=window.__mount;
    window.__mount=function(data){var contrast=!!data.__earContrast,clean=Object.assign({},data);delete clean.__earContrast;
      var result=EarMount(clean);window.__ctx.isContrast=contrast;return result;};
    window.__earDraws=new WeakMap();var EarRenderer=THREE.WebGLRenderer;
    THREE.WebGLRenderer=new Proxy(EarRenderer,{construct:function(target,args,newTarget){
      var renderer=Reflect.construct(target,args,newTarget),render=renderer.render,dispose=renderer.dispose;
      var record={renderer:renderer,disposeCount:0,sequence:0};window.__earDraws.set(renderer.domElement,record);
      renderer.dispose=function(){record.disposeCount++;return dispose.apply(this,arguments);};
      renderer.render=function(scene,camera){var result=render.apply(this,arguments);
        if(scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')){
          record.scene=scene;record.camera=camera;record.sequence++;record.calls=renderer.info.render.calls;record.triangles=renderer.info.render.triangles;
        }return result;};return renderer;
    }});
    window.__earProbe=function(){
      var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__earDraws.get(canvas),rec=canvas && window.__glRecorder.forCanvas(canvas);
      if(!drawn || !drawn.scene || !rec)return null;
      var T=THREE,model=drawn.scene.getObjectByName('fr-training-manikin'),camera=drawn.camera;model.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      function visible(o){var a=o;while(a){if(!a.visible)return false;a=a.parent;}return true;}
      function earDescendant(o){var a=o;while(a){if(/^fr-manikin-ear-(left|right)$/.test(a.name))return true;a=a.parent;}return false;}
      function digest(rows){var s=JSON.stringify(rows),h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return {hash:(h>>>0).toString(16),bytes:s.length};}
      function projected(group){var total=0,inFrame=0,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
        group.traverse(function(o){if(!o.isMesh || !visible(o) || !o.geometry.attributes.position)return;
          var a=o.geometry.attributes.position;for(var i=0;i<a.count;i++){
            var p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);if(!isFinite(p.x+p.y+p.z))throw Error('Non-finite projected '+o.name);
            total++;var values=[p.x,p.y,p.z];for(var j=0;j<3;j++){min[j]=Math.min(min[j],values[j]);max[j]=Math.max(max[j],values[j]);}
            if(Math.abs(p.x)<=1.001 && Math.abs(p.y)<=1.001 && p.z>=-1.001 && p.z<=1.001)inFrame++;
          }
        });return {total:total,inFrame:inFrame,min:total?min:null,max:total?max:null};}
      var structure=[],preserved=[],counts={objects:0,meshes:0},earMeshes=[];
      model.traverse(function(o){counts.objects++;if(o.isMesh)counts.meshes++;structure.push([o.name,o.parent && o.parent.name,o.visible]);
        if(!earDescendant(o))preserved.push([o.name,o.parent && o.parent.name,o.matrix.elements,o.visible]);
        if(o.isMesh && earDescendant(o))earMeshes.push({name:o.name,vertices:o.geometry.attributes.position.count,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3,materialType:o.material.type,colorHex:o.material.color.getHex(),visible:visible(o)});
      });
      var hand=model.getObjectByName('fr-patient-right-hand'),head=model.getObjectByName('fr-manikin-head-pivot'),context=hand.userData.inspection.context,b=canvas.getBoundingClientRect();
      var ears=['left','right'].map(function(side){var o=model.getObjectByName('fr-manikin-ear-'+side),r=projected(o),position=o.getWorldPosition(new T.Vector3());
        var outward=new T.Vector3(side==='left'?-1:1,0,0).applyQuaternion(o.getWorldQuaternion(new T.Quaternion()));
        var facing=outward.dot(camera.getWorldPosition(new T.Vector3()).sub(position).normalize());
        return {side:side,projection:r,facing:facing,worldBounds:new T.Box3().setFromObject(o),position:position.toArray()};});
      return {camera:{position:camera.getWorldPosition(new T.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},
        pose:{structure:digest(structure),preservedTransforms:digest(preserved),counts:counts},earMeshes:earMeshes,ears:ears,selectedHand:projected(hand),head:projected(head),
        canvasRect:{x:b.x,y:b.y,width:b.width,height:b.height},cheekContext:context.map(function(p){return new T.Vector3().fromArray(p).project(camera).toArray();}),
        contrast:window.__ctx.isContrast,state:window.__ctx.toolData.firstResponse,errors:window.__events.errors.slice(),
        draw:{id:rec.id,createdBy:rec.createdBy,draws:rec.draws,sequence:drawn.sequence,calls:drawn.calls,triangles:drawn.triangles,geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length,disposeCount:drawn.disposeCount}};
    };
  `});

// The accepted seven-view, three-age pass took 506 seconds on this host.
// Bound each age pair to three minutes instead of one long combined workflow.
test.describe.configure({retries:0,timeout:180000});
test.beforeAll(async()=>{
  expect(hash(baseline)).toBe(baselineSHA);expect(hash(candidate)).toBe(finalSHA);expect(finalSHA).not.toBe(baselineSHA);
  expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSHA);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);
  mkdirSync(report,{recursive:true});await harness.start();
});
test.afterAll(async()=>{
  const retained=views.flatMap(view=>{try{return JSON.parse(readFileSync(resolve(report,view.age+'-evidence.json'),'utf8')).evidence;}catch{return [];}});
  writeFileSync(resolve(report,'ear-preview-metrics.json'),JSON.stringify({baselineSHA,finalSHA,evidence:retained},null,2));await harness.stop();
});
test.afterEach(async({page})=>{await harness.destroy(page);});
async function settle(page:Page){
  await page.locator('.fr-body3d-stage').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant' as ScrollBehavior}));
  const sequence=await page.evaluate(()=>{const w=window as any,c=document.querySelector('#wrap canvas');return w.__earDraws.get(c)?.sequence||0;});
  await page.waitForFunction(n=>{const w=window as any,c=document.querySelector('#wrap canvas'),r=w.__earDraws.get(c);return r && r.sequence>=n+2;},sequence,{timeout:10000});
}
async function probe(page:Page){const encoded=await page.evaluate(()=>JSON.stringify((window as any).__earProbe(),(key,value)=>{
  if(typeof value==='number' && !Number.isFinite(value))throw Error('Non-finite evidence '+key);return value;}));expect(encoded).not.toBe('null');return JSON.parse(encoded);}
async function captureEar(page:Page,value:any,prefix:string){
  const candidates=value.ears.filter((e:any)=>e.facing>0 && e.projection.inFrame>0 && e.projection.min).map((e:any)=>{
    const p=e.projection,b=value.canvasRect;
    const x=b.x+(Math.max(-1,p.min[0])+1)*b.width/2,y=b.y+(1-Math.min(1,p.max[1]))*b.height/2;
    const right=b.x+(Math.min(1,p.max[0])+1)*b.width/2,bottom=b.y+(1-Math.max(-1,p.min[1]))*b.height/2;
    return {side:e.side,x,y,width:right-x,height:bottom-y};
  }).filter((e:any)=>e.width>=4 && e.height>=4).sort((a:any,b:any)=>b.width*b.height-a.width*a.height);
  if(!candidates.length)return null;
  const c=candidates[0],viewport=page.viewportSize()!,margin=12,x=Math.max(0,Math.floor(c.x-margin)),y=Math.max(0,Math.floor(c.y-margin));
  const width=Math.min(viewport.width-x,Math.ceil(c.x+c.width+margin)-x),height=Math.min(viewport.height-y,Math.ceil(c.y+c.height+margin)-y);
  if(width<=0 || height<=0)return null;
  const file=prefix+'-ear.png';await page.screenshot({path:resolve(report,file),clip:{x,y,width,height},timeout:30000});
  return {file,side:c.side,clip:{x,y,width,height}};
}

for(const view of views)test('sculpted ear '+view.age+' preview at matching native supporting-hand view',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push('page: '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
  await page.emulateMedia({reducedMotion:'reduce'});
  const attempts:any[]=[];
  try{await page.setViewportSize({width:view.width,height:view.height});let reference:any;
    for(const variant of ['baseline','candidate'] as const){
      const attempt:any={variant,startedAt:new Date().toISOString(),phase:'mount'};attempts.push(attempt);
      await page.unroute('**/stem_lab/stem_tool_firstresponse.js');const source=variant==='baseline'?baseline:candidate;
      await page.route('**/stem_lab/stem_tool_firstresponse.js',route=>route.fulfill({body:source,contentType:'text/javascript; charset=utf-8'}));
      await harness.mount(page,{__earContrast:view.contrast,firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'recovery',b3dAge:view.age,b3dRec:completed,b3dRecView:view.pose,b3dRecoveryGuides:false,b3dChildHands:'two',b3dPlaced:'correct',b3dHandStudy:{},faMastery:{},modulesVisited:{},badges:{}}},'window.__ctx.toolData.firstResponse.b3dStatus === "ready"');
      await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});await settle(page);
      const canvas=page.locator('#wrap canvas');await expect(canvas).toHaveCount(1);const handle=await canvas.elementHandle();expect(handle).toBeTruthy();
      await page.getByRole('button',{name:'Supporting hand close-up',exact:true}).click();await settle(page);const value=await probe(page);attempt.probe=value;
      expect(value.contrast).toBe(view.contrast);expect(value.state.b3dStatus).toBe('ready');expect(value.state.b3dRecView).toBe(view.pose);expect(value.errors).toEqual([]);
      expect(value.draw.createdBy).toBe('page');expect(value.draw.calls).toBeGreaterThan(0);expect(value.draw.triangles).toBeGreaterThan(0);expect(value.draw.draws).toBeGreaterThan(0);expect(value.draw.disposeCount).toBe(0);
      expect(value.camera.aspect).toBeCloseTo(value.canvasRect.width/value.canvasRect.height,5);expect(value.selectedHand.total).toBeGreaterThan(0);expect(value.selectedHand.inFrame,'complete supporting hand').toBe(value.selectedHand.total);expect(value.head.inFrame).toBeGreaterThan(0);
      expect(value.cheekContext).toHaveLength(5);for(const p of value.cheekContext){expect(Math.abs(p[0])).toBeLessThanOrEqual(1.001);expect(Math.abs(p[1])).toBeLessThanOrEqual(1.001);expect(p[2]).toBeGreaterThanOrEqual(-1.001);expect(p[2]).toBeLessThanOrEqual(1.001);}
      expect(value.earMeshes).toHaveLength(10);expect(value.ears.some((e:any)=>e.projection.inFrame>0)).toBe(true);
      if(view.contrast)for(const earMesh of value.earMeshes){
        expect(earMesh.materialType,'actual contrast ear material').toBe('MeshBasicMaterial');
        // The existing concha material supplies 0x777777 as its contrast override.
        expect(earMesh.colorHex,'actual contrast ear color').toBe(earMesh.name.endsWith('-concha')?0x777777:0xffffff);
      }
      if(variant==='baseline')reference=value;else{
        expect(value.camera).toEqual(reference.camera);expect(value.pose).toEqual(reference.pose);expect(value.state).toEqual(reference.state);
        expect(value.earMeshes).toEqual(reference.earMeshes);expect(value.draw.geometries).toBe(reference.draw.geometries);expect(value.draw.programs).toBe(reference.draw.programs);
        expect(value.draw.calls).toBe(reference.draw.calls);expect(value.draw.triangles).toBe(reference.draw.triangles);
      }
      attempt.phase='capture';const prefix=view.age+'-pose'+view.pose+(view.contrast?'-contrast':'')+'-'+variant,capture=prefix+'-stage.png';
      await page.locator('.fr-body3d-stage').screenshot({path:resolve(report,capture),timeout:30000});const detail=await captureEar(page,value,prefix);
      // Re-select the same camera to check that an inspection adds no geometry or programs.
      await page.getByRole('button',{name:'Supporting hand close-up',exact:true}).click();await settle(page);const repeat=await probe(page);
      expect(repeat.draw.geometries).toBe(value.draw.geometries);expect(repeat.draw.programs).toBe(value.draw.programs);expect(repeat.camera).toEqual(value.camera);
      evidence.push({...view,variant,sourceSHA:hash(source),capture,detail,...value});
      expect(await harness.glContexts(page)).toHaveLength(1);expect((await harness.glContexts(page)).filter(r=>r.connected && r.inWrap && !r.lost)).toHaveLength(1);
      attempt.phase='disposal';await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await handle!.evaluate((c:any)=>(window as any).__earDraws.get(c).disposeCount)).toBe(1);
      await expect(page.locator('#wrap canvas')).toHaveCount(0);await handle!.dispose();expect(errors).toEqual([]);
      attempt.phase='complete';
    }
    expect(hash(readFileSync(candidatePath))).toBe(finalSHA);expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSHA);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);expect(evidence.filter(e=>e.age===view.age)).toHaveLength(2);
  }finally{writeFileSync(resolve(report,view.age+'-evidence.json'),JSON.stringify({baselineSHA,finalSHA,view,attempts,evidence:evidence.filter(e=>e.age===view.age)},null,2));}
});
