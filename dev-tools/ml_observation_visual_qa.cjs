// Real React/THREE verification of the workshop observation cards.
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
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_observation_visual_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)})),expectedHash='3a9f4ae50fbdb2a880471abdc424debef00f4daa638dbe15ed545b4e13f8516a';
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const panel=()=>pg.locator('.ml-shop-hud'),observation=()=>panel().locator('.ml-shop-observation');
 const state=()=>pg.evaluate(()=>window.__qaState),settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const expectedCue={
  leverShort:'The shorter effort arm moves less and needs more force to raise the load.',
  leverEqual:'Equal arms move equal distances as effort lowers one end and raises the load.',
  leverLong:'The long effort arm travels farther while the load rises.',
  pulleyFixed:'A fixed pulley changes the pull direction; ideal effort equals the load.',
  pulleyMany:'More supporting rope segments share the load.',
  windlass:'The marked grip and striped drum turn together as the rope lifts the load. Choose Drum to follow the barrel and lifting rope; the curved arrow shows the turn.',
  ramp:'The blue marker tracks the crate along the front rail. Each interval is a quarter of the demonstration stroke; the upright arrow follows the rising load.',
  wedge:'Downward effort redirects force out to the sides.',
  screw:'Turn the handle to press downward by one visible thread spacing per revolution. The bands show the block compressing without turning.'
 };
 const guides={lever:'The colored guides beneath the beam measure each arm from the pivot to its contact point.',turn:'The diamond follows the handle. Four marks divide one turn into quarters; the open ring marks the start.',rope:'Follow a contrasting band to see the rope feed around the wheels.',supports:'The small up arrows mark the supporting strands. Equal arrows show equal tension in this ideal rope; the free end is pulled down.'};
 const protectedKeys=['leverEffortArm','leverLoadArm','leverLoad','pulleySegments','pulleyLoad','windlassHandleR','windlassDrumR','windlassLoad','rampLength','rampHeight','rampLoad','wedgeLength','wedgeThickness','wedgeLoad','screwHandleR','screwPitch','screwLoad','loadDistance','designReflection','benchPower'];
 const protectedSnapshot=s=>JSON.stringify(Object.fromEntries(protectedKeys.map(k=>[k,s[k]])));
 let mounts=0,currentKind='';
 function clearBrowserTemp(recreate){
  const base=fs.realpathSync(OUT),temporary=path.resolve(OUT,'browser-temp'),expected=path.join(base,'browser-temp');
  if(temporary!==expected||path.dirname(temporary)!==base)throw Error('Temporary path escaped run');
  if(fs.existsSync(temporary)){const resolved=fs.realpathSync(temporary);if(resolved!==expected||path.dirname(resolved)!==base)throw Error('Temporary path escaped run');fs.rmSync(resolved,{recursive:true,force:true});}
  if(recreate)fs.mkdirSync(temporary);
 }
 async function mount(kind,width,theme={},override={}){
  if(mounts++){
   await b.close();clearBrowserTemp(true);b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});pg=await b.newPage({viewport:{width,height:1100},deviceScaleFactor:1});
   pg.on('pageerror',e=>errors.push(String(e&&e.message||e)));pg.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
   await pg.goto('file://'+pagePath.replace(/\\/g,'/'));await pg.waitForFunction(()=>window.__mlReady?.()&&window.THREE?.OrbitControls&&window.StemLab?.makeOrbitViewer);
  }
  currentKind=kind;await pg.setViewportSize({width,height:1100});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'on',shopAnimating:false,shopMotionProgress:.5,shopFocusMechanism:false,designReflection:'Keep this explanation.',benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}},...override}),{band:'g68',...theme}]);
  await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();await pg.waitForFunction(()=>{const c=document.querySelector('.ml-shop-bay canvas');if(!c||!c.width||!c.height)return false;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl&&!gl.isContextLost();});await settle();check(true,kind+': real THREE canvas initialized');
  await panel().scrollIntoViewIfNeeded();await settle();console.log('native mount',mounts,kind);
 }
 async function semantics(label,heading='What to notice'){
  const s=await state(),kind=s.bench;
  const ma=kind==='lever'?s.leverEffortArm/s.leverLoadArm:kind==='pulley'?s.pulleySegments:kind==='windlass'?s.windlassHandleR/s.windlassDrumR:kind==='ramp'?s.rampLength/s.rampHeight:kind==='wedge'?s.wedgeLength/s.wedgeThickness:2*Math.PI*s.screwHandleR/s.screwPitch;
  const formatted=Number(ma.toFixed(2)).toString();
  const cue=kind==='lever'?expectedCue[ma<1?'leverShort':ma===1?'leverEqual':'leverLong']:kind==='pulley'?expectedCue[ma===1?'pulleyFixed':'pulleyMany']:expectedCue[kind];
  const guideKeys=kind==='lever'?['lever']:kind==='windlass'||kind==='screw'?['turn']:kind==='pulley'?['rope','supports']:[];
  const data=await panel().evaluate(el=>{const o=el.querySelector('.ml-shop-observation'),h=o.querySelector('h3'),id=o.getAttribute('aria-labelledby');return{tag:o.tagName,heading:h?.textContent,headingId:h?.id,namedBy:id,idUnique:document.querySelectorAll('[id="'+id+'"]').length===1,hidden:!!o.closest('[aria-hidden=true],[hidden]'),live:!!o.closest('[aria-live],[role=status],[role=alert]')||!!o.querySelector('[aria-live],[role=status],[role=alert]'),text:o.textContent,cue:o.querySelector('[data-ml-observation-cue]')?.textContent,guides:[...o.querySelectorAll('.ml-shop-guide')].map(n=>n.textContent),ma:el.querySelector('.ml-shop-ma-value')?.textContent,trade:el.querySelector('.ml-shop-ratio-trade')?.textContent,hiddenCards:[...el.children].filter(n=>n!==o).every(n=>n.getAttribute('aria-hidden')==='true')};});
  observations.push({label,kind,expectedMA:ma,semantics:data});
  check(data.tag==='SECTION'&&data.heading===heading&&data.headingId===data.namedBy&&data.idUnique,label+': observation is a uniquely named section with the correct heading');
  check(!data.hidden&&!data.live&&data.hiddenCards,label+': unique observation text is accessible without a live region or duplicate identity announcements');
  check(data.cue===cue,label+': station cue matches the machine and its mechanical advantage branch');
  check(JSON.stringify(data.guides)===JSON.stringify(guideKeys.map(k=>guides[k])),label+': only the matching arm, turn or pulley guides are present');
  check(data.ma===formatted+'×',label+': mechanical advantage is independently calculated and formatted exactly');
  check(data.trade==='Distance ×'+formatted+'  ·  Force ÷'+formatted,label+': distance and force tradeoffs retain the exact ratio');
  check(await pg.getByRole('region',{name:heading,exact:true}).count()===1,label+': observation can be located by its accessible region name');
 }
 async function range(selector,value){await pg.locator(selector).evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);await settle();}
 async function station(kind){await pg.locator('#ml-bench-tab-'+kind).click();await settle();currentKind=kind;check((await state()).bench===kind,kind+': station tab switches the real machine');}
 async function interaction(label,still=false){
  const initial=protectedSnapshot(await state()),camera=pg.locator('.ml-shop-camera');
  await pg.getByRole('checkbox',{name:'Slow motion',exact:true}).check();await pg.getByRole('button',{name:/^Run the three-dimensional demonstration for /}).click();
  check((await state()).shopAnimating===true,label+': Run demonstration starts the selected machine');
  await semantics(label+' running',still?'Inspect the mechanism':'Watch in slow motion');
  if(!still){const prior=await pg.locator('#ml-shop-stroke').inputValue();await pg.waitForFunction(value=>document.querySelector('#ml-shop-stroke').value!==value,prior);check(true,label+': native motion ruler advances with the live THREE demonstration');}
  await pg.getByRole('button',{name:'Inspect this pose',exact:true}).click();await settle();const held=await state();
  check(held.shopAnimating===false&&Number.isFinite(held.shopMotionProgress),label+': Inspect this pose holds the live position');
  const pose=await pg.locator('#ml-shop-stroke').inputValue();await camera.getByRole('button',{name:'Show a close three-quarter view',exact:true}).click();await settle();
  check(await pg.locator('#ml-shop-stroke').inputValue()===pose,label+': camera inspection retains the held position');
  check(protectedSnapshot(await state())===initial,label+': run, hold and camera actions preserve machine settings and saved practice');
  await semantics(label+' held');
  await range('#ml-shop-stroke',50);check(await pg.locator('#ml-shop-stroke').inputValue()==='50',label+': position slider returns to an inspectable half-stroke');
 }
 async function layout(label,doubled=false){
  await panel().scrollIntoViewIfNeeded();await settle();const data=await panel().evaluate(el=>{
   const box=n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};},root=box(el),rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number),lum=c=>rgb(c).slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
   const bg=n=>{let p=n,b=getComputedStyle(p).backgroundColor;while(rgb(b)[3]===0&&p.parentElement){p=p.parentElement;b=getComputedStyle(p).backgroundColor;}return b;},contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   const o=el.querySelector('.ml-shop-observation'),value=el.querySelector('.ml-shop-ma-value'),r=document.createRange();r.selectNodeContents(value);
   return{viewport:innerWidth,pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,root,observation:box(o),cards:[...el.children].map(box).sort((a,b)=>a.top-b.top),headingFont:parseFloat(getComputedStyle(o.querySelector('h3 > span')).fontSize),cueFont:parseFloat(getComputedStyle(o.querySelector('[data-ml-observation-cue]')).fontSize),details:[...o.querySelectorAll('.ml-shop-guide')].map(n=>parseFloat(getComputedStyle(n).fontSize)),ma:{text:value.textContent,font:parseFloat(getComputedStyle(value).fontSize),box:box(value),rects:[...r.getClientRects()].map(n=>({left:n.left,right:n.right,width:n.width}))},text:[...el.querySelectorAll('*')].filter(n=>!n.closest('svg')&&n.tagName!=='STYLE'&&[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())).map(n=>{const ranges=[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()).flatMap(c=>{const range=document.createRange();range.selectNodeContents(c);return [...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));});return{text:n.textContent,box:box(n),ranges,contrast:contrast(getComputedStyle(n).color,bg(n))};})};
  });observations.push({label,layout:data});
  check(data.pageFits&&data.panelFits&&data.cards.every(n=>n.left>=data.root.left-1&&n.right<=data.root.right+1),label+': observation cards fit without horizontal scrolling');
  check(Math.abs(data.observation.width-data.root.width)<=2,label+': observation spans the full workshop width');
  check(data.headingFont>=14*(doubled?2:1)&&data.cueFont>=16*(doubled?2:1)&&data.details.every(n=>n>=14*(doubled?2:1)),label+': heading, cue and detailed guides retain their readable hierarchy');
  check(data.ma.font>=(data.viewport<=440?22:data.viewport<=1000?28:32)*(doubled?2:1),label+': mechanical advantage retains its prominent readable size');
  check(data.ma.rects.length===1&&data.ma.rects[0].left>=data.ma.box.left-1&&data.ma.rects[0].right<=data.ma.box.right+1,label+': mechanical advantage value and multiplication sign stay intact');
  check(data.text.every(n=>n.ranges.every(r=>r.left>=n.box.left-1&&r.right<=n.box.right+1)),label+': all visible observation labels and guides wrap inside their cards');
  check(data.text.every(n=>n.contrast>=4.5),label+': all observation text retains readable contrast');
  if(data.viewport<=800)check(data.cards.every(n=>Math.abs(n.width-data.root.width)<=2)&&data.cards.every((n,i)=>i===0||n.top>=data.cards[i-1].bottom-1),label+': compact cards form one full-width column');
  const words=await panel().evaluate(el=>[...el.querySelectorAll('*')].filter(n=>!n.closest('svg')&&n.tagName!=='STYLE').flatMap(n=>[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()).flatMap(c=>[...c.textContent.matchAll(/\S+/g)].map(match=>{const r=document.createRange();r.setStart(c,match.index);r.setEnd(c,match.index+match[0].length);return{text:match[0],pieces:r.getClientRects().length};}))));
  observations.push({label,intactWords:words});check(words.every(n=>n.pieces===1),label+': individual words and ratio tokens remain intact instead of splitting into letters');
 }
 async function doubledText(){
  const css=await panel().evaluate(el=>[...el.querySelectorAll('*')].filter(n=>!n.closest('svg')&&n.tagName!=='STYLE'&&[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())).map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let a=n;while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '.ml-shop-hud > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';}).join('\n'));
  await pg.addStyleTag({content:css});await settle();
 }
 async function shot(name,target=panel()){await target.screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});console.log('screenshot ready',name);}
 try{
  check(before[0].sha256===expectedHash&&before[1].sha256===expectedHash,'Production source and public mirror match the frozen revision');
  if(process.argv.includes('--probes')){
   await mount('screw',900,{}, {screwHandleR:.5,screwPitch:.001});
   for(const width of [460,500,600]){await pg.setViewportSize({width,height:1100});await settle();await shot('screw-'+width);try{await layout('Maximum screw at'+width);}catch(e){errors.push(String(e.message||e));}}
   await pg.setViewportSize({width:900,height:1100});await doubledText();await shot('screw-900-doubled');try{await layout('Maximum screw900 doubled',true);}catch(e){errors.push(String(e.message||e));}
  }else{
  await mount('windlass',1180);await semantics('Desktop wheel and axle');await interaction('Desktop wheel and axle');await layout('Desktop wheel and axle');await shot('desktop-observation');await shot('desktop-workshop-context',pg.locator('.ml-shop-bay'));
  await station('wedge');await semantics('Wedge');await station('lever');await semantics('Long effort arm');
  await range('#ml-leverEffortArm',.5);await semantics('Short effort arm');await range('#ml-leverEffortArm',1);await semantics('Equal arms');
  await mount('pulley',900);await semantics('Multiple supporting strands');await interaction('Narrow desktop pulley');await layout('Narrow desktop pulley');await shot('narrow-desktop-observation');await range('#ml-pulleySegments',1);await semantics('Single fixed pulley');
  await mount('ramp',390,{dark:true});await semantics('Dark phone ramp');await interaction('Dark phone ramp');await layout('Dark phone ramp');await shot('dark-phone-observation');
  await mount('screw',320,{contrast:true},{screwHandleR:.5,screwPitch:.001,motionPref:'off'});await semantics('Forced320 screw');await interaction('Forced320 screw',true);await doubledText();await layout('Forced320 doubled observation text',true);await shot('forced-doubled-observation');
  await mount('screw',900,{}, {screwHandleR:.5,screwPitch:.001});await semantics('Maximum screw responsive boundary probes');
  for(const width of [460,500,600,620,800,801,900,1000]){await pg.setViewportSize({width,height:1100});await settle();await layout('Maximum screw at'+width);}
  await pg.setViewportSize({width:900,height:1100});await doubledText();await layout('Maximum screw900 doubled',true);await shot('screw-900-doubled');
  await pg.setViewportSize({width:620,height:1100});await settle();await layout('Maximum screw620 doubled',true);await shot('screw-620-doubled');
  }
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;}
 finally{
  await b.close();clearBrowserTemp(false);if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,mounts,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
