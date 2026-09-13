'use strict';
// Live React/browser acceptance check for the root-to-leaf plant cutaway.
// Run: node dev-tools/watercycle_pilot_plant_detail_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-evaporation-guidance-review');
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

    async function restore(x=-150,z=40,energy=.2,form='liquid') {
      await page.evaluate(({x,z,energy,form})=>{
        const checkpoint={...WaterCyclePilotKernel.initialState('tropicalOcean'),x,z,energy,form,altitudeM:0,yaw:-1.05,pitch:.4,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          scenario:'tropicalOcean',paused:true,pauseAtChanges:true,showMolecules:false,navigationAssist:false,cameraMode:'follow',
          resumeCheckpoint:checkpoint,resumeToken:Date.now()+'-'+x+'-'+energy+'-'+form}}}));
      },{x,z,energy,form});
      await page.waitForFunction(({x,z,energy,form})=>{
        const snap=waterReviewData.pilot.snapshot;
        return snap.form===form&&Math.abs(snap.energy-energy)<.001&&Math.abs(snap.x-x)<.01&&Math.abs(snap.z-z)<.01;
      },{x,z,energy,form});
      await canvas.scrollIntoViewIfNeeded();
    }

    const objective=()=>page.locator('.wc-pilot-goal strong').innerText();
    for(const [x,energy,zone] of [[-150,.2,'inside'],[-190,.2,'outside'],[-190,.8,'outside'],[-124,.2,'outside'],[-124.01,.2,'inside']]) {
      await restore(x,40,energy);
      await page.waitForFunction(zone=>waterReviewData.pilot.snapshot.sunlightZone===zone,zone);
      assert.equal(await canvas.getAttribute('data-sunlight-zone'),zone);
      const hud=await page.locator('.wc-pilot-hud-right').innerText();
      assert(hud.includes(zone==='inside'?'Inside sunlight zone · faster':'Outside sunlight zone · slower'));
      const bar=page.getByRole('progressbar',{name:'Model progress to evaporation',exact:true});
      assert.equal(await bar.getAttribute('aria-valuenow'),String(Math.round(energy*100)));
      if(zone==='outside')assert((await objective()).includes(energy>.55?'You can become vapor here':'Evaporation still happens outside'));
      if(x===-150||x===-190&&energy===.2)await canvas.screenshot({path:path.join(out,zone+'-guidance.jpg'),type:'jpeg',quality:82});
    }
    // A zone change must update the HUD even when no other reading crosses its throttle.
    await page.evaluate(()=>{
      const previous=waterReviewData.pilot.snapshot;
      document.querySelector('#wcPilotCanvas')._wcPilotOnSnapshot({...previous,sunlightZone:'outside',reason:'tick'});
    });
    await page.waitForFunction(()=>waterReviewData.pilot.snapshot.sunlightZone==='outside');
    assert((await objective()).includes('Evaporation still happens outside'));
    await restore(-177,40,.1);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.evaluate(()=>document.querySelector('#wcPilotCanvas')._wcPilotInput.right=true);
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.sunlightZone==='inside',null,{timeout:30000});
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    await page.waitForFunction(()=>waterReviewData.pilot.snapshot.sunlightZone==='inside');
    assert((await page.locator('.wc-pilot-hud-right').innerText()).includes('Inside sunlight zone'));
    await restore(-190,40,.999);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='vapor');
    await page.waitForFunction(()=>document.querySelector('.wc-pilot-notice')?.innerText.includes('Evaporation threshold reached'));
    assert(!(await page.locator('.wc-pilot-notice').innerText()).includes('Energy threshold · 0%'));
    assert.equal(await page.getByRole('progressbar',{name:'Model progress to evaporation',exact:true}).count(),0);
    await canvas.screenshot({path:path.join(out,'outside-evaporation.jpg'),type:'jpeg',quality:82});
    await restore(-190,40,.2);await page.setViewportSize({width:390,height:900});
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').getBoundingClientRect().width>=innerWidth-40);
    await page.emulateMedia({reducedMotion:'reduce'});
    for(const forcedColors of ['none','active']) {
      await page.emulateMedia({forcedColors});
      await canvas.screenshot({path:path.join(out,'outside-mobile-'+forcedColors+'.jpg'),type:'jpeg',quality:82});
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[]);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert((await objective()).includes('Evaporation still happens outside'));
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: exact zone boundary, low/high-energy guidance, accessible model progress, zone-only HUD update, actual entry while moving, evaporation outside the zone, corrected threshold receipt, mobile normal/forced colors and reduced motion, no browser errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
