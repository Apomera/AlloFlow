// Native React/THREE QA for calculation-to-guide navigation and numbered feedback.
const fs=require('fs'),path=require('path'),vm=require('vm');
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-practice-flow-2026-10-13/browser/run-01');
bootstrap+=String.raw`
  const observations=[];
  const guide=(kind,route)=>lab(kind).locator('[data-ml-power-'+route+'='+kind+']');
  const map=kind=>lab(kind).locator('[data-ml-power-skill-map='+kind+']');
  const practice=kind=>lab(kind).locator('[data-ml-power-practice]');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const unchanged=async before=>JSON.stringify(await state())===before;
  const snapshot=async()=>JSON.stringify(await state());
  const routes={inputPower:'comparison',usefulPower:'comparison',lossPower:'comparison',handSpeed:'comparison',loadSpeed:'comparison',
    budgetTime:'planning',torque:'rotation',rpm:'rotation',budgetEnergy:'planning',budgetLoad:'planning',budgetMovement:'planning',requiredEfficiency:'planning',
    turns:'rotation',angularTravel:'rotation',omega:'rotation',rotationalWork:'rotation',rotationalPower:'rotation',effortFromPower:'force-speed',loadFromPower:'force-speed'};
  async function focusCheck(target,label){
    const value=await target.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{focused:document.activeElement===el,visible:!!el.getClientRects().length,focusVisible:el.matches(':focus-visible'),outline:s.outlineStyle,outlineWidth:parseFloat(s.outlineWidth),x:r.x,y:r.y,right:r.right,bottom:r.bottom,viewport:{width:innerWidth,height:innerHeight}};});
    check(value.focused&&value.visible,label+': native focus reaches the intended visible element');
    check(value.focusVisible&&value.outline!=='none'&&value.outlineWidth>0,label+': keyboard destination has a visible focus outline');
    check(value.x>=-1&&value.y>=-1&&value.right<=value.viewport.width+1&&value.bottom<=value.viewport.height+1,label+': destination is inside the viewport');
    observations.push({label,focus:value});
  }
  async function navigate(kind,route,label){
    const before=await snapshot(),control=action(kind,'open-guide'),target=guide(kind,route),disclosures={};
    for(const key of ['comparison','force-speed','rotation','planning'])if(await guide(kind,key).count())disclosures[key]=await guide(kind,key).evaluate(el=>el.open);
    check(await control.getAttribute('data-ml-power-open-guide')===route,label+': practice routes to '+route);
    await press(control);await settle();
    check(await target.evaluate(el=>el.open),label+': related visual guide opens');
    let othersPreserved=true;for(const [key,value] of Object.entries(disclosures))if(key!==route)othersPreserved=othersPreserved&&await guide(kind,key).evaluate((el,wasOpen)=>el.open===wasOpen,value);
    check(othersPreserved,label+': other visual-guide disclosures keep their existing open or closed state');
    await focusCheck(target.locator(':scope > summary'),label+' guide');
    check(await unchanged(before),label+': opening guide preserves exact draft, hints, completion, records and physical settings');
    const back=target.locator('[data-ml-power-return-calculation]');
    check(await back.count()===1&&await back.evaluate(el=>el.tagName==='BUTTON'&&el.type==='button'&&!!el.textContent.trim()),label+': guide offers one named native return button');
    await press(back);await settle();await focusCheck(input(kind,'answer'),label+' return');
    check(await unchanged(before),label+': returning preserves exact draft, hints, completion, records and physical settings');
    return before;
  }
  async function steps(kind,expected,label){
    const values=await practice(kind).locator('[data-ml-power-step]').evaluateAll(els=>els.map(el=>({step:el.getAttribute('data-ml-power-step'),tag:el.tagName,text:el.textContent.trim(),visible:!!el.getClientRects().length})));
    check(values.map(v=>v.step).join(',')===expected.join(','),label+': only currently revealed calculation steps appear in formula/setup/result order');
    check(values.every(v=>/^H[1-6]$/.test(v.tag)&&v.visible&&v.text.startsWith(String({formula:1,setup:2,result:3}[v.step]))),label+': displayed steps are visible semantic headings numbered 1 for formula, 2 for setup and 3 for result');
    check(await practice(kind).locator('[role=status][aria-live=polite][aria-atomic=true]').count()===1,label+': feedback retains one atomic polite status region');
    observations.push({label,steps:values});
  }
  async function layout(kind,label){
    const overflow=await lab(kind).evaluate(el=>({page:document.documentElement.scrollWidth>innerWidth+1,panel:el.scrollWidth>el.clientWidth+1,children:Array.from(el.querySelectorAll('input,select,button,[data-ml-power-step],[data-ml-power-result]')).filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+1).map(n=>({tag:n.tagName,id:n.id,text:n.textContent,width:n.clientWidth,scroll:n.scrollWidth}))}));
    check(!overflow.page&&!overflow.panel&&!overflow.children.length,label+': navigation and calculation feedback fit without horizontal clipping');
    if(overflow.page||overflow.panel||overflow.children.length)observations.push({label,overflow});
  }
  async function shot(name,kind,target){await layout(kind,name);await target.scrollIntoViewIfNeeded();await settle();await target.screenshot({path:path.join(OUT,name+'.png')});shots.push(name);}
  async function goFromMap(kind,label){
    await open(map(kind));const before=await snapshot(),target=action(kind,'go-calculation');
    check(await target.count()===1&&await target.evaluate(el=>el.tagName==='BUTTON'&&el.type==='button'&&!!el.textContent.trim()),label+': tall skill map has one named native calculation shortcut');
    await press(target);await settle();await focusCheck(input(kind,'answer'),label+' map shortcut');
    check(await unchanged(before),label+': map shortcut preserves exact existing work');
    await map(kind).locator(':scope > summary').focus();await pg.keyboard.press('Enter');
  }
  try{
    await mount('windlass');await open(lab('windlass'));await steps('windlass',[],'Fresh windlass practice');
    const choices=await input('windlass','question').locator('option').evaluateAll(els=>els.map(el=>el.value));
    check(choices.length===19&&choices.every(key=>Object.hasOwn(routes,key)),'All nineteen windlass skills have independent guide-route expectations');
    for(const key of choices){await input('windlass','question').selectOption(key);await input('windlass','answer').fill('12.3400');await input('windlass','unit').selectOption('W');await navigate('windlass',routes[key],'Windlass '+key);}
    await input('windlass','question').selectOption('inputPower');await press(action('windlass','hint'));await steps('windlass',['formula'],'First input-power hint');await press(action('windlass','hint'));await steps('windlass',['formula','setup'],'Second input-power hint');
    await solve('windlass',50,'W');await result('windlass','correct');await steps('windlass',['formula','setup','result'],'Checked windlass calculation');await press(action('windlass','save'));
    await navigate('windlass','comparison','Checked and saved windlass calculation');await goFromMap('windlass','Desktop windlass');
    await shot('desktop-windlass-numbered-calculation','windlass',practice('windlass'));
    await input('windlass','question').selectOption('effortFromPower');await press(action('windlass','hint'));await press(action('windlass','hint'));await input('windlass','answer').fill('111.111');await input('windlass','unit').selectOption('N');
    await navigate('windlass','force-speed','Draft force-from-power calculation');await press(action('windlass','open-guide'));await settle();await shot('desktop-windlass-context-guide','windlass',guide('windlass','force-speed'));
    check(await recordsPreserved(),'Desktop navigation preserves unrelated saved design, efficiency and investigation evidence');

    await mount('screw',320,{dark:true});await open(lab('screw'));await input('screw','question').selectOption('rotationalWork');await press(action('screw','hint'));await press(action('screw','hint'));await input('screw','answer').fill('001250.000');await input('screw','unit').selectOption('J');await press(action('screw','reveal'));await result('screw','solution');await steps('screw',['formula','setup','result'],'Phone worked solution');await press(action('screw','save'));
    await navigate('screw','rotation','Phone screw viewed solution');await goFromMap('screw','Phone screw');
    check(await input('screw','answer').inputValue()==='001250.000'&&(await state()).benchPowerRecords.screw.rotationalWork.completion==='solution','Phone navigation retains exact typed formatting and viewed-solution record provenance');
    await shot('dark-phone-screw-numbered-solution','screw',practice('screw'));check(await recordsPreserved(),'Phone navigation preserves unrelated saved evidence');

    await mount('ramp');await open(lab('ramp'));await input('ramp','question').selectOption('budgetLoad');await solve('ramp',800,'N');await result('ramp','correct');await steps('ramp',['result'],'Result without opening hints');await press(action('ramp','save'));await navigate('ramp','planning','Ramp planning checked and saved answer');
    await input('ramp','question').selectOption('budgetTime');await input('ramp','answer').fill('2.5000');await input('ramp','unit').selectOption('s');await navigate('ramp','planning','Ramp time-at-budget draft');
    await input('ramp','question').selectOption('inputPower');await input('ramp','answer').fill('');await press(action('ramp','check'));await result('ramp','invalid');await steps('ramp',['result'],'Invalid checked answer');await navigate('ramp','comparison','Invalid ramp answer');
    await input('ramp','answer').fill('50');await input('ramp','unit').selectOption('N');await press(action('ramp','check'));await result('ramp','unit');await navigate('ramp','comparison','Wrong-unit ramp answer');
    await input('ramp','unit').selectOption('W');await input('ramp','answer').fill('100');await press(action('ramp','check'));await result('ramp','incorrect');await navigate('ramp','comparison','Incorrect ramp answer');await layout('ramp','Ramp planning and retry feedback');

    await mount('windlass',320,{contrast:true});await open(lab('windlass'));await input('windlass','question').selectOption('loadFromPower');await press(action('windlass','hint'));await press(action('windlass','hint'));await solve('windlass',400,'N');await result('windlass','correct');await steps('windlass',['formula','setup','result'],'Forced-colors numbered feedback');await navigate('windlass','force-speed','Forced-colors checked calculation');await goFromMap('windlass','Forced-colors map');
    await shot('forced-colors-windlass-calculation','windlass',practice('windlass'));check(await recordsPreserved(),'Forced-colors navigation preserves unrelated saved evidence');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,observations,errors},null,2)+'\n');console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1600))},null,2));if(errors.length)process.exitCode=1;await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
