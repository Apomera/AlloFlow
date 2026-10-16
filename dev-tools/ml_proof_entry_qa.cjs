// Real React/THREE verification of the Prove it practice entry.
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
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_proof_entry_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)})),expectedHash=process.env.ML_EXPECTED_SOURCE;
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const panel=()=>pg.locator('.ml-proof-panel'),answer=()=>panel().locator('input'),checkButton=()=>panel().getByRole('button',{name:'Check',exact:true});
 const state=()=>pg.evaluate(()=>window.__qaState),settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const protectedKeys=['designReflection','benchPower','benchExperiments','benchReferences','shopMotionProgress','shopRotX','shopRotY','shopZoom'];
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
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',shopAnimating:false,shopMotionProgress:.5,shopRotX:10,shopRotY:20,shopZoom:1.2,designReflection:'Keep this explanation.',benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}},benchExperiments:{other:{note:'Keep saved evidence.'}},benchReferences:{other:{note:'Keep saved setup.'}},provenBenches:{pulley:true},...override}),{band:'g68',...theme}]);
  await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();await pg.waitForFunction(()=>{const c=document.querySelector('.ml-shop-bay canvas');if(!c||!c.width||!c.height)return false;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl&&!gl.isContextLost();});await settle();check(true,kind+': real THREE canvas initialized');
  await panel().scrollIntoViewIfNeeded();await settle();console.log('native mount',mounts,kind,theme.band||'g68');
 }
 async function press(button){await button.focus();await pg.keyboard.press('Enter');await settle();}
 async function fill(value){await answer().fill(String(value));await settle();}
 async function semantics(label,choice=false){
  const data=await panel().evaluate(el=>({heading:el.querySelector('h3')?.textContent,inputs:[...el.querySelectorAll('input')].map(n=>({id:n.id,label:n.getAttribute('aria-label'),type:n.type,mode:n.inputMode,labels:[...n.labels].map(x=>x.textContent)})),choices:[...el.querySelectorAll('.ml-proof-choice')].map(n=>({tag:n.tagName,pressed:n.getAttribute('aria-pressed'),text:n.textContent})),svg:[...el.querySelectorAll('svg')].map(n=>({hidden:n.getAttribute('aria-hidden'),focusable:n.getAttribute('focusable')})),statuses:[...el.querySelectorAll('[role=status]')].map(n=>({atomic:n.getAttribute('aria-atomic'),text:n.textContent}))}));observations.push({label,semantics:data});
  check(data.heading.startsWith('Prove it'),label+': practice has its existing named heading');
  check(data.svg.length>=1&&data.svg.every(n=>n.hidden==='true'&&n.focusable==='false'),label+': practice illustrations are decorative and unfocusable');
  check(choice?data.inputs.length===0&&data.choices.length===3&&data.choices.every(n=>n.tag==='BUTTON'&&['true','false'].includes(n.pressed)):data.choices.length===0&&data.inputs.length===1&&data.inputs.every(n=>n.type==='text'&&n.mode==='decimal'&&n.label==='Your predicted effort force in newtons'&&n.labels.includes(n.label)),label+': native controls keep names and correct grade branch');
  check(data.statuses.every(n=>n.atomic==='true'&&n.text.length>0),label+': feedback remains an atomic status announcement');
 }
 async function result(label,expected,calculation){
  const s=await state();check(s.benchResult?.ok===(expected==='correct'),label+': stored result is accurate');
  check(await panel().locator('[data-ml-proof-result='+expected+']').count()===1,label+': feedback displays the matching result');
  check(await panel().locator('.ml-proof-calculation').count()===(calculation?1:0),label+': calculation reveal follows the existing answer rule');
  check(await panel().locator('[role=status]').count()===1,label+': result has one status region');
  if(calculation){
   const d=await panel().evaluate(el=>{const s=window.__qaState,M=window.__mlMath(),b=s.bench,ma=b==='lever'?M.leverMA(s.leverEffortArm,s.leverLoadArm):b==='ramp'?M.rampMA(s.rampLength,s.rampHeight):M.screwMA(s.screwHandleR,s.screwPitch);return{load:s[b+'Load'],ma,effort:M.effortForce(s[b+'Load'],ma),values:[...el.querySelectorAll('.ml-proof-value')].map(n=>n.textContent),labels:[...el.querySelectorAll('[data-ml-calculation-step]')].map(n=>n.textContent)};});observations.push({label,calculation:d});
   check(d.values.length===3&&d.values.every(v=>/\d/.test(v)),label+': three numeric calculation tiles are present');
   check(Math.abs(parseFloat(d.values[0].replace(/,/g,''))-d.load)<1&&Math.abs(parseFloat(d.values[1].replace(/,/g,''))-d.ma)<=.0051&&Math.abs(parseFloat(d.values[2].replace(/,/g,''))-d.effort)<=.051,label+': displayed load, MA and effort match the live model rounding');
  }
 }
 async function layout(label,doubled=false){
  await panel().scrollIntoViewIfNeeded();await settle();const data=await panel().evaluate(el=>{
   const box=n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};},root=box(el),rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number),lum=c=>rgb(c).slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
   const bg=n=>{let p=n,b=getComputedStyle(p).backgroundColor;while(rgb(b)[3]===0&&p.parentElement){p=p.parentElement;b=getComputedStyle(p).backgroundColor;}return b;},contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   const nodes=[...el.querySelectorAll('*')].filter(n=>!n.closest('svg')&&n.tagName!=='STYLE'&&n.getBoundingClientRect().height&&[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()));
   return{viewport:innerWidth,pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,root,controls:[...el.querySelectorAll('button,input')].filter(n=>n.getBoundingClientRect().height).map(n=>({text:n.textContent,box:box(n)})),text:nodes.map(n=>({text:n.textContent,box:box(n),font:parseFloat(getComputedStyle(n).fontSize),contrast:contrast(getComputedStyle(n).color,bg(n)),ranges:[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()).flatMap(c=>{const range=document.createRange();range.selectNodeContents(c);return [...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));}),words:[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()).flatMap(c=>[...c.textContent.matchAll(/\S+/g)].map(m=>{const r=document.createRange();r.setStart(c,m.index);r.setEnd(c,m.index+m[0].length);return{text:m[0],pieces:r.getClientRects().length};}))}))};
  });observations.push({label,layout:data});
  check(data.panelFits&&data.controls.every(n=>n.box.left>=data.root.left-1&&n.box.right<=data.root.right+1),label+': proof controls fit the container');
  check(data.controls.every(n=>n.box.height>=44),label+': practice controls keep at least 44px targets');
  check(data.text.every(n=>n.ranges.every(r=>r.left>=n.box.left-1&&r.right<=n.box.right+1)),label+': text stays inside its boxes');
  check(data.text.every(n=>n.contrast>=4.5),label+': practice text retains readable contrast');
  check(data.text.every(n=>n.words.every(w=>w.pieces===1)),label+': words and formatted numbers remain whole');
  check(data.text.find(n=>n.text==='Prove it').font>=20*(doubled?2:1),label+': practice heading has a readable size');
 }
 async function doubledText(){
  const css=await panel().evaluate(el=>[...el.querySelectorAll('*')].filter(n=>!n.closest('svg')&&n.tagName!=='STYLE'&&([...'INPUT'.split(' ')].includes(n.tagName)||[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()))).map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let a=n;while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '.ml-proof-panel > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';}).join('\n'));await pg.addStyleTag({content:css});await settle();
 }
 async function shot(name){await panel().screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});console.log('screenshot ready',name);}
 async function keyboardFocus(choice=false){
  const target=choice?panel().locator('.ml-proof-choice').first():answer();await target.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');
  const d=await pg.evaluate(()=>({tag:document.activeElement.tagName,cls:document.activeElement.className,visible:document.activeElement.matches(':focus-visible'),style:getComputedStyle(document.activeElement).outlineStyle,width:parseFloat(getComputedStyle(document.activeElement).outlineWidth)}));
  check((choice?d.cls.includes('ml-proof-choice'):d.tag==='INPUT')&&d.visible&&d.style==='solid'&&d.width>=3,'Keyboard focus is visible on '+(choice?'choice card':'answer input'));
 }
 try{
  check(!!expectedHash&&before[0].sha256===expectedHash&&before[1].sha256===expectedHash,'Production source and public mirror match the frozen revision');
  await mount('lever',1180);const initial=protectedSnapshot(await state());
  await semantics('Desktop unanswered');check(await panel().locator('.ml-proof-calculation,.ml-proof-feedback').count()===0,'Unanswered typed practice does not reveal feedback or calculation');await keyboardFocus();await layout('Desktop unanswered');await shot('desktop-proof-entry');
  await press(checkButton());await result('Blank typed answer','retry',false);check((await state()).benchStreak===0,'Blank answer resets the streak without proving the bench');
  await fill('not a number');await answer().press('Enter');await settle();await result('Nonfinite typed answer','retry',false);
  await fill('100');check(await panel().locator('.ml-proof-feedback').count()===0,'Editing clears stale feedback');await press(checkButton());await result('Incorrect typed answer','retry',true);await layout('Desktop retry');
  await fill('200');await answer().press('Enter');await settle();await result('Correct typed Enter','correct',true);await semantics('Desktop correct');await layout('Desktop correct');await shot('desktop-proof-correct');
  check((await state()).provenBenches.lever===true&&(await state()).provenBenches.pulley===true&&(await state()).benchStreak===1,'Correct Enter proves current bench, increments streak and retains another proven bench');check(protectedSnapshot(await state())===initial,'Typed proof preserves camera, pose, saved setup, evidence and other skill practice');
  await mount('ramp',390,{dark:true,band:'g35'});const darkInitial=protectedSnapshot(await state());await semantics('Dark phone g35');await fill('50');await press(checkButton());await result('g35 retry','retry',true);await fill('100');await press(checkButton());await result('g35 correct','correct',true);await layout('Dark phone g35');await shot('dark-phone-proof');check(protectedSnapshot(await state())===darkInitial,'g35 proof preserves existing practice and evidence');
  await mount('lever',390,{band:'k2'});const choiceInitial=protectedSnapshot(await state());await semantics('k2 unanswered',true);await keyboardFocus(true);check(await panel().locator('.ml-proof-feedback,.ml-proof-calculation').count()===0,'Unanswered k2 choices do not reveal feedback or calculation');
  await press(panel().getByRole('button',{name:'Push right next to the middle',exact:true}));await result('k2 retry','retry',false);await semantics('k2 retry',true);await layout('k2 retry');
  await press(panel().getByRole('button',{name:'Push far from the middle',exact:true}));await result('k2 correct','correct',false);await semantics('k2 correct',true);await layout('k2 correct');await shot('young-learner-proof');check(await panel().locator('.ml-proof-choice[aria-pressed=true]').count()===1,'Only the chosen k2 card is pressed');check(protectedSnapshot(await state())===choiceInitial,'k2 proof preserves existing practice and evidence');
  await mount('screw',320,{contrast:true},{screwHandleR:.5,screwPitch:.001,screwLoad:5000,loadDistance:3});await fill('1.59154943');await answer().press('Enter');await settle();await result('Forced screw correct','correct',true);await doubledText();await semantics('Forced320 doubled proof');await layout('Forced320 doubled proof',true);await shot('forced-doubled-proof');
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;try{await shot('failure-proof');}catch(snapshotError){errors.push('Failure screenshot: '+snapshotError);}}
 finally{
  await b.close();clearBrowserTemp(false);if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,mounts,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
