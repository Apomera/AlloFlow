// Native QA for legal task capacity, independent boundaries and retained design evidence.
//   node dev-tools/ml_task_capacity_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
// Keep Chromium scratch files in the same explicitly writable QA output tree.
// Shared Windows temporary directories can cancel otherwise valid blob downloads.
const browserTemp=path.resolve(process.argv[2] || 'reports/machinelab-task-capacity-2026-10-10/browser','browser-temp');
fs.mkdirSync(browserTemp,{recursive:true}); process.env.TEMP=browserTemp; process.env.TMP=browserTemp;
let source = fs.readFileSync(path.join(__dirname, 'ml_scene_shots.cjs'), 'utf8');
source = source.slice(0, source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-task-capacity-2026-10-10/browser');")
  .replace('deviceScaleFactor: 2', 'deviceScaleFactor: 1, acceptDownloads: true')
  .replace('chromium.launch({ args:', "chromium.launch({ downloadsPath: path.join(OUT,'downloads'), args:")
  .replace('const b = await chromium.launch(', 'let b = await chromium.launch(')
  .replace('const pg = await b.newPage(', 'let pg = await b.newPage(')
  .replace('var ctx = {', 'window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks = [], shots = [];
  // Independent ideal ratios and legal slider values; never call __mlMath.
  const fixtures = [
    {kind:'lever',key:'leverLoad',load:400,ma:2,value:800,step:10,max:1000},
    {kind:'pulley',key:'pulleyLoad',load:400,ma:2,value:800,step:10,max:1000},
    {kind:'windlass',key:'windlassLoad',load:400,ma:0.45/0.1,value:800,step:10,max:1000},
    {kind:'ramp',key:'rampLoad',load:400,ma:4,value:800,step:10,max:1000},
    {kind:'wedge',key:'wedgeLoad',load:800,ma:0.3/0.06,value:1600,step:10,max:2000},
    {kind:'screw',key:'screwLoad',load:2000,ma:2*Math.PI*0.15/0.005,value:4000,step:50,max:5000}
  ];
  const lever={leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:0.5};
  const oldNote='The 400 N load needs 200 N effort and 1 m of hand travel.';
  const newNote='The largest legal load is 600 N: 300 N effort, 1 m hand travel and 300 J work.';
  const evidence={benchId:'lever',before:{settings:lever},after:{settings:{...lever,leverEffortArm:4}},
    note:'Separate geometry investigation evidence.',investigation:{id:'lever-one-change-v1',force:'same',distance:'more'}};
  const preserved={benchExperiments:{lever:evidence},benchReferences:{lever},
    benchInvestigations:{lever:{id:'lever-one-change-v1',force:'same',distance:'more',tested:true}},
    benchDesignRecords:{lever:{benchId:'lever',settings:lever,limits:{force:5000,travel:300},control:'leverEffortArm',note:oldNote}}};
  const poseKeys=['shopAnimating','shopMotionProgress','shopClueBench','benchPrediction','benchChoice','benchResult'];
  function check(ok,label) { checks.push(label); if(!ok) errors.push(label); }
  function near(a,b) { return Math.abs(a-b)<1e-7; }
  function panel(kind) { return pg.locator('[data-ml-design='+kind+']'); }
  function trials(kind) { return panel(kind).locator('[data-ml-task-trials='+kind+']'); }
  function capacity(kind) { return trials(kind).locator('[data-ml-task-capacity='+kind+']'); }
  function card(kind,type) { return capacity(kind).locator('[data-ml-capacity-kind='+type+']'); }
  function useButton(kind,type) { return card(kind,type).locator('[data-ml-capacity-use='+type+']'); }
  async function open(details) {
    if(!await details.evaluate(el=>el.open)) { await details.locator(':scope > summary').focus(); await pg.keyboard.press('Enter'); }
  }
  let mountedScenarios=0;
  async function mount(kind,width=1150,theme={},extra={}) {
    // SwiftShader contexts are process resources. Each independent scenario
    // gets a fresh browser; paired Apply/Undo actions remain in the same page.
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
    check(true,kind+' scenario '+mountedScenarios+': real THREE canvas initialized before interactions');
    console.log('native scenario',mountedScenarios,kind);
  }
  async function limits(kind,force,travel) {
    await pg.locator('#ml-design-force-'+kind).fill(String(force));
    await pg.locator('#ml-design-travel-'+kind).fill(String(travel));
  }
  async function use(button,key) {
    await button.focus(); await pg.keyboard.press('Enter');
    await pg.waitForFunction(id=>document.activeElement?.id===id,'ml-'+key);
  }
  async function apply(kind,type,key) { await use(useButton(kind,type),key); }
  async function undo(kind,key) { await use(panel(kind).locator('[data-ml-design-undo-use='+kind+']'),key); }
  async function sameExcept(before,keys) {
    return pg.evaluate(([before,keys])=>Object.keys(before).every(k=>keys.includes(k)||
      JSON.stringify(window.__qaState[k])===JSON.stringify(before[k])),[before,keys]);
  }
  async function matches(fixture,type,value,boundary,nextValue) {
    const target=card(fixture.kind,type),load=fixture.load,ma=fixture.ma;
    const metrics=await target.locator('[data-ml-capacity-metric]').evaluateAll(els=>Object.fromEntries(els.map(el=>[
      el.getAttribute('data-ml-capacity-metric'),{before:Number(el.getAttribute('data-before')),after:Number(el.getAttribute('data-after'))}])));
    const changedLoad=type==='load'?value:load,changedMovement=type==='movement'?value:0.5;
    const expected={force:[load/ma,changedLoad/ma],travel:[0.5*ma,changedMovement*ma],work:[load*0.5,changedLoad*changedMovement]};
    const nextLoad=type==='load'?nextValue:load,nextMovement=type==='movement'?nextValue:0.5;
    return Object.keys(expected).every(key=>metrics[key]&&near(metrics[key].before,expected[key][0])&&near(metrics[key].after,expected[key][1]))&&
      await target.getAttribute('data-key')===(type==='load'?fixture.key:'loadDistance')&&
      near(Number(await target.getAttribute('data-value')),value)&&await target.getAttribute('data-available')==='true'&&
      await target.getAttribute('data-current')==='false'&&await target.getAttribute('data-boundary')===boundary&&
      near(Number(await target.getAttribute('data-next-value')),nextValue)&&
      near(Number(await target.getAttribute('data-next-force')),nextLoad/ma)&&
      near(Number(await target.getAttribute('data-next-travel')),nextMovement*ma)&&
      await target.getAttribute('role')==='group'&&!!await target.getAttribute('aria-label');
  }
  async function unavailable(kind,type,boundary) {
    const target=card(kind,type),button=useButton(kind,type),before=await pg.evaluate(()=>window.__qaState);
    const result=await target.getAttribute('data-available')==='false'&&await target.getAttribute('data-boundary')===boundary&&
      await button.isDisabled()&&await button.evaluate(el=>!!el.getAttribute('aria-describedby')&&
        el.getAttribute('aria-describedby').split(/\s+/).every(id=>document.getElementById(id)?.textContent.trim()));
    await button.dispatchEvent('click'); return result&&await sameExcept(before,[]);
  }
  async function capture(name,kind) {
    const target=capacity(kind),focusTarget=target.locator('button:enabled').first();
    await focusTarget.focus(); await pg.keyboard.press('Tab'); await pg.keyboard.press('Shift+Tab'); await focusTarget.focus();
    check(await focusTarget.evaluate(el=>{const style=getComputedStyle(el);return el===document.activeElement&&
      el.matches(':focus-visible')&&style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0;}),name+': capacity action has a visible keyboard focus outline');
    check(await target.evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1&&
      Array.from(el.querySelectorAll('[data-ml-capacity-kind],button')).every(child=>child.scrollWidth<=child.clientWidth+1)),
      name+': task capacity, cards and buttons wrap within the viewport');
    await target.scrollIntoViewIfNeeded();
    const box=await target.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:{x:Math.max(0,box.x-3),y:Math.max(0,box.y-3),width:box.width+6,height:box.height+6}});
    shots.push(name);
  }
  async function record(kind,replace=false) {
    await use(panel(kind).getByRole('button',{name:replace?'Replace design record':'Record this design',exact:true}),'design-note-'+kind);
  }
  try {
    for(const fixture of fixtures) {
      const dark=fixture.kind==='screw';
      await mount(fixture.kind,dark?320:1150,dark?{dark:true}:{});
      await limits(fixture.kind,(fixture.value+fixture.step/4)/fixture.ma,0.85*fixture.ma);
      const before=await pg.evaluate(()=>window.__qaState);
      check(!await trials(fixture.kind).evaluate(el=>el.open),fixture.kind+': capacity starts inside the existing closed task disclosure');
      await open(trials(fixture.kind));
      check(await capacity(fixture.kind).getAttribute('role')==='group'&&await capacity(fixture.kind).getAttribute('aria-label')==='Find a task that fits',
        fixture.kind+': task capacity is exposed as a named group');
      check(await sameExcept(before,[]),fixture.kind+': opening task capacity leaves state unchanged');
      if(fixture.kind==='lever') await capture('desktop-task-capacity','lever');
      if(dark) await capture('dark-phone-screw-capacity','screw');
      for(const type of ['load','movement']) {
        const key=type==='load'?fixture.key:'loadDistance',value=type==='load'?fixture.value:0.8;
        check(await matches(fixture,type,value,type==='load'?'force':'travel',type==='load'?fixture.value+fixture.step:0.9),
          fixture.kind+'/'+type+': independent full-precision metrics and the next failing legal step prove the maximum');
        const prior=await pg.evaluate(()=>window.__qaState);
        await apply(fixture.kind,type,key);
        check(await pg.evaluate(([kind,key,value,old])=>{
          const now=window.__qaState,c=now.benchDesignUndo?.[kind];
          return now[key]===value&&!now.shopAnimating&&now.shopMotionProgress===0.5&&document.activeElement?.id==='ml-'+key&&
            c?.key===key&&c.before[key]===old&&c.after[key]===value;
        },[fixture.kind,key,value,prior[key]])&&await sameExcept(prior,[key,'benchDesignUndo',...poseKeys]),
          fixture.kind+'/'+type+': keyboard Apply changes only the selected task, creates exact undo and focuses its control');
        check(await card(fixture.kind,type).getAttribute('data-current')==='true'&&await useButton(fixture.kind,type).isDisabled(),
          fixture.kind+'/'+type+': already-current capacity is identified and cannot be reapplied');
        await undo(fixture.kind,key);
        check(await pg.evaluate(([kind,key,old])=>window.__qaState[key]===old&&!window.__qaState.benchDesignUndo?.[kind]&&
          document.activeElement?.id==='ml-'+key,[fixture.kind,key,prior[key]])&&await sameExcept(prior,['benchDesignUndo',...poseKeys]),
          fixture.kind+'/'+type+': keyboard Undo restores the exact task and preserves all records, writing and evidence');
      }
    }

    await mount('lever',390); await limits('lever',160,1.5); await open(trials('lever'));
    check(await card('lever','load').getAttribute('data-value')==='320'&&await card('lever','load').getAttribute('data-boundary')==='force',
      'Over-limit current task receives a lower, legal 320 N load that fits');
    check(await unavailable('lever','movement','held-force'),'Movement capacity explains held force prevents a fit and disabled activation changes nothing');
    await capture('phone-constrained-task-capacity','lever');
    await apply('lever','load','leverLoad'); await undo('lever','leverLoad');
    check(await pg.evaluate(()=>window.__qaState.leverLoad===400),'Undo restores an originally over-limit task exactly');
    await limits('lever',300,0.8);
    check(await unavailable('lever','load','held-travel'),'Load capacity explains held travel prevents a fit and disabled activation changes nothing');
    check(await card('lever','movement').getAttribute('data-value')==='0.4'&&await card('lever','movement').getAttribute('data-boundary')==='travel',
      'Shortening movement to 0.4 m restores travel feasibility without changing the load');
    await limits('lever',1,3);
    check(await unavailable('lever','load','minimum'),'Load below the minimum legal step reports no available capacity');
    await limits('lever',300,0.1);
    check(await unavailable('lever','movement','minimum'),'Travel budget below minimum legal movement reports no available capacity');
    await pg.locator('#ml-design-force-lever').fill('');
    check(await trials('lever').count()===0&&await pg.locator('#ml-design-force-lever').getAttribute('aria-invalid')==='true',
      'Blank invalid limits remove actionable capacity previews and mark their field invalid');
    await limits('lever',5001,3);
    check(await trials('lever').count()===0&&await pg.locator('#ml-design-force-lever').getAttribute('aria-invalid')==='true',
      'Out-of-range force limits remove task capacity previews');

    await mount('lever',320,{contrast:true}); await open(trials('lever'));
    check(await card('lever','load').getAttribute('data-value')==='1000'&&await card('lever','movement').getAttribute('data-value')==='3'&&
      await card('lever','load').getAttribute('data-boundary')==='range'&&await card('lever','movement').getAttribute('data-boundary')==='range'&&
      await card('lever','load').getAttribute('data-next-value')===null&&await card('lever','movement').getAttribute('data-next-value')===null,
      'Generous limits stop capacity at each slider maximum with no invented next legal step');
    await capture('forced-colors-task-capacity','lever');

    await mount('lever',1150,{}, {leverLoad:402,loadDistance:0.125}); await limits('lever',300,1.5); await open(trials('lever'));
    check(await card('lever','load').getAttribute('data-value')==='600'&&await card('lever','movement').getAttribute('data-value')==='0.7',
      'Imported between-step current values receive legal candidates anchored to slider minimum');
    for(const [type,key,original] of [['load','leverLoad',402],['movement','loadDistance',0.125]]) {
      await apply('lever',type,key); await undo('lever',key);
      check(await pg.evaluate(([key,original])=>window.__qaState[key]===original,[key,original]),
        'Off-grid '+type+' is restored exactly by Undo after legal capacity application');
    }

    await mount('lever'); await limits('lever',300,1.5); await open(trials('lever'));
    const fixed=await pg.evaluate(()=>window.__qaState.benchDesignRecords.lever);
    await apply('lever','load','leverLoad');
    check(await pg.evaluate(fixed=>JSON.stringify(window.__qaState.benchDesignRecords.lever)===JSON.stringify(fixed),fixed)&&
      await pg.locator('#ml-design-note-lever').inputValue()===oldNote,'Capacity Apply preserves the fixed design and its existing explanation');
    await record('lever',true); await pg.locator('#ml-design-note-lever').fill(newNote);
    const recorded=await pg.evaluate(()=>window.__qaState.benchDesignRecords.lever);
    await undo('lever','leverLoad');
    check(await pg.evaluate(recorded=>JSON.stringify(window.__qaState.benchDesignRecords.lever)===JSON.stringify(recorded)&&
      window.__qaState.leverLoad===400,recorded),'Undo preserves the newly recorded capacity design, prior revision and both notes');
    await open(trials('lever')); await apply('lever','movement','loadDistance'); await undo('lever','loadDistance');
    await panel('lever').getByRole('button',{name:'Open work record',exact:true}).click();
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const work=pg.locator('[data-ml-design-record-station=lever]'); await open(work.locator('[data-ml-design-revision=lever]'));
    check((await work.textContent()).includes(oldNote)&&await pg.locator('#ml-record-design-note-lever').inputValue()===newNote,
      'Work record retains both fixed explanations after capacity Apply and Undo');
    fs.mkdirSync(path.join(OUT,'downloads'),{recursive:true});
    const downloadPromise=pg.waitForEvent('download'); await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloadPromise,downloadFailure=await download.failure();
    if(downloadFailure) throw new Error('Native work-record download failed: '+downloadFailure);
    const textRecord=fs.readFileSync(await download.path(),'utf8');
    await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&textRecord.includes(oldNote)&&textRecord.includes(newNote)&&
      textRecord.includes('Effort needed: 200 N')&&textRecord.includes('Effort needed: 300 N')&&textRecord.includes('Total hand travel: 1 m')&&
      textRecord.includes('Task work: 200 J')&&textRecord.includes('Task work: 300 J')&&!textRecord.includes('Task work: 280 J')&&
      textRecord.indexOf('My explanation: '+newNote)<textRecord.indexOf('Previous design: Lever'),
      'Native download retains both fixed tasks, ideal force/travel/work and attributed notes after live capacity changes');
    check(await pg.evaluate(preserved=>['benchExperiments','benchReferences','benchInvestigations'].every(k=>
      JSON.stringify(window.__qaState[k])===JSON.stringify(preserved[k])),preserved),'Capacity, revision recording and Undo preserve separate investigation evidence');
    await pg.getByRole('button',{name:'Review design at station — Lever',exact:true}).focus(); await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-design-note-lever');
    check(await pg.evaluate(()=>window.__qaState.leverLoad===400&&window.__qaState.loadDistance===0.5)&&
      await pg.locator('#ml-design-note-lever').inputValue()===newNote,'Keyboard review preserves the restored live task and focuses the fixed design explanation');
  } catch(e) { errors.push(String(e&&e.stack||e)); process.exitCode=1; }
  finally {
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),checks,shots,errors},null,2));
    console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors:errors.map(error=>error.slice(0,500))},null,2));
    if(errors.length) process.exitCode=1; await b.close();
  }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
