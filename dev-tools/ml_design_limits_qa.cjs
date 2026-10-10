// Exercise design limits with the real host, React renderer and local THREE.
//   node dev-tools/ml_design_limits_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
let source = fs.readFileSync(path.join(__dirname, 'ml_scene_shots.cjs'), 'utf8');
source = source.slice(0, source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';", "const OUT = path.resolve(process.argv[2] || 'reports/machinelab-design-limits-2026-10-09/browser');")
  .replace('deviceScaleFactor: 2', 'deviceScaleFactor: 1')
  .replace('var ctx = {', 'window.__qaState = pair[0].machineLab; var ctx = {');
source += String.raw`
  const checks = [], shots = [];
  const settingKeys = ['loadDistance','leverEffortArm','leverLoadArm','leverLoad','pulleySegments','pulleyLoad',
    'windlassHandleR','windlassDrumR','windlassLoad','rampLength','rampHeight','rampLoad',
    'wedgeLength','wedgeThickness','wedgeLoad','screwHandleR','screwPitch','screwLoad'];
  const fixtures = [
    {kind:'lever',key:'leverEffortArm',value:4,force:100,travel:3,extra:{}},
    {kind:'pulley',key:'pulleySegments',value:4,force:100,travel:3,extra:{}},
    {kind:'windlass',key:'windlassHandleR',value:0.4,force:100,travel:3,extra:{windlassHandleR:0.15}},
    {kind:'ramp',key:'rampLength',value:4,force:100,travel:3,extra:{rampLength:2}},
    {kind:'wedge',key:'wedgeLength',value:0.24,force:200,travel:3,extra:{wedgeLength:0.12}},
    {kind:'screw',key:'screwPitch',value:0.005,force:100,travel:100,extra:{screwPitch:0.002}}
  ];
  const lever = {leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:0.5};
  const record = {benchId:'lever',before:{settings:lever},after:{settings:{...lever,leverEffortArm:4}},
    note:'Stored explanation stays with its evidence.',investigation:{id:'lever-one-change-v1',force:'same',distance:'more'}};
  const preserved = {benchExperiments:{lever:record},benchReferences:{lever},
    benchInvestigations:{lever:{id:'lever-one-change-v1',force:'same',distance:'more',tested:true}}};
  function check(ok, label) { checks.push(label); if (!ok) errors.push(label); }
  function panel(kind) { return pg.locator('[data-ml-design='+kind+']'); }
  async function open(kind) {
    const details = panel(kind);
    if (!await details.evaluate(el=>el.open)) await details.locator('summary').click();
    return details;
  }
  async function mount(kind, width=1150, theme={}, extra={}) {
    await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
    await pg.setViewportSize({width,height:1000});
    await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',shopMotionProgress:0.1,...extra}),{band:'g68',...theme}]);
    await panel(kind).waitFor();
  }
  async function limits(kind, force, travel) {
    await pg.locator('#ml-design-force-'+kind).fill(String(force));
    await pg.locator('#ml-design-travel-'+kind).fill(String(travel));
  }
  async function settings() {
    return pg.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,window.__qaState[key]])),settingKeys);
  }
  async function apply(kind, key) {
    await panel(kind).getByRole('button',{name:'Apply suggested setting',exact:true}).focus();
    await pg.keyboard.press('Enter');
    await pg.waitForFunction(id=>document.activeElement?.id===id,'ml-'+key);
  }
  async function capture(name, kind) {
    const fits = await panel(kind).evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1);
    check(fits,name+': design panel and page fit the viewport');
    await panel(kind).screenshot({path:path.join(OUT,name+'.png')}); shots.push(name);
  }
  try {
    await mount('lever');
    check(!await panel('lever').evaluate(el=>el.open),'Design controls begin in a closed disclosure');
    await panel('lever').locator('summary').focus();
    await pg.keyboard.press('Enter');
    check(await panel('lever').evaluate(el=>el.open),'Keyboard Enter opens design controls');
    await pg.locator('.ml-shop-bay canvas').waitFor();
    check(await pg.locator('.ml-shop-bay canvas').evaluate(el=>el.width>0&&el.height>0),'The real 3D workshop has a drawable canvas');
    check(await pg.locator('#ml-design-force-lever').getAttribute('aria-describedby')==='ml-design-help-lever'&&
      await pg.locator('#ml-design-travel-lever').getAttribute('aria-describedby')==='ml-design-help-lever',
      'Both limit inputs are linked to the units and total-path guidance');
    for (const fixture of fixtures) {
      const {kind,key,value,force,travel,extra} = fixture;
      await mount(kind,1150,{},extra); await open(kind); await limits(kind,force,travel);
      check(await panel(kind).locator('[data-ml-design-fit]').getAttribute('data-ml-design-fit')==='false',kind+': initial setup misses a limit');
      const proposal = panel(kind).locator('[data-ml-design-suggestion='+key+']');
      check(Number(await proposal.getAttribute('data-value'))===value,kind+': suggestion is the nearest available working increment');
      const before = await settings();
      await apply(kind,key);
      const after = await settings();
      check(after[key]===value&&settingKeys.every(held=>held===key||before[held]===after[held]),kind+': application changes only the proposed setting');
      check(await panel(kind).locator('[data-ml-design-fit]').getAttribute('data-ml-design-fit')==='true'&&
        await pg.evaluate(()=>!window.__qaState.shopAnimating&&window.__qaState.shopMotionProgress===0.5)&&
        await panel(kind).getByRole('button',{name:'Apply suggested setting',exact:true}).count()===0,
        kind+': applied setup meets both limits, pauses halfway and removes the obsolete proposal');
    }
    await mount('lever',1150,{},preserved); await open('lever'); await limits('lever',100,3);
    const prior = await pg.evaluate(()=>JSON.stringify([window.__qaState.benchExperiments,window.__qaState.benchReferences,window.__qaState.benchInvestigations]));
    await apply('lever','leverEffortArm');
    check(await pg.evaluate(prior=>JSON.stringify([window.__qaState.benchExperiments,window.__qaState.benchReferences,window.__qaState.benchInvestigations])===prior,prior),
      'Applying a design preserves saved measurements, explanation, setup and original investigation choices');
    await limits('lever',100,1);
    check(await panel('lever').locator('[data-ml-design-impossible]').isVisible()&&
      await panel('lever').getByRole('button',{name:'Apply suggested setting',exact:true}).count()===0,
      'Insufficient force-times-travel budget gives an impossible result without a geometry proposal');
    await limits('lever',100,2);
    check(await panel('lever').locator('[data-ml-design-fit]').getAttribute('data-ml-design-fit')==='true',
      'An exact 200 J boundary accepts the setup within both limits');
    await limits('lever',100,1.999);
    check(await panel('lever').locator('[data-ml-design-impossible]').isVisible()&&
      await panel('lever').locator('[data-ml-design-fit]').getAttribute('data-ml-design-fit')==='false',
      'A rounded-looking boundary below 200 J still fails using full precision');
    await pg.locator('#ml-design-force-lever').fill('');
    check((await panel('lever').getByRole('status').textContent()).includes('Enter a positive value')&&
      await pg.locator('#ml-design-force-lever').getAttribute('aria-invalid')==='true'&&
      await panel('lever').locator('[data-ml-design-fit],[data-ml-design-suggestion],[data-ml-design-impossible]').count()===0,
      'A blank limit replaces computed claims with linked input guidance');
    await limits('lever',125,1.75);
    await pg.locator('#ml-bench-tab-pulley').click(); await open('pulley'); await limits('pulley',125,1.8);
    check(await panel('pulley').locator('[data-ml-design-no-step]').isVisible()&&
      await panel('pulley').locator('[data-ml-design-impossible]').count()===0&&
      await panel('pulley').getByRole('button',{name:'Apply suggested setting',exact:true}).count()===0,
      'Integer pulley strands can have no legal increment despite a sufficient work budget');
    await pg.locator('#ml-bench-tab-lever').focus(); await pg.keyboard.press('Enter'); await open('lever');
    check(await pg.locator('#ml-design-force-lever').inputValue()==='125'&&await pg.locator('#ml-design-travel-lever').inputValue()==='1.75',
      'Returning by keyboard restores this station’s own limit inputs');
    await pg.locator('#ml-bench-tab-pulley').click(); await open('pulley');
    check(await pg.locator('#ml-design-travel-pulley').inputValue()==='1.8','Limits on another station remain independent');
    await mount('lever');
    const investigation = pg.locator('[data-ml-investigation=lever]');
    await investigation.getByRole('button',{name:'Start investigation',exact:true}).click();
    await investigation.locator('[data-ml-prediction=force][data-choice=less]').click();
    await investigation.locator('[data-ml-prediction=distance][data-choice=more]').click();
    await open('lever'); await limits('lever',100,3); await apply('lever','leverEffortArm');
    check(await investigation.getByRole('button',{name:'Test planned change',exact:true}).isDisabled()&&
      await pg.evaluate(()=>window.__qaState.benchInvestigations.lever.force==='less'&&window.__qaState.benchInvestigations.lever.distance==='more'&&!window.__qaState.benchInvestigations.lever.tested),
      'Design edits suspend an untested guided plan while retaining both predictions');
    await investigation.getByRole('button',{name:'Restore starting setup',exact:true}).click();
    check(!await investigation.getByRole('button',{name:'Test planned change',exact:true}).isDisabled()&&
      await pg.evaluate(()=>window.__qaState.leverEffortArm===2)&&
      await pg.locator('#ml-design-force-lever').inputValue()==='100',
      'Guided Restore recovers its baseline and leaves the design limits available');
    for (const [width,theme,name,kind,force,travel] of [
      [1150,{},'desktop-suggestion','lever',100,3],
      [390,{},'phone-no-increment','pulley',125,1.8],
      [320,{dark:true},'dark-phone-impossible','lever',100,1.999],
      [320,{contrast:true},'forced-colors-suggestion','wedge',200,3]
    ]) {
      await mount(kind,width,theme,kind==='wedge'?{wedgeLength:0.12}:{}); await open(kind); await limits(kind,force,travel);
      await capture(name,kind);
    }
  } catch (e) {
    errors.push(String(e&&e.stack||e)); process.exitCode=1;
  } finally {
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({checks,shots,errors},null,2));
    console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors},null,2));
    if (errors.length) process.exitCode=1;
    await b.close();
  }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
