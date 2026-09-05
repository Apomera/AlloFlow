'use strict';
// Live React/browser acceptance check for journey challenges.
// Run: node dev-tools/watercycle_pilot_missions_qa.cjs
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = process.cwd();
const out = path.join(ROOT, 'scratch', 'water-mission-review');
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
    await page.waitForSelector('#wcPilotMissions');
    const data=()=>page.evaluate(()=>waterReviewData);
    const open=async()=>{if(!await page.locator('#wcPilotMissions').evaluate(n=>n.open)) await page.locator('#wcPilotMissions>summary').click();};
    await open();
    assert.equal(await page.getByRole('button',{name:/^Start challenge:/}).count(),4);
    await page.getByRole('button',{name:'Start challenge: Below the surface',exact:true}).click();
    assert.equal((await data()).pilot.landingGoal,'permeable');
    assert.equal((await data()).pilot.mission.events.length,0);
    // Prepare a vapor checkpoint before starting the new challenge. This setup
    // grants no condensation event; the live scene must collide with a nucleus.
    await page.evaluate(()=>{
      const K=WaterCyclePilotKernel,env=K.environment('tropicalOcean');
      const checkpoint={...K.initialState('tropicalOcean'),form:'vapor',altitudeM:env.lclM+60,
        x:-150,z:40,yaw:-1.05,pitch:0.26,energy:1,vy:0,surface:'water',cameraMode:'follow'};
      waterReviewSet(prev=>({...prev,waterCycle:{...prev.waterCycle,pilot:{...prev.waterCycle.pilot,
        navigationAssist:true,paused:true,resumeCheckpoint:checkpoint,resumeToken:'mission-vapor-start'}}}));
    });
    await page.waitForFunction(()=>document.querySelector('#wcPilotCanvas').dataset.parcelForm==='vapor');
    await page.waitForFunction(()=>waterReviewData.pilot.mission.status==='interrupted');
    await open();
    await page.getByRole('button',{name:'Start challenge: Condensation detective',exact:true}).click();
    assert.equal((await data()).pilot.mission.events.length,0);
    await page.getByRole('button',{name:'Resume the simulation',exact:true}).click();
    await page.waitForFunction(()=>waterReviewData.pilot.mission.status==='complete',null,{timeout:60000});
    await page.getByRole('button',{name:'Pause the simulation',exact:true}).click();
    await open();
    const record=(await data()).pilot.mission;
    assert.equal(record.events.length,1);assert.equal(record.events[0].from,'vapor');
    assert(record.events[0].nucleus,'Real captured nucleus recorded');
    await page.getByLabel('Explain what caused the changes. Which observation supports your explanation?',{exact:true}).fill('Vapor cooled to saturation and met a nucleus. My recorded transition shows captured nucleus and released energy.');
    const saved=(await data()).pilot.mission;
    const downloadPromise=page.waitForEvent('download');
    await page.getByRole('button',{name:'Download challenge evidence',exact:true}).click();
    const download=await downloadPromise;await download.saveAs(path.join(out,'condensation-evidence.txt'));
    const report=fs.readFileSync(path.join(out,'condensation-evidence.txt'),'utf8');
    assert(report.includes(saved.reflection));assert(report.includes('vapor -> droplet')||report.includes('vapor -> ice'));
    assert(report.includes('simplified teaching representations'));
    assert(report.includes('Nucleus captured: true'));
    await page.evaluate(()=>{
      const notebook=WaterCyclePilotNotebook.capture(waterReviewData,Date.now(),'challenge-test');
      const restored=WaterCyclePilotNotebook.restore(waterReviewData,notebook);
      waterReviewSet(prev=>({...prev,waterCycle:restored}));
    });
    await page.waitForFunction(()=>waterReviewData.pilot.mission.status==='complete');
    assert.equal((await data()).pilot.missionResults.condensation.reflection,saved.reflection);
    await page.locator('.wc-pilot-mission-evidence>summary').click();
    assert((await page.locator('.wc-pilot-mission-evidence').innerText()).includes('Condensation nucleus captured'));
    for(const [width,dark] of [[1280,false],[390,false],[320,false],[1280,true]]) {
      await page.setViewportSize({width,height:900});
      if(dark) {await page.evaluate(seed=>mountWater(seed,true),await data());await open();}
      if(!await page.locator('.wc-pilot-mission-evidence').evaluate(n=>n.open)) await page.locator('.wc-pilot-mission-evidence>summary').click();
      const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('#wcPilotMissions'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
      assert.deepEqual(violations,[],'Mission accessibility including contrast at '+width+' dark '+dark);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow at '+width);
      await page.locator('#wcPilotMissions').screenshot({path:path.join(out,'challenges-'+width+(dark?'-dark':'')+'.png')});
    }
    await page.getByRole('button',{name:'Replay challenge',exact:true}).click();
    assert.equal((await data()).pilot.mission.events.length,0);
    assert.equal((await data()).pilot.mission.status,'active');
    assert.equal((await data()).pilot.missionResults.condensation.reflection,saved.reflection);
    await open();
    await page.getByRole('button',{name:'View saved result: Condensation detective',exact:true}).click();
    assert.equal((await data()).pilot.mission.reflection,saved.reflection);
    assert.equal((await data()).pilot.mission.status,'complete');
    assert.deepEqual(errors,[],'No browser errors');
    console.log('PASS: four challenge choices, landing goal, restore interruption, real condensation completion, reflection, export, replay, saved result, mobile layout, and light/dark axe contrast.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
