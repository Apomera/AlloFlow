// Native React/THREE verification for single-station power-budget planning.
// node dev-tools/ml_power_planning_qa.cjs [fresh-output-directory]
const fs=require('fs'),path=require('path'),vm=require('vm');
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-power-planning-2026-10-12/browser/run-01');
bootstrap+=String.raw`
  const observations=[];
  const planKinds=['budgetEnergy','budgetLoad','budgetMovement','requiredEfficiency'];
  const planUnits={budgetEnergy:'J',budgetLoad:'N',budgetMovement:'m',requiredEfficiency:'%'};
  const planning=kind=>lab(kind).locator('[data-ml-power-planning]');
  const chart=kind=>lab(kind).locator('[data-ml-power-budget-chart]');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  function expectedPlan(fixture,percent=80,seconds=5,budget=100,movement=.5){
    const input=budget*seconds,useful=input*percent/100;
    return{budgetEnergy:input,usefulBudgetEnergy:useful,budgetLoad:useful/movement,
      budgetMovement:useful/fixture.load,requiredEfficiency:fixture.load*movement/input*100};
  }
  async function panels(kind){await open(lab(kind));await open(comparison(kind));await open(planning(kind));await settle();}
  async function inspectPlan(fixture,percent=80,seconds=5,budget=100,movement=.5){
    await settle();const kind=fixture.kind,expected=expectedPlan(fixture,percent,seconds,budget,movement);
    const values=await planning(kind).locator('[data-ml-power-budget-metric]').evaluateAll(els=>els.map(el=>({key:el.getAttribute('data-ml-power-budget-metric'),value:Number(el.dataset.value),text:el.textContent})));
    check(values.length===5&&new Set(values.map(v=>v.key)).size===5,kind+': all five planning metrics appear once');
    for(const row of values)check(near(row.value,expected[row.key]),kind+': '+row.key+' agrees with independent energy-budget calculation');
    check(await chart(kind).evaluate(el=>el.tagName==='FIGURE'&&!!el.querySelector('figcaption')&&el.getAttribute('aria-labelledby')===el.querySelector('figcaption').id),kind+': budget graphic is a native figure named by its visible caption');
    const required=fixture.load*movement/(percent/100),available=budget*seconds,max=Math.max(required,available);
    const bars=await chart(kind).locator('[data-ml-power-budget-bar]').evaluateAll(els=>els.map(el=>{
      const track=el.closest('[data-ml-power-budget-track]'),r=el.getBoundingClientRect(),t=track.getBoundingClientRect(),s=getComputedStyle(track),b=getComputedStyle(el);
      return{key:el.getAttribute('data-ml-power-budget-bar'),value:Number(el.dataset.value),width:parseFloat(el.style.width),aria:track.getAttribute('aria-hidden'),
        x:r.x,trackX:t.x,pixels:r.width,trackPixels:t.width,content:t.width-parseFloat(s.borderLeftWidth)-parseFloat(s.borderRightWidth),borderLeft:parseFloat(s.borderLeftWidth),
        trackStyle:{background:s.backgroundColor,outline:s.outlineStyle,border:s.borderStyle},barStyle:{background:b.backgroundColor,image:b.backgroundImage,border:b.borderStyle,outline:b.outlineStyle}};
    }));
    check(bars.length===2&&bars.map(b=>b.key).sort().join(',')==='available,required',kind+': graphic compares required and available input energy');
    const cssNear=(a,b)=>Math.abs(a-b)<=Math.max(1e-7,Math.abs(b)*.00001);
    for(const bar of bars){const value=bar.key==='required'?required:available;
      check(near(bar.value,value),kind+': '+bar.key+' bar retains exact joules');
      check(cssNear(bar.width,value/max*100)&&bar.width>0&&bar.width<=100,kind+': '+bar.key+' bar uses a common scale with no minimum-width inflation');
      check(Math.abs(bar.pixels-bar.content*bar.width/100)<.05,kind+': '+bar.key+' rendered width is proportional within subpixel rounding');
      check(Math.abs(bar.x-bar.trackX-bar.borderLeft)<.1,kind+': '+bar.key+' bar begins at the true zero origin');
      check(bar.aria==='true',kind+': '+bar.key+' decorative track is hidden from assistive technology');
    }
    check(bars.every(bar=>Math.abs(bar.trackX-bars[0].trackX)<.1&&Math.abs(bar.content-bars[0].content)<.1),kind+': required and available tracks use equal origins and pixels per joule');
    observations.push({kind,percent,seconds,budget,movement,expected,bars});return{expected,bars};
  }
  async function layout(kind,label){
    const overflow=await lab(kind).evaluate(el=>{const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';return{
      page:document.documentElement.scrollWidth>innerWidth+1,panel:el.scrollWidth>el.clientWidth+1,
      children:Array.from(el.querySelectorAll('input,select,button,figure,figcaption,[data-ml-power-budget-metric],[data-ml-power-question-title],[data-ml-power-given],[data-ml-power-result]'))
        .filter(e=>visible(e)&&e.scrollWidth>e.clientWidth+1).map(e=>({tag:e.tagName,id:e.id,text:e.textContent,width:e.clientWidth,scroll:e.scrollWidth}))};});
    check(!overflow.page&&!overflow.panel&&!overflow.children.length,label+': figures, question text and controls fit the viewport');
    if(overflow.page||overflow.panel||overflow.children.length)observations.push({label,overflow});
  }
  async function keyboard(kind,label){
    const controls=lab(kind).locator('input:visible,select:visible,button:visible:not(:disabled),summary:visible');let focused=true,outlined=true,labelled=true;
    for(let i=0;i<await controls.count();i++){const control=controls.nth(i);await control.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');
      const info=await control.evaluate(el=>{const s=getComputedStyle(el);return{focused:el===document.activeElement&&el.tabIndex>=0,
        outlined:el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0,
        labelled:el.matches('summary,button')?!!el.textContent.trim():!!el.labels?.length||!!el.getAttribute('aria-label')||!!el.getAttribute('aria-labelledby')};});
      focused=focused&&info.focused;outlined=outlined&&info.outlined;labelled=labelled&&info.labelled;}
    check(focused,label+': enabled controls retain keyboard focus');check(outlined,label+': keyboard focus is visible');check(labelled,label+': controls have accessible labels');
  }
  async function shot(name,kind,selector){
    const target=lab(kind).locator(selector);await target.first().scrollIntoViewIfNeeded();await settle();
    const box=await target.evaluateAll(els=>{const rs=els.map(el=>el.getBoundingClientRect()),left=Math.min(...rs.map(r=>r.left)),top=Math.min(...rs.map(r=>r.top)),right=Math.max(...rs.map(r=>r.right)),bottom=Math.max(...rs.map(r=>r.bottom));return{x:left+scrollX,y:top+scrollY,width:right-left,height:bottom-top};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:{x:Math.max(0,box.x-3),y:Math.max(0,box.y-3),width:box.width+6,height:box.height+6}});shots.push(name);
  }
  async function allChoicesFit(kind){
    await pg.setViewportSize({width:320,height:1100});
    for(const key of ['question','unit']){const values=await input(kind,key).locator('option').evaluateAll(els=>els.map(el=>el.value));
      for(const value of values){await input(kind,key).selectOption(value);await settle();const info=await input(kind,key).evaluate(el=>({value:el.value,label:el.selectedOptions[0].textContent,width:el.clientWidth,scroll:el.scrollWidth}));
        check(info.scroll<=info.width+1,kind+': '+key+' '+JSON.stringify(value)+' selected label fits at 320 px');
        if(key==='question')check(await lab(kind).locator('[data-ml-power-question-title]').evaluate(el=>!!el.textContent.trim()&&el.scrollWidth<=el.clientWidth+1),kind+': '+value+' full question title is visible and wraps at 320 px');
        if(info.scroll>info.width+1)observations.push({kind,selectionOverflow:info});}
    }
    await layout(kind,kind+' all skill and unit choices at 320 px');
  }
  async function saveChecked(kind,skill,value){await input(kind,'question').selectOption(skill);await solve(kind,Number(value.toPrecision(4)),planUnits[skill]);await result(kind,'correct');await press(action(kind,'save'));}
  try{
    for(const fixture of fixtures){
      const kind=fixture.kind;await mount(kind);const before=await state();await panels(kind);
      check(await sameExcept(before),kind+': opening planning disclosures leaves state unchanged');
      await model(fixture);const {expected}=await inspectPlan(fixture);
      const choices=await input(kind,'question').locator('option').evaluateAll(els=>els.map(el=>el.value));
      check(choices.length===(fixture.radius?12:10)&&choices.slice(-4).join(',')===planKinds.join(','),kind+': four planning skills append after the existing skill order');
      for(const skill of planKinds){
        await input(kind,'question').selectOption(skill);await solve(kind,expected[skill],'W');await result(kind,'unit');
        check(await input(kind,'unit').getAttribute('aria-invalid')==='true'&&await action(kind,'save').isDisabled(),kind+': '+skill+' rejects watts and identifies its answer unit');
        await solve(kind,Number(expected[skill].toPrecision(4)),planUnits[skill]);await result(kind,'correct');await press(action(kind,'save'));
        const record=(await state()).benchPowerRecords[kind][skill];check(record.version===2&&record.completion==='checked'&&record.unit===planUnits[skill],kind+': '+skill+' saves an independent version-2 checked record');
      }
      check(Object.keys((await state()).benchPowerRecords[kind]).length===4,kind+': saving four planning calculations retains every new skill');
      check(await recordsPreserved(),kind+': planning preserves design, investigation and efficiency evidence');
      if(kind==='lever'){await layout(kind,'Desktop planning');await keyboard(kind,'Desktop planning');await shot('desktop-power-planning',kind,'[data-ml-power-planning]');}
      await allChoicesFit(kind);
      await input(kind,'duration').fill('.5');await input(kind,'timeUnit').selectOption('min');await inspectPlan(fixture,80,30);
      await input(kind,'percent').fill('100');await inspectPlan(fixture,100,30);
      check(await recordsPreserved(),kind+': minute conversion and efficiency changes preserve unrelated records');
    }
    await mount('lever',390,{dark:true});await panels('lever');await input('lever','duration').fill('2');await input('lever','budget').fill('10');
    const impossible=await inspectPlan(fixtures[0],80,2,10);check(impossible.expected.requiredEfficiency===1000,'Insufficient budget keeps the full 1000% required efficiency');
    await input('lever','budget').fill('99.9999');await inspectPlan(fixtures[0],80,2,99.9999);
    check(await planning('lever').locator('[data-ml-power-budget-metric=requiredEfficiency] dd').textContent().then(text=>parseFloat(text)>100),'A barely unattainable required efficiency stays visibly above 100% instead of rounding to 100%');
    await input('lever','budget').fill('10');
    await input('lever','question').selectOption('requiredEfficiency');await solve('lever',100,'%');await result('lever','incorrect');await solve('lever',1000,'%');await result('lever','correct');
    check(await lab('lever').locator('[data-ml-power-question-title]').textContent().then(s=>s.toLowerCase().includes('efficiency')),'Required-efficiency practice shows the full calculation request');
    await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-power-hint-level')==='1','First planning hint shows the relationship');
    await press(action('lever','hint'));check(await action('lever','hint-level').getAttribute('data-ml-power-hint-level')==='2'&&await action('lever','hint').isDisabled(),'Second planning hint shows setup and bounds hint progression');
    check(await action('lever','result').evaluate(el=>el.parentElement.getAttribute('role')==='status'&&el.parentElement.getAttribute('aria-live')==='polite'),'Planning feedback is announced through the existing polite status region');
    await press(action('lever','save'));const savedImpossible=JSON.stringify((await state()).benchPowerRecords);
    await layout('lever','Dark phone insufficient budget');await keyboard('lever','Dark phone planning');await shot('dark-phone-power-planning','lever','[data-ml-power-planning]');await shot('dark-phone-planning-practice','lever','[data-ml-power-practice]');
    await press(action('lever','next'));check(await input('lever','question').inputValue()==='inputPower','Next skill wraps from the last planning skill to input power');await resetPractice('lever');
    await input('lever','budget').fill('200');await resetPractice('lever');await inspectPlan(fixtures[0],80,2,200);
    await input('lever','duration').fill('10');await input('lever','percent').fill('50');await inspectPlan(fixtures[0],50,10,200);
    check(JSON.stringify((await state()).benchPowerRecords)===savedImpossible,'Changing time, efficiency and power budget keeps saved planning snapshots fixed');
    for(const [field,valid] of [['budget','200'],['duration','10'],['percent','50']]){
      for(const bad of ['','0','Infinity']){await input('lever',field).fill(bad);check(await input('lever',field).getAttribute('aria-invalid')==='true'&&await planning('lever').count()===0&&await chart('lever').count()===0&&await action('lever','check').count()===0,'Invalid '+field+' '+JSON.stringify(bad)+' removes stale planning graphics and grading');}
      await input('lever',field).fill(valid);await open(planning('lever'));
    }
    check(JSON.stringify((await state()).benchPowerRecords)===savedImpossible,'Invalid assumption drafts preserve saved planning records');
    await input('lever','duration').fill('.01');await input('lever','budget').fill('.01');const extreme=await inspectPlan(fixtures[0],50,.01,.01);
    check(extreme.bars.find(bar=>bar.key==='available').width<.001,'Tiny energy availability remains a proportional subpixel bar');await layout('lever','Extreme small budget');
    await input('lever','duration').fill('3600');await input('lever','budget').fill('100000');await inspectPlan(fixtures[0],50,3600,100000);
    const oldPlan=await planning('lever').locator('[data-ml-power-budget-metric]').evaluateAll(els=>els.map(el=>el.dataset.value));
    await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowRight');await settle();
    check(JSON.stringify(await planning('lever').locator('[data-ml-power-budget-metric]').evaluateAll(els=>els.map(el=>el.dataset.value)))===JSON.stringify(oldPlan),'Changing mechanical advantage alone leaves all energy-budget capacities unchanged');
    check(JSON.stringify((await state()).benchPowerRecords)===savedImpossible,'Geometry changes preserve the earlier fixed planning snapshot');

    await mount('screw',320,{contrast:true});await panels('screw');const forced=await inspectPlan(fixtures[5]);
    check(forced.bars.every(bar=>(bar.trackStyle.outline!=='none'||bar.trackStyle.border!=='none')&&(bar.barStyle.background!==bar.trackStyle.background||bar.barStyle.image!=='none')),'Forced colors retains visible track boundaries and energy-bar fills');
    await input('screw','question').selectOption('budgetMovement');await press(action('screw','hint'));await press(action('screw','reveal'));await result('screw','solution');
    await solve('screw',forced.expected.budgetMovement,'m');await result('screw','solution');await press(action('screw','save'));
    check((await state()).benchPowerRecords.screw.budgetMovement.version===2&&(await state()).benchPowerRecords.screw.budgetMovement.completion==='solution','Checking after reveal retains version-2 solution-viewed provenance');
    await layout('screw','Forced colors planning at 320 px');await keyboard('screw','Forced colors planning');await shot('forced-colors-power-planning','screw','[data-ml-power-planning]');await shot('forced-colors-planning-practice','screw','[data-ml-power-practice]');

    await mount('lever',390);await panels('lever');await input('lever','duration').fill('2');await input('lever','budget').fill('99.9999');await input('lever','question').selectOption('requiredEfficiency');
    await press(action('lever','reveal'));await result('lever','solution');
    const boundaryExpected=400*.5/(99.9999*2)*100,boundaryResult=await action('lever','result').textContent();
    const solvedPercent=Number((boundaryResult.match(/= ([0-9.eE+-]+) %/)||[])[1]);
    check(solvedPercent>100&&near(solvedPercent,boundaryExpected),'Worked solution preserves the barely-above-100% result instead of displaying an attainable 100%');
    await press(action('lever','save'));await open(lab('lever').locator('[data-ml-power-saved=lever]'));await lab('lever').getByRole('button',{name:'Open work record',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const boundaryText=await pg.locator('[data-ml-power-record-station=lever][data-ml-power-record-skill=requiredEfficiency]').textContent();
    const recordedPercent=Number((boundaryText.match(/= ([0-9.eE+-]+) %/)||[])[1]);
    check(recordedPercent>100&&near(recordedPercent,boundaryExpected),'Fixed work record preserves the barely-above-100% requirement');
    fs.mkdirSync(path.join(OUT,'downloads'),{recursive:true});const boundaryDownloading=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();const boundaryDownload=await boundaryDownloading,boundaryFailure=await boundaryDownload.failure();if(boundaryFailure)throw Error('Native boundary download failed: '+boundaryFailure);
    const boundaryExport=fs.readFileSync(await boundaryDownload.path(),'utf8');await boundaryDownload.saveAs(path.join(OUT,'downloaded-boundary-record.txt'));
    check(boundaryDownload.suggestedFilename()==='machine-lab-work-record.txt'&&boundaryExport.includes(boundaryText)&&recordedPercent>100,'Native export retains the precise unattainable efficiency and solution-viewed record');

    await mount('lever',390,{dark:true,band:'g912'});await panels('lever');await solve('lever',50,'W');await press(action('lever','save'));
    const originalV1=JSON.stringify((await state()).benchPowerRecords.lever.inputPower);check((await state()).benchPowerRecords.lever.inputPower.version===1,'Existing input-power skill still saves its version-1 record');
    const expected=expectedPlan(fixtures[0]);for(const skill of planKinds)await saveChecked('lever',skill,expected[skill]);
    check(JSON.stringify((await state()).benchPowerRecords.lever.inputPower)===originalV1,'Saving new planning skills leaves the existing version-1 snapshot byte-for-byte intact');
    check(Object.keys((await state()).benchPowerRecords.lever).length===5&&await action('lever','count').getAttribute('data-ml-power-count')==='5','Practice collection counts one original and four new skill records');
    const fixed=JSON.stringify((await state()).benchPowerRecords);await input('lever','duration').fill('10');await input('lever','budget').fill('50');await input('lever','percent').fill('60');
    await pg.locator('#ml-leverLoad').focus();await pg.keyboard.press('ArrowRight');check(JSON.stringify((await state()).benchPowerRecords)===fixed,'Later load and assumption edits preserve all five saved records');
    await open(lab('lever').locator('[data-ml-power-saved=lever]'));await lab('lever').getByRole('button',{name:'Open work record',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    check(await pg.locator('[data-ml-power-record-station=lever]').count()===5,'Work record exposes the original and all four new saved skill entries');
    const texts={};for(const skill of ['inputPower',...planKinds]){texts[skill]=await pg.locator('[data-ml-power-record-station=lever][data-ml-power-record-skill='+skill+']').textContent();check(texts[skill].includes('5 s')&&texts[skill].includes('80%')&&texts[skill].includes('Answer checked'),skill+': work record retains original assumptions and checked completion');}
    check(texts.inputPower.includes('50 W')&&texts.budgetEnergy.includes('500 J')&&texts.budgetLoad.includes('800 N')&&texts.budgetMovement.includes('1 m')&&texts.requiredEfficiency.includes('40 %'),'Saved records retain independently verified original answers');
    check(await pg.locator('#ml-record-design-note-lever').inputValue()===savedNote&&await pg.locator('[data-ml-efficiency-record-station=lever]').count()===1,'Planning work records retain design notes and efficiency evidence');
    fs.mkdirSync(path.join(OUT,'downloads'),{recursive:true});const downloaded=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();const download=await downloaded,failure=await download.failure();if(failure)throw Error('Native download failed: '+failure);
    const exported=fs.readFileSync(await download.path(),'utf8');await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&Object.values(texts).every(text=>exported.includes(text))&&exported.includes(savedNote),'Native text download preserves all five fixed skill records and the original design explanation');
    observations.push({scope:'Native React/THREE in Chromium at 320/390/1150 CSS pixels, reduced motion, dark and forced-colors emulation. No deployed host build or physical assistive technology session.'});
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,observations,errors},null,2)+'\n');
    console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1500))},null,2));if(errors.length)process.exitCode=1;await b.close();
  }
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
