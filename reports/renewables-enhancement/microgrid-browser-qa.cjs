
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
    const settings=()=>page.evaluate(()=>StemLab.renewablesMicrogridModel.settings(state.renewablesLab.energyLab.microgrid));
    const result=()=>page.evaluate(()=>StemLab.renewablesMicrogridModel.simulate(state.renewablesLab.energyLab.microgrid));
    const detail=async(text)=>{const el=page.getByText(text,{exact:true});if(!await el.evaluate(e=>e.closest('details').open))await el.click();};
    // The first opening copies the chosen source, scenario, and battery inputs.
    await page.getByLabel('Panel area',{exact:true}).fill('40');
    await page.getByLabel('Operating scenario',{exact:true}).selectOption('clouds');
    await page.getByRole('button',{name:'Storage & demand',exact:true}).click();await ready();
    assert.equal((await settings()).sourceSettings.area,40);assert.equal((await settings()).profileId,'clouds');
    const workbenchSnapshot=await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.settings));
    await detail('Adjust source inputs');await page.getByLabel('Panel area',{exact:true}).fill('60');
    assert.equal(await page.evaluate(()=>JSON.stringify(state.renewablesLab.energyLab.settings)),workbenchSnapshot);
    await page.getByRole('button',{name:'Copy source workbench settings',exact:true}).click();
    assert.equal((await settings()).sourceSettings.area,40);
    // Each source uses its existing 3D mechanism and an independently calculated battery bank.
    const specs=await page.evaluate(()=>StemLab.renewablesEnergyModel.specs.filter(s=>s.id!=='storage'));
    for(const spec of specs){
      await page.getByLabel('Generation technology',{exact:true}).selectOption(spec.id);await ready();
      const profile=await page.evaluate(id=>StemLab.renewablesEnergyModel.programs[id][0],spec.id);
      await page.getByLabel('Generation operating scenario',{exact:true}).selectOption(profile.id);
      await page.getByLabel('Generation units',{exact:true}).fill('2');
      await page.getByLabel('Energy system minute',{exact:true}).fill(String(Math.floor(profile.duration/2)));
      await page.getByRole('button',{name:'Source in 3D',exact:true}).click();await ready();
      let r=await result(),m=Math.floor(profile.duration/2);
      assert.ok(Math.abs(r.rows[m].generation-r.rows[m].sourceRun.power*2)<1e-7);
      assert.equal(await page.locator('canvas').count(),1);
      await page.getByRole('button',{name:'Battery in 3D',exact:true}).click();await ready();
      await page.getByRole('button',{name:'Inspect Battery bank',exact:true}).click();
      await page.getByLabel('Microgrid component explanation',{exact:true}).getByText('Battery bank',{exact:true}).waitFor();
      assert.equal(await page.locator('canvas').count(),1);
      await audit(spec.id+'SystemAxe');
      console.log('Verified '+spec.name+' generation, bank scene, and balance.');
    }
    // Independent workbench settings can be deliberately copied into an existing system.
    await page.getByRole('button',{name:'← 3D workbenches',exact:true}).click();await ready();
    await page.getByRole('button',{name:'Explore Battery storage',exact:true}).click();await ready();
    await page.getByLabel('Battery energy capacity',{exact:true}).fill('200');
    await page.getByLabel('Charge and discharge power limit',{exact:true}).fill('75');
    await page.getByRole('button',{name:'Storage & demand',exact:true}).click();await ready();
    await page.getByRole('button',{name:'Copy battery workbench settings',exact:true}).click();
    assert.equal((await settings()).battery.capacity,200);assert.equal((await settings()).battery.power,75);
    // Starter systems, critical minute selection, and battery benefits.
    await page.getByRole('button',{name:'Clouds and a battery',exact:true}).click();let r=await result();
    assert.equal(r.settings.profileId,'clouds');assert.ok(r.avoidedUnserved>0);assert.ok(r.avoidedCurtailment>0);
    await page.getByRole('button',{name:'First unmet demand',exact:true}).click();
    assert.equal(await page.getByLabel('Energy system minute',{exact:true}).inputValue(),String(r.firstUnserved));
    await page.getByRole('button',{name:'Most curtailed surplus',exact:true}).isDisabled();
    await page.getByLabel('Battery units',{exact:true}).fill('0');r=await result();
    assert.equal(r.avoidedUnserved,0);assert.equal(r.totals.unserved,r.withoutBattery.unserved);
    await page.getByRole('button',{name:'Rising demand later',exact:true}).click();
    assert.equal((await result()).duration,720);
    await page.getByRole('button',{name:'A grid outage',exact:true}).click();r=await result();
    assert.equal(r.duration,240);assert.equal(r.settings.grid,'outage');
    await page.getByRole('button',{name:'Start of grid outage',exact:true}).click();
    assert.equal(await page.getByLabel('Energy system minute',{exact:true}).inputValue(),'84');
    await page.getByLabel('Current electricity balance',{exact:true}).getByText('Grid outage',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Source in 3D',exact:true}).click();await ready();
    await page.screenshot({path:path.join(out,'microgrid-desktop.png'),fullPage:false});
    await page.getByRole('button',{name:'Battery in 3D',exact:true}).click();await ready();
    await page.locator('.rn-energy-stage').screenshot({path:path.join(out,'microgrid-battery.png')});
    // Reserves, connected imports, and no-demand behavior.
    await page.getByLabel('Battery reserve',{exact:true}).fill('90');r=await result();
    assert.equal(r.reserveEnergy,90);assert.equal(r.totals.discharge,0);
    await page.getByLabel('Grid connection',{exact:true}).selectOption('connected');r=await result();
    assert.equal(r.totals.unserved,0);assert.ok(r.totals.grid>0);
    await page.getByLabel('Base demand kW',{exact:true}).fill('0');
    await page.getByText('No demand',{exact:true}).waitFor();await audit('zeroDemandSystemAxe');
    // Outage duration is clamped correctly when moving its start to the last minute.
    await page.getByRole('button',{name:'A grid outage',exact:true}).click();
    await page.getByLabel('Outage starts at',{exact:true}).fill('239');
    assert.equal(await page.getByLabel('Outage duration',{exact:true}).inputValue(),'1');
    await page.getByRole('button',{name:'A grid outage',exact:true}).click();
    // Playback stops at the endpoint and can restart, while flow view releases the renderer.
    await page.getByLabel('Energy system minute',{exact:true}).fill('238');
    await page.getByRole('button',{name:'Play energy system',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('input[aria-label="Energy system minute"]').value==='240');
    await page.getByRole('button',{name:'Play energy system',exact:true}).waitFor();
    await page.getByRole('button',{name:'Play energy system',exact:true}).click();
    await page.waitForFunction(()=>Number(document.querySelector('input[aria-label="Energy system minute"]').value)>0);
    await page.getByRole('button',{name:'Pause energy system',exact:true}).click();
    const stopped=await page.getByLabel('Energy system minute',{exact:true}).inputValue();
    await page.waitForTimeout(350);assert.equal(await page.getByLabel('Energy system minute',{exact:true}).inputValue(),stopped);
    await page.getByRole('button',{name:'Power flow',exact:true}).click();assert.equal(await page.locator('canvas').count(),0);
    await page.getByRole('button',{name:'Battery in 3D',exact:true}).click();await ready();
    await page.evaluate(()=>document.querySelector('canvas').dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
    await page.locator('[data-energy-render-status="failed"]').waitFor();
    await page.getByRole('button',{name:'Retry mechanism 3D',exact:true}).click();await ready();
    // JSON captures full configuration and ledger; CSV excludes an extra energy interval.
    await page.getByLabel('Energy system minute',{exact:true}).fill('100');
    await page.getByLabel('Energy system observation',{exact:true}).fill('The bank helps during the outage, but power and stored energy still limit coverage.');
    const jsonDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export energy system JSON',exact:true}).click();
    await (await jsonDownload).saveAs(path.join(out,'microgrid-investigation.json'));
    const exported=JSON.parse(fs.readFileSync(path.join(out,'microgrid-investigation.json'),'utf8'));
    assert.equal(exported.selectedMinute,100);assert.equal(exported.result.rows.length,241);
    assert.equal(exported.result.settings.outageStart,84);assert.ok(exported.observation.includes('outage'));
    const t=exported.result.totals;
    assert.ok(Math.abs(exported.result.initialStored+t.generation+t.grid-(t.demand-t.unserved)-t.curtailed-t.loss-exported.result.endStored)<1e-7);
    const csvDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Export energy system CSV',exact:true}).click();
    await (await csvDownload).saveAs(path.join(out,'microgrid-minutes.csv'));
    const lines=fs.readFileSync(path.join(out,'microgrid-minutes.csv'),'utf8').trim().split(/\r?\n/);
    assert.equal(lines.length,242);assert.ok(lines[0].includes('stored_kWh'));assert.equal(lines.at(-1).split(',')[1],'0');
    await detail('Read all minute-by-minute results');await detail('Adjust source inputs');await detail('Adjust each battery unit');await detail('Model rules and limits');
    await page.getByRole('button',{name:'Battery energy chart',exact:true}).click();
    await page.getByLabel('Energy system timeline',{exact:true}).screenshot({path:path.join(out,'microgrid-timeline.png')});
    await page.getByLabel('Full energy system results',{exact:true}).screenshot({path:path.join(out,'microgrid-results.png')});
    await audit('expandedLightSystemAxe');await page.evaluate(()=>setTheme(true));await audit('expandedDarkSystemAxe');
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await audit('mobile'+width+'SystemAxe');
      await page.getByLabel('Demand and grid setup',{exact:true}).screenshot({path:path.join(out,'microgrid-controls-'+width+'.png')});
      await page.getByLabel('Full energy system results',{exact:true}).screenshot({path:path.join(out,'microgrid-results-'+width+'.png')});
    }
    const saved=await settings();await page.reload();await ready();
    await page.getByRole('button',{name:'Storage & demand',exact:true}).click();await ready();
    assert.deepEqual(await settings(),saved);assert.equal(await page.getByLabel('Energy system minute',{exact:true}).inputValue(),'100');
    assert.ok((await page.getByLabel('Energy system observation',{exact:true}).inputValue()).includes('outage'));
    await page.getByRole('button',{name:'Open source workbench',exact:true}).click();await ready();
    assert.equal(await page.getByLabel('Panel area',{exact:true}).inputValue(),'40');
    await page.getByRole('button',{name:'Storage & demand',exact:true}).click();await ready();
    assert.equal((await settings()).sourceSettings.area,20);
    await page.getByRole('button',{name:'Lab library',exact:true}).click();
    await page.getByRole('button',{name:/Storage & demand lab/}).first().click();await ready();
    assert.equal(await page.getByLabel('Energy system minute',{exact:true}).inputValue(),'100');
    checks.behavior={eightSources:true,copySource:true,copyBattery:true,independentWorkbenchSettings:true,threeDViews:true,oneRenderer:true,gridOutage:true,batteryReserve:true,zeroDemand:true,noBatteryComparison:true,playPauseEnd:true,contextRecovery:true,jsonExport:true,csvExport:true,persistence:true,libraryNavigation:true,mobileOverflow:false};
    checks.pageErrors=errors;checks.consoleErrors=consoleErrors;
    fs.writeFileSync(path.join(out,'microgrid-browser-results.json'),JSON.stringify(checks,null,2));
    assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);
    console.log(JSON.stringify(checks,null,2));
  }catch(e){if(page)await page.screenshot({path:path.join(out,'microgrid-failure.png'),fullPage:true}).catch(()=>{});throw e;}
  finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
