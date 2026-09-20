from pathlib import Path
p=Path('tests/graphcalc_candidate_evidence.test.js');s=p.read_text(encoding='utf-8');s=s.replace("const analysis=()=>", "beforeEach(()=>vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(new Proxy({measureText:()=>({width:20})},{get:(target,key)=>target[key]||(()=>{})})));\nconst analysis=()=>",1);p.write_text(s,encoding='utf-8')
p=Path('stem_lab/stem_tool_graphcalc.js');s=p.read_text(encoding='utf-8');anchor="            choices.length?h('label',null,'Candidate to inspect'";s=s.replace(anchor,"            !d._analysisContext?h('p',null,'Run Analyze again to record the inputs for inspection and export.'):null,\n"+anchor,1);p.write_text(s,encoding='utf-8');Path('desktop/web-app/public/stem_lab/'+p.name).write_bytes(p.read_bytes())
script=r"""const fs=require('fs'),path=require('path'),{chromium}=require('playwright'),assert=require('assert');
const OUT=__dirname,read=p=>fs.readFileSync(p,'utf8'),results=[];
const gate=read('dev-tools/check_stem_layout_defects.cjs').replace(/\r\n/g,'\n');
const start=gate.indexOf('const SHELL = '),end=gate.indexOf(String.fromCharCode(96)+';\n',start)+2;
let shell=new Function(gate.slice(start,end)+';return SHELL;')();
shell=shell.replace('var ctx = {','window.__state=pair[0]; window.__setState=pair[1]; var ctx = {');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{for(const theme of ['light','dark','contrast']){
  const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});page.setDefaultTimeout(15000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const button=name=>page.getByRole('button',{name,exact:true});
  const analyze=()=>page.getByRole('button',{name:/Analyze/i}).first().click();
  const update=patch=>page.evaluate(patch=>window.__setState(prev=>({...prev,graphCalc:{...prev.graphCalc,...patch}})),patch);
  const download=async name=>{const pending=page.waitForEvent('download');await button('Export numerical evidence').click();const result=await pending;const file=path.join(OUT,name+'-'+theme+'.md');await result.saveAs(file);return read(file);};
  try{
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.setContent('<html lang="en"><head><title>Graphing evidence validation</title><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style></head><body style="margin:0;font-family:system-ui"><main id="slot" class="theme-'+(theme==='light'?'default':theme)+'"></main></body></html>');
   for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_graphcalc.js','app_styles_module.js','scratch/advanced-math-review-2026-09-06/math-13.2.0.min.js'])await page.addScriptTag({content:read(file)});
   await page.evaluate(()=>{const el=document.createElement('div');document.body.appendChild(el);ReactDOM.createRoot(el).render(React.createElement(window.AlloModules.AppStyles.AppStyles,{}));});
   await page.addScriptTag({content:shell});
   await page.evaluate(theme=>window.__mount('graphCalc',theme==='dark',{funcs:[{expr:'(x - 0.12345)^2',color:'#2563eb'},{expr:'0',color:'#b91c1c'}]},theme==='contrast'),theme);
   await analyze();const chooser=page.getByRole('combobox',{name:'Candidate to inspect',exact:true});
   await chooser.selectOption('zero-0');assert.equal(await page.locator('[data-candidate-values] li').count(),5);
   await chooser.focus();await page.keyboard.press('Tab');assert(await button('Trace selected candidate').evaluate(el=>document.activeElement===el));await page.keyboard.press('Enter');
   assert(Math.abs((await page.evaluate(()=>window.__state.graphCalc.traceX))-.12345)<1e-7);
   await chooser.selectOption('intersection-0');const rootReport=await download('touching-root');
   assert(rootReport.includes('(x - 0.12345)^2'));assert(rootReport.includes('f1 − f2'));assert(rootReport.includes('Nearby-value inspection'));
   await update({funcs:[{expr:'a*x',color:'#2563eb'},{expr:'1',color:'#b91c1c'}],sliderA:2});
   assert.equal(await page.locator('[data-candidate-inspector]').count(),0);
   await analyze();await chooser.selectOption('intersection-0');
   await button('Trace selected candidate').click();assert(Math.abs((await page.evaluate(()=>window.__state.graphCalc.traceX))-.5)<1e-8);
   await update({sliderA:4});assert.equal(await page.locator('[data-candidate-inspector]').count(),0);
   await analyze();assert.equal(await chooser.inputValue(),'');await chooser.selectOption('intersection-0');
   const parameterReport=await download('parameter-intersection');assert(parameterReport.includes('a = 4'));assert(parameterReport.includes('x ≈ 0.25'));
   await update({funcs:[{expr:'sqrt(x)',color:'#2563eb'}],window:{xmin:-1,xmax:1,ymin:-1,ymax:2}});await analyze();await chooser.selectOption('zero-0');
   assert((await page.locator('[data-candidate-values]').innerText()).includes('Unavailable'));
   const domainReport=await download('domain-boundary');assert(domainReport.includes('Unavailable'));assert(domainReport.includes('[-1, 1]'));
   await page.locator('[data-candidate-inspector]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(OUT,'graphcalc-'+theme+'-desktop.png'),animations:'disabled'});
   const sizes=[];
   for(const width of [375,320]){
    await page.setViewportSize({width,height:812});await page.locator('[data-candidate-inspector]').scrollIntoViewIfNeeded();
    if(width===375)await page.screenshot({path:path.join(OUT,'graphcalc-'+theme+'-phone.png'),animations:'disabled'});
    sizes.push(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})));
   }
   await page.addScriptTag({content:read('node_modules/axe-core/axe.min.js')});
   const a11y=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('[data-analysis-provenance]').parentElement,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map(row=>({id:row.id,nodes:row.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}));});
   await update({funcs:[{expr:'x',color:'#2563eb'},{expr:'x',color:'#b91c1c'}]});await analyze();
   const overlapReport=await download('sampled-overlap');assert(overlapReport.includes('not proof of identical functions'));
   assert(!errors.length,errors.join('; '));results.push({theme,ok:true,a11y,sizes,errors});
  }catch(error){results.push({theme,ok:false,error:error.stack,errors});await page.screenshot({path:path.join(OUT,'graphcalc-'+theme+'-failure.png')}).catch(()=>{});}
  finally{await page.close();fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify(results,null,2));}
  console.log(theme+': '+(results.at(-1).ok?'passed':'FAILED'));
 }}finally{await browser.close();}
 const failed=results.filter(row=>!row.ok||row.a11y.length||row.sizes.some(size=>size.scroll>size.width));console.log(JSON.stringify({themes:results.length,failed},null,2));if(failed.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
"""
Path('reports/graphcalc-evidence-2026-09-19/browser-qa.cjs').write_text(script,encoding='utf-8')
