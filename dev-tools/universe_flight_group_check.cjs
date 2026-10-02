const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),vm=require('node:vm'),zlib=require('node:zlib');
const repo=process.env.UNIVERSE_REPO||path.resolve(__dirname,'..');
const report=process.env.UNIVERSE_GROUP_REPORT||path.join(repo,'reports/universe-flight-2026-09-29/group');
const {chromium}=require(path.join(repo,'node_modules/playwright'));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const sourceFile=path.join(repo,'stem_lab/universe_flight_scene.js'),uiFile=path.join(repo,'stem_lab/stem_tool_universe.js');
const result={completed:false,sourceHash:hash(fs.readFileSync(sourceFile)),uiHash:hash(fs.readFileSync(uiFile)),checks:[],captures:[],accessibility:[],errors:[],jumps:[],layouts:[],served:[]};
fs.mkdirSync(report,{recursive:true});
const save=()=>{const output=path.join(report,'check.json');fs.writeFileSync(output+'.tmp',JSON.stringify(result,null,2));fs.renameSync(output+'.tmp',output);};
const window={};vm.runInNewContext(fs.readFileSync(sourceFile,'utf8').replace('  global.UniverseFlight =','global.__routes=FLYBY_ROUTES;\n  global.UniverseFlight ='),{window});const routes=window.__routes;
const curate=process.env.UNIVERSE_GROUP_CURATE==='1';result.curationOnly=curate;
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
      window.__guidedFrames=[];
      const requestFrame=window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame=function(callback){return requestFrame(function(now){
        const current=window.__nebulaScene,info=window.__nebulaInfo;
        const before=callback.name==='frame'&&current&&info?.running&&info.flyby?.id==='group'&&info.flyby.active&&info.flyby.autoLook?current.snapshot():null;
        callback(now);
        if(before&&current===window.__nebulaScene){const after=current.snapshot();if(after.state.distanceLy>before.state.distanceLy)window.__guidedFrames.push({before:before.state,after:after.state,rate:info.flyby.rate});}
      });};

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

  await page.goto('http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html?enhanced=29&highlight-context=qa');
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
  async function capture(name){const actual=await page.evaluate(()=>window.__nebulaScene.capture()),buffer=Buffer.from(actual.dataUrl.split(',')[1],'base64'),image=png(buffer),stats=statistics(image);assert.ok(stats.max>32);if(!curate)assert.ok(stats.clippedWhiteFraction<.001,'Avoid broad clipped emission in '+name);fs.writeFileSync(path.join(report,name+'.png'),buffer);result.captures.push({name,pixelHash:hash(image.pixels),width:image.width,height:image.height,stats,snapshot:actual.snapshot});save();return image;}
  function expectMovement(actual,expected){assert.deepEqual(actual.state.position,Array.from(expected.position));assert.equal(actual.state.distanceLy,expected.distance);assert.equal(actual.state.universeYears,0);assert.equal(actual.state.travelerYears,0);}
  function expectPose(actual,expected){expectMovement(actual,expected);assert.ok(Math.abs(Math.sin(actual.state.yaw)-Math.sin(expected.yaw))<1e-12&&Math.abs(Math.cos(actual.state.yaw)-Math.cos(expected.yaw))<1e-12);assert.equal(actual.state.pitch,expected.pitch);}
  function expectGuidedPose(actual,expected,name){expectMovement(actual,expected);assert.ok(Number.isFinite(actual.state.yaw)&&Number.isFinite(actual.state.pitch));const cosine=Math.sin(actual.state.pitch)*Math.sin(expected.pitch)+Math.cos(actual.state.pitch)*Math.cos(expected.pitch)*Math.cos(actual.state.yaw-expected.yaw),angle=Math.acos(Math.max(-1,Math.min(1,cosine)));result.guidedGaze=result.guidedGaze||[];result.guidedGaze.push({name,angleDegrees:angle*180/Math.PI});}
  function verifyGuidedFrames(frames){
    // Live gaze has a 0.35-second easing time. Check each actual movement step,
    // rather than a fixed angular lag that depends on RAF timing and route pace.
    assert.ok(frames.length>=3,'Observe several actual guided frames');
    const route=routes.group,timeAtDistance=distance=>{let low=0,high=route.durationSeconds;for(let iteration=0;iteration<60;iteration++){const middle=(low+high)/2;if(route.atTime(middle).distance<distance)low=middle;else high=middle;}return(low+high)/2;};
    let maximumYawError=0,maximumPitchError=0;
    for(const frame of frames){
      const beforeSeconds=timeAtDistance(frame.before.distanceLy),afterSeconds=timeAtDistance(frame.after.distanceLy),seconds=(afterSeconds-beforeSeconds)/frame.rate;
      assert.ok(seconds>0&&seconds<=.50000001);const sample=route.atTime(afterSeconds),weight=-Math.expm1(-seconds/.35),difference=Math.atan2(Math.sin(sample.yaw-frame.before.yaw),Math.cos(sample.yaw-frame.before.yaw));
      const expectedYaw=frame.before.yaw+difference*weight,expectedPitch=Math.max(-Math.PI/2+.01,Math.min(Math.PI/2-.01,frame.before.pitch+(sample.pitch-frame.before.pitch)*weight));
      const yawError=Math.max(Math.abs(Math.sin(frame.after.yaw)-Math.sin(expectedYaw)),Math.abs(Math.cos(frame.after.yaw)-Math.cos(expectedYaw))),pitchError=Math.abs(frame.after.pitch-expectedPitch);
      assert.ok(yawError<1e-9&&pitchError<1e-9,'Live guided gaze follows its actual easing step');maximumYawError=Math.max(maximumYawError,yawError);maximumPitchError=Math.max(maximumPitchError,pitchError);
    }
    result.guidedFrameCheck={frames:frames.length,easingSeconds:.35,maximumYawError,maximumPitchError};
  }
  async function jump(route,highlight,fullscreen=false,name){if(fullscreen)await open();const card=page.locator(fullscreen?'#uf-inview-flyby-status':'#uf-flyby-status'),button=card.locator('[data-flyby-highlight="'+highlight.id+'"]');await button.focus();await button.press('Enter');await focused();await next();assert.equal(await panel.count(),0);const actual=await snapshot(),state=await info(),record=await page.evaluate(()=>window.__highlightJumps.at(-1));assert.equal(record.accepted,true);assert.equal(record.id,highlight.id);assert.equal(state.flyby.elapsedSeconds,highlight.seconds);assert.equal(state.flyby.active,true);assert.equal(state.flyby.completed,false);assert.equal(state.flyby.autoLook,true);assert.equal(state.running,false);assert.equal(state.motion.paceLyPerSecond,0);expectPose(actual,routes[route.id].atTime(highlight.seconds));assert.deepEqual(actual.settings,record.before.settings);assert.equal(record.events.length,1);assert.equal(record.events[0].detail.kind,'flyby-highlight');assert.equal(record.events[0].detail.highlightId,highlight.id);assert.equal(actual.targetId,highlight.targetId);assert.equal(state.target.id,highlight.targetId);assert.equal(record.events[0].detail.targetId,highlight.targetId);const current=page.locator('#uf-flyby-status button[data-flyby-highlight][aria-current="true"]');assert.equal(await current.count(),1);assert.equal(await current.getAttribute('data-flyby-highlight'),highlight.id);assert.equal(await stage.locator('#uf-stage-journey').count(),0);assert.ok((await stage.locator('.uf-flight-phase').innerText()).length>0);const first=await capture(name||route.id+'-'+highlight.id);await page.waitForTimeout(180);const frozen=await page.evaluate(()=>window.__nebulaScene.capture());assert.deepEqual(png(Buffer.from(frozen.dataUrl.split(',')[1],'base64')).pixels,first.pixels);assert.deepEqual(frozen.snapshot,actual);result.jumps.push({route:route.id,highlight,...record});save();return actual;}


  async function inspectAndOrbit(highlight,name){
    await open();assert.equal(await panel.locator('#uf-inview-destination').inputValue(),highlight.targetId);
    await panel.getByRole('button',{name:'Center on destination',exact:true}).click();await focused();await next();assert.equal((await snapshot()).targetId,highlight.targetId);
    await open();assert.equal(await panel.locator('#uf-inview-destination').inputValue(),highlight.targetId);await panel.getByRole('button',{name:'Orbit destination',exact:true}).click();await focused();await page.waitForFunction(()=>window.__nebulaInfo.orbit.active&&window.__nebulaInfo.running);const before=await snapshot();assert.equal((await info()).orbit.targetId,highlight.targetId);
    await page.waitForFunction(position=>window.__nebulaScene.snapshot().state.position.some((value,index)=>Math.abs(value-position[index])>1e-6),before.state.position,{timeout:30000});await pause();assert.equal((await snapshot()).targetId,highlight.targetId);const image=await capture(name+'-orbit');result.contextActions=result.contextActions||[];result.contextActions.push({highlight,targetId:(await snapshot()).targetId,orbit:(await info()).orbit,pixelHash:hash(image.pixels)});save();
  }
  const catalog=await page.evaluate(()=>UniverseFlight.flybys());
  const route=catalog.find(r=>r.id==='group');assert.ok(route);assert.equal(route.region,'cosmic');assert.equal(route.durationSeconds,48);assert.equal(route.highlights.length,3);result.route=route;
  await launch('group');const initial=await snapshot();assert.equal(initial.settings.region,'cosmic');assert.equal(initial.settings.mode,'explore');await enter();const startPixels=await capture('group-start');
  await open();assert.equal(await panel.locator('[data-flyby-highlight]').count(),3);await axeScope('group-desktop-controls');await close();
  if(!curate){
    await open();await panel.locator('#uf-inview-flyby-rate').selectOption('2');await close();await page.evaluate(()=>window.__guidedFrames=[]);await play();await page.waitForFunction(()=>window.__nebulaInfo.flyby.elapsedSeconds>19.75,{},{timeout:90000});await pause();const crossed=await snapshot(),progressed=await info();assert.equal(progressed.flyby.phase,'crossing');assert.equal(progressed.flyby.autoLook,true);assert.ok(progressed.flyby.elapsedSeconds<24);expectGuidedPose(crossed,routes.group.atTime(progressed.flyby.elapsedSeconds),'crossing');verifyGuidedFrames(await page.evaluate(()=>window.__guidedFrames));assert.notDeepEqual(crossed.state.position,initial.state.position);const crossedPixels=await capture('group-crossing');result.travelDifference=difference(startPixels,crossedPixels);assert.ok(result.travelDifference.changedFraction>.01);await open();await panel.locator('#uf-inview-flyby-rate').selectOption('1');await close();check('Native travel reaches the curved intergalactic crossing with real camera movement and changing renderer pixels');
  }
  for(const highlight of route.highlights)await jump(route,highlight,true);
  if(curate){result.completed=false;result.curated=true;save();console.log('Group candidate captured for visual selection.');return;}
  check('Native Group launch and all three exact paused highlights preserve display settings and return canvas focus');
  const savedPanorama=await snapshot();await canvas.focus();await canvas.press('ArrowRight');assert.equal((await info()).flyby.autoLook,false);await play();await page.waitForFunction(s=>window.__nebulaInfo.flyby.elapsedSeconds>s+.15,route.highlights.at(-1).seconds,{timeout:30000});await pause();assert.equal((await info()).flyby.autoLook,false);assert.notDeepEqual((await snapshot()).state.position,savedPanorama.state.position);
  await open();await panel.locator('#uf-inview-flyby-follow').focus();await panel.locator('#uf-inview-flyby-follow').press('Enter');await focused();await next();assert.equal((await info()).flyby.autoLook,true);expectPose(await snapshot(),routes.group.atTime((await info()).flyby.elapsedSeconds));
  check('Free look retains moving route progress and Follow restores its authored view');
  const beforeEvents=await page.evaluate(()=>window.__nebulaPauses.filter(e=>e.detail?.kind==='flyby'&&e.detail?.routeId==='group').length);
  await open();await panel.locator('#uf-inview-flyby-rate').selectOption('2');await close();await play();await page.waitForFunction(()=>window.__nebulaInfo.flyby.completed&&!window.__nebulaInfo.running,{},{timeout:60000});
  const completed=await snapshot();assert.equal(completed.targetId,'golden-elliptical');expectGuidedPose(completed,routes.group.atTime(48),'completed');const events=await page.evaluate(()=>window.__nebulaPauses.filter(e=>e.detail?.kind==='flyby'&&e.detail?.routeId==='group'));assert.equal(events.length,beforeEvents+1);await stage.locator('#uf-stage-journey').waitFor({state:'visible'});await capture('group-completed');await axeScope('group-completed-checkpoint');
  await open();await axeScope('group-completed-controls');await jump(route,route.highlights[1],true,'group-revisited');assert.equal((await snapshot()).targetId,'golden-elliptical');assert.equal(await stage.locator('#uf-stage-journey').count(),0);
  await jump(route,route.highlights[0],true,'group-backward');assert.ok((await snapshot()).state.distanceLy<completed.state.distanceLy);
  check('Natural completion pauses once at the authored endpoint and completed/backward highlights reopen a resumable route');
  const saved=await snapshot();assert.equal(await page.evaluate(s=>window.__nebulaScene.restore(s),saved),true);await next();assert.equal((await info()).flyby.active,false);assert.equal((await info()).running,false);assert.equal(await stage.locator('.uf-flight-phase').count(),0);
  await open();const fullLaunch=panel.locator('[data-scenic-flight="group"]');await fullLaunch.focus();await fullLaunch.press('Enter');await focused();await pause();assert.equal((await info()).flyby.id,'group');
  await open();const end=panel.locator('#uf-inview-flyby-cancel');await end.focus();await end.press('Enter');await focused();await next();assert.equal((await info()).running,false);assert.equal((await info()).flyby.active,false);
  check('Saved observations clear route motion; fullscreen native launch and End retain their focus handoff');
  await exit();await launch('group');await stage.getByRole('button',{name:'Narrow view',exact:true}).click();await page.locator('#uf-flyby-rate').selectOption('0.5');const composed=await snapshot();await jump(route,route.highlights[1],false,'group-normal-composed');assert.equal((await snapshot()).settings.fov,composed.settings.fov);assert.equal((await info()).flyby.rate,.5);
  await enter();const phase=stage.locator('.uf-flight-phase');await stage.getByRole('button',{name:'Hide overlay',exact:true}).click();assert.ok(await phase.isHidden());await stage.getByRole('button',{name:'Show overlay',exact:true}).click();assert.ok(await phase.isVisible());await open();assert.ok(await phase.isHidden());await close();assert.ok(await phase.isVisible());await exit();
  check('Normal controls retain selected lens and Slow pace; Group phase honors clean view and fullscreen controls');
  for(const viewport of [{width:320,height:740},{width:568,height:320}]){
    await page.setViewportSize(viewport);await launch('group');
    const normal=page.locator('#uf-flyby-status');await axeScope('group-'+viewport.width+'-normal',normal);const normalButton=normal.locator('[data-flyby-highlight]').last();await normalButton.scrollIntoViewIfNeeded();const normalBox=await normalButton.boundingBox();assert.ok(normalBox.height>=44&&normalBox.x>=0&&normalBox.x+normalBox.width<=viewport.width+1);
    await enter();const initialPhase=await phase.boundingBox(),initialLens=await stage.locator('.uf-lens-controls').boundingBox();assert.ok(!(initialPhase.x<initialLens.x+initialLens.width&&initialPhase.x+initialPhase.width>initialLens.x&&initialPhase.y<initialLens.y+initialLens.height&&initialPhase.y+initialPhase.height>initialLens.y),'Initial phase avoids the lens');await open();await axeScope('group-'+viewport.width+'-fullscreen');const button=panel.locator('[data-flyby-highlight]').last();await button.scrollIntoViewIfNeeded();const target=await button.boundingBox(),shell=await panel.boundingBox();assert.ok(target.height>=44&&target.x>=0&&target.x+target.width<=viewport.width+1);assert.ok(shell.y>=0&&shell.x>=0&&shell.x+shell.width<=viewport.width+1&&shell.y+shell.height<=viewport.height+1);await stage.screenshot({path:path.join(report,'group-controls-'+viewport.width+'.png')});await jump(route,route.highlights[2],true,'group-highlight-'+viewport.width);
    const phaseBox=await phase.boundingBox(),lens=await stage.locator('.uf-lens-controls').boundingBox();assert.ok(!(phaseBox.x<lens.x+lens.width&&phaseBox.x+phaseBox.width>lens.x&&phaseBox.y<lens.y+lens.height&&phaseBox.y+phaseBox.height>lens.y),'Phase avoids the lens');assert.ok(phaseBox.x>=0&&phaseBox.x+phaseBox.width<=viewport.width+1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await stage.screenshot({path:path.join(report,'group-phase-'+viewport.width+'.png')});result.layouts.push({viewport,button:target,panel:shell,phase:phaseBox,lens});await open();const currentStop=panel.locator('button[data-flyby-highlight][aria-current="true"]');assert.equal(await currentStop.count(),1);await currentStop.scrollIntoViewIfNeeded();await axeScope('group-'+viewport.width+'-current-stop');await stage.screenshot({path:path.join(report,'group-current-'+viewport.width+'.png')});await close();await exit();
  }
  check('Phone and short landscape highlights remain reachable with 44px targets and unobstructed phase cues');
  await page.setViewportSize({width:1280,height:800});await launch('group');await enter();await jump(route,route.highlights[1],true,'group-context-elliptical');await inspectAndOrbit(route.highlights[1],'group-elliptical');check('The elliptical highlight selects its matching destination for native inspection and a moving orbit');await open();await panel.locator('#uf-inview-mode').selectOption('relativity');await next();await panel.locator('#uf-inview-tab-explore').click();const fromPhysical=panel.locator('[data-scenic-flight="group"]');assert.ok((await panel.locator('#uf-inview-scenic-flights').innerText()).includes('Switches to Free exploration.'));await fromPhysical.focus();await fromPhysical.press('Enter');await focused();await pause();assert.equal((await snapshot()).settings.mode,'explore');assert.equal((await snapshot()).settings.region,'cosmic');assert.equal((await info()).flyby.id,'group');
  check('Fullscreen physical-mode launch explicitly switches into the generated exploration scene');
  await exit();await page.getByRole('button',{name:'Close flight explorer',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.uf-stage'));
  result.resources=await page.evaluate(()=>window.__nebulaGL.map(({gl,record})=>{gl.useProgram(null);return{textures:record.created,deletedTextures:record.deleted,liveTextures:record.textures.filter(t=>gl.isTexture(t)).length,buffers:record.buffers.length,deletedBuffers:record.buffersDeleted,liveBuffers:record.buffers.filter(b=>gl.isBuffer(b)).length,programs:record.programs.length,deletedPrograms:record.programsDeleted,livePrograms:record.programs.filter(p=>gl.isProgram(p)).length,error:gl.getError()};}));
  for(const r of result.resources){assert.equal(r.textures,2);assert.equal(r.deletedTextures,2);assert.equal(r.liveTextures,0);assert.equal(r.buffers,2);assert.equal(r.deletedBuffers,2);assert.equal(r.liveBuffers,0);assert.equal(r.programs,2);assert.equal(r.deletedPrograms,2);assert.equal(r.livePrograms,0);assert.equal(r.error,0);}
  check('Group route adds no graphics resources and closing disposes the existing textures, buffers, and programs');
  assert.deepEqual(result.errors,[]);assert.equal(hash(fs.readFileSync(sourceFile)),result.sourceHash);assert.equal(hash(fs.readFileSync(uiFile)),result.uiHash);for(const [suffix,expected]of [['universe_flight_scene.js',result.sourceHash],['stem_tool_universe.js',result.uiHash]]){const served=result.served.find(item=>item.url.includes(suffix));assert.equal(served?.status,200);assert.equal(served?.hash,expected);}
  result.completed=true;save();console.log('Galaxy group passed: '+result.checks.length+' groups, '+result.accessibility.length+' accessibility scopes, '+result.captures.length+' actual captures.');
 }catch(error){result.failure=String(error);save();throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
