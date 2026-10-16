// Exercises the real React/Three investigation, including keyboard and narrow layouts.
const fs=require('fs'),path=require('path'),vm=require('vm');
const report=path.resolve(process.argv[2]),temp=path.join(report,'browser-temp');fs.mkdirSync(temp,{recursive:true});
process.env.TEMP=temp;process.env.TMP=temp;
process.env.PLAYWRIGHT_BROWSERS_PATH=process.env.PLAYWRIGHT_BROWSERS_PATH||'C:/Users/cabba/AppData/Local/ms-playwright';
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');
source=source.slice(0,source.indexOf('  const manifest = [];'))
 .replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2]);")
 .replace('deviceScaleFactor: 2','deviceScaleFactor: 1')
 .replace('var ctx = {','window.__qaState=pair[0].machineLab; var ctx = {')
 .replace("const tool = read('stem_lab/stem_tool_machinelab.js');",String.raw`const tool = read('stem_lab/stem_tool_machinelab.js').replace('build: buildSimpleMachineScene','build: function(THREE,S,m){buildSimpleMachineScene(THREE,S,m);window.__qaShop=S;}');`);
source+=String.raw`
 const checks=[],observations=[],shots=[],startedAt=new Date().toISOString();
 const hash=file=>require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_investigation_visual_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)}));
 const card=pg.locator('[data-ml-investigation]'),evidence=pg.locator('[data-ml-experiment]');
 const plans={lever:{key:'leverEffortArm',values:[2,4],force:[200,100],distance:[1,2]},pulley:{key:'pulleySegments',values:[2,4],force:[200,100],distance:[1,2]},windlass:{key:'windlassDrumR',values:[.1,.2],force:[400/4.5,400/2.25],distance:[2.25,1.125]},ramp:{key:'rampLength',values:[4,8],force:[100,50],distance:[2,4]},wedge:{key:'wedgeThickness',values:[.06,.12],force:[160,320],distance:[2.5,1.25]},screw:{key:'screwPitch',values:[.005,.01],force:[2000/(60*Math.PI),2000/(30*Math.PI)],distance:[30*Math.PI,15*Math.PI]}};
 function check(ok,label){checks.push({label,passed:!!ok});if(!ok)throw Error(label);}
 const button=name=>card.getByRole('button',{name,exact:true});
 const settle=()=>pg.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 async function step(n,label){check(await card.locator('[aria-current=step]').count()===1&&await card.locator('.ml-investigation-steps li').nth(n).getAttribute('aria-current')==='step',label+': current learning step '+(n+1));}
 async function mount(kind,width=1180,theme={}){
  await pg.setViewportSize({width,height:1000});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',shopMotionProgress:.5}),{band:'g68',...theme}]);
  await card.waitFor();await pg.waitForFunction(k=>window.__qaShop?.mlDemo?.kind===k,kind);await settle();
  await step(0,kind);check(await card.locator('[data-ml-investigation-bar]').count()===0,kind+': no result bars before starting');
 }
 async function predict(force='less',distance='more'){
  await button('Start investigation').focus();await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>document.activeElement?.matches('[data-ml-prediction=force][data-choice=less]'));
  await step(1,'Prediction');check(await button('Test planned change').isDisabled(),'Two predictions are required');
  for(const kind of ['force','distance'])check(JSON.stringify(await card.locator('[data-ml-prediction='+kind+']').allTextContents())===JSON.stringify(['Less','Same','More']),kind+': icons leave choice names unchanged');
  await card.locator('[data-ml-prediction=force][data-choice='+force+']').focus();await pg.keyboard.press('Space');
  check(await button('Test planned change').isDisabled(),'One prediction is insufficient');
  await card.locator('[data-ml-prediction=distance][data-choice='+distance+']').click();
  check(await card.locator('[data-ml-prediction][aria-pressed=true]').count()===2,'Both explicit predictions stay selected');
  check(await card.locator('[data-ml-investigation-bar]').count()===0,'Prediction choices do not reveal result bars');
 }
 async function test(){
  await button('Test planned change').focus();await pg.keyboard.press('Enter');
  await pg.waitForFunction(()=>document.activeElement?.matches('[data-ml-investigation-results]'));
  check(await card.locator('[data-ml-investigation-results]').getAttribute('aria-label')==='Investigation results','Test focuses the named result region');
  await step(2,'Result');await pg.keyboard.press('Tab');
  check(await button('View before setup').evaluate(el=>document.activeElement===el),'Result keyboard order reaches View before setup');
 }
 async function bars(kind){
  const data=await card.locator('[data-ml-investigation-outcome]').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.mlInvestigationOutcome,rows:[...n.querySelectorAll('[data-ml-investigation-bar]')].map(b=>({setup:b.dataset.mlInvestigationBar,width:b.getBoundingClientRect().width/(b.parentElement.clientWidth)*100,cssWidth:b.style.width,text:b.parentElement.previousElementSibling.textContent,pattern:getComputedStyle(b).backgroundImage,hidden:b.parentElement.getAttribute('aria-hidden')}))})));
  observations.push({label:kind+' bars',data});check(data.length===2,kind+': force and distance have separate outcome cards');
  for(const metric of data){const values=plans[kind][metric.id],max=Math.max(...values),unit=metric.id==='force'?'N':'m';
   check(metric.rows.length===2,kind+' '+metric.id+': two bars');
   for(const [i,row] of metric.rows.entries()){
    check(Math.abs(parseFloat(row.cssWidth)-values[i]/max*100)<.0001&&Math.abs(row.width-values[i]/max*100)<1,kind+' '+metric.id+' '+row.setup+': full-precision proportional length');
    check(row.text.startsWith(i===0?'Before':'After')&&row.text.endsWith(' '+unit)&&Math.abs(parseFloat(row.text.replace(/^(Before|After)/,''))-values[i])<=.00051,kind+' '+metric.id+' '+row.setup+': visible label, rounded value and correct unit');
    check(row.hidden==='true'&&(i===0?row.pattern==='none':row.pattern.includes('repeating-linear-gradient')),kind+' '+metric.id+' '+row.setup+': decorative solid/striped distinction');
   }
  }return JSON.stringify(data.map(x=>({id:x.id,rows:x.rows.map(r=>({setup:r.setup,cssWidth:r.cssWidth,text:r.text}))})));
 }
 async function layout(label,doubled=false){
  const data=await card.evaluate(el=>{
   const rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number),lum=c=>rgb(c).slice(0,3).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0);
   const colors=[...el.querySelectorAll('.ml-investigation-steps li,[data-ml-prediction],.ml-investigation-bar')].map(n=>{const s=getComputedStyle(n);let p=n.classList.contains('ml-investigation-bar')?n.parentElement:n,bg=getComputedStyle(p).backgroundColor;while(rgb(bg)[3]===0&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}return{text:n.textContent,foreground:s.color,background:bg,contrast:(Math.max(lum(s.color),lum(bg))+.05)/(Math.min(lum(s.color),lum(bg))+.05)};});
   return{pageFits:document.documentElement.scrollWidth<=innerWidth+1,cardFits:el.scrollWidth<=el.clientWidth+1,clipped:[...el.querySelectorAll('li,button,legend,strong,p,h3')].filter(n=>n.clientWidth&&n.scrollWidth>n.clientWidth+1).map(n=>n.textContent),targets:[...el.querySelectorAll('button')].map(n=>({height:n.getBoundingClientRect().height,font:parseFloat(getComputedStyle(n).fontSize)})),heading:parseFloat(getComputedStyle(el.querySelector('h3')).fontSize),colors};
  });observations.push({label,layout:data});
  check(data.pageFits&&data.cardFits&&!data.clipped.length,label+': no overflow or clipped text');
  check(data.targets.every(x=>x.height>=44&&x.font>=(doubled?28:14)),label+': readable controls with 44px targets');
  check(data.heading>=(doubled?40:20),label+': readable heading');
  check(data.colors.every(x=>x.contrast>=4.5),label+': selected choices, stages and bars retain visible contrast');
  const selectedChoices=card.locator('[data-ml-prediction][aria-pressed=true]');
  const focusTarget=(await selectedChoices.count()?selectedChoices:card.locator('button')).first();
  await focusTarget.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');
  const immediateOutline=await focusTarget.evaluate(n=>getComputedStyle(n).outlineColor);await settle();
  const focus=await focusTarget.evaluate(n=>{const s=getComputedStyle(n),rgb=c=>c.match(/[\d.]+/g).map(Number),lum=c=>rgb(c).slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((v,x,i)=>v+x*[.2126,.7152,.0722][i],0);let p=n.parentElement,bg=getComputedStyle(p).backgroundColor;while(rgb(bg)[3]===0&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}return{visible:n===document.activeElement&&n.matches(':focus-visible')&&parseFloat(s.outlineWidth)>=3,color:s.outlineColor,background:bg,contrast:(Math.max(lum(s.outlineColor),lum(bg))+.05)/(Math.min(lum(s.outlineColor),lum(bg))+.05)};});
  if(!focus.visible||focus.contrast<3){
   focus.diagnostic=await focusTarget.evaluate(n=>{const rules=[];function walk(list){for(const r of list||[]){if(r.selectorText){try{if(n.matches(r.selectorText)&&r.style.outline)rules.push({selector:r.selectorText,outline:r.style.outline});}catch{}}if(r.cssRules)walk(r.cssRules);}}for(const s of document.styleSheets){try{walk(s.cssRules);}catch{}}return{variable:getComputedStyle(n).getPropertyValue('--ml-investigation-focus'),panel:n.closest('[data-ml-investigation]').outerHTML.slice(0,350),rules,animations:n.getAnimations().map(a=>({state:a.playState,time:a.currentTime,timing:a.effect.getComputedTiming()}))};});
  }
  observations.push({label,immediateOutline,focus});check(focus.visible&&focus.contrast>=3,label+': keyboard focus contrasts with surrounding surface');
 }
 async function shot(name,target=card){await target.screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});}
 try{
  for(const [kind,plan] of Object.entries(plans)){
   await mount(kind);await predict();await layout(kind+' prediction');
   if(kind==='lever')await shot('desktop-predictions');await test();await bars(kind);await layout(kind+' results');
   if(kind==='lever')await shot('desktop-results');
   const poses=[];
   for(const [i,label] of ['View before setup','View after setup'].entries()){
    await button(label).click();await pg.waitForFunction(()=>document.activeElement?.matches('.ml-shop-bay'));await settle();
    const data=await pg.evaluate(key=>{const s=window.__qaShop;s.model.updateMatrixWorld(true);const pose=[];s.model.traverse(n=>{if(n.isMesh)pose.push(n.matrixWorld.toArray());});return{setting:window.__qaState[key],progress:window.__qaState.shopMotionProgress,pose};},plan.key);
    observations.push({label:kind+' '+label,setting:data.setting,progress:data.progress});poses.push(JSON.stringify(data.pose));
    check(data.setting===plan.values[i]&&data.progress===.5,kind+': '+label+' loads planned setting and halfway pose');
    await pg.getByRole('button',{name:'Return to investigation',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id.startsWith('ml-investigation-title-'));
   }
   check(poses[0]!==poses[1],kind+': actual Three mesh transforms differ between setups');
   await button('Save investigation').click();await pg.waitForFunction(()=>document.activeElement?.id.startsWith('ml-evidence-note-'));
   check(await evidence.isVisible(),kind+': Save opens the explanation');
  }
  await mount('lever');await predict('same','more');await pg.locator('#ml-leverLoad').fill('600');
  check(await button('Test planned change').isDisabled()&&await card.locator('[data-ml-prediction]:disabled').count()===6,'Live drift disables prediction and testing');
  await button('Restore starting setup').click();await pg.waitForFunction(()=>document.activeElement?.matches('[data-ml-prediction=force][data-choice=less]'));
  check(await pg.evaluate(()=>window.__qaState.leverLoad===400),'Restore returns planned load');await test();const frozen=await bars('lever');
  check((await card.textContent()).includes('differs from your prediction'),'Mismatch remains an invitation to explain');
  await pg.locator('#ml-leverEffortArm').fill('1');check(await bars('lever')===frozen,'Result bars retain the planned pair after live drift');
  await button('Save investigation').click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-evidence-note-lever');
  const note='Doubling the effort arm halves force, doubles travel, and preserves 200 J of ideal work.';
  await evidence.getByRole('textbox').fill(note);const saved=await pg.evaluate(()=>JSON.stringify(window.__qaState.benchExperiments.lever));
  await button('Restart investigation').focus();await pg.keyboard.press('Enter');await pg.waitForFunction(()=>document.activeElement?.matches('[data-ml-prediction=force][data-choice=less]'));
  await step(1,'Restart');check(await pg.evaluate(s=>JSON.stringify(window.__qaState.benchExperiments.lever)===s,saved),'Restart retains saved explanation and original predictions');
  check(await card.locator('[data-ml-investigation-bar]').count()===0,'Restart hides prior results');
  await pg.evaluate(()=>{window.StemLab.writeClipboard=async text=>{window.__copiedRecord=text;};});await evidence.getByRole('button',{name:'Open your work record',exact:true}).click();
  await pg.getByRole('button',{name:'Copy this record',exact:false}).click();const copied=await pg.evaluate(()=>window.__copiedRecord);
  check(copied.includes(note)&&copied.includes('effort force: Same')&&copied.includes('hand travel: More')&&copied.includes('200 N → 100 N'),'Export retains prediction, values and explanation');
  await mount('screw',320,{dark:true});await predict('more','less');await layout('Dark phone predictions');await shot('dark-phone-predictions');await test();await bars('screw');await layout('Dark phone results');
  await mount('pulley',320,{contrast:true});await predict();await layout('Forced colors phone predictions');
  const selected=card.locator('[data-ml-prediction=force][aria-pressed=true]');await selected.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');
  check(await selected.evaluate(n=>document.activeElement===n&&n.matches(':focus-visible')&&parseFloat(getComputedStyle(n).outlineWidth)>=3),'Keyboard choice has visible focus');
  await test();await bars('pulley');
  const rules=await card.evaluate(el=>[...el.querySelectorAll('span,strong,p,button,li,h3,legend,div')].filter(n=>n.tagName==='BUTTON'||[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())).map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let a=n;while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '.ml-investigation > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';}).join('\n'));
  await pg.addStyleTag({content:rules});await settle();await layout('Forced colors 320px doubled text',true);await bars('pulley');await shot('forced-doubled-results');
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;}
 finally{
  await b.close();const base=fs.realpathSync(OUT),temp=path.resolve(OUT,'browser-temp');if(fs.existsSync(temp)){const resolved=fs.realpathSync(temp);if(path.dirname(resolved)!==base)throw Error('Temporary path escaped run');fs.rmSync(resolved,{recursive:true,force:true});}if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,checks,observations,shots,errors},null,2)+'\n');
  console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
