
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
    page=await browser.newPage({viewport:{width:1280,height:1050},reducedMotion:'reduce'});page.setDefaultTimeout(60000);
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
    await page.goto('http://127.0.0.1:'+server.address().port);
    const ready=async()=>{await page.locator('[data-energy-render-status="ready"]').waitFor();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
    await ready();await page.addScriptTag({url:'/axe.js'});
    const audit=async(label)=>{await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));checks[label]=await page.evaluate(async()=>{const r=await axe.run('.rn-microgrid',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});assert.deepEqual(checks[label],[],label);};
    const analysis=()=>page.evaluate(()=>StemLab.renewablesMicrogridModel.supplyGaps(state.renewablesLab.energyLab.microgrid));
    const field=(label,value)=>page.getByLabel(label,{exact:true}).fill(String(value));
    const detail=async(text)=>{const el=page.getByText(text,{exact:true});if(!await el.evaluate(e=>e.closest('details').open))await el.click();};
    const close=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(Math.abs(a),Math.abs(b),1e-20)*1e-8,a+' != '+b);
    const parsedCsv=file=>fs.readFileSync(path.join(out,file),'utf8').trim().split(/\r?\n/).map(line=>{let row=[],value='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(value);value='';}else value+=c;}row.push(value);return row;});
    const download=async(label,name)=>{const pending=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();await(await pending).saveAs(path.join(out,name));};
    const focusLabel=label=>page.waitForFunction(label=>document.activeElement.getAttribute('aria-label')===label,label);
    const open=async()=>{await page.getByRole('button',{name:'Supply gap explorer',exact:true}).click();await focusLabel('Supply gap explorer');};
    await page.getByRole('button',{name:'Storage & demand',exact:true}).click();await ready();
    await page.getByRole('button',{name:'Explain a supply gap',exact:true}).click();await ready();await focusLabel('Supply gap explorer');
    let a=await analysis();assert.equal(a.localEpisodes.length,1);assert.equal(a.unservedEpisodes.length,1);close(a.totals.localGap,24);close(a.totals.power,12);close(a.totals.held,12);close(a.totals.unserved,7.5);
    checks.demonstration={localGapKWh:a.totals.localGap,powerLimitKWh:a.totals.power,strategyHeldKWh:a.totals.held,unservedKWh:a.totals.unserved,unservedWindow:[a.unservedEpisodes[0].start,a.unservedEpisodes[0].end]};
    await audit('gapLightAxe');await page.getByLabel('Supply gap explorer',{exact:true}).screenshot({path:path.join(out,'supply-gaps-desktop.png')});
    await page.getByLabel('Gaps to investigate',{exact:true}).selectOption('unserved');await detail('What to investigate next');await audit('gapUnservedAxe');
    await page.getByLabel('Selected supply gap',{exact:true}).screenshot({path:path.join(out,'supply-gaps-selected.png')});
    for(const [label,minute] of [['Inspect gap start in 3D',90],['Inspect peak gap in 3D',a.unservedEpisodes[0].peakMinute],['Inspect final gap minute in 3D',149]]){
      await page.getByRole('button',{name:label,exact:true}).focus();await page.keyboard.press('Enter');await ready();
      assert.equal(await page.getByLabel('Energy system minute',{exact:true}).inputValue(),String(minute));assert.ok(await page.evaluate(()=>document.activeElement.classList.contains('rn-energy-stage')));assert.equal(await page.locator('canvas').count(),1);
    }
    await page.getByRole('button',{name:'Inspect peak gap in 3D',exact:true}).click();await ready();await page.locator('.rn-energy-stage').screenshot({path:path.join(out,'supply-gaps-battery-3d.png')});
    await page.getByLabel('Current electricity balance',{exact:true}).screenshot({path:path.join(out,'supply-gaps-minute.png')});
    for(const [button,label] of [['Open battery design bench','Battery design bench'],['Open demand shifting','Demand shifting bench'],['Open outage timing study','Outage timing study']]){
      await page.getByRole('button',{name:button,exact:true}).click();await focusLabel(label);await open();
    }
    await page.evaluate(()=>setTheme(true));await audit('gapDarkAxe');await page.evaluate(()=>setTheme(false));
    await page.getByLabel('Supply-gap observation',{exact:true}).fill('Power limits and held reserve both contribute. The grid covers local gaps outside the outage.');
    await page.getByLabel('Sort supply gaps',{exact:true}).selectOption('time');
    await download('Export gap episodes CSV','supply-gaps-unserved.csv');
    let csv=parsedCsv('supply-gaps-unserved.csv');assert.equal(csv.length,2);assert.deepEqual(csv[1].slice(0,4),['unserved','90','150','60']);close(Number(csv[1][6]),7.5);assert.equal(JSON.parse(csv[1][csv[0].indexOf('settings_json')]).reserve,20);
    await page.getByLabel('Gaps to investigate',{exact:true}).selectOption('local');await download('Export gap episodes CSV','supply-gaps-local.csv');
    csv=parsedCsv('supply-gaps-local.csv');assert.deepEqual(csv[1].slice(0,4),['local','0','240','240']);close(Number(csv[1][4]),24);
    await download('Export gap minutes CSV','supply-gaps-minutes.csv');csv=parsedCsv('supply-gaps-minutes.csv');assert.equal(csv.length,242);
    for(const row of csv.slice(1)){close(Number(row[1]),Number(row[2])+Number(row[3]));close(Number(row[1]),row.slice(4,8).reduce((n,s)=>n+Number(s),0));}assert.ok(csv.at(-1).slice(1).every(s=>Number(s)===0));
    await download('Export energy system JSON','supply-gaps-investigation.json');let json=JSON.parse(fs.readFileSync(path.join(out,'supply-gaps-investigation.json'),'utf8'));
    assert.equal(json.modelVersion,5);assert.equal(json.supplyGaps.result.version,1);assert.equal(json.supplyGaps.observation,'Power limits and held reserve both contribute. The grid covers local gaps outside the outage.');close(json.supplyGaps.result.totals.localGap,json.result.totals.grid+json.result.totals.unserved);
    // Inspector preferences and observations do not alter the recorded simulation settings.
    await page.getByLabel('Outage start samples',{exact:true}).selectOption('5');await page.getByRole('button',{name:'Run outage timing study',exact:true}).click();await page.getByRole('button',{name:'Run battery design study',exact:true}).click();
    await page.getByLabel('Supply-gap observation',{exact:true}).fill('Saved gap observation.');await page.getByLabel('Gaps to investigate',{exact:true}).selectOption('unserved');
    assert.equal(await page.getByText('System inputs changed. This study retains the recorded design. Run again to test the current system.',{exact:true}).count(),0);
    assert.equal(await page.getByText('System inputs changed. These battery designs retain the recorded conditions. Run again to compare the current system.',{exact:true}).count(),0);
    await field('Battery reserve',0);a=await analysis();assert.ok(a.totals.energy>0);assert.equal(a.totals.held,0);
    await page.getByRole('button',{name:'Restore design baseline',exact:true}).click();a=await analysis();close(a.totals.held,12);assert.equal(await page.getByLabel('Supply-gap observation',{exact:true}).inputValue(),'Saved gap observation.');
    await page.getByRole('button',{name:'Inspect Fixed reserve outage starting at 90 min',exact:true}).click();await ready();assert.deepEqual((await analysis()).settings.flex,a.settings.flex);await audit('gapCapturedReplayAxe');
    const persisted=await page.evaluate(()=>JSON.parse(JSON.stringify(state)));await page.reload();await ready();await page.evaluate(p=>setState(p),persisted);await ready();await page.addScriptTag({url:'/axe.js'});
    assert.equal(await page.getByLabel('Gaps to investigate',{exact:true}).inputValue(),'unserved');assert.equal(await page.getByLabel('Sort supply gaps',{exact:true}).inputValue(),'time');assert.equal(await page.getByLabel('Supply-gap observation',{exact:true}).inputValue(),'Saved gap observation.');
    // Empty and restricted cases distinguish no equipment, no energy, and no unmet demand.
    await page.getByLabel('Grid connection',{exact:true}).selectOption('connected');await page.getByText('All demand is served in this replay. Switch to all local supply gaps to see where grid backup was needed.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Inspect peak gap in 3D',exact:true}).count(),0);await audit('gapGridCoveredAxe');
    await page.getByLabel('Gaps to investigate',{exact:true}).selectOption('local');await field('Battery units',0);a=await analysis();close(a.totals.noBank,32);assert.equal(a.totals.power+a.totals.energy+a.totals.held,0);await page.getByRole('button',{name:'Inspect peak gap in 3D',exact:true}).click();await ready();assert.equal(await page.getByRole('button',{name:'Source in 3D',exact:true}).getAttribute('aria-pressed'),'true');assert.equal(await page.locator('canvas').count(),1);await audit('gapNoBankAxe');
    await field('Battery units',1);await detail('Adjust each battery unit');await field('Charge and discharge power limit',0);a=await analysis();close(a.totals.power,32);assert.equal(a.totals.held,0);await audit('gapZeroPowerAxe');
    await field('Base demand kW',0);await page.getByText('No demand is scheduled, so there are no supply gaps.',{exact:true}).waitFor();await audit('gapNoDemandAxe');
    await download('Export gap episodes CSV','supply-gaps-empty.csv');assert.equal(parsedCsv('supply-gaps-empty.csv').length,1);
    await field('Base demand kW',1);await detail('Adjust source inputs');await field('Direct irradiance',1000);a=await analysis();assert.equal(a.localEpisodes.length,0);await audit('gapSurplusAxe');
    await page.getByRole('button',{name:'Shift demand into daylight',exact:true}).click();a=await analysis();assert.equal(a.settings.flex.enabled,true);close(a.totals.localGap,a.totals.unserved);assert.ok(a.localEpisodes.length>1);await audit('gapShiftedDemandAxe');
    // A synthetic rapidly alternating resource stresses pagination using the real minute model.
    await page.getByRole('button',{name:'Explain a supply gap',exact:true}).click();await field('Battery units',0);await field('Base demand kW',2);await detail('Adjust source inputs');await field('Direct irradiance',1000);
    await page.evaluate(()=>{const p=StemLab.renewablesEnergyModel.programs.solarPv.find(p=>p.id==='clouds');window.originalGapPoints=JSON.parse(JSON.stringify(p.points));p.points=Array.from({length:61},(_,i)=>[i*2,i%2]);});
    await page.getByLabel('Generation operating scenario',{exact:true}).selectOption('clouds');a=await analysis();assert.ok(a.localEpisodes.length>16);assert.equal(await page.getByLabel('Supply gap periods',{exact:true}).getByRole('button').count(),8);
    await page.getByRole('button',{name:'Next gap periods',exact:true}).click();assert.equal(await page.evaluate(()=>state.renewablesLab.energyLab.microgrid.gapExplorer.page),1);await page.getByRole('button',{name:'Previous gap periods',exact:true}).click();
    await page.getByLabel('Sort supply gaps',{exact:true}).selectOption('duration');await page.getByLabel('Sort supply gaps',{exact:true}).selectOption('time');
    const period=page.getByLabel('Supply gap periods',{exact:true}).getByRole('button').nth(3);await period.focus();await page.keyboard.press('Enter');assert.equal(await period.getAttribute('aria-pressed'),'true');
    await audit('gapManyEpisodesAxe');await page.getByLabel('Supply gap explorer',{exact:true}).screenshot({path:path.join(out,'supply-gaps-many.png')});checks.syntheticStressEpisodeCount=a.localEpisodes.length;
    for(const width of [390,320]){await page.setViewportSize({width,height:844});await audit('gapMobile'+width+'Axe');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.getByLabel('Supply gap summary',{exact:true}).screenshot({path:path.join(out,'supply-gaps-summary-'+width+'.png')});await page.getByLabel('Selected supply gap',{exact:true}).screenshot({path:path.join(out,'supply-gaps-selected-'+width+'.png')});const timeline=page.getByLabel('Supply gap timeline',{exact:true});await timeline.focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>document.querySelector('[aria-label="Supply gap timeline"]').scrollLeft>0);}
    await page.setViewportSize({width:1280,height:1050});await page.evaluate(()=>{StemLab.renewablesEnergyModel.programs.solarPv.find(p=>p.id==='clouds').points=window.originalGapPoints;});
    await page.getByRole('button',{name:'Explain a supply gap',exact:true}).click();
    const specs=await page.evaluate(()=>StemLab.renewablesEnergyModel.specs.filter(s=>s.id!=='storage'));
    for(const spec of specs){await page.getByLabel('Generation technology',{exact:true}).selectOption(spec.id);const profile=await page.evaluate(id=>StemLab.renewablesEnergyModel.programs[id][0],spec.id);await page.getByLabel('Generation operating scenario',{exact:true}).selectOption(profile.id);a=await analysis();close(a.totals.localGap,a.totals.grid+a.totals.unserved);close(a.totals.localGap,a.totals.noBank+a.totals.power+a.totals.energy+a.totals.held);if(a.localEpisodes.length){await page.getByRole('button',{name:'Inspect peak gap in 3D',exact:true}).click();await ready();assert.equal(await page.locator('canvas').count(),1);}await audit(spec.id+'GapAxe');console.log('Verified supply gap analysis with '+spec.name+'.');}
    checks.behavior={localVersusUnserved:true,orderedGapAccounting:true,exactStorageBoundaries:true,peakAndBoundary3DInspection:true,noBankUsesSourceScene:true,oneRenderer:true,keyboardSelectionAndFocus:true,linkedBenches:true,currentInputRecalculation:true,capturedStudyCoexistence:true,preferencesDoNotChangeStudies:true,jsonExport:true,episodeCsvProvenance:true,minuteCsvAccounting:true,emptyCsv:true,persistence:true,noDemand:true,noBank:true,zeroPower:true,surplus:true,demandShifting:true,eightSources:true,sortAndPagination:true,mobileOverflow:false,mobileKeyboardTimelineScroll:true};
    checks.pageErrors=errors;checks.consoleErrors=consoleErrors;fs.writeFileSync(path.join(out,'supply-gaps-browser-results.json'),JSON.stringify(checks,null,2));assert.deepEqual(errors,[]);assert.deepEqual(consoleErrors,[]);console.log(JSON.stringify(checks,null,2));
  }catch(e){if(page)await page.screenshot({path:path.join(out,'supply-gaps-failure.png'),fullPage:true}).catch(()=>{});throw e;}
  finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
