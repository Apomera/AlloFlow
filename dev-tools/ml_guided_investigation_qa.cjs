const fs = require('fs'), path = require('path'), vm = require('vm');
let source = fs.readFileSync(path.join(__dirname, 'ml_scene_shots.cjs'), 'utf8');
source = source.slice(0, source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-guided-investigations-2026-10-09/browser');")
  .replace('deviceScaleFactor: 2', 'deviceScaleFactor: 1')
  .replace('var ctx = {', 'window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks = [], shots = [];
  const investigation = pg.locator('[data-ml-investigation]');
  const evidence = pg.locator('[data-ml-experiment]');
  const plans = {lever:['leverEffortArm',2,4],pulley:['pulleySegments',2,4],windlass:['windlassDrumR',0.1,0.2],ramp:['rampLength',4,8],wedge:['wedgeThickness',0.06,0.12],screw:['screwPitch',0.005,0.01]};
  function check(ok, label) { checks.push(label); if (!ok) errors.push(label); }
  async function mount(kind, width=1150, theme={}, extra={}) {
    await pg.setViewportSize({width,height:1000});
    await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,shopMotionProgress:0.5,...extra}),{band:'g68',...theme}]);
    await investigation.waitFor();
  }
  async function startAndPredict(force='less', distance='more') {
    await investigation.getByRole('button',{name:'Start investigation',exact:true}).focus();
    await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>document.activeElement?.matches('[data-ml-prediction=force][data-choice=less]'));
    check(await investigation.locator('[data-ml-prediction=force][data-choice=less]').evaluate(el=>el===document.activeElement),'Keyboard Start focuses the first force prediction');
    check(await investigation.getByRole('button',{name:'Test planned change',exact:true}).isDisabled(),'Test waits for predictions');
    await investigation.locator('[data-ml-prediction=force][data-choice='+force+']').focus();
    await pg.keyboard.press('Enter');
    check(await investigation.getByRole('button',{name:'Test planned change',exact:true}).isDisabled(),'Both predictions required');
    await investigation.locator('[data-ml-prediction=distance][data-choice='+distance+']').click();
  }
  async function testPlannedChange() {
    await investigation.getByRole('button',{name:'Test planned change',exact:true}).focus();
    await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>document.activeElement?.matches('[data-ml-investigation-results]'));
    const results=investigation.locator('[data-ml-investigation-results]');
    check(await results.evaluate(el=>el===document.activeElement&&el.tabIndex===-1&&el.getAttribute('role')==='region'&&el.getAttribute('aria-label')==='Investigation results'),'Keyboard Test focuses the labelled results region');
    await pg.keyboard.press('Tab');
    check(await investigation.getByRole('button',{name:'View before setup',exact:true}).evaluate(el=>el===document.activeElement),'Tab from results advances to View before setup');
  }
  async function inspect(label) {
    const fit=await investigation.evaluate(el=>({page:document.documentElement.scrollWidth<=innerWidth,card:el.scrollWidth<=el.clientWidth+1}));
    check(fit.page && fit.card,label+': no horizontal overflow');
  }
  async function shot(name, target=investigation) { await target.screenshot({path:path.join(OUT,name+'.png')}); shots.push(name); }
  try {
    for (const [kind,[key,before,after]] of Object.entries(plans)) {
      await mount(kind);
      await startAndPredict();
      await testPlannedChange();
      check(await pg.evaluate(([key,after])=>window.__qaState[key]===after && window.__qaState.benchInvestigations[window.__qaState.bench].tested,[key,after]),kind+': planned geometry applied');
      check(await investigation.locator('[data-ml-investigation-outcome]').count()===2,kind+': two frozen outcomes');
      await investigation.getByRole('button',{name:'View before setup',exact:true}).click();
      await pg.waitForFunction(()=>document.activeElement?.matches('.ml-shop-bay'));
      check(await pg.evaluate(([key,before])=>window.__qaState[key]===before && window.__qaState.shopMotionProgress===0.5,[key,before]),kind+': before pose and canvas focus');
      check((await pg.locator('#ml-investigation-view-label').textContent()).includes('before setup'),kind+': before model context');
      await pg.getByRole('button',{name:'Return to investigation',exact:true}).click();
      await pg.waitForFunction(()=>document.activeElement?.id.startsWith('ml-investigation-title-'));
      await investigation.getByRole('button',{name:'View after setup',exact:true}).click();
      await pg.waitForFunction(()=>document.activeElement?.matches('.ml-shop-bay'));
      check(await pg.evaluate(([key,after])=>window.__qaState[key]===after,[key,after]),kind+': after pose');
      await pg.getByRole('button',{name:'Return to investigation',exact:true}).click();
      await investigation.getByRole('button',{name:'Save investigation',exact:true}).click();
      await pg.waitForFunction(()=>document.activeElement?.id.startsWith('ml-evidence-note-'));
      check(await evidence.isVisible(),kind+': record opens and explanation receives focus');
      await inspect(kind);
    }
    await mount('lever');
    await startAndPredict('same','more');
    await pg.locator('#ml-leverLoad').fill('600');
    check(await investigation.getByRole('button',{name:'Test planned change',exact:true}).isDisabled(),'Manual edits suspend the planned test');
    await investigation.getByRole('button',{name:'Restore starting setup',exact:true}).click();
    await pg.waitForFunction(()=>document.activeElement?.matches('[data-ml-prediction=force][data-choice=less]'));
    check(await investigation.locator('[data-ml-prediction=force][data-choice=less]').evaluate(el=>el===document.activeElement),'Restore returns focus to the first force prediction');
    check(await pg.evaluate(()=>window.__qaState.leverLoad===400),'Restore resets only the planned station setup');
    await testPlannedChange();
    check((await investigation.textContent()).includes('differs from your prediction'),'Mismatch invites an explanation');
    await shot('desktop-results');
    await pg.locator('#ml-leverEffortArm').fill('1');
    check(await investigation.locator('[data-ml-investigation-shown]').getAttribute('data-ml-investigation-shown')==='other','Live drift is explicit after testing');
    await investigation.getByRole('button',{name:'Save investigation',exact:true}).click();
    check(await evidence.locator('[data-ml-experiment-metric=force] [data-ml-experiment-value=after]').getAttribute('data-value')==='100','Saved results remain the tested pair after live drift');
    const note='My prediction changed: doubling the effort arm halves force, doubles travel, and preserves 200 J of work.';
    await evidence.getByRole('textbox').fill(note);
    const savedRecord=await pg.evaluate(()=>JSON.stringify(window.__qaState.benchExperiments.lever));
    await investigation.getByRole('button',{name:'Restart investigation',exact:true}).focus();
    await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>document.activeElement?.matches('[data-ml-prediction=force][data-choice=less]'));
    check(await investigation.locator('[data-ml-prediction=force][data-choice=less]').evaluate(el=>el===document.activeElement),'Keyboard Restart returns focus to the first force prediction');
    check(await pg.evaluate(saved=>JSON.stringify(window.__qaState.benchExperiments.lever)===saved&&window.__qaState.benchInvestigations.lever.force===null&&window.__qaState.benchInvestigations.lever.distance===null&&!window.__qaState.benchInvestigations.lever.tested,savedRecord),'Restart resets predictions while preserving the saved record and explanation');
    await pg.evaluate(()=>{if(!navigator.clipboard)Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{}}});window.StemLab.writeClipboard=async(text)=>{window.__copiedRecord=text;};});
    await evidence.getByRole('button',{name:'Open your work record',exact:true}).click();
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    await pg.getByRole('button',{name:'Copy this record',exact:false}).click();
    const copied=await pg.evaluate(()=>window.__copiedRecord);
    check(copied.includes(note)&&copied.includes('effort force: Same')&&copied.includes('hand travel: More')&&copied.includes('200 N → 100 N')&&copied.includes('Recorded comparisons: 1/6'),'Copied record includes original predictions, frozen measurements and explanation');
    await shot('work-record',pg.locator('#ml-work-record'));
    for(const [width,theme,name] of [[390,{},'phone-predictions'],[320,{},'phone-results'],[390,{dark:true},'dark-results']]) {
      await mount('screw',width,theme,{motionPref:'off'});
      await startAndPredict('more','less');
      if(name!=='phone-predictions')await testPlannedChange();
      await inspect(name);await shot(name);
    }
    await pg.emulateMedia({forcedColors:'active'});
    await mount('pulley',320,{dark:true,contrast:true},{motionPref:'off'});
    await startAndPredict();
    await testPlannedChange();
    await inspect('forced-colors');await shot('forced-colors-results');
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({checks,shots,errors},null,2));
    console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors},null,2));
    if(errors.length)process.exitCode=1;
  } finally { await b.close(); }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
