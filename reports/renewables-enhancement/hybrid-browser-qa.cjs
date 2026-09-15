
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
    const settings=()=>page.evaluate(()=>StemLab.renewablesMicrogridModel.settings(state.renewablesLab.energyLab.microgrid));
    const detail=async(text)=>{const el=page.getByText(text,{exact:true});if(!await el.evaluate(e=>e.closest('details').open))await el.click();};
    const designs=()=>page.evaluate(()=>StemLab.renewablesMicrogridModel.designStudy(state.renewablesLab.energyLab.microgrid.designStudy.request));
    const outages=()=>page.evaluate(()=>StemLab.renewablesMicrogridModel.outageStudy(state.renewablesLab.energyLab.microgrid.outageStudy.request));
    await page.getByRole('button',{name:'Storage & demand',exact:true}).click();await ready();
    assert.equal(await page.getByLabel('Enable second generator',{exact:true}).isChecked(),false);
    await page.getByRole('button',{name:'Solar + wind',exact:true}).click();await ready();
    assert.equal((await settings()).companion.source,'wind');assert.equal((await settings()).companion.offset,45);
    await page.getByRole('img',{name:/^Wind 3D mechanism/}).waitFor();assert.equal(await page.locator('canvas').count(),1);
    let r=await result();assert.equal(r.rows[0].companionTiming,'before');assert.ok(r.totals.companionGeneration>0);
    await page.getByLabel('Energy system minute',{exact:true}).fill('90');r=await result();assert.equal(r.rows[90].companionProfileMinute,45);assert.equal(r.rows[90].companionGeneration,0);
    await page.getByLabel('Energy system minute',{exact:true}).fill('40');await page.getByRole('button',{name:'Source in 3D',exact:true}).click();await ready();await page.getByRole('img',{name:/^Solar PV 3D mechanism/}).waitFor();
    await page.getByRole('button',{name:'Second source in 3D',exact:true}).focus();await page.keyboard.press('Enter');await ready();
    await detail('Adjust second source inputs');await detail('How the two timelines align');
    await audit('hybridLightAxe');await page.locator('.rn-energy-stage').screenshot({path:path.join(out,'hybrid-wind-3d.png')});
    await page.getByLabel('Second source setup',{exact:true}).screenshot({path:path.join(out,'hybrid-controls.png')});
    await page.getByLabel('Combined source comparison',{exact:true}).screenshot({path:path.join(out,'hybrid-comparison.png')});
    await page.getByRole('button',{name:'Inspect combined generation chart',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Energy system timeline');
    assert.equal(await page.getByLabel('Energy system timeline',{exact:true}).locator('polyline').count(),3);
    await page.getByLabel('Energy system timeline',{exact:true}).screenshot({path:path.join(out,'hybrid-generation-chart.png')});
    await page.evaluate(()=>setTheme(true));await audit('hybridDarkAxe');await page.evaluate(()=>setTheme(false));
    // Each generator keeps independent workbench settings. Opening/copying the partner is explicit.
    const speedLabel=await page.evaluate(()=>StemLab.renewablesEnergyModel.specs.find(s=>s.id==='wind').controls.find(c=>c[0]==='speed')[1]);
    await page.getByRole('button',{name:'Open second source workbench',exact:true}).click();await ready();
    await page.getByLabel(speedLabel,{exact:true}).fill('9');await page.getByLabel('Operating scenario',{exact:true}).selectOption('lull');
    await page.getByRole('button',{name:'Storage & demand',exact:true}).click();await ready();assert.equal((await settings()).companion.sourceSettings.speed,4);
    await page.getByRole('button',{name:'Copy second source workbench settings',exact:true}).click();assert.equal((await settings()).companion.sourceSettings.speed,9);assert.equal((await settings()).companion.offset,0);
    const workbenches=await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.settings));
    await detail('Adjust second source inputs');await page.getByLabel('Second source: '+speedLabel,{exact:true}).fill('8');assert.equal(await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.settings)),workbenches);
    await page.getByLabel('Generation operating scenario',{exact:true}).selectOption('daylight');
    await page.getByLabel('Second scenario time offset',{exact:true}).fill('30');await page.getByLabel('Energy system minute',{exact:true}).fill('600');
    r=await result();assert.equal(r.duration,720);assert.equal(r.rows[600].companionProfileMinute,120);assert.equal(r.rows[600].companionTiming,'after');
    await page.getByLabel('Second scenario time offset',{exact:true}).fill('-40');await page.getByLabel('Energy system minute',{exact:true}).fill('0');assert.equal((await result()).rows[0].companionGeneration,0);
    const specs=await page.evaluate(()=>StemLab.renewablesEnergyModel.specs.filter(s=>s.id!=='storage'));
    for(const spec of specs){
      await page.getByLabel('Second generation technology',{exact:true}).selectOption(spec.id);await page.getByRole('button',{name:'Second source in 3D',exact:true}).click();await ready();
      await page.getByRole('img',{name:new RegExp('^'+spec.name+' 3D mechanism')}).waitFor();
      const programs=await page.evaluate(id=>StemLab.renewablesEnergyModel.programs[id],spec.id);
      for(const program of programs){await page.getByLabel('Second generation scenario',{exact:true}).selectOption(program.id);await page.getByLabel('Energy system minute',{exact:true}).fill('60');r=await result();assert.equal(r.rows[60].companionProfileMinute,60);assert.ok(Number.isFinite(r.rows[60].generation));}
      await page.getByLabel('Second generation units',{exact:true}).fill('2');r=await result();assert.ok(Math.abs(r.rows[60].companionGeneration-r.rows[60].companionRun.power*2)<1e-6);
      assert.equal(await page.locator('canvas').count(),1);await audit(spec.id+'CompanionAxe');console.log('Verified '+spec.name+' as an independent second source.');
    }
    // Both captured study types must restore both generators and the partner's offset.
    await page.getByRole('button',{name:'Solar + wind',exact:true}).click();await ready();
    await page.getByLabel('Outage start samples',{exact:true}).selectOption('5');await page.getByRole('button',{name:'Run outage timing study',exact:true}).click();
    await page.getByRole('button',{name:'Run battery design study',exact:true}).click();
    const captured=JSON.stringify((await settings()).companion),a=await outages(),d=await designs();assert.equal(a.settings.companion.offset,45);assert.equal(d.settings.companion.offset,45);
    assert.equal(d.samples.every(e=>e.totals.companionGeneration===d.baseline.totals.companionGeneration),true);
    await page.getByLabel('Second scenario time offset',{exact:true}).fill('0');
    await page.getByText('System inputs changed. This study retains the recorded design. Run again to test the current system.',{exact:true}).waitFor();
    await page.getByText('System inputs changed. These battery designs retain the recorded conditions. Run again to compare the current system.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Inspect selected battery design in 3D',exact:true}).click();await ready();assert.equal(JSON.stringify((await settings()).companion),captured);
    await page.getByLabel('Enable second generator',{exact:true}).uncheck();
    await page.getByRole('button',{name:'Inspect Fixed reserve outage starting at '+a.samples[2].start+' min',exact:true}).click();await ready();assert.equal(JSON.stringify((await settings()).companion),captured);
    await detail('Review recorded study conditions');await detail('Review battery design conditions');await audit('hybridCapturedStudiesAxe');
    await page.getByLabel('Energy system observation',{exact:true}).fill('The second generator changes both local supply and the battery trajectory.');
    await page.getByLabel('Enable second generator',{exact:true}).uncheck();
    let download=page.waitForEvent('download');await page.getByRole('button',{name:'Export energy system JSON',exact:true}).click();await(await download).saveAs(path.join(out,'hybrid-investigation.json'));
    const json=JSON.parse(fs.readFileSync(path.join(out,'hybrid-investigation.json'),'utf8'));assert.equal(json.modelVersion,5);assert.equal(json.result.settings.companion.enabled,false);assert.equal(json.outageStudy.result.settings.companion.enabled,true);assert.equal(json.batteryDesignStudy.result.settings.companion.offset,45);
    await page.getByRole('button',{name:'Restore design baseline',exact:true}).click();assert.equal((await settings()).companion.enabled,true);
    download=page.waitForEvent('download');await page.getByRole('button',{name:'Export energy system CSV',exact:true}).click();await(await download).saveAs(path.join(out,'hybrid-minutes.csv'));
    const lines=fs.readFileSync(path.join(out,'hybrid-minutes.csv'),'utf8').trim().split(/\r?\n/);const headers=lines[0].split(',');assert.ok(headers.includes('primaryGeneration_kW')&&headers.includes('companionGeneration_kW'));
    for(const line of lines.slice(1)){const values=line.split(',');assert.ok(Math.abs(Number(values[1])-Number(values[headers.indexOf('primaryGeneration_kW')])-Number(values[headers.indexOf('companionGeneration_kW')]))<1e-7);}
    for(const [label,name] of [['Export outage study CSV','hybrid-outages.csv'],['Export battery designs CSV','hybrid-designs.csv']]){download=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();await(await download).saveAs(path.join(out,name));assert.ok(fs.readFileSync(path.join(out,name),'utf8').split(/\r?\n/)[0].includes('second_settings_json'));}
    const persisted=await page.evaluate(()=>JSON.parse(JSON.stringify(state)));await page.reload();await ready();await page.evaluate(p=>setState(p),persisted);await ready();await page.addScriptTag({url:'/axe.js'});
    assert.equal(JSON.stringify((await settings()).companion),captured);assert.ok((await page.getByLabel('Energy system observation',{exact:true}).inputValue()).includes('second generator'));
    for(const width of [390,320]){await page.setViewportSize({width,height:844});await audit('hybridMobile'+width+'Axe');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.getByLabel('Second source setup',{exact:true}).screenshot({path:path.join(out,'hybrid-controls-'+width+'.png')});await page.getByLabel('Combined source comparison',{exact:true}).screenshot({path:path.join(out,'hybrid-comparison-'+width+'.png')});}
    await page.setViewportSize({width:1280,height:1050});await page.getByLabel('Second generation units',{exact:true}).fill('0');await page.getByRole('button',{name:'Second source in 3D',exact:true}).click();await ready();assert.equal((await result()).totals.companionGeneration,0);await page.getByText('Second-source mechanism preview · zero installed units · Wind',{exact:true}).waitFor();await audit('hybridZeroUnitsAxe');
    await page.getByLabel('Enable second generator',{exact:true}).uncheck();await ready();assert.equal(await page.getByRole('button',{name:'Second source in 3D',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Source in 3D',exact:true}).getAttribute('aria-pressed'),'true');await audit('hybridDisabledAxe');
    await page.getByRole('button',{name:'Solar + wind',exact:true}).click();await page.getByRole('button',{name:'A grid outage',exact:true}).click();assert.equal((await settings()).companion.enabled,false);
    checks.behavior={combinedEnergyBalance:true,independentControls:true,explicitWorkbenchCopy:true,eightCompanionMechanisms:true,sixteenNativeScenarios:true,noTimeStretching:true,positiveAndNegativeOffsets:true,endpointHolds:true,generationChart:true,matchedPrimaryBaseline:true,capturedOutageAndDesignReplay:true,keyboard3DSelection:true,version5Json:true,perSourceCsv:true,studyCsvProvenance:true,persistence:true,zeroUnits:true,disableWhileInspecting:true,starterReset:true,mobileOverflow:false};
    checks.pageErrors=errors;checks.consoleErrors=consoleErrors;fs.writeFileSync(path.join(out,'hybrid-browser-results.json'),JSON.stringify(checks,null,2));assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);console.log(JSON.stringify(checks,null,2));
  }catch(e){if(page)await page.screenshot({path:path.join(out,'hybrid-failure.png'),fullPage:true}).catch(()=>{});throw e;}
  finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
