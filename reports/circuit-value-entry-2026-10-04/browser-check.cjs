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
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit exact-value feedback</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:1}),view:'schematic',observations:[StemLab.circuitActiveObservation({input:.8},'Keep this note.')],reflection:'My explanation.'}});window.state=data;window.setState=update;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:update,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });
    let exact=page.getByRole('spinbutton',{name:'Input voltage (V) exact value',exact:true}),panel=exact.locator('xpath=ancestor::div[contains(@class,"circuit-active-range")]');await exact.waitFor();
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const current=()=>page.evaluate(()=>state._circuitActive.input);
    const reset=()=>panel.getByRole('button',{name:'Restore current value for Input voltage (V)',exact:true});
    async function capture(name,width){
      await page.setViewportSize({width,height:1000});await settle();await panel.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
      const geometry=await panel.evaluate(el=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,width:el.clientWidth,scrollWidth:el.scrollWidth,state:el.dataset.editState,invalid:el.querySelector('input[type=number]').getAttribute('aria-invalid'),text:el.textContent}));
      assert.ok(geometry.pageWidth<=width+1);assert.ok(geometry.scrollWidth<=geometry.width+1);
      assert.equal(await panel.locator('strong bdi').evaluate(el=>getComputedStyle(el).direction),'ltr');assert.equal(await exact.evaluate(el=>getComputedStyle(el).direction),'ltr');
      const violations=await panel.evaluate(async el=>(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));assert.deepEqual(violations,[]);
      const file=name+'.png';await panel.screenshot({path:path.join(__dirname,file),animations:'disabled'});result.views.push({name,width,geometry,axeViolations:violations,file,sha256:hash(fs.readFileSync(path.join(__dirname,file)))});
    }
    await exact.fill('1.5');assert.equal(await current(),1);assert.equal(await panel.getAttribute('data-edit-state'),'pending');await capture('desktop-draft',1280);
    await exact.press('Enter');await settle();assert.equal(await current(),1.5);assert.equal(await page.getByRole('spinbutton',{name:'Graph input voltage (V) exact value',exact:true}).inputValue(),'1.5');
    await exact.fill('1.6');await exact.press('Tab');await settle();assert.equal(await current(),1.6);assert.equal(await page.evaluate(()=>state._circuitActive.undo.length),2);
    const saved=await page.evaluate(()=>JSON.stringify(state));
    await exact.fill('9');await exact.press('Enter');await settle();assert.equal(await current(),1.6);assert.equal(await exact.getAttribute('aria-invalid'),'true');
    await capture('desktop-invalid',1280);await capture('phone-invalid',320);
    await page.emulateMedia({forcedColors:'active'});await capture('forced-colors',390);await page.emulateMedia({forcedColors:'none'});
    await panel.evaluate(el=>el.dir='rtl');await capture('rtl-invalid',390);await panel.evaluate(el=>el.removeAttribute('dir'));
    await exact.focus();await exact.press('Tab');assert.equal(await reset().evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Space');await settle();assert.equal(await exact.inputValue(),'1.6');assert.equal(await exact.evaluate(el=>el===document.activeElement),true);assert.equal(await page.evaluate(()=>JSON.stringify(state)),saved);
    await exact.fill('');await exact.press('Enter');await reset().click();await settle();assert.equal(await exact.inputValue(),'1.6');assert.equal(await page.evaluate(()=>JSON.stringify(state)),saved);
    await exact.fill('8');await exact.press('Enter');await exact.press('Escape');await settle();assert.equal(await exact.inputValue(),'1.6');assert.equal(await panel.getAttribute('data-edit-state'),'current');
    result.workflows.push({name:'Enter and blur apply once; keyboard, pointer and Escape recover invalid entries',savedWorkAndHistoryPreserved:true});
    await page.evaluate(()=>setState(prev=>({...prev,_circuit:{networkWorkbench:true},_circuitNetwork:{analysis:'dc',selected:1,duration:.01,components:[{id:1,type:'voltage',a:'A',b:'0',value:5,waveform:{shape:'pulse',amplitude:2,frequency:100,duty:50,edge:5,phase:0}},{id:2,type:'resistor',a:'A',b:'0',value:1000}],reflection:'Network writing.',undo:[],redo:[]}})));await settle();
    exact=page.getByRole('spinbutton',{name:'Frequency (Hz) exact value',exact:true});panel=exact.locator('xpath=ancestor::div[contains(@class,"circuit-active-range")]');
    await exact.fill('1000');await exact.press('Enter');await settle();assert.equal(await page.evaluate(()=>state._circuitNetwork.components[0].waveform.frequency),1000);
    await exact.fill('100001');await exact.press('Enter');await capture('network-log-invalid',1280);
    await panel.getByRole('button',{name:'Restore current value for Frequency (Hz)',exact:true}).click();assert.equal(await exact.inputValue(),'1000');
    exact=page.getByRole('spinbutton',{name:'Rise / fall (% of period) exact value',exact:true});panel=exact.locator('xpath=ancestor::div[contains(@class,"circuit-active-range")]');await exact.fill('30');await exact.press('Enter');assert.equal(await exact.getAttribute('aria-invalid'),'true');
    const duty=page.getByRole('spinbutton',{name:'Pulse width (% of period) exact value',exact:true});await duty.fill('20');await duty.press('Enter');await settle();assert.equal(await exact.getAttribute('max'),'10');assert.equal(await exact.inputValue(),'5');assert.equal(await exact.getAttribute('aria-invalid'),'false');await exact.fill('11');await exact.press('Enter');await capture('network-updated-bound',390);
    assert.equal(await page.evaluate(()=>state._circuitNetwork.reflection),'Network writing.');result.workflows.push({name:'Logarithmic frequency entry, recovery and dynamic pulse-edge bounds'});
    assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),result.sourceSha256);result.passed=true;
  }catch(error){result.failure=error.stack;throw error;}finally{await browser.close();result.browserClosed=true;fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({passed:result.passed,views:result.views.length,workflows:result.workflows.length,sourceSha256:result.sourceSha256}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
