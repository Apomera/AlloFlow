'use strict';
// React/browser acceptance check for pinned pathway evidence comparisons.
// Run: node dev-tools/watercycle_pilot_route_comparison_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-route-comparison-review');
const read = p => fs.readFileSync(path.join(ROOT,p),'utf8');
(async () => {
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});
    const errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Water pathway comparison QA</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
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
    const open=async()=>{
      for(const sel of ['#wcPilotMissions','.wc-pilot-route-compare']) {
        if(!await page.locator(sel).evaluate(n=>n.open)) await page.locator(sel+'>summary').click();
      }
    };
    await open();
    assert((await page.locator('.wc-pilot-route-compare').innerText()).includes('Complete two different'));
    // Evidence UI fixtures: use kernel transitions to prepare completed saved records.
    // This does not award any progress to a user or claim these were live browser flights.
    await page.evaluate(()=>{
      const K=WaterCyclePilotKernel;
      const result=id=>{
        const surface=id==='runoff'?'hard':'permeable';
        let before={...K.initialState('tropicalOcean'),form:'rain',altitudeM:0.1,vy:-4,mass:1};
        let mission=K.startMission(id,before);
        const step=(state,input={})=>({...K.step(state,{dt:0.05,surface,...input}),reason:'form',surface,tempC:20,rh:100});
        let next=step(before);mission=K.advanceMission(mission,before,next);
        before={...next,pathwayProgress:0.999};next=step(before,{thrust:1,pathwayDrive:1});
        return K.advanceMission(mission,before,next);
      };
      waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,missionResults:{runoff:result('runoff'),infiltration:result('infiltration')}}}}));
    });
    const pin=page.getByRole('button',{name:'Pin selected results',exact:true});
    await page.getByLabel('Second saved pathway',{exact:true}).selectOption('runoff');
    assert(await pin.isDisabled());
    await page.getByLabel('Second saved pathway',{exact:true}).selectOption('infiltration');
    await pin.click();
    assert.equal(await page.locator('.wc-pilot-rc-column').count(),2);
    await page.getByLabel('My comparison',{exact:true}).fill('Both began as rain but reached different destinations.');
    await page.getByLabel('Supporting observations',{exact:true}).fill('Runoff reached liquid water; soil water reached groundwater.');
    await page.getByLabel('Model limitation',{exact:true}).fill('Separate journeys cannot isolate the effect of land cover.');
    const frozen=(await data()).pilot.routeComparison;
    await page.evaluate(()=>waterReviewSet(prev=>{
      const pilot=prev.waterCycle.pilot;
      const changed=JSON.parse(JSON.stringify(pilot.missionResults));changed.runoff.events[0].tempC=37;
      return {...prev,waterCycle:{...prev.waterCycle,pilot:{...pilot,missionResults:changed}}};
    }));
    assert.deepEqual((await data()).pilot.routeComparison,frozen,'Latest result changes cannot rewrite pinned evidence');
    await page.getByLabel('First saved pathway',{exact:true}).selectOption('infiltration');
    assert.deepEqual((await data()).pilot.routeComparison,frozen,'Selection alone cannot rewrite pinned evidence');
    await page.getByLabel('First saved pathway',{exact:true}).selectOption('runoff');
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Download pathway comparison',exact:true}).click();
    const download=await downloadPromise;await download.saveAs(path.join(out,'pathway-comparison.txt'));
    const report=fs.readFileSync(path.join(out,'pathway-comparison.txt'),'utf8');
    for(const expected of [frozen.claim,frozen.evidence,frozen.limitation,'temperature: 20.0','rain -> runoff','soil -> groundwater','not a controlled experiment']) assert(report.includes(expected),expected);
    assert(!report.includes('temperature: 37.0'));
    await page.evaluate(()=>{
      const N=WaterCyclePilotNotebook,record=N.capture(waterReviewData,123,'comparison-test');
      waterReviewSet(prev=>({...prev,waterCycle:N.restore(waterReviewData,JSON.parse(JSON.stringify(record)))}));
    });
    assert.deepEqual((await data()).pilot.routeComparison,frozen,'Notebook round trip');
    await open();await pin.click();
    assert.equal((await data()).pilot.routeComparison.left.events[0].tempC,37);
    assert.equal((await data()).pilot.routeComparison.claim,frozen.claim);
    for(const [width,dark] of [[1280,false],[390,false],[320,false],[1280,true]]) {
      await page.setViewportSize({width,height:1000});
      if(dark) await page.evaluate(seed=>mountWater(seed,true),await data());
      await open();
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-route-compare'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
      assert.deepEqual(violations,[],'Comparison accessibility at '+width+' dark '+dark);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow at '+width);
      await page.locator('.wc-pilot-route-compare').screenshot({path:path.join(out,'comparison-'+width+(dark?'-dark':'')+'.png')});
    }
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS: empty guidance, distinct result selection, frozen observations, three writing prompts, export, notebook restore, explicit repinning, mobile layout, and light/dark accessibility.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
