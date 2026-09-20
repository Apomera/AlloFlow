const fs=require('fs'),path=require('path'),http=require('http');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../..');process.chdir(root);
const results={startedAt:new Date().toISOString(),method:'Live HistoryPanel React component using current canonical module, AppStyles, compiled Tailwind CSS, English UI strings, three theme contexts, existing two-resource fixture; icon components are stubbed, so icon contrast is outside scope.',states:[]};
const prior=fs.readFileSync('tests/history_panel_theme.test.js','utf8');
const fixtures=prior.slice(prior.indexOf('const history = ['),prior.indexOf('\nfunction App('));
const source=fs.readFileSync('view_history_panel_source.jsx','utf8'),strings=JSON.parse(fs.readFileSync('ui_strings.js','utf8'));
const dictionary={};for(const m of source.matchAll(/\bt\('([^']+)'/g)){const value=m[1].split('.').reduce((a,k)=>a?.[k],strings);if(typeof value==='string')dictionary[m[1]]=value;}
const setup=`const noop=()=>{};${fixtures}
const root=ReactDOM.createRoot(document.getElementById('root'));
const dictionary=${JSON.stringify(dictionary)};
const t=(key,params={})=>{let value=dictionary[key];if(typeof value!=='string')return undefined;for(const [key,v] of Object.entries(params||{}))value=value.replaceAll('{'+key+'}',String(v));return value;};
window.renderHistory=(theme,state)=>{const rows=state==='empty'?[]:history;root.render(React.createElement(window.AlloThemeContext.Provider,{value:{theme,colorOverlay:'none'}},React.createElement('main',{className:'fixed inset-0 overflow-auto '+(theme==='light'?'theme-default':'theme-'+theme)},React.createElement(window.AlloModules.AppStyles.AppStyles),React.createElement('div',{style:{width:'100%',maxWidth:420,padding:12}},React.createElement(window.AlloModules.HistoryPanel.HistoryPanel,{...makeProps(),t,history:rows,getFilteredHistory:()=>rows,isUnitModalOpen:state==='populated',newUnitName:''})))));};`;
function luminance(v){v=v.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4});return .2126*v[0]+.7152*v[1]+.0722*v[2];}
function color(s){return s.match(/[\d.]+/g)?.map(Number);}
function ratio(f,b){const a=luminance(f),c=luminance(b);return(Math.max(a,c)+.05)/(Math.min(a,c)+.05);}
function composite(f,b){return f.slice(0,3).map((v,i)=>v*(f[3]??1)+b[i]*(1-(f[3]??1)));}
function measure(item){
 let backgrounds=[[255,255,255]], unsupported=[];
 const clearCoveredBackgrounds=()=>{unsupported=unsupported.filter(i=>!i.startsWith('background: '));};
 for(const layer of [...item.layers].reverse()){
  const bg=color(layer.background);
  if((bg[3]??1)===1){backgrounds=[bg.slice(0,3)];clearCoveredBackgrounds();}
  else if((bg[3]??1)>0)backgrounds=backgrounds.map(b=>composite(bg,b));
  if(layer.image!=='none'){
   const stops=[...layer.image.matchAll(/rgba?\([^)]+\)/g)].map(m=>color(m[0]));
   if(/^linear-gradient\(/.test(layer.image)&&stops.length===2){
    const samples=Array.from({length:101},(_,i)=>stops[0].map((v,j)=>v+(stops[1][j]-v)*i/100));
    if(stops.every(c=>(c[3]??1)===1)){backgrounds=samples.map(c=>c.slice(0,3));clearCoveredBackgrounds();}
    else backgrounds=backgrounds.flatMap(b=>samples.map(c=>composite(c,b)));
   }else unsupported.push('background: '+layer.image);
  }
  if(layer.opacity!=='1')unsupported.push('element opacity '+layer.opacity);
  if(layer.before||layer.after)unsupported.push('painted pseudo-element');
 }
 const fg=color(item.foreground),ratios=backgrounds.map(b=>ratio(composite(fg,b),b));
 return{...item,minimumRatio:Math.min(...ratios),maximumRatio:Math.max(...ratios),backgroundSamples:backgrounds.length,unsupported};
}
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>History accessibility fixture</title></head><body><div id="root"></div></body></html>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});results.browser=browser.version();results.axe=require('axe-core/package.json').version;
 try{for(const theme of ['light','dark','contrast']){
 const page=await browser.newPage({viewport:{width:420,height:900}});await page.goto('http://127.0.0.1:'+server.address().port);await page.emulateMedia({reducedMotion:'reduce'});
 for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
 await page.evaluate(()=>{window.AlloThemeContext=React.createContext({theme:'light'});window.AlloModules={};for(const name of ['AlertCircle','ChevronDown','ChevronUp','Cloud','CloudOff','Download','Folder','FolderInput','FolderOpen','FolderPlus','GripVertical','History','Lock','Maximize','Minimize','Pencil','RefreshCw','Save','Search','Settings','Share2','Trash2','Upload','X'])window[name]=()=>null;localStorage.setItem('alloflow_stem_stations','[]');localStorage.setItem('alloflow_sel_stations','[]');});
 const cssDir=path.join(root,'app/static/css');await page.addStyleTag({path:path.join(cssDir,fs.readdirSync(cssDir).find(f=>/^main\.[a-z0-9]+\.css$/i.test(f)))});
 for(const file of ['app_styles_module.js','view_history_panel_module.js','node_modules/axe-core/axe.min.js'])await page.addScriptTag({path:path.join(root,file)});await page.addScriptTag({content:setup});
 for(const state of ['empty','populated']){
 await page.evaluate(([theme,state])=>window.renderHistory(theme,state),[theme,state]);await page.waitForFunction(theme=>document.querySelector('#tour-history-panel')?.dataset.historyTheme===theme,theme);
 if(state==='populated')await page.locator('[data-help-key="history_save_unit_btn"]').waitFor();
 const evidence={theme,state};
 async function collect(){return page.evaluate(()=>{const host=document.getElementById('tour-history-panel');const targets=[...host.querySelectorAll('h3 > span.min-w-0, .text-emerald-700, select, .border-dashed, input[placeholder], [data-help-key="history_save_unit_btn"], [data-help-key="history_cancel_unit_btn"], span.bg-slate-100.text-slate-600')];return targets.map(e=>{const placeholder=e.matches('input[placeholder]');const style=getComputedStyle(e,placeholder?'::placeholder':null);const layers=[];for(let n=e;n;n=n.parentElement){const s=getComputedStyle(n);const painted=p=>{const a=getComputedStyle(n,p);return a.content!=='none'&&a.content!=='normal'&&(a.backgroundImage!=='none'||a.backgroundColor!=='rgba(0, 0, 0, 0)');};layers.push({tag:n.tagName,id:n.id,background:s.backgroundColor,image:s.backgroundImage,opacity:s.opacity,before:painted('::before'),after:painted('::after')});}return{tag:e.tagName,id:e.id,key:e.dataset.helpKey,text:placeholder?e.placeholder:e.textContent.trim().slice(0,90),placeholder,foreground:style.color,fontSize:style.fontSize,weight:style.fontWeight,layers};});});}
 evidence.colors=(await collect()).map(measure);
 if(state==='populated'){await page.locator('[data-help-key="history_save_unit_btn"]').hover();await page.waitForTimeout(200);evidence.hover=(await collect()).filter(e=>e.key==='history_save_unit_btn').map(measure);}
 const audit=await page.evaluate(async()=>{const a=await axe.run(document.getElementById('tour-history-panel'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22a','wcag22aa']}});return{violations:a.violations,incomplete:a.incomplete};});Object.assign(evidence,audit);
 if(state==='populated'){
  evidence.mobile=[];await page.setViewportSize({width:320,height:900});
  for(const spacing of [false,true]){if(spacing)await page.addStyleTag({content:'#root #tour-history-panel, #root #tour-history-panel * {line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important} #root #tour-history-panel p {margin-bottom:2em!important}'});
   if(spacing)await page.waitForFunction(()=>{const s=getComputedStyle(document.querySelector('[data-help-key="history_unit_name_input"]'));const f=parseFloat(s.fontSize);return Number.isFinite(parseFloat(s.letterSpacing))&&parseFloat(s.letterSpacing)>=f*.12-.001&&parseFloat(s.wordSpacing)>=f*.16-.001&&parseFloat(s.lineHeight)>=f*1.5-.001;});
   evidence.mobile.push(await page.evaluate(spacing=>({spacing,width:innerWidth,titles:[...document.querySelectorAll('[data-history-resource-title]')].map(e=>({text:e.textContent.trim(),width:e.clientWidth,scrollWidth:e.scrollWidth,height:e.clientHeight,scrollHeight:e.scrollHeight})),appliedSpacing:(()=>{const s=getComputedStyle(document.querySelector('[data-help-key="history_unit_name_input"]'));const input=document.querySelector('[data-help-key="history_unit_name_input"]');return{fontSize:s.fontSize,lineHeight:s.lineHeight,letterSpacing:s.letterSpacing,wordSpacing:s.wordSpacing,inline:input.getAttribute('style'),rules:[...document.styleSheets].flatMap(sheet=>{try{return [...sheet.cssRules].filter(r=>r.style?.letterSpacing&&r.selectorText&&input.matches(r.selectorText)).map(r=>r.cssText)}catch{return []}})};})(),controls:[...document.querySelectorAll('#tour-history-panel button,#tour-history-panel input,#tour-history-panel select')].filter(e=>e.getClientRects().length).map(e=>({key:e.dataset.helpKey,text:e.getAttribute('aria-label')||e.innerText,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})),scrollWidth:document.querySelector('main').scrollWidth,clientWidth:document.querySelector('main').clientWidth}),spacing));
   await page.screenshot({path:path.join(__dirname,theme+'-320'+(spacing?'-spacing':'')+'.png'),fullPage:true});
  }
 }
 results.states.push(evidence);console.log(theme+'/'+state,JSON.stringify({violations:audit.violations.map(v=>v.id),measurements:[...evidence.colors,...(evidence.hover||[])].map(c=>({text:c.text,ratio:c.minimumRatio,unsupported:c.unsupported}))}));await page.screenshot({path:path.join(__dirname,theme+'-'+state+'.png'),fullPage:true});
 }
 await page.close();}
 }catch(e){results.error=e.stack;console.error(e);process.exitCode=1;}finally{
 if(process.argv.includes('--verify')){
  const failures=[];if(results.error)failures.push(results.error);if(results.states.length!==6)failures.push('Expected six theme/state samples');
  for(const state of results.states){
   if(state.violations.length)failures.push(state.theme+'/'+state.state+' axe violations');
   for(const c of [...state.colors,...(state.hover||[])])if(!c.unsupported.length&&c.minimumRatio<4.5)failures.push(state.theme+' '+c.text+' contrast '+c.minimumRatio);
   for(const m of state.mobile||[]){if(m.scrollWidth>m.clientWidth||m.controls.some(c=>c.left<0||c.right>m.width)||m.titles.length!==2||m.titles.some(t=>t.scrollWidth>t.width||t.scrollHeight>t.height))failures.push(state.theme+' mobile overflow (spacing '+m.spacing+')');
    if(m.spacing){const p=m.appliedSpacing,font=parseFloat(p.fontSize);if(!Number.isFinite(parseFloat(p.letterSpacing))||!Number.isFinite(parseFloat(p.wordSpacing))||!Number.isFinite(parseFloat(p.lineHeight))||parseFloat(p.letterSpacing)<font*.12-.001||parseFloat(p.wordSpacing)<font*.16-.001||parseFloat(p.lineHeight)<font*1.5-.001)failures.push(state.theme+' spacing override was not effective');}
   }
  }
  results.verification={passed:failures.length===0,failures};if(failures.length)process.exitCode=1;console.log('Verification',JSON.stringify(results.verification));
 }
 fs.writeFileSync(path.join(__dirname,process.argv.includes('--baseline')?'baseline.json':'results.json'),JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));}
})();
