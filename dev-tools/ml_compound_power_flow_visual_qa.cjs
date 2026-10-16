// Native React/THREE checks for the compound average-power display.
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
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_compound_power_flow_visual_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)}));
 const fixtures=[{kind:'lever',load:400},{kind:'pulley',load:400},{kind:'windlass',load:400},{kind:'ramp',load:400},{kind:'wedge',load:800},{kind:'screw',load:2000}];
 const keys=['inputPower','transferPower','usefulPower','firstLossPower','secondLossPower'],barKeys=keys.slice(0,3);
 const energyRecord={version:1,benchId:'lever',second:'pulley',inputSettings:{leverEffortArm:2,leverLoadArm:1},outputSettings:{pulleySegments:2},load:400,loadDistance:.5,percentIn:80,percentOut:90,question:'inputWork',answer:'277.78',unit:'J',explanation:'Preserve my earlier energy calculation.',hint:1,completion:'checked'};
 const preserved={designReflection:'Keep this explanation.',benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}},benchCompoundRecords:{lever:{inputWork:energyRecord}}};
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const near=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));
 const numeric=value=>value.toLocaleString('en-US',{useGrouping:false,maximumSignificantDigits:6})+' W';
 const lab=kind=>pg.locator('[data-ml-compound='+kind+']'),compare=kind=>lab(kind).locator('[data-ml-compound-comparison]');
 const panel=kind=>lab(kind).locator('[data-ml-compound-power-flow]');
 const input=(kind,key)=>pg.locator('#ml-compound-'+key+'-'+kind),action=(kind,key)=>lab(kind).locator('[data-ml-compound-'+key+']');
 const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=()=>pg.evaluate(()=>window.__qaState);
 async function press(target){await target.focus();await pg.keyboard.press('Enter');}
 async function open(target){if(!await target.evaluate(n=>n.open))await press(target.locator(':scope>summary'));}
 let mounts=0;
 async function mount(kind,width=1180,theme={},extra={}){
  if(mounts++){
   await b.close();b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});pg=await b.newPage({viewport:{width,height:1100},deviceScaleFactor:1});
   pg.on('pageerror',e=>errors.push(String(e&&e.message||e)));pg.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
   await pg.goto('file://'+pagePath.replace(/\\/g,'/'));await pg.waitForFunction(()=>window.__mlReady?.()&&window.THREE?.OrbitControls&&window.StemLab?.makeOrbitViewer);
  }
  await pg.setViewportSize({width,height:1100});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',shopMotionProgress:.5,...preserved,...extra}),{band:'g68',...theme}]);
  await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();await pg.waitForFunction(()=>{const c=document.querySelector('.ml-shop-bay canvas');if(!c||!c.width||!c.height)return false;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl&&!gl.isContextLost();});await settle();
  check(true,kind+' mount '+mounts+': real THREE canvas initialized');console.log('native mount',mounts,kind);
 }
 function expected(load,seconds=5,p1=80,p2=90){const usefulWork=load*.5,transferWork=usefulWork/(p2/100),inputWork=transferWork/(p1/100);return{inputPower:inputWork/seconds,transferPower:transferWork/seconds,usefulPower:usefulWork/seconds,firstLossPower:Math.max(0,inputWork-transferWork)/seconds,secondLossPower:Math.max(0,transferWork-usefulWork)/seconds};}
 async function power(kind,load,seconds=5,p1=80,p2=90,label=kind){
  await panel(kind).scrollIntoViewIfNeeded();await settle();const want=expected(load,seconds,p1,p2);
  const shares=Object.fromEntries(barKeys.map(key=>[key,want[key]/want.inputPower*100]));
  // CSSOM rounds extremely near-full percentages; compare with its native serialization.
  const data=await panel(kind).evaluate((el,shares)=>({name:document.getElementById(el.getAttribute('aria-labelledby'))?.textContent,live:el.matches('[role],[aria-live]')||!!el.querySelector('[role],[aria-live]'),rows:[...el.querySelectorAll('[data-ml-compound-power-metric]')].map(n=>({key:n.dataset.mlCompoundPowerMetric,value:Number(n.dataset.value),text:n.querySelector('dd')?.textContent,term:n.querySelector('dt')?.textContent,paired:!!n.querySelector('dt')&&n.querySelector('dt').parentElement.tagName==='DL'&&n.querySelector('dt').parentElement===n.querySelector('dd')?.parentElement})),bars:[...el.querySelectorAll('[data-ml-compound-power-bar]')].map(n=>{const key=n.dataset.mlCompoundPowerBar,probe=document.createElement('span');probe.style.width=shares[key]+'%';return{key,css:parseFloat(n.style.width),expectedShare:shares[key],expectedCss:parseFloat(probe.style.width),rendered:n.getBoundingClientRect().width/n.parentElement.clientWidth*100,hidden:!!n.closest('[aria-hidden=true]')};}),text:el.textContent}),shares);
  observations.push({label,seconds,p1,p2,data});check(data.name&&data.rows.length===5&&new Set(data.rows.map(r=>r.key)).size===5,label+': named panel retains five distinct quantities');
  for(const key of keys){const row=data.rows.find(r=>r.key===key);check(row&&near(row.value,want[key])&&row.text===numeric(want[key])&&row.term&&row.paired,label+' '+key+': independent average power, visible watts and paired label');}
  check(data.bars.length===3&&new Set(data.bars.map(r=>r.key)).size===3,label+': only input, transfer and useful power have flow bars');
  for(const key of barKeys){const bar=data.bars.find(r=>r.key===key),percent=want[key]/want.inputPower*100;check(bar&&bar.css===bar.expectedCss&&Math.abs(bar.rendered-percent)<.3&&bar.hidden,label+' '+key+': zero-based common input scale has native-serialized proportional width and decorative track');}
  check(near(want.inputPower,want.usefulPower+want.firstLossPower+want.secondLossPower)&&near(want.transferPower,want.usefulPower+want.secondLossPower),label+': both stages balance independently');
  check(data.text.includes(String(seconds)+' s.')&&data.text.includes('Input power = useful output power + both stage power losses'),label+': common duration and balance remain explicit');
  check(!data.live&&data.text.includes('do not add these three readings'),label+': readings avoid live announcements and explain nonadditive flow positions');
  return data;
 }
 async function layout(kind,label,doubled=false){
  const data=await panel(kind).evaluate(el=>{const rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number),lum=c=>rgb(c).slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);return{pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,clipped:[...el.querySelectorAll('h3,p,dt,dd,strong,span')].filter(n=>n.clientWidth&&n.scrollWidth>n.clientWidth+1).map(n=>n.textContent),title:parseFloat(getComputedStyle(el.querySelector('h3')).fontSize),labels:[...el.querySelectorAll('dt')].map(n=>parseFloat(getComputedStyle(n).fontSize)),values:[...el.querySelectorAll('dd')].map(n=>parseFloat(getComputedStyle(n).fontSize)),bars:[...el.querySelectorAll('[data-ml-compound-power-bar]')].map(n=>{const s=getComputedStyle(n);let p=n.parentElement,bg=getComputedStyle(p).backgroundColor;while(rgb(bg)[3]===0&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}return{key:n.dataset.mlCompoundPowerBar,color:s.color,background:bg,pattern:s.backgroundImage,contrast:(Math.max(lum(s.color),lum(bg))+.05)/(Math.min(lum(s.color),lum(bg))+.05)};})};});
  observations.push({label,layout:data});check(data.pageFits&&data.panelFits&&!data.clipped.length,label+': no clipped text or horizontal overflow');
  check(data.title>=(doubled?40:20)&&data.labels.every(v=>v>=(doubled?28:14))&&data.values.every(v=>v>=(doubled?44:22)),label+': title, labels and all five readings remain prominent');
  check(data.bars.every(r=>r.contrast>=3)&&new Set(data.bars.map(r=>r.pattern)).size===3,label+': three visible fill patterns remain distinguishable without color');
 }
 async function shot(kind,name){await panel(kind).screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});}
 async function solve(kind,answer,unit='W'){await input(kind,'answer').fill(String(answer));await input(kind,'unit').selectOption(unit);await input(kind,'answer').focus();await pg.keyboard.press('Enter');}
 async function feedback(kind,want,label){const result=action(kind,'result');check(await result.getAttribute('data-ml-compound-result')===want,label+': practice feedback '+want);check(await result.evaluate(n=>n.parentElement.getAttribute('role')==='status'&&n.parentElement.getAttribute('aria-live')==='polite'&&n.parentElement.getAttribute('aria-atomic')==='true'),label+': result retains direct polite atomic status parent');}
 async function fixedWork(label){check(await pg.evaluate(expected=>window.__qaState.designReflection===expected.designReflection&&JSON.stringify(window.__qaState.benchPower)===JSON.stringify(expected.benchPower)&&JSON.stringify(window.__qaState.benchCompoundRecords.lever.inputWork)===JSON.stringify(expected.benchCompoundRecords.lever.inputWork),preserved),label+': prior energy record, single-machine draft and explanation preserved');}
 try{
  for(const fixture of fixtures){
   const kind=fixture.kind;await mount(kind);const initial=JSON.stringify(await state());check(!await lab(kind).evaluate(n=>n.open),kind+': optional lab starts closed');await open(lab(kind));check(!await compare(kind).evaluate(n=>n.open),kind+': native comparison starts closed');await open(compare(kind));
   check(JSON.stringify(await state())===initial,kind+': opening native disclosures does not change task state');
   check(await input(kind,'second').inputValue()===(kind==='pulley'?'lever':'pulley')&&await input(kind,'percentIn').inputValue()==='80'&&await input(kind,'percentOut').inputValue()==='90',kind+': default output stage and efficiencies remain intact');
   const normal=await power(kind,fixture.load);await fixedWork(kind);
   if(kind==='lever'){
    await layout(kind,'Desktop power flow');await shot(kind,'desktop-compound-power-flow');
    await input(kind,'question').selectOption('inputPower');await solve(kind,400*.5/(.8*.9)/5);await feedback(kind,'correct','Input power independently checked');await input(kind,'explanation').fill('The same task uses the same energy; longer time lowers average power.');await press(action(kind,'save'));
    await input(kind,'question').selectOption('firstLossPower');await press(action(kind,'reveal'));await feedback(kind,'solution','First-stage loss solution');await solve(kind,expected(400).firstLossPower);await feedback(kind,'solution','Recheck after reveal');await press(action(kind,'save'));
    check(await pg.evaluate(()=>{const r=window.__qaState.benchCompoundRecords.lever;return r.inputPower.version===2&&r.inputPower.seconds===5&&r.inputPower.completion==='checked'&&r.firstLossPower.seconds===5&&r.firstLossPower.completion==='solution';}),'Two saved power skills preserve checked and viewed-solution provenance');
    const saved=JSON.stringify((await state()).benchCompoundRecords),energy=JSON.stringify(await compare(kind).locator('[data-ml-compound-metric]').evaluateAll(ns=>ns.map(n=>[n.dataset.mlCompoundMetric,n.dataset.value])));
    await input(kind,'duration').fill('10');const slow=await power(kind,400,10,80,90,'Double time');
    check(slow.rows.every(r=>near(r.value,normal.rows.find(n=>n.key===r.key).value/2))&&slow.bars.every(r=>near(r.css,normal.bars.find(n=>n.key===r.key).css)),'Doubling duration halves all five powers while keeping all three shares');
    check(JSON.stringify(await compare(kind).locator('[data-ml-compound-metric]').evaluateAll(ns=>ns.map(n=>[n.dataset.mlCompoundMetric,n.dataset.value])))===energy,'Changing duration preserves force, travel and work ledger');
    await input(kind,'duration').fill('.5');await input(kind,'timeUnit').selectOption('min');const minutes=await power(kind,400,30,80,90,'Half minute');
    await input(kind,'duration').fill('30');await input(kind,'timeUnit').selectOption('s');const seconds=await power(kind,400,30,80,90,'Thirty seconds');
    check(JSON.stringify(minutes.rows)===JSON.stringify(seconds.rows)&&JSON.stringify(minutes.bars)===JSON.stringify(seconds.bars),'Half a minute and thirty seconds produce identical values and shares');
    await pg.locator('#ml-leverEffortArm').fill('4');await power(kind,400,30,80,90,'Changed input geometry');await input(kind,'geometry-pulleySegments').fill('4');await power(kind,400,30,80,90,'Changed output geometry');
    check((await state()).pulleySegments===2,'Compound output geometry leaves actual pulley station unchanged');
    await input(kind,'percentIn').fill('100');await input(kind,'percentOut').fill('100');const ideal=await power(kind,400,30,100,100,'Ideal stages');
    check(ideal.rows.filter(r=>r.key.includes('Loss')).every(r=>r.value===0)&&ideal.bars.every(r=>r.css===100),'Ideal stages show two exact zero losses and equal full-length bars');
    await input(kind,'percentIn').fill('99.999999');const nearIdeal=await power(kind,400,30,99.999999,100,'Near-perfect first stage');
    check(nearIdeal.rows.find(r=>r.key==='firstLossPower').value>0&&nearIdeal.rows.find(r=>r.key==='firstLossPower').text!=='0 W'&&nearIdeal.rows.find(r=>r.key==='secondLossPower').value===0,'Near-perfect efficiency retains a tiny nonzero first-stage loss beside exact zero second-stage loss');
    await input(kind,'percentIn').fill('1');await input(kind,'percentOut').fill('1');const low=await power(kind,400,30,1,1,'One-percent stages');
    check(near(low.bars.find(r=>r.key==='transferPower').expectedShare,1)&&near(low.bars.find(r=>r.key==='usefulPower').expectedShare,.01)&&low.bars.every(r=>r.css===r.expectedCss&&r.css>0),'Tiny nonzero shares are not enlarged to a misleading minimum');
    await input(kind,'percentIn').fill('80');await input(kind,'percentOut').fill('90');await input(kind,'question').selectOption('inputPower');
    await input(kind,'budget').fill('0');await power(kind,400,30,80,90,'Invalid separate budget');
    check(await input(kind,'budget').getAttribute('aria-invalid')==='true'&&await action(kind,'check').isEnabled(),'Invalid planning budget keeps valid power display and power practice available');
    for(const bad of ['', '0','-1','Infinity','3601']){await input(kind,'duration').fill(bad);check(await action(kind,'power-invalid').count()===1&&await panel(kind).locator('[data-ml-compound-power-metric]').count()===0&&await panel(kind).locator('[data-ml-compound-power-bar]').count()===0&&await action(kind,'check').isDisabled(),'Invalid duration '+JSON.stringify(bad)+': no power numbers or bars and no grading');}
    check(await compare(kind).locator('[data-ml-compound-metric]').count()===13,'Invalid time retains all force, travel and energy quantities');
    await input(kind,'question').selectOption('idealMA');await solve(kind,16,'ratio');await feedback(kind,'correct','Energy-only skill with invalid time');
    check(JSON.stringify((await state()).benchCompoundRecords)===saved,'Duration, efficiency and geometry changes preserve saved power snapshots');await fixedWork('Changed task');
   }
  }
  await mount('pulley',390,{dark:true,band:'g912'});await open(lab('pulley'));await open(compare('pulley'));await input('pulley','percentIn').fill('50');await input('pulley','percentOut').fill('60');await power('pulley',400,5,50,60,'Dark phone stages');await layout('pulley','Dark phone power flow');await shot('pulley','dark-phone-compound-power-flow');
  await mount('screw',320,{contrast:true});await open(lab('screw'));await open(compare('screw'));await input('screw','percentIn').fill('100');await input('screw','percentOut').fill('100');await power('screw',2000,5,100,100,'Forced ideal stages');
  const rules=await panel('screw').evaluate(el=>[...el.querySelectorAll('*')].filter(n=>[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())).map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let a=n;while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '[data-ml-compound-power-flow] > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';}).join('\n'));
  const enlarged=await pg.addStyleTag({content:rules});await settle();await layout('screw','Forced 320px doubled text',true);await power('screw',2000,5,100,100,'Forced doubled numbers');await shot('screw','forced-doubled-compound-power-flow');await enlarged.evaluate(n=>n.remove());
  for(const band of ['k2','g35']){await mount('lever',390,{band});check(await lab('lever').count()===0&&await pg.locator('[data-ml-compound-power-flow]').count()===0,band+': compound power remains grade-gated');}
  await mount('ramp',1180,{}, {rampLength:1,rampHeight:2});await open(lab('ramp'));check(await compare('ramp').count()===0&&await panel('ramp').count()===0&&await action('ramp','check').count()===0,'Invalid physical geometry omits compound quantities and grading');
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;}
 finally{
  await b.close();const base=fs.realpathSync(OUT),temp=path.resolve(OUT,'browser-temp');if(fs.existsSync(temp)){const resolved=fs.realpathSync(temp);if(path.dirname(resolved)!==base)throw Error('Temporary path escaped run');fs.rmSync(resolved,{recursive:true,force:true});}if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,mounts,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
