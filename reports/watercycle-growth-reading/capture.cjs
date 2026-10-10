'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=process.env.WC_REPO||process.cwd();
const {chromium}=require(require.resolve('playwright',{paths:[root]}));
(async()=>{
 const html=fs.readFileSync(path.join(root,'dev-tools/watercycle_storm_immersion_qa.cjs'),'utf8').match(/const html=String.raw`([\s\S]*?)`;/)[1];
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(data);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));const captures=[],layouts=[];
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>typeof mountStorm==='function');
  await page.evaluate(()=>mountStorm({wcMode:'precipHunt',precipHunt:{preset:'gentleRain',viewMode:'2d',paused:true,tempC:5}}));
  async function capture(name,width){
   await page.setViewportSize({width,height:900});
   const guide=page.locator('.wc-cloud-growth-reading');await guide.waitFor();
   await guide.evaluate(n=>n.scrollIntoView({block:'center',behavior:'instant'}));
   const box=await guide.boundingBox();
   await page.screenshot({path:path.join(__dirname,name+'.png'),clip:box});
   const layout=await guide.evaluate(n=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,guide:n.getBoundingClientRect().toJSON(),cards:[...n.querySelectorAll('li')].map(c=>({box:c.getBoundingClientRect().toJSON(),overflow:c.scrollWidth>c.clientWidth+1})),text:n.innerText}));
   assert.equal(layout.overflow,false);assert(layout.cards.every(c=>!c.overflow));captures.push(name+'.png');layouts.push(layout);
  }
  await capture('warm-desktop',1280);
  await capture('warm-phone',390);
  await page.locator('#wcPrecip-tempC').evaluate(n=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'-16');n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForSelector('[data-growth-process="deposition"]');
  await capture('cold-desktop',1280);
  await capture('cold-small-phone',320);
  await page.evaluate(()=>document.documentElement.classList.add('dark'));
  await capture('cold-dark-phone',390);
  await page.locator('.wc-precip-science-details summary').press('Space');
  assert(await page.locator('.wc-precip-science-details').evaluate(n=>n.open));
  await page.locator('.wc-precip-science-details summary').press('Space');
  assert.equal(await page.locator('.wc-precip-science-details').evaluate(n=>n.open),false);
  await page.emulateMedia({forcedColors:'active'});await capture('cold-forced-colors',390);
  await page.emulateMedia({forcedColors:'none'});
  await page.getByRole('button',{name:'View this setup in 3D cloud chamber',exact:true}).press('Space');
  await page.waitForSelector('#wcPrecip3dCanvas[data-weather-transition="paused"]',{timeout:60000});
  assert.match(await page.locator('.wc-storm-live-weather').textContent(),/weather paused/);
  assert.deepEqual(errors,[]);
  const sha256=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'stem_lab/stem_tool_watercycle.js'))).digest('hex');
  fs.writeFileSync(path.join(__dirname,'visual-results.json'),JSON.stringify({passed:true,sourceSha256:sha256,captures,layouts,errors,captionKeyboardToggle:true,paused3dInitialization:true},null,2));
  console.log('PASS '+captures.length+' captures; no overflow; caption keyboard toggle works');
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
