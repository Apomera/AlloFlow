// Native React/THREE QA for the compound mechanical-power budget planner.
// node dev-tools/ml_compound_planning_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
// Reuse only the established helpers, before that harness's original scenarios.
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_compound_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-compound-lab-2026-10-11/browser','reports/machinelab-compound-planning-2026-10-11/browser');
bootstrap += String.raw`
  const planningSkills=['budgetTime','budgetLoad','budgetMovement','requiredEfficiency'];
  const planningUnits={budgetTime:'s',budgetLoad:'N',budgetMovement:'m',requiredEfficiency:'%'};
  function capacities(fixture,seconds=5,budget=100,percentIn=80,percentOut=90,movement=0.5){
    const eta=percentIn*percentOut/10000,work=fixture.load*movement;
    return {budgetTime:work/(eta*budget),budgetLoad:budget*seconds*eta/movement,
      budgetMovement:budget*seconds*eta/fixture.load,requiredEfficiency:100*work/(budget*seconds)};
  }
  async function budgetModel(fixture,seconds=5,budget=100,percentIn=80,percentOut=90,movement=0.5){
    const kind=fixture.kind,expected=capacities(fixture,seconds,budget,percentIn,percentOut,movement);
    const rows=await lab(kind).locator('[data-ml-compound-budget-metric]').evaluateAll(els=>els.map(el=>({key:el.getAttribute('data-ml-compound-budget-metric'),value:Number(el.dataset.value)})));
    check(rows.length===4,kind+': four budget calculations are present');
    rows.forEach(row=>check(near(row.value,expected[row.key]),kind+': '+row.key+' matches independently derived energy budget'));
    check(await action(kind,'budget-fit').getAttribute('data-ml-compound-budget-fit')===String(expected.budgetTime<=seconds+1e-10),kind+': budget fit agrees with work divided by efficiency and available time');
    check(await action(kind,'budget-ideal-fit').getAttribute('data-ml-compound-budget-ideal-fit')===String(expected.requiredEfficiency<=100+1e-10),kind+': ideal feasibility agrees with required efficiency');
    check(near(expected.budgetLoad*movement,budget*seconds*percentIn*percentOut/10000)&&near(expected.budgetMovement*fixture.load,budget*seconds*percentIn*percentOut/10000),kind+': load and movement are alternative tasks with the same useful-energy capacity');
    return expected;
  }
  async function energySnapshot(kind){return comparison(kind).locator('[data-ml-compound-metric]').evaluateAll(els=>els.map(el=>[el.getAttribute('data-ml-compound-metric'),el.dataset.value]));}
  async function powerSnapshot(kind){return lab(kind).locator('[data-ml-compound-power-metric]').evaluateAll(els=>els.map(el=>[el.getAttribute('data-ml-compound-power-metric'),el.dataset.value]));}
  async function capturePlanning(name,kind){
    await input(kind,'budget').focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');
    check(await input(kind,'budget').evaluate(el=>{const s=getComputedStyle(el);return el===document.activeElement&&el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0;}),name+': budget input has visible keyboard focus');
    check(await lab(kind).evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1&&Array.from(el.querySelectorAll('input,select,button,textarea,[data-ml-compound-budget-metric]')).every(child=>child.scrollWidth<=child.clientWidth+1)),name+': planner, cards and controls fit without horizontal overflow');
    await action(kind,'budget-plan').scrollIntoViewIfNeeded();
    const box=await lab(kind).evaluate(el=>{const top=el.querySelector('[data-ml-compound-budget-plan]').getBoundingClientRect(),bottom=el.querySelector('[data-ml-compound-result]').parentElement.getBoundingClientRect(),r=el.getBoundingClientRect();return{x:r.x+scrollX,y:top.y+scrollY,width:r.width,height:bottom.bottom-top.y};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:{x:Math.max(0,box.x-3),y:Math.max(0,box.y-3),width:box.width+6,height:box.height+6}});shots.push(name);
  }
  const energyRecord={version:1,benchId:'lever',second:'pulley',inputSettings:{leverEffortArm:2,leverLoadArm:1},
    outputSettings:{pulleySegments:2},load:400,loadDistance:0.5,percentIn:80,percentOut:90,
    question:'inputWork',answer:'277.78',unit:'J',explanation:'My earlier energy calculation stays fixed.',hint:1,completion:'checked'};
  const powerRecord={...energyRecord,version:2,question:'inputPower',answer:'55.556',unit:'W',seconds:5,
    explanation:'My earlier five-second power calculation stays fixed.'};
  preserved.benchCompoundRecords={lever:{inputWork:energyRecord,inputPower:powerRecord}};
  async function oldCompoundPreserved(){const records=(await state()).benchCompoundRecords.lever;return JSON.stringify(records.inputWork)===JSON.stringify(energyRecord)&&JSON.stringify(records.inputPower)===JSON.stringify(powerRecord);}
  try{
    for(const fixture of fixtures){
      const kind=fixture.kind;await mount(kind);const before=await state();await open(lab(kind));await open(comparison(kind));
      check(await sameExcept(before),kind+': opening planning disclosures does not mutate persisted state');
      check(await input(kind,'budget').inputValue()==='100',kind+': mechanical power budget defaults to 100 W');
      check(await input(kind,'question').locator('option').count()===18,kind+': original fourteen and four planning skills are available');
      const scope=await action(kind,'budget-plan').textContent();
      check(scope.includes('alternatives')&&scope.includes('no settings are applied')&&scope.includes('mechanical input power'),kind+': planner explains held-variable alternatives, mechanical scope and explicit calculation-only behavior');
      await model(fixture);const energy=JSON.stringify(await energySnapshot(kind)),power=JSON.stringify(await powerSnapshot(kind)),expected=await budgetModel(fixture);
      for(const skill of planningSkills){await input(kind,'question').selectOption(skill);await solve(kind,Number(expected[skill].toPrecision(5)),planningUnits[skill]);await result(kind,'correct');}
      check(await sameExcept(before,['benchCompound']),kind+': checking planner skills changes only compound practice state');
      await input(kind,'question').selectOption('budgetTime');await solve(kind,Number(expected.budgetTime.toPrecision(5)),'s');
      if(kind==='lever')await capturePlanning('desktop-compound-planning-checked',kind);
      await input(kind,'budget').fill('200');await resetPractice(kind);const doubled=await budgetModel(fixture,5,200);
      check(near(doubled.budgetTime,expected.budgetTime/2)&&near(doubled.budgetLoad,expected.budgetLoad*2)&&near(doubled.budgetMovement,expected.budgetMovement*2)&&near(doubled.requiredEfficiency,expected.requiredEfficiency/2),kind+': doubling the budget halves time and required efficiency, doubles capacity');
      check(JSON.stringify(await energySnapshot(kind))===energy&&JSON.stringify(await powerSnapshot(kind))===power,kind+': a budget edit leaves the existing task energy and power unchanged');
      await input(kind,'budget').fill('100');await input(kind,'duration').fill('10');await budgetModel(fixture,10);
      await input(kind,'duration').fill('0.5');await input(kind,'timeUnit').selectOption('min');await budgetModel(fixture,30);
      const minuteValues=await lab(kind).locator('[data-ml-compound-budget-metric]').evaluateAll(els=>els.map(el=>el.dataset.value));
      await input(kind,'duration').fill('30');await input(kind,'timeUnit').selectOption('s');await budgetModel(fixture,30);
      check(JSON.stringify(await lab(kind).locator('[data-ml-compound-budget-metric]').evaluateAll(els=>els.map(el=>el.dataset.value)))===JSON.stringify(minuteValues),kind+': half a minute and thirty seconds have equal capacities');
      check(await oldCompoundPreserved()&&await recordsPreserved(),kind+': existing energy, compound power, design, efficiency and single-machine power records stay fixed');
    }

    await mount('lever',390);await open(lab('lever'));await open(comparison('lever'));
    await input('lever','question').selectOption('budgetLoad');await press(action('lever','check'));await result('lever','invalid');
    for(const bad of ['-1','Infinity','abc']){await input('lever','answer').fill(bad);await press(action('lever','check'));await result('lever','invalid');}
    await solve('lever',720,'W');await result('lever','unit');check(await input('lever','unit').getAttribute('aria-invalid')==='true','Capacity expects newtons and identifies an incorrect watt unit');
    await input('lever','unit').selectOption('N');await input('lever','answer').fill('1440');await input('lever','answer').focus();await pg.keyboard.press('Enter');await result('lever','incorrect');
    await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-compound-hint-level')==='1','First planning hint gives the relation');
    await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-compound-hint-level')==='2'&&await action('lever','hint').isDisabled(),'Second planning hint substitutes task values and is final');
    await capturePlanning('phone-compound-planning-hints','lever');
    await input('lever','answer').fill('720');await input('lever','answer').focus();await pg.keyboard.press('Enter');await result('lever','correct');
    check(await action('lever','result').evaluate(el=>el.parentElement.getAttribute('role')==='status'&&el.parentElement.getAttribute('aria-live')==='polite'),'Planning feedback uses a polite live status');
    await input('lever','explanation').fill('The budget provides 360 J of useful energy, allowing 720 N over 0.5 m.');await press(action('lever','save'));
    let saved=(await state()).benchCompoundRecords.lever.budgetLoad;
    check(saved.version===3&&saved.seconds===5&&saved.budget===100&&saved.answer==='720'&&saved.unit==='N'&&saved.hint===2&&saved.completion==='checked','Planning record fixes time, budget, answer, units and hints as version three');
    check(await oldCompoundPreserved(),'Saving planning retains exact version-one and version-two compound records');
    const fixed=JSON.stringify((await state()).benchCompoundRecords),validPower=JSON.stringify(await powerSnapshot('lever'));
    for(const bad of ['','0','-1','0.009','100001','Infinity','abc']){
      await input('lever','budget').fill(bad);
      check(await input('lever','budget').getAttribute('aria-invalid')==='true'&&await lab('lever').locator('[data-ml-compound-budget-metric]').count()===0,'Invalid budget '+JSON.stringify(bad)+' hides derived capacities and identifies the control');
      for(const name of ['check','hint','reveal','save'])check(await action('lever',name).isDisabled(),'Invalid budget disables planning '+name);
      await input('lever','answer').fill('1');await input('lever','unit').selectOption('N');await input('lever','answer').focus();await pg.keyboard.press('Enter');check(await action('lever','result').count()===0,'Invalid budget cannot grade through Enter');
      check(JSON.stringify(await powerSnapshot('lever'))===validPower,'Invalid budget does not remove the original average-power flow');
    }
    await input('lever','question').selectOption('inputPower');await solve('lever',55.556,'W');await result('lever','correct');check(await action('lever','save').isEnabled(),'Previous power practice remains usable with invalid budget');
    await input('lever','duration').fill('');await input('lever','question').selectOption('idealMA');await solve('lever',4,'ratio');await result('lever','correct');check(await action('lever','save').isEnabled(),'Original energy practice remains usable with invalid budget and time');
    await input('lever','budget').fill('100');await input('lever','question').selectOption('budgetTime');check(await action('lever','check').isDisabled(),'Planning requires valid time even while power budget is valid');
    await input('lever','duration').fill('5');await input('lever','budget').fill('0.01');await budgetModel(fixtures[0],5,0.01);
    await input('lever','budget').fill('100000');await budgetModel(fixtures[0],5,100000);
    check(JSON.stringify((await state()).benchCompoundRecords)===fixed,'Invalid drafts and valid budget limits preserve all saved snapshots');

    await input('lever','budget').fill('50');await input('lever','duration').fill('8');await input('lever','percentIn').fill('50');await input('lever','percentOut').fill('100');await budgetModel(fixtures[0],8,50,50,100);
    check(await action('lever','budget-fit').getAttribute('data-ml-compound-budget-fit')==='true','Exact equality meets the available power budget');
    await input('lever','budget').fill('40');await budgetModel(fixtures[0],8,40,50,100);
    check(await action('lever','budget-fit').getAttribute('data-ml-compound-budget-fit')==='false'&&await action('lever','budget-ideal-fit').getAttribute('data-ml-compound-budget-ideal-fit')==='true','Insufficient current efficiency can still be feasible ideally');
    await input('lever','budget').fill('20');await budgetModel(fixtures[0],8,20,50,100);
    check(await action('lever','budget-ideal-fit').getAttribute('data-ml-compound-budget-ideal-fit')==='false','Required efficiency above 100% is impossible even ideally');
    await input('lever','question').selectOption('requiredEfficiency');await solve('lever',125,'%');await result('lever','correct');
    check((await action('lever','budget-plan').textContent()).includes('100%'),'Impossible task explains the physical 100% efficiency limit');
    await press(action('lever','next'));check(await input('lever','question').inputValue()==='idealMA','Next skill wraps from the fourth planning calculation to the original first skill');await resetPractice('lever');

    await mount('screw',320,{contrast:true});await open(lab('screw'));await open(comparison('screw'));await budgetModel(fixtures[5]);
    for(const skill of planningSkills){await input('screw','question').selectOption(skill);check(await input('screw','question').evaluate(el=>el.scrollWidth<=el.clientWidth+1),skill+': selected planning label fits at 320 px forced colors');}
    await input('screw','question').selectOption('requiredEfficiency');await press(action('screw','hint'));await press(action('screw','reveal'));await result('screw','solution');
    await input('screw','answer').fill('200');await input('screw','unit').selectOption('%');await press(action('screw','check'));await result('screw','solution');await press(action('screw','save'));
    check((await state()).benchCompoundRecords.screw.requiredEfficiency.completion==='solution','Checking after reveal retains honest worked-solution provenance');
    await capturePlanning('forced-colors-compound-planning-solution','screw');
    check(await input('screw','budget').evaluate(el=>getComputedStyle(el).borderStyle!=='none')&&await action('screw','check').evaluate(el=>getComputedStyle(el).borderStyle!=='none'),'Forced colors preserves visible budget input and action boundaries');

    await mount('lever');await open(lab('lever'));await open(comparison('lever'));await input('lever','question').selectOption('budgetLoad');await solve('lever',720,'N');await press(action('lever','save'));
    const geometrySaved=JSON.stringify((await state()).benchCompoundRecords),beforeGeometry=await budgetModel(fixtures[0]);
    await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowRight');await resetPractice('lever');await model({...fixtures[0],ma:2.1});const afterGeometry=await budgetModel({...fixtures[0],ma:2.1});
    check(JSON.stringify(beforeGeometry)===JSON.stringify(afterGeometry),'Input geometry changes force/travel while the energy-limited capacity stays fixed');
    await geometry('lever','pulleySegments').fill('4');await model({...fixtures[0],ma:2.1},4);await budgetModel({...fixtures[0],ma:2.1});
    check(JSON.stringify((await state()).benchCompoundRecords)===geometrySaved,'Both geometry controls preserve fixed planning and earlier compound records');
    await input('lever','budget').fill('80');await press(pg.locator('#ml-bench-tab-pulley'));await open(lab('pulley'));check(await input('pulley','budget').inputValue()==='100','Another station starts with its independent budget');
    await input('pulley','budget').fill('150');await press(pg.locator('#ml-bench-tab-lever'));await open(lab('lever'));check(await input('lever','budget').inputValue()==='80','Returning restores the station-specific budget');
    for(const band of ['k2','g35']){await mount('lever',390,{band});check(await pg.locator('[data-ml-compound]').count()===0,band+': advanced planning remains grade gated');}
    await mount('ramp',1150,{}, {rampLength:1,rampHeight:2});await open(lab('ramp'));check(await lab('ramp').locator('[data-ml-compound-budget-metric]').count()===0&&await action('ramp','check').count()===0,'Invalid machine geometry cannot produce or grade capacities');

    await mount('lever',390,{dark:true,band:'g912'});await open(lab('lever'));await input('lever','question').selectOption('budgetLoad');await solve('lever',720,'N');await press(action('lever','hint'));
    const note='Holding movement fixed, more available watts allows more load. <script>literal reflection</script>';
    await input('lever','explanation').fill(note);await press(action('lever','save'));const firstPlanning=JSON.stringify((await state()).benchCompoundRecords.lever.budgetLoad);
    await input('lever','duration').fill('0.5');await input('lever','timeUnit').selectOption('min');await input('lever','budget').fill('80');await input('lever','question').selectOption('budgetMovement');await press(action('lever','reveal'));await input('lever','answer').fill('4.32');await input('lever','unit').selectOption('m');await press(action('lever','save'));
    const finalRecords=(await state()).benchCompoundRecords.lever;
    check(JSON.stringify(finalRecords.budgetLoad)===firstPlanning&&finalRecords.budgetLoad.seconds===5&&finalRecords.budgetLoad.budget===100&&finalRecords.budgetMovement.seconds===30&&finalRecords.budgetMovement.budget===80&&finalRecords.budgetMovement.version===3&&await oldCompoundPreserved(),'Planning skills retain distinct fixed time/budget snapshots alongside exact v1/v2 records');
    await input('lever','duration').fill('10');await input('lever','timeUnit').selectOption('s');await input('lever','budget').fill('200');await input('lever','percentIn').fill('100');await pg.locator('#ml-leverLoad').focus();await pg.keyboard.press('ArrowRight');await open(lab('lever').locator('[data-ml-compound-saved=lever]'));
    await lab('lever').getByRole('button',{name:'Open work record',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const records=pg.locator('[data-ml-compound-record-station=lever]');check(await records.count()===4,'Work record displays one energy, one power and two planning records');
    const loadRecord=pg.locator('[data-ml-compound-record-station=lever][data-ml-compound-record-skill=budgetLoad]'),movementRecord=pg.locator('[data-ml-compound-record-station=lever][data-ml-compound-record-skill=budgetMovement]'),oldRecord=pg.locator('[data-ml-compound-record-station=lever][data-ml-compound-record-skill=inputWork]'),wattsRecord=pg.locator('[data-ml-compound-record-station=lever][data-ml-compound-record-skill=inputPower]');
    const loadText=await loadRecord.textContent(),movementText=await movementRecord.textContent(),oldText=await oldRecord.textContent(),wattsText=await wattsRecord.textContent();
    check(loadText.includes('720 N')&&loadText.includes('5 s')&&loadText.includes('100 W')&&loadText.includes('400 N')&&loadText.includes('80%')&&loadText.includes('90%')&&loadText.includes(note)&&loadText.includes('Answer checked'),'Load record retains original givens, budget, duration, checked answer and reflection');
    check(movementText.includes('30 s')&&movementText.includes('80 W')&&movementText.includes('4.32 m')&&movementText.includes('Worked solution viewed'),'Movement record preserves converted minutes, its budget and separate solution provenance');
    check(oldText.includes('277.78 J')&&oldText.includes(energyRecord.explanation)&&!oldText.includes('Average mechanical power'),'Original energy text remains unchanged');
    check(wattsText.includes('55.556 W')&&wattsText.includes('5 s')&&wattsText.includes(powerRecord.explanation),'Original compound-power record remains fixed');
    check(await loadRecord.locator('script').count()===0,'Planning reflection renders as literal text');
    check(await pg.locator('#ml-record-design-note-lever').inputValue()===savedNote&&await pg.locator('[data-ml-efficiency-record-station=lever]').count()===1&&await pg.locator('[data-ml-power-record-station=lever]').count()===1,'Planning records coexist with design, efficiency and single-machine power records');
    await capture('dark-phone-compound-planning-record',loadRecord);
    fs.mkdirSync(path.join(OUT,'downloads'),{recursive:true});const downloaded=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloaded,failure=await download.failure();if(failure)throw new Error('Native download failed: '+failure);
    const exported=fs.readFileSync(await download.path(),'utf8');await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&[loadText,movementText,oldText,wattsText,savedNote,note].every(text=>exported.includes(text)),'Native download contains fixed v1/v2/v3 records, original tasks and literal explanations');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,errors},null,2));
    console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(error=>error.slice(0,1000))},null,2));if(errors.length)process.exitCode=1;await b.close();
  }
})();`;
bootstrap += "`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
