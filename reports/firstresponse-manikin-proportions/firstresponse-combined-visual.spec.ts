import { expect, test, type Page } from 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/@playwright/test/index.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { GlHarness } from 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/tests/e2e/helpers/stem_gl_harness';

const report=process.env.FIRST_RESPONSE_PALM_REPORT!,work=process.env.FIRST_RESPONSE_PALM_WORK!;
const finalSha=process.env.FIRST_RESPONSE_PALM_SOURCE_SHA!,candidatePath=process.env.FIRST_RESPONSE_PALM_CANDIDATE!;
const baselineSha='476c1562ef879cb20ac65efdbf290edff9b98fafde9dbd7866f3e612c5750935';
const hash=(value:Buffer)=>createHash('sha256').update(value).digest('hex');
const baseline=readFileSync(resolve(work,'before.js')),candidate=readFileSync(candidatePath);
const completed=['check','arm','hand','knee','roll','airway','stable','watch'];
const evidence:any[]=[];
const views=[
  {age:'adult',width:1280,height:1080,pose:0,kind:'body'},
  {age:'adult',width:1280,height:1080,pose:5,kind:'near'},
  {age:'adult',width:1280,height:1080,pose:5,kind:'support'},
  {age:'child',width:1280,height:1080,pose:0,kind:'body'},
  {age:'child',width:1280,height:1080,pose:5,kind:'support'},
  {age:'infant',width:320,height:840,pose:0,kind:'body'},
  {age:'infant',width:320,height:840,pose:5,kind:'near'},
] as const;

const harness=new GlHarness({
  toolFile:'stem_lab/stem_tool_firstresponse.js',toolId:'firstResponse',
  preScripts:['stem_lab/stem_lab_module.js'],width:1160,height:1080,layout:'document',appStyles:true,
  probes:`
    window.__palmDraws=new WeakMap();
    var PalmRenderer=THREE.WebGLRenderer;
    THREE.WebGLRenderer=new Proxy(PalmRenderer,{construct:function(target,args,newTarget){
      var renderer=Reflect.construct(target,args,newTarget),render=renderer.render,dispose=renderer.dispose;
      var record={renderer:renderer,disposeCount:0,sequence:0};window.__palmDraws.set(renderer.domElement,record);
      renderer.dispose=function(){record.disposeCount++;return dispose.apply(this,arguments);};
      renderer.render=function(scene,camera){
        var result=render.apply(this,arguments);
        if(scene && scene.isScene && camera && camera.isPerspectiveCamera && scene.getObjectByName('fr-training-manikin')){
          record.scene=scene;record.camera=camera;record.sequence++;record.calls=renderer.info.render.calls;record.triangles=renderer.info.render.triangles;
        }return result;
      };return renderer;
    }});
    window.__palmProbe=function(kind){
      var canvas=document.querySelector('#wrap canvas'),drawn=canvas && window.__palmDraws.get(canvas),rec=canvas && window.__glRecorder.forCanvas(canvas);
      if(!drawn || !drawn.scene || !rec)return null;
      var T=THREE,model=drawn.scene.getObjectByName('fr-training-manikin'),camera=drawn.camera;model.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      function visible(o){var a=o;while(a){if(!a.visible)return false;a=a.parent;}return true;}
      function headDescendant(o){var a=o;while(a){if(a.name==='fr-manikin-head-pivot')return true;a=a.parent;}return false;}
      function rightArmDescendant(o){var a=o;while(a){if(/^fr-patient-right-/.test(a.name))return true;a=a.parent;}return false;}
      function digest(rows){var s=JSON.stringify(rows),h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return {hash:(h>>>0).toString(16),bytes:s.length};}
      function projected(group){
        var total=0,inFrame=0,min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
        if(group)group.traverse(function(o){if(!o.isMesh || !visible(o) || !o.geometry.attributes.position)return;
          var a=o.geometry.attributes.position;for(var i=0;i<a.count;i++){
            var p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld).project(camera);if(!isFinite(p.x+p.y+p.z))throw Error('Non-finite projected '+o.name);
            total++;var values=[p.x,p.y,p.z];for(var j=0;j<3;j++){min[j]=Math.min(min[j],values[j]);max[j]=Math.max(max[j],values[j]);}
            if(Math.abs(p.x)<=1.001 && Math.abs(p.y)<=1.001 && p.z>=-1.001 && p.z<=1.001)inFrame++;
          }
        });return {total:total,inFrame:inFrame,min:total?min:null,max:total?max:null};
      }
      var structure=[],preserved=[],counts={objects:0,meshes:0},creases=[];
      model.traverse(function(o){
        counts.objects++;if(o.isMesh)counts.meshes++;structure.push([o.name,o.parent && o.parent.name,o.visible]);
        if(!headDescendant(o) && !rightArmDescendant(o))preserved.push([o.name,o.parent && o.parent.name,o.matrix.elements,o.visible]);
        if(o.isMesh && /fr-patient-(left|right)-(palm|thumb)-crease$/.test(o.name)){
          var a=o.geometry.attributes.position,box=new T.Box3().setFromObject(o);
          creases.push({name:o.name,visible:visible(o),vertices:a.count,triangles:o.geometry.index?o.geometry.index.count/3:a.count/3,materialType:o.material.type,opacity:o.material.opacity,worldBounds:[box.min.toArray(),box.max.toArray()]});
        }
      });
      var b=canvas.getBoundingClientRect(),selected=kind==='support'?'right':'left',hand=model.getObjectByName('fr-patient-'+selected+'-hand'),head=model.getObjectByName('fr-manikin-head-pivot');
      var headBox=new T.Box3().setFromObject(head),bodyBox=new T.Box3().setFromObject(model),support=model.getObjectByName('fr-patient-right-hand');
      var context=support && support.userData.inspection && support.userData.inspection.context;
      return {
        camera:{position:camera.getWorldPosition(new T.Vector3()).toArray(),quaternion:camera.quaternion.toArray(),projection:camera.projectionMatrix.elements.slice(),aspect:camera.aspect},
        pose:{structure:digest(structure),preservedTransforms:digest(preserved),counts:counts},
        draw:{id:rec.id,createdBy:rec.createdBy,draws:rec.draws,sequence:drawn.sequence,calls:drawn.calls,triangles:drawn.triangles,geometries:drawn.renderer.info.memory.geometries,programs:drawn.renderer.info.programs.length,disposeCount:drawn.disposeCount},
        canvasSize:[b.width,b.height],selectedCreases:creases.filter(function(c){return c.name.indexOf('fr-patient-'+selected+'-')===0;}),allCreases:creases,
        selectedHand:projected(hand),head:projected(head),wholeBody:kind==='body'?projected(model):null,
        headBounds:[headBox.min.toArray(),headBox.max.toArray()],bodyBounds:[bodyBox.min.toArray(),bodyBox.max.toArray()],
        cheekContext:context?context.map(function(p){return new T.Vector3().fromArray(p).project(camera).toArray();}):null,
        state:window.__ctx.toolData.firstResponse,errors:window.__events.errors.slice()
      };
    };
  `,
});

test.describe.configure({retries:0,timeout:240000});
test.beforeAll(async()=>{
  expect(report).toBeTruthy();expect(work).toBeTruthy();expect(candidatePath).toBeTruthy();
  expect(hash(baseline)).toBe(baselineSha);expect(hash(candidate)).toBe(finalSha);expect(finalSha).not.toBe(baselineSha);
  expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSha);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);
  mkdirSync(report,{recursive:true});await harness.start();
});
test.afterAll(async()=>{writeFileSync(resolve(report,'palm-surface-metrics.json'),JSON.stringify({baselineSha,finalSha,evidence},null,2));await harness.stop();});
test.afterEach(async({page})=>{await harness.destroy(page);});

async function settle(page:Page){
  await page.locator('.fr-body3d-stage').evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant' as ScrollBehavior}));
  const previous=await page.evaluate(()=>{const r=window as any,c=document.querySelector('#wrap canvas');return r.__palmDraws.get(c)?.sequence||0;});
  await page.waitForFunction(sequence=>{const r=window as any,c=document.querySelector('#wrap canvas'),d=r.__palmDraws.get(c);return d && d.sequence>=sequence+2;},previous,{timeout:10000});
}
async function probe(page:Page,kind:string,pose:number){
  const encoded=await page.evaluate(kind=>JSON.stringify((window as any).__palmProbe(kind),(key,value)=>{if(typeof value==='number' && !Number.isFinite(value))throw new Error('Non-finite evidence: '+key);return value;}),kind);
  expect(encoded).not.toBe('null');const value=JSON.parse(encoded);
  expect(value.draw.createdBy).toBe('page');expect(value.draw.draws).toBeGreaterThan(0);expect(value.draw.calls).toBeGreaterThan(0);expect(value.draw.triangles).toBeGreaterThan(0);expect(value.draw.sequence).toBeGreaterThanOrEqual(2);
  expect(value.draw.disposeCount).toBe(0);expect(value.errors).toEqual([]);expect(value.state.b3dStatus).toBe('ready');expect(value.state.b3dRecView).toBe(pose);expect(value.camera.aspect).toBeCloseTo(value.canvasSize[0]/value.canvasSize[1],5);
  expect(value.allCreases).toHaveLength(4);expect(value.selectedCreases).toHaveLength(2);
  if(kind!=='body'){
    expect(value.selectedHand.total).toBeGreaterThan(0);expect(value.selectedHand.inFrame,'complete selected hand').toBe(value.selectedHand.total);
    for(const crease of value.selectedCreases){expect(crease.visible).toBe(true);expect(crease.opacity).toBeGreaterThan(0);expect(crease.triangles).toBeGreaterThan(0);}
  }
  if(kind==='support'){
    expect(value.head.inFrame,'visible cheek and head context').toBeGreaterThan(0);expect(value.cheekContext).toHaveLength(5);
    for(const p of value.cheekContext){expect(Math.abs(p[0])).toBeLessThanOrEqual(1.001);expect(Math.abs(p[1])).toBeLessThanOrEqual(1.001);expect(p[2]).toBeGreaterThanOrEqual(-1.001);expect(p[2]).toBeLessThanOrEqual(1.001);}
  }
  if(kind==='body'){
    expect(value.head.inFrame,'complete head in body view').toBe(value.head.total);expect(value.wholeBody.total).toBeGreaterThan(0);expect(value.wholeBody.inFrame/value.wholeBody.total,'full figure within body view').toBeGreaterThan(.99);
  }return value;
}

for(const age of ['adult','child','infant'] as const) test(age+' head proportions and palm surfaces in matching native views',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push('page: '+error.message));page.on('console',message=>{if(message.type()==='error')errors.push('console: '+message.text());});await page.emulateMedia({reducedMotion:'reduce'});
  const references:Record<string,any>={};
  {
    const ageViews=views.filter(view=>view.age===age),first=ageViews[0];
    await page.setViewportSize({width:first.width,height:first.height});
    for(const variant of ['baseline','candidate'] as const){
      await page.unroute('**/stem_lab/stem_tool_firstresponse.js');const source=variant==='baseline'?baseline:candidate;
      await page.route('**/stem_lab/stem_tool_firstresponse.js',route=>route.fulfill({body:source,contentType:'text/javascript; charset=utf-8'}));
      await harness.mount(page,{firstResponse:{consentAccepted:true,view:'body3d',b3dTab:'recovery',b3dAge:age,b3dRec:completed,b3dRecView:0,b3dRecoveryGuides:false,b3dChildHands:'two',b3dPlaced:'correct',b3dHandStudy:{},faMastery:{},modulesVisited:{},badges:{}}},'window.__ctx.toolData.firstResponse.b3dStatus === "ready"');
      await page.addStyleTag({content:'#wrap{width:100%!important;max-width:1160px;margin:0 auto}body{margin:0}'});await settle(page);
      const canvas=page.locator('#wrap canvas');await expect(canvas).toHaveCount(1);const handle=await canvas.elementHandle();expect(handle).toBeTruthy();
      for(const view of ageViews){
        if(view.pose===5){await page.getByLabel('Pose to inspect',{exact:true}).selectOption('5');await settle(page);}
        const name=view.kind==='body'?'Whole manikin':view.kind==='near'?'Palm detail view':'Supporting hand close-up';await page.getByRole('button',{name,exact:true}).click();await settle(page);
        const value=await probe(page,view.kind,view.pose),key=view.age+'-'+view.kind;
        if(variant==='baseline')references[key]=value;else{
          const reference=references[key];
          if(view.kind==='near')expect(value.camera,key+': same near hand camera').toEqual(reference.camera);
          expect(value.pose.structure,key+': unchanged hierarchy').toEqual(reference.pose.structure);expect(value.pose.preservedTransforms,key+': unchanged torso and other limbs').toEqual(reference.pose.preservedTransforms);
          expect(value.pose.counts).toEqual(reference.pose.counts);expect(value.canvasSize).toEqual(reference.canvasSize);expect(value.state).toEqual(reference.state);expect(value.draw.geometries).toBe(reference.draw.geometries);expect(value.allCreases.map((c:any)=>c.name)).toEqual(reference.allCreases.map((c:any)=>c.name));
        }
        const capture=key+'-'+variant+'.png';await page.locator('.fr-body3d-stage').screenshot({path:resolve(report,capture),timeout:30000});evidence.push({...view,variant,sourceSha:hash(source),capture,...value});
        expect(await harness.glContexts(page)).toHaveLength(1);expect((await harness.glContexts(page)).filter(r=>r.connected && r.inWrap && !r.lost)).toHaveLength(1);
      }
      await harness.unmount(page);expect(await harness.leakedAfterUnmount(page)).toEqual([]);expect(await handle!.evaluate((c:any)=>(window as any).__palmDraws.get(c).disposeCount)).toBe(1);await expect(page.locator('#wrap canvas')).toHaveCount(0);await handle!.dispose();expect(errors).toEqual([]);
    }
  }
  expect(hash(readFileSync(candidatePath))).toBe(finalSha);expect(hash(readFileSync('stem_lab/stem_tool_firstresponse.js'))).toBe(baselineSha);expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js')).toEqual(baseline);expect(evidence.filter(e=>e.age===age)).toHaveLength(age==='adult'?6:4);
});
