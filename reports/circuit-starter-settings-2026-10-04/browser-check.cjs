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
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit experiment starter settings</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:1}),view:'schematic',observations:[StemLab.circuitActiveObservation({input:.8},'Keep this note.')],reflection:'My explanation.'}});window.state=data;window.setState=update;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:update,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });
    const panel=page.locator('.circuit-active-starter'),projects=page.locator('.circuit-active-projects');await panel.waitFor();
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const restore=panel.getByRole('button',{name:'Restore starter values',exact:true});
    const project=key=>projects.locator('button').filter({has:page.locator('span',{hasText:{manual:'Manual control',light:'Light sensor',dark:'Dark sensor'}[key]})});
    const click=async locator=>{await locator.focus();await page.keyboard.press('Space');await settle();};
    const design=()=>page.evaluate(()=>StemLab.circuitActiveDesign(state._circuitActive));
    const expected=key=>page.evaluate(key=>StemLab.circuitActiveDesign({project:key}),key);
    const seed=async key=>{await page.evaluate(key=>setState(prev=>({...prev,_circuitActive:{...prev._circuitActive,...StemLab.circuitActiveDesign({project:key,input:1,light:25,supply:7,baseResistance:15000,loadResistance:330,dividerResistance:20000,beta:80}),probeRed:'base',probeBlack:'drive',reference:{version:1,design:StemLab.circuitActiveDesign({input:2})},lessonRecords:{gain:{choice:'more',tested:true,explanation:'Guided writing.'}},undo:[],redo:[]}})),key);await settle();};
    async function capture(name,width){
      await page.setViewportSize({width,height:1000});await settle();await panel.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
      const geometry=await panel.evaluate(el=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,width:el.clientWidth,scrollWidth:el.scrollWidth,values:[...el.querySelectorAll('dd bdi')].map(el=>({text:el.textContent,direction:getComputedStyle(el).direction})),status:el.querySelector('.circuit-starter-status').textContent}));
      assert.ok(geometry.pageWidth<=width+1);assert.ok(geometry.scrollWidth<=geometry.width+1);for(const value of geometry.values)assert.equal(value.direction,'ltr');
      const violations=await panel.evaluate(async el=>(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));assert.deepEqual(violations,[]);
      const file=name+'.png';await panel.screenshot({path:path.join(__dirname,file),animations:'disabled'});result.views.push({name,width,geometry,axeViolations:violations,file,sha256:hash(fs.readFileSync(path.join(__dirname,file)))});
    }
    await seed('manual');const custom=await design(),before=await page.evaluate(()=>JSON.stringify(state));
    await click(project('manual'));assert.equal(await page.evaluate(()=>JSON.stringify(state)),before);
    await capture('desktop-custom',1280);await click(panel.locator('summary'));await capture('desktop-preview',1280);await capture('small-phone-preview',320);
    await click(restore);assert.deepEqual(await design(),await expected('manual'));assert.equal(await restore.isDisabled(),true);assert.equal(await page.evaluate(()=>state._circuitActive.undo.length),1);
    await capture('phone-restored',390);await click(page.getByRole('button',{name:'Undo active edit',exact:true}));assert.deepEqual(await design(),custom);assert.equal(await restore.isEnabled(),true);
    await click(page.getByRole('button',{name:'Redo active edit',exact:true}));assert.deepEqual(await design(),await expected('manual'));
    const kept=await page.evaluate(()=>({reflection:state._circuitActive.reflection,note:state._circuitActive.observations[0].note,reference:state._circuitActive.reference.design.input,guided:state._circuitActive.lessonRecords.gain.explanation,red:state._circuitActive.probeRed,black:state._circuitActive.probeBlack}));assert.deepEqual(kept,{reflection:'My explanation.',note:'Keep this note.',reference:2,guided:'Guided writing.',red:'base',black:'drive'});
    result.workflows.push({name:'Selected experiment leaves custom settings intact; starter reset is one reversible edit',savedWorkPreserved:true});
    await seed('manual');await click(project('light'));assert.deepEqual(await design(),await expected('light'));await capture('phone-sensor-preview',390);
    await click(page.getByRole('button',{name:'Undo active edit',exact:true}));assert.deepEqual(await design(),custom);await click(page.getByRole('button',{name:'Redo active edit',exact:true}));assert.deepEqual(await design(),await expected('light'));
    await seed('dark');const sensorBefore=await page.evaluate(()=>JSON.stringify(state));await click(project('dark'));assert.equal(await page.evaluate(()=>JSON.stringify(state)),sensorBefore);await click(restore);assert.deepEqual(await design(),await expected('dark'));
    result.workflows.push({name:'Experiment switching loads previewed starters and undo recovers the custom setup; sensor reset uses sensor defaults'});
    await seed('light');await page.emulateMedia({forcedColors:'active'});await capture('forced-colors',390);await page.emulateMedia({forcedColors:'none'});
    await panel.evaluate(el=>el.dir='rtl');await capture('rtl-preview',390);await panel.evaluate(el=>el.removeAttribute('dir'));
    assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),result.sourceSha256);result.passed=true;
  }catch(error){result.failure=error.stack;throw error;}finally{await browser.close();result.browserClosed=true;fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({passed:result.passed,views:result.views.length,workflows:result.workflows.length,sourceSha256:result.sourceSha256}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
