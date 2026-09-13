'use strict';
// Live React/browser acceptance check for the root-to-leaf plant cutaway.
// Run: node dev-tools/watercycle_pilot_plant_detail_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-plant-detail-review');
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
    await page.waitForFunction(()=>window.pilotReview?.scene.getObjectByName('pilot-plant-leaves'));
    async function restore(form,progress=.45){
      await page.evaluate(({form,progress})=>{
        const K=WaterCyclePilotKernel,checkpoint={...K.initialState('temperateCoast'),form,pathwayProgress:progress,
          x:200,z:0,yaw:-1.05,pitch:.4,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,scenario:'temperateCoast',navigationAssist:false,cameraMode:'follow',pauseAtChanges:true,
          resumeCheckpoint:checkpoint,resumeToken:form+'-'+progress+'-'+Date.now()}}}));
      },{form,progress});
      await page.waitForFunction(({form,progress})=>document.querySelector('#wcPilotCanvas').dataset.parcelForm===form && Math.abs(waterReviewData.pilot.snapshot.pathwayProgress-progress)<.001,{form,progress});
      await page.waitForTimeout(600);
    }
    if (!process.argv.includes('--mobile-only')) {
    const flow=()=>page.evaluate(()=>Array.from(pilotReview.scene.getObjectByName('pilot-plant-water-flow').geometry.attributes.position.array));
    await restore('plant',.45);
    const anatomy=await page.evaluate(()=>{
      const scene=pilotReview.scene,plant=scene.getObjectByName('pilot-plant-cutaway');let finite=true;
      plant.traverse(o=>{if(o.geometry?.attributes.position)finite&&=Array.from(o.geometry.attributes.position.array).every(Number.isFinite);});
      return {roots:scene.getObjectByName('pilot-plant-roots').count,leaves:scene.getObjectByName('pilot-plant-leaves').children.length,finite,
        rootsFinite:Array.from(scene.getObjectByName('pilot-plant-roots').instanceMatrix.array).every(Number.isFinite),
        openStem:scene.getObjectByName('pilot-plant-stem').geometry.index.count<64*12*6};
    });assert.deepEqual(anatomy,{roots:72,leaves:5,finite:true,rootsFinite:true,openStem:true});
    const surface=await page.evaluate(()=>{
      const leaves=pilotReview.scene.getObjectByName('pilot-plant-leaves').children.map(g=>g.children[0]);
      return {shared:leaves.every(l=>l.material.map===leaves[0].material.map),
        textured:leaves.every(l=>l.material.map?.name==='pilot-leaf-surface-texture'),
        uv:leaves.every(l=>l.geometry.attributes.uv.count===l.geometry.attributes.position.count && Array.from(l.geometry.attributes.uv.array).every(v=>v>=0&&v<=1))};
    });assert.deepEqual(surface,{shared:true,textured:true,uv:true});
    const positions=await flow(),time=await canvas.getAttribute('data-parcel-elapsed');
    await page.waitForTimeout(750);assert.deepEqual(await flow(),positions);assert.equal(await canvas.getAttribute('data-parcel-elapsed'),time);
    for(const [label,progress] of [['roots',.08],['stem',.5],['leaves',.93]]){
      await restore('plant',progress);
      const detail=page.locator('.wc-pilot-plant-closeup');
      assert.equal(await detail.getAttribute('data-plant-detail'),label==='roots'?'root':label==='leaves'?'leaf':'stem');
      assert.equal(await detail.locator('svg').getAttribute('aria-hidden'),'true');
      assert.equal(await detail.locator('svg').getAttribute('focusable'),'false');
      assert((await detail.innerText()).includes(label==='roots'?'Roots take in':label==='leaves'?'vapor is invisible':'Xylem carries'));
      await canvas.hover();await page.mouse.wheel(0,-250);await page.waitForTimeout(700);
      await canvas.screenshot({path:path.join(out,label+'-follow.jpg'),type:'jpeg',quality:82});
      if(label!=='roots'){
        await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(500);
        await canvas.screenshot({path:path.join(out,label+'-water-view.jpg'),type:'jpeg',quality:82});
      }
    }
    await restore('plant',.45);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);
    const still=await flow();await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>waterReviewData.pilot.snapshot.pathwayProgress>.46);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();assert.deepEqual(await flow(),still);
    await restore('plant',.999);await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='transpiring');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-plant-cutaway').visible),true);
    const releasePosition=await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-water-parcel').position.toArray());
    await page.waitForTimeout(850);
    assert.deepEqual(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-water-parcel').position.toArray()),releasePosition,'Learning pause must hold the release height');
    await canvas.screenshot({path:path.join(out,'release-follow.jpg'),type:'jpeg',quality:82});
    await page.evaluate(()=>{
      const saved={...waterReviewData.pilot.snapshot};
      waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
        paused:true,resumeCheckpoint:saved,resumeToken:'restore-release-'+Date.now()}}}));
    });
    await page.waitForTimeout(700);
    assert(await page.evaluate(()=>{
      const plant=pilotReview.scene.getObjectByName('pilot-plant-cutaway');
      const parcel=pilotReview.scene.getObjectByName('pilot-water-parcel');
      return Math.abs(plant.position.x+6-parcel.position.x)<.01&&Math.abs(plant.position.z-2-parcel.position.z)<.01;
    }),'Restored transpiration anchors the release leaf beneath the parcel');
    await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    }
    await page.setViewportSize({width:390,height:900});
    await restore('plant',.93);
    for(const forcedColors of ['none','active']) {
      await page.emulateMedia({forcedColors});await page.waitForTimeout(200);
      assert(await page.evaluate(()=>{
        const detail=document.querySelector('.wc-pilot-plant-closeup').getBoundingClientRect();
        const controls=document.querySelector('.wc-pilot-pad').getBoundingClientRect();
        return detail.left>=0&&detail.right<=innerWidth+1&&detail.bottom<=controls.top;
      }),'Mobile leaf detail stays visible above flight controls');
      const mobileViolations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));
      assert.deepEqual(mobileViolations,[]);
      await canvas.screenshot({path:path.join(out,'leaf-mobile-'+forcedColors+'.jpg'),type:'jpeg',quality:82});
    }
    await restore('rain');assert.equal(await page.locator('.wc-pilot-plant-closeup').count(),0);
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-plant-cutaway').visible),false);
    await page.evaluate(()=>{
      window.plantDisposals={geometry:0,material:0,texture:0};const plant=pilotReview.scene.getObjectByName('pilot-plant-leaves');
      plant.children[0].children[0].geometry.addEventListener('dispose',()=>plantDisposals.geometry++);
      plant.children[0].children[0].material.addEventListener('dispose',()=>plantDisposals.material++);
      plant.children[0].children[0].material.map.addEventListener('dispose',()=>plantDisposals.texture++);
      mountWater({wcMode:'explorer'});
    });assert.deepEqual(await page.evaluate(()=>plantDisposals),{geometry:1,material:1,texture:1});assert.deepEqual(errors,[]);
    console.log(process.argv.includes('--mobile-only') ? 'PASS: final mobile layout, normal and forced-colors accessibility, guide visibility, geometry/material/texture disposal, no browser errors.' : 'PASS: shared leaf texture and valid UVs, three progress-linked teaching illustrations, mobile forced colors and controls clearance, plant anatomy, finite geometry, open stem, paused flow, both camera views, reduced motion, actual plant-to-transpiring transition, phase visibility, mobile accessibility, shared material disposal, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
