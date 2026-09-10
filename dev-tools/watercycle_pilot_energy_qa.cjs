'use strict';
// Live React/browser acceptance check for phase-change energy visuals.
// Run: node dev-tools/watercycle_pilot_energy_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-energy-review');
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
    await page.waitForFunction(()=>window.pilotReview?.scene.getObjectByName('pilot-energy-transfer'));
    async function restore(kind) {
      await page.evaluate(kind=>{
        const K=WaterCyclePilotKernel, env=K.environment('tropicalOcean');
        const checkpoint={...K.initialState('tropicalOcean'),x:-150,z:40,yaw:-1.05,pitch:.26,cameraMode:'follow'};
        if(kind==='evaporate') checkpoint.energy=.995;
        if(kind==='condense') Object.assign(checkpoint,{form:'vapor',altitudeM:env.lclM+60,nucleus:true,energy:1});
        if(kind==='rain') Object.assign(checkpoint,{form:'cloud',altitudeM:env.lclM+60,mass:K.MASS_TO_FALL});
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,pauseAtChanges:true,showMolecules:false,navigationAssist:false,
          noticeChangeId:null,reviewChange:null,resumeCheckpoint:checkpoint,resumeToken:kind+'-'+Date.now()}}}));
      },kind);
      await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.latentEnergyCue==='hidden');
      assert.equal(await canvas.getAttribute('data-latent-energy-transfer'),'none-yet','Checkpoint restore clears the old cue');
    }
    const cue=()=>page.evaluate(()=>{
      const group=pilotReview.scene.getObjectByName('pilot-energy-transfer');
      const arrows=group.getObjectByName('pilot-energy-arrows');
      return {visible:group.visible,opacity:arrows.children[0].material.opacity,
        arrows:arrows.children.map(a=>({position:a.position.toArray(),rotation:a.rotation.z,
          direction:Math.cos(a.rotation.z)*a.position.x+Math.sin(a.rotation.z)*a.position.y})),
        points:Array.from(group.children.find(c=>c.isPoints).geometry.attributes.position.array)};
    });
    await restore('evaporate');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForSelector('.wc-pilot-notice');
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.latentEnergyCue==='active');
    const absorbed=await cue();assert(absorbed.visible&&absorbed.opacity>.5);
    assert(absorbed.arrows.length===8&&absorbed.arrows.every(a=>a.direction<0),'All absorption arrows point inward');
    assert((await page.locator('.wc-pilot-energy-key').innerText()).includes('toward the water'));
    const elapsed=await canvas.getAttribute('data-parcel-elapsed');
    await page.waitForTimeout(3200);
    assert.deepEqual(await cue(),absorbed,'A learning pause preserves the entire cue beyond its running duration');
    assert.equal(await canvas.getAttribute('data-parcel-elapsed'),elapsed);
    for(const width of [1280,390,320]) {
      await page.setViewportSize({width,height:900});
      await page.locator('.wc-pilot-stage').scrollIntoViewIfNeeded();
      const panel=await page.locator('.wc-pilot-notice').boundingBox(),stage=await canvas.boundingBox();
      if(width===1280) assert(panel.x>stage.x+stage.width/2+25,'Wide notice leaves the parcel center exposed');
      assert(panel.x>=stage.x&&panel.x+panel.width<=stage.x+stage.width+1);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-notice'),{rules:{region:{enabled:false}}})).violations.map(v=>v.id));
      assert.deepEqual(violations,[]);
      await page.locator('.wc-pilot-stage').screenshot({path:path.join(out,'absorption-'+width+'.png')});
    }
    await page.setViewportSize({width:1280,height:900});
    await page.getByRole('button',{name:'Continue journey',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.latentEnergyCue==='hidden',null,{timeout:30000});
    await restore('condense');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForSelector('.wc-pilot-notice');
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.latentEnergyTransfer==='released-outward-to-air');
    const released=await cue();assert(released.visible&&released.arrows.every(a=>a.direction>0),'Release arrows point outward');
    assert((await page.locator('.wc-pilot-energy-key').innerText()).includes('away from the water'));
    await page.locator('.wc-pilot-stage').screenshot({path:path.join(out,'release.png')});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-energy-arrows').children[0].material.opacity===0.92);
    const reduced=await cue();
    await page.waitForTimeout(1100);
    assert.deepEqual(await cue(),reduced,'Reduced-motion cue is static and readable');
    assert(reduced.opacity>.5&&reduced.arrows.every(a=>a.direction>0));
    await page.locator('.wc-pilot-stage').screenshot({path:path.join(out,'release-reduced.png')});
    await page.getByRole('button',{name:'Water view',exact:true}).click();
    await page.waitForFunction(()=>{
      const group=pilotReview.scene.getObjectByName('pilot-energy-transfer');
      const projected=group.position.clone().project(pilotReview.camera);
      return Math.abs(projected.x)<.001 && Math.abs(projected.y)<.001 && projected.z<1;
    });
    assert.deepEqual(await cue(),reduced,'Changing camera does not advance or alter the frozen energy arrows');
    await page.locator('.wc-pilot-stage').screenshot({path:path.join(out,'water-view-energy.png')});
    await restore('rain');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='rain');
    assert.equal(await canvas.getAttribute('data-latent-energy-cue'),'hidden');
    assert.equal(await canvas.getAttribute('data-latent-energy-transfer'),'none-no-phase-change');
    assert.equal(await page.locator('.wc-pilot-energy-key').count(),0,'Falling liquid does not display a phase-change key');
    await page.evaluate(()=>{
      const arrows=pilotReview.scene.getObjectByName('pilot-energy-arrows');window.energyDisposed={geometry:0,material:0};
      arrows.children[0].geometry.addEventListener('dispose',()=>energyDisposed.geometry++);
      arrows.children[0].material.addEventListener('dispose',()=>energyDisposed.material++);
      mountWater({wcMode:'explorer'});
    });
    assert.deepEqual(await page.evaluate(()=>energyDisposed),{geometry:1,material:1});
    assert.deepEqual(errors,[]);
    console.log('PASS: real evaporation/condensation direction, pause retention, resume expiry, checkpoint clearing, static reduced motion, no latent cue for rain formation, desktop framing, 320/390px layout and axe, shared resource disposal, and no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
