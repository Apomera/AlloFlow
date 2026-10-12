// Native React/THREE verification for efficiency-aware continuous MA planning.
// node dev-tools/ml_efficiency_envelope_qa.cjs [fresh-output-directory]
const fs=require('fs'),path=require('path'),vm=require('vm');
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_efficiency_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-efficiency-lab-2026-10-10/browser','reports/machinelab-efficiency-envelope-2026-10-12/browser/run-01');
bootstrap+=String.raw`
  const observations=[],newKinds=['minMA','maxMA','forceEfficiency','taskEfficiency'];
  const allKinds=['input','force','loss','output','efficiency','actualMA','travel',...newKinds];
  const units={minMA:'×',maxMA:'×',forceEfficiency:'%',taskEfficiency:'%'};
  const planning=kind=>lab(kind).locator('[data-ml-efficiency-planning]');
  const chart=kind=>lab(kind).locator('[data-ml-efficiency-envelope]');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const cssNear=(a,b)=>Math.abs(a-b)<=Math.max(1e-7,Math.abs(b)*.00001);
  function expected(fixture,percent=80,force=100,travel=3,movement=.5){
    return {minMA:fixture.load/(percent/100*force),maxMA:travel/movement,
      forceEfficiency:100*fixture.load/(fixture.ma*force),taskEfficiency:100*fixture.load*movement/(force*travel)};
  }
  async function panels(kind){await open(lab(kind));await open(planning(kind));await settle();}
  async function envelope(fixture,percent=80,force=100,travel=3,movement=.5){
    await settle();const kind=fixture.kind,p=expected(fixture,percent,force,travel,movement),domain=Math.max(fixture.ma,p.minMA,p.maxMA)*1.1;
    const target=chart(kind),status=p.minMA>p.maxMA?'empty':p.minMA===p.maxMA?'point':'range';
    check(await target.count()===1,kind+': one interval figure appears for valid assumptions');
    check(await target.evaluate(el=>el.tagName==='FIGURE'&&el.querySelector('figcaption')?.id===el.getAttribute('aria-labelledby')&&!!el.querySelector('figcaption')?.textContent.trim()),kind+': interval figure has a visible accessible caption');
    check(near(Number(await target.getAttribute('data-domain-max')),domain),kind+': chart domain includes both limits and current MA');
    const metrics=await planning(kind).locator('[data-ml-efficiency-envelope-metric]').evaluateAll(els=>els.map(el=>({key:el.getAttribute('data-ml-efficiency-envelope-metric'),value:Number(el.dataset.value),text:el.querySelector('dd')?.textContent})));
    check(metrics.length===4&&new Set(metrics.map(x=>x.key)).size===4,kind+': four planning quantities appear exactly once');
    for(const metric of metrics){check(near(metric.value,p[metric.key]),kind+': '+metric.key+' agrees with independent limit calculation');check(metric.text===String(metric.value)+' '+units[metric.key],kind+': '+metric.key+' displays the unrounded value and correct unit');}
    check(await target.locator('[data-ml-efficiency-envelope-status]').getAttribute('data-ml-efficiency-envelope-status')===status,kind+': exact interval status is '+status);
    const graphic=await target.evaluate(el=>({tracks:Array.from(el.querySelectorAll('[data-ml-efficiency-envelope-track]')).map(track=>{const r=track.getBoundingClientRect(),s=getComputedStyle(track);return{key:track.getAttribute('data-ml-efficiency-envelope-track'),aria:track.getAttribute('aria-hidden'),x:r.x,width:r.width,border:parseFloat(s.borderLeftWidth)+parseFloat(s.borderRightWidth),outline:s.outlineStyle};}),bars:Array.from(el.querySelectorAll('[data-ml-efficiency-envelope-bar]')).map(bar=>{const r=bar.getBoundingClientRect(),s=getComputedStyle(bar);return{key:bar.getAttribute('data-ml-efficiency-envelope-bar'),start:Number(bar.dataset.start),end:Number(bar.dataset.end),left:parseFloat(bar.style.left),width:parseFloat(bar.style.width),x:r.x,pixels:r.width,background:s.backgroundColor,image:s.backgroundImage,pattern:bar.dataset.pattern};}),markers:Array.from(el.querySelectorAll('[data-ml-efficiency-envelope-marker]')).map(marker=>{const r=marker.getBoundingClientRect(),s=getComputedStyle(marker);return{key:marker.getAttribute('data-ml-efficiency-envelope-marker'),value:Number(marker.dataset.value),left:parseFloat(marker.style.left),x:r.x,border:s.borderLeftStyle,borderWidth:parseFloat(s.borderLeftWidth),color:s.borderLeftColor};}),points:Array.from(el.querySelectorAll('[data-ml-efficiency-envelope-point]')).map(point=>({left:parseFloat(point.style.left),width:point.getBoundingClientRect().width}))}));
    check(graphic.tracks.length===3&&graphic.tracks.map(t=>t.key).join(',')==='effort,travel,both',kind+': chart has effort, travel and shared rows');
    check(graphic.tracks.every(t=>t.aria==='true'&&t.outline!=='none'),kind+': decorated tracks are outlined and hidden from repeated screen-reader output');
    check(graphic.tracks.every(t=>Math.abs(t.x-graphic.tracks[0].x)<.1&&Math.abs(t.width-graphic.tracks[0].width)<.1),kind+': all chart rows share an origin and linear scale');
    check(graphic.bars.length===(status==='empty'?2:3),kind+': shared bar exists only for a nonempty exact interval');
    for(const bar of graphic.bars){const t=graphic.tracks.find(t=>t.key===bar.key),start=bar.key==='travel'?0:p.minMA,end=bar.key==='effort'?domain:p.maxMA;
      check(near(bar.start,start)&&near(bar.end,end),kind+': '+bar.key+' retains exact endpoints');
      check(cssNear(bar.left,start/domain*100)&&cssNear(bar.width,(end-start)/domain*100),kind+': '+bar.key+' position and width use the shared scale without inflated minimums');
      check(Math.abs(bar.x-(t.x+(t.width-t.border)*bar.left/100))<.1&&Math.abs(bar.pixels-(t.width-t.border)*bar.width/100)<.1,kind+': '+bar.key+' rendered geometry matches its exact interval');
    }
    check(graphic.markers.length===3&&graphic.markers.every(m=>m.key==='currentMA'&&near(m.value,fixture.ma)&&cssNear(m.left,fixture.ma/domain*100)),kind+': current MA is marked consistently in all three rows');
    check(graphic.markers.every((m,i)=>Math.abs(m.x-(graphic.tracks[i].x+graphic.tracks[i].width*m.left/100))<.1&&m.border==='dashed'&&m.borderWidth>0),kind+': current marker is positioned exactly and distinguished by dashed stroke');
    check(graphic.points.length===(status==='point'?1:0),kind+': a single feasible value has its own point marker');
    if(status==='point')check(cssNear(graphic.points[0].left,p.minMA/domain*100)&&graphic.bars.find(b=>b.key==='both').pixels===0,kind+': equality remains a zero-width interval with a separate visible point');
    observations.push({kind,percent,force,travel,movement,currentMA:fixture.ma,expected:p,status,domain,graphic});return{p,status,graphic};
  }
  async function layout(kind,label){
    await settle();const overflow=await lab(kind).evaluate(el=>{const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';return{page:document.documentElement.scrollWidth>innerWidth+1,panel:el.scrollWidth>el.clientWidth+1,children:Array.from(el.querySelectorAll('input,select,button,figure,figcaption,[data-ml-efficiency-envelope-metric],[data-ml-efficiency-question-title],[data-ml-efficiency-given],[data-ml-efficiency-result]')).filter(e=>visible(e)&&e.scrollWidth>e.clientWidth+1).map(e=>({tag:e.tagName,id:e.id,text:e.textContent,width:e.clientWidth,scroll:e.scrollWidth}))};});
    check(!overflow.page&&!overflow.panel&&!overflow.children.length,label+': chart, full question text and controls fit without horizontal overflow');
    if(overflow.page||overflow.panel||overflow.children.length)observations.push({label,overflow});
  }
  async function keyboard(kind,label){
    const controls=lab(kind).locator('input:visible,select:visible,button:visible:not(:disabled),summary:visible');let focused=true,outlined=true,labelled=true;
    for(let i=0;i<await controls.count();i++){const control=controls.nth(i);await control.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');const info=await control.evaluate(el=>{const s=getComputedStyle(el);return{focused:el===document.activeElement&&el.tabIndex>=0,outlined:el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0,labelled:el.matches('summary,button')?!!el.textContent.trim():!!el.labels?.length||!!el.getAttribute('aria-label')||!!el.getAttribute('aria-labelledby')};});focused=focused&&info.focused;outlined=outlined&&info.outlined;labelled=labelled&&info.labelled;}
    check(focused,label+': enabled controls retain keyboard focus');check(outlined,label+': keyboard focus is visible');check(labelled,label+': controls have accessible labels');
  }
  async function shot(name,kind,selector){
    const target=lab(kind).locator(selector);await target.first().scrollIntoViewIfNeeded();await settle();
    const box=await target.evaluateAll(els=>{const rs=els.map(el=>el.getBoundingClientRect()),left=Math.min(...rs.map(r=>r.left)),top=Math.min(...rs.map(r=>r.top)),right=Math.max(...rs.map(r=>r.right)),bottom=Math.max(...rs.map(r=>r.bottom));return{x:left+scrollX,y:top+scrollY,width:right-left,height:bottom-top};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:{x:Math.max(0,box.x-3),y:Math.max(0,box.y-3),width:box.width+6,height:box.height+6}});shots.push(name);
  }
  async function choicesFit(kind){
    await pg.setViewportSize({width:320,height:1100});
    for(const key of ['question','unit']){const values=await input(kind,key).locator('option').evaluateAll(els=>els.map(el=>el.value));for(const value of values){await input(kind,key).selectOption(value);await settle();const info=await input(kind,key).evaluate(el=>({value:el.value,label:el.selectedOptions[0].textContent,width:el.clientWidth,scroll:el.scrollWidth}));check(info.scroll<=info.width+1,kind+': '+key+' '+JSON.stringify(value)+' selected label fits at 320 px');if(key==='question')check(await action(kind,'question-title').evaluate(el=>!!el.textContent.trim()&&el.scrollWidth<=el.clientWidth+1),kind+': '+value+' full question title wraps at 320 px');if(info.scroll>info.width+1)observations.push({kind,selectionOverflow:info});}}
    await layout(kind,kind+' at 320 px');
  }
  async function download(name){const pending=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();const file=await pending,failure=await file.failure();if(failure)throw Error('Native download failed: '+failure);const text=fs.readFileSync(await file.path(),'utf8');await file.saveAs(path.join(OUT,name));check(file.suggestedFilename()==='machine-lab-work-record.txt','Native export retains the expected work-record filename');return text;}
  try{
    for(const fixture of fixtures){const kind=fixture.kind;await mount(kind);const before=await state();await open(lab(kind));
      check(!await planning(kind).evaluate(el=>el.open),kind+': planning disclosure starts closed');await open(planning(kind));
      check(await sameExcept(before),kind+': opening optional planning changes no saved or draft state');
      const {p}=await envelope(fixture);
      check(await input(kind,'question').locator('option').evaluateAll(els=>els.map(el=>el.value).join(','))===allKinds.join(','),kind+': four planning skills append after the original seven skills');
      for(const skill of newKinds){await input(kind,'question').selectOption(skill);await resetPractice(kind);await solve(kind,p[skill],'J');await result(kind,'unit');
        check(await input(kind,'unit').getAttribute('aria-invalid')==='true'&&await action(kind,'save').isDisabled(),kind+': '+skill+' rejects joules and identifies the answer unit');
        await solve(kind,Number(p[skill].toPrecision(4)),units[skill]);await result(kind,'correct');await press(action(kind,'save'));const record=(await state()).benchEfficiencyRecords[kind];
        check(record.version===3&&record.question===skill&&record.completion==='checked'&&record.percent===80&&record.unit===units[skill],kind+': '+skill+' saves a version-3 checked calculation');
        check(record.limits.force===100&&record.limits.travel===3,kind+': '+skill+' snapshot includes the two design limits');
        check(await sameExcept(before,['benchEfficiency','benchEfficiencyRecords'])&&await recordsPreserved(),kind+': '+skill+' leaves geometry and separate design evidence unchanged');
      }
      if(kind==='lever'){await layout(kind,'Desktop envelope');await keyboard(kind,'Desktop envelope');await shot('desktop-efficiency-envelope',kind,'[data-ml-efficiency-planning]');}
      await choicesFit(kind);
    }
    await mount('lever',390,{dark:true});await panels('lever');await limits('lever',100,1);let r=await envelope(fixtures[0],80,100,1);
    check(r.p.forceEfficiency===200&&r.p.taskEfficiency===200,'Both unattainable efficiency thresholds remain at 200%');
    await input('lever','question').selectOption('taskEfficiency');await solve('lever',100,'%');await result('lever','incorrect');
    await press(action('lever','hint'));await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-efficiency-hint-level')==='2'&&await action('lever','hint').isDisabled(),'Planning hints show relationship then setup and stop at two');
    await input('lever','answer').fill('200');await input('lever','answer').focus();await pg.keyboard.press('Enter');await result('lever','correct');
    check(await action('lever','result').evaluate(el=>el.parentElement.getAttribute('role')==='status'&&el.parentElement.getAttribute('aria-live')==='polite'),'Planning feedback uses the polite live status region');
    await press(action('lever','save'));const saved=JSON.stringify((await state()).benchEfficiencyRecords.lever);
    check((await state()).benchEfficiencyRecords.lever.hint===2,'Saved planning work honestly preserves both opened hints');
    await layout('lever','Dark phone impossible interval');await keyboard('lever','Dark phone envelope');await shot('dark-phone-efficiency-envelope','lever','[data-ml-efficiency-planning]');await shot('dark-phone-envelope-practice','lever','[data-ml-efficiency-practice]');
    await press(action('lever','next'));await resetPractice('lever');check(await input('lever','question').inputValue()==='input','Next skill wraps the last planning skill to input work');
    await input('lever','question').selectOption('minMA');await press(action('lever','reveal'));await result('lever','solution');await solve('lever',5,'×');await result('lever','solution');await press(action('lever','save'));
    check((await state()).benchEfficiencyRecords.lever.completion==='solution','Checking after a worked solution retains solution-viewed provenance');const viewed=JSON.stringify((await state()).benchEfficiencyRecords.lever);
    await limits('lever',250,1);await resetPractice('lever');r=await envelope(fixtures[0],80,250,1);check(r.status==='point'&&r.p.minMA===2,'Equal bounds form one exact MA point');
    await limits('lever',250,1.000000000001);r=await envelope(fixtures[0],80,250,1.000000000001);check(r.status==='range'&&r.graphic.bars.find(x=>x.key==='both').width>0&&r.graphic.bars.find(x=>x.key==='both').width<.000001,'A barely open interval keeps a tiny positive exact width without inflation');
    await limits('lever',250,.999999999999);r=await envelope(fixtures[0],80,250,.999999999999);check(r.status==='empty','A barely negative interval is empty without numerical-tolerance expansion');
    await limits('lever',500,1);await envelope(fixtures[0],80,500,1);
    await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowRight');await resetPractice('lever');r=await envelope({...fixtures[0],ma:2.1},80,500,1);
    check(r.p.forceEfficiency<80&&2.1>r.p.maxMA,'A current MA above the travel ceiling stays outside even when effort efficiency is sufficient');
    await input('lever','percent').fill('100');await envelope({...fixtures[0],ma:2.1},100,500,1);
    await input('lever','percent').fill('1');await envelope({...fixtures[0],ma:2.1},1,500,1);
    await limits('lever',1,.1);r=await envelope({...fixtures[0],ma:2.1},1,1,.1);check(r.p.taskEfficiency===200000&&r.status==='empty','Small permitted limits retain the full 200000% threshold');
    await limits('lever',5000,300);r=await envelope({...fixtures[0],ma:2.1},1,5000,300);check(r.p.taskEfficiency<1,'A mathematically sub-one-percent threshold remains visible below the efficiency-control range');
    check(JSON.stringify((await state()).benchEfficiencyRecords.lever)===viewed&&viewed!==saved&&await recordsPreserved(),'Assumption, geometry and limit edits preserve saved calculation and separate records');
    await input('lever','question').selectOption('minMA');
    for(const field of ['force','travel']){const selector='#ml-design-'+field+'-lever',valid=field==='force'?'5000':'300';for(const bad of ['','0','Infinity']){await pg.locator(selector).fill(bad);check(await chart('lever').count()===0&&await action('lever','check').count()===0&&await input('lever','question').count()===1,'Invalid '+field+' '+JSON.stringify(bad)+' hides stale interval and planning grading but retains the skill selector');await input('lever','question').selectOption('input');check(await action('lever','check').count()===1,'Invalid '+field+' limits leave original input-work practice available');await input('lever','question').selectOption('minMA');}await pg.locator(selector).fill(valid);}
    await input('lever','percent').fill('');check(await chart('lever').count()===0&&await action('lever','check').count()===0,'Invalid efficiency hides stale planning calculations');
    check(JSON.stringify((await state()).benchEfficiencyRecords.lever)===viewed,'Invalid assumptions do not rewrite saved planning work');
    await mount('lever',320,{contrast:true},{benchDesignLimits:{lever:{force:'250',travel:'1'}}});await panels('lever');r=await envelope(fixtures[0],80,250,1);
    check(new Set(r.graphic.bars.map(b=>b.image+'|'+b.background)).size===3&&r.graphic.markers.every(m=>m.border==='dashed'&&m.color!=='rgba(0, 0, 0, 0)'),'Forced colors distinguishes solid, striped, crossed conditions and dashed current markers');
    await layout('lever','Forced-colors exact-point envelope');await keyboard('lever','Forced-colors envelope');await shot('forced-colors-efficiency-envelope','lever','[data-ml-efficiency-planning]');
    await input('lever','question').selectOption('forceEfficiency');await press(action('lever','reveal'));await result('lever','solution');await press(action('lever','save'));await layout('lever','Forced-colors planning solution');await shot('forced-colors-envelope-practice','lever','[data-ml-efficiency-practice]');
    const legacy={version:1,benchId:'lever',settings:lever,percent:80,question:'input',answer:'250',unit:'J',hint:1,completion:'checked'};
    await mount('lever',1150,{}, {benchEfficiencyRecords:{lever:legacy}});await panels('lever');await open(lab('lever').locator('[data-ml-efficiency-saved=lever]'));
    check(JSON.stringify((await state()).benchEfficiencyRecords.lever)===JSON.stringify(legacy)&&await lab('lever').locator('[data-ml-efficiency-saved=lever]').textContent().then(t=>t.includes('250 J')&&t.includes('Hints opened: 1/2')),'Valid version-1 saved work remains visible without automatic migration');
    await input('lever','question').selectOption('minMA');await solve('lever',5,'×');check(JSON.stringify((await state()).benchEfficiencyRecords.lever)===JSON.stringify(legacy),'Checking new planning work preserves the old record until explicit save');await press(action('lever','save'));
    const planningRecord=(await state()).benchEfficiencyRecords.lever;check(planningRecord.version===3&&planningRecord.limits.force===100&&planningRecord.limits.travel===3,'Explicit planning save replaces the latest record with a version-3 limits snapshot');
    await limits('lever',500,12);await input('lever','percent').fill('50');await pg.locator('#ml-leverLoad').focus();await pg.keyboard.press('ArrowRight');
    await lab('lever').getByRole('button',{name:'Open work record',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');const recordText=await pg.locator('[data-ml-efficiency-record-station=lever]').textContent();
    check(recordText.includes('80%')&&recordText.includes('100 N')&&recordText.includes('3 m')&&recordText.includes('5 ×')&&recordText.includes('Hints opened: 0/2'),'Work record retains original limits, efficiency and checked planning answer after live edits');
    const exported=await download('downloaded-record.txt');check(exported.includes(recordText)&&exported.includes(savedNote),'Native downloaded text retains the fixed version-3 planning calculation and separate design note');
    const v2={version:2,benchId:'lever',settings:lever,percent:80,question:'output',answer:'200',unit:'J',hint:0,completion:'checked'};
    await mount('lever',390,{}, {benchEfficiencyRecords:{lever:v2},benchDesignLimits:{lever:{force:'',travel:'0'}}});await open(lab('lever'));check(JSON.stringify((await state()).benchEfficiencyRecords.lever)===JSON.stringify(v2)&&await lab('lever').locator('[data-ml-efficiency-saved=lever]').count()===1,'Version-2 work remains valid even when live design limits are invalid');
    await mount('lever',390,{}, {benchEfficiencyRecords:{lever:planningRecord},benchDesignLimits:{lever:{force:'',travel:'0'}}});await open(lab('lever'));check(JSON.stringify((await state()).benchEfficiencyRecords.lever)===JSON.stringify(planningRecord)&&await lab('lever').locator('[data-ml-efficiency-saved=lever]').count()===1,'Reloaded version-3 work validates against saved limits rather than invalid live limits');
    await mount('ramp',390,{}, {rampLength:1,rampHeight:2});await open(lab('ramp'));check(await chart('ramp').count()===0&&await action('ramp','check').count()===0,'Invalid machine geometry cannot create an interval or new skill grading');
    observations.push({scope:'Native Chromium with software WebGL at 320/390/1150 CSS pixels. Forced-colors emulation and keyboard checks; no physical assistive technology or deployed host exercised.'});
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,observations,errors},null,2)+'\n');
    console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1500))},null,2));if(errors.length)process.exitCode=1;await b.close();
  }
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
