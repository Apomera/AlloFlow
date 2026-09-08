const fs=require('node:fs');
const previous=fs.readFileSync('reports/geometry-world-graphics-2026-09-08/verify-showcase.cjs','utf8');
const fixtureBody=previous.match(/results\.checks\.fixture = await page\.evaluate\(\(\) => \{([\s\S]*?)\n    \}\);\n    await page\.waitForTimeout\(800\);/)[1];
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness+='('+(async function(){
  const assert=require('node:assert/strict'),results={scope:'Studio scene look in actual WebGL; local React host',errors:[],checks:{}};
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});page.setDefaultTimeout(45000);page.on('pageerror',e=>results.errors.push(e.message));results.consoleErrors=[];page.on('console',m=>{if(m.type()==='error')results.consoleErrors.push(m.text());});
  async function integrity(){return page.evaluate(async()=>{
    const e=__geoWorldEngine,pure=StemLab.geometryWorldBuilderPure,selected=e._builderSelection.blocks;
    const bundle=pure.buildGeometryWorldStl(e,selected,{title:'Studio geometry invariant'});
    const digest=await crypto.subtle.digest('SHA-256',bundle.buffer);
    return {sha256:Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join(''),triangles:bundle.triangleCount,dimensions:bundle.dimensions,
      blocks:Object.keys(e.blocks).sort().map(k=>{const m=e.blocks[k];return [k,m.userData.blockType,m.userData.shape,m.userData.rotation,m.position.toArray(),m.scale.toArray()];}),
      undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack),selected:selected.map(p=>[p.x,p.y,p.z]).sort()};
  });}
  async function presentation(){return page.evaluate(()=>{
    const e=__geoWorldEngine,studio=e._showcase.studio,c=e.renderer.domElement,box=new THREE.Box3(),points=[];e.camera.updateMatrixWorld(true);
    e._builderSelection.blocks.forEach(p=>box.expandByObject(e.blocks[[p.x,p.y,p.z].join(',')]));
    for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(e.camera).toArray());
    const buttons=Array.from(document.querySelectorAll('.gwe-showcase-looks button')).map(b=>({text:b.textContent,pressed:b.getAttribute('aria-pressed'),height:b.getBoundingClientRect().height}));
    return {look:e._showcase.look,background:e.scene.background.toArray(),fog:e.scene.fog.color.toArray(),stage:studio?.group.name,resources:studio?.resources.length,
      bloomOff:!e.composer || e.composer.passes.filter(p=>THREE.UnrealBloomPass && p instanceof THREE.UnrealBloomPass).every(p=>!p.enabled),floorReceivesShadow:studio?.group.getObjectByName('gwe-studio-floor').receiveShadow,shadowMaps:e.renderer.shadowMap.enabled,
      contactOpacity:studio?.group.getObjectByName('gwe-studio-contact-shadow').material.opacity,
      selectedVisible:e._builderSelection.blocks.every(p=>e.blocks[[p.x,p.y,p.z].join(',')].visible),hiddenObjects:studio?.hidden.length,
      unrelatedHidden:!e.blocks['10,1,8'].visible&&!e.blocks['11,1,8'].visible,
      buttons,projected:points,aspect:e.camera.aspect,canvas:[c.clientWidth,c.clientHeight],overflow:document.documentElement.scrollWidth>innerWidth};
  });}
  function checkPresentation(frame){
    assert.equal(frame.look,'studio');assert.equal(frame.stage,'gwe-studio-stage');assert.equal(frame.floorReceivesShadow,true);assert.equal(frame.bloomOff,true);
    assert.equal(frame.selectedVisible,true);assert.equal(frame.unrelatedHidden,true);assert.ok(frame.hiddenObjects>625);
    assert.ok(frame.buttons.every(b=>b.height>=44));assert.equal(frame.buttons.find(b=>b.text==='Studio').pressed,'true');assert.equal(frame.buttons.find(b=>b.text==='Meadow').pressed,'false');
    assert.ok(frame.projected.every(p=>Math.abs(p[0])<.94&&Math.abs(p[1])<.94&&p[2]>-1&&p[2]<1));assert.equal(frame.overflow,false);
  }
  async function trackStudio(){await page.evaluate(()=>{
    const e=__geoWorldEngine,s=e._showcase.studio;window.__studioDisposals={resources:[],maps:[]};
    window.__studioRestore={background:s.background,fog:s.fog,hidden:s.hidden.slice(),effects:s.effects.slice()};
    s.resources.forEach((r,i)=>r.addEventListener('dispose',()=>__studioDisposals.resources.push(i)));
    s.lights.forEach((l,i)=>{if(l.shadow?.map)l.shadow.map.addEventListener('dispose',()=>__studioDisposals.maps.push(i));});
    window.__studioExpectedDisposals={resources:s.resources.length,maps:s.lights.filter(l=>!!l.shadow?.map).length};
  });}
  async function assertReleased(checkVisibility=true){
    const release=await page.evaluate(()=>({
      counts:__studioDisposals,expected:__studioExpectedDisposals,
      backgroundRestored:__geoWorldEngine.scene.background===__studioRestore.background,fogRestored:__geoWorldEngine.scene.fog===__studioRestore.fog,
      visibilityRestored:__studioRestore.hidden.every(([object,visible])=>object.visible===visible),
      effectsRestored:__studioRestore.effects.every(([pass,enabled])=>pass.enabled===enabled),stageRemoved:!__geoWorldEngine.scene.getObjectByName('gwe-studio-stage')
    }));
    assert.equal(new Set(release.counts.resources).size,release.expected.resources);assert.equal(release.counts.resources.length,release.expected.resources);
    assert.equal(new Set(release.counts.maps).size,release.expected.maps);assert.equal(release.backgroundRestored,true);assert.equal(release.fogRestored,true);if(checkVisibility)assert.equal(release.visibilityRestored,true);assert.equal(release.stageRemoved,true);assert.equal(release.effectsRestored,true);
    return release;
  }
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    await page.waitForFunction(()=>!!window.__geoWorldEngine?._currentLesson?.sandbox);
    await page.evaluate(new Function(fixtureBody));
    await page.evaluate(()=>{
      const e=__geoWorldEngine;
      for(let x=-3;x<=2;x++)for(let z=3;z<=5;z++)if(!e.blocks[[x,1,z].join(',')])e.placeBlock(x,1,z,'stone','cube',0);
      ['stone','wood','brick','gold','diamond','ice'].forEach((type,i)=>e.placeBlock(i-3,2,5,type,i===4?'halfA':'cube',0));
      e.placeBlock(10,1,8,'wood','cube',0);e.placeBlock(11,1,8,'wood','cube',0);e.blocks['11,1,8'].visible=false;
      __aimAt(0,1,5);e.camera.updateMatrixWorld(true);e.refreshAllAO();
    });
    await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();await page.getByRole('button',{name:'Showcase creation',exact:true}).waitFor();
    await page.waitForTimeout(800);
    const blockVisibilityBefore=await page.evaluate(()=>Object.fromEntries(Object.entries(__geoWorldEngine.blocks).map(([k,m])=>[k,m.visible])));
    const before=await integrity();results.checks.geometry={sha256:before.sha256,triangles:before.triangles,selected:before.selected.length};
    await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await page.getByRole('dialog',{name:'Showcase creation',exact:true}).waitFor();
    await page.getByRole('button',{name:'Studio',exact:true}).click();await page.waitForTimeout(600);
    results.checks.desktop=await presentation();checkPresentation(results.checks.desktop);assert.deepEqual(await integrity(),before);
    await page.screenshot({path:path.join(out,'studio-desktop.png')});
    await trackStudio();await page.getByRole('button',{name:'Meadow',exact:true}).click();results.checks.firstRelease=await assertReleased();
    assert.deepEqual(await integrity(),before);
    await page.screenshot({path:path.join(out,'studio-meadow-comparison.png')});
    results.checks.cycles=[];
    for(let i=0;i<2;i++){
      await page.getByRole('button',{name:'Studio',exact:true}).click();await page.waitForTimeout(150);await trackStudio();
      await page.getByRole('button',{name:'Meadow',exact:true}).click();results.checks.cycles.push(await assertReleased());
    }
    await page.getByRole('button',{name:'Studio',exact:true}).click();
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{__ctx.updateMulti('geometryWorld',{renderQuality:'saver'});__geoWorldEngine.applyRenderQuality('saver');});
    await page.waitForFunction(()=>{const e=__geoWorldEngine,c=e.renderer.domElement;return Math.abs(e.camera.aspect-c.clientWidth/c.clientHeight)<.02;},{},{timeout:20000});
    await page.waitForTimeout(400);results.checks.phoneSaver=await presentation();checkPresentation(results.checks.phoneSaver);assert.equal(results.checks.phoneSaver.shadowMaps,false);assert.ok(results.checks.phoneSaver.contactOpacity>=.2);
    assert.deepEqual(await integrity(),before);await page.screenshot({path:path.join(out,'studio-phone-saver.png')});
    const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Save image',exact:true}).click();const download=await downloadPromise;await download.saveAs(path.join(out,'studio-download.png'));
    results.checks.downloadBytes=fs.statSync(path.join(out,'studio-download.png')).size;assert.ok(results.checks.downloadBytes>10000);
    await trackStudio();await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'Showcase creation',exact:true}).waitFor({state:'hidden'});results.checks.exitRelease=await assertReleased(false);assert.deepEqual(await page.evaluate(()=>Object.fromEntries(Object.entries(__geoWorldEngine.blocks).map(([k,m])=>[k,m.visible]))),blockVisibilityBefore);assert.deepEqual(await integrity(),before);
    results.checks.shaderErrors=await page.evaluate(()=>__geoWorldEngine.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.diagnostics));assert.equal(results.checks.shaderErrors.length,0);
    // Teardown is checked while Studio is active, with no tool-state updates from cleanup.
    await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await page.getByRole('button',{name:'Studio',exact:true}).click();await page.waitForTimeout(150);await trackStudio();
    results.checks.teardown=await page.evaluate(()=>{
      const e=__geoWorldEngine,stage=e._showcase.studio.group;window.__oldStudioEngine=e;
      __root.unmount();return {removed:!stage.parent,disposed:__studioDisposals,expected:__studioExpectedDisposals};
    });
    assert.equal(results.checks.teardown.removed,true);assert.equal(results.checks.teardown.disposed.resources.length,results.checks.teardown.expected.resources);
    assert.equal(results.errors.length,0);results.passed=true;
  }catch(error){results.passed=false;results.failure=error.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'studio-failure.png')}).catch(()=>{});}
  finally{
    const p=path.join(out,'studio-results.json'),s=JSON.stringify(results,null,2);if(fs.existsSync(p)){const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}else fs.writeFileSync(p,s);
    console.log(s);await browser.close();await new Promise(r=>server.close(r));
  }
}).toString()+')();';
eval(harness);
