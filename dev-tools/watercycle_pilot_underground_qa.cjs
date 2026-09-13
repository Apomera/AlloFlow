'use strict';
// Live React/browser acceptance check for soil and groundwater cutaways.
// Run: node dev-tools/watercycle_pilot_underground_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-underground-review');
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
    await page.waitForFunction(()=>window.pilotReview?.scene.getObjectByName('pilot-soil-layers'));
    async function restore(form,progress=.45){
      await page.evaluate(({form,progress})=>{
        const K=WaterCyclePilotKernel,checkpoint={...K.initialState('temperateCoast'),form,pathwayProgress:progress,
          x:200,z:0,yaw:-1.05,pitch:.4,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,scenario:'temperateCoast',navigationAssist:false,cameraMode:'follow',pauseAtChanges:true,
          resumeCheckpoint:checkpoint,resumeToken:form+'-'+progress+'-'+Date.now()}}}));
      },{form,progress});
      await page.waitForFunction(form=>document.querySelector('#wcPilotCanvas').dataset.parcelForm===form,form);
    }
    const flow=name=>page.evaluate(name=>Array.from(pilotReview.scene.getObjectByName(name).geometry.attributes.position.array),name);
    for(const [form,name] of [['soil','pilot-infiltration-flow'],['groundwater','pilot-groundwater-flow']]){
      await restore(form);const positions=await flow(name),time=await canvas.getAttribute('data-parcel-elapsed');
      await page.waitForTimeout(800);assert.deepEqual(await flow(name),positions);assert.equal(await canvas.getAttribute('data-parcel-elapsed'),time);
      assert(positions.every(Number.isFinite));
      await canvas.hover();await page.mouse.wheel(0,-350);await page.waitForTimeout(800);
      await canvas.screenshot({path:path.join(out,form+'-follow.jpg'),type:'jpeg',quality:85});
      await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(700);
      await canvas.screenshot({path:path.join(out,form+'-water-view.jpg'),type:'jpeg',quality:85});
    }
    await restore('soil');
    const geology=await page.evaluate(()=>{
      const scene=pilotReview.scene,layers=scene.getObjectByName('pilot-soil-layers');
      return {layers:layers.children.filter(c=>c.isMesh&&!c.isInstancedMesh).length,
        soil:scene.getObjectByName('pilot-soil-grains').count,aquifer:scene.getObjectByName('pilot-aquifer-grains').count,
        finite:['pilot-soil-grains','pilot-aquifer-grains'].every(n=>Array.from(scene.getObjectByName(n).instanceMatrix.array).every(Number.isFinite)),
        table:scene.getObjectByName('pilot-soil-water-table').position.y};
    });
    assert.deepEqual(geology,{layers:4,soil:66,aquifer:96,finite:true,table:-10.6});
    await page.evaluate(()=>{document.querySelector('#wcPilotCanvas')._wcPilotInput.lookYaw=.8;});
    await page.waitForFunction(()=>Math.abs(pilotReview.scene.getObjectByName('pilot-soil-layers').rotation.y-Number(document.querySelector('#wcPilotCanvas').dataset.pilotHeading))<.001);
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(600);
    const still=await flow('pilot-infiltration-flow');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>waterReviewData.pilot.snapshot.pathwayProgress>.46);
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    assert.deepEqual(await flow('pilot-infiltration-flow'),still,'Reduced motion keeps flow tracers static while pathway progresses');
    await restore('soil',.999);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='groundwater');
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-soil-cutaway').visible),false);
    assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-groundwater-cutaway').visible),true);
    await page.setViewportSize({width:390,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-notice'),{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await restore('rain');assert.equal(await page.evaluate(()=>pilotReview.scene.getObjectByName('pilot-groundwater-cutaway').visible),false);
    await page.evaluate(()=>{
      window.geologyDisposals={geometry:0,texture:0};const grains=pilotReview.scene.getObjectByName('pilot-soil-grains');
      grains.geometry.addEventListener('dispose',()=>geologyDisposals.geometry++);
      grains.material.map.addEventListener('dispose',()=>geologyDisposals.texture++);
      mountWater({wcMode:'explorer'});
    });
    assert.deepEqual(await page.evaluate(()=>geologyDisposals),{geometry:1,texture:1});assert.deepEqual(errors,[]);
    console.log('PASS: soil layers and finite instanced grains, paused flow, both camera views, camera-facing cutaway, reduced motion, actual soil-to-groundwater transition, phase visibility, mobile accessibility, shared resource disposal, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
