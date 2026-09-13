'use strict';
// Live React/browser acceptance check for inland water landing detail.
// Run: node dev-tools/watercycle_pilot_approach_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-approach-review');
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


    const parcelY=()=>page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-water-parcel').position.y);
    const unit=await page.evaluate(()=>WaterCyclePilotKernel.UNIT_M);
    let lastY=Infinity;
    for(const altitude of [1600,600,120,20,1,.1]) {
      await restore('rain','temperateCoast',268,-104,altitude);
      const y=await parcelY();assert(y<lastY,'The rain parcel descends continuously toward the lake');lastY=y;
      assert(y>11.8,'The enlarged parcel stays above the lake until contact');
      if(altitude/unit>=80)assert.equal(y,altitude/unit,'The offset does not affect high-altitude rendering');
    }
    assert(Math.abs(lastY-11.8)<.02,'The final approach meets the collected-water display height');
    await restore('rain','temperateCoast',268,-104,20);
    await canvas.screenshot({path:path.join(out,'lake-rain-approach-follow.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(400);
    await canvas.screenshot({path:path.join(out,'lake-rain-approach-water.jpg'),type:'jpeg',quality:82});
    const rain=()=>page.evaluate(()=>{
      const r=pilotReview.scene.getObjectByName('pilot-rain-field');
      return {position:r.position.toArray(),points:Array.from(r.geometry.attributes.position.array),alpha:Array.from(r.geometry.attributes.rainAlpha.array)};
    });
    const field=await rain();let visibleLakeStreaks=0,clippedLakeStreaks=0;
    for(let i=0;i<field.points.length;i+=12) {
      const x=field.points[i+9]+field.position[0],z=field.points[i+11]+field.position[2];
      if(Math.hypot(x-268,z+104)>=32||field.alpha[i/3+3]===0)continue;
      visibleLakeStreaks++;
      const y=field.points[i+10]+field.position[1];assert(y>=8.5999,'Rain cannot continue below the lake');
      if(Math.abs(y-8.6)<.001)clippedLakeStreaks++;
    }
    assert(visibleLakeStreaks>0&&clippedLakeStreaks>0,'The fixture observes actual visible lake clipping');
    await page.waitForTimeout(500);assert.deepEqual(await rain(),field,'Pause freezes the corrected rain field');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.ambientCloudMotion==='still');
    const still=await rain();await page.waitForTimeout(500);assert.deepEqual(await rain(),still);
    await page.emulateMedia({reducedMotion:'no-preference'});
    // Capture the actual render boundary, rather than only checking restored states.
    await restore('rain','temperateCoast',268,-104,1);
    await page.evaluate(()=>{
      window.approachFrames=[];const renderer=pilotReview.renderer,render=renderer.render.bind(renderer);
      renderer.render=function(scene,camera){
        const c=document.querySelector('#wcPilotCanvas');
        if(approachFrames.length<400)approachFrames.push({form:c.dataset.parcelForm,y:scene.getObjectByName('pilot-water-parcel').position.y});
        return render(scene,camera);
      };
    });
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');
    const frames=await page.evaluate(()=>approachFrames);
    const contact=frames.findIndex(f=>f.form==='liquid');assert(contact>0);
    assert(Math.abs(frames[contact].y-frames[contact-1].y)<.1,'Actual collection has no jump from below the waterline');
    assert.equal(await canvas.getAttribute('data-water-landing-surface'),'lake');
    await canvas.screenshot({path:path.join(out,'lake-collection.jpg'),type:'jpeg',quality:82});
    // Use the steepest inland stream segment, away from the lake. Quarter points
    // must follow its slope rather than jumping between nearest sample heights.
    const slope=await page.evaluate(()=>{
      const path=pilotReview.scene.getObjectByName('pilot-stream-water').geometry.parameters.path;
      let best=null;
      for(let i=0;i<52;i++){
        const a=path.getPointAt(i/52),b=path.getPointAt((i+1)/52);
        if(Math.hypot(a.x-268,a.z+104)<40)continue;
        if(!best||Math.abs(a.y-b.y)>best.drop)best={a:a.toArray(),b:b.toArray(),drop:Math.abs(a.y-b.y)};
      }return best;
    });
    assert(slope.drop>.1);
    const heights=[];
    for(const fraction of [.25,.49,.51,.75]){
      const x=slope.a[0]+fraction*(slope.b[0]-slope.a[0]),z=slope.a[2]+fraction*(slope.b[2]-slope.a[2]);
      await restore('liquid','temperateCoast',x,z);
      const y=await parcelY();heights.push(y);
      const expected=slope.a[1]+fraction*(slope.b[1]-slope.a[1])+.33+3.2;
      assert(Math.abs(y-expected)<.01,'Collected stream water follows its segment slope');
    }
    assert(Math.abs(heights[2]-heights[1])<slope.drop*.03,'Crossing the sample midpoint does not step vertically');
    await restore('rain','temperateCoast',205,-50,.1);const streamRainY=await parcelY();
    assert.equal(await page.evaluate(()=>waterReviewData.pilot.lastCycle),null,'Restoring rain clears the previous cycle-complete banner');
    await canvas.screenshot({path:path.join(out,'stream-rain-approach.jpg'),type:'jpeg',quality:82});
    await restore('liquid','temperateCoast',205,-50);assert(Math.abs(await parcelY()-streamRainY)<.02);
    await restore('rain','temperateCoast',240,0,20);assert.equal(await parcelY(),20/unit,'Terrestrial approach retains existing rendering');
    await restore('rain','tropicalOcean',-150,40,.1);assert(Math.abs(await parcelY()-3.2)<.02,'Ocean approach also matches its collection height');
    await page.setViewportSize({width:390,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    assert.deepEqual(errors,[]);
    console.log('PASS: continuous lake/ocean/stream rain approach, unchanged high-altitude and terrestrial rendering, actual collection boundary, inland rain clipping, pause/reduced motion, interpolated stream slope, both camera views, mobile accessibility, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
