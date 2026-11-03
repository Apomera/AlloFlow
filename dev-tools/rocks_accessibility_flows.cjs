// Keyboard and native-control behavior; each flow reports independently.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {start,audit,layout}=require('./rocks_accessibility_harness.cjs');
const {modes,views,wb,fieldResume,notebook,specimenNotes,practiceRound,journalBrowseNotes,detailNavigationNotes,selectiveNotebook}=require('./rocks_accessibility_views.cjs');
async function runFlows(h,options={}){const p=h.page,result={checks:[],failures:[],focus:[],axe:{},errors:h.errors,announcements:[],skipped:[]};p.setDefaultTimeout(8000);
 const mount=async state=>{await p.reload({timeout:45000});await p.waitForFunction(()=>typeof window.__setState==='function',null,{timeout:45000});await p.evaluate(state=>window.__setState({rocks:state,rockCycle:{}}),typeof state==='string'?{mode:state}:state);await p.waitForTimeout(650);};
 const attempt=async(name,fn)=>{if(options.filter&&!new RegExp(options.filter,'i').test(name)){result.skipped.push(name);return;}try{await fn();result.checks.push(name);console.log('PASS '+name);}catch(e){result.failures.push({name,error:e.message});console.log('FAIL '+name+': '+e.message);}fs.writeFileSync(path.join(h.output,'interaction-results.json'),JSON.stringify(result,null,2));};
 const focus=async name=>{await p.waitForTimeout(150);result.focus.push({event:name,...await p.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e),r=e.getBoundingClientRect();return{tag:e.tagName,id:e.id,name:(e.getAttribute('aria-label')||e.textContent||'').slice(0,120),attributes:[...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]),outline:s.outline,shadow:s.boxShadow,focusVisible:e.matches(':focus-visible'),bounds:{x:r.x,y:r.y,width:r.width,height:r.height},live:[...document.querySelectorAll('[role=status],[role=alert],[aria-live]')].map(x=>({text:x.textContent.slice(0,180),role:x.getAttribute('role'),live:x.getAttribute('aria-live')})),announcements:window.__announcements.slice(-5)}})});};
 const snap=async name=>{await p.screenshot({path:path.join(h.output,name+'.png'),animations:'disabled'});};
 const axe=async name=>{await p.waitForTimeout(650);result.axe[name]=await audit(p,'#root');};
 const chooseActivity=async mode=>{
   const button=p.locator('[data-rocks-mode="'+mode+'"]');
   if(!await button.isVisible()) await p.locator('[data-rk-mode-trigger]').press('Enter');
   await button.press('Enter');
 };
 const chooseFieldCase=async id=>{
   const picker=p.locator('[data-rk-field-picker]'), button=p.locator('[data-rk-field-case="'+id+'"]');
   if(!await button.isVisible()) await picker.locator('summary').press('Enter');
   await button.press('Enter');
   assert.equal(await picker.evaluate(element=>element.open),false);
 };
 try{
  await attempt('All 11 navigation controls work by keyboard and expose source focus outlines',async()=>{await p.setViewportSize({width:1280,height:1000});await mount('landscape');for(const mode of modes){let b=p.locator('[data-rocks-mode="'+mode+'"]');await b.focus();await p.keyboard.press('Enter');await p.waitForFunction(mode=>window.__state.rocks.mode===mode,mode);await focus('nav-'+mode);}assert.ok(result.focus.every(f=>f.outline.includes('3px')));});
  await attempt('Compact activity navigation opens, cancels and switches all 11 activities without losing learner progress',async()=>{
    const originalViewport=p.viewportSize();
    try {
      await p.setViewportSize({width:320,height:900});
      const seed={mode:'landscape',quizIdx:5,quizLog:{0:0,1:1},quizScore:1,fieldCases:{activeId:'deep-cooling',records:{'deep-cooling':notebook.fieldCases.records['deep-cooling']}}};
      await mount(seed);
      const nav=p.locator('[data-rocks-mode-nav]'),trigger=nav.locator('[data-rk-mode-trigger]'),choices=nav.locator('[data-rk-mode-choices]');
      await trigger.waitFor();
      assert.equal(await trigger.getAttribute('aria-expanded'),'false');
      assert.equal(await trigger.getAttribute('aria-controls'),await choices.getAttribute('id'));
      assert.equal(await nav.locator('[data-rocks-mode]').count(),modes.length);
      assert.equal(await choices.isVisible(),false);
      const closedHeight=(await nav.boundingBox()).height;
      const checkProgress=async()=>{
        const data=await p.evaluate(()=>{const {quizIdx,quizLog,quizScore,fieldCases}=window.__state.rocks;return{quizIdx,quizLog,quizScore,fieldCases};});
        assert.deepEqual(data,{quizIdx:seed.quizIdx,quizLog:seed.quizLog,quizScore:seed.quizScore,fieldCases:seed.fieldCases});
      };
      await trigger.press('Space');
      await choices.waitFor();
      assert.equal(await trigger.getAttribute('aria-expanded'),'true');
      assert.ok((await nav.boundingBox()).height>closedHeight);
      const ids=await nav.locator('[data-rocks-mode]').evaluateAll(buttons=>buttons.map(b=>b.dataset.rocksMode));
      assert.deepEqual(ids,modes);
      await nav.locator('[data-rocks-mode="quiz"]').focus();
      await p.keyboard.press('Escape');
      await p.waitForFunction(()=>document.activeElement.hasAttribute('data-rk-mode-trigger'));
      assert.equal(await choices.isVisible(),false);
      assert.equal(await p.evaluate(()=>window.__state.rocks.mode),'landscape');
      await checkProgress();
      await focus('compact-navigation-cancel');
      for (const mode of modes) {
        await chooseActivity(mode);
        const destination={compare:'rk-compare-title',fieldwork:'rk-field-title',densityLab:'rk-density-title',notebook:'rk-notebook-title'}[mode]||'rk-activity-title';
        await p.waitForFunction(({mode,destination})=>window.__state.rocks.mode===mode&&document.activeElement.id===destination,{mode,destination});
        const selected=nav.locator('[data-rocks-mode="'+mode+'"][aria-pressed="true"]');
        assert.equal(await selected.count(),1,mode);
        const label=(await selected.textContent()).trim();
        assert.ok(label&&((await trigger.textContent()).includes(label)),mode+' trigger should identify its current activity');
        assert.equal(await trigger.getAttribute('aria-expanded'),'false');
        assert.equal(await choices.isVisible(),false);
      }
      await checkProgress();
      await trigger.press('Enter');
      await axe('compact-navigation-open');
      await nav.locator('[data-rocks-mode="notebook"]').press('Escape');
      await axe('compact-navigation-closed');
    } finally { await p.setViewportSize(originalViewport); }
  });
  await attempt('Compact activity navigation preserves focus at the container breakpoint and when resizing back to wide',async()=>{
    const originalViewport=p.viewportSize();
    try {
      await p.setViewportSize({width:1280,height:900});
      await mount('rocks');
      const nav=p.locator('[data-rocks-mode-nav]'),trigger=nav.locator('[data-rk-mode-trigger]');
      const size=async width=>{
        await nav.evaluate((element,width)=>{
          const borders=element.offsetWidth-element.clientWidth;
          Object.assign(element.style,{boxSizing:'border-box',flex:'0 0 auto',maxWidth:'100%',width:(width+borders)+'px'});
        },width);
        assert.equal(await nav.evaluate(element=>element.clientWidth),width);
      };
      await size(601);
      assert.equal(await trigger.isVisible(),false);
      const target=nav.locator('[data-rocks-mode="workbench"]');
      await target.focus();
      await size(600);
      await trigger.waitFor();
      await p.waitForFunction(()=>document.querySelector('[data-rk-mode-trigger]').getAttribute('aria-expanded')==='true');
      assert.equal(await target.evaluate(el=>document.activeElement===el),true);
      await focus('compact-navigation-retains-focused-choice');
      await p.keyboard.press('Escape');
      await p.waitForFunction(()=>document.activeElement.hasAttribute('data-rk-mode-trigger'));
      await size(601);
      await p.waitForFunction(()=>document.activeElement.getAttribute('data-rocks-mode')==='rocks');
      assert.equal(await trigger.isVisible(),false);
      await focus('compact-navigation-recovers-wide-focus');
    } finally { await p.setViewportSize(originalViewport); }
  });
  await attempt('Skip to activity focuses its named heading',async()=>{for(const mode of modes){await mount(mode);await p.locator('.rk-skip-link').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>/^H[1-6]$/.test(document.activeElement.tagName));await focus('skip-'+mode);}});
  await attempt('Field case resume from chooser and notebook focuses the next exact step without performing it',async()=>{
    const originalViewport=p.viewportSize();
    try {
      await p.setViewportSize({width:320,height:900});
      await mount({mode:'notebook',fieldCases:fieldResume,quizIdx:5});
      const resume=id=>p.locator('[data-rk-nb-resume-case="'+id+'"]');
      const caseButton=id=>p.locator('[data-rk-field-case="'+id+'"]');
      const hints={};
      for (const id of Object.keys(fieldResume.records)) hints[id]=(await resume(id).textContent()).trim();
      await chooseActivity('fieldwork');
      await p.waitForFunction(()=>document.activeElement.id==='rk-field-title');
      for (const [id,label] of Object.entries(hints)) {
        assert.ok(label.length>0);
        assert.equal((await caseButton(id).locator('[data-rk-field-next]').textContent()).trim(),label,id);
      }
      await chooseFieldCase('rounded-river');
      await p.waitForFunction(()=>document.activeElement.id==='rk-fragment-shape');
      assert.equal(await p.locator('#rk-fragment-estimate').inputValue(),'17');
      assert.equal(await p.locator('#rk-fragment-shape').inputValue(),'');
      await focus('field-resume-rounded-river-shape');

      await chooseActivity('notebook');
      await resume('resistant-ridge').press('Enter');
      await p.waitForFunction(()=>document.activeElement.matches('[data-rk-field-observe="mineral"]'));
      const description=await p.locator('[data-rk-field-observe="mineral"]').getAttribute('aria-describedby');
      assert.ok((description||'').split(/\s+/).includes('rk-field-feedback'));
      assert.ok((await p.locator('#rk-field-feedback').textContent()).trim());
      await focus('field-resume-missing-observation');
      assert.deepEqual(await p.evaluate(()=>window.__state.rocks.fieldCases.records),fieldResume.records);
      assert.equal(await p.locator('[data-rk-field-observation="mineral"]').count(),0);
      await p.keyboard.press('Enter');
      await p.locator('[data-rk-field-observation="mineral"]').waitFor();
      await chooseActivity('notebook');
      await resume('deep-cooling').press('Enter');
      await p.waitForFunction(()=>document.activeElement.id==='rk-field-debrief-title');
      await focus('field-resume-supported-interpretation');
      await chooseFieldCase('roofing-sheets');
      await p.waitForFunction(()=>document.activeElement.id==='rk-field-case-title');
      assert.equal(await p.evaluate(()=>window.__state.rocks.quizIdx),5);
      assert.equal(await p.evaluate(()=>window.__state.rocks.fieldCases.records['roofing-sheets']),undefined);
      await axe('field-resume-case-controls');
    } finally { await p.setViewportSize(originalViewport); }
  });
  await attempt('Field workspace chooser, step navigation and next action preserve the investigation',async()=>{
    const viewport=p.viewportSize();
    try {
      await p.setViewportSize({width:390,height:900});
      await mount({mode:'fieldwork',fieldCases:fieldResume});
      const picker=p.locator('[data-rk-field-picker]'), summary=picker.locator('summary');
      assert.equal(await picker.evaluate(element=>element.open),false);
      const records=await p.evaluate(()=>window.__state.rocks.fieldCases.records);
      await summary.press('Space');
      await p.locator('[data-rk-field-case="rounded-river"]').focus();
      await p.keyboard.press('Escape');
      assert.equal(await picker.evaluate(element=>element.open),false);
      assert.equal(await summary.evaluate(element=>element===document.activeElement),true);
      await chooseFieldCase('rounded-river');
      await p.waitForFunction(()=>document.activeElement.id==='rk-fragment-shape');
      assert.match(await summary.textContent(),/Pebbles inside a cliff/);
      assert.equal(await p.locator('[data-rk-field-stage][aria-current=step]').getAttribute('data-rk-field-stage'),'observe');
      assert.equal(await p.locator('[data-rk-field-stage="review"]').isDisabled(),true);
      for(const [stage,heading] of [['explain','rk-field-explain-title'],['observe','rk-field-observe-title']]){
        await p.locator('[data-rk-field-stage="'+stage+'"]').press('Enter');
        await p.waitForFunction(id=>document.activeElement.id===id,heading);
        await focus('field-workspace-'+stage);
      }
      await p.locator('[data-rk-field-continue]').press('Enter');
      await p.waitForFunction(()=>document.activeElement.id==='rk-fragment-shape');
      assert.equal(await p.locator('#rk-fragment-estimate').inputValue(),'17');
      assert.deepEqual(await p.evaluate(()=>window.__state.rocks.fieldCases.records),records);
      await axe('field-workspace-fragment-draft');
      await chooseFieldCase('deep-cooling');
      await p.locator('[data-rk-field-stage="review"]').press('Enter');
      await p.waitForFunction(()=>document.activeElement.id==='rk-field-debrief-title');
      assert.equal(await p.locator('[data-rk-field-stage][aria-current=step]').getAttribute('data-rk-field-stage'),'review');
      await axe('field-workspace-supported');
      await chooseFieldCase('resistant-ridge');
      await p.locator('[data-rk-field-continue]').press('Enter');
      await p.waitForFunction(()=>document.activeElement.matches('[data-rk-field-observe="mineral"]'));
      assert.deepEqual(await p.evaluate(()=>window.__state.rocks.fieldCases.records),records);
      await summary.press('Enter');
      await axe('field-workspace-open-picker');
      await snap('field-workspace-open-picker');
    } finally {await p.setViewportSize(viewport);}
  });
  await attempt('Landscape native transformation selector provides six full-size keyboard targets',async()=>{
    await mount('landscape');await p.setViewportSize({width:320,height:1000});const select=p.locator('[data-rk-cycle-select]');
    const size=await select.boundingBox();assert.ok(size.height>=44&&size.width>=24);
    const values=await select.locator('option').evaluateAll(options=>options.map(o=>o.value).filter(Boolean));assert.equal(values.length,6);
    await select.focus();await select.press('Home');
    for(const value of values){await select.press('ArrowDown');await p.waitForFunction(value=>window.__state.rocks.cycArrow===value,value);await p.locator('[data-rk-cyc-example^="'+value+':"]').waitFor();}
    await select.press('Home');await p.waitForFunction(()=>window.__state.rocks.cycArrow===null);assert.equal(await p.locator('[data-rk-cyc-example]').count(),0);await focus('landscape-equivalent-transformation');
    await p.setViewportSize({width:1280,height:1000});
  });
  await attempt('Catalogue search, sort, empty results and return focus preserve selection',async()=>{
    for(const [kind,id] of [['rocks','granite'],['minerals','quartz']]){
      await mount(kind);const search=p.locator('[data-rk-catalogue-search='+kind+']');
      await search.fill(id);await p.waitForFunction(kind=>{const text=document.querySelector('[data-rk-catalogue-count='+kind+']').textContent;const counts=text.match(/(\d+) \/ (\d+)/);return counts&&Number(counts[1])>0&&Number(counts[1])<Number(counts[2]);},kind);
      const sort=p.locator('[data-rk-catalogue-sort='+kind+']');const value=await sort.locator('option').nth(1).getAttribute('value');await sort.selectOption(value);
      const tileId='rk-'+(kind==='rocks'?'rock':'mineral')+'-tile-'+id;
      await p.locator('#'+tileId).focus();await p.keyboard.press('Enter');
      await p.waitForFunction(()=>document.activeElement.tagName==='H4');await focus('catalogue-open-'+kind);
      await p.locator('[data-rk-back-to-catalogue='+kind+']').focus();await p.keyboard.press('Enter');await p.waitForFunction(id=>document.activeElement.id===id,tileId);
      await search.fill('zzzzzz-not-a-specimen');await p.locator('[data-rk-catalogue-empty='+kind+']').waitFor();
      await p.locator('[data-rk-catalogue-selected='+kind+']').click();await p.waitForFunction(()=>document.activeElement.tagName==='H4');
      await p.locator('[data-rk-back-to-catalogue='+kind+']').click();await p.waitForFunction(kind=>document.activeElement.id==='rk-catalogue-'+kind+'-search',kind);
      await p.locator('[data-rk-catalogue-reset='+kind+']').click();assert.equal(await search.inputValue(),'');await axe('catalogue-'+kind);
    }
  });
  await attempt('Workbench primary tool labels occur in accessible names',async()=>{await mount({mode:'workbench',wb:{...wb,toolsExpanded:true}});for(const [tool,label] of [['form','Describe its shape'],['acid','Acid dropper'],['balance','Balance + beaker']])assert.ok((await p.locator('[data-wb-tool='+tool+']').getAttribute('aria-label')).includes(label),label);});
  await attempt('Workbench asynchronous completion preserves deliberate Tab navigation',async()=>{await mount({mode:'workbench',wb:{...wb,toolsExpanded:true}});await p.locator('[data-wb-tool=lens]').focus();await p.keyboard.press('Enter');await p.keyboard.press('Tab');const destination=await p.evaluate(()=>document.activeElement.getAttribute('data-wb-tool'));assert.ok(destination&&destination!=='lens');await p.locator('[data-wb-observe-choice=metallic]').waitFor();await p.waitForTimeout(150);assert.equal(await p.evaluate(()=>document.activeElement.getAttribute('data-wb-tool')),destination);await focus('workbench-completion-keeps-tab-choice');});
  await attempt('Mystery actual start, wrong guess, and correct guess',async()=>{await mount('mystery');await p.getByRole('button',{name:/Start Challenge.*Start Mystery Rock challenge/}).focus();await p.keyboard.press('Enter');await p.locator('[data-rk-mystery-tile]').first().waitFor();await focus('mystery-start');const id=await p.evaluate(()=>window.__state.rocks.mystery.rockId);const wrong=await p.locator('[data-rk-mystery-tile]').evaluateAll((all,id)=>all.find(e=>e.dataset.rkMysteryTile!==id).dataset.rkMysteryTile,id);await p.locator('[data-rk-mystery-tile="'+wrong+'"]').focus();await p.keyboard.press('Enter');await focus('mystery-wrong');await p.locator('[data-rk-mystery-tile="'+id+'"]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>window.__state.rocks.mystery.solved);await focus('mystery-correct');await axe('mystery-solved');await snap('interactive-mystery-solved');});
  await attempt('Workbench lens observation then supported claim',async()=>{await mount({mode:'workbench',wb:{...wb,toolsExpanded:true,candidatesExpanded:true}});await p.locator('[data-wb-tool=lens]').focus();await p.keyboard.press('Enter');await p.locator('[data-wb-observe-choice=metallic]').waitFor();await p.waitForFunction(()=>document.activeElement.matches('[data-wb-observe-choice]'));await focus('workbench-pending');await p.locator('[data-wb-observe-choice=metallic]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>window.__state.rocks.wb.lens==='metallic');await focus('workbench-observed');await axe('workbench-observed');await mount(views.find(v=>v.name==='workbench-claim').state);const claim=p.getByRole('button',{name:'Submit evidence-based claim',exact:true});await claim.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>window.__state.rocks.wb.solvedId==='pyrite');await focus('workbench-claimed');await axe('workbench-claimed');});
  await attempt('Quiz keyboard answers, feedback, next question and completion',async()=>{await mount('quiz');await p.getByRole('button',{name:/^Answer 1:/}).focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>!!window.__state.rocks.quizFeedback);await focus('quiz-feedback');await axe('quiz-feedback');const next=p.getByRole('button',{name:/Next Question/i});await next.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>window.__state.rocks.quizIdx===1);await focus('quiz-next');await mount({...views.find(v=>v.name==='quiz-feedback').state,quizIdx:35});const last=p.getByRole('button',{name:/See your results|Next Question/i});await last.focus();await p.keyboard.press('Enter');await p.locator('[data-rk-quiz-done]').waitFor();await focus('quiz-complete');await axe('quiz-complete');});
  await attempt('Weathering keyboard controls, logs and model reveal',async()=>{await mount('weathHunt');for(const place of ['desert','temperate','mountains','rainforest']){await p.locator('[data-wx-place='+place+']').focus();await p.keyboard.press('Enter');await p.getByRole('button',{name:/^📋 Log$/}).focus();await p.keyboard.press('Enter');}await focus('weathering-logged');assert.equal(await p.locator('[data-wx-trial]').count(),4);const input=p.getByRole('checkbox',{name:/I understand/});await input.focus();await p.keyboard.press('Space');await p.getByLabel('Weathering climate explanation',{exact:true}).fill('Wet places favor chemical change while freezing water cracks the rock.');const toggle=p.locator('[data-wx-model-toggle]');await toggle.focus();await p.keyboard.press('Enter');await p.locator('[data-wx-model=on]').waitFor();await focus('weathering-model');await axe('weathering-model');});
  await attempt('Field supported claim and live feedback',async()=>{await mount('fieldwork');for(const key of ['grains','minerals'])await p.locator('[data-rk-field-observe='+key+']').click();await p.locator('[data-rk-field-claim]').selectOption('granite');for(const key of ['grains','minerals'])await p.locator('[data-rk-field-cite='+key+']').check();await p.locator('[data-rk-field-reasoning]').fill('Large interlocking crystals indicate slow cooling.');await p.locator('[data-rk-field-check]').focus();await p.keyboard.press('Enter');await p.locator('[data-rk-field-debrief=deep-cooling]').waitFor();await focus('field-feedback');await axe('field-feedback');});
  await attempt('Density responsive instruments expose current readings and preserve prediction through resets',async()=>{
    for(const width of [320,640,1280]) {
      await p.setViewportSize({width,height:1000});
      await mount('densityLab');
      const instruments=p.locator('[data-rk-density-instruments]');
      const dimensions=await instruments.evaluate(element=>({width:element.clientWidth,scrollWidth:element.scrollWidth,figures:[...element.querySelectorAll('figure')].map(figure=>{const r=figure.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,width:r.width,svg:figure.querySelector('svg').getBoundingClientRect().width};})}));
      assert.equal(dimensions.figures.length,2);
      assert.ok(dimensions.scrollWidth<=dimensions.width+1,'Instruments must reflow without a horizontal scroll region at '+width);
      assert.ok(dimensions.figures.every(f=>f.x>=0&&f.right<=width&&f.svg>=170),'Both instrument diagrams must remain visible at '+width);
      if(width===320)assert.ok(dimensions.figures[1].y>dimensions.figures[0].y+150);
      if(width===1280)assert.equal(dimensions.figures[1].y,dimensions.figures[0].y);
      assert.match(await p.locator('[data-rk-density-balance]').getAttribute('aria-label'),/Not measured/);
      const prediction='Changing sample size changes mass and displaced volume.';
      await p.locator('[data-rk-density-prediction]').fill(prediction);
      for(const key of ['mass','before','after'])await p.locator('[data-rk-density-measure='+key+']').press('Enter');
      assert.match(await p.locator('[data-rk-density-balance]').getAttribute('aria-label'),/26.5 g/);
      assert.match(await p.locator('[data-rk-density-cylinder]').getAttribute('aria-label'),/30.0 mL.*40.0 mL/);
      await p.locator('[data-rk-density-instruments]').screenshot({path:path.join(h.output,'density-instruments-'+width+'.png'),animations:'disabled'});
      await p.locator('[data-rk-density-water]').press('ArrowRight');
      await p.waitForFunction(()=>window.__state.rocks.densityLab.initialWater===35);
      assert.match(await p.locator('[data-rk-density-cylinder]').getAttribute('aria-label'),/Not measured.*Not measured/);
      assert.equal(await p.locator('[data-rk-density-prediction]').inputValue(),prediction);
      assert.equal(await p.locator('[data-rk-density-water]').evaluate(element=>element===document.activeElement),true);
      assert.equal(await instruments.getAttribute('tabindex'),null);
    }
    await focus('density-instruments-reset');await axe('density-instruments-reset');
  });
  await attempt('Density keyboard measurement, calculation, and record',async()=>{await mount('densityLab');for(const key of ['mass','before','after']){await p.locator('[data-rk-density-measure='+key+']').focus();await p.keyboard.press('Enter');}await p.locator('[data-rk-density-estimate]').fill('2.65');await p.locator('[data-rk-density-check]').focus();await p.keyboard.press('Enter');await p.locator('[data-rk-density-record]').focus();await p.keyboard.press('Enter');await p.locator('[data-rk-density-trial="1"]').waitFor();await focus('density-recorded');await axe('density-recorded');});
  await attempt('Density native Enter submit, associated errors, trial focus and repeat focus',async()=>{
    await mount('densityLab');const answer=p.locator('[data-rk-density-estimate]');await answer.fill('2.65');await answer.press('Enter');
    await p.waitForFunction(()=>document.activeElement.matches('[data-rk-density-measure=mass]'));
    for(const key of ['mass','before','after'])await p.locator('[data-rk-density-measure='+key+']').click();
    await answer.fill('bad');await answer.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-density-estimate');assert.equal(await answer.getAttribute('aria-invalid'),'true');assert.equal(await answer.getAttribute('aria-errormessage'),'rk-density-feedback');
    await answer.fill('2.65');await p.locator('[data-rk-density-units]').selectOption('kg/m3');await answer.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-density-units');
    await answer.fill('2650');await answer.press('Enter');await p.locator('[data-rk-density-feedback=correct]').waitFor();
    await p.locator('[data-rk-density-record]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.matches('[data-rk-density-trial="1"] summary'));await focus('density-trial-notes');
    await p.locator('[data-rk-density-repeat]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.matches('[data-rk-density-measure=mass]'));await focus('density-repeat');
  });
  await attempt('Notebook bad file and confirmed/cancelled restore maintain state and focus',async()=>{await mount({mode:'notebook',...notebook});const waiting=p.waitForEvent('download');await p.locator('[data-rk-nb-save]').click();const d=await waiting;const backup=fs.readFileSync(await d.path(),'utf8');const upload=async text=>p.locator('#rk-nb-file').setInputFiles({name:'notebook.json',mimeType:'application/json',buffer:Buffer.from(text)});await upload('{bad');await p.locator('[data-rk-nb-status][role=alert]').waitFor();await axe('notebook-invalid');await upload(backup);await p.locator('[data-rk-nb-import-preview]').waitFor();await axe('notebook-preview');await p.locator('[data-rk-nb-cancel-import]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-nb-file');await focus('notebook-cancel');await upload(backup);await p.locator('[data-rk-nb-import-preview]').waitFor();await p.locator('[data-rk-nb-confirm-import]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-nb-file');await focus('notebook-confirm');await axe('notebook-restored');});
  await attempt('Specimen journal autosave, bookmarks and saved-only search',async()=>{
    for(const [kind,id] of [['rocks','granite'],['minerals','quartz']]){
      await mount(kind);const key=kind+':'+id;
      await p.locator('#rk-'+(kind==='rocks'?'rock':'mineral')+'-tile-'+id).click();
      const editor=p.locator('[data-rk-study-editor="'+key+'"]');await editor.locator('summary').focus();await p.keyboard.press('Enter');
      const note=p.locator('[data-rk-study-note="'+key+'"]'),question=p.locator('[data-rk-study-question="'+key+'"]');
      await note.fill('Violetfieldjournal observation for '+id);await question.fill('Which evidence would distinguish this specimen?');
      assert.equal(await p.evaluate(()=>document.activeElement.id),await question.getAttribute('id'));
      const bookmark=p.locator('[data-rk-study-bookmark="'+key+'"]');await bookmark.focus();await p.keyboard.press('Enter');assert.equal(await bookmark.getAttribute('aria-pressed'),'true');
      const saved=p.locator('[data-rk-catalogue-saved='+kind+']');await saved.check();await p.locator('[data-rk-catalogue-search='+kind+']').fill('violetfieldjournal');
      await p.waitForFunction(kind=>document.querySelector('[data-rk-catalogue-count='+kind+']').textContent.includes('1 /'),kind);
      assert.equal(await p.locator('[id^="rk-'+(kind==='rocks'?'rock':'mineral')+'-tile-"]').count(),1);
      await bookmark.click();assert.equal(await bookmark.getAttribute('aria-pressed'),'false');assert.equal(await p.locator('[data-rk-catalogue-empty='+kind+']').count(),0);
      await note.fill('');await question.fill('');await p.locator('[data-rk-catalogue-empty='+kind+']').waitFor();
      assert.equal(await p.evaluate(key=>window.__state.rocks.specimenNotes[key],key),undefined);await axe('journal-'+kind+'-empty-saved-filter');
    }
  });
  await attempt('Comparison workspace presets, paired labels and scratch reference retain learning work',async()=>{
    const viewport=p.viewportSize();
    try {
      await p.setViewportSize({width:320,height:1000});
      const note='Coarse crystals and fine grains suggest different cooling conditions.';
      await mount({mode:'compare',quizScore:7,compare:{notes:{'rocks:basalt:granite':note}}});
      const picker=p.locator('[data-rk-compare-presets]'),summary=picker.locator('summary');
      assert.equal(await picker.evaluate(el=>el.open),false);
      await summary.press('Enter');
      const original=p.locator('[data-rk-compare-preset="granite:basalt"]');
      assert.equal(await original.getAttribute('aria-pressed'),'true');
      await p.locator('[data-rk-compare-preset="limestone:marble"]').press('Enter');
      await p.waitForFunction(()=>document.querySelector('[data-rk-compare-name=left]').textContent==='Limestone');
      assert.equal(await p.locator('[data-rk-compare-name="right"]').textContent(),'Marble');
      assert.equal(await p.locator('#rk-compare-note').inputValue(),'');
      await p.keyboard.press('Escape');
      assert.equal(await picker.evaluate(el=>el.open),false);
      assert.equal(await summary.evaluate(el=>el===document.activeElement),true);
      await focus('comparison-picker-escape');
      await summary.press('Space');await original.press('Enter');await original.press('Escape');
      assert.equal(await p.locator('#rk-compare-note').inputValue(),note);
      await p.locator('[data-rk-compare-select="left"]').selectOption('basalt');
      await p.waitForFunction(()=>document.querySelector('[data-rk-compare-name=left]').textContent==='Basalt');
      assert.equal(await p.locator('[data-rk-compare-name="right"]').textContent(),'Granite');
      assert.equal(await p.locator('#rk-compare-note').inputValue(),note);
      assert.match(await p.locator('[data-rk-compare-row="texture"] .rk-compare-value').nth(0).textContent(),/Basalt/);
      await p.locator('[data-rk-compare-differences]').check();
      assert.equal(await p.locator('[data-rk-compare-row="family"]').count(),0);
      await p.locator('[data-rk-compare-show-report]').press('Enter');
      const report=await p.getByRole('textbox',{name:'Comparison notebook text',exact:true}).inputValue();
      assert.ok(report.includes('Basalt / Granite')&&report.includes(note)&&report.includes('Rock family'));
      await axe('comparison-visual-rock-work');
      await p.locator('[data-rk-compare-kind="minerals"]').press('Enter');
      await summary.press('Enter');
      await p.locator('[data-rk-compare-preset="pyrite:magnetite"]').press('Enter');
      await p.keyboard.press('Escape');
      await p.locator('#rk-compare-reference').selectOption('6.5');
      await p.locator('[data-rk-compare-scratch="pyrite:borderline"]').waitFor();
      assert.match(await p.locator('[data-rk-compare-scratch="pyrite:borderline"]').textContent(),/equal modeled hardness/);
      assert.equal(await p.evaluate(()=>window.__state.rocks.quizScore),7);
      assert.equal(await p.evaluate(()=>window.__state.rocks.compare.notes['rocks:basalt:granite']),note);
      await axe('comparison-visual-scratch-results');
    } finally {await p.setViewportSize(viewport);}
  });
  await attempt('Look-alike comparison links preserve notebook notes and focus',async()=>{
    for(const [kind,id] of [['rocks','granite'],['minerals','quartz']]){
      const state={mode:kind,specimenNotes,compare:{notes:{'rocks:basalt:granite':'Keep this comparison explanation.'}},...(kind==='rocks'?{selectedRock:id}:{selectedMineral:id})};await mount(state);
      const link=p.locator('[data-rk-look-compare^="'+kind+':"]').first();
      const pair=(await link.getAttribute('data-rk-look-compare')).split(':');
      await link.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-compare-title');
      assert.equal(await p.locator('[data-rk-compare-select=left]').inputValue(),pair[1]);assert.equal(await p.locator('[data-rk-compare-select=right]').inputValue(),pair[2]);
      assert.equal(await p.evaluate(()=>window.__state.rocks.compare.notes['rocks:basalt:granite']),'Keep this comparison explanation.');assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),specimenNotes);await focus('look-alike-'+kind);await axe('look-alike-'+kind);
    }
  });
  await attempt('Notebook journal resume and v3 backup with v1 preservation',async()=>{
    await mount({mode:'notebook',...notebook,specimenNotes,quizScore:7,catalogue:{rocks:{query:'no-match-filter',savedOnly:true},minerals:{query:'no-match-filter',savedOnly:true}}});
    for(const key of Object.keys(specimenNotes)){
      await p.locator('[data-rk-nb-specimen="'+key+'"]').locator('summary').click();
      await p.locator('[data-rk-nb-resume-specimen="'+key+'"]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-specimen-study-title');
      const kind=key.split(':')[0];assert.equal(await p.locator('[data-rk-catalogue-search='+kind+']').inputValue(),'no-match-filter');
      await p.locator('[data-rk-study-editor="'+key+'"]').locator('summary').click();assert.equal(await p.locator('[data-rk-study-note="'+key+'"]').inputValue(),specimenNotes[key].note);
      await p.locator('[data-rk-study-notebook="'+key+'"]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-notebook-title');
    }
    await p.locator('[data-rk-nb-show-text]').click();const text=await p.locator('#rk-nb-text').inputValue();for(const record of Object.values(specimenNotes)){assert.ok(text.includes(record.note));assert.ok(text.includes(record.question));}
    const waiting=p.waitForEvent('download');await p.locator('[data-rk-nb-save]').click();const download=await waiting;const backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.equal(backup.version,3);assert.deepEqual(backup.data.specimenNotes,specimenNotes);
    const current={'rocks:basalt':{note:'Keep this local draft until confirmation.',question:'What changed?',bookmarked:true}};
    await p.evaluate(current=>window.__setState({...window.__state,rocks:{...window.__state.rocks,specimenNotes:current,notebookUi:{}}}),current);
    const upload=async data=>p.locator('#rk-nb-file').setInputFiles({name:'study-notebook.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
    const confirm=async()=>{await p.locator('[data-rk-nb-confirm-import]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-nb-file');};
    await upload({...backup,data:{...backup.data,specimenNotes:{'rocks:unknown-specimen':current['rocks:basalt']}}});await p.locator('[data-rk-nb-status][role=alert]').waitFor();assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),current);
    await upload(backup);await p.locator('[data-rk-nb-import-preview]').waitFor();assert.match(await p.locator('[data-rk-nb-import-journal]').innerText(),/^2\b/);assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),current);await axe('journal-v2-import-preview');
    await p.locator('[data-rk-nb-cancel-import]').click();await p.waitForFunction(()=>document.activeElement.id==='rk-nb-file');assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),current);
    const legacy=JSON.parse(JSON.stringify(backup));legacy.version=1;delete legacy.data.specimenNotes;delete legacy.data.weathHunt;await upload(legacy);await p.locator('[data-rk-nb-import-preview]').waitFor();assert.match(await p.locator('[data-rk-nb-import-journal]').innerText(),/kept/);await confirm();assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),current);
    await upload({...backup,data:{...backup.data,specimenNotes:{}}});await p.locator('[data-rk-nb-import-preview]').waitFor();assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),current);await confirm();assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),{});
    await upload(backup);await p.locator('[data-rk-nb-import-preview]').waitFor();await confirm();assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),specimenNotes);assert.equal(await p.evaluate(()=>window.__state.rocks.quizScore),7);await focus('journal-v2-restored');await axe('journal-v2-restored');
  });
  await attempt('Topic practice actions isolate missed questions, reflow answers and retain round work',async()=>{
    await p.setViewportSize({width:320,height:1000});
    await mount({...practiceRound,compare:{notes:{'rocks:basalt:granite':'Preserve this comparison.'}}});
    const original=await p.evaluate(()=>{const {quizPractice,...state}=window.__state.rocks;return state;});
    const topics=p.locator('[data-rk-practice-topic]');assert.equal(await topics.count(),2);
    const hardness=p.locator('[data-rk-practice-topic="Hardness"]');
    assert.equal(await hardness.getAttribute('aria-label'),'Missed-question practice (1): Hardness');
    await hardness.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-quiz-practice-question');
    assert.deepEqual(await p.evaluate(()=>window.__state.rocks.quizPractice.queue),[2]);
    const answers=p.locator('[data-rk-practice-answer]');
    const bounds=await answers.evaluateAll(all=>all.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,width:r.width,height:r.height};}));
    assert.ok(bounds.every(b=>b.width>180&&b.height>=80));assert.ok(bounds.every(b=>b.x===bounds[0].x));
    await answers.filter({hasText:'Apatite'}).press('Enter');await p.locator('[data-rk-practice-next]').press('Enter');
    await p.waitForFunction(()=>document.activeElement.id==='rk-quiz-practice-results-title');
    await p.locator('[data-rk-practice-done="1/1"]').waitFor();
    await p.locator('[data-rk-practice-return]').press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-quiz-results-title');
    await p.locator('[data-rk-practice-topic="Sedimentary"]').press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-quiz-practice-question');
    assert.deepEqual(await p.evaluate(()=>window.__state.rocks.quizPractice.queue),[0,1]);
    await p.locator('[data-rk-practice-answer]').filter({hasText:'sharp corners'}).press('Enter');
    await p.locator('[data-rk-practice-return]').press('Enter');await p.locator('[data-rk-practice-resume]').press('Enter');
    await p.waitForFunction(()=>document.activeElement.id==='rk-quiz-practice-question');
    assert.equal(await p.evaluate(()=>window.__state.rocks.quizPractice.feedback.correct),true);
    assert.deepEqual(await p.evaluate(()=>{const {quizPractice,...state}=window.__state.rocks;return state;}),original);
    await axe('quiz-chosen-topic');await snap('quiz-topic-practice-mobile');
    await mount({mode:'quiz',quizIdx:2,quizLog:{0:1,1:0}});
    assert.equal(await p.locator('.rk-quiz-progress-summary').textContent(),'Answered 2 of 36, 1 right on the first try.');
    await focus('quiz-progress-readable');await axe('quiz-progress-readable');
  });
  await attempt('Targeted quiz practice keeps round results and restores keyboard focus',async()=>{
    await mount(practiceRound);const original=await p.evaluate(()=>{const s=window.__state.rocks;return{quizIdx:s.quizIdx,quizScore:s.quizScore,quizLog:s.quizLog,vocabLookedUp:s.vocabLookedUp,researchPoints:s.researchPoints};});
    await p.locator('[data-rk-practice-start=all]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-quiz-practice-question');
    // Measure the browser's actual control boundary colors, including both
    // adjacent surfaces. Axe's text-contrast rule does not cover this cue.
    result.practiceBoundaryContrast=await p.locator('[data-rk-practice-answer]').evaluateAll(buttons=>{
      const rgb=value=>(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
      const lum=value=>rgb(value).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
      const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
      return buttons.map(button=>{const style=getComputedStyle(button),outside=getComputedStyle(button.closest('[data-rk-practice]')).backgroundColor;return{border:style.borderColor,inside:style.backgroundColor,outside,insideRatio:ratio(style.borderColor,style.backgroundColor),outsideRatio:ratio(style.borderColor,outside)};});
    });
    assert.ok(result.practiceBoundaryContrast.every(value=>value.insideRatio>=3&&value.outsideRatio>=3),'Practice answer boundaries must remain distinguishable from their adjacent surfaces.');
    assert.deepEqual(await p.evaluate(()=>window.__state.rocks.quizPractice.queue),[0,1,2]);
    const area=p.locator('[data-rk-practice]');await area.focus();await p.keyboard.press('Control+1');assert.deepEqual(await p.evaluate(()=>window.__state.rocks.quizPractice.answers),{});
    const first=p.locator('[data-rk-practice-answer]').filter({hasText:/sharp corners/});await first.focus();await p.keyboard.press('3');assert.deepEqual(await p.evaluate(()=>window.__state.rocks.quizPractice.answers),{});
    await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement.getAttribute('data-rk-practice-answer')),await first.getAttribute('data-rk-practice-answer'));await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>window.__state.rocks.quizPractice.index),0);await axe('practice-feedback');
    await p.locator('[data-rk-practice-next]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-quiz-practice-question');assert.equal(await p.evaluate(()=>window.__state.rocks.quizPractice.index),1);
    await p.locator('[data-rk-practice-return]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-quiz-results-title');
    await p.locator('[data-rk-practice-resume]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-quiz-practice-question');assert.equal(await p.evaluate(()=>window.__state.rocks.quizPractice.index),1);
    await p.locator('[data-rk-practice-answer="0"]').click();await p.locator('[data-rk-practice-next]').click();await p.waitForFunction(()=>window.__state.rocks.quizPractice.index===2);
    await p.locator('[data-rk-practice-answer]').filter({hasText:'Apatite'}).click();await p.locator('[data-rk-practice-next]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-quiz-practice-results-title');assert.equal(await p.locator('[data-rk-practice-done]').getAttribute('data-rk-practice-done'),'2/3');await axe('practice-completed');
    await p.locator('[data-rk-practice-retry]').click();await p.waitForFunction(()=>document.activeElement.id==='rk-quiz-practice-question');assert.deepEqual(await p.evaluate(()=>window.__state.rocks.quizPractice.queue),[1]);
    await p.locator('[data-rk-practice-answer]').filter({hasText:'Siltstone'}).click();await p.locator('[data-rk-practice-next]').click();await p.locator('[data-rk-practice-done="1/1"]').waitFor();await p.locator('[data-rk-practice-return]').click();
    await p.locator('[data-rk-practice-start=topic]').click();await p.waitForFunction(()=>document.activeElement.id==='rk-quiz-practice-question');assert.ok((await p.evaluate(()=>window.__state.rocks.quizPractice.queue)).every(id=>[0,1,2].includes(id)));
    assert.deepEqual(await p.evaluate(()=>{const s=window.__state.rocks;return{quizIdx:s.quizIdx,quizScore:s.quizScore,quizLog:s.quizLog,vocabLookedUp:s.vocabLookedUp,researchPoints:s.researchPoints};}),original);await focus('practice-topic');
  });
  await attempt('Notebook journal browsing finds names, notes and questions without changing saved work',async()=>{
    await mount({mode:'notebook',...notebook,specimenNotes:journalBrowseNotes});
    const search=p.locator('[data-rk-nb-journal-search]'),filter=p.locator('[data-rk-nb-journal-filter]'),reset=p.locator('[data-rk-nb-journal-reset]'),count=p.locator('[data-rk-nb-journal-count]');
    const keys=()=>p.locator('#rk-nb-journal-results [data-rk-nb-specimen]').evaluateAll(entries=>entries.map(e=>e.getAttribute('data-rk-nb-specimen')));
    const expectKeys=async expected=>{await p.waitForFunction(expected=>JSON.stringify([...document.querySelectorAll('#rk-nb-journal-results [data-rk-nb-specimen]')].map(e=>e.getAttribute('data-rk-nb-specimen')))===JSON.stringify(expected),expected);assert.match(await count.innerText(),new RegExp('Showing '+expected.length+' / 4 saved specimens'));};
    await expectKeys(['rocks:basalt','rocks:granite','minerals:quartz','minerals:talc']);assert.equal(await reset.isDisabled(),true);assert.equal(await count.getAttribute('role'),'status');assert.equal(await count.getAttribute('aria-live'),'polite');
    for(const [query,expected] of [['granite',['rocks:granite']],['eveningcolumn',['rocks:basalt']],['rapid cooling',['rocks:granite']],['GRÁNITE saffronjournal',['rocks:granite']]]){await search.fill(query);await expectKeys(expected);assert.equal(await p.evaluate(()=>document.activeElement.id),'rk-nb-journal-search');}
    await search.fill('');await filter.selectOption('bookmarked');await expectKeys(['rocks:basalt','rocks:granite']);await filter.selectOption('questions');await expectKeys(['rocks:granite','minerals:quartz']);
    await filter.selectOption('bookmarked');await search.fill('quartz');await expectKeys([]);await p.locator('[data-rk-nb-journal-empty]').waitFor();assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),journalBrowseNotes);await axe('journal-browser-empty');
    await reset.focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-nb-journal-search');assert.equal(await search.inputValue(),'');assert.equal(await filter.inputValue(),'all');await expectKeys(['rocks:basalt','rocks:granite','minerals:quartz','minerals:talc']);await focus('journal-browser-reset');
    await search.fill('quartz');await filter.selectOption('questions');await expectKeys(['minerals:quartz']);
    const waiting=p.waitForEvent('download');await p.locator('[data-rk-nb-save]').click();const download=await waiting;const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(exported.version,3);assert.deepEqual(exported.data.specimenNotes,journalBrowseNotes);
    await p.locator('[data-rk-nb-show-text]').click();const report=await p.locator('#rk-nb-text').inputValue();for(const entry of Object.values(journalBrowseNotes)){if(entry.note)assert.ok(report.includes(entry.note));if(entry.question)assert.ok(report.includes(entry.question));}
    assert.deepEqual(await keys(),['minerals:quartz']);assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),journalBrowseNotes);await axe('journal-browser-filtered-export');
  });
  await attempt('Specimen detail navigation follows filtered order and preserves catalogue context',async()=>{
    for(const [kind,sort,ordered,outside] of [['rocks','name',['basalt','diorite','granite'],'obsidian'],['minerals','hardness',['gypsum','calcite','quartz'],'diamond']]){
      const selection=kind==='rocks'?'selectedRock':'selectedMineral';const catalogue={query:'fieldnav',sort,savedOnly:true};
      const state={mode:kind,[selection]:ordered[0],specimenNotes:detailNavigationNotes,catalogue:{[kind]:catalogue}};await mount(state);
      const nav=p.locator('[data-rk-detail-nav='+kind+']'),previous=nav.locator('[data-rk-detail-step=previous]'),next=nav.locator('[data-rk-detail-step=next]');
      const tilePrefix='rk-'+(kind==='rocks'?'rock':'mineral')+'-tile-';assert.deepEqual(await p.locator('[id^="'+tilePrefix+'"]').evaluateAll((tiles,prefix)=>tiles.map(e=>e.id.slice(prefix.length)),tilePrefix),ordered);
      const labels={};for(const id of ordered)labels[id]=(await p.locator('#'+tilePrefix+id).innerText()).split('\n')[0].trim();
      const context=async()=>{assert.equal(await p.locator('[data-rk-catalogue-search='+kind+']').inputValue(),catalogue.query);assert.equal(await p.locator('[data-rk-catalogue-sort='+kind+']').inputValue(),sort);assert.equal(await p.locator('[data-rk-catalogue-saved='+kind+']').isChecked(),true);assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),detailNavigationNotes);};
      const step=async(button,id)=>{assert.ok((await button.getAttribute('aria-label')).includes(labels[id]));const rect=await button.boundingBox();assert.ok(rect.width>=24&&rect.height>=44);await button.focus();await p.keyboard.press('Enter');await p.waitForFunction(({selection,id})=>window.__state.rocks[selection]===id&&document.activeElement.id==='rk-specimen-title',{selection,id});assert.ok((await p.locator('#rk-specimen-title').innerText()).includes(labels[id]));await context();};
      assert.equal(await previous.isDisabled(),true);for(const id of ordered.slice(1))await step(next,id);assert.equal(await next.isDisabled(),true);assert.match(await nav.locator('[data-rk-detail-position]').innerText(),/3 of 3/);
      for(const id of ordered.slice(0,-1).reverse())await step(previous,id);assert.equal(await previous.isDisabled(),true);await focus('detail-navigation-'+kind);await axe('detail-navigation-'+kind);
      await mount({...state,[selection]:outside});assert.equal(await previous.isDisabled(),true);assert.equal(await next.isDisabled(),true);const first=nav.locator('[data-rk-detail-first='+kind+']');assert.ok((await first.innerText()).includes(labels[ordered[0]]));await first.focus();await p.keyboard.press('Enter');await p.waitForFunction(({selection,id})=>window.__state.rocks[selection]===id&&document.activeElement.id==='rk-specimen-title',{selection,id:ordered[0]});await context();
      await p.locator('[data-rk-catalogue-search='+kind+']').fill('no-matching-fieldnav');await p.locator('[data-rk-catalogue-empty='+kind+']').waitFor();assert.equal(await nav.locator('[data-rk-detail-first]').count(),0);assert.equal(await previous.isDisabled(),true);assert.equal(await next.isDisabled(),true);assert.equal(await p.evaluate(selection=>window.__state.rocks[selection],selection),ordered[0]);await axe('detail-navigation-empty-'+kind);
    }
  });
  await attempt('Collection cabinet opens and returns to the earned tile by keyboard', async () => {
    const collection = {conglom:'key', travertine:'mystery', limestone:'drill'};
    await mount({mode:'rocks', selectedType:'igneous', collection});
    await p.setViewportSize({width:320, height:900});
    const cabinet = p.locator('[data-rk-cabinet]');
    await cabinet.locator('summary').focus();
    await p.keyboard.press('Enter');
    for (const enlarged of [false, true]) {
      if (enlarged) await cabinet.locator('.rk-cabinet-label').evaluateAll(labels => {
        for (const label of labels) label.style.fontSize = (2 * parseFloat(getComputedStyle(label).fontSize)) + 'px';
      });
      const clipped = await cabinet.locator('.rk-cabinet-label').evaluateAll(labels =>
        labels.filter(label => label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1)
          .map(label => label.textContent));
      assert.deepEqual(clipped, []);
    }
    const tile = p.locator('#rk-collection-tile-conglom');
    assert.match(await tile.ariaSnapshot(), /button .*Conglomerate/);
    await tile.focus();
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => document.activeElement.id === 'rk-specimen-title');
    assert.match(await p.locator('#rk-specimen-title').ariaSnapshot(), /heading .*Conglomerate/);
    const editor = p.locator('[data-rk-study-editor="rocks:conglom"]');
    await editor.locator('summary').focus();
    await p.keyboard.press('Enter');
    await p.locator('[data-rk-study-note="rocks:conglom"]').fill('Rounded pebbles cemented into rock.');
    await p.locator('[data-rk-back-to-collection="conglom"]').focus();
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => document.activeElement.id === 'rk-collection-tile-conglom');
    assert.equal(await p.evaluate(() => window.__state.rocks.selectedType), 'igneous');
    assert.match(await p.evaluate(() => window.__state.rocks.specimenNotes['rocks:conglom'].note), /Rounded pebbles/);
    await focus('cabinet-return');
    await axe('collection-return');
    await p.setViewportSize({width:1280, height:1000});
  });
  await attempt('Field evidence accepts an alternate pair and records the learner’s fragment observation', async () => {
    await mount({mode:'fieldwork', fieldCases:{activeId:'resistant-ridge'}});
    for (const clue of ['mineral','map']) {
      await p.locator('[data-rk-field-observe="' + clue + '"]').focus();
      await p.keyboard.press('Enter');
      await p.locator('[data-rk-field-cite="' + clue + '"]').check();
    }
    await p.locator('[data-rk-field-claim]').selectOption('quartzite');
    await p.locator('[data-rk-field-reasoning]').fill('The quartz grains and mapped sandstone support quartzite.');
    await p.locator('[data-rk-field-check]').press('Enter');
    await p.locator('[data-rk-field-debrief="resistant-ridge"]').waitFor();
    await chooseFieldCase('rounded-river');
    await p.locator('[data-rk-field-fragment-estimate]').fill('20');
    await p.locator('[data-rk-field-fragment-shape]').selectOption('rounded');
    await p.locator('[data-rk-field-fragment-compare]').press('Enter');
    await p.locator('[data-rk-field-fragment-result]').waitFor();
    for (const clue of ['size','shape']) await p.locator('[data-rk-field-observation="' + clue + '"]').waitFor();
    await axe('field-fragment-compared');
    const comparison = await p.evaluate(() => window.__state.rocks.fieldCases.records['rounded-river'].fragmentObservation);
    assert.ok(comparison.compared);
    await chooseActivity('notebook');
    const downloading = p.waitForEvent('download');
    await p.locator('[data-rk-nb-save]').click();
    const file = JSON.parse(fs.readFileSync(await (await downloading).path(),'utf8'));
    assert.deepEqual(file.data.fieldCases.records['rounded-river'].fragmentObservation, comparison);
    await mount('notebook');
    await p.locator('#rk-nb-file').setInputFiles({name:'field-notebook.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(file))});
    await p.locator('[data-rk-nb-confirm-import]').press('Enter');
    await p.locator('[data-rk-nb-resume-case="rounded-river"]').press('Enter');
    assert.equal(await p.locator('[data-rk-field-fragment-estimate]').inputValue(),'20');
    assert.equal(await p.locator('[data-rk-field-fragment-shape]').inputValue(),'rounded');
    await p.locator('[data-rk-field-fragment-result]').waitFor();
  });
  await attempt('Weathering trial, writing and controls round-trip through notebook files', async () => {
    await mount('weathHunt');
    const hypothesis = 'More rain should favor chemical weathering.';
    const explanation = 'I observed different model outcomes under wet and dry conditions.';
    await p.getByLabel('Weathering climate hypothesis',{exact:true}).fill(hypothesis);
    for (const place of ['desert','rainforest']) {
      await p.locator('[data-wx-place="' + place + '"]').press('Enter');
      await p.getByRole('button',{name:/^📋 Log$/}).press('Enter');
    }
    await p.getByRole('checkbox',{name:/I understand/}).check();
    await p.getByLabel('Weathering climate explanation',{exact:true}).fill(explanation);
    await chooseActivity('notebook');
    const section = p.locator('[data-rk-nb-weathering]');
    await section.waitFor();
    await p.locator('[data-rk-nb-show-text]').click();
    const readable = await p.locator('#rk-nb-text').inputValue();
    assert.ok(readable.includes(hypothesis) && readable.includes(explanation));
    const downloading = p.waitForEvent('download');
    await p.locator('[data-rk-nb-save]').click();
    const backup = JSON.parse(fs.readFileSync(await (await downloading).path(),'utf8'));
    assert.equal(backup.version,3);
    assert.equal(backup.data.weathHunt.log.length,2);
    await mount({mode:'notebook', weathHunt:{hypothesis:'Keep local draft'}, quizScore:9});
    const upload = data => p.locator('#rk-nb-file').setInputFiles({name:'weathering-notebook.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
    const confirm = async () => {
      await p.locator('[data-rk-nb-confirm-import]').press('Enter');
      await p.waitForFunction(() => document.activeElement.id === 'rk-nb-file');
    };
    const previousVersion = structuredClone(backup);
    previousVersion.version = 2;
    delete previousVersion.data.weathHunt;
    await upload(previousVersion);
    await p.locator('[data-rk-nb-import-weathering]').waitFor();
    await confirm();
    assert.equal(await p.evaluate(() => window.__state.rocks.weathHunt.hypothesis),'Keep local draft');
    await upload(backup);
    await p.locator('[data-rk-nb-import-weathering]').waitFor();
    await axe('weathering-import-preview');
    await confirm();
    await p.locator('[data-rk-nb-open="weathHunt"]').press('Enter');
    assert.equal(await p.getByLabel('Weathering climate hypothesis',{exact:true}).inputValue(),hypothesis);
    assert.equal(await p.getByLabel('Weathering climate explanation',{exact:true}).inputValue(),explanation);
    assert.equal(await p.locator('[data-wx-trial]').count(),2);
    assert.equal(await p.evaluate(() => window.__state.rocks.quizScore),9);
    await focus('weathering-notebook-resume');
  });
  await attempt('Selective report keyboard choices, preview and downloaded text respect specimen privacy', async () => {
    await mount(selectiveNotebook);
    const journal = selectiveNotebook.specimenNotes;
    const note = journal['rocks:granite'].note;
    const question = journal['rocks:granite'].question;
    const comparison = selectiveNotebook.compare.notes['rocks:basalt:granite'];
    const privateWriting = [question,journal['minerals:quartz'].note,journal['minerals:quartz'].question,
      selectiveNotebook.weathHunt.hypothesis,selectiveNotebook.fieldCases.records['deep-cooling'].reasoning,
      selectiveNotebook.densityLab.trials[0].prediction,selectiveNotebook.wb.archive[0].report];
    const item = id => p.locator('[data-rk-nb-share-item="' + id + '"]');
    const preview = p.locator('#rk-nb-share-text');
    const choose = async id => { await item(id).press('Space'); assert.ok(await item(id).isChecked()); };
    const openPreview = async () => {
      await p.locator('[data-rk-nb-share-preview]').press('Enter');
      await p.waitForFunction(() => document.activeElement.id === 'rk-nb-share-text');
      assert.ok(await preview.evaluate(el => el.readOnly));
      return preview.inputValue();
    };
    const downloaded = async selector => {
      const [download] = await Promise.all([p.waitForEvent('download'), p.locator(selector).press('Enter')]);
      return fs.readFileSync(await download.path(),'utf8');
    };
    await p.locator('[data-rk-nb-jump="rk-nb-share-title"]').press('Enter');
    await p.waitForFunction(() => document.activeElement.id === 'rk-nb-share-title');
    await focus('selective-report-section-link');
    await p.locator('[data-rk-nb-share-chooser] > summary').press('Enter');
    assert.equal(await p.locator('[data-rk-nb-share-item]:checked').count(),0);
    for (const group of ['journal','comparisons','field','density','weathering','archive']) {
      assert.equal(await p.locator('[data-rk-nb-share-group="' + group + '"]').count(),1,group);
    }
    await choose('journal:rocks:granite');
    assert.equal(await item('question:rocks:granite').isChecked(),false);
    await choose('compare:rocks:basalt:granite');
    await focus('selective-report-checkbox');
    assert.ok(await p.locator('[data-rk-nb-share-download]').isDisabled());
    const selected = await openPreview();
    assert.ok(selected.includes(note) && selected.includes(comparison));
    for (const writing of privateWriting) assert.ok(!selected.includes(writing),'Unexpected learner writing: ' + writing);
    await focus('selective-report-readonly-preview');
    await snap('selective-report-focused-preview');
    assert.equal(await downloaded('[data-rk-nb-share-download]'),selected);
    await axe('selective-report-preview');

    // Revisions to the selection must invalidate the previously previewed file.
    await item('journal:rocks:granite').press('Space');
    await choose('question:rocks:granite');
    assert.ok(await p.locator('[data-rk-nb-share-download]').isDisabled());
    const revised = await openPreview();
    assert.ok(revised.includes(question) && revised.includes(comparison));
    assert.ok(!revised.includes(note));
    assert.equal(await downloaded('[data-rk-nb-share-download]'),revised);

    const complete = await downloaded('[data-rk-nb-report-download]');
    for (const writing of [note,comparison,...privateWriting]) assert.ok(complete.includes(writing),'Missing full-report evidence: ' + writing);
    const backup = JSON.parse(await downloaded('[data-rk-nb-save]'));
    assert.equal(backup.version,3);
    assert.deepEqual(backup.data.specimenNotes,journal);
    assert.equal(backup.data.archive[0].report,selectiveNotebook.wb.archive[0].report);
    assert.equal(backup.data.densityLab.trials.length,selectiveNotebook.densityLab.trials.length);
    assert.equal(backup.data.weathHunt.log.length,selectiveNotebook.weathHunt.log.length);
    assert.equal(backup.data.notebookUi,undefined);
    await p.locator('[data-rk-nb-share-clear]').press('Enter');
    assert.equal(await p.locator('[data-rk-nb-share-item]:checked').count(),0);
    assert.ok(await p.locator('[data-rk-nb-share-download]').isDisabled());
  });
  await attempt('Selective report handles empty groups and invalidates a preview when a saved trial changes', async () => {
    const chooser = p.locator('[data-rk-nb-share-chooser]');
    const open = () => chooser.locator('summary').first().press('Enter');
    const download = p.locator('[data-rk-nb-share-download]');
    await mount('notebook');
    await open();
    assert.equal(await chooser.locator('[data-rk-nb-share-item]').count(),0);
    assert.equal(await chooser.locator('[data-rk-nb-share-group]').count(),0);
    assert.match(await chooser.innerText(),/Save a specimen note or complete part of an investigation/);
    assert.equal(await download.count(),0);
    await axe('selective-report-empty');
    await chooser.locator('[data-rk-nb-share-start]').press('Enter');
    await p.waitForFunction(() => window.__state.rocks.mode === 'rocks');

    await mount(selectiveNotebook);
    await open();
    const select = id => p.locator('[data-rk-nb-share-item="' + id + '"]');
    for (const id of ['field:deep-cooling','density:0','weathering:investigation','archive:investigation-1']) {
      await select(id).press('Space');
      assert.ok(await select(id).isChecked(),id);
    }
    await p.locator('[data-rk-nb-share-preview]').press('Enter');
    const preview = p.locator('#rk-nb-share-text');
    const selected = await preview.inputValue();
    const firstPrediction = selectiveNotebook.densityLab.trials[0].prediction;
    for (const writing of [firstPrediction,selectiveNotebook.weathHunt.hypothesis,
      selectiveNotebook.wb.archive[0].report,selectiveNotebook.fieldCases.records['deep-cooling'].reasoning]) {
      assert.ok(selected.includes(writing),'Missing selected investigation: ' + writing);
    }
    for (const writing of [selectiveNotebook.densityLab.prediction,selectiveNotebook.densityLab.trials[1].prediction,
      selectiveNotebook.specimenNotes['rocks:granite'].note]) assert.ok(!selected.includes(writing),'Unexpected record: ' + writing);

    // A different trial now occupies the same index. The old selection may
    // not disclose the replacement behind an already-previewed download.
    const replacement = 'I measured a different sample after returning to the lab.';
    await p.evaluate(text => {
      const state = window.__state, rocks = state.rocks, density = rocks.densityLab;
      const trials = density.trials.map((trial,i) => i === 0 ? {...trial,prediction:text} : trial);
      window.__setState({...state,rocks:{...rocks,densityLab:{...density,trials}}});
    },replacement);
    await p.waitForFunction(() => !document.querySelector('[data-rk-nb-share-item="density:0"]').checked);
    assert.ok(await download.isDisabled());
    assert.equal(await preview.isVisible(),false);
    assert.ok(await select('archive:investigation-1').isChecked());
    await p.locator('[data-rk-nb-share-preview]').press('Enter');
    const refreshed = await preview.inputValue();
    assert.ok(!refreshed.includes(firstPrediction) && !refreshed.includes(replacement));
    assert.ok(refreshed.includes(selectiveNotebook.wb.archive[0].report));
    await focus('selective-report-refreshed-after-replacement');
  });
  result.completed=true;
 }finally{fs.writeFileSync(path.join(h.output,'interaction-results.json'),JSON.stringify(result,null,2));}
 return result;
}
module.exports={runFlows};
