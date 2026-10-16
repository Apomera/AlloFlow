// Native React/Three QA. Observe the existing clock and normalized pose; do not change it.
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
 const checks=[],observations=[],shots=[],startedAt=new Date().toISOString();
 const hash=p=>require('crypto').createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_live_task_distance_qa.cjs','dev-tools/ml_scene_shots.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)}));
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const panel=pg.locator('.ml-task-distances'),slider=pg.locator('#ml-shop-stroke'),bay=pg.locator('.ml-shop-bay');
 const run=()=>pg.getByRole('button',{name:/^Run the three-dimensional/});
 const settle=()=>pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const ma={lever:2,pulley:2,windlass:4.5,ramp:4,wedge:5,screw:60*Math.PI};
 const numeric=(n)=>n.toLocaleString('en-US',{useGrouping:false,maximumSignificantDigits:6})+' m';
 async function mount(kind,width=1180,theme={},extra={}){
  await pg.setViewportSize({width,height:1100});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'on',shopSlowMotion:true,shopFocusMechanism:true,shopMotionProgress:.37,designReflection:'Preserve my explanation.',benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}},...extra}),{band:'g68',...theme}]);
  await bay.scrollIntoViewIfNeeded();if(await panel.count())await pg.waitForFunction(k=>window.__qaShop?.mlDemo?.kind===k,kind);await settle();
 }
 async function sample(label,p,ratio,load=.5){
  await pg.waitForFunction(p=>Math.abs(window.__qaState.shopMotionProgress-p)<1e-9,p);await settle();
  const data=await panel.evaluate(el=>({position:el.querySelector('[data-ml-task-position]').textContent,scope:el.textContent,rows:[...el.querySelectorAll('[data-ml-task-distance-row]')].map(n=>{const value=n.querySelector('[data-ml-task-distance-value]'),extent=n.querySelector('[data-ml-task-distance-extent]'),fill=n.querySelector('[data-ml-task-distance-fill]');return{id:n.dataset.mlTaskDistanceRow,value:value.textContent,total:n.querySelector('[data-ml-task-distance-total]').textContent,extent:parseFloat(extent.style.width),fill:fill.getBoundingClientRect().width/extent.parentElement.clientWidth*100,live:!!value.closest('[aria-live],[role=status],[role=alert]')};})}));
  observations.push({label,p,ratio,load,data});check(data.position===Math.round(p*100)+'%',label+': position agrees with held fraction');
  check(data.rows.length===2&&data.rows.every(r=>!r.live),label+': both readable values remain outside live regions');
  for(const row of data.rows){const total=load*(row.id==='effort'?ratio:1),expected=total/Math.max(load,load*ratio)*100;
   check(row.value===numeric(total*p)&&row.total==='Full task: '+numeric(total),label+' '+row.id+': modeled task numbers use full-precision fraction');
   check(Math.abs(row.extent-expected)<.0001&&Math.abs(row.fill-expected*p)<.15,label+' '+row.id+': shared scale and proportional fill');
  }
  check(data.scope.includes('3D motion illustrates')&&data.scope.includes('not cumulative travel'),label+': illustrative mapping and reset explained');
  // The host suspends offscreen rendering; bring the bay into view before inspecting meshes.
  await bay.scrollIntoViewIfNeeded();await pg.waitForFunction(p=>{const s=window.__qaShop,d=s.mlDemo;return Math.abs((d.effortDot.position.x-d.effortStartX)/(d.effortEndX-d.effortStartX)-p)<1e-8;},p);
  const actual=await pg.evaluate(()=>{const s=window.__qaShop,d=s.mlDemo;return (d.effortDot.position.x-d.effortStartX)/(d.effortEndX-d.effortStartX);});
  observations.push({label,expectedPose:p,renderedPose:actual});
  check(Math.abs(actual-p)<1e-8,label+': fraction agrees with rendered normalized distance rail');
 }
 async function layout(label,doubled=false){
  const data=await panel.evaluate(el=>{const rgb=c=>c.match(/[\d.]+/g).map(Number),lum=c=>rgb(c).slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);return{pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,clipped:[...el.querySelectorAll('h3,strong,span,p,dt,dd')].filter(n=>n.clientWidth&&n.scrollWidth>n.clientWidth+1).map(n=>n.textContent),title:parseFloat(getComputedStyle(el.querySelector('h3')).fontSize),values:[...el.querySelectorAll('[data-ml-task-distance-value]')].map(n=>parseFloat(getComputedStyle(n).fontSize)),bars:[...el.querySelectorAll('[data-ml-task-distance-extent]')].map(n=>{const s=getComputedStyle(n),bg=getComputedStyle(n.parentElement).backgroundColor;return{color:s.color,bg,contrast:(Math.max(lum(s.color),lum(bg))+.05)/(Math.min(lum(s.color),lum(bg))+.05),pattern:getComputedStyle(n.querySelector('[data-ml-task-distance-fill]')).backgroundImage};})};});
  observations.push({label,layout:data});check(data.pageFits&&data.panelFits&&!data.clipped.length,label+': no clipped text or horizontal overflow');
  check(data.title>=(doubled?36:18)&&data.values.every(x=>x>=(doubled?48:24)),label+': prominent title and values');
  check(data.bars.every(x=>x.contrast>=3)&&data.bars[0].pattern==='none'&&data.bars[1].pattern.includes('repeating-linear-gradient'),label+': visible solid/striped distinction');
 }
 async function start(){
  await pg.evaluate(()=>{window.__qaFrames=[];window.__qaObserve=(p,id,kind,phase)=>{if(!id)return;const el=document.querySelector('.ml-task-distances');if(!el)return;window.__qaFrames.push({p,id,kind,phase,position:el.querySelector('[data-ml-task-position]').textContent,fill:el.style.getPropertyValue('--ml-task-position'),values:[...el.querySelectorAll('[data-ml-task-distance-value]')].map(n=>n.textContent)});};});
  await run().click();await pg.locator('.ml-demo-phase').waitFor();await bay.scrollIntoViewIfNeeded();
 }
 async function frames(kind,ratio,requireReturn=true){
  const frames=await pg.evaluate(()=>window.__qaFrames);const wrong=frames.filter(f=>f.position!==Math.round(f.p*100)+'%'||Math.abs(parseFloat(f.fill)-f.p*100)>1e-7||f.values[0]!==numeric(.5*ratio*f.p)||f.values[1]!==numeric(.5*f.p));
  observations.push({label:kind+' real-clock audit',samples:frames.length,wrong,phases:[...new Set(frames.map(f=>f.phase))]});
  check(frames.length>0&&!wrong.length,kind+': every observed real-clock frame has matching scaled task values');
  if(requireReturn){const work=frames.filter(x=>x.phase==='work'),back=frames.filter(x=>x.phase==='return');check(work.length>1&&back.length>1&&work.at(-1).p>work[0].p&&back.at(-1).p<back[0].p,kind+': readings rise during work and fall during return');}
 }
 async function hold(kind,ratio,waitForReturn=false){
  const button=pg.locator('.ml-demo-phase').getByRole('button',{name:'Inspect this pose',exact:true});await button.focus();
  await button.evaluate(el=>el.addEventListener('click',()=>{const s=window.__qaShop,d=s.mlDemo;s.model.updateMatrixWorld(true);window.__qaHeld={p:(d.effortDot.position.x-d.effortStartX)/(d.effortEndX-d.effortStartX),pose:[d.motion,d.effortDot,d.loadDot].map(o=>o.matrixWorld.toArray()),draft:JSON.stringify(window.__qaState.benchPower),note:window.__qaState.designReflection};},{once:true,capture:true}));
  if(waitForReturn)await pg.waitForFunction(()=>{const f=window.__qaFrames.at(-1);return window.__qaState.shopAnimating&&f?.phase==='return'&&f.p<.85;});
  await pg.keyboard.press('Enter');await pg.waitForFunction(()=>document.activeElement?.id==='ml-shop-stroke'&&window.__qaShop.data.static);await settle();
  const prior=await pg.evaluate(()=>window.__qaHeld);await sample(kind+' held',prior.p,ratio);
  check(await pg.evaluate(()=>{const s=window.__qaShop,d=s.mlDemo;s.model.updateMatrixWorld(true);return JSON.stringify([d.motion,d.effortDot,d.loadDot].map(o=>o.matrixWorld.toArray()))===JSON.stringify(window.__qaHeld.pose)&&JSON.stringify(window.__qaState.benchPower)===window.__qaHeld.draft&&window.__qaState.designReflection===window.__qaHeld.note;}),kind+': Hold preserves exact geometry, draft work and explanation');
 }
 async function shot(name,context=false){
  if(context){await panel.scrollIntoViewIfNeeded();const clip=await panel.evaluate(el=>{const a=document.querySelector('.ml-shop-bay').getBoundingClientRect(),b=el.getBoundingClientRect();return{x:a.x+scrollX,y:a.y+scrollY,width:a.width,height:b.bottom-a.top};});await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip,animations:'disabled'});}
  else await panel.screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});
  shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});
 }
 try{
  for(const [kind,ratio] of Object.entries(ma)){
   await mount(kind);await sample(kind+' initial',.37,ratio);await slider.press('Home');await sample(kind+' start',0,ratio);await slider.press('End');await sample(kind+' full',1,ratio);
   await start();await pg.waitForFunction(()=>window.__qaFrames.some(f=>f.phase==='work'&&f.p>.15));
   await pg.getByRole('button',{name:'Show the machine from the side',exact:true}).click();await bay.scrollIntoViewIfNeeded();
   await hold(kind,ratio,true);await frames(kind,ratio);await layout(kind);
  }
  for(const [label,extra,ratio] of [['equal',{leverEffortArm:1,leverLoadArm:1},1],['reverse',{leverEffortArm:.2,leverLoadArm:4},.05]]){await mount('lever',1180,{},extra);await sample(label,.37,ratio);await layout(label);}
  await mount('ramp',1180,{}, {loadDistance:2});await sample('changed task distance',.37,4,2);await shot('desktop-ramp-distances',true);
  await mount('screw',320,{dark:true});await sample('dark phone',.37,ma.screw);await layout('dark phone');await shot('dark-phone-distances');
  await mount('pulley',320,{contrast:true});await sample('forced phone',.37,2);
  const rules=await panel.evaluate(el=>[...el.querySelectorAll('*')].filter(n=>[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())).map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let a=n;while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '.ml-task-distances > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';}).join('\n'));
  const enlarged=await pg.addStyleTag({content:rules});await settle();await layout('forced doubled text',true);await shot('forced-doubled-distances');await enlarged.evaluate(n=>n.remove());
  await mount('screw',1180,{}, {motionPref:'off'});await start();await pg.waitForFunction(()=>window.__qaFrames.some(f=>f.phase==='held'));await frames('motion off',ma.screw,false);await hold('motion off',ma.screw);
  await mount('lever',1180,{}, {shopSlowMotion:false});await start();await pg.waitForFunction(()=>!window.__qaState.shopAnimating);await settle();check(await panel.locator('[data-ml-task-position]').textContent()==='0%','Natural completion resets modeled task position');
  await start();await pg.locator('#ml-bench-tab-pulley').click();await pg.waitForFunction(()=>window.__qaShop?.mlDemo?.kind==='pulley');await settle();check(await panel.locator('[data-ml-task-distance-total=effort]').textContent()==='Full task: 1 m'&&await panel.locator('[data-ml-task-position]').textContent()==='0%','Switching stations discards the previous run position');
  for(const band of ['k2','g35']){await mount('lever',1180,{band});check(await panel.count()===0,band+': numeric task-distance panel omitted');}
  for(const extra of [{loadDistance:0},{loadDistance:-1},{loadDistance:4},{leverLoadArm:0}]){await mount('lever',1180,{},extra);check(await panel.count()===0,'Invalid raw task settings omit modeled readings: '+JSON.stringify(extra));}
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;}
 finally{
  await b.close();const base=fs.realpathSync(OUT),temp=path.resolve(OUT,'browser-temp');if(fs.existsSync(temp)){const resolved=fs.realpathSync(temp);if(path.dirname(resolved)!==base)throw Error('Temporary path escaped run');fs.rmSync(resolved,{recursive:true,force:true});}if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
