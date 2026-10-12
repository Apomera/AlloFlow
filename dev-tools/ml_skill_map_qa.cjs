// Native React/THREE QA for the power practice skill map.
const fs=require('fs'),path=require('path'),vm=require('vm');
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-skill-map-2026-10-12/browser/run-01');
bootstrap+=String.raw`
  const observations=[];
  const core=['inputPower','usefulPower','lossPower','handSpeed','loadSpeed','budgetTime'];
  const planning=['budgetEnergy','budgetLoad','budgetMovement','requiredEfficiency'];
  const rotation=['turns','angularTravel','omega','rotationalWork','rotationalPower'];
  const skillUnits={inputPower:'W',usefulPower:'W',lossPower:'W',handSpeed:'m/s',loadSpeed:'m/s',budgetTime:'s',torque:'N·m',rpm:'rpm',budgetEnergy:'J',budgetLoad:'N',budgetMovement:'m',requiredEfficiency:'%',turns:'turns',angularTravel:'rad',omega:'rad/s',rotationalWork:'J',rotationalPower:'W'};
  const map=kind=>lab(kind).locator('[data-ml-power-skill-map='+kind+']');
  const skill=(kind,key)=>map(kind).locator('[data-ml-power-skill='+key+']');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  async function openMap(kind){await open(lab(kind));await open(map(kind));await settle();}
  async function status(kind,key,completion,setup){
    const node=skill(kind,key);
    check(await node.getAttribute('data-ml-power-skill-status')===completion,kind+': '+key+' has '+completion+' saved provenance');
    check(await node.getAttribute('data-ml-power-skill-setup')===setup,kind+': '+key+' identifies '+setup+' task settings');
    if(completion!=='unsaved')check((await node.textContent()).toLowerCase().includes(completion==='solution'?'solution':'checked'),kind+': '+key+' saved provenance is readable without color');
  }
  async function selected(kind,key){
    check(await input(kind,'question').inputValue()===key&&await skill(kind,key).getAttribute('aria-pressed')==='true',kind+': map and existing selector agree on '+key);
    check(await map(kind).locator('[data-ml-power-skill][aria-pressed=true]').count()===1,kind+': exactly one current skill is identified');
    check((await skill(kind,key).textContent()).includes('Current skill'),kind+': active skill is identified by visible text as well as its border');
  }
  async function counts(kind,saved,checked,solutions){
    const counter=map(kind).locator('[data-ml-power-map-saved]');
    check(await counter.getAttribute('data-ml-power-map-saved')===String(saved)&&await counter.getAttribute('data-ml-power-map-checked')===String(checked)&&await counter.getAttribute('data-ml-power-map-solutions')===String(solutions),kind+': saved collection separates '+checked+' checked records and '+solutions+' viewed solutions');
  }
  async function selectSkill(kind,key,keyboard='Enter'){
    const before=await state();await skill(kind,key).focus();await pg.keyboard.press(keyboard);await settle();await selected(kind,key);
    check(await skill(kind,key).evaluate(el=>el===document.activeElement),kind+': keyboard selection retains focus on its skill tile');
    check(await sameExcept(before,['benchPower']),kind+': selecting '+key+' leaves simulation and saved records untouched');
  }
  async function inspect(kind){
    await settle();const fixture=fixtures.find(f=>f.kind===kind),expected=core.concat(fixture.radius?['torque','rpm']:[],planning,fixture.radius?rotation:[]);
    const actual=await map(kind).locator('[data-ml-power-skill]').evaluateAll(nodes=>nodes.map(el=>({kind:el.dataset.mlPowerSkill,text:el.textContent,tag:el.tagName,type:el.type,pressed:el.getAttribute('aria-pressed'),status:el.dataset.mlPowerSkillStatus,setup:el.dataset.mlPowerSkillSetup,live:!!el.closest('[aria-live]')})));
    check(actual.length===expected.length&&new Set(actual.map(a=>a.kind)).size===expected.length&&expected.every(k=>actual.some(a=>a.kind===k)),kind+': map includes every supported skill exactly once');
    check(actual.every(a=>a.tag==='BUTTON'&&a.type==='button'&&['true','false'].includes(a.pressed)&&!a.live),kind+': skills are ordinary accessible buttons without a redundant live region');
    const families=await map(kind).locator('[data-ml-power-skill-family]').evaluateAll(nodes=>nodes.map(el=>({key:el.dataset.mlPowerSkillFamily,heading:el.querySelector('h3,h4,h5,h6')?.textContent,skills:Array.from(el.querySelectorAll('[data-ml-power-skill]')).map(b=>b.dataset.mlPowerSkill)})));
    check(families.map(f=>f.key).join(',')===(fixture.radius?'power,motion,planning,rotation':'power,motion,planning'),kind+': relevant skill families are shown in learning order');
    check(families.every(f=>f.heading&&f.skills.length)&&families.flatMap(f=>f.skills).length===expected.length,kind+': each skill family has a visible heading and contains its skills');
    for(const entry of actual)check(entry.text.includes(skillUnits[entry.kind]),kind+': '+entry.kind+' shows its answer unit');
    const selector=await input(kind,'question').locator('option').evaluateAll(nodes=>nodes.map(el=>({kind:el.value,label:el.textContent})));
    check(selector.every(s=>actual.find(a=>a.kind===s.kind)?.text.includes(s.label)),kind+': short map labels agree with the existing selector');
    observations.push({kind,actual,families});return actual;
  }
  async function layout(kind,label){
    const boxes=await map(kind).evaluate(el=>{const r=el.getBoundingClientRect();return{page:document.documentElement.scrollWidth,viewport:innerWidth,panelWidth:el.clientWidth,panelScroll:el.scrollWidth,box:{left:r.left,right:r.right},children:Array.from(el.querySelectorAll('button,summary,h3,h4,h5,h6')).filter(n=>n.getClientRects().length).map(n=>{const b=n.getBoundingClientRect();return{tag:n.tagName,text:n.textContent,width:n.clientWidth,scroll:n.scrollWidth,left:b.left,right:b.right,height:b.height};})};});
    check(boxes.page<=boxes.viewport+1&&boxes.panelScroll<=boxes.panelWidth+1&&boxes.box.left>=-.1&&boxes.box.right<=boxes.viewport+.1&&boxes.children.every(b=>b.scroll<=b.width+1&&b.left>=boxes.box.left-.1&&b.right<=boxes.box.right+.1),label+': map headings, labels and buttons fit without clipping');
    check(boxes.children.filter(b=>b.tag==='BUTTON').every(b=>b.height>=44),label+': skill buttons provide touch targets at least 44 pixels high');
    observations.push({label,boxes});
  }
  async function keyboard(kind,label){
    const controls=map(kind).locator('summary:visible,button:visible');let labelled=true,focused=true,outlined=true;
    for(let i=0;i<await controls.count();i++){const node=controls.nth(i);await node.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');const v=await node.evaluate(el=>{const s=getComputedStyle(el);return{focus:el===document.activeElement,outline:el.matches(':focus-visible')&&s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0,label:!!el.textContent.trim()};});labelled=labelled&&v.label;focused=focused&&v.focus;outlined=outlined&&v.outline;}
    check(labelled&&focused&&outlined,label+': all map controls have names and visible keyboard focus');
  }
  async function shot(name,kind,family){await layout(kind,name);const target=family?map(kind).locator('[data-ml-power-skill-family='+family+']'):map(kind);await target.scrollIntoViewIfNeeded();await settle();await target.screenshot({path:path.join(OUT,name+'.png')});shots.push(name);}
  try{
    await mount('windlass');await open(lab('windlass'));const untouched=await state();
    check(!await map('windlass').evaluate(el=>el.open),'Skill map starts as a closed native disclosure');await open(map('windlass'));
    check(await sameExcept(untouched),'Opening the skill map does not write state');await inspect('windlass');
    const initial=await map('windlass').locator('[data-ml-power-skill]').evaluateAll(nodes=>nodes.every(el=>el.dataset.mlPowerSkillStatus==='unsaved'&&el.dataset.mlPowerSkillSetup==='none'));
    check(initial,'Fresh skill map identifies every skill as unsaved');await selected('windlass','inputPower');await counts('windlass',0,0,0);
    await input('windlass','answer').fill('50');await input('windlass','unit').selectOption('W');await press(action('windlass','hint'));await press(action('windlass','check'));await result('windlass','correct');
    const activeDraft=await state();await skill('windlass','inputPower').focus();await pg.keyboard.press('Space');check(await sameExcept(activeDraft),'Activating the current skill preserves answer, hints and checked feedback without a state write');
    await status('windlass','inputPower','unsaved','none');await press(action('windlass','save'));await status('windlass','inputPower','checked','current');
    check(/1\s*\/\s*2/.test(await skill('windlass','inputPower').textContent()),'Checked map card retains one opened hint');
    await selectSkill('windlass','torque','Space');await resetPractice('windlass');await press(action('windlass','hint'));await press(action('windlass','hint'));await press(action('windlass','reveal'));await press(action('windlass','save'));
    await status('windlass','torque','solution','current');check(/2\s*\/\s*2/.test(await skill('windlass','torque').textContent()),'Solution map card retains two opened hints');await counts('windlass',2,1,1);
    const fixed=JSON.stringify((await state()).benchPowerRecords);await keyboard('windlass','Desktop skill map');await shot('desktop-windlass-skill-map','windlass');
    await input('windlass','duration').fill('10');await status('windlass','inputPower','checked','earlier');await status('windlass','torque','solution','earlier');
    check((await skill('windlass','inputPower').textContent()).toLowerCase().includes('earlier'),'Earlier task is distinguished with visible text');
    await input('windlass','duration').fill('5');await status('windlass','inputPower','checked','current');
    await input('windlass','question').selectOption('angularTravel');await selected('windlass','angularTravel');await press(action('windlass','next'));await selected('windlass','omega');
    check(JSON.stringify((await state()).benchPowerRecords)===fixed,'Map navigation, legacy selector and Next retain fixed saved snapshots');
    await input('windlass','duration').fill('');check(await map('windlass').count()===0,'Invalid assumptions remove the interactive skill map with the practice form');await input('windlass','duration').fill('5');await openMap('windlass');await status('windlass','torque','solution','current');
    check(JSON.stringify((await state()).benchPowerRecords)===fixed&&await recordsPreserved(),'Repairing invalid assumptions preserves all skill and unrelated evidence');

    await mount('screw',320,{dark:true});await openMap('screw');await inspect('screw');
    await selectSkill('screw','turns');await solve('screw',100,'turns');await result('screw','correct');await press(action('screw','save'));await status('screw','turns','checked','current');
    await selectSkill('screw','rotationalPower');await press(action('screw','reveal'));await press(action('screw','save'));await status('screw','rotationalPower','solution','current');await counts('screw',2,1,1);
    const phoneRecords=JSON.stringify((await state()).benchPowerRecords);await input('screw','budget').fill('200');await status('screw','turns','checked','earlier');await status('screw','rotationalPower','solution','earlier');
    check(JSON.stringify((await state()).benchPowerRecords)===phoneRecords,'Phone map marks changed budget without replacing saved snapshots');
    await selectSkill('screw','omega');await keyboard('screw','Dark phone skill map');await shot('dark-phone-screw-skill-map','screw','rotation');check(await recordsPreserved(),'Phone practice preserves unrelated saved evidence');

    const windlassRecords=JSON.parse(fixed);await mount('windlass',320,{contrast:true},{benchPowerRecords:windlassRecords});await openMap('windlass');await inspect('windlass');
    await status('windlass','inputPower','checked','current');await status('windlass','torque','solution','current');await selectSkill('windlass','torque');
    const forced=await skill('windlass','torque').evaluate(el=>{const s=getComputedStyle(el);return{forced:matchMedia('(forced-colors: active)').matches,pressed:el.getAttribute('aria-pressed'),text:el.textContent,border:s.borderStyle,borderWidth:s.borderWidth,color:s.color,background:s.backgroundColor};});
    check(forced.forced&&forced.pressed==='true'&&forced.border!=='none'&&parseFloat(forced.borderWidth)>0,'Forced colors retains the current skill border and pressed state');observations.push({forced});await keyboard('windlass','Forced-colors skill map');await shot('forced-colors-windlass-skill-map','windlass','rotation');

    const malformed={version:1,benchId:'lever',settings:lever,percent:80,seconds:5,budget:100,question:'inputPower',answer:'99999',unit:'W',hint:1,completion:'checked'};
    await mount('lever',320,{}, {benchPowerRecords:{...windlassRecords,lever:{inputPower:malformed,usefulPower:{...malformed,question:'usefulPower',answer:'40',hint:3},lossPower:{...malformed,question:'lossPower',answer:'10',version:99}}}});const corrupted=await state();await openMap('lever');await inspect('lever');
    for(const k of ['inputPower','usefulPower','lossPower'])await status('lever',k,'unsaved','none');await counts('lever',0,0,0);
    check(await sameExcept(corrupted),'Reading malformed saved entries does not silently mutate state');await selectSkill('lever','budgetMovement');await resetPractice('lever');await layout('lever','Linear phone skill map');
    check(JSON.stringify((await state()).benchPowerRecords.windlass)===JSON.stringify(windlassRecords.windlass),'Linear navigation preserves another station’s saved records');
    await mount('ramp',390);await openMap('ramp');await inspect('ramp');check((await skill('ramp','loadSpeed').textContent()).includes('Vertical rise')&&(await skill('ramp','budgetMovement').textContent()).includes('Rise at budget'),'Ramp map uses vertical rise labels');await layout('ramp','Ramp phone skill map');
    await mount('pulley');await openMap('pulley');await inspect('pulley');check(await recordsPreserved(),'Pulley skill map preserves existing saved evidence');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({sourceSha256:require('crypto').createHash('sha256').update(tool).digest('hex'),scenarios:mountedScenarios,checks,shots,observations,errors},null,2)+'\n');console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1400))},null,2));if(errors.length)process.exitCode=1;await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
