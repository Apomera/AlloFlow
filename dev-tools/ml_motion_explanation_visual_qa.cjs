// Native React/THREE checks for the Motion detective explanation diagram.
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
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_motion_explanation_visual_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)}));
 const expectedHash='3a2d5bb707d1ebf59f3f3c92b11ed65ba8bbb7bb895efbe559570f5d0ed45f52';
 const fixtures={lever:['down','Effort end moves down','up','Load end rises'],pulley:['down','Free rope is pulled down','up','Load rises'],windlass:['turn','Wheel turns','up','Rope lifts the load'],ramp:['slope','Crate moves along the ramp','up','Crate gains height'],wedge:['down','Wedge moves down','apart','Halves move apart'],screw:['turn','Handle turns','down','Press shoe moves down']};
 const names={lever:'Lever',pulley:'Pulley',windlass:'Wheel & Axle',ramp:'Inclined Plane',wedge:'Wedge',screw:'Screw'};
 const paths={down:'M24 8V38 M14 28L24 38L34 28',up:'M24 40V10 M14 20L24 10L34 20',turn:'M11 33A16 16 0 1 1 39 14 M30 14H40V4',apart:'M21 24H5 M12 17L5 24L12 31 M27 24H43 M36 17L43 24L36 31',slope:'M8 24H40 M30 14L40 24L30 34'};
 const preserved={designReflection:'Keep my mechanical explanation.',benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}},benchCompoundRecords:{lever:{inputWork:{version:1,benchId:'lever',second:'pulley',inputSettings:{leverEffortArm:2,leverLoadArm:1},outputSettings:{pulleySegments:2},load:400,loadDistance:.5,percentIn:80,percentOut:90,question:'inputWork',answer:'277.78',unit:'J',explanation:'Preserve this calculation.',hint:1,completion:'checked'}}}};
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const panel=()=>pg.locator('.ml-shop-motion-map'),discovery=()=>pg.locator('.ml-shop-discovery'),details=()=>discovery().locator('details');
 const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=()=>pg.evaluate(()=>window.__qaState);
 async function press(target){await target.focus();await pg.keyboard.press('Enter');await settle();}
 async function reveal(){if(!await details().evaluate(n=>n.open))await press(details().locator(':scope>summary'));await panel().scrollIntoViewIfNeeded();await settle();}
 let mounts=0;
 async function mount(kind,width=1180,theme={},extra={}){
  if(mounts++){
   await b.close();b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});pg=await b.newPage({viewport:{width,height:1100},deviceScaleFactor:1});
   pg.on('pageerror',e=>errors.push(String(e&&e.message||e)));pg.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});
   await pg.goto('file://'+pagePath.replace(/\\/g,'/'));await pg.waitForFunction(()=>window.__mlReady?.()&&window.THREE?.OrbitControls&&window.StemLab?.makeOrbitViewer);
  }
  await pg.setViewportSize({width,height:1100});await pg.emulateMedia({forcedColors:theme.contrast?'active':'none',reducedMotion:'reduce'});
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',shopMotionProgress:.25,...preserved,...extra}),{band:'g68',...theme}]);
  await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();await pg.waitForFunction(()=>{const c=document.querySelector('.ml-shop-bay canvas');if(!c||!c.width||!c.height)return false;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl&&!gl.isContextLost();});await settle();
  check(true,kind+' mount '+mounts+': real THREE canvas initialized');
  check(await pg.locator('.ml-station-chooser [data-ml-bench-preview]').evaluateAll(ns=>ns.length===6&&ns.every(n=>{const r=n.getBoundingClientRect();return r.width===60&&r.height===60;})),kind+' mount '+mounts+': chooser previews keep their sixty-pixel size');console.log('native mount',mounts,kind);
 }
 async function map(kind,label=kind){
  await panel().scrollIntoViewIfNeeded();await settle();
  const data=await panel().evaluate(el=>({role:el.getAttribute('role'),name:el.getAttribute('aria-label'),title:el.querySelector('[data-ml-motion-map-title]')?.textContent,guide:el.querySelector('[data-ml-motion-map-guide]')?.textContent,disclaimer:el.lastElementChild?.textContent,listTag:el.querySelector('.ml-motion-map-lanes')?.tagName,listRole:el.querySelector('.ml-motion-map-lanes')?.getAttribute('role'),children:[...el.querySelector('.ml-motion-map-lanes').children].map(n=>({tag:n.tagName,key:n.dataset.mlMotionLane||'mechanism'})),mechanism:{kind:el.querySelector('[data-ml-motion-mechanism]')?.dataset.mlMotionMechanism,preview:el.querySelector('[data-ml-bench-preview]')?.dataset.mlBenchPreview,text:el.querySelector('[data-ml-motion-mechanism]')?.innerText},lanes:[...el.querySelectorAll('[data-ml-motion-lane]')].map(n=>({key:n.dataset.mlMotionLane,title:n.querySelector('p').textContent,description:n.querySelector('[data-ml-motion-description]')?.textContent,direction:n.querySelector('svg').dataset.mlMotionDirection,path:n.querySelector('svg path').getAttribute('d'),transform:n.querySelector('svg path').getAttribute('transform')})),links:[...el.querySelectorAll('.ml-motion-map-link')].map(n=>({parent:n.parentElement.dataset.mlMotionLane||'mechanism',hidden:n.getAttribute('aria-hidden')})),svgs:[...el.querySelectorAll('svg')].map(n=>({hidden:!!n.closest('[aria-hidden=true]'),focusable:n.getAttribute('focusable')})),focusable:[...el.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(n=>!n.disabled&&n.tabIndex>=0).length,live:!!el.querySelector('[aria-live],[role=status],[role=alert]')}));
  observations.push({kind,label,map:data});const expected=fixtures[kind];
  check(data.role==='group'&&data.name==='Follow the motion'&&data.title==='Follow the motion',label+': existing accessible group has a prominent explanation title');
  check(data.listTag==='OL'&&data.listRole==='list'&&JSON.stringify(data.children)===JSON.stringify([{tag:'LI',key:'effort'},{tag:'LI',key:'mechanism'},{tag:'LI',key:'load'}]),label+': three ordered native list items follow effort, mechanism and load');
  check(data.mechanism.kind===kind&&data.mechanism.preview===kind&&data.mechanism.text.includes('Mechanism')&&data.mechanism.text.includes(names[kind]),label+': center card identifies the active machine');
  check(data.lanes.length===2&&data.lanes.every((n,i)=>n.key===(i?'load':'effort')&&n.title===(i?'Load motion':'Effort motion')&&n.direction===expected[i*2]&&n.description===expected[i*2+1]&&n.path===paths[expected[i*2]]),label+': original effort and load directions, descriptions and arrow paths are exact');
  const current=await state(),angle=-Math.asin(Math.min(1,Math.max(0,Number(current.rampHeight)/Number(current.rampLength))))*180/Math.PI;
  check(data.lanes.every(n=>n.direction==='slope'?Math.abs(Number(n.transform.match(/rotate\(([^ ]+)/)[1])-angle)<1e-10:n.transform===null),label+': ramp direction uses the current rise/length angle and other arrows remain unrotated');
  check(data.guide==='Follow effort through the mechanism to the load. These arrows describe the working stroke; the demonstration also returns to the start.'&&data.disclaimer==='Arrows show motion directions, not distances. Compare distances using the front tracks.',label+': working-stroke guidance retains direction-versus-distance disclaimer');
  check(data.svgs.length===3&&data.svgs.every(n=>n.hidden&&n.focusable==='false')&&data.links.length===2&&data.links.every(n=>n.hidden==='true')&&data.links.map(n=>n.parent).join(',')==='effort,mechanism',label+': artwork and connecting lines are decorative');
  check(!data.focusable&&!data.live,label+': diagram adds no keyboard stops or live announcements');
 }
 async function layout(label,doubled=false){
  const data=await panel().evaluate(el=>{
   const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
   const rgb=c=>(c.match(/[\d.]+/g)||[]).map(Number),lum=c=>rgb(c).slice(0,3).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;}).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
   const background=n=>{let p=n,bg=getComputedStyle(p).backgroundColor;while(rgb(bg)[3]===0&&p.parentElement){p=p.parentElement;bg=getComputedStyle(p).backgroundColor;}return bg;};
   const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   const text=[...el.querySelectorAll('h4,p')].map(n=>({text:n.textContent.trim(),size:parseFloat(getComputedStyle(n).fontSize),contrast:contrast(getComputedStyle(n).color,background(n)),clipped:n.scrollWidth>n.clientWidth+1,rect:rect(n)}));
   const cards=[...el.querySelector('.ml-motion-map-lanes').children].map(n=>({rect:rect(n),art:rect(n.querySelector('.ml-motion-map-art'))}));
   const links=[...el.querySelectorAll('.ml-motion-map-link')].map(n=>{const c=getComputedStyle(n);return{rect:rect(n),topWidth:parseFloat(c.borderTopWidth),leftWidth:parseFloat(c.borderLeftWidth),contrast:contrast(c.color,background(el))};});
   const svg=[...el.querySelectorAll('svg')].map(n=>({kind:n.dataset.mlMotionDirection||'mechanism',rect:rect(n),strokes:[...n.querySelectorAll('*')].filter(c=>getComputedStyle(c).stroke!=='none').map(c=>contrast(getComputedStyle(c).stroke,background(n)))}));
   const c=getComputedStyle(el);return{viewport:innerWidth,contentWidth:el.clientWidth-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight),panel:rect(el),pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,text,cards,links,svg};
  });
  observations.push({label,layout:data});const scale=doubled?2:1;
  check(data.pageFits&&data.panelFits&&data.text.every(n=>!n.clipped),label+': page, panel and text fit without horizontal overflow');
  check(data.text.some(n=>n.text==='Follow the motion'&&n.size>=20*scale)&&data.text.filter(n=>n.text==='Effort motion'||n.text==='Load motion'||n.text==='Mechanism').every(n=>n.size>=14*scale)&&data.text.filter(n=>Object.values(fixtures).flat().includes(n.text)).every(n=>n.size>=18*scale),label+': title, labels and descriptions retain readable hierarchy');
  check(data.text.every(n=>n.contrast>=4.5)&&data.links.every(n=>n.contrast>=3)&&data.svg.every(n=>n.strokes.every(c=>c>=3)),label+': text, connecting lines and icon strokes remain visible');
  check(data.svg.length===3&&data.svg.every(n=>n.rect.width===(n.kind==='mechanism'?72:64)&&n.rect.height===(n.kind==='mechanism'?72:64)),label+': mechanism and direction arrows keep their enlarged dimensions');
  const stacked=data.viewport<=600||data.contentWidth<=580;
  check(stacked?data.cards.every((n,i)=>!i||n.rect.top>=data.cards[i-1].rect.bottom)&&Math.max(...data.cards.map(n=>n.rect.left))-Math.min(...data.cards.map(n=>n.rect.left))<1:data.cards.every((n,i)=>!i||n.rect.left>=data.cards[i-1].rect.right),label+': direction layout follows the viewport and available container width');
  if(!stacked)check(Math.max(...data.cards.map(n=>n.art.top))-Math.min(...data.cards.map(n=>n.art.top))<=1,label+': art aligns across the horizontal diagram');
  data.links.forEach((n,i)=>{const here=data.cards[i].rect,next=data.cards[i+1].rect,r=n.rect;check(stacked?n.topWidth===0&&n.leftWidth===2&&r.top>=here.bottom-1&&r.bottom<=next.top+1&&r.left>=here.left&&r.right<=here.right:n.topWidth===2&&n.leftWidth===0&&r.left>=here.right-1&&r.right<=next.left+1&&r.top>=here.top&&r.bottom<=here.bottom,label+': decorative connection '+(i+1)+' fits the gap between adjacent cards');});
 }
 async function fixedWork(label){const current=await state();check(Object.keys(preserved).every(key=>JSON.stringify(current[key])===JSON.stringify(preserved[key])),label+': saved calculation record, draft and explanation are preserved');}
 async function shot(name){await panel().screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});}
 try{
  check(before[0].sha256===expectedHash&&before[1].sha256===expectedHash,'Production source and public mirror match the frozen revision');
  for(const kind of Object.keys(fixtures)){
   await mount(kind);check(!await details().evaluate(n=>n.open)&&!await panel().isVisible(),kind+': explanation initially stays behind its native disclosure');const initial=JSON.stringify(await state());await reveal();check(JSON.stringify(await state())===initial,kind+': revealing the explanation does not change simulation state');
   if(kind==='lever'&&await panel().evaluate(n=>{const c=getComputedStyle(n);return n.clientWidth-parseFloat(c.paddingLeft)-parseFloat(c.paddingRight)<=580;})){await pg.setViewportSize({width:1600,height:1100});await panel().scrollIntoViewIfNeeded();await settle();}
   await map(kind);await layout(kind+' desktop');await fixedWork(kind);
   if(kind==='lever'){
    check(await panel().evaluate(n=>{const cards=[...n.querySelector('.ml-motion-map-lanes').children].map(c=>c.getBoundingClientRect());return cards[1].left>=cards[0].right&&cards[2].left>=cards[1].right;}),'Wide desktop actually exercises three horizontal columns');await shot('desktop-motion-explanation');console.log('desktop screenshot ready',path.join(OUT,'desktop-motion-explanation.png'));for(const width of [900,601]){await pg.setViewportSize({width,height:1100});await panel().scrollIntoViewIfNeeded();await settle();await layout(width+'px motion explanation');if(width===900)await shot('narrow-desktop-motion-explanation');}await pg.setViewportSize({width:1180,height:1100});await settle();
    await press(details().locator(':scope>summary'));check(!await panel().isVisible()&&JSON.stringify(await state())===initial,'Hiding explanation preserves exact task and pose state');
    await press(discovery().getByRole('button',{name:'Inspect the clue',exact:true}));await pg.waitForFunction(()=>document.activeElement?.id==='ml-shop-stroke');let current=await state();check(current.shopClueBench==='lever'&&current.shopMotionProgress===.5&&current.shopFocusMechanism===true&&!current.shopAnimating,'Inspect the clue focuses the actual half-stroke mechanism');
    await pg.keyboard.press('ArrowRight');await settle();check(Math.abs((await state()).shopMotionProgress-.51)<1e-10,'Native stroke slider still responds after clue inspection');const inspected=JSON.stringify(await state());await reveal();check(JSON.stringify(await state())===inspected,'Revealing the enhanced explanation preserves the inspected pose');await map(kind,'Inspected lever');await fixedWork('Inspected lever');
   }
   if(kind==='ramp'){
    await pg.locator('#ml-rampHeight').focus();await pg.keyboard.press('ArrowRight');await settle();check(Math.abs((await state()).rampHeight-1.1)<1e-10,'Ramp setting changes through its native workshop slider');await map(kind,'Changed ramp geometry');await fixedWork('Changed ramp geometry');
   }
  }
  await mount('windlass',390,{dark:true,band:'g912'});await reveal();await map('windlass','Dark phone windlass');await layout('Dark phone windlass');await fixedWork('Dark phone');await shot('dark-phone-motion-explanation');
  await mount('screw',320,{contrast:true});await reveal();await map('screw','Forced phone screw');
  const rules=await panel().evaluate(el=>[...el.querySelectorAll('h4,p')].map(n=>{const size=parseFloat(getComputedStyle(n).fontSize),parts=[];let a=n;while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '.ml-shop-motion-map > '+parts.join(' > ')+'{font-size:'+size*2+'px!important}';}).join('\n'));
  const enlarged=await pg.addStyleTag({content:rules});await settle();await layout('Forced 320px doubled text',true);await map('screw','Forced doubled explanation');await fixedWork('Forced doubled text');await shot('forced-doubled-motion-explanation');await enlarged.evaluate(n=>n.remove());
  await mount('ramp',900,{band:'k2'},{rampLength:4,rampHeight:4});await reveal();await map('ramp','Younger-band vertical ramp');await layout('Younger-band narrow desktop');await fixedWork('Younger band');
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;}
 finally{
  await b.close();const base=fs.realpathSync(OUT),temporary=path.resolve(OUT,'browser-temp');if(fs.existsSync(temporary)){const resolved=fs.realpathSync(temporary);if(path.dirname(resolved)!==base)throw Error('Temporary path escaped run');fs.rmSync(resolved,{recursive:true,force:true});}if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,mounts,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
