// Bounded actual React/WebGL QA. Reuses the proven small creation and local server.
// Run only after source-ready; no application source is edited.
const fs=require('node:fs');
let source=fs.readFileSync('reports/geometry-world-graphics-2026-09-08/verify-controls-views-pass.cjs','utf8');
source=source.slice(0,source.indexOf('  await pose([8,2.5,0.5]'));
source=source.replace('page.setDefaultTimeout(18000)','page.setDefaultTimeout(45000)').replaceAll('controls-views-','workspace-feedback-').replace('placements:[],viewports:[]','measurements:[],viewports:[]');
source=source.replace("put(5,1,0,'wood','halfB')", "put(5,1,0,'wood')");
source=source.replace('window.__controlsViewsEngine=en;', 'window.__controlsViewsEngine=en;window.__feedbackBadgeKeep=setInterval(()=>{const badge=__ctx.toolData.geometryWorld.lastBadgeNotification;if(badge&&en._badgeDismissTimer)clearTimeout(en._badgeDismissTimer);},30);');
source=source.replace("  await page.goto('",`  await page.addInitScript(()=>{window.__canvasTextTrace=[];const draw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(value,...args){window.__canvasTextTrace.push({text:String(value),width:this.canvas.width,height:this.canvas.height,font:this.font});if(window.__canvasTextTrace.length>300)window.__canvasTextTrace.shift();return draw.call(this,value,...args);};});
  await page.goto('`);
source+=String.raw`
  const modelEqual=(before,after,message)=>check(before.world===after.world&&before.hash===after.hash&&before.undo===after.undo&&before.redo===after.redo&&before.placed===after.placed&&before.displayedPlaced===after.displayedPlaced,message);
  async function closeInspector(){const button=page.getByRole('button',{name:'Close measurement inspector',exact:true});if(await button.count()&&await button.isVisible())await button.click();}
  async function readMeasurement(){return page.evaluate(()=>{const m=__ctx.toolData.geometryWorld.measureResult;return {count:m.count,L:m.L,W:m.W,H:m.H,occupiedVolume:m.occupiedVolume,boundingVolume:m.boundingVolume,formatted:m.formattedOccupiedVolume||m.formattedVolume,isSolidPrism:m.isSolidPrism,hasFractions:m.hasFractions,textTrace:__canvasTextTrace.slice(),gpu:Object.assign({},__geoWorldEngine.renderer.info.memory),labels:__geoWorldEngine._dimLines.filter(o=>o.isSprite).map(o=>({text:o.userData.gwDimensionLabel,scale:o.scale.toArray(),texture:[o.material.map.image.width,o.material.map.image.height]}))};});}
  async function waitVolumeLabel(solid){await page.waitForFunction(solid=>{const m=__ctx.toolData.geometryWorld.measureResult;if(!m)return false;const wanted=solid?m.L+'×'+m.W+'×'+m.H+'='+(m.formattedOccupiedVolume||m.formattedVolume):'OccupiedV='+(m.formattedOccupiedVolume||m.formattedVolume)+'cu';return __canvasTextTrace.some(t=>t.text.replace(/ /g,'')===wanted.replace(/ /g,''));},solid,{timeout:45000});}
  await page.waitForFunction(()=>!!__ctx.toolData.geometryWorld.lastBadgeNotification);
  results.earnedBadge=await page.evaluate(()=>{clearInterval(window.__feedbackBadgeKeep);const en=__geoWorldEngine;if(en._badgeDismissTimer)clearTimeout(en._badgeDismissTimer);window.__feedbackEarnedBadge=JSON.parse(JSON.stringify(__ctx.toolData.geometryWorld.lastBadgeNotification));return {badge:__feedbackEarnedBadge,earned:__ctx.toolData.geometryWorld.earnedBadges};});
  await waitVolumeLabel(false);await closeInspector();
  for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:700},{width:844,height:390,landscape:true}]){
   const label=size.width+'x'+size.height,row={size};results.viewports.push(row);console.log('Verifying feedback '+label);
   if(size.width<800){await page.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',configurable:true});});await page.waitForFunction(()=>!document.pointerLockElement);}
   await page.setViewportSize(size);await frames(4);check(await page.evaluate(()=>__geoWorldEngine===__controlsViewsEngine),label+': same engine survives resize');
   await closeInspector();await collapse(true);await pose([10,8,13],[0,2.5,0.5]);
   await page.evaluate(()=>{if(__geoWorldEngine._badgeDismissTimer)clearTimeout(__geoWorldEngine._badgeDismissTimer);__ctx.updateMulti('geometryWorld',{lastBadgeNotification:__feedbackEarnedBadge,actionFeedback:''});});await frames();
   const beforeUtility=await signature(),utility=page.locator('.gw-action-bar'),fly=utility.getByRole('button',{name:'Toggle fly mode',exact:true});
   await fly.click();check(await page.evaluate(()=>!__geoWorldEngine.flyMode),label+': Fly button switches to walking');
   if(size.width<800)check(await page.getByRole('button',{name:'Fly down',exact:true}).count()===0,label+': Down is absent while walking');
   await fly.click();check(await page.evaluate(()=>__geoWorldEngine.flyMode),label+': Fly button restores flight');
   await utility.getByRole('button',{name:'Undo last action',exact:true}).click();await page.waitForFunction(()=>!__geoWorldEngine.blocks['5,1,0']);
   row.undoState=await signature();check(row.undoState.studentBlocks===beforeUtility.studentBlocks-1&&row.undoState.hash===beforeUtility.hash,label+': Undo removes only the detached last block and preserves selected STL');
   row.utility=[];
   const buttons=utility.getByRole('button');
   for(let i=0;i<await buttons.count();i++){const button=buttons.nth(i);await button.scrollIntoViewIfNeeded();const state=await hit(button);state.svg=await button.locator('svg').count();row.utility.push(state);check(state.hit&&state.inViewport&&state.height>=(size.width<800?43.5:33.5),label+': '+state.name+' utility is reachable');check(state.svg>0,label+': '+state.name+' uses the common SVG icon system');}
   await pose([10,8,13],[0,2.5,0.5]);await shot(label+'-utility-redo');
   await utility.getByRole('button',{name:'Redo last action',exact:true}).click();await page.waitForFunction(()=>!!__geoWorldEngine.blocks['5,1,0']);modelEqual(beforeUtility,await signature(),label+': Redo restores exact world, selected STL, counters and history');
   await utility.getByRole('button',{name:'Return to spawn point',exact:true}).click();
   row.home=await page.evaluate(()=>{const en=__geoWorldEngine,sp=en._currentLesson.spawnPoint||[0,2,0];return {position:en.camera.position.toArray(),expected:[sp[0],sp[1]+1.7,sp[2]]};});check(row.home.position.every((v,i)=>Math.abs(v-row.home.expected[i])<0.02),label+': Home returns to the lesson spawn');
   modelEqual(beforeUtility,await signature(),label+': Fly and Home preserve the printable creation');
   await pose([-0.5,3,6],[-0.5,1.3,2.6]);await page.evaluate(()=>{__canvasTextTrace=[];});
   if(size.width<800)await page.getByRole('button',{name:'Measure structure',exact:true}).tap();else await page.keyboard.press('KeyM');
   await page.getByRole('region',{name:'Measurement inspector',exact:true}).waitFor();await waitVolumeLabel(false);row.measurement=await readMeasurement();
   check(row.measurement.count===48&&row.measurement.hasFractions&&!row.measurement.isSolidPrism&&Math.abs(row.measurement.occupiedVolume-40.75)<1e-9,label+': fractional composite has exact occupied volume40.75');
   check(await page.locator('.gw-achievement-toast').count()===0,label+': achievement does not cover the measurement inspector');
   row.inspector=await hit(page.getByRole('region',{name:'Measurement inspector',exact:true}));row.close=await hit(page.getByRole('button',{name:'Close measurement inspector',exact:true}));
   check(row.inspector.inViewport&&row.close.hit&&row.close.inViewport,label+': measured values and Close stay within the viewport');
   row.inspectorOverflow=await page.getByRole('region',{name:'Measurement inspector',exact:true}).evaluate(node=>({client:node.clientWidth,scroll:node.scrollWidth}));check(row.inspectorOverflow.scroll<=row.inspectorOverflow.client+1,label+': inspector has no horizontal overflow');
   await pose([10,8,13],[0,2.5,0.5]);await shot(label+'-measurement-inspector');
   await closeInspector();await pose([10,8,13],[0,2.5,0.5]);
   await page.evaluate(()=>{__ctx.updateMulti('geometryWorld',{lastBadgeNotification:__feedbackEarnedBadge});});await page.locator('.gw-achievement-toast').waitFor({state:'attached'});
   if(size.landscape){check(!await page.locator('.gw-achievement-toast').isVisible(),label+': achievement is quiet in short landscape');await shot(label+'-dimensions');}else{
   row.achievement=await hit(page.locator('.gw-achievement-toast'));check(row.achievement.inViewport,label+': earned achievement fits the viewport');
   for(const selector of ['.gw-viewport-control--touch','.gw-viewport-control--fullscreen']){if(selector==='.gw-viewport-control--touch'&&size.width>=800&&!size.landscape&&await page.locator(selector).count()===0)continue;const state=await hit(page.locator(selector));check(state.hit&&state.inViewport,label+': achievement leaves '+state.name+' reachable');}
   row.achievementOverlaps=await page.locator('.gw-achievement-toast').evaluate(node=>{const r=node.getBoundingClientRect();return Array.from(document.querySelectorAll('.gw-touch-actions button,.gw-touch-look-panel')).filter(b=>{const x=b.getBoundingClientRect();return Math.min(x.right,r.right)-Math.max(x.left,r.left)>1&&Math.min(x.bottom,r.bottom)-Math.max(x.top,r.top)>1;}).map(b=>b.getAttribute('aria-label')||b.className);});check(row.achievementOverlaps.length===0,label+': achievement has clear space beside touch controls');await shot(label+'-achievement-dimensions');
   }
   await page.getByRole('button',{name:'Open game settings and tools',exact:true}).click();await page.locator('#gw-settings-dialog').waitFor();check(await page.locator('.gw-achievement-toast').count()===0,label+': achievement is suppressed while settings are open');await page.getByRole('button',{name:'Close game settings and tools',exact:true}).click();
   if(size.width===1440){await collapse(false);await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await page.getByRole('dialog',{name:'Showcase creation',exact:true}).waitFor();check(await page.locator('.gw-achievement-toast').count()===0,'Showcase suppresses the achievement overlay');await page.getByRole('button',{name:'Back to building',exact:true}).click();await collapse(true);}
   modelEqual(initial,await signature(),label+': feedback and measurements preserve exact selected STL and world history');
  }
  check(results.viewports.slice(1).every(row=>row.measurement.gpu.textures===results.viewports[0].measurement.gpu.textures),'Repeated measurements keep a stable GPU texture count');
  // A separate two-cube solid prism verifies the exact equation remains correct.
  await closeInspector();await pose([7,2.5,3],[5,1.5,0.5]);await page.evaluate(()=>{__canvasTextTrace=[];});await page.keyboard.press('KeyM');await page.waitForFunction(()=>__ctx.toolData.geometryWorld.measureResult?.count===2);await waitVolumeLabel(true);results.solid=await readMeasurement();
  check(results.solid.isSolidPrism&&!results.solid.hasFractions&&results.solid.occupiedVolume===2,'Solid prism retains the true L×W×H=volume equation');
  await closeInspector();await pose([-0.5,3,6],[-0.5,1.3,2.6]);await page.keyboard.press('KeyM');await page.waitForFunction(()=>__ctx.toolData.geometryWorld.measureResult?.count===48);await closeInspector();
  results.final=await signature();modelEqual(initial,results.final,'Final fixture restores original selection, STL, blocks and action history');
  results.shaderErrors=await page.evaluate(()=>__geoWorldEngine.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.diagnostics));check(results.shaderErrors.length===0,'No failed shader programs');check(results.errors.length===0,'No page errors');results.pass=results.failures.length===0;
 }catch(error){results.failure=error.stack;results.diagnostic=await page.evaluate(()=>({texts:window.__canvasTextTrace,measurement:window.__ctx?.toolData?.geometryWorld?.measureResult,labels:window.__geoWorldEngine?._dimLines?.filter(o=>o.isSprite).map(o=>o.userData)})).catch(()=>null);results.pass=false;await shot('failure').catch(()=>{});}
 finally{fs.writeFileSync(path.join(out,'workspace-feedback-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({pass:results.pass,failure:results.failure,failures:results.failures,errors:results.errors,viewports:results.viewports.map(v=>({size:v.size,utilities:v.utility?.length,measurement:v.measurement?.occupiedVolume}))},null,2));await browser.close();await new Promise(resolve=>server.close(resolve));if(!results.pass)process.exitCode=1;}
}).toString()+')();';
eval(harness);
`;
if(process.argv.includes('--syntax-only')) new (require('node:vm').Script)(source); else eval(source);
