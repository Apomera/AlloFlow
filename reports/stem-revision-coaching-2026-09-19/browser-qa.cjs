
const fs=require('fs'),path=require('path'),{chromium}=require('playwright'),assert=require('assert');
const OUT=__dirname,read=p=>fs.readFileSync(p,'utf8'),results=[];
const gate=read('dev-tools/check_stem_layout_defects.cjs').replace(/\r\n/g,'\n');
const start=gate.indexOf('const SHELL = '),end=gate.indexOf(String.fromCharCode(96)+';\n',start)+2;
let shell=new Function(gate.slice(start,end)+';return SHELL;')();
shell=shell.replace('var ctx = {','window.__state=pair[0]; window.__setState=pair[1]; var ctx = {');
(async()=>{
const browser=await chromium.launch({headless:true});
try{
for(const theme of ['light','dark','contrast'])for(const id of ['openBim','organismId']){
 const file=id==='openBim'?'openbim':'organismid',selector=id==='openBim'?'[data-openbim-workbench]':'[data-taxonomy-observation]';
 const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const button=name=>page.getByRole('button',{name,exact:true});
 try{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setContent('<html lang="en"><head><title>STEM investigation check</title><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style></head><body style="margin:0;font-family:system-ui"><main id="slot" class="theme-'+(theme==='light'?'default':theme)+'"></main></body></html>');
  for(const f of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_'+file+'.js','app_styles_module.js'])await page.addScriptTag({content:read(f)});
  await page.evaluate(()=>{const el=document.createElement('div');document.body.appendChild(el);ReactDOM.createRoot(el).render(React.createElement(window.AlloModules.AppStyles.AppStyles,{}));});
  await page.addScriptTag({content:shell});
  await page.evaluate(({id,theme})=>{
   let state={activeView:'observe',observationExample:'insect'};
   if(id==='openBim'){const plan=OpenBIMBridge.buildFallbackPlan('Science classroom with daylight',{});plan.designStudy={width:4,depth:12,workWidth:6,workDepth:4};state={stage:'review',proposal:plan};}
   window.__mount(id,theme==='dark',state,theme==='contrast');
  },{id,theme});
  if(id==='openBim'){
   await page.getByRole('textbox',{name:'Design reasoning',exact:true}).fill('The area is sufficient, but the work rectangle is wider than the floor.');
   await page.getByRole('textbox',{name:'Trial name (optional)',exact:true}).fill('Before rotation');
   assert((await page.locator('[data-design-constraint=fit]').innerText()).includes('width by 2 m'));
   await button('Save design trial').click();await button('Rotate work area 90°').click();
   assert((await page.locator('[data-design-constraint=fit]').innerText()).startsWith('Met:'));
   assert((await page.locator('[data-design-trial-comparison]').innerText()).includes('does not fit → fits'));
   await page.getByRole('textbox',{name:'Design reasoning',exact:true}).fill('Rotation preserved 24 m² while fitting the four-metre floor width.');
   await page.getByRole('textbox',{name:'Trial name (optional)',exact:true}).fill('After rotation');
   await button('Save design trial').click();
   await page.getByRole('combobox',{name:'Compare with a saved trial',exact:true}).selectOption({label:'1. Before rotation'});
   assert((await page.locator('[data-design-trial-comparison]').innerText()).includes('does not fit → fits'));
   await button('Restore selected trial').click();assert(await page.locator('[data-design-result="revise"]').count());
   await button('Rotate work area 90°').click();
   const pending=page.waitForEvent('download');await button('Export design trials').click();const download=await pending;
   await download.saveAs(path.join(OUT,'design-trials-'+theme+'.md'));assert(read(path.join(OUT,'design-trials-'+theme+'.md')).includes('After rotation'));
   await button('Remove selected trial').click();await button('Undo trial removal').click();
   const roundTrip=await page.evaluate(()=>{
    const plan=window.__state.openBim.proposal;
    return OpenBIMBridge.normalizeImportedRecipe(JSON.stringify(OpenBIMBridge.buildRecipe(plan))).plan;
   });
   assert.equal(roundTrip.designTrials.length,2);assert.equal(roundTrip.status,'proposal');
   await page.getByRole('spinbutton',{name:'Floor width in metres',exact:true}).fill('10');
   assert((await page.locator('[data-design-constraints]').innerText()).includes('use the applied dimensions'));
   await button('Apply study dimensions').click();
   assert((await page.locator('[data-design-constraint=floor]').innerText()).includes('Over the target by 60 m²'));

  }else{
   await button('Yes').click();await button('Review my evidence').click();
   assert(await page.locator('[data-observation-evidence-review="revisit"]').count());
   await button('Return to this decision').click();await button('No').click();await button('Yes').click();await button('Yes').click();
   await button('Review my evidence').click();assert(await page.locator('[data-observation-evidence-review="supported"]').count());
   await page.locator('#oid-observation-context').fill('Classroom example; observing the written description.');
   await page.locator('#oid-observation-note').fill('Six jointed legs and antennae support the insect teaching group.');
   await page.locator('#oid-next-evidence').fill('Look for the three body regions before trying a more specific key.');
   await button('Save observation').click();
   await button('Revisit Six-legged visitor').click();
   assert.equal(await page.locator('#oid-next-evidence').inputValue(),'Look for the three body regions before trying a more specific key.');
   await page.getByRole('textbox',{name:'What changed in this revision?',exact:true}).fill('I now separate the group claim from a species identification.');
   await page.locator('#oid-observation-note').fill('Six legs support the teaching group; a species would require more evidence.');
   await page.locator('#oid-next-evidence').fill('Inspect body regions with a more specific teaching key.');
   await button('Review my evidence').click();await button('Save observation revision').click();
   await page.locator('[data-observation-comparison] summary').click();
   assert((await page.locator('[data-observation-comparison]').innerText()).includes('Before: Six jointed legs'));
   const journalArticles=page.locator('[data-observation-journal] article');
   await journalArticles.last().getByRole('button',{name:'Remove Six-legged visitor',exact:true}).click();
   assert((await page.locator('[data-observation-comparison]').innerText()).includes('not available'));
   const removedPending=page.waitForEvent('download');await button('Export removed observation').click();const removedDownload=await removedPending;
   await removedDownload.saveAs(path.join(OUT,'removed-observation-'+theme+'.md'));
   assert(read(path.join(OUT,'removed-observation-'+theme+'.md')).includes('Six jointed legs and antennae'));
   await button('Undo observation removal').click();
   assert((await page.locator('[data-observation-comparison]').innerText()).includes('Before: Six jointed legs'));

   const pending=page.waitForEvent('download');await button('Export observation journal').click();const download=await pending;
   await download.saveAs(path.join(OUT,'taxonomy-evidence-'+theme+'.md'));const text=read(path.join(OUT,'taxonomy-evidence-'+theme+'.md'));
   assert(text.includes('Entry ID:'));assert(text.includes('Revision comparison:'));assert(text.includes('Next evidence to seek:'));assert(text.includes('Evidence review: Your key decisions match'));
  }
  await page.locator(id==='openBim'?'[data-design-constraints]':'[data-observation-comparison]').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(OUT,file+'-'+theme+'-desktop.png'),animations:'disabled'});
  const sizes=[];
  for(const width of [375,320]){
   await page.setViewportSize({width,height:812});await page.locator(id==='openBim'?'[data-design-constraints]':'[data-observation-comparison]').scrollIntoViewIfNeeded();
   if(width===375)await page.screenshot({path:path.join(OUT,file+'-'+theme+'-phone.png'),animations:'disabled'});
   sizes.push(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})));
  }
  await page.addScriptTag({content:read('node_modules/axe-core/axe.min.js')});
  const a11y=await page.evaluate(async sel=>{
   const r=await axe.run(document.querySelector(sel),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
   return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
  },selector);
  // Keyboard reachability of the central action, including visible focus.
  const central=button(id==='openBim'?'Save design trial':'Review my evidence');
  await central.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
  assert(await central.evaluate(el=>el===document.activeElement));
  assert(!errors.length,errors.join('; '));
  assert(!(await page.locator('#slot').innerText()).includes('threw: '));
  results.push({id,theme,ok:true,a11y,sizes,errors});
 }catch(e){results.push({id,theme,ok:false,error:e.stack,errors});await page.screenshot({path:path.join(OUT,file+'-'+theme+'-failure.png')}).catch(()=>{});}
 finally{await page.close();fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify(results,null,2));}
 console.log(id+' '+theme+': '+(results.at(-1).ok?'passed':'FAILED'));
}
}finally{await browser.close();}
const failed=results.filter(r=>!r.ok||r.a11y.length||r.sizes.some(s=>s.scroll>s.width));
console.log(JSON.stringify({states:results.length,failed},null,2));if(failed.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

