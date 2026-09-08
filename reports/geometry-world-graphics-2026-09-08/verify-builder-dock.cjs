const fs=require('node:fs');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness+='('+(async function(){
  const assert=require('node:assert/strict'),results={scope:'Free Build Studio launcher, dock and real Print Lab handoff in local React/WebGL host',errors:[],consoleErrors:[],checks:{}};
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});page.setDefaultTimeout(45000);
  page.on('pageerror',e=>results.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')results.consoleErrors.push(m.text());});
  async function layout(){return page.evaluate(()=>{
    const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const dock=document.querySelector('.gwe-builder-dock'),body=dock?.querySelector('.gwe-builder-body');
    return {viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth>innerWidth,dock:dock&&box(dock),scrollable:body&&body.scrollHeight>body.clientHeight,
      primary:Array.from(document.querySelectorAll('.gwe-builder-quick-actions button')).map(b=>{const r=box(b);return {label:b.getAttribute('aria-label'),box:r,hit:b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};}),
      fonts:Array.from(document.querySelectorAll('.gwe-builder-name,.gwe-builder-intro,.gwe-metric strong')).map(e=>({text:e.textContent,size:getComputedStyle(e).fontSize})),
      centerInDock:!!document.elementFromPoint(innerWidth/2,innerHeight/2)?.closest('.gwe-builder-dock')};
  });}
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();
    await page.getByRole('dialog',{name:'Open a blank Free Build Sandbox'}).waitFor();
    await page.screenshot({path:path.join(out,'builder-launcher-desktop.png')});
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement===document.querySelector('.gwe-free-build-launch'));
    assert.equal(await page.locator('.gwe-free-build-launch').evaluate(e=>document.activeElement===e),true);
    results.checks.launcherCancelReturnsFocus=true;
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();
    await page.screenshot({path:path.join(out,'builder-launcher-phone.png')});
    results.checks.phoneLauncher=await page.locator('.gwe-launcher').evaluate(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,scroll:e.scrollHeight>e.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth,buttons:Array.from(e.querySelectorAll('button')).map(b=>({text:b.textContent,height:b.getBoundingClientRect().height}))};});
    assert.equal(results.checks.phoneLauncher.overflow,false);assert.ok(results.checks.phoneLauncher.buttons.every(b=>b.height>=44));
    await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    await page.waitForFunction(()=>window.__geoWorldEngine?._currentLesson?.sandbox===true);
    await page.setViewportSize({width:1440,height:900});
    await page.evaluate(()=>{
      const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);
      for(let x=0;x<4;x++)for(let z=0;z<3;z++)e.placeBlock(x,1,z,'stone','cube',0);
      for(const x of[0,3])for(const z of[0,2])for(let y=2;y<5;y++)e.placeBlock(x,y,z,'wood','cube',0);
      for(let x=0;x<4;x++)for(let z=0;z<3;z++)e.placeBlock(x,5,z,'brick','halfB',0);
      window.__aimAt(0,4,2);e.camera.updateMatrixWorld(true);
    });
    if(await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).isVisible())await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();
    await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();
    await page.waitForFunction(()=>__toolData.geometryWorld.builderPrintCheck?.components===1);
    results.checks.selection=await page.evaluate(()=>({selected:__geoWorldEngine._builderSelection.blocks.length,workflow:document.querySelector('.gwe-workflow [aria-current="step"]').textContent,closed:!document.querySelector('.gwe-print-ready details').open}));
    assert.equal(results.checks.selection.selected,36);assert.equal(results.checks.selection.workflow,'2Inspect');assert.equal(results.checks.selection.closed,true);
    results.checks.desktop=await layout();assert.ok(results.checks.desktop.primary.every(b=>b.hit&&b.box.height>=44));
    await page.screenshot({path:path.join(out,'builder-dock-desktop.png')});
    await page.getByText('Printer profile & scale',{exact:true}).click();
    assert.equal(await page.locator('.gwe-print-ready details').evaluate(e=>e.open),true);
    assert.equal(await page.locator('[data-gwe-print-volume]').isVisible(),true);
    await page.getByText('Printer profile & scale',{exact:true}).click();
    results.checks.printerDisclosure=true;
    const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:/Save editable world/}).click();const download=await downloadEvent;
    const downloadPath=await download.path(),saved=JSON.parse(fs.readFileSync(downloadPath,'utf8'));results.checks.saved={name:download.suggestedFilename(),bytes:fs.statSync(downloadPath).size,schema:saved.schema,blocks:saved.blocks.length};assert.equal(saved.blocks.length,36);
    await page.getByText('Workspace options',{exact:true}).click();
    await page.getByRole('button',{name:/Start a fresh sandbox/}).click();
    await page.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement?.getAttribute('data-gwe-focus-return')==='sandbox-dock');
    assert.equal(await page.getByRole('button',{name:/Start a fresh sandbox/}).evaluate(e=>document.activeElement===e),true);
    results.checks.workspaceDisclosureAndFocus=true;
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>document.querySelector('.gwe-builder-body').scrollTop=0);
    results.checks.phone=await layout();assert.equal(results.checks.phone.overflow,false);assert.equal(results.checks.phone.centerInDock,false);assert.ok(results.checks.phone.primary.every(b=>b.hit&&b.box.height>=44));
    await page.screenshot({path:path.join(out,'builder-dock-phone.png')});
    await page.evaluate(()=>document.querySelector('.gwe-builder-body').scrollTop=100000);
    results.checks.phoneScrolled=await layout();assert.ok(results.checks.phoneScrolled.primary.every(b=>b.hit));
    await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();
    assert.equal(await page.locator('.gwe-builder-body').evaluate(e=>e.scrollTop),0);
    results.checks.reselectReturnsSummary=true;
    await page.evaluate(async()=>{
      const e=__geoWorldEngine,pure=StemLab.geometryWorldBuilderPure;
      // Retain one unrelated creation so returning only the selected model cannot pass.
      e.placeBlock(9,1,8,'gold','quarter',2);
      const bundle=pure.buildGeometryWorldStl(e,e._builderSelection.blocks,{title:'Geometry World selected build'});
      window.__dockExpectedBytes=Array.from(new Uint8Array(bundle.buffer));
      window.__dockExpectedProject=pure.captureProject(__ctx,e,'verifier');
      const switchTool=__ctx.setStemLabTool;
      __ctx.setStemLabTool=function(id){
        if(id==='printLab')window.__dockObservedHandoff={bytes:Array.from(window.__alloPrintLabPendingHandoff.bytes),sourceModel:window.__alloPrintLabPendingHandoff.sourceModel};
        return switchTool.apply(this,arguments);
      };
    });
    await page.getByRole('button',{name:'Send selected build to Print Lab',exact:true}).click();
    await page.getByRole('heading',{name:'Print Lab',exact:true}).waitFor();
    results.checks.printHandoff=await page.locator('body').innerText();assert.match(results.checks.printHandoff,/Geometry World|36 blocks/);
    results.checks.exactHandoff=await page.evaluate(()=>({exactBytes:JSON.stringify(__dockObservedHandoff.bytes)===JSON.stringify(__dockExpectedBytes),bytes:__dockObservedHandoff.bytes.length,selected:__dockObservedHandoff.sourceModel.blocks.length}));
    assert.equal(results.checks.exactHandoff.exactBytes,true);assert.equal(results.checks.exactHandoff.selected,36);
    await page.getByRole('button',{name:'Revise in Geometry World',exact:true}).click();
    await page.waitForFunction(()=>!!window.__geoWorldEngine && !window.__alloGeometryWorldPendingBuild && !window.__alloGeometryWorldReturnProject);
    results.checks.returned=await page.evaluate(()=>{
      const actual=StemLab.geometryWorldBuilderPure.captureProject(__ctx,__geoWorldEngine,'verifier'),expected=__dockExpectedProject;
      return {blocks:JSON.stringify(actual.blocks)===JSON.stringify(expected.blocks),blockCount:actual.blocks.length,selection:JSON.stringify(actual.selection)===JSON.stringify(expected.selection),undo:JSON.stringify(actual.undo)===JSON.stringify(expected.undo),redo:JSON.stringify(actual.redo)===JSON.stringify(expected.redo),camera:actual.camera.every((v,i)=>Math.abs(v-expected.camera[i])<1e-6),quaternion:actual.cameraQuaternion.every((v,i)=>Math.abs(v-expected.cameraQuaternion[i])<1e-6),flyMode:actual.flyMode===expected.flyMode};
    });
    assert.equal(results.checks.returned.blockCount,37);assert.ok(Object.entries(results.checks.returned).filter(([k])=>k!=='blockCount').every(([,v])=>v===true));
    assert.equal(results.errors.length,0);assert.equal(results.consoleErrors.length,0);results.pass=true;
  }catch(e){results.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'builder-dock-failure.png')}).catch(()=>{});}
  finally{
    const target=path.join(out,'builder-dock-results.json'),value=JSON.stringify(results,null,2);if(fs.existsSync(target)){const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,value);fs.ftruncateSync(fd,Buffer.byteLength(value));fs.closeSync(fd);}else fs.writeFileSync(target,value);
    console.log(JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));
  }
}).toString()+')();';
eval(harness);
