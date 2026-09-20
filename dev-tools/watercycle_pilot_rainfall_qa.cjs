'use strict';
// Live React/browser acceptance check for rainfall and ocean landing.
// Run: node dev-tools/watercycle_pilot_rainfall_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-rainfall-review');
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
        const checkpoint={...K.initialState('tropicalOcean'),form,altitudeM,mass:3,energy:0,
          x:land?240:-150,z:land?0:40,yaw:1.2,pitch:.26,vy:-14,cameraMode:'follow'};
        waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
          paused:true,showMolecules:false,navigationAssist:false,pauseAtChanges:true,cameraMode:'follow',noticeChangeId:null,
          resumeCheckpoint:checkpoint,resumeToken:form+'-'+altitudeM+'-'+land+'-'+Date.now()}}}));
      },{form,altitudeM,land});
      await page.waitForFunction(({form,altitudeM})=>{const c=document.querySelector('#wcPilotCanvas');return c.dataset.parcelForm===form&&Math.abs(waterReviewData.pilot.snapshot.altitudeM-altitudeM)<1;},{form,altitudeM});
    }
    const rain=()=>page.evaluate(()=>{
      const r=pilotReview.scene.getObjectByName('pilot-rain-field');return {visible:r.visible,position:r.position.toArray(),points:Array.from(r.geometry.attributes.position.array),alpha:Array.from(r.geometry.attributes.rainAlpha.array)};
    });
    await restore('rain',180);
    const field=await rain();assert(field.visible&&field.points.length===84*12&&field.points.every(Number.isFinite));
    assert(field.alpha.some(a=>a===0)&&field.alpha.some(a=>a>.8),'Subsurface rain is hidden while visible streaks retain bright heads');
    for(let i=0;i<field.points.length;i+=12){
      if(field.alpha[i/3+3]===0)continue;
      assert(field.points[i+1]>=field.points[i+10],'Tail stays above head');
      assert(field.points[i]<=field.points[i+9],'Wind slants falling rain downwind');
    }

    const contactCheck=await page.evaluate(()=>{
      const scene=pilotReview.scene,r=scene.getObjectByName('pilot-rain-field'),ocean=scene.getObjectByName('pilot-ocean-surface');scene.updateMatrixWorld(true);
      const a=r.geometry.attributes.position,alpha=r.geometry.attributes.rainAlpha,ray=new THREE.Raycaster(),p=new THREE.Vector3(),down=new THREE.Vector3(0,-1,0);let min=Infinity,contacts=0,visible=0;
      for(let i=0;i<a.count;i++){if(alpha.getX(i)===0)continue;p.fromBufferAttribute(a,i).applyMatrix4(r.matrixWorld);ray.set(new THREE.Vector3(p.x,500,p.z),down);const hit=ray.intersectObject(ocean)[0];if(!hit)throw Error('Missing ocean beneath rain');const gap=p.y-hit.point.y;min=Math.min(min,gap);visible++;if(i%4===3&&Math.abs(gap-.03)<.002)contacts++;}
      return {min,contacts,visible};
    });assert(contactCheck.min>=.029&&contactCheck.contacts>0&&contactCheck.visible>20,JSON.stringify(contactCheck));
    await page.waitForTimeout(900);assert.deepEqual(await rain(),field,'Pause freezes rainfall');
    await canvas.screenshot({path:path.join(out,'rain-follow.jpg'),type:'jpeg',quality:85});
    await page.getByRole('button',{name:'Water view',exact:true}).click();await page.waitForTimeout(700);
    await canvas.screenshot({path:path.join(out,'rain-water-view.jpg'),type:'jpeg',quality:85});
    await restore('rain',1);
    assert.equal(await canvas.getAttribute('data-ocean-landing'),'hidden');
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='liquid');
    await page.waitForSelector('.wc-pilot-notice');
    assert.equal(await canvas.getAttribute('data-ocean-landing'),'ripples-and-spray');
    assert.equal((await rain()).visible,false);
    const impact=()=>page.evaluate(()=>{
      const g=pilotReview.scene.getObjectByName('pilot-ocean-landing');return {visible:g.visible,position:g.position.toArray(),rings:g.children.filter(o=>o.isMesh).map(o=>({scale:o.scale.toArray(),opacity:o.material.opacity})),spray:g.children.find(o=>o.isPoints).visible,points:Array.from(g.children.find(o=>o.isPoints).geometry.attributes.position.array)};
    });
    const frozen=await impact();assert(frozen.visible&&frozen.spray&&frozen.rings.length===3&&frozen.points.every(Number.isFinite));
    const elapsed=await canvas.getAttribute('data-parcel-elapsed');
    await page.waitForTimeout(2100);assert.deepEqual(await impact(),frozen,'Learning pause holds the landing effect');
    assert.equal(await canvas.getAttribute('data-parcel-elapsed'),elapsed);
    await canvas.screenshot({path:path.join(out,'landing-paused.jpg'),type:'jpeg',quality:85});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.oceanLanding==='static-ripples');
    const reduced=await impact();assert.equal(reduced.spray,false);await page.waitForTimeout(700);assert.deepEqual(await impact(),reduced);
    await canvas.screenshot({path:path.join(out,'landing-reduced.jpg'),type:'jpeg',quality:85});
    await page.getByRole('button',{name:'Continue journey',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.oceanLanding==='hidden',null,{timeout:30000});
    await restore('snow',5000);
    assert.equal((await rain()).visible,false);assert.equal(await canvas.getAttribute('data-ocean-landing'),'hidden');
    await restore('rain',1,true);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm!=='rain');
    assert.equal(await canvas.getAttribute('data-ocean-landing'),'hidden','Landfall does not create ocean ripples');
    await page.setViewportSize({width:390,height:900});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-pilot-notice'),{rules:{region:{enabled:false}}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
    await page.evaluate(()=>{
      window.rainfallDisposals={ring:0,rain:0};const s=pilotReview.scene;
      s.getObjectByName('pilot-ocean-landing').children[0].geometry.addEventListener('dispose',()=>rainfallDisposals.ring++);
      s.getObjectByName('pilot-rain-field').geometry.addEventListener('dispose',()=>rainfallDisposals.rain++);
      mountWater({wcMode:'explorer'});
    });
    assert.deepEqual(await page.evaluate(()=>rainfallDisposals),{ring:1,rain:1});assert.deepEqual(errors,[]);
    console.log('PASS: wind-slanted fading rain, sea clipping, paused rain, both camera views, actual ocean landing, held/reduced/expiring ripples, snow and land exclusions, mobile accessibility, resource disposal, no WebGL errors.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
