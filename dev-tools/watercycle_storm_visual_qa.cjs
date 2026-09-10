'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports','storm-lab-visuals');fs.mkdirSync(out,{recursive:true});
const base=fs.readFileSync('dev-tools/watercycle_storm_immersion_qa.cjs','utf8');
let html=base.match(/const html=String.raw`([\s\S]*?)`;/)[1];
html=html.replace('<meta charset="utf-8">','<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">').replace('window.mountStorm=function(seed){','window.mountStorm=function(seed,dark=false){').replace('isDark:false,isContrast:false','isDark:dark,isContrast:false');
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(html);}const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root+path.sep)||!['/stem_lab/','/desktop/web-app/node_modules/react/umd/','/desktop/web-app/node_modules/react-dom/umd/','/desktop/web-app/node_modules/axe-core/','/dev-tools/.cache/'].some(p=>url.pathname.startsWith(p))){res.writeHead(403);return res.end();}fs.readFile(file,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'});res.end(err?'Not found':data);});});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port+'/';if(process.argv.includes('--serve')){console.log(url);return;}
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],checks=[];
 page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(30000);
 const check=t=>{checks.push(t);console.log('PASS '+t);};
 async function mount(preset,dark=false,extra={}){await page.evaluate(({preset,dark,extra})=>{const p=WaterCyclePrecipitationKernel.presets[preset];if(!p)throw Error('Unknown preset '+preset);mountStorm({wcMode:'precipHunt',precipHunt:{...p,preset,viewMode:'2d',paused:true,showStormAnatomy:false,...extra}},dark);},{preset,dark,extra});await page.waitForSelector('#wcPrecipCanvas');await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
 try{
  await page.goto(url);await page.waitForSelector('#wcPrecipCanvas');await page.addScriptTag({url:url+'desktop/web-app/node_modules/axe-core/axe.min.js'});
  const presets=await page.evaluate(()=>Object.keys(WaterCyclePrecipitationKernel.presets));console.log('Presets: '+presets.join(', '));
  if(process.argv.includes('--before')){await mount('summerStorm');await page.locator('#wcPrecipCanvas').screenshot({path:path.join(out,'before-summer.png')});return;}
  for(const preset of presets){await mount(preset);const result=await page.evaluate(()=>({model:WaterCyclePrecipitationKernel.compute(stormData.precipHunt).visualType,dataset:document.getElementById('wcPrecipCanvas').dataset.precipitationType}));
   assert.equal(result.dataset,result.model);const first=await page.locator('#wcPrecipCanvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(150);assert.equal(await page.locator('#wcPrecipCanvas').evaluate(c=>c.toDataURL()),first);
   await page.locator('#wcPrecipCanvas').screenshot({path:path.join(out,preset+'.png')});
  }check('All presets render their model precipitation type and remain still when paused');
  for(const dark of [false,true]){await mount('summerStorm',dark,{showStormAnatomy:true});const violations=await page.evaluate(async()=> (await axe.run('.wc-precip-lab',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));fs.writeFileSync(path.join(out,dark?'axe-dark.json':'axe-light.json'),JSON.stringify(violations,null,2));assert.deepEqual(violations,[]);await page.locator('#wcPrecipCanvas').screenshot({path:path.join(out,dark?'anatomy-dark.png':'anatomy-light.png')});}
  check('Light and dark anatomy views pass accessibility checks');
  await page.emulateMedia({reducedMotion:'reduce'});await mount('mountainSnow',true,{paused:false});const still=await page.locator('#wcPrecipCanvas').evaluate(c=>c.toDataURL());await page.waitForTimeout(200);assert.equal(await page.locator('#wcPrecipCanvas').evaluate(c=>c.toDataURL()),still);check('Reduced motion keeps the rendered chamber stable');
  for(const width of [390,320]){await page.setViewportSize({width,height:900});await mount('summerStorm');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:path.join(out,'mobile-'+width+'.png'),fullPage:true});}check('Phone layouts retain scene and controls without horizontal overflow');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,presets,errors},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
