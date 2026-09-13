'use strict';
// Live acceptance check for downhill runoff and its surface-water arrival.
// Run: node dev-tools/watercycle_pilot_spring_discharge_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-runoff-arrival-review');
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
    await page.waitForFunction(()=>window.pilotReview?.scene.getObjectByName('pilot-lake-water')?.userData.surfaceShader);
    async function restore(form='liquid',scenario='temperateCoast',x=268,z=-104,altitudeM=0,progress=.999){
      await page.evaluate(({form,scenario,x,z,altitudeM,progress})=>{
        const checkpoint={...WaterCyclePilotKernel.initialState(scenario),form,energy:0,altitudeM,pathwayProgress:progress,
          x,z,yaw:-.75,pitch:.65,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,scenario,navigationAssist:false,cameraMode:'follow',pauseAtChanges:true,
          resumeCheckpoint:checkpoint,resumeToken:scenario+'-'+form+'-'+x+'-'+Date.now()}}}));
      },{form,scenario,x,z,altitudeM,progress});
      await page.waitForFunction(({form,scenario,progress})=>document.querySelector('#wcPilotCanvas').dataset.parcelForm===form
        && waterReviewData.pilot.snapshot.scenario===scenario
        && Math.abs(waterReviewData.pilot.snapshot.pathwayProgress-progress)<.001,{form,scenario,progress});
      await page.waitForTimeout(250);
    }



    const impact=()=>page.evaluate(()=>{
      const g=pilotReview.scene.getObjectByName('pilot-ocean-landing');
      return {visible:g.visible,source:g.userData.source,surface:g.userData.surface,position:g.position.toArray(),
        rings:g.children.filter(o=>o.isMesh).map(o=>({scale:o.scale.toArray(),opacity:o.material.opacity})),spray:g.children.find(o=>o.isPoints).visible};
    });
    for(const [x,z,scenario,body] of [[205,-46,'temperateCoast','stream'],[280,-140,'temperateCoast','lake'],[-120,80,'desertBasin','ocean']]){
      await restore('runoff',scenario,x,z,0,.45);
      const shape=await page.evaluate(()=>{
        const group=pilotReview.scene.getObjectByName('pilot-runoff-pathway');
        const curve=pilotReview.scene.getObjectByName('pilot-runoff-route').geometry.parameters.path;
        return Array.from({length:201},(_,i)=>group.localToWorld(curve.getPointAt(i/200)).toArray());
      });
      assert(shape.every((p,i)=>!i||p[1]<=shape[i-1][1]+.0001),'The whole route descends, including its approach to raised water');
      assert((await page.locator('body').innerText()).includes('Runoff → open water'));
      await canvas.screenshot({path:path.join(out,body+'-downhill-route.jpg'),type:'jpeg',quality:82});
      await restore('runoff',scenario,x,z,0,.999);
      assert.equal((await impact()).visible,false,'Checkpoint does not invent a discharge');
      const route=await page.evaluate(()=>{
        const group=pilotReview.scene.getObjectByName('pilot-runoff-pathway'),mesh=pilotReview.scene.getObjectByName('pilot-runoff-route');
        const endpoint=mesh.geometry.parameters.path.getPointAt(1);group.localToWorld(endpoint);
        return {endpoint:endpoint.toArray(),target:group.userData.waterTarget,scale:group.scale.z,
          parcel:pilotReview.scene.getObjectByName('pilot-water-parcel').position.toArray()};
      });
      assert(Math.hypot(route.endpoint[0]-route.target.x,route.endpoint[2]-route.target.z)<.02,'The route ends at its selected water target');
      if(body==='lake')assert(Math.abs(Math.hypot(route.target.x-268,route.target.z+104)-30)<.01,'Runoff joins near the lake shore');
      if(body==='stream')assert(route.scale*70<24,'A nearby stream is not overshot by a minimum route length');
      await canvas.screenshot({path:path.join(out,body+'-before-discharge.jpg'),type:'jpeg',quality:82});
      await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');
      await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.waterLanding==='inflow-ripples');
      const landing=await page.evaluate(()=>({position:pilotReview.scene.getObjectByName('pilot-water-parcel').position.toArray(),
        loops:waterReviewData.pilot.snapshot.loops,energy:waterReviewData.pilot.snapshot.energy,
        surface:waterReviewData.pilot.snapshot.surface,underground:pilotReview.scene.getObjectByName('pilot-runoff-pathway').visible}));
      assert(Math.hypot(...landing.position.map((v,i)=>v-route.endpoint[i]))<.03,'Discharge meets the exact endpoint without a height jump');
      assert.equal(landing.surface,'water');assert.equal(landing.loops,1);assert.equal(landing.energy,0);assert(!landing.underground);
      const seep=await impact();assert(seep.visible&&!seep.spray&&seep.source==='runoff'&&seep.surface===body);
      assert((await page.locator('.wc-pilot-notice').innerText()).includes('Surface-water collection'));
      assert((await page.locator('.wc-pilot-notice').innerText()).includes('No phase change - no latent heat transfer in this step'));
      await page.waitForTimeout(600);assert.deepEqual(await impact(),seep,'The learning pause holds the inflow ripple');
      await canvas.screenshot({path:path.join(out,body+'-discharge.jpg'),type:'jpeg',quality:82});
      await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(400);
      await canvas.screenshot({path:path.join(out,body+'-water-view.jpg'),type:'jpeg',quality:82});
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.waterLanding==='static-ripples');
    const still=await impact();assert(!still.spray);await page.waitForTimeout(500);assert.deepEqual(await impact(),still);
    await page.getByRole('button',{name:'Continue journey',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.waterLanding==='hidden',null,{timeout:30000});
    await restore('liquid','temperateCoast',205,-50,0,0);assert.equal((await impact()).visible,false);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await restore('rain','temperateCoast',268,-104,1,0);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.waterLanding==='ripples-and-spray');
    assert.equal((await impact()).source,'rain');assert.equal((await impact()).spray,true,'Rain retains its distinct impact spray');
    await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await restore('runoff','temperateCoast',200,0,0,.45);
    await page.evaluate(()=>{
      window.springGeometryDisposals=0;
      pilotReview.scene.getObjectByName('pilot-runoff-route').geometry.addEventListener('dispose',()=>springGeometryDisposals++);
    });
    await restore('runoff','temperateCoast',280,-140,0,.6);
    assert.equal(await page.evaluate(()=>springGeometryDisposals),1,'Replacing the route disposes its previous geometry');
    await page.evaluate(()=>{
      window.springFinalDisposals={route:0,rings:0};const scene=pilotReview.scene;
      scene.getObjectByName('pilot-runoff-route').geometry.addEventListener('dispose',()=>springFinalDisposals.route++);
      scene.getObjectByName('pilot-ocean-landing').children[0].geometry.addEventListener('dispose',()=>springFinalDisposals.rings++);
      mountWater({wcMode:'explorer'});
    });assert.deepEqual(await page.evaluate(()=>springFinalDisposals),{route:1,rings:1});assert.deepEqual(errors,[]);
    console.log('PASS: short-stream/lake/ocean route endpoints, actual runoff discharge at matched surface height, cycle/energy preservation, distinct inflow and rain cues, pause/reduced motion/expiry, both cameras, restore exclusions, mobile accessibility, route replacement and shared cleanup, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
