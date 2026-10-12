// Native React/THREE coverage for expanded efficiency skills and energy visuals.
// node dev-tools/ml_efficiency_skills_qa.cjs [fresh-output-directory]
const fs=require('fs'),path=require('path'),vm=require('vm');
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_efficiency_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-efficiency-lab-2026-10-10/browser','reports/machinelab-efficiency-skills-2026-10-12/browser/run-01');
bootstrap+=String.raw`
  const observations=[],kinds=['input','force','loss','output','efficiency','actualMA','travel'];
  const units={input:'J',force:'N',loss:'J',output:'J',efficiency:'%',actualMA:'×',travel:'m'};
  const chart=kind=>lab(kind).locator('[data-ml-efficiency-energy-split]');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  function physical(fixture,percent=80,movement=.5){const eta=percent/100,out=fixture.load*movement;return{input:out/eta,force:fixture.load/(fixture.ma*eta),loss:out/eta-out,output:out,efficiency:percent,actualMA:fixture.ma*eta,travel:movement*fixture.ma};}
  async function panels(kind){await open(lab(kind));await open(comparison(kind));}
  async function energy(fixture,percent=80){
    await settle();const kind=fixture.kind,target=chart(kind),p=physical(fixture,percent),eta=percent/100;
    check(await target.count()===1,kind+': energy split has one visible figure');
    check(await target.evaluate(el=>el.tagName==='FIGURE'&&el.querySelector('figcaption')?.id===el.getAttribute('aria-labelledby')&&!!el.querySelector('figcaption')?.textContent.trim()),kind+': energy figure is named by its visible caption');
    const parts=await target.locator('[data-ml-efficiency-energy-part]').evaluateAll(els=>els.map(el=>({part:el.getAttribute('data-ml-efficiency-energy-part'),value:Number(el.dataset.value),share:Number(el.dataset.share),text:el.textContent})));
    check(parts.length===2&&parts.map(p=>p.part).join(',')==='useful,loss',kind+': split labels contain useful and lost energy in order');
    for(const row of parts){const value=row.part==='useful'?p.output:p.loss,share=value/p.input*100;
      check(near(row.value,value)&&near(row.share,share),kind+': '+row.part+' values and shares agree with independent work calculations at '+percent+'%');
    }
    const bars=await target.locator('[data-ml-efficiency-energy-bar]').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),pr=el.parentElement.getBoundingClientRect(),s=getComputedStyle(el);return{part:el.getAttribute('data-ml-efficiency-energy-bar'),width:parseFloat(el.style.width),pixels:r.width,parentPixels:pr.width,left:r.left,right:r.right,background:s.backgroundColor,image:s.backgroundImage,border:s.borderStyle,outline:s.outlineStyle,ariaHidden:el.closest('[aria-hidden]')?.getAttribute('aria-hidden')};}));
    check(bars.length===2,kind+': energy track contains exactly two parts');
    for(const bar of bars){const share=bar.part==='useful'?eta:1-eta;
      check(Math.abs(bar.width-share*100)<=Math.max(1e-7,Math.abs(share*100)*.00001),kind+': '+bar.part+' CSS width is proportional without a minimum at '+percent+'%');
      check(Math.abs(bar.pixels-bar.parentPixels*bar.width/100)<.15,kind+': '+bar.part+' rendered bar preserves the same proportional scale');
      check(bar.ariaHidden==='true',kind+': '+bar.part+' decorative bar is hidden from repeated screen-reader output');
    }
    check(near(parts.reduce((sum,row)=>sum+row.value,0),p.input),kind+': useful and lost energy sum to full input work');
    observations.push({kind,percent,parts,bars});return{parts,bars};
  }
  async function layout(kind,label){
    await settle();const failures=await lab(kind).evaluate(el=>{const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';return{page:document.documentElement.scrollWidth>innerWidth+1,panel:el.scrollWidth>el.clientWidth+1,children:Array.from(el.querySelectorAll('input,select,button,figure,figcaption,[data-ml-efficiency-given],[data-ml-efficiency-result],[data-ml-efficiency-energy-part]')).filter(e=>visible(e)&&e.scrollWidth>e.clientWidth+1).map(e=>({tag:e.tagName,id:e.id,width:e.clientWidth,scroll:e.scrollWidth}))};});
    check(!failures.page&&!failures.panel&&!failures.children.length,label+': figure, calculation text and controls fit without horizontal overflow');
    if(failures.page||failures.panel||failures.children.length)observations.push({label,overflow:failures});
  }
  async function keyboard(kind,label){
    const controls=lab(kind).locator('input:visible,select:visible,button:visible:not(:disabled),summary:visible');let focused=true,outlined=true,labelled=true;
    for(let i=0;i<await controls.count();i++){const control=controls.nth(i);await control.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');const info=await control.evaluate(el=>{const s=getComputedStyle(el);return{focused:el===document.activeElement&&el.tabIndex>=0,outlined:el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0,labelled:el.matches('summary,button')?!!el.textContent.trim():!!el.labels?.length||!!el.getAttribute('aria-label')||!!el.getAttribute('aria-labelledby')};});focused=focused&&info.focused;outlined=outlined&&info.outlined;labelled=labelled&&info.labelled;}
    check(focused,label+': visible controls retain keyboard focus');check(outlined,label+': keyboard focus remains visible');check(labelled,label+': visible controls retain accessible names');
  }
  async function shot(name,kind,selector){
    const target=lab(kind).locator(selector);await target.first().scrollIntoViewIfNeeded();await settle();
    const box=await target.evaluateAll(els=>{const rs=els.map(el=>el.getBoundingClientRect()),left=Math.min(...rs.map(r=>r.left)),top=Math.min(...rs.map(r=>r.top)),right=Math.max(...rs.map(r=>r.right)),bottom=Math.max(...rs.map(r=>r.bottom));return{x:left+scrollX,y:top+scrollY,width:right-left,height:bottom-top};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:{x:Math.max(0,box.x-3),y:Math.max(0,box.y-3),width:box.width+6,height:box.height+6}});shots.push(name);
  }
  async function choicesFit(kind){
    await pg.setViewportSize({width:320,height:1100});
    for(const key of ['question','unit']){const values=await input(kind,key).locator('option').evaluateAll(els=>els.map(el=>el.value));for(const value of values){await input(kind,key).selectOption(value);await settle();const info=await input(kind,key).evaluate(el=>({value:el.value,label:el.selectedOptions[0].textContent,width:el.clientWidth,scroll:el.scrollWidth}));check(info.scroll<=info.width+1,kind+': '+key+' '+JSON.stringify(value)+' selected label fits at 320 px');if(info.scroll>info.width+1)observations.push({kind,selectionOverflow:info});}}
    await input(kind,'question').selectOption('input');await input(kind,'unit').selectOption('');await layout(kind,kind+' all skill and unit choices at 320 px');
  }
  try{
    for(const fixture of fixtures){
      const kind=fixture.kind,p=physical(fixture);await mount(kind);const before=await state();await panels(kind);
      check(await sameExcept(before),kind+': opening efficiency disclosures leaves saved and draft state untouched');
      await model(kind,fixture.load,fixture.ma);await energy(fixture);
      check(await input(kind,'question').locator('option').evaluateAll(els=>els.map(el=>el.value).join(','))===kinds.join(','),kind+': all seven calculation skills appear in their intended order');
      check(await lab(kind).locator('[data-ml-efficiency-practice]').count()===1,kind+': practice has its own visual panel');
      for(const skill of kinds){
        await input(kind,'question').selectOption(skill);await resetPractice(kind);
        await solve(kind,p[skill],units[skill]==='N'?'J':'N');await result(kind,'unit');check(await action(kind,'save').isDisabled(),kind+' '+skill+': a physically wrong unit cannot be saved');
        await solve(kind,p[skill],units[skill]);await result(kind,'correct');
        await press(action(kind,'save'));const record=(await state()).benchEfficiencyRecords[kind];
        check(record.version===(['input','force','loss'].includes(skill)?1:2)&&record.question===skill&&record.unit===units[skill]&&record.completion==='checked'&&record.hint===0&&record.percent===80&&near(Number(record.answer),p[skill]),kind+' '+skill+': saved record version, checked calculation and unit match the original or expanded skill');
        check(Object.keys((await state()).benchEfficiencyRecords).length===1,kind+' '+skill+': save updates one latest record for the station');
        check(await sameExcept(before,['benchEfficiency','benchEfficiencyRecords'])&&await recordsPreserved(),kind+' '+skill+': practice leaves geometry and separate investigation/design records unchanged');
      }
      if(kind==='lever'){await layout(kind,'Desktop');await keyboard(kind,'Desktop');await shot('desktop-efficiency-energy',kind,'[data-ml-efficiency-energy-split]');}
      await choicesFit(kind);
    }
    await mount('lever',390,{dark:true});await panels('lever');await input('lever','percent').fill('50');await energy(fixtures[0],50);await shot('dark-phone-efficiency-energy','lever','[data-ml-efficiency-energy-split]');
    await input('lever','question').selectOption('actualMA');await press(action('lever','check'));await result('lever','invalid');
    for(const bad of ['-1','Infinity','abc']){await input('lever','answer').fill(bad);await press(action('lever','check'));await result('lever','invalid');check(await input('lever','answer').getAttribute('aria-invalid')==='true'&&await action('lever','save').isDisabled(),'Invalid actual-MA answer '+JSON.stringify(bad)+' identifies the input and cannot save');}
    await solve('lever',.7,'×');await result('lever','incorrect');await press(action('lever','hint'));await press(action('lever','hint'));
    check(await action('lever','hint-level').getAttribute('data-ml-efficiency-hint-level')==='2'&&await action('lever','hint').isDisabled(),'Hint progression shows relationship then setup and is bounded');
    await input('lever','answer').fill('1');await input('lever','answer').focus();await pg.keyboard.press('Enter');await result('lever','correct');
    check(await action('lever','result').evaluate(el=>el.parentElement.getAttribute('role')==='status'&&el.parentElement.getAttribute('aria-live')==='polite'),'Checked feedback is announced by a polite status region');
    await press(action('lever','save'));const fixed=JSON.stringify((await state()).benchEfficiencyRecords.lever);
    check((await state()).benchEfficiencyRecords.lever.hint===2,'Checked record honestly retains both hints');await layout('lever','Dark phone checked skill');await shot('dark-phone-efficiency-practice','lever','[data-ml-efficiency-practice]');
    await press(action('lever','next'));await resetPractice('lever');check(await input('lever','question').inputValue()==='travel','Next skill advances actual MA to hand travel');
    await press(action('lever','reveal'));await result('lever','solution');await solve('lever',1,'m');await result('lever','solution');await press(action('lever','save'));
    check((await state()).benchEfficiencyRecords.lever.completion==='solution'&&(await state()).benchEfficiencyRecords.lever.question==='travel','Checking after a worked solution preserves solution-viewed provenance');
    await press(action('lever','next'));await resetPractice('lever');check(await input('lever','question').inputValue()==='input','Next skill wraps the final skill to input work');
    const fixedSolution=JSON.stringify((await state()).benchEfficiencyRecords.lever);await input('lever','percent').fill('75');await pg.locator('#ml-leverEffortArm').focus();await pg.keyboard.press('ArrowRight');await resetPractice('lever');
    check(JSON.stringify((await state()).benchEfficiencyRecords.lever)===fixedSolution&&fixed!==fixedSolution,'Geometry and efficiency edits leave the saved latest calculation fixed');
    await input('lever','percent').fill('99.9999');await input('lever','question').selectOption('loss');await press(action('lever','hint'));await press(action('lever','hint'));
    const preciseText=await lab('lever').locator('[data-ml-efficiency-practice]').textContent();
    check(preciseText.includes('99.9999%')&&preciseText.includes('0.999999'),'Near-100% practice retains the assumed percent and decimal instead of showing ideal 100%');
    await input('lever','question').selectOption('efficiency');await solve('lever',99.9999,'%');await result('lever','correct');
    const precise=await energy({...fixtures[0],ma:2.1},99.9999);check(precise.parts.find(p=>p.part==='loss').value>0&&precise.bars.find(p=>p.part==='loss').width>0&&precise.bars.find(p=>p.part==='loss').width<.001,'Near-100% energy split retains a tiny nonzero loss without inflating its width');
    await input('lever','percent').fill('100');const ideal=await energy({...fixtures[0],ma:2.1},100);check(ideal.parts.find(p=>p.part==='loss').value===0&&ideal.bars.find(p=>p.part==='loss').width===0&&ideal.bars.find(p=>p.part==='loss').pixels===0,'100% efficiency has exact zero energy loss and no visible loss sliver');
    await input('lever','percent').fill('1');await energy({...fixtures[0],ma:2.1},1);await layout('lever','One-percent endpoint');
    for(const bad of ['','0','101','Infinity','abc']){await input('lever','percent').fill(bad);check(await input('lever','percent').getAttribute('aria-invalid')==='true'&&await chart('lever').count()===0&&await comparison('lever').count()===0&&await action('lever','check').count()===0,'Invalid efficiency '+JSON.stringify(bad)+' hides stale graphics and calculation checking');}
    check(JSON.stringify((await state()).benchEfficiencyRecords.lever)===fixedSolution&&await recordsPreserved(),'Invalid assumptions cannot alter saved work or separate records');
    await mount('screw',320,{contrast:true});await panels('screw');const forced=await energy(fixtures[5]);
    check(forced.bars.every(bar=>bar.background!=='rgba(0, 0, 0, 0)')&&(forced.bars[0].background!==forced.bars[1].background||forced.bars[0].image!==forced.bars[1].image||forced.bars[0].border!==forced.bars[1].border||forced.bars[0].outline!==forced.bars[1].outline),'Forced colors leaves useful and loss regions visually distinguishable');
    await keyboard('screw','Forced colors');await layout('screw','Forced colors 320 px');await shot('forced-colors-efficiency-energy','screw','[data-ml-efficiency-energy-split]');
    await input('screw','question').selectOption('travel');await press(action('screw','reveal'));await result('screw','solution');await press(action('screw','save'));await layout('screw','Forced colors worked solution');await shot('forced-colors-efficiency-practice','screw','[data-ml-efficiency-practice]');
    const legacy={version:1,benchId:'lever',settings:lever,percent:80,question:'input',answer:'250',unit:'J',hint:1,completion:'checked'};
    await mount('lever',1150,{}, {benchEfficiencyRecords:{lever:legacy}});await panels('lever');
    check(await lab('lever').locator('[data-ml-efficiency-saved=lever]').count()===1&&JSON.stringify((await state()).benchEfficiencyRecords.lever)===JSON.stringify(legacy),'A valid v1 record remains visible and is not silently upgraded');
    await open(lab('lever').locator('[data-ml-efficiency-saved=lever]'));const legacyText=await lab('lever').locator('[data-ml-efficiency-saved=lever]').textContent();
    check(legacyText.includes('250 J')&&legacyText.includes('Hints opened: 1/2'),'Legacy record keeps its checked answer and hint provenance');
    await input('lever','question').selectOption('output');await solve('lever',200,'J');check(JSON.stringify((await state()).benchEfficiencyRecords.lever)===JSON.stringify(legacy),'Checking a new skill leaves the original v1 record untouched until explicit save');
    await press(action('lever','save'));check((await state()).benchEfficiencyRecords.lever.version===2&&(await state()).benchEfficiencyRecords.lever.question==='output','Explicit new-skill save replaces the latest v1 record with a v2 snapshot');
    await input('lever','percent').fill('50');await pg.locator('#ml-leverLoad').focus();await pg.keyboard.press('ArrowRight');
    await lab('lever').getByRole('button',{name:'Open work record',exact:true}).click();await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    const record=pg.locator('[data-ml-efficiency-record-station=lever]'),recordText=await record.textContent();
    check(recordText.includes('80%')&&recordText.includes('Useful work: 200 J')&&recordText.includes('Entered answer: 200 J')&&recordText.includes('Hints opened: 0/2'),'Work record displays fixed v2 useful-work task, answer and provenance after live edits');
    fs.mkdirSync(path.join(OUT,'downloads'),{recursive:true});const downloaded=pg.waitForEvent('download');await pg.getByRole('button',{name:'Download text record',exact:true}).click();const download=await downloaded,failure=await download.failure();if(failure)throw new Error('Native download failed: '+failure);const exported=fs.readFileSync(await download.path(),'utf8');await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(download.suggestedFilename()==='machine-lab-work-record.txt'&&exported.includes(recordText)&&exported.includes(savedNote),'Native text export preserves fixed v2 calculation and original design note');
    await mount('ramp',390,{}, {rampLength:1,rampHeight:2});await open(lab('ramp'));check(await chart('ramp').count()===0&&await action('ramp','check').count()===0,'Invalid machine geometry cannot generate energy graphics or new skill grading');
    observations.push({scope:'Native Chromium with software WebGL at 320/390/1150 CSS pixels. Forced-colors emulation and keyboard checks; no physical assistive technology or deployed host exercised.'});
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,observations,errors},null,2)+'\n');
    console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1500))},null,2));if(errors.length)process.exitCode=1;await b.close();
  }
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
