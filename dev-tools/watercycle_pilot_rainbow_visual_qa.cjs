'use strict';
// Live React/browser acceptance check for rainbow visual refinement.
// Run: node dev-tools/watercycle_pilot_rainbow_visual_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-rainbow-review');
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
    async function restore(form,yaw=-1.05){
      await page.evaluate(({form,yaw})=>{
        const K=WaterCyclePilotKernel,env=K.environment('tropicalOcean');
        const checkpoint={...K.initialState('tropicalOcean'),form,altitudeM:600,mass:3,energy:0,
          x:-150,z:40,yaw,pitch:.26,vy:-7,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,cameraMode:'follow',resumeCheckpoint:checkpoint,resumeToken:form+'-'+yaw+'-'+Date.now()}}}));
      },{form,yaw});
      await page.waitForFunction(form=>document.querySelector('#wcPilotCanvas').dataset.parcelForm===form,form);
    }
    await restore('rain');
    await page.waitForSelector('.wc-pilot-rainbow-visual[data-double=true]');
    const overlay=page.locator('.wc-pilot-rainbow-visual'),stage=page.locator('.wc-pilot-stage');
    const handle=await canvas.elementHandle(),time=await canvas.getAttribute('data-parcel-elapsed');
    assert.equal(await overlay.getAttribute('data-annotations'),'false');
    assert.equal(await page.locator('.wc-pilot-rainbow-label').first().isVisible(),false);
    const bows=await page.evaluate(()=>{
      const paths=q=>Array.from(document.querySelectorAll(q)).map(p=>({color:p.getAttribute('stroke'),width:Number(p.getAttribute('stroke-width')),opacity:Number(p.style.opacity)}));
      return {primary:paths('.wc-pilot-rainbow-primary path'),secondary:paths('.wc-pilot-rainbow-secondary path'),
        animations:document.querySelector('.wc-pilot-rainbow-visual').getAnimations({subtree:true}).length,
        blend:getComputedStyle(document.querySelector('.wc-pilot-rainbow-svg')).mixBlendMode};
    });
    assert.equal(bows.primary.length,7);assert.equal(bows.secondary.length,7);
    assert.deepEqual(bows.secondary.map(p=>p.color),bows.primary.map(p=>p.color).reverse());
    assert(bows.secondary.every((p,i)=>p.opacity<bows.primary[i].opacity));assert(bows.primary.every(p=>p.width===4.2));
    assert.equal(bows.animations,0);assert.equal(bows.blend,'normal');
    await stage.screenshot({path:path.join(out,'rainbow-natural.jpg'),type:'jpeg',quality:85});
    const evidence=await page.evaluate(()=>JSON.stringify(waterReviewData.pilot.rainbowEvidence));
    await page.getByRole('button',{name:'More HUD',exact:true}).click();
    assert.equal(await overlay.getAttribute('data-annotations'),'true');
    assert(await page.locator('.wc-pilot-rainbow-label').first().isVisible());
    assert(await canvas.evaluate((c,old)=>c===old,handle));assert.equal(await canvas.getAttribute('data-parcel-elapsed'),time);
    assert.equal(await page.evaluate(()=>JSON.stringify(waterReviewData.pilot.rainbowEvidence)),evidence);
    await stage.screenshot({path:path.join(out,'rainbow-annotated.jpg'),type:'jpeg',quality:85});
    await page.getByRole('button',{name:'Less HUD',exact:true}).click();
    await page.getByRole('button',{name:'Water view',exact:true}).click();
    await stage.screenshot({path:path.join(out,'rainbow-water-view.jpg'),type:'jpeg',quality:85});
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await overlay.evaluate(e=>e.getAnimations({subtree:true}).length),0);
    await page.setViewportSize({width:390,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-rainbow-challenge'),{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await stage.screenshot({path:path.join(out,'rainbow-phone.jpg'),type:'jpeg',quality:85});
    await restore('rain',1.2);await page.waitForFunction(()=>!document.querySelector('.wc-pilot-rainbow-visual'));
    await restore('snow');assert.equal(await overlay.count(),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: softer/reversed/fainter bows, optional labels via More HUD, paused time and canvas preserved, evidence preserved, static overlay, both cameras, phone accessibility, alignment and snow visibility gates, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
