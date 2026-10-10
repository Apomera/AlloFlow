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
    const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce',hasTouch:true});page.on('pageerror',e=>result.errors.push(e.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit workbench map</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:1}),view:'schematic',observations:[StemLab.circuitActiveObservation({input:.8},'Keep this note.')],reflection:'My explanation.'}});window.state=data;window.setState=update;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:update,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });



    const map=page.locator('.circuit-workbench-map');await map.waitFor();const routes=['input','connections','response','explain'];
    const route=key=>map.locator('[data-workbench-route="'+key+'"]'),back=key=>page.locator('[data-workbench-return="'+key+'"]');
    const target=async key=>page.locator('[id="'+await route(key).getAttribute('aria-controls')+'"]');
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const click=async el=>{await el.focus();await page.keyboard.press('Enter');await settle();};
    const saved=()=>page.evaluate(()=>JSON.stringify(state));
    async function capture(name,width,element,hoverTarget){
      await page.setViewportSize({width,height:1000});await settle();await element.scrollIntoViewIfNeeded();if(hoverTarget)await hoverTarget.hover();else await page.mouse.move(0,0);
      const geometry=await element.evaluate(el=>({pageWidth:document.documentElement.scrollWidth,width:el.clientWidth,scrollWidth:el.scrollWidth,buttons:[...el.querySelectorAll('button')].map(n=>{const b=n.getBoundingClientRect();return {text:n.textContent,width:b.width,height:b.height};})}));
      assert.ok(geometry.pageWidth<=width+1);assert.ok(geometry.scrollWidth<=geometry.width+1);for(const b of geometry.buttons){assert.ok(b.height>=44);assert.ok(b.width>=44);}
      const violations=await element.evaluate(async el=>(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));
      const file=name+'.png';await element.screenshot({path:path.join(__dirname,file),animations:'disabled'});result.views.push({name,width,geometry,axeViolations:violations,file,sha256:hash(fs.readFileSync(path.join(__dirname,file)))});assert.deepEqual(violations,[]);
    }
    const initial=await saved();await capture('desktop-map',1280,map);result.focusChecks=[];
    for(const key of routes){const heading=await target(key);await click(route(key));assert.equal(await heading.evaluate(el=>document.activeElement===el),true);assert.equal(await heading.evaluate(el=>{const b=el.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight;}),true);
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.tagName),key==='explain'||key==='input'?'SUMMARY':'BUTTON');assert.equal(await heading.evaluate(el=>el.closest('.circuit-active-panel').contains(document.activeElement)),true);result.focusChecks.push({key,heading:await heading.textContent(),nextControl:await page.evaluate(()=>document.activeElement.textContent)});
      await click(back(key));assert.equal(await route(key).evaluate(el=>document.activeElement===el),true);assert.equal(await saved(),initial);
    }
    result.workflows.push({name:'Keyboard visits all four sections, continues into controls and returns to each exact map card without saving navigation',passed:true});
    await click(route('input'));await capture('desktop-input-return',1280,back('input').locator('..'));await click(back('input'));await capture('tablet-map',768,map);await capture('phone-map',390,map);await capture('small-phone-map',320,map);
    await route('connections').tap();await settle();assert.equal(await (await target('connections')).evaluate(el=>el===document.activeElement),true);await back('connections').tap();await settle();assert.equal(await route('connections').evaluate(el=>el===document.activeElement),true);assert.equal(await saved(),initial);
    result.workflows.push({name:'Phone touch navigation reaches a section and returns without horizontal page overflow',passed:true});
    await page.setViewportSize({width:1280,height:1000});await click(route('input'));await click(page.getByRole('button',{name:'Input off',exact:true}));assert.equal(await page.evaluate(()=>state._circuitActive.input),0);const edited=await saved();await click(back('input'));await click(route('response'));assert.equal(await saved(),edited);await click(back('response'));await click(route('input'));await click(page.getByRole('button',{name:'Undo active edit',exact:true}));assert.equal(await page.evaluate(()=>state._circuitActive.input),1);
    await page.locator('.circuit-node-explorer').evaluate(el=>el.open=true);await click(back('input'));await click(route('connections'));assert.equal(await page.locator('.circuit-node-explorer').evaluate(el=>el.open),true);assert.equal(await page.locator('.circuit-active-component-tuning').evaluate(el=>el.open),false);
    result.workflows.push({name:'Navigation preserves open disclosures, measurements and edit history while Undo still restores an electrical change',passed:true});
    await click(back('connections'));await page.emulateMedia({forcedColors:'active'});await route('response').focus();await page.keyboard.press('ArrowDown');result.forcedFocus=await route('response').evaluate(el=>({visible:el.matches(':focus-visible'),outline:getComputedStyle(el).outlineWidth,color:getComputedStyle(el).outlineColor,shadow:getComputedStyle(el).boxShadow}));assert.equal(result.forcedFocus.visible,true);assert.equal(result.forcedFocus.outline,'3px');await capture('forced-map',390,map,route('input'));await click(route('response'));await back('response').focus();await capture('forced-response-return',390,back('response').locator('..'));await page.emulateMedia({forcedColors:'none'});await map.evaluate(el=>el.dir='rtl');await capture('rtl-map',390,map);
    result.workflows.push({name:'High contrast and right-to-left layouts retain legible routes and return controls',passed:true});
    assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),result.sourceSha256);result.passed=true;
  }catch(error){result.failure=error.stack;throw error;}finally{await browser.close();result.browserClosed=true;fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(result,null,2)+String.fromCharCode(10));}
  console.log(JSON.stringify({passed:result.passed,views:result.views.length,workflows:result.workflows.length,sourceSha256:result.sourceSha256}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
