
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
 assert(csv.includes('Temperature (C)')&&csv.includes('Biomass index'),'CSV complete values');
 await page.getByRole('button',{name:'Save A/B comparison',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('aquacultureLab.state.v1')).ecosystemWorkspace);
 assert(saved.experiments.length===1,'Evidence workflow');
 await page.reload();
 await page.locator('.aq-seasonal-explorer').waitFor();
 assert((await page.locator('.aq-saved-experiments').textContent()).includes('A/B seasonal comparison'),'Saved evidence reload');
 const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
 assert(overflow.scroll<=width,'Horizontal overflow '+JSON.stringify(overflow));
 await page.addScriptTag({url:'http://127.0.0.1:'+server.address().port+'/axe.js'});
 const a11y=await page.evaluate(()=>axe.run({include:['.aq-seasonal-explorer','.aq-redesign-preview']},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
 assert(a11y.violations.length===0,'Explorer accessibility: '+JSON.stringify(a11y.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))));
 await page.locator('.aq-seasonal-explorer').screenshot({path:path.join(out,'seasonal-'+width+'.png')});
 await page.locator('.aq-redesign-preview').screenshot({path:path.join(out,'redesign-'+width+'.png')});
 if(width===390){
  await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Forced colors overflow');
  await page.locator('.aq-seasonal-explorer').screenshot({path:path.join(out,'seasonal-forced-colors.png')});
 }
 assert(!errors.length,'Runtime errors '+errors.join(';'));
 results.push({width,checks:['month keyboard','event timing','7 metrics','preview purity','baseline capture/retention','draft preservation','CSV download','save/reload','reflow','scoped axe'],axeViolations:0,errors});
 await page.close();
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.stack);server.close();process.exitCode=1;});


