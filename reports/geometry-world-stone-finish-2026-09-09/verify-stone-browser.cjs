const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const stage = process.argv[2] || 'after';
if (!['before', 'after'].includes(stage)) throw Error('Choose before or after');
const sourceDir = path.join(__dirname, stage + '-source');
fs.mkdirSync(sourceDir, { recursive:true });
if (stage === 'after') for (const name of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js']) fs.copyFileSync('stem_lab/' + name, path.join(sourceDir, name));
const frozen = new Map(['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'].map(name => [path.resolve('stem_lab', name), fs.readFileSync(path.join(sourceDir, name))]));
let harness = fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs', 'utf8').split('const results =')[0];
harness = harness.replace('res.end(fs.readFileSync(file));', 'res.end(frozen.get(file)||fs.readFileSync(file));');
harness = harness.replace('window.__mount({_introShownOnce:true});', 'window.__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false});');
harness += '(' + (async function stoneReview() {
  const result = {stage, sources:Object.fromEntries(Array.from(frozen, ([name, bytes]) => [path.basename(name), crypto.createHash('sha256').update(bytes).digest('hex')])), errors:[], consoleErrors:[], failures:[], captures:[]};
  const check = (ok, message) => { if (!ok) result.failures.push(message); };
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page = await browser.newPage({viewport:{width:1200,height:820}, deviceScaleFactor:1});
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('console', message => { if(message.type()==='error') result.consoleErrors.push(message.text()); });
  async function signature() {
    return page.evaluate(async () => {
      const e=__geoWorldEngine, p=StemLab.geometryWorldBuilderPure, world=p.editableWorld(e).blocks, stl=p.buildGeometryWorldStl(e, world);
      const geometry=world.map(b=>{const m=e.blocks[[b.x,b.y,b.z].join(',')];return {key:[b.x,b.y,b.z].join(','),position:m.position.toArray(),rotation:m.rotation.toArray(),scale:m.scale.toArray(),attributes:Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,a])=>[k,Array.from(a.array)])),index:m.geometry.index&&Array.from(m.geometry.index.array)};});
      return {world:JSON.stringify(world), geometry:JSON.stringify(geometry), stl:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',stl.buffer))).map(x=>x.toString(16).padStart(2,'0')).join(''), undo:JSON.stringify(e._undoStack), redo:JSON.stringify(e._redoStack)};
    });
  }
  async function capture(label) {
    await page.waitForTimeout(350);
    const file=stage+'-'+label+'.png';await page.screenshot({path:path.join(out,file)});
    result.captures.push(await page.evaluate(file=>{const e=__geoWorldEngine;return {file,profile:e._renderProfile,position:e.camera.position.toArray(),quaternion:e.camera.quaternion.toArray(),drawCalls:e.renderer.info.render.calls,triangles:e.renderer.info.render.triangles,shaderErrors:e.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.diagnostics),pageOverflow:document.documentElement.scrollWidth>innerWidth};},file));
    console.log(file);
  }
  try {
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();
    await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    await page.evaluate(()=>{
      const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure;
      e.loadLesson(Object.assign({},p.FREE_BUILD_LESSON,{ground:{xMin:-6,xMax:6,zMin:-5,zMax:5,y:0,type:'grass'}}));
      e._entryAnim=null;e.flyMode=true;e.releaseInput();e.velocity.set(0,0,0);e._ambientMotionEnabled=false;
      const put=(x,y,z,type='stone',shape='cube',rotation=0)=>e.placeBlock(x,y,z,type,shape,rotation);
      for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++)put(x,1,z);
      for(const x of [-2,2])for(const z of [-1,1]){put(x,2,z,'brick');put(x,3,z,'wood');put(x,4,z,'wood');}
      for(let x=-2;x<=2;x++)for(const z of [-1,1])put(x,5,z,'stone','halfB');
      for(let x=-1;x<=1;x++)put(x,1,2,'stone','halfB');
      put(-3,1,0,'stone','halfA',1);put(3,1,0,'stone','quarter',3);
      e.refreshAllAO();e.camera.position.set(7.5,6.2,10);e.camera.lookAt(.4,2.9,.2);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);
      const blocks=p.editableWorld(e).blocks;e._builderSelection={blocks:blocks.map(b=>({x:b.x,y:b.y,z:b.z}))};e.blocksPlaced=blocks.length;
      __ctx.updateMulti('geometryWorld',{worldActive:true,blocksPlaced:blocks.length,autoCycle:false,sandboxDockCollapsed:true,measureResult:null,builderPanel:'build',touchMode:false});
    });
    await page.waitForTimeout(600);result.initial=await signature();
    const texture=await page.evaluate(()=>{
      const e=__geoWorldEngine,t=e._procTexCache.stone,c=t.image,p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let sum=0,square=0,min=255,max=0;for(let i=0;i<p.length;i+=4){const l=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];sum+=l;square+=l*l;min=Math.min(min,l);max=Math.max(max,l);}
      const n=p.length/4,mean=sum/n;return {png:c.toDataURL(),width:c.width,height:c.height,encoding:t.encoding,mean,std:Math.sqrt(square/n-mean*mean),min,max};
    });
    fs.writeFileSync(path.join(out,stage+'-stone-texture.png'),Buffer.from(texture.png.split(',')[1],'base64'));delete texture.png;result.texture=texture;
    for (const quality of ['balanced','saver']) {
      await page.evaluate(quality=>{const e=__geoWorldEngine;e.applyRenderQuality(quality);e._ambientMotionEnabled=false;__ctx.updateMulti('geometryWorld',{renderQuality:quality});},quality);
      await capture('build-'+quality+'-1200x820');
      result[quality]=await page.evaluate(()=>{const e=__geoWorldEngine,m=Object.values(e.blocks).find(m=>m.userData.blockType==='stone');return {normal:!!m.material.normalMap,roughness:!!m.material.roughnessMap,textureShared:Object.values(e.blocks).filter(m=>m.userData.blockType==='stone').every(m=>m.material.map===e._procTexCache.stone)};});
    }
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{const e=__geoWorldEngine;e.camera.position.set(11,8,15);e.camera.lookAt(.3,2.8,.3);e.euler.setFromQuaternion(e.camera.quaternion);__ctx.updateMulti('geometryWorld',{touchMode:true});});
    await capture('build-saver-390x844');
    await page.setViewportSize({width:1200,height:820});
    await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();
    await page.getByRole('button',{name:'Showcase creation',exact:true}).click();
    await page.getByRole('button',{name:'Studio',exact:true}).click();
    await capture('studio-saver-1200x820');
    await page.getByRole('button',{name:'Back to building',exact:true}).click();
    result.final=await signature();
    check(JSON.stringify(result.initial)===JSON.stringify(result.final),'Quality, viewport and Studio transitions preserve geometry/world/STL/history');
    check(result.balanced.normal&&result.balanced.roughness&&!result.saver.normal&&!result.saver.roughness,'Existing surface detail tiers remain correct');
    check(result.balanced.textureShared&&result.saver.textureShared,'Every stone block shares the cached color texture');
    check(result.captures.every(c=>!c.shaderErrors.length&&!c.pageOverflow),'No shader errors or page overflow');
    check(!result.errors.length&&!result.consoleErrors.length,'No browser or console errors');
    result.pass=!result.failures.length;
  } catch(error) {result.failure=error.stack;result.pass=false;await page.screenshot({path:path.join(out,stage+'-failure.png')}).catch(()=>{});}
  finally {
    const output=path.join(out,stage+'-results.json'),text=JSON.stringify(result,null,2);
    if(fs.existsSync(output)){const fd=fs.openSync(output,'r+');fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));fs.closeSync(fd);}else fs.writeFileSync(output,text);
    console.log(JSON.stringify({stage,pass:result.pass,texture:result.texture,failures:result.failures,failure:result.failure,errors:result.errors}));
    await browser.close();await new Promise(resolve=>server.close(resolve));if(!result.pass)process.exitCode=1;
  }
}).toString()+')();';
eval(harness);
