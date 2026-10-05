const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const sourcePath=path.join(root,'stem_lab/stem_tool_circuit.js'),source=fs.readFileSync(sourcePath,'utf8');
const result={sourceSha256:hash(source),scriptSha256:hash(fs.readFileSync(__filename)),errors:[],workflows:[],views:[]};
(async()=>{
  assert.equal(result.sourceSha256,JSON.parse(fs.readFileSync(path.join(__dirname,'source-changes.json'))).sourceSha256);
  assert.equal(hash(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_circuit.js'))),result.sourceSha256);
  assert.ok(!fs.existsSync(path.join(__dirname,'browser-results.json')),'Archive previous results before rerunning.');
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>result.errors.push(e.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit operating region exploration</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:1}),view:'schematic',observations:[StemLab.circuitActiveObservation({input:.8},'Keep this note.')],reflection:'My explanation.'}});window.state=data;window.setState=update;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:update,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });
    const explorer=page.locator('.circuit-active-regions'),tuning=page.locator('.circuit-active-component-tuning');let panel=explorer;await explorer.waitFor();
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const region=id=>explorer.locator('.circuit-region-card[data-region="'+id+'"]');
    const action=async locator=>{await locator.focus();await page.keyboard.press('Space');await settle();};
    const seed=async patch=>{await page.evaluate(patch=>setState(prev=>({...prev,_circuitActive:{...prev._circuitActive,...StemLab.circuitActiveDesign({input:1,...patch}),undo:[],redo:[]}})),patch);await settle();};
    async function capture(name,width){
      await page.setViewportSize({width,height:1000});await settle();await panel.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
      const geometry=await panel.evaluate(el=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,width:el.clientWidth,scrollWidth:el.scrollWidth,examples:[...el.querySelectorAll('.circuit-region-example bdi')].map(el=>({text:el.textContent,direction:getComputedStyle(el).direction})),currentLabels:el.querySelectorAll('.circuit-region-current').length}));
      assert.ok(geometry.pageWidth<=width+1);assert.ok(geometry.scrollWidth<=geometry.width+1);for(const example of geometry.examples)assert.equal(example.direction,'ltr');
      if(await panel.locator('.circuit-region-balance').count())assert.deepEqual(await panel.locator('.circuit-region-balance strong bdi').evaluateAll(els=>els.map(el=>getComputedStyle(el).direction)),['ltr','ltr','ltr']);
      const violations=await panel.evaluate(async el=>(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));assert.deepEqual(violations,[]);
      const file=name+'.png';await panel.screenshot({path:path.join(__dirname,file),animations:'disabled'});result.views.push({name,width,geometry,axeViolations:violations,file,sha256:hash(fs.readFileSync(path.join(__dirname,file)))});
    }
    await capture('desktop-examples',1280);await capture('phone-examples',390);
    const expected=await page.evaluate(()=>StemLab.circuitActiveRegions(state._circuitActive).regions.find(r=>r.id==='saturated').example);
    await action(region('saturated').getByRole('button',{name:'Explore saturation',exact:true}));assert.equal(await page.evaluate(()=>state._circuitActive.input),expected);assert.equal(await region('saturated').locator('.circuit-region-current').textContent(),'Current region');
    result.workflows.push({name:'Region preview applies its calculated example and updates the current-region label'});
    await seed({baseResistance:100000,beta:20,loadResistance:100});await capture('desktop-unavailable',1280);await capture('small-phone-unavailable',320);
    const before=await page.evaluate(()=>JSON.stringify(state));assert.equal(await region('saturated').getByRole('button',{name:'Explore saturation',exact:true}).isDisabled(),true);
    await action(region('saturated').getByRole('button',{name:'Adjust components to explore saturation',exact:true}));assert.equal(await tuning.evaluate(el=>el.open),true);assert.equal(await tuning.locator(':scope > summary').evaluate(el=>el===document.activeElement),true);assert.equal(await page.evaluate(()=>JSON.stringify(state)),before);
    panel=tuning;await capture('phone-component-tuning',390);
    const resistance=tuning.getByRole('spinbutton',{name:'Base resistance (Ω) exact value',exact:true});await resistance.fill('1000');await resistance.press('Enter');await settle();assert.equal(await page.evaluate(()=>state._circuitActive.undo.length),1);
    const returnButton=tuning.getByRole('button',{name:'Explore operating regions',exact:true});await action(returnButton);assert.equal(await explorer.locator('h4').evaluate(el=>el===document.activeElement),true);assert.equal(await region('saturated').getByRole('button',{name:'Explore saturation',exact:true}).isEnabled(),true);
    await action(region('saturated').getByRole('button',{name:'Explore saturation',exact:true}));assert.equal(await page.evaluate(()=>StemLab.solveActiveCircuit(state._circuitActive).region),'saturated');assert.equal(await page.evaluate(()=>state._circuitActive.undo.length),2);
    const kept=await page.evaluate(()=>({reflection:state._circuitActive.reflection,note:state._circuitActive.observations[0].note}));assert.deepEqual(kept,{reflection:'My explanation.',note:'Keep this note.'});
    result.workflows.push({name:'Unavailable region opens component settings; one edit enables saturation; return restores region-heading focus',navigationPreservesState:true,savedWorkPreserved:true});
    panel=explorer;await seed({baseResistance:100000,beta:20,loadResistance:100});await page.emulateMedia({forcedColors:'active'});await capture('forced-colors',390);await page.emulateMedia({forcedColors:'none'});
    await explorer.evaluate(el=>el.dir='rtl');await capture('rtl-examples',390);await explorer.evaluate(el=>el.removeAttribute('dir'));
    assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),result.sourceSha256);result.passed=true;
  }catch(error){result.failure=error.stack;throw error;}finally{await browser.close();result.browserClosed=true;fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({passed:result.passed,views:result.views.length,workflows:result.workflows.length,sourceSha256:result.sourceSha256}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
