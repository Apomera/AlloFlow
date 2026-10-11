// Native React/THREE QA for optional efficiency modeling and calculation practice.
//   node dev-tools/ml_efficiency_lab_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
const browserTemp=path.resolve(process.argv[2] || 'reports/machinelab-efficiency-lab-2026-10-10/browser','browser-temp');
fs.mkdirSync(browserTemp,{recursive:true}); process.env.TEMP=browserTemp; process.env.TMP=browserTemp;
process.env.PLAYWRIGHT_BROWSERS_PATH=process.env.PLAYWRIGHT_BROWSERS_PATH || 'C:/Users/cabba/AppData/Local/ms-playwright';
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');
source=source.slice(0,source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-efficiency-lab-2026-10-10/browser');")
  .replace('deviceScaleFactor: 2','deviceScaleFactor: 1, acceptDownloads: true')
  .replace('chromium.launch({ args:',"chromium.launch({ downloadsPath: path.join(OUT,'downloads'), args:")
  .replace('const b = await chromium.launch(','let b = await chromium.launch(')
  .replace('const pg = await b.newPage(','let pg = await b.newPage(')
  .replace('var ctx = {','window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks=[],shots=[];
  // Independent physical fixtures; do not call the tool's math to predict results.
  const fixtures=[{kind:'lever',load:400,ma:2},{kind:'pulley',load:400,ma:2},
    {kind:'windlass',load:400,ma:0.45/0.1},{kind:'ramp',load:400,ma:4},
    {kind:'wedge',load:800,ma:0.3/0.06},{kind:'screw',load:2000,ma:2*Math.PI*0.15/0.005}];
  const lever={leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:0.5};
  const savedNote='This fixed ideal design needs 200 N effort and 1 m of hand travel for 200 J of work.';
  const evidence={benchId:'lever',before:{settings:lever},after:{settings:{...lever,leverEffortArm:4}},
    note:'My separate geometry investigation.',investigation:{id:'lever-one-change-v1',force:'same',distance:'more'}};
  const preserved={benchExperiments:{lever:evidence},benchReferences:{lever},
    benchInvestigations:{lever:{id:'lever-one-change-v1',force:'same',distance:'more',tested:true}},
    benchDesignRecords:{lever:{benchId:'lever',settings:lever,limits:{force:250,travel:1.25},control:'leverEffortArm',note:savedNote}}};
  const recordKeys=Object.keys(preserved);
  function check(ok,label){checks.push(label);if(!ok)errors.push(label);}
  function near(a,b){return Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));}
  function lab(kind){return pg.locator('[data-ml-efficiency='+kind+']');}
  function comparison(kind){return lab(kind).locator('[data-ml-efficiency-comparison='+kind+']');}
  function input(kind,key){return pg.locator('#ml-efficiency-'+key+'-'+kind);}
  function action(kind,key){return lab(kind).locator('[data-ml-efficiency-'+key+']');}
  function design(kind){return pg.locator('[data-ml-design='+kind+']');}
  async function open(target){if(!await target.evaluate(el=>el.open)){await target.locator(':scope > summary').focus();await pg.keyboard.press('Enter');}}
  async function press(target){await target.focus();await pg.keyboard.press('Enter');}
  async function state(){return pg.evaluate(()=>window.__qaState);}
  async function sameExcept(before,keys=[]){return pg.evaluate(([before,keys])=>Object.keys(before).every(k=>keys.includes(k)||
    JSON.stringify(window.__qaState[k])===JSON.stringify(before[k]))&&Object.keys(window.__qaState).every(k=>
    keys.includes(k)||Object.prototype.hasOwnProperty.call(before,k)),[before,keys]);}
  async function recordsPreserved(){return pg.evaluate(([expected,keys])=>keys.every(k=>JSON.stringify(window.__qaState[k])===JSON.stringify(expected[k])),[preserved,recordKeys]);}
  async function result(kind,expected){check(await action(kind,'result').getAttribute('data-ml-efficiency-result')===expected,
    kind+': answer feedback is '+expected);}
  async function resetPractice(kind){check(await input(kind,'answer').inputValue()===''&&await input(kind,'unit').inputValue()===''&&
    await action(kind,'result').count()===0&&await action(kind,'hint-level').count()===0&&await action(kind,'save').isDisabled(),
    kind+': changed task clears old answer, unit, hints and completion');}
  async function model(kind,load,ma,percent=80,movement=0.5){
    const eta=percent/100,out=load*movement;
    const expected={force:load/(ma*eta),travel:movement*ma,workOut:out,workIn:out/eta,loss:out/eta-out,actualMA:ma*eta};
    const values=await comparison(kind).locator('[data-ml-efficiency-metric]').evaluateAll(els=>els.map(el=>({key:el.getAttribute('data-ml-efficiency-metric'),value:Number(el.dataset.value)})));
    check(values.length===6,kind+': all six modeled quantities are present');
    values.forEach(row=>check(near(row.value,expected[row.key]),kind+': '+row.key+' agrees with independent physics at '+percent+'%'));
    check(near(expected.force*expected.travel,expected.workIn)&&near(expected.workOut+expected.loss,expected.workIn),
      kind+': modeled force-distance and energy balance remain consistent');
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
      Array.from(el.querySelectorAll('input,select,button,[data-ml-efficiency-metric]')).every(child=>child.scrollWidth<=child.clientWidth+1)),
      name+': panel and controls fit the viewport without horizontal overflow');
    await target.scrollIntoViewIfNeeded();
    const box=await target.evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:{x:Math.max(0,box.x-3),y:Math.max(0,box.y-3),width:box.width+6,height:box.height+6}});
    shots.push(name);
  }
  async function limits(kind,force,travel){await open(design(kind));await pg.locator('#ml-design-force-'+kind).fill(String(force));await pg.locator('#ml-design-travel-'+kind).fill(String(travel));}
  async function solve(kind,answer,unit='J'){await input(kind,'answer').fill(String(answer));await input(kind,'unit').selectOption(unit);await press(action(kind,'check'));}
  try{
    for(const fixture of fixtures){
      await mount(fixture.kind);const before=await state(),target=lab(fixture.kind);
      check(!await target.evaluate(el=>el.open),fixture.kind+': efficiency lab starts closed');
      await open(target);await open(comparison(fixture.kind));
      check(await sameExcept(before),fixture.kind+': opening optional disclosures leaves persisted state untouched');
      check(await input(fixture.kind,'percent').inputValue()==='80',fixture.kind+': default assumed efficiency is 80%');
      await model(fixture.kind,fixture.load,fixture.ma);
      const expectedFit=fixture.load/(fixture.ma*0.8)<=100&&0.5*fixture.ma<=3;
      check(await action(fixture.kind,'fit').getAttribute('data-ml-efficiency-fit')===String(expectedFit),fixture.kind+': modeled fit uses existing default 100 N and 3 m limits');
      await solve(fixture.kind,fixture.load*0.5/0.8);await result(fixture.kind,'correct');
      check(await sameExcept(before,['benchEfficiency']),fixture.kind+': checking practice changes only its independent draft');
      if(fixture.kind==='lever')await capture('desktop-efficiency-checked',target);
      await input(fixture.kind,'percent').fill('100');await model(fixture.kind,fixture.load,fixture.ma,100);await resetPractice(fixture.kind);
      check(Number(await comparison(fixture.kind).locator('[data-ml-efficiency-metric=loss]').getAttribute('data-value'))===0,
        fixture.kind+': 100% efficiency gives exactly zero energy loss');
      check(await recordsPreserved(),fixture.kind+': separate investigation and design records remain unchanged');
    }
    await mount('lever',390);await open(lab('lever'));await open(comparison('lever'));
    await input('lever','percent').focus();await pg.keyboard.press('Control+A');await pg.keyboard.type('50');
    await model('lever',400,2,50);
    await input('lever','question').focus();await pg.keyboard.press('Home');await pg.keyboard.press('ArrowDown');await pg.keyboard.press('Enter');
    check(await input('lever','question').inputValue()==='force','Keyboard question selection chooses modeled effort');
    await press(action('lever','check'));await result('lever','invalid');
    check(await input('lever','answer').getAttribute('aria-invalid')==='true'&&await action('lever','save').isDisabled(),'Blank answer is marked invalid and cannot be saved');
    for(const bad of ['-1','Infinity','abc']){await input('lever','answer').fill(bad);await press(action('lever','check'));await result('lever','invalid');}
    await input('lever','answer').fill('400');await input('lever','unit').focus();await pg.keyboard.press('Home');await pg.keyboard.press('ArrowDown');await pg.keyboard.press('ArrowDown');await pg.keyboard.press('Enter');
    check(await input('lever','unit').inputValue()==='J','Keyboard unit selection can choose joules');await press(action('lever','check'));await result('lever','unit');
    check(await input('lever','unit').getAttribute('aria-invalid')==='true','Mismatched unit identifies the unit control');
    await input('lever','unit').selectOption('N');await input('lever','answer').fill('300');await input('lever','answer').focus();await pg.keyboard.press('Enter');await result('lever','incorrect');
    await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-efficiency-hint-level')==='1','First hint shows the relationship');
    await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-efficiency-hint-level')==='2'&&await action('lever','hint').isDisabled(),'Second hint shows setup and is the final hint');
    await capture('phone-efficiency-hints',lab('lever'));
    await input('lever','answer').fill('399.9');await input('lever','answer').focus();await pg.keyboard.press('Enter');await result('lever','correct');
    check(await action('lever','result').evaluate(el=>el.parentElement.getAttribute('role')==='status'&&el.parentElement.getAttribute('aria-live')==='polite'),'Calculation feedback is announced through a polite status region');
    await press(action('lever','save'));
    check(await pg.evaluate(()=>window.__qaState.benchEfficiencyRecords.lever.completion==='checked'&&window.__qaState.benchEfficiencyRecords.lever.hint===2&&window.__qaState.benchEfficiencyRecords.lever.answer==='399.9'),
      'Saving a checked result preserves student rounding and hint use');
    const fixedChecked=JSON.stringify((await state()).benchEfficiencyRecords.lever);
    await input('lever','question').selectOption('loss');await resetPractice('lever');
    await solve('lever',200);await result('lever','correct');
    await input('lever','percent').fill('80');await resetPractice('lever');
    for(const bad of ['','0','101','Infinity','abc']){
      await input('lever','percent').fill(bad);
      check(await input('lever','percent').getAttribute('aria-invalid')==='true'&&await comparison('lever').count()===0&&await action('lever','check').count()===0,
        'Invalid efficiency '+JSON.stringify(bad)+' hides derived numbers and grading');
    }
    await input('lever','percent').fill('1');await open(comparison('lever'));await model('lever',400,2,1);
    await input('lever','percent').fill('80');
    check(JSON.stringify((await state()).benchEfficiencyRecords.lever)===fixedChecked,'Draft and invalid efficiency changes cannot rewrite saved work');
    await limits('lever',225,1.5);
    check(await design('lever').locator('[data-ml-design-fit]').getAttribute('data-ml-design-fit')==='true'&&await action('lever','fit').getAttribute('data-ml-efficiency-fit')==='false',
      'A design can meet ideal limits while modeled losses push effort above its limit');
    await limits('lever',300,1.5);check(await action('lever','fit').getAttribute('data-ml-efficiency-fit')==='true','Modeled fit responds to valid design limit edits');
    await pg.locator('#ml-design-force-lever').fill('');check(await action('lever','fit').count()===0&&await comparison('lever').count()===1,'Invalid design limits hide fit without erasing useful efficiency modeling');

    await mount('pulley',320,{contrast:true});await open(lab('pulley'));await open(comparison('pulley'));
    await input('pulley','question').selectOption('loss');await press(action('pulley','hint'));await press(action('pulley','reveal'));await result('pulley','solution');
    await input('pulley','answer').fill('50');await input('pulley','unit').selectOption('J');await press(action('pulley','check'));await result('pulley','solution');
    await press(action('pulley','save'));check(await pg.evaluate(()=>window.__qaState.benchEfficiencyRecords.pulley.completion==='solution'),'Editing after reveal retains honest solution-viewed completion');
    await capture('forced-colors-efficiency-solution',lab('pulley'));
    check(await input('pulley','percent').evaluate(el=>getComputedStyle(el).borderStyle!=='none')&&await action('pulley','check').evaluate(el=>getComputedStyle(el).borderStyle!=='none'),
      'Forced colors retains input and button boundaries');

    await mount('lever',1150,{}, {benchDesignLimits:{lever:{force:'300',travel:'1.5'}}});await open(lab('lever'));await open(comparison('lever'));
    await solve('lever',250);await press(action('lever','hint'));await press(action('lever','save'));
    const savedBeforeGeometry=JSON.stringify((await state()).benchEfficiencyRecords);
    await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowRight');await resetPractice('lever');await model('lever',400,2.1);
    check(JSON.stringify((await state()).benchEfficiencyRecords)===savedBeforeGeometry,'Keyboard geometry changes leave saved efficiency snapshots fixed');
    await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowLeft');
    await input('lever','percent').fill('75');await solve('lever',200/0.75);await press(action('lever','hint'));
    await open(design('lever'));await open(design('lever').locator('[data-ml-task-trials=lever]'));
    await press(design('lever').locator('[data-ml-capacity-use=load]'));await pg.waitForFunction(()=>window.__qaState.leverLoad===600);await resetPractice('lever');await model('lever',600,2,75);
    await solve('lever',400);await press(design('lever').locator('[data-ml-design-undo-use=lever]'));await pg.waitForFunction(()=>window.__qaState.leverLoad===400);await resetPractice('lever');await model('lever',400,2,75);
    check(JSON.stringify((await state()).benchEfficiencyRecords)===savedBeforeGeometry&&await recordsPreserved(),'Apply and Undo recompute modeled results while preserving all saved work');
    await input('lever','percent').fill('60');
    await press(pg.locator('#ml-bench-tab-pulley'));await open(lab('pulley'));check(await input('pulley','percent').inputValue()==='80','A second station starts with its own efficiency draft');
    await input('pulley','percent').fill('90');await press(pg.locator('#ml-bench-tab-lever'));await open(lab('lever'));check(await input('lever','percent').inputValue()==='60','Returning to a station restores its own assumption');

    for(const band of ['k2','g35']){await mount('lever',390,{band});check(await pg.locator('[data-ml-efficiency]').count()===0,band+': optional advanced efficiency lab is absent');}
    await mount('ramp',1150,{}, {rampLength:1,rampHeight:2});await open(lab('ramp'));
    check(await comparison('ramp').count()===0&&await action('ramp','check').count()===0,'Invalid physical geometry cannot produce modeled quantities or grade a calculation');

    await mount('lever',390,{dark:true,band:'g912'});await open(lab('lever'));await solve('lever',250);await press(action('lever','hint'));await press(action('lever','save'));
    await input('lever','percent').fill('50');await press(action('lever','reveal'));await input('lever','answer').fill('400');await input('lever','unit').selectOption('J');await press(action('lever','save'));
    await input('lever','percent').fill('90');await pg.locator('#ml-leverLoad').focus();await pg.keyboard.press('ArrowRight');
    await open(lab('lever').locator('[data-ml-efficiency-saved=lever]'));
    await lab('lever').getByRole('button',{name:'Open work record',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const record=pg.locator('[data-ml-efficiency-record-station=lever]'),recordText=await record.textContent();
    check(recordText.includes('Input work: 400 J')&&recordText.includes('Useful work: 200 J')&&recordText.includes('Energy lost: 200 J')&&recordText.includes('Modeled effort: 400 N')&&recordText.includes('Entered answer: 400 J')&&recordText.includes('Worked solution viewed'),
      'Work record retains fixed 50% measurements, student answer and solution-viewed status after task changes');
    check(await pg.locator('#ml-record-design-note-lever').inputValue()===savedNote,'Efficiency work leaves the separate fixed design explanation intact');
    await capture('dark-phone-efficiency-record',record);
    fs.mkdirSync(path.join(OUT,'downloads'),{recursive:true});const downloaded=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloaded,failure=await download.failure();if(failure)throw new Error('Native download failed: '+failure);
    const exported=fs.readFileSync(await download.path(),'utf8');await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&exported.includes(recordText)&&exported.includes(savedNote)&&exported.includes('Hints opened: 0/2'),
      'Native text download includes the fixed calculation record, honest hint use and original explanation');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),checks,shots,errors},null,2));
    console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors:errors.map(error=>error.slice(0,1000))},null,2));
    if(errors.length)process.exitCode=1;await b.close();
  }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
