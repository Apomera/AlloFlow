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
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit node explorer</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:1}),view:'schematic',observations:[StemLab.circuitActiveObservation({input:.8},'Keep this note.')],reflection:'My explanation.'}});window.state=data;window.setState=update;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:update,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });


    const explorer=page.locator('.circuit-node-explorer'),probes=page.locator('.circuit-active-probes'),meter=page.locator('.circuit-active-meter'),diagram=page.locator('.circuit-active-diagram-scroll');await explorer.waitFor();
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const click=async locator=>{await locator.focus();await page.keyboard.press('Space');await settle();};
    const action=(node,lead)=>explorer.locator('[data-circuit-node="'+node+'"] button[data-lead="'+lead+'"]');
    const project=name=>page.locator('.circuit-active-projects button').filter({has:page.locator('span',{hasText:new RegExp('^'+name+'$')})});
    const authored=()=>page.evaluate(()=>JSON.stringify({observations:state._circuitActive.observations,reflection:state._circuitActive.reflection,reference:state._circuitActive.reference}));
    const protectedState=()=>page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.entries(state._circuitActive).filter(([key])=>!['probeRed','probeBlack'].includes(key)))));
    const voltage=()=>meter.locator('output').textContent();
    async function capture(name,width,target,axeChecked=true){
      await page.setViewportSize({width,height:1000});await settle();await target.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
      const geometry=await target.evaluate(el=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,width:el.clientWidth,scrollWidth:el.scrollWidth,values:[...el.querySelectorAll('bdi[dir=ltr]')].map(el=>({text:el.textContent,direction:getComputedStyle(el).direction})),buttons:[...el.querySelectorAll('button')].map(el=>({name:el.getAttribute('aria-label')||el.textContent,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))}));
      geometry.intentionalHorizontalScroll=target===diagram;assert.ok(geometry.pageWidth<=width+1);assert.ok(geometry.scrollWidth<=geometry.width+1||target===diagram);for(const v of geometry.values)assert.equal(v.direction,'ltr');
      const violations=axeChecked?await target.evaluate(async el=>(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))):[];
      const file=name+'.png';await target.screenshot({path:path.join(__dirname,file),animations:'disabled'});result.views.push({name,width,geometry,axeChecked,axeViolations:violations,file,sha256:hash(fs.readFileSync(path.join(__dirname,file)))});assert.deepEqual(violations,[]);
    }
    await page.evaluate(()=>setState(prev=>({...prev,_circuitActive:{...prev._circuitActive,lessonRecords:{},undo:[StemLab.circuitActiveDesign({input:.9})],redo:[StemLab.circuitActiveDesign({input:2})],reference:{version:1,design:StemLab.circuitActiveDesign({input:2})},probeRed:'collector',probeBlack:'emitter',placeLead:'red'}})));await settle();
    const saved=await authored(),before=await protectedState();assert.equal(await explorer.evaluate(el=>el.open),false);await capture('desktop-closed',1280,probes);await click(explorer.locator('summary'));assert.equal(await protectedState(),before);
    await click(action('supply','red'));assert.equal(await voltage(),'5.00V');assert.equal(await action('supply','red').evaluate(el=>el===document.activeElement),true);await click(action('base','black'));assert.equal(await voltage(),'4.30V');assert.equal(await page.getByRole('combobox',{name:'Black probe',exact:true}).inputValue(),'base');await capture('desktop-node-explorer',1280,explorer);
    await click(action('base','red'));assert.equal(await voltage(),'0.00V');await click(action('supply','red'));await click(page.getByRole('button',{name:'Reverse active probes',exact:true}));assert.equal(await voltage(),'-4.30V');assert.equal(await action('supply','black').getAttribute('aria-pressed'),'true');assert.equal(await protectedState(),before);await capture('desktop-negative-reading',1280,meter);
    result.workflows.push({name:'Keyboard node exploration updates menus, markers and signed readings without changing design, history or saved work',passed:true});
    await click(page.getByRole('button',{name:'Place black probe',exact:true}));await click(page.getByRole('button',{name:'3D experiment board',exact:true}));await page.setViewportSize({width:320,height:1000});
    const target=page.getByRole('button',{name:'Place black probe on B · base',exact:true});await target.scrollIntoViewIfNeeded();const box=await target.boundingBox();assert.equal(box.width,44);assert.equal(box.height,44);await page.touchscreen.tap(box.x+box.width/2+20,box.y+box.height/2);await settle();assert.equal(await page.evaluate(()=>state._circuitActive.probeBlack),'base');assert.equal(await action('base','black').getAttribute('aria-pressed'),'true');
    result.touchTargets=await diagram.locator('.circuit-active-node').evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect(),f=el.querySelector('.circuit-active-node-face').getBoundingClientRect();return{width:b.width,height:b.height,faceWidth:f.width,faceHeight:f.height};}));for(const b of result.touchTargets){assert.equal(b.width,44);assert.equal(b.height,44);assert.equal(b.faceWidth,30);assert.equal(b.faceHeight,30);}
    result.nodeAlignment=await target.evaluate(el=>{const m=el.closest('.circuit-active-board-frame').querySelector('svg').getScreenCTM(),p=new DOMPoint(474.6,263.65).matrixTransform(m),b=el.getBoundingClientRect();return{dx:Math.abs(b.x+b.width/2-p.x),dy:Math.abs(b.y+b.height/2-p.y)};});assert.ok(result.nodeAlignment.dx<1&&result.nodeAlignment.dy<1);await capture('phone-board-target',390,diagram,false);
    result.workflows.push({name:'A real touch 20 px from a node center lands within the enlarged 44 px target while the original 30 px face remains aligned with the drawing',passed:true});
    await click(project('Light sensor'));await action('drive','red').tap();await settle();await action('base','black').tap();await settle();assert.equal(await voltage(),'1.20V');assert.equal(await explorer.locator('[data-circuit-node=drive] .circuit-node-explorer-voltage').textContent(),'1.90V');await capture('phone-loaded-divider',390,explorer);await capture('small-phone-explorer',320,explorer);assert.equal(await authored(),saved);
    result.workflows.push({name:'Touch controls expose the loaded sensor junction and both probe placements at 320 and 390 px without horizontal scrolling',passed:true});
    await page.emulateMedia({forcedColors:'active'});await capture('forced-node-explorer',390,explorer);const forcedNode=page.getByRole('button',{name:'Place black probe on B · base',exact:true});await click(forcedNode);result.forcedFocus=await forcedNode.evaluate(el=>{const c=getComputedStyle(el),f=getComputedStyle(el.querySelector('.circuit-active-node-face'));return{visible:el.matches(':focus-visible'),outlineWidth:c.outlineWidth,boxShadow:c.boxShadow,borderColor:f.borderColor,textColor:f.color};});assert.equal(result.forcedFocus.visible,true);assert.equal(result.forcedFocus.outlineWidth,'3px');assert.notEqual(result.forcedFocus.boxShadow,'none');assert.equal(result.forcedFocus.borderColor,result.forcedFocus.textColor);await capture('forced-board-targets',1280,diagram,false);await page.emulateMedia({forcedColors:'none'});await explorer.evaluate(el=>el.dir='rtl');await capture('rtl-node-explorer',390,explorer);
    assert.equal(await authored(),saved);assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),result.sourceSha256);result.workflows.push({name:'System colors and right-to-left text preserve readable selections, node names and numeric direction',passed:true});result.passed=true;
  }catch(error){result.failure=error.stack;throw error;}finally{await browser.close();result.browserClosed=true;fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(result,null,2)+String.fromCharCode(10));}
  console.log(JSON.stringify({passed:result.passed,views:result.views.length,workflows:result.workflows.length,sourceSha256:result.sourceSha256}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
