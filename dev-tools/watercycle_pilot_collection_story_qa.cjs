'use strict';
// Live React/browser acceptance check for inland water landing detail.
// Run: node dev-tools/watercycle_pilot_collection_story_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-collection-story-review');
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
      await page.waitForFunction(altitudeM=>Math.abs(waterReviewData.pilot.snapshot.altitudeM-altitudeM)<.01,altitudeM);
      await page.waitForTimeout(250);
    }



    const notice=page.locator('.wc-pilot-notice');
    const story=page.locator('.wc-pilot-collection-story');
    for(const [x,z,body,label] of [[268,-104,'lake','Lake storage'],[205,-50,'stream','Stream flow'],[-150,40,'ocean','Ocean storage']]){
      await restore('rain','temperateCoast',x,z,1);
      assert.equal(await story.count(),0,'Restoring rain cannot invent a collection story');
      await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');
      await story.waitFor();assert.equal(await story.getAttribute('data-water-body'),body);
      assert.equal(await story.locator('strong').innerText(),label);
      assert((await story.innerText()).includes('Already liquid as rain. Still liquid after collection.'));
      assert((await page.locator('#wcPilotNoticeCause').innerText()).toLowerCase().includes(body));
      assert((await notice.locator('.wc-pilot-notice-evidence').innerText()).includes(body[0].toUpperCase()+body.slice(1)+' · surface pathway'));
      assert((await notice.innerText()).includes('No phase change - no latent heat transfer in this step'));
      assert.equal(await page.evaluate(()=>document.activeElement.id),'wcPilotNoticeContinue');
      const saved=await page.evaluate(()=>{
        const N=WaterCyclePilotNotebook,record=N.capture(waterReviewData,Date.now(),'manual');
        let raw='';const storage={getItem:()=>raw,setItem:(_key,value)=>{raw=value;},removeItem:()=>{raw='';}};
        N.write(record,storage);const read=N.read(storage);
        const change=read.evidence.lastChange;
        if(change.landingSurface==='lake')window.savedLakeCollection=change;
        return {body:change.landingSurface,trail:read.evidence.notebookChanges?.map(c=>c.landingSurface),change};
      });assert.equal(saved.body,body,'Recorded location survives storage round trip');
      await canvas.screenshot({path:path.join(out,body+'-collection.jpg'),type:'jpeg',quality:82});
      const elapsed=await canvas.getAttribute('data-parcel-elapsed');await page.waitForTimeout(500);
      assert.equal(await canvas.getAttribute('data-parcel-elapsed'),elapsed,'The learning pause stays paused');
    }
    // Review an earlier lake collection while the current parcel is over a stream.
    await restore('liquid','temperateCoast',205,-50);
    const beforeReview=await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-water-parcel').position.toArray());
    await page.evaluate(()=>waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,paused:true,reviewChange:savedLakeCollection}}})));
    await page.waitForFunction(()=>document.querySelector('.wc-pilot-notice')?.dataset.review==='true');
    assert.equal(await story.getAttribute('data-water-body'),'lake','Historical review uses the recorded landing, not the current water body');
    assert.deepEqual(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-water-parcel').position.toArray()),beforeReview);
    await canvas.screenshot({path:path.join(out,'recorded-lake-over-stream.jpg'),type:'jpeg',quality:82});
    await page.evaluate(()=>{
      const legacy={...savedLakeCollection};delete legacy.landingSurface;
      waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,reviewChange:legacy}}}));
    });await page.waitForFunction(()=>!document.querySelector('.wc-pilot-collection-story'));
    assert((await notice.innerText()).includes('Open water · surface pathway'),'Older records retain their generic evidence');
    assert.deepEqual(await page.evaluate(()=>{
      const N=WaterCyclePilotNotebook;
      return [N.normalizeChange({...savedLakeCollection,landingSurface:'invented'}).landingSurface,
        N.normalizeChange({...savedLakeCollection,surface:'permeable',landingSurface:'lake'}).landingSurface];
    }),['',''],'Invalid or contradictory location details are discarded');
    await page.evaluate(()=>waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
      reviewChange:{...savedLakeCollection,from:'snow'}}}})));
    await page.waitForTimeout(300);assert.equal(await story.count(),0,'Snow collection never claims the parcel was already liquid');
    await page.evaluate(()=>waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,reviewChange:savedLakeCollection}}})));
    await story.waitFor();
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(400);
    await page.setViewportSize({width:390,height:900});await page.waitForTimeout(400);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const geometry=await page.evaluate(()=>{
      const n=document.querySelector('.wc-pilot-notice'),b=document.querySelector('#wcPilotNoticeContinue');
      const nr=n.getBoundingClientRect(),br=b.getBoundingClientRect();
      return {inside:br.bottom<=nr.bottom+1&&br.top>=nr.top-1,overflow:n.scrollWidth>n.clientWidth+1};
    });assert(geometry.inside&&!geometry.overflow,'Continue remains inside the mobile notice');
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await notice.screenshot({path:path.join(out,'mobile-collection.jpg'),type:'jpeg',quality:85});
    await page.emulateMedia({forcedColors:'active'});await notice.screenshot({path:path.join(out,'forced-colors-collection.jpg'),type:'jpeg',quality:85});
    await page.getByRole('button',{name:'Continue journey',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('.wc-pilot-notice'));
    assert.deepEqual(errors,[]);
    console.log('PASS: actual lake/stream/ocean collection stories, liquid-state explanation, recorded location storage and review, legacy/invalid/snow handling, paused learning, focus and Continue, mobile/forced colors/reduced motion, accessibility, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
