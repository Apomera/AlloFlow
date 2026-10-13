// Native React/THREE QA for force = mechanical power / speed and its visual guide.
const fs=require('fs'),path=require('path'),vm=require('vm');
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-force-speed-2026-10-13/browser/run-01');
bootstrap+=String.raw`
  const observations=[],forceSkills=['effortFromPower','loadFromPower'];
  const guide=kind=>lab(kind).locator('[data-ml-power-force-speed='+kind+']');
  const map=kind=>lab(kind).locator('[data-ml-power-skill-map='+kind+']');
  const skill=(kind,key)=>map(kind).locator('[data-ml-power-skill='+key+']');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  function quantities(fixture,percent=80,seconds=5,movement=.5){
    const inputForce=fixture.load/(fixture.ma*percent/100),handSpeed=movement*fixture.ma/seconds,loadSpeed=movement/seconds;
    return{inputForce,loadForce:fixture.load,handSpeed,loadSpeed,inputPower:inputForce*handSpeed,usefulPower:fixture.load*loadSpeed};
  }
  async function panels(kind){await open(lab(kind));await open(guide(kind));await settle();}
  async function inspect(fixture,percent=80,seconds=5,movement=.5){
    await settle();const kind=fixture.kind,p=quantities(fixture,percent,seconds,movement),target=guide(kind);
    check(await target.count()===1,kind+': force-speed guide is available');
    check(await target.locator('figure').evaluate(el=>el.querySelector('figcaption')?.id===el.getAttribute('aria-labelledby')&&!!el.querySelector('figcaption')?.textContent.trim()),kind+': visual guide is named by its visible caption');
    for(const [row,keys] of [['input',['inputForce','handSpeed','inputPower']],['output',['loadForce','loadSpeed','usefulPower']]]){
      const node=target.locator('[data-ml-power-motion-row='+row+']'),equation=await node.locator('[data-ml-power-motion-equation='+row+']').textContent(),values=(equation.match(/\d+(?:\.\d+)?/g)||[]).map(Number);
      check(await node.evaluate(el=>!!el.querySelector('h3')?.textContent.trim()&&el.querySelector('h3')?.id===el.getAttribute('aria-labelledby')),kind+': '+row+' row is named by its visible heading');
      check(values.length===3&&keys.every((key,i)=>Math.abs(values[i]-p[key])<=.000005*Math.max(1,Math.abs(p[key])))&&equation.includes(' N × ')&&equation.includes(' m/s = ')&&equation.endsWith(' W'),kind+': '+row+' readable equation pairs force, speed and power with their correct units');
    }
    const metrics=await target.locator('[data-ml-power-motion-metric]').evaluateAll(els=>els.map(el=>({key:el.getAttribute('data-ml-power-motion-metric'),value:Number(el.dataset.value),text:el.textContent,semantic:!!el.querySelector('dt')&&!!el.querySelector('dd')})));
    check(metrics.length===6&&new Set(metrics.map(m=>m.key)).size===6,kind+': all six force, speed and power quantities appear once');
    for(const metric of metrics)check(near(metric.value,p[metric.key])&&metric.semantic,kind+': '+metric.key+' agrees with independent math and uses a term/definition pair');
    const bars=await target.locator('[data-ml-power-motion-bar]').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),t=el.parentElement.getBoundingClientRect(),s=getComputedStyle(el),ts=getComputedStyle(el.parentElement);return{key:el.getAttribute('data-ml-power-motion-bar'),pattern:el.dataset.pattern,width:parseFloat(el.style.width),pixels:r.width,x:r.x,trackX:t.x,trackPixels:t.width,borderLeft:parseFloat(ts.borderLeftWidth)||0,borderRight:parseFloat(ts.borderRightWidth)||0,hidden:el.closest('[aria-hidden]')?.getAttribute('aria-hidden'),image:s.backgroundImage,background:s.backgroundColor};}));
    check(bars.length===6&&new Set(bars.map(b=>b.key)).size===6,kind+': six decorative bars accompany exact numerical readings');
    for(const pair of [['inputForce','loadForce'],['handSpeed','loadSpeed'],['inputPower','usefulPower']]){
      const scale=Math.max(p[pair[0]],p[pair[1]]),members=pair.map(key=>bars.find(b=>b.key===key));
      for(const bar of members){const content=bar.trackPixels-bar.borderLeft-bar.borderRight;
        check(Math.abs(bar.width-p[bar.key]/scale*100)<.0001,kind+': '+bar.key+' uses its same-unit common scale without minimum inflation');
        check(Math.abs(bar.pixels-content*bar.width/100)<.1&&Math.abs(bar.x-bar.trackX-bar.borderLeft)<.1,kind+': '+bar.key+' rendered bar starts at zero and is proportional');
        check(bar.hidden==='true',kind+': '+bar.key+' decorative bar avoids duplicate screen-reader output');
      }
      check(Math.abs(members[0].trackPixels-members[1].trackPixels)<.1&&Math.abs(members[0].trackX-members[1].trackX)<.1,kind+': '+pair.join('/')+' tracks have equal scale lengths and aligned zero origins');
      check(members[0].pattern==='solid'&&members[1].pattern==='striped',kind+': '+pair.join('/')+' patterns distinguish input from output without relying on color');
    }
    check(near(p.inputForce*p.handSpeed,p.inputPower)&&near(p.loadForce*p.loadSpeed,p.usefulPower),kind+': both force-times-speed products preserve mechanical power');
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
    for(const fixture of fixtures){const kind=fixture.kind;await mount(kind);const before=await state();await open(lab(kind));check(!await guide(kind).evaluate(el=>el.open),kind+': force-speed guide starts closed');await panels(kind);check(await sameExcept(before),kind+': opening force-speed guide changes no state');const p=await inspect(fixture);
      const choices=await input(kind,'question').locator('option').evaluateAll(els=>els.map(el=>el.value));check(choices.length===(fixture.radius?19:12)&&choices.slice(-2).join(',')===forceSkills.join(','),kind+': two inverse force skills append after all previous skills');
      await open(map(kind));const tileKinds=await map(kind).locator('[data-ml-power-skill]').evaluateAll(els=>els.map(el=>el.getAttribute('data-ml-power-skill')));check(tileKinds.length===choices.length&&new Set(tileKinds).size===choices.length&&choices.every(k=>tileKinds.includes(k)),kind+': map and selector include every skill once');
      await input(kind,'question').selectOption('inputPower');await solve(kind,p.inputPower,'W');await result(kind,'correct');await press(action(kind,'save'));
      await input(kind,'question').selectOption('budgetEnergy');await solve(kind,500,'J');await result(kind,'correct');await press(action(kind,'save'));
      if(fixture.radius){await input(kind,'question').selectOption('turns');await solve(kind,.5*fixture.ma/(2*Math.PI*fixture.radius),'turns');await result(kind,'correct');await press(action(kind,'save'));}
      const old=(await state()).benchPowerRecords[kind],legacySnapshot=JSON.stringify(old);check(old.inputPower.version===1&&old.budgetEnergy.version===2&&(!fixture.radius||old.turns.version===3),kind+': earlier skills retain version-1, version-2 and applicable version-3 records');
      for(const key of forceSkills){await skill(kind,key).focus();await pg.keyboard.press('Enter');await resetPractice(kind);check(await input(kind,'question').inputValue()===key&&await skill(kind,key).getAttribute('aria-pressed')==='true',kind+': keyboard skill tile selects '+key);
        const answer=key==='effortFromPower'?p.inputForce:p.loadForce;await solve(kind,answer,'W');await result(kind,'unit');check(await action(kind,'save').isDisabled(),kind+': '+key+' cannot save a force answer in watts');
        await solve(kind,answer*2,'N');await result(kind,'incorrect');await solve(kind,Number(answer.toPrecision(5)),'N');await result(kind,'correct');await press(action(kind,'save'));const record=(await state()).benchPowerRecords[kind][key];
        check(record.version===4&&record.completion==='checked'&&record.unit==='N',kind+': '+key+' saves a checked version-4 force record');check(await skill(kind,key).getAttribute('data-ml-power-skill-status')==='checked'&&await skill(kind,key).getAttribute('data-ml-power-skill-setup')==='current',kind+': '+key+' map reflects checked current-task provenance');
      }
      const records=(await state()).benchPowerRecords[kind];check(JSON.stringify(Object.fromEntries(Object.keys(old).map(k=>[k,records[k]])))===legacySnapshot&&Object.keys(records).length===Object.keys(old).length+2,kind+': version-4 force records coexist with unchanged earlier evidence');check(await sameExcept(before,['benchPower','benchPowerRecords'])&&await recordsPreserved(),kind+': force practice preserves physical settings and unrelated saved evidence');
      await press(action(kind,'next'));check(await input(kind,'question').inputValue()==='inputPower',kind+': Next wraps from the final force skill to input power');
      if(kind==='windlass'){await keyboard(kind,'Desktop force-speed guide');await shot('desktop-windlass-force-speed',kind,'[data-ml-power-force-speed]');}
      if(kind==='ramp'){check((await guide(kind).textContent()).toLowerCase().includes('vertical'),'Ramp guide identifies vertical motion');await shot('desktop-ramp-force-speed',kind,'[data-ml-power-force-speed]');}
      const fixed=JSON.stringify((await state()).benchPowerRecords);await input(kind,'duration').fill('.5');await input(kind,'timeUnit').selectOption('min');const slower=await inspect(fixture,80,30);check(near(slower.inputForce,p.inputForce)&&near(slower.loadForce,p.loadForce)&&near(slower.handSpeed,p.handSpeed/6)&&near(slower.inputPower,p.inputPower/6),kind+': longer duration preserves force while reducing speed and power');
      await input(kind,'percent').fill('100');const ideal=await inspect(fixture,100,30);check(near(ideal.usefulPower,ideal.inputPower)&&near(ideal.inputForce,p.inputForce*.8),kind+': ideal efficiency removes power loss and lowers required effort');check(JSON.stringify((await state()).benchPowerRecords)===fixed,kind+': changed time and efficiency preserve all saved snapshots');
    }
    const screw=fixtures.find(f=>f.kind==='screw');await mount('screw',320,{dark:true});await panels('screw');await open(map('screw'));const p=await inspect(screw);
    await input('screw','question').selectOption('effortFromPower');await press(action('screw','hint'));await press(action('screw','hint'));check(await action('screw','hint-level').getAttribute('data-ml-power-hint-level')==='2','Two force hints reveal formula and substitution');await input('screw','answer').fill(String(p.inputForce));await input('screw','unit').selectOption('N');await input('screw','answer').focus();await pg.keyboard.press('Enter');await result('screw','correct');await press(action('screw','save'));check((await state()).benchPowerRecords.screw.effortFromPower.hint===2,'Saved effort-from-power practice retains both opened hints');
    await input('screw','question').selectOption('loadFromPower');await press(action('screw','reveal'));await result('screw','solution');await solve('screw',p.loadForce,'N');await result('screw','solution');await press(action('screw','save'));check((await state()).benchPowerRecords.screw.loadFromPower.completion==='solution','Viewed load-from-power solution retains its provenance after checking');
    await keyboard('screw','Dark phone force-speed practice');await shot('dark-phone-screw-force-speed','screw','[data-ml-power-force-speed]');for(const key of forceSkills){await input('screw','question').selectOption(key);await layout('screw','Dark phone '+key);}
    const fixed=JSON.stringify((await state()).benchPowerRecords);await input('screw','duration').fill('');check(await guide('screw').count()===0&&await action('screw','check').count()===0,'Invalid duration removes stale force-speed values and grading');await input('screw','duration').fill('10');await panels('screw');await inspect(screw,80,10);check(JSON.stringify((await state()).benchPowerRecords)===fixed,'Invalid and repaired assumptions preserve saved force work');
    await open(lab('screw').locator('[data-ml-power-saved=screw]'));await lab('screw').getByRole('button',{name:'Open work record',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');const textRecords=await pg.locator('[data-ml-power-record-station=screw]').allTextContents();check(textRecords.length===2&&textRecords.some(t=>t.includes('Hints opened: 2/2')),'Work record includes both force skills and original hint provenance');
    const pending=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();const download=await pending;if(await download.failure())throw Error('Native text download failed');const exported=fs.readFileSync(await download.path(),'utf8');await download.saveAs(path.join(OUT,'downloaded-record.txt'));check(download.suggestedFilename()==='machine-lab-work-record.txt'&&textRecords.every(t=>exported.includes(t))&&exported.includes(savedNote),'Native downloaded text retains both force records and unrelated design evidence');
    const windlass=fixtures.find(f=>f.kind==='windlass');await mount('windlass',320,{contrast:true});await panels('windlass');await inspect(windlass);const forced=observations[observations.length-1].bars;check(forced.every(b=>b.background!=='rgba(0, 0, 0, 0)')&&new Set(forced.map(b=>b.image+'|'+b.background)).size>=2,'Forced colors preserves distinct input/output fills or patterns');await keyboard('windlass','Forced-colors force-speed guide');await shot('forced-colors-windlass-force-speed','windlass','[data-ml-power-force-speed]');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,observations,errors},null,2)+'\n');console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1400))},null,2));if(errors.length)process.exitCode=1;await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
