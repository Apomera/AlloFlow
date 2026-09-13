'use strict';
// Live React/browser acceptance check for the root-to-leaf plant cutaway.
// Run: node dev-tools/watercycle_pilot_plant_detail_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-sunlight-surface-review');
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
    const patch=()=>page.evaluate(()=>{
      const scene=pilotReview.scene,ring=scene.getObjectByName('pilot-sunlight-boundary'),fill=scene.getObjectByName('pilot-sunlight-fill');
      return {visible:ring.visible,opacity:ring.material.opacity,fillOpacity:fill.material.opacity,
        ring:Array.from(ring.geometry.attributes.position.array),fill:Array.from(fill.geometry.attributes.position.array),zone:document.querySelector('#wcPilotCanvas').dataset.sunlightZone};
    });
    async function checkSurface() {
      const clearance=await page.evaluate(()=>{
        const scene=pilotReview.scene,ocean=scene.getObjectByName('pilot-ocean-surface');scene.updateMatrixWorld(true);
        const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);const offsets=[];
        for(const name of ['pilot-sunlight-boundary','pilot-sunlight-fill']){
          const mesh=scene.getObjectByName(name),p=mesh.geometry.attributes.position;
          for(let i=0;i<p.count;i+=13){
            const point=mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(p,i));
            ray.set(new THREE.Vector3(point.x,20,point.z),down);
            const hit=ray.intersectObject(ocean)[0];if(!hit)throw Error('Sunlight is outside ocean');
            offsets.push({actual:point.y-hit.point.y,expected:mesh.position.y});
          }
        }return offsets;
      });
      assert(clearance.length>50&&clearance.every(p=>Math.abs(p.actual-p.expected)<.002),'Highlight vertices follow the actual rendered ocean triangles');
    }
    await restore();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.sunlightZone==='inside');
    const inside=await patch();await checkSurface();await page.waitForTimeout(500);assert.deepEqual(await patch(),inside,'Paused surface holds');
    await canvas.screenshot({path:path.join(out,'sunlight-inside-follow.jpg'),type:'jpeg',quality:82});
    await page.getByRole('button',{name:'Water view',exact:true}).click();
    await canvas.screenshot({path:path.join(out,'sunlight-inside-water-view.jpg'),type:'jpeg',quality:82});
    const rates=[];
    for(const x of [-150,-190]) {
      await restore(x);
      const state=await patch();assert.equal(state.zone,x===-150?'inside':'outside');
      if(x===-190){assert(state.opacity<inside.opacity&&state.fillOpacity<inside.fillOpacity);await canvas.screenshot({path:path.join(out,'sunlight-outside.jpg'),type:'jpeg',quality:82});}
      const before=await page.evaluate(()=>({...waterReviewData.pilot.snapshot}));
      await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
      await page.waitForFunction(time=>waterReviewData.pilot.snapshot.elapsed>time+1,before.elapsed);
      await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
      const after=await page.evaluate(()=>({...waterReviewData.pilot.snapshot}));
      rates.push((after.energy-before.energy)/(after.elapsed-before.elapsed));
      await checkSurface();
      assert.notDeepEqual((await patch()).ring,state.ring,'Highlight follows moving waves');
    }
    assert(rates[0]>rates[1]&&rates[1]>0,'Evaporation continues outside the highlighted zone at a lower rate');
    assert(Math.abs(rates[1]/rates[0]-.28)<.03,'Rendering preserves the model rate ratio');
    await page.emulateMedia({reducedMotion:'reduce'});
    await restore();await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.ambientCloudMotion==='still');
    const still=await patch();await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>waterReviewData.pilot.snapshot.elapsed>.5);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    assert.deepEqual(await patch(),still,'Reduced motion keeps the highlight on the frozen surface');await checkSurface();
    await restore(-150,40,.999);await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='vapor');
    assert.equal((await patch()).visible,false);assert.equal((await patch()).zone,'hidden');
    await restore();await page.setViewportSize({width:390,height:900});
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').getBoundingClientRect().width>=innerWidth-40);
    await canvas.screenshot({path:path.join(out,'sunlight-mobile.jpg'),type:'jpeg',quality:82});
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await page.evaluate(()=>{
      window.sunlightDisposals={ring:0,fill:0,texture:0};const scene=pilotReview.scene;
      scene.getObjectByName('pilot-sunlight-boundary').geometry.addEventListener('dispose',()=>sunlightDisposals.ring++);
      const fill=scene.getObjectByName('pilot-sunlight-fill');
      fill.geometry.addEventListener('dispose',()=>sunlightDisposals.fill++);fill.material.map.addEventListener('dispose',()=>sunlightDisposals.texture++);
      mountWater({wcMode:'explorer'});
    });assert.deepEqual(await page.evaluate(()=>sunlightDisposals),{ring:1,fill:1,texture:1});assert.deepEqual(errors,[]);
    console.log('PASS: exact ocean-triangle alignment, inside/outside feedback, unchanged evaporation rate ratio, pause and reduced motion, both camera views, vapor visibility, mobile accessibility, geometry/texture cleanup, no browser errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
