'use strict';
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const read=p=>fs.readFileSync(path.join(process.cwd(),p),'utf8');
(async()=>{
 const out=path.join(process.cwd(),'scratch','tectonics-visual-review');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
  page.setDefaultTimeout(90000);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.setContent('<!doctype html><html lang="en"><head><title>Tectonic plate visual review</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
  await page.addStyleTag({content:read('dev-tools/.cache/sweep-tailwind.css')});
  for(const p of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','vendor/three-r128/three.min.js','stem_lab/stem_lab_module.js'])await page.addScriptTag({content:read(p)});
  await page.evaluate(()=>{StemLab.ensureThree=()=>Promise.resolve(THREE);StemLab.loadScriptResilient=()=>new Promise(()=>{});});
  await page.addScriptTag({content:read('stem_lab/stem_tool_platetectonics.js')});
  await page.evaluate(()=>{
   const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
   window.mountTectonics=(dark=false)=>{
    const noop=()=>{};
    function Host(){const [data,setData]=React.useState({plateTectonics:{simTab:'sim',ptDrift:false}});window.tectonicData=data;window.tectonicSet=setData;
     return StemLab._registry.plateTectonics.render({React,toolData:data,setToolData:setData,isDark:dark,isContrast:false,icons:Icons,
      setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:noop,getXP:()=>0,
      beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},gradeLevel:'7th Grade',callGemini:null});}
    document.documentElement.classList.toggle('dark',dark);document.body.style.background=dark?'#0f172a':'#f1f5f9';
    ReactDOM.unmountComponentAtNode(document.getElementById('slot'));ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
   };mountTectonics();
  });
  const assert=require('node:assert/strict');
  const canvas=page.locator('.pt-primary-canvas');
  async function visible(){
   await canvas.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));
   await page.waitForTimeout(250);
  }
  async function capture(name){
   console.log('Capture:',name);
   await visible();
   const data=await canvas.evaluate(n=>n.toDataURL('image/png').split(',')[1]);
   fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data,'base64'));
  }
  async function geometry(){return canvas.evaluate(n=>({width:n.width/2,css:n.clientWidth,current:{...n._ptKb.current()},labels:n._plateLabelRects,counts:{quakes:n._ptLive.d.quakes,collisions:n._ptLive.d.collisions}}));}
  await page.waitForSelector('.pt-primary-canvas');
  await visible();
  await capture('after-desktop');
  await canvas.press('ArrowDown');
  await capture('after-selected');
  assert.equal(await page.locator('[data-pt-plate-key][data-selected="true"]').count(),1);
  const before=await geometry();
  await page.setViewportSize({width:390,height:1000});
  await visible();
  await page.waitForFunction(()=>{const n=document.querySelector('.pt-primary-canvas');return Math.abs(n.width/2-n.clientWidth)<=1});
  const phone=await geometry();
  assert.ok(phone.width<390,'Canvas must fit a phone viewport');
  assert.ok(Math.abs(before.current.x/before.width-phone.current.x/phone.width)<0.002,'Resize must preserve plate position');
  assert.ok(Math.abs(before.current.w/before.width-phone.current.w/phone.width)<0.002,'Resize must preserve plate width');
  assert.deepEqual(phone.counts,before.counts,'Resize must not award an event');
  assert.equal(phone.labels.length,7,'Every plate retains an identification label on phones');
  assert.ok(phone.labels.every(r=>r.x>=0&&r.x+r.w<=phone.width&&r.y>=0&&r.y+r.h<=470),'Labels stay inside the canvas');
  assert.equal(await page.locator('[data-pt-plate-key]').count(),7);
  await capture('after-phone');
  await canvas.press('ArrowDown');
  const unmoved=await geometry();
  await canvas.press('ArrowLeft');
  assert.ok((await geometry()).current.x<unmoved.current.x,'Keyboard movement survives resizing');
  await capture('after-phone-boundary');
  await page.setViewportSize({width:1280,height:1000});
  await visible();
  await canvas.press('ArrowDown');
  await canvas.press('ArrowDown');
  await canvas.press('ArrowDown');
  await canvas.press('ArrowDown');
  await canvas.press('Shift+ArrowLeft');
  await canvas.press('Shift+ArrowLeft');
  await page.waitForTimeout(500);
  await capture('after-collision');
  await page.evaluate(()=>mountTectonics(true));
  await page.waitForSelector('.pt-primary-canvas');
  await capture('after-dark');
  await page.setViewportSize({width:390,height:1000});
  await capture('after-dark-phone');
  await page.evaluate(()=>tectonicSet(prev=>({...prev,plateTectonics:{...prev.plateTectonics,showLabels:false}})));
  assert.equal(await page.locator('[data-pt-plate-key]').count(),0,'The plate key follows label visibility');
  assert.deepEqual(errors,[],'No browser runtime errors');
  console.log('PASS: desktop and phone captures; seven phone labels; plate key selection; resize preserves positions and counters; keyboard movement; collision; dark theme; label toggle.');
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:true,desktop:before.width,phone:phone.width,phoneLabels:phone.labels.length,errors},null,2));
 } finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
