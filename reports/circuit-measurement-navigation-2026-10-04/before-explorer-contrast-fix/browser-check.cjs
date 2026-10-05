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
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit measurement navigation</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:1}),view:'schematic',observations:[StemLab.circuitActiveObservation({input:.8},'Keep this note.')],reflection:'My explanation.'}});window.state=data;window.setState=update;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:update,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });
    const meter=page.locator('.circuit-active-meter'),explorer=page.locator('.circuit-voltage-explorer'),heading=meter.locator('h4'),output=meter.locator('output');await meter.waitFor();
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const click=async locator=>{await locator.focus();await page.keyboard.press('Space');await settle();};
    const action=part=>explorer.locator('.circuit-voltage-reading[data-voltage-part="'+part+'"] button'),back=()=>meter.locator('.circuit-meter-return button');
    const protectedState=()=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(state._circuitActive).filter(([key])=>!['probeRed','probeBlack'].includes(key)))));
    const authored=()=>page.evaluate(()=>JSON.stringify({observations:state._circuitActive.observations,reflection:state._circuitActive.reflection,reference:state._circuitActive.reference,lessonRecords:state._circuitActive.lessonRecords}));
    const focused=locator=>locator.evaluate(el=>el===document.activeElement);
    result.focusChecks=[];
    async function measure(part,expected){await click(action(part));assert.equal(await output.textContent(),expected);assert.equal(await focused(heading),true);
      const geometry=await heading.evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('.circuit-active-meter').querySelector('output').getBoundingClientRect();return {headingTop:a.top,headingBottom:a.bottom,readingTop:b.top,readingBottom:b.bottom,height:innerHeight};});
      assert.ok(geometry.headingTop>=-1&&geometry.headingBottom<=geometry.height);assert.ok(geometry.readingTop>=-1&&geometry.readingBottom<=geometry.height);result.focusChecks.push({direction:'meter',part,reading:expected,...geometry});
      assert.equal(await back().getAttribute('aria-controls'),await action(part).getAttribute('id'));
    }
    async function returnTo(part){const before=await page.evaluate(()=>JSON.stringify(state));await click(back());assert.equal(await focused(action(part)),true);assert.equal(await page.evaluate(()=>JSON.stringify(state)),before);assert.equal(await back().count(),0);
      const geometry=await action(part).evaluate(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight};});assert.ok(geometry.top>=-1&&geometry.bottom<=geometry.height);result.focusChecks.push({direction:'explorer',part,...geometry});
    }
    async function capture(name,width,target){
      await page.setViewportSize({width,height:1000});await settle();await target.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
      const geometry=await target.evaluate(el=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,width:el.clientWidth,scrollWidth:el.scrollWidth,values:[...el.querySelectorAll('bdi[dir=ltr]')].map(el=>({text:el.textContent,direction:getComputedStyle(el).direction})),focusedId:el.contains(document.activeElement)?document.activeElement.id:null}));
      assert.ok(geometry.pageWidth<=width+1);assert.ok(geometry.scrollWidth<=geometry.width+1);for(const value of geometry.values)assert.equal(value.direction,'ltr');
      const violations=await target.evaluate(async el=>(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));assert.deepEqual(violations,[]);
      const file=name+'.png';await target.screenshot({path:path.join(__dirname,file),animations:'disabled'});result.views.push({name,width,geometry,axeViolations:violations,file,sha256:hash(fs.readFileSync(path.join(__dirname,file)))});
    }
    await page.evaluate(()=>setState(prev=>({...prev,_circuitActive:{...prev._circuitActive,probeRed:'base',probeBlack:'drive',lessonRecords:{gain:{choice:'more',tested:true,explanation:'Keep this lesson.'}},reference:{version:1,design:StemLab.circuitActiveDesign({input:2})},undo:[StemLab.circuitActiveDesign({input:.9})],redo:[StemLab.circuitActiveDesign({input:2})]}})));await settle();
    const before=await protectedState(),work=await authored();assert.equal(await back().count(),0);await capture('desktop-explorer',1280,explorer);
    await measure('lamp','660.00 mV');await capture('desktop-lamp-meter',1280,meter);await returnTo('lamp');await measure('transistor','4.34V');await returnTo('transistor');await measure('transistor','4.34V');await returnTo('transistor');
    await page.setViewportSize({width:320,height:1000});await measure('lamp','660.00 mV');await capture('small-phone-meter',320,meter);
    const reverse=page.getByRole('button',{name:'Reverse active probes',exact:true});await click(reverse);assert.equal(await focused(reverse),true);assert.equal(await output.textContent(),'-660.00 mV');await returnTo('lamp');assert.equal(await action('lamp').getAttribute('aria-pressed'),'false');await capture('phone-return-explorer',390,explorer);
    await measure('lamp','660.00 mV');assert.equal(await protectedState(),before);await returnTo('lamp');
    result.workflows.push({name:'Keyboard measurement focuses the updated visible reading; returning restores the exact control; repeat requests work; reversing probes keeps focus on the probe control',settingsAndSavedWorkPreserved:true});
    await click(page.locator('.circuit-active-projects button').filter({has:page.locator('span',{hasText:'Light sensor'})}));await measure('transistor','2.36V');await capture('phone-sensor-meter',390,meter);assert.equal(await authored(),work);await returnTo('transistor');
    await measure('lamp','2.64V');await page.emulateMedia({forcedColors:'active'});await capture('forced-colors-meter',390,meter);await returnTo('lamp');await capture('forced-colors-explorer',390,explorer);await page.emulateMedia({forcedColors:'none'});
    await meter.evaluate(el=>el.dir='rtl');await explorer.evaluate(el=>el.dir='rtl');await measure('transistor','2.36V');await capture('rtl-meter',390,meter);await returnTo('transistor');await capture('rtl-explorer',390,explorer);
    assert.equal(await explorer.locator('dd').count(),await explorer.locator('dd bdi[dir=ltr]').count());assert.equal(await authored(),work);
    result.workflows.push({name:'Sensor measurements keep exact return destinations through high contrast and right-to-left layouts',authoredWorkPreserved:true});
    assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),result.sourceSha256);result.passed=true;
  }catch(error){result.failure=error.stack;throw error;}finally{await browser.close();result.browserClosed=true;fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({passed:result.passed,views:result.views.length,workflows:result.workflows.length,focusChecks:result.focusChecks.length,sourceSha256:result.sourceSha256}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
