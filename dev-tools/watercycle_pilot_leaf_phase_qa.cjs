'use strict';
// Live React/browser acceptance check for the root-to-leaf plant cutaway.
// Run: node dev-tools/watercycle_pilot_plant_detail_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-leaf-phase-review');
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
    async function restore(form,progress=.45,energy=0){
      await page.evaluate(({form,progress,energy})=>{
        const K=WaterCyclePilotKernel,checkpoint={...K.initialState('temperateCoast'),form,energy,altitudeM:form==='transpiring'?30:0,pathwayProgress:progress,
          x:200,z:0,yaw:-1.05,pitch:.4,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,scenario:'temperateCoast',navigationAssist:false,cameraMode:'follow',pauseAtChanges:true,
          resumeCheckpoint:checkpoint,resumeToken:form+'-'+progress+'-'+Date.now()}}}));
      },{form,progress,energy});
      await page.waitForFunction(({form,progress,energy})=>document.querySelector('#wcPilotCanvas').dataset.parcelForm===form && Math.abs(waterReviewData.pilot.snapshot.pathwayProgress-progress)<.001 && Math.abs(waterReviewData.pilot.snapshot.energy-energy)<.001,{form,progress,energy});
      await page.waitForTimeout(600);
    }


    const presentation=()=>page.evaluate(()=>({
      liquid:pilotReview.scene.getObjectByName('pilot-liquid-parcel').visible,
      shell:pilotReview.scene.getObjectByName('pilot-vapor-shell').visible,
      marker:pilotReview.scene.getObjectByName('pilot-vapor-marker').visible,
      molecules:document.querySelector('#wcPilotCanvas').dataset.molecularArrangement
    }));
    if(!process.argv.includes('--mobile-only')) {
    for(const energy of [0,.6,.99]) {
      await restore('transpiring',0,energy);
      const p=await presentation();assert(p.liquid&&!p.shell&&!p.marker);assert(p.molecules.startsWith('liquid'));
      const guide=page.locator('.wc-pilot-leaf-energy');assert.equal(await guide.count(),1);
      assert((await guide.innerText()).includes('Still liquid'));
      assert.equal(await guide.getByRole('progressbar').getAttribute('aria-valuenow'),String(Math.round(energy*100)));
      assert.equal(await guide.locator('svg').getAttribute('aria-hidden'),'true');
      const width=await guide.getByRole('progressbar').locator('i').evaluate(el=>el.style.width);
      await page.waitForTimeout(400);assert.equal(await guide.getByRole('progressbar').locator('i').evaluate(el=>el.style.width),width);
      if(energy===.6) {
        assert(await page.evaluate(()=>document.querySelector('.wc-pilot-leaf-energy').getBoundingClientRect().bottom<document.querySelector('.wc-pilot-pad').getBoundingClientRect().top),'Desktop guide clears the flight controls');
        assert((await page.locator('.wc-pilot-hud-right').innerText()).includes('Leaf water absorbs energy'));

        await canvas.screenshot({path:path.join(out,'leaf-liquid-follow.jpg'),type:'jpeg',quality:82});
        await page.getByRole('button',{name:'Water view',exact:true}).click();
        await canvas.screenshot({path:path.join(out,'leaf-liquid-water-view.jpg'),type:'jpeg',quality:82});
      }
    }
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='vapor');
    const vapor=await presentation();assert(!vapor.liquid&&vapor.shell&&vapor.marker);assert(vapor.molecules.startsWith('gas'));
    assert.equal(await page.locator('.wc-pilot-leaf-energy').count(),0);
    assert((await page.locator('.wc-pilot-notice').innerText()).includes('Energy absorbed by water'));
    await canvas.screenshot({path:path.join(out,'leaf-vapor-release.jpg'),type:'jpeg',quality:82});
    await restore('plant',.999);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='transpiring');
    assert((await presentation()).liquid);assert.equal(await page.locator('.wc-pilot-leaf-energy').count(),0,'The new card does not overlap the learning notice');
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await restore('transpiring',0,.6);
    await page.setViewportSize({width:390,height:900});
    for(const forcedColors of ['none','active']) {
      await page.emulateMedia({forcedColors});await page.waitForTimeout(400);
      await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').getBoundingClientRect().width>=innerWidth-40);
      await canvas.screenshot({path:path.join(out,'leaf-mobile-'+forcedColors+'-layout.jpg'),type:'jpeg',quality:82});
      assert(await page.evaluate(()=>{
        const guide=document.querySelector('.wc-pilot-leaf-energy').getBoundingClientRect();
        const controls=document.querySelector('.wc-pilot-pad').getBoundingClientRect();
        return guide.left>=0&&guide.right<=innerWidth+1&&guide.bottom<=controls.top;
      }),'The leaf card fits above mobile controls');
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotCanvas').parentElement,{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));assert.deepEqual(violations,[]);
      await canvas.screenshot({path:path.join(out,'leaf-mobile-'+forcedColors+'.jpg'),type:'jpeg',quality:82});
    }
    await page.emulateMedia({forcedColors:'none'});
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='vapor');
    assert((await presentation()).marker);assert(!(await presentation()).liquid);
    assert((await page.locator('.wc-pilot-notice').innerText()).includes('Evaporation threshold reached'));
    assert(!(await page.locator('.wc-pilot-notice').innerText()).includes('Energy threshold · 0%'));
    await canvas.screenshot({path:path.join(out,'leaf-final-release.jpg'),type:'jpeg',quality:82});
    assert.deepEqual(errors,[]);
    console.log(process.argv.includes('--mobile-only') ? 'PASS: mobile leaf guide spacing, normal and forced colors accessibility, reduced-motion vapor transition, no browser errors.' : 'PASS: liquid leaf parcel at zero/partial/near-threshold energy, matching molecule phase, paused progress, real vapor and xylem transitions, both cameras, notice separation, reduced motion, mobile normal/forced-colors accessibility, no browser errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
