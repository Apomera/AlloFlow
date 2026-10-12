// Native React/THREE QA for average power through a two-stage machine.
// node dev-tools/ml_compound_power_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
// Reuse the established native mount, screenshot and independent energy checks.
// Only the helper preamble is reused; this file supplies its own scenarios.
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_compound_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-compound-lab-2026-10-11/browser','reports/machinelab-compound-power-2026-10-11/browser');
bootstrap += String.raw`
  const powerSkills=['inputPower','transferPower','usefulPower','firstLossPower','secondLossPower'];
  const energyKeys=['inputWork','transferWork','workOut','firstLoss','secondLoss'];
  function powers(fixture,seconds=5,percentIn=80,percentOut=90){
    const energy=physical(fixture,2,percentIn,percentOut),out={};
    powerSkills.forEach((key,i)=>out[key]=energy[energyKeys[i]]/seconds);return out;
  }
  async function powerModel(fixture,seconds=5,percentIn=80,percentOut=90){
    const kind=fixture.kind,expected=powers(fixture,seconds,percentIn,percentOut);
    const rows=await lab(kind).locator('[data-ml-compound-power-metric]').evaluateAll(els=>els.map(el=>({key:el.getAttribute('data-ml-compound-power-metric'),value:Number(el.dataset.value)})));
    check(rows.length===5,kind+': five stage power values are present');
    rows.forEach(row=>check(near(row.value,expected[row.key]),kind+': '+row.key+' matches independently computed stage energy divided by '+seconds+' seconds'));
    check(near(expected.inputPower,expected.usefulPower+expected.firstLossPower+expected.secondLossPower),kind+': useful power and both losses balance input power');
    check(near(expected.usefulPower/expected.inputPower,percentIn*percentOut/10000),kind+': power and energy give the same combined efficiency');
    return expected;
  }
  async function energySnapshot(kind){return comparison(kind).locator('[data-ml-compound-metric]').evaluateAll(els=>els.map(el=>[el.getAttribute('data-ml-compound-metric'),el.dataset.value]));}
  async function powerSolve(kind,answer,unit='W'){return solve(kind,answer,unit);}
  async function capturePowerPractice(name,kind){
    await input(kind,'duration').focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');
    check(await input(kind,'duration').evaluate(el=>{const s=getComputedStyle(el);return el===document.activeElement&&el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0;}),name+': duration has visible keyboard focus');
    check(await lab(kind).evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1&&Array.from(el.querySelectorAll('input,select,button,textarea,[data-ml-compound-power-metric]')).every(child=>child.scrollWidth<=child.clientWidth+1)),name+': compound panel, power cards and controls fit without horizontal overflow');
    await action(kind,'power-flow').scrollIntoViewIfNeeded();
    // Capture the added power flow and its practice feedback at readable size.
    const box=await lab(kind).evaluate(el=>{const top=el.querySelector('[data-ml-compound-power-flow]').getBoundingClientRect(),bottom=el.querySelector('[data-ml-compound-result]').parentElement.getBoundingClientRect(),r=el.getBoundingClientRect();return{x:r.x+scrollX,y:top.y+scrollY,width:r.width,height:bottom.bottom-top.y};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:{x:Math.max(0,box.x-3),y:Math.max(0,box.y-3),width:box.width+6,height:box.height+6}});shots.push(name);
  }
  const energyRecord={version:1,benchId:'lever',second:'pulley',inputSettings:{leverEffortArm:2,leverLoadArm:1},
    outputSettings:{pulleySegments:2},load:400,loadDistance:0.5,percentIn:80,percentOut:90,
    question:'inputWork',answer:'277.78',unit:'J',explanation:'My earlier energy calculation stays fixed.',hint:1,completion:'checked'};
  preserved.benchCompoundRecords={lever:{inputWork:energyRecord}};
  async function oldEnergyPreserved(){return JSON.stringify((await state()).benchCompoundRecords.lever.inputWork)===JSON.stringify(energyRecord);}
  try{
    for(const fixture of fixtures){
      const kind=fixture.kind;await mount(kind);const before=await state();await open(lab(kind));await open(comparison(kind));
      check(await sameExcept(before),kind+': opening power flow does not mutate persisted state');
      check(await input(kind,'duration').inputValue()==='5'&&await input(kind,'timeUnit').inputValue()==='s',kind+': compound duration defaults to five seconds');
      check(await input(kind,'question').locator('option').count()===14,kind+': original nine and five power skills are available');
      await model(fixture);const energy=JSON.stringify(await energySnapshot(kind)),expected=await powerModel(fixture);
      for(const skill of powerSkills){await input(kind,'question').selectOption(skill);await powerSolve(kind,Number(expected[skill].toPrecision(5)));await result(kind,'correct');}
      check(await sameExcept(before,['benchCompound']),kind+': checking power skills changes only compound practice state');
      await input(kind,'question').selectOption('inputPower');await powerSolve(kind,Number(expected.inputPower.toPrecision(5)));
      if(kind==='lever')await capturePowerPractice('desktop-compound-power-checked',kind);
      const beforeTime=await state();await input(kind,'duration').fill('10');await resetPractice(kind);const slower=await powerModel(fixture,10);
      check(powerSkills.every(skill=>near(slower[skill],expected[skill]/2)),kind+': doubling duration halves all five average powers');
      check(JSON.stringify(await energySnapshot(kind))===energy&&await sameExcept(beforeTime,['benchCompound']),kind+': changing time preserves work, force, travel, geometry and animation state');
      await input(kind,'duration').fill('0.5');await input(kind,'timeUnit').selectOption('min');await powerModel(fixture,30);
      const minuteValues=await lab(kind).locator('[data-ml-compound-power-metric]').evaluateAll(els=>els.map(el=>el.dataset.value));
      await input(kind,'duration').fill('30');await input(kind,'timeUnit').selectOption('s');await powerModel(fixture,30);
      check(JSON.stringify(await lab(kind).locator('[data-ml-compound-power-metric]').evaluateAll(els=>els.map(el=>el.dataset.value)))===JSON.stringify(minuteValues),kind+': half a minute and thirty seconds yield identical power');
      await input(kind,'percentIn').fill('100');await input(kind,'percentOut').fill('100');await powerModel(fixture,30,100,100);
      check(Number(await lab(kind).locator('[data-ml-compound-power-metric=firstLossPower]').getAttribute('data-value'))===0&&Number(await lab(kind).locator('[data-ml-compound-power-metric=secondLossPower]').getAttribute('data-value'))===0,kind+': ideal stages have zero power loss');
      check(await oldEnergyPreserved()&&await recordsPreserved(),kind+': earlier energy, single-machine power, efficiency and design records remain unchanged');
    }

    await mount('lever',390);await open(lab('lever'));await open(comparison('lever'));
    await input('lever','duration').focus();await pg.keyboard.press('Control+A');await pg.keyboard.type('2');await powerModel(fixtures[0],2);
    await input('lever','question').selectOption('inputPower');await input('lever','question').focus();await pg.keyboard.press('ArrowDown');await pg.keyboard.press('Enter');
    check(await input('lever','question').inputValue()==='transferPower','Keyboard selection advances into the between-stages power skill');
    await press(action('lever','check'));await result('lever','invalid');
    for(const bad of ['-1','Infinity','abc']){await input('lever','answer').fill(bad);await press(action('lever','check'));await result('lever','invalid');}
    await powerSolve('lever',111.111,'J');await result('lever','unit');
    check(await input('lever','unit').getAttribute('aria-invalid')==='true','Joules do not substitute for watts and identify the unit control');
    await input('lever','unit').selectOption('W');await input('lever','answer').fill('222.222');await input('lever','answer').focus();await pg.keyboard.press('Enter');await result('lever','incorrect');
    check((await action('lever','result').textContent()).includes('divide by the task duration in seconds'),'Power feedback explains dividing energy by duration');
    await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-compound-hint-level')==='1','First power hint shows the relationship');
    await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-compound-hint-level')==='2'&&await action('lever','hint').isDisabled(),'Second power hint shows substitution and is final');
    await capturePowerPractice('phone-compound-power-hints','lever');
    await input('lever','answer').fill('111.1');await input('lever','answer').focus();await pg.keyboard.press('Enter');await result('lever','correct');
    check(await action('lever','result').evaluate(el=>el.parentElement.getAttribute('role')==='status'&&el.parentElement.getAttribute('aria-live')==='polite'),'Power feedback has a polite status announcement');
    await input('lever','explanation').fill('Twice the time halves power, but the task uses the same energy.');await press(action('lever','save'));
    let saved=(await state()).benchCompoundRecords.lever.transferPower;
    check(saved.version===2&&saved.seconds===2&&saved.answer==='111.1'&&saved.unit==='W'&&saved.hint===2&&saved.completion==='checked','Power record fixes converted seconds, rounded answer, units and hints using version two');
    check(await oldEnergyPreserved(),'Saving power retains the exact earlier version-one energy record');
    const fixed=JSON.stringify((await state()).benchCompoundRecords);
    await input('lever','duration').fill('4');await resetPractice('lever');await powerModel(fixtures[0],4);
    for(const bad of ['','0','-1','0.009','3601','Infinity','abc']){
      await input('lever','duration').fill(bad);
      check(await input('lever','duration').getAttribute('aria-invalid')==='true'&&await action('lever','power-invalid').count()===1&&await lab('lever').locator('[data-ml-compound-power-metric]').count()===0,'Invalid seconds '+JSON.stringify(bad)+' removes power values and identifies the duration');
      for(const name of ['check','hint','reveal','save'])check(await action('lever',name).isDisabled(),'Invalid time disables power '+name);
      await input('lever','answer').fill('1');await input('lever','unit').selectOption('W');await input('lever','answer').focus();await pg.keyboard.press('Enter');
      check(await action('lever','result').count()===0,'Invalid time cannot check a power answer through Enter');
    }
    check(await comparison('lever').locator('[data-ml-compound-metric]').count()===13,'Invalid time retains every force, travel and energy value');
    await input('lever','question').selectOption('idealMA');await solve('lever',4,'ratio');await result('lever','correct');
    check(await action('lever','save').isEnabled(),'Original calculation practice remains available with invalid time');
    await input('lever','question').selectOption('inputPower');
    await input('lever','timeUnit').selectOption('min');await input('lever','duration').fill('60.001');check(await input('lever','duration').getAttribute('aria-invalid')==='true'&&await action('lever','check').isDisabled(),'Minute upper bound is validated after conversion');
    await input('lever','duration').fill('60');await powerModel(fixtures[0],3600);await input('lever','timeUnit').selectOption('s');await input('lever','duration').fill('0.01');await powerModel(fixtures[0],0.01);
    await input('lever','duration').fill('3600');await powerModel(fixtures[0],3600);
    check(JSON.stringify((await state()).benchCompoundRecords)===fixed,'Invalid drafts, unit conversion and boundary durations preserve all fixed records');

    await mount('screw',320,{contrast:true});await open(lab('screw'));await open(comparison('screw'));await powerModel(fixtures[5]);
    await input('screw','question').selectOption('firstLossPower');await press(action('screw','hint'));await press(action('screw','reveal'));await result('screw','solution');
    await input('screw','answer').fill(String(Number(powers(fixtures[5]).firstLossPower.toPrecision(5))));await input('screw','unit').selectOption('W');await press(action('screw','check'));await result('screw','solution');await press(action('screw','save'));
    check((await state()).benchCompoundRecords.screw.firstLossPower.completion==='solution','Rechecking after reveal retains honest worked-solution provenance');
    await capturePowerPractice('forced-colors-compound-power-solution','screw');
    check(await input('screw','duration').evaluate(el=>getComputedStyle(el).borderStyle!=='none')&&await action('screw','check').evaluate(el=>getComputedStyle(el).borderStyle!=='none'),'Forced colors retains duration and action boundaries');
    check(await lab('screw').locator('[data-ml-compound-power-metric]').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth+1)),'Narrow power cards fit their available widths');

    await mount('lever');await open(lab('lever'));await open(comparison('lever'));await input('lever','question').selectOption('inputPower');await powerSolve('lever',55.556);await press(action('lever','save'));
    const geometrySaved=JSON.stringify((await state()).benchCompoundRecords),beforeGeometry=await powerModel(fixtures[0]);
    await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowRight');await resetPractice('lever');await model({...fixtures[0],ma:2.1});const afterGeometry=await powerModel({...fixtures[0],ma:2.1});
    check(JSON.stringify(afterGeometry)===JSON.stringify(beforeGeometry),'Input geometry changes force and travel without changing power for the same task');
    await geometry('lever','pulleySegments').fill('4');await model({...fixtures[0],ma:2.1},4);await powerModel({...fixtures[0],ma:2.1});
    check(JSON.stringify((await state()).benchCompoundRecords)===geometrySaved,'Both stage geometry edits preserve fixed power and earlier energy records');
    await input('lever','duration').fill('8');await press(pg.locator('#ml-bench-tab-pulley'));await open(lab('pulley'));check(await input('pulley','duration').inputValue()==='5','Another station keeps an independent default duration');
    await input('pulley','duration').fill('3');await press(pg.locator('#ml-bench-tab-lever'));await open(lab('lever'));check(await input('lever','duration').inputValue()==='8','Returning restores this station duration');
    for(const band of ['k2','g35']){await mount('lever',390,{band});check(await pg.locator('[data-ml-compound]').count()===0,band+': advanced compound power remains grade gated');}
    await mount('ramp',1150,{}, {rampLength:1,rampHeight:2});await open(lab('ramp'));check(await lab('ramp').locator('[data-ml-compound-power-metric]').count()===0&&await action('ramp','check').count()===0,'Invalid machine geometry cannot produce or grade compound power');

    await mount('lever',390,{dark:true,band:'g912'});await open(lab('lever'));await input('lever','question').selectOption('inputPower');await powerSolve('lever',55.556);await press(action('lever','hint'));
    const note='Taking twice as long needs half the watts but the same joules. <script>plain reflection text</script>';
    await input('lever','explanation').fill(note);await press(action('lever','save'));
    const firstPower=JSON.stringify((await state()).benchCompoundRecords.lever.inputPower);
    await input('lever','duration').fill('0.5');await input('lever','timeUnit').selectOption('min');await input('lever','question').selectOption('transferPower');await press(action('lever','reveal'));await input('lever','answer').fill('7.4074');await input('lever','unit').selectOption('W');await press(action('lever','save'));
    const finalRecords=(await state()).benchCompoundRecords.lever;
    check(JSON.stringify(finalRecords.inputPower)===firstPower&&finalRecords.inputPower.seconds===5&&finalRecords.transferPower.seconds===30&&finalRecords.transferPower.version===2&&await oldEnergyPreserved(),'Version-two power skills retain distinct five-second and thirty-second snapshots alongside the exact version-one record');
    await input('lever','duration').fill('10');await input('lever','timeUnit').selectOption('s');await input('lever','percentIn').fill('100');await pg.locator('#ml-leverLoad').focus();await pg.keyboard.press('ArrowRight');await open(lab('lever').locator('[data-ml-compound-saved=lever]'));
    await lab('lever').getByRole('button',{name:'Open work record',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const records=pg.locator('[data-ml-compound-record-station=lever]');check(await records.count()===3,'Work record displays the old energy skill and both new power skills');
    const inputRecord=pg.locator('[data-ml-compound-record-station=lever][data-ml-compound-record-skill=inputPower]'),transferRecord=pg.locator('[data-ml-compound-record-station=lever][data-ml-compound-record-skill=transferPower]'),oldRecord=pg.locator('[data-ml-compound-record-station=lever][data-ml-compound-record-skill=inputWork]');
    const inputText=await inputRecord.textContent(),transferText=await transferRecord.textContent(),oldText=await oldRecord.textContent();
    check(inputText.includes('55.556 W')&&inputText.includes('5 s')&&inputText.includes('400 N')&&inputText.includes('80%')&&inputText.includes('90%')&&inputText.includes(note)&&inputText.includes('Answer checked'),'Input-power record retains original task, efficiency, duration, entered answer and checked reflection');
    check(transferText.includes('30 s')&&transferText.includes('7.4074 W')&&transferText.includes('Worked solution viewed'),'Transfer-power record preserves converted minutes and separate solution provenance');
    check(oldText.includes('277.78 J')&&oldText.includes(energyRecord.explanation)&&!oldText.includes('Average mechanical power'),'Original version-one energy record keeps its original task-only text');
    check(await inputRecord.locator('script').count()===0,'Power reflection is displayed as literal text');
    check(await pg.locator('#ml-record-design-note-lever').inputValue()===savedNote&&await pg.locator('[data-ml-efficiency-record-station=lever]').count()===1&&await pg.locator('[data-ml-power-record-station=lever]').count()===1,'New compound power records coexist with design, efficiency and single-machine power work');
    await capture('dark-phone-compound-power-record',inputRecord);
    fs.mkdirSync(path.join(OUT,'downloads'),{recursive:true});const downloaded=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloaded,failure=await download.failure();if(failure)throw new Error('Native download failed: '+failure);
    const exported=fs.readFileSync(await download.path(),'utf8');await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&exported.includes(inputText)&&exported.includes(transferText)&&exported.includes(oldText)&&exported.includes(savedNote)&&exported.includes(note),'Native text download contains every fixed power and energy task, reflection and earlier record');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,errors},null,2));
    console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(error=>error.slice(0,1000))},null,2));if(errors.length)process.exitCode=1;await b.close();
  }
})();`;
bootstrap += "`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
