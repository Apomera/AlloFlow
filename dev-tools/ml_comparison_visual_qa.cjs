// Native React/THREE checks for the saved/current comparison reading cards.
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
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_comparison_visual_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)}));
 const expectedHash='4532d47ce6940447e96704ef213519aed9caea4b6a1da9ad7d4d29726aed93e6';
 const settings={lever:['leverEffortArm','leverLoadArm','leverLoad'],pulley:['pulleySegments','pulleyLoad'],windlass:['windlassHandleR','windlassDrumR','windlassLoad'],ramp:['rampLength','rampHeight','rampLoad'],wedge:['wedgeLength','wedgeThickness','wedgeLoad'],screw:['screwHandleR','screwPitch','screwLoad']};
 const main={lever:'leverEffortArm',pulley:'pulleySegments',windlass:'windlassHandleR',ramp:'rampLength',wedge:'wedgeLength',screw:'screwHandleR'};
 const preserved={designReflection:'Keep my comparison explanation.',benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}},benchCompoundRecords:{lever:{inputWork:{version:1,benchId:'lever',second:'pulley',inputSettings:{leverEffortArm:2,leverLoadArm:1},outputSettings:{pulleySegments:2},load:400,loadDistance:.5,percentIn:80,percentOut:90,question:'inputWork',answer:'277.78',unit:'J',explanation:'Preserve this calculation.',hint:1,completion:'checked'}}}};
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const panel=()=>pg.locator('.ml-station-comparison'),cards=()=>panel().locator('[data-ml-reference-metric]');
 const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=()=>pg.evaluate(()=>window.__qaState);
 async function press(target){await target.focus();await pg.keyboard.press('Enter');await settle();}
 async function slide(key,button){await pg.locator('#ml-'+key).focus();await pg.keyboard.press(button);await settle();}
 async function reveal(){if(!await panel().evaluate(n=>n.open))await press(panel().locator(':scope>summary'));await panel().scrollIntoViewIfNeeded();await settle();}
 const snapshot=(kind,s)=>Object.fromEntries([...settings[kind],'loadDistance'].map(k=>[k,s[k]]));
 const ma=(kind,s)=>({lever:()=>s.leverEffortArm/s.leverLoadArm,pulley:()=>s.pulleySegments,windlass:()=>s.windlassHandleR/s.windlassDrumR,ramp:()=>s.rampHeight>s.rampLength?null:s.rampLength/s.rampHeight,wedge:()=>s.wedgeLength/s.wedgeThickness,screw:()=>2*Math.PI*s.screwHandleR/s.screwPitch}[kind]());
 const reading=(kind,s)=>{const advantage=ma(kind,s);return{force:advantage===null?null:s[kind+'Load']/advantage,distance:advantage===null?null:s.loadDistance*advantage};};
 const formatted=(v,unit)=>(v===null?'—':Number(v.toFixed(3)).toString())+' '+unit;
 let mounts=0;
 async function mount(kind,width=1180,theme={},extra={}){
  if(mounts++){
   await b.close();b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});pg=await b.newPage({viewport:{width,height:1100},deviceScaleFactor:1});
   pg.on('pageerror',e=>errors.push(String(e&&e.message||e)));pg.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
   await pg.goto('file://'+pagePath.replace(/\\/g,'/'));await pg.waitForFunction(()=>window.__mlReady?.()&&window.THREE?.OrbitControls&&window.StemLab?.makeOrbitViewer);
  }
  await pg.setViewportSize({width,height:1100});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',...preserved,...extra}),{band:'g68',...theme}]);
  await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();await pg.waitForFunction(()=>{const c=document.querySelector('.ml-shop-bay canvas');if(!c||!c.width||!c.height)return false;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl&&!gl.isContextLost();});await settle();
  check(true,kind+' mount '+mounts+': real THREE canvas initialized');
  check(await pg.locator('.ml-station-chooser [data-ml-bench-preview]').evaluateAll(ns=>ns.length===6&&ns.every(n=>{const r=n.getBoundingClientRect();return r.width===60&&r.height===60;})),kind+' mount '+mounts+': chooser previews keep their existing dimensions');console.log('native mount',mounts,kind);
 }
 async function metrics(kind,label){
  await panel().scrollIntoViewIfNeeded();await settle();
  const current=await state(),saved=current.benchReferences[kind],expected={saved:reading(kind,saved),now:reading(kind,current)};
  // Wait for the visible bars to finish native layout/transition after a slider move.
  // The final assertions below still independently check exact raw values, CSS percentages and pixels.
  const desired=Object.keys(expected.saved).flatMap(id=>['saved','now'].map(side=>({id,side,pct:expected[side][id]===null?0:expected[side][id]/Math.max(expected.saved[id],expected.now[id]||0,1e-12)*100})));
  const settleStarted=Date.now();
  await pg.waitForFunction(rows=>rows.every(row=>{const n=document.querySelector('[data-ml-reference-metric='+row.id+'] [data-ml-reference-bar='+row.side+']');if(!n)return false;const p=n.parentElement,c=getComputedStyle(n),pc=getComputedStyle(p),probe=document.createElement('div');probe.style.width=row.pct+'%';const content=p.getBoundingClientRect().width-parseFloat(pc.borderLeftWidth)-parseFloat(pc.borderRightWidth),wanted=Math.max(parseFloat(c.borderLeftWidth)+parseFloat(c.borderRightWidth),content*parseFloat(probe.style.width)/100);return Math.abs(n.getBoundingClientRect().width-wanted)<.1;}),desired,{timeout:3000});
  observations.push({label,pixelSettleMs:Date.now()-settleStarted});
  const data=await cards().evaluateAll(ns=>ns.map(el=>({id:el.dataset.mlReferenceMetric,title:el.querySelector('h4')?.textContent,direction:el.querySelector('[data-ml-reference-direction]')?.dataset.mlReferenceDirection,badge:el.querySelector('[data-ml-reference-direction]')?.textContent,values:[...el.querySelectorAll('[data-ml-reference-value]')].map(n=>({side:n.dataset.mlReferenceValue,raw:n.getAttribute('data-value'),text:n.textContent,tag:n.tagName,label:n.previousElementSibling?.textContent,labelTag:n.previousElementSibling?.tagName,list:n.parentElement.tagName})),bars:[...el.querySelectorAll('[data-ml-reference-bar]')].map(n=>{const c=getComputedStyle(n),t=n.parentElement;return{side:n.dataset.mlReferenceBar,width:n.style.width,rect:n.getBoundingClientRect().width,track:t.getBoundingClientRect().width-parseFloat(getComputedStyle(t).borderLeftWidth)-parseFloat(getComputedStyle(t).borderRightWidth),height:n.getBoundingClientRect().height,border:c.borderTopStyle,borderWidth:parseFloat(c.borderLeftWidth)+parseFloat(c.borderRightWidth),hidden:!!n.closest('[aria-hidden=true]')};}),focusable:[...el.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(n=>!n.disabled&&n.tabIndex>=0).length,live:!!el.querySelector('[aria-live],[role=status],[role=alert]')})));
  observations.push({kind,label,expected,metrics:data});check(data.length===2&&data.map(n=>n.id).join(',')==='force,distance',label+': effort and hand-travel pairs remain available');
  for(const row of data){
   const baseline=expected.saved[row.id],now=expected.now[row.id],unit=row.id==='force'?'N':'m',direction=now===null?'unavailable':Math.abs(now-baseline)<=1e-9*Math.max(1,Math.abs(baseline))?'same':now<baseline?'less':'more';
   check(row.title===(row.id==='force'?'Effort needed':'Your hand moves')&&row.direction===direction&&row.badge===({unavailable:'—',same:'= Same',less:'↓ Less',more:'↑ More'}[direction]),label+' '+row.id+': heading and direction agree with independent ideal mechanics');
   check(row.values.length===2&&row.values.every(n=>n.tag==='DD'&&n.labelTag==='DT'&&n.list==='DL'&&n.label===(n.side==='saved'?'Saved':'Now')),label+' '+row.id+': saved/current labels use native definition-list semantics');
   for(const v of row.values){const wanted=expected[v.side][row.id];check((wanted===null?v.raw===null:Math.abs(Number(v.raw)-wanted)<=Math.max(1,Math.abs(wanted))*1e-12)&&v.text===formatted(wanted,unit),label+' '+row.id+' '+v.side+': full-precision value and three-place display are correct');}
   const scale=Math.max(baseline,now||0,1e-12);
   for(const bar of row.bars){const value=expected[bar.side][row.id],pct=value===null?0:value/scale*100,serialized=await pg.evaluate(p=>{const n=document.createElement('div');n.style.width=p+'%';return n.style.width;},pct),pixels=Math.max(bar.borderWidth,bar.track*parseFloat(serialized)/100);check(bar.width===serialized&&Math.abs(bar.rect-pixels)<.1&&bar.height===16&&bar.hidden&&bar.border===(bar.side==='saved'?'dashed':'solid'),label+' '+row.id+' '+bar.side+': decorative sixteen-pixel bar shares the pair scale and its original pattern');}
   check(!row.focusable&&!row.live,label+' '+row.id+': reading card adds no keyboard stops or live announcements');
  }
 }
 async function layout(label,doubled=false){
  await panel().scrollIntoViewIfNeeded();await settle();
  const data=await panel().evaluate(el=>{
   const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
   const rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number),lum=c=>rgb(c).slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
   const background=n=>{let p=n,bg=getComputedStyle(p).backgroundColor;while(rgb(bg)[3]===0&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}return bg;};
   const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   return{viewport:innerWidth,pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,cards:[...el.querySelectorAll('[data-ml-reference-metric]')].map(c=>({rect:rect(c),fits:c.scrollWidth<=c.clientWidth+1,text:[...c.querySelectorAll('h4,dt,dd,[data-ml-reference-direction]')].map(n=>({tag:n.tagName,text:n.textContent,size:parseFloat(getComputedStyle(n).fontSize),contrast:contrast(getComputedStyle(n).color,background(n)),fits:n.scrollWidth<=n.clientWidth+1,rect:rect(n)})),bars:[...c.querySelectorAll('[data-ml-reference-bar]')].map(n=>({side:n.dataset.mlReferenceBar,contrast:contrast(getComputedStyle(n).borderTopColor,background(n.parentElement)),rect:rect(n)}))}))};
  });observations.push({label,layout:data});const scale=doubled?2:1;
  check(data.pageFits&&data.panelFits&&data.cards.every(c=>c.fits&&c.text.every(t=>t.fits&&t.rect.left>=c.rect.left-1&&t.rect.right<=c.rect.right+1)),label+': page, reading cards and all labels/values fit without horizontal overflow');
  check(data.cards.every(c=>c.text.every(t=>t.size>=(t.tag==='H4'?16:t.tag==='DD'?24:14)*scale)),label+': heading, direction, labels and values retain the enlarged text hierarchy');
  check(data.cards.every(c=>c.text.every(t=>t.contrast>=4.5)&&c.bars.every(n=>n.contrast>=3)),label+': reading text and both bar patterns retain visible contrast');
  check(data.cards.every(c=>c.text.filter(t=>t.tag==='DT').every((t,i)=>{const v=c.text.filter(n=>n.tag==='DD')[i];return v&&(v.rect.left>=t.rect.right-1||v.rect.top>=t.rect.bottom-1);})&&c.bars.every(b=>b.rect.left>=c.rect.left&&b.rect.right<=c.rect.right)),label+': each reading sits beside or below its label and bar endpoints remain inside their card');
  const tokens=await cards().locator('[data-ml-reference-value]').evaluateAll(ns=>ns.map(n=>{const token=n.textContent.split(' ')[0],range=document.createRange();range.setStart(n.firstChild,0);range.setEnd(n.firstChild,token.length);return{metric:n.closest('[data-ml-reference-metric]').dataset.mlReferenceMetric,side:n.dataset.mlReferenceValue,token,width:n.clientWidth,rects:[...range.getClientRects()].map(r=>({x:r.x,y:r.y,width:r.width,height:r.height}))};}));
  observations.push({label,numericTokens:tokens});check(tokens.length===4&&tokens.every(n=>n.rects.length===1&&n.rects[0].width<=n.width+1),label+': every numeric token stays on one line with its digits intact');
  if(data.viewport<=390)check(data.cards[1].rect.top>=data.cards[0].rect.bottom,label+': phone places the reading cards in a clear vertical sequence');
 }
 async function fixedWork(label){const current=await state();check(Object.keys(preserved).every(key=>JSON.stringify(current[key])===JSON.stringify(preserved[key])),label+': unrelated saved calculation, draft and explanation stay fixed');}
 async function shot(name){await panel().screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});}
 try{
  check(before[0].sha256===expectedHash&&before[1].sha256===expectedHash,'Production source and public mirror match the frozen revision');
  for(const kind of Object.keys(settings)){
   await mount(kind);check(!await panel().evaluate(n=>n.open),kind+': comparison initially stays behind its native disclosure');await reveal();check(await cards().count()===0,kind+': no comparison readings appear before saving a setup');
   const initial=snapshot(kind,await state());await press(panel().locator('[data-ml-save-reference]'));check(JSON.stringify((await state()).benchReferences[kind])===JSON.stringify(initial),kind+': keyboard save stores exactly the current station settings');await metrics(kind,kind+' same');
   await slide(main[kind],'ArrowRight');await metrics(kind,kind+' increased geometry');await layout(kind+' desktop');
   if(kind==='lever'){
    await shot('desktop-comparison');console.log('desktop screenshot ready',path.join(OUT,'desktop-comparison.png'));await pg.setViewportSize({width:900,height:1100});await layout('900px narrow desktop');await shot('narrow-desktop-comparison');await pg.setViewportSize({width:1180,height:1100});await settle();
    await press(panel().locator('[data-ml-keep-comparison]'));const record=JSON.stringify((await state()).benchExperiments.lever),evidence=await panel().locator('[data-ml-experiment]').innerText();check(!!JSON.parse(record).after&&JSON.parse(record).after.settings.leverEffortArm===2.1,'Keyboard keep stores the changed lever setup');
    await slide(main[kind],'ArrowRight');await metrics(kind,'Lever moved after keeping evidence');check(JSON.stringify((await state()).benchExperiments.lever)===record&&await panel().locator('[data-ml-experiment]').innerText()===evidence,'Recorded comparison and table remain fixed after moving another step');
    await press(panel().getByRole('button',{name:'Restore saved setup',exact:true}));await pg.waitForFunction(()=>document.activeElement?.id==='ml-leverEffortArm');await metrics(kind,'Restored lever');check(JSON.stringify(snapshot(kind,await state()))===JSON.stringify(initial)&&JSON.stringify((await state()).benchExperiments.lever)===record,'Restore resets all station settings, focuses the slider and preserves evidence');
   }else{await slide(main[kind],'ArrowLeft');await metrics(kind,kind+' restored by keyboard');}
   await slide(main[kind],'ArrowLeft');await metrics(kind,kind+' decreased geometry');
   if(kind==='ramp'){await slide('rampLength','Home');await metrics(kind,'Invalid ramp geometry');check(await panel().locator('[data-ml-save-reference]').isDisabled()&&await panel().locator('[data-ml-keep-comparison]').isDisabled(),'Invalid ramp geometry disables saving both setup and evidence');await layout('Invalid ramp');await press(panel().getByRole('button',{name:'Restore saved setup',exact:true}));await metrics(kind,'Recovered ramp');}
   await fixedWork(kind);
  }
  await mount('windlass',390,{dark:true,band:'g912'},{benchReferences:{windlass:{windlassHandleR:[],windlassDrumR:.1,windlassLoad:400,loadDistance:.5}}});await reveal();check(await cards().count()===0,'Invalid saved reference does not render comparison cards');await press(panel().locator('[data-ml-save-reference]'));await slide('windlassHandleR','End');await metrics('windlass','Dark phone wheel and axle');await layout('Dark phone');await fixedWork('Dark phone');await shot('dark-phone-comparison');
  await mount('screw',320,{contrast:true});await reveal();await press(panel().locator('[data-ml-save-reference]'));await slide('screwHandleR','End');await slide('screwPitch','Home');await metrics('screw','Extreme screw mechanical advantage');
  const rules=await cards().evaluateAll(ns=>ns.flatMap(el=>[...el.querySelectorAll('h4,dt,dd,[data-ml-reference-direction]')].map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let a=n;while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '[data-ml-reference-metric='+el.dataset.mlReferenceMetric+'] > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';})).join('\n'));
  const enlarged=await pg.addStyleTag({content:rules});await settle();await layout('Forced 320px doubled reading text',true);await metrics('screw','Forced doubled screw readings');await fixedWork('Forced doubled text');await shot('forced-doubled-comparison');await enlarged.evaluate(n=>n.remove());
  for(const band of ['k2','g35']){await mount('lever',900,{band},{benchReferences:{lever:{leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:.5}}});check(await panel().count()===0,band+': numerical comparison remains absent for younger learners');await fixedWork(band);}
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;}
 finally{
  await b.close();const base=fs.realpathSync(OUT),temporary=path.resolve(OUT,'browser-temp');if(fs.existsSync(temporary)){const resolved=fs.realpathSync(temporary);if(path.dirname(resolved)!==base)throw Error('Temporary path escaped run');fs.rmSync(resolved,{recursive:true,force:true});}if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,mounts,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
