// Native React/THREE QA for two-stage calculations and independent skill records.
//   node dev-tools/ml_compound_lab_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
const browserTemp=path.resolve(process.argv[2] || 'reports/machinelab-compound-lab-2026-10-11/browser','browser-temp');
fs.mkdirSync(browserTemp,{recursive:true}); process.env.TEMP=browserTemp; process.env.TMP=browserTemp;
process.env.PLAYWRIGHT_BROWSERS_PATH=process.env.PLAYWRIGHT_BROWSERS_PATH || 'C:/Users/cabba/AppData/Local/ms-playwright';
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');
source=source.slice(0,source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-compound-lab-2026-10-11/browser');")
  .replace('deviceScaleFactor: 2','deviceScaleFactor: 1, acceptDownloads: true')
  .replace('chromium.launch({ args:',"chromium.launch({ downloadsPath: path.join(OUT,'downloads'), args:")
  .replace('const b = await chromium.launch(','let b = await chromium.launch(')
  .replace('const pg = await b.newPage(','let pg = await b.newPage(')
  .replace('var ctx = {','window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks=[],shots=[];
  // Expectations are derived here, independently of the application's math.
  const fixtures=[{kind:'lever',load:400,ma:2},{kind:'pulley',load:400,ma:2},
    {kind:'windlass',load:400,ma:0.45/0.1},{kind:'ramp',load:400,ma:4},
    {kind:'wedge',load:800,ma:0.3/0.06},{kind:'screw',load:2000,ma:2*Math.PI*0.15/0.005}];
  const units={idealMA:'ratio',efficiency:'%',actualMA:'ratio',inputForce:'N',inputTravel:'m',transferForce:'N',inputWork:'J',firstLoss:'J',secondLoss:'J'};
  const lever={leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:0.5};
  const savedNote='This fixed ideal design needs 200 N effort and 1 m of hand travel for 200 J of work.';
  const evidence={benchId:'lever',before:{settings:lever},after:{settings:{...lever,leverEffortArm:4}},
    note:'My separate geometry investigation.',investigation:{id:'lever-one-change-v1',force:'same',distance:'more'}};
  const preserved={benchExperiments:{lever:evidence},benchReferences:{lever},
    benchInvestigations:{lever:{id:'lever-one-change-v1',force:'same',distance:'more',tested:true}},
    benchDesignRecords:{lever:{benchId:'lever',settings:lever,limits:{force:250,travel:1.25},control:'leverEffortArm',note:savedNote}},
    benchEfficiencyRecords:{lever:{version:1,benchId:'lever',settings:lever,percent:80,question:'input',answer:'250',unit:'J',hint:1,completion:'checked'}},
    benchPowerRecords:{lever:{inputPower:{version:1,benchId:'lever',settings:lever,percent:80,seconds:5,budget:100,question:'inputPower',answer:'50',unit:'W',hint:1,completion:'checked'}}}};
  const recordKeys=Object.keys(preserved);
  function check(ok,label){checks.push(label);if(!ok)errors.push(label);}
  function near(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));}
  function lab(kind){return pg.locator('[data-ml-compound='+kind+']');}
  function comparison(kind){return lab(kind).locator('[data-ml-compound-comparison='+kind+']');}
  function input(kind,key){return pg.locator('#ml-compound-'+key+'-'+kind);}
  function geometry(kind,key){return pg.locator('#ml-compound-geometry-'+key+'-'+kind);}
  function action(kind,key){return lab(kind).locator('[data-ml-compound-'+key+']');}
  function design(kind){return pg.locator('[data-ml-design='+kind+']');}
  async function open(target){if(!await target.evaluate(el=>el.open)){await target.locator(':scope > summary').focus();await pg.keyboard.press('Enter');}}
  async function press(target){await target.focus();await pg.keyboard.press('Enter');}
  async function state(){return pg.evaluate(()=>window.__qaState);}
  async function sameExcept(before,keys=[]){return pg.evaluate(([before,keys])=>Object.keys(before).every(k=>keys.includes(k)||
    JSON.stringify(window.__qaState[k])===JSON.stringify(before[k]))&&Object.keys(window.__qaState).every(k=>
    keys.includes(k)||Object.prototype.hasOwnProperty.call(before,k)),[before,keys]);}
  async function recordsPreserved(){return pg.evaluate(([expected,keys])=>keys.every(k=>JSON.stringify(window.__qaState[k])===JSON.stringify(expected[k])),[preserved,recordKeys]);}
  async function result(kind,expected){check(await action(kind,'result').getAttribute('data-ml-compound-result')===expected,kind+': answer feedback is '+expected);}
  async function resetPractice(kind){check(await input(kind,'answer').inputValue()===''&&await input(kind,'unit').inputValue()===''&&await input(kind,'explanation').inputValue()===''&&
    await action(kind,'result').count()===0&&await action(kind,'hint-level').count()===0&&await action(kind,'save').isDisabled(),
    kind+': changed task clears old answer, unit, hints and completion');}
  function physical(fixture,secondMA=2,percentIn=80,percentOut=90,movement=0.5){
    const etaIn=percentIn/100,etaOut=percentOut/100,idealMA=fixture.ma*secondMA,efficiency=percentIn*percentOut/100,
      actualMA=idealMA*etaIn*etaOut,workOut=fixture.load*movement,transferWork=workOut/etaOut,inputWork=transferWork/etaIn;
    return {idealMA,efficiency,actualMA,inputForce:fixture.load/actualMA,inputTravel:movement*idealMA,
      transferForce:fixture.load/(secondMA*etaOut),transferTravel:movement*secondMA,inputWork,transferWork,workOut,
      firstLoss:Math.max(0,inputWork-transferWork),secondLoss:Math.max(0,transferWork-workOut),totalLoss:Math.max(0,inputWork-workOut)};
  }
  async function model(fixture,secondMA=2,percentIn=80,percentOut=90,movement=0.5){
    const expected=physical(fixture,secondMA,percentIn,percentOut,movement),kind=fixture.kind;
    const values=await comparison(kind).locator('[data-ml-compound-metric]').evaluateAll(els=>els.map(el=>({key:el.getAttribute('data-ml-compound-metric'),value:Number(el.dataset.value)})));
    check(values.length===Object.keys(expected).length,kind+': all combined ratios, forces, travel and energy quantities are present');
    values.forEach(row=>check(near(row.value,expected[row.key]),kind+': '+row.key+' agrees with independent two-stage physics at '+percentIn+'% / '+percentOut+'%'));
    check(near(expected.firstLoss+expected.secondLoss+expected.workOut,expected.inputWork),kind+': both stage losses and useful work balance input work');
    check(near(expected.inputForce*expected.inputTravel,expected.inputWork)&&near(expected.transferForce*expected.transferTravel,expected.transferWork),kind+': force times travel balances work at input and transfer');
    const ledger=await action(kind,'ledger').locator('[data-ml-compound-stage]').evaluateAll(els=>els.map(el=>({stage:el.getAttribute('data-ml-compound-stage'),force:Number(el.dataset.force),travel:Number(el.dataset.travel),work:Number(el.dataset.work)})));
    check(ledger.length===3&&ledger.map(row=>row.stage).join(',')==='input,transfer,output',kind+': energy ledger has input, transfer and output rows');
    ledger.forEach(row=>{const force=row.stage==='input'?expected.inputForce:row.stage==='transfer'?expected.transferForce:fixture.load,
      travel=row.stage==='input'?expected.inputTravel:row.stage==='transfer'?expected.transferTravel:movement,
      work=row.stage==='input'?expected.inputWork:row.stage==='transfer'?expected.transferWork:expected.workOut;
      check(near(row.force,force)&&near(row.travel,travel)&&near(row.work,work),kind+': '+row.stage+' ledger row matches the independently computed force, travel and work');});
    const relation=near(expected.inputForce,expected.transferForce)?'same':expected.inputForce<expected.transferForce?'less':'more';
    check(await action(kind,'added-stage').getAttribute('data-ml-compound-added-stage')===relation,kind+': comparison with the output stage alone reflects actual input-stage gain and losses');
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
      check(await focusTarget.evaluate(el=>{const s=getComputedStyle(el);return el===document.activeElement&&el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0;}),name+': native disclosure has visible keyboard focus');
    }
    check(await target.evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1&&
      Array.from(el.querySelectorAll('input,select,button,textarea,[data-ml-compound-metric]')).every(child=>child.scrollWidth<=child.clientWidth+1)),name+': panel and controls fit viewport without horizontal overflow');
    await target.scrollIntoViewIfNeeded();
    const box=await target.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:{x:Math.max(0,box.x-3),y:Math.max(0,box.y-3),width:box.width+6,height:box.height+6}});shots.push(name);
  }
  async function solve(kind,answer,unit='J'){await input(kind,'answer').fill(String(answer));await input(kind,'unit').selectOption(unit);await press(action(kind,'check'));}
  try{
    for(const fixture of fixtures){
      const kind=fixture.kind;await mount(kind);const before=await state(),target=lab(kind);
      check(!await target.evaluate(el=>el.open),kind+': compound lab starts closed');await open(target);await open(comparison(kind));
      check(await sameExcept(before),kind+': opening optional disclosures leaves persisted state untouched');
      check(await input(kind,'percentIn').inputValue()==='80'&&await input(kind,'percentOut').inputValue()==='90'&&await input(kind,'second').inputValue()===(kind==='pulley'?'lever':'pulley'),kind+': independent second stage and efficiency defaults are visible');
      check(await input(kind,'second').locator('option').count()===6&&await input(kind,'second').locator('option[value='+kind+']').count()===0,kind+': second-stage options have a placeholder and omit the active station');
      const expected=await model(fixture);check(await input(kind,'question').locator('option').count()===9,kind+': nine distinct calculation skills are offered');
      check((await target.textContent()).includes('conceptual series model')&&(await target.textContent()).includes('This does not connect the 3D machines'),kind+': conceptual model assumptions and lack of physical 3D connection are explicit');
      check(expected.efficiency===72&&expected.efficiency!==(80+90)/2,kind+': combined efficiency is the product, not the average');
      for(const skill of Object.keys(units)){await input(kind,'question').selectOption(skill);await solve(kind,Number(expected[skill].toPrecision(5)),units[skill]);await result(kind,'correct');}
      check(await sameExcept(before,['benchCompound']),kind+': every skill check changes only the compound draft');
      await input(kind,'question').selectOption('inputWork');await solve(kind,Number(expected.inputWork.toPrecision(5)));await result(kind,'correct');
      if(kind==='lever')await capture('desktop-compound-checked',target);
      await input(kind,'percentIn').fill('100');await input(kind,'percentOut').fill('100');await model(fixture,2,100,100);await resetPractice(kind);
      check(Number(await comparison(kind).locator('[data-ml-compound-metric=totalLoss]').getAttribute('data-value'))===0,kind+': ideal stages have zero combined energy loss');
      check(await recordsPreserved(),kind+': previous design, investigation, efficiency and power records remain unchanged');
    }

    await mount('lever',390);await open(lab('lever'));await open(comparison('lever'));
    await input('lever','percentIn').focus();await pg.keyboard.press('Control+A');await pg.keyboard.type('50');await model(fixtures[0],2,50,90);
    await input('lever','question').selectOption('efficiency');await input('lever','question').focus();await pg.keyboard.press('ArrowDown');await pg.keyboard.press('Enter');
    check(await input('lever','question').inputValue()==='actualMA','Keyboard question selection chooses actual mechanical advantage');
    await press(action('lever','check'));await result('lever','invalid');
    check(await input('lever','answer').getAttribute('aria-invalid')==='true'&&await action('lever','save').isDisabled(),'Blank answer is invalid and cannot be saved');
    for(const bad of ['-1','Infinity','abc']){await input('lever','answer').fill(bad);await press(action('lever','check'));await result('lever','invalid');}
    await solve('lever',1.8,'W');await result('lever','unit');check(await input('lever','unit').getAttribute('aria-invalid')==='true','Unit mismatch identifies the unit control');
    await input('lever','unit').selectOption('ratio');await input('lever','answer').fill('2');await input('lever','answer').focus();await pg.keyboard.press('Enter');await result('lever','incorrect');
    await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-compound-hint-level')==='1','First hint shows the relationship');
    await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-compound-hint-level')==='2'&&await action('lever','hint').isDisabled(),'Second hint shows substitution and is final');
    await capture('phone-compound-hints',lab('lever'));
    await input('lever','answer').fill('1.799');await input('lever','answer').focus();await pg.keyboard.press('Enter');await result('lever','correct');
    check(await action('lever','result').evaluate(el=>el.parentElement.getAttribute('role')==='status'&&el.parentElement.getAttribute('aria-live')==='polite'),'Calculation feedback uses a polite status region');
    const explanation='The two stages multiply their ratios, while energy is lost in each stage.';await input('lever','explanation').fill(explanation);
    check(await action('lever','save').isEnabled()&&await input('lever','explanation').getAttribute('maxlength')==='600','Optional explanation preserves a checked calculation and has a native 600-character limit');await press(action('lever','save'));
    check(await pg.evaluate(()=>window.__qaState.benchCompoundRecords.lever.actualMA.completion==='checked'&&window.__qaState.benchCompoundRecords.lever.actualMA.hint===2&&window.__qaState.benchCompoundRecords.lever.actualMA.answer==='1.799'),'Checked practice retains rounded answer and hint use');
    check((await state()).benchCompoundRecords.lever.actualMA.explanation===explanation,'The fixed skill record preserves the student explanation');
    const firstRecord=JSON.stringify((await state()).benchCompoundRecords.lever.actualMA);
    await press(action('lever','next'));check(await input('lever','question').inputValue()==='inputForce','Next skill advances from actual MA to input force');await resetPractice('lever');
    await solve('lever',Number((400/1.8).toPrecision(5)),'N');await result('lever','correct');await press(action('lever','save'));
    check(JSON.stringify((await state()).benchCompoundRecords.lever.actualMA)===firstRecord&&Object.keys((await state()).benchCompoundRecords.lever).length===2,'Saving a second skill preserves the first fixed calculation');
    check(Number(await action('lever','count').getAttribute('data-ml-compound-count'))===2,'Visible count reflects two saved skills');
    const fixedRecords=JSON.stringify((await state()).benchCompoundRecords);
    await geometry('lever','pulleySegments').fill('4');await resetPractice('lever');await model(fixtures[0],4,50,90);
    await input('lever','second').selectOption('windlass');await resetPractice('lever');await model(fixtures[0],4.5,50,90);
    await geometry('lever','windlassHandleR').fill('0.6');await model(fixtures[0],6,50,90);
    check((await state()).windlassHandleR===0.45,'Changing second-stage geometry leaves its actual station geometry untouched');
    for(const field of ['percentIn','percentOut']){for(const bad of ['','0','101','Infinity','abc']){await input('lever',field).fill(bad);check(await input('lever',field).getAttribute('aria-invalid')==='true'&&await comparison('lever').count()===0&&await action('lever','check').count()===0,'Invalid '+field+' '+JSON.stringify(bad)+' hides derived quantities and grading');}await input('lever',field).fill(field==='percentIn'?'50':'90');}
    await geometry('lever','windlassDrumR').fill('0');check(await geometry('lever','windlassDrumR').getAttribute('aria-invalid')==='true'&&await comparison('lever').count()===0,'Invalid second-stage geometry cannot produce compound calculations');
    await geometry('lever','windlassDrumR').fill('0.1');
    await input('lever','second').selectOption('');check(await input('lever','second').getAttribute('aria-invalid')==='true'&&await comparison('lever').count()===0&&await action('lever','check').count()===0,'Missing output stage hides calculations and identifies the stage control');
    await input('lever','second').selectOption('windlass');
    check(JSON.stringify((await state()).benchCompoundRecords)===fixedRecords,'Geometry, stage and invalid-draft changes cannot rewrite saved calculations');

    await mount('screw',320,{contrast:true});await open(lab('screw'));await open(comparison('screw'));await model(fixtures[5]);
    await input('screw','question').selectOption('inputForce');await press(action('screw','hint'));await press(action('screw','reveal'));await result('screw','solution');
    await input('screw','answer').fill(String(Number(physical(fixtures[5]).inputForce.toPrecision(5))));await input('screw','unit').selectOption('N');await press(action('screw','check'));await result('screw','solution');await press(action('screw','save'));
    check(await pg.evaluate(()=>window.__qaState.benchCompoundRecords.screw.inputForce.completion==='solution'),'Editing after reveal retains honest solution-viewed provenance');
    await capture('forced-colors-compound-solution',lab('screw'));
    check(await input('screw','percentIn').evaluate(el=>getComputedStyle(el).borderStyle!=='none')&&await action('screw','check').evaluate(el=>getComputedStyle(el).borderStyle!=='none'),'Forced colors retains visible input and button boundaries');

    await mount('lever',1150,{}, {benchDesignLimits:{lever:{force:'300',travel:'1.5'}}});await open(lab('lever'));await open(comparison('lever'));await input('lever','question').selectOption('inputWork');await solve('lever',277.78);await press(action('lever','save'));
    const savedBeforeGeometry=JSON.stringify((await state()).benchCompoundRecords);
    await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowRight');await resetPractice('lever');await model({...fixtures[0],ma:2.1});
    check(JSON.stringify((await state()).benchCompoundRecords)===savedBeforeGeometry,'Keyboard active-station geometry changes preserve the saved compound snapshot');
    await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowLeft');await input('lever','percentIn').fill('50');await solve('lever',444.44);await press(action('lever','hint'));
    await open(design('lever'));await open(design('lever').locator('[data-ml-task-trials=lever]'));await press(design('lever').locator('[data-ml-capacity-use=load]'));
    await pg.waitForFunction(()=>window.__qaState.leverLoad===600);await resetPractice('lever');await model({...fixtures[0],load:600},2,50,90);
    await solve('lever',666.67);await press(design('lever').locator('[data-ml-design-undo-use=lever]'));await pg.waitForFunction(()=>window.__qaState.leverLoad===400);await resetPractice('lever');await model(fixtures[0],2,50,90);
    check(JSON.stringify((await state()).benchCompoundRecords)===savedBeforeGeometry&&await recordsPreserved(),'Apply and Undo recompute compound work and preserve all saved records');
    await input('lever','percentIn').fill('60');await press(pg.locator('#ml-bench-tab-pulley'));await open(lab('pulley'));check(await input('pulley','percentIn').inputValue()==='80','Second station starts with an independent draft');
    await input('pulley','percentIn').fill('70');await press(pg.locator('#ml-bench-tab-lever'));await open(lab('lever'));check(await input('lever','percentIn').inputValue()==='60','Returning restores the station-specific compound draft');
    for(const band of ['k2','g35']){await mount('lever',390,{band});check(await pg.locator('[data-ml-compound]').count()===0,band+': optional advanced compound lab is absent');}
    await mount('ramp',1150,{}, {rampLength:1,rampHeight:2});await open(lab('ramp'));check(await comparison('ramp').count()===0&&await action('ramp','check').count()===0,'Invalid active geometry cannot produce or grade compound calculations');

    await mount('lever',1150,{}, {leverEffortArm:0.2,leverLoadArm:4});await open(lab('lever'));await open(comparison('lever'));await model({...fixtures[0],ma:0.05});
    check(await action('lever','added-stage').getAttribute('data-ml-compound-added-stage')==='more','A low-gain first stage honestly shows that it needs more effort than the output stage alone');
    await input('lever','percentIn').fill('1');await input('lever','percentOut').fill('1');await input('lever','question').selectOption('actualMA');await solve('lever',0.00001,'ratio');await result('lever','correct');
    await solve('lever',0,'ratio');await result('lever','incorrect');check(await action('lever','save').isDisabled(),'Zero does not pass a small nonzero ratio calculation');

    await mount('lever',390,{dark:true,band:'g912'});await open(lab('lever'));await input('lever','question').selectOption('inputWork');await solve('lever',277.78);await press(action('lever','hint'));
    const note='I multiplied 0.80 by 0.90. The lost energy explains the extra input work. <script>not executable</script>';
    await input('lever','explanation').fill(note);await press(action('lever','save'));await input('lever','question').selectOption('efficiency');await press(action('lever','reveal'));await input('lever','answer').fill('72');await input('lever','unit').selectOption('%');await press(action('lever','save'));
    await input('lever','percentIn').fill('100');await pg.locator('#ml-leverLoad').focus();await pg.keyboard.press('ArrowRight');await open(lab('lever').locator('[data-ml-compound-saved=lever]'));
    await lab('lever').getByRole('button',{name:'Open work record',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const records=pg.locator('[data-ml-compound-record-station=lever]');check(await records.count()===2,'Work record presents each saved compound skill separately');
    const workRecord=pg.locator('[data-ml-compound-record-station=lever][data-ml-compound-record-skill=inputWork]'),effRecord=pg.locator('[data-ml-compound-record-station=lever][data-ml-compound-record-skill=efficiency]');
    const workText=await workRecord.textContent(),effText=await effRecord.textContent();
    check(workText.includes('277.78 J')&&workText.includes('80%')&&workText.includes('90%')&&workText.includes('Answer checked')&&workText.includes(note),'Fixed work record keeps original stages, rounded answer, explanation and checked completion');
    check(effText.includes('72 %')&&effText.includes('Worked solution viewed'),'Separate combined-efficiency skill retains solution-viewed provenance');
    check(await workRecord.locator('script').count()===0,'Student explanation is rendered as text');
    check(await pg.locator('#ml-record-design-note-lever').inputValue()===savedNote&&await pg.locator('[data-ml-efficiency-record-station=lever]').count()===1&&await pg.locator('[data-ml-power-record-station=lever]').count()===1,'Compound evidence coexists with existing design notes, efficiency and power records');
    await capture('dark-phone-compound-record',workRecord);
    fs.mkdirSync(path.join(OUT,'downloads'),{recursive:true});const downloaded=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloaded,failure=await download.failure();if(failure)throw new Error('Native download failed: '+failure);
    const exported=fs.readFileSync(await download.path(),'utf8');await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&exported.includes(workText)&&exported.includes(effText)&&exported.includes(savedNote)&&exported.includes(note)&&exported.includes('Input work: 250 J'),'Native download contains both compound skills, original explanation and earlier lab records');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,errors},null,2));
    console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(error=>error.slice(0,1000))},null,2));if(errors.length)process.exitCode=1;await b.close();
  }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
