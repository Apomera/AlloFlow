const fs=require('node:fs'),path=require('node:path');
let code=fs.readFileSync(path.join(__dirname,'audit.cjs'),'utf8');
code=code.slice(0,code.indexOf('const results ='));
code+=`
(async()=>{
 const results={errors:[]};
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(60000);
 page.on('pageerror',e=>results.errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
  await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();
  await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
  await page.evaluate(()=>{const en=__geoWorldEngine;for(let x=0;x<2;x++)for(let z=0;z<3;z++)for(let y=1;y<5;y++)en.placeBlock(x,y,z,'stone','cube',0);en.placeBlock(8,1,8,'wood','quarter',1);en.flyMode=true;en.velocity.set(0,0,0);window.__aimAt(0,3,2);en.camera.updateMatrixWorld(true);});
  await page.waitForTimeout(300);
  results.before=await page.evaluate(()=>StemLab.geometryWorldBuilderPure.editableWorld(__geoWorldEngine));
  await page.evaluate(()=>{const en=__geoWorldEngine; en.blockUnderCrosshair=function(){return {object:en.blocks['0,3,2']};};}); await page.getByRole('button',{name:/Measure aimed build/}).click();
  await page.screenshot({path:path.join(out,'09-desktop-build-stable.png')});
  await page.getByRole('button',{name:/Send selected build to Print Lab/}).click();
  await page.getByRole('heading',{name:'Print Lab',exact:true}).waitFor();
  await page.getByLabel('Millimeters per Geometry World block',{exact:true}).fill('10');
  results.scaleBeforeReturn=await page.locator('body').innerText();
  await page.getByRole('button',{name:'Revise in Geometry World',exact:true}).click();
  await page.waitForFunction(()=>!!window.__geoWorldEngine && !window.__alloGeometryWorldPendingBuild,{},{timeout:120000});
  results.after=await page.evaluate(()=>StemLab.geometryWorldBuilderPure.editableWorld(__geoWorldEngine));
  await page.screenshot({path:path.join(out,'10-returned.png')});
  await page.evaluate(()=>{const en=__geoWorldEngine;en.flyMode=true;en.velocity.set(0,0,0);window.__aimAt(0,3,1);en.camera.updateMatrixWorld(true);en.blockUnderCrosshair=function(){return {object:en.blocks['0,3,1']};};});
  await page.waitForTimeout(300);
  await page.getByRole('button',{name:/Send selected build to Print Lab/}).click();
  await page.getByRole('heading',{name:'Print Lab',exact:true}).waitFor();
  results.scaleAfterResend=await page.locator('body').innerText();
  await page.getByRole('tab',{name:/Preflight/}).click();
  await page.getByRole('button',{name:'Run advisory preflight',exact:true}).click();
  await page.getByRole('tab',{name:/Submit/}).click();
  results.submit=await page.locator('body').innerText();
  await page.screenshot({path:path.join(out,'11-submit.png'),fullPage:true});
  const downloadP=page.waitForEvent('download');
  await page.getByRole('button',{name:'Optional STL export',exact:true}).click();
  const download=await downloadP;await download.saveAs(path.join(out,'exported-geometry.stl'));
  results.download=download.suggestedFilename();
 }catch(e){results.failure=e.stack;console.error(e.stack);await page.screenshot({path:path.join(out,'roundtrip-failure.png'),fullPage:true}).catch(()=>{});}
 finally{fs.writeFileSync(path.join(out,'roundtrip-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({errors:results.errors,failure:results.failure,before:results.before?.blocks.length,after:results.after?.blocks.length,download:results.download},null,2));await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();});
`;
eval(code);
