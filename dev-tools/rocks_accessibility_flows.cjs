// Keyboard and native-control behavior; each flow reports independently.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {start,audit,layout}=require('./rocks_accessibility_harness.cjs');
const {modes,views,wb,notebook,specimenNotes,practiceRound,journalBrowseNotes,detailNavigationNotes}=require('./rocks_accessibility_views.cjs');
async function runFlows(h,options={}){const p=h.page,result={checks:[],failures:[],focus:[],axe:{},errors:h.errors,announcements:[],skipped:[]};p.setDefaultTimeout(8000);
 const mount=async state=>{await p.reload();await p.waitForFunction(()=>typeof window.__setState==='function');await p.evaluate(state=>window.__setState({rocks:state,rockCycle:{}}),typeof state==='string'?{mode:state}:state);await p.waitForTimeout(650);};
 const attempt=async(name,fn)=>{if(options.filter&&!new RegExp(options.filter,'i').test(name)){result.skipped.push(name);return;}try{await fn();result.checks.push(name);console.log('PASS '+name);}catch(e){result.failures.push({name,error:e.message});console.log('FAIL '+name+': '+e.message);}fs.writeFileSync(path.join(h.output,'interaction-results.json'),JSON.stringify(result,null,2));};
 const focus=async name=>{await p.waitForTimeout(150);result.focus.push({event:name,...await p.evaluate(()=>{const e=document.activeElement,s=getComputedStyle(e),r=e.getBoundingClientRect();return{tag:e.tagName,id:e.id,name:(e.getAttribute('aria-label')||e.textContent||'').slice(0,120),attributes:[...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]),outline:s.outline,shadow:s.boxShadow,focusVisible:e.matches(':focus-visible'),bounds:{x:r.x,y:r.y,width:r.width,height:r.height},live:[...document.querySelectorAll('[role=status],[role=alert],[aria-live]')].map(x=>({text:x.textContent.slice(0,180),role:x.getAttribute('role'),live:x.getAttribute('aria-live')})),announcements:window.__announcements.slice(-5)}})});};
 const snap=async name=>{await p.screenshot({path:path.join(h.output,name+'.png'),animations:'disabled'});};
 const axe=async name=>{await p.waitForTimeout(650);result.axe[name]=await audit(p,'#root');};
 try{
  await attempt('All 11 navigation controls work by keyboard and expose source focus outlines',async()=>{await mount('landscape');for(const mode of modes){let b=p.locator('[data-rocks-mode="'+mode+'"]');await b.focus();await p.keyboard.press('Enter');await p.waitForFunction(mode=>window.__state.rocks.mode===mode,mode);await focus('nav-'+mode);}assert.ok(result.focus.every(f=>f.outline.includes('3px')));});
  await attempt('Skip to activity focuses its named heading',async()=>{for(const mode of modes){await mount(mode);await p.locator('.rk-skip-link').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>/^H[1-6]$/.test(document.activeElement.tagName));await focus('skip-'+mode);}});
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
  await attempt('Notebook journal resume and v2 backup with v1 preservation',async()=>{
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
    assert.equal(backup.version,2);assert.deepEqual(backup.data.specimenNotes,specimenNotes);
    const current={'rocks:basalt':{note:'Keep this local draft until confirmation.',question:'What changed?',bookmarked:true}};
    await p.evaluate(current=>window.__setState({...window.__state,rocks:{...window.__state.rocks,specimenNotes:current,notebookUi:{}}}),current);
    const upload=async data=>p.locator('#rk-nb-file').setInputFiles({name:'study-notebook.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
    const confirm=async()=>{await p.locator('[data-rk-nb-confirm-import]').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement.id==='rk-nb-file');};
    await upload({...backup,data:{...backup.data,specimenNotes:{'rocks:unknown-specimen':current['rocks:basalt']}}});await p.locator('[data-rk-nb-status][role=alert]').waitFor();assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),current);
    await upload(backup);await p.locator('[data-rk-nb-import-preview]').waitFor();assert.match(await p.locator('[data-rk-nb-import-journal]').innerText(),/^2\b/);assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),current);await axe('journal-v2-import-preview');
    await p.locator('[data-rk-nb-cancel-import]').click();await p.waitForFunction(()=>document.activeElement.id==='rk-nb-file');assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),current);
    const legacy=JSON.parse(JSON.stringify(backup));legacy.version=1;delete legacy.data.specimenNotes;await upload(legacy);await p.locator('[data-rk-nb-import-preview]').waitFor();assert.match(await p.locator('[data-rk-nb-import-journal]').innerText(),/kept/);await confirm();assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),current);
    await upload({...backup,data:{...backup.data,specimenNotes:{}}});await p.locator('[data-rk-nb-import-preview]').waitFor();assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),current);await confirm();assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),{});
    await upload(backup);await p.locator('[data-rk-nb-import-preview]').waitFor();await confirm();assert.deepEqual(await p.evaluate(()=>window.__state.rocks.specimenNotes),specimenNotes);assert.equal(await p.evaluate(()=>window.__state.rocks.quizScore),7);await focus('journal-v2-restored');await axe('journal-v2-restored');
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
    const waiting=p.waitForEvent('download');await p.locator('[data-rk-nb-save]').click();const download=await waiting;const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(exported.version,2);assert.deepEqual(exported.data.specimenNotes,journalBrowseNotes);
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
  result.completed=true;
 }finally{fs.writeFileSync(path.join(h.output,'interaction-results.json'),JSON.stringify(result,null,2));}
 return result;
}
module.exports={runFlows};
