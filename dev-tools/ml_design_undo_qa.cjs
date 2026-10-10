// Native QA for bounded, deliberate-apply undo and retained design evidence.
//   node dev-tools/ml_design_undo_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
let source = fs.readFileSync(path.join(__dirname, 'ml_scene_shots.cjs'), 'utf8');
source = source.slice(0, source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-design-undo-2026-10-10/browser');")
  .replace('deviceScaleFactor: 2', 'deviceScaleFactor: 1, acceptDownloads: true')
  .replace('chromium.launch({ args:', "chromium.launch({ downloadsPath: path.join(OUT,'downloads'), args:")
  .replace('const b = await chromium.launch(', 'let b = await chromium.launch(')
  .replace('const pg = await b.newPage(', 'let pg = await b.newPage(')
  .replace('var ctx = {', 'window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks = [], shots = [];
  const fixtures = [
    {kind:'lever',key:'leverEffortArm',current:3,value:4,loadKey:'leverLoad',force:160,travel:2,extra:{leverEffortArm:3}},
    {kind:'pulley',key:'pulleySegments',current:4,value:6,loadKey:'pulleyLoad',force:200,travel:3,extra:{pulleySegments:4}},
    {kind:'windlass',key:'windlassDrumR',current:0.1,value:0.08,loadKey:'windlassLoad',force:160,travel:3,extra:{}},
    {kind:'ramp',key:'rampHeight',current:1,value:0.7,loadKey:'rampLoad',force:200,travel:3,extra:{}},
    {kind:'wedge',key:'wedgeThickness',current:0.06,value:0.05,loadKey:'wedgeLoad',force:200,travel:3,extra:{}},
    {kind:'screw',key:'screwPitch',current:0.007,value:0.005,loadKey:'screwLoad',force:20,travel:100,extra:{screwPitch:0.007}}
  ];
  const lever = {leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:0.5};
  const oldNote = 'The initial 2 m effort arm requires 200 N and 1 m hand travel.';
  const appliedNote = 'I recorded the applied 4 m effort arm: 100 N effort and 2 m hand travel.';
  const evidence = {benchId:'lever',before:{settings:lever},after:{settings:{...lever,leverEffortArm:4}},
    note:'Separate geometry investigation evidence.',investigation:{id:'lever-one-change-v1',force:'same',distance:'more'}};
  const otherUndo = {benchId:'ramp',key:'rampLength',
    before:{rampLength:3,rampHeight:1,rampLoad:400,loadDistance:0.5},
    after:{rampLength:4,rampHeight:1,rampLoad:400,loadDistance:0.5}};
  const preserved = {benchExperiments:{lever:evidence},benchReferences:{lever},
    benchInvestigations:{lever:{id:'lever-one-change-v1',force:'same',distance:'more',tested:true}},
    benchDesignRecords:{lever:{benchId:'lever',settings:lever,limits:{force:160,travel:2},control:'leverEffortArm',note:oldNote}}};
  const poseKeys = ['shopAnimating','shopMotionProgress','shopClueBench','benchPrediction','benchChoice','benchResult'];
  const stationKeys = {lever:['leverEffortArm','leverLoadArm','leverLoad','loadDistance'],
    pulley:['pulleySegments','pulleyLoad','loadDistance'],windlass:['windlassHandleR','windlassDrumR','windlassLoad','loadDistance'],
    ramp:['rampLength','rampHeight','rampLoad','loadDistance'],wedge:['wedgeLength','wedgeThickness','wedgeLoad','loadDistance'],
    screw:['screwHandleR','screwPitch','screwLoad','loadDistance']};
  function check(ok,label) { checks.push(label); if(!ok) errors.push(label); }
  function near(a,b) { return Math.abs(a-b)<1e-9; }
  function panel(kind) { return pg.locator('[data-ml-design='+kind+']'); }
  function row(kind) { return panel(kind).locator('[data-ml-design-undo='+kind+']'); }
  function undoButton(kind) { return row(kind).locator('[data-ml-design-undo-use='+kind+']'); }
  function options(kind) { return panel(kind).locator('[data-ml-design-options='+kind+']'); }
  function trials(kind) { return panel(kind).locator('[data-ml-task-trials='+kind+']'); }
  async function open(details) {
    if(!await details.evaluate(el=>el.open)) { await details.locator(':scope > summary').focus(); await pg.keyboard.press('Enter'); }
  }
  let mountedScenarios=0;
  async function mount(kind,width=1150,theme={},extra={}) {
    // SwiftShader contexts are process resources. Independent scenarios get a
    // fresh browser; in-scenario Apply/Undo, manual edits and review stay live.
    // Keep every native error observable and verify 3D readiness before acting.
    if(mountedScenarios++) {
      await b.close();
      b=await chromium.launch({downloadsPath:path.join(OUT,'downloads'),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
      pg=await b.newPage({viewport:{width,height:1100},deviceScaleFactor:1,acceptDownloads:true});
      pg.on('pageerror',e=>errors.push(String(e&&e.message||e)));
      pg.on('console',m=>{if(m.type()==='error') errors.push('console: '+m.text());});
      await pg.goto('file://'+pagePath.replace(/\\/g,'/'));
      await pg.waitForFunction(()=>window.__mlReady?.()&&window.THREE?.OrbitControls&&window.StemLab?.makeOrbitViewer&&window.StemLab?.makeVoxelBatch);
    }
    await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
    await pg.setViewportSize({width,height:1100});
    const state=S({view:'machines',bench:kind,motionPref:'off',shopMotionProgress:0.1,
      benchDesignLimits:{[kind]:{force:'5000',travel:'300'}},...preserved,...extra});
    await pg.evaluate(([s,o])=>window.__mount(s,o),[state,{band:'g68',...theme}]);
    await panel(kind).waitFor(); await open(panel(kind));
    await pg.waitForFunction(()=>{
      const canvas=document.querySelector('.ml-shop-bay canvas');
      if(!canvas||canvas.width<=0||canvas.height<=0) return false;
      const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');return gl&&!gl.isContextLost();
    });
    await pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    check(true,kind+' scenario '+mountedScenarios+': real 3D canvas is initialized before interactions');
    console.log('native scenario',mountedScenarios,kind);
  }
  async function limits(kind,force,travel) {
    await pg.locator('#ml-design-force-'+kind).fill(String(force));
    await pg.locator('#ml-design-travel-'+kind).fill(String(travel));
  }
  async function configure(fixture,width=1150,theme={},extra={}) {
    await mount(fixture.kind,width,theme,{...fixture.extra,...extra});
    await limits(fixture.kind,fixture.force,fixture.travel);
    await pg.locator('#ml-design-control-'+fixture.kind).selectOption(fixture.key);
  }
  async function use(button,key) {
    await button.focus(); await pg.keyboard.press('Enter');
    await pg.waitForFunction(id=>document.activeElement?.id===id,'ml-'+key);
  }
  async function applyChoice(fixture) {
    await open(options(fixture.kind));
    await use(options(fixture.kind).locator('[data-ml-design-use="'+fixture.value+'"]'),fixture.key);
  }
  async function applyTask(kind,type,key) {
    await open(trials(kind)); await use(trials(kind).locator('[data-ml-task-use='+type+']'),key);
  }
  async function rowMatches(kind,key,before,after) {
    return await row(kind).getAttribute('data-key')===key&&near(Number(await row(kind).getAttribute('data-before')),before)&&
      near(Number(await row(kind).getAttribute('data-after')),after)&&await row(kind).getAttribute('data-available')==='true'&&
      await row(kind).getAttribute('role')==='group'&&await row(kind).getAttribute('aria-label')==='Last applied change'&&
      await undoButton(kind).isEnabled()&&(await undoButton(kind).textContent())==='Undo last applied change'&&
      await pg.evaluate(([kind,key,before,after,keys])=>{
        const now=window.__qaState,checkpoint=now.benchDesignUndo?.[kind];
        return checkpoint&&checkpoint.benchId===kind&&checkpoint.key===key&&
          Object.keys(checkpoint).sort().join(',')==='after,before,benchId,key'&&
          Object.keys(checkpoint.before).sort().join(',')===[...keys].sort().join(',')&&
          Object.keys(checkpoint.after).sort().join(',')===[...keys].sort().join(',')&&
          keys.every(k=>checkpoint.before[k]===(k===key?before:now[k])&&checkpoint.after[k]===(k===key?after:now[k]));
      },[kind,key,before,after,stationKeys[kind]]);
  }
  async function undo(kind,key) { await use(undoButton(kind),key); }
  async function sameExcept(before,keys) {
    return pg.evaluate(([before,keys])=>{
      const now=window.__qaState;
      return Object.keys(before).every(k=>keys.includes(k)||JSON.stringify(now[k])===JSON.stringify(before[k]));
    },[before,keys]);
  }
  async function restored(kind,key,value,before) {
    return await row(kind).count()===0&&await pg.evaluate(([kind,key,value])=>{
      const now=window.__qaState;return now[key]===value&&!now.shopAnimating&&now.shopMotionProgress===0.5&&
        !now.benchDesignUndo?.[kind]&&document.activeElement?.id==='ml-'+key;
    },[kind,key,value])&&await sameExcept(before,[key,'benchDesignUndo',...poseKeys]);
  }
  async function record(kind,replace=false) {
    await use(panel(kind).getByRole('button',{name:replace?'Replace design record':'Record this design',exact:true}),
      'design-note-'+kind);
  }
  async function capture(name,kind,withFields=false) {
    const target=row(kind),button=undoButton(kind),enabled=await button.isEnabled();
    const focusTarget=enabled?button:pg.locator('#ml-design-control-'+kind);
    await focusTarget.focus(); await pg.keyboard.press('Tab'); await pg.keyboard.press('Shift+Tab'); await focusTarget.focus();
    check(await focusTarget.evaluate(el=>{
      const style=getComputedStyle(el);return el===document.activeElement&&el.matches(':focus-visible')&&style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0;
    }),name+': enabled controls retain a visible keyboard focus outline');
    check(await target.evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1&&
      Array.from(el.querySelectorAll('button')).every(child=>child.scrollWidth<=child.clientWidth+1)),
      name+': undo content and buttons fit the viewport');
    if(withFields||!enabled) {
      await target.scrollIntoViewIfNeeded();
      const field=await (withFields?pg.locator('#ml-design-force-'+kind):focusTarget).evaluate(el=>{
        const rect=el.getBoundingClientRect();return {x:rect.x+scrollX,y:rect.y+scrollY};
      });
      const box=await target.evaluate(el=>{const rect=el.getBoundingClientRect();return {x:rect.x+scrollX,y:rect.y+scrollY,width:rect.width,height:rect.height};}),y=field.y-20;
      await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:{x:Math.max(0,box.x-3),y,width:box.width+6,height:box.y+box.height-y+50}});
    } else await target.screenshot({path:path.join(OUT,name+'.png')});
    shots.push(name);
  }
  try {
    for(const fixture of fixtures) {
      await configure(fixture);
      const before=await pg.evaluate(()=>window.__qaState);
      check(await row(fixture.kind).count()===0,fixture.kind+': undo is absent before an applied design change');
      await applyChoice(fixture);
      check(await rowMatches(fixture.kind,fixture.key,fixture.current,fixture.value)&&
        await sameExcept(before,[fixture.key,'benchDesignUndo',...poseKeys]),
        fixture.kind+': geometry choice exposes an exact, enabled undo checkpoint and preserves unrelated state');
      await undo(fixture.kind,fixture.key);
      check(await restored(fixture.kind,fixture.key,fixture.current,before),
        fixture.kind+': keyboard undo restores the geometry only, consumes the checkpoint and focuses the surviving control');
      for(const type of ['load','movement']) {
        await mount(fixture.kind);
        const before=await pg.evaluate(()=>window.__qaState),key=type==='load'?fixture.loadKey:'loadDistance';
        await applyTask(fixture.kind,type,key);
        check(await rowMatches(fixture.kind,key,before[key],before[key]*2)&&await sameExcept(before,[key,'benchDesignUndo',...poseKeys]),
          fixture.kind+'/'+type+': a doubled task creates the correct one-condition checkpoint without disturbing records');
        await undo(fixture.kind,key);
        check(await restored(fixture.kind,key,before[key],before),
          fixture.kind+'/'+type+': keyboard undo restores the original task only and follows focus after the row disappears');
      }
    }
    await pg.locator('.ml-shop-bay canvas').waitFor();
    check(await pg.locator('.ml-shop-bay canvas').evaluate(el=>el.width>0&&el.height>0),'Native undo scenarios use the real THREE workshop canvas');

    await mount('lever',1150,{}, {benchDesignUndo:{ramp:otherUndo}}); await limits('lever',160,2);
    await use(panel('lever').getByRole('button',{name:'Apply suggested setting',exact:true}),'leverEffortArm');
    check(await rowMatches('lever','leverEffortArm',2,2.5),'Nearest working suggestion creates the same bounded undo as alternatives and task trials');
    await pg.locator('#ml-design-control-lever').selectOption('leverLoadArm'); await limits('lever',220,1.75);
    await pg.locator('#ml-design-note-lever').fill(oldNote+' New writing after applying the suggestion.');
    const edited=await pg.evaluate(()=>window.__qaState);
    check(await undoButton('lever').isEnabled(),'Changing search control, limits and explanation leaves physical undo available');
    await undo('lever','leverEffortArm');
    check(await restored('lever','leverEffortArm',2,edited)&&
      await pg.evaluate(original=>JSON.stringify(window.__qaState.benchDesignUndo.ramp)===JSON.stringify(original),otherUndo),
      'Undo preserves newer limits, selected search control, explanation and another station checkpoint');

    await configure(fixtures[0]); await applyChoice(fixtures[0]); await capture('desktop-active-undo','lever');
    await configure(fixtures[0],390); await applyChoice(fixtures[0]);
    await pg.locator('#ml-design-force-lever').fill('');
    check(await undoButton('lever').isEnabled()&&await pg.locator('#ml-design-force-lever').getAttribute('aria-invalid')==='true'&&await trials('lever').count()===0,
      'A blank limit retains undo while removing unrelated actionable trial previews');
    await capture('phone-invalid-limits-undo','lever',true);
    const invalid=await pg.evaluate(()=>window.__qaState); await undo('lever','leverEffortArm');
    check(await restored('lever','leverEffortArm',3,invalid)&&await pg.locator('#ml-design-force-lever').inputValue()==='',
      'Undo works with an invalid limit draft and retains the blank field exactly');

    await configure(fixtures[0],320,{dark:true}); await applyChoice(fixtures[0]);
    await pg.locator('#ml-leverLoadArm').fill('1.1');
    check(await undoButton('lever').isDisabled()&&await row('lever').getAttribute('data-available')==='false'&&
      await undoButton('lever').evaluate(el=>!!el.getAttribute('aria-describedby')&&
        el.getAttribute('aria-describedby').split(/\s+/).every(id=>document.getElementById(id)?.textContent.trim())),
      'Newer physical changes disable undo and connect a visible explanation to its button');
    const drifted=await pg.evaluate(()=>window.__qaState); await undoButton('lever').dispatchEvent('click');
    check(await sameExcept(drifted,[]),'A click dispatched on disabled undo cannot overwrite newer physical changes');
    await capture('dark-manual-drift-undo','lever');
    await pg.locator('#ml-leverLoadArm').fill('1');
    check(await undoButton('lever').isEnabled(),'Returning the complete station setup to the applied state enables undo again');
    const reenabled=await pg.evaluate(()=>window.__qaState);
    await undo('lever','leverEffortArm');
    check(await restored('lever','leverEffortArm',3,reenabled),
      'Re-enabled undo restores the original geometry and returns keyboard focus');

    await configure(fixtures[0],320,{contrast:true}); await applyChoice(fixtures[0]); await capture('forced-colors-active-undo','lever');
    await applyTask('lever','load','leverLoad');
    check(await rowMatches('lever','leverLoad',400,800)&&await pg.evaluate(()=>{
      const checkpoint=window.__qaState.benchDesignUndo.lever;
      return Object.keys(checkpoint).sort().join(',')==='after,before,benchId,key'&&checkpoint.before.leverEffortArm===4&&checkpoint.after.leverEffortArm===4;
    }),'A second Apply replaces the checkpoint without accumulating a history stack');
    const second=await pg.evaluate(()=>window.__qaState); await undo('lever','leverLoad');
    check(await restored('lever','leverLoad',400,second)&&await pg.evaluate(()=>window.__qaState.leverEffortArm===4),
      'One-step undo reverses only the latest task change and leaves the earlier applied geometry in place');

    await mount('lever'); await limits('lever',160,2); await open(options('lever'));
    await use(options('lever').locator('[data-ml-design-use="4"]'),'leverEffortArm');
    await record('lever',true); await pg.locator('#ml-design-note-lever').fill(appliedNote);
    const fixed=await pg.evaluate(()=>window.__qaState.benchDesignRecords.lever);
    await undo('lever','leverEffortArm');
    check(await pg.evaluate(fixed=>JSON.stringify(window.__qaState.benchDesignRecords.lever)===JSON.stringify(fixed)&&
      window.__qaState.leverEffortArm===2,fixed),'Undo leaves a just-recorded applied design and its prior revision fixed');
    await pg.locator('#ml-leverEffortArm').fill('3');
    await panel('lever').getByRole('button',{name:'Open work record',exact:true}).click();
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const work=pg.locator('[data-ml-design-record-station=lever]'); await open(work.locator('[data-ml-design-revision=lever]'));
    check((await work.textContent()).includes(oldNote)&&await pg.locator('#ml-record-design-note-lever').inputValue()===appliedNote,
      'Work record retains both fixed explanations after undo and another live geometry edit');
    const downloadPromise=pg.waitForEvent('download'); await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloadPromise,textRecord=fs.readFileSync(await download.path(),'utf8');
    await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&textRecord.includes(oldNote)&&textRecord.includes(appliedNote)&&
      textRecord.includes('Effort needed: 200 N')&&textRecord.includes('Effort needed: 100 N')&&
      textRecord.includes('Total hand travel: 1 m')&&textRecord.includes('Total hand travel: 2 m')&&
      textRecord.includes('Effort arm: 2 m')&&textRecord.includes('Effort arm: 4 m')&&!textRecord.includes('Effort arm: 3 m')&&
      textRecord.indexOf('My explanation: '+appliedNote)<textRecord.indexOf('Previous design: Lever'),
      'Native export retains both recorded geometries, force/travel measurements and attributed notes after undo/live edits');
    check(await pg.evaluate(preserved=>['benchExperiments','benchReferences','benchInvestigations'].every(k=>
      JSON.stringify(window.__qaState[k])===JSON.stringify(preserved[k])),preserved),'Undo and explicit revision recording preserve separate investigation evidence');
    await pg.getByRole('button',{name:'Review design at station — Lever',exact:true}).focus(); await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-design-note-lever');
    check(await pg.evaluate(()=>window.__qaState.leverEffortArm===3)&&await row('lever').count()===0&&
      await pg.locator('#ml-design-note-lever').inputValue()===appliedNote,'Keyboard station review preserves the newer live setup, fixed explanation and consumed undo state');
  } catch(e) { errors.push(String(e&&e.stack||e)); process.exitCode=1; }
  finally {
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),checks,shots,errors},null,2));
    console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors:errors.map(error=>error.slice(0,500))},null,2));
    if(errors.length) process.exitCode=1; await b.close();
  }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
