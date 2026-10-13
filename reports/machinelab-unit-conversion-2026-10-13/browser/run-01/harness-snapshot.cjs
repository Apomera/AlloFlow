// Native React/THREE QA for reciprocal unit conversions and their visual guide.
const fs=require('fs'),path=require('path'),vm=require('vm');
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-unit-conversion-2026-10-13/browser/run-01');
bootstrap+=String.raw`
  const observations=[],conversionSkills=['powerKilowatts','powerWatts','timeMinutes','timeSeconds','speedCentimetres','speedMetres'];
  const conversionUnits={powerKilowatts:'kW',powerWatts:'W',timeMinutes:'min',timeSeconds:'s',speedCentimetres:'cm/s',speedMetres:'m/s'};
  const guide=kind=>lab(kind).locator('[data-ml-power-units='+kind+']');
  const map=kind=>lab(kind).locator('[data-ml-power-skill-map='+kind+']');
  const skill=(kind,key)=>map(kind).locator('[data-ml-power-skill='+key+']');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  function quantities(fixture,percent=80,seconds=5,movement=.5){
    const watts=fixture.load*movement/(percent/100)/seconds,metresPerSecond=movement*fixture.ma/seconds;
    return{watts,kilowatts:watts/1000,seconds,minutes:seconds/60,metresPerSecond,centimetresPerSecond:metresPerSecond*100};
  }
  function answers(p){return{powerKilowatts:p.kilowatts,powerWatts:p.watts,timeMinutes:p.minutes,timeSeconds:p.seconds,speedCentimetres:p.centimetresPerSecond,speedMetres:p.metresPerSecond};}
  async function panels(kind){await open(lab(kind));await open(guide(kind));await settle();}
  async function inspect(fixture,percent=80,seconds=5,movement=.5){
    await settle();const kind=fixture.kind,p=quantities(fixture,percent,seconds,movement),target=guide(kind);
    check(await target.count()===1,kind+': unit-conversion guide is available once');
    check(await target.locator(':scope > summary').evaluate(el=>el.tagName==='SUMMARY'&&!!el.textContent.trim()),kind+': unit guide has a named native disclosure');
    const metrics=await target.locator('[data-ml-power-unit-metric]').evaluateAll(els=>els.map(el=>({key:el.getAttribute('data-ml-power-unit-metric'),value:Number(el.dataset.value),text:el.textContent.trim(),semantic:!!el.querySelector('dt')&&!!el.querySelector('dd')})));
    check(metrics.length===6&&new Set(metrics.map(m=>m.key)).size===6,kind+': six unit readings appear exactly once');
    for(const metric of metrics)check(near(metric.value,p[metric.key])&&metric.semantic,kind+': '+metric.key+' agrees with independently derived units and uses a term/definition pair');
    check(near(p.kilowatts*1000,p.watts)&&near(p.minutes*60,p.seconds)&&near(p.centimetresPerSecond/100,p.metresPerSecond),kind+': forward and reverse unit factors preserve each physical quantity');
    const cards=await target.locator('[data-ml-power-unit-card]').evaluateAll(els=>els.map(el=>({kind:el.getAttribute('data-ml-power-unit-card'),text:el.textContent.trim(),labelled:el.tagName==='FIGURE'&&!!el.querySelector(':scope > figcaption')?.textContent.trim(),factors:Array.from(el.querySelectorAll('[data-ml-power-unit-factor]')).map(n=>({direction:n.getAttribute('data-ml-power-unit-factor'),text:n.textContent.trim()}))})));
    check(cards.length===3&&cards.map(c=>c.kind).join(',')==='power,time,speed'&&cards.every(c=>c.labelled),kind+': three captioned figures separate power, time and speed conversions');
    const factors={power:['W → kW: ÷ 1000','kW → W: × 1000'],time:['s → min: ÷ 60','min → s: × 60'],speed:['m/s → cm/s: × 100','cm/s → m/s: ÷ 100']};
    for(const card of cards)check(card.factors.length===2&&card.factors[0].direction==='forward'&&card.factors[1].direction==='reverse'&&card.factors.every((f,i)=>f.text===factors[card.kind][i]),kind+': '+card.kind+' presents the correct forward and reverse factors with explicit starting and requested units');
    observations.push({kind,percent,seconds,movement,expected:p,metrics,cards});return p;
  }
  async function layout(kind,label){
    const overflow=await lab(kind).evaluate(el=>({page:document.documentElement.scrollWidth>innerWidth+1,panel:el.scrollWidth>el.clientWidth+1,children:Array.from(el.querySelectorAll('input,select,button,figure,figcaption,dt,dd,[data-ml-power-question-title],[data-ml-power-result],[data-ml-power-unit-card]')).filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+1).map(n=>({tag:n.tagName,id:n.id,text:n.textContent,width:n.clientWidth,scroll:n.scrollWidth}))}));
    check(!overflow.page&&!overflow.panel&&!overflow.children.length,label+': unit cards, numerical readings and practice controls fit without horizontal clipping');if(overflow.page||overflow.panel||overflow.children.length)observations.push({label,overflow});
  }
  async function shot(name,kind,target){await layout(kind,name);await target.scrollIntoViewIfNeeded();await settle();await target.screenshot({path:path.join(OUT,name+'.png')});shots.push(name);}
  async function focusCheck(target,label){
    const v=await target.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{focused:document.activeElement===el,visible:!!el.getClientRects().length,outline:el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0,inView:r.x>=-1&&r.y>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1};});
    check(v.focused&&v.visible&&v.outline&&v.inView,label+': native keyboard destination is visible, in view and outlined');
  }
  async function navigate(kind,label){
    const before=JSON.stringify(await state());check(await action(kind,'open-guide').getAttribute('data-ml-power-open-guide')==='units',label+': contextual navigation targets the unit guide');
    await press(action(kind,'open-guide'));await settle();check(await guide(kind).evaluate(el=>el.open),label+': unit guide opens');await focusCheck(guide(kind).locator(':scope > summary'),label+' guide');
    await press(guide(kind).locator('[data-ml-power-return-calculation]'));await settle();await focusCheck(input(kind,'answer'),label+' return');
    check(JSON.stringify(await state())===before,label+': guide round trip preserves the exact draft, hints, completion, records and physical setup');
  }
  async function keyboard(kind,label){
    const controls=guide(kind).locator('button:visible,summary:visible');let focused=true,outlined=true,labelled=true;
    for(let i=0;i<await controls.count();i++){const control=controls.nth(i);await control.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');const v=await control.evaluate(el=>{const s=getComputedStyle(el);return{focus:el===document.activeElement,outline:el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0,label:!!el.textContent.trim()};});focused=focused&&v.focus;outlined=outlined&&v.outline;labelled=labelled&&v.label;}
    check(focused&&outlined&&labelled,label+': unit-guide controls have accessible labels and visible keyboard focus');
  }
  try{
    for(const fixture of fixtures){const kind=fixture.kind;await mount(kind);const before=await state();await open(lab(kind));check(!await guide(kind).evaluate(el=>el.open),kind+': unit guide starts closed');await panels(kind);check(await sameExcept(before),kind+': opening the unit guide changes no persisted state');const p=await inspect(fixture),expected=answers(p);
      const choices=await input(kind,'question').locator('option').evaluateAll(els=>els.map(el=>el.value));check(choices.length===(fixture.radius?25:18)&&choices.slice(-6).join(',')===conversionSkills.join(','),kind+': all six conversion skills append after existing skills');
      await open(map(kind));const tileKinds=await map(kind).locator('[data-ml-power-skill]').evaluateAll(els=>els.map(el=>el.getAttribute('data-ml-power-skill')));check(tileKinds.length===choices.length&&new Set(tileKinds).size===choices.length&&choices.every(k=>tileKinds.includes(k)),kind+': map and selector include every skill once');
      await input(kind,'question').selectOption('inputPower');await solve(kind,p.watts,'W');await result(kind,'correct');await press(action(kind,'save'));
      await input(kind,'question').selectOption('budgetEnergy');await solve(kind,500,'J');await result(kind,'correct');await press(action(kind,'save'));
      if(fixture.radius){await input(kind,'question').selectOption('turns');await solve(kind,.5*fixture.ma/(2*Math.PI*fixture.radius),'turns');await result(kind,'correct');await press(action(kind,'save'));}
      await input(kind,'question').selectOption('loadFromPower');await solve(kind,fixture.load,'N');await result(kind,'correct');await press(action(kind,'save'));
      const old=(await state()).benchPowerRecords[kind],legacySnapshot=JSON.stringify(old);check(old.inputPower.version===1&&old.budgetEnergy.version===2&&(!fixture.radius||old.turns.version===3)&&old.loadFromPower.version===4,kind+': earlier skills retain their version-1 through version-4 record contracts');
      for(const key of conversionSkills){await skill(kind,key).focus();await pg.keyboard.press('Enter');await resetPractice(kind);check(await input(kind,'question').inputValue()===key&&await skill(kind,key).getAttribute('aria-pressed')==='true',kind+': keyboard skill tile selects '+key);
        const answer=expected[key],unit=conversionUnits[key];await solve(kind,answer,'N');await result(kind,'unit');check(await action(kind,'save').isDisabled(),kind+': '+key+' rejects a physically unrelated answer unit');
        await solve(kind,answer*2,unit);await result(kind,'incorrect');await press(action(kind,'hint'));await press(action(kind,'hint'));check(await action(kind,'hint-level').getAttribute('data-ml-power-hint-level')==='2',kind+': '+key+' reveals both relationship and substitution hints');
        await solve(kind,Number(answer.toPrecision(5)),unit);await result(kind,'correct');await press(action(kind,'save'));const record=(await state()).benchPowerRecords[kind][key];
        check(record.version===5&&record.completion==='checked'&&record.unit===unit&&record.hint===2,kind+': '+key+' saves a checked version-5 record with requested unit and both hints');check(await skill(kind,key).getAttribute('data-ml-power-skill-status')==='checked'&&await skill(kind,key).getAttribute('data-ml-power-skill-setup')==='current',kind+': '+key+' map reflects checked current-task provenance');await navigate(kind,kind+' '+key);
      }
      const records=(await state()).benchPowerRecords[kind];check(JSON.stringify(Object.fromEntries(Object.keys(old).map(k=>[k,records[k]])))===legacySnapshot&&Object.keys(records).length===Object.keys(old).length+6,kind+': conversion records coexist with unchanged earlier evidence');check(await sameExcept(before,['benchPower','benchPowerRecords'])&&await recordsPreserved(),kind+': unit practice preserves physical settings and unrelated saved evidence');
      await press(action(kind,'next'));check(await input(kind,'question').inputValue()==='inputPower',kind+': Next wraps from the final conversion skill to input power');
      if(kind==='windlass'){await keyboard(kind,'Desktop unit guide');await shot('desktop-windlass-unit-guide',kind,guide(kind));}
      if(kind==='ramp'){await input(kind,'question').selectOption('speedCentimetres');await solve(kind,expected.speedCentimetres,'cm/s');await result(kind,'correct');await press(action(kind,'hint'));await press(action(kind,'hint'));await map(kind).locator(':scope > summary').focus();await pg.keyboard.press('Enter');await shot('desktop-ramp-conversion-practice',kind,lab(kind).locator('[data-ml-power-practice]'));}
      const fixed=JSON.stringify((await state()).benchPowerRecords);await input(kind,'duration').fill('.5');await input(kind,'timeUnit').selectOption('min');const slower=await inspect(fixture,80,30);check(near(slower.watts,p.watts/6)&&near(slower.metresPerSecond,p.metresPerSecond/6)&&near(slower.minutes,.5),kind+': half-minute duration recalculates equivalent units consistently');
      await input(kind,'percent').fill('100');const ideal=await inspect(fixture,100,30);check(near(ideal.watts,slower.watts*.8)&&near(ideal.metresPerSecond,slower.metresPerSecond),kind+': efficiency changes power conversions but leaves speed conversions fixed');check(JSON.stringify((await state()).benchPowerRecords)===fixed,kind+': changed assumptions preserve every saved fixed snapshot');
    }
    const screw=fixtures.find(f=>f.kind==='screw');await mount('screw',320,{dark:true});await panels('screw');const p=await inspect(screw),expected=answers(p);
    await input('screw','question').selectOption('powerKilowatts');await press(action('screw','hint'));await press(action('screw','hint'));await input('screw','answer').fill(String(expected.powerKilowatts));await input('screw','unit').selectOption('kW');await input('screw','answer').focus();await pg.keyboard.press('Enter');await result('screw','correct');await press(action('screw','save'));await navigate('screw','Dark phone checked conversion');
    await input('screw','question').selectOption('speedMetres');await press(action('screw','reveal'));await result('screw','solution');await solve('screw',expected.speedMetres,'m/s');await result('screw','solution');await press(action('screw','save'));check((await state()).benchPowerRecords.screw.speedMetres.version===5&&(await state()).benchPowerRecords.screw.speedMetres.completion==='solution','Viewed conversion solution retains its version and provenance after checking');await navigate('screw','Dark phone viewed conversion');
    await keyboard('screw','Dark phone unit guide');await shot('dark-phone-screw-unit-guide','screw',guide('screw'));for(const key of conversionSkills){await input('screw','question').selectOption(key);await layout('screw','Dark phone '+key);}
    const fixed=JSON.stringify((await state()).benchPowerRecords);await input('screw','duration').fill('');check(await guide('screw').count()===0&&await action('screw','check').count()===0,'Invalid duration removes stale unit readings and checking');await input('screw','duration').fill('10');await panels('screw');await inspect(screw,80,10);check(JSON.stringify((await state()).benchPowerRecords)===fixed,'Invalid and repaired assumptions preserve saved conversion practice');
    await open(lab('screw').locator('[data-ml-power-saved=screw]'));await lab('screw').getByRole('button',{name:'Open work record',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');const textRecords=await pg.locator('[data-ml-power-record-station=screw]').allTextContents();check(textRecords.length===2&&textRecords.some(t=>t.includes('Hints opened: 2/2')),'Work record includes both conversion skills and original hint provenance');
    const pending=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();const download=await pending;if(await download.failure())throw Error('Native text download failed');const exported=fs.readFileSync(await download.path(),'utf8');await download.saveAs(path.join(OUT,'downloaded-record.txt'));check(download.suggestedFilename()==='machine-lab-work-record.txt'&&textRecords.every(t=>exported.includes(t))&&exported.includes(savedNote),'Native downloaded text retains both conversion records and unrelated design evidence');
    const windlass=fixtures.find(f=>f.kind==='windlass');await mount('windlass',320,{contrast:true});await panels('windlass');const forced=await inspect(windlass);await input('windlass','question').selectOption('timeMinutes');await solve('windlass',forced.minutes,'min');await result('windlass','correct');await navigate('windlass','Forced-colors checked conversion');await keyboard('windlass','Forced-colors unit guide');await shot('forced-colors-windlass-unit-guide','windlass',guide('windlass'));check(await recordsPreserved(),'Forced-colors unit practice preserves unrelated saved evidence');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,observations,errors},null,2)+'\n');console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1600))},null,2));if(errors.length)process.exitCode=1;await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
