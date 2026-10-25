// Focused real-browser regression. Run with an optional module path and receipt name.
// Uses shipped CSS and production React; all authored runtime files remain untouched.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const esbuild=require('esbuild');
const {chromium}=require('playwright');
const ROOT=process.cwd();
const modulePath=path.resolve(process.argv[2]||'games_module.js');
const reportPath=path.resolve(process.argv[3]||'tmp/concept-sort-illustrated-paragraphs/qa.json');
fs.mkdirSync(path.dirname(reportPath),{recursive:true});
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const moduleBytes=fs.readFileSync(modulePath);
const report={status:'running',modulePath:path.relative(ROOT,modulePath).replaceAll('\\','/'),moduleSha256:sha(moduleBytes),startedAt:new Date().toISOString(),layouts:[],errors:[],screenshots:[]};
const fixtureImage='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const longText='Record 1. Message: "I propose a lamp because some reading positions lack light." Reply: "Would your lamp add light at one position or every position?" Clarification: "One position. Its placement still needs checking."';
const fixture={categories:[{id:'reply',label:'Reply recorded'},{id:'plan',label:'Plan recorded'}],items:[
  {id:'long-image',content:longText,categoryId:'reply',image:fixtureImage,imageAlt:'A neutral lamp context cue.'},
  {id:'short-image',content:'Task lamp',categoryId:'plan',image:fixtureImage,imageAlt:'A neutral lamp context cue.'},
  {id:'long-text',content:'Record 2. '+longText,categoryId:'reply'},
  {id:'short-text',content:'Book basket',categoryId:'plan'}
]};
async function main(){
 let browser,server;
 try{
  const cssFile=fs.readdirSync(path.join(ROOT,'app/static/css')).find(f=>/^main\..*\.css$/.test(f));
  const css=fs.readFileSync(path.join(ROOT,'app/static/css',cssFile));
  report.css={file:'app/static/css/'+cssFile,sha256:sha(css)};
  const runtime=esbuild.buildSync({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';import * as icons from 'lucide-react';window.React=React;window.createRoot=createRoot;window.AlloIcons=icons;window.AlloLanguageContext=React.createContext({t:k=>k});window.fisherYatesShuffle=a=>a.slice();",resolveDir:path.join(ROOT,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
  const assets={'/runtime.js':runtime,'/games.js':moduleBytes,'/styles.css':css};
  server=http.createServer((req,res)=>{if(assets[req.url]){res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css':'application/javascript');res.end(assets[req.url]);}else if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><div id="root"></div><script src="/runtime.js"></script><script src="/games.js"></script></body></html>');}else{res.writeHead(404);res.end();}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:320,height:568},reducedMotion:'reduce'});
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(fixture=>{
   const floatingTools=document.createElement('button');floatingTools.id='test-student-tools';floatingTools.textContent='Student tools';
   floatingTools.style.cssText='position:fixed;z-index:180;right:12px;bottom:14px;width:152px;height:48px;background:indigo;color:white;border-radius:16px;';
   floatingTools.setAttribute('aria-label','Open student tools');document.body.appendChild(floatingTools);
   window.testRoot=createRoot(document.getElementById('root'));
   window.testFixture=fixture;
   function App({scale}){const[open,setOpen]=React.useState(true);return open?React.createElement(AlloModules.ConceptSortGame,{data:testFixture,onClose(){setOpen(false)},playSound(){},onScoreUpdate(){},onGameComplete(){},allowAddItems:false,imageScale:scale,onImageScaleChange(){}}):null;}
   let mountNumber=0;
   window.renderTest=(scale)=>testRoot.render(React.createElement(App,{key:++mountNumber,scale}));
   renderTest(0.5);
  },fixture);
  await page.waitForSelector('[data-concept-sort-item-id="long-image"]');
  for(const viewport of [{width:320,height:568},{width:390,height:844},{width:1280,height:900}]){
   await page.setViewportSize(viewport);
   for(const scale of [0.5,2.5]){
    await page.evaluate(scale=>renderTest(scale),scale);
    await page.waitForFunction(scale=>document.querySelector('[data-concept-sort-item-id="long-image"] img')?.style.height===Math.round(64*scale)+'px',scale);
    const metrics=await page.evaluate(()=>{
     const read=id=>{
      const card=document.querySelector('[data-concept-sort-item-id="'+id+'"]'),p=card.querySelector('p'),b=card.querySelector('button'),img=card.querySelector('img');
      const box=e=>e?{left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}:null;
      return{id,text:p.textContent,width:card.parentElement.getBoundingClientRect().width,paragraph:box(p),button:box(b),image:box(img),card:box(card),font:getComputedStyle(p).fontSize,align:getComputedStyle(p).textAlign,textOverflow:p.scrollWidth>p.clientWidth};
     };
     const pill=document.getElementById('test-student-tools'),pillBox=pill.getBoundingClientRect(),dialog=document.querySelector('[data-help-key="concept_sort_game"]');
     const points=[[pillBox.left+8,pillBox.top+8],[pillBox.left+pillBox.width/2,pillBox.top+pillBox.height/2],[pillBox.right-8,pillBox.bottom-8]];
     return{viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,modalLayer:getComputedStyle(dialog).zIndex,toolsLayer:getComputedStyle(pill).zIndex,overlayPointsCoveredByDialog:points.every(([x,y])=>dialog.contains(document.elementFromPoint(x,y))),cards:['long-image','short-image','long-text','short-text'].map(read)};
    });
    report.layouts.push({viewport,scale,...metrics});
    const long=metrics.cards.find(x=>x.id==='long-image'),short=metrics.cards.find(x=>x.id==='short-image'),text=metrics.cards.find(x=>x.id==='long-text');
    assert(long.width>=Math.min(280,viewport.width-48)-1,'Long illustrated deck card must use available reading width');
    assert.equal(long.text,longText);assert.equal(long.font,'14px');assert.equal(long.align,'start');
    assert(!long.textOverflow,'Long illustrated paragraph cannot overflow its own width');
    assert(long.button.top>=long.paragraph.bottom-1,'Read-aloud control must follow the complete long paragraph');
    assert.equal(short.width,160);assert.equal(short.font,'12px');assert.equal(short.align,'center');
    assert(short.button.top<short.paragraph.bottom,'Short label keeps its compact inline read-aloud control');
    assert.equal(text.font,'14px');assert.equal(text.align,'start');assert.equal(text.width,long.width);
    assert(metrics.documentWidth<=viewport.width,'Page must not overflow horizontally');
    assert(metrics.overlayPointsCoveredByDialog,'Nonmodal Student tools cannot cover the open modal');
    for(const card of metrics.cards){if(card.image)assert(card.image.left>=card.card.left&&card.image.right<=card.card.right,'Image must fit its card even at maximum scale');}
    await page.locator('[data-concept-sort-item-id="long-image"]').scrollIntoViewIfNeeded();
    const end=await page.locator('[data-concept-sort-item-id="long-image"] p').evaluate(p=>{
      const row=document.getElementById('concept-sort-deck-cards'),range=document.createRange(),text=p.firstChild;
      range.setStart(text,Math.max(0,text.length-22));range.setEnd(text,text.length);
      const initial=range.getBoundingClientRect(),viewport=row.getBoundingClientRect();
      row.scrollTop+=initial.bottom-viewport.bottom+24;
      const last=range.getBoundingClientRect(),visible=row.getBoundingClientRect();
      return{top:last.top,bottom:last.bottom,visibleTop:visible.top,visibleBottom:Math.min(visible.bottom,innerHeight),scrollTop:row.scrollTop,scrollHeight:row.scrollHeight};
    });
    assert(end.top>=end.visibleTop-1&&end.bottom<=end.visibleBottom+1,'The complete paragraph ending must be reachable in the deck scroll');
    report.layouts.at(-1).paragraphEnd=end;
    const screenshot='paragraphs-'+viewport.width+'-'+scale+'.png';await page.screenshot({path:path.join(path.dirname(reportPath),screenshot)});report.screenshots.push(screenshot);
    const collapse=page.locator('[aria-controls="concept-sort-deck-cards"]');
    await collapse.click();assert.equal(await page.locator('#concept-sort-deck-cards').evaluate(el=>getComputedStyle(el).display),'none');
    await collapse.click();assert.notEqual(await page.locator('#concept-sort-deck-cards').evaluate(el=>getComputedStyle(el).display),'none');
    const movedCard=page.locator('[data-concept-sort-item-id="long-image"]');await movedCard.focus();await movedCard.press('Enter');
    await page.locator('[data-move-here]').first().click();
    assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-concept-sort-item-id')),'long-image','Keyboard placement keeps focus on the moved card');
    await movedCard.press('Escape');await page.waitForSelector('[data-help-key="concept_sort_game"]',{state:'detached'});
    assert.equal(await page.locator('#test-student-tools').evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===el;}),true,'Closing restores the ordinary tools layer');
    await page.evaluate(scale=>renderTest(scale),scale);await page.waitForSelector('[data-help-key="concept_sort_game"]');
    await page.locator('[data-help-key="concept_sort_game"] > div:nth-child(2) button').last().click();
    await page.waitForSelector('[data-help-key="concept_sort_game"]',{state:'detached'});
    report.layouts.at(-1).keyboardMoveFocusEscapeAndClosePassed=true;
   }
  }
  assert.deepEqual(report.errors,[]);report.status='passed';report.finishedAt=new Date().toISOString();
 }catch(error){report.status='failed';report.failure=error.stack;process.exitCode=1;}
 finally{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,moduleSha256:report.moduleSha256,layouts:report.layouts.length,report:path.relative(ROOT,reportPath),failure:report.failure},null,2));}
}
main();
