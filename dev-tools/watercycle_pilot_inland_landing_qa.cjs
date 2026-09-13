'use strict';
// Live React/browser acceptance check for inland water landing detail.
// Run: node dev-tools/watercycle_pilot_lake_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-inland-landing-review');
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

    const impact=()=>page.evaluate(()=>{
      const g=pilotReview.scene.getObjectByName('pilot-ocean-landing');
      return {visible:g.visible,surface:g.userData.surface,position:g.position.toArray(),rotation:g.rotation.y,
        rings:g.children.filter(o=>o.isMesh).map(o=>({scale:o.scale.toArray(),opacity:o.material.opacity})),
        spray:g.children.find(o=>o.isPoints).visible,
        points:Array.from(g.children.find(o=>o.isPoints).geometry.attributes.position.array)};
    });
    async function land(x,z,scenario='temperateCoast'){
      await restore('rain',scenario,x,z,1);
      assert.equal(await canvas.getAttribute('data-water-landing'),'hidden','Checkpoint does not invent an impact');
      await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');
      await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.waterLanding!=='hidden');
    }
    await land(268,-104);
    let lake=await impact();assert(lake.visible&&lake.surface==='lake'&&lake.spray);
    assert(Math.abs(lake.position[1]-8.74)<.01,'Lake ripple hugs the lake surface');
    assert.equal(await canvas.getAttribute('data-ocean-landing'),'hidden','Inland landing is identified separately');
    await page.waitForTimeout(900);assert.deepEqual(await impact(),lake,'Learning pause holds every ripple and spray position');
    await canvas.screenshot({path:path.join(out,'lake-impact-follow.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'lake-impact-water.jpg'),type:'jpeg',quality:82});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.waterLanding==='static-ripples');
    const still=await impact();assert(!still.spray);await page.waitForTimeout(700);assert.deepEqual(await impact(),still);
    await page.getByRole('button',{name:'Continue journey',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.waterLanding==='hidden');
    assert.equal((await impact()).visible,false);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await land(299,-104);
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.waterLanding==='ripples-and-spray');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.waterLanding==='static-ripples');
    // Inspect the shore from above so an expanding ring crossing land is visible.
    await page.evaluate(()=>{const c=pilotReview.camera;c.position.set(299,65,-104);c.up.set(0,0,-1);c.lookAt(299,8.6,-104);pilotReview.renderer.render(pilotReview.scene,c);});
    await canvas.screenshot({path:path.join(out,'lake-shore-impact.jpg'),type:'jpeg',quality:82});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await land(205,-50);
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.waterLanding==='ripples-and-spray');
    const stream=await impact();assert(stream.visible&&stream.surface==='stream'&&Number.isFinite(stream.rotation));
    assert(stream.position[1]>4.9&&stream.position[1]<5.4,'Stream impact sits above the channel');
    assert(stream.rings[0].scale[0]<stream.rings[0].scale[1],'Stream ripples are narrow across the channel');
    assert(stream.rings[0].scale[0]<lake.rings[0].scale[0]);
    assert(stream.points.every(Number.isFinite));
    await canvas.screenshot({path:path.join(out,'stream-impact-follow.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(500);
    await canvas.screenshot({path:path.join(out,'stream-impact-water.jpg'),type:'jpeg',quality:82});
    await restore('liquid','temperateCoast',205,-50);
    assert.equal((await impact()).visible,false,'Restoring already collected water clears the effect');
    await land(-150,40,'tropicalOcean');
    assert.equal((await impact()).surface,'ocean');assert.equal(await canvas.getAttribute('data-ocean-landing'),'ripples-and-spray');
    await restore('rain','temperateCoast',240,0,1);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm!=='rain');
    assert.equal((await impact()).visible,false,'Landfall cannot create a water ripple');
    await restore('snow','mountainWinter',268,-104,5000);
    assert.equal((await impact()).visible,false,'Restoring snow does not create an impact');
    await page.setViewportSize({width:390,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await page.evaluate(()=>{
      window.landingDisposals={ring:0,mask:0,spray:0};const s=pilotReview.scene;
      const impact=s.getObjectByName('pilot-ocean-landing');
      impact.children[0].geometry.addEventListener('dispose',()=>landingDisposals.ring++);
      impact.children[0].material.pilotStreamChannelTexture.addEventListener('dispose',()=>landingDisposals.mask++);
      impact.children.find(o=>o.isPoints).geometry.addEventListener('dispose',()=>landingDisposals.spray++);
      mountWater({wcMode:'explorer'});
    });
    assert.deepEqual(await page.evaluate(()=>landingDisposals),{ring:1,mask:1,spray:1});assert.deepEqual(errors,[]);
    console.log('PASS: actual lake/stream/ocean impacts, water surface heights, narrow stream rings, both camera views, pause/reduced motion/expiry, checkpoint and land exclusions, mobile accessibility, shared-resource cleanup, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
