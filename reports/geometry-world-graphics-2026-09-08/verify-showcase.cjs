const fs = require('node:fs');
let harness = fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs', 'utf8').split('const results =')[0];
harness += '(' + (async function verifyShowcase() {
  const assert = require('node:assert/strict');
  const results = { scope: 'Local React host with actual Three.js WebGL via Chromium SwiftShader', errors: [], checks: {} };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => results.errors.push(error.message));
  async function state() {
    return page.evaluate(() => {
      const engine = __geoWorldEngine;
      return {
        position: engine.camera.position.toArray(), quaternion: engine.camera.quaternion.toArray(), fov: engine.camera.fov,
        dockCollapsed: !!__ctx.toolData.geometryWorld.sandboxDockCollapsed,
        blocks: Object.keys(engine.blocks).sort().map(key => { const data = engine.blocks[key].userData; return [key, data.blockType, data.shape, data.rotation]; }),
        undo: JSON.stringify(engine._undoStack), redo: JSON.stringify(engine._redoStack),
        selection: engine._builderSelection.blocks.map(p => [p.x, p.y, p.z]).sort(),
        shape: __ctx.toolData.geometryWorld.blockShape, rotation: __ctx.toolData.geometryWorld.blockRotation
      };
    });
  }
  async function bounds() {
    return page.evaluate(() => {
      const engine = __geoWorldEngine, box = new THREE.Box3();
      engine.camera.updateMatrixWorld(true);
      engine._builderSelection.blocks.forEach(p => box.expandByObject(engine.blocks[[p.x, p.y, p.z].join(',')]));
      const projected = [];
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) projected.push(new THREE.Vector3(x,y,z).project(engine.camera).toArray());
      const canvas = engine.renderer.domElement.getBoundingClientRect();
      return { selectedBlocks: engine._builderSelection.blocks.length, world: { min: box.min.toArray(), max: box.max.toArray() }, projected, canvas: { width: canvas.width, height: canvas.height }, viewport: {width: innerWidth, height: innerHeight}, aspect: engine.camera.aspect, fov: engine.camera.fov, active: !!engine._showcase, overflow: document.documentElement.scrollWidth > innerWidth };
    });
  }
  function checkBounds(frame) {
    assert.equal(frame.active, true);
    assert.ok(frame.selectedBlocks >= 150, 'The whole connected pavilion is selected');
    assert.ok(frame.projected.every(p => Math.abs(p[0]) < 0.94 && Math.abs(p[1]) < 0.94 && p[2] > -1 && p[2] < 1), 'Every corner of the creation fits inside the frame');
    assert.equal(frame.overflow, false);
    assert.ok(Math.abs(frame.aspect - frame.canvas.width / frame.canvas.height) < 0.02);
  }
  try {
    await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__geoWorldEngine, {}, { timeout: 120000 });
    await page.getByRole('button', { name: /Free Build Sandbox studio/ }).click();
    await page.getByRole('button', { name: 'Open blank sandbox', exact: true }).click();
    await page.waitForFunction(() => !!window.__geoWorldEngine?._currentLesson?.sandbox);
    results.checks.fixture = await page.evaluate(() => {
      const engine = __geoWorldEngine;
      engine._entryAnim = null; engine.flyMode = true; engine.velocity.set(0, 0, 0); engine._ambientMotionEnabled = false;
      const place = (x,y,z,type,shape = 'cube',rotation = 0) => engine.placeBlock(x,y,z,type,shape,rotation);
      // Masonry platform, open oak colonnade, continuous two-sided 45-degree roof.
      for (let x=-3;x<=2;x++) for (let z=-2;z<=2;z++) place(x,1,z,(x===-3||x===2||z===-2||z===2)?'stone':'wood');
      for (const x of [-3,2]) for (const z of [-2,2]) {
        place(x,2,z,'brick');
        for (let y=3;y<=4;y++) place(x,y,z,'wood');
        place(x,5,z,'gold');
      }
      for (let x=-3;x<=2;x++) for (const z of [-2,2]) if(x!==-3&&x!==2)place(x,5,z,'wood');
      for (let z=-1;z<=1;z++) for (const x of [-3,2]) place(x,5,z,'wood');
      for (let x=-4;x<=3;x++) for (let z=-3;z<=3;z++) {
        const roofY = 5 + Math.min(x+4,3-x);
        place(x,roofY,z,'brick','halfA',x<0?0:2);
        if(roofY>5)place(x,roofY-1,z,'wood');
      }
      // Shallow front step connects to the platform. Small isolated examples are omitted.
      for (let x=-1;x<=0;x++) place(x,1,3,'stone','halfB');
      engine.refreshAllAO();
      engine.camera.position.set(7,6,11); engine.camera.fov=75; engine.camera.lookAt(0,2,2); engine.euler.setFromQuaternion(engine.camera.quaternion); engine.camera.updateProjectionMatrix(); engine.camera.updateMatrixWorld(true);
      engine.applyRenderQuality('detail');
      __ctx.updateMulti('geometryWorld',{renderQuality:'detail',autoCycle:false,showGameSettings:false,sandboxDockCollapsed:false});
      return { totalBlocks:Object.keys(engine.blocks).length, studentBlocks:Object.values(engine.blocks).filter(mesh=>!mesh.userData._lessonBlock).length, wedgeCount:Object.values(engine.blocks).filter(mesh=>mesh.userData.shape==='halfA').length };
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => { __aimAt(-2,1,2); __geoWorldEngine.camera.updateMatrixWorld(true); });
    await page.getByRole('button', { name: 'Select and measure aimed build', exact: true }).click();
    await page.getByRole('button', { name: 'Showcase creation', exact: true }).waitFor();
    await page.waitForTimeout(200);
    await page.evaluate(() => { const engine=__geoWorldEngine;engine.camera.position.set(7,6,11);engine.camera.lookAt(0,2,2);engine.euler.setFromQuaternion(engine.camera.quaternion);engine.camera.updateMatrixWorld(true); });
    const before = await state();
    results.checks.selection = { selectedBlocks: before.selection.length, undo:JSON.parse(before.undo).length, redo:JSON.parse(before.redo).length };
    await page.getByRole('button', { name: 'Showcase creation', exact: true }).click();
    await page.getByRole('dialog', { name: 'Showcase creation', exact: true }).waitFor();
    await page.waitForTimeout(500);
    results.checks.desktop = await bounds(); checkBounds(results.checks.desktop);
    results.checks.presentation=await page.evaluate(()=>({backdropFilter:getComputedStyle(document.querySelector('.gwe-showcase')).backdropFilter,ghostVisible:!!__geoWorldEngine._ghostMesh?.visible}));
    assert.equal(results.checks.presentation.backdropFilter,'none','Showcase leaves the creation sharp');
    assert.equal(results.checks.presentation.ghostVisible,false,'Showcase hides the in-world placement ghost');
    const initialOrbit=(await state()).position;
    await page.getByRole('button',{name:'Rotate view right',exact:true}).click();
    await page.waitForTimeout(100);
    checkBounds(await bounds());
    assert.notDeepEqual((await state()).position,initialOrbit,'Orbit moves the camera');
    await page.getByRole('button',{name:'Rotate view left',exact:true}).click();
    const returnedOrbit=(await state()).position;
    assert.ok(returnedOrbit.every((v,i)=>Math.abs(v-initialOrbit[i])<1e-8),'Opposite orbit returns to the original framing');
    results.checks.orbit=true;
    await page.screenshot({ path: path.join(out, 'showcase-desktop.png') });
    for (const key of ['KeyB','KeyX','KeyQ','KeyR','Control+z','Control+y']) await page.keyboard.press(key);
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('KeyB');
    const during = await state();
    for (const field of ['blocks','undo','redo','selection','shape','rotation']) assert.deepEqual(during[field],before[field],field+' is preserved while showcase is active');
    results.checks.keyboardGuard = true;
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save image', exact: true }).click();
    const download = await downloadPromise;
    const savedPath = path.join(out, 'showcase-download.png');
    await download.saveAs(savedPath);
    const png = fs.readFileSync(savedPath);
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.ok(png.length>10000,'The PNG contains rendered image content');
    results.checks.download = { suggestedFilename: download.suggestedFilename(), bytes: png.length, width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
    await page.setViewportSize({ width:390,height:844 });
    await page.waitForFunction(() => { const e=__geoWorldEngine,r=e.renderer.domElement.getBoundingClientRect(); return Math.abs(e.camera.aspect-r.width/r.height)<0.02; }, {}, {timeout:20000});
    await page.waitForTimeout(500);
    results.checks.phone = await bounds(); checkBounds(results.checks.phone);
    await page.screenshot({ path:path.join(out,'showcase-phone.png') });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', {name:'Showcase creation',exact:true}).waitFor({state:'hidden'});
    await page.waitForTimeout(100);
    const after = await state();
    assert.deepEqual(after,before,'Escape restores camera, FOV, dock, block geometry, history and persistent selection');
    results.checks.escapeRestore = true;
    await page.evaluate(() => { __geoWorldEngine.flyMode=false; __geoWorldEngine.velocity.set(0,0,0); });
    await page.getByRole('button', {name:'Showcase creation',exact:true}).click();
    await page.getByRole('dialog', {name:'Showcase creation',exact:true}).waitFor();
    await page.waitForTimeout(650);
    results.checks.walkingShowcase = await page.evaluate(() => ({walking:!__geoWorldEngine.flyMode, velocity:__geoWorldEngine.velocity.toArray()}));
    results.checks.phoneEntry = await bounds(); checkBounds(results.checks.phoneEntry);
    const walkingSavedCamera = await page.evaluate(() => {
      const engine=__geoWorldEngine,saved=engine._showcase,finish=engine.endShowcase;
      engine.endShowcase=function(){ finish(); window.__showcaseClosedCamera={position:engine.camera.position.toArray(),quaternion:engine.camera.quaternion.toArray(),fov:engine.camera.fov}; };
      return {position:saved.position.toArray(),quaternion:saved.quaternion.toArray(),fov:saved.fov};
    });
    await page.getByRole('button', {name:'Back to building',exact:true}).click();
    await page.getByRole('dialog', {name:'Showcase creation',exact:true}).waitFor({state:'hidden'});
    assert.deepEqual(await page.evaluate(()=>window.__showcaseClosedCamera),walkingSavedCamera,'The close button restores the actual walking entry camera before normal gravity resumes');
    const walkingAfter=await state();
    for(const field of ['dockCollapsed','blocks','undo','redo','selection','shape','rotation'])assert.deepEqual(walkingAfter[field],before[field],'Walking Showcase preserves '+field);
    assert.equal(results.checks.walkingShowcase.walking,true);
    assert.deepEqual(results.checks.walkingShowcase.velocity,[0,0,0]);
    results.checks.buttonRestore = true;
    results.checks.shaderErrors = await page.evaluate(() => __geoWorldEngine.renderer.info.programs.filter(program=>program.diagnostics?.runnable===false).map(program=>program.diagnostics));
    assert.equal(results.checks.shaderErrors.length,0); assert.equal(results.errors.length,0);
    results.passed = true;
  } catch(error) {
    results.passed = false; results.failure = error.stack; process.exitCode = 1;
    results.diagnostics=await page.evaluate(() => { const e=__geoWorldEngine,c=e.renderer.domElement,p=c.parentElement,d=document.querySelector('.gwe-showcase'); return {destroyed:e._destroyed,runtimeFailed:e._runtimeFailed,pausedByViewport:e._pausedByViewport,aspect:e.camera.aspect,lastViewport:e._lastViewport,resizeRaf:e._resizeRafId,canvas:{client:[c.clientWidth,c.clientHeight],buffer:[c.width,c.height]},parent:{tag:p.tagName,id:p.id,classes:p.className,client:[p.clientWidth,p.clientHeight],connected:p.isConnected},dialog:d?{backdropFilter:getComputedStyle(d).backdropFilter,filter:getComputedStyle(d).filter}:null,toasts:__events.toasts.slice(-5)}; }).catch(()=>null);
    await page.screenshot({path:path.join(out,'showcase-failure.png')}).catch(()=>{});
  } finally {
    const resultPath = path.join(out,'showcase-results.json');
    const text = JSON.stringify(results,null,2);
    if(fs.existsSync(resultPath)){const fd=fs.openSync(resultPath,'r+');fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));fs.closeSync(fd);}else fs.writeFileSync(resultPath,text);
    console.log(text); await browser.close(); await new Promise(resolve=>server.close(resolve));
  }
}).toString() + ')();';
eval(harness);
