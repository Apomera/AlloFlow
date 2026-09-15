const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const {pathToFileURL}=require('url');
const {chromium}=require('playwright');
const dir=path.resolve('reports/mcp-calibration-2026-09-12');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const context=await browser.newContext({viewport:{width:1000,height:1000}});
  await context.route('**/*',r=>/^(file:|data:)/.test(r.request().url())?r.continue():r.abort());
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const historical=path.join(dir,'continuation-replayed-candidate.html');
  async function snapshot(file,removeReplace){
   await page.goto(pathToFileURL(file).href);
   return page.evaluate(removeReplace=>{
    const body=document.body.cloneNode(true);
    body.querySelectorAll('figure[data-img-idx][data-crop] button[onclick*="__pdfCropImage"]').forEach(b=>b.remove());
    if(removeReplace)body.querySelectorAll('figure[data-img-idx] label').forEach(label=>{if(label.querySelector('input[type=file]'))label.remove();});
    return {text:body.textContent.replace(/\s+/g,' ').trim(),links:Array.from(body.querySelectorAll('a[href]'),a=>({href:a.getAttribute('href'),text:a.textContent})),images:Array.from(body.querySelectorAll('img'),img=>({src:img.getAttribute('src'),alt:img.alt}))};
   },removeReplace);
  }
  const expectedMcp=await snapshot(historical,false),expectedBrowser=await snapshot(historical,true);
  const outputs=[];
  for(const variant of [{name:'mcp',file:'static-crop-replayed-candidate.html',expected:expectedMcp,replace:true},{name:'browser',file:'static-browser-export-candidate.html',expected:expectedBrowser,replace:false}]){
   const input=path.join(dir,variant.file);
   const actual=await snapshot(input,false);
   assert.deepEqual(actual,variant.expected,'Source content must be unchanged after removal of unsupported renderer controls');
   const states=[];
   for(const width of [320,390,1000]){
    await page.setViewportSize({width,height:1000});
    await page.goto(pathToFileURL(input).href);
    const facts=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cropButtons:Array.from(document.querySelectorAll('button')).filter(b=>/adjust crop/i.test(b.textContent)).length,fileInputs:document.querySelectorAll('input[type=file]').length,scripts:document.scripts.length,images:document.images.length,ghostPlaceholders:document.querySelectorAll('[id^="pdf-img-ph-"][id$="-container"]').length}));
    assert.equal(facts.width,facts.scrollWidth);assert.equal(facts.cropButtons,0);assert.equal(facts.fileInputs,variant.replace?1:0);assert.equal(facts.scripts,0);assert.equal(facts.images,1);assert.equal(facts.ghostPlaceholders,0);
    if(variant.replace){
     let reached=false;for(let n=0;n<15;n++){await page.keyboard.press('Tab');if(await page.evaluate(()=>document.activeElement.matches('input[type=file]'))){reached=true;break;}}
     assert(reached);facts.keyboardFileInputReached=true;
     facts.focus=await page.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e);return{visible:e.matches(':focus-visible'),outline:s.outlineColor,shadow:s.boxShadow};});
     assert(facts.focus.visible);assert.equal(facts.focus.outline,'rgb(255, 255, 255)');
    }
    states.push(facts);
    if(width===390)await page.screenshot({path:path.join(dir,'static-'+variant.name+'-mobile-review.png')});
    if(width===1000)await page.screenshot({path:path.join(dir,'static-'+variant.name+'-rendered-review.png'),fullPage:true});
   }
   let replacementWorks=null;
   if(variant.replace){
    const originalImage=await page.locator('figure[data-img-idx] img').first().getAttribute('src');
    const fixture=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yB4sAAAAASUVORK5CYII=','base64');
    await page.locator('input[type=file]').setInputFiles({name:'local-pixel.png',mimeType:'image/png',buffer:fixture});
    await page.waitForFunction(old=>document.querySelector('figure[data-img-idx] img').getAttribute('src')!==old,originalImage);
    const updated=await page.locator('figure[data-img-idx] img').first().getAttribute('src');
    assert.equal(updated,'data:image/png;base64,'+fixture.toString('base64'));replacementWorks=true;
   }
   outputs.push({variant:variant.name,file:variant.file,sha256:hash(input),preservation:{textExcludingUnsupportedRendererControls:true,links:true,imageBytesAndAlt:true},states,replacementWorks});
  }
  assert.deepEqual(errors,[]);
  const result={scope:'Targeted static cleanup of a stored accepted candidate; actual Chromium content, keyboard, reflow and replacement checks; not a new live verdict.',verifiedAt:new Date().toISOString(),historicalCandidateSha256:hash(historical),outputs,errors};
  fs.writeFileSync(path.join(dir,'static-crop-rendered-review.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
