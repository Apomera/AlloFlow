const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm'),zlib=require('node:zlib');
const repo=process.env.UNIVERSE_REPO||path.resolve(__dirname,'..');
const report=process.env.UNIVERSE_HIGHLIGHT_REPORT||path.join(repo,'reports/universe-flight-2026-09-29/highlights');
const {chromium}=require(path.join(repo,'node_modules/playwright'));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const sourceFile=path.join(repo,'stem_lab/universe_flight_scene.js'),uiFile=path.join(repo,'stem_lab/stem_tool_universe.js');
const result={completed:false,sourceHash:hash(fs.readFileSync(sourceFile)),uiHash:hash(fs.readFileSync(uiFile)),checks:[],captures:[],accessibility:[],errors:[],jumps:[],layouts:[],served:[]};
fs.mkdirSync(report,{recursive:true});
const save=()=>{const output=path.join(report,'check.json');fs.writeFileSync(output+'.tmp',JSON.stringify(result,null,2));fs.renameSync(output+'.tmp',output);};
const window={};const baseline=fs.readFileSync(path.join(report,'baseline-renderer.js'),'utf8');
assert.equal(hash(baseline.replace(/\r\n/g,'\n')),'6268c0301f9b177eb2bae715ebc54254f24909a86cb6a9a6465de92fe2ace872');
vm.runInNewContext(baseline.replace('  global.UniverseFlight =','global.__routes=FLYBY_ROUTES;\n  global.UniverseFlight ='),{window});
const routes=window.__routes;
function png(buffer) {
  assert.equal(buffer.subarray(1, 4).toString(), 'PNG');
  let width, height, channels, offset = 8;
  const chunks = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset), type = buffer.subarray(offset + 4, offset + 8).toString(), data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); assert.equal(data[8], 8); assert.ok([2, 6].includes(data[9])); channels = data[9] === 6 ? 4 : 3; }
    else if (type === 'IDAT') chunks.push(data);
    else if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks)), stride = width * channels, pixels = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => { const p = a + b - c, aa = Math.abs(p - a), bb = Math.abs(p - b), cc = Math.abs(p - c); return aa <= bb && aa <= cc ? a : bb <= cc ? b : c; };
  for (let y = 0; y < height; y++) for (let x = 0; x < stride; x++) {
    const i = y * stride + x, f = raw[y * (stride + 1)], a = x >= channels ? pixels[i - channels] : 0, b = y ? pixels[i - stride] : 0, c = y && x >= channels ? pixels[i - stride - channels] : 0;
    assert.ok(f <= 4);
    pixels[i] = (raw[y * (stride + 1) + 1 + x] + (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255;
  }
  return { width, height, channels, pixels };
}
function statistics(image) {
  let count = 0, sum = 0, clipped = 0, luminous = 0, colored = 0, max = 0;
  for (let y = 0; y < image.height; y += 3) for (let x = 0; x < image.width; x += 3) {
    const i = (y * image.width + x) * image.channels, r = image.pixels[i], g = image.pixels[i + 1], b = image.pixels[i + 2], level = .2126 * r + .7152 * g + .0722 * b;
    count++; sum += level; max = Math.max(max, r, g, b); if (level > 8) luminous++; if (Math.max(r,g,b)-Math.min(r,g,b)>8) colored++; if (Math.min(r, g, b) >= 250) clipped++;
  }
  return { mean: sum / count, clippedWhiteFraction: clipped / count, luminousFraction: luminous / count, colorFraction: colored / count, max };
}
function difference(a, b) {
  assert.equal(a.width, b.width); assert.equal(a.height, b.height);
  let sum = 0, changed = 0, count = 0;
  for (let y = 0; y < a.height; y += 3) for (let x = 0; x < a.width; x += 3) {
    const ai = (y * a.width + x) * a.channels, bi = (y * b.width + x) * b.channels;
    const d = (Math.abs(a.pixels[ai] - b.pixels[bi]) + Math.abs(a.pixels[ai + 1] - b.pixels[bi + 1]) + Math.abs(a.pixels[ai + 2] - b.pixels[bi + 2])) / 3;
    count++; sum += d; if (d > 4) changed++;
  }
  return { meanAbsolute: sum / count, changedFraction: changed / count };
}


(async()=>{
 const browser=await chromium.launch({args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});
  page.on('pageerror',error=>result.errors.push(String(error)));
  page.on('response',async response=>{if(/\/stem_lab\/(universe_flight_scene|stem_tool_universe)\.js(?:\?|$)/.test(response.url()))try{result.served.push({url:response.url(),status:response.status(),hash:hash(await response.body())});}catch(error){result.errors.push(String(error));}});
    await page.addInitScript(() => {
      window.__nebulaGL = []; window.__nebulaScenes = []; window.__nebulaPauses = []; window.__nebulaLaunches = []; window.__nebulaSamples = [];
      const context = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        const gl = context.call(this, type, ...args); if (type !== 'webgl' || !gl || gl.__nebulaProbe) return gl;
        gl.__nebulaProbe = true;
        const record = { created: 0, deleted: 0, textures: [], shaders: [], pointUploads: [], currentPoints: null,atlasUploads:[],buffers:[],programs:[],buffersDeleted:0,programsDeleted:0 };
        window.__nebulaGL.push({ gl, record });
        const data = gl.bufferData.bind(gl), shader = gl.shaderSource.bind(gl), create = gl.createTexture.bind(gl), remove = gl.deleteTexture.bind(gl),image=gl.texImage2D.bind(gl),buffer=gl.createBuffer.bind(gl),deleteBuffer=gl.deleteBuffer.bind(gl),program=gl.createProgram.bind(gl),deleteProgram=gl.deleteProgram.bind(gl);
        gl.bufferData = function (target, values, ...rest) { if (values instanceof Float32Array && values.length > 9000 && values.length % 9 === 0) record.currentPoints = new Uint8Array(values.buffer, values.byteOffset, values.byteLength).slice(); return data(target, values, ...rest); };
        gl.shaderSource = function (object, text) { record.shaders.push(text); return shader(object, text); };
        gl.createTexture = function () { const texture = create(); record.created++; record.textures.push(texture); return texture; };
        gl.deleteTexture = function (texture) { if (texture) record.deleted++; return remove(texture); };
        gl.texImage2D=function(...args){const bytes=args[8];if(args.length===9&&bytes instanceof Uint8Array)record.atlasUploads.push({width:args[3],height:args[4],bytes:bytes.slice()});return image(...args);};
        gl.createBuffer=function(){const item=buffer();record.buffers.push(item);return item;};gl.deleteBuffer=function(item){if(item)record.buffersDeleted++;return deleteBuffer(item);};
        gl.createProgram=function(){const item=program();record.programs.push(item);return item;};gl.deleteProgram=function(item){if(item)record.programsDeleted++;return deleteProgram(item);};
        return gl;
      };
      let api;
      Object.defineProperty(window, 'UniverseFlight', { configurable: true, get() { return api; }, set(value) {
        const create = value.create;
        value.create = function (canvas, options) {
          const telemetry = options.onTelemetry, status = options.onStatus, pause = options.onPause;
          const scene = create.call(this, canvas, Object.assign({}, options, {
            onTelemetry(info) { window.__nebulaInfo = info; if (info.flyby?.active) window.__nebulaSamples.push({ progress: info.flyby.progress, elapsedSeconds: info.flyby.elapsedSeconds, position: info.position, state: info.state }); if (telemetry) telemetry(info); },
            onStatus(info) { window.__nebulaStatus = info; if (status) status(info); },
            onPause(message, detail) { window.__nebulaPauses.push({ message, detail: detail ? JSON.parse(JSON.stringify(detail)) : null }); if (pause) pause(message, detail); }
          }));
          window.__highlightJumps=window.__highlightJumps||[];
          const seek=scene.seekFlybyHighlight;
          scene.seekFlybyHighlight=function(id){const entry={id,before:scene.snapshot(),eventCount:window.__nebulaPauses.length};entry.accepted=seek.call(this,id);entry.after=scene.snapshot();entry.info=JSON.parse(JSON.stringify(window.__nebulaInfo));entry.events=window.__nebulaPauses.slice(entry.eventCount);window.__highlightJumps.push(entry);return entry.accepted;};
          const launch = scene.startFlyby;
          if (launch) scene.startFlyby = function (...args) { const entry = { args, before: scene.snapshot() }; entry.accepted = launch.apply(this, args); entry.after = scene.snapshot(); window.__nebulaLaunches.push(entry); return entry.accepted; };
          window.__nebulaScene = scene; window.__nebulaCanvas = canvas; window.__nebulaScenes.push(scene); return scene;
        }; api = value;
      } });
    });

  await page.goto('http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=27&highlight=qa');
  await page.waitForFunction(()=>window.__nebulaScene&&window.__nebulaStatus?.state==='ready');
  await page.addScriptTag({path:path.join(repo,'node_modules/axe-core/axe.min.js')});
  const stage=page.locator('.uf-stage'),canvas=stage.locator('canvas'),panel=stage.locator('#uf-inview-controls');
  const info=()=>page.evaluate(()=>window.__nebulaInfo),snapshot=()=>page.evaluate(()=>window.__nebulaScene.snapshot());
  const next=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const check=name=>{result.checks.push(name);save();console.log('Passed '+name);};
  async function enter(){await page.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);}
  async function exit(){if(await page.evaluate(()=>!!document.fullscreenElement)){await stage.getByRole('button',{name:'Toggle full screen for the 3D view',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);}}
  async function open(){if(!await panel.count())await stage.locator('#uf-flight-controls-toggle').click();await panel.locator('#uf-inview-tab-explore').click();await next();}
  async function close(){if(await panel.count())await panel.getByRole('button',{name:'Close flight controls',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('#uf-inview-controls'));}
  async function focused(){await page.waitForFunction(()=>document.activeElement===window.__nebulaCanvas);}
  async function pause(){if((await info()).running){await canvas.focus();await canvas.press('Space');}await page.waitForFunction(()=>!window.__nebulaInfo.running);await next();}
  async function play(){await canvas.focus();await canvas.press('Space');await page.waitForFunction(()=>window.__nebulaInfo.running);}
  async function launch(id,fullscreen=false){if(fullscreen)await open();const tile=page.locator(fullscreen?'#uf-inview-scenic-flights':'#uf-scenic-flights').locator('[data-scenic-flight="'+id+'"]');await tile.focus();await tile.press('Enter');await focused();await pause();assert.equal((await info()).flyby.id,id);}
  async function axeScope(name,node=stage){const violations=await node.evaluate(async node=>(await axe.run(node,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));result.accessibility.push({name,violations});assert.deepEqual(violations,[]);save();}
  async function capture(name){const actual=await page.evaluate(()=>window.__nebulaScene.capture()),buffer=Buffer.from(actual.dataUrl.split(',')[1],'base64'),image=png(buffer),stats=statistics(image);assert.ok(stats.max>32);assert.ok(stats.clippedWhiteFraction<.001);fs.writeFileSync(path.join(report,name+'.png'),buffer);result.captures.push({name,pixelHash:hash(image.pixels),width:image.width,height:image.height,stats,snapshot:actual.snapshot});save();return image;}
  function expectPose(actual,expected){assert.deepEqual(actual.state.position,Array.from(expected.position));assert.ok(Math.abs(Math.sin(actual.state.yaw)-Math.sin(expected.yaw))<1e-12&&Math.abs(Math.cos(actual.state.yaw)-Math.cos(expected.yaw))<1e-12);assert.equal(actual.state.pitch,expected.pitch);assert.equal(actual.state.distanceLy,expected.distance);assert.equal(actual.state.universeYears,0);assert.equal(actual.state.travelerYears,0);}
  async function jump(route,highlight,fullscreen=false,name){if(fullscreen)await open();const card=page.locator(fullscreen?'#uf-inview-flyby-status':'#uf-flyby-status'),button=card.locator('[data-flyby-highlight="'+highlight.id+'"]');await button.focus();await button.press('Enter');await focused();await next();assert.equal(await panel.count(),0);const actual=await snapshot(),state=await info(),record=await page.evaluate(()=>window.__highlightJumps.at(-1));assert.equal(record.accepted,true);assert.equal(record.id,highlight.id);assert.equal(state.flyby.elapsedSeconds,highlight.seconds);assert.equal(state.flyby.active,true);assert.equal(state.flyby.completed,false);assert.equal(state.flyby.autoLook,true);assert.equal(state.running,false);assert.equal(state.motion.paceLyPerSecond,0);expectPose(actual,routes[route.id].atTime(highlight.seconds));assert.deepEqual(actual.settings,record.before.settings);assert.equal(record.events.length,1);assert.equal(record.events[0].detail.kind,'flyby-highlight');assert.equal(record.events[0].detail.highlightId,highlight.id);assert.equal(await stage.locator('#uf-stage-journey').count(),0);assert.ok((await stage.locator('.uf-flight-phase').innerText()).length>0);const first=await capture(name||route.id+'-'+highlight.id);await page.waitForTimeout(180);const frozen=await page.evaluate(()=>window.__nebulaScene.capture());assert.deepEqual(png(Buffer.from(frozen.dataUrl.split(',')[1],'base64')).pixels,first.pixels);assert.deepEqual(frozen.snapshot,actual);result.jumps.push({route:route.id,highlight,...record});save();return actual;}
  const catalog=await page.evaluate(()=>UniverseFlight.flybys());assert.deepEqual(catalog.map(route=>route.id).sort(),['group','halo','nebula']);result.catalog=catalog;
  const group=catalog.find(route=>route.id==='group');assert.equal(group.region,'cosmic');assert.equal(group.durationSeconds,48);assert.equal(group.highlights.length,3);
  const priorRoutes=catalog.filter(route=>['halo','nebula'].includes(route.id));assert.equal(priorRoutes.length,2);
  for(const route of priorRoutes){
   await launch(route.id);await enter();
   await open();await axeScope(route.id+'-desktop-highlight-controls');assert.equal(await panel.locator('[data-flyby-highlight]').count(),3);await close();
   for(const highlight of route.highlights)await jump(route,highlight,true);
   const last=await snapshot();await play();await page.waitForFunction(seconds=>window.__nebulaInfo.flyby.elapsedSeconds>seconds+.1,route.highlights.at(-1).seconds,{timeout:30000});await pause();assert.notDeepEqual((await snapshot()).state.position,last.state.position);
   await open();await panel.locator('#uf-inview-flyby-rate').selectOption('2');await close();const before=await page.evaluate(()=>window.__nebulaPauses.filter(e=>e.detail?.kind==='flyby').length);await play();await page.waitForFunction(()=>window.__nebulaInfo.flyby.completed&&!window.__nebulaInfo.running,{},{timeout:60000});const events=await page.evaluate(()=>window.__nebulaPauses.filter(e=>e.detail?.kind==='flyby'));assert.equal(events.length,before+1);await stage.locator('#uf-stage-journey').waitFor({state:'visible'});
   await open();assert.equal(await panel.locator('[data-flyby-highlight]').count(),3);await axeScope(route.id+'-completed-highlight-controls');await jump(route,route.highlights[1],true,route.id+'-revisited');assert.ok(!(await stage.locator('#uf-stage-journey').count()));
   await canvas.focus();await canvas.press('ArrowRight');assert.equal((await info()).flyby.autoLook,false);await jump(route,route.highlights[0],true,route.id+'-backward');
   const saved=await snapshot();assert.equal(await page.evaluate(saved=>window.__nebulaScene.restore(saved),saved),true);await next();assert.equal((await info()).flyby.active,false);assert.equal((await info()).running,false);assert.equal(await stage.locator('.uf-flight-phase').count(),0);check(route.id+' exact authored highlights, paused pixels, native focus, backward revisit, resume, natural completion, and snapshot clearing');await exit();
  }
  // Normal native controls share paused highlights and preserve composed settings.
  const nebula=catalog.find(r=>r.id==='nebula');await launch('nebula');
  await stage.getByRole('button',{name:'Narrow view',exact:true}).click();await enter();await open();await panel.locator('#uf-inview-tab-compose').click();await panel.locator('#uf-inview-quality').selectOption('low');await close();await exit();await page.locator('#uf-flyby-rate').selectOption('0.5');await next();const custom=await snapshot();await jump(nebula,nebula.highlights[1],false,'nebula-normal-composed');assert.equal((await snapshot()).settings.fov,custom.settings.fov);assert.equal((await snapshot()).settings.exposure,custom.settings.exposure);check('Normal keyboard highlight controls retain lens, exposure, quality and route pace');
  await enter();const phase=stage.locator('.uf-flight-phase');await stage.getByRole('button',{name:'Hide overlay',exact:true}).click();assert.ok(await phase.isHidden());await stage.getByRole('button',{name:'Show overlay',exact:true}).click();assert.ok(await phase.isVisible());await open();assert.ok(await phase.isHidden());await close();assert.ok(await phase.isVisible());await canvas.focus();await canvas.press('ArrowRight');await play();await page.waitForFunction(seconds=>window.__nebulaInfo.flyby.elapsedSeconds>seconds+.1,nebula.highlights[1].seconds,{timeout:30000});await pause();assert.equal((await info()).flyby.autoLook,false);check('Phase cue follows travel without a live announcement and honors clean view and open controls');await exit();
  for(const viewport of [{width:320,height:740},{width:568,height:320}]){
   await page.setViewportSize(viewport);
   for(const route of priorRoutes){
    await launch(route.id);const normal=page.locator('#uf-flyby-status');await axeScope(route.id+'-'+viewport.width+'-normal-highlights',normal);const normalButton=normal.locator('[data-flyby-highlight]').last();await normalButton.scrollIntoViewIfNeeded();const box=await normalButton.boundingBox();assert.ok(box.height>=44&&box.x>=0&&box.x+box.width<=viewport.width+1);await enter();await open();await axeScope(route.id+'-'+viewport.width+'-fullscreen-highlights');const button=panel.locator('[data-flyby-highlight]').last();await button.scrollIntoViewIfNeeded();const target=await button.boundingBox(),shell=await panel.boundingBox();assert.ok(target.height>=44&&target.x>=0&&target.x+target.width<=viewport.width+1);assert.ok(shell.y>=0&&shell.x>=0&&shell.x+shell.width<=viewport.width+1&&shell.y+shell.height<=viewport.height+1);await stage.screenshot({path:path.join(report,'controls-'+route.id+'-'+viewport.width+'.png')});await jump(route,route.highlights[2],true,route.id+'-'+viewport.width+'-highlight');assert.ok(await phase.isVisible());const phaseBox=await phase.boundingBox(),lens=await stage.locator('.uf-lens-controls').boundingBox();assert.ok(!(phaseBox.x<lens.x+lens.width&&phaseBox.x+phaseBox.width>lens.x&&phaseBox.y<lens.y+lens.height&&phaseBox.y+phaseBox.height>lens.y),'Phase cue does not overlap view zoom');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await stage.screenshot({path:path.join(report,'phase-'+route.id+'-'+viewport.width+'.png')});result.layouts.push({viewport,route:route.id,button:target,panel:shell,phase:phaseBox,lens});await exit();
   }
  }
  check('Phone and landscape native highlights have 44px targets, fit the scrollable panel, return canvas focus and keep the phase clear of zoom');
  await page.getByRole('button',{name:'Close flight explorer',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.uf-stage'));
  result.resources=await page.evaluate(()=>window.__nebulaGL.map(({gl,record})=>{gl.useProgram(null);return{textures:record.created,deletedTextures:record.deleted,liveTextures:record.textures.filter(t=>gl.isTexture(t)).length,buffers:record.buffers.length,deletedBuffers:record.buffersDeleted,liveBuffers:record.buffers.filter(b=>gl.isBuffer(b)).length,programs:record.programs.length,deletedPrograms:record.programsDeleted,livePrograms:record.programs.filter(p=>gl.isProgram(p)).length,error:gl.getError()};}));for(const r of result.resources){assert.equal(r.textures,2);assert.equal(r.deletedTextures,2);assert.equal(r.liveTextures,0);assert.equal(r.buffers,2);assert.equal(r.deletedBuffers,2);assert.equal(r.liveBuffers,0);assert.equal(r.programs,2);assert.equal(r.deletedPrograms,2);assert.equal(r.livePrograms,0);assert.equal(r.error,0);}check('Closing releases the existing two textures, two buffers and two programs with no graphics errors');
  assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourceFile)),result.sourceHash);assert.equal(hash(fs.readFileSync(uiFile)),result.uiHash);for(const [suffix,expected]of [['universe_flight_scene.js',result.sourceHash],['stem_tool_universe.js',result.uiHash]]){const served=result.served.find(item=>item.url.includes(suffix));assert.equal(served?.status,200);assert.equal(served?.hash,expected);}
  result.completed=true;save();console.log('Highlights passed: '+result.checks.length+' groups, '+result.accessibility.length+' accessibility scopes, '+result.captures.length+' actual captures.');
 }catch(error){result.failure=String(error);save();throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
