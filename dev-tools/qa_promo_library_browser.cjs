'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
// Keep behavior checks independent of font and icon CDN availability.
async function stabilize(context, icons=true) {
 await context.route('https://unpkg.com/**',route=>route.fulfill({contentType:'text/javascript',body:icons?'window.lucide={createIcons:function(){}};':''}));
 await context.route('https://fonts.googleapis.com/**',route=>route.fulfill({contentType:'text/css',body:''}));
 await context.route('https://fonts.gstatic.com/**',route=>route.abort());
}
const output=path.join(root,'scratch/promo-audit-2026-09-04');
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data);});});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext({reducedMotion:'reduce',acceptDownloads:true});
  await stabilize(context);
  const page=await context.newPage();
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  for(const file of ['library.html','features.html','for-districts.html']){
   for(const width of [320,390,1025,1440]){
    await page.setViewportSize({width,height:1000});
    assert((await page.goto(origin+'/'+file,{waitUntil:'load'})).ok());
    await page.evaluate(()=>document.fonts.ready);
    const concealedCards=await page.locator('.reveal.visible .card').evaluateAll(cards=>cards.filter(card=>getComputedStyle(card).opacity!=='1'||getComputedStyle(card).animationName!=='none').length);
    assert.equal(concealedCards,0,'Reduced-motion cards must be visible without staggered animation');
    assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1,file+' overflows at '+width);
    if(file==='library.html'){
     assert.equal(await page.locator('.lesson-card:visible').count(),3);
     for(const category of ['ela','stem','social']){
      const button=page.locator('#filters button[data-category="'+category+'"]');
      await button.focus();await page.keyboard.press('Enter');
      assert.equal(await button.getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('.lesson-card:visible').count(),1);
      assert.equal(await page.locator('.lesson-card:visible').getAttribute('data-category'),category);
      assert.match(await page.locator('#library-results').textContent(),/Showing 1 of 3/);
     }
     await page.locator('#filters button[data-category="all"]').click();
     assert.equal(await page.locator('.lesson-card:visible').count(),3);
     if(width===390||width===1440){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(output,'library-accuracy-'+width+'.png')});}
    }
    if(width===390||width===1440){
     await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
     const violations=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return r.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});
     assert.deepEqual(violations,[],file+' accessibility at '+width);
    }
   }
  }
  await page.goto(origin+'/library.html');
  const links=page.locator('.lesson-card a[download]');
  for(let i=0;i<await links.count();i++){
   const link=links.nth(i);const href=await link.getAttribute('href');
   const downloaded=page.waitForEvent('download');await link.click();const result=await downloaded;
   assert.equal(await result.failure(),null);
   const data=fs.readFileSync(await result.path());
   assert(data.equals(fs.readFileSync(path.resolve(root,href))),'download differs from saved project');
  }
  assert.deepEqual(errors,[],'runtime errors');
  const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});
  await stabilize(noJs);
  const fallback=await noJs.newPage();await fallback.goto(origin+'/library.html');
  assert.equal(await fallback.locator('.lesson-card:visible').count(),3);
  assert.equal(await fallback.locator('.lesson-card a[download]:visible').count(),3);
  assert.equal(await fallback.locator('#filters').isVisible(),false);
  const noIcons=await browser.newContext();await stabilize(noIcons,false);
  const degraded=await noIcons.newPage();await degraded.goto(origin+'/library.html');await degraded.locator('#filters button[data-category="social"]').click();assert.equal(await degraded.locator('.lesson-card:visible').count(),1);
  await context.close();await noJs.close();await noIcons.close();
  console.log('Supporting-page browser QA passed: 3 pages at 4 widths, scoped automated accessibility checks, keyboard filters, actual downloads, no JavaScript, and unavailable icons.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);server.close();process.exitCode=1;});
