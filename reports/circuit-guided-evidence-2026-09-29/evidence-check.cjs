const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const baseline=process.argv.includes('--baseline'),output=baseline?path.join(__dirname,'baseline'):__dirname;
fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync(path.join(root,'stem_lab/stem_tool_circuit.js'),'utf8');
const sourceHash=crypto.createHash('sha256').update(source).digest('hex');
const lessons=[
  {id:'resistance',title:'Turn down the current',choice:'It halves',correct:true,before:.09,after:.045,beforeText:'90.00 mA',afterText:'45.00 mA',reason:'With voltage fixed, I = V/R.'},
  {id:'paths',title:'Give charge another path',choice:'It halves',correct:false,before:.09,after:.18,beforeText:'90.00 mA',afterText:'180.00 mA',reason:'Each branch still has 9 V across 100 Ω'},
  {id:'loop',title:'Complete the loop',choice:'It stays at zero',correct:false,before:0,after:9/100.001,beforeText:'0 A',afterText:'90.00 mA',reason:'Closing the switch completes a conducting loop.'}
];
(async()=>{
  const browser=await chromium.launch({headless:true});
  const results={sourceSha256:sourceHash,baseline,checks:[],errors:[],axe:[],layouts:[],actions:[],focus:[],charts:[],motion:[],screenshots:[],visualIssues:[]};
  console.log('Circuit guided evidence audit: '+sourceHash+(baseline?' (baseline capture)':''));
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',error=>results.errors.push(error.message));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Circuit guided evidence checks</title></head><body><main id="root"></main></body></html>');
    await page.addStyleTag({path:path.join(root,'dev-tools/.cache/sweep-tailwind.css')});
    await page.addStyleTag({content:'body{margin:0;background:#070f1b;font-family:system-ui}#root{max-width:960px;margin:20px auto;padding:12px}*{box-sizing:border-box}'});
    for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(root,file)});
    // Freeze source once so concurrent edits cannot mislabel the browser evidence.
    await page.addScriptTag({content:source});
    await page.evaluate(()=>{
      const noop=()=>{},icons=new Proxy({},{get:()=>()=>React.createElement('span')});
      const before={mode:'series',voltage:3,components:[{id:51,type:'resistor',value:330}]},after={...before,voltage:6};
      window.resultFocusEvents=0;window.awards=[];
      document.addEventListener('focusin',event=>{if(event.target.id==='circuit-lesson-result')resultFocusEvents++;});
      function Host(){
        const [data,setData]=React.useState({_circuit:{...after,pauseMotion:false,startGuideOpen:false,lessonOpen:true,prediction:'Keep my independent prediction.',explanation:'Keep my independent explanation.',experimentBaseline:{circuit:before,prediction:'Keep my baseline prediction.'},observations:[{before,after,delta:3/330,prediction:'My voltage question.',explanation:'My original observation.',changes:['Supply voltage'],controlled:true}]}});
        window.state=data;window.setState=setData;
        return StemLab._registry.circuit.render({React,icons,toolData:data,setToolData:setData,t:(_key,fallback)=>fallback,gradeLevel:'8',addToast:noop,awardXP:(...args)=>awards.push(args),announceToSR:noop,a11yClick:fn=>({onClick:fn}),setStemLabTool:noop,setStemLabTab:noop,setToolSnapshots:noop});
      }
      window.auditRoot=ReactDOM.createRoot(document.querySelector('#root'));auditRoot.render(React.createElement(Host));
    });
    await page.getByRole('heading',{name:'Small circuits. Big discoveries.'}).waitFor();
    await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
    const lab=page.locator('.circuit-lessons'),evidence=page.locator('section.circuit-lesson-evidence');
    const loadBefore=()=>evidence.getByRole('button',{name:'Load experiment baseline',exact:true});
    const loadAfter=()=>evidence.getByRole('button',{name:'Load this experiment result',exact:true});
    const undo=()=>page.locator('.circuit-view-toolbar').getByRole('button',{name:'Undo',exact:true});
    const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,actual+' differs from '+expected);
    const ownNotes=()=>page.evaluate(()=>JSON.stringify({prediction:state._circuit.prediction,explanation:state._circuit.explanation,experimentBaseline:state._circuit.experimentBaseline,observations:state._circuit.observations}));
    const lessonNotes=()=>page.evaluate(()=>JSON.stringify({lessonRecords:state._circuit.lessonRecords,lessonTrial:state._circuit.lessonTrial,lessonChoice:state._circuit.lessonChoice,lessonExplanation:state._circuit.lessonExplanation}));
    const bench=()=>page.evaluate(()=>JSON.stringify({mode:state._circuit.mode,voltage:state._circuit.voltage,components:state._circuit.components}));
    const historySize=()=>page.evaluate(()=>(state._circuit.undo||[]).length);
    const originalNotes=await ownNotes();
    async function pressed(before,after){assert.equal(await loadBefore().getAttribute('aria-pressed'),String(before));assert.equal(await loadAfter().getAttribute('aria-pressed'),String(after));assert.equal(await loadBefore().isVisible(),true);assert.equal(await loadAfter().isVisible(),true);}
    async function matches(stage){assert.equal(await page.evaluate(stage=>StemLab.circuitExperimentDiff(state._circuit.lessonTrial[stage],state._circuit).unchanged,stage),true);}
    async function assertNotes(saved){assert.equal(await lessonNotes(),saved);assert.equal(await ownNotes(),originalNotes);}
    async function keyboardActivate(locator){await locator.focus();await page.keyboard.press('Enter');}
    async function focusCheck(name,locator,width){
      await locator.evaluate(el=>el.blur());const before=await locator.evaluate(el=>getComputedStyle(el).boxShadow);
      await page.keyboard.press('Tab');await locator.focus();
      const actual=await locator.evaluate(el=>{const s=getComputedStyle(el);return {focused:document.activeElement===el,focusVisible:el.matches(':focus-visible'),outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,boxShadow:s.boxShadow};});
      actual.visible=actual.focused&&actual.focusVisible&&((actual.outlineStyle!=='none'&&parseFloat(actual.outlineWidth)>=2&&!['transparent','rgba(0, 0, 0, 0)'].includes(actual.outlineColor))||(actual.boxShadow!=='none'&&actual.boxShadow!==before));
      results.focus.push({name,width,...actual});if(!actual.visible)results.visualIssues.push({name,width,type:'focus',actual});await locator.evaluate(el=>el.blur());
    }
    async function chartCheck(name,width,lesson){
      const description=await page.locator('.circuit-evidence-chart').getAttribute('aria-describedby');
      assert.ok((description||'').split(/\s+/).includes('circuit-evidence-scale'),'The chart must reference its shared-scale description');
      assert.equal(await evidence.locator('#circuit-evidence-scale').isVisible(),true);
      assert.ok((await evidence.locator('#circuit-evidence-scale').innerText()).trim().length>0);
      const rows=await page.locator('.circuit-evidence-bar').evaluateAll(elements=>elements.map(el=>{const track=el.querySelector('.circuit-evidence-track'),span=track?.querySelector(':scope > span');if(!track||!span)throw Error('Evidence bar is missing its track');const style=getComputedStyle(span),trackStyle=getComputedStyle(track),trackWidth=track.getBoundingClientRect().width,contentWidth=trackWidth-['borderLeftWidth','borderRightWidth','paddingLeft','paddingRight'].reduce((sum,key)=>sum+parseFloat(trackStyle[key]||0),0);return {stage:el.dataset.stage,text:el.textContent,styleWidth:span.style.width,trackWidth,contentWidth,barWidth:span.getBoundingClientRect().width,trackHidden:track.getAttribute('aria-hidden'),transitionDuration:style.transitionDuration,animationName:style.animationName,animationDuration:style.animationDuration};}));
      assert.equal(rows.length,2);const max=Math.max(lesson.before,lesson.after);
      for(const stage of ['before','after']){const row=rows.find(item=>item.stage===stage);assert.ok(row,'Missing '+stage+' evidence');assert.ok(row.styleWidth.endsWith('%'));near(parseFloat(row.styleWidth),lesson[stage]/max*100,.01);assert.equal(row.trackHidden,'true','The visual track should have a text equivalent instead of a duplicate announcement');assert.ok(row.text.includes(lesson[stage+'Text']),row.text);near(row.barWidth,row.contentWidth*lesson[stage]/max,1);assert.ok(row.transitionDuration.split(',').every(value=>parseFloat(value)*(value.trim().endsWith('ms')?.001:1)<=.0000101),'Evidence bars must not animate under reduced motion');if(row.animationName!=='none')assert.ok(row.animationDuration.split(',').every(value=>parseFloat(value)*(value.trim().endsWith('ms')?.001:1)<=.0000101));}
      near(rows[0].trackWidth,rows[1].trackWidth,1);
      results.charts.push({name,width,sharedMaximum:max,rows});
    }
    async function motionCheck(name){
      const before=await page.evaluate(()=>({tick:state._circuit.tick||0,focusEvents:resultFocusEvents,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,paused:state._circuit.pauseMotion}));
      await page.waitForTimeout(250);
      const after=await page.evaluate(()=>({tick:state._circuit.tick||0,focusEvents:resultFocusEvents,animations:document.getAnimations().filter(animation=>animation.playState==='running'&&Number(animation.effect?.getTiming().duration)>.01).map(animation=>({duration:animation.effect.getTiming().duration,target:animation.effect.target?.className}))}));
      assert.equal(before.reduced,true);assert.equal(before.paused,false);assert.equal(after.tick,before.tick);assert.equal(after.focusEvents,before.focusEvents);assert.deepEqual(after.animations,[]);results.motion.push({name,before,after});
    }
    async function inspect(name,lesson){
      for(const width of [1280,390,320]){
        await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready);
        const scan={name,width,violations:await page.evaluate(async()=>{const scan=await axe.run(document.querySelector('#root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return scan.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));})};results.axe.push(scan);if(scan.violations.length)results.visualIssues.push({name,width,type:'axe',violations:scan.violations});
        const dimensions=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));results.layouts.push({name,...dimensions});if(dimensions.scrollWidth>width+1)results.visualIssues.push({name,width,type:'overflow',...dimensions});
        const actions=await evidence.locator('button').evaluateAll(elements=>elements.filter(el=>el.checkVisibility()).map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {label:el.getAttribute('aria-label')||el.textContent.trim(),width:r.width,height:r.height,transitionDuration:s.transitionDuration};}));results.actions.push({name,width,actions});
        for(const action of actions){if(action.width<43.9||action.height<43.9)results.visualIssues.push({name,width,type:'primary-action-size',action});if(action.transitionDuration.split(',').some(value=>parseFloat(value)*(value.trim().endsWith('ms')?.001:1)>.0000101))results.visualIssues.push({name,width,type:'reduced-motion-transition',action});}
        await chartCheck(name,width,lesson);await focusCheck(name+' baseline',loadBefore(),width);await focusCheck(name+' result',loadAfter(),width);
        await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,0);
        const clip=await evidence.evaluate(el=>{const r=el.getBoundingClientRect(),question=el.closest('.circuit-lesson-body').querySelector('fieldset').getBoundingClientRect(),x=Math.max(0,Math.floor(Math.min(r.x,question.x)+scrollX)-6),y=Math.max(0,Math.floor(question.y+scrollY)-6);return {x,y,width:Math.min(document.documentElement.scrollWidth-x,Math.ceil(Math.max(r.right,question.right)+scrollX)+6-x),height:Math.ceil(r.bottom+scrollY)+6-y};});
        const file=name+'-'+width+'.png';await page.screenshot({path:path.join(output,file),clip,fullPage:true,animations:'disabled'});results.screenshots.push({name,width,file,clip});
      }
      await page.setViewportSize({width:1280,height:1000});
    }

    for(const lesson of lessons){
      await lab.locator('.circuit-lesson-cards button').filter({has:page.getByText(lesson.title,{exact:true})}).click();
      await page.waitForFunction(id=>state._circuit.lessonId===id,lesson.id);
      assert.equal(await evidence.count(),0);assert.equal(await page.locator('.circuit-evidence-chart').count(),0);assert.equal(await page.locator('#circuit-lesson-result').count(),0);assert.equal(await lab.locator('.circuit-evidence-saved-prediction').count(),0);assert.ok(!(await lab.innerText()).includes(lesson.reason));
      assert.equal(await lab.getByRole('button',{name:'Test my prediction',exact:true}).isEnabled(),false);
      await lab.getByRole('button',{name:lesson.choice,exact:true}).click();
      assert.equal(await evidence.count(),0);assert.equal(await page.locator('.circuit-evidence-chart').count(),0);
      const beforeFocus=await page.evaluate(()=>resultFocusEvents);
      await lab.getByRole('button',{name:'Test my prediction',exact:true}).click();
      await page.waitForFunction(()=>document.activeElement?.id==='circuit-lesson-result');
      assert.equal(await page.locator('h3#circuit-lesson-result').getAttribute('tabindex'),'-1');assert.equal(await page.evaluate(()=>resultFocusEvents),beforeFocus+1);
      assert.equal(await page.evaluate(()=>state._circuit.lessonTrial.correct),lesson.correct);assert.equal(await lab.locator('fieldset button').count(),0);
      assert.ok((await lab.locator('.circuit-evidence-saved-prediction').innerText()).includes(lesson.choice));
      near(await page.evaluate(()=>StemLab.solveCircuit(state._circuit.lessonTrial.before).current),lesson.before);near(await page.evaluate(()=>StemLab.solveCircuit(state._circuit.lessonTrial.after).current),lesson.after);
      await pressed(false,true);await matches('after');
      const explanation=evidence.getByRole('textbox',{name:'Explain using evidence',exact:true});
      await explanation.fill('For '+lesson.id+', I compared '+lesson.beforeText+' with '+lesson.afterText+'. The measured result helps me explain the change.');
      assert.equal(await page.evaluate(()=>document.activeElement?.id),'circuit-lesson-explanation');assert.equal(await page.evaluate(()=>resultFocusEvents),beforeFocus+1);
      const saved=await lessonNotes(),afterCircuit=await bench(),history=await historySize();
      await loadAfter().click();assert.equal(await historySize(),history);await assertNotes(saved);
      await keyboardActivate(loadBefore());await matches('before');await pressed(true,false);assert.equal(await historySize(),history+1);await assertNotes(saved);
      assert.equal(await evidence.locator('.circuit-evidence-bench-note').innerText(),'The experiment baseline is now on your bench.');
      await loadBefore().click();assert.equal(await historySize(),history+1);await assertNotes(saved);
      await keyboardActivate(undo());assert.equal(await bench(),afterCircuit);await pressed(false,true);await assertNotes(saved);
      assert.equal(await evidence.locator('.circuit-evidence-bench-note').innerText(),'These readings match the experiment now on your bench.');
      assert.equal(await page.evaluate(()=>resultFocusEvents),beforeFocus+1,'Only Test should move focus to the result heading');
      await motionCheck(lesson.id+' result');await inspect(lesson.id+'-result',lesson);
      results.checks.push({name:lesson.id+': evidence withheld until Test; saved prediction, exact shared-scale currents, one result focus, stable explanation, undoable baseline/result controls, and independent notebook preserved'});
    }

    assert.equal(await lab.locator('progress').getAttribute('value'),'3');
    await page.evaluate(()=>setState(prev=>({...prev,_circuit:{...prev._circuit,voltage:12}})));
    await page.waitForFunction(()=>state._circuit.voltage===12);await pressed(false,false);
    assert.equal(await evidence.locator('.circuit-evidence-bench-note').innerText(),'Saved experiment evidence. Your live bench has changed since this test.');
    const changedCircuit=await bench(),saved=await lessonNotes(),changedHistory=await historySize(),focusEvents=await page.evaluate(()=>resultFocusEvents);
    await inspect('changed-bench',lessons[2]);
    await keyboardActivate(loadBefore());await matches('before');await pressed(true,false);assert.equal(await historySize(),changedHistory+1);await assertNotes(saved);
    await keyboardActivate(undo());assert.equal(await bench(),changedCircuit);await pressed(false,false);await assertNotes(saved);
    await keyboardActivate(loadAfter());await matches('after');await pressed(false,true);assert.equal(await historySize(),changedHistory+1);await assertNotes(saved);
    await keyboardActivate(undo());assert.equal(await bench(),changedCircuit);await pressed(false,false);await assertNotes(saved);
    assert.equal(await page.evaluate(()=>resultFocusEvents),focusEvents);assert.deepEqual(await page.evaluate(()=>awards),[]);
    results.checks.push({name:'Changed live bench leaves saved evidence intact; baseline and result load exact circuits with Undo, stable lesson records, preserved notebook, and no rewards'});
    await motionCheck('Changed bench retains stable saved evidence');
    assert.deepEqual(results.errors,[]);if(!baseline)assert.deepEqual(results.visualIssues,[],'Inspect evidence-results.json for visual failures.');
    results.passed=true;await page.evaluate(()=>auditRoot.unmount());
  }catch(error){results.failure=error.stack;throw error;}
  finally{results.sourceSha256AtEnd=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'stem_lab/stem_tool_circuit.js'))).digest('hex');results.sourceChangedDuringRun=results.sourceSha256AtEnd!==sourceHash;fs.writeFileSync(path.join(output,'evidence-results.json'),JSON.stringify(results,null,2));await browser.close();}
  console.log('Circuit evidence: '+results.checks.length+' workflows, '+results.axe.length+' axe scans, '+results.charts.length+' chart checks, '+results.screenshots.length+' screenshots, '+results.visualIssues.length+' visual issues'+(baseline?' (baseline)':'')+'.');
})().catch(error=>{console.error(error);process.exitCode=1;});
