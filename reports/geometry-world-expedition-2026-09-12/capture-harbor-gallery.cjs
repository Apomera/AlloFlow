'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
  const r={checks:[],errors:[],consoleErrors:[],screenshots:[],sources:Object.fromEntries(['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js'].map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync('stem_lab/'+n)).digest('hex')]))};
  const check=(ok,label)=>{r.checks.push({label,pass:!!ok});if(!ok)throw Error(label);};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(60000);page.on('pageerror',e=>r.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')r.consoleErrors.push(m.text());});
  const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('.gwe-home').waitFor({timeout:120000});
    await page.locator('.gwe-home-card[data-path=learn]').click();await page.getByLabel('Choose a lesson',{exact:true}).selectOption('geometryHarbor');await page.getByRole('button',{name:'Start this lesson',exact:true}).click();await page.waitForFunction(()=>window.__geoWorldEngine&&__geoWorldEngine._currentLesson.title.includes('Geometry Harbor'));
    const skip=page.getByRole('button',{name:'Skip tutorial and proceed to lesson',exact:true});
    check(await skip.isVisible(),'Harbor initially offers the quick tour');await skip.click();await frames();
    check(await page.locator('.gw-tutorial-shell').count()===0,'Native Skip tutorial clears the gallery view');
    r.world=await page.evaluate(()=>{const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);return {count:Object.keys(e.blocks).length,truncated:e._fillTruncated,measures:[[-15,1,14],[-15,1,-9],[-15,1,2],[7,1,3],[10,1,7]].map(p=>e.measureStructure(...p).count)};});
    check(r.world.count===2673&&!r.world.truncated,'Final ground rendering change preserves the complete2673-cell world');
    check(JSON.stringify(r.world.measures)==='[6,24,24,24,24]','Final rendered ground preserves all teaching measurements');
    const views=[
      {name:'harbor-overview-final',position:[-25,19,27],target:[0,0,-1]},
      {name:'harbor-gardens-final',position:[-17,8,11],target:[-6,1,-7]},
      {name:'harbor-reservoir-final',position:[18,8,12],target:[11,1,-4]}
    ];
    for(const view of views){await page.evaluate(v=>{const e=__geoWorldEngine;e.camera.position.fromArray(v.position);e.camera.lookAt(...v.target);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);},view);await frames();await page.screenshot({path:path.join(out,view.name+'.png'),timeout:90000});r.screenshots.push(view.name+'.png');}
  }catch(error){r.failure=error.stack;}
  finally{r.pass=!r.failure&&!r.errors.length&&!r.consoleErrors.length;fs.writeFileSync(path.join(out,'harbor-gallery-browser.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r));await browser.close();await new Promise(resolve=>server.close(resolve));if(!r.pass)process.exitCode=1;}
};
eval(harness+'('+run.toString()+')();');
