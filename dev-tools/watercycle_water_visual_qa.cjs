'use strict';
// Live React/browser acceptance check for assisted pilot navigation.
// Run: node dev-tools/watercycle_pilot_navigation_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-visual-review');
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
    await page.waitForFunction(()=>window.pilotReview && document.querySelector('#wcPilotCanvas').dataset.parcelForm);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await canvas.focus();
    await page.keyboard.down('w');
    await page.waitForFunction(()=>pilotReview.scene.getObjectByName('pilot-phase-trail').geometry.drawRange.count===120,null,{timeout:60000});
    await page.waitForTimeout(1500);
    const trail=await page.evaluate(()=>{
      const object=pilotReview.scene.getObjectByName('pilot-phase-trail');
      const p=object.geometry.attributes.position.array;
      let max=0;for(let i=3;i<p.length;i+=3)max=Math.max(max,Math.hypot(p[i]-p[i-3],p[i+1]-p[i-2],p[i+2]-p[i-1]));
      return {max,count:object.geometry.drawRange.count,wake:document.querySelector('#wcPilotCanvas').dataset.pilotWake,form:document.querySelector('#wcPilotCanvas').dataset.parcelForm};
    });
    console.log('Filled trail and wake',trail);
    assert(trail.max<20,'Trail stays ordered after circular buffer wraps');
    assert.equal(trail.wake,'surface-motion');
    await canvas.screenshot({path:path.join(out,'water-wake.png')});
    await page.keyboard.up('w');
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    const positions=()=>page.evaluate(()=>Array.from(pilotReview.scene.getObjectByName('pilot-phase-trail').geometry.attributes.position.array));
    const paused=await positions();await page.waitForTimeout(600);assert.deepEqual(await positions(),paused,'Pause freezes trail');
    await page.getByRole('button',{name:'Water view',exact:true}).click();
    await page.waitForFunction(()=>!pilotReview.scene.getObjectByName('pilot-phase-trail').visible);
    await page.waitForTimeout(1500);
    await canvas.screenshot({path:path.join(out,'water-first-person.png')});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>!pilotReview.scene.getObjectByName('pilot-water-wake').visible);
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS ordered full trail, paused stability, first-person trail hiding, reduced-motion wake suppression, live WebGL');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
