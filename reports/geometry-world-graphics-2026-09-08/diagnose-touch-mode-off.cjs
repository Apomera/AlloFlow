const fs=require('node:fs');
let s=fs.readFileSync('reports/geometry-world-graphics-2026-09-08/verify-controls-views-pass.cjs','utf8');
s=s.replace('controls-views-', 'touch-mode-off-');
s=s.replace("path.join(out,'controls-views-results.json')", "path.join(out,'touch-mode-off-results.json')");
const start=s.indexOf('  await pose([8,2.5,0.5]');
const end=s.indexOf('  for(const size of ',start);
s=s.slice(0,start)+'  const baseline=initial;\n'+s.slice(end);
s=s.replace('[{width:1440,height:900},{width:390,height:844},{width:320,height:700},{width:844,height:390,landscape:true}]','[{width:390,height:844}]');
s=s.replace("if(ending==='mode-off'){await page.locator('.gw-viewport-control--touch').click();await frames();}", `if(ending==='mode-off'){
    results.modeOff=after;
    results.modeOff.diagnostics=await page.evaluate(()=>{const node=document.querySelector('.gw-viewport-control--touch'),r=node.getBoundingClientRect();return {pointerLock:document.pointerLockElement?.tagName,pointerLockClass:document.pointerLockElement?.className,engineLocked:__geoWorldEngine.isPointerLocked,active:document.activeElement?.outerHTML?.slice(0,180),stack:document.elementsFromPoint(r.x+r.width/2,r.y+r.height/2).map(n=>({tag:n.tagName,cls:n.className,z:getComputedStyle(n).zIndex,pointer:getComputedStyle(n).pointerEvents})),move:__geoWorldEngine.moveState};});
    throw new Error('Bounded diagnostic complete after mode-off release');
   }`);
s=s.replace(" await page.goto('"," await page.addInitScript(()=>{window.__touchTrace=[];for(const type of ['click','touchstart','touchend','touchcancel','pointerlockchange'])document.addEventListener(type,event=>window.__touchTrace.push({type,target:event.target?.tagName,label:event.target?.getAttribute?.('aria-label'),pointerType:event.pointerType,touchDerived:event.sourceCapabilities?.firesTouchEvents,locked:document.pointerLockElement?.tagName,engineLocked:window.__geoWorldEngine?.isLocked,time:performance.now()}),true);});await page.goto('");
s=s.replace("results.modeOff=after;", "results.modeOff=after;results.eventTrace=await page.evaluate(()=>window.__touchTrace);");
eval(s);
