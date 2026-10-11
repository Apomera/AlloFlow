// Native React/THREE QA for average power, motion and independent skill records.
//   node dev-tools/ml_power_lab_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
const browserTemp=path.resolve(process.argv[2] || 'reports/machinelab-power-lab-2026-10-11/browser','browser-temp');
fs.mkdirSync(browserTemp,{recursive:true}); process.env.TEMP=browserTemp; process.env.TMP=browserTemp;
process.env.PLAYWRIGHT_BROWSERS_PATH=process.env.PLAYWRIGHT_BROWSERS_PATH || 'C:/Users/cabba/AppData/Local/ms-playwright';
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');
source=source.slice(0,source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-power-lab-2026-10-11/browser');")
  .replace('deviceScaleFactor: 2','deviceScaleFactor: 1, acceptDownloads: true')
  .replace('chromium.launch({ args:',"chromium.launch({ downloadsPath: path.join(OUT,'downloads'), args:")
  .replace('const b = await chromium.launch(','let b = await chromium.launch(')
  .replace('const pg = await b.newPage(','let pg = await b.newPage(')
  .replace('var ctx = {','window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks=[],shots=[];
  // Derive expectations independently, without calling the application's math.
  const fixtures=[{kind:'lever',load:400,ma:2},{kind:'pulley',load:400,ma:2},
    {kind:'windlass',load:400,ma:0.45/0.1,radius:0.45},{kind:'ramp',load:400,ma:4},
    {kind:'wedge',load:800,ma:0.3/0.06},{kind:'screw',load:2000,ma:2*Math.PI*0.15/0.005,radius:0.15}];
  const units={inputPower:'W',usefulPower:'W',lossPower:'W',handSpeed:'m/s',loadSpeed:'m/s',budgetTime:'s',torque:'N·m',rpm:'rpm'};
  const lever={leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:0.5};
  const savedNote='This fixed ideal design needs 200 N effort and 1 m of hand travel for 200 J of work.';
  const evidence={benchId:'lever',before:{settings:lever},after:{settings:{...lever,leverEffortArm:4}},
    note:'My separate geometry investigation.',investigation:{id:'lever-one-change-v1',force:'same',distance:'more'}};
  const preserved={benchExperiments:{lever:evidence},benchReferences:{lever},
    benchInvestigations:{lever:{id:'lever-one-change-v1',force:'same',distance:'more',tested:true}},
    benchDesignRecords:{lever:{benchId:'lever',settings:lever,limits:{force:250,travel:1.25},control:'leverEffortArm',note:savedNote}},
    benchEfficiencyRecords:{lever:{version:1,benchId:'lever',settings:lever,percent:80,question:'input',answer:'250',unit:'J',hint:1,completion:'checked'}}};
  const recordKeys=Object.keys(preserved);
  function check(ok,label){checks.push(label);if(!ok)errors.push(label);}
  function near(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));}
  function lab(kind){return pg.locator('[data-ml-power='+kind+']');}
  function comparison(kind){return lab(kind).locator('[data-ml-power-comparison='+kind+']');}
  function input(kind,key){return pg.locator('#ml-power-'+key+'-'+kind);}
  function action(kind,key){return lab(kind).locator('[data-ml-power-'+key+']');}
  function design(kind){return pg.locator('[data-ml-design='+kind+']');}
  async function open(target){if(!await target.evaluate(el=>el.open)){await target.locator(':scope > summary').focus();await pg.keyboard.press('Enter');}}
  async function press(target){await target.focus();await pg.keyboard.press('Enter');}
  async function state(){return pg.evaluate(()=>window.__qaState);}
  async function sameExcept(before,keys=[]){return pg.evaluate(([before,keys])=>Object.keys(before).every(k=>keys.includes(k)||
    JSON.stringify(window.__qaState[k])===JSON.stringify(before[k]))&&Object.keys(window.__qaState).every(k=>
    keys.includes(k)||Object.prototype.hasOwnProperty.call(before,k)),[before,keys]);}
  async function recordsPreserved(){return pg.evaluate(([expected,keys])=>keys.every(k=>JSON.stringify(window.__qaState[k])===JSON.stringify(expected[k])),[preserved,recordKeys]);}
  async function result(kind,expected){check(await action(kind,'result').getAttribute('data-ml-power-result')===expected,
    kind+': answer feedback is '+expected);}
  async function resetPractice(kind){check(await input(kind,'answer').inputValue()===''&&await input(kind,'unit').inputValue()===''&&
    await action(kind,'result').count()===0&&await action(kind,'hint-level').count()===0&&await action(kind,'save').isDisabled(),
    kind+': changed task clears old answer, unit, hints and completion');}
  function physical(fixture,percent=80,seconds=5,budget=100,movement=0.5){
    const eta=percent/100,out=fixture.load*movement,inside=out/eta,travel=movement*fixture.ma;
    const expected={inputPower:inside/seconds,usefulPower:out/seconds,lossPower:(inside-out)/seconds,
      handSpeed:travel/seconds,loadSpeed:movement/seconds,budgetTime:inside/budget};
    if(fixture.radius){expected.torque=fixture.load/(fixture.ma*eta)*fixture.radius;
      expected.turns=travel/(2*Math.PI*fixture.radius);expected.rpm=expected.turns*60/seconds;expected.omega=expected.turns*2*Math.PI/seconds;}
    return {expected,workIn:inside};
  }
  async function model(fixture,percent=80,seconds=5,budget=100,movement=0.5){
    const {expected,workIn}=physical(fixture,percent,seconds,budget,movement),kind=fixture.kind;
    const values=await comparison(kind).locator('[data-ml-power-metric]').evaluateAll(els=>els.map(el=>({key:el.getAttribute('data-ml-power-metric'),value:Number(el.dataset.value)})));
    check(values.length===Object.keys(expected).length,kind+': every applicable power and motion quantity is present');
    values.forEach(row=>check(near(row.value,expected[row.key]),kind+': '+row.key+' agrees with independent physics at '+percent+'% over '+seconds+' s'));
    check(near(expected.usefulPower+expected.lossPower,expected.inputPower),kind+': useful and loss powers balance the input');
    if(fixture.radius)check(near(expected.torque*expected.omega,expected.inputPower),kind+': torque times angular rate equals input power');
    check(await action(kind,'fit').getAttribute('data-ml-power-fit')===String(expected.inputPower<=budget),kind+': average input power is compared with the entered power budget');
    const rows=await lab(kind).locator('[data-ml-power-pace-factor]').evaluateAll(els=>els.map(el=>({factor:Number(el.getAttribute('data-ml-power-pace-factor')),
      seconds:Number(el.dataset.seconds),power:Number(el.dataset.inputPower),speed:Number(el.dataset.handSpeed),work:Number(el.dataset.workIn)})));
    check(rows.length===3&&rows.map(row=>row.factor).join(',')==='0.5,1,2',kind+': pace comparison includes half, same and double duration');
    rows.forEach(row=>check(near(row.seconds,seconds*row.factor)&&near(row.power,expected.inputPower/row.factor)&&near(row.speed,expected.handSpeed/row.factor)&&near(row.work,workIn),
      kind+': '+row.factor+'x duration changes power and hand speed while preserving input work'));
    return expected;
  }
  let mountedScenarios=0;
  async function mount(kind,width=1150,theme={},extra={}){
    if(mountedScenarios++){
      await b.close();b=await chromium.launch({downloadsPath:path.join(OUT,'downloads'),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
      pg=await b.newPage({viewport:{width,height:1100},deviceScaleFactor:1,acceptDownloads:true});
      pg.on('pageerror',e=>errors.push(String(e&&e.message||e)));
      pg.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
      await pg.goto('file://'+pagePath.replace(/\\/g,'/'));
      await pg.waitForFunction(()=>window.__mlReady?.()&&window.THREE?.OrbitControls&&window.StemLab?.makeOrbitViewer&&window.StemLab?.makeVoxelBatch);
    }
    await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
    await pg.setViewportSize({width,height:1100});
    await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',shopMotionProgress:0.1,...preserved,...extra}),{band:'g68',...theme}]);
    await pg.waitForFunction(()=>{const canvas=document.querySelector('.ml-shop-bay canvas');if(!canvas||canvas.width<=0||canvas.height<=0)return false;
      const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');return gl&&!gl.isContextLost();});
    await pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    check(true,kind+' scenario '+mountedScenarios+': real THREE canvas initialized');console.log('native scenario',mountedScenarios,kind);
  }
  async function capture(name,target){
    const focusTarget=target.locator(':scope > summary');
    if(await focusTarget.count()){
      await focusTarget.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');await focusTarget.focus();
      check(await focusTarget.evaluate(el=>{const s=getComputedStyle(el);return el===document.activeElement&&el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0;}),
        name+': native disclosure has visible keyboard focus');
    }
    check(await target.evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1&&
      Array.from(el.querySelectorAll('input,select,button,[data-ml-power-metric]')).every(child=>child.scrollWidth<=child.clientWidth+1)),
      name+': panel and controls fit the viewport without horizontal overflow');
    await target.scrollIntoViewIfNeeded();
    const box=await target.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:{x:Math.max(0,box.x-3),y:Math.max(0,box.y-3),width:box.width+6,height:box.height+6}});
    shots.push(name);
  }
  async function solve(kind,answer,unit='W'){await input(kind,'answer').fill(String(answer));await input(kind,'unit').selectOption(unit);await press(action(kind,'check'));}
  try{
    for(const fixture of fixtures){
      const kind=fixture.kind;await mount(kind);const before=await state(),target=lab(kind);
      check(!await target.evaluate(el=>el.open),kind+': power lab starts closed');
      await open(target);await open(comparison(kind));
      check(await sameExcept(before),kind+': opening optional disclosures leaves persisted state untouched');
      check(await input(kind,'percent').inputValue()==='80'&&await input(kind,'duration').inputValue()==='5'&&await input(kind,'timeUnit').inputValue()==='s'&&await input(kind,'budget').inputValue()==='100',kind+': default task is 80% over 5 seconds with a 100 W budget');
      const expected=await model(fixture);
      check(await input(kind,'question').locator('option').count()===(fixture.radius?8:6),kind+': question choices match linear and rotary skills');
      for(const skill of Object.keys(units).filter(skill=>skill in expected)){
        await input(kind,'question').selectOption(skill);await solve(kind,Number(expected[skill].toPrecision(4)),units[skill]);await result(kind,'correct');
      }
      check(await sameExcept(before,['benchPower']),kind+': all skill checks change only this lab draft');
      await input(kind,'question').selectOption('inputPower');await solve(kind,expected.inputPower);await result(kind,'correct');
      if(kind==='lever')await capture('desktop-power-checked',target);
      await input(kind,'duration').fill('0.5');await input(kind,'timeUnit').selectOption('min');await model(fixture,80,30);await resetPractice(kind);
      await input(kind,'percent').fill('100');await model(fixture,100,30);
      check(Number(await comparison(kind).locator('[data-ml-power-metric=lossPower]').getAttribute('data-value'))===0,kind+': 100% efficiency yields zero power loss');
      check(await recordsPreserved(),kind+': design, investigation and efficiency records remain unchanged');
    }
    await mount('lever',390);await open(lab('lever'));await open(comparison('lever'));
    await input('lever','duration').focus();await pg.keyboard.press('Control+A');await pg.keyboard.type('2');await input('lever','budget').fill('100');await model(fixtures[0],80,2);
    await input('lever','question').focus();await pg.keyboard.press('Home');await pg.keyboard.press('ArrowDown');await pg.keyboard.press('Enter');
    check(await input('lever','question').inputValue()==='usefulPower','Keyboard question selection chooses useful power');
    await press(action('lever','check'));await result('lever','invalid');
    check(await input('lever','answer').getAttribute('aria-invalid')==='true'&&await action('lever','save').isDisabled(),'Blank answer is marked invalid and cannot be saved');
    for(const bad of ['-1','Infinity','abc']){await input('lever','answer').fill(bad);await press(action('lever','check'));await result('lever','invalid');}
    await solve('lever',100,'J');await result('lever','unit');check(await input('lever','unit').getAttribute('aria-invalid')==='true','Joules do not substitute for watts and identify the unit control');
    await input('lever','unit').selectOption('W');await input('lever','answer').fill('80');await input('lever','answer').focus();await pg.keyboard.press('Enter');await result('lever','incorrect');
    await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-power-hint-level')==='1','First hint shows the relationship');
    await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-power-hint-level')==='2'&&await action('lever','hint').isDisabled(),'Second hint shows setup and is the final hint');
    await capture('phone-power-hints',lab('lever'));
    await input('lever','answer').fill('99.9');await input('lever','answer').focus();await pg.keyboard.press('Enter');await result('lever','correct');
    check(await action('lever','result').evaluate(el=>el.parentElement.getAttribute('role')==='status'&&el.parentElement.getAttribute('aria-live')==='polite'),'Calculation feedback is announced through a polite status region');
    await press(action('lever','save'));
    check(await pg.evaluate(()=>window.__qaState.benchPowerRecords.lever.usefulPower.completion==='checked'&&window.__qaState.benchPowerRecords.lever.usefulPower.hint===2&&window.__qaState.benchPowerRecords.lever.usefulPower.answer==='99.9'),'A checked skill record retains student rounding and hint use');
    const usefulRecord=JSON.stringify((await state()).benchPowerRecords.lever.usefulPower);
    await press(action('lever','next'));check(await input('lever','question').inputValue()==='lossPower','Next skill moves from useful power to loss power');await resetPractice('lever');
    await solve('lever',25);await result('lever','correct');await press(action('lever','save'));
    check(JSON.stringify((await state()).benchPowerRecords.lever.usefulPower)===usefulRecord&&Object.keys((await state()).benchPowerRecords.lever).length===2,'Saving a second skill keeps the first fixed calculation');
    check((await action('lever','count').textContent()).includes('2'),'Visible practice record count reflects two saved skills');
    const fixedSkills=JSON.stringify((await state()).benchPowerRecords.lever);
    await input('lever','budget').fill('200');await resetPractice('lever');await model(fixtures[0],80,2,200);
    const invalidInputs={duration:['','0','3601','Infinity','abc'],percent:['','0','101','Infinity'],budget:['','0','100001','Infinity']};
    for(const [field,values] of Object.entries(invalidInputs)){
      for(const bad of values){await input('lever',field).fill(bad);check(await input('lever',field).getAttribute('aria-invalid')==='true'&&await comparison('lever').count()===0&&await action('lever','check').count()===0,'Invalid '+field+' '+JSON.stringify(bad)+' hides derived quantities and grading');}
      await input('lever',field).fill(field==='duration'?'2':field==='percent'?'80':'200');
    }
    await input('lever','duration').fill('61');await input('lever','timeUnit').selectOption('min');check(await input('lever','duration').getAttribute('aria-invalid')==='true'&&await comparison('lever').count()===0,'Minutes are validated after conversion to seconds');
    await input('lever','duration').fill('0.5');await open(comparison('lever'));await model(fixtures[0],80,30,200);
    check(JSON.stringify((await state()).benchPowerRecords.lever)===fixedSkills,'Invalid drafts, budget changes and minutes cannot rewrite saved calculations');

    await mount('screw',320,{contrast:true});await open(lab('screw'));await open(comparison('screw'));await model(fixtures[5]);
    await input('screw','question').selectOption('torque');await press(action('screw','hint'));await press(action('screw','reveal'));await result('screw','solution');
    await input('screw','answer').fill(String(Number(physical(fixtures[5]).expected.torque.toPrecision(4))));await input('screw','unit').selectOption('N·m');await press(action('screw','check'));await result('screw','solution');
    await press(action('screw','save'));check(await pg.evaluate(()=>window.__qaState.benchPowerRecords.screw.torque.completion==='solution'),'Editing after reveal retains honest solution-viewed completion');
    await capture('forced-colors-power-rotary',lab('screw'));
    check(await input('screw','duration').evaluate(el=>getComputedStyle(el).borderStyle!=='none')&&await action('screw','check').evaluate(el=>getComputedStyle(el).borderStyle!=='none'),'Forced colors retains input and button boundaries');

    await mount('lever',1150,{}, {benchDesignLimits:{lever:{force:'300',travel:'1.5'}}});await open(lab('lever'));await open(comparison('lever'));await solve('lever',50);await press(action('lever','save'));
    const savedBeforeGeometry=JSON.stringify((await state()).benchPowerRecords);
    await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowRight');await resetPractice('lever');await model({...fixtures[0],ma:2.1});
    check(JSON.stringify((await state()).benchPowerRecords)===savedBeforeGeometry,'Keyboard geometry changes preserve the saved power snapshot');
    await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowLeft');await input('lever','duration').fill('4');await solve('lever',62.5);await press(action('lever','hint'));
    await open(design('lever'));await open(design('lever').locator('[data-ml-task-trials=lever]'));await press(design('lever').locator('[data-ml-capacity-use=load]'));
    await pg.waitForFunction(()=>window.__qaState.leverLoad===600);await resetPractice('lever');await model({...fixtures[0],load:600},80,4);
    await solve('lever',93.75);await press(design('lever').locator('[data-ml-design-undo-use=lever]'));await pg.waitForFunction(()=>window.__qaState.leverLoad===400);await resetPractice('lever');await model(fixtures[0],80,4);
    check(JSON.stringify((await state()).benchPowerRecords)===savedBeforeGeometry&&await recordsPreserved(),'Apply and Undo recompute average rates while preserving every saved record');
    await input('lever','duration').fill('8');await press(pg.locator('#ml-bench-tab-pulley'));await open(lab('pulley'));check(await input('pulley','duration').inputValue()==='5','A second station starts with its own power draft');
    await input('pulley','duration').fill('3');await press(pg.locator('#ml-bench-tab-lever'));await open(lab('lever'));check(await input('lever','duration').inputValue()==='8','Returning restores the station-specific duration');
    for(const band of ['k2','g35']){await mount('lever',390,{band});check(await pg.locator('[data-ml-power]').count()===0,band+': optional advanced power lab is absent');}
    await mount('ramp',1150,{}, {rampLength:1,rampHeight:2});await open(lab('ramp'));check(await comparison('ramp').count()===0&&await action('ramp','check').count()===0,'Invalid physical geometry cannot produce rates or grade a power calculation');

    await mount('lever',390,{dark:true,band:'g912'});await open(lab('lever'));await solve('lever',50);await press(action('lever','hint'));await press(action('lever','save'));
    await input('lever','question').selectOption('handSpeed');await press(action('lever','reveal'));await input('lever','answer').fill('0.2');await input('lever','unit').selectOption('m/s');await press(action('lever','save'));
    await input('lever','duration').fill('10');await pg.locator('#ml-leverLoad').focus();await pg.keyboard.press('ArrowRight');await open(lab('lever').locator('[data-ml-power-saved=lever]'));
    await lab('lever').getByRole('button',{name:'Open work record',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const records=pg.locator('[data-ml-power-record-station=lever]');check(await records.count()===2,'Work record displays each saved skill as its own fixed entry');
    const inputRecord=pg.locator('[data-ml-power-record-station=lever][data-ml-power-record-skill=inputPower]'),speedRecord=pg.locator('[data-ml-power-record-station=lever][data-ml-power-record-skill=handSpeed]');
    const inputText=await inputRecord.textContent(),speedText=await speedRecord.textContent();
    check(inputText.includes('50 W')&&inputText.includes('5 s')&&inputText.includes('Entered answer: 50 W')&&inputText.includes('Answer checked'),'Input-power record keeps original duration, result and checked completion');
    check(speedText.includes('0.2 m/s')&&speedText.includes('Worked solution viewed'),'Hand-speed record preserves the separate solution-viewed completion');
    check(await pg.locator('#ml-record-design-note-lever').inputValue()===savedNote&&await pg.locator('[data-ml-efficiency-record-station=lever]').count()===1,'Power records retain separate design notes and efficiency evidence');
    await capture('dark-phone-power-record',inputRecord);
    fs.mkdirSync(path.join(OUT,'downloads'),{recursive:true});const downloaded=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloaded,failure=await download.failure();if(failure)throw new Error('Native download failed: '+failure);
    const exported=fs.readFileSync(await download.path(),'utf8');await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&exported.includes(inputText)&&exported.includes(speedText)&&exported.includes(savedNote)&&exported.includes('Input work: 250 J'),'Native text download includes both power skills, original efficiency work and design explanation');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,errors},null,2));
    console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(error=>error.slice(0,1000))},null,2));
    if(errors.length)process.exitCode=1;await b.close();
  }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
