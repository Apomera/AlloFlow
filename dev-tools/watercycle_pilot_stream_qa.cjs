'use strict';
// Live React/browser acceptance check for stream and runoff detail.
// Run: node dev-tools/watercycle_pilot_stream_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-stream-review');
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
      await page.waitForFunction(form=>document.querySelector('#wcPilotCanvas').dataset.parcelForm===form,form);
      await page.waitForTimeout(650);
    }
    const flow=()=>page.evaluate(()=>Array.from(pilotReview.scene.getObjectByName('pilot-stream-flow-streaks').geometry.attributes.position.array));
    const ripple=()=>page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-stream-water').userData.surfaceShader.uniforms.pilotStreamTime.value);
    await restore();
    const geometry=await page.evaluate(()=>{
      const scene=pilotReview.scene;return {stones:scene.getObjectByName('pilot-stream-bank-stones').count,
        finite:Array.from(scene.getObjectByName('pilot-stream-bank-stones').instanceMatrix.array).every(Number.isFinite),
        vertices:scene.getObjectByName('pilot-stream-flow-streaks').geometry.attributes.position.count,
        lines:scene.getObjectByName('pilot-stream-flow-streaks').isLineSegments};
    });assert.deepEqual(geometry,{stones:56,finite:true,vertices:56,lines:true});
    const positions=await flow(),time=await ripple();await page.waitForTimeout(800);assert.deepEqual(await flow(),positions);assert.equal(await ripple(),time);
    assert(positions.every(Number.isFinite));
    await canvas.hover();await page.mouse.wheel(0,-200);await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'runoff-follow.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'runoff-water-view.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-stream-water').userData.surfaceShader.uniforms.pilotStreamTime.value>.05);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();assert.notDeepEqual(await flow(),positions);
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(500);
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
      renderer.render=(scene,camera)=>{camera.position.set(213,25,-26);camera.lookAt(205,4.8,-48);return render(scene,camera);};
    });
    await restore('runoff',.45);await canvas.screenshot({path:path.join(out,'stream-detail.jpg'),type:'jpeg',quality:82});
    await restore('runoff',.45,'mountainWinter');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-stream-ice').visible),true);
    await canvas.screenshot({path:path.join(out,'stream-winter.jpg'),type:'jpeg',quality:82});
    await restore('runoff',.45,'desertBasin');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-watershed-stream').visible),false);
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-stream-flow-streaks').visible),false);
    await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await page.evaluate(()=>{
      window.streamDisposals={geometry:0,texture:0,channel:0};const stones=pilotReview.scene.getObjectByName('pilot-stream-bank-stones');
      stones.geometry.addEventListener('dispose',()=>streamDisposals.geometry++);
      stones.material.map.addEventListener('dispose',()=>streamDisposals.texture++);
      pilotReview.scene.getObjectByName('pilot-watershed-stream').userData.channelMask.addEventListener('dispose',()=>streamDisposals.channel++);
      mountWater({wcMode:'explorer'});
    });assert.deepEqual(await page.evaluate(()=>streamDisposals),{geometry:1,texture:1,channel:1});assert.deepEqual(errors,[]);
    console.log('PASS: finite stream detail, paused and reduced-motion ripples/flow, both learner views, real runoff-to-water transition, winter ice, desert visibility, mobile accessibility, shared resource disposal, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
