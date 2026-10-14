// Native React/THREE QA for fixed saved-practice cards.
// node dev-tools/ml_saved_cards_visual_qa.cjs [out-dir]
const fs=require('fs'),path=require('path'),vm=require('vm');
console.log('saved cards QA starting',new Date().toISOString());
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-saved-cards-visual-2026-10-14/browser/run-01')
  .replace('window.__qaState = pair[0].machineLab; var ctx = {','window.__qaState = pair[0].machineLab; window.__qaSet=pair[1]; var ctx = {');
bootstrap+=String.raw`
  const observations=[],routes=[],startedAt=new Date().toISOString(),exports=[];
  const sha=value=>require('crypto').createHash('sha256').update(value).digest('hex');
  const baseline=require('child_process').execFileSync('git',['show','1a68d0d70:stem_lab/stem_tool_machinelab.js'],{encoding:'utf8',maxBuffer:5*1024*1024});
  const dependencies=['dev-tools/ml_saved_cards_visual_qa.cjs','dev-tools/ml_power_lab_qa.cjs','dev-tools/ml_scene_shots.cjs','stem_lab/stem_lab_module.js','vendor/three-r128/three.min.js','vendor/three-r128/OrbitControls.js','desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
  const saved=kind=>lab(kind).locator('[data-ml-power-saved='+kind+']');
  const card=(kind,key)=>saved(kind).locator('[data-ml-power-saved-card='+key+']');
  const detail=(kind,key)=>card(kind,key).locator('[data-ml-power-saved-detail='+key+']');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const format=n=>n.toLocaleString('en-US',{useGrouping:false,maximumSignificantDigits:6});
  function checkpoint(label){fs.writeFileSync(path.join(OUT,'checkpoint.json'),JSON.stringify({label,checks:checks.length,routes,shots,errors},null,2)+'\n');console.log('saved cards checkpoint',label,checks.length,'checks');}
  function luminance(color){const a=color?.match(/[\d.]+/g)?.slice(0,3).map(Number);return a?.length===3?a.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0):NaN;}
  function contrast(a,b){a=luminance(a);b=luminance(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
  async function replaceRecords(kind,records){await pg.evaluate(([kind,records])=>window.__qaSet(prev=>({...prev,machineLab:{...prev.machineLab,benchPowerRecords:{...prev.machineLab.benchPowerRecords,[kind]:records}}})),[kind,records]);await settle();}
  async function saveRecord(kind,key,completion,answer,unit,version,target){
    await input(kind,'question').selectOption(key);await press(action(kind,'hint'));
    if(completion==='checked'){await solve(kind,answer,unit);await result(kind,'correct');}
    else{await press(action(kind,'reveal'));await result(kind,'solution');}
    await press(action(kind,'save'));const record=(await state()).benchPowerRecords[kind][key];
    check(record.version===version&&record.completion===completion&&record.hint===1,kind+': real '+key+' save retains version '+version+', '+completion+' and hint provenance');return{record,target,unit};
  }
  async function mixed(kind,extended=false){
    const expected={},fixture=fixtures.find(f=>f.kind===kind),p=physical(fixture).expected;
    const entries=[['inputPower','checked',Number((p.inputPower*.998).toPrecision(8)),'W',1,p.inputPower],['usefulPower','solution',null,'W',1,p.usefulPower]];
    if(extended)entries.push(['budgetEnergy','checked',500,'J',2,500],['budgetLoad','solution',null,'N',2,800],['turns','checked',p.turns,'turns',3,p.turns],['angularTravel','solution',null,'rad',3,p.turns*2*Math.PI],['effortFromPower','checked',fixture.load/(fixture.ma*.8),'N',4,fixture.load/(fixture.ma*.8)],['loadFromPower','solution',null,'N',4,fixture.load],['powerKilowatts','checked',p.inputPower/1000,'kW',5,p.inputPower/1000],['powerWatts','solution',null,'W',5,p.inputPower]);
    for(const [key,completion,answer,unit,version,target] of entries)expected[key]=await saveRecord(kind,key,completion,answer,unit,version,target);
    await input(kind,'question').selectOption('lossPower');await open(saved(kind));return expected;
  }
  async function snapshots(kind){return saved(kind).locator('[data-ml-power-saved-snapshot]').evaluateAll(els=>Object.fromEntries(els.map(el=>[el.dataset.mlPowerSavedSnapshot,el.textContent])));}
  async function inspect(kind,expected,label,stacked=false){
    await settle();const view=await saved(kind).evaluate(el=>{
      const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
      const style=n=>{const s=getComputedStyle(n);let p=n,bg;while(p){const v=getComputedStyle(p).backgroundColor,a=v.match(/[\d.]+/g)?.map(Number);if(a&&(a.length===3||a[3]>=.99)){bg=v;break;}p=p.parentElement;}return{font:parseFloat(s.fontSize),color:s.color,background:bg,border:s.borderStyle,borderColor:s.borderColor,variant:s.fontVariantNumeric};};
      return{page:document.documentElement.scrollWidth<=innerWidth+1,panel:el.scrollWidth<=el.clientWidth+1,text:el.textContent,live:!!el.closest('[aria-live],[role=status]'),cards:Array.from(el.querySelectorAll('[data-ml-power-saved-card]')).map(n=>{const d=n.querySelector('details'),r=n.querySelector('[data-ml-power-saved-result]'),e=n.querySelector('[data-ml-power-saved-entered]'),heading=document.getElementById(n.getAttribute('aria-labelledby'));return{key:n.dataset.mlPowerSavedCard,tag:n.tagName,heading:heading?.textContent,headingTag:heading?.tagName,headingStyle:heading&&style(heading),headingId:heading?.id,uniqueHeading:heading&&document.querySelectorAll('[id="'+heading.id+'"]').length===1,status:n.querySelector('[data-ml-power-saved-status]')?.dataset.mlPowerSavedStatus,statusStyle:style(n.querySelector('[data-ml-power-saved-status]')),result:{label:r.querySelector('dt')?.textContent,value:r.querySelector('dd')?.textContent,style:style(r.querySelector('dd')),rect:rect(r),parent:r.parentElement.tagName},entered:{label:e.querySelector('dt')?.textContent,value:e.querySelector('dd')?.textContent,style:style(e.querySelector('dd')),rect:rect(e),parent:e.parentElement.tagName},assumptions:n.querySelector('[data-ml-power-saved-assumptions]')?.textContent,completion:n.querySelector('[data-ml-power-saved-completion]')?.textContent,text:n.textContent,detail:{tag:d.tagName,summary:d.querySelector(':scope>summary')?.textContent,open:d.open,style:style(d)},snapshot:n.querySelector('[data-ml-power-saved-snapshot]')?.textContent,images:n.querySelectorAll('img,script,iframe').length};}),clipped:Array.from(el.querySelectorAll('button,p,h3,dt,dd,summary,article,[data-ml-power-saved-status]')).filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+1).map(n=>({tag:n.tagName,text:n.textContent,width:n.clientWidth,scroll:n.scrollWidth})),forced:matchMedia('(forced-colors:active)').matches};
    });
    check(view.page&&view.panel&&!view.clipped.length,label+': cards, results, text and controls fit without horizontal clipping');
    check(!view.live&&view.cards.length===Object.keys(expected).length,label+': only validated saved records appear outside live regions');
    check(view.text.includes('Fixed calculation snapshot. Constant efficiency and steady motion; task time is separate from demonstration playback.'),label+': saved snapshot assumptions remain explicit');
    for(const c of view.cards){
      const entry=expected[c.key];if(!entry){check(false,label+': unexpected card '+c.key);continue;}const r=entry.record;
      const entered=r.answer.trim()?r.answer+' '+r.unit:'none';
      const sentence=r.completion==='solution'?'Worked solution viewed; this is practice, not an independent score.':'Answer checked within the stated rounding tolerance; this is practice, not a score.';
      check(c.tag==='ARTICLE'&&c.headingTag==='H3'&&c.heading&&c.headingStyle.font>=18&&c.uniqueHeading,label+': '+c.key+' is a named article with a unique, readable heading');
      check(c.result.label==='Calculated result'&&c.result.value===format(entry.target)+' '+entry.unit&&c.result.parent==='DL'&&c.result.style.font>=28&&c.result.style.variant.includes('tabular-nums'),label+': '+c.key+' labelled calculated value agrees with independent physics');
      check(c.entered.label==='Entered answer: '&&c.entered.value===entered&&c.entered.parent==='DL'&&c.entered.style.font>=18,label+': '+c.key+' entered value remains separate and unaltered');
      check(c.status===r.completion&&c.statusStyle.border===(r.completion==='solution'?'dashed':'solid')&&c.completion===sentence&&c.text.includes('Hints opened: '+r.hint+'/2'),label+': '+c.key+' status, honest completion sentence and hints are preserved');
      check(c.assumptions==='Assumed constant efficiency: '+r.percent+'%Task time: '+format(r.seconds)+' sMechanical input-power budget (W): '+format(r.budget),label+': '+c.key+' assumptions use the saved snapshot');
      check(c.detail.tag==='DETAILS'&&c.detail.summary==='Saved setup and calculation'&&c.snapshot.includes(sentence)&&c.snapshot.includes('Entered answer: '+entered)&&!c.images,label+': '+c.key+' native disclosure retains full safe snapshot text');
      check(contrast(c.result.style.color,c.result.style.background)>=4.5&&contrast(c.entered.style.color,c.entered.style.background)>=4.5&&contrast(c.headingStyle.color,c.headingStyle.background)>=4.5,label+': '+c.key+' result, entered answer and heading contrast are at least4.5to1');
      if(stacked)check(c.entered.rect.y>=c.result.rect.bottom&&Math.abs(c.entered.rect.width-c.result.rect.width)<1,label+': '+c.key+' values stack in reading order');
      else check(Math.abs(c.entered.rect.y-c.result.rect.y)<1&&c.result.rect.right<c.entered.rect.x,label+': '+c.key+' desktop values use two columns');
      if(view.forced)check(c.statusStyle.borderColor===c.detail.style.borderColor&&c.detail.style.border!=='none',label+': '+c.key+' forced colors retain card status and disclosure boundaries');
    }
    observations.push({label,kind,view});return view;
  }
  async function focused(target,label){await target.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');const f=await target.evaluate(el=>{const s=getComputedStyle(el);return{active:el===document.activeElement,visible:el.matches(':focus-visible'),outline:s.outlineStyle,width:parseFloat(s.outlineWidth)};});check(f.active&&f.visible&&f.outline!=='none'&&f.width>=3,label+': visible native keyboard focus');observations.push({label,focus:f});}
  async function disclosure(kind,key,label){const before=await state(),summary=detail(kind,key).locator(':scope>summary');await focused(summary,label);await pg.keyboard.press('Enter');await settle();check(await detail(kind,key).evaluate(el=>el.open)&&await card(kind,key).locator('[data-ml-power-saved-snapshot]').isVisible(),label+': Enter opens saved setup and calculation');await pg.keyboard.press('Space');await settle();check(!await detail(kind,key).evaluate(el=>el.open)&&JSON.stringify(await state())===JSON.stringify(before),label+': Space closes disclosure without changing any persisted state');}
  async function exportRecord(kind,expected,label){
    const texts=await snapshots(kind),before=await state(),button=saved(kind).getByRole('button',{name:'Open work record',exact:true});await focused(button,label+' work record');await pg.keyboard.press('Enter');await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    check(await sameExcept(before,['view','manualTopic'])&&JSON.stringify((await state()).benchPowerRecords)===JSON.stringify(before.benchPowerRecords),label+': work record navigation preserves drafts and every saved snapshot');
    for(const key of Object.keys(expected)){const full=await pg.locator('[data-ml-power-record-station='+kind+'][data-ml-power-record-skill='+key+']').textContent();check(full===texts[key],label+': '+key+' card disclosure is exactly the work record text');}
    const pending=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();const download=await pending,failure=await download.failure();if(failure)throw Error('Native download failed: '+failure);const exported=fs.readFileSync(await download.path(),'utf8'),file='downloaded-record-'+kind+'.txt';await download.saveAs(path.join(OUT,file));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&Object.values(texts).every(text=>exported.includes(text))&&exported.includes(savedNote),label+': native text export includes the exact saved snapshots and unrelated design note');exports.push({kind,file,sha256:sha(fs.readFileSync(path.join(OUT,file)))});
  }
  async function shot(name,kind,isBaseline=false,expanded=false,limit=2){
    await pg.evaluate(()=>document.fonts.ready);await saved(kind).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await settle();
    const clip=await saved(kind).evaluate((el,[old,expanded,limit])=>{const a=el.getBoundingClientRect(),items=el.querySelectorAll(old?':scope>p':'[data-ml-power-saved-card]'),b=items[Math.min(items.length,expanded?1:limit)-1].getBoundingClientRect();return{x:Math.max(0,a.x+scrollX-3),y:Math.max(0,a.y+scrollY-3),width:Math.min(innerWidth,a.width+6),height:Math.ceil(b.bottom-a.top+9)};},[isBaseline,expanded,limit]);
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip,animations:'disabled',caret:'hide'});shots.push({name,file:name+'.png',sha256:sha(fs.readFileSync(path.join(OUT,name+'.png'))),clip,baseline:isBaseline});checkpoint(name);
  }
  try{
    await pg.addScriptTag({content:baseline});await mount('windlass');await open(lab('windlass'));await mixed('windlass',true);await shot('desktop-before-saved-cards','windlass',true);const baselineRecords=(await state()).benchPowerRecords.windlass,baselineTexts=await saved('windlass').locator(':scope>p').allTextContents();
    for(const fixture of fixtures){
      const kind=fixture.kind;await mount(kind);await open(lab(kind));check(await saved(kind).count()===0,kind+': empty station does not render a saved disclosure');const expected=await mixed(kind,kind==='windlass');await inspect(kind,expected,kind+' desktop');const before=await state(),fixed=await snapshots(kind);
      if(kind==='windlass'){check(JSON.stringify((await state()).benchPowerRecords.windlass)===JSON.stringify(baselineRecords),'Current and baseline real saves have identical record contents');check(Object.values(fixed).every(text=>baselineTexts.includes(text)),'All ten version1–5 card snapshots exactly match baseline paragraphs');await shot('desktop-saved-cards',kind);await open(detail(kind,'inputPower'));await shot('desktop-expanded-saved-calculation',kind,false,true);await press(detail(kind,'inputPower').locator(':scope>summary'));}
      await input(kind,'duration').fill('10');await input(kind,'percent').fill('60');await input(kind,'budget').fill('200');check(JSON.stringify(await snapshots(kind))===JSON.stringify(fixed)&&JSON.stringify((await state()).benchPowerRecords)===JSON.stringify(before.benchPowerRecords),kind+': live setup edits preserve every saved result and full calculation');await inspect(kind,expected,kind+' changed live setup');
      for(const [field,bad] of [['duration',''],['percent','101'],['budget','0']]){await input(kind,field).fill(bad);check(await comparison(kind).count()===0&&await saved(kind).isVisible()&&JSON.stringify(await snapshots(kind))===JSON.stringify(fixed),kind+': invalid '+field+' leaves fixed saved cards readable');await input(kind,field).fill(field==='duration'?'10':field==='percent'?'60':'200');}
      if(kind==='lever'){
        const valid=(await state()).benchPowerRecords.lever;await replaceRecords(kind,{...valid,lossPower:{...valid.inputPower,question:'lossPower',version:99},handSpeed:{...valid.inputPower,question:'handSpeed',answer:'9999',unit:'m/s'},loadSpeed:{...valid.inputPower,question:'loadSpeed',completion:'solution',settings:{...valid.inputPower.settings,loadDistance:0}}});await inspect(kind,expected,'lever malformed records ignored');await replaceRecords(kind,valid);
        const unsafe='<img src=x onerror=window.__qaInjected=1>',altered={...valid.usefulPower,answer:unsafe,unit:'W'},injected={...expected,usefulPower:{...expected.usefulPower,record:altered}};await replaceRecords(kind,{...valid,usefulPower:altered});await inspect(kind,injected,'lever arbitrary solution answer');check(await pg.evaluate(()=>!window.__qaInjected)&&await card(kind,'usefulPower').locator('[data-ml-power-saved-entered] dd').textContent()===unsafe+' W','Arbitrary solution text is rendered literally with no injected markup');await replaceRecords(kind,valid);
        await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowRight');check(JSON.stringify(await snapshots(kind))===JSON.stringify(fixed),'Changing physical geometry preserves the original saved card calculation');
      }
      await disclosure(kind,'inputPower',kind+' saved calculation');check(await recordsPreserved(),kind+': design, investigation and efficiency evidence remains intact');await exportRecord(kind,expected,kind);routes.push(kind);checkpoint(kind+' complete');
    }
    await mount('screw',320,{dark:true});await open(lab('screw'));const dark=await mixed('screw');await inspect('screw',dark,'Dark320phone',true);await disclosure('screw','inputPower','Dark320phone saved calculation');await shot('dark-phone-saved-cards','screw');
    await mount('windlass',320,{contrast:true});await open(lab('windlass'));const forced=await mixed('windlass');await inspect('windlass',forced,'Forcedcolors320phone',true);await disclosure('windlass','usefulPower','Forcedcolors320phone saved calculation');await shot('forced-colors-phone-saved-cards','windlass');
    await mount('lever',320);await open(lab('lever'));const large=await mixed('lever');
    // Double computed text in the saved region; this is text enlargement, not browser zoom.
    await saved('lever').evaluate(el=>{const nodes=Array.from(el.querySelectorAll('*')).filter(n=>Array.from(n.childNodes).some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())),sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.setProperty('font-size',sizes[i]*2+'px','important'));});
    await settle();await inspect('lever',large,'200percenttext320phone',true);await shot('large-text-phone-saved-cards','lever',false,false,1);
    check(routes.length===6&&new Set(routes).size===6,'All six saved-practice station routes exercised');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),sourceSha256:sha(tool),baselineSha256:sha(baseline),dependencies,scenarios:mountedScenarios,checks,shots,routes,exports,observations,errors},null,2)+'\n');console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,routes:routes.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1600))},null,2));if(errors.length)process.exitCode=1;await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
