// Bounded native React/THREE visual QA for compound-machine learning panels.
// node dev-tools/ml_compound_visual_qa.cjs [out-dir]
const fs = require('fs'), path = require('path'), vm = require('vm');
// Reuse the established native host, fixture and UI helpers, not its scenarios.
let bootstrap = fs.readFileSync(path.join(__dirname, 'ml_compound_lab_qa.cjs'), 'utf8');
bootstrap = bootstrap.slice(0, bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-compound-lab-2026-10-11/browser', 'reports/machinelab-compound-visual-2026-10-12/browser');
bootstrap += String.raw`
  const observations=[];
  const visual=(kind,part)=>lab(kind).locator('[data-ml-compound-'+part+']');
  async function inspectFlow(kind,first=80,second=90,load=400,distance=.5){
    const map=visual(kind,'stage-map'),energy=visual(kind,'energy-split');
    check(await map.count()===1&&await energy.count()===1,kind+': stage map and energy diagram each appear once');
    check(await map.evaluate(el=>el.tagName==='FIGURE'&&!!el.querySelector('figcaption'))&&
      await energy.evaluate(el=>el.tagName==='FIGURE'&&!!el.querySelector('figcaption')),kind+': both diagrams have native figure captions');
    const nodes=await map.locator('[data-ml-compound-flow-node]').evaluateAll(els=>els.map(el=>el.getAttribute('data-ml-compound-flow-node')));
    check(nodes.join(',')==='input,output,task',kind+': stage map has ordered input, output and final-task nodes');
    const expectedInput=load*distance/(first/100)/(second/100),expectedTransfer=load*distance/(second/100);
    const expected={useful:load*distance,first:expectedInput-expectedTransfer,second:expectedTransfer-load*distance};
    const parts=await energy.locator('[data-ml-compound-energy-part]').evaluateAll(els=>els.map(el=>({part:el.getAttribute('data-ml-compound-energy-part'),value:Number(el.dataset.value),share:Number(el.dataset.share),text:el.textContent})));
    check(parts.length===3&&new Set(parts.map(p=>p.part)).size===3,kind+': useful output and two separate losses are identified');
    check(parts.every(p=>near(p.value,expected[p.part])&&near(p.share,p.value/expectedInput*100)),kind+': energy values and percentage shares match independent physics');
    check(parts.every(p=>p.value>=0&&p.share>=0&&p.share<=100)&&near(parts.reduce((s,p)=>s+p.share,0),100),kind+': nonnegative energy shares sum to 100 percent');
    check(await energy.locator('[data-ml-compound-energy-bar]').count()===3,kind+': each energy category has its own bar');
    observations.push({kind,first,second,load,distance,parts});
    return parts;
  }
  async function layout(kind,label){
    const failures=await lab(kind).evaluate(el=>{
      const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
      return {page:document.documentElement.scrollWidth>innerWidth+1,panel:el.scrollWidth>el.clientWidth+1,
        children:Array.from(el.querySelectorAll('input,select,textarea,button,figure,figcaption,.ml-compound-fields,[data-ml-compound-flow-node],[data-ml-compound-energy-part],[data-ml-compound-budget-metric]'))
          .filter(e=>visible(e)&&e.scrollWidth>e.clientWidth+1).map(e=>({tag:e.tagName,id:e.id,cls:e.className,width:e.clientWidth,scroll:e.scrollWidth}))};
    });
    check(!failures.page&&!failures.panel&&!failures.children.length,label+': page, panels, diagram labels and controls have no horizontal overflow');
    if(failures.page||failures.panel||failures.children.length)observations.push({label,overflow:failures});
  }
  async function keyboardControls(kind,label){
    const controls=lab(kind).locator('input:visible,select:visible,textarea:visible,button:visible:not(:disabled),summary:visible');
    let allFocusable=true,allOutlined=true,allLabelled=true;
    for(let i=0;i<await controls.count();i++){
      const control=controls.nth(i);await control.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');
      const info=await control.evaluate(el=>{const s=getComputedStyle(el);return {focused:el===document.activeElement&&el.tabIndex>=0,
        outlined:el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0,
        labelled:el.matches('summary,button')?!!el.textContent.trim():!!(el.labels&&el.labels.length)||!!el.getAttribute('aria-label')||!!el.getAttribute('aria-labelledby')};});
      allFocusable=allFocusable&&info.focused;allOutlined=allOutlined&&info.outlined;allLabelled=allLabelled&&info.labelled;
    }
    check(allFocusable,label+': every visible enabled control is reachable through keyboard focus');
    check(allOutlined,label+': every visible enabled control has a visible keyboard outline');
    check(allLabelled,label+': all visible form controls retain associated labels');
  }
  async function shot(name,kind,selector){
    await lab(kind).locator(selector.split(',')[0]).first().scrollIntoViewIfNeeded();
    const box=await lab(kind).locator(selector).evaluateAll(els=>{const rs=els.map(el=>el.getBoundingClientRect()),x=Math.min(...rs.map(r=>r.left)),y=Math.min(...rs.map(r=>r.top)),right=Math.max(...rs.map(r=>r.right)),bottom=Math.max(...rs.map(r=>r.bottom));return {x:x+scrollX,y:y+scrollY,width:right-x,height:bottom-y};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip:{x:Math.max(0,box.x-3),y:Math.max(0,box.y-3),width:box.width+6,height:box.height+6}});shots.push(name);
  }
  async function revealPanels(kind){await open(lab(kind));await open(comparison(kind));}
  const flowSelector='[data-ml-compound-stage-map],[data-ml-compound-energy-split]';
  try{
    await mount('lever',1150);const initial=await state();await revealPanels('lever');
    check(await sameExcept(initial),'Opening the redesigned panels leaves all saved and draft state unchanged');
    await inspectFlow('lever');await layout('lever','Desktop');await keyboardControls('lever','Desktop');
    check(await lab('lever').locator('.ml-compound-fields').count()>0,'Setup fields use a responsive grid');
    check(await input('lever','question').locator('option').count()===18,'All 18 existing compound calculation skills remain available');
    await shot('desktop-stage-energy','lever',flowSelector);
    await shot('desktop-power-budget','lever','[data-ml-compound-power-flow],[data-ml-compound-budget-plan]');
    await pg.setViewportSize({width:441,height:1100});await layout('lever','441 px immediately above the layout breakpoint');
    await pg.setViewportSize({width:1150,height:1100});
    await input('lever','question').selectOption('inputWork');await solve('lever',277.78,'J');await result('lever','correct');
    await input('lever','explanation').fill('The input work supplies useful output and both stage losses.');await press(action('lever','save'));
    const saved=JSON.stringify((await state()).benchCompoundRecords);
    check((await state()).benchCompoundRecords.lever.inputWork.completion==='checked','Checked energy practice still saves honest provenance');
    await input('lever','percentIn').fill('60');await inspectFlow('lever',60,90);
    check(JSON.stringify((await state()).benchCompoundRecords)===saved&&await recordsPreserved(),'Changing visualized efficiencies preserves fixed compound and earlier lab records');

    await mount('lever',390,{dark:true});await revealPanels('lever');await inspectFlow('lever');await layout('lever','Dark phone 390 px');
    await shot('dark-phone-stage-energy','lever',flowSelector);
    await input('lever','question').selectOption('budgetTime');await press(action('lever','hint'));await press(action('lever','hint'));
    await solve('lever',2.7778,'s');await result('lever','correct');
    check(await action('lever','hint-level').getAttribute('data-ml-compound-hint-level')==='2','Both existing hints remain available in the new practice card');
    check(await action('lever','result').evaluate(el=>el.parentElement.getAttribute('role')==='status'&&el.parentElement.getAttribute('aria-live')==='polite'),'Practice feedback retains its polite live region');
    await input('lever','explanation').fill('More time at the same power supplies the needed input work.');await press(action('lever','save'));
    check((await state()).benchCompoundRecords.lever.budgetTime.version===3,'Power-budget practice still saves the version 3 fixed task record');
    await layout('lever','Dark phone with hints');await shot('dark-phone-practice','lever','[data-ml-compound-practice]');

    await mount('screw',320,{contrast:true});await revealPanels('screw');await inspectFlow('screw',80,90,2000);await layout('screw','Forced colors phone 320 px');
    await keyboardControls('screw','Forced colors phone');
    check(await input('screw','percentIn').evaluate(el=>getComputedStyle(el).borderStyle!=='none')&&
      await visual('screw','energy-split').locator('.ml-compound-energy-track').evaluate(el=>getComputedStyle(el).borderStyle!=='none'),
      'Forced colors retains control and energy-track boundaries');
    const patterns=await visual('screw','energy-split').locator('[data-ml-compound-energy-bar],.ml-compound-energy-swatch').evaluateAll(els=>els.map(el=>({pattern:el.dataset.pattern,image:getComputedStyle(el).backgroundImage})));
    check(patterns.length===6&&patterns.filter(p=>p.pattern==='striped'||p.pattern==='dotted').every(p=>p.image!=='none')&&
      patterns.filter(p=>p.pattern==='striped').every(p=>p.image.includes('linear-gradient'))&&patterns.filter(p=>p.pattern==='dotted').every(p=>p.image.includes('radial-gradient')),
      'Forced colors preserves distinct striped and dotted patterns in both proportional bars and legend swatches');
    observations.push({forcedColorPatterns:patterns,narrowViewport:'320 CSS px also exercises the reflow width of a 640 px viewport at 200% zoom; browser zoom itself was not used.'});
    await input('screw','question').selectOption('inputForce');await press(action('screw','reveal'));await result('screw','solution');
    await solve('screw',Number((2000/(2*Math.PI*.15/.005*2*.8*.9)).toPrecision(5)),'N');await result('screw','solution');await press(action('screw','save'));
    check((await state()).benchCompoundRecords.screw.inputForce.completion==='solution','Checking after reveal retains solution-viewed provenance');
    await shot('forced-colors-stage-energy','screw',flowSelector);

    await mount('lever',1150);await revealPanels('lever');await input('lever','percentIn').fill('100');await input('lever','percentOut').fill('100');
    const zero=await inspectFlow('lever',100,100);check(zero.filter(p=>p.part!=='useful').every(p=>p.value===0&&p.share===0&&/0/.test(p.text)),'Ideal stages explicitly label both zero losses');
    await shot('desktop-zero-loss','lever',flowSelector);
    await input('lever','question').selectOption('budgetTime');await input('lever','budget').fill('');
    check(await visual('lever','budget-invalid').count()===1&&await action('lever','check').isDisabled(),'Invalid budget still disables budget grading and shows a clear message');
    await inspectFlow('lever',100,100);await layout('lever','Invalid budget');
    await input('lever','percentIn').fill('0');
    check(await visual('lever','stage-map').count()===0&&await visual('lever','energy-split').count()===0&&await comparison('lever').count()===0,'Invalid physical inputs remove stale diagrams and calculated comparison');
    check(await input('lever','percentIn').getAttribute('aria-invalid')==='true','Invalid efficiency identifies its form control');
    await layout('lever','Invalid efficiency');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,observations,errors},null,2)+'\n');
    console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(error=>error.slice(0,1500))},null,2));if(errors.length)process.exitCode=1;await b.close();
  }
})();`;
bootstrap += "`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
