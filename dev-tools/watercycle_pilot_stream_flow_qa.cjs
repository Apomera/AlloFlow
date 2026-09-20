'use strict';
// Live React/browser acceptance check for stream and runoff detail.
// Run: node dev-tools/watercycle_pilot_stream_flow_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-stream-flow-review');
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');
(async () => {
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('console',m=>{if(m.type()==='error' && /THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
    await page.setContent('<!doctype html><html lang="en"><head><title>Water pilot navigation QA</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({content:read('dev-tools/.cache/sweep-tailwind.css')});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','vendor/three-r128/three.min.js','vendor/three-r128/OrbitControls.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_watercycle.js']) await page.addScriptTag({content:read(file)});
    await page.evaluate(()=>{
      const OriginalRenderer=THREE.WebGLRenderer;
      THREE.WebGLRenderer=function(...args){const renderer=new OriginalRenderer(...args);const render=renderer.render.bind(renderer);renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};return render(scene,camera);};return renderer;};
      const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
      window.mountWater=function(seed,dark=false){
        function Host(){
          const [data,setData]=React.useState({waterCycle:seed,_threeLoaded:true});
          window.waterReviewData=data.waterCycle;
          window.waterReviewSet=setData;
          const noop=()=>{};
          return window.StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:dark,isContrast:false,gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,
            setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:noop,getXP:()=>0,
            beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});
        }
        document.documentElement.classList.toggle('dark',dark);
        document.body.style.background=dark?'#0f172a':'#f1f5f9';
        ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
        ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
      };
      window.mountWater({wcMode:'pilot',pilot:{onboardingComplete:true,paused:true}});
    });
    await page.addScriptTag({content:read('desktop/web-app/node_modules/axe-core/axe.min.js')});






    const canvas=page.locator('#wcPilotCanvas');
    await page.waitForFunction(()=>window.pilotReview?.scene.getObjectByName('pilot-stream-water')?.userData.surfaceShader);
    async function restore(form='runoff',progress=.45,scenario='temperateCoast'){
      await page.evaluate(({form,progress,scenario})=>{
        const checkpoint={...WaterCyclePilotKernel.initialState(scenario),form,pathwayProgress:progress,energy:0,
          x:218,z:-40,yaw:-1.05,pitch:.4,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,scenario,navigationAssist:false,cameraMode:'follow',pauseAtChanges:true,
          resumeCheckpoint:checkpoint,resumeToken:scenario+'-'+form+'-'+progress+'-'+Date.now()}}}));
      },{form,progress,scenario});
      await page.waitForFunction(({form,progress,scenario})=>document.querySelector('#wcPilotCanvas').dataset.parcelForm===form && waterReviewData.pilot.snapshot.scenario===scenario && Math.abs(waterReviewData.pilot.snapshot.pathwayProgress-progress)<.001,{form,progress,scenario});
      await page.waitForTimeout(650);
    }
    const flow=()=>page.evaluate(()=>Array.from(pilotReview.scene.getObjectByName('pilot-stream-flow-streaks').geometry.attributes.position.array));
    const flowAlpha=()=>page.evaluate(()=>Array.from(pilotReview.scene.getObjectByName('pilot-stream-flow-streaks').geometry.attributes.streamAlpha.array));
    const ripple=()=>page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-stream-water').userData.surfaceShader.uniforms.pilotStreamTime.value);
    await restore();
    const geometry=await page.evaluate(()=>{
      const scene=pilotReview.scene;return {stones:scene.getObjectByName('pilot-stream-bank-stones').count,
        finite:Array.from(scene.getObjectByName('pilot-stream-bank-stones').instanceMatrix.array).every(Number.isFinite),
        vertices:scene.getObjectByName('pilot-stream-flow-streaks').geometry.attributes.position.count,
        lines:scene.getObjectByName('pilot-stream-flow-streaks').isLineSegments};
    });assert.deepEqual(geometry,{stones:56,finite:true,vertices:56,lines:true});
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-stream-riffles').userData.surfaceShader);
    const landscape=await page.evaluate(()=>{
      const scene=pilotReview.scene,water=scene.getObjectByName('pilot-stream-water'),banks=scene.getObjectByName('pilot-stream-wet-banks'),riffles=scene.getObjectByName('pilot-stream-riffles');
      return {gravel:scene.getObjectByName('pilot-stream-bank-gravel').count,gravelFinite:Array.from(scene.getObjectByName('pilot-stream-bank-gravel').instanceMatrix.array).every(Number.isFinite),bankColors:banks.geometry.attributes.color.count,bankVertices:banks.geometry.attributes.position.count,
        waterCross:water.geometry.attributes.streamCrossChannel.count,waterVertices:water.geometry.attributes.position.count,
        riffleVertices:riffles.geometry.attributes.position.count,
        finite:[water,banks,riffles].every(m=>Array.from(m.geometry.attributes.position.array).every(Number.isFinite)),
        sharedTime:water.userData.surfaceShader.uniforms.pilotStreamTime===riffles.userData.surfaceShader.uniforms.pilotStreamTime};
    });assert(landscape.finite&&landscape.sharedTime&&landscape.gravelFinite);assert.equal(landscape.gravel,144);assert.equal(landscape.bankColors,landscape.bankVertices);assert.equal(landscape.waterCross,landscape.waterVertices);assert(landscape.riffleVertices>26);
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-stream-cascades').userData.surfaceShader);
    const cascade=await page.evaluate(()=>{
      const water=pilotReview.scene.getObjectByName('pilot-stream-water'),foam=pilotReview.scene.getObjectByName('pilot-stream-cascades');
      const strength=Array.from(foam.geometry.attributes.cascadeStrength.array);
      return {sharedTime:water.userData.surfaceShader.uniforms.pilotStreamTime===foam.userData.surfaceShader.uniforms.pilotStreamTime,
        aligned:Array.from(foam.geometry.attributes.position.array).every((v,i)=>v===water.geometry.attributes.position.array[i]),
        strengthFinite:strength.every(v=>Number.isFinite(v)&&v>=0&&v<=1),
        quiet:strength.some(v=>v===0),whitewater:strength.some(v=>v>.4),offset:foam.position.y};
    });assert.deepEqual(cascade,{sharedTime:true,aligned:true,strengthFinite:true,quiet:true,whitewater:true,offset:.055});
    const banks=await page.evaluate(()=>{
      const scene=pilotReview.scene,group=scene.getObjectByName('pilot-watershed-stream');
      const bank=scene.getObjectByName('pilot-stream-terrain-banks'),pos=bank.geometry.attributes.position;
      const surfaces=[];scene.traverse(o=>{if(o.material?.pilotStreamChannelTexture===group.userData.terrainMask)surfaces.push(o);});
      const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
      let edgeError=0,matched=0;
      for(let i=8;i<pos.count;i+=9){ray.ray.origin.set(pos.getX(i),500,pos.getZ(i));
        const hits=ray.intersectObjects(surfaces,false),top=hits.length?hits[0].point.y:-.3;
        edgeError=Math.max(edgeError,Math.abs(pos.getY(i)-(top-.035)));if(hits.length)matched++;
      }
      const coverage=texture=>{const p=texture.image.getContext('2d').getImageData(0,0,512,512).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i]>127)n++;return n;};
      window.terrainBankSummerColors=Array.from(bank.geometry.attributes.color.array);
      return {vertices:pos.count,finite:Array.from(pos.array).every(Number.isFinite),normals:Array.from(bank.geometry.attributes.normal.array).every(Number.isFinite),
        surfaces:surfaces.length,matched,edgeError,separateMasks:group.userData.terrainMask!==group.userData.channelMask,
        wider:coverage(group.userData.terrainMask)>coverage(group.userData.channelMask)*1.2};
    });assert.equal(banks.vertices,3474);assert(banks.finite&&banks.normals&&banks.separateMasks&&banks.wider);assert.equal(banks.surfaces,4);assert(banks.matched>250);assert(banks.edgeError<.001,JSON.stringify(banks));

    const contact=await page.evaluate(()=>{
      const scene=pilotReview.scene,flow=scene.getObjectByName('pilot-stream-flow-streaks'),water=scene.getObjectByName('pilot-stream-water');scene.updateMatrixWorld(true);
      const a=flow.geometry.attributes.position,alpha=flow.geometry.attributes.streamAlpha,path=water.geometry.parameters.path;
      const ray=new THREE.Raycaster(),p=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0),tail=new THREE.Vector3(),head=new THREE.Vector3();
      let max=0,missing=0,visible=0,directional=0,lakeHidden=0;
      for(let i=0;i<a.count;i++){
        p.fromBufferAttribute(a,i).applyMatrix4(flow.matrixWorld);
        if(Math.hypot(p.x-268,p.z+104)<34){if(alpha.getX(i)!==0)throw Error('Flow draws inside lake');lakeHidden++;}
        if(alpha.getX(i)<.001)continue;visible++;ray.set(new THREE.Vector3(p.x,500,p.z),down);const hit=ray.intersectObject(water)[0];
        if(!hit)missing++;else max=Math.max(max,Math.abs(p.y-hit.point.y-.06));
      }
      for(let i=0;i<a.count;i+=2){if(alpha.getX(i+1)<.7)continue;tail.fromBufferAttribute(a,i);head.fromBufferAttribute(a,i+1);const tangent=path.getTangentAt(i/2/28);
        if(head.sub(tail).dot(tangent)>0&&alpha.getX(i+1)>alpha.getX(i)*5)directional++;
      }
      return {max,missing,visible,directional,lakeHidden,partial:Array.from(alpha.array).some(v=>v>.13&&v<.7)};
    });assert(contact.max<.002&&contact.missing===0&&contact.visible>30&&contact.directional>12&&contact.lakeHidden>2&&contact.partial,JSON.stringify(contact));
    const positions=await flow(),time=await ripple();await page.waitForTimeout(800);assert.deepEqual(await flow(),positions);assert.equal(await ripple(),time);
    assert(positions.every(Number.isFinite));
    await canvas.hover();await page.mouse.wheel(0,-200);await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'runoff-follow.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'runoff-water-view.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-stream-water').userData.surfaceShader.uniforms.pilotStreamTime.value>.05);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();assert.notDeepEqual(await flow(),positions);
    const beforeReduce=await flow(),beforeReduceAlpha=await flowAlpha();
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);
    assert.deepEqual(await flow(),beforeReduce,'Reduced motion retains the current river streak positions');
    assert.deepEqual(await flowAlpha(),beforeReduceAlpha,'Reduced motion retains the current tip and join fades');
    const still=await flow(),stillRipple=await ripple();await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    const elapsed=await canvas.getAttribute('data-parcel-elapsed');await page.waitForFunction(v=>document.querySelector('#wcPilotCanvas').dataset.parcelElapsed!==v,elapsed);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();assert.deepEqual(await flow(),still);assert.equal(await ripple(),stillRipple);
    await restore('runoff',.999);await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-runoff-pathway').visible),false);
    const keepFlying=page.getByRole('button',{name:'Keep flying',exact:true});
    if(await keepFlying.count())await keepFlying.click();
    // A fixed inspection camera isolates the stream asset; the images above use the actual learner cameras.
    await page.evaluate(()=>{
      const renderer=pilotReview.renderer,render=renderer.render.bind(renderer);
      renderer.render=(scene,camera)=>{camera.position.set(244,22,-64);camera.lookAt(230,7,-76);return render(scene,camera);};
    });
    await restore('runoff',.45);await canvas.screenshot({path:path.join(out,'stream-detail.jpg'),type:'jpeg',quality:82});
    await restore('runoff',.45,'mountainWinter');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-stream-riffles').visible),false,'Winter ice suppresses open-water riffles');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-stream-ice').visible),true);
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-stream-cascades').visible),false);
    assert.equal(await page.evaluate(()=>Array.from(pilotReview.scene.getObjectByName('pilot-stream-terrain-banks').geometry.attributes.color.array).some((v,i)=>Math.abs(v-terrainBankSummerColors[i])>.01)),true);
    await canvas.screenshot({path:path.join(out,'stream-winter.jpg'),type:'jpeg',quality:82});
    await restore('runoff',.45,'desertBasin');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-watershed-stream').visible),false);
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-stream-flow-streaks').visible),false);
    await canvas.screenshot({path:path.join(out,'stream-desert.jpg'),type:'jpeg',quality:82});
    await restore('groundwater',.45);
    const cutaway=await page.evaluate(()=>{
      const material=pilotReview.scene.getObjectByName('pilot-stream-terrain-banks').material;
      const shader={uniforms:{},vertexShader:'#include <begin_vertex>\n#include <worldpos_vertex>',fragmentShader:'#include <clipping_planes_fragment>'};
      material.onBeforeCompile(shader,pilotReview.renderer);
      return {active:shader.uniforms.pilotCutawayWindow.value.w,terrainClipped:!!shader.uniforms.pilotStreamChannel};
    });assert.equal(cutaway.active,1);assert.equal(cutaway.terrainClipped,false);
    await restore('runoff',.45);
    await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await page.evaluate(()=>{
      window.streamDisposals={flowGeometry:0,flowMaterial:0,geometry:0,texture:0,channel:0,riffleGeometry:0,riffleMaterial:0,cascadeGeometry:0,cascadeMaterial:0,terrainGeometry:0,terrainMaterial:0,terrainMask:0};const stones=pilotReview.scene.getObjectByName('pilot-stream-bank-stones');
      const flow=pilotReview.scene.getObjectByName('pilot-stream-flow-streaks');
      flow.geometry.addEventListener('dispose',()=>streamDisposals.flowGeometry++);flow.material.addEventListener('dispose',()=>streamDisposals.flowMaterial++);
      stones.geometry.addEventListener('dispose',()=>streamDisposals.geometry++);
      stones.material.map.addEventListener('dispose',()=>streamDisposals.texture++);
      pilotReview.scene.getObjectByName('pilot-watershed-stream').userData.channelMask.addEventListener('dispose',()=>streamDisposals.channel++);
      pilotReview.scene.getObjectByName('pilot-stream-riffles').geometry.addEventListener('dispose',()=>streamDisposals.riffleGeometry++);
      pilotReview.scene.getObjectByName('pilot-stream-riffles').material.addEventListener('dispose',()=>streamDisposals.riffleMaterial++);
      pilotReview.scene.getObjectByName('pilot-stream-cascades').geometry.addEventListener('dispose',()=>streamDisposals.cascadeGeometry++);
      pilotReview.scene.getObjectByName('pilot-stream-cascades').material.addEventListener('dispose',()=>streamDisposals.cascadeMaterial++);
      const terrain=pilotReview.scene.getObjectByName('pilot-stream-terrain-banks');
      terrain.geometry.addEventListener('dispose',()=>streamDisposals.terrainGeometry++);
      terrain.material.addEventListener('dispose',()=>streamDisposals.terrainMaterial++);
      pilotReview.scene.getObjectByName('pilot-watershed-stream').userData.terrainMask.addEventListener('dispose',()=>streamDisposals.terrainMask++);
      mountWater({wcMode:'explorer'});
    });assert.deepEqual(await page.evaluate(()=>streamDisposals),{flowGeometry:1,flowMaterial:1,geometry:1,texture:1,channel:1,riffleGeometry:1,riffleMaterial:1,cascadeGeometry:1,cascadeMaterial:1,terrainGeometry:1,terrainMaterial:1,terrainMask:1});assert.deepEqual(errors,[]);
    console.log('PASS: ray-verified river streak heights, bright downstream tips, join fades, no reset on reduced motion, flow resource cleanup, terrain-bank edges match sampled land, finite geometry and normals, distinct wider terrain mask, seasonal bank colors, groundwater cutaway, terrain resource cleanup, cascade mesh aligned with water, quiet and whitewater reaches, bounded opacity strength, shared clock, cascade resource cleanup, bank-color and cross-channel attributes, finite riffles, shared water/riffle clock, winter suppression, finite stream detail, paused and reduced-motion ripples/flow, both learner views, real runoff-to-water transition, winter ice, desert visibility, mobile accessibility, shared resource disposal, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
