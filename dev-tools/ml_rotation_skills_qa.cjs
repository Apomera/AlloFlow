// Native React/THREE verification for rotary calculation skills and visual guide.
const fs=require('fs'),path=require('path'),vm=require('vm');
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-rotation-skills-2026-10-12/browser/run-01');
bootstrap+=String.raw`
  const observations=[],rotaryKinds=['turns','angularTravel','omega','rotationalWork','rotationalPower'];
  const rotaryUnits={turns:'turns',angularTravel:'rad',omega:'rad/s',rotationalWork:'J',rotationalPower:'W'};
  const guide=kind=>lab(kind).locator('[data-ml-power-rotation]');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  function rotary(fixture,percent=80,seconds=5,movement=.5){
    const handPerTurn=2*Math.PI*fixture.radius,advance=handPerTurn/fixture.ma,turns=movement/advance;
    const torque=fixture.load/(fixture.ma*percent/100)*fixture.radius,angularTravel=turns*2*Math.PI,omega=angularTravel/seconds;
    return{handPerTurn,advance,turns,angularTravel,omega,torque,rotationalWork:torque*angularTravel,rotationalPower:torque*omega};
  }
  async function panels(kind){await open(lab(kind));if(await guide(kind).evaluate(el=>el.tagName==='DETAILS'))await open(guide(kind));await settle();}
  async function inspect(fixture,percent=80,seconds=5,movement=.5){
    await settle();const kind=fixture.kind,p=rotary(fixture,percent,seconds,movement),target=guide(kind);
    check(await target.count()===1,kind+': one rotary guide is available');
    check(await target.locator('figure').evaluate(el=>el.querySelector('figcaption')?.id===el.getAttribute('aria-labelledby')&&!!el.querySelector('figcaption')?.textContent.trim()),kind+': rotary figure is named by its visible caption');
    check(await target.locator('[data-ml-rotation-reference]').evaluate(el=>el.getAttribute('aria-hidden')==='true'&&el.getAttribute('focusable')==='false'&&!el.querySelector('animate,animateTransform')),kind+': one-turn reference is static and avoids redundant screen-reader focus');
    const metrics=await target.locator('[data-ml-power-rotation-metric]').evaluateAll(els=>els.map(el=>({key:el.getAttribute('data-ml-power-rotation-metric'),value:Number(el.dataset.value),text:el.textContent,semantic:!!el.querySelector('dt')&&!!el.querySelector('dd')})));
    check(metrics.length===8&&new Set(metrics.map(m=>m.key)).size===8,kind+': all eight rotary quantities appear once');
    for(const metric of metrics)check(near(metric.value,p[metric.key])&&metric.semantic,kind+': '+metric.key+' agrees with independent rotary math and uses a term/definition pair');
    const bars=await target.locator('[data-ml-rotation-bar]').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),t=el.parentElement.getBoundingClientRect(),s=getComputedStyle(el),ts=getComputedStyle(el.parentElement);return{key:el.getAttribute('data-ml-rotation-bar'),width:parseFloat(el.style.width),pixels:r.width,x:r.x,trackX:t.x,trackPixels:t.width,borderLeft:parseFloat(ts.borderLeftWidth),borderRight:parseFloat(ts.borderRightWidth),hidden:el.closest('[aria-hidden]')?.getAttribute('aria-hidden'),image:s.backgroundImage,background:s.backgroundColor};}));
    check(bars.length===2&&bars.map(b=>b.key).sort().join(',')==='hand,load',kind+': per-turn graphic compares hand and load movement');
    const scale=Math.max(p.handPerTurn,p.advance);
    for(const bar of bars){const value=bar.key==='hand'?p.handPerTurn:p.advance,content=bar.trackPixels-bar.borderLeft-bar.borderRight;
      check(Math.abs(bar.width-value/scale*100)<.0001,kind+': '+bar.key+' uses a common scale without minimum inflation');
      check(Math.abs(bar.pixels-content*bar.width/100)<.1&&Math.abs(bar.x-bar.trackX-bar.borderLeft)<.1,kind+': '+bar.key+' rendered bar starts at zero and is proportional');
      check(bar.hidden==='true',kind+': '+bar.key+' decorative bar avoids duplicate screen-reader output');
    }
    check(bars.every(b=>Math.abs(b.trackX-bars[0].trackX)<.1&&Math.abs(b.trackPixels-bars[0].trackPixels)<.1),kind+': per-turn tracks have equal origins and scales');
    check(near(p.rotationalWork,fixture.load*movement/(percent/100))&&near(p.rotationalPower,p.rotationalWork/seconds),kind+': torque-angle work and torque-rate power balance linear input energy');
    observations.push({kind,percent,seconds,movement,expected:p,metrics,bars});return p;
  }
  async function layout(kind,label){
    const overflow=await lab(kind).evaluate(el=>({page:document.documentElement.scrollWidth>innerWidth+1,panel:el.scrollWidth>el.clientWidth+1,children:Array.from(el.querySelectorAll('input,select,button,figure,figcaption,dt,dd,[data-ml-power-question-title],[data-ml-power-result]')).filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+1).map(n=>({tag:n.tagName,id:n.id,text:n.textContent,width:n.clientWidth,scroll:n.scrollWidth}))}));
    check(!overflow.page&&!overflow.panel&&!overflow.children.length,label+': guide, values and practice controls fit without clipping');if(overflow.page||overflow.panel||overflow.children.length)observations.push({label,overflow});
  }
  async function shot(name,kind,selector){await layout(kind,name);const target=lab(kind).locator(selector);await target.scrollIntoViewIfNeeded();await settle();await target.screenshot({path:path.join(OUT,name+'.png')});shots.push(name);}
  async function keyboard(kind,label){
    const controls=lab(kind).locator('input:visible,select:visible,button:visible:not(:disabled),summary:visible');let focused=true,outlined=true,labelled=true;
    for(let i=0;i<await controls.count();i++){const control=controls.nth(i);await control.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');const v=await control.evaluate(el=>{const s=getComputedStyle(el);return{focus:el===document.activeElement,outline:el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0,label:el.matches('summary,button')?!!el.textContent.trim():!!el.labels?.length||!!el.getAttribute('aria-label')};});focused=focused&&v.focus;outlined=outlined&&v.outline;labelled=labelled&&v.label;}
    check(focused&&outlined&&labelled,label+': visible controls have labels and visible keyboard focus');
  }
  try{
    for(const fixture of fixtures.filter(f=>f.radius)){const kind=fixture.kind;await mount(kind);const before=await state();await open(lab(kind));check(!await guide(kind).evaluate(el=>el.open),kind+': rotary guide starts closed');await panels(kind);check(await sameExcept(before),kind+': opening rotary guide changes no state');const p=await inspect(fixture);
      const choices=await input(kind,'question').locator('option').evaluateAll(els=>els.map(el=>el.value));check(choices.length===17&&choices.slice(-5).join(',')===rotaryKinds.join(','),kind+': five rotary skills append after the previous twelve');
      await input(kind,'question').selectOption('torque');await solve(kind,p.torque,'N·m');await result(kind,'correct');await press(action(kind,'save'));
      await input(kind,'question').selectOption('budgetEnergy');await solve(kind,500,'J');await result(kind,'correct');await press(action(kind,'save'));
      const legacyRecords=(await state()).benchPowerRecords[kind],legacySnapshot=JSON.stringify([legacyRecords.torque,legacyRecords.budgetEnergy]);
      check(legacyRecords.torque.version===1&&legacyRecords.budgetEnergy.version===2,kind+': prior torque and budget calculations retain their original record versions');
      for(const skill of rotaryKinds){await input(kind,'question').selectOption(skill);await resetPractice(kind);await solve(kind,p[skill],rotaryUnits[skill]==='W'?'J':'W');await result(kind,'unit');check(await action(kind,'save').isDisabled(),kind+': '+skill+' rejects a wrong unit before saving');
        await solve(kind,Number(p[skill].toPrecision(4)),rotaryUnits[skill]);await result(kind,'correct');await press(action(kind,'save'));const record=(await state()).benchPowerRecords[kind][skill];
        check(record.version===3&&record.completion==='checked'&&record.unit===rotaryUnits[skill],kind+': '+skill+' saves an independent version-3 checked record');
      }
      const records=(await state()).benchPowerRecords[kind];check(Object.keys(records).length===7&&JSON.stringify([records.torque,records.budgetEnergy])===legacySnapshot,kind+': five rotary skill records coexist with fixed version-1 and version-2 calculations');check(await sameExcept(before,['benchPower','benchPowerRecords'])&&await recordsPreserved(),kind+': practice preserves machine geometry and unrelated saved evidence');
      if(kind==='windlass'){await keyboard(kind,'Desktop rotary guide');await shot('desktop-windlass-rotation',kind,'[data-ml-power-rotation]');}
      const fixed=JSON.stringify((await state()).benchPowerRecords);await input(kind,'duration').fill('.5');await input(kind,'timeUnit').selectOption('min');await resetPractice(kind);await inspect(fixture,80,30);await input(kind,'percent').fill('100');await inspect(fixture,100,30);
      check(JSON.stringify((await state()).benchPowerRecords)===fixed,kind+': time conversion and efficiency changes preserve saved snapshots');
    }
    const screw=fixtures.find(f=>f.kind==='screw');await mount('screw',320,{dark:true});await panels('screw');const p=await inspect(screw);
    await input('screw','question').selectOption('angularTravel');await solve('screw',p.angularTravel*180/Math.PI,'rad');await result('screw','incorrect');
    check((await action('screw','result').textContent()).toLowerCase().includes('rad'),'Angular-travel feedback identifies radians after entering a degree count');
    await press(action('screw','hint'));await press(action('screw','hint'));check(await action('screw','hint-level').getAttribute('data-ml-power-hint-level')==='2','Two rotary hints show formula and setup');
    await input('screw','answer').fill(String(p.angularTravel));await input('screw','answer').focus();await pg.keyboard.press('Enter');await result('screw','correct');await press(action('screw','save'));
    check((await state()).benchPowerRecords.screw.angularTravel.hint===2,'Saved angular practice retains hint use');
    await shot('dark-phone-screw-rotation','screw','[data-ml-power-rotation]');await shot('dark-phone-rotation-practice','screw','[data-ml-power-practice]');await keyboard('screw','Phone rotary practice');
    await input('screw','question').selectOption('omega');await solve('screw',p.omega,'rpm');await result('screw','unit');await solve('screw',p.omega,'rad/s');await result('screw','correct');
    await input('screw','question').selectOption('rotationalWork');await press(action('screw','reveal'));await result('screw','solution');await solve('screw',p.rotationalWork,'J');await result('screw','solution');await press(action('screw','save'));
    check((await state()).benchPowerRecords.screw.rotationalWork.completion==='solution','Viewed rotary solution keeps its provenance after checking');
    await input('screw','question').selectOption('rotationalPower');await press(action('screw','next'));await resetPractice('screw');check(await input('screw','question').inputValue()==='inputPower','Next skill wraps from rotational power to input power');
    for(const skill of rotaryKinds){await input('screw','question').selectOption(skill);await layout('screw','Phone '+skill);}
    const snapshot=JSON.stringify((await state()).benchPowerRecords.screw);await input('screw','duration').fill('');check(await guide('screw').count()===0&&await action('screw','check').count()===0,'Invalid duration removes stale rotary guide and grading');await input('screw','duration').fill('10');await panels('screw');await inspect(screw,80,10);check(JSON.stringify((await state()).benchPowerRecords.screw)===snapshot,'Invalid and repaired assumptions do not change saved rotary records');
    await open(lab('screw').locator('[data-ml-power-saved=screw]'));await lab('screw').getByRole('button',{name:'Open work record',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const textRecords=await pg.locator('[data-ml-power-record-station=screw]').allTextContents();check(textRecords.some(t=>t.includes('rad')&&t.includes('Hints opened: 2/2')),'Work record contains rotary answer and original hint provenance');
    const pending=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();const download=await pending;if(await download.failure())throw Error('Native text download failed');const exported=fs.readFileSync(await download.path(),'utf8');await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&textRecords.length===2&&textRecords.every(t=>exported.includes(t))&&exported.includes(savedNote),'Native downloaded text retains rotary records and unrelated design evidence');
    const windlass=fixtures.find(f=>f.kind==='windlass');await mount('windlass',320,{contrast:true});await panels('windlass');await inspect(windlass);
    const forcedBars=observations[observations.length-1].bars;check(forcedBars.every(b=>b.background!=='rgba(0, 0, 0, 0)')&&new Set(forcedBars.map(b=>b.image+'|'+b.background)).size===2,'Forced colors distinguishes hand and load movement by fill or pattern');
    await keyboard('windlass','Forced-colors rotary guide');await shot('forced-colors-windlass-rotation','windlass','[data-ml-power-rotation]');
    await mount('lever',320);await open(lab('lever'));check(await guide('lever').count()===0&&await input('lever','question').locator('option').count()===10,'Linear station retains ten skills without a rotary guide');check(await recordsPreserved(),'Linear-station rendering preserves saved evidence');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,observations,errors},null,2)+'\n');console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1400))},null,2));if(errors.length)process.exitCode=1;await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
