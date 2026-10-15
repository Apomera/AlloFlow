// Real-clock playback QA. Instrumentation only observes poses and tool state.
const fs=require('fs'),path=require('path'),vm=require('vm');
const report=path.resolve(process.argv[2]),temp=path.join(report,'browser-temp');fs.mkdirSync(temp,{recursive:true});
process.env.TEMP=temp;process.env.TMP=temp;process.env.PLAYWRIGHT_BROWSERS_PATH=process.env.PLAYWRIGHT_BROWSERS_PATH||'C:/Users/cabba/AppData/Local/ms-playwright';
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');
source=source.slice(0,source.indexOf('  const manifest = [];'))
 .replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2]);")
 .replace('deviceScaleFactor: 2','deviceScaleFactor: 1')
 .replace('var ctx = {','window.__qaState=pair[0].machineLab; var ctx = {')
 .replace("const tool = read('stem_lab/stem_tool_machinelab.js');",String.raw`const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}').replace('onPose: recordShopPhase,','onPose: function(p,id,kind,phase){recordShopPhase(p,id,kind,phase);if(window.__qaObserve)window.__qaObserve(p,id,kind,phase);},');`);
source+=String.raw`
 const checks=[],observations=[],shots=[];
 const hash=file=>require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_live_motion_qa.cjs','dev-tools/ml_scene_shots.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)})),startedAt=new Date().toISOString();
 const phase=()=>pg.locator('.ml-demo-phase'),bay=()=>pg.locator('.ml-shop-bay'),run=()=>pg.getByRole('button',{name:/^Run the three-dimensional/}),inspect=()=>phase().getByRole('button',{name:'Inspect this pose',exact:true});
 const check=(ok,label)=>{checks.push(label);if(!ok)throw Error(label);};
 const settle=()=>pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 async function mount(kind,width=1180,theme={},extra={}){
  await pg.setViewportSize({width,height:1100});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'on',shopSlowMotion:true,shopFocusMechanism:true,designReflection:'Keep this note.',benchReferences:{lever:{leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:.5}},...extra}),theme]);
  await bay().scrollIntoViewIfNeeded();await pg.waitForFunction(kind=>window.__qaShop?.mlDemo?.kind===kind,kind);await settle();check(await phase().count()===0,kind+': strip is absent while idle');
 }
 async function start(){
  await pg.evaluate(()=>{
   window.__qaFrames=[];window.__qaPhaseMutations=[];window.__qaObserve=(p,id,kind,phase)=>{
    const el=document.querySelector('.ml-demo-phase');if(!el||!id)return;
    window.__qaFrames.push({p,id,kind,phase,number:el.querySelector('[data-ml-live-stroke]').textContent,fill:el.style.getPropertyValue('--ml-live-stroke'),inspector:document.querySelector('[data-ml-stroke-readout]').textContent});
   };
  });await run().click();await phase().waitFor();await phase().scrollIntoViewIfNeeded();
  await pg.evaluate(()=>{window.__qaPhaseObserver?.disconnect();const label=document.querySelector('[data-ml-demo-phase-label]');window.__qaPhaseObserver=new MutationObserver(()=>window.__qaPhaseMutations.push(label.textContent));window.__qaPhaseObserver.observe(label,{childList:true,subtree:true,characterData:true});});
 }
 async function layout(label,doubled=false){
  const v=await phase().evaluate(el=>{const number=el.querySelector('[data-ml-live-stroke]'),status=el.querySelector('[role=status]'),button=el.querySelector('button'),rect=button.getBoundingClientRect(),style=getComputedStyle(button),stages=el.querySelector('.ml-demo-phase-stages');return{named:el.getAttribute('role')==='group'&&el.getAttribute('aria-label')==='Live motion',status:status.textContent,numericOutsideStatus:!status.contains(number)&&!number.closest('[aria-live],[role=status],[role=alert]'),numberSize:parseFloat(getComputedStyle(number).fontSize),labelSize:parseFloat(getComputedStyle(status).fontSize),buttonHeight:rect.height,buttonType:button.type,buttonFont:parseFloat(style.fontSize),buttonEnabled:!button.disabled,stagesHidden:getComputedStyle(stages).display==='none',fits:document.documentElement.scrollWidth<=innerWidth+1&&el.scrollWidth<=el.clientWidth+1,clipped:[...el.querySelectorAll('span,button,[role=status]')].filter(n=>n.clientWidth&&n.scrollWidth>n.clientWidth+1).map(n=>n.textContent)};});
  const colors=await phase().evaluate(el=>{
   const rgb=c=>c.match(/[\d.]+/g).map(Number),lum=c=>rgb(c).slice(0,3).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0),contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   return [...el.querySelectorAll('[data-ml-phase-segment]')].filter(n=>n.getClientRects().length).map(n=>{const s=getComputedStyle(n);let bg=s.backgroundColor,p=n;while(rgb(bg)[3]===0&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}return{text:n.textContent,phase:n.dataset.mlPhaseSegment,foreground:s.color,background:bg,border:s.borderColor,textContrast:contrast(s.color,bg),width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height};});
  });
  check(colors.every(c=>c.text.trim()&&c.textContrast>=4.5&&c.width>0&&c.height>0),label+': both phase cards retain readable text contrast');
  observations.push({label,stageColors:colors});
  check(v.named&&v.numericOutsideStatus,label+': named live-motion group announces only phase text');
  check(v.numberSize>=(doubled?60:30)&&v.labelSize>=(doubled?40:20),label+': large position and phase text');
  check(v.buttonHeight>=44&&v.buttonType==='button'&&v.buttonEnabled&&v.buttonFont>=(doubled?28:14),label+': inspection action is readable and reachable');
  check(v.fits&&!v.clipped.length,label+': strip fits without clipped text');observations.push({label,layout:v});
 }
 async function inspectKeyboard(key='Enter'){
  await inspect().focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');
  const focus=await inspect().evaluate(el=>{const s=getComputedStyle(el);return el===document.activeElement&&el.matches(':focus-visible')&&parseFloat(s.outlineWidth)>=3&&s.outlineStyle!=='none';});check(focus,'Inspect action has visible keyboard focus');
  await pg.evaluate(()=>{const button=document.querySelector('.ml-demo-phase button');button.addEventListener('click',()=>{const s=window.__qaShop;s.model.updateMatrixWorld(true);window.__qaBeforeHold={progress:(s.mlDemo.effortDot.position.x-s.mlDemo.effortStartX)/(s.mlDemo.effortEndX-s.mlDemo.effortStartX),pose:[s.mlDemo.motion,s.mlDemo.effortDot,s.mlDemo.loadDot].map(o=>o.matrixWorld.toArray()),note:window.__qaState.designReflection,records:JSON.stringify(window.__qaState.benchPowerRecords),draft:JSON.stringify(window.__qaState.benchPower)};},{capture:true,once:true});});
  await pg.keyboard.press(key);await pg.waitForFunction(()=>document.activeElement?.id==='ml-shop-stroke'&&!document.activeElement.disabled&&window.__qaShop.data.static);await settle();
  const v=await pg.evaluate(()=>{const s=window.__qaShop,prior=window.__qaBeforeHold;s.model.updateMatrixWorld(true);return{expected:prior.progress,actual:s.data.motionProgress,poseSame:JSON.stringify(prior.pose)===JSON.stringify([s.mlDemo.motion,s.mlDemo.effortDot,s.mlDemo.loadDot].map(o=>o.matrixWorld.toArray())),preserved:prior.note===window.__qaState.designReflection&&prior.records===JSON.stringify(window.__qaState.benchPowerRecords)&&prior.draft===JSON.stringify(window.__qaState.benchPower)};});
  check(await phase().count()===0&&Math.abs(v.expected-v.actual)<1e-8&&v.poseSame,'Inspect holds the exact rendered pose and removes the live strip');check(v.preserved,'Inspect preserves notes, saved records and draft practice');observations.push({label:'keyboard hold',...v});
 }
 async function frames(label,requireReturn=true){
  const v=await pg.evaluate(()=>{const frames=window.__qaFrames;return{count:frames.length,mismatch:frames.filter(f=>f.number!==Math.round(f.p*100)+'%'||f.fill!==Math.round(f.p*100)+'%'||f.inspector!==Math.round(f.p*100)+'%'),work:frames.filter(f=>f.phase==='work').map(f=>f.p),back:frames.filter(f=>f.phase==='return').map(f=>f.p),held:frames.filter(f=>f.phase==='held').map(f=>f.p),announcements:window.__qaPhaseMutations};});
  observations.push({label,frames:v.count,workSamples:v.work.length,returnSamples:v.back.length,heldSamples:v.held.length,announcements:v.announcements,mismatches:v.mismatch});
  check(v.count>0&&!v.mismatch.length,label+': every observed frame agrees with the real pose and inspector');
  if(requireReturn){check(v.work.length>1&&v.back.length>1&&v.work.at(-1)>v.work[0]&&v.back.at(-1)<v.back[0],label+': indicator advances with work and reverses on return');check(v.announcements.filter(x=>x==='Returning to start').length===1&&v.announcements.length===1,label+': only the phase boundary updates the live region');}
 }
 async function shot(name){await phase().scrollIntoViewIfNeeded();const clip=await phase().evaluate(el=>{const a=el.getBoundingClientRect(),b=document.querySelector('.ml-shop-bay').getBoundingClientRect();return{x:a.x+scrollX,y:a.y+scrollY,width:a.width,height:b.bottom-a.top};});await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip,animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});}
 try{
  for(const kind of ['lever','pulley','windlass','ramp','wedge','screw']){
   await mount(kind);if(kind==='lever'){const lab=pg.locator('[data-ml-power=lever]');await lab.locator(':scope>summary').click();await lab.locator('[data-ml-power-reveal]').click();await lab.locator('[data-ml-power-save]').click();await pg.locator('#ml-power-question-lever').selectOption('usefulPower');await pg.locator('#ml-power-answer-lever').fill('123.45');await lab.locator(':scope>summary').click();}
   await start();await layout(kind);await pg.waitForFunction(()=>window.__qaFrames.some(f=>f.phase==='return'&&f.p<.8));
   await pg.getByRole('button',{name:'Show the machine from the side',exact:true}).click();
   check(await phase().getAttribute('data-ml-demo-phase')==='return',kind+': camera rerender retains return phase');await frames(kind);await inspectKeyboard();
  }
  await mount('windlass');await start();await pg.waitForFunction(()=>window.__qaFrames.some(f=>f.phase==='work'&&f.p>.35));await shot('desktop-live-motion');await inspectKeyboard();
  await mount('pulley',320,{dark:true});await start();await layout('dark phone');await shot('dark-phone-live-motion');await inspectKeyboard('Space');
  await mount('lever',320,{contrast:true});await start();await phase().evaluate(el=>{const nodes=[...el.querySelectorAll('span,button,[role=status]')],sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.setProperty('font-size',sizes[i]*2+'px','important'));});await layout('forced doubled phone work',true);await pg.waitForFunction(()=>window.__qaFrames.some(f=>f.phase==='return'&&f.p<.85));await layout('forced doubled phone return',true);await shot('forced-doubled-live-motion');await inspectKeyboard('Space');
  await mount('screw',320,{}, {motionPref:'off'});await start();await layout('motion off');check(await phase().getAttribute('data-ml-demo-phase')==='held'&&!await phase().locator('.ml-demo-phase-stages').isVisible(),'Motion off keeps the full-stroke view without active stages');await frames('motion off',false);await inspectKeyboard();check(await pg.evaluate(()=>window.__qaState.shopMotionProgress===1),'Motion off inspection holds full stroke');
  await mount('lever',1180,{}, {shopSlowMotion:false});await start();await pg.waitForFunction(()=>window.__qaFrames.some(f=>f.phase==='return'&&f.p<.6));await frames('normal speed');await pg.waitForFunction(()=>!window.__qaState.shopAnimating);check(await phase().count()===0,'Natural completion removes the live strip');
  await start();await pg.locator('#ml-bench-tab-pulley').click();await pg.waitForFunction(()=>window.__qaShop?.mlDemo?.kind==='pulley');check(await phase().count()===0,'Switching stations removes the previous live strip');
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;}
 finally{
  await b.close();const base=fs.realpathSync(OUT),temp=path.resolve(OUT,'browser-temp');if(fs.existsSync(temp)){const resolved=fs.realpathSync(temp);if(path.dirname(resolved)!==base)throw Error('Temporary path escaped run');fs.rmSync(resolved,{recursive:true,force:true});}if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during native run');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,observations:observations.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
