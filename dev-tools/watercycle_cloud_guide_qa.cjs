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


  const guide=page.locator('.wc-cloud-guide');
  await guide.locator(':scope > summary').click();
  const initial=await page.evaluate(()=>JSON.stringify(WaterCyclePrecipitationKernel.compute(stormData.precipHunt).config));
  const names=['Cumulonimbus','Cumulus','Stratus','Stratocumulus','Nimbostratus','Altostratus','Altocumulus','Cirrus','Cirrostratus','Cirrocumulus'];
  for(const name of names){
   await guide.getByRole('button',{name,exact:true}).click();
   assert.equal(await guide.locator('article h4').textContent(),name);
   assert.equal(await guide.locator('.wc-cloud-guide-grid button[aria-pressed="true"]').count(),1);
  }
  assert.equal(await page.evaluate(()=>JSON.stringify(WaterCyclePrecipitationKernel.compute(stormData.precipHunt).config)),initial,'Guide browsing preserves all weather settings');
  await guide.getByRole('button',{name:'Cumulonimbus',exact:true}).click();
  for(const name of ['Explain','Investigate','Notice']){
   await guide.getByRole('button',{name,exact:true}).click();
   assert.equal(await guide.locator('article').getAttribute('data-learning-depth'),name.toLowerCase());
  }
  await guide.getByRole('button',{name:'Explore a thunderstorm scenario',exact:true}).click();
  assert.equal(await page.evaluate(()=>stormData.precipHunt.preset),'summerStorm');
  await page.addScriptTag({url:url+'desktop/web-app/node_modules/axe-core/axe.min.js'});
  for(const [width,dark] of [[1440,false],[390,false],[390,true]]){
   await page.setViewportSize({width,height:1100});
   await page.evaluate(dark=>document.documentElement.classList.toggle('dark',dark),dark);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow');
   const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.wc-cloud-guide'),{rules:{region:{enabled:false}}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.html)})));
   assert.deepEqual(violations,[],'Cloud guide accessibility');
   await guide.screenshot({path:path.join(out,'cloud-guide-'+width+(dark?'-dark':'')+'.png')});
  }
  await guide.getByRole('button',{name:'Cirrus',exact:true}).focus();await page.keyboard.press('Enter');
  assert.equal(await guide.locator('article h4').textContent(),'Cirrus');
  assert.deepEqual(errors,[]);
  console.log('PASS all 10 types, learning depths, weather preservation, scenario action, keyboard, desktop/mobile/dark accessibility');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
