// Native React/THREE visual QA for grouped power, motion, and rotation results.
// node dev-tools/ml_results_visual_qa.cjs [out-dir]
const fs=require('fs'),path=require('path'),vm=require('vm');
console.log('results visual QA starting',new Date().toISOString());
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{')).replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-results-visual-2026-10-14/browser/run-01');
bootstrap+=String.raw`
  const observations=[],routes=[],startedAt=new Date().toISOString();
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const sha=value=>require('crypto').createHash('sha256').update(value).digest('hex');
  const baseline=require('child_process').execFileSync('git',['show','0315720a5:stem_lab/stem_tool_machinelab.js'],{encoding:'utf8',maxBuffer:5*1024*1024});
  const dependencies=['dev-tools/ml_results_visual_qa.cjs','dev-tools/ml_power_lab_qa.cjs','dev-tools/ml_scene_shots.cjs','stem_lab/stem_lab_module.js','vendor/three-r128/three.min.js','vendor/three-r128/OrbitControls.js','desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
  const expectedGroups=[{key:'power',title:'Power transfer',metrics:['inputPower','usefulPower','lossPower']},{key:'motion',title:'Motion and task time',metrics:['handSpeed','loadSpeed','budgetTime']},{key:'rotation',title:'Handle rotation',metrics:['torque','turns','rpm','omega']}];
  const expectedLabels={inputPower:'Average input power',usefulPower:'Average useful power',lossPower:'Average power lost',handSpeed:'Average hand-path speed',loadSpeed:'Average load movement rate',budgetTime:'Time at full input-power budget',torque:'Applied handle torque',turns:'Handle turns',rpm:'Average handle RPM',omega:'Average angular speed'};
  const metricUnits={inputPower:'W',usefulPower:'W',lossPower:'W',handSpeed:'m/s',loadSpeed:'m/s',budgetTime:'s',torque:'N·m',turns:'turns',rpm:'rpm',omega:'rad/s'};
  function checkpoint(label){fs.writeFileSync(path.join(OUT,'checkpoint.json'),JSON.stringify({label,checks:checks.length,routes,shots,errors},null,2)+'\n');console.log('results checkpoint',label,checks.length,'checks');}
  function luminance(color){const a=color?.match(/[\d.]+/g)?.slice(0,3).map(Number);return a?.length===3?a.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0):NaN;}
  function contrast(a,b){a=luminance(a);b=luminance(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
  async function inspectResults(fixture,label,stacked=false,large=false){
    const kind=fixture.kind;
    const view=await comparison(kind).evaluate(el=>{
      const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
      const styles=n=>{const s=getComputedStyle(n);let p=n,bg;while(p){const v=getComputedStyle(p).backgroundColor,a=v.match(/[\d.]+/g)?.map(Number);if(a&&(a.length===3||a[3]>=.99)){bg=v;break;}p=p.parentElement;}return{font:parseFloat(s.fontSize),weight:s.fontWeight,color:s.color,background:bg,border:s.borderStyle,variant:s.fontVariantNumeric};};
      const chart=el.querySelector('[data-ml-power-pace-chart]'),region=Array.from(el.children).filter(n=>n!==chart&&(n.compareDocumentPosition(chart)&Node.DOCUMENT_POSITION_FOLLOWING));
      return{rect:rect(el),page:document.documentElement.scrollWidth<=innerWidth+1,summary:el.querySelector(':scope > summary').textContent,live:!!el.closest('[aria-live],[role=status]'),panel:el.scrollWidth<=el.clientWidth+1,groupKeys:Array.from(el.querySelectorAll('[data-ml-power-metric-group]')).map(n=>n.dataset.mlPowerMetricGroup),groups:Array.from(el.querySelectorAll('[data-ml-power-metric-group]')).map(n=>{const title=document.getElementById(n.getAttribute('aria-labelledby')),grid=n.querySelector('dl');return{key:n.dataset.mlPowerMetricGroup,tag:n.tagName,heading:title?.textContent,headingTag:title?.tagName,headingStyle:title&&styles(title),labelled:!!title&&n.contains(title),rect:rect(n),gridTag:grid?.tagName,gridClass:grid?.className,grid:rect(grid),metrics:Array.from(n.querySelectorAll('[data-ml-power-metric]')).map(m=>{const dt=m.querySelector('dt'),dd=m.querySelector('dd');return{key:m.dataset.mlPowerMetric,value:Number(m.dataset.value),label:dt?.textContent,text:dd?.textContent,dtCount:m.querySelectorAll('dt').length,ddCount:m.querySelectorAll('dd').length,labelStyle:styles(dt),valueStyle:styles(dd),rect:rect(m),border:getComputedStyle(m).borderStyle,overflow:m.scrollWidth>m.clientWidth+1};})};}),clipped:region.flatMap(n=>[n,...n.querySelectorAll('h3,h4,h5,p,dt,dd,button,summary')]).filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+1).map(n=>n.textContent),fit:el.querySelector('[data-ml-power-fit]')?.textContent,fitValue:el.querySelector('[data-ml-power-fit]')?.getAttribute('data-ml-power-fit'),forced:matchMedia('(forced-colors:active)').matches};
    });
    const groups=expectedGroups.slice(0,fixture.radius?3:2),metrics=view.groups.flatMap(g=>g.metrics),expected=physical(fixture).expected;
    check(view.summary==='Explore power, motion and pace'&&!view.live,label+': existing optional disclosure title remains outside live regions');
    check(view.groupKeys.join(',')===groups.map(g=>g.key).join(','),label+': applicable result groups follow power, motion, then optional rotation');
    check(view.page&&view.panel&&!view.clipped.length&&metrics.every(m=>!m.overflow&&m.rect.x>=view.rect.x&&m.rect.right<=view.rect.right+1),label+': result cards and text fit without horizontal clipping');
    check(metrics.map(m=>m.key).join(',')===groups.flatMap(g=>g.metrics).join(','),label+': metric DOM order is preserved');
    for(let i=0;i<groups.length;i++){
      const actual=view.groups[i],wanted=groups[i];if(!actual)continue;
      check(actual.tag==='SECTION'&&actual.labelled&&actual.heading===wanted.title&&/^H[3-5]$/.test(actual.headingTag),label+': '+wanted.key+' is a named section with its visible heading');
      check(actual.gridTag==='DL'&&actual.gridClass.split(/\s+/).includes('ml-power-metric-grid')&&actual.metrics.every(m=>m.dtCount===1&&m.ddCount===1),label+': '+wanted.key+' retains native term/value semantics');
      check(actual.metrics.map(m=>m.key).join(',')===wanted.metrics.join(','),label+': '+wanted.key+' has only its intended metrics');
      check(!i||actual.rect.y>=view.groups[i-1].rect.bottom-1,label+': '+wanted.key+' follows the previous section geometrically');
      check(contrast(actual.headingStyle.color,actual.headingStyle.background)>=4.5,label+': '+wanted.key+' heading text contrast is at least4.5to1');
      for(const metric of actual.metrics){
        check(near(metric.value,expected[metric.key]),label+': '+metric.key+' retains its independently calculated value');
        check(metric.label===(kind==='ramp'&&metric.key==='loadSpeed'?'Average vertical rise rate':expectedLabels[metric.key])&&metric.text.endsWith(' '+metricUnits[metric.key]),label+': '+metric.key+' retains its label and unit');
        check(metric.valueStyle.font>=22&&metric.valueStyle.variant.includes('tabular-nums')&&metric.border!=='none',label+': '+metric.key+' has readable tabular values and a visible boundary');
        check(contrast(metric.labelStyle.color,metric.labelStyle.background)>=4.5&&contrast(metric.valueStyle.color,metric.valueStyle.background)>=4.5,label+': '+metric.key+' label and value contrast are at least4.5to1');
      }
      if(stacked)check(actual.metrics.every((m,j)=>Math.abs(m.rect.width-actual.grid.width)<2&&(!j||m.rect.y>=actual.metrics[j-1].rect.bottom-1)),label+': '+wanted.key+' cards stack in reading order');
      else if(wanted.key==='power')check(Math.abs(actual.metrics[0].rect.width-actual.grid.width)<2&&Math.abs(actual.metrics[1].rect.y-actual.metrics[2].rect.y)<1&&actual.metrics[1].rect.y>=actual.metrics[0].rect.bottom-1,label+': input power spans its group above useful and lost power');
      else if(wanted.key==='motion')check(Math.abs(actual.metrics[2].rect.width-actual.grid.width)<2&&Math.abs(actual.metrics[0].rect.y-actual.metrics[1].rect.y)<1&&actual.metrics[2].rect.y>=actual.metrics[0].rect.bottom-1,label+': full-budget time spans its group after movement rates');
      else check(Math.abs(actual.metrics[0].rect.y-actual.metrics[1].rect.y)<1&&Math.abs(actual.metrics[2].rect.y-actual.metrics[3].rect.y)<1&&actual.metrics[2].rect.y>=actual.metrics[0].rect.bottom-1,label+': rotation cards retain a two-column reading order');
    }
    check(view.fit?.includes('mechanical input power')&&view.fit.includes('peak force, strength or acceleration')&&view.fitValue===String(expected.inputPower<=100),label+': fit interpretation and model limits stay next to the results');
    observations.push({label,largeText:large,view});
  }
  async function navigation(kind,label){
    const target=comparison(kind),summary=target.locator(':scope > summary'),back=target.locator('[data-ml-power-return-calculation]'),before=JSON.stringify(await state());
    await summary.focus();await pg.keyboard.press('Tab');
    const focus=await back.evaluate(el=>{const s=getComputedStyle(el);let p=el,bg;while(p){const v=getComputedStyle(p).backgroundColor,a=v.match(/[\d.]+/g)?.map(Number);if(a&&(a.length===3||a[3]>=.99)){bg=v;break;}p=p.parentElement;}return{active:el===document.activeElement,visible:el.matches(':focus-visible'),width:parseFloat(s.outlineWidth),style:s.outlineStyle,color:s.outlineColor,background:bg};});
    check(focus.active&&focus.visible&&focus.width>=3&&focus.style!=='none'&&contrast(focus.color,focus.background)>=3,label+': Tab reaches Back to calculation with a visible3px focus ring');
    await pg.keyboard.press('Enter');await settle();
    check(await input(kind,'answer').evaluate(el=>el===document.activeElement&&el.isConnected),label+': Back to calculation returns keyboard focus to the answer');
    check(JSON.stringify(await state())===before,label+': disclosure navigation preserves the calculation draft and saved records');
    observations.push({label:label+' keyboard',focus});
  }
  async function captureResults(name,kind,isBaseline=false){
    await pg.evaluate(()=>document.fonts.ready);await comparison(kind).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await settle();
    const clip=await comparison(kind).evaluate(el=>{const first=el.querySelector(':scope > summary').getBoundingClientRect(),chart=el.querySelector('[data-ml-power-pace-chart]'),last=chart.previousElementSibling.getBoundingClientRect(),r=el.getBoundingClientRect();return{x:Math.max(0,r.x+scrollX-3),y:Math.max(0,first.y+scrollY-3),width:Math.min(innerWidth,r.width+6),height:Math.ceil(last.bottom-first.y+9)};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip,animations:'disabled',caret:'hide'});shots.push({name,file:name+'.png',sha256:sha(fs.readFileSync(path.join(OUT,name+'.png'))),clip,baseline:isBaseline});checkpoint(name);
  }
  try{
    await pg.addScriptTag({content:baseline});await mount('lever');await open(lab('lever'));await open(comparison('lever'));await captureResults('desktop-before-results','lever',true);
    for(const fixture of fixtures){
      const kind=fixture.kind;await mount(kind);const before=JSON.stringify(await state());await open(lab(kind));await open(comparison(kind));await inspectResults(fixture,kind+' desktop');await navigation(kind,kind+' desktop');
      check(JSON.stringify(await state())===before,kind+': exploring results leaves original station state unchanged');
      if(kind==='lever')await captureResults('desktop-results',kind);if(kind==='windlass')await captureResults('desktop-rotary-results',kind);
      await input(kind,'duration').fill('0.5');await input(kind,'timeUnit').selectOption('min');await model(fixture,80,30);
      check(await recordsPreserved(),kind+': updated rate calculations preserve unrelated saved records');routes.push(kind);checkpoint(kind+' complete');
    }
    await mount('ramp',320,{dark:true});await open(lab('ramp'));await open(comparison('ramp'));await inspectResults(fixtures[3],'Dark320phone',true);await navigation('ramp','Dark320phone');await captureResults('dark-phone-results','ramp');
    await mount('screw',320,{contrast:true});await open(lab('screw'));await open(comparison('screw'));await inspectResults(fixtures[5],'Forcedcolors320phone',true);await navigation('screw','Forcedcolors320phone');await captureResults('forced-colors-phone-results','screw');
    await mount('lever',320);await open(lab('lever'));await open(comparison('lever'));
    // Double computed text sizes only in the reviewed region; this is text enlargement, not browser zoom.
    await comparison('lever').evaluate(el=>{const chart=el.querySelector('[data-ml-power-pace-chart]'),nodes=Array.from(el.querySelectorAll('summary,button,h3,h4,h5,dt,dd,p')).filter(n=>n.compareDocumentPosition(chart)&Node.DOCUMENT_POSITION_FOLLOWING),sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.setProperty('font-size',sizes[i]*2+'px','important'));});
    await settle();await inspectResults(fixtures[0],'200percenttext320phone',true,true);await navigation('lever','200percenttext320phone');await captureResults('large-text-phone-results','lever');
    check(routes.length===6&&new Set(routes).size===6,'All six station result routes exercised');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),sourceSha256:sha(tool),baselineSha256:sha(baseline),dependencies,scenarios:mountedScenarios,checks,shots,routes,observations,errors},null,2)+'\n');console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,routes:routes.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1600))},null,2));if(errors.length)process.exitCode=1;await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
