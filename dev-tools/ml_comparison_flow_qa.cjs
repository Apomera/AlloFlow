// Real React/THREE verification of the station comparison flow.
const fs=require('fs'),path=require('path'),vm=require('vm');
const report=path.resolve(process.argv[2]),temp=path.join(report,'browser-temp');fs.mkdirSync(temp,{recursive:true});
process.env.TEMP=temp;process.env.TMP=temp;process.env.PLAYWRIGHT_BROWSERS_PATH=process.env.PLAYWRIGHT_BROWSERS_PATH||'C:/Users/cabba/AppData/Local/ms-playwright';
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');
source=source.slice(0,source.indexOf('  const manifest = [];'))
 .replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2]);")
 .replace('deviceScaleFactor: 2','deviceScaleFactor: 1')
 .replace('const b = await chromium.launch(','let b = await chromium.launch(')
 .replace('const pg = await b.newPage(','let pg = await b.newPage(')
 .replace('var ctx = {','window.__qaState=pair[0].machineLab; var ctx = {');
source+=String.raw`
 const checks=[],observations=[],shots=[],startedAt=new Date().toISOString();
 const hash=file=>require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_comparison_flow_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)})),expectedHash=process.env.ML_EXPECTED_SOURCE;
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const panel=()=>pg.locator('.ml-station-comparison'),summary=()=>panel().locator(':scope > summary');
 const state=()=>pg.evaluate(()=>window.__qaState),settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const protectedKeys=['designReflection','benchPower','shopMotionProgress','shopRotX','shopRotY','shopZoom'];
 const protectedSnapshot=s=>JSON.stringify(Object.fromEntries(protectedKeys.map(k=>[k,s[k]])));
 let mounts=0;
 function clearBrowserTemp(recreate){
  const base=fs.realpathSync(OUT),temporary=path.resolve(OUT,'browser-temp'),expected=path.join(base,'browser-temp');
  if(temporary!==expected||path.dirname(temporary)!==base)throw Error('Temporary path escaped run');
  if(fs.existsSync(temporary)){const resolved=fs.realpathSync(temporary);if(resolved!==expected||path.dirname(resolved)!==base)throw Error('Temporary path escaped run');fs.rmSync(resolved,{recursive:true,force:true});}
  if(recreate)fs.mkdirSync(temporary);
 }
 async function mount(kind,width,theme={},override={}){
  if(mounts++){
   await b.close();clearBrowserTemp(true);b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});pg=await b.newPage({viewport:{width,height:1100},deviceScaleFactor:1});
   pg.on('pageerror',e=>errors.push(String(e&&e.message||e)));pg.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
   await pg.goto('file://'+pagePath.replace(/\\/g,'/'));await pg.waitForFunction(()=>window.__mlReady?.()&&window.THREE?.OrbitControls&&window.StemLab?.makeOrbitViewer);
  }
  await pg.setViewportSize({width,height:1100});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',shopAnimating:false,shopMotionProgress:.5,shopRotX:10,shopRotY:20,shopZoom:1.2,designReflection:'Keep this explanation.',benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}},...override}),{band:'g68',...theme}]);
  await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();await pg.waitForFunction(()=>{const c=document.querySelector('.ml-shop-bay canvas');if(!c||!c.width||!c.height)return false;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl&&!gl.isContextLost();});await settle();check(true,kind+': real THREE canvas initialized');
  await panel().scrollIntoViewIfNeeded();await settle();console.log('native mount',mounts,kind);
 }
 async function open(){if(await panel().getAttribute('open')===null){await summary().focus();await pg.keyboard.press('Enter');await settle();}check(await panel().getAttribute('open')!==null,'Native Enter opens comparison disclosure');}
 async function press(button){await button.focus();await pg.keyboard.press('Enter');await settle();}
 async function range(key,value){await pg.locator('#ml-'+key).evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);await settle();}
 async function semantics(label,count,record=false){
  const data=await panel().evaluate(el=>({tag:el.tagName,summary:el.firstElementChild.tagName,summaryText:el.firstElementChild.textContent,count:el.querySelector('[data-ml-reference-count]')?.getAttribute('data-ml-reference-count')??null,record:!!el.querySelector('[data-ml-experiment]'),live:el.querySelectorAll('[aria-live],[role=status],[role=alert]').length,svg:[...el.firstElementChild.querySelectorAll('svg')].map(n=>({hidden:n.getAttribute('aria-hidden'),focusable:n.getAttribute('focusable')})),adjust:[...el.querySelectorAll('[data-ml-adjust-setting]')].map(n=>({key:n.getAttribute('data-ml-adjust-setting'),controls:n.getAttribute('aria-controls'),describedby:n.getAttribute('aria-describedby'),description:document.getElementById(n.getAttribute('aria-describedby'))?.textContent,aria:n.getAttribute('aria-label')}))}));observations.push({label,semantics:data});
  check(data.tag==='DETAILS'&&data.summary==='SUMMARY'&&data.summaryText.includes('Compare a change'),label+': native named disclosure is preserved');
  check(data.count===(count===null?null:String(count))&&data.adjust.length===(count||0),label+': saved/change badges and changed-setting rows agree');
  check(data.record===record,label+': record state is accurate');
  check(data.live===0,label+': no new live announcements');
  check(data.svg.length===1&&data.svg.every(n=>n.hidden==='true'&&n.focusable==='false'),label+': summary illustration is decorative and unfocusable');
  check(data.adjust.every(n=>n.controls==='ml-'+n.key&&n.describedby==='ml-change-values-'+n.key&&!!n.description&&n.aria.startsWith('Adjust ')),label+': adjustment names, descriptions and slider targets remain connected');
 }
 async function metrics(label){
  const data=await panel().evaluate(el=>{
   const s=window.__qaState,b=s.bench,before=s.benchReferences[b],M=window.__mlMath();
   const ma=d=>b==='lever'?M.leverMA(d.leverEffortArm,d.leverLoadArm):b==='ramp'?M.rampMA(d.rampLength,d.rampHeight):b==='screw'?M.screwMA(d.screwHandleR,d.screwPitch):null;
   return [...el.querySelectorAll('[data-ml-reference-metric]')].map(n=>{const id=n.dataset.mlReferenceMetric,expected=[before,s].map(d=>id==='force'?M.effortForce(d[b+'Load'],ma(d)):M.effortDistance(d.loadDistance,ma(d)));return{id,expected,actual:[...n.querySelectorAll('[data-ml-reference-value]')].map(v=>Number(v.dataset.value)),direction:n.querySelector('[data-ml-reference-direction]').dataset.mlReferenceDirection};});
  });observations.push({label,metrics:data});
  check(data.length===2&&data.every(n=>n.actual.every((v,i)=>Math.abs(v-n.expected[i])<1e-8)),label+': force and travel metrics match the live machine model');
  check(data.every(n=>n.direction===(Math.abs(n.expected[1]-n.expected[0])<1e-9?'same':n.expected[1]<n.expected[0]?'less':'more')),label+': reading direction agrees with the calculations');
 }
 async function layout(label,doubled=false){
  await panel().scrollIntoViewIfNeeded();await settle();const data=await panel().evaluate(el=>{
   const box=n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};},root=box(el),rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number),lum=c=>rgb(c).slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
   const bg=n=>{let p=n,b=getComputedStyle(p).backgroundColor;while(rgb(b)[3]===0&&p.parentElement){p=p.parentElement;b=getComputedStyle(p).backgroundColor;}return b;},contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   const nodes=[...el.querySelectorAll('*')].filter(n=>!n.closest('svg,.ml-reference-reading,.ml-evidence-record')&&n.tagName!=='STYLE'&&n.getBoundingClientRect().height&&[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()));
   return{viewport:innerWidth,pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,root,controls:[...el.querySelectorAll('button,summary')].filter(n=>!n.closest('.ml-evidence-record')&&n.getBoundingClientRect().height).map(n=>({text:n.textContent,box:box(n)})),text:nodes.map(n=>({text:n.textContent,box:box(n),font:parseFloat(getComputedStyle(n).fontSize),contrast:contrast(getComputedStyle(n).color,bg(n)),ranges:[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()).flatMap(c=>{const range=document.createRange();range.selectNodeContents(c);return [...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));}),words:[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()).flatMap(c=>[...c.textContent.matchAll(/\S+/g)].map(m=>{const r=document.createRange();r.setStart(c,m.index);r.setEnd(c,m.index+m[0].length);return{text:m[0],pieces:r.getClientRects().length};}))}))};
  });observations.push({label,layout:data});
  check(data.panelFits&&data.controls.every(n=>n.box.left>=data.root.left-1&&n.box.right<=data.root.right+1),label+': comparison flow fits its container');
  check(data.controls.every(n=>n.box.height>=44),label+': disclosure and actions keep at least 44px targets');
  check(data.text.every(n=>n.ranges.every(r=>r.left>=n.box.left-1&&r.right<=n.box.right+1)),label+': flow text stays inside its boxes');
  check(data.text.every(n=>n.contrast>=4.5),label+': flow text retains readable contrast');
  check(data.text.every(n=>n.words.every(w=>w.pieces===1)),label+': words and formatted numbers remain whole');
  check(data.text.find(n=>n.text==='Compare a change').font>=20*(doubled?2:1),label+': disclosure title has the new readable size');
  check(data.text.filter(n=>n.text.includes('→')).every(n=>n.font>=16*(doubled?2:1)),label+': changed values keep readable type');
 }
 async function doubledText(){
  const css=await panel().evaluate(el=>[...el.querySelectorAll('*')].filter(n=>!n.closest('svg,.ml-reference-reading,.ml-evidence-record')&&n.tagName!=='STYLE'&&[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())).map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let a=n;while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '.ml-station-comparison > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';}).join('\n'));await pg.addStyleTag({content:css});await settle();
 }
 async function shot(name,target=panel()){await target.screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});console.log('screenshot ready',name);}
 async function keyboardFocus(){await summary().focus();await pg.keyboard.press('Tab');const d=await pg.evaluate(()=>({tag:document.activeElement.tagName,save:document.activeElement.hasAttribute('data-ml-save-reference'),visible:document.activeElement.matches(':focus-visible'),style:getComputedStyle(document.activeElement).outlineStyle,width:parseFloat(getComputedStyle(document.activeElement).outlineWidth)}));check(d.save&&d.visible&&d.style==='solid'&&d.width>=3,'Keyboard Tab reaches Save with a visible focus outline');}
 try{
  check(!!expectedHash&&before[0].sha256===expectedHash&&before[1].sha256===expectedHash,'Production source and public mirror match the frozen revision');
  await mount('lever',1180);const initial=protectedSnapshot(await state());
  check(await panel().getAttribute('open')===null,'Comparison initially remains collapsed');await semantics('Closed unsaved',null);await layout('Closed desktop');await shot('desktop-comparison-closed');await open();await keyboardFocus();await semantics('Open unsaved',null);await layout('Open unsaved');
  await press(panel().locator('[data-ml-save-reference]'));await semantics('Saved unchanged',0);await metrics('Saved unchanged');check(await panel().getByRole('button',{name:'Restore saved setup',exact:true}).isDisabled()&&await panel().locator('[data-ml-keep-comparison]').isDisabled(),'Unchanged restore and comparison save stay disabled');
  await range('leverEffortArm',3);await semantics('Single change',1);await metrics('Single change');await layout('Narrow desktop sidebar');await shot('desktop-comparison-change');
  const preJump=JSON.stringify(await state());await press(panel().locator('[data-ml-adjust-setting=leverEffortArm]'));await pg.waitForFunction(()=>document.activeElement.id==='ml-leverEffortArm');check(JSON.stringify(await state())===preJump,'Adjust focuses the right slider without changing state');
  await press(panel().getByRole('button',{name:'Restore saved setup',exact:true}));await pg.waitForFunction(()=>document.activeElement.id==='ml-leverEffortArm');check((await state()).leverEffortArm===2,'Restore returns the saved value and slider focus');await semantics('Restored',0);
  await range('leverEffortArm',3);await range('leverLoad',500);await semantics('Multiple changes',2);await metrics('Multiple changes');await layout('Multiple changes');
  await press(panel().locator('[data-ml-keep-comparison]'));await semantics('Recorded multiple changes',2,true);await panel().locator('textarea').fill('The wider lever changed the effort; the load changed too.');const record=JSON.stringify((await state()).benchExperiments.lever);
  await press(panel().getByRole('button',{name:'Clear saved setup',exact:true}));await pg.waitForFunction(()=>document.activeElement.hasAttribute('data-ml-save-reference'));await semantics('Cleared setup with retained record',null,true);check(JSON.stringify((await state()).benchExperiments.lever)===record,'Clearing setup preserves the fixed record and explanation');
  await summary().focus();await pg.keyboard.press('Space');await settle();check(await panel().getAttribute('open')===null,'Native Space closes comparison');await semantics('Closed recorded state',null,true);await open();check(protectedSnapshot(await state())===initial,'Comparison flow preserves pose, camera and existing skill practice');
  await shot('desktop-workshop-context',pg.locator('.ml-shop-bay'));
  await mount('ramp',390,{dark:true});await open();await layout('Dark phone unsaved');await press(panel().locator('[data-ml-save-reference]'));await range('rampLength',6);await semantics('Dark phone changed',1);await metrics('Dark phone changed');await layout('Dark phone changed');await shot('dark-phone-comparison');
  await mount('screw',320,{contrast:true},{screwHandleR:.5,screwPitch:.001,screwLoad:5000,loadDistance:3});await open();await press(panel().locator('[data-ml-save-reference]'));await range('screwPitch',.012);await range('screwLoad',1250);await range('loadDistance',.5);await semantics('Forced long multi-change',3);await metrics('Forced long multi-change');await doubledText();await layout('Forced320 doubled comparison',true);await shot('forced-doubled-comparison');
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;try{await shot('failure-comparison');}catch(snapshotError){errors.push('Failure screenshot: '+snapshotError);}}
 finally{
  await b.close();clearBrowserTemp(false);if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,mounts,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
