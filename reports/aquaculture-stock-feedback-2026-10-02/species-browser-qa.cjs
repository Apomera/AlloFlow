
const fs=require('fs'),path=require('path'),http=require('http');
const repo=path.resolve(__dirname,'../..');
const {chromium}=require(path.join(repo,'node_modules/playwright'));
const out=path.join(__dirname,'browser-run');fs.mkdirSync(out,{recursive:true});
const original=fs.readFileSync(path.join(repo,'dev-tools/aquatic_browser_qa.cjs'),'utf8');
const start=original.indexOf('function harness(tool) {'),end=original.indexOf('const server=http',start);
const harness=new Function(original.slice(start,end)+';return harness;')();
const files={
 '/stem_lab/stem_tool_aquaculture.js':'stem_lab/stem_tool_aquaculture.js',
 '/desktop/web-app/node_modules/react/umd/react.production.min.js':'desktop/web-app/node_modules/react/umd/react.production.min.js',
 '/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js':'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
 '/dev-tools/.cache/sweep-tailwind.css':'dev-tools/.cache/sweep-tailwind.css',
 '/axe.js':'node_modules/axe-core/axe.min.js'
};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/qa/aquacultureLab'){res.setHeader('content-type','text/html; charset=utf-8');res.end(harness({id:'aquacultureLab',file:'stem_tool_aquaculture.js'}));return;}
 const item=files[url.pathname];if(!item){res.writeHead(404);res.end();return;}
 res.setHeader('content-type',item.endsWith('.css')?'text/css':'application/javascript; charset=utf-8');
 res.end(fs.readFileSync(path.join(repo,item)));
});
function assert(ok,message){if(!ok)throw Error(message);}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 const results=[];
 try{
 for(const width of [1280,390,320]){
 const page=await browser.newPage({viewport:{width,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/qa/aquacultureLab');
 await page.getByRole('button',{name:'Ecosystem builder',exact:true}).click();
 await page.locator('.aq-seasonal-explorer').waitFor();
 assert(await page.locator('.aq-season-months button').count()===12,'12 month controls');
 await page.locator('button').filter({hasText:'Marine heatwave'}).first().click();
 await page.getByRole('button',{name:/^Inspect Jul,/}).focus();
 await page.keyboard.press('Enter');
 assert((await page.locator('#aq-season-month-heading').textContent()).includes('Jul'),'Keyboard month selection');
 assert((await page.locator('#aq-season-inspection').textContent()).includes('Marine heatwave'),'July event');
 assert((await page.locator('#aq-season-inspection').textContent()).includes('Sugar kelp'),'Species diagnosis');
 await page.locator('#aq-season-species').selectOption('kelp');
 for(const metric of ['biomass','survival','stress','progress','temperature']){await page.locator('#aq-season-metric').selectOption(metric);assert((await page.locator('.aq-season-figure').textContent()).includes('Sugar kelp'),'Species chart '+metric);}
 assert((await page.locator('.aq-season-figure').textContent()).includes('2 to 16 C'),'Species thermal reference');
 await page.locator('#aq-season-species').selectOption('phytoplankton');
 assert(!(await page.locator('#aq-season-metric').textContent()).includes('Species survival'),'No support survival metric');
 await page.locator('#aq-season-species').selectOption('system');
 await page.getByRole('button',{name:/^Inspect Jun,/}).click();
 assert(!(await page.locator('#aq-season-inspection').textContent()).includes('Marine heatwave'),'Event only in scheduled month');
 for(const metric of ['oxygen','ammonia','temperature','resilience','biomass','survival','effort']){
  await page.locator('#aq-season-metric').selectOption(metric);
  assert(await page.locator('#aq-season-metric').inputValue()===metric,'Metric '+metric);
 }
 await page.locator('#aq-season-metric').selectOption('oxygen');
 await page.getByRole('button',{name:/^Inspect Jul,/}).click();
 await page.locator('#aq-eco-prediction').fill('I predict a higher oxygen input will improve the oxygen buffer.');
 await page.locator('#aq-eco-observation').fill('My draft compares oxygen and species warnings through the modeled year.');
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace);
 await page.locator('#aq-redesign-choice').selectOption('oxygen');
 const notApplied=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace);
 assert(JSON.stringify(before)===JSON.stringify(notApplied),'Preview must not mutate saved workspace');
 await page.getByRole('button',{name:'Apply preview as scenario B',exact:true}).click();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace);
 assert(after.baselineScenario.water.oxygen===before.water.oxygen,'Capture current A');
 assert(after.water.oxygen===before.water.oxygen+1,'Apply oxygen-only change');
 assert(after.prediction===before.prediction&&after.observation===before.observation,'Draft preserved');
 assert(after.experiments.length===before.experiments.length,'No evidence created by preview');
 await page.locator('#aq-redesign-choice').selectOption('exchange');
 await page.getByRole('button',{name:'Apply preview as scenario B',exact:true}).click();
 const again=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace);
 assert(JSON.stringify(again.baselineScenario)===JSON.stringify(after.baselineScenario),'Keep saved A');
 const downloadEvent=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download timeline CSV',exact:true}).click();
 const download=await downloadEvent;const csvFile=path.join(out,'timeline-'+width+'.csv');await download.saveAs(csvFile);
 const csv=fs.readFileSync(csvFile,'utf8');assert(csv.split('\r\n').length===25,'CSV 24 months plus header');
 assert(csv.includes('Temperature (C)')&&csv.includes('Closing crop biomass index')&&csv.includes('Model version'),'CSV complete values');
 const speciesDownloadEvent=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download species CSV',exact:true}).click();
 const speciesDownload=await speciesDownloadEvent;const speciesFile=path.join(out,'species-'+width+'.csv');await speciesDownload.saveAs(speciesFile);
 const speciesCsv=fs.readFileSync(speciesFile,'utf8');assert(speciesCsv.split('\r\n').length===97,'96 species trace rows plus header');assert(speciesCsv.includes('2026.10-stock-feedback')&&speciesCsv.includes('Readiness target reached'),'Versioned species export');
 await page.getByRole('button',{name:'Save A/B comparison',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace);
 assert(saved.experiments.length===1,'Evidence workflow');
 assert(saved.experiments[0].modelVersion==='2026.10-stock-feedback','Saved model version');assert(saved.experiments[0].currentSummary.species.length===4,'Saved species outcomes');
 await page.reload();
 await page.locator('.aq-seasonal-explorer').waitFor();
 assert((await page.locator('.aq-saved-experiments').textContent()).includes('A/B seasonal comparison'),'Saved evidence reload');
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
 assert(overflow.scroll<=width,'Horizontal overflow '+JSON.stringify(overflow));
 await page.addScriptTag({url:'http://127.0.0.1:'+server.address().port+'/axe.js'});
 const a11y=await page.evaluate(()=>axe.run({include:['.aq-seasonal-explorer','.aq-redesign-preview']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
 assert(a11y.violations.length===0,'Explorer accessibility: '+JSON.stringify(a11y.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));
 await page.locator('#aq-season-species').selectOption('kelp');await page.locator('#aq-season-metric').selectOption('biomass');
 await page.locator('.aq-seasonal-explorer').screenshot({path:path.join(out,'seasonal-'+width+'.png')});
 await page.locator('.aq-redesign-preview').screenshot({path:path.join(out,'redesign-'+width+'.png')});
 if(width===390){
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Forced colors overflow');
  await page.locator('.aq-seasonal-explorer').screenshot({path:path.join(out,'seasonal-forced-colors.png')});
 }
 assert(!errors.length,'Runtime errors '+errors.join(';'));
 results.push({width,checks:['month keyboard','event timing','8 system metrics and individual species traces','preview purity','baseline capture/retention','draft preservation','CSV download','save/reload','reflow','scoped axe'],axeViolations:0,errors});
 await page.close();
 }
// Insert inside the browser harness try block, after the existing width loop.
// These independent pages use the existing browser, server, out, and assert variables.
// Every seed is installed before navigation; no test runner is invoked here.

{
  const missingB320Page = await browser.newPage({ viewport: { width: 320, height: 900 } });
  const missingB320Errors = [];
  missingB320Page.on('pageerror', error => missingB320Errors.push(error.message));
  const missingB320Water = { temperature: 13, salinity: 30, oxygen: 8.8, pH: 8, ammonia: .04, exchange: 82 };
  const missingB320A = { environmentId: 'longline', organisms: { oyster: 2, kelp: 2 }, water: missingB320Water, disturbanceId: 'none' };
  const missingB320State = { lastTopic: 'ecosystem', ecosystemWorkspace: {
    environmentId: 'longline', organisms: { oyster: 2 }, water: missingB320Water, disturbanceId: 'none',
    baselineScenario: missingB320A, prediction: '', observation: '', evidence: {}, experiments: []
  } };
  await missingB320Page.addInitScript(seed => { localStorage.setItem('aquacultureLab.state.v1', JSON.stringify(seed)); }, missingB320State);
  await missingB320Page.goto('http://127.0.0.1:' + server.address().port + '/qa/aquacultureLab');
  await missingB320Page.locator('.aq-seasonal-explorer').waitFor();
  await missingB320Page.locator('#aq-season-species').selectOption('kelp');
  await missingB320Page.locator('#aq-season-metric').selectOption('biomass');
  await missingB320Page.getByRole('button', { name: /^Inspect Jul,/ }).click();
  const missingB320Svg = missingB320Page.locator('.aq-season-figure svg');
  const missingB320BPath = await missingB320Svg.locator(':scope > path[stroke="#5eead4"]').getAttribute('d');
  const missingB320APath = await missingB320Svg.locator(':scope > path[stroke="#93c5fd"]').getAttribute('d');
  assert(!missingB320BPath.trim(), 'Absent B kelp must have no drawn current curve');
  assert(missingB320APath.trim().startsWith('M'), 'Absent B kelp must retain the saved A curve');
  assert(await missingB320Svg.locator('circle').count() === 0, 'Absent B kelp must have no current points');
  const missingB320Reading = missingB320Page.locator('#aq-season-inspection > dl > div').filter({ has: missingB320Page.getByText('Closing species biomass index', { exact: true }) });
  assert((await missingB320Reading.innerText()).includes('B not stocked'), 'Absent B species reading must say not stocked');
  assert(await missingB320Reading.locator('small').count() === 0, 'Absent B species must have no fabricated delta');
  assert((await missingB320Page.locator('#aq-season-inspection').innerText()).includes('This organism is not stocked in B'), 'Absent B explanation');
  assert(await missingB320Page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Missing B reflow at 320px');
  await missingB320Page.addScriptTag({ url: 'http://127.0.0.1:' + server.address().port + '/axe.js' });
  const missingB320Axe = await missingB320Page.evaluate(() => axe.run({ include: ['.aq-seasonal-explorer', '.aq-redesign-preview'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  assert(missingB320Axe.violations.length === 0, 'Missing B accessibility: ' + JSON.stringify(missingB320Axe.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))));
  await missingB320Page.locator('.aq-seasonal-explorer').screenshot({ path: path.join(out, 'missingB320.png') });
  assert(!missingB320Errors.length, 'Missing B runtime errors: ' + missingB320Errors.join('; '));
  results.push({case:'missing B at320',axeViolations:0,errors:missingB320Errors});
  await missingB320Page.close();
}

{
  const supportOnly320Page = await browser.newPage({ viewport: { width: 320, height: 900 } });
  const supportOnly320Errors = [];
  supportOnly320Page.on('pageerror', error => supportOnly320Errors.push(error.message));
  const supportOnly320State = { lastTopic: 'ecosystem', ecosystemWorkspace: {
    environmentId: 'raceway', organisms: { nitrifiers: 2 },
    water: { temperature: 12, salinity: 1, oxygen: 9.4, pH: 7.5, ammonia: .08, exchange: 75 },
    disturbanceId: 'none', baselineScenario: null, prediction: '', observation: '', evidence: {}, experiments: []
  } };
  await supportOnly320Page.addInitScript(seed => { localStorage.setItem('aquacultureLab.state.v1', JSON.stringify(seed)); }, supportOnly320State);
  await supportOnly320Page.goto('http://127.0.0.1:' + server.address().port + '/qa/aquacultureLab');
  await supportOnly320Page.locator('.aq-seasonal-explorer').waitFor();
  await supportOnly320Page.locator('#aq-season-species').selectOption('system');
  await supportOnly320Page.locator('#aq-season-metric').selectOption('survival');
  const supportOnly320Reading = supportOnly320Page.locator('#aq-season-inspection > dl > div').filter({ has: supportOnly320Page.getByText('Crop survival index', { exact: true }) });
  const supportOnly320SurvivalText = await supportOnly320Reading.innerText();
  assert(/not applicable/i.test(supportOnly320SurvivalText), 'Support-only whole-system survival must be not applicable');
  assert(!/(^|[^0-9.])0(?:\.0)?%/.test(supportOnly320SurvivalText), 'Support-only whole-system survival must not imply 0% survival');
  assert((await supportOnly320Page.locator('.aq-time-summary').innerText()).includes('Not applicable'), 'Support-only annual summary must say Not applicable');
  const supportOnly320BPath = await supportOnly320Page.locator('.aq-season-figure svg > path[stroke="#5eead4"]').getAttribute('d');
  assert(!supportOnly320BPath.trim(), 'Not-applicable support survival must have no zero line');
  assert(await supportOnly320Page.locator('.aq-season-figure circle').count() === 0, 'Not-applicable support survival must have no zero points');
  await supportOnly320Page.locator('#aq-season-species').selectOption('nitrifiers');
  const supportOnly320Options = await supportOnly320Page.locator('#aq-season-metric option').evaluateAll(options => options.map(option => ({ value: option.value, label: option.textContent })));
  assert(!supportOnly320Options.some(option => ['biomass', 'survival', 'progress'].includes(option.value)), 'Fixed support must omit crop-only metrics');
  assert(supportOnly320Options.some(option => option.value === 'stress' && option.label.includes('Reference-band stress index')), 'Fixed-support stress label must describe reference bands');
  await supportOnly320Page.locator('#aq-season-metric').selectOption('stress');
  assert((await supportOnly320Page.locator('#aq-season-inspection').innerText()).includes('Fixed support capacity'), 'Fixed-support role explanation');
  assert(await supportOnly320Page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Support-only reflow at 320px');
  await supportOnly320Page.addScriptTag({ url: 'http://127.0.0.1:' + server.address().port + '/axe.js' });
  const supportOnly320Axe = await supportOnly320Page.evaluate(() => axe.run({ include: ['.aq-seasonal-explorer', '.aq-redesign-preview'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  assert(supportOnly320Axe.violations.length === 0, 'Support-only accessibility: ' + JSON.stringify(supportOnly320Axe.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))));
  await supportOnly320Page.locator('.aq-seasonal-explorer').screenshot({ path: path.join(out, 'support-only320.png') });
  assert(!supportOnly320Errors.length, 'Support-only runtime errors: ' + supportOnly320Errors.join('; '));
  results.push({case:'support only at320',axeViolations:0,errors:supportOnly320Errors});
  await supportOnly320Page.close();
}

{
  const legacyReplay320Page = await browser.newPage({ viewport: { width: 320, height: 900 } });
  const legacyReplay320Errors = [];
  legacyReplay320Page.on('pageerror', error => legacyReplay320Errors.push(error.message));
  const legacyReplay320Water = { temperature: 13, salinity: 30, oxygen: 8.8, pH: 8, ammonia: .04, exchange: 82 };
  const legacyReplay320A = { environmentId: 'longline', organisms: { oyster: 2, kelp: 2 }, water: legacyReplay320Water, disturbanceId: 'none' };
  const legacyReplay320B = { ...legacyReplay320A, water: { ...legacyReplay320Water, oxygen: 7.8 } };
  const legacyReplay320Record = {
    id: 'legacy-comparison-browser', kind: 'comparison', savedAt: 1780000000000,
    environmentId: 'longline', organisms: { oyster: 2, kelp: 2 }, status: 'Stable',
    carryingPressure: 50, oxygen: 7.8, ammonia: .04, resilience: 64,
    observation: 'Original recorded explanation comparing oxygen in an earlier classroom model.',
    prediction: 'I expect a smaller oxygen buffer when the input is lower.', evidence: {},
    baselineScenario: legacyReplay320A, currentScenario: legacyReplay320B,
    baselineSummary: { endingBiomass: 7.7, survival: 77, minOxygen: 8.4, peakAmmonia: .1, averageResilience: 62, riskMonths: 2, harvestUnits: 1, operatingEffort: 38 },
    currentSummary: { endingBiomass: 7.3, survival: 73, minOxygen: 7.4, peakAmmonia: .1, averageResilience: 58, riskMonths: 3, harvestUnits: 1, operatingEffort: 38 }
  };
  const legacyReplay320State = { lastTopic: 'ecosystem', ecosystemWorkspace: {
    ...legacyReplay320B, baselineScenario: legacyReplay320A,
    prediction: legacyReplay320Record.prediction, observation: '', evidence: {}, experiments: [legacyReplay320Record]
  } };
  await legacyReplay320Page.addInitScript(seed => { localStorage.setItem('aquacultureLab.state.v1', JSON.stringify(seed)); }, legacyReplay320State);
  await legacyReplay320Page.goto('http://127.0.0.1:' + server.address().port + '/qa/aquacultureLab');
  await legacyReplay320Page.locator('.aq-seasonal-explorer').waitFor();
  assert((await legacyReplay320Page.locator('#aq-investigation-heading').innerText()) !== 'Evidence saved', 'An unversioned comparison must not count as saved current-model evidence');
  const legacyReplay320Frozen = await legacyReplay320Page.evaluate(() => JSON.stringify(window.AquacultureLearningHelpers.sanitizeEcosystemWorkspace(JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace).experiments[0]));
  const legacyReplay320Card = legacyReplay320Page.locator('.aq-experiment-record').first();
  assert((await legacyReplay320Card.locator('.aq-record-model').innerText()).includes('Original unversioned results are kept'), 'Legacy context must be visible before replay');
  await legacyReplay320Card.getByRole('button', { name: /^Replay experiment 1:/ }).focus();
  await legacyReplay320Page.keyboard.press('Enter');
  await legacyReplay320Page.getByRole('button', { name: 'Return to my draft', exact: true }).waitFor();
  assert((await legacyReplay320Page.locator('#aq-investigation-heading').innerText()) !== 'Evidence saved', 'Legacy replay must not claim current-model evidence saved');
  const legacyReplay320After = await legacyReplay320Page.evaluate(() => JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace);
  assert(JSON.stringify(legacyReplay320After.experiments[0]) === legacyReplay320Frozen, 'Replay must keep the original record and summaries frozen');
  assert(legacyReplay320After.experiments[0].baselineSummary.survival === 77 && legacyReplay320After.experiments[0].currentSummary.survival === 73, 'Legacy summary values 77/73 must survive replay');
  assert(legacyReplay320After.observation === '', 'Replayed settings must not create a new evidence explanation');
  assert((await legacyReplay320Page.locator('#aq-eco-save-status').innerText()).includes('Saved settings loaded for replay using model'), 'Replay must visibly identify current-model recalculation');
  assert((await legacyReplay320Card.locator('.aq-record-model').innerText()).includes('current classroom model'), 'Legacy record must explain recalculation');
  await legacyReplay320Card.locator('.aq-saved-inputs > summary').click();
  const legacyReplay320OriginalText = await legacyReplay320Card.locator('.aq-original-results').innerText();
  assert(legacyReplay320OriginalText.includes('A 77') && legacyReplay320OriginalText.includes('B 73'), 'Original results must be reviewable separately from current recalculation');
  assert(await legacyReplay320Page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Legacy replay reflow at 320px');
  await legacyReplay320Page.addScriptTag({ url: 'http://127.0.0.1:' + server.address().port + '/axe.js' });
  const legacyReplay320Axe = await legacyReplay320Page.evaluate(() => axe.run({ include: ['.aq-seasonal-explorer', '.aq-redesign-preview', '.aq-experiment-record'] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  assert(legacyReplay320Axe.violations.length === 0, 'Legacy replay accessibility: ' + JSON.stringify(legacyReplay320Axe.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))));
  await legacyReplay320Page.locator('.aq-experiment-record').screenshot({ path: path.join(out, 'legacy-replay320.png') });
  assert(!legacyReplay320Errors.length, 'Legacy replay runtime errors: ' + legacyReplay320Errors.join('; '));
  results.push({case:'legacy replay at320',axeViolations:0,errors:legacyReplay320Errors});
  await legacyReplay320Page.close();
}

 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);server.close();process.exitCode=1;});


