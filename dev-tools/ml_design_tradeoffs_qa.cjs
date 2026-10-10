// Native QA for feasible design choices, deliberate application and retained records.
//   node dev-tools/ml_design_tradeoffs_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
let source = fs.readFileSync(path.join(__dirname, 'ml_scene_shots.cjs'), 'utf8');
source = source.slice(0, source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-design-tradeoffs-2026-10-10/browser');")
  .replace('deviceScaleFactor: 2', 'deviceScaleFactor: 1, acceptDownloads: true')
  .replace('chromium.launch({ args:', "chromium.launch({ downloadsPath: path.join(OUT,'downloads'), args:")
  .replace('var ctx = {', 'window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks = [], shots = [];
  // Expected feasible endpoints and nearest values are calculated independently
  // from the published ideal ratios and legal slider increments, not __mlMath.
  const fixtures = [
    {kind:'lever',key:'leverEffortArm',current:3,load:400,force:160,travel:2,extra:{leverEffortArm:3},
      choices:[{value:4,ma:4,goals:'force'},{value:2.5,ma:2.5,goals:'travel'},{value:3,ma:3,goals:'nearest'}]},
    {kind:'pulley',key:'pulleySegments',current:4,load:400,force:200,travel:3,extra:{pulleySegments:4},
      choices:[{value:6,ma:6,goals:'force'},{value:2,ma:2,goals:'travel'},{value:4,ma:4,goals:'nearest'}]},
    {kind:'windlass',key:'windlassDrumR',current:0.1,load:400,force:160,travel:3,extra:{},
      choices:[{value:0.08,ma:0.45/0.08,goals:'force'},{value:0.18,ma:0.45/0.18,goals:'travel'},{value:0.1,ma:4.5,goals:'nearest'}]},
    {kind:'ramp',key:'rampHeight',current:1,load:400,force:200,travel:3,extra:{},
      choices:[{value:0.7,ma:4/0.7,goals:'force'},{value:2,ma:2,goals:'travel'},{value:1,ma:4,goals:'nearest'}]},
    {kind:'wedge',key:'wedgeThickness',current:0.06,load:800,force:200,travel:3,extra:{},
      choices:[{value:0.05,ma:6,goals:'force'},{value:0.075,ma:4,goals:'travel'},{value:0.06,ma:5,goals:'nearest'}]},
    {kind:'screw',key:'screwPitch',current:0.007,load:2000,force:20,travel:100,extra:{screwPitch:0.007},
      choices:[{value:0.005,ma:2*Math.PI*0.15/0.005,goals:'force'},{value:0.009,ma:2*Math.PI*0.15/0.009,goals:'travel'},{value:0.007,ma:2*Math.PI*0.15/0.007,goals:'nearest'}]}
  ];
  const lever = {leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:0.5};
  const evidence = {benchId:'lever',before:{settings:lever},after:{settings:{...lever,leverEffortArm:4}},
    note:'Separate investigation evidence.',investigation:{id:'lever-one-change-v1',force:'same',distance:'more'}};
  const preserved = {benchExperiments:{lever:evidence},benchReferences:{lever},
    benchInvestigations:{lever:{id:'lever-one-change-v1',force:'same',distance:'more',tested:true}}};
  const failedNote = 'First trial: 200 N exceeds the 160 N limit. I will compare force and travel choices.';
  const revisedNote = 'I chose the 4 m effort arm: effort falls to 100 N and hand travel rises to 2 m.';
  function check(ok,label) { checks.push(label); if (!ok) errors.push(label); }
  function near(a,b) { return Math.abs(a-b)<1e-7; }
  function panel(kind) { return pg.locator('[data-ml-design='+kind+']'); }
  function options(kind) { return panel(kind).locator('[data-ml-design-options='+kind+']'); }
  function option(kind,value) { return options(kind).locator('[data-ml-design-option="'+value+'"]'); }
  async function open(details,keyboard=false) {
    if (!await details.evaluate(el=>el.open)) {
      if (keyboard) { await details.locator(':scope > summary').focus(); await pg.keyboard.press('Enter'); }
      else await details.locator(':scope > summary').click();
    }
  }
  async function mount(kind,width=1150,theme={},extra={}) {
    await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
    await pg.setViewportSize({width,height:1100});
    const state=S({view:'machines',bench:kind,motionPref:'off',shopMotionProgress:0.1,...extra});
    await pg.evaluate(([s,o])=>window.__mount(s,o),[state,{band:'g68',...theme}]);
    await pg.locator(state.view==='learn'?'#ml-work-record':'[data-ml-design='+kind+']').waitFor();
  }
  async function limits(kind,force,travel) {
    await pg.locator('#ml-design-force-'+kind).fill(String(force));
    await pg.locator('#ml-design-travel-'+kind).fill(String(travel));
  }
  async function configure(fixture,width=1150,theme={}) {
    await mount(fixture.kind,width,theme,fixture.extra); await open(panel(fixture.kind));
    await limits(fixture.kind,fixture.force,fixture.travel);
    await pg.locator('#ml-design-control-'+fixture.kind).selectOption(fixture.key);
  }
  async function choiceMatches(fixture) {
    const cards=await options(fixture.kind).locator('[data-ml-design-option]').evaluateAll(els=>els.map(el=>({
      value:Number(el.getAttribute('data-ml-design-option')),goals:el.getAttribute('data-goals'),
      force:Number(el.getAttribute('data-force')),travel:Number(el.getAttribute('data-travel')),
      forceMargin:Number(el.getAttribute('data-force-margin')),travelMargin:Number(el.getAttribute('data-travel-margin')),
      current:el.getAttribute('data-current'),disabled:el.querySelector('button').disabled
    })));
    return cards.length===fixture.choices.length && fixture.choices.every(expected=>{
      const actual=cards.find(card=>near(card.value,expected.value));
      const force=fixture.load/expected.ma,travel=0.5*expected.ma,isCurrent=near(expected.value,fixture.current);
      return actual&&actual.goals===expected.goals&&near(actual.force,force)&&near(actual.travel,travel)&&
        near(actual.forceMargin,fixture.force-force)&&near(actual.travelMargin,fixture.travel-travel)&&
        actual.current===String(isCurrent)&&actual.disabled===isCurrent;
    });
  }
  async function apply(kind,value,key) {
    const button=option(kind,value).locator('[data-ml-design-use]');
    await button.focus(); await pg.keyboard.press('Enter');
    await pg.waitForFunction(id=>document.activeElement?.id===id,'ml-'+key);
  }
  async function record(kind,replace=false) {
    await panel(kind).getByRole('button',{name:replace?'Replace design record':'Record this design',exact:true}).focus();
    await pg.keyboard.press('Enter');
    await pg.waitForFunction(id=>document.activeElement?.id===id,'ml-design-note-'+kind);
  }
  async function capture(name,target) {
    await target.locator(':scope > summary').focus(); await pg.keyboard.press('Tab'); await pg.keyboard.press('Shift+Tab');
    // Return focus to the disclosure using a keyboard-originated focus state.
    await target.locator(':scope > summary').focus();
    check(await target.locator(':scope > summary').evaluate(el=>{
      const style=getComputedStyle(el);return el===document.activeElement&&el.matches(':focus-visible')&&style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0;
    }),name+': expanded choices retain a visible keyboard focus outline');
    check(await target.evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1&&
      Array.from(el.querySelectorAll('[data-ml-design-option],button')).every(child=>child.scrollWidth<=child.clientWidth+1)),
      name+': cards, buttons and page fit the viewport');
    await target.screenshot({path:path.join(OUT,name+'.png')}); shots.push(name);
  }
  try {
    for (const fixture of fixtures) {
      await configure(fixture);
      const before=await pg.evaluate(()=>window.__qaState);
      check(!await options(fixture.kind).evaluate(el=>el.open),fixture.kind+': alternatives start in a closed disclosure');
      await open(options(fixture.kind),true);
      check(await options(fixture.kind).getAttribute('data-count')===String(fixture.choices.length)&&await choiceMatches(fixture),
        fixture.kind+': all three goals select legal values with independent force, travel and margin calculations');
      check(await panel(fixture.kind).locator('[data-ml-design-fit]').getAttribute('data-ml-design-fit')==='true'&&
        await pg.evaluate(before=>JSON.stringify(window.__qaState)===JSON.stringify(before),before),
        fixture.kind+': alternatives remain available for a working setup and opening them changes no state');
      const selected=fixture.choices[0].value;
      await apply(fixture.kind,selected,fixture.key);
      check(await pg.evaluate(([before,key,value])=>{
        const now=window.__qaState; return now[key]===value&&!now.shopAnimating&&now.shopMotionProgress===0.5&&
          Object.keys(before).every(k=>[key,'shopAnimating','shopMotionProgress','shopClueBench','benchPrediction','benchChoice','benchResult'].includes(k)||JSON.stringify(now[k])===JSON.stringify(before[k]));
      },[before,fixture.key,selected]),fixture.kind+': keyboard use changes only the chosen setting, pauses halfway and focuses its control');
      check(await option(fixture.kind,selected).locator('button').isDisabled(),fixture.kind+': the applied choice becomes the disabled current setting');
    }
    await pg.locator('.ml-shop-bay canvas').waitFor();
    check(await pg.locator('.ml-shop-bay canvas').evaluate(el=>el.width>0&&el.height>0),'All native station scenarios use the real THREE workshop canvas');

    await configure(fixtures[0]); await open(options('lever'),true);
    await capture('desktop-working-designs',options('lever'));
    await limits('lever',100,2);
    check(await choiceMatches({...fixtures[0],force:100,choices:[{value:4,ma:4,goals:'force travel nearest'}]})&&
      await options('lever').getAttribute('data-count')==='1','Tightened limits merge all three goals into one feasible setting');
    await limits('lever',160,2); await pg.locator('#ml-design-control-lever').selectOption('leverLoadArm');
    check(await choiceMatches({...fixtures[0],key:'leverLoadArm',current:1,choices:[
      {value:0.8,ma:3/0.8,goals:'force'},{value:1.2,ma:2.5,goals:'travel'},{value:1,ma:3,goals:'nearest'}]})&&
      await pg.evaluate(()=>window.__qaState.leverEffortArm===3&&window.__qaState.leverLoadArm===1),
      'Changing the selected geometry refreshes denominator choices without changing the machine');

    await mount('lever',390,{},preserved); await open(panel('lever')); await limits('lever',160,2);
    await open(options('lever'),true);
    check(await panel('lever').locator('[data-ml-design-fit]').getAttribute('data-ml-design-fit')==='false'&&
      await choiceMatches({...fixtures[0],current:2,choices:[{value:4,ma:4,goals:'force'},{value:2.5,ma:2.5,goals:'travel nearest'}]}),
      'A failing setup offers working alternatives and merges matching shortest-travel and closest-setting goals');
    await capture('phone-failing-design',options('lever'));
    await record('lever'); await pg.locator('#ml-design-note-lever').fill(failedNote);
    const frozen=await pg.evaluate(()=>window.__qaState.benchDesignRecords.lever);
    const untouched=await pg.evaluate(()=>JSON.stringify([window.__qaState.benchExperiments,window.__qaState.benchReferences,window.__qaState.benchInvestigations]));
    await apply('lever',4,'leverEffortArm');
    check(await pg.evaluate(frozen=>JSON.stringify(window.__qaState.benchDesignRecords.lever)===JSON.stringify(frozen),frozen)&&
      await pg.locator('#ml-design-note-lever').inputValue()===failedNote,'Using an alternative preserves the recorded failed design and its explanation');
    await record('lever',true); await pg.locator('#ml-design-note-lever').fill(revisedNote);
    check(await pg.evaluate(([frozen,note])=>{
      const r=window.__qaState.benchDesignRecords.lever;return r.settings.leverEffortArm===4&&r.note===note&&
        JSON.stringify(r.previous)===JSON.stringify(frozen)&&!r.previous.previous;
    },[frozen,revisedNote]),'Explicit recording after applying an alternative creates a bounded revision with both explanations');
    await pg.locator('#ml-leverEffortArm').fill('3');
    await panel('lever').getByRole('button',{name:'Open work record',exact:true}).click();
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const work=pg.locator('[data-ml-design-record-station=lever]');
    await open(work.locator('[data-ml-design-revision=lever]'),true);
    check((await work.textContent()).includes(failedNote)&&await pg.locator('#ml-record-design-note-lever').inputValue()===revisedNote,
      'Work-record revision retains the fixed failed and selected designs with their independent explanations');
    const downloadPromise=pg.waitForEvent('download'); await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloadPromise,textRecord=fs.readFileSync(await download.path(),'utf8');
    await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&textRecord.includes(failedNote)&&textRecord.includes(revisedNote)&&
      textRecord.includes('Effort needed: 200 N')&&textRecord.includes('Effort needed: 100 N')&&
      textRecord.includes('Total hand travel: 1 m')&&textRecord.includes('Total hand travel: 2 m')&&
      textRecord.includes('Previous setup does not meet both limits.')&&textRecord.includes('Recorded setup meets both limits.')&&
      textRecord.includes('Effort arm: 2 m')&&textRecord.includes('Effort arm: 4 m'),
      'Native text download contains both fixed designs and notes after live geometry changes');
    check(await pg.evaluate(untouched=>JSON.stringify([window.__qaState.benchExperiments,window.__qaState.benchReferences,window.__qaState.benchInvestigations])===untouched,untouched),
      'Choice application and recording preserve separate investigation evidence and choices');
    await pg.getByRole('button',{name:'Review design at station — Lever',exact:true}).focus(); await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-design-note-lever');
    check(await pg.evaluate(()=>window.__qaState.leverEffortArm===3)&&await pg.locator('#ml-design-note-lever').inputValue()===revisedNote,
      'Keyboard review returns to the explanation and retains the live geometry');

    await configure(fixtures[5],320,{dark:true}); await open(options('screw'),true);
    await capture('dark-phone-screw-tradeoffs',options('screw'));
    await configure(fixtures[0],320,{contrast:true}); await open(options('lever'),true);
    await capture('forced-colors-working-designs',options('lever'));

    await mount('pulley'); await open(panel('pulley')); await limits('pulley',160,1.3);
    check(await options('pulley').count()===0&&await panel('pulley').locator('[data-ml-design-no-step]').isVisible(),
      'A possible work budget with no legal whole-rope increment offers no alternative');
    await limits('pulley',100,1);
    check(await options('pulley').count()===0&&await panel('pulley').locator('[data-ml-design-impossible]').isVisible(),
      'An insufficient force-travel budget offers no working alternative');
    await limits('pulley',100,2); await open(options('pulley'),true);
    check(await choiceMatches({kind:'pulley',current:2,load:400,force:100,travel:2,
      choices:[{value:4,ma:4,goals:'force travel nearest'}]}),'A single legal pulley setting is rendered once with all three goal labels');
    await pg.locator('#ml-design-force-pulley').fill('');
    check(await options('pulley').count()===0&&await pg.locator('#ml-design-force-pulley').getAttribute('aria-invalid')==='true',
      'Invalid limit drafts remove actionable alternatives and expose field validity');
    await mount('ramp',1150,{}, {rampLength:0.5,rampHeight:1}); await open(panel('ramp'));
    check(await options('ramp').count()===0&&(await panel('ramp').textContent()).includes('Correct the station settings'),
      'Invalid geometry shows correction guidance without actionable alternatives');
  } catch(e) { errors.push(String(e&&e.stack||e)); process.exitCode=1; }
  finally {
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),checks,shots,errors},null,2));
    console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors},null,2));
    if(errors.length) process.exitCode=1; await b.close();
  }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
