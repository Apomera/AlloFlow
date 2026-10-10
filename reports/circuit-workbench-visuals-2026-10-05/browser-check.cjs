const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const sourcePath=path.join(root,'stem_lab/stem_tool_circuit.js'),source=fs.readFileSync(sourcePath,'utf8');
const baseline=process.argv.includes('--baseline'),out=baseline?path.join(__dirname,'baseline'):__dirname;fs.mkdirSync(out,{recursive:true});
const result={sourceSha256:hash(source),scriptSha256:hash(fs.readFileSync(__filename)),errors:[],workflows:[],views:[]};
(async()=>{
  assert.equal(result.sourceSha256,baseline?'9d7fa5476e14ea5c167f8916831aa15da4a06085b91d4fbe89e8cde40968cc91':JSON.parse(fs.readFileSync(path.join(__dirname,'source-changes.json'))).sourceSha256);
  assert.equal(hash(fs.readFileSync(path.join(root,'desktop/web-app/public/stem_lab/stem_tool_circuit.js'))),result.sourceSha256);
  assert.ok(!fs.existsSync(path.join(out,'browser-results.json')),'Archive previous results before rerunning.');
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce',hasTouch:true});page.on('pageerror',e=>result.errors.push(e.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit workbench visual refinement</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:1}),view:'schematic',observations:[StemLab.circuitActiveObservation({input:.8},'Keep this note.')],reflection:'My explanation.'}});window.state=data;window.setState=update;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:update,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });


    const workbench=page.locator('.circuit-active-root'),hero=page.locator('.circuit-active-hero'),projects=page.locator('.circuit-active-projects'),diagram=page.locator('.circuit-active-diagram-scroll'),inputPanel=page.locator('.circuit-active-panel').filter({has:page.locator('.circuit-active-live-readings')});await projects.waitFor();
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const click=async locator=>{await locator.focus();await page.keyboard.press('Space');await settle();};
    const project=name=>projects.locator('button').filter({has:page.locator('span',{hasText:new RegExp('^'+name+'$')})});
    const authored=()=>page.evaluate(()=>JSON.stringify({observations:state._circuitActive.observations,reflection:state._circuitActive.reflection,reference:state._circuitActive.reference}));
    async function capture(name,width,target,check=true){
      await page.setViewportSize({width,height:1000});await settle();await target.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
      const geometry=await target.evaluate(el=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,width:el.clientWidth,scrollWidth:el.scrollWidth,values:[...el.querySelectorAll('bdi[dir=ltr]')].map(el=>({text:el.textContent,direction:getComputedStyle(el).direction})),buttons:[...el.querySelectorAll('button')].map(el=>({name:el.getAttribute('aria-label')||el.textContent,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))}));
      assert.ok(geometry.pageWidth<=width+1);geometry.intentionalHorizontalScroll=target===diagram;assert.ok(geometry.scrollWidth<=geometry.width+1||target===diagram);for(const v of geometry.values)assert.equal(v.direction,'ltr');
      const violations=check?await target.evaluate(async el=>(await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))):[];if(!baseline)assert.deepEqual(violations,[]);
      const file=name+'.png';await target.screenshot({path:path.join(out,file),animations:'disabled'});result.views.push({name,width,geometry,axeViolations:violations,file,sha256:hash(fs.readFileSync(path.join(out,file)))});
    }
    if(baseline){await capture('hero-desktop',1280,hero);await capture('projects-desktop',1280,projects);await capture('input-desktop',1280,inputPanel);await click(page.getByRole('button',{name:'3D experiment board',exact:true}));await capture('board-desktop',1280,diagram,false);result.passed=true;}
    else{
      const saved=await authored();await capture('hero-desktop',1280,hero);await capture('projects-desktop',1280,projects);await capture('input-desktop',1280,inputPanel);
      const before=await page.evaluate(()=>JSON.stringify(state));await click(project('Manual control'));assert.equal(await page.evaluate(()=>JSON.stringify(state)),before);await click(project('Light sensor'));assert.equal(await project('Light sensor').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>state._circuitActive.undo.length),1);await capture('projects-phone',390,projects);
      await click(page.getByRole('button',{name:'Undo active edit',exact:true}));assert.equal(await project('Manual control').getAttribute('aria-pressed'),'true');await click(page.getByRole('button',{name:'Redo active edit',exact:true}));assert.equal(await project('Light sensor').getAttribute('aria-pressed'),'true');assert.equal(await authored(),saved);
      await click(project('Dark sensor'));await capture('projects-small-phone',320,projects);await capture('hero-small-phone',320,hero);await capture('input-phone',390,inputPanel);
      result.workflows.push({name:'Keyboard experiment selection, current selection no-op, Undo/Redo and saved-work continuity',passed:true});
      await page.setViewportSize({width:1280,height:1000});await click(page.getByRole('button',{name:'3D experiment board',exact:true}));const beforeView=await authored();await capture('board-desktop',1280,diagram,false);await click(page.getByRole('button',{name:'NPN schematic',exact:true}));await capture('schematic-desktop',1280,diagram,false);
      await click(page.getByRole('button',{name:'Place red probe on B · base',exact:true}));assert.equal(await page.evaluate(()=>state._circuitActive.probeRed),'base');assert.equal(await authored(),beforeView);
      const alignment=await diagram.evaluate(el=>{const svg=el.querySelector('svg'),m=svg.getScreenCTM(),node=el.querySelector('.circuit-active-node[aria-label="Place red probe on B · base"]'),r=node.getBoundingClientRect(),p=new DOMPoint(480,260).matrixTransform(m);return{dx:Math.abs(r.x+r.width/2-p.x),dy:Math.abs(r.y+r.height/2-p.y)};});assert.ok(alignment.dx<1&&alignment.dy<1);result.nodeAlignment=alignment;
      await capture('board-phone',390,diagram,false);result.workflows.push({name:'Board and schematic retain their geometry, node targets and probe selection',passed:true});
      await page.emulateMedia({forcedColors:'active'});await capture('hero-forced',390,hero);await capture('projects-forced',390,projects);assert.equal(await project('Dark sensor').evaluate(el=>getComputedStyle(el).forcedColorAdjust),'none');await capture('input-forced',390,inputPanel);await page.emulateMedia({forcedColors:'none'});
      await hero.evaluate(el=>el.dir='rtl');await projects.evaluate(el=>el.dir='rtl');await capture('hero-rtl',390,hero);await capture('projects-rtl',390,projects);assert.equal(await authored(),saved);
      result.workflows.push({name:'High contrast, 320/390 px layouts and right-to-left visual hierarchy',passed:true});
      await page.evaluate(()=>{const el=document.createElement('div');el.id='second-workbench';document.querySelector('#root').appendChild(el);const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});function Second(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({project:'light'}),view:'3d'}});return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:update,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}window.secondRoot=ReactDOM.createRoot(el);secondRoot.render(React.createElement(Second));});await settle();
      result.svgDefinitions=await page.evaluate(()=>[...document.querySelectorAll('.circuit-transistor-hero svg,.circuit-active-board-frame svg')].map(svg=>({ids:[...svg.querySelectorAll('defs [id]')].map(el=>el.id),references:[...svg.querySelectorAll('[fill]')].map(el=>el.getAttribute('fill')).filter(fill=>fill.startsWith('url(#')).map(fill=>fill.slice(5,-1))})));
      assert.equal(result.svgDefinitions.length,4);const ids=result.svgDefinitions.flatMap(item=>item.ids);assert.equal(new Set(ids).size,ids.length);for(const item of result.svgDefinitions)for(const ref of item.references)assert.ok(item.ids.includes(ref));assert.equal(await authored(),saved);await page.evaluate(()=>{secondRoot.unmount();document.querySelector('#second-workbench').remove();});
      result.workflows.push({name:'Two independent workbenches use unique, locally resolved SVG gradients and grid patterns',passed:true});result.passed=true;
    }
    assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),result.sourceSha256);
  }catch(error){result.failure=error.stack;throw error;}finally{await browser.close();result.browserClosed=true;fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({passed:result.passed,baseline,views:result.views.length,workflows:result.workflows.length,sourceSha256:result.sourceSha256}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
