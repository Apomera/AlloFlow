// Real React/THREE verification of the workshop distance key.
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
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_distance_key_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)})),expectedHash='6de507556b3c97ca9d3e81d2c69ad0e2a73cdaffc9b8b4d86d3ec31aac3bdd5e';
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const panel=()=>pg.locator('.ml-shop-legend');
 const state=()=>pg.evaluate(()=>window.__qaState),settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const guide='Thin rails show the full stroke; wide bars show distance traveled. End caps mark the finish.';
 const protectedKeys=['leverEffortArm','leverLoadArm','leverLoad','pulleySegments','pulleyLoad','windlassHandleR','windlassDrumR','windlassLoad','rampLength','rampHeight','rampLoad','wedgeLength','wedgeThickness','wedgeLoad','screwHandleR','screwPitch','screwLoad','loadDistance','designReflection','benchPower'];
 const protectedSnapshot=s=>JSON.stringify(Object.fromEntries(protectedKeys.map(k=>[k,s[k]])));
 let mounts=0;
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
  await pg.setViewportSize({width,height:1100});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'on',shopAnimating:false,shopMotionProgress:.5,shopFocusMechanism:false,designReflection:'Keep this explanation.',benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}},...override}),{band:'g68',...theme}]);
  await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();await pg.waitForFunction(()=>{const c=document.querySelector('.ml-shop-bay canvas');if(!c||!c.width||!c.height)return false;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl&&!gl.isContextLost();});await settle();check(true,kind+': real THREE canvas initialized');
  await panel().scrollIntoViewIfNeeded();await settle();console.log('native mount',mounts,kind);
 }
 async function semantics(label){
  const data=await panel().evaluate(el=>({hidden:el.getAttribute('aria-hidden'),title:el.querySelector('.ml-distance-key-title').textContent,symbols:[...el.querySelectorAll('[data-ml-distance-symbol]')].map(n=>({kind:n.getAttribute('data-ml-distance-symbol'),text:n.textContent,mark:n.querySelector('.ml-distance-key-mark').textContent})),guide:el.querySelector('[data-ml-distance-fill-guide]').textContent,svg:[...el.querySelectorAll('[data-ml-distance-key-example]')].map(n=>({hidden:n.getAttribute('aria-hidden'),focusable:n.getAttribute('focusable'),html:n.outerHTML,rail:n.querySelector('[data-ml-distance-key-rail]').getAttribute('d'),travel:[n.querySelector('[data-ml-distance-key-travel]').getAttribute('width'),n.querySelector('[data-ml-distance-key-travel]').getAttribute('height')],finish:n.querySelector('[data-ml-distance-key-finish]').getAttribute('d')})),focusControls:el.querySelectorAll('a,button,input,select,textarea,[tabindex]').length,live:el.querySelectorAll('[aria-live],[role=status],[role=alert]').length,canvasLabel:document.querySelector('.ml-shop-bay[role=img]')?.getAttribute('aria-label'),observationHidden:!!document.querySelector('.ml-shop-observation')?.closest('[aria-hidden=true],[hidden]')}));
  observations.push({label,semantics:data});
  check(data.hidden==='true'&&data.title==='Same distance scale',label+': decorative distance key retains its exact heading');
  check(JSON.stringify(data.symbols)===JSON.stringify([{kind:'effort',text:'◆ Effort path',mark:'◆ '},{kind:'load',text:'○ Load path',mark:'○ '}]),label+': exact effort/load labels and distinct diamond/ring shapes remain');
  check(data.guide===guide,label+': existing distance guide is unchanged');
  check(data.svg.length===1&&data.svg[0].hidden==='true'&&data.svg[0].focusable==='false',label+': single example remains decorative and unfocusable');
  check(data.svg[0].rail==='M18 30H302'&&JSON.stringify(data.svg[0].travel)===JSON.stringify(['160','16'])&&data.svg[0].finish==='M302 14V46',label+': example distinguishes the thin rail, traveled bar, and end cap');
  check(data.focusControls===0&&data.live===0,label+': key adds neither live regions nor focus controls');
  check(!!data.canvasLabel&&data.canvasLabel.includes(guide)&&!data.observationHidden,label+': accessible canvas guide and observation instructions remain available');
  return data.svg[0].html;
 }
 async function range(selector,value){await pg.locator(selector).evaluate((el,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,String(v));el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);await settle();}
 async function station(kind){await pg.locator('#ml-bench-tab-'+kind).click();await settle();check((await state()).bench===kind,kind+': station tab switches the real machine');}
 async function interaction(label,still=false){
  const initial=protectedSnapshot(await state()),sample=await semantics(label+' before');
  await pg.getByRole('checkbox',{name:'Slow motion',exact:true}).check();await pg.getByRole('button',{name:/^Run the three-dimensional demonstration for /}).click();
  check((await state()).shopAnimating===true,label+': Run starts the selected machine');
  if(!still){const prior=await pg.locator('#ml-shop-stroke').inputValue();await pg.waitForFunction(value=>document.querySelector('#ml-shop-stroke').value!==value,prior);check(true,label+': live position advances');}
  check(await semantics(label+' running')===sample,label+': static key stays independent of live motion');
  await pg.getByRole('button',{name:'Inspect this pose',exact:true}).click();await settle();check((await state()).shopAnimating===false,label+': Inspect this pose holds motion');
  const pose=await pg.locator('#ml-shop-stroke').inputValue();await pg.locator('.ml-shop-camera').getByRole('button',{name:'Show a close three-quarter view',exact:true}).click();await settle();
  check(await pg.locator('#ml-shop-stroke').inputValue()===pose,label+': camera retains the held pose');
  await range('#ml-shop-stroke',50);check(await pg.locator('#ml-shop-stroke').inputValue()==='50',label+': slider chooses half stroke');
  check(protectedSnapshot(await state())===initial,label+': run, hold, slider and camera preserve settings and saved practice');
  check(await semantics(label+' held')===sample,label+': static example is unchanged after exploration');
 }
 async function layout(label,doubled=false){
  await panel().scrollIntoViewIfNeeded();await settle();const data=await panel().evaluate(el=>{
   const box=n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};},root=box(el),rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number),lum=c=>rgb(c).slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
   const bg=n=>{let p=n,b=getComputedStyle(p).backgroundColor;while(rgb(b)[3]===0&&p.parentElement){p=p.parentElement;b=getComputedStyle(p).backgroundColor;}return b;},contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   const nodes=[...el.querySelectorAll('*')].filter(n=>!n.closest('svg')&&n.tagName!=='STYLE'&&[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()));
   return{viewport:innerWidth,pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,root,cards:[...el.querySelectorAll('.ml-distance-key-symbol')].map(box),titleFont:parseFloat(getComputedStyle(el.querySelector('.ml-distance-key-title')).fontSize),guideFont:parseFloat(getComputedStyle(el.querySelector('[data-ml-distance-fill-guide]')).fontSize),example:box(el.querySelector('svg')),text:nodes.map(n=>({text:n.textContent,box:box(n),font:parseFloat(getComputedStyle(n).fontSize),mark:n.classList.contains('ml-distance-key-mark'),contrast:contrast(getComputedStyle(n).color,bg(n)),ranges:[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()).flatMap(c=>{const range=document.createRange();range.selectNodeContents(c);return [...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));}),words:[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()).flatMap(c=>[...c.textContent.matchAll(/\S+/g)].map(m=>{const r=document.createRange();r.setStart(c,m.index);r.setEnd(c,m.index+m[0].length);return{text:m[0],pieces:r.getClientRects().length};}))}))};
  });observations.push({label,layout:data});
  check(data.pageFits&&data.panelFits&&data.cards.every(n=>n.left>=data.root.left-1&&n.right<=data.root.right+1),label+': distance key fits without horizontal scrolling');
  check(data.titleFont>=18*(doubled?2:1)&&data.guideFont>=15*(doubled?2:1),label+': title and guide retain readable sizes');
  check(data.text.filter(n=>n.text==='Effort path'||n.text==='Load path').every(n=>n.font>=17*(doubled?2:1)),label+': path labels retain readable size');
  check(data.text.filter(n=>n.mark).every(n=>n.font>=32*(doubled?2:1)&&n.box.width>=1.39*n.font&&n.box.height>=1.39*n.font),label+': glyph boxes scale with enlarged text');
  check(data.text.every(n=>n.ranges.every(r=>r.left>=n.box.left-1&&r.right<=n.box.right+1)),label+': all text and symbols stay inside their boxes');
  check(data.text.every(n=>n.contrast>=4.5),label+': all key text and symbols retain readable contrast');
  check(data.text.every(n=>n.words.every(w=>w.pieces===1)),label+': individual English words and glyphs remain whole');
  check(data.example.width>0&&data.example.left>=data.root.left-1&&data.example.right<=data.root.right+1,label+': rail example remains visible and contained');
  if(data.viewport<=600)check(data.cards[1].top>=data.cards[0].bottom-1,label+': compact cards stack without overlap');
 }
 async function doubledText(){
  const css=await panel().evaluate(el=>[...el.querySelectorAll('*')].filter(n=>!n.closest('svg')&&n.tagName!=='STYLE'&&[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())).map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let a=n;while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '.ml-shop-legend > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';}).join('\n'));
  await pg.addStyleTag({content:css});await settle();
 }
 async function shot(name,target=panel()){await target.screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});console.log('screenshot ready',name);}
 try{
  check(before[0].sha256===expectedHash&&before[1].sha256===expectedHash,'Production source and public mirror match the frozen revision');
  await mount('windlass',1180);await interaction('Desktop wheel and axle');await layout('Desktop wheel and axle');await shot('desktop-distance-key');await shot('desktop-workshop-context',pg.locator('.ml-shop-bay'));
  for(const kind of ['lever','pulley','ramp','wedge','screw']){await station(kind);await semantics(kind+' station');}
  await pg.setViewportSize({width:680,height:1100});await settle();await layout('Narrow layout');await shot('narrow-distance-key');
  await mount('ramp',390,{dark:true});await interaction('Dark phone ramp');await layout('Dark phone ramp');await shot('dark-phone-distance-key');
  await mount('screw',320,{contrast:true},{screwHandleR:.5,screwPitch:.001,motionPref:'off'});await interaction('Forced320 screw',true);await doubledText();await layout('Forced320 doubled distance key',true);await shot('forced-doubled-distance-key');
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;try{await shot('failure-distance-key');}catch(snapshotError){errors.push('Failure screenshot: '+snapshotError);}}
 finally{
  await b.close();clearBrowserTemp(false);if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,mounts,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
