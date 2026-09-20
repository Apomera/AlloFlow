const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const when = days => { const date = new Date(); date.setDate(date.getDate() - days); date.setHours(9,0,0,0); return date.toISOString(); };
(async () => {
 const req = createRequire(path.join(process.cwd(),'desktop/web-app/package.json'));
 const config=req('./tailwind.config.js');config.content=[path.join(process.cwd(),'behavior_lens_module.js')];
 const css=await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;',{from:undefined});
 fs.writeFileSync(path.join(__dirname,'preview.css'),css.css);
 const workspace={targetBehaviors:[{id:'help',label:'Requests help',aliases:['Help card'],operationalDefinition:'Shows a help card or says help.'},{id:'break',label:'Requests a break',operationalDefinition:'Asks for a short break.'}],
  abcEntries:Array.from({length:11},(_,i)=>({id:'review-'+i,timestamp:when(i>8?i===10?45:0:Math.floor(i/3)),behaviorId:i===9?'break':'help',behavior:i===9?'Asked for a break':'Showed a help card during independent work',antecedent:'Independent writing task',consequence:'Teacher offered an example',setting:'Classroom',observer:'Teacher',notes:'Waited for an example, then continued the activity.',intensity:i%3===0?null:2,duration:i===0?0:20})),
  observationSessions:[{id:'help-session',timestamp:when(0),method:'frequency',duration:1200,behaviorId:'help'},{id:'unassigned-session',timestamp:when(0),method:'frequency',duration:600},{id:'break-session',timestamp:when(0),method:'frequency',duration:600,behaviorId:'break'}]};
 let preview=fs.readFileSync(path.join(__dirname,'flow-preview.html'),'utf8');
 const marker='</script><script src="../../behavior_lens_workspace_module.js">';assert.ok(preview.includes(marker));
 preview=preview.replace(marker,`localStorage.setItem('behaviorLens_workspace_audit-eagle',${JSON.stringify(JSON.stringify(workspace))});${marker}`);
 fs.writeFileSync(path.join(__dirname,'review-preview.html'),preview);
 const browser=await chromium.launch({headless:true});const results=[];
 try {
  for(const width of [1280,390,320]) {
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});page.setDefaultTimeout(60000);
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(pathToFileURL(path.join(__dirname,'review-preview.html')).href);
   await page.getByRole('button',{name:'Review observations',exact:true}).click();
   await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
   await page.addScriptTag({path:require.resolve('axe-core')});
   async function capture(state,focus) {
    if(focus)await focus.scrollIntoViewIfNeeded();else await page.locator('[data-bl-panel-content]').evaluate(el=>el.scrollTop=0);
    await page.screenshot({path:path.join(__dirname,`review-${state}-${width}.png`)});
    const metrics=await page.evaluate(async()=>({overflow:document.documentElement.scrollWidth>innerWidth,dialogOverflow:[...document.querySelectorAll('[role="dialog"]')].some(el=>el.scrollWidth>el.clientWidth+1),axe:(await axe.run(document.querySelector('#root'))).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))}));
    results.push({width,state,errors:[...errors],...metrics});assert.equal(metrics.overflow,false);assert.equal(metrics.dialogOverflow,false);assert.deepEqual(metrics.axe,[]);assert.deepEqual(errors,[]);
   }
   await capture('summary');
   assert.equal(await page.locator('[data-bl-review-charts]').getAttribute('open'),null);
   await page.getByLabel('Target',{exact:true}).selectOption('help');
   await capture('target');
   await page.getByRole('button',{name:'Next notes',exact:true}).click();
   const note=page.locator('[data-bl-review-entry]').first();
   await note.locator('summary').click();
   await capture('note',note);
   await note.getByRole('button',{name:'Edit observation',exact:true}).click();
   await page.getByLabel('Behavior narrative',{exact:true}).fill('Help card shown twice; reviewed note.');
   await page.getByRole('button',{name:'Save Entry',exact:true}).click();
   await page.locator('[data-bl-review]').waitFor();
   assert.equal(await page.getByLabel('Target',{exact:true}).inputValue(),'help');
   assert.ok((await page.locator('[data-bl-review]').textContent()).includes('Page 2 of 2'));
   const charts=page.locator('[data-bl-review-charts]');await charts.locator(':scope > summary').click();
   await capture('charts',charts.locator(':scope > summary'));
   await page.close();
  }
 } finally {
  fs.writeFileSync(path.join(__dirname,'review-browser-results.json'),JSON.stringify(results,null,2));
  await browser.close();
 }
 console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
