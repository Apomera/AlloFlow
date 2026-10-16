// Native React/THREE checks for the compound stage-route diagram.
const fs=require('fs'),path=require('path'),vm=require('vm');
const report=path.resolve(process.argv[2]),temp=path.join(report,'browser-temp');fs.mkdirSync(temp,{recursive:true});
process.env.TEMP=temp;process.env.TMP=temp;process.env.PLAYWRIGHT_BROWSERS_PATH=process.env.PLAYWRIGHT_BROWSERS_PATH||'C:/Users/cabba/AppData/Local/ms-playwright';
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');
source=source.slice(0,source.indexOf('  const manifest = [];'))
 .replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2]);")
 .replace('deviceScaleFactor: 2','deviceScaleFactor: 1')
 .replace('const b = await chromium.launch(','let b = await chromium.launch(')
 .replace('const pg = await b.newPage(','let pg = await b.newPage(')
 .replace('var ctx = {','window.__qaState=pair[0].machineLab; var ctx = {');
source+=String.raw`
 const checks=[],observations=[],shots=[],startedAt=new Date().toISOString();
 const hash=file=>require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_compound_stage_map_visual_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)}));
 const fixtures=[{kind:'lever',load:400},{kind:'pulley',load:400},{kind:'windlass',load:400},{kind:'ramp',load:400},{kind:'wedge',load:800},{kind:'screw',load:2000}];
 const names={lever:'Lever',pulley:'Pulley',windlass:'Wheel & Axle',ramp:'Inclined Plane',wedge:'Wedge',screw:'Screw'};
 const energyRecord={version:1,benchId:'lever',second:'pulley',inputSettings:{leverEffortArm:2,leverLoadArm:1},outputSettings:{pulleySegments:2},load:400,loadDistance:.5,percentIn:80,percentOut:90,question:'inputWork',answer:'277.78',unit:'J',explanation:'Preserve my earlier energy calculation.',hint:1,completion:'checked'};
 const preserved={designReflection:'Keep this explanation.',benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}},benchCompoundRecords:{lever:{inputWork:energyRecord}}};
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const numeric=value=>value.toLocaleString('en-US',{useGrouping:false,maximumSignificantDigits:6});
 const lab=kind=>pg.locator('[data-ml-compound='+kind+']'),compare=kind=>lab(kind).locator('[data-ml-compound-comparison]');
 const panel=kind=>lab(kind).locator('[data-ml-compound-stage-map]');
 const input=(kind,key)=>pg.locator('#ml-compound-'+key+'-'+kind),action=(kind,key)=>lab(kind).locator('[data-ml-compound-'+key+']');
 const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=()=>pg.evaluate(()=>window.__qaState);
 async function press(target){await target.focus();await pg.keyboard.press('Enter');}
 async function open(target){if(!await target.evaluate(n=>n.open))await press(target.locator(':scope>summary'));}
 let mounts=0;
 async function mount(kind,width=1180,theme={},extra={}){
  if(mounts++){
   await b.close();b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});pg=await b.newPage({viewport:{width,height:1100},deviceScaleFactor:1});
   pg.on('pageerror',e=>errors.push(String(e&&e.message||e)));pg.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
   await pg.goto('file://'+pagePath.replace(/\\/g,'/'));await pg.waitForFunction(()=>window.__mlReady?.()&&window.THREE?.OrbitControls&&window.StemLab?.makeOrbitViewer);
  }
  await pg.setViewportSize({width,height:1100});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',shopMotionProgress:.5,...preserved,...extra}),{band:'g68',...theme}]);
  await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();await pg.waitForFunction(()=>{const c=document.querySelector('.ml-shop-bay canvas');if(!c||!c.width||!c.height)return false;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl&&!gl.isContextLost();});await settle();
  check(true,kind+' mount '+mounts+': real THREE canvas initialized');
  check(await pg.locator('.ml-station-chooser [data-ml-bench-preview]').evaluateAll(ns=>ns.length===6&&ns.every(n=>{const r=n.getBoundingClientRect();return r.width===60&&r.height===60;})),kind+' mount '+mounts+': chooser previews keep their original sixty-pixel size');console.log('native mount',mounts,kind);
 }
 async function route(kind,second,load,distance=.5,p1=80,p2=90,label=kind){
  await panel(kind).scrollIntoViewIfNeeded();await settle();
  const data=await panel(kind).evaluate(el=>({tag:el.tagName,caption:el.querySelector(':scope>figcaption')?.textContent.trim(),list:el.querySelector(':scope>ol')?.tagName,children:[...el.querySelector(':scope>ol').children].map(n=>({tag:n.tagName,key:n.dataset.mlCompoundFlowNode})),nodes:[...el.querySelectorAll('[data-ml-compound-flow-node]')].map(n=>({key:n.dataset.mlCompoundFlowNode,text:n.innerText,preview:n.querySelector('[data-ml-bench-preview]')?.dataset.mlBenchPreview})),live:el.matches('[role],[aria-live]')||!!el.querySelector('[role],[aria-live]'),focusable:[...el.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(n=>!n.disabled&&n.tabIndex>=0).length,svgs:[...el.querySelectorAll('svg')].map(n=>({hidden:!!n.closest('[aria-hidden=true]'),focusable:n.getAttribute('focusable'),preview:n.dataset.mlBenchPreview||null,paths:[...n.querySelectorAll('path')].map(p=>p.getAttribute('d'))}))}));
  observations.push({label,kind,second,load,distance,p1,p2,route:data});
  check(data.tag==='FIGURE'&&data.caption==='Two stages, one final task'&&data.list==='OL',label+': canonical native figure caption and ordered route');
  check(JSON.stringify(data.children)===JSON.stringify([{tag:'LI',key:'input'},{tag:'LI',key:'output'},{tag:'LI',key:'task'}])&&data.nodes.length===3,label+': exactly three direct input, output and final-task list items');
  const first=data.nodes[0],last=data.nodes[1],task=data.nodes[2];
  check(first.text.includes('Input stage:')&&first.text.includes(names[kind])&&first.text.includes(String(p1)+'%')&&first.text.includes('efficiency')&&first.preview===kind,label+': input stage has accurate machine, preview and raw efficiency');
  check(last.text.includes('Output stage:')&&last.text.includes(names[second])&&last.text.includes(String(p2)+'%')&&last.text.includes('efficiency')&&last.preview===second,label+': output stage has accurate machine, preview and raw efficiency');
  check(task.text.includes('Final task')&&task.text.includes(numeric(load)+' N')&&task.text.includes(numeric(distance)+' m')&&task.text.includes(second==='ramp'?'vertical rise':'movement'),label+': final load and movement use the workshop task with correct direction wording');
  check(!data.live&&data.focusable===0,label+': read-only figure introduces no live roles or keyboard stops');
  check(data.svgs.length===5&&data.svgs.every(s=>s.hidden&&s.focusable==='false'),label+': two machine icons, two connections and target are decorative and unfocusable');
  const readings=await panel(kind).evaluate(el=>({efficiencies:[...el.querySelectorAll('[data-ml-compound-stage-efficiency]')].map(n=>({text:n.textContent,term:n.previousElementSibling?.textContent,paired:n.parentElement.tagName==='DL'&&n.previousElementSibling?.tagName==='DT'})),task:[...el.querySelectorAll('[data-ml-compound-task-value]')].map(n=>({key:n.dataset.mlCompoundTaskValue,text:n.textContent,term:n.previousElementSibling?.textContent,paired:n.parentElement.tagName==='DL'&&n.previousElementSibling?.tagName==='DT'})),guide:el.querySelector(':scope>p')?.textContent,connectors:[...el.querySelectorAll('[data-ml-compound-stage-connector]')].map(n=>({parent:n.parentElement.dataset.mlCompoundFlowNode,path:n.querySelector('path')?.getAttribute('d')}))}));
  observations.push({label,readings});
  check(readings.efficiencies.length===2&&readings.efficiencies.every((r,i)=>r.paired&&r.term==='efficiency'&&r.text===String(i?p2:p1)+'%'),label+': both raw efficiencies have direct native definition labels');
  check(readings.task.length===2&&readings.task.every(r=>r.paired&&r.text===numeric(r.key==='load'?load:distance)+(r.key==='load'?' N':' m'))&&readings.task[0].term==='Final load'&&readings.task[1].term===(second==='ramp'?'vertical rise':'movement'),label+': task values retain accurate direct definition labels and units');
  check(readings.guide.includes('Machine symbols identify each mechanism')&&readings.guide.includes('use the settings above for its geometry')&&JSON.stringify(readings.connectors.map(c=>c.parent))===JSON.stringify(['input','output'])&&readings.connectors.every(c=>c.path==='M4 12H20 M14 6L20 12L14 18'),label+': symbols are explained and right-pointing arrow paths belong only to the first two cards');
  return data;
 }
 async function layout(kind,label,doubled=false){
  const data=await panel(kind).evaluate(el=>{
   const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
   const rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number),lum=c=>rgb(c).slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
   const background=n=>{let p=n,bg=getComputedStyle(p).backgroundColor;while(rgb(bg)[3]===0&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}return bg;};
   const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   const nodes=[...el.querySelectorAll('[data-ml-compound-flow-node]')];
   const text=[...el.querySelectorAll('figcaption,span,strong,p,dt,dd')].filter(n=>[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())).map(n=>({text:n.textContent.trim(),size:parseFloat(getComputedStyle(n).fontSize),contrast:contrast(getComputedStyle(n).color,background(n)),rect:rect(n)}));
   const sizes=selector=>[...el.querySelectorAll(selector)].map(n=>parseFloat(getComputedStyle(n).fontSize));
   const type={names:sizes('[data-ml-compound-stage-name]'),efficiencies:sizes('[data-ml-compound-stage-efficiency]'),load:sizes('[data-ml-compound-task-value=load]'),movement:sizes('[data-ml-compound-task-value=movement]'),terms:sizes('dt')};
   const cards=nodes.map(n=>{const label=n.querySelector(':scope>p'),style=getComputedStyle(label);return{key:n.dataset.mlCompoundFlowNode,rect:rect(n),art:rect(n.querySelector('.ml-compound-stage-art')),preview:n.querySelector('[data-ml-bench-preview]')?rect(n.querySelector('[data-ml-bench-preview]')):null,header:{rect:rect(label),gap:style.columnGap,text:label.textContent,children:[...label.children].map(c=>({text:c.textContent,rect:rect(c),fontSize:getComputedStyle(c).fontSize}))}};});
   const arrows=nodes.slice(0,2).map(n=>{const a=n.querySelector('svg:not([data-ml-bench-preview])'),m=a.getScreenCTM();return{rect:rect(a),matrix:{a:m.a,b:m.b,c:m.c,d:m.d},color:getComputedStyle(a).color,contrast:contrast(getComputedStyle(a).color,background(el))};});
   const iconStrokes=[...el.querySelectorAll('.ml-compound-stage-art svg *')].map(n=>({color:getComputedStyle(n).stroke,contrast:contrast(getComputedStyle(n).stroke,background(n.closest('.ml-compound-stage-art')))}));
   const panelStyle=getComputedStyle(el),contentWidth=el.clientWidth-parseFloat(panelStyle.paddingLeft)-parseFloat(panelStyle.paddingRight);
   return{viewport:innerWidth,contentWidth,pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,panel:rect(el),clipped:[...el.querySelectorAll('figcaption,span,strong,p,dt,dd')].filter(n=>n.clientWidth&&n.scrollWidth>n.clientWidth+1).map(n=>n.textContent),text,type,cards,arrows,iconStrokes,target:rect(el.querySelector('[data-ml-compound-task-symbol]'))};
  });
  observations.push({label,layout:data});check(data.pageFits&&data.panelFits&&!data.clipped.length,label+': no clipped text or horizontal overflow');
  const expectedScale=doubled?2:1,textSize=(fragment,size)=>data.text.some(t=>t.text===fragment&&t.size>=size*expectedScale);
  check(textSize('Two stages, one final task',20)&&data.text.filter(t=>t.text==='Input stage:'||t.text==='Output stage:'||t.text==='Final task').every(t=>t.size>=14*expectedScale),label+': caption and stage labels retain clear hierarchy');
  check(data.type.names.length===2&&data.type.names.every(n=>n>=18*expectedScale)&&data.type.efficiencies.length===2&&data.type.efficiencies.every(n=>n>=24*expectedScale)&&data.type.load[0]>=24*expectedScale&&data.type.movement[0]>=18*expectedScale&&data.type.terms.length===4&&data.type.terms.every(n=>n>=14*expectedScale),label+': machine names, efficiencies, task values and definition terms retain enlarged typography');
  check(data.cards.slice(0,2).every(c=>c.preview.width>=72&&c.preview.height>=72),label+': both machine previews remain enlarged');
  check(data.target.width>=72&&data.target.height>=72&&data.iconStrokes.every(s=>s.contrast>=3),label+': enlarged target and every machine icon stroke remain visible');
  check(data.text.every(t=>t.contrast>=4.5)&&data.arrows.every(a=>a.contrast>=3),label+': text and connections remain visible in the active palette');
  const stacked=data.viewport<=600||data.contentWidth<=500;
  check(stacked?data.cards.every((c,i)=>!i||c.rect.top>=data.cards[i-1].rect.bottom)&&Math.max(...data.cards.map(c=>c.rect.left))-Math.min(...data.cards.map(c=>c.rect.left))<=1:data.cards.every((c,i)=>!i||c.rect.left>=data.cards[i-1].rect.right),label+': route orientation fits both the viewport and available panel width');
  if(!stacked)check(Math.max(...data.cards.map(c=>c.art.top))-Math.min(...data.cards.map(c=>c.art.top))<=1,label+': artwork tops align across all three horizontal cards');
  for(let i=0;i<2;i++){
   const here=data.cards[i].rect,next=data.cards[i+1].rect,a=data.arrows[i],r=a.rect,m=a.matrix;
   const fits=stacked?r.top>=here.bottom-1&&r.bottom<=next.top+1&&r.left>=data.panel.left-1&&r.right<=data.panel.right+1:r.left>=here.right-1&&r.right<=next.left+1&&r.top>=here.top-1&&r.bottom<=here.bottom+1;
   const direction=stacked?m.b>0&&Math.abs(m.a)<.001:m.a>0&&Math.abs(m.b)<.001;
   check(fits&&direction,label+': connection '+(i+1)+' points '+(stacked?'down':'right')+' within the gap between adjacent cards');
  }
 }
 async function shot(kind,name){await panel(kind).screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});}
 async function fixedWork(label){check(await pg.evaluate(expected=>window.__qaState.designReflection===expected.designReflection&&JSON.stringify(window.__qaState.benchPower)===JSON.stringify(expected.benchPower)&&JSON.stringify(window.__qaState.benchCompoundRecords.lever.inputWork)===JSON.stringify(expected.benchCompoundRecords.lever.inputWork),preserved),label+': prior energy record, single-machine draft and explanation preserved');}
 try{
  for(const fixture of fixtures){
   const kind=fixture.kind;await mount(kind);const initial=JSON.stringify(await state());check(!await lab(kind).evaluate(n=>n.open),kind+': optional lab starts closed');await open(lab(kind));check(!await compare(kind).evaluate(n=>n.open),kind+': native comparison starts closed');await open(compare(kind));
   check(JSON.stringify(await state())===initial,kind+': opening native disclosures does not change task state');
   await route(kind,kind==='pulley'?'lever':'pulley',fixture.load);await fixedWork(kind);
   if(kind==='lever'){
    await layout(kind,'Desktop stage route');await shot(kind,'desktop-compound-stage-map');
    for(const width of [601,900]){await pg.setViewportSize({width,height:1100});await panel(kind).scrollIntoViewIfNeeded();await settle();await layout(kind,width+'px responsive stage route');if(width===900)await shot(kind,'narrow-desktop-compound-stage-map');}await pg.setViewportSize({width:1180,height:1100});await panel(kind).scrollIntoViewIfNeeded();await settle();
    await input(kind,'question').selectOption('inputPower');await input(kind,'answer').fill(String(400*.5/(.8*.9)/5));await input(kind,'unit').selectOption('W');await input(kind,'answer').focus();await pg.keyboard.press('Enter');
    check(await action(kind,'result').getAttribute('data-ml-compound-result')==='correct','Independent power calculation remains checkable');await input(kind,'explanation').fill('Follow input through both stages to the same final load.');await press(action(kind,'save'));
    const saved=JSON.stringify((await state()).benchCompoundRecords);check((await state()).benchCompoundRecords.lever.inputPower.completion==='checked','New power snapshot is saved as independently checked');
    for(const second of ['windlass','ramp','wedge','screw','pulley']){await input(kind,'second').selectOption(second);await route(kind,second,400,.5,80,90,'Alternate '+second);}
    await input(kind,'percentIn').fill('12.3456789');await input(kind,'percentOut').fill('99.999999');await route(kind,'pulley',400,.5,12.3456789,99.999999,'Raw fractional efficiencies');
    await pg.locator('#ml-leverLoad').focus();await pg.keyboard.press('ArrowRight');check((await state()).leverLoad===410,'Native workshop slider changes task load by ten newtons');await route(kind,'pulley',410,.5,12.3456789,99.999999,'Changed workshop load');
    await pg.locator('#ml-loadDistance').focus();await pg.keyboard.press('ArrowRight');check(Math.abs((await state()).loadDistance-.6)<1e-10,'Native workshop slider changes task movement by a tenth metre');await route(kind,'pulley',410,.6,12.3456789,99.999999,'Changed workshop movement');
    await input(kind,'budget').fill('0');await route(kind,'pulley',410,.6,12.3456789,99.999999,'Invalid separate budget');check(await action(kind,'check').isEnabled(),'Invalid separate budget keeps the selected power skill available');
    await input(kind,'duration').fill('0');await route(kind,'pulley',410,.6,12.3456789,99.999999,'Invalid separate time and budget');check(await action(kind,'check').isDisabled(),'Invalid time still disables the selected power skill');
    await input(kind,'question').selectOption('idealMA');check(await action(kind,'check').isEnabled(),'Invalid time and budget preserve geometry-only practice');
    for(const key of ['percentIn','percentOut']){const previous=await input(kind,key).inputValue();for(const bad of ['','0','101']){await input(kind,key).fill(bad);check(await panel(kind).count()===0&&await action(kind,'check').count()===0,'Invalid '+key+' '+JSON.stringify(bad)+': stage route and grading omitted');}await input(kind,key).fill(previous);await open(compare(kind));}
    await input(kind,'second').selectOption('ramp');await input(kind,'geometry-rampLength').fill('1');await input(kind,'geometry-rampHeight').fill('2');check(await panel(kind).count()===0&&await action(kind,'check').count()===0,'Invalid output geometry omits stage route and grading');await input(kind,'geometry-rampLength').fill('4');await open(compare(kind));await route(kind,'ramp',410,.6,12.3456789,99.999999,'Restored ramp geometry');
    check(JSON.stringify((await state()).benchCompoundRecords)===saved,'Output, efficiency, load, movement, time and geometry changes preserve saved snapshots');await fixedWork('Changed route');
   }
  }
  await mount('windlass',390,{dark:true,band:'g912'});await open(lab('windlass'));await open(compare('windlass'));await input('windlass','second').selectOption('ramp');await input('windlass','percentIn').fill('50');await input('windlass','percentOut').fill('60');await route('windlass','ramp',400,.5,50,60,'Dark phone ramp output');await layout('windlass','Dark phone stage route');await shot('windlass','dark-phone-compound-stage-map');
  await mount('screw',320,{contrast:true});await open(lab('screw'));await open(compare('screw'));await input('screw','second').selectOption('windlass');await input('screw','percentIn').fill('100');await input('screw','percentOut').fill('100');await route('screw','windlass',2000,.5,100,100,'Forced ideal route');
  const rules=await panel('screw').evaluate(el=>[...el.querySelectorAll('*')].filter(n=>[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())).map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let a=n;while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '[data-ml-compound-stage-map] > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';}).join('\n'));
  const enlarged=await pg.addStyleTag({content:rules});await settle();await layout('screw','Forced 320px doubled text',true);await route('screw','windlass',2000,.5,100,100,'Forced doubled readings');await shot('screw','forced-doubled-compound-stage-map');await enlarged.evaluate(n=>n.remove());
  for(const band of ['k2','g35']){await mount('lever',390,{band});check(await lab('lever').count()===0&&await pg.locator('[data-ml-compound-stage-map]').count()===0,band+': advanced stage map remains grade-gated');}
  await mount('ramp',1180,{}, {rampLength:1,rampHeight:2});await open(lab('ramp'));check(await compare('ramp').count()===0&&await panel('ramp').count()===0&&await action('ramp','check').count()===0,'Invalid input geometry omits stage route and grading');
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;}
 finally{
  await b.close();const base=fs.realpathSync(OUT),temp=path.resolve(OUT,'browser-temp');if(fs.existsSync(temp)){const resolved=fs.realpathSync(temp);if(path.dirname(resolved)!==base)throw Error('Temporary path escaped run');fs.rmSync(resolved,{recursive:true,force:true});}if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,mounts,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
