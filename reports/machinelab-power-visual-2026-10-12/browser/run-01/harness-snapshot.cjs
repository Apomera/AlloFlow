// Native React/THREE browser verification for station power pace and practice visuals.
// node dev-tools/ml_power_visual_qa.cjs [fresh-output-directory]
const fs=require('fs'),path=require('path'),vm=require('vm');
// Keep the established browser host, independent physical fixtures and UI helpers.
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-power-visual-2026-10-12/browser/run-01');
bootstrap+=String.raw`
  const observations=[];
  const chart=kind=>lab(kind).locator('[data-ml-power-pace-chart]');
  async function panels(kind){await open(lab(kind));await open(comparison(kind));}
  async function inspectPace(fixture,percent=80,seconds=5,budget=100,movement=.5){
    const kind=fixture.kind,target=chart(kind),expected=physical(fixture,percent,seconds,budget,movement).expected;
    const max=Math.max(2*expected.inputPower,budget);
    check(await target.count()===1,kind+': one power pace figure is present');
    check(await target.evaluate(el=>el.tagName==='FIGURE'&&!!el.querySelector('figcaption')&&
      el.getAttribute('aria-labelledby')===el.querySelector('figcaption').id&&!!el.querySelector('figcaption').textContent.trim()),kind+': native figure is named by its visible caption');
    const rows=await target.locator('[data-ml-power-pace-row]').evaluateAll(els=>els.map(el=>{
      const bar=el.querySelector('[data-ml-power-pace-bar]'),track=el.querySelector('[data-ml-power-pace-track]'),marker=el.querySelector('[data-ml-power-budget-marker]');
      const br=bar.getBoundingClientRect(),tr=track.getBoundingClientRect(),mr=marker.getBoundingClientRect(),ts=getComputedStyle(track),ms=getComputedStyle(marker),bs=getComputedStyle(bar);
      return{factor:Number(el.getAttribute('data-ml-power-pace-row')),seconds:Number(el.dataset.seconds),power:Number(el.dataset.inputPower),
        value:Number(bar.dataset.value),width:parseFloat(bar.style.width),left:parseFloat(marker.style.left),text:el.textContent,
        trackAriaHidden:track.getAttribute('aria-hidden'),barCount:el.querySelectorAll('[data-ml-power-pace-bar]').length,markerCount:el.querySelectorAll('[data-ml-power-budget-marker]').length,
        pixels:{bar:br.width,track:tr.width,trackX:tr.left,markerX:mr.left,content:tr.width-parseFloat(ts.borderLeftWidth)-parseFloat(ts.borderRightWidth),marker:mr.width,markerLeft:mr.left-tr.left,markerRight:mr.right-tr.right},
        style:{trackBorder:ts.borderStyle,trackOutline:ts.outlineStyle,trackBackground:ts.backgroundColor,markerBorder:ms.borderLeftStyle,markerWidth:ms.borderLeftWidth,barBackground:bs.backgroundColor,barBorder:bs.borderStyle,barOutline:bs.outlineStyle,barImage:bs.backgroundImage}};
    }));
    check(rows.length===3&&rows.map(r=>r.factor).join(',')==='0.5,1,2',kind+': pace graphic has half, requested and double duration in order');
    for(const row of rows){
      const value=expected.inputPower/row.factor;
      check(near(row.seconds,seconds*row.factor)&&near(row.power,value)&&near(row.value,value),kind+': '+row.factor+'x row preserves exact time and input power');
      check(near(row.width,value/max*100)&&near(row.left,budget/max*100),kind+': '+row.factor+'x bar and budget marker use the same zero-based scale');
      check(row.width>0&&row.width<=100&&row.left>0&&row.left<=100,kind+': '+row.factor+'x bar and marker percentages stay within the track');
      check(Math.abs(row.pixels.bar-row.pixels.content*row.width/100)<1.1,kind+': '+row.factor+'x rendered bar is proportional without a minimum-width distortion');
      check(row.barCount===1&&row.markerCount===1&&row.trackAriaHidden==='true',kind+': '+row.factor+'x decorative track has a single bar and budget marker');
      check(/W/.test(row.text)&&/s/.test(row.text)&&/\d/.test(row.text),kind+': '+row.factor+'x visual retains readable numeric watt and time labels');
    }
    check(rows.every(row=>near(row.left,rows[0].left)),kind+': all budget markers align at one shared power value');
    check(rows.every(row=>Math.abs(row.pixels.track-rows[0].pixels.track)<.1&&Math.abs(row.pixels.trackX-rows[0].pixels.trackX)<.1&&Math.abs(row.pixels.markerX-rows[0].pixels.markerX)<.1),kind+': actual track widths and marker positions align to the same pixels per watt');
    check(await lab(kind).locator('[data-ml-power-pace-factor]').count()===3,kind+': existing exact-value pace table still contains exactly three rows');
    observations.push({kind,percent,seconds,budget,movement,max,rows});return rows;
  }
  async function layout(kind,label){
    const failures=await lab(kind).evaluate(el=>{
      const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
      return{page:document.documentElement.scrollWidth>innerWidth+1,panel:el.scrollWidth>el.clientWidth+1,
        // The dashed marker can touch a track endpoint. Text, controls and containing figures determine reflow.
        children:Array.from(el.querySelectorAll('input,select,button,figure,figcaption,[data-ml-power-pace-row] > :not([data-ml-power-pace-track]),[data-ml-power-given],[data-ml-power-result]'))
          .filter(e=>visible(e)&&e.scrollWidth>e.clientWidth+1).map(e=>({tag:e.tagName,id:e.id,cls:e.className,width:e.clientWidth,scroll:e.scrollWidth}))};
    });
    check(!failures.page&&!failures.panel&&!failures.children.length,label+': figure, practice text and controls fit without horizontal overflow');
    if(failures.page||failures.panel||failures.children.length)observations.push({label,overflow:failures});
  }
  async function keyboard(kind,label){
    const controls=lab(kind).locator('input:visible,select:visible,button:visible:not(:disabled),summary:visible');
    let focused=true,outlined=true,labelled=true;
    for(let i=0;i<await controls.count();i++){
      const control=controls.nth(i);await control.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');
      const info=await control.evaluate(el=>{const s=getComputedStyle(el);return{focused:el===document.activeElement&&el.tabIndex>=0,
        outlined:el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0,
        labelled:el.matches('summary,button')?!!el.textContent.trim():!!el.labels?.length||!!el.getAttribute('aria-label')||!!el.getAttribute('aria-labelledby')};});
      focused=focused&&info.focused;outlined=outlined&&info.outlined;labelled=labelled&&info.labelled;
    }
    check(focused,label+': enabled visible controls retain keyboard focus');check(outlined,label+': keyboard focus remains visible');check(labelled,label+': visible controls retain accessible labels');
  }
  async function shot(name,kind,selector){
    const target=lab(kind).locator(selector);await target.first().scrollIntoViewIfNeeded();
    const box=await target.evaluateAll(els=>{const rs=els.map(el=>el.getBoundingClientRect()),left=Math.min(...rs.map(r=>r.left)),top=Math.min(...rs.map(r=>r.top)),right=Math.max(...rs.map(r=>r.right)),bottom=Math.max(...rs.map(r=>r.bottom));return{x:left+scrollX,y:top+scrollY,width:right-left,height:bottom-top};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:{x:Math.max(0,box.x-3),y:Math.max(0,box.y-3),width:box.width+6,height:box.height+6}});shots.push(name);
  }
  try{
    for(const fixture of fixtures){
      await mount(fixture.kind,1150);const before=await state();await panels(fixture.kind);
      check(await sameExcept(before),fixture.kind+': opening visual comparisons does not write draft or saved state');
      await model(fixture);await inspectPace(fixture);
      check(await lab(fixture.kind).locator('[data-ml-power-practice]').count()===1,fixture.kind+': calculation practice has its own visual panel');
      check(await input(fixture.kind,'question').locator('option').count()===(fixture.radius?8:6),fixture.kind+': existing linear or rotary skills remain available');
      if(fixture.kind==='lever'){await layout('lever','Desktop');await keyboard('lever','Desktop');await shot('desktop-power-pace','lever','[data-ml-power-pace-chart]');}
    }
    await mount('lever',390,{dark:true});await panels('lever');await layout('lever','Dark phone 390 px');
    await input('lever','duration').fill('2');await input('lever','percent').fill('50');await input('lever','budget').fill('150');
    await inspectPace(fixtures[0],50,2,150);await model(fixtures[0],50,2,150);
    await shot('dark-phone-power-pace','lever','[data-ml-power-pace-chart]');
    await input('lever','question').selectOption('inputPower');await solve('lever',200,'J');await result('lever','unit');
    check(await input('lever','unit').getAttribute('aria-invalid')==='true','Practice identifies a wrong unit and cannot save it');
    check(await action('lever','save').isDisabled(),'Wrong-unit practice keeps save disabled');
    await press(action('lever','hint'));await press(action('lever','hint'));
    check(await action('lever','hint-level').getAttribute('data-ml-power-hint-level')==='2'&&await action('lever','hint').isDisabled(),'Both hints remain readable and hint progression is bounded');
    await solve('lever',200);await result('lever','correct');
    check(await action('lever','result').evaluate(el=>el.parentElement.getAttribute('role')==='status'&&el.parentElement.getAttribute('aria-live')==='polite'),'Practice feedback retains its polite live region');
    await press(action('lever','save'));const saved=JSON.stringify((await state()).benchPowerRecords);
    check((await state()).benchPowerRecords.lever.inputPower.completion==='checked'&&(await state()).benchPowerRecords.lever.inputPower.hint===2,'Checked practice saves honest hint and completion provenance');
    await layout('lever','Dark phone checked practice');await shot('dark-phone-power-practice','lever','[data-ml-power-practice]');
    await press(action('lever','next'));await resetPractice('lever');
    check(await input('lever','question').inputValue()==='usefulPower','Next skill retains existing ordering');
    await input('lever','duration').fill('0.5');await input('lever','timeUnit').selectOption('min');await inspectPace(fixtures[0],50,30,150);
    await input('lever','percent').fill('100');await inspectPace(fixtures[0],100,30,150);
    check(JSON.stringify((await state()).benchPowerRecords)===saved&&await recordsPreserved(),'Live time, efficiency and budget edits preserve fixed power and earlier records');

    await mount('screw',320,{contrast:true});await panels('screw');const forced=await inspectPace(fixtures[5]);
    check(forced.every(r=>r.style.markerBorder==='dashed'&&parseFloat(r.style.markerWidth)>0&&(r.style.trackBorder!=='none'||r.style.trackOutline!=='none')&&r.style.barBackground!==r.style.trackBackground),'Forced colors retains dashed budget markers, track outlines and visible bar fills');
    await layout('screw','Forced colors 320 px');await keyboard('screw','Forced colors 320 px');
    await shot('forced-colors-power-pace','screw','[data-ml-power-pace-chart]');
    await input('screw','question').selectOption('torque');await press(action('screw','reveal'));await result('screw','solution');
    await solve('screw',physical(fixtures[5]).expected.torque,'N·m');await result('screw','solution');await press(action('screw','save'));
    check((await state()).benchPowerRecords.screw.torque.completion==='solution','Answer checking after reveal still records solution-viewed provenance');
    await layout('screw','Forced colors worked solution');

    await mount('lever',441);await panels('lever');
    await input('lever','budget').fill('100000');const endpoint=await inspectPace(fixtures[0],80,5,100000);
    check(endpoint.every(r=>r.left===100&&r.pixels.marker>0&&r.pixels.markerRight<=1.1&&r.pixels.markerLeft>=0),'A budget at the shared scale maximum leaves its full marker visible inside every track');
    check(endpoint.every(r=>r.width<1),'A large budget does not inflate tiny power bars to a minimum percent');
    await layout('lever','441 px large budget');await shot('phone-large-budget','lever','[data-ml-power-pace-chart]');
    await pg.setViewportSize({width:320,height:1100});await input('lever','duration').fill('.01');await input('lever','percent').fill('1');await input('lever','budget').fill('.01');
    const short=await inspectPace(fixtures[0],1,.01,.01);
    check(short[0].seconds===.005&&short[0].power===4000000,'Half-time comparison keeps .005 seconds and full derived power without clamping to input limits');
    await layout('lever','320 px shortest time and lowest budget');await shot('phone-low-budget-extreme','lever','[data-ml-power-pace-chart]');
    await pg.setViewportSize({width:390,height:1100});await input('lever','duration').fill('3600');await input('lever','percent').fill('100');await input('lever','budget').fill('100000');
    const long=await inspectPace(fixtures[0],100,3600,100000);
    check(long[2].seconds===7200,'Double-time comparison keeps 7200 seconds without clamping to the input duration limit');
    await layout('lever','390 px longest time and highest budget');
    for(const [field,valid] of [['budget','100000'],['duration','3600'],['percent','100']]){
      for(const invalid of ['','0','Infinity']){await input('lever',field).fill(invalid);check(await chart('lever').count()===0&&await comparison('lever').count()===0&&await action('lever','check').count()===0,'Invalid '+field+' '+JSON.stringify(invalid)+' removes stale graphics and practice');}
      await input('lever',field).fill(valid);await open(comparison('lever'));
    }
    await mount('lever',390,{}, {leverLoad:0});await open(lab('lever'));
    check(await chart('lever').count()===0&&await comparison('lever').count()===0,'Zero load hides the power figure along with invalid physical calculations');
    observations.push({scope:'Native Chromium at 320/390/441/1150 CSS pixels with reduced motion; forced-colors emulation, not a physical assistive technology session. No browser zoom was applied.'});
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,observations,errors},null,2)+'\n');
    console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1500))},null,2));if(errors.length)process.exitCode=1;await b.close();
  }
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
