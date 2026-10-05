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
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit saved edit preview</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    await page.addScriptTag({content:source});await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      function Host(){const[data,update]=React.useState({_circuit:{activeWorkbench:true},_circuitActive:{...StemLab.circuitActiveDesign({input:1}),view:'schematic',observations:[StemLab.circuitActiveObservation({input:.8},'Keep this note.')],reflection:'My explanation.'}});window.state=data;window.setState=update;return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:update,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});}
      ReactDOM.createRoot(document.querySelector('#root')).render(React.createElement(Host));
    });
    const preview=page.locator('.circuit-active-edit-preview'),toolbar=page.locator('.circuit-history-toolbar'),panel=toolbar.locator('..');await preview.waitFor();
    const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const undo=toolbar.getByRole('button',{name:'Undo active edit',exact:true}),redo=toolbar.getByRole('button',{name:'Redo active edit',exact:true});
    const click=async locator=>{await locator.focus();await page.keyboard.press('Space');await settle();};
    const design=()=>page.evaluate(()=>StemLab.circuitActiveDesign(state._circuitActive));
    const rows=key=>preview.locator('[data-history-action="'+key+'"]').evaluate(el=>Object.fromEntries([...el.querySelectorAll('[data-history-field]')].map(row=>[row.dataset.historyField,[...row.querySelectorAll('td')].map(td=>td.textContent)])));
    const authored=()=>page.evaluate(()=>({reflection:state._circuitActive.reflection,note:state._circuitActive.observations[0].note,reference:state._circuitActive.reference,records:StemLab.circuitActiveLessonRecords(state._circuitActive),red:state._circuitActive.probeRed,black:state._circuitActive.probeBlack}));
    const seed=async()=>{await page.evaluate(()=>setState(prev=>({...prev,_circuitActive:{...prev._circuitActive,...StemLab.circuitActiveDesign({project:'light'}),probeRed:'base',probeBlack:'drive',reference:{version:1,design:StemLab.circuitActiveDesign({input:2})},lessonRecords:{gain:{choice:'more',tested:true,explanation:'Guided writing.'}},undo:[StemLab.circuitActiveDesign({input:0}),StemLab.circuitActiveDesign({input:1,light:25,supply:7,baseResistance:15000,loadResistance:330,dividerResistance:20000,beta:80})],redo:[StemLab.circuitActiveDesign({project:'dark',light:75,supply:9,baseResistance:22000,loadResistance:470,dividerResistance:4700,beta:120})]}})));await settle();};
    async function capture(name,width){
      await page.setViewportSize({width,height:1100});await settle();await panel.scrollIntoViewIfNeeded();await page.mouse.move(0,0);
      const geometry=await panel.evaluate(el=>({viewport:innerWidth,pageWidth:document.documentElement.scrollWidth,width:el.clientWidth,scrollWidth:el.scrollWidth,values:[...el.querySelectorAll('.circuit-history-card bdi[dir=ltr]')].map(el=>({text:el.textContent,direction:getComputedStyle(el).direction})),tables:[...el.querySelectorAll('.circuit-history-card')].map(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth})),open:el.querySelector('details').open}));
      assert.ok(geometry.pageWidth<=width+1);assert.ok(geometry.scrollWidth<=geometry.width+1);for(const table of geometry.tables)assert.ok(table.scrollWidth<=table.width+1);for(const value of geometry.values)assert.equal(value.direction,'ltr');
      const violations=await page.evaluate(async()=>(await axe.run({include:[['.circuit-history-toolbar'],['.circuit-active-edit-preview']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));assert.deepEqual(violations,[]);
      const file=name+'.png';await panel.screenshot({path:path.join(__dirname,file),animations:'disabled'});result.views.push({name,width,geometry,axeViolations:violations,file,sha256:hash(fs.readFileSync(path.join(__dirname,file)))});
    }
    assert.equal(await undo.isDisabled(),true);assert.equal(await redo.isDisabled(),true);await capture('desktop-collapsed',1280);
    const before=await page.evaluate(()=>JSON.stringify(state));await click(preview.locator('summary'));assert.equal(await page.evaluate(()=>JSON.stringify(state)),before);await capture('phone-empty-history',390);
    await preview.evaluate(el=>window.originalPreview=el);const work=await authored();
    await click(panel.getByRole('button',{name:'Input 3.3 V',exact:true}));assert.deepEqual(await rows('undo'),{input:['3.3 V','1 V']});await capture('desktop-edit-preview',1280);
    const description=await undo.getAttribute('aria-describedby');assert.equal(await preview.locator('[id="'+description+'"]').textContent(),'Restores Input voltage to 1 V.');
    await click(undo);assert.equal((await design()).input,1);assert.deepEqual(await rows('redo'),{input:['1 V','3.3 V']});assert.equal(await preview.evaluate(el=>el===window.originalPreview&&el.open),true);assert.deepEqual(await authored(),work);
    await click(redo);assert.equal((await design()).input,3.3);await click(undo);await click(panel.getByRole('button',{name:'Input off',exact:true}));assert.equal(await redo.isDisabled(),true);assert.deepEqual(await rows('undo'),{input:['0 V','1 V']});assert.deepEqual(await authored(),work);
    result.workflows.push({name:'Keyboard preview and Undo/Redo restore the shown values; a new edit clears Redo; open disclosure and notebook remain intact'});
    await seed();const sensor=await design(),target=await page.evaluate(()=>state._circuitActive.undo.at(-1)),saved=await authored();
    assert.equal(await preview.locator('[data-history-action=undo] .circuit-history-count').textContent(),'2 available');assert.equal(await preview.locator('[data-history-action=redo] .circuit-history-count').textContent(),'1 available');
    assert.deepEqual((await rows('undo')).project,['Light sensor','Manual control']);await capture('desktop-both-actions',1280);await capture('small-phone-both-actions',320);
    await click(undo);assert.deepEqual(await design(),target);assert.deepEqual((await rows('redo')).project,['Manual control','Light sensor']);await click(redo);assert.deepEqual(await design(),sensor);assert.deepEqual(await authored(),saved);
    result.workflows.push({name:'Both actions preview the latest saved setup and accurate counts; experiment restoration preserves notes, explanation, reference, lessons and probes'});
    await page.emulateMedia({forcedColors:'active'});await capture('forced-colors',390);await page.emulateMedia({forcedColors:'none'});
    await panel.evaluate(el=>el.dir='rtl');await capture('rtl-preview',390);await panel.evaluate(el=>el.removeAttribute('dir'));
    assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourcePath)),result.sourceSha256);result.passed=true;
  }catch(error){result.failure=error.stack;throw error;}finally{await browser.close();result.browserClosed=true;fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(result,null,2)+'\n');}
  console.log(JSON.stringify({passed:result.passed,views:result.views.length,workflows:result.workflows.length,sourceSha256:result.sourceSha256}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
