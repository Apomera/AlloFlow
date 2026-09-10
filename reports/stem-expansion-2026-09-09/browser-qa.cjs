
const fs=require('fs'),path=require('path'),{chromium}=require('playwright'),assert=require('assert');
const OUT=__dirname,read=p=>fs.readFileSync(p,'utf8'),results=[];
const gate=read('dev-tools/check_stem_layout_defects.cjs').replace(/\r\n/g,'\n');
const start=gate.indexOf('const SHELL = '),end=gate.indexOf(String.fromCharCode(96)+';\n',start)+2;
let shell=new Function(gate.slice(start,end)+';return SHELL;')();
shell=shell.replace('var ctx = {','window.__state=pair[0]; window.__setState=pair[1]; var ctx = {');
const specs=[
{id:'algebraCAS',file:'algebracas',state:{tab:'solve',expression:'3x + 0.1 = 1.1',mode:'solve'},panel:'[data-linear-step-checker]'},
{id:'openBim',file:'openbim',state:null,panel:'[data-openbim-workbench]'},
{id:'organismId',file:'organismid',state:{activeView:'observe'},panel:'[data-taxonomy-observation]'},
{id:'graphCalc',file:'graphcalc',state:{funcs:[{expr:'(x - 0.12345)^2',color:'#2563eb'},{expr:'0',color:'#b91c1c'}]},panel:'[data-analysis-provenance]'},
{id:'funcGrapher',file:'funcgrapher',state:{type:'linear',a:1,b:0,c:0,traceX:0},panel:'[data-improper-investigation]'}
];
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{for(const theme of ['light','dark','contrast'])for(const spec of specs){
  const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});page.setDefaultTimeout(12000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const button=name=>page.getByRole('button',{name,exact:true});
  try{
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.setContent('<html lang="en"><head><title>STEM workflow validation</title><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style></head><body style="margin:0;font-family:system-ui"><main id="slot" class="theme-'+(theme==='light'?'default':theme)+'"></main></body></html>');
   for(const f of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_'+spec.file+'.js','app_styles_module.js'])await page.addScriptTag({content:read(f)});
   await page.evaluate(()=>{const el=document.createElement('div');document.body.appendChild(el);ReactDOM.createRoot(el).render(React.createElement(window.AlloModules.AppStyles.AppStyles,{}));});
   if(spec.id==='graphCalc')await page.addScriptTag({content:read('scratch/advanced-math-review-2026-09-06/math-13.2.0.min.js')});
   await page.addScriptTag({content:shell});
   await page.evaluate(({spec,theme})=>window.__mount(spec.id,theme==='dark',spec.id==='openBim'?{stage:'review',proposal:window.OpenBIMBridge.buildFallbackPlan('Design a science classroom with daylight and storage',{})}:spec.state,theme==='contrast'),{spec,theme});
   if(spec.id==='algebraCAS'){
    await button('TRY:').click();await page.locator('[data-cas-verification="exact"]').waitFor();
    assert((await page.locator('#slot').innerText()).includes('ANSWER: 1/3'));
    await page.locator(spec.panel+' summary').click();await page.locator('#cas-next-step').fill('3x=1');
    await button('Check this step').click();assert((await page.locator(spec.panel).innerText()).includes('exactly the same solution set'));
   }
   if(spec.id==='openBim'){
    await button('Save comparison baseline').click();
    await page.getByRole('spinbutton',{name:'Floor width in metres',exact:true}).fill('4');await button('Apply study dimensions').click();
    assert(await page.locator('[data-design-result="revise"]').count());
    assert((await page.locator('[data-openbim-comparison]').innerText()).includes('width: 8 m → 4 m'));
    await page.getByRole('spinbutton',{name:'Floor width in metres',exact:true}).fill('9');await button('Apply study dimensions').click();
    assert(await page.locator('[data-design-result="meets"]').count());
   }
   if(spec.id==='organismId'){
    await button('Yes').click();await page.locator('#oid-observation-note').fill('I observed feathers. Wings alone would not distinguish this from an insect.');
    await button('Save observation').click();await button('Revisit Feathered visitor').click();
    await page.locator('#oid-observation-note').fill('The feathers support the bird teaching group. I still cannot name a species.');
    await page.getByRole('textbox',{name:'What changed in this revision?',exact:true}).fill('Separated the group claim from a species identification.');
    await button('Save observation revision').click();
    assert((await page.locator(spec.panel).innerText()).includes('Earlier observation: I observed feathers.'));
    const pending=page.waitForEvent('download');await button('Export observation journal').click();
    const download=await pending;await download.saveAs(path.join(OUT,'taxonomy-'+theme+'.md'));
    assert(read(path.join(OUT,'taxonomy-'+theme+'.md')).includes('Revision of'));
   }
   if(spec.id==='graphCalc'){
    await page.getByRole('button',{name:/Analyze/i}).first().click();await page.locator(spec.panel).waitFor();
    const state=await page.evaluate(()=>window.__state.graphCalc);
    assert.equal(state._zeros.length,1);assert(Math.abs(state._zeros[0].x-.12345)<1e-7);assert.equal(state._intersections.length,1);
   }
   if(spec.id==='funcGrapher'){
    await page.locator(spec.panel+' summary').click();
    await page.getByRole('combobox',{name:'Predict what happens as ε approaches zero',exact:true}).selectOption('finite');
    await button('Record cutoff trial').click();await page.getByRole('spinbutton',{name:'Positive endpoint cutoff',exact:true}).fill('.01');
    await button('Record cutoff trial').click();await button('Compare with the limit').click();
    assert((await page.locator('[data-improper-limit]').innerText()).includes('converges'));
   }
   await page.locator(spec.panel).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(OUT,spec.file+'-'+theme+'-desktop.png'),animations:'disabled'});
   await page.setViewportSize({width:375,height:812});await page.locator(spec.panel).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(OUT,spec.file+'-'+theme+'-phone.png'),animations:'disabled'});
   await page.setViewportSize({width:320,height:760});await page.addScriptTag({content:read('node_modules/axe-core/axe.min.js')});
   const a11y=await page.evaluate(async(selector)=>{
    const region=document.querySelector(selector),scope=selector==='[data-analysis-provenance]'?region.parentElement:region;
    const r=await axe.run(scope,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});
    return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
   },spec.panel);
   const reflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert(!errors.length,errors.join('; '));assert(!(await page.locator('#slot').innerText()).includes('threw: '));
   results.push({tool:spec.id,theme,ok:true,a11y,reflow,errors});
  }catch(e){results.push({tool:spec.id,theme,ok:false,error:e.stack,errors});await page.screenshot({path:path.join(OUT,spec.file+'-'+theme+'-failure.png')}).catch(()=>{});}
  finally{fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify(results,null,2));await page.close();}
  console.log(spec.id+' '+theme+': '+(results.at(-1).ok?'passed':'FAILED'));
 }}finally{await browser.close();}
 const failed=results.filter(r=>!r.ok||r.a11y?.length||r.reflow?.scroll>r.reflow?.width);
 console.log(JSON.stringify({states:results.length,failed:failed.map(r=>({tool:r.tool,theme:r.theme,error:r.error,a11y:r.a11y,reflow:r.reflow}))},null,2));
 if(failed.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});

