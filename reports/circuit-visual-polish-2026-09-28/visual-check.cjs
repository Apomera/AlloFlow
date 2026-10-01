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
  const results={sourceSha256:sourceHash,baseline,checks:[],errors:[],axe:[],layouts:[],actions:[],focus:[],screenshots:[],visualIssues:[]};
  console.log('Circuit visual audit: '+sourceHash+(baseline?' (baseline capture)':''));
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>results.errors.push(e.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit visual polish checks</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    // Inject the exact bytes hashed above even if the source changes during this audit.
    await page.addScriptTag({content:source});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});window.awards=[];
      function Host(){
        const [data,setData]=React.useState({_circuit:{components:[],pauseMotion:true,prediction:'Keep my own question'},_circuitMixed:{prediction:'Mixed study'},_circuitActive:{reflection:'Active study'},_circuitNetwork:{reflection:'Network study'}});
        window.state=data;window.setState=setData;
        return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:setData,t:(_k,f)=>f,gradeLevel:'8',addToast:noop,awardXP:(...args)=>awards.push(args),announceToSR:noop,a11yClick:f=>({onClick:f}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});
      }
      window.auditRoot=ReactDOM.createRoot(document.querySelector('#root'));auditRoot.render(React.createElement(Host));
    });
    await page.getByRole('heading',{name:'Small circuits. Big discoveries.'}).waitFor();
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
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
    }
    async function inspect(name,selector,options={}){
      for(const width of [1280,390,320]){
        await page.setViewportSize({width,height:1000});
        await page.evaluate(()=>document.fonts.ready);
        const scan={name,width,violations:await page.evaluate(async()=>{const scan=await axe.run(document.querySelector('#root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));})};results.axe.push(scan);
        if(scan.violations.length)results.visualIssues.push({name,width,type:'axe',violations:scan.violations});
        const dimensions=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));results.layouts.push({name,...dimensions});
        if(dimensions.scrollWidth>width+1){
          const elements=await page.evaluate(()=>Array.from(document.querySelectorAll('#root *')).map(el=>({tag:el.tagName,id:el.id,className:String(el.className),right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width,text:el.textContent.slice(0,90)})).filter(el=>el.right>innerWidth+1&&el.width>0).slice(-35));
          results.visualIssues.push({name,width,type:'overflow',elements});
        }
        const actions=await page.locator(options.actions||selector+' button').evaluateAll(elements=>elements.filter(el=>el.checkVisibility()).map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {label:el.getAttribute('aria-label')||el.textContent.trim(),width:r.width,height:r.height,disabled:el.disabled,transitionDuration:s.transitionDuration,animationDuration:s.animationDuration};}));
        results.actions.push({name,width,actions});
        // The shared reduced-motion reset uses 0.01ms, which is effectively instantaneous.
        for(const action of actions){if(action.width<43.9||action.height<43.9)results.visualIssues.push({name,width,type:'primary-action-size',action});if(action.transitionDuration.split(',').some(value=>parseFloat(value)>0.00001))results.visualIssues.push({name,width,type:'reduced-motion-transition',action});}
        if(options.focus){await focusCheck(name,page.locator(options.focus),width);await page.locator(options.focus).evaluate(el=>el.blur());}
        for(const item of options.captures||[{name,selectors:[selector]}])await capture(item.name,item.selectors,width);
      }
      await page.setViewportSize({width:1280,height:1000});
    }
    const start=page.locator('.circuit-start-guide');
    assert.equal(await start.getAttribute('open'),'');
    assert.equal(await page.evaluate(()=>document.activeElement===document.body),true);
    await inspect('first-circuit','[data-circuit-bench]',{actions:'[data-circuit-bench] .circuit-action-row button',focus:'[data-circuit-start-experiment]'});
    await start.locator('summary').focus();await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!document.querySelector('.circuit-start-guide').open);
    await page.keyboard.press('Enter');
    await page.getByRole('button',{name:'Build on my own',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement.id==='circuit-parts-heading');
    assert.equal(await page.evaluate(()=>state._circuit.components.length),0);
    await start.locator('summary').click();
    await page.getByRole('button',{name:'Start with a bulb',exact:true}).click();
    await page.waitForFunction(()=>state._circuit.lessonId==='loop'&&document.activeElement===document.querySelector('.circuit-lessons>summary'));
    assert.equal(await page.evaluate(()=>state._circuit.components[1].closed),false);
    assert.equal(await page.evaluate(()=>state._circuit.prediction),'Keep my own question');
    results.checks.push({name:'Optional start guide supports keyboard, free building, and explicit guided start with focus'});

    const lab=page.locator('.circuit-lessons');
    await lab.getByRole('button',{name:'It stays at zero',exact:true}).click();
    await lab.getByRole('button',{name:'Test my prediction',exact:true}).click();
    await lab.getByText('1 of 3 experiments tested',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>state._circuit.lessonTrial.correct),false);
    await page.locator('.circuit-reading-map > summary').click();
    assert.match(await page.locator('.circuit-inspector-readings').innerText(),/90\.00 mA/);
    await inspect('seeded-bench','.circuit-parts-shelf',{actions:'.circuit-parts-grid button,.circuit-view-toolbar button',focus:'.circuit-parts-grid button:first-child',captures:[{name:'seeded-bench',selectors:['.circuit-parts-shelf','svg[aria-label^="Interactive series"]']},{name:'seeded-readings',selectors:['.circuit-part-inspector','.circuit-live-coach']},{name:'live-measurements',selectors:['.circuit-readouts']}]});
    await lab.getByRole('textbox',{name:'Explain using evidence',exact:true}).fill('Closing the switch made a complete loop: current rose from zero to about 90 mA.');
    await lab.getByRole('button',{name:'Next: Turn down the current',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>state._circuit.lessonId==='resistance'&&document.activeElement===document.querySelector('.circuit-lessons legend'));
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.circuit-lessons fieldset button')),true);
    const beforeResume=await page.evaluate(()=>JSON.stringify([state._circuit.components,state._circuit.mode,state._circuit.voltage]));
    await lab.getByRole('button',{name:/Complete the loop/}).click();
    assert.equal(await page.evaluate(()=>JSON.stringify([state._circuit.components,state._circuit.mode,state._circuit.voltage])),beforeResume);
    assert.match(await lab.getByRole('textbox',{name:'Explain using evidence',exact:true}).inputValue(),/complete loop/);
    await lab.getByText('Saved experiment evidence. Your live bench has changed since this test.',{exact:true}).waitFor();
    await inspect('guided-evidence','.circuit-lessons',{actions:'.circuit-lessons .circuit-action-row button,.circuit-lesson-cards button',focus:'.circuit-lesson-next button'});
    await lab.getByRole('button',{name:'Load this experiment result',exact:true}).click();
    assert.equal(await page.evaluate(()=>state._circuit.components[1].type),'switch');
    await page.getByRole('button',{name:'Undo',exact:true}).click();
    assert.equal(await page.evaluate(()=>state._circuit.components.length),1);
    results.checks.push({name:'A revised prediction counts as a tested experiment; notes and saved evidence survive next/resume/load/Undo'});

    const workspaceGuide=page.locator('.circuit-workspace-guide');
    await workspaceGuide.locator('summary').focus();await page.keyboard.press('Enter');
    await inspect('workbench-guide','.circuit-workspace-guide',{actions:'.circuit-workspace-guide-grid button',focus:'.circuit-workspace-guide-grid li:first-child button'});
    const simpleBefore=await page.evaluate(()=>JSON.stringify(state._circuit.components));
    for(const name of ['Mixed circuits','Active electronics','Connected circuits','Simple circuits']){
      const button=workspaceGuide.getByRole('button',{name:'Open '+name,exact:true});await button.focus();await page.keyboard.press('Enter');
      await page.getByRole('button',{name,exact:true}).waitFor();
      assert.equal(await page.getByRole('button',{name,exact:true}).getAttribute('aria-pressed'),'true');
    }
    assert.equal(await page.evaluate(()=>JSON.stringify(state._circuit.components)),simpleBefore);
    assert.deepEqual(await page.evaluate(()=>[state._circuitMixed.prediction,state._circuitActive.reflection,state._circuitNetwork.reflection]),['Mixed study','Active study','Network study']);
    await page.keyboard.press('Escape');
    assert.equal(await workspaceGuide.getAttribute('open'),null);
    assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.circuit-workspace-guide>summary')),true);
    results.checks.push({name:'Workbench guide supports Enter and Escape, preserves all four studies, and identifies the active workspace'});

    await page.getByRole('button',{name:'Try a Target',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement?.getAttribute('data-circuit-target')==='0');
    assert.equal(await page.evaluate(()=>awards.filter(a=>a[0]==='circuitChallenge').length),0);
    await page.getByRole('button',{name:'Check target',exact:true}).click();
    assert.equal(await page.evaluate(()=>awards.filter(a=>a[0]==='circuitChallenge').length),0);
    await page.evaluate(()=>setState(prev=>({...prev,_circuit:{...prev._circuit,mode:'series',voltage:10,components:[{id:91,type:'resistor',value:5}]}})));
    await page.getByRole('button',{name:'Check target',exact:true}).click();
    await page.waitForFunction(()=>awards.filter(a=>a[0]==='circuitChallenge').length===1);
    await page.getByRole('button',{name:'Check target',exact:true}).click();
    assert.equal(await page.evaluate(()=>awards.filter(a=>a[0]==='circuitChallenge').length),1);
    await inspect('target-feedback','[aria-labelledby="circuit-challenges-title"]',{actions:'[data-circuit-target],[aria-label="Active circuit target"] button',focus:'[data-circuit-target="0"]'});
    results.checks.push({name:'Target selection earns nothing; explicit checks provide feedback and award a matching circuit once'});
    assert.deepEqual(results.errors,[]);
    if(!baseline)assert.deepEqual(results.visualIssues,[],'Visual checks failed; inspect visual-results.json for details.');
    results.passed=true;await page.evaluate(()=>auditRoot.unmount());
  }catch(error){results.failure=error.stack;throw error;}
  finally{results.sourceSha256AtEnd=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'stem_lab/stem_tool_circuit.js'))).digest('hex');results.sourceChangedDuringRun=results.sourceSha256AtEnd!==sourceHash;fs.writeFileSync(path.join(output,'visual-results.json'),JSON.stringify(results,null,2));await browser.close();}
  console.log('Circuit visuals: '+results.checks.length+' workflows, '+results.axe.length+' axe scans, '+results.layouts.length+' layout checks, '+results.screenshots.length+' screenshots, '+results.visualIssues.length+' visual issues'+(baseline?' (baseline)':'')+'.');
})().catch(error=>{console.error(error);process.exitCode=1;});
