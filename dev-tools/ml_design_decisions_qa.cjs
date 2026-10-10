// Native browser QA for choosing a design variable and recording its outcome.
//   node dev-tools/ml_design_decisions_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
let source = fs.readFileSync(path.join(__dirname, 'ml_scene_shots.cjs'), 'utf8');
source = source.slice(0, source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-design-decisions-2026-10-10/browser');")
  .replace('deviceScaleFactor: 2', 'deviceScaleFactor: 1, acceptDownloads: true')
  .replace('chromium.launch({ args:', "chromium.launch({ downloadsPath: path.join(OUT,'downloads'), args:")
  .replace('var ctx = {', 'window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks = [], shots = [];
  const settingKeys = ['loadDistance','leverEffortArm','leverLoadArm','leverLoad','pulleySegments','pulleyLoad',
    'windlassHandleR','windlassDrumR','windlassLoad','rampLength','rampHeight','rampLoad',
    'wedgeLength','wedgeThickness','wedgeLoad','screwHandleR','screwPitch','screwLoad'];
  const fixtures = [
    {kind:'lever',key:'leverLoadArm',value:0.5,force:100,travel:3,extra:{},options:['leverEffortArm','leverLoadArm']},
    {kind:'pulley',key:'pulleySegments',value:4,force:100,travel:3,extra:{},options:['pulleySegments']},
    {kind:'windlass',key:'windlassDrumR',value:0.03,force:100,travel:3,extra:{windlassHandleR:0.15},options:['windlassHandleR','windlassDrumR']},
    {kind:'ramp',key:'rampHeight',value:0.5,force:100,travel:3,extra:{rampLength:2},options:['rampLength','rampHeight']},
    {kind:'wedge',key:'wedgeThickness',value:0.03,force:200,travel:3,extra:{wedgeLength:0.12},options:['wedgeLength','wedgeThickness']},
    {kind:'screw',key:'screwHandleR',value:0.06,force:100,travel:100,extra:{screwPitch:0.002},options:['screwHandleR','screwPitch']}
  ];
  const lever = {leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:0.5};
  const comparison = {benchId:'lever',before:{settings:lever},after:{settings:{...lever,leverEffortArm:4}},
    note:'Comparison explanation remains separate.',investigation:{id:'lever-one-change-v1',force:'same',distance:'more'}};
  const preserved = {benchExperiments:{lever:comparison},benchReferences:{lever},
    benchInvestigations:{lever:{id:'lever-one-change-v1',force:'same',distance:'more',tested:true}}};
  function check(ok, label) { checks.push(label); if (!ok) errors.push(label); }
  function panel(kind) { return pg.locator('[data-ml-design='+kind+']'); }
  function saved(kind) { return pg.locator('[data-ml-design-recorded='+kind+']'); }
  async function open(kind) {
    const details = panel(kind);
    if (!await details.evaluate(el=>el.open)) await details.locator('summary').click();
  }
  async function mount(kind, width=1150, theme={}, extra={}) {
    await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
    await pg.setViewportSize({width,height:1100});
    const state = S({view:'machines',bench:kind,motionPref:'off',shopMotionProgress:0.1,...extra});
    await pg.evaluate(([s,o])=>window.__mount(s,o),[state,{band:'g68',...theme}]);
    await pg.locator(state.view==='learn'?'#ml-work-record':'[data-ml-design='+kind+']').waitFor();
  }
  async function limits(kind, force, travel) {
    await pg.locator('#ml-design-force-'+kind).fill(String(force));
    await pg.locator('#ml-design-travel-'+kind).fill(String(travel));
  }
  async function settings() {
    return pg.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,window.__qaState[key]])),settingKeys);
  }
  async function select(kind, key, keyboard=false) {
    const choice = pg.locator('#ml-design-control-'+kind);
    if (keyboard) {
      await choice.focus();
      await pg.keyboard.press('End');
      await pg.keyboard.press('Enter');
    } else await choice.selectOption(key);
    await pg.waitForFunction(([id,key])=>document.getElementById(id)?.value===key,['ml-design-control-'+kind,key]);
  }
  async function apply(kind, key) {
    await panel(kind).getByRole('button',{name:'Apply suggested setting',exact:true}).focus();
    await pg.keyboard.press('Enter');
    await pg.waitForFunction(id=>document.activeElement?.id===id,'ml-'+key);
  }
  async function capture(name, target) {
    const fits = await target.evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1);
    check(fits,name+': page and recorded content fit the viewport');
    await target.screenshot({path:path.join(OUT,name+'.png')}); shots.push(name);
  }
  try {
    await mount('lever');
    await panel('lever').locator('summary').focus(); await pg.keyboard.press('Enter');
    check(await panel('lever').evaluate(el=>el.open),'Keyboard opens the design disclosure');
    await pg.locator('.ml-shop-bay canvas').waitFor();
    check(await pg.locator('.ml-shop-bay canvas').evaluate(el=>el.width>0&&el.height>0),'Real THREE workshop has a drawable canvas');
    for (const fixture of fixtures) {
      const {kind,key,value,force,travel,extra,options} = fixture;
      await mount(kind,1150,{},extra); await open(kind); await limits(kind,force,travel);
      const optionValues = await pg.locator('#ml-design-control-'+kind+' option').evaluateAll(els=>els.map(el=>el.value));
      check(JSON.stringify(optionValues)===JSON.stringify(options),kind+': variable choices contain geometry only');
      const before = await settings();
      await select(kind,key,kind==='lever');
      check(JSON.stringify(before)===JSON.stringify(await settings())&&
        await pg.evaluate(([kind,key])=>window.__qaState.benchDesignLimits[kind].control===key,[kind,key]),
        kind+': selecting the design variable stores its choice without changing the machine');
      const feasible = panel(kind).locator('[data-ml-design-feasible='+key+']');
      const count = Number(await feasible.getAttribute('data-count'));
      check(count>0&&await feasible.isVisible()&&
        Number(await panel(kind).locator('[data-ml-design-suggestion='+key+']').getAttribute('data-value'))===value,
        kind+': legal increments and nearest suggestion use the selected variable');
      await apply(kind,key);
      const after = await settings();
      check(after[key]===value&&settingKeys.every(held=>held===key||before[held]===after[held])&&
        await pg.evaluate(()=>!window.__qaState.shopAnimating&&window.__qaState.shopMotionProgress===0.5),
        kind+': keyboard Apply changes only the chosen variable and pauses at half stroke');
      check(await panel(kind).locator('[data-ml-design-fit]').getAttribute('data-ml-design-fit')==='true'&&
        Number(await feasible.getAttribute('data-count'))===count&&await feasible.isVisible(),
        kind+': all legal increments stay visible when the current design meets both limits');
    }
    await mount('lever',1150,{},preserved); await open('lever'); await limits('lever',100,3); await select('lever','leverLoadArm',true);
    const prior = await pg.evaluate(()=>JSON.stringify([window.__qaState.benchExperiments,window.__qaState.benchReferences,window.__qaState.benchInvestigations]));
    await panel('lever').getByRole('button',{name:'Record this design',exact:true}).focus(); await pg.keyboard.press('Enter');
    await pg.locator('#ml-design-note-lever').waitFor();
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-design-note-lever');
    check(await pg.evaluate(()=>{const r=window.__qaState.benchDesignRecords.lever;return r.benchId==='lever'&&r.settings.leverEffortArm===2&&r.settings.leverLoadArm===1&&r.limits.force===100&&r.limits.travel===3&&r.control==='leverLoadArm';}),
      'Recording a failing design freezes its task, selected variable and numeric limits');
    const failedNote='The first design needs 200 N, above my 100 N limit.\nI will shorten the load arm.';
    await pg.locator('#ml-design-note-lever').fill(failedNote);
    check(await pg.evaluate(note=>window.__qaState.benchDesignRecords.lever.note===note,failedNote),
      'The recorded design accepts a multiline explanation');
    await apply('lever','leverLoadArm');
    check(await pg.evaluate(note=>{const r=window.__qaState.benchDesignRecords.lever;return r.settings.leverLoadArm===1&&r.note===note;},failedNote)&&
      (await saved('lever').textContent()).includes('Recorded setup does not meet both limits.'),
      'Applying a working suggestion keeps the saved failing design and explanation fixed');
    await panel('lever').getByRole('button',{name:'Replace design record',exact:true}).click();
    check(await pg.evaluate(()=>{const r=window.__qaState.benchDesignRecords.lever;return r.settings.leverLoadArm===0.5&&r.settings.leverEffortArm===2&&r.limits.force===100&&r.limits.travel===3&&r.control==='leverLoadArm';}),
      'Explicit replacement records the working design with its original limits');
    const workingNote='A 0.5 m load arm gives MA 4: 100 N effort and 2 m hand travel.\nBoth fit my limits. <literal>';
    await pg.locator('#ml-design-note-lever').fill(workingNote);
    const fixed = await pg.evaluate(()=>JSON.stringify(window.__qaState.benchDesignRecords.lever));
    await pg.locator('#ml-leverEffortArm').fill('1'); await limits('lever',250,1); await select('lever','leverEffortArm');
    check(await pg.evaluate(fixed=>JSON.stringify(window.__qaState.benchDesignRecords.lever)===fixed,fixed),
      'Later geometry, constraint and selected-variable edits leave the recorded design fixed');
    check(await pg.evaluate(prior=>JSON.stringify([window.__qaState.benchExperiments,window.__qaState.benchReferences,window.__qaState.benchInvestigations])===prior,prior),
      'Design choices and records preserve comparison evidence, saved setup and investigation predictions');
    await pg.locator('#ml-bench-tab-pulley').click(); await open('pulley'); await limits('pulley',125,1.8);
    await pg.locator('#ml-bench-tab-lever').focus(); await pg.keyboard.press('Enter'); await open('lever');
    check(await pg.locator('#ml-design-control-lever').inputValue()==='leverEffortArm'&&
      await pg.locator('#ml-design-force-lever').inputValue()==='250'&&await pg.locator('#ml-design-travel-lever').inputValue()==='1',
      'Keyboard station navigation restores its selected variable and independent limits');
    await capture('desktop-recorded-design',saved('lever'));
    await saved('lever').getByRole('button',{name:/Open.*work record/}).click();
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const workDesign = pg.locator('[data-ml-design-record-station=lever]');
    check(await workDesign.isVisible()&&await pg.locator('#ml-record-design-note-lever').inputValue()===workingNote,
      'Work record opens the saved design and its current explanation');
    const revised=workingNote+'\nRechecked against the saved task.';
    await pg.locator('#ml-record-design-note-lever').fill(revised); await pg.locator('#ml-record-design-note-lever').press('End'); await pg.locator('#ml-record-design-note-lever').press('!');
    const finalNote=revised+'!';
    check(await pg.locator('#ml-record-design-note-lever').inputValue()===finalNote&&
      await pg.evaluate(note=>window.__qaState.benchDesignRecords.lever.note===note,finalNote),
      'Work-record editing retains keyboard focus and saves the latest multiline design explanation');
    const downloadPromise=pg.waitForEvent('download'); await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloadPromise; const downloaded=fs.readFileSync(await download.path(),'utf8');
    const exportedDesign=downloaded.slice(downloaded.indexOf('Recorded design: Lever'));
    await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&downloaded.includes(finalNote)&&downloaded.includes('Comparison explanation remains separate.')&&
      exportedDesign.includes('Maximum effort force: 100 N')&&exportedDesign.includes('Maximum total hand travel: 3 m')&&
      exportedDesign.includes('Chosen setting: Load arm')&&exportedDesign.includes('Load arm: 0.5 m')&&exportedDesign.includes('Effort arm: 2 m')&&
      exportedDesign.includes('Effort needed: 100 N · Within limit')&&exportedDesign.includes('Total hand travel: 2 m · Within limit')&&
      exportedDesign.includes('Task work: 200 J')&&exportedDesign.includes('Recorded setup meets both limits.')&&
      !exportedDesign.includes('Maximum effort force: 250 N'),
      'Native text download includes latest explanation, fixed design values and separate comparison evidence');
    check(!await pg.locator('a[download="machine-lab-work-record.txt"]').count(),'The temporary download link is removed');
    await pg.getByRole('button',{name:'Review design at station — Lever',exact:true}).focus(); await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-design-note-lever');
    check(await panel('lever').evaluate(el=>el.open)&&await pg.locator('#ml-design-note-lever').inputValue()===finalNote&&
      await pg.evaluate(()=>window.__qaState.bench==='lever'&&window.__qaState.leverEffortArm===1&&window.__qaState.leverLoadArm===0.5&&!window.__qaState.shopAnimating),
      'Keyboard Review opens the design explanation while preserving live geometry');
    const finalState=await pg.evaluate(()=>window.__qaState);
    for(const [width,theme,name,view] of [
      [390,{},'phone-recorded-design','machines'],
      [320,{dark:true},'dark-phone-recorded-design','machines'],
      [320,{contrast:true},'forced-colors-work-record','learn']
    ]) {
      await mount('lever',width,theme,{...finalState,view,manualTopic:'record'});
      if(view==='machines')await open('lever');
      await capture(name,view==='machines'?panel('lever'):pg.locator('[data-ml-design-record-station=lever]'));
    }
  } catch(e) {
    errors.push(String(e&&e.stack||e)); process.exitCode=1;
  } finally {
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({checks,shots,errors},null,2));
    console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors},null,2));
    if(errors.length)process.exitCode=1;
    await b.close();
  }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
