// Native React/THREE visual QA for the saved-practice overview.
// node dev-tools/ml_practice_overview_visual_qa.cjs [out-dir]
const fs=require('fs'),path=require('path'),vm=require('vm');
console.log('practice overview QA starting',new Date().toISOString());
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-practice-overview-visual-2026-10-14/browser/run-01')
  .replace('window.__qaState = pair[0].machineLab; var ctx = {','window.__qaState = pair[0].machineLab; window.__qaSet=pair[1]; var ctx = {');
bootstrap+=String.raw`
  const observations=[],routes=[],startedAt=new Date().toISOString();
  const sha=value=>require('crypto').createHash('sha256').update(value).digest('hex');
  const baseline=require('child_process').execFileSync('git',['show','a79635257:stem_lab/stem_tool_machinelab.js'],{encoding:'utf8',maxBuffer:5*1024*1024});
  const dependencies=['dev-tools/ml_practice_overview_visual_qa.cjs','dev-tools/ml_power_lab_qa.cjs','dev-tools/ml_scene_shots.cjs','stem_lab/stem_lab_module.js','vendor/three-r128/three.min.js','vendor/three-r128/OrbitControls.js','desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
  const families={power:['inputPower','usefulPower','lossPower','effortFromPower','loadFromPower'],motion:['handSpeed','loadSpeed'],planning:['budgetTime','budgetEnergy','budgetLoad','budgetMovement','requiredEfficiency'],rotation:['torque','rpm','turns','angularTravel','omega','rotationalWork','rotationalPower'],units:['powerKilowatts','powerWatts','timeMinutes','timeSeconds','speedCentimetres','speedMetres']};
  const linear=['inputPower','usefulPower','lossPower','handSpeed','loadSpeed','budgetTime','budgetEnergy','budgetLoad','budgetMovement','requiredEfficiency','effortFromPower','loadFromPower',...families.units];
  const rotary=['inputPower','usefulPower','lossPower','handSpeed','loadSpeed','budgetTime','torque','rpm','budgetEnergy','budgetLoad','budgetMovement','requiredEfficiency','turns','angularTravel','omega','rotationalWork','rotationalPower','effortFromPower','loadFromPower',...families.units];
  const map=kind=>lab(kind).locator('[data-ml-power-skill-map='+kind+']');
  const tile=(kind,key)=>map(kind).locator('[data-ml-power-skill='+key+']');
  const shortcut=(kind,mode)=>map(kind).locator('[data-ml-power-practice-next='+mode+']');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const inventory=kind=>kind==='windlass'||kind==='screw'?rotary:linear;
  function checkpoint(label){fs.writeFileSync(path.join(OUT,'checkpoint.json'),JSON.stringify({label,checks:checks.length,routes,shots,errors},null,2)+'\n');console.log('practice overview checkpoint',label,checks.length,'checks');}
  function luminance(color){const a=color?.match(/[\d.]+/g)?.slice(0,3).map(Number);return a?.length===3?a.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0):NaN;}
  function contrast(a,b){a=luminance(a);b=luminance(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
  async function panels(kind){await open(lab(kind));await open(map(kind));await settle();}
  async function replaceRecords(kind,records){await pg.evaluate(([kind,records])=>window.__qaSet(prev=>({...prev,machineLab:{...prev.machineLab,benchPowerRecords:{...prev.machineLab.benchPowerRecords,[kind]:records}}})),[kind,records]);await settle();}
  function nextTarget(kind,current,mode,expected){const kinds=inventory(kind),start=kinds.indexOf(current);for(let n=1;n<kinds.length;n++){const key=kinds[(start+n)%kinds.length];if(mode==='unsaved'?!expected[key]:expected[key]==='solution')return key;}return '';}
  async function saveRecord(kind,key,completion,answer,unit,version){
    await input(kind,'question').selectOption(key);await press(action(kind,'hint'));
    if(completion==='checked'){await solve(kind,answer,unit);await result(kind,'correct');}
    else{await press(action(kind,'reveal'));await result(kind,'solution');}
    await press(action(kind,'save'));const record=(await state()).benchPowerRecords[kind][key];
    check(record.version===version&&record.completion===completion&&record.hint===1,kind+': real '+key+' save retains version '+version+', '+completion+' and hint provenance');return record;
  }
  async function mixed(kind,extended=false){
    const expected={},p=physical(fixtures.find(f=>f.kind===kind)).expected;
    const entries=[['inputPower','checked',p.inputPower,'W',1],['usefulPower','solution',0,'W',1]];
    if(extended)entries.push(['budgetEnergy','solution',0,'J',2],['turns','solution',0,'turns',3],['loadFromPower','checked',400,'N',4],['powerKilowatts','solution',0,'kW',5]);
    for(const [key,completion,answer,unit,version] of entries){await saveRecord(kind,key,completion,answer,unit,version);expected[key]=completion;}
    await input(kind,'question').selectOption('lossPower');return expected;
  }
  async function inspect(kind,expected,label,stacked=false,earlier=false,large=false){
    const kinds=inventory(kind),checked=Object.values(expected).filter(v=>v==='checked').length,solutions=Object.values(expected).filter(v=>v==='solution').length;
    const counts={checked,solution:solutions,unsaved:kinds.length-checked-solutions};await settle();
    const view=await map(kind).evaluate(el=>{
      const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
      const style=n=>{const s=getComputedStyle(n);let p=n,bg;while(p){const v=getComputedStyle(p).backgroundColor,a=v.match(/[\d.]+/g)?.map(Number);if(a&&(a.length===3||a[3]>=.99)){bg=v;break;}p=p.parentElement;}return{font:parseFloat(s.fontSize),color:s.color,background:bg,border:s.borderStyle,variant:s.fontVariantNumeric};};
      const count=el.querySelector('[data-ml-power-map-saved]');
      return{page:document.documentElement.scrollWidth<=innerWidth+1,panel:el.scrollWidth<=el.clientWidth+1,rect:rect(el),text:el.textContent,live:!!el.closest('[aria-live],[role=status]'),counts:{tag:count?.tagName,saved:Number(count?.dataset.mlPowerMapSaved),checked:Number(count?.dataset.mlPowerMapChecked),solutions:Number(count?.dataset.mlPowerMapSolutions),text:count?.textContent},cards:Array.from(el.querySelectorAll('[data-ml-power-map-status]')).map(n=>({key:n.dataset.mlPowerMapStatus,tag:n.tagName,text:n.textContent,rect:rect(n),value:n.querySelector('dd')?.textContent,label:n.querySelector('dt')?.textContent,valueStyle:n.querySelector('dd')&&style(n.querySelector('dd')),labelStyle:n.querySelector('dt')&&style(n.querySelector('dt')),style:style(n)})),swatches:Array.from(el.querySelectorAll('[data-ml-power-map-swatch]')).map(n=>({key:n.dataset.mlPowerMapSwatch,hidden:n.getAttribute('aria-hidden'),color:getComputedStyle(n).backgroundColor,pattern:getComputedStyle(n).backgroundImage,forced:getComputedStyle(n).forcedColorAdjust,border:getComputedStyle(n).borderStyle})),clipped:Array.from(el.querySelectorAll('button,p,h4,dt,dd,[data-ml-power-family-track]')).filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+1).map(n=>({tag:n.tagName,text:n.textContent,width:n.clientWidth,scroll:n.scrollWidth})),forced:matchMedia('(forced-colors:active)').matches};
    });
    check(view.page&&view.panel&&!view.clipped.length,label+': overview, family counts and controls fit without horizontal clipping');
    check(!view.live&&view.counts.saved===checked+solutions&&view.counts.checked===checked&&view.counts.solutions===solutions,label+': original aggregate attributes retain independently derived counts outside live regions');
    check(view.counts.text.includes('Saved: '+(checked+solutions)+'/'+kinds.length),label+': saved total remains explicit');
    check(view.cards.map(c=>c.key).join(',')==='checked,solution,unsaved',label+': overview has exactly three status cards in reading order');
    const labels={checked:'Answer checked',solution:'Worked solution viewed',unsaved:'No saved record'};
    for(const card of view.cards){
      check(Number(card.value)===counts[card.key]&&card.label.includes(labels[card.key]),label+': '+card.key+' card has the correct labelled count');
      check(card.valueStyle?.font>=26&&card.valueStyle?.variant.includes('tabular-nums')&&card.style.border!=='none',label+': '+card.key+' count is large, tabular and visibly bounded');
      check(contrast(card.valueStyle?.color,card.valueStyle?.background)>=4.5&&contrast(card.labelStyle?.color,card.labelStyle?.background)>=4.5,label+': '+card.key+' count and label contrast are at least4.5to1');
    }
    if(stacked)check(view.cards.every((c,i)=>Math.abs(c.rect.width-view.cards[0].rect.width)<1&&(!i||c.rect.y>=view.cards[i-1].rect.bottom)),label+': narrow overview cards stack in reading order');
    else check(view.cards.length===3&&view.cards.every(c=>Math.abs(c.rect.y-view.cards[0].rect.y)<1)&&view.cards[0].rect.right<view.cards[1].rect.x&&view.cards[1].rect.right<view.cards[2].rect.x,label+': desktop overview uses three readable columns');
    check(view.swatches.map(s=>s.key).join(',')==='checked,solution,unsaved'&&view.swatches.every(s=>s.hidden==='true'&&s.border!=='none'),label+': all three decorative legend swatches have visible boundaries and text labels');
    check(view.text.includes('Counts include records made with earlier setups. Saved records show practice history, not a score.')&&view.text.includes('Shortcuts skip the current skill.')&&view.text.includes('save first.'),label+': history, fresh attempt and save-first explanations remain explicit');
    const choices=await input(kind,'question').locator('option').evaluateAll(els=>els.map(el=>el.value));check(choices.join(',')===kinds.join(','),label+': independent linear/rotary inventory agrees with selector order');
    const expectedFamilies=Object.keys(families).filter(f=>families[f].some(k=>kinds.includes(k)));
    const sections=await map(kind).locator('[data-ml-power-skill-family]').evaluateAll(els=>els.map(el=>({key:el.dataset.mlPowerSkillFamily,heading:document.getElementById(el.getAttribute('aria-labelledby'))?.textContent,font:parseFloat(getComputedStyle(document.getElementById(el.getAttribute('aria-labelledby'))).fontSize)})));
    check(sections.map(s=>s.key).join(',')===expectedFamilies.join(',')&&sections.every(s=>s.heading&&s.font>=17),label+': named applicable family groups retain visible larger headings');
    const rows=[];
    for(const family of expectedFamilies){
      const keys=families[family].filter(k=>kinds.includes(k)),fc=keys.filter(k=>expected[k]==='checked').length,fs=keys.filter(k=>expected[k]==='solution').length,fu=keys.length-fc-fs;
      const row=await map(kind).locator('[data-ml-power-family-coverage='+family+']').evaluate(el=>({checked:Number(el.dataset.checked),solution:Number(el.dataset.solution),unsaved:Number(el.dataset.unsaved),total:Number(el.dataset.total),text:el.textContent,tag:el.tagName,role:el.getAttribute('role')}));
      check(row.checked===fc&&row.solution===fs&&row.unsaved===fu&&row.total===keys.length,label+': '+family+' counts match valid saved records');
      check(row.text==='Checked: '+fc+' · Solution viewed: '+fs+' · No saved record: '+fu&&row.tag==='P'&&!row.role,label+': '+family+' exact count text and paragraph semantics remain unchanged');
      const strip=await map(kind).locator('[data-ml-power-family-track='+family+']').evaluate(el=>({hidden:el.getAttribute('aria-hidden'),role:el.getAttribute('role'),width:el.clientWidth,segments:Array.from(el.children).map(n=>({key:n.getAttribute('data-ml-power-family-segment'),percent:parseFloat(n.style.width),pixels:n.getBoundingClientRect().width,color:getComputedStyle(n).backgroundColor,pattern:getComputedStyle(n).backgroundImage,forced:getComputedStyle(n).forcedColorAdjust}))}));
      check(strip.hidden==='true'&&!strip.role&&strip.segments.map(s=>s.key).join(',')==='checked,solution,unsaved',label+': '+family+' decorative strip retains three categories');
      const familyCounts={checked:fc,solution:fs,unsaved:fu};
      for(const segment of strip.segments){const swatch=view.swatches.find(s=>s.key===segment.key);check(Math.abs(segment.percent-familyCounts[segment.key]/keys.length*100)<1e-4&&Math.abs(segment.pixels-strip.width*familyCounts[segment.key]/keys.length)<1,label+': '+family+' '+segment.key+' segment preserves exact fraction without a minimum');check(swatch&&swatch.color===segment.color&&swatch.pattern===segment.pattern,label+': '+family+' '+segment.key+' pattern matches its overview legend');}
      for(const key of keys){const button=tile(kind,key),record=expected[key];check(await button.getAttribute('data-ml-power-skill-status')===(record||'unsaved')&&await button.getAttribute('data-ml-power-skill-setup')===(record?earlier?'earlier':'current':'none'),label+': '+key+' tile retains honest status and setup provenance');}
      rows.push({family,row,strip});
    }
    const current=await input(kind,'question').inputValue();
    for(const mode of ['unsaved','solution']){const target=nextTarget(kind,current,mode,expected),button=shortcut(kind,mode);check(await button.getAttribute('data-target')===target&&await button.isDisabled()===!target,label+': '+mode+' shortcut points to the next other eligible skill or disables');}
    if(view.forced)check(view.swatches.every(s=>s.forced==='none')&&view.swatches[0].color!==view.swatches[2].color&&view.swatches[1].pattern.includes('repeating-linear-gradient'),label+': forced colors preserve solid, striped and empty visual keys');
    observations.push({label,kind,largeText:large,view,rows});
  }
  async function focused(target,label){await target.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');const f=await target.evaluate(el=>{const s=getComputedStyle(el);return{active:el===document.activeElement,visible:el.matches(':focus-visible'),outline:s.outlineStyle,width:parseFloat(s.outlineWidth)};});check(f.active&&f.visible&&f.outline!=='none'&&f.width>=3,label+': visible native keyboard focus');observations.push({label,focus:f});}
  async function navigation(kind,expected,label){
    await input(kind,'answer').fill('999');await press(action(kind,'hint'));const before=await state();
    const go=map(kind).locator('[data-ml-power-go-calculation]');await focused(go,label+' go');await pg.keyboard.press('Enter');await settle();check(await input(kind,'answer').evaluate(el=>el===document.activeElement)&&JSON.stringify(await state())===JSON.stringify(before),label+': Go to calculation focuses the answer without changing draft or saved history');
    for(const mode of ['unsaved','solution']){const current=await input(kind,'question').inputValue(),target=nextTarget(kind,current,mode,expected);if(!target)continue;const old=await state();await focused(shortcut(kind,mode),label+' '+mode);await pg.keyboard.press('Enter');await settle();check(await input(kind,'question').inputValue()===target,label+': keyboard '+mode+' selects the independent next skill');await resetPractice(kind);check(await sameExcept(old,['benchPower'])&&JSON.stringify((await state()).benchPowerRecords)===JSON.stringify(old.benchPowerRecords),label+': '+mode+' leaves all saved snapshots and other evidence unchanged');}
    const old=await state();await focused(tile(kind,'inputPower'),label+' skill tile');await pg.keyboard.press('Enter');await settle();check(await input(kind,'question').inputValue()==='inputPower'&&await tile(kind,'inputPower').getAttribute('aria-pressed')==='true',label+': keyboard skill tile selects and marks the current skill');check(await sameExcept(old,['benchPower'])&&JSON.stringify((await state()).benchPowerRecords)===JSON.stringify(old.benchPowerRecords),label+': tile selection retains saved snapshots and unrelated work');
    check(await recordsPreserved(),label+': design, investigation and efficiency evidence stays intact');
  }
  async function shot(name,kind,isBaseline=false){
    await pg.evaluate(()=>document.fonts.ready);await map(kind).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await settle();
    const clip=await map(kind).evaluate(el=>{const a=el.getBoundingClientRect(),tiles=el.querySelectorAll('[data-ml-power-skill-family=power] [data-ml-power-skill]'),b=tiles[1].getBoundingClientRect();return{x:Math.max(0,a.x+scrollX-3),y:Math.max(0,a.y+scrollY-3),width:Math.min(innerWidth,a.width+6),height:Math.ceil(b.bottom-a.top+9)};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip,animations:'disabled',caret:'hide'});shots.push({name,file:name+'.png',sha256:sha(fs.readFileSync(path.join(OUT,name+'.png'))),clip,baseline:isBaseline});checkpoint(name);
  }
  try{
    await pg.addScriptTag({content:baseline});await mount('windlass');await panels('windlass');const baselineExpected=await mixed('windlass',true);await input('windlass','duration').fill('10');await shot('desktop-before-practice-overview','windlass',true);const baselineRecords=(await state()).benchPowerRecords.windlass;
    for(const fixture of fixtures){
      const kind=fixture.kind;await mount(kind);await panels(kind);await inspect(kind,{},kind+' empty desktop');const expected=await mixed(kind,kind==='windlass');await inspect(kind,expected,kind+' mixed desktop');
      if(kind==='windlass'){check(JSON.stringify((await state()).benchPowerRecords.windlass)===JSON.stringify(baselineRecords),'Current and baseline windlass saves have identical record contents');await input(kind,'duration').fill('10');await inspect(kind,expected,'windlass earlier setup desktop',false,true);await shot('desktop-practice-overview',kind);}
      if(kind==='ramp')await shot('desktop-linear-practice-overview',kind);
      if(kind==='lever'){const valid=(await state()).benchPowerRecords.lever;await replaceRecords(kind,{...valid,lossPower:{...valid.inputPower,question:'lossPower',version:99},handSpeed:{...valid.inputPower,question:'handSpeed',answer:'9999',unit:'m/s'}});await inspect(kind,expected,'lever ignores two invalid saved records');await replaceRecords(kind,valid);}
      await navigation(kind,expected,kind+' desktop');routes.push(kind);checkpoint(kind+' complete');
    }
    await mount('screw',320,{dark:true});await panels('screw');const dark=await mixed('screw');await inspect('screw',dark,'Dark320phone',true);await navigation('screw',dark,'Dark320phone');await shot('dark-phone-practice-overview','screw');
    await mount('windlass',320,{contrast:true});await panels('windlass');const forced=await mixed('windlass',true);await inspect('windlass',forced,'Forcedcolors320phone',true);await navigation('windlass',forced,'Forcedcolors320phone');await shot('forced-colors-phone-practice-overview','windlass');
    await mount('lever',320);await panels('lever');const large=await mixed('lever');
    // Double computed text in the reviewed region; this is text enlargement, not browser zoom.
    await map('lever').evaluate(el=>{const nodes=Array.from(el.querySelectorAll('*')).filter(n=>Array.from(n.childNodes).some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())),sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.setProperty('font-size',sizes[i]*2+'px','important'));});
    await settle();await inspect('lever',large,'200percenttext320phone',true,false,true);await shot('large-text-phone-practice-overview','lever');
    check(routes.length===6&&new Set(routes).size===6,'All six station practice routes exercised');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),sourceSha256:sha(tool),baselineSha256:sha(baseline),dependencies,scenarios:mountedScenarios,checks,shots,routes,observations,errors},null,2)+'\n');console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,routes:routes.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1600))},null,2));if(errors.length)process.exitCode=1;await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
