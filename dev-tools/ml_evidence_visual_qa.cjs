// Native React/THREE verification of readable, fixed comparison evidence.
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
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_evidence_visual_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)})),expectedHash='88cfa8af3625cc227b14cec4a8c1ef7be827572d66d4591fee7d3484ec730588';
 const preserved={designReflection:'Keep my reasoning.',benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}}};
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const panel=()=>pg.locator('.ml-station-comparison'),evidence=()=>panel().locator('[data-ml-experiment]'),scroll=()=>evidence().locator('[role=region][tabindex="0"]');
 const state=()=>pg.evaluate(()=>window.__qaState),settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 async function press(target){await target.focus();await pg.keyboard.press('Enter');await settle();}
 async function slide(key,button){await pg.locator('#ml-'+key).focus();await pg.keyboard.press(button);await settle();}
 async function reveal(){if(!await panel().evaluate(n=>n.open))await press(panel().locator(':scope>summary'));await panel().scrollIntoViewIfNeeded();await settle();}
 const formatted=(n,unit)=>Number(n.toFixed(3)).toString()+' '+unit;
 const ma=(kind,s)=>({lever:()=>s.leverEffortArm/s.leverLoadArm,windlass:()=>s.windlassHandleR/s.windlassDrumR,ramp:()=>s.rampLength/s.rampHeight,screw:()=>2*Math.PI*s.screwHandleR/s.screwPitch}[kind]());
 const reading=(kind,s)=>{const advantage=ma(kind,s),load=s[kind+'Load'];return{ma:advantage,force:load/advantage,distance:s.loadDistance*advantage,workIn:load*s.loadDistance,workOut:load*s.loadDistance};};
 let mounts=0;
 function clearBrowserTemp(recreate){
  const base=fs.realpathSync(OUT),temporary=path.resolve(OUT,'browser-temp'),expected=path.join(base,'browser-temp');
  if(temporary!==expected||path.dirname(temporary)!==base)throw Error('Temporary path escaped run');
  if(fs.existsSync(temporary)){const resolved=fs.realpathSync(temporary);if(resolved!==expected||path.dirname(resolved)!==base)throw Error('Temporary path escaped run');fs.rmSync(resolved,{recursive:true,force:true});}
  if(recreate)fs.mkdirSync(temporary);
 }
 async function mount(kind,width=1180,theme={},extra={}){
  if(mounts++){
   await b.close();clearBrowserTemp(true);b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});pg=await b.newPage({viewport:{width,height:1100},deviceScaleFactor:1});
   pg.on('pageerror',e=>errors.push(String(e&&e.message||e)));pg.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
   await pg.goto('file://'+pagePath.replace(/\\/g,'/'));await pg.waitForFunction(()=>window.__mlReady?.()&&window.THREE?.OrbitControls&&window.StemLab?.makeOrbitViewer);
  }
  await pg.setViewportSize({width,height:1100});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',...preserved,...extra}),{band:'g68',...theme}]);
  await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();await pg.waitForFunction(()=>{const c=document.querySelector('.ml-shop-bay canvas');if(!c||!c.width||!c.height)return false;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl&&!gl.isContextLost();});await settle();check(true,kind+': real THREE canvas initialized');console.log('native mount',mounts,kind);
  await reveal();await press(panel().locator('[data-ml-save-reference]'));
 }
 async function keep(kind,note){await press(panel().locator('[data-ml-keep-comparison]'));await evidence().locator('textarea').fill(note);await settle();check((await state()).benchExperiments[kind].note===note,kind+': typed explanation is stored with the frozen pair');}
 async function values(kind,label){
  const record=(await state()).benchExperiments[kind],expected={before:reading(kind,record.before.settings),after:reading(kind,record.after.settings)};
  const data=await evidence().evaluate(el=>({name:el.getAttribute('aria-label'),title:el.querySelector('h4').textContent,tableTag:el.querySelector('table')?.tagName,tableRole:el.querySelector('table')?.getAttribute('role'),caption:el.querySelector('caption')?.textContent,columns:[...el.querySelectorAll('thead th')].map(n=>({scope:n.scope,text:n.textContent})),rows:[...el.querySelectorAll('[data-ml-experiment-metric]')].map(n=>({id:n.dataset.mlExperimentMetric,headerTag:n.firstElementChild.tagName,scope:n.firstElementChild.scope,values:[...n.querySelectorAll('[data-ml-experiment-value]')].map(v=>({tag:v.tagName,side:v.dataset.mlExperimentValue,raw:Number(v.dataset.value),text:v.textContent}))})),region:[...el.querySelectorAll('[role=region][tabindex="0"]')].map(n=>({name:n.getAttribute('aria-label')||(n.getAttribute('aria-labelledby')||'').split(' ').map(id=>document.getElementById(id)?.textContent||'').join(' '),describedby:n.getAttribute('aria-describedby'),table:n.contains(el.querySelector('table'))})),note:{label:el.querySelector('label')?.htmlFor,id:el.querySelector('textarea')?.id,help:el.querySelector('textarea')?.getAttribute('aria-describedby'),value:el.querySelector('textarea')?.value},changes:Number(el.querySelector('[data-ml-experiment-changes]').dataset.mlExperimentChanges),text:el.textContent,live:!!el.querySelector('[aria-live],[role=status],[role=alert]')}));
  observations.push({kind,label,expected,evidence:data});
  check(data.name==='Recorded comparison'&&data.title==='Recorded comparison',label+': section retains its recorded-evidence name');
  check(data.tableTag==='TABLE'&&!data.tableRole&&data.caption==='Ideal model results; values are rounded.'&&JSON.stringify(data.columns)===JSON.stringify([{scope:'col',text:'Quantity'},{scope:'col',text:'Before'},{scope:'col',text:'After'}]),label+': native table, caption and three column headers remain semantic');
  check(data.rows.length===5&&data.rows.map(n=>n.id).join(',')==='ma,force,distance,workIn,workOut'&&data.rows.every(n=>n.headerTag==='TH'&&n.scope==='row'&&n.values.length===2&&n.values.every(v=>v.tag==='TD')),label+': five quantities keep native row headers and ten numeric cells');
  for(const row of data.rows)for(const v of row.values){const wanted=expected[v.side][row.id],unit={ma:'×',force:'N',distance:'m',workIn:'J',workOut:'J'}[row.id];check(Math.abs(v.raw-wanted)<=Math.max(1,Math.abs(wanted))*1e-12&&v.text===formatted(wanted,unit),label+' '+row.id+' '+v.side+': frozen value and displayed rounding agree with independent mechanics');}
  check(data.region.length===1&&!!data.region[0].name&&data.region[0].table,label+': exactly one named keyboard-focusable region contains the native table');
  const guide=await scroll().evaluate(n=>(n.getAttribute('aria-describedby')||'').split(' ').map(id=>document.getElementById(id)).filter(Boolean).map(el=>({text:el.textContent,visible:el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height>0,hidden:el.getAttribute('aria-hidden')})));
  check(guide.some(n=>n.visible&&n.hidden!=='true'&&n.text.includes('If a column is hidden, scroll sideways or focus the table and use arrow keys.')),label+': a visible scroll instruction describes the table region');
  check(data.note.label===data.note.id&&!!data.note.help&&data.note.value===record.note&&!data.live,label+': reflection label/help association and stored note remain intact without new live regions');
  const changes=Object.keys(record.before.settings).filter(k=>record.before.settings[k]!==record.after.settings[k]);check(data.changes===changes.length&&(changes.length===1?data.text.includes('One setting changed:'):data.text.includes('Several settings changed.')),label+': changed-setting guidance reflects the fixed pair');
  const same=record.before.settings[kind+'Load']===record.after.settings[kind+'Load']&&record.before.settings.loadDistance===record.after.settings.loadDistance;check(data.text.includes(same?'Both setups do the same ideal work':'this is a different task'),label+': same-task or changed-task work explanation matches the recorded load/travel');
 }
 async function focusVisible(target,label){
  await pg.keyboard.press('Tab');await target.focus();await settle();const data=await target.evaluate(n=>{const c=getComputedStyle(n);return{active:document.activeElement===n,visible:n.matches(':focus-visible'),width:parseFloat(c.outlineWidth),style:c.outlineStyle,color:c.outlineColor,offset:parseFloat(c.outlineOffset)};});observations.push({label,focus:data});check(data.active&&data.visible&&data.width>=2&&data.style!=='none'&&data.offset>=2,label+': keyboard focus has a distinct visible outline');
 }
 async function layout(label,doubled=false){
  await evidence().scrollIntoViewIfNeeded();await settle();
  const data=await evidence().evaluate(el=>{
   const rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number),lum=c=>rgb(c).slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
   const bg=n=>{let p=n,bg=getComputedStyle(p).backgroundColor;while(rgb(bg)[3]===0&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}return bg;},contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   const reg=el.querySelector('[role=region][tabindex="0"]'),r=reg.getBoundingClientRect();return{pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,regionFits:r.left>=el.getBoundingClientRect().left&&r.right<=el.getBoundingClientRect().right,regionWidth:reg.clientWidth,tableWidth:reg.querySelector('table').getBoundingClientRect().width,text:[...el.querySelectorAll('h4,p,caption,th,td,summary,li,label,textarea,button')].filter(n=>n.getClientRects().length&&(!n.closest('details:not([open])')||n.matches('details:not([open]) > summary'))).map(n=>({tag:n.tagName,text:n.textContent,size:parseFloat(getComputedStyle(n).fontSize),contrast:contrast(getComputedStyle(n).color,bg(n)),overflow:n.tagName==='TEXTAREA'?false:n.scrollWidth>n.clientWidth+1,height:n.getBoundingClientRect().height})),tokens:[...el.querySelectorAll('[data-ml-experiment-value]')].map(n=>{const token=n.textContent.split(' ')[0],range=document.createRange();range.setStart(n.firstChild,0);range.setEnd(n.firstChild,token.length);return{text:n.textContent,token,nowrap:getComputedStyle(n).whiteSpace,cellWidth:n.clientWidth,padding:parseFloat(getComputedStyle(n).paddingLeft)+parseFloat(getComputedStyle(n).paddingRight),rects:[...range.getClientRects()].map(r=>({width:r.width,height:r.height}))};})};
  });observations.push({label,layout:data});const scale=doubled?2:1;
  check(data.pageFits&&data.panelFits&&data.regionFits&&data.text.every(n=>!n.overflow),label+': evidence and page fit while any wide table stays inside its scroll region');
  check(data.text.every(n=>n.size>=(n.tag==='H4'?20:n.tag==='TD'?18:n.tag==='TEXTAREA'?16:14)*scale),label+': title, numeric cells, reflection and supporting text keep their readable hierarchy');
  check(data.text.every(n=>n.contrast>=4.5),label+': all visible evidence text retains readable contrast');
  check(data.tokens.length===10&&data.tokens.every(n=>n.nowrap==='nowrap'&&n.rects.length===1&&n.rects[0].width<=n.cellWidth-n.padding+1),label+': ten numeric tokens remain intact within their cells');
  check(data.text.filter(n=>n.tag==='BUTTON'||n.tag==='SUMMARY').every(n=>n.height>=44),label+': actions and recorded-settings disclosure retain44-pixel targets');
 }
 async function keyboardTable(label){
  await focusVisible(scroll(),label+' table');const initial=await scroll().evaluate(n=>({x:n.scrollLeft,max:n.scrollWidth-n.clientWidth}));
  if(initial.max<=1){check(true,label+': full table fits without horizontal scrolling');return;}
  let seenBefore=false,seenAfter=false,steps=0,last=initial.x;
  while(steps++<45){
   const seen=await scroll().evaluate(n=>{const r=n.getBoundingClientRect(),cols=[...n.querySelectorAll('thead th')].slice(1).map((head,i)=>[head,...n.querySelectorAll('tbody tr td:nth-child('+(i+2)+')')].every(c=>{const range=document.createRange();range.selectNodeContents(c);const x=range.getBoundingClientRect();return x.left>=r.left-1&&x.right<=r.right+1;}));return{left:n.scrollLeft,before:cols[0],after:cols[1],max:n.scrollWidth-n.clientWidth};});seenBefore=seenBefore||seen.before;seenAfter=seenAfter||seen.after;last=seen.left;if(seenAfter&&seen.left>=seen.max-1)break;
   await pg.keyboard.press('ArrowRight');await settle();
  }
  observations.push({label,keyboardScroll:{initial,last,seenBefore,seenAfter,steps}});
  check(last>initial.x&&seenBefore&&seenAfter,label+': keyboard horizontal scrolling exposes both Before and After columns');
  check(await pg.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&scrollX===0),label+': table navigation does not scroll the page sideways');
  await scroll().evaluate(n=>n.scrollLeft=0);await settle();
 }
 async function fixed(kind,label,record){const s=await state();check(JSON.stringify(s.benchExperiments[kind])===record&&Object.keys(preserved).every(k=>JSON.stringify(s[k])===JSON.stringify(preserved[k])),label+': fixed record, explanation and unrelated saved work survive live edits');}
 async function shot(name){await evidence().screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});console.log('screenshot ready',name);}
 try{
  check(before[0].sha256===expectedHash&&before[1].sha256===expectedHash,'Production source and public mirror match the frozen revision');
  await mount('lever');await slide('leverEffortArm','ArrowRight');await keep('lever','A longer effort arm reduced force and increased hand travel.');await values('lever','Desktop lever');await layout('Desktop lever');await keyboardTable('Desktop lever');
  await focusVisible(evidence().locator('textarea'),'Desktop reflection');await focusVisible(evidence().locator('summary'),'Recorded settings');await press(evidence().locator('summary'));check(await evidence().locator('details').evaluate(n=>n.open),'Recorded settings open by keyboard');await press(evidence().locator('summary'));
  let record=JSON.stringify((await state()).benchExperiments.lever);await slide('leverLoad','ArrowRight');await slide('loadDistance','ArrowRight');await fixed('lever','Lever after live task edits',record);await values('lever','Fixed lever after live edits');await shot('desktop-evidence');
  const references=JSON.stringify((await state()).benchReferences),current=await state();await focusVisible(evidence().getByRole('button',{name:'Clear comparison record',exact:true}),'Clear evidence action');await press(evidence().getByRole('button',{name:'Clear comparison record',exact:true}));await pg.waitForFunction(()=>{const n=document.activeElement;return n&&!n.disabled&&n.closest('.ml-station-comparison')&&(n.hasAttribute('data-ml-keep-comparison')||n.hasAttribute('data-ml-save-reference'));});check(await evidence().count()===0&&JSON.stringify((await state()).benchReferences)===references&&(await state()).leverLoad===current.leverLoad,'Clearing evidence returns keyboard focus and preserves saved/live setups');
  await keep('lever','New fixed evidence for my work record.');record=JSON.stringify((await state()).benchExperiments.lever);await focusVisible(evidence().getByRole('button',{name:'Open your work record',exact:true}),'Open work record action');await press(evidence().getByRole('button',{name:'Open your work record',exact:true}));await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');check((await state()).view==='learn'&&(await state()).manualTopic==='record'&&JSON.stringify((await state()).benchExperiments.lever)===record,'Open work record navigates and focuses the record without changing evidence');
  await mount('ramp',900);await slide('rampLength','ArrowRight');await slide('rampLoad','ArrowRight');await slide('loadDistance','ArrowRight');await keep('ramp','This comparison changes the task as well as the ramp.');await values('ramp','Changed-task ramp');await layout('Narrow desktop ramp');await keyboardTable('Narrow desktop ramp');record=JSON.stringify((await state()).benchExperiments.ramp);await slide('rampHeight','ArrowRight');await fixed('ramp','Ramp after live geometry edit',record);await values('ramp','Fixed changed-task ramp');await shot('narrow-desktop-evidence');
  await mount('windlass',390,{dark:true,band:'g912'});await slide('windlassHandleR','End');await keep('windlass','The handle radius changed while load and travel stayed fixed.');await values('windlass','Dark phone wheel and axle');await layout('Dark phone');await keyboardTable('Dark phone');record=JSON.stringify((await state()).benchExperiments.windlass);await slide('windlassDrumR','ArrowRight');await fixed('windlass','Dark phone after live geometry edit',record);await shot('dark-phone-evidence');
  await mount('screw',320,{contrast:true});await slide('screwHandleR','End');await slide('screwPitch','Home');await slide('screwLoad','End');await slide('loadDistance','End');await keep('screw','A larger task and high mechanical advantage require much more hand travel.');await values('screw','Extreme screw recorded pair');
  const rules=await evidence().evaluate(el=>[...el.querySelectorAll('h4,p,table,caption,th,td,summary,li,label,textarea,button')].map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let a=n;while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '[data-ml-experiment] > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';}).join('\n'));
  await pg.addStyleTag({content:rules});await settle();await layout('Forced320 doubled evidence text',true);await keyboardTable('Forced320 doubled table');await focusVisible(evidence().locator('textarea'),'Forced doubled reflection');record=JSON.stringify((await state()).benchExperiments.screw);await slide('screwHandleR','ArrowLeft');await fixed('screw','Forced phone after live geometry edit',record);await values('screw','Forced fixed screw record');
  await scroll().evaluate(n=>n.scrollLeft=n.scrollWidth-n.clientWidth);await settle();await shot('forced-doubled-evidence');
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;}
 finally{
  await b.close();clearBrowserTemp(false);if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,mounts,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
