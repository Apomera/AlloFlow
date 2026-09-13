'use strict';
// Live React/browser acceptance check for lake and shoreline detail.
// Run: node dev-tools/watercycle_pilot_lake_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-lake-review');
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
    async function restore(form='liquid',scenario='temperateCoast',x=268,z=-104,altitudeM=0){
      await page.evaluate(({form,scenario,x,z,altitudeM})=>{
        const checkpoint={...WaterCyclePilotKernel.initialState(scenario),form,energy:0,altitudeM,
          x,z,yaw:-.75,pitch:.65,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,scenario,navigationAssist:false,cameraMode:'follow',pauseAtChanges:true,
          resumeCheckpoint:checkpoint,resumeToken:scenario+'-'+form+'-'+x+'-'+Date.now()}}}));
      },{form,scenario,x,z,altitudeM});
      await page.waitForFunction(({form,scenario,x,z})=>{
        const canvas=document.querySelector('#wcPilotCanvas'),parcel=pilotReview.scene.getObjectByName('pilot-water-parcel');
        return canvas.dataset.parcelForm===form && canvas.dataset.pilotScenario===scenario
          && Math.abs(parcel.position.x-x)<.01 && Math.abs(parcel.position.z-z)<.01;
      },{form,scenario,x,z});
      await page.waitForTimeout(650);
    }
    const ripple=()=>page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-lake-water').userData.surfaceShader.uniforms.pilotLakeTime.value);
    const parcelY=()=>page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-water-parcel').position.y);
    await restore();
    const anatomy=await page.evaluate(()=>{
      const scene=pilotReview.scene,lake=scene.getObjectByName('pilot-lake-water'),shore=scene.getObjectByName('pilot-lake-shore');
      let finite=true;shore.traverse(o=>{if(o.geometry?.attributes.position)finite&&=Array.from(o.geometry.attributes.position.array).every(Number.isFinite);});
      return {radius:lake.geometry.parameters.radius,stones:scene.getObjectByName('pilot-lake-shore-stones').count,
        finite,openOutlet:shore.children[0].geometry.index.count<96*3*6};
    });assert.deepEqual(anatomy,{radius:34,stones:48,finite:true,openOutlet:true});
    assert(Math.abs(await parcelY()-11.8)<.01,'Collected lake water rests above the visible water surface; y='+await parcelY());
    assert.equal(await canvas.getAttribute('data-parcel-altitude-m'),'0','Visual lift must not alter kernel altitude');
    const paused=await ripple();await page.waitForTimeout(700);assert.equal(await ripple(),paused);
    await canvas.hover();await page.mouse.wheel(0,250);await page.waitForTimeout(600);
    await canvas.screenshot({path:path.join(out,'lake-follow.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'lake-water-view.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-lake-water').userData.surfaceShader.uniforms.pilotLakeTime.value>.05);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);const still=await ripple();
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    const elapsed=await canvas.getAttribute('data-parcel-elapsed');await page.waitForFunction(v=>document.querySelector('#wcPilotCanvas').dataset.parcelElapsed!==v,elapsed);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();assert.equal(await ripple(),still);
    await restore('rain','temperateCoast',268,-104,1);await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');
    assert(Math.abs(await parcelY()-11.8)<.01,'Actual lake landing receives the same surface height');
    await restore('liquid','temperateCoast',205,-50);assert(await parcelY()>7.5&&await parcelY()<9,'Collected stream water floats on the stream');
    await restore('liquid','temperateCoast',-100,0);assert(Math.abs(await parcelY()-3.2)<.01,'Open ocean retains its existing height');
    await restore('liquid','mountainWinter');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-lake-shore').visible),true);
    await canvas.screenshot({path:path.join(out,'lake-winter.jpg'),type:'jpeg',quality:82});
    await restore('liquid','desertBasin');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-lake-water').visible),false);
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-lake-shore').visible),false);
    await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await page.evaluate(()=>{
      window.lakeDisposals={geometry:0,texture:0};const shore=pilotReview.scene.getObjectByName('pilot-lake-shore');
      shore.children[0].geometry.addEventListener('dispose',()=>lakeDisposals.geometry++);
      shore.children[0].material.map.addEventListener('dispose',()=>lakeDisposals.texture++);
      mountWater({wcMode:'explorer'});
    });assert.deepEqual(await page.evaluate(()=>lakeDisposals),{geometry:1,texture:1});assert.deepEqual(errors,[]);
    console.log('PASS: lake boundary, finite shore and open outlet, correct lake/stream/ocean parcel heights, paused/reduced-motion ripples, both camera modes, actual lake landing, winter/desert visibility, mobile accessibility, shared resource cleanup, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
