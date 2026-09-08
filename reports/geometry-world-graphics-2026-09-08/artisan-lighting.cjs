const fs = require('node:fs');
let harness = fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs', 'utf8').split('const results =')[0];
harness += '(' + (async function compareLighting() {
  const results = { scope: 'One live WebGL engine; fixed pavilion, materials, camera and output pipeline across lighting variants', errors: [], consoleErrors: [], captures: [] };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => results.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') results.consoleErrors.push(message.text()); });
  try {
    await page.goto('http://127.0.0.1:' + server.address().port, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.__geoWorldEngine || !!window.__geoWorldEngine_failed, {}, { timeout: 120000 });
    await page.getByRole('button', { name: /Free Build Sandbox studio/ }).click();
    await page.getByRole('button', { name: 'Open blank sandbox', exact: true }).click();
    await page.evaluate(() => {
      const en = __geoWorldEngine;
      en._entryAnim = null; en.flyMode = true; en.velocity.set(0, 0, 0);
      en.applyRenderQuality('detail'); en._ambientMotionEnabled = false;
      const place = (x,y,z,type,shape='cube',rotation=0) => en.placeBlock(x,y,z,type,shape,rotation);
      for (let x=-3;x<=2;x++) for (let z=-2;z<=2;z++) place(x,1,z,(x===-3||x===2||z===-2||z===2)?'stone':'wood');
      for (const x of [-3,2]) for (const z of [-2,2]) {
        place(x,2,z,'brick'); for (let y=3;y<=4;y++) place(x,y,z,'wood'); place(x,5,z,'gold');
      }
      for (let x=-3;x<=2;x++) for (const z of [-2,2]) if(x!==-3&&x!==2) place(x,5,z,'wood');
      for (let z=-1;z<=1;z++) for (const x of [-3,2]) place(x,5,z,'wood');
      for (let x=-4;x<=3;x++) for (let z=-3;z<=3;z++) {
        const roofY=5+Math.min(x+4,3-x); place(x,roofY,z,'brick','halfA',x<0?0:2); if(roofY>5) place(x,roofY-1,z,'wood');
      }
      for (let x=-1;x<=0;x++) place(x,1,3,'stone','halfB');
      en.refreshAllAO(); en.camera.fov=48; en.camera.updateProjectionMatrix();
      en.camera.position.set(14,11,19); en.camera.lookAt(.5,2.8,.5); en.euler.setFromQuaternion(en.camera.quaternion); en.camera.updateMatrixWorld(true);
      __ctx.updateMulti('geometryWorld',{renderQuality:'detail',autoCycle:false,showGameSettings:false,sandboxDockCollapsed:true});
    });
    await page.waitForTimeout(800);
    results.shaderProbe = await page.evaluate(() => ({
      programs: __geoWorldEngine.renderer.info.programs.length,
      errors: __geoWorldEngine.renderer.info.programs.filter(p => p.diagnostics && p.diagnostics.runnable === false).map(p => p.diagnostics),
      finishMaterials: Object.values(__geoWorldEngine.blocks).filter(m => !!m.material._gwBlockFinish).length
    }));
    console.log(JSON.stringify({ stage:'initial-shader-probe', ...results.shaderProbe, pageErrors:results.errors, consoleErrors:results.consoleErrors }));
    if (results.shaderProbe.errors.length || results.errors.length || results.consoleErrors.some(message=>/WebGLProgram|VALIDATE_STATUS|shader error/i.test(message))) throw new Error('Shader probe failed; detailed errors retained in report.');
    const variants = {
      original: {day:{ambient:.30,hemi:.42,sun:1.05,el:58},golden:{ambient:.40,hemi:.34,sun:1,el:20},rim:.25,bias:-.0005,normalBias:.02},
      crafted: {day:{ambient:.20,hemi:.32,sun:1,el:48},golden:{ambient:.22,hemi:.28,sun:1,el:20},rim:.16,bias:-.00012,normalBias:.012},
      gentle: {day:{ambient:.24,hemi:.36,sun:1,el:50},golden:{ambient:.26,hemi:.30,sun:1,el:20},rim:.18,bias:-.00016,normalBias:.015}
    };
    for (const presetName of ['day','golden']) {
      await page.getByRole('button',{name:'Open game settings and tools',exact:true}).click();
      await page.getByRole('combobox',{name:'Time of day / environment preset',exact:true}).selectOption(presetName);
      await page.getByRole('button',{name:'Close game settings and tools',exact:true}).click();
      await page.waitForTimeout(100); await page.waitForFunction(name => __geoWorldEngine._currentEnv===name && __geoWorldEngine._envDone,presetName);
      for (const variantName of ['original','crafted','gentle']) {
        const variant=variants[variantName], values=Object.assign({},variant[presetName],{rim:variant.rim,bias:variant.bias,normalBias:variant.normalBias});
        await page.evaluate(values => {
          const en=__geoWorldEngine;
          en.scene.children.find(light=>light.isAmbientLight).intensity=values.ambient;
          en._hemi.intensity=values.hemi; en.sun.intensity=values.sun; en._sunAngles.el=values.el;
          const rim=en.scene.children.find(light=>light.isDirectionalLight && light!==en.sun); if(rim)rim.intensity=values.rim;
          en.sun.shadow.bias=values.bias; en.sun.shadow.normalBias=values.normalBias;
          if(en.refreshEnvironment)en.refreshEnvironment();
          if(document.activeElement)document.activeElement.blur();en.isLocked=false;en._touchActive=false;en.camera.fov=48;en.camera.updateProjectionMatrix();en.camera.position.set(9,7,13);en.camera.lookAt(0,3.5,.5);en.euler.setFromQuaternion(en.camera.quaternion);en.camera.updateMatrixWorld(true);
        },values);
        await page.waitForTimeout(250);
        const file='artisan-'+presetName+'-'+variantName+'-detail.png';
        await page.screenshot({path:path.join(out,file)});
        results.captures.push({preset:presetName,variant:variantName,view:'detail',file,values,actualFov:await page.evaluate(()=>__geoWorldEngine.camera.fov)});
        if(presetName==='day' && variantName!=='gentle'){
          await page.evaluate(()=>{const en=__geoWorldEngine;en.camera.position.set(14,11,19);en.camera.lookAt(.5,2.8,.5);en.euler.setFromQuaternion(en.camera.quaternion);en.camera.updateMatrixWorld(true);});
          await page.waitForTimeout(150);
          const wide='artisan-day-'+variantName+'-wide.png';await page.screenshot({path:path.join(out,wide)});
          results.captures.push({preset:presetName,variant:variantName,view:'standard pavilion',file:wide,values,actualFov:await page.evaluate(()=>__geoWorldEngine.camera.fov)});
        }
        console.log(JSON.stringify({stage:'captured',preset:presetName,variant:variantName}));
      }
    }
    results.finalShaders=await page.evaluate(()=>__geoWorldEngine.renderer.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).map(p=>p.diagnostics));
    results.passed=!results.errors.length&&!results.finalShaders.length&&!results.consoleErrors.some(message=>/WebGLProgram|VALIDATE_STATUS|shader error/i.test(message));
    if(!results.passed)process.exitCode=1;
  } catch(error) {results.failure=error.stack;results.passed=false;process.exitCode=1;console.error(error.stack);}
  finally {
    fs.writeFileSync(path.join(out,'artisan-lighting-results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify({stage:'complete',passed:results.passed,failure:results.failure,errors:results.errors,captures:results.captures.length}));
    await browser.close();await new Promise(resolve=>server.close(resolve));
  }
}).toString() + ')();';
eval(harness);
