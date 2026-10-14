// Native React/THREE QA for the force, speed and power guide presentation.
// node dev-tools/ml_force_guide_visual_qa.cjs [out-dir]
const fs=require('fs'),path=require('path'),vm=require('vm');
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-force-guide-visual-2026-10-14/browser/run-01');
bootstrap+=String.raw`
  const observations=[],routes=[],startedAt=new Date().toISOString();
  const sha=value=>require('crypto').createHash('sha256').update(value).digest('hex');
  const baseline=require('child_process').execFileSync('git',['show','a94ee728a:stem_lab/stem_tool_machinelab.js'],{encoding:'utf8',maxBuffer:5*1024*1024});
  const dependencies=['dev-tools/ml_force_guide_visual_qa.cjs','dev-tools/ml_power_lab_qa.cjs','dev-tools/ml_scene_shots.cjs','stem_lab/stem_lab_module.js','vendor/three-r128/three.min.js','vendor/three-r128/OrbitControls.js','desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
  const guide=kind=>lab(kind).locator('[data-ml-power-force-speed='+kind+']');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  function checkpoint(label){fs.writeFileSync(path.join(OUT,'checkpoint.json'),JSON.stringify({label,checks:checks.length,routes,shots,errors},null,2)+'\n');console.log('force guide checkpoint',label,checks.length,'checks');}
  function quantities(fixture,percent=80,seconds=5,movement=.5){
    const inputForce=fixture.load/(fixture.ma*percent/100),handSpeed=movement*fixture.ma/seconds,loadSpeed=movement/seconds;
    return{inputForce,loadForce:fixture.load,handSpeed,loadSpeed,inputPower:inputForce*handSpeed,usefulPower:fixture.load*loadSpeed};
  }
  function luminance(color){const a=color?.match(/[\d.]+/g)?.slice(0,3).map(Number);return a?.length===3?a.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0):NaN;}
  function contrast(a,b){a=luminance(a);b=luminance(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
  async function panels(kind){await open(lab(kind));await open(guide(kind));await settle();}
  async function inspect(fixture,percent=80,seconds=5,movement=.5,label=fixture.kind){
    await settle();const kind=fixture.kind,p=quantities(fixture,percent,seconds,movement),target=guide(kind);
    check(await target.count()===1,label+': force-speed guide is available');
    check(await target.locator('figure').evaluate(el=>el.querySelector('figcaption')?.id===el.getAttribute('aria-labelledby')&&!!el.querySelector('figcaption')?.textContent.trim()),label+': figure is named by its visible caption');
    for(const [row,keys] of [['input',['inputForce','handSpeed','inputPower']],['output',['loadForce','loadSpeed','usefulPower']]]){
      const node=target.locator('[data-ml-power-motion-row='+row+']'),equation=await node.locator('[data-ml-power-motion-equation='+row+']').textContent(),values=(equation.match(/\d+(?:\.\d+)?/g)||[]).map(Number);
      check(await node.evaluate(el=>!!el.querySelector('h3')?.textContent.trim()&&el.querySelector('h3')?.id===el.getAttribute('aria-labelledby')),label+': '+row+' row is named by its visible heading');
      check(values.length===3&&keys.every((key,i)=>Math.abs(values[i]-p[key])<=.000005*Math.max(1,Math.abs(p[key])))&&equation.includes(' N × ')&&equation.includes(' m/s = ')&&equation.endsWith(' W'),label+': '+row+' equation pairs the independently calculated force, speed and power with correct units');
    }
    const metrics=await target.locator('[data-ml-power-motion-metric]').evaluateAll(els=>els.map(el=>({key:el.getAttribute('data-ml-power-motion-metric'),value:Number(el.dataset.value),text:el.textContent,semantic:el.parentElement.tagName==='DL'&&!!el.querySelector('dt')&&!!el.querySelector('dd')})));
    check(metrics.length===6&&new Set(metrics.map(m=>m.key)).size===6,label+': six quantities appear exactly once');
    for(const metric of metrics)check(near(metric.value,p[metric.key])&&metric.semantic,label+': '+metric.key+' agrees with independent math and has a term/definition pair');
    const bars=await target.locator('[data-ml-power-motion-bar]').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),t=el.parentElement.getBoundingClientRect(),s=getComputedStyle(el),ts=getComputedStyle(el.parentElement);return{key:el.getAttribute('data-ml-power-motion-bar'),pattern:el.dataset.pattern,width:parseFloat(el.style.width),pixels:r.width,x:r.x,trackX:t.x,trackPixels:t.width,borderLeft:parseFloat(ts.borderLeftWidth)||0,borderRight:parseFloat(ts.borderRightWidth)||0,hidden:el.closest('[aria-hidden]')?.getAttribute('aria-hidden'),image:s.backgroundImage,background:s.backgroundColor,color:s.color};}));
    check(bars.length===6&&new Set(bars.map(b=>b.key)).size===6,label+': six decorative bars accompany exact numerical readings');
    for(const pair of [['inputForce','loadForce'],['handSpeed','loadSpeed'],['inputPower','usefulPower']]){
      const scale=Math.max(p[pair[0]],p[pair[1]]),members=pair.map(key=>bars.find(b=>b.key===key));
      for(const bar of members){const content=bar.trackPixels-bar.borderLeft-bar.borderRight;
        check(Math.abs(bar.width-p[bar.key]/scale*100)<.0001,label+': '+bar.key+' uses its common same-unit scale without minimum inflation');
        check(Math.abs(bar.pixels-content*bar.width/100)<.1&&Math.abs(bar.x-bar.trackX-bar.borderLeft)<.1,label+': '+bar.key+' starts at zero and renders proportionally');
        check(bar.hidden==='true',label+': '+bar.key+' decoration avoids duplicate screen-reader output');
      }
      check(Math.abs(members[0].trackPixels-members[1].trackPixels)<.1&&Math.abs(members[0].trackX-members[1].trackX)<.1,label+': '+pair.join('/')+' tracks share equal lengths and aligned zero origins');
      check(members[0].pattern==='solid'&&members[1].pattern==='striped',label+': '+pair.join('/')+' distinguishes input/output by pattern');
    }
    check(near(p.inputForce*p.handSpeed,p.inputPower)&&near(p.loadForce*p.loadSpeed,p.usefulPower),label+': both force-times-speed products preserve mechanical power');
    observations.push({kind,label,percent,seconds,movement,expected:p,metrics,bars});return p;
  }
  async function visual(kind,label,stacked=false){
    const view=await guide(kind).evaluate(el=>{
      const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
      const style=n=>{const s=getComputedStyle(n);let p=n,bg;while(p){const v=getComputedStyle(p).backgroundColor,a=v.match(/[\d.]+/g)?.map(Number);if(a&&(a.length===3||a[3]>=.99)){bg=v;break;}p=p.parentElement;}return{font:parseFloat(s.fontSize),color:s.color,background:bg,fill:s.backgroundColor,image:s.backgroundImage,border:s.borderStyle,borderColor:s.borderColor,variant:s.fontVariantNumeric};};
      return{page:document.documentElement.scrollWidth<=innerWidth+1,panel:el.scrollWidth<=el.clientWidth+1,caption:style(el.querySelector('figcaption')),text:el.textContent,forced:matchMedia('(forced-colors:active)').matches,rows:Array.from(el.querySelectorAll('[data-ml-power-motion-row]')).map(n=>{const heading=n.querySelector('h3'),swatch=n.querySelector('[data-ml-power-motion-swatch]');return{row:n.dataset.mlPowerMotionRow,heading:style(heading),headingText:heading.textContent,uniqueHeading:document.querySelectorAll('[id="'+heading.id+'"]').length===1,rowStyle:style(n),equation:style(n.querySelector('[data-ml-power-motion-equation]')),swatch:swatch?{key:swatch.dataset.mlPowerMotionSwatch,hidden:swatch.getAttribute('aria-hidden'),tag:swatch.tagName,style:style(swatch),rect:rect(swatch)}:null,metrics:Array.from(n.querySelectorAll('[data-ml-power-motion-metric]')).map(m=>({key:m.dataset.mlPowerMotionMetric,rect:rect(m),value:style(m.querySelector('dd')),bar:style(m.querySelector('[data-ml-power-motion-bar]'))}))};}),clipped:Array.from(el.querySelectorAll('button,p,h3,dt,dd,summary,figure,figcaption,section')).filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+1).map(n=>({tag:n.tagName,text:n.textContent,width:n.clientWidth,scroll:n.scrollWidth}))};
    });
    check(view.page&&view.panel&&!view.clipped.length,label+': guide, values, equations and controls fit without clipping');
    check(view.caption.font>=24&&contrast(view.caption.color,view.caption.background)>=4.5,label+': figure title is prominent with readable contrast');
    check(view.rows.length===2&&view.rows.map(r=>r.row).join(',')==='input,output',label+': hand input precedes useful output');
    for(const row of view.rows){
      check(row.heading.font>=18&&row.uniqueHeading&&row.rowStyle.border!=='none',label+': '+row.row+' has a readable unique heading and visible section boundary');
      check(row.equation.font>=18&&row.equation.variant.includes('tabular-nums')&&contrast(row.equation.color,row.equation.background)>=4.5,label+': '+row.row+' equation is emphasized and readable');
      check(row.swatch?.tag==='SPAN'&&row.swatch.hidden==='true'&&row.swatch.key===row.row&&row.swatch.rect.width>=18&&row.swatch.rect.height>=10,label+': '+row.row+' heading has a visible decorative pattern key');
      check(row.swatch&&row.metrics.every(m=>m.bar.fill===row.swatch.style.fill&&m.bar.image===row.swatch.style.image&&m.bar.color===row.swatch.style.color),label+': '+row.row+' pattern key exactly matches all three bars');
      for(const m of row.metrics){check(m.value.font>=(m.key.includes('Power')?26:24)&&m.value.variant.includes('tabular-nums')&&contrast(m.value.color,m.value.background)>=4.5,label+': '+m.key+' has a large legible tabular value');}
      if(stacked)check(row.metrics.every((m,i)=>!i||m.rect.y>=row.metrics[i-1].rect.bottom&&Math.abs(m.rect.x-row.metrics[0].rect.x)<1),label+': '+row.row+' cards stack in reading order');
      else check(row.metrics.every((m,i)=>Math.abs(m.rect.y-row.metrics[0].rect.y)<1&&(!i||m.rect.x>row.metrics[i-1].rect.right)),label+': '+row.row+' cards form three desktop columns');
    }
    if(view.forced)check(view.rows[0].swatch.style.image==='none'&&view.rows[1].swatch.style.image.includes('gradient')&&view.rows.every(r=>r.swatch.style.fill!=='rgba(0, 0, 0, 0)'),label+': forced colors preserve solid/striped pattern differentiation');
    observations.push({kind,label,visual:view});return view;
  }
  async function focused(target,label){await target.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');const f=await target.evaluate(el=>{const s=getComputedStyle(el);return{active:el===document.activeElement,visible:el.matches(':focus-visible'),outline:s.outlineStyle,width:parseFloat(s.outlineWidth)};});check(f.active&&f.visible&&f.outline!=='none'&&f.width>=3,label+': native keyboard focus is visible');observations.push({label,focus:f});}
  async function navigation(kind,p){
    await input(kind,'question').selectOption('effortFromPower');await solve(kind,p.inputForce,'N');await result(kind,'correct');await press(action(kind,'save'));
    await input(kind,'question').selectOption('loadFromPower');await input(kind,'answer').fill('123.45');await input(kind,'unit').selectOption('N');await press(action(kind,'hint'));
    const before=await state(),summary=guide(kind).locator(':scope>summary');if(await guide(kind).evaluate(el=>el.open))await press(summary);
    await focused(lab(kind).locator('[data-ml-power-open-guide=force-speed]'),kind+' open guide');await pg.keyboard.press('Enter');await settle();
    check(await guide(kind).evaluate(el=>el.open&&el.querySelector(':scope>summary')===document.activeElement),kind+': keyboard guide link opens and focuses the native guide summary');
    check(JSON.stringify(await state())===JSON.stringify(before),kind+': opening guide preserves full draft and every record');
    await focused(guide(kind).locator('[data-ml-power-return-calculation]'),kind+' return');await pg.keyboard.press('Enter');await settle();
    check(await input(kind,'answer').evaluate(el=>el===document.activeElement)&&await input(kind,'answer').inputValue()==='123.45',kind+': keyboard return restores focus to the unchanged answer');
    check(JSON.stringify(await state())===JSON.stringify(before)&&await recordsPreserved(),kind+': guide return preserves answer, unit, hint, saved skill and unrelated evidence');
  }
  async function shot(name,kind,isBaseline=false){
    await pg.evaluate(()=>document.fonts.ready);await guide(kind).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await settle();
    const clip=await guide(kind).evaluate(el=>{const a=el.getBoundingClientRect();return{x:Math.max(0,a.x+scrollX-3),y:Math.max(0,a.y+scrollY-3),width:Math.min(innerWidth,a.width+6),height:Math.ceil(a.height+6)};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip,animations:'disabled',caret:'hide'});shots.push({name,file:name+'.png',sha256:sha(fs.readFileSync(path.join(OUT,name+'.png'))),clip,baseline:isBaseline});checkpoint(name);
  }
  try{
    await pg.addScriptTag({content:baseline});await mount('windlass');await panels('windlass');await shot('desktop-before-force-guide','windlass',true);
    for(const fixture of fixtures){const kind=fixture.kind;await mount(kind);const before=await state();await open(lab(kind));check(!await guide(kind).evaluate(el=>el.open),kind+': guide starts closed');await panels(kind);check(await sameExcept(before),kind+': opening optional guide changes no persisted state');const p=await inspect(fixture);await visual(kind,kind+' desktop');
      const choices=await input(kind,'question').locator('option').evaluateAll(els=>els.map(el=>el.value));check(choices.length===(fixture.radius?25:18)&&choices.includes('effortFromPower')&&choices.includes('loadFromPower'),kind+': complete current skill inventory retains both inverse force exercises');
      await navigation(kind,p);if(kind==='windlass')await shot('desktop-force-guide',kind);if(kind==='ramp')check((await guide(kind).textContent()).includes('load force acts vertically'),'Ramp guide explicitly relates vertical load force and vertical rise rate');
      const fixed=JSON.stringify((await state()).benchPowerRecords);await input(kind,'duration').fill('.5');await input(kind,'timeUnit').selectOption('min');const slower=await inspect(fixture,80,30,.5,kind+' 30seconds');check(near(slower.inputForce,p.inputForce)&&near(slower.loadForce,p.loadForce)&&near(slower.handSpeed,p.handSpeed/6)&&near(slower.inputPower,p.inputPower/6),kind+': longer duration preserves force while reducing speed and power');
      await input(kind,'percent').fill('100');const ideal=await inspect(fixture,100,30,.5,kind+' ideal');check(near(ideal.usefulPower,ideal.inputPower)&&near(ideal.inputForce,p.inputForce*.8),kind+': ideal efficiency removes power loss and lowers required effort');check(JSON.stringify((await state()).benchPowerRecords)===fixed,kind+': changing time and efficiency preserves saved snapshots');routes.push(kind);checkpoint(kind+' complete');
    }
    const subOne={kind:'lever',load:400,ma:.25};await mount('lever',1150,{}, {leverEffortArm:.5,leverLoadArm:2});await panels('lever');const reverse=await inspect(subOne,80,5,.5,'Lever below one mechanical advantage');await visual('lever','Lever reversed force ordering');check(reverse.inputForce>reverse.loadForce&&reverse.handSpeed<reverse.loadSpeed,'Sub-one lever reverses the force and speed ordering without changing scale logic');
    const beforeResize=await state();await pg.setViewportSize({width:600,height:1100});await settle();await visual('lever','600px breakpoint',true);await inspect(subOne,80,5,.5,'600px sub-one lever');check(JSON.stringify(await state())===JSON.stringify(beforeResize),'600px responsive reflow preserves all state');await shot('intermediate-force-guide','lever');
    for(const [field,bad,good] of [['duration','','5'],['percent','101','80'],['budget','0','100']]){await input('lever',field).fill(bad);check(await guide('lever').count()===0&&await action('lever','check').count()===0,'Invalid '+field+' removes stale guide values and grading');await input('lever',field).fill(good);await panels('lever');}await inspect(subOne,80,5,.5,'Repaired valid inputs');check(await recordsPreserved(),'Invalid and repaired inputs preserve unrelated saved evidence');
    const screw=fixtures.find(f=>f.kind==='screw');await mount('screw',320,{dark:true});await panels('screw');const dark=await inspect(screw);await visual('screw','Dark320phone',true);await navigation('screw',dark);await shot('dark-phone-force-guide','screw');
    const windlass=fixtures.find(f=>f.kind==='windlass');await mount('windlass',320,{contrast:true});await panels('windlass');const forced=await inspect(windlass);await visual('windlass','Forcedcolors320phone',true);await navigation('windlass',forced);await shot('forced-colors-phone-force-guide','windlass');
    await mount('lever',320);await panels('lever');
    // Double computed text within the guide; this tests text enlargement, not browser zoom.
    await guide('lever').evaluate(el=>{const nodes=Array.from(el.querySelectorAll('*')).filter(n=>Array.from(n.childNodes).some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())),sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.setProperty('font-size',sizes[i]*2+'px','important'));});
    await settle();await inspect(fixtures[0]);await visual('lever','200percenttext320phone',true);await focused(guide('lever').locator('[data-ml-power-return-calculation]'),'200percenttext320phone return');await shot('large-text-phone-force-guide','lever');
    check(routes.length===6&&new Set(routes).size===6,'All six force-speed guide station routes exercised');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),sourceSha256:sha(tool),baselineSha256:sha(baseline),dependencies,scenarios:mountedScenarios,checks,shots,routes,observations,errors},null,2)+'\n');console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,routes:routes.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1600))},null,2));if(errors.length)process.exitCode=1;await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
