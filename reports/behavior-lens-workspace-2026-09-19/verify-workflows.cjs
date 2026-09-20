const fs=require('node:fs');const path=require('node:path');const {createRequire}=require('node:module');const {pathToFileURL}=require('node:url');const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const req=createRequire(path.join(process.cwd(),'desktop/web-app/package.json'));const config=req('./tailwind.config.js');config.content=[path.join(process.cwd(),'behavior_lens_module.js')];
 const css=await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;',{from:undefined});fs.writeFileSync(path.join(__dirname,'preview.css'),css.css);
 const workspace={targetBehaviors:[{id:'help',label:'Requests help',measurement:'count',operationalDefinition:'Shows a help card or says help during independent work.'},{id:'break',label:'Requests a break',measurement:'interval',operationalDefinition:'Asks for a short break.'}],abcEntries:[{id:'note1',timestamp:new Date().toISOString(),behaviorId:'help',behavior:'Showed a help card',antecedent:'Independent writing',consequence:'Teacher offered an example'}],observationSessions:[{id:'session1',timestamp:new Date().toISOString(),duration:600,method:'frequency',behaviorId:'help',data:{count:3,rate:0.3}}]};
 let preview=fs.readFileSync(path.join(__dirname,'flow-preview.html'),'utf8');const marker='</script><script src="../../behavior_lens_workspace_module.js">';assert.ok(preview.includes(marker));preview=preview.replace(marker,`localStorage.setItem('behaviorLens_workspace_audit-eagle',${JSON.stringify(JSON.stringify(workspace))});${marker}`);fs.writeFileSync(path.join(__dirname,'workflow-preview.html'),preview);
 const browser=await chromium.launch({headless:true});const results=[];
 try{for(const width of [1280,390,320]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(path.join(__dirname,'workflow-preview.html')).href);await page.getByRole('button',{name:'Review observations',exact:true}).click();await page.getByLabel('Target',{exact:true}).selectOption('help');
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});await page.addScriptTag({path:require.resolve('axe-core')});
  async function capture(state,focus){
   if(focus)await focus.scrollIntoViewIfNeeded();else await page.locator('[data-bl-panel-content]').evaluate(el=>el.scrollTop=0);
   await page.screenshot({path:path.join(__dirname,`workflow-${state}-${width}.png`)});
   const metrics=await page.evaluate(async()=>({overflow:document.documentElement.scrollWidth>innerWidth,dialogOverflow:[...document.querySelectorAll('[role="dialog"]')].some(el=>el.scrollWidth>el.clientWidth+1),axe:(await axe.run(document.querySelector('#root'))).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))}));
   results.push({width,state,errors:[...errors],...metrics});assert.equal(metrics.overflow,false);assert.equal(metrics.dialogOverflow,false);assert.deepEqual(metrics.axe,[]);assert.deepEqual(errors,[]);
  }
  await page.getByRole('button',{name:'Plan or review supports',exact:true}).click();await page.getByLabel('Support to try',{exact:true}).fill('Offer the agreed visual prompt before independent writing.');await page.getByLabel('Person responsible',{exact:true}).fill('Classroom teacher');await page.getByLabel('Start date (optional)',{exact:true}).fill('2026-09-18');await page.getByLabel('Review date (optional)',{exact:true}).fill('2026-09-25');
  await capture('support-form');await page.getByRole('button',{name:'Save strategy',exact:true}).click();await capture('support-saved',page.locator('[data-bl-support-plan]'));
  await page.getByRole('button',{name:'Review all observations for this target',exact:true}).click();await page.getByRole('button',{name:'7 days',exact:true}).click();await page.getByRole('button',{name:'Prepare report from this view',exact:true}).click();
  assert.equal(await page.getByLabel('Report target',{exact:true}).inputValue(),'help');assert.equal(await page.getByLabel('Date range for report',{exact:true}).inputValue(),'week');
  await capture('report-scope');await capture('report-options',page.getByRole('button',{name:'Generate Report',exact:true}));
  await page.getByText('Optional: generate AI recommendations',{exact:true}).click();await capture('report-ai',page.getByText('Optional: generate AI recommendations',{exact:true}));
  await page.getByRole('button',{name:'Back to observation review',exact:true}).click();await page.getByRole('button',{name:'Measure this target',exact:true}).click();await capture('counter',page.locator('[data-bl-recording-target]'));
  assert.equal(await page.getByLabel('Behavior counter label',{exact:true}).inputValue(),'Requests help');await page.getByRole('button',{name:'Add one to Requests help',exact:true}).click();await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByLabel('Target',{exact:true}).selectOption('break');await page.getByRole('button',{name:'Measure this target',exact:true}).click();await capture('interval',page.locator('[data-bl-recording-target]'));
  await page.getByRole('button',{name:'Whole Interval',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Whole Interval',exact:true}).getAttribute('aria-pressed'),'true');
  await page.close();
 }}finally{fs.writeFileSync(path.join(__dirname,'workflow-browser-results.json'),JSON.stringify(results,null,2));await browser.close();}
 console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
