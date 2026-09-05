'use strict';
// Browser acceptance check for contextual journey challenge hints.
// Run: node dev-tools/watercycle_pilot_hints_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-hint-review');
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


    const data=()=>page.evaluate(()=>waterReviewData);
    const hints=page.locator('.wc-pilot-mission-hint');
    assert.equal(await hints.count(),0,'No hint without a challenge');
    // Prepare a paused rain checkpoint for a repeatable UI acceptance test.
    await page.evaluate(()=>{
      const K=WaterCyclePilotKernel;
      const checkpoint={...K.initialState('tropicalOcean'),form:'rain',altitudeM:250,vy:-4,mass:1,x:-150,z:40,surface:'water'};
      waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,paused:true,resumeCheckpoint:checkpoint,resumeToken:'hint-rain-start'}}}));
    });
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='rain');
    await page.locator('#wcPilotMissions>summary').click();
    await page.getByRole('button',{name:'Start challenge: Below the surface',exact:true}).click();
    assert.equal(await hints.getAttribute('data-hint'),'land');
    assert.equal(await hints.evaluate(n=>n.open),false,'Hint starts folded');
    await hints.locator('summary').focus();await page.keyboard.press('Enter');
    assert.equal(await hints.evaluate(n=>n.open),true,'Keyboard opens hint');
    assert((await hints.innerText()).includes('permeable soil'));
    await page.locator('.wc-pilot-flight-options>summary').click();
    await page.getByLabel('Aim to land on',{exact:true}).selectOption('water');
    const size=await page.getByRole('button',{name:'Use challenge landing goal',exact:true}).boundingBox();
    assert(size.height>=44,'Landing correction has a 44px touch target');
    const before=(await data()).pilot;
    await page.getByRole('button',{name:'Use challenge landing goal',exact:true}).click();
    const after=(await data()).pilot;
    assert.equal(after.landingGoal,'permeable');assert.equal(after.paused,true);
    assert.deepEqual(after.mission,before.mission,'Realignment preserves evidence');
    assert.equal(after.navigationAssist,before.navigationAssist,'Realignment does not enable assist');
    assert.equal(after.snapshot.form,before.snapshot.form);
    assert.equal(after.snapshot.altitudeM,before.snapshot.altitudeM);
    await page.waitForFunction(()=>document.activeElement.id==='wcPilotCanvas');
    assert.equal(await page.getByRole('button',{name:'Use challenge landing goal',exact:true}).count(),0);
    await page.locator('.wc-pilot-flight-options>summary').click();
    // A kernel-generated completed landing event exercises the next-step display.
    await page.evaluate(()=>{
      const K=WaterCyclePilotKernel,before={...K.initialState('tropicalOcean'),form:'rain',altitudeM:.1,vy:-4,mass:1};
      const next={...K.step(before,{dt:.05,surface:'permeable'}),reason:'form',surface:'permeable',tempC:20,rh:100};
      window.hintRecordedMission=K.advanceMission(K.startMission('infiltration',before),before,next);
      waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,resumeCheckpoint:next,resumeToken:'hint-soil-step'}}}));
    });
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='soil');
    await page.evaluate(()=>waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,mission:hintRecordedMission}}})));
    await page.waitForFunction(()=>document.querySelector('.wc-pilot-mission-hint').dataset.hint==='follow');
    assert((await hints.locator('summary').innerText()).includes('Reach groundwater'));
    if(!await hints.evaluate(n=>n.open)) await hints.locator('summary').click();
    assert((await hints.innerText()).includes('Step 2 of 2'));
    const snapshot=(await data()).pilot.snapshot;
    for(const [width,dark] of [[1280,false],[390,false],[320,false],[1280,true]]) {
      await page.setViewportSize({width,height:1000});
      if(dark) {
        await page.evaluate(seed=>mountWater(seed,true),await data());
        await page.evaluate(()=>waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,mission:hintRecordedMission}}})));
      }
      if(!await hints.evaluate(n=>n.open)) await hints.locator('summary').click();
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-navigation'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
      assert.deepEqual(violations,[],'Navigation hint accessibility '+width+' dark '+dark);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow '+width);
      await page.locator('.wc-pilot-navigation').screenshot({path:path.join(out,'hint-'+width+(dark?'-dark':'')+'.png')});
    }
    await page.evaluate(()=>waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,mission:{...prev.waterCycle.pilot.mission,status:'interrupted'}}}})));
    assert.equal(await hints.count(),0,'Interrupted attempts show no stale hints');
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS: contextual hint, keyboard disclosure, landing correction, preserved pause/position/evidence, focus return, recorded next-step guidance, responsive layout, and light/dark accessibility.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
