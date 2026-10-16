// Native worksheet QA. Answers below are independent physical fixtures, not tool math.
const fs=require('fs'),path=require('path'),vm=require('vm');
const report=path.resolve(process.argv[2]),temp=path.join(report,'browser-temp');
fs.mkdirSync(temp,{recursive:true});process.env.TEMP=temp;process.env.TMP=temp;
process.env.PLAYWRIGHT_BROWSERS_PATH=process.env.PLAYWRIGHT_BROWSERS_PATH||'C:/Users/cabba/AppData/Local/ms-playwright';
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
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_efficiency_practice_visual_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)}));
 const fixtures=[{kind:'lever',load:400,ma:2},{kind:'pulley',load:400,ma:2},{kind:'windlass',load:400,ma:.45/.1},{kind:'ramp',load:400,ma:4},{kind:'wedge',load:800,ma:.3/.06},{kind:'screw',load:2000,ma:2*Math.PI*.15/.005}];
 const skills=[['input',250,'J'],['force',250,'N'],['loss',50,'J'],['output',200,'J'],['efficiency',80,'%'],['actualMA',1.6,'×'],['travel',1,'m'],['minMA',400/(100*.8),'×'],['maxMA',3/.5,'×'],['forceEfficiency',400/(2*100)*100,'%'],['taskEfficiency',400*.5/(100*3)*100,'%']];
 const preserved={designReflection:'Keep this explanation.',benchReferences:{lever:{leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:.5}},benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}}};
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const lab=kind=>pg.locator('[data-ml-efficiency='+kind+']');
 const panel=()=>pg.locator('[data-ml-efficiency-practice]');
 const input=(kind,key)=>pg.locator('#ml-efficiency-'+key+'-'+kind);
 const action=(kind,key)=>lab(kind).locator('[data-ml-efficiency-'+key+']');
 const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=()=>pg.evaluate(()=>window.__qaState);
 async function press(target){await target.focus();await pg.keyboard.press('Enter');}
 async function open(target){if(!await target.evaluate(el=>el.open))await press(target.locator(':scope>summary'));}
 let mounts=0;
 async function mount(kind,width=1180,theme={},extra={}){
  if(mounts++){
   await b.close();b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
   pg=await b.newPage({viewport:{width,height:1100},deviceScaleFactor:1});
   pg.on('pageerror',e=>errors.push(String(e&&e.message||e)));pg.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
   await pg.goto('file://'+pagePath.replace(/\\/g,'/'));
   await pg.waitForFunction(()=>window.__mlReady?.()&&window.THREE?.OrbitControls&&window.StemLab?.makeOrbitViewer);
  }
  await pg.setViewportSize({width,height:1100});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',shopMotionProgress:.5,...preserved,...extra}),{band:'g68',...theme}]);
  await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();
  await pg.waitForFunction(()=>{const c=document.querySelector('.ml-shop-bay canvas');if(!c||!c.width||!c.height)return false;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl&&!gl.isContextLost();});await settle();
  check(true,kind+' mount '+mounts+': real THREE canvas initialized');console.log('native mount',mounts,kind);
 }
 async function fresh(kind,label){
  check(await input(kind,'answer').inputValue()===''&&await input(kind,'unit').inputValue()===''&&await action(kind,'result').count()===0&&await action(kind,'hint-level').count()===0&&await action(kind,'save').isDisabled(),label+': fresh skill clears draft and disables saving');
  check(await panel().locator('[role=status]').evaluate(n=>n.textContent.trim()===''),label+': fresh feedback does not reveal formula, setup or answer');
 }
 async function result(kind,expected,label){
  const element=action(kind,'result');check(await element.getAttribute('data-ml-efficiency-result')===expected,label+': feedback '+expected);
  check(await element.evaluate(n=>n.parentElement.getAttribute('role')==='status'&&n.parentElement.getAttribute('aria-live')==='polite'&&n.parentElement.getAttribute('aria-atomic')==='true'),label+': feedback has direct polite atomic status parent');
 }
 async function solve(kind,value,unit){await input(kind,'answer').fill(String(value));await input(kind,'unit').selectOption(unit);await input(kind,'answer').focus();await pg.keyboard.press('Enter');}
 async function choose(kind,skill){await input(kind,'question').selectOption(skill);await fresh(kind,skill);}
 async function preservedWork(label){check(await pg.evaluate(expected=>Object.keys(expected).every(k=>JSON.stringify(window.__qaState[k])===JSON.stringify(expected[k])),preserved),label+': separate references, draft and explanation preserved');}
 async function layout(kind,label,doubled=false){
  await panel().scrollIntoViewIfNeeded();await settle();
  const data=await panel().evaluate(el=>({pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,
   clipped:[...el.querySelectorAll('h3,h4,p,label,button,strong,span')].filter(n=>n.clientWidth&&n.scrollWidth>n.clientWidth+1).map(n=>n.textContent),
   title:parseFloat(getComputedStyle(el.querySelector('[data-ml-efficiency-question-title]')).fontSize),given:parseFloat(getComputedStyle(el.querySelector('[data-ml-efficiency-given]')).fontSize),
   answer:parseFloat(getComputedStyle(el.querySelector('input')).fontSize),controls:[...el.querySelectorAll('input,select,button')].map(n=>{const r=n.getBoundingClientRect(),description=n.getAttribute('aria-describedby');return{tag:n.tagName,id:n.id,disabled:n.disabled,x:r.x,y:r.y,width:r.width,height:r.height,font:parseFloat(getComputedStyle(n).fontSize),labels:n.labels?[...n.labels].map(l=>l.textContent.trim()):[],description,describedText:description?description.split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' '):'',selected:n.tagName==='SELECT'?n.selectedOptions[0]?.textContent:null};})}));
  observations.push({label,layout:data});check(data.pageFits&&data.panelFits&&!data.clipped.length,label+': no clipped text or horizontal overflow');
  check(data.title>=(doubled?44:22)&&data.given>=(doubled?32:16)&&data.answer>=(doubled?48:24),label+': question, givens and answer have readable emphasis');
  check(data.controls.every(c=>c.height>=44&&c.font>=(doubled?28:14)),label+': controls retain 44px targets and readable text');
  check(data.controls.filter(c=>c.tag!=='BUTTON').every(c=>c.labels.length===1&&c.labels[0])&&data.controls.find(c=>c.tag==='INPUT').describedText.includes('Checks allow'),label+': answer and selectors keep native labels and rounding description');
  const target=action(kind,'check');await target.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');await settle();
  const focus=await target.evaluate(n=>{const s=getComputedStyle(n),rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number),lum=c=>rgb(c).slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);let p=n.parentElement,bg=getComputedStyle(p).backgroundColor;while(rgb(bg)[3]===0&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}return{visible:n===document.activeElement&&n.matches(':focus-visible')&&parseFloat(s.outlineWidth)>=3&&s.outlineStyle!=='none',color:s.outlineColor,background:bg,contrast:(Math.max(lum(s.outlineColor),lum(bg))+.05)/(Math.min(lum(s.outlineColor),lum(bg))+.05)};});
  observations.push({label,focus});check(focus.visible&&focus.contrast>=3,label+': keyboard focus is visible against surrounding surface');
 }
 async function shot(name){await panel().screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});}
 try{
  for(const fixture of fixtures){
   await mount(fixture.kind);check(!await lab(fixture.kind).evaluate(n=>n.open),fixture.kind+': optional lab starts closed');await open(lab(fixture.kind));
   check(JSON.stringify(await input(fixture.kind,'question').locator('option').evaluateAll(ns=>ns.map(n=>n.value)))===JSON.stringify(skills.map(s=>s[0])),fixture.kind+': all eleven skill choices remain available');
   await fresh(fixture.kind,fixture.kind+' initial');await choose(fixture.kind,'force');
   await solve(fixture.kind,fixture.load/(fixture.ma*.8),'N');await result(fixture.kind,'correct',fixture.kind+' independent effort');
   check(await action(fixture.kind,'save').isEnabled(),fixture.kind+': correct answer enables saving');await preservedWork(fixture.kind);
   if(fixture.kind==='lever'){
    for(const [skill,value,unit] of skills){await choose('lever',skill);await solve('lever',value,unit);await result('lever','correct',skill+' independent answer');}
    await solve('lever',66.7,'%');await result('lever','correct','Planning result rounded to three significant figures');
    await layout('lever','Desktop checked planning');await shot('desktop-efficiency-practice');
    await press(action('lever','save'));const saved=JSON.stringify((await state()).benchEfficiencyRecords.lever);
    check(await pg.evaluate(()=>{const r=window.__qaState.benchEfficiencyRecords.lever;return r.question==='taskEfficiency'&&r.version===3&&r.completion==='checked'&&r.limits.force===100&&r.limits.travel===3;}),'Planning save records fixed limits and checked provenance');
    await press(action('lever','next'));check(await input('lever','question').inputValue()==='input','Next skill wraps after the eleventh choice');await fresh('lever','Next skill');
    check(JSON.stringify((await state()).benchEfficiencyRecords.lever)===saved,'Next skill preserves prior saved calculation');
   }
  }
  await mount('lever',390,{dark:true,band:'g912'});await open(lab('lever'));await choose('lever','force');
  await press(action('lever','check'));await result('lever','invalid','Blank answer');
  check(await input('lever','answer').getAttribute('aria-invalid')==='true'&&await action('lever','save').isDisabled(),'Invalid answer identifies input and cannot save');
  for(const value of ['-1','Infinity','abc']){await input('lever','answer').fill(value);await press(action('lever','check'));await result('lever','invalid','Invalid '+value);}
  await solve('lever',250,'J');await result('lever','unit','Wrong unit');check(await input('lever','unit').getAttribute('aria-invalid')==='true'&&await action('lever','save').isDisabled(),'Unit error identifies select and blocks saving');
  await solve('lever',100,'N');await result('lever','incorrect','Wrong number with Enter');
  await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-efficiency-hint-level')==='1','Hint one reveals relationship');
  await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-efficiency-hint-level')==='2'&&await action('lever','hint').isDisabled(),'Hint two reveals setup and exhausts hints');
  await result('lever','incorrect','Hints retain original feedback');await layout('lever','Dark phone hints');await shot('dark-phone-efficiency-hints');
  await solve('lever',249.9,'N');await result('lever','correct','Rounded correct answer');await press(action('lever','save'));
  check(await pg.evaluate(()=>{const r=window.__qaState.benchEfficiencyRecords.lever;return r.answer==='249.9'&&r.hint===2&&r.completion==='checked';}),'Checked save preserves entered rounding and hint usage');
  const checked=JSON.stringify((await state()).benchEfficiencyRecords.lever);await press(action('lever','next'));await fresh('lever','Next after checked work');
  check(JSON.stringify((await state()).benchEfficiencyRecords.lever)===checked,'Next does not replace checked record');await preservedWork('Dark phone');
  await mount('pulley',320,{contrast:true});await open(lab('pulley'));await choose('pulley','loss');await press(action('pulley','hint'));await press(action('pulley','reveal'));await result('pulley','solution','Reveal');
  check(await action('pulley','reveal').isDisabled()&&await action('pulley','save').isEnabled(),'Viewed solution disables repeat reveal and enables honest save');
  await solve('pulley',50,'J');await result('pulley','solution','Editing after reveal');await press(action('pulley','save'));
  check(await pg.evaluate(()=>{const r=window.__qaState.benchEfficiencyRecords.pulley;return r.completion==='solution'&&r.hint===1&&r.answer==='50'&&r.unit==='J';}),'Saved reveal retains solution-viewed provenance and hint count');
  const rules=await panel().evaluate(el=>[...el.querySelectorAll('*')].filter(n=>n.tagName!=='OPTION'&&(['INPUT','SELECT','BUTTON'].includes(n.tagName)||[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()))).map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let p=n;while(p!==el){parts.unshift(p.tagName.toLowerCase()+':nth-child('+([...p.parentElement.children].indexOf(p)+1)+')');p=p.parentElement;}return '.ml-efficiency-practice > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';}).join('\n'));
  const enlarged=await pg.addStyleTag({content:rules});await settle();await layout('pulley','Forced colors 320px doubled text',true);await shot('forced-doubled-efficiency-solution');await enlarged.evaluate(n=>n.remove());
  const solution=JSON.stringify((await state()).benchEfficiencyRecords.pulley);await press(action('pulley','next'));await fresh('pulley','Next after viewed solution');
  check(JSON.stringify((await state()).benchEfficiencyRecords.pulley)===solution,'Next preserves solution-viewed record');await preservedWork('Forced colors');
  await mount('lever',1180,{}, {benchDesignLimits:{lever:{force:'',travel:'3'}}});await open(lab('lever'));
  check(await input('lever','question').locator('option').count()===11,'Invalid planning limits keep all choices discoverable');
  for(const [skill] of skills.slice(7)){await input('lever','question').selectOption(skill);check(await action('lever','planning-unavailable').count()===1&&await action('lever','check').count()===0&&await input('lever','answer').count()===0,skill+': invalid limits gate planning calculation');}
  for(const [skill] of skills.slice(0,7)){await input('lever','question').selectOption(skill);check(await action('lever','planning-unavailable').count()===0&&await action('lever','check').count()===1&&await input('lever','answer').count()===1,skill+': standard practice survives invalid planning limits');}
  await input('lever','percent').fill('0');check(await panel().count()===0,'Invalid assumed efficiency hides derived worksheet');
  for(const band of ['k2','g35']){await mount('lever',390,{band});check(await lab('lever').count()===0&&await panel().count()===0,band+': older-student worksheet remains gated');}
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;}
 finally{
  await b.close();const base=fs.realpathSync(OUT),temp=path.resolve(OUT,'browser-temp');if(fs.existsSync(temp)){const resolved=fs.realpathSync(temp);if(path.dirname(resolved)!==base)throw Error('Temporary path escaped run');fs.rmSync(resolved,{recursive:true,force:true});}if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');
  fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,mounts,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
