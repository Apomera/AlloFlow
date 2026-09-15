'use strict';
const fs=require('node:fs'),path=require('node:path');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
harness=harness.replace('res.end(fs.readFileSync(file));',"res.end(fs.readFileSync(file.endsWith('stem_tool_geometryworld.js') ? path.join(__dirname,'coastal-core-candidate.js') : file));");
const run=async function(){
  const report={checks:[],errors:[],consoleErrors:[]};
  const check=(ok,label)=>{report.checks.push({label,pass:!!ok});if(!ok)throw Error(label);};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(90000);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
  const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('.gwe-home').waitFor({timeout:120000});
    await page.locator('.gwe-home-card[data-path=learn]').click();await page.getByLabel('Choose a lesson',{exact:true}).selectOption('geometryHarbor');await page.getByRole('button',{name:'Start this lesson',exact:true}).click();
    const skip=page.getByRole('button',{name:'Skip tutorial and proceed to lesson',exact:true});if(await skip.isVisible())await skip.click();await frames();
    report.world=await page.evaluate(()=>{const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);return {count:Object.keys(e.blocks).length,truncated:e._fillTruncated,theme:e._currentLesson.landscapeTheme,landscape:e._landscape.userData.gwLandscapeDetail,measures:[[-15,1,14],[-15,1,-9],[-15,1,2],[7,1,3],[10,1,7]].map(p=>e.measureStructure(...p).count)};});
    check(report.world.count===2673&&!report.world.truncated,'Coastal setting preserves every one of the2673lesson cells');
    check(JSON.stringify(report.world.measures)==='[6,24,24,24,24]','All five authored math targets retain their exact measurements');
    check(report.world.theme==='coastal'&&report.world.landscape.islands===3,'Harbor metadata selects the original coastal setting');
    const views=[
      {name:'coastal-overview',position:[-25,19,27],target:[0,0,-1]},
      {name:'coastal-gardens',position:[-17,8,11],target:[-6,1,-7]},
      {name:'coastal-beacon-vista',position:[-20,4,14],target:[15,4,-10]}
    ];
    for(const view of (process.argv.includes("--overview-only") ? views.slice(0,1) : views)){await page.evaluate(v=>{const e=__geoWorldEngine;e.camera.position.fromArray(v.position);e.camera.lookAt(...v.target);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);},view);await frames();await page.screenshot({path:path.join(out,view.name+'.png'),timeout:90000});}
    report.render=await page.evaluate(()=>({calls:__geoWorldEngine.renderer.info.render.calls,triangles:__geoWorldEngine.renderer.info.render.triangles,geometries:__geoWorldEngine.renderer.info.memory.geometries}));
  }catch(error){report.failure=error.stack;}
  finally{report.pass=!report.failure&&!report.errors.length&&!report.consoleErrors.length;fs.writeFileSync(path.join(out,'coastal-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();await new Promise(resolve=>server.close(resolve));if(!report.pass)process.exitCode=1;}
};
eval(harness+'('+run.toString()+')();');
