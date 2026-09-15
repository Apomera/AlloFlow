
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=process.cwd(),out=path.join(root,'reports/renewables-enhancement');fs.mkdirSync(out,{recursive:true});
const files={'/react.js':'desktop/web-app/node_modules/react/umd/react.development.js','/react-dom.js':'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','/three.js':'vendor/three-r128/three.min.js','/tool.js':'stem_lab/stem_tool_renewables.js','/axe.js':'node_modules/axe-core/axe.min.js'};
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Renewables Lab review</title><style>body{margin:0;font-family:system-ui;background:#f0fdf4}*{box-sizing:border-box}main{max-width:1320px;margin:auto}button,input,select{font:inherit}</style></head><body><main id="root"></main><script src="/react.js"></script><script src="/react-dom.js"></script><script src="/three.js"></script><script src="/tool.js"></script><script>window.state={};window.dark=false;function Host(){const[data,setData]=React.useState({renewablesLab:{view:"energy3d"}});const[theme,setTheme]=React.useState(false);window.setTheme=setTheme;window.state=data;window.setState=setData;return StemLab._registry.renewablesLab.render({React,toolData:data,isDark:theme,t:(k,f)=>f||k,update:(id,k,v)=>setData(p=>({...p,[id]:{...p[id],[k]:v}})),updateMulti:(id,o)=>setData(p=>({...p,[id]:{...p[id],...o}})),addToast:()=>{}})}window.root=ReactDOM.createRoot(document.getElementById("root"));root.render(React.createElement(Host));</script></body></html>';
const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);}else if(files[req.url]){res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(path.join(root,files[req.url])));}else{res.statusCode=404;res.end();}});


(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const checks={},errors=[],consoleErrors=[];let page;
  try{
    page=await browser.newPage({viewport:{width:1280,height:1050},reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
    await page.goto('http://127.0.0.1:'+server.address().port);
    const ready=async()=>{await page.locator('[data-energy-render-status="ready"]').waitFor();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
    await ready();await page.addScriptTag({url:'/axe.js'});
    const audit=async(label)=>{checks[label]=await page.evaluate(async()=>{const r=await axe.run('.rn-energy-lab',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});assert.deepEqual(checks[label],[],label);};
    const result=()=>page.evaluate(()=>{const s=state.renewablesLab.energyLab;return StemLab.renewablesEnergyModel.sweep(s.selected,s.experiments[s.selected].run);});
    const run=async()=>{await page.getByRole('button',{name:'Run controlled experiment',exact:true}).click();await page.getByLabel('Saved experiment results',{exact:true}).waitFor();};
    const specs=await page.evaluate(()=>StemLab.renewablesEnergyModel.specs);
    for(const spec of specs){
      await page.getByRole('button',{name:'Explore '+spec.name,exact:true}).click();await ready();
      await page.getByRole('button',{name:'Experiment bench',exact:true}).click();
      assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Controlled experiment bench');
      const before=await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.settings||{}));
      await page.getByLabel('Experiment trial count',{exact:true}).selectOption('5');
      await run();
      assert.equal(await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.settings||{})),before);
      assert.equal((await result()).rows.length,5);
      const program=await page.evaluate(id=>StemLab.renewablesEnergyModel.programs[id][0],spec.id);
      await page.getByLabel('Operating scenario',{exact:true}).selectOption(program.id);
      await page.getByLabel('Scenario minute',{exact:true}).fill(String(Math.floor(program.duration/2)));
      await run();const r=await result();assert.equal(r.unit,'kWh');assert.equal(r.duration,program.duration);
      await page.getByLabel('Experiment trial to inspect',{exact:true}).selectOption('4');
      await page.getByRole('button',{name:'Energy flow',exact:true}).click();
      await page.getByRole('button',{name:'Inspect trial in 3D',exact:true}).click();await ready();
      assert.equal(await page.locator('canvas').count(),1);
      assert.deepEqual(await page.evaluate(id=>state.renewablesLab.energyLab.settings[id],spec.id),r.rows[4].settings);
      assert.equal(await page.getByLabel('Scenario minute',{exact:true}).inputValue(),String(r.phase));
      assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('rn-energy-workspace')),true);
      await page.getByRole('button',{name:'Restore experiment reference',exact:true}).click();await ready();
      assert.deepEqual(await page.evaluate(id=>state.renewablesLab.energyLab.settings[id],spec.id),r.baseSettings);
      await audit(spec.id+'ExperimentAxe');
      console.log('Verified '+spec.name+' experiment, full scenario, and 3D trial restoration.');
    }
    // Known PV target and exact delta workflow.
    await page.getByRole('button',{name:'Explore Solar PV',exact:true}).click();await ready();
    await page.getByLabel('Operating scenario',{exact:true}).selectOption('steady');
    await page.getByRole('button',{name:'Reset Solar PV inputs',exact:true}).click();
    await page.getByLabel('Direct irradiance',{exact:true}).fill('1000');
    await page.getByLabel('Angle from the panel normal',{exact:true}).fill('0');
    await page.getByLabel('Experiment lower value',{exact:true}).fill('10');
    await page.getByLabel('Experiment upper value',{exact:true}).fill('50');
    await page.getByLabel('Experiment delivery target',{exact:true}).fill('5');
    await page.getByLabel('Experiment prediction',{exact:true}).fill('Doubling area should double output at the same angle.');
    await run();let r=await result();assert.deepEqual(r.targetMatches,[2,3,4]);
    await page.getByLabel('Experiment conclusion',{exact:true}).fill('30 square metres is the lowest sampled area meeting 5 kW.');
    // Saved output remains fixed through edits to other settings and the experiment draft.
    const snapshot=await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.experiments.solarPv.run));
    await page.getByLabel('Module efficiency',{exact:true}).fill('25');
    await page.getByText('Workbench conditions have changed. These results retain their recorded inputs.',{exact:true}).waitFor();
    await page.getByLabel('Experiment upper value',{exact:true}).fill('60');
    await page.getByText('Setup changed. Run again to update the saved experiment.',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.experiments.solarPv.run)),snapshot);
    await page.getByRole('button',{name:'Restore experiment reference',exact:true}).click();
    assert.equal(await page.getByLabel('Module efficiency',{exact:true}).inputValue(),'20');
    assert.equal(await page.getByLabel('Experiment conclusion',{exact:true}).inputValue(),'30 square metres is the lowest sampled area meeting 5 kW.');
    await page.getByLabel('Experiment upper value',{exact:true}).fill('50');
    // Invalid range/target cannot replace a valid experiment.
    await page.getByLabel('Experiment lower value',{exact:true}).fill('60');
    assert.equal(await page.getByRole('button',{name:'Run controlled experiment',exact:true}).isDisabled(),true);
    await page.getByRole('alert').getByText('The upper value must be greater than the lower value.',{exact:true}).waitFor();
    await page.getByLabel('Experiment lower value',{exact:true}).fill('10');
    await page.getByLabel('Experiment delivery target',{exact:true}).fill('-1');
    assert.equal(await page.getByRole('button',{name:'Run controlled experiment',exact:true}).isDisabled(),true);
    await page.getByLabel('Experiment delivery target',{exact:true}).fill('5');
    assert.equal(await page.getByRole('button',{name:'Run controlled experiment',exact:true}).isDisabled(),false);
    assert.equal(await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.experiments.solarPv.run)),snapshot);
    // CSV exports the saved run rather than the draft. JSON includes all nine experiments and the conclusion.
    const csvDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export experiment CSV',exact:true}).click();
    await (await csvDownload).saveAs(path.join(out,'experiment-solarPv.csv'));
    const csv=fs.readFileSync(path.join(out,'experiment-solarPv.csv'),'utf8').trim().split(/\r?\n/);
    assert.equal(csv.length,6);assert.ok(csv[0].includes('percent_change'));
    assert.equal(Number(csv[3].split(',')[4]),30);assert.ok(Math.abs(Number(csv[3].split(',')[6])-5.76)<1e-8);
    const jsonDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export mechanism investigation',exact:true}).click();
    await (await jsonDownload).saveAs(path.join(out,'experiments-investigation.json'));
    const report=JSON.parse(fs.readFileSync(path.join(out,'experiments-investigation.json'),'utf8'));
    assert.equal(report.experiments.length,9);
    const pv=report.experiments.find(e=>e.result.id==='solarPv');assert.deepEqual(pv.result.targetMatches,[2,3,4]);
    assert.equal(pv.conclusion,'30 square metres is the lowest sampled area meeting 5 kW.');
    assert.equal(pv.result.prediction,'Doubling area should double output at the same angle.');
    await page.getByText('Review experiment conditions',{exact:true}).click();
    await page.getByLabel('Controlled experiment bench',{exact:true}).screenshot({path:path.join(out,'experiment-desktop.png')});
    await audit('experimentExpandedLightAxe');
    await page.evaluate(()=>setTheme(true));await audit('experimentExpandedDarkAxe');
    await page.getByLabel('Saved experiment results',{exact:true}).screenshot({path:path.join(out,'experiment-results-dark.png')});
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await audit('experimentMobile'+width+'Axe');
      await page.getByLabel('Controlled experiment bench',{exact:true}).screenshot({path:path.join(out,'experiment-mobile-'+width+'.png')});
    }
    await page.reload();await ready();await page.addScriptTag({url:'/axe.js'});
    assert.equal(await page.getByLabel('Experiment delivery target',{exact:true}).inputValue(),'5');
    assert.equal(await page.getByLabel('Experiment conclusion',{exact:true}).inputValue(),pv.conclusion);
    assert.equal(await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.experiments.solarPv.run)),snapshot);
    // Power target must not silently become an energy target.
    await page.getByLabel('Operating scenario',{exact:true}).selectOption('clouds');
    assert.equal(await page.getByLabel('Experiment delivery target',{exact:true}).inputValue(),'');
    await page.setViewportSize({width:1280,height:1050});await page.evaluate(()=>setTheme(false));
    // Battery saturation is visible in the complete schedule, including unserved energy.
    await page.getByRole('button',{name:'Explore Battery storage',exact:true}).click();await ready();
    await page.getByLabel('Operating scenario',{exact:true}).selectOption('interrupted');
    await page.getByRole('button',{name:'Reset Battery storage inputs',exact:true}).click();
    await page.getByLabel('Experiment trial count',{exact:true}).selectOption('13');
    await page.getByLabel('Experiment delivery target',{exact:true}).fill('50');
    await run();r=await result();assert.ok(Math.abs(r.peak-44)<1e-7);assert.equal(r.targetMatches.length,0);
    await page.getByText('Review experiment conditions',{exact:true}).click();
    await page.getByLabel('Saved experiment results',{exact:true}).screenshot({path:path.join(out,'experiment-battery.png')});
    await audit('experimentBatteryAxe');
    // Signed input, deduplicated short range, and undefined percentage baseline.
    await page.getByRole('button',{name:'Explore Tidal stream',exact:true}).click();await ready();
    await page.getByLabel('Operating scenario',{exact:true}).selectOption('steady');
    await page.getByLabel('Signed tidal current',{exact:true}).fill('0');
    await page.getByLabel('Experiment input',{exact:true}).selectOption('speed');
    await page.getByLabel('Experiment lower value',{exact:true}).fill('-0.25');
    await page.getByLabel('Experiment upper value',{exact:true}).fill('0.25');
    await page.getByLabel('Experiment trial count',{exact:true}).selectOption('13');
    await run();r=await result();assert.deepEqual(r.rows.map(v=>v.value),[-.25,0,.25]);assert.ok(r.rows.every(v=>v.percent===null));
    await audit('experimentZeroReferenceAxe');
    checks.behavior={nineMechanisms:true,steadyAndFullScenarioResults:true,fixedExperimentSnapshot:true,threeDTrialInspection:true,referenceRestoration:true,targetChecks:true,rangeValidation:true,deduplication:true,zeroReference:true,unitChangeClearsTarget:true,csvExport:true,jsonExport:true,persistence:true,mobileOverflow:false};
    checks.pageErrors=errors;checks.consoleErrors=consoleErrors;
    assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
    fs.writeFileSync(path.join(out,'experiments-browser-results.json'),JSON.stringify(checks,null,2));
    console.log(JSON.stringify(checks,null,2));
  }catch(e){if(page)await page.screenshot({path:path.join(out,'experiment-failure.png'),fullPage:true}).catch(()=>{});throw e;}
  finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
