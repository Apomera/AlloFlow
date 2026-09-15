
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
    const result=()=>page.evaluate(()=>StemLab.renewablesMicrogridModel.simulate(state.renewablesLab.energyLab.microgrid));
    const study=()=>page.evaluate(()=>StemLab.renewablesMicrogridModel.outageStudy(state.renewablesLab.energyLab.microgrid.outageStudy.request));
    const detail=async(text)=>{const el=page.getByText(text,{exact:true});if(!await el.evaluate(e=>e.closest('details').open))await el.click();};
    const run=async()=>{await page.getByRole('button',{name:'Run outage timing study',exact:true}).click();await page.getByLabel('Outage study results',{exact:true}).waitFor();};
    await page.getByRole('button',{name:'Storage & demand',exact:true}).click();await ready();
    await page.getByRole('button',{name:'A grid outage',exact:true}).click();
    await detail('Adjust source inputs');await page.getByLabel('Direct irradiance',{exact:true}).fill('0');
    await page.getByLabel('Base demand kW',{exact:true}).fill('10');
    await page.getByLabel('Demand pattern',{exact:true}).selectOption('flat');
    await page.getByLabel('Outage starts at',{exact:true}).fill('60');
    await page.getByLabel('Outage duration',{exact:true}).fill('60');
    await page.getByLabel('Battery reserve',{exact:true}).fill('90');
    await detail('Adjust each battery unit');
    await page.getByLabel('Initial state of charge',{exact:true}).fill('100');
    await page.getByLabel('Round-trip efficiency',{exact:true}).fill('100');
    await page.getByLabel('Energy system minute',{exact:true}).fill('60');
    await page.getByRole('button',{name:'Battery in 3D',exact:true}).click();await ready();
    for(const policy of ['fixed','release','backup']){
      await page.getByLabel('Battery strategy',{exact:true}).selectOption(policy);let r=await result();
      assert.ok(Math.abs(r.totals.unserved-(policy==='fixed'?10:0))<1e-7);
      assert.equal(r.rows[60].reserve,policy==='fixed'?90:0);
      assert.ok(Math.abs(r.rows[60].stored-(policy==='backup'?100:90))<1e-7);
      assert.equal(await page.locator('canvas').count(),1);
    }
    await page.getByRole('button',{name:'Battery energy chart',exact:true}).click();
    await page.getByLabel('Energy system timeline',{exact:true}).screenshot({path:path.join(out,'resilience-dispatch-floor.png')});
    await page.getByRole('button',{name:'Outage timing study',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Outage timing study');
    await page.getByLabel('Study outage length',{exact:true}).fill('60');
    await page.getByLabel('Outage start samples',{exact:true}).selectOption('5');
    await run();let r=await study();
    assert.deepEqual(r.strategies.map(p=>p.covered),[1,5,5]);
    assert.equal(await page.getByLabel('Outage strategy comparison',{exact:true}).getByRole('button').count(),15);
    const saved=await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.microgrid.outageStudy.request));
    const workbenches=await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.settings||{}));
    // Each cell restores the captured system and chooses an actual minute in its 3D battery view.
    await page.getByRole('button',{name:'Inspect Fixed reserve outage starting at 90 min',exact:true}).click();await ready();
    assert.equal(await page.getByLabel('Battery strategy',{exact:true}).inputValue(),'fixed');
    assert.equal(await page.getByLabel('Outage starts at',{exact:true}).inputValue(),'90');
    assert.equal(await page.getByLabel('Energy system minute',{exact:true}).inputValue(),'90');
    assert.ok(await page.evaluate(()=>document.activeElement.classList.contains('rn-energy-stage')));
    await page.getByRole('button',{name:'Inspect Save for outages outage starting at 90 min',exact:true}).click();await ready();
    assert.equal(await page.getByLabel('Battery strategy',{exact:true}).inputValue(),'backup');
    assert.equal(await page.getByLabel('Energy system minute',{exact:true}).inputValue(),'90');
    await page.getByLabel('Selected outage case',{exact:true}).getByText('Save for outages · 90–150 min',{exact:true}).waitFor();
    await page.getByLabel('Battery units',{exact:true}).fill('0');
    await page.getByText('System inputs changed. This study retains the recorded design. Run again to test the current system.',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.microgrid.outageStudy.request)),saved);
    await page.getByLabel('Study outage length',{exact:true}).fill('120');
    await page.getByRole('button',{name:'Restore recorded system',exact:true}).click();
    assert.equal(await page.getByLabel('Battery units',{exact:true}).inputValue(),'1');
    assert.equal(await page.getByLabel('Outage starts at',{exact:true}).inputValue(),'60');
    assert.equal(await page.getByLabel('Battery strategy',{exact:true}).inputValue(),'backup');
    assert.equal(await page.getByLabel('Energy system minute',{exact:true}).inputValue(),'0');
    await page.getByText('Study setup changed. Run again to update these results.',{exact:true}).waitFor();
    await page.getByLabel('Study outage length',{exact:true}).fill('60');
    await page.getByLabel('Outage study observation',{exact:true}).fill('Saving charge helps with later outages, but raises grid imports before them.');
    // Exports include the stored request, not a silently recalculated current design.
    await page.getByLabel('Battery units',{exact:true}).fill('2');
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export energy system JSON',exact:true}).click();
    await (await download).saveAs(path.join(out,'resilience-investigation.json'));
    const exported=JSON.parse(fs.readFileSync(path.join(out,'resilience-investigation.json'),'utf8'));
    assert.equal(exported.modelVersion,5);assert.equal(exported.result.settings.batteryUnits,2);
    assert.equal(exported.outageStudy.result.settings.batteryUnits,1);
    assert.deepEqual(exported.outageStudy.result.strategies.map(p=>p.covered),[1,5,5]);
    assert.ok(exported.outageStudy.observation.includes('later outages'));
    const csvDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export outage study CSV',exact:true}).click();
    await (await csvDownload).saveAs(path.join(out,'resilience-outages.csv'));
    const lines=fs.readFileSync(path.join(out,'resilience-outages.csv'),'utf8').trim().split(/\r?\n/);
    assert.equal(lines.length,16);assert.ok(lines[0].includes('stored_at_start_kWh'));
    assert.equal(lines.at(-1).split(',')[2],'180');assert.equal(lines.at(-1).split(',')[4],'"backup"');
    await page.getByRole('button',{name:'Restore recorded system',exact:true}).click();
    await detail('Review recorded study conditions');
    await page.getByLabel('Outage timing study',{exact:true}).screenshot({path:path.join(out,'resilience-desktop.png')});
    await audit('expandedLightStudyAxe');await page.evaluate(()=>setTheme(true));await audit('expandedDarkStudyAxe');
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await audit('mobile'+width+'StudyAxe');
      await page.getByLabel('Outage timing study',{exact:true}).locator('.rn-outage-summary').screenshot({path:path.join(out,'resilience-summary-'+width+'.png')});
      await page.getByLabel('Selected outage case',{exact:true}).screenshot({path:path.join(out,'resilience-case-'+width+'.png')});
      // Keyboard focus can reach a cell beyond the initially visible table columns.
      const cell=page.getByRole('button',{name:'Inspect Save for outages outage starting at 180 min',exact:true});
      await cell.focus();await page.keyboard.press('Enter');await ready();
      assert.equal(await page.getByLabel('Outage starts at',{exact:true}).inputValue(),'180');
    }
    await page.reload();await ready();
    await page.getByRole('button',{name:'Storage & demand',exact:true}).click();await ready();await page.addScriptTag({url:'/axe.js'});
    assert.equal(await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.microgrid.outageStudy.request)),saved);
    assert.ok((await page.getByLabel('Outage study observation',{exact:true}).inputValue()).includes('later outages'));
    assert.equal(await page.getByLabel('Outage starts at',{exact:true}).inputValue(),'180');
    assert.equal(await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.settings||{})),workbenches);
    await page.setViewportSize({width:1280,height:1050});await page.evaluate(()=>setTheme(false));
    const specs=await page.evaluate(()=>StemLab.renewablesEnergyModel.specs.filter(s=>s.id!=='storage'));
    for(const spec of specs){
      await page.getByLabel('Generation technology',{exact:true}).selectOption(spec.id);
      const program=await page.evaluate(id=>StemLab.renewablesEnergyModel.programs[id][0],spec.id);
      await page.getByLabel('Generation operating scenario',{exact:true}).selectOption(program.id);
      await run();r=await study();assert.equal(r.samples.length,5);assert.equal(r.duration,program.duration);
      assert.equal(r.samples.every(s=>s.strategies.length===3),true);
      await audit(spec.id+'StudyAxe');
      console.log('Verified outage comparisons for '+spec.name+'.');
    }
    // The maximum bounded scan and the single feasible start for a full-horizon outage.
    await page.getByLabel('Generation technology',{exact:true}).selectOption('solarPv');
    await page.getByLabel('Generation operating scenario',{exact:true}).selectOption('daylight');
    await page.getByLabel('Outage start samples',{exact:true}).selectOption('25');
    const started=Date.now();await run();checks.maximumScanMilliseconds=Date.now()-started;
    assert.equal(await page.getByLabel('Outage strategy comparison',{exact:true}).getByRole('button').count(),75);
    await audit('maximumStudyAxe');
    await page.getByLabel('Study outage length',{exact:true}).fill('720');await run();
    assert.equal(await page.getByLabel('Outage strategy comparison',{exact:true}).getByRole('button').count(),3);
    await page.getByLabel('Base demand kW',{exact:true}).fill('0');await run();r=await study();
    assert.ok(r.strategies.every(p=>p.evaluated===0&&p.noDemand===1&&p.covered===0));
    await audit('zeroDemandStudyAxe');
    await page.getByRole('button',{name:'A grid outage',exact:true}).click();
    assert.equal(await page.getByLabel('Battery strategy',{exact:true}).inputValue(),'fixed');
    checks.behavior={threeDispatchStrategies:true,replayedInitialHistory:true,outageWindowCoverage:true,capturedStudy:true,changedInputsFlagged:true,threeDCaseInspection:true,keyboardInspection:true,restoreRecordedSystem:true,independentWorkbenchData:true,jsonExport:true,csvExport:true,persistence:true,eightSources:true,boundedMaximumScan:true,fullHorizonDeduplication:true,zeroDemand:true,presetResetsPolicy:true,mobileOverflow:false};
    checks.pageErrors=errors;checks.consoleErrors=consoleErrors;
    fs.writeFileSync(path.join(out,'resilience-browser-results.json'),JSON.stringify(checks,null,2));
    assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
    console.log(JSON.stringify(checks,null,2));
  }catch(e){if(page)await page.screenshot({path:path.join(out,'resilience-failure.png'),fullPage:true}).catch(()=>{});throw e;}
  finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
