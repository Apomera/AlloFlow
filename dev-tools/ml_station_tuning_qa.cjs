// Real React/THREE verification of station tuning controls.
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
 const files=['stem_lab/stem_tool_machinelab.js','desktop/web-app/public/stem_lab/stem_tool_machinelab.js','stem_lab/stem_lab_module.js','dev-tools/ml_scene_shots.cjs','dev-tools/ml_station_tuning_qa.cjs'];
 const before=files.map(file=>({file,sha256:hash(file)})),expectedHash=process.env.ML_EXPECTED_SOURCE;
 const check=(ok,label)=>{checks.push({label,passed:!!ok});if(!ok)throw Error(label);};
 const panel=()=>pg.locator('.ml-tuning-heading').locator('..'),state=()=>pg.evaluate(()=>window.__qaState);
 const settle=()=>pg.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const protectedSnapshot=s=>JSON.stringify({reflection:s.designReflection,power:s.benchPower,evidence:s.benchExperiments,otherReference:s.benchReferences.other,proven:s.provenBenches,pose:s.shopMotionProgress,camera:[s.shopRotX,s.shopRotY,s.shopZoom]});
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
  await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'machines',bench:kind,motionPref:'off',shopAnimating:false,shopMotionProgress:.5,shopRotX:10,shopRotY:20,shopZoom:1.2,designReflection:'Keep this explanation.',benchPower:{lever:{question:'inputPower',answer:'123.45',unit:'W'}},benchExperiments:{other:{note:'Keep saved evidence.'}},benchReferences:{other:{note:'Keep saved setup.'}},provenBenches:{pulley:true},...override}),{band:'g68',...theme}]);
  await pg.locator('.ml-shop-bay').scrollIntoViewIfNeeded();await pg.waitForFunction(()=>{const c=document.querySelector('.ml-shop-bay canvas');if(!c||!c.width||!c.height)return false;const gl=c.getContext('webgl2')||c.getContext('webgl');return gl&&!gl.isContextLost();});
  await panel().scrollIntoViewIfNeeded();await settle();check(true,kind+': real THREE canvas initialized');console.log('native mount',mounts,kind,theme.band||'g68');
 }
 async function press(target){await target.focus();await pg.keyboard.press('Enter');await settle();}
 async function comparison(open){const summary=panel().locator('.ml-station-comparison summary');if(await summary.evaluate(n=>n.parentElement.open)!==open)await press(summary);}
 async function save(){await comparison(true);await press(panel().getByRole('button',{name:'Save current setup',exact:true}));await comparison(false);}
 async function key(id,button){const input=panel().locator('#ml-'+id);await input.focus();await pg.keyboard.press(button);await settle();return input;}
 async function semantics(label){
  const data=await panel().evaluate(el=>({heading:el.querySelector('h3').textContent,icon:el.querySelector('.ml-tuning-heading svg')?.getAttribute('aria-hidden'),inputs:[...el.querySelectorAll('input.ml-station-range')].map(n=>({id:n.id,label:n.getAttribute('aria-label'),value:n.value,min:n.min,max:n.max,step:n.step,text:n.getAttribute('aria-valuetext'),labelled:n.labels.length,height:n.getBoundingClientRect().height})),references:[...el.querySelectorAll('[data-ml-setting-reference]')].map(n=>({key:n.dataset.mlSettingReference,text:n.textContent})),markers:[...el.querySelectorAll('[data-ml-saved-marker]')].map(n=>({key:n.dataset.mlSavedMarker,fill:Number(n.dataset.referenceFill),hidden:n.getAttribute('aria-hidden')}))}));observations.push({label,semantics:data});
  check(data.heading==='Tune this station'&&data.icon==='true',label+': named heading and decorative icon');
  check(data.inputs.length>=2&&data.inputs.every(n=>n.label&&n.labelled===1&&n.text&&n.height>=44&&Number(n.value)>=Number(n.min)&&Number(n.value)<=Number(n.max)),label+': native named ranges have values, limits and touch targets');
  const s=await state();check(data.inputs.every(n=>Number(n.value)===s[n.id.slice(3)]),label+': native range values match state');
  check(data.markers.every(n=>n.hidden==='true'&&n.fill>=0&&n.fill<=100),label+': saved markers are decorative and bounded');
 }
 async function layout(label){
  await panel().scrollIntoViewIfNeeded();await settle();const data=await panel().evaluate(el=>{
   const box=n=>{const r=n.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
   const nodes=[...el.querySelectorAll('.ml-tuning-heading *, .ml-station-control *')].filter(n=>!n.closest('svg')&&n.getBoundingClientRect().height&&[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()));
   const ranges=n=>[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()).flatMap(c=>{const r=document.createRange();r.selectNodeContents(c);return [...r.getClientRects()].map(x=>({left:x.left,right:x.right,top:x.top,bottom:x.bottom}));});
   return{pageFits:document.documentElement.scrollWidth<=innerWidth+1,panelFits:el.scrollWidth<=el.clientWidth+1,box:box(el),text:nodes.map(n=>({text:n.textContent,box:box(n),ranges:ranges(n),words:[...n.childNodes].filter(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim()).flatMap(c=>[...c.textContent.matchAll(/\S+/g)].map(m=>{const r=document.createRange();r.setStart(c,m.index);r.setEnd(c,m.index+m[0].length);return r.getClientRects().length;}))})),scales:[...el.querySelectorAll('.ml-setting-scale')].map(n=>({box:box(n),texts:[...n.querySelectorAll('span')].filter(x=>x.children.length===0&&x.textContent.trim()).map(x=>({text:x.textContent,box:box(x)})),next:n.nextElementSibling?box(n.nextElementSibling):null}))};
  });observations.push({label,layout:data});
  check(data.pageFits&&data.panelFits,label+': page and panel fit');
  check(data.text.every(n=>n.ranges.every(r=>r.left>=data.box.left-1&&r.right<=data.box.right+1)),label+': text stays inside tuning panel');
  check(data.text.every(n=>n.words.every(p=>p===1)),label+': whole words and formatted values');
  check(data.scales.every(s=>s.texts.every((t,i)=>t.box.top>=s.box.top-1&&t.box.bottom<=s.box.bottom+1&&(!i||t.box.left>=s.texts[i-1].box.right+1))&&(!s.next||s.next.top>=s.box.bottom)),label+': scale labels do not overlap each other or saved state');
 }
 async function doubledText(){
  await panel().evaluate(el=>el.id='qa-tuning-panel');
  const css=await panel().evaluate(el=>[...el.querySelectorAll('.ml-tuning-heading *, .ml-station-control *')].filter(n=>!n.closest('svg')&&[...n.childNodes].some(c=>c.nodeType===Node.TEXT_NODE&&c.textContent.trim())).map(n=>{let a=n,parts=[];while(a!==el){parts.unshift(a.tagName.toLowerCase()+':nth-child('+([...a.parentElement.children].indexOf(a)+1)+')');a=a.parentElement;}return '#qa-tuning-panel > '+parts.join(' > ')+'{font-size:'+parseFloat(getComputedStyle(n).fontSize)*2+'px!important}';}).join('\n'));
  await pg.addStyleTag({content:css});await settle();
 }
 async function shot(name){await panel().screenshot({path:path.join(OUT,name+'.png'),animations:'disabled'});shots.push({file:name+'.png',sha256:hash(path.join(OUT,name+'.png'))});console.log('screenshot ready',name);}
 try{
  check(before[0].sha256===expectedHash&&before[1].sha256===expectedHash,'Frozen canonical/public sources');
  await mount('lever',1180,{}, {benchResult:{ok:false,message:'Prior response',showCalculation:false}});const initial=protectedSnapshot(await state());
  await semantics('Desktop lever');await layout('Desktop lever');await shot('desktop-tuning');await save();
  const old=(await state()).leverEffortArm;await key('leverEffortArm','ArrowRight');check(Math.abs((await state()).leverEffortArm-old-.1)<1e-9,'ArrowRight updates lever by its native step');check((await state()).benchResult===null,'Range adjustment clears stale proof feedback');
  check(await panel().locator('.ml-station-control[data-ml-setting-changed=true]').count()===1,'Only adjusted setting shows Changed');await semantics('Saved changed lever');await layout('Saved changed lever');await shot('desktop-tuning-changed');
  await key('leverEffortArm','Home');check((await state()).leverEffortArm===.2,'Home reaches minimum');await key('leverEffortArm','End');check((await state()).leverEffortArm===4,'End reaches maximum');
  await comparison(true);await press(panel().getByRole('button',{name:'Restore saved setup',exact:true}));await comparison(false);check((await state()).leverEffortArm===old&&await panel().locator('.ml-station-control[data-ml-setting-changed=true]').count()===0,'Restore resets current controls and changed state');check(protectedSnapshot(await state())===initial,'Tuning preserves camera, pose, records and other practice');
  await mount('pulley',390,{band:'k2'});await semantics('Phone pulley k2');check(await panel().locator('#ml-loadDistance').count()===0,'Younger band retains existing control gating');await key('pulleySegments','End');check((await state()).pulleySegments===6,'Pulley native integer range reaches six');await layout('Phone pulley');await shot('phone-pulley-tuning');
  await mount('screw',390,{dark:true});await save();await key('screwPitch','Home');await semantics('Dark saved screw');await layout('Dark saved screw');await shot('dark-screw-tuning');
  await mount('screw',320,{contrast:true},{screwPitch:.001,screwHandleR:.5,screwLoad:5000,loadDistance:3});await save();await key('screwPitch','End');await doubledText();await semantics('Forced320 doubled screw');await layout('Forced320 doubled screw');await shot('forced-doubled-tuning');
 }catch(e){errors.push(String(e.stack||e));process.exitCode=1;try{await shot('failure-tuning');}catch(x){errors.push('Failure screenshot: '+x);}}
 finally{
  await b.close();clearBrowserTemp(false);if(path.dirname(path.resolve(pagePath))!==path.resolve(OUT))throw Error('Host escaped run');fs.unlinkSync(pagePath);
  const after=files.map(file=>({file,sha256:hash(file)}));if(JSON.stringify(before)!==JSON.stringify(after))errors.push('Inputs changed during run');fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({startedAt,completedAt:new Date().toISOString(),before,after,mounts,checks,observations,shots,errors},null,2)+'\n');console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors}));if(errors.length)process.exitCode=1;
 }
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
