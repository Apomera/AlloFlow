// Targeted native React/THREE QA for the task-settings visual grouping.
// node dev-tools/ml_task_setup_visual_qa.cjs [out-dir]
const fs=require('fs'),path=require('path'),vm=require('vm');
console.log('task settings visual QA starting',new Date().toISOString());
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{')).replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-task-setup-visual-2026-10-14/browser/run-01');
bootstrap+=String.raw`
  const observations=[],routes=[],startedAt=new Date().toISOString();
  const setup=kind=>lab(kind).locator('[data-ml-power-setup='+kind+']');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const sha=value=>require('crypto').createHash('sha256').update(value).digest('hex');
  const baseline=require('child_process').execFileSync('git',['show','b33626f52:stem_lab/stem_tool_machinelab.js'],{encoding:'utf8',maxBuffer:4*1024*1024});
  const dependencies=['dev-tools/ml_task_setup_visual_qa.cjs','dev-tools/ml_power_lab_qa.cjs','dev-tools/ml_scene_shots.cjs','stem_lab/stem_lab_module.js','vendor/three-r128/three.min.js','vendor/three-r128/OrbitControls.js','desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
  function checkpoint(label){fs.writeFileSync(path.join(OUT,'checkpoint.json'),JSON.stringify({label,checks:checks.length,routes,shots,errors},null,2)+'\n');console.log('task settings checkpoint',label,checks.length,'checks');}
  function luminance(color){const a=color?.match(/[\d.]+/g)?.slice(0,3).map(Number);return a?.length===3?a.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0):NaN;}
  function contrast(a,b){a=luminance(a);b=luminance(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
  async function inspectSetup(kind,label,stacked=false,large=false){
    const view=await setup(kind).evaluate(el=>{const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};},styles=n=>{const s=getComputedStyle(n);let p=n,bg;while(p){const v=getComputedStyle(p).backgroundColor,a=v.match(/[\d.]+/g)?.map(Number);if(a&&(a.length===3||a[3]>=.99)){bg=v;break;}p=p.parentElement;}return{font:parseFloat(s.fontSize),weight:s.fontWeight,color:s.color,background:bg,border:s.borderStyle,variant:s.fontVariantNumeric};};return{tag:el.tagName,legend:el.querySelector(':scope > legend')?.textContent,live:!!el.closest('[aria-live],[role=status]'),rect:rect(el),page:document.documentElement.scrollWidth<=innerWidth+1,panel:el.scrollWidth<=el.clientWidth+1,grid:getComputedStyle(el.querySelector('.ml-power-setup-fields')).gridTemplateColumns,controls:Array.from(el.querySelectorAll('input,select')).map(n=>({id:n.id,tag:n.tagName,type:n.type,value:n.value,inputMode:n.inputMode,invalid:n.getAttribute('aria-invalid'),labels:Array.from(n.labels||[]).map(l=>l.textContent),described:(n.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean).map(id=>({id,exists:!!document.getElementById(id)})),rect:rect(n),style:styles(n),overflow:n.scrollWidth>n.clientWidth+1})),seconds:{text:el.querySelector('[data-ml-power-seconds]')?.textContent,value:el.querySelector('[data-ml-power-seconds]')?.getAttribute('data-ml-power-seconds'),style:styles(el.querySelector('[data-ml-power-seconds] strong'))},clipped:Array.from(el.querySelectorAll('legend,p,label')).filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+1).map(n=>n.textContent),scope:document.getElementById('ml-power-scope-'+el.getAttribute('data-ml-power-setup'))?.textContent,forced:matchMedia('(forced-colors:active)').matches};});
    check(view.tag==='FIELDSET'&&view.legend==='Task settings'&&!view.live,label+': one native fieldset has the visible Task settings legend');
    check(view.controls.map(n=>n.id).join(',')===['percent','budget','duration','timeUnit'].map(k=>'ml-power-'+k+'-'+kind).join(','),label+': DOM order matches efficiency, power budget, duration and time unit');
    check(view.controls.every(n=>n.labels.length===1&&n.labels[0].trim()),label+': each control retains one explicit visible label');
    check(view.controls.filter(n=>n.tag==='INPUT').every(n=>n.type==='text'&&n.inputMode==='decimal'&&n.described.length&&n.described.every(d=>d.exists)),label+': decimal inputs retain linked range guidance');
    check(view.controls.every(n=>n.rect.height>=52&&n.style.border!=='none'),label+': all controls retain visible boundaries and at least52px height');
    check(view.controls.filter(n=>n.tag==='INPUT').every(n=>n.style.font>=22&&n.style.variant.includes('tabular-nums'))&&view.controls.find(n=>n.tag==='SELECT').style.font>=16,label+': numerical inputs are large tabular text and selector is readable');
    check(view.page&&view.panel&&!view.clipped.length&&view.controls.every(n=>!n.overflow&&n.rect.x>=view.rect.x&&n.rect.right<=view.rect.right+1),label+': fieldset text and controls fit without horizontal overflow');
    const c=view.controls;
    check(stacked?c.every((n,i)=>!i||n.rect.y>=c[i-1].rect.bottom):Math.abs(c[0].rect.y-c[1].rect.y)<1&&Math.abs(c[2].rect.y-c[3].rect.y)<1&&c[2].rect.y>=c[0].rect.bottom,label+': grid geometry follows '+(stacked?'single-column':'two-column')+' reading order');
    check(view.seconds.text?.includes('Task time:')&&view.seconds.style.font>=18,label+': converted seconds remain visible and emphasized');
    check(view.scope?.includes('not demonstration playback time')&&view.scope.includes('without acceleration'),label+': model scope stays visible next to task settings');
    for(const n of view.controls){n.style.contrast=contrast(n.style.color,n.style.background);check(n.style.contrast>=4.5,label+': '+n.id+' text contrast is at least4.5to1');}
    observations.push({label,largeText:large,view});
  }
  async function keyboard(kind,label){
    await input(kind,'percent').focus();
    for(const key of ['percent','budget','duration','timeUnit']){
      const locator=input(kind,key);if(key==='percent'){await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');}
      const view=await locator.evaluate(el=>{const s=getComputedStyle(el);let p=el,bg;while(p){const v=getComputedStyle(p).backgroundColor,a=v.match(/[\d.]+/g)?.map(Number);if(a&&(a.length===3||a[3]>=.99)){bg=v;break;}p=p.parentElement;}return{active:el===document.activeElement,visible:el.matches(':focus-visible'),width:parseFloat(s.outlineWidth),style:s.outlineStyle,color:s.outlineColor,background:bg};});
      view.contrast=contrast(view.color,view.background);check(view.active&&view.visible&&view.width>=3&&view.style!=='none'&&view.contrast>=3,label+': Tab reaches '+key+' in reading order with visible3px focus');observations.push({label:label+' keyboard '+key,view});if(key!=='timeUnit')await pg.keyboard.press('Tab');
    }
  }
  async function captureSetup(name,kind,isBaseline=false){
    await pg.evaluate(()=>document.fonts.ready);await lab(kind).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await settle();
    const clip=await lab(kind).evaluate((el,isBaseline)=>{const top=el.querySelector(':scope > summary').getBoundingClientRect(),targets=isBaseline?[el.querySelector('[id^=ml-power-ranges-]')]:[el.querySelector('[data-ml-power-setup]'),el.querySelector('[id^=ml-power-scope-]')],bottom=Math.max(...targets.map(n=>n.getBoundingClientRect().bottom));return{x:Math.max(0,top.x+scrollX-3),y:Math.max(0,top.y+scrollY-3),width:Math.min(innerWidth,el.getBoundingClientRect().width+6),height:Math.ceil(bottom-top.y+9)};},isBaseline);
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip,animations:'disabled',caret:'hide'});shots.push({name,file:name+'.png',sha256:sha(fs.readFileSync(path.join(OUT,name+'.png'))),clip,baseline:isBaseline});checkpoint(name);
  }
  try{
    await pg.addScriptTag({content:baseline});await mount('lever');await open(lab('lever'));await captureSetup('desktop-before-task-settings','lever',true);
    for(const f of fixtures){
      const kind=f.kind;await mount(kind);await open(lab(kind));await inspectSetup(kind,kind+' desktop');await keyboard(kind,kind+' desktop');if(kind==='lever')await captureSetup('desktop-task-settings','lever');
      check(await input(kind,'percent').inputValue()==='80'&&await input(kind,'budget').inputValue()==='100'&&await input(kind,'duration').inputValue()==='5'&&await input(kind,'timeUnit').inputValue()==='s',kind+': all default assumptions are retained');
      await open(comparison(kind));const expected=await model(f);await solve(kind,expected.inputPower);await result(kind,'correct');await press(action(kind,'save'));const fixed=JSON.stringify((await state()).benchPowerRecords);
      await press(action(kind,'hint'));await input(kind,'duration').fill('0.5');await input(kind,'timeUnit').selectOption('min');await settle();await resetPractice(kind);await model(f,80,30);
      check(await setup(kind).locator('[data-ml-power-seconds]').getAttribute('data-ml-power-seconds')==='30',kind+': minutes update the visible converted seconds readout');
      check(JSON.stringify((await state()).benchPowerRecords)===fixed&&await recordsPreserved(),kind+': changing settings preserves saved calculations and unrelated records');routes.push(kind);
      if(kind==='lever'){const before=await state();await input(kind,'budget').fill('0');await settle();check(await input(kind,'budget').getAttribute('aria-invalid')==='true'&&await comparison(kind).count()===0&&await action(kind,'check').count()===0,'Invalid budget keeps its field visible while withholding derived calculations');check(await sameExcept(before,['benchPower']),'Invalid setup affects only the current calculation draft');await input(kind,'budget').fill('100');await input(kind,'percent').fill('101');check(await input(kind,'percent').getAttribute('aria-invalid')==='true','Out-of-range efficiency retains aria-invalid');await input(kind,'percent').fill('80');await input(kind,'duration').fill('61');check(await input(kind,'duration').getAttribute('aria-invalid')==='true','Minutes outside3600seconds retain validation');await input(kind,'duration').fill('');check(await input(kind,'duration').getAttribute('aria-invalid')==='true'&&(await setup(kind).locator(':scope > p').first().textContent()).includes('—'),'Blank duration retains visible empty seconds state');await input(kind,'duration').fill('0.5');check(JSON.stringify((await state()).benchPowerRecords)===fixed,'Invalid drafts preserve saved skill bytes');}
      checkpoint(kind+' complete');
    }
    await mount('ramp',320,{dark:true});await open(lab('ramp'));await inspectSetup('ramp','Dark320phone',true);await keyboard('ramp','Dark320phone');await captureSetup('dark-phone-task-settings','ramp');
    await mount('screw',320,{contrast:true});await open(lab('screw'));await inspectSetup('screw','Forcedcolors320phone',true);await keyboard('screw','Forcedcolors320phone');await captureSetup('forced-colors-phone-task-settings','screw');
    await mount('lever',320);await open(lab('lever'));
    // Simulate user text enlargement within the reviewed region, without changing production.
    await lab('lever').evaluate(el=>{const nodes=[el.querySelector(':scope > summary'),...el.querySelectorAll('[data-ml-power-setup] legend,[data-ml-power-setup] label,[data-ml-power-setup] input,[data-ml-power-setup] select,[data-ml-power-setup] p,[data-ml-power-seconds] span,[data-ml-power-seconds] strong,[id^=ml-power-scope-]')],sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.setProperty('font-size',sizes[i]*2+'px','important'));});
    await settle();await inspectSetup('lever','200percenttext320phone',true,true);await keyboard('lever','200percenttext320phone');await captureSetup('large-text-phone-task-settings','lever');
    check(routes.length===6&&new Set(routes).size===6,'All six station setting routes exercised');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),sourceSha256:sha(tool),baselineSha256:sha(baseline),dependencies,scenarios:mountedScenarios,checks,shots,routes,observations,errors},null,2)+'\n');console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,routes:routes.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1600))},null,2));if(errors.length)process.exitCode=1;await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
