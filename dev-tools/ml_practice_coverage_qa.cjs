// Native React/THREE QA for practice history coverage and next-skill shortcuts.
const fs=require('fs'),path=require('path'),vm=require('vm');
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-practice-coverage-2026-10-13/browser/run-01')
  .replace('window.__qaState = pair[0].machineLab; var ctx = {','window.__qaState = pair[0].machineLab; window.__qaSet=pair[1]; var ctx = {');
bootstrap+=String.raw`
  const observations=[];
  const families={power:['inputPower','usefulPower','lossPower','effortFromPower','loadFromPower'],motion:['handSpeed','loadSpeed'],planning:['budgetTime','budgetEnergy','budgetLoad','budgetMovement','requiredEfficiency'],rotation:['torque','rpm','turns','angularTravel','omega','rotationalWork','rotationalPower'],units:['powerKilowatts','powerWatts','timeMinutes','timeSeconds','speedCentimetres','speedMetres']};
  const linear=['inputPower','usefulPower','lossPower','handSpeed','loadSpeed','budgetTime','budgetEnergy','budgetLoad','budgetMovement','requiredEfficiency','effortFromPower','loadFromPower',...families.units];
  const rotary=['inputPower','usefulPower','lossPower','handSpeed','loadSpeed','budgetTime','torque','rpm','budgetEnergy','budgetLoad','budgetMovement','requiredEfficiency','turns','angularTravel','omega','rotationalWork','rotationalPower','effortFromPower','loadFromPower',...families.units];
  const map=kind=>lab(kind).locator('[data-ml-power-skill-map='+kind+']');
  const tile=(kind,key)=>map(kind).locator('[data-ml-power-skill='+key+']');
  const shortcut=(kind,mode)=>map(kind).locator('[data-ml-power-practice-next='+mode+']');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const inventory=kind=>kind==='windlass'||kind==='screw'?rotary:linear;
  async function panels(kind){await open(lab(kind));await open(map(kind));await settle();}
  async function replaceRecords(kind,records){await pg.evaluate(([kind,records])=>window.__qaSet(prev=>({...prev,machineLab:{...prev.machineLab,benchPowerRecords:{...prev.machineLab.benchPowerRecords,[kind]:records}}})),[kind,records]);await settle();}
  function nextTarget(kind,current,mode,expected){const kinds=inventory(kind),start=kinds.indexOf(current);for(let n=1;n<kinds.length;n++){const key=kinds[(start+n)%kinds.length];if(mode==='unsaved'?!expected[key]:expected[key]==='solution')return key;}return '';}
  async function inspect(kind,expected,label){
    const kinds=inventory(kind);await settle();
    const choices=await input(kind,'question').locator('option').evaluateAll(els=>els.map(el=>el.value));
    check(choices.join(',')===kinds.join(','),label+': independent linear/rotary inventory agrees with selector order');
    const sections=await map(kind).locator('[data-ml-power-skill-family]').evaluateAll(els=>els.map(el=>el.getAttribute('data-ml-power-skill-family')));
    const expectedFamilies=Object.keys(families).filter(f=>families[f].some(k=>kinds.includes(k)));
    check(sections.join(',')===expectedFamilies.join(','),label+': family coverage includes exactly the applicable groups');
    const rows=[];
    for(const family of expectedFamilies){
      const keys=families[family].filter(k=>kinds.includes(k)),checked=keys.filter(k=>expected[k]==='checked').length,solution=keys.filter(k=>expected[k]==='solution').length,unsaved=keys.length-checked-solution;
      const row=await map(kind).locator('[data-ml-power-family-coverage='+family+']').evaluate(el=>({checked:Number(el.dataset.checked),solution:Number(el.dataset.solution),unsaved:Number(el.dataset.unsaved),total:Number(el.dataset.total),text:el.textContent,tag:el.tagName,role:el.getAttribute('role')}));
      check(row.checked===checked&&row.solution===solution&&row.unsaved===unsaved&&row.total===keys.length,label+': '+family+' counts independently match valid saved records');
      check(row.text==='Checked: '+checked+' · Solution viewed: '+solution+' · No saved record: '+unsaved&&row.tag==='P'&&!row.role,label+': '+family+' counts remain explicit text without a score role');
      const strip=await map(kind).locator('[data-ml-power-family-track='+family+']').evaluate(el=>({hidden:el.getAttribute('aria-hidden'),role:el.getAttribute('role'),width:el.clientWidth,segments:Array.from(el.children).map(n=>({key:n.getAttribute('data-ml-power-family-segment'),percent:parseFloat(n.style.width),pixels:n.getBoundingClientRect().width,color:getComputedStyle(n).backgroundColor,pattern:getComputedStyle(n).backgroundImage,forced:getComputedStyle(n).forcedColorAdjust}))}));
      check(strip.hidden==='true'&&!strip.role&&strip.segments.map(s=>s.key).join(',')==='checked,solution,unsaved',label+': '+family+' decorative strip has three distinct categories');
      const counts={checked,solution,unsaved};
      for(const segment of strip.segments){check(Math.abs(segment.percent-counts[segment.key]/keys.length*100)<1e-4&&Math.abs(segment.pixels-strip.width*counts[segment.key]/keys.length)<1,label+': '+family+' '+segment.key+' width represents its fraction within CSS rounding without a minimum');}
      check(strip.segments[0].pattern==='none'&&strip.segments[1].pattern.includes('repeating-linear-gradient')&&strip.segments[2].pattern==='none',label+': '+family+' checked, viewed and empty segments retain solid, striped and empty patterns');
      for(const key of keys)check(await tile(kind,key).getAttribute('data-ml-power-skill-status')===(expected[key]||'unsaved'),label+': '+key+' tile agrees with independent saved status');
      rows.push({family,expected:counts,total:keys.length,row,strip});
    }
    const current=await input(kind,'question').inputValue();
    for(const mode of ['unsaved','solution']){const target=nextTarget(kind,current,mode,expected),button=shortcut(kind,mode);check(await button.getAttribute('data-target')===target&&await button.isDisabled()===!target,label+': '+mode+' shortcut advertises the next eligible other skill or disables');}
    const copy=await map(kind).textContent();check(copy.includes('Counts include records made with earlier setups. Saved records show practice history, not a score.')&&copy.includes('Shortcuts skip the current skill.')&&copy.includes('save first.'),label+': history, fresh attempts and save-first guidance remain explicit');
    observations.push({label,kind,current,rows});
  }
  async function saveRecord(kind,key,completion,answer,unit,version){
    await input(kind,'question').selectOption(key);await press(action(kind,'hint'));
    if(completion==='checked'){await solve(kind,answer,unit);await result(kind,'correct');}
    else{await press(action(kind,'reveal'));await result(kind,'solution');}
    await press(action(kind,'save'));const record=(await state()).benchPowerRecords[kind][key];
    check(record.version===version&&record.completion===completion&&record.hint===1,kind+': real '+key+' save retains version '+version+', '+completion+' and hint provenance');return record;
  }
  async function move(kind,mode,expected,label){
    const before=await state(),current=await input(kind,'question').inputValue(),target=nextTarget(kind,current,mode,expected);
    check(!!target,label+': independently chosen target exists');await shortcut(kind,mode).focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');
    const focused=await shortcut(kind,mode).evaluate(el=>{const s=getComputedStyle(el);return el===document.activeElement&&el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0;});check(focused,label+': shortcut has visible native keyboard focus before activation');
    await pg.keyboard.press('Enter');await settle();check(await input(kind,'question').inputValue()===target,label+': keyboard activation selects the independent next eligible skill');await resetPractice(kind);
    check(await sameExcept(before,['benchPower'])&&JSON.stringify((await state()).benchPowerRecords)===JSON.stringify(before.benchPowerRecords),label+': selecting practice preserves assumptions, other evidence and every saved snapshot');
    const prior=before.benchPower?.[kind],after=(await state()).benchPower[kind];if(prior)check(['percent','duration','timeUnit','budget'].every(k=>after[k]===prior[k]),label+': latest duration, efficiency and power budget remain unchanged');
    if(!await shortcut(kind,mode).isDisabled())check(await shortcut(kind,mode).evaluate(el=>el===document.activeElement),label+': persistent enabled button keeps native keyboard focus');
  }
  async function layout(kind,label){
    const fit=await map(kind).evaluate(el=>({page:document.documentElement.scrollWidth<=innerWidth+1,panel:el.scrollWidth<=el.clientWidth+1,clipped:Array.from(el.querySelectorAll('button,p,h4,[data-ml-power-family-track]')).filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+1).map(n=>({tag:n.tagName,text:n.textContent,width:n.clientWidth,scroll:n.scrollWidth}))}));
    check(fit.page&&fit.panel&&!fit.clipped.length,label+': coverage, labels and controls fit without horizontal clipping');if(!fit.page||!fit.panel||fit.clipped.length)observations.push({label,fit});
  }
  async function shot(name,kind){await layout(kind,name);await shortcut(kind,'unsaved').focus();await settle();const box=await map(kind).evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('[data-ml-power-skill-family]').getBoundingClientRect();return{x:a.x+scrollX,y:a.y+scrollY,width:a.width,height:b.bottom-a.top+4};});await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:box});shots.push(name);}
  try{
    let expected={};await mount('windlass');await panels('windlass');await inspect('windlass',expected,'Empty rotary map');
    const w=physical(fixtures.find(f=>f.kind==='windlass')).expected;
    for(const [key,completion,answer,unit,version] of [['inputPower','checked',w.inputPower,'W',1],['usefulPower','solution',0,'W',1],['budgetEnergy','checked',500,'J',2],['turns','solution',0,'turns',3],['loadFromPower','checked',400,'N',4],['powerKilowatts','solution',0,'kW',5]]){await saveRecord('windlass',key,completion,answer,unit,version);expected[key]=completion;}
    await inspect('windlass',expected,'Mixed rotary records v1-v5');
    await input('windlass','question').selectOption('speedMetres');await move('windlass','unsaved',expected,'Wrap unsaved rotary shortcut');check(await input('windlass','question').inputValue()==='lossPower','Wrap skips checked and viewed records before the first unsaved skill');
    await input('windlass','answer').fill('999');await press(action('windlass','hint'));await move('windlass','solution',expected,'Revisit saved rotary solution');
    const fixed=JSON.stringify((await state()).benchPowerRecords);await input('windlass','duration').fill('10');await inspect('windlass',expected,'Earlier setup rotary records');
    for(const key of Object.keys(expected))check(await tile('windlass',key).getAttribute('data-ml-power-skill-setup')==='earlier','Windlass '+key+': original setup is explicitly earlier after duration changes');
    await move('windlass','solution',expected,'Revisit with latest ten-second setup');check(await input('windlass','duration').inputValue()==='10'&&JSON.stringify((await state()).benchPowerRecords)===fixed,'Revisit retains latest ten-second setup and exact saved history');
    await shot('desktop-windlass-practice-coverage','windlass');
    // Simulate an incoming record immediately before React processes the old rendered handler.
    await input('windlass','question').selectOption('speedMetres');const staleTarget=await shortcut('windlass','unsaved').getAttribute('data-target');check(staleTarget==='lossPower','Latest-record fixture begins with rendered lossPower suggestion');
    const incoming={...(await state()).benchPowerRecords.windlass.inputPower,question:'lossPower',completion:'solution',answer:'',unit:''};
    await pg.evaluate(record=>{window.__qaState.benchPowerRecords.windlass={...window.__qaState.benchPowerRecords.windlass,lossPower:record};},incoming);expected.lossPower='solution';
    await shortcut('windlass','unsaved').focus();await pg.keyboard.press('Enter');await settle();check(await input('windlass','question').inputValue()==='handSpeed','Shortcut recomputes latest record eligibility instead of using the stale rendered target');await inspect('windlass',expected,'Incoming valid solution record');
    for(const key of rotary.filter(k=>!expected[k])){const version=families.units.includes(key)?5:['effortFromPower','loadFromPower'].includes(key)?4:['turns','angularTravel','omega','rotationalWork','rotationalPower'].includes(key)?3:['budgetEnergy','budgetLoad','budgetMovement','requiredEfficiency'].includes(key)?2:1;await saveRecord('windlass',key,'solution',0,'',version);expected[key]='solution';}
    await inspect('windlass',expected,'Every rotary skill has saved evidence');check(await shortcut('windlass','unsaved').isDisabled()&&(await shortcut('windlass','unsaved').textContent()).includes('No other unsaved skill'),'Fully saved inventory disables next unsaved with an explicit reason');
    const complete=(await state()).benchPowerRecords.windlass,current=await input('windlass','question').inputValue(),allButCurrent={...complete};delete allButCurrent[current];delete expected[current];await replaceRecords('windlass',allButCurrent);await inspect('windlass',expected,'Current-only unsaved rotary skill');check(await shortcut('windlass','unsaved').isDisabled(),'Current-only unsaved skill disables next unsaved instead of clearing the same attempt');
    check(await recordsPreserved(),'Rotary shortcut work preserves unrelated investigation, design and efficiency records');

    expected={};await mount('ramp');await panels('ramp');const r=physical(fixtures.find(f=>f.kind==='ramp')).expected;
    for(const [key,completion,answer,unit,version] of [['inputPower','checked',r.inputPower,'W',1],['usefulPower','solution',0,'W',1],['budgetEnergy','solution',0,'J',2],['loadFromPower','checked',400,'N',4],['powerWatts','checked',r.inputPower,'W',5]]){await saveRecord('ramp',key,completion,answer,unit,version);expected[key]=completion;}
    const valid=(await state()).benchPowerRecords.ramp;await replaceRecords('ramp',{...valid,lossPower:{...valid.inputPower,question:'lossPower',version:99},handSpeed:{...valid.inputPower,question:'handSpeed',completion:'checked',answer:'9999',unit:'m/s'},loadSpeed:{...valid.inputPower,benchId:'windlass',question:'loadSpeed'},timeMinutes:{...valid.powerWatts,question:'timeMinutes',version:4}});
    await inspect('ramp',expected,'Mixed linear records with four invalid entries');await input('ramp','question').selectOption('usefulPower');await move('ramp','unsaved',expected,'Invalid record remains eligible for practice');check(await input('ramp','question').inputValue()==='lossPower','Invalid version is counted unsaved and selected');
    await shot('desktop-ramp-practice-coverage','ramp');
    await replaceRecords('ramp',{usefulPower:valid.usefulPower});expected={usefulPower:'solution'};await input('ramp','question').selectOption('usefulPower');await inspect('ramp',expected,'Current-only solution');const onlyBefore=JSON.stringify(await state());check(await shortcut('ramp','solution').isDisabled()&&(await shortcut('ramp','solution').textContent()).includes('No other saved solution to revisit'),'Current-only solution disables revisit without erasing the attempt');await map('ramp').locator(':scope > summary').focus();await pg.keyboard.press('Tab');check(JSON.stringify(await state())===onlyBefore,'Tab navigation over disabled current-only shortcut leaves exact state unchanged');
    await replaceRecords('ramp',{});expected={};await inspect('ramp',expected,'No saved solution');check(await shortcut('ramp','solution').isDisabled(),'No solution records disables revisit');

    expected={};await mount('screw',320,{dark:true});await panels('screw');const s=physical(fixtures.find(f=>f.kind==='screw')).expected;
    for(const [key,completion,answer,unit,version] of [['inputPower','checked',s.inputPower,'W',1],['usefulPower','solution',0,'W',1],['turns','solution',0,'turns',3],['powerKilowatts','solution',0,'kW',5]]){await saveRecord('screw',key,completion,answer,unit,version);expected[key]=completion;}
    await inspect('screw',expected,'Dark 320px rotary coverage');await move('screw','unsaved',expected,'Dark phone unsaved shortcut');await move('screw','solution',expected,'Dark phone revisit shortcut');await shot('dark-phone-screw-practice-coverage','screw');check(await recordsPreserved(),'Dark phone retains other work records');

    expected={};await mount('windlass',320,{contrast:true});await panels('windlass');
    for(const [key,completion,answer,unit,version] of [['inputPower','checked',w.inputPower,'W',1],['usefulPower','solution',0,'W',1],['loadFromPower','checked',400,'N',4]]){await saveRecord('windlass',key,completion,answer,unit,version);expected[key]=completion;}
    await inspect('windlass',expected,'Forced-colors 320px coverage');await move('windlass','unsaved',expected,'Forced-colors unsaved shortcut');await move('windlass','solution',expected,'Forced-colors revisit shortcut');
    const forced=await map('windlass').locator('[data-ml-power-family-track=power]').evaluate(el=>({active:matchMedia('(forced-colors:active)').matches,border:getComputedStyle(el).borderStyle,segments:Array.from(el.children).map(n=>({key:n.getAttribute('data-ml-power-family-segment'),color:getComputedStyle(n).backgroundColor,pattern:getComputedStyle(n).backgroundImage,forced:getComputedStyle(n).forcedColorAdjust}))}));check(forced.active&&forced.border==='solid'&&forced.segments.every(s=>s.forced==='none')&&forced.segments[0].color!==forced.segments[2].color&&forced.segments[1].pattern.includes('repeating-linear-gradient'),'Forced colors keeps solid checked, striped solution and empty unsaved categories distinguishable');observations.push({label:'forced-colors style',forced});await shot('forced-colors-windlass-practice-coverage','windlass');check(await recordsPreserved(),'Forced colors retains other work records');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,observations,errors},null,2)+'\n');console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1600))},null,2));if(errors.length)process.exitCode=1;await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
