// Real React/THREE browser verification of the workshop camera view cards.
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
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_camera_cards_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)})),expectedHash='a8752fc51b1bbe1fddc5bad8d481341d70bf96aa06f2300e770fe999d42bee5c';
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const panel=()=>pg.locator('.ml-shop-camera'),card=key=>panel().locator('[data-ml-camera-card="'+key+'"]'),button=key=>card(key).locator('button');
 const state=()=>pg.evaluate(()=>window.__qaState),settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 async function press(target){await target.focus();await pg.keyboard.press('Enter');await settle();}
 const expectedNames={side:'Show the machine from the side',close:'Show a close three-quarter view',drum:'Show the drum and lifting rope',focus:'Focus mechanism'};
 const expectedTips={side:'Compare movement from the side.',close:'See how the parts fit together.',drum:'Follow the rope around the drum.',focus:'Hide the room from any camera view.'};
 const settingsSnapshot=s=>JSON.stringify(Object.fromEntries(Object.entries(s).filter(([key])=>!['shopFocusMechanism','shopRotY','shopRotX','shopZoom'].includes(key))));
 let mounts=0,currentKind='';
 function clearBrowserTemp(recreate){
  const base=fs.realpathSync(OUT),temporary=path.resolve(OUT,'browser-temp'),expected=path.join(base,'browser-temp');
  if(temporary!==expected||path.dirname(temporary)!==base)throw Error('Temporary path escaped run');
  if(fs.existsSync(temporary)){const resolved=fs.realpathSync(temporary);if(resolved!==expected||path.dirname(resolved)!==base)throw Error('Temporary path escaped run');fs.rmSync(resolved,{recursive:true,force:true});}
  if(recreate)fs.mkdirSync(temporary);
 }
 async function mount(kind,width,theme={}){
  if(mounts++){
   await b.close();clearBrowserTemp(true);b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});pg=await b.newPage({viewport:{width,height:1100},deviceScaleFactor:1});
   pg.on('pageerror',e=>errors.push(String(e&&e.message||e)));pg.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
   await pg.goto('file://'+pagePath.replace(/\\/g,'/'));await pg.waitForFunction(()=>window.__mlReady?.()&&window.THREE?.OrbitControls&&window.StemLab?.makeOrbitViewer);
  }
  currentKind=kind;await pg.setViewportSize({width,height:1100});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',shopAnimating:false,shopMotionProgress:.5,shopFocusMechanism:false,designReflection:'Keep this explanation.',benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}}}),{band:'g68',...theme}]);
  await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();await pg.waitForFunction(()=>{const c=document.querySelector('.ml-shop-bay canvas');if(!c||!c.width||!c.height)return false;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl&&!gl.isContextLost();});await settle();check(true,kind+': real THREE canvas initialized');
  await panel().scrollIntoViewIfNeeded();await settle();console.log('native mount',mounts,kind);
 }
 async function semantics(label){
  const data=await panel().evaluate(el=>({name:el.getAttribute('aria-label'),cards:[...el.querySelectorAll('[data-ml-camera-card]')].map(n=>{const b=n.querySelector('button'),art=b.querySelector('svg'),id=b.getAttribute('aria-describedby');return{key:n.dataset.mlCameraCard,tag:b.tagName,type:b.type,name:b.getAttribute('aria-label'),text:b.textContent,description:document.getElementById(id)?.textContent,descriptionIdUnique:document.querySelectorAll('[id="'+id+'"]').length===1,externalDescription:!b.contains(document.getElementById(id)),artHidden:art?.getAttribute('aria-hidden'),artFocusable:art?.getAttribute('focusable'),group:n.closest('[role=group]').getAttribute('aria-label')};}),live:!!el.querySelector('[aria-live],[role=status],[role=alert]')}));
  observations.push({label,semantics:data});const keys=currentKind==='windlass'?['side','close','drum','focus']:['side','close','focus'];
  check(data.cards.map(n=>n.key).join(',')===keys.join(',')&&!!data.name,label+': expected camera cards appear in one named camera group');
  check(data.cards.every(n=>n.tag==='BUTTON'&&n.type==='button'&&n.name===expectedNames[n.key]&&n.text===({side:'Side',close:'Close',drum:'Drum',focus:'Focus mechanism'}[n.key])),label+': native buttons retain exact accessible names and visible labels');
  check(data.cards.every(n=>n.description===expectedTips[n.key]&&n.descriptionIdUnique&&n.externalDescription),label+': unique external captions supply the button descriptions');
  check(data.cards.every(n=>n.artHidden==='true'&&n.artFocusable==='false')&&!data.live,label+': illustrations stay decorative without extra live regions');
  check(data.cards.every(n=>n.group===(n.key==='focus'?'Viewing aid':'Views')),label+': viewing aid is independent of the camera preset group');
  for(const key of keys)check(await panel().getByRole('button',{name:expectedNames[key],exact:true}).count()===1,label+' '+key+': name resolves to one keyboard button');
 }
 async function selected(key,focus,label){
  const data=await panel().locator('[data-ml-camera-card]').evaluateAll(nodes=>nodes.map(n=>({key:n.dataset.mlCameraCard,pressed:n.querySelector('button').getAttribute('aria-pressed'),marks:n.querySelectorAll('[data-ml-camera-selected]').length})));
  observations.push({label,selected:data});check(data.every(n=>{const yes=n.key==='focus'?focus:n.key===key;return n.pressed===String(yes)&&n.marks===(yes?1:0);}),label+': aria-pressed and visible check markers agree for presets and independent focus');
 }
 async function view(key,label){
  const prior=settingsSnapshot(await state()),pose=await pg.locator('#ml-shop-stroke').inputValue();await press(button(key));
  const expected=key==='side'?['0°','8°','1.08×']:key==='drum'?['72°','16°','1.18×']:['24°',currentKind==='screw'?'32°':'12°','1.38×'];
  const actual=await panel().locator('[data-ml-camera-reading]').allTextContents();observations.push({label,expected,actual});
  check(JSON.stringify(actual)===JSON.stringify(expected),label+': exact rotation, tilt and zoom match the established preset');
  check(settingsSnapshot(await state())===prior&&await pg.locator('#ml-shop-stroke').inputValue()===pose,label+': camera choice preserves the motion position, machine settings and saved practice');
  await selected(key,!!(await state()).shopFocusMechanism,label);await focusVisible(button(key),label+' selected');
 }
 async function focusVisible(target,label){
  await pg.keyboard.press('Tab');await target.focus();await settle();const data=await target.evaluate(n=>{const c=getComputedStyle(n);return{active:document.activeElement===n,visible:n.matches(':focus-visible'),width:parseFloat(c.outlineWidth),style:c.outlineStyle,offset:parseFloat(c.outlineOffset),color:c.outlineColor,background:getComputedStyle(n.closest('.ml-shop-camera')).backgroundColor};});
  const lum=c=>(c.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);data.contrast=(Math.max(lum(data.color),lum(data.background))+.05)/(Math.min(lum(data.color),lum(data.background))+.05);observations.push({label,focus:data});check(data.active&&data.visible&&data.width>=2&&data.style!=='none'&&data.offset>=2&&data.contrast>=3,label+': keyboard focus remains distinct with sufficient contrast');
 }
 async function interaction(label){
  const initial=settingsSnapshot(await state()),pose=await pg.locator('#ml-shop-stroke').inputValue();check(pose==='50',label+': simulation starts at an inspectable half-stroke');
  await focusVisible(button('side'),label+' Side');await view('side',label+' Side');await focusVisible(button('close'),label+' Close');await view('close',label+' Close');
  if(currentKind==='windlass'){await focusVisible(button('drum'),label+' Drum');await view('drum',label+' Drum');}
  const active=currentKind==='windlass'?'drum':'close';await focusVisible(button('focus'),label+' Focus');const orientation=await panel().locator('[data-ml-camera-reading]').allTextContents();
  await press(button('focus'));check((await state()).shopFocusMechanism===true&&JSON.stringify(await panel().locator('[data-ml-camera-reading]').allTextContents())===JSON.stringify(orientation),label+': focus hides the room without changing the selected camera orientation');
  check(await card('focus').locator('p').textContent()==='Room hidden. Select again to restore it.',label+': active focus caption explains how to restore the room');await selected(active,true,label+' Focus enabled');
  await view('side',label+' Side with focus');await press(button('focus'));check((await state()).shopFocusMechanism===false&&await card('focus').locator('p').textContent()===expectedTips.focus,label+': focus restores the workshop independently');await selected('side',false,label+' Focus restored');
  const details=panel().locator('.ml-shop-camera-adjustments');await focusVisible(details.locator('summary'),label+' Rotate and zoom');await press(details.locator('summary'));check(await details.evaluate(n=>n.open),label+': adjustments disclosure opens by keyboard');
  await press(panel().getByRole('button',{name:'Turn right',exact:true}));check((await panel().locator('[data-ml-camera-reading=rotation]').textContent())==='15°',label+': keyboard rotation still changes the camera by15 degrees');await selected(null,false,label+' Custom orientation');
  check(settingsSnapshot(await state())===initial&&await pg.locator('#ml-shop-stroke').inputValue()===pose,label+': all view, focus and rotation interactions preserve settings and half-stroke pose');
  await view(currentKind==='windlass'?'drum':'close',label+' Final preset');
 }
 async function layout(label,doubled=false){
  await panel().scrollIntoViewIfNeeded();await settle();const data=await panel().evaluate(el=>{
   const box=n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,height:r.height};},root=box(el),rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number),lum=c=>rgb(c).slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
   const bg=n=>{let p=n,b=getComputedStyle(p).backgroundColor;while(rgb(b)[3]===0&&p.parentElement){p=p.parentElement;b=getComputedStyle(p).backgroundColor;}return b;},contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   const visible=n=>n.getClientRects().length&&(!n.closest('details:not([open])')||n.matches('details:not([open]) > summary'));
   return{pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,root,cards:[...el.querySelectorAll('[data-ml-camera-card]')].map(n=>({key:n.dataset.mlCameraCard,box:box(n),button:box(n.querySelector('button')),caption:box(n.querySelector('p')),font:parseFloat(getComputedStyle(n.querySelector('button')).fontSize),descriptionFont:parseFloat(getComputedStyle(n.querySelector('p')).fontSize)})),targets:[...el.querySelectorAll('button,summary')].filter(visible).map(n=>({text:n.textContent,box:box(n)})),text:[...el.querySelectorAll('*')].filter(n=>visible(n)&&!n.closest('svg')&&n.tagName!=='STYLE'&&[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())).map(n=>{const ranges=[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()).flatMap(c=>{const range=document.createRange();range.selectNodeContents(c);return [...range.getClientRects()].map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));});return{text:n.textContent,box:box(n),ranges,contrast:contrast(getComputedStyle(n).color,bg(n))};})};
  });observations.push({label,layout:data});
  check(data.pageFits&&data.panelFits&&data.cards.every(n=>n.box.left>=data.root.left&&n.box.right<=data.root.right),label+': cards and camera panel stay inside the viewport without horizontal page scrolling');
  check(data.cards.every(n=>n.font>=16*(doubled?2:1)&&n.descriptionFont>=14*(doubled?2:1)),label+': labels and captions retain their readable hierarchy');
  check(data.targets.every(n=>n.box.height>=44&&n.box.width>=32),label+': camera buttons and disclosure retain44-pixel target heights');
  check(data.text.every(n=>n.ranges.every(r=>r.left>=n.box.left-1&&r.right<=n.box.right+1)),label+': visible labels, captions and adjustments wrap within their containers');
  check(data.text.every(n=>n.contrast>=4.5),label+': all visible camera text retains readable contrast');
 }
 async function intactEnlargedText(label){
  const data=await panel().evaluate(el=>{
   const focus=el.querySelector('[data-ml-camera-card=focus] button');
   const words=[...focus.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim()).flatMap(n=>[...n.textContent.matchAll(/\S+/g)].map(match=>{const range=document.createRange();range.setStart(n,match.index);range.setEnd(n,match.index+match[0].length);return{text:match[0],rects:[...range.getClientRects()].map(r=>({left:r.left,right:r.right,width:r.width}))};}));
   const readings=[...el.querySelectorAll('[data-ml-camera-reading]')].map(n=>{const range=document.createRange();range.selectNodeContents(n);const r=n.getBoundingClientRect();return{text:n.textContent,left:r.left,right:r.right,rects:[...range.getClientRects()].map(r=>({left:r.left,right:r.right,width:r.width}))};});
   const r=focus.getBoundingClientRect();return{focus:{left:r.left,right:r.right,words},readings};
  });observations.push({label,intactEnlargedText:data});
  check(data.focus.words.map(n=>n.text).join(' ')==='Focus mechanism'&&data.focus.words.every(n=>n.rects.length===1&&n.rects[0].left>=data.focus.left&&n.rects[0].right<=data.focus.right),label+': enlarged Focus label keeps each word intact inside its card');
  check(data.readings.length===3&&data.readings.every(n=>n.rects.length===1&&n.rects[0].left>=n.left&&n.rects[0].right<=n.right),label+': camera rotation, tilt and zoom each retain an intact value and unit');
 }
 async function shot(name,target=panel()){
  await target.screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});console.log('screenshot ready',name);
 }
 async function doubledText(){
  const css=await panel().evaluate(el=>[...el.querySelectorAll('*')].filter(n=>!n.closest('svg')&&n.tagName!=='STYLE'&&[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())).map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let a=n;while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '.ml-shop-camera > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';}).join('\n'));
  await pg.addStyleTag({content:css});await settle();
 }
 try{
  check(before[0].sha256===expectedHash&&before[1].sha256===expectedHash,'Production source and public mirror match the frozen revision');
  await mount('windlass',1180);await semantics('Desktop wheel and axle');await interaction('Desktop wheel and axle');await layout('Desktop wheel and axle');await shot('desktop-camera-cards');await shot('desktop-workshop-context',pg.locator('.ml-shop-bay'));
  await mount('lever',900);await semantics('Narrow desktop lever');await interaction('Narrow desktop lever');await layout('Narrow desktop lever');await shot('narrow-desktop-camera-cards');
  await mount('screw',390,{dark:true,band:'g912'});await semantics('Dark phone screw');await interaction('Dark phone screw');await layout('Dark phone screw');await shot('dark-phone-camera-cards');
  await mount('windlass',320,{contrast:true});await semantics('Forced320 wheel and axle');await interaction('Forced320 wheel and axle');await doubledText();await layout('Forced320 doubled camera text',true);await intactEnlargedText('Forced320 doubled camera text');await focusVisible(button('drum'),'Forced320 doubled Drum');await shot('forced-doubled-camera-cards');
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;}
 finally{
  await b.close();clearBrowserTemp(false);if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,mounts,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
