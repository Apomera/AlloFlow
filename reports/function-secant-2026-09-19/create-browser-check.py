from pathlib import Path
script=r"""const fs=require('fs'),path=require('path'),{chromium}=require('playwright'),assert=require('assert');
const OUT=__dirname,read=p=>fs.readFileSync(p,'utf8'),results=[];
const gate=read('dev-tools/check_stem_layout_defects.cjs').replace(/\r\n/g,'\n'),start=gate.indexOf('const SHELL = '),end=gate.indexOf(String.fromCharCode(96)+';\n',start)+2;
let shell=new Function(gate.slice(start,end)+';return SHELL;')();
shell=shell.replace('var ctx = {','window.__state=pair[0];window.__setState=pair[1];var ctx = {');
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const theme of ['light','dark','contrast']){
  const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const button=name=>page.getByRole('button',{name,exact:true});
  const update=patch=>page.evaluate(patch=>window.__setState(prev=>({...prev,funcGrapher:{...prev.funcGrapher,...patch}})),patch);
  const download=async name=>{const pending=page.waitForEvent('download');await button('Export secant investigation').click();const result=await pending,file=path.join(OUT,name+'-'+theme+'.md');await result.saveAs(file);return read(file);};
  try{
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.setContent('<html lang="en"><head><title>Function secant validation</title><style>'+read('dev-tools/.cache/sweep-tailwind.css')+'</style></head><body style="margin:0;font-family:system-ui"><main id="slot" class="theme-'+(theme==='light'?'default':theme)+'"></main></body></html>');
   for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js','stem_lab/stem_lab_module.js','stem_lab/stem_tool_funcgrapher.js','app_styles_module.js'])await page.addScriptTag({content:read(file)});
   await page.evaluate(()=>{const el=document.createElement('div');document.body.appendChild(el);ReactDOM.createRoot(el).render(React.createElement(window.AlloModules.AppStyles.AppStyles,{}));});
   await page.addScriptTag({content:shell});await page.evaluate(theme=>window.__mount('funcGrapher',theme==='dark',{type:'quadratic',a:1,b:0,c:0,traceX:1},theme==='contrast'),theme);
   const panel=page.locator('[data-secant-investigation]');await panel.locator('summary').click();
   await button('Compute secant slopes').click();assert((await panel.innerText()).includes('Choose a prediction'));
   await page.getByRole('combobox',{name:'Predict the left and right slopes',exact:true}).selectOption('same');
   await button('Compute secant slopes').click();assert.equal(await page.locator('[data-secant-results] tbody tr').count(),4);
   await button('Compare with the derivative').click();assert((await page.locator('[data-secant-derivative]').innerText()).includes('= 2'));
   await page.getByRole('textbox',{name:'Explain what the two sides show',exact:true}).fill('The left and right slopes approach 2 from opposite sides.');
   assert((await download('quadratic')).includes('The left and right slopes approach 2'));
   await update({traceX:2});assert.equal(await page.locator('[data-secant-results]').count(),0);
   await button('Compute secant slopes').click();await button('Compare with the derivative').click();assert((await page.locator('[data-secant-derivative]').innerText()).includes('= 4'));
   await update({type:'sqrt',traceX:0,secantPrediction:'unavailable'});await button('Compute secant slopes').click();await button('Compare with the derivative').click();
   let study=await page.evaluate(()=>window.__state.funcGrapher.secantResult);assert(study.rows.every(row=>row.left===null&&row.center===null));assert(study.rows[3].right>30);
   assert((await download('square-root-boundary')).includes('Unavailable'));
   await update({type:'cubic',traceX:0,secantPrediction:'same'});await button('Compute secant slopes').click();await button('Compare with the derivative').click();
   study=await page.evaluate(()=>window.__state.funcGrapher.secantResult);assert.equal(study.derivative,0);assert(study.rows[3].left<.00001);
   assert((await download('stationary-cubic')).includes('f′(x₀) = 0'));
   await update({type:'rational',traceX:0,secantPrediction:'unavailable'});await button('Compute secant slopes').click();
   study=await page.evaluate(()=>window.__state.funcGrapher.secantResult);assert.equal(study.value,null);assert(study.rows.every(row=>row.left===null&&row.right===null));
   assert((await download('undefined-base')).includes('f(x₀) = Unavailable'));
   await update({type:'absolute',traceX:0,secantPrediction:'different'});
   const prediction=page.getByRole('combobox',{name:'Predict the left and right slopes',exact:true});await prediction.focus();await page.keyboard.press('Tab');assert(await button('Compute secant slopes').evaluate(el=>document.activeElement===el));await page.keyboard.press('Enter');
   await button('Compare with the derivative').click();study=await page.evaluate(()=>window.__state.funcGrapher.secantResult);
   assert(study.rows.every(row=>row.left===-1&&row.right===1&&row.center===0));assert.equal(study.derivative,null);
   await page.getByRole('textbox',{name:'Explain what the two sides show',exact:true}).fill('A centered estimate of zero hides the corner: the left slopes stay at −1 and the right slopes stay at 1.');
   assert((await download('absolute-corner')).includes('centered estimate of zero hides the corner'));
   await panel.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(OUT,'secant-'+theme+'-desktop.png'),animations:'disabled'});
   const sizes=[];for(const width of [375,320]){await page.setViewportSize({width,height:812});await panel.scrollIntoViewIfNeeded();if(width===375)await page.screenshot({path:path.join(OUT,'secant-'+theme+'-phone.png'),animations:'disabled'});sizes.push(await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})));}
   await page.addScriptTag({content:read('node_modules/axe-core/axe.min.js')});const a11y=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('[data-secant-investigation]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return result.violations.map(row=>({id:row.id,nodes:row.nodes.map(node=>({target:node.target,summary:node.failureSummary}))}));});
   assert(!errors.length,errors.join('; '));results.push({theme,ok:true,a11y,sizes,errors});
  }catch(error){results.push({theme,ok:false,error:error.stack,errors});await page.screenshot({path:path.join(OUT,'secant-'+theme+'-failure.png')}).catch(()=>{});}
  finally{await page.close();fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify(results,null,2));}console.log(theme+': '+(results.at(-1).ok?'passed':'FAILED'));
 }
}finally{await browser.close();}const failed=results.filter(row=>!row.ok||row.a11y.length||row.sizes.some(size=>size.scroll>size.width));console.log(JSON.stringify({themes:results.length,failed},null,2));if(failed.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
"""
Path('reports/function-secant-2026-09-19/browser-qa.cjs').write_text(script,encoding='utf-8')
