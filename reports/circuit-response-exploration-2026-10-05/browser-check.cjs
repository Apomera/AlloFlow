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
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit response exploration</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:1}),view:'schematic',observations:[StemLab.circuitActiveObservation({input:.8},'Keep this note.')],reflection:'My explanation.'}});window.state=data;window.setState=update;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:update,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });

    const graph=page.locator('.circuit-response-explorer'),svg=graph.locator('svg'),scroll=graph.locator('.circuit-active-plot-scroll'),field=graph.locator('input[type=number]'),slider=graph.locator('input[type=range]');await graph.waitFor();
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const click=async locator=>{await locator.focus();await page.keyboard.press('Space');await settle();};
    const reading=key=>graph.locator('[data-graph-reading="'+key+'"] dd').textContent();
    const authored=()=>page.evaluate(()=>JSON.stringify({observations:state._circuitActive.observations,reflection:state._circuitActive.reflection,reference:state._circuitActive.reference,lessonRecords:state._circuitActive.lessonRecords}));
    const snapshot=()=>page.evaluate(()=>JSON.stringify(state._circuitActive));
    const xy=async(x,y=120)=>svg.evaluate((el,p)=>{const point=new DOMPoint(p.x,p.y).matrixTransform(el.getScreenCTM());return{x:point.x,y:point.y};},{x,y});
    const choose=async(value,touch=false)=>{await graph.scrollIntoViewIfNeeded();const max=await page.evaluate(()=>state._circuitActive.project==='manual'?5:100),point=await xy(65+value/max*670);if(touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y);await settle();};
    async function capture(name,width){
      await page.setViewportSize({width,height:1000});await settle();await graph.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
      const geometry=await graph.evaluate(el=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,width:el.clientWidth,scrollWidth:el.scrollWidth,values:[...el.querySelectorAll('bdi[dir=ltr]')].map(el=>({text:el.textContent,direction:getComputedStyle(el).direction})),svgDirection:getComputedStyle(el.querySelector('svg')).direction}));
      assert.ok(geometry.pageWidth<=width+1);assert.ok(geometry.scrollWidth<=geometry.width+1);assert.equal(geometry.svgDirection,'ltr');for(const value of geometry.values)assert.equal(value.direction,'ltr');
      const violations=await graph.evaluate(async el=>(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));assert.deepEqual(violations,[]);
      const file=name+'.png';await graph.screenshot({path:path.join(__dirname,file),animations:'disabled'});result.views.push({name,width,geometry,axeViolations:violations,file,sha256:hash(fs.readFileSync(path.join(__dirname,file)))});
    }
    const saved=await authored();await choose(1.5);assert.equal(await reading('input'),'1.5 V');assert.equal(await reading('current'),'8.00 mA');assert.equal(await field.inputValue(),'1.5');assert.equal(await page.evaluate(()=>state._circuitActive.undo.length),1);
    await capture('desktop-active',1280);
    await slider.focus();await page.keyboard.press('ArrowRight');await settle();assert.equal(await reading('input'),'1.51 V');assert.equal(await reading('current'),'8.10 mA');assert.equal(await slider.evaluate(el=>el===document.activeElement),true);
    await click(page.getByRole('button',{name:'Undo active edit',exact:true}));assert.equal(await reading('input'),'1.5 V');await click(page.getByRole('button',{name:'Redo active edit',exact:true}));assert.equal(await reading('input'),'1.51 V');
    await field.fill('1.537');assert.equal(await reading('input'),'1.51 V');await field.press('Enter');await settle();assert.equal(await reading('input'),'1.537 V');
    await click(page.getByRole('button',{name:'Keep current as reference',exact:true}));const reference=await svg.locator('.circuit-active-reference-dot').getAttribute('transform');await choose(4.5);assert.equal(await reading('region'),'Saturation');assert.equal(await svg.locator('.circuit-active-reference-dot').getAttribute('transform'),reference);await capture('desktop-reference',1280);
    const preserved=await authored();assert.equal(JSON.parse(preserved).observations[0].note,'Keep this note.');assert.equal(JSON.parse(saved).reflection,JSON.parse(preserved).reflection);
    await graph.scrollIntoViewIfNeeded();const start=await xy(450),beforeDrag=await snapshot();await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x+30,start.y,{steps:4});await page.mouse.move(start.x,start.y,{steps:4});await page.mouse.up();await settle();assert.equal(await snapshot(),beforeDrag);
    const label=await xy(400,260);await page.mouse.click(label.x,label.y);await settle();assert.equal(await snapshot(),beforeDrag);
    result.workflows.push({name:'Mouse selection, keyboard slider, exact entry and Undo/Redo update one synchronized operating point; reference and authored work are preserved',passed:true});
    await page.setViewportSize({width:390,height:1000});await graph.scrollIntoViewIfNeeded();await scroll.evaluate(el=>el.scrollLeft=0);await choose(1,true);assert.equal(await reading('input'),'1 V');
    const beforeSwipe=await snapshot(),box=await scroll.boundingBox(),cdp=await page.context().newCDPSession(page);const sx=box.x+box.width-35,sy=box.y+80;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:sx,y:sy}]});
    for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:sx-i*28,y:sy}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();assert.equal(await snapshot(),beforeSwipe);assert.ok(await scroll.evaluate(el=>el.scrollLeft>0));await cdp.detach();
    await scroll.evaluate(el=>el.scrollLeft=el.scrollWidth);await settle();await choose(4.5,true);assert.equal(await reading('input'),'4.5 V');assert.equal(await reading('region'),'Saturation');await capture('phone-saturation',390);
    await page.setViewportSize({width:320,height:1000});await scroll.evaluate(el=>el.scrollLeft=0);await choose(.3,true);assert.equal(await reading('current'),'0 A');await capture('small-phone-cutoff',320);assert.equal(await authored(),preserved);
    result.workflows.push({name:'Real touch taps select points before and after a horizontal swipe; the swipe leaves settings and history untouched at phone widths',passed:true});
    await click(page.locator('.circuit-active-projects button').filter({has:page.locator('span',{hasText:'Dark sensor'})}));await page.setViewportSize({width:390,height:1000});await scroll.evaluate(el=>el.scrollLeft=0);await choose(20,true);assert.equal(await reading('input'),'20 / 100');assert.equal(await reading('region'),'Active region');assert.equal(await svg.locator('.circuit-active-reference-dot').count(),0);await capture('phone-dark-sensor',390);
    await click(page.getByRole('button',{name:'Replace reference',exact:true}));await field.fill('50');await field.press('Enter');await settle();await page.emulateMedia({forcedColors:'active'});await capture('forced-colors',1280);await page.emulateMedia({forcedColors:'none'});
    await graph.evaluate(el=>el.dir='rtl');await capture('rtl-phone',390);assert.equal(await reading('input'),'50 / 100');assert.equal(JSON.parse(await authored()).observations[0].note,'Keep this note.');
    result.workflows.push({name:'Dark sensor input, incompatible reference axis, high contrast and right-to-left presentation',passed:true});
    assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),result.sourceSha256);result.passed=true;
  }catch(error){result.failure=error.stack;throw error;}finally{await browser.close();result.browserClosed=true;fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({passed:result.passed,views:result.views.length,workflows:result.workflows.length,sourceSha256:result.sourceSha256}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
