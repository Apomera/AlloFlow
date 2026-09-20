'use strict';
// Live React/browser acceptance check for rainfall and ocean landing.
// Run: node dev-tools/watercycle_pilot_rainfall_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-snowfall-depth-review');
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
    await page.waitForFunction(()=>window.pilotReview?.scene.getObjectByName('pilot-rain-field'));
    async function restore(form,altitudeM,land=false){
      await page.evaluate(({form,altitudeM,land})=>{
        const K=WaterCyclePilotKernel;
        const checkpoint={...K.initialState(form==='snow'?'mountainWinter':'tropicalOcean'),form,altitudeM,mass:3,energy:0,
          x:land?240:-150,z:land?0:40,yaw:1.2,pitch:.26,vy:-14,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,navigationAssist:false,pauseAtChanges:true,cameraMode:'follow',noticeChangeId:null,
          resumeCheckpoint:checkpoint,resumeToken:form+'-'+altitudeM+'-'+land+'-'+Date.now()}}}));
      },{form,altitudeM,land});
      await page.waitForFunction(({form,altitudeM})=>{const c=document.querySelector('#wcPilotCanvas');return c.dataset.parcelForm===form&&Math.abs(waterReviewData.pilot.snapshot.altitudeM-altitudeM)<1;},{form,altitudeM});
    }

    const snowfall=()=>page.evaluate(()=>{
      const f=pilotReview.scene.getObjectByName('pilot-snow-field');
      return {visible:f.visible,points:Array.from(f.geometry.attributes.position.array),time:f.material.userData.snowShader?.uniforms.snowVisualTime.value};
    });
    await restore('snow',2200);
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-snow-field').material.userData.snowShader);
    const initial=await snowfall();assert(initial.visible&&initial.points.length===76*3&&initial.points.every(Number.isFinite));
    const variation=await page.evaluate(()=>{
      const f=pilotReview.scene.getObjectByName('pilot-snow-field'),a=f.geometry.attributes.snowVisual;
      return {sizes:new Set(Array.from(a.array).filter((_,i)=>i%3===0)).size,
        directions:[...new Set(Array.from(a.array).filter((_,i)=>i%3===2).map(Math.sign))].sort(),
        capped:f.material.userData.snowShader.vertexShader.includes('min(gl_PointSize * snowVisual.x, 28.0)'),
        faded:f.material.userData.snowShader.vertexShader.includes('smoothstep(2.0, 12.0, -mvPosition.z)')};
    });assert(variation.sizes>=10&&variation.capped&&variation.faded);assert.deepEqual(variation.directions,[-1,1]);
    await page.waitForTimeout(600);assert.deepEqual(await snowfall(),initial,'Pause holds snow positions and rotation');
    await canvas.screenshot({path:path.join(out,'snow-follow.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(400);
    await canvas.screenshot({path:path.join(out,'snow-water-view.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(old=>pilotReview.scene.getObjectByName('pilot-snow-field').material.userData.snowShader.uniforms.snowVisualTime.value>old+.2,initial.time);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    const moving=await snowfall();assert.notDeepEqual(moving.points,initial.points);assert(moving.time>initial.time);
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(300);
    assert.deepEqual(await snowfall(),moving,'Enabling reduced motion retains the existing flake layout');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    const elapsed=await canvas.getAttribute('data-parcel-elapsed');
    await page.waitForFunction(v=>document.querySelector('#wcPilotCanvas').dataset.parcelElapsed!==v,elapsed);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    assert.deepEqual(await snowfall(),moving,'Reduced motion freezes local snow drift and rotation while the kernel continues');
    await page.setViewportSize({width:390,height:900});await canvas.scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').clientWidth>=innerWidth-40);
    await canvas.screenshot({path:path.join(out,'snow-mobile.jpg'),type:'jpeg',quality:82});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await restore('rain',180);assert.equal((await snowfall()).visible,false);
    assert.equal(await canvas.getAttribute('data-precipitation-field'),'rain-streaks');
    await page.evaluate(()=>{
      const f=pilotReview.scene.getObjectByName('pilot-snow-field');window.snowDisposals={geometry:0,material:0,texture:0};
      f.geometry.addEventListener('dispose',()=>snowDisposals.geometry++);
      f.material.addEventListener('dispose',()=>snowDisposals.material++);
      f.material.map.addEventListener('dispose',()=>snowDisposals.texture++);
      mountWater({wcMode:'explorer'});
    });assert.deepEqual(await page.evaluate(()=>snowDisposals),{geometry:1,material:1,texture:1});assert.deepEqual(errors,[]);
    console.log('PASS: varied snow sizes and rotation directions, screen-size cap and near-camera fade, live snowfall, pause and reduced-motion continuity, both camera views, mobile accessibility, rain transition, resource disposal, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
