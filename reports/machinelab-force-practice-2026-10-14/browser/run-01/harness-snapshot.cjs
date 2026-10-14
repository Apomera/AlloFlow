// Native React/THREE QA for inverse-force calculations and direct practice entry.
// node dev-tools/ml_force_practice_entry_qa.cjs [out-dir]
const fs=require('fs'),path=require('path'),vm=require('vm');
let bootstrap=fs.readFileSync(path.join(__dirname,'ml_power_lab_qa.cjs'),'utf8');
bootstrap=bootstrap.slice(0,bootstrap.indexOf('  try{'))
  .replaceAll('reports/machinelab-power-lab-2026-10-11/browser','reports/machinelab-force-practice-2026-10-14/browser/run-01');
bootstrap+=String.raw`
  const observations=[],routes=[],startedAt=new Date().toISOString(),skills=['effortFromPower','loadFromPower'];
  const sha=value=>require('crypto').createHash('sha256').update(value).digest('hex');
  const baseline=require('child_process').execFileSync('git',['show','7e307c872:stem_lab/stem_tool_machinelab.js'],{encoding:'utf8',maxBuffer:5*1024*1024});
  const dependencies=['dev-tools/ml_force_practice_entry_qa.cjs','dev-tools/ml_power_lab_qa.cjs','dev-tools/ml_scene_shots.cjs','stem_lab/stem_lab_module.js','vendor/three-r128/three.min.js','vendor/three-r128/OrbitControls.js','desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'].map(file=>({file,sha256:sha(fs.readFileSync(file))}));
  const guide=kind=>lab(kind).locator('[data-ml-power-force-speed='+kind+']');
  const inverse=(kind,skill)=>guide(kind).locator('[data-ml-power-force-inverse='+skill+']');
  const entry=(kind,skill)=>inverse(kind,skill).locator('[data-ml-power-force-practice='+skill+']');
  const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  function checkpoint(label){fs.writeFileSync(path.join(OUT,'checkpoint.json'),JSON.stringify({label,checks:checks.length,routes,shots,errors},null,2)+'\n');console.log('force practice checkpoint',label,checks.length,'checks');}
  function expected(fixture,skill,percent=80,seconds=5,movement=.5){return skill==='effortFromPower'?{watts:fixture.load*movement/(percent/100)/seconds,speed:movement*fixture.ma/seconds,force:fixture.load/fixture.ma/(percent/100)}:{watts:fixture.load*movement/seconds,speed:movement/seconds,force:fixture.load};}
  function rounded(a,b){return Number.isFinite(a)&&Math.abs(a-b)<=Math.max(1e-10,Math.abs(b)*.000005);}
  function luminance(color){const a=color?.match(/[\d.]+/g)?.slice(0,3).map(Number);return a?.length===3?a.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0):NaN;}
  function contrast(a,b){a=luminance(a);b=luminance(b);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
  async function panels(kind){await open(lab(kind));await open(guide(kind));await settle();}
  async function inspect(fixture,percent=80,seconds=5,label=fixture.kind){
    const kind=fixture.kind;await settle();
    const cards=await guide(kind).locator('[data-ml-power-force-inverse]').evaluateAll(els=>els.map(el=>{const button=el.querySelector('[data-ml-power-force-practice]'),heading=document.getElementById(el.getAttribute('aria-labelledby')),help=document.getElementById(button.getAttribute('aria-describedby')),equation=el.querySelector('[data-ml-power-force-inverse-equation]');return{skill:el.dataset.mlPowerForceInverse,tag:el.tagName,row:el.closest('[data-ml-power-motion-row]')?.dataset.mlPowerMotionRow,heading:heading?.textContent,localHeading:el.contains(heading),uniqueHeading:heading&&document.querySelectorAll('[id="'+heading.id+'"]').length===1,equation:equation?.textContent,equationTag:equation?.tagName,equationCount:el.querySelectorAll('[data-ml-power-force-inverse-equation]').length,button:{type:button.type,text:button.textContent,skill:button.dataset.mlPowerForcePractice,count:el.querySelectorAll('[data-ml-power-force-practice]').length},help:help?.textContent,localHelp:el.contains(help),uniqueHelp:help&&document.querySelectorAll('[id="'+help.id+'"]').length===1,text:el.textContent};}));
    check(cards.length===2&&cards.map(c=>c.skill).join(',')===skills.join(','),label+': both inverse calculations appear once in input/output order');
    for(const card of cards){const p=expected(fixture,card.skill,percent,seconds),parts=card.equation?.match(/([\d.e+-]+) W\s*÷\s*\(([\d.e+-]+) m\/s\)\s*=\s*([\d.e+-]+) N/);
      check(parts&&['watts','speed','force'].every((key,i)=>rounded(Number(parts[i+1]),p[key])),label+': '+card.skill+' divides independently calculated matching power by speed to recover force');
      check(card.tag==='SECTION'&&card.heading&&card.localHeading&&card.uniqueHeading&&card.equationTag==='P'&&card.equationCount===1,label+': '+card.skill+' is a uniquely named section with one readable equation');
      check(card.row===(card.skill==='effortFromPower'?'input':'output')&&card.button.count===1&&card.button.skill===card.skill&&card.button.type==='button',label+': '+card.skill+' action belongs to the matching row and cannot submit a form');
      check(card.localHelp&&card.uniqueHelp&&/save|keep|kept/i.test(card.help)&&/do not apply/i.test(card.text)&&!/NaN|Infinity|undefined/.test(card.text),label+': '+card.skill+' has local draft help and explains efficiency handling');
      observations.push({label,kind,skill:card.skill,percent,seconds,expected:p,card});
    }
    if(kind==='ramp')check(/vertical rise.*not speed along the ramp/i.test(cards[1].text),label+': load calculation explicitly uses vertical rise rather than ramp-path speed');
  }
  async function visual(kind,label){
    const view=await guide(kind).evaluate(el=>{
      const style=n=>{const s=getComputedStyle(n);let p=n,bg;while(p){const v=getComputedStyle(p).backgroundColor,a=v.match(/[\d.]+/g)?.map(Number);if(a&&(a.length===3||a[3]>=.99)){bg=v;break;}p=p.parentElement;}return{font:parseFloat(s.fontSize),color:s.color,background:bg,border:s.borderStyle,borderColor:s.borderColor};};
      return{page:document.documentElement.scrollWidth<=innerWidth+1,panel:el.scrollWidth<=el.clientWidth+1,forced:matchMedia('(forced-colors:active)').matches,cards:Array.from(el.querySelectorAll('[data-ml-power-force-inverse]')).map(n=>{const b=n.querySelector('button'),e=n.querySelector('[data-ml-power-force-inverse-equation]'),r=b.getBoundingClientRect();return{skill:n.dataset.mlPowerForceInverse,cardStyle:style(n),equationStyle:style(e),buttonStyle:style(b),buttonHeight:r.height,buttonWidth:r.width,text:n.textContent};}),clipped:Array.from(el.querySelectorAll('button,p,h3,h4,dt,dd,summary,figure,figcaption,section')).filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+1).map(n=>({tag:n.tagName,text:n.textContent,width:n.clientWidth,scroll:n.scrollWidth}))};
    });
    check(view.page&&view.panel&&!view.clipped.length,label+': inverse calculations, actions and surrounding guide fit without horizontal clipping');
    for(const card of view.cards){check(contrast(card.equationStyle.color,card.equationStyle.background)>=4.5&&contrast(card.buttonStyle.color,card.buttonStyle.background)>=4.5,label+': '+card.skill+' equation and action have readable contrast');check(card.buttonHeight>=42&&card.buttonWidth>0,label+': '+card.skill+' action has a usable pointer target');}
    observations.push({kind,label,visual:view});return view;
  }
  async function focused(target,label){await target.focus();await pg.keyboard.press('Tab');await pg.keyboard.press('Shift+Tab');const f=await target.evaluate(el=>{const s=getComputedStyle(el);return{active:el===document.activeElement,visible:el.matches(':focus-visible'),outline:s.outlineStyle,width:parseFloat(s.outlineWidth)};});check(f.active&&f.visible&&f.outline!=='none'&&f.width>=3,label+': native keyboard focus is visible');observations.push({label,focus:f});}
  async function activate(kind,skill,label){await focused(entry(kind,skill),label);await pg.keyboard.press('Enter');await settle();check(await input(kind,'answer').evaluate(el=>el===document.activeElement),label+': real React commit leaves focus on the existing answer input');check(await guide(kind).evaluate(el=>el.open),label+': guide remains open after practice entry');}
  async function keepAttempt(kind,skill,status,label){const before=await state();check((await entry(kind,skill).textContent()).startsWith('Continue'),label+': active skill action offers to continue');await activate(kind,skill,label);check(JSON.stringify(await state())===JSON.stringify(before),label+': same-skill entry preserves the exact draft and every saved record');await result(kind,status);}
  async function changeSkill(kind,skill,label){
    const before=await state(),draft=before.benchPower?.[kind];check((await entry(kind,skill).textContent()).startsWith('Practise'),label+': inactive skill action offers practice');await activate(kind,skill,label);const after=await state(),current=after.benchPower[kind];
    check(await input(kind,'question').inputValue()===skill&&current.question===skill,label+': selects the requested existing force question');await resetPractice(kind);
    const ordinary=['question','answer','unit','hint','checked','revealed','signature'];check(!draft||Object.keys(draft).filter(key=>!ordinary.includes(key)).every(key=>JSON.stringify(current[key])===JSON.stringify(draft[key])),label+': switching changes only ordinary draft fields and keeps task assumptions');
    check(await sameExcept(before,['benchPower'])&&Object.keys(before.benchPower||{}).filter(key=>key!==kind).every(key=>JSON.stringify(after.benchPower[key])===JSON.stringify(before.benchPower[key])),label+': switching preserves saved records, other drafts and unrelated state');
  }
  async function exercise(fixture,skill,percent=80,seconds=5,label=fixture.kind){
    const kind=fixture.kind,p=expected(fixture,skill,percent,seconds);await changeSkill(kind,skill,label+' '+skill+' entry');
    await solve(kind,p.force,'W');await result(kind,'unit');check(await action(kind,'save').isDisabled(),label+': '+skill+' rejects watts as a force answer');
    await solve(kind,Number(p.force.toPrecision(6)),'N');await result(kind,'correct');await press(action(kind,'hint'));await press(action(kind,'hint'));await keepAttempt(kind,skill,'correct',label+' '+skill+' checked');
    await press(action(kind,'save'));let record=(await state()).benchPowerRecords[kind][skill];check(record.version===4&&record.completion==='checked'&&record.hint===2&&record.unit==='N',label+': '+skill+' saves an ordinary checked version4 force record');
    await press(action(kind,'reveal'));await result(kind,'solution');await keepAttempt(kind,skill,'solution',label+' '+skill+' viewed');await press(action(kind,'save'));record=(await state()).benchPowerRecords[kind][skill];check(record.completion==='solution'&&record.hint===2,label+': '+skill+' retains viewed-solution provenance when saved');
  }
  async function shot(name,kind,phone=false){
    const target=phone?inverse(kind,'effortFromPower'):guide(kind);await pg.evaluate(()=>document.fonts.ready);await target.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await settle();
    const clip=await target.evaluate(el=>{const a=el.getBoundingClientRect();return{x:Math.max(0,a.x+scrollX-3),y:Math.max(0,a.y+scrollY-3),width:Math.min(innerWidth,a.width+6),height:Math.ceil(a.height+6)};});
    await pg.screenshot({path:path.join(OUT,name+'.png'),fullPage:true,clip,animations:'disabled',caret:'hide'});shots.push({name,file:name+'.png',sha256:sha(fs.readFileSync(path.join(OUT,name+'.png'))),clip,region:phone?'effort inverse panel':'complete guide'});checkpoint(name);
  }
  try{
    for(const fixture of fixtures){const kind=fixture.kind,other=kind==='screw'?'lever':'screw';await mount(kind,1150,{}, {benchPower:{[other]:{answer:'Keep other draft'}}});await panels(kind);await inspect(fixture);await visual(kind,kind+' desktop');
      await solve(kind,physical(fixture).expected.inputPower,'W');await result(kind,'correct');await press(action(kind,'save'));const legacy=JSON.stringify((await state()).benchPowerRecords[kind].inputPower);await input(kind,'answer').fill('123.45');await press(action(kind,'hint'));await press(action(kind,'reveal'));
      for(const skill of skills)await exercise(fixture,skill);
      check(JSON.stringify((await state()).benchPowerRecords[kind].inputPower)===legacy&&await recordsPreserved(),kind+': both direct force exercises retain the earlier power record and unrelated evidence');
      if(kind==='windlass')await shot('desktop-force-practice',kind);
      const fixed=JSON.stringify((await state()).benchPowerRecords);await input(kind,'duration').fill('2');await input(kind,'timeUnit').selectOption('min');await input(kind,'percent').fill('37.5');await inspect(fixture,37.5,120,kind+' converted minutes');
      for(const skill of skills){if(await input(kind,'question').inputValue()===skill)await input(kind,'question').selectOption('inputPower');await changeSkill(kind,skill,kind+' changed task '+skill);await solve(kind,expected(fixture,skill,37.5,120).force,'N');await result(kind,'correct');}
      check(JSON.stringify((await state()).benchPowerRecords)===fixed&&await recordsPreserved(),kind+': nondefault minute and efficiency practice preserves prior saved snapshots');
      if(kind==='lever')for(const [field,bad,good] of [['duration','','2'],['percent','0','37.5'],['budget','0','100']]){await input(kind,field).fill(bad);check(await guide(kind).count()===0&&await lab(kind).locator('[data-ml-power-force-practice]').count()===0&&await action(kind,'check').count()===0,'Invalid '+field+' hides inverse values, entry actions and grading');await input(kind,field).fill(good);await panels(kind);check(JSON.stringify((await state()).benchPowerRecords)===fixed,'Repairing '+field+' preserves every saved force record');}
      routes.push(kind);checkpoint(kind+' complete');
    }
    for(const [kind,theme,label] of [['screw',{dark:true},'dark-phone'],['windlass',{contrast:true},'forced-colors-phone'],['lever',{},'large-text-phone']]){const fixture=fixtures.find(f=>f.kind===kind);await mount(kind,320,theme);await panels(kind);
      if(label==='large-text-phone')await guide(kind).evaluate(el=>{const nodes=Array.from(el.querySelectorAll('*')).filter(n=>Array.from(n.childNodes).some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())),sizes=nodes.map(n=>parseFloat(getComputedStyle(n).fontSize));nodes.forEach((n,i)=>n.style.setProperty('font-size',sizes[i]*2+'px','important'));});
      await inspect(fixture,80,5,label);await visual(kind,label);await activate(kind,'effortFromPower',label+' effort entry');await solve(kind,expected(fixture,'effortFromPower').force,'N');await result(kind,'correct');await keepAttempt(kind,'effortFromPower','correct',label+' effort continue');await visual(kind,label+' after React update');await shot(label+'-force-practice',kind,true);
    }
    check(routes.length===6&&new Set(routes).size===6,'All six inverse-force practice routes exercised');
  }catch(e){errors.push(String(e&&e.stack||e));process.exitCode=1;}
  finally{fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),sourceSha256:sha(tool),baselineSha256:sha(baseline),dependencies,scenarios:mountedScenarios,checks,shots,routes,observations,errors},null,2)+'\n');console.log(JSON.stringify({scenarios:mountedScenarios,checks:checks.length,routes:routes.length,screenshots:shots.length,errors:errors.map(e=>e.slice(0,1600))},null,2));if(errors.length)process.exitCode=1;await b.close();}
})();`;
bootstrap+="`;\nvm.runInThisContext('(function(require){'+source+'\\n})',{filename:__filename})(require);";
vm.runInThisContext('(function(require,__dirname,__filename){'+bootstrap+'\n})',{filename:__filename})(require,__dirname,__filename);
