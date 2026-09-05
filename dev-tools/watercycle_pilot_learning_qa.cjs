'use strict';
// Live React/browser acceptance check for pilot learning pauses.
// Run: node dev-tools/watercycle_pilot_learning_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-learning-review');
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');
(async () => {
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Water pilot navigation QA</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({content:read('dev-tools/.cache/sweep-tailwind.css')});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','vendor/three-r128/three.min.js','vendor/three-r128/OrbitControls.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_watercycle.js']) await page.addScriptTag({content:read(file)});
    await page.evaluate(()=>{
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
    await page.waitForSelector('.wc-pilot-navigation');
    await page.locator('.wc-pilot-flight-options>summary').click();
    const data=()=>page.evaluate(()=>waterReviewData);
    assert.equal(await page.getByRole('button',{name:'Pause at changes',exact:true}).getAttribute('aria-pressed'),'false');
    const regularHeight=(await canvas.boundingBox()).height;
    await page.getByRole('button',{name:'Larger view',exact:true}).click();
    assert((await canvas.boundingBox()).height>regularHeight+80,'Larger view increases playable canvas');
    const elapsedBeforeResize=await canvas.getAttribute('data-parcel-elapsed');
    await page.getByRole('button',{name:'Smaller view',exact:true}).click();
    assert.equal(await canvas.getAttribute('data-parcel-elapsed'),elapsedBeforeResize,'Resize preserves paused simulation');
    await page.getByRole('button',{name:'Pause at changes',exact:true}).click();
    await page.getByRole('button',{name:'Guide my movement',exact:true}).click();
    // Restore near evaporation; only the live energy model may cause the change.
    await page.evaluate(()=>{
      const checkpoint={...WaterCyclePilotKernel.initialState('tropicalOcean'),energy:0.97,x:-150,z:40,
        yaw:-1.05,pitch:0.26,surface:'water',cameraMode:'follow'};
      waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
        paused:true,resumeCheckpoint:checkpoint,resumeToken:'learning-pause-check'}}}));
    });
    await page.waitForFunction(()=>waterReviewData.pilot.snapshot?.energy>=0.97);
    assert.equal(await page.locator('.wc-pilot-notice').count(),0,'Restore is not a learned transition');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForSelector('.wc-pilot-notice');
    await page.waitForFunction(()=>document.activeElement?.id==='wcPilotNoticeContinue');
    assert.equal((await data()).pilot.paused,true);
    assert.equal((await data()).pilot.snapshot.form,'vapor');
    assert.equal((await data()).pilot.lastChange.from,'liquid');
    assert.equal((await data()).pilot.lastChange.to,'vapor');
    assert((await page.locator('.wc-pilot-notice').innerText()).includes('Energy absorbed by water'));
    const receipt=JSON.stringify((await data()).pilot.lastChange);
    const elapsed=await canvas.getAttribute('data-parcel-elapsed');
    await page.waitForTimeout(900);
    assert.equal(await canvas.getAttribute('data-parcel-elapsed'),elapsed,'Learning pause freezes time');
    assert.equal(JSON.stringify((await data()).pilot.lastChange),receipt,'Recorded change stays frozen');
    for(const width of [1280,390,320]) {
      await page.setViewportSize({width,height:900});
      await page.locator('.wc-pilot-stage').scrollIntoViewIfNeeded();
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-notice'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
      assert.deepEqual(violations,[],'Notice accessibility and contrast at '+width);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow at '+width);
      const panel=await page.locator('.wc-pilot-notice').boundingBox();
      const stage=await page.locator('.wc-pilot-stage').boundingBox();
      const button=await page.locator('#wcPilotNoticeContinue').boundingBox();
      assert(button.y>=panel.y && button.y+button.height<=panel.y+panel.height,'Continue button stays visible inside card');
      assert(panel.x>=stage.x && panel.x+panel.width<=stage.x+stage.width+1,'Card stays inside the stage');
      await page.locator('.wc-pilot-stage').screenshot({path:path.join(out,'learning-pause-'+width+'.png')});
    }
    await page.getByRole('button',{name:'Continue journey',exact:true}).click();
    assert.equal(await page.locator('.wc-pilot-notice').count(),0);
    assert.equal((await data()).pilot.paused,false);
    await page.waitForFunction(()=>document.activeElement?.id==='wcPilotCanvas');
    await page.waitForFunction(previous=>Number(document.querySelector('#wcPilotCanvas').dataset.parcelElapsed)>Number(previous),elapsed);
    assert.equal(JSON.stringify((await data()).pilot.lastChange),receipt,'Continue preserves evidence');
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    assert.equal(await page.locator('.wc-pilot-notice').count(),0,'Ordinary pause does not reopen a reviewed change');
    // A saved falling parcel distinguishes intended destination from ground underneath.
    await page.evaluate(()=>{
      const checkpoint={...WaterCyclePilotKernel.initialState('tropicalOcean'),form:'rain',altitudeM:500,
        mass:1,x:-150,z:40,yaw:-1.05,pitch:0.26,surface:'water',cameraMode:'follow'};
      waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
        paused:true,landingGoal:'plant',resumeCheckpoint:checkpoint,resumeToken:'landing-goal-check'}}}));
    });
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='rain');
    assert((await page.locator('.wc-pilot-landing-aim').innerText()).includes('Forest canopy'));
    assert((await page.locator('.wc-pilot-route').innerText()).includes('Over Open water'));
    const live=await canvas.evaluate(c=>{const gl=c.getContext('webgl2')||c.getContext('webgl');return !!gl&&!gl.isContextLost();});
    assert(live,'Live WebGL scene');
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS: live evaporation learning pause, exact evidence, keyboard focus, continue, ordinary pause, 320/390px card layout, axe contrast, larger canvas, and distinct landing goal.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
