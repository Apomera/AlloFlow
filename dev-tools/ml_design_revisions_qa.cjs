// Native QA for comparing a saved design and retaining one previous revision.
//   node dev-tools/ml_design_revisions_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
let source = fs.readFileSync(path.join(__dirname, 'ml_scene_shots.cjs'), 'utf8');
source = source.slice(0, source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-design-revisions-2026-10-10/browser');")
  .replace('deviceScaleFactor: 2', 'deviceScaleFactor: 1, acceptDownloads: true')
  .replace('chromium.launch({ args:', "chromium.launch({ downloadsPath: path.join(OUT,'downloads'), args:")
  .replace('var ctx = {', 'window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks = [], shots = [];
  const fixtures = [
    {kind:'lever',key:'leverEffortArm',after:4,beforeMA:2,afterMA:4,load:400,force:100,travel:3,extra:{}},
    {kind:'pulley',key:'pulleySegments',after:4,beforeMA:2,afterMA:4,load:400,force:100,travel:3,extra:{}},
    {kind:'windlass',key:'windlassHandleR',after:0.4,beforeMA:1.5,afterMA:4,load:400,force:100,travel:3,extra:{windlassHandleR:0.15}},
    {kind:'ramp',key:'rampLength',after:4,beforeMA:2,afterMA:4,load:400,force:100,travel:3,extra:{rampLength:2}},
    {kind:'wedge',key:'wedgeLength',after:0.24,beforeMA:2,afterMA:4,load:800,force:200,travel:3,extra:{wedgeLength:0.12}},
    {kind:'screw',key:'screwPitch',after:0.005,beforeMA:2*Math.PI*0.15/0.002,afterMA:2*Math.PI*0.15/0.005,load:2000,force:100,travel:100,extra:{screwPitch:0.002}}
  ];
  const lever = {leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:0.5};
  const evidence = {benchId:'lever',before:{settings:lever},after:{settings:{...lever,leverEffortArm:4}},
    note:'Separate investigation evidence.',investigation:{id:'lever-one-change-v1',force:'same',distance:'more'}};
  const preserved = {benchExperiments:{lever:evidence},benchReferences:{lever},
    benchInvestigations:{lever:{id:'lever-one-change-v1',force:'same',distance:'more',tested:true}}};
  const failedNote = 'First trial: 200 N exceeds my 100 N limit.\nI predict a shorter load arm will reduce effort.';
  const revisedNote = 'Revision: a 0.5 m load arm halves effort to 100 N.\nHand travel doubles to 2 m, within my 3 m limit. <literal>';
  function check(ok, label) { checks.push(label); if (!ok) errors.push(label); }
  function panel(kind) { return pg.locator('[data-ml-design='+kind+']'); }
  function saved(kind) { return pg.locator('[data-ml-design-recorded='+kind+']'); }
  function live(kind) { return saved(kind).locator('[data-ml-design-comparison=live]'); }
  function revision(kind) { return pg.locator('[data-ml-design-revision='+kind+']'); }
  async function open(details, keyboard=false) {
    if (!await details.evaluate(el=>el.open)) {
      if (keyboard) { await details.locator(':scope > summary').focus(); await pg.keyboard.press('Enter'); }
      else await details.locator(':scope > summary').click();
    }
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
  async function record(kind, replace=false) {
    await panel(kind).getByRole('button',{name:replace?'Replace design record':'Record this design',exact:true}).focus();
    await pg.keyboard.press('Enter');
    await pg.waitForFunction(id=>document.activeElement?.id===id,'ml-design-note-'+kind);
  }
  async function comparisonNumbers(target, before, after) {
    for (const [metric,index] of [['effort',0],['travel',1],['work',2]]) {
      const attrs=await target.locator('[data-ml-design-change='+metric+']').evaluate(el=>['data-before','data-after','data-delta'].map(key=>Number(el.getAttribute(key))));
      if (Math.abs(attrs[0]-before[index])>1e-6||Math.abs(attrs[1]-after[index])>1e-6||Math.abs(attrs[2]-(after[index]-before[index]))>1e-6) return false;
    }
    return true;
  }
  async function capture(name, target) {
    const fits=await target.evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1);
    check(fits,name+': comparison and page fit the viewport');
    await target.screenshot({path:path.join(OUT,name+'.png')}); shots.push(name);
  }
  try {
    for (const fixture of fixtures) {
      const {kind,key,after,beforeMA,afterMA,load,force,travel,extra}=fixture;
      await mount(kind,1150,{},extra); await open(panel(kind)); await limits(kind,force,travel);
      await pg.locator('#ml-design-control-'+kind).selectOption(key); await record(kind);
      const frozen=await pg.evaluate(kind=>JSON.stringify(window.__qaState.benchDesignRecords[kind]),kind);
      const details=saved(kind).locator('[data-ml-design-compare='+kind+']');
      check(!await details.evaluate(el=>el.open),kind+': live comparison begins in its own closed disclosure');
      await pg.locator('#ml-'+key).fill(String(after)); await open(details,true);
      const cmp=live(kind);
      check(await cmp.getAttribute('data-same-task')==='true'&&await cmp.getAttribute('data-same-limits')==='true'&&
        Number(await cmp.getAttribute('data-geometry-changes'))===1,kind+': keyboard comparison identifies one geometry change on the same task');
      check(await comparisonNumbers(cmp,[load/beforeMA,0.5*beforeMA,0.5*load],[load/afterMA,0.5*afterMA,0.5*load]),
        kind+': effort, travel and work deltas match the independent ideal calculation');
      check(await cmp.locator('[data-ml-design-common-fit=before]').getAttribute('data-fit')==='false'&&
        await cmp.locator('[data-ml-design-common-fit=after]').getAttribute('data-fit')==='true'&&
        await pg.evaluate(([kind,frozen])=>JSON.stringify(window.__qaState.benchDesignRecords[kind])===frozen,[kind,frozen]),
        kind+': common saved limits show failing→working without mutating the recorded design');
    }
    await pg.locator('.ml-shop-bay canvas').waitFor();
    check(await pg.locator('.ml-shop-bay canvas').evaluate(el=>el.width>0&&el.height>0),'Native scenarios use the real THREE workshop canvas');
    await mount('lever',1150,{},preserved); await open(panel('lever')); await limits('lever',100,3);
    await pg.locator('#ml-design-control-lever').selectOption('leverLoadArm'); await record('lever');
    await pg.locator('#ml-design-note-lever').fill(failedNote);
    const first=await pg.evaluate(()=>window.__qaState.benchDesignRecords.lever);
    const untouched=await pg.evaluate(()=>JSON.stringify([window.__qaState.benchExperiments,window.__qaState.benchReferences,window.__qaState.benchInvestigations]));
    await panel('lever').getByRole('button',{name:'Apply suggested setting',exact:true}).focus(); await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-leverLoadArm');
    await open(saved('lever').locator('[data-ml-design-compare=lever]'),true);
    check(await comparisonNumbers(live('lever'),[200,1,200],[100,2,200]),
      'A proposed revision shows −100 N effort, +1 m hand travel and zero work change');
    await capture('desktop-live-comparison',saved('lever').locator('[data-ml-design-compare=lever]'));
    await limits('lever',80,2);
    check(await live('lever').getAttribute('data-same-limits')==='false'&&
      await live('lever').locator('[data-ml-design-common-fit=before]').getAttribute('data-fit')==='false'&&
      await live('lever').locator('[data-ml-design-common-fit=after]').getAttribute('data-fit')==='true'&&
      await live('lever').locator('[data-ml-design-own-fit=after]').getAttribute('data-fit')==='false'&&
      await panel('lever').locator('[data-ml-design-fit]').getAttribute('data-ml-design-fit')==='false'&&
      await comparisonNumbers(live('lever'),[200,1,200],[100,2,200]),
      'Edited limits keep the saved-limit comparison separate from the failing current-limit assessment');
    await pg.setViewportSize({width:390,height:1100});
    await capture('phone-changed-limits',saved('lever').locator('[data-ml-design-compare=lever]'));
    await pg.locator('#ml-design-force-lever').fill('');
    check((await panel('lever').getByRole('status').first().textContent()).includes('Enter a positive value')&&
      await pg.locator('#ml-design-force-lever').getAttribute('aria-invalid')==='true'&&
      await saved('lever').locator('[data-ml-design-compare-unavailable]').isVisible()&&await live('lever').count()===0&&
      await pg.evaluate(first=>JSON.stringify(window.__qaState.benchDesignRecords.lever)===JSON.stringify(first),first),
      'An invalid current limit replaces live comparison with guidance and preserves the saved design');
    await limits('lever',100,3); await record('lever',true);
    check(await pg.evaluate(first=>{const r=window.__qaState.benchDesignRecords.lever;return r.settings.leverLoadArm===0.5&&JSON.stringify(r.previous)===JSON.stringify(first)&&!r.previous.previous;},first),
      'Explicit replacement retains exactly the prior design core and its explanation');
    await pg.locator('#ml-design-note-lever').fill(revisedNote);
    await open(revision('lever'),true);
    const fixedRevision=revision('lever').locator('[data-ml-design-comparison=revision]');
    check(await comparisonNumbers(fixedRevision,[200,1,200],[100,2,200])&&
      (await revision('lever').textContent()).includes(failedNote)&&
      await revision('lever').locator('textarea,input').evaluateAll(els=>els.every(el=>el.readOnly||el.disabled)),
      'Revision review compares the two frozen designs and keeps the previous explanation read only');
    const pair=await pg.evaluate(()=>window.__qaState.benchDesignRecords.lever);
    await mount('lever',320,{dark:true},{...preserved,...pair.settings,benchDesignRecords:{lever:pair},benchDesignLimits:{lever:{force:'100',travel:'3',control:'leverLoadArm'}}});
    await open(panel('lever')); await open(revision('lever'),true);
    await capture('dark-phone-revision',revision('lever'));
    await pg.locator('#ml-leverEffortArm').fill('1');
    await saved('lever').getByRole('button',{name:/Open.*work record/}).click();
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const work=pg.locator('[data-ml-design-record-station=lever]');
    await open(work.locator('[data-ml-design-revision=lever]'),true);
    check(await work.locator('[data-ml-design-revision=lever] > summary').evaluate(el=>{
      const style=getComputedStyle(el);return el===document.activeElement&&el.matches(':focus-visible')&&style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0;
    }),'Work-record revision summary retains a visible native keyboard focus outline');
    check((await work.textContent()).includes(failedNote)&&await pg.locator('#ml-record-design-note-lever').inputValue()===revisedNote,
      'The work record contains both fixed designs and their independent explanations');
    const finalNote=revisedNote+'\nThe extra travel explains the lower force.';
    await pg.locator('#ml-record-design-note-lever').fill(finalNote); await pg.locator('#ml-record-design-note-lever').press('End'); await pg.locator('#ml-record-design-note-lever').press('!');
    const editedNote=finalNote+'!';
    check(await pg.locator('#ml-record-design-note-lever').inputValue()===editedNote&&
      await pg.evaluate(([note,previousNote])=>window.__qaState.benchDesignRecords.lever.note===note&&window.__qaState.benchDesignRecords.lever.previous.note===previousNote,[editedNote,failedNote]),
      'Current explanation edits keep focus and leave the prior explanation unchanged');
    const downloadPromise=pg.waitForEvent('download'); await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloadPromise; const textRecord=fs.readFileSync(await download.path(),'utf8');
    await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(textRecord.indexOf('My explanation: '+editedNote)<textRecord.indexOf('Previous design: Lever')&&
      textRecord.indexOf('Previous explanation: '+failedNote)>textRecord.indexOf('Previous design: Lever'),
      'Export associates the current explanation with the current snapshot before the previous design');
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&textRecord.includes(failedNote)&&textRecord.includes(editedNote)&&
      textRecord.includes('Previous setup does not meet both limits.')&&textRecord.includes('Recorded setup meets both limits.')&&
      textRecord.includes('Effort needed: 200 N')&&textRecord.includes('Effort needed: 100 N')&&textRecord.includes('Total hand travel: 1 m')&&textRecord.includes('Total hand travel: 2 m')&&
      textRecord.includes('Load arm: 1 m')&&textRecord.includes('Load arm: 0.5 m')&&textRecord.includes('Maximum effort force: 100 N')&&textRecord.includes('Maximum total hand travel: 3 m')&&
      textRecord.includes('Previous → Recorded.')&&textRecord.includes('Effort needed: 200 → 100 N (change: -100 N)')&&
      textRecord.includes('Total hand travel: 1 → 2 m (change: +1 m)'),
      'Native download includes both fixed snapshots, opposite fit outcomes and both explanations');
    check(!await pg.locator('a[download="machine-lab-work-record.txt"]').count(),'Temporary native-download link is removed');
    const workState=await pg.evaluate(()=>window.__qaState);
    await mount('lever',320,{contrast:true},workState); await open(pg.locator('[data-ml-design-record-station=lever] [data-ml-design-revision=lever]'),true);
    await capture('forced-colors-work-record',pg.locator('[data-ml-design-record-station=lever]'));
    await pg.getByRole('button',{name:'Review design at station — Lever',exact:true}).focus(); await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-design-note-lever');
    check(await pg.evaluate(()=>window.__qaState.leverEffortArm===1&&window.__qaState.leverLoadArm===0.5&&!window.__qaState.shopAnimating)&&
      await pg.locator('#ml-design-note-lever').inputValue()===editedNote,
      'Keyboard station review restores the explanation without loading saved geometry');
    await pg.locator('#ml-leverEffortArm').fill('2'); await pg.locator('#ml-leverLoad').fill('200'); await pg.locator('#ml-loadDistance').fill('1');
    await open(saved('lever').locator('[data-ml-design-compare=lever]'),true);
    check(await live('lever').getAttribute('data-same-task')==='false'&&Number(await live('lever').getAttribute('data-geometry-changes'))===0&&
      Number(await live('lever').locator('[data-ml-design-change=work]').getAttribute('data-delta'))===0&&
      (await live('lever').textContent()).includes('cannot be attributed to geometry alone'),
      'Equal work does not label a changed load and movement as the same task');
    check(await comparisonNumbers(live('lever'),[100,2,200],[50,4,200]),
      'Different-task comparison reports the actual changed force and travel despite equal work');
    const second=await pg.evaluate(()=>{const r=window.__qaState.benchDesignRecords.lever;return {benchId:r.benchId,settings:r.settings,limits:r.limits,control:r.control,note:r.note};});
    await record('lever',true);
    check(await pg.evaluate(second=>{const r=window.__qaState.benchDesignRecords.lever;return JSON.stringify(r.previous)===JSON.stringify(second)&&!r.previous.previous&&r.note==='';},second),
      'A third trial retains only the immediately previous design and starts a new explanation');
    check(await pg.evaluate(untouched=>JSON.stringify([window.__qaState.benchExperiments,window.__qaState.benchReferences,window.__qaState.benchInvestigations])===untouched,untouched),
      'Revision trials and work-record edits preserve separate comparison evidence, saved setup and investigation choices');
  } catch(e) {
    errors.push(String(e&&e.stack||e)); process.exitCode=1;
  } finally {
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),checks,shots,errors},null,2));
    console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors},null,2));
    if(errors.length)process.exitCode=1;
    await b.close();
  }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
