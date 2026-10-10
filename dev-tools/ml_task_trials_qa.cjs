// Native QA for one-condition task trials and retained design evidence.
//   node dev-tools/ml_task_trials_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
let source = fs.readFileSync(path.join(__dirname, 'ml_scene_shots.cjs'), 'utf8');
source = source.slice(0, source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-task-trials-2026-10-10/browser');")
  .replace('deviceScaleFactor: 2', 'deviceScaleFactor: 1, acceptDownloads: true')
  .replace('chromium.launch({ args:', "chromium.launch({ downloadsPath: path.join(OUT,'downloads'), args:")
  .replace('var ctx = {', 'window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks = [], shots = [];
  // Expectations use independent ideal machine ratios, never __mlMath.
  const fixtures = [
    {kind:'lever',key:'leverLoad',load:400,ma:2},
    {kind:'pulley',key:'pulleyLoad',load:400,ma:2},
    {kind:'windlass',key:'windlassLoad',load:400,ma:0.45/0.1},
    {kind:'ramp',key:'rampLoad',load:400,ma:4/1},
    {kind:'wedge',key:'wedgeLoad',load:800,ma:0.3/0.06},
    {kind:'screw',key:'screwLoad',load:2000,ma:2*Math.PI*0.15/0.005}
  ];
  const lever = {leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:0.5};
  const evidence = {benchId:'lever',before:{settings:lever},after:{settings:{...lever,leverEffortArm:4}},
    note:'Separate geometry investigation evidence.',investigation:{id:'lever-one-change-v1',force:'same',distance:'more'}};
  const oldNote = 'The 400 N load needs 200 N effort and 1 m of hand travel.';
  const newNote = 'With an 800 N load, effort doubles to 400 N and hand travel stays at 1 m.';
  const preserved = {benchExperiments:{lever:evidence},benchReferences:{lever},
    benchInvestigations:{lever:{id:'lever-one-change-v1',force:'same',distance:'more',tested:true}},
    benchDesignRecords:{lever:{benchId:'lever',settings:lever,limits:{force:5000,travel:300},control:'leverEffortArm',note:oldNote}}};
  function check(ok,label) { checks.push(label); if(!ok) errors.push(label); }
  function near(a,b) { return Math.abs(a-b)<1e-7; }
  function panel(kind) { return pg.locator('[data-ml-design='+kind+']'); }
  function trials(kind) { return panel(kind).locator('[data-ml-task-trials='+kind+']'); }
  function trial(kind,type) { return trials(kind).locator('[data-ml-task-trial='+type+']'); }
  async function open(details,keyboard=false) {
    if(!await details.evaluate(el=>el.open)) {
      if(keyboard) { await details.locator(':scope > summary').focus(); await pg.keyboard.press('Enter'); }
      else await details.locator(':scope > summary').click();
    }
  }
  async function mount(kind,width=1150,theme={},extra={}) {
    await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
    await pg.setViewportSize({width,height:1100});
    const state=S({view:'machines',bench:kind,motionPref:'off',shopMotionProgress:0.1,
      benchDesignLimits:{[kind]:{force:'5000',travel:'300'}},...preserved,...extra});
    await pg.evaluate(([s,o])=>window.__mount(s,o),[state,{band:'g68',...theme}]);
    await panel(kind).waitFor(); await open(panel(kind));
  }
  async function limits(kind,force,travel) {
    await pg.locator('#ml-design-force-'+kind).fill(String(force));
    await pg.locator('#ml-design-travel-'+kind).fill(String(travel));
  }
  async function matches(fixture,type) {
    const card=trial(fixture.kind,type),load=fixture.load,ma=fixture.ma;
    const metrics=await card.locator('[data-ml-task-metric]').evaluateAll(els=>Object.fromEntries(els.map(el=>[
      el.getAttribute('data-ml-task-metric'),{before:Number(el.getAttribute('data-before')),after:Number(el.getAttribute('data-after'))}])));
    const expected={force:[load/ma,(type==='load'?2:1)*load/ma],
      travel:[0.5*ma,(type==='movement'?1:0.5)*ma],work:[load*0.5,load]};
    return Object.keys(expected).every(key=>metrics[key]&&near(metrics[key].before,expected[key][0])&&near(metrics[key].after,expected[key][1]))&&
      await card.getAttribute('data-key')===(type==='load'?fixture.key:'loadDistance')&&
      near(Number(await card.getAttribute('data-value')),type==='load'?load*2:1)&&
      await card.getAttribute('data-available')==='true'&&await card.getAttribute('data-fits')==='true'&&
      await card.getAttribute('role')==='group'&&!!await card.getAttribute('aria-label');
  }
  async function apply(kind,type,key) {
    await trial(kind,type).locator('[data-ml-task-use='+type+']').focus(); await pg.keyboard.press('Enter');
    await pg.waitForFunction(id=>document.activeElement?.id===id,'ml-'+key);
  }
  async function record(kind,replace=false) {
    await panel(kind).getByRole('button',{name:replace?'Replace design record':'Record this design',exact:true}).focus();
    await pg.keyboard.press('Enter');
    await pg.waitForFunction(id=>document.activeElement?.id===id,'ml-design-note-'+kind);
  }
  async function capture(name,target) {
    await target.locator(':scope > summary').focus(); await pg.keyboard.press('Tab'); await pg.keyboard.press('Shift+Tab');
    await target.locator(':scope > summary').focus();
    check(await target.locator(':scope > summary').evaluate(el=>{
      const style=getComputedStyle(el);return el===document.activeElement&&el.matches(':focus-visible')&&style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0;
    }),name+': disclosure retains a visible keyboard focus outline');
    check(await target.evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1&&
      Array.from(el.querySelectorAll('[data-ml-task-trial],button')).every(child=>child.scrollWidth<=child.clientWidth+1)),
      name+': cards, buttons and page fit the viewport');
    await target.screenshot({path:path.join(OUT,name+'.png')}); shots.push(name);
  }
  try {
    for(const fixture of fixtures) {
      for(const type of ['load','movement']) {
        await mount(fixture.kind);
        const before=await pg.evaluate(()=>window.__qaState);
        check(!await trials(fixture.kind).evaluate(el=>el.open)&&await trials(fixture.kind).locator(':scope > summary').textContent()==='Test a changed task',
          fixture.kind+'/'+type+': task trials start in a closed disclosure with a clear summary');
        await open(trials(fixture.kind),true);
        check(await matches(fixture,type),fixture.kind+'/'+type+': independent ideal force, travel and doubled work match full-precision preview data');
        check(await pg.evaluate(before=>JSON.stringify(window.__qaState)===JSON.stringify(before),before),
          fixture.kind+'/'+type+': opening and reading the task preview changes no state');
        const key=type==='load'?fixture.key:'loadDistance',value=type==='load'?fixture.load*2:1;
        await apply(fixture.kind,type,key);
        check(await pg.evaluate(([before,key,value])=>{
          const now=window.__qaState;return now[key]===value&&!now.shopAnimating&&now.shopMotionProgress===0.5&&
            Object.keys(before).every(k=>[key,'shopAnimating','shopMotionProgress','shopClueBench','benchPrediction','benchChoice','benchResult'].includes(k)||JSON.stringify(now[k])===JSON.stringify(before[k]));
        },[before,key,value]),fixture.kind+'/'+type+': keyboard use changes one task condition, pauses halfway, focuses its control and preserves all other state');
      }
    }
    await pg.locator('.ml-shop-bay canvas').waitFor();
    check(await pg.locator('.ml-shop-bay canvas').evaluate(el=>el.width>0&&el.height>0),'Native task scenarios use the real THREE workshop canvas');

    await mount('lever'); await open(trials('lever'),true); await capture('desktop-task-trials',trials('lever'));
    await mount('lever',390); await limits('lever',300,1.5); await open(trials('lever'),true);
    check(await trial('lever','load').getAttribute('data-fits')==='false'&&await trial('lever','movement').getAttribute('data-fits')==='false'&&
      await trial('lever','load').locator('button').isEnabled()&&await trial('lever','movement').locator('button').isEnabled(),
      'Task previews outside the force or travel limit remain available for deliberate failed trials');
    await capture('phone-task-limits',trials('lever'));
    const fixed=await pg.evaluate(()=>window.__qaState.benchDesignRecords.lever);
    const independent=await pg.evaluate(()=>JSON.stringify([window.__qaState.benchExperiments,window.__qaState.benchReferences,window.__qaState.benchInvestigations]));
    await apply('lever','load','leverLoad');
    check(await pg.evaluate(fixed=>JSON.stringify(window.__qaState.benchDesignRecords.lever)===JSON.stringify(fixed),fixed)&&
      await pg.locator('#ml-design-note-lever').inputValue()===oldNote,'Applying a failed task trial preserves the fixed design and its explanation');
    const live=panel('lever').locator('[data-ml-design-compare=lever]'); await open(live,true);
    check(await live.locator('[data-ml-design-comparison=live]').getAttribute('data-same-task')==='false'&&
      await live.locator('[data-ml-design-comparison=live]').getAttribute('data-geometry-changes')==='0'&&
      (await live.textContent()).includes('Different task:')&&!(await live.textContent()).includes('isolates one geometry change'),
      'Saved-versus-current comparison identifies the changed task without a controlled geometry claim');
    await record('lever',true); await pg.locator('#ml-design-note-lever').fill(newNote);
    const revision=panel('lever').locator('[data-ml-design-revision=lever]'); await open(revision,true);
    check(await revision.locator('[data-ml-design-comparison=revision]').getAttribute('data-same-task')==='false'&&
      (await revision.textContent()).includes(oldNote)&&!(await revision.textContent()).includes('isolates one geometry change'),
      'Recording the task trial preserves the earlier explanation and accurately labels the fixed revision');
    await open(trials('lever'),true); await apply('lever','movement','loadDistance');
    await panel('lever').getByRole('button',{name:'Open work record',exact:true}).click();
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const work=pg.locator('[data-ml-design-record-station=lever]');
    await open(work.locator('[data-ml-design-revision=lever]'),true);
    check((await work.textContent()).includes(oldNote)&&await pg.locator('#ml-record-design-note-lever').inputValue()===newNote,
      'Work record retains both explanations after another live task change');
    const downloadPromise=pg.waitForEvent('download'); await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloadPromise,textRecord=fs.readFileSync(await download.path(),'utf8');
    await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&textRecord.includes(oldNote)&&textRecord.includes(newNote)&&
      textRecord.includes('Effort needed: 200 N')&&textRecord.includes('Effort needed: 400 N')&&
      textRecord.includes('Total hand travel: 1 m')&&textRecord.includes('Task work: 200 J')&&textRecord.includes('Task work: 400 J')&&
      textRecord.includes('Different task:')&&!textRecord.includes('Task work: 800 J')&&
      textRecord.indexOf('My explanation: '+newNote)<textRecord.indexOf('Previous design: Lever'),
      'Native text download contains both fixed task designs and correctly attributed notes after live task changes');
    check(await pg.evaluate(independent=>JSON.stringify([window.__qaState.benchExperiments,window.__qaState.benchReferences,window.__qaState.benchInvestigations])===independent,independent),
      'Applying task trials and recording revisions preserve separate investigation evidence');
    await pg.getByRole('button',{name:'Review design at station — Lever',exact:true}).focus(); await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-design-note-lever');
    check(await pg.evaluate(()=>window.__qaState.leverLoad===800&&window.__qaState.loadDistance===1)&&
      await pg.locator('#ml-design-note-lever').inputValue()===newNote,'Keyboard review preserves the latest live task and focuses the fixed explanation');

    await mount('screw',320,{dark:true}); await open(trials('screw'),true); await capture('dark-phone-screw-tasks',trials('screw'));
    await mount('lever',320,{contrast:true}); await open(trials('lever'),true); await capture('forced-colors-task-trials',trials('lever'));
    await mount('lever',1150,{}, {leverLoad:500,loadDistance:1.5}); await open(trials('lever'),true);
    check(await trial('lever','load').getAttribute('data-value')==='1000'&&await trial('lever','movement').getAttribute('data-value')==='3'&&
      await trial('lever','load').locator('button').isEnabled()&&await trial('lever','movement').locator('button').isEnabled(),
      'Doubling exactly to maximum load and movement remains available');
    await mount('lever',1150,{}, {leverLoad:510,loadDistance:1.6}); await open(trials('lever'),true);
    check(await trial('lever','load').getAttribute('data-available')==='false'&&await trial('lever','movement').getAttribute('data-available')==='false'&&
      await trial('lever','load').locator('button').isDisabled()&&await trial('lever','movement').locator('button').isDisabled(),
      'Task previews beyond either slider range remain visible with disabled application');
    await mount('lever',1150,{}, {leverLoad:402,loadDistance:0.125}); await open(trials('lever'),true);
    check(await trial('lever','load').getAttribute('data-value')==='804'&&await trial('lever','movement').getAttribute('data-value')==='0.25'&&
      await trial('lever','load').locator('button').isDisabled()&&await trial('lever','movement').locator('button').isDisabled(),
      'Task previews between legal slider increments cannot be applied or silently rounded');
    await mount('lever'); await pg.locator('#ml-design-force-lever').fill('');
    check(await trials('lever').count()===0&&await pg.locator('#ml-design-force-lever').getAttribute('aria-invalid')==='true',
      'Invalid limit drafts remove actionable task previews and expose field validity');
    await mount('ramp',1150,{}, {rampLength:0.5,rampHeight:1});
    check(await trials('ramp').count()===0&&(await panel('ramp').textContent()).includes('Correct the station settings'),
      'Invalid geometry shows correction guidance without actionable task trials');
  } catch(e) { errors.push(String(e&&e.stack||e)); process.exitCode=1; }
  finally {
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),checks,shots,errors},null,2));
    console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors},null,2));
    if(errors.length) process.exitCode=1; await b.close();
  }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
