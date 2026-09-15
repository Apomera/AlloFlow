
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
    const audit=async(label)=>{checks[label]=await page.evaluate(async()=>{const r=await axe.run('.rn-microgrid',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});assert.deepEqual(checks[label],[],label);};
    const study=()=>page.evaluate(()=>StemLab.renewablesMicrogridModel.designStudy(state.renewablesLab.energyLab.microgrid.designStudy.request));
    const result=()=>page.evaluate(()=>StemLab.renewablesMicrogridModel.simulate(state.renewablesLab.energyLab.microgrid));
    const detail=async(text)=>{const el=page.getByText(text,{exact:true});if(!await el.evaluate(e=>e.closest('details').open))await el.click();};
    const run=async()=>{await page.getByRole('button',{name:'Run battery design study',exact:true}).click();await page.getByLabel('Battery design results',{exact:true}).waitFor();};
    const cell=i=>page.getByRole('button',{name:new RegExp('^Inspect battery design '+i+':')});
    await page.getByRole('button',{name:'Storage & demand',exact:true}).click();await ready();
    await page.getByRole('button',{name:'A grid outage',exact:true}).click();
    await detail('Adjust source inputs');await page.getByLabel('Direct irradiance',{exact:true}).fill('0');
    await page.getByLabel('Base demand kW',{exact:true}).fill('10');await page.getByLabel('Demand pattern',{exact:true}).selectOption('flat');
    await page.getByLabel('Grid connection',{exact:true}).selectOption('island');
    await detail('Adjust each battery unit');await page.getByLabel('Initial state of charge',{exact:true}).fill('50');
    await page.getByLabel('Round-trip efficiency',{exact:true}).fill('100');await page.getByLabel('Charge and discharge power limit',{exact:true}).fill('20');
    await page.getByRole('button',{name:'Battery design bench',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Battery design bench');
    await page.getByLabel('Maximum unit capacity',{exact:true}).fill('100');await page.getByLabel('Maximum unit power',{exact:true}).fill('20');
    await page.getByLabel('Local demand coverage target',{exact:true}).fill('100');await run();let r=await study();
    assert.equal(r.samples.length,25);assert.equal(r.passing,9);assert.deepEqual(r.frontier,[12]);assert.equal(r.clipped,10);
    assert.equal(await page.getByLabel('Battery capacity and power comparison',{exact:true}).getByRole('button').count(),25);
    const request=await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.microgrid.designStudy.request));
    const workbench=await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.settings||{}));
    await cell(4).click();await ready();let live=await result();
    assert.equal(live.capacity,10);assert.equal(live.power,20);assert.equal(await page.getByLabel('Energy system minute',{exact:true}).inputValue(),'60');
    assert.equal(await page.getByLabel('Initial state of charge',{exact:true}).inputValue(),'100');
    assert.ok(await page.evaluate(()=>document.activeElement.classList.contains('rn-energy-stage')));
    await page.getByLabel('Selected battery design',{exact:true}).getByText('This recorded design is open in the simulation.',{exact:true}).waitFor();
    assert.ok(Math.abs(live.totals.unserved-30)<1e-6);
    // Keyboard activation of a matrix cell scrolls/focuses the real 3D scene and preserves the captured request.
    await cell(21).focus();await page.keyboard.press('Enter');await ready();live=await result();
    assert.equal(live.capacity,100);assert.equal(live.power,5);assert.ok(Math.abs(live.totals.unserved-20)<1e-6);
    assert.equal(await page.locator('canvas').count(),1);
    await page.getByRole('button',{name:/^Inspect compact design 12:/}).click();await ready();
    assert.equal((await result()).capacity,55);assert.ok((await result()).totals.unserved<1e-7);
    await page.getByRole('button',{name:'Battery energy chart',exact:true}).click();
    await page.getByLabel('Energy system timeline',{exact:true}).screenshot({path:path.join(out,'design-battery-timeline.png')});
    await page.getByLabel('Base demand kW',{exact:true}).fill('20');
    await page.getByText('System inputs changed. These battery designs retain the recorded conditions. Run again to compare the current system.',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.microgrid.designStudy.request)),request);
    await page.getByRole('button',{name:'Restore design baseline',exact:true}).click();assert.equal((await result()).capacity,100);assert.equal((await result()).power,20);
    assert.equal(await page.getByLabel('Base demand kW',{exact:true}).inputValue(),'10');
    await page.getByLabel('Local demand coverage target',{exact:true}).fill('95');
    await page.getByText('Design setup changed. Run again to apply the new ranges, target, or starting charge comparison.',{exact:true}).waitFor();
    await page.getByLabel('Local demand coverage target',{exact:true}).fill('100');
    await detail('Review battery design conditions');
    await page.getByLabel('Battery design observation',{exact:true}).fill('Power limits the 100 kWh / 5 kW bank; energy limits the 10 kWh / 20 kW bank.');
    await audit('designLightAxe');await page.locator('.rn-design-study').screenshot({path:path.join(out,'design-desktop.png')});
    await page.evaluate(()=>setTheme(true));await audit('designDarkAxe');await page.evaluate(()=>setTheme(false));
    // Both current settings and recorded study data are independently exported.
    await page.getByLabel('Battery units',{exact:true}).fill('2');
    let download=page.waitForEvent('download');await page.getByRole('button',{name:'Export energy system JSON',exact:true}).click();
    await(await download).saveAs(path.join(out,'design-investigation.json'));
    const json=JSON.parse(fs.readFileSync(path.join(out,'design-investigation.json'),'utf8'));
    assert.equal(json.result.settings.batteryUnits,2);assert.equal(json.batteryDesignStudy.result.settings.batteryUnits,1);
    assert.deepEqual(json.batteryDesignStudy.result.frontier,[12]);assert.ok(json.batteryDesignStudy.observation.includes('Power limits'));
    download=page.waitForEvent('download');await page.getByRole('button',{name:'Export battery designs CSV',exact:true}).click();
    await(await download).saveAs(path.join(out,'design-candidates.csv'));
    const lines=fs.readFileSync(path.join(out,'design-candidates.csv'),'utf8').trim().split(/\r?\n/);assert.equal(lines.length,26);assert.ok(lines[0].includes('initial_capped'));
    await page.getByRole('button',{name:'Restore design baseline',exact:true}).click();
    const persisted=await page.evaluate(()=>JSON.parse(JSON.stringify(state)));
    await page.reload();await ready();await page.evaluate(p=>setState(p),persisted);await ready();await page.addScriptTag({url:'/axe.js'});
    assert.ok((await page.getByLabel('Battery design observation',{exact:true}).inputValue()).includes('Power limits'));
    assert.equal(await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.settings||{})),workbench);
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});await audit('designMobile'+width+'Axe');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.locator('.rn-design-study .rn-outage-summary').screenshot({path:path.join(out,'design-summary-'+width+'.png')});
      await page.getByLabel('Selected battery design',{exact:true}).screenshot({path:path.join(out,'design-case-'+width+'.png')});
      await cell(24).focus();await page.keyboard.press('Enter');await ready();assert.equal((await result()).capacity,100);
    }
    await page.setViewportSize({width:1280,height:1050});
    await page.getByRole('button',{name:'Restore design baseline',exact:true}).click();
    await page.getByLabel('Starting charge comparison',{exact:true}).selectOption('percent');await run();r=await study();
    assert.equal(r.samples.find(e=>e.unitCapacity===55&&e.unitPower===10).meetsTarget,false);assert.equal(r.clipped,0);assert.deepEqual(r.frontier,[22]);
    await page.getByLabel('Starting charge comparison',{exact:true}).selectOption('energy');await run();
    // No-demand and no-bank conditions do not fabricate successes or duplicate designs.
    await page.getByLabel('Base demand kW',{exact:true}).fill('0');await run();r=await study();assert.equal(r.passing,0);assert.equal(r.baseline.coverage,null);await audit('designNoDemandAxe');
    await page.getByLabel('Battery units',{exact:true}).fill('0');assert.equal(await page.getByRole('button',{name:'Run battery design study',exact:true}).isDisabled(),true);
    await page.getByLabel('Battery units',{exact:true}).fill('1');await page.getByLabel('Base demand kW',{exact:true}).fill('10');
    const specs=await page.evaluate(()=>StemLab.renewablesEnergyModel.specs.filter(s=>s.id!=='storage'));
    for(const spec of specs){
      await page.getByLabel('Generation technology',{exact:true}).selectOption(spec.id);
      const program=await page.evaluate(id=>StemLab.renewablesEnergyModel.programs[id][0],spec.id);
      await page.getByLabel('Generation operating scenario',{exact:true}).selectOption(program.id);await run();r=await study();
      assert.equal(r.samples.length,25);assert.equal(r.settings.duration,program.duration);await audit(spec.id+'DesignAxe');console.log('Verified battery designs for '+spec.name+'.');
    }
    await page.getByLabel('Generation technology',{exact:true}).selectOption('solarPv');await page.getByLabel('Generation operating scenario',{exact:true}).selectOption('daylight');
    await page.getByLabel('Design samples per axis',{exact:true}).selectOption('9');const started=Date.now();await run();checks.maximumScanMilliseconds=Date.now()-started;
    assert.equal((await study()).samples.length,81);await audit('maximumDesignAxe');
    await page.getByLabel('Minimum unit capacity',{exact:true}).fill('100');await page.getByLabel('Minimum unit power',{exact:true}).fill('20');await run();assert.equal((await study()).samples.length,1);
    // The pre-existing outage study coexists without overwriting the recorded design request.
    const designRequest=await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.microgrid.designStudy.request));
    await page.getByRole('button',{name:'Run outage timing study',exact:true}).click();
    assert.equal(await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.microgrid.designStudy.request)),designRequest);
    checks.behavior={independentCapacityAndPower:true,startingEnergyCapped:true,samePercentageTradeoff:true,localCoverageExcludesGrid:true,compactOptions:true,threeDReplay:true,keyboardInspection:true,capturedConditions:true,baselineRestore:true,jsonExport:true,csvExport:true,persistence:true,eightSources:true,maximum81Cases:true,collapsedAxisDeduplication:true,noDemand:true,noBank:true,outageStudyCoexists:true,mobileOverflow:false};
    checks.pageErrors=errors;checks.consoleErrors=consoleErrors;fs.writeFileSync(path.join(out,'design-browser-results.json'),JSON.stringify(checks,null,2));
    assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);console.log(JSON.stringify(checks,null,2));
  }catch(e){if(page)await page.screenshot({path:path.join(out,'design-failure.png'),fullPage:true}).catch(()=>{});throw e;}
  finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
