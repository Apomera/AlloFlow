// Decorative refresh only. Complete functional results remain separate.
const fs=require('node:fs');
const entry=fs.readFileSync('reports/geometry-world-graphics-2026-09-08/verify-workspace-feedback.cjs','utf8');
eval(entry.slice(0,entry.indexOf("if(process.argv.includes('--syntax-only'))"))+'global.__preparedFeedbackSource=source;');
let s=global.__preparedFeedbackSource;delete global.__preparedFeedbackSource;
const first=s.indexOf('  for(const size of '),last=s.indexOf("  results.final=await signature();modelEqual(initial,results.final,");
if(first<0||last<0)throw Error('Expected verifier boundaries missing');
const refresh=async function(){
  await pose([-0.5,3,6],[-0.5,1.3,2.6]);await page.keyboard.press('KeyM');await page.getByRole('region',{name:'Measurement inspector',exact:true}).waitFor();await waitVolumeLabel(false);await closeInspector();
  for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:700},{width:844,height:390,landscape:true}]){
   const label=size.width+'x'+size.height,row={size};results.viewports.push(row);console.log('Refreshing achievement '+label);
   if(size.width<800||size.landscape){await page.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',configurable:true});});await page.waitForFunction(()=>!document.pointerLockElement);}
   await page.setViewportSize(size);await collapse(true);await pose([10,8,13],[0,2.5,0.5]);
   await page.evaluate(()=>__ctx.updateMulti('geometryWorld',{lastBadgeNotification:__feedbackEarnedBadge}));const badge=page.locator('.gw-achievement-toast');await badge.waitFor({state:'attached'});
   if(size.landscape){row.hidden=await badge.evaluate(node=>({display:getComputedStyle(node).display,width:node.getBoundingClientRect().width}));check(row.hidden.display==='none'&&row.hidden.width===0,'Landscape achievement is hidden');}
   else{await badge.evaluate(node=>Promise.all(node.getAnimations().map(a=>a.finished.catch(()=>{}))));row.achievement=await hit(badge);check(row.achievement.inViewport,label+': achievement fits');row.overlaps=await badge.evaluate(node=>{const r=node.getBoundingClientRect();return Array.from(document.querySelectorAll('.gw-touch-actions button,.gw-touch-look-panel')).filter(b=>{const x=b.getBoundingClientRect();return Math.min(x.right,r.right)-Math.max(x.left,r.left)>1&&Math.min(x.bottom,r.bottom)-Math.max(x.top,r.top)>1;}).map(b=>b.getAttribute('aria-label')||b.className);});check(row.overlaps.length===0,label+': achievement clears touch controls');}
   row.controls=[];for(const selector of ['.gw-viewport-control--fullscreen','.gw-viewport-control--touch']){const button=page.locator(selector);if(await button.count()){const state=await hit(button);row.controls.push(state);check(state.hit&&state.inViewport,label+': '+state.name+' remains reachable');}}
   row.utility=[];const buttons=page.locator('.gw-action-bar button');for(let i=0;i<await buttons.count();i++){const button=buttons.nth(i);await button.scrollIntoViewIfNeeded();const state=await hit(button);state.pressed=await button.getAttribute('aria-pressed');row.utility.push(state);check(state.hit&&state.inViewport&&state.height>=43.5,label+': '+state.name+' remains reachable');if(state.name==='Toggle fly mode')check(state.pressed==='true',label+': Fly exposes its active pressed state');}
   await shot(label+(size.landscape?'-dimensions':'-achievement-dimensions'));modelEqual(initial,await signature(),label+': decorative refresh preserves exact model and action history');
  }
};
s=s.slice(0,first)+'  await ('+refresh.toString()+')();\n'+s.slice(last);
s=s.replace("path.join(out,'workspace-feedback-results.json')","path.join(out,'workspace-feedback-toast-refresh-results.json')");
eval(s);
