const fs=require('node:fs'),path=require('node:path');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});', 'window.__alloGeometryWorldReturnProject={id:"old-backup"};window.__mount({_introShownOnce:true,worldActive:true,showGeometryHome:true,geometryHomePage:"create",showGameSettings:true,showLessonIntro:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
  const result={checks:[],errors:[]};
  const check=(ok,label)=>{result.checks.push({label,pass:!!ok});if(!ok)throw Error(label);};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(60000);page.on('pageerror',e=>result.errors.push(e.message));
  const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const signature=()=>page.evaluate(()=>{const e=__geoWorldEngine;return JSON.stringify({blocks:StemLab.geometryWorldBuilderPure.editableWorld(e).blocks,selection:e._builderSelection,undo:e._undoStack,redo:e._redoStack,unit:__ctx.toolData.geometryWorld.builderPrintContext.unitMm});});
  try {
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.locator('.gwe-home').waitFor({timeout:120000});
    check(await page.locator('.gwe-home-card').count()===4,'Returning visit resets persisted subpage to four modes despite a saved Print Lab backup');
    check(await page.getByRole('button',{name:/Continue your workspace/}).isVisible(),'Returning user has a visible Continue action');
    check(await page.evaluate(()=>!__ctx.toolData.geometryWorld.showGameSettings&&!__ctx.toolData.geometryWorld.showLessonIntro),'Stale overlays are cleared');
    await page.locator('[data-path=build]').click();
    await page.keyboard.press('Escape');
    check(await page.locator('[data-path=build]').evaluate(n=>n===document.activeElement),'Escape returns to the previous mode card with keyboard focus');
    await page.locator('[data-path=build]').click();
    await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    await page.waitForFunction(()=>__geoWorldEngine._currentLesson.sandbox);
    await page.evaluate(()=>{const e=__geoWorldEngine;e.placeBlock(0,1,0,'wood','cube',0);e.placeBlock(1,1,0,'stone','quarter',2);e._builderSelection={blocks:[{x:0,y:1,z:0},{x:1,y:1,z:0}]};e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);__ctx.updateMulti('geometryWorld',{builderPrintContext:{unitMm:12.5,aiUse:'NONE'},measureResult:e.measureStructure(0,1,0)});});
    await frames();
    const before=await signature();
    await page.getByRole('button',{name:'Send selected build to Print Lab',exact:true}).click();
    await page.getByRole('heading',{name:'Print Lab',exact:true}).waitFor();
    await page.getByRole('button',{name:'Revise in Geometry World',exact:true}).click();
    await page.waitForFunction(()=>!!window.__geoWorldEngine&&!window.__alloGeometryWorldPendingBuild);
    await frames();await frames();
    check(await signature()===before,'Native Print Lab round trip preserves blocks, selection, history and print scale');
    check(await page.locator('.gwe-home').count()===0,'Consuming the return marker does not reopen Home');
    await page.evaluate(()=>__ctx.updateMulti('geometryWorld',{actionFeedback:'Return checked'}));await frames();
    check(await page.locator('.gwe-home').count()===0,'Subsequent state updates keep the returned workspace open');
    await page.getByRole('button',{name:'Geometry World home',exact:true}).filter({visible:true}).first().click();
    await page.locator('.gwe-home').waitFor();
    check(await page.locator('.gwe-home-card').count()===4,'Home is still reachable manually after Print Lab');
    check(await signature()===before,'Opening Home preserves the returned workspace');
    await page.screenshot({path:path.join(out,'returning-home.png'),timeout:60000});
    // Trigger a real tool unmount/remount while retaining the host toolData.
    await page.evaluate(()=>__ctx.setStemLabTool('printLab'));
    await page.getByRole('heading',{name:'Print Lab',exact:true}).waitFor();
    await page.evaluate(()=>__ctx.setStemLabTool('geometryWorld'));
    await page.locator('.gwe-home').waitFor();
    check(await page.locator('.gwe-home-card').count()===4,'Ordinary re-entry shows the main menu again');
  } catch(error){result.failure=error.stack;}
  finally {result.pass=!result.failure&&!result.errors.length;fs.writeFileSync(path.join(out,'returning-browser.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();await new Promise(resolve=>server.close(resolve));if(!result.pass)process.exitCode=1;}
};
eval(harness+'('+run.toString()+')();');
