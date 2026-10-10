'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(process.env.WC_REPO||process.cwd());
const expectedHash=process.argv[2];
assert.match(expectedHash||'',/^[a-f0-9]{64}$/i,'Usage: node capture.cjs EXPECTED_RUNTIME_SHA256 (run in repo, or set WC_REPO)');
const out=path.join(__dirname,'run-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+expectedHash.slice(0,10));
fs.mkdirSync(out,{recursive:true});
const runtimePaths=['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
function hashes(){return Object.fromEntries(runtimePaths.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));}
const startHashes=hashes();
const result={passed:false,expectedHash,root,startHashes,cases:[],captures:[],layouts:[],keyboard:{},errors:[],failedRequests:[]};
let browser,server,page;
const near=(actual,expected,label,tolerance=1e-7)=>assert(Math.abs(actual-expected)<=tolerance,label+': expected '+expected+', got '+actual);
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function normalized(values){return [clamp(values[0],-35,15),clamp(values[1],-25,25),clamp(values[2],-15,35)];}
function expectedProfile(values){
 const temps=normalized(values),progress=[0,.55,1],crossings=[],touches=[],bands=[];
 for(let i=0;i<2;i++)if(temps[i]*temps[i+1]<0)crossings.push(progress[i]+(progress[i+1]-progress[i])*(-temps[i])/(temps[i+1]-temps[i]));
 if(temps[1]===0&&temps[0]*temps[2]<0)crossings.push(.55);
 for(let i=0;i<3;i++)if(temps[i]===0){
  const inBand=(i>0&&temps[i-1]===0)||(i<2&&temps[i+1]===0);
  if(!inBand&&!(i===1&&temps[0]*temps[2]<0))touches.push(progress[i]);
 }
 for(let i=0;i<2;i++)if(temps[i]===0&&temps[i+1]===0){if(bands.length)bands[0].end=progress[i+1];else bands.push({start:progress[i],end:progress[i+1]});}
 return {temps,crossings:crossings.sort((a,b)=>a-b),touches,bands};
}
const cases=[
 ['near-cloud-end',[-1,25,35]],['near-surface-end',[5,5,-.1]],['two-crossings',[-5,5,-5]],
 ['middle-zero-warming',[-5,0,5]],['middle-zero-cooling',[5,0,-5]],['tangent',[5,0,5]],
 ['cloud-zero',[0,5,5]],['surface-zero',[5,5,0]],['all-zero',[0,0,0]],['zero-band',[0,0,5]],
 ['near-zero',[-.00004,.00004,-.00004]],['near-coincident',[-35,.01,-35]],['warm',[5,8,14]],['cold',[-16,-10,-5]]
];
(async()=>{
 for(const [file,hash] of Object.entries(startHashes))assert.equal(hash,expectedHash,'Candidate hash mismatch: '+file);
 const userBrowserCache=path.join(require('node:os').homedir(),'AppData','Local','ms-playwright');
 if(!process.env.PLAYWRIGHT_BROWSERS_PATH&&fs.existsSync(userBrowserCache))process.env.PLAYWRIGHT_BROWSERS_PATH=userBrowserCache;
 const {chromium}=require(require.resolve('playwright',{paths:[root]}));
 const fixture=fs.readFileSync(path.join(root,'dev-tools/watercycle_storm_immersion_qa.cjs'),'utf8').match(/const html=String.raw`([\s\S]*?)`;/);
 assert(fixture,'Local fixture HTML missing');
 const html=fixture[1].replace('isDark:false,isContrast:false','isDark:!!window.qaDark,isContrast:false');
 server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
  const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');res.end(data);});
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true});
 page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
 page.setDefaultTimeout(30000);
 page.on('pageerror',e=>result.errors.push(String(e)));
 page.on('requestfailed',r=>result.failedRequests.push({url:r.url(),failure:r.failure()}));
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort('blockedbyclient'));
 await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>typeof mountStorm==='function');
 async function mount(values,dark=false){
  await page.evaluate(({values,dark})=>{
   window.qaDark=dark;document.documentElement.classList.toggle('dark',dark);
   mountStorm({wcMode:'precipHunt',precipHunt:{preset:'gentleRain',viewMode:'2d',paused:true,stormAutoPlay:false,tempC:values[0],midLevelTempC:values[1],surfaceTempC:values[2]}});
  },{values,dark});
  await page.locator('.wc-air-profile').waitFor();
 }
 async function inspect(){return page.locator('.wc-air-profile').evaluate(n=>{
  const attrs=e=>Object.fromEntries([...e.attributes].map(a=>[a.name,a.value]));
  return {attrs:attrs(n),text:n.innerText,svg:n.querySelector('svg')?.getAttribute('viewBox'),
   crossings:[...n.querySelectorAll('[data-air-crossing] circle.wc-profile-crossing-point')].map(c=>({attrs:attrs(c),parent:attrs(c.parentElement),cx:+c.getAttribute('cx'),cy:+c.getAttribute('cy')})),
   ariaLabel:n.querySelector('svg')?.getAttribute('aria-label'),
   points:[...n.querySelectorAll('[data-air-point]')].map(c=>({attrs:attrs(c),cx:+c.getAttribute('cx'),cy:+c.getAttribute('cy')})),
   badges:[...n.querySelectorAll('[data-air-badge]')].map(c=>({attrs:attrs(c),bbox:c.getBBox?.().toJSON?.()||null,text:c.textContent})),
   leaders:[...n.querySelectorAll('[class*="leader"]')].map(c=>attrs(c)),
   readouts:[...n.querySelectorAll('[data-air-level]')].map(c=>({attrs:attrs(c),text:c.innerText,value:c.querySelector('dd')?.innerText})),
   touches:[...n.querySelectorAll('[data-air-touch]')].map(c=>attrs(c)),
   zeroBands:[...n.querySelectorAll('[data-air-zero-band]')].map(c=>attrs(c))};
 });}
 function validate(name,values,actual){
  const expected=expectedProfile(values);assert.equal(actual.svg,'0 0 260 208',name+' viewBox');
  assert.equal(Number(actual.attrs['data-air-crossings']),expected.crossings.length,name+' crossing count data');
  assert.equal(Number(actual.attrs['data-air-touches']),expected.touches.length,name+' touch count data');
  assert.equal(actual.crossings.length,expected.crossings.length,name+' crossing dots');
  actual.crossings.forEach((p,i)=>{near(p.cx,143,name+' crossing x');near(p.cy,38+140*expected.crossings[i],name+' crossing y');});
  assert.equal(actual.points.length,3,name+' temperature dots');
  actual.points.forEach((p,i)=>{near(p.cy,38+140*[0,.55,1][i],name+' level y');near(p.cx,58+(expected.temps[i]+35)/70*170,name+' temperature x');});
  assert.equal(actual.touches.length,expected.touches.length,name+' touch symbols');
  actual.touches.forEach((p,i)=>{const move=p.d.match(/^M([\d.e+-]+) ([\d.e+-]+)/);assert(move,name+' touch symbol geometry');near(+move[1],143,name+' touch x');near(+move[2]+5,38+140*expected.touches[i],name+' touch y');});
  assert.equal(actual.zeroBands.length,expected.bands.length,name+' zero bands');
  actual.zeroBands.forEach((p,i)=>{near(+p.y1,38+140*expected.bands[i].start,name+' zero band start');near(+p.y2,38+140*expected.bands[i].end,name+' zero band end');});
  assert.equal(actual.readouts.length,3,name+' readable level values');
  actual.readouts.forEach((p,i)=>{
   assert(p.value&&p.value.includes('°C'),name+' degree readout '+i);
   const number=Number(p.value.replace(/\u2212/g,'-').replace('°C','').trim());
   assert(Number.isFinite(number),name+' numeric readout '+p.value);
   near(number,expected.temps[i],name+' precise readout '+i,Math.max(1e-10,Math.abs(expected.temps[i])*.005));
   if(expected.temps[i]!==0)assert.notEqual(number,0,name+' nonzero remains nonzero');
  });
  assert.equal(actual.badges.length,expected.crossings.length,name+' badges');
  assert.equal(actual.leaders.length,expected.crossings.length,name+' leaders');
  actual.leaders.forEach((p,i)=>{const coords=p.d.match(/^M([\d.e+-]+) ([\d.e+-]+)H230L238 ([\d.e+-]+)/);assert(coords,name+' leader geometry');near(+coords[1],147,name+' leader start x');near(+coords[2],38+140*expected.crossings[i],name+' leader actual crossing y');near(+coords[3],+actual.badges[i].attrs.cy,name+' leader ends at badge y');});
  for(const readout of actual.readouts)assert(actual.ariaLabel.includes(readout.value),name+' accessible precise readout '+readout.value);
  if(actual.badges.length===2){
   const ys=actual.badges.map(b=>Number(b.attrs['data-air-badge-y']??b.attrs.cy??b.attrs.y??(b.attrs.transform?.match(/translate\([^, ]+[, ]+([^ )]+)/)||[])[1]));
   if(ys.every(Number.isFinite))assert(Math.abs(ys[1]-ys[0])>=22-1e-7,name+' badges separated by 22 plot units');
   else throw new Error(name+' cannot determine badge separation: '+JSON.stringify(actual.badges));
  }
  if(name==='all-zero'){
   assert(!/stays? below|entire.*below|all.*below freezing/i.test(actual.text),'All-zero profile falsely described as below freezing');
   assert(/0\s*°C/.test(actual.text),'All-zero profile needs zero-temperature copy');
  }
  return expected;
 }
 async function capture(name,width){
  await page.setViewportSize({width,height:1000});
  const profile=page.locator('.wc-air-profile');await profile.scrollIntoViewIfNeeded();
  const file=name+'.png';await profile.screenshot({path:path.join(out,file)});
  const layout=await profile.evaluate(n=>{
   const bounds=n.getBoundingClientRect(),svg=n.querySelector('svg'),svgBounds=svg.getBoundingClientRect();
   const descendants=[...n.querySelectorAll('*')].filter(e=>e.namespaceURI!=='http://www.w3.org/2000/svg');
   const systemSample=document.createElement('span');systemSample.style.color='CanvasText';document.body.appendChild(systemSample);const canvasText=getComputedStyle(systemSample).color;systemSample.remove();
   return {width:innerWidth,forcedColors:matchMedia('(forced-colors: active)').matches,canvasText,profile:bounds.toJSON(),documentOverflow:document.documentElement.scrollWidth>innerWidth+1,
    overflowingElements:descendants.filter(e=>e.clientWidth>0&&e.scrollWidth>e.clientWidth+1).map(e=>({tag:e.tagName,class:e.className,width:e.clientWidth,scroll:e.scrollWidth})),
    svg:svgBounds.toJSON(),texts:[...svg.querySelectorAll('text')].map(e=>({text:e.textContent,box:e.getBoundingClientRect().toJSON(),font:getComputedStyle(e).fontSize,fill:getComputedStyle(e).fill})),
    readouts:[...n.querySelectorAll('[data-air-level]')].map(e=>({text:e.innerText,box:e.getBoundingClientRect().toJSON()})),
    style:{color:getComputedStyle(n).color,background:getComputedStyle(n).backgroundColor},text:n.innerText};
  });
  assert(!layout.documentOverflow,name+' page overflow');assert.deepEqual(layout.overflowingElements,[],name+' internal text overflow');
  for(const text of layout.texts)assert(text.box.x>=layout.svg.x-1&&text.box.right<=layout.svg.right+1,name+' SVG text outside: '+text.text);
  if(layout.forcedColors)for(const text of layout.texts)assert.equal(text.fill,layout.canvasText,name+' forced-colors label must use CanvasText: '+text.text);
  result.captures.push(file);result.layouts.push({name,...layout});
 }
 for(const [name,values] of cases){
  await mount(values);const actual=await inspect();const expected=validate(name,values,actual);result.cases.push({name,input:values,expected,actual});
  if(['near-cloud-end','near-surface-end','two-crossings','near-coincident','near-zero','all-zero'].includes(name))await capture(name+'-desktop',1280);
  console.log('PASS case '+name);
 }
 await mount([-35,.01,-35]);await capture('close-crossings-phone-390',390);await capture('close-crossings-phone-320',320);
 await mount([-.00004,.00004,-.00004]);await capture('precise-values-phone-320',320);
 await mount([-5,5,-5],true);await capture('two-crossings-dark-phone',390);
 await page.emulateMedia({forcedColors:'active'});await capture('two-crossings-forced-colors-phone',390);
 await page.emulateMedia({forcedColors:'none'});
 await mount([-5,5,-5]);await page.setViewportSize({width:1280,height:1000});
 const inspectButton=page.getByRole('button',{name:'Compare air with particle state',exact:true});
 await inspectButton.focus();await inspectButton.press('Space');
 assert(await page.locator('#wcThermalLayerPanel').evaluate(n=>n.open),'Space opens particle inspector');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'wcThermalLayerSummary','Particle inspector focus');
 result.keyboard.compareButtonSpaceOpensAndFocuses=true;
 await mount([-5,5,-5]);
 const before=await inspect();const slider=page.locator('#wcPrecip-tempC');await slider.focus();await slider.press('ArrowRight');
 await page.waitForFunction(()=>document.querySelector('.wc-air-profile [data-air-level] dd')?.textContent.includes('-4')||document.querySelector('.wc-air-profile [data-air-level] dd')?.textContent.includes('−4'));
 const after=await inspect();validate('native-slider-update',[-4,5,-5],after);
 assert.notEqual(after.crossings[0].cy,before.crossings[0].cy,'Arrow key updates crossing location');
 result.keyboard.nativeSliderArrowUpdatesGraph=true;
 assert.equal(await page.evaluate(()=>typeof THREE),'undefined','QA stays on local 2D fixture');
 assert.deepEqual(result.errors,[],'No browser errors');assert.deepEqual(result.failedRequests,[],'No failed or nonlocal requests');
 result.endHashes=hashes();for(const [file,hash] of Object.entries(result.endHashes))assert.equal(hash,expectedHash,'Source changed during QA: '+file);
 result.passed=true;
 console.log('PASS '+result.cases.length+' cases; '+result.captures.length+' screenshots; keyboard and layout checks');
})().catch(async error=>{
 result.error=String(error.stack||error);console.error(result.error);if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});process.exitCode=1;
}).finally(async()=>{
 try{result.endHashes=hashes();}catch(error){result.hashError=String(error);}
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log('RESULT '+path.join(out,'result.json'));
 if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
});
