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
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit live reference</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:1}),view:'schematic',observations:[StemLab.circuitActiveObservation({input:.8},'Keep this note.')],reflection:'My explanation.'}});window.state=data;window.setState=update;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:update,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });
    const panel=page.locator('.circuit-active-reference');await panel.waitFor();
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const action=name=>panel.getByRole('button',{name,exact:true});
    const exact=page.getByRole('spinbutton',{name:'Input voltage (V) exact value',exact:true});
    const read=()=>panel.locator('.circuit-active-reference-direction').allTextContents();
    const keyboardAction=async name=>{await action(name).focus();await page.keyboard.press('Enter');await settle();};
    await keyboardAction('Keep current as reference');assert.deepEqual(await read(),Array(4).fill('No change'));
    await exact.fill('1.5');await exact.press('Enter');await settle();assert.deepEqual(await read(),['Increased','Increased','Decreased','Increased']);
    assert.equal(await page.evaluate(()=>state._circuitActive.reference.design.input),1);
    async function capture(name,width){
      await page.setViewportSize({width,height:1000});await settle();await panel.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
      const geometry=await panel.evaluate(el=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,cards:[...el.querySelectorAll('.circuit-active-reference-metric')].map(card=>({width:card.clientWidth,scrollWidth:card.scrollWidth})),quantities:[...el.querySelectorAll('bdi')].map(el=>({direction:getComputedStyle(el).direction,text:el.textContent}))}));
      assert.ok(geometry.pageWidth<=width+1);for(const card of geometry.cards)assert.ok(card.scrollWidth<=card.width+1);for(const value of geometry.quantities)assert.equal(value.direction,'ltr');
      const violations=await panel.evaluate(async el=>(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));assert.deepEqual(violations,[]);
      const file=name+'.png';await panel.screenshot({path:path.join(__dirname,file),animations:'disabled'});result.views.push({name,width,geometry,axeViolations:violations,file,sha256:hash(fs.readFileSync(path.join(__dirname,file)))});
    }
    await capture('desktop-active',1280);await capture('phone-active',390);
    await keyboardAction('Restore reference settings');assert.equal(await exact.inputValue(),'1');assert.deepEqual(await read(),Array(4).fill('No change'));
    await exact.fill('3.3');await exact.press('Enter');await keyboardAction('Replace reference');
    await exact.fill('4.5');await exact.press('Enter');await settle();assert.deepEqual(await read(),['Increased','No change','No change','No change']);assert.equal(await panel.locator('.circuit-active-reference-insight').count(),1);
    await capture('desktop-saturation',1280);await capture('small-phone-saturation',320);
    await page.emulateMedia({forcedColors:'active'});await capture('forced-colors',390);await page.emulateMedia({forcedColors:'none'});
    await page.evaluate(()=>document.querySelector('.circuit-active-reference').dir='rtl');await capture('rtl-reference',390);await page.evaluate(()=>document.querySelector('.circuit-active-reference').removeAttribute('dir'));
    await keyboardAction('Clear reference');assert.equal(await panel.locator('.circuit-active-reference-metric').count(),0);assert.equal(await exact.inputValue(),'4.5');
    const kept=await page.evaluate(()=>({reflection:state._circuitActive.reflection,note:state._circuitActive.observations[0].note}));assert.deepEqual(kept,{reflection:'My explanation.',note:'Keep this note.'});
    result.workflows.push({name:'Keyboard capture, exact input, restore, replace, saturation and clear',notebookPreserved:true});
    assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),result.sourceSha256);result.passed=true;
  }catch(error){result.failure=error.stack;throw error;}finally{await browser.close();result.browserClosed=true;fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({passed:result.passed,views:result.views.length,workflows:result.workflows.length,sourceSha256:result.sourceSha256}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
