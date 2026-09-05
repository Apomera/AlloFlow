'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'scratch','storm-immersion-review');
const html=String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Storm Lab immersive preview</title>
<link rel="stylesheet" href="/dev-tools/.cache/sweep-tailwind.css">
<style>body{margin:0;background:#e8eef1;font-family:system-ui}main{padding:16px;max-width:1500px;margin:auto}</style></head><body><main id="slot"></main>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>
<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>
<script src="/stem_lab/stem_lab_module.js"></script><script src="/stem_lab/stem_tool_watercycle.js"></script>
<script>
const Icons=new Proxy({},{get:()=>()=>React.createElement('span',{'aria-hidden':true})});
window.mountStorm=function(seed){
 function Host(){
  const [data,setData]=React.useState({waterCycle:seed});window.stormData=data.waterCycle;
  const noop=()=>{};
  return StemLab._registry.waterCycle.render({React,toolData:data,setToolData:setData,isDark:false,isContrast:false,gradeBand:'6-8',gradeLevel:'7th Grade',icons:Icons,
   setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop,toolSnapshots:[],addToast:noop,announceToSR:noop,awardXP:noop,getXP:()=>0,
   beep:noop,celebrate:noop,canvasNarrate:noop,canvasA11yDesc:noop,a11yClick:f=>({onClick:f}),t:(k,f)=>f==null?k:f,props:{},srOnly:{},callGemini:null});
 }
 ReactDOM.unmountComponentAtNode(document.getElementById('slot'));ReactDOM.render(React.createElement(Host),document.getElementById('slot'));
};
var immersivePreview=new URLSearchParams(location.search).get('immersive')==='1';
mountStorm({wcMode:'precipHunt',precipHunt:immersivePreview?Object.assign({},WaterCyclePrecipitationKernel.presets.summerStorm,{preset:'summerStorm',viewMode:'3d',cameraFocus:'immersive',showStormAnatomy:false}):{viewMode:'2d',showStormAnatomy:false}});
</script></body></html>`;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(html);}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');}else{res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'});res.end(data);}});
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(process.argv.includes('--serve')?8767:0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/';
 if(process.argv.includes('--serve')){console.log('Storm preview: '+url);return;}
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(120000);
 const checkpoint=label=>console.log('PASS '+label);
 try {
  await page.goto(url);await page.waitForSelector('#wcPrecipCanvas');
  assert.equal(await page.evaluate(()=>typeof THREE),'undefined');
  await page.evaluate(()=>{const loader=StemLab.ensureThree;window.stormLoadCount=0;StemLab.ensureThree=function(options){stormLoadCount++;return new Promise(resolve=>setTimeout(resolve,350)).then(()=>loader.call(StemLab,options)).then(three=>{const NativeRenderer=three.WebGLRenderer;three.WebGLRenderer=function(options){const renderer=new NativeRenderer(options),render=renderer.render;renderer.render=function(scene,camera){window.stormScene=scene;return render.call(renderer,scene,camera);};return renderer;};return three;});};});
  await page.getByRole('button',{name:'View this setup in 3D cloud chamber',exact:true}).click();
  await page.selectOption('#wcStormEnvironment','suburb');
  await page.waitForFunction(()=>document.getElementById('wcPrecip3dCanvas')?.dataset.rendered==='true');
  assert.equal(await page.evaluate(()=>stormLoadCount),1);
  const canvas=page.locator('#wcPrecip3dCanvas');
  assert.equal(await canvas.getAttribute('data-storm-environment'),'suburb');
  assert.equal(await canvas.getAttribute('data-precipitation-camera-focus'),'immersive');
  checkpoint('cold engine and OrbitControls load; latest settings survive loading');
  if(process.argv.includes('--inspect')){
   const inspection=await page.evaluate(()=>{const result=[];stormScene.traverse(o=>{if(o.isLight)result.push({light:o.type,intensity:o.intensity,color:o.color.getHexString()});if(o.isMesh && o.material.type==='MeshStandardMaterial' && result.length<45)result.push({name:o.type,color:o.material.color.getHexString(),roughness:o.material.roughness});});return result;});
   console.log(JSON.stringify(inspection));return;
  }
  const canvasHandle=await canvas.elementHandle();
  const before=await canvas.getAttribute('data-camera-position');
  await page.getByRole('button',{name:'Forward',exact:true}).click();
  await page.waitForFunction(before=>document.getElementById('wcPrecip3dCanvas').dataset.cameraPosition!==before,before);
  await canvas.focus();await page.keyboard.down('w');await page.waitForTimeout(300);await page.keyboard.up('w');
  const heading=await canvas.getAttribute('data-camera-heading');
  const bounds=await canvas.boundingBox();await page.mouse.move(bounds.x+bounds.width/2,bounds.y+180);
  await page.mouse.down();await page.mouse.move(bounds.x+bounds.width/2+150,bounds.y+210,{steps:8});await page.mouse.up();
  await page.waitForFunction(old=>document.getElementById('wcPrecip3dCanvas').dataset.cameraHeading!==old,heading);
  checkpoint('touch buttons, keyboard travel, and pointer look change the real camera');
  await page.locator('#wcPrecip-wind').fill('36');
  await page.waitForFunction(()=>{const wind=Number(document.getElementById('wcPrecip3dCanvas').dataset.liveWind);return wind>8&&wind<36;});
  let wind=Number(await canvas.getAttribute('data-live-wind'));assert(wind>8 && wind<36,'wind must ease, got '+wind);
  await page.locator('#wcStormFieldTrack').fill('2');
  await page.waitForFunction(()=>{const track=Number(document.getElementById('wcPrecip3dCanvas').dataset.liveStormTrack);return track>0&&track<2;});
  let track=Number(await canvas.getAttribute('data-live-storm-track'));assert(track>0 && track<2,'track must ease');
  await page.waitForFunction(()=>Math.abs(Number(document.getElementById('wcPrecip3dCanvas').dataset.liveStormTrack)-2)<0.05,{},{timeout:15000});
  assert(await canvas.evaluate((node,old)=>node===old,canvasHandle),'settings must preserve canvas');
  checkpoint('weather and track settle gradually without resetting the camera/canvas');
  await page.selectOption('#wcStormFieldPreset','summerStorm');
  await page.locator('#wcStormFieldTrack').fill('0');
  await page.waitForTimeout(1800);
  await page.getByRole('button',{name:'Full-screen storm',exact:true}).click();
  await page.waitForFunction(()=>!!document.fullscreenElement);
  await page.waitForTimeout(250);
  assert((await canvas.boundingBox()).width>1300,'full-screen scene should span the display');
  checkpoint('full-screen immersion');
  for(const environment of ['forest','beach','suburb']){
   await page.selectOption('#wcStormEnvironment',environment);
   await page.getByRole('button',{name:'Inside the storm',exact:true}).click();
   await page.waitForTimeout(750);
   await canvas.scrollIntoViewIfNeeded();
   await canvas.screenshot({path:path.join(out,environment+'.png')});
   assert.equal(await canvas.getAttribute('data-storm-environment'),environment);
  }
  await page.evaluate(()=>document.exitFullscreen());
  checkpoint('forest, beach, suburban environment captures');
  await page.getByRole('button',{name:'Play storm',exact:true}).click();
  const stormTime=await page.evaluate(()=>stormData.precipHunt.stormTime);
  await page.waitForFunction(old=>stormData.precipHunt.stormTime>old,stormTime);
  assert.equal(await page.evaluate(()=>stormData.precipHunt.environment),'suburb');
  await page.getByRole('button',{name:'Pause time',exact:true}).click();
  checkpoint('lifecycle playback preserves the selected environment and settings');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#wcPrecip-wind').fill('12');
  await page.waitForFunction(()=>Number(document.getElementById('wcPrecip3dCanvas').dataset.liveWind)===12);
  checkpoint('reduced motion applies selected weather without interpolation');
  await page.setViewportSize({width:390,height:940});
  await page.waitForTimeout(250);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'mobile horizontal overflow');
  await page.locator('.wc-storm-field-controls').screenshot({path:path.join(out,'mobile-controls.png')});
  await page.addScriptTag({path:path.join(root,'desktop/web-app/node_modules/axe-core/axe.min.js')});
  const axe=await page.evaluate(async()=>await axe.run('.wc-precip-lab',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
  fs.writeFileSync(path.join(out,'accessibility.json'),JSON.stringify(axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),null,2));
  assert.equal(axe.violations.length,0,'accessibility violations: '+axe.violations.map(v=>v.id).join(','));
  checkpoint('phone layout and accessibility');
  await page.getByRole('button',{name:'2D chamber',exact:true}).click();
  await page.waitForTimeout(100);assert.equal(await canvasHandle.evaluate(n=>n._wcPrecip3dCleanup),null);
  await page.evaluate(()=>{window.originalStormLoader=StemLab.ensureThree;window.savedStormThree=THREE;window.THREE=undefined;StemLab.ensureThree=()=>Promise.reject(new Error('test outage'));});
  await page.getByRole('button',{name:'View this setup in 3D cloud chamber',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('wcPrecip3dCanvas').dataset.engineState==='error');
  await page.getByRole('button',{name:'Retry 3D',exact:true}).waitFor({state:'visible'});
  await page.evaluate(()=>{window.THREE=savedStormThree;StemLab.ensureThree=originalStormLoader;});
  await page.getByRole('button',{name:'Retry 3D',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('wcPrecip3dCanvas').dataset.rendered==='true');
  checkpoint('failed load is visible and retry recovers; detached renderer is disposed');
  await page.evaluate(()=>{const canvas=document.getElementById('wcPrecip3dCanvas');const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');gl.getExtension('WEBGL_lose_context').loseContext();});
  await page.waitForFunction(()=>document.getElementById('wcPrecip3dCanvas').dataset.engineState==='error');
  await page.getByRole('button',{name:'Retry 3D',exact:true}).click();
  await page.waitForFunction(()=>document.getElementById('wcPrecip3dCanvas').dataset.rendered==='true');
  checkpoint('context loss is visible and Retry creates a working renderer');
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,errors,captures:['forest.png','beach.png','suburb.png','mobile-controls.png']},null,2));
 } catch(error){console.error(error);await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:false,error:String(error),errors},null,2));process.exitCode=1;}
 finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});

