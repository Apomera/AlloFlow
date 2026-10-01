const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const baseline=process.argv.includes('--baseline');
const output=baseline?path.join(__dirname,'baseline'):__dirname;
fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync(path.join(root,'stem_lab/stem_tool_circuit.js'),'utf8');
const sourceHash=crypto.createHash('sha256').update(source).digest('hex');

(async()=>{
  const browser=await chromium.launch({headless:true});
  const results={sourceSha256:sourceHash,baseline,checks:[],errors:[],axe:[],layouts:[],actions:[],focus:[],motion:[],screenshots:[],visualIssues:[]};
  console.log('Circuit workbench audit: '+sourceHash+(baseline?' (baseline capture)':''));
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>results.errors.push(e.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit workbench polish checks</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    // Hash and inject the same snapshot even if source editing continues during an audit.
    await page.addScriptTag({content:source});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});window.announcements=[];
      function Host(){
        const [data,setData]=React.useState({_circuit:{mode:'series',voltage:9,components:[{id:1,type:'bulb',value:100},{id:2,type:'switch',closed:false}],selectedPart:0,pauseMotion:false,startGuideOpen:false,lessonOpen:false,prediction:'Keep my own question'}});
        window.state=data;window.setState=setData;
        return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:setData,t:(_k,f)=>f,gradeLevel:'8',addToast:noop,awardXP:noop,announceToSR:message=>announcements.push(message),a11yClick:f=>({onClick:f}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});
      }
      window.auditRoot=ReactDOM.createRoot(document.querySelector('#root'));auditRoot.render(React.createElement(Host));
    });
    await page.getByRole('heading',{name:'Small circuits. Big discoveries.'}).waitFor();
    await page.locator('.circuit-schematic-frame').waitFor();
    await page.locator('.circuit-component-editor').waitFor();
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);

    const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,actual+' differs from '+expected);
    const current=()=>page.evaluate(()=>StemLab.solveCircuit(state._circuit).current);
    const order=()=>page.evaluate(()=>state._circuit.components.map(part=>part.id));
    const undo=()=>page.locator('.circuit-view-toolbar').getByRole('button',{name:'Undo',exact:true});
    const switchSymbol=()=>page.locator('.circuit-schematic [role="button"][aria-label^="Switch 2 "]');
    async function keyboardActivate(locator,key='Enter'){await locator.focus();await page.keyboard.press(key);}
    async function capture(name,selectors,width){
      const clip=await page.evaluate(selectors=>{
        const rects=selectors.map(selector=>{const el=document.querySelector(selector);if(!el)throw Error('Missing capture selector: '+selector);const r=el.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,right:r.right+scrollX,bottom:r.bottom+scrollY};});
        const x=Math.max(0,Math.floor(Math.min(...rects.map(r=>r.x)))-6),y=Math.max(0,Math.floor(Math.min(...rects.map(r=>r.y)))-6);
        return {x,y,width:Math.min(document.documentElement.scrollWidth-x,Math.ceil(Math.max(...rects.map(r=>r.right)))+6-x),height:Math.ceil(Math.max(...rects.map(r=>r.bottom)))+6-y};
      },selectors);
      const file=name+'-'+width+'.png';await page.screenshot({path:path.join(output,file),clip,fullPage:true,animations:'disabled'});
      results.screenshots.push({name,width,file,clip});
    }
    async function focusCheck(name,locator,width){
      await locator.evaluate(el=>el.blur());
      const before=await locator.evaluate(el=>getComputedStyle(el).boxShadow);
      await page.keyboard.press('Tab');await locator.focus();
      const actual=await locator.evaluate(el=>{const s=getComputedStyle(el);return {focused:document.activeElement===el,focusVisible:el.matches(':focus-visible'),outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,boxShadow:s.boxShadow};});
      actual.visible=actual.focused&&actual.focusVisible&&((actual.outlineStyle!=='none'&&parseFloat(actual.outlineWidth)>=2&&!['transparent','rgba(0, 0, 0, 0)'].includes(actual.outlineColor))||(actual.boxShadow!=='none'&&actual.boxShadow!==before));
      results.focus.push({name,width,...actual});
      if(!actual.visible)results.visualIssues.push({name,width,type:'focus',actual});
      await locator.evaluate(el=>el.blur());
    }
    async function motionCheck(name){
      const before=await page.evaluate(()=>({tick:state._circuit.tick||0,pauseMotion:state._circuit.pauseMotion,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches}));
      await page.waitForTimeout(250);
      const after=await page.evaluate(()=>({tick:state._circuit.tick||0,animations:document.getAnimations().filter(animation=>animation.playState==='running'&&Number(animation.effect?.getTiming().duration)>.01).map(animation=>({duration:animation.effect.getTiming().duration,target:animation.effect.target?.tagName}))}));
      results.motion.push({name,before,after});
      assert.equal(after.tick,before.tick,name+' must not advance charge motion');
      assert.deepEqual(after.animations,[],name+' must not run nontrivial CSS animations');
    }
    async function inspect(name,options){
      for(const width of [1280,390,320]){
        await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
        const scan={name,width,violations:await page.evaluate(async()=>{const scan=await axe.run(document.querySelector('#root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));})};results.axe.push(scan);
        if(scan.violations.length)results.visualIssues.push({name,width,type:'axe',violations:scan.violations});
        const dimensions=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollRegions:Array.from(document.querySelectorAll('.circuit-schematic')).map(el=>({label:el.getAttribute('aria-label'),width:el.clientWidth,scrollWidth:el.scrollWidth}))}));results.layouts.push({name,...dimensions});
        if(dimensions.scrollWidth>width+1){
          const elements=await page.evaluate(()=>Array.from(document.querySelectorAll('#root *')).map(el=>({tag:el.tagName,id:el.id,className:String(el.className),right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,text:el.textContent.slice(0,90)})).filter(el=>el.right>innerWidth+1&&el.width>0).slice(-35));
          results.visualIssues.push({name,width,type:'overflow',elements});
        }
        const actions=await page.locator(options.actions).evaluateAll((elements,primary)=>elements.filter(el=>el.checkVisibility()).map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {label:el.getAttribute('aria-label')||el.textContent.trim(),primary:el.matches(primary),width:r.width,height:r.height,disabled:el.disabled,transitionDuration:s.transitionDuration,animationDuration:s.animationDuration};}),options.primary||'.circuit-view-toolbar button,.circuit-parts-grid button');
        results.actions.push({name,width,actions});
        for(const action of actions){
          if(action.primary&&(action.width<43.9||action.height<43.9))results.visualIssues.push({name,width,type:'primary-action-size',action});
          // The shared reduced-motion reset is 0.01ms, effectively instantaneous.
          if(action.transitionDuration.split(',').some(value=>parseFloat(value)*(value.trim().endsWith('ms')?.001:1)>.0000101))results.visualIssues.push({name,width,type:'reduced-motion-transition',action});
        }
        for(const selector of options.focus||[])await focusCheck(name,page.locator(selector),width);
        await page.evaluate(()=>{document.activeElement?.blur();document.querySelectorAll('.circuit-schematic').forEach(el=>el.scrollLeft=0);});await page.mouse.move(0,0);
        for(const item of options.captures)await capture(item.name,item.selectors,width);
      }
      await page.setViewportSize({width:1280,height:1000});
    }

    assert.equal(await current(),0);
    assert.match(await page.locator('.circuit-inspector-readings').innerText(),/0 A/);
    await page.locator('.circuit-reading-map > summary').click();
    await inspect('open-loop',{
      actions:'.circuit-view-toolbar button,.circuit-part-inspector button,.circuit-component-editor button',
      focus:['.circuit-schematic','.circuit-schematic [role="button"][aria-label^="Switch 2 "]','#circuit-inspect-part'],
      captures:[{name:'open-loop-schematic',selectors:['.circuit-schematic-frame','.circuit-part-inspector']},{name:'open-loop-components',selectors:['.circuit-component-editor']},{name:'open-loop-insight',selectors:['.circuit-live-coach']}]
    });
    await keyboardActivate(switchSymbol());
    await page.waitForFunction(()=>state._circuit.components[1].closed===true);near(await current(),9/100.001);
    await keyboardActivate(switchSymbol(),'Space');
    await page.waitForFunction(()=>state._circuit.components[1].closed===false);assert.equal(await current(),0);
    await keyboardActivate(switchSymbol());
    await page.waitForFunction(()=>state._circuit.components[1].closed===true);near(await current(),9/100.001);
    results.checks.push({name:'Schematic switch supports Enter and Space with correct open/closed current'});

    const input=page.locator('.circuit-component-editor input[type="number"]');
    await input.focus();await page.keyboard.press('ArrowUp');
    await page.waitForFunction(()=>state._circuit.components[0].value===110);near(await current(),9/110.001);
    await keyboardActivate(undo());
    await page.waitForFunction(()=>state._circuit.components[0].value===100);near(await current(),9/100.001);
    const handle=page.locator('[data-circuit-drag-handle="1"]');
    await handle.focus();await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>state._circuit.components[1].id===1&&document.activeElement?.getAttribute('data-circuit-drag-handle')==='1');
    assert.deepEqual(await order(),[2,1]);near(await current(),9/100.001);
    await keyboardActivate(undo());await page.waitForFunction(()=>state._circuit.components[0].id===1);
    assert.deepEqual(await order(),[1,2]);assert.equal(await page.evaluate(()=>state._circuit.prediction),'Keep my own question');
    results.checks.push({name:'Keyboard value changes and component reorder support Undo; focus follows the moved part and current is position-independent'});

    await page.locator('#circuit-inspect-part').selectOption('1');
    await keyboardActivate(page.locator('.circuit-part-inspector').getByRole('button',{name:'Open selected switch',exact:true}),'Space');
    await page.waitForFunction(()=>state._circuit.components[1].closed===false);assert.equal(await current(),0);
    await keyboardActivate(page.locator('.circuit-part-inspector').getByRole('button',{name:'Close selected switch',exact:true}));
    await page.waitForFunction(()=>state._circuit.components[1].closed===true);near(await current(),9/100.001);
    await page.locator('#circuit-inspect-part').selectOption('0');
    assert.match(await page.locator('.circuit-inspector-readings').innerText(),/90\.00 mA/);
    results.checks.push({name:'Inspector selection and keyboard switch action agree with the schematic and electrical readings'});
    await motionCheck('Closed loop respects system reduced motion without the explicit pause toggle');
    await keyboardActivate(page.locator('.circuit-view-toolbar').getByRole('button',{name:'Pause motion',exact:true}));
    assert.equal(await page.evaluate(()=>state._circuit.pauseMotion),true);await motionCheck('Explicit pause retains stable current markers');
    await keyboardActivate(page.locator('.circuit-view-toolbar').getByRole('button',{name:'Resume motion',exact:true}));
    assert.equal(await page.evaluate(()=>state._circuit.pauseMotion),false);
    await inspect('closed-loop',{
      actions:'.circuit-parts-grid button,.circuit-view-toolbar button,.circuit-part-inspector button,.circuit-component-editor button',
      focus:['[data-circuit-drag-handle="1"]','.circuit-component-editor input[type="number"]'],
      captures:[{name:'closed-loop-schematic',selectors:['.circuit-schematic-frame','.circuit-part-inspector']},{name:'closed-loop-components',selectors:['.circuit-component-editor']},{name:'closed-loop-insight',selectors:['.circuit-live-coach']},{name:'closed-loop-readouts',selectors:['.circuit-readouts']}]
    });

    await keyboardActivate(page.locator('.circuit-view-toolbar').getByRole('button',{name:'3D bench',exact:true}));
    await page.locator('.circuit-3d').waitFor();
    near(await current(),9/100.001);assert.equal(await page.locator('.circuit-schematic-frame').count(),0);
    await page.locator('#circuit-inspect-part').selectOption('1');
    assert.match(await page.locator('.circuit-inspector-readings').innerText(),/90\.00 mA/);
    await motionCheck('3D bench respects reduced motion');
    await inspect('3d-loop',{
      actions:'.circuit-view-toolbar button,.circuit-camera button,.circuit-part-picker button,.circuit-part-inspector button',
      focus:['#circuit-inspect-part','.circuit-part-picker button:first-child'],
      captures:[{name:'3d-loop-scene',selectors:['.circuit-scene-heading','.circuit-scene-viewport','.circuit-scene-caption']},{name:'3d-loop-controls-inspector',selectors:['.circuit-camera','.circuit-part-inspector']}]
    });
    results.checks.push({name:'3D view preserves the circuit, exposes the selected switch readings, and respects reduced motion'});

    await page.evaluate(()=>setState(prev=>({...prev,_circuit:{...prev._circuit,mode:'parallel',voltage:9,benchView:'schematic',components:[{id:11,type:'resistor',value:100},{id:12,type:'bulb',value:200},{id:13,type:'resistor',value:300}],selectedPart:1,undo:[],redo:[]}})));
    await page.locator('.circuit-schematic-frame').waitFor();near(await current(),.165);
    assert.match(await page.locator('.circuit-inspector-readings').innerText(),/45\.00 mA/);
    const parallelHandle=page.locator('[data-circuit-drag-handle="11"]');
    await parallelHandle.focus();await page.keyboard.press('End');
    await page.waitForFunction(()=>state._circuit.components[2].id===11&&document.activeElement?.getAttribute('data-circuit-drag-handle')==='11');
    assert.deepEqual(await order(),[12,13,11]);near(await current(),.165);
    await keyboardActivate(undo());await page.waitForFunction(()=>state._circuit.components[0].id===11);
    assert.deepEqual(await order(),[11,12,13]);near(await current(),.165);
    const readingSummary=page.locator('.circuit-reading-map > summary');
    if(!await page.locator('.circuit-reading-map').evaluate(el=>el.open))await readingSummary.click();
    assert.match(await page.locator('.circuit-reading-map').innerText(),/90\.00 mA/);
    assert.match(await page.locator('.circuit-reading-map').innerText(),/45\.00 mA/);
    assert.match(await page.locator('.circuit-reading-map').innerText(),/30\.00 mA/);
    await inspect('parallel-three-parts',{
      actions:'.circuit-view-toolbar button,.circuit-component-editor button,.circuit-part-inspector button',
      focus:['.circuit-schematic','[data-circuit-drag-handle="11"]'],
      captures:[{name:'parallel-schematic',selectors:['.circuit-schematic-frame','.circuit-part-inspector']},{name:'parallel-components',selectors:['.circuit-component-editor']},{name:'parallel-insight',selectors:['.circuit-live-coach']},{name:'parallel-readouts',selectors:['.circuit-readouts']}]
    });
    results.checks.push({name:'Three parallel branches report90+45+30mA; keyboard End reorders without changing the165mA source current, and Undo restores the branch order'});
    await page.evaluate(()=>setState(prev=>({...prev,_circuit:{...prev._circuit,components:Array.from({length:8},(_,i)=>({id:20+i,type:'resistor',value:100*(i+1)})),selectedPart:0}})));
    await page.waitForFunction(()=>document.querySelector('.circuit-schematic svg').viewBox.baseVal.height===390);
    const branchBounds=await page.locator('.circuit-schematic [data-circuit-schematic-part]').evaluateAll(parts=>parts.map(part=>{const b=part.getBoundingClientRect();return {top:b.top,bottom:b.bottom};}));
    assert.equal(branchBounds.length,8);
    branchBounds.slice(1).forEach((bounds,i)=>assert.ok(bounds.top>=branchBounds[i].bottom,'Expanded branch symbols and labels must not overlap'));
    await inspect('parallel-eight-parts',{
      actions:'.circuit-view-toolbar button',focus:['.circuit-schematic'],
      captures:[{name:'parallel-eight-schematic',selectors:['.circuit-schematic-frame']}]
    });
    results.checks.push({name:'Eight parallel branches expand the schematic and keep symbols and labels separated'});
    assert.deepEqual(results.errors,[]);
    if(!baseline)assert.deepEqual(results.visualIssues,[],'Visual checks failed; inspect workbench-results.json for details.');
    results.passed=true;await page.evaluate(()=>auditRoot.unmount());
  }catch(error){results.failure=error.stack;throw error;}
  finally{results.sourceSha256AtEnd=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'stem_lab/stem_tool_circuit.js'))).digest('hex');results.sourceChangedDuringRun=results.sourceSha256AtEnd!==sourceHash;fs.writeFileSync(path.join(output,'workbench-results.json'),JSON.stringify(results,null,2));await browser.close();}
  console.log('Circuit workbench: '+results.checks.length+' workflows, '+results.axe.length+' axe scans, '+results.layouts.length+' layout checks, '+results.screenshots.length+' screenshots, '+results.visualIssues.length+' visual issues'+(baseline?' (baseline)':'')+'.');
})().catch(error=>{console.error(error);process.exitCode=1;});
