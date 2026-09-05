'use strict';
// Browser acceptance check for on-demand recorded change review.
// Run: node dev-tools/watercycle_pilot_recorded_review_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-recorded-review');
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
    const canvas=page.locator('#wcPilotCanvas'),notice=page.locator('.wc-pilot-notice');
    assert.equal(await page.locator('#wcPilotReviewLatest').count(),0,'No fabricated receipt');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>Number(document.querySelector('#wcPilotCanvas').dataset.parcelElapsed)>0);
    // Clearly marked historical evidence fixtures exercise review independently of live flight.
    await page.evaluate(()=>{
      const N=WaterCyclePilotNotebook;
      const old=N.normalizeChange({id:'review-old',sequence:1,scenario:'mountainWinter',from:'vapor',to:'ice',elapsed:20,altitudeM:1500,tempC:-8,rh:100,nucleus:true});
      const latest=N.normalizeChange({id:'review-latest',sequence:2,scenario:'tropicalOcean',from:'liquid',to:'vapor',elapsed:30,altitudeM:1,tempC:25,rh:75,energy:1});
      waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,lastChange:latest,notebookChanges:[old,latest]}}}));
    });
    const before=(await data()).pilot;
    const openTrail=async()=>page.locator('.wc-pilot-notebook-trail').evaluate(n=>{for(let p=n.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
    await openTrail();
    await page.locator('#wcPilotReview-1').click();
    await page.waitForFunction(()=>document.activeElement.id==='wcPilotReviewClose');
    assert.equal(await notice.getAttribute('data-review'),'true');assert.equal(await notice.getAttribute('data-change-id'),'review-old');
    assert((await notice.innerText()).includes('100% RH'));assert((await notice.innerText()).includes('Energy released'));
    assert((await notice.innerText()).includes('change 1'));
    assert.equal((await data()).pilot.snapshot.scenario,'tropicalOcean','Review does not change climate');
    assert.equal((await data()).pilot.snapshot.form,'liquid','Review does not restore the old form');
    assert.equal((await data()).pilot.paused,true);
    assert.deepEqual((await data()).pilot.notebookChanges,before.notebookChanges);
    assert.deepEqual((await data()).pilot.lastChange,before.lastChange);
    const frozen=await canvas.getAttribute('data-parcel-elapsed');
    await page.waitForTimeout(500);assert.equal(await canvas.getAttribute('data-parcel-elapsed'),frozen);
    // Later changes to the trail must not rewrite the observation currently open.
    await page.evaluate(()=>waterReviewSet(prev=>{const pilot=prev.waterCycle.pilot,changes=JSON.parse(JSON.stringify(pilot.notebookChanges));changes[0].rh=42;return {...prev,waterCycle:{...prev.waterCycle,pilot:{...pilot,notebookChanges:changes}}};}));
    assert((await notice.innerText()).includes('100% RH'));assert.equal((await data()).pilot.reviewChange.rh,100);
    await page.locator('#wcPilotReviewClose').click();
    await page.waitForFunction(()=>document.activeElement.id==='wcPilotReview-1');
    assert.equal(await notice.count(),0);assert.equal((await data()).pilot.paused,true);
    await page.locator('#wcPilotReviewLatest').click();
    assert.equal(await notice.getAttribute('data-change-id'),'review-latest');
    assert((await notice.innerText()).includes('Energy absorbed'));
    for(const [width,dark] of [[1280,false],[390,false],[320,false],[1280,true]]) {
      await page.setViewportSize({width,height:1000});
      if(dark) {
        await page.evaluate(seed=>mountWater({...seed,pilot:{...seed.pilot,reviewChange:null}},true),await data());
        await page.locator('#wcPilotReviewLatest').click();
      }
      await page.locator('.wc-pilot-stage').scrollIntoViewIfNeeded();
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-notice'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
      assert.deepEqual(violations,[],'Recorded review accessibility '+width+' dark '+dark);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow '+width);
      for(const id of ['wcPilotReviewClose','wcPilotNoticeContinue']) {
        const button=await page.locator('#'+id).boundingBox(),panel=await notice.boundingBox();
        assert(button.height>=44,'44px action');
        assert(button.y>=panel.y && button.y+button.height<=panel.y+panel.height+1,'Review action visible inside card');
      }
      const reading=await page.locator('.wc-pilot-notice-reading').boundingBox(),actions=await page.locator('.wc-pilot-notice-actions').boundingBox();
      assert(reading.y+reading.height<=actions.y+1,'Actions never cover explanation or evidence');
      await notice.screenshot({path:path.join(out,'recorded-review-'+width+(dark?'-dark':'')+'.png')});
    }
    const elapsed=await canvas.getAttribute('data-parcel-elapsed');
    await page.locator('#wcPilotNoticeContinue').click();
    assert.equal((await data()).pilot.reviewChange,null);assert.equal((await data()).pilot.paused,false);
    await page.waitForFunction(()=>document.activeElement.id==='wcPilotCanvas');
    await page.waitForFunction(value=>Number(document.querySelector('#wcPilotCanvas').dataset.parcelElapsed)>Number(value),elapsed);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    assert.equal(await notice.count(),0,'Ordinary pause cannot reopen old review');
    await page.locator('#wcPilotReviewLatest').click();
    await page.getByRole('button',{name:'Reset this run and start again as liquid water',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('.wc-pilot-notice'));
    assert.equal((await data()).pilot.reviewChange,null,'Reset clears review');
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS: older/current recorded review, original climate and measurements, detached evidence, real pause/resume, close focus return, unchanged history, reset cleanup, 320/390px controls, and light/dark accessibility.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
