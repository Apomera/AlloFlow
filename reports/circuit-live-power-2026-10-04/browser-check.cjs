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
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit live power</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:1}),view:'schematic',observations:[StemLab.circuitActiveObservation({input:.8},'Keep this note.')],reflection:'My explanation.'}});window.state=data;window.setState=update;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:update,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });
    const panel=page.locator('.circuit-active-live-readings'),input=panel.locator('..'),guide=panel.locator('details');await panel.waitFor();
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const click=async locator=>{await locator.focus();await page.keyboard.press('Space');await settle();};
    const factors=()=>panel.locator('[data-power-factor] dd').allTextContents();
    const readings=()=>panel.evaluate(el=>Object.fromEntries([...el.querySelectorAll('[data-live-reading]')].map(el=>[el.dataset.liveReading,el.querySelector('strong').textContent])));
    const work=()=>page.evaluate(()=>JSON.stringify({note:state._circuitActive.observations[0].note,reflection:state._circuitActive.reflection,reference:state._circuitActive.reference,lessons:StemLab.circuitActiveLessonRecords(state._circuitActive)}));
    const undo=page.getByRole('button',{name:'Undo active edit',exact:true}),redo=page.getByRole('button',{name:'Redo active edit',exact:true});
    const project=name=>page.locator('.circuit-active-projects button').filter({has:page.locator('span',{hasText:name})});
    async function capture(name,width){
      await page.setViewportSize({width,height:1100});await settle();await panel.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
      const geometry=await panel.evaluate(el=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,width:el.clientWidth,scrollWidth:el.scrollWidth,values:[...el.querySelectorAll('bdi[dir=ltr]')].map(el=>({text:el.textContent,direction:getComputedStyle(el).direction})),open:el.querySelector('details').open,region:el.querySelector('.circuit-live-power-insight').dataset.region}));
      assert.ok(geometry.pageWidth<=width+1);assert.ok(geometry.scrollWidth<=geometry.width+1);for(const value of geometry.values)assert.equal(value.direction,'ltr');
      const violations=await panel.evaluate(async el=>(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));assert.deepEqual(violations,[]);
      const file=name+'.png';await panel.screenshot({path:path.join(__dirname,file),animations:'disabled'});result.views.push({name,width,geometry,axeViolations:violations,file,sha256:hash(fs.readFileSync(path.join(__dirname,file)))});
    }
    assert.equal(await guide.evaluate(el=>el.open),false);await capture('desktop-closed',1280);const prior=await page.evaluate(()=>JSON.stringify(state)),saved=await work();
    await click(guide.locator('summary'));assert.equal(await page.evaluate(()=>JSON.stringify(state)),prior);await guide.evaluate(el=>window.powerGuide=el);
    assert.deepEqual(await readings(),{baseCurrent:'30.0 µA',collectorCurrent:'3.00 mA',collectorVoltage:'4.34V',loadPower:'1.98 mW'});assert.deepEqual(await factors(),['660.00 mV','3.00 mA','1.98 mW']);
    await capture('desktop-active',1280);await capture('small-phone-active',320);
    await click(input.getByRole('button',{name:'Input off',exact:true}));assert.deepEqual(await factors(),['0.00V','0 A','0 W']);await capture('phone-cutoff',390);
    await click(undo);assert.equal((await factors())[2],'1.98 mW');await click(redo);assert.equal((await factors())[2],'0 W');
    await click(input.getByRole('button',{name:'Input 3.3 V',exact:true}));assert.equal((await factors())[2],'104.73 mW');await capture('desktop-saturated',1280);
    await input.locator('input[type=range]').first().focus();await page.keyboard.press('End');await settle();assert.equal(await page.evaluate(()=>state._circuitActive.input),5);assert.equal((await readings()).baseCurrent,'430 µA');assert.equal((await factors())[2],'104.73 mW');
    assert.equal(await guide.evaluate(el=>el===window.powerGuide&&el.open),true);assert.equal(await work(),saved);
    result.workflows.push({name:'Keyboard disclosure is local; live values follow cutoff, active and saturation, Undo and Redo; further base drive leaves saturated lamp power fixed',authoredWorkPreserved:true});
    await click(project('Light sensor'));assert.deepEqual(await factors(),['2.64V','12.00 mA','31.68 mW']);assert.equal(await panel.locator('[data-live-reading=baseCurrent] .circuit-live-path').textContent(),'Divider → RB → base');await capture('phone-sensor',390);
    await click(input.getByRole('button',{name:'Dark',exact:true}));assert.equal((await factors())[2],'0 W');await click(project('Dark sensor'));await click(input.getByRole('button',{name:'Dark',exact:true}));assert.notEqual((await factors())[2],'0 W');assert.ok(parseFloat((await factors())[1])>12);
    assert.equal(await work(),saved);assert.equal(await guide.evaluate(el=>el===window.powerGuide&&el.open),true);
    result.workflows.push({name:'Light and dark sensor experiments update power in opposite directions as light falls; guide and authored work survive switching'});
    await click(project('Light sensor'));await page.emulateMedia({forcedColors:'active'});await capture('forced-colors',390);await page.emulateMedia({forcedColors:'none'});
    await panel.evaluate(el=>el.dir='rtl');await capture('rtl-readings',390);await panel.evaluate(el=>el.removeAttribute('dir'));
    assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),result.sourceSha256);result.passed=true;
  }catch(error){result.failure=error.stack;throw error;}finally{await browser.close();result.browserClosed=true;fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({passed:result.passed,views:result.views.length,workflows:result.workflows.length,sourceSha256:result.sourceSha256}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
