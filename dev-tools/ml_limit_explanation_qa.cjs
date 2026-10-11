// Native QA for the derived Read the limits explanation and its existing design workflow.
//   node dev-tools/ml_limit_explanation_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
// Keep Chromium scratch and native downloads in an explicitly writable QA tree.
const browserTemp=path.resolve(process.argv[2] || 'reports/machinelab-limit-explanation-2026-10-10/browser','browser-temp');
fs.mkdirSync(browserTemp,{recursive:true}); process.env.TEMP=browserTemp; process.env.TMP=browserTemp;
let source = fs.readFileSync(path.join(__dirname, 'ml_scene_shots.cjs'), 'utf8');
source = source.slice(0, source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-limit-explanation-2026-10-10/browser');")
  .replace('deviceScaleFactor: 2', 'deviceScaleFactor: 1, acceptDownloads: true')
  .replace('chromium.launch({ args:', "chromium.launch({ downloadsPath: path.join(OUT,'downloads'), args:")
  .replace('const b = await chromium.launch(', 'let b = await chromium.launch(')
  .replace('const pg = await b.newPage(', 'let pg = await b.newPage(')
  .replace('var ctx = {', 'window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks = [], shots = [];
  // Independent ideal physics; this QA never calls the tool's exposed math.
  const fixtures = [
    {kind:'lever',load:400,ma:2}, {kind:'pulley',load:400,ma:2},
    {kind:'windlass',load:400,ma:0.45/0.1}, {kind:'ramp',load:400,ma:4},
    {kind:'wedge',load:800,ma:0.3/0.06}, {kind:'screw',load:2000,ma:2*Math.PI*0.15/0.005}
  ];
  const lever={leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:0.5};
  const savedNote='My fixed design needs 200 N effort and 1 m of hand travel for 200 J of work.';
  const evidence={benchId:'lever',before:{settings:lever},after:{settings:{...lever,leverEffortArm:4}},
    note:'Separate geometry investigation evidence.',investigation:{id:'lever-one-change-v1',force:'same',distance:'more'}};
  const preserved={benchExperiments:{lever:evidence},benchReferences:{lever},
    benchInvestigations:{lever:{id:'lever-one-change-v1',force:'same',distance:'more',tested:true}},
    benchDesignRecords:{lever:{benchId:'lever',settings:lever,limits:{force:250,travel:1.25},control:'leverEffortArm',note:savedNote}}};
  const poseKeys=['shopAnimating','shopMotionProgress','shopClueBench','benchPrediction','benchChoice','benchResult'];
  function check(ok,label) { checks.push(label); if(!ok) errors.push(label); }
  function near(a,b) { return Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b)); }
  // Chromium serializes CSS percentages with limited decimal precision. Keep
  // this tolerance separate from the full-precision physics assertions above.
  function nearCssPercent(a,b) { return Math.abs(a-b)<=0.0001; }
  function panel(kind) { return pg.locator('[data-ml-design='+kind+']'); }
  function explanation(kind) { return panel(kind).locator('[data-ml-limit-explanation='+kind+']'); }
  function budget(kind,type) { return explanation(kind).locator('[data-ml-limit-budget='+type+']'); }
  async function open(details) {
    if(!await details.evaluate(el=>el.open)) { await details.locator(':scope > summary').focus(); await pg.keyboard.press('Enter'); }
  }
  let mountedScenarios=0;
  async function mount(kind,width=1150,theme={},extra={}) {
    // Independent scenarios release their SwiftShader process resources.
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
    if(theme.band!=='k2'&&theme.band!=='g35') { await panel(kind).waitFor(); await open(panel(kind)); }
    await pg.waitForFunction(()=>{
      const canvas=document.querySelector('.ml-shop-bay canvas');
      if(!canvas||canvas.width<=0||canvas.height<=0) return false;
      const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');return gl&&!gl.isContextLost();
    });
    await pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    check(true,kind+' scenario '+mountedScenarios+': real THREE canvas initialized');
    console.log('native scenario',mountedScenarios,kind);
  }
  async function limits(kind,force,travel) {
    await pg.locator('#ml-design-force-'+kind).fill(String(force));
    await pg.locator('#ml-design-travel-'+kind).fill(String(travel));
  }
  async function sameExcept(before,keys=[]) {
    return pg.evaluate(([before,keys])=>Object.keys(before).every(k=>keys.includes(k)||
      JSON.stringify(window.__qaState[k])===JSON.stringify(before[k]))&&
      Object.keys(window.__qaState).every(k=>keys.includes(k)||Object.prototype.hasOwnProperty.call(before,k)),[before,keys]);
  }
  async function demand(kind,type,value,limit,state) {
    const target=budget(kind,type),actual=await target.evaluate(el=>({
      value:Number(el.dataset.value),limit:Number(el.dataset.limit),percent:Number(el.dataset.percent),
      margin:Number(el.dataset.margin),state:el.dataset.state,role:el.getAttribute('role'),name:el.getAttribute('aria-label')
    }));
    check(near(actual.value,value)&&near(actual.limit,limit)&&near(actual.percent,value/limit*100)&&
      near(actual.margin,limit-value)&&actual.state===state,
      kind+'/'+type+': full-precision demand, limit, uncapped percent and signed margin agree with independent physics ('+state+')');
    check(actual.role==='group'&&!!actual.name,kind+'/'+type+': comparison is an explicitly named group');
    const bars=await target.locator('[data-ml-limit-bar]').evaluateAll(els=>els.map(el=>({
      kind:el.getAttribute('data-ml-limit-bar'),width:parseFloat(el.style.width),hidden:!!el.closest('[aria-hidden="true"]')
    })));
    check(bars.length===2&&bars.every(x=>x.hidden&&x.width>=0&&x.width<=100)&&
      nearCssPercent(bars.find(x=>x.kind==='current')?.width,value/Math.max(value,limit)*100)&&
      nearCssPercent(bars.find(x=>x.kind==='limit')?.width,limit/Math.max(value,limit)*100),
      kind+'/'+type+': decorative current and limit bars share a bounded scale without truncating the reported percentage');
  }
  async function direction(kind,expected) {
    const target=explanation(kind).locator('[data-ml-limit-direction]');
    check(await target.getAttribute('data-ml-limit-direction')===expected&&!!(await target.textContent()).trim(),
      kind+': explanation describes the '+expected+' case');
  }
  async function capture(name,kind) {
    const target=explanation(kind),summary=target.locator(':scope > summary');
    await summary.focus(); await pg.keyboard.press('Tab'); await pg.keyboard.press('Shift+Tab'); await summary.focus();
    check(await summary.evaluate(el=>{const style=getComputedStyle(el);return el===document.activeElement&&
      el.matches(':focus-visible')&&style.outlineStyle!=='none'&&parseFloat(style.outlineWidth)>0;}),
      name+': native Read the limits summary has visible keyboard focus');
    check(await target.evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1&&
      Array.from(el.querySelectorAll('[data-ml-limit-budget],summary')).every(child=>child.scrollWidth<=child.clientWidth+1)),
      name+': explanation and comparison cards fit the viewport');
    await target.scrollIntoViewIfNeeded();
    const box=await target.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,
      clip:{x:Math.max(0,box.x-3),y:Math.max(0,box.y-3),width:box.width+6,height:box.height+6}});
    shots.push(name);
  }
  async function use(button,key) {
    await button.focus(); await pg.keyboard.press('Enter');
    await pg.waitForFunction(id=>document.activeElement?.id===id,'ml-'+key);
  }
  try {
    for(const fixture of fixtures) {
      const force=fixture.load/fixture.ma,travel=0.5*fixture.ma;
      await mount(fixture.kind); await limits(fixture.kind,force*1.25,travel*1.25);
      const target=explanation(fixture.kind),before=await pg.evaluate(()=>window.__qaState);
      check(!await target.evaluate(el=>el.open)&&await target.locator(':scope > summary').textContent()==='Read the limits',
        fixture.kind+': explanation starts as a closed, named native disclosure');
      await open(target);
      check(await sameExcept(before),fixture.kind+': opening the explanation does not write or alter state');
      await demand(fixture.kind,'force',force,force*1.25,'below');
      await demand(fixture.kind,'travel',travel,travel*1.25,'below');
      const formulas=await target.locator('[data-ml-limit-formula]').evaluateAll(els=>els.map(el=>({kind:el.getAttribute('data-ml-limit-formula'),text:el.textContent})));
      check(formulas.length===2&&formulas.some(x=>x.kind==='force'&&x.text.includes('÷'))&&
        formulas.some(x=>x.kind==='travel'&&x.text.includes('×')),fixture.kind+': both visible force and travel relationships are explained');
      await direction(fixture.kind,'fits');
      if(fixture.kind==='lever') await capture('desktop-read-the-limits',fixture.kind);
      await target.locator(':scope > summary').focus(); await pg.keyboard.press('Enter');
      check(!await target.evaluate(el=>el.open)&&await sameExcept(before),fixture.kind+': closing the disclosure keeps all setup, records and writing unchanged');
    }

    await mount('lever',390); await limits('lever',160,1.5); await open(explanation('lever'));
    await demand('lever','force',200,160,'over'); await demand('lever','travel',1,1.5,'below'); await direction('lever','force');
    await capture('phone-force-limit-explanation','lever');
    const geometryBefore=await pg.evaluate(()=>window.__qaState);
    await pg.locator('#ml-leverEffortArm').focus();
    for(let step=0;step<5;step++) await pg.keyboard.press('ArrowRight');
    await demand('lever','force',160,160,'at'); await demand('lever','travel',1.25,1.5,'below'); await direction('lever','fits');
    check(await pg.evaluate(()=>window.__qaState.leverEffortArm===2.5)&&await sameExcept(geometryBefore,['leverEffortArm',...poseKeys]),
      'Keyboard geometry adjustment follows the force guidance and recomputes both comparisons while preserving saved evidence');
    await pg.locator('#ml-leverEffortArm').focus();
    for(let step=0;step<5;step++) await pg.keyboard.press('ArrowLeft');
    await limits('lever',300,0.8); await direction('lever','travel');
    await demand('lever','travel',1,0.8,'over');
    await limits('lever',150,0.8); await direction('lever','budget');
    check((await explanation('lever').locator('[data-ml-limit-direction]').textContent()).includes('geometry'),
      'An insufficient force-times-travel budget explains why geometry alone cannot solve the task');
    await limits('lever',200,1);
    await demand('lever','force',200,200,'at'); await demand('lever','travel',1,1,'at');
    await limits('lever',199.9999999,0.9999999995);
    await demand('lever','force',200,199.9999999,'tolerance'); await demand('lever','travel',1,0.9999999995,'tolerance');
    check(await panel('lever').locator('[data-ml-design-fit]').getAttribute('data-ml-design-fit')==='true'&&
      (await budget('lever','force').textContent()).toLowerCase().includes('tolerance'),
      'Tiny accepted excess is explicitly described as numeric tolerance and agrees with the fit result');
    await limits('lever',199.999,1.1); await demand('lever','force',200,199.999,'over');
    check(await panel('lever').locator('[data-ml-design-fit]').getAttribute('data-ml-design-fit')==='false'&&
      (await budget('lever','force').textContent()).toLowerCase().includes('over'),
      'A small failing excess stays visibly over limit even when ordinary rounded values coincide');
    await pg.locator('#ml-design-force-lever').fill('');
    check(await explanation('lever').count()===0&&await pg.locator('#ml-design-force-lever').getAttribute('aria-invalid')==='true',
      'An invalid blank force draft hides the derived explanation and marks the field');
    await limits('lever',200,301);
    check(await explanation('lever').count()===0&&await pg.locator('#ml-design-travel-lever').getAttribute('aria-invalid')==='true',
      'An out-of-range travel draft hides the derived explanation');

    await mount('pulley',320,{contrast:true}); await limits('pulley',160,1.3); await open(explanation('pulley'));
    const discrete=explanation('pulley').locator('[data-ml-limit-discrete=none]');
    check(await discrete.count()===1&&await discrete.getAttribute('data-control')==='pulleySegments'&&
      (await discrete.textContent()).includes('available increment')&&
      await panel('pulley').locator('[data-ml-design-feasible]').getAttribute('data-count')==='0',
      'A possible MA interval with no integer pulley setting has distinct selected-control guidance');
    await direction('pulley','force'); await capture('forced-colors-discrete-limits','pulley');
    check(await explanation('pulley').locator('[data-ml-limit-bar]').evaluateAll(els=>els.every(el=>
      getComputedStyle(el).borderStyle===(el.getAttribute('data-ml-limit-bar')==='current'?'solid':'dashed'))),
      'Forced colors preserves solid current and dashed limit outlines so the two references remain distinguishable');

    await mount('screw',320,{dark:true},{screwHandleR:0.4,screwPitch:0.002,loadDistance:3});
    await limits('screw',20,0.1); await open(explanation('screw'));
    const extremeMA=2*Math.PI*0.4/0.002,extremeTravel=3*extremeMA;
    await demand('screw','travel',extremeTravel,0.1,'over');
    check(Number(await budget('screw','travel').getAttribute('data-percent'))>1000000&&
      (await budget('screw','travel').textContent()).includes('%'),'Extreme screw travel reports its uncapped percentage as readable text');
    await capture('dark-phone-extreme-screw-limits','screw');

    for(const band of ['k2','g35']) {
      await mount('lever',390,{band});
      check(await pg.locator('[data-ml-limit-explanation]').count()===0,band+': the optional advanced explanation is absent');
    }
    await mount('ramp',1150,{}, {rampLength:1,rampHeight:2});
    check(await explanation('ramp').count()===0,'Invalid physical geometry cannot produce a demand explanation');

    await mount('lever',1150,{}, {benchDesignLimits:{lever:{force:'300',travel:'1.5'}}});
    await open(explanation('lever'));
    const before=await pg.evaluate(()=>window.__qaState);
    await open(panel('lever').locator('[data-ml-task-trials=lever]'));
    await use(panel('lever').locator('[data-ml-capacity-use=load]'),'leverLoad');
    await demand('lever','force',300,300,'at'); await demand('lever','travel',1,1.5,'below');
    check(await pg.evaluate(()=>window.__qaState.leverLoad===600)&&await sameExcept(before,['leverLoad','benchDesignUndo',...poseKeys]),
      'Capacity Apply recomputes the explanation while preserving fixed records, explanation and separate evidence');
    await use(panel('lever').locator('[data-ml-design-undo-use=lever]'),'leverLoad');
    await demand('lever','force',200,300,'below');
    check(await pg.evaluate(()=>window.__qaState.leverLoad===400)&&await sameExcept(before,['benchDesignUndo',...poseKeys]),
      'Undo recomputes demand from the restored task without altering saved work');
    await panel('lever').getByRole('button',{name:'Open work record',exact:true}).click();
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    check(await pg.locator('#ml-record-design-note-lever').inputValue()===savedNote,
      'The work record keeps the original fixed explanation after demand exploration');
    fs.mkdirSync(path.join(OUT,'downloads'),{recursive:true});
    const downloadPromise=pg.waitForEvent('download'); await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloadPromise,downloadFailure=await download.failure();
    if(downloadFailure) throw new Error('Native work-record download failed: '+downloadFailure);
    const textRecord=fs.readFileSync(await download.path(),'utf8'); await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&textRecord.includes(savedNote)&&
      textRecord.includes('Effort needed: 200 N')&&textRecord.includes('Total hand travel: 1 m')&&textRecord.includes('Task work: 200 J')&&
      !textRecord.includes('Task work: 300 J'),'Native text download retains the fixed design measurements and writing after Apply/Undo');
  } catch(e) { errors.push(String(e&&e.stack||e)); process.exitCode=1; }
  finally {
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),checks,shots,errors},null,2));
    console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors:errors.map(error=>error.slice(0,500))},null,2));
    if(errors.length) process.exitCode=1; await b.close();
  }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
