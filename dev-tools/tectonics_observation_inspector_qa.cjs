'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict');
const repo=process.env.PT_REPO||path.resolve(__dirname,'..'),{chromium}=require(path.join(repo,'node_modules/playwright'));
const read=file=>fs.readFileSync(path.join(repo,file),'utf8'),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const source=fs.readFileSync(process.env.PT_OBSERVATION_SOURCE||path.join(repo,'stem_lab/stem_tool_platetectonics.js'),'utf8');
const registrySource=fs.readFileSync(process.env.PT_OBSERVATION_REGISTRY||path.join(repo,'ui_strings.js'),'utf8'),registry=JSON.parse(registrySource);
const out=process.env.PT_OBSERVATION_OUT||path.join(repo,'scratch/tectonics-observation-inspector-review');fs.mkdirSync(out,{recursive:true});
const report={sourceSha256:hash(source),registryTectonicsSha256:hash(JSON.stringify(registry.stem.platetectonics)),checks:[],captures:[],layouts:[],errors:[],passed:false};
const saved={version:1,angle:42,points:Array.from({length:8},(_,i)=>({x:100.12345678901234+i*50,z:100.625+i*45,m:4}))};
function check(name,details){report.checks.push({name,passed:true,details});console.log('PASS',name);}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:1100},reducedMotion:'reduce',hasTouch:true});page.setDefaultTimeout(45000);page.on('pageerror',error=>report.errors.push(String(error)));
  await page.setContent('<!doctype html><html lang="en"><head><title>Earthquake evidence inspection</title></head><body style="margin:0;font-family:system-ui"><main id="app" style="padding:12px;max-width:1100px;margin:auto"></main></body></html>');
  await page.addStyleTag({content:read('dev-tools/.cache/sweep-tailwind.css')});
  for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','node_modules/axe-core/axe.min.js'])await page.addScriptTag({content:read(file)});
  await page.evaluate(()=>{
   window.StemLab={registerTool(){},ensureThree:()=>new Promise(()=>{}),makeBayViewer:()=>({})};
   const frames=new Map();let id=0,now=performance.now(),rng=0;
   window.requestAnimationFrame=callback=>{frames.set(++id,callback);return id;};window.cancelAnimationFrame=id=>frames.delete(id);
   const sequence=[0,0.2,0.8,0.9,0.5,0.5];Math.random=()=>sequence[rng++%sequence.length];
   window.qaFrame=(depth=0.9,shallow=false)=>{sequence[2]=shallow?0:0.8;sequence[3]=depth;rng=0;now=Math.max(now+1000,performance.now());const callbacks=[...frames.values()];frames.clear();ReactDOM.flushSync(()=>callbacks.forEach(callback=>callback(now)));};
   window.qaStep=count=>{for(let i=0;i<count;i++){rng=0;ReactDOM.flushSync(()=>document.querySelector('[data-pt-model-step]').click());}};
  });
  await page.addScriptTag({content:source});
  await page.evaluate(strings=>{
   window.qaStrings=strings;const root=ReactDOM.createRoot(document.querySelector('#app'));let generation=0;
   window.qaMount=(dark,contrast,savedSlab)=>{
    document.body.style.background=dark?'#020617':'#f1f5f9';document.documentElement.classList.toggle('dark',dark);
    window.qaEffects={records:[],drafts:[],depth:[],inquiry:[],rewards:[],pings:[],notices:[]};window.qaMissing=new Set();window.qaSaved=JSON.stringify(savedSlab);
    ReactDOM.flushSync(()=>root.render(React.createElement(React.StrictMode,null,React.createElement(AlloTectonicsInteractive,{
     key:++generation,darkMode:dark,isContrast:contrast,savedSlab,
     t:(key,fallback)=>{const value=key.split('.').reduce((object,part)=>object&&object[part],qaStrings);if(typeof value!=='string'){qaMissing.add(key);return fallback;}return value;},
     onRecordSlab:record=>qaEffects.records.push(record),onRecordBoundaryDraft:record=>qaEffects.drafts.push(record),onRecordDepths:record=>qaEffects.depth.push(record),onRecordBoundaryInquiry:record=>qaEffects.inquiry.push(record),
     awardXP:value=>qaEffects.rewards.push(value),beep:value=>qaEffects.pings.push(value),announceToSR:value=>qaEffects.notices.push(value)
    }))));
    ReactDOM.flushSync(()=>{const log=document.querySelector('[data-pt-quake-log]');log.open=true;log.dispatchEvent(new Event('toggle',{bubbles:true}));});
   };
   window.qaPhysical=()=>({time:document.querySelector('[data-pt-model-reading="time"]').textContent,movement:document.querySelector('[data-pt-model-reading="movement"]').textContent,angle:document.querySelector('#pt-ql-dip').value,play:document.querySelector('[data-pt-model-play]').textContent,saved:qaSaved});
   window.qaSelected=()=>({index:document.querySelector('[data-pt-quake-inspected-values]')?.dataset.ptQuakeInspectedValues,x:document.querySelector('[data-pt-quake-inspected-distance]')?.textContent,z:document.querySelector('[data-pt-quake-inspected-depth]')?.textContent,source:document.querySelector('[data-pt-quake-inspected-source]')?.dataset.ptQuakeInspectedSource});
   window.qaMetrics=()=>{
    const svg=document.querySelector('[data-pt-quake-plot]'),matrix=svg.getScreenCTM(),point=(x,y)=>{const p=svg.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(matrix);};
    const grid=(axis,km)=>document.querySelector('[data-pt-quake-grid="'+axis+'"][data-km="'+km+'"]');
    const x200=point(Number(grid('distance',200).getAttribute('x1')),0),x400=point(Number(grid('distance',400).getAttribute('x1')),0);
    const z200=point(0,Number(grid('depth',200).getAttribute('y1'))),z400=point(0,Number(grid('depth',400).getAttribute('y1')));
    const line=document.querySelector('[data-pt-slab-line="guess"]');let angle=null;
    if(line){const a=point(Number(line.getAttribute('x1')),Number(line.getAttribute('y1'))),b=point(Number(line.getAttribute('x2')),Number(line.getAttribute('y2')));angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;}
    const bounds=svg.getBoundingClientRect(),rect=node=>{const b=node.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
    return {distanceSpan:Math.hypot(x400.x-x200.x,x400.y-x200.y),depthSpan:Math.hypot(z400.x-z200.x,z400.y-z200.y),angle,
     labels:[...svg.querySelectorAll('[data-pt-quake-axis-label]')].map(node=>{const rect=node.getBoundingClientRect();return {text:node.textContent,font:parseFloat(getComputedStyle(node).fontSize)*Math.hypot(matrix.a,matrix.b),left:rect.left-bounds.left,right:rect.right-bounds.left,top:rect.top-bounds.top,bottom:rect.bottom-bounds.top};}),
     controls:[...document.querySelectorAll('[data-pt-quake-inspector] select,[data-pt-quake-inspector] button,[data-pt-quake-inspect-row]')].map(node=>{const box=node.getBoundingClientRect();return {font:parseFloat(getComputedStyle(node).fontSize),width:box.width,height:box.height};}),
     workbench:rect(document.querySelector('[data-pt-quake-workbench]')),chartColumn:rect(document.querySelector('[data-pt-quake-chart-column]')),readoutColumn:rect(document.querySelector('[data-pt-quake-readout-column]')),
     width:bounds.width,height:bounds.height,overflow:document.documentElement.scrollWidth-innerWidth};
   };
  },registry);
  const paint=()=>page.evaluate(()=>{qaFrame();qaFrame();});
  const click=selector=>page.locator(selector).evaluate(node=>ReactDOM.flushSync(()=>node.click()));
  const settle=async()=>{await paint();await page.waitForFunction(()=>{const svg=document.querySelector('[data-pt-quake-plot]');return svg&&[...svg.querySelectorAll('[data-pt-quake-axis-label]')].every(node=>Math.abs(parseFloat(getComputedStyle(node).fontSize)*Math.hypot(svg.getScreenCTM().a,svg.getScreenCTM().b)-14)<0.03);},{},{polling:50,timeout:10000});};
  const layouts=[{width:320,dark:false},{width:320,dark:true},{width:390,dark:false},{width:390,dark:true},{width:1100,dark:false},{width:1100,dark:true},{width:390,dark:true,contrast:true}];
  for(const layout of layouts){
   const tag=(layout.contrast?'contrast':layout.dark?'dark':'light')+'-'+layout.width;
   await page.setViewportSize({width:layout.width,height:1100});await page.evaluate(({layout,saved})=>qaMount(layout.dark,!!layout.contrast,saved),{layout,saved});await settle();
   const overview=await page.locator('[data-pt-quake-overview]').evaluate(node=>node.innerHTML);
   assert.deepEqual(await page.locator('[data-pt-quake-band-count]').allTextContents(),['0','5','3']);
   assert.equal(await page.locator('[data-pt-quake-overview]').getAttribute('aria-live'),'off');
   assert.equal(await page.locator('[data-pt-quake-readiness-progress]').count(),0);
   const bandTiles=await page.locator('[data-pt-quake-band-key]').evaluate(node=>[...node.children].map(tile=>{const r=tile.getBoundingClientRect();return {width:r.width,overflow:tile.scrollWidth>tile.clientWidth,font:parseFloat(getComputedStyle(tile.querySelector('dt')).fontSize)};}));
   for(const tile of bandTiles){assert.ok(tile.width>=130);assert.equal(tile.overflow,false);assert.ok(tile.font>=14);}
   check(tag+': displayed-sample depth counts remain readable and quiet, with a checked comparison guide');
   const before=await page.evaluate(()=>qaPhysical());await page.locator('[data-pt-quake-inspect-select]').selectOption('2');await settle();
   const selected=await page.evaluate(()=>qaSelected());assert.equal(selected.x,String(saved.points[2].x));assert.equal(selected.z,String(saved.points[2].z));assert.equal(selected.source,'captured');assert.deepEqual(await page.evaluate(()=>qaPhysical()),before);
   assert.equal(await page.locator('[data-pt-quake-point][data-pt-quake-inspected="true"]').count(),1);assert.equal(await page.locator('[data-pt-quake-inspection-ring="2"]').count(),1);assert.equal(await page.locator('[data-pt-slab-coordinate-inspected="true"]').count(),1);
   check(tag+': exact inspected observation links the ring and coordinate row without changing saved evidence');
   await click('[data-pt-quake-inspect-clear]');await page.locator('[data-pt-quake-plot]').evaluate(node=>node.scrollIntoView({block:'center'}));await settle();
   const target=await page.locator('[data-pt-quake-point="7"]').evaluate(node=>{const m=node.ownerSVGElement.getScreenCTM(),x=Number(node.getAttribute('cx')),y=Number(node.getAttribute('cy'));return {x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};});
   await page.touchscreen.tap(target.x+12,target.y+4);await settle();assert.equal((await page.evaluate(()=>qaSelected())).index,'7');assert.deepEqual(await page.evaluate(()=>qaPhysical()),before);
   const plotCorner=await page.locator('[data-pt-quake-plot]').boundingBox();await page.mouse.click(plotCorner.x+3,plotCorner.y+3);await settle();assert.equal((await page.evaluate(()=>qaSelected())).index,'7');
   assert.deepEqual(await page.evaluate(()=>Object.values(qaEffects).flat()),[]);check(tag+': touch picks the nearest event within 22 screen pixels, while empty graph clicks preserve it silently');
   await page.locator('[data-pt-quake-inspect-select]').selectOption('2');await settle();
   // SVGPoint and Chromium viewport coordinates round to floating-point pixels.
   let metrics=await page.evaluate(()=>qaMetrics());assert.ok(Math.abs(metrics.distanceSpan-metrics.depthSpan)<0.001,JSON.stringify(metrics));assert.ok(Math.abs(metrics.angle-42)<0.0001,JSON.stringify(metrics));assert.equal(metrics.overflow,0);
   for(const label of metrics.labels){assert.ok(label.font>=13.97);assert.ok(label.left>=-0.5&&label.right<=metrics.width+0.5&&label.top>=-0.5&&label.bottom<=metrics.height+0.5,'Clipped axis label: '+label.text);}
   check(tag+': actual SVG transforms preserve kilometre scales, estimated angles and readable contained labels',metrics);
   if(metrics.workbench.width>=736){assert.ok(metrics.readoutColumn.left>=metrics.chartColumn.right+15);assert.ok(Math.abs(metrics.readoutColumn.top-metrics.chartColumn.top)<1);}
   else {assert.ok(metrics.readoutColumn.top>=metrics.chartColumn.bottom+15);assert.ok(Math.abs(metrics.readoutColumn.left-metrics.chartColumn.left)<1);}
   assert.equal(await page.locator('[data-pt-quake-boundary-reference]').getAttribute('data-km'),'0');check(tag+': evidence columns follow available panel space with a distinct zero-distance boundary reference',metrics.workbench);
   const table=page.locator('[data-pt-slab-coordinates]');await table.locator('summary').focus();await page.keyboard.press('Space');await settle();
   await page.locator('[data-pt-quake-inspect-row="2"]').focus();await page.keyboard.press('ArrowDown');await settle();assert.equal((await page.evaluate(()=>qaSelected())).index,'3');assert.equal(await page.evaluate(()=>document.activeElement.dataset.ptQuakeInspectRow),'3');
   await page.keyboard.press('End');await settle();assert.equal((await page.evaluate(()=>qaSelected())).index,'7');await page.keyboard.press('Home');await settle();assert.equal((await page.evaluate(()=>qaSelected())).index,'0');
   assert.equal(await page.locator('[data-pt-quake-inspect-row][tabindex="0"]').count(),1);assert.equal(await page.locator('[data-pt-quake-log]').evaluate(node=>node.open),true);
   check(tag+': keyboard row navigation retains a single tab stop and leaves the outer disclosure open');
   await click('[data-pt-quake-inspect-next]');await settle();assert.equal((await page.evaluate(()=>qaSelected())).index,'1');await click('[data-pt-quake-inspect-prev]');await settle();assert.equal((await page.evaluate(()=>qaSelected())).index,'0');
   await click('[data-pt-quake-inspect-clear]');await settle();assert.equal(await page.locator('[data-pt-quake-inspection-ring]').count(),0);await page.locator('[data-pt-quake-inspect-select]').selectOption('4');await settle();
   metrics=await page.evaluate(()=>qaMetrics());for(const control of metrics.controls){assert.ok(control.font>=14);assert.ok(control.width>=43.9&&control.height>=43.9);}
   const violations=await page.locator('[data-pt-quake-log]').evaluate(async node=>(await axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));report.lastAccessibility={tag,violations};assert.deepEqual(violations,[]);assert.equal(metrics.overflow,0);
   report.layouts.push({name:tag,metrics,violations});check(tag+': inspection targets, panel text, depth bands and disclosure pass accessibility and overflow checks');
   const idle=await page.evaluate(()=>({html:document.querySelector('[data-pt-quake-log]').innerHTML,physical:qaPhysical(),effects:JSON.stringify(qaEffects)}));
   await page.evaluate(()=>{for(let i=0;i<1200;i++)qaFrame();});assert.deepEqual(await page.evaluate(()=>({html:document.querySelector('[data-pt-quake-log]').innerHTML,physical:qaPhysical(),effects:JSON.stringify(qaEffects)})),idle);
   assert.deepEqual(await page.evaluate(()=>Object.values(qaEffects).flat()),[]);check(tag+': 1200 paused idle frames retain inspection with no writes, awards, pings or announcements');
   await table.locator('summary').focus();await page.keyboard.press('Space');await settle();
   const capturedFile=path.join(out,tag+'-checked-inspection.png');await page.locator('[data-pt-quake-log]').screenshot({path:capturedFile,animations:'disabled'});report.captures.push(capturedFile);
   await click('[data-pt-model-play]');await page.evaluate(()=>{for(let i=0;i<10;i++)qaFrame();});await settle();assert.deepEqual(await page.evaluate(()=>qaSelected()),{index:'4',x:String(saved.points[4].x),z:String(saved.points[4].z),source:'captured'});
   assert.equal(await page.locator('[data-pt-quake-overview]').evaluate(node=>node.innerHTML),overview);
   assert.equal(await page.locator('[data-pt-quake-point]').count(),8);assert.equal(await page.evaluate(()=>qaEffects.records.length),0);
   await page.locator('[data-pt-quake-plot]').evaluate(node=>node.scrollIntoView({block:'center'}));await settle();
   const frozenTarget=await page.locator('[data-pt-quake-point="7"]').evaluate(node=>{const m=node.ownerSVGElement.getScreenCTM(),x=Number(node.getAttribute('cx')),y=Number(node.getAttribute('cy'));return {x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f};});
   await page.touchscreen.tap(frozenTarget.x,frozenTarget.y);await settle();assert.deepEqual(await page.evaluate(()=>qaSelected()),{index:'7',x:String(saved.points[7].x),z:String(saved.points[7].z),source:'captured'});assert.equal(await page.evaluate(()=>qaEffects.records.length),0);
   await click('[data-pt-slab-revise]');await click('[data-pt-model-play]');await settle();assert.equal(await page.locator('[data-pt-quake-inspection-ring]').count(),0);assert.equal(await page.locator('[data-pt-slab-line="fit"]').count(),0);
   await page.locator('[data-pt-quake-inspect-select]').selectOption('2');await settle();assert.equal((await page.evaluate(()=>qaSelected())).source,'live');assert.equal(await page.locator('[data-pt-quake-fit]').count(),0);
   check(tag+': checked inspection stays frozen during new events, while Revise clears it and hides fitted evidence');
   const liveFile=path.join(out,tag+'-live-inspection.png');await page.locator('[data-pt-quake-log]').screenshot({path:liveFile,animations:'disabled'});report.captures.push(liveFile);
   assert.deepEqual(await page.evaluate(()=>[...qaMissing]),[]);check(tag+': all rendered translations exist in the actual scoped dictionary');
  }
  await page.setViewportSize({width:1100,height:1100});await page.locator('#app').evaluate(node=>node.style.maxWidth='430px');await page.evaluate(value=>qaMount(false,false,value),saved);await settle();await page.locator('[data-pt-quake-inspect-select]').selectOption('2');await settle();
  const narrow=await page.evaluate(()=>qaMetrics());assert.ok(narrow.workbench.width<736);assert.ok(narrow.readoutColumn.top>=narrow.chartColumn.bottom+15);assert.equal(narrow.overflow,0);for(const label of narrow.labels)assert.ok(label.font>=13.97);
  const narrowViolations=await page.locator('[data-pt-quake-log]').evaluate(async node=>(await axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>v.id));assert.deepEqual(narrowViolations,[]);
  const narrowFile=path.join(out,'light-desktop-narrow-host.png');await page.locator('[data-pt-quake-log]').screenshot({path:narrowFile,animations:'disabled'});report.captures.push(narrowFile);check('A narrow host inside a desktop viewport stacks the evidence panels without overflow or accessibility violations');
  await page.locator('#app').evaluate(node=>node.style.maxWidth='1100px');
  await page.evaluate(()=>qaMount(false,false,undefined));await settle();assert.equal(await page.locator('[data-pt-quake-inspect-select]').isDisabled(),true);assert.equal(await page.locator('[data-pt-quake-inspected-values]').count(),0);
  await page.evaluate(()=>qaStep(200));await settle();await page.locator('[data-pt-quake-inspect-select]').selectOption('0');await settle();await page.evaluate(()=>qaStep(1));await settle();
  assert.equal(await page.locator('[data-pt-quake-point]').count(),200);assert.equal(await page.locator('[data-pt-quake-inspection-ring]').count(),0);assert.equal(await page.locator('[data-pt-quake-inspect-select]').inputValue(),'');
  assert.equal(await page.evaluate(()=>qaEffects.records.length+qaEffects.rewards.length+qaEffects.pings.length),0);check('Empty and rolling 200-event samples stay truthful; removed events never transfer selection to a replacement');
  const coincident={version:1,angle:42,points:Array.from({length:8},()=>({x:100.125,z:200.25,m:4}))};await page.evaluate(value=>qaMount(true,false,value),coincident);await settle();await page.locator('[data-pt-quake-inspect-select]').selectOption('1');await settle();
  assert.equal(await page.locator('[data-pt-quake-point="0"]').getAttribute('data-pt-quake-inspected'),'false');assert.equal(await page.locator('[data-pt-quake-point="1"]').getAttribute('data-pt-quake-inspected'),'true');check('Coincident observations remain individually inspectable with their exact event positions');
  for(const layout of [{width:320,dark:false},{width:390,dark:true}]){
   const tag=(layout.dark?'dark':'light')+'-'+layout.width+'-readiness';
   await page.setViewportSize({width:layout.width,height:1100});await page.evaluate(value=>qaMount(value.dark,false,undefined),layout);await settle();
   assert.equal(await page.locator('[data-pt-quake-readiness]').getAttribute('data-pt-quake-readiness'),'collect');
   assert.equal(await page.locator('[data-pt-quake-readiness-progress]').getAttribute('aria-valuenow'),'0');
   assert.equal(await page.locator('[data-pt-quake-lock]').isDisabled(),true);
   assert.match(await page.locator('[data-pt-quake-readiness-help]').textContent(),/Advance 60,000 years/);
   const empty=await page.locator('[data-pt-quake-overview]').evaluate(node=>node.innerHTML);
   await page.evaluate(()=>{for(let i=0;i<1200;i++)qaFrame();});assert.equal(await page.locator('[data-pt-quake-overview]').evaluate(node=>node.innerHTML),empty);
   assert.deepEqual(await page.evaluate(()=>Object.values(qaEffects).flat()),[]);
   check(tag+': paused empty guide gives an explicit next action and stays silent across 1200 idle frames');
   await click('[data-pt-model-play]');await page.evaluate(()=>{qaEffects.notices=[];for(let i=0;i<4;i++)qaFrame(0.2,true);for(let i=0;i<7;i++)qaFrame(0.3);});
   assert.deepEqual(await page.locator('[data-pt-quake-band-count]').allTextContents(),['4','7','0']);
   assert.equal(await page.locator('[data-pt-quake-lock]').isDisabled(),true);
   assert.equal(await page.locator('[data-pt-quake-readiness-progress]').getAttribute('aria-valuenow'),'7');
   await page.evaluate(()=>qaFrame(0.3));
   assert.equal(await page.locator('[data-pt-quake-lock]').isDisabled(),false);
   assert.equal(await page.locator('[data-pt-quake-readiness]').getAttribute('data-pt-quake-readiness'),'ready');
   await page.evaluate(()=>{for(let i=0;i<3;i++)qaFrame();});
   assert.equal(await page.locator('[data-pt-quake-readiness-progress]').getAttribute('aria-valuenow'),'8');
   assert.match(await page.locator('[data-pt-quake-readiness-progress]').getAttribute('aria-valuetext'),/deeper: 11\./);
   assert.equal(await page.locator('[data-pt-slab-line="fit"]').count(),0);assert.deepEqual(await page.evaluate(()=>Object.values(qaEffects).flat()),[]);
   check(tag+': shallow events do not unlock Check, qualifying events unlock it without saving or revealing the fit');
   await click('[data-pt-model-play]');await settle();
   const violations=await page.locator('[data-pt-quake-log]').evaluate(async node=>(await axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>v.id));assert.deepEqual(violations,[]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
   const readyFile=path.join(out,tag+'-ready.png');await page.locator('[data-pt-quake-log]').screenshot({path:readyFile,animations:'disabled'});report.captures.push(readyFile);
   await page.locator('[data-pt-quake-lock]').focus();await page.keyboard.press('Enter');await settle();
   assert.equal(await page.evaluate(()=>qaEffects.records.length),1);
   assert.equal(await page.locator('[data-pt-quake-readiness]').getAttribute('data-pt-quake-readiness'),'checked');
   assert.equal(await page.locator('[data-pt-quake-readiness-progress]').count(),0);
   assert.equal(await page.locator('[data-pt-slab-line="fit"]').count(),1);
   assert.equal(await page.evaluate(()=>document.activeElement.dataset.ptSlabRevise),'true');
   const checkedFile=path.join(out,tag+'-checked.png');await page.locator('[data-pt-quake-log]').screenshot({path:checkedFile,animations:'disabled'});report.captures.push(checkedFile);
   await click('[data-pt-slab-revise]');await settle();assert.equal(await page.locator('[data-pt-slab-line="fit"]').count(),0);
   assert.equal(await page.evaluate(()=>qaEffects.records.length),1);assert.equal(await page.evaluate(()=>qaEffects.rewards.length+qaEffects.pings.length),0);
   assert.deepEqual(await page.evaluate(()=>[...qaMissing]),[]);
   check(tag+': readable progress and keyboard Check pass accessibility, save once and return to editable evidence on Revise');
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(error){report.failure=error.stack;throw error;}
 finally{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
