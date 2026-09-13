'use strict';
// Live React/browser acceptance check for the root-to-leaf plant cutaway.
// Run: node dev-tools/watercycle_pilot_plant_detail_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-leaf-handoff-review');
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
        const K=WaterCyclePilotKernel,checkpoint={...K.initialState('temperateCoast'),form,altitudeM:form==='transpiring'?30:0,pathwayProgress:progress,
          x:200,z:0,yaw:-1.05,pitch:.4,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,scenario:'temperateCoast',navigationAssist:false,cameraMode:'follow',pauseAtChanges:true,
          resumeCheckpoint:checkpoint,resumeToken:form+'-'+progress+'-'+Date.now()}}}));
      },{form,progress});
      await page.waitForFunction(({form,progress})=>document.querySelector('#wcPilotCanvas').dataset.parcelForm===form && Math.abs(waterReviewData.pilot.snapshot.pathwayProgress-progress)<.001,{form,progress});
      await page.waitForTimeout(600);
    }

    for(const reducedMotion of ['no-preference','reduce']) {
      await page.emulateMedia({reducedMotion});
      await restore('plant',.999);
      const endpoint=await page.evaluate(()=>{
        const g=pilotReview.scene.getObjectByName('pilot-plant-cutaway');
        return g.localToWorld(pilotReview.scene.getObjectByName('pilot-plant-water-route').geometry.parameters.path.getPointAt(1)).toArray();
      });
      await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='transpiring');
      await page.waitForFunction(()=>waterReviewData.pilot.paused);
      const position=()=>page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-water-parcel').position.toArray());
      const arrival=await position();
      assert(Math.hypot(...arrival.map((v,i)=>v-endpoint[i]))<.001,'Leaf arrival matches the full route endpoint');
      await page.waitForTimeout(600);assert.deepEqual(await position(),arrival,'Learning pause holds the leaf endpoint');
      await canvas.screenshot({path:path.join(out,'leaf-arrival-'+reducedMotion+'.jpg'),type:'jpeg',quality:82});
      await page.getByRole('button',{name:'Water view',exact:true}).click();
      await canvas.screenshot({path:path.join(out,'leaf-water-view-'+reducedMotion+'.jpg'),type:'jpeg',quality:82});
      await page.evaluate(()=>{
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,pauseAtChanges:false}}}));
        window.leafSamples=[];
        window.leafSampleTimer=setInterval(()=>{
          const c=document.querySelector('#wcPilotCanvas');
          leafSamples.push({alt:Number(c.dataset.parcelAltitudeM),y:pilotReview.scene.getObjectByName('pilot-water-parcel').position.y,form:c.dataset.parcelForm});
        },50);
      });
      await page.getByRole('button',{name:'Continue journey',exact:true}).click();
      await page.evaluate(()=>document.querySelector('#wcPilotCanvas')._wcPilotInput.up=true);
      await page.waitForFunction(()=>Number(document.querySelector('#wcPilotCanvas').dataset.parcelAltitudeM)>180,null,{timeout:60000});
      await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
      const samples=await page.evaluate(()=>{clearInterval(leafSampleTimer);return leafSamples;});
      assert(samples.length>3);assert(samples.some(s=>s.form==='vapor'),'The actual journey reaches atmospheric vapor');
      assert(samples.every((v,i)=>!i||v.alt<samples[i-1].alt||v.y>=samples[i-1].y-.001),'Increasing altitude never visually sinks, including the vapor handoff');
      const held=await position();await page.waitForTimeout(600);assert.deepEqual(await position(),held);
      await restore('transpiring',0);
      const restored=await position();assert(Math.abs(restored[1]-32)<.001,'Restored leaf departure retains canopy height');
    }
    await page.setViewportSize({width:390,height:900});
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));
    assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
    console.log('PASS: exact leaf endpoint, paused handoff, both camera views, monotonic ascent through vapor transition, reduced motion, restored canopy height, mobile accessibility, no browser errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
